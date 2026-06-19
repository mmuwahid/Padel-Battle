# Session Log — 2026-05-06 — Session045 — FT-09b FIP Scoring Enforcement

**Project:** PadelHub
**Phase:** Post-P7
**Duration:** ~3.5 hours
**Commits:** e25ac9b (single frontend commit; backend = 5 named migrations applied via Supabase MCP)

---

## What Was Done

### Decision: tackle FT-09b (behavioural enforcement of FT-09 display-only rules)
Cold start surfaced the S044 carry-over priority. User confirmed FT-09b ahead of SE/DE conversion or FT-07. Plan written to `padelhub/planning/FT-09b-fip-enforcement.md` (project-tracked per S043 lost-plan lesson) before any code touched.

### Frontend — `validateMatch` validator (single source of truth)
- Added `isValidSet(s)` and `validateMatch(rawSets)` exports to `src/utils/scoringEngine.js`
- `validateMatch` returns `{ status: 'invalid'|'incomplete'|'complete', error, completedSets, invalidIndexes, winner, droppedSets }`
- Strips TRAILING `[0,0]` (not played); mid-zero `[0,0]` kept and flagged invalid
- Auto-truncates dead-rubber sets — once a team has 2 set wins, all subsequent sets are dropped (silent + toast notice)
- Per-set shape rules: 6-0..6-4, 7-5, 7-6 (and mirrors) — anything else flagged with `invalidIndexes` for red-border highlight
- Node test harness (33 cases): all FIP shapes pass, 11 invalid shapes fail, dead-rubber truncation, trailing-zero strip, mid-zero invalidation, incomplete classification, deciders — all pass

### Frontend — 4 surfaces wired (1 commit, 8 files)
- **`src/utils/scoringEngine.js`** — `+isValidSet, +validateMatch` exports (preserves existing live state machine intact)
- **`src/components/ScoreStepper.jsx`** — `invalid` prop (default false) swaps border colour to `DG` (danger red) when true
- **`src/components/LogMatch.jsx`** — submit handler runs validator on either `liveToSets(liveState)` or `sets.slice(0,ns)` BEFORE save. `invalid` → toast + red borders + return early. `incomplete` → save proceeds with toast "Saved as incomplete — won't count toward rankings". `complete` with `droppedSets > 0` → "Match saved (dead-rubber set dropped)". Inline error banner under steppers. State clears on next stepper change. Push notification skipped for incomplete + pending.
- **`src/components/ScheduleView.jsx`** — same validator gate inside `saveLoggedMatch()` for the inline log form on confirmed challenges. Fresh validation state on `openLogMatch()`. Uses `play_challenge` RPC's existing JSONB return; status drives the toast + push gating.
- **`src/components/EditMatchModal.jsx`** — `validation` computed via `useMemo` from sets. Save & Approve disabled when `status !== 'complete'`. Inline banners: red error for invalid, gold warning for incomplete ("Match has no 2-set winner yet — cannot approve. Edit sets to complete the match, or use Reject."), green info for `droppedSets > 0`. Posts auto-truncated `validation.completedSets` to `update_pending_match` RPC.
- **`src/components/MatchHistory.jsx`** — pulls `incompleteMatches` from context. Merges approved + incomplete in chronological timeline (`[...matches, ...incompleteList]`). Incomplete rows render: grey border tint, 0.7 opacity, INCOMPLETE pill badge, no W/L labels, neutral white player names, grey set scores, "not counted in rankings" italic caption. MOTM badge hidden on incomplete.
- **`src/App.jsx`** — `+incompleteMatches` `useMemo` selector (`matches.filter(m => m.status === 'incomplete')`); added to context export.
- **`public/sw.js`** — `CACHE_NAME` v51 → v52.

