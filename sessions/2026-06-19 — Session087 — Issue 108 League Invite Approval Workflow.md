# Session Log — 2026-06-19 — Session087 — Issue 108 League Invite Approval Workflow

**Project:** PadelHub
**Phase:** Pre-store-launch
**Commits:** `f1a08bb` · **DB migration:** `s108_approve_join_request_carry_over` · **SW v193 → v194**

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

## Commits & Deploy
- **Commit:** `f1a08bb` — `fix: route league invites through approval queue + data carry-over (#108)`
- **Migration:** `s108_approve_join_request_carry_over` (Supabase project nkvqbwdsoxylkqhubhig)
- **Deploy:** `dpl_3VJurEmFjqvrhBFqUEkAVc9tEP7Z` — READY (SW v194 live)
- **GitHub:** Issue #108 closed with summary.
- **Live:** padel-battle.vercel.app

---
_Session logged: 2026-06-19 | Logged by: Claude | Session087_
