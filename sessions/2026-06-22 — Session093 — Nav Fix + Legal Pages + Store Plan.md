# Session Log — 2026-06-22 — Session093 — Nav Fix + Legal Pages + Store Plan

**Project:** PadelHub
**Phase:** Pre-store-launch polish
**Duration:** ~3 hours
**Commits:** `104447a`, `4d257ce`, `76eab01`, `3f9fd6d`, `9eefdba`, `9d1c13b`

---

## What Was Done

### #130 Definitive Background Fix (3rd attempt — SOLVED)
- Root cause: the floating pill nav design exposed body bg below it on iPhones, AND the pedestal div at `App.jsx:1730` used wrong color `#12121a` instead of `#0a0a0f`
- Solution: changed nav from floating pill to flush-bottom (`bottom:0; left:0; right:0; border-radius:0`) — eliminates the gap entirely
- Fixed pedestal div background from `#12121a` to `#0a0a0f`
- Closed #130 on GitHub via `gh issue close 130`

### Nav Bar Green Pill Border Restored
- User liked the floating pill aesthetic but needed flush-bottom for the bg fix
- Added `::after` pseudo-element on `.bnav` to create a decorative green pill border overlay
- `::after` sits at `left:10px; right:10px; bottom:env(safe-area-inset-bottom); border-radius:28px; border:1px solid rgba(74,222,128,0.25)`
- `pointer-events:none` ensures no interaction interference; `z-index:-1` keeps it behind nav content

