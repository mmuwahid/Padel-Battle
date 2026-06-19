# Session Log — 2026-04-02 — Session027 — Invite + League Creation Fixes

**Project:** PadelHub
**Phase:** Post-P7 — Bug Fixes + Platform Admin Planning
**Duration:** ~45 minutes
**Commits:** 3b04eb6

---

## What Was Done

### BF-33: Invite Link Lost During OAuth Redirect
- Root cause: AuthGate's `redirectTo` used `window.location.origin + window.location.pathname`, stripping `?invite=XXX` during Google OAuth, signup email confirmation, and password reset redirects
- Friends clicking invite link → Google sign-in → redirected back without invite code → landed on "Create/Join" screen instead of auto-joining
- Fix: Added `window.location.search` to all 3 `redirectTo` URLs in AuthGate.jsx:
  - Google OAuth (line 105)
  - Forgot password (line 58)
  - Signup `emailRedirectTo` (line 75 — new addition)

### BF-34: League Creation RLS Error for New Users
- User's friend got: "new row violates row-level security policy for table leagues"
- Root cause: S025's `leagues_select_members` policy required membership to SELECT, but PostgREST's `.insert().select()` pattern needs both INSERT and SELECT policies to pass. The `handle_new_league` trigger adds the creator as admin member, but the SELECT policy evaluation may happen before the trigger commits the membership row.
- Fix: Added `OR created_by = auth.uid()` to `leagues_select_members` policy — creator can always read back their own league
- SQL migration executed via `npx supabase db query --linked`

### ELO Recalculation on Match Delete — Confirmed Working
- User asked if ELO recalculates when a match is deleted
- Investigated: `calcElo` runs via `useMemo([players,matches])` in App.jsx line 603. `onMatchDeleted` calls `loadLeagueData()` which refetches all remaining matches → ELO rebuilds from scratch
- No code change needed — already works correctly

### Platform Admin Feature — Design Approved
- Designed full platform admin feature for S028
- User decisions: super admin = hardcoded user ID (just Mohammed), sidebar entry, view/delete leagues only
- Feature spec written and approved, added to todo.md as S028

### Supabase CLI Setup on Work PC
- CLI login completed via `npx supabase login`
- Project linked from OneDrive path (not C drive)
- Path saved to memory for future reference

---

## Files Modified

### Commit (3b04eb6) — 2 files
- `src/components/AuthGate.jsx` — BF-33: Added `window.location.search` to all 3 redirectTo URLs (Google OAuth, forgot password, signup emailRedirectTo)
- `public/sw.js` — Cache bumped v20 → v21

### SQL (executed on Supabase)
- `padelhub/docs/S027-league-creation-fix.sql` — BF-34: Updated leagues_select_members policy with creator fallback

### Local documentation updates
- `padelhub/docs/database-schema.sql` — Updated leagues SELECT policy definition
- `padelhub/CLAUDE.md` — S027 gotchas, Platform Admin plan
- `tasks/todo.md` — S027 complete, S028 plan added, ELO question resolved
- `tasks/lessons.md` — 2 mistakes + 1 validated pattern added

## Key Decisions
- **Invite link fix preserves ALL query params** — not just `?invite=`, uses full `window.location.search`. Future-proof if more params are added.
- **Creator fallback on leagues SELECT** — simpler than restructuring the insert flow to avoid `.select()`. The creator should always be able to read their own league.
- **Platform Admin uses hardcoded user ID** — no table needed, just Mohammed. SECURITY DEFINER RPCs for cross-league access.
- **ELO auto-recalculates** — no explicit recalc needed, confirmed via code trace.

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-04-02 | Invite link lost during Google OAuth — friends couldn't auto-join | `redirectTo` stripped query params by only using `origin + pathname` | **Always include `window.location.search` in all `redirectTo` URLs.** Query params carry deep-linking context through auth flows. |
| 2026-04-02 | League creation failed for new users with RLS error | `.insert().select()` requires BOTH INSERT and SELECT policies. S025's members-only SELECT blocked the RETURNING clause for creators not yet in league_members. | **When using `.insert().select()`, ensure the SELECT policy allows the inserter to read back their own row.** Add `OR created_by = auth.uid()` fallback. |

### Validated Patterns
- [2026-04-02] ELO auto-recalculates on match delete via useMemo dependency chain — no explicit recalculation code needed. `loadLeagueData()` → new matches array → `useMemo` fires → fresh ELO.
- [2026-04-02] `npx supabase db query --linked` works from any directory once the project is linked — no need to be in the project folder.

## Next Actions
- [ ] S028: Implement Platform Admin feature
  - Hardcode super admin user ID
  - PlatformAdmin.jsx component (sidebar entry, overview stats, leagues table, users table)
  - SECURITY DEFINER RPCs (get_all_leagues, get_all_users, admin_delete_league)
- [ ] Future: Push Edge Function JWT verification
- [ ] Future: Remaining useLeague() migration
- [ ] Future: DB CHECK constraints

---

## Commits & Deploy
- **Commit:** `3b04eb6` — [Session027] BF-33 BF-34: Fix invite link lost during OAuth redirect + league creation RLS
- **SQL:** leagues_select_members policy updated via Supabase CLI
- **Live:** https://padel-battle.vercel.app (Vercel auto-deploy)
- **SW:** v21

---
_Session logged: 2026-04-02 | Logged by: Claude | Session027_
