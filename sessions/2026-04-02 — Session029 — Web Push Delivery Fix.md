# Session Log — 2026-04-02 — Session029 — Web Push Delivery Fix

**Project:** PadelHub
**Phase:** Post-P7 — Web Push Delivery Fix
**Commits:** efe69d1, cc63449, 3286ec0, 574d9a0

---

## What Was Done

### 1. Web Push Encryption (RFC 8291 + VAPID ES256)
- Push notifications were only appearing in-app (bell icon) — never reached phone home screen
- Root cause: Edge Function `push-notify` sent unencrypted plain text. `encryptPayload()` was a no-op (raw TextEncoder). VAPID JWT was unsigned (just base64 header.payload, no ES256 signature).
- Implemented proper VAPID JWT signing via Web Crypto (ECDSA P-256, ES256)
- Implemented RFC 8291 payload encryption: ephemeral ECDH key exchange, HKDF key derivation, AES-128-GCM encryption, aes128gcm binary content encoding
- Proper push headers: `Authorization: vapid t=<signed_jwt>, k=<publicKey>`, `Content-Encoding: aes128gcm`, `Content-Type: application/octet-stream`
- All crypto uses Deno Web Crypto API (SubtleCrypto) — no npm modules

### 2. RLS Permission Fix
- First deploy returned 500: "permission denied for table push_subscriptions"
- Known issue from S020 lesson: service_role key doesn't reliably bypass RLS in Edge Functions
- Switched from direct table queries to existing SECURITY DEFINER RPCs: `get_league_push_subs`, `delete_stale_push_endpoints`
- Removed `supabaseAdmin` client entirely — all DB access via `supabaseUser` + RPCs

### 3. Targeted Notifications
- Challenge notifications (invite, accept, decline, confirm, cancel) now only go to the 4 match players — not the entire league
- Match result notifications go to ALL league members
- Frontend passes `target_user_ids` (array of user IDs) to Edge Function
- Edge Function validates `target_user_ids` against actual league membership (H-1 fix)
- Added `getPlayerUserIds()` helper in ScheduleView to map player IDs to user IDs
- Added "Player Accepted" notification (when someone accepts but not all confirmed yet)

### 4. In-App Notifications (Bell Icon)
- Edge Function now inserts into `notifications` table via `insert_notifications` RPC
- For targeted notifications: only match players get in-app entries
- For league-wide (match results): all members get entries
- Fixed NotificationCenter TYPE_ICONS key: "challenges" to "challenge" (matches stored type)

### 5. Deep Linking
- Push notification click now navigates to correct tab:
  - Challenge notifications -> `/#schedule` (Schedule tab)
  - Match result notifications -> `/#history` (Match History tab)
  - Others -> `/` (home/Leaderboard)
- App.jsx parses URL hash on load to set initial tab
- sw.js `notificationclick` now calls `client.navigate(url)` when app is already open (was just `client.focus()`)
- Added `notif_challenges` type filter (was missing from Edge Function)

### 6. Security Hardening (from adversarial review)
- C-3: Edge Function verifies caller is a member of the league before sending notifications (prevents cross-league injection)
- H-1: `target_user_ids` validated against actual league member IDs
- Membership check uses existing `get_league_member_ids` RPC

---

## Files Modified

### Commit 1 (efe69d1) — Web Push crypto
- `supabase/functions/push-notify/index.ts` — Complete rewrite: VAPID ES256 signing, RFC 8291 encryption, proper push headers
- `public/sw.js` — Cache v23 to v24

### Commit 2 (cc63449) — RLS fix
- `supabase/functions/push-notify/index.ts` — Switch to SECURITY DEFINER RPCs, remove direct table queries

### Commit 3 (3286ec0) — Targeted notifications + deep link + in-app
- `src/App.jsx` — Hash-based tab routing, `sendPushNotification` accepts `target_user_ids`
- `src/components/ScheduleView.jsx` — All push calls pass `target_user_ids`, added accept notification, type "challenges" to "challenge"
- `supabase/functions/push-notify/index.ts` — `target_user_ids` filtering, in-app notification insert, deep link URLs
- `public/sw.js` — Cache v24 to v25

