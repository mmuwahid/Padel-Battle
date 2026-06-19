# Session Log — 2026-05-09 — Session068 — Mega-Bundle Polish + Sidebar History + Syne Sweep

**Project:** PadelHub
**Phase:** Post-Issue #46 master redesign (~99% done) — polish bundle from iPhone smoke + admin-promotion testing
**Duration:** ~14 hours (cross-day, started late 05-08 evening, continued through 05-09)
**Commits on main:** 11 — `d94b200` → `ee15a42` → `71efb86` → `dd33162` → `08b7036` → `9ecb4bd` → `728e68d` (misfire) → `1455da4` (fix) → `53b127e` → `5a0d249`

---

## What Was Done

### `d94b200` — Gate legacy claimPlayer form
Replaced inline 65-line `<input>`-based claim form in App.jsx with a `.pend-*` "Pending Review" lock screen (clock icon + Sign Out button). New deletes can no longer create the orphan league_member state (S067 PlayerMgmt.deletePlayer fix), but pre-S068 orphans still in the DB would have hit the legacy form and bypassed the new approval queue. This closes the last bypass surface from the S067 audit. Dropped 3 unused state declarations. SW v117 → v118.

### `ee15a42` — GitHub Issue #67 + #82 ship
- **#67** League menu status: each league card in LeaguesView now shows "{N} players · {M} matches" beneath the name with users + racket icons. Counts lazy-fetched on mount via parallel `count: 'exact'` queries per visible league. New `.lv-card-meta` CSS, layout switched from row to column-of-rows.
- **#82** "YOU" pill on roster removed, replaced with green border tint + accent inset shadow on `.prow.me`. Mirrors `.lv-card.current` pattern. Drops the pill that was truncating long names.
- **6 issues closed total in this session via `gh issue close`:** #75 (pull-to-refresh — already shipped S067-r1), #68 (NotificationCenter emoji-free — already shipped S067-r1), #41 (onboarding rework — covered by Phase 11 + S068), #46 (master redesign — closed with full status table summary), #67 (shipped this commit), #82 (shipped this commit).

SW v118 → v119.

### `71efb86` — Five-fix bundle from iPhone smoke after admin promotion
1. **W/L color coding in player roster pills:** Wins span gets `.w` (green) when >0, `.z` (muted grey) when 0. Losses span gets `.l` (red, NEW class) when >0, `.z` (grey) when 0.
2. **YOU pill → vertical green accent bar:** Per user direction, replaced full border tint with `box-shadow: inset 4px 0 0 0 var(--accent)` only. Names render fully — no truncation.
3. **Reactions disappear-after-1s race condition** (MatchHistory.jsx): Root cause was useEffect dep `matches` being a new array ref every render (from `.filter(seasonFilter)`). SELECT `match_reactions` refired on every render. If a SELECT was in flight when user clicked an emoji, the optimistic upsert state would be overwritten by the now-stale SELECT result → reaction visibly flashed for ~1s then vanished. **Fix:** stable `matchIdsKey` join string for the dep array + `cancelled` flag to ignore stale SELECT promises. Verified live: 6s of polling, reaction stays visible.
4. **Two notifications for one admin promotion:** Root cause confirmed via direct DB query — `set_member_role` SECURITY DEFINER RPC inserts notifications row with `data.kind='role_change'`, AND `sendPushNotification` from PlayerManagement routes through push-notify Edge Function which ALSO inserts via `insert_notifications` RPC with empty `data: {}`. Two rows → two list entries. **Fix:** dropped the client-side `sendPushNotification` call. Trade-off: target user no longer gets a separate web/PWA push for role changes, but they still get the in-app notification.
5. **Green claimed-dot on every Player Management avatar:** Was an actionable signal turned into visual noise (most players are claimed). Now the dot only renders for UNCLAIMED players. 14/14 in Padel Stars now render with 0 dots.

SW v119 → v120.

