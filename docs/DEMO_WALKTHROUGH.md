# Demo walkthrough

This walkthrough uses the disposable local demonstration only. It does not require Atlas, Cloudinary or Razorpay credentials and it never sends real money.

## Start the demo

```powershell
npm run install:all
npm run demo
```

Open `http://localhost:5173`. Keep the API at `http://localhost:5000` running in the same terminal session. Restarting the demo recreates disposable data.

## Suggested 3–5 minute flow

1. **Landing and marketplace** — explain that a property is divided into units. Open a listing, inspect funding progress, documents and the illustrative return calculator.
2. **Investor journey** — sign in as `investor1@estora.dev` with password `Investor@123`. Show the portfolio, wallet ledger, mock top-up and one-unit checkout on a LIVE property. Confirm the new holding and ledger debit.
3. **Broker journey** — sign in as `broker1@estora.dev` with password `Broker@123`. Open the property list, funding analytics and the five-step listing wizard. Save a draft and reload to show that the draft persists.
4. **Admin journey** — sign in as `admin@estora.dev` with password `Admin@123`. Show the review queue, KYC queue, user controls, withdrawal queue and platform settings.
5. **Lifecycle controls** — preview a sale for a HOLDING property. Explain that the preview calculates fees and proportional payouts before any write occurs. Optionally show a LIVE listing cancellation and the resulting refunds.
6. **Messages and notifications** — create an enquiry as an investor, reply as the listing owner, then review the notification list.

All amounts, identity documents, images and payment actions in this flow are academic demo material. Do not use these accounts or passwords on a public deployment.

## Optional concurrency proof

Run:

```powershell
npm --prefix server test
```

The financial property tests run at least 100 generated cases against a temporary real MongoDB replica set. In particular, CP2 proves concurrent purchases cannot oversell the final units, and CP4 proves an idempotency retry does not create a second investment or ledger debit.
