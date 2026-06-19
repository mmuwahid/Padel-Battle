# Session Log — 2026-04-01 — S023 — Error Toast + useLeague Migration

**Project:** PadelHub
**Phase:** Post-P7 Architecture
**Duration:** ~30 minutes
**Commits:** 3812664

---

## What Was Done

### Error Toast on Data Load Failure
- Added `showToast("Failed to load data — tap refresh to retry", "error")` to loadLeagueData catch block
- Previously the catch silently set `loading=false` with empty arrays — users saw blank data with no indication of failure
- Also fixed a double semicolon `;;` after the function
- This directly prevents the S022 incident where users thought data was deleted

### useLeague() Migration (3 Components)
- **MatchHistory:** 7 props removed — supabase, user, players, matches, isAdmin, getName, showToast now from context
- **AdminDashboard:** 8 props removed — supabase, players, league, leagueId, getName, matches, showToast, loadLeagueData now from context
- **GameMode:** 4 props removed — supabase, players, getName, leagueId now from context
- **Total: 18 props eliminated** from App.jsx render tree
- Each component now imports `useLeague` from `../LeagueContext` and destructures only what it needs

---

## Files Modified

### Commit 3812664 — 5 files
- `src/App.jsx` — Error toast in catch block, removed 18 props from MatchHistory/AdminDashboard/GameMode calls, fixed `;;`
- `src/components/MatchHistory.jsx` — Added useLeague() import, destructured 7 values from context
- `src/components/AdminDashboard.jsx` — Added useLeague() import, destructured 8 values from context, removed supabase direct import
- `src/components/GameMode.jsx` — Added useLeague() import, destructured 4 values from context
- `public/sw.js` — Cache v17 → v18

## Key Decisions
- **Migrated 3 components, not all** — MatchHistory, AdminDashboard, GameMode were the clearest wins (most props from context). Tournament sub-components (SE, DE, RR, Americano) still receive props via GameMode's sharedProps — lower risk to leave them for now.
- **Component-specific props kept as props** — onEdit, shareMatch, sel, onMatchDeleted (MatchHistory), memberProfiles, setSidebarView (AdminDashboard), tournament, setTournament, sel (GameMode). These are not shared league data — they're specific to how the component is used.

## Next Actions
- App is feature-complete and stable
- Future useLeague() migration for remaining components can be done incrementally
- Monitor for any user-reported issues

---

## Commits & Deploy
- **Commit 1:** `3812664` — [S023] Error toast + useLeague() migration
- **Live:** padel-battle.vercel.app (Vercel auto-deploy)

---
_Session logged: 2026-04-01 | Logged by: Claude | S023_
