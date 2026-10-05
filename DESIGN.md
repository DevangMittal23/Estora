---
version: alpha
name: ESTORA
description: A contemporary Indian real-estate investment brochure with a calm private-wealth workspace.
colors:
  primary: "#073B35"
  secondary: "#0B2926"
  sidebar: "#042E29"
  background: "#FBF9F5"
  sand: "#F5F0E8"
  surface: "#FFFEFB"
  text: "#171717"
  muted: "#6E6A62"
  gold: "#B8893D"
  lightGold: "#D8B875"
  investment: "#167C62"
  success: "#238B6D"
  danger: "#B94A48"
  warning: "#C98A32"
  border: "#E7E1D7"
typography:
  display:
    fontFamily: "'DM Serif Display', Georgia, serif"
  sans:
    fontFamily: "Manrope, sans-serif"
  heading:
    fontFamily: "Manrope, sans-serif"
rounded:
  card: "12px"
  control: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  panel: "28px"
  xxl: "32px"
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    typography: "{typography.sans}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
  navigation:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.surface}"
  page:
    backgroundColor: "{colors.background}"
  quiet-section:
    backgroundColor: "{colors.sand}"
  muted-copy:
    textColor: "{colors.muted}"
  featured-accent:
    textColor: "{colors.gold}"
  dark-accent:
    textColor: "{colors.lightGold}"
  funding:
    backgroundColor: "{colors.investment}"
  success:
    textColor: "{colors.success}"
  error:
    textColor: "{colors.danger}"
  warning:
    textColor: "{colors.warning}"
  divider:
    backgroundColor: "{colors.border}"
---

# ESTORA Design System

## Overview

The visual reference is a luxury Indian property brochure paired with a private-wealth portal. The user confirmed forest green and ivory while retaining “Own a share. See the bigger picture.” on 2026-10-04. This is the local review candidate, not authorization to publish it.

Public discovery and authentication use editorial composition and architectural imagery. Investor, broker and administrator routes prioritize readable financial data and familiar controls. The audience is English-speaking users exploring Indian property investment; rupee amounts and dates follow the existing en-IN formatters. This is an academic demonstration with test funds and dummy identity documents.

Avoid neon, technology gradients, excessive glass, invented compliance badges, fake performance history and decorative motion. A cinematic architecture image, restrained gold and a warm off-white brochure overlay carry the brand; tables, forms and financial operations remain calm.

Token ownership is Model B: client/src/premium.css is the canonical runtime design layer, client/src/index.css supplies base styling, and shared components consume those values. This document mirrors the accepted palette and records its intent. It does not generate CSS. Original requirements and design specifications remain intact.

## Colors

