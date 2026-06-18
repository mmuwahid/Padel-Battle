# Session Log — 2026-06-18 — Session080 — Season Ruleset Casual vs FIP

**Project:** PadelHub
**Phase:** Post-S079 ship. New season-level feature: per-season ruleset (Casual vs Official FIP).
**Duration:** ~half day (cross-context, resumed after compaction)
**Commits:** `b698996` (feature + SW v180)

---

## What Was Done

### S079 smoke-test triage (start of session)
- User smoke-tested S079 ships on iPhone. Closed Issue **#92** (pairs season stats isolation) and Issue **#99** (Platform Admin RLS visibility) via `gh issue close` after PASS.
- Issue **#94** (responsive sizing iPhone 13) skipped — deferred to a future session.
- Color sweep Note A (S069 `#9090a4` vs spec `#555555`) deferred again — still awaiting user A1/A2/A3 decision.

### Season Ruleset — Casual vs Official FIP (main feature)
- Added a season-level **ruleset** chosen once at season creation, **immutable for the life of the season**. Two values: `'fip'` (default, existing behaviour) and `'casual'`.
- **Casual** = relaxed tracking: any number of sets (1–5), any set score where the two team scores differ (no FIP shape rule), no `incomplete` status, manual entry only (no LIVE mode). Match must have a decisive winner (more sets won) so `win()`/`calcElo` work unchanged.
- **Official (FIP)** = unchanged: best-of-three, FIP set shapes, 2/3 toggle, `incomplete` allowed, LIVE scoring engine.
- Spec doc written + committed at `planning/season-ruleset-casual-vs-fip.md`.

### DB layer (migration `s080_season_ruleset`, applied via MCP)
- `ALTER TABLE public.seasons ADD COLUMN ruleset TEXT NOT NULL DEFAULT 'fip' CHECK (ruleset IN ('fip','casual'))` — NOT NULL DEFAULT auto-backfilled the 1 existing row to `'fip'`.
- New `is_valid_casual_set(s jsonb)` — array length 2, both integers ≥ 0, a ≠ b.
- New shared `assert_valid_match_sets(p_sets jsonb, p_ruleset text)` — RAISEs ERRCODE 23514 on invalid. Casual: ≥ 1 set, each a valid casual set, decisive tally (a_wins ≠ b_wins). FIP: existing `is_valid_set` per-set shape check.
- `DROP FUNCTION create_season(...)` (6-arg) then recreated with added `p_ruleset TEXT DEFAULT 'fip'` param (validates IN, inserts into `seasons.ruleset`).
- Rewrote `matches_set_status_on_insert()` — looks up `v_ruleset` from `seasons` via `NEW.season_id` (COALESCE `'fip'`); PERFORMs the assert; casual → status approved (admin) / pending (else), **no `incomplete`**; fip → existing `is_complete_match` logic.
- New BEFORE UPDATE trigger `trg_matches_validate_update` → `matches_validate_on_update()` asserts when `NEW.sets IS DISTINCT FROM OLD.sets AND NEW.status <> 'incomplete'` (replaces the UPDATE coverage of the dropped CHECK).
- `DROP CONSTRAINT matches_sets_valid_or_incomplete` (kept `all_sets_valid` IMMUTABLE fn for the fip trigger branch).

### Frontend
- **scoringEngine.js** — `validateMatch(rawSets, ruleset='fip')`; fip branch unchanged; new `validateCasualMatch()` (strip trailing `[0,0]`, flag invalid sets by index, winner = more sets, level tally → `status:'invalid'`, else `'complete'` — never `'incomplete'`); new `isValidCasualSet([a,b])` export.
- **App.jsx** line 405 — added `,ruleset` to the `seasons` select so ruleset flows to all consumers via LeagueContext.
- **SeasonManagement.jsx** — `newRuleset` state (default `'fip'`); ruleset toggle in create sheet mirroring the format toggle ("Official (FIP)" / "Casual") + "locked for the life of the season" hint; `openCreate` resets `newRuleset`; `handleCreate` passes `p_ruleset`; read-only ruleset pill in the season detail header.
- **LogMatch.jsx** — `isCasual = currentSeason?.ruleset === 'casual'`; hide mode bar when casual (force manual entry); set-count toggle casual → `[1,2,3,4,5]`; stepper caps lifted to 99 when casual; pad `sets` array in `setVal` so indexes 4–5 work; `validateMatch(rawSets, isCasual?'casual':'fip')`.
- **EditMatchModal.jsx** — derive ruleset from the edited match's `season_id` via `seasons` from `useLeague()`; `validateMatch(sets, ruleset)`.
- **public/sw.js** — `padelhub-v179` → `padelhub-v180`.

---

## Files Modified

