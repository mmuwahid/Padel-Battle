# Session Log — 2026-05-06 — Session049 — Issue #15 Nav and Header + FT-14 Plan

**Project:** PadelHub
**Phase:** Post-P7
**Duration:** ~30 minutes (after S048 in same wall-clock session)
**Commits:** d3200d6

---

## What Was Done

### Issue #15 — tighten bottom nav + fix header overscroll
- **Bottom nav:** floating-pill `bottom` offset reduced from `calc(14px + safe-area-inset-bottom)` to `calc(6px + safe-area-inset-bottom)`. Pill internal padding `8/6/10` → `6/6/8`. Pedestal height `82px` → `68px`. Wrapper `paddingBottom` `96px` → `82px` (App.jsx line 774). Pill now sits much closer to the physical screen edge.
- **Header:** root cause analysis — sticky header looked fine when scrolled but appeared "way too far below the notch" only at the absolute top of the page. Cause: iOS rubber-band overscroll exposes the wrapper `BG` color above the sticky header. Fix injected into the `<style>` block at App.jsx line 776: `html,body{background:#0d0d14;overscroll-behavior-y:none;-webkit-overflow-scrolling:auto;}`. Body/html now match the header gradient start (#0d0d14), so any rubber-band reveals the same dark color rather than the lighter BG. `overscroll-behavior-y: none` prevents rubber-band entirely on supporting browsers.
- **SW:** v56 → v57.

### Issue #14 plan written (NOT shipped)
- New file `padelhub/planning/FT-14-season-management.md` (~270 lines) documenting full plan for season management screen.
- DB design: new `season_players` join table with PK `(season_id, player_id)`, RLS, indexes, idempotent backfill from existing data.
- 5 new RPCs (all SECURITY DEFINER, owner-only via `leagues.created_by = auth.uid()`): `create_season`, `end_season`, `update_season`, `reactivate_season`, `set_season_roster`.
- New component `SeasonManagement.jsx` mounted via `sidebarView === "seasonManagement"` from AdminDashboard.
- 3 stats-consumer options enumerated with recommendation (Option C — hybrid: roster gates pickers, leaderboard shows union of roster + match participants).
- Open questions explicitly listed for implementation kickoff. Out-of-scope deferrals enumerated.

---

## Files Modified

### Commit d3200d6 — 2 files (+8/-7)
- `padelhub/src/App.jsx` — wrapper paddingBottom 96→82, body/html dark + overscroll-behavior CSS injected, pedestal 82→68, pill bottom 14→6, pill padding 8/6/10 → 6/6/8
- `padelhub/public/sw.js` — CACHE_NAME v56 → v57

### Plan file (uncommitted, lives in workspace)
- `padelhub/planning/FT-14-season-management.md` — new plan

## Key Decisions
- **Body/html background paint is a one-line CSS fix** for the perceived header height inconsistency — much cheaper than restructuring the sticky header into a fixed header with body padding-top, and doesn't risk regression of the gradient + safe-area combo from S046 that the user already approved.
- **`overscroll-behavior-y: none` is additive defence** — paints the dark color first, then prevents the rubber-band entirely on Chromium/iOS-PWA standalone mode. Even if a browser ignores it (older iOS Safari), the dark paint still hides the BG-color reveal.
- **Plan FT-14 separately, ship #15 inline** — #15 was a fast UI tweak with no DB/architectural risk; #14 is a real feature with DB migration and stats-consumer trade-offs that need user input. Separating them lets #15 ship same-session and gives the user time to review the plan for #14 before any prod write.
- **`seasons` realtime sub** is already loaded; the plan defers `season_players` realtime to phase-2 to keep the initial load lean.

## Lessons Learned

### Validated Patterns
- **Body/html background paint as the cheap fix for "sticky header looks different at top vs scrolled" complaints** — when the wrapper has a different background color from the sticky header's gradient start, iOS rubber-band overscroll exposes the wrapper color and creates the visual mismatch. Painting `html, body { background: <gradient start>; }` is one CSS line and makes overscroll invisible. Pair with `overscroll-behavior-y: none` for browsers that support it. **Why:** Avoids restructuring the sticky header into a fixed header (which would force the entire content area to use padding-top compensation everywhere), and avoids per-screen tweaks. One-shot fix at the root.
- **Plan file inside the project, not in `~/.claude/plans/`** — re-validates Lesson from S043 about FT-07 plan loss. FT-14 plan written to `padelhub/planning/FT-14-season-management.md`, git-trackable, not session-volatile. Pattern: any plan worth approving is a plan worth committing.

## Next Actions
- [ ] User reviews `padelhub/planning/FT-14-season-management.md` — open questions for implementation kickoff are listed at the bottom
- [ ] On approval, implement FT-14 in S050 (3 staged DB migrations + frontend phase 1, leave stats-consumer changes to phase 2)

---

## Commits & Deploy
- **Commit:** `d3200d6` — `[Session049] Issue #15: tighten bottom nav + fix header overscroll`
- **Deploy:** `dpl_8M45iowtz5nExKrYarYSSWoXeodx` — READY (production)
- **Live:** https://padel-battle.vercel.app

---
_Session logged: 2026-05-06 | Logged by: Claude | Session049_
