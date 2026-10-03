# ESTORA

One property. Many owners. A complete fractional real estate portal built with React 18, Vite, Express and MongoDB.

## Run the local demo

Prerequisite: **Node.js 20.19+** (Node 22 or 24 recommended), npm, and internet access for the first install and MongoDB binary download.

```powershell
npm run install:all
npm run demo
```

Open **http://localhost:5173**. Use `localhost` consistently; the API permits that frontend origin. The API runs at http://localhost:5000 and health is at `/health`.

The demo starts a **real, disposable MongoDB replica set**, seeds eight properties and ten users, and runs the React client. No Atlas, payment or media credentials are needed. MongoDB binaries are cached inside `server/.local/`. **Demo data resets on restart.** Stop both processes with Ctrl+C. Mock top-ups are explicitly labelled in the wallet. Authentication, permissions, money accounting and transactions use the real backend/database.

| Role | Email | Password | State |
|---|---|---|---|
| Admin | admin@estora.dev | Admin@123 | Platform operator |
| Broker | broker1@estora.dev | Broker@123 | Approved |
| Broker | broker2@estora.dev | Broker@123 | Awaiting approval |
| Investor | investor1@estora.dev | Investor@123 | Approved KYC, existing portfolio |
| Investor | investor2@estora.dev | Investor@123 | Approved KYC |
| Investor | investor3@estora.dev | Investor@123 | Approved KYC |
| Investor | investor4@estora.dev | Investor@123 | Approved KYC |
| Investor | investor5@estora.dev | Investor@123 | Pending KYC with dummy document |
| Investor | investor6@estora.dev | Investor@123 | Rejected KYC |
| Investor | investor7@estora.dev | Investor@123 | KYC not submitted |

Seed passwords and wallets are demonstration data. Never seed these accounts into a public production database.

## Use a persistent database and integrations

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Edit `server/.env`: set `MONGO_URI` to an Atlas database or local MongoDB **replica set**, replace `JWT_SECRET` with a random secret (at least 32 characters), and set `CLIENT_URL` to the exact frontend origin. The server refuses a standalone MongoDB instance because financial operations require transactions.

Then run `npm run seed` against an empty demo database and `npm run dev`. To intentionally replace an existing demo database, set `ALLOW_SEED_RESET=true` before seeding; the reset removes all data in that configured database. Turn it back off afterward.

Optional integrations:

- **Razorpay test gateway:** set `PAYMENT_MODE=razorpay`, `RAZORPAY_KEY_ID=rzp_test_...`, and `RAZORPAY_KEY_SECRET`. The client uses the key returned with the order. Verification checks the HMAC, captured status, currency, order owner and stored amount. Live Razorpay keys are refused.
- **Cloudinary:** set `MEDIA_MODE=cloudinary` and all three `CLOUDINARY_*` variables. Files use authenticated Cloudinary storage and the API enforces access before delivering them. Local demo files are stored in MongoDB and access-controlled through the same API.
- **Password reset:** set `RESEND_API_KEY` and `EMAIL_FROM` to send email. Without an email key, development/test mode prints the reset link in the API terminal. Production requires a configured email provider for delivery. Event notifications remain in-app.

Verify configured Atlas and Cloudinary credentials with `npm --prefix server run verify:integrations`. This checks authentication, database connectivity and replica-set support without seeding data or uploading files. Use `npm run dev` for the configured services; `npm run demo` deliberately overrides them with its disposable local database and media mode.

`NODE_ENV=production` refuses mock payment and local database media modes. Supply Razorpay test and Cloudinary credentials for that configuration. Real money and real KYC are outside this project's scope.

