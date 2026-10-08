# Public discovery features and technical SEO — local review

Implemented 8 October 2026 and approved by the user for publication to GitHub. Production canonical domain: **https://estora-pi.vercel.app**. This records local implementation and verification, not a claim that Google has indexed the site or that the production deployment has been verified.

## Initial audit

- Frontend: React 18, Vite 6, React Router 6, React Query. Existing rendering was a client-only SPA with a shared HTML title and a Vercel catch-all returning the SPA entry for missing paths.
- API: Express ESM, Mongoose/MongoDB, existing role/ownership checks and Cloudinary media permissions. Account, wallet, KYC, investment, payout and payment services remain canonical.
- Public routes existed for the homepage, marketplace and property detail; auth and role workspaces were separate guarded application routes. There were no existing canonical, sitemap, robots or structured-data implementations.
- Existing public imagery included local illustrative architectural assets and uploaded media. Private uploads used authenticated blob loading. Vercel Analytics was already installed with URL sanitization.
- Intended hosting is Vercel with root directory `client`, and the Express API on Render. Environment examples document public configuration without exposing secrets. Original specification documents remain intact.

## Public routes and access

| Route | Content | Logged out | Logged in |
|---|---|---|---|
| `/` | Existing homepage and exact original tagline | Public | Existing workspace retained |
| `/properties` | Existing published catalogue | Public | Existing workspace retained |
| `/properties/{name-city-id}` | Actual public property details, gallery, structure, FAQ and education links | Public; account actions retain their guards | Existing account actions and workspace |
| `/real-estate-investment-in-lucknow` | Lucknow introduction, evaluation questions, official resource, FAQ and real published city opportunities | Public | Existing workspace retained |
| `/fractional-real-estate` | Ownership/unit guide, illustrative example, benefits, risks, full ownership and REIT comparison, FAQs | Public | Existing workspace retained |
| `/insights` | Editorial knowledge index | Public | Existing workspace retained |
| `/insights/reading-a-fractional-property-listing` | Listing evaluation and proportional ownership | Public | Existing workspace retained |
| `/insights/understanding-real-estate-roi-assumptions` | Calculation inputs and assumptions | Public | Existing workspace retained |
| `/insights/rental-yield-and-the-costs-behind-it` | Gross/net yield and expenses | Public | Existing workspace retained |
| `/calculators` | Calculator directory | Public | Existing workspace retained |
| `/calculators/real-estate-roi` | Independent ROI scenario calculator | No account required | No account action required |
| `/calculators/rental-yield` | Independent gross/net yield calculator | No account required | No account action required |
| `/about` | Truthful introduction and scope of the demonstration | Public | Existing workspace retained |

Only Lucknow is configured as a city landing page. No fabricated Noida, Delhi, Gurgaon, Bangalore or Mumbai landing pages were generated. Add a meaningful entry to `client/src/seo/cities.js` to support a future city; route registration, metadata and sitemap derive from that configuration. Unknown city/article/property URLs return HTTP 404 on direct document requests.

## Data integrity and feature behavior

- Only **LIVE** and **FUNDED** properties enter SEO output and the anonymous city feed. A new read-only `/api/v1/seo/properties` endpoint and its detail counterpart use an explicit public-field projection. Authorization headers from visitors are never forwarded by the renderer.
- No private documents, broker identifiers, approval/rejection information, account data, tokens or investor identities appear in HTML snapshots, JSON-LD or sitemap. Public aggregate investor counts do not identify investors.
- Existing permission-checked interactive document access is preserved; documents are not embedded in the SEO snapshot. Property actions continue to use the immutable database ID and existing API/auth rules.
- Descriptive property paths append the complete database ID for collision safety without a schema migration. Old ID links and stale name slugs redirect permanently to the current canonical path. Missing and unpublished properties return 404; unavailable public data returns retryable 503 instead of invented content.
- Lucknow currently has no published properties in the disposable local demo database. Its empty state explains this and offers education and marketplace links.
- Articles are three substantive editorial guides, authored by the organization Estora, with actual creation/update dates, category, body, related articles and illustrative hero labels. Unpublished article entries do not enter routing, metadata or sitemap. This is a local content collection, not a new CMS or automatic article generator.
- The educational example is clearly illustrative: ₹1 crore / 1,000 units = ₹10,000 per unit; ₹2 lakh = 20 units = 2%. General rental education does not add rental distribution to Estora's funding-to-sale demonstration.
- ROI uses total investment = initial investment + entered expenses, net gain = sale proceeds + entered income − total investment, ROI = net gain / total investment × 100. The annualized approximation assumes all proceeds arrive at the end; it is explicitly **not IRR**. No projection is prefilled or guaranteed.
- Rental yield supports monthly or annual rent, counted once. Gross = annual rent / property value × 100; net = (annual rent − annual expenses) / property value × 100. Expenses and zero rent can produce negative net yield. Required positive denominators, invalid input and non-finite results are validated.

