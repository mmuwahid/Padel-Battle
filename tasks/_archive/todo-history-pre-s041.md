# PadelHub Todo — Completed Sessions Archive (Phase 6 → S039)

Rotated out of `tasks/todo.md` 04/MAY/2026 to keep the live file focused on NEXT SESSION + Future/Backlog. Per-session detail also lives in `sessions/S### — *.md`.

## PadelHub — Phase 6: COMPLETE (deployed 2026-03-26)
- [x] Core match tracking (log matches with sets, MOTM)
- [x] Leaderboard and ELO rankings
- [x] Player profiles with stats
- [x] Americano/Mexicano tournament mode
- [x] Supabase multi-user backend (Phase 3)
- [x] Auth flow (signup, login, magic link, Google OAuth)
- [x] League system with invite codes
- [x] Deploy v1.0 to Vercel
- [x] Phase 4: Bug fixes (7 items — Switch League, player claim, UI fixes)
- [x] Phase 5: Slide-out sidebar, full profile page, H2H, settings, PWA support
- [x] Phase 6.1: Admin role management (promote/demote members in Settings)
- [x] Phase 6.2: Notification toggles (green on/off switches, localStorage state)
- [x] Phase 6.3: Season awards (MVP, Most Active, Best Partnership, Most Improved, Longest Streak)
- [x] Phase 6.4: Admin dashboard (player management, league settings, CSV export)
- [x] Branded PWA icons (PadelHub logo — padel racket with hub network)

## PadelHub — Stage 1 Bug Fixes: COMPLETE (deployed 2026-03-27)
- [x] BF-01 through BF-14 (14 of 15 fixed)
- [x] BF-13, BF-15 deferred

## PadelHub — Stage 2 UX Hardening: COMPLETE (deployed 2026-03-27)
- [x] GN-01 through GN-19 (all addressed)

## PadelHub — Stage 3 Features: COMPLETE (4 of 6 deployed 2026-03-27)
- [x] FT-03: Profile Photo Upload
- [x] FT-04: Advanced Analytics Dashboard
- [x] FT-05: Match Scheduling
- [x] FT-06: Tournament Brackets

## PadelHub — Stage 4 Supplementary Bug Fixes: COMPLETE (deployed 2026-03-27)
- [x] BF-16: PWA icons regenerated with correct hub-network SVG logo (no text, dark bg)
- [x] BF-17: Footer nav "+" centered via 7-column CSS grid
- [x] BF-18: Admin dashboard shows claimed/unclaimed players with email
- [x] BF-19: Match log blocks future dates (max attr + submit validation)
- [x] BF-20: Skill badge hidden for players with <5 matches in scheduling
- [x] BF-21: Google "Connected" status reads user.identities provider
- [x] Toast notification position uses safe-area-inset-top (iPhone notch fix)

### User Verification — COMPLETE (confirmed 2026-04-01)
- [x] BF-16: PWA icon — correct logo on home screen
- [x] Toast notch fix — displays below notch correctly
- [x] BF-17: Footer spacing — even on all screen sizes

### Deferred / Closed
- [x] BF-13: Google auth branding — CLOSED (user decision 2026-04-01: no longer required)
- [x] BF-15: URL migration — cancelled. padelhub.vercel.app taken by someone else. Keeping padel-battle.vercel.app (user decision 2026-04-01)
- [x] GN-20: Playtomic level self-assign — CLOSED (user decision 2026-04-01: not required)
- [x] GN-21: Match scheduling full flow — COMPLETE (S007 push wiring, S021 confirmation flow, S022 expiry notifications)

## PadelHub — FT-02 Refactor: COMPLETE (deployed 2026-03-27)
- [x] App.jsx split from 3,539 → 1,572 lines (56% reduction)
- [x] 18 new files: theme, utils, data, components
- [x] Archived pre-refactor version to `Archive/PadelHub-Pre-Refactor-2026-03-27/`

