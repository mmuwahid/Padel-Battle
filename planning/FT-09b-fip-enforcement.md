# FT-09b — FIP Scoring Enforcement

> **Plan written:** 2026-05-06 (Session045)
> **Predecessor:** FT-09 (S044) shipped match approval flow + display-only FIP rules. This plan adds **behavioural enforcement** of the FIP rules surfaced in S044's `data/rules.js`.
> **Tracking:** GitHub issue #10 (closed display-only in S044). Re-opens behaviourally here.

---

## Goal

Reject FIP-invalid set scores (e.g. 5-3, 8-6) at every match-entry surface — manual log, schedule confirm, admin edit — AND introduce a third match status `incomplete` for matches that have FIP-valid sets but no 2-set winner (e.g. 6-3, 4-6 abandoned). Incomplete matches save for the record but do not count in rankings/ELO/leaderboard/H2H/stats.

Defense-in-depth: enforce identical rules with a CHECK constraint at the DB level so console-direct INSERTs cannot bypass.

---

## Out of Scope

- Tournament internal matches (RR / SE / DE / Americano) — those don't write to `matches` table; their state lives in `tournaments.bracket_state`.
- Manual admin "force-promote incomplete to approved" UX — defer until first real complaint.
- Push notification on auto-incomplete — in-app toast only at submit time.

---

## Data Model

### `matches.status`
| Status | Meaning | Counts in rankings? |
|---|---|---|
| `pending` | Submitted by non-admin, awaits approve/reject | No |
| `approved` | Admin/owner submitted OR admin approved a pending match | Yes |
| `incomplete` | Match has FIP-valid sets but no 2-set winner | **No** |

### New SQL helpers (SECURITY DEFINER, STABLE, search_path public)
```
is_valid_set(set jsonb) returns boolean
  -- Accepts: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6 (and mirrors)
  -- Rejects everything else

is_complete_match(sets jsonb) returns boolean
  -- True if some team has won 2 sets among valid entries
```

### Trigger update — `trg_matches_set_status` (BEFORE INSERT)
4-quadrant decision tree:
| Submitter | Match shape | Resulting status |
|---|---|---|
| admin/owner | complete | `approved` |
| admin/owner | incomplete | `incomplete` |
| non-admin | complete | `pending` |
| non-admin | incomplete | `incomplete` |

### CHECK constraint
On `matches.sets`:
```
CHECK (
  jsonb_typeof(sets) = 'array'
  AND (SELECT bool_and(is_valid_set(elem)) FROM jsonb_array_elements(sets) AS elem)
)
```
Prevents server-side garbage shapes regardless of client.

### RLS update
Current `matches_select` 3-way union:
- approved-as-member
- pending-mine
- pending-as-admin

