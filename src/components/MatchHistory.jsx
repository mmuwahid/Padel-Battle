import React, { useState, useEffect } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, BL, PU } from '../theme';
import { win, formatDate } from '../utils/helpers';
import { useLeague } from '../LeagueContext';

const REACTIONS = [
  { key: "fire", emoji: "\uD83D\uDD25" },
  { key: "trophy", emoji: "\uD83C\uDFC6" },
  { key: "clap", emoji: "\uD83D\uDC4F" },
  { key: "laugh", emoji: "\uD83D\uDE02" },
  { key: "shock", emoji: "\uD83D\uDE31" },
];

export function MatchHistory({onEdit,shareMatch,sel,onMatchDeleted}){
  const { supabase, user, players, matches, isAdmin, getName, showToast } = useLeague();
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
  const f=fp?matches.filter(m=>m.team_a.includes(fp)||m.team_b.includes(fp)):matches;
  const s=[...f].sort((a,b)=>new Date(b.date)-new Date(a.date));

  async function deleteMatch(matchId){
    if(!isAdmin)return;
    try{
      const {error}=await supabase.from("matches").delete().eq("id",matchId);
      if(error)throw error;
      setCd(null);
      if(onMatchDeleted)onMatchDeleted();
      if(showToast)showToast("Match deleted");
    }catch(err){
      if(showToast)showToast("Failed to delete match","error");
    }
  }

  return (
    <div>
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
      {s.map(m=>{const w=win(m.sets);const tA=m.sets.reduce((s,x)=>s+x[0],0);const tB=m.sets.reduce((s,x)=>s+x[1],0);
        return (<div key={m.id} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:11,color:MT,fontWeight:400}}>{formatDate(m.date)}</span>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {m.motm&&<span style={{fontSize:10,background:`${GD}20`,color:GD,padding:"2px 6px",borderRadius:6,fontWeight:600}}>⭐{getName(m.motm)}</span>}
              <button onClick={()=>shareMatch(m)} style={{background:"none",border:"none",fontSize:13,cursor:"pointer",padding:"2px 4px"}}>📤</button>
              <button onClick={()=>onEdit(m)} style={{background:"none",border:"none",color:BL,fontSize:13,cursor:"pointer",padding:"2px 4px"}}>✏️</button>
              {isAdmin&&(cd===m.id?<div style={{display:"flex",gap:3}}><button onClick={()=>{deleteMatch(m.id);}} disabled={deleting} style={{background:DG,border:"none",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 6px",borderRadius:6,cursor:"pointer",opacity:deleting?0.6:1}}>{deleting?"..":"Yes"}</button><button onClick={()=>setCd(null)} style={{background:BD,border:"none",color:TX,fontSize:9,fontWeight:700,padding:"3px 6px",borderRadius:6,cursor:"pointer"}}>No</button></div>:<button onClick={()=>setCd(m.id)} style={{background:"none",border:"none",color:DG,fontSize:13,cursor:"pointer",padding:"2px 4px"}}>🗑️</button>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:w==="A"?A:DG}}>{getName(m.team_a[0])}</div>
              <div style={{fontSize:13,fontWeight:700,color:w==="A"?A:DG}}>{getName(m.team_a[1])}</div>
              {w==="A"?<div style={{fontSize:10,color:A,fontWeight:700,marginTop:3}}>WIN</div>:<div style={{fontSize:10,color:DG,fontWeight:700,marginTop:3}}>LOSS</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{display:"flex",gap:6,fontFamily:"'JetBrains Mono'",fontWeight:700,fontSize:16}}>
                {m.sets.map((s,i)=><span key={i} style={{color:s[0]>s[1]?A:DG}}>{s[0]}-{s[1]}</span>)}
              </div>
              <span style={{fontSize:10,color:MT,fontFamily:"'JetBrains Mono'"}}>{tA}-{tB}</span>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:w==="B"?A:DG}}>{getName(m.team_b[0])}</div>
              <div style={{fontSize:13,fontWeight:700,color:w==="B"?A:DG}}>{getName(m.team_b[1])}</div>
              {w==="B"?<div style={{fontSize:10,color:A,fontWeight:700,marginTop:3}}>WIN</div>:<div style={{fontSize:10,color:DG,fontWeight:700,marginTop:3}}>LOSS</div>}
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