### Backend — 5 named migrations (Supabase MCP, project nkvqbwdsoxylkqhubhig)
1. **`s045_match_validation_helpers`** — `is_valid_set(jsonb)` + `is_complete_match(jsonb)`. Both `IMMUTABLE`, `SET search_path = public`. `is_valid_set` accepts 2-elem JSON arrays of integers matching FIP shapes; rejects anything else (tested via 17-case smoke query, all pass).
2. **`s045_rectify_existing_matches`** — expand `matches_status_check` to allow `'incomplete'`; apply user's per-row decisions to the 7 existing matches (4 truncated, 2 reclassified incomplete, 1 unchanged).
3. **`s045_match_status_incomplete_trigger_rls`** — DROP+CREATE `matches_set_status_on_insert()`: now RAISEs `EXCEPTION` (ERRCODE 23514) when any element fails `is_valid_set`, then assigns status via 4-quadrant logic (`is_admin × is_complete`). DROP+CREATE `matches_select` RLS policy with 4-way union: approved-as-member OR incomplete-as-member OR pending-mine OR pending-as-admin.
4. **`s045_match_sets_check_constraint`** — `+all_sets_valid(jsonb)` IMMUTABLE wrapper (CHECK constraints can't contain subqueries). `+CONSTRAINT matches_sets_valid_or_incomplete CHECK (status = 'incomplete' OR all_sets_valid(sets))`. Rows with `status='incomplete'` bypass shape validation, preserving historical data + admin escape hatch.

### Existing data audit + rectification
Audit query against pre-migration matches table (7 rows, all in Padel Stars League):

| # | Date | Sets BEFORE | Sets AFTER | Status BEFORE | Status AFTER | Action |
|---|---|---|---|---|---|---|
| 1 | 2026-05-04 | `[6,2],[6,3],[1,6]` | `[6,2],[6,3]` | approved | approved | Truncated dead rubber |
| 2 | 2026-04-27 | `[6,5],[6,5]` | unchanged | approved | **incomplete** | Both sets FIP-invalid; reclassified |
| 3 | 2026-04-20 | `[6,1],[6,0],[6,5]` | `[6,1],[6,0]` | approved | approved | Truncated invalid 3rd set |
| 4 | 2026-04-17 | `[6,3],[6,3],[6,5]` | `[6,3],[6,3]` | approved | approved | Truncated invalid 3rd set |
| 5 | 2026-04-06 | `[6,3],[4,3]` | unchanged | approved | **incomplete** | 2nd set FIP-invalid (abandoned); reclassified |
| 6 | 2026-04-03 | `[6,2],[6,2],[4,6]` | `[6,2],[6,2]` | approved | approved | Truncated dead rubber |
| 7 | 2026-03-25 | `[6,4],[4,6],[6,2]` | unchanged | approved | approved | Genuine 3-setter (1-1 after 2 sets) |

Mid-session catch: user noticed inconsistency in initial recommendation (#1, #6 originally not flagged for truncation since their 3rd sets were FIP-valid shapes). Switched to strict FIP interpretation — "match closes once a pair wins 2 sets," so any post-2-0 set is dead-rubber regardless of shape validity. Validator now auto-truncates these going forward + retroactively cleaned existing #1, #6.

### Verification
- 33/33 Node validator unit tests pass (FIP shapes, invalid shapes, dead-rubber truncation, trailing zeros, mid-zeros, incomplete classification, deciders)
- esbuild syntax check on all 6 modified component files + App.jsx + sw.js
- Local Vite dev server (port 5180) — app boots cleanly, no console errors, MatchHistory renders rectified data correctly (incomplete badges visible, truncated matches show 2 sets, leaderboard recalculated with #2 and #5 dropped from rankings)
- Vercel deploy `dpl_HKHhKuNMn5cjVp7rJZ4EppbRPG9i` READY (~6s build)
- iPhone smoke test passed end-to-end

---

## Files Modified

### Commit e25ac9b — 8 files (+218 / −40)
- `src/utils/scoringEngine.js` — +81 lines (isValidSet + validateMatch + tests harness reference comments)
- `src/components/LogMatch.jsx` — submit-handler validator + state + inline error banner + ScoreStepper invalid props
- `src/components/ScheduleView.jsx` — saveLoggedMatch validator + state + inline error + ScoreStepper invalid props
- `src/components/EditMatchModal.jsx` — useMemo validation + Save & Approve disabled gate + 3 banner variants + auto-truncated `completedSets` posted to RPC
- `src/components/MatchHistory.jsx` — pull `incompleteMatches` from context + merge into timeline + grey/badge styling
- `src/components/ScoreStepper.jsx` — `invalid` prop (8-line change; default false; swaps border to DG when true)
- `src/App.jsx` — +`incompleteMatches` selector (4 lines) + context export (1 line)
- `public/sw.js` — v51 → v52

### Out-of-repo files (OneDrive only, not git-tracked)
- `padelhub/planning/FT-09b-fip-enforcement.md` *(new)* — full implementation plan

### DB migrations (applied via Supabase MCP, no source-of-truth file in git this session)
- `s045_match_validation_helpers`
- `s045_rectify_existing_matches`
- `s045_match_status_incomplete_trigger_rls`
- `s045_match_sets_check_constraint`

---

## Key Decisions

- **`status='incomplete'` as a third enum value** rather than rejecting all incomplete matches outright. User wanted incomplete matches preserved for the record but excluded from rankings — clean semantic separation from `pending` (admin gate) and `approved` (counted).
- **Strict FIP truncation extended to dead-rubber sets,** not just invalid 3rd sets. User caught the inconsistency mid-session. The rule "match closes once a pair wins 2 sets" applies regardless of whether further sets are FIP-valid shapes — they're exhibition, not match. Validator auto-truncates going forward + applied to existing #1 and #6.
- **EditMatchModal blocks BOTH invalid AND incomplete on Save & Approve.** Admin reviewing a pending match should either edit it to be complete or use the Reject button — saving as incomplete via the approve flow doesn't make semantic sense (admin is explicitly approving a result). Reduces RPC complexity (no `update_pending_match` change needed for incomplete classification).
- **Conditional CHECK constraint with `status='incomplete'` bypass.** Allows historical data preservation (matches #2 and #5 have invalid sets but valid status) AND provides escape hatch for future admin-marked incomplete entries with malformed scores. Trigger-level RAISE catches new client-driven invalid INSERTs.
- **CHECK constraint via IMMUTABLE wrapper function** (`all_sets_valid`). Postgres CHECK doesn't allow subqueries directly; wrapping the validation in an `IMMUTABLE` SQL function is the clean workaround. Same pattern usable for any future shape constraints.
- **Validator at scoringEngine layer**, not duplicated per consumer. Each surface (LogMatch, ScheduleView, EditMatchModal) imports the same `validateMatch` — single source of truth matches the DB-side `is_valid_set`/`is_complete_match` helpers conceptually. New surfaces inherit correct behaviour by importing and following the same gate pattern.
- **Frontend ships before final DB constraint application** (already applied this session in correct order). Sequencing protects against the race window where a stale client could submit invalid data and get a raw 400.

---

## Lessons Learned

### Validated Patterns
- **IMMUTABLE wrapper function for CHECK constraints with subquery logic.** `CHECK (status = 'incomplete' OR all_sets_valid(sets))` where `all_sets_valid` calls `is_valid_set` over `jsonb_array_elements`. Postgres CHECK forbids subqueries directly; wrap the validation in a SQL function marked IMMUTABLE (and `SET search_path = public`) and the constraint accepts it. **Why:** Lets you express composite shape rules at the DB level without resorting to triggers, and keeps the rule in one place callable from both CHECK and trigger code.
- **Conditional CHECK with status-based bypass for historical data preservation.** `status = 'incomplete' OR shape_valid(...)`. Means rows with `status='incomplete'` skip the shape rule, allowing legacy malformed data to remain visible (just out-of-rankings). Trigger-level `RAISE EXCEPTION` catches new client-driven invalid INSERTs separately. **Why:** Adding a tight CHECK to a populated table is otherwise destructive; conditional bypass + trigger-level enforcement is the gentler defence-in-depth pattern.
- **4-quadrant trigger logic (role × completeness) for status assignment.** Single decision tree replaces both "is admin?" and "is complete?" branches. Maps cleanly to UX: admin+complete=approved, admin+incomplete=incomplete, non-admin+complete=pending, non-admin+incomplete=incomplete. **Why:** Single point of truth for what status a new row gets — avoids the temptation to set status from the client, and trivially extends if a fifth status is ever needed.
- **Rectification migration as a single transaction with explicit per-row UPDATEs.** Six rectifications (4 truncations + 2 reclassifications) in one named migration `s045_rectify_existing_matches`. Each UPDATE includes the original sets value as predicate (`WHERE id = '...' AND sets = '...'::jsonb`) so the migration is idempotent — re-running has no effect once applied. **Why:** Per-row predicates make the migration self-documenting (reviewer sees which row was rectified to what) and safe to re-run if the migration log is uncertain.
- **Validator auto-truncates dead rubber + reports `droppedSets` count.** Caller can show a different toast when a set was silently dropped. Toast text "Match saved (dead-rubber set dropped)" surfaces the auto-truncation transparently rather than silently mutating the user's input. **Why:** Validator does the right thing without requiring client-side awareness of the rule, but the count gives consumers the option to surface the change.
- **`useMemo` validation in EditMatchModal driving disabled state.** `const validation = useMemo(() => validateMatch(sets), [sets])` recomputes on every set-input change. Save button's `disabled={!canApprove}` flips automatically; banners render conditionally on `validation.status`. **Why:** Reactive validation feedback without manual debounce or onChange wiring on every input — dependencies update via React's state model.

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-05-06 | Initial recommendation table flagged matches #3, #4 (invalid 3rd sets) for truncation but skipped #1, #6 (dead-rubber 3rd sets that were FIP-valid shapes). User caught the inconsistency. | I conflated two different rules: per-set shape validity vs. match-completeness. They're separate axes. A 3rd set after a 2-0 win is dead-rubber regardless of whether its shape is FIP-valid. | **When applying multi-axis rules to existing data, enumerate ALL axes explicitly per row before recommending actions.** Make a 2D table: rows = matches, columns = each rule independently. Recommend per cell, not per match. Catches "this match passes rule X but fails rule Y" cases that single-axis thinking misses. |
| 2026-05-06 | Used `result` as a variable name in `ScheduleView.saveLoggedMatch()` for the validator output, conflicting with the `play_challenge` RPC response also named `result`. esbuild caught the redeclaration. | Reused a generic name without checking surrounding scope. Both validator output and RPC response are commonly named `result`. | **When adding a new step to an existing async flow, grep for `result\|response\|data` in the function body before naming a new local.** Renaming the validator output to `v` (or any unambiguous name) avoids the collision. Generic names should be reserved for the LAST mention in a flow. |

---

## Next Actions

- [ ] **SE/DE stepper conversion (deferred since S043)** — `SingleElimination.jsx` and `DoubleElimination.jsx` use uncontrolled `getElementById(...).value` reads. Need controlled state + ScoreStepper + the same FIP validator at submit. The validator is now ready to drop in.
- [ ] **FT-07 Player Deletion Redesign** — fresh plan reconstruction needed (orig plan file lost in S035). S045's `incompleteMatches` selector pattern + `status` enum approach is now the canonical reference.
- [ ] Optional: extend BL/GD team-identity convention from LogMatch manual mode to LIVE mode + ScheduleView's inline log form (S043 deferred item)
- [ ] Optional: kill stale `tournaments` realtime subscription (S043 deferred item)
- [ ] Future hardening: add `SET search_path = public` to all SECURITY DEFINER functions (existing pre-S045 functions don't have it)

---

## Commits & Deploy

- **Commit:** `e25ac9b` — `[Session045] FT-09b: FIP scoring enforcement + incomplete-match status`
- **Deploy:** `dpl_HKHhKuNMn5cjVp7rJZ4EppbRPG9i` READY (production), built ~6s
- **Live:** https://padel-battle.vercel.app
- **DB migrations applied (Supabase project `nkvqbwdsoxylkqhubhig`):**
  - `s045_match_validation_helpers`
  - `s045_rectify_existing_matches`
  - `s045_match_status_incomplete_trigger_rls`
  - `s045_match_sets_check_constraint`

---
_Session logged: 2026-05-06 | Logged by: Claude | Session045_
