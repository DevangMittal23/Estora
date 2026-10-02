# Full Stack Development - Vibe Coding Examination - Team Round

## Problem Statement 01: Fractional Real Estate Investment Portal

> **One property. Many owners.** Build the platform where anyone can own a slice of real estate with ₹2 lakh, track their holding, and get paid their share when the property sells.

| Attribute | Value |
|---|---|
| Domain | PropTech / FinTech |
| Core challenge | Ownership math, money safety, RBAC |
| Difficulty | Advanced |
| Stack | MERN (Next.js allowed) |
| Roles | Admin · Broker · Investor |
| Mode | Team · Vibe coding |

> **IMPORTANT - Read this entire document before you write your first prompt**
>
> Every section is part of the evaluation. Pages, APIs, data models and rules listed as **P0 (Must Have)** are mandatory.
>
> Your team will be asked to explain any part of the code during the viva - AI-generated code you cannot explain earns no marks.

---

## Contents

1. Exam Instructions & Ground Rules
2. Problem Overview
3. Objectives - What Is Being Tested
4. Key Concepts & Glossary
5. User Roles & Permission Matrix
6. Example Use Case - End-to-End Walkthrough
7. Functional Requirements
8. User Flows
9. Pages & Screens
10. API Specification
11. Database Design (MongoDB)
12. Business Rules, Calculations & Edge Cases
13. UI / UX & Design System
14. Authentication & Security
15. Tech Stack & Libraries
16. Suggested Folder Structure
17. Team Division & Milestones
18. Vibe Coding Playbook
19. Submission Format
20. Evaluation Rubric (100 marks)
21. Hints
22. Common Mistakes to Avoid
23. FAQ & Extra Information

---

# 1. Exam Instructions & Ground Rules

This is a team-based, vibe-coding examination. You are allowed - and expected - to use AI coding tools to build a production-grade application. The goal is not to type every line yourself; the goal is to architect, direct, review, integrate and ship a complete product, and to fully understand what you shipped.

## 1.1 What is allowed

- **AI coding assistants:** Cursor, Claude, ChatGPT, GitHub Copilot, Windsurf, v0, Bolt, Lovable, Gemini, etc.
- **Official documentation, npm packages, UI component libraries:** shadcn/ui, MUI, Chakra, Aceternity, Magic UI; icon packs and free stock media.
- **Free-tier cloud services:** MongoDB Atlas, Cloudinary, Vercel, Netlify, Render, Railway, Upstash Redis.
- Discussion within your own team.

## 1.2 What is NOT allowed

- Cloning a complete existing project / GitHub repo / paid template and submitting it as your own.
- Sharing code, prompts or repositories with other teams.
- Committing secrets (API keys, DB passwords, JWT secrets) to the repository.
- Submitting a UI-only mock where the backend, database or auth is faked (unless the PS explicitly allows a mock for that part, e.g. payment gateway in test mode).

## 1.3 Team working rules

- Create one GitHub repository per team at the start of the exam and add every member as a collaborator.
- Every member must commit from their own GitHub account. Commit history is checked to verify contribution.
- Commit early and often with meaningful messages (e.g. `feat(auth): add JWT refresh flow`), not `final`, `asdf` or one giant commit at the end.
- Use branches per feature (`feature/auth`, `feature/dashboard`) and merge via pull requests if time permits.
- Keep a running `PROMPTS.md` file in the repo where you paste the key prompts your team used. This is part of the evaluation.

## 1.4 What "production-grade" means in this exam

| Area | Minimum expectation |
|---|---|
| Authentication | Signup, login, logout, protected routes, hashed passwords (bcrypt), JWT (access token; refresh token is a bonus), role-based access where roles exist. |
| Validation | Every form validated on the client and every API body validated on the server (Zod / Joi / express-validator). Clear inline error messages. |
| Error handling | Central Express error middleware, consistent JSON error shape, no raw stack traces in responses, toast/inline errors on the UI. |
| UI states | Loading (skeletons/spinners), empty states, error states and success feedback on every data-driven screen. |
| Responsiveness | Works on mobile (360px), tablet and desktop. No horizontal scroll. |
| Config | All secrets in `.env`; a complete `.env.example` committed; no hard-coded URLs. |
| Code quality | Sensible folder structure, reusable components, no dead code dumps, consistent naming, ESLint/Prettier. |
| Security basics | CORS configured, helmet, rate limiting on auth routes, input sanitisation, authorisation checks on every protected endpoint (not just hidden buttons). |
| Data | Seed script with realistic demo data so the evaluator can test immediately. |

> **RULE - Viva**
>
> Each member will be asked to explain parts of the codebase - an API route, a schema, a component, a design decision. If nobody in the team can explain a piece of code, that feature is treated as not implemented.

---

# 2. Problem Overview

Buying a whole property is out of reach for most people - a flat in a good location costs ₹50 lakh to several crores. Fractional ownership solves this: a property is divided into small units, many investors buy those units, and together they own the property. When the property appreciates and is sold, the sale amount is distributed to every investor in proportion to what they own.

Your task is to build a complete, production-grade fractional real-estate investment platform with three roles - **Admin, Broker and Investor**. The platform must handle the full lifecycle of a property:

**sourcing → approval → listing → fundraising → fully funded → holding period → sale → payout to every investor**

Every rupee must be accounted for in a ledger.

> **EXAMPLE - The idea in one line**
>
> A ₹1 Cr property is listed. You invest ₹2 lakh (2%), someone invests ₹5 lakh (5%), another person ₹40 lakh (40%) … until ₹1 Cr is raised. Two years later it sells for ₹1.4 Cr. You receive 2% of the sale proceeds - ₹2.8 lakh before fees.
>
> You can do this across as many properties as you like.

### Real-world references (research these for inspiration)

