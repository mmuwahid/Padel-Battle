# FT-14 — Season Management Screen

> **GitHub issue:** #14
> **Drafted:** 2026-05-06 (during S049, awaiting user approval)
> **Status:** PLAN — not yet implemented
> **Owner:** league owner only (matches `set_member_role` precedent)
> **Reference:** Issue #14 — "We need to add a season management screen under the admin dashboard where I can: create seasons, end seasons, edit seasons (including who the players in each season are). When creating a new season, I can populate it with the same players as the previous season or start fresh."

---

## Goal

A dedicated, owner-only screen under Admin Dashboard for creating, ending, editing, and managing per-season player rosters. Replaces the implicit "all league players are in every season" model with explicit per-season rosters that gate who appears in that season's leaderboard, stats, and award calculations.

---

## Problem statement (current state)

- `seasons` table holds: `id, league_id, name, start_date, end_date, active`. No player roster column.
- `players.league_id` ties players to a league, NOT a season. Implicitly every player is "in" every season.
- `matches.season_id` ties matches to a season; team_a/team_b reference player UUIDs.
- Season selector in the ranking screen exists, but rosters/leaderboards always show all league players regardless of which season has the match data.
- No UI for creating/ending/editing seasons. The only way to add a season is via SQL or the `/profile/seasons` admin path that may exist in PlatformAdmin (TBD — verify in implementation phase).

User's specific asks:
1. **Create season** — with optional clone-of-previous-season roster OR start fresh
2. **End season** — set `active=false`, set `end_date`, prevent new matches from being assigned to it
3. **Edit season** — rename, change dates, change roster (add/remove players)

---

## DB schema changes

### New table: `season_players`

```sql
CREATE TABLE public.season_players (
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (season_id, player_id)
);

CREATE INDEX idx_season_players_season ON public.season_players(season_id);
CREATE INDEX idx_season_players_player ON public.season_players(player_id);

ALTER TABLE public.season_players ENABLE ROW LEVEL SECURITY;

-- SELECT: any league member can see who's in each season of their leagues
CREATE POLICY "season_players_select" ON public.season_players FOR SELECT
  USING (season_id IN (
    SELECT id FROM public.seasons
    WHERE league_id IN (SELECT get_user_league_ids(auth.uid()))
  ));

-- WRITE: owner-only via RPCs (no direct INSERT/UPDATE/DELETE policies — RPCs use SECURITY DEFINER)

GRANT SELECT ON public.season_players TO authenticated;
```

### Backfill migration

Populate `season_players` for existing seasons by deriving from current data:
```sql
-- For each existing season, add every player in the league as a season member.
-- This preserves the current "all players visible everywhere" behaviour for existing seasons.
INSERT INTO public.season_players (season_id, player_id)
SELECT s.id, p.id
FROM public.seasons s
JOIN public.players p ON p.league_id = s.league_id
ON CONFLICT (season_id, player_id) DO NOTHING;
```

