# Session Log — 2026-04-01 — Session025 — Security Hardening + Runtime Fixes

**Project:** PadelHub
**Type:** Build/Fix
**Phase:** Post-P7 — Security Hardening
**Duration:** ~2 hours (Deep)
**Commits:** 7325a4e, 922bffe

---

## What Was Done

### Phase 1: Runtime Bug Fixes (BF-29, BF-30, BF-31)
- BF-29: Fixed `claimedP` undefined in ScheduleView — variable was used in `createChallenge`, `respondToChallenge`, `joinChallenge` but only defined later in the component. Moved derivation (`players.find(p=>p.user_id===user.id)`) to top of component scope. Removed 2 duplicate definitions (one in `leaveChallenge`, one before the return statement).
- BF-30: Fixed `deactivatePlayer` in AdminDashboard using nonexistent `players.active` column (S022 lesson repeat). Changed from `.update({active: false})` to `.delete()`. Updated button label "Deactivate" to "Remove". Added success toast.
- BF-31: Fixed CSV injection in `exportMatchesCSV` — internal double quotes now escaped (`"` → `""`), leading formula characters (`=+\-@\t\r`) prefixed with `'` to prevent Excel formula injection.

### Phase 2: RLS Security Hardening (SQL Migration)
- Created `S025-rls-hardening.sql` migration and executed on Supabase via CLI (`supabase db query --linked -f`)
- **leagues_select** restricted from `USING(true)` to members-only — invite codes no longer globally readable
- **Created `lookup_league_by_invite` RPC** (SECURITY DEFINER) — returns only `id, name` for a given invite code, replacing open leagues table access
- **Updated LeagueGate.jsx** — both `autoJoinByInvite` and manual join flow now use the RPC instead of direct `from("leagues").select().eq("invite_code",...)`
- **Tightened UPDATE policies** — matches, tournaments, seasons, players UPDATE restricted to admin-only (`get_user_admin_league_ids`)
- **Added `players_claim_self` policy** — allows unclaimed player self-claim (update `user_id` to own `auth.uid()`)
- **Added RLS to 4 tables** — notifications (user-own), match_reactions (league-member read, user-own write), push_subscriptions (user-own), challenges (league-member CRUD with creator/admin delete)
- **Cleaned up duplicate policies** — removed old-named policies that coexisted with new S025 policies
- **Updated `database-schema.sql`** — added missing challenges + push_subscriptions table definitions, updated all policy definitions to reflect S025 hardening

### Phase 3: Player Profile Blank Screen Fix (BF-32)
- User reported clicking any player in roster → blank screen
- Root cause: **React Rules of Hooks violation** — `useState` (analyticsSection, h2hP1, h2hP2) and `useMemo` (analyticsData) were declared AFTER an early `return` in PlayerStats.jsx. When `sp` (selected player) was set, the early return skipped these hooks, causing React to crash silently (no console error, entire app unmounts).
- Fix: Moved all hooks (3 useState + 1 useMemo with 55-line analytics computation) above the conditional early return. Also restored the full player profile JSX that was temporarily stripped during debugging.
- Verified fix via preview: Husain's profile renders with ELO, stats, achievements, and H2H.

### Testing and Deployment
- Ran esbuild syntax check on all 4 modified files — all passed
- Started dev server, logged in with test credentials, verified:
  - ScheduleView: 3 challenges render, response indicators (checkmark/hourglass) work
  - Leaderboard: all player data loads correctly with new RLS
  - Player profile: clicking Husain renders full profile (ELO 1520, 100% WR, achievements)
- SQL migration verified via `pg_policies` query — all new policies confirmed
- Both commits pushed to GitHub, Vercel auto-deployed, production verified

### Admin Promotion Question (User Query)
- User asked about promoting members to admin
- Confirmed the feature exists in Settings view → Admin Management section (line 96-125 of SettingsView.jsx)
- Dropdown select per member: Member/Admin. Owner is locked (shows "Owner" badge)
- Only visible to admins — test account (member role) doesn't see it

---

## Files Created or Modified

