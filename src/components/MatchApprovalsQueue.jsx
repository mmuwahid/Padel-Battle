import React, { useState } from "react";
import { win, formatDate } from '../utils/helpers';
import { useLeague } from '../LeagueContext';
import { EditMatchModal } from './EditMatchModal';
import Icon from './Icon';

// Phase 7 (S065 Q4=A): set count "Final 2-1" instead of cumulative game total.
function setsWonCount(sets){
  return sets.reduce((acc,s)=>{
    if(s[0]>s[1]) acc[0]++;
    else if(s[1]>s[0]) acc[1]++;
    return acc;
  },[0,0]);
}

// FT-09 / S044: Admin-facing approval queue.
// Phase 7: refactored to .mcard.pending frame + .mapprove-row footer (Q7=B keep text labels).
export function MatchApprovalsQueue() {
  const { supabase, pendingMatches, players, getName, showToast, loadLeagueData, isAdmin } = useLeague();
  const [confirmReject, setConfirmReject] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);

  const getAvatar = (pid) => players.find(pp=>pp.id===pid)?.avatar_url;

  if (!isAdmin || !pendingMatches || pendingMatches.length === 0) return null;

  const approveMatch = async (matchId) => {
    setActionBusy(matchId + "-approve");
    try {
      const { error } = await supabase.rpc("approve_match", { p_match_id: matchId });
      if (error) throw error;
      showToast("Match approved");
      await loadLeagueData();
    } catch (err) {
      console.error("approve_match failed", err);
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
      console.error("reject_match failed", err);
      showToast(err.message || "Failed to reject", "error");
    }
    setActionBusy(null);
    setConfirmReject(null);
  };

  const renderPlayer = (pid, sideClass) => {
    const av = getAvatar(pid);
    const name = getName(pid);
    return (
      <div key={pid} className="mplyr">
        <div className={`mplavi${sideClass==='win-side'?' win':''}`}>{av?<img src={av} alt=""/>:(name[0]||'?').toUpperCase()}</div>
        <div className="mplname-block">
          <div className={`mplnam ${sideClass}`}>{name}</div>
        </div>
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
          const aSide = w==='A' ? 'win-side' : (w==='B' ? 'los-side' : 'nd-side');
          const bSide = w==='B' ? 'win-side' : (w==='A' ? 'los-side' : 'nd-side');
          const aLabel = w==='A' ? 'WIN' : (w==='B' ? 'LOSS' : 'PENDING');
          const bLabel = w==='B' ? 'WIN' : (w==='A' ? 'LOSS' : 'PENDING');
          const aClass = w==='A' ? 'win' : (w==='B' ? 'los' : 'nd');
          const bClass = w==='B' ? 'win' : (w==='A' ? 'los' : 'nd');
          const [sA, sB] = setsWonCount(m.sets || []);
          return (
            <div key={m.id} className="mcard pending">
              <div className="mhd2">
                <div className="mdate2">Submitted by <strong style={{color:"var(--text)",fontWeight:600}}>{submitterName}</strong></div>
                <div className="macts">
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"#9090a4"}}>{formatDate(m.date)}</span>
                </div>
              </div>
              <div className="mbody2">
                <div className="mgrid2">
                  <div className="mteamcol">
                    <div className={`mresl ${aClass}`}>{aLabel}</div>
                    {(m.team_a||[]).map(pid=>renderPlayer(pid, aSide))}
                  </div>
                  <div className="mscols2">
                    {(m.sets||[]).map((set,i)=>{
                      const aWonSet = set[0]>set[1];
                      const bWonSet = set[1]>set[0];
                      const winClass = (w==='A' && aWonSet) || (w==='B' && bWonSet) ? ' win' : '';
                      return <div key={i} className={`mscpill2${winClass}`}>{set[0]}-{set[1]}</div>;
                    })}
                    <div className="mtotal2">Sets {sA}-{sB}</div>
                  </div>
                  <div className="mteamcol r">
                    <div className={`mresl ${bClass}`}>{bLabel}</div>
                    {(m.team_b||[]).map(pid=>renderPlayer(pid, bSide))}
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
                    <button className="mab approve" onClick={()=>approveMatch(m.id)} disabled={actionBusy === m.id + "-approve"}>{actionBusy === m.id + "-approve" ? "..." : "\u2713 Approve"}</button>
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