For a deployed database, create your own admin with `npm --prefix server run admin:create`.
Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` and `ADMIN_PHONE` first, using the same
`MONGO_URI` as Render. This creates only the admin account and preserves existing data.
It refuses to promote another account or overwrite an existing admin password. The
demo credentials above are not created automatically during deployment. See the
[admin setup instructions](docs/DEPLOYMENT.md#5-create-your-deployed-admin-account).

## Use multiple accounts at once

Open the site in separate browser tabs and sign in to an account in each tab. An admin,
broker and multiple investors can work at the same time in the same browser profile.
Each tab keeps its own login through reloads; logging out affects only that tab. Closing
the tab ends its session. A browser's Duplicate Tab action can copy the initial session,
but subsequent login and logout remain independent.

After updating from the earlier shared-login version, reload the site and sign in again
in each tab. Purchase retry keys are also scoped to the tab, preserving a failed request's
reference through reloads while separating new purchases in other tabs. MongoDB
transactions, atomic unit reservations and conditional wallet debits protect concurrent
transactions on the server.

## Features

- Landing, searchable marketplace, filtering/sorting/pagination, galleries, maps, documents and return calculator.
- Registration/login, role dashboards, live account deactivation checks, broker approval, profile, change password and one-hour password reset.
- Broker drafts saved between wizard steps, media upload, review/resubmission, funding timeline and investor analytics.
- Investor wallet, mock/Razorpay test top-up, full ledger, unit checkout with confirmation and idempotent retries, portfolio, realised ROI and allocation charts.
- Admin approval queues, users/KYC, lifecycle controls, cancellation refunds, sale preview and exact investor payouts, fees and ownership settings.
- Withdrawal requests/admin decisions, property enquiry threads, unread notifications and mark-as-read.
- Mobile navigation, keyboard-accessible dialogs, loading, empty, retry and toast feedback.

All stored money is **integer paise**. Ledger posting is the only wallet mutation path. Investments, auto-funding/commission, refunds, withdrawals and payouts use MongoDB transactions. BigInt intermediate arithmetic prevents precision loss during fee and payout calculations. Zero-valued payouts/fees are recorded in payout data without zero-value ledger entries.

## Checks

```powershell
npm test
npm run lint
npm run build
```

Server tests use a temporary real MongoDB replica set, Supertest and fast-check. Each of the seven financial/state properties runs at least **100 generated cases**; lifecycle tests also enumerate every state pair. Coverage includes overselling races, concurrent idempotency, wallet reconciliation, transaction rollback, exact rounding, repeated sales, private KYC, authorization and repeatable seed data. Client tests use Vitest and Testing Library for critical forms, guards and UI states.

Razorpay, Cloudinary and Resend credentials are not bundled. Their live external delivery is not part of the offline test suite. Architectural SVG images and generated PDFs are local illustrative assets.

## Layout and documentation

`client/src/` contains the UI, role pages, React Query API helpers and auth context. `server/src/` contains routes → controllers → services → models, with security middleware and Zod validators. `server/scripts/` contains the demo launcher and seed workflow. Original requirements remain unchanged in `docs/`; the newer `requirements.md` resolves conflicts with the earlier PRD/problem statement.

- [Implementation coverage](IMPLEMENTATION.md)
- [Architecture decisions](ADR.md)
- [Demo walkthrough](DEMO.md)
- [Demo walkthrough for a presentation](docs/DEMO_WALKTHROUGH.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Validation evidence](docs/VALIDATION_EVIDENCE.md)
- [Postman collection](api/ESTORA.postman_collection.json)
- [Prompt log](PROMPTS.md)

## Deployment

Use Render for the Express API and Vercel for the Vite SPA. Included `render.yaml` defines a Render Blueprint for the API, while `client/vercel.json` configures SPA fallback on Vercel. The required setup, environment-variable checklist, failed-startup recovery and post-deploy checks are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Do not enable mock payments in production or publish demo passwords.

Run `npm --prefix client run build` to produce `client/dist`. The backend startup command is `npm --prefix server start`. `/ready` returns 200 when the database is connected. Credentials and public deployment destinations must be supplied separately.

This is an academic project. No real money or securities are involved.
