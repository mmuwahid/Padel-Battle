import React, { useState, useMemo } from "react";
import { useLeague } from '../LeagueContext';
import { validateMatch } from '../utils/scoringEngine';
import Icon from './Icon';

// FT-09 / S044: Admin edits a pending match, then "Save & Approve" applies + flips status.
// S066 Phase 9: restyled to use spec classes (.tcard / .sccard / .cstep / .savebtn / .mvpcard).
// Keeps modal-overlay container; the inner card stack uses the same vocab as LogMatch.
export function EditMatchModal({ match, onClose, onSaved }) {
  const { supabase, players, getName, showToast, seasons } = useLeague();
  const ruleset = (seasons || []).find(s => s.id === match.season_id)?.ruleset === 'casual' ? 'casual' : 'fip'; // S080

  const [date, setDate] = useState(match.date);
  const [teamA, setTeamA] = useState(match.team_a || []);
  const [teamB, setTeamB] = useState(match.team_b || []);
  const [sets, setSets] = useState(match.sets && match.sets.length ? match.sets.map(s => [s[0], s[1]]) : [[0, 0]]);
  const [motm, setMotm] = useState(match.motm || "");
  const [saving, setSaving] = useState(false);

  const matchPlayerIds = useMemo(() => [...teamA, ...teamB].filter(Boolean), [teamA, teamB]);
  const validation = useMemo(() => validateMatch(sets, ruleset), [sets, ruleset]);
  const invalidIdx = validation.invalidIndexes || [];
  const canApprove = validation.status === 'complete';

  const diff = useMemo(() => {
    const d = [];
    if (date !== match.date) d.push({ field: "Date", old: match.date, new: date });
    if (JSON.stringify(teamA) !== JSON.stringify(match.team_a)) {
      d.push({ field: "Team A", old: (match.team_a || []).map(getName).join(" / "), new: teamA.map(getName).join(" / ") });
    }
    if (JSON.stringify(teamB) !== JSON.stringify(match.team_b)) {
      d.push({ field: "Team B", old: (match.team_b || []).map(getName).join(" / "), new: teamB.map(getName).join(" / ") });
    }
    if (JSON.stringify(sets) !== JSON.stringify(match.sets)) {
      d.push({ field: "Sets", old: (match.sets || []).map(s => `${s[0]}-${s[1]}`).join(", "), new: sets.map(s => `${s[0]}-${s[1]}`).join(", ") });
    }
    if ((motm || null) !== (match.motm || null)) {
      d.push({ field: "MOTM", old: match.motm ? getName(match.motm) : "—", new: motm ? getName(motm) : "—" });
    }
    return d;
  }, [date, teamA, teamB, sets, motm, match, getName]);

  const setSetValue = (i, side, n) => {
    const x = sets.map(s => [...s]);
    x[i][side] = n;
    setSets(x);
  };
  const addSet = () => setSets([...sets, [0, 0]]);
  const removeSet = (i) => {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (teamA.filter(Boolean).length !== 2 || teamB.filter(Boolean).length !== 2) {
      showToast("Each team needs 2 players", "error");
      return;
    }
    if (validation.status === 'invalid') {
      showToast(validation.error, "error");
      return;
    }
    if (validation.status === 'incomplete') {
      showToast("Match has no winner yet — needs 2 sets won. Use Reject if it can't be completed.", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_pending_match", {
        p_match_id: match.id,
        p_team_a: JSON.stringify(teamA),
        p_team_b: JSON.stringify(teamB),
        p_sets: JSON.stringify(validation.completedSets),
        p_date: date,
        p_motm: motm || null,
      });
      if (error) throw error;
      showToast(validation.droppedSets > 0 ? "Match approved (dead-rubber set dropped)" : "Match approved with edits");
      onSaved && onSaved();
      onClose();
    } catch (err) {
      if (import.meta.env.DEV) console.error("update_pending_match failed", err);
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const playerOpts = (excludeIds = []) => players.filter(p => !excludeIds.includes(p.id));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 12px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", width: "100%", maxWidth: 460, marginTop: "calc(env(safe-area-inset-top, 0px) + 8px)", marginBottom: 20, overflow: "hidden" }}>
        {/* Header */}
        <div className="mhd2" style={{borderRadius:0}}>
          <div className="mdate2" style={{fontSize:12,color:"var(--text)",fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",fontFamily:"var(--font)"}}>Edit & Approve</div>
          <div className="macts">
            <button className="mact" onClick={onClose} aria-label="Close"><Icon name="close" size={16}/></button>
          </div>
        </div>

        {/* Submitter context */}
        <div style={{ background:"var(--gold-dim)", borderLeft:"3px solid var(--gold)", padding:"9px 16px", fontSize:11, color:"#9090a4", fontFamily:"var(--mono)" }}>
          Submitted by <strong style={{ color:"var(--text)", fontWeight:700 }}>{match.logged_by ? getName(match.logged_by) : "—"}</strong>
        </div>

        {/* Body */}
        <div className="logbody" style={{padding:"16px"}}>

          {/* Date */}
          <div className="ctxbar" style={{padding:0,borderBottom:"none",justifyContent:"flex-start"}}>
            <input type="date" value={date} max={new Date().toISOString().split("T")[0]} onChange={e=>setDate(e.target.value)} className="ctxchip" style={{colorScheme:"dark",cursor:"pointer"}}/>
          </div>

          {/* Players card */}
          <div className="tcard">
            <div className="tcardh"><div className="tcardtit">Players</div></div>
            <div className="tinner">
              <div>
                <div className="tcolh">
                  <div className="tcoldot tcolha"/>
                  <div className="tcollbl tcollbla">Team A</div>
                </div>
                {[0,1].map(idx=>(
                  <div key={idx} className="pslot">
                    <select className={`psel af${teamA[idx]?' fi':''}`} value={teamA[idx]||""} onChange={e=>{const x=[...teamA];x[idx]=e.target.value;setTeamA(x);}}>
                      <option value="">— Select player —</option>
                      {playerOpts([teamA[1-idx],...teamB].filter(Boolean)).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
                    </select>
                    <div className="pselch"><Icon name="chevron" size={13} color="rgba(74,222,128,.45)"/></div>
                  </div>
                ))}
              </div>
              <div className="tcolvs">VS</div>
              <div>
                <div className="tcolh" style={{justifyContent:"flex-end"}}>
                  <div className="tcollbl tcollblb">Team B</div>
                  <div className="tcoldot tcolhb"/>
                </div>
                {[0,1].map(idx=>(
                  <div key={idx} className="pslot">
                    <select className={`psel bf${teamB[idx]?' fi':''}`} value={teamB[idx]||""} onChange={e=>{const x=[...teamB];x[idx]=e.target.value;setTeamB(x);}}>
                      <option value="">— Select player —</option>
                      {playerOpts([teamB[1-idx],...teamA].filter(Boolean)).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
                    </select>
                    <div className="pselch"><Icon name="chevron" size={13} color="rgba(255, 215, 0,.45)"/></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Score card */}
          <div className="sccard">
            <div className="sccardh">
              <div className="sccardhT">Sets</div>
              <button onClick={addSet} className="shufbtn"><Icon name="plus" size={11}/>Add Set</button>
            </div>
            <div className="sctbody">
              {sets.map((s,i)=>{
                const inv=invalidIdx.includes(i);
                return (
                  <div key={i} className="scrow">
                    <div className="scrowl" style={{display:"flex",alignItems:"center",gap:4}}>
                      S{i+1}
                      {sets.length>1 && (
                        <button onClick={()=>removeSet(i)} style={{background:"none",border:0,color:"var(--danger)",cursor:"pointer",padding:0,marginLeft:2,display:"flex"}} aria-label={`Remove set ${i+1}`}>
                          <Icon name="close" size={10} color="var(--danger)"/>
                        </button>
                      )}
                    </div>
                    <div className={`cstep a${inv?' invalid':''}`}>
                      <button className="csbtn" aria-label={`Decrease team A score, set ${i+1}`} onClick={()=>setSetValue(i,0,Math.max(0,s[0]-1))}><Icon name="minus" size={14} strokeWidth={2.5} color="var(--accent)"/></button>
                      <div className="csval">{s[0]}</div>
                      <button className="csbtn" aria-label={`Increase team A score, set ${i+1}`} onClick={()=>setSetValue(i,0,Math.min(9,s[0]+1))}><Icon name="plus" size={14} strokeWidth={2.5} color="var(--accent)"/></button>
                    </div>
                    <div className="scrows">—</div>
                    <div className={`cstep b${inv?' invalid':''}`}>
                      <button className="csbtn" aria-label={`Decrease team B score, set ${i+1}`} onClick={()=>setSetValue(i,1,Math.max(0,s[1]-1))}><Icon name="minus" size={14} strokeWidth={2.5} color="var(--gold)"/></button>
                      <div className="csval">{s[1]}</div>
                      <button className="csbtn" aria-label={`Increase team B score, set ${i+1}`} onClick={()=>setSetValue(i,1,Math.min(9,s[1]+1))}><Icon name="plus" size={14} strokeWidth={2.5} color="var(--gold)"/></button>
                    </div>
                  </div>
                );
              })}
              {validation.status === 'invalid' && (
                <div className="lmerr"><Icon name="alert" size={12}/> {validation.error}</div>
              )}
              {validation.status === 'incomplete' && (
                <div className="lmerr" style={{background:"var(--gold-dim)",borderColor:"var(--gold-glow)",color:"var(--gold)"}}><Icon name="alert" size={12}/> Match has no 2-set winner yet — cannot approve.</div>
              )}
              {validation.status === 'complete' && validation.droppedSets > 0 && (
                <div className="lmerr" style={{background:"var(--accent-dim)",borderColor:"var(--accent-glow)",color:"var(--accent)"}}><Icon name="info" size={12}/> Match decided 2-0; dead-rubber set will be dropped on save.</div>
              )}
            </div>
          </div>

          {/* MOTM */}
          <div className="mvpcard">
            <div className="mvpiw"><Icon name="star" size={18} color="var(--gold)"/></div>
            <div className="mvpsw">
              <div className="mvplbl">Man of the Match (optional)</div>
              <select className="mvpsel" value={motm||""} onChange={e=>setMotm(e.target.value||"")}>
                <option value="">— None —</option>
                {matchPlayerIds.map(pid=><option key={pid} value={pid}>{getName(pid)}</option>)}
              </select>
              <div className="mvpch"><Icon name="chevron" size={14}/></div>
            </div>
          </div>

          {/* Diff preview */}
          {diff.length > 0 && (
            <div style={{ background:"var(--accent-dim)", border:"1px solid var(--accent-glow)", borderRadius:"var(--r-md)", padding:"10px 12px", fontSize:11, color:"var(--text)" }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:".12em", color:"var(--accent)", marginBottom:6, textTransform:"uppercase", fontFamily:"var(--mono)" }}>Changes (sent to submitter)</div>
              <ul style={{ margin:0, paddingLeft:16 }}>
                {diff.map((d, i) => (
                  <li key={i} style={{ lineHeight:1.6, color:"#9090a4" }}>
                    <span style={{ color:"var(--text)", fontWeight:600 }}>{d.field}:</span>{" "}
                    <span style={{ color:"var(--danger)", textDecoration:"line-through" }}>{String(d.old)}</span>
                    <span style={{ color:"#9090a4", margin:"0 4px" }}>→</span>
                    <span style={{ color:"var(--accent)", fontWeight:700 }}>{String(d.new)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding:"12px 16px calc(12px + env(safe-area-inset-bottom, 0px))", borderTop:"1px solid var(--border)", background:"var(--surface)", display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:8 }}>
          <button onClick={onClose} disabled={saving} className="shcancel" style={{height:42}}>Cancel</button>
          <button onClick={save} disabled={saving || !canApprove} className={`savebtn${canApprove&&!saving?' on':' off'}`} style={{padding:"12px 0",fontSize:13}}>
            {canApprove && !saving && <Icon name="check" size={14} color="#000" strokeWidth={2.5}/>}
            {saving ? "Saving…" : "Save & Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
