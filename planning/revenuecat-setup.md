# RevenueCat Setup — PadelHub Pro

> Step-by-step dashboard + store setup to make the in-app Pro subscription real.
> The **code** side (SDK install, `SubscriptionContext`, wired `MembershipView`) is
> already done (S103). This doc covers the parts that live in external dashboards
> and must be done by the account owner. Until these are complete, the app runs
> against RevenueCat's **Test Store** and no real money moves.

---

## Decisions locked (S103)

| Item | Value |
|---|---|
| Entitlement identifier | `pro` |
| Monthly price | **$4.99 / month** |
| Annual price | **$34.99 / year** (billed yearly, ≈ $2.92/mo) |
| Free trial | **7 days** on both plans |
| Trust model | **Client-only** for launch (device reads entitlement from RevenueCat). Server-side webhook enforcement deferred. |
| Web / PWA | No purchase path on web — purchases are native-only. Web to be retired after both stores go live. |
| Capacitor SDK | `@revenuecat/purchases-capacitor@13.2.1` (requires `@capacitor/core >=8`, we're on 8.4.1) |

**Product identifiers to create (use these exact ids so RevenueCat mapping is clean):**

| Platform | Monthly | Annual |
|---|---|---|
| iOS (App Store Connect) | `padelhub_pro_monthly` | `padelhub_pro_annual` |
| Android (Play Console) | subscription `padelhub_pro`, base plan `p1m` | subscription `padelhub_pro`, base plan `p1y` |

App bundle id (both stores): `com.mohammedmuwahid.padelhub`

---

## Step 1 — App Store Connect (iOS)

1. **App Store Connect → your app → Subscriptions.**
2. Create a **Subscription Group** (e.g. `PadelHub Pro`). Grouping monthly + annual lets users upgrade/downgrade between them.
3. Add auto-renewable subscription **`padelhub_pro_monthly`** — price **$4.99/mo**.
4. Add auto-renewable subscription **`padelhub_pro_annual`** — price **$34.99/yr**.
5. For **each** subscription → **Introductory Offer** → **Free** → **1 week**.
6. Fill the required localized display name + description for each (App Store won't let you submit without them).
7. **In-App Purchase Key (for RevenueCat):** App Store Connect → **Users and Access → Integrations → In-App Purchase** → generate a key → download the `.p8` + note the **Key ID** and **Issuer ID**.
8. Also note the app's **App-Specific Shared Secret** (App → App Information → App-Specific Shared Secret) — RevenueCat can use either; the In-App Purchase Key is preferred.

## Step 2 — Google Play Console (Android)

1. **Play Console → your app → Monetize → Products → Subscriptions.**
2. Create ONE subscription **`padelhub_pro`** with two **base plans**:
   - `p1m` — auto-renewing, **monthly**, **$4.99**.
   - `p1y` — auto-renewing, **yearly**, **$34.99**.
3. On each base plan add an **Offer → Free trial → 7 days**.
4. Activate both base plans.
5. **Service account for RevenueCat:** Play Console → **Setup → API access** → create/link a Google Cloud service account with **Financial data / subscriptions** permission → download its **JSON key**. (Play requires the app to have at least a closed-testing release before subscriptions can be tested.)

## Step 3 — RevenueCat dashboard

1. **Project → Apps:** add an **App Store** app and a **Play Store** app under the PadelHub project (if not already). Enter bundle id `com.mohammedmuwahid.padelhub`.
   - iOS app: upload the `.p8` In-App Purchase Key (Key ID + Issuer ID).
   - Android app: upload the Play **service-account JSON**.
2. **Products:** import/create the products created in Steps 1–2:
   - iOS: `padelhub_pro_monthly`, `padelhub_pro_annual`.
   - Android: `padelhub_pro:p1m`, `padelhub_pro:p1y`.
3. **Entitlements:** create entitlement **`pro`** → attach all four products to it.
4. **Offerings:** create/confirm the **`default`** offering with two packages:
   - **Monthly** package (`$rc_monthly`) → iOS `padelhub_pro_monthly` + Android `padelhub_pro:p1m`.
   - **Annual** package (`$rc_annual`) → iOS `padelhub_pro_annual` + Android `padelhub_pro:p1y`.
   > The code reads `offerings.current` and matches packages by `packageType` MONTHLY / ANNUAL — keep these two packages in the current offering.
5. **API keys:** Project → API keys → copy the **public** keys:
   - Apple: `appl_…`
   - Google: `goog_…`

## Step 4 — Swap the keys in code

In `src/revenuecat.js`, replace the shared Test Store key with the real per-platform keys:

```js
const API_KEYS = {
  ios: 'appl_XXXXXXXXXXXXXXXXXXXX',
  android: 'goog_XXXXXXXXXXXXXXXXXXXX',
};
```

(These are **public** SDK keys — safe to commit, same as the Supabase anon key.)
Then `npm run build && npx cap sync`. No other code change is needed — the entitlement id, offering lookup, and package matching are already wired.

## Step 5 — Sandbox test

- **iOS:** App Store Connect → **Users and Access → Sandbox → Testers** → create a sandbox Apple ID → sign into it on the device (Settings → App Store → Sandbox Account) → run the app → buy Pro → the entitlement should flip `isPro` true (7-day trial, no charge).
- **Android:** Play Console → **License testing** → add the tester's Google account → install from the **closed-testing** track → buy → verify.
- In-app: open **Settings → Membership**, tap **Upgrade to Pro**, complete the sandbox purchase, confirm the card flips to the **Pro / Active** state and **Restore Purchases** re-grants after reinstall.

---

## Store submission checklist (subscriptions)

- [ ] App Store: subscription products **Ready to Submit** and attached to the app version.
- [ ] App Store: privacy — declare purchases; add subscription terms + link to Terms/Privacy in the listing and in-app (already linked in `LegalView`).
- [ ] Play: subscriptions **active**; Data safety declares purchase/financial info.
- [ ] Both: the in-app paywall shows store-localized prices (RevenueCat `priceString`) — confirmed once real products load.
- [ ] Keys swapped to `appl_` / `goog_` (Step 4) before the production build.
