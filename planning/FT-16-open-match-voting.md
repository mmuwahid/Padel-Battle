# FT-16 — Open-Match Voting (Issue #71) — v1

**Status:** Plan locked, ready to build
**Drafted:** 2026-05-10 (S072)
**GitHub issue:** [#71](https://github.com/mmuwahid/Padel-Battle/issues/71)

---

## Problem

Today every scheduled match is a "private match" — the organizer picks all 4 players up front. The user wants an additional flow where you schedule a match with only yourself committed and the remaining 3 spots fill via league members claiming them on a first-come basis. When the 4th spot is claimed, the match locks, teams auto-shuffle, and a notification fires.

---

## User decisions (locked S072)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Teams on lock-in | Auto-shuffle on 4th claim, with a manual override available to the organizer before the match starts |
| Q2 | Un-claiming a spot | Yes — any non-organizer participant can leave while status='open'. Organizer must use Cancel. |
| Q3 | Expired open match | Auto-cancel on next load if `scheduled_at < now()` and status='open' |
| Q4 | Who can create | Any league member (not admin-gated) |
| Q5 | Notification on creation | Fires to ALL league members including organizer (so it appears in their feed and they can re-share) |

---

## Goals

1. Any league member can create an "open" match with date, time, duration, court — auto-claims spot 1.
2. All league members see open matches in ScheduleView and can claim a spot in one tap.
3. Auto-cancel if scheduled time passes before lock.
4. On lock (4/4), auto-shuffle teams and notify all 4 participants.
5. Organizer can manually override teams before the match is logged.
6. When the score is logged from a locked open match, teams pre-fill in LogMatch.

## Non-Goals (defer)

- Recurring open matches (every Tuesday at 7pm).
- Private invite-only open matches (e.g., "open to my partners list only").
- Reserve list / waitlist if a spot opens up after lock.
- Custom team-balance algorithms (ELO-balanced, gender-balanced, etc.).

---

## Proposed DB Changes

### 1. New table `open_matches`

```sql
CREATE TABLE open_matches (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id          uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id          uuid REFERENCES seasons(id) ON DELETE SET NULL,
  organizer_id       uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  scheduled_at       timestamptz NOT NULL,
  duration_minutes   int  NOT NULL DEFAULT 90 CHECK (duration_minutes BETWEEN 30 AND 240),
  court              text,
  notes              text,
  status             text NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open', 'locked', 'cancelled', 'completed')),
  team_a_player_ids  uuid[],     -- populated on lock
  team_b_player_ids  uuid[],     -- populated on lock
  locked_at          timestamptz,
  cancelled_at       timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz DEFAULT now(),
  CHECK (
    (status IN ('open','cancelled') AND team_a_player_ids IS NULL AND team_b_player_ids IS NULL)
    OR (status IN ('locked','completed')
        AND array_length(team_a_player_ids, 1) = 2
        AND array_length(team_b_player_ids, 1) = 2)
  )
);

CREATE INDEX open_matches_league_status_idx ON open_matches (league_id, status);
CREATE INDEX open_matches_scheduled_at_idx ON open_matches (scheduled_at) WHERE status = 'open';
```

### 2. New table `open_match_players`

```sql
CREATE TABLE open_match_players (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  open_match_id   uuid NOT NULL REFERENCES open_matches(id) ON DELETE CASCADE,
  player_id       uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  joined_at       timestamptz DEFAULT now(),
  UNIQUE (open_match_id, player_id)
);

CREATE INDEX open_match_players_open_match_idx ON open_match_players (open_match_id);
```

### 3. `matches` — add traceability column

```sql
ALTER TABLE matches
  ADD COLUMN open_match_id uuid REFERENCES open_matches(id) ON DELETE SET NULL;
```

When a score is logged from a locked open match, this FK links them. On insert, a trigger flips the `open_matches.status` to `'completed'` so it drops off the open list.

### 4. RLS

```sql
-- open_matches
ALTER TABLE open_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY open_matches_select ON open_matches FOR SELECT
  USING (league_id IN (SELECT get_user_league_ids(auth.uid())));

-- inserts/updates/deletes go through SECURITY DEFINER RPCs only — no direct write policies

-- open_match_players
ALTER TABLE open_match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY open_match_players_select ON open_match_players FOR SELECT
  USING (open_match_id IN (
    SELECT id FROM open_matches
    WHERE league_id IN (SELECT get_user_league_ids(auth.uid()))
  ));
```

---

## Proposed RPCs (5 SECURITY DEFINER)

### `create_open_match(p_league_id, p_scheduled_at, p_duration, p_court, p_notes, p_season_id) → uuid`

- Caller must be a member of `p_league_id`.
- Resolves caller's claimed `player_id` for that league (joins `players.user_id = auth.uid()` AND `league_id = p_league_id`).
- Refuses if caller has no claimed player in the league.
- Refuses if `p_scheduled_at < now()`.
- Inserts `open_matches` row, then inserts caller into `open_match_players`.
- Fires push notification `open_match_new` to ALL league members (including organizer per Q5).
- Inserts in-app notification rows of `type='open_match'`, `data.kind='new'` for all members.
- Returns the new `open_match_id`.

### `join_open_match(p_open_match_id) → jsonb`

- Caller must have a claimed player in the league.
- Refuses if status != 'open'.
- Refuses if caller's player is already in `open_match_players` for this match.
- Refuses if current count >= 4 (race-safe via row lock).
- Inserts player.
- If new count = 4:
  - Auto-shuffles 4 player IDs into team_a (2) + team_b (2) using `random()`.
  - Updates `open_matches`: status='locked', team_a_player_ids, team_b_player_ids, locked_at=now().
  - Fires `open_match_locked` push to all 4 participants.
  - Inserts in-app notification rows of `type='open_match'`, `data.kind='locked'` for all 4.
- Returns `{status, team_a_player_ids, team_b_player_ids, count}`.

### `leave_open_match(p_open_match_id) → void`

- Caller must have a claimed player in the league.
- Refuses if status != 'open'.
- Refuses if caller is the organizer (organizer must use cancel).
- Deletes the caller's row in `open_match_players`.
- No notification fires (silent).

### `cancel_open_match(p_open_match_id) → void`

- Caller must be the organizer OR a league admin (`is_league_admin_or_owner`).
- Refuses if status != 'open' AND status != 'locked' (cannot cancel completed).
- Updates status='cancelled', cancelled_at=now().
- Fires `open_match_cancelled` push to all signed-up players.
- Inserts in-app notification rows of `type='open_match'`, `data.kind='cancelled'` for all signed-up players.

### `set_open_match_teams(p_open_match_id, p_team_a uuid[], p_team_b uuid[]) → void`

- Caller must be the organizer OR a league admin.
- Refuses if status != 'locked'.
- Validates: each array length=2, all 4 IDs are exactly the set in `open_match_players`, no duplicates.
- Updates team_a_player_ids, team_b_player_ids.
- No notification (lightweight, organizer-driven adjustment).

---

## Auto-cancel on expiry

Implementation: defensive read in `loadLeagueData()` at App.jsx mount.

```js
// pseudo-code in App.jsx loadLeagueData()
const expired = openMatches.filter(om =>
  om.status === 'open' && new Date(om.scheduled_at) < new Date()
);
if (expired.length > 0) {
  await supabase.rpc('expire_stale_open_matches', { p_league_id: leagueId });
  // RPC iterates expired open matches, flips status='cancelled', no notification
}
```

New RPC: `expire_stale_open_matches(p_league_id)` — admin-OR-self idempotent sweep, runs on every member's load. Mirrors the existing `expire_stale_challenges()` pattern (see [padelhub/CLAUDE.md](padelhub/CLAUDE.md) "expire_stale_challenges runs on every loadLeagueData").

---

## Frontend changes

### ScheduleView (`src/components/ScheduleView.jsx`)

New "Open Matches" section above the "Upcoming" cards. Each open-match card:

```
┌─────────────────────────────────────────┐
│  THU, 15 MAY · 7:00 PM · 90 min · CT 2  │  ← scard-hd
│  [OPEN]   2 / 4 spots                   │  ← status pill, accent green when open
├─────────────────────────────────────────┤
│  ●  ●  ○  ○                             │  ← 4 avatars, ○ = empty slot
│  Moody  You  +  +                       │
├─────────────────────────────────────────┤
│  [ Claim a Spot ]                       │  ← button changes per state
│  Note: "casual padel, all welcome"      │
└─────────────────────────────────────────┘
```

Button states for current user:
- **Not signed up + status=open + not full:** `Claim a Spot` (green)
- **Signed up as organizer + status=open:** `Cancel Match` (danger red, secondary)
- **Signed up as participant + status=open:** `Leave` (muted)
- **Signed up + status=locked:** `Locked — Log Score →` (deep-link to LogMatch with prefill)
- **Not signed up + status=locked:** `FULL` (disabled)

Class system follows the existing `.scard / .scard-hd / .scard-when / .scard-status / .scard-body / .scard-teams / .scard-pavi / .scard-pname / .scard-actions / .sab` vocabulary from S065 Phase 7. New classes: `.scard.open / .scard.locked / .scard-slot / .scard-slot-empty / .scard-slot-org`.

### Schedule form (`src/components/ScheduleView.jsx` Step 1)

New segmented toggle at the top of Step 1:

```
┌─────────────────────────────────────┐
│  [ Private Match ]  [ Open to League ] │
└─────────────────────────────────────┘
```

When "Open to League" selected:
- The 4-player picker (T1A / T1B / T2A / T2B) is replaced by a single-row card showing "You're in (Spot 1 of 4)".
- The shuffle button hides (not meaningful pre-lock).
- The "Schedule Match" button reads "Open to League".
- On submit, calls `create_open_match` instead of inserting a `matches` row.

When "Private Match" selected: existing flow unchanged (full team picker, optional shuffle).

### LogMatch pre-fill from locked open match

When LogMatch is opened with a `?openMatchId=...` query param OR a state hand-off from ScheduleView's "Log Score" button on a locked open-match card:

1. Fetch the `open_matches` row + its team assignments.
2. Pre-fill `team_a` and `team_b` selectors with the locked players.
3. Disable the team picker (show "Teams locked from open match").
4. On match insert, set `matches.open_match_id` to the open match's ID.
5. AFTER INSERT trigger flips `open_matches.status='completed'` (see DB section).

### NotificationCenter (`src/components/NotificationCenter.jsx`)

New `type='open_match'` renderer with three `data.kind` variants:

| kind | Icon | Title | Body | CTA |
|------|------|-------|------|-----|
| `new` | `users` (accent) | "New Open Match" | "{organizer} opened a match · {DATE} at {TIME}" | "Claim a Spot →" deep-links to ScheduleView Open section |
| `locked` | `lock` (gold) | "Match Locked In" | "{DATE} at {TIME} · Teams: {teamA} vs {teamB}" | "View Match" deep-links to ScheduleView Open section |
| `cancelled` | `x-circle` (danger) | "Open Match Cancelled" | "{organizer} cancelled the match for {DATE}" | (no CTA, dismiss only) |

Push-notify Edge Function gets a new branch for `type='open_match'` with kind-aware title/body composition. Reuses existing fan-out + rate-limit pattern.

### Deep-link routing

`NotificationCenter` already routes by type → tab/drill-in (S068 Issue #79). Extend the routing matrix:
- `open_match.new` → `tab='history'` + `subTab='upcoming'` + scroll to Open Matches section + flash highlight on the new card via `data-open-match-id` attribute.
- `open_match.locked` → same destination + flash on the locked card.
- `open_match.cancelled` → same destination, no flash (card is gone).

### Sidebar / Settings / Profile

No changes.

---

## Migration order

Stage as 5 named migrations via Supabase MCP `apply_migration`:

1. `s072_open_matches_table` — table + indexes + CHECK constraints (idempotent IF NOT EXISTS).
2. `s072_open_match_players_table` — table + indexes (idempotent).
3. `s072_matches_open_match_fk` — additive `matches.open_match_id` column + AFTER INSERT trigger to flip open_matches.status='completed'.
4. `s072_open_match_rls` — RLS policies for select on both new tables + GRANTs.
5. `s072_open_match_rpcs` — 5 SECURITY DEFINER functions (`create_open_match`, `join_open_match`, `leave_open_match`, `cancel_open_match`, `set_open_match_teams`) + `expire_stale_open_matches`. All admin/member-gated as described above.

**GRANT discipline (Lesson #95 from S067):** every new table + RPC must have explicit `GRANT EXECUTE ... TO authenticated` and `GRANT SELECT/INSERT/UPDATE/DELETE ON ... TO authenticated` after creation, even with RLS in place. Forgetting GRANT = "permission denied" runtime error.

---

## Frontend commit sequencing (proposed split)

| Commit | Scope | SW bump |
|--------|-------|---------|
| **C1** | All 5 DB migrations + RPCs (frontend untouched, deploys first to validate DB) | none |
| **C2** | ScheduleView open matches list (read-only render + claim/leave/cancel buttons + RPC wiring) | v137→v138 |
| **C3** | Schedule form "Open to League" toggle + `create_open_match` wiring | v138→v139 |
| **C4** | LogMatch pre-fill from locked open match + `matches.open_match_id` FK insert | v139→v140 |
| **C5** | NotificationCenter `open_match` renderer + deep-link routing + push-notify Edge Function branch | v140→v141 |

Single PR per commit OR bundle C2+C3+C4+C5 into one PR after C1's DB migrations verify clean. User decides at S072 close.

**Pre-merge gate:** for any UI-touching commit, follow the existing #46 pre-merge protocol — list prior tunings on touched files via `git log --oneline -- <file>`, run `getComputedStyle` regression on `.scard` and `.sched-bar` for layout invariants.

---

## Risk / blast radius

- **Low (DB):** All additive — new tables, new column, new RPCs. No mutation of existing rows. Existing matches/scheduled flow unaffected. Zero risk to current users on rollout.
- **Medium (frontend):** New code path in ScheduleView (status='open' rendering) + new toggle in schedule form. Both are gated branches — bug = wrong UI shown for one path, doesn't break the other. Existing private-match flow untouched.
- **Mitigated by sequencing:** ship DB first (C1), verify in SQL console, then ship UI in subsequent commits. Each commit independently revertable.

---

## Definition of Done

- [ ] All 5 migrations applied to Supabase production
- [ ] `gh issue list` shows #71 closeable
- [ ] iPhone smoke test: create open match → notification arrives → second account claims spot → notification of lock arrives → both accounts see locked state with teams shuffled → log score from open match → match appears in MatchHistory with correct team assignments
- [ ] Auto-cancel verified: create open match in past → loadLeagueData → status flips to 'cancelled' silently
- [ ] Manual team override verified: organizer reassigns teams before score logged → LogMatch reflects override
- [ ] No regression on existing scheduled-match flow (private mode unchanged)
- [ ] Push notifications fire for all 3 kinds (new, locked, cancelled)
- [ ] Deep links from notification center route to ScheduleView Open section with flash highlight

---

## Open Questions

None — all 5 user decisions locked S072.

---

## Estimate

~600 lines new code:
- ~250 lines DB (5 migrations + 5 RPCs + RLS + GRANT)
- ~150 lines new ScheduleView Open section + form toggle (CSS + JSX)
- ~80 lines NotificationCenter renderer extension
- ~50 lines LogMatch pre-fill branch
- ~70 lines push-notify Edge Function branch

Ship in 1–2 sessions: 1 session for DB + ScheduleView render/claim/leave + form toggle (C1+C2+C3); 1 session for LogMatch pre-fill + Notifications + push (C4+C5).

---

## Hand-off

After C1 lands clean (Supabase MCP `apply_migration` returns success on all 5), proceed with C2 wiring against the new RPCs. Each RPC is callable from the SQL console for sanity-checking before frontend integration.
