# Session Log — 2026-04-01 — S022 — React Context + Notification Polish + Critical Bugfix

**Project:** PadelHub
**Phase:** Post-P7 Architecture + Polish
**Duration:** ~3 hours
**Commits:** 31ce829, 06e3fdc, b71588f

---

## What Was Done

### A-04: React Context (LeagueContext)
- Created `src/LeagueContext.jsx` with `createContext` + `useLeague()` hook
- Provides: supabase, user, leagueId, league, players, matches, elo, seasons, isAdmin, getName, showToast, sendPushNotification, loadLeagueData
- Wrapped AppContent's return with `<LeagueContext.Provider>`
- Migrated NotificationCenter to use `useLeague()` — removed 3 prop dependencies from App.jsx call

### GN-21: Notification Toggles (Ranking Changes + New Members)
- Added `notifRankingChange` and `notifNewMembers` props to SettingsView
- Added 2 new toggle switches: "Ranking Changes" and "New Members" (were hidden since S007, now fully wired with S020 push triggers)
- All 4 toggles now visible and functional: New Match, Match Challenges, Ranking Changes, New Members

### Challenge Expiry Notifications
- Rewrote `expire_stale_challenges()` DB function to write "Challenge Expired" notification to all league members when auto-cancelling 48h stale challenges
- Applied via `supabase db query --linked`

### Cancel/Play Notifications
- ScheduleView `cancelChallenge()` now sends "Match Cancelled" push notification
- ScheduleView `saveLoggedMatch()` now sends "Match Played!" push notification

### Housekeeping
- BF-13 (Google auth branding): CLOSED — no longer required per user
- GN-20 (Playtomic level): CLOSED — not required per user
- Phase 8+ and Phase 9+ future plans: ALL CANCELLED per user decision
- Updated todo.md with closures and cancellations

### CRITICAL BUGFIX: A-09 Column Selects Breaking All Data
- **Bug:** S021 commit `88cd7a3` introduced A-09 specific column selects that used NONEXISTENT columns
  - `players` select included `active` — column doesn't exist on players table
  - `league_members` profiles join included `user_metadata` — column doesn't exist on profiles table (it's on auth.users)
- **Impact:** Both Supabase queries returned HTTP 400. The `loadLeagueData` try/catch silently caught the error, setting all state to empty arrays. User saw "0 players", "No rankings yet", empty match history, empty schedule — appearing as if all data was deleted.
- **Duration of breakage:** From S021 deploy (~20:46 GST) until S022 hotfix (~23:17 GST) — approximately 2.5 hours
- **Root cause:** The Explore agent that researched column usage reported `active` and `user_metadata` as used columns, but these don't exist in the actual database schema. The research found code that REFERENCES these conceptually but the columns were never created.
- **Fix:** Removed `active` from players select, replaced `user_metadata` with `display_name,avatar_url` in profiles join

### SECONDARY BUGFIX: LeagueContext useMemo Infinite Re-renders
- **Bug:** S022 commit `31ce829` added `LeagueContext` with `useMemo` whose dependency array included `elo` (itself a useMemo depending on players+matches), causing React error #310 (too many re-renders) — blank screen
- **Fix:** Replaced `useMemo` with plain object for context value
- **Root cause:** Cascading useMemo dependencies — elo depends on players+matches, context depends on elo, any state change triggers cascade

---

## Files Modified

### Commit 31ce829 — 6 files (S022 features)
- `src/App.jsx` — LeagueContext import, provider wrapping, notifRankingChange/notifNewMembers props to SettingsView
- `src/LeagueContext.jsx` — NEW (9 lines)
- `src/components/NotificationCenter.jsx` — Migrated to useLeague(), removed prop dependencies
- `src/components/SettingsView.jsx` — Added Ranking Changes + New Members toggles, notifRankingChange/notifNewMembers props
- `src/components/ScheduleView.jsx` — Cancel + Play push notifications
- `public/sw.js` — Cache v14 → v15

### Commit 06e3fdc — 2 files (HOTFIX: blank screen)
- `src/App.jsx` — useMemo → plain object for leagueCtx
- `public/sw.js` — Cache v15 → v16

### Commit b71588f — 2 files (HOTFIX: data loading)
- `src/App.jsx` — Fixed A-09 column selects: players (removed `active`, added `created_by,created_at`), profiles join (`user_metadata` → `display_name,avatar_url`)
- `public/sw.js` — Cache v16 → v17

### DB migration (executed via CLI)
- `expire_stale_challenges()` rewritten to include notification inserts

## Key Decisions
- **Plain object for context value** instead of useMemo — simpler, avoids dependency cascade. The minor performance cost of creating a new object each render is negligible compared to the crash risk from useMemo dependency errors.
- **NotificationCenter migrated to useLeague()** as the first consumer — demonstrates the pattern. Other components will be migrated incrementally in future sessions rather than all at once (reduces risk).
- **Cancelled all Phase 8+ and 9+ plans** — user decision. App is feature-complete for its intended audience (friends group).

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-04-01 | A-09 column selects used nonexistent columns (`players.active`, `profiles.user_metadata`), breaking ALL data loading for 2.5 hours | Trusted an agent's column research without verifying against actual DB schema. The agent found code references to these concepts but the columns were never created in the database. | **MANDATORY: After writing any Supabase `.select()` with specific columns, verify EVERY column exists by running `SELECT column_name FROM information_schema.columns WHERE table_name='X'` BEFORE committing.** Never trust code-level research for DB schema — always verify against the actual database. |
| 2026-04-01 | LeagueContext useMemo caused React error #310 (infinite re-renders) — blank screen on production | useMemo dependency array included `elo` which is itself a useMemo on `players`+`matches`. Any state change triggered a cascade: matches change → elo recomputes → context recomputes → triggers re-render → repeat. | **Never include derived useMemo values in another useMemo's dependency array.** For React Context values that include derived state, use a plain object — the re-render cost is minimal and avoids cascade bugs. |
| 2026-04-01 | Silent data failure — loadLeagueData's try/catch swallowed HTTP 400 errors, making it look like data was deleted when queries were just failing | The catch block sets loading=false but doesn't surface the error to the user. Empty arrays are indistinguishable from "no data" vs "query failed". | **Add error surfacing to loadLeagueData's catch block** — at minimum log the error, ideally show a toast: "Failed to load data — tap refresh to retry". Silent failures are the worst kind of bug because users think their data is gone. |

### Validated Patterns
- [2026-04-01] Testing on the actual production URL via Chrome browser tools (not just dev server) catches real deployment issues — the blank screen and data loading failures were only visible on production because they depended on the specific Vercel-built bundle and Supabase PostgREST column validation.
- [2026-04-01] Plain object for React Context value is safer than useMemo when the value contains derived state (useMemo chains are fragile and hard to debug in production minified builds).

## Next Actions
- [ ] Add error toast to loadLeagueData catch block (surface failures instead of silent empty state)
- [ ] A-04 incremental migration: migrate more components to useLeague() over time
- [ ] User-confirmed: app is working correctly after cache clear

---

## Commits & Deploy
- **Commit 1:** `31ce829` — [S022] React Context, GN-21 toggles, expiry + cancel notifications
- **Commit 2:** `06e3fdc` — [S022] HOTFIX: Fix blank screen (useMemo → plain object)
- **Commit 3:** `b71588f` — [S022] HOTFIX: Fix A-09 column selects (nonexistent columns)
- **Edge Function:** expire_stale_challenges() rewritten with notification inserts
- **Live:** padel-battle.vercel.app — verified working on production via Chrome

---
_Session logged: 2026-04-01 | Logged by: Claude | S022_
