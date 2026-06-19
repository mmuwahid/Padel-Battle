# Session Log — 2026-05-02 — Session040 — Score Input UX Fix

**Project:** PadelHub
**Phase:** Post-P7
**Duration:** ~1 hour (resumed from prior compacted session)
**Commits:** fdc8ea8

---

## What Was Done

### Score Input UX Audit & Fix
- User report: tapping any set-score field selected the entire number, no cursor placement, no backspace, slow and error-prone during live matches.
- Root cause identified across all 8 score inputs in 6 components:
  1. `type="number"` — iOS Safari does not support `setSelectionRange` on number inputs, so the cursor cannot be positioned with a tap and digit-by-digit editing is impossible.
  2. `onFocus={e=>e.target.select()}` — explicit forced select-all on every tap (present in 4 of the 6 components).
  3. `+e.target.value` coercion in onChange — converts to number immediately, destroying the empty-string mid-edit state.
- Minimal in-place fix applied (no new components, no design changes — per project's "Mockup first" + "No design changes without approval" rules):
  - `type="number"` → `type="text"` everywhere; `inputMode="numeric" pattern="[0-9]*"` retained so the numeric keypad still appears on mobile.
  - Removed `onFocus={e=>e.target.select()}` on all 4 controlled-input components.
  - Controlled inputs now use `value={s[i]===0?"":String(s[i])}` (or `sc?.a??""` for tournament components) with `placeholder="0"` for empty state.
  - `onChange` strips non-digits via `.replace(/[^0-9]/g,"")`, allows empty-string mid-edit (stored as 0), clamps to component-specific max (`7` for LogMatch/ScheduleView, `ptsPerRound` for AmericanoMode, no cap for RoundRobin).
- Uncontrolled inputs in SE/DE: only `type="number"` → `type="text"`. They have no `onFocus.select` and read their values via `parseInt(document.getElementById(...).value)`, which works identically on text inputs.
- Verified all 6 modified files compile via esbuild (`buildSync` with `jsx:'automatic'`).
- SW cache bumped v38 → v39 (forces PWA clients to re-fetch new bundle hashes).

### Advisor-Driven Scope Correction
- Initial plan was to extract a new `ScoreInput.jsx` component with `+/-` stepper buttons + inline text editing.
- Advisor correctly flagged this as a design change requiring approval and a violation of `padelhub/CLAUDE.md` workflow rules ("Mockup first", "No design changes without approval", "Do NOT over-engineer simple, obvious fixes").
- Reduced scope to the minimal in-place fix per existing input. Stepper UX deferred as a follow-up enhancement if user wants it later.

---

## Files Modified

### Commit fdc8ea8 — 7 files
- `src/components/LogMatch.jsx` (lines 199, 201) — Team A/B set scores: type, onFocus, value, onChange overhauled
- `src/components/ScheduleView.jsx` (lines 335, 337) — same pattern, `logSets` state, narrower width (48px)
- `src/components/RoundRobin.jsx` (lines 255, 259) — same pattern, no max cap (open-ended RR scores)
- `src/components/AmericanoMode.jsx` (lines 146, 151) — same pattern, `ptsPerRound` auto-coupling preserved
- `src/components/SingleElimination.jsx` (lines 296, 297) — type-only change (uncontrolled DOM-read inputs)
- `src/components/DoubleElimination.jsx` (lines 297–298 losers bracket, 320, 322 grand final) — type-only change
- `public/sw.js` — `CACHE_NAME` v38 → v39

## Key Decisions
- Minimal fix over stepper component — followed advisor guidance and CLAUDE.md workflow rules; offered stepper as deferred follow-up rather than silently expanding scope.
- Same-shape change applied to RoundRobin even though it lacks a max cap — keeps mental model consistent across all controlled score inputs in the codebase.
- Did NOT verify on local preview before push — change was a well-understood input-attribute swap with esbuild syntax confirmation; user explicitly said "deploy and push commit" in auto mode after seeing the fix summary. Vercel deploy verified READY post-push.

## Lessons Learned

### Validated Patterns
- Native iOS-correct numeric input pattern: `type="text" inputMode="numeric" pattern="[0-9]*"` — **Why:** `type="number"` is convenient but iOS Safari silently breaks cursor placement and `setSelectionRange` on it. `type="text"` with `inputMode="numeric"` keeps the numeric keypad on mobile while restoring full cursor/backspace behavior. Use this combo for any digit-only field where editing fluency matters (scores, OTPs, PINs, quantity).
- Empty-string-allowing controlled-number pattern: `value={n===0?"":String(n)}` + `onChange` digit-strip + `r===""?0:Math.min(MAX,parseInt(r,10))` — **Why:** lets the user clear the field mid-edit (no stuck "0" prefix) without storing a non-numeric value in state. Cleaner than maintaining a parallel string state.
- Advisor as scope guard before substantive work — **Why:** advisor caught the stepper-component scope creep before any code was written; the user's CLAUDE.md "Mockup first" / "No design changes without approval" rules would have been violated otherwise. Calling advisor before the FIRST edit on any non-trivial UX task is cheaper than a rollback.

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-05-02 | Initial plan proposed extracting a new `ScoreInput.jsx` stepper component for a "minimal score input fix" task | Conflated UX improvement opportunity with the requested fix; ignored padelhub/CLAUDE.md "Mockup first" + "No design changes without approval" rules | **Before any UX/UI work in PadelHub, re-read padelhub/CLAUDE.md "Workflow Rules" section. The minimal in-place fix is the default; new components/stepper/redesign require explicit user approval first.** |

## Next Actions
- [ ] User to verify on iPhone PWA: tap into a score field, confirm cursor lands where tapped, backspace deletes one digit at a time, clamp at 7 for LogMatch/ScheduleView still works, AmericanoMode auto-coupling still works.
- [ ] If user wants the +/- stepper UX as a follow-up, propose a mockup first per workflow rules.
- [ ] From S039 backlog (still deferred): broken "← Back to Leagues" button on player-claim screen (App.jsx:750) + drop dead `selectedLeagueId`/`tournaments` state — one-liner fix when next touched.
- [ ] From S039 backlog: FT-07 Player Deletion Redesign (plan approved at `plans/refactored-jumping-ember.md`).

---

## Commits & Deploy
- **Commit:** `fdc8ea8` — `[Session040] fix score input UX: native cursor editing on all 8 inputs`
- **Author:** m.muwahid@gmail.com (verified pre-push)
- **Deploy:** `dpl_8h84QWuvLNMqpNgEUzUNh7QrrLjp` — state READY (production)
- **Live:** padel-battle.vercel.app

---
_Session logged: 2026-05-02 | Logged by: Claude | Session040_
