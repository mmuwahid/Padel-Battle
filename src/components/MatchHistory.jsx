import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, BL, PU } from '../theme';
import { win, formatDate } from '../utils/helpers';

export function MatchHistory({matches,pm,players,onEdit,supabase,isAdmin,getName,shareMatch,sel,onMatchDeleted,showToast}){
  const [fp,setFp]=useState("");
  const [cd,setCd]=useState(null);
  const [deleting,setDeleting]=useState(false);
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
        </div>);
      })}
    </div>
  );
}
