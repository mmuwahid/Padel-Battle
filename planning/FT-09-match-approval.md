# FT-09 — Match Approval + Admin Promotion

> **Status:** DRAFT — pending user approval
> **Source:** GitHub issue #8 (2026-05-05)
> **Drafted:** S044 cold start, 2026-05-05
> **Risk class:** HIGH — touches prod DB schema, RLS, leaderboard/H2H/stats data path
> **Bundles:** match-approval flow + admin role promotion UI (single migration, single deploy)

---

## 1. Goal

Every casual match submission goes through admin approval before it counts in match history, leaderboard, partner stats, H2H, and ELO. Admins can approve, edit-then-approve, or hard-reject. Submitters who are admins or the league owner skip the queue.

## 2. Scope (final, from CLARIFY)

### In scope
- **Casual match paths:** LogMatch manual mode, LogMatch LIVE finalize, ScheduleView inline log (via `play_challenge` RPC).
- **Admin role promotion:** League owner can promote/demote any league member to/from `admin`. UI lives in AdminDashboard's Players section.
- **Pending match visibility:** Hidden from everyone except the submitter and admins (= owner + role='admin' members).
- **Reject behaviour:** hard-delete (no audit trail).
- **Edit behaviour:** admin edits in place, status flips to approved on save, submitter is notified what changed.
- **Auto-approve:** when submitter is owner OR `league_members.role='admin'` for that league.
- **Push notification to admins** on every pending submission. Push notification to submitter on approve/edit-approve/reject.
- **Per-league setting:** none. Approval is mandatory for all leagues.

### Out of scope (this feature)
- Tournament internal matches (RoundRobin, SE, DE, Americano). Verified: tournament components don't write to the `matches` table — their score state lives in `tournaments.bracket_state` / round JSONB. Tournament finalization, if it ever flushes results to `matches`, would need to bypass the trigger via a server-side RPC marked auto-approve.
- Audit log of approvals (no `approved_by` / `approved_at` column for now).
- Approval expiry (pending matches stay pending forever until acted on).
- Match history for **rejected** matches (hard-delete only).
- Per-match approval comments/reasons.

## 3. Existing infrastructure we can reuse

- ✅ `league_members.role` already has `CHECK (role IN ('admin', 'member'))` and `DEFAULT 'member'`.
- ✅ `notifications` table with type CHECK including `'match'` — perfect for approval notifications.
- ✅ `push-notify` Edge Function already wired (FT-01).
- ✅ `leagues.created_by` = owner. Cannot be demoted.
- ✅ Helper SQL function on line 128 of `database-schema.sql` already filters by `role = 'admin'` — RLS pattern is established.
- ✅ NotificationCenter component already renders by `type`.

## 4. Database changes

### 4.1 Schema migration — `padelhub/docs/S044-match-approval.sql`

```sql
-- Add status column to matches
ALTER TABLE public.matches
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved'));

-- Backfill: every existing match is approved (preserves history exactly)
UPDATE public.matches SET status = 'approved' WHERE status = 'pending';

-- Index for the most common query: "approved matches for this league"
CREATE INDEX IF NOT EXISTS idx_matches_league_status
  ON public.matches(league_id, status);

-- Index for the admin queue: "pending matches for this league"
CREATE INDEX IF NOT EXISTS idx_matches_pending_league
  ON public.matches(league_id) WHERE status = 'pending';
```

**Why DEFAULT 'pending':** the BEFORE INSERT trigger flips it to 'approved' for admin/owner submitters. Defaulting to pending is the safe failure mode — if the trigger ever fails or is dropped, matches stop counting silently rather than count without review. After backfill, every existing row is 'approved' so production is unaffected on deploy.

### 4.2 BEFORE INSERT trigger — auto-approve admin submissions

