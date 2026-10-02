# Product Requirements Document (PRD)
# Fractional Real Estate Investment Portal

| Field              | Value                                               |
|--------------------|-----------------------------------------------------|
| **Product Name**   | Fractional Estate                                   |
| **Domain**         | PropTech / FinTech                                  |
| **Version**        | 1.0                                                 |
| **Date**           | 2026-10-02                                          |
| **Stack**          | MERN (React Vite + Node.js Express + MongoDB Atlas) |
| **Difficulty**     | Advanced                                            |

---

## 1. Product Vision

> **One property. Many owners.**

A production-grade fractional real-estate investment platform where anyone can own a slice of real estate starting at ₹10,000, track their holding, and receive their proportional share when the property sells. The platform handles the full lifecycle:

**Sourcing → Approval → Listing → Fundraising → Fully Funded → Holding Period → Sale → Payout**

Every rupee is accounted for in an append-only ledger.

---

## 2. User Roles & Personas

### 2.1 Admin (Platform Operator) — Seeded, never self-registered

| Capability                      | Details                                                                        |
|---------------------------------|--------------------------------------------------------------------------------|
| Approve/reject broker accounts  | Brokers cannot list until approved                                             |
| Approve/reject property listings| With reason on rejection; broker can resubmit                                  |
| Manage users                    | Activate/deactivate, change role, approve KYC                                  |
| Property lifecycle control      | Move FUNDED → HOLDING, LIVE → CANCELLED (with refunds), record sale → SOLD     |
| Platform analytics              | Total AUM, users by role, live properties, funds raised, fees earned            |
| Configure settings              | Platform fee %, broker commission %, max ownership per investor %               |
| Approve withdrawal requests     | Investor withdrawal requests queue                                             |

### 2.2 Broker (Property Sourcer) — Self-registers, requires Admin approval

| Capability                      | Details                                                                        |
|---------------------------------|--------------------------------------------------------------------------------|
| Create property drafts          | Full details, images (Cloudinary), documents                                   |
| Submit for approval             | DRAFT/REJECTED → PENDING_APPROVAL                                             |
| Track own properties            | Funding progress, investor count — **own properties only**                     |
| Answer enquiries                | Reply to investor questions on their properties                                |
| Earn commission                 | Credited when property reaches FUNDED (configurable %, default 1%)             |

### 2.3 Investor (End User) — Self-registers

| Capability                      | Details                                                                        |
|---------------------------------|--------------------------------------------------------------------------------|
| Complete KYC                    | Upload dummy docs; investing blocked until Admin approves                      |
| Top-up wallet                   | Via Razorpay test mode (or labelled mock)                                      |
| Browse & invest                 | Filter marketplace, view details, invest ≥ minimum units                       |
| Portfolio management            | Holdings, ownership %, invested amount, estimated value, payouts, ROI          |
| Unlimited properties            | Can invest across as many properties as desired                                |
| Raise enquiries                 | Ask questions about properties                                                 |
| Request withdrawal              | Wallet withdrawal → Admin approval                                            |

### 2.4 Permission Matrix

| Action                          | Admin | Broker   | Investor |
|---------------------------------|:-----:|:--------:|:--------:|
| Create property draft           | ✓     | ✓        | —        |
| Approve / reject property       | ✓     | —        | —        |
| Edit property (before LIVE)     | ✓     | Own only | —        |
| Edit property (after LIVE)      | Limited* | —     | —        |
| View LIVE properties            | ✓     | ✓        | ✓        |
| View investor list of property  | ✓     | Own only | —        |
| Invest in a property            | —     | —        | ✓        |
| Top-up / withdraw wallet        | —     | —        | ✓        |
| Approve KYC / brokers           | ✓     | —        | —        |
| Record sale & trigger payout    | ✓     | —        | —        |
| View platform analytics         | ✓     | —        | —        |
| View own portfolio / earnings   | —     | ✓        | ✓        |
| Manage users & roles            | ✓     | —        | —        |
| Approve withdrawal requests     | ✓     | —        | —        |

\* After LIVE: only description/images may change. Valuation, units, and price per unit are **locked** once the first investment exists.

> **CRITICAL:** Every protected route must check the user's role (and ownership for brokers) in Express middleware. Hiding a button is NOT authorisation.

---

## 3. Functional Requirements

### 3.1 Priority Definitions

| Priority | Label       | Meaning                                    |
|----------|-------------|--------------------------------------------|
| **P0**   | Must Have   | Mandatory for passing                      |
| **P1**   | Should Have | Needed for high marks                      |
| **P2**   | Bonus       | Extra credit (max +10 marks)               |

### 3.2 Requirements Table

#### Authentication & Authorization

