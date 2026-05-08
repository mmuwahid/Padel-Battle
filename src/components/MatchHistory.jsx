import React, { useState, useEffect } from "react";
import { win, formatDate } from '../utils/helpers';
import { useLeague } from '../LeagueContext';
import { MatchApprovalsQueue } from './MatchApprovalsQueue';
import Icon from './Icon';

const REACTIONS = [
  { key: "fire", emoji: "\uD83D\uDD25" },
  { key: "trophy", emoji: "\uD83C\uDFC6" },
  { key: "clap", emoji: "\uD83D\uDC4F" },
  { key: "laugh", emoji: "\uD83D\uDE02" },
  { key: "shock", emoji: "\uD83D\uDE31" },
];

// Phase 7 (S065 Q4=A): vertical score column. Total chip shows "Final 2-1"
// (sets won by each team), not the cumulative game total.
function setsWonCount(sets){
  return sets.reduce((acc,s)=>{
    if(s[0]>s[1]) acc[0]++;
    else if(s[1]>s[0]) acc[1]++;
    return acc;
  },[0,0]);
}

export function MatchHistory({onEdit,shareMatch,sel,onMatchDeleted}){
  const { supabase, user, players, approvedMatches, pendingMatches, incompleteMatches, isAdmin, getName, showToast, seasons, selectedSeason, setSelectedSeason } = useLeague();
  // FT-09: existing list reads approved-only. My-pending section reads pending submitted by current user.
  // FT-09b / S045: incomplete matches are merged into the timeline with greyed styling + "Incomplete" badge.
  // Issue #40: season selector synced via LeagueContext (same source as Ranking screen).
  const seasonFilter = (m) => !selectedSeason || m.season_id === selectedSeason;
  const matches = approvedMatches.filter(seasonFilter);
  const myPendingMatches = (pendingMatches || []).filter(m => m.logged_by === user?.id).filter(seasonFilter);
  const incompleteList = (incompleteMatches || []).filter(seasonFilter);
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [cd,setCd]=useState(null);
  const [deleting,setDeleting]=useState(false);
  const [reactions,setReactions]=useState({});// {matchId: [{user_id,reaction},...]}
  const [myReactions,setMyReactions]=useState({});// {matchId: "fire"|null}

  // S052 helper: avatar lookup by player id
  const getAvatar = (pid) => players.find(pp=>pp.id===pid)?.avatar_url;

  useEffect(()=>{
    if(!matches.length||!supabase)return;
    const matchIds=matches.map(m=>m.id);
    supabase.from("match_reactions").select("match_id,user_id,reaction").in("match_id",matchIds).then(({data})=>{
      if(!data)return;
      const grouped={};const mine={};
      data.forEach(r=>{
        if(!grouped[r.match_id])grouped[r.match_id]=[];
        grouped[r.match_id].push(r);
        if(user&&r.user_id===user.id)mine[r.match_id]=r.reaction;
      });
      setReactions(grouped);setMyReactions(mine);
    });
  },[matches,supabase,user]);

  async function toggleReaction(matchId,reactionKey){
    if(!user)return;
    const current=myReactions[matchId];
    if(current===reactionKey){
      await supabase.from("match_reactions").delete().eq("match_id",matchId).eq("user_id",user.id);
      setMyReactions(prev=>({...prev,[matchId]:undefined}));
      setReactions(prev=>({...prev,[matchId]:(prev[matchId]||[]).filter(r=>r.user_id!==user.id)}));
    }else{
      await supabase.from("match_reactions").upsert({match_id:matchId,user_id:user.id,reaction:reactionKey},{onConflict:"match_id,user_id"});
      setMyReactions(prev=>({...prev,[matchId]:reactionKey}));
      setReactions(prev=>{
        const existing=(prev[matchId]||[]).filter(r=>r.user_id!==user.id);
        return {...prev,[matchId]:[...existing,{user_id:user.id,reaction:reactionKey}]};
      });
    }
  }

  // Merge approved + incomplete for timeline display.
  const timeline = [...matches, ...incompleteList];
  const s = [...timeline].sort((a,b)=>new Date(b.date)-new Date(a.date));

  async function deleteMatch(matchId){
    if(!isAdmin)return;
    setDeleting(true);
    try{
      const {error}=await supabase.from("matches").delete().eq("id",matchId);
      if(error)throw error;
      setCd(null);
      if(onMatchDeleted)onMatchDeleted();
      if(showToast)showToast("Match deleted");
    }catch(_err){
      if(showToast)showToast("Failed to delete match","error");
    }
    setDeleting(false);
  }

  // Render a player row inside .mteamcol
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

  // Render the match-card body grid (used by both approved and pending cards)
  const renderBody = (m, mode) => {
    // mode: 'approved' | 'incomplete' | 'pending'
    const isIncomplete = mode === 'incomplete';
    const isPending = mode === 'pending';
    const w = isIncomplete || isPending ? null : win(m.sets);
    const aSide = w==='A' ? 'win-side' : (w==='B' ? 'los-side' : 'nd-side');
    const bSide = w==='B' ? 'win-side' : (w==='A' ? 'los-side' : 'nd-side');
    const aLabel = w==='A' ? 'WIN' : (w==='B' ? 'LOSS' : (isPending ? 'PENDING' : '—'));
    const bLabel = w==='B' ? 'WIN' : (w==='A' ? 'LOSS' : (isPending ? 'PENDING' : '—'));
    const aClass = w==='A' ? 'win' : (w==='B' ? 'los' : 'nd');
    const bClass = w==='B' ? 'win' : (w==='A' ? 'los' : 'nd');
    const [sA, sB] = setsWonCount(m.sets || []);
    return (
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
            {!isPending && !isIncomplete && <div className="mtotal2">Final {sA}-{sB}</div>}
            {isPending && <div className="mtotal2">Sets {sA}-{sB}</div>}
            {isIncomplete && <div className="mtotal2" style={{fontStyle:'italic'}}>Not counted</div>}
          </div>
          <div className="mteamcol r">
            <div className={`mresl ${bClass}`}>{bLabel}</div>
            {(m.team_b||[]).map(pid=>renderPlayer(pid, bSide))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Top bar: season meta + .spill selector */}
      <div className="mtbar">
        <div className="mtmeta">{s.length} match{s.length===1?'':'es'}{seasons && seasons.length>0 && selectedSeason ? ` \u00B7 ${seasons.find(ss=>ss.id===selectedSeason)?.name||''}`:''}</div>
        {seasons && seasons.length > 0 && (
          <select className="spill" value={selectedSeason||""} onChange={e=>setSelectedSeason(e.target.value)}>
            {seasons.map(sn=><option key={sn.id} value={sn.id}>{sn.name}{sn.active?" (active)":""}</option>)}
          </select>
        )}
      </div>

      {/* FT-09: Admin Approvals Queue — visible only to admins/owners with non-empty queue */}
      <MatchApprovalsQueue />

      {/* FT-09: My Pending Submissions — collapsible (Q6=C) */}
      {myPendingMatches.length > 0 && (
        <div className="mlist" style={{paddingBottom:0}}>
          <div>
            <div className={`mp-head${pendingExpanded?'':' collapsed'}`} onClick={()=>setPendingExpanded(v=>!v)}>
              <div className="mp-head-l">
                <span style={{fontSize:14,lineHeight:1}}>{"\u23F3"}</span>
                <span className="mp-head-title">My Pending</span>
                <span className="mp-head-count">{myPendingMatches.length}</span>
              </div>
              <span className={`mp-head-chev${pendingExpanded?' open':''}`}>{"\u203A"}</span>
            </div>
            {pendingExpanded && (
              <div className="mp-body">
                {myPendingMatches.map(m=>(
                  <div key={m.id} className="mcard pending">
                    <div className="mhd2">
                      <div className="mdate2">{formatDate(m.date)}</div>
                      <span className="pending-tag">{"\u23F3"} Awaiting approval</span>
                    </div>
                    {renderBody(m, 'pending')}
                  </div>
                ))}
                <div className="mp-foot">Won't count until an admin approves.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Match list */}
      {s.length===0 && (
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:40,marginBottom:12}}>{"\uD83C\uDFBE"}</div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>No matches yet</div>
          <div style={{fontSize:12,color:"#9090a4",lineHeight:1.5}}>Tap the + button to log your first match.</div>
        </div>
      )}

      {s.length > 0 && (
        <div className="mlist">
          {s.map(m=>{
            const isIncomplete = m.status === 'incomplete';
            const mode = isIncomplete ? 'incomplete' : 'approved';
            return (
              <div key={m.id} className={`mcard${isIncomplete?' inc':''}`}>
                <div className="mhd2">
                  <div className="mdate2">{formatDate(m.date)}</div>
                  {/* MOTM pill: absolute-centered (Q1=A). Incomplete card shows muted "Incomplete" pill instead. */}
                  {isIncomplete
                    ? <div className="motm-pill muted">Incomplete</div>
                    : (m.motm && <div className="motm-pill"><Icon name="star" size={12}/>{getName(m.motm)}</div>)
                  }
                  <div className="macts">
                    <button className="mact" onClick={()=>shareMatch(m)} aria-label="Share"><Icon name="share" size={14}/></button>
                    <button className="mact" onClick={()=>onEdit(m)} aria-label="Edit"><Icon name="edit" size={14}/></button>
                    {isAdmin && (cd===m.id ? (
                      <>
                        <button onClick={()=>deleteMatch(m.id)} disabled={deleting} style={{background:'var(--danger)',border:'none',color:'#fff',fontSize:9,fontWeight:700,padding:'4px 7px',borderRadius:6,cursor:'pointer',opacity:deleting?.6:1}}>{deleting?'…':'Yes'}</button>
                        <button onClick={()=>setCd(null)} style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)',fontSize:9,fontWeight:700,padding:'4px 7px',borderRadius:6,cursor:'pointer'}}>No</button>
                      </>
                    ) : (
                      <button className="mact da" onClick={()=>setCd(m.id)} aria-label="Delete"><Icon name="trash" size={14}/></button>
                    ))}
                  </div>
                </div>
                {renderBody(m, mode)}
                {/* Reactions only on approved matches (incomplete are visually faded) */}
                {!isIncomplete && (
                  <div className="mreact">
                    {REACTIONS.map(r=>{
                      const count = (reactions[m.id]||[]).filter(x=>x.reaction===r.key).length;
                      const mine = myReactions[m.id]===r.key;
                      return (
                        <button key={r.key} className={`rxpill${mine?' on':''}`} onClick={()=>toggleReaction(m.id, r.key)}>
                          <span>{r.emoji}</span>
                          {count>0 && <span className="rxn">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
