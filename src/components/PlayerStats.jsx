import React, { useState, useMemo } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, BL, PU } from '../theme';
import { ACHS } from '../data/achievements';
import { FD } from './FormDots';
import Icon from './Icon';
import { formatTeam, win, formatDate, setTotals, flagEmoji } from '../utils/helpers';

export function PlayerStats({players,ps,pm,getStreak,getForm,elo,sp,setSp,matches,supabase,leagueId,isAdmin,getName,sel,onPlayersChange,showToast,claimedPlayer,leagueMembers,league}){
  const player=sp?pm[sp]:null;
  const stats=sp?ps[sp]:null;
  const [subTab,setSubTab]=useState("roster"); // roster | analytics
  const [q,setQ]=useState(""); // Phase 5 search
  const [editMode,setEditMode]=useState(false);
  const [editPid,setEditPid]=useState(null);
  const [editName,setEditName]=useState("");
  const [editNick,setEditNick]=useState("");
  const [confirmDel,setConfirmDel]=useState(null);
  const [showAddPlayer,setShowAddPlayer]=useState(false);
  const [newName,setNewName]=useState("");
  const [newNick,setNewNick]=useState("");
  const [analyticsSection,setAnalyticsSection]=useState("league");
  const [h2hP1,setH2hP1]=useState(null);
  const [h2hP2,setH2hP2]=useState(null);

  const h2h=useMemo(()=>{
    if(!sp)return[];
    const r={};
    matches.forEach(m=>{
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
  },[sp,matches]);

  const inp={background:CD2,color:TX,border:`1px solid ${BD}`,borderRadius:10,padding:"10px 12px",fontSize:14,width:"100%",outline:"none",fontWeight:400};

  // S051 Issue #20: lookup helper — find player.avatar_url by id. Used in every
  // avatar slot in this component (drill-in profile, insights, pairs, H2H, grid).
  const getAvatar=(pid)=>players.find(pp=>pp.id===pid)?.avatar_url;

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
      if(showToast)showToast(err.message||"Failed to add player","error");
    }
  }

  async function updatePlayer(pid,name,nick){
    try{
      const {error}=await supabase.from("players").update({name:name.trim(),nickname:nick.trim()||null}).eq("id",pid);
      if(error)throw error;
      setEditPid(null);
      if(onPlayersChange)onPlayersChange();
    }catch(err){
      if(showToast)showToast(err.message||"Failed to update player","error");
    }
  }

  async function deletePlayer(pid){
    if(!isAdmin)return;
    try{
      // Delete related matches first; if it fails, abort to avoid an orphaned player row.
      const {error:matchErr}=await supabase.from("matches").delete().eq("league_id",leagueId).or(`team_a.cs.{"${pid}"},team_b.cs.{"${pid}"}`);
      if(matchErr)throw matchErr;
      const {error:playerErr}=await supabase.from("players").delete().eq("id",pid);
      if(playerErr)throw playerErr;
      if(onPlayersChange)onPlayersChange();
    }catch(err){
      if(showToast)showToast(err.message||"Failed to delete player","error");
    }
  }

  function startEdit(p){
    setEditPid(p.id);
    setEditName(p.name);
    setEditNick(p.nickname||"");
  }

  // FT-04: Analytics computed data (moved above early return to respect Rules of Hooks)
  const analyticsData=useMemo(()=>{
    if(matches.length===0)return null;
    const totalMatches=matches.length;
    const totalSets=matches.reduce((t,m)=>t+m.sets.length,0);
    const wr={};players.forEach(p=>{wr[p.id]={w:0,l:0,gw:0,gl:0};});
    matches.forEach(m=>{const w=win(m.sets);const [gA,gB]=setTotals(m.sets);
      m.team_a.forEach(pid=>{if(wr[pid]){if(w==="A")wr[pid].w++;else wr[pid].l++;wr[pid].gw+=gA;wr[pid].gl+=gB;}});
      m.team_b.forEach(pid=>{if(wr[pid]){if(w==="B")wr[pid].w++;else wr[pid].l++;wr[pid].gw+=gB;wr[pid].gl+=gA;}});
    });
    const activity={};players.forEach(p=>{activity[p.id]=0;});
    matches.forEach(m=>{[...m.team_a,...m.team_b].forEach(pid=>{if(activity[pid]!==undefined)activity[pid]++;});});
    const mostActive=Object.entries(activity).filter(([,g])=>g>0).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([pid,games])=>({pid,games}));
    const topWinRate=Object.entries(wr).filter(([,x])=>x.w+x.l>=3).map(([pid,x])=>({pid,pct:x.w/(x.w+x.l)*100,w:x.w,l:x.l,games:x.w+x.l})).sort((a,b)=>b.pct-a.pct).slice(0,5);
    const closeMatches=matches.filter(m=>m.sets.some(s=>Math.abs(s[0]-s[1])<=1&&(s[0]+s[1])>0)).length;
    const motmCount={};matches.forEach(m=>{if(m.motm){motmCount[m.motm]=(motmCount[m.motm]||0)+1;}});
    const topMotm=Object.entries(motmCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([pid,count])=>({pid,count}));
    const monthly={};matches.forEach(m=>{const key=m.date?.substring(0,7);if(key)monthly[key]=(monthly[key]||0)+1;});
    const monthlyArr=Object.entries(monthly).sort().slice(-6);
    const partnerStats={};
    matches.forEach(m=>{const w=win(m.sets);
      [[m.team_a,w==="A"],[m.team_b,w==="B"]].forEach(([team,won])=>{
        if(team.length===2){const [a,b]=team.sort();const k=`${a}|${b}`;
          if(!partnerStats[k])partnerStats[k]={a,b,w:0,l:0};
          if(won)partnerStats[k].w++;else partnerStats[k].l++;}
      });
    });
    const partnershipsRaw=Object.values(partnerStats).filter(p=>p.w+p.l>=1);
    const partnerships=[...partnershipsRaw].sort((a,b)=>{
      const pA=a.w/(a.w+a.l), pB=b.w/(b.w+b.l);
      if(pB!==pA)return pB-pA;
      return (b.w+b.l)-(a.w+a.l);
    });
    const bestPartnership=partnerships[0]||null;
    const bestKey=bestPartnership?[bestPartnership.a,bestPartnership.b].slice().sort().join('|'):null;
    const worstSorted=[...partnershipsRaw].filter(p=>[p.a,p.b].slice().sort().join('|')!==bestKey).sort((a,b)=>{
      const pA=a.w/(a.w+a.l), pB=b.w/(b.w+b.l);
      if(pA!==pB)return pA-pB;
      return (b.w+b.l)-(a.w+a.l);
    });
    // S053 Issue #23 follow-up: removed `partnerships.length >= 6` gate so the per-player
    // drill-down shows Worst Pairs whenever ANY losing partnership exists for this player.
    // The 6-partnership minimum was league-scale logic copied into the per-player view,
    // which made the card disappear for players with fewer partners even when the league
    // had plenty of data. Empty-state branch in the JSX handles "no losses yet".
    const worstPartnership=worstSorted[0]||null;
    const h2hAll={};
    matches.forEach(m=>{const w=win(m.sets);
      const process=(myTeam,oppTeam,won)=>{myTeam.forEach(me=>{oppTeam.forEach(opp=>{
        if(!h2hAll[me])h2hAll[me]={};if(!h2hAll[me][opp])h2hAll[me][opp]={w:0,l:0};
        if(won)h2hAll[me][opp].w++;else h2hAll[me][opp].l++;
      });});};
      process(m.team_a,m.team_b,w==="A");process(m.team_b,m.team_a,w==="B");
    });
    const matchups=[];
    const seen=new Set();
    Object.entries(h2hAll).forEach(([pid,opps])=>{Object.entries(opps).forEach(([opp,r])=>{
      const k=[pid,opp].sort().join("|");if(!seen.has(k)&&r.w+r.l>=2){seen.add(k);const total=r.w+r.l;const pct=Math.min(r.w,r.l)/total*100;matchups.push({p1:pid,p2:opp,...r,games:total,balance:pct});}
    });});
    matchups.sort((a,b)=>b.balance-a.balance);
    const biggestWins=[...matches].map(m=>{const [gA,gB]=setTotals(m.sets);return{...m,diff:Math.abs(gA-gB),winner:win(m.sets)};}).sort((a,b)=>b.diff-a.diff).slice(0,3);
    return {totalMatches,totalSets,mostActive,topWinRate,closeMatches,topMotm,monthlyArr,wr,partnerships,bestPartnership,worstPartnership,h2hAll,matchups:matchups.slice(0,5),biggestWins};
  },[matches,players]);

  if(sp&&player&&stats){
    const wp=stats.games>0?(stats.wins/stats.games*100):0;
    const e=elo[sp]||1500;
    const gd=stats.gamesWon-stats.gamesLost;
    const badges=ACHS.filter(a=>a.ck(stats));
    // Phase 6a Q3=A: role badge — owner (gold) > admin (accent) > none.
    // player.user_id maps to league_members.user_id when player is claimed.
    const isPlayerOwner = !!(player.user_id && league?.created_by && player.user_id === league.created_by);
    const isPlayerAdmin = !!(player.user_id && (leagueMembers||[]).some(m => m.user_id === player.user_id && m.role === 'admin'));
    const roleLabel = isPlayerOwner ? 'OWNER' : isPlayerAdmin ? 'ADMIN' : null;
    const positionLabel = player.playing_position === 'left' ? 'Left Side' : player.playing_position === 'right' ? 'Right Side' : null;
    return (
      <div>
        {/* Phase 6a hero block */}
        <section className="dpro">
          <div className="dpro-pic">{player.avatar_url ? <img src={player.avatar_url} alt=""/> : player.name[0]}</div>
          <h2 className="dpro-name">{player.name}</h2>
          {player.nickname && <p className="dpro-nick">"{player.nickname}"</p>}
          {roleLabel && (
            <div className={`dpro-role${isPlayerOwner ? ' gold' : ''}`}>
              <Icon name={isPlayerOwner ? 'crown' : 'admin'} size={11}/>
              {roleLabel}
            </div>
          )}
          {(player.country || positionLabel) && (
            <div className="dpro-tags">
              {player.country && flagEmoji(player.country) && (
                <div className="dpro-tag"><span className="flag">{flagEmoji(player.country)}</span>{player.country.toUpperCase()}</div>
              )}
              {positionLabel && (
                <div className="dpro-tag">
                  <Icon name={player.playing_position === 'left' ? 'court-l' : 'court-r'} size={13} color="#9090a4"/>
                  {positionLabel}
                </div>
              )}
            </div>
          )}
          <div className="dpro-hero-stats">
            <div className="dpro-hs"><div className="dpro-hs-v elo">{e}</div><div className="dpro-hs-l">ELO</div></div>
            <div className="dpro-hs"><div className="dpro-hs-v eff">{wp.toFixed(0)}%</div><div className="dpro-hs-l">Effectiveness</div></div>
          </div>
          <div className="dpro-form"><FD f={getForm(sp)}/></div>
        </section>

        {/* Win-rate progress bar */}
        <section className="dpro-wr">
          <div className="dpro-wrh">
            <div className="dpro-wrl">Win Rate</div>
            <div className="dpro-wrp">{wp.toFixed(0)}%</div>
          </div>
          <div className="dpro-wrbg"><div className="dpro-wrf" style={{width:`${wp}%`}}/></div>
        </section>

        {/* Q4=B preserved 6-metric grid: row 1 (Match Played / Won / Lost) */}
        <div className="dpro-grid">
          <div className="dpro-cell"><div className="dpro-cell-v">{stats.games}</div><div className="dpro-cell-l">Match Played</div></div>
          <div className="dpro-cell"><div className="dpro-cell-v win">{stats.wins}</div><div className="dpro-cell-l">Match Won</div></div>
          <div className="dpro-cell"><div className="dpro-cell-v loss">{stats.losses}</div><div className="dpro-cell-l">Match Lost</div></div>
        </div>

        {/* Row 2 (Cons. Wins / MOTM / Match Diff) */}
        <div className="dpro-grid" style={{paddingBottom:6}}>
          <div className="dpro-cell"><div className="dpro-cell-v">{getStreak(sp)}</div><div className="dpro-cell-l">Cons. Wins</div></div>
          <div className="dpro-cell"><div className="dpro-cell-v gold">{stats.motm}</div><div className="dpro-cell-l">⭐ MOTM</div></div>
          <div className="dpro-cell">
            <div className={`dpro-cell-v ${gd>=0?'diff-pos':'diff-neg'}`}>{gd>0?"+":""}{gd}</div>
            <div className="dpro-cell-l">Match Diff</div>
            <div className="dpro-cell-sub">Won minus Lost</div>
          </div>
        </div>

        {/* Achievements (preserved 2-col grid markup, wrapped in Phase 6a section frame) */}
        <section className="dpro-sec">
          <h3 className="dpro-sectitle gold">🏆 Achievements ({badges.length}/{ACHS.length})</h3>
          <div className="dpro-sec-card">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {ACHS.map(a=>{const u=badges.some(b=>b.id===a.id);return (<div key={a.id} style={{background:u?`${GD}10`:BG,borderRadius:10,border:`1px solid ${u?`${GD}30`:BD}`,padding:"10px 8px",textAlign:"center",opacity:u?1:0.35}}><div style={{fontSize:22}}>{a.icon}</div><div style={{fontSize:11,fontWeight:700,color:u?GD:MT,marginTop:4}}>{a.name}</div><div style={{fontSize:9,color:MT,marginTop:2}}>{a.desc}</div></div>);})}
            </div>
          </div>
        </section>

        {/* Head to Head (preserved data, restyled rows) */}
        <section className="dpro-sec" style={{paddingBottom:24}}>
          <h3 className="dpro-sectitle">Head to Head</h3>
          <div className="dpro-sec-card">
            {h2h.length===0 && <p style={{fontSize:12,color:MT,padding:"4px 0"}}>No matches yet</p>}
            {h2h.map(r=>{const opp=pm[r.pid];return (
              <div key={r.pid} className="dpro-h2h-row">
                <span className="dpro-h2h-name">{opp?.nickname||opp?.name||"?"}</span>
                <div className="dpro-h2h-rec">
                  <span className="dpro-h2h-w">{r.w}W</span>
                  <span className="dpro-h2h-l">{r.l}L</span>
                </div>
              </div>
            );})}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{maxWidth:"600px",margin:"0 auto"}}>
      {/* Phase 5: segmented control replacing italic-uppercase pills (S047 styling). */}
      <div className="seg">
        {[["roster","Players"],["analytics","Analytics"]].map(([k,l])=>(
          <button key={k} className={`sb${subTab===k?" on":""}`} onClick={()=>setSubTab(k)}>{l}</button>
        ))}
      </div>

      {subTab==="analytics" && analyticsData ? (
        <div style={{padding:"20px 16px"}}>
          {/* Analytics Section Tabs — matching mockup control panel */}
          <div style={{display:"flex",gap:4,marginBottom:16}}>
            {[["league","📈 League"],["partnership","🤝 Partners"],["opponent","⚔️ H2H"],["insights","💡 Insights"]].map(([k,l])=>(
              <button key={k} onClick={()=>setAnalyticsSection(k)} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`1px solid ${analyticsSection===k?A:BD}`,background:analyticsSection===k?`${A}15`:"transparent",color:analyticsSection===k?A:MT,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textAlign:"center"}}>{l}</button>
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
                  <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:32,height:32,borderRadius:"50%",background:`${A}15`,border:`2px solid ${A}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:A,overflow:"hidden"}}>{getAvatar(x.pid)?<img src={getAvatar(x.pid)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:getName(x.pid)[0]}</div><span style={{fontSize:12,color:TX}}>{getName(x.pid)}</span></div>
                  <div style={{textAlign:"right"}}><span style={{fontSize:14,fontWeight:700,color:A,fontFamily:"'JetBrains Mono'"}}>{x.games}</span><span style={{fontSize:10,color:MT,marginLeft:4}}>MP</span></div>
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
                  <div><span style={{fontSize:11,color:MT}}>{x.games} MP</span><span style={{fontSize:11,color:A,marginLeft:8}}>{Math.round(x.balance*2)}% balanced</span></div>
                </div>
              ))}
            </div>}
            {/* Monthly Trend */}
            {analyticsData.monthlyArr.length>1&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>League Activity</div>
              {(() => {
                const max=Math.max(...analyticsData.monthlyArr.map(a=>a[1]),1);
                const niceMax=Math.max(2,Math.ceil(max/2)*2);
                const ticks=[niceMax,Math.round(niceMax/2),0];
                const chartH=120;
                return (<>
                  <div style={{display:"flex",gap:8,alignItems:"stretch"}}>
                    <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",height:chartH,fontSize:9,color:MT,fontFamily:"'JetBrains Mono'",textAlign:"right",minWidth:18}}>
                      {ticks.map(t=><div key={t} style={{lineHeight:1}}>{t}</div>)}
                    </div>
                    <div style={{flex:1,position:"relative",height:chartH,borderLeft:`1px solid ${BD}`,borderBottom:`1px solid ${BD}`}}>
                      {ticks.slice(0,-1).map((t,i)=>(
                        <div key={t} style={{position:"absolute",left:0,right:0,top:`${(i/(ticks.length-1))*100}%`,borderTop:`1px dashed ${BD}40`}}/>
                      ))}
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"flex-end",gap:6,padding:"0 4px"}}>
                        {analyticsData.monthlyArr.map(([month,count])=>{
                          const h=(count/niceMax)*chartH;
                          return <div key={month} title={`${count} matches`} style={{flex:1,height:h,background:`linear-gradient(180deg,${A},${A}60)`,borderRadius:"4px 4px 0 0",minHeight:count>0?2:0}}/>;
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,paddingLeft:26,marginTop:6}}>
                    {analyticsData.monthlyArr.map(([month])=>(
                      <div key={month} style={{flex:1,textAlign:"center",fontSize:10,color:MT,fontWeight:600}}>{new Date(month+"-01").toLocaleString("en",{month:"short"})}</div>
                    ))}
                  </div>
                </>);
              })()}
            </div>}
          </div>}

          {/* PARTNERSHIP ANALYTICS */}
          {analyticsSection==="partnership"&&<div>
            {/* S053 Issue #23: both pair cards render BOTH players' avatars (L + R flanking the names),
                Worst Pairs always shown with empty-state when there's no losing partnership yet. */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {analyticsData.bestPartnership&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
                <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:8}}>Best Pairs</div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:`${A}15`,border:`2px solid ${A}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:A,overflow:"hidden",flexShrink:0}}>{getAvatar(analyticsData.bestPartnership.a)?<img src={getAvatar(analyticsData.bestPartnership.a)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:getName(analyticsData.bestPartnership.a)[0]}</div>
                  <div style={{flex:1,minWidth:0,textAlign:"center"}}>
                    <div style={{fontSize:11,fontWeight:700,color:TX,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{getName(analyticsData.bestPartnership.a)} x {getName(analyticsData.bestPartnership.b)}</div>
                    <div style={{fontSize:11,color:A,marginTop:2}}>{analyticsData.bestPartnership.w}W-{analyticsData.bestPartnership.l}L ({Math.round(analyticsData.bestPartnership.w/(analyticsData.bestPartnership.w+analyticsData.bestPartnership.l)*100)}%)</div>
                  </div>
                  <div style={{width:32,height:32,borderRadius:"50%",background:`${A}15`,border:`2px solid ${A}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:A,overflow:"hidden",flexShrink:0}}>{getAvatar(analyticsData.bestPartnership.b)?<img src={getAvatar(analyticsData.bestPartnership.b)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:getName(analyticsData.bestPartnership.b)[0]}</div>
                </div>
              </div>}
              <div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
                <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:8}}>Worst Pairs</div>
                {analyticsData.worstPartnership ? (
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:`${DG}15`,border:`2px solid ${DG}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:DG,overflow:"hidden",flexShrink:0}}>{getAvatar(analyticsData.worstPartnership.a)?<img src={getAvatar(analyticsData.worstPartnership.a)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:getName(analyticsData.worstPartnership.a)[0]}</div>
                    <div style={{flex:1,minWidth:0,textAlign:"center"}}>
                      <div style={{fontSize:11,fontWeight:700,color:TX,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{getName(analyticsData.worstPartnership.a)} x {getName(analyticsData.worstPartnership.b)}</div>
                      <div style={{fontSize:11,color:DG,marginTop:2}}>{analyticsData.worstPartnership.w}W-{analyticsData.worstPartnership.l}L ({Math.round(analyticsData.worstPartnership.w/(analyticsData.worstPartnership.w+analyticsData.worstPartnership.l)*100)}%)</div>
                    </div>
                    <div style={{width:32,height:32,borderRadius:"50%",background:`${DG}15`,border:`2px solid ${DG}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:DG,overflow:"hidden",flexShrink:0}}>{getAvatar(analyticsData.worstPartnership.b)?<img src={getAvatar(analyticsData.worstPartnership.b)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:getName(analyticsData.worstPartnership.b)[0]}</div>
                  </div>
                ) : (
                  <div style={{fontSize:11,color:MT,textAlign:"center",padding:"10px 0",lineHeight:1.4}}>No losing partnerships yet</div>
                )}
              </div>
            </div>
            {/* All partnerships */}
            <div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>All Partnerships</div>
              {analyticsData.partnerships.slice(0,10).map((p,i)=>{const pct=Math.round(p.w/(p.w+p.l)*100);return(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:i<Math.min(analyticsData.partnerships.length,10)-1?`1px solid ${BD}`:undefined}}>
                  <span style={{fontSize:12,color:TX}}>{getName(p.a)} x {getName(p.b)}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:MT,fontFamily:"'JetBrains Mono'",whiteSpace:"nowrap"}}>{p.w+p.l} MP</span>
                    <div style={{width:50,height:6,background:BD,borderRadius:3,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:pct>=60?A:pct>=40?BL:DG,borderRadius:3}}/></div>
                    <span style={{fontSize:12,fontWeight:700,color:pct>=60?A:pct>=40?TX:DG,fontFamily:"'JetBrains Mono'",width:35,textAlign:"right"}}>{pct}%</span>
                  </div>
                </div>
              );})}
            </div>
          </div>}

          {/* OPPONENT ANALYSIS (H2H) */}
          {analyticsSection==="opponent"&&<div>
            {/* Player Selectors */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:11,color:MT,fontWeight:600,marginBottom:6}}>Player 1</label>
                <select value={h2hP1||""} onChange={e=>setH2hP1(e.target.value||null)} style={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",cursor:"pointer"}}>
                  <option value="">Select player</option>
                  {players.map(p=><option key={p.id} value={p.id}>{(p.nickname||p.name)+(elo?` (${Math.round(elo[p.id]||1500)})`:"")} </option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:MT,fontWeight:600,marginBottom:6}}>Player 2</label>
                <select value={h2hP2||""} onChange={e=>setH2hP2(e.target.value||null)} style={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",cursor:"pointer"}}>
                  <option value="">Select player</option>
                  {players.filter(p=>p.id!==h2hP1).map(p=><option key={p.id} value={p.id}>{(p.nickname||p.name)+(elo?` (${Math.round(elo[p.id]||1500)})`:"")} </option>)}
                </select>
              </div>
            </div>

            {h2hP1&&h2hP2?(() => {
              const p1=players.find(p=>p.id===h2hP1);
              const p2=players.find(p=>p.id===h2hP2);
              const h2hM=matches.filter(m=>(m.team_a.includes(h2hP1)&&m.team_b.includes(h2hP2))||(m.team_a.includes(h2hP2)&&m.team_b.includes(h2hP1)));
              const p1W=h2hM.filter(m=>{const w=win(m.sets);return (m.team_a.includes(h2hP1)&&w==="A")||(m.team_b.includes(h2hP1)&&w==="B");}).length;
              const p2W=h2hM.length-p1W;
              const partM=matches.filter(m=>(m.team_a.includes(h2hP1)&&m.team_a.includes(h2hP2))||(m.team_b.includes(h2hP1)&&m.team_b.includes(h2hP2)));
              const oppM=matches.filter(m=>(m.team_a.includes(h2hP1)&&m.team_b.includes(h2hP2))||(m.team_a.includes(h2hP2)&&m.team_b.includes(h2hP1)));
              const pW=partM.filter(m=>{const w=win(m.sets);return (m.team_a.includes(h2hP1)&&w==="A")||(m.team_b.includes(h2hP1)&&w==="B");}).length;
              const pL=partM.length-pW;
              if(h2hM.length===0 && partM.length===0) return (
                <div style={{textAlign:"center",padding:32}}>
                  <div style={{fontSize:48,marginBottom:12}}>⚔️</div>
                  <div style={{fontSize:14,fontWeight:600,color:TX,marginBottom:8}}>No matches found between these two players yet</div>
                  <div style={{fontSize:12,color:MT}}>Play a match together or against each other to see your rivalry stats</div>
                </div>
              );
              return (<>
                {/* H2H Card */}
                <div style={{background:CD2,padding:16,borderRadius:12,marginBottom:16,textAlign:"center"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:12}}>
                    <div style={{width:48,height:48,borderRadius:"50%",background:`${A}20`,border:`2px solid ${A}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:A,overflow:"hidden"}}>{p1?.avatar_url?<img src={p1.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(p1?.name||"?")[0]}</div>
                    <div style={{fontSize:16,fontWeight:700,color:TX}}>{p1W} - {p2W}</div>
                    <div style={{width:48,height:48,borderRadius:"50%",background:`${A}20`,border:`2px solid ${A}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:A,overflow:"hidden"}}>{p2?.avatar_url?<img src={p2.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(p2?.name||"?")[0]}</div>
                  </div>
                  <div style={{width:"100%",height:4,background:CD,borderRadius:2,overflow:"hidden",marginBottom:8}}>
                    <div style={{width:`${h2hM.length>0?(p1W/h2hM.length)*100:50}%`,height:"100%",background:A}}/>
                  </div>
                  <div style={{fontSize:11,color:MT}}>All-time record ({h2hM.length} matches)</div>
                </div>

                {/* As Partners / As Opponents */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                  <div style={{background:CD2,padding:12,borderRadius:8}}>
                    <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:8}}>As Partners</div>
                    {partM.length>0?(<div><div style={{fontSize:10,color:MT,marginBottom:4}}>{partM.length} match{partM.length===1?"":"es"} together</div><div style={{fontSize:13,fontWeight:700}}><span style={{color:A}}>{pW}W</span><span style={{color:MT}}> - </span><span style={{color:pL>0?DG:TX}}>{pL}L</span></div></div>):<div style={{fontSize:12,color:MT}}>No matches</div>}
                  </div>
                  <div style={{background:CD2,padding:12,borderRadius:8}}>
                    <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:8}}>As Opponents</div>
                    {oppM.length>0?(<div><div style={{fontSize:10,color:MT,marginBottom:4}}>{oppM.length} match{oppM.length===1?"":"es"} against</div><div style={{fontSize:12,fontWeight:700,lineHeight:1.4}}><div><span style={{color:A}}>{getName(h2hP1)}</span> won <span style={{color:A,fontFamily:"'JetBrains Mono'"}}>{p1W}</span></div><div><span style={{color:p2W>0?A:MT}}>{getName(h2hP2)}</span> won <span style={{color:p2W>0?A:MT,fontFamily:"'JetBrains Mono'"}}>{p2W}</span></div></div></div>):<div style={{fontSize:12,color:MT}}>No matches</div>}
                  </div>
                </div>

                {/* Last 5 Encounters */}
                {h2hM.length>0&&<div>
                  <h3 style={{fontSize:13,fontWeight:700,color:TX,marginBottom:12}}>Last 5 Encounters</h3>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {h2hM.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(m=>{
                      const w=win(m.sets);
                      const p1Won=(m.team_a.includes(h2hP1)&&w==="A")||(m.team_b.includes(h2hP1)&&w==="B");
                      return (<div key={m.id} style={{padding:10,background:CD,borderRadius:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <span style={{fontSize:11,fontWeight:600,color:p1Won?A:DG}}>{p1Won?"\u2713 "+getName(h2hP1)+" won":"\u2717 "+getName(h2hP2)+" won"}</span>
                          <span style={{fontSize:10,color:MT}}>{formatDate(m.date)}</span>
                        </div>
                        <div style={{fontSize:10,display:"flex",gap:4}}>
                          {m.sets.map((s,i)=>{const isA=m.team_a.includes(h2hP1);const pWon=isA?s[0]>s[1]:s[1]>s[0];return <span key={i} style={{color:pWon?A:DG}}>{s[0]}-{s[1]}</span>;})}
                        </div>
                      </div>);
                    })}
                  </div>
                </div>}
              </>);
            })():<div style={{textAlign:"center",padding:24,color:MT,fontSize:12}}>Select two players to compare their head-to-head record</div>}
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
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>⭐ MOTM Ranking</div>
              {analyticsData.topMotm.map((x,i)=>(
                <div key={x.pid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<analyticsData.topMotm.length-1?`1px solid ${BD}`:undefined}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0,flex:1}}>
                    <span style={{fontSize:12,color:MT,fontWeight:700,fontFamily:"'JetBrains Mono'",minWidth:14,textAlign:"right"}}>{i+1}.</span>
                    <div style={{width:28,height:28,borderRadius:"50%",background:`${GD}15`,border:`2px solid ${GD}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:GD,overflow:"hidden",flexShrink:0}}>{getAvatar(x.pid)?<img src={getAvatar(x.pid)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:getName(x.pid)[0]}</div>
                    <span style={{fontSize:12,color:TX,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{getName(x.pid)}</span>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:GD,fontFamily:"'JetBrains Mono'",flexShrink:0}}>{x.count}× ⭐</span>
                </div>
              ))}
            </div>}
            {/* Biggest Wins */}
            {analyticsData.biggestWins.length>0&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
              <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>Biggest Wins</div>
              {analyticsData.biggestWins.map((m,i)=>{
                const winnerTeam=m.winner==="A"?m.team_a:m.winner==="B"?m.team_b:m.team_a;
                const loserTeam=m.winner==="A"?m.team_b:m.winner==="B"?m.team_a:m.team_b;
                return (
                <div key={i} style={{padding:"10px 0",borderBottom:i<analyticsData.biggestWins.length-1?`1px solid ${BD}`:undefined}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:A,lineHeight:1.3}}>{formatTeam(getName(winnerTeam[0]),getName(winnerTeam[1]))}</div>
                      <div style={{fontSize:10,color:MT,margin:"2px 0"}}>vs</div>
                      <div style={{fontSize:12,fontWeight:600,color:DG,lineHeight:1.3}}>{formatTeam(getName(loserTeam[0]),getName(loserTeam[1]))}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{m.sets.map((set,si)=>{const winnerScore=m.winner==="A"?set[0]:set[1];const loserScore=m.winner==="A"?set[1]:set[0];return (<span key={si}>{si>0&&<span style={{color:MT}}>, </span>}<span style={{color:A}}>{winnerScore}</span><span style={{color:MT}}>-</span><span style={{color:DG}}>{loserScore}</span></span>);})}</div>
                      <div style={{fontSize:10,color:MT,marginTop:4}}>{formatDate(m.date)}</div>
                    </div>
                  </div>
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

      {subTab==="roster" && (() => {
        // Search filter: simple displayed-name startsWith only.
        // Typing "a" matches only players whose displayed name starts with "a"
        // (NOT players with "a" anywhere in the name). Per user: same behavior
        // applies in every search bar in the app.
        const filtered = q==="" ? players : players.filter(p => {
          const display = (p.nickname || p.name || "").toLowerCase();
          return display.startsWith(q.toLowerCase());
        });
        return (<>
          {/* Phase 5: roster header bar with edit/add controls (admin only) */}
          <div className="rbar">
            <div className="rbar-t">Roster<span className="rbar-count">({filtered.length})</span></div>
            {isAdmin && <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button className={`gbtn${editMode?" on":""}`} onClick={()=>{setEditMode(!editMode);setEditPid(null);setConfirmDel(null);setShowAddPlayer(false);}}>
                <Icon name="edit" size={12}/>{editMode?"Done":"Edit"}
              </button>
              {!editMode && <button className="pbtn" onClick={()=>setShowAddPlayer(!showAddPlayer)}>
                <Icon name="plus" size={12} color="#000" strokeWidth={2.5}/>{showAddPlayer?"Cancel":"Add"}
              </button>}
            </div>}
          </div>

          {/* Phase 5: search input */}
          <div className="srchw">
            <div className="srchi"><Icon name="search" size={15}/></div>
            <input className="srch" placeholder="Search players…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>

          {/* Add Player form preserved verbatim (S046 admin path) */}
          {showAddPlayer&&!editMode&&<div style={{margin:"0 18px 12px",background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
            <input placeholder="Name *" value={newName} onChange={e=>setNewName(e.target.value)} style={{...inp,marginBottom:8}}/>
            <input placeholder="Nickname" value={newNick} onChange={e=>setNewNick(e.target.value)} style={{...inp,marginBottom:8}}/>
            <button onClick={addPlayer} style={{width:"100%",padding:10,borderRadius:10,border:"none",background:A,color:BG,fontSize:13,fontWeight:700,cursor:"pointer"}}>Add Player</button>
          </div>}

          {/* Phase 5: hybrid 2-col grid of .prow cards (Q1=C, Q2=A W-L shown, Q3=A circle avatar) */}
          <div className="plist">
            {filtered.length===0 && q && (
              <div className="plist-empty">No players matching "{q}"</div>
            )}
            {filtered.map(p=>{
              const stat = ps[p.id];
              const wl = stat ? {w:stat.wins||0, l:stat.losses||0} : {w:0,l:0};
              const isMe = claimedPlayer?.id === p.id;
              if(editMode && editPid===p.id) return (
                <div key={p.id} className="prow editing">
                  <div style={{flex:1}}>
                    <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Name *" style={{...inp,marginBottom:6,borderColor:`${GD}40`}}/>
                    <input value={editNick} onChange={e=>setEditNick(e.target.value)} placeholder="Nickname" style={{...inp,marginBottom:8,borderColor:`${GD}40`}}/>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>updatePlayer(p.id,editName,editNick)} style={{flex:1,padding:8,borderRadius:8,border:"none",background:A,color:BG,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
                      <button onClick={()=>setEditPid(null)} style={{flex:1,padding:8,borderRadius:8,border:`1px solid ${BD}`,background:"transparent",color:MT,fontSize:12,fontWeight:700,cursor:"pointer"}}>Cancel</button>
                    </div>
                  </div>
                </div>
              );
              return (
                <div key={p.id} className="prow" onClick={()=>{if(!editMode)setSp(p.id);}} style={editMode?{cursor:"default"}:undefined}>
                  <div className={`ravi${isMe?" me":""}`}>
                    {p.avatar_url ? <img src={p.avatar_url} alt=""/> : (p.name[0]||"?").toUpperCase()}
                  </div>
                  <div className="pinfo">
                    <div className="pnam">{p.nickname||p.name}</div>
                    <div className="pmet">
                      {p.country && flagEmoji(p.country) ? (
                        <>
                          <span className="pflag flag">{flagEmoji(p.country)}</span>
                          <span className="pctry">{p.country.toUpperCase()}</span>
                        </>
                      ) : (
                        <span className="pctry" style={{opacity:.4}}>—</span>
                      )}
                      {(wl.w+wl.l)>0 && <>
                        <span className="pmet-sep">·</span>
                        <span className="prec2"><span className="w">{wl.w}W</span><span>{wl.l}L</span></span>
                      </>}
                    </div>
                  </div>
                  {isMe && !editMode && <span className="pbadge">YOU</span>}
                  {editMode ? (
                    <div className="padmin" onClick={e=>e.stopPropagation()}>
                      <button title="Edit" onClick={()=>startEdit(p)}>✏️</button>
                      {isAdmin && (confirmDel===p.id ? (
                        <div className="yn">
                          <button className="y" onClick={()=>{deletePlayer(p.id);setConfirmDel(null);}}>Yes</button>
                          <button className="n" onClick={()=>setConfirmDel(null)}>No</button>
                        </div>
                      ) : (
                        <button title="Delete" onClick={()=>setConfirmDel(p.id)}>🗑️</button>
                      ))}
                    </div>
                  ) : (
                    <div className="pchev"><Icon name="chevron" size={14}/></div>
                  )}
                </div>
              );
            })}
          </div>
        </>);
      })()}
    </div>
  );
}