| ID     | Requirement                                                                                              | Priority | Acceptance Criteria |
|--------|----------------------------------------------------------------------------------------------------------|:--------:|---------------------|
| AUTH-1 | Signup with role selection (Investor / Broker). Admin is seeded, never self-registered.                   | **P0**   | Signup form with role toggle; Admin account exists in seed data; no Admin registration route |
| AUTH-2 | Login, logout, JWT auth, protected routes per role, auto-redirect to role dashboard.                     | **P0**   | JWT issued on login; middleware rejects invalid/expired tokens; each role redirected to their dashboard |
| AUTH-3 | Forgot / reset password via email token (Nodemailer / Resend).                                           | P1       | Email sent with reset link; token expires; password updated successfully |
| AUTH-4 | Refresh token rotation stored in httpOnly cookie.                                                        | P2       | Access token refreshed silently; old refresh tokens invalidated |

#### Property Management

| ID     | Requirement                                                                                              | Priority | Acceptance Criteria |
|--------|----------------------------------------------------------------------------------------------------------|:--------:|---------------------|
| PROP-1 | Broker/Admin create property with all fields: title, description, type, address, city, area, images (Cloudinary), documents, valuation, total units, min units, expected appreciation %, rental yield %, holding period. | **P0** | Multi-step form saves DRAFT; all fields validated server-side; images uploaded to Cloudinary |
| PROP-2 | Property status machine: `DRAFT → PENDING_APPROVAL → LIVE → FUNDED → HOLDING → SOLD` (+ `REJECTED`, `CANCELLED`). | **P0** | Only legal transitions allowed; illegal transitions return 403/409; status shown as coloured chips |
| PROP-3 | Admin approve/reject with reason; broker sees reason and can resubmit.                                   | **P0**   | Rejection reason stored & displayed; broker can edit and resubmit from REJECTED |
| PROP-4 | Marketplace with search, filters (city, type, price/unit range, status, funding %), sort, pagination.    | **P0**   | Filters work correctly; pagination returns correct totals; search by title/city |
| PROP-5 | Property detail: gallery, key metrics, funding progress bar, investors count, location map, documents, return calculator. | **P0** | Progress bar updates live; return calculator computes projected value; map embed works |

#### Investment Engine

| ID     | Requirement                                                                                              | Priority | Acceptance Criteria |
|--------|----------------------------------------------------------------------------------------------------------|:--------:|---------------------|
| INV-1  | Invest flow: choose units/amount → summary (ownership %, projected value) → confirm → wallet debit.     | **P0**   | Unit selector works; summary accurate; wallet debited atomically; investment created |
| INV-2  | Atomic over-funding prevention (cannot buy more units than remain, even concurrently).                   | **P0**   | Two simultaneous requests for last units → exactly one succeeds, other gets 409 |
| INV-3  | Auto status change to `FUNDED` at 100%; broker commission credited.                                      | **P0**   | Status auto-changes when unitsSold === totalUnits; commission ledger entry created |
| INV-4  | Per-investor max cap per property (e.g. 49%) configurable by Admin.                                      | P1       | Investment rejected if cap exceeded; cap editable in Admin settings |

#### Wallet & Ledger

| ID     | Requirement                                                                                              | Priority | Acceptance Criteria |
|--------|----------------------------------------------------------------------------------------------------------|:--------:|---------------------|
| WAL-1  | Wallet with top-up (Razorpay test mode or labelled mock), balance, transaction history.                  | **P0**   | Top-up credits wallet; balance derived from ledger; transaction history filterable |
| WAL-2  | Withdrawal request → Admin approves → ledger entry.                                                      | P1       | Withdrawal request created; Admin can approve/reject; approved deducts balance |

#### Portfolio & Payouts

| ID     | Requirement                                                                                              | Priority | Acceptance Criteria |
|--------|----------------------------------------------------------------------------------------------------------|:--------:|---------------------|
| PORT-1 | Investor portfolio: total invested, current est. value, total payouts, ROI, holdings table, allocation donut chart. | **P0** | All metrics computed correctly; donut chart renders; table is paginated and sortable |
| PAY-1  | Admin records sale → payouts computed per investor → credited to wallets → property `SOLD`.               | **P0**   | Payout sum equals distributable exactly; remainder assigned to largest holder; idempotent |
| PAY-2  | Rental income distribution (Admin enters monthly rent → split by ownership %).                            | P2       | Rent split proportionally; ledger entries created for each investor |

#### KYC & User Management

| ID     | Requirement                                                                                              | Priority | Acceptance Criteria |
|--------|----------------------------------------------------------------------------------------------------------|:--------:|---------------------|
| KYC-1  | Investor uploads KYC docs (dummy), Admin approves/rejects; investing blocked until approved.              | P1       | Upload works; status badge shown; investing API rejects unapproved KYC |
| ADM-1  | Admin dashboard: KPIs (AUM, users, live properties, funds raised, fees), charts, pending approval queue. | **P0**   | All KPIs computed from DB; charts render; approval queue shows pending items |
| ADM-2  | User management table: search, filter by role, activate/deactivate, approve brokers.                     | **P0**   | Search works; filters work; activation toggle works; deactivated users cannot login |
| BRK-1  | Broker dashboard: my properties with status, funding %, investors count, commission earned.               | **P0**   | Shows only broker's own properties; all metrics accurate |

