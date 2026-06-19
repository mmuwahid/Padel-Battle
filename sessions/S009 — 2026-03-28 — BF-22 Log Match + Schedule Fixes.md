---
date: 2026-03-28
title: BF-22 Log Match + Schedule Fixes
type: Build
business_units: [Muwahid Dev]
projects: [PadelHub]
duration: Deep
momentum: 🟡 Progressing
tags: [scheduling, supabase-rls, bf-22, gn-21, schedule-view, log-match]
---

# Session Log — BF-22 Log Match + Schedule Fixes — 2026-03-28

## 🧭 Session Snapshot
Synced with home PC changes (FT-01 push notifications, FT-02 App.jsx refactor, BF-16 to BF-21 bug fixes, footer alignment — all done on home PC). Then fixed BF-22 (Schedule "Mark as Played" fails) by redesigning it as an inline "Log Match" flow with score entry. Fixed Supabase RLS policies on challenges table, added schema columns (match_id, responses, duration), and removed cancelled matches from the Past tab. Had a build failure due to bash eating JSX template literals — resolved by restoring the working ScheduleView base and applying clean patches.

## ✅ Key Decisions Made
- ⚡ **BF-22 redesign:** "Mark as Played" replaced with "Log Match" — opens inline score form with pre-filled players from the scheduled match, saves both match record AND updates challenge status in one flow
- ⚡ **Cancelled matches hidden:** Cancelled scheduled matches no longer show in Past tab — they disappear entirely to avoid clutter
- **GN-21 full accept/decline flow deferred:** Requires push notification integration (FT-01) to be fully wired — noted for future session
- **RLS policy broadened:** Any league member can now update challenges (was creator/admin only — blocked join/leave/markPlayed)

## 💡 Ideas & Opportunities
- 💡 GN-21 full flow (accept/decline per player, auto-expiry, pending cards) should be built when push notifications are fully tested end-to-end
- ✅ Inline score entry pattern (used in BF-22) could be reused for quick-edit on match history cards

## ❓ Open Questions
- 🟡 First-save error on schedule: Mohammed reported error on first attempt but success on retry — likely service worker serving stale JS after broken deploy. Monitor if it recurs. — Owner: [C] next session
- 🟢 GN-21 accept/decline: When to implement the full per-player response flow? — Owner: [M] prioritization

## 🎯 Next Actions
- [ ] ⭐ Test BF-22 end-to-end: schedule match → confirm → Log Match → enter scores → verify in Past tab and Match History — [M]
- [ ] ⭐ Monitor first-save error — if it recurs, check browser console for exact Supabase error — [M]
- [ ] Tournament Mode V2 implementation (from approved mockup in S008) — [C] next session
- [ ] GN-21 full accept/decline flow when push notifications are production-ready — [C] future

## 📁 Files Created / Modified
- `src/components/ScheduleView.jsx` — Component — BF-22 Log Match flow + cancelled filter — git repo
- `src/App.jsx` — Component — challenges query includes 'played', seasonId prop to ScheduleView — git repo
- Supabase `challenges` table — Schema — Added match_id, responses, duration columns; status constraint updated; RLS broadened

## 🧠 Context Captured
- Project was restructured on home PC: `projects/padel-battle/` → `padelhub/` folder, App.jsx split into 19 files (1,572 lines down from 3,539)
- FT-01 (push notifications) and FT-02 (code split) were completed on home PC session — confirmed via git log
- BF-16 to BF-21 (6 supplementary bugs) also done on home PC
- Bash heredoc/template literal issue: bash eats `${variable}` inside heredoc even with single quotes when nested in node -e. Use node file read/write or line-specific sed instead.
- The git repo at `/tmp/Padel-Battle` is the canonical source — local OneDrive copy may lag behind

## 🔁 Recurring Themes
- **Bash template literal corruption:** Third time this session pattern has caused issues. Template literals in JSX (`${A}40`) get eaten by bash when using heredoc or node -e with backticks. Prevention: always use node file I/O for JSX edits, never heredoc.
- **Build validation gap:** esbuild passes but Vite/OXC (stricter parser) fails. Should always validate with `npx esbuild` from the project dir, not just syntax check.

## 🔄 Session Continued — Additional Fixes
- Past tab now shows full match scores (sets with green/red, WIN/LOSS, MVP) — matching History tab layout
- Match delete fixed — root cause was FK constraint on challenges.match_id blocking delete (ON DELETE RESTRICT). Fixed to ON DELETE SET NULL
- Delete button now shows ".." loading state during processing
- Past dates blocked in schedule form (min={today} + code validation)
- Cancelled matches removed from Past tab
- New Supabase function: is_league_admin_or_owner() SECURITY DEFINER helper
- Commits: 28b9e2a, 82e72c0, fbf1c15 + DB schema fixes

---
_Session logged: 2026-03-28T17:00:00 | Logged by: Claude (session-log skill) | Session S009_
