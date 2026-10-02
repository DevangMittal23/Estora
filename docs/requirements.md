# Requirements Document

**Product:** ESTORA — Fractional Real Estate Investment Portal
**Version:** 1.0
**Date:** 2026-10-02
**Stack:** MERN (React Vite + Node.js Express + MongoDB Atlas)

---

## Introduction

ESTORA is a fractional real estate investment portal built on the MERN stack (React Vite, Node.js Express, MongoDB Atlas). It allows investors to purchase fractional units of curated properties listed by approved brokers, with each property divided into a fixed number of units priced in paise. The platform manages the full property lifecycle — from draft creation and Admin approval through investor funding, a holding period, and final sale with pro-rata payout distribution. An integrated wallet and append-only ledger handle all money movements, while a KYC workflow ensures only verified investors can commit funds.

---

## Glossary

- **Unit:** The smallest purchasable fraction of a property. Each property is divided into a fixed number of units at creation time.
- **unitPrice:** The price of one unit in paise (integer). Computed as `valuation / totalUnits`. Must divide evenly; non-integer result is a validation error.
- **Wallet:** A rupee balance held per user (investors only for top-up/withdrawal; brokers hold commission credits). Stored as `walletBalance` (integer paise) on the User document. Updated atomically inside `ledger.post()` only.
- **Ledger:** An append-only `transactions` collection. Every money movement (TOPUP, INVESTMENT, PAYOUT, REFUND, COMMISSION, WITHDRAWAL, FEE) is recorded as a ledger entry. The Ledger is the source of truth for all financial history.
- **Funding Progress:** `(unitsSold / totalUnits) × 100`, expressed as a percentage. Reflects how much of the property has been purchased.
- **Ownership %:** `(investorUnits / totalUnits) × 100` for a given investor on a given property. Computed on-the-fly by aggregating ACTIVE investment units.
- **Payout:** The pro-rata share of a property's sale proceeds credited to each investor's wallet after the Admin records a sale. Calculated as `floor(distributable × investorUnits / totalUnits)`.
- **Platform Fee:** A percentage of the sale price retained by the platform on property sale. `platformFee = floor(salePrice × platformFeePct / 100)`. Rate is stored in the Settings document (default 2%).
- **Broker Commission:** A credit to the broker's wallet when a property reaches FUNDED. `commission = floor(brokerCommissionPct × valuation / 100)`. Rate is stored in the Settings document (default 1%).
- **KYC (Know Your Customer):** An identity-verification process where investors upload dummy documents. Investing is hard-blocked server-side until `kyc.status = APPROVED`. Status values: `NOT_SUBMITTED | PENDING | APPROVED | REJECTED`.
- **Idempotency Key:** A client-generated unique string sent with every invest request. Stored on the Investment document with a unique index. A duplicate key on a second request returns the original Investment without re-debiting.

---

## Requirements

### 1. Authentication & Authorization

#### R1: User Registration
**Phase:** MVP
**Priority:** P0
**User Story:** As a visitor, I want to register as an Investor or Broker, so that I can access the platform.
**Acceptance Criteria:**
1. THE Registration_System SHALL accept `name`, `email`, `phone`, `password`, and `role` (INVESTOR or BROKER) as required fields.
2. WHEN a registration request is received, THE Registration_System SHALL validate that `password` is at least 8 characters, contains at least one digit, and contains at least one symbol, server-side using Zod.
3. WHEN a registration request is received, THE Registration_System SHALL store `passwordHash` using bcrypt (cost factor 10–12) and never store the plaintext password.
4. WHEN a valid registration request is received, THE Registration_System SHALL create a User document with `isActive = true`, `role` as submitted, and `brokerApproved = false` for BROKER role.
5. IF the submitted `email` already exists in the database, THEN THE Registration_System SHALL return HTTP 409 with error code `EMAIL_TAKEN`.
6. IF `role` is submitted as `ADMIN`, THEN THE Registration_System SHALL return HTTP 400 with error code `INVALID_ROLE`.
7. THE Registration_System SHALL NOT expose a route or UI path for registering as ADMIN; the Admin account is seeded into the database only.

#### R2: Login
**Phase:** MVP
**Priority:** P0
**User Story:** As a registered user, I want to log in with my email and password, so that I receive a JWT and am redirected to my role's dashboard.
**Acceptance Criteria:**
1. WHEN a login request with valid `email` and `password` is received, THE Auth_Service SHALL issue a JWT access token with `userId` and `role` in the payload, signed with `JWT_SECRET`, expiring in 1 day (`JWT_EXPIRES_IN=1d`).
2. WHEN a login succeeds, THE Auth_Service SHALL return the JWT and the user object `{ _id, name, role }`.
3. WHEN a login succeeds, THE React_App SHALL store the JWT and redirect the user to `/investor`, `/broker`, or `/admin` based on `role`.
4. IF the submitted `email` does not exist or the `password` does not match, THEN THE Auth_Service SHALL return HTTP 401 with error code `INVALID_CREDENTIALS`.
5. IF a login request is submitted for a user where `isActive = false`, THEN THE Auth_Service SHALL return HTTP 401 with error code `ACCOUNT_DEACTIVATED`.

#### R3: Logout
**Phase:** MVP
**Priority:** P0
**User Story:** As an authenticated user, I want to log out, so that my session is ended on the client.
**Acceptance Criteria:**
1. WHEN a logout request is received, THE React_App SHALL clear the JWT from local storage and the auth context.
2. WHEN a logout request is received, THE React_App SHALL redirect the user to `/login`.
3. THE Auth_System SHALL NOT maintain a server-side token blocklist; logout is client-only (no refresh tokens in scope).

#### R4: Current User Profile
**Phase:** MVP
**Priority:** P0
**User Story:** As an authenticated user, I want to fetch my own profile, so that the UI can display my name, role, and KYC status.
**Acceptance Criteria:**
1. WHEN `GET /auth/me` is called with a valid JWT, THE Auth_Service SHALL return the authenticated user's `{ _id, name, email, phone, role, isActive, kyc.status, brokerApproved }`.
2. IF the JWT is absent or invalid, THEN THE authenticate_Middleware SHALL return HTTP 401 with error code `UNAUTHORIZED`.
3. IF the user's `isActive` is `false` at the time of the request, THEN THE authenticate_Middleware SHALL return HTTP 401 with error code `ACCOUNT_DEACTIVATED`, even when the JWT is otherwise valid and not yet expired.