#### Enquiries & Notifications

| ID     | Requirement                                                                                              | Priority | Acceptance Criteria |
|--------|----------------------------------------------------------------------------------------------------------|:--------:|---------------------|
| ENQ-1  | Investor enquiry on a property → visible to the property's broker → reply thread.                        | P1       | Enquiry created; broker sees it; reply thread works bidirectionally |
| NOTIF-1| In-app notifications (approval, funding complete, payout credited). Email is bonus.                      | P1       | Notifications created on events; unread count badge; mark-as-read |

#### Bonus Features

| ID     | Requirement                                                                                              | Priority | Acceptance Criteria |
|--------|----------------------------------------------------------------------------------------------------------|:--------:|---------------------|
| SEC-1  | Secondary market: investor lists units for sale, another investor buys them.                             | P2       | Unit transfer works; ledger entries created for both parties |
| AUD-1  | Audit log of admin actions (who approved what, when).                                                    | P2       | Log captures action, actor, timestamp; viewable by admin |

---

## 4. Property Lifecycle State Machine

```
                    ┌──────────────────────────────┐
                    │                              │
                    ▼                              │
    ┌─────────┐   ┌──────────────────┐   ┌────────────┐
    │  DRAFT  │──▶│ PENDING_APPROVAL │──▶│    LIVE    │
    └─────────┘   └──────────────────┘   └────────────┘
                    ▲        │                │      │
                    │        ▼                │      │
                    │   ┌──────────┐          │      │
                    └───│ REJECTED │          │      │
                        └──────────┘          │      ▼
                                              │  ┌───────────┐
                                              │  │ CANCELLED │ (refund all)
                                              │  └───────────┘
                                              ▼
                                         ┌──────────┐
                                         │  FUNDED  │
                                         └──────────┘
                                              │
                                              ▼
                                         ┌──────────┐
                                         │ HOLDING  │
                                         └──────────┘
                                              │
                                              ▼
                                         ┌──────────┐
                                         │   SOLD   │
                                         └──────────┘
```

### Transition Rules

| From               | To                 | Actor       | Condition                                                         |
|--------------------|--------------------|-------------|-------------------------------------------------------------------|
| DRAFT              | PENDING_APPROVAL   | Broker/Admin| All required fields filled + ≥ 3 images                           |
| PENDING_APPROVAL   | LIVE               | Admin       | Approval action                                                   |
| PENDING_APPROVAL   | REJECTED           | Admin       | Rejection with reason (mandatory)                                 |
| REJECTED           | PENDING_APPROVAL   | Broker      | After edits to address rejection                                  |
| LIVE               | FUNDED             | System      | `unitsSold === totalUnits` (automatic)                            |
| LIVE               | CANCELLED          | Admin       | Refund every investor in full to wallet                           |
| FUNDED             | HOLDING            | Admin       | Acquisition confirmed                                            |
| HOLDING            | SOLD               | Admin       | Sale price entered; payouts executed in one DB transaction        |

---

## 5. Business Rules & Calculations

### 5.1 Money Storage Rule

> **All money stored as integers in paise (₹1 = 100 paise). Never use floating point for money. Format to rupees only in the UI.**

### 5.2 Core Formulas

```
unitPrice           = valuation / totalUnits                        (must be integer paise)
amount              = units × unitPrice
ownershipPct        = (units / totalUnits) × 100
fundingPct          = (unitsSold / totalUnits) × 100
projectedValue      = amount × (1 + appreciationPct/100) ^ years   (calculator only)
platformFee         = salePrice × platformFeePct / 100
distributable       = salePrice − platformFee
payout(investor)    = floor(distributable × investorUnits / totalUnits)
remainder           = distributable − sum(all payouts)             → assigned to largest holder
ROI%                = ((payout − invested) / invested) × 100
```

### 5.3 Investment Rules

An investment is **only** allowed when ALL of these are true:
1. `property.status === 'LIVE'`
2. Investor KYC status = `APPROVED` (if KYC feature implemented)
3. User `isActive === true`
4. `units >= property.minUnits`
5. `units <= remaining units` (totalUnits − unitsSold)
6. Investor's total units in this property ≤ `maxUnitsPerInvestor`
7. `wallet balance >= amount`

### 5.4 Atomicity Requirements

- Wallet debit, investment creation, and `unitsSold` increment **must succeed or fail together** (MongoDB transaction/session).
- Use conditional atomic update to prevent overselling:
  ```js
  findOneAndUpdate(
    { _id, status: 'LIVE', unitsSold: { $lte: totalUnits - units } },
    { $inc: { unitsSold: units } }
  )
  ```
  Returns `null` if units taken → return `409 Conflict`.

