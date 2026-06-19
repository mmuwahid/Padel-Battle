# Session Log — 2026-06-19 — Session087 — Issue 108 League Invite Approval Workflow

**Project:** PadelHub
**Type:** Build/Fix
**Phase:** Pre-store-launch
**BU:** Muwahid Dev
**Duration:** Deep (45 min+)
**Commits:** `f1a08bb`, `b2905cf`, `5ddec3e`, `55e0a3e`, `0e2ccde`, `12ddf27`, `28aefde`, `8681d21`, `b54c0b0`, `e9df6ec`, `f8ec030` · **DB migrations:** `s108_approve_join_request_carry_over`, `s108b_create_league_carry_over_owner_profile` · **SW v193 → v198** · **Issues #108 + #94 closed (0 open)**

---

## Cold Start
- Ran cold-start protocol. Last session S086 (`8b4ba43`, SW v193). Open GitHub issues: **#108 (League invite, NEW)** + #94 (responsive sizing, carry-over).
- **`/tmp/Padel-Battle/.git` was corrupt** (only `objects/` survived — no HEAD/config/refs; 2nd occurrence after S079). GitHub `main` verified intact at `8b4ba43`; re-cloned fresh, reset author to `m.muwahid@gmail.com`, re-synced OneDrive `src`/`public` mirror. No pushed work lost.
- **Cross-PC check (user-requested):** all S080→S086 **code** commits present on GitHub, working tree clean, OneDrive mirror identical, production live on SW v193. CODE fully in sync. **BUT** discovered the git repo's **meta-docs** (`tasks/`, `sessions/`, `CLAUDE.md`) are stale at **S080** — S081–S086 documentation was written to OneDrive but never committed to git. (See Lessons.)

## What Was Done — Issue #108 (all six points)
Root cause: **two join paths bypassed the approval workflow.** Invite **link** (`LeagueGate.tryAutoJoin`) and in-app **join-by-code** (`LeagueGate.joinLeague`) both inserted `league_members` directly, so no `join_request` was created (empty admin queue), no player row was created (no data), and the orphaned member hit the global "Pending Review" lock. DB ground-truth confirmed via Supabase: 0 join_requests for Intermediate League; friend Husain (`h2roomi@gmail.com`) was a direct `member` with no players row, while fully set up in Padel Stars League.

1. **#1 Empty queue — FIXED.** Both paths now call `create_join_request` (type `new_profile`) → pending request shows in the Approval Queue. The misleading "joined the league" push was dropped (create_join_request already notifies admins).
2. **#2 Existing-user data carry-over — FIXED.** Migration `s108`: `approve_join_request` now backfills the new player row (country, DOB, gender, court position, handedness, **avatar**, nickname, grade) from the requester's most-recent claimed player in any OTHER league, via `COALESCE(request_value, existing_player_value)`. Frontend prefills the request snapshot from that existing player too (better admin-review UX).
3. **#3 Copy invite code — FIXED.** `LeagueManagement.copyLink` now copies the raw `invite_code` only; Share button keeps the full URL. Button label → "Copy invite code".
4. **#4 League isolation — VERIFIED (no change).** players/matches scoped per `league_id` (Intermediate 1/0 vs Padel Stars 14/9).
5. **#5 Pending lockout — FIXED.** Approval-gating means a pending user has no membership in the new league → keeps full access to other leagues. Existing members get a one-time `sessionStorage` "request sent" toast (read in App.jsx). The residual "Pending Review" lock (App.jsx:1002) gains a "Switch to another league" escape when `leagues.length > 1`.
6. **#6 Invite link opens Safari, not the installed PWA — DEFERRED (iOS limitation).** No web-only fix: iOS routes https links to Safari and offers no way to open an "Add to Home Screen" PWA in its standalone window (Universal Links / custom schemes are native-only). To be solved by **Universal Links when the app is wrapped with Capacitor** for the store launch. Code-based joining (point 3) is the interim path.