#### R5: Protected Route Enforcement
**Phase:** MVP
**Priority:** P0
**User Story:** As the platform, I need every protected API endpoint to enforce authentication and role checks server-side, so that security is never dependent on UI-only guards.
**Acceptance Criteria:**
1. THE authenticate_Middleware SHALL verify the JWT signature and expiry on every protected route before passing the request to the controller.
2. THE authenticate_Middleware SHALL re-fetch `user.isActive` from the database on every request; a deactivated user with a valid unexpired JWT SHALL receive HTTP 401 with error code `ACCOUNT_DEACTIVATED`.
3. THE requireRole_Middleware SHALL check `req.user.role` against the allowed roles for the endpoint; a mismatch SHALL return HTTP 403 with error code `FORBIDDEN`.
4. WHEN the role is BROKER, THE requireRole_Middleware SHALL additionally verify `brokerApproved === true`; an unapproved broker SHALL receive HTTP 403 with error code `BROKER_NOT_APPROVED`.
5. THE requireOwnership_Middleware SHALL verify that `property.brokerId === req.user._id` on all broker-scoped property endpoints; a mismatch SHALL return HTTP 403 with error code `FORBIDDEN`.

#### R6: Password Reset via Email
**Phase:** Phase 2
**Priority:** P1
**User Story:** As a user who has forgotten their password, I want to receive a reset link by email, so that I can set a new password.
**Acceptance Criteria:**
1. WHEN `POST /auth/forgot-password` is called with a registered `email`, THE Auth_Service SHALL generate a time-limited reset token (expires in 1 hour) and send a reset link to that email via Nodemailer or Resend.
2. IF the submitted `email` is not registered, THEN THE Auth_Service SHALL return HTTP 200 with a generic success message (no user enumeration).
3. WHEN `POST /auth/reset-password/:token` is called with a valid, unexpired token and a new password that satisfies the password policy, THE Auth_Service SHALL update the user's `passwordHash` and invalidate the token.
4. IF the token is expired or already used, THEN THE Auth_Service SHALL return HTTP 400 with error code `INVALID_OR_EXPIRED_TOKEN`.

---

### 2. Property Management

#### R7: Create Property Draft
**Phase:** MVP
**Priority:** P0
**User Story:** As a Broker or Admin, I want to create a property listing draft, so that I can provide all details before submitting for approval.
**Acceptance Criteria:**
1. WHEN `POST /properties` is called by a BROKER (approved) or ADMIN with all required fields, THE Property_Service SHALL create a Property document with `status = DRAFT`.
2. THE Property_Service SHALL require: `title`, `description`, `type` (APARTMENT | VILLA | COMMERCIAL | PLOT | WAREHOUSE), `address`, `city`, `state`, `pincode`, `areaSqft`, `valuation` (paise), `totalUnits`, `minUnits`, `maxUnitsPerInvestor`, `expectedAppreciationPct`, `rentalYieldPct`, `holdingPeriodMonths`.
3. WHEN a property creation request is received, THE Property_Service SHALL compute `unitPrice = valuation / totalUnits` and validate it is an integer paise value; IF it is not an integer, THEN THE Property_Service SHALL return HTTP 400 with error code `UNIT_PRICE_NOT_INTEGER`.
4. THE Property_Service SHALL set `brokerId` to the authenticated user's `_id` (or the Admin-specified broker when Admin creates).
5. THE Property_Service SHALL set `unitsSold = 0` and `status = DRAFT` on creation regardless of submitted values.

#### R8: Property Status Machine
**Phase:** MVP
**Priority:** P0
**User Story:** As the platform, I need the property lifecycle to follow a defined state machine, so that properties move through valid stages only.
**Acceptance Criteria:**
1. THE Property_Service SHALL enforce the following valid transitions only: `DRAFT → PENDING_APPROVAL`, `PENDING_APPROVAL → LIVE`, `PENDING_APPROVAL → REJECTED`, `REJECTED → PENDING_APPROVAL`, `LIVE → FUNDED` (system only), `LIVE → CANCELLED` (Admin only), `FUNDED → HOLDING` (Admin only), `HOLDING → SOLD` (Admin only).
2. IF a transition is requested that is not in the valid set, THEN THE Property_Service SHALL return HTTP 409 with error code `INVALID_TRANSITION`.
3. WHEN a property transitions to `LIVE`, THE Property_Service SHALL record `liveAt = now`.
4. WHEN a property transitions to `FUNDED`, THE Property_Service SHALL record `fundedAt = now`.
5. WHEN a property transitions to `SOLD`, THE Property_Service SHALL record `soldAt = now`.

#### R9: Submit Property for Approval
**Phase:** MVP
**Priority:** P0
**User Story:** As a Broker, I want to submit my draft or rejected property for Admin review, so that it can be approved and go live.
**Acceptance Criteria:**
1. WHEN `POST /properties/:id/submit` is called by the owning Broker, THE Property_Service SHALL transition the property from `DRAFT` or `REJECTED` to `PENDING_APPROVAL`.
2. IF the property has fewer than 3 images at the time of submission, THEN THE Property_Service SHALL return HTTP 400 with error code `INSUFFICIENT_IMAGES`.
3. IF the calling user is not the owner of the property, THEN THE requireOwnership_Middleware SHALL return HTTP 403 with error code `FORBIDDEN`.

#### R10: Admin Approve Property
**Phase:** MVP
**Priority:** P0
**User Story:** As an Admin, I want to approve a pending property listing, so that it becomes live on the marketplace.
**Acceptance Criteria:**
1. WHEN `POST /properties/:id/approve` is called by an ADMIN, THE Property_Service SHALL transition the property from `PENDING_APPROVAL` to `LIVE` and record `approvedBy = req.user._id`.
2. IF the property status is not `PENDING_APPROVAL`, THEN THE Property_Service SHALL return HTTP 409 with error code `INVALID_TRANSITION`.