A lighter near-white ivory (#FBF9F5), soft sand (#F5F0E8), warm white surfaces (#FFFEFB) and pale borders (#E7E1D7) unify public pages and every authenticated workspace. The landing hero uses a more transparent ivory wash so the architecture remains visible through the left and middle, with a restrained top wash for navigation readability. Forest and emerald belong to navigation, primary actions, selected focal strips and the footer. Champagne gold highlights featured content and important information sparingly. Smaller gold text and semantic labels may use darker derived shades to preserve contrast. Status text and icons accompany colors.

Runtime mapping: palette entries map to semantic CSS variables in premium.css; index.css base variables mirror the same roles. Shared chart palette, tooltip and toast styling are visual adapters in components/ui.jsx and App.jsx. Charts use a restrained forest/bronze/gold palette, legible axes and honest annotations. This is one fixed light theme with dark brand surfaces, without a theme-switching feature.

## Typography

Use elegant serif display typography for marketing and page identity, with clean sans-serif for controls, body text, dense tables and financial figures. Preserve tabular numerals and nowrap monetary cells. The hero tagline is exact across responsive line breaks; words must use real whitespace, never CSS-generated separators.

The visitor landing headline alone uses locally hosted Cormorant Garamond 600 with a true italic gold accent; the shared ESTORA wordmark uses locally hosted Cinzel 600. These scoped font faces in premium.css leave body and other page typography unchanged. Latin WOFF2 files and their SIL Open Font Licenses live in client/public/assets/fonts. The original nested-roof architectural mark is vector geometry in the shared Logo and client/public/assets/estora-mark.svg, with a matching favicon.

## Layout

The marketing hero is image-led and editorial. Cards show original property media with a clear information hierarchy. Main content uses warm surfaces and generous but useful spacing. Role pages have a deep evergreen sidebar with subtly lighter forest selected rows, a light header and ivory canvas. Existing navigation changes at 768px. Tables scroll horizontally without losing fields or actions; forms retain natural document height. Verify 320, 360, 390, 768, 1024, 1440 and 1920px.

## Elevation & Depth

Use thin warm borders and small shadows to distinguish actionable surfaces. Opaque foreground authentication forms sit over architectural imagery. Financial panels are opaque. Avoid glow, blur-heavy glass, repeated nested cards and gradient buttons. Existing uploaded media and privacy rules remain unchanged; concept imagery is labelled illustrative.

## Shapes

Controls use restrained corners, and brochure/content panels use shared surface radius tokens around 10–12px. Avoid oversized pills. Keep input, button and modal shapes consistent. Architectural line motifs may be subtle decoration and must not reduce readability.

## Components

### Canonical UI map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select inside client/src/components/ui.jsx Field and existing role forms | docs/requirements.md, existing forms | native, OS-owned popup geometry | client/src/test/forms.test.jsx and browser keyboard inspection |
| Date | Existing native date fields in role pages | docs/requirements.md, existing date filtering | native, existing en-IN display formatting | client/src/test/workflows.test.jsx and browser inspection |
| Form | client/src/components/ui.jsx Field/Button with existing React Hook Form/Zod adapters | docs/requirements.md and role schemas | auth, draft wizard, shared profile, KYC, financial review | client/src/test/forms.test.jsx and client/src/test/workflows.test.jsx |
| Scrollbar | client/src/premium.css and client/src/index.css | Existing natural document and table scroll ownership | global, horizontal table overflow | browser computed styling and responsive inspection |
| Toast | client/src/App.jsx react-hot-toast provider and client/src/api.js mutation feedback | Existing shared feedback system | success, error | client/src/test/workflows.test.jsx |
| CRUD | Existing role page modules, router guards and HTTP services | docs/requirements.md, docs/design.md, IMPLEMENTATION.md | saved draft, continue wizard, submit for review, existing role actions | client/src/test/workflows.test.jsx and server/tests/platform.test.js |

The maintained behavioral equivalents are docs/requirements.md, docs/design.md and IMPLEMENTATION.md. The user explicitly preserves routing, authentication, API integration, calculations and existing actions. This visual pass does not adopt new pagination, URL state, search timing, confirmation, textarea resizing, date-picker or session behavior from generic defaults.

### Foundational visual states

Keep idle, hover, visible keyboard focus, selected, disabled and busy states coherent. Use text-associated validation and existing loading skeletons, empty guidance, error/retry surfaces and success feedback. Existing controlled forms, labels, native inputs and duplicate-submit protection remain canonical.

### Buttons and actions

Forest-filled buttons are primary actions. Champagne is a restrained premium emphasis. Secondary actions use outlines or text. Preserve action labels and busy geometry. Destructive actions remain semantically distinct and retain existing confirmations.

### Navigation and data display

Public navigation and role sidebars belong to the same brand. Role sidebars use deep evergreen #042E29, darker than the primary button forest, with warm-white labels and subdued light icons. Selected rows use #104139 with a champagne edge and icon; calm hover rows use #0B3A33. The scoped --sidebar-forest token in premium.css owns this navigation surface. Sidebar dimensions, navigation and mobile drawer behavior remain unchanged. Authenticated users keep the workspace on public routes. Back navigation excludes landing and role homepages. All current filters, list toggles, pagination, data tables, chart legends and full monetary values remain available.

Visitor navigation uses stronger forest text on light scenes and near-white text on auth photography; workspace header labels use the same readable forest ink. The notification bell always occupies a 44px light control with a 22px forest icon, whether unread count is zero or positive. Its compact forest badge sits above the bell without obscuring the icon.

All visitor routes use a transparent header that scrolls with the document. Light marketplace, property detail and error pages keep the header in natural flow with forest links and icons. Landing overlays its existing warm architectural hero, whose top image treatment supports dark navigation; hero content reserves header space. Authentication overlays the continuous conceptual estate photograph with ivory links and menu icons, champagne architectural mark and gold CTA. Contrast scrims belong to the scene rather than the transparent header. The mobile menu opens as an opaque ivory panel with forest text above content, and the CTA stays on one line at 320px. Back and form content reserve space below the auth overlay. The authenticated workspace retains its light header alongside the deeper evergreen sidebar.

Landing-only polish tightens the eyebrow, description and trust rhythm, makes the secondary CTA a clear quiet link, and refines the existing ownership inset with a fine gold top edge and restrained shadow. These .landing-layout rules preserve all headline fonts, imagery, content and authenticated home styling.

### Forms and overlays

Login, signup and password recovery use the original illustrative estate image at client/public/assets/estora-auth-estate.webp, supporting side text and a fully opaque off-white foreground form. The architectural scene starts directly beneath the navbar; the existing Back control sits within the scene without a separate blank strip. Desktop side copy aligns with the form, while mobile uses a compact architectural introduction above it. Other forms use warm light panels. Shared dialogs retain focus trap, Escape, scroll ownership and focus restoration. Native select/date popup geometry remains platform-owned. Textarea resizing remains the existing user affordance for this presentation-only pass.

### Iconography and motion

Use existing Lucide architectural/financial line icons with text labels. Allow brief CSS transitions and subtle image/card hover movement, with no constant animation or new animation dependency. Respect prefers-reduced-motion and forced-colors/system accessibility.

### Content and data visualization

Use actual API data. Do not invent rental distribution, grade/RERA certifications, bank security claims, starting-price floors, upcoming payouts, approval guarantees or investment performance. Retain academic, test-payment, dummy-document and estimated-projection disclosures. Generated architecture is conceptual; actual uploaded property and private KYC media retain their identity and access rules.

## Do's and Don'ts

- Do use the shared token and component owners for every role and state.
- Do prioritize clear figures, readable forms and thoughtful mobile composition.
- Do preserve the exact tagline and truthful funding-to-sale investment model.
- Do not replace real media with promotional imagery or alter business behavior for visual convenience.
- Do not add fake routes, certifications, yields, social sign-in, video or financial features from the reference collage.

Runtime mapping detail: colors.background → --ivory; colors.sand → --sand; colors.primary → --forest; colors.secondary → --emerald; colors.lightGold → --light-gold; remaining palette roles → same-name variables. typography.display → --display; typography.sans → --ui; typography.heading → --heading. rounded.card/control → --radius-card/control; spacing xs/sm/md/lg/xl/panel/xxl → --space-1/2/3/4/6/7/8. Motion uses --duration-fast 200ms, --duration-base 260ms and --ease cubic-bezier(0.22,1,0.36,1); card elevation uses --shadow-card 0 6px 24px #0B292608. DESIGN.md mirrors those runtime owners.
