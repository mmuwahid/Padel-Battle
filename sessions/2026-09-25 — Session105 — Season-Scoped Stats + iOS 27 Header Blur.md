# Session Log — 2026-09-25 — Session105 — Season-Scoped Stats + iOS 27 Header Blur

**Project:** PadelHub
**Phase:** Pre-store-launch (UI bug fixes from user-filed issues)
**Duration:** ~4 hours (2026-09-25 evening → 2026-09-26)
**Commits:** d7b569d, 4fff74a, + docs commit

---

## What Was Done

### Cold start
- Opened by listing GitHub issues: #160, #159, #158 filed 09-24/25 (after S104, so not in any doc), plus #156 / #137 / #124.
- Working clone `C:\Users\User\dev\Padel-Battle` was current (`7d01b36`, 0 behind / 0 ahead). rsync is missing on this PC, so the OneDrive mirror was synced with `cp -r`.
- **The local build was broken before any edit:** `@revenuecat/purchases-capacitor` is in `package.json` (added S103 on another PC) but was missing from `node_modules`. Fixed with `npm install`.
- `.claude/launch.json` (OneDrive working dir): `clone-dev-user` (port 5182) is the config that targets this PC's clone.

### #159 Players grid W-L ignored the season (FIXED, confirmed on device, CLOSED)
- Root cause: `PlayerStats` grid read `ps[p.id]` = App.jsx `ps` (App.jsx:698), built from ALL `individualMatches`. The season dropdown (`rosterSeason`) only filtered WHICH players appear, never their numbers.
- The drill-in profile read the same all-time data: `stats=ps[sp]`, `elo[sp]`, `getForm(sp)`, `getStreak(sp)`, plus H2H and RecentMatches on all matches.
- Fix (`PlayerStats.jsx`): a single `scopedMatches` memo (from `rosterSeason`) plus `scopedPs` / `scopedElo` (`calcElo`) / `scopedForm` / `scopedStreak`. The grid, drill-in, H2H, Recent Matches and the H2H-picker ELO all read these.
- Retired props kept but renamed `ps:_ps, elo:_elo, getForm:_getForm, getStreak:_getStreak`, so any leftover reference fails lint/build.
- One-way sync `useEffect(seasonId → rosterSeason)`, so a drill-in from Ranking opens in the same season.

### #160 Analytics not season-filtered + Worst Pair wrong (FIXED, confirmed on device, CLOSED)
- Root cause: `analyticsData` memo aggregated every season, and Analytics had no season control at all. Symptoms: Season 2 selected but the Season 1 report shown; Ahmed S (S2-only) listed in partnerships; "Basel/Jawad 4L" (= 3 in S1 + 1 in S2).
- Fix: `analyticsData` now reads `scopedMatches`. New `seasonScopePicker` (`.an-scope`, shares `rosterSeason` with the grid) is rendered in BOTH the data branch and the empty-state branch, so a 0-match season isn't a dead end. The H2H "All-time record" label is now `scopeLabel`.
- Worst Pair (USER decision): most losses → worst games-diff → most games (was lowest win rate).
  - Season 1: Basel/Hani and Basel/Jawad both 0-3; Basel/Hani is worst on games-diff (-22 vs -18).
  - All seasons: Basel/Jawad 0-4 is worst.
- **Found en route:** App.jsx passed `matches={approvedMatches}` to PlayerStats, so pairs-season matches leaked into individual stats (the #92 separation). Now `individualMatches`.

### Verification method (#159/#160)
- Expected numbers computed by read-only SQL per season (Padel Stars League: S1 = 9 matches, S2 = 1 match).
- jsdom harness in scratchpad: the project's own Vite `ssrLoadModule('/src/components/PlayerStats.jsx')` renders the REAL component with real league data; it drives both season pickers and the Analytics tab, then asserts on the on-screen text.
  - Negative control: poisoned all-time props (99W99L).
  - Result: **27/27 pass**. The same harness against `main`'s PlayerStats fails 14/14 grid checks (identical numbers for S1 / S2 / All, which is the user's report).

