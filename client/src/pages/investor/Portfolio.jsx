import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useData } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  Heading,
  Kpis,
  QueryState,
  Allocation,
  Table,
  Chip,
  PropertyCard,
  Pagination,
} from '../../components/ui';
import { money, compactMoney, pct, date } from '../../utils';
export function TransactionTable({ items }) {
  return (
    <Table
      items={items}
      columns={[
        {
          label: 'Date',
          className: 'cell-date',
          render: (t) => date(t.createdAt),
        },
        {
          label: 'Amount',
          className: 'cell-number',
          render: (t) => (
            <strong
              className={t.direction === 'CREDIT' ? 'positive' : 'number'}
            >
              {t.direction === 'CREDIT' ? '+' : '−'}
              {money(t.amount)}
            </strong>
          ),
        },
        {
          label: 'Transaction',
          render: (t) => <Chip status={t.type} />,
        },
        { label: 'Direction', key: 'direction' },
        {
          label: 'Balance after',
          className: 'cell-number',
          render: (t) => money(t.balanceAfter),
        },
        { label: 'Reference', className: 'cell-reference', key: '_id' },
      ]}
    />
  );
}
export function InvestorDashboard() {
  const { user } = useAuth();
  const portfolio = useData('/portfolio/summary');
  const wallet = useData('/wallet');
  const properties = useData('/properties', { status: 'LIVE', limit: 3 });
  return (
    <>
      <Heading
        eyebrow="Your investment overview"
        title={`Good to see you, ${user.name.split(' ')[0]}.`}
        description="A clear view of what you own and what’s ahead."
        action={
          <Link className="button primary" to="/properties">
            Explore properties
            <ArrowUpRight size={16} />
          </Link>
        }
      />
      {user.kyc?.status !== 'APPROVED' && (
        <div className="notice between">
          <span>Complete identity verification to start investing.</span>
          <Link to="/investor/kyc" className="text-link">
            Review KYC status →
          </Link>
        </div>
      )}
      <QueryState query={portfolio}>
        {(s) => (
          <>
            <Kpis
              items={[
                [
                  'Total invested',
                  compactMoney(s.totalInvested),
                  'Active positions',
                ],
                [
                  'Estimated value',
                  compactMoney(s.currentEstValue),
                  'Illustrative appreciation',
                ],
                [
                  'Total payouts',
                  compactMoney(s.totalPayouts),
                  'Completed exits',
                ],
                [
                  'Realised ROI',
                  pct(s.overallROI),
                  'Based on exited positions',
                ],
                [
                  'Wallet balance',
                  wallet.data ? compactMoney(wallet.data.walletBalance) : '—',
                  'Available to invest',
                ],
              ]}
            />
            <section className="panel">
              <div className="between">
                <h2>Your property allocation</h2>
                <Link className="text-link" to="/investor/portfolio">
                  View portfolio →
                </Link>
              </div>
              <Allocation
                items={s.allocations.filter(
                  (a) =>
                    a.investmentStatus !== 'EXITED' &&
                    a.investmentStatus !== 'REFUNDED' &&
                    a.status !== 'SOLD' &&
                    a.status !== 'CANCELLED'
                )}
              />
            </section>
          </>
        )}
      </QueryState>
      <section className="panel">
        <div className="between">
          <h2>Recent transactions</h2>
          <Link to="/investor/wallet" className="text-link">
            View wallet →
          </Link>
        </div>
        <QueryState query={wallet}>
          {(w) => <TransactionTable items={w.recentTransactions.slice(0, 5)} />}
        </QueryState>
      </section>
      <Heading
        eyebrow="Discover more"
        title="Your next possibility."
        as="h2"
        description="Explore currently live investment opportunities."
      />
      <QueryState query={properties}>
        {(data) => (
          <div className="property-grid">
            {data.items.map((p) => (
              <PropertyCard key={p._id} property={p} />
            ))}
          </div>
        )}
      </QueryState>
    </>
  );
}
export function Portfolio() {
  const query = useData('/portfolio/summary');
  const [page, setPage] = useState(1),
    [sort, setSort] = useState('title'),
    [direction, setDirection] = useState(1),
    [status, setStatus] = useState('ALL');
  return (
    <>
      <Heading
        eyebrow="Your ownership, clearly"
        title="My portfolio"
        description="Track active holdings, completed exits and your realised returns."
      />
      <QueryState query={query}>
        {(s) => {
          const filtered = s.allocations.filter(
            (p) =>
              status === 'ALL' ||
              (status === 'ACTIVE'
                ? !['SOLD', 'CANCELLED'].includes(p.status) &&
                  !['EXITED', 'REFUNDED'].includes(p.investmentStatus)
                : p.status === 'SOLD' || p.investmentStatus === 'EXITED')
          );
          const sorted = [...filtered].sort((a, b) =>
            typeof a[sort] === 'number'
              ? (a[sort] - b[sort]) * direction
              : String(a[sort]).localeCompare(String(b[sort])) * direction
          );
          return (
            <>
              <Kpis
                items={[
                  ['Active invested', compactMoney(s.totalInvested)],
                  ['Estimated active value', compactMoney(s.currentEstValue)],
                  ['Payouts received', compactMoney(s.totalPayouts)],
                  ['Realised ROI', pct(s.overallROI)],
                ]}
              />
              <section className="panel">
                <h2>Your property allocation</h2>
                <Allocation items={s.allocations} />
              </section>
              <section className="panel">
                <div className="toolbar">
                  <select
                    aria-label="Filter holdings"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All holdings</option>
                    <option value="ACTIVE">Active holdings</option>
                    <option value="EXITED">Exited holdings</option>
                  </select>
                  <select
                    aria-label="Sort holdings"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="title">Property name</option>
                    <option value="investedAmount">Invested amount</option>
                    <option value="estimatedValue">Estimated value</option>
                    <option value="ownershipPct">Ownership</option>
                  </select>
                  <button
                    className="button secondary"
                    onClick={() => setDirection(-direction)}
                  >
                    {direction === 1 ? 'Ascending ↑' : 'Descending ↓'}
                  </button>
                </div>
                <Table
                  items={sorted.slice((page - 1) * 10, page * 10)}
                  keyField="propertyId"
                  columns={[
                    {
                      label: 'Property',
                      render: (p) => (
                        <Link
                          className="table-link"
                          to={`/properties/${p.propertyId}`}
                        >
                          {p.title}
                        </Link>
                      ),
                    },
                    {
                      label: 'Position',
                      render: (p) => (
                        <Chip
                          status={
                            p.investmentStatus ||
                            (['SOLD'].includes(p.status)
                              ? 'EXITED'
                              : p.status === 'CANCELLED'
                                ? 'REFUNDED'
                                : 'ACTIVE')
                          }
                        />
                      ),
                    },
                    {
                      label: 'Property status',
                      render: (p) => <Chip status={p.status} />,
                    },
                    {
                      label: 'Units',
                      className: 'cell-quantity',
                      key: 'units',
                    },
                    {
                      label: 'Ownership',
                      className: 'cell-quantity',
                      render: (p) => pct(p.ownershipPct),
                    },
                    {
                      label: 'Invested',
                      className: 'cell-number',
                      render: (p) => money(p.investedAmount),
                    },
                    {
                      label: 'Est. value',
                      className: 'cell-number',
                      render: (p) => money(p.estimatedValue),
                    },
                    {
                      label: 'Payout received',
                      className: 'cell-number',
                      render: (p) => money(p.payoutReceived),
                    },
                    {
                      label: 'Realised ROI',
                      className: 'cell-quantity',
                      render: (p) =>
                        p.payoutReceived ? (
                          <strong
                            className={
                              p.payoutReceived < p.investedAmount
                                ? 'danger'
                                : 'positive'
                            }
                          >
                            {pct(
                              ((p.payoutReceived - p.investedAmount) /
                                p.investedAmount) *
                                100
                            )}
                          </strong>
                        ) : (
                          '—'
                        ),
                    },
                  ]}
                />
                <Pagination
                  data={{
                    total: sorted.length,
                    totalPages: Math.max(1, Math.ceil(sorted.length / 10)),
                  }}
                  page={page}
                  onChange={setPage}
                />
              </section>
            </>
          );
        }}
      </QueryState>
    </>
  );
}