### 5.5 Immutability Rules

- Valuation / units / unit price are **immutable** once any investment exists.
- Sale can only be executed **once** (idempotent): check `status === 'HOLDING'` and no payout document exists.

### 5.6 Wallet Integrity

- Wallet balance is **never** stored as a free-editable field — derived from (or kept in sync with) the ledger.
- Top-up verification must check the gateway signature and reject a reused `gatewayPaymentId`.

### 5.7 Edge Cases — Required Handling

| Scenario                                          | Expected Behaviour                                                              |
|---------------------------------------------------|---------------------------------------------------------------------------------|
| Two investors buy last 10 units simultaneously    | Exactly one succeeds; the other gets 409 with remaining units                   |
| Investor double-clicks "Confirm"                  | Button disabled while pending; server uses idempotency key or atomic check      |
| Broker edits valuation after investments exist    | 403 with clear message                                                          |
| Admin clicks "Execute payout" twice               | Second call returns 409 `ALREADY_SOLD`; no double credit                        |
| Investor tries `POST /properties/:id/approve`     | 403 `FORBIDDEN`                                                                |
| Broker opens another broker's property analytics  | 403 or 404                                                                      |
| Deactivated user with valid token                 | 401 — check `isActive` in auth middleware                                       |
| Sale price lower than valuation (loss)            | Allowed; ROI shows negative in red                                              |
| Units that don't divide valuation evenly          | Validation error on create: `unitPrice` must be a whole rupee                   |

---

## 6. Payout Calculation — Reference Example

| Item                            | Value           |
|---------------------------------|----------------:|
| Sale price                      | ₹1,40,00,000    |
| Platform fee (2% of sale)       | − ₹2,80,000     |
| **Distributable amount**        | **₹1,37,20,000**|
| Aman: 20/1000 units (2%)        | ₹2,74,400       |
| Priya: 50/1000 units (5%)       | ₹6,86,000       |
| Karan: 400/1000 units (40%)     | ₹54,88,000      |
| **Check**                       | Sum of all investor payouts = ₹1,37,20,000 exactly |

> Rounding remainder is assigned to the largest holder.

---

## 7. Pages & Screens Specification

### 7.1 Public Pages

| Route                       | Page             | Must Contain                                                                                                        |
|-----------------------------|------------------|---------------------------------------------------------------------------------------------------------------------|
| `/`                         | Landing          | Hero with value proposition, how-it-works (3–4 steps), featured LIVE properties, platform stats, FAQs, CTA, footer |
| `/properties`               | Marketplace      | Grid/list of LIVE & FUNDED properties; filter sidebar; search; sort; pagination; card with image, title, city, price/unit, funding bar, expected return |
| `/properties/:id`           | Property Detail  | Image gallery, overview, key metrics card, funding progress bar, investors count, documents, map embed, return calculator, Invest CTA (login-gated) |
| `/login`, `/signup`         | Auth             | Role toggle on signup, validation, show/hide password, redirect to role dashboard                                   |
| `/forgot-password`, `/reset/:token` | Password Reset | P1 — email-based reset flow                                                                                  |

### 7.2 Investor Pages

| Route                       | Page             | Must Contain                                                                                                        |
|-----------------------------|------------------|---------------------------------------------------------------------------------------------------------------------|
| `/investor`                 | Dashboard        | KPI cards (Total invested, Current value, Total payouts, Overall ROI, Wallet balance), allocation donut, recent transactions, recommended properties |
| `/investor/portfolio`       | Portfolio        | Table: property, units, ownership %, invested, est. value, status, payout received, ROI. Row click → detail         |
| `/investor/invest/:id`      | Invest Checkout  | Unit selector (slider + input), live calc of amount & ownership %, wallet balance check, terms checkbox, confirm modal, success screen |
| `/investor/wallet`          | Wallet           | Balance, Add money (gateway), Withdraw request, full transaction ledger with filters                                |
| `/investor/kyc`             | KYC              | Upload form (dummy ID + selfie), status badge, rejection reason                                                     |
| `/investor/enquiries`       | Enquiries        | List of enquiries and replies                                                                                       |

### 7.3 Broker Pages

| Route                       | Page             | Must Contain                                                                                                        |
|-----------------------------|------------------|---------------------------------------------------------------------------------------------------------------------|
| `/broker`                   | Dashboard        | KPIs (listed, live, funded, total raised, commission), funding chart per property, pending approvals                 |
| `/broker/properties`        | My Properties    | Table with status chips, funding %, actions (edit draft, view, submit)                                              |
| `/broker/properties/new`    | Create/Edit      | Multi-step form: Basics → Location → Financials → Media & docs → Review & submit. Save as draft at any step        |
| `/broker/properties/:id`    | Property Analytics | Funding timeline chart, investor list, enquiries                                                                  |

