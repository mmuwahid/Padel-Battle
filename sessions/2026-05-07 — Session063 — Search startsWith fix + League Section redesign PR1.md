# Session Log — 2026-05-07 — Session063 — Search startsWith fix + League Section redesign PR1

**Project:** PadelHub
**Phase:** Post-#46 Phase 5 (continuing the same long session day — S061 + S062 + S063 all on 2026-05-07)
**Duration:** ~1.5 hours after S062 close
**Commits:** `9c5be44` (PR #57 search fix), `6973f15` (PR #58 league section arch)

---

## What Was Done

### Ask 1 — Strict startsWith fix across all search bars (PR #57)

User reported the player roster search was matching names that *contained* the typed letter, not names that *started with* it (e.g., typing "a" matched "Mano" because the underlying `p.name` was "Anthony Mano" or similar — token "anthony" started with "a"). User explicitly requested: "filter all players whose name START with A, not for any player with the letter A in his name. Same applies in every search bar in the app including the country one too."

This was a regression I introduced in S062 Phase 5 — added per-word matching as a "feature" without recalling the prior fix from S050 CountrySelect.

Audited 3 search inputs in the app and changed all to strict displayed-value startsWith:

| File | Was | Now |
|------|-----|-----|
| `PlayerStats.jsx` (Phase 5 roster) | `tokens.some(t => t.startsWith(q))` on `p.name + p.nickname` | `(p.nickname \|\| p.name).startsWith(q)` |
| `CountrySelect.jsx` (S050 picker) | `name.startsWith \|\| iso3.startsWith \|\| words.some(startsWith)` | `name.startsWith \|\| iso3.startsWith` |
| `PlatformAdmin.jsx` (super-admin) | `.includes(search)` | `.startsWith(search)` |

**Trade-off documented inline:** typing "korea" no longer matches "South Korea" / "North Korea" — must search "south" or "north". Per user directive for cross-app consistency.

**Verified in preview:** "a" → only "Abood" ✓ (was: Abood, Chaos, Mano). "m" → MAK, Mano, Mazhar, Moody ✓.

### Ask 2 — League Section redesign PR1 (PR #58)

User feedback: "this landing screen [LeagueGate] is not required anymore. Lets build a full league section in one page to allow players to swap leagues, create league (this needs its own workflow and screen — league name, type of league (pairs or single ranking) and more etc). There is no need to have a signout button on landing page it doesn't make sense."

Drafted [`padelhub/planning/league-section-redesign.md`](padelhub/planning/league-section-redesign.md) (275 lines) with full diff analysis and 5 ambiguous Q&A. User picked: Q1=A / Q2=C / Q3=A / Q4=A / Q5=defer.

Implemented as PR1 (architecture only, ~280 net new lines + DB migration):

**DB migration** `s063_leagues_format_column` (applied via Supabase MCP):
```sql
ALTER TABLE leagues ADD COLUMN format text NOT NULL DEFAULT 'singles'
  CHECK (format IN ('singles', 'pairs'));
```
Both existing leagues backfilled to `'singles'` = current behavior. Locked at create time (no UPDATE in v1).

**`src/components/LeagueGate.jsx`** — slimmed from 277 → 199 lines:
- Deleted the full-screen picker UI entirely (list, create form, join form, edit, delete, sign-out, error banner, share button — all moved to LeaguesView)
- Kept as thin state shell with localStorage `padelhub_lastLeagueId` persistence
- Cold-launch resolution: try restoring last-used league from localStorage; fall back to first by membership join-order; null for 0-league users
- Render-prop signature changed: `children({ leagueId, leagues, handlers })` instead of `children(leagueId, switchLeague)`
- `handlers` exposes: `switchLeague`, `refreshLeagues`, `createLeague({name, format, autoSeason})`, `joinLeague`, `renameLeague`, `deleteLeague`
- Loading state still uses Phase 3 `.lscreen` styling but only renders briefly during cold launch
- ?invite=... auto-join flow preserved

**`src/components/LeaguesView.jsx`** — NEW, ~280 lines:
- Full sidebar sub-view (rendered via `sidebarView==="leagues"`)
- Three sections:
  1. "Your leagues" — card list with `.lv-card` per membership, `.lv-card.current` for selected, format badge for pairs leagues, admin actions (Invite/Edit/Delete inline)
  2. "Create new league" — name input + Singles/Pairs `.lv-fmt-opt` segmented control + auto-season checkbox + warning banner for pairs ("Pair leaderboard rendering is not yet shipped...")
  3. "Join with invite code"
- Class-based markup using Phase 1 LONG token names (`--accent`, `--border`, `--r-md`, `--mono`, `--surface`, `--surface-2`, `--accent-glow`, `--accent-dim`, `--gold`, `--danger`)

**`src/App.jsx`**:
- Top-level: simplified render prop signature receives `{ leagueId, leagues, handlers }` from LeagueGate
- AppContent: accepts `leagues` + `leagueHandlers` props
- `onSwitchLeague` redefined as `() => setSidebarView("leagues")` (no longer nulls leagueId)
- `loadLeagueData`: early-returns when leagueId is null (0-league users) — prevents postgrest error from `.eq("league_id", null)` queries; clears `loading` and `firstLoadRef`
- Realtime subscription: skipped when leagueId is null
- Ranking tab: split into 2 branches — `.empty-leagues` empty-state when `!leagueId`; full Phase 4 leaderboard otherwise
- New `sidebarView==="leagues"` route renders LeaguesView with handlers

**`src/components/Sidebar.jsx`**:
- New "🏟️ Leagues" entry in League section, opens `sidebarView="leagues"`
- Current league display falls back to italic "No league selected" for 0-league users
- "📩 Invite Players" still gated on `league && isAdmin`

**`src/index.css`**:
- New `.lv-*` class block for LeaguesView (~50 lines)
- New `.empty-leagues` empty-state classes (~6 lines)

**`public/sw.js`**: v88 → v89

### Lesson #70 audit + visual verification

- `grep -r 'var(--<short>)' src/` → zero matches across all source files
- Cold-launch verified: straight to Ranking on Padel Stars League (last-used restored from localStorage). No LeagueGate picker.
- Sidebar → 🏟️ Leagues: opens LeaguesView. Both leagues listed, Padel Stars marked CURRENT with green left-border + "CURRENT" badge.
- "+ Create new league": form renders correctly with Singles/Pairs segmented selector + auto-season checkbox.
- Pairs format: warning banner shows ("Pair leaderboard rendering is not yet shipped...").
- All Vercel checks passed; squash-merged.

---

## Files Modified

### PR #57 (`9c5be44`) — 3 files, +24/-18

- `src/components/PlayerStats.jsx` — search filter: per-word → strict displayed-name startsWith
- `src/components/CountrySelect.jsx` — drop per-word fallback
- `src/components/PlatformAdmin.jsx` — `.includes` → `.startsWith`

### PR #58 (`6973f15`) — 7 files, +873/-251

- `src/components/LeagueGate.jsx` — 277 → 199 lines (rewrote as state shell)
- `src/components/LeaguesView.jsx` — NEW, ~280 lines
- `src/App.jsx` — +60 net (routing refactor, empty-state, sidebar route)
- `src/components/Sidebar.jsx` — +9 net (new Leagues entry, 0-league fallback)
- `src/index.css` — +54 lines (.lv-* + .empty-leagues)
- `public/sw.js` — v88 → v89
- `planning/league-section-redesign.md` — NEW, 275 lines (plan with Q1–Q5)

Plus DB migration `s063_leagues_format_column` applied via Supabase MCP.

## Key Decisions

- **Search behavior unified across the app** — strict displayed-value startsWith. Trade-off accepted: typing "korea" no longer matches "South Korea" (must search "south" or "north"). User explicit on the consistency requirement.
- **LeagueGate kept as a thin state shell** — alternative was to delete it entirely and inline the state in App.jsx. Kept the component because the render-prop pattern fits cleanly with AuthGate, and the component name is now more accurate (it's not a gate visually anymore, but it does gate state initialization).
- **Empty-state on Ranking only when `!leagueId`** — for users with leagues but no selection, the resolveSelectedLeague auto-picks the first/last-used. The empty-state only shows for genuine 0-league users.
- **Format locked at create time** — no UPDATE RPC in v1. User can delete + recreate if they need to change format. Simpler than a migration RPC; can be added later if needed.
- **Header chevron popover deferred to PR2** — Q2=C had two parts (sidebar + header). Sidebar is the canonical switcher; header popover is visual polish that doesn't change architecture.
- **Q5 "more etc" fields deferred** — user explicitly said scope later. v1 form is just name + format + auto-season toggle.

## Lessons Learned

### Mistakes

| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-05-07 | S062 Phase 5 introduced per-word startsWith on the new player search input, regressing the strict displayed-name behavior previously established in S050 CountrySelect | Designed the new search filter from scratch without grep'ing the codebase for existing search patterns to match. The "per-word matching for multi-word names" rationale (Lesson #48) seemed reasonable in isolation but conflicted with cross-app behavior the user expected | **Lesson #73: Before adding any new search input to a screen, grep for existing search filter implementations in the codebase to match the established behavior.** `grep -rn "\.filter\|toLowerCase\|startsWith\|\.includes" src/components/` finds every existing filter; pick the established pattern unless there's a documented reason to diverge. Same family as Lesson #54 (verify summaries against truth) and Lesson #61 (read git, not local, for monotonic constants). |

### Validated Patterns

- [2026-05-07] **Plan-with-AMBIGUOUS-Q&A workflow applied to a non-#46 redesign** — the league section redesign isn't an Issue #46 phase but the plan-first discipline transferred cleanly. 5 questions with 2-3 options + recommendations + trade-offs spelled out. User answered Q1=A/Q2=C/Q3=A/Q4=A/Q5=defer in 30 seconds; the answers determined the entire architecture. Saved one speculative-implementation cycle. Same as S062 Lesson #72. **Pattern is generalizable beyond #46:** any redesign that touches >2 components or has cross-cutting state changes benefits from plan-first AMBIGUOUS Q&A.
- [2026-05-07] **Slimming a wrapper component to a state shell vs deleting it entirely** — LeagueGate was 277 lines of UI + state. Deleting and inlining state into App.jsx would have reduced file count but bloated App.jsx (already 1500+ lines). Slimming kept the file boundary at the responsibility edge: LeagueGate = "managed access to user's league memberships"; the picker UI was a separate concern that moved to LeaguesView. Result: cleaner separation, fewer prop chains, easier to revisit later. **Pattern:** when refactoring a wrapper component whose responsibility partially survives, slim it rather than inline it.
- [2026-05-07] **PR architecture-vs-visual split** — for any large redesign, splitting into PR1 (architecture, reuse existing styling 1:1) + PR2 (visual polish) keeps each diff focused. PR1 review: "does the routing / state / data flow work?". PR2 review: "does the styling match the design?". Each diff is much faster to read than a combined PR. Same family as `feedback_issue46_dont_take_spec_literally.md` rule about not bundling architecture migration with visual changes. (S063 PR1 deferred header-tap popover + bespoke restyle to PR2.)

## Next Actions

- [ ] iPhone smoke-test on production: cold-launch direct to last-used league, sidebar → Leagues, create flow with Singles/Pairs, switch between leagues, 0-league empty-state on a fresh account (user)
- [ ] PR2 visual polish (when user wants it): header chevron (▾) popover for quick switching, bespoke restyle of LeaguesView, Q5 "more etc" fields if desired
- [ ] FT-15 Pairs Leaderboard implementation (Issue #25): now that `leagues.format='pairs'` is selectable, the placeholder banner promises "coming soon" — backlog candidate

---

## Commits & Deploy

- **Commit:** `9c5be44` — fix: strict startsWith on all search bars (PR #57)
- **Commit:** `6973f15` — feat: League Section redesign architecture (PR #58)
- **DB migration:** `s063_leagues_format_column` (applied via Supabase MCP)
- **Live:** padel-battle.vercel.app (SW v89)

---
_Session logged: 2026-05-07 | Logged by: Claude | Session063_
