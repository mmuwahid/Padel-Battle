# Issue #46 Phase 5 — Players Screen Restyle

**Status:** DRAFT — awaiting user approval before implementation.
**Branch:** `feat/46-phase5-players` off `main`.
**SW:** v87 → v88.
**File touched:** `src/components/PlayerStats.jsx` (543 lines) + `src/index.css` (Phase 5 CSS block).
**Spec reference:** `padelhub/docs/PadelHub_Complete_v2.jsx` lines 1261–1323 (`PlayersScreen`).
**Spec CSS:** lines 132–134 (`.seg/.sb`), 147–151 (`.gbtn/.pbtn`), 293–315 (`.rbar/.srch*/.plist/.prow/.ravi/.pinfo/...`), 792–799 (`.gfilter-bar/.gfpill`).

---

## Why this is a careful phase

Phase 5 touches the largest component refactored so far in #46 (PlayerStats.jsx, 543 lines, 5 prior tuning sessions: S046 v1, S047, S050, S052, S053). The screen contains both a **roster list** (S046 deliberate 2-col grid) AND a **drill-in analytics view** (S052/S053 avatar work + S053 pair card layout). The Phase 4 incident (8 silent regressions from spec-verbatim aliasing) was on a much smaller surface. Phase 5 needs the full pre-merge gate from `feedback_issue46_dont_take_spec_literally.md`.

**Out of scope for Phase 5 (held for explicit user direction):**
- The analytics drill-in view (PlayerStats sub-tab "analytics") — this is a separate restyle scope
- Adding gender filter — requires `gender` column on `profiles` or `players`, deferred to Phase 11
- Showing W-L stats inline on the roster row — deliberately hidden in S046 ("ELO/WR/last-5 hidden at list level, moved to Ranking tab in #11")

---

## Diff analysis (spec vs current live)

| Property | Spec | Current live | Classify | Notes |
|----------|------|--------------|----------|-------|
| Sub-tab control style | `.seg/.sb/.sb.on` flat segmented | italic uppercase pills (S047 styling) | **spec-wins** | S056 lesson #39 explicitly removed italic from "all player name elements" — italic on the sub-tab pills is one of the last surviving italic uses |
| Sub-tab labels | "Players" / "Analytics" | "PLAYERS" / "ANALYTICS" | spec-wins | softer caps via CSS `text-transform`, not literal caps |
| Header label | "Roster (14)" | "Player Roster (14)" | spec-wins | terser, matches `.rbar-t` |
| Header layout | `.rbar` flex + `.rbar-t` left + actions right | flex space-between with same intent | spec-wins | structural rename only, behavior identical |
| Search input | `.srchw/.srchi/.srch` | absent | spec-wins | NEW useful UX for 14+ rosters |
| Roster layout | `.plist` vertical list | 2-col grid (S046 v1) | **AMBIGUOUS — ASK USER** | S046 was a deliberate choice; vertical list shows W-L which S046 deferred |
| Row layout | avatar (38×38, `var(--rf)` rounded square) + info + chevron | avatar (44×44, circle) + info | **AMBIGUOUS — ASK USER** | corner radius + size diff |
| Avatar shape | rounded **square** | rounded **circle** | **AMBIGUOUS — ASK USER** | spec uses square `border-radius:var(--rf)`=8px; live uses circle `border-radius:50%` |
| Player name styling | non-italic 700 13px | italic 900 uppercase 13px | spec-wins | applies S056 italic-removal lesson uniformly |
| Country meta row | flag + ISO3 + (optional) gender + W-L | flag + ISO3 OR `"nickname"` (mutually exclusive) | partial spec-wins | flag + ISO3 same; W-L deferred (see below) |
| W-L on row | shown in `.prec2` | hidden (S046 decision) | **AMBIGUOUS — ASK USER** | S046 deliberately hid these to drive ranking-screen traffic |
| Gender icon | shown if `p.gender` set | n/a (no DB column) | **prior-wins (defer)** | DB schema → Phase 11 |
| Gender filter pill bar | toggleable | absent | **prior-wins (defer)** | DB schema → Phase 11 |
| "You" badge | `.pbadge` for `claimedPlayer.id===p.id` | absent | spec-wins | useful UX, maps to existing `claimedPlayer` state |
| Drill-in chevron | `.pchev` | absent | spec-wins | discoverability |
| Hover effect | `.prow:hover` translateX + accent left-border slide-in | none on mobile | spec-wins (cosmetic, no-op on touch) | desktop-only enhancement |
| Add Player form | not in spec | inline expanding form (admin only) | **prior-wins** | functional admin path; preserved verbatim |
| Edit mode pencil/trash | not in spec | per-row icons when editMode=true | **prior-wins** | functional admin path; preserved verbatim |
| Inline edit row | not in spec | full-width form replacing row when editPid===p.id | **prior-wins** | preserved verbatim |
| `getAvatar(pid)` helper | n/a | used in 7+ slots | **prior-wins** | (S052) avatar handling unchanged |