### #158 blurred header (FIX DEPLOYED, awaiting on-device confirmation)
- Header CSS was clean. Ruled out: backdrop-filter (only `.lp.pressing` / `.otop` / `.overlay`), synthetic bold (Syne 800 is loaded), SVG scaling.
- The issue screenshot showed only the top row blurred while "Leaderboard" directly below was sharp. The user then reported it is sharp while pulled down (pull-to-refresh) and blurs as it bounces back, so the blur depends on screen position.
- Cause (confirmed by several other PWAs, e.g. MrClit/fin-app#411 on iOS 27 standalone): iOS 26+ draws a Liquid Glass scroll-edge blur (~35pt) OVER page content under the status bar when using `black-translucent` + `viewport-fit=cover`. iOS 27 made it much stronger. It renders above the web view; no CSS or meta can disable it, and an opaque fixed backdrop was tried elsewhere and does nothing.
- Fix: `apple-mobile-web-app-status-bar-style` `black-translucent` → `default`. The status bar becomes opaque, tinted by the existing `theme-color #0a0a0f`, and the web view is inset below it. `.hdr` `padding-top: max(env(safe-area-inset-top,0px), 6px)` keeps the header in the same place (the user explicitly rejected moving it lower).
- iOS reads this meta at Add-to-Home-Screen time, so the icon must be deleted and re-added.

### Deploys
- `d7b569d` (#159/#160, SW v246) and `4fff74a` (#158, SW v247). Live confirmed by polling `sw.js` and grepping the live `PlayerStats-BDfVDl7P.js` chunk and `.hdr` rule.

---

## Files Modified

### Commit 1 (d7b569d) — 4 files
- `src/components/PlayerStats.jsx` — scoped data layer, analytics season picker (+ empty state), worst-pair sort, scope label (now 1066 lines)
- `src/App.jsx` — PlayerStats `matches={individualMatches}` + comment (1689 lines)
- `src/index.css` — `.an-scope` / `.an-scope-l`
- `public/sw.js` — v245 → v246

### Commit 2 (4fff74a) — 3 files
- `index.html` — status-bar-style `default` + explanatory comment
- `src/index.css` — `.hdr` padding-top `max(inset, 6px)`
- `public/sw.js` — v246 → v247

## Key Decisions
- Worst Pair ranks by absolute losses (USER), tie-break games-diff then games played.
- Player profile is season-scoped to match the grid card (USER).
- Contained fix inside PlayerStats (its own `rosterSeason`, one-way sync from global `seasonId`) rather than unifying with the Ranking tab's `selectedSeason`. Known limitation: changing season on Players does not change Ranking.
- #158 fixed by the opaque status bar, not by pushing the header down (USER rejected lowering it) and not by CSS (no CSS lever exists).
- The pre-existing lint error `ScheduleView.jsx:9 seasonRosters unused` was left alone (out of scope, not introduced this session).

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-09-25 | Asked the user to test #159/#160 while the fix existed only on a local branch; they tested the live app and reported "still broken" | Treated "built + committed on a branch" as done; never said the live app was unchanged | **Never ask the user to test until the live site serves the new build (poll `sw.js` CACHE_NAME / grep the live chunk). Say explicitly where the code is.** |
| 2026-09-25 | Forgot the SW `CACHE_NAME` bump on the first pass | App-code change without the deploy checklist | **Every app-code deploy bumps `CACHE_NAME`. sw.js has no skipWaiting (S091), so tell the user: open app, wait ~10s, swipe away, reopen.** |
| 2026-09-25 | Deployed #158 as a second, separate deploy; the user had to test twice | Shipped the verified half first while the other was undecided | **Batch all fixes into ONE deploy; resolve open decisions before deploying (memory `feedback_deploy_one_shot`).** |
| 2026-09-25 | Spent effort theorising about #158 (subpixel, synthetic bold) before looking at the user's screenshot or searching for the iOS change | Hypothesis-first instead of evidence-first | **For device-specific visual bugs: view the attached screenshot and search for recent reports of the same OS change first; the user's own observation (sharp when pulled down) was decisive.** |
| 2026-09-25 | Committed a stray `.claude/launch.json` into the repo (later removed before merge) | Assumed the harness reads the clone's launch.json; it reads the OneDrive working dir's | **Preview configs live in the OneDrive `.claude/launch.json`; use `clone-dev-user` (5182) on this PC.** |
| 2026-09-25 | Local build failed on the missing `@revenuecat/purchases-capacitor` | `package.json` changed on another PC (S103); `node_modules` was stale (S100 lesson recurred) | **Run `npm install` at cold start whenever `package.json` changed since the last session on this PC.** |

### Validated Patterns
- **Real-component jsdom harness with no test infra:** the project's Vite `createServer({middlewareMode})` + `ssrLoadModule(component)` + React 19 `act` + jsdom installed in scratchpad only, fed with real data from read-only SQL. **Why:** proves on-screen behaviour without a login or device, and it runs in seconds.
- **Poisoned-props negative control + run against `main`:** feed deliberately wrong all-time props (99W99L) and confirm the old code fails the same checks. **Why:** a green test that would also pass on the broken code proves nothing.
- **Recompute before asking:** read-only SQL per season showed the "worst pair" complaint came from the unscoped view, so the clarifying question went to the user with real numbers.
- **`_`-prefix retired props** so a missed reference fails lint/build instead of silently reading stale data.
- **Render the scope picker in the empty state too**, or selecting an empty season traps the user.

## Next Actions
- [ ] **USER:** delete + re-add the PadelHub home-screen icon, confirm #158 → close #158
- [ ] Existing PWA users keep the blur until they re-add the icon; decide whether to show an in-app hint (the Capacitor native app will supersede the PWA anyway)
- [ ] Capacitor iOS build: check the status-bar/web-view overlap on the iOS 26/27 SDK, since the same Liquid Glass band may apply natively (#156)
- [ ] Fix the pre-existing lint error `ScheduleView.jsx:9` (`seasonRosters` unused)
- [ ] Optional: two-way season sync between Players and Ranking
- [ ] Carry-over from S104/S105: Google Play verification (USER, blocking), Play RevenueCat chain, ASC localization, tier-limit enforcement, sandbox purchase test, store graphics

---

## Commits & Deploy
- **Commit 1:** `d7b569d` — [Session105] fix(#159,#160): scope Players grid, profile and Analytics to the selected season (SW v246)
- **Commit 2:** `4fff74a` — [Session105] fix(#158): stop iOS 26/27 Liquid Glass blur washing out the header (SW v247)
- **Live:** https://padel-battle.vercel.app (SW v247)

---
_Session logged: 2026-09-26 | Logged by: Claude | Session105_