```sql
CREATE OR REPLACE FUNCTION public.matches_set_status_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  is_owner BOOLEAN;
  is_admin BOOLEAN;
BEGIN
  -- Owner check: leagues.created_by matches submitter
  SELECT (created_by = NEW.logged_by) INTO is_owner
    FROM public.leagues WHERE id = NEW.league_id;

  -- Admin check: league_members.role = 'admin'
  SELECT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = NEW.league_id
      AND user_id = NEW.logged_by
      AND role = 'admin'
  ) INTO is_admin;

  IF COALESCE(is_owner, false) OR COALESCE(is_admin, false) THEN
    NEW.status := 'approved';
  ELSE
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_matches_set_status
  BEFORE INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.matches_set_status_on_insert();
```

**Why a trigger and not a client decision:** trigger is the single source of truth. Clients cannot bypass it — even direct Supabase insert from a malicious console session is gated. Also: ScheduleView's inline log goes through `play_challenge` RPC, LogMatch goes direct — one trigger covers both paths. The client never has to think about status.

### 4.3 RLS update — pending matches hidden from non-admins/non-submitters

Current `matches` SELECT policy assumed approved-only-equivalent. Need to update to:

```sql
DROP POLICY IF EXISTS "matches_select" ON public.matches;
CREATE POLICY "matches_select" ON public.matches FOR SELECT
  USING (
    -- Public approved matches in leagues you're a member of
    (status = 'approved' AND league_id IN (SELECT league_id FROM public.user_leagues(auth.uid())))
    OR
    -- Pending matches you submitted
    (status = 'pending' AND logged_by = auth.uid())
    OR
    -- Pending matches in leagues you admin (owner OR role='admin')
    (status = 'pending' AND (
      league_id IN (SELECT id FROM public.leagues WHERE created_by = auth.uid())
      OR league_id IN (SELECT league_id FROM public.league_members WHERE user_id = auth.uid() AND role = 'admin')
    ))
  );
```

> Need to check the actual current SELECT policy text. The migration will replace whatever is there with this one. **Pre-migration step:** dump the current policy definition for `matches` and confirm the new one is a strict superset for approved rows.

### 4.4 RPCs (SECURITY DEFINER, all check caller's admin/owner status)

| RPC | Args | Returns | Behaviour |
|---|---|---|---|
| `approve_match(p_match_id UUID)` | match id | `BOOLEAN` | Verify caller is admin/owner of the match's league. Set `status='approved'`. Insert `notifications` row (type='match') for `logged_by`. Trigger push-notify. Return true. |
| `reject_match(p_match_id UUID)` | match id | `BOOLEAN` | Verify caller is admin/owner. Insert notification + push first. **Then** `DELETE FROM matches WHERE id = p_match_id AND status = 'pending'` (status guard prevents accidental approved-match deletion). Return true. |
| `update_pending_match(p_match_id, p_team_a UUID[], p_team_b UUID[], p_sets JSONB, p_date DATE, p_motm UUID)` | full match payload | `BOOLEAN` | Admin-only. Compare old vs new fields, build a diff JSONB, UPDATE matches, set status='approved', insert notification with diff in `data` field, push-notify. Return true. |
| `set_member_role(p_member_id UUID, p_role TEXT)` | league_members.id, 'admin' or 'member' | `JSONB` | **Owner-only** (NOT admins promoting other admins — only the league owner can change roles, prevents privilege drift). Validate `p_role IN ('admin','member')`. Refuse to demote the owner's own membership. Update + return updated row. |

All RPCs follow the existing pattern: `SECURITY DEFINER`, `auth.uid()` for caller identity, table/column verification before write, `.eq("league_id", ...)` defense-in-depth where applicable (S030 lesson).

**Why owner-only on `set_member_role`:** if any admin can promote, one rogue admin can elevate accomplices. Owner-only keeps role assignment in a single hand. League owner is `leagues.created_by` and cannot be demoted by anyone.

## 5. Front-end changes

### 5.1 New / changed components

