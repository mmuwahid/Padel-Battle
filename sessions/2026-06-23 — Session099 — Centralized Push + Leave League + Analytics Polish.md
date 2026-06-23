# Session Log — 2026-06-23 — Session099 — Centralized Push + Leave League + Analytics Polish

**Project:** PadelHub
**Phase:** Pre-store-launch (notifications + membership soft-delete + analytics/UX polish)
**Duration:** long session
**Commits:** `da321c1` (#146), `0ace8cc` (#147), `15113db` (#137/#138), `f30b45a` (#148/#149)

---

## What Was Done

### Sidebar focus outline + grade label (#146, `da321c1`)
- Focus-trap focuses the `.ssheet` drawer container (tabIndex -1); flush to the right edge it rendered as a blue vertical line. Added `.ssheet:focus{outline:none}` (interactive buttons inside keep their own focus rings).
- Sidebar grade pill now reads "Grade: C" instead of bare "C".

### Auto-reload on stale lazy-chunk load failure (#147, `0ace8cc`)
- A mid-session user holds the old index bundle referencing chunk hashes the new deploy removed; opening a not-yet-cached lazy screen 404s the dynamic `import()` and dies un-retryably (React.lazy caches the rejected promise, so ErrorBoundary "Try Again" does nothing).
- `lazyWithReload` forces ONE full reload on chunk-load failure to pull the fresh index + valid hashes; a `sessionStorage` guard prevents reload loops. SW v237→v238.

### Centralized Web Push + OS app-icon badge (#137, `15113db`)
- **Centralized pushing:** an AFTER INSERT trigger on `notifications` calls `pg_net` → the new `push-on-notify` edge function, so EVERY bell row pushes uniformly. `push-notify` is now bell-insert only; removed the redundant client `skip_in_app` push calls.
- Match bell rows now include the logger (the logger sees their own match in their notification center).
- **OS badge:** `navigator.setAppBadge()` driven by unread count — App effect sets it on count change; the SW push handler reads `data.badge` from the payload (iOS 16.4+ installed PWA, guarded).
- Installed-PWA users auto-subscribe to push by default when permission is already granted.

### Leave League soft-delete + deletion sync (#138, `15113db`)
- Migration `s100_leave_league_soft_delete`: `league_members.status` ('active'|'left'). `leave_league(p_league_id)` SECURITY DEFINER blocks the owner, marks membership `left`, drops that league's push subs.
- Re-join via `approve_join_request` now reuses the existing `players` row and re-activates membership (history/stats/leaderboard preserved). `admin_has_permission` + `get_league_member_ids` now require `status='active'`.
- Client: `loadUserLeagues`/`joinLeague` filter to active; `leaveLeague` handler in LeagueGate; Leave League UI at the end of the LeagueManagement detail view (non-owners only); "Left league" pill in PlayerManagement; left members excluded from admins roster (PermissionsScreen) and `isPlayerAdmin` (PlayerStats).
- League deletion already refreshed instantly (optimistic prune + allowEmpty reconcile); `leaveLeague` mirrors it.

### Analytics streak + color polish (#148, `f30b45a`)
- `PlayerStats` streak tables (Longest Winning/Losing Streak) now require **2+ consecutive** results — `maxW>=2` / `maxL>=2` (a single win/loss is not a streak). Sections already gate on `.length>0`, so empty tables vanish.
- Highest Win Rates flashcard: wins green (`A`), losses red (`DG`) when > 0, dash muted (`MT`).
- Partners sub-tab: "Best Pairs" title gold (`GD`), "Worst Pairs" title red (`DG`); each pair's win% green when ≥ 50% else red.

### Consolidate duplicate league screens (#149, `f30b45a`)
- Removed the standalone `LeaguesView` (the Settings → "Switch League" duplicate). "Switch League" now routes to `leagueManagement` — the single home for switch/create/join/rename/delete/invite/leave.
- Folded Join-with-invite-code into the LeagueManagement list view (bottom-sheet mirroring Create) so no capability was lost. Also fixes the empty-state "Join with invite code" CTA, which already pointed at leagueManagement.

---

## Files Modified

### Commit `da321c1` (#146)
- `src/index.css` — `.ssheet:focus{outline:none}`.
- `src/components/Sidebar.jsx` — grade pill label "Grade: C".
- `public/sw.js` — v236→v237.

### Commit `0ace8cc` (#147)
- `src/App.jsx` (+ LeagueGate where lazy imports live) — `lazyWithReload` wrapper + sessionStorage guard.
- `public/sw.js` — v237→v238.

### Commit `15113db` (#137/#138)
- DB: trigger on `notifications` + `push-on-notify` edge fn; `push-notify` stripped to bell-insert; `s100_leave_league_soft_delete` migration.
- `src/App.jsx` — setAppBadge effect; `membersData` select adds `status`.
- `public/sw.js` — push handler setAppBadge; v238→v239.
- `src/components/LeagueGate.jsx` — active filters + `leaveLeague` handler.
- `src/components/LeagueManagement.jsx` — Leave League UI block.
- `src/components/PlayerManagement.jsx` — `statusByUserId`, "Left league" pill, gating.
- `src/components/PermissionsScreen.jsx` — admins filter `status!=='left'`.
- `src/components/PlayerStats.jsx` — `isPlayerAdmin` excludes left.
- `src/hooks/usePushNotifications.js` — auto-subscribe default.

### Commit `f30b45a` (#148/#149)
- `src/components/PlayerStats.jsx` — streak `>=2` filter; win-rate W/L colors; pair title + pct colors.
- `src/App.jsx` — `onSwitchLeague`→`leagueManagement`; removed `LeaguesView` import + route.
- `src/components/LeagueManagement.jsx` — Join-by-invite bottom-sheet + button.
- `src/components/LeaguesView.jsx` — DELETED (dead duplicate).
- `public/sw.js` — v239→v240.

## Key Decisions
- Leave League is a **soft-delete** (status flip), never a hard delete — match history, leaderboard standings, and the player profile stay intact; re-join + approval restores the record.
- Owner is blocked from leaving DB-side and the UI hides Leave League for the owner (owner sees Delete League instead) — mutually exclusive.
- #149: kept the "Switch League" entry in Settings (members understand the label) but pointed it at League Management, rather than removing the button entirely.
- Push is centralized at the DB layer (trigger→edge fn) so any code path that inserts a bell row pushes uniformly — no per-feature client push calls to keep in sync.

## Lessons Learned

### Validated Patterns
- [2026-06-23] **Centralize cross-cutting side-effects (push) at the data layer, not per-feature.** An AFTER INSERT trigger on `notifications` → edge fn means every bell insert pushes; removing the scattered client `skip_in_app` push calls eliminated the "fires inconsistently" class of bug. **Why:** one seam to reason about instead of N call sites that drift.
- [2026-06-23] **Soft-delete via a `status` column preserves all historical/derived data; guard every consumer that should ignore inactive rows.** Adding `status` to the membership select means "left" members now appear in `leagueMembers` — each consumer (admins roster, isPlayerAdmin, member-id RPCs, league list) must filter `status='active'`/`!=='left'` explicitly. **Why:** the soft-delete is only as correct as the weakest unfiltered consumer.
- [2026-06-23] **Before deleting a "duplicate" screen, diff its capabilities against the survivor and port the gap.** `LeaguesView` and `LeagueManagement` overlapped on everything except Join-by-invite — folding that one bottom-sheet into LM made the deletion lossless. **Why:** "it's a duplicate" usually hides one unique affordance.
- [2026-06-23] **A streak is a run of 2+; filter `maxW/maxL>=2`, and lean on the existing `.length>0` section gate so empty tables disappear instead of showing a lone single-win "streak".**

## Next Actions
- [ ] User smoke-test S099 ships (SW v240): notifications fire + push every time; OS app-icon badge; Leave League soft-delete + re-join restore; analytics streak/color polish; Switch League → League Management + Join-by-code.
- [ ] Native device smoke-test of the Capacitor shells (haptics, hardware back, splash/status bar).
- [ ] #129 v2 decision: full capability matrix, per-season overrides, member-grantable perms.
- [ ] Set up padelhub.app email addresses (support@/privacy@/legal@) — legal-page placeholders.
- [ ] Wire tier-limit enforcement (Free 1 league/1 season/5 invites; Pro unlimited) + RevenueCat at store launch.
- [ ] ⚠️ Regenerate Apple secret before 2026-12-18 (`scripts/gen-apple-secret.cjs`).
- [ ] Replace logo Option A placeholder with the designer's final mark when ready.

---

## Commits & Deploy
- **`da321c1` (#146):** sidebar focus outline + grade label — SW v237.
- **`0ace8cc` (#147):** auto-reload on stale lazy-chunk load failure — SW v238.
- **`15113db` (#137/#138):** centralized push + OS badge + Leave League soft-delete — SW v239.
- **`f30b45a` (#148/#149):** analytics streak/color polish + duplicate league-screen consolidation — SW v240, prod `dpl_6ThDUpuHYkh5PeVsvBsFZG3Egd8q` READY.
- **Live:** padel-battle.vercel.app

---
_Session logged: 2026-06-23 | Logged by: Claude | Session099_
