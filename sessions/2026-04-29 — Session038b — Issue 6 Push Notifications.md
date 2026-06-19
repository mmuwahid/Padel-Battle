# Session Log — 2026-04-29 — Session038b — Issue #6 Push Notifications

**Project:** PadelHub
**Phase:** Post-P7 (production bug fix)
**Duration:** ~45 minutes
**Commits:** 8da3f35, 48241ba (cleanup)
**Edge Function:** push-notify v17 deployed

---

## What Was Done

Followed the systematic-debugging skill rigorously: Phase 1 (gather evidence) → Phase 2 (pattern analysis) → Phase 3 (hypothesis + plan) → Phase 4 (implement) — no fixes proposed before evidence was in.

### Phase 1 — Evidence

Queried Supabase live state directly:
- 5 push_subscriptions in DB, all from `web.push.apple.com` (iOS PWA installs)
- One user had **4 dead endpoint rows** accumulated since 2026-03-27 — strong signal that stale-endpoint cleanup was broken
- 55 "match" + 55 "ranking" + 26 "members" notifications in 14 days, paired 1:1 in time → confirmed Edge Function ran and inserted in-app notifications, but produced 2 per match for every member

Read the entire pipeline: client subscribe (App.jsx), Edge Function (push-notify), service worker (sw.js), notification consumers (NotificationCenter, LogMatch, ScheduleView).

### Phase 2 — Bugs Identified

| Bug | Severity | Impact |
|---|---|---|
| **A** Edge Function notifications insert ignored `notif_*` user preferences | High | Bell badge spammed users who disabled types |
| **B** `delete_stale_push_endpoints` RPC was getting `JSON.stringify(staleEndpoints)` instead of a Postgres array. Silent failure on every push since at least S029. | High | Stale endpoints accumulated forever; visible in DB |
| **C** `sendPushNotification` swallowed Edge Function response — client had no way to know if delivery succeeded | Medium | No diagnostics |
| **D** No way to test push from inside the app on the device | Medium | Couldn't verify pipeline without code change |
| **E** When user re-subscribed (permission re-grant, reinstall), no cleanup of previous endpoint rows | Medium | Endpoint accumulation per user |
| **F** LogMatch fired TWO push notifications per match (`match` + `ranking`) within ms of each other. Different tags → both display | Medium | iPhone gets 2 notifications per match; bell badge doubles |

VAPID JWT signing, RFC 8291 encryption, manifest config, and sw.js push handler were all structurally correct — no changes needed there.

### Phase 3 — Plan

Proposed bundle A–F with three scope options. User chose **all six**.

### Phase 4 — Implementation

**A.** Edge Function: in-app notifications insert now derives recipient list from `filtered` (which has type-pref applied) ∪ users with no subscription row at all. Subscribed-but-pref-disabled users no longer receive bell entries.

**B.** Edge Function: `delete_stale_push_endpoints` now receives the array directly: `.rpc(name, { p_endpoints: staleEndpoints })`. PostgREST converts JS arrays to Postgres arrays. Wrapped in try/catch + error check.

**C.** App.jsx `sendPushNotification`: logs `[push-notify] type → {sent, failed, cleaned, total}` to console. Returns the result instead of swallowing.

**D.** App.jsx `testPushNotification` helper + Settings "🔔 Send Test Notification" button. Self-targeted push (no `exclude_user_id`), reports the response in a toast.

**E.** App.jsx `subscribeToPush`: deletes other endpoints for `(user_id, league_id)` before upserting the new one. Single-device assumption.

**F.** LogMatch: combined the two notifications into one with winner + loser teams + set summary, e.g. "Basel & Chaos beat Moody & MAK (6-4, 6-3) — leaderboard updated". Dropped the redundant ranking trigger.

### Verification on iPhone

User toggled push off → on (triggered Fix E cleanup), tapped Send Test Notification → notification appeared on iPhone home screen AND in-app bell dropdown. End-to-end pipeline verified.

## Files Modified

### Commit 8da3f35 — 6 files (+118 / -14)
- `src/App.jsx` — `subscribeToPush` cleanup, `sendPushNotification` logging, `testPushNotification` helper, prop pass-through
- `src/components/SettingsView.jsx` — Test Push button (visible when push enabled)
- `src/components/LogMatch.jsx` — combined match push with winner+score
- `public/sw.js` — cache v36 → v37
- `supabase/functions/push-notify/index.ts` — preference-filtered in-app insert, array param for cleanup RPC

### Edge Function deploy
- v17 deployed via Supabase MCP

### OneDrive sync
- Mirrored all 5 changed files from `/tmp/Padel-Battle` to `padelhub/`.

## Key Decisions
- **Systematic-debugging skill enforced no-fixes-before-evidence.** Saved at least one "guess fix" cycle. Found 6 distinct bugs in code review that wouldn't have surfaced from "just try this" iterations.
- **Test Push button instead of remote diagnostics.** A user-facing button that surfaces the Edge Function response directly is more reliable than parsing logs after-the-fact, and gives ongoing self-diagnosis capability.
- **Single-device assumption (Fix E).** Most users have one phone. Accepting this simplifies cleanup. Multi-device users can be addressed later with a unique device fingerprint if it ever matters.
- **Defaulted in-app delivery to ALLOW for users with no subscription row.** They haven't explicitly opted out — if they later subscribe and disable a type, they'll be filtered correctly. This avoids missing notifications for the un-subscribed.

## Lessons Learned
- New entry: `text[]` ≠ JSONB for RPC params. Pass arrays raw, not JSON.stringify'd. Always check `.error` on RPC calls.
- New entry: When two notification channels share an intent (push + bell), they MUST share the recipient filter. Fanning out from one filtered list prevents drift.
- Confirmed pattern: systematic-debugging is faster than guess-and-check even for "obvious" bugs.

## Next Session Pointer
- **S039:** FT-07 Player Deletion Redesign (plan still approved from S035). Or new user-reported issues if any surface from production.