### Commit 4 (574d9a0) — Security + UX
- `supabase/functions/push-notify/index.ts` — League membership check (C-3), validate target_user_ids (H-1), match to /#history deep link
- `src/App.jsx` — Hash routing for #history
- `src/components/ScheduleView.jsx` — Match result to all league members (no target_user_ids)
- `src/components/NotificationCenter.jsx` — TYPE_ICONS key fix
- `public/sw.js` — `client.navigate()` on notificationclick, cache v25 to v26

### SQL (none this session — all existing RPCs reused)

### Edge Function (deployed 4 times to Supabase)
- `push-notify` — final version includes crypto, RPCs, targeting, security checks

---

## Key Decisions
- **Deno Web Crypto for all encryption** — no npm modules, everything via SubtleCrypto (ECDH, HKDF, AES-GCM, ECDSA)
- **SECURITY DEFINER RPCs for all DB access** — learned from S020 lesson, service_role key unreliable in Edge Functions
- **Hash-based deep linking** (`/#schedule`, `/#history`) — simplest approach that works with the existing pushState tab system
- **Match results -> whole league, challenges -> match players only** — user explicitly requested this distinction
- **Adversarial review before deploy** — caught 3 critical, 4 high issues. Fixed all critical + 1 high in same session.

---

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-04-02 | First push-notify deploy returned 500 "permission denied for table push_subscriptions" | Reused direct table queries with service_role key instead of S020's SECURITY DEFINER RPCs. Same lesson as S020 but not applied to the rewritten code. | **When rewriting Edge Functions, always check lessons.md for the table access pattern.** Direct table queries with service_role key DO NOT work in Supabase Edge Functions — always use SECURITY DEFINER RPCs. This is now the THIRD time this pattern has been rediscovered (S020, S022, S029). |
| 2026-04-02 | NotificationCenter showed fallback bell icon for challenge notifications | Frontend sends type "challenge" (singular) but TYPE_ICONS used "challenges" (plural). Mismatch between stored DB type and UI lookup key. | **After adding new notification types, verify the stored type string matches the TYPE_ICONS key in NotificationCenter.jsx.** |
| 2026-04-02 | Notification click when app already open just focused window without navigating | sw.js notificationclick found existing client and called focus() but never navigate(). The URL from notification data was only used in openWindow() fallback. | **When implementing push notification deep links, test BOTH scenarios: (1) app closed -> openWindow, (2) app already open -> navigate + focus.** |

### Validated Patterns
- [2026-04-02] RFC 8291 with Deno Web Crypto — all primitives available (ECDH P-256, HKDF SHA-256, AES-128-GCM, ECDSA P-256). No npm modules needed. HKDF does extract+expand in a single `deriveBits` call.
- [2026-04-02] Hash-based deep linking (`/#tab`) for PWA push notifications — simple, works with pushState history, no server-side routing needed. Parse `window.location.hash` in useState initializer.
- [2026-04-02] Adversarial review caught 3 critical issues (type mismatch, missing navigation, no auth check) that testing alone wouldn't have found. Always run before marking a feature complete.
- [2026-04-02] `target_user_ids` pattern for scoped notifications — send user ID array from frontend, validate against league members server-side. Clean separation: frontend knows WHO should be notified, server validates and delivers.

---

## Next Actions
- [ ] H-2: Restrict CORS to Vercel domain (currently wildcard `*`)
- [ ] H-5: Create `leave_challenge` RPC for atomic leave (currently client-side read-modify-write)
- [ ] L-4: Parallelize push sends with `Promise.allSettled` for better performance
- [ ] M-3: Rate limiting on push-notify Edge Function
- [ ] User to test full notification flow on phone (schedule -> accept -> confirm -> match result)

---

## Commits & Deploy
- **Commit 1:** `efe69d1` — [Session029] Fix Web Push delivery — proper RFC 8291 encryption + VAPID ES256 signing
- **Commit 2:** `cc63449` — [Session029] Fix push-notify RLS error — use SECURITY DEFINER RPCs
- **Commit 3:** `3286ec0` — [Session029] Targeted notifications + deep link + in-app notifications
- **Commit 4:** `574d9a0` — [Session029] Security hardening + notification UX improvements
- **Edge Function:** push-notify deployed 4 times (final includes all fixes)
- **Live:** https://padel-battle.vercel.app (Vercel auto-deploy)
- **SW:** v26 (was v23)

---
_Session logged: 2026-04-02 | Logged by: Claude | Session029_
