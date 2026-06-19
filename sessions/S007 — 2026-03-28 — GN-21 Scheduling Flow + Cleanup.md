# Session Log — S007 — 2026-03-28 — GN-21 Scheduling Flow + Cleanup

**Project:** PadelHub
**Phase:** Phase 7 Stage 7 — GN-21 + Notification Cleanup
**Model:** Claude Opus 4.6 (1M context)

---

## What Was Done

### GN-21: Full Scheduling Flow
- Push notification sent when challenge is created (all league members notified)
- Push notification sent when match becomes confirmed (all 4 players joined)
- Leave button for players who joined an open match but want to withdraw
- Mark as Played button on confirmed matches
- Upcoming/Past tab toggle with match counts
- Past tab shows played matches (with badge) and cancelled matches (dimmed)

### Notification Cleanup
- "Ranking Changes" renamed to "Rank Change"
- "Rank Change" and "New Members" toggles hidden from Settings (need backend triggers)
- Settings now shows only: Push Notifications (master), New Match Logged, Match Challenges
- PWA notch fix: header + sidebar use safe-area-inset-top

### Workspace Reorganization
- `projects/padel-battle/` flattened to `padelhub/` (saved 2 levels)
- Dead folders deleted (empty bugs/, stale deploy/builds/, unused src/assets/)
- Bug docs split from planning into `padelhub/bugs/`
- Templates + cowork doc archived
- `assets/` renamed to `mockups/`
- All path references updated (CLAUDE.md, launch.json, memory)
- Sessions renamed to S### convention (S001-S007)

---

## GitHub Commits

| SHA | Message |
|-----|---------|
| `7427a28` | GN-21: Full scheduling flow + notification wiring |
| `454c0e8` | Hide Rank Change and New Members notification toggles |

---

## Next Actions
- GN-20 (Playtomic level) moved to Phase 8+ future updates
- All Phase 7 features complete
- Future: in-app notification center, Rank Change trigger, New Members trigger
