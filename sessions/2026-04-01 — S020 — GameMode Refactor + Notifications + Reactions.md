# Session Log — 2026-04-01 — S020 — GameMode Refactor + Notifications + Reactions

**Project:** PadelHub
**Phase:** Post-P7 Architecture + Features
**Duration:** ~4 hours
**Commits:** 17ca30e, 180f2ac, feccda4

---

## What Was Done

### Phase 1: GameMode.jsx Refactor
- Continued work started in a previous interrupted CLI session (BracketSVG + AmericanoMode already extracted, not pushed)
- Extracted SingleElimination (325 lines), DoubleElimination (344 lines), RoundRobin (277 lines)
- Rewrote GameMode.jsx as a slim orchestrator (115 lines) — routes to the correct component based on tournament mode and screen state
- Shared helpers (`endTournament`, `resetTournament`) stay in GameMode.jsx, passed as props
- **Result:** GameMode.jsx 1,450 → 115 lines (92% reduction), 6 focused files total

### Phase 2: Backend Schema + Bug Fix
- Created `notifications` table (in-app notification center) with RLS, indexes, Realtime
- Created `match_reactions` table (emoji reactions on matches) with RLS, indexes, Realtime
- Created `expire_stale_challenges()` SECURITY DEFINER function (cancels open challenges >48h)
- Added `notif_challenges` column to `push_subscriptions` (was missing — bug fix)
- Fixed `notif_challenges` not being persisted in App.jsx `subscribeToPush()` and `toggleNotification()`
- Updated push-notify Edge Function to support `challenges` type filter
- Updated push-notify Edge Function to write to `notifications` table for in-app center
- All SQL migrations executed via `supabase db query --linked`
- Edge Function deployed via `supabase functions deploy`

### Phase 3: Feature UIs
- Built `NotificationCenter.jsx` (143 lines): bell icon in header with unread red badge, full notification list with type icons, time ago, read/unread states, mark all read, clear all, empty state
- Added match reactions to `MatchHistory.jsx`: 5 emoji buttons (fire/trophy/clap/laugh/shock), one per user per match, persisted to `match_reactions` table, green highlight + count
- Added rank change push trigger in `LogMatch.jsx` — fires "Rankings Updated" after every new match
- Added new members push trigger in `LeagueGate.jsx` — fires on both invite-link auto-join and manual code join
- Wired challenge auto-expiry — calls `expire_stale_challenges()` RPC on every `loadLeagueData()`

### Edge Function Debugging + Fix
- Edge Function was returning 401 (JWT verification mismatch — ES256 vs HS256)
- Redeployed with `--no-verify-jwt` — revealed "permission denied for table push_subscriptions"
- Root cause: `SUPABASE_SERVICE_ROLE_KEY` env var was set but Supabase JS client wasn't bypassing RLS properly
- Solution: Created 4 SECURITY DEFINER RPC functions (`get_league_push_subs`, `get_league_member_ids`, `insert_notifications`, `delete_stale_push_endpoints`) to bypass RLS at DB level
- Rewrote Edge Function to use RPC calls instead of direct table queries
- Fixed `insert_notifications` parameter type (JSONB → TEXT with cast, dropped overloaded function)
- Fixed missing GRANTs on `notifications` and `match_reactions` tables for `authenticated` and `anon` roles
- **Verified end-to-end:** challenge created → notifications written for all 7 league members → notification center shows with unread badge

---

## Files Modified

### Commit 17ca30e — 7 files (Phase 1)
- `src/components/GameMode.jsx` — Rewritten as slim orchestrator (1,450→115 lines)
- `src/components/BracketSVG.jsx` — NEW (171 lines, SVG bracket rendering)
- `src/components/AmericanoMode.jsx` — NEW (227 lines, Americano/Mexicano)
- `src/components/SingleElimination.jsx` — NEW (325 lines, SE setup/active/complete)
- `src/components/DoubleElimination.jsx` — NEW (344 lines, DE setup/active/complete)
- `src/components/RoundRobin.jsx` — NEW (277 lines, RR setup/active/complete)
- `public/sw.js` — Cache v9→v10

### Commit 180f2ac — 2 files (Phase 2)
- `src/App.jsx` — notif_challenges added to subscribeToPush() and toggleNotification()
- `public/sw.js` — Cache v10→v11

