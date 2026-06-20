# PadelHub — Complete Logo Sweep Map (S088)

> Every surface the brand mark appears on, so the swap to the new mark (Option A — Refined Orb) is one-shot and exhaustive. Target: replace the mark everywhere with zero misses.
> **Key fact:** the mark is ONE vector duplicated across code + SVG files, plus THREE PNG rasters derived from it. Editing a React component updates every screen that renders it; the SVG files and PNGs are separate copies that must each be updated.

## Legend
- **EDIT** = change SVG markup in code (easy, exact).
- **REGEN** = raster PNG, must be re-exported from the new mark (needs an SVG→PNG rasterization step).
- **AUTO** = renders one of the EDIT components; updates automatically once the component is changed (listed for completeness/verification).
- **EXTERNAL** = lives outside the repo (Supabase dashboard / app stores).

---

## 1. Vector mark — SOURCES to edit (the actual logo artwork)

| # | Surface | File · line | Action | Current state |
|---|---------|-------------|--------|---------------|
| 1 | Splash / login / picker mark | `src/components/icons.jsx:38` `PadelHubMark` | **EDIT** | green orb + 6 satellites |
| 2 | In-app header mark | `src/components/icons.jsx:96` `PadelHubMarkHeader` | **EDIT** | green orb + 6 satellites (no aura) |
| 3 | Static boot splash (pre-React) | `index.html:56` inline `<svg>` | **EDIT** | hand-mirrored copy of #1 |
| 4 | PWA manifest icon + apple-touch (SVG) | `public/icons/icon.svg` | **EDIT** | green orb mark |
| 5 | **Browser-tab favicon** | `public/favicon.svg` | **EDIT** ⚠️ | **STALE — old GREY RACKET design, not the orb** |
| 6 | Dead imports (cleanup) | `icons.jsx:6` `PadelLogo`, `:123` `PadelLogoSmall` | **EDIT** (delete) | imported but never rendered |

## 2. Raster PNGs — REGENERATE from the new mark

| # | Surface | File | Size | Action | Current state |
|---|---------|------|------|--------|---------------|
| 7 | Home-screen / PWA install icon + **push-notification icon** | `public/icons/icon-192.png` | 192² | **REGEN** | orb raster (pre-Option-A) |
| 8 | PWA install / Android splash icon | `public/icons/icon-512.png` | 512² | **REGEN** | orb raster |
| 9 | **WhatsApp / iMessage / Slack / email / Twitter link preview** | `public/og-image.png` | 1200×630 | **REGEN** ⚠️ | alt text says "racket" — likely stale |

## 3. Config / meta referencing the assets (update alongside)

| # | What | File · line | Action |
|---|------|-------------|--------|
| 10 | favicon + apple-touch links | `index.html:5,6,15-19` | verify point to updated assets |
| 11 | og:image + twitter:image + **cache-buster `?v=146`** + alt text "racket" | `index.html:37-48` | **bump `?v=`**, fix alt wording |
| 12 | manifest icon list | `public/manifest.json:10-46` | verify (points to icon.svg + pngs) |
| 13 | Push notification `icon` + `badge` | `public/sw.js:98-99` | → `icon-192.png` (auto-updates once #7 regenerated) |

## 4. In-app render sites — AUTO (verify after editing #1/#2)

| Surface | File · line | Renders |
|---------|-------------|---------|
| App header (every main screen) | `App.jsx:1126` | `PadelHubMarkHeader` 32 |
| Cold-start loading splash | `App.jsx:1025` | `PadelHubMark` 140 |
| Pull-to-refresh splash | `App.jsx:1095` | `PadelHubMark` 160 |
| Pending-review lock screen | `App.jsx:1045`, `PendingApprovalScreen.jsx:16` | `PadelHubMarkHeader` 28 |
| Rejected screen | `RejectedScreen.jsx:14` | `PadelHubMarkHeader` 28 |
| Onboarding header | `OnboardingScreen.jsx:129` | `PadelHubMarkHeader` 20 |
| Login / signup / recovery | `AuthGate.jsx:219,252` | `PadelHubMark` 80 |
| League picker splash | `LeagueGate.jsx:351` | `PadelHubMark` 140 |

## 5. Wordmark (TEXT, not the mark) — only if rebranding the name

"Padel" + green "Hub" in Syne — `App.jsx` header/splashes (`:1046,1096`), `index.html:92-93`. Stays as-is unless the name changes.

## 6. EXTERNAL — outside the repo (manual)

| Surface | Where | Action |
|---------|-------|--------|
| Auth emails (confirm / password reset) | Supabase dashboard → Auth → Email Templates | Check if a logo/branding is set; update there if so |
| App Store icon | App Store Connect | New 1024² from mark (no alpha) — see capacitor-wrap.md |
| Google Play icon | Play Console | New 512² |
| Store screenshots | both stores | Generated later |

---

## Execution order (one-shot)
1. Build the final Option-A SVG once → paste identical markup into #1, #2, #3, #4, #5 (and decide header vs full variants).
2. Rasterize that SVG → #7 (192), #8 (512), #9 (1200×630 og card with wordmark). **Needs an SVG→PNG step** (headless-browser screenshot or node `sharp`/`resvg`) — the one part that isn't a plain text edit.
3. Bump og `?v=`, fix "racket" alt text, verify manifest/sw refs.
4. (Same pass) unify the splash: identical bg/size/font, load Syne in index.html, `SplashScreen.hide()` later for the wrap.
5. Verify §4 render sites on the deployed build.
