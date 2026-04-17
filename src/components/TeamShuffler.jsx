import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG } from '../theme';
import { shuffleIntoMatches } from '../utils/shuffle';

// FT-08 — Reusable RNG pool picker + results screen.
// Props:
//   players    : array of {id, name, nickname}
//   onAccept   : ({matches, sitouts}) => void  — parent consumes the result
//   onCancel   : () => void
//   getName    : (id) => string
//   singleMatchMode: boolean — if true, shows note that only Match 1 will be used
export function TeamShuffler({players, onAccept, onCancel, getName, singleMatchMode=false}){
  const [pool,setPool]=useState([]);
  const [result,setResult]=useState(null);

  function toggle(id){
    setPool(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  }

  function doShuffle(){
    if(pool.length<4)return;
    setResult(shuffleIntoMatches(pool));
  }

  function accept(){
    if(!result)return;
    onAccept(result);
  }

  function back(){
    setResult(null);
  }

  // === Results screen ===
  if(result){
    const {matches,sitouts}=result;
    return (
      <div style={{background:CD,borderRadius:12,border:`1px solid ${A}40`,padding:14,marginBottom:12}}>
        <div style={{fontSize:14,fontWeight:800,color:A,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5}}>🎲 Shuffle Results</div>
        <div style={{fontSize:11,color:MT,marginBottom:12}}>{matches.length} match{matches.length===1?"":"es"}{sitouts.length>0?`, ${sitouts.length} sitting out`:""}</div>

        {singleMatchMode && matches.length>1 && (
          <div style={{background:`${DG}15`,border:`1px solid ${DG}40`,borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:11,color:DG}}>
            Only Match 1 will be scheduled. Extras are shown for reference.
          </div>
        )}

        {matches.map((m,idx)=>(
          <div key={idx} style={{background:CD2,border:`1px solid ${BD}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Match {idx+1}{singleMatchMode&&idx>0?" (unused)":""}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:700,color:A,marginBottom:2}}>Team A</div>
                <div style={{fontSize:13,fontWeight:600,color:TX}}>{getName(m.team_a[0])} + {getName(m.team_a[1])}</div>
              </div>
              <div style={{fontSize:12,fontWeight:800,color:MT}}>VS</div>
              <div style={{flex:1,textAlign:"right"}}>
                <div style={{fontSize:10,fontWeight:700,color:DG,marginBottom:2}}>Team B</div>
                <div style={{fontSize:13,fontWeight:600,color:TX}}>{getName(m.team_b[0])} + {getName(m.team_b[1])}</div>
              </div>
            </div>
          </div>
        ))}

        {sitouts.length>0 && (
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:MT,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Sitting Out</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {sitouts.map(id=>(
                <span key={id} style={{padding:"4px 10px",borderRadius:999,background:CD2,border:`1px solid ${BD}`,color:MT,fontSize:11,fontWeight:600}}>{getName(id)}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={accept} style={{flex:2,padding:12,borderRadius:8,border:"none",background:A,color:BG,fontSize:13,fontWeight:800,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.5}}>Accept &amp; Use</button>
          <button onClick={back} style={{flex:1,padding:12,borderRadius:8,border:`1px solid ${BD}`,background:CD2,color:TX,fontSize:13,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.5}}>Back</button>
          <button onClick={onCancel} style={{flex:1,padding:12,borderRadius:8,border:`1px solid ${BD}`,background:"transparent",color:MT,fontSize:13,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.5}}>Cancel</button>
        </div>
      </div>
    );
  }

  // === Pool picker screen ===
  const canShuffle = pool.length>=4;
  return (
    <div style={{background:CD,borderRadius:12,border:`1px solid ${A}40`,padding:14,marginBottom:12}}>
      <div style={{fontSize:14,fontWeight:800,color:A,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5}}>🎲 Shuffle Teams</div>
      <div style={{fontSize:11,color:MT,marginBottom:12}}>Pick 4 or more players. The app will randomly split them into teams.</div>

      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
        {players.map(p=>{
          const on=pool.includes(p.id);
          return (
            <button key={p.id} onClick={()=>toggle(p.id)} style={{padding:"6px 12px",borderRadius:999,border:`1px solid ${on?A:BD}`,background:on?`${A}20`:CD2,color:on?A:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
              {on?"✓ ":""}{p.nickname||p.name}
            </button>
          );
        })}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,fontSize:11,color:pool.length>=4?A:MT,fontWeight:600}}>
        <span>{pool.length} selected{pool.length<4?" — need 4+":""}</span>
        {pool.length>=4 && <span style={{color:MT}}>{Math.floor(pool.length/4)} match{Math.floor(pool.length/4)===1?"":"es"}{pool.length%4>0?`, ${pool.length%4} sitout${pool.length%4===1?"":"s"}`:""}</span>}
      </div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={doShuffle} disabled={!canShuffle} style={{flex:2,padding:12,borderRadius:8,border:"none",background:canShuffle?A:BD,color:canShuffle?BG:MT,fontSize:13,fontWeight:800,cursor:canShuffle?"pointer":"not-allowed",textTransform:"uppercase",letterSpacing:0.5}}>Shuffle</button>
        <button onClick={onCancel} style={{flex:1,padding:12,borderRadius:8,border:`1px solid ${BD}`,background:CD2,color:TX,fontSize:13,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.5}}>Cancel</button>
      </div>
    </div>
  );
}