#### R11: Admin Reject Property
**Phase:** MVP
**Priority:** P0
**User Story:** As an Admin, I want to reject a pending property listing with a reason, so that the Broker can address the issue and resubmit.
**Acceptance Criteria:**
1. WHEN `POST /properties/:id/reject` is called by an ADMIN with a non-empty `reason`, THE Property_Service SHALL transition the property from `PENDING_APPROVAL` to `REJECTED` and store `rejectionReason`.
2. IF `reason` is absent or empty, THEN THE Property_Service SHALL return HTTP 400 with error code `REJECTION_REASON_REQUIRED`.
3. WHEN a property is `REJECTED`, THE React_App SHALL display the `rejectionReason` to the owning Broker.

#### R12: Edit Property
**Phase:** MVP
**Priority:** P0
**User Story:** As a Broker or Admin, I want to edit property details, so that I can correct information before or after approval.
**Acceptance Criteria:**
1. WHEN `PATCH /properties/:id` is called and the property `status` is `DRAFT` or `REJECTED`, THE Property_Service SHALL allow updates to all fields.
2. WHEN `PATCH /properties/:id` is called and the property `status` is `LIVE` or later, THE Property_Service SHALL allow updates to `description` and `images` only.
3. IF the property has at least one ACTIVE Investment and the request attempts to change `valuation`, `totalUnits`, or `unitPrice`, THEN THE Property_Service SHALL return HTTP 403 with error code `IMMUTABLE_FIELD`.
4. IF the calling Broker is not the property owner, THEN THE requireOwnership_Middleware SHALL return HTTP 403 with error code `FORBIDDEN`.

#### R13: Cancel Live Property
**Phase:** MVP
**Priority:** P0
**User Story:** As an Admin, I want to cancel a live property and refund all investors, so that investors are made whole when a listing must be withdrawn.
**Acceptance Criteria:**
1. WHEN `POST /properties/:id/status` is called by an ADMIN with `{ status: "CANCELLED" }`, THE Property_Service SHALL only accept this transition from `LIVE` status.
2. WHEN cancellation is executed, THE Property_Service SHALL open a single MongoDB transaction: set all ACTIVE Investments for the property to `REFUNDED`, post one `REFUND / CREDIT` ledger entry per investment for the original `investment.amount`, set `property.status = CANCELLED`, set `property.unitsSold = 0`.
3. THE Property_Service SHALL NOT charge a platform fee on refunds.
4. IF the property status is already `CANCELLED`, THEN THE Property_Service SHALL return HTTP 409 with error code `ALREADY_CANCELLED`.
5. IF the property status is `FUNDED` (not `LIVE`), THEN THE Property_Service SHALL return HTTP 409 with error code `INVALID_TRANSITION`.

#### R14: Marketplace Listing
**Phase:** MVP
**Priority:** P0
**User Story:** As a visitor or authenticated user, I want to browse properties on the marketplace, so that I can discover investment opportunities.
**Acceptance Criteria:**
1. WHEN `GET /properties` is called, THE Property_Service SHALL return a paginated list of properties supporting query parameters: `page`, `limit`, `sort`, `search` (matches `title` or `city`), `city`, `type`, `minPrice` (unitPrice), `maxPrice` (unitPrice), `status`, `fundingPctMin`, `fundingPctMax`.
2. THE Property_Service SHALL default to returning only `LIVE` and `FUNDED` properties when no `status` filter is supplied and the caller is unauthenticated.
3. THE Property_Service SHALL return pagination metadata: `{ items, page, limit, total, totalPages }`.
4. THE Property_Service SHALL include `fundingPct` (computed as `unitsSold / totalUnits × 100`) in each property item in the response.

#### R15: Property Detail
**Phase:** MVP
**Priority:** P0
**User Story:** As a visitor, I want to view a property's full detail page, so that I can assess the investment before deciding to invest.
**Acceptance Criteria:**
1. WHEN `GET /properties/:id` is called, THE Property_Service SHALL return all property fields plus computed fields: `fundingPct`, `investorCount` (count of distinct investors with ACTIVE investments), `unitPrice`.
2. THE React_App SHALL render: image gallery, key metrics card, funding progress bar, investor count, documents list, return calculator (projectedValue = amount × (1 + appreciationPct/100)^years), and an Invest CTA.
3. WHEN the Invest CTA is clicked by an unauthenticated user, THE React_App SHALL redirect to `/login`.
4. IF the property `status` is not `LIVE`, THE React_App SHALL hide the Invest CTA and display the current status prominently.

---

### 3. Investment Engine

#### R16: Invest in Property
**Phase:** MVP
**Priority:** P0
**User Story:** As a KYC-approved Investor, I want to purchase units of a live property, so that I hold a fractional ownership stake.
**Acceptance Criteria:**
1. WHEN `POST /investments` is called, THE Investment_Service SHALL validate all guard conditions in sequence: `property.status === LIVE`, `investor.kyc.status === APPROVED`, `investor.isActive === true`, `units >= property.minUnits`, `units <= (property.totalUnits - property.unitsSold)`, `(existingActiveUnits + units) <= property.maxUnitsPerInvestor`, `investor.walletBalance >= amount`.
2. THE Investment_Service SHALL compute `amount = units × unitPrice` server-side; any `amount` field sent by the client SHALL be ignored.
3. WHEN all guard conditions pass, THE Investment_Service SHALL open a single MongoDB transaction: atomically increment `unitsSold` using `findOneAndUpdate({ _id, status: 'LIVE', unitsSold: { $lte: totalUnits - units } }, { $inc: { unitsSold: units } })`; create an Investment document; post an `INVESTMENT / DEBIT` ledger entry.
4. IF `findOneAndUpdate` returns `null` (units taken by a concurrent request), THEN THE Investment_Service SHALL return HTTP 409 with error code `INSUFFICIENT_UNITS`.
5. IF `investor.kyc.status` is not `APPROVED`, THEN THE Investment_Service SHALL return HTTP 403 with error code `KYC_NOT_APPROVED`.
6. IF `investor.walletBalance < amount` (enforced by the atomic debit guard), THEN THE Investment_Service SHALL return HTTP 400 with error code `INSUFFICIENT_BALANCE`.
7. IF `(existingActiveUnits + units) > property.maxUnitsPerInvestor`, THEN THE Investment_Service SHALL return HTTP 400 with error code `MAX_UNITS_EXCEEDED`.
8. IF the request includes an `idempotencyKey` that matches an existing Investment's key for the same investor, THEN THE Investment_Service SHALL return HTTP 200 with the original Investment document without creating a new one or debiting the wallet.
9. THE Investment_Service SHALL store the `idempotencyKey` on the Investment document; a unique index on `idempotencyKey` SHALL enforce deduplication at the database level.

