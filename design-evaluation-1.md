# Evaluation — Attempt 1

## Overall Verdict: PASS

## Overall Assessment

ESTORA establishes a coherent editorial property brand: oversized navy typography, restrained gold rules, architectural illustration, and spacious white financial panels. The public experience and role workspaces feel deliberately related, and the application renders real API-backed data across the principal investor, broker, and administrator tasks. The direction passes the prescribed design thresholds; several accessibility and financial-label refinements remain advisable before treating the interface as fully polished.

## Scores

| Criterion | Score | Status | Weight | Notes |
|-----------|-------|--------|--------|-------|
| Design Quality | 2/3 | PASS | HIGH | Strong consistent navy/emerald/gold palette, quiet borders, editorial hero and clearly structured financial summaries. The role dashboards retain the brand without overwhelming operational tasks. |
| Originality | 2/3 | PASS | HIGH | Custom architectural art, serif italic hero emphasis, gold initial monogram, asymmetric hero composition, and numbered process layout show deliberate creative intent beyond library defaults. |
| Craft | 1/3 | PASS | MEDIUM | Responsive stacking works and no page-level horizontal overflow was observed in the inspected views. However, mobile KPI sublabels shrink to 8px, data tables rely on undisclosed internal horizontal scrolling, and the closed navigation drawer remains accessible offscreen. |
| Functionality | 1/3 | PASS | MEDIUM | Login, dashboard data, portfolio, checkout review, sale preview and wizard validation work. Financial-state labeling is incomplete in the allocation legend, and the authenticated marketplace default label disagrees with the returned statuses. |

## Inspection Scope

- Browser inspection at 1440×900 desktop, 768×900 tablet, and 375×812 mobile.
- Scrolled public landing, marketplace and property detail; inspected investor overview/portfolio/checkout confirmation, administrator overview/sale preview, and broker overview/new-listing wizard.
- Signed in using the supplied demo accounts for all three roles against the running API and disposable database.
- Checked actual sale-preview API rendering using a ₹1,50,00,000 example; confirmed four ₹36,75,000 investor payouts and ₹3,00,000 platform fee. Did not execute the sale or an investment.
- Verified empty-document presentation and listing-form validation; read route definitions, shared loading/error primitives, guards, chart components and financial forms for coverage evidence.
- This is a design and representative usability evaluation, not a certification of every backend invariant or every mutation on every route. Media upload, password reset, KYC decisions, withdrawal completion, and all lifecycle executions were not exercised here.

## What's Working Well

- The desktop hero uses meaningful scale and contrast: large navy lines, a soft green italic final line, restrained copy width, and a local illustration with a translucent caption and gold accent. It looks specific to ESTORA.
- Property cards separate unit cost, annual expected appreciation and funding progress. Status chips retain text as well as colour; fully funded progress changes to emerald.
- Financial values use Indian grouping and tabular figures. Checkout shows unit price, incremental ownership, investment amount, projected value, wallet available, and balance after together. Projection copy explicitly excludes sale fees and avoids guarantees.
- On mobile property detail, the investment panel precedes long descriptive content, keeping price and availability discoverable.
- The sale screen requires a verified preview, includes an exact distribution check, and blocks execution when the input no longer matches the preview. Its confirmation is separate from the preview action.
- Form controls have visible labels; shared dialogs provide a title, focus management, Escape handling, and a visible way back. Validation errors appear beside wizard fields and in a toast.
- Skeleton, empty, error/retry and toast primitives are implemented. Principal public, investor, broker, administrator and shared routes are present in `client/src/App.jsx`, including Phase 2 reset, enquiries, notifications and profile routes.

## Issues Found

### Issue 1: Closed mobile navigation remains keyboard and screen-reader accessible

