# Session Log — 2026-03-30 — S018 — Form UX + Accessibility

**Project:** PadelHub
**Phase:** Post-P7 Polish
**Duration:** ~1 hour
**Commits:** d12ce47

---

## What Was Done

### U-01: Persist Schedule Form State Across Sub-Tab Switches
- **Problem:** Switching between History and Schedule sub-tabs in Matches unmounted ScheduleView, losing form state
- **Fix:** Changed from ternary conditional rendering to `display:none` pattern — both MatchHistory and ScheduleView always mounted, visibility toggled via CSS
- **File:** `src/App.jsx` lines ~1396-1427

### U-08: H2H Player Select — ELO Badge
- **Problem:** H2H player dropdowns showed only names, no context for skill level
- **Fix:** Appended ELO in parentheses to option text: `"Aboody (1500)"`, `"Basel (1480)"`
- **File:** `src/components/PlayerStats.jsx` lines 302-311 — both Player 1 and Player 2 selects

### U-10: Skeleton Loading States
- **Problem:** Initial load showed a generic spinner with no indication of what's loading
- **Fix:** Replaced spinner with shimmer skeleton showing app structure (header + 5 leaderboard rows) using CSS `@keyframes shimmer` animation
- **File:** `src/App.jsx` lines 679-698 — `.skel` class with gradient animation

### U-13: Season Selector Horizontal Scroll
- **Problem:** Season buttons used `flexWrap:"wrap"` — could crowd on small screens with multiple seasons
- **Fix:** Changed to `overflowX:"auto"` horizontal scroll with `scrollbarWidth:"none"` and gradient fade hint (shows when >3 seasons)
- **File:** `src/components/LogMatch.jsx` lines 96-107

### U-14: Remove Hardcoded v2.0
- **Problem:** Settings footer showed "PadelHub v2.0" but no proper versioning exists (package.json is 0.0.0)
- **Fix:** Changed to just "PadelHub" — no misleading version number
- **File:** `src/App.jsx` line 1222

### U-15: Global Focus Rings
- **Problem:** Form inputs had no visible focus indicator — accessibility issue
- **Fix:** Added global CSS rule via `<style>` tag: `input:focus,select:focus,textarea:focus` gets green border + glow (`box-shadow: 0 0 0 2px ${A}30`)
- **File:** `src/App.jsx` — style tag in main return block (persists across all views, not just loading)
- **Note:** Initially placed in loading block only — fixed by adding to main render return as well

### P-05: Trim Outfit Font Weight 500
- **Problem:** Outfit weight 500 loaded from Google Fonts but barely distinguishable from 400
- **Fix:** Replaced all 5 usages of `fontWeight:500` with `fontWeight:400` across App.jsx, PlayerStats.jsx, MatchHistory.jsx. Removed `500` from Google Fonts URL.
- **Savings:** ~8KB less font data downloaded
- **Files:** `index.html` (font URL), `src/App.jsx` (2 instances), `src/components/PlayerStats.jsx` (1), `src/components/MatchHistory.jsx` (2)

### Service Worker Cache Bump
- `sw.js` CACHE_NAME bumped v7 → v8

---

## Files Modified

### Commit d12ce47 — 6 files
- `src/App.jsx` — Skeleton loading, focus rings, v2.0 removed, fontWeight 500→400, schedule display:none pattern
- `src/components/PlayerStats.jsx` — H2H ELO in dropdowns, fontWeight 500→400
- `src/components/LogMatch.jsx` — Season selector horizontal scroll + fade hint
- `src/components/MatchHistory.jsx` — fontWeight 500→400
- `index.html` — Outfit font weight 500 removed from Google Fonts URL
- `public/sw.js` — Cache v7 → v8

## Key Decisions
- Used `display:none` pattern (not unmount) for schedule form persistence — simplest fix, both components stay mounted. Trade-off: slightly more DOM, but negligible for these small components.
- ELO shown as text in `<option>` tags rather than custom dropdown — HTML `<select>` doesn't support rich content. Text parenthetical is the right UX for native selects.
- Focus ring as global CSS rather than per-input onFocus/onBlur — less code, consistent behavior, properly cascades to all inputs including ones in sub-components.
- Removed v2.0 entirely rather than deriving from package.json (which is 0.0.0) — no point showing a misleading version.

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-03-30 | Global CSS styles (focus rings) placed only in loading block — disappeared after load | `<style>` tag was inside the `if(loading) return ...` early return, so it unmounted when loading completed | **Global CSS injected via `<style>` tags must be in the main render return, not in early-return loading states.** Early returns unmount their entire subtree. |

## Next Actions
- [ ] S019 — App.jsx Refactor (A-01a through A-01d, A-04, A-09)
- [ ] S020 — GameMode.jsx Refactor + Tournament Polish
- [ ] Verify S018 changes on production after Vercel deploy

---

## Commits & Deploy
- **Commit 1:** `d12ce47` — S018: Form UX + Accessibility — 7 fixes
- **Live:** padel-battle.vercel.app (Vercel auto-deploy from push)

---
_Session logged: 2026-03-30 | Logged by: Claude | S018_
