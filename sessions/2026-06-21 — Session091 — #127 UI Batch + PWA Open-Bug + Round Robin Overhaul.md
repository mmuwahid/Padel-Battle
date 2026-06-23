# Session 091 — #127 UI Batch + PWA Open-Bug Fix + Round Robin Overhaul

**Date:** 2026-06-21
**Project:** PadelHub
**Production:** live on **SW v213**, main `f5c6a78`
**Working clone:** `C:\Users\User\dev\Padel-Battle`

---

## Summary

Worked the large **Issue #127** "General comments" feedback batch (filed between S090 and this session) plus a critical **PWA cold-open bug**, across **10 commits** (`0d54f6b` → `f5c6a78`), **SW v205 → v213**, **1 DB migration** (`s091_open_match_notify_season_roster`). All items smoke-tested and passing per user.

### Commits / deploys
1. `0d54f6b` (v206) — #127 batch 1: weekday dates, schedule cleanup (dup cancel, stepper, tick, alignment), team-lock Accept&Use compact + VS centering, Matches/Log Match headers, Players restructure, season-pill right-align, open-match notifications scoped to season roster (DB migration + client push).
2. `ff26023` (v207) — **PWA cold-open fix (2 causes):** (a) AuthGate raced `getSession()` vs a 5s timeout → login flashed before session restored; now uses `onAuthStateChange` `INITIAL_SESSION` as authoritative + 8s fallback. (b) `sw.js skipWaiting()` + `index.html SW_UPDATED→reload` force-reloaded on first open after each deploy; removed both — updates now apply on next full open, no reload (user-approved).
3. `195795e` (v208) — Round Robin overhaul: auto-end bug fixed (results gate on `status==='complete'`, not score-key existence), removed redundant Format block, round cards → Americano `gm-*` format (avatars/win-highlight/steppers), standings MP/MW/ML/T/PTS/GD, emojis → icons/dots. UI: schedule omcard/sched-empty 18px gutter, profile photo-menu nowrap, season pill standardized to `.spill` + width cap, Players title above the Players/Analytics toggle, match-history weekday stacked above date.
4. `84431a7` (v209) — weekday badge beside the Log Match native date picker.
5. `a9d33da` (v210) — RR MW green-only-if>0 / ML red-only-if>0 (grey at 0) + colored headers; 1st-place 🥇 (was trophy); weekday badges match date color (muted).
6. `fa2b7f0` (v211) — casual Game Mode 2-step setup (pick format → follow-up player screen); Best/Worst Pairs titles centered + W/L per-part color coding.
7. `b926fe2` (v212) — edit-match Cancel moved beside Update Match (top one overflowed), tick removed; casual Format Rules de-duplicated (only on picker).
8. `f5c6a78` (v213) — hide Game Mode header + Casual/Competitive pill on the casual setup step (clean full-screen setup).

### Key decisions
- **Open-match notifications** scoped to the active-season roster (not whole league); claiming a spot remains league-wide (only notifications scoped). DB falls back to all members when `p_season_id` is NULL.
- **SW update model** changed to "apply on next reopen, no forced reload" (user chose smooth over instant). New worker waits; transition deploy reloads no one.
- RR/Americano/Mexicano now share the `status`-gated results pattern.

### Issues closed
- #127, #122, #111, #110, #109 (smoke-tested pass). #112/#118/#120 were already closed.

### Still open / next
- **#124** Face ID — deferred to Capacitor wrap.
- **#121** Login page / Sign in with Apple — button shipped but **inert until the Apple provider is enabled in Supabase** (Auth → Providers → Apple); user doing the Apple Dev multi-step after the wrap.
- **NEW tickets filed 2026-06-21 (not yet addressed):** #128 Match history screen, #129 League & season management settings, #130 Header & nav bar footer, #131 Avatar photos load time.
- Capacitor wrap (planning/capacitor-wrap.md).

### Notes
- Dev preview (vite) HMR got stuck on a stale module mid-edit once; production build was always clean; restarting the preview server cleared it. The auth fix can't be preview-verified (only repros on real cold PWA start) — logic + fallback are the safety net; needs device confirmation.