#### R17: Auto-Transition to FUNDED
**Phase:** MVP
**Priority:** P0
**User Story:** As the platform, I need a property to automatically transition to FUNDED when all units are sold, so that the property lifecycle advances without manual intervention.
**Acceptance Criteria:**
1. WHEN an investment causes `unitsSold === totalUnits`, THE Investment_Service SHALL, within the same MongoDB transaction, update `property.status = FUNDED` and `property.fundedAt = now`.
2. WHEN a property transitions to `FUNDED`, THE Investment_Service SHALL post a `COMMISSION / CREDIT` ledger entry for the broker's `userId` with `amount = floor(brokerCommissionPct × valuation / 100)`, where `brokerCommissionPct` is read from the Settings document.
3. THE Investment_Service SHALL read `brokerCommissionPct` from the singleton Settings document at the time of the FUNDED transition.

#### R18: Get My Investments
**Phase:** MVP
**Priority:** P0
**User Story:** As an Investor, I want to view all my investments, so that I can track the properties I own stakes in.
**Acceptance Criteria:**
1. WHEN `GET /investments/me` is called by an authenticated Investor, THE Investment_Service SHALL return all Investment documents where `investorId === req.user._id`, paginated and sorted by `createdAt` descending.
2. THE Investment_Service SHALL include computed fields per investment: `ownershipPct = (units / totalUnits) × 100`, `fundingPct` of the related property, and property `title`, `city`, `status`.

---

### 4. Wallet & Ledger

#### R19: Wallet Balance Storage
**Phase:** MVP
**Priority:** P0
**User Story:** As the platform, I need the wallet balance to be stored as an atomic counter on the User document, so that balance reads are O(1) and always consistent.
**Acceptance Criteria:**
1. THE User_Model SHALL store `walletBalance` as an integer paise field, defaulting to `0`.
2. THE Ledger_Service SHALL be the ONLY code path that modifies `walletBalance`; no controller or service SHALL write to `walletBalance` directly.
3. WHEN a CREDIT ledger entry is posted, THE Ledger_Service SHALL increment `walletBalance` using `$inc` inside the same MongoDB transaction as the Transaction document insert.
4. WHEN a DEBIT ledger entry is posted, THE Ledger_Service SHALL use `findOneAndUpdate({ _id: userId, walletBalance: { $gte: amount } }, { $inc: { walletBalance: -amount } })` and return HTTP 400 with error code `INSUFFICIENT_BALANCE` if the document is not found.
5. THE `balanceAfter` field on each Transaction document SHALL reflect the `walletBalance` counter value after the update.
6. THE Seed_Script SHALL include a reconciliation assertion that `user.walletBalance === sum(CREDIT transactions) − sum(DEBIT transactions)` for every user; a mismatch SHALL cause the seed to fail.

#### R20: Wallet Top-Up via Razorpay
**Phase:** MVP
**Priority:** P0
**User Story:** As an Investor, I want to add money to my wallet using Razorpay test mode, so that I have funds available to invest.
**Acceptance Criteria:**
1. WHEN `POST /wallet/topup/order` is called by an authenticated Investor, THE Wallet_Service SHALL create a Razorpay order and return `{ orderId, amount, currency }`.
2. WHEN `POST /wallet/topup/verify` is called with `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`, THE Wallet_Service SHALL verify the Razorpay HMAC signature using `RAZORPAY_KEY_SECRET`.
3. WHEN the signature is valid, THE Wallet_Service SHALL post a `TOPUP / CREDIT` ledger entry and return the updated `walletBalance`.
4. THE Ledger_Service SHALL enforce uniqueness of `gatewayPaymentId` with a unique sparse index; IF a duplicate `gatewayPaymentId` is received, THEN THE Wallet_Service SHALL return HTTP 409 with error code `DUPLICATE_TOPUP`.
5. IF the Razorpay signature verification fails, THEN THE Wallet_Service SHALL return HTTP 400 with error code `INVALID_PAYMENT_SIGNATURE`.
6. THE top-up flow SHALL NOT require `kyc.status = APPROVED`; KYC does not gate wallet top-ups.

#### R21: Get Wallet Balance
**Phase:** MVP
**Priority:** P0
**User Story:** As an Investor, I want to view my current wallet balance and recent transactions, so that I know how much I can invest.
**Acceptance Criteria:**
1. WHEN `GET /wallet` is called by an authenticated Investor, THE Wallet_Service SHALL return `{ walletBalance, recentTransactions }` where `walletBalance` is read from `user.walletBalance` (the counter field, not a recomputed aggregate).
2. THE Wallet_Service SHALL return the 10 most recent transactions sorted by `createdAt` descending in `recentTransactions`.

#### R22: Transaction History
**Phase:** MVP
**Priority:** P0
**User Story:** As an authenticated user, I want to view my full paginated transaction history, so that I can audit all money movements.
**Acceptance Criteria:**
1. WHEN `GET /transactions` is called by an authenticated user, THE Ledger_Service SHALL return that user's Transaction documents paginated, supporting `page`, `limit`, `type` filter, `startDate`, and `endDate` query parameters.
2. THE Ledger_Service SHALL sort results by `createdAt` descending by default.
3. WHEN called by an ADMIN without a `userId` filter, THE Ledger_Service SHALL return all users' transactions.
4. THE Broker_Dashboard SHALL display commission earned by filtering `GET /transactions` for `type = COMMISSION` for the authenticated broker's userId.

