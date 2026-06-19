# Session Log — S011 — 2026-03-28 — BF-24 BF-23 BF-16 Fixes + Multi-PC Sync

**Project:** PadelHub
**Phase:** Post-Phase 7 — Bug Fixes + Infrastructure
**Model:** Claude Opus 4.6 (1M) + Claude Sonnet 4.6
**PCs Used:** Home PC

---

## What Was Done

### BF-16 (Updated): OG Image / Link Preview Fix (deployed)
- `og:image` was pointing to `padelhub-logo-white.png` — a file that didn't exist on the server
- Changed to `icon-512.png` (correct padel racket + hub network logo, already deployed)
- Added `og:image:width/height` (512x512) for platform compatibility
- Added `twitter:image` tag to match
- Commit: `6cae8a0`

### BF-24: Tournament Create Button Blocker — CRITICAL (deployed)
- **Root cause:** DB schema never updated to match V2 code from S010
  - Code sent `players:` but DB column was `player_ids` (NOT NULL) → every insert failed silently
  - Code sent `schedule:` but DB column was `rounds` → unknown column, ignored
  - `mode` CHECK constraint only allowed `americano`/`mexicano` → blocked SE/DE/RR
- **Fix:** Applied Supabase migration: renamed `player_ids→players`, `rounds→schedule`, expanded mode CHECK to all 5 types
- No code changes needed — DB now matches code

### BF-23: Player Deduplication in Tournament Setup (deployed)
- SE/DE/RR team selectors now use `allSel/p1O/p2O` filter pattern
- Same player can no longer appear in multiple team slots
- Applied to all three setup screens
- Commit: `6a34c50`

### Multi-PC Sync Failure — Root Cause Analysis + Fix
- **Problem:** Home PC's local `padelhub/` folder was stale (pre-S009). Work PC sessions (S009, S010) pushed to GitHub but local files here were never updated.
- **Impact:** No actual deployment issue (Vercel serves from git), but local files were out of sync causing confusion.
- **Fix:** Synced ALL files from git repo → local `padelhub/` (App.jsx, ScheduleView.jsx, MatchHistory.jsx, index.html, etc.)
- **Prevention rule added:** MANDATORY `diff -rq` check at every cold start on a different PC

### Service Worker Cache Bust (deployed)
- Bumped `CACHE_NAME` from `padelhub-v3` → `padelhub-v4` in `sw.js`
- Forces all PWA installs to re-fetch fresh assets
- Commit: `afe84b9`

### Stale Challenge Record Cleanup
- Deleted backdated challenge `baf6e381` (date: 2026-03-17, status: played, no match_id)
- Created during testing before date validation was added — stale test data

---

## GitHub Commits

| SHA | Message |
|-----|---------|
| `6cae8a0` | Fix BF-16: OG image now points to correct racket logo |
| `6a34c50` | Fix BF-24 + BF-23: Tournament create blocker + player deduplication |
| `afe84b9` | Bump service worker cache to v4 — force refresh after S009/S010 changes |

## DB Changes

| Change | Details |
|--------|---------|
| Rename column | `tournaments.player_ids` → `tournaments.players` |
| Rename column | `tournaments.rounds` → `tournaments.schedule` |
| Drop + recreate constraint | `tournaments_mode_check` now allows: americano, mexicano, single_elimination, double_elimination, round_robin |
| Delete stale record | `challenges.baf6e381` (backdated test data) |

---

## Key Decisions

1. **DB migration over code change** — renamed DB columns to match V2 code rather than changing code to match old column names. No existing tournament data to lose.
2. **Service worker cache bump** — proactive fix for PWA users who might have stale cached bundles.
3. **Full local sync** — copied ALL source files from git repo to local `padelhub/` to eliminate desync.

## Lessons Learned (added to lessons.md)

1. **Always verify DB schema matches code column names before deploying.** Mode CHECK constraints are easy to forget when adding new modes.
2. **MANDATORY at cold start on different PC:** `diff -rq` between git repo and local folder. Sync if different.
3. **Bump sw.js CACHE_NAME on every major deploy.** Forces PWA to re-fetch assets.

## Files Modified (local sync)
- `src/App.jsx` — synced from git (was missing `seasonId` prop to ScheduleView)
- `src/components/ScheduleView.jsx` — synced from git (was missing all S009 features)
- `src/components/MatchHistory.jsx` — synced from git (was missing delete loading state)
- `src/components/GameMode.jsx` — updated with BF-23 dedup fix
- `src/App.css`, `src/index.css`, `src/main.jsx`, `src/supabase.js` — synced from git
- `index.html` — updated with OG image fix
- `public/sw.js` — cache version bumped v3→v4

---

## Next Session
- Test all tournament modes end-to-end (create → play → complete)
- Test scheduling flow (create challenge → join → confirm → log match → view in past)
- Any new bugs from user testing
