# Session Log — 2026-06-22 — Session094 — Capacitor Scaffold + Hardening + Push Refactor

**Project:** PadelHub
**Phase:** Pre-store-launch
**Duration:** ~ full session (office PC UNHOEC03)
**Commits:** `ae45a07`, `6a65c0b`, `d09f39d`, `e42faf2`, `d249f3c`, `5d21c94`, merges `0fcf3af` (#132), `3b25e6a` (#133)

---

## What Was Done

### Capacitor native scaffold (#132)
- Scaffolded the Capacitor iOS + Android native shells for App Store + Google Play submission. Bundle ID `com.mohammedmuwahid.padelhub`.
- New files: `capacitor.config.ts` (splash bg `#0a0a0f`, dark status bar, keyboard resize, push presentation options), `src/capacitor.js` (web-safe no-op bridge: `isNative`, `platform`, `hideNativeSplash`, `configureStatusBar`, `registerBackButton`), full `ios/` Xcode project + `android/` Gradle project (both portrait-only), `resources/` 1024² icon + 2732² splash for asset generation.
- `App.jsx` wired to hide the native splash alongside the web splash and configure status bar + Android hardware back button.
- SW cache v224 → v225.

### Pre-launch hardening (#133)
- Font consolidation to **Syne + DM Mono**: migrated 44 inline `JetBrains Mono` refs across 6 tournament/score components to DM Mono; dropped JetBrains + (dead) Outfit from the loader.
- Moved font loading from a render-blocking CSS `@import` (Vite `@import must precede` warning) to a single preload-scannable `<link>` in `index.html`.
- Added `prefers-reduced-motion` guards (global + splash) for vestibular a11y.
- Fixed latent no-dupe-keys bug: duplicate `user` key in the `leagueCtx` object.
- DEV-gated the one ungated onboarding `console.log`.
- SW cache v225 → v226.

### TDZ crash fix (blank-splash blocker)
- The Capacitor back-button `useEffect` referenced `goBackSidebar` in its **dependency array** before the `const goBackSidebar = useCallback(...)` declaration → temporal-dead-zone `ReferenceError` evaluated during render → AppContent crashed on every mount (stuck on splash). `vite build` passed green and did NOT catch it.
- Relocated the effect to **after** `goBackSidebar` is declared. Behavior unchanged.
- **Cherry-picked the fix down onto `feat/capacitor-scaffold` (#132's head)** so merging #132 alone could not ship a broken main. This left a duplicate fix commit in history (`e42faf2` on #133's lineage + `d249f3c` on #132's).

### #6 haptics
- Added `triggerHaptic(style='light')` to `src/capacitor.js` (dynamic-imports `@capacitor/haptics`, cached `_haptics`, web no-op, errors swallowed).
- Fired a light impact from the global `LiquidPress` pointer-down delegate.

### #2 refactor — slice 1 (push-notification subsystem)
- Extracted the Web Push subsystem out of the AppContent god component into new `src/hooks/usePushNotifications.js` (~197 lines): 5 state values + per-type preference toggles, the mount-time subscription check effect, `urlBase64ToUint8Array`, the VAPID import, and the subscribe/unsubscribe/toggle/send/test functions.
- Hook signature `usePushNotifications({ supabase, user, leagueId, showToast })`; returns the same values/functions AppContent previously exposed so SettingsView and all push consumers are unchanged.
- App.jsx dropped ~170 lines (1798 → 1627). Verified in preview: app mounts, Settings renders all notification toggles, no console errors.

### Merge + production deploy
- Merged **#132** → main (`0fcf3af`), then retargeted **#133** base from `feat/capacitor-scaffold` to `main` (it did not auto-retarget because the base branch was kept) and merged it (`3b25e6a`).
- Vercel production deploy `dpl_97kXcwLUQttW6wzWHi9LF72Mg7Eh` reached **READY**, target production, author verified `m.muwahid@gmail.com`.
- Live verification: SW serving **v226** (was v224), `#root` present, JS bundle HTTP 200.

---

## Files Modified

### Commit `ae45a07` — Capacitor scaffold (#132)
- `capacitor.config.ts`, `src/capacitor.js`, `ios/**`, `android/**`, `resources/**` — new native scaffold
- `src/App.jsx` — import capacitor utils; hide native splash; status bar + back button
- `public/sw.js` — cache v224 → v225
- `package.json` — `@capacitor/*` deps + cap:sync/ios/android scripts; `.gitignore` — native build artifacts

### Commit `6a65c0b` — Pre-launch hardening (#133)
- `index.html` — font `<link>` (replaces CSS `@import`)
- `src/index.css` — drop `@import`, prefers-reduced-motion guards
- 6 tournament/score components — `JetBrains Mono` → DM Mono (incl. `RoundRobin.jsx`, `ScoreStepper.jsx`, `SingleElimination.jsx`)
- `src/App.jsx` — leagueCtx dupe-`user`-key fix; DEV-gate onboarding console.log
- `public/sw.js` — cache v225 → v226

### Commits `e42faf2` / `d249f3c` — TDZ crash fix (duplicate by cherry-pick)
- `src/App.jsx` — relocate Capacitor back-button effect below `goBackSidebar`

### Commit `d09f39d` — #6 haptics (#133)
- `src/capacitor.js` — `triggerHaptic()`
- `src/components/LiquidPress.jsx` — fire light impact on press

### Commit `5d21c94` — #2 refactor slice 1 (#133)
- `src/hooks/usePushNotifications.js` — NEW (~197 lines)
- `src/App.jsx` — remove push state/effect/functions, call hook (1798 → 1627)

(94 files total in the `9d1c13b..3b25e6a` range, dominated by the `ios/` + `android/` scaffold.)

## Key Decisions
- **Cherry-pick the crash fix onto the base PR (#132)** rather than relying on #133 to carry it — keeps main shippable at every merge step. Accepted the cost of a duplicate fix commit in history.
- **Manually retarget #133 to main** before merging (kept `feat/capacitor-scaffold` alive, so GitHub did not auto-retarget).
- **Merge commits, not squash** — preserve the scaffold/hardening commit history.
- **Defer remaining #2 refactor slices** (avatar, PWA install, notification center). Avatar depends on `loadLeagueData` (declared late) so a `useAvatar` hook call would re-introduce the same TDZ trap — must be ordered carefully.
- **Defer native device smoke-test** of the iOS/Android shells to next session.

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-06-22 | Capacitor back-button effect crashed AppContent on mount (blank splash); green `vite build` masked it | `const`/`useCallback` referenced in a hook **deps array** before its declaration → temporal-dead-zone ReferenceError at render | **A passing `vite build` is NOT runtime proof. After any change that touches hook ordering/deps, confirm the preview's `#root` actually populates. Declare any value used in a deps array before the effect that lists it.** |
| 2026-06-22 | Expected #133 base to auto-retarget to main after #132 merged; it didn't | Kept the base branch alive (`--delete-branch=false`), so GitHub left #133 pointed at the now-merged branch | **When merging stacked PRs while keeping base branches, manually `gh pr edit <child> --base main` before merging the child.** |

### Validated Patterns
- [2026-06-22] Diagnosing a build-masked crash by running the modified branch preview side-by-side with an unmodified clone preview and comparing `#root` length — **Why:** isolates "did my change break mount?" without guessing; pairs with `git diff origin/main...HEAD`.
- [2026-06-22] Behavior-preserving god-component extraction: move a self-contained subsystem into a hook that takes cross-cutting deps as params and returns the identical surface — **Why:** consumers stay untouched, so the refactor is verifiable purely by "does the same UI still render with no console errors."
- [2026-06-22] Cherry-pick the fix onto the bottom PR of a stack so every intermediate merge state is shippable — **Why:** avoids a window where main is broken between stacked merges.

## Next Actions
- [ ] Native device smoke-test of the iOS + Android Capacitor shells (haptics on press, back button, splash/status bar)
- [ ] #2 refactor remaining slices — avatar (order the hook call AFTER `loadLeagueData` to avoid TDZ), PWA install prompt, notification center
- [ ] Owner smoke-test #129 permission toggles from `m.muwahid@gmail.com`; decide #129 v2 scope
- [ ] App Store Connect record + native push + Face ID (#124) + Universal Links (#6)
- [ ] Set up `padelhub.app` email addresses (support@, privacy@, legal@)
- [ ] ⚠️ Regenerate the Apple client-secret before **2026-12-18** (`scripts/gen-apple-secret.cjs`)

---

## Commits & Deploy
- **`ae45a07`** — Capacitor scaffold — iOS + Android native shells (v225)
- **`6a65c0b`** — Pre-launch hardening: fonts, a11y, dupe-key fix (v226)
- **`d09f39d`** — #6 light haptic feedback on `.lp` press (native-only)
- **`e42faf2` / `d249f3c`** — TDZ crash fix (duplicate via cherry-pick onto #132 base)
- **`5d21c94`** — #2 refactor slice 1: extract `usePushNotifications` hook
- **`0fcf3af`** — Merge #132 (Capacitor scaffold) → main
- **`3b25e6a`** — Merge #133 (hardening/haptics/refactor) → main
- **Live:** padel-battle.vercel.app — SW v226, main `3b25e6a`, deploy `dpl_97kXcwLUQttW6wzWHi9LF72Mg7Eh` READY

---
_Session logged: 2026-06-22 | Logged by: Claude | Session094_
