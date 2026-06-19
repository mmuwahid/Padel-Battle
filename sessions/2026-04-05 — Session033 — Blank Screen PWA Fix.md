# Session Log — 2026-04-05 — Session033 — Blank Screen PWA Fix

**Project:** PadelHub
**Phase:** Post-P7
**Duration:** ~30 minutes
**Commits:** 57839ac

---

## What Was Done

### Blank Screen on PWA Launch — Critical Fix
- **Problem:** When opening PadelHub from phone home screen icon, app sometimes loaded to completely blank/white screen. Intermittent — required force-close and reopen. Happened after Vercel redeployments.
- **Root cause 1 (SW cache):** Service worker used cache-first strategy for hashed JS bundles (`/assets/*-[hash].js`). After Vercel redeployment, new HTML referenced new JS filenames, but SW served old cached version which 404'd. HTML loads → JS 404 → blank screen.
- **Root cause 2 (no splash):** `<div id="root"></div>` was empty. Before React hydrates, user sees nothing. If JS fails to load, blank screen persists forever.
- **Root cause 3 (auth hang):** `supabase.auth.getSession()` could hang indefinitely on slow/offline connections. No timeout meant loading state never resolved → permanent blank screen.

### Fix 1: Service Worker Cache Strategy Overhaul
- Hashed assets (`/assets/*`): changed from cache-first → network-first with cache fallback
- HTML/navigation requests: explicit network-first handler ensures app shell always references latest JS bundles
- Added `SW_UPDATED` postMessage on activate — notifies all open tabs to auto-reload
- Added periodic SW update check (every 30 minutes via `setInterval`)
- Cache bump v30 → v31

### Fix 2: Branded HTML Splash Screen
- Added inline splash to `index.html` — visible instantly before React boots
- PadelHub logo SVG + wordmark + pulsing "Loading..." status
- Dark background (#0a0a0f) matches app theme — no white flash
- Offline detection updates splash to "You're offline. Connect to the internet to continue."
- 10-second timeout shows "Taking too long? Tap to reload." with clickable link
- Splash hidden via `useEffect` in AuthGate when auth resolves

### Fix 3: Auth Cold Start Timeout
- `getSession()` now races against a 5-second `Promise.race` timeout
- On timeout or error: falls through to login screen instead of blank
- AuthGate returns `null` during loading (splash visible underneath)

---

## Files Modified

### Commit 57839ac — 3 files
- `public/sw.js` — Network-first for hashed assets and navigation. SW_UPDATED message. Periodic update check. Cache v30 → v31.
- `index.html` — Added branded splash screen with offline detection, 10s timeout, SW update listener
- `src/components/AuthGate.jsx` — 5s auth timeout via Promise.race. Splash dismissal useEffect. Return null during loading.

## Key Decisions
- **Network-first for hashed assets** — trades slightly slower repeat loads for guaranteed correctness after redeployment. On fast connections (typical mobile data), the latency difference is negligible. Eliminates the #1 cause of blank screens.
- **Auto-reload on SW update** — chose auto-reload over "tap to update" prompt. For a friends-only app, auto-reload is less disruptive than a persistent banner. Users won't notice a sub-second reload.
- **Splash in HTML, not React** — must be visible before any JS loads. React-based splash would be invisible during the exact failure case (JS fails to load).
- **5s auth timeout** — generous enough for slow 3G connections, short enough that users don't wait forever. Falls through to login (safe default) rather than blank.

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-04-05 | Cache-first strategy for hashed JS bundles caused blank screens after every Vercel redeployment | PA-09 (S013) implemented cache-first assuming hashed filenames are immutable. True for CDNs, but Vercel rebuilds generate NEW hashes — old files are deleted. Cache-first serves a 404'd old file forever. | **Never use cache-first for JS bundles on platforms that delete old builds (Vercel, Netlify).** Use network-first with cache fallback. Cache-first is only safe when the CDN guarantees old versions remain accessible indefinitely. |
| 2026-04-05 | Empty `<div id="root"></div>` provided no visual feedback before React boot for 31 sessions | Default Vite template ships empty root div. Never added a splash because React loads fast on good connections. | **Every PWA must have an inline HTML splash screen** inside index.html. The splash must work with zero JS — pure HTML/CSS. Hide it via JS once the app renders. This is the only way to guarantee "never blank." |

### Validated Patterns
- `Promise.race` for auth timeout — cleaner than `setTimeout` + flag. If `getSession` resolves first, timeout promise is garbage collected. If timeout wins, auth falls through to login.
- `postMessage` from SW to clients for update notification — no external libraries needed. SW `activate` → `clients.matchAll()` → `postMessage({type: 'SW_UPDATED'})`. Client listener calls `location.reload()`.
- Inline SVG in HTML splash — no external asset dependency. Splash renders even if CDN/Vercel is completely down. The logo SVG is ~500 bytes.

## Next Actions
- [ ] Test on phone: verify splash appears on cold launch
- [ ] Test after next Vercel deploy: verify no blank screen
- [ ] Any user-reported issues from production testing

---

## Commits & Deploy
- **Commit:** `57839ac` — fix: blank screen on PWA launch — splash screen, SW network-first, auth timeout
- **Live:** https://padel-battle.vercel.app (auto-deploy from main)

---
_Session logged: 2026-04-05 | Logged by: Claude | Session033_