---

## Open questions for user (BEFORE implementation)

These are the AMBIGUOUS rows above. **Do not implement until user picks a side.**

### Q1: Roster layout — keep 2-col grid or switch to vertical list?
- **A. Switch to vertical list (spec)** — better for showing meta info (W-L, country, gender), more rows visible per scroll, matches spec exactly
- **B. Keep 2-col grid (S046 v1)** — denser at-a-glance roster scan, deliberate decision from S046 to drive ranking-screen traffic for stats
- **C. Hybrid** — 2-col grid stays, but spec's `.prow` styling applied per cell (rounded square avatar, non-italic name, hover effect)

### Q2: Show W-L on roster rows?
- **A. Yes (spec)** — quick at-a-glance W-L per player without leaving the screen
- **B. No (S046)** — keep deliberately hidden to encourage Ranking-screen drill-in for stats

### Q3: Avatar shape — circle or rounded square?
- **A. Circle 50% (current)** — consistent with header avatar, podium avatars, ranking row avatars
- **B. Rounded square `var(--r-sm)`=8px (spec)** — matches spec's PlayersScreen variant; would diverge from other avatar uses
- **Recommendation:** circle, for cross-screen consistency. Spec's square avatars are isolated to PlayersScreen.

---

## Phase 5 scope (assuming spec-leaning answers to Q1/Q2/Q3)

### CSS additions to `src/index.css` (NEW Phase 5 block)

Tokens required (all exist in Phase 1):
- `var(--surface)` `var(--surface-2)` `var(--border)` `var(--accent)` `var(--accent-glow)` `var(--accent-dim)` `var(--text)` `var(--mono)` `var(--font)` `var(--r-sm)` `var(--r-md)` `var(--r-lg)` `var(--r-full)` `var(--ease-spring)` `--win` `--gold`
- Hardcoded values where Phase 1 token is too dark/wrong: `#9090a4` for muted text (matches Phase 4)
- DO NOT use spec short aliases (`--ac/--mu/--mo/--los/--go/--rl/--rf/--br/--tx/--s2/--sp`) — Lesson #70