| Component | Change |
|---|---|
| `LogMatch.jsx` | After successful insert, check returned `status`. If `'pending'`, show toast "Match submitted for approval — waiting on admin." If `'approved'`, current "Match saved!" toast stays. |
| `ScheduleView.jsx` | `play_challenge` RPC needs a return field for the new match's status. Toast handling same as LogMatch. |
| `MatchHistory.jsx` | Default query already `WHERE status='approved'` once RLS is updated (RLS enforces). Add an OPT-IN section "My Pending Submissions (N)" at the top, visible only when the current user has any pending matches they submitted. Each row: team layout + "Pending approval" badge. No edit/delete from here. |
| `AdminDashboard.jsx` | New "Match Approvals" section above existing "Players" section. Pending count badge. Each pending row: teams, sets, date, submitter name, three buttons → Approve / Edit / Reject. Edit opens a modal pre-filled with LogMatch's manual form. Reject confirms before delete. |
| `AdminDashboard.jsx` (Players section) | Each member row gets a "Promote to admin" / "Demote to member" button — visible only when current user is league owner. Owner badge stays unchanged. |
| `NotificationCenter.jsx` | New rendering branches for the 4 new notification body shapes: submission-pending (admin), approved (submitter), edited-and-approved (submitter, with diff), rejected (submitter). All use existing `type='match'` so no schema change. Distinguish via `data.kind` field. |
| `LeagueContext.jsx` | Already exposes `isAdmin` (likely owner-only currently). Update to: `isOwner = leagues.created_by === user.id`; `isAdmin = isOwner || (current member's role === 'admin')`. Audit all `isAdmin` usages — anything that should be owner-only (regenerate invite code, etc.) gets switched to `isOwner`. |

### 5.2 Realtime subscription

Existing matches realtime sub already broadcasts to all subscribers. With the new RLS, non-admins won't receive pending INSERTs (RLS applies to realtime). Admins will. No code change needed in the subscription itself — RLS handles filtering automatically.

**Verification step in BUILD:** after migration, open two browsers (admin + member of same league), insert a pending match as a different user, confirm only the admin's screen receives the realtime event.

### 5.3 Push notification payloads

| Event | Recipients | Title | Body |
|---|---|---|---|
| Pending submitted | All admins of the league (owner + role='admin') | "Match awaiting approval" | "{Submitter} submitted: {TeamA} vs {TeamB} ({date})" |
| Approved | Submitter | "Match approved" | "Your match {TeamA} vs {TeamB} is now in the leaderboard." |
| Edited + approved | Submitter | "Match edited & approved" | "{AdminName} edited: {short diff}. Now in the leaderboard." |
| Rejected | Submitter | "Match rejected" | "{AdminName} rejected your match {TeamA} vs {TeamB}." |

Diff format for edits: minimal — "Set 2 score 6–4 → 6–3, MOTM A → B". Build server-side in `update_pending_match` RPC.

### 5.4 UI mockups required (per Mockup-First rule)

- **AdminDashboard — Match Approvals section** (the queue with pending rows)
- **AdminDashboard — Edit Match Modal** (admin-side form pre-filled)
- **AdminDashboard — Players section with Promote/Demote control** (owner-only)
- **MatchHistory — "My Pending Submissions" section** (collapsed/expanded states)
- **Notification cards** — new 4 variants (submission-pending, approved, edited-approved, rejected)
- **Toast variants** — "Submitted for approval" (info, not success-green) and "Approved successfully"

Mockups served via `padelhub/public/` per S043 pattern, removed before commit.

## 6. Leaderboard / H2H / partner stats / ELO impact

All these read from `matches`. Once RLS filters out pending matches for non-admins, they'll only see approved matches → leaderboard is naturally consistent with what they can see.

**However**, admins see pending matches in queries. Their leaderboard must NOT count pending matches. Audit needed:

