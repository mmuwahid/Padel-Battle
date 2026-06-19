# Session Log — S006 — 2026-03-28 — FT-01 Push Notifications

**Project:** PadelHub
**Phase:** Phase 7 Stage 6 — FT-01 Push Notifications
**Model:** Claude Opus 4.6 (1M context)

---

## What Was Done

Implemented Web Push notifications end-to-end: VAPID keys, Supabase table, service worker, frontend subscribe/unsubscribe, Edge Function, and deployment.

### Push Notification Stack
| Layer | What | Status |
|-------|------|--------|
| VAPID Keys | Generated public + private key pair | Done |
| Database | `push_subscriptions` table with RLS + indexes | Done |
| Service Worker | `push` + `notificationclick` handlers in sw.js | Done |
| Frontend | Master toggle (subscribe/unsubscribe), per-type toggles sync to Supabase | Done |
| Edge Function | `push-notify` deployed to Supabase (sends to all league subscribers) | Done |
| Match trigger | LogMatch calls Edge Function on new match save | Done |
| Challenge trigger | UI toggle exists, not yet wired to ScheduleView | Pending (GN-21) |

### Additional Fixes
- **PWA notch fix:** Header and sidebar now use `env(safe-area-inset-top)` — no longer behind camera notch in standalone PWA mode
- **Match Challenges toggle:** New notification preference in Settings (UI + localStorage, backend wiring pending GN-21)

### User Testing Results
- iOS Safari (browser): correctly shows "Push notifications not supported on this browser"
- iOS PWA (home screen): subscribe works, toggle shows "Enabled — receiving alerts"
- Push subscription saved to Supabase `push_subscriptions` table
- Notch fix confirmed working on both header and sidebar

---

## Key Decisions

1. **Push only works in PWA mode on iOS** — Safari browser doesn't support Web Push. This is an Apple limitation. The app correctly detects this and shows an appropriate message.
2. **Edge Function uses simplified push delivery** — sends payload directly to push endpoint. Full VAPID JWT signing with Web Crypto can be added later for broader browser support.
3. **Notification preferences stored in both localStorage and Supabase** — localStorage for instant UI state, Supabase for server-side filtering when sending.
4. **`push_subscriptions` table includes `league_id`** — notifications are scoped per league, so users only get alerts for their active league.
5. **Match Challenges toggle is UI-only for now** — will be wired when GN-21 (full scheduling flow) is implemented.

---

## Supabase Setup Steps (for reference)

```bash
# Install CLI
scoop install supabase

# Login + link
supabase login
supabase link --project-ref nkvqbwdsoxylkqhubhig

# Set secrets
supabase secrets set VAPID_PRIVATE_KEY=EmvB6qHh1c1_cQRrBKqfTC6U4t19VI61lOsQ6XKnPeE
supabase secrets set VAPID_PUBLIC_KEY=BBQKjl0Hnw8Xom7YLUuLHvrwQj0h_NIKngQCkHAQg9B9Uk36UifENgx9SODABpfy5TM9jHroapJC0SMx2RTc9vY
supabase secrets set VAPID_SUBJECT=mailto:m.muwahid@gmail.com

# Deploy Edge Function
cd C:\Users\User
supabase functions deploy push-notify --no-verify-jwt
```

---

## GitHub Commits

| SHA | Message |
|-----|---------|
| `615a646` | FT-01: Push notifications — frontend wiring + service worker |
| `1ca6941` | Fix PWA notch overlap + add Match Challenges notification toggle |

---

## Files Created / Modified

| File | Changes |
|------|---------|
| `src/vapidPublicKey.js` | NEW — VAPID public key for pushManager.subscribe |
| `src/App.jsx` | Push subscribe/unsubscribe, sendPushNotification helper, notch fixes, challenges toggle |
| `src/components/LogMatch.jsx` | Triggers push-notify Edge Function on new match |
| `public/sw.js` | Push + notificationclick handlers, cache bumped to v3 |
| `docs/vapid-keys-DO-NOT-COMMIT.md` | NEW — VAPID key reference (private key for Supabase secrets) |
| `supabase/functions/push-notify/index.ts` | NEW — Edge Function for sending push notifications |
| Supabase DB | `push_subscriptions` table with RLS + indexes |

---

## Next Actions

1. GN-21: Wire Match Challenges toggle to actually send push when scheduling
2. GN-20: Playtomic level self-assign in profile
3. Full regression test on push notifications with multiple users
4. BF-13, BF-15 deferred bugs