```css
/* ─── Phase 5 — Players ──────────────────────────────────────────────── */
/* Segmented control (Players / Analytics) */
.seg{display:grid;grid-template-columns:1fr 1fr;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:4px;margin:14px 18px 0;}
.sb{padding:10px;border-radius:var(--r-md);border:none;background:none;font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;color:#9090a4;transition:all 200ms;text-transform:uppercase;letter-spacing:.04em;}
.sb.on{background:var(--accent);color:#000;}

/* Roster header bar */
.rbar{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;}
.rbar-t{font-size:15px;font-weight:700;}

/* Action buttons */
.pbtn{padding:9px 16px;border-radius:var(--r-md);background:var(--accent);border:none;font-family:var(--font);font-size:12px;font-weight:700;color:#000;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all 150ms var(--ease-spring);white-space:nowrap;}
.pbtn:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(74,222,128,.3);}
.pbtn:active{transform:scale(.95);}
.gbtn{padding:7px 12px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--border);font-family:var(--font);font-size:12px;font-weight:600;color:#9090a4;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all 150ms;}
.gbtn:hover{border-color:var(--accent-glow);color:var(--text);}
.gbtn.on{background:rgba(74,222,128,.09);border-color:var(--accent-glow);color:var(--accent);}

/* Search input */
.srchw{padding:0 18px 12px;position:relative;}
.srchi{position:absolute;left:30px;top:50%;transform:translateY(-50%);color:#9090a4;pointer-events:none;display:flex;}
.srch{width:100%;padding:11px 16px 11px 42px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);color:var(--text);font-family:var(--font);font-size:14px;outline:none;transition:border-color 200ms;}
.srch::placeholder{color:#9090a4;}
.srch:focus{border-color:var(--accent-glow);}

/* Roster list */
.plist{padding:0 18px;display:flex;flex-direction:column;gap:7px;}
.prow{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:11px 14px;cursor:pointer;transition:all 200ms;position:relative;overflow:hidden;}
.prow::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent);transform:scaleY(0);transform-origin:bottom;transition:transform 200ms var(--ease-spring);}
.prow:hover{background:var(--surface-2);border-color:var(--accent-glow);transform:translateX(2px);}
.prow:hover::before{transform:scaleY(1);}
.prow:active{transform:scale(.98);}

/* Avatar — Q3: spec uses square radius, I'll keep CIRCLE pending user answer */
.ravi{width:38px;height:38px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;background:linear-gradient(135deg,rgba(74,222,128,.15),rgba(74,222,128,.05));border:1.5px solid rgba(74,222,128,.3);color:var(--accent);overflow:hidden;}
.ravi.me{border-color:var(--accent-glow);}

.pinfo{flex:1;min-width:0;}
.pnam{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pmet{display:flex;align-items:center;gap:6px;margin-top:2px;}
.pflag{font-size:12px;}
.pctry{font-family:var(--mono);font-size:10px;color:#9090a4;}
.prec2{font-family:var(--mono);font-size:10px;color:#9090a4;}
.pbadge{background:var(--accent-dim);border:1px solid var(--accent-glow);color:var(--accent);border-radius:var(--r-sm);padding:2px 8px;font-family:var(--mono);font-size:9px;flex-shrink:0;}
.pchev{color:#5a5a6a;display:flex;transition:all 200ms;}
.prow:hover .pchev{color:var(--accent);transform:translateX(3px);}
```

### JSX changes to `src/components/PlayerStats.jsx`

1. **Sub-tab toggle (line 209–213)**: replace inline-styled italic pills with `<div className="seg"><button className={`sb${subTab==="roster"?" on":""}`}>Players</button><button className={`sb${subTab==="analytics"?" on":""}`}>Analytics</button></div>`

2. **Roster header (line 499–505)**: replace flex div with `<div className="rbar"><div className="rbar-t">Roster <span className="rbar-count">({filtered.length})</span></div><div style={{display:"flex",gap:7}}>{isAdmin && <button className={`gbtn${editMode?" on":""}`}>...Edit</button>}{isAdmin && !editMode && <button className="pbtn">+ Add</button>}</div></div>`

3. **NEW search input** below header: `<div className="srchw"><div className="srchi"><Icon name="search" size={15}/></div><input className="srch" placeholder="Search players…" value={q} onChange={...}/></div>`