### 7.4 Admin Pages

| Route                       | Page             | Must Contain                                                                                                        |
|-----------------------------|------------------|---------------------------------------------------------------------------------------------------------------------|
| `/admin`                    | Dashboard        | KPIs (AUM, users by role, live properties, funds raised, fees earned), charts, approval queues                      |
| `/admin/properties`         | All Properties   | Filter by status/broker/city; approve/reject with reason modal; change status; view detail                          |
| `/admin/properties/:id/sell`| Record Sale      | Sale price input, fee preview, payout preview table per investor, confirm → executes distribution                   |
| `/admin/users`              | Users            | Search, role filter, activate/deactivate, approve broker, view KYC                                                  |
| `/admin/kyc`                | KYC Queue        | Pending KYCs with document preview, approve/reject                                                                  |
| `/admin/withdrawals`        | Withdrawals      | Pending requests, approve/reject                                                                                    |
| `/admin/settings`           | Settings         | Platform fee %, broker commission %, max ownership per investor %                                                   |

### 7.5 Shared

- Profile & change password page
- Notifications dropdown/page
- 404 and 403 ("You don't have access") pages
- Global layout: role-aware sidebar, top bar with wallet balance (investor), notifications, avatar menu with logout
- Footer with disclaimer: *"This is an academic project. No real money or securities are involved."*

---

## 8. API Contract Summary

**Base URL:** `/api/v1`

**Response Shapes:**
```json
// Success
{ "success": true, "data": "...", "message": "..." }

// Error
{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }
```

**Status Codes:** 200, 201, 400, 401, 403, 404, 409, 429, 500

**List endpoints:** Support `?page=1&limit=20&sort=-createdAt&search=...` → return `{ items, page, limit, total, totalPages }`

### 8.1 Auth Endpoints

| Method | Endpoint                    | Access  | Purpose                                             |
|--------|-----------------------------|---------|-----------------------------------------------------|
| POST   | `/auth/register`            | Public  | Create investor/broker                              |
| POST   | `/auth/login`               | Public  | Returns access token + user                         |
| POST   | `/auth/logout`              | Auth    | Invalidate session                                  |
| GET    | `/auth/me`                  | Auth    | Current user profile                                |
| POST   | `/auth/forgot-password`     | Public  | Send reset email (P1)                               |
| POST   | `/auth/reset-password/:token`| Public | Set new password (P1)                               |

### 8.2 Property Endpoints

| Method | Endpoint                              | Access         | Purpose                                          |
|--------|---------------------------------------|----------------|--------------------------------------------------|
| GET    | `/properties`                         | Public         | Marketplace list with filters, pagination        |
| GET    | `/properties/:id`                     | Public         | Detail with unitsSold, fundingPct, investorCount |
| POST   | `/properties`                         | Broker, Admin  | Create DRAFT                                     |
| PATCH  | `/properties/:id`                     | Owner broker, Admin | Update (rules depend on status)             |
| POST   | `/properties/:id/submit`              | Owner broker   | DRAFT/REJECTED → PENDING_APPROVAL                |
| POST   | `/properties/:id/approve`             | Admin          | → LIVE                                           |
| POST   | `/properties/:id/reject`              | Admin          | → REJECTED (body: reason)                        |
| POST   | `/properties/:id/status`              | Admin          | FUNDED→HOLDING, LIVE→CANCELLED (with refunds)    |
| POST   | `/properties/:id/sell`                | Admin          | Record sale → compute payouts → SOLD             |
| GET    | `/properties/:id/payout-preview`      | Admin          | Preview distribution without committing          |
| GET    | `/properties/:id/investors`           | Owner broker, Admin | Investors and their units                   |
| GET    | `/broker/properties`                  | Broker         | My listings with stats                           |

### 8.3 Investment, Wallet & Portfolio Endpoints

| Method | Endpoint                    | Access              | Purpose                                          |
|--------|-----------------------------|---------------------|--------------------------------------------------|
| POST   | `/investments`              | Investor (KYC ok)   | Invest atomically                                |
| GET    | `/investments/me`           | Investor            | All my investments                               |
| GET    | `/portfolio/summary`        | Investor            | Totals, ROI, allocation data                     |
| GET    | `/wallet`                   | Investor            | Balance (derived from ledger)                    |
| POST   | `/wallet/topup/order`       | Investor            | Create gateway order                             |
| POST   | `/wallet/topup/verify`      | Investor            | Verify signature → credit ledger                 |
| POST   | `/wallet/withdraw`          | Investor            | Create withdrawal request                        |
| GET    | `/transactions`             | Auth                | Own ledger (admin: all)                          |

### 8.4 Admin, KYC, Enquiries & Notifications Endpoints

