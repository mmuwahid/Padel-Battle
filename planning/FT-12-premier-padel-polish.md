# FT-12 — Premier Padel UI Polish (Issue #12)

**Issue:** github.com/mmuwahid/Padel-Battle/issues/12
**Approved mockup:** `padelhub/public/mockup-issue12.html` (do NOT ship to prod — `rm` before commit per S043)
**Session:** S046
**Author:** mmuwahid (m.muwahid@gmail.com)
**Status:** Plan — awaiting user approval

---

## Goal

Apply Premier Padel-aligned visual polish to the PadelHub app shell + Players tab + Player Management roster. Keep all behavior, data, and routes identical. **No DB migrations.** Country/position fields (Issue #11) ship separately — Frame 3 in the mockup shows the post-#11 final state for reference; FT-12 ships without flags/position on roster rows.

## Locked design decisions (from mockup review)

| Element | Decision |
|---|---|
| Accent color | Green `#4ADE80` (unchanged from current `A` token) |
| Display font | Outfit Italic 900 — already loaded, just apply via `font-style: italic` + `font-weight: 900` + `text-transform: uppercase` |
| Header | Background gradient extends UNDER status bar / dynamic island, no border-bottom separator |
| Players list | 2-column grid, avatar + italic name, ELO/WR hidden (move to Ranking tab in Issue #11) |
| Players sub-tabs | Existing Players / Analytics tab structure preserved |
| Player profile (drill-in) | Current layout preserved exactly. **FT-12 change:** add country flag + ISO-3 slot in top card (markup visible, empty until #11 fills data — avoids future layout shift). All 6 flash cards (Games Played / Wins / Losses / Streak / ⭐ MOTM / Match Diff), Achievements bar, and H2H section unchanged. **Renames deferred to #11.** |
| Admin roster | Premier Padel-styled rows — italic name + role badge + inline edit/delete — flag/position fields deferred to #11 |
| Bottom nav | Floating rounded pill, accent thin border, side gutters, "+" button still floats. **Position stays `fixed; bottom: 14px; left: 14px; right: 14px;` — locked to viewport bottom, never scrolls away.** |

## Scope — what IS in FT-12

1. **App.jsx — Header restyle** (~30 lines around 776–810)
   - Remove `border-bottom: 1px solid BD`
   - Remove explicit `background: CD` — replace with gradient `linear-gradient(180deg, #0d0d14 0%, var(--cd) 100%)`
   - Push padding-top to absorb the safe-area-top zone (status bar text sits on the gradient)
   - Apply `font-style: italic`, `text-transform: uppercase`, `letter-spacing: 1px` to the `PadelHub` h1
   - "Padel" stays default text color, "Hub" stays accent green — both italic uppercase

2. **App.jsx — Bottom nav restyle** (~lines 1138–1155)
   - Position: `fixed; bottom: 14px; left: 14px; right: 14px;` (was `bottom: 0; left: 0; right: 0;`)
   - Add `border-radius: 28px`, `border: 1px solid var(--accent-soft)` (replaces top-only border)
   - Remove `border-top: 1px solid BD`
   - Add subtle box-shadow for floating elevation
   - Adjust `paddingBottom` of main content from `80px` to `96px` to clear the lifted nav
   - "+" button stays as-is (already floats above nav)
   - Active tab background tint stays accent-soft
   - Tab labels: keep current text (renames are #11 — Leaderboard, Combos preserved here)

3. **PlayerStats.jsx — Roster sub-tab redesign** (the "roster" sub-tab content)
   - Replace the current 1-col list with 2-col grid (`grid-template-columns: 1fr 1fr; gap: 8px 12px;`)
   - Each card: 44×44 circular avatar (left) + italic uppercase name (right)
   - Remove ELO label, win-rate label, FormDots last-5-pill from list view — these stay only in the analytics + ranking views
   - Keep avatar URL logic (current code already supports `players.avatar_url`)
   - When admin Edit mode is on, edit/delete controls still show (preserve current behavior)
   - Sub-tab toggle (Players / Analytics) gets the italic uppercase styling (matches mockup)

4. **AdminDashboard.jsx — Player Management roster restyle**
   - List rows: italic uppercase name, dark CD background, BD border, 12px radius
   - Inline action buttons (Edit / Delete) on right
   - Role badge inline next to name when admin (Owner ★, Admin ⚡)
   - Country flag + position **NOT included in FT-12** — placeholders left empty, populated by #11

5. **PlayerStats.jsx — Drill-in profile (lines 152–187): country flag slot ONLY**
   - Add a flag/ISO-3 row to the big top card between the name/nickname and the ELO/Win-Rate strip
   - Markup pattern: `{player.country && <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:8}}><span style={{fontSize:18}}>{flagEmoji(player.country)}</span><span style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:0.5}}>{player.country}</span></div>}`
   - Conditional render — invisible if `player.country` is null/undefined → no layout shift on first migration row that has data
   - **Do NOT rename labels in FT-12** — Win Rate / Games Played / Wins / Losses / Streak stay as-is until #11
   - Achievements bar + H2H section untouched
   - Add `flagEmoji(iso3)` helper to `src/utils/helpers.js` — small ISO-3 → flag emoji map (covers PSE, IRQ, GBR, LBN, KWT, DEU at minimum from the preset list, plus a fallback)

6. **theme.js — no changes**
   - Existing tokens are sufficient (A, GD, accent-soft can be derived inline)

7. **public/sw.js — bump CACHE_NAME**
   - `padelhub-v52` → `padelhub-v53`

8. **Mockup file removal** before commit
   - `rm padelhub/public/mockup-issue12.html` (per S043 — don't ship mockups to prod)
   - `_wip/premier-padel-refs/` stays out of the repo (already in `_wip/` which is gitignored or should be)

## Scope — what is OUT (deferred)

- **Country + position columns** (`players.country`, `players.playing_position`) → Issue #11
- **Tab label renames** (Leaderboard → Ranking, Combos → Partners) → Issue #11
- **Profile flash-card label renames** (Win Rate → Effectiveness, etc.) → Issue #11
- **Season selector on Ranking screen** → Issue #11
- **Ranking table headers + ranking-screen redesign** → Issue #11
- **"Last 5 games pill" relocation** to Ranking screen → Issue #11

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Floating nav overlaps content at viewport bottom | Increase main wrapper `paddingBottom` from 80px → 96px (computed: 14px gap + ~64px nav + 14px safe-area buffer) |
| Header gradient looks dirty on devices without dynamic island | Test on iPhone SE / older simulators in dev. Gradient should still look natural without an island |
| iOS PWA status-bar text contrast | Status bar text is light by default; gradient `#0d0d14 → var(--cd)` is dark enough. If contrast fails, add `<meta name="theme-color" content="#0d0d14">` |
| "Locked" nav drifts during scroll on iOS Safari | Use `position: fixed` with `bottom: env(safe-area-inset-bottom, 14px) + 14px`. Test pull-to-refresh + swipe gestures |
| Italic uppercase reduces readability on small subtitle text | Apply italic only to display headers (h1, h2, screen titles, player names, sub-tab labels) — NOT body text or subtitles. Keep `<p>` subtitles in upright Outfit |
| Existing toast (S041) overlap with floating nav | Toast position is top-of-screen — no conflict |
| Sidebar opens over nav | Sidebar already has its own z-index stack — verify nav z-index lower than sidebar |

## Commit plan

**Single commit** (small, focused, easy to revert):

```
[Session046] FT-12 Premier Padel UI polish

- Header: blended gradient under status bar, italic uppercase wordmark
- Bottom nav: floating pill, accent border, fixed at bottom with gutters
- Players tab: 2-col grid, italic names, ELO/WR hidden
- Admin roster: italic names, restyled rows
- SW v52 → v53
```

If user prefers staged commits I can split into 3:
1. App.jsx header + nav restyle + sw bump
2. PlayerStats roster grid + sub-tab styling
3. AdminDashboard roster restyle

## Verification checklist

- [ ] Local dev server: header gradient visible, no border line
- [ ] Local dev: bottom nav floats, side gutters visible, content scrolls under without overlap
- [ ] Local dev: Players tab shows 2-col grid, no ELO/WR/last-5
- [ ] Local dev: tap a player → drill-in profile UNCHANGED (no FT-12 changes here)
- [ ] Local dev: Admin → Player Management → roster rows restyled, edit/delete still works
- [ ] Local dev: navigate all 7 tabs — no layout shifts, no broken affordances
- [ ] Browser console: zero errors
- [ ] Bundle size: no unexpected growth (no new dependencies)
- [ ] Vercel deploy READY
- [ ] iPhone PWA: header blends correctly with status bar, nav floats, install + launch works
- [ ] Service-worker update prompt fires on existing PWA installs (v52 → v53)

## Post-deploy

- Close GitHub issue #12 with link to commit + screenshot
- Update tasks/todo.md S047 pointer (next session focus = #11)
- Update tasks/lessons.md if any new pattern emerged
- Write session log per LOG-SESSION-INSTRUCTIONS.md
- Re-lock nav bar in `padelhub/CLAUDE.md` Design System note + Workflow Rules — once #11 also ships