- Strata, hBits, PropertyShare, Assetmonk (India)
- Fundrise, Arrived, Lofty (international)
- Look at how they show funding progress, ownership %, projected returns and investor dashboards.

---

# 3. Objectives - What Is Being Tested

| Skill | How it shows up in this PS |
|---|---|
| Role-based access control | Three roles with genuinely different dashboards and permissions, enforced on the server. |
| Data modelling | Properties, investments, holdings, wallet, ledger, payouts - correctly related. |
| Financial correctness | Ownership %, over-funding prevention, payout distribution that adds up to the exact sale amount. |
| Concurrency & integrity | Two investors buying the last units at the same time must not over-fund the property. |
| State machines | A property moves through well-defined statuses; illegal transitions are rejected. |
| Dashboard UX | Portfolio summaries, charts, progress bars, tables with filters and pagination. |

# 4. Key Concepts & Glossary

| Term | Meaning in this application |
|---|---|
| Property / Listing | A real-estate asset offered for fractional investment. Has a total valuation and a fixed number of units. |
| Unit (share) | The smallest purchasable piece. Example: ₹1 Cr property split into 1,000 units of ₹10,000 each. |
| Minimum investment | Smallest amount allowed per investment, e.g. ₹10,000 (1 unit) or ₹25,000. |
| Ownership % | `(units owned by investor ÷ total units) × 100`. |
| Funding progress | `(units sold ÷ total units) × 100`. Property becomes `FUNDED` at 100%. |
| Wallet | Investor's in-app balance. Top-up via (test-mode) payment gateway; investments debit it; payouts credit it. |
| Ledger / Transaction | Append-only record of every money movement. Balance = sum of ledger entries. Never edited, never deleted. |
| Exit / Sale | Admin records that the property sold for a sale price. Triggers payout distribution. |
| Platform fee | % of the sale proceeds (or profit) retained by the platform, e.g. 2%. |
| Broker commission | % paid to the broker who sourced the property, e.g. 1% of the raised amount, credited when funded. |
| ROI | `((payout − invested) ÷ invested) × 100`. |
| KYC | Know-Your-Customer verification. Here: investor uploads documents (use dummy data), Admin approves/rejects. |

---

# 5. User Roles & Permission Matrix

## Admin - the platform operator

- Approves/rejects broker-submitted properties and can list properties directly.
- Manages users (activate/deactivate, change role, approve KYC, approve brokers).
- Moves properties through their lifecycle; records the sale; triggers payouts.
- Sees platform-wide analytics: total AUM, total investors, funds raised, fees earned.

## Broker - sources and manages properties

- Registers as a broker (requires Admin approval before they can list).
- Creates property listing drafts with full details, images, documents → submits for approval.
- Tracks funding progress and investor count for their own properties only.
- Answers investor enquiries on their properties; earns commission when a property is funded.

## Investor - the end user

- Signs up, completes KYC, tops up wallet.
- Browses and filters live properties, views details, invests any amount ≥ minimum.
- Sees portfolio: holdings, ownership %, invested amount, current/estimated value, payouts, ROI.
- Can invest in unlimited properties; can raise enquiries; can request wallet withdrawal.

## Permission matrix

| Action | Admin | Broker | Investor |
|---|:---:|:---:|:---:|
| Create property draft | ✓ | ✓ | — |
| Approve / reject property | ✓ | — | — |
| Edit property (before LIVE) | ✓ | Own only | — |
| Edit property (after LIVE) | Limited* | — | — |
| View LIVE properties | ✓ | ✓ | ✓ |
| View investor list of a property | ✓ | Own only | — |
| Invest in a property | — | — | ✓ |
| Top-up / withdraw wallet | — | — | ✓ |
| Approve KYC / brokers | ✓ | — | — |
| Record sale & trigger payout | ✓ | — | — |
| View platform analytics | ✓ | — | — |
| View own portfolio / earnings | — | ✓ | ✓ |
| Manage users & roles | ✓ | — | — |
| Approve withdrawal requests | ✓ | — | — |

\* After a property is LIVE, only description/images may change. Valuation, units and price per unit are locked once the first investment exists.

> **RULE - Server-side enforcement**
>
> Hiding a button is not authorisation. Every protected route must check the user's role (and ownership, for brokers) in Express middleware. Evaluators will call your APIs directly with an investor token to try admin actions.

---

# 6. Example Use Case - End-to-End Walkthrough

Follow this story exactly when you record your demo video.

1. Rohit (Broker) registers, Admin approves his broker account.
2. Rohit creates a listing: **“2BHK, Sector 150, Noida”**, valuation ₹1,00,00,000, 1,000 units of ₹10,000, min. investment 1 unit, expected appreciation 12%/yr, rental yield 3%, 8 photos, 2 PDFs. He submits for approval.
3. Admin reviews and approves → status `LIVE`. It now appears in the marketplace.
4. Aman (Investor) signs up, uploads KYC, Admin approves. Aman tops up ₹5,00,000 (Razorpay test mode).
5. Aman invests ₹2,00,000 = 20 units = 2%. Wallet → ₹3,00,000. Funding bar → 2%.
6. Priya invests ₹5,00,000 (5%), Karan ₹40,00,000 (40%), and others until 1,000/1,000 units are sold.
7. System auto-moves status to `FUNDED`, credits Rohit's commission (1% = ₹1,00,000), stops new investments.
8. Admin moves it to `HOLDING` (property acquired). Investors see it as an active holding.
9. Later, Admin records a sale at ₹1,40,00,000 → status `SOLD` → payouts are calculated and credited.
10. Aman sees payout in his wallet and portfolio: invested ₹2,00,000 → received ₹2,74,400 (after 2% platform fee) → ROI 37.2%.

## Payout calculation for this example

