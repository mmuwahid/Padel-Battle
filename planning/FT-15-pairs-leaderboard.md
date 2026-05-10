# FT-15 — Pairs Leaderboard (Issue #25) — v2

**Status:** Plan locked, ready to build
**Drafted:** 2026-05-07 (S058) → v2 locked 2026-05-10 (S072)
**GitHub issue:** [#25](https://github.com/mmuwahid/Padel-Battle/issues/25)

---

## Problem

Today PadelHub treats every match as random-pairs casual play — partners change every round, and rankings track individuals. The user wants an additional season *format* where the same pair plays as a fixed team across an entire season (Premier Padel style). Leaderboard is then by pair, not individual.

---

## User decisions (locked S072)

| # | Question | Decision |
|---|----------|----------|
| Q6 | Pair ELO model | **Premier Padel style** — each pair has its own independent ranking points, seeded at 1500 per pair, accumulated within the season. NOT computed from individual ELOs. |
| Q7 | Pair name | Optional — auto-fallback displays "Player A & Player B" using the existing `formatTeam(p1, p2)` helper |
| Q8 | Mid-season player swap | Lock pairs once the season has any matches — admin must delete and recreate the pair (new pair starts fresh, no ELO inheritance) |
| Q9 | MOTM in pairs seasons | Keep MOTM per-player (still meaningful — individual standout in a fixed-pair match) |
| Q10 | Season selector visibility | All seasons visible regardless of format (no UI filter) |
| Q11 | Tournament integration | Defer to FT-17 — tournaments in pairs seasons stay individual-seeded for v1 |

---

## Goals

1. Allow a season to be flagged as "Pairs format" at create time.
2. In pairs seasons, every match pairs the same two players as a fixed team — pair-A vs pair-B.
3. Ranking screen for a pairs season shows pairs (not individuals) with their own MP/MW/ML/CW/EFF% columns + pair-ELO.
4. Allow registering pairs as first-class entities (named team, optional color).
5. Existing individual-format seasons unchanged — backward compatible.
6. Season format is **immutable after the season has any matches** (DB-side check).

## Non-Goals (defer)

- Pairs ELO that decays / re-pairs across seasons — within-season only.
- Tournaments-as-pairs (RR/SE/DE bracket of pairs) — FT-17.
- Pair-vs-individual seasons (impossible by design).
- Mid-season pair swaps with ELO carry-forward (Q8 = lock).

---

## DB Changes

### 1. `seasons` table — add `format` column

```sql
ALTER TABLE seasons
  ADD COLUMN format text NOT NULL DEFAULT 'individual'
    CHECK (format IN ('individual', 'pairs'));
```

- Default `'individual'` → all 15 existing seasons unchanged.
- CHECK constraint guards against typos.

### 2. New table `pairs`

```sql
CREATE TABLE pairs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  league_id       uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_a_id     uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  player_b_id     uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  name            text,             -- optional pair name; null → display as formatTeam()
  color           text,              -- optional accent for leaderboard row (#hex)
  elo             int  NOT NULL DEFAULT 1500,  -- pair-ELO, seeded at 1500
  created_at      timestamptz DEFAULT now(),
  CHECK (player_a_id <> player_b_id),
  UNIQUE (season_id, player_a_id, player_b_id)
);

-- Unordered uniqueness: {Moody, Husain} == {Husain, Moody}
CREATE UNIQUE INDEX pairs_unordered_uniq
  ON pairs (season_id, LEAST(player_a_id, player_b_id), GREATEST(player_a_id, player_b_id));

CREATE INDEX pairs_season_id_idx ON pairs (season_id);
```

**Note on pair-ELO storage:** Stored as a column on `pairs` and updated transactionally on match insert/update/delete via the same recompute pattern that exists for individual ELO. Value is materialized (not computed at read time) for leaderboard performance.

### 3. RLS

```sql
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pairs_select ON pairs FOR SELECT
  USING (league_id IN (SELECT get_user_league_ids(auth.uid())));

-- inserts/updates/deletes via SECURITY DEFINER RPCs only
```

### 4. `matches` — no schema change

`team_a`/`team_b` (uuid[] of player IDs) already encodes pair membership. Pair resolution at read time:

```sql
SELECT id FROM pairs
WHERE season_id = $1
  AND LEAST(player_a_id, player_b_id) = LEAST($team[1], $team[2])
  AND GREATEST(player_a_id, player_b_id) = GREATEST($team[1], $team[2]);
```

Helper SQL function `resolve_pair_id(p_season_id, p_team uuid[]) → uuid` will encapsulate this for ELO trigger use.

### 5. `update_season` extension

Add a guard inside the existing `update_season` RPC:

```sql
-- Refuse format change if the season has any matches
IF EXISTS (SELECT 1 FROM matches WHERE season_id = p_season_id) AND
   p_format IS NOT NULL AND
   p_format <> (SELECT format FROM seasons WHERE id = p_season_id) THEN
  RAISE EXCEPTION 'Cannot change format after season has matches' USING ERRCODE = 'P0001';
END IF;
```

---

## RPCs (3 new + 1 modified)

### `create_pair(p_season_id, p_player_a, p_player_b, p_name, p_color) → uuid`

- Caller must be league admin/owner via `is_league_admin_or_owner`.
- Validates season has `format='pairs'`.
- Validates both players are in the season's roster (`season_players`).
- Validates unordered uniqueness against existing pairs in the season.
- Inserts pair with `elo=1500`.
- Returns new pair ID.

### `update_pair(p_pair_id, p_name, p_color) → void`

- Admin-gated.
- Updates name/color only (cannot reassign players in v1 per Q8).

### `delete_pair(p_pair_id) → void`

- Admin-gated.
- Refuses if pair has any matches in the season (DB query against `matches` with team-resolution).
- Cascade on `pairs` table will not affect matches.

### `update_season` (modified)

- Add `p_format` parameter (optional).
- Apply lock-after-matches guard (see DB section 5).
- Otherwise unchanged.

---

## Pair-ELO computation

Reuse the existing individual-ELO transaction pattern:

1. On `matches` INSERT (status='approved'):
   - If season is pairs: resolve pair_a and pair_b via `resolve_pair_id`.
   - If both pairs exist in `pairs` table: apply K=40 ELO formula against pair_a.elo vs pair_b.elo.
   - Update both pairs' elo columns transactionally.
   - If a pair doesn't exist (data integrity issue — match logged with non-registered pair), log warning and skip ELO update.
2. On `matches` UPDATE (status flip pending→approved): same logic.
3. On `matches` DELETE: subtract previous delta (mirror existing pattern).

This logic lives in a new SQL function `update_pair_elo_on_match(p_match_id)` called from the existing match triggers.

**Skipping individual ELO in pairs seasons:** when the season is pairs, the existing individual ELO updates are skipped (individual ELO is not meaningful when pairs are fixed). The frontend's `seasonElo` selector will be format-aware.

---

## Frontend changes

### Season creation/edit (`src/components/SeasonManagement.jsx`)

- Add a "Format" segmented toggle to create + edit sheets:
  - `Individual` (default)
  - `Pairs`
- Format is **disabled in the edit sheet** if the season has any matches (DB-side check is the authority; UI mirrors).
- New section in the season detail view (only when `format='pairs'`): **Pairs Roster** — list current pairs with admin actions (rename, recolor, delete-if-no-matches). Add Pair button → modal with two-player dropdowns filtered to season roster.

### Match logging (`src/components/LogMatch.jsx` + `src/components/ScheduleView.jsx`)

When the active season has `format='pairs'`:
- Replace the 4-player picker (T1A, T1B, T2A, T2B) with a **2-pair picker** — each dropdown shows registered pair names (e.g., "Thunder · Moody / Husain" or auto-fallback "Moody / Husain").
- Resolve pair → underlying `team_a`/`team_b` uuid[] before insert (matches schema unchanged).
- Hide the team-shuffler / random-partner UI in pairs mode (violates fixed-pair semantics).
- LIVE mode: lock the pair selection at LIVE start from the registered pair list.

### Ranking screen (`src/App.jsx` + new `src/components/PairsRanking.jsx`)

When `selectedSeason.format === 'pairs'`:
- Render a new `<PairsRanking>` component instead of the current individual leaderboard.
- Columns: # | Pair (avatar A · name · avatar B) | MP | MW | ML | CW | EFF% | ELO
- Pair-ELO seeded at 1500, computed against opposing pair's ELO using K=40 formula.
- Podium top-3 pair cards (avatar pair + pair name + W-L + ELO).
- Form strip: last 5 matches per pair with W/L dots.
- Awards (Most Active, MOTM ranking) — Most Active by pair, MOTM stays per-player (Q9).

### Player Stats / Partners screen (`src/components/PlayerStats.jsx`, `src/components/CombosView.jsx`)

- Pairs seasons are **excluded** from the Best/Worst Pairs analytics inside Players → Partners (those are designed for variable-pair data; in pairs mode every match is the same pair, so the analysis is degenerate).
- A new "Pairs" sub-tab inside Players (or on the pairs-season Ranking screen) shows per-pair drill-down with ELO history + match list.

### Season selector (App.jsx)

- No filter — all seasons visible regardless of format (Q10).
- Selector chip can show a small format badge ("PAIRS" gold pill) next to the season name when format='pairs'.

### Sidebar / Settings

- No changes.

---

## Migration order

Stage as 4 named migrations via Supabase MCP `apply_migration`:

1. `s072_seasons_format_column` — add `format` + CHECK constraint (idempotent IF NOT EXISTS).
2. `s072_pairs_table` — table + indexes + RLS policies + GRANT.
3. `s072_pair_rpcs` — `create_pair`, `update_pair`, `delete_pair` + `resolve_pair_id` helper.
4. `s072_pair_elo_trigger` — `update_pair_elo_on_match` SQL function + extend match triggers + extend `update_season` with format-lock guard.

---

## Frontend commit sequencing

| Commit | Scope | SW bump |
|--------|-------|---------|
| **C1** | All 4 DB migrations + RPCs (frontend untouched) | none |
| **C2** | Format toggle in SeasonManagement (purely additive) + Pair Roster UI + create/update/delete RPCs wired | v137→v138 |
| **C3** | Pair-aware LogMatch + ScheduleView pickers (gated on `selectedSeason.format`) | v138→v139 |
| **C4** | New `PairsRanking.jsx` component + Ranking-screen branching + season selector format badge | v139→v140 |

C2/C3/C4 can ship as one PR or three depending on testing appetite. **Recommendation:** three PRs to isolate regressions.

**Pre-merge gate** per the #46 protocol: list prior tunings on touched files (`git log --oneline -- src/components/SeasonManagement.jsx`), `getComputedStyle` regression on `.lbtitle / .pod / .lbtable` for the new PairsRanking variant.

---

## Risk / blast radius

- **Low (DB):** Additive column + new table + new RPCs. No mutation of existing rows. `format='individual'` default keeps current seasons intact. Pair-ELO trigger only fires when a season is `format='pairs'`, so existing matches' individual-ELO path is untouched.
- **Medium (frontend):** Branching in 4 components (App.jsx Ranking, LogMatch, ScheduleView, SeasonManagement). Each branch gates on `selectedSeason.format`. Bug = wrong UI shown for the format. Mitigated by per-format gating + format-immutability after first match.
- **Edge case:** if an admin creates a pairs season but never registers pairs and someone tries to log a match → the team-resolution lookup fails. Frontend must block the LogMatch save until at least 2 pairs are registered (validation banner).

---

## Definition of Done

- [ ] 4 migrations applied to Supabase production
- [ ] Existing 15 seasons all have `format='individual'` (default backfill verified)
- [ ] iPhone smoke test: create pairs season → register 2+ pairs → log match between pairs → ranking shows pairs leaderboard with seeded 1500 ELO + post-match ELO update → no individual leaderboard rendered → switch to past individual season → individual leaderboard renders correctly
- [ ] Format change refused after first match (RPC raises exception)
- [ ] Delete pair refused if pair has matches (RPC raises exception)
- [ ] CombosView correctly excludes pairs seasons from Best/Worst Pairs analytics
- [ ] MOTM still per-player in pairs season matches
- [ ] Season selector lists all seasons regardless of format

---

## Open Questions

None — all 6 user decisions locked S072.

---

## Estimate

~700 lines new code:
- ~280 lines DB (4 migrations + 3 RPCs + RLS + GRANT + ELO trigger)
- ~120 lines SeasonManagement format toggle + Pairs Roster modal
- ~80 lines LogMatch / ScheduleView pair-aware picker branching
- ~250 lines new `PairsRanking.jsx` component (mirrors existing Ranking screen structure)
- ~30 lines App.jsx season selector format badge + branch routing

Ship in 2 sessions: 1 session for DB + SeasonManagement + Pair management UI (C1+C2); 1 session for pair-aware LogMatch/ScheduleView + PairsRanking + verification (C3+C4).

---

## Hand-off

After C1 lands clean (all 4 migrations success via Supabase MCP), validate by manually creating a pairs season + 2 pairs in SQL console, confirming the format-lock guard fires when attempting to insert a match. Then proceed to C2.
