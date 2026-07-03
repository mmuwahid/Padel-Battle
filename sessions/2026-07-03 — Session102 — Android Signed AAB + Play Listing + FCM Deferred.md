# Session Log — 2026-07-03 — Session102 — Android Signed AAB + Play Listing + FCM Deferred

**Project:** PadelHub (React 19 + Supabase + Vercel, wrapped with Capacitor for stores)
**Phase:** Pre-store-launch — Google Play (Android) build + listing
**Duration:** ~1 day (multi-block)
**Commits:** `66ee707` (Android release signing + push permission), `fbb7040` (Play listing doc + store graphics)

---

## What Was Done

### Fixed the blocking Gradle build error
- Root cause: `android/local.properties` used single backslashes in the SDK path (`sdk.dir=C\:\Users\...`). Java's `.properties` parser treats `\` as an escape char, so `\U \A \L \S` were dropped → invalid path `C:UsersUNHOEC03AppDataLocalAndroidSdk` → `java.io.IOException: Invalid file path` in `:app:compileDebugJavaWithJavac`.
- Fix: rewrote with forward slashes — `sdk.dir=C:/Users/UNHOEC03/AppData/Local/Android/Sdk`. Build then succeeded (assembleDebug 1m11s, bundleRelease 28s).

### Release signing keystore + signed AAB
- Generated `android/padelhub-release.jks` via keytool (RSA 2048, 10000-day validity, alias `padelhub`, dname CN=Mohammed Muwahid). **IRREPLACEABLE — user must back it up off-machine.**
- Created `android/keystore.properties` (gitignored) with store/key passwords `PadelHub2026!`.
- Wired a conditional release `signingConfig` into `android/app/build.gradle` (reads `keystore.properties` if present; leaves release unsigned in CI without secrets).
- Uncommented the keystore ignores in `android/.gitignore` (`*.jks`, `*.keystore`, `keystore.properties`).
- Built signed `app-release.aab` (versionCode 1, versionName 1.0).

### Native push decision — Option B (defer FCM to v1.1)
- Confirmed the Android WebView has NO Web Push API, so the existing VAPID Web Push path does NOT deliver to the wrapped app; native delivery requires a full FCM backend path (not small JS wiring).
- User chose Option B: ship v1 WITHOUT native push, add FCM as a v1.1 fast-follow.
- v1 AAB builds fine without `google-services.json` — `build.gradle` only applies the google-services plugin if the JSON exists (conditional block at file bottom). `POST_NOTIFICATIONS` permission pre-staged in AndroidManifest (harmless in v1).
- Firebase project created (`padelhub-9e340`) and identifiers + the 4-piece v1.1 wiring plan saved to memory `project_firebase_fcm.md`. User downloaded `google-services.json` + a service-account key (stored off-repo).
- Firebase CLI installed (`npm i -g firebase-tools`, v15.22.4) and logged in as `support.padelhub@gmail.com` — parked for v1.1.

### Play Store listing prepped
- Created `planning/play-store-listing.md`: app name, short (70-char) + full descriptions, release notes, store settings (Sports, `support.padelhub@gmail.com`, privacy URL `https://padel-battle.vercel.app/privacy`), data-safety answers, content rating, target audience (18+), the personal-account 12-tester/14-day closed-test gate, and a submission checklist.
- Generated store graphics with sharp → `store-assets/play-icon-512.png` (512×512, alpha stripped) + `store-assets/play-feature-1024x500.png` (mark + wordmark + tagline). **User does not like the graphics — redo next session.**

### Membership/Pro screen decision
- User: KEEP the Membership button; wire RevenueCat into it in a dedicated separate session. Not hidden for v1.
- Sequencing: placeholder UI is fine for the closed test; RevenueCat must be wired + IAP declared BEFORE the production submission. Documented in `play-store-listing.md` §7.

---

## Files Modified

### Commit 66ee707 — Android release signing + push permission
- `android/app/build.gradle` — added conditional keystore load + release `signingConfig`
- `android/.gitignore` — uncommented `*.jks`, `*.keystore`, `keystore.properties`
- `android/app/src/main/AndroidManifest.xml` — `POST_NOTIFICATIONS` permission (pre-staged for v1.1)
- (gitignored, not committed) `android/local.properties`, `android/keystore.properties`, `android/padelhub-release.jks`

### Commit fbb7040 — Play listing doc + store graphics
- `planning/play-store-listing.md` — full listing deliverable (new)
- `store-assets/play-icon-512.png` — 512×512 app icon, no alpha (new)
- `store-assets/play-feature-1024x500.png` — feature graphic (new)

## Key Decisions
- Native push deferred to v1.1 (Option B) — FCM is a separate backend path from VAPID; ship faster without it.
- Keep the Membership button; wire RevenueCat in a separate session; must be live (with IAP declaration) before production, not before the closed test.
- Graphics rejected by user — regenerate next session.
- Excluded `android/app/capacitor.build.gradle` + `android/capacitor.settings.gradle` from commits — pure CRLF/LF line-ending noise, empty real diff.

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-07-03 | Gradle "Invalid file path" build failure | Single backslashes in `local.properties` are eaten by Java's `.properties` escape parsing | **Always use forward slashes in `.properties` file paths on Windows (or double the backslashes).** |
| 2026-07-03 | Edit tool refused build.gradle ("File has not been read yet") | Inspected via `cat` in Bash, which doesn't satisfy the Edit tool's read requirement | **Use the Read tool (not `cat`) before Edit — Bash reads don't count.** |
| 2026-07-03 | First feature graphic showed a visible box around the logo | `resources/icon-only.png` has an opaque `#0d0d14` background, lighter than the `#0a0a0f` canvas | **When compositing a mark with a baked-in background, match the canvas color to the mark's corner pixel (sample it) instead of guessing brand hex.** |

### Validated Patterns
- [2026-07-03] Conditional `signingConfig`/`google-services` blocks in build.gradle (apply only if the secret file exists) — **Why:** keeps gitignored secrets out of the repo while letting CI build unsigned without failing; same pattern gates FCM so v1 builds without `google-services.json`.
- [2026-07-03] `sharp` `.flatten({background}).removeAlpha()` to produce Play-compliant no-alpha PNGs from alpha sources — **Why:** Play rejects the 512 icon if it has an alpha channel; this is the reliable one-liner.

## Next Actions
- [ ] Redo the store graphics (user rejected current ones) — S103
- [ ] Capture 2+ phone screenshots from emulator/device (can't be generated from static assets)
- [ ] (user, background) Android device verification — blocks creating the app record
- [ ] (user, background) Line up 12+ testers for the 14-day closed test
- [ ] (user, background) Back up `android/padelhub-release.jks` off-machine — irreplaceable
- [ ] (separate session) Wire RevenueCat into the Membership screen before production
- [ ] (v1.1) FCM native push — client `google-services.json` + service-account Supabase secret + JS wiring + `push-on-notify` FCM fan-out

---

## Commits & Deploy
- **Commit 66ee707:** `[Session102] Android release signing + push permission for Play launch`
- **Commit fbb7040:** `[S102] Add Play Store listing doc + generated store graphics`
- **Live:** PWA unaffected at padel-battle.vercel.app (SW v245, main now `fbb7040`). Nothing published to Play Store yet.

---
_Session logged: 2026-07-03 | Logged by: Claude | Session102_
