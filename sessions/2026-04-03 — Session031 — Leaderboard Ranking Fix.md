# Session Log — 2026-04-03 — Session031 — Leaderboard Ranking Fix

**Project:** PadelHub
**Phase:** Post-P7
**Duration:** ~20 minutes
**Commits:** b6367a5

---

## What Was Done

### BF-38: Leaderboard Ranking Logic Rewrite
- **Problem:** Leaderboard sorted by total wins count first, not win rate. A player with 0W/2L ranked #3 on the podium above players with 0W/1L but higher ELO (1482, 1480 vs 1462). Fundamentally wrong — games played was prioritized over performance.
- **Root cause:** Sort at App.jsx line 596 was `b.wins - a.wins` as primary sort, then `b.winRate - a.winRate`, then alphabetical. ELO was never used as a tiebreaker.
- **Fix:** Rewrote sort to: Win Rate (desc) > ELO (desc) > Games Played (desc) > Name (alpha)
- **Structural change:** Moved `elo` useMemo computation ABOVE the `lb` useMemo so ELO values are available in the sort. Added `elo` to `lb` dependency array.
- **UI addition:** "Ranked by Win Rate" label in top-right corner of leaderboard header (10px, 70% opacity)
- **Verified:** Dev server preview confirmed correct order: Husain #1 (100% WR, 1538), Moody #2 (100%, 1538), Hani Taha #3 (0%, 1482), Jawad #4 (0%, 1480), Basel #5 (0%, 1462). Zero console errors.
- SW cache bumped v28 → v29

---

## Files Modified

### Commit b6367a5 — 2 files
- `src/App.jsx` — Rewrote leaderboard sort (WR > ELO > Games > Name), moved elo useMemo before lb useMemo, added "Ranked by Win Rate" label
- `public/sw.js` — Cache bump v28 → v29

## Key Decisions
- **Win Rate as primary sort** — user explicitly requested this. Makes intuitive sense: a player who wins 100% of games should always rank above a player at 0%, regardless of games played.
- **ELO as first tiebreaker** — among players with same win rate, ELO accounts for opponent strength. Hani (1482) lost to a stronger team than Jawad (1480), so she loses fewer ELO points — correct math.
- **Games played as second tiebreaker** — among same WR and ELO, more games = more proven.
- **No toggle needed** — user's design is clear: Win Rate is the ranking metric, period. No ELO/WR toggle complexity.

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-04-03 | Leaderboard ranked by total wins since initial implementation — wrong player on podium for months | Original sort logic `b.wins - a.wins` was never questioned. With few players and limited data, the bug was invisible until more games were played. | **Leaderboard sort must prioritize rate-based metrics (win rate) over absolute counts (total wins).** Total wins favors players who play more, not players who play better. |

### Validated Patterns
- Moving `elo` useMemo before `lb` useMemo and adding it to deps — clean way to use derived state in another derived computation without violating hooks rules. Order of useMemo declarations matters.

## Next Actions
- [ ] Any user-reported issues from production testing
- [ ] Monitor leaderboard correctness as more matches are played

---

## Commits & Deploy
- **Commit:** `b6367a5` — BF-38: Fix leaderboard ranking — sort by Win Rate > ELO > Games Played
- **Live:** https://padel-battle.vercel.app (auto-deploy from main)

---
_Session logged: 2026-04-03 | Logged by: Claude | Session031_
