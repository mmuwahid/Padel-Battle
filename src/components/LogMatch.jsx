import React, { useState, useEffect } from "react";
import { A, BG, CD2, BD, TX, MT, DG, GD, PU, BL } from '../theme';
import { TeamShuffler } from './TeamShuffler';
import { createInitialLiveState, scorePoint, undoPoint, getLiveDisplay, liveToSets } from '../utils/scoringEngine';
import { formatTeam } from '../utils/helpers';
import { ScoreStepper } from './ScoreStepper';

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
  const [queue,setQueue]=useState([]);
  // LIVE scoring mode
  const [mode,setMode]=useState('manual');
  const [liveState,setLiveState]=useState(createInitialLiveState);
  const [liveNs,setLiveNs]=useState(3);

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

  // Derived live display values
  const {ptA,ptB,gA,gB,isDeuce,inTiebreak}=getLiveDisplay(liveState);
  const {sA,sB,completedSets,matchOver,history:liveHistory}=liveState;

  // Team name helpers — use formatTeam for canonical " x " separator
  const teamName=(ids)=>{
    const names=ids.filter(Boolean).map(id=>getName?getName(id):id);
    if(names.length===0)return 'Team';
    if(names.length===1)return names[0];
    return formatTeam(names[0],names[1]);
  };

  function handleModeChange(m){
    if(m===mode)return;
    if(m==='manual'){
      // Sync completed live sets into the manual form
      const ls=liveToSets(liveState);
      if(ls.length>0){
        const padded=[...ls];
        while(padded.length<3)padded.push([0,0]);
        setSets(padded);
        setNs(ls.length);
      }
    } else {
      // Reset live state on entry to LIVE mode
      setLiveState(createInitialLiveState());
    }
    setMode(m);
  }

  const all=[...tA,...tB].filter(Boolean);
  const avail=c=>players.filter(p=>!all.includes(p.id)||p.id===c);

  async function submit(){
    if(tA.some(x=>!x)||tB.some(x=>!x))return;
    if(date>new Date().toISOString().split("T")[0]){if(showToast)showToast("Cannot log a match for a future date","error");return;}

    const as=mode==='live'
      ? liveToSets(liveState).filter(([a,b])=>a>0||b>0)
      : sets.slice(0,ns).filter(([a,b])=>a>0||b>0);
    if(!as.length){if(showToast&&mode==='live')showToast("Score at least one set to save","error");return;}

    setSaving(true);
    let insertedStatus = "approved"; // FT-09: tracks status of new INSERT (set by trigger)
    try{
      if(isE){
        const {error}=await supabase
          .from("matches")
          .update({date,team_a:[...tA],team_b:[...tB],sets:as,motm:motm||null})
          .eq("id",em.id);
        if(error)throw error;
      }else{
        // FT-09 / S044: trigger sets status server-side. Read it back to drive the toast + push gating.
        const {data:inserted,error}=await supabase
          .from("matches")
          .insert({league_id:leagueId,season_id:seasonId,date,team_a:[...tA],team_b:[...tB],sets:as,motm:motm||null,logged_by:user.id})
          .select("status")
          .single();
        if(error)throw error;
        insertedStatus = inserted?.status || "approved";
      }
      const hasNext=!isE&&queue.length>0;
      if(hasNext){
        const next=queue[0];
        setTA([...next.team_a]);
        setTB([...next.team_b]);
        setSets([[0,0],[0,0],[0,0]]);
        setMotm("");
        setNs(2);
        setQueue(queue.slice(1));
        setLiveState(createInitialLiveState());
      } else {
        reset();
      }
      setSaved(true);
      setTimeout(()=>setSaved(false),2000);
      if(onSave)onSave();
      // FT-09: pending submissions get a different toast and skip the broadcast push (server handles admin notification).
      const isPending = !isE && insertedStatus === "pending";
      if(showToast){
        if(isE) showToast("Match updated");
        else if(isPending) showToast(hasNext?`Submitted for approval — ${queue.length} remaining`:"Submitted — waiting for admin approval");
        else showToast(hasNext?`Match saved! Next up — ${queue.length} remaining`:"Match saved!");
      }
      if(!isE && !isPending && sendPushNotification){
        const tANames=formatTeam(getName?getName(tA[0]):tA[0],getName?getName(tA[1]):tA[1]);
        const tBNames=formatTeam(getName?getName(tB[0]):tB[0],getName?getName(tB[1]):tB[1]);
        let setsA=0,setsB=0;
        as.forEach(([a,b])=>{if(a>b)setsA++;else if(b>a)setsB++;});
        const winnerNames=setsA>setsB?tANames:tBNames;
        const loserNames=setsA>setsB?tBNames:tANames;
        const setSummary=as.map(([a,b])=>setsA>setsB?`${a}-${b}`:`${b}-${a}`).join(", ");
        sendPushNotification("match","New Match Result",`${winnerNames} beat ${loserNames} (${setSummary}) — leaderboard updated`);
      }
    }catch(_err){
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
    setLiveState(createInitialLiveState());
    setLiveNs(3);
    setMode('manual');
  }

  function cancel(){
    reset();
    goBack();
  }

  const canSave=mode==='live'?liveToSets(liveState).some(([a,b])=>a>0||b>0):true;

  return (
    <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
      {isE&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700,color:GD}}>✏️ Editing</span></div><button onClick={cancel} style={{background:"none",border:`1px solid ${DG}40`,color:DG,padding:"4px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}>Cancel</button></div>}
      {saved&&<div style={{background:`${A}20`,border:`1px solid ${A}40`,borderRadius:12,padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>✅</span><span style={{color:A,fontWeight:600,fontSize:14}}>{isE?"Updated!":"Saved!"}</span></div>}

      {/* Mode toggle — hidden in edit mode */}
      {!isE&&(
        <div style={{display:"flex",gap:4,background:CD2,borderRadius:12,padding:4,marginBottom:16,border:`1px solid ${BD}`}}>
          {[{id:'manual',label:'✏️ Manual'},{id:'live',label:'⚡ LIVE'}].map(({id,label})=>(
            <button key={id} onClick={()=>handleModeChange(id)} style={{flex:1,padding:"9px 0",border:"none",borderRadius:9,background:mode===id?`${id==='live'?A:A}20`:"transparent",color:mode===id?A:MT,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Outfit',sans-serif",transition:"all 0.15s"}}>
              {label}
            </button>
          ))}
        </div>
      )}

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
          {seasons.filter(s=>s.active||s.id===seasonId).length>3&&<div style={{position:"absolute",right:0,top:0,bottom:0,width:24,background:`linear-gradient(to right,transparent,#0a0a0f)`,pointerEvents:"none"}}/>}
        </div>
      </div>}

      {/* FT-08: Shuffle Teams */}
      {!isE&&!showShuffler&&(
        <div style={{marginBottom:12}}>
          <button onClick={()=>setShowShuffler(true)} style={{width:"100%",padding:"10px",borderRadius:10,border:`1px dashed ${A}`,background:`${A}10`,color:A,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>🎲 Shuffle Teams</button>
          {queue.length>0&&<div style={{marginTop:6,fontSize:11,color:MT,textAlign:"center"}}>{queue.length} queued match{queue.length===1?"":"es"} waiting — save this one to continue.</div>}
        </div>
      )}

      {!isE&&showShuffler&&(
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
            setLiveState(createInitialLiveState());
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
          <div style={{...lbl,color:BL}}>Team A</div>
          {tA.map((pid,i)=>(
            <select key={i} value={pid} onChange={e=>{const t=[...tA];t[i]=e.target.value;setTA(t);}} style={{...sel,marginBottom:6,borderColor:`${BL}40`}}>
              <option value="">Player {i+1}</option>
              {avail(pid).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
            </select>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",fontWeight:900,fontSize:18,color:MT,paddingTop:20}}>VS</div>
        <div>
          <div style={{...lbl,color:GD}}>Team B</div>
          {tB.map((pid,i)=>(
            <select key={i} value={pid} onChange={e=>{const t=[...tB];t[i]=e.target.value;setTB(t);}} style={{...sel,marginBottom:6,borderColor:`${GD}40`}}>
              <option value="">Player {i+1}</option>
              {avail(pid).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* ── LIVE scoring panel ── */}
      {mode==='live'&&!showShuffler&&(
        <div style={{marginBottom:16}}>

          {/* Sets count toggle */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:11,color:MT,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Sets</div>
            <div style={{display:"flex",gap:4}}>
              {[2,3].map(n=>(
                <button key={n} onClick={()=>setLiveNs(n)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${liveNs===n?A:BD}`,background:liveNs===n?`${A}15`:"transparent",color:liveNs===n?A:MT,fontSize:11,fontWeight:600,cursor:"pointer"}}>{n}</button>
              ))}
            </div>
          </div>

          {/* Scoreboard */}
          <div style={{background:CD2,borderRadius:14,padding:"16px 20px",marginBottom:12,border:`1px solid ${BD}`}}>
            {/* Team label row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",gap:8,marginBottom:10}}>
              <div style={{color:A,fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:1,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{teamName(tA)}</div>
              <div/>
              <div style={{color:DG,fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:1,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{teamName(tB)}</div>
            </div>

            {/* Sets row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",gap:8,marginBottom:8,alignItems:"center"}}>
              <div style={{fontSize:42,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:TX,textAlign:"center",lineHeight:1}}>{sA}</div>
              <div style={{fontSize:10,color:MT,textAlign:"center",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>SETS</div>
              <div style={{fontSize:42,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:TX,textAlign:"center",lineHeight:1}}>{sB}</div>
            </div>

            {/* Games row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",gap:8,marginBottom:8,alignItems:"center"}}>
              <div style={{fontSize:22,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:MT,textAlign:"center"}}>{inTiebreak?tbA:gA}</div>
              <div style={{fontSize:10,color:MT,textAlign:"center",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{inTiebreak?"TB":"GAMES"}</div>
              <div style={{fontSize:22,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:MT,textAlign:"center"}}>{inTiebreak?liveState.tbB:gB}</div>
            </div>

            {/* Points row */}
            {!matchOver&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",gap:8,alignItems:"center"}}>
                <div style={{fontSize:28,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",textAlign:"center",color:isDeuce?GD:ptA==='Ad'?A:TX}}>{isDeuce?'—':ptA}</div>
                <div style={{fontSize:10,color:isDeuce?GD:MT,textAlign:"center",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{isDeuce?'DEUCE':'PTS'}</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",textAlign:"center",color:isDeuce?GD:ptB==='Ad'?DG:TX}}>{isDeuce?'—':ptB}</div>
              </div>
            )}

            {/* Completed sets chips */}
            {completedSets.length>0&&(
              <div style={{marginTop:12,display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
                {completedSets.map(({a,b},i)=>(
                  <span key={i} style={{fontSize:12,color:MT,background:`${BD}60`,padding:"3px 10px",borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{a}–{b}</span>
                ))}
              </div>
            )}
          </div>

          {/* Match-over banner */}
          {matchOver&&(()=>{
            const tied=sA===sB;
            const winnerIsA=sA>sB;
            const winSets=tied?sA:(winnerIsA?sA:sB);
            const loseSets=tied?sB:(winnerIsA?sB:sA);
            const winnerLabel=tied?`${teamName(tA)} vs ${teamName(tB)}`:`${winnerIsA?teamName(tA):teamName(tB)} — Winners`;
            return (
              <div style={{background:`${A}18`,border:`1px solid ${A}50`,borderRadius:12,padding:"14px 16px",marginBottom:12,textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:6}}>{tied?'🤝':'🎉'}</div>
                <div style={{color:A,fontWeight:800,fontSize:15,marginBottom:8,lineHeight:1.3}}>{winnerLabel}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:20,color:TX,marginBottom:8}}>
                  {tied?`${sA} – ${sB}`:`${winSets} – ${loseSets}`}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"center"}}>
                  {completedSets.map(({a,b},i)=>{
                    const winnerScore=tied?a:(winnerIsA?a:b);
                    const loserScore=tied?b:(winnerIsA?b:a);
                    return (
                      <div key={i} style={{fontSize:12,color:MT,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>
                        Set {i+1}: <span style={{color:TX}}>{winnerScore} – {loserScore}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Scoring tap buttons */}
          {!matchOver&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <button
                onClick={()=>setLiveState(s=>scorePoint(s,'A',liveNs))}
                style={{padding:"28px 12px",borderRadius:14,border:`2px solid ${A}50`,background:`${A}18`,color:A,fontSize:16,fontWeight:900,cursor:"pointer",fontFamily:"'Outfit',sans-serif",lineHeight:1.4,touchAction:"manipulation"}}
              >
                +1<br/>
                <span style={{fontSize:11,fontWeight:500,color:`${A}99`,display:"block",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{teamName(tA)}</span>
              </button>
              <button
                onClick={()=>setLiveState(s=>scorePoint(s,'B',liveNs))}
                style={{padding:"28px 12px",borderRadius:14,border:`2px solid ${DG}50`,background:`${DG}18`,color:DG,fontSize:16,fontWeight:900,cursor:"pointer",fontFamily:"'Outfit',sans-serif",lineHeight:1.4,touchAction:"manipulation"}}
              >
                +1<br/>
                <span style={{fontSize:11,fontWeight:500,color:`${DG}99`,display:"block",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{teamName(tB)}</span>
              </button>
            </div>
          )}

          {/* Undo + Reset row */}
          <div style={{display:"flex",gap:8}}>
            {liveHistory.length>0&&(
              <button
                onClick={()=>setLiveState(undoPoint)}
                style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${BD}`,background:"transparent",color:MT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}
              >↩ Undo</button>
            )}
            {(liveHistory.length>0||matchOver)&&(
              <button
                onClick={()=>setLiveState(createInitialLiveState())}
                style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${BD}`,background:"transparent",color:MT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}
              >↺ Reset</button>
            )}
          </div>
        </div>
      )}

      {/* ── Manual sets entry (hidden in LIVE mode) ── */}
      {mode==='manual'&&(
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
              <ScoreStepper value={s[0]} max={7} aColor={BL} ariaLabel={`Set ${i+1} Team A`} onChange={(n)=>{const x=sets.map(y=>[...y]);x[i]=[n,x[i][1]];setSets(x);}}/>
              <span style={{color:MT,fontWeight:700}}>-</span>
              <ScoreStepper value={s[1]} max={7} aColor={GD} ariaLabel={`Set ${i+1} Team B`} onChange={(n)=>{const x=sets.map(y=>[...y]);x[i]=[x[i][0],n];setSets(x);}}/>
            </div>
          ))}
        </div>
      )}

      <div style={{marginBottom:20}}>
        <div style={lbl}>⭐ Man of the Match</div>
        <select value={motm} onChange={e=>setMotm(e.target.value)} style={sel}>
          <option value="">Select MVP</option>
          {[...tA,...tB].filter(Boolean).map(pid=>(
            <option key={pid} value={pid}>{pm[pid]?.nickname||pm[pid]?.name}</option>
          ))}
        </select>
      </div>

      <button onClick={submit} disabled={saving||!canSave} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:saving||!canSave?BD:isE?`linear-gradient(135deg,${GD},${GD}cc)`:`linear-gradient(135deg,${A},${A}cc)`,color:saving||!canSave?MT:BG,fontSize:15,fontWeight:800,cursor:saving||!canSave?"not-allowed":"pointer",textTransform:"uppercase",opacity:saving?0.6:1}}>
        {saving?"Saving...":isE?"Update Match":"Save Match"}
      </button>
    </div>
  );
}
