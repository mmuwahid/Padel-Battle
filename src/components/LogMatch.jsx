import React, { useState, useEffect } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, PU } from '../theme';
import { TeamShuffler } from './TeamShuffler';

export function LogMatch({players,matches,supabase,leagueId,user,pm,em,setEm,goBack,sel,lbl,getName,seasonId,seasons,setCurSeason,onSave,showToast,sendPushNotification}){
  const isE=!!em;
  const [tA,setTA]=useState(["",""]);
  const [tB,setTB]=useState(["",""]);
  const [sets,setSets]=useState([[0,0],[0,0],[0,0]]);
  const [ns,setNs]=useState(2);
  const [motm,setMotm]=useState("");
  const [date,setDate]=useState(new Date().toISOString().split("T")[0]);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  // FT-08 RNG state
  const [showShuffler,setShowShuffler]=useState(false);
  const [queue,setQueue]=useState([]); // remaining {team_a, team_b} to log after the current one

  useEffect(()=>{
    if(em){
      setTA([...em.team_a]);
      setTB([...em.team_b]);
      const s=[...em.sets.map(x=>[...x])];
      while(s.length<3)s.push([0,0]);
      setSets(s);
      setNs(em.sets.length);
      setMotm(em.motm||"");
      setDate(em.date);
    }
  },[em]);

  const all=[...tA,...tB].filter(Boolean);
  const avail=c=>players.filter(p=>!all.includes(p.id)||p.id===c);

  async function submit(){
    if(tA.some(x=>!x)||tB.some(x=>!x))return;
    if(date>new Date().toISOString().split("T")[0]){if(showToast)showToast("Cannot log a match for a future date","error");return;}
    const as=sets.slice(0,ns).filter(([a,b])=>a>0||b>0);
    if(!as.length)return;

    setSaving(true);
    try{
      if(isE){
        // UPDATE match
        const {error}=await supabase
          .from("matches")
          .update({date,team_a:[...tA],team_b:[...tB],sets:as,motm:motm||null})
          .eq("id",em.id);
        if(error)throw error;
      }else{
        // INSERT new match
        const {error}=await supabase
          .from("matches")
          .insert({league_id:leagueId,season_id:seasonId,date,team_a:[...tA],team_b:[...tB],sets:as,motm:motm||null,logged_by:user.id});
        if(error)throw error;
      }
      // FT-08: if queue has remaining matches, pop the next one into the form instead of fully resetting
      const hasNext=!isE && queue.length>0;
      if(hasNext){
        const next=queue[0];
        setTA([...next.team_a]);
        setTB([...next.team_b]);
        setSets([[0,0],[0,0],[0,0]]);
        setMotm("");
        setNs(2);
        setQueue(queue.slice(1));
      } else {
        reset();
      }
      setSaved(true);
      setTimeout(()=>setSaved(false),2000);
      if(onSave)onSave();
      if(showToast)showToast(em?"Match updated":(hasNext?`Match saved! Next up — ${queue.length} remaining`:"Match saved!"));
      // Send push notification for new matches (not edits)
      // Bug #2 fix S038: ONE notification per match with winner + score; ranking trigger dropped.
      if(!isE&&sendPushNotification){
        const tANames=[tA[0],tA[1]].map(id=>getName?getName(id):id).join(" & ");
        const tBNames=[tB[0],tB[1]].map(id=>getName?getName(id):id).join(" & ");
        // Determine winner by sets won (padel: best-of-3 sets)
        let setsA=0, setsB=0;
        as.forEach(([a,b])=>{ if(a>b) setsA++; else if(b>a) setsB++; });
        const winnerNames = setsA>setsB ? tANames : tBNames;
        const loserNames  = setsA>setsB ? tBNames : tANames;
        const setSummary  = as.map(([a,b])=>setsA>setsB?`${a}-${b}`:`${b}-${a}`).join(", ");
        const body = `${winnerNames} beat ${loserNames} (${setSummary}) — leaderboard updated`;
        sendPushNotification("match","New Match Result", body);
      }
    }catch(err){
      if(showToast)showToast("Failed to save match","error");
    }finally{
      setSaving(false);
    }
  }

  function reset(){
    setTA(["",""]);
    setTB(["",""]);
    setSets([[0,0],[0,0],[0,0]]);
    setMotm("");
    setDate(new Date().toISOString().split("T")[0]);
    setNs(2);
    setEm(null);
  }

  function cancel(){
    reset();
    goBack();
  }

  const curSeasonName=seasons.find(s=>s.id===seasonId)?.name||"Unknown";

  return (
    <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
      {isE&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700,color:GD}}>✏️ Editing</span></div><button onClick={cancel} style={{background:"none",border:`1px solid ${DG}40`,color:DG,padding:"4px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}>Cancel</button></div>}
      {saved&&<div style={{background:`${A}20`,border:`1px solid ${A}40`,borderRadius:12,padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>✅</span><span style={{color:A,fontWeight:600,fontSize:14}}>{isE?"Updated!":"Saved!"}</span></div>}

      {/* Season tag */}
      {!isE&&<div style={{marginBottom:12}}>
        <div style={lbl}>Season</div>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",gap:4,overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
            {seasons.filter(s=>s.active||s.id===seasonId).map(s=>(
              <button key={s.id} onClick={()=>setCurSeason(s.id)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${seasonId===s.id?PU:BD}`,background:seasonId===s.id?`${PU}15`:"transparent",color:seasonId===s.id?PU:MT,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",flexShrink:0}}>
                {s.active&&<span style={{width:5,height:5,borderRadius:"50%",background:A}}/>}{s.name}
              </button>
            ))}
          </div>
          {seasons.filter(s=>s.active||s.id===seasonId).length>3&&<div style={{position:"absolute",right:0,top:0,bottom:0,width:24,background:`linear-gradient(to right,transparent,${BG})`,pointerEvents:"none"}}/>}
        </div>
      </div>}

      {/* FT-08: Shuffle Teams entry point — hidden during edit and while shuffler is active */}
      {!isE && !showShuffler && (
        <div style={{marginBottom:12}}>
          <button onClick={()=>setShowShuffler(true)} style={{width:"100%",padding:"10px",borderRadius:10,border:`1px dashed ${A}`,background:`${A}10`,color:A,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>🎲 Shuffle Teams</button>
          {queue.length>0 && <div style={{marginTop:6,fontSize:11,color:MT,textAlign:"center"}}>{queue.length} queued match{queue.length===1?"":"es"} waiting — save this one to continue.</div>}
        </div>
      )}

      {!isE && showShuffler && (
        <TeamShuffler
          players={players}
          getName={getName}
          onAccept={({matches})=>{
            if(matches.length===0){setShowShuffler(false);return;}
            const first=matches[0];
            setTA([...first.team_a]);
            setTB([...first.team_b]);
            setSets([[0,0],[0,0],[0,0]]);
            setMotm("");
            setNs(2);
            setQueue(matches.slice(1));
            setShowShuffler(false);
            if(showToast)showToast(matches.length>1?`Locked in! ${matches.length-1} more match${matches.length-1===1?"":"es"} queued.`:"Teams locked in — enter the score.");
          }}
          onCancel={()=>setShowShuffler(false)}
        />
      )}

      <div style={{marginBottom:16}}>
        <div style={lbl}>Date</div>
        <input type="date" value={date} max={new Date().toISOString().split("T")[0]} onChange={e=>setDate(e.target.value)} style={{...sel,colorScheme:"dark"}}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,marginBottom:16}}>
        <div>
          <div style={{...lbl,color:A}}>Team A</div>
          {tA.map((pid,i)=>(
            <select key={i} value={pid} onChange={e=>{const t=[...tA];t[i]=e.target.value;setTA(t);}} style={{...sel,marginBottom:6,borderColor:`${A}40`}}>
              <option value="">Player {i+1}</option>
              {avail(pid).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
            </select>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",fontWeight:900,fontSize:18,color:MT,paddingTop:20}}>VS</div>
        <div>
          <div style={{...lbl,color:DG}}>Team B</div>
          {tB.map((pid,i)=>(
            <select key={i} value={pid} onChange={e=>{const t=[...tB];t[i]=e.target.value;setTB(t);}} style={{...sel,marginBottom:6,borderColor:`${DG}40`}}>
              <option value="">Player {i+1}</option>
              {avail(pid).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
            </select>
          ))}
        </div>
      </div>

      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={lbl}>Sets</div>
          <div style={{display:"flex",gap:4}}>
            {[2,3].map(n=>(
              <button key={n} onClick={()=>setNs(n)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${ns===n?A:BD}`,background:ns===n?`${A}15`:"transparent",color:ns===n?A:MT,fontSize:11,fontWeight:600,cursor:"pointer"}}>{n}</button>
            ))}
          </div>
        </div>
        {sets.slice(0,ns).map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:11,color:MT,width:36,fontWeight:600}}>Set {i+1}</span>
            <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" max="7" value={s[0]} onFocus={e=>e.target.select()} onChange={e=>{const n=sets.map(x=>[...x]);n[i]=[+e.target.value,n[i][1]];setSets(n);}} style={{...sel,width:60,textAlign:"center",fontFamily:"'JetBrains Mono'",fontWeight:700,fontSize:18,borderColor:`${A}40`}}/>
            <span style={{color:MT,fontWeight:700}}>-</span>
            <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" max="7" value={s[1]} onFocus={e=>e.target.select()} onChange={e=>{const n=sets.map(x=>[...x]);n[i]=[n[i][0],+e.target.value];setSets(n);}} style={{...sel,width:60,textAlign:"center",fontFamily:"'JetBrains Mono'",fontWeight:700,fontSize:18,borderColor:`${DG}40`}}/>
          </div>
        ))}
      </div>

      <div style={{marginBottom:20}}>
        <div style={lbl}>⭐ Man of the Match</div>
        <select value={motm} onChange={e=>setMotm(e.target.value)} style={sel}>
          <option value="">Select MVP</option>
          {[...tA,...tB].filter(Boolean).map(pid=>(
            <option key={pid} value={pid}>{pm[pid]?.nickname||pm[pid]?.name}</option>
          ))}
        </select>
      </div>

      <button onClick={submit} disabled={saving} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:saving?BD:isE?`linear-gradient(135deg,${GD},${GD}cc)`:`linear-gradient(135deg,${A},${A}cc)`,color:BG,fontSize:15,fontWeight:800,cursor:saving?"not-allowed":"pointer",textTransform:"uppercase",opacity:saving?0.6:1}}>{saving?"Saving...":isE?"Update Match":"Save Match"}</button>
    </div>
  );
}