4. **Search filter logic**: `const filtered = players.filter(p => q==="" || p.name.toLowerCase().startsWith(q.toLowerCase()));` — per-word startsWith for multi-word names (Lesson #48 from S050 CountrySelect).

5. **Roster list (line 512–539)**: replace 2-col grid with `<div className="plist">` and per-row markup:
   ```jsx
   <div className={`prow`} onClick={()=>setSp(p.id)}>
     <div className={`ravi${claimedPlayer?.id===p.id?" me":""}`}>
       {p.avatar_url ? <img src={p.avatar_url}.../> : p.name[0].toUpperCase()}
     </div>
     <div className="pinfo">
       <div className="pnam">{p.nickname||p.name}</div>
       <div className="pmet">
         {p.country && <><span className="pflag">{flagEmoji(p.country)}</span><span className="pctry">{p.country}</span></>}
         {/* W-L row deferred pending Q2 answer */}
       </div>
     </div>
     {claimedPlayer?.id===p.id && <div className="pbadge">You</div>}
     <div className="pchev"><Icon name="chevron" size={16}/></div>
   </div>
   ```

6. **Edit mode preserved**: when `editMode && editPid===p.id`, render the inline edit form as before. When `editMode && editPid!==p.id`, render `.prow` with pencil/trash icons appended (preserving the admin path).

7. **Add Player form preserved**: shown above `.plist` when `showAddPlayer && !editMode`. Wrap in `<div className="prow-add">` styled to look like a `.prow` but with form fields instead of name.

### Search icon — does Icon.jsx have `search`?
Yes — Phase 1's `Icon.jsx` includes 56 cases ported from spec (lines 6–71 of `PadelHub_Complete_v2.jsx`). Verify `search` and `chevron` cases exist before referencing.

---

## Pre-merge gate (mandatory per `feedback_issue46_dont_take_spec_literally.md`)

1. **List prior tunings:** S046 v1 (2-col grid + ELO/WR hide), S047 (italic uppercase names), S050 (CountrySelect/flag), S052 (`getAvatar` + drill-in profile avatars), S053 (pair card layout, worst-pair >=6 gate dropped)
2. **Diff every visual property** against spec — table above
3. **Classify** spec-wins / prior-wins / **AMBIGUOUS** — ASK user on AMBIGUOUS rows BEFORE building
4. **Run `getComputedStyle` checks pre-PR-open** on `.seg`, `.sb.on`, `.rbar`, `.srch:focus`, `.prow:hover`, `.ravi`, `.pbadge` — confirm tokens resolve
5. **`grep` for short aliases in App.jsx and PlayerStats.jsx** before commit — `var(--los)/--mu/--go/--mo/--ac/--rl/--rf/--br/--tx/--s2/--acg/--acd/--da/--sp/--fn` should return zero hits in JSX inline styles
6. **Don't bundle architecture migration with visual changes** — Phase 5 is markup conversion + segmented control + search. The analytics drill-in view stays inline-styled in this phase.

---

## DoD checklist (15 items)

- [ ] Q1/Q2/Q3 answered by user (roster layout, W-L visibility, avatar shape)
- [ ] Phase 5 CSS block appended to `src/index.css` using LONG token names only
- [ ] Sub-tab toggle converted to `.seg/.sb` markup
- [ ] Roster header uses `.rbar` + `.rbar-t` markup
- [ ] Search input added with `.srchw/.srchi/.srch` + filter logic (per-word startsWith)
- [ ] Roster list uses `.plist` (assuming Q1=A) or 2-col grid styled with `.prow` (Q1=C)
- [ ] Avatar uses `.ravi` (with `.me` modifier for claimed player)
- [ ] Player name uses `.pnam` (non-italic)
- [ ] Country meta uses `.pmet` + `.pflag` + `.pctry`
- [ ] "You" badge `.pbadge` rendered for `claimedPlayer.id===p.id`
- [ ] Chevron `.pchev` rendered with hover slide
- [ ] Edit mode + Add Player form preserved verbatim (admin path)
- [ ] `getAvatar(pid)` helper still used (S052 preserved)
- [ ] No `var(--los)/--mu/--go/--mo/--ac/--rl/--rf/--br/--tx/--s2/--acg/--acd/--da/--sp/--fn` in JSX inline styles (Lesson #70 + post-merge audit lesson)
- [ ] Local Vite preview: `getComputedStyle` checks on `.seg`, `.sb.on`, `.rbar`, `.srch`, `.prow`, `.ravi` all resolve correctly
- [ ] SW bumped v87 → v88
- [ ] Vercel preview READY before user iPhone smoke-test

---

## Rollback plan

If iPhone smoke-test exposes a regression, revert via `git revert <merge-commit>` on main. PlayerStats.jsx is a single self-contained component; rollback restores S046 v1 + S047 styling. CSS additions are append-only (Phase 5 block at end of index.css) — `git revert` removes them cleanly.

---

## Hand-off to Phase 6

Phase 5 ships the **roster** sub-tab (Players list) restyle. The **analytics** sub-tab inside PlayerStats.jsx stays inline-styled in this phase — that's a separate scope (Phase 6 candidate: Analytics drill-in restyle, including the 4 sub-views: League / Partners / H2H / Insights). Defer until Phase 5 is verified live.