### `dd33162` — Unify back-button pattern + Player Mgmt header + strip all italics
- **Unified back-button:** Dropped `.hdr-back` conditional in App.jsx (was the outlier — replaced app header logo with back chevron + "PLAYER PROFILE" title). PlayerStats drill-in now renders `.back-btn-row > .back-btn` chevron at top of content area, same as every other drill-down (Admin / LeagueMgmt / SeasonMgmt / PlayerMgmt / PlatformAdmin / ApprovalQueue / Profile / Settings / Rules). App header is now `.hdr` on every screen, no exceptions.
- **Drill-in origin restoration:** New `drillInOrigin` state captures originating tab when drill is opened from a non-Players tab (Ranking podium / leaderboard row). On back, restores origin tab. Players grid → drill-in → back stays on Players (origin not captured). Ranking → drill-in → back returns to Ranking.
- **Player Management header:** Was 5 stacked levels (LEAGUE eyebrow / Player Management / Players subhead / 14 players / Add). Now 2 levels (Player Management / 14 players) + Add button right-aligned. New `.adsub` CSS class.
- **All italics stripped:** 12 CSS rules + 10 inline JSX `fontStyle:"italic"` occurrences. Verified — `getComputedStyle` audit returns 0 italic elements DOM-wide.

SW v120 → v121.

### `08b7036` — Sidebar history stack + PadelHub logo home link
- **Sidebar history stack:** New `sidebarHistory` state, `navigateSidebar(view)` (pushes current onto stack before switching), and `goBackSidebar()` (pops one level). Empty stack + back == reopen the drawer (since user originally entered from drawer). Drawer entries (Profile / Leagues / Rules / Settings) now use navigateSidebar. SettingsView's "Admin Management" tile + AdminDashboard sub-tiles all push history. Every drill-down's back-btn calls `goBack` prop. Verified: drawer → Settings → Admin → PlayerMgmt → back × 3 returns to drawer.
- **PadelHub logo home link:** Header `<div class="logo">` is now `<button class="logo logo-home">`. Click clears selectedPlayer + drillInOrigin + sidebarView + sidebarHistory + sidebarOpen, then setTab("board"). New `.logo-home` CSS strips default button chrome + adds press-state scale(.96).

SW v121 → v122.

### `9ecb4bd` — Drill-in Match Won/Lost color coding
Same conditional pattern as the player roster pills. New `.dpro-cell-v.zero` (grey, var(--muted)) replaces .win/.loss when value is 0. Match Won shows green only when wins>0; Match Lost shows red only when losses>0. Verified on Moody (5W/0L). SW v122 → v123.

### `728e68d` (MISFIRE) → `1455da4` (FIX) — Syne sweep + wordmark 15px
**Misfire:** Used `cp -r src/ /tmp/Padel-Battle/src/` from wrong cwd → cp's trailing-slash semantics resolved into `/tmp/Padel-Battle/src/src/` instead of overwriting. 13157-insertion ghost commit deployed to production with NO actual font changes. Caught within 30 seconds via `git diff --stat` showing only `public/sw.js | 2 +-`.

**Fix (`1455da4`):** Removed the bogus src/src/ tree (51 file deletions). Applied the real sweep:
- 40 CSS occurrences of `'Outfit', sans-serif` swept to `var(--font)` (= Syne).
- 26 inline JSX `fontFamily: "'Outfit',sans-serif"` swept to `"var(--font)"`.
- App header wordmark `.lt`: 14px / 900 / 1px letter-spacing → 15px / 800 / .04em.
- Numerics that already use `var(--mono)` (DM Mono) untouched per user direction.

Verified live via getComputedStyle — Header wordmark now Syne 15px 800; "LEADERBOARD" Syne 800 26px; podium player names Syne 800 13px; ELO/W/L numerics stayed DM Mono. SW v123 → v124.

### `53b127e` + `5a0d249` — Center "Player" leaderboard header
First commit only had the SW bump (Edit on App.jsx had failed-since-modified). Follow-up commit applied the actual `.lbh c` class addition to the Player header, matching the Rank header centering pattern. SW v124 → v125.

---

## Files Modified

