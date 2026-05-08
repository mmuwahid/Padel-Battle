# Issue #46 Phase 6 — Analytics Drill-In + Analytics Views Restyle

**Status:** DRAFT — awaiting user answers to AMBIGUOUS questions before any implementation.
**Branches:** `feat/46-phase6a-drill-in-profile` then `feat/46-phase6b-analytics-views` (split — see Strategic Split below).
**SW:** v89 → v90 (PR1 / Phase 6a) → v91 (PR2 / Phase 6b).
**Files touched:** `src/components/PlayerStats.jsx` (603 lines, lines 162–206 in 6a + 217–490 in 6b) + `src/index.css` (Phase 6a CSS block + Phase 6b CSS block).
**Spec reference:** `padelhub/docs/PadelHub_Complete_v2.jsx`
- Phase 6a: lines 1694–1768 (`ProfileScreen`) + CSS lines 368–425 (`.prohero/.propic/.proname/.prorole/.protags/.protag/.proedit/.prostrip/.prosc/.wrsec/.hlrow/.elosec/.achsec/.recsec`).
- Phase 6b: **no spec equivalent.** Spec's `PlayersScreen` (line 1273) has the segmented control with "Analytics" tab but no body — only "Players" content is implemented. Phase 6b is discretionary, reuses spec idioms.

---

## Strategic split: why two PRs, not one

This phase touches the LARGEST surface in #46 so far. PlayerStats.jsx is 603 lines, with two visually distinct surfaces inside it:

1. **Drill-in player profile** (lines 162–206) — opens when `sp` (selected player) is non-null. Clicking a roster row triggers `setSp(p.id)`. Shows hero card + flash cards + achievements + H2H teaser.
2. **Analytics views** (lines 217–490) — opens when `sp===null && subTab==="analytics"`. Four sub-sections: League / Partners / H2H / Insights.

