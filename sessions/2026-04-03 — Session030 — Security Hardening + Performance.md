# Session Log — 2026-04-03 — Session030 — Security Hardening + Performance

**Project:** PadelHub
**Phase:** Post-P7 — Final audit backlog + comprehensive audit + bug fixes
**Commits:** 6b4327d, cd9ee56

---

## What Was Done

### H-2: CORS Restriction
- Edge Function `push-notify` CORS changed from wildcard `*` to origin-checked whitelist
- Allowed origins: `https://padel-battle.vercel.app` (production) + `http://localhost:5173` (dev)
- Dynamic `corsOrigin` set per-request based on `Origin` header; defaults to production domain if origin not in list

### H-5: Atomic `leave_challenge` RPC
- Created `leave_challenge(p_challenge_id UUID, p_player_id UUID)` SECURITY DEFINER function
- Uses `FOR UPDATE` row lock to prevent race condition when two players leave simultaneously
- Removes player from whichever team, sets status to `open`, removes their response from JSONB
- Updated `ScheduleView.jsx` to call RPC instead of client-side read-modify-write
- SQL migration saved to `padelhub/docs/S030-leave-challenge.sql`

### L-4: Parallel Push Sends
- Replaced sequential `for` loop with `Promise.allSettled` in push-notify Edge Function
- Each subscriber gets an independent `sendOne()` async call (VAPID sign + RFC 8291 encrypt + fetch)
- Results processed after all settle: counts sent/failed, collects stale endpoints

### M-3: Rate Limiting
- Added in-memory rate limiter to push-notify Edge Function (30 req/min per user)
- Returns HTTP 429 if exceeded
- **Bug found by performance audit:** `checkRateLimit()` was defined but never called — fixed in commit 2

### Leaderboard Click-to-Profile (User Request)
- Podium cards (top 3) and full leaderboard rows now clickable
- Click navigates to Players tab with that player's full profile (`setSelectedPlayer(p.id); setTab("stats")`)
- Verified working on both desktop and mobile (375px viewport)

### Comprehensive Audit (Triple-Layer)
- **Code review agent:** 23 findings across all 22 source files (2 critical, 5 high, 9 medium, 7 low)
- **Performance audit agent:** Grade B+ overall (A in bundle/fetching/SW, B in React patterns)
- **UI walkthrough:** 8 views checked with preview tools, zero console errors

### Bug Fixes from Audit
- **BF-35:** `deletePlayer` in PlayerStats.jsx deleted matches across ALL leagues — added `.eq("league_id", leagueId)` scope
- **BF-36:** Settings member list showed email prefix instead of display name — `profile?.user_metadata?.display_name` → `profile?.display_name` (memberProfiles comes from profiles table, not auth.users)
- **BF-37:** `logged_by: null` in LogMatch.jsx — changed to `logged_by: user.id`, added `user` prop to LogMatch

---

## Files Modified

### Commit 1 (6b4327d) — 3 files
- `supabase/functions/push-notify/index.ts` — H-2 CORS restriction, L-4 Promise.allSettled, M-3 rate limiter (defined but not called)
- `src/components/ScheduleView.jsx` — H-5 leaveChallenge uses `leave_challenge` RPC
- `public/sw.js` — Cache v26 → v27

### Commit 2 (cd9ee56) — 6 files
- `src/App.jsx` — Leaderboard click-to-profile (podium + rows), `user` prop passed to LogMatch
- `src/components/PlayerStats.jsx` — BF-35: deletePlayer scoped to league_id
- `src/components/SettingsView.jsx` — BF-36: display_name fix
- `src/components/LogMatch.jsx` — BF-37: logged_by user.id, added user prop
- `supabase/functions/push-notify/index.ts` — M-3 fix: checkRateLimit() now called
- `public/sw.js` — Cache v27 → v28

### SQL Migration (executed via Supabase CLI)
- `leave_challenge` RPC created + GRANT to authenticated

### Edge Function (deployed twice)
- `push-notify` — commit 1 version, then commit 2 with rate limit fix

---

## Key Decisions
- **In-memory rate limiter** over DB-backed — Edge Functions are stateless, resets on cold start. Acceptable for friends-only app.
- **CORS defaults to production** if origin unknown — fail-closed approach.
- **#1 combo finding is FALSE POSITIVE** — `m.team_a === t` uses reference equality correctly because `teams = [m.team_a, m.team_b]` stores the same references.
- **Not memoizing `calculateSeasonAwards`** — hooks-after-returns risk in AppContent makes it unsafe. Minimal perf impact at current scale.
- **Leaderboard click uses `setSelectedPlayer + setTab`** — same pattern as Players tab, zero new state needed.

---

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-04-03 | Rate limiter `checkRateLimit()` defined but never called — dead code shipped in first commit | Node script inserted the function definition but the rate check insertion failed silently (string match issue). No verification that the function was actually invoked. | **After adding any new function, grep for its invocation before committing.** `grep -n "functionName(" file` — if it only appears at the definition, it's dead code. |
| 2026-04-03 | `deletePlayer` deleted matches across all leagues since initial implementation (S025) | No `.eq("league_id")` filter on the matches delete query. Went undetected because only one league exists in production. | **All Supabase `.delete()` and `.update()` queries on shared tables MUST include a `league_id` filter.** Even if RLS prevents cross-league access, explicit scoping is defense-in-depth. |

### Validated Patterns
- [2026-04-03] Triple-layer audit (code review agent + performance agent + UI walkthrough) catches different classes of bugs. Code reviewer found cross-league deletion. Performance agent found dead code. UI walkthrough confirmed zero runtime errors. Each layer alone would have missed findings from the others.
- [2026-04-03] Reference equality (`===`) works correctly for array comparison when both sides point to the same object. `teams = [m.team_a, m.team_b]` preserves references, so `m.team_a === teams[0]` is `true`. Agent incorrectly flagged this — always verify critical findings before fixing.
- [2026-04-03] Origin-checked CORS with fail-closed default — cleaner than single hardcoded domain when supporting dev + production.

---

## Next Actions
- [ ] Any user-reported issues from production testing
- [ ] User to test leaderboard click-to-profile on phone

---

## Commits & Deploy
- **Commit 1:** `6b4327d` — [Session030] Security hardening + performance — CORS, atomic leave, parallel push, rate limiting
- **Commit 2:** `cd9ee56` — [Session030] Audit fixes + leaderboard click-to-profile
- **Edge Function:** push-notify deployed twice (final includes rate limit call)
- **SQL:** leave_challenge RPC created
- **Live:** https://padel-battle.vercel.app
- **SW:** v28 (was v26)

---
_Session logged: 2026-04-03 | Logged by: Claude | Session030_