#### R23: Withdrawal Request
**Phase:** Phase 2
**Priority:** P1
**User Story:** As an Investor, I want to request a withdrawal from my wallet, so that I can move funds to my bank account.
**Acceptance Criteria:**
1. WHEN `POST /wallet/withdraw` is called by an authenticated Investor with `{ amount, bankDetails }`, THE Wallet_Service SHALL create a Withdrawal document with `status = PENDING`.
2. THE Wallet_Service SHALL validate `amount > 0` and `amount <= user.walletBalance`; IF either fails, THE Wallet_Service SHALL return HTTP 400 with error code `INVALID_WITHDRAWAL_AMOUNT`.
3. WHEN an Admin approves a withdrawal via `PATCH /admin/withdrawals/:id { status: "APPROVED" }`, THE Wallet_Service SHALL post a `WITHDRAWAL / DEBIT` ledger entry and update the Withdrawal document to `status = APPROVED`.
4. WHEN an Admin rejects a withdrawal, THE Wallet_Service SHALL update the Withdrawal document to `status = REJECTED` with no ledger entry.
5. IF a withdrawal is in `PENDING` state and the investor submits another withdrawal, THE Wallet_Service SHALL not block it (multiple pending requests are allowed).

---

### 5. Portfolio & Payout

#### R24: Portfolio Summary
**Phase:** MVP
**Priority:** P0
**User Story:** As an Investor, I want to view a summary of my investment portfolio, so that I can track my total invested amount, returns, and allocation.
**Acceptance Criteria:**
1. WHEN `GET /portfolio/summary` is called by an authenticated Investor, THE Portfolio_Service SHALL return: `totalInvested` (sum of `amount` for all ACTIVE investments), `currentEstValue` (sum of `amount × (1 + appreciationPct/100)^(holdingPeriodMonths/12)` per property), `totalPayouts` (sum of `payoutAmount` for EXITED investments), `overallROI` (computed as `((totalPayouts - totalInvested) / totalInvested) × 100` where totalInvested includes only exited positions for the ROI denominator), `allocations` (array of `{ propertyId, title, units, ownershipPct, investedAmount, estimatedValue, status, payoutReceived }`).
2. THE Portfolio_Service SHALL aggregate ACTIVE Investment documents for the calling investor to compute `ownershipPct` per property.
3. THE React_App SHALL render an allocation donut chart using the `allocations` array from the portfolio summary response.

#### R25: Payout Preview
**Phase:** MVP
**Priority:** P0
**User Story:** As an Admin, I want to preview the payout distribution before executing a sale, so that I can verify amounts before committing.
**Acceptance Criteria:**
1. WHEN `GET /properties/:id/payout-preview?salePrice=N` is called by an ADMIN, THE Payout_Service SHALL compute and return `{ salePrice, platformFee, distributable, items: [{ investorId, investorName, units, ownershipPct, payoutAmount }] }` with NO writes to the database.
2. THE Payout_Service SHALL compute: `platformFee = floor(salePrice × platformFeePct / 100)`, `distributable = salePrice - platformFee`, `payoutAmount(investor) = floor(distributable × investorUnits / totalUnits)`.
3. THE Payout_Service SHALL assign the rounding remainder (`distributable - sum(all payoutAmounts)`) to the investor with the largest unit count; in case of a tie, the earliest investor by `Investment.createdAt` receives the remainder.
4. THE Payout_Service SHALL return a `check` field: `sum(items[].payoutAmount) === distributable`.

#### R26: Execute Payout (Record Sale)
**Phase:** MVP
**Priority:** P0
**User Story:** As an Admin, I want to execute a sale and distribute proceeds to all investors, so that investors receive their returns and the property is marked as SOLD.
**Acceptance Criteria:**
1. WHEN `POST /properties/:id/sell` is called by an ADMIN with `{ salePrice }`, THE Payout_Service SHALL only accept execution when `property.status === HOLDING`.
2. WHEN execution begins, THE Payout_Service SHALL open a single MongoDB transaction performing all of: compute distribution (same logic as preview), post one `PAYOUT / CREDIT` ledger entry per investor, post one `FEE / CREDIT` ledger entry for the platform (userId = Admin or platform account), update each Investment to `status = EXITED` and `payoutAmount = computed amount`, update `property.status = SOLD` and `property.salePrice = salePrice` and `property.soldAt = now`, create one Payout document recording `{ propertyId, salePrice, platformFee, distributable, items, executedBy, executedAt }`.
3. THE Payout_Service SHALL assert `sum(items[].payoutAmount) === distributable` before committing; IF the assertion fails, THE Payout_Service SHALL abort the transaction and return HTTP 500 with error code `PAYOUT_ASSERTION_FAILED`.
4. IF a Payout document already exists for the property, THEN THE Payout_Service SHALL return HTTP 409 with error code `ALREADY_SOLD` without executing any writes.
5. IF `property.status !== HOLDING`, THEN THE Payout_Service SHALL return HTTP 409 with error code `INVALID_TRANSITION`.

#### R27: FUNDED to HOLDING Transition
**Phase:** MVP
**Priority:** P0
**User Story:** As an Admin, I want to move a fully funded property to the holding period, so that the lifecycle can continue toward sale.
**Acceptance Criteria:**
1. WHEN `POST /properties/:id/status` is called by an ADMIN with `{ status: "HOLDING" }`, THE Property_Service SHALL transition the property from `FUNDED` to `HOLDING`.
2. THE Property_Service SHALL produce no financial side effects (no ledger entries) on this transition.
3. IF the property `status` is not `FUNDED`, THEN THE Property_Service SHALL return HTTP 409 with error code `INVALID_TRANSITION`.

---

### 6. KYC