### Privacy Policy + Terms of Service — Full Legal Pages
- Drafted comprehensive Privacy Policy (`public/privacy.html`, ~200 lines) covering: data collection (account, profile, match/league, subscription, technical), usage table with legal basis, sharing (other players, service providers: Supabase/Vercel/RevenueCat/Apple/Google), retention, user rights (GDPR-style), security, children's privacy, international transfers (UAE → US), contact
- Drafted comprehensive Terms of Service (`public/terms.html`, ~196 lines) covering: service description, accounts, subscriptions ($4.99/mo + $34.99/yr with 7-day free trial, auto-renewal, cancellation instructions for iOS/Android, refunds via Apple/Google), user conduct, user content, IP, availability, liability limitation, indemnification, dispute resolution (UAE/Dubai law), termination, general provisions
- Both styled with PadelHub dark theme (--bg: #0a0a0f, --accent: #4ADE80)
- h2 headings in green (`var(--accent)`), h3 sub-clauses in white (`#fff`), body text muted (`#9090a4`)
- Contact emails are placeholders: `support@padelhub.app`, `privacy@padelhub.app`, `legal@padelhub.app`
- Created `vercel.json` with `{"cleanUrls": true}` for extensionless URLs (`/privacy` instead of `/privacy.html`)

### Legal Pages as In-App Sidebar Views
- Initially opened as `window.open()` new tabs — but PWAs have no browser back button
- Created `src/components/LegalView.jsx` (~319 lines) with `PrivacyView` and `TermsView` components
- Both use standard `.back-btn-row` + `.back-btn` pattern with `goBack` prop (same as RulesView)
- Uses `.rtb` / `.rtbey` / `.rtbh1` classes for header area
- Added to sidebar between Official Rules and Settings in the App section
- Shield icon for Privacy Policy, book icon for Terms of Service
- Wired into App.jsx: `sidebarView==="privacy"` → `<PrivacyView>`, `sidebarView==="terms"` → `<TermsView>`

### App Store Launch Plan Updates
- Updated `planning/app-store-launch-plan.md` with resolved decisions:
  - Pricing: $4.99/mo + $34.99/yr (~42% annual saving)
  - Free tier: 1 league + 1 season (unlimited players/matches within)
  - Branding: "PadelHub Pro" subscription name
  - Existing users: 1 year free Pro access
  - Phase priority: implement subscriptions before Capacitor wrap
  - Legal: Claude-drafted (these pages)
- Added competitor pricing table with 6 apps including Hello Padel (EUR 12/mo coaching platform — indirect competitor, not league management)

### Lessons Management Cleanup
- `tasks/lessons.md` cleanup: removed dangling duplicate entries, consolidated formatting

---

## Files Modified

### Commit 1 (`104447a`) — #130 bg fix + LM cleanup + manage_seasons + store plan
- `src/index.css` — Nav background unified
- `src/App.jsx` — Pedestal div color fix
- `planning/app-store-launch-plan.md` — Updated with resolved decisions + competitor table

### Commit 2 (`4d257ce`) — #130 flush-bottom nav + pedestal color fix (v221)
- `src/index.css` — `.bnav` changed to flush-bottom (bottom:0, left:0, right:0, border-radius:0)
- `src/App.jsx` — Pedestal div `#12121a` → `#0a0a0f`
- `public/sw.js` — Cache bump v220→v221

### Commit 3 (`76eab01`) — Privacy Policy + Terms of Service + launch plan updates
- `public/privacy.html` — NEW: full Privacy Policy page
- `public/terms.html` — NEW: full Terms of Service page
- `vercel.json` — NEW: `{"cleanUrls": true}` for extensionless URLs
- `planning/app-store-launch-plan.md` — Hello Padel competitor research added

### Commit 4 (`3f9fd6d`) — Nav bar: restore green pill border as overlay (v222)
- `src/index.css` — `.bnav::after` pseudo-element for pill border overlay
- `public/sw.js` — Cache bump v221→v222

### Commit 5 (`9eefdba`) — Add Privacy Policy + Terms to sidebar, fix heading colors (v223)
- `src/components/Sidebar.jsx` — Privacy Policy + Terms links added between Official Rules and Settings
- `public/privacy.html` — h2 green, h3 white heading colors
- `public/terms.html` — h2 green, h3 white heading colors
- `public/sw.js` — Cache bump v222→v223

### Commit 6 (`9d1c13b`) — Legal views as in-app sidebar screens with back button (v224)
- `src/components/LegalView.jsx` — NEW: PrivacyView + TermsView components (~319 lines)
- `src/App.jsx` — Import LegalView components, add sidebar view renderers for privacy/terms
- `public/sw.js` — Cache bump v223→v224

---

## Key Decisions
- **Flush-bottom nav over floating pill** — flush eliminates the bg color gap entirely; `::after` pseudo-element restores the pill visual without the structural problem
- **In-app sidebar views over new-tab links** — PWAs have no browser back button; in-app views maintain navigation continuity
- **Static HTML + in-app views** — kept `public/privacy.html` and `public/terms.html` for App Store submission URLs (`padel-battle.vercel.app/privacy` and `/terms`), while the in-app sidebar views serve the same content natively
- **UAE/Dubai governing law** — consistent with the user's location (United Arab Emirates)
- **Contact emails as placeholders** — `support@padelhub.app`, `privacy@padelhub.app`, `legal@padelhub.app` — user to set up when domain is configured

---

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-06-22 | Pedestal div behind nav had wrong bg color `#12121a` instead of `#0a0a0f` | When #0a0a0f was established as the unified bg in S092, the pedestal div was missed | **When changing a color token across the app, grep for ALL occurrences of the old value — including inline styles in JSX** |
| 2026-06-22 | Icon import error: `import { Icon }` instead of `import Icon` (default export) | Lesson #71 recurring — didn't verify export shape before importing | **Lesson #71 is now a 3-time recurrence (S062, S065, S093). Before ANY Icon import in a new file, verify: `grep "^export" src/components/Icon.jsx`** |

### Validated Patterns
- `::after` pseudo-element for decorative overlays on structural elements — separates visual styling from layout positioning, avoids the floating-pill bg gap problem
- In-app sidebar view pattern (`.back-btn-row` + `.back-btn` + `goBack` prop) extends cleanly to content-heavy pages like legal docs — same UX as RulesView
- Keeping both static HTML pages (for external URLs/App Store) and in-app React views (for navigation) — dual-surface pattern for legal content

---

## Next Actions
- [ ] Owner smoke-test #129 permission toggles from `m.muwahid@gmail.com`
- [ ] Device-confirm S092+S093 fixes on real cold PWA open (SW v224)
- [ ] Set up actual email addresses for support@padelhub.app / privacy@padelhub.app
- [ ] Apple/Capacitor wrap — App ID + Sign in with Apple DONE; next: scaffold, App Store Connect, native push, Face ID (#124), Universal Links (#6)
- [ ] Regenerate Apple client-secret before 2026-12-18

---

## Commits & Deploy
- **Commit 1:** `104447a` — #130 definitive bg fix + LM cleanup + manage_seasons permission + store launch plan
- **Commit 2:** `4d257ce` — #130 flush-bottom nav + pedestal color fix (v221)
- **Commit 3:** `76eab01` — Privacy Policy + Terms of Service + launch plan updates
- **Commit 4:** `3f9fd6d` — Nav bar: restore green pill border as overlay (v222)
- **Commit 5:** `9eefdba` — Add Privacy Policy + Terms to sidebar, fix heading colors (v223)
- **Commit 6:** `9d1c13b` — Legal views as in-app sidebar screens with back button (v224)
- **Live:** padel-battle.vercel.app (SW v224, main `9d1c13b`)

---
_Session logged: 2026-06-22 | Logged by: Claude | Session093_