**Data fix (user chose "reset to re-join"):** deleted Husain's orphaned Intermediate `league_members` row (no player/matches there). He now re-joins via the fixed flow; admin approves from the queue.

## Files Modified — commit `f1a08bb` (5 files + 1 migration)
- `src/components/LeagueGate.jsx` — new `submitJoinRequest` helper; `tryAutoJoin` + `joinLeague` create pending requests (return `{kind}`); cold-start useEffect handles member/requested branches.
- `src/components/LeaguesView.jsx` — `handleJoin` shows "Request sent" vs "Opened".
- `src/App.jsx` — one-time pending toast (sessionStorage); lock-screen "Switch to another league" button.
- `src/components/LeagueManagement.jsx` — copy button copies raw code + relabel.
- `public/sw.js` — v193 → v194.
- Migration `s108_approve_join_request_carry_over` (Supabase, applied).

## Verification
- Per-file esbuild syntax check on all 4 changed JS files passed (Vite OOMs in VM). Pre-existing duplicate `user` key in App.jsx `leagueCtx` noted (harmless, out of scope).
- `git diff --stat` confirmed exactly the 5 intended files before commit.
- Deploy `dpl_3VJurEmFjqvrhBFqUEkAVc9tEP7Z` READY; live SW confirmed `padelhub-v194`. Author `m.muwahid@gmail.com`.
- DB: Husain reset verified (Padel Stars member only); isolation counts verified.
- **Issue #108 closed** on GitHub with a full six-point summary comment.

## Key Decisions
- Unify both invite paths on the approval queue (user: "always require approval").
- Carry-over implemented entirely in `approve_join_request` (backfill from existing player) — avoids changing `create_join_request` signature or adding a `join_requests.avatar_url` column.
- Reset Husain rather than auto-approve (user choice).
- #6 deferred entirely to the native wrap; #108 closed now (user choice) with #6 documented as an iOS limitation.

## Lessons Learned
- **`/tmp/Padel-Battle/.git` has now corrupted twice (S079, S087)** — `/tmp` on Windows = `AppData\Local\Temp`, which OS cleanup/reboots between PC switches can purge. Symptom: `.git` left with only `objects/`. Recovery: re-clone from GitHub (everything pushed is safe). **Consider relocating the working clone to a persistent path** to stop this recurring.
- **Git meta-doc drift:** session-close docs (todo/lessons/sessions/CLAUDE) for S081–S086 were written to OneDrive but never committed to git, so a fresh clone shows S080-era docs. Cold-start reads OneDrive so it's been invisible. **Either commit doc updates to git each session, or accept OneDrive as the doc source of truth — but don't half-do both.**
- **Look for divergent code paths doing the "same" user action.** #108's whole tangle came from invite-link vs invite-code vs onboarding being three separate implementations; only one used the approval queue. When a workflow misbehaves, enumerate every entry point before fixing one.
- **iOS PWAs cannot be deep-linked from external links** — a recurring expectation gap; the real fix is native (Capacitor + Universal Links).

## Next Actions
- [ ] iPhone smoke-test SW v194: Husain re-joins → "Waiting for approval"; admin sees him in Approval Queue with details prefilled; approve → player created with avatar/country/handedness/court/grade carried over; copy button copies raw code; pending user keeps access to other leagues.
- [ ] (Recommended) Reconcile stale git meta-docs — commit current OneDrive `tasks/`, `sessions/`, `CLAUDE.md` (S081–S087) into the git repo so history is complete.
- [ ] Resume App Store + Google Play launch prep (Capacitor wrap) — includes **#6 Universal Links** for invite deep-links. G1 Apple login pending Apple Developer account.
- [ ] Issue #94 — UI responsive sizing for iPhone 13.

---

## Continued (same session) — doc reconcile + Issue #94

### Git meta-doc reconciliation (`b2905cf`)
Fixed the cross-PC doc drift found at cold start: committed the current OneDrive docs into the repo — +91 files (back-filled session logs S017–S087, planning specs) and ~36 updated (`tasks/todo.md`, `tasks/lessons.md`, `sessions/INDEX.md`, project `CLAUDE.md`). Code was already in sync; this commit is docs-only. Git history is now complete; going forward, commit doc updates each session.