#### R28: Investor KYC Submission
**Phase:** MVP
**Priority:** P1
**User Story:** As an Investor, I want to upload my KYC documents, so that I can become eligible to invest.
**Acceptance Criteria:**
1. WHEN `POST /kyc` is called by an authenticated Investor with document files, THE KYC_Service SHALL upload the files to Cloudinary and update `user.kyc = { status: PENDING, docs: [urls] }`.
2. THE KYC_Service SHALL accept a maximum of 2 files per submission, each with MIME type `image/jpeg`, `image/png`, `image/webp`, or `application/pdf`, and a maximum size of 5 MB per file.
3. IF a file exceeds the size limit or has an unsupported MIME type, THEN THE KYC_Service SHALL return HTTP 400 with error code `INVALID_FILE`.
4. IF the investor's `kyc.status` is already `APPROVED`, THEN THE KYC_Service SHALL return HTTP 409 with error code `KYC_ALREADY_APPROVED`.
5. WHILE `kyc.status` is `NOT_SUBMITTED` or `PENDING` or `REJECTED`, THE Invest_Endpoint SHALL reject investment attempts with HTTP 403 and error code `KYC_NOT_APPROVED`.
6. THE KYC_System SHALL NOT apply to BROKER users; the `kyc` field is irrelevant for BROKER accounts.

#### R29: Admin KYC Review
**Phase:** MVP
**Priority:** P1
**User Story:** As an Admin, I want to review pending KYC submissions and approve or reject them, so that eligible investors can start investing.
**Acceptance Criteria:**
1. WHEN `PATCH /admin/kyc/:userId` is called by an ADMIN with `{ status: "APPROVED" }`, THE KYC_Service SHALL set `user.kyc.status = APPROVED` and clear `user.kyc.reason`.
2. WHEN `PATCH /admin/kyc/:userId` is called by an ADMIN with `{ status: "REJECTED", reason }`, THE KYC_Service SHALL set `user.kyc.status = REJECTED` and store `user.kyc.reason`.
3. IF `reason` is absent or empty when rejecting, THEN THE KYC_Service SHALL return HTTP 400 with error code `REJECTION_REASON_REQUIRED`.
4. THE React_App SHALL display the KYC queue to the Admin showing pending submissions with document preview links.
5. WHEN the investor's KYC is approved or rejected, THE Notification_System (Phase 2) SHALL create an in-app notification for the investor.

---

### 7. Admin

#### R30: Admin Dashboard KPIs
**Phase:** MVP
**Priority:** P0
**User Story:** As an Admin, I want to view platform-wide KPIs on my dashboard, so that I can monitor the health of the platform at a glance.
**Acceptance Criteria:**
1. WHEN `GET /admin/stats` is called by an ADMIN, THE Admin_Service SHALL return: `totalAUM` (sum of `valuation` for all LIVE + FUNDED + HOLDING properties), `usersByRole` (count of users grouped by INVESTOR/BROKER/ADMIN), `livePropertiesCount`, `fundsRaisedThisMonth` (sum of INVESTMENT debit amounts in the current calendar month), `platformFeesEarned` (sum of all FEE credit amounts in the ledger).
2. THE React_App SHALL render the KPIs as cards and include at minimum: a properties-by-status chart and a funds-raised line chart.
3. THE React_App SHALL display a pending approval queue on the admin dashboard showing counts for: properties in `PENDING_APPROVAL`, KYC submissions in `PENDING`, brokers with `brokerApproved = false`.

#### R31: Admin Property Management
**Phase:** MVP
**Priority:** P0
**User Story:** As an Admin, I want to view and manage all properties on the platform, so that I can take approval and lifecycle actions.
**Acceptance Criteria:**
1. WHEN `GET /properties` is called by an ADMIN, THE Property_Service SHALL return all properties regardless of status, supporting filters for `status`, `brokerId`, and `city`.
2. THE React_App SHALL display an all-properties table with approve/reject modal (with mandatory reason field for rejection), and status-change controls for FUNDED→HOLDING and LIVE→CANCELLED.
3. THE React_App SHALL link each property row to the property detail and, for HOLDING properties, to the Record Sale page.

#### R32: Admin User Management
**Phase:** MVP
**Priority:** P0
**User Story:** As an Admin, I want to manage user accounts, so that I can activate/deactivate users and approve brokers.
**Acceptance Criteria:**
1. WHEN `GET /admin/users` is called by an ADMIN, THE Admin_Service SHALL return all users supporting `search` (name or email), `role` filter, and pagination.
2. WHEN `PATCH /admin/users/:id` is called by an ADMIN with `{ isActive: false }`, THE Admin_Service SHALL set `user.isActive = false`; subsequent requests from that user with a valid JWT SHALL receive HTTP 401 with error code `ACCOUNT_DEACTIVATED`.
3. WHEN `PATCH /admin/users/:id` is called by an ADMIN with `{ brokerApproved: true }`, THE Admin_Service SHALL set `broker.brokerApproved = true`; the broker may then create and manage property listings.
4. THE Admin_Service SHALL prevent an Admin from deactivating their own account.

#### R33: Admin Platform Settings
**Phase:** MVP
**Priority:** P0
**User Story:** As an Admin, I want to configure platform-wide fee and commission rates, so that the system uses up-to-date values for all calculations.
**Acceptance Criteria:**
1. WHEN `GET /admin/settings` is called by an ADMIN, THE Admin_Service SHALL return the singleton Settings document containing `platformFeePct`, `brokerCommissionPct`, and `maxOwnershipPct`.
2. WHEN `PATCH /admin/settings` is called by an ADMIN, THE Admin_Service SHALL update the Settings document with the provided values.
3. THE Settings_Document SHALL default to `platformFeePct = 2`, `brokerCommissionPct = 1`, `maxOwnershipPct = 49` when no overrides have been set.
4. THE Investment_Service and Payout_Service SHALL read fee and commission rates from the Settings document at the time of each transaction, not from a cached or hard-coded value.

#### R34: Admin Withdrawal Queue
**Phase:** Phase 2
**Priority:** P1
**User Story:** As an Admin, I want to view and process investor withdrawal requests, so that approved investors can receive their funds.
**Acceptance Criteria:**
1. WHEN `GET /admin/withdrawals` is called by an ADMIN, THE Admin_Service SHALL return all Withdrawal documents with `status = PENDING`, paginated and sorted by `createdAt` ascending.
2. WHEN an Admin approves a withdrawal, the behavior is defined by R23 acceptance criteria 3.
3. WHEN an Admin rejects a withdrawal, the behavior is defined by R23 acceptance criteria 4.

---

### 8. Broker

