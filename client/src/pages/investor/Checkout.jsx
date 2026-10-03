import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useData, send, useAction, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  Heading,
  QueryState,
  Button,
  Field,
  Modal,
  Success,
  PropertyImage,
  Progress,
} from '../../components/ui';
import { money, pct, projected, investmentKey, unitLabel } from '../../utils';
export function Checkout() {
  const { id } = useParams();
  const { user } = useAuth();
  const property = useData(`/properties/${id}`, {}, { refetchInterval: 15000 });
  const wallet = useData('/wallet');
  const portfolio = useData('/portfolio/summary');
  return (
    <>
      <Heading
        eyebrow="Make it yours"
        title="Your next property investment"
        description="Choose your units. Review your ownership. Confirm with confidence."
      />
      {user.kyc?.status !== 'APPROVED' ? (
        <section className="panel">
          <h2>Identity verification required</h2>
          <p>Your KYC must be approved before you can invest.</p>
          <Link className="button primary" to="/investor/kyc">
            Complete KYC
          </Link>
        </section>
      ) : (
        <QueryState query={property}>
          {(p) => (
            <QueryState query={wallet}>
              {(w) => (
                <QueryState query={portfolio}>
                  {(s) => (
                    <CheckoutForm
                      key={id}
                      property={p}
                      wallet={w}
                      user={user}
                      existingUnits={s.allocations
                        .filter(
                          (a) =>
                            a.propertyId === id &&
                            a.investmentStatus !== 'EXITED' &&
                            a.status !== 'SOLD'
                        )
                        .reduce((sum, a) => sum + a.units, 0)}
                    />
                  )}
                </QueryState>
              )}
            </QueryState>
          )}
        </QueryState>
      )}
    </>
  );
}
export function CheckoutForm({ property: p, wallet, user, existingUnits = 0 }) {
  const [confirm, setConfirm] = useState(false),
    [result, setResult] = useState(null);
  const remaining = p.totalUnits - p.unitsSold;
  const cap = Math.min(
    remaining,
    (p.maxUnitsPerInvestor || p.totalUnits) - existingUnits,
    Math.floor((p.totalUnits * (p.maxOwnershipPct || 100)) / 100) -
      existingUnits
  );
  const schema = z.object({
    units: z.coerce
      .number()
      .int('Choose whole units.')
      .min(p.minUnits, `Minimum ${unitLabel(p.minUnits)}.`)
      .max(cap, `Maximum ${unitLabel(cap)} available to you.`),
    terms: z.literal(true, {
      errorMap: () => ({ message: 'Accept the terms to continue.' }),
    }),
  });
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { units: p.minUnits, terms: false },
  });
  const units = Number(watch('units')) || 0,
    amount = units * p.unitPrice,
    shortfall = amount - wallet.walletBalance;
  const action = useAction(async () => {
    const { key, storageKey } = investmentKey(user._id, p._id, units);
    const data = await send('post', '/investments', {
      propertyId: p._id,
      units,
      idempotencyKey: key,
    });
    sessionStorage.removeItem(storageKey);
    setResult(data);
    setConfirm(false);
    return data;
  }, 'Investment confirmed');
  if (result)
    return (
      <Success
        title="You now own a share."
        description={`${unitLabel(units)} in ${p.title}. Your investment of ${money(amount)} is recorded, and your new wallet balance is ${money(result.walletBalance)}.`}
        action={
          <Link className="button primary" to="/investor/portfolio">
            View my portfolio
          </Link>
        }
      />
    );
  if (p.status !== 'LIVE')
    return (
      <div className="notice">
        This property is no longer accepting investments.{' '}
        <Link to="/properties">Explore other properties.</Link>
      </div>
    );
  return (
    <div className="checkout-layout">
      <section className="panel">
        <PropertyImage
          className="checkout-image"
          media={p.images?.[0]}
          alt={p.title}
        />
        <h2>{p.title}</h2>
        <p>
          {p.city} · {money(p.unitPrice)} per unit
        </p>
        <Progress value={p.fundingPct} />
        <form onSubmit={handleSubmit(() => setConfirm(true))}>
          <Field
            label="Units to purchase"
            type="number"
            min={p.minUnits}
            max={cap}
            {...register('units')}
            error={errors.units?.message}
          />
          <input
            aria-label="Select number of units"
            type="range"
            min={p.minUnits}
            max={Math.max(cap, p.minUnits)}
            value={units}
            onChange={(e) =>
              setValue('units', Number(e.target.value), {
                shouldValidate: true,
              })
            }
          />
          <div className="between">
            <small>{p.minUnits} min. units</small>
            <small>{cap} max. units</small>
          </div>
          <label className="checkbox">
            <input type="checkbox" {...register('terms')} />
            <span>
              I understand that projected returns are illustrative, and accept
              the academic investment terms.
            </span>
          </label>
          {errors.terms && <p className="danger">{errors.terms.message}</p>}
          {shortfall > 0 && (
            <div className="notice">
              You need {money(shortfall)} more in your wallet.{' '}
              <Link to="/investor/wallet">Add money →</Link>
            </div>
          )}
          {cap < p.minUnits && (
            <p className="danger">
              Your ownership cap or the remaining units prevents another
              investment.
            </p>
          )}
          <Button
            className="full-width"
            type="submit"
            disabled={
              shortfall > 0 ||
              cap < p.minUnits ||
              !watch('terms') ||
              units < p.minUnits ||
              units > cap
            }
          >
            Review investment
          </Button>
        </form>
      </section>
      <aside className="panel checkout-summary">
        <span className="eyebrow">The numbers at a glance</span>
        <h2>Investment summary</h2>
        {[
          ['Units', units],
          ['Price per unit', money(p.unitPrice)],
          ['Your ownership', pct((units / p.totalUnits) * 100)],
          ['Investment amount', money(amount)],
          [
            'Projected value',
            money(
              projected(
                amount,
                p.expectedAppreciationPct,
                p.holdingPeriodMonths / 12
              )
            ),
          ],
          ['Wallet available', money(wallet.walletBalance)],
          ['Balance after', money(wallet.walletBalance - amount)],
        ].map(([caption, value]) => (
          <div className="summary-line" key={caption}>
            <span>{caption}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <p className="small">
          Projected value uses {p.expectedAppreciationPct}% annual appreciation
          over {p.holdingPeriodMonths} months and excludes sale fees.
        </p>
      </aside>
      {confirm && (
        <Modal
          title="Confirm your investment"
          onClose={() => setConfirm(false)}
          onConfirm={() => action.mutate()}
          loading={action.isPending}
          confirmText="Confirm & invest"
        >
          <p>
            You’re purchasing <strong>{unitLabel(units)}</strong> of {p.title},
            representing <strong>{pct((units / p.totalUnits) * 100)}</strong>{' '}
            ownership.
          </p>
          <div className="summary-line">
            <span>Wallet debit</span>
            <strong>{money(amount)}</strong>
          </div>
          {action.isError && (
            <p className="danger">
              {errorMessage(action.error)} Your retry uses the same investment
              reference.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