### `d94b200` — App.jsx + sw.js
### `ee15a42` — App.jsx, components/PlayerStats.jsx, components/LeaguesView.jsx, index.css, sw.js
### `71efb86` — components/PlayerStats.jsx, components/MatchHistory.jsx, components/PlayerManagement.jsx, index.css, sw.js
### `dd33162` — App.jsx, components/PlayerStats.jsx, components/PlayerManagement.jsx, components/EditMyProfile.jsx, components/EditPlayerModal.jsx, components/MatchHistory.jsx, components/ProfileView.jsx, components/ScheduleView.jsx, components/SettingsView.jsx, components/CountrySelect.jsx, index.css, sw.js
### `08b7036` — App.jsx, components/Sidebar.jsx, components/AdminDashboard.jsx, components/PlayerManagement.jsx, components/LeagueManagement.jsx, components/SeasonManagement.jsx, components/ApprovalQueueScreen.jsx, components/ProfileView.jsx, components/SettingsView.jsx, components/RulesView.jsx, index.css, sw.js
### `9ecb4bd` — components/PlayerStats.jsx, index.css, sw.js
### `1455da4` — App.jsx, components/BracketSVG.jsx, components/CountrySelect.jsx, components/DoubleElimination.jsx, components/EditPlayerModal.jsx, components/ErrorBoundary.jsx, components/GameMode.jsx, components/RoundRobin.jsx, components/ScheduleView.jsx, components/SingleElimination.jsx, index.css, sw.js
### `5a0d249` — App.jsx (Player header `.lbh c` class)

---

## Key Decisions
- **Push notification trade-off for role changes:** dropped the client-side `sendPushNotification` call from `setRole` to fix duplicate notifications. Web push delivery for role changes is gone but in-app NotificationCenter row still works. Cleaner alternative would be plumbing an `in_app: false` parameter into push-notify Edge Function; deferred as bigger surface.
- **App header stays consistent everywhere** (PadelHub logo + bell + avatar). The spec wants page titles centered IN the AppHeader at 15px, but the user explicitly said keep current architecture (separate large h1 in content). The wordmark size matched spec at 15px; everything else stayed.
- **Sidebar drawer re-open on back-stack-empty:** when the back button is clicked from a drill-down with no parent in the history stack, the drawer reopens instead of closing the sidebar entirely. Matches mental model "I came from the drawer."
- **`.adsub` CSS class** as the standard count-subtitle pattern under page titles. May extend to other admin screens that have similar redundant subhead structures.
- **Origin restoration only for non-Players-tab entry points:** drill-in opened from Players grid keeps user on Players (origin captured as null/never set). Drill-in opened from Ranking captures `tab=board` and restores it on close.
- **Color/font sweep direction:** Outfit → Syne (activate the loaded but unused `--font` variable) was preferred over the alternative (rename `--font` to Outfit). Numerics stayed on DM Mono per direction.

---

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-05-09 | `cp -r src/ /tmp/Padel-Battle/src/` resolved into nested `/tmp/Padel-Battle/src/src/` because cp's trailing-slash semantics aren't what I assumed under MSYS Bash on Windows | Assumed GNU coreutils trailing-slash behavior (copies CONTENTS) but the actual resolution created a child directory | **For sync commits to /tmp/Padel-Battle, ALWAYS verify with `git diff --stat` before commit. If the diff stat shows only sw.js when you expected 5+ files of CSS/JSX changes, STOP — your sync didn't take. Use `cp -r src/. dest/` (dot suffix) or explicit per-file `cp src/foo.jsx dest/foo.jsx` instead of `cp -r src/ dest/`.** |
| 2026-05-09 | Did the misfire commit + push (728e68d) before checking the diff stat | Ran `cd /tmp/...; git diff --stat; git add; git commit; git push` as a single chained command without inspecting the stat output | **Split sync flow into two steps: copy files, then run `git diff --stat` and INSPECT it (look for the expected file paths) BEFORE staging + committing. The diff stat is the cheapest verification I have.** |
| 2026-05-09 | Edit tool failed silently with "modified since read" on App.jsx during the Player-header centering tweak — only the sw.js bump made it into the commit | Linter touched the file between my Read and Edit | **When Edit returns "file modified since read", it means the change WAS NOT applied. The commit will be missing it. Re-Read + re-Edit + verify diff stat shows the expected file count.** |

