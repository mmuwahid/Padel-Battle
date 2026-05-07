# Issue #46 Phase 4 — Ranking Screen Restyle

**Status:** Ready to build  
**Branch:** `feat/46-phase4-ranking`  
**SW bump:** v85 → v86  
**Files touched:** `src/index.css`, `src/App.jsx`, `public/sw.js`

---

## Scope

Restyle the Ranking tab (`tab === "board"`) from inline styles to class-based markup using
Phase 1 design tokens. No logic changes — all existing selectors preserved verbatim.

### In scope
- `.lbbar` title + season-selector row
- `.pod-wrap` / `.pod` / `.pod.p1/.p2/.p3` podium cards
- `.lbtable` / `.lbth` / `.lbrow` table
- `.lbply` / `.lbavi` / `.lbpinfo` / `.lbn` player cell
- `.form-dots` / `.fdot.w/.l` inside player cell (replaces separate form strip)
- `.lbc` / `.lbc.w/.l/.hi/.lo` data cells
- `.lbrow.me` self-highlight (new feature)
- `.spill` season selector pill (styled `<select>`)
- Season Awards card block — **markup preserved as-is, zero CSS changes**

### Out of scope
- Any tab other than `tab === "board"`
- Logic: `seasonLb`, `seasonElo`, `getSeasonForm`, `getSeasonStreak`, `calculateSeasonAwards` — untouched
- FormDots.jsx — untouched (still used by PlayerStats)
- NavIcons.jsx — frozen

---

## Pre-build diff analysis (mandatory gate)