## PadelHub — FT-01 Push Notifications: COMPLETE (deployed 2026-03-28)
- [x] VAPID key pair generated + stored as Supabase secrets
- [x] push_subscriptions table + RLS in Supabase
- [x] sw.js push + notificationclick handlers
- [x] Settings: master push toggle (subscribe/unsubscribe + Supabase sync)
- [x] LogMatch triggers push-notify Edge Function on new match
- [x] PWA notch fix (header + sidebar safe-area-inset-top)
- [x] Match Challenges notification toggle added (UI — backend wiring in GN-21)

## PadelHub — GN-21 Scheduling Flow: COMPLETE (deployed 2026-03-28)
- [x] Push notifications on challenge create + confirm
- [x] Leave button for open matches
- [x] Mark as Played on confirmed matches
- [x] Upcoming/Past tab toggle
- [x] Rank Change + New Members toggles hidden (need backend triggers)

## ========== PHASE 7 COMPLETE ==========

## Post-Phase 7 Polish (deployed 2026-03-28)
- [x] Footer nav: consistent icon sizing (24px container, 18px icons, 9px labels, same baselines)
- [x] Court icon rotated to horizontal orientation

## S009 Completed (2026-03-28)
- [x] BF-22: Schedule "Log Match" flow — inline score entry with pre-filled players, saves match + updates challenge
- [x] Supabase RLS fix — broadened update policy, added 'played' status, match_id/responses/duration columns
- [x] Cancelled matches removed from Past tab (no clutter)
- [x] Past tab score display — full match result with sets, WIN/LOSS, MVP
- [x] Match delete FK fix — ON DELETE SET NULL on challenges.match_id
- [x] Delete loading state — ".." indicator during processing
- [x] Past date blocking — schedule form rejects past dates
- [x] is_league_admin_or_owner() SECURITY DEFINER function

## S010 Completed (2026-03-28) — Tournament Mode V2
- [x] Mode Selector: Casual Play | Competitive Tournament toggle
- [x] Single Elimination: Setup → SVG bracket (dynamic, BracketSVG component) → Champion screen
- [x] Double Elimination: Setup → Winners bracket + Losers bracket → Grand Final → Champion
- [x] Round Robin: Setup → Group standings table (P/W/L/PTS/GD) → Match grid by round → Champion
- [x] Americano/Mexicano preserved under Casual Play
- [x] DB: Added `name` column to tournaments table
- [x] GameMode.jsx: 285 → 1457 lines (commits: 53d57fa, bb86322)

## S011 Completed (2026-03-28) — Bug Fixes + Infrastructure
- [x] BF-16 (Updated): OG image fixed — og:image now points to icon-512.png + twitter:image added
- [x] BF-23: Player deduplication — allSel/p1O/p2O filter applied to SE/DE/RR team selectors
- [x] BF-24: Create Tournament blocker — DB migration (player_ids→players, rounds→schedule, mode CHECK expanded)
- [x] Service worker cache bumped v3→v4 (forces PWA refresh)
- [x] Local padelhub/ folder fully synced with git repo (was stale from pre-S009)
- [x] Stale backdated challenge record deleted from DB (baf6e381, date 2026-03-17)

## S012 Completed (2026-03-28) — UX + Performance Audits
- [x] UX audit: 26 findings documented (3 critical, 8 high, 10 medium, 5 low)
- [x] Performance audit: bundle analysis, dead asset inventory, font analysis, runtime profiling
- [x] Action plan created for S013 implementation sprint
- [x] Report: `padelhub/docs/UX-AUDIT-S011.md`

