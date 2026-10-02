# Architecture decisions

## ADR-001: Integer paise

**Context:** Ownership math must account for every paise. Floating-point money introduces rounding error.

**Decision:** Store only safe integer paise. Use BigInt intermediate products/division and integer basis points for configurable rates.

**Consequences:** APIs accept paise; the UI formats rupees. Rates support two decimal places. Approximate appreciation is a display projection, never a ledger posting.

## ADR-002: Append-only ledger with atomic wallet counter

**Context:** Balance reads should be fast without losing an auditable financial history.

**Decision:** Financial services use `ledger.post()` to atomically update the User wallet counter and append a Transaction within one session. Model middleware rejects ledger edits/deletes.

**Consequences:** Balance is O(1); reconciliation recomputes credits minus debits. An explicit demo seed reset uses raw collection deletion as the sole administrative exception.

## ADR-003: MongoDB transactions

**Context:** Reserving units, debiting wallets and funding commissions must never partially succeed.

**Decision:** Use MongoDB replica-set transactions for investments, refunds, sales, withdrawals and related event notifications. Use the driver retry helper through Mongoose and perform operations sequentially inside sessions.

**Consequences:** Atlas/local replica set is required. The startup check refuses a standalone database. Offline tests and demos launch a real replica set with mongodb-memory-server.

## ADR-004: One-day JWT access sessions

**Context:** Refresh rotation and server logout blocklists are explicitly out of scope.

**Decision:** JWT access tokens use HS256 and one-day default expiry. The React client stores/clears the token; the API reloads the user's role/activity on every request.

**Consequences:** Deactivation takes effect immediately. Logout clears the client session; existing tokens expire naturally. Password reset uses a separate one-use hashed token.

## ADR-005: TanStack Query server state

**Context:** Properties, wallet balances and dashboards need caching and refresh after mutations.

**Decision:** React Query owns server state; React Context owns auth; React Hook Form owns forms.

**Consequences:** Shared API hooks handle loading/errors/retry. Financial mutations invalidate related queries. No additional Redux state store is required.

## ADR-006: Zod validation on both sides

**Context:** Client validation improves usability while server validation enforces correctness.

**Decision:** Validate HTTP bodies with Zod and mirror constraints in client form schemas. Parse query/pagination fields and reject nested query objects.

**Consequences:** API errors contain field details. A separate partial-draft endpoint resolves the specification's conflict between required creation fields and saving the wizard's first step.

## ADR-007: Conditional unit reservation

**Context:** Two investors can request the last units concurrently.

**Decision:** Reserve units via `findOneAndUpdate` conditioned on LIVE status and sufficient remaining units, within the investment transaction. Check existing investor units and live ownership settings in that session.

**Consequences:** Concurrent changes conflict on the property document and retry against current state. No distributed lock or independent holdings counter is needed.

## ADR-008: Exact payouts and deterministic remainder

**Context:** Floor rounding may leave paise undistributed, and investors can hold multiple lots.

**Decision:** Aggregate units per investor, floor each pro-rata payout, then allocate remainder to the largest holder with earliest investment timestamp as tie-break. Persist both investor payout and per-lot amounts.

**Consequences:** Payout sums exactly equal distributable proceeds. A unique property payout index and transactional status change prevent duplicate sales. Zero-valued shares remain in payout records without zero-money ledger entries.

## ADR-009: Access-controlled media and explicit demo integrations

**Context:** KYC/draft media requires privacy; local reviewers should run the project without cloud accounts.

**Decision:** Store media in authenticated Cloudinary storage for production, or MongoDB for the local demo. Deliver through an authorized API route. Store gateway orders with owner and amount. Enable mock payments only outside production.

**Consequences:** Private files require authentication. Public property media becomes readable with published listings. External gateway, media and email delivery need user-configured test credentials.