| Item | Value |
|---|---:|
| Sale price | ₹1,40,00,000 |
| Platform fee (2% of sale) | − ₹2,80,000 |
| Distributable amount | ₹1,37,20,000 |
| Aman: 20 units of 1,000 (2%) | ₹2,74,400 |
| Priya: 50 units (5%) | ₹6,86,000 |
| Karan: 400 units (40%) | ₹54,88,000 |
| Check | Sum of all investor payouts must equal ₹1,37,20,000 exactly (handle rounding remainder). |

---

# 7. Functional Requirements

**P0 = must have (mandatory for passing) · P1 = should have (needed for high marks) · P2 = bonus.**

| ID | Requirement | Priority |
|---|---|:---:|
| AUTH-1 | Signup with role selection (Investor / Broker). Admin is seeded, never self-registered. | P0 |
| AUTH-2 | Login, logout, JWT auth, protected routes per role, auto-redirect to role dashboard. | P0 |
| AUTH-3 | Forgot / reset password via email token (Nodemailer / Resend). | P1 |
| AUTH-4 | Refresh token rotation stored in httpOnly cookie. | P2 |
| PROP-1 | Broker/Admin create property: title, description, type, address, city, area (sq ft), images (Cloudinary), documents, valuation, total units, min units, expected annual appreciation %, rental yield %, holding period. | P0 |
| PROP-2 | Property status machine: `DRAFT → PENDING_APPROVAL → LIVE → FUNDED → HOLDING → SOLD` (+ `REJECTED`, `CANCELLED`). | P0 |
| PROP-3 | Admin approve/reject with reason; broker sees reason and can resubmit. | P0 |
| PROP-4 | Marketplace with search, filters (city, type, price/unit range, status, funding %), sort, pagination. | P0 |
| PROP-5 | Property detail: gallery, key metrics, funding progress bar, investors count, location map (embed), documents, return calculator. | P0 |
| INV-1 | Invest flow: choose units/amount → summary (ownership %, projected value) → confirm → wallet debit. | P0 |
| INV-2 | Atomic over-funding prevention (cannot buy more units than remain, even concurrently). | P0 |
| INV-3 | Auto status change to `FUNDED` at 100%; broker commission credited. | P0 |
| INV-4 | Per-investor max cap per property (e.g. 49%) configurable by Admin. | P1 |
| WAL-1 | Wallet with top-up (Razorpay/Stripe test mode, or a clearly labelled mock), balance, transaction history. | P0 |
| WAL-2 | Withdrawal request → Admin approves → ledger entry. | P1 |
| PORT-1 | Investor portfolio: total invested, current est. value, total payouts, ROI, holdings table, allocation donut chart. | P0 |
| PAY-1 | Admin records sale → payouts computed per investor → credited to wallets → property `SOLD`. | P0 |
| PAY-2 | Rental income distribution (Admin enters monthly rent → split by ownership %). | P2 |
| KYC-1 | Investor uploads KYC docs (dummy), Admin approves/rejects; investing blocked until approved. | P1 |
| ADM-1 | Admin dashboard: KPIs (AUM, users, live properties, funds raised, fees), charts, pending approvals queue. | P0 |
| ADM-2 | User management table: search, filter by role, activate/deactivate, approve brokers. | P0 |
| BRK-1 | Broker dashboard: my properties with status, funding %, investors count, commission earned. | P0 |
| ENQ-1 | Investor enquiry on a property → visible to the property's broker → reply thread. | P1 |
| NOTIF-1 | In-app notifications (approval, funding complete, payout credited). Email is a bonus. | P1 |
| SEC-1 | Secondary market: investor lists units for sale, another investor buys them. | P2 |
| AUD-1 | Audit log of admin actions (who approved what, when). | P2 |

---

# 8. User Flows

## Property lifecycle

```text
1. Broker creates DRAFT
2. Submits → PENDING_APPROVAL
3. Admin approves → LIVE
4. Investors buy units
5. 100% sold → FUNDED
6. Admin → HOLDING
7. Admin records sale → SOLD
8. Payouts credited to wallets
```

| From | To | Who | Condition |
|---|---|---|---|
| DRAFT | PENDING_APPROVAL | Broker / Admin | All required fields + ≥ 3 images |
| PENDING_APPROVAL | LIVE / REJECTED | Admin | Rejection needs a reason |
| REJECTED | PENDING_APPROVAL | Broker | After edits |
| LIVE | FUNDED | System | `unitsSold === totalUnits` |
| LIVE | CANCELLED | Admin | Refund every investor in full to wallet |
| FUNDED | HOLDING | Admin | Acquisition confirmed |
| HOLDING | SOLD | Admin | Sale price entered; payouts executed in one DB transaction |

## Investor flow

```text
1. Sign up as Investor
2. Upload KYC → wait for approval
3. Top-up wallet
4. Browse & filter marketplace
5. Open property, use return calculator
6. Choose units → confirm
7. Holding appears in portfolio
8. Receive payout on sale
```

## Broker flow

```text
1. Sign up as Broker
2. Admin approves broker
3. Create listing + media
4. Submit for approval
5. Fix & resubmit if rejected
6. Track funding live
7. Reply to enquiries
8. Commission credited at FUNDED
```

---

# 9. Pages & Screens

> Routes are suggestions; naming may differ but every screen must exist.

## Public

| Route | Page | What it must contain |
|---|---|---|
| `/` | Landing | Hero with value proposition, how-it-works (3–4 steps), featured LIVE properties, platform stats (total raised, investors), FAQs, CTA to sign up, footer. |
| `/properties` | Marketplace | Grid/list of LIVE & FUNDED properties; filters sidebar; search; sort; pagination; card shows image, title, city, price/unit, funding bar, expected return. |
| `/properties/:id` | Property detail | Image gallery, overview, key metrics card, funding progress, investors count, documents, map embed, return calculator (amount → ownership % → projected value after N years), Invest CTA (login-gated). |
| `/login`, `/signup` | Auth | Role toggle on signup (Investor / Broker), validation, show/hide password, redirect to role dashboard. |
| `/forgot-password`, `/reset/:token` | Password reset | P1. |

