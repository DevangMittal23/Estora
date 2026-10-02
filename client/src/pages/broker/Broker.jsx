import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData, send, useAction } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  Heading,
  QueryState,
  Kpis,
  Progress,
  Table,
  Chip,
  Button,
  Pagination,
  DataChart,
} from '../../components/ui';
import { money, compactMoney, pct, idOf } from '../../utils';
import { Enquiries } from '../shared/Shared';
export function BrokerDashboard() {
  const { user } = useAuth();
  const stats = useData('/broker/stats');
  const properties = useData('/broker/properties', { page: 1, limit: 8 });
  return (
    <>
      <Heading
        eyebrow="Your sourcing workspace"
        title={`Welcome back, ${user.name.split(' ')[0]}.`}
        description="Bring properties to market. Track their funding. Build your impact."
        action={
          <Link className="button primary" to="/broker/properties/new?fresh=1">
            + Create a listing
          </Link>
        }
      />
      <QueryState query={stats}>
        {(s) => (
          <Kpis
            items={[
              ['Properties listed', s.totalProperties],
              ['Live properties', s.liveProperties],
              ['Fully funded', s.fundedProperties],
              ['Total raised', compactMoney(s.totalRaised)],
              ['Commission earned', compactMoney(s.commissionEarned)],
            ]}
          />
        )}
      </QueryState>
      <section className="panel">
        <div className="between">
          <h2>Funding at a glance</h2>
          <Link className="text-link" to="/broker/properties">
            All properties →
          </Link>
        </div>
        <QueryState query={properties}>
          {(data) => (
            <>
              {data.items.map((p) => (
                <div className="funding-row" key={p._id}>
                  <Link to={`/broker/properties/${p._id}`}>
                    <strong>{p.title}</strong>
                    <small>
                      {p.city} · {p.investorCount} investors
                    </small>
                  </Link>
                  <Chip status={p.status} />
                  <Progress value={p.fundingPct} />
                </div>
              ))}
            </>
          )}
        </QueryState>
      </section>
    </>
  );
}
export function BrokerProperties() {
  const [page, setPage] = useState(1);
  const query = useData('/broker/properties', { page, limit: 12 });
  const submit = useAction(
    (id) => send('post', `/properties/${id}/submit`),
    'Property submitted for approval'
  );
  return (
    <>
      <Heading
        eyebrow="From sourcing to shared ownership"
        title="My properties"
        description="Manage listings and review funding progress across your properties."
        action={
          <Link className="button primary" to="/broker/properties/new?fresh=1">
            + Create listing
          </Link>
        }
      />
      <section className="panel">
        <QueryState query={query}>
          {(data) => (
            <>
              <Table
                items={data.items}
                columns={[
                  {
                    label: 'Property',
                    render: (p) => (
                      <Link
                        className="table-link"
                        to={`/broker/properties/${p._id}`}
                      >
                        {p.title}
                        <small>{p.city}</small>
                      </Link>
                    ),
                  },
                  {
                    label: 'Status',
                    render: (p) => (
                      <>
                        <Chip status={p.status} />
                        {p.rejectionReason && (
                          <small className="danger table-subtitle">
                            {p.rejectionReason}
                          </small>
                        )}
                      </>
                    ),
                  },
                  {
                    label: 'Funding',
                    render: (p) => <Progress value={p.fundingPct} />,
                  },
                  { label: 'Investors', key: 'investorCount' },
                  { label: 'Value', render: (p) => compactMoney(p.valuation) },
                  {
                    label: 'Actions',
                    render: (p) => (
                      <div className="actions">
                        <Link
                          className="text-link"
                          to={`/broker/properties/${p._id}`}
                        >
                          View
                        </Link>
                        {['DRAFT', 'REJECTED'].includes(p.status) && (
                          <>
                            <Link
                              className="text-link"
                              to={`/broker/properties/${p._id}/edit`}
                            >
                              Edit
                            </Link>
                            <Button
                              loading={submit.isPending}
                              variant="secondary"
                              onClick={() => submit.mutate(p._id)}
                            >
                              Submit
                            </Button>
                          </>
                        )}
                        {!['DRAFT', 'REJECTED'].includes(p.status) && (
                          <Link
                            className="text-link"
                            to={`/broker/properties/${p._id}/edit`}
                          >
                            Edit details
                          </Link>
                        )}
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
    </>
  );
}
export function BrokerAnalytics() {
  const { id } = useParams();
  const { user } = useAuth();
  const property = useData(`/properties/${id}`);
  const investors = useData(`/properties/${id}/investors`);
  return (
    <QueryState query={property}>
      {(p) =>
        idOf(p.brokerId) !== user._id ? (
          <div className="notice danger">You do not own this property.</div>
        ) : (
          <>
            <Heading
              eyebrow={`${p.city} · Property analytics`}
              title={p.title}
              description="Funding, investor ownership and property conversations."
              action={<Chip status={p.status} />}
            />
            {p.rejectionReason && (
              <div className="notice danger">
                Review feedback: {p.rejectionReason}
              </div>
            )}
            <Kpis
              items={[
                ['Funds raised', compactMoney(p.unitsSold * p.unitPrice)],
                ['Funding complete', pct(p.fundingPct)],
                ['Investor count', p.investorCount],
                ['Remaining units', p.totalUnits - p.unitsSold],
              ]}
            />
            <section className="panel">
              <div className="between">
                <h2>Funding timeline</h2>
                <Link className="text-link" to={`/properties/${id}`}>
                  Public details →
                </Link>
              </div>
              <DataChart data={p.fundingTimeline || []} x="date" />
            </section>
            <section className="panel">
              <h2>Investor ownership</h2>
              <QueryState query={investors}>
                {(data) => (
                  <Table
                    items={data.items}
                    keyField="investorId"
                    columns={[
                      { label: 'Investor', key: 'name' },
                      { label: 'Units', key: 'units' },
                      {
                        label: 'Ownership',
                        render: (i) => pct(i.ownershipPct),
                      },
                      {
                        label: 'Invested',
                        render: (i) => money(i.investedAmount),
                      },
                      {
                        label: 'Status',
                        render: (i) => <Chip status={i.status} />,
                      },
                    ]}
                  />
                )}
              </QueryState>
            </section>
            <Heading title="Property enquiries" />
            <Enquiries propertyId={id} />
            {['DRAFT', 'REJECTED'].includes(p.status) && (
              <Link
                className="button primary"
                to={`/broker/properties/${id}/edit`}
              >
                Edit this listing
              </Link>
            )}
          </>
        )
      }
    </QueryState>
  );
}