- **What**: At 375px the drawer is moved with `transform: translateX(-100%)`, but its links and buttons remain in the accessibility tree with `tabIndex: 0`. The inspected closed administrator drawer contained thirteen focusable links/buttons. Opening it also lacks modal focus containment and focus restoration to the trigger.
- **Where**: `client/src/layouts/Layouts.jsx`, `DashboardLayout`; mobile `.sidebar` CSS.
- **Why it matters**: Keyboard users can tab into controls they cannot see, and assistive-technology users encounter navigation even when the interface presents it as closed.
- **Suggested fix**: Hide/inert the closed mobile drawer, retain normal desktop accessibility, add `aria-expanded`/`aria-controls` to the trigger, and use dialog-like focus handling while the mobile drawer is open. Restore focus to the trigger after closing.

### Issue 2: Allocation legend describes exited property as current ownership

- **What**: The portfolio donut correctly includes historical allocations, but its legend labels The Courtyard Collection as “25.00% ownership” with ₹35.0 L and no EXITED/SOLD marker. The holdings table below correctly marks it Exited/Sold.
- **Where**: `client/src/components/ui.jsx`, `Allocation`; `client/src/pages/investor/Portfolio.jsx`.
- **Why it matters**: Above the table, a reader can interpret a completed exit as property they still own. The brief explicitly requires active/exited distinction.
- **Suggested fix**: Label the chart as historical invested allocation and put Active/Exited/Refunded state in each legend row. Use “ownership at exit” for exited records, or separate active and historical allocations with clear section labels.

### Issue 3: Authenticated marketplace default status label is inaccurate

- **What**: The default selected status option reads “Live & funded”, but the authenticated marketplace rendered five results including HOLDING and SOLD properties. The server intentionally broadens its authenticated default; the interface keeps the unauthenticated label.
- **Where**: `client/src/pages/public/Properties.jsx`, `Marketplace` status select.
- **Why it matters**: Users cannot trust the selected filter as an explanation of the results shown, particularly when evaluating availability to invest.
- **Suggested fix**: Use “All published properties” for the authenticated default, or explicitly request the same LIVE/FUNDED set that the option promises. If showing historical statuses, offer matching HOLDING and SOLD filter options.

### Issue 4: Important mobile financial metadata is excessively small

- **What**: `.kpi > small` becomes 8px below 500px; several financial labels are 9–10px. Transaction and payout tables need horizontal scrolling at 375px but have no explicit scroll affordance.
- **Where**: `client/src/index.css`, mobile KPI/table rules; shared `Table` component.
- **Why it matters**: “Active positions”, “Illustrative appreciation”, “Completed exits” and similar qualifiers determine what the numbers mean. They should be readable without zoom. Hidden balance/payout columns should be discoverable.
- **Suggested fix**: Keep meaningful metadata at least 11–12px on mobile; allow taller KPI cards. Add a short “Scroll to view all columns” cue and a keyboard-focusable labelled scroll region, or show a compact mobile transaction summary with expandable detail.

### Issue 5: Public statistic overstates an unmeasured assurance

- **What**: The landing page renders a static “100% Ledger accountability” beside API-derived funding/investor/property statistics.
- **Where**: `client/src/pages/public/Properties.jsx`, landing statistics strip.
- **Why it matters**: A numeric assurance looks measured like adjacent metrics but has no API evidence. The brief asks for no fabricated frontend data.
- **Suggested fix**: Make it a qualitative statement such as “Every transaction recorded”, or surface a real reconciliation metric with a clear scope and timestamp.

## Priority Fixes for Next Attempt

1. Make the mobile navigation drawer correctly hidden/inert when closed and give it complete keyboard focus handling when opened.
2. Label historical portfolio allocations and authenticated marketplace statuses accurately.
3. Raise mobile financial qualifiers to readable sizes, expose table scrolling, and replace the static 100% assurance with qualitative copy.

## Should the next attempt REFINE or PIVOT?

REFINE. The editorial identity, hierarchy and responsive structure are sound and meet both high-weight thresholds. The remaining improvements concern access, truthful labels and mobile readability; they do not require changing the visual direction.