#### R35: Broker Dashboard
**Phase:** MVP
**Priority:** P0
**User Story:** As a Broker, I want to view my property portfolio KPIs on my dashboard, so that I can track my listings and earnings.
**Acceptance Criteria:**
1. WHEN `GET /broker/properties` is called by an authenticated approved BROKER, THE Property_Service SHALL return only properties where `brokerId === req.user._id` with stats: `fundingPct`, `investorCount`, `status`.
2. THE React_App SHALL display KPI cards for: total properties listed, properties live, properties funded, total raised (sum of `unitsSold × unitPrice` across own properties), commission earned (sum of COMMISSION ledger entries for the broker).
3. THE Broker_Service SHALL compute commission earned by querying transactions of `type = COMMISSION` and `userId = req.user._id`.

#### R36: Multi-Step Create Listing Wizard
**Phase:** MVP
**Priority:** P0
**User Story:** As a Broker, I want to create a property listing through a guided multi-step form, so that I can provide all required information in a structured way.
**Acceptance Criteria:**
1. THE React_App SHALL implement a multi-step wizard with steps: Basics (title, description, type), Location (address, city, state, pincode, geo), Financials (valuation, totalUnits, minUnits, maxUnitsPerInvestor, expectedAppreciationPct, rentalYieldPct, holdingPeriodMonths), Media & Docs (images, documents), Review & Submit.
2. WHEN a step is completed and the user advances, THE React_App SHALL persist the current step's data to the server by calling `PATCH /properties/:id` (creating a DRAFT on step 1 if not yet created).
3. THE React_App SHALL allow the user to navigate back to previous steps without losing data.
4. THE React_App SHALL display a live preview of `unitPrice = valuation / totalUnits` in the Financials step; IF it is not an integer paise value, THE React_App SHALL display a validation error inline.
5. IF the user closes the browser and returns, THE React_App SHALL restore the wizard to the last saved step using the DRAFT property fetched from `GET /broker/properties`.

#### R37: Property Analytics
**Phase:** MVP
**Priority:** P0
**User Story:** As a Broker, I want to view analytics for my own properties, so that I can monitor investment progress and investor engagement.
**Acceptance Criteria:**
1. WHEN `GET /properties/:id/investors` is called by the owning Broker or an ADMIN, THE Property_Service SHALL return a list of investors with `{ investorId, name, units, ownershipPct, investedAmount, status }`.
2. IF the calling Broker does not own the property, THE requireOwnership_Middleware SHALL return HTTP 403 with error code `FORBIDDEN`.
3. THE React_App SHALL display a funding progress bar, investor list table, and funding timeline for the broker's own property detail page.

---

### 9. Notifications

#### R38: In-App Notifications
**Phase:** Phase 2
**Priority:** P1
**User Story:** As a user, I want to receive in-app notifications for key platform events, so that I stay informed without leaving the platform.
**Acceptance Criteria:**
1. THE Notification_Service SHALL create a Notification document for the target user when any of the following events occur: property approved (→ broker), property rejected with reason (→ broker), property FUNDED (→ broker and all investors of that property), payout credited (→ each investor), KYC approved (→ investor), KYC rejected (→ investor), withdrawal approved (→ investor), withdrawal rejected (→ investor).
2. WHEN `GET /notifications` is called by an authenticated user, THE Notification_Service SHALL return that user's notifications sorted by `createdAt` descending, paginated, with `read` status per item.
3. WHEN `PATCH /notifications/:id/read` is called, THE Notification_Service SHALL set `notification.read = true` for the specified notification.
4. THE React_App TopBar SHALL display an unread notification count badge computed as the count of notifications where `read = false` for the authenticated user.
5. THE Notification_System SHALL NOT send email notifications; in-app only.

---

### 10. Enquiries

#### R39: Investor Enquiry
**Phase:** Phase 2
**Priority:** P1
**User Story:** As an Investor, I want to ask questions about a property, so that I can get information from the Broker before investing.
**Acceptance Criteria:**
1. WHEN `POST /enquiries` is called by an authenticated Investor with `{ propertyId, message }`, THE Enquiry_Service SHALL create an Enquiry document with `status = OPEN` and an initial message entry `{ from: investorId, text: message, at: now }`.
2. WHEN `GET /enquiries` is called by an authenticated Investor, THE Enquiry_Service SHALL return all enquiries where `investorId === req.user._id`.
3. WHEN `GET /enquiries` is called by an authenticated approved Broker, THE Enquiry_Service SHALL return all enquiries for properties where `brokerId === req.user._id`.
4. WHEN `POST /enquiries/:id/reply` is called by the Broker who owns the related property or by the Investor who created the enquiry, THE Enquiry_Service SHALL append `{ from: req.user._id, text, at: now }` to the `messages` array.
5. IF the caller of a reply is neither the enquiry's Investor nor the owning Broker, THEN THE Enquiry_Service SHALL return HTTP 403 with error code `FORBIDDEN`.

---

### 11. Non-Functional Requirements

#### R40: Responsiveness
**Phase:** MVP
**Priority:** P0
**User Story:** As a user on any device, I want the UI to render correctly at all screen sizes, so that I can use the platform on mobile, tablet, and desktop.
**Acceptance Criteria:**
1. THE React_App SHALL render without horizontal scroll on viewports from 360px wide.
2. THE React_App SHALL implement responsive breakpoints for mobile (≤640px), tablet (641–1024px), and desktop (>1024px).

#### R41: UI States
**Phase:** MVP
**Priority:** P0
**User Story:** As a user, I want clear loading, empty, and error states on every screen, so that I always know the status of the application.
**Acceptance Criteria:**
1. THE React_App SHALL display a loading skeleton or spinner while any API call is in flight on a data-driven screen.
2. THE React_App SHALL display an empty-state illustration and message when a data list returns zero items.
3. THE React_App SHALL display an error message and a retry action when an API call fails.
4. THE React_App SHALL display a success toast notification after successful create, update, or financial operations.