| Method     | Endpoint                        | Access         | Purpose                                    |
|------------|---------------------------------|----------------|--------------------------------------------|
| GET        | `/admin/stats`                  | Admin          | Dashboard KPIs & chart data                |
| GET        | `/admin/users`                  | Admin          | List / filter users                        |
| PATCH      | `/admin/users/:id`              | Admin          | isActive, role, brokerApproved             |
| POST       | `/kyc`                          | Investor       | Upload KYC docs                            |
| PATCH      | `/admin/kyc/:userId`            | Admin          | Approve / reject + reason                  |
| GET/PATCH  | `/admin/withdrawals[/:id]`      | Admin          | List / approve / reject                    |
| GET/PATCH  | `/admin/settings`               | Admin          | Fee %, commission %, max ownership %       |
| POST       | `/enquiries`                    | Investor       | Create enquiry (propertyId, message)       |
| GET        | `/enquiries`                    | Investor/Broker| Own / for own properties                   |
| POST       | `/enquiries/:id/reply`          | Broker/Investor| Add message to thread                      |
| GET/PATCH  | `/notifications[/:id/read]`     | Auth           | List, mark read                            |

---

## 9. Data Models (MongoDB)

> All money values in **paise** (integer). ₹1 = 100 paise.

### 9.1 `users`

| Field           | Type    | Notes                                                    |
|-----------------|---------|----------------------------------------------------------|
| name            | String  | required                                                 |
| email           | String  | unique, lowercase, indexed                               |
| phone           | String  | required                                                 |
| passwordHash    | String  | bcrypt, `select: false`                                  |
| role            | Enum    | `ADMIN \| BROKER \| INVESTOR`                              |
| isActive        | Boolean | default `true`                                           |
| brokerApproved  | Boolean | only for BROKER, default `false`                         |
| kyc             | Object  | `{ status: NOT_SUBMITTED\|PENDING\|APPROVED\|REJECTED, docs: [url], reason }` |
| createdAt/updatedAt | Date | `timestamps: true`                                     |

### 9.2 `properties`

| Field                     | Type          | Notes                                              |
|---------------------------|---------------|-----------------------------------------------------|
| title, description        | String        | required                                            |
| type                      | Enum          | `APARTMENT \| VILLA \| COMMERCIAL \| PLOT \| WAREHOUSE` |
| address, city, state, pincode | String    | required                                            |
| geo                       | Object        | `{ lat, lng }` for map embed                        |
| areaSqft                  | Number        |                                                     |
| images[], documents[]     | Array[Object] | `[{url, publicId, name}]` — Cloudinary              |
| valuation                 | Number (paise)| e.g. `10000000_00` for ₹1 Cr                        |
| totalUnits                | Number        | e.g. 1000                                           |
| unitPrice                 | Number (paise)| `valuation / totalUnits` — must divide exactly      |
| minUnits                  | Number        | minimum purchasable                                 |
| maxUnitsPerInvestor       | Number        | per-investor cap                                    |
| unitsSold                 | Number        | default 0; updated atomically with `$inc`           |
| expectedAppreciationPct   | Number        | for return calculator                               |
| rentalYieldPct            | Number        |                                                     |
| holdingPeriodMonths       | Number        |                                                     |
| status                    | Enum          | `DRAFT \| PENDING_APPROVAL \| LIVE \| FUNDED \| HOLDING \| SOLD \| REJECTED \| CANCELLED` |
| rejectionReason           | String        |                                                     |
| brokerId                  | ObjectId→users| indexed                                             |
| approvedBy                | ObjectId→users|                                                     |
| salePrice                 | Number (paise)|                                                     |
| soldAt, fundedAt, liveAt  | Date          |                                                     |

### 9.3 `investments`

| Field        | Type    | Notes                                                         |
|--------------|---------|---------------------------------------------------------------|
| investorId   | ObjectId| compound index `{ investorId, propertyId }`                   |
| propertyId   | ObjectId|                                                               |
| units        | Number  |                                                               |
| amount       | Number  | `units × unitPrice` (paise)                                   |
| status       | Enum    | `ACTIVE \| EXITED \| REFUNDED`                                  |
| payoutAmount | Number  | filled on sale                                                |

### 9.4 `transactions` (ledger — append-only)

| Field           | Type    | Notes                                                     |
|-----------------|---------|-----------------------------------------------------------|
| userId          | ObjectId| whose wallet is affected                                  |
| type            | Enum    | `TOPUP \| INVESTMENT \| PAYOUT \| REFUND \| COMMISSION \| WITHDRAWAL \| FEE` |
| direction       | Enum    | `CREDIT \| DEBIT`                                          |
| amount          | Number  | always positive (paise)                                   |
| balanceAfter    | Number  | snapshot for statements                                   |
| refType, refId  | String/ObjectId | links ledger row to its cause                    |
| gatewayPaymentId| String  | for TOPUP; unique to prevent double credit                |

