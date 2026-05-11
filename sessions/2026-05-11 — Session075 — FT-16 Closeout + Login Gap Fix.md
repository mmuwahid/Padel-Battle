# Session Log — 2026-05-11 — Session075 — FT-16 Closeout + Login Gap Fix

**Project:** PadelHub
**Phase:** Post-P12 polish + FT-16 closeout (Issue #71 path to close)
**Duration:** ~2.5h (cross-PC cold start + retrospective S074 reconstruction + S075 ship)
**Commits:** `9c72c17` (S075 ship)

---

## What Was Done

### Cross-PC sync at cold start
- This PC was 33 commits behind `origin/main` in `/tmp/Padel-Battle`. Pulled to HEAD `c22b70c` (SW v141).
- OneDrive sessions folder had only S001-S016 locally (S017-S073 were online-only stubs); `INDEX.md` + `todo.md` had synced through S073.
- Verified open GitHub issues: **#71** (FT-16) and **#25** (FT-15), both still OPEN.

### S074 retrospective reconstruction
- S074 had landed 2 commits on `main` (`b688201`, `c22b70c`) but no session log was written — originating PC shut down before close protocol ran.
- Reconstructed S074 log from `git show` on both commits + S073's "next session" pointer + FT-16 plan-as-deliverable.
- Files updated: new `sessions/2026-05-10 — Session074 — FT-16 NotificationCenter + Open-Match Deep-Link + RR Grid Icon.md`; `sessions/INDEX.md` (S074 row + Next session → S075); `tasks/todo.md` (S074 outcomes archived, S075 priorities set); `tasks/lessons.md` (Lesson #103 — cross-PC handoff close-protocol gap; 2 patterns).

### FT-16 push-notify Edge Function branch (Issue #71 step 1/2)
- `supabase/functions/push-notify/index.ts`:
  - `typeFilter` switch extended with `open_match → "notif_challenges"` (reuses challenges pref)
  - `pushUrl` switch extended with `open_match → "/#schedule"`
  - New `skip_in_app` payload param. Wrapped the `insert_notifications` block in `if (!skip_in_app)` so RPC-inserted bell rows aren't dupes when caller passes `skip_in_app: true` (FT-16 flows where RPCs are single source of truth — Lesson #54).
- Deployed via Supabase MCP — `push-notify` version **18 ACTIVE**.

### FT-16 client-side web push wiring
- `src/App.jsx` `sendPushNotification(type, title, body, body_text, target_user_ids, opts)` signature extended with optional `opts` arg. Backward-compatible — if `body_text` is an object with `skip_in_app`, treated as opts. Payload now passes `skip_in_app: true` through to the Edge Function when set.
- `src/components/ScheduleView.jsx` — re-added 3 web-push calls (S074 had dropped them to fix dupes):
  - `createOpenMatch`: `"New open match"` fan-out to all league members except organizer
  - `joinOpenMatch` on lock: `"Match locked in!"` to all 4 participants (resolved from `data.team_a` + `data.team_b` → user_ids)
  - `cancelOpenMatch`: `"Open match cancelled"` to all previously signed-up players
  - All three pass `{skip_in_app: true}` so Edge Function only does web push, doesn't dupe bell rows.

### FT-16 LogMatch pre-fill from locked open match (Issue #71 step 2/2)
- `src/components/LogMatch.jsx`:
  - New props: `prefilledOpenMatch`, `onPrefilledHandled`
  - New local state: `openMatchId` (held for insert payload)
  - New `useEffect([prefilledOpenMatch])`: when set with 2v2 `team_a_player_ids` + `team_b_player_ids`, pre-fills `tA`, `tB`, and `date` from `scheduled_at`.
  - Matches insert payload extended with `open_match_id: openMatchId || null` (existing DB trigger from S072 flips `open_matches.status='completed'` on insert).
  - After save: clears `openMatchId` + calls `onPrefilledHandled()` so a subsequent log doesn't re-attach the FK.
- `src/App.jsx`:
  - New state `prefilledOpenMatch`
  - New `handleLogOpenMatch(om)` callback → `setPrefilledOpenMatch + setTab("log")`
  - Props threaded to `<LogMatch prefilledOpenMatch onPrefilledHandled />` and `<ScheduleView onLogOpenMatch />`
- `src/components/ScheduleView.jsx`:
  - New `isParticipant` derived var on the locked-card render
  - New "Log Score" button in `.omcard-actions` — visible only when `isLocked && isParticipant && onLogOpenMatch`. Clicking calls `onLogOpenMatch(om)`.

### Login gap regression fix (user-reported during session)
- User flagged the login screen had a huge gap between PadelHub logo and the email/password form (form was at the bottom of the viewport).
- Root cause: S073's `.lhero` had `flex: 1` left over from splash sizing. Inside `.lscreen` (`min-height: 100vh` + flex column), `flex: 1` made the hero section consume all available vertical space, pushing the form sibling to the bottom. S073's `padding-top` shrink only collapsed the top padding — not the section's overall height.
- Fix: `src/index.css` — dropped `flex: 1` from default `.lhero`; added it specifically to `.lscreen.splash .lhero` so splash usages (App.jsx loading + LeagueGate picker) still fill the screen, but form-bearing AuthGate now sits naturally below the logo with no scroll.

### Other
- `public/sw.js` v141 → **v142** to force PWA cold-load refresh.

---

## Files Modified

### Commit `9c72c17` — 6 files (+75 / -16)
- `supabase/functions/push-notify/index.ts` — `open_match` cases + `skip_in_app` param
- `src/App.jsx` — `sendPushNotification` opts + `prefilledOpenMatch` state + `handleLogOpenMatch` + JSX prop wiring
- `src/components/ScheduleView.jsx` — 3 web-push calls re-added + `isParticipant` + "Log Score" button
- `src/components/LogMatch.jsx` — `prefilledOpenMatch` + `onPrefilledHandled` props, pre-fill useEffect, `open_match_id` insert payload
- `src/index.css` — `.lhero` `flex:1` moved to `.lscreen.splash .lhero` only
- `public/sw.js` — v141 → v142

### Retrospective S074 documentation (no commit — local-only writes)
- New `sessions/2026-05-10 — Session074 — FT-16 NotificationCenter + Open-Match Deep-Link + RR Grid Icon.md`
- `sessions/INDEX.md` — S074 row + Next session pointer
- `tasks/todo.md` — S074 outcomes archived, S075 priorities set
- `tasks/lessons.md` — Lesson #103 + 2 S074 patterns

---

## Key Decisions

- **Approach for web push: `skip_in_app` flag on Edge Function, not pg_net triggers.** Considered pg_net trigger on `notifications` INSERT for fully server-side push delivery; rejected as over-engineered (requires enabling pg_net, splitting Edge Function for service-role auth, double-deploy). Client-side web push with `skip_in_app: true` is one additive flag, backward compatible, no new infrastructure.
- **Pre-fill teams but don't lock the picker (yet).** Plan called for disabling the team picker when prefilled; MVP keeps it editable — user has final say. Polish item deferred. Reasoning: locking introduces a new UX state with its own bugs (e.g. badge styling, undo-button); a one-line MVP that pre-fills is shippable and useful immediately.
- **Single S075 commit covering FT-16 + login gap fix.** Bundled because login gap was a user-reported regression flagged mid-session that needed to ship in the same PWA cold-load (SW v142). Not architecturally coupled; just shipping-window-coupled.
- **Retrospective S074 reconstruction first, then S075 ship.** Two competing options at cold start: (a) close S074 retrospectively then start S075, or (b) treat all this PC's work as one big S074-S075 session. Chose (a) because the S074 commits had different scope (NotificationCenter + RR icon) than S075 (push-notify + LogMatch pre-fill + login gap). Two distinct sessions, two distinct logs.

---

## Lessons Learned

### Validated Patterns

- [2026-05-11] **Additive `skip_in_app` flag pattern for migration from client-side push to RPC-inserted bell rows.** When a feature transitions from "client calls Edge Function which does both bell + web push" to "RPC inserts bell, client only triggers web push", the cleanest backward-compatible migration is a `skip_in_app` boolean param on the Edge Function defaulting to false. Existing types untouched (default behavior unchanged); new RPC-backed types pass `skip_in_app: true`. No need to split the Edge Function or invent a new endpoint. **Why:** Avoided ~80 lines of pg_net trigger + service-role-callable endpoint that would have been needed for a fully-server-side push path. One additive flag, one Edge Function deploy, ~5 lines of code change. (S075 — `b688201` previous session shipped RPC-inserted bell rows but dropped web push; S075 `9c72c17` added the flag + 3 push calls back in 1 commit.)

- [2026-05-11] **CRLF line endings in /tmp/Padel-Battle break naive multi-line `.replace()` calls.** Repo has CRLF line endings (Windows checkout). Node `fs.readFileSync(..., 'utf8')` returns the raw bytes including `\r\n`, so JavaScript template literals containing `\n` between lines don't match. Pattern: when a multi-line `.replace()` "NOT FOUND"s and the lines visually look right, escape with `\r\n` explicitly in the JS string. `cat -A` shows `$` for line ends which masks `\r` — use `xxd` or `JSON.stringify` to verify. **Why:** Cost 3 retries on the Edge Function edit script. Recovery is trivial once recognized but the symptom is misleading. (S075 — `cat -A` showed `$` line ends suggesting LF; actual was CRLF, only `node + JSON.stringify` revealed the `\r\n`.)

---

## Next Actions
- [ ] **iPhone smoke test of S075 ship (SW v142)** — login no-scroll, open-match create/claim/lock/cancel + push delivery + deep-link flash + Log Score pre-fill end-to-end.
- [ ] **Close GitHub Issue #71** after smoke test confirms FT-16 end-to-end.
- [ ] **Polish:** disable team picker in LogMatch when `prefilledOpenMatch` is set (read-only badge).
- [ ] **FT-15 main features (Issue #25)** — Pairs Roster admin UI + LogMatch pair-aware picker + `PairsRanking.jsx` (~250 lines, Premier-Padel 7-col spec).
- [ ] **PNG icon regen** (#90 follow-up) — 192×192 + 512×512 + `/og-image.png`.
- [ ] **Color sweep Note A from S069** — awaiting user A1/A2/A3 decision.
- [ ] **Game Mode Phase 10 PR-D / PR-E** — SE/DE/RR active views + BracketSVG tokens.

---

## Commits & Deploy
- **Commit `9c72c17`** — S075 FT-16 closeout + login gap fix (SW v142)
- **Edge Function:** `push-notify` version 18 ACTIVE
- **Vercel deploy:** `dpl_2MUTDLtTriuAVnfWNJEJ1weQjV14` — state **READY**, target production
- **Live:** padel-battle.vercel.app on SW v142

---
_Session logged: 2026-05-11 | Logged by: Claude | Session075_
