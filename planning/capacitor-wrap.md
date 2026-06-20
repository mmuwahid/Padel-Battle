# PadelHub — App Store + Google Play Launch (Capacitor Wrap)

> **Status:** Planning (S088, 2026-06-20). Apple Developer membership ACTIVE (Team ID `9M6M6A8B6V`, Individual).
> **Approach:** Wrap the existing deployed PWA in a native shell with Capacitor. The web app is unchanged; Capacitor packages the built `dist/` into a native iOS/Android app with a native splash, app icon, and access to native APIs.

---

## 0. The one hard blocker — build environment

| Platform | Needs | Notes |
|----------|-------|-------|
| **iOS** | **macOS + Xcode** (no exceptions) | iOS apps can ONLY be built/archived/signed on a Mac. If no Mac: use a **cloud Mac CI** (Codemagic, Ionic Appflow, EAS Build) or a rented Mac (MacinCloud). This decision shapes everything below. |
| **Android** | Android Studio (Windows/Mac/Linux) | Can be done on the current Windows PC. |

**→ Decide first: do we have a Mac, use a cloud-Mac service, or launch Android-first?** Everything iOS waits on this.

---

## 1. Prerequisites checklist

- [x] Apple Developer Program — ACTIVE (Individual, Team `9M6M6A8B6V`)
- [x] Free Apps Agreement — Active
- [x] Paid Apps Agreement — Active (so paid apps / IAP are an option later if wanted)
- [x] Bank account — Active
- [x] Tax forms (W-8BEN) — Active
- [~] DSA (EU Digital Services Act) trader status — Pending / In Review. NON-BLOCKING for submission; only gates EU availability. Can launch in UAE / non-EU regions now and enable EU once it clears. (Status confirmed by user, S088.)
- [ ] **App Store Connect app record** — create at appstoreconnect.apple.com → My Apps → + (needs final bundle ID + app name)
- [ ] **Final logo** (this session's mockup) → 1024×1024 source for icon + splash
- [ ] **Privacy policy URL** (Apple + Google both require one; can host at padel-battle.vercel.app/privacy)
- [ ] **Mac/Xcode or cloud-Mac** (section 0)
- [ ] Google Play Developer account ($25 one-time) — for Android

---

## 2. Capacitor scaffolding (commands)

Run in the repo root (the web project). Does NOT affect the Vercel web deploy.

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm i @capacitor/splash-screen @capacitor/status-bar @capacitor/app
npx cap init PadelHub <APP_ID> --web-dir=dist
npm run build            # produce dist/
npx cap add ios          # (on Mac) creates ios/ native project
npx cap add android      # creates android/ native project
npx cap sync             # copy web build + plugins into native
```

`capacitor.config.ts`:
```ts
import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: '<APP_ID>',              // DECISION — e.g. app.padelhub or ae.unec.padelhub (reverse-DNS, permanent)
  appName: 'PadelHub',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,      // we hide it manually when the web app is ready → no flash
      backgroundColor: '#0d0d14', // MUST match the unified web splash bg
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: { style: 'DARK', backgroundColor: '#0d0d14' },
  },
};
export default config;
```

**Bundle the build, don't point at the live URL.** Loading `dist/` natively (offline-capable, real app) — not `server.url: 'https://…'` (Apple rejects thin URL-wrappers under guideline 4.2). PadelHub has real native-worthy features, so bundling is correct. Trade-off: each app update needs a store release OR keep the SW-based web update for content; native shell changes need a release.

---

## 3. Splash / icon — the polish ties in here

The native splash shows BEFORE the webview loads, so the launch sequence becomes:
**native splash → web splash → app.** To avoid a flash:
1. Native splash background `#0d0d14` + the final logo (matches the web splash exactly).
2. `launchAutoHide:false`; call `SplashScreen.hide()` from the app once React has mounted + first data is ready.
3. The web static `#splash` (index.html) becomes nearly invisible because the native splash already covers the boot — but still unify it (see splash mockup) for the PWA/browser path.

**Asset generation** (after logo sign-off):
```bash
npm i -D @capacitor/assets
# place a 1024x1024 logo at resources/icon.png + resources/splash.png (2732x2732)
npx @capacitor/assets generate   # emits all iOS + Android icon/splash sizes
```

---

## 4. iOS build + submit (on Mac)

1. `npx cap open ios` → Xcode.
2. Signing & Capabilities → Team = `9M6M6A8B6V`, set Bundle Identifier = `<APP_ID>`.
3. Set version + build number.
4. Product → Archive → Distribute App → App Store Connect → Upload.
5. App Store Connect → the app record → TestFlight (internal test on your own device first) → then submit for review.

## 5. Android build + submit

1. `npx cap open android` → Android Studio.
2. Generate a signing keystore (keep it safe — losing it blocks future updates).
3. Build → Generate Signed Bundle (AAB).
4. Play Console → create app → upload AAB → fill listing → submit.

---

## 6. Store listing assets (both stores)

- App icon 1024×1024 (no alpha for iOS)
- Screenshots: iPhone 6.7" (1290×2796) + 6.5" required; iPad if supported; Android phone + tablet
- App name, subtitle, description, keywords, category (Sports), age rating
- Privacy policy URL + support URL
- "What's new" text

---

## 7. Likely pre-submission CODE tasks (flag early)

- [ ] **Sign in with Apple** — Apple guideline 4.8: apps offering third-party login (PadelHub has **Google OAuth**) must ALSO offer Sign in with Apple (or an equivalent privacy option). **This is a real code task before iOS approval.** Supabase supports Apple as an auth provider.
- [x] In-app account deletion — already shipped (`delete_my_account` RPC, S053). Apple requires this for apps with accounts. ✓
- [ ] Privacy policy page (host on the web app).
- [ ] App Privacy "nutrition label" in App Store Connect (declare data collected: email, name, usage).
- [ ] Web push → native push: iOS web push doesn't work inside a wrapped WKWebView. For native notifications, add `@capacitor/push-notifications` + APNs. Can launch v1 without push and add later, OR wire native push pre-launch (decision).

---

## 8. Decisions needed before scaffolding

1. **Build environment** — Mac / cloud-Mac / Android-first? (Section 0 — blocks iOS.)
2. **Bundle ID / App ID** — permanent reverse-DNS string, e.g. `app.padelhub` or `ae.unec.padelhub`.
3. **Seller name** — Individual ("Mohammed Muwahid" shown publicly) vs Organization (needs D-U-N-S). Affects store listing.
4. **Free vs paid** — free → current agreements suffice; paid/IAP → finish Paid Apps Agreement + bank.
5. **Logo direction** — from `mockup-splash.html` (A/B/C).
6. **Push notifications** — native push at launch, or defer to a later update?

---

## Sequencing summary

```
THIS SESSION:  splash/logo mockup (done) → user picks mark
NEXT:          port unified splash + final mark to source; generate 1024 icon
THEN:          Capacitor scaffold + native splash (matched) + Sign in with Apple
PARALLEL:      App Store Connect app record, privacy policy, screenshots
BLOCKED ON:    Mac/Xcode for the iOS archive + submit
```