### Commit 1 (7325a4e) — 4 files
- `src/components/ScheduleView.jsx` — BF-29: moved claimedP to component top scope, removed duplicates
- `src/components/AdminDashboard.jsx` — BF-30: deactivatePlayer uses .delete() instead of .update({active:false}); BF-31: CSV escaping for formula injection
- `src/components/LeagueGate.jsx` — Updated autoJoinByInvite and manual join to use lookup_league_by_invite RPC
- `public/sw.js` — Cache bumped v18 → v19

### Commit 2 (922bffe) — 1 file
- `src/components/PlayerStats.jsx` — BF-32: moved 3 useState + analyticsData useMemo above early return to fix Rules of Hooks violation; restored full profile JSX

### Local only (not in git repo)
- `padelhub/docs/S025-rls-hardening.sql` — SQL migration (executed on Supabase, kept as reference)
- `padelhub/docs/database-schema.sql` — Updated with S025 policy changes + missing table definitions

## Key Decisions
- **deactivatePlayer changed to delete** — no `active` column exists in players table, and adding one is more complex than needed. Delete is the right semantic for "remove player from league" since match history is preserved (team_a/team_b reference player IDs, not FK).
- **leagues_select restricted to members-only** — this is a breaking change for the join flow, mitigated by the new `lookup_league_by_invite` RPC. Non-members can no longer enumerate leagues or harvest invite codes.
- **challenges UPDATE left open to all league members** — not admin-only, because players need to respond/join/leave challenges. Tightening this further requires S026 server-side RPCs.
- **Player profile full JSX restored** — after debugging, confirmed the crash was in hook ordering, not in the JSX itself. Full profile view (avatar, ELO, win rate, stats grid, achievements, H2H) is back.

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-04-01 | Player profile blank screen existed undetected in production since original PlayerStats extraction | useState/useMemo hooks declared after an early return — violates React Rules of Hooks. No ErrorBoundary to surface the crash. | **Never place hooks (useState, useMemo, useEffect, useCallback) after conditional returns.** All hooks must execute on every render in the same order. After extracting components or adding early returns, grep for `useState\|useMemo\|useEffect\|useCallback` and verify NONE appear after any `return` statement. |
| 2026-04-01 | Debugging via preview tools was slow and indirect — took ~45 minutes to identify a Rules of Hooks violation | React swallows the error silently when no ErrorBoundary exists. Console shows generic "An error occurred in <Component>" without the actual error. | **Add ErrorBoundary around all lazy-loaded components and major view switches.** The blank screen + generic React warning is the signature of a Rules of Hooks violation or render crash with no boundary. Check hooks ordering FIRST when debugging blank screen crashes. |

### Validated Patterns
- [2026-04-01] Supabase CLI `db query --linked` for running SQL migrations — much faster than the Supabase Dashboard SQL editor, scriptable, and leaves a local SQL file as documentation. Pattern: write migration to `docs/S###-description.sql`, execute via `supabase db query --linked -f path`, verify with `pg_policies` query.
- [2026-04-01] SECURITY DEFINER RPC for cross-boundary queries (S025 `lookup_league_by_invite`) — allows non-members to look up a league by invite code without granting SELECT on the leagues table. Returns minimal data (id, name only). Pattern: when a non-member needs to access a member-restricted table, create a SECURITY DEFINER function that returns only the fields needed.

## Next Actions
- [ ] S026 Phase 3: Server-side RPCs for atomic challenge responses and transactional match creation
- [ ] S026 Phase 4: Performance quick wins (LeagueContext useMemo, pagination, debounce realtime, ErrorBoundary)
- [ ] Add ErrorBoundary around PlayerStats, GameMode, CombosView Suspense boundaries
- [ ] Remaining useLeague() migration (ScheduleView, LogMatch, PlayerStats, CombosView)

---

## Commits and Deploy
- **Commit 1:** `7325a4e` — [Session025] Security hardening + runtime bug fixes (BF-29/30/31, RLS, LeagueGate RPC, sw v19)
- **Commit 2:** `922bffe` — [Session025] Fix player profile blank screen — Rules of Hooks violation (BF-32)
- **Live:** https://padel-battle.vercel.app (both commits deployed and verified)

---
_Session logged: 2026-04-01 | Logged by: Claude (session-log skill) | Session025_