## Investor

| Route | Page | What it must contain |
|---|---|---|
| `/investor` | Dashboard | KPI cards (Total invested, Current value, Total payouts, Overall ROI, Wallet balance), allocation donut by property, recent transactions, recommended properties. |
| `/investor/portfolio` | Portfolio | Table: property, units, ownership %, invested, est. value, status, payout received, ROI. Row click → holding detail. |
| `/investor/invest/:id` | Invest checkout | Unit selector (slider + input), live calc of amount & ownership %, wallet balance check, terms checkbox, confirm modal, success screen. |
| `/investor/wallet` | Wallet | Wallet Balance, Add money (gateway), Withdraw request, full transaction ledger with filters. |
| `/investor/kyc` | KYC | KYC Upload form (dummy ID + selfie), status badge, rejection reason. |
| `/investor/enquiries` | Enquiries | Enquiries List of enquiries and replies. |

## Broker

| Route | Page | What it must contain |
|---|---|---|
| `/broker` | Dashboard | KPIs (properties listed, live, funded, total raised, commission earned), funding chart per property, pending approvals. |
| `/broker/properties` | My properties | Table with status chips, funding %, actions (edit draft, view, submit). |
| `/broker/properties/new` | Create / edit listing | Multi-step form: Basics → Location → Financials (valuation, units, auto-calculated price/unit) → Media & docs → Review & submit. Save as draft at any step. |
| `/broker/properties/:id` | Property analytics | Funding timeline chart, investor list (name masked except initials if you prefer), enquiries. |

## Admin

| Route | Page | What it must contain |
|---|---|---|
| `/admin` | Dashboard | KPIs (AUM, total users by role, live properties, funds raised this month, platform fees earned), charts (funds raised over time, properties by status), approval queues. |
| `/admin/properties` | All properties | Filter by status/broker/city; approve/reject with reason modal; change status; view detail. |
| `/admin/properties/:id/sell` | Record sale | Sale price input, fee preview, payout preview table per investor, confirm → executes distribution. |
| `/admin/users` | Users | Search, role filter, activate/deactivate, approve broker, view KYC. |
| `/admin/kyc` | KYC queue | Pending KYCs with document preview, approve/reject. |
| `/admin/withdrawals` | Withdrawals | Pending requests, approve/reject. |
| `/admin/settings` | Settings | Platform fee %, broker commission %, max ownership per investor %. |

## Shared

- Profile & change password
- Notifications dropdown/page
- 404 and 403 ("You don't have access") pages
- Global layout: role-aware sidebar, top bar with wallet balance (investor), notifications, avatar menu with logout

---

# 10. API Specification

## API conventions (apply to every endpoint)

- **Base URL:** `/api/v1`.
- All request/response bodies are JSON unless uploading files (`multipart/form-data`).
- **Auth header:** `Authorization: Bearer <accessToken>` (or an httpOnly cookie - pick one and be consistent).
- **Success shape:**

```json
{ "success": true, "data": "...", "message": "..." }
```

- **Error shape:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": [
      "..."
    ]
  }
}
```

- **Status codes:** `200 OK`, `201 Created`, `400 Validation`, `401 Unauthenticated`, `403 Forbidden (wrong role)`, `404 Not found`, `409 Conflict`, `429 Too many requests`, `500 Server error`.
- **List endpoints** support `?page=1&limit=20&sort=-createdAt&search=...` and return `{ items, page, limit, total, totalPages }`.

## Auth

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create investor/broker. Body: name, email, phone, password, role |
| POST | `/auth/login` | Public | Returns access token (+ refresh cookie) and user |
| POST | `/auth/logout` | Auth | Invalidate refresh token / clear cookie |
| GET | `/auth/me` | Auth | Current user profile |
| POST | `/auth/forgot-password` | Public | Send reset email (P1) |
| POST | `/auth/reset-password/:token` | Public | Set new password (P1) |

## Properties

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/properties` | Public | Marketplace list. Query: `city`, `type`, `minPrice`, `maxPrice`, `status`, `search`, `sort`, `page`, `limit` |
| GET | `/properties/:id` | Public | Detail incl. `unitsSold`, `fundingPct`, `investorCount` |
| POST | `/properties` | Broker, Admin | Create DRAFT (multipart for images/docs or pre-uploaded URLs) |
| PATCH | `/properties/:id` | Owner broker, Admin | Update (rules depend on status) |
| POST | `/properties/:id/submit` | Owner broker | DRAFT/REJECTED → PENDING_APPROVAL |
| POST | `/properties/:id/approve` | Admin | → LIVE |
| POST | `/properties/:id/reject` | Admin | → REJECTED, body: `reason` |
| POST | `/properties/:id/status` | Admin | FUNDED → HOLDING, LIVE → CANCELLED (with refunds) |
| POST | `/properties/:id/sell` | Admin | Body: `salePrice`. Computes + credits payouts → SOLD |
| GET | `/properties/:id/payout-preview?salePrice=` | Admin | Preview distribution without committing |
| GET | `/properties/:id/investors` | Owner broker, Admin | Investors and their units |
| GET | `/broker/properties` | Broker | My listings with stats |

