# Validation evidence

This record distinguishes completed local verification from hosting-provider verification that still needs the deployed URLs.

## Completed local verification

| Check | Evidence | Result |
|---|---|---|
| Backend correctness and platform suites | Jest against a disposable MongoDB replica set, including 100-run financial/state properties | 40 tests passed |
| Client suite | Vitest and Testing Library | 73 tests passed |
| Static analysis | Server and client ESLint with zero warnings allowed | Passed |
| Production client build | Vite build | Passed |
| API audit | Public, role-scoped, invalid-input, permission, CORS and route checks against disposable API data | 63 checks passed |
| Browser smoke flow | Mock wallet top-up, one-unit investment, portfolio update, investor/broker/admin pages and responsive layouts | Passed |
| Independent design evaluation | Desktop, tablet and mobile rendered views | Pass |
| Same-browser multi-user sessions | Four tabs in one Chrome profile: admin, broker and two investors; reloads, independent logout and fresh-tab login | Passed |
| Concurrent browser transactions | Both investor tabs complete labelled mock top-ups and purchases simultaneously, with exact separate wallet credits/debits and investor IDs | Passed |
| Concurrent HTTP transactions | Eight investors purchase together; four wallets process concurrent duplicate payment confirmations; two purchases compete for one wallet balance | Passed |
| Listing draft to approval | Separate broker/admin tabs: persist one gallery image and two documents, resume Media, explain missing images, accumulate two selections, submit and approve | Passed |
| Saved property gallery | Save draft adds photos to the gallery; reload preserves them; Continue uses saved media; misplaced supporting photos move without reupload | Passed |
| Authenticated marketplace navigation | Admin, broker and investor retain workspace sidebar/header through marketplace, detail, refresh, shared pages and error routes; mobile menu and logout verified | Passed |

## Behavioural coverage represented by the suites

- Wallet balance reconciliation, conditional debits, exact payouts and cancellation refunds.
- Concurrent final-unit purchases and idempotent investment retries.
- Authentication, role checks, account activity checks, private KYC media and ownership enforcement.
- Property review flows, accessible notification links and participant-scoped enquiries.
- Client route guards, validation, dialogs, state reset after password recovery, pagination, media links and scrolling.
- Tab-specific authentication and purchase retry keys; old shared tokens are ignored.
- Stale profile/401 responses cannot overwrite or expire a newer account session, and
  old queries are cancelled when switching accounts.
- Independent CLI administrator creation, password protection and concurrent provisioning.
- Media selections accumulate across picker uses and can be removed; failed uploads retain
  selected files and the Media resume step. A retry after saving the Review step fails does
  not upload already-saved files again. Submission errors remain visible for retry.
- Supporting documents cannot satisfy the three-gallery-image requirement. Concurrent
  submission requests create one pending transition and one alert per active administrator;
  notification failures roll back the transition.

The multi-user browser run used a disposable API at `http://localhost:5010` and frontend
at `http://localhost:5180`. The four accounts shared one browser profile, so this verifies
tab isolation rather than relying on incognito windows or separate browser contexts.
Screenshots: [admin tab](../artifacts/multi-user-admin-tab.png) and
[investor tab](../artifacts/multi-user-investor-tab.png). Atlas was not changed by this run.

The listing browser check also used the disposable API at ports 5010/5180. It created a
complete listing through the wizard, saved one gallery image plus two supporting images,
reopened the draft, and confirmed that continuing requests two more gallery images. Files
chosen separately then accumulated and uploaded, restoring the Review step only after all
three images were saved. The final Submit action reached the already-open admin queue
without a page reload and created an in-app alert. Admin approval made the listing LIVE
and notified the broker. Screenshots: [Media validation](../artifacts/listing-media-validation.png),
[ready for review](../artifacts/listing-ready-review.png), and
[admin queue](../artifacts/listing-admin-queue.png). Only disposable data was changed.

A follow-up browser check moved the two existing supporting photos into Property images
using their original saved media IDs, then uploaded a fourth photo using Save draft.
Reload retained all four named gallery previews on Media; Save & continue reached Review
without another upload. Submission and admin approval were verified again. The upload
field visibly states the three-image minimum. Screenshot:
[gallery after Save draft](../artifacts/listing-gallery-after-save.png).
API regressions cover concurrent repeated moves, file-type checks, property ownership,
private-media rejection, gallery limits and locking after submission. No files are copied
or reuploaded when moved; legal supporting images move only on an explicit action.

The session-layout browser check used three account tabs against the disposable demo at
ports 5010/5180. Clicking Explore marketplace retained the existing sidebar DOM element,
header and account identity; property details and reloads showed the correct role's
workspace. Profile, notifications, forbidden and unknown routes also retained it. Mobile
checks at 360px and 768px confirmed drawer closure and no horizontal overflow. Logout
restored public navigation and public browsing in that tab. Client regressions cover
profile restoration/loading/retry, permissions, direct visits and layout changes on logout.
Screenshots: [admin marketplace](../artifacts/workspace-admin-marketplace.png) and
[mobile marketplace](../artifacts/workspace-marketplace-mobile.png). No Atlas data changed.

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
