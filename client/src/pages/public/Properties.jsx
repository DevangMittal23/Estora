import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Search,
  ShieldCheck,
  Layers3,
  Landmark,
} from 'lucide-react';
import { useData, send, useAction } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  Button,
  Field,
  QueryState,
  PropertyCard,
  Heading,
  Pagination,
  Chip,
  Progress,
  MediaLink,
  PropertyImage,
  Empty,
} from '../../components/ui';
import {
  money,
  compactMoney,
  pct,
  projected,
  types,
  label,
  toPaise,
} from '../../utils';
export function Landing() {
  const featured = useData('/properties', { status: 'LIVE', limit: 3 });
  const stats = useData('/stats');
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Real estate. A share at a time.</span>
          <h1>
            Own a share.
            <br />
            <em>See the bigger</em>
            <br />
            <em>picture.</em>
          </h1>
          <p>
            Buy units in reviewed properties, track your proportional ownership,
            and receive your share of net proceeds when the property sells.
          </p>
          <div className="actions">
            <Link to="/properties" className="button primary">
              Explore properties
              <ArrowUpRight size={17} />
            </Link>
            <a href="#how-it-works" className="text-link">
              See how it works
              <ArrowRight size={17} />
            </a>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={18} />
            <span>
              Reviewed listings. Clear ownership. A record of every transaction.
            </span>
          </div>
          <p className="hero-demo">
            An academic demonstration. Explore with test funds only.
          </p>
        </div>
        <div className="hero-art">
          <img
            src="/assets/estora-residences.webp"
            alt="Illustrative contemporary residences with limestone balconies and landscaped gardens"
            fetchpriority="high"
          />
          <div className="hero-art-caption">
            <span>THE OWNERSHIP IDEA</span>
            <strong>One property. Many owners.</strong>
            <p>
              10 of 1,000 units = <b>1% ownership</b>
            </p>
            <small>Illustrative example · Concept architecture</small>
          </div>
          <span className="hero-vertical">
            A DIFFERENT WAY INTO REAL ESTATE
          </span>
        </div>
      </section>
      <section className="landing-stats">
        <QueryState query={stats}>
          {(s) => (
            <>
              <div>
                <strong>{compactMoney(s.totalRaised)}</strong>
                <span>Demo funds committed</span>
              </div>
              <div>
                <strong>{s.investors?.toLocaleString('en-IN')}</strong>
                <span>Investor accounts</span>
              </div>
              <div>
                <strong>{s.totalProperties}</strong>
                <span>Properties on the platform</span>
              </div>
              <div>
                <strong>Every rupee</strong>
                <span>Recorded in the ledger</span>
              </div>
            </>
          )}
        </QueryState>
      </section>
      <section className="public-section featured-section">
        <Heading
          as="h2"
          eyebrow="Open for investment"
          title="Consider the property. Choose your share."
          description="Compare unit prices, holding periods and funding progress. Every live listing has been reviewed by the platform."
          action={
            <Link className="text-link" to="/properties">
              View marketplace
              <ArrowRight size={18} />
            </Link>
          }
        />
        <QueryState query={featured}>
          {(data) =>
            data.items.length ? (
              <div className="property-grid">
                {data.items.map((p) => (
                  <PropertyCard key={p._id} property={p} />
                ))}
              </div>
            ) : (
              <Empty
                title="New opportunities are on their way"
                description="Properties appear here after platform approval."
              />
            )
          }
        </QueryState>
      </section>
      <section className="ownership-section" aria-labelledby="ownership-title">
        <div className="ownership-intro">
          <span className="eyebrow">
            A smaller entry. The same clear picture.
          </span>
          <h2 id="ownership-title">
            You don’t need to buy
            <br />
            the whole property.
          </h2>
          <p>
            A property is divided into a fixed number of units. The units you
            buy determine your percentage of ownership and your share of the net
            sale proceeds.
          </p>
          <a href="#how-it-works" className="text-link">
            Understand the journey <ArrowRight size={17} />
          </a>
        </div>
        <div className="ownership-example">
          <span className="example-label">AN ILLUSTRATIVE EXAMPLE</span>
          <div className="ownership-math">
            <div>
              <small>Property value</small>
              <strong>₹1 crore</strong>
            </div>
            <span>÷</span>
            <div>
              <small>Total units</small>
              <strong>1,000</strong>
            </div>
            <span>=</span>
            <div>
              <small>Price per unit</small>
              <strong>₹10,000</strong>
            </div>
          </div>
          <div className="ownership-outcome">
            <Layers3 size={26} />
            <div>
              <strong>10 units. ₹1 lakh. 1% ownership.</strong>
              <p>
                If the property sells, you receive 1% of the net proceeds after
                the platform fee.
              </p>
            </div>
          </div>
          <small>
            Example only. Actual prices, minimum units and fees depend on the
            property and platform settings.
          </small>
        </div>
      </section>
      <section id="how-it-works" className="how-section">
        <div>
          <span className="eyebrow">How ESTORA works</span>
          <h2>
            From your first unit
            <br />
            to the final sale.
          </h2>
          <p>
            Know what you own, where your funds go, and how your share is
            returned.
          </p>
        </div>
        <ol>
          {[
            [
              'Explore & understand',
              'Compare properties, read supporting documents and consider the expected holding period.',
            ],
            [
              'Verify & fund',
              'Complete identity verification with dummy documents, then add test funds to your wallet.',
            ],
            [
              'Own your share',
              'Buy units while funding is open. Track your ownership and property milestones in your portfolio.',
            ],
            [
              'Receive your share at sale',
              'When the property is sold, net proceeds are allocated by ownership and credited to your wallet.',
            ],
          ].map(([title, description], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="transparency-section public-section">
        <div>
          <Landmark size={28} />
          <span className="eyebrow">An informed decision starts here</span>
          <h2>Clarity before commitment.</h2>
        </div>
        <div>
          <h3>Know the timeline</h3>
          <p>
            Plan for the stated holding period. There is no marketplace to
            resell your units before the property sells.
          </p>
        </div>
        <div>
          <h3>Understand the estimate</h3>
          <p>
            Appreciation is a projection, not a promise. Property values can
            fall. Returns depend on the final sale price and fees.
          </p>
        </div>
        <div>
          <h3>Follow every movement</h3>
          <p>
            See your purchases, refunds and sale payouts in your wallet history.
            Rental income distributions are not part of this platform.
          </p>
        </div>
      </section>
      <section id="faq" className="public-section faq-section">
        <div>
          <span className="eyebrow">Good questions. Clear answers.</span>
          <h2>Before you invest.</h2>
          <Link className="text-link" to="/signup">
            Create your account
            <ArrowRight size={18} />
          </Link>
        </div>
        <div>
          {[
            [
              'What do I own?',
              'You purchase units representing a proportional stake in the listed property. Your ownership percentage equals your units divided by all property units.',
            ],
            [
              'How are returns calculated?',
              'Estimated values use the property’s expected annual appreciation. These projections are illustrative, not guaranteed. Sale proceeds are split in proportion to ownership after the platform fee.',
            ],
            [
              'What happens if a listing is cancelled?',
              'The platform refunds the original investment amounts to investor wallets in full when an administrator cancels a live listing.',
            ],
            [
              'Is real money involved?',
              'This is an academic project. Payments use Razorpay test mode or a clearly labelled mock payment flow. Use dummy identity documents only.',
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="broker-invitation">
        <div>
          <span className="eyebrow">For property brokers</span>
          <h2>
            Bring the right properties
            <br />
            to a wider circle.
          </h2>
          <p>
            Create listings, manage enquiries and follow funding from one
            workspace. Broker accounts require platform approval.
          </p>
        </div>
        <Link className="button secondary" to="/signup?role=broker">
          Join as a broker <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
export function Marketplace() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 9,
    sort: '-createdAt',
  });
  const [view, setView] = useState('grid');
  const query = useData('/properties', filters);
  const update = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));
  return (
    <section className="public-section marketplace">
      <Heading
        eyebrow="The marketplace"
        title="Find a property. Make it part of your portfolio."
        description="Explore fractional ownership opportunities. Compare the cost of entry, review the documents and choose the units that fit your plans."
      />
      <div className="market-layout">
        <aside className="filters">
          <div className="between">
            <h3>Refine your search</h3>
            <button
              className="text-button"
              onClick={() =>
                setFilters({ page: 1, limit: 9, sort: '-createdAt' })
              }
            >
              Reset
            </button>
          </div>
          <Field
            label="City"
            value={filters.city || ''}
            onChange={(e) => update('city', e.target.value)}
            placeholder="e.g. Mumbai"
          />
          <Field label="Property type">
            <select
              value={filters.type || ''}
              onChange={(e) => update('type', e.target.value)}
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {label(t)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={filters.status || ''}
              onChange={(e) => update('status', e.target.value)}
            >
              <option value="">
                {user
                  ? user.role === 'ADMIN'
                    ? 'All properties'
                    : 'All published properties'
                  : 'Live & funded'}
              </option>
              <option value="LIVE">Live</option>
              <option value="FUNDED">Funded</option>
            </select>
          </Field>
          <div className="two-fields">
            <Field
              label="Min unit price (₹)"
              type="number"
              min="0"
              value={
                filters.minPrice === undefined ? '' : filters.minPrice / 100
              }
              onChange={(e) =>
                update(
                  'minPrice',
                  e.target.value ? Math.round(Number(e.target.value) * 100) : ''
                )
              }
            />
            <Field
              label="Max unit price (₹)"
              type="number"
              min="0"
              value={
                filters.maxPrice === undefined ? '' : filters.maxPrice / 100
              }
              onChange={(e) =>
                update(
                  'maxPrice',
                  e.target.value ? Math.round(Number(e.target.value) * 100) : ''
                )
              }
            />
          </div>
          <div className="two-fields">
            <Field
              label="Min funded (%)"
              type="number"
              min="0"
              max="100"
              value={filters.fundingPctMin ?? ''}
              onChange={(e) => update('fundingPctMin', e.target.value)}
            />
            <Field
              label="Max funded (%)"
              type="number"
              min="0"
              max="100"
              value={filters.fundingPctMax ?? ''}
              onChange={(e) => update('fundingPctMax', e.target.value)}
            />
          </div>
          <p className="filter-note">
            <ShieldCheck size={20} />
            Every live property has passed platform review.
          </p>
        </aside>
        <div>
          <div className="market-toolbar">
            <div className="search-field">
              <Search size={18} />
              <input
                aria-label="Search properties"
                placeholder="Search properties or cities"
                value={filters.search || ''}
                onChange={(e) => update('search', e.target.value)}
              />
            </div>
            <select
              aria-label="Sort properties"
              value={filters.sort}
              onChange={(e) => update('sort', e.target.value)}
            >
              <option value="-createdAt">Newest first</option>
              <option value="unitPrice">Unit price: low to high</option>
              <option value="-unitPrice">Unit price: high to low</option>
              <option value="-expectedAppreciationPct">
                Highest appreciation
              </option>
            </select>
            <button
              className="button secondary"
              onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            >
              {view === 'grid' ? 'List view' : 'Grid view'}
            </button>
          </div>
          <QueryState query={query}>
            {(data) => (
              <>
                <p className="market-results" aria-live="polite">
                  <strong>
                    {data.total ?? data.items.length}{' '}
                    {(data.total ?? data.items.length) === 1
                      ? 'property'
                      : 'properties'}
                  </strong>{' '}
                  matching your search{' '}
                  <span>
                    Estimates are illustrative. Returns are not guaranteed.
                  </span>
                </p>
                {data.items.length ? (
                  <div
                    className={`property-grid ${view === 'list' ? 'list-view' : ''}`}
                  >
                    {data.items.map((p) => (
                      <PropertyCard property={p} key={p._id} />
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="No properties match your search"
                    description="Adjust the filters to explore more opportunities."
                  />
                )}
                <Pagination
                  data={data}
                  page={filters.page}
                  onChange={(page) => setFilters((f) => ({ ...f, page }))}
                />
              </>
            )}
          </QueryState>
        </div>
      </div>
    </section>
  );
}
export function ReturnCalculator({ property: p }) {
  const [amount, setAmount] = useState(
      String((p.unitPrice * p.minUnits) / 100)
    ),
    [years, setYears] = useState(p.holdingPeriodMonths / 12);
  let paise = 0;
  try {
    paise = toPaise(amount);
  } catch {
    /* Inline validation below. */
  }
  return (
    <section className="panel calculator">
      <span className="eyebrow">Look ahead</span>
      <h2>Explore the possibilities.</h2>
      <div className="two-fields">
        <Field
          label="Investment amount (₹)"
          type="number"
          step="0.01"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={!paise ? 'Enter a valid positive amount.' : null}
        />
        <Field
          label="Holding period (years)"
          type="number"
          min="1"
          max="30"
          value={years}
          onChange={(e) => setYears(Number(e.target.value))}
        />
      </div>
      <div className="calculator-results">
        <div>
          <small>Illustrative ownership</small>
          <strong>{pct((paise / p.valuation) * 100)}</strong>
        </div>
        <div>
          <small>Projected value</small>
          <strong>
            {money(projected(paise, p.expectedAppreciationPct, years || 0))}
          </strong>
        </div>
      </div>
      <small>
        Based on {p.expectedAppreciationPct}% expected annual appreciation.
        Projections are illustrative and exclude sale fees. Returns are not
        guaranteed.
      </small>
    </section>
  );
}
export function PropertyDetail() {
  const { id } = useParams();
  const query = useData(`/properties/${id}`, {}, { refetchInterval: 15000 });
  const { user } = useAuth();
  const [image, setImage] = useState(0),
    [message, setMessage] = useState('');
  const enquiry = useAction(
    () => send('post', '/enquiries', { propertyId: id, message }),
    'Your enquiry has been sent'
  );
  return (
    <section className="public-section detail-page">
      <QueryState query={query}>
        {(p) => (
          <>
            <Heading
              eyebrow={`${label(p.type)} · ${p.city}`}
              title={p.title}
              description={`${p.address}, ${p.city}, ${p.state} ${p.pincode}`}
              action={<Chip status={p.status} />}
            />
            <div className="gallery">
              <PropertyImage
                className="gallery-main"
                media={p.images?.[image]}
                alt={p.title}
              />
              <div className="gallery-thumbnails">
                {p.images?.map((media, i) => (
                  <button
                    key={media.url}
                    aria-label={`View image ${i + 1}`}
                    className={image === i ? 'active' : ''}
                    onClick={() => setImage(i)}
                  >
                    <PropertyImage
                      media={media}
                      alt={`${p.title} image ${i + 1}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="detail-layout">
              <div>
                <section className="detail-overview">
                  <span className="eyebrow">The property, in perspective</span>
                  <h2>A considered opportunity.</h2>
                  <p className="preserve-text">{p.description}</p>
                  <div className="detail-metrics">
                    <div>
                      <small>Property valuation</small>
                      <strong>{compactMoney(p.valuation)}</strong>
                    </div>
                    <div>
                      <small>Area</small>
                      <strong>
                        {p.areaSqft?.toLocaleString('en-IN')} sq ft
                      </strong>
                    </div>
                    <div>
                      <small>Indicative rental yield</small>
                      <strong>{p.rentalYieldPct}%</strong>
                    </div>
                    <div>
                      <small>Holding period</small>
                      <strong>{p.holdingPeriodMonths} months</strong>
                    </div>
                  </div>
                  <p className="small">
                    Rental yield is supplied as property context. ESTORA does
                    not distribute rental income.
                  </p>
                </section>
                <ReturnCalculator property={p} />
                <section className="panel">
                  <h2>Property documents</h2>
                  <p>
                    Review the supporting information before committing funds.
                  </p>
                  {p.documents?.length ? (
                    p.documents.map((doc) => (
                      <MediaLink key={doc.url} media={doc} />
                    ))
                  ) : (
                    <Empty
                      title="No documents available"
                      description="The broker has not added supporting documents."
                    />
                  )}
                </section>
                <section className="panel">
                  <h2>
                    <MapPin size={21} /> Location
                  </h2>
                  <p>
                    {p.address}, {p.city}
                  </p>
                  <iframe
                    title="Property location"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(p.geo?.lat && p.geo?.lng ? `${p.geo.lat},${p.geo.lng}` : `${p.address}, ${p.city}`)}&output=embed`}
                  />
                  <a
                    className="text-link map-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.address}, ${p.city}, ${p.state}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open location in maps <ArrowUpRight size={17} />
                  </a>
                </section>
                {user?.role === 'INVESTOR' && (
                  <section className="panel">
                    <h2>Ask the property broker</h2>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (message.trim())
                          enquiry.mutate(undefined, {
                            onSuccess: () => setMessage(''),
                          });
                      }}
                    >
                      <Field label="Your question">
                        <textarea
                          required
                          minLength={1}
                          maxLength={2000}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                      </Field>
                      <Button
                        loading={enquiry.isPending}
                        disabled={!message.trim()}
                        type="submit"
                      >
                        Send enquiry
                      </Button>
                    </form>
                  </section>
                )}
              </div>
              <aside className="investment-card">
                <span className="eyebrow">Your share starts here</span>
                <small>Price per unit</small>
                <strong className="investment-price">
                  {money(p.unitPrice)}
                </strong>
                <p>
                  Minimum {p.minUnits} unit{p.minUnits !== 1 ? 's' : ''} ·{' '}
                  {money(p.minUnits * p.unitPrice)}
                </p>
                <Progress value={p.fundingPct} />
                <div className="summary-line">
                  <span>Units available</span>
                  <strong>
                    {p.totalUnits - p.unitsSold} / {p.totalUnits}
                  </strong>
                </div>
                <div className="summary-line">
                  <span>Investors</span>
                  <strong>{p.investorCount}</strong>
                </div>
                <div className="summary-line">
                  <span>Expected appreciation</span>
                  <strong className="positive">
                    {p.expectedAppreciationPct}% / yr
                  </strong>
                </div>
                {p.status === 'LIVE' && (!user || user.role === 'INVESTOR') ? (
                  <Link
                    className="button primary full-width"
                    to={!user ? '/login' : `/investor/invest/${id}`}
                    state={
                      !user ? { from: `/investor/invest/${id}` } : undefined
                    }
                  >
                    Invest in this property
                    <ArrowRight size={17} />
                  </Link>
                ) : (
                  <p className="notice">
                    {p.status === 'LIVE'
                      ? 'Investing is available to investor accounts.'
                      : `This property is ${label(p.status).toLowerCase()}. New investments are closed.`}
                  </p>
                )}
                <small className="investment-disclaimer">
                  Your ownership is proportional to purchased units. Estimated
                  returns are not guaranteed.
                </small>
              </aside>
            </div>
          </>
        )}
      </QueryState>
    </section>
  );
}
