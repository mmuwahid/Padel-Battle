# Season Ruleset — Casual vs Official FIP

> **Session:** S080 | **Status:** Approved, in build | **Date:** 2026-06-18

## Goal

Add a season-level **ruleset** chosen at season creation:

- **Official (FIP)** — current behaviour. Best-of-three, FIP set shapes (6-0..6-4, 7-5, 7-6), 2/3 set toggle, incomplete-match status allowed, LIVE scoring engine available.
- **Casual** — relaxed tracking for groups that don't follow tournament rules. Any number of sets (1–5), any set score as long as the two team scores differ (no ties within a set), no FIP shape restriction, no `incomplete` status. Manual entry only (no LIVE mode). Match must have a decisive winner (more sets than the other team).

The ruleset is **immutable for the life of the season** — chosen once at creation, never editable afterwards. All ranking/leaderboard/stats logic for a season is keyed to its ruleset.

## Why this works with existing stats

`win(sets)` (helpers.js) and `calcElo` (elo.js) are already format-agnostic — they derive the winner from the set tally, so they work for any set count. The only requirement is that **no match is level** (equal sets), which the casual validator enforces. No stats-pipeline changes are needed.

## Decisions (locked)

| # | Decision |
|---|----------|
| Q1 | Approach A — ruleset is a `seasons` column, default `'fip'`. |
| Q2 | Casual matches must have a decisive winner (no level matches) so ELO/win() work unchanged. |
| Q3 | Casual sets: any two non-negative integers where a ≠ b. |
| Q4 | Manual entry only for casual — no LIVE scoring mode. |
| Q5 | Ruleset is fully immutable after season creation. |
| Q6 | Default ruleset is Official (FIP). |
| DB | Approach A — validation in a shared `assert_valid_match_sets(sets, ruleset)` DB function called by INSERT + UPDATE triggers; ruleset-aware. |

## DB layer (migration `s080_season_ruleset`)

1. `ALTER TABLE public.seasons ADD COLUMN ruleset TEXT NOT NULL DEFAULT 'fip' CHECK (ruleset IN ('fip','casual'));` — NOT NULL DEFAULT auto-backfills existing rows to `'fip'`.
2. Replace `create_season` to accept `p_ruleset TEXT DEFAULT 'fip'`, validate `IN ('fip','casual')`, insert into `seasons.ruleset`.
3. New `is_valid_casual_set(s jsonb)` — array length 2, both integers, both ≥ 0, a ≠ b.
4. New shared `assert_valid_match_sets(p_sets jsonb, p_ruleset text)` — RAISEs on invalid:
   - casual: ≥ 1 set, each a valid casual set, decisive tally (a_wins ≠ b_wins).
   - fip: existing `is_valid_set` per-set check.
5. Rewrite `matches_set_status_on_insert()`: look up `v_ruleset` from `seasons` via `NEW.season_id` (COALESCE `'fip'`); PERFORM assert; casual → status approved (admin) / pending (else), **no `incomplete`**; fip → existing `is_complete_match` logic.
6. New BEFORE UPDATE trigger `matches_validate_on_update()` calling assert when `NEW.sets IS DISTINCT FROM OLD.sets AND NEW.status <> 'incomplete'` (replaces dropped CHECK's UPDATE coverage).
7. `DROP CONSTRAINT matches_sets_valid_or_incomplete` (keep `all_sets_valid` IMMUTABLE fn for the fip branch).

## Frontend

- **scoringEngine.js** — `validateMatch(rawSets, ruleset='fip')`; fip branch unchanged; casual branch: strip trailing `[0,0]`, ≥ 1 set, each set two non-negative ints with a ≠ b (else invalid), winner = more sets, level tally → `status:'invalid'` "Scores are level — a casual match needs a decisive winner.", else `'complete'` (never `'incomplete'`). Add `isValidCasualSet([a,b])`.
- **App.jsx line 405** — add `,ruleset` to the `seasons` select so ruleset flows to all consumers via LeagueContext.
- **SeasonManagement.jsx** — `newRuleset` state (default `'fip'`); ruleset toggle in create sheet after the format toggle; `openCreate` resets `newRuleset`; `handleCreate` passes `p_ruleset`; read-only ruleset pill in the season detail header.
- **LogMatch.jsx** — `isCasual = currentSeason?.ruleset === 'casual'`; hide mode bar when casual (force manual); set-count toggle casual → [1,2,3,4,5]; remove stepper cap when casual; pad `sets` array in `setVal` so indexes 4–5 work; `validateMatch(rawSets, isCasual?'casual':'fip')`.
- **EditMatchModal.jsx** — derive ruleset from the edited match's `season_id` via `seasons` (from `useLeague()`); `validateMatch(sets, ruleset)`; skip the `incomplete` block when casual.
- **public/sw.js** — bump cache version.

## Rollback

Single migration is additive except the dropped CHECK constraint; rollback = re-add the CHECK and restore the prior `matches_set_status_on_insert`/`create_season` bodies. Frontend reverts independently (ruleset defaults to `'fip'` everywhere, so old behaviour is preserved if the column is absent).