**Spec coverage asymmetry:**
- Drill-in profile has a strong analog (spec's `ProfileScreen` class block — `.prohero/.propic/.prostrip/.wrsec/.hlrow/.elosec/.achsec/.recsec`). Most visual decisions are pre-made by the spec.
- Analytics views have NO spec — spec's `Players → Analytics` sub-tab is a placeholder button. Phase 6b is **fully discretionary visual design**, reusing spec card / `.sectitle` / monospace number idioms but no direct mapping.

Bundling both into one PR would mix "porting spec verbatim" with "inventing new design" — exactly the failure mode that S060 fix-cycle taught us. Phase 4 (Ranking) and Phase 5 (Roster) succeeded because spec coverage was complete. Phase 6 needs the split.

**Phase 6a (PR1):** Drill-in profile only. Lower risk (spec-driven), well-defined DoD.
**Phase 6b (PR2):** Analytics views. Requires user direction on visual treatment for League/Partners/H2H/Insights — these are NOT spec-derivable.

PR2 only opens after PR1 ships green and user confirms 6b direction.

---

## Why this is THE most careful phase yet

Surface size + spec asymmetry combined:

- PlayerStats.jsx has 6 prior tuning sessions: **S046 v1** (drill-in flash cards layout), **S047** (effectiveness/MOTM rename), **S050** (CountrySelect / flag rendering — country flag in drill-in), **S052** (`getAvatar` helper + 8 avatar slots write-through), **S053** (Best/Worst Pairs both-avatars layout, worst-pair gate dropped), **S062** (Phase 5 — segmented control + roster restyle, analytics views untouched).
- Drill-in profile has 18+ inline-styled DOM nodes per render with no shared CSS class names.
- Analytics views have ~50+ inline-styled nodes across 4 sub-views.
- Spec's `ProfileScreen` is for the USER's own profile (My Profile) — Phase 6a applies that visual language to ANY clicked player, which is a spec extrapolation, not a spec port.

**Out of scope for Phase 6 (held for later phases):**
- ELO history bar chart on drill-in profile (`.elosec/.elocard/.elobars/.elobarcol/.elobar/.elodate`) — needs ELO time-series data we don't currently track per-player. Defer to Phase 7+ (FT-XX ELO history feature).
- Achievements grid restyle to spec's `.achgrid/.achcard/.achiw/.achn/.achd/.achlk` — current ACHS list works; spec adds a "locked" visual state we don't have data for. Recommend: keep current achievement UX in 6a, restyle later.
- "Recent Matches" section (`.recsec/.recrow/.resbadge/.recbody/.recteams/.recscore/.recdate/.vab`) — drill-in profile currently doesn't show recent matches, only H2H. Spec's `ProfileScreen` shows recent. **Q4 below — surface to user.**
- The roster Phase 5 surface (lines 504+) — already shipped in S062, untouched in Phase 6.
- Pairs-format rendering on H2H/Partners views — defer to FT-15 Pairs Leaderboard.
- ProfileView (My Profile / claimedPlayer self-view) — different file, different surface. Tracked separately.

---

## ═══════════════════════════════════════════════════════════════
## PHASE 6a — DRILL-IN PROFILE RESTYLE
## ═══════════════════════════════════════════════════════════════

### Diff analysis (spec vs current live)

Mapping spec's `ProfileScreen` (line 1694) to current drill-in profile (PlayerStats.jsx lines 162–206).

| Property | Spec (`ProfileScreen`) | Current live (drill-in) | Classify | Notes |
|----------|------------------------|--------------------------|----------|-------|
| Back button | `<AppHeader onBack title="Profile" onAvi={false}/>` (in-header back arrow) | `← All Players` text button above hero card | **AMBIGUOUS — Q1** | spec-style header back vs in-content back |
| Hero card layout | `.prohero` flex column with `::before` radial-gradient halo | inline-styled bordered card with avatar centered | spec-wins | gives the drill-in a "destination" feel |
| Avatar size + shape | `.propic` 96×96 rounded square (`var(--rf)`), 3px border, 36px initial | 64×64 circle (50%), 2px border, 28px initial | **AMBIGUOUS — Q2** | spec is 50% larger square; live is smaller circle. Cross-screen consistency: header avatar is circle, ranking avatars are circle. |
| Avatar gradient bg | `linear-gradient(135deg,#1a3a26,#0d1f14)` (dark green) | `linear-gradient(135deg,${A}25,${A}08)` (translucent green) | spec-wins | richer; matches `.propic` |
| Camera button overlay | `.procb` absolute corner button with camera icon | absent | **prior-wins (defer)** | drill-in is for VIEWING others' profiles; can't upload their photos. Camera button only on My Profile (ProfileView.jsx). Phase 6a does NOT add this. |
| Player name | `.proname` 24px / 800 / non-italic | inline 22px / 800 / non-italic | spec-wins | one notch larger to match hero scale |
| Email row | `.proemail` 13px / muted | absent (drill-in shows nickname instead) | **prior-wins** | drill-in is for OTHER players; email is private. Show nickname (`"…"`) instead — keep current |
| Role badge | `.prorole` accent-tinted pill with admin icon | absent | **AMBIGUOUS — Q3** | should drill-in show admin/owner role? Useful for context |
| Tags row | `.protags > .protag × N` country/playing-side pills | inline flex with flag + ISO3 only when set | spec-wins | restructure to `.protags` markup; add playing-position tag when `playing_position` set (S050) |
| Edit button | `.proedit` (opens EditSheet) | absent | **prior-wins** | drill-in is read-only; admin edits via roster's edit-mode pencil. Phase 6a does NOT add this. |
| Stats strip | `.prostrip` 3-col grid (Won/Lost/ELO) with `.prosc/.proscl/.proscv` | 2-stat row (ELO + Effectiveness%) inside hero card | **AMBIGUOUS — Q4** | spec has 3 stats below the hero; live has 2 inside. Different layout entirely. |
| Win rate bar | `.wrsec/.wrh/.wrl/.wrp/.wrbg/.wrf` horizontal progress bar | absent | **AMBIGUOUS — Q4** | spec adds; live doesn't. Useful viz |
| Highlight cards | `.hlrow > .hlcard × 2` (Best Streak / MOTM) with big number + unit | 2/3 of the second flash-card row (`Cons. Wins` + `MOTM`) | partial spec-wins | reuse spec's `.hlrow/.hlcard/.hll/.hlv/.hlu` markup; keep `Match Diff` as 3rd cell or drop it |
| Form strip (last 5) | absent in spec | `<FD f={getForm(sp)}/>` inside hero card | **prior-wins** | last-5 form is part of drill-in identity; preserve verbatim |
| Match Played / Won / Lost trio | absent in spec (covered by `.prostrip`) | 3-col grid above the `Cons.Wins/MOTM/Diff` row (lines 182–184) | **AMBIGUOUS — Q4** | redundant with spec's `.prostrip` (Won + Lost) but adds Match Played |
| Achievements section | `.achsec/.achgrid/.achcard/.achiw/.achn/.achd/.achlk` 2-col cards with locked state | current 2-col grid `(${u?GD}10:BG)` cards with opacity-fade locked state | partial spec-wins | similar 2-col layout; spec uses Icon component, live uses emoji. **Recommend: defer to a later micro-phase**, keep current verbatim in 6a |
| H2H section | absent in spec drill-in (spec only has My Profile, no other-player drill-in) | inline-styled list at bottom of profile | **prior-wins** | drill-in's signature feature; preserve verbatim |
| ELO history chart | `.elosec/.elocard/.elobars/.elobarcol/.elobar/.elodate` mini bar chart | absent | **prior-wins (defer to Phase 7)** | requires ELO time-series data |
| Recent Matches | `.recsec/.recrow/.resbadge/.recbody/.recteams/.recscore/.recdate/.vab` list with View All button | absent | **AMBIGUOUS — Q5** | useful add OR scope creep; depends on user direction |

### Open questions for user — Phase 6a (BEFORE implementation)

**Q1: Back button placement on drill-in profile?**
- A. Keep `← All Players` text button above hero card (current — explicit, no header dependency)
- B. Reuse AppHeader pattern with `onBack` left-chevron button (spec-style, cleaner top, but requires header refactor for the drill-in route — bigger scope)
- **Recommendation:** A. AppHeader is shared across the whole app and Phase 6 should not touch it.

**Q2: Avatar size + shape on drill-in profile?**
- A. Keep 64×64 **circle** (current — matches header avatar, ranking avatars, all other on-screen avatars; cross-screen consistency)
- B. Adopt spec 96×96 **rounded square** `var(--r-md)` 12px (50% larger; gives the drill-in a "destination" feel; diverges from rest of app's circle-only convention)
- C. Hybrid: 96×96 **circle** (bigger but still circle — matches consistency)
- **Recommendation:** C. Bigger feels right for drill-in scale; circle keeps cross-screen consistency.

**Q3: Show role badge (Admin / Owner) on drill-in profile?**
- A. Yes — useful context for who's an admin in your league. Spec puts it directly under the name (`.prorole`).
- B. No — drill-in is for STATS, not admin context. Keep clean.
- **Recommendation:** A. Cheap to add (data already on `league_members.role`); aids social context.

**Q4: Stats layout on drill-in profile — which arrangement?**
- A. **Spec verbatim**: `.prostrip` (Won / Lost / ELO 3-col) + `.wrsec` (win-rate horizontal progress bar) + `.hlrow` (Best Streak / MOTM 2-col) — drops Match Played, drops Match Diff, drops Effectiveness%
- B. **Hybrid (preserve current data points, restyle)**: keep current 6-stat layout (ELO + Effectiveness in hero, then Match Played / Won / Lost / Cons.Wins / MOTM / Diff in two 3-col grids) but apply `.prostrip/.prosc/.proscl/.proscv` markup
- C. **Spec primary, append current extras**: `.prostrip` (Won / Lost / ELO) + `.wrsec` (win-rate bar) + `.hlrow` (Best Streak / MOTM) + a third row for Match Played + Match Diff + Effectiveness%
- **Recommendation:** B. Preserves all 6 metrics that have proven value across S046/S047/S050 sessions; just restyles the markup.

**Q5: Add "Recent Matches" section to drill-in profile?**
- A. Yes — match the spec's `.recsec` (last ~5 matches with WIN/LOSS badge + score + date)
- B. No — keeps drill-in tight; H2H section already shows match-context-by-opponent
- C. Defer to Phase 7 micro-phase
- **Recommendation:** B. Keeps drill-in focused; users can find matches via Matches tab.

---

### Phase 6a CSS additions to `src/index.css` (NEW Phase 6a block)

Tokens required (all exist in Phase 1; LONG names only — Lesson #70):
- `var(--surface)`, `var(--surface-2)`, `var(--border)`, `var(--accent)`, `var(--accent-glow)`, `var(--accent-dim)`, `var(--text)`, `var(--mono)`, `var(--font)`, `var(--r-sm)`, `var(--r-md)`, `var(--r-lg)`, `var(--r-full)`, `--gold`, `--win`, `--danger`
- Hardcoded `#9090a4` for muted text where Phase 1 token resolves wrong (matches Phase 4/5 convention)
- DO NOT use spec short aliases — `var(--rf)/--acg/--acd/--mo/--ac/--rm/--brh/--s2/--tx/--fn/--mu/--go/--br` should NOT appear in this block

```css
/* ─── Phase 6a — Drill-in Player Profile ─────────────────────────────── */

/* Hero block — spec .prohero */
.dpro{display:flex;flex-direction:column;align-items:center;padding:28px 20px 20px;position:relative;}
.dpro::before{content:'';position:absolute;top:0;left:0;right:0;height:180px;background:radial-gradient(ellipse 80% 100% at 50% 0%,rgba(74,222,128,.06),transparent 70%);pointer-events:none;}
.dpro-back{align-self:flex-start;background:none;border:none;color:var(--accent);font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;margin-bottom:12px;display:flex;align-items:center;gap:4px;position:relative;z-index:1;}
.dpro-pic{width:96px;height:96px;border-radius:50%;border:3px solid var(--accent-glow);background:linear-gradient(135deg,#1a3a26,#0d1f14);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:var(--accent);overflow:hidden;position:relative;z-index:1;margin-bottom:12px;}
.dpro-pic img{width:100%;height:100%;object-fit:cover;}
.dpro-name{font-size:24px;font-weight:800;margin-bottom:3px;position:relative;z-index:1;}
.dpro-nick{font-size:13px;color:#9090a4;margin-bottom:8px;position:relative;z-index:1;}
.dpro-role{display:flex;align-items:center;gap:5px;background:var(--accent-dim);border:1px solid var(--accent-glow);border-radius:var(--r-full);padding:3px 10px;font-family:var(--mono);font-size:10px;color:var(--accent);margin-bottom:12px;position:relative;z-index:1;}
.dpro-tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:14px;position:relative;z-index:1;}
.dpro-tag{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-full);padding:5px 12px;font-size:12px;font-weight:600;}
.dpro-form{position:relative;z-index:1;margin-top:2px;}

/* Stats strip — spec .prostrip + .prosc */
.dpro-strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 18px 14px;}
.dpro-sc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:14px 8px;text-align:center;}
.dpro-scl{font-size:10px;color:#9090a4;font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px;}
.dpro-scv{font-family:var(--mono);font-size:24px;font-weight:800;color:var(--text);}
.dpro-scv.win{color:var(--accent);}
.dpro-scv.loss{color:var(--danger);}
.dpro-scv.elo{color:var(--accent);}

/* Win rate bar — spec .wrsec */
.dpro-wr{padding:0 18px 14px;}
.dpro-wrh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.dpro-wrl{font-size:11px;color:#9090a4;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.dpro-wrp{font-family:var(--mono);font-size:18px;font-weight:800;color:var(--accent);}
.dpro-wrbg{height:6px;background:var(--surface-2);border-radius:var(--r-sm);overflow:hidden;}
.dpro-wrf{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-glow));border-radius:var(--r-sm);transition:width 600ms var(--ease-spring);}

/* Highlight cards — spec .hlrow + .hlcard */
.dpro-hlrow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 18px 14px;}
.dpro-hl{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:14px 10px;text-align:center;}
.dpro-hll{font-size:10px;color:#9090a4;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;}
.dpro-hlv{font-family:var(--mono);font-size:26px;font-weight:800;color:var(--text);}
.dpro-hlv.gold{color:var(--gold);}
.dpro-hlv.diff-pos{color:var(--accent);}
.dpro-hlv.diff-neg{color:var(--danger);}
.dpro-hlu{font-family:var(--font);font-size:10px;color:#9090a4;font-weight:500;margin-left:4px;}

/* Achievements + H2H section frames */
.dpro-sec{padding:0 18px 14px;}
.dpro-sectitle{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px;color:var(--text);}
.dpro-sectitle.gold{color:var(--gold);}
.dpro-sec-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;}
.dpro-h2h-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(42,42,58,.4);}
.dpro-h2h-row:last-child{border-bottom:none;}
.dpro-h2h-name{font-size:14px;font-weight:600;color:var(--text);}
.dpro-h2h-rec{display:flex;gap:12px;font-family:var(--mono);font-size:13px;font-weight:700;}
.dpro-h2h-w{color:var(--accent);}
.dpro-h2h-l{color:var(--danger);}
```

### JSX changes to `src/components/PlayerStats.jsx` (lines 162–206)

Assuming spec-leaning answers Q1=A / Q2=C / Q3=A / Q4=B / Q5=B:

1. Replace `← All Players` text button: `<button className="dpro-back" onClick={()=>setSp(null)}><Icon name="chevron-left" size={16}/>All Players</button>`
2. Hero block restyled with `.dpro/.dpro-pic/.dpro-name/.dpro-nick/.dpro-role/.dpro-tags/.dpro-tag/.dpro-form` markup. Avatar swapped to circle 96px (Q2=C). Role badge added when `claimedPlayer.id !== sp` viewer is admin AND target is admin/owner — gated on having member role data; skip if not provided as prop.
3. Stats strip: 3-col `.dpro-strip` with `Won` / `Lost` / `ELO` using `.dpro-sc/.dpro-scl/.dpro-scv` (`.win/.loss/.elo` modifiers).
4. Win rate bar: `.dpro-wr` with `.dpro-wrh > .dpro-wrl + .dpro-wrp` + `.dpro-wrbg > .dpro-wrf` styled width.
5. Highlights row: 3-col `.dpro-hlrow` with `Cons. Wins` / `MOTM` (gold modifier) / `Match Diff` (diff-pos/diff-neg modifier).
6. Achievements section: `.dpro-sec` wrapping current achievement grid markup verbatim — only outer container restyled. `.dpro-sectitle.gold` for the heading.
7. H2H section: `.dpro-sec-card` with `.dpro-h2h-row > .dpro-h2h-name + .dpro-h2h-rec > .dpro-h2h-w + .dpro-h2h-l` markup.
8. Form strip stays inside hero block as-is (uses existing `<FD>` component — NOT touching).
9. Effectiveness% — moved from hero into the stats strip OR dropped if Q4=A. Per Q4=B recommendation: keep Effectiveness inside the hero card as a tertiary stat under name+role+tags BEFORE the stats-strip OR re-include as a 4th cell in `.dpro-hlrow`. **Final placement: surface to user as Q4 sub-question.**

### Pre-merge gate — Phase 6a

1. **List prior tunings:** S046 v1 (drill-in flash-cards layout), S047 (effectiveness/MOTM rename), S050 (country flag in drill-in), S052 (avatar img tag in 8 slots), S053 (no direct change to drill-in but pair-card layout precedent).
2. **Diff every visual property** against spec — table above (18 rows).
3. **Classify** — 5 AMBIGUOUS rows with 5 questions (Q1–Q5). All other rows pre-classified.
4. **Run `getComputedStyle` checks pre-PR-open** on `.dpro`, `.dpro-pic`, `.dpro-name`, `.dpro-role`, `.dpro-strip`, `.dpro-sc`, `.dpro-wrf`, `.dpro-hl`, `.dpro-h2h-row` — confirm all tokens resolve.
5. **`grep` for short aliases** in PlayerStats.jsx and the new CSS block: `var(--rf)/--acg/--acd/--mo/--ac/--rm/--brh/--s2/--tx/--fn/--mu/--go/--br|--ac15|--ac08|--A25|--A50|GD15|DG15` — must be zero hits in the new block.
6. **Don't bundle Phase 6b in this PR.** Analytics views section (subTab==="analytics") stays inline-styled until 6b ships. Confirm by `grep -n "analyticsSection===" PlayerStats.jsx` — every match must still use inline styles in this PR.

### DoD checklist — Phase 6a (16 items)

- [ ] Q1/Q2/Q3/Q4/Q5 answered by user
- [ ] Phase 6a CSS block appended to `src/index.css` using LONG token names only
- [ ] Drill-in `← All Players` button uses `.dpro-back` markup
- [ ] Hero block uses `.dpro/.dpro-pic/.dpro-name` markup; avatar 96×96 circle (per Q2=C)
- [ ] Nickname row uses `.dpro-nick` when present
- [ ] Role badge `.dpro-role` rendered when target player has admin/owner role (per Q3=A)
- [ ] Tags row uses `.dpro-tags > .dpro-tag` markup with country + playing-position chips
- [ ] Form strip preserved inside hero block (`<FD>` untouched)
- [ ] Stats strip uses `.dpro-strip > .dpro-sc × 3` for Won / Lost / ELO (per Q4=B)
- [ ] Win rate bar uses `.dpro-wr` markup; `.dpro-wrf` width animates from 0 → wp%
- [ ] Highlights row uses `.dpro-hlrow > .dpro-hl × 3` for Cons.Wins / MOTM / Match Diff
- [ ] Effectiveness% placement confirmed (per Q4 sub-answer)
- [ ] Achievements section wrapped in `.dpro-sec` (inner grid preserved)
- [ ] H2H section uses `.dpro-sec-card > .dpro-h2h-row × N` markup
- [ ] No `var(--rf)/--acg/--acd/--mo/--ac/--rm/--brh/--s2/--tx/--fn/--mu/--go/--br` aliases in new block (Lesson #70 audit)
- [ ] Local Vite preview: drill into 3 different players (claimed self, other admin, regular member) — all render correctly; Effectiveness%, ELO, Won/Lost, Cons.Wins, MOTM, Match Diff values match prior screen
- [ ] Phase 6b scope not touched (analytics views still inline-styled)
- [ ] SW bumped v89 → v90
- [ ] Vercel preview READY before user iPhone smoke-test

---

## ═══════════════════════════════════════════════════════════════
## PHASE 6b — ANALYTICS VIEWS RESTYLE (League / Partners / H2H / Insights)
## ═══════════════════════════════════════════════════════════════

> **DRAFT-ONLY in this plan.** Phase 6b only opens AFTER 6a ships green AND user confirms 6b direction.

### Spec coverage: NONE

Spec's `PlayersScreen` (line 1273) renders `<button className="sb">Analytics</button>` without a body. There is no spec for:
- 4-section sub-tab pill bar (📈 League / 🤝 Partners / ⚔️ H2H / 💡 Insights)
- League-wide stats grid (Total Matches / Close Games)
- Most Active / Highest Win Rates / Most Competitive Matchups list cards
- League Activity monthly bar chart
- Best Pairs / Worst Pairs cards (S053 layout)
- All Partnerships list with progress bars
- H2H player-pair selector + record card + As Partners / As Opponents split
- MOTM Ranking list
- Biggest Wins list

This phase invents a visual treatment from spec primitives (`.sectitle`, card frames, monospace numbers, accent/danger color encoding) but is not spec-derivable.

### Phase 6b open questions for user (BEFORE drafting)

**Q6: 4-section sub-tab style?**
- A. Inline-style status quo (1px-border + 15% accent fill on active)
- B. Reuse Phase 5's `.seg/.sb/.sb.on` segmented control (consistent with Players/Analytics outer toggle)
- C. New `.afilter-bar` filter-pill bar (like Phase 5's `.gfilter-bar/.gfpill`)

**Q7: List card frame — single style or per-section accent?**
- A. Uniform `.an-card` frame across all 4 sections
- B. Per-section accent: League=accent green, Partners=accent green for best/danger red for worst, H2H=blue, Insights=gold
- C. Match drill-in's `.dpro-sec-card` style (consistency with Phase 6a)

**Q8: League Activity chart — visual treatment?**
- A. Keep current vertical bar chart with axis labels
- B. Switch to spec's `.elobars/.elobar` style (no axis, gradient bars, dates below)
- C. Drop the chart — replace with simple 6-month total counter

**Q9: H2H sub-view — selector style?**
- A. Keep current native `<select>` dropdowns
- B. Convert to bottom-sheet picker (like Phase 5's drill-in could trigger)
- C. Convert to inline player-card grid (tap to select Player 1, then Player 2)

**Q10: Insights — what to keep vs cut?**
- Currently shows: MOTM Awards / Close Games stats; MOTM Ranking; Biggest Wins
- A. Keep all three
- B. Cut Biggest Wins (overlap with Match Played in Match History)
- C. Keep all + add: Comeback Wins, Longest Streak Active, etc.

### Phase 6b will be re-planned after Phase 6a ships

Hold this section as a placeholder — DO NOT BUILD until 6a is verified live AND Q6–Q10 answered.

---

## ═══════════════════════════════════════════════════════════════
## PHASE 6c — HEADER BELL + SIDEBAR ICON SWEEP
## ═══════════════════════════════════════════════════════════════

> Surfaced after user noticed sidebar emoji icons + header bell still emoji-rendered post-Phase-2.

### Why this exists

Phase 1 created `Icon.jsx` (56 SVG cases) but was deliberately a visual no-op — Icon was defined, not adopted. Phase 2 refactored AppHeader STRUCTURE (markup + tokens) and adopted `<Icon name="plus">` for the FAB but kept the bell + refresh glyphs as emoji/text. Phases 3-5 swapped icons inside their own surfaces (eye/eye-off in login, search/chevron in roster) but never touched the sidebar or the header bell.

This is the cleanup pass. Low-risk: pure JSX swaps, no CSS additions, no markup restructuring.

### Inventory + mapping

**`src/App.jsx` header block (lines 870–874):**

| # | Current | Location | New |
|---|---------|----------|-----|
| 1 | `↻` (text glyph) | `.ibtn` refresh button line 870 | `<Icon name="refresh" size={16}/>` |
| 2 | `🔔` (emoji) | `.ibtn` notifications button line 872 | `<Icon name="bell" size={16}/>` (existing `.ndot` badge wrapper preserved) |

**`src/components/Sidebar.jsx`:**

| # | Current | Location | New |
|---|---------|----------|-----|
| 3 | `✕` | close button line 33 | `<Icon name="close" size={18}/>` |
| 4 | `›` | profile-link chevron line 43 | `<Icon name="chevron" size={14}/>` |
| 5 | `🏟️ Leagues` | leagues button line 62 | `<Icon name="league" size={14}/> Leagues` |
| 6 | `📩 Invite Players` | invite button line 64 | `<Icon name="user-plus" size={14}/> Invite Players` |
| 7 | `📖 Official Rules` | rules button line 73 | `<Icon name="book" size={14}/> Official Rules` |
| 8 | `⚙️ Settings` | settings button line 76 | `<Icon name="settings" size={14}/> Settings` |
| 9 | `📲 Install App` | install button line 80 | `<Icon name="share" size={14}/> Install App` |
| 10 | `📲` | iOS hint block line 84 | `<Icon name="share" size={12}/>` (inline before "To install:") |

**All 10 mapped cases exist in current `Icon.jsx`** (verified via grep against the 56-case switch). Zero new SVG paths needed.

### Out of scope for 6c

- Bottom-nav artwork (`<NavIcon>` from NavIcons.jsx) — **FROZEN** per `feedback_nav_icons_frozen.md`
- Sidebar avatar circle (the user-image fallback initial letter) — that's not an icon, it's a name initial
- "Sign Out" button — text-only; no icon
- Sidebar header section labels ("LEAGUE" / "APP") — section titles, not icons
- "No league selected" italic text — placeholder string

### JSX changes

`App.jsx` lines 870, 872 — replace text/emoji content of `.ibtn` button bodies. Preserve `aria-label`, click handlers, conditional class for `.on` state, `.ndot` badge child for the bell.

`Sidebar.jsx` — insert `<Icon>` import at top:
```jsx
import { Icon } from './Icon';
```
Then replace each emoji-prefixed string with an inline `<Icon>` followed by the label text. Keep button styles unchanged. The Icon `color` prop defaults to `currentColor` so it inherits the button's text color (already accent-styled for active state).

### Pre-merge gate — Phase 6c

1. **List prior tunings:** S057 NavIcons frozen rule, S063 LeaguesView (sidebar consumer expects `setSidebarView("leagues")` route — routing untouched).
2. **No CSS additions** — pure JSX swaps. Confirm via `git diff` that index.css is unchanged.
3. **`grep` for emoji** in App.jsx header block + Sidebar.jsx after edit — `↻|🔔|✕|›|🏟️|📩|📖|⚙️|📲` should match zero in `App.jsx:855-880` and zero in `Sidebar.jsx`.
4. **Visual regression check** — local Vite preview: open sidebar, every entry renders an SVG icon to the LEFT of the label, aligned via existing `display:flex; align-items:center; gap:` styles (current sidebar buttons already use `gap` between flex children for emoji+text — same pattern works for `<Icon>`+text).
5. **Header `.ibtn`** — confirm refresh + bell render correctly via `getComputedStyle`. Icon `currentColor` should resolve to the button's color (text white).
6. **Don't touch the bottom nav** — `NavIcons.jsx` permanent freeze. Confirm no edits to `App.jsx:1323-1342` (the `<nav className="bnav">` block).

### DoD checklist — Phase 6c (10 items)

- [ ] `Icon` imported into Sidebar.jsx
- [ ] App.jsx header refresh button uses `<Icon name="refresh" size={16}/>`
- [ ] App.jsx header bell button uses `<Icon name="bell" size={16}/>` with `.ndot` badge preserved
- [ ] Sidebar close button uses `<Icon name="close" size={18}/>`
- [ ] Sidebar profile-link chevron uses `<Icon name="chevron" size={14}/>`
- [ ] Sidebar Leagues / Invite / Rules / Settings / Install entries render `<Icon>` + label with existing `display:flex; gap:` button styling
- [ ] iOS install hint block leads with `<Icon name="share"/>` instead of `📲`
- [ ] Zero emoji characters in App.jsx:855-880 and Sidebar.jsx (grep audit)
- [ ] Zero touches to `<nav className="bnav">` block (NavIcons freeze respected)
- [ ] Local preview: sidebar opens, all 7 entries show SVG icons; header refresh + bell render SVGs; click handlers still fire
- [ ] SW bumped (per ordering: v90 → v91 if 6c follows 6a; v91 → v92 if it follows 6b)
- [ ] Vercel preview READY before user iPhone smoke-test

### Rollback plan

`git revert <merge-commit>` restores emoji glyphs cleanly. Pure JSX changes scoped to two files (App.jsx + Sidebar.jsx); no CSS, no schema, no behavioural change.

---

## Branch + SW progression

| PR | Branch | SW | Surface |
|----|--------|-----|---------|
| 6a | `feat/46-phase6a-drill-in-profile` | v89 → v90 | drill-in profile (lines 162–206) |
| 6c | `feat/46-phase6c-icon-sweep` | v90 → v91 | header bell/refresh + sidebar icons |
| 6b | `feat/46-phase6b-analytics-views` | v91 → v92 | analytics views (lines 217–490) |

**Ordering rationale:** 6a first (highest spec coverage, lowest risk). 6c second (cleanup pass — restores design-system consistency before tackling discretionary 6b). 6b last (largest discretionary surface, benefits from polished icon language already in place).

**Each branch** off `main` after the previous PR squash-merges.

---

## Rollback plan

Both PRs are append-only CSS + isolated JSX edits in PlayerStats.jsx. If iPhone smoke-test exposes regression on either:
- `git revert <merge-commit>` on main restores prior state
- CSS additions (Phase 6a or 6b block) are at end of `src/index.css` — `git revert` removes cleanly
- PlayerStats.jsx JSX changes are scoped to specific line ranges (162–206 for 6a, 217–490 for 6b) — no shared utility extraction in either PR

---

## Hand-off

- After 6a ships green: re-confirm Phase 6b direction with user using Q6–Q10 above
- After 6b ships green: Phase 7 candidate is **Match cards restyle** (`MatchHistory.jsx + MatchApprovalsQueue.jsx + ScheduleView.jsx`) using spec's `.mcard/.mtbar/.mtmeta/.spill/.mlist` classes (lines 1376+ in `PadelHub_Complete_v2.jsx`)
