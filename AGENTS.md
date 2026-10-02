# Working on ESTORA

Read `docs/requirements.md`, `docs/design.md` and `IMPLEMENTATION.md` before changing behavior. The final requirements take precedence over conflicting examples in the earlier PRD/problem statement. Keep the original specification documents intact.

- `client/`: React 18 + Vite; API helpers and Query hooks in `src/api.js`, auth context, reusable `components/ui.jsx`, role page modules and React Router guards.
- `server/`: Express ESM. Routes declare authentication → roles → ownership → Zod validation → controller. Controllers adapt HTTP only; business logic belongs in services. Mongoose schemas/indexes are defined together in `src/models/index.js`.
- All stored money is safe integer paise. Use BigInt for intermediate multiplication/division; basis points for rates. Approximate appreciation is for projections only.
- `ledger.service.post()` is the sole wallet mutation entry point. Its conditional debit/update and transaction insert use the same MongoDB session. Financial transactions contain sequential database operations, never `Promise.all` inside a session.
- `investment.service` reserves units with an atomic condition; the property write serializes concurrent purchases and cap checks. Preserve the unique idempotency key and original investment on retry. Never accept a client-computed amount.
- Payouts aggregate lots by investor, allocate remainder to the largest holder (earliest investment breaks ties), and distribute the aggregate payout over individual lots without losing paise.
- Account roles/activity are read from the database on each request. Private KYC and draft media must never be public. Validate MIME and content signatures as well as size.
- Production integrations use environment variables. Demo mode uses a real disposable replica set and labelled mock payments. Seed reset is an explicit destructive administrative operation; only use `ALLOW_SEED_RESET` on a dedicated demo database.
- Run the affected test suite, lint, and frontend build. Root commands: `npm test`, `npm run lint`, `npm run build`. The financial/state PBTs must retain at least 100 runs.
- Do not implement excluded secondary trading, rental distribution, refresh tokens or real payments without a new requirement.
