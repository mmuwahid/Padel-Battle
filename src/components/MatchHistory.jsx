import React, { useState, useEffect } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, BL, PU } from '../theme';
import { win, formatDate, setTotals } from '../utils/helpers';
import { useLeague } from '../LeagueContext';
import { MatchApprovalsQueue } from './MatchApprovalsQueue';

const REACTIONS = [
  { key: "fire", emoji: "\uD83D\uDD25" },
  { key: "trophy", emoji: "\uD83C\uDFC6" },
  { key: "clap", emoji: "\uD83D\uDC4F" },
  { key: "laugh", emoji: "\uD83D\uDE02" },
  { key: "shock", emoji: "\uD83D\uDE31" },
];

export function MatchHistory({onEdit,shareMatch,sel,onMatchDeleted}){
  const { supabase, user, players, approvedMatches, pendingMatches, incompleteMatches, isAdmin, getName, showToast } = useLeague();
  // FT-09: existing list reads approved-only. My-pending section reads pending submitted by current user.
  // FT-09b / S045: incomplete matches are merged into the timeline with grey styling + "Incomplete" badge.
  const matches = approvedMatches;
  const myPendingMatches = (pendingMatches || []).filter(m => m.logged_by === user?.id);
  const incompleteList = incompleteMatches || [];
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [fp,setFp]=useState("");
  const [cd,setCd]=useState(null);
  const [deleting,setDeleting]=useState(false);
  const [reactions,setReactions]=useState({});// {matchId: [{user_id,reaction},...]}
  const [myReactions,setMyReactions]=useState({});// {matchId: "fire"|null}

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
      // Remove reaction
      await supabase.from("match_reactions").delete().eq("match_id",matchId).eq("user_id",user.id);
      setMyReactions(prev=>({...prev,[matchId]:undefined}));
      setReactions(prev=>({...prev,[matchId]:(prev[matchId]||[]).filter(r=>r.user_id!==user.id)}));
    }else{
      // Upsert reaction
      await supabase.from("match_reactions").upsert({match_id:matchId,user_id:user.id,reaction:reactionKey},{onConflict:"match_id,user_id"});
      setMyReactions(prev=>({...prev,[matchId]:reactionKey}));
      setReactions(prev=>{
        const existing=(prev[matchId]||[]).filter(r=>r.user_id!==user.id);
        return {...prev,[matchId]:[...existing,{user_id:user.id,reaction:reactionKey}]};
      });
    }
  }
  // Merge approved + incomplete for timeline display. Incomplete renders with grey styling + badge.
  const timeline = [...matches, ...incompleteList];
  const f = fp ? timeline.filter(m => m.team_a.includes(fp) || m.team_b.includes(fp)) : timeline;
  const s = [...f].sort((a,b)=>new Date(b.date)-new Date(a.date));

  async function deleteMatch(matchId){
    if(!isAdmin)return;
    try{
      const {error}=await supabase.from("matches").delete().eq("id",matchId);
      if(error)throw error;
      setCd(null);
      if(onMatchDeleted)onMatchDeleted();
      if(showToast)showToast("Match deleted");
    }catch(_err){
      if(showToast)showToast("Failed to delete match","error");
    }
  }

  return (
    <div>
      {/* FT-09: Admin Approvals Queue — visible only to admins/owners with non-empty queue */}
      <MatchApprovalsQueue />

      {/* FT-09: My Pending Submissions — shown only when current user has pending matches they submitted */}
      {myPendingMatches.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div onClick={() => setPendingExpanded(v => !v)} style={{ background: CD, border: `1px solid ${GD}4d`, borderRadius: pendingExpanded ? "12px 12px 0 0" : 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>⏳</span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: GD, textTransform: "uppercase" }}>My Pending</span>
              <span style={{ background: GD, color: "#000", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 6, marginLeft: 4 }}>{myPendingMatches.length}</span>
            </div>
            <span style={{ color: MT, fontSize: 14, transform: pendingExpanded ? "rotate(90deg)" : "none", transition: "transform 0.18s" }}>›</span>
          </div>
          {pendingExpanded && (
            <div style={{ background: CD, border: `1px solid ${GD}4d`, borderTop: 0, borderRadius: "0 0 12px 12px", padding: 8 }}>
              {myPendingMatches.map(m => (
                <div key={m.id} style={{ background: CD2, border: `1px solid ${BD}`, borderLeft: `3px solid ${GD}`, borderRadius: 10, padding: 12, marginBottom: 6, opacity: 0.92 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: MT, fontFamily: "'JetBrains Mono',monospace" }}>{formatDate(m.date)}</span>
                    <span style={{ background: `${GD}2e`, color: GD, border: `1px solid ${GD}4d`, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>⏳ Awaiting approval</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ textAlign: "center", color: BL, fontSize: 12, fontWeight: 600 }}>{getName(m.team_a?.[0])} & {getName(m.team_a?.[1])}</div>
                    <div style={{ fontSize: 10, color: MT, fontWeight: 700 }}>vs</div>
                    <div style={{ textAlign: "center", color: GD, fontSize: 12, fontWeight: 600 }}>{getName(m.team_b?.[0])} & {getName(m.team_b?.[1])}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, background: BG, borderRadius: 8, padding: 6, marginBottom: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: TX, letterSpacing: 1 }}>
                    {(m.sets || []).map((s, i) => {
                      const wn = s[0] > s[1] ? "A" : (s[1] > s[0] ? "B" : null);
                      const col = wn === "A" ? BL : (wn === "B" ? GD : TX);
                      return <span key={i} style={{ color: col }}>{s[0]}–{s[1]}</span>;
                    })}
                  </div>
                  <div style={{ textAlign: "center", fontSize: 10, color: MT }}>Won't count until an admin approves.</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <select value={fp} onChange={e=>setFp(e.target.value)} style={{...sel,flex:1}}>
          <option value="">All Players</option>
          {players.map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
        </select>
      </div>
      <div style={{fontSize:11,color:MT,marginBottom:8,fontWeight:400}}>{s.length} matches</div>
      {s.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:40,marginBottom:12}}>🎾</div>
          <div style={{fontSize:15,fontWeight:600,color:TX,marginBottom:6}}>No matches yet</div>
          <div style={{fontSize:12,color:MT,lineHeight:1.5}}>Tap the + button to log your first match.</div>
        </div>
      )}
      {s.map(m=>{const isIncomplete=m.status==='incomplete';const w=isIncomplete?null:win(m.sets);const [tA,tB]=setTotals(m.sets);
        return (<div key={m.id} style={{background:CD,borderRadius:12,border:`1px solid ${isIncomplete?MT+"40":BD}`,padding:14,marginBottom:8,opacity:isIncomplete?0.7:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:MT,fontWeight:400}}>{formatDate(m.date)}</span>
              {isIncomplete&&<span style={{fontSize:9,fontWeight:700,letterSpacing:0.8,padding:"2px 6px",borderRadius:4,textTransform:"uppercase",background:`${MT}25`,color:MT,border:`1px solid ${MT}40`}}>Incomplete</span>}
            </div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {m.motm&&!isIncomplete&&<span style={{fontSize:10,background:`${GD}20`,color:GD,padding:"2px 6px",borderRadius:6,fontWeight:600}}>⭐{getName(m.motm)}</span>}
              <button onClick={()=>shareMatch(m)} style={{background:"none",border:"none",fontSize:13,cursor:"pointer",padding:"2px 4px"}}>📤</button>
              <button onClick={()=>onEdit(m)} style={{background:"none",border:"none",color:BL,fontSize:13,cursor:"pointer",padding:"2px 4px"}}>✏️</button>
              {isAdmin&&(cd===m.id?<div style={{display:"flex",gap:3}}><button onClick={()=>{deleteMatch(m.id);}} disabled={deleting} style={{background:DG,border:"none",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 6px",borderRadius:6,cursor:"pointer",opacity:deleting?0.6:1}}>{deleting?"..":"Yes"}</button><button onClick={()=>setCd(null)} style={{background:BD,border:"none",color:TX,fontSize:9,fontWeight:700,padding:"3px 6px",borderRadius:6,cursor:"pointer"}}>No</button></div>:<button onClick={()=>setCd(m.id)} style={{background:"none",border:"none",color:DG,fontSize:13,cursor:"pointer",padding:"2px 4px"}}>🗑️</button>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:isIncomplete?TX:(w==="A"?A:DG)}}>{getName(m.team_a[0])}</div>
              <div style={{fontSize:13,fontWeight:700,color:isIncomplete?TX:(w==="A"?A:DG)}}>{getName(m.team_a[1])}</div>
              {!isIncomplete&&(w==="A"?<div style={{fontSize:10,color:A,fontWeight:700,marginTop:3}}>WIN</div>:<div style={{fontSize:10,color:DG,fontWeight:700,marginTop:3}}>LOSS</div>)}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{display:"flex",gap:6,fontFamily:"'JetBrains Mono'",fontWeight:700,fontSize:16}}>
                {m.sets.map((s,i)=><span key={i} style={{color:isIncomplete?MT:(s[0]>s[1]?A:DG)}}>{s[0]}-{s[1]}</span>)}
              </div>
              <span style={{fontSize:10,color:MT,fontFamily:"'JetBrains Mono'"}}>{tA}-{tB}</span>
              {isIncomplete&&<span style={{fontSize:9,color:MT,fontStyle:"italic",marginTop:2}}>not counted in rankings</span>}
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:isIncomplete?TX:(w==="B"?A:DG)}}>{getName(m.team_b[0])}</div>
              <div style={{fontSize:13,fontWeight:700,color:isIncomplete?TX:(w==="B"?A:DG)}}>{getName(m.team_b[1])}</div>
              {!isIncomplete&&(w==="B"?<div style={{fontSize:10,color:A,fontWeight:700,marginTop:3}}>WIN</div>:<div style={{fontSize:10,color:DG,fontWeight:700,marginTop:3}}>LOSS</div>)}
            </div>
          </div>
          {/* Reaction bar */}
          <div style={{display:"flex",gap:2,marginTop:8,paddingTop:8,borderTop:`1px solid ${BD}30`,justifyContent:"center"}}>
            {REACTIONS.map(r=>{const count=(reactions[m.id]||[]).filter(x=>x.reaction===r.key).length;const mine=myReactions[m.id]===r.key;return(
              <button key={r.key} onClick={()=>toggleReaction(m.id,r.key)} style={{display:"flex",alignItems:"center",gap:2,padding:"3px 8px",borderRadius:20,border:`1px solid ${mine?A+"60":"transparent"}`,background:mine?`${A}15`:"transparent",cursor:"pointer",fontSize:14,transition:"all 0.15s"}}>
                <span>{r.emoji}</span>
                {count>0&&<span style={{fontSize:10,fontWeight:700,color:mine?A:MT,fontFamily:"'JetBrains Mono'"}}>{count}</span>}
              </button>
            );})}
          </div>
        </div>);
      })}
    </div>
  );
}
