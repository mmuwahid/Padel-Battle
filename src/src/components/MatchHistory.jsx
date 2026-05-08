import React, { useState, useEffect, useRef } from "react";
import { win, formatDate, flagEmoji } from '../utils/helpers';
import { useLeague } from '../LeagueContext';
import { MatchApprovalsQueue } from './MatchApprovalsQueue';
import Icon from './Icon';

// Phase 7 v2 (S066): 8-emoji reaction stack (single horizontal row).
// Trigger pill is just \uD83D\uDC4D (no text). Click \uD83D\uDC4D \u2192 popover above shows all 8.
// Pick an emoji \u2192 logged + popover closes. Outside-click also closes.
const REACTIONS = [
  { key: "fire",         emoji: "\uD83D\uDD25" },
  { key: "clap",         emoji: "\uD83D\uDC4F" },
  { key: "laugh",        emoji: "\uD83D\uDE02" },
  { key: "shock",        emoji: "\uD83D\uDE31" },
  { key: "thumbsup",     emoji: "\uD83D\uDC4D" },
  { key: "lightning",    emoji: "\u26A1" },
  { key: "strongarm",    emoji: "\uD83D\uDCAA" },
  { key: "middlefinger", emoji: "\uD83D\uDD95" },
];

// Phase 7 v2 (S066): set count + total points displayed in FINAL column.
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