| Property | Current live | Spec | Classification | Decision |
|---|---|---|---|---|
| Title font-size | 20px | 26px (`.lbtitle`) | Spec-wins — no bug-fix reason for 20px | **Adopt spec** |
| Title weight | 900 | 800 | Spec-wins | **Adopt spec** |
| Title case | `text-transform:uppercase` | None in spec | Ambiguous — uppercase looks intentional | **Keep uppercase** |
| Title tracking | `letter-spacing:1` | `-0.02em` | Spec is tighter — prior value not bug-fix | **Adopt spec** |
| Season selector | Native `<select>` | `.spill` pill div (static mockup) | Spec-wins on visual | **Styled `<select>` matching .spill appearance** |
| Podium container | `display:grid` inline | `.pod-wrap` flex | Spec-wins | **Adopt spec** |
| Podium p1 gold strip | `borderTop: 3px solid GD` | `::before` gradient + gradient background | Spec-wins | **Adopt spec** |
| Podium p1 scale | `transform:scale(1.05)` | `padding-top:42px` (height hierarchy) | Spec-wins — CSS-only, no state | **Adopt spec** |
| Table grid (# cols) | 8-col (32px 1fr 36px 28px 28px 28px 30px 38px) — has CW | 7-col spec (28px 1fr 28px 28px 28px 28px 40px) — no CW | **AMBIGUOUS** — CW was deliberate Issue #11 feature; form dots complement but don't replace | **Keep 8-col + CW** (see note) |
| Form rendering | Separate "Last 5 Form" strip below table | Form dots inside player cell | Spec-wins — cleaner | **Move dots into player cell, remove strip** |
| Player name style | `textTransform:uppercase, fontFamily:JetBrains Mono, 11px` | `.lbn` = `12px font-weight:700` (Outfit, no uppercase) | Ambiguous | **Keep uppercase + JetBrains Mono per existing branding** but use `.lbn` class |
| Avatar size | 30×30 | 25×25 (`.lbavi`) | Prior-wins — larger is more readable | **Keep 30×30 but use `.lbavi` class** |
| Avatar image | `<img>` with real avatar_url | Initials only in spec | Prior-wins (S052 feature) | **Keep img support inside `.lbavi`** |
| "me" row highlight | None | `.lbrow.me` rgba(74,222,128,.04) | Spec-wins — new feature | **Add** |
| ELO in podium | Shown via `seasonElo` | `.pelo` class | Spec-wins on class | **Adopt** |
| CW col color logic | `cw>=3 ? GD : TX` | N/A | Prior-wins | **Preserve** |
| Eff% color logic | `winRate>=0.5 ? A : DG` via `.lbc.hi/.lo` | `.lbc.hi/.lo` | Aligned | **Adopt spec classes** |

> **CW column note:** Spec omits CW, but it was added explicitly in Issue #11 as a Premier Padel metric.
> Form dots show last-5 pattern; CW shows current streak count — different information.
> Keeping CW as column 7 of 8; grid columns adjust to `28px 1fr 28px 28px 28px 28px 30px 38px`.

---

## CSS block (append to index.css under `/* Phase 4 — Ranking */`)

```css
/* Phase 4 — Ranking */
.lbbar{display:flex;align-items:center;justify-content:space-between;padding:20px 18px 0;}
.lbtitle{font-size:26px;font-weight:800;letter-spacing:-.02em;text-transform:uppercase;}
.spill{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--br);border-radius:var(--rf);padding:7px 12px;font-family:var(--mo);font-size:11px;color:var(--tx);cursor:pointer;outline:none;transition:all 150ms;}
.spill:focus{border-color:var(--acg);}
.pod-wrap{display:flex;align-items:flex-end;justify-content:center;gap:6px;padding:16px 14px 14px;}
.pod{display:flex;flex-direction:column;align-items:center;gap:5px;border-radius:var(--rl);padding:16px 10px 14px;border:1px solid var(--br);background:var(--surface);flex:1;position:relative;overflow:hidden;transition:transform 200ms;cursor:pointer;}
.pod:hover{transform:translateY(-2px);}
.pod::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
.pod.p1{padding-top:40px;border-color:rgba(250,204,21,.4);background:linear-gradient(160deg,rgba(250,204,21,.09),var(--surface) 55%);}
.pod.p1::before{background:linear-gradient(90deg,transparent,#facc15,transparent);}
.pod.p2{padding-top:22px;}
.pod.p2::before{background:linear-gradient(90deg,transparent,#94a3b8,transparent);}
.pod.p3{padding-top:10px;}
.pod.p3::before{background:linear-gradient(90deg,transparent,#c97b2e,transparent);}
.pmedal{font-size:26px;line-height:1;margin-bottom:2px;}
.pod.p1 .pmedal{font-size:32px;}
.pname{font-size:13px;font-weight:800;text-align:center;text-transform:uppercase;letter-spacing:.02em;}
.pod.p1 .pname{font-size:15px;}
.prec{display:flex;gap:5px;font-family:var(--mo);font-size:9px;}
.ppct{font-size:15px;font-weight:700;font-family:var(--mo);}
.pod.p1 .ppct{color:#facc15;font-size:17px;}
.pod.p2 .ppct{color:#94a3b8;}
.pod.p3 .ppct{color:#c97b2e;}
.pelo{font-family:var(--mo);font-size:9px;color:var(--mu);}
.lbtable{margin:0 0 16px;background:var(--surface);border:1px solid var(--br);border-radius:var(--rl);overflow:hidden;}
.lbth{display:grid;grid-template-columns:28px 1fr 28px 28px 28px 28px 30px 38px;gap:4px;padding:9px 10px;border-bottom:1px solid var(--br);background:var(--s2);}
.lbh{font-family:var(--mo);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);display:flex;align-items:center;}
.lbh.r{justify-content:flex-end;}
.lbrow{display:grid;grid-template-columns:28px 1fr 28px 28px 28px 28px 30px 38px;gap:4px;padding:9px 10px;border-bottom:1px solid rgba(42,42,58,.4);align-items:start;cursor:pointer;transition:background 150ms;}
.lbrow:last-child{border-bottom:none;}
.lbrow:hover{background:var(--s2);}
.lbrow.me{background:rgba(74,222,128,.04);}
.lbrank{font-family:var(--mo);font-size:11px;font-weight:900;color:var(--mu);padding-top:2px;text-align:center;}
.lbply{display:flex;align-items:flex-start;gap:7px;min-width:0;}
.lbavi{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;background:linear-gradient(135deg,rgba(74,222,128,.15),rgba(74,222,128,.05));border:1.5px solid rgba(74,222,128,.3);color:var(--ac);flex-shrink:0;margin-top:1px;overflow:hidden;}
.lbrow.me .lbavi{border-color:var(--acg);}
.lbpinfo{display:flex;flex-direction:column;gap:4px;min-width:0;}
.lbn{font-family:var(--mo);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.form-dots{display:flex;align-items:center;gap:3px;}
.fdot{width:7px;height:7px;border-radius:50%;}
.fdot.w{background:rgba(74,222,128,.75);}
.fdot.l{background:rgba(248,113,113,.5);}
.lbc{font-family:var(--mo);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:flex-end;padding-top:3px;}
.lbc.w{color:var(--win);}
.lbc.l{color:var(--los);}
.lbc.hi{color:var(--ac);font-weight:800;}
.lbc.lo{color:var(--da);}
.lbc.cw{color:var(--go);}
```

---

## App.jsx — Ranking tab JSX diff (conceptual)

Replace the entire `{!sidebarView && tab==="board"&&(…)}` block (lines ~927–1141) with:

```jsx
{!sidebarView && tab==="board"&&(
  <div style={{padding:"0 16px 20px"}}>

    {/* Title + season selector */}
    <div className="lbbar">
      <h2 className="lbtitle">Leaderboard</h2>
      {seasons.length>0 && (
        <select className="spill" value={selectedSeason||""} onChange={e=>setSelectedSeason(e.target.value)}>
          {seasons.map(s=><option key={s.id} value={s.id}>{s.name}{s.active?" (active)":""}</option>)}
        </select>
      )}
    </div>

    {/* Season Awards — PRESERVED VERBATIM, no JSX changes */}
    {selectedSeason && !seasons.find(s=>s.id===selectedSeason)?.active && (() => {
      /* ... calculateSeasonAwards block unchanged ... */
    })()}

    {/* Empty state */}
    {seasonLb.length===0&&(
      <div style={{textAlign:"center",padding:"40px 20px",background:CD,borderRadius:12,border:`1px solid ${BD}`}}>
        <div style={{fontSize:40,marginBottom:12}}>🎾</div>
        <div style={{fontSize:15,fontWeight:600,color:TX,marginBottom:6}}>No rankings yet</div>
        <div style={{fontSize:12,color:MT,lineHeight:1.5}}>Play your first match to appear in the ranking.</div>
      </div>
    )}

    {/* Podium */}
    {seasonLb.length>=3&&(
      <div className="pod-wrap">
        {/* 2nd */}
        <div className="pod p2" onClick={()=>{setSelectedPlayer(seasonLb[1].id);setTab("stats");}}>
          <div className="pmedal">🥈</div>
          <div className="pname">{seasonLb[1].nickname||seasonLb[1].name}</div>
          <div className="prec">
            <span style={{color:"var(--win)"}}>{seasonLb[1].wins}W</span>
            <span style={{color:"var(--los)"}}>{seasonLb[1].losses}L</span>
          </div>
          <div className="ppct">{(seasonLb[1].winRate*100).toFixed(0)}%</div>
          <div className="pelo">{Math.round(seasonElo[seasonLb[1].id]||1500)} ELO</div>
        </div>
        {/* 1st */}
        <div className="pod p1" onClick={()=>{setSelectedPlayer(seasonLb[0].id);setTab("stats");}}>
          <div className="pmedal">🥇</div>
          <div className="pname">{seasonLb[0].nickname||seasonLb[0].name}</div>
          <div className="prec">
            <span style={{color:"var(--win)"}}>{seasonLb[0].wins}W</span>
            <span style={{color:"var(--los)"}}>{seasonLb[0].losses}L</span>
          </div>
          <div className="ppct">{(seasonLb[0].winRate*100).toFixed(0)}%</div>
          <div className="pelo">{Math.round(seasonElo[seasonLb[0].id]||1500)} ELO</div>
        </div>
        {/* 3rd */}
        <div className="pod p3" onClick={()=>{setSelectedPlayer(seasonLb[2].id);setTab("stats");}}>
          <div className="pmedal">🥉</div>
          <div className="pname">{seasonLb[2].nickname||seasonLb[2].name}</div>
          <div className="prec">
            <span style={{color:"var(--win)"}}>{seasonLb[2].wins}W</span>
            <span style={{color:"var(--los)"}}>{seasonLb[2].losses}L</span>
          </div>
          <div className="ppct">{(seasonLb[2].winRate*100).toFixed(0)}%</div>
          <div className="pelo">{Math.round(seasonElo[seasonLb[2].id]||1500)} ELO</div>
        </div>
      </div>
    )}

    {/* Rankings table */}
    {seasonLb.length>0&&(
      <div className="lbtable">
        {/* Header */}
        <div className="lbth">
          <div className="lbh">#</div>
          <div className="lbh">Player</div>
          <div className="lbh r">Ctry</div>
          <div className="lbh r">MP</div>
          <div className="lbh r" style={{color:"var(--win)"}}>MW</div>
          <div className="lbh r" style={{color:"var(--los)"}}>ML</div>
          <div className="lbh r" style={{color:"var(--go)"}}>CW</div>
          <div className="lbh r">Eff%</div>
        </div>
        {/* Rows */}
        {seasonLb.map((p,idx)=>{
          const player = players.find(pp=>pp.id===p.id);
          const flag = player?.country ? flagEmoji(player.country) : "";
          const ctry = player?.country || "";
          const eff = (p.winRate*100).toFixed(0);
          const cw = getSeasonStreak(p.id);
          const form = getSeasonForm(p.id);
          const isMe = claimedPlayer?.id === p.id;
          return (
            <div key={p.id} className={`lbrow${isMe?" me":""}`}
              onClick={()=>{setSelectedPlayer(p.id);setTab("stats");}}>
              <div className="lbrank" style={{color:idx===0?"#facc15":idx===1?"#94a3b8":idx===2?"#c97b2e":"var(--mu)"}}>
                {idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":idx+1}
              </div>
              <div className="lbply">
                <div className="lbavi">
                  {player?.avatar_url
                    ? <img src={player.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : (p.name[0]||"?").toUpperCase()}
                </div>
                <div className="lbpinfo">
                  <div className="lbn">{p.nickname||p.name}</div>
                  {form.length>0&&(
                    <div className="form-dots">
                      {form.map((r,i)=><div key={i} className={`fdot ${r==="W"?"w":"l"}`}/>)}
                    </div>
                  )}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,paddingTop:2}}>
                {flag
                  ? <><span className="flag" style={{fontSize:13,lineHeight:1}}>{flag}</span>
                     <span style={{fontSize:8,color:"var(--mu)",fontWeight:700,letterSpacing:.3,fontFamily:"var(--mo)"}}>{ctry}</span></>
                  : <span style={{fontSize:11,color:"var(--mu)",opacity:.4}}>—</span>}
              </div>
              <div className="lbc">{p.games}</div>
              <div className="lbc w">{p.wins}</div>
              <div className="lbc l">{p.losses||"–"}</div>
              <div className={`lbc${cw>=3?" cw":""}`}>{cw}</div>
              <div className={`lbc ${parseFloat(eff)>=50?"hi":"lo"}`}>{eff}%</div>
            </div>
          );
        })}
      </div>
    )}

  </div>
)}
```

> **Note:** Season Awards block (`calculateSeasonAwards` IIFE) is copy-pasted verbatim from
> the current file — no style changes. The spacer `<div style={{height:90}}/>` before the
> nav is handled by App.jsx's outer `paddingBottom` on the main wrapper, not needed here.

---

## Decisions to confirm before building

1. **CW column** — keeping 8-col table with CW. Confirm? *(recommended: yes)*
2. **"Last 5 Form" strip removal** — the separate strip below the table will be removed since form dots are now in the player cell. Confirm? *(recommended: yes)*
3. **Player name style** — keeping `font-family: var(--mo)` (JetBrains Mono) + uppercase for names in table, even though spec uses Outfit. Confirm? *(recommended: yes — matches current branding)*

---

## DoD checklist

Pre-code:
- [ ] `git pull` in `/tmp/Padel-Battle`, diff against local `padelhub/src/`
- [ ] `gh issue list --repo mmuwahid/Padel-Battle --state open` — no new blockers

Build gate:
- [ ] `node -e "require('esbuild').buildSync({entryPoints:['padelhub/src/main.jsx'],bundle:true,write:false,jsx:'automatic'})"` — zero errors
- [ ] Dev server: Ranking tab renders 1 `.lbtable`, `.pod-wrap` (when 3+ players), `.lbbar`
- [ ] `getComputedStyle(document.querySelector('.lbtable'))` — `overflow:hidden`, `border-radius` set
- [ ] `getComputedStyle(document.querySelector('.pod.p1'))` — gradient background visible
- [ ] Tab switch Ranking → Stats → back to Ranking — no flash/blank
- [ ] Season selector changes season — table re-renders with season data
- [ ] CW column value renders, gold (`var(--go)`) when ≥3
- [ ] "me" row has green-tint background for the claimed player's row
- [ ] Form dots render inside player cell (green/red dots)
- [ ] Empty state renders when `seasonLb.length === 0`
- [ ] Season Awards block renders unchanged for ended seasons

Post-merge:
- [ ] Vercel preview READY before merge
- [ ] User iPhone smoke-test before merging to main

---

## Rollback

```bash
git revert HEAD  # or: gh pr close <N> without merging
```
All changes are in CSS + JSX render output — no DB, no logic, no component extraction.
Full rollback in one revert commit if needed.

---

## Hand-off

If Phase 4 verifies green → draft Phase 5 plan at `padelhub/planning/issue-46-phase5-*.md`.
Phase 5 candidate: Players screen restyle (lines ~1214+ in spec: PlayersScreen).
