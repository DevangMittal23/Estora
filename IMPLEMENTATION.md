# Specification coverage

The six supplied documents were reviewed. The final `docs/requirements.md` defines scope; refresh rotation, secondary trading, rental distributions and other explicitly excluded bonuses are not implemented. Cloud deployments and a narrated demo video remain external submission activities, not completed local artifacts. The source is versioned for publication to the ESTORA GitHub repository.

| Requirements | Implementation |
|---|---|
| R1–R5 auth/roles | `server/src/services/auth.service.js`, auth/role/ownership middleware; client auth context and routing guards |
| R6 password reset | Hashed one-hour one-use token; Resend integration; development terminal link; forgot/reset forms |
| R7–R12 creation/review/edit/state | Property service, strict creation schema, partial draft endpoint, transactional transitions, wizard and property management |
| R13 cancellation | One atomic operation refunds every ACTIVE lot, marks REFUNDED and clears unitsSold |
| R14–R15 discovery/details | Public LIVE/FUNDED filters; authenticated published properties; admin all statuses; full filtering, pagination, gallery, documents/map/calculator |
| R16–R18 investment | KYC/activity, unit/cap/balance guards, live settings cap, conditional reservation, unique idempotency, auto-funded commission, own investments |
| R19–R22 ledger/topup/wallet | Atomic wallet counter and append-only history; stored gateway orders; test HMAC/capture verification or labelled demo; scoped/filterable statement |
| R23/R34 withdrawals | Multiple pending requests, no debit until approval, transactional processing, rejection without debit and both notifications |
| R24 portfolio | Active cost/estimated value, exited payouts, realised ROI based on exited cost, allocations/table/chart |
| R25–R27 exits | Read-only preview, deterministic exact payouts, per-investor/per-lot credits, fee, unique payout, FUNDED→HOLDING |
| R28–R29 KYC | Restricted file count/type/size/content, private media delivery, pending queue, reasons, approval investment gate |
| R30–R33 administration | AUM/users/fees/India-calendar funding charts and queues; activation/approval/settings; no self-deactivation |
| R35–R37 broker | Own listings/KPIs/commission, saved five-step wizard, funding timeline, investor analytics |
| R38–R39 events/enquiries | All eight event types, unread badges/read-all, investor–broker threads with participant checks |
| R40–R43 quality | Mobile layouts, nav/dialog accessibility, skeleton/empty/error/retry/toast states, env validation, layered services, lint/format configs |
| R44 seed | Eight properties; ten users including seven investors across all KYC states; service-created financial history and reconciliation |

## Correctness verification

`server/tests/correctness.test.js` verifies CP3 payout completeness and CP5 state soundness. `server/tests/platform.test.js` verifies CP1 ledger balance, CP2 no overselling, CP4 idempotency, CP6 refund completeness and CP7 atomic debits against a real MongoDB replica set. Each property runs 100 generated cases. HTTP tests cover roles, deactivation, draft/review validation, payment order integrity, KYC privacy, withdrawals, notification ownership, enquiry participants and seed repeatability.

Client tests verify guards, validation, query states, unit/cap/terms gating, failed investment retry key reuse and stale sale-price preview blocking. The browser evaluation checks representative public/investor/broker/admin pages across desktop/tablet/mobile. This is focused verification, not a claim that every example test in the original task document exists verbatim.

The current suites have 28 backend and 46 frontend tests. They include concurrent ownership-cap enforcement, expired reset tokens, nested-query rejection, cancellation rollback on a failed refund, local gallery/document asset routing, authenticated media retrieval, auth mode changes, enquiry/withdrawal pagination, focus handling and route scrolling. Backend regressions also cover accessible review-notification links and participant-scoped admin-owned listing enquiries. The MongoDB binary download runs before Jest so a first-time download cannot exhaust the suite's setup timeout.

The commercial frontend refresh uses a navy/ivory/emerald palette, architectural concept imagery, a literal fractional ownership example and clear funding-to-sale explanations. Shared public, authentication and workspace layouts improve mobile navigation, forms, tables and empty states. Generated architecture is labelled illustrative; financial projections remain estimates and the demo status is explicit.

The latest isolated browser smoke check completed a labelled mock top-up and a one-unit investment, then verified the wallet credit, purchase confirmation and updated portfolio ownership. Public, investor, broker and admin pages were checked, including listing analytics, creation, review queues, sale entry, settings and shared account pages. Mobile navigation and anchor-to-route scrolling were exercised; representative layouts had no page-wide horizontal overflow at 360, 375 and 768 pixels. Desktop/mobile screenshots are stored in `artifacts/commercial-*.png`.

A separate runtime audit passed 63 API checks against the disposable demo: public and role-specific endpoints, permission boundaries, malformed/missing IDs, invalid queries, unknown endpoints and CORS. These checks used a disposable replica-set database on port 5001 with the frontend on 5174; the configured Atlas data was not mutated. Lint and frontend production build also pass. This is bounded regression and smoke verification rather than a claim that every possible workflow has been exhausted.

Production dependency audit: the server reports zero advisories. The client reports two moderate entries for the required React Router v6 packages: an open-redirect advisory and an SSR hydration advisory. This client does not use SSR hydration, and notification links reject external paths and backslashes. No patched v6 release was offered by the audit; a future major router upgrade should be reviewed separately.

## Resolved document conflicts

Secondary pages now include shared Back navigation following the user's subsequent request. Landing and investor/broker/admin homepages are excluded. Direct visits fall back to the appropriate homepage; the wizard retains a separate Previous step action. Navigation tests cover route exclusions, direct-entry fallback and browser history.

- Full `POST /properties` retains required-field validation. Added `POST /properties/draft` enables saving Basics before Location/Financials exist; submission validates the full listing. `savedStep` persists resume state.
- Admin can create and submit listings as described in the lifecycle table, even though one endpoint matrix omitted admin submission.
- Stored unit prices are whole **paise**, not whole rupees; this follows the final requirements over an earlier wording error.
- Seven investors satisfy APPROVED/PENDING/REJECTED/NOT_SUBMITTED examples; eight property rows retain the requested status distribution.
- JWT logout is client-only. The later requirements explicitly exclude refresh tokens and blocklists despite earlier examples.
- Partial drafts may omit fields in storage; a submitted listing cannot. Media and gateway order records are additional supporting collections.
- Zero-valued payouts/fees produce no money movement, while the payout record still accounts for their exact zero shares.
- Seeding refuses to erase an existing configured database unless `ALLOW_SEED_RESET=true` is explicitly set. Disposable tests/demos pass an explicit reset argument.
- Local gallery illustrations are served by the frontend; uploaded media is served by the API. Vite injects the environment-configured API URL, with a local demo default in configuration only.
- Admin-owned listing enquiries use the owner's participant scope. Admins can respond to their own listings without gaining access to unrelated broker threads; review notifications choose a route accessible to the listing owner's role.

## External configuration

Cloudinary, Razorpay test keys, Resend, Atlas and hosting are configurable. The local runnable path uses actual MongoDB and labelled mock payments; cloud provider delivery needs supplied credentials and remains unverified in this workspace. See README and deployment configs.
