import React, { useState } from "react";
import { win, formatDate, flagEmoji } from '../utils/helpers';
import { useLeague } from '../LeagueContext';
import { EditMatchModal } from './EditMatchModal';
import Icon from './Icon';

// Phase 7 v2 (S066): set count + total points in FINAL column.
function setsWonCount(sets){
  return sets.reduce((acc,s)=>{
    if(s[0]>s[1]) acc[0]++;
    else if(s[1]>s[0]) acc[1]++;
    return acc;
  },[0,0]);
}
function pointsCount(sets){
  return sets.reduce((acc,s)=>{ acc[0]+=(s[0]||0); acc[1]+=(s[1]||0); return acc; },[0,0]);
}

// FT-09 / S044: Admin-facing approval queue.
// Phase 7 v2 (S066): refactored to .mgrid3 score grid + flags + per-team row.
export function MatchApprovalsQueue() {
  const { supabase, pendingMatches, players, getName, showToast, loadLeagueData, canDo } = useLeague();
  const [confirmReject, setConfirmReject] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);

  const getAvatar = (pid) => players.find(pp=>pp.id===pid)?.avatar_url;
  const getCountry = (pid) => players.find(pp=>pp.id===pid)?.country;

  // S092 #129: gated on the approve_matches capability (was isAdmin) so an admin
  // whose owner turned this off no longer sees the approvals queue.
  if (!canDo('approve_matches') || !pendingMatches || pendingMatches.length === 0) return null;

  const approveMatch = async (matchId) => {
    setActionBusy(matchId + "-approve");
    try {
      const { error } = await supabase.rpc("approve_match", { p_match_id: matchId });
      if (error) throw error;
      showToast("Match approved");
      await loadLeagueData();
    } catch (err) {
      if (import.meta.env.DEV) console.error("approve_match failed", err);
      showToast(err.message || "Failed to approve", "error");
    }
    setActionBusy(null);
  };

  const rejectMatch = async (matchId) => {
    setActionBusy(matchId + "-reject");
    try {
      const { error } = await supabase.rpc("reject_match", { p_match_id: matchId });
      if (error) throw error;
      showToast("Match rejected");
      await loadLeagueData();
    } catch (err) {
      if (import.meta.env.DEV) console.error("reject_match failed", err);
      showToast(err.message || "Failed to reject", "error");
    }
    setActionBusy(null);
    setConfirmReject(null);
  };

  const renderPlayerCell = (pid, isWinSide) => {
    const av = getAvatar(pid);
    const name = getName(pid);
    const country = getCountry(pid);
    const flag = country ? flagEmoji(country) : "";
    return (
      <div key={pid} className="mplyr2">
        <div className={`mplavi2${isWinSide?'':' los'}`}>{av?<img src={av} alt=""/>:(name[0]||'?').toUpperCase()}</div>
        <div className={`mplnam2 ${isWinSide?'win-side':'los-side'}`}>{name}</div>
        {flag && <span className="mplflag2 flag">{flag}</span>}
      </div>
    );
  };

  return (
    <div>
      <div style={{padding:"14px 18px 4px"}}>
        <h3 style={{fontSize:12,fontWeight:800,color:"var(--gold)",textTransform:"uppercase",letterSpacing:".06em",margin:0,display:"flex",alignItems:"center",gap:8}}>
          <span>{"\u23F3"} Approvals Queue</span>
          <span style={{background:"var(--gold)",color:"#000",fontSize:10,fontWeight:800,padding:"1px 7px",borderRadius:6}}>{pendingMatches.length}</span>
        </h3>
      </div>

      <div className="mlist" style={{paddingTop:0}}>
        {pendingMatches.map(m => {
          const submitterName = m.logged_by ? getName(m.logged_by) : "Unknown";
          const w = win(m.sets);
          const aWin = w==='A';
          const bWin = w==='B';
          const aLabel = aWin ? 'WIN' : (bWin ? 'LOSS' : 'PENDING');
          const bLabel = bWin ? 'WIN' : (aWin ? 'LOSS' : 'PENDING');
          const sets = m.sets || [];
          const numSets = sets.length;
          const [sA, sB] = setsWonCount(sets);
          const [pA, pB] = pointsCount(sets);
          const tbIdx = numSets === 3 ? 2 : -1;
          const setColTemplate = Array.from({length:numSets}, ()=>'30px').join(' ');
          const gridStyle = numSets > 0
            ? { gridTemplateColumns: `32px minmax(0,1fr) ${setColTemplate} 64px` }
            : { gridTemplateColumns: `32px minmax(0,1fr) 64px` };
          const finalCol = 3 + numSets;

          return (
            <div key={m.id} className="mcard pending">
              <div className="mhd2">
                <div className="mdate2">Submitted by <strong style={{color:"var(--text)",fontWeight:600}}>{submitterName}</strong></div>
                <div className="macts">
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"#9090a4"}}>{formatDate(m.date)}</span>
                </div>
              </div>
              <div className="mbody3">
                <div className="mgrid3" style={gridStyle}>
                  {sets.map((_,i)=>(
                    <div key={`h${i}`} className="mghd" style={{gridRow:1, gridColumn:3+i}}>
                      {i===2 ? 'S/TB' : `S${i+1}`}
                    </div>
                  ))}
                  <div className="mghd mghd-final" style={{gridRow:1, gridColumn:finalCol}}>FINAL</div>

                  <div className={`mwl ${aWin?'win':(bWin?'los':'nd')}`} style={{gridRow:2, gridColumn:1}}>{aLabel}</div>
                  <div className="mteam2 row-a" style={{gridRow:2, gridColumn:2}}>
                    {(m.team_a||[]).map(pid=>renderPlayerCell(pid, aWin))}
                  </div>
                  {sets.map((set,i)=>{
                    const aWonSet = set[0]>set[1];
                    const isTb = i===tbIdx;
                    const cls = `${aWonSet ? 'win' : 'los'}${isTb ? ' tb' : ''}`;
                    return <div key={`a${i}`} className={`msc ${cls} row-a`} style={{gridRow:2, gridColumn:3+i}}>{set[0]}</div>;
                  })}

                  <div className={`mwl ${bWin?'win':(aWin?'los':'nd')}`} style={{gridRow:3, gridColumn:1}}>{bLabel}</div>
                  <div className="mteam2 row-b" style={{gridRow:3, gridColumn:2}}>
                    {(m.team_b||[]).map(pid=>renderPlayerCell(pid, bWin))}
                  </div>
                  {sets.map((set,i)=>{
                    const bWonSet = set[1]>set[0];
                    const isTb = i===tbIdx;
                    const cls = `${bWonSet ? 'win' : 'los'}${isTb ? ' tb' : ''}`;
                    return <div key={`b${i}`} className={`msc ${cls} row-b`} style={{gridRow:3, gridColumn:3+i}}>{set[1]}</div>;
                  })}

                  <div className="mfinal2" style={{gridRow:'2 / span 2', gridColumn:finalCol}}>
                    <div className="mfinal2-score">{sA}–{sB}</div>
                    <div className="mfinal2-pts">{pA}–{pB}</div>
                  </div>
                </div>
              </div>
              {m.motm && (
                <div className="mapprove-meta">
                  <Icon name="star" size={11} color="var(--gold)"/> MOTM: <strong style={{color:"var(--gold)"}}>{getName(m.motm)}</strong>
                </div>
              )}
              <div className="mapprove-row">
                {confirmReject === m.id ? (
                  <div className="mreject-confirm">
                    <span>Reject permanently?</span>
                    <button className="mab reject" onClick={()=>rejectMatch(m.id)} disabled={actionBusy === m.id + "-reject"}>{actionBusy === m.id + "-reject" ? "..." : "Yes, reject"}</button>
                    <button className="mab edit" onClick={()=>setConfirmReject(null)}>No</button>
                  </div>
                ) : (
                  <>
                    <button className="mab approve lp" onClick={()=>approveMatch(m.id)} disabled={actionBusy === m.id + "-approve"}>{actionBusy === m.id + "-approve" ? "..." : "\u2713 Approve"}</button>
                    <button className="mab edit" onClick={()=>setEditingMatch(m)}>{"\u270E"} Edit</button>
                    <button className="mab reject" onClick={()=>setConfirmReject(m.id)}>{"\u2715"} Reject</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingMatch && (
        <EditMatchModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={loadLeagueData}
        />
      )}
    </div>
  );
}