## Investments, wallet, portfolio

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/investments` | Investor (KYC ok) | Body: `propertyId`, `units`. Atomic: check remaining units & wallet, debit, create investment, update property |
| GET | `/investments/me` | Investor | All my investments |
| GET | `/portfolio/summary` | Investor | Totals, ROI, allocation data for charts |
| GET | `/wallet` | Investor | Balance (derived from ledger) |
| POST | `/wallet/topup/order` | Investor | Create gateway order (Razorpay test) |
| POST | `/wallet/topup/verify` | Investor | Verify signature → credit ledger |
| POST | `/wallet/withdraw` | Investor | Create withdrawal request |
| GET | `/transactions` | Auth | Own ledger (admin: all). Filters: type, date range |

## Admin, KYC, enquiries, notifications

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/admin/stats` | Admin | Dashboard KPIs & chart series |
| GET | `/admin/users` | Admin | List / filter users |
| PATCH | `/admin/users/:id` | Admin | `isActive`, role, brokerApproved |
| POST | `/kyc` | Investor | Upload KYC docs |
| PATCH | `/admin/kyc/:userId` | Admin | approve / reject + reason |
| GET / PATCH | `/admin/withdrawals[/:id]` | Admin | List / approve / reject |
| GET / PATCH | `/admin/settings` | Admin | Fee %, commission %, max ownership % |
| POST | `/enquiries` | Investor | `propertyId`, message |
| GET | `/enquiries` | Investor, Broker | Own / for own properties |
| POST | `/enquiries/:id/reply` | Broker, Investor | Add message to thread |
| GET / PATCH | `/notifications[/:id/read]` | Auth | List, mark read |

## Sample: `POST /api/v1/investments`

### Request

```http
POST /api/v1/investments
Authorization: Bearer <investor token>
Content-Type: application/json
```

```json
{ "propertyId": "66f1c2...", "units": 20 }
```

### 201 Created

```json
{
  "success": true,
  "data": {
    "investment": {
      "_id": "6702ab...",
      "units": 20,
      "amount": 20000000,
      "ownershipPct": 2.0,
      "status": "ACTIVE"
    },
    "property": {
      "unitsSold": 470,
      "fundingPct": 47.0,
      "status": "LIVE"
    },
    "walletBalance": 30000000
  },
  "message": "You now own 2% of 2BHK, Sector 150, Noida"
}
```