This is idempotent and row-pinned (per Lesson #39).

---

## RPCs (all SECURITY DEFINER, owner-only)

### `create_season(p_league_id UUID, p_name TEXT, p_start_date DATE, p_clone_from UUID DEFAULT NULL)`

- Verifies caller is league owner via `leagues.created_by = auth.uid()`. RAISE if not.
- INSERT new `seasons` row with `active=TRUE`, `end_date=NULL`.
- If `p_clone_from` is provided, copy that season's `season_players` rows into the new season. Otherwise leave roster empty (start fresh — admin adds players via update_season_roster).
- Returns the new season `id`.
- Note: optionally toggle other seasons in the league to `active=FALSE` to enforce "one active season at a time" (TBD — see Open Questions below).

### `end_season(p_season_id UUID, p_end_date DATE DEFAULT CURRENT_DATE)`

- Owner check.
- UPDATE `seasons` SET `active=FALSE`, `end_date=p_end_date` WHERE `id=p_season_id`.
- Does NOT delete any matches or players.

### `update_season(p_season_id UUID, p_name TEXT, p_start_date DATE, p_end_date DATE)`

- Owner check. Updates the season's metadata (name + dates). Activeness toggled separately by `end_season` / `reactivate_season` (below).

### `reactivate_season(p_season_id UUID)`

- Owner check. Sets `active=TRUE`, `end_date=NULL`. Useful if an end_season was issued by mistake.

### `set_season_roster(p_season_id UUID, p_player_ids UUID[])`

- Owner check.
- DELETE FROM `season_players` WHERE `season_id=p_season_id`. Then INSERT new rows for each id in p_player_ids.
- Atomic — wrap in transaction.
- Validate every `p_player_ids[i]` belongs to the same `league_id` as the season (RAISE if not).
- Returns `count(*)` of new rows.

---

## Frontend

### New component: `src/components/SeasonManagement.jsx`

- Mounted via new `sidebarView === "seasonManagement"` route in App.jsx (mirrors existing `playerManagement` precedent from S046).
- Entry point: new button in `AdminDashboard.jsx`, owner-only, between **Roster** and **Admin Management** sections (or right after Roster — fits the player-related grouping).
- Layout:
  - List of seasons (sorted DESC by start_date), each row showing: name, date range, status badge (Active / Ended), player count.
  - Tap a season → opens detail sheet with: rename input, date pickers, roster chip list (chip = player avatar+name with × button to remove), "Add players" button → multi-select modal.
  - Header: "+ New Season" button → modal with name input + start date + "Clone from {previous season}?" toggle (default ON if any prior season exists).
- End/Reactivate as bottom-sheet action buttons inside the detail sheet.

### App.jsx wiring

- Route `sidebarView === "seasonManagement"` → `<SeasonManagement onClose={() => setSidebarView("admin")} />`.
- Existing `seasons` state + `setSeasons` already in App.jsx (line 47); load already pulls from `seasons` table (line 234). Add a parallel select for `season_players` keyed on `season_id IN (...)` to populate per-season rosters in context. **OR** lazy-load rosters when SeasonManagement mounts (preferred — keeps initial load lean).
- Add `seasonRosters` state if going eager; otherwise SeasonManagement self-fetches.
- Update `seasons` realtime sub to also subscribe to `season_players` changes if we want live updates (optional — admin-only screen, polling on mount is fine).

### Stats / leaderboard implications

This is the **biggest open scope question**. Today, every stats consumer (ranking, partners, H2H) pulls the full `players` array filtered by league, then computes against `approvedMatches`. After per-season rosters exist:

**Option A: Rankings filter by season roster**
- Ranking screen filters `players` to `season_players` of the selected season. Players not in that season's roster are hidden from the leaderboard.
- Pros: Honest — if a player wasn't in a season, they shouldn't show up in its leaderboard.
- Cons: A player who left mid-season (say, was in Q1 roster but removed for Q2) still has match history, and those matches' team_a/team_b UUIDs reference them. They'd need to render as "unknown player" or with a strike-through. UX gets nuanced.

**Option B: Rankings show all match participants from that season, regardless of current roster**
- Ranking screen shows everyone whose UUID appears in `team_a`/`team_b`/`motm` of `season_id` matches.
- Pros: Always honest to the data — if you played a match in a season, you're in its leaderboard.
- Cons: Doesn't honour the explicit roster the admin set. "Add player to season X who hasn't played yet" feature has no rendering effect until they play.

**Option C: Hybrid** (RECOMMENDED for first cut)
- Use `season_players` to gate **who CAN be selected** when logging a new match for that season. Existing matches stay valid.
- Rankings show union of (current season_players) AND (any player_id appearing in season's matches). Departed players still appear if they played; new roster members appear with zero matches until they play.
- This matches user mental model best: "Who is in this season" = the explicit roster, "Who shows on the leaderboard" = anyone with a match-or-roster record for that season.

**This decision needs user confirmation in the implementation kickoff** — not in the plan-approval step.

### LogMatch / ScheduleView gates

If we adopt Option C: when logging a new match assigned to season X, the player picker should only show players in `season_players` for X. This prevents accidentally adding a non-roster player retroactively. Admin override (always show all league players in pickers) is a future hardening option.

---

## File-by-file changes

| File | Type | Change |
|------|------|--------|
| `docs/database-schema.sql` | Edit | Append `season_players` table + RLS + grants + indexes; update relevant section header |
| Supabase migrations | New | `s049_season_players_table.sql` (CREATE TABLE + RLS + indexes + GRANTs) |
| Supabase migrations | New | `s049_season_players_backfill.sql` (idempotent INSERT for existing data) |
| Supabase migrations | New | `s049_season_management_rpcs.sql` (5 RPCs: create_season, end_season, update_season, reactivate_season, set_season_roster) |
| `padelhub/src/components/SeasonManagement.jsx` | New | ~250-350 lines: list view + new-season modal + detail sheet (rename/dates/roster/end/reactivate) |
| `padelhub/src/components/AdminDashboard.jsx` | Edit | Add Season Management entry button between Roster and Admin Management; owner-only |
| `padelhub/src/App.jsx` | Edit | New `sidebarView === "seasonManagement"` route mounting `<SeasonManagement />`; possibly add `seasonRosters` to context for prop access |
| `padelhub/src/components/LogMatch.jsx` | Edit (deferred to next phase if scope creeps) | Filter player pickers by current season's roster (Option C) |
| `padelhub/src/components/ScheduleView.jsx` | Edit (deferred) | Same filter |
| `padelhub/src/App.jsx` (ranking screen) | Edit (deferred) | Apply Option C filter to leaderboard population |
| `padelhub/public/sw.js` | Edit | Bump CACHE_NAME |

---

## Risks

1. **Production DB migration on a populated table** — backfill must be idempotent and row-pinned (per Lesson #39). Tested on a Supabase branch first if unsure. Affects every existing season.
2. **Stats consumer behaviour change** — Option C is non-trivial. Decision-making should happen in implementation kickoff with the user, not at plan-approval.
3. **Realtime sub overhead** — adding `season_players` to the realtime fan-out increases load. Mitigation: lazy-load on SeasonManagement mount instead of eager subscribe.
4. **Owner-only enforcement consistency** — match the precedent from S044 (`set_member_role` is owner-only, not admin). Use `leagues.created_by = auth.uid()` check inside RPCs, not the broader `is_league_admin_or_owner()`.
5. **`season_players` cascade on `players` delete** — already handled via `ON DELETE CASCADE`. But if we ever add soft-delete (FT-07), the cascade becomes a foot-gun (would silently drop the player from all season rosters). Soft-delete plan should account for this.
6. **"Active season" semantics** — currently the active season drives the league header subtitle and default ranking-tab selection. If admin creates a new season WITHOUT ending the previous one, multiple `active=TRUE` rows exist. Either enforce single-active-per-league via RPC (auto-deactivate previous on create), or accept multiple-active and pick the most-recent-start-date in UI. Recommendation: enforce single-active in `create_season` RPC. Override flag on the RPC for explicit multi-active leagues if ever needed.

---

## Verification criteria

1. Owner creates a season "Q3 2026" cloning Q2 roster → new row in `seasons`, N rows in `season_players`, leaderboard for Q3 shows the same N players.
2. Owner edits Q3 → removes 2 players, adds 1 new → roster reflected immediately.
3. Owner ends Q3 → `active=FALSE`, `end_date=today`. Header subtitle no longer shows "Q3 2026" if it was the active marker.
4. Owner reactivates Q3 → `active=TRUE`, `end_date=NULL`.
5. Non-owner admin attempts to call any RPC → permission denied (HTTP error or thrown exception).
6. Member with no role attempts to call any RPC → permission denied.
7. SELECT on `season_players` from a member of the same league → returns rows. From a member of a different league → returns nothing.
8. iPhone smoke test on PWA — navigate to AdminDashboard → Season Management → create / edit / end / reactivate flows.

---

## Out of scope (explicit deferrals)

- LogMatch / ScheduleView player picker filtering (deferred to Phase 2 once Option C is confirmed)
- Ranking screen leaderboard re-implementation per Option C (deferred to Phase 2)
- Soft-delete interaction with season rosters (FT-07, separate plan)
- Per-season ELO baseline reset (e.g., "new season starts everyone at 1000") — not asked for
- Season-to-season rollover automation (e.g., auto-create next season on end) — not asked for
- Multiple-active-seasons-per-league concurrency (recommended single-active enforcement)
- Season analytics deltas (e.g., "Q3 vs Q2 partner change") — not asked for

---

## Implementation order (when approved)

1. **DB:** apply `s049_season_players_table.sql` + `s049_season_players_backfill.sql` + `s049_season_management_rpcs.sql` as 3 named migrations via Supabase MCP (per Lesson — staged sub-migrations).
2. **Frontend skeleton:** `SeasonManagement.jsx` empty shell + AdminDashboard entry button + App.jsx route. Verify navigation works.
3. **Frontend list view:** seasons list + status badges + player count chip.
4. **Frontend new-season flow:** modal + clone-from toggle + `create_season` RPC call + toast + reload.
5. **Frontend detail sheet:** rename + dates + roster editor + `update_season` + `set_season_roster` calls.
6. **Frontend end/reactivate:** action buttons + RPC calls + confirmation prompt for end (irreversible-ish).
7. **DB schema doc:** update `docs/database-schema.sql`.
8. **Verify:** iPhone smoke test (steps 1-8 of verification criteria) before deploy + close issue #14.

Phase 2 (separate session, after user confirms Option C):
- LogMatch / ScheduleView filter
- Ranking screen leaderboard logic
- DB write trigger to enforce match.team_a/team_b players are in season_players (defense-in-depth, optional)

---

## Open questions (raise at implementation kickoff)

1. **Stats option: A / B / C?** (Recommendation: C as documented above)
2. **Single-active-per-league enforcement?** (Recommendation: yes, in create_season RPC)
3. **Should ending a season also archive its in-progress challenges + tournaments?** (Recommendation: no — those have their own lifecycle and aren't season-locked today)
4. **Reactivate end-date behaviour** — clear it, or preserve it as "previously ended on X"? (Recommendation: clear it. If user wants history, add an audit log.)