- `App.jsx` ELO computation (useMemo) — must filter `matches.filter(m => m.status === 'approved')` before reducing.
- `PlayerStats.jsx` H2H, partner, win-rate calcs — same filter.
- `CombosView.jsx` Best Duos, Chemistry — same filter.
- Achievements, leaderboard sort — same filter.

**Implementation:** introduce a single derived selector `approvedMatches = useMemo(() => matches.filter(m => m.status === 'approved'), [matches])` in `LeagueContext`, and have all stats consumers read `approvedMatches` instead of `matches`. AdminDashboard's queue is the only consumer of pending matches.

This is the cleanest and most error-resistant pattern — opt-out (admins get raw `matches`) rather than every consumer remembering to filter.

## 7. Migration / deploy plan

1. **Pre-deploy SQL dump** — capture current matches SELECT policy text from prod for rollback safety.
2. **Apply migration** in Supabase SQL editor (or `npx supabase db push` after local test):
   - ALTER TABLE matches add status
   - UPDATE all rows to approved
   - CREATE indexes
   - CREATE trigger function + trigger
   - DROP + CREATE matches SELECT policy
   - CREATE 4 RPCs
3. **Sanity-check on prod with a test league:** insert a match as a non-admin and confirm it lands status='pending' AND is invisible in MatchHistory for non-admins/non-submitters. Insert as admin and confirm status='approved'.
4. **Deploy front-end** with status filter on stats consumers + AdminDashboard queue. SW bump v43 → v44.
5. **Smoke test on iPhone:** end-to-end submit → admin approves → submitter sees push → leaderboard updates.

### Rollback plan

If approval flow breaks production:

1. Drop the trigger: `DROP TRIGGER trg_matches_set_status ON matches;`
2. Approve every pending match: `UPDATE matches SET status='approved' WHERE status='pending';`
3. Revert SELECT policy to pre-migration version (from the dump).
4. Front-end: revert SW + push prior commit.

Recovery time: <5 min via SQL editor + `git revert` + `git push`.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Migration runs while users are mid-submission and a match lands without status | DEFAULT 'pending' guarantees no NULLs. Trigger handles every INSERT. |
| Tournament finalization writes to `matches` and gets blocked by trigger | Verified: tournaments do NOT currently insert into `matches`. If a future tournament finalization does, gate it through an RPC that bypasses the trigger via SECURITY DEFINER + explicit status='approved'. Document this in `docs/known-gotchas.md`. |
| Realtime sub leaks pending matches to non-admins | RLS applies to realtime channels. Test with two browsers in BUILD. |
| Admins forget pending queue → matches pile up forever | Out of scope this round, but add a count badge on AdminDashboard nav so it's visible. |
| Owner demotes themselves accidentally | `set_member_role` RPC explicitly refuses if `p_member_id` resolves to the league owner. |
| Rogue admin mass-rejects matches | Reject hard-deletes — no audit trail. Acceptable risk given user's explicit choice. Mitigation: push notification to submitter is the audit trail. Submitter can re-submit. |
| `play_challenge` RPC's atomic insert+update breaks if status is 'pending' (challenge expects match to exist) | Verify: RPC sets challenge.match_id from the inserted row. Pending or approved doesn't change linkage. Challenge state is independent of match status. Test in build. |
| New `isAdmin` definition breaks existing admin gates | Audit every `isAdmin` consumer in BUILD. Some may need `isOwner` instead (e.g., regenerate invite code, change league name). |
| Pending matches contribute to user's "matches played" count (e.g., ELO badge thresholds) | Solved by `approvedMatches` selector — all stats consumers use it. |

## 9. Files touched (summary)