## Rendering and metadata

The existing application was not rebuilt or migrated to Next.js. Public pages now have a Vite server renderer using the existing React components and visitor layout. Vercel's Node Function serves complete public HTML, a safe public snapshot and initial metadata. Anonymous clients hydrate that HTML; existing sessions use the original application renderer and authenticated workspace. Initial API refresh is deferred until hydration finishes.

- Unique titles/descriptions, HTTPS production canonicals without tracking parameters, Open Graph, Twitter cards and `en-IN` language.
- Actual property names, cities and public images drive property metadata. No invented price, ROI, rental, regulatory or rating schema.
- JSON-LD: Organization and WebSite on the homepage; BreadcrumbList on hierarchical public pages; Article on the three published articles. No Product, reviews or ratings.
- Marketplace filter parameters use noindex plus the base marketplace canonical. Tracking parameters alone do not generate distinct canonicals. Current UI filters remain unchanged.
- `/login`, `/signup`, `/forgot-password`, `/reset/*`, `/reset-password/*`, `/investor/*`, `/broker/*`, `/admin/*`, `/profile` and `/notifications` use noindex application shells. Existing authentication guards still enforce access; robots is not an access-control mechanism.
- `/robots.txt` permits public crawling, lists actual private route exclusions and declares the production sitemap. `/sitemap.xml` dynamically contains only public canonical pages, published articles and published properties, with actual modification dates where available.
- Vercel preview deployments use noindex and block crawling, including after hydration. A sitemap failure returns 503; it does not publish a partial successful sitemap. Catalogues exceeding a single sitemap's 50,000-URL limit require a sitemap index before expansion.

## Performance and accessibility

- Private page modules and charts load on demand. Chart presentation/data and dashboard actions are preserved. The final main browser JavaScript bundle is approximately 494 KB / 155 KB gzip, compared with approximately 914 KB / 266 KB gzip before these changes; this is a bundle measurement, not a measured Core Web Vitals claim.
- Critical hero imagery is eager/preloaded, public property images can render directly in HTML, below-fold media defaults to lazy loading, and image dimensions reserve layout space. Existing local WebP and WOFF2 assets are reused. A malformed inactive external font import was removed.
- New pages use semantic headings, visible breadcrumbs, descriptive internal links, native FAQ disclosures, labelled calculator controls, associated errors, keyboard focus and polite live result regions. The existing design and reduced-motion behavior are retained.
- Existing Vercel Analytics is preserved. Calculator use and property views have allowlisted events without amounts, user identifiers, KYC, wallet details or other sensitive inputs.

## Files created

- `client/api/seo.js`
- `client/seo-dev.mjs`, `client/seo-preview.mjs`
- `client/src/entry-server.jsx`
- `client/src/components/charts.jsx` (existing chart presentation extracted for lazy loading)
- `client/src/pages/public/SeoPages.jsx`, `client/src/seo-pages.css`
- `client/src/seo/RouteSeo.jsx`, `articles.js`, `calculations.js`, `cities.js`, `metadata.js`, `server.js`, `urls.js`
- `client/src/test/seo-calculations.test.js`, `seo-pages.test.jsx`, `seo.test.js`
- `server/src/services/seo.service.js`, `controllers/seo.controller.js`, `routes/seo.routes.js`
- `docs/SEO_PUBLIC_FEATURES.md`

## Files modified

- `.gitignore`, `DESIGN.md`
- `client/.env.example`, `client/index.html`, `client/package.json`, `client/vercel.json`, `client/vite.config.js`
- `client/src/App.jsx`, `main.jsx`, `api.js`, `analytics.js`, `index.css`
- `client/src/components/ui.jsx`, `layouts/Layouts.jsx`, `pages/public/Properties.jsx`
- `server/src/app.js`, `server/tests/platform.test.js`

No authentication context/session module, business model, ledger, investment, wallet, payout or payment service was changed. Existing role page sources and financial forms remain intact.

## Local verification

