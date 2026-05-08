# Issue #46 Phase 7 — Match Cards Restyle

**Status:** DRAFT — awaiting user answers to Q1–Q9 before any implementation.
**Branch:** `feat/46-phase7-match-cards` off `main` (already cut, post-PR-#62 merge).
**SW:** v94 → v95 (single PR).
**Spec reference:** `padelhub/docs/PadelHub_Complete_v2.jsx`
- Class definitions: lines 710–753 (`.mhd2 / .motm-pill / .macts / .mact / .mbody2 / .mgrid2 / .mteamcol / .mresl / .mplyr / .mplavi / .mplname-block / .mplnam / .mplflag / .mscols2 / .mscpill2 / .mtotal2 / .mreact`)
- Base wrapper rules: lines 316–320 (`.mtbar / .mtmeta / .mlist / .mcard`)
- JSX template: lines 1370–1500 (`MatchesScreen` History tab map block)

---

## In-scope surfaces

Three components — read-only / list-display surfaces only:

| File | Lines | Surface | Notes |
|------|------:|---------|-------|
| `src/components/MatchHistory.jsx` | 189 | Match cards (`s.map` loop, lines 143–186) + My-Pending block (96–132) | Primary surface |
| `src/components/MatchApprovalsQueue.jsx` | 106 | Pending-match cards with Approve/Edit/Reject controls (57–95) | Admin-only |
| `src/components/ScheduleView.jsx` | 448 | Challenge list cards (upcoming + past) ONLY — `viewTab` body | NOT the schedule form, log form, TeamShuffler |

## Out of scope (held for later phases)

- `LogMatch.jsx` (manual entry form) — different surface, different visual language
- `EditMatchModal.jsx` (admin edit modal) — bottom-sheet modal, not a card
- `ScheduleView.jsx` schedule form (lines 200+ when `showForm===true`)
- `ScheduleView.jsx` inline log-match form (`loggingMatch !== null`)
- `TeamShuffler.jsx`
- `LIVE` mode tournament screens

---

## Strategic decision: bundle all 3 surfaces in ONE PR

Phase 6 was split (6a/6b/6c) because the spec coverage was asymmetric and 6b was discretionary. **Phase 7 is NOT split** because:

1. All 3 surfaces consume the SAME `.mcard` component vocabulary — splitting would duplicate CSS additions across 3 PRs
2. All 3 are visually similar list-of-cards patterns
3. The MatchHistory My-Pending block + MatchApprovalsQueue cards are essentially the same component with different action buttons — natural to ship together
4. Iterating on iPhone smoke is cheaper if one PR exposes one preview URL

**Caveat:** if scope creeps past ~600 lines, split before merge.

---

## Diff analysis (spec vs current live)

### MatchHistory.jsx match card

| Property | Spec (`MatchesScreen` line 1370+) | Current live (lines 143–186) | Classify |
|----------|-----------------------------------|------------------------------|----------|
| Wrapper | `.mcard` rounded card with bordered header band | inline `background:CD; borderRadius:12; border:1px solid BD; padding:14` | spec-wins |
| Header layout | `.mhd2` flex row with date left + absolute-centered MOTM pill + `.macts` action buttons right | flex row with date+badge left, MOTM chip + share/edit/delete buttons right | **AMBIGUOUS — Q1** |
| MOTM badge | `.motm-pill` absolute-centered, gold-accent pill, ⭐ + nickname | inline span 10px gold pill on right side, `⭐{nickname}` | **AMBIGUOUS — Q1** |
| Action buttons (share/edit/delete) | `.mact` 28×28 icon buttons in `.macts` group, `.da` modifier for delete | `📤 ✏️ 🗑️` emoji buttons, no shared class | spec-wins (Lesson #70 Phase 6c continuation — these were missed) |
| Body grid | `.mgrid2` (1fr 80px 1fr) — wider team cols, narrower score col | inline grid 1fr auto 1fr | spec-wins |
| Per-team layout | `.mteamcol` flex column with `.mresl` (WIN/LOSS uppercase) + `.mplyr` × 2 (avatar + name + flag) | flex column, names stacked + WIN/LOSS underneath | **AMBIGUOUS — Q2 + Q3 + Q4** |
| Player avatars | `.mplavi` 24×24 circles per player | absent — names only | **AMBIGUOUS — Q3** |
| Country flags | `.mplflag` per player below name | absent | **AMBIGUOUS — Q3** |
| Team alignment | Team B mirrors via `.mteamcol.r` (row-reverse, right-aligned text) | Team B uses inline `textAlign:"center"` — symmetric not mirrored | spec-wins |
| Score column | `.mscols2` flex-column of `.mscpill2` plain numbers + `.mtotal2` chip | inline horizontal flex of set-scores + total below | **AMBIGUOUS — Q4** |
| Score visualization | Plain numbers (e.g. `6-3`), no S1/S2 labels, winner column highlighted via `.mscpill2.win` | Plain numbers, color-coded per set | preserved (no diff) |
| Reaction bar | `.mreact` flex row + `.rxpill` reaction chips + `.rxn` count + `.rxpl` show/hide | similar — flex row of 5 emoji buttons with count, mine has accent border | spec-wins (markup tightening only) |
| Incomplete styling | `.mcard.inc` → `.mbody2 { opacity:.45; filter:saturate(0); } .mreact { opacity:.4; pointer-events:none }` | inline `opacity:0.7` on whole card + grey border | **AMBIGUOUS — Q5** |
| Date format | `.mdate2` mono small text | inline `formatDate(m.date)` mono | preserved |
| Top bar | `.mtbar` with `.mtmeta` ("N matches · Season X") + `.spill` season selector | inline `<select>` season selector + `<div>{N} matches</div>` | spec-wins (consolidate to .mtbar) |

### MatchHistory.jsx My-Pending block

| Property | Current | Spec equivalent | Classify |
|----------|---------|-----------------|----------|
| Container | Custom collapsible `<div onClick>` with rotating chevron | none direct | **AMBIGUOUS — Q6** |
| Card style per match | Inline grey-tinted card with gold left-border + "⏳ Awaiting approval" tag | could reuse `.mcard` with `.pending` modifier | **AMBIGUOUS — Q6** |
| Won't-count footer | Italic small text | absent in spec | preserved |

### MatchApprovalsQueue.jsx pending-match cards

| Property | Current | Spec equivalent | Classify |
|----------|---------|-----------------|----------|
| Card | Inline grey-tinted with gold left-border, similar to My-Pending | could reuse `.mcard` with `.pending` modifier | **AMBIGUOUS — Q7** |
| Header | "Submitted by X" + date | `.mhd2` row | spec-wins |
| Body | Same 1fr/auto/1fr team grid + scores chip strip | `.mgrid2` + `.mscols2` | spec-wins |
| Actions | 3-col grid `Approve / Edit / Reject` buttons | not in spec (admin-only feature) | **AMBIGUOUS — Q7** (button restyle) |

### ScheduleView.jsx challenge cards

| Property | Current | Spec equivalent | Classify |
|----------|---------|-----------------|----------|
| Sub-tab bar | Inline pill buttons (Upcoming / Past) | `.seg` 2-col? | **AMBIGUOUS — Q8** |
| Challenge card | Inline-styled with border, 1fr/auto/1fr team grid, status badges, action buttons | `.mcard` wouldn't fit perfectly (no scores yet for "open") | **AMBIGUOUS — Q9** |

---

## Open questions for user (BEFORE mockup)

**Q1: MOTM badge — placement on match cards?**
- A. Spec verbatim: absolute-centered in `.mhd2` (gold pill floats over the row, action buttons right-aligned)
- B. Current: gold chip pinned to the right side of the action button row
- **Recommendation:** A. Visual asymmetry of absolute-centering reads as "this is special" — matches spec's "hero" treatment of MOTM. Current right-side chip blends with action buttons.

**Q2: WIN / LOSS label — above team names (spec) or below them (current)?**
- A. Spec: uppercase mono `WIN` / `LOSS` label ABOVE team column with color encoding
- B. Current: lowercase `WIN` / `LOSS` BELOW team names, color-encoded
- **Recommendation:** A. Above-name placement reads first when scanning — establishes outcome before player identity, which matches how match summaries are usually consumed.

**Q3: Add per-player avatars + country flags inside match cards?**
- A. Spec: 24×24 circle avatar + country flag per player row (so each match card shows 4 small avatars + 4 flags)
- B. Skip avatars/flags in match cards — keep names-only (lighter scan, less visual density)
- C. Avatars yes, flags no — names + small avatars but skip the flag clutter
- **Recommendation:** B or C. Match-card is a list view with up to 50+ entries — heavy avatars+flags add scroll time. Player profiles already show avatars; match-card is about the result. C is the compromise if you want some identity cue.

**Q4: Score column — narrow vertical column (spec) or wider horizontal row (current)?**
- A. Spec `.mscols2`: 80px-wide center column, scores stacked vertically (`6-3` / `6-4` / etc), `.mtotal2` chip at bottom
- B. Current: scores in horizontal flex row, total below
- **Recommendation:** A. Vertical stacking gives each set its own line — easier to parse 3-set matches at a glance. Also makes the team columns wider for player names.

**Q5: Incomplete-match visual treatment?**
- A. Spec `.mcard.inc`: 45% opacity + `filter: saturate(0)` (heavy desaturation, almost ghostly)
- B. Current: 70% opacity + grey border, full saturation
- C. Hybrid: 60% opacity + slight desaturation, keep "Incomplete" badge visible
- **Recommendation:** C. A is too aggressive (might look broken); B is too subtle. C reads as "deprioritized but still legible".

**Q6: My-Pending block — keep custom collapsible OR refactor to `.mcard` cards?**
- A. Keep collapsible chevron header + custom card layout (status quo)
- B. Refactor each pending match to a full `.mcard` with `.pending` modifier (gold left-border preserved), no collapsible — always shown
- C. Keep collapsible but render inner cards using `.mcard.pending`
- **Recommendation:** C. The collapsible header is useful when user has many pending submissions; switching the inner cards to `.mcard.pending` consolidates the visual language.

**Q7: Approvals queue cards — refactor to `.mcard` + Icon-button actions?**
- A. Full refactor to `.mcard.pending` with `.macts` action buttons (replaces ✓ Approve / ✎ Edit / ✕ Reject text-button trio with icon buttons inside `.macts`)
- B. Refactor card frame only, keep the 3-col Approve/Edit/Reject button grid (text labels) intact since the actions are critical and need to be unmistakable
- **Recommendation:** B. Approve/Reject are high-stakes admin actions — text labels prevent misclicks. Card frame restyle only.

**Q8: ScheduleView Upcoming/Past sub-tab bar — what style?**
- A. Reuse Phase 5 `.seg/.sb` 2-col segmented control (consistent with Players/Analytics outer toggle)
- B. Keep current inline-styled pill buttons + `+ Schedule` button on right
- C. New `.afilter-bar` / `.gfilter-bar` chip style
- **Recommendation:** A. Visual consistency wins — same toggle pattern across the app.

**Q9: ScheduleView challenge cards — full `.mcard` adoption or hybrid?**
- A. Adopt `.mcard` for both upcoming + past — past challenges have `played` status and could show the resulting match score; upcoming have no score yet, would show `vs date` as the "score"
- B. Past challenges → `.mcard` (they have results), upcoming challenges → custom layout (no scores, has accept/decline UI)
- C. Custom layout for both, only restyle to match `.mcard`'s visual language without sharing classes
- **Recommendation:** B. Past = match result display = perfect `.mcard` fit. Upcoming = invitation/RSVP UI = different mental model, custom layout.

---

## Phase 7 CSS additions to `src/index.css`

Tokens required (all exist; LONG names only — Lesson #70):
- `var(--surface)`, `var(--surface-2)`, `var(--surface-3)`, `var(--border)`, `var(--accent)`, `var(--accent-glow)`, `var(--accent-dim)`, `var(--text)`, `var(--mono)`, `var(--font)`, `var(--r-sm)`, `var(--r-md)`, `var(--r-lg)`, `var(--r-full)`, `--gold`, `--gold-dim`, `--gold-glow`, `--win`, `--danger`
- Hardcoded `#9090a4` for muted text (matches Phase 4/5/6 convention)
- Hardcoded `#2a2a2a` for inactive `.mscpill2` (= spec `var(--mu2)`) — closest existing var is `var(--surface-3)` 0x222
- DO NOT use spec short aliases — `--rs / --rm / --rl / --rf / --br / --brh / --s2 / --s3 / --tx / --fn / --mo / --mu / --mu2 / --ac / --acg / --acd / --go / --win / --los / --da` should NOT appear in this block

Approximate CSS budget: ~140 lines.

```css
/* ─── Issue #46 Phase 7 — Match Cards (MatchHistory / MatchApprovalsQueue / ScheduleView Past) ─── */

/* Top bar above match list */
.mtbar { ... }
.mtmeta { ... }
.mlist { ... }

/* Card wrapper */
.mcard { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; transition:all 200ms; }
.mcard:hover { border-color:var(--accent-glow); transform:translateY(-1px); }
.mcard.inc { ... } /* incomplete: opacity + saturation per Q5 answer */
.mcard.pending { border-left:3px solid var(--gold); } /* gold accent for pending */

/* Header band */
.mhd2 { display:flex; align-items:center; padding:10px 13px; border-bottom:1px solid var(--border); background:var(--surface-2); position:relative; min-height:42px; }
.mdate2 { font-family:var(--mono); font-size:10px; color:#9090a4; letter-spacing:.06em; }
.motm-pill { ... } /* per Q1 answer */
.macts { display:flex; align-items:center; gap:5px; margin-left:auto; }
.mact { width:28px; height:28px; ... }
.mact.da { color:var(--danger); }

/* Body grid */
.mbody2 { padding:12px 13px 10px; }
.mgrid2 { display:grid; grid-template-columns:1fr 80px 1fr; gap:6px; align-items:start; }

/* Team columns */
.mteamcol { display:flex; flex-direction:column; min-width:0; }
.mteamcol.r { /* mirror for Team B */ }
.mresl { /* WIN/LOSS label per Q2 answer */ }
.mresl.win { color:var(--win); }
.mresl.los { color:var(--danger); }
.mresl.nd { color:#9090a4; }

/* Player rows (per Q3 answer) */
.mplyr { display:flex; align-items:flex-start; gap:7px; margin-bottom:6px; }
.mplyr.r { flex-direction:row-reverse; }
.mplavi { width:24px; height:24px; border-radius:50%; ... }
.mplname-block { display:flex; flex-direction:column; min-width:0; flex:1; }
.mplnam { font-size:13px; font-weight:700; line-height:1.2; ... }
.mplnam.win-side { color:var(--text); }
.mplnam.los-side { color:#9090a4; }
.mplflag { font-size:11px; line-height:1.3; margin-top:2px; }

/* Score column (per Q4 answer) */
.mscols2 { display:flex; flex-direction:column; align-items:center; gap:7px; padding-top:2px; }
.mscpill2 { font-family:var(--mono); font-size:19px; font-weight:600; ... color:#2a2a2a; }
.mscpill2.win { color:var(--win); font-weight:700; }
.mtotal2 { font-family:var(--mono); font-size:10px; color:#9090a4; background:var(--surface-2); border-radius:var(--r-full); padding:2px 8px; margin-top:3px; }

/* Reaction bar */
.mreact { display:flex; align-items:center; gap:8px; padding:9px 13px; border-top:1px solid var(--border); flex-wrap:wrap; }
.rxpill { display:flex; align-items:center; gap:4px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-full); padding:5px 10px; font-size:13px; cursor:pointer; transition:all 150ms; }
.rxpill:hover { border-color:var(--accent-glow); transform:scale(1.08); }
.rxpill.on { background:var(--accent-dim); border-color:var(--accent-glow); }
.rxn { font-family:var(--mono); font-size:10px; color:#9090a4; }
```

---

## File-by-file JSX changes

### `src/components/MatchHistory.jsx` (~50% rewrite)

1. Season selector: replace inline `<select>` block (lines 84–90) with `<div className="mtbar">` containing `<div className="mtmeta">{N} matches · {seasonName}</div>` and the existing `<select>` styled as `.spill`
2. My-Pending block (96–132): refactor to `<div className="mlist">` of `<div className="mcard pending">` cards (per Q6=C). Collapsible header + chevron preserved.
3. Match card map (143–186): full `.mcard` markup with `.mhd2 > .mdate2 + .motm-pill + .macts` header, `.mbody2 > .mgrid2 > .mteamcol × 2 + .mscols2`, `.mreact`. Action buttons (`.mact`) use `<Icon name="share|edit|trash">` (continuing Phase 6c sweep).
4. New imports: `import Icon from './Icon'`, possibly `flagEmoji` (already imported via helpers).
5. Player avatar lookup: reuse PlayerStats's `getAvatar(pid)` pattern via passed prop OR inline lookup against `players` array.

### `src/components/MatchApprovalsQueue.jsx` (~60% rewrite)

1. Outer wrapper: `<h3>` heading + `.mlist` of `.mcard.pending` cards
2. Per-match card: `.mhd2` with "Submitted by X" date + (if MOTM) `.motm-pill`, `.mbody2 > .mgrid2 > .mteamcol × 2 + .mscols2`, then `.mreact`-style footer with the 3-col Approve/Edit/Reject buttons (per Q7=B keep text labels)
3. Approve/Reject buttons keep their distinct fill styling (green / red) but inside `.mreact`-like footer instead of separate grid

### `src/components/ScheduleView.jsx` (focused — ONLY upcoming/past lists)

1. Upcoming/Past tabs (lines 192–198): replace inline pill buttons with `<div className="seg">` 2-col segmented (per Q8=A), `+ Schedule` button moves to right side as separate `.spill`-styled action
2. Past challenge cards (`.played` filter): full `.mcard` adoption (per Q9=B) since they have scores
3. Upcoming challenge cards: scoped restyle — keep current accept/decline UI but apply card frame using `.mcard` wrapper, header band, team grid; no `.mscols2` (no scores), instead show date+time prominently
4. NOT touched: schedule form (`showForm`), inline log form (`loggingMatch`), TeamShuffler

---

## Pre-merge gate

1. **List prior tunings on these surfaces:**
   - MatchHistory: S028 (status column), S044 (My-Pending section, FT-09), S045 (incomplete merging into timeline, FT-09b), S047 (renames), S057 (season selector sync via Issue #40), S058 (skeleton flash gate via firstLoadRef — BUT that's loadLeagueData, not MatchHistory itself)
   - MatchApprovalsQueue: S044 (component creation), S045 (Save&Approve gate), S057 (no changes), S060 (no changes)
   - ScheduleView: S009 (BF-22 inline log), S026 (atomic RPC respond/join), S041 (LIVE engine — separate), S043 (BL/GD team-identity), S045 (FIP validator gate on log), S047 (Combos→Partners renames don't touch ScheduleView), nothing in S060+
2. **Diff every visual property** spec vs current — table above (24 rows). Classify spec-wins / prior-wins / **AMBIGUOUS → Q1–Q9**.
3. **Run `getComputedStyle` checks pre-PR-open** on `.mcard`, `.mhd2`, `.motm-pill`, `.mact`, `.mbody2`, `.mgrid2`, `.mteamcol`, `.mresl`, `.mplyr`, `.mplavi`, `.mplnam`, `.mscpill2`, `.mtotal2`, `.mreact`, `.rxpill` — confirm all tokens resolve.
4. **`grep` for short aliases** in the new CSS block + the 3 JSX files: `var(--rf|--acg|--acd|--mo|--ac|--rm|--brh|--s2|--s3|--tx|--fn|--mu|--mu2|--go|--br|--win|--los|--da)` → must be zero hits.
5. **`grep` for emoji glyphs** in the 3 JSX files post-edit: `📤|✏️|🗑️|⭐|✓|✕|✎|⏳|›` should reduce to: zero in MatchHistory action row (all swapped to Icon), zero in MatchApprovalsQueue button labels (✓/✕/✎ → optionally Icon if Q7=A; staying as text if Q7=B), zero in ScheduleView card actions (existing `📩 ⚡ 📅 ✕ ✓` checked).
6. **Avatar prop wiring:** confirm `players` array is available in all 3 surfaces for `getAvatar(pid)` lookup (MatchHistory: via `useLeague` already; MatchApprovalsQueue: via `useLeague` already; ScheduleView: passed as prop).
7. **Don't touch out-of-scope surfaces:** confirm via `git diff` that `LogMatch.jsx`, `EditMatchModal.jsx`, `TeamShuffler.jsx`, `LIVE` mode are unchanged.

---

## DoD checklist

- [ ] Q1–Q9 answered by user
- [ ] Phase 7 CSS block appended to `src/index.css` using LONG token names only
- [ ] All `.mcard / .mhd2 / .motm-pill / .macts / .mact / .mbody2 / .mgrid2 / .mteamcol / .mresl / .mplyr / .mplavi / .mplname-block / .mplnam / .mplflag / .mscols2 / .mscpill2 / .mtotal2 / .mreact / .rxpill / .rxn / .mtbar / .mtmeta / .mlist` rules render correctly via getComputedStyle
- [ ] MatchHistory match-card map refactored to `.mcard` markup
- [ ] MatchHistory action buttons use `<Icon>` SVGs (`share` / `edit` / `trash`) per Phase 6c continuation
- [ ] MatchHistory My-Pending cards use `.mcard.pending` per Q6 answer
- [ ] MatchHistory season selector restyled in `.mtbar > .spill` per spec
- [ ] MatchApprovalsQueue cards refactored to `.mcard.pending` (frame only, action labels preserved per Q7=B)
- [ ] ScheduleView Upcoming/Past tabs use `.seg/.sb` per Q8=A
- [ ] ScheduleView past challenges use `.mcard` per Q9=B
- [ ] ScheduleView upcoming challenges use shallow `.mcard`-wrapped layout (no `.mscols2`, custom date+RSVP body)
- [ ] Schedule form / log form / TeamShuffler untouched
- [ ] No `var(--rf|--acg|--mo|--rm|--mu2|--ac|--brh|--s2|--s3|--fn|--mu|--go|--win|--los|--da|--br|--tx)` aliases in new CSS block
- [ ] Local Vite preview: drill into 3 different match cards (complete with MOTM, complete without MOTM, incomplete) — all render correctly; My-Pending block expands/collapses; admin-mode approvals queue renders for admins only
- [ ] iPhone smoke gate: pill spring + reaction bar interactions + horizontal scroll behavior
- [ ] SW bumped v94 → v95
- [ ] Vercel preview READY before user iPhone smoke-test

---

## Branch + SW progression

| PR | Branch | SW | Surface |
|----|--------|-----|---------|
| 7 | `feat/46-phase7-match-cards` | v94 → v95 | MatchHistory + MatchApprovalsQueue + ScheduleView (upcoming/past lists only) |

---

## Rollback plan

All changes scoped to:
- CSS additions in append-only block at end of `src/index.css` (Phase 7 block)
- JSX rewrites in MatchHistory.jsx + MatchApprovalsQueue.jsx + ScheduleView.jsx (specific line ranges, no shared utility extraction)

`git revert <merge-commit>` cleanly restores prior state on all three components.

---

## Hand-off

After Phase 7 ships green:
- **Phase 8 prereq for filter pills** — add `gender` column to `players` (DB migration), capture in EditPlayerModal + EditMyProfile + onboarding (deferred user request from S065)
- **Phase 8** — Players section gender filter pills (All / Men / Women) + sliders icon header button
- **Phase 9 candidate** — LogMatch.jsx + EditMatchModal.jsx restyle (paired since they share form patterns)
- **Phase 10 candidate** — Tournament screens (GameMode.jsx, BracketSVG.jsx, AmericanoMode.jsx, SingleElimination.jsx, DoubleElimination.jsx, RoundRobin.jsx)
- **Phase 11 (locked)** — Login + 3-step Onboarding rewrite with new DB schema (gender + DOB capture wraps into here)
