# Implementation prompt log

The original request was: **“read all the docs and implement the project.”**

This log records the actual implementation directions used in this session, without inventing a team commit history or earlier prompts.

1. Read the six supplied documents, inspect the empty workspace, and implement the project with the documented MERN stack.
2. Frontend implementation brief: `frontend-brief.md`, covering every role/route, the navy/emerald/gold design, responsive states and the API contract.
3. Frontend implementation assignment: read the design skill and all six docs; implement working API-connected pages with critical tests; own `client/` only.
4. Integration clarification: use admin `propertiesByStatus` and `fundsRaisedOverTime` chart series; add broker KPIs, funding timeline, profile password change, own withdrawals and saved wizard step.
5. Backend implementation direction: all stored money is integer paise; only ledger posting changes wallet counters; investments/refunds/payouts use real replica-set transactions.
6. Seed clarification: cover eight property statuses and seven investors so all four KYC states appear; create financial history through the same services and reconcile every wallet.
7. Verification direction: use Supertest and fast-check against real MongoDB; retain at least 100 runs per financial/state property, including overselling and concurrent retry scenarios.
8. Independent design evaluation assignment: inspect desktop/mobile, accessibility, financial clarity and role coverage against the brief; report a verdict and priority fixes without editing implementation.
9. Evaluation feedback: make the hidden mobile sidebar inaccessible to keyboard/assistive tech; distinguish exited positions in chart legends; improve small financial metadata.
10. Integration feedback: correct the authenticated marketplace's default label to reflect all published properties; preserve the public LIVE/FUNDED filter.
11. Final browser feedback: add the three distinct seeded gallery assets, resolve frontend assets separately from API media, show a download fallback for PDF viewers, correct singular unit wording and keep the API URL default in configuration.
12. Final verification: add ownership-cap race, expired-token, nested-query and refund-rollback checks; prepare the first-run MongoDB binary before Jest's setup timeout.
13. Subsequent user request: add Back on every page except landing and homepages; implement shared layout navigation, preserve wizard step controls, verify history/fallback and desktop/mobile presentation.
