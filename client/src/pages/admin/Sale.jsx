import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useData, get, send, useAction, errorMessage } from '../../api';
import {
  Heading,
  QueryState,
  Field,
  Button,
  Table,
  Kpis,
  Modal,
  Success,
  Chip,
} from '../../components/ui';
import { toPaise, money, compactMoney, pct } from '../../utils';
export function Sale() {
  const { id } = useParams();
  const property = useData(`/properties/${id}`);
  return (
    <>
      <Heading
        eyebrow="Close the lifecycle, account for every rupee"
        title="Record a property sale"
        description="Review the exact distribution before executing investor payouts."
      />
      <QueryState query={property}>
        {(p) => <SaleForm property={p} />}
      </QueryState>
    </>
  );
}
export function SaleForm({ property: p }) {
  const [preview, setPreview] = useState(null),
    [confirm, setConfirm] = useState(false),
    [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      z.object({
        salePrice: z.string().refine((v) => {
          try {
            return toPaise(v) > 0;
          } catch {
            return false;
          }
        }, 'Enter a positive sale amount with at most two decimals.'),
      })
    ),
  });
  const salePrice = watch('salePrice');
  let paise = 0;
  try {
    paise = toPaise(salePrice);
  } catch {
    /* Invalid until input complete. */
  }
  const previewAction = useAction(async (values) => {
    const result = await get(`/properties/${p._id}/payout-preview`, {
      salePrice: toPaise(values.salePrice),
    });
    setPreview(result);
  }, null);
  const execute = useAction(async () => {
    await send('post', `/properties/${p._id}/sell`, {
      salePrice: preview.salePrice,
    });
    setDone(true);
    setConfirm(false);
  }, 'Sale recorded and payouts distributed');
  const validPreview =
    preview && preview.salePrice === paise && preview.check === true;
  if (done)
    return (
      <Success
        title="Sale recorded. Shares distributed."
        description="Investor payouts have been credited to their wallets and the property is marked as sold."
        action={
          <Link className="button primary" to="/admin/properties">
            Back to property management
          </Link>
        }
      />
    );
  return (
    <>
      <section className="panel">
        <div className="between">
          <h2>{p.title}</h2>
          <Chip status={p.status} />
        </div>
        {p.status !== 'HOLDING' ? (
          <div className="notice">
            A sale can only be recorded for a property in the holding phase.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(previewAction.mutate)}
            className="sale-input"
          >
            <Field
              label="Actual sale price (₹)"
              inputMode="decimal"
              {...register('salePrice')}
              error={errors.salePrice?.message}
            />
            <Button
              type="submit"
              disabled={!paise}
              loading={previewAction.isPending}
            >
              Preview distribution
            </Button>
          </form>
        )}
        {previewAction.isError && (
          <p role="alert" className="danger">
            {errorMessage(previewAction.error)}
          </p>
        )}
      </section>
      {preview && (
        <section className="panel">
          <h2>Payout distribution preview</h2>
          <Kpis
            items={[
              ['Sale proceeds', compactMoney(preview.salePrice)],
              ['Platform fee', compactMoney(preview.platformFee)],
              ['Investor distribution', compactMoney(preview.distributable)],
            ]}
          />
          <Table
            keyField="investorId"
            items={preview.items}
            columns={[
              { label: 'Investor', key: 'investorName' },
              { label: 'Units', key: 'units' },
              { label: 'Ownership', render: (i) => pct(i.ownershipPct) },
              { label: 'Payout', render: (i) => money(i.payoutAmount) },
            ]}
          />
          <div className={`notice ${preview.check ? 'success' : 'danger'}`}>
            {preview.check
              ? 'Distribution verified: all investor payouts equal the distributable amount exactly.'
              : 'Distribution check failed. Execution is blocked.'}
          </div>
          {preview.salePrice !== paise && (
            <p className="danger">
              Sale price changed. Generate a new preview before executing.
            </p>
          )}
          <Button
            disabled={!validPreview || p.status !== 'HOLDING'}
            onClick={() => setConfirm(true)}
          >
            Confirm & execute payout
          </Button>
        </section>
      )}
      {confirm && (
        <Modal
          title="Execute this property sale?"
          onClose={() => setConfirm(false)}
          onConfirm={() => execute.mutate()}
          loading={execute.isPending}
          disabled={!validPreview}
          confirmText="Execute sale & distribute"
        >
          <p>
            {p.title} will be marked sold and all investor shares credited to
            their wallets.
          </p>
          <div className="summary-line">
            <span>Sale proceeds</span>
            <strong>{money(preview.salePrice)}</strong>
          </div>
          <div className="summary-line">
            <span>Platform fee</span>
            <strong>{money(preview.platformFee)}</strong>
          </div>
          <div className="summary-line">
            <span>Investor payouts</span>
            <strong>{money(preview.distributable)}</strong>
          </div>
          {execute.isError && (
            <p className="danger">{errorMessage(execute.error)}</p>
          )}
        </Modal>
      )}
    </>
  );
}