### 409 Conflict - not enough units left

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_UNITS",
    "message": "Only 12 units remain"
  }
}
```

---

# 11. Database Design (MongoDB)

> **IMPORTANT - Money rule**
>
> Store all money as integers in paise (₹1 = 100). Never use floating point for money. Format to rupees only in the UI.

## `users`

| Field | Type | Notes |
|---|---|---|
| `name, email, phone` | String | email unique, lowercase, indexed |
| `passwordHash` | String | bcrypt, select: false |
| `role` | enum | `ADMIN \| BROKER \| INVESTOR` |
| `isActive` | Boolean | default true |
| `brokerApproved` | Boolean | only for BROKER, default false |
| `kyc` | Object | `{ status: NOT_SUBMITTED\|PENDING\|APPROVED\|REJECTED, docs: [url], reason }` |
| `createdAt / updatedAt` | Date | timestamps: true |

## `properties`

| Field | Type | Notes |
|---|---|---|
| `title, description, type` | String | type: `APARTMENT \| VILLA \| COMMERCIAL \| PLOT \| WAREHOUSE` |
| `address, city, state, pincode, geo` | String / Object | geo: `{ lat, lng }` for map |
| `areaSqft` | Number | |
| `images[], documents[]` | Array / Object | `[{url, publicId, name}]`; Cloudinary |
| `valuation` | Number (paise) | e.g. `1000000000` for ₹1 Cr |
| `totalUnits, unitPrice` | Number | `unitPrice = valuation / totalUnits` (must divide exactly) |
| `minUnits, maxUnitsPerInvestor` | Number | |
| `unitsSold` | Number | default 0; updated atomically with `$inc` |
| `expectedAppreciationPct, rentalYieldPct, holdingPeriodMonths` | Number | used by return calculator |
| `status` | enum | `DRAFT \| PENDING_APPROVAL \| LIVE \| FUNDED \| HOLDING \| SOLD \| REJECTED \| CANCELLED` |
| `rejectionReason` | String | |
| `brokerId, approvedBy` | ObjectId → users | indexed |
| `salePrice, soldAt, fundedAt, liveAt` | Number / Date | |

## `investments`

| Field | Type | Notes |
|---|---|---|
| `investorId, propertyId` | ObjectId | compound index `{ investorId, propertyId }` |
| `units, amount` | Number | `amount = units × unitPrice` (paise) |
| `status` | enum | `ACTIVE \| EXITED \| REFUNDED` |
| `payoutAmount` | Number | filled on sale |

> **Tip:** one investor may invest in the same property multiple times. Either keep multiple investment documents and aggregate, or keep a separate holdings collection `{ investorId, propertyId, units }` that is upserted.

## `transactions` (ledger - append only)

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | whose wallet is affected |
| `type` | enum | `TOPUP \| INVESTMENT \| PAYOUT \| REFUND \| COMMISSION \| WITHDRAWAL \| FEE` |
| `direction` | enum | `CREDIT \| DEBIT` |
| `amount` | Number (paise) | always positive |
| `balanceAfter` | Number | snapshot for easy statements |
| `refType, refId` | String, ObjectId | e.g. `('Investment', id)` - links ledger row to its cause |
| `gatewayPaymentId` | String | for TOPUP; unique to prevent double credit |

## Other collections

| Collection | Key fields |
|---|---|
| `payouts` | `propertyId, salePrice, platformFee, distributable, items: [{ investorId, units, amount }], executedBy, executedAt` |
| `withdrawals` | `userId, amount, status (PENDING \| APPROVED \| REJECTED), bankDetails (dummy), processedBy` |
| `enquiries` | `propertyId, investorId, brokerId, messages: [{ from, text, at }], status` |
| `notifications` | `userId, type, title, body, link, read` |
| `settings` | `platformFeePct, brokerCommissionPct, maxOwnershipPct` (single document) |

## Relationships

### ER overview

```text
users (BROKER) 1 ────< properties
users (INVESTOR) 1 ──< investments >── 1 properties
users 1 ──< transactions (refId → investment / payout / withdrawal)
properties 1 ── 0..1 payouts ──< items (per investor)
```

---

# 12. Business Rules, Calculations & Edge Cases

## Formulas / calculations

```text
unitPrice = valuation / totalUnits                       // must be an integer (paise)
amount = units * unitPrice
ownershipPct = units / totalUnits * 100
fundingPct = unitsSold / totalUnits * 100
projectedValue = amount * (1 + appreciationPct/100) ^ years   // calculator only
platformFee = salePrice * platformFeePct / 100
distributable = salePrice - platformFee
payout(investor) = floor(distributable * investorUnits / totalUnits)
remainder = distributable - sum(payouts)                  // give to largest holder
ROI% = (payout - invested) / invested * 100
```

## Rules

- An investment is only allowed when `property.status = LIVE`, investor KYC = `APPROVED` (if KYC implemented), user is active, `units ≥ minUnits`, `units ≤ remaining units`, investor's total units in this property ≤ `maxUnitsPerInvestor`, and wallet balance ≥ amount.
- Wallet debit, investment creation and `unitsSold` increment must succeed or fail together (MongoDB transaction / session).
- Use a conditional atomic update to prevent overselling:

```js
findOneAndUpdate(
  { _id, status: 'LIVE', unitsSold: { $lte: totalUnits - units } },
  { $inc: { unitsSold: units } }
)
```

If it returns `null`, someone else got the units first → `409`.

- When `unitsSold === totalUnits` after an investment, in the same transaction set status `FUNDED`, `fundedAt`, and credit broker commission.
- Valuation / units / unit price are immutable once any investment exists.
- Sale can only be executed once (idempotent): check status = `HOLDING` and that no payout document exists.
- Cancelling a LIVE property refunds every investor 100% to wallet with REFUND ledger entries.
- Wallet balance is never stored as a free-editable field - it is derived from (or kept in sync with) the ledger.
- Top-up verification must check the gateway signature and reject a reused `gatewayPaymentId`.

## Edge cases you must handle

| Scenario | Expected behaviour |
|---|---|
| Two investors buy the last 10 units at the same moment | Exactly one succeeds; the other gets 409 with remaining units. |
| Investor double-clicks “Confirm” | Button disabled while pending; server uses an idempotency key or the atomic check. |
| Broker edits valuation after investments | 403 with clear message. |
| Admin clicks “Execute payout” twice | Second call returns 409 `ALREADY_SOLD`; no double credit. |
| Investor tries `POST /properties/:id/approve` | 403 `FORBIDDEN`. |
| Broker opens another broker's property analytics | 403 or 404. |
| Deactivated user with valid token | 401 - check `isActive` in auth middleware. |
| Sale price lower than valuation (loss) | Allowed; ROI shows negative in red. |
| Units that don't divide valuation | Validation error on create: choose units so `unitPrice` is a whole rupee. |

---

# 13. UI / UX & Design System

**Theme:** trustworthy, premium fintech. Think clean whitespace, confident numbers, calm colours. The investor should feel their money is safe. Use a light theme by default; dark mode is a bonus.

## Colour system

| Token | Hex | Use |
|---|---|---|
| Primary - Deep Navy | `#0F2A4A` | Sidebar, headings, primary buttons |
| Accent - Emerald | `#10B981` | Positive returns, success, funded |
| Gold | `#D4A017` | Premium badges, highlights |
| Background | `#F7F8FA` | App background |
| Surface | `#FFFFFF` | Cards, tables |
| Danger | `#DC2626` | Negative ROI, rejection, errors |
| Warning | `#F59E0B` | Pending approval, KYC pending |
| Text | `#111827` | Primary text (secondary: `#6B7280`) |

## UI guidelines

| Element | Guideline |
|---|---|
| Typography | Headings: Inter / Plus Jakarta Sans 600–700. Body: Inter 400. Numbers: tabular figures (`font-variant-numeric: tabular-nums`). |
| Money format | Indian grouping: ₹1,00,00,000. Use `Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' })`. Show L / Cr abbreviations in cards (₹1.4 Cr). |
| Status chips | DRAFT grey, PENDING amber, LIVE blue, FUNDED emerald, HOLDING purple, SOLD navy, REJECTED red. |
| Charts | Recharts / Chart.js: allocation donut, funds-raised line chart, funding progress bars. |
| Tables | Sticky header, sortable columns, pagination, empty-state illustration, row hover. |
| Forms | Multi-step with progress indicator, inline validation, auto-calculated read-only fields (unit price). |
| Feedback | Confirm modals for money actions, success screens with confetti on first investment (optional), toasts. |
| Spacing / radius | 8-pt spacing scale; card radius 12–16px; subtle shadows. |

## Design principles to follow

- **Clarity over decoration** - a user must understand their ownership % and returns within 3 seconds.
- **Consistency** - one button style per intent, one chip colour per status, across all three dashboards.
- **Visibility of system status** - always show funding progress, pending states and confirmations.
- **Error prevention** - disable invest when wallet is short; show exactly how much more is needed.
- **Accessibility** - colour contrast ≥ 4.5:1, focus rings, labels on every input, never colour alone for status.

---

# 14. Authentication & Security

- bcrypt (cost 10–12) for passwords; strong password policy (8+ chars, number, symbol).
- JWT access token (15 min – 1 day). Refresh token in httpOnly, secure, sameSite cookie (P2).
- Middleware chain:

```text
authenticate → requireRole('ADMIN') → requireOwnership → validate(schema) → controller
```

- Rate-limit `/auth/*` and `/investments` (`express-rate-limit`).
- `helmet`, CORS restricted to your frontend origin, `express-mongo-sanitize` against NoSQL injection.
- Never trust amounts from the client - the server computes `amount = units × unitPrice`.
- File uploads: whitelist MIME types (jpg/png/webp/pdf), max size (5 MB), upload to Cloudinary, store URL only.

---

# 15. Tech Stack & Libraries

| Layer | Required | Recommended libraries |
|---|---|---|
| Frontend | React (Vite) or Next.js | React Router / App Router, TanStack Query or Redux Toolkit, Tailwind CSS + shadcn/ui, React Hook Form + Zod, Recharts, Framer Motion, react-hot-toast, Swiper (gallery) |
| Backend | Node.js + Express | Mongoose, jsonwebtoken, bcrypt, zod/joi, multer + Cloudinary SDK, express-rate-limit, helmet, cors, morgan, nodemailer |
| Database | MongoDB (Atlas) | Replica set (Atlas default) so multi-document transactions work |
| Payments | Test mode only | Razorpay test mode or Stripe test mode; a clearly labelled mock gateway is acceptable |
| Deploy | Vercel / Netlify (frontend), Render / Railway (backend), Atlas (DB) | |

---

# 16. Suggested Folder Structure

## Repository layout

```text
fractional-estate/
├─ client/
│  ├─ src/
│  │  ├─ api/            axios instance, endpoint functions
│  │  ├─ components/     ui/ (buttons, cards, chips), charts/, property/
│  │  ├─ layouts/        PublicLayout, DashboardLayout (role-aware sidebar)
│  │  ├─ pages/          public/, investor/, broker/, admin/
│  │  ├─ hooks/          useAuth, useProperties, usePortfolio
│  │  ├─ context/ | store/
│  │  ├─ routes/         ProtectedRoute, RoleRoute
│  │  └─ utils/          formatINR, calc.js
│  └─ .env.example
└─ server/
   ├─ src/
   │  ├─ config/        db.js, cloudinary.js, env.js
   │  ├─ models/        User, Property, Investment, Transaction, Payout, ...
   │  ├─ routes/        auth, properties, investments, wallet, admin, ...
   │  ├─ controllers/
   │  ├─ services/      investment.service.js, payout.service.js, ledger.service.js
   │  ├─ middlewares/   auth, role, validate, error, rateLimit
   │  ├─ validators/    zod schemas
   │  └─ utils/         money.js, ApiError.js
   ├─ scripts/seed.js
   └─ .env.example
```

## `.env.example` (server)

```dotenv
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/fractional
JWT_SECRET=change_me
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=
PLATFORM_FEE_PCT=2
BROKER_COMMISSION_PCT=1
```

---

# 17. Team Division & Milestones

## Suggested team division

| Role in team | Owns |
|---|---|
| Backend lead | Models, investment & payout services (transactions), ledger, admin APIs |
| Frontend lead | Design system, layouts, marketplace, property detail, invest checkout |
| Full-stack #1 | Auth (both ends), role routing, broker module (create listing wizard, analytics) |
| Full-stack #2 | Admin module (dashboard, approvals, users, record sale with payout preview), charts |
| Everyone | Testing edge cases, seed data, README, demo video |

> Adapt to your team size - in smaller teams combine roles.

## Milestones

| Phase | Share of time | Done when… |
|---|---:|---|
| 0. Plan | ~5% | Repo created, `SPEC.md` committed, roles assigned |
| 1. Foundation | ~15% | Auth working end-to-end, models created, seed script, layouts with role routing, deployed skeleton |
| 2. Core flow | ~35% | Create → approve → marketplace → invest → FUNDED works with real DB |
| 3. Money | ~20% | Wallet top-up, ledger, sale & payouts, portfolio numbers correct |
| 4. Polish | ~15% | Dashboards, charts, empty/loading states, responsive, P1 items |
| 5. Ship | ~10% | Final deploy, README, video, `PROMPTS.md`, submission |

---

# 18. Vibe Coding Playbook

## How to vibe-code this well (general)

1. **Plan before you prompt.** Spend the first slice of time agreeing on the data models, the API list and the page list (this document already gives you most of it). Paste them into a `SPEC.md` in the repo so every AI session can read it.
2. **Scaffold first, features second.** Get an empty frontend talking to an empty backend talking to MongoDB, deployed, before building features.
3. **One feature per prompt.** Ask for the schema, then the route, then the UI. Giant “build the whole app” prompts produce code that breaks in ten places.
4. **Give the AI context.** Attach the relevant files and the spec. Tell it your stack, folder structure and conventions explicitly.
5. **Review every diff.** Read what the AI wrote. Run it. Test the unhappy paths (wrong password, empty form, unauthorised role).
6. **Commit after every working step** so you can roll back when a prompt breaks something.

## Starter prompts (adapt, don't copy blindly)

### `PROMPTS.md` (examples)

#### Prompt 1 - Models

> "I'm building a fractional real-estate investment platform with MERN.
> Read SPEC.md. Create Mongoose models for User, Property, Investment,
> Transaction, Payout, Withdrawal, Notification, Settings exactly as specified.
> Store money as integers in paise. Add indexes and timestamps."

#### Prompt 2 - Investment service

> "Write investment.service.js with a function invest(userId, propertyId, units)
> that runs in a MongoDB transaction: validate rules from SPEC.md section
> 'Business Rules', atomically increment unitsSold only if enough units remain,
> debit wallet via a DEBIT ledger entry, create the investment, and if the
> property is now fully sold set status FUNDED and credit broker commission.
> Throw ApiError with codes INSUFFICIENT_UNITS, INSUFFICIENT_BALANCE, etc."