### 9.5 Other Collections

| Collection      | Key Fields                                                                                            |
|-----------------|-------------------------------------------------------------------------------------------------------|
| `payouts`       | propertyId, salePrice, platformFee, distributable, items: [{ investorId, units, amount }], executedBy, executedAt |
| `withdrawals`   | userId, amount, status (PENDING\|APPROVED\|REJECTED), bankDetails (dummy), processedBy                  |
| `enquiries`     | propertyId, investorId, brokerId, messages: [{ from, text, at }], status                              |
| `notifications` | userId, type, title, body, link, read                                                                 |
| `settings`      | platformFeePct, brokerCommissionPct, maxOwnershipPct (single document)                                |

### 9.6 Entity Relationships

```
users (BROKER)    1 ────< properties
users (INVESTOR)  1 ──< investments >── 1 properties
users             1 ──< transactions (refId → investment | payout | withdrawal)
properties        1 ── 0..1 payouts ──< items (per investor)
```

---

## 10. UI / UX Design System

### 10.1 Theme

**Trustworthy, premium fintech.** Clean whitespace, confident numbers, calm colours. Light theme default; dark mode is bonus.

### 10.2 Colour Palette

| Token                | Hex       | Use                                    |
|----------------------|-----------|----------------------------------------|
| Primary (Deep Navy)  | `#0F2A4A` | Sidebar, headings, primary buttons     |
| Accent (Emerald)     | `#10B981` | Positive returns, success, funded      |
| Gold                 | `#D4A017` | Premium badges, highlights             |
| Background           | `#F7F8FA` | App background                         |
| Surface              | `#FFFFFF` | Cards, tables                          |
| Danger               | `#DC2626` | Negative ROI, rejection, errors        |
| Warning              | `#F59E0B` | Pending approval, KYC pending          |
| Text Primary         | `#111827` | Primary text                           |
| Text Secondary       | `#6B7280` | Secondary text                         |

### 10.3 Status Chip Colours

| Status           | Colour  |
|------------------|---------|
| DRAFT            | Grey    |
| PENDING_APPROVAL | Amber   |
| LIVE             | Blue    |
| FUNDED           | Emerald |
| HOLDING          | Purple  |
| SOLD             | Navy    |
| REJECTED         | Red     |
| CANCELLED        | Grey    |

### 10.4 Typography

- **Headings:** Inter / Plus Jakarta Sans, weight 600–700
- **Body:** Inter, weight 400
- **Numbers:** Tabular figures (`font-variant-numeric: tabular-nums`)

### 10.5 Money Formatting

- Indian grouping: `₹1,00,00,000`
- Use `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`
- Abbreviations in cards: ₹1.4 Cr, ₹50 L

### 10.6 UI Component Standards

| Element   | Standard                                                                                      |
|-----------|-----------------------------------------------------------------------------------------------|
| Charts    | Recharts / Chart.js: allocation donut, funds-raised line, funding progress bars               |
| Tables    | Sticky header, sortable columns, pagination, empty-state illustration, row hover              |
| Forms     | Multi-step with progress indicator, inline validation, auto-calculated read-only fields       |
| Feedback  | Confirm modals for money actions, success screens, toasts                                     |
| Spacing   | 8-pt spacing scale; card radius 12–16px; subtle shadows                                      |

### 10.7 Design Principles

1. **Clarity over decoration** — ownership % and returns visible within 3 seconds
2. **Consistency** — one button style per intent, one chip colour per status
3. **Visibility of system status** — always show funding progress, pending states
4. **Error prevention** — disable invest when wallet insufficient; show shortfall amount
5. **Accessibility** — contrast ≥ 4.5:1, focus rings, labels on every input, never colour alone

---

## 11. Authentication & Security Requirements

| Requirement                  | Detail                                                                                    |
|------------------------------|-------------------------------------------------------------------------------------------|
| Password hashing             | bcrypt, cost 10–12                                                                        |
| Password policy              | 8+ chars, at least 1 number, 1 symbol                                                    |
| JWT access token             | 15 min – 1 day expiry                                                                     |
| Refresh token (P2)           | httpOnly, secure, sameSite cookie                                                         |
| Middleware chain              | `authenticate → requireRole → requireOwnership → validate(schema) → controller`          |
| Rate limiting                | `/auth/*` and `/investments` routes                                                        |
| Security headers             | `helmet` middleware                                                                        |
| CORS                         | Restricted to frontend origin only                                                        |
| NoSQL injection prevention   | `express-mongo-sanitize`                                                                   |
| Server-side amount compute   | Never trust amounts from client — compute `amount = units × unitPrice` on server          |
| File upload restrictions     | Whitelist MIME (jpg/png/webp/pdf), max 5 MB, Cloudinary upload, store URL only            |

