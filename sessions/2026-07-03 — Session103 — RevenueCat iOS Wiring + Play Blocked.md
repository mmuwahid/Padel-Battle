# Session Log — 2026-07-03 — Session103 — RevenueCat iOS Wiring + Play Blocked

**Project:** PadelHub
**Phase:** Pre-store-launch (in-app purchases / RevenueCat)
**Duration:** ~2 hours (guided dashboard walkthrough)
**Commits:** `12d489e` (RevenueCat client wiring), `373442f` (real iOS key)

---

## What Was Done

### RevenueCat iOS purchase config — COMPLETE end-to-end
- **App Store Connect app record created** — name `PadelHub - Padel Game Tracker` (the plain "PadelHub" name failed ASC uniqueness validation), bundle `com.mohammedmuwahid.padelhub`, SKU `padelhub`.
- **Subscription group `PadelHub Pro`** created (Group ID `22206579`), with two auto-renewable subscriptions:
  - `PadelHub Pro Monthly` — $4.99/mo
  - `PadelHub Pro Annual` — $34.99/yr
  - Both currently "Missing Metadata" (expected — localization + review assets deferred).
- **RevenueCat products added manually** — the ASC auto-import was greyed out because we have no App Store Connect **API** key (we only hold the In-App Purchase key, Key ID `9736M88Z82`, Issuer `1cc251ad-d5ff-4b1c-be9f-bb6a79d58967`, which RevenueCat uses for server-to-server, not import). Entered the two products by hand.
- **Entitlement `pro`** created — first had to delete the auto-created `PadelHub Pro` entitlement (its identifier is immutable and it only held Test Store products) so a fresh entitlement with identifier `pro` could be made; both App Store products attached.
- **Offering `default`** — edited the auto-created offering rather than making a new one; deleted the stray Lifetime package, assigned the App Store products to `$rc_monthly` and `$rc_annual`. Marked Current.
- **Real iOS public key wired into code** — `appl_oqPyveTwMACTVTdlHUJoArMAdzN` replaced the placeholder in the `ios` slot of `src/revenuecat.js` (`373442f`). Android still on the Test Store key `test_AArrvMwTTPacAHxKwRDkUqLsKVE`.
- Lint + build green; both commits pushed to main (author `m.muwahid@gmail.com`). Full StoreKit purchase flow NOT device-tested (needs a sandbox device — deferred).

### Google Play RevenueCat setup — BLOCKED (account not verified)
- Walked the RevenueCat "New Play Store configuration" form (package name `com.mohammedmuwahid.padelhub`, service-account JSON, financial-reports bucket).
- **Hard blocker discovered:** the Google Play Console developer account (`PadelHubApp`, personal, `support.padelhub@gmail.com`, dev ID `7573132350565793581`) is not fully verified. `Create app` is greyed out ("Complete account verifications to create new apps"). Two outstanding tasks: (1) verify access to an Android mobile device (sign in to Play Console mobile app), (2) verify contact phone number, which bundles identity-document verification (Google approval ~1–3 days).
- Nothing on the Play side can proceed until verification clears — the app must exist before API access / service-account JSON / subscriptions / RevenueCat wiring. Session paused here per user (will resume once they have Android phone access).

---

## Files Modified

### Commit 12d489e — Wire RevenueCat in-app purchases (client-only)
- `src/revenuecat.js` — native-guarded RevenueCat bridge (entitlement `pro`, offering fetch, buy/restore, customer-info listener)
- `src/contexts/SubscriptionContext.jsx`, `src/contexts/SubscriptionProvider.jsx` — `useSubscription()` provider (isPro, packages, purchase actions)
- `src/components/MembershipView.jsx` — paywall consumes live packages by `$rc_monthly`/`$rc_annual`
- `src/main.jsx` — provider mount

### Commit 373442f — wire real iOS RevenueCat key
- `src/revenuecat.js` — `ios` API key set to real `appl_oqPyveTwMACTVTdlHUJoArMAdzN`; comment notes Android key still TODO

## Key Decisions
- **Client-only trust model** for entitlements (no server verification) — acceptable for launch scale; revisit if abuse appears.
- **7-day free trial deferred** — user explicitly chose to add Introductory Offers later "once ready"; subscriptions ship without a trial.
- **Products entered manually in RevenueCat** — no ASC API key available for auto-import; not worth creating one just for import.
- **Reuse auto-created `default` offering** rather than fighting the immutable-identifier collision.
- **App Store listing name ≠ home-screen name** — listing is `PadelHub - Padel Game Tracker`; CFBundleDisplayName stays `PadelHub`.

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-07-03 | Replied "No response requested" to a user "yes?" ping, leaving their question unanswered | Treated a status ping as needing no substantive reply | **Always answer the user's actual question directly — never emit a non-answer/placeholder response.** |
| 2026-07-03 | Started drafting Play RevenueCat form steps before checking whether the Play account could even create an app | Didn't verify the upstream prerequisite (account verification) first | **Before giving store-setup steps, confirm the account/app prerequisite state — dashboards gate later steps behind verification.** |

### Validated Patterns
- [2026-07-03] For RevenueCat store setup, follow the dependency chain strictly (verify account → create app → API access/JSON → products → entitlement → offering → key) — Why: each step is gated by the prior one in the dashboard; skipping ahead just dead-ends on greyed-out buttons.
- [2026-07-03] When a dashboard auto-creates an object with an immutable identifier that collides with the one you want (`pro` entitlement, `default` offering), delete-and-recreate the entitlement but edit-in-place the offering — Why: identifiers can't be renamed; matching the intended id up front avoids orphaned Test Store objects.

## Next Actions
- [ ] **User:** complete Google Play account verification — Play Console mobile app sign-in (device check) + identity/phone verification (~1–3 day Google approval). BLOCKS all Play work.
- [ ] Once verified: create Play app → Setup → API access → create service-account + JSON → grant Play Developer perms → upload JSON to RevenueCat form → Save.
- [ ] Create Play subscription `padelhub_pro` with base plans `p1m` ($4.99) / `p1y` ($34.99); add as RevenueCat Play products; attach to `pro` entitlement; assign to `$rc_monthly`/`$rc_annual` Play rows in `default` offering.
- [ ] Provide `goog_…` public key → swap into the `android` slot of `src/revenuecat.js`.
- [ ] ASC subscription-group **Localization** (English U.S., display name `PadelHub Pro`) — required before iOS build submission.
- [ ] Wire `isPro` tier-limit enforcement (Free 1 league / 1 season / 5 invites; Pro unlimited).
- [ ] Sandbox device smoke-test of the iOS purchase flow.
- [ ] Redo Play Store graphics (S102 rejected); capture phone screenshots.

---

## Commits & Deploy
- **Commit 1:** `12d489e` — Wire RevenueCat in-app purchases (client-only)
- **Commit 2:** `373442f` — Wire real iOS RevenueCat key (`appl_`) for App Store
- **Live:** No web deploy (native/config only; PWA unchanged at SW v245). Main `373442f`.

---
_Session logged: 2026-07-03 | Logged by: Claude | Session103_
