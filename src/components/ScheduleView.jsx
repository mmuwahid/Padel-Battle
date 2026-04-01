import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, BL, PU } from '../theme';
import { formatDate, win } from '../utils/helpers';

export function ScheduleView({challenges,players,matches,supabase,leagueId,user,getName,isAdmin,onUpdate,showToast,sendPushNotification,sel,elo,seasonId}){
  const [showForm,setShowForm]=useState(false);
  const [step,setStep]=useState(1); // 1=teams, 2=date/venue
  const [date,setDate]=useState(new Date().toISOString().split("T")[0]);
  const [time,setTime]=useState("18:00");
  const [duration,setDuration]=useState(90);
  const [location,setLocation]=useState("");
  const [tA,setTA]=useState(["",""]);
  const [tB,setTB]=useState(["",""]);
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [viewTab,setViewTab]=useState("upcoming");
  const [loggingMatch,setLoggingMatch]=useState(null);
  const [cancelConfirmId,setCancelConfirmId]=useState(null);
  const [actionLoading,setActionLoading]=useState(null);
  const [logSets,setLogSets]=useState([[0,0],[0,0],[0,0]]);
  const [logNs,setLogNs]=useState(2);
  const [logMotm,setLogMotm]=useState("");
  const [logSaving,setLogSaving]=useState(false);

  const inp={background:CD2,color:TX,border:`1px solid ${BD}`,borderRadius:8,padding:"10px 12px",fontSize:13,width:"100%",outline:"none",fontFamily:"'Outfit',sans-serif"};
  const getEloBadge=(pid)=>{const gp=(matches||[]).filter(m=>(m.team_a||[]).includes(pid)||(m.team_b||[]).includes(pid)).length;if(gp<5)return null;const e=elo?.[pid]||1500;if(e>=1600)return{label:"Pro",color:DG};if(e>=1400)return{label:"Advanced",color:GD};if(e>=1200)return{label:"Intermediate",color:PU};return{label:"Beginner",color:BL};};

  async function createChallenge(){
    const teamA=tA.filter(Boolean);const teamB=tB.filter(Boolean);
    const today=new Date().toISOString().split("T")[0];
    if(!date||date<today){showToast("Select a future date","error");return;}
    if(teamA.length===0){showToast("Select at least 1 player per team","error");return;}
    setSaving(true);
    try{
      // Creator is auto-accepted. All 4 players selected → pending (needs confirmation from others)
      const creatorPid=claimedP?.id;
      const allPlayerIds=[...teamA,...teamB];
      const initialResponses={};
      if(creatorPid&&allPlayerIds.includes(creatorPid)) initialResponses[creatorPid]="accepted";
      const hasFourPlayers=teamA.length>=2&&teamB.length>=2;
      const {error}=await supabase.from("challenges").insert({league_id:leagueId,created_by:user.id,date,time:time||null,duration:duration||null,location:location.trim()||null,team_a:teamA,team_b:teamB,notes:notes.trim()||null,status:hasFourPlayers?"pending":"open",responses:initialResponses});
      if(error)throw error;
      showToast("Match scheduled — waiting for players to confirm!");
      if(sendPushNotification){
        const allNames=allPlayerIds.map(id=>getName(id)).join(", ");
        sendPushNotification("challenges","Match Invitation",`You've been invited to a match on ${formatDate(date)} — ${allNames}. Tap to accept or decline.`);
      }
      setShowForm(false);setStep(1);setTA(["",""]);setTB(["",""]);setNotes("");setLocation("");
      if(onUpdate)onUpdate();
    }catch(err){showToast(err.message||"Failed to schedule","error");}
    setSaving(false);
  }

  async function respondToChallenge(ch,response){
    if(!claimedP){showToast("Claim a player first","error");return;}
    const pid=claimedP.id;
    const newResponses={...(ch.responses||{}), [pid]:response};
    const allPlayerIds=[...ch.team_a,...ch.team_b];
    const allAccepted=allPlayerIds.every(p=>newResponses[p]==="accepted");
    const newStatus=allAccepted?"confirmed":ch.status;
    try{
      const {error}=await supabase.from("challenges").update({responses:newResponses,status:newStatus}).eq("id",ch.id);
      if(error)throw error;
      if(response==="accepted") showToast("You accepted the match!");
      else showToast("You declined the match");
      if(newStatus==="confirmed"&&sendPushNotification){
        const allNames=allPlayerIds.map(id=>getName(id)).join(", ");
        sendPushNotification("challenges","Match Confirmed!",`All players confirmed for ${formatDate(ch.date)} — ${allNames}`);
      }
      if(response==="declined"&&sendPushNotification){
        sendPushNotification("challenges","Player Declined",`${getName(pid)} declined the match on ${formatDate(ch.date)}`);
      }
      if(onUpdate)onUpdate();
    }catch(err){showToast("Failed to respond","error");}
  }

  async function joinChallenge(ch,team){
    if(!claimedP){showToast("Claim a player first","error");return;}
    const pid=claimedP.id;
    const updated=team==="a"?{team_a:[...ch.team_a,pid]}:{team_b:[...ch.team_b,pid]};
    const newA=updated.team_a||ch.team_a;const newB=updated.team_b||ch.team_b;
    const newResponses={...(ch.responses||{}), [pid]:"accepted"};
    const allPlayerIds=[...newA,...newB];
    const hasFour=newA.length>=2&&newB.length>=2;
    const allAccepted=hasFour&&allPlayerIds.every(p=>newResponses[p]==="accepted");
    const status=allAccepted?"confirmed":hasFour?"pending":"open";
    const {error}=await supabase.from("challenges").update({...updated,status,responses:newResponses}).eq("id",ch.id);
    if(error){showToast("Failed to join","error");}else{
      showToast("Joined!");
      if(status==="confirmed"&&sendPushNotification){
        const allNames=allPlayerIds.map(id=>getName(id)).join(", ");
        sendPushNotification("challenges","Match Confirmed!",`All players confirmed for ${formatDate(ch.date)} — ${allNames}`);
      } else if(hasFour&&sendPushNotification){
        const allNames=allPlayerIds.map(id=>getName(id)).join(", ");
        sendPushNotification("challenges","Match Invitation",`You've been invited to a match on ${formatDate(ch.date)} — ${allNames}. Tap to accept or decline.`);
      }
      if(onUpdate)onUpdate();
    }
  }

  async function leaveChallenge(ch){
    const claimedP=players.find(p=>p.user_id===user.id);
    if(!claimedP)return;
    const pid=claimedP.id;
    const newA=ch.team_a.filter(id=>id!==pid);
    const newB=ch.team_b.filter(id=>id!==pid);
    const {error}=await supabase.from("challenges").update({team_a:newA,team_b:newB,status:"open"}).eq("id",ch.id);
    if(error){showToast("Failed to leave","error");}else{showToast("Left match");if(onUpdate)onUpdate();}
  }

  async function cancelChallenge(id){
    setActionLoading(id+"-cancel");
    const {error}=await supabase.from("challenges").update({status:"cancelled"}).eq("id",id);
    if(error){showToast("Failed to cancel","error");}else{showToast("Match cancelled");if(onUpdate)onUpdate();}
    setActionLoading(null);
  }

  function openLogMatch(ch){setLoggingMatch(ch.id);setLogSets([[0,0],[0,0],[0,0]]);setLogNs(2);setLogMotm("");}
  async function saveLoggedMatch(){
    const ch=challenges.find(c2=>c2.id===loggingMatch);if(!ch)return;
    const sd=logSets.slice(0,logNs).filter(([a,b])=>a>0||b>0);
    if(!sd.length){showToast("Enter at least one set score","error");return;}
    setLogSaving(true);
    try{
      const {data:md,error:me}=await supabase.from("matches").insert({league_id:leagueId,season_id:seasonId||null,date:ch.date,team_a:[...ch.team_a],team_b:[...ch.team_b],sets:sd,motm:logMotm||null,logged_by:user.id}).select().single();
      if(me)throw me;
      const {error:ue}=await supabase.from("challenges").update({status:"played",match_id:md.id}).eq("id",ch.id);
      if(ue)throw ue;
      showToast("Match logged!");setLoggingMatch(null);if(onUpdate)onUpdate();
    }catch(err){showToast(err.message||"Failed to log match","error");}
    setLogSaving(false);
  }

  const upcoming=challenges.filter(c=>c.status==="open"||c.status==="pending"||c.status==="confirmed");
  const past=challenges.filter(c=>c.status==="played");
  const claimedP=players.find(p=>p.user_id===user.id);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setViewTab("upcoming")} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${viewTab==="upcoming"?A:BD}`,background:viewTab==="upcoming"?`${A}15`:"transparent",color:viewTab==="upcoming"?A:MT,fontSize:11,fontWeight:600,cursor:"pointer"}}>{upcoming.length} Upcoming</button>
          <button onClick={()=>setViewTab("past")} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${viewTab==="past"?MT:BD}`,background:viewTab==="past"?`${MT}15`:"transparent",color:MT,fontSize:11,fontWeight:600,cursor:"pointer"}}>{past.length} Past</button>
        </div>
        <button onClick={()=>setShowForm(!showForm)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${A}`,background:`${A}15`,color:A,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>{showForm?"Cancel":"+ Schedule"}</button>
      </div>

      {/* New Challenge Form — Multi-step */}
      {showForm&&step===1&&(
        <div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:12}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:A,color:BG,fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>1</div>
            <div style={{width:32,height:2,background:`${BD}`}}/>
            <div style={{width:24,height:24,borderRadius:"50%",background:BD,color:MT,fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>2</div>
            <span style={{fontSize:10,color:MT,marginLeft:4}}>Players → Details</span>
          </div>
          <div style={{background:`${A}12`,border:`1px solid ${A}`,borderRadius:10,padding:12,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16}}>🎾</span>
            <span style={{fontSize:12,fontWeight:600,color:TX}}>Select Players</span>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Team 1</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[0,1].map(i=>{const allSel=[tA[0],tA[1],tB[0],tB[1]].filter(Boolean);const others=allSel.filter(v=>v!==tA[i]);const badge=tA[i]?getEloBadge(tA[i]):null;return(
              <div key={i} style={{padding:12,background:CD2,border:`1px solid ${BD}`,borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:700,color:MT,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Player {i+1}</div>
                <select value={tA[i]} onChange={e=>{const n=[...tA];n[i]=e.target.value;setTA(n);}} style={{...sel,marginBottom:badge?6:0}}><option value="">Select Player...</option>{players.filter(p=>!others.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}</select>
                {badge&&<div style={{display:"inline-block",padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:`${badge.color}20`,color:badge.color,marginTop:4}}>{badge.label}</div>}
              </div>
            );})}
          </div>
          <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Team 2</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[0,1].map(i=>{const allSel=[tA[0],tA[1],tB[0],tB[1]].filter(Boolean);const others=allSel.filter(v=>v!==tB[i]);const badge=tB[i]?getEloBadge(tB[i]):null;return(
              <div key={i} style={{padding:12,background:CD2,border:`1px solid ${BD}`,borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:700,color:MT,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Player {i+3}</div>
                <select value={tB[i]} onChange={e=>{const n=[...tB];n[i]=e.target.value;setTB(n);}} style={{...sel,marginBottom:badge?6:0}}><option value="">Select Player...</option>{players.filter(p=>!others.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}</select>
                {badge&&<div style={{display:"inline-block",padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:`${badge.color}20`,color:badge.color,marginTop:4}}>{badge.label}</div>}
              </div>
            );})}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setStep(2)} disabled={!tA[0]} style={{flex:1,padding:12,borderRadius:8,border:"none",background:tA[0]?A:BD,color:tA[0]?BG:MT,fontSize:13,fontWeight:700,cursor:tA[0]?"pointer":"not-allowed",textTransform:"uppercase",letterSpacing:0.5}}>Continue</button>
            <button onClick={()=>{setShowForm(false);setStep(1);}} style={{flex:1,padding:12,borderRadius:8,border:`1px solid ${BD}`,background:CD2,color:TX,fontSize:13,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.5}}>Cancel</button>
          </div>
        </div>
      )}
      {showForm&&step===2&&(
        <div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:12}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:`${A}30`,color:A,fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>✓</div>
            <div style={{width:32,height:2,background:A}}/>
            <div style={{width:24,height:24,borderRadius:"50%",background:A,color:BG,fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>2</div>
            <span style={{fontSize:10,color:MT,marginLeft:4}}>Players → Details</span>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Match Date</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input type="date" value={date} min={new Date().toISOString().split("T")[0]} onChange={e=>setDate(e.target.value)} style={{...inp,flex:1}}/>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{...inp,flex:1}}/>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Duration</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[60,90,120].map(d=>(
              <button key={d} onClick={()=>setDuration(d)} style={{flex:1,padding:"10px 12px",borderRadius:20,border:`1px solid ${duration===d?A:BD}`,background:duration===d?A:"transparent",color:duration===d?"#000":TX,fontSize:13,fontWeight:600,cursor:"pointer"}}>{d} min</button>
            ))}
          </div>
          <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Court</div>
          <input placeholder="e.g., Harmony 3 - Padel Court 1" value={location} onChange={e=>setLocation(e.target.value)} style={{...inp,marginBottom:10}}/>
          <input placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} style={{...inp,marginBottom:14}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={createChallenge} disabled={saving} style={{flex:1,padding:12,borderRadius:8,border:"none",background:A,color:BG,fontSize:13,fontWeight:700,cursor:"pointer",opacity:saving?0.6:1,textTransform:"uppercase",letterSpacing:0.5}}>{saving?"Scheduling...":"Schedule Match"}</button>
            <button onClick={()=>setStep(1)} style={{flex:1,padding:12,borderRadius:8,border:`1px solid ${BD}`,background:CD2,color:TX,fontSize:13,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.5}}>Back</button>
          </div>
        </div>
      )}

      {/* UPCOMING Tab */}
      {viewTab==="upcoming"&&(
        <div>
          {upcoming.length===0&&!showForm&&(
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:40,marginBottom:12}}>📅</div>
              <div style={{fontSize:15,fontWeight:600,color:TX,marginBottom:6}}>No matches scheduled</div>
              <div style={{fontSize:12,color:MT}}>Tap "+ Schedule" to set up your next game.</div>
            </div>
          )}

          {upcoming.map(ch=>{
            const isCreator=ch.created_by===user.id;
            const myPid=claimedP?.id;
            const imInA=ch.team_a.includes(myPid);
            const imInB=ch.team_b.includes(myPid);
            const imIn=imInA||imInB;
            const canJoinA=!imIn&&ch.team_a.length<2&&ch.status==="open";
            const canJoinB=!imIn&&ch.team_b.length<2&&ch.status==="open";
            const isConfirmed=ch.status==="confirmed";
            const isPending=ch.status==="pending";
            const myResponse=myPid?(ch.responses||{})[myPid]:null;
            const needsMyResponse=isPending&&imIn&&!myResponse;
            const statusBg=isConfirmed?`${A}20`:isPending?`${GD}20`:`${MT}20`;
            const statusColor=isConfirmed?A:isPending?GD:MT;
            const statusText=isConfirmed?"Confirmed":isPending?"Pending":"Open";
            return (
              <div key={ch.id} style={{background:CD,borderRadius:12,border:`1px solid ${isConfirmed?`${A}40`:isPending?`${GD}40`:BD}`,padding:14,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <span style={{fontSize:12,fontWeight:700,color:TX}}>{formatDate(ch.date)}</span>
                    {ch.time&&<span style={{fontSize:11,color:MT,marginLeft:6}}>{ch.time}</span>}
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:6,background:statusBg,color:statusColor}}>{statusText}</span>
                </div>
                {ch.location&&<div style={{fontSize:11,color:MT,marginBottom:8}}>📍 {ch.location}</div>}
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={{flex:1,background:CD2,borderRadius:8,padding:8,textAlign:"center"}}>
                    <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:4}}>Team A</div>
                    {ch.team_a.map(pid=>{const r=(ch.responses||{})[pid];return <div key={pid} style={{fontSize:12,color:TX,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>{getName(pid)}{isPending&&r==="accepted"&&<span style={{fontSize:9,color:A}}>{"\u2713"}</span>}{isPending&&r==="declined"&&<span style={{fontSize:9,color:DG}}>{"\u2717"}</span>}{isPending&&!r&&<span style={{fontSize:9,color:GD}}>{"\u23F3"}</span>}</div>;})}
                    {ch.team_a.length<2&&<div style={{fontSize:11,color:MT,fontStyle:"italic"}}>Needs player</div>}
                    {canJoinA&&<button onClick={()=>joinChallenge(ch,"a")} style={{marginTop:4,padding:"4px 10px",borderRadius:6,border:`1px solid ${A}`,background:"transparent",color:A,fontSize:10,fontWeight:700,cursor:"pointer"}}>Join Team A</button>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",color:MT,fontSize:12,fontWeight:800}}>vs</div>
                  <div style={{flex:1,background:CD2,borderRadius:8,padding:8,textAlign:"center"}}>
                    <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:4}}>Team B</div>
                    {ch.team_b.map(pid=>{const r=(ch.responses||{})[pid];return <div key={pid} style={{fontSize:12,color:TX,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>{getName(pid)}{isPending&&r==="accepted"&&<span style={{fontSize:9,color:A}}>{"\u2713"}</span>}{isPending&&r==="declined"&&<span style={{fontSize:9,color:DG}}>{"\u2717"}</span>}{isPending&&!r&&<span style={{fontSize:9,color:GD}}>{"\u23F3"}</span>}</div>;})}
                    {ch.team_b.length<2&&<div style={{fontSize:11,color:MT,fontStyle:"italic"}}>Needs player</div>}
                    {canJoinB&&<button onClick={()=>joinChallenge(ch,"b")} style={{marginTop:4,padding:"4px 10px",borderRadius:6,border:`1px solid ${A}`,background:"transparent",color:A,fontSize:10,fontWeight:700,cursor:"pointer"}}>Join Team B</button>}
                  </div>
                </div>
                {/* Accept/Decline buttons for pending challenges */}
                {needsMyResponse&&(
                  <div style={{display:"flex",gap:8,marginBottom:8}}>
                    <button onClick={()=>respondToChallenge(ch,"accepted")} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:A,color:BG,fontSize:12,fontWeight:700,cursor:"pointer"}}>Accept</button>
                    <button onClick={()=>respondToChallenge(ch,"declined")} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${DG}`,background:"transparent",color:DG,fontSize:12,fontWeight:700,cursor:"pointer"}}>Decline</button>
                  </div>
                )}
                {isPending&&imIn&&myResponse==="accepted"&&(
                  <div style={{fontSize:11,color:A,fontWeight:600,textAlign:"center",marginBottom:8}}>{"\u2713"} You accepted — waiting for others</div>
                )}
                {isPending&&imIn&&myResponse==="declined"&&(
                  <div style={{fontSize:11,color:DG,fontWeight:600,textAlign:"center",marginBottom:8}}>{"\u2717"} You declined this match</div>
                )}
                {ch.notes&&<div style={{fontSize:11,color:MT,fontStyle:"italic",marginBottom:8}}>{ch.notes}</div>}
                {loggingMatch===ch.id&&(<div style={{background:CD2,borderRadius:10,border:`1px solid ${A}40`,padding:12,marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:700,color:A,marginBottom:10}}>🎾 Log Match Result</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:11,color:MT,fontWeight:600}}>Sets</div>
                    <div style={{display:"flex",gap:4}}>{[2,3].map(n=>(<button key={n} onClick={()=>setLogNs(n)} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${logNs===n?A:BD}`,background:logNs===n?`${A}15`:"transparent",color:logNs===n?A:MT,fontSize:10,fontWeight:600,cursor:"pointer"}}>{n}</button>))}</div>
                  </div>
                  {logSets.slice(0,logNs).map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontSize:10,color:MT,width:32,fontWeight:600}}>Set {i+1}</span>
                    <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" max="7" value={s[0]} onFocus={e=>e.target.select()} onChange={e=>{const n=logSets.map(x=>[...x]);n[i]=[+e.target.value,n[i][1]];setLogSets(n);}} style={{width:48,padding:"6px",borderRadius:6,border:`1px solid ${A}40`,background:CD,color:TX,textAlign:"center",fontSize:14,fontFamily:"JetBrains Mono",fontWeight:700}}/>
                    <span style={{color:MT,fontWeight:700}}>-</span>
                    <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" max="7" value={s[1]} onFocus={e=>e.target.select()} onChange={e=>{const n=logSets.map(x=>[...x]);n[i]=[n[i][0],+e.target.value];setLogSets(n);}} style={{width:48,padding:"6px",borderRadius:6,border:`1px solid ${DG}40`,background:CD,color:TX,textAlign:"center",fontSize:14,fontFamily:"JetBrains Mono",fontWeight:700}}/>
                  </div>))}
                  <div style={{marginTop:8,marginBottom:10}}>
                    <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:4}}>⭐ Man of the Match</div>
                    <select value={logMotm} onChange={e=>setLogMotm(e.target.value)} style={{...sel,fontSize:12}}><option value="">Select MVP</option>{[...(ch.team_a||[]),...(ch.team_b||[])].map(pid=>(<option key={pid} value={pid}>{getName(pid)}</option>))}</select>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={saveLoggedMatch} disabled={logSaving} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:A,color:BG,fontSize:12,fontWeight:700,cursor:"pointer",opacity:logSaving?0.6:1}}>{logSaving?"Saving...":"Save Match"}</button>
                    <button onClick={()=>setLoggingMatch(null)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${BD}`,background:CD,color:TX,fontSize:12,fontWeight:700,cursor:"pointer"}}>Cancel</button>
                  </div>
                </div>)}
                {/* Action buttons */}
                <div style={{display:"flex",gap:6}}>
                  {imIn&&!isCreator&&ch.status==="open"&&(
                    <button onClick={()=>leaveChallenge(ch)} style={{flex:1,padding:"6px",borderRadius:6,border:`1px solid ${DG}40`,background:"transparent",color:DG,fontSize:10,fontWeight:600,cursor:"pointer"}}>Leave</button>
                  )}
                  {isConfirmed&&!loggingMatch&&(
                    <button onClick={()=>openLogMatch(ch)} style={{flex:1,padding:"8px",borderRadius:6,border:"none",background:`${A}15`,color:A,fontSize:11,fontWeight:700,cursor:"pointer"}}>🎾 Log Match</button>
                  )}
                  {(isCreator||isAdmin)&&(
                    cancelConfirmId===ch.id?<div style={{display:"flex",gap:4,flex:1}}><button onClick={()=>{cancelChallenge(ch.id);setCancelConfirmId(null);}} style={{flex:1,padding:"6px",borderRadius:6,background:DG,border:"none",color:"#fff",fontSize:10,fontWeight:600,cursor:"pointer"}}>Yes</button><button onClick={()=>setCancelConfirmId(null)} style={{flex:1,padding:"6px",borderRadius:6,border:`1px solid ${BD}`,background:"transparent",color:MT,fontSize:10,cursor:"pointer"}}>No</button></div>:<button onClick={()=>setCancelConfirmId(ch.id)} style={{flex:1,padding:"6px",borderRadius:6,border:`1px solid ${DG}40`,background:"transparent",color:DG,fontSize:10,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAST Tab */}
      {viewTab==="past"&&(
        <div>
          {past.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <div style={{fontSize:15,fontWeight:600,color:TX,marginBottom:6}}>No past matches</div>
              <div style={{fontSize:12,color:MT}}>Completed and cancelled matches will appear here.</div>
            </div>
          )}
          {past.map(ch=>{
            const lm=ch.match_id?(matches||[]).find(m=>m.id===ch.match_id):null;
            const w=lm?win(lm.sets):null;
            const tA=lm?lm.sets.reduce((t,x)=>t+x[0],0):0;
            const tB=lm?lm.sets.reduce((t,x)=>t+x[1],0):0;
            return (
            <div key={ch.id} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:TX}}>{formatDate(ch.date)}</span>
                  {ch.time&&<span style={{fontSize:11,color:MT,marginLeft:6}}>{ch.time}</span>}
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:6,background:`${A}20`,color:A}}>📅 Played</span>
              </div>
              {ch.location&&<div style={{fontSize:11,color:MT,marginBottom:6}}>📍 {ch.location}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center"}}>
                <div style={{textAlign:"center"}}>
                  {ch.team_a.map(pid=><div key={pid} style={{fontSize:13,fontWeight:700,color:w==="A"?A:w==="B"?DG:TX}}>{getName(pid)}</div>)}
                  {w==="A"&&<div style={{fontSize:10,color:A,fontWeight:700,marginTop:3}}>WIN</div>}
                  {w==="B"&&<div style={{fontSize:10,color:DG,fontWeight:700,marginTop:3}}>LOSS</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  {lm?<><div style={{display:"flex",gap:6,fontFamily:"JetBrains Mono",fontWeight:700,fontSize:16}}>
                    {lm.sets.map((s,i)=><span key={i} style={{color:s[0]>s[1]?A:DG}}>{s[0]}-{s[1]}</span>)}
                  </div><span style={{fontSize:10,color:MT,fontFamily:"JetBrains Mono"}}>{tA}-{tB}</span></>:<span style={{color:MT,fontSize:11}}>No scores</span>}
                </div>
                <div style={{textAlign:"center"}}>
                  {ch.team_b.map(pid=><div key={pid} style={{fontSize:13,fontWeight:700,color:w==="B"?A:w==="A"?DG:TX}}>{getName(pid)}</div>)}
                  {w==="B"&&<div style={{fontSize:10,color:A,fontWeight:700,marginTop:3}}>WIN</div>}
                  {w==="A"&&<div style={{fontSize:10,color:DG,fontWeight:700,marginTop:3}}>LOSS</div>}
                </div>
              </div>
              {lm&&lm.motm&&<div style={{textAlign:"center",fontSize:10,color:GD,marginTop:6}}>⭐ MVP: {getName(lm.motm)}</div>}
            </div>);
          })}
        </div>
      )}
    </div>
  );
}
