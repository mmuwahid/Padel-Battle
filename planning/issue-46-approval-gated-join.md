# Issue #46 — Approval-gated Join Workflow (P2)

> **Status:** Plan draft S068. **Branch:** `feat/46-approval-gated-join`. **Spec ref:** `docs/PadelHub_Complete_v2.jsx` lines 2247-2376 (`PendingApprovalScreen`, `RejectedScreen`, `ApprovalQueueScreen`).
>
> **Why now:** Surfaced by user as the next priority after Phase 12 PR3 + S067-r1.x polish shipped. The current onboarding flow joins immediately on invite-code submit; the spec wants admin approval first, with explicit `Pending` and `Rejected` user states.

---

## Out of scope

- Email/SMS notifications (push notifications stay; email is not added in this PR)
- Admin batch operations (approve-all / reject-all) — single-row approve/reject only
- Reapply rate-limiting beyond the existing per-user request uniqueness
- Migrations of historical league_members (they stay as-is — pre-S068 leagues never had a request, RLS doesn't gate them retroactively)

## In scope

- `join_requests` DB table + RLS + 3 SECURITY DEFINER RPCs
- 3 new screens: `PendingApprovalScreen`, `RejectedScreen`, `ApprovalQueueScreen`
- `OnboardingScreen` step 3 rewire — invite-code path now creates a request, doesn't immediately join
- `LeagueGate` routing — if user has a pending or rejected request for a league, show the appropriate state screen
- Admin reachability — see decision Q1
- Push notification fanout to admins on new request + to requester on approve/reject
- Owner/admin bypass — creating a new league or already being a member skips the queue

---

## Data model

```sql
CREATE TABLE join_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id     uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('claim','new_profile')),
  player_id     uuid REFERENCES players(id) ON DELETE SET NULL,  -- only when type='claim'
  display_name  text NOT NULL,
  country       text,
  date_of_birth date,
  gender        text CHECK (gender IS NULL OR gender IN ('male','female')),
  playing_position text CHECK (playing_position IS NULL OR playing_position IN ('left','right','any')),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason text,
  decided_by    uuid REFERENCES auth.users(id),
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Only one OPEN (pending) request per (user, league). Resubmits replace prior rejected rows via the retry RPC.
  CONSTRAINT one_open_request_per_user_league UNIQUE (league_id, user_id, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX join_requests_league_pending ON join_requests(league_id, created_at DESC) WHERE status = 'pending';
CREATE INDEX join_requests_user ON join_requests(user_id, created_at DESC);
```

The `UNIQUE (league_id, user_id, status)` is intentionally narrow — a user can have ONE pending row at a time AND one approved (terminal) AND multiple rejected (history). On retry, the rejected row stays for audit; a new pending row is inserted.

## RLS

| Op | Policy |
|---|---|
| `INSERT` | `user_id = auth.uid()` AND not already a `league_members` member of the same league |
| `SELECT` | `user_id = auth.uid()` (own requests) OR is league admin (uses existing `is_league_admin_or_owner(lid, uid)` helper) |
| `UPDATE` | League admins only — used by approve / reject RPCs (which run SECURITY DEFINER) |
| `DELETE` | None directly — RPCs handle terminal transitions |

## RPCs (all SECURITY DEFINER, owner/admin gated where applicable)

```
create_join_request(p_league_id, p_type, p_player_id, p_display_name, p_country, p_dob, p_gender, p_position) RETURNS uuid
  - Validates: p_type IN ('claim','new_profile'); if 'claim' then p_player_id IS NOT NULL AND that player is in p_league_id AND has user_id IS NULL.
  - Refuses if caller is already a league_members member of p_league_id (idempotent — return existing pending row id if present).
  - Refuses if caller has an open pending row for this league.
  - Inserts row with status='pending'.
  - Notifies all league admins via existing notifications table.
  - Returns the request id.

approve_join_request(p_request_id) RETURNS jsonb
  - Admin-only via is_league_admin_or_owner. 
  - Updates row status='approved', decided_by, decided_at.
  - For type='claim': UPDATE players SET user_id = req.user_id WHERE id = req.player_id (RLS players_update_self does NOT cover this — runs as definer).
  - For type='new_profile': INSERT INTO players (league_id, name, country, date_of_birth, gender, playing_position, user_id) VALUES (...).
  - INSERT INTO league_members (league_id, user_id, role='member').
  - Notifies requester (push + in-app notification, type='members', kind='join_approved').
  - Returns { status:'approved', player_id:<resolved> }.

reject_join_request(p_request_id, p_reason) RETURNS void
  - Admin-only.
  - Updates row status='rejected', reject_reason, decided_by, decided_at.
  - Notifies requester (push + in-app notification, type='members', kind='join_rejected', data.reason=<reason>).
```

The `set_member_role` / `delete_my_account` RPC pattern (S044, S053) is the model for the SECURITY DEFINER + admin-gate convention.

## Notification kinds (extending S044's set)

- `join_pending` — to admins. type='members'. body: "{Name} requested to join {League}."
- `join_approved` — to requester. type='members'. body: "Welcome to {League}!"
- `join_rejected` — to requester. type='members'. body: "{League} declined your request." `data.reason` carries the admin's free-text reason.

NotificationCenter already handles `data.kind` variants (FT-09); extending with the 3 new kinds is one switch case each.

---

## Frontend changes

### `OnboardingScreen.jsx` step 3 rewire

| Path | Before | After |
|---|---|---|
| `Join via invite code` | `handlers.joinLeague(code)` (immediate insert into league_members) | `supabase.rpc('create_join_request', {...})` then `LeagueGate` re-routes to PendingApprovalScreen |
| `Create new league` | `handlers.createLeague` + auto-insert player row + auto-claim | UNCHANGED — owner of a fresh league bypasses the queue (creator IS the admin) |

### `LeagueGate.jsx` routing

```
if (leagues.length === 0 && hasNoOpenRequest) → OnboardingScreen
if (leagues.length === 0 && hasPendingRequest) → PendingApprovalScreen
if (leagues.length === 0 && hasRejectedRequest && !hasPendingRequest) → RejectedScreen (with Try Again CTA → OnboardingScreen step 3)
if (leagues.length >= 1) → AppContent (existing)
```

The "user has joined league A but pending in league B" case: existing `selectedLeagueId` flow stays; `PendingApprovalScreen` only renders when the user has NO active league memberships (decision Q3 below).

### `ApprovalQueueScreen.jsx` (new)

Lives at `padelhub/src/components/ApprovalQueueScreen.jsx`. Per spec lines 2309-2376:
- Header: "Approval Queue" + count subtitle
- Amber warning banner: "Approved players get immediate access. Rejected players can try again."
- List of cards — each has avatar, status pill (`CLAIM` green or `NEW PROFILE` amber), gender icon, name (`Claiming: X` for claim type), country flag + ISO + time-ago, Approve/Reject buttons
- Reject opens an inline reason textarea + Confirm/Cancel (max 120 chars)
- Approved/rejected items collapse to a single-line summary with green/red icon

Reachable via — see decision Q1.

### `PendingApprovalScreen.jsx` (new)

Per spec lines 2250-2273. Read-only state — clock icon, "Waiting for approval" title, league-name strong, claimed-player chip if applicable, "You'll be notified" hint pill.

### `RejectedScreen.jsx` (new)

Per spec lines 2278-2304. Red x-circle icon, "Request not approved" title, reason quote box ("REASON FROM ADMIN" + admin's text), "Try Again" red CTA → routes back to OnboardingScreen step 3 with form pre-filled.

---

## Open decisions (need user lock-down)

See AskUserQuestion next. Top 4:

1. **Admin reachability** — AdminDashboard nav card / sidebar entry / Matches-tab inline above match approvals?
2. **Pending-user app access** — totally locked to PendingApprovalScreen, OR read-only browse of Ranking/Players?
3. **First-league user (no memberships at all) vs has-other-leagues user** — when user has joined league A and applies to league B, does B's pending state lock the WHOLE app, or only the app's view of league B?
4. **Backfill existing 14 league members** — leave as-is (no join_requests row, RLS doesn't gate them) OR seed approved rows for audit completeness?

---

## Migration order (for ship)

1. DB migration `s068_join_requests_table` — table + RLS + indexes
2. DB migration `s068_join_request_rpcs` — 3 SECURITY DEFINER functions
3. DB migration `s068_join_request_triggers` — admin-fanout notification trigger
4. Frontend PR — 3 screens + OnboardingScreen rewire + LeagueGate routing + AdminDashboard wire-in
5. iPhone smoke test
6. Merge to main

## DoD checklist

- [ ] Migration applied; idempotent (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE FUNCTION)
- [ ] RLS policies enforced (verify with anon-role test)
- [ ] All 3 RPCs callable + admin-gated
- [ ] OnboardingScreen step 3 calls `create_join_request` for invite-code path
- [ ] LeagueGate routes to PendingApprovalScreen / RejectedScreen correctly
- [ ] ApprovalQueueScreen renders pending list with .aqcard / .aqavi / .aqtype.cl/.np / .aqname / .aqmeta / .aqactions / .aqapprove / .aqreject classes
- [ ] Approve creates league_members + claims/creates player + notifies requester
- [ ] Reject saves reason + notifies requester
- [ ] Push notification fired to admins on create + to requester on approve/reject
- [ ] iPhone smoke: pending/rejected screens render correctly + Try Again works
- [ ] No regressions on owner-creates-new-league path (still bypasses queue)
- [ ] CSS added for .aqcard / .pend-wrap / .pend-ico / .rej-reason / .try-again-btn / .aq-count (per spec)
- [ ] SW bumped

## Rollback plan

Single-direction migration. If an issue surfaces post-merge:
- Frontend can be reverted to pre-S068 commit (OnboardingScreen calls `joinLeague()` directly again) without touching the DB
- The `join_requests` table can stay (orphaned but harmless)
- If RLS issue: temporarily disable RLS on `join_requests` and run a fix migration

---

## Hand-off note

Plan file lands first. User answers 4 questions. Then the migration is applied via supabase MCP and the frontend builds out one component at a time, each verified locally before commit.