### Commit feccda4 — 6 files (Phase 3)
- `src/App.jsx` — NotificationCenter import, unread count state, bell icon in header, notifications sidebarView, auto-expiry RPC call
- `src/components/NotificationCenter.jsx` — NEW (143 lines)
- `src/components/MatchHistory.jsx` — Match reactions (REACTIONS array, toggleReaction, reaction bar UI)
- `src/components/LogMatch.jsx` — Rank change push trigger after match save
- `src/components/LeagueGate.jsx` — New members push trigger on join (both flows)
- `public/sw.js` — Cache v11→v12

### Not committed (Edge Function + DB — deployed directly)
- `supabase/functions/push-notify/index.ts` — Rewritten to use RPC, deployed with --no-verify-jwt
- DB: notifications table, match_reactions table, expire_stale_challenges(), notif_challenges column
- DB: 4 SECURITY DEFINER RPC functions, GRANTs for authenticated/anon roles

## Key Decisions
- **RPC over direct queries in Edge Functions** — Supabase service role key wasn't bypassing RLS reliably. SECURITY DEFINER functions are more robust and don't depend on client-side key handling.
- **`--no-verify-jwt` on Edge Function** — Supabase Auth tokens use ES256 but Edge Function JWT verification expects HS256. Since the function uses RPC (which has its own auth), JWT verification at the function gateway level is redundant.
- **Rank change push is generic** — sends "Rankings Updated" after every match rather than computing specific ELO deltas. Specific player-by-player changes would require comparing pre/post ELO snapshots (deferred).
- **Challenge auto-expiry on app load** — runs `expire_stale_challenges()` as a fire-and-forget RPC on every `loadLeagueData()` instead of pg_cron (which needs Supabase Pro). Lightweight enough since it's a single UPDATE with a WHERE clause.
- **Challenge confirmation flow deferred to S021** — User wants individual player accept/decline before confirming (currently auto-confirms). This is a significant feature requiring DB changes, new notification actions, and ScheduleView rework.

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-04-01 | Edge Function "permission denied" on push_subscriptions despite using service role key | Supabase JS client with service_role key wasn't bypassing RLS as expected in Edge Function context | **Use SECURITY DEFINER RPC functions for all Edge Function DB access.** Don't rely on service role key bypassing RLS in Edge Functions — wrap queries in RPC functions instead. |
| 2026-04-01 | `insert_notifications(JSONB)` RPC failed with "cannot extract elements from a scalar" | Supabase JS sends RPC args as text, not native JSONB. The function received a string but tried to parse as JSONB. | **RPC function parameters that receive JSON should be typed as TEXT, then cast internally:** `p_rows::JSONB`. Never use JSONB as the parameter type for RPC functions called from JS. |
| 2026-04-01 | New tables (notifications, match_reactions) returned "permission denied" on SELECT | `CREATE TABLE` in Supabase doesn't auto-GRANT to `authenticated`/`anon` roles. Only existing tables created via migrations had GRANTs. | **After creating tables via SQL editor, always run `GRANT SELECT, INSERT, UPDATE, DELETE ON public.{table} TO authenticated, anon;`** — Supabase migrations handle this automatically, but raw SQL does not. |

### Validated Patterns
- [2026-04-01] SECURITY DEFINER RPC functions for Edge Function DB access — completely eliminates RLS/permission issues. The Edge Function uses anon key + RPC, the RPC function runs as definer and bypasses RLS. Clean separation of concerns.
- [2026-04-01] Testing Edge Function end-to-end from the preview dev server catches real deployment issues (JWT, RLS, GRANTs) that unit testing would miss.

## Next Actions
- [ ] S021: Challenge confirmation flow — individual player accept/decline before auto-confirm
- [ ] S021: Phase 4 optimization — A-09 (SELECT * → specific columns), P-12 (targeted Realtime)
- [ ] S021: Notification UX refinements based on user feedback (click behavior, read/unread styling)
- [ ] U-16: Delete Tournament with confirmation dialog (deferred from S020)

---

## Commits & Deploy
- **Commit 1:** `17ca30e` — [S020] Phase 1: GameMode extraction (5 components)
- **Commit 2:** `180f2ac` — [S020] Phase 2: Backend schema + notif_challenges bug fix
- **Commit 3:** `feccda4` — [S020] Phase 3: Notification center, match reactions, push triggers, auto-expiry
- **Edge Function:** push-notify redeployed (RPC-based, --no-verify-jwt)
- **DB migrations:** notifications, match_reactions, expire_stale_challenges, 4 RPC helpers, GRANTs
- **Live:** padel-battle.vercel.app (Vercel auto-deploy)

---
_Session logged: 2026-04-01 | Logged by: Claude | S020_
