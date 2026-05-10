# Session 073 — Green Logo Revert + Login Fit + S3 Header + FT-16 Frontend + FT-15 Format Toggle

**Date:** 2026-05-10
**Production:** padel-battle.vercel.app — commit `0be427e`, SW v139, dpl_AK1mm8zXESE7NVw4WvZuE2KVdWuV READY
**Prior session:** S072 (commit `c264302`, SW v138)

---

## Outcome at a glance

- **2 push-direct commits on main:** `0be427e` shipped feature work + `c264302` (from S072 close docs).
- **2 GitHub issues closed:** [#90](https://github.com/mmuwahid/Padel-Battle/issues/90) (logo + login fit) + [#91](https://github.com/mmuwahid/Padel-Battle/issues/91) (S/TB → S3).
- **1 DB migration:** `s073_create_season_format` extends `create_season` RPC with `p_format` param (FT-15 wiring; Lesson #101 applied — DROP both prior overloads, recreate as 6-arg).
- **FT-16 frontend MVP shipped:** Open-match voting fully functional end-to-end — open_matches loaded into context, ScheduleView Open section renders + claim/leave/cancel actions wired to RPCs, Schedule form has Private/Open match-type toggle that routes to `create_open_match` on submit.
- **FT-15 frontend MVP shipped:** SeasonManagement Create form has Individual/Pairs format toggle wired to extended `create_season` RPC. (Pairs Roster admin UI + LogMatch pair picker + new PairsRanking component still deferred to S074 per FT-15 plan.)
- **Logo + #90 fully addressed:** color reverted gold → green; login page fits one viewport; SVG icon source-of-truth wired into PWA manifest + apple-touch-icon.

---

## Issue #90 — three-part fix

**1. Login page no longer scrolls below the fold.** Root cause: `.lhero` had `padding: 30vh 32px 28px` from S070 splash positioning — that 30vh push moved the logo to ~20% above center, but on form-bearing screens (AuthGate sign-in / sign-up / recovery) it shoved the form (email + password + sign-in button + forgot-password + Google sign-in) below the visible viewport. Fix: change default `.lhero` padding-top to `clamp(28px, 6vh, 56px)`, then add a `.lscreen.splash > .lhero` opt-in modifier that restores the wider 30vh hero for actual splash uses (App.jsx loading splash, LeagueGate picker). Also reduced AuthGate's `<PadelHubMark size>` from 140 → 96 to give the form more breathing room. App.jsx splash blocks (line 887, 942) and LeagueGate (line 275) all gained the `.splash` modifier class.

**2. Logo back to brand green.** S072 had shipped a gold variant. The user's instruction "with our color formatting" meant the existing app accent (#4ade80 green), not the gold of the inspiration image they shared. Reverted gradients while keeping the same 3D orb + 6-satellite + pulsating + orbit design that was approved:
- `hub-orb-grad`: `#fde68a → #f59e0b → #78350f` (gold) → `#d1fae5 → #4ade80 → #14532d` (green)
- `hub-sat-grad`: `#fef3c7 → #f59e0b → #92400e` → `#ecfdf5 → #4ade80 → #166534`
- `hub-aura-grad`: gold rgba → green rgba(74,222,128,.55→.18→0)
- `index.css` filter: gold drop-shadow → green `rgba(74,222,128,0.40)`
- `index.html` static splash: full SVG mirror, including wordmark "Hub" #f59e0b → #4ade80
- All highlight ellipses recolored from `#fef9c3` (cream) → `#ecfdf5` (mint) for green tonal harmony

**3. Logo consistency across PWA + sharing.** Created `/public/icons/icon.svg` as a 512×512 single source of truth that renders the new green orb design with all 6 satellites + aura + connectors + highlight (mirrors the React component). `manifest.json` now lists SVG icons FIRST (with `purpose: any` and `purpose: maskable` entries), then PNG fallbacks for older browsers. `index.html` link tags updated:
- `<link rel="icon" type="image/svg+xml" href="/icons/icon.svg">`
- `<link rel="apple-touch-icon" href="/icons/icon.svg">`
- `<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png">` (PNG fallback retained)

Modern PWAs (iOS 16+, Android 12+) honor SVG icons natively, so the green orb appears on home-screen install immediately. Older `/icons/icon-192.png`, `/icons/icon-512.png`, and `/og-image.png` (WhatsApp share preview) still show the prior design — they need PNG export from the SVG using a tool that wasn't available in this session. Documented as follow-up in the issue close comment.

---

## Issue #91 — S/TB → S3

`MatchHistory.jsx:183` column header changed from `{i===2 ? 'S/TB' : \`S\${i+1}\`}` → `\`S\${i+1}\``. Per the user's request, the third-set column reads `S3` like the other set columns; the TB indicator stays inside the score cell where it semantically belongs.

---

## FT-16 frontend MVP — open-match voting end-to-end

The DB foundation shipped in S072 (5 migrations + 6 RPCs); S073 wires the frontend.

### App.jsx — data loading + context exposure

- New state: `openMatches`, `openMatchPlayers` arrays.
- `loadLeagueData()` Promise.all extended with two new SELECT queries: `open_matches` (status IN open/locked, order by scheduled_at asc) + `open_match_players` (full join table, then filtered to in-scope open matches client-side).
- `matches` SELECT now includes `open_match_id`. `seasons` SELECT now includes `format`.
- Sweep: `supabase.rpc("expire_stale_open_matches", {p_league_id})` invoked after each load — flips any past-scheduled-time `open` matches to `cancelled` silently.
- Error reset block clears both new state arrays alongside the existing ones.
- Context exposure: `openMatches`, `openMatchPlayers`, `claimedPlayer` added to `leagueCtx` value object.

### ScheduleView.jsx — Open Matches section + form toggle

- New props accepted: `openMatches`, `openMatchPlayers`, `claimedPlayer`.
- New state: `matchType` ('private' | 'open') + `omBusy` (RPC busy flag).
- Four new RPC action functions: `createOpenMatch` (Step-2 submit when type='open'), `joinOpenMatch` (claim a spot, fires push notification on lock-in), `leaveOpenMatch` (non-organizer leave while open), `cancelOpenMatch` (organizer or admin cancel + push notification fan-out).
- New "Open Matches" render block above the regular Upcoming list. Each `.omcard` shows:
  - Header band: date + court + meta + status pill (open with `N/4` count vs locked gold pill).
  - 4 `.omslot` avatars: filled with player initial, empty with dashed `+` placeholder, organizer ringed gold, locked-state participants tinted Team A green / Team B gold.
  - Optional notes line.
  - Contextual action buttons:
    - Not signed up + open + slots available → "Claim a Spot" (primary green).
    - Signed up + non-organizer + open → "Leave" (muted).
    - Organizer or admin + open or locked → "Cancel" (danger).
- Step-1 form: new `.sform-tcard` segmented toggle "Private Match | Open to League". Open mode replaces the team picker with a `.sform-youonly` card showing the organizer's avatar + "Spot 1 of 4" + sub-text.
- `canContinue` gate: private requires all 4 players selected; open requires only `claimedPlayer` present.
- Step-2 submit button text + handler routes by matchType — calls `createOpenMatch` instead of `createChallenge` when type='open'. Loading text differs ("Opening..." vs "Scheduling...").

### CSS — `.om*` and `.sform-*` classes (~110 lines)

Appended to `index.css`: `.om-section`, `.om-secheader`, `.omcard` (+ `.locked` variant), `.omcard-hd`, `.omcard-when`, `.omcard-date`, `.omcard-meta`, `.omcard-status` (with `.open` and `.locked` color variants), `.omcard-dot`, `.omcard-slots` (4-col grid), `.omslot` (+ `.org`, `.empty`, `.team-a`, `.team-b` modifier classes), `.omslot-name`, `.omslot-role`, `.omslot-team`, `.omcard-notes`, `.omcard-actions`, `.omcard-btn` (+ `.primary`, `.gold`, `.muted`, `.danger`, `.ghost` variants). Plus shared `.sform-tcard`, `.sform-tcardh`, `.sform-tcardh-lbl`, `.sform-typetoggle`, `.sform-typebtn` (+ `.on` state), `.sform-typebtn-sub`, `.sform-youonly`, `.sform-youavi`, `.sform-youinfo*`. Tokens-only — no hardcoded hexes.

### Deferred to S074

- **NotificationCenter.jsx** — `open_match` type renderer with 3 kinds (new/locked/cancelled). Push-notify fires from ScheduleView using existing `sendPushNotification` channel; Supabase notifications table insert + NotificationCenter render still pending.
- **LogMatch pre-fill from locked open match** — when a user taps "Log Score" on a locked open-match card, LogMatch should pre-fill team_a/team_b from `open_matches.team_a_player_ids`/`team_b_player_ids` and on insert set `matches.open_match_id` FK. Trigger flips status='completed' on DB side (already wired in S072 migration).
- **Deep-link routing** — notification click → ScheduleView Open section + flash highlight on the relevant card.

---

## FT-15 frontend MVP — format toggle on season create

### DB migration

`s073_create_season_format` extends `create_season` to accept `p_format` parameter (default `'individual'`). Lesson #101 applied: dropped both existing `create_season` overloads (4-arg without location, 5-arg with location) and recreated as a single 6-arg version with all params optional. Validates format in ('individual', 'pairs') and stores it in `seasons.format`. Idempotent and backward-compatible — callers passing the old 5 args get format='individual' by default.

### SeasonManagement.jsx

- New state `newFormat` defaults to 'individual'.
- Create bottom-sheet form gets a new Format `.shf` row using the same `.sform-typetoggle` markup as FT-16 (Individual / Pairs buttons with sub-labels).
- `handleCreate` now passes `p_format: newFormat` to the RPC.

### Deferred to S074

- **Pairs Roster admin UI** — when a season is `format='pairs'`, expose admin-gated UI to create/update/delete pairs (RPCs already shipped in S072).
- **LogMatch pair-aware picker** — when `selectedSeason.format === 'pairs'`, replace 4-player picker with 2-pair picker; resolve pair → underlying team_a/team_b uuid[] before insert (matches schema unchanged).
- **PairsRanking.jsx component** (~250 lines) — replaces the individual leaderboard when `selectedSeason.format === 'pairs'`. 7-col layout (#/Pair/MP/MW/ML/CW/EFF%, no ELO column per Premier-Padel broadcast spec from mockup approval); inline-avatar pairs with country flags below player names; podium mirrors normal league podium with 2 small avatars side-by-side per slot.

---

## Files modified

```
src/components/icons.jsx                  — green gradients (revert from gold)
src/index.css                             — green filter, .lhero compact + .splash modifier, +110 lines om/sform CSS
src/App.jsx                               — open_matches loaded; matches+seasons SELECT extended; context expose; .splash class on splash divs
src/components/AuthGate.jsx               — PadelHubMark size 140→96 (×3 occurrences)
src/components/LeagueGate.jsx             — .lscreen.splash modifier
src/components/MatchHistory.jsx           — S3 header label
src/components/ScheduleView.jsx           — Open Matches section + claim/leave/cancel + Private/Open toggle + create_open_match wiring
src/components/SeasonManagement.jsx       — Format toggle in Create form + p_format passthrough
index.html                                — green static splash + SVG-first link tags
public/sw.js                              — v138 → v139
public/manifest.json                      — SVG icons listed first
public/icons/icon.svg                     — NEW single-source-of-truth 512×512 SVG
```

---

## DB migrations applied

```
s073_create_season_format — DROP+CREATE create_season(uuid,text,date,uuid,text,text)
                            with p_format DEFAULT 'individual', validates IN
                            ('individual','pairs')
```

---

## Lessons reinforced (no new lessons this session)

- **Lesson #101 (S072) — `CREATE OR REPLACE FUNCTION` cannot rename input parameters.** Applied here when extending `create_season` — DROP'd both prior overloads first, then recreated as 6-arg version.
- **Lesson #98 — static + React splashes share artwork.** Applied: every gold→green change in `<PadelHubMark>` JSX got mirrored into `index.html` `<svg>` block in the same edit cycle.
- **Lesson from S070 — drop-shadow + halo gradient + bounded ring = "container box".** Kept in mind: the new SVG icon includes a solid `#080808` background rect because PWA maskable icons need full-bleed, but the in-app `PadelHubMark` and `PadelHubMarkHeader` continue to use transparent backgrounds with only the orb + satellites + aura — no container shape that would read as cheap.

---

## What's deferred to S074

1. **FT-16 polish:** NotificationCenter `open_match` renderer + push-notify Edge Function branch + LogMatch pre-fill from locked open match + deep-link routing matrix.
2. **FT-15 main features:** Pairs Roster admin UI in SeasonManagement, LogMatch pair-aware picker, new `PairsRanking.jsx` component with podium + 7-col table per Premier-Padel broadcast spec.
3. **PNG icon regeneration:** export `/public/icons/icon.svg` → 192×192 + 512×512 PNGs + new OG image so older browsers + WhatsApp share preview match the new design.
4. **Color sweep Note A from S069** — still awaiting user A1/A2/A3 decision on `#9090a4` vs spec `--muted #555555`.

---

## Commit

```
0be427e  S073: green logo + login fit + S3 header fix + FT-16 frontend + FT-15 format toggle (SW v139)
         12 files changed, 521 insertions(+), 107 deletions(-)
```

Pushed to `origin/main`. Vercel deploy `dpl_AK1mm8zXESE7NVw4WvZuE2KVdWuV` → state READY → aliased to `padel-battle.vercel.app`.

GitHub issues #90 and #91 closed via `gh issue close` with detailed comments.