## S013 COMPLETE (deployed 2026-03-28) — Performance + UX Sprint
- [x] PA-01: Delete 1.5 MB dead assets (7 files)
- [x] PA-02: Delete dead App.css (155 lines, never imported)
- [x] PA-03: Trim JetBrains Mono (dropped unused 400 weight)
- [x] PA-04: Parallelize loadLeagueData (8 queries → Promise.all)
- [x] PA-05: Fix O(n^2) ELO History (incremental approach)
- [x] PA-06: Code-split GameMode.jsx via React.lazy (64 KB deferred)
- [x] PA-07: Vite vendor chunk splitting (React + Supabase)
- [x] PA-08: Lazy load PlayerStats + CombosView (39 KB deferred)
- [x] PA-09: Smart SW caching (cache-first for hashed assets) + bumped to v5
- [x] PA-10: Font preload hint for Outfit 700
- [x] UX-C01: Double-submit protection on Schedule buttons
- [x] UX-C02: Replace alert/prompt in LeagueGate with inline UI
- [x] UX-C03: Replace prompt/confirm in Admin Dashboard with inline UI
- [x] UX-H01: Active tab indicator on bottom nav (green bg highlight)
- [x] UX-H02: 44px min touch targets on nav buttons
- [x] UX-H03: Cancel match inline confirmation (Yes/No)
- [x] UX-H06: Toast ARIA accessibility (role="alert", aria-live)
- [x] UX-H07: Numeric keypad on all 14 score inputs
- [x] UX-H08: Nicknames on leaderboard
- [x] UX-M09: Color contrast fix (MT #7a7a8e → #9090a4)
- [x] Build: 584 KB monolith → 6 chunks, no Vite warning
- [x] Deploy: commit 33cafa3, Vercel READY

## S014 COMPLETE (deployed 2026-03-28/29) — H2H Migration + Icon Health Check + Hotfixes
- [x] BF-13: Google Auth branding — assessed, deferred (needs Supabase Pro $25/mo)
- [x] BF-23: H2H moved from sidebar to Players > Analytics > ⚔️ H2H (full comparison view)
- [x] BF-24: Icon dedup — Players→👥, Chemistry→🧪, H2H→⚔️, Insights→💡, sidebar icons added
- [x] BF-25: Dead H2H sidebar button removed (CRLF line ending issue in first commit)
- [x] BF-26: H2H blank screen fixed — `matches` → `fm` prop mismatch + empty state added
- [x] Admin dashboard blank screen — S013 regression: missing JSX `{}` braces (de2e9a5) + missing useState declarations (4c724a2)
- [x] Deploy: commits 530f9f4 → 9c70a6a → de2e9a5 → 4c724a2, Vercel READY

---

## S016 COMPLETE (deployed 2026-03-29) — Quick Wins + UX Polish
- [x] QW-1: Remove all console.log/console.error from production (11 files)
- [x] QW-2: Rename `fm` prop to `matches` in PlayerStats + CombosView
- [x] QW-3: LeagueGate internal toast system (works without parent prop)
- [x] U-02: Admin rename/deactivate loading states
- [x] U-03: Sidebar ✕ close button
- [x] U-04: ELO History bar min/max Y-axis labels
- [x] U-05: Chemistry matrix scroll hint (gradient fade)
- [x] U-06: Sidebar menu icons (👤🔄📩⚙️)
- [x] U-07: Schedule form step indicator (1→2 with progress dots)
- [x] U-09: LeagueGate create/join double-submit protection
- [x] U-11: Sidebar tap feedback (CSS :active highlight)
- [x] SW: Cache bumped v5→v6
- [x] Deploy: commit 0fd50d7, Vercel auto-deploy

## S017 COMPLETE (deployed 2026-03-30) — Full UI Review + LeagueGate Fixes
- [x] Full 16-view UI walkthrough with preview tools (all views checked, no console errors)
- [x] BF-27: Sign Out button added to LeagueGate screen
- [x] BF-28: Invite button hidden from non-admin members on LeagueGate
- [x] SW cache bumped v6→v7
- [x] Deploy: commit c6067ff, Vercel auto-deploy

## S018 COMPLETE (deployed 2026-03-30) — Form UX + Accessibility
- [x] U-01: Schedule form persists across history/schedule sub-tab switches (display:none pattern)
- [x] U-15: Global focus rings on input/select/textarea (green border + glow)
- [x] U-13: Season selector horizontal scroll with fade hint
- [x] U-14: Removed hardcoded "v2.0" from settings footer
- [x] U-08: H2H player selects show ELO in parentheses
- [x] U-10: Skeleton loading with shimmer animation (replaces spinner)
- [x] P-05: Dropped Outfit 500 weight, replaced with 400 (~8KB savings)
- [x] SW cache bumped v7→v8
- [x] Deploy: commit d12ce47, Vercel auto-deploy

## S019 — App.jsx Refactor: COMPLETE (deployed 2026-04-01)
- [x] A-01d: Extract Sidebar from App.jsx (100 lines)
- [x] A-01a: Extract ProfileView from App.jsx (162 lines)
- [x] A-01b: Extract AdminDashboard from App.jsx (144 lines, 5 useState + 4 functions moved)
- [x] A-01c: Extract SettingsView from App.jsx (135 lines, 3 useState moved)
- [x] App.jsx cleanup: removed unused imports, dead references
- [x] Deploy + verify all views (Leaderboard, Sidebar, Profile, Settings — zero errors)
- [x] SW cache bumped v8 → v9

## S020 — GameMode Refactor + Features: COMPLETE (deployed 2026-04-01)

### Architecture (Phase 1)
- [x] A-02a: GameMode.jsx rewritten as slim orchestrator (115 lines)
- [x] A-02b: Extract SingleElimination component (325 lines)
- [x] A-02c: Extract DoubleElimination component (344 lines)
- [x] A-02d: Extract RoundRobin component (277 lines)
- [x] A-02e: Extract AmericanoMode component (227 lines)
- [x] BracketSVG extracted (171 lines)

### Backend Schema (Phase 2)
- [x] notifications table (in-app notification center) + RLS + GRANTs
- [x] match_reactions table (emoji reactions) + RLS + GRANTs
- [x] expire_stale_challenges() SECURITY DEFINER function
- [x] notif_challenges column added to push_subscriptions
- [x] 4 SECURITY DEFINER RPC functions for Edge Function access
- [x] push-notify Edge Function rewritten (RPC-based, --no-verify-jwt)
- [x] Fix: notif_challenges now persisted in subscribeToPush() and toggleNotification()

### New Features (Phase 3)
- [x] NotificationCenter component (bell icon + unread badge + full list)
- [x] Match reactions (5 emojis on match history cards)
- [x] Rank Change push trigger (fires after every new match)
- [x] New Members push trigger (fires on league join)
- [x] Auto-expiry for unanswered challenges (48h, RPC on app load)

### Verified
- [x] All 5 tournament modes render correctly
- [x] Notification center shows unread badge + notification list
- [x] Match reactions persist and display counts
- [x] End-to-end: challenge created → notifications written → bell badge shows

## S021 — Challenge Confirmation + Optimization: COMPLETE (deployed 2026-04-01)

### Challenge Confirmation Flow
- [x] Individual player accept/decline before auto-confirm (pending status)
- [x] Accept/Decline buttons on pending challenge cards in ScheduleView
- [x] Response indicators: ✓ accepted, ✗ declined, ⏳ waiting
- [x] Auto-confirm when all players accept + push notifications
- [x] DB: pending status added to CHECK constraint, responses JSONB used

### Phase 4 Optimization
- [x] A-09: Replace SELECT * with specific column selects (8 queries)
- [x] P-12: challenges + notifications added to Realtime subscriptions
- [x] U-16: Delete Tournament with inline confirmation dialog (all 4 modes)

## S022 — React Context + Notifications + Bugfix: COMPLETE (deployed 2026-04-01)
- [x] A-04: LeagueContext with useLeague() hook. NotificationCenter migrated.
- [x] GN-21: All 4 notification toggles visible and wired (New Match, Challenges, Ranking Changes, New Members)
- [x] Challenge expiry notification (expire_stale_challenges writes to notifications table)
- [x] Cancel/Play push notifications from ScheduleView
- [x] BF-13, GN-20 closed. Phase 8+/9+ cancelled.
- [x] CRITICAL BUGFIX: A-09 column selects used nonexistent columns → all data loading broken
- [x] HOTFIX: LeagueContext useMemo infinite re-render → blank screen

## S023 — Error Toast + useLeague Migration: COMPLETE (deployed 2026-04-01)
- [x] Error toast in loadLeagueData catch block (surfaces failures instead of silent empty state)
- [x] useLeague() migration: MatchHistory (7 props), AdminDashboard (8 props), GameMode (4 props) — 18 total removed
- [x] Fixed double semicolon in loadLeagueData

## S024 — Full Codebase Audit: COMPLETE (2026-04-01)
- [x] Triple-layer code review (structured + adversarial + deep explore)
- [x] 10 critical, 10 high, 12 medium findings documented
- [x] 4-phase fix plan created (S025-S026)
- [x] 3 new bugs identified (BF-29, BF-30, BF-31)

## S025 — Security Hardening + Runtime Fixes: COMPLETE (deployed 2026-04-01)
- [x] BF-29: Fix `claimedP` undefined in ScheduleView — moved to component top scope
- [x] BF-30: Fix `deactivatePlayer` — changed to .delete() (no `active` column exists)
- [x] BF-31: Fix CSV injection in `exportMatchesCSV` — escape quotes + formula chars
- [x] BF-32: Fix player profile blank screen — Rules of Hooks violation (useState/useMemo after early return)
- [x] Lock RLS UPDATE policies: admin-only for matches, tournaments, seasons, players
- [x] Restrict `leagues_select` — members-only + `lookup_league_by_invite` RPC
- [x] Add RLS policies to notifications, match_reactions, push_subscriptions, challenges
- [x] Update docs/database-schema.sql with missing table definitions + S025 policies
- [ ] Add JWT verification to push-notify Edge Function (deferred to S026)

## S026 — Data Integrity RPCs + Performance: COMPLETE (deployed 2026-04-02)
- [x] Create `respond_to_challenge` RPC (atomic, FOR UPDATE row lock)
- [x] Create `join_challenge` RPC (atomic, prevents overfill)
- [x] Create `play_challenge` RPC (transactional match+challenge)
- [x] Update ScheduleView to use all 3 RPCs instead of client-side mutations
- [x] Add ELO floor clamp to 0 (Math.max)
- [x] Wrap lazy components (GameMode, PlayerStats, CombosView) with ErrorBoundary
- [x] Debounce realtime loadLeagueData (500ms useRef timer)
- [x] Add .limit(500) to matches query
- [x] Clear state on loadLeagueData error
- [x] LeagueContext useMemo — CONFIRMED IMPOSSIBLE (early returns violate Rules of Hooks). Plain object is permanent.
- [x] Add DB CHECK constraints (team_a/team_b array length = 2) — done S028
- [x] Add tournament version column for optimistic concurrency — done S028

## S027 — Bug Fixes: COMPLETE (deployed 2026-04-02)
- [x] BF-33: Invite link lost during OAuth/signup/reset redirect — added window.location.search to all redirectTo URLs
- [x] BF-34: League creation RLS error — added `OR created_by = auth.uid()` to leagues_select_members policy
- [x] ELO recalculation on match delete — confirmed already works via useMemo([players,matches])
- [x] SW cache bumped v20 → v21

## S028 — Platform Admin Feature: COMPLETE (deployed 2026-04-02)
- [x] Hardcode super admin user ID in PlatformAdmin.jsx
- [x] PlatformAdmin.jsx component (170 lines) — overview stats, leagues table, users table
- [x] 5 SECURITY DEFINER RPCs: is_platform_admin, platform_get_stats, platform_get_leagues, platform_get_users, platform_delete_league
- [x] Sidebar "Platform Admin" button (gated to super admin user ID)
- [x] Overview: total users, total leagues, total matches, active users (7d)
- [x] Leagues tab: name, creator email, member/match counts, invite code, date, delete
- [x] Users tab: display name, email, league count, signup date
- [x] Search/filter on both tabs
- [x] SW cache bumped v21 → v22

## S029 — Fix Web Push Delivery: COMPLETE (deployed 2026-04-02)
- [x] Step 1: Implement proper VAPID JWT signing (ES256 via Deno Web Crypto)
- [x] Step 2: Implement RFC 8291 payload encryption (ECDH + HKDF + AES-128-GCM)
- [x] Step 3: Update push send to use proper headers (aes128gcm, vapid auth)
- [x] Step 4: Deploy and test (4 deploys, final version working)
- [x] Step 5: RLS fix — switched to SECURITY DEFINER RPCs (no supabaseAdmin)
- [x] Step 6: Targeted notifications — challenges to players only, match results to all
- [x] Step 7: Deep linking — challenge -> /#schedule, match -> /#history
- [x] Step 8: In-app notifications insert via RPC
- [x] Step 9: Security hardening — league membership check, target_user_ids validation
- [x] SW cache bumped v23 -> v26

## S030 — Security Hardening + Performance + Audit Fixes: COMPLETE (deployed 2026-04-03)
- [x] H-2: Restrict CORS to Vercel domain (was wildcard `*`, now origin-checked whitelist)
- [x] H-5: Create `leave_challenge` RPC for atomic leave (SECURITY DEFINER, FOR UPDATE lock)
- [x] L-4: Parallelize push sends with `Promise.allSettled`
- [x] M-3: Rate limiting on push-notify Edge Function (30 req/min per user)
- [x] User confirmed all features working on phone (2026-04-03)
- [x] Triple-layer audit: code review (23 findings) + performance (B+) + UI walkthrough (8 views, zero errors)
- [x] BF-35: deletePlayer scoped to league_id (was deleting matches across ALL leagues)
- [x] BF-36: Settings member list display_name fix (profile.display_name, not user_metadata)
- [x] BF-37: LogMatch logged_by set to user.id (was null) + user prop wired
- [x] Leaderboard click-to-profile: podium cards + full rows clickable → navigates to player stats

## S031 — Leaderboard Ranking Fix: COMPLETE (deployed 2026-04-03)
- [x] BF-38: Leaderboard sort rewritten — Win Rate > ELO > Games Played > Name (was total wins first)
- [x] "Ranked by Win Rate" label added to leaderboard header
- [x] SW cache bumped v28 → v29

## S032 — Auth Login Loop Fix: COMPLETE (deployed 2026-04-05)
- [x] BF-28: PASSWORD_RECOVERY event handler + "Set New Password" form
- [x] friendlyAuthError() mapper for rate limits, invalid credentials, unconfirmed emails
- [x] "Resend confirmation" button on sign-in screen
- [x] isRecoveryRef to prevent stale closure auto-login during recovery
- [x] Cleared 6 stale sessions for amakkawi89@gmail.com via Supabase CLI
- [x] Identified root cause: user signed up with Google OAuth only, no email/password identity
- [x] SW cache bumped v29 → v30

## S033 — Blank Screen PWA Fix: COMPLETE (deployed 2026-04-05)
- [x] SW: hashed assets changed from cache-first → network-first (prevents stale JS 404)
- [x] SW: SW_UPDATED postMessage auto-reloads tabs on new deployment
- [x] SW: periodic update check every 30 minutes
- [x] HTML splash screen (logo + pulsing loader) visible before React boots
- [x] Splash: offline detection + 10s timeout with "Tap to reload"
- [x] Auth: 5s timeout on getSession() via Promise.race
- [x] AuthGate: useEffect hides splash when auth resolves
- [x] SW cache v30 → v31

## S034 — Leaderboard Total Wins Ranking: COMPLETE (deployed 2026-04-09)
- [x] Sort priority changed: Total Wins > Win Rate > ELO > Games Played > Name
- [x] Podium cards: Win Rate % prominent, ELO as secondary muted text
- [x] Table rows: WR leftmost, W/L middle, ELO demoted to muted gray
- [x] Float comparison hardened via Math.round(winRate*1000)
- [x] Header label: "Ranked by Total Wins"

## S036 — Combos + Leaderboard Bug Fixes: COMPLETE (deployed 2026-04-21)
- [x] Bug 1: Leaderboard win count — green when W > 0, muted grey when W = 0 (podium + table rows)
- [x] Bug 2: "Best Partner" label conditional — single partner shows "Only Partner", all-0% shows "Partner" (neutral)
- [x] Bug 3: Partner ranking tiebreaker — best sort: pct DESC → games DESC; worst: independent pct ASC → games DESC sort; Worst card hidden when `worst.pct < best.pct` is false (e.g. all at 100%)
- [x] Deploy incident: Vercel rejected 2 commits from UNEC email on private repo → switched to Gmail author → repo made public as safety net → git-author rule pinned in root CLAUDE.md Cold Start step 6, padelhub/CLAUDE.md GitHub & Deploy section, and auto-memory
- [x] Commits: 27be785, 72f11c4 (ERR), 88a9141 (OK — Bugs 1&2), 92314b8 (OK — Bug 3)

## S038 — GitHub Issues Analytics Fixes: COMPLETE (deployed 2026-04-29)
- [x] Issue #1: **Match Diff** (matches W − L) — first attempt summed game scores (gave Luke -10), hotfix replaced with match-count diff per user. Tile relabelled "Match Diff" / "Matches won minus matches lost". User confirmed correct on prod (a570c9a).
- [x] Issue #2: League Activity chart — proper x/y axes with scale ticks (0/mid/niceMax), dashed gridlines, month labels under bars only, removed per-bar count overlay.
- [x] Issue #3: Partnerships formula now matches Best Duos exactly (pct DESC, games DESC tiebreaker; worst hidden when <6 partnerships, excludes best pair).
- [x] Issue #4: H2H "As Opponents" shows explicit name attribution `<P1Name> won X / <P2Name> won Y` plus match count subtitle on both blocks.
- [x] Issue #5: Biggest Wins shows winner team (green) vs loser team (red) with color-coded set scores derived from `m.winner`.
- [x] Issue #6: Push notifications — fixed end-to-end. Systematic audit found 6 bugs: in-app pref filter missing, stale-endpoint RPC broken (JSON.stringify of array), no diagnostics, no on-device test, endpoint accumulation on resubscribe, double-push per match. Test Push button verified delivery on iPhone PWA. Edge Function v17, commit 8da3f35.
- [x] SW cache v32 → v34. Commits: fa6587d (initial), a570c9a (#1 hotfix). Deploys: dpl_FSSXXBizejyATpifve9gpnzV8kCX, dpl_7fdM5SpZRih8rnvAyjWmFUvieuZ8 — both READY.
- [x] OneDrive padelhub/ synced (3 files: App.jsx, PlayerStats.jsx, sw.js). Issues 1-5 closed on GitHub with fix notes.

## S039 — Codebase Cleanup Pass: COMPLETE (deployed 2026-04-29)
- [x] Pre-flight: branch `chore/cleanup-pass` off `48241ba`, baseline lint captured (81 problems / 74 errors)
- [x] Track 1 — Deduplication: extracted `setTotals(sets) -> [a,b]` helper. Consolidated 5 sites of `m.sets.reduce((s,x)=>s+x[0],0)` (App.jsx:572, MatchHistory.jsx:87, PlayerStats.jsx:90+139, ScheduleView.jsx:382-383). Commit a2da5a3.
- [x] Track 2 — Type Consolidation: SKIPPED (JS codebase)
- [x] Track 3 — Dead Code: dropped `export {ES}` in elo.js, `export` keyword on `fisherYates` in shuffle.js, `actionLoading` useState + setters in ScheduleView, `data:matchId` destructure on `play_challenge` RPC. Commit d3c055d.
- [x] Track 4 — Circular Dependencies: clean. madge confirmed 0 cycles across 36 files. No commit.
- [x] Track 5 — Type Strengthening: SKIPPED (JS codebase)
- [x] Track 6 — Error Handling: surfaced 14 silent DB-action catches via `showToast`. Files: PlayerStats (add/update/delete), GameMode (end/delete tournament), RoundRobin (create/score), SingleElimination (create/score×2), DoubleElimination (create/score), AmericanoMode (start/score/nextRound), NotificationCenter (load), App.jsx (unsubscribeFromPush). Threaded showToast through GameMode `sharedProps` and added as PlayerStats prop from App.jsx. `deletePlayer` now atomic-safe — throws on `matchErr` (was orphaning rows). Commit 834fee8.
- [x] Track 7 — Deprecated/Slop: removed `gid()` (zero callers), `requestNotificationPermission` (12 lines, never called), unused `generateAmericanoSchedule`/`generateMexicanoRound` imports in App.jsx (extracted in S020), `failed`/`data` dead destructures. No edit-narrative comments found in src/. Commit aea36c8.
- [x] Findings report: `_wip/cleanup-findings-2026-04-29.md` covers 5 MEDIUM + 3 LOW deferrals.
- [x] Live verification on dev server (port 5181) signed in as m.muwahid05@gmail.com — Leaderboard, Matches (5 set-totals math verified), Players Roster + Insights (Biggest Wins ranking), GameMode Casual+Competitive selectors, NotificationCenter (23 notifs), Settings (push toggle). Zero console errors throughout.
- [x] Live bug confirmed: "← Back to Leagues" on player-claim screen does nothing (deferred MEDIUM-2 fix).
- [x] Branch FF-merged to main. SW cache v37→v38 (commit 349c8d5). Deploy dpl_CiFe1ZxpnRcKyPXyF4Nkaw1JuHAr READY.
- [x] OneDrive padelhub/ resynced via tracked-files mirror.
- [x] devDependencies added: `madge`, `knip` (used during cleanup, retained for future audits).

### S039 Codebase Stats (post-cleanup):
- App.jsx: ~1,070 lines (was 1,084 — −14 lines from Track 6/7 cleanup)
- helpers.js: 5 utilities (`formatTeam`, `win`, `formatDate`, `setTotals`; `gid` removed)
- Total lint problems: 39 (down from 81)
- Build: green, 6 chunks, no warnings. Main bundle 165.11 KB (was 166.14 KB)
- Production deploy: dpl_CiFe1ZxpnRcKyPXyF4Nkaw1JuHAr (commit 349c8d5)

## S035 — FT-08 RNG Team Shuffler: COMPLETE (deployed 2026-04-17)
- [x] New `src/utils/shuffle.js` — `fisherYates`, `shuffleIntoMatches` pure functions (unit tested sizes 3/4/5/7/8/11)
- [x] New `src/components/TeamShuffler.jsx` — reusable chip-based pool picker + results screen with sitout display
- [x] LogMatch integration — 🎲 Shuffle Teams button, multi-match queue auto-populates next match after each save
- [x] ScheduleView integration — 🎲 Shuffle Teams inside challenge form Step 1, singleMatchMode warning for >1 match shuffles
- [x] Access: any league member (no admin gate), true random Fisher-Yates, one-roll accept-or-cancel
- [x] End-to-end verified in preview for pool sizes 4/6/7/8
- [x] SW cache bumped v31 → v32
- [x] Commit: 0cd5b85 — deploy state: READY

