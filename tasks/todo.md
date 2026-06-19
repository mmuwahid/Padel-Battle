# Active Work

## NEXT SESSION (S088) — START HERE
**Last session:** S087 (2026-06-19) — **Issue #108 League Invite fully fixed + closed.** 1 commit `f1a08bb`, DB migration `s108_approve_join_request_carry_over`, SW v193→v194, 5 files. Both invite paths (link `tryAutoJoin` + in-app `joinLeague`) now create PENDING join_requests (approval queue) instead of direct `league_members` insert (#1 — empty-queue root cause); `approve_join_request` backfills the new player row (country/DOB/gender/court/handedness/**avatar**/nickname/grade) from the user's most-recent existing claimed player (#2); `LeagueManagement.copyLink` copies the raw invite code, Share keeps the URL (#3); league isolation verified — players/matches per `league_id` (#4); approval-gating + lock-screen "Switch to another league" escape means pending users keep access to other leagues (#5). **#6** (invite link opens Safari, not the installed PWA) DEFERRED to the Capacitor native wrap (Universal Links — unsolvable in a pure iOS PWA). Husain's orphaned Intermediate membership reset (re-joins via fixed flow). Deploy `dpl_3VJurEmFjqvrhBFqUEkAVc9tEP7Z` READY. **Production live on SW v194, main `f1a08bb`.**

### 🎯 PENDING USER SMOKE-TEST (S087 ship — SW v194)
- Husain re-joins Intermediate (link or code) → sees "Waiting for approval" (not added silently); admin gets a "New join request" notification.
- Admin Dashboard → Approval Queue shows Husain with details prefilled; Approve → his player appears with avatar/country/handedness/court/grade carried over from Padel Stars League.
- League Management copy button → pastes the raw code (e.g. `11030f72`), not a URL.
- While pending in Intermediate, Husain still uses Padel Stars normally (no global lockout).

### 🎯 S088 PRIORITY
1. Address any S087 smoke-test feedback.
2. **Reconcile stale git meta-docs** — the git repo's `tasks/`, `sessions/`, `CLAUDE.md` are frozen at S080; S081–S087 docs live only in OneDrive. Commit them so git history is complete (see S087 log + lessons).
3. Resume App Store + Google Play launch prep (Capacitor wrap) — includes **#6 Universal Links** for invite deep-links. G1 Apple login pending Apple Developer account.
4. **Issue #94** — UI responsive sizing for iPhone 13.
5. Color sweep Note A — verify whether S084's `--muted`→`#9090a4` already closes it.

---

## NEXT SESSION (S087) — DONE (archived)
**Last session:** S086 (2026-06-19) — **Pre-store-launch polish batch (`8b4ba43`, SW v192→v193, 0 DB migrations).** FT-17 wording (in single-source `utils/grade.js`): Groundstrokes "FH/BH"→"Forehand/backhand", Glass footer→"Backglass · sideglass · double glass", Net Play first answer→"Volleys pop up and float or go into the net; not confident at the net". GradeAssessmentModal: removed the VISIBLE running-total bar + ×N weight multiplier (computation untouched — weights still drive `computeGrade`, result still shows total). Grade pill now `Grade: {grade}` in a two-row pill layout (Row 1 Country/Age/Grade, Row 2 Handedness/Court) on ProfileView + PlayerStats drill-in. Tournament final results (SE/DE/RR): new shared `src/components/tournamentResults.jsx` (`rankBadge`+`TeamPlayers`) → champion/runner-up/standings show player avatars+names + 🏆🥈🥉 medals + green-W/red-L colors. Two bug fixes: SE "View Bracket" no-op (added `viewBracket` state + "Back to Results") and SE/DE/RR "New Tournament" reset race (`await endTournament()` before `resetTournament()`). Deploy `dpl_GLEnioykoMJncM9tgtxz7o23Le6v` READY. **Production live on SW v193, main `8b4ba43`.**

### 🎯 PENDING USER SMOKE-TEST (S086 ship — SW v193)
- **FT-17 wording:** Groundstrokes reads "Forehand/backhand"; Glass/Wall footer reads "Backglass · sideglass · double glass"; Net Play first answer reads "Volleys pop up and float or go into the net; not confident at the net".
- **Assessment display:** no running-total bar and no ×N weight multiplier visible during the questions — but the result screen still shows a grade with its total (e.g. 54/72 → B). Step counter still shows.
- **Grade pill:** shows as `Grade: C` (label prefix) in a two-row pill layout — Row 1 Country/Age/Grade, Row 2 Handedness/Court — on My Profile and player drill-in. Admin override (EditPlayerModal) still works; a brand-new player shows NO grade.
- **Tournament results (SE/DE/RR):** champion + runner-up + standings show player avatars+names (not "Team A/B"); ranks show 🏆🥈🥉 for top-3; W green, L red when >0.
- **SE View Bracket:** "View Bracket" now opens the bracket; "Back to Results" returns to the final standings.
- **New Tournament:** resets fully to Game Mode (no auto-re-render of Final Standings) without an app restart, on SE/DE/RR.

### S086 outcomes (this session — archived)
- [x] FT-17 wording fixes in `utils/grade.js` (forehand/backhand, glass footer, net-play answer)
- [x] GradeAssessmentModal: hide running-total + weight multiplier (computation intact)
- [x] ProfileView + PlayerStats: `Grade:` label + two-row pill order
- [x] New shared `components/tournamentResults.jsx` (`rankBadge` + `TeamPlayers`)
- [x] SE/DE/RR champion+standings avatars/medals/W-L colors
- [x] SE "View Bracket" fix (`viewBracket` state + Back to Results)
- [x] SE/DE/RR "New Tournament" reset-race fix (await endTournament)
- [x] SW v193, esbuild syntax check (8 files), commit `8b4ba43`, push, deploy READY, OneDrive synced

### 🎯 S087 PRIORITY
1. Smoke-test SW v193 (FT-17 polish + tournament results) — see pending section above.
2. Resume **App Store + Google Play launch** prep (Capacitor wrap) — see project_store_launch memory. G1 Apple login pending Apple Developer account.
3. **Issue #94 — UI responsive sizing for iPhone 13** (leaderboard name truncation) — still open.
4. **Color sweep Note A from S069** — verify whether S084's `--muted` → `#9090a4` (the A3 recommendation) already closes Note A.

---

