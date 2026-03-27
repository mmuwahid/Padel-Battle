import React, { useState, useMemo } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, BL, PU } from '../theme';
import { ACHS } from '../data/achievements';
import { FD } from './FormDots';
import { formatTeam, win, formatDate } from '../utils/helpers';

export function PlayerStats({players,ps,pm,getStreak,getForm,elo,sp,setSp,fm,supabase,leagueId,isAdmin,getName,sel,onPlayersChange}){
  const player=sp?pm[sp]:null;
  const stats=sp?ps[sp]:null;
  const [subTab,setSubTab]=useState("roster"); // roster | analytics
  const [editMode,setEditMode]=useState(false);
  const [editPid,setEditPid]=useState(null);
  const [editName,setEditName]=useState("");
  const [editNick,setEditNick]=useState("");
  const [confirmDel,setConfirmDel]=useState(null);
  const [showAddPlayer,setShowAddPlayer]=useState(false);
  const [newName,setNewName]=useState("");
  const [newNick,setNewNick]=useState("");

  const h2h=useMemo(()=>{
    if(!sp)return[];
    const r={};
    fm.forEach(m=>{
      const w=win(m.sets);
      const my=m.team_a.includes(sp)?"A":m.team_b.includes(sp)?"B":null;
      if(!my)return;
      const opp=my==="A"?m.team_b:m.team_a;
      const won=w===my;
      opp.forEach(o=>{
        if(!r[o])r[o]={w:0,l:0};
        if(won)r[o].w++;else r[o].l++;
      });
    });
    return Object.entries(r).map(([pid,x])=>({pid,...x,games:x.w+x.l})).sort((a,b)=>b.games-a.games);
  },[sp,fm]);

  const inp={background:CD2,color:TX,border:`1px solid ${BD}`,borderRadius:10,padding:"10px 12px",fontSize:14,width:"100%",outline:"none",fontWeight:500};

  async function addPlayer(){
    if(!newName.trim())return;
    try{
      const {error}=await supabase.from("players").insert({league_id:leagueId,name:newName.trim(),nickname:newNick.trim()||null});
      if(error)throw error;
      setNewName("");
      setNewNick("");
      setShowAddPlayer(false);
      if(onPlayersChange)onPlayersChange();
    }catch(err){
      console.error("Add player error:",err);
    }
  }

  async function updatePlayer(pid,name,nick){
    try{
      const {error}=await supabase.from("players").update({name:name.trim(),nickname:nick.trim()||null}).eq("id",pid);
      if(error)throw error;
      setEditPid(null);
      if(onPlayersChange)onPlayersChange();
    }catch(err){
      console.error("Update player error:",err);
    }
  }

  async function deletePlayer(pid){
    if(!isAdmin)return;
    try{
      // Delete related matches
      const {error:matchErr}=await supabase.from("matches").delete().or(`team_a.cs.{"${pid}"},team_b.cs.{"${pid}"}`);
      // Delete player
      const {error:playerErr}=await supabase.from("players").delete().eq("id",pid);
      if(playerErr)throw playerErr;
      if(onPlayersChange)onPlayersChange();
    }catch(err){
      console.error("Delete player error:",err);
    }
  }

  function startEdit(p){
    setEditPid(p.id);
    setEditName(p.name);
    setEditNick(p.nickname||"");
  }

  if(sp&&player&&stats){
    const wp=stats.games>0?(stats.wins/stats.games*100):0;
    const e=elo[sp]||1500;
    const gd=stats.gamesWon-stats.gamesLost;
    const badges=ACHS.filter(a=>a.ck(stats));
    return (
      <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
        <button onClick={()=>setSp(null)} style={{background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:12}}>← All Players</button>
        <div style={{background:CD,borderRadius:16,border:`1px solid ${BD}`,padding:20,marginBottom:12,textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${A}25,${A}08)`,border:`2px solid ${A}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:800,color:A,margin:"0 auto 10px"}}>{player.name[0]}</div>
          <h2 style={{fontSize:22,fontWeight:800}}>{player.name}</h2>
          {player.nickname&&<p style={{fontSize:13,color:MT}}>"{player.nickname}"</p>}
          <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:12}}>
            <div><div style={{fontSize:32,fontWeight:900,color:BL,fontFamily:"'JetBrains Mono'"}}>{e}</div><p style={{fontSize:11,color:MT}}>ELO</p></div>
            <div><div style={{fontSize:32,fontWeight:900,color:A,fontFamily:"'JetBrains Mono'"}}>{wp.toFixed(0)}%</div><p style={{fontSize:11,color:MT}}>Win Rate</p></div>
          </div>
          <div style={{marginTop:8,display:"flex",justifyContent:"center"}}><FD f={getForm(sp)}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:6}}>
          {[["Games Played",stats.games,TX],["Wins",stats.wins,A],["Losses",stats.losses,DG]].map(([l,v,c])=><div key={l} style={{background:CD,borderRadius:10,border:`1px solid ${BD}`,padding:"12px 8px",textAlign:"center"}}><div style={{fontSize:26,fontWeight:800,color:c,fontFamily:"'JetBrains Mono'"}}>{v}</div><div style={{fontSize:10,color:MT,fontWeight:600,marginTop:4}}>{l}</div></div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:6}}>
          {[["Streak",getStreak(sp),TX],["⭐ MOTM",stats.motm,GD]].map(([l,v,c])=><div key={l} style={{background:CD,borderRadius:10,border:`1px solid ${BD}`,padding:"12px 8px",textAlign:"center"}}><div style={{fontSize:26,fontWeight:800,color:c,fontFamily:"'JetBrains Mono'"}}>{v}</div><div style={{fontSize:10,color:MT,fontWeight:600,marginTop:4}}>{l}</div></div>)}
          <div style={{background:CD,borderRadius:10,border:`1px solid ${BD}`,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:26,fontWeight:800,color:gd>=0?A:DG,fontFamily:"'JetBrains Mono'"}}>{gd>0?"+":""}{gd}</div>
            <div style={{fontSize:10,color:MT,fontWeight:600,marginTop:4}}>Games Diff</div>
            <div style={{fontSize:8,color:MT,marginTop:2,lineHeight:1.3}}>Total games won minus games lost</div>
          </div>
        </div>
        <div style={{background:CD,borderRadius:14,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
          <h3 style={{fontSize:13,fontWeight:700,color:GD,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>🏆 Achievements ({badges.length}/{ACHS.length})</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {ACHS.map(a=>{const u=badges.some(b=>b.id===a.id);return (<div key={a.id} style={{background:u?`${GD}10`:BG,borderRadius:10,border:`1px solid ${u?`${GD}30`:BD}`,padding:"10px 8px",textAlign:"center",opacity:u?1:0.35}}><div style={{fontSize:22}}>{a.icon}</div><div style={{fontSize:11,fontWeight:700,color:u?GD:MT,marginTop:4}}>{a.name}</div><div style={{fontSize:9,color:MT,marginTop:2}}>{a.desc}</div></div>);})}
          </div>
        </div>
        <div style={{background:CD,borderRadius:14,border:`1px solid ${BD}`,padding:14}}>
          <h3 style={{fontSize:13,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Head to Head</h3>
          {h2h.length===0&&<p style={{fontSize:12,color:MT}}>No matches yet</p>}
          {h2h.map(r=>{const opp=pm[r.pid];return (<div key={r.pid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${BD}20`}}><span style={{fontSize:14,fontWeight:600}}>{opp?.nickname||opp?.name||"?"}</span><div style={{display:"flex",gap:12}}><span style={{fontSize:13,color:A,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{r.w}W</span><span style={{fontSize:13,color:DG,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{r.l}L</span></div></div>);})}
        </div>
      </div>
    );
  }

  // FT-04: Analytics computed data (mockup-aligned: 5 sections)
  const [analyticsSection,setAnalyticsSection]=useState("league");
  const analyticsData=useMemo(()=>{
    if(fm.length===0)return null;
    const totalMatches=fm.length;
    const totalSets=fm.reduce((t,m)=>t+m.sets.length,0);
    // Per-player stats
    const wr={};players.forEach(p=>{wr[p.id]={w:0,l:0,gw:0,gl:0};});
    fm.forEach(m=>{const w=win(m.sets);const gA=m.sets.reduce((s,x)=>s+x[0],0);const gB=m.sets.reduce((s,x)=>s+x[1],0);
      m.team_a.forEach(pid=>{if(wr[pid]){if(w==="A")wr[pid].w++;else wr[pid].l++;wr[pid].gw+=gA;wr[pid].gl+=gB;}});
      m.team_b.forEach(pid=>{if(wr[pid]){if(w==="B")wr[pid].w++;else wr[pid].l++;wr[pid].gw+=gB;wr[pid].gl+=gA;}});
    });
    // Activity
    const activity={};players.forEach(p=>{activity[p.id]=0;});
    fm.forEach(m=>{[...m.team_a,...m.team_b].forEach(pid=>{if(activity[pid]!==undefined)activity[pid]++;});});
    const mostActive=Object.entries(activity).filter(([,g])=>g>0).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([pid,games])=>({pid,games}));
    const topWinRate=Object.entries(wr).filter(([,x])=>x.w+x.l>=3).map(([pid,x])=>({pid,pct:x.w/(x.w+x.l)*100,w:x.w,l:x.l,games:x.w+x.l})).sort((a,b)=>b.pct-a.pct).slice(0,5);
    // Close matches
    const closeMatches=fm.filter(m=>m.sets.some(s=>Math.abs(s[0]-s[1])<=1&&(s[0]+s[1])>0)).length;
    // MOTM
    const motmCount={};fm.forEach(m=>{if(m.motm){motmCount[m.motm]=(motmCount[m.motm]||0)+1;}});
    const topMotm=Object.entries(motmCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([pid,count])=>({pid,count}));
    // Monthly
    const monthly={};fm.forEach(m=>{const key=m.date?.substring(0,7);if(key)monthly[key]=(monthly[key]||0)+1;});
    const monthlyArr=Object.entries(monthly).sort().slice(-6);
    // Partnership stats
    const partnerStats={};
    fm.forEach(m=>{const w=win(m.sets);
      [[m.team_a,w==="A"],[m.team_b,w==="B"]].forEach(([team,won])=>{
        if(team.length===2){const [a,b]=team.sort();const k=`${a}|${b}`;
          if(!partnerStats[k])partnerStats[k]={a,b,w:0,l:0};
          if(won)partnerStats[k].w++;else partnerStats[k].l++;}
      });
    });
    const partnerships=Object.values(partnerStats).filter(p=>p.w+p.l>=1).sort((a,b)=>(b.w/(b.w+b.l))-(a.w/(a.w+a.l)));
    const bestPartnership=partnerships[0]||null;
    const worstPartnership=partnerships.length>1?partnerships[partnerships.length-1]:null;
    // H2H opponent analysis per player
    const h2hAll={};
    fm.forEach(m=>{const w=win(m.sets);
      const process=(myTeam,oppTeam,won)=>{myTeam.forEach(me=>{oppTeam.forEach(opp=>{
        if(!h2hAll[me])h2hAll[me]={};if(!h2hAll[me][opp])h2hAll[me][opp]={w:0,l:0};
        if(won)h2hAll[me][opp].w++;else h2hAll[me][opp].l++;
      });});};
      process(m.team_a,m.team_b,w==="A");process(m.team_b,m.team_a,w==="B");
    });
    // Most competitive matchups
    const matchups=[];
    const seen=new Set();
    Object.entries(h2hAll).forEach(([pid,opps])=>{Object.entries(opps).forEach(([opp,r])=>{
      const k=[pid,opp].sort().join("|");if(!seen.has(k)&&r.w+r.l>=2){seen.add(k);const total=r.w+r.l;const pct=Math.min(r.w,r.l)/total*100;matchups.push({p1:pid,p2:opp,...r,games:total,balance:pct});}
    });});
    matchups.sort((a,b)=>b.balance-a.balance);
    // Biggest wins (largest set differential)
    const biggestWins=[...fm].map(m=>{const gA=m.sets.reduce((s,x)=>s+x[0],0);const gB=m.sets.reduce((s,x)=>s+x[1],0);return{...m,diff:Math.abs(gA-gB),winner:win(m.sets)};}).sort((a,b)=>b.diff-a.diff).slice(0,3);
    return {totalMatches,totalSets,mostActive,topWinRate,closeMatches,topMotm,monthlyArr,wr,partnerships,bestPartnership,worstPartnership,h2hAll,matchups:matchups.slice(0,5),biggestWins};
  },[fm,players]);

  return (
    <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
      {/* FT-04: Sub-tab toggle */}
      <div style={{display:"flex",gap:4,marginBottom:16,background:CD,borderRadius:10,padding:3}}>
        {["roster","analytics"].map(t=>(
          <button key={t} onClick={()=>setSubTab(t)} style={{flex:1,padding:"8px 12px",borderRadius:8,border:"none",background:subTab===t?A:"transparent",color:subTab===t?"#000":MT,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textTransform:"capitalize"}}>{t}</button>
        ))}
      </div>

      {subTab==="analytics" && analyticsData ? (
        <div>
          {/* Analytics Section Tabs — matching mockup control panel */}
          <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
            {[["league","📈 League"],["partnership","🤝 Partners"],["opponent","🎯 H2H"],["insights","🏆 Insights"]].map(([k,l])=>(
              <button key={k} onClick={()=>setAnalyticsSection(k)} style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${analyticsSection===k?A:BD}`,background:analyticsSection===k?`${A}15`:"transparent",color:analyticsSection===k?A:MT,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>{l}</button>
            ))}
          </div>

          {/* LEAGUE-WIDE STATS */}
          {analyticsSection==="league"&&<div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div style={{background:CD,borderRadius:12,padding:14,border:`1px solid ${BD}`}}>
                <div style={{fontSize:10,color:MT,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Total Matches</div>
                <div style={{fontSize:24,fontWeight:800,color:A,fontFamily:"'JetBrains Mono'"}}>{analyticsData.totalMatches}</div>
              </div>
              <div style={{background:CD,borderRadius:12,padding:14,border:`1px solid ${BD}`}}>
                <div style={{fontSize:10,color:MT,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Close Games</div>
                <div style={{fontSize:24,fontWeight:800,color:GD,fontFamily:"'JetBrains Mono'"}}>{analyticsData.closeMatches}</div>
              </div>
            </div>
            {/* Most Active */}
            <div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>Most Active Players</div>
              {analyticsData.mostActive.map((x,i)=>(
                <div key={x.pid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:i<analyticsData.mostActive.length-1?`1px solid ${BD}`:undefined}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:32,height:32,borderRadius:"50%",background:`${A}15`,border:`2px solid ${A}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:A}}>{getName(x.pid)[0]}</div><span style={{fontSize:12,color:TX}}>{getName(x.pid)}</span></div>
                  <div style={{textAlign:"right"}}><span style={{fontSize:14,fontWeight:700,color:A,fontFamily:"'JetBrains Mono'"}}>{x.games}</span><span style={{fontSize:10,color:MT,marginLeft:4}}>GP</span></div>
                </div>
              ))}
            </div>
            {/* Highest Win Rates */}
            <div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>Highest Win Rates</div>
              {analyticsData.topWinRate.map((x,i)=>(
                <div key={x.pid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:i<analyticsData.topWinRate.length-1?`1px solid ${BD}`:undefined}}>
                  <span style={{fontSize:12,color:TX}}>{getName(x.pid)}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:MT}}>{x.w}W-{x.l}L</span>
                    <span style={{fontSize:14,fontWeight:700,color:x.pct>=60?A:x.pct>=40?TX:DG,fontFamily:"'JetBrains Mono'"}}>{x.pct.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Most Competitive Matchups */}
            {analyticsData.matchups.length>0&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>Most Competitive Matchups</div>
              {analyticsData.matchups.map((x,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:i<analyticsData.matchups.length-1?`1px solid ${BD}`:undefined}}>
                  <span style={{fontSize:12,color:TX}}>{getName(x.p1)} vs {getName(x.p2)}</span>
                  <div><span style={{fontSize:11,color:MT}}>{x.games} GP</span><span style={{fontSize:11,color:A,marginLeft:8}}>{Math.round(x.balance*2)}% balanced</span></div>
                </div>
              ))}
            </div>}
            {/* Monthly Trend */}
            {analyticsData.monthlyArr.length>1&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>League Activity</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:6,height:80}}>
                {analyticsData.monthlyArr.map(([month,count])=>{
                  const max=Math.max(...analyticsData.monthlyArr.map(a=>a[1]));
                  const h=max>0?(count/max)*60+10:10;
                  return <div key={month} style={{flex:1,textAlign:"center"}}><div style={{height:h,background:`linear-gradient(180deg,${A},${A}60)`,borderRadius:4,marginBottom:4}}/><div style={{fontSize:8,color:MT}}>{month.slice(5)}</div><div style={{fontSize:10,fontWeight:700,color:TX}}>{count}</div></div>;
                })}
              </div>
            </div>}
          </div>}

          {/* PARTNERSHIP ANALYTICS */}
          {analyticsSection==="partnership"&&<div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {analyticsData.bestPartnership&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
                <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:8}}>Best Partnerships</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:`${A}15`,border:`2px solid ${A}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:A}}>{getName(analyticsData.bestPartnership.a)[0]}</div>
                  <div><div style={{fontSize:12,fontWeight:700,color:TX}}>{getName(analyticsData.bestPartnership.a)} x {getName(analyticsData.bestPartnership.b)}</div>
                  <div style={{fontSize:11,color:A}}>{analyticsData.bestPartnership.w}W-{analyticsData.bestPartnership.l}L ({Math.round(analyticsData.bestPartnership.w/(analyticsData.bestPartnership.w+analyticsData.bestPartnership.l)*100)}%)</div></div>
                </div>
              </div>}
              {analyticsData.worstPartnership&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
                <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:8}}>Worst Partnerships</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:`${DG}15`,border:`2px solid ${DG}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:DG}}>{getName(analyticsData.worstPartnership.a)[0]}</div>
                  <div><div style={{fontSize:12,fontWeight:700,color:TX}}>{getName(analyticsData.worstPartnership.a)} x {getName(analyticsData.worstPartnership.b)}</div>
                  <div style={{fontSize:11,color:DG}}>{analyticsData.worstPartnership.w}W-{analyticsData.worstPartnership.l}L ({Math.round(analyticsData.worstPartnership.w/(analyticsData.worstPartnership.w+analyticsData.worstPartnership.l)*100)}%)</div></div>
                </div>
              </div>}
            </div>
            {/* All partnerships */}
            <div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>All Partnerships</div>
              {analyticsData.partnerships.slice(0,10).map((p,i)=>{const pct=Math.round(p.w/(p.w+p.l)*100);return(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:i<Math.min(analyticsData.partnerships.length,10)-1?`1px solid ${BD}`:undefined}}>
                  <span style={{fontSize:12,color:TX}}>{getName(p.a)} x {getName(p.b)}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:50,height:6,background:BD,borderRadius:3,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:pct>=60?A:pct>=40?BL:DG,borderRadius:3}}/></div>
                    <span style={{fontSize:12,fontWeight:700,color:pct>=60?A:pct>=40?TX:DG,fontFamily:"'JetBrains Mono'",width:35,textAlign:"right"}}>{pct}%</span>
                  </div>
                </div>
              );})}
            </div>
          </div>}

          {/* OPPONENT ANALYSIS (H2H) */}
          {analyticsSection==="opponent"&&<div>
            <div style={{display:"flex",gap:12,marginBottom:12,fontSize:11}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:2,background:A}}/><span style={{color:MT}}>Wins</span></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:2,background:DG}}/><span style={{color:MT}}>Losses</span></div>
            </div>
            {/* H2H bars for each player pair */}
            {analyticsData.matchups.slice(0,8).map((x,i)=>{const total=x.w+x.l;const wp=total>0?(x.w/total)*100:50;return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{minWidth:80,fontSize:11,color:TX,fontWeight:600}}>{getName(x.p1)}</div>
                <div style={{flex:1,display:"flex",height:32,borderRadius:6,overflow:"hidden"}}>
                  <div style={{width:`${wp}%`,background:A,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#000",minWidth:20}}>{x.w}W</div>
                  <div style={{width:`${100-wp}%`,background:DG,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",minWidth:20}}>{x.l}L</div>
                </div>
                <div style={{minWidth:50,textAlign:"right",fontSize:11,fontWeight:700,color:TX}}>{x.w}W-{x.l}L</div>
              </div>
            );})}
          </div>}

          {/* MATCH INSIGHTS */}
          {analyticsSection==="insights"&&<div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
                <div style={{fontSize:10,color:MT,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>MOTM Awards</div>
                <div style={{fontSize:20,fontWeight:800,color:GD,fontFamily:"'JetBrains Mono'"}}>{analyticsData.topMotm.reduce((s,x)=>s+x.count,0)}</div>
                <div style={{fontSize:10,color:MT,marginTop:4}}>across all players</div>
              </div>
              <div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
                <div style={{fontSize:10,color:MT,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Closest Matches</div>
                <div style={{fontSize:20,fontWeight:800,color:A,fontFamily:"'JetBrains Mono'"}}>{analyticsData.closeMatches}</div>
                <div style={{fontSize:10,color:MT,marginTop:4}}>decided by 1 point</div>
              </div>
            </div>
            {/* MOTM Leaderboard */}
            {analyticsData.topMotm.length>0&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>⭐ MOTM Leaderboard</div>
              {analyticsData.topMotm.map((x,i)=>(
                <div key={x.pid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<analyticsData.topMotm.length-1?`1px solid ${BD}`:undefined}}>
                  <span style={{fontSize:12,color:TX}}>{i+1}. {getName(x.pid)}</span>
                  <span style={{fontSize:12,fontWeight:700,color:GD,fontFamily:"'JetBrains Mono'"}}>{x.count}× ⭐</span>
                </div>
              ))}
            </div>}
            {/* Biggest Wins */}
            {analyticsData.biggestWins.length>0&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>Biggest Wins</div>
              {analyticsData.biggestWins.map((m,i)=>{const gA=m.sets.reduce((s,x)=>s+x[0],0);const gB=m.sets.reduce((s,x)=>s+x[1],0);return(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<analyticsData.biggestWins.length-1?`1px solid ${BD}`:undefined}}>
                  <div><div style={{fontSize:12,color:TX,fontWeight:600}}>{formatTeam(getName(m.team_a[0]),getName(m.team_a[1]))}</div><div style={{fontSize:10,color:MT}}>{formatDate(m.date)}</div></div>
                  <span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{m.sets.map((s,si)=><span key={si}>{si>0&&<span style={{color:MT}}>, </span>}<span style={{color:s[0]>s[1]?A:s[0]<s[1]?DG:MT}}>{s[0]}-{s[1]}</span></span>)}</span>
                </div>
              );})}
            </div>}
          </div>}
        </div>
      ) : subTab==="analytics" ? (
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:40,marginBottom:12}}>📊</div>
          <div style={{fontSize:15,fontWeight:600,color:TX,marginBottom:6}}>No analytics yet</div>
          <div style={{fontSize:12,color:MT}}>Play some matches to see league analytics.</div>
        </div>
      ) : null}

      {subTab==="roster" && <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h2 style={{fontSize:16,fontWeight:700}}>Player Roster ({players.length})</h2>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>{setEditMode(!editMode);setEditPid(null);setConfirmDel(null);setShowAddPlayer(false);}} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${editMode?GD:BD}`,background:editMode?`${GD}15`:"transparent",color:editMode?GD:MT,fontSize:12,fontWeight:700,cursor:"pointer"}}>{editMode?"Done":"✏️ Edit"}</button>
          {!editMode&&<button onClick={()=>setShowAddPlayer(!showAddPlayer)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${A}`,background:`${A}15`,color:A,fontSize:12,fontWeight:700,cursor:"pointer"}}>{showAddPlayer?"Cancel":"+ Add"}</button>}
        </div>
      </div>
      {showAddPlayer&&!editMode&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
        <input placeholder="Name *" value={newName} onChange={e=>setNewName(e.target.value)} style={{...inp,marginBottom:8}}/>
        <input placeholder="Nickname" value={newNick} onChange={e=>setNewNick(e.target.value)} style={{...inp,marginBottom:8}}/>
        <button onClick={addPlayer} style={{width:"100%",padding:10,borderRadius:10,border:"none",background:A,color:BG,fontSize:13,fontWeight:700,cursor:"pointer"}}>Add Player</button>
      </div>}
      {players.map(p=>{const s=ps[p.id];const e=elo[p.id]||1500;const badges=ACHS.filter(a=>a.ck(s));
        if(editMode&&editPid===p.id)return (<div key={p.id} style={{background:CD,borderRadius:12,border:`1px solid ${GD}40`,padding:14,marginBottom:6}}>
          <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Name *" style={{...inp,marginBottom:6,borderColor:`${GD}40`}}/>
          <input value={editNick} onChange={e=>setEditNick(e.target.value)} placeholder="Nickname" style={{...inp,marginBottom:8,borderColor:`${GD}40`}}/>
          <div style={{display:"flex",gap:6}}><button onClick={()=>updatePlayer(p.id,editName,editNick)} style={{flex:1,padding:8,borderRadius:8,border:"none",background:A,color:BG,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button><button onClick={()=>setEditPid(null)} style={{flex:1,padding:8,borderRadius:8,border:`1px solid ${BD}`,background:"transparent",color:MT,fontSize:12,fontWeight:700,cursor:"pointer"}}>Cancel</button></div>
        </div>);
        return (<div key={p.id} onClick={()=>{if(!editMode)setSp(p.id);}} style={{display:"flex",alignItems:"center",padding:"12px 14px",marginBottom:6,background:CD,borderRadius:12,border:`1px solid ${editMode?`${GD}20`:BD}`,cursor:editMode?"default":"pointer"}}>
          {editMode&&<div style={{display:"flex",flexDirection:"column",gap:4,marginRight:10}}>
            <button onClick={e=>{e.stopPropagation();startEdit(p);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",padding:0}}>✏️</button>
            {isAdmin&&(confirmDel===p.id?<div style={{display:"flex",flexDirection:"column",gap:2}}><button onClick={e=>{e.stopPropagation();deletePlayer(p.id);setConfirmDel(null);}} style={{background:DG,border:"none",color:"#fff",fontSize:8,fontWeight:700,padding:"3px 4px",borderRadius:4,cursor:"pointer"}}>Yes</button><button onClick={e=>{e.stopPropagation();setConfirmDel(null);}} style={{background:BD,border:"none",color:TX,fontSize:8,fontWeight:700,padding:"3px 4px",borderRadius:4,cursor:"pointer"}}>No</button></div>:<button onClick={e=>{e.stopPropagation();setConfirmDel(p.id);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",padding:0}}>🗑️</button>)}
          </div>}
          <div style={{width:38,height:38,borderRadius:"50%",background:`${A}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:A,marginRight:10}}>{p.name[0]}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14,fontWeight:600}}>{p.name}</span>{p.nickname&&<span style={{fontSize:12,color:MT}}>"{p.nickname}"</span>}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}><span style={{fontSize:11,color:MT}}>{s.games} GP</span><FD f={getForm(p.id)}/>{badges.length>0&&<span style={{fontSize:10}}>{badges.slice(0,3).map(b=>b.icon).join("")}</span>}</div>
          </div>
          <div style={{textAlign:"right"}}><div style={{fontSize:16,fontWeight:800,color:BL,fontFamily:"'JetBrains Mono'"}}>{e}</div><div style={{fontSize:10,color:MT}}>{s.games>0?(s.wins/s.games*100).toFixed(0):"—"}%</div></div>
        </div>);
      })}
    </>}
    </div>
  );
}