#### Prompt 3 - Payout

> "Write payout.service.js: previewPayout(propertyId, salePrice) and
> executePayout(...). Use integer math, floor each share, assign remainder to
> the largest holder, and assert the sum equals distributable. Idempotent."

#### Prompt 4 - UI

> "Using React + Tailwind + shadcn/ui, build the Property Detail page: gallery,
> metrics card, funding progress bar, return calculator (amount -> ownership %
> -> projected value after N years) and an Invest button. Use our formatINR util."

---

# 19. Submission Format

Submit the following through the form / channel announced by your instructor before the deadline. Late or incomplete submissions are penalised.

| # | Deliverable | Details |
|---:|---|---|
| 1 | GitHub repository | Public (or shared with the evaluator). Default branch must contain the final code. Every team member must appear in the commit history. |
| 2 | `README.md` | Use the template below. Must include setup steps that work on a fresh machine. |
| 3 | `.env.example` | Every variable your app reads, with a one-line comment explaining it. No real secrets. |
| 4 | Live deployment | Frontend + backend URLs (Vercel / Netlify / Render / Railway). If deployment is not possible, a flawless local setup is mandatory. |
| 5 | Demo video (3–5 min) | Screen recording with voice-over covering every P0 feature end-to-end. Upload to Google Drive / YouTube (unlisted) and share the link. |
| 6 | Test credentials | One account per role, listed in the README (e.g. `admin@demo.com / Admin@123`). |
| 7 | `PROMPTS.md` | The 10–20 most important prompts your team used, in order, with a one-line note on what each produced. |
| 8 | Concurrency proof | In the demo video, show what happens when two investors try to buy the last units (two browser windows). |
| 9 | Postman collection | Exported collection or Swagger UI link covering all endpoints. |

---

# 20. Evaluation Rubric (100 marks)

| Criterion | What evaluators check | Marks |
|---|---|---:|
| Authentication & RBAC | All three roles, protected routes, server-side role + ownership checks, deactivation | 15 |
| Property lifecycle | All statuses and legal transitions, approval/rejection with reason, listing wizard | 15 |
| Investment engine | Correct ownership %, atomic over-funding prevention, wallet debit, auto-FUNDED | 15 |
| Payout & ledger | Correct distribution (sums exactly), fees, commission, idempotency, transaction history | 15 |
| Dashboards | Investor portfolio & charts, broker analytics, admin KPIs and queues | 10 |
| UI / UX quality | Design system consistency, responsiveness, loading/empty/error states, money formatting | 10 |
| Code quality & architecture | Structure, services layer, validation, error handling, env config | 8 |
| Deployment & documentation | Live links, README, `.env.example`, seed data, Postman | 5 |
| Viva & `PROMPTS.md` | Every member can explain their part; prompt log quality | 7 |
| Bonus (max +10) | Secondary market, rental distribution, email notifications, refresh tokens, audit log, dark mode | +10 |

---

# 21. Hints

> **TIP · Hint 1 - Let the ledger be the source of truth**
>
> Write one helper `ledger.post({ userId, type, direction, amount, ref })` and route every money movement through it. Wallet balance, statements, admin revenue and investor payouts all become simple aggregation queries, and debugging becomes easy.

> **TIP · Hint 2 - Solve over-funding with one atomic query**
>
> You don't need locks. A `findOneAndUpdate` whose filter includes `unitsSold: { $lte: totalUnits - units }` and whose update is `$inc` is atomic in MongoDB. Wrap it with the wallet debit in a session transaction (Atlas clusters support this out of the box).

> **TIP · Hint 3 - Build the payout preview first**
>
> Write `previewPayout()` as a pure function (no DB writes) and show its output in a table on the Admin “Record sale” screen. Once the numbers look right, `executePayout()` just persists what preview computed. Unit-test it with the ₹1 Cr example in this document.

---

# 22. Common Mistakes to Avoid

- Storing money as floats (`₹0.1 + ₹0.2 ≠ ₹0.3`) - use paise integers.
- Calculating amount on the frontend and trusting it on the backend.
- Updating `unitsSold` with read-modify-write (find → +units → save) - race condition.
- Role checks only in React (hiding buttons) and not in Express.
- One massive `Dashboard.jsx` shared by all roles with if-else everywhere - use separate pages + shared components.
- Forgetting empty states: a new investor's portfolio must look good with zero investments.
- No seed data - the evaluator should not have to create 20 records to test you.

---

# 23. FAQ & Extra Information

| Question | Answer |
|---|---|
| Do we need a real payment gateway? | No. Razorpay/Stripe test mode is preferred; a clearly labelled mock “Add money” is acceptable for P0. |
| Is KYC real? | No. Upload any dummy image/PDF. Never use real ID numbers in seed data. |
| Can Admin also invest? | No. Keep roles clean. One email = one role. |
| What if a property never gets fully funded? | Admin can CANCEL it; all investors are refunded to wallet (P0 if you implement `CANCELLED`). |
| Next.js or React? | Either. If Next.js, you may use Route Handlers instead of Express, but keep the same API contract. |
| How many properties in seed data? | At least 8 across statuses (2 LIVE partly funded, 1 FUNDED, 1 HOLDING, 1 SOLD, 1 PENDING, 1 REJECTED, 1 DRAFT) with 5+ investors. |

> **NOTE - Disclaimer for the app**
>
> Add a footer note: **“This is an academic project. No real money or securities are involved.”**

---

## Source fidelity notes

- Converted from the supplied 25-page PDF, preserving section ordering, tables, API contracts, formulas, code/config examples, workflows, and evaluation requirements.
- Page-oriented decorative headers/footers and page numbers are omitted from the Markdown body because they are layout artifacts rather than document content.
