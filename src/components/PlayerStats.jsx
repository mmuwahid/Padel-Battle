import React, { useState, useMemo } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, BL, PU } from '../theme';
import { ACHS } from '../data/achievements';
import { FD } from './FormDots';
import Icon from './Icon';
import { AvatarLightbox } from './AvatarLightbox';
import { formatTeam, win, formatDate, setTotals, flagEmoji, getAge } from '../utils/helpers';
import { gradeColor } from '../utils/grade';

// S089 #113g: in the tight Partnership Ranking pair cell a full two-word name
// ("Hani Taha") overflowed and truncated mid-letter ("Hani T_"). Collapse names
// with a surname to "First L." so the pair reads cleanly.
const shortName = (full) => {
  if (!full) return full;
  const parts = String(full).trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

export function PlayerStats({players,ps,pm,getStreak,getForm,elo,sp,setSp,matches,supabase,leagueId,isAdmin,getName,sel,onPlayersChange,showToast,claimedPlayer,leagueMembers,league,seasonId,seasons,seasonRosters}){
  const player=sp?pm[sp]:null;
  const stats=sp?ps[sp]:null;
  const [subTab,setSubTab]=useState("roster"); // roster | analytics
  const [q,setQ]=useState(""); // Phase 5 search
  const [genderFilter,setGenderFilter]=useState("all"); // S066 Phase 8: "all" | "male" | "female"
  const [filterOpen,setFilterOpen]=useState(false); // S066 Phase 8: sliders-icon toggles bar
  const [editMode,setEditMode]=useState(false);
  const [editPid,setEditPid]=useState(null);
  const [editName,setEditName]=useState("");
  const [editNick,setEditNick]=useState("");
  const [confirmDel,setConfirmDel]=useState(null);
  const [showAddPlayer,setShowAddPlayer]=useState(false);
  const [newName,setNewName]=useState("");
  const [newNick,setNewNick]=useState("");
  const [analyticsSection,setAnalyticsSection]=useState("partnership");
  const [h2hP1,setH2hP1]=useState(null);
  const [h2hP2,setH2hP2]=useState(null);
  // S069: tap drill-in avatar to expand WhatsApp/Instagram-style.
  const [showLightbox,setShowLightbox]=useState(false);
  // B1/B2: Players grid scoped to a season's roster, defaulting to the active season.
  const [rosterSeason,setRosterSeason]=useState(()=>(seasons||[]).find(s=>s.active)?.id||seasonId||"all");

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
    const nm=newName.trim();
    if(!nm)return;
    // B3: block exact duplicate names so players stay distinguishable.
    if((players||[]).some(p=>(p.name||"").trim().toLowerCase()===nm.toLowerCase())){
      if(showToast)showToast("That name is already taken — add a last name or initial to tell players apart.","error");
      return;
    }
    try{
      const {error}=await supabase.from("players").insert({league_id:leagueId,name:nm,nickname:newNick.trim()||null});
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
    // Issue #96: gamesDiff = signed (myGames - oppGames) summed across all matches and sets.
    // S079 follow-up: also accumulate chronological W/L results per partnership so the
    // Partnership Ranking row can render a Last-5 form strip (matching the player ranking).
    const partnerStats={};
    const sortedForPartners=[...matches].sort((a,b)=>new Date(a.date)-new Date(b.date));
    sortedForPartners.forEach(m=>{const w=win(m.sets);
      const [gA,gB]=setTotals(m.sets);
      [[m.team_a,w==="A",gA-gB],[m.team_b,w==="B",gB-gA]].forEach(([team,won,diff])=>{
        if(team.length===2){const [a,b]=team.sort();const k=`${a}|${b}`;
          if(!partnerStats[k])partnerStats[k]={a,b,w:0,l:0,gamesDiff:0,results:[]};
          if(won)partnerStats[k].w++;else partnerStats[k].l++;
          partnerStats[k].gamesDiff+=diff;
          partnerStats[k].results.push(won?"W":"L");}
      });
    });
    const partnershipsRaw=Object.values(partnerStats).filter(p=>p.w+p.l>=1);
    // Issue #96: secondary sort by gamesDiff, then games as final tiebreaker.
    const partnerships=[...partnershipsRaw].sort((a,b)=>{
      const pA=a.w/(a.w+a.l), pB=b.w/(b.w+b.l);
      if(pB!==pA)return pB-pA;
      if((b.gamesDiff||0)!==(a.gamesDiff||0))return (b.gamesDiff||0)-(a.gamesDiff||0);
      return (b.w+b.l)-(a.w+a.l);
    });
    const bestPartnership=partnerships[0]||null;
    const bestKey=bestPartnership?[bestPartnership.a,bestPartnership.b].slice().sort().join('|'):null;
    const worstSorted=[...partnershipsRaw].filter(p=>[p.a,p.b].slice().sort().join('|')!==bestKey).sort((a,b)=>{
      const pA=a.w/(a.w+a.l), pB=b.w/(b.w+b.l);
      if(pA!==pB)return pA-pB;
      if((a.gamesDiff||0)!==(b.gamesDiff||0))return (a.gamesDiff||0)-(b.gamesDiff||0);
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
    // Phase 6b (S065 Q10): longest winning + losing streaks per player.
    // Walk matches in chronological order; track per-player current run + max run.
    const runs={};players.forEach(p=>{runs[p.id]={curW:0,curL:0,maxW:0,maxL:0};});
    [...matches].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(m=>{
      const w=win(m.sets);
      m.team_a.forEach(pid=>{
        if(!runs[pid])return;
        if(w==="A"){runs[pid].curW++;runs[pid].curL=0;if(runs[pid].curW>runs[pid].maxW)runs[pid].maxW=runs[pid].curW;}
        else if(w==="B"){runs[pid].curL++;runs[pid].curW=0;if(runs[pid].curL>runs[pid].maxL)runs[pid].maxL=runs[pid].curL;}
      });
      m.team_b.forEach(pid=>{
        if(!runs[pid])return;
        if(w==="B"){runs[pid].curW++;runs[pid].curL=0;if(runs[pid].curW>runs[pid].maxW)runs[pid].maxW=runs[pid].curW;}
        else if(w==="A"){runs[pid].curL++;runs[pid].curW=0;if(runs[pid].curL>runs[pid].maxL)runs[pid].maxL=runs[pid].curL;}
      });
    });
    const longestWinStreaks=Object.entries(runs).filter(([,r])=>r.maxW>0).map(([pid,r])=>({pid,n:r.maxW})).sort((a,b)=>b.n-a.n).slice(0,5);
    const longestLossStreaks=Object.entries(runs).filter(([,r])=>r.maxL>0).map(([pid,r])=>({pid,n:r.maxL})).sort((a,b)=>b.n-a.n).slice(0,5);
    return {totalMatches,totalSets,mostActive,topWinRate,closeMatches,topMotm,monthlyArr,wr,partnerships,bestPartnership,worstPartnership,h2hAll,matchups:matchups.slice(0,5),longestWinStreaks,longestLossStreaks};
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
        {/* S068: unified back-chevron pattern — same .back-btn-row as every
            other drill-down (Admin/LeagueMgmt/PlayerMgmt/Settings/Profile/etc).
            Replaces the previous .hdr-back conditional in App.jsx that swapped
            the app header logo for a back button. App header now stays
            consistent across all screens. */}
        <div className="back-btn-row">
          <button className="back-btn" onClick={()=>setSp(null)} aria-label="Back">
            <Icon name="chevron-left" size={18} color="currentColor"/>
          </button>
        </div>
        {/* Phase 6a hero block */}
        <section className="dpro">
          <div
            className={`dpro-pic${player.avatar_url ? " tappable" : ""}`}
            onClick={player.avatar_url ? () => setShowLightbox(true) : undefined}
            role={player.avatar_url ? "button" : undefined}
            aria-label={player.avatar_url ? "View photo" : undefined}
          >{player.avatar_url ? <img src={player.avatar_url} alt=""/> : player.name[0]}</div>
          <h2 className="dpro-name">{player.name}</h2>
          {player.nickname && <p className="dpro-nick">"{player.nickname}"</p>}
          {roleLabel && (
            <div className={`dpro-role${isPlayerOwner ? ' gold' : ''}`}>
              <Icon name={isPlayerOwner ? 'crown' : 'admin'} size={11}/>
              {roleLabel}
            </div>
          )}
          {(player.country || getAge(player.date_of_birth) != null || player.grade) && (
            <div className="dpro-tags">
              {player.country && flagEmoji(player.country) && (
                <div className="dpro-tag"><span className="flag">{flagEmoji(player.country)}</span>{player.country.toUpperCase()}</div>
              )}
              {/* S067: age tag — uses date_of_birth column added in Phase 11 */}
              {getAge(player.date_of_birth) != null && (
                <div className="dpro-tag">
                  <Icon name="calendar" size={12} color="#9090a4"/>{getAge(player.date_of_birth)} yrs
                </div>
              )}
              {/* FT-17: read-only grade pill (coloured by tier, "Grade:" prefixed) */}
              {player.grade && (
                <div className="dpro-tag" style={{color:gradeColor(player.grade),borderColor:gradeColor(player.grade),background:`${gradeColor(player.grade)}1a`,fontWeight:800}}>Grade: {player.grade}</div>
              )}
            </div>
          )}
          {(player.handedness || positionLabel) && (
            <div className="dpro-tags">
              {/* S070 Issue #83: handedness tag — rendered before court position. */}
              {player.handedness && (
                <div className="dpro-tag">
                  <Icon name={player.handedness === 'left' ? 'hand-left' : 'hand-right'} size={12} color="#9090a4"/>
                  {player.handedness === 'left' ? 'Left Hand' : 'Right Hand'}
                </div>
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
          <div className="dpro-cell"><div className={`dpro-cell-v ${stats.wins>0?'win':'zero'}`}>{stats.wins}</div><div className="dpro-cell-l">Match Won</div></div>
          <div className="dpro-cell"><div className={`dpro-cell-v ${stats.losses>0?'loss':'zero'}`}>{stats.losses}</div><div className="dpro-cell-l">Match Lost</div></div>
        </div>

        {/* Row 2 (Cons. Wins / MOTM / Match Diff) */}
        <div className="dpro-grid" style={{paddingBottom:6}}>
          <div className="dpro-cell"><div className="dpro-cell-v">{getStreak(sp)}</div><div className="dpro-cell-l">Cons. Wins</div></div>
          <div className="dpro-cell"><div className="dpro-cell-v gold">{stats.motm}</div><div className="dpro-cell-l" style={{display:"inline-flex",alignItems:"center",gap:4,justifyContent:"center"}}><Icon name="star" size={11} color="var(--gold)"/>MOTM</div></div>
          <div className="dpro-cell">
            <div className={`dpro-cell-v ${gd>=0?'diff-pos':'diff-neg'}`}>{gd>0?"+":""}{gd}</div>
            <div className="dpro-cell-l">Match Diff</div>
            <div className="dpro-cell-sub">Won minus Lost</div>
          </div>
        </div>

        {/* S068: Achievements — same .ach-* class system as ProfileView so the
            drill-in matches My Profile. Was rendering a.icon as plain text
            ("zap", "flame", etc.) because a.icon is now an Icon SVG name (was
            an emoji pre-S067). Centered title with (earned/total) count badge. */}
        <div className="ach-sec">
          <div className="ach-h center gold">
            <Icon name="trophy" size={14} color="var(--gold)"/>
            <h3 className="ach-h-tit">Achievements ({badges.length}/{ACHS.length})</h3>
          </div>
          <div className="ach-grid">
            {ACHS.map(a => {
              const earned = badges.some(b => b.id === a.id);
              return (
                <div key={a.id} className={`ach-card${earned ? "" : " locked"}`}>
                  <div className="ach-ico">
                    <Icon name={a.icon} size={18} color={earned ? "var(--accent)" : "#5a5a6a"} strokeWidth={earned ? 2 : 1.5}/>
                  </div>
                  <div className="ach-name">{a.name}</div>
                  <div className="ach-desc">{a.desc}</div>
                  {!earned && (
                    <div className="ach-locked-pill">
                      <Icon name="lock" size={10} color="#5a5a6a"/>
                      Locked
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
        {showLightbox && player.avatar_url && (
          <AvatarLightbox src={player.avatar_url} alt={player.name} onClose={()=>setShowLightbox(false)}/>
        )}
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
        <div className="an-body">
          {/* 4-section sub-tab bar (Q6=B Phase 5 .seg/.sb 4-col variant) */}
          <div className="seg-4">
            {[["partnership","users","Partners"],["league","trending-up","League"],["opponent","swords","H2H"],["insights","bulb","Insights"]].map(([k,ic,l])=>(
              <button key={k} className={`sb-4${analyticsSection===k?" on":""}`} onClick={()=>setAnalyticsSection(k)}>
                <Icon name={ic} size={13}/>{l}
              </button>
            ))}
          </div>

          {/* LEAGUE-WIDE STATS */}
          {analyticsSection==="league"&&<>
            <div className="an-tile-grid">
              <div className="an-tile">
                <div className="an-tile-l">Total Matches</div>
                <div className="an-tile-v">{analyticsData.totalMatches}</div>
              </div>
              <div className="an-tile">
                <div className="an-tile-l">Close Games</div>
                <div className="an-tile-v gold">{analyticsData.closeMatches}</div>
              </div>
            </div>

            {/* S079: rows are now clickable to drill into the player profile (setSp). */}
            <section className="dpro-sec" style={{padding:0}}>
              <h3 className="dpro-sectitle">Most Active Players</h3>
              <div className="dpro-sec-card">
                {analyticsData.mostActive.map(x=>(
                  <div key={x.pid} className="lrow" onClick={()=>setSp(x.pid)} style={{cursor:"pointer"}} role="button" tabIndex={0} aria-label={`Open ${getName(x.pid)}'s profile`}>
                    <div className="lrow-l">
                      <div className="lrow-avi">{getAvatar(x.pid)?<img src={getAvatar(x.pid)} alt=""/>:getName(x.pid)[0]}</div>
                      <span className="lrow-name">{getName(x.pid)}</span>
                    </div>
                    <div className="lrow-r"><span className="lrow-mp">{x.games}</span><span className="lrow-mpu">MP</span></div>
                  </div>
                ))}
              </div>
            </section>

            {/* S079: avatar added + rows clickable to drill into player profile. */}
            <section className="dpro-sec" style={{padding:0}}>
              <h3 className="dpro-sectitle">Highest Win Rates</h3>
              <div className="dpro-sec-card">
                {analyticsData.topWinRate.map(x=>(
                  <div key={x.pid} className="lrow" onClick={()=>setSp(x.pid)} style={{cursor:"pointer"}} role="button" tabIndex={0} aria-label={`Open ${getName(x.pid)}'s profile`}>
                    <div className="lrow-l">
                      <div className="lrow-avi">{getAvatar(x.pid)?<img src={getAvatar(x.pid)} alt=""/>:getName(x.pid)[0]}</div>
                      <span className="lrow-name">{getName(x.pid)}</span>
                    </div>
                    <div className="lrow-r">
                      <span className="lrow-wl">{x.w}W-{x.l}L</span>
                      <span className={`lrow-pct${x.pct>=60?"":x.pct>=40?" mid":" lo"}`}>{x.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {analyticsData.matchups.length>0 && <section className="dpro-sec" style={{padding:0}}>
              <h3 className="dpro-sectitle">Most Competitive Matchups</h3>
              <div className="dpro-sec-card">
                {analyticsData.matchups.map((x,i)=>(
                  <div key={i} className="lrow">
                    <div className="lrow-l"><span className="lrow-name">{getName(x.p1)} vs {getName(x.p2)}</span></div>
                    <div className="lrow-r">
                      <span className="lrow-mx">{x.games} MP</span>
                      <span className="lrow-bal">{Math.round(x.balance*2)}% balanced</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>}

            {analyticsData.monthlyArr.length>1 && <section className="dpro-sec" style={{padding:0}}>
              <h3 className="dpro-sectitle">League Activity</h3>
              <div className="dpro-sec-card">
                <div className="elobars">
                  {(()=>{
                    const max=Math.max(...analyticsData.monthlyArr.map(a=>a[1]),1);
                    return analyticsData.monthlyArr.map(([month,count])=>{
                      const h=(count/max)*70;
                      return (
                        <div key={month} className="elobar-col">
                          <span className="elobar-val">{count}</span>
                          <div className="elobar-fill" style={{height:`${count>0?Math.max(h,4):0}%`}}/>
                          <span className="elobar-date">{new Date(month+"-01").toLocaleString("en",{month:"short"})}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </section>}
          </>}

          {/* PARTNERS — preserves S053 dual-avatar layout, swaps frame to Phase 6b cards */}
          {analyticsSection==="partnership"&&<>
            <div className="pair-grid">
              {/* S079: GD chip removed from cards per user request — it was
                  pushing the layout. GD remains visible on the Partnership
                  Ranking sort tiebreaker (under the hood). */}
              {analyticsData.bestPartnership&&<div className="pair-card">
                <div className="pair-title">Best Pairs</div>
                <div className="pair-row">
                  <div className="pair-avi">{getAvatar(analyticsData.bestPartnership.a)?<img src={getAvatar(analyticsData.bestPartnership.a)} alt=""/>:getName(analyticsData.bestPartnership.a)[0]}</div>
                  <div className="pair-mid">
                    <div className="pair-names">{getName(analyticsData.bestPartnership.a)} / {getName(analyticsData.bestPartnership.b)}</div>
                    <div className="pair-rec">{analyticsData.bestPartnership.w}W-{analyticsData.bestPartnership.l}L ({Math.round(analyticsData.bestPartnership.w/(analyticsData.bestPartnership.w+analyticsData.bestPartnership.l)*100)}%)</div>
                  </div>
                  <div className="pair-avi">{getAvatar(analyticsData.bestPartnership.b)?<img src={getAvatar(analyticsData.bestPartnership.b)} alt=""/>:getName(analyticsData.bestPartnership.b)[0]}</div>
                </div>
              </div>}
              <div className="pair-card">
                <div className="pair-title">Worst Pairs</div>
                {analyticsData.worstPartnership ? (
                  <div className="pair-row">
                    <div className="pair-avi dg">{getAvatar(analyticsData.worstPartnership.a)?<img src={getAvatar(analyticsData.worstPartnership.a)} alt=""/>:getName(analyticsData.worstPartnership.a)[0]}</div>
                    <div className="pair-mid">
                      <div className="pair-names">{getName(analyticsData.worstPartnership.a)} / {getName(analyticsData.worstPartnership.b)}</div>
                      <div className="pair-rec dg">{analyticsData.worstPartnership.w}W-{analyticsData.worstPartnership.l}L ({Math.round(analyticsData.worstPartnership.w/(analyticsData.worstPartnership.w+analyticsData.worstPartnership.l)*100)}%)</div>
                    </div>
                    <div className="pair-avi dg">{getAvatar(analyticsData.worstPartnership.b)?<img src={getAvatar(analyticsData.worstPartnership.b)} alt=""/>:getName(analyticsData.worstPartnership.b)[0]}</div>
                  </div>
                ) : (
                  <div className="pair-empty">No losing partnerships yet</div>
                )}
              </div>
            </div>

            {/* S079: Partnership Ranking — restyled to use the EXACT same CSS
                classes as the main player leaderboard (.lbtable / .lbth /
                .lbrow / .lbrank / .lbn / .lbc / .form-dots / .fdot.w/.l) so
                fonts, colors, and Last-5 dot shades match. Every data cell
                is horizontally + vertically centered. */}
            <section className="dpro-sec" style={{padding:0}}>
              <h3 className="dpro-sectitle">Partnership Ranking</h3>
              <div className="lbtable">
                <div className="lbth" style={{gridTemplateColumns:"36px 1fr 28px 28px 28px 38px"}}>
                  <div className="lbh c">Rank</div>
                  <div className="lbh c">Pair</div>
                  <div className="lbh" style={{justifyContent:"center"}}>MP</div>
                  <div className="lbh" style={{justifyContent:"center",color:"var(--win)"}}>MW</div>
                  <div className="lbh" style={{justifyContent:"center",color:"var(--loss)"}}>ML</div>
                  <div className="lbh" style={{justifyContent:"center"}}>EFF%</div>
                </div>
                {analyticsData.partnerships.slice(0,10).map((p,i)=>{
                  const mp=p.w+p.l;
                  const pct=Math.round(p.w/mp*100);
                  const last5=(p.results||[]).slice(-5);
                  const medal=i===0?"\uD83E\uDD47":i===1?"\uD83E\uDD48":i===2?"\uD83E\uDD49":null;
                  return (
                    <div key={i} className="lbrow" style={{gridTemplateColumns:"36px 1fr 28px 28px 28px 38px",cursor:"default"}}>
                      <div className={`lbrank ${i<3?"medal":"num"}`} style={{color:i===0?"#facc15":i===1?"#94a3b8":i===2?"#c97b2e":"#9090a4"}}>
                        {medal || (i+1)}
                      </div>
                      {/* S079: player A avatar | pair name + last5 | player B avatar.
                          Avatars are clickable to drill into each player individually. */}
                      <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                        <button
                          onClick={()=>setSp(p.a)}
                          className="lbavi"
                          style={{width:24,height:24,fontSize:11,flexShrink:0,padding:0,cursor:"pointer"}}
                          title={`Open ${getName(p.a)}'s profile`}
                        >
                          {getAvatar(p.a)
                            ? <img src={getAvatar(p.a)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            : (getName(p.a)[0]||"?").toUpperCase()}
                        </button>
                        <div className="lbpinfo" style={{alignItems:"flex-start",textAlign:"left",gap:4,minWidth:0,flex:1}}>
                          <button
                            onClick={()=>setSp(p.a)}
                            className="lbn"
                            style={{background:"transparent",border:"none",padding:0,cursor:"pointer",color:"inherit",textAlign:"left",display:"block",width:"100%"}}
                            title={`Open ${getName(p.a)}'s profile`}
                          >
                            {shortName(getName(p.a))} <span style={{color:"#9090a4",fontWeight:400}}>/</span> {shortName(getName(p.b))}
                          </button>
                          {last5.length>0 && (
                            <div className="form-dots" style={{justifyContent:"flex-start"}}>
                              {last5.map((r,j)=><div key={j} className={`fdot ${r==="W"?"w":"l"}`}/>)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={()=>setSp(p.b)}
                          className="lbavi"
                          style={{width:24,height:24,fontSize:11,flexShrink:0,padding:0,cursor:"pointer"}}
                          title={`Open ${getName(p.b)}'s profile`}
                        >
                          {getAvatar(p.b)
                            ? <img src={getAvatar(p.b)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            : (getName(p.b)[0]||"?").toUpperCase()}
                        </button>
                      </div>
                      <div className="lbc" style={{justifyContent:"center"}}>{mp}</div>
                      <div className="lbc w" style={{justifyContent:"center",color:p.w>0?"var(--win)":"#9090a4"}}>{p.w}</div>
                      <div className="lbc l" style={{justifyContent:"center",color:p.l>0?"var(--loss)":"#9090a4"}}>{p.l>0?p.l:"–"}</div>
                      <div className={`lbc ${pct>=50?"hi":"lo"}`} style={{justifyContent:"center"}}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>}

          {/* H2H (Q9=A native select kept; refinement deferred) */}
          {analyticsSection==="opponent"&&<>
            <div className="h2h-sel-grid">
              <div>
                <label className="h2h-sel-l">Player 1</label>
                <select className="h2h-sel" value={h2hP1||""} onChange={e=>setH2hP1(e.target.value||null)}>
                  <option value="">Select player</option>
                  {players.map(p=><option key={p.id} value={p.id}>{(p.nickname||p.name)+(elo?` (${Math.round(elo[p.id]||1500)})`:"")}</option>)}
                </select>
              </div>
              <div>
                <label className="h2h-sel-l">Player 2</label>
                <select className="h2h-sel" value={h2hP2||""} onChange={e=>setH2hP2(e.target.value||null)}>
                  <option value="">Select player</option>
                  {players.filter(p=>p.id!==h2hP1).map(p=><option key={p.id} value={p.id}>{(p.nickname||p.name)+(elo?` (${Math.round(elo[p.id]||1500)})`:"")}</option>)}
                </select>
              </div>
            </div>

            {h2hP1&&h2hP2?(()=>{
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
                <div className="h2h-empty">
                  <div className="h2h-empty-icon"><Icon name="swords" size={34} color="var(--muted)"/></div>
                  <div className="h2h-empty-title">No matches found between these two players yet</div>
                  <div>Play a match together or against each other to see your rivalry stats</div>
                </div>
              );
              return (<>
                <div className="h2h-hero">
                  <div className="h2h-row">
                    <div className="h2h-avi">{p1?.avatar_url?<img src={p1.avatar_url} alt=""/>:(p1?.name||"?")[0]}</div>
                    <div className="h2h-score">{p1W} - {p2W}</div>
                    <div className="h2h-avi">{p2?.avatar_url?<img src={p2.avatar_url} alt=""/>:(p2?.name||"?")[0]}</div>
                  </div>
                  <div className="h2h-bar-bg"><div className="h2h-bar-f" style={{width:`${h2hM.length>0?(p1W/h2hM.length)*100:50}%`}}/></div>
                  <div className="h2h-meta">All-time record · {h2hM.length} matches</div>
                </div>

                <div className="h2h-split">
                  <div className="h2h-tile">
                    <div className="h2h-tile-l">As Partners</div>
                    {partM.length>0?(<>
                      <div className="h2h-tile-sub">{partM.length} match{partM.length===1?"":"es"} together</div>
                      <div className="h2h-tile-v"><span className="w">{pW}W</span><span className="m"> - </span><span className={pL>0?"l":""}>{pL}L</span></div>
                    </>):<div className="h2h-tile-sub">No matches</div>}
                  </div>
                  <div className="h2h-tile">
                    <div className="h2h-tile-l">As Opponents</div>
                    {oppM.length>0?(<>
                      <div className="h2h-tile-sub">{oppM.length} match{oppM.length===1?"":"es"} against</div>
                      <div className="h2h-tile-v">
                        <div><span className="w">{getName(h2hP1)}</span> won <span className="w" style={{fontFamily:"var(--mono)"}}>{p1W}</span></div>
                        <div><span className={p2W>0?"w":"m"}>{getName(h2hP2)}</span> won <span className={p2W>0?"w":"m"} style={{fontFamily:"var(--mono)"}}>{p2W}</span></div>
                      </div>
                    </>):<div className="h2h-tile-sub">No matches</div>}
                  </div>
                </div>

                {h2hM.length>0&&<section className="dpro-sec" style={{padding:0}}>
                  <h3 className="dpro-sectitle">Last 5 Encounters</h3>
                  <div>
                    {h2hM.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(m=>{
                      const w=win(m.sets);
                      const p1Won=(m.team_a.includes(h2hP1)&&w==="A")||(m.team_b.includes(h2hP1)&&w==="B");
                      return (
                        <div key={m.id} className="enc-row">
                          <div className="enc-top">
                            <span className={`enc-result ${p1Won?"win":"loss"}`}>{p1Won?"\u2713 "+getName(h2hP1)+" won":"\u2717 "+getName(h2hP2)+" won"}</span>
                            <span className="enc-date">{formatDate(m.date)}</span>
                          </div>
                          <div className="enc-sets">
                            {m.sets.map((s,i)=>{const isA=m.team_a.includes(h2hP1);const pWon=isA?s[0]>s[1]:s[1]>s[0];return <span key={i} className={pWon?"w":"l"}>{s[0]}-{s[1]}</span>;})}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>}
              </>);
            })():<div className="h2h-empty">Select two players to compare their head-to-head record</div>}
          </>}

          {/* INSIGHTS — Q10 hybrid: cut Biggest Wins, add Longest Win + Loss Streaks */}
          {analyticsSection==="insights"&&<>
            <div className="an-tile-grid">
              <div className="an-tile">
                <div className="an-tile-l">MOTM Awards</div>
                <div className="an-tile-v gold">{analyticsData.topMotm.reduce((s,x)=>s+x.count,0)}</div>
                <div className="an-tile-sub">across all players</div>
              </div>
              <div className="an-tile">
                <div className="an-tile-l">Closest Matches</div>
                <div className="an-tile-v">{analyticsData.closeMatches}</div>
                <div className="an-tile-sub">decided by 1 game</div>
              </div>
            </div>

            {/* S079: rows clickable to drill into player profile. */}
            {analyticsData.topMotm.length>0&&<section className="dpro-sec" style={{padding:0}}>
              <h3 className="dpro-sectitle gold" style={{display:"flex",alignItems:"center",gap:6}}><Icon name="star" size={14} color="var(--gold)"/>MOTM Ranking</h3>
              <div className="dpro-sec-card">
                {analyticsData.topMotm.map((x,i)=>(
                  <div key={x.pid} className="lrow" onClick={()=>setSp(x.pid)} style={{cursor:"pointer"}} role="button" tabIndex={0} aria-label={`Open ${getName(x.pid)}'s profile`}>
                    <div className="lrow-l">
                      <span className="lrow-rank">{i+1}.</span>
                      <div className="lrow-avi gold">{getAvatar(x.pid)?<img src={getAvatar(x.pid)} alt=""/>:getName(x.pid)[0]}</div>
                      <span className="lrow-name">{getName(x.pid)}</span>
                    </div>
                    <span className="lrow-gold" style={{display:"inline-flex",alignItems:"center",gap:3}}>{x.count}× <Icon name="star" size={11} color="var(--gold)"/></span>
                  </div>
                ))}
              </div>
            </section>}

            {analyticsData.longestWinStreaks.length>0&&<section className="dpro-sec" style={{padding:0}}>
              <h3 className="dpro-sectitle">Longest Winning Streak</h3>
              <div className="dpro-sec-card">
                {analyticsData.longestWinStreaks.map((x,i)=>(
                  <div key={x.pid} className="lrow" onClick={()=>setSp(x.pid)} style={{cursor:"pointer"}} role="button" tabIndex={0} aria-label={`Open ${getName(x.pid)}'s profile`}>
                    <div className="lrow-l">
                      <span className="lrow-rank">{i+1}.</span>
                      <div className="lrow-avi">{getAvatar(x.pid)?<img src={getAvatar(x.pid)} alt=""/>:getName(x.pid)[0]}</div>
                      <span className="lrow-name">{getName(x.pid)}</span>
                    </div>
                    <div className="streak-r"><span className="streak-v win">{x.n}</span><span className="streak-u">in a row</span></div>
                  </div>
                ))}
              </div>
            </section>}

            {analyticsData.longestLossStreaks.length>0&&<section className="dpro-sec" style={{padding:0}}>
              <h3 className="dpro-sectitle">Longest Losing Streak</h3>
              <div className="dpro-sec-card">
                {analyticsData.longestLossStreaks.map((x,i)=>(
                  <div key={x.pid} className="lrow" onClick={()=>setSp(x.pid)} style={{cursor:"pointer"}} role="button" tabIndex={0} aria-label={`Open ${getName(x.pid)}'s profile`}>
                    <div className="lrow-l">
                      <span className="lrow-rank">{i+1}.</span>
                      <div className="lrow-avi">{getAvatar(x.pid)?<img src={getAvatar(x.pid)} alt=""/>:getName(x.pid)[0]}</div>
                      <span className="lrow-name">{getName(x.pid)}</span>
                    </div>
                    <div className="streak-r"><span className="streak-v loss">{x.n}</span><span className="streak-u">in a row</span></div>
                  </div>
                ))}
              </div>
            </section>}
          </>}
        </div>
      ) : subTab==="analytics" ? (
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{marginBottom:12,display:"flex",justifyContent:"center"}}><Icon name="bar-chart" size={56} color="var(--muted)" strokeWidth={1.5}/></div>
          <div style={{fontSize:15,fontWeight:600,color:TX,marginBottom:6}}>No analytics yet</div>
          <div style={{fontSize:12,color:MT}}>Play some matches to see league analytics.</div>
        </div>
      ) : null}

      {subTab==="roster" && (() => {
        // B1: scope the grid to the selected season's roster. Empty/absent roster
        // set = no restriction (mirrors the Ranking seasonLb semantics).
        const rosterSet = rosterSeason==="all" ? null : seasonRosters?.[rosterSeason];
        const rosterScoped = (!rosterSet || rosterSet.size===0) ? players : players.filter(p=>rosterSet.has(p.id));
        const rosterSeasonObj = (seasons||[]).find(s=>s.id===rosterSeason);
        // Search filter: simple displayed-name startsWith only.
        // Typing "a" matches only players whose displayed name starts with "a"
        // (NOT players with "a" anywhere in the name). Per user: same behavior
        // applies in every search bar in the app.
        const searchFiltered = q==="" ? rosterScoped : rosterScoped.filter(p => {
          const display = (p.nickname || p.name || "").toLowerCase();
          return display.startsWith(q.toLowerCase());
        });
        // S066 Phase 8: gender filter. Players with NULL gender are visible
        // only when filter is "all" — they don't render in Men or Women.
        const filtered = genderFilter === "all" ? searchFiltered :
          searchFiltered.filter(p => p.gender === genderFilter);
        // Counts (computed against search-filtered set so they reflect what
        // user is currently searching for) — keeps the pills meaningful when
        // search is also active.
        const counts = {
          all:    searchFiltered.length,
          male:   searchFiltered.filter(p => p.gender === "male").length,
          female: searchFiltered.filter(p => p.gender === "female").length,
        };
        return (<>
          {/* Phase 5: roster header bar with edit/add controls (admin only) */}
          <div className="rbar">
            <div className="rbar-t">Players<span className="rbar-count">({filtered.length})</span></div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {/* S066 Phase 8: sliders icon — toggles gender filter bar (visible to everyone) */}
              <button className={`fbtn${filterOpen?" on":""}`} onClick={()=>setFilterOpen(v=>!v)} aria-label="Filter by gender" title="Filter by gender">
                <Icon name="sliders" size={14} color={filterOpen?"var(--accent)":"var(--muted)"}/>
              </button>
              {isAdmin && <>
                <button className={`gbtn${editMode?" on":""}`} onClick={()=>{setEditMode(!editMode);setEditPid(null);setConfirmDel(null);setShowAddPlayer(false);}}>
                  <Icon name="edit" size={12}/>{editMode?"Done":"Edit"}
                </button>
                {!editMode && <button className="pbtn" onClick={()=>setShowAddPlayer(!showAddPlayer)}>
                  <Icon name="plus" size={12} color="#000" strokeWidth={2.5}/>{showAddPlayer?"Cancel":"Add"}
                </button>}
              </>}
            </div>
          </div>

          {/* B2: season roster filter — defaults to the active season, with an
              "All league players" escape hatch. Green when an active season is
              selected, muted otherwise (mirrors the LogMatch season pill). */}
          {(seasons||[]).length>0 && (
            <div style={{padding:"0 18px 10px"}}>
              <div style={{position:"relative",display:"inline-flex",alignItems:"center"}}>
                <select
                  value={rosterSeason}
                  onChange={e=>setRosterSeason(e.target.value)}
                  className="ctxchip"
                  style={{appearance:"none",WebkitAppearance:"none",cursor:"pointer",paddingRight:26,backgroundImage:"none",color:rosterSeasonObj?.active?"var(--accent)":"#9090a4",fontWeight:rosterSeasonObj?.active?700:400}}
                >
                  {seasons.map(s=>(
                    <option key={s.id} value={s.id} style={{color:"#fff"}}>{s.name}{s.active?" • active":" • ended"}</option>
                  ))}
                  <option value="all" style={{color:"#fff"}}>All league players</option>
                </select>
                <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%) rotate(90deg)",pointerEvents:"none",display:"flex"}}>
                  <Icon name="chevron" size={12} color={rosterSeasonObj?.active?"var(--accent)":"#9090a4"}/>
                </span>
              </div>
            </div>
          )}

          {/* Phase 5: search input */}
          <div className="srchw">
            <div className="srchi"><Icon name="search" size={15}/></div>
            <input className="srch" placeholder="Search players…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>

          {/* S066 Phase 8: gender filter bar — small/subtle pills below search.
              Spec: only visible when sliders icon is toggled on. Auto-width pills
              with gender symbols. Active state colors: All/Men = accent green,
              Women = pink (#f472b6). NO count badges. Inline "{N} results" when
              filter is not "all". Fade-in animation on reveal. */}
          {filterOpen && (
            <div className="gfilter-bar">
              {[
                {id:"all",    label:"All",      activeCls:"fa"},
                {id:"male",   label:"Men ♂",    activeCls:"fm"},
                {id:"female", label:"Women ♀",  activeCls:"ff"},
              ].map(f=>(
                <button key={f.id}
                  className={`gfpill${genderFilter===f.id?" "+f.activeCls:""}`}
                  onClick={()=>setGenderFilter(f.id)}>
                  {f.label}
                </button>
              ))}
              {genderFilter!=="all" && (
                <span className="gfilter-count">{filtered.length} result{filtered.length!==1?"s":""}</span>
              )}
            </div>
          )}

          {/* Add Player form preserved verbatim (S046 admin path) */}
          {showAddPlayer&&!editMode&&<div style={{margin:"0 18px 12px",background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14}}>
            <input placeholder="Name *" value={newName} onChange={e=>setNewName(e.target.value)} style={{...inp,marginBottom:8}}/>
            <input placeholder="Nickname" value={newNick} onChange={e=>setNewNick(e.target.value)} style={{...inp,marginBottom:8}}/>
            <button onClick={addPlayer} style={{width:"100%",padding:10,borderRadius:10,border:"none",background:A,color:BG,fontSize:13,fontWeight:700,cursor:"pointer"}}>Add Player</button>
          </div>}

          {/* Phase 5: hybrid 2-col grid of .prow cards (Q1=C, Q2=A W-L shown, Q3=A circle avatar) */}
          <div className="plist">
            {filtered.length===0 && (q || genderFilter!=="all") && (
              <div className="plist-empty">
                {q && genderFilter!=="all" ? `No ${genderFilter==="male"?"men":"women"} matching "${q}"` :
                 q ? `No players matching "${q}"` :
                 `No ${genderFilter==="male"?"men":"women"} in this league yet`}
              </div>
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
                <div key={p.id} className={"prow"+(isMe?" me":"")} onClick={()=>{if(!editMode)setSp(p.id);}} style={editMode?{cursor:"default"}:undefined}>
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
                        <span className="prec2"><span className={wl.w>0?"w":"z"}>{wl.w}W</span><span className={wl.l>0?"l":"z"}>{wl.l}L</span></span>
                      </>}
                    </div>
                  </div>
                  {editMode ? (
                    <div className="padmin" onClick={e=>e.stopPropagation()}>
                      <button title="Edit" onClick={()=>startEdit(p)}><Icon name="edit" size={14}/></button>
                      {isAdmin && (confirmDel===p.id ? (
                        <div className="yn">
                          <button className="y" onClick={()=>{deletePlayer(p.id);setConfirmDel(null);}}>Yes</button>
                          <button className="n" onClick={()=>setConfirmDel(null)}>No</button>
                        </div>
                      ) : (
                        <button title="Delete" onClick={()=>setConfirmDel(p.id)}><Icon name="trash" size={14} color="var(--danger)"/></button>
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