Testing uses a disposable local demo replica set and labelled mock payments, not Atlas production data or real payment transactions.

- `npm test`: 41 server tests passed, including existing financial/state property tests with at least 100 runs. Final client suite: 131 tests passed across 10 files.
- Browser QA: 82 public route/layout and authenticated workspace checks passed; no runtime/hydration errors. Public pages checked at 360, 390, 768, 1024, 1440 and 1920px; one H1, proper canonical/indexability and no horizontal page overflow.
- Actual calculator inputs verified against expected ROI and gross/net yield results, including zero proceeds. Invalid URLs, sitemap, robots and legacy property redirects checked.
- Existing investor, broker and administrator login/workspaces checked. Investor wallet, portfolio, KYC and checkout pages render with the existing sidebar. Existing server tests cover registration and financial/payment behavior; no production payment was made.
- Independent desktop/mobile visual review passed with no blocking findings.
- Final `npm test`: **41 server + 131 client tests passed**. `npm run lint` passed; `npm run build` passed for both browser and SSR bundles. `git diff --check` passed; protected authentication, role page and financial service sources have no diff.
- Built-app Chrome smoke: **27 checks passed, zero runtime/hydration errors**. Six public pages also checked with JavaScript disabled and contained their real main HTML content. Both calculators were exercised; signup/recovery/login forms and an existing investor dashboard with its lazy-loaded chart were checked.
- The Vercel Node Function adapter passed local direct checks for a public page, missing page, private shell, robots and preview noindex output. Actual Vercel deployment/function tracing still needs verification after approval.
- Official DESIGN.md lint passed with no errors or warnings. The strict generic UI audit reports the same **16 existing** native-form-validation/textarea-resizing policy findings in existing modules. Those original affordances were intentionally preserved; new public pages introduce no such findings. This is not a claim that the strict generic audit has zero findings.

## Manual configuration and remaining review

1. The user approved committing and pushing these changes to GitHub. Deploy both the Render API changes and Vercel frontend together; actual production deployment remains to be verified.
2. Vercel project root remains `client`. Build is `npm run build`, output `dist`; Node Function configuration is in `client/vercel.json`. Keep `VITE_API_URL` (browser build) and `SEO_API_URL` (function runtime) pointed to the same deployed API, normally `https://estora-api.onrender.com`.
3. `VITE_SITE_URL` and `SEO_SITE_URL` remain `https://estora-pi.vercel.app`. To change domains later, update both to the verified HTTPS domain, rebuild, redirect the old domain and update Search Console/sitemap. Do not place backend secrets in Vite variables.
4. Existing Render `CLIENT_URL` must allow the deployed frontend origin. The SEO endpoint must be deployed before public catalogue SSR can succeed. Verify Vercel function tracing, response statuses and Render cold-start behavior on the actual deployed infrastructure.
5. Add the site to Google Search Console using the applicable URL-prefix/domain verification method; submit `/sitemap.xml`, inspect representative pages and request crawling after publication. No verification token was provided, so none was fabricated.
6. Validate published JSON-LD with Google's Rich Results Test and Schema.org validator; Organization/Breadcrumb/Article validity does not guarantee a rich result. Check social previews using their deployed public image URLs.
7. Measure real deployed Lighthouse/mobile performance and field Core Web Vitals after traffic. Bundle and local checks are not field performance results. Review live API latency/cold starts and caching before scaling.
8. Review editorial text before publication and keep cited primary resources current. Estora's existing academic/test-funds scope is intentionally visible. This implementation does not establish legal/regulatory approval or financial suitability.
9. The previous Netlify configuration remains a static SPA configuration and does **not** provide this new Vercel SSR/HTTP-status implementation. Alternate hosting needs its own function adapter.
10. Production seeding/admin setup, credentials, real financial operations and Google indexing/rankings are outside this local feature implementation. No private data was used to populate public examples.

## Review links and QA evidence

The development site is available at http://localhost:5180 with the disposable API on http://localhost:5010. The production bundle was tested on the same origin before restoring development mode. Build assets target the disposable local API for this review; the next deployed build must use the production environment settings above.

Local QA output is in `C:/Users/devang mittal/AppData/Local/Temp/estora-public-3mto4pta.5cm`: `browser-checks.json`, `production-checks.json`, `static-audit.json` and desktop/mobile screenshots. The detailed route matrix contains 82 checks; the built-app file contains 27. These temporary artifacts are not application content or Git changes.