#### R42: Configuration & Secrets
**Phase:** MVP
**Priority:** P0
**User Story:** As a developer, I want all secrets and environment-specific values to be stored in environment variables, so that the codebase is safe to commit publicly.
**Acceptance Criteria:**
1. THE Server_App SHALL load all configuration values (MongoDB URI, JWT secret, Cloudinary credentials, Razorpay keys, platform defaults) from environment variables using a validated config module.
2. THE repository SHALL include a `.env.example` file listing every required variable with placeholder values and comments.
3. THE repository SHALL NOT contain any `.env` file with real secrets.
4. THE React_App SHALL reference the API base URL via `VITE_API_URL` environment variable only; no hard-coded URLs SHALL appear in source code.

#### R43: Code Quality
**Phase:** MVP
**Priority:** P0
**User Story:** As a developer, I want consistent code style enforced by tooling, so that the codebase is maintainable.
**Acceptance Criteria:**
1. THE repository SHALL include ESLint and Prettier configurations for both `client/` and `server/` packages.
2. THE server code SHALL follow the layered architecture: Routes → Controllers → Services → Models with no business logic in controllers.

#### R44: Seed Data
**Phase:** MVP
**Priority:** P0
**User Story:** As a developer or evaluator, I want a realistic seed dataset loaded automatically, so that the platform can be demonstrated without manual data entry.
**Acceptance Criteria:**
1. THE Seed_Script SHALL create: at least 8 properties (2 LIVE partly funded, 1 FUNDED, 1 HOLDING, 1 SOLD, 1 PENDING_APPROVAL, 1 REJECTED, 1 DRAFT), at least 5 investors (majority with `kyc.status = APPROVED`, 1 PENDING, 1 REJECTED, 1 NOT_SUBMITTED), at least 2 brokers (1 with `brokerApproved = true`, 1 with `brokerApproved = false`), and 1 admin.
2. THE Seed_Script SHALL create realistic Transaction ledger entries for all funded, held, and sold properties including TOPUP, INVESTMENT, PAYOUT, COMMISSION, and FEE entries.
3. THE Seed_Script SHALL run the wallet reconciliation assertion from R19 AC6 and abort with an error if it fails.
4. THE README SHALL list one test credential per role: admin, broker, and investor with email and password.

---

## Correctness Properties

The following invariants MUST hold at all times and SHOULD be verified with property-based tests.

### CP1: Wallet Balance Invariant
For every user `u`, the value of `u.walletBalance` MUST equal `sum(CREDIT transaction amounts for u) − sum(DEBIT transaction amounts for u)` at all times.
- **Type:** Invariant / Round-Trip
- **Scope:** All ledger mutation operations (TOPUP, INVESTMENT, PAYOUT, REFUND, COMMISSION, WITHDRAWAL, FEE)
- **Test approach:** After any sequence of ledger operations on a user, recompute balance from the transactions collection and assert it equals `walletBalance`. Property test: generate random sequences of valid topups and investments, verify invariant holds after each step.

### CP2: No Overselling
For every property `p`, `sum(Investment.units WHERE propertyId = p._id AND status = ACTIVE)` MUST be `≤ p.totalUnits` at all times.
- **Type:** Invariant
- **Scope:** `Investment_Service.invest()`
- **Test approach:** Property test with concurrent invest calls (two investors buying the last N units simultaneously); assert exactly one succeeds and the sum of units never exceeds `totalUnits`.

### CP3: Payout Completeness
For every executed payout, `sum(Payout.items[].payoutAmount)` MUST equal `distributable = salePrice − platformFee` exactly.
- **Type:** Invariant
- **Scope:** `Payout_Service.executePayout()` and `previewPayout()`
- **Test approach:** Property test with randomised `salePrice`, `platformFeePct`, and investor unit distributions (including edge cases: single investor, many investors, uneven division). Assert the sum equals `distributable` for every generated input.

### CP4: Invest Idempotency
Calling `POST /investments` twice with the same `idempotencyKey` for the same investor MUST return the same Investment document both times and MUST NOT debit the investor's wallet a second time.
- **Type:** Idempotence
- **Scope:** `Investment_Service.invest()`
- **Test approach:** Call invest, capture response and wallet balance. Call invest again with the same idempotency key. Assert: response is identical, `walletBalance` unchanged, exactly one Investment document with that key exists, exactly one INVESTMENT/DEBIT transaction for that investment exists.

### CP5: Property Status Machine Soundness
A property MUST only ever transition between statuses defined in `VALID_TRANSITIONS`; all other transitions MUST be rejected with HTTP 409.
- **Type:** Invariant
- **Scope:** All property status-change endpoints
- **Test approach:** Property test: generate random (currentStatus, targetStatus) pairs; for pairs outside `VALID_TRANSITIONS`, assert HTTP 409 is returned and `property.status` is unchanged. For valid pairs, assert the transition succeeds and `property.status` is updated.

### CP6: Refund Completeness
When a LIVE property is cancelled, `sum(REFUND CREDIT ledger amounts for that property's investments)` MUST equal `sum(INVESTMENT DEBIT ledger amounts for that property's investments)` exactly.
- **Type:** Invariant / Round-Trip
- **Scope:** `Property_Service.cancelProperty()`
- **Test approach:** Seed a property with N investors and random unit purchases. Execute cancellation. Assert: count of REFUND entries equals count of ACTIVE investments before cancellation, each refund amount matches its paired investment amount, every affected investor's `walletBalance` is restored to its pre-investment value.

---

## Out of Scope

The following features are explicitly excluded from this specification:

- **Refresh token rotation** — JWT access tokens expire in 1 day; no silent token refresh or httpOnly cookie mechanism.
- **Secondary market** — investors cannot list their units for sale to other investors.
- **Rental income distribution** — periodic rent splits are not implemented.
- **Audit log** — admin action history is not tracked in a dedicated log collection.
- **Email notifications** — no outbound email for events such as funding complete, payout credited, or KYC status change (password-reset email in Phase 2 is the sole exception).
- **Dark mode** — only the light theme is in scope.
- **Broker wallet top-up / withdrawal** — brokers cannot top-up or withdraw; commission credits are visible via transaction history only.
- **Admin investing** — the ADMIN role cannot hold investments; roles are mutually exclusive per account.

---

## Open Questions

*(All questions have been resolved prior to this document. No open questions remain.)*