- `padelhub/docs/S044-match-approval.sql` *(new)* — migration
- `padelhub/docs/database-schema.sql` — append migration changes for source-of-truth
- `padelhub/docs/known-gotchas.md` — add tournament-write gotcha if any future flush is added
- `padelhub/src/LeagueContext.jsx` — `isOwner` / `isAdmin` redef + `approvedMatches` selector
- `padelhub/src/components/LogMatch.jsx` — toast handling for pending vs approved
- `padelhub/src/components/ScheduleView.jsx` — toast handling, expect status from `play_challenge`
- `padelhub/src/components/MatchHistory.jsx` — "My Pending Submissions" section
- `padelhub/src/components/AdminDashboard.jsx` — Match Approvals section + Promote/Demote buttons + Edit Modal
- `padelhub/src/components/NotificationCenter.jsx` — 4 new notification variants
- `padelhub/src/App.jsx` — switch ELO + stats reducers to `approvedMatches`
- `padelhub/src/components/PlayerStats.jsx` — switch reducers to `approvedMatches`
- `padelhub/src/components/CombosView.jsx` — switch reducers to `approvedMatches`
- `padelhub/public/sw.js` — `CACHE_NAME` v43 → v44
- `padelhub/mockups/ft-09-*.html` *(new, not committed)* — UI mockups

Estimated diff: ~600–800 net lines, single migration, single SW bump, 1–2 commits.

## 10. Verification (Definition of Done)

- [ ] Migration applied on prod, all existing matches still status='approved', leaderboard unchanged from pre-migration screenshot.
- [ ] Non-admin submits a match → toast says "submitted for approval" → match invisible to other members → admin sees it in queue + push received.
- [ ] Admin approves → submitter receives push + notification → match appears in leaderboard immediately (realtime).
- [ ] Admin edits + approves → diff appears in submitter's notification → match in leaderboard reflects edited values.
- [ ] Admin rejects → match hard-deleted → submitter receives push.
- [ ] Owner promotes a member to admin → that member starts seeing the queue. Owner demotes → member stops seeing the queue.
- [ ] Owner cannot be demoted; admin cannot promote/demote (only owner).
- [ ] Pending matches do NOT count toward ELO, win-rate, partner stats, H2H, achievements for any user (admin or not).
- [ ] LIVE mode finalize as non-admin → match goes to pending. As admin → auto-approved.
- [ ] Tournament internal flows untouched: tested by running an Americano + RoundRobin to completion as a non-admin, no approval queue items appear.
- [ ] PWA cache invalidates: load on iPhone after deploy, see v44.
- [ ] Two-browser realtime test: pending insert visible only to admin browser.
- [ ] No console errors anywhere; lint baseline preserved.

## 11. Open questions for user before BUILD

1. **Owner vs Admin gates beyond role assignment.** Currently the AdminDashboard is open to any admin (or just owner — I'll audit). After this feature, does the owner have any **additional** powers admins don't (e.g., regenerate invite code, change league name, delete league)? My default split:
   - **Owner-only:** promote/demote members, regenerate invite code, change league name, delete league.
   - **Admin (owner + promoted):** approve/edit/reject matches, manage players, export CSV.
   Confirm or override.

2. **Notification settings.** Should the user's existing notification mute toggles (in SettingsView) cover the 4 new match-approval notification variants? Default: yes — they fall under `type='match'`.

3. **Edit modal — can admin change the team-A / team-B player composition?** Or only sets and date? My default: yes, full edit including teams (admin might be correcting "wrong player tagged"). Push diff would summarize player swaps.

4. **Auto-approve admins — does this apply when an admin logs a match on behalf of others (i.e., admin's own player is not in the match)?** My default: yes. The admin role is what gates auto-approve, not "admin played in this match". Edge case but worth confirming.

5. **Mockups — review them all in one go or one-by-one?** Default: one-by-one (admin queue first, then edit modal, then promote button, then notification variants, then pending submissions section). Each gets a screenshot review before moving to the next.

---

## Approval

- [ ] User approves plan → BUILD
- [ ] User requests changes → revise + re-present

_Plan filed under git-tracked project planning per S043 lesson (lost-plan-file incident)._
