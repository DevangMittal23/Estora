import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useData, useAction, send, errorMessage } from '../../api';
import {
  Heading,
  Kpis,
  QueryState,
  Button,
  Field,
  Modal,
  Pagination,
  Table,
  Chip,
} from '../../components/ui';
import { TransactionTable } from './Portfolio';
import { money, compactMoney, toPaise, date } from '../../utils';
export function Ledger({ commissionOnly = false }) {
  const [params, setParams] = useState({
    page: 1,
    limit: 15,
    ...(commissionOnly ? { type: 'COMMISSION' } : {}),
  });
  const query = useData('/transactions', params);
  const set = (key, value) =>
    setParams((p) => ({ ...p, [key]: value || undefined, page: 1 }));
  return (
    <section className="panel">
      <h2>{commissionOnly ? 'Commission history' : 'Transaction ledger'}</h2>
      <div className="toolbar">
        {!commissionOnly && (
          <Field label="Transaction type">
            <select
              value={params.type || ''}
              onChange={(e) => set('type', e.target.value)}
            >
              <option value="">All transactions</option>
              {[
                'TOPUP',
                'INVESTMENT',
                'PAYOUT',
                'REFUND',
                'COMMISSION',
                'WITHDRAWAL',
                'FEE',
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        )}
        <Field
          label="From date"
          type="date"
          value={params.startDate || ''}
          onChange={(e) => set('startDate', e.target.value)}
        />
        <Field
          label="To date"
          type="date"
          value={params.endDate || ''}
          min={params.startDate || undefined}
          onChange={(e) => set('endDate', e.target.value)}
        />
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            <TransactionTable items={data.items} />
            <Pagination
              data={data}
              page={params.page}
              onChange={(page) => setParams((p) => ({ ...p, page }))}
            />
          </>
        )}
      </QueryState>
    </section>
  );
}
const amountSchema = z.string().refine((v) => {
  try {
    return toPaise(v) > 0;
  } catch {
    return false;
  }
}, 'Enter a positive amount with at most two decimals.');
function MoneyForm({ mode, balance, onClose }) {
  const [mockOrder, setMockOrder] = useState(null);
  const schema =
    mode === 'withdraw'
      ? z.object({
          amount: amountSchema,
          accountName: z.string().min(2, 'Enter account holder name.'),
          accountNumber: z
            .string()
            .regex(/^\d{6,20}$/, 'Enter a dummy account number (6–20 digits).'),
          ifsc: z
            .string()
            .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC format.'),
        })
      : z.object({ amount: amountSchema });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const verify = useAction(
    (data) => send('post', '/wallet/topup/verify', data),
    'Wallet credited'
  );
  const action = useAction(
    async (values) => {
      const amount = toPaise(values.amount);
      if (mode === 'withdraw') {
        if (amount > balance)
          throw new Error('Withdrawal exceeds available wallet balance.');
        await send('post', '/wallet/withdraw', {
          amount,
          bankDetails: {
            accountName: values.accountName,
            accountNumber: values.accountNumber,
            ifsc: values.ifsc,
          },
        });
        onClose();
        return;
      }
      const order = await send('post', '/wallet/topup/order', { amount });
      if (order.mode === 'mock') {
        setMockOrder(order);
        return;
      }
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = () =>
            reject(new Error('Payment checkout could not load. Please retry.'));
          document.head.appendChild(script);
        });
      }
      const checkout = new window.Razorpay({
        key: order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'ESTORA',
        description: 'Academic wallet top-up · Test mode',
        handler: async (response) => {
          await verify.mutateAsync({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          onClose();
        },
      });
      checkout.open();
    },
    mode === 'withdraw' ? 'Withdrawal requested' : null
  );
  return (
    <Modal
      title={
        mode === 'withdraw'
          ? 'Request a withdrawal'
          : 'Add money to your wallet'
      }
      onClose={onClose}
    >
      {mockOrder ? (
        <>
          <div className="notice">
            <strong>Mock payment · Academic demonstration</strong>
            <p>
              No payment is collected. Confirm to credit{' '}
              {money(mockOrder.amount)} in demo wallet funds.
            </p>
          </div>
          <Button
            loading={verify.isPending}
            onClick={() =>
              verify.mutate(
                {
                  razorpayOrderId: mockOrder.orderId,
                  razorpayPaymentId: `mock_${crypto.randomUUID()}`,
                  razorpaySignature: 'mock',
                },
                { onSuccess: onClose }
              )
            }
          >
            Confirm mock payment
          </Button>
          {verify.isError && (
            <p className="danger">{errorMessage(verify.error)}</p>
          )}
        </>
      ) : (
        <form onSubmit={handleSubmit(action.mutate)}>
          <Field
            label="Amount (₹)"
            inputMode="decimal"
            {...register('amount')}
            error={errors.amount?.message}
          />
          {mode === 'withdraw' && (
            <>
              <p className="small">
                Available balance: {money(balance)}. Funds are debited only
                after admin approval. Use dummy bank details.
              </p>
              <Field
                label="Account holder name"
                {...register('accountName')}
                error={errors.accountName?.message}
              />
              <Field
                label="Dummy bank account number"
                {...register('accountNumber')}
                error={errors.accountNumber?.message}
              />
              <Field
                label="IFSC code"
                {...register('ifsc')}
                error={errors.ifsc?.message}
              />
            </>
          )}
          {action.isError && (
            <p className="danger">{errorMessage(action.error)}</p>
          )}
          <Button type="submit" loading={action.isPending}>
            {mode === 'withdraw' ? 'Request withdrawal' : 'Continue to payment'}
          </Button>
        </form>
      )}
    </Modal>
  );
}
export function Wallet() {
  const wallet = useData('/wallet');
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const withdrawals = useData('/wallet/withdrawals', {
    page: withdrawalPage,
    limit: 10,
  });
  const [modal, setModal] = useState(null);
  return (
    <>
      <Heading
        eyebrow="Every rupee, accounted for"
        title="Your wallet"
        description="Add funds, track transactions and manage withdrawal requests."
        action={
          <div className="actions">
            <Button variant="secondary" onClick={() => setModal('withdraw')}>
              Withdraw
            </Button>
            <Button onClick={() => setModal('topup')}>+ Add money</Button>
          </div>
        }
      />
      <QueryState query={wallet}>
        {(w) => (
          <Kpis
            items={[
              [
                'Available balance',
                compactMoney(w.walletBalance),
                'Ready for your next investment',
              ],
            ]}
          />
        )}
      </QueryState>
      <Ledger />
      <section className="panel">
        <h2>Withdrawal requests</h2>
        <QueryState query={withdrawals}>
          {(data) => (
            <>
              <Table
                items={data.items}
                columns={[
                  { label: 'Requested', render: (w) => date(w.createdAt) },
                  { label: 'Amount', render: (w) => money(w.amount) },
                  {
                    label: 'Status',
                    render: (w) => <Chip status={w.status} />,
                  },
                  {
                    label: 'Account',
                    render: (w) =>
                      `•••• ${w.bankDetails?.accountNumber?.slice(-4) || '—'}`,
                  },
                ]}
              />
              <Pagination
                data={data}
                page={withdrawalPage}
                onChange={setWithdrawalPage}
              />
            </>
          )}
        </QueryState>
      </section>
      {modal && (
        <MoneyForm
          mode={modal}
          balance={wallet.data?.walletBalance || 0}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
