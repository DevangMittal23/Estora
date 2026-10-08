import React, { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  BookOpen,
  MapPin,
} from 'lucide-react';
import {
  Heading,
  Field,
  Button,
  QueryState,
  PropertyCard,
  Pagination,
  Empty,
} from '../../components/ui';
import { useData } from '../../api';
import { trackSeoEvent } from '../../analytics';
import { articles } from '../../seo/articles';
import { cities } from '../../seo/cities';
import { calculateRoi, calculateRentalYield } from '../../seo/calculations';
import '../../seo-pages.css';

const publishedArticles = () =>
  articles.filter((article) => article.published === true);
const date = (value) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
const rupees = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
const percent = (value) =>
  `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)}%`;

function Breadcrumbs({ items }) {
  return (
    <nav className="seo-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to="/">Home</Link>
        </li>
        {items.map(([text, to]) => (
          <li key={text}>
            {to ? (
              <Link to={to}>{text}</Link>
            ) : (
              <span aria-current="page">{text}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
function Page({ children, breadcrumbs, className = '' }) {
  return (
    <div className={`seo-page ${className}`}>
      <Breadcrumbs items={breadcrumbs} />
      {children}
    </div>
  );
}
function Notice({ children }) {
  return (
    <aside className="seo-notice">
      <strong>A considered starting point</strong>
      <p>
        {children ||
          'ESTORA is an academic demonstration using test funds and dummy identity documents. Property projections are estimates. Investment outcomes and exit timing are uncertain.'}
      </p>
    </aside>
  );
}
function NextStep({
  title = 'See the idea in context.',
  description = 'Read the details of a published property, then question the assumptions behind the numbers.',
}) {
  return (
    <section className="seo-next">
      <div>
        <span className="eyebrow">Your next step</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="actions">
        <Link to="/properties" className="button primary">
          Explore properties <ArrowUpRight size={16} />
        </Link>
        <Link to="/calculators" className="text-link">
          Explore the calculators <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
function FAQs({ items }) {
  return (
    <section className="seo-faq">
      <h2>Questions worth asking</h2>
      {items.map(([question, answer]) => (
        <details key={question}>
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </section>
  );
}
function NotFound({ title }) {
  return (
    <Page breadcrumbs={[[title]]}>
      <Heading
        eyebrow="Page not found"
        title={title}
        description="This page is not available. Explore the published guides and tools below."
      />
      <div className="actions">
        <Link className="button primary" to="/insights">
          Read insights
        </Link>
        <Link className="button secondary" to="/properties">
          Explore properties
        </Link>
      </div>
    </Page>
  );
}

export function FractionalGuide() {
  const sections = [
    ['meaning', 'What fractional ownership means'],
    ['units', 'A share expressed in units'],
    ['process', 'From listing to final sale'],
    ['returns', 'Where returns may come from'],
    ['benefits', 'Potential benefits'],
    ['risks', 'The risks to understand'],
    ['full-ownership', 'Compared with full ownership'],
    ['reits', 'Compared with a REIT'],
    ['checklist', 'Before you evaluate a listing'],
    ['estora', 'The ESTORA demonstration'],
    ['questions', 'Frequently asked questions'],
    ['next-step', 'Take the next step'],
  ];
  return (
    <Page breadcrumbs={[['Fractional real estate']]} className="seo-guide">
      <div className="seo-editorial-hero">
        <div>
          <Heading
            eyebrow="The ownership guide"
            title="What is fractional real estate investment?"
            description="One property. A proportional share. Understand the structure, the numbers and the questions to ask before considering an investment."
          />
          <p className="seo-intro">
            Fractional ownership breaks a large property investment into smaller
            interests. A lower entry amount can make a property easier to
            consider, but it does not remove the risks of owning real estate.
          </p>
        </div>
        <figure>
          <img
            src="/assets/estora-residences.webp"
            alt="Illustrative contemporary residences with landscaped gardens"
          />
          <figcaption>Concept architecture · Illustrative imagery</figcaption>
        </figure>
      </div>
      <Notice />
      <div className="seo-reading-layout">
        <aside className="seo-contents">
          <h2>In this guide</h2>
          <ol>
            {sections.map(([id, title]) => (
              <li key={id}>
                <a href={`#${id}`}>{title}</a>
              </li>
            ))}
          </ol>
        </aside>
        <div className="seo-prose">
          <section id="meaning">
            <span className="eyebrow">01 / The idea</span>
            <h2>What fractional ownership means</h2>
            <p>
              Instead of one person purchasing an entire property, several
              participants hold proportional interests. The structure should
              explain what each participant owns, how decisions are made, what
              costs apply and how an exit is handled. Those arrangements can
              differ between products.
            </p>
            <p>
              On ESTORA, a property is divided into a fixed number of units.
              Your active unit count determines your proportional share in the
              platform’s demonstration. Review the actual listing and its
              supporting information before drawing conclusions about the
              property.
            </p>
          </section>
          <section id="units">
            <span className="eyebrow">02 / The numbers</span>
            <h2>A share expressed in units</h2>
            <p>
              Unit price = property valuation ÷ total units. Proportional
              ownership = your units ÷ total units × 100. The minimum commitment
              also depends on the listing’s minimum purchasable unit count.
            </p>
            <div className="seo-example">
              <span>Illustrative example</span>
              <dl>
                <div>
                  <dt>Property valuation</dt>
                  <dd>₹1 crore</dd>
                </div>
                <div>
                  <dt>Total units</dt>
                  <dd>1,000</dd>
                </div>
                <div>
                  <dt>Price per unit</dt>
                  <dd>₹10,000</dd>
                </div>
                <div>
                  <dt>Your commitment</dt>
                  <dd>₹2,00,000</dd>
                </div>
              </dl>
              <p>
                <strong>20 units = 2% of the total units.</strong> This example
                illustrates proportional ownership; it is not an offered
                property or a promised return.
              </p>
            </div>
          </section>
          <section id="process">
            <span className="eyebrow">03 / The process</span>
            <h2>From listing to final sale</h2>
            <ol className="seo-steps">
              <li>
                <strong>Evaluate the property.</strong> Read the location,
                valuation, unit minimum, costs, documents and risks.
              </li>
              <li>
                <strong>Complete the platform requirements.</strong> On ESTORA,
                identity verification approval is required before investing test
                funds.
              </li>
              <li>
                <strong>Purchase available units.</strong> An eligible purchase
                reduces the demonstration wallet balance and records an
                investment.
              </li>
              <li>
                <strong>Follow funding and holding.</strong> A fully subscribed
                property becomes FUNDED; an administrator can move it into
                HOLDING.
              </li>
              <li>
                <strong>Account for the exit.</strong> When a sale is recorded,
                net proceeds after the platform fee are allocated
                proportionally. A cancellation uses the refund workflow.
              </li>
            </ol>
          </section>
          <section id="returns">
            <span className="eyebrow">04 / Return models</span>
            <h2>Where returns may come from</h2>
            <p>
              General real estate models may involve rental income, appreciation
              and eventual sale proceeds. Rent depends on occupancy, collections
              and costs. Appreciation is a change in value; it becomes a receipt
              only when a sale or another realization occurs.
            </p>
            <p>
              <strong>ESTORA does not distribute rental income.</strong> Its
              demonstration lifecycle uses unit purchases and a final
              proportional sale payout after the platform fee. Expected
              appreciation is a projection, and a displayed holding period is
              not a guaranteed exit date.
            </p>
            <Link className="text-link" to="/calculators/real-estate-roi">
              Explore your own ROI assumptions <ArrowRight size={16} />
            </Link>
          </section>
          <section id="benefits">
            <span className="eyebrow">05 / Potential benefits</span>
            <h2>A smaller entry point, with responsibilities</h2>
            <p>
              A fractional structure may allow a participant to consider a
              property without funding its entire purchase price. It may also
              make spreading an allocation across several properties possible. A
              platform can organize records and display ownership information.
            </p>
            <p>
              These are potential conveniences, not evidence of a better
              investment. Minimum amounts, concentration, governance and the
              quality of the underlying property still matter. Diversification
              does not guarantee protection against loss.
            </p>
          </section>
          <section id="risks">
            <span className="eyebrow">06 / Risk</span>
            <h2>The risks to understand</h2>
            <ul>
              <li>
                <strong>Liquidity:</strong> finding a buyer and completing a
                sale can take time. ESTORA has no secondary trading feature.
              </li>
              <li>
                <strong>Valuation:</strong> an estimate or asking price may
                differ from the eventual sale price.
              </li>
              <li>
                <strong>Costs:</strong> fees and property expenses can reduce
                proceeds. Know what a displayed estimate includes.
              </li>
              <li>
                <strong>Governance:</strong> understand who can make decisions
                and what information participants receive.
              </li>
              <li>
                <strong>Concentration:</strong> several units in one property
                still depend on that same asset and location.
              </li>
              <li>
                <strong>Loss:</strong> proceeds may be less than the amount
                invested, and exit timing is uncertain.
              </li>
            </ul>
            <p>
              Promises of guaranteed high returns deserve scrutiny.{' '}
              <a
                href="https://investor.sebi.gov.in/spot-any-scam.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                SEBI’s investor guidance on spotting scams
              </a>{' '}
              explains warning signs to consider.
            </p>
          </section>
          <section id="full-ownership">
            <span className="eyebrow">07 / Comparison</span>
            <h2>Compared with full ownership</h2>
            <div
              className="seo-comparison"
              role="region"
              aria-label="Fractional and full ownership comparison"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Consideration</th>
                    <th>Fractional interest</th>
                    <th>Full property ownership</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Starting commitment</th>
                    <td>A portion, subject to a minimum</td>
                    <td>The whole purchase and related costs</td>
                  </tr>
                  <tr>
                    <th>Decisions</th>
                    <td>Defined by the participation structure</td>
                    <td>Typically the owner’s responsibility</td>
                  </tr>
                  <tr>
                    <th>Property exposure</th>
                    <td>Proportional to the interest held</td>
                    <td>Exposure to the entire property</td>
                  </tr>
                  <tr>
                    <th>Exit</th>
                    <td>Depends on the structure and available exit process</td>
                    <td>
                      Depends on selling the property and completing the
                      transaction
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Neither route removes property risk. Compare the actual rights,
              expenses, responsibilities and exit arrangements rather than
              relying on the label.
            </p>
          </section>
          <section id="reits">
            <span className="eyebrow">08 / Comparison</span>
            <h2>Compared with a REIT</h2>
            <p>
              A real estate investment trust is a vehicle for investment in real
              estate assets without directly buying a particular physical
              property. REITs in India are regulated by SEBI. See{' '}
              <a
                href="https://investor.sebi.gov.in/understanding_reit_invit.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                SEBI’s explanation of REITs and InvITs
              </a>
              .
            </p>
            <p>
              A fractional property listing focuses attention on a specific
              property and its participation arrangement. It should not be
              assumed to have the same structure, regulation, liquidity or
              investor rights as a REIT. ESTORA is an academic demonstration; it
              does not claim REIT or regulated investment-product status.
            </p>
          </section>
          <section id="checklist">
            <span className="eyebrow">09 / Due diligence</span>
            <h2>Before you evaluate a listing</h2>
            <ul>
              <li>Understand the property’s location, use and condition.</li>
              <li>Read supporting records and ask what they establish.</li>
              <li>
                Check valuation evidence, unit price, minimum commitment and
                ownership limits.
              </li>
              <li>
                Distinguish recorded facts from projections and estimates.
              </li>
              <li>
                Identify fees, expenses, decision-making and information rights.
              </li>
              <li>Understand the holding, sale and cancellation processes.</li>
              <li>
                Consider a lower sale value, extra costs and a delayed exit.
              </li>
            </ul>
            <Link
              className="text-link"
              to="/insights/reading-a-fractional-property-listing"
            >
              Read the listing evaluation guide <ArrowRight size={16} />
            </Link>
          </section>
          <section id="estora">
            <span className="eyebrow">10 / Platform scope</span>
            <h2>The ESTORA demonstration</h2>
            <p>
              ESTORA models reviewed listings, proportional units, identity
              verification, a test wallet, an append-only financial record and
              property sale payouts. Investor, broker and administrator roles
              have separate permissions.
            </p>
            <p>
              This project uses test funds, labelled mock payments and dummy
              identity documents. It excludes rental distributions, secondary
              trading and real payments. These educational pages do not replace
              the listing terms, independent due diligence or advice suited to a
              real transaction.
            </p>
          </section>
          <section id="questions">
            <FAQs
              items={[
                [
                  'Is a smaller investment automatically safer?',
                  'No. A smaller commitment changes the amount exposed, but the underlying property, valuation, governance and exit risks remain.',
                ],
                [
                  'Can I sell my ESTORA units whenever I want?',
                  'ESTORA does not offer secondary trading. The demonstration exit occurs through a recorded property sale or the applicable cancellation workflow.',
                ],
                [
                  'Does ESTORA pay rental income?',
                  'No. Rental yield is covered as general real estate education, and its calculator is separate from the ESTORA investment lifecycle.',
                ],
                [
                  'Are projected returns guaranteed?',
                  'No. Appreciation and scenario outputs are assumptions. The final sale price, fees and active ownership determine the demonstration payout.',
                ],
                [
                  'Can I explore before creating an account?',
                  'Yes. Public guides, articles, calculators and published marketplace information can be explored without an account. Investing has separate account and verification requirements.',
                ],
              ]}
            />
          </section>
          <div id="next-step">
            <NextStep />
          </div>
        </div>
      </div>
    </Page>
  );
}

export function AboutPage() {
  return (
    <Page breadcrumbs={[['About ESTORA']]}>
      <div className="seo-editorial-hero">
        <div>
          <Heading
            eyebrow="About ESTORA"
            title="Make the ownership picture clearer."
            description="An academic demonstration of fractional real estate: from a reviewed listing and a first unit to the final sale record."
          />
          <p className="seo-intro">
            ESTORA brings the property, the proportional share and the financial
            record into one considered experience.
          </p>
          <Link className="text-link" to="/fractional-real-estate">
            Understand fractional ownership <ArrowRight size={16} />
          </Link>
        </div>
        <figure>
          <img
            src="/assets/estora-residences.webp"
            alt="Illustrative residential architecture and landscaped courtyard"
          />
          <figcaption>Concept architecture · Illustrative imagery</figcaption>
        </figure>
      </div>
      <div className="seo-about-copy">
        <section>
          <span className="eyebrow">The idea</span>
          <h2>A property is more than a projected number.</h2>
          <p>
            Location, documentation, valuation, costs and exit arrangements all
            deserve attention. ESTORA pairs published property information with
            visible unit economics and a record of the demonstration lifecycle.
          </p>
          <p>
            The platform helps investors explore listings and track proportional
            ownership. Approved brokers manage their listings, and
            administrators review submissions and oversee verification and
            property transitions.
          </p>
        </section>
        <section>
          <span className="eyebrow">The workflow</span>
          <h2>Follow the whole journey.</h2>
          <p>
            Properties move from draft and review to funding, holding and sale.
            Eligible investors purchase available units with test funds after
            identity verification approval. Funding progress reflects recorded
            units, and sale proceeds are allocated after the platform fee.
          </p>
          <p>
            Wallet movements are recorded in an append-only ledger. Account
            roles and permissions determine access to private documents and
            management actions. These mechanisms are part of the academic
            demonstration.
          </p>
        </section>
        <section>
          <span className="eyebrow">The boundary</span>
          <h2>Learn with clear expectations.</h2>
          <p>
            No real money or securities are involved. Use dummy identity
            documents only. The project does not implement secondary trading,
            rental distributions or real payments.
          </p>
          <p>
            Expected appreciation and calculator outputs are assumptions, not
            promised outcomes. A listing review does not certify a property or
            establish a real-world regulated investment offering.
          </p>
        </section>
      </div>
      <Notice />
      <NextStep
        title="Start with understanding."
        description="Explore the ownership guide, read a listing and make your own assumptions visible."
      />
    </Page>
  );
}

export function Insights() {
  const [lead, ...rest] = publishedArticles();
  return (
    <Page breadcrumbs={[['Insights']]} className="seo-insights">
      <Heading
        eyebrow="The ESTORA journal"
        title="A more considered perspective."
        description="Practical reading for understanding property listings, investment assumptions and the numbers behind a scenario."
      />
      {lead ? (
        <>
          <article className="seo-feature-story">
            <Link to={`/insights/${lead.slug}`} className="seo-story-image">
              <img
                src={lead.heroImage}
                alt="Illustrative contemporary residences"
              />
              <span>Concept architecture · Illustrative imagery</span>
            </Link>
            <div>
              <span className="eyebrow">{lead.category}</span>
              <h2>
                <Link to={`/insights/${lead.slug}`}>{lead.title}</Link>
              </h2>
              <p>{lead.description}</p>
              <div className="seo-byline">
                By {lead.author.name} ·{' '}
                <time dateTime={lead.publishedAt}>
                  {date(lead.publishedAt)}
                </time>
              </div>
              <Link className="text-link" to={`/insights/${lead.slug}`}>
                Read the perspective <ArrowUpRight size={17} />
              </Link>
            </div>
          </article>
          <section className="seo-story-list" aria-label="More insights">
            {rest.map((article, index) => (
              <article key={article.slug}>
                <span className="seo-story-number">0{index + 2}</span>
                <div>
                  <span className="eyebrow">{article.category}</span>
                  <h2>
                    <Link to={`/insights/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h2>
                  <p>{article.description}</p>
                  <div className="seo-byline">
                    By {article.author.name} ·{' '}
                    <time dateTime={article.publishedAt}>
                      {date(article.publishedAt)}
                    </time>
                  </div>
                </div>
                <Link
                  aria-label={`Read ${article.title}`}
                  to={`/insights/${article.slug}`}
                  className="seo-story-arrow"
                >
                  <ArrowUpRight size={24} />
                </Link>
              </article>
            ))}
          </section>
        </>
      ) : (
        <Empty
          title="New perspectives are on their way"
          description="Explore the ownership guide while our next articles are prepared."
          action={<Link to="/fractional-real-estate">Read the guide</Link>}
        />
      )}
      <NextStep
        title="Put an assumption into numbers."
        description="Our educational calculators make a scenario visible, including costs and the possibility of a loss."
      />
    </Page>
  );
}

export function InsightArticle() {
  const { slug } = useParams();
  const article = publishedArticles().find((item) => item.slug === slug);
  if (!article) return <NotFound title="Article not found" />;
  const related = publishedArticles().filter((item) =>
    article.related.includes(item.slug)
  );
  return (
    <Page
      breadcrumbs={[['Insights', '/insights'], [article.title]]}
      className="seo-article"
    >
      <header className="seo-article-header">
        <Heading
          eyebrow={article.category}
          title={article.title}
          description={article.description}
        />
        <div className="seo-byline">
          By {article.author.name} · Published{' '}
          <time dateTime={article.publishedAt}>
            {date(article.publishedAt)}
          </time>
          {article.updatedAt !== article.publishedAt && (
            <>
              {' '}
              · Updated{' '}
              <time dateTime={article.updatedAt}>
                {date(article.updatedAt)}
              </time>
            </>
          )}
        </div>
      </header>
      <figure className="seo-article-image">
        <img
          src={article.heroImage}
          alt="Illustrative residential architecture"
        />
        <figcaption>Concept architecture · Illustrative imagery</figcaption>
      </figure>
      <article className="seo-prose seo-article-body">
        {article.body.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list?.length > 0 && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <Notice />
        <div className="actions">
          <Link className="text-link" to="/fractional-real-estate">
            The ownership guide <ArrowRight size={16} />
          </Link>
          <Link className="text-link" to="/calculators">
            Educational calculators <ArrowRight size={16} />
          </Link>
        </div>
      </article>
      {related.length > 0 && (
        <section className="seo-related">
          <h2>Continue reading</h2>
          {related.map((item) => (
            <Link key={item.slug} to={`/insights/${item.slug}`}>
              <span>{item.category}</span>
              <strong>{item.title}</strong>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </section>
      )}
      <NextStep />
    </Page>
  );
}

const calculatorTypes = {
  'real-estate-roi': {
    title: 'Real estate ROI calculator',
    description:
      'See how sale proceeds, received rent, expenses and a holding period shape a simplified return scenario.',
    label: 'Return on investment',
  },
  'rental-yield': {
    title: 'Rental yield calculator',
    description:
      'Compare gross and net annual rental yield using one rent period and the expenses you choose to include.',
    label: 'Rental yield',
  },
};

export function Calculators() {
  return (
    <Page breadcrumbs={[['Calculators']]}>
      <Heading
        eyebrow="Make assumptions visible"
        title="A clearer view of the numbers."
        description="Two educational tools for your own real estate scenarios. No account needed, no predictions implied."
      />
      <div className="seo-tool-list">
        {Object.entries(calculatorTypes).map(([type, calculator], index) => (
          <Link to={`/calculators/${type}`} key={type}>
            <span className="seo-tool-number">0{index + 1}</span>
            <div>
              <span className="eyebrow">{calculator.label}</span>
              <h2>{calculator.title}</h2>
              <p>{calculator.description}</p>
            </div>
            <Calculator size={30} strokeWidth={1.3} />
            <ArrowUpRight size={22} />
          </Link>
        ))}
      </div>
      <Notice>
        Results depend entirely on the values you enter. These calculators do
        not predict performance, verify a property or change your wallet. ESTORA
        does not distribute rental income.
      </Notice>
      <section className="seo-prose">
        <h2>Choose the question first.</h2>
        <p>
          ROI compares your total proceeds with your total investment, including
          the expenses entered. Rental yield compares annual rent with a
          property value. They answer different questions; a rental yield alone
          does not describe the gain or loss on a future sale.
        </p>
        <Link
          className="text-link"
          to="/insights/understanding-real-estate-roi-assumptions"
        >
          Read about ROI assumptions <ArrowRight size={16} />
        </Link>
      </section>
    </Page>
  );
}

export function CalculatorPage() {
  const params = useParams();
  const location = useLocation();
  const type =
    params.type || location.pathname.split('/').filter(Boolean).at(-1);
  const calculator = calculatorTypes[type];
  if (!calculator) return <NotFound title="Calculator not found" />;
  return (
    <Page breadcrumbs={[['Calculators', '/calculators'], [calculator.title]]}>
      <Heading
        eyebrow="Your assumptions. Your scenario."
        title={calculator.title}
        description={calculator.description}
      />
      <CalculatorForm key={type} type={type} />
      <section className="seo-prose seo-calculator-explanation">
        <h2>How the calculation works</h2>
        {type === 'real-estate-roi' ? (
          <>
            <p>Total investment = initial investment + total expenses.</p>
            <p>Total gain = sale value + received rent − total investment.</p>
            <p>Total ROI = total gain ÷ total investment × 100.</p>
            <p>
              Annualized return ≈ [((sale value + received rent) ÷ total
              investment)<sup>1 / holding years</sup> − 1] × 100.
            </p>
            <p>
              The annualized approximation treats all proceeds as received at
              the end of the holding period. It is not IRR and does not model
              periodic cash flows. Enter sale proceeds consistently with your
              costs; avoid subtracting the same fee twice.
            </p>
            <Link
              className="text-link"
              to="/insights/understanding-real-estate-roi-assumptions"
            >
              Understand ROI assumptions <ArrowRight size={16} />
            </Link>
          </>
        ) : (
          <>
            <p>Annual rent = monthly rent × 12, or the annual rent entered.</p>
            <p>Gross yield = annual rent ÷ property value × 100.</p>
            <p>
              Net yield = (annual rent − annual expenses) ÷ property value ×
              100.
            </p>
            <p>
              The monthly option assumes the entered rent is received for all 12
              months. To model vacancy or uneven receipts, select annual rent
              and enter the total. Net yield includes only your entered
              expenses; this tool does not calculate financing or taxes.
            </p>
            <Link
              className="text-link"
              to="/insights/rental-yield-and-the-costs-behind-it"
            >
              Read about rental yield <ArrowRight size={16} />
            </Link>
          </>
        )}
        <Notice>
          Educational scenario only. Results are approximate and depend on your
          inputs, not actual or guaranteed future returns. ESTORA uses test
          funds and does not distribute rental income.
        </Notice>
      </section>
    </Page>
  );
}

function CalculatorForm({ type }) {
  const roi = type === 'real-estate-roi';
  const [values, setValues] = useState(
    roi
      ? {
          initialInvestment: '',
          saleValue: '',
          rentalIncome: '',
          expenses: '',
          years: '',
        }
      : {
          propertyValue: '',
          rentalIncome: '',
          rentFrequency: 'monthly',
          annualExpenses: '',
        }
  );
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const fields = roi
    ? [
        [
          'initialInvestment',
          'Initial investment (₹)',
          'Required. Your starting outlay, before the extra expenses entered below.',
        ],
        [
          'saleValue',
          'Sale value / proceeds (₹)',
          'Required. Your assumed sale receipt; zero is valid.',
        ],
        [
          'rentalIncome',
          'Total received rent (₹)',
          'Optional. All rent in this scenario; blank means zero. ESTORA does not distribute rent.',
        ],
        [
          'expenses',
          'Total expenses (₹)',
          'Optional. Additional costs over the whole holding period; blank means zero.',
        ],
        [
          'years',
          'Holding period (years)',
          'Required. Greater than zero, up to 1,000 years. Decimal years are accepted.',
        ],
      ]
    : [
        [
          'propertyValue',
          'Property value (₹)',
          'Required. The value used as the denominator; must be greater than zero.',
        ],
        [
          'rentalIncome',
          `${values.rentFrequency === 'monthly' ? 'Monthly' : 'Annual'} rental income (₹)`,
          'Required. Enter rent for the selected period only; zero is valid.',
        ],
        [
          'annualExpenses',
          'Annual expenses (₹)',
          'Optional. A full year of costs; blank means zero. Expenses can exceed rent.',
        ],
      ];
  const change = (field, value) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors({});
    setResult(null);
  };
  const submit = (event) => {
    event.preventDefault();
    try {
      const calculated = roi
        ? calculateRoi(values)
        : calculateRentalYield(values);
      setErrors({});
      setResult(calculated);
      trackSeoEvent('calculator_used', { calculator: type });
    } catch (error) {
      setResult(null);
      setErrors({ [error.field || 'scenario']: error.message });
    }
  };
  return (
    <div className="seo-calculator-layout">
      <form className="seo-calculator-form" onSubmit={submit} noValidate>
        <h2>Your scenario</h2>
        <p>
          Enter amounts in rupees, with up to two decimal places. Start with
          your own values.
        </p>
        {!roi && (
          <Field
            label="Rent period"
            help="Choose one period. The calculator annualizes monthly rent."
          >
            <select
              aria-label="Rent period"
              value={values.rentFrequency}
              onChange={(event) => change('rentFrequency', event.target.value)}
            >
              <option value="monthly">Monthly rent</option>
              <option value="annual">Annual rent</option>
            </select>
          </Field>
        )}
        <div className="seo-input-grid">
          {fields.map(([key, title, help]) => (
            <Field
              key={key}
              label={title}
              error={errors[key]}
              help={<span id={`${key}-help`}>{help}</span>}
              id={key}
              aria-describedby={`${key}-help`}
              inputMode="decimal"
              type="text"
              autoComplete="off"
              value={values[key]}
              onChange={(event) => change(key, event.target.value)}
            />
          ))}
        </div>
        {errors.scenario && (
          <p role="alert" className="danger">
            {errors.scenario}
          </p>
        )}
        <div className="actions">
          <Button type="submit">
            Calculate {roi ? 'ROI' : 'yield'} <ArrowRight size={16} />
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setValues((previous) =>
                Object.fromEntries(
                  Object.keys(previous).map((key) => [
                    key,
                    key === 'rentFrequency' ? 'monthly' : '',
                  ])
                )
              );
              setResult(null);
              setErrors({});
            }}
          >
            Reset
          </Button>
        </div>
      </form>
      <section className="seo-result" aria-live="polite" aria-atomic="true">
        <span className="eyebrow">Calculated scenario</span>
        <h2>{result ? 'Your results' : 'Give your assumptions a shape.'}</h2>
        {result ? (
          <>
            <dl>
              {(roi
                ? [
                    [
                      'Total investment, including costs',
                      rupees(result.totalInvestment),
                    ],
                    ['Total gain / loss', rupees(result.totalGain)],
                    ['Total ROI', percent(result.roiPercent)],
                    [
                      'Approximate annualized return',
                      percent(result.annualizedPercent),
                    ],
                  ]
                : [
                    ['Annual rental income', rupees(result.annualRentalIncome)],
                    ['Gross annual yield', percent(result.grossYieldPercent)],
                    ['Net annual yield', percent(result.netYieldPercent)],
                  ]
              ).map(([title, value]) => (
                <div key={title}>
                  <dt>{title}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p>
              {roi
                ? 'Annualized return assumes every receipt arrives at the end. It is not IRR.'
                : 'Net yield includes only the annual expenses you entered.'}
            </p>
            <small>
              Based on your inputs. Approximate, not a forecast or promised
              return.
            </small>
          </>
        ) : (
          <>
            <Calculator size={42} strokeWidth={1} />
            <p>
              Enter the required values and calculate to see the result.{' '}
              {roi
                ? 'Zero proceeds and negative returns are valid scenarios.'
                : 'Zero rent and negative net yield are valid scenarios.'}
            </p>
            <small>No sample forecast is filled in for you.</small>
          </>
        )}
      </section>
    </div>
  );
}

export function CityInvestmentPage() {
  const params = useParams();
  const location = useLocation();
  const citySlug =
    params.citySlug ||
    location.pathname.replace('/real-estate-investment-in-', '');
  const city = cities.find((item) => item.slug === citySlug);
  if (!city) return <NotFound title="City guide not found" />;
  return <CityGuide key={city.slug} city={city} />;
}
function CityGuide({ city }) {
  const [page, setPage] = useState(1);
  const query = useData('/seo/properties', { city: city.name, page, limit: 9 });
  return (
    <Page
      breadcrumbs={[[`Real estate investment in ${city.name}`]]}
      className="seo-city"
    >
      <Heading
        eyebrow={`${city.name} · ${city.state}`}
        title={`Real estate investment in ${city.name}`}
        description={city.introduction}
      />
      <div className="seo-city-intro">
        <MapPin size={28} strokeWidth={1.2} />
        <p>
          A city is a starting point. The property’s precise location, records,
          valuation and exit assumptions deserve a closer look.
        </p>
        <Link className="text-link" to="/fractional-real-estate">
          Understand fractional ownership <ArrowRight size={16} />
        </Link>
      </div>
      <section className="seo-city-properties">
        <Heading
          as="h2"
          eyebrow="Published opportunities"
          title={`Explore properties in ${city.name}`}
          description="Current published listings from the ESTORA marketplace. Availability and funding state come from the property records."
        />
        <QueryState query={query}>
          {(data) =>
            data?.items?.length ? (
              <>
                <div className="property-grid">
                  {data.items.map((property) => (
                    <PropertyCard key={property._id} property={property} />
                  ))}
                </div>
                <Pagination data={data} page={page} onChange={setPage} />
              </>
            ) : (
              <Empty
                title={`No published opportunities in ${city.name} yet`}
                description="There are no published listings matching this city at the moment. Use the guide below or explore the wider marketplace."
                action={
                  <Link to="/properties" className="button secondary">
                    Explore all properties <ArrowRight size={16} />
                  </Link>
                }
              />
            )
          }
        </QueryState>
      </section>
      <div className="seo-city-guide">
        <section className="seo-prose">
          <span className="eyebrow">Evaluate the location</span>
          <h2>Look beyond the city label.</h2>
          <p>
            For a property in {city.name}, confirm the address and local area
            against the supporting records. Consider the route to the site,
            nearby uses and the condition of the surrounding infrastructure.
            Visit or seek independent evidence where a real transaction would
            require it.
          </p>
          <p>
            Review what the listing states about property use, construction,
            access and valuation. A planned amenity or a proposed development
            should be distinguished from something already present. Avoid
            translating broad city narratives into a promised property return.
          </p>
          <h2>Check the records that matter.</h2>
          <p>
            The official planning-authority resources below are starting points
            for local planning information. Use their records and the relevant
            property documents to frame specific questions. A link to an
            authority does not establish that any ESTORA listing has an approval.
          </p>
          <ul>
            {city.resources.map((resource) => (
              <li key={resource.url}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {resource.label} <ArrowUpRight size={14} />
                </a>
              </li>
            ))}
          </ul>
          <h2>Read the investment structure.</h2>
          <p>
            Check unit price, the minimum unit commitment, active funding state,
            valuation assumptions and the planned holding period. Ask about
            costs and the final sale process. Proportional ownership does not
            guarantee either a return or a quick exit.
          </p>
          <p>
            ESTORA’s academic demonstration uses test funds and a proportional
            final sale payout. It does not offer rental distributions or
            secondary trading. Treat appreciation figures as projections.
          </p>
        </section>
        <aside className="seo-city-checklist">
          <BookOpen size={26} strokeWidth={1.2} />
          <h2>Your listing checklist</h2>
          <ul>
            <li>Precise location and property use</li>
            <li>Supporting documents and unresolved questions</li>
            <li>Valuation, unit price and minimum units</li>
            <li>Costs and uncertain appreciation assumptions</li>
            <li>Holding, sale and cancellation process</li>
          </ul>
          <Link
            className="text-link"
            to="/insights/reading-a-fractional-property-listing"
          >
            Read the full checklist <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
      <FAQs
        items={[
          [
            `Can I see ${city.name} properties without an account?`,
            'Yes. Published city opportunities and education are public. An investment requires an eligible account, verification approval and test wallet funds.',
          ],
          [
            'Does an empty city page mean there are no properties in the city?',
            'No. It means ESTORA currently has no published opportunity matching that city. This page is not a city-wide property inventory.',
          ],
          [
            'Does ESTORA guarantee a city-specific return?',
            'No. Location and appreciation assumptions do not guarantee proceeds. Evaluate the individual property, costs and exit risks.',
          ],
          [
            'Does the planning-authority link verify a listing?',
            'No. It is a resource for your own investigation. Read the listing documents and check the records relevant to the particular property.',
          ],
        ]}
      />
      <Notice />
      <NextStep
        title="Keep the property in focus."
        description="Explore the wider marketplace and use the ownership guide to evaluate what each listing actually offers."
      />
    </Page>
  );
}