export function MatchHistory({onEdit,shareMatch,sel,onMatchDeleted}){
  const { supabase, user, players, approvedMatches, pendingMatches, incompleteMatches, isAdmin, getName, showToast, seasons, selectedSeason, setSelectedSeason } = useLeague();
  const seasonFilter = (m) => !selectedSeason || m.season_id === selectedSeason;
  const matches = approvedMatches.filter(seasonFilter);
  const myPendingMatches = (pendingMatches || []).filter(m => m.logged_by === user?.id).filter(seasonFilter);
  const incompleteList = (incompleteMatches || []).filter(seasonFilter);
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [cd,setCd]=useState(null);
  const [deleting,setDeleting]=useState(false);
  const [reactions,setReactions]=useState({});
  const [myReactions,setMyReactions]=useState({});
  // S066: which match's picker popover is open (matchId or null)
  const [pickerOpen,setPickerOpen]=useState(null);
  const popoverRef = useRef(null);

  const getAvatar = (pid) => players.find(pp=>pp.id===pid)?.avatar_url;
  const getCountry = (pid) => players.find(pp=>pp.id===pid)?.country;

  // Stable key so the SELECT only refires when the SET of match IDs actually changes
  // (not on every render due to .filter() returning new array refs). Without this,
  // a SELECT in flight at click-time could overwrite the optimistic upsert state
  // and the reaction would visibly flash for ~1s before disappearing.
  const matchIdsKey = matches.map(m=>m.id).join(',');
  useEffect(()=>{
    if(!matchIdsKey||!supabase)return;
    const matchIds=matchIdsKey.split(',');
    let cancelled = false;
    supabase.from("match_reactions").select("match_id,user_id,reaction").in("match_id",matchIds).then(({data})=>{
      if(cancelled||!data)return;
      const grouped={};const mine={};
      data.forEach(r=>{
        if(!grouped[r.match_id])grouped[r.match_id]=[];
        grouped[r.match_id].push(r);
        if(user&&r.user_id===user.id)mine[r.match_id]=r.reaction;
      });
      setReactions(grouped);setMyReactions(mine);
    });
    return ()=>{ cancelled = true; };
  },[matchIdsKey,supabase,user?.id]);

  // S066: outside-click closes the picker popover
  useEffect(()=>{
    if(!pickerOpen)return;
    const onDown=(e)=>{
      if(popoverRef.current && !popoverRef.current.contains(e.target)) setPickerOpen(null);
    };
    document.addEventListener("mousedown",onDown);
    document.addEventListener("touchstart",onDown,{passive:true});
    return ()=>{
      document.removeEventListener("mousedown",onDown);
      document.removeEventListener("touchstart",onDown);
    };
  },[pickerOpen]);

  async function pickReaction(matchId, reactionKey){
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
    setPickerOpen(null);
  }

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

  // Render one player vertical mini-card: avatar + name + flag
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

  // .mgrid3: 6-col layout, header row + 2 team rows. FINAL col spans rows 2-3.
  const renderBody = (m, mode) => {
    const isIncomplete = mode === 'incomplete';
    const isPending = mode === 'pending';
    const w = win(m.sets);
    const aWin = w==='A';
    const bWin = w==='B';
    const aLabel = aWin ? 'WIN' : (bWin ? 'LOSS' : (isPending ? 'PENDING' : '\u2014'));
    const bLabel = bWin ? 'WIN' : (aWin ? 'LOSS' : (isPending ? 'PENDING' : '\u2014'));
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
      <div className="mbody3">
        <div className="mgrid3" style={gridStyle}>
          {/* Header row */}
          {sets.map((_,i)=>(
            <div key={`h${i}`} className="mghd" style={{gridRow:1, gridColumn:3+i}}>
              {i===2 ? 'S/TB' : `S${i+1}`}
            </div>
          ))}
          <div className="mghd mghd-final" style={{gridRow:1, gridColumn:finalCol}}>FINAL</div>

          {/* Team A */}
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

          {/* Team B */}
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

          {/* FINAL spans rows 2-3 */}
          <div className="mfinal2" style={{gridRow:'2 / span 2', gridColumn:finalCol}}>
            {isIncomplete ? (
              <div className="mfinal2-pts" style={{textAlign:'center'}}>Not<br/>counted</div>
            ) : isPending ? (
              <>
                <div className="mfinal2-score" style={{fontSize:22}}>{sA}–{sB}</div>
                <div className="mfinal2-pts">Sets</div>
              </>
            ) : (
              <>
                <div className="mfinal2-score">{sA}–{sB}</div>
                <div className="mfinal2-pts">{pA}–{pB}</div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mtbar">
        <div className="mtmeta">{s.length} match{s.length===1?'':'es'}{seasons && seasons.length>0 && selectedSeason ? ` \u00B7 ${seasons.find(ss=>ss.id===selectedSeason)?.name||''}`:''}</div>
        {seasons && seasons.length > 0 && (
          <select className="spill" value={selectedSeason||""} onChange={e=>setSelectedSeason(e.target.value)}>
            {seasons.map(sn=><option key={sn.id} value={sn.id}>{sn.name}{sn.active?" (active)":""}</option>)}
          </select>
        )}
      </div>

      <MatchApprovalsQueue />

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
            const matchReactions = reactions[m.id] || [];
            const counts = REACTIONS.map(r => ({
              key: r.key,
              emoji: r.emoji,
              count: matchReactions.filter(x=>x.reaction===r.key).length,
              mine: myReactions[m.id]===r.key,
            })).filter(c => c.count > 0);
            const isPickerOpen = pickerOpen === m.id;
            return (
              <div key={m.id} className={`mcard${isIncomplete?' inc':''}`}>
                <div className="mhd2">
                  <div className="mdate2">{formatDate(m.date)}</div>
                  {isIncomplete
                    ? <div className="motm-pill muted">Incomplete</div>
                    : (m.motm && <div className="motm-pill"><Icon name="star" size={12}/>{getName(m.motm)}</div>)
                  }
                  <div className="macts">
                    <button className="mact" onClick={()=>shareMatch(m)} aria-label="Share"><Icon name="share" size={14}/></button>
                    <button className="mact" onClick={()=>onEdit(m)} aria-label="Edit"><Icon name="edit" size={14}/></button>
                    {isAdmin && (cd===m.id ? (
                      <>
                        <button onClick={()=>deleteMatch(m.id)} disabled={deleting} style={{background:'var(--danger)',border:'none',color:'#fff',fontSize:9,fontWeight:700,padding:'4px 7px',borderRadius:6,cursor:'pointer',opacity:deleting?.6:1}}>{deleting?'\u2026':'Yes'}</button>
                        <button onClick={()=>setCd(null)} style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)',fontSize:9,fontWeight:700,padding:'4px 7px',borderRadius:6,cursor:'pointer'}}>No</button>
                      </>
                    ) : (
                      <button className="mact da" onClick={()=>setCd(m.id)} aria-label="Delete"><Icon name="trash" size={14}/></button>
                    ))}
                  </div>
                </div>
                {renderBody(m, mode)}
                {!isIncomplete && (
                  <div className="mreact2">
                    {isPickerOpen && (
                      <div className="rxpop" ref={popoverRef}>
                        {REACTIONS.map(r=>(
                          <button key={r.key}
                            className={`rxpop-emoji${myReactions[m.id]===r.key?' on':''}`}
                            onClick={()=>pickReaction(m.id, r.key)}
                            aria-label={r.key}>
                            {r.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    <button className="rxtrig"
                      onClick={()=>setPickerOpen(prev => prev===m.id ? null : m.id)}
                      aria-label="React">
                      <span className="thumbsup">{"\uD83D\uDC4D"}</span>
                    </button>
                    {counts.map(c=>(
                      <button key={c.key}
                        className={`rxbare${c.mine?' on':''}`}
                        onClick={()=>pickReaction(m.id, c.key)}
                        aria-label={`${c.key} ${c.count}`}>
                        <span className="e">{c.emoji}</span>
                        <span className="n">{c.count}</span>
                      </button>
                    ))}
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
