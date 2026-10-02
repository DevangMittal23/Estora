import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useData, useAction, send, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  Heading,
  QueryState,
  Kpis,
  DataChart,
  Table,
  Chip,
  Button,
  Modal,
  Field,
  Pagination,
  MediaLink,
} from '../../components/ui';
import {
  money,
  compactMoney,
  pct,
  date,
  statuses,
  label,
  idOf,
} from '../../utils';
export function AdminDashboard() {
  const query = useData('/admin/stats');
  return (
    <>
      <Heading
        eyebrow="The platform, in perspective"
        title="Platform overview"
        description="Monitor capital, property lifecycle and the decisions that move things forward."
        action={
          <Link className="button primary" to="/admin/properties">
            Manage properties →
          </Link>
        }
      />
      <QueryState query={query}>
        {(s) => (
          <>
            <Kpis
              items={[
                ['Assets under management', compactMoney(s.totalAUM)],
                ['Live properties', s.livePropertiesCount],
                ['Raised this month', compactMoney(s.fundsRaisedThisMonth)],
                ['Platform fees earned', compactMoney(s.platformFeesEarned)],
                [
                  'Total users',
                  Object.values(s.usersByRole).reduce((sum, n) => sum + n, 0),
                ],
              ]}
            />
            <section className="panel">
              <div className="between">
                <h2>Decisions awaiting you</h2>
                <span className="eyebrow">Approval queues</span>
              </div>
              <div className="approval-queues">
                {[
                  [
                    'Properties',
                    s.pendingApprovals?.properties || 0,
                    '/admin/properties?status=PENDING_APPROVAL',
                  ],
                  [
                    'KYC submissions',
                    s.pendingApprovals?.kyc || 0,
                    '/admin/kyc',
                  ],
                  [
                    'Broker accounts',
                    s.pendingApprovals?.brokers || 0,
                    '/admin/users?role=BROKER',
                  ],
                ].map(([caption, value, to]) => (
                  <Link key={caption} to={to}>
                    <span>{caption}</span>
                    <strong>{value}</strong>
                    <span>Review queue →</span>
                  </Link>
                ))}
              </div>
            </section>
            <div className="two-panels">
              <section className="panel">
                <h2>Funds raised over time</h2>
                <DataChart data={s.fundsRaisedOverTime || []} />
              </section>
              <section className="panel">
                <h2>Properties by status</h2>
                <DataChart
                  bar
                  data={s.propertiesByStatus || []}
                  x="status"
                  y="count"
                  moneyValues={false}
                />
              </section>
            </div>
            <section className="panel">
              <h2>Users by role</h2>
              <Kpis
                items={Object.entries(s.usersByRole).map(([role, count]) => [
                  label(role),
                  count,
                ])}
              />
            </section>
          </>
        )}
      </QueryState>
    </>
  );
}
export function AdminProperties() {
  const [params, setParams] = useState({
    page: 1,
    limit: 12,
    status:
      new URLSearchParams(window.location.search).get('status') || undefined,
  });
  const [modal, setModal] = useState(null),
    [reason, setReason] = useState('');
  const query = useData('/properties', params);
  const action = useAction(async () => {
    const { property: p, type } = modal;
    const body =
      type === 'reject'
        ? { reason }
        : type === 'holding'
          ? { status: 'HOLDING' }
          : type === 'cancel'
            ? { status: 'CANCELLED' }
            : undefined;
    await send(
      'post',
      `/properties/${p._id}/${['holding', 'cancel'].includes(type) ? 'status' : type}`,
      body
    );
    setModal(null);
    setReason('');
  }, 'Property updated');
  const open = (property, type) => {
    setReason('');
    setModal({ property, type });
  };
  const change = (key, value) =>
    setParams((p) => ({ ...p, [key]: value || undefined, page: 1 }));
  return (
    <>
      <Heading
        eyebrow="The complete property lifecycle"
        title="Property management"
        description="Review listings and manage funding, acquisitions and exits."
        action={
          <Link className="button primary" to="/admin/properties/new?fresh=1">
            + Create listing
          </Link>
        }
      />
      <section className="panel">
        <div className="toolbar">
          <Field label="Status">
            <select
              value={params.status || ''}
              onChange={(e) => change('status', e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="City"
            value={params.city || ''}
            onChange={(e) => change('city', e.target.value)}
          />
          <Field
            label="Broker ID"
            value={params.brokerId || ''}
            onChange={(e) => change('brokerId', e.target.value)}
          />
          <Field
            label="Search"
            value={params.search || ''}
            onChange={(e) => change('search', e.target.value)}
          />
        </div>
        <QueryState query={query}>
          {(data) => (
            <>
              <Table
                items={data.items}
                columns={[
                  {
                    label: 'Property',
                    render: (p) => (
                      <Link className="table-link" to={`/properties/${p._id}`}>
                        {p.title}
                        <small>
                          {p.city} · {label(p.type)}
                        </small>
                      </Link>
                    ),
                  },
                  {
                    label: 'Broker',
                    render: (p) => p.brokerId?.name || idOf(p.brokerId),
                  },
                  {
                    label: 'Status',
                    render: (p) => <Chip status={p.status} />,
                  },
                  {
                    label: 'Valuation',
                    render: (p) => compactMoney(p.valuation),
                  },
                  { label: 'Funded', render: (p) => pct(p.fundingPct) },
                  {
                    label: 'Actions',
                    render: (p) => (
                      <div className="actions wrap">
                        {p.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => open(p, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger-ghost"
                              onClick={() => open(p, 'reject')}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {p.status === 'FUNDED' && (
                          <Button
                            variant="secondary"
                            onClick={() => open(p, 'holding')}
                          >
                            Confirm acquisition
                          </Button>
                        )}
                        {p.status === 'LIVE' && (
                          <Button
                            variant="danger-ghost"
                            onClick={() => open(p, 'cancel')}
                          >
                            Cancel & refund
                          </Button>
                        )}
                        {p.status === 'HOLDING' && (
                          <Link
                            className="button primary"
                            to={`/admin/properties/${p._id}/sell`}
                          >
                            Record sale
                          </Link>
                        )}
                        {['DRAFT', 'REJECTED'].includes(p.status) && (
                          <Link
                            className="text-link"
                            to={`/admin/properties/${p._id}/edit`}
                          >
                            Edit draft
                          </Link>
                        )}
                        {!['DRAFT', 'REJECTED'].includes(p.status) && (
                          <Link
                            className="text-link"
                            to={`/admin/properties/${p._id}/edit`}
                          >
                            Edit details
                          </Link>
                        )}
                        <Link className="text-link" to={`/properties/${p._id}`}>
                          View
                        </Link>
                      </div>
                    ),
                  },
                ]}
              />
              <Pagination
                data={data}
                page={params.page}
                onChange={(page) => setParams((p) => ({ ...p, page }))}
              />
            </>
          )}
        </QueryState>
      </section>
      {modal && (
        <Modal
          title={
            modal.type === 'cancel'
              ? 'Cancel property & refund investors'
              : modal.type === 'holding'
                ? 'Confirm property acquisition'
                : modal.type === 'reject'
                  ? 'Reject listing'
                  : 'Approve property listing'
          }
          onClose={() => setModal(null)}
          onConfirm={() => action.mutate()}
          loading={action.isPending}
          disabled={modal.type === 'reject' && !reason.trim()}
          danger={['reject', 'cancel'].includes(modal.type)}
        >
          <h3>{modal.property.title}</h3>
          {modal.type === 'reject' ? (
            <Field label="Reason for rejection">
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain what the broker needs to address."
              />
            </Field>
          ) : (
            <p>
              {modal.type === 'cancel'
                ? 'All active investors will receive their full original investment back in their wallets. This listing will close.'
                : modal.type === 'holding'
                  ? 'Confirm that the fully funded property has been acquired. This starts the holding phase without moving funds.'
                  : 'This property will become live and available for investor funding.'}
            </p>
          )}
          {action.isError && (
            <p className="danger">{errorMessage(action.error)}</p>
          )}
        </Modal>
      )}
    </>
  );
}
export function Users() {
  const { user } = useAuth();
  const [params, setParams] = useState({
    page: 1,
    limit: 15,
    role: new URLSearchParams(window.location.search).get('role') || undefined,
  });
  const query = useData('/admin/users', params);
  const action = useAction(
    ({ id, body }) => send('patch', `/admin/users/${id}`, body),
    'User updated'
  );
  const [target, setTarget] = useState(null);
  return (
    <>
      <Heading
        eyebrow="People behind the properties"
        title="User management"
        description="Review access, approve broker accounts and manage active users."
      />
      <section className="panel">
        <div className="toolbar">
          <Field
            label="Search name or email"
            value={params.search || ''}
            onChange={(e) =>
              setParams((p) => ({
                ...p,
                search: e.target.value || undefined,
                page: 1,
              }))
            }
          />
          <Field label="Role">
            <select
              value={params.role || ''}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  role: e.target.value || undefined,
                  page: 1,
                }))
              }
            >
              <option value="">All roles</option>
              {['INVESTOR', 'BROKER', 'ADMIN'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <QueryState query={query}>
          {(data) => (
            <>
              <Table
                items={data.items}
                columns={[
                  { label: 'Name', key: 'name' },
                  { label: 'Email', key: 'email' },
                  { label: 'Role', render: (u) => <Chip status={u.role} /> },
                  {
                    label: 'KYC / Broker',
                    render: (u) =>
                      u.role === 'BROKER' ? (
                        <Chip
                          status={u.brokerApproved ? 'APPROVED' : 'PENDING'}
                        />
                      ) : u.role === 'INVESTOR' ? (
                        <Chip status={u.kyc?.status} />
                      ) : null,
                  },
                  {
                    label: 'Account',
                    render: (u) => (
                      <Button
                        variant={u.isActive ? 'secondary' : 'danger-ghost'}
                        disabled={u._id === user._id || action.isPending}
                        onClick={() =>
                          action.mutate({
                            id: u._id,
                            body: { isActive: !u.isActive },
                          })
                        }
                      >
                        {u.isActive
                          ? 'Active · Deactivate'
                          : 'Inactive · Activate'}
                      </Button>
                    ),
                  },
                  {
                    label: 'Review',
                    render: (u) => (
                      <div className="actions">
                        {u.role === 'BROKER' && !u.brokerApproved && (
                          <Button
                            loading={action.isPending}
                            onClick={() =>
                              action.mutate({
                                id: u._id,
                                body: { brokerApproved: true },
                              })
                            }
                          >
                            Approve broker
                          </Button>
                        )}
                        {u.role === 'INVESTOR' && u.kyc?.docs?.length > 0 && (
                          <Button
                            variant="secondary"
                            onClick={() => setTarget(u)}
                          >
                            View KYC
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
              <Pagination
                data={data}
                page={params.page}
                onChange={(page) => setParams((p) => ({ ...p, page }))}
              />
            </>
          )}
        </QueryState>
      </section>
      {target && (
        <Modal
          title={`${target.name} · KYC documents`}
          onClose={() => setTarget(null)}
        >
          <Chip status={target.kyc.status} />
          {target.kyc.docs.map((doc, i) => (
            <MediaLink
              key={i}
              media={
                typeof doc === 'string'
                  ? { url: doc, name: `Document ${i + 1}` }
                  : doc
              }
            />
          ))}
          {target.kyc.reason && <p>{target.kyc.reason}</p>}
          <Link className="text-link" to="/admin/kyc">
            Go to KYC queue →
          </Link>
        </Modal>
      )}
    </>
  );
}
export function KYCQueue() {
  const [page, setPage] = useState(1);
  const query = useData('/admin/kyc', { page, limit: 12 });
  const [target, setTarget] = useState(null),
    [reason, setReason] = useState('');
  const action = useAction(async ({ userId, status }) => {
    await send('patch', `/admin/kyc/${userId}`, {
      status,
      ...(status === 'REJECTED' ? { reason } : {}),
    });
    setTarget(null);
    setReason('');
  }, 'Identity review recorded');
  return (
    <>
      <Heading
        eyebrow="Identity review"
        title="KYC approval queue"
        description="Review submitted dummy documents and give investors a clear decision."
      />
      <section className="panel">
        <QueryState query={query}>
          {(data) => (
            <>
              <Table
                items={data.items}
                columns={[
                  {
                    label: 'Investor',
                    render: (u) => (
                      <>
                        <strong>{u.name}</strong>
                        <small className="table-subtitle">{u.email}</small>
                      </>
                    ),
                  },
                  {
                    label: 'Submitted documents',
                    render: (u) => (
                      <div className="document-list">
                        {u.kyc.docs.map((doc, i) => (
                          <MediaLink
                            key={i}
                            media={
                              typeof doc === 'string'
                                ? { url: doc, name: `Document ${i + 1}` }
                                : doc
                            }
                          />
                        ))}
                      </div>
                    ),
                  },
                  {
                    label: 'Status',
                    render: (u) => <Chip status={u.kyc.status} />,
                  },
                  {
                    label: 'Actions',
                    render: (u) => (
                      <div className="actions">
                        <Button
                          loading={action.isPending}
                          onClick={() =>
                            action.mutate({ userId: u._id, status: 'APPROVED' })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger-ghost"
                          onClick={() => {
                            setTarget(u);
                            setReason('');
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
              <Pagination data={data} page={page} onChange={setPage} />
            </>
          )}
        </QueryState>
      </section>
      {target && (
        <Modal
          title={`Reject ${target.name}’s submission`}
          onClose={() => setTarget(null)}
          onConfirm={() =>
            action.mutate({ userId: target._id, status: 'REJECTED' })
          }
          disabled={!reason.trim()}
          loading={action.isPending}
          danger
        >
          <Field label="Reason for rejection">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </Modal>
      )}
    </>
  );
}
export function Withdrawals() {
  const [page, setPage] = useState(1);
  const query = useData('/admin/withdrawals', { page, limit: 15 });
  const [target, setTarget] = useState(null);
  const action = useAction(async () => {
    await send('patch', `/admin/withdrawals/${target.withdrawal._id}`, {
      status: target.status,
    });
    setTarget(null);
  }, 'Withdrawal processed');
  return (
    <>
      <Heading
        eyebrow="Funds in motion"
        title="Withdrawal requests"
        description="Process pending withdrawal requests in the order they were received."
      />
      <section className="panel">
        <QueryState query={query}>
          {(data) => (
            <>
              <Table
                items={data.items}
                columns={[
                  { label: 'Requested', render: (w) => date(w.createdAt) },
                  {
                    label: 'Investor',
                    render: (w) => w.userId?.name || idOf(w.userId),
                  },
                  { label: 'Amount', render: (w) => money(w.amount) },
                  {
                    label: 'Bank details',
                    render: (w) => (
                      <span>
                        {w.bankDetails?.accountName}
                        <small className="table-subtitle">
                          {w.bankDetails?.ifsc} · ••••{' '}
                          {w.bankDetails?.accountNumber?.slice(-4)}
                        </small>
                      </span>
                    ),
                  },
                  {
                    label: 'Status',
                    render: (w) => <Chip status={w.status} />,
                  },
                  {
                    label: 'Actions',
                    render: (w) => (
                      <div className="actions">
                        <Button
                          onClick={() =>
                            setTarget({ withdrawal: w, status: 'APPROVED' })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger-ghost"
                          onClick={() =>
                            setTarget({ withdrawal: w, status: 'REJECTED' })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
              <Pagination data={data} page={page} onChange={setPage} />
            </>
          )}
        </QueryState>
      </section>
      {target && (
        <Modal
          title={`${target.status === 'APPROVED' ? 'Approve' : 'Reject'} withdrawal`}
          onClose={() => setTarget(null)}
          onConfirm={() => action.mutate()}
          loading={action.isPending}
        >
          <p>
            {target.status === 'APPROVED'
              ? `Approving debits ${money(target.withdrawal.amount)} from the investor wallet and records a withdrawal transaction.`
              : 'Rejecting this request leaves the investor wallet balance unchanged.'}
          </p>
          {action.isError && (
            <p className="danger">{errorMessage(action.error)}</p>
          )}
        </Modal>
      )}
    </>
  );
}
export function Settings() {
  const query = useData('/admin/settings');
  return (
    <>
      <Heading
        eyebrow="Platform configuration"
        title="Rates & ownership limits"
        description="These values are applied at the time of each financial transaction."
      />
      <QueryState query={query}>
        {(data) => <SettingsForm data={data} />}
      </QueryState>
    </>
  );
}
function SettingsForm({ data }) {
  const schema = z.object({
    platformFeePct: z.coerce.number().min(0).max(100),
    brokerCommissionPct: z.coerce.number().min(0).max(100),
    maxOwnershipPct: z.coerce.number().positive().max(100),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: data });
  const action = useAction(
    (values) => send('patch', '/admin/settings', values),
    'Platform settings saved'
  );
  return (
    <section className="panel narrow">
      <h2>Financial parameters</h2>
      <form onSubmit={handleSubmit(action.mutate)}>
        {[
          [
            'platformFeePct',
            'Platform fee (%)',
            'Deducted from the sale price before investor distribution.',
          ],
          [
            'brokerCommissionPct',
            'Broker commission (%)',
            'Credited when a property becomes fully funded.',
          ],
          [
            'maxOwnershipPct',
            'Maximum investor ownership (%)',
            'Maximum ownership allowed per investor in each property.',
          ],
        ].map(([key, caption, help]) => (
          <Field
            key={key}
            label={caption}
            help={help}
            type="number"
            min="0"
            max="100"
            step="0.01"
            {...register(key)}
            error={errors[key]?.message}
          />
        ))}
        <Button type="submit" loading={action.isPending}>
          Save settings
        </Button>
      </form>
    </section>
  );
}