### Issue #94 — responsive leaderboard for small screens (`5ddec3e`, SW v194→v195)
Root cause: the Ranking leaderboard used a fixed 8-column grid (`36px 1fr 28px 28px 28px 28px 30px 38px`, gap 4, padding 10) — Rank / Player(1fr) / Flag / MP / MW / ML / CW / Eff%. The fixed columns + gaps + padding (~264px) starved the `1fr` player column on a 390px iPhone 13, so `.lbn` (nowrap + ellipsis) truncated names to "ABDULR…". Fix: a mobile-first `@media (max-width:400px)` block in `index.css` tightening the rank/flag/stat columns (28→22, 30→26, 38→32), gap (4→3), row padding (10→8) and avatar (30→26), plus `.lbn` 11→10.5px / no letter-spacing. Player column gains ~50px (~8 → ~16 chars at 390px). **Gated: screens ≥401px (larger iPhones, Pro Max, tablets, desktop) are byte-for-byte unchanged — no regression on normal screens.** Verified by computation (full clone has no node_modules + Vite OOMs in this VM); device smoke-test on iPhone 13 pending. Issue left OPEN until user confirms.

### Avatar carry-over on league CREATE (migration `s108b`, DB-only)
User reported their avatar showed the "M" initial (not their photo) in the Intermediate League they own. Ground truth: `profiles.avatar_url` SET (global), Padel Stars player avatar SET, **Intermediate player avatar NULL**. Root cause: `create_league` created the owner's player row with only `name`+`user_id` — never copying avatar/profile data. This is the create-path twin of #108's join-path carry-over. Fix — migration `s108b_create_league_carry_over_owner_profile`: `create_league` now backfills the owner's new player (avatar/country/DOB/gender/court/handedness/grade) from their most-recent existing player in any other league, falling back to `profiles.avatar_url` for the photo. Data fix: set Moody's Intermediate player `avatar_url` from his profile (DB-only, no deploy — reload re-fetches players). Note: the header/Sidebar/ProfileView `.propic` avatars read the GLOBAL `avatarUrl` (`profiles.avatar_url`, App.jsx:197) so they were already correct; the per-league player rows (ranking/players/leaderboard) were the gap.

