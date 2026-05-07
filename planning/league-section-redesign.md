# League Section Redesign — Plan v1 Draft

**Status:** DRAFT — awaiting user approval before any implementation.
**Drafted:** 2026-05-07 (S062 follow-up)
**Trigger:** User feedback — "this landing screen [LeagueGate] is not required anymore. Lets build a full league section in one page to allow players to swap leagues, create league (this needs its own workflow and screen — league name, type of league (pairs or single ranking) and more etc)"

---

## Problem

Today the user-flow is:

```
AuthGate → LeagueGate (full-screen list/picker/create/join + Sign Out)
        → AppContent (with header/nav/tabs)
```

User feedback (multiple sessions now — S041, S058, S062):
- **The LeagueGate landing screen is friction.** Even with the S058 auto-skip-on-1-league rule, multi-league users still hit the picker every cold-launch. User wants leagues managed *inside* the app.
- **The "Sign Out" button on LeagueGate doesn't belong** — Sign Out lives in Settings → Account; having it on the landing page is a duplicate that creates a different visual mental model (this-isn't-the-app-yet).
- **Create League needs more than `name + create` button** — at minimum, the format (pairs vs singles ranking) and possibly start date / location / description.

## Goals

1. **Remove LeagueGate as a routing gate.** Once authenticated, user lands directly in the app on whatever league was selected last (or first available, or empty-state if 0).
2. **Build a "League" section** accessible from the sidebar (and possibly an inline switcher) where the user can: see all their leagues, switch between them, create a new league, manage current league settings.
3. **Add league `format` field** at create time (`'singles' | 'pairs'`) so future ranking + season + pair tracking respects the format. This overlaps with [FT-15 Pairs Leaderboard plan](FT-15-pairs-leaderboard.md) — see [Q4](#q4-singles-vs-pairs-format-scope) below for scope reconciliation.
4. **Preserve existing flows:** invite codes, member roles, season management, claim-existing-player flow, etc. — these all stay where they are.

## Non-Goals (defer)

- Migrating any existing league's format — all existing leagues default to `'singles'` (= current behavior). Format chosen at create time is fixed (not editable post-creation in v1; can be added later).
- Full pair leaderboard implementation — that's FT-15 / Issue #25, separate scope. This phase only adds the **`format` column** and the **create-flow selector**, with a placeholder banner if the user picks pairs.
- Onboarding redesign for 0-league users (claim-existing-player flow, profile fields). That's Phase 11 of #46.

---

## Open questions for user (BEFORE implementation)

### Q1: How to land 0-league users (no memberships)?

When a user logs in for the first time and has no memberships, what should they see?

- **A. Inline empty-state on the Ranking tab** — shows a friendly "You're not in a league yet" card with two buttons: "Create your first league" and "Join with invite code". The bottom nav and header still render but most tabs show their own empty-states.
- **B. Force them into the new "League" section** — sidebar opens automatically to the League view, can't navigate to other tabs until at least one league exists.
- **C. A modal that blocks the app** — kept as the LeagueGate currently is, but visually stylized as an in-app modal instead of a full-screen route.
- **Recommendation:** A — most discoverable, least intrusive, matches modern apps (Slack, Discord). The other tabs naturally show "no data yet" empty-states.

### Q2: Where does the league switcher live?

- **A. Sidebar entry: "Leagues"** — opens a sub-view with full list + create/join + manage current. Like the existing Settings/Admin sidebar pattern.
- **B. Tap on the header logo** — opens a popover with league list + "Manage…" link. Subtle, fast, but less discoverable for first-time users.
- **C. Both** — sidebar entry (canonical) + header tap (shortcut). Adds a subtle chevron next to the league name in the header.
- **Recommendation:** C — sidebar for discoverability, header for power-users. Header tap is a 2-line addition.

### Q3: Default league on cold-launch when user has 2+ leagues?

- **A. Last-used (localStorage)** — store `lastLeagueId` per user; resume there. New PC = falls back to first league (alphabetical or join-order).
- **B. First by join order** — predictable, no client storage. User must switch manually each session if they have multiple.
- **C. User-pinned default** — adds a `is_default` flag to `league_members`. User explicitly picks one per device. More work, more correct.
- **Recommendation:** A — best UX for the common case (single primary league), no schema change, cross-device friendly enough.

### Q4: Singles vs Pairs format — scope?

The Create League flow needs a "type of league" picker. Options:

- **A. League-level format** — `leagues.format text DEFAULT 'singles' CHECK IN ('singles','pairs')`. All seasons in this league inherit the format. Locked at create time.
- **B. Season-level default + override** — `leagues.default_season_format` is the create-flow default for new seasons, but each season can override. More flexible, more complex.
- **C. Drop format from League create flow** — keep it season-level only (per FT-15 plan). League creation just collects name + optional metadata; format is decided per-season.
- **Recommendation:** A — matches user's stated intent ("type of league (pairs or single ranking)"). Existing leagues backfill to `'singles'`. Simpler than B for v1; can be upgraded later.

### Q5: What "more etc" fields on create?

Beyond `name` + `format`, what else does the Create League flow capture? Pick any combination:

- [ ] **Description** (text, optional) — short paragraph shown on the league switcher card
- [ ] **Location** (text, optional) — city/club name, e.g., "Dubai Sports City"
- [ ] **Logo / accent color** (color picker, optional) — leagues currently use a generic 🏟️ emoji; user might want a per-league color theme
- [ ] **Privacy** (toggle: invite-only / open via code) — currently all leagues are invite-only via code; matches current behavior so probably skip
- [ ] **Default season auto-create** (toggle) — on create-league, also create "Season 1" with the same format. Saves a click for new users. Recommended ON.

User-driven — pick the subset to ship in v1.

---

## Proposed flow (assuming A/C/A/A + auto-create-season for Q1–Q5)

### App boot

```
AuthGate (email/password / Google OAuth)
  ↓ user authenticated
AppContent loads → reads memberships
  ↓
  ├─ 0 memberships → inline empty-state on Ranking tab
  │                  ("You're not in a league yet" + 2 CTAs:
  │                   Create / Join — both open the Sidebar's
  │                   "Leagues" view)
  ├─ 1 membership  → that league is selected (existing S058 logic)
  └─ N memberships → restore localStorage `lastLeagueId` if valid,
                     else first by join order
```

LeagueGate component is **deleted** (or kept as the empty-state UI for 0-league users — implementation detail).

### Sidebar entry: "Leagues"

```
[👥 Leagues]  ← new entry between "My Profile" and "Switch League" (which gets removed)
```

Tapping it opens a sub-view in the sidebar with three sections:

1. **Switch league** — list of all memberships with selected indicator + tap-to-switch.
2. **Create new league** — opens the Create League form (see next section).
3. **Join with invite code** — existing inline form, slightly restyled.

The header logo gets a subtle ▾ chevron; tapping anywhere on the logo block opens a popover with the same switcher (Q2=C).

### Create League workflow

A new full-screen flow inside the sidebar (similar to SeasonManagement pattern):

```
┌─────────────────────────────────┐
│ ← Create League                 │
├─────────────────────────────────┤
│ League name *                   │
│ [______________________]        │
│                                 │
│ Format *                        │
│ ┌──────────────┬──────────────┐│
│ │   Singles    │   Pairs      ││  ← segmented control
│ │  (current)   │  (premier)   ││     (locked after create)
│ └──────────────┴──────────────┘│
│                                 │
│ Description (optional)          │
│ [______________________]        │
│                                 │
│ Location (optional)             │
│ [______________________]        │
│                                 │
│ ☑ Auto-create Season 1          │
│                                 │
│ [        Create League        ] │
└─────────────────────────────────┘
```

On submit:
1. Insert into `leagues` (name, format, description, location, created_by=user.id)
2. Insert membership for creator with role='admin' (= owner)
3. Generate invite code
4. If "auto-create Season 1" → insert into `seasons` (name='Season 1', format=league.format, league_id, start_date=now)
5. Switch the user to the new league (set `selectedLeagueId`, save to localStorage)
6. Close the sidebar; user lands on Ranking tab of the new league with empty-state
7. Show toast: "League created. Add players from Admin Dashboard."

### Existing league management — where it lives now

These stay where they are:
- **Settings → League:** current league info + invite code + regenerate (owner) + leave league (member). The "Switch League" button inside Settings → League is **removed** (replaced by sidebar entry).
- **Admin Dashboard → League Management:** rename league, season management, member roles. Rename UI gets the format-change-not-allowed-yet note.

---

## Proposed DB changes

### `leagues` table — add 3 columns (additive, backward compatible)

```sql
ALTER TABLE leagues
  ADD COLUMN format text NOT NULL DEFAULT 'singles'
    CHECK (format IN ('singles', 'pairs')),
  ADD COLUMN description text,
  ADD COLUMN location text;
```

All existing leagues backfill to `format='singles'`, `description=NULL`, `location=NULL`. No data migration needed.

### New RPC: `create_league_v2(p_name, p_format, p_description, p_location, p_auto_season)`

SECURITY DEFINER, atomic:
1. Insert into `leagues` with all fields + `created_by=auth.uid()`
2. Insert `league_members` row for creator with `role='admin'`
3. Generate + store invite code
4. If `p_auto_season`: insert `seasons` row with same format
5. Return `{ league_id, invite_code, season_id (or null) }`

Replaces the existing 3-step client-side create flow (insert league → insert membership → generate code) which is currently exposed to race conditions.

### RLS

No new policies needed — `leagues_select`, `leagues_insert` (creator), `leagues_update` (owner) all unchanged.

### `seasons` table

Already has the format column from FT-15 plan? **Verify:** if FT-15 not yet applied, the auto-season insert in `create_league_v2` skips the format field; if FT-15 applied, format=league.format gets inserted.

---

## Migration path (no breaking changes)

1. **Phase A (this PR):** DB migration — add 3 columns. Default values keep all existing leagues working as before.
2. **Phase B (this PR):** New RPC `create_league_v2`. Deploy DB.
3. **Phase C (this PR):** Frontend — new sidebar Leagues view + Create League workflow + drop LeagueGate as gate. The 0-league empty-state replaces what LeagueGate used to render for that case. The S058 auto-skip becomes the default behavior (no gate for 1+ leagues).
4. **Phase D (deferred):** Pair leaderboard rendering when `league.format='pairs'` — separate from this scope, builds on FT-15.

Existing leagues continue to work unchanged. Existing users with 1 league see no change beyond the LeagueGate disappearing (which they already auto-skipped). Users with N leagues see the sidebar entry instead of the gate.

---

## Files touched (estimated scope)

| File | Change |
|------|-------|
| **DB migration** | `s063_league_section_redesign` — add format/description/location columns + create_league_v2 RPC |
| `src/App.jsx` | Drop LeagueGate gate around AppContent. Move 0-league empty-state into Ranking tab. Read `lastLeagueId` from localStorage on mount. Pass leagues + setSelectedLeagueId to new sidebar view. |
| `src/components/LeagueGate.jsx` | DELETE (or repurpose as a sub-component for the 0-league empty-state — TBD) |
| `src/components/Sidebar.jsx` | New "🏟️ Leagues" entry. Move "Switch League" from Settings → here (or just remove since this absorbs it). |
| **NEW:** `src/components/LeaguesView.jsx` | Full sub-view with list + create + join. ~200 lines. Phase 5-style class-based markup using existing tokens. |
| **NEW:** `src/components/CreateLeagueForm.jsx` | The new full-screen create flow. ~150 lines. Includes format segmented control. |
| `src/components/SettingsView.jsx` | Remove "Switch League" if present (or leave — confirm with user). |
| **CSS:** `src/index.css` | New classes for the leagues view. Reuse existing tokens + Phase 4/5 patterns where possible. |
| **PWA:** `public/sw.js` | v88 → v89. |

---

## Pre-merge gate (per `feedback_issue46_dont_take_spec_literally.md` discipline)

This isn't an Issue #46 phase but the same discipline applies given the size:

1. **List prior tunings** on every touched component:
   - LeagueGate — S060 Phase 3 (latest restyle), S058 #41 (auto-skip ref), S027 BF-33 (invite link preserved through OAuth/signup)
   - Sidebar — S054 (5-tab nav, Rules moved to sidebar), S048 #13 (Platform Admin moved to AdminDashboard), S053 (Switch League removed)
   - SettingsView — S048 #13 trim, S053 #22 reorder Account → bottom
2. **Diff every visual property** vs the new design (when mockup exists)
3. **Classify** spec-wins / prior-wins / **AMBIGUOUS — ASK USER** before applying
4. **Lesson #70 grep audit** before commit (no `var(--<short alias>)` in any new JSX)
5. **`getComputedStyle` checks** pre-PR-open on all new classes
6. **Don't bundle architecture migration with visual changes** — split into 2 PRs:
   - **PR1: Architecture** — drop LeagueGate as gate, add LeaguesView in sidebar, DB migration. Visuals reuse existing styling 1:1.
   - **PR2: Visual polish** — restyle LeaguesView + CreateLeagueForm with bespoke design, add header chevron + popover.

This split keeps the architecture diff readable and the visual diff isolated for fast review.

---

## DoD checklist (will iterate after user picks Q1–Q5)

- [ ] Q1–Q5 user decisions captured
- [ ] DB migration applied — columns added, defaults backfilled
- [ ] `create_league_v2` RPC deployed + tested via Supabase SQL editor (1 league create + 1 with auto-season)
- [ ] LeagueGate removed from App.jsx routing
- [ ] 0-league empty-state renders on Ranking tab
- [ ] Sidebar "Leagues" entry opens new LeaguesView
- [ ] Create League form: name + format selector + description + location + auto-season toggle
- [ ] On create: league + membership + invite code + (optional) Season 1 atomic in RPC
- [ ] Last-used league restored from localStorage on cold launch
- [ ] All existing leagues continue to work (`format='singles'` default)
- [ ] Format=pairs shows placeholder banner on Ranking ("Pair leaderboard coming soon")
- [ ] No `var(--<short>)` aliases in new JSX (Lesson #70)
- [ ] Local Vite verification on all 3 cases: 0 / 1 / 2+ leagues
- [ ] Vercel preview READY before merge
- [ ] iPhone smoke-test gate (user)

---

## Hand-off

If approved + Q1–Q5 answered:
- Phase A+B (DB) is one Supabase migration via MCP
- PR1 (architecture) ships next — feature branch `feat/league-section-arch`
- PR2 (visual polish) follows — feature branch `feat/league-section-visuals`

If user wants to fold Pair-Leaderboard rendering into this scope: that's PR3 on `feat/league-pairs-leaderboard` after Q1–Q5 + the FT-15 pair-DB schema decisions are also resolved.
