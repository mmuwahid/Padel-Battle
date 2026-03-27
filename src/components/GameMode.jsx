import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, PU } from '../theme';
import { generateAmericanoSchedule, generateMexicanoRound } from '../utils/tournaments';

export function GameMode({players,getName,supabase,leagueId,tournament,setTournament,sel}){
  const [selPlayers,setSelP]=useState([]);
  const [courts,setCourts]=useState(2);
  const [ptsPerRound,setPPR]=useState(24);
  const [mode,setMode]=useState("americano");

  async function startTournament(){
    if(selPlayers.length<4)return;
    try{
      let scheduleData;
      if(mode==="elimination"){
        // FT-06: Generate single elimination bracket (pairs of 2 players = teams)
        const shuffled=[...selPlayers].sort(()=>Math.random()-0.5);
        // Create teams of 2
        const teams=[];
        for(let i=0;i<shuffled.length-1;i+=2)teams.push([shuffled[i],shuffled[i+1]]);
        // If odd number of players, last player gets a bye with a random partner
        if(shuffled.length%2===1)teams.push([shuffled[shuffled.length-1],null]);
        // Generate bracket rounds
        const rounds=[];let currentTeams=[...teams];
        let roundNum=1;
        while(currentTeams.length>1){
          const matches=[];
          for(let i=0;i<currentTeams.length-1;i+=2){
            matches.push({team_a:currentTeams[i],team_b:currentTeams[i+1],winner:null});
          }
          // Bye if odd number of teams
          if(currentTeams.length%2===1)matches.push({team_a:currentTeams[currentTeams.length-1],team_b:null,winner:"a"});
          rounds.push({round:roundNum,matches});
          currentTeams=matches.map(()=>null); // placeholders for next round
          roundNum++;
        }
        scheduleData={rounds,bracket:true};
      }else{
        scheduleData={rounds:mode==="americano"?generateAmericanoSchedule(selPlayers,courts):[generateMexicanoRound(selPlayers,{},courts)]};
      }
      if(mode==="mexicano")scheduleData.rounds[0].round=1;
      const {data,error}=await supabase.from("tournaments").insert({league_id:leagueId,date:new Date().toISOString().split("T")[0],mode,players:selPlayers,courts,pts_per_round:ptsPerRound,schedule:scheduleData,scores:{},status:"active"}).select().single();
      if(error)throw error;
      setTournament(data);
    }catch(err){
      console.error("Start tournament error:",err);
    }
  }

  async function recordScore(roundIdx,matchIdx,scoreA,scoreB){
    const newScores={...tournament.scores,[`${roundIdx}-${matchIdx}`]:{a:scoreA,b:scoreB}};
    try{
      const {error}=await supabase.from("tournaments").update({scores:newScores}).eq("id",tournament.id);
      if(error)throw error;
      setTournament({...tournament,scores:newScores});
    }catch(err){
      console.error("Record score error:",err);
    }
  }

  function getPoints(){
    const pts={};
    if(!tournament)return pts;
    tournament.players.forEach(p=>{pts[p]=0;});
    const rounds=tournament.schedule?.rounds||[];
    rounds.forEach((round,ri)=>{
      const matches=round.matches||[];
      matches.forEach((match,mi)=>{
        const key=`${ri}-${mi}`;
        const sc=tournament.scores[key];
        if(sc){
          (match.teamA||[]).forEach(p=>{pts[p]=(pts[p]||0)+sc.a;});
          (match.teamB||[]).forEach(p=>{pts[p]=(pts[p]||0)+sc.b;});
        }
      });
    });
    return pts;
  }

  function getLeaderboard(){
    const pts=getPoints();
    return Object.entries(pts).sort((a,b)=>b[1]-a[1]).map(([pid,points],i)=>({pid,points,rank:i+1}));
  }

  async function nextMexicanoRound(){
    const pts=getPoints();
    const sorted=tournament.players.sort((a,b)=>(pts[b]||0)-(pts[a]||0));
    const round=generateMexicanoRound(sorted,pts,tournament.courts);
    round.round=(tournament.schedule?.rounds?.length||0)+1;
    const newSchedule={rounds:[...(tournament.schedule?.rounds||[]),round]};
    try{
      const {error}=await supabase.from("tournaments").update({schedule:newSchedule}).eq("id",tournament.id);
      if(error)throw error;
      setTournament({...tournament,schedule:newSchedule});
    }catch(err){
      console.error("Next round error:",err);
    }
  }

  async function endTournament(){
    try{
      const {error}=await supabase.from("tournaments").update({status:"complete"}).eq("id",tournament.id);
      if(error)throw error;
      setTournament({...tournament,status:"complete"});
    }catch(err){
      console.error("End tournament error:",err);
    }
  }

  function resetTournament(){
    setTournament(null);
  }

  if(!tournament||tournament.status==="complete"){
    const prevLb=tournament?.status==="complete"?getLeaderboard():null;
    const prevMode=tournament?.mode;
    return (
      <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
        <h2 style={{fontSize:18,fontWeight:800,marginBottom:4}}>⚡ Game Mode</h2>
        <p style={{fontSize:12,color:MT,marginBottom:16,lineHeight:1.5}}>Tournament formats for your padel sessions</p>

        {prevLb&&<div style={{marginBottom:20}}>
          <h3 style={{fontSize:14,fontWeight:700,color:GD,marginBottom:10}}>🏆 Last Tournament — {prevMode==="americano"?"Americano":prevMode==="mexicano"?"Mexicano":"Elimination"}</h3>
          {prevLb.map((p,i)=>(
            <div key={p.pid} style={{display:"flex",alignItems:"center",padding:"10px 12px",marginBottom:4,background:CD,borderRadius:10,border:`1px solid ${i===0?`${GD}40`:BD}`}}>
              <span style={{fontSize:16,fontWeight:800,color:i<3?[GD,SV,BZ][i]:TX,width:28,fontFamily:"'JetBrains Mono'"}}>{i+1}</span>
              <span style={{flex:1,fontSize:14,fontWeight:600}}>{getName(p.pid)}</span>
              <span style={{fontSize:18,fontWeight:800,color:i===0?GD:A,fontFamily:"'JetBrains Mono'"}}>{p.points}pts</span>
            </div>
          ))}
          <button onClick={resetTournament} style={{marginTop:8,padding:"8px 16px",borderRadius:10,border:`1px solid ${BD}`,background:"transparent",color:MT,fontSize:12,fontWeight:600,cursor:"pointer"}}>Clear Results</button>
        </div>}

        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Format</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["americano","Americano","Pre-set rotation, play with everyone"],["mexicano","Mexicano","Dynamic pairing by standings"],["elimination","Elimination","Knockout bracket, single elimination"]].map(([k,l,d])=>(
              <button key={k} onClick={()=>setMode(k)} style={{flex:"1 1 45%",padding:"12px 10px",borderRadius:12,border:`1px solid ${mode===k?PU:BD}`,background:mode===k?`${PU}15`:"transparent",cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:13,fontWeight:700,color:mode===k?PU:TX}}>{k==="elimination"?"🏆":"⚡"} {l}</div>
                <div style={{fontSize:10,color:MT,marginTop:4,lineHeight:1.3}}>{d}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>Players ({selPlayers.length} selected)</div>
            <button onClick={()=>setSelP(selPlayers.length===players.length?[]:players.map(p=>p.id))} style={{background:"none",border:"none",color:A,fontSize:11,fontWeight:600,cursor:"pointer"}}>{selPlayers.length===players.length?"Deselect All":"Select All"}</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {players.map(p=>{const on=selPlayers.includes(p.id);return (
              <button key={p.id} onClick={()=>setSelP(on?selPlayers.filter(x=>x!==p.id):[...selPlayers,p.id])} style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${on?A:BD}`,background:on?`${A}15`:"transparent",color:on?A:MT,fontSize:13,fontWeight:600,cursor:"pointer"}}>{p.nickname||p.name}</button>
            );})}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div><div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Courts</div><select value={courts} onChange={e=>setCourts(+e.target.value)} style={sel}>{[1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
          <div><div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Points / Round</div><select value={ptsPerRound} onChange={e=>setPPR(+e.target.value)} style={sel}>{[16,20,24,32].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
        </div>
        <button onClick={startTournament} disabled={selPlayers.length<4} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:selPlayers.length>=4?`linear-gradient(135deg,${PU},${PU}cc)`:BD,color:selPlayers.length>=4?TX:MT,fontSize:15,fontWeight:800,cursor:selPlayers.length>=4?"pointer":"not-allowed",textTransform:"uppercase"}}>Start {mode==="americano"?"Americano":mode==="mexicano"?"Mexicano":"Elimination"} ({selPlayers.length} players)</button>
      </div>
    );
  }

  const leaderboard=getLeaderboard();
  const isMex=tournament.mode==="mexicano";
  const isElim=tournament.mode==="elimination";
  const allRounds=tournament.schedule?.rounds||[];
  const totalMatches=allRounds.reduce((s,r)=>s+(r.matches||[]).length,0);
  const scored=Object.keys(tournament.scores).length;
  const lastRoundDone=(()=>{const ri=allRounds.length-1;if(ri<0)return false;const ms=allRounds[ri]?.matches||[];return ms.length>0&&ms.every((_,mi)=>tournament.scores[`${ri}-${mi}`]);})();

  // FT-06: Elimination bracket view
  if(isElim){
    const roundNames=allRounds.length<=1?["Final"]:allRounds.length===2?["Semi-Final","Final"]:allRounds.length===3?["Quarter-Final","Semi-Final","Final"]:allRounds.map((_,i)=>`Round ${i+1}`);
    return (
      <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div><h2 style={{fontSize:18,fontWeight:800}}>🏆 Elimination</h2><p style={{fontSize:11,color:MT}}>{tournament.players.length} players · {allRounds.length} rounds</p></div>
          <button onClick={()=>{if(confirm("End tournament?"))endTournament();}} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${DG}40`,color:DG,background:"transparent",fontSize:11,fontWeight:600,cursor:"pointer"}}>End</button>
        </div>

        {allRounds.map((round,ri)=>(
          <div key={ri} style={{marginBottom:16}}>
            <h3 style={{fontSize:13,fontWeight:700,color:PU,marginBottom:8}}>{roundNames[ri]||`Round ${ri+1}`}</h3>
            {(round.matches||[]).map((match,mi)=>{
              const sc=tournament.scores[`${ri}-${mi}`];
              const teamANames=(match.team_a||[]).filter(Boolean).map(pid=>getName(pid)).join(" x ");
              const teamBNames=match.team_b?(match.team_b||[]).filter(Boolean).map(pid=>getName(pid)).join(" x "):"BYE";
              const isBye=!match.team_b;
              return (
                <div key={mi} style={{background:CD,borderRadius:12,border:`1px solid ${sc?`${A}40`:BD}`,padding:12,marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:sc&&sc.a>sc.b?700:500,color:sc&&sc.a>sc.b?A:TX}}>{teamANames||"TBD"}</div>
                      <div style={{fontSize:13,fontWeight:sc&&sc.b>sc.a?700:500,color:sc&&sc.b>sc.a?A:TX,marginTop:4}}>{teamBNames||"TBD"}</div>
                    </div>
                    {isBye ? (
                      <span style={{fontSize:10,color:MT,fontWeight:600}}>BYE</span>
                    ) : sc ? (
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontWeight:800,color:sc.a>sc.b?A:TX,fontFamily:"'JetBrains Mono'"}}>{sc.a}</div>
                        <div style={{fontSize:16,fontWeight:800,color:sc.b>sc.a?A:TX,fontFamily:"'JetBrains Mono'",marginTop:2}}>{sc.b}</div>
                      </div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:2}}>
                        <input type="number" min="0" placeholder="0" style={{width:40,padding:"4px",borderRadius:6,border:`1px solid ${BD}`,background:CD2,color:TX,textAlign:"center",fontSize:13,fontFamily:"'JetBrains Mono'"}} id={`elim-a-${ri}-${mi}`}/>
                        <input type="number" min="0" placeholder="0" style={{width:40,padding:"4px",borderRadius:6,border:`1px solid ${BD}`,background:CD2,color:TX,textAlign:"center",fontSize:13,fontFamily:"'JetBrains Mono'"}} id={`elim-b-${ri}-${mi}`}/>
                        <button onClick={()=>{const a=parseInt(document.getElementById(`elim-a-${ri}-${mi}`).value)||0;const b=parseInt(document.getElementById(`elim-b-${ri}-${mi}`).value)||0;if(a===b){return;}recordScore(ri,mi,a,b);}} style={{padding:"4px 8px",borderRadius:6,border:"none",background:A,color:BG,fontSize:9,fontWeight:700,cursor:"pointer"}}>Save</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <button onClick={resetTournament} style={{marginTop:8,width:"100%",padding:"8px 16px",borderRadius:10,border:`1px solid ${BD}`,background:"transparent",color:MT,fontSize:12,fontWeight:600,cursor:"pointer"}}>Clear Tournament</button>
      </div>
    );
  }

  return (
    <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div><h2 style={{fontSize:18,fontWeight:800}}>⚡ {isMex?"Mexicano":"Americano"}</h2><p style={{fontSize:11,color:MT}}>{scored}/{totalMatches} scored · Round {allRounds.length} · {tournament.players.length} players</p></div>
        <button onClick={()=>{if(confirm("End tournament?"))endTournament();}} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${DG}40`,color:DG,background:"transparent",fontSize:11,fontWeight:600,cursor:"pointer"}}>End</button>
      </div>

      <div style={{background:CD,borderRadius:14,border:`1px solid ${PU}30`,padding:14,marginBottom:12}}>
        <h3 style={{fontSize:13,fontWeight:700,color:PU,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Live Standings</h3>
        {leaderboard.map((p,i)=>(
          <div key={p.pid} style={{display:"flex",alignItems:"center",padding:"6px 0",borderBottom:i<leaderboard.length-1?`1px solid ${BD}20`:"none"}}>
            <span style={{width:24,fontSize:14,fontWeight:800,color:i<3?[GD,SV,BZ][i]:TX,fontFamily:"'JetBrains Mono'"}}>{i+1}</span>
            <span style={{flex:1,fontSize:14,fontWeight:600}}>{getName(p.pid)}</span>
            <span style={{fontSize:18,fontWeight:800,color:i===0?GD:A,fontFamily:"'JetBrains Mono'"}}>{p.points}</span>
          </div>
        ))}
      </div>

      {isMex&&lastRoundDone&&<button onClick={nextMexicanoRound} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${PU},${PU}cc)`,color:TX,fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:12,textTransform:"uppercase"}}>Generate Next Round</button>}

      {allRounds.map((round,ri)=>{
        const matches=round.matches||[];
        return (
          <div key={ri} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <h3 style={{fontSize:14,fontWeight:700}}>Round {ri+1}</h3>
              {round.sitting&&<span style={{fontSize:11,color:MT,background:BD,padding:"2px 8px",borderRadius:6}}>Sitting: {getName(round.sitting)}</span>}
            </div>
            {matches.map((match,mi)=>{
              const key=`${ri}-${mi}`;
              const sc=tournament.scores[key];
              const tA=match.teamA||[];
              const tB=match.teamB||[];
              return (
                <div key={mi} style={{marginBottom:mi<matches.length-1?10:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{flex:1,fontSize:13,fontWeight:600,textAlign:"right",color:sc?(sc.a>sc.b?A:TX):TX}}>{tA.map(p=>getName(p)).join(" x ")}</span>
                    <span style={{color:MT,fontSize:11,fontWeight:700}}>vs</span>
                    <span style={{flex:1,fontSize:13,fontWeight:600,color:sc?(sc.b>sc.a?A:TX):TX}}>{tB.map(p=>getName(p)).join(" x ")}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
                    <input type="number" min="0" max={ptsPerRound} value={sc?.a||""} placeholder="0"
                      onFocus={e=>e.target.select()}
                      onChange={e=>{const v=Math.min(+e.target.value||0,ptsPerRound);recordScore(ri,mi,v,ptsPerRound-v);}}
                      style={{width:50,textAlign:"center",background:CD2,color:TX,border:`1px solid ${A}30`,borderRadius:8,padding:"6px",fontSize:16,fontWeight:700,fontFamily:"'JetBrains Mono'",outline:"none"}}/>
                    <span style={{color:MT,fontWeight:700,fontSize:12}}>-</span>
                    <input type="number" min="0" max={ptsPerRound} value={sc?.b||""} placeholder="0"
                      onFocus={e=>e.target.select()}
                      onChange={e=>{const v=Math.min(+e.target.value||0,ptsPerRound);recordScore(ri,mi,ptsPerRound-v,v);}}
                      style={{width:50,textAlign:"center",background:CD2,color:TX,border:`1px solid ${DG}30`,borderRadius:8,padding:"6px",fontSize:16,fontWeight:700,fontFamily:"'JetBrains Mono'",outline:"none"}}/>
                    {match.court&&<span style={{fontSize:9,color:MT,marginLeft:4}}>Court {match.court}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