---

## 12. Non-Functional Requirements

### 12.1 Production-Grade Checklist

| Area            | Minimum Expectation                                                                              |
|-----------------|--------------------------------------------------------------------------------------------------|
| Validation      | Every form validated client-side AND every API body validated server-side (Zod/Joi). Inline errors |
| Error handling  | Central Express error middleware, consistent JSON shape, no stack traces in responses, UI toasts  |
| UI states       | Loading (skeletons/spinners), empty states, error states, success feedback on every screen        |
| Responsiveness  | 360px mobile, tablet, desktop. No horizontal scroll                                              |
| Config          | All secrets in `.env`; `.env.example` committed; no hard-coded URLs                              |
| Code quality    | Sensible folder structure, reusable components, no dead code, consistent naming, ESLint/Prettier |
| Security        | CORS, helmet, rate limiting, input sanitisation, server-side auth checks on every endpoint        |
| Seed data       | Realistic demo data: ≥8 properties across all statuses, 5+ investors, test accounts per role     |

### 12.2 Concurrency

- Demonstrate that two investors buying the last units at the same time results in exactly one success and one 409 (show in demo video with two browser windows).

### 12.3 Idempotency

- Payout execution must be idempotent — second call returns 409 `ALREADY_SOLD`.
- Top-up verification must reject reused `gatewayPaymentId`.

---

## 13. Seed Data Requirements

| Category           | Minimum                                                                             |
|--------------------|-------------------------------------------------------------------------------------|
| Properties         | ≥ 8: 2 LIVE (partly funded), 1 FUNDED, 1 HOLDING, 1 SOLD, 1 PENDING, 1 REJECTED, 1 DRAFT |
| Investors          | ≥ 5 with investments across properties                                              |
| Brokers            | ≥ 2 (1 approved, 1 pending)                                                        |
| Admin              | 1 seeded account                                                                    |
| Test credentials   | One account per role in README (e.g. `admin@demo.com / Admin@123`)                  |
| Transactions       | Realistic ledger entries for all activities                                         |

---

## 14. Deliverables Checklist

| #  | Deliverable              | Details                                                                              |
|---:|--------------------------|--------------------------------------------------------------------------------------|
| 1  | GitHub repository        | Public; every member in commit history                                               |
| 2  | `README.md`              | Setup steps for fresh machine                                                        |
| 3  | `.env.example`           | Every variable with comments, no real secrets                                        |
| 4  | Live deployment          | Frontend + backend URLs (Vercel/Render)                                              |
| 5  | Demo video (3–5 min)     | Screen recording + voice-over covering every P0 feature                              |
| 6  | Test credentials         | One account per role in README                                                       |
| 7  | `PROMPTS.md`             | 10–20 key prompts used, in order, with notes                                         |
| 8  | Concurrency proof        | Two browser windows in demo video                                                    |
| 9  | Postman collection       | Exported collection or Swagger UI                                                    |

---

## 15. Evaluation Rubric (100 marks)

| Criterion                    | Marks | Key Checks                                                              |
|------------------------------|------:|-------------------------------------------------------------------------|
| Authentication & RBAC        |    15 | Three roles, protected routes, server-side checks, deactivation         |
| Property lifecycle           |    15 | All statuses, legal transitions, approval/rejection, listing wizard     |
| Investment engine            |    15 | Correct ownership %, atomic prevention, wallet debit, auto-FUNDED       |
| Payout & ledger              |    15 | Exact distribution, fees, commission, idempotency, transaction history  |
| Dashboards                   |    10 | Investor portfolio & charts, broker analytics, admin KPIs & queues      |
| UI / UX quality              |    10 | Design consistency, responsive, loading/empty/error states, ₹ format   |
| Code quality & architecture  |     8 | Structure, services layer, validation, error handling, env config       |
| Deployment & documentation   |     5 | Live links, README, `.env.example`, seed data, Postman                  |
| Viva & `PROMPTS.md`          |     7 | Every member explains their part; prompt log quality                    |
| **Bonus (max)**              |   +10 | Secondary market, rental dist, email, refresh tokens, audit log, dark mode |

---

## 16. Technical Constraints

| Constraint                              | Detail                                                                 |
|-----------------------------------------|------------------------------------------------------------------------|
| Stack                                   | MERN (React Vite or Next.js frontend, Node.js + Express backend, MongoDB) |
| Database                                | MongoDB Atlas (replica set for multi-document transactions)            |
| Payments                                | Razorpay/Stripe test mode, or clearly labelled mock                    |
| No real KYC                             | Dummy uploads only; never use real ID numbers in seed data             |
| Admin cannot invest                     | Roles are clean: one email = one role                                  |
| No floating-point money                 | All amounts in paise (integer)                                         |
| Valuation must divide evenly into units | `unitPrice = valuation / totalUnits` must be an integer                |