### Round-2 follow-ups from live testing (`12ddf27`, SW v195→v196 + DB data-fix)
User tested the approval flow (Husain re-joined → admin got the notification → he's in the queue: the #108 fix works end-to-end). Three things surfaced:
- **Country flag missing under owner's name (Intermediate):** same create-path gap as the avatar — `create_league` hadn't copied country/handedness/etc. `s108b` fixes it forward; data-fixed Moody's Intermediate player by backfilling ALL profile fields (country PSE, handedness, position, gender, grade) from his Padel Stars player. DB-only.
- **Notification → Approval Queue opened the sidebar drawer OVER the queue:** `handleNotifNavigate` set `setSidebarOpen(true)` for a `sidebarView` target, but sub-views render in the main content area from `sidebarView` alone (App.jsx:1126+) — so the drawer stacked on top. Fixed: set the view, leave the drawer closed (mirrors `navigateSidebar`).
- **"NEW PROFILE" tag on an existing user:** the Approval Queue labeled every non-claim request "NEW PROFILE". Now `ApprovalQueueScreen` checks whether the requester already has a player in another visible league and shows **"EXISTING USER"** (blue `.aqtype.ex`) vs **"NEW PLAYER"**; claim stays "CLAIM". (RLS-limited: detects existing-ness only in leagues the admin can see, which covers the common owner case.)

### Round-3: web push on approval (`8681d21`, SW v196→v197)
User approved Husain but reported "he's still not in the league and got no notification." DB ground-truth showed the approval **fully succeeded** — Husain is a `member`, has a player row (IRQ + avatar carried over), is in the active Season 1 roster, and a "Welcome to Intermediate League" (`join_approved`) bell row exists. So it was purely client delivery: (1) no web PUSH was fired on approval (only the in-app bell), so a closed app gets no alert; (2) Husain's client (sitting in Padel Stars, not auto-polled since he already had a league) hadn't refreshed its league list. Fix: `ApprovalQueueScreen.approve()` now fires `sendPushNotification("members", "Welcome to …", …, [req.user_id], {skip_in_app:true})` after the RPC — best-effort push, no duplicate bell. (Existing-member refresh: the user just reopens PadelHub → Switch League → the new league appears; no code change there.)

### Round-4: league-switch staleness (`e9df6ec`, SW v197→v198)
User: switching leagues didn't update the leaderboard/players screens — only an app restart did. Two stale-state bugs:
1. **`debouncedReload` stale closure.** It's `useCallback(..., [])` (memoized once) but called `loadLeagueData()` directly. `loadLeagueData` is recreated each render closing over the current `leagueId`, so `debouncedReload` was pinned to the FIRST render's closure (initial league). After switching, any realtime tick reloaded the OLD league's data over the new one. Restart "fixed" it because the initial leagueId then was the switched league (localStorage). Fix: `loadLeagueDataRef` (assigned each render) + `debouncedReload` calls `loadLeagueDataRef.current?.()`.
2. **Season selector not re-picked on switch.** The "set initial season" effect guarded on `!selectedSeason`, so a switch kept the old league's season id; the season-scoped leaderboard then filtered against a season absent from the new league (→ empty/stale). Fix: re-pick the active season when `selectedSeason` isn't among the loaded league's seasons (`!seasons.some(s=>s.id===selectedSeason)`), deps `[seasons, selectedSeason]`.

## Next Actions
- [ ] Resume App Store + Google Play launch prep (Capacitor wrap) — carries the deferred #108 point #6 (invite-link Universal Links). G1 Apple login pending Apple Developer account.
- [ ] Color sweep Note A (S069) — verify whether S084's `--muted`→`#9090a4` already closes it.
- [ ] Optional: relocate the working git clone off `/tmp` to a persistent path to stop the recurring `.git` corruption.

## Commits & Deploy
- **`f1a08bb`** — route league invites through approval queue + data carry-over (#108) + migration `s108_approve_join_request_carry_over`. SW v194. **Issue #108 closed.**
- **`b2905cf`** — reconcile git meta-docs with OneDrive (back-filled session logs S017–S087 + planning + tasks + CLAUDE.md; +91/~36 files, docs-only).
- **`5ddec3e`** — responsive leaderboard for small screens / iPhone 13 (#94). SW v195. **Issue #94 closed** (user-confirmed).
- **`55e0a3e`** — docs: record #94 + reconcile in session log/todo/INDEX/CLAUDE.
- **`0e2ccde`** — avatar carry-over on league CREATE via migration `s108b_create_league_carry_over_owner_profile` (+ Moody Intermediate avatar data-fix; docs).
- **`12ddf27`** — notification → Approval Queue routing (no drawer over it) + "EXISTING USER" vs "NEW PLAYER" tag. SW v196.
- **`28aefde`** — docs: round-2 fixes.
- **`8681d21`** — web push to the approved user on join approval. SW v197.
- **`b54c0b0`** — docs: approval push.
- **`e9df6ec`** — league-switch staleness fix (debouncedReload ref + season re-pick). SW v198.
- **`f8ec030`** — docs: league-switch fix.
- **DB data-fixes:** removed Husain's orphaned Intermediate membership; backfilled Moody's Intermediate player avatar + full profile (country/handedness/etc.) from Padel Stars.
- **Production live on SW v198**, main `f8ec030` (+ this log commit). All items user-tested and confirmed working; **0 open GitHub issues.**
- **Live:** padel-battle.vercel.app

---
_Session logged: 2026-06-19 | Logged by: Claude (session-log skill) | Session087_
