# Validation evidence

This record distinguishes completed local verification from hosting-provider verification that still needs the deployed URLs.

## Completed local verification

| Check | Evidence | Result |
|---|---|---|
| Backend correctness and platform suites | Jest against a disposable MongoDB replica set, including 100-run financial/state properties | 28 tests passed |
| Client suite | Vitest and Testing Library | 46 tests passed |
| Static analysis | Server and client ESLint with zero warnings allowed | Passed |
| Production client build | Vite build | Passed |
| API audit | Public, role-scoped, invalid-input, permission, CORS and route checks against disposable API data | 63 checks passed |
| Browser smoke flow | Mock wallet top-up, one-unit investment, portfolio update, investor/broker/admin pages and responsive layouts | Passed |
| Independent design evaluation | Desktop, tablet and mobile rendered views | Pass |

## Behavioural coverage represented by the suites

- Wallet balance reconciliation, conditional debits, exact payouts and cancellation refunds.
- Concurrent final-unit purchases and idempotent investment retries.
- Authentication, role checks, account activity checks, private KYC media and ownership enforcement.
- Property review flows, accessible notification links and participant-scoped enquiries.
- Client route guards, validation, dialogs, state reset after password recovery, pagination, media links and scrolling.

## Hosting verification still required

The Render deployment shown in the provider log did not start because `MONGO_URI` and `JWT_SECRET` were not configured. It is not evidence of an application-code failure. After adding the deployment environment variables described in [DEPLOYMENT.md](DEPLOYMENT.md), verify:

| Check | Expected result |
|---|---|
| `GET https://<render-api>/ready` | HTTP 200 after Atlas connection |
| Vercel landing, login and property deep link | Page loads with no SPA 404 |
| Browser request to `/api/v1/properties` | HTTP 200 and no CORS error |
| Cloudinary-backed dummy upload | Authenticated media is retrievable only through authorized API flow |
| Razorpay test top-up | Test payment verifies server-side and writes one ledger credit |
| Password reset with Resend configured | One-time reset link is delivered and accepted once |

No production Atlas data, real payments or real identity documents were used in the completed local checks.