Add 4th branch:
- `incomplete-as-member` — every league member sees incomplete matches (transparency; they're not hidden, just out-of-rankings).

### App-level selectors
- `approvedMatches` (existing): `status === 'approved' || !status` — naturally excludes `incomplete`. No change needed.
- `pendingMatches` (existing): unchanged.
- New consumer? MatchHistory iterates raw `matches` for the timeline display; render `incomplete` rows with grey tint + "Incomplete" badge.

---

## Frontend Validator

### Single source of truth: `src/utils/scoringEngine.js`
New exports:
```
export function isValidSet([a, b]) -> boolean
  // Encodes the FIP per-set shape rules

export function validateMatch(sets) -> {
  status: 'invalid' | 'incomplete' | 'complete',
  error: string | null,             // present if 'invalid'
  completedSets: [[a,b],...],       // input minus trailing [0,0]
  invalidIndexes: number[],         // for red-border highlighting in UI
  winner: 'A' | 'B' | null
}
```

Behaviour:
- Strip trailing `[0,0]` (treated as "not played")
- For each remaining set: must pass `isValidSet` else mark `invalidIndexes`
- If any invalid → `status: 'invalid'`, error message names which sets are invalid
- Else: count set wins per team
- 2-set winner exists → `status: 'complete'`, `winner: 'A' | 'B'`
- Else → `status: 'incomplete'`, `winner: null`

### Test harness (Node `--input-type=module`)
- All FIP-valid shapes pass: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6 + mirrors
- Invalid shapes fail: 5-3, 5-4, 6-5, 7-4, 7-7, 8-6, 0-0, negative numbers
- Trailing zero stripping: [[6,3],[4,6],[0,0]] → completedSets = [[6,3],[4,6]], status = 'incomplete'
- Mid-zero NOT stripped: [[6,3],[0,0],[4,6]] → invalid (gap in middle is meaningless)

---

## Surfaces (4 file changes)

| File | Change |
|---|---|
| `src/utils/scoringEngine.js` | Add `isValidSet` + `validateMatch` exports |
| `src/components/LogMatch.jsx` | Run validator in submit handler. **Invalid:** toast `"Set N is not a valid score"` + red border on invalid ScoreSteppers + return early. **Incomplete:** allow save; toast `"Saved as incomplete — won't count toward rankings"`. **Complete:** existing flow (status set by trigger). |
| `src/components/ScheduleView.jsx` | Same validator gate in inline challenge log form |
| `src/components/EditMatchModal.jsx` | Same; admin sees "Will save as Incomplete" warning banner before "Save & Approve" if match is incomplete. **Invalid:** disable Save button + inline error. |
| `src/components/MatchHistory.jsx` | Render `incomplete` matches with grey tint + "Incomplete" badge inline. Visible to all members. |

### Red-border styling on invalid ScoreSteppers
Pass `invalid` prop into `ScoreStepper` (component lives at `src/components/ScoreStepper.jsx`). Renders `border: 1px solid DG` (existing danger-red token) when true.

---

## Migration Sequence

### Migration #1 — `s045_match_validation_helpers`
- Create `is_valid_set(jsonb)`
- Create `is_complete_match(jsonb)`
- Both `STABLE` `LANGUAGE SQL` `SET search_path = public` `SECURITY DEFINER`

### Migration #2 — `s045_audit_existing_matches` (read-only)
```
SELECT id, league_id, date, sets, status,
       is_complete_match(sets) AS is_complete,
       (SELECT array_agg(elem) FROM jsonb_array_elements(sets) AS elem WHERE NOT is_valid_set(elem)) AS invalid_sets
FROM matches
WHERE NOT (SELECT bool_and(is_valid_set(elem)) FROM jsonb_array_elements(sets) AS elem)
   OR NOT is_complete_match(sets)
```
**Output to user. Stop and wait.**

### (Decision gate) — Per-row handling
For each violator, user picks one of:
- **Keep** (only valid if FIP-valid; cannot be applied to invalid sets — those will fail the constraint)
- **Reclassify as `incomplete`** (UPDATE status)
- **Delete** (DELETE row + cascade ELO recalc on next page load)

### Migration #3 — `s045_rectify_existing_matches`
Per-row UPDATEs and/or DELETEs based on user decisions. Single migration, named with the resolution date.

### Migration #4 — `s045_match_status_incomplete`
- Drop existing status check constraint, recreate with `IN ('pending', 'approved', 'incomplete')`
- DROP + CREATE `set_match_status_on_insert()` trigger function with new 4-quadrant logic
- DROP + CREATE `matches_select` policy with 4-way union (adds incomplete-as-member branch)

### Migration #5 — `s045_match_sets_check_constraint`
- Add `CHECK (jsonb_typeof(sets) = 'array' AND (SELECT bool_and(is_valid_set(elem)) FROM jsonb_array_elements(sets) AS elem))` to `matches`

---

## Deploy Sequence

1. Apply migrations #1 + #2 (helpers + audit — non-destructive)
2. Surface audit results → user makes per-row decisions
3. Apply migration #3 (rectification)
4. Frontend commit:
   - `scoringEngine.js` validators
   - 4 surface changes (LogMatch, ScheduleView, EditMatchModal, MatchHistory)
   - SW v51 → v52
5. Push to main → Vercel auto-deploys
6. Apply migrations #4 + #5 (enum + trigger + RLS + CHECK)
7. iPhone smoke test (user)

**Why frontend ships before #4/#5:** If the CHECK constraint were applied first and a user submitted a match before the new front-end deployed, they'd get a raw 400 error. Frontend-first means the validator catches invalid input client-side before the constraint ever fires.

---

## Risk / Rollback

| Risk | Mitigation |
|---|---|
| Existing 7 matches violate FIP shapes | Audit is read-only; user reviews before any mutation |
| RLS policy update breaks Match Approvals queue | Test in dev: queue should still show only `pending`. Incomplete matches don't appear there. |
| CHECK constraint blocks legitimate edge case | If discovered, drop constraint + adjust `is_valid_set` + reapply. Single rollback unit. |
| SW cache invalidation stale | Bump v51 → v52; service-worker postMessage already triggers reload (S033 pattern) |
| `incomplete` matches confuse leaderboard users | Visible in MatchHistory with explicit badge + grey tint. Stats consumers naturally exclude them via existing `approvedMatches` selector. |

### Rollback path (if final deploy reveals regression)
1. Revert latest commit, push: `git revert <hash> && git push`
2. Drop CHECK constraint: `ALTER TABLE matches DROP CONSTRAINT matches_sets_valid`
3. Restore old trigger function + status enum check (sub-migration 4 has the CREATE; reverse with prior CREATE from S044)

---

## Verification Criteria

Before marking complete:
- [ ] Per-set validator unit tests pass (Node harness, all FIP shapes + 8 invalid shapes)
- [ ] LogMatch invalid → red-border + toast + no DB write
- [ ] LogMatch incomplete → saves with `incomplete` status + toast
- [ ] LogMatch complete (admin) → saves as `approved` + push
- [ ] LogMatch complete (non-admin) → saves as `pending` + admin notification
- [ ] EditMatchModal incomplete → warning banner shown
- [ ] MatchHistory renders incomplete matches with grey tint
- [ ] CHECK constraint catches a console-direct INSERT with sets `[[5,3],[4,2]]`
- [ ] `approvedMatches` selector excludes incomplete from ELO/leaderboard/H2H
- [ ] iPhone smoke test passes end-to-end

---

## Files Touched (predicted)

### Frontend
- `src/utils/scoringEngine.js` — +exports, +tests
- `src/components/LogMatch.jsx` — submit handler validation
- `src/components/ScheduleView.jsx` — inline form validation
- `src/components/EditMatchModal.jsx` — save handler validation
- `src/components/MatchHistory.jsx` — incomplete styling + badge
- `src/components/ScoreStepper.jsx` — optional `invalid` prop for red border
- `public/sw.js` — v51 → v52

### Backend
- 5 named migrations applied via Supabase MCP (`mcp__75fa96d3...__apply_migration`)
- `docs/S045-fip-enforcement.sql` — local source-of-truth for migrations (already applied)

### Out-of-repo
- `padelhub/planning/FT-09b-fip-enforcement.md` (this file)

---

_End of plan_