### (Archived) S083 cold-start block
**Last session:** S083 (2026-06-19) — **4 commits (`fe094fc`, `92ef726`, `b8adbbf`, `5fcf057`), SW v183 → v187, 0 DB migrations.** Pre-store-launch polish: executed the approved ~12-item feedback batch in 4 deploys. **Batch 1** (`fe094fc`, v184): A1 Ranking empty-state CTA button, A2 format relabel (Individual/Pairs-Team Leaderboard) + explanatory footer, D1 invite icon-only copy + Share, D2 League Mgmt detail reorder, D3 remove redundant Admin Mgmt, D4 Player Mgmt footer action copy, E1 left/right-hand handedness icons, F1 LogMatch green-active season pill + caret, F2 "Select players/pairs" flashcard title, B3 duplicate player-name guard. **Batch 2** (`92ef726`, v185): B1/B2 — Players grid scoped to season roster + season filter dropdown (defaults to active season, "All league players" option). **Batch 3** (`b8adbbf`, v186): C1 — create/save handlers fire-and-forget `loadLeagueData()` so UI unblocks immediately (mirrors delete_season pattern). **Batch 4** (`5fcf057`, v187): F3 team-lock flow ("Accept & use" locks lineup into a Team A vs Team B avatar flashcard; scores/MOTM/Save reveal only when locked; "Edit teams" unlocks; auto-locks on open-match prefill / edit / shuffle / queued-next) + F4 combined side-by-side live Undo (new undo icon) / Reset (soft-red, no arrow) row. **G1 Apple login DEFERRED** (blocked on Apple Developer account). **Then 3 post-close smoke-fix deploys** (`f009d32` v188, `0658c21` v189, `eb4c736` v190): Batch 2 prop-wiring fix (seasons/seasonRosters weren't reaching PlayerStats so the season filter never rendered) + F1 `.ctxchip` 32px height parity + green-active selector parity (Leaderboard/MatchHistory); last-5 form pills flipped newest-on-RIGHT everywhere (Individual/Pairs leaderboards, PairStats, FormDots; Partnership Ranking already correct) + LogMatch TeamShuffler scoped to active-season roster + date-pill `appearance:none` height; handedness tag now renders `hand-left`/`hand-right` (was generic `user`) in ProfileView + PlayerStats + optimistic roster toggle in SeasonManagement (instant chip flip + serialized writes, killed ~3s lag). **Production live on SW v190, main `eb4c736`.**

### 🎯 PENDING USER SMOKE-TEST (S083 ships — SW v190)
- **Handedness icon (v190):** My Profile + player drill-in show an actual hand icon (left/right), not the person silhouette.
- **Roster toggle (v190):** adding/removing a player to a season roster flips the chip instantly (no ~3s lag); rapid taps don't drop entries.
- **Last-5 newest-right (v189):** form pills show the most recent match on the FAR RIGHT everywhere (Individual + Pairs leaderboards, PairStats, drill-in). Partnership Ranking unchanged (already correct).
- **LogMatch roster scoping (v189):** the shuffle layer + player dropdowns list only the active season's roster.
- **LogMatch team-lock (F3):** pick 4 players or Shuffle → "Accept & use" appears → tap it → lineup flips to Team A vs Team B avatar flashcard, score/MOTM/Save now visible → "Edit teams" returns to dropdowns. Confirm pairs-format seasons lock the same way, and open-match prefill shows the flashcard with the Undo (not Edit teams) control.
- **Live controls (F4):** in LIVE mode, Undo last point + Reset sit side-by-side; Reset is soft-red.
- **Players grid (B1/B2):** grid lists only the selected season's roster; season dropdown defaults to active season with "All league players" option.
- **Performance (C1):** creating a season / saving a player no longer blocks on the full reload spinner.
- **Batch 1 spot-checks:** Ranking empty-state CTA button, leaderboard relabels + footer, invite copy/share icons, season-pill height parity.

### 🎯 S084 PRIORITY
1. Address any feedback from the S083 smoke-test (above).
2. Resume **App Store + Google Play launch** prep (Capacitor wrap) now that polish batches 1-4 have shipped — see project_store_launch memory. G1 Apple login still pending Apple Developer account.
3. **Issue #94 — UI responsive sizing for iPhone 13** (leaderboard name truncation) — still open, untouched.
4. **Color sweep Note A from S069** — still awaiting user A1/A2/A3 decision.

### S083 outcomes (this session — archived)
- [x] Batch 1 (A1,A2,D1,D2,D3,D4,E1,F1,F2,B3) — `fe094fc`, SW v184
- [x] Batch 2 (B1/B2 roster scoping + season filter) — `92ef726`, SW v185
- [x] Batch 3 (C1 background data refresh on create/save) — `b8adbbf`, SW v186
- [x] Batch 4 (F3 team-lock flow + F4 live undo/reset) — `5fcf057`, SW v187
- [x] Post-close: Batch 2 prop-wiring fix + F1 32px height parity + selector parity — `f009d32`, SW v188
- [x] Post-close: last-5 newest-on-right everywhere + LogMatch roster scoping + date-pill height — `0658c21`, SW v189
- [x] Post-close: handedness hand icon (ProfileView + PlayerStats) + optimistic roster toggle (SeasonManagement) — `eb4c736`, SW v190
- [DEFERRED] G1 Apple login — blocked on Apple Developer account

### 🎯 PENDING USER SMOKE-TEST (S082 ship — SW v183)
- **Onboarding** is now 2 steps — no duplicated Display Name/Country, back chevron top-left (matches rest of app).
- **New league** → Ranking shows "Create a season, then play your first match to appear here." (no auto Season 1); create the first season as **Casual** and confirm it works end-to-end.
- **"Load failed"** no longer surfaces when saving matches / creating seasons (global retry).

### 🎯 PENDING USER SMOKE-TEST (S081 ship — SW v182) — carry-over if not yet run
- Create season with End Date + casual ruleset → casual scores log without FIP error; new onboarding captures handedness; subset-roster season scopes Ranking + LogMatch picker; profile Match Lost red when >0; Analytics opens on Partners.

### 🎯 S083 PRIORITY
1. Address any feedback from the S082 (and carry-over S081) smoke-tests (above).
2. **Issue #94 — UI responsive sizing for iPhone 13** (leaderboard name truncation) — still open, untouched.
3. **Color sweep Note A from S069** — still awaiting user A1/A2/A3 decision (`#9090a4` vs spec `#555555` vs redefine `--muted`).
4. **Game Mode Phase 10 PR-D / PR-E** — SE/DE/RR active tournament views (needs state-based score input refactor first) + BracketSVG color tokens.

### S082 outcomes (this session — archived)
- [x] A — onboarding 3→2 steps, single profile step, no name/country dup (`OnboardingScreen.jsx`)
- [x] B — back button moved to app-standard `.back-btn` / `.back-btn-row` top-left chevron
- [x] C — `handleCreate` passes `autoSeason:false`; App.jsx Ranking empty state conditional copy when `seasons.length===0` (text-only, trophy Icon, no emoji); admin create-league flows untouched
- [x] D — `fetchWithRetry` global wrapper in `supabase.js`; removed per-call retry in `SeasonManagement.handleCreate`
- [x] Built, SW v183, synced OneDrive, committed `d555cdf`, pushed, Vercel deploy `dpl_5ZSh77BAkKDEG3JC7ECLbK65Lyzg` READY

### S081 outcomes (archived)
- [x] Phase A: restored ruleset selector in season create sheet + Safari "Load failed" retry; SW v181, commit `f241cd5`
- [x] #1 Handedness in onboarding (create + invite-code join) + DB migration `s081_handedness_and_season_end` (join_requests.handedness, create_join_request p_handedness, approve_join_request mapping, players insert)
- [x] #2 Optional End Date field in New Season create sheet + create_season p_end_date (rejects end<start)
- [x] #3 Casual ruleset fix — SeasonManagement.handleCreate sets newly created season as selectedSeason (root cause: App.jsx `!selectedSeason` init guard kept it on the old FIP season)
- [x] #4 Match Lost flashcard red when >0 (.proscv.loss)
- [x] #5 Ranking leaderboard (seasonLb) + LogMatch picker (avail) scoped to season roster (admin Player Management untouched per user)
- [x] #6 Analytics pills Partners-first + default section
- [x] Built, SW v182, synced OneDrive, committed `d90fcdf`, pushed, Vercel deploy `dpl_4aCkrm5SXCCQahTDfApEremDMWd9` READY

### S080 outcomes (archived)
- [x] S079 smoke-test triage: closed Issues #92 (pairs season stats isolation) + #99 (Platform Admin RLS visibility) via gh after user PASS
- [x] Skipped Issue #94, deferred color sweep Note A
- [x] Season ruleset feature: spec doc + DB migration `s080_season_ruleset` + scoringEngine.js + App.jsx + SeasonManagement.jsx + LogMatch.jsx + EditMatchModal.jsx + sw.js v180
- [x] Committed `b698996`, pushed, Vercel deploy `dpl_GpHzC8jNUo6L5Pr4y7xWkeeNdDHR` READY

### S079 outcomes (archived)
**S079 (2026-06-17):** **9 PRs merged (#97/#100/#101/#102/#103/#104/#105/#106/#107), SW v166 → v179, 1 DB migration (`s079_platform_admin_select_visibility`).** Cold-start after 37-day gap. /tmp/Padel-Battle re-cloned fresh. **Shipped Issues #95 (Liquid Glass V2 Standard), #96 (Partner Games Differential), #98 (Admin Management UI re-added), #99 (Platform Admin RLS visibility + client override + Pending Review lockout bypass).** Partnership Ranking iterated through 5 PRs (initial → medal/EFF%/last-5-under-name → leaderboard styling parity → pair-col left-align → flanking avatars + slash separator). Mockup-first cadence for #95 (4 variants reviewed before code). Best/Worst Pairs flashcards drop GD chip + use `/` separator. ScheduleView empty-state 📅 → calendar SVG. Platform Admin back-nav fixed (lmDetailFromPlatform flag). 2 new lessons + 5 validated patterns.

### 🎯 PENDING USER SMOKE-TEST (S079 ships)
- **Issue #92 — pairs season stats isolation + PairsList + PairStats drill-in + Analytics** (from S078 ship, still 🔍 SMOKE-TEST PENDING from previous session)
- **Issue #95 — Liquid Glass V2 Standard** (SW v172) → 🔍 SMOKE-TEST PENDING
- **Issue #96 — Partner Games Differential + Partnership Ranking + clickable analytics + calendar SVG** (SW v171) → 🔍 SMOKE-TEST PENDING
- **Issue #98 — Admin Management UI re-added (owner promote/demote)** (SW v173 via #101) → 🔍 SMOKE-TEST PENDING
- **Issue #99 — Platform Admin RLS visibility + client override + Pending Review bypass** (SW v174 via #101+#102) → 🔍 SMOKE-TEST PENDING
- **Platform Admin back-nav fix** (SW v175 via #103) → 🔍 SMOKE-TEST PENDING
- **Partnership Ranking polish: medals 🥇🥈🥉, EFF%, Last-5 under name, leaderboard styling, pair-col left-align, flanking avatars, slash separator** (SW v175→v179 via #103/#104/#105/#106/#107) → 🔍 SMOKE-TEST PENDING

**Smoke-test path for S079 ships:**
1. Hard-refresh PWA to pick up SW v179
2. Tap FAB / Sign In / Save Match / Schedule Match / league cards → Liquid Glass V2 effect plays (radial + scale + blur + tint)
3. Player drill-in → Analytics → Partners → Best/Worst Pairs cards show "/" separator, no GD chip. Partnership Ranking shows medals on top 3, single-shade Last-5 dots beneath pair name, EFF% column, MW green / ML red, both player avatars flanking the pair name
4. Tap any analytics row name (MOTM Ranking / Longest Winning Streak / Longest Losing Streak / Most Active / Highest Win Rates) → drills into player profile
5. Tap any avatar in Partnership Ranking → drills into THAT specific player
6. Matches → Schedule with no upcoming → calendar Icon SVG (not emoji)
7. Owner of a league → Admin Dashboard → League Management → see Admin Management section with Promote/Demote per non-owner member
8. Platform Admin → tap a league NOT owned by you → opens regular UI (NOT Pending Review lockout); Player Mgmt + Season Mgmt show real data; Back → returns to Platform Admin (not LM list)
9. Report any iPhone-only render/spacing issues for fix-forward

### 🎯 S080 PRIORITY (post-smoke-test next session)
1. Address any feedback from S079 smoke-test
2. Close Issues #92/#95/#96/#98/#99 via `gh issue close` once user confirms PASS
3. **Issue #94 — UI responsive sizing for iPhone 13** (leaderboard name truncation) — still open, not addressed in S079
4. **Color sweep Note A from S069** — still awaiting user A1/A2/A3 decision (`#9090a4` vs spec `#555555` vs redefine `--muted`).
5. **Game Mode Phase 10 PR-D / PR-E** — SE/DE/RR active tournament views (needs state-based score input refactor first) + BracketSVG color tokens.
4. **FT-15 polish (deferred from S076):**
   - form strip (last-5 W/L dots per pair) on each pairs leaderboard row
   - Awards section in pairs ranking (Most Active by pair, MOTM by player — keeps MOTM per-player)
   - per-pair drill-in screen via existing `onPairDrillIn` prop hook on PairsRanking (note: drill-in now exists via PairsList tap — may need to wire from PairsRanking too)
5. **LogMatch read-only picker when `prefilledOpenMatch` is set** — show "From open match" badge + undo button. ~30 lines.

### S077 outcomes (this session — archived)
- [x] Cross-PC cold start + retrospective S074 session log (was missing)
- [x] S075 closed (FT-16 push-notify Edge Function + LogMatch pre-fill + login gap fix)
- [x] S076 closed (FT-15 main features — Pairs Roster, LogMatch pair picker, PairsRanking, 3 commits in 1 session)
- [x] S077 r1: post-S076 smoke-test bundle — pairs leaderboard polish, header rename, color coding, podium threshold, Season Awards SVG sweep
- [x] S077 r2: login layout no-scroll on notched iPhones (100dvh, safe-area-inset subtraction)
- [x] S077 r3: admin Season Management visibility + login height calc fix
- [x] S077 r4: per-season admin layer attempt (DB + UI)
- [x] S077 r5: tightened to owner-only + season-admin model + new SeasonAdminsManagement screen + avatars use player.avatar_url
- [x] S077 r6: permission audit lockdown — pair RPCs to season-admin gate, cancel_open_match too, createLeague timing race fix, Create League nav in LM
- [x] S077 r7: COLLAPSED back to owner+admin only — dropped per-season role, simplified DB + frontend, dormant tables left
- [x] S077 r8: closed remaining matrix gaps (players_insert RLS, matches_update_self_pending RLS)
- [x] S077 r9: atomic create_league RPC + Season Management fast-load (season_players in Promise.all) + LeaguesView cleanup
- [x] S077 r10: League Management as the single home — full parent/detail restructure
- [x] S077 r11: card click + back-button history fix + stale-while-revalidate loadUserLeagues
- [x] S077 r12: tennis ball emoji → trophy SVG in empty leaderboard state
- [x] S077 r13: PENDING REVIEW UNLOCK (root cause + backfill) + LM card subtitles + back-button persistence via lifted detailLeagueId + logo sweep + emoji sweep
- [x] S077 r14: Platform Admin user avatars + scroll-to-top on sidebarView change
- [x] S077 r15: emoji sweep round 2 (MatchHistory tennis ball, PlayerStats stars, CombosView users/flame) + season delete typed-confirm + LM card cleanup (drop Rename, icon-only Delete) + dashboard Joined→Playing
- [x] S077 r16: Delete League moved to Danger Zone in detail view + atomic delete_league RPC + hard-delete-with-matches + season delete simplified (non-blocking) + Platform Admin league rows cleanup
- [x] GitHub issues #71 + #25 closed via gh CLI
- [x] User confirmed PASS on all sections (D Pairs leaderboard + E Season Awards + G regression sweep + r16 fixes)
- [ ] Issue #92 — pairs season stats isolation (NEW, opened S077 — defer to S078)

---

## ARCHIVED — earlier session pointer (S076)
**Earlier session:** S076 (2026-05-11) — **3 push-direct commits (`3dde01f` C2, `ecf33a9` C3, `fb21d37` C4), SW v142 → v143 → v144 → v145, ~585 net LOC across 11 file changes, 0 GitHub issues closed (#25 ready to close after iPhone smoke test).** Single-session ship of all 3 frontend commits from FT-15 v2 plan (plan estimated 2 sessions). **C2:** Pairs Roster admin UI in SeasonManagement + pairs state load in App.jsx + RPC wiring. **C3:** LogMatch pair-aware picker (2 dropdowns when format=pairs, shuffle hidden, edit-match reverse-resolves registered pair). **C4:** New `PairsRanking.jsx` (~200 LOC, 7-col Premier-Padel broadcast spec, podium with paired avatars, no ELO column visible) + App.jsx Ranking branch on format + PAIRS gold pill in `.lbbar`. **1 new mistake (#104) + 3 patterns** captured. FT-15 main features feature-complete. Both Issue #71 (FT-16) and Issue #25 (FT-15) ready to close after iPhone smoke test.

### S076 outcomes (archived)
- [x] C2: App.jsx loads pairs in loadLeagueData Promise.all
- [x] C2: pairs state + LeagueContext exposure + reset on league switch
- [x] C2: SeasonManagement pulls pairs from useLeague() context
- [x] C2: Pair management state (showCreatePair / newPairA / newPairB / newPairName / pairBusy / editingPairId / editPairName / confirmDeletePair)
- [x] C2: handleCreatePair → create_pair RPC
- [x] C2: handleSavePairName → update_pair RPC
- [x] C2: handleDeletePair → delete_pair RPC (DB refuses if pair has matches)
- [x] C2: Pairs Roster section in Season Detail view (gated on format=pairs)
- [x] C2: Overlapping-avatar pair cards + name/fallback display + inline rename + delete-with-confirm
- [x] C2: Add Pair bottom-sheet modal with two-player dropdowns filtered to season roster
- [x] C2: Add Pair button disabled until roster has 2+ players
- [x] C2: `.sm-pairs / .sm-paircard / .sm-paircard-main / .sm-pairavi / .sm-pairnames-*` CSS
- [x] C2: SW v142 → v143
- [x] C2: Commit `3dde01f` pushed, Vercel READY
- [x] C3: LogMatch `pairs` prop threaded from App.jsx
- [x] C3: currentSeason / isPairsFormat / seasonPairs / selectedPairA / selectedPairB / pairLabel(pr) helper
- [x] C3: useEffect selectedPairA → setTA([player_a_id, player_b_id])
- [x] C3: useEffect selectedPairB → setTB([player_a_id, player_b_id])
- [x] C3: useEffect em → reverse-resolve registered pair for edit pre-selection (unordered match)
- [x] C3: Pair-aware picker JSX (2 dropdowns in pairs mode, 4 player slots in individual mode)
- [x] C3: Shuffle button hidden in pairs mode
- [x] C3: Empty-pair guard banner when seasonPairs.length < 2
- [x] C3: SW v143 → v144
- [x] C3: Commit `ecf33a9` pushed, Vercel READY
- [x] C4: New PairsRanking.jsx (~200 LOC) — pairStats useMemo with MP/MW/ML/CW/EFF% computation
- [x] C4: Unordered team-uuid[2] vs pair player_a/player_b detection
- [x] C4: Sort by EFF% desc → MW desc → ELO desc tiebreakers
- [x] C4: Empty state for "no pairs registered yet"
- [x] C4: Podium (top 3) with paired-avatar cards + gold/silver/bronze styling
- [x] C4: 7-column table per S072 user-approved mockup (# / Pair / MP / MW / ML / CW / EFF%, no ELO)
- [x] C4: Top-3 rows tinted gold/silver/bronze
- [x] C4: Info banner for "pairs exist but no matches yet"
- [x] C4: App.jsx imports PairsRanking + Ranking tab branches on selectedSeason.format
- [x] C4: PAIRS gold pill (.fmtpill-pairs) in season selector lbbar when format=pairs
- [x] C4: New `.fmtpill / .fmtpill-pairs` + full `.prk-*` CSS class system
- [x] C4: SW v144 → v145
- [x] C4: Commit `fb21d37` pushed, Vercel QUEUED at session close
- [x] Build clean after each of 3 commits (vite build)
- [ ] iPhone smoke test pending (deferred to user)
- [ ] Close GitHub Issue #25 + #71 after smoke test (deferred to S077)

---

## ARCHIVED — earlier session pointer (S075)
**Earlier session:** S075 (2026-05-11) — **1 push-direct commit `9c72c17`, SW v141 → v142, Edge Function `push-notify` v18 ACTIVE, Vercel deploy `dpl_2MUTDLtTriuAVnfWNJEJ1weQjV14` READY.** **FT-16 push-notify Edge Function branch:** `open_match` → `notif_challenges` pref + `/#schedule` deep-link + new `skip_in_app` flag (bypasses bell-row insertion when RPC has already inserted). **FT-16 client-side web push:** `sendPushNotification` signature extended with `opts.skip_in_app`; ScheduleView re-adds 3 push calls (create/lock/cancel) all with `skip_in_app:true`. **FT-16 LogMatch pre-fill:** `prefilledOpenMatch` + `onPrefilledHandled` props, useEffect pre-fills teams + date, insert includes `open_match_id` FK. **"Log Score" button** on locked `.omcard` visible only to participants. **App.jsx:** `prefilledOpenMatch` state + `handleLogOpenMatch` callback. **Login gap regression fix** (user screenshot mid-session): `.lhero` `flex:1` was leftover from splash sizing pushing auth form to bottom of viewport — moved `flex:1` to `.lscreen.splash .lhero` only. **SW v141 → v142.** **2 new validated patterns** (additive `skip_in_app` flag for migrating to RPC-inserted bell rows; CRLF line endings in /tmp break naive multi-line `.replace()`). **0 GitHub issues closed** — #71 ready to close after iPhone smoke test confirms end-to-end.

### 🎯 S076 PRIORITY — smoke test S075 then close Issue #71
1. **iPhone smoke test of S075 ship (SW v142)** — verify (a) login form no longer has gap below logo (b) FT-16 end-to-end: create open match → second account claims → 4th claim auto-shuffles teams → green-users notification fires → tap → ScheduleView green-flash on locked `.omcard` → tap "Log Score" button → LogMatch pre-filled with locked players + date → save → match appears in history with `open_match_id` FK + `open_matches.status='completed'`.
2. **Close GitHub Issue #71** after smoke test passes.
3. **Polish: disable LogMatch team picker when `prefilledOpenMatch` is set** — show "From open match" read-only badge with undo button. ~30 lines, single commit.
4. **FT-15 main features (closes Issue #25)** — per `padelhub/planning/FT-15-pairs-leaderboard.md` v2 commit sequencing C2-C4:
   - Pairs Roster admin UI in SeasonManagement (when `selectedSeason.format === 'pairs'`)
   - LogMatch pair-aware picker (when format='pairs') — replaces 4-player picker with 2-pair picker
   - New `PairsRanking.jsx` component (~250 lines, 7-col Premier-Padel broadcast spec)
   - Branch routing in App.jsx Ranking on `selectedSeason.format`
5. **PNG icon regen (#90 follow-up)** — export `/public/icons/icon.svg` → 192×192 + 512×512 PNGs + new `/og-image.png`.
6. **Color sweep Note A from S069** — still awaiting user A1/A2/A3 decision.
7. **Game Mode Phase 10 PR-D / PR-E** — SE/DE/RR active tournament views (needs state-based score input refactor first); BracketSVG color tokens.

### S075 outcomes (this session — archived)
- [x] Cross-PC git sync — /tmp/Padel-Battle pulled from `dc24ccd` → `c22b70c` (33 commits)
- [x] Retrospective S074 session log written from `git show` on `b688201` + `c22b70c`
- [x] S074 entries added to sessions/INDEX.md + tasks/todo.md + tasks/lessons.md (Lesson #103)
- [x] push-notify Edge Function: `open_match` cases in `typeFilter` + `pushUrl`
- [x] push-notify Edge Function: `skip_in_app` payload param
- [x] push-notify deployed via Supabase MCP — v18 ACTIVE
- [x] App.jsx `sendPushNotification(opts)` signature extension with backward-compat body_text slot fallback
- [x] ScheduleView createOpenMatch — `sendPushNotification("open_match", "New open match", ...)` with skip_in_app:true
- [x] ScheduleView joinOpenMatch on lock — `sendPushNotification("open_match", "Match locked in!", ...)` to 4 participants with skip_in_app:true
- [x] ScheduleView cancelOpenMatch — `sendPushNotification("open_match", "Open match cancelled", ...)` with skip_in_app:true
- [x] LogMatch `prefilledOpenMatch` + `onPrefilledHandled` props
- [x] LogMatch useEffect pre-fills tA/tB/date from `team_a_player_ids`/`team_b_player_ids`/`scheduled_at`
- [x] LogMatch matches insert payload includes `open_match_id`
- [x] LogMatch clears openMatchId + calls onPrefilledHandled after save
- [x] App.jsx `prefilledOpenMatch` state + `handleLogOpenMatch` callback
- [x] ScheduleView `isParticipant` derived + "Log Score" button on locked `.omcard`
- [x] index.css `.lhero` `flex:1` regression fix — moved to `.lscreen.splash .lhero` only
- [x] SW v141 → v142
- [x] npm run build — clean, no syntax errors
- [x] Commit `9c72c17` pushed to origin/main
- [x] Vercel deploy `dpl_2MUTDLtTriuAVnfWNJEJ1weQjV14` — READY, production
- [ ] iPhone smoke test of S075 ship (deferred to user)
- [ ] Close GitHub Issue #71 after smoke test (deferred to S076)

---

## ARCHIVED — earlier session pointer (S074)
**Earlier session:** S074 (2026-05-10) — **2 push-direct commits (`b688201`, `c22b70c`), SW v139 → v140 → v141, 1 DB migration (`s074_open_match_rpcs_with_notifications`), 0 GitHub issues closed, session NOT closed before originating PC shut down — log reconstructed retrospectively at S075 cold start.** **FT-16 NotificationCenter renderer (`b688201`):** `TYPE_META.open_match` (users/green) + `ft09Variant()` kind switch (new/locked/cancelled → users-green/check-gold/close-danger) + `notificationTarget()` routes `open_match` to `tab=history, subTab=schedule, openMatchId` for ScheduleView deep-link. **DB migration `s074_open_match_rpcs_with_notifications`:** `create_open_match` / `join_open_match` (on lock) / `cancel_open_match` now fan out in-app bell notifications with `data: {kind, open_match_id, ...}`; client-side `sendPushNotification` calls dropped from ScheduleView per Lesson #54 (RPC is single source of truth). **Deep-link flash (`b688201`):** App.jsx new `scrollToOpenMatchId` state + handleNotifNavigate writes AFTER setTab, ScheduleView `useEffect` queries `.omcard[data-open-match-id]` + scrollIntoView + 1.6s `.om-flash` pulse (identical pattern to S070 `.nc-flash`). **RR grid icon (`c22b70c`):** `Icon.jsx` new `grid` case (4 rounded rects 7×7 at corners), GameMode RR card + FORMAT_RULES RR icon swapped `award` → `grid`. **No GitHub issues closed** — #71 (FT-16) still needs push-notify Edge Function + LogMatch pre-fill; #25 (FT-15) still needs Pairs Roster + LogMatch picker + PairsRanking.

### 🎯 S075 PRIORITY — close FT-16 + ship FT-15 main features
1. **FT-16 closeout (recommended next — closes Issue #71)** — per `padelhub/planning/FT-16-open-match-voting.md` remaining:
   - **(a) Push-notify Edge Function branch** for `type='open_match'` — kind-aware title/body composition (new: "New open match — claim a spot" / locked: "Match locked — 4 players in" / cancelled: "Open match cancelled"), reuses fan-out + rate-limit pattern from existing branches. Reads from `notifications` table where `type='open_match'` (RPCs already insert there).
   - **(b) LogMatch pre-fill from locked open match** — read `?openMatchId=...` query param OR state hand-off (NotificationCenter deep-link can route to LogMatch instead of ScheduleView for locked variant; or "Log Score" button on locked `.omcard` navigates with the param); fetch open_match row + open_match_players; pre-fill team_a/team_b selectors with locked players (uuid[]); disable team picker (display read-only); on insert set `matches.open_match_id` FK (existing trigger flips `open_matches.status='completed'` DB-side per S072 wiring).
2. **FT-15 main features (closes Issue #25)** — per `padelhub/planning/FT-15-pairs-leaderboard.md` v2 commit sequencing C2-C4:
   - Pairs Roster admin UI in SeasonManagement (when `selectedSeason.format === 'pairs'`) — list pairs with avatar+name pattern from match-history cards, Add Pair modal with two-player dropdown filtered to season roster, edit/delete actions (delete refused if pair has matches — DB enforces)
   - LogMatch pair-aware picker (when format='pairs') — replaces 4-player picker with 2-pair picker; resolve pair → underlying team_a/team_b uuid[] before insert
   - New `PairsRanking.jsx` component (~250 lines, 7-col Premier-Padel broadcast spec) — # / Pair / MP / MW / ML / CW / EFF%, no ELO column, country flags below player names within pair cell, podium mirrors normal league podium with 2 small avatars side-by-side per slot, "Player A / Player B" name format
   - Branch routing in App.jsx Ranking — when `selectedSeason.format === 'pairs'` render `<PairsRanking>` instead of individual leaderboard
3. **iPhone smoke test of S073 + S074 ship** — verify SW v141 cold-load green logo, open-match flow end-to-end (create → claim → 4th claim auto-shuffles → notification with green users icon → tap → deep-link to ScheduleView + green flash on locked card → log score), RR grid icon in Game Mode Casual tab + FORMAT_RULES.
4. **PNG icon regen (#90 follow-up)** — export `/public/icons/icon.svg` → 192×192 + 512×512 PNGs + new `/og-image.png` so older browsers + WhatsApp share preview match new green orb design. Requires image-export tool not available in S073/S074.
5. **Color sweep Note A from S069** — still awaiting user A1/A2/A3 decision.
6. **Game Mode Phase 10 PR-D / PR-E** — SE/DE/RR active tournament views (needs state-based score input refactor first); BracketSVG color tokens.

### S074 outcomes (this session — archived)
- [x] FT-16 NotificationCenter `TYPE_META.open_match` + `ft09Variant()` kind switch (new/locked/cancelled)
- [x] FT-16 `notificationTarget()` routing matrix extended for `open_match` → tab=history, subTab=schedule, openMatchId
- [x] DB migration `s074_open_match_rpcs_with_notifications` — RPCs now fan out in-app bell notifications
- [x] Client-side `sendPushNotification` calls dropped from ScheduleView createOpenMatch/joinOpenMatch/cancelOpenMatch (Lesson #54)
- [x] App.jsx `scrollToOpenMatchId` state + `handleNotifNavigate` extension
- [x] ScheduleView `useEffect` scroll-flash on `.omcard[data-open-match-id]` + `onOpenMatchScrolled` callback
- [x] `data-open-match-id` attr added to `.omcard` JSX
- [x] `index.css` `@keyframes om-flash-pulse` + `.om-flash` class (3-stop accent-green box-shadow ring)
- [x] SW v139 → v140
- [x] RR icon swapped `award` → `grid` in GameMode card + FORMAT_RULES
- [x] `Icon.jsx` new `grid` case (4 rounded rects)
- [x] SW v140 → v141
- [x] Pushed to origin/main as commits `b688201` + `c22b70c`
- [ ] **Session was NOT closed before originating PC shut down** — log reconstructed at S075 cold start (Lesson #103)
- [ ] FT-16 push-notify Edge Function branch (deferred to S075)
- [ ] FT-16 LogMatch pre-fill from locked open match (deferred to S075)
- [ ] iPhone smoke test pending (deferred to user)

---

## ARCHIVED — earlier session pointer (S073)
**Earlier session:** S073 (2026-05-10) — **1 push-direct commit `0be427e`, SW v138 → v139, 1 DB migration, 2 GitHub issues closed (#90 logo+login, #91 S/TB→S3), Vercel READY.** Logo color reverted gold→green per brand (Issue #90 part 2) — same 3D orb + 6-satellite + pulsating + orbit design preserved, gradients `#d1fae5 → #4ade80 → #14532d`. Login page fits one viewport (Issue #90 part 1) — `.lhero` 30vh→`clamp(28px,6vh,56px)` with `.lscreen.splash` opt-in for splash usages, AuthGate logo 140→96. PWA icon consistency (Issue #90 part 3) — new `/public/icons/icon.svg` single-source-of-truth wired into manifest + apple-touch-icon. **FT-16 frontend MVP** — open_matches loaded into App.jsx context, ScheduleView Open Matches section + claim/leave/cancel actions + Schedule form Private/Open toggle wired to `create_open_match`/`join_open_match`/`leave_open_match`/`cancel_open_match` RPCs. **FT-15 frontend MVP** — `create_season` RPC extended with `p_format` param, SeasonManagement create form has Individual/Pairs toggle. **Issue #91 fix** — MatchHistory.jsx:183 column header S/TB → S3.

### S073 outcomes (archived)
- [x] Logo color reverted gold → green across icons.jsx + index.css + index.html static splash
- [x] Highlight ellipses cream `#fef9c3` → mint `#ecfdf5` for green tonal harmony
- [x] Wordmark "Hub" in static splash gold → green
- [x] Drop-shadow filter green `rgba(74,222,128,0.40)`
- [x] `.lhero` compact default + `.lscreen.splash` modifier for splash uses
- [x] `.lscreen.splash` applied in App.jsx loading splash + LeagueGate picker
- [x] AuthGate `<PadelHubMark size>` 140 → 96 for form breathing room
- [x] `/public/icons/icon.svg` new 512×512 single-source-of-truth SVG
- [x] manifest.json SVG-first icon list + PNG fallbacks
- [x] index.html `rel=icon` SVG + `apple-touch-icon` SVG + 180×180 PNG fallback
- [x] MatchHistory.jsx S/TB → S3 column header
- [x] App.jsx open_matches + open_match_players loaded; matches+seasons SELECT extended; context exposure
- [x] expire_stale_open_matches RPC sweep on each load
- [x] ScheduleView Open Matches section render + claim/leave/cancel actions wired to RPCs
- [x] ScheduleView Step-1 Private/Open match-type toggle
- [x] ScheduleView Step-2 submit routes by matchType (createOpenMatch vs createChallenge)
- [x] ~110 lines new CSS for .om* + .sform-*
- [x] DB migration s073_create_season_format applied (Lesson #101 — DROP both overloads, recreate 6-arg with p_format)
- [x] SeasonManagement Format toggle (Individual/Pairs) in Create bottom-sheet
- [x] SW v138 → v139
- [x] Issue #90 closed via gh issue close + detailed comment
- [x] Issue #91 closed via gh issue close + detailed comment
- [x] Pushed to origin/main as commit 0be427e + Vercel deploy dpl_AK1mm8zXESE7NVw4WvZuE2KVdWuV READY
- [ ] FT-16 NotificationCenter renderer + push-notify Edge Function + LogMatch pre-fill (deferred to S074)
- [ ] FT-15 Pairs Roster admin UI + LogMatch pair picker + PairsRanking component (deferred to S074)
- [ ] iPhone smoke test pending (deferred to user)

---

## ARCHIVED — earlier session pointer (S072)
**Earlier session:** S072 (2026-05-10) — START HERE
**Last session:** S072 (2026-05-10) — **1 push-direct commit `ece8faf`, SW v137 → v138, 9 DB migrations applied via Supabase MCP, 2 plan-as-deliverable files written, 2 mockups reviewed and revised by user, ~5h day, 0 GitHub issues closed.** Gold-orb logo redesign: new `PadelHubMark` SVG (3D gold central orb + 6 satellite orbs orbiting via `hubOrbit` 22s + `hubAura` 2.4s breathing + per-satellite scale stagger via `hubSat` 2s at 0/180/360/540/720/900ms). New `PadelHubMarkHeader` no-aura variant for in-app header `.logo .lm` (replaces PadelLogoSmall at 32px). `index.html` static splash mirrored. Wordmark "Hub" tinted gold. SW bumped v137→v138. **DB foundation FT-16 (5 migrations):** open_matches table + open_match_players join + matches.open_match_id FK + RLS + 6 SECURITY DEFINER RPCs (create / join with auto-shuffle on lock / leave / cancel / set_teams override / expire_stale sweep). **DB foundation FT-15 (4 migrations):** seasons.format column (defaults 'individual', existing 2 seasons untouched) + pairs table with elo seeded at 1500 (Premier-Padel-style) + 3 admin RPCs + pair-ELO trigger fires on approved matches in pairs-format seasons. **2 lessons (#101, #102):** CREATE OR REPLACE FUNCTION can't rename input parameters at the same ordinal position; multi-statement Supabase MCP migrations are all-or-nothing transactions.

### 🎯 S073 PRIORITY — frontend wiring
1. **iPhone smoke test of S072 ship** — verify gold-orb logo on PWA after SW v138 cold-load: AuthGate splash, LeagueGate splash, in-app header `.lm` slot, index.html static splash, refresh transitions. Verify Vercel deploy `ece8faf` is READY.
2. **FT-16 frontend** (recommended next per plan — smaller surface, more contained than FT-15) — per `padelhub/planning/FT-16-open-match-voting.md` commit sequencing C2-C5:
   - C2: ScheduleView Open Matches section + claim/leave/cancel buttons + RPC wiring (`join_open_match` / `leave_open_match` / `cancel_open_match`)
   - C3: ScheduleView Step 1 Private/Open toggle + `create_open_match` wiring
   - C4: LogMatch pre-fill team_a/team_b from locked open match + insert `matches.open_match_id` FK
   - C5: NotificationCenter `open_match` renderer (3 kinds: new/locked/cancelled) + push-notify Edge Function branch + deep-link routing matrix extension
   - App.jsx: load `open_matches` + `open_match_players` in `loadLeagueData()` + run `expire_stale_open_matches` sweep
3. **FT-15 frontend** (larger surface — defer to S074 unless time permits) — per `padelhub/planning/FT-15-pairs-leaderboard.md` v2 commit sequencing C2-C4:
   - C2: SeasonManagement Format toggle (Individual/Pairs) + Pairs Roster admin section with create/update/delete RPCs
   - C3: LogMatch + ScheduleView pair-aware picker (gated on `selectedSeason.format === 'pairs'`)
   - C4: New `PairsRanking.jsx` (~250 lines, 7-col layout per Premier-Padel broadcast style with country flags below player names, no ELO column, podium mirrors normal league)
4. **Color sweep (Note A — S069 carry-over)** — answer A1/A2/A3 first:
   - **A1** keep `#9090a4` everywhere as documented spec divergence
   - **A2** sweep to spec `var(--muted) #555555` (likely user-perceived regression)
   - **A3 recommended** redefine `--muted` to `#9090a4` in `:root` so token name matches usage
   After Note A locked, sweep batch ~150 line touches, single commit, single PR.
5. **PR-D: SE/DE/RR active tournament views** (Game Mode Phase 10 finish) — bracket header bar + score-input cards + standings using gm-* classes. Brittle `getElementById` score input needs state-based refactor before classes work cleanly. Branch: `feat/46-phase10-pr-d-active-views`.
6. **PR-E: BracketSVG color tokens** — currently uses theme constants A/GD/etc. Migrate to var(--accent) etc. for consistency.

### S072 outcomes (this session — archived)
- [x] Gold-orb logo redesign — `PadelHubMark` 3D central orb + 6 satellites + aura with full animation suite (hubOrbit / hubAura / hubPulse / hubSat)
- [x] `PadelHubMarkHeader` small variant — replaces `PadelLogoSmall` in App.jsx header `.logo .lm`
- [x] `index.html` static splash mirrored verbatim per Lesson #98
- [x] Wordmark "Hub" tinted gold (`#f59e0b`) in both index.html splash + (defer JSX wordmark — `.lt .accent` token-based, will pick up from `--gold` if user wants it; left as-is for v1)
- [x] SW bumped v137 → v138
- [x] 5 FT-16 DB migrations applied (open_matches table, open_match_players, matches.open_match_id FK, RLS, 6 RPCs)
- [x] 4 FT-15 DB migrations applied (seasons.format, pairs, 3 RPCs + helper, pair-ELO trigger + extended update_season — split into 2 after parameter-rename error)
- [x] `planning/FT-16-open-match-voting.md` written (new plan-as-deliverable)
- [x] `planning/FT-15-pairs-leaderboard.md` v2 written (all 6 user decisions baked in)
- [x] `public/mockup-ft16-open-match.html` written + revised (split TEAM A / TEAM B header in locked card)
- [x] `public/mockup-ft15-pairs.html` written + revised (inline-avatar pairs + Premier-Padel broadcast naming + ELO column dropped from leaderboard)
- [x] Lessons #101, #102 captured
- [x] Pushed to origin/main as commit `ece8faf` (Vercel BUILDING at session close — verify READY at S073 cold start)
- [ ] FT-16 frontend wiring (deferred to S073 per plan-as-deliverable estimate)
- [ ] FT-15 frontend wiring (deferred to S074 per plan-as-deliverable estimate)
- [ ] iPhone smoke test of new logo (deferred to user)

---

## ARCHIVED — earlier session pointer (S070)
**Earlier session:** S070 (2026-05-09) — **4 PRs merged + 1 issue closed via comment, SW v126 → v130, ~3-4h, 6 GitHub issues closed.** PR [#86](https://github.com/mmuwahid/Padel-Battle/pull/86) `4e8a9c8` quick-wins bundle (#84 DOB overflow durable iOS fix + #69 invite share preview OG hygiene + #83 handedness DB column + Court Position rename, SW v126→v127). PR [#87](https://github.com/mmuwahid/Padel-Battle/pull/87) `ea7d506` #79 NotificationCenter click-through routing matrix + scroll-to-match flash highlight (SW v127→v128). PR [#88](https://github.com/mmuwahid/Padel-Battle/pull/88) `2c9cb1f` #80 loading screen redesign + multi-layer animation + 20%-above-center positioning + PTR full splash (SW v128→v129). PR [#89](https://github.com/mmuwahid/Padel-Battle/pull/89) `d3ada41` follow-up fix per user feedback ("logo in black box container, looks cheap") — dropped halo + outer dashed ring + inner solid ring; logo now sits transparent on app bg with mark-only artwork (SW v129→v130).

---

## ARCHIVED — earlier session pointer (S069)
**Earlier session:** S069 (2026-05-09) — **1 PR (#85, commit `25f7a2d`), SW v125 → v126, ~2h.** Photo crop/zoom modal (react-easy-crop, circle 1:1 + pan + zoom 1×-4×) wired into both My Profile + admin EditPlayerModal flows. Avatar tap-to-expand lightbox (WhatsApp-style) on ProfileView .propic + PlayerStats drill-in .dpro-pic. **Issue #81** iOS-18 nav burst — `.ntab::before` 64px radial halo overflows ~36px above the bar at scale(1.45) translateY(-26), icon lifts (-10/scale 1.28), pure `:active` holds while pressed. **Screen titles spec-aligned** — dropped `text-transform:uppercase` from `.lbtitle / .adh1 / .lv-title / .sched-title` so Syne 800 mixed-case renders matching JSX spec ("Leaderboard", "Dashboard", "Leagues", "Scheduled"). **Color audit research deliverable:** `:root` 100% matches spec; 395 hardcoded color refs across index.css; top drift `#9090a4` × 119 (NOT in spec; spec says `--muted #555555`) — 3 options surfaced for user, **A3 recommended (redefine `--muted` to `#9090a4` so token name matches usage)**. Sweep held pending Note A decision.

### 🎯 S070 PRIORITY — COLOR SWEEP (resume from S069)
User left S069 with the audit table presented but the sweep itself NOT shipped. Decision needed on Note A:
- **A1** — Keep `#9090a4` everywhere as documented spec divergence (legibility on dark bg).
- **A2** — Sweep to spec `var(--muted) #555555`. Spec-faithful but every secondary label gets significantly fainter — likely user-perceived regression.
- **A3 (recommended)** — Redefine `--muted` to `#9090a4` in `:root` so the token name matches usage, then sweep all hardcoded `#9090a4` → `var(--muted)`. Treat the spec's `#555555` as wrong (it's barely readable on `#080808`).

After Note A is locked, the sweep batch is:
- 🟢 Safe (no visible change): `#0a0a0f` (×4), `#080808` inline (×3), `#4ade80` inline (×9), `#facc15`/`#f87171`/`#f472b6` inline (×9 total) → respective `var()` references
- 🟢 Legacy collapse: `#e4e4ef`, `#c9c9d4` (×4) → `var(--text)`; `#7a7a8e` (×2) → `var(--muted)`; `#3a3a3a / 3a3a4a / 2a2a3a` (×5) → `var(--surface-3)` or `var(--border)`
- 🟢 Hex-alpha cleanup: `#4ade8040 / 4ade8020 / 4ade80cc` (×6) → rgba/`var(--accent-glow)`/`var(--accent-dim)` as appropriate
- 🔴 Keep load-bearing: `#0d0d14` + `#12121a` (header gradient + .bnav bg, Lesson #40/#44)
- 🟡 Per Note A decision: `#9090a4` (×119) and `#5a5a6a` (×11)

Estimated scope ~150 line touches, single commit, single PR. SW v126 → v127.

### S070 PLAN — direction options after color sweep
1. **Color sweep (above)** — answer Note A first.
2. **iPhone smoke test of S069 ship** — verify cropper opens, lightbox expands, nav burst feels right, screen titles read mixed-case Syne 800.
3. **E2E re-test of approval workflow** — verify all S067/S068 hotfixes hold (GRANT bug, post-approval routing, TDZ, chevron-left, deletePlayer→league_members cleanup).
4. **Claim-during-onboarding flow** — currently invite-code path always submits as `new_profile`. Spec wants users to also claim an unclaimed existing player.
5. **EditMyProfile design diffs** — user flagged but never sent screenshot. Defer until provided.
6. **Performance: parallelize auth → leagues → match queries** — currently sequential, ~3 cold-start round-trips. Halves perceived load time. Issue #54 part-2.
7. **FT-15 Pairs Leaderboard** (Issue #25) — DB-touching, 6 user questions still pending in `padelhub/planning/FT-15-pairs-leaderboard.md`.

### S069 outcomes (this session — archived)
- [x] Photo crop/zoom modal — react-easy-crop wrapper with circle crop + pan + 1×-4× zoom slider; outputs 200×200 JPEG blob; wired into App.jsx uploadAvatar + EditPlayerModal uploadPhoto
- [x] Avatar tap-to-expand lightbox (`AvatarLightbox.jsx`) — WhatsApp/Instagram-style; wired into ProfileView .propic + PlayerStats .dpro-pic
- [x] Issue #81 — nav press burst animation; `.ntab::before` halo overflows above bar; icon lifts; pure `:active` holds
- [x] Screen titles spec align — dropped uppercase from `.lbtitle / .adh1 / .lv-title / .sched-title`
- [x] Color audit — research deliverable produced, sweep held pending Note A decision
- [x] PR [#85](https://github.com/mmuwahid/Padel-Battle/pull/85) squash-merged as `25f7a2d`, prod deploy `dpl_G2ip2fiLPiVhik4y2xpWB1Vpi4D4` READY, SW v125 → v126

---

## ARCHIVED — earlier session pointer (S068)
**Earlier session:** S068 (2026-05-09) — **10 commits, 6 GitHub issues closed, SW v117 → v125, ~14h cross-day session**. Production was on **SW v125**, commit `5a0d249`. Major polish bundle from iPhone smoke + admin promotion testing: legacy claimPlayer gated, league menu status meta, YOU pill replaced with vertical accent bar, W/L color coding everywhere, reactions race fix, duplicate admin notif fix, unified back-button pattern, drill-in origin restoration, all italics stripped, sidebar history stack (incremental back-out from any drill-down depth), PadelHub logo home link, Outfit→Syne sweep across all UI text + wordmark 15px, Player leaderboard header centered. **GitHub issues closed:** #75, #68, #41, #46, #67, #82.

### 🎯 S069 PRIORITY — COLOR AUDIT (start here)
User has shared the JSX spec color palette as an image (preserved below). Tomorrow's first task is a side-by-side comparison: pull every color used in the live app's `index.css` (CSS variables + hardcoded hex/rgba values) and diff against the spec palette. Output as a table. Decide whether to sweep the app to align with spec colors (similar to how Outfit→Syne was swept in S068) OR keep current values.

**JSX spec color palette (from user-shared image):**

```
CORE BACKGROUNDS
  #080808       --bg          App background
  #111111       --surface     Cards, surfaces
  #1a1a1a       --surface-2   Elevated surface, hover rows
  #222222       --surface-3   Deepest surface layer
  #2e2e2e       --muted-2     Muted 2 / secondary surface

TEXT
  #f0f0f0       --text        Primary text
  #555555       --muted       Muted / labels / loser names
  #ffffff       (none)        High contrast text / FAB icon
  #000000       (none)        Text on accent green buttons

BRAND ACCENT — GREEN
  #4ade80                     --accent      Primary accent, WIN label, active nav, FAB
  rgba(74,222,128,.09)        --accent-dim  Accent tint backgrounds
  rgba(74,222,128,.20)        --accent-glow Accent border glow
  rgba(74,222,128,.02)        Grid background lines
  rgba(74,222,128,.04)        Current user row tint
  rgba(74,222,128,.75)        Form dots — wins
  rgba(74,222,128,.35)        FAB glow box-shadow

GOLD — MOTM / ELO / WARNINGS
  #f59e0b                     --gold        MOTM pill, ELO stat value, gold accents
  rgba(245,158,11,.08)        --gold-dim    Gold tint backgrounds
  rgba(245,158,11,.25)        --gold-glow   Gold border glow
  rgba(245,158,11,.32)        MOTM pill border
  #facc15                     --yellow-1    Podium 1st place ONLY — win%, top border
  rgba(250,204,21,.09)        Podium p1 card background tint
  #fbbf24                     --warn        Warn / notification dot

DANGER — RED
  #f87171                     --danger / --loss   LOSS label, danger actions, delete icon
  rgba(248,113,113,.08)       --danger-dim        Danger tint backgrounds
  rgba(248,113,113,.22)       --danger-glow       Danger border glow
  rgba(248,113,113,.50)       Form dots — losses

PODIUM MEDALS
  #facc15      1st place — win%, top border line (yellow)
  #94a3b8      2nd place (silver)
  #c97b2e      3rd place (bronze)

SPECIAL — SINGLE USE
  #f472b6                     --pink        Female gender indicator ONLY
  rgba(244,114,182,.08)       Female gender pill background
  rgba(244,114,182,.28)       Female gender pill border

BORDERS
  rgba(255,255,255,.07)       --border      Default card / component borders
  rgba(255,255,255,.04)       Very subtle separators
  rgba(255,255,255,.25)       High contrast borders
  rgba(148,163,184,.15)       Team B dropdown borders (Schedule)

OVERLAYS
  rgba(8,8,8,.92)             AppHeader blur background
  rgba(8,8,8,.95)             BottomNav blur background
  rgba(0,0,0,.65)             Modals / overlays

GOOGLE OAUTH BUTTONS (LOGIN SCREEN ONLY)
  #4285F4      Google Blue
  #ea4335      Google Red
  #fbbc05      Google Yellow
  #34a853      Google Green
```

**Audit deliverable:** mirror the table above with two columns — "Spec value" and "Live value" — for every token. Where divergent, decide: align to spec (sweep) / keep live (document why) / propose third option. Same approach as the Outfit→Syne sweep audit in S068.

### S069 PLAN — other direction options
1. **Color audit (above)** — recommended first task per user direction.
2. **E2E re-test of approval workflow** — verify all S067/S068 hotfixes hold (GRANT bug, post-approval routing, TDZ, chevron-left, deletePlayer→league_members cleanup).
3. **Photo crop/zoom in avatar uploader** — react-easy-crop integration; touches App.jsx uploadAvatar + EditPlayerModal uploadPhoto. User explicitly deferred from S067.
4. **Claim-during-onboarding flow** — currently invite-code path always submits as `new_profile`. Spec wants users to also claim an unclaimed existing player. Fetch unclaimed players from the league after invite-code submit, show a picker, submit appropriate type to `create_join_request`.
5. **EditMyProfile design diffs** — user flagged but never sent screenshot. Defer until provided.
6. **Performance: parallelize auth → leagues → match queries** — currently sequential, ~3 cold-start round-trips. Halves perceived load time. Addresses Issue #54 part-2.
7. **Spec page-title-in-AppHeader alignment** — user explicitly said NO last session, but flag if they change their mind.
8. **FT-15 Pairs Leaderboard** (Issue #25) — DB-touching, 6 user questions still pending in `padelhub/planning/FT-15-pairs-leaderboard.md`.

### S068 outcomes (this session — archived)
- [x] Legacy claimPlayer form gated → "Pending Review" lock screen (`d94b200`, SW v118)
- [x] Issue #67 League menu "N players · M matches" status (`ee15a42`, SW v119)
- [x] Issue #82 YOU pill dropped + green border tint, refined later to vertical accent bar (`ee15a42` + `dd33162`)
- [x] W/L color coding in roster pills (green when >0, grey when 0; red when >0, grey when 0)
- [x] Reactions disappear-after-1s race fix — stable matchIdsKey + cancelled flag in MatchHistory useEffect
- [x] Duplicate admin promotion notification fix — set_member_role RPC was inserting; dropped client-side push call
- [x] Green claimed-dot now only on UNCLAIMED players (claimed = no dot, less visual noise)
- [x] Unified back-button pattern across every drill-in (PlayerStats moved from `.hdr-back` to `.back-btn-row`)
- [x] Drill-in origin restoration — Ranking → drill-in → back returns to Ranking (was broken, landed on Players)
- [x] Player Management header simplified — dropped LEAGUE eyebrow + redundant Players subhead
- [x] All italics stripped — 12 CSS rules + 10 inline JSX `fontStyle:"italic"` (verified 0 italic elements DOM-wide)
- [x] Sidebar history stack — Settings → Admin → PlayerMgmt → back × 3 returns to drawer
- [x] PadelHub logo is now a home link → Ranking tab + clears all drill-in state
- [x] Drill-in Match Won/Lost cells grey when 0
- [x] Outfit→Syne sweep across all UI text (40 CSS + 26 inline JSX)
- [x] App header wordmark `.lt`: 14px/900 → 15px/800/.04em per user spec
- [x] Numerics on DM Mono untouched per user direction
- [x] Player leaderboard header text centered to match Rank column
- [x] 6 GitHub issues closed: #75, #68, #41, #46, #67, #82

### Standing rules (still apply across all #46 phases):
- spec class names ARE the contract (Lesson #81 — class-name parity audit before visual port)
- push-to-main is harness-blocked → always feature-branch + `gh pr merge <N> --squash --delete-branch` for big PRs (small hotfixes can push direct to main when scope is contained)
- NavIcons.jsx is frozen forever
- tokens use spec's LONG names
- PadelLogoSmall stays as brand mark
- before opening any #46 PR, run pre-merge gate (list prior tunings via `git log --oneline -- <file>`, diff visual props spec-vs-live, classify spec-wins/prior-wins/ambiguous → ASK USER, run getComputedStyle regression checks)
- declare hooks BEFORE useEffects that reference them (S067 Lesson #88 — TDZ)
- after every push to main, verify Vercel deploy state via `list_deployments` (S067 Lesson #93)
- when introducing a new gate flow, audit + rewire bypass surfaces (S067 Lesson #92)

### S067 outcomes (this session — archived)
- [x] Phase 12 PR3 admin batch (5 components) — PR #78 squash-merged as `b5fb06f`
- [x] Rules SECTIONS data restructure with .rtag chips
- [x] Leaderboard Rank header `.lbh.c` centering
- [x] Sidebar X-icon dropped next to Sign Out
- [x] EditPlayerModal gallery picker (drop capture="environment")
- [x] Back buttons surfaced (.back-btn-row padding)
- [x] Rules per-card press-state vertical accent
- [x] Most Argued zap icon
- [x] .rcontent body text mono+softer color
- [x] Italic dropped on .adh1, .plmtit, .secname, .shtitle
- [x] EditPlayerModal spec gender+position vocab
- [x] EditMyProfile DOB box-sizing fix + save-error diagnostic
- [x] NotificationCenter full emoji→Icon SVG rewrite
- [x] Header refresh button → pull-to-refresh (1s spinner overlay)
- [x] Season list inline Edit/End/Reactivate footer actions
- [x] PlatformAdmin rename-league inline editor
- [x] Rules-of-Hooks fix (PTR hook moved before early returns)
- [x] Age tag in ProfileView + PlayerStats drill-in (new getAge helper)
- [x] Match Won/Lost rename, Best Streak → Consecutive Wins, MOTM gold star badge
- [x] .propic 96→130px, Remove Photo red action button
- [x] S068 Approval-Gated Join Workflow — DB migration + 3 RPCs + 3 screens + OnboardingScreen rewire + LeagueGate routing + AdminDashboard card + Matches banner
- [x] Photo upload single-retry pattern (250ms backoff)
- [x] Achievements section spec restyle with .ach-* class system + gold star MOTM card
- [x] **CRITICAL TDZ hotfix** — loadJoinRequest declared before useEffects
- [x] **CRITICAL build error hotfix** — PadelLogo → icons import path
- [x] Defensive try/finally in LeagueGate cold-start
- [x] Invisible back button fix — `chevron-left` Icon alias for `back`
- [x] OnboardingScreen invite-code lookup → `lookup_league_by_invite` RPC (RLS bypass)
- [x] PlayerMgmt deletePlayer also removes claimed user from league_members
- [x] PlatformAdmin destructive-confirm simplified — type DELETE in caps
- [x] Achievements title centered + (earned/total) count badge

**Earlier session pointer (S066, archived):** S066 — 9 PRs + 3 DB migrations in one ~10h day. Phases 7v2/8/9/11/12 (PR1+PR2+fix+spec-port). Closed RulesView "undefined…" preview bug as first item of S067.

### 🐛 KNOWN BUG (fix first thing in S067)
**Rules cards show "undefined…" preview text** for non-`subRules` items (The Serve, Return of Serve, Walls & Fences, Playing Outside Court, Net Touch, Switching Sides, all 8 ARGUED items). Root cause in `RulesView.jsx:23` — `(rule.subRules?.[0]?.content?.slice(0, 88) + "…")` evaluates to `"undefined…"` when `subRules` is absent. **Fix:** wrap in a ternary so missing branches return `""`:
```js
const previewText = isArgued
  ? (rule.a.length > 90 ? rule.a.slice(0, 88) + "…" : rule.a)
  : rule.intro
    || (rule.subRules?.[0]?.content ? rule.subRules[0].content.slice(0, 88) + "…" : null)
    || (rule.content && rule.content.length > 90 ? rule.content.slice(0, 88) + "…" : rule.content)
    || "";
```
Verified visually in screenshot at session close.

### S067 PLAN — direction options
1. **PR 3 — Admin batch restyle (recommended next)** — AdminDashboard + SeasonManagement + LeagueManagement + PlayerManagement + PlatformAdmin all need spec port. Read spec lines 1977-2173 (`AdminScreen` / `LeagueMgmtScreen` / `SeasonMgmtScreen` / `PlatformScreen` / `PlayerMgmtScreen`). Branch: `feat/46-phase12-admin-batch`. SW v101→v102. Probably ~300-400 lines source + ~100 lines CSS. One PR fine; user already approved this scope earlier.
2. **PR 4 — Pending/Rejected approval-gated join workflow (DB-touching, NEW feature)** — spec has `PendingApprovalScreen` (line 2250) + `RejectedScreen` (line 2278) + `ApprovalQueueScreen` (line 2309) for a workflow that doesn't exist in our app yet. Currently OnboardingScreen joins immediately on invite-code submit; spec wants admin approval first. Requires: DB migration (`join_requests` table + RLS + RPCs `create_join_request` / `approve_join_request` / `reject_join_request`), 3 new screens, OnboardingScreen step 3 rewire to call `create_join_request` instead of immediate join, admin queue UI integration. Big scope; user-flagged as deferrable.
3. **Quick polish backlog** — `RulesView` undefined preview fix (above) · Admin Dashboard already gets a card-based intro per spec (the `.saar.pr` row in Settings linking to Admin) · Verify any other `<Icon name="..."/>` cases that don't render correctly on iPhone after SW v101 rolls out.

User picks at cold-start. **Production live at padel-battle.vercel.app on SW v101.**

### Issue #46 master redesign — STATUS at end of S066
| Phase | What | Status | PR |
|---|---|---|---|
| 1 | Foundation (tokens + Icon.jsx) | ✅ | #47 |
| 2 | Header + bottom nav | ✅ | #48 |
| 3 | Login + League picker | ✅ | #49 |
| 4 | Ranking screen | ✅ | S061 |
| 5 | Players screen | ✅ | S062 |
| 6a/6b/6c | Drill-in + Analytics + icon sweep | ✅ | #59/#61/#60 |
| 7 / 7v2 | Match cards + ScheduleView | ✅ | #63 / #65 |
| 8 | Gender column + filter pills | ✅ | #66 |
| 9 | LogMatch + EditMatchModal + TeamShuffler | ✅ | #70 |
| 10 | Tournament screens | ⏭ Skipped (not in spec JSX) | — |
| 11 | OnboardingScreen | ✅ | #72 |
| 12 PR1 | Sidebar / Settings / Profile / EditMyProfile fix | ✅ | #73 |
| 12 PR2 | Ranking globe header + Rules first-pass | ✅ | #74 |
| 12 fix | Rules emoji→Icon swap + switch icon + back btn | ✅ | #76 |
| 12 spec port | Rules collapsible cards + search + filter pills | ✅ | #77 |
| 12 PR3 | **Admin batch (AdminDashboard + 4 mgmt screens)** | ⏳ **deferred to S067** | — |
| Pending+Rejected | Approval-gated join workflow (DB-touching) | ⏳ **deferred to S067 / later** | — |

### S066 outcomes (archived) — 9 PRs + 3 DB migrations
- [x] PR [#65](https://github.com/mmuwahid/Padel-Battle/pull/65) Phase 7 v2 — Match card v2 (split per-team score grid, win/red/loss/red/TB-with-subscript, FINAL col with set count + total points "20-17", reactions popover with 8 emojis, `.mcard overflow:visible`, `.mhd2` rounded top) + Ranking-table tweaks ("Rank" header, country flag center, top-3 medals 22px, ranks 4+ +1pt, `.lbflag` class). Date format slashes dropped. SW v95→v96.
- [x] PR [#66](https://github.com/mmuwahid/Padel-Battle/pull/66) Phase 8 — `players.gender text NULL` migration + Edit forms gender 2-button toggle + spec-faithful sliders-icon-toggled filter bar (`.fbtn` + `.gfilter-bar/.gfpill.fa/.fm/.ff` with All/Men ♂/Women ♀ pills) + Settings field colors blue (#60a5fa) / pink (#f472b6) for Male/Female + leaderboard cells all vertically centered. SW v96→v97.
- [x] PR [#70](https://github.com/mmuwahid/Padel-Battle/pull/70) Phase 9 — LogMatch full restyle (`.modebar/.modebtn/.livedot` Manual/Live mode bar, `.tcard/.shufbtn` inline shuffle, `.sccard/.sctbody/.scrow/.cstep/.csbtn/.csval` score grid with 2/3 sets toggle, `.scrrow` win-tracker, full `.livebi/.liveh/.liverws/.acbtn/.acval/.aclbl/.undobtn` LIVE mode body, `.mvpcard/.mvpiw/.mvplbl/.mvpsel/.mvpch` MOTM picker, `.savebtn.on/.off + .savehint`, `.lmerr` validation banner) + EditMatchModal restyle (same vocab, variable-length sets) + TeamShuffler restyle (`.shuf-card/.shuf-pool/.shuf-chip/.shuf-list/.shuf-match` + `.savebtn/.shcancel`). SW v97→v98.
- [x] PR [#72](https://github.com/mmuwahid/Padel-Battle/pull/72) Phase 11 — `players.date_of_birth date NULL` migration + new OnboardingScreen.jsx (3-step wizard: 1) Display Name + Country, 2) Photo placeholder + DOB + Gender + Playing-side per spec, 3) Join via invite code OR create new league with auto-player-create) + LeagueGate gate. SW v98→v99.
- [x] PR [#73](https://github.com/mmuwahid/Padel-Battle/pull/73) Phase 12 PR 1 — `players.playing_position` CHECK extended to allow 'any' + EditMyProfile fix (Nickname dropped, DOB added, Left/Right/**Any** with court-l/r/any icons, all-mandatory validation with red asterisk + `.ferr`) + OnboardingScreen step 2 expanded (5 fields + photo placeholder) + Sidebar full restyle (`.ssheet/.sbprof/.sbsec/.sbitem/.sbico/.sbibd/.sbn/.sbe/.sbsl/.sbit/.sbis/.sbbadge/.sbdiv/.sbfoot/.signout` slide-in drawer with 280ms animation) + SettingsView full restyle (`.stbody/.slbl/.stcard/.strow/.stico/.stbod/.sttitle/.stsub/.saar/.staf/.stafL/.stafR/.stafI/.stoggle`) + ProfileView spec header (`.prohero/.propic/.procb/.prorm/.proname/.proemail/.prorole/.protag/.proedit/.prostrip/.prosc/.proscv/.wrsec/.wrh/.wrl/.wrp/.wrbg/.wrf/.hlrow/.hlcard/.hll/.hlv/.hlu`) + gear icon swap (settings was sun-spoke, now proper Feather gear) + Sidebar league subtitle ("14 players · Season 1") + press-state chevron (`.sb-chev` + `.sbitem:active` accent). SW v99→v100.
- [x] PR [#74](https://github.com/mmuwahid/Padel-Battle/pull/74) Phase 12 PR 2 — Ranking flag column header `<Icon name="globe">` (centered) + Rules first-pass restyle (token cleanup with .rules-h family).
- [x] PR [#76](https://github.com/mmuwahid/Padel-Battle/pull/76) Phase 12 fix — Rules emojis dropped, replaced with Icon SVGs (trophy/racket/court-any/alert/refresh/info/help) + `.rcico` 30×30 rounded chip + Settings 'Switch League' icon league→switch + Settings back button structure aligned with Profile/Rules pattern + `.back-btn` shared class.
- [x] PR [#77](https://github.com/mmuwahid/Padel-Battle/pull/77) Phase 12 spec port — Full Rules rewrite to spec class names verbatim (`.rtb/.rtbey/.rtbh1/.rtbsub` header + `.rtsrchw/.rtsrchi/.rtsrch` search + `.rtfbar/.rtfpill.fg/.fo/.pillct` filter pills All/Rules/Disputes with counts + `.rtbody` + `.rcard.q.open / .rchd / .rcico / .rctw / .rct / .rcprev / .rcchev / .rcbody.op/.cl / .rccont` collapsible cards) + collapse animation (max-height 280ms cubic-bezier) + chevron rotate 90° + press-state `.rcard:active` scale(.99) accent feedback + live search + count-aware filter pills + empty state. New `RulesView.jsx` component extracted.
- [x] DB migrations: `s066_add_players_gender_column`, `s066_add_players_date_of_birth`, `s066_extend_playing_position_any`. All idempotent (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS pattern).

### Earlier session history (S065 archived below)
**Last session:** S065 (2026-05-08) — **Four PRs shipped in one big day**. Phase 6b + Phase 7 + 2 hotfix bundles. Production now on **SW v95**.

**PR [#61](https://github.com/mmuwahid/Padel-Battle/pull/61) (`75cbf4f`, SW v91→v92):** Issue #46 **Phase 6b — Analytics views restyle** + iOS-18 nav spring restoration. PlayerStats analytics block (lines 217–490) refactored to class-based markup. User decisions: Q6=B (Phase 5 `.seg/.sb` 4-col variant for sub-tab bar via new `.seg-4/.sb-4`) · Q7=C (`.dpro-sec-card` frames from Phase 6a) · Q8=B (spec `.elobars` chart for League Activity — no axis, gradient bars, dates beneath) · Q9=A (native `<select>` H2H picker kept; refinement deferred) · Q10=hybrid (Biggest Wins removed, **Longest Winning Streak** + **Longest Losing Streak** added — top-5 each, chronological per-player run-tracking inside `analyticsData` useMemo). **Bonus restoration:** iOS-18 spring bounce on bottom nav was missing post-S060 PR #51 (which had hidden `.npill` with `display:none` and replaced active state with flat bg). Phase 2 (PR #48) spring system reinstated on top of S060 saturation: `.npill` opacity 0→1 + `transform: scale(0.6)→scale(1)` over 350ms cubic-bezier; `.ntab.on .nicon { scale(1.12) }`; `.ntab:active .nicon { scale(0.85) }` for tactile press feedback. CSS ~150 lines added. LONG token names only.

**PR [#62](https://github.com/mmuwahid/Padel-Battle/pull/62) (`a68f53d`, SW v92→v93→v94):** **Hotfix bundle — 6 iPhone-smoke regressions**. (1) `.an-body > .seg-4 { margin: 0 }` contextual override — pill was 36px from edge while cards sat at 18px because seg-4's own margin stacked on top of an-body's padding. (2) "Roster (N)" → "Players (N)" header rename in PlayerStats.jsx (cross-app consistency). (3) Edit + trash emoji glyphs in roster edit-mode → `<Icon name="edit|trash"/>`. (4) Leaderboard country cell — dropped ISO3 letters (PSE/TRQ/GBR/LBN), kept just the flag emoji at 16px (was 13px). (5) Leaderboard rank `#` column → `align-self: center` so rank centers vertically with the multi-line player cell. (6) Phase 6b sub-tab emojis 📈🤝⚔️💡 → SVG Icons (`trending-up / users / swords / bulb`). 3 new Icon cases added to Icon.jsx. All bundled to one Vercel preview = one iPhone smoke pass.

**PR [#63](https://github.com/mmuwahid/Padel-Battle/pull/63) (`bf0a9d4`, SW v94→v95):** Issue #46 **Phase 7 — Match cards restyle + ScheduleView simplification + Schedule form spec port**. User decisions Q1=A (MOTM absolute-centered gold pill) · Q2=A (WIN/LOSS label ABOVE team col) · Q3=C (24×24 avatars, no flags) · Q4=A (vertical 80px score column with "Final 2-1" set count chip — user revision from spec's cumulative game total) · Q5=C (incomplete = 60% opacity + 50% saturate hybrid) · Q6=C (My-Pending: collapsible header + `.mcard.pending` inner) · Q7=B (approvals queue: card frame restyle, KEEP Approve/Edit/Reject text labels) · **Q9: DROP the Past tab from ScheduleView entirely** (once played, matches surface in MatchHistory automatically — Past was redundant). MatchHistory.jsx + MatchApprovalsQueue.jsx full rewrites; ScheduleView.jsx restructured. Action buttons → `<Icon name="share|edit|trash"/>` (continues Phase 6c sweep). Phase 7 CSS block ~200 lines. **Schedule form spec port (3rd commit on same branch):** my first .sform draft didn't match the user's reference screenshots — re-ported from `padelhub/docs/PadelHub_Complete_v2.jsx` ScheduleScreen lines 1490–1622 verbatim. Step 1 uses `.sch-progress / .tcard / .tcardh / .shufbtn / .tinner / .tcoldot.tcolha (green) / .tcoldot.tcolhb (gold) / .tcollbl / .tcolvs / .pslot / .psel.af|.bf / .pselch / .savebtn.on|.off / .shcancel / .savehint`. Step 2 uses `.svsum` summary chip + `.tcard` body with `.shlbl` icon-prefixed labels (calendar/clock/court-l/edit), `.shi` inputs, `.stog/.stogbtn` inline duration toggle, `.inote` info banner ("All players will be notified..."), `.savebtn.on` "Schedule Match" with check icon. **Bug caught + fixed:** ScheduleView didn't import Icon — JSX threw on mount, ErrorBoundary masked it. Added `import Icon from './Icon'` (one-line fix). 306-line plan-as-deliverable at `padelhub/planning/issue-46-phase7-match-cards.md`.

**PR [#64](https://github.com/mmuwahid/Padel-Battle/pull/64) (`6414b65`):** Premier Padel team-name format. User-flagged via iPhone screenshot — schedule chip should read "Hamza / Basel vs MAK / Mano". Single-line change in `helpers.js`: `formatTeam(p1,p2)` separator `x` → `/`. Per CLAUDE.md rule "always use formatTeam," applies globally to all ~50 call sites with zero JSX edits. Also fixed the `.svsum` chip which I'd built with `.map(getName).join(" & ")` — CLAUDE.md violation from yesterday's Phase 7. Switched to `formatTeam(getName(tA[0]), getName(tA[1]))`.

### S065 outcomes (archived)
- [x] Issue #46 Phase 6b — Analytics views restyle + iOS-18 nav spring (PR #61, SW v91→v92)
- [x] Hotfix bundle — seg-4 alignment + Players rename + edit/trash icons + leaderboard ISO3 drop + rank centering + sub-tab emoji Icons (PR #62, SW v92→v94)
- [x] Issue #46 Phase 7 — Match cards + ScheduleView simplification + Schedule form spec port (PR #63, SW v94→v95)
- [x] Premier Padel team format `formatTeam: " / "` (PR #64)
- [x] Plan drafted: `padelhub/planning/issue-46-phase7-match-cards.md` (306 lines)
- [ ] **iPhone smoke-test of full S065 ship on production (SW v95) — user verified Phase 7 step 2 + spring during session, full app sweep pending**

### S066 PLAN — direction options
1. **Issue #46 Phase 8** (NEW prereq surfaced by user during S065): Add **gender** column to `players` (DB migration) + capture in EditPlayerModal/EditMyProfile/onboarding. **Then** add **All / Men / Women** filter pills + sliders icon button on Players section header (per user's iPhone-mockup screenshot). User explicitly said "maybe it needs a different phase input first that incorporates this in the profile creation/editing section" — they understand the dependency. Branch: `feat/46-phase8-gender-filter`. SW v95→v96. **DB-touching:** new column on `players` (text, NULL allowed for backfill grace period). RLS likely no change (existing `players_update_self` already allows the user to edit their own row). 5–6 line change in EditPlayerModal + EditMyProfile to capture, ~10 lines on roster header for the filter UI.
2. **Inline log-match form restyle inside upcoming `.scard`** — Phase 7 explicitly left this out. Currently the inline form is the original FT-09b styled markup. Smaller surface than the schedule form, similar `.shi/.stog/.savebtn` vocabulary already exists.
3. **Issue #46 Phase 9 candidate** — `LogMatch.jsx` + `EditMatchModal.jsx` restyle (paired since they share form patterns). Larger surface than the inline log form.
4. **Issue #46 Phase 10 candidate** — Tournament screens (GameMode.jsx + BracketSVG.jsx + AmericanoMode.jsx + SE/DE/RR mode files). Big surface, intricate state.
5. **FT-15 Pairs Leaderboard (Issue #25)** — DB-touching, 6 user questions still pending in `padelhub/planning/FT-15-pairs-leaderboard.md`.

User picks at cold-start. **Production live at padel-battle.vercel.app on SW v95.**

**Earlier in S060:** Phases 1 + 2 + 3 ALL SHIPPED to live in one session. Production `padel-battle.vercel.app` on SW v82→v85 (3 fix PRs). Phase 3 added [PR #49](https://github.com/mmuwahid/Padel-Battle/pull/49) squash-merged as `ac7cf35`: AuthGate.jsx (login/signup/recovery) + LeagueGate.jsx (picker) restyled with `.lscreen/.lbg/.lhero/.llogobox/.lbrand/.ltag/.lform/.flbl/.fwrap/.finput/.pwtog/.lcta/.gbg2/.or-div/.llink/.lerr/.lok/.lgcard/.lgsection/.lginline` classes; `@keyframes pg` glow-pulse; animated radial-gradient + 28px-grid backdrop on `.lbg`; password eye-toggle uses `<Icon name="eye"|"eye-off"/>`. PadelLogoSmall kept as brand mark (declined spec's `<Icon name="trophy">`). 3-step OnboardingScreen with claim-player + DOB/gender/playing-side fields explicitly deferred to Phase 11. Phase 3 plan at `padelhub/planning/issue-46-phase3-login-onboarding.md`.

### S064 outcomes (archived)
- [x] Issue #46 Phase 6a — drill-in player profile restyle (PR #59 → `a3fda56`, SW v89→v90)
- [x] Issue #46 Phase 6c — header bell + sidebar icon sweep (PR #60 → `3370ab6`, SW v90→v91)
- [x] Plan drafted: `padelhub/planning/issue-46-phase6-analytics.md` (covers 6a/6b/6c)
- [ ] **iPhone smoke-test of 6a + 6c on production (SW v91) — user pending**
- [ ] Phase 6b deferred to S065

**Spec scope:**
- Podium card with 1st/2nd/3rd, medals, names, W/L, EFF%, ELO
- Rankings table (8-col): #/medal · player avatar+name + form-dots stacked · country flag · MP · MW · ML · EFF%
- Season selector pill at top right
- Existing season awards section preserved (calculateSeasonAwards stays untouched)

**Caveats vs current code:**
- Ranking tab lives in App.jsx (lines ~942+) — large surface, similar CRLF gotcha risk as Phase 2; default to Node script over Edit
- `seasonLb / seasonElo / getSeasonForm / getSeasonStreak` selectors stay (S055)
- `selectedSeason / setSelectedSeason` from LeagueContext (S057)
- DO NOT touch the season awards calc — only restyle the awards card display

**Branch:** `feat/46-phase4-ranking` off `main`. Bump SW v85 → v86.

**MANDATORY pre-merge gate (per `feedback_issue46_dont_take_spec_literally.md`):**
1. List prior tunings on the Ranking tab — grep for S### / Lesson / FT-NN markers in `git log --oneline -- src/App.jsx` against `/tmp/Padel-Battle`
2. Diff every visual property between spec (LeaderboardScreen lines ~1190+) and current live values (S047 redesign, S055 season isolation, S056 awards layout, S057 NavIcons, S058 fixes)
3. Classify each diff: spec-wins (no prior reason) / prior-wins (documented S### bug fix) / **ambiguous → ASK USER**
4. Run `getComputedStyle` checks pre-PR-open on `.lbtitle / .pod / .lbtable / .lbrow / .form-dots / .lbavi` to confirm no regressions
5. **Don't bundle architecture migration with visual changes** — if the Ranking tab needs structural extraction, do it as 2 PRs (architecture-only that reproduces visuals byte-for-byte, then visual-tweak)

**Verification:** standard PR + Vercel preview READY + iPhone smoke-test gate (NOT auto-merge).

**Hand-off:** if Phase 4 verifies green, draft Phase 5 plan.

### Inherited from S060 (still in effect):
**Last session:** S060 (2026-05-07) — Phases 1 + 2 + 3 of #46 ALL SHIPPED to live in one session. **Phase 1** (PR [#47](https://github.com/mmuwahid/Padel-Battle/pull/47), squash-merged as `9325a55`) deployed Phase 1 tokens + new Icon.jsx (56 cases) + tokens-demo.html, SW v80. **Phase 2** (PR [#48](https://github.com/mmuwahid/Padel-Battle/pull/48), squash-merged as `4f7f693`) refactored AppHeader + bottom-nav from inline-styles to class-based markup using Phase 1 tokens, deleted tokens-demo.html, SW v81. Both production Vercel deploys READY. NavIcons.jsx (S057) untouched — bottom-nav `.nicon` renders `<NavIcon>` artwork, NOT the new `<Icon>`. **User-flagged icon mismatch in Phase 1 demo:** Icon.jsx racket/players/gamemode cases now use NavIcons.jsx silhouettes verbatim (commit `95c4a1f`, included in PR #47). **Auto-memory:** `feedback_nav_icons_frozen.md` enforces the freeze across all future phases. **Open issues:** #46 (Phase 3+ pending; Phases 1+2 closed via merges), #25 (pairs deferred).

### S061 PLAN — Issue #46 Phase 3 Login + Onboarding
**Read first:** Phase 3 plan needs to be drafted at `padelhub/planning/issue-46-phase3-login-onboarding.md` BEFORE building. Reference `padelhub/docs/PadelHub_Complete_v2.jsx` lines ~1023–1240 for `LoginScreen` + `OnboardingScreen` spec.

**Spec scope (per #46 master plan):**
- `LoginScreen` redesign: animated bg, accent-tinted trophy logo block, mono-styled labels, password show/hide toggle, Google OAuth pill, sign-up link, forgot-password + resend-confirmation links.
- `OnboardingScreen` redesign: 3-step progress dots, step 1 (claim existing player or new), step 2 (account profile: name + DOB + country + gender + position), step 3 (join existing league via code OR create new). NEW DB schema additions deferred to Phase 11 — Phase 3 can ship without DOB/gender (capture in localStorage as draft state).

**Caveats vs current code:**
- AuthGate.jsx + LeagueGate.jsx are SEPARATE components from the spec's monolithic LoginScreen/OnboardingScreen. Phase 3 refactors AuthGate + LeagueGate, not App.jsx.
- The spec uses `<Icon name="trophy">` for the login logo accent. Trophy in our Icon.jsx is still the spec version (not the NavIcons.jsx variant); that's fine for login since it's a different visual context than the bottom nav.
- Email/password auth + Google OAuth flows must keep working — Phase 3 is purely visual + structural.

**Branch:** `feat/46-phase3-login-onboarding` off `main`. Bump SW v81 → v82.

**Verification:** standard PR + Vercel preview READY + iPhone smoke-test gate. DoD checklist in plan file (to be drafted in S061 cold-start).

**Hand-off:** if Phase 3 verifies green, draft Phase 4 plan at `padelhub/planning/issue-46-phase4-*.md`.

### Decisions locked (S060) — applies to all future phases:
- **Push-to-main blocked by harness.** Always feature-branch + PR + `gh pr merge <N> --squash --delete-branch`. User pre-authorized squash-merge for visual-noop phases (#47); visual-change phases need explicit "merge it" go-ahead before merging.
- **NavIcons.jsx is FROZEN forever.** Never migrate the bottom nav to the new `<Icon>` — `<NavIcon>` permanently owns Trophy/Racket/Players/CrossedRackets artwork.
- **Tokens use spec's LONG names** (`--accent`, `--ease-spring`, `--r-md`) — never the JSX short aliases.
- **iOS rubber-band overscroll seam fix (Lesson #40)** + **dynamic-island gap reset (Lesson #44)** are load-bearing in App.jsx — `<style>` block with `html,body{margin:0;padding:0;background:#0d0d14;...}`. NEVER remove. Phase 2 added new tokens but did NOT switch body bg to var(--bg) (#080808) — keep deferring.
- **Edit tool fails silently on CRLF files.** When old_string lookup keeps failing on a known-correct snippet, run `tr -d '\r' < file > file.tmp && mv file.tmp file` first (git auto-restores CRLF on commit via core.autocrlf=true). For multi-step refactors of large files, prefer Node script with explicit `fs.readFileSync` + index lookup over Edit's pattern matching. (S060 lesson, see lessons.md #68.)

### Other open candidates (all deferred, no S060 blocker):
- **FT-14 phase 2** — apply Option C hybrid to ranking screen (leaderboard shows union of `season_players` + match participants for selected season) + LogMatch/ScheduleView player picker filtered to current-season roster. **DB schema is ready, RPCs are owner-gated. No new migrations needed — phase 2 is pure frontend wiring against existing `season_players` data.** Most natural follow-up since S050 shipped the management UI.
- **SE/DE stepper conversion** (deferred since S043) — `SingleElimination.jsx` + `DoubleElimination.jsx` use uncontrolled inputs read via `document.getElementById(...).value` at submit. Convert to controlled `scores` state keyed by `${ri}-${mi}`, replace getElementById reads, add ScoreStepper, **and apply S045's `validateMatch` validator at submit.**
- **FT-07 Player Deletion Redesign** — needs FRESH plan written. Soft-delete vs hard-delete UX, reactivate path, leaderboard/H2H/stats filter rules, RLS implications. Reference S044's `approvedMatches` filter selector pattern.
- Optional cleanup: kill stale `tournaments` realtime sub; `SET search_path = public` on pre-S045 SECURITY DEFINER functions; country/position backfill for other leagues' players.
- Header escalation path documented (in case any future regression): replace `position:sticky` with `position:fixed; top:0; left:0; right:0` + height-matching spacer below to fully decouple from natural document flow.

### Additional misc deferred items:
- **Render playing position on ranking screen** — once user supplies position presets (not yet provided).
- Country/position backfill for other leagues' players (only Padel Stars + Ryan have country values so far).
- `didPlayerWin` extraction across leaderboard/H2H/stats — defer until those areas are next touched.
- Optional: extend BL/GD team-identity convention to LIVE mode + ScheduleView inline log form (S043 deferred).
- Optional: re-evaluate keeping the `tournaments` realtime sub now that the state is gone.

### ⚠️ COLD START RULE (MANDATORY):
1. `git pull` in /tmp/Padel-Battle (or fresh clone if missing — happens on a different PC)
2. `diff -rq /tmp/Padel-Battle/src/ padelhub/src/` — check for desync
3. If ANY files differ → copy from git repo to local padelhub/
4. Read `tasks/lessons.md` for prevention rules
5. **Before first `git push`:** verify `cd /tmp/Padel-Battle && git config user.email` returns `m.muwahid@gmail.com`. Set with `git config user.email "m.muwahid@gmail.com" && git config user.name "mmuwahid"` if needed (prevents Vercel instant-ERROR — see S036 lesson).
6. **`gh issue list --repo mmuwahid/Padel-Battle --state open`** — surface any new GitHub-tracked bugs.

### Codebase Stats (as of S020):
- App.jsx: 1,084 lines (28 useState)
- GameMode.jsx: 115 lines (slim orchestrator — down from 1,450)
- Tournament components: BracketSVG (171), AmericanoMode (227), SingleElimination (325), DoubleElimination (344), RoundRobin (277)
- New S020 components: NotificationCenter (143)
- S019 components: Sidebar (100), ProfileView (162), AdminDashboard (144), SettingsView (135)
- Total codebase: ~5,500 lines across 29 source files (21 components)
- Production bundle: 6 chunks, no Vite warnings (S013 splitting)
- Dead assets: all cleaned (S013)
- DB tables: profiles, leagues, league_members, players, seasons, matches, tournaments, challenges, push_subscriptions, notifications (S020), match_reactions (S020)
- Edge Function: push-notify (RPC-based, --no-verify-jwt, CORS-restricted, rate-limited)
- DB RPCs: respond_to_challenge, join_challenge, play_challenge, leave_challenge, + platform admin RPCs

---


---

## Earlier session history (archived)

Phase 6 → S039 completed-block details live in [`_archive/todo-history-pre-s041.md`](_archive/todo-history-pre-s041.md). Rotated 04/MAY/2026 to keep this file focused on the active agenda.

## Future / Backlog
- [x] Add JWT verification to push-notify Edge Function — done S028
- [x] DB CHECK constraints (team_a/team_b array length = 2) — done S028
- [x] Tournament version column for optimistic concurrency — done S028
- [x] useLeague() migration — 4/8 done, closed as optional (no perf benefit) — S028
- [x] **FT-09: Match Approval + Admin Promotion** — done S044 (GitHub issue #8). Pending status column, trigger, RLS, 4 RPCs, role badges, EditMatchModal, My-Pending section, 4 notification variants. Live on prod.
- [x] **FT-09b: FIP Scoring Enforcement** — done S045. Per-set FIP shape validation (6-0..6-4, 7-5, 7-6 only), match completeness gate, `incomplete` status for valid-but-no-2-set-winner matches, dead-rubber auto-truncate, frontend validator + DB CHECK constraint defense-in-depth, existing data rectified.
- [x] **Issue #12: Premier Padel UI polish** — done S046. Header gradient blends under status bar, italic uppercase wordmark, floating pill bottom nav with pedestal, 2-col Players grid, dedicated Player Management screen with EditPlayerModal (photo + country + position), DB columns + 13-row country backfill, storage policies. SW v52→v54.
- [x] **Issue #11: Ranking format + terminology** — done S047 (commit c415b1a). Bottom nav Leaderboard→Ranking + Combos→Partners. Ranking screen redesigned: italic title + season selector + 8-column table (#/Player/Country/MP/MW/ML/CW/Eff%) + Last-5 Form strip. PlayerStats 5 flash-card renames + MOTM section. Nav bar re-locked. SW v54→v55.
- [x] **Issue #13: Admin dashboard consolidation** — done S048 (commit 1e6d58a). Admin Management section + Platform Admin button moved INTO AdminDashboard. SettingsView no longer has Admin Management. Sidebar no longer has Platform Admin button; Invite Players gated on `isAdmin`. `updateMemberRole` added to LeagueContext. SW v55→v56.
- [x] **Issue #15: Nav footer + header polish** — done S049 (commit d3200d6). Bottom nav floating-pill 14→6px above safe-area; pedestal 82→68; wrapper paddingBottom 96→82. Header overscroll fixed via `html,body{background:#0d0d14;overscroll-behavior-y:none;}` injected at App.jsx style block — matches gradient start so iOS rubber-band no longer reveals BG above sticky header. SW v56→v57.
- [x] **Issue #19: Partners screen 'Pairs' renames** — done S051 (commit a310946). CombosView sub-tab Best Duos→Best Pairs + Top/Worst Partnerships→Top/Worst Pairs (3 strings); PlayerStats partnership analytics cards Best/Worst Partnerships→Best/Worst Pairs (2 strings). Matches Premier Padel terminology. SW v61→v62.
- [x] **Issue #18: Dynamic island header gap at scrollY=0** — done S051 (commit ea7da90). Root cause: S049 CSS injection patched bg+overscroll on html/body but never reset margin/padding; iOS PWA black-translucent left implicit body offset that sticky `top:0` masked when scrolled but exposed at scrollY=0. Fix: extended injection at App.jsx:779 to `html,body{margin:0;padding:0;...}` + `#root{margin:0;padding:0}`. Plus index.html theme-color #0a0a0f→#0d0d14 to match body bg/header gradient start. SW v62→v63. iPhone-confirmed working.
- [x] **Issue #20: Photo upload — first-attempt failure + photo not propagating** — done S052 (commit e439b0a + follow-up 3b9ef98). New `decodeImageFile(file)` helper at utils/helpers.js using createImageBitmap (with Image+objectURL fallback) replaces fragile FileReader→dataURL→Image chain that was failing intermittently on iOS Safari PWA. Applied in both App.jsx uploadAvatar + EditPlayerModal uploadPhoto. App.jsx now write-throughs to claimedPlayer.avatar_url + triggers loadLeagueData() so My Profile uploads propagate to ranking/players/partners/H2H/Insights. PlayerStats.jsx gained `getAvatar(pid)` helper + 8 avatar slots updated (drill-in profile, Insights Most Active + MOTM Ranking, Best Pairs, Worst Pairs, H2H opponents ×2, Players grid). SW v63→v64→v65. iPhone-confirmed.
- [x] **Issue #21: My Profile sidebar entry consolidation** — done S052 (commit e439b0a). Removed standalone "👤 My Profile" sidebar button + the divider that followed it. Wrapped top user info block (avatar+name+email) in a `<button>` → opens My Profile. Added `›` chevron hint on the right. iPhone-confirmed.
- [x] **Issue #22: Settings reorganization + self-serve account delete** — done S053 (commits 4117846, d22c57a). Account section moved to bottom (order: Notifications → League → Account → Danger Zone). Sidebar Switch League button removed. New Danger Zone with progressive disclosure (button-only default, full block on tap) + working delete via SECURITY DEFINER RPC `delete_my_account()` (DB migration `s053_delete_my_account_rpc`): refuses if user owns leagues, unclaims players for history preservation, deletes notifications/push/memberships/profile + auth.users. Frontend signs out on success. Bottom version row removed. SW v65→v66→v67. iPhone-confirmed.
- [x] **Issue #23: Best/Worst Pairs avatars + always-show + gate fix** — done S053 (commits 4117846, badc389). Both pair cards in PlayerStats analytics→Partners restructured: avatar A | centered names+W-L | avatar B (flex with minWidth:0 + ellipsis + flexShrink:0). Worst Pairs always renders with "No losing partnerships yet" empty-state. Follow-up: dropped `partnerships.length >= 6` gate that was hiding worst pairs at per-player scope when league had plenty of data (Lesson #51). SW v67→v68. iPhone-confirmed.
- [x] **Issue #14: Season management (phase 1)** — done S050 (commit a24f2b9). DB: 3 staged migrations (`season_players` table + backfill 15 rows + 6 owner-gated SECURITY DEFINER RPCs via new `_assert_league_owner` helper). Frontend: `SeasonManagement.jsx` (~280 lines, CRUD: create with clone-from-previous, end, reactivate, edit name/dates, edit per-player roster atomically). Single-active enforced. **Phase 2 (ranking + LogMatch picker filtering by season roster) deferred to S051.**
- [x] **Issue #16: Admin Dashboard rework** — done S050 (commit a24f2b9). Scroll-to-top fixed (sidebarView dep). Platform Admin "← Back" arrow. AdminDashboard restructured: removed S048 Admin Management (redundant), new League Management section with editable league name + invite + Season Management button. Sections: Roster → League Management → Data Export → Platform Admin.
- [x] **Issue #17: Player Management text + flash card subtitle** — done S050 (commit a24f2b9). "hand" → "side"; Player Management button subtitle stripped.
- [x] **My Profile user self-edit** — done S050 (commit 985457c). New RLS policy `players_update_self` + new `EditMyProfile.jsx` slim bottom-sheet. User can now set own name/nickname/country/playing position from My Profile → ✎ Edit Profile button. Country/position/nickname chips render under role badge in ProfileView.
- [x] **CountrySelect searchable combobox + full UN list** — done S050 (commits 594d89e + f617c1c). New `CountrySelect.jsx` component replaces native `<select>` in EditPlayerModal + EditMyProfile. COUNTRIES expanded 42 → 195 entries (all UN states + Palestine + Taiwan + Vatican, sorted alphabetically by name, **Israel intentionally excluded**). `helpers.js` ISO3_TO_ISO2 map expanded to match. Filter is per-word startsWith ("p" → Pakistan/Palau/...; "south" → all 3 South-x; "korea" → both Koreas).
- [x] **Flag emoji font stack** — done S050 (commit f617c1c). Fixes Windows "PS" letter-block fallback. New `.flag` global CSS class with emoji-priority font stack applied to all 7 flag-rendering spans across 6 components.
- [ ] Any user-reported issues from production testing
- [ ] **FT-07: Player Deletion Redesign** — Unified two-option flow (Remove from League vs Delete All Data). Requires DB migration (`players.active` boolean column). Soft-delete preserves name + history + leaderboard; hard-delete purges matches + player. Reactivate option for soft-deleted players. Same flow from AdminDashboard and PlayerStats. Plan approved 2026-04-09 — see `plans/refactored-jumping-ember.md`. **PLAN FILE LOST** — original was overwritten by FT-08. Needs fresh plan reconstruction. **Reference S044's `approvedMatches` filter selector pattern** for soft-delete UX.

---

### Deferred / Backlog
- [x] BF-13: Google auth branding — PARTIALLY DONE. App name, logo, support email, home page set in Google Console. Verification skipped (requires custom domain, not needed for friends-only app). Custom auth domain still needs Supabase Pro ($25/mo) — cosmetic only.
- [x] User verified admin dashboard works on phone (confirmed 2026-04-01)

## Future Updates — CANCELLED (user decision 2026-04-01)
~~Phase 8+: GN-20, multi-league, social features, dark mode refinement~~
~~Phase 9+: venue integration, white-label, AI predictions~~

## Open Questions
- ~~Should ELO recalculate when a match is deleted?~~ → YES, confirmed auto-recalculates via useMemo (S027)
- PWA caching strategy: currently network-first via sw.js — revisit if offline mode needed

## GitHub & Deploy
- **Repo:** github.com/mmuwahid/Padel-Battle (main branch)
- **Live:** padel-battle.vercel.app (auto-deploys from main)
- **Vercel team:** team_HYo81T72HYGzt54bLoeLYkZx
- **Vercel project:** prj_bzHHFRoGxhigKIecyN20vw4M1rrr

## Deploy Process
1. Validate syntax: `node -e "require('esbuild').buildSync({...})"`
2. Clone repo to /tmp, copy files, commit, push via git CLI
3. Vercel auto-deploys on every push to main
4. Test on https://padel-battle.vercel.app

## Upcoming Projects
- SafeMix Portal — requirements gathering phase