### Validated Patterns
- [2026-05-09] **Single class modifier is the cleanest centering API for grid headers** — adding `c` to `.lbh` in the leaderboard header matches the existing pattern; only one line changed. **Why:** when there's already a centering modifier (`.lbh.c` from S067), reuse it rather than introducing inline styles or new classes. Same DRY principle as `.r` for right-align in the same family.
- [2026-05-09] **`drillInOrigin` state for cross-tab drill-ins** — the simplest possible navigation memory: a single string holding the previous tab. Captured at the click handler, restored at the close handler. **Why:** doesn't require a stack since drill-in chains never go more than one tab-level deep. Generalizes naturally to any future "return to where you came from" requirement.
- [2026-05-09] **Sidebar history stack with sentinel-null for drawer-origin** — the implementation is ~25 lines: a `useState([])` stack, a `navigateSidebar` that pushes `sidebarView` (null at drawer time), and a `goBackSidebar` that pops + reopens drawer if popped value is null. **Why:** matches the mental model "I came from somewhere, take me back" without needing to model the drawer explicitly. The null sentinel naturally means "the drawer is the parent of any first-level view."
- [2026-05-09] **Direct DB query via Supabase MCP to confirm root cause of duplicate notifications** — `SELECT id, type, title, body, data, created_at FROM notifications WHERE title ILIKE '%admin%' ORDER BY created_at DESC` immediately revealed two rows ~4s apart per role change, one with `data.kind='role_change'` (RPC source) and one with `data: {}` (Edge Function source). **Why:** beats grepping source code for hypotheses. Same lesson as S067 GRANT investigation — the database is the source of truth for "did the row get inserted, by whom?"
- [2026-05-09] **Race-condition fixes belong on the dependency array, not on the consumer** — MatchHistory's `matches` filter was a fresh array reference every render, causing infinite useEffect re-runs that occasionally raced with optimistic upserts. The fix wasn't to dampen the optimistic update or add complex merge logic — it was to make the dep array stable via `matchIdsKey` (a string join). **Why:** when a useEffect's dep array churns by reference, the effect treats every render as a state change. Making the dep computed deterministically based on actual content (string join, hash, etc.) eliminates the spurious re-fires at the source.
- [2026-05-09] **Sweep CSS variables when their actual usage is fragmented** — `--font: 'Syne'` was loaded for months but only ~6 CSS rules referenced it; everything else hardcoded `'Outfit', sans-serif`. A 70-line Node script with regex replace handled the entire sweep in <30 seconds. **Why:** when a token is divergent from its use sites, the sweep is the cheapest unifier. Don't manually grep + edit per-file — let the script do it and verify the remaining hits with grep.

---

## Next Actions (continued in S069 plan in tasks/todo.md)

- [ ] **Color audit — live app vs JSX spec palette (HIGH PRIORITY for tomorrow)**
- [ ] User to E2E re-test approval workflow with all S068 fixes (post-#88f3b5a)
- [ ] Photo cropper/zoom in avatar uploader (deferred from S067)
- [ ] Claim-during-onboarding flow (currently always submits as new_profile)
- [ ] EditMyProfile design diffs (awaiting screenshot)
- [ ] Page title position alignment with spec — only if user changes their mind on architecture
- [ ] Performance: parallelize auth → leagues → match queries (cold-start halving)

---

## Commits & Deploy
- **Commit 1:** `d94b200` — Gate legacy claimPlayer → Pending Review lock screen (SW v118)
- **Commit 2:** `ee15a42` — Issue #67 League menu status + Issue #82 YOU pill (SW v119)
- **Commit 3:** `71efb86` — W/L colors + ME accent bar + reactions race + dup notif + avatar dot (SW v120)
- **Commit 4:** `dd33162` — Unify back-button + Player Mgmt header + strip italics (SW v121)
- **Commit 5:** `08b7036` — Sidebar history stack + PadelHub logo home link (SW v122)
- **Commit 6:** `9ecb4bd` — Drill-in Match Won/Lost grey-when-zero (SW v123)
- **Commit 7 (MISFIRE):** `728e68d` — Outfit→Syne sweep BUT actual edits never made it in due to cp misfire
- **Commit 8 (FIX):** `1455da4` — Restore Syne sweep + remove src/src/ tree, wordmark 15px (SW v124)
- **Commit 9:** `53b127e` — Center Player leaderboard header (SW v125 only — App.jsx change missed first time)
- **Commit 10:** `5a0d249` — Actually apply the Player header `.lbh c` class (true follow-up)
- **Live:** padel-battle.vercel.app on SW v125, commit `5a0d249`
- **GitHub issues closed:** #75, #68, #41, #46, #67, #82 (6 total)

---
_Session logged: 2026-05-09 | Logged by: Claude | Session068_