### Commit `b698996` — 7 files
- `src/utils/scoringEngine.js` — ruleset param + `validateCasualMatch` + `isValidCasualSet`
- `src/App.jsx` — `,ruleset` added to seasons select (line 405)
- `src/components/SeasonManagement.jsx` — ruleset state + create-sheet toggle + detail-header pill
- `src/components/LogMatch.jsx` — `isCasual` branch (mode bar hide, set-count 1–5, stepper cap, setVal pad, ruleset-aware validate)
- `src/components/EditMatchModal.jsx` — ruleset derived from match season + passed to validate
- `public/sw.js` — cache bump v180
- `planning/season-ruleset-casual-vs-fip.md` — spec doc

(DB migration `s080_season_ruleset` applied directly to Supabase via MCP — not in repo.)

## Key Decisions
- Q1 = Approach A — ruleset is a `seasons` column, default `'fip'` (additive, backfills cleanly).
- Q2 = casual matches must have a decisive winner (no level matches) so ELO/`win()` work unchanged — no stats-pipeline changes needed.
- Q3 = casual sets are any two non-negative integers where a ≠ b.
- Q4 = manual entry only for casual (no LIVE mode).
- Q5 = ruleset is **fully immutable** after season creation — all ranking/leaderboard/stats logic keyed to it.
- Q6 = default ruleset is Official (FIP).
- DB = validation in a shared `assert_valid_match_sets(sets, ruleset)` function called by INSERT + UPDATE triggers; dropped the old CHECK constraint because the ruleset lookup requires a subquery (forbidden in CHECK).

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-06-18 | `node -e '<script>'` with single-quote outer wrapper threw SyntaxError on patch scripts containing JS string literals (`'invalid'`, `'casual'`) | The shell's single-quote wrapper terminated at the first inner single quote | **Write multi-line/string-heavy Node patch scripts to a `.cjs` file via the Write tool, then `node file.cjs` — never inline `node -e` when the script contains quotes or `${}`.** |
| 2026-06-18 | First patch-script run failed MODULE_NOT_FOUND — `node /c/tmp/patch.cjs` | Write tool resolves `/tmp` to `C:\tmp`, but the live repo is at `AppData/Local/Temp/Padel-Battle`; the two `/tmp`s diverge | **In any Node script targeting the repo, hardcode the absolute path `C:/Users/UNHOEC03/AppData/Local/Temp/Padel-Battle/...`; never rely on a `/tmp` relative path that the Write tool and bash resolve differently.** |
| 2026-06-18 | Adding `p_ruleset` to `create_season` created a function overload instead of replacing it | Postgres keys functions by full argument signature; a new param = a new function | **When changing an RPC's parameter list, `DROP FUNCTION` with the exact old signature first, then `CREATE` the new one.** |

### Validated Patterns
- [2026-06-18] CHECK → trigger migration when validation needs a cross-table lookup — **Why:** the ruleset lives on `seasons` but the rule guards `matches`; Postgres CHECK forbids subqueries, so the only correct home is a trigger (INSERT trigger already existed; added a matching BEFORE UPDATE trigger to preserve the UPDATE coverage the dropped CHECK provided).
- [2026-06-18] Keep validation symmetric across client + DB — **Why:** `validateMatch(rawSets, ruleset)` and `assert_valid_match_sets(sets, ruleset)` implement the same casual/fip rules so console-direct INSERTs can't bypass the client; both verified with the same casual/fip test cases before deploy.
- [2026-06-18] Additive column with `NOT NULL DEFAULT` for a new immutable enum — **Why:** auto-backfills existing rows to the safe default (`'fip'`) and makes the frontend degrade gracefully (ruleset defaults to `'fip'` everywhere if the column is ever absent), so rollback is trivial.

## Next Actions
- [ ] iPhone smoke-test S080: create a Casual season, log a 4-set match with arbitrary scores (e.g. 8-3 / 1-6 / 10-5 / 2-4), confirm it validates + ranks; create an FIP season, confirm best-of-3 + shape rules still enforced and LIVE mode still available.
- [ ] After PASS, no issue to close (feature was not issue-tracked) — just confirm to user.
- [ ] Issue #94 — responsive sizing iPhone 13 (still open, untouched).
- [ ] Color sweep Note A (S069) — still awaiting user A1/A2/A3.
- [ ] Game Mode Phase 10 PR-D / PR-E (SE/DE/RR active views + BracketSVG tokens).

---

## Commits & Deploy
- **Commit:** `b698996` — `[Session080] Season ruleset: Casual vs Official FIP (SW v180)`
- **DB:** migration `s080_season_ruleset` applied to Supabase `nkvqbwdsoxylkqhubhig`
- **Deploy:** `dpl_GpHzC8jNUo6L5Pr4y7xWkeeNdDHR` — READY in production
- **Live:** padel-battle.vercel.app (SW v180)

---
_Session logged: 2026-06-18 | Logged by: Claude | Session080_
