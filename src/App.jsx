import React, { useState, useMemo, useEffect } from "react";

const A="#4ADE80",BG="#0a0a0f",CD="#12121a",CD2="#1a1a26",BD="#2a2a3a",TX="#e4e4ef",MT="#7a7a8e",DG="#f87171",GD="#FFD700",SV="#C0C0C0",BZ="#CD7F32",BL="#4da6ff",PU="#a855f7";

const INIT_P=[{id:"p1",name:"Mohammed",nickname:"Moody"},{id:"p2",name:"Basel",nickname:null},{id:"p3",name:"Jawad",nickname:null},{id:"p4",name:"Saleh",nickname:null},{id:"p5",name:"Hamza",nickname:null},{id:"p6",name:"Hani",nickname:null},{id:"p7",name:"Barhoum",nickname:null},{id:"p8",name:"MAK",nickname:null},{id:"p9",name:"Luke",nickname:null},{id:"p10",name:"Aboody",nickname:null},{id:"p11",name:"Husain",nickname:null}];

const INIT_M=[];

const INIT_SEASONS=[{id:"s1",name:"Season 1",startDate:"2026-03-17",endDate:null,active:true}];

function win(sets){let a=0,b=0;sets.forEach(([x,y])=>{if(x>y)a++;else b++;});return a>b?"A":"B";}
function gid(){return"id_"+Math.random().toString(36).substr(2,9);}
const K=40,ES=1500;
function calcElo(pl,ma){const r={};pl.forEach(p=>{r[p.id]=ES;});[...ma].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(m=>{const w=win(m.sets);const aA=((r[m.teamA[0]]||ES)+(r[m.teamA[1]]||ES))/2;const aB=((r[m.teamB[0]]||ES)+(r[m.teamB[1]]||ES))/2;const eA=1/(1+Math.pow(10,(aB-aA)/400));const sA=w==="A"?1:0;m.teamA.forEach(p=>{if(r[p]!==undefined)r[p]+=Math.round(K*(sA-eA));});m.teamB.forEach(p=>{if(r[p]!==undefined)r[p]+=Math.round(K*((1-sA)-(1-eA)));});});return r;}

const ACHS=[
{id:"w1",icon:"🌟",name:"First Blood",desc:"Win first match",ck:s=>s.wins>=1},
{id:"s3",icon:"🔥",name:"Hot Streak",desc:"3 consecutive wins",ck:s=>{let m=0,c=0;s.streak.forEach(r=>{if(r==="W"){c++;m=Math.max(m,c);}else c=0;});return m>=3;}},
{id:"s5",icon:"💥",name:"Unstoppable",desc:"5 consecutive wins",ck:s=>{let m=0,c=0;s.streak.forEach(r=>{if(r==="W"){c++;m=Math.max(m,c);}else c=0;});return m>=5;}},
{id:"m3",icon:"⭐",name:"MVP Machine",desc:"3+ MOTM awards",ck:s=>s.motm>=3},
{id:"m5",icon:"🏅",name:"Living Legend",desc:"5+ MOTM awards",ck:s=>s.motm>=5},
{id:"cb",icon:"💪",name:"Comeback King",desc:"Win after losing set 1",ck:s=>s.comebacks>=1},
{id:"sh",icon:"🎯",name:"Sharpshooter",desc:"70%+ win rate (5+ games)",ck:s=>s.games>=5&&(s.wins/s.games)>=0.7},
{id:"t1",icon:"🔟",name:"Centurion",desc:"Play 10+ matches",ck:s=>s.games>=10},
{id:"t2",icon:"👑",name:"Veteran",desc:"Play 20+ matches",ck:s=>s.games>=20},
{id:"iw",icon:"🛡️",name:"Iron Wall",desc:"Positive game diff (5+ games)",ck:s=>s.games>=5&&(s.gamesWon-s.gamesLost)>0},
];

const RULES=[
{title:"Scoring",content:"Best of 3 sets. Tennis scoring: 15, 30, 40, deuce. Tiebreak at 6-6 (first to 7, win by 2). Agree on Golden Point vs Advantage before match."},
{title:"The Serve",content:"Underhand, bounce first, struck at/below waist. Diagonally into opposite box. Two attempts. Ball may hit glass after bounce (rally continues), but fence = fault."},
{title:"Return of Serve",content:"Must bounce first. You cannot volley the return — instant loss of point."},
{title:"Walls & Fences",content:"During rallies, ball can bounce off glass walls. Must always bounce on ground before hitting a wall on your side."},
{title:"Playing Outside Court",content:"Ball goes over back wall or through door after bouncing? You may leave the court to play it back before second bounce."},
{title:"Net Touch",content:"Touch net with racket, body, or clothing = lose point. No exceptions."},
{title:"Switching Sides",content:"Change ends after every odd game (1-0, 2-1, etc.). Max 90 seconds rest."},
];

const ARGUED=[
{q:"Serve hits net → bounces in box → goes out door?",a:"With out-of-court play: LET (replay). Without: FAULT. Agree before match."},
{q:"Ball hits fence (mesh) after serve bounce?",a:"FAULT. On serve, after bounce: glass = play on, fence = fault. Strictest rule in padel."},
{q:"Golden Point or Advantage at deuce?",a:"No universal default. WPT uses Golden Point. FIP uses advantage. MUST agree before match. Can't change mid-set."},
{q:"Opponent wasn't ready when I served?",a:"LET if they didn't attempt return. If they attempted return, can't claim 'not ready'."},
{q:"Ball bounces my side → hits glass → goes over net to opponent?",a:"YOUR point. Ball crossing back over after your wall = you win."},
{q:"Can I reach over the net?",a:"NO. Racket may cross net only on follow-through AFTER contact on your side."},
{q:"Ball hits my body during rally?",a:"You LOSE the point. Must only be struck with racket."},
{q:"Who serves first in tiebreak?",a:"Player whose turn it is serves 1 point, then each player serves 2 consecutive. Change ends every 6 points."},
];

const SK="padel-battle-v4";
function load(){try{const r=localStorage.getItem(SK);if(r)return JSON.parse(r);}catch(e){}return null;}
function save(d){try{localStorage.setItem(SK,JSON.stringify(d));}catch(e){}}

// ── Americano schedule generator ──
function generateAmericanoSchedule(playerIds, courts) {
  const n = playerIds.length;
  const rounds = [];
  const pids = [...playerIds];
  const totalRounds = n - 1 + (n % 2 === 1 ? 1 : 0);
  const hasBye = n % 2 === 1;
  if (hasBye) pids.push("BYE");
  const fixed = pids[0];
  const rotating = pids.slice(1);
  for (let r = 0; r < totalRounds; r++) {
    const current = [fixed, ...rotating];
    const matches = [];
    const half = current.length / 2;
    const pairs = [];
    for (let i = 0; i < half; i++) {
      pairs.push([current[i], current[current.length - 1 - i]]);
    }
    const validPairs = pairs.filter(p => !p.includes("BYE"));
    const sitting = pairs.find(p => p.includes("BYE"));
    const sittingPlayer = sitting ? sitting.find(x => x !== "BYE") : null;
    for (let i = 0; i < validPairs.length; i += 2) {
      if (i + 1 < validPairs.length) {
        matches.push({ teamA: validPairs[i], teamB: validPairs[i + 1], court: (matches.length % courts) + 1 });
      }
    }
    rounds.push({ round: r + 1, matches, sitting: sittingPlayer });
    rotating.push(rotating.shift());
  }
  return rounds;
}

const CourtIcon = () => (<svg width="16" height="20" viewBox="0 0 24 30" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="24" rx="1"/><line x1="12" y1="3" x2="12" y2="27"/><line x1="2" y1="15" x2="22" y2="15"/><rect x="8" y="3" width="8" height="5" rx="0" fill="none"/><rect x="8" y="22" width="8" height="5" rx="0" fill="none"/></svg>);
const PadelLogo = () => (<div style={{width:42,height:42,borderRadius:12,background:`${A}12`,display:"flex",alignItems:"center",justifyContent:"center"}}>
  <svg width="28" height="28" viewBox="0 0 50 50" fill="none">
    <rect x="14" y="2" width="18" height="28" rx="9" stroke={A} strokeWidth="2.5"/>
    <circle cx="20" cy="12" r="1.5" fill={A} opacity="0.5"/><circle cx="26" cy="12" r="1.5" fill={A} opacity="0.5"/>
    <circle cx="20" cy="18" r="1.5" fill={A} opacity="0.5"/><circle cx="26" cy="18" r="1.5" fill={A} opacity="0.5"/>
    <circle cx="23" cy="15" r="1.5" fill={A} opacity="0.5"/>
    <rect x="20" y="30" width="6" height="14" rx="3" stroke={A} strokeWidth="2.5" fill="none"/>
    <circle cx="39" cy="10" r="7" stroke={A} strokeWidth="2" fill={`${A}15`}/>
    <path d="M34.5 5.5 Q39 10 43.5 5.5" stroke={A} strokeWidth="1.2" fill="none"/>
  </svg>
</div>);
const TL=[{key:"board",label:"Leaderboard",icon:"🏆"},{key:"history",label:"Matches",icon:"court"},{key:"combos",label:"Combos",icon:"🤝"}];
const TR=[{key:"stats",label:"Players",icon:"📊"},{key:"gamemode",label:"Game Mode",icon:"⚡"},{key:"rules",label:"Rules",icon:"📖"}];

export default function App(){
  const[players,setPlayers]=useState(INIT_P);
  const[matches,setMatches]=useState(INIT_M);
  const[seasons,setSeasons]=useState(INIT_SEASONS);
  const[curSeason,setCurSeason]=useState("s1");
  const[tab,setTab]=useState("board");
  const[prevTab,setPrevTab]=useState("board");
  const[selectedPlayer,setSP]=useState(null);
  const[editingMatch,setEM]=useState(null);
  const[loaded,setLoaded]=useState(false);
  const[rankBy,setRankBy]=useState("winpct");
  const[showAddP,setShowAddP]=useState(false);
  const[nn,setNN]=useState("");const[nk,setNK]=useState("");
  // Americano state
  const[amTournament,setAmT]=useState(null);

  useEffect(()=>{const d=load();if(d){if(d.players)setPlayers(d.players);if(d.matches)setMatches(d.matches);if(d.seasons)setSeasons(d.seasons);if(d.curSeason)setCurSeason(d.curSeason);if(d.amTournament)setAmT(d.amTournament);}setLoaded(true);},[]);
  useEffect(()=>{if(loaded)save({players,matches,seasons,curSeason,amTournament});},[players,matches,seasons,curSeason,amTournament,loaded]);

  const goTab=t=>{setPrevTab(tab);setTab(t);};
  const activeSeason=seasons.find(s=>s.id===curSeason);
  const fm=useMemo(()=>{
    if(curSeason==="all") return matches;
    return matches.filter(m=>m.season===curSeason);
  },[matches,curSeason]);

  const pm=useMemo(()=>{const m={};players.forEach(p=>{m[p.id]=p;});return m;},[players]);
  const elo=useMemo(()=>calcElo(players,fm),[players,fm]);
  const getName=pid=>pm[pid]?.nickname||pm[pid]?.name||"?";

  const ps=useMemo(()=>{
    const s={};players.forEach(p=>{s[p.id]={wins:0,losses:0,games:0,motm:0,streak:[],partners:{},gamesWon:0,gamesLost:0,comebacks:0,comebackChances:0};});
    [...fm].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(m=>{
      const w=win(m.sets);const wt=w==="A"?m.teamA:m.teamB;const lt=w==="A"?m.teamB:m.teamA;
      const ls1=w==="A"?(m.sets[0][0]<m.sets[0][1]):(m.sets[0][1]<m.sets[0][0]);const t3=m.sets.length>=3;
      wt.forEach(pid=>{if(!s[pid])return;s[pid].wins++;s[pid].games++;s[pid].streak.push("W");
        let gw=0,gl=0;m.sets.forEach(([a,b])=>{if(w==="A"){gw+=a;gl+=b;}else{gw+=b;gl+=a;}});s[pid].gamesWon+=gw;s[pid].gamesLost+=gl;
        if(ls1&&t3){s[pid].comebacks++;s[pid].comebackChances++;}
        const pr=wt.find(x=>x!==pid);if(pr){if(!s[pid].partners[pr])s[pid].partners[pr]={w:0,l:0};s[pid].partners[pr].w++;}});
      lt.forEach(pid=>{if(!s[pid])return;s[pid].losses++;s[pid].games++;s[pid].streak.push("L");
        let gw=0,gl=0;m.sets.forEach(([a,b])=>{if(w==="A"){gw+=b;gl+=a;}else{gw+=a;gl+=b;}});s[pid].gamesWon+=gw;s[pid].gamesLost+=gl;
        if(!ls1&&t3)s[pid].comebackChances++;
        const pr=lt.find(x=>x!==pid);if(pr){if(!s[pid].partners[pr])s[pid].partners[pr]={w:0,l:0};s[pid].partners[pr].l++;}});
      if(m.motm&&s[m.motm])s[m.motm].motm++;
    });return s;
  },[players,fm]);

  const getStreak=pid=>{const st=ps[pid]?.streak||[];if(!st.length)return"—";let c=1;const l=st[st.length-1];for(let i=st.length-2;i>=0;i--){if(st[i]===l)c++;else break;}return`${c}${l}`;};
  const getForm=pid=>(ps[pid]?.streak||[]).slice(-5);

  const lb=useMemo(()=>players.map(p=>{const s=ps[p.id];return{...p,...s,elo:elo[p.id]||ES,winPct:s.games>0?(s.wins/s.games*100):0,gamesDiff:s.gamesWon-s.gamesLost,qualified:s.games>=3};})
    .sort((a,b)=>{if(a.qualified&&!b.qualified)return-1;if(!a.qualified&&b.qualified)return 1;if(rankBy==="elo")return b.elo-a.elo;return b.winPct!==a.winPct?b.winPct-a.winPct:b.wins-a.wins;}),[players,ps,elo,rankBy]);

  const combos=useMemo(()=>{const p={};fm.forEach(m=>{const w=win(m.sets);[[m.teamA,w==="A"],[m.teamB,w==="B"]].forEach(([t,wn])=>{const k=[...t].sort().join("-");if(!p[k])p[k]={players:[...t].sort(),w:0,l:0,games:0};p[k].games++;if(wn)p[k].w++;else p[k].l++;});});return Object.values(p).sort((a,b)=>(b.games>0?b.w/b.games:0)-(a.games>0?a.w/a.games:0));},[fm]);

  function shareMatch(m){const w=win(m.sets);const wt=w==="A"?m.teamA:m.teamB;const lt=w==="A"?m.teamB:m.teamA;const sc=m.sets.map(([a,b])=>`${a}-${b}`).join(" | ");const d=new Date(m.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});const msg=`🎾 PADEL BATTLE 🎾\n📅 ${d}\n\n✅ ${getName(wt[0])} x ${getName(wt[1])}\n❌ ${getName(lt[0])} x ${getName(lt[1])}\n\n📊 Score: ${sc}${m.motm?`\n⭐ MOTM: ${getName(m.motm)}`:""}`;if(navigator.share){navigator.share({text:msg}).catch(()=>{});}else{navigator.clipboard.writeText(msg).then(()=>alert("Copied to clipboard!")).catch(()=>{});}}

  function startNewSeason(name){const id=gid();setSeasons([...seasons.map(s=>({...s,active:false,endDate:s.active?new Date().toISOString().split("T")[0]:s.endDate})),{id,name,startDate:new Date().toISOString().split("T")[0],endDate:null,active:true}]);setCurSeason(id);}
  function endCurrentSeason(){setSeasons(seasons.map(s=>s.id===curSeason?{...s,active:false,endDate:new Date().toISOString().split("T")[0]}:s));}
  function deleteSeason(sid){if(seasons.length<=1)return;setMatches(matches.filter(m=>m.season!==sid));setSeasons(seasons.filter(s=>s.id!==sid));if(curSeason===sid){const remaining=seasons.filter(s=>s.id!==sid);setCurSeason(remaining[remaining.length-1]?.id||"s1");}}

  const seasonChampion=sid=>{const sm=matches.filter(m=>m.season===sid);if(!sm.length)return null;const w={};sm.forEach(m=>{const wn=win(m.sets);(wn==="A"?m.teamA:m.teamB).forEach(p=>{w[p]=(w[p]||0)+1;});});const top=Object.entries(w).sort((a,b)=>b[1]-a[1])[0];return top?{pid:top[0],wins:top[1]}:null;};

  const rc=[GD,SV,BZ];
  const sel={background:CD2,color:TX,border:`1px solid ${BD}`,borderRadius:10,padding:"10px 12px",fontSize:14,width:"100%",outline:"none",appearance:"none",fontWeight:500};
  const lbl={fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6};
  const SeasonTog = () => (<div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
    <button onClick={()=>setCurSeason("all")} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${curSeason==="all"?A:BD}`,background:curSeason==="all"?`${A}15`:"transparent",color:curSeason==="all"?A:MT,fontSize:10,fontWeight:600,cursor:"pointer"}}>All Time</button>
    {seasons.map(s=>(<button key={s.id} onClick={()=>setCurSeason(s.id)} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${curSeason===s.id?PU:BD}`,background:curSeason===s.id?`${PU}15`:"transparent",color:curSeason===s.id?PU:MT,fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>{s.active&&<span style={{width:5,height:5,borderRadius:"50%",background:A}}/>}{s.name}</button>))}
  </div>);

  const css=`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{background:${BG};color:${TX};font-family:'Outfit',sans-serif;-webkit-font-smoothing:antialiased}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${BG}}::-webkit-scrollbar-thumb{background:${BD};border-radius:3px}input,select{font-family:'Outfit',sans-serif}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp .4s ease both}`;

  return (
    <div style={{minHeight:"100vh",background:BG,paddingBottom:85}}>
      <style>{css}</style>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${CD} 0%,${BG} 100%)`,borderBottom:`1px solid ${BD}`,padding:"16px 16px 12px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:120,height:120,borderRadius:"50%",background:`${A}08`,filter:"blur(30px)"}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <PadelLogo/>
            <div>
              <h1 style={{fontSize:20,fontWeight:800,letterSpacing:"-0.5px",lineHeight:1.1}}>PADEL <span style={{color:A}}>BATTLE</span></h1>
              <p style={{fontSize:10,color:MT,fontWeight:500,letterSpacing:2,textTransform:"uppercase",marginTop:1}}>Squad Rankings</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:"12px 12px 0"}}>
        {/* LEADERBOARD */}
        {tab==="board"&&<div className="fu">
          {/* Filter bar */}
          <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
            {[["winpct","Win %"],["elo","ELO"]].map(([k,l])=>(
              <button key={k} onClick={()=>setRankBy(k)} style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${rankBy===k?BL:BD}`,background:rankBy===k?`${BL}15`:"transparent",color:rankBy===k?BL:MT,fontSize:10,fontWeight:600,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
            <button onClick={()=>setCurSeason("all")} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${curSeason==="all"?A:BD}`,background:curSeason==="all"?`${A}15`:"transparent",color:curSeason==="all"?A:MT,fontSize:10,fontWeight:600,cursor:"pointer"}}>All Time</button>
            {seasons.map(s => (
              <button key={s.id} onClick={()=>setCurSeason(s.id)} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${curSeason===s.id?PU:BD}`,background:curSeason===s.id?`${PU}15`:"transparent",color:curSeason===s.id?PU:MT,fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
                {s.active&&<span style={{width:5,height:5,borderRadius:"50%",background:A}}/>}{s.name}
              </button>
            ))}
            <button onClick={()=>{const name=`Season ${seasons.length+1}`;startNewSeason(name);}} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${PU}40`,background:"transparent",color:PU,fontSize:10,fontWeight:600,cursor:"pointer"}}>+ New</button>
            {curSeason!=="all"&&activeSeason?.active&&<button onClick={()=>{if(confirm("End current season?"))endCurrentSeason();}} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${DG}40`,background:"transparent",color:DG,fontSize:10,fontWeight:600,cursor:"pointer"}}>End</button>}
            {curSeason!=="all"&&seasons.length>1&&<button onClick={()=>{if(confirm(`Delete "${seasons.find(s=>s.id===curSeason)?.name}" and all its matches?`))deleteSeason(curSeason);}} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${DG}40`,background:"transparent",color:DG,fontSize:10,fontWeight:600,cursor:"pointer"}}>🗑️</button>}
          </div>
          {/* Podium */}
          <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:8,marginBottom:16,padding:"8px 0"}}>
            {[1,0,2].map((idx,i)=>{const p=lb[idx];if(!p)return null;const f=idx===0;const h=[130,100,80];const o=[1,0,2];
              return (<div key={p.id} className="fu" onClick={()=>{setSP(p.id);goTab("stats");}} style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",width:f?110:90,animationDelay:`${i*0.05}s`}}>
                <div style={{fontSize:f?28:22,marginBottom:4,filter:f?`drop-shadow(0 0 8px ${GD}60)`:"none"}}>{["🥇","🥈","🥉"][idx]}</div>
                <div style={{width:f?52:44,height:f?52:44,borderRadius:"50%",background:`linear-gradient(135deg,${rc[idx]}30,${rc[idx]}10)`,border:`2px solid ${rc[idx]}60`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:f?20:16,fontWeight:800,color:rc[idx],marginBottom:6}}>{p.name[0]}</div>
                <span style={{fontSize:13,fontWeight:700,color:TX,textAlign:"center"}}>{p.nickname||p.name}</span>
                <span style={{fontSize:20,fontWeight:900,color:rc[idx],fontFamily:"'JetBrains Mono'"}}>{rankBy==="elo"?p.elo:`${p.winPct.toFixed(0)}%`}</span>
                <div style={{width:"100%",height:h[o[i]],marginTop:6,background:`linear-gradient(180deg,${rc[idx]}20,${rc[idx]}05)`,borderRadius:"10px 10px 0 0",border:`1px solid ${rc[idx]}25`,borderBottom:"none",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:4}}>
                  <span style={{fontSize:14,fontWeight:700}}><span style={{color:A}}>{p.wins}W</span> <span style={{color:MT}}>-</span> <span style={{color:DG}}>{p.losses}L</span></span>
                  <span style={{fontSize:11,color:MT}}>GD: <span style={{color:p.gamesDiff>=0?A:DG,fontFamily:"'JetBrains Mono'",fontWeight:600}}>{p.gamesDiff>0?"+":""}{p.gamesDiff}</span></span>
                  <FD f={getForm(p.id)}/>
                </div>
              </div>);
            })}
          </div>
          {lb.slice(3).map((p,i) => (
            <div key={p.id} className="fu" onClick={()=>{setSP(p.id);goTab("stats");}} style={{display:"flex",alignItems:"center",padding:"12px 14px",marginBottom:6,background:CD,borderRadius:12,border:`1px solid ${BD}`,cursor:"pointer",animationDelay:`${(i+3)*0.05}s`}}>
              <span style={{fontSize:16,fontWeight:800,color:TX,width:28,fontFamily:"'JetBrains Mono'"}}>{i+4}</span>
              <div style={{width:36,height:36,borderRadius:"50%",background:`${A}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:A,marginRight:10}}>{p.name[0]}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:600}}>{p.nickname||p.name}</span><FD f={getForm(p.id)}/></div>
                <div style={{fontSize:13,fontWeight:600,marginTop:2}}><span style={{color:A}}>{p.wins}W</span> <span style={{color:MT}}>-</span> <span style={{color:DG}}>{p.losses}L</span><span style={{color:MT,fontWeight:400,marginLeft:6}}>GD: <span style={{color:p.gamesDiff>=0?A:DG,fontFamily:"'JetBrains Mono'",fontWeight:600}}>{p.gamesDiff>0?"+":""}{p.gamesDiff}</span></span></div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18,fontWeight:800,color:p.qualified?A:MT,fontFamily:"'JetBrains Mono'"}}>{rankBy==="elo"?p.elo:`${p.winPct.toFixed(0)}%`}</div>
                {rankBy==="elo"&&<div style={{fontSize:10,color:MT}}>{p.winPct.toFixed(0)}% win</div>}
                {!p.qualified&&<div style={{fontSize:9,color:MT}}>min 3 games</div>}
              </div>
            </div>
          ))}
          {/* Season Trophy Room */}
          {seasons.filter(s=>!s.active).length>0&&<div style={{marginTop:16}}>
            <h3 style={{fontSize:14,fontWeight:700,color:GD,marginBottom:10}}>🏆 Hall of Champions</h3>
            {seasons.filter(s=>!s.active).map(s=>{const ch=seasonChampion(s.id);return (
              <div key={s.id} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:12,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><div style={{fontSize:13,fontWeight:700,color:PU}}>{s.name}</div><div style={{fontSize:10,color:MT}}>{s.startDate} → {s.endDate}</div></div>
                {ch&&<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:18}}>👑</span><span style={{fontSize:14,fontWeight:700,color:GD}}>{getName(ch.pid)}</span><span style={{fontSize:11,color:MT}}>{ch.wins}W</span></div>}
              </div>
            );})}
          </div>}
        </div>}

        {/* LOG MATCH */}
        {tab==="log"&&<LogMatch players={players} matches={matches} setMatches={setMatches} pm={pm} em={editingMatch} setEm={setEM} updateM={m=>{setMatches(matches.map(x=>x.id===m.id?m:x));setEM(null);}} goBack={()=>goTab(prevTab)} sel={sel} lbl={lbl} getName={getName} seasonId={curSeason==="all"?(seasons.find(s=>s.active)?.id||seasons[seasons.length-1]?.id):curSeason} seasons={seasons} setCurSeason={setCurSeason}/>}

        {/* PLAYER STATS */}
        {tab==="stats"&&<div><SeasonTog/><PlayerStats players={players} ps={ps} pm={pm} getStreak={getStreak} getForm={getForm} elo={elo} sp={selectedPlayer} setSp={setSP} fm={fm} showAP={showAddP} setShowAP={setShowAddP} nn={nn} setNN={setNN} nk={nk} setNK={setNK} addP={()=>{if(!nn.trim())return;setPlayers([...players,{id:gid(),name:nn.trim(),nickname:nk.trim()||null}]);setNN("");setNK("");setShowAddP(false);}} updatePlayer={(pid,name,nick)=>setPlayers(players.map(p=>p.id===pid?{...p,name,nickname:nick||null}:p))} deletePlayer={pid=>{setPlayers(players.filter(p=>p.id!==pid));setMatches(matches.filter(m=>!m.teamA.includes(pid)&&!m.teamB.includes(pid)));}} getName={getName} sel={sel}/></div>}

        {/* HISTORY */}
        {tab==="history"&&<div><SeasonTog/><MatchHistory matches={fm} pm={pm} players={players} onEdit={m=>{setEM(m);goTab("log");}} onDelete={mid=>setMatches(matches.filter(m=>m.id!==mid))} getName={getName} shareMatch={shareMatch} sel={sel}/></div>}

        {/* COMBOS */}
        {tab==="combos"&&<div><SeasonTog/><CombosView combos={combos} players={players} fm={fm} pm={pm} getName={getName}/></div>}

        {/* GAME MODE */}
        {tab==="gamemode"&&<GameMode players={players} getName={getName} tournament={amTournament} setTournament={setAmT} sel={sel}/>}

        {/* RULES */}
        {tab==="rules"&&<div className="fu">
          <h2 style={{fontSize:18,fontWeight:800,marginBottom:4}}>Padel Rules</h2>
          <p style={{fontSize:11,color:MT,marginBottom:16}}>Official FIP rules summary</p>
          {RULES.map((r,i) => (
            <div key={i} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
              <h3 style={{fontSize:14,fontWeight:700,color:A,marginBottom:6}}>{r.title}</h3>
              <p style={{fontSize:13,color:TX,lineHeight:1.5}}>{r.content}</p>
            </div>
          ))}
          <h2 style={{fontSize:18,fontWeight:800,marginTop:20,marginBottom:4,color:"#f97316"}}>⚡ Most Argued Calls</h2>
          <p style={{fontSize:11,color:MT,marginBottom:16}}>Settle it once and for all</p>
          {ARGUED.map((r,i) => (
            <div key={i} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
              <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:8}}>❓ {r.q}</h3>
              <p style={{fontSize:13,color:TX,lineHeight:1.5,fontWeight:500}}>{r.a}</p>
            </div>
          ))}
          <h2 style={{fontSize:18,fontWeight:800,marginTop:20,marginBottom:4,color:BL}}>📐 What is ELO Rating?</h2>
          <p style={{fontSize:11,color:MT,marginBottom:16}}>How the ranking system works</p>
          {[["The Basics","ELO is a skill-based rating from chess, now used across sports. Start at 1500. After each match, points transfer from losers to winners."],["Why ELO > Win %","Win % treats all wins equally. ELO weights opponent strength. Beating a stronger pair earns more; losing to a weaker pair costs more."],["How It's Calculated","App calculates average team ELO, predicts outcome. Upset a stronger team = big gain. Beat a weaker team = small gain. K-factor is 40."],["Reading Your Rating","1500 = average. 1600+ = strong. 1700+ = dominant. Below 1400 = room to grow. The gap predicts win probability."]].map(([t,c],i) => (
            <div key={i} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
              <h3 style={{fontSize:14,fontWeight:700,color:BL,marginBottom:6}}>{t}</h3>
              <p style={{fontSize:13,color:TX,lineHeight:1.5}}>{c}</p>
            </div>
          ))}
          <h2 style={{fontSize:18,fontWeight:800,marginTop:20,marginBottom:4,color:PU}}>⚡ Game Modes</h2>
          <p style={{fontSize:11,color:MT,marginBottom:16}}>Tournament formats for your group sessions</p>
          {[
            ["Americano","The most popular social padel format. Players rotate partners every round so everyone plays with everyone. Points are scored individually — each point your team wins gives you a personal point. After all rounds, the player with the most accumulated points wins. Typical setup: 24 or 32 points per round. Perfect for groups of 4-16 players.","How it works: Set a points-per-round target (e.g., 24). Two pairs play until all points are used — score might be 14-10. Each player gets their team's points. Partners rotate. Repeat until all combinations are played. Individual leaderboard crowns the winner."],
            ["Mexicano","A dynamic variant of Americano where pairings are determined by current standings after each round. The top-ranked player pairs with the lowest-ranked, 2nd pairs with 2nd-lowest, etc. This means as you win more, you face tougher opponents — it self-balances throughout the tournament. Scoring works the same as Americano (individual point accumulation).","Key difference from Americano: In Americano, pairings are pre-set. In Mexicano, they adapt based on live results. This creates tighter competitions because dominant players get paired against each other. The format can run indefinitely — you decide when to stop."],
          ].map(([title,desc,detail],i) => (
            <div key={i} style={{background:CD,borderRadius:12,border:`1px solid ${PU}25`,padding:14,marginBottom:8}}>
              <h3 style={{fontSize:14,fontWeight:700,color:PU,marginBottom:6}}>⚡ {title}</h3>
              <p style={{fontSize:13,color:TX,lineHeight:1.5,marginBottom:8}}>{desc}</p>
              <p style={{fontSize:12,color:MT,lineHeight:1.5,fontStyle:"italic"}}>{detail}</p>
            </div>
          ))}
        </div>}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:`${CD}f0`,backdropFilter:"blur(20px)",borderTop:`1px solid ${BD}`,display:"flex",justifyContent:"space-around",alignItems:"flex-end",padding:"4px 0 env(safe-area-inset-bottom, 6px)",zIndex:100}}>
        {TL.map(t => (
          <button key={t.key} onClick={()=>goTab(t.key)} style={{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:1,color:tab===t.key?A:MT,cursor:"pointer",padding:"5px 6px",flex:1}}>
            <span style={{fontSize:16}}>{t.icon==="court"?<CourtIcon/>:t.icon}</span><span style={{fontSize:8,fontWeight:600}}>{t.label}</span>
          </button>
        ))}
        <button onClick={()=>{setEM(null);goTab("log");}} style={{width:56,height:56,borderRadius:"50%",border:"none",background:`linear-gradient(135deg,${A},${A}cc)`,color:BG,fontSize:30,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:-20,boxShadow:`0 4px 20px ${A}40`,flexShrink:0,lineHeight:1}}>+</button>
        {TR.map(t => (
          <button key={t.key} onClick={()=>goTab(t.key)} style={{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:1,color:tab===t.key?A:MT,cursor:"pointer",padding:"5px 6px",flex:1}}>
            <span style={{fontSize:16}}>{t.icon}</span><span style={{fontSize:8,fontWeight:600}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FD({f}){if(!f||!f.length)return null; return (<div style={{display:"flex",gap:3,alignItems:"center"}}>{f.map((r,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:r==="W"?A:DG,opacity:0.5+(i/f.length)*0.5}}/>)}</div>);}

// ── LOG MATCH ──
function LogMatch({players,matches,setMatches,pm,em,setEm,updateM,goBack,sel,lbl,getName,seasonId,seasons,setCurSeason}){
  const isE=!!em;
  const[tA,setTA]=useState(["",""]);const[tB,setTB]=useState(["",""]);
  const[sets,setSets]=useState([[0,0],[0,0],[0,0]]);const[ns,setNs]=useState(2);
  const[motm,setMotm]=useState("");const[date,setDate]=useState(new Date().toISOString().split("T")[0]);
  const[saved,setSaved]=useState(false);
  useEffect(()=>{if(em){setTA([...em.teamA]);setTB([...em.teamB]);const s=[...em.sets.map(x=>[...x])];while(s.length<3)s.push([0,0]);setSets(s);setNs(em.sets.length);setMotm(em.motm||"");setDate(em.date);}},[em]);
  const all=[...tA,...tB].filter(Boolean);const avail=c=>players.filter(p=>!all.includes(p.id)||p.id===c);
  function submit(){if(tA.some(x=>!x)||tB.some(x=>!x))return;const as=sets.slice(0,ns).filter(([a,b])=>a>0||b>0);if(!as.length)return;
    if(isE){updateM({...em,date,teamA:[...tA],teamB:[...tB],sets:as,motm:motm||null});}
    else{setMatches([{id:gid(),date,teamA:[...tA],teamB:[...tB],sets:as,motm:motm||null,season:seasonId},...matches]);}
    reset();setSaved(true);setTimeout(()=>setSaved(false),2000);}
  function reset(){setTA(["",""]);setTB(["",""]);setSets([[0,0],[0,0],[0,0]]);setMotm("");setDate(new Date().toISOString().split("T")[0]);setNs(2);setEm(null);}
  function cancel(){reset();goBack();}
  const curSeasonName=seasons.find(s=>s.id===seasonId)?.name||"Unknown";
  return (
    <div className="fu">
      {isE&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700,color:GD}}>✏️ Editing</span></div><button onClick={cancel} style={{background:"none",border:`1px solid ${DG}40`,color:DG,padding:"4px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}>Cancel</button></div>}
      {saved&&<div style={{background:`${A}20`,border:`1px solid ${A}40`,borderRadius:12,padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>✅</span><span style={{color:A,fontWeight:600,fontSize:14}}>{isE?"Updated!":"Saved!"}</span></div>}
      {/* Season tag */}
      {!isE&&<div style={{marginBottom:12}}>
        <div style={lbl}>Season</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{seasons.filter(s=>s.active||s.id===seasonId).map(s=>(
          <button key={s.id} onClick={()=>setCurSeason(s.id)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${seasonId===s.id?PU:BD}`,background:seasonId===s.id?`${PU}15`:"transparent",color:seasonId===s.id?PU:MT,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            {s.active&&<span style={{width:5,height:5,borderRadius:"50%",background:A}}/>}{s.name}
          </button>
        ))}</div>
      </div>}
      <div style={{marginBottom:16}}><div style={lbl}>Date</div><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...sel,colorScheme:"dark"}}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,marginBottom:16}}>
        <div><div style={{...lbl,color:A}}>Team A</div>{tA.map((pid,i)=><select key={i} value={pid} onChange={e=>{const t=[...tA];t[i]=e.target.value;setTA(t);}} style={{...sel,marginBottom:6,borderColor:`${A}40`}}><option value="">Player {i+1}</option>{avail(pid).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}</select>)}</div>
        <div style={{display:"flex",alignItems:"center",fontWeight:900,fontSize:18,color:MT,paddingTop:20}}>VS</div>
        <div><div style={{...lbl,color:DG}}>Team B</div>{tB.map((pid,i)=><select key={i} value={pid} onChange={e=>{const t=[...tB];t[i]=e.target.value;setTB(t);}} style={{...sel,marginBottom:6,borderColor:`${DG}40`}}><option value="">Player {i+1}</option>{avail(pid).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}</select>)}</div>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={lbl}>Sets</div><div style={{display:"flex",gap:4}}>{[2,3].map(n=><button key={n} onClick={()=>setNs(n)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${ns===n?A:BD}`,background:ns===n?`${A}15`:"transparent",color:ns===n?A:MT,fontSize:11,fontWeight:600,cursor:"pointer"}}>{n}</button>)}</div></div>
        {sets.slice(0,ns).map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <span style={{fontSize:11,color:MT,width:36,fontWeight:600}}>Set {i+1}</span>
          <input type="number" min="0" max="7" value={s[0]} onFocus={e=>e.target.select()} onChange={e=>{const n=sets.map(x=>[...x]);n[i]=[+e.target.value,n[i][1]];setSets(n);}} style={{...sel,width:60,textAlign:"center",fontFamily:"'JetBrains Mono'",fontWeight:700,fontSize:18,borderColor:`${A}40`}}/>
          <span style={{color:MT,fontWeight:700}}>-</span>
          <input type="number" min="0" max="7" value={s[1]} onFocus={e=>e.target.select()} onChange={e=>{const n=sets.map(x=>[...x]);n[i]=[n[i][0],+e.target.value];setSets(n);}} style={{...sel,width:60,textAlign:"center",fontFamily:"'JetBrains Mono'",fontWeight:700,fontSize:18,borderColor:`${DG}40`}}/>
        </div>)}
      </div>
      <div style={{marginBottom:20}}><div style={lbl}>⭐ Man of the Match</div><select value={motm} onChange={e=>setMotm(e.target.value)} style={sel}><option value="">Select MVP</option>{[...tA,...tB].filter(Boolean).map(pid=><option key={pid} value={pid}>{pm[pid]?.nickname||pm[pid]?.name}</option>)}</select></div>
      <button onClick={submit} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:isE?`linear-gradient(135deg,${GD},${GD}cc)`:`linear-gradient(135deg,${A},${A}cc)`,color:BG,fontSize:15,fontWeight:800,cursor:"pointer",textTransform:"uppercase"}}>{isE?"Update Match":"Save Match"}</button>
    </div>
  );
}

// ── PLAYER STATS ──
function PlayerStats({players,ps,pm,getStreak,getForm,elo,sp,setSp,fm,showAP,setShowAP,nn,setNN,nk,setNK,addP,updatePlayer,deletePlayer,getName,sel}){
  const player=sp?pm[sp]:null;const stats=sp?ps[sp]:null;
  const[editMode,setEditMode]=useState(false);const[editPid,setEditPid]=useState(null);
  const[editName,setEditName]=useState("");const[editNick,setEditNick]=useState("");const[confirmDel,setConfirmDel]=useState(null);
  const h2h=useMemo(()=>{if(!sp)return[];const r={};fm.forEach(m=>{const w=win(m.sets);const my=m.teamA.includes(sp)?"A":m.teamB.includes(sp)?"B":null;if(!my)return;const opp=my==="A"?m.teamB:m.teamA;const won=w===my;opp.forEach(o=>{if(!r[o])r[o]={w:0,l:0};if(won)r[o].w++;else r[o].l++;});});return Object.entries(r).map(([pid,x])=>({pid,...x,games:x.w+x.l})).sort((a,b)=>b.games-a.games);},[sp,fm]);
  const inp={background:CD2,color:TX,border:`1px solid ${BD}`,borderRadius:10,padding:"10px 12px",fontSize:14,width:"100%",outline:"none",fontWeight:500};
  function startEdit(p){setEditPid(p.id);setEditName(p.name);setEditNick(p.nickname||"");}
  function saveEdit(){if(!editName.trim())return;updatePlayer(editPid,editName.trim(),editNick.trim());setEditPid(null);}

  if(sp&&player&&stats){
    const wp=stats.games>0?(stats.wins/stats.games*100):0;const e=elo[sp]||1500;const gd=stats.gamesWon-stats.gamesLost;
    const bp=Object.entries(stats.partners).map(([pid,r])=>({pid,...r,games:r.w+r.l,pct:(r.w+r.l)>0?r.w/(r.w+r.l)*100:0})).sort((a,b)=>b.pct-a.pct)[0];
    const cp=stats.comebackChances>0?((stats.comebacks/stats.comebackChances)*100).toFixed(0):"—";
    const badges=ACHS.filter(a=>a.ck(stats));
    return (<div className="fu">
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
            <div style={{fontSize:8,color:MT,marginTop:2,lineHeight:1.3}}>Total games won minus games lost across all sets</div>
          </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
        {[["Best Partner",bp?(pm[bp.pid]?.nickname||pm[bp.pid]?.name||"—"):"—",TX],["Comeback %",cp==="—"?"—":`${cp}%`,cp!=="—"&&parseInt(cp)>=50?A:MT]].map(([l,v,c])=><div key={l} style={{background:CD,borderRadius:10,border:`1px solid ${BD}`,padding:"12px 8px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:c,fontFamily:l==="Best Partner"?"'Outfit'":"'JetBrains Mono'"}}>{v}</div><div style={{fontSize:11,color:MT,fontWeight:600,marginTop:4}}>{l}</div></div>)}
      </div>
      <div style={{background:CD,borderRadius:14,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
        <h3 style={{fontSize:13,fontWeight:700,color:GD,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>🏆 Achievements ({badges.length}/{ACHS.length})</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {ACHS.map(a=>{const u=badges.some(b=>b.id===a.id);return (<div key={a.id} style={{background:u?`${GD}10`:BG,borderRadius:10,border:`1px solid ${u?`${GD}30`:BD}`,padding:"10px 8px",textAlign:"center",opacity:u?1:0.35}}><div style={{fontSize:22}}>{a.icon}</div><div style={{fontSize:11,fontWeight:700,color:u?GD:MT,marginTop:4}}>{a.name}</div><div style={{fontSize:9,color:MT,marginTop:2}}>{a.desc}</div></div>);})}
        </div>
      </div>
      <div style={{background:CD,borderRadius:14,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
        <h3 style={{fontSize:13,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Head to Head</h3>
        {h2h.length===0&&<p style={{fontSize:12,color:MT}}>No matches yet</p>}
        {h2h.map(r=>{const opp=pm[r.pid]; return (<div key={r.pid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${BD}20`}}><span style={{fontSize:14,fontWeight:600}}>{opp?.nickname||opp?.name||"?"}</span><div style={{display:"flex",gap:12}}><span style={{fontSize:13,color:A,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{r.w}W</span><span style={{fontSize:13,color:DG,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{r.l}L</span></div></div>);})}
      </div>
    </div>);
  }

  return (<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <h2 style={{fontSize:16,fontWeight:700}}>Player Roster ({players.length})</h2>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>{setEditMode(!editMode);setEditPid(null);setConfirmDel(null);setShowAP(false);}} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${editMode?GD:BD}`,background:editMode?`${GD}15`:"transparent",color:editMode?GD:MT,fontSize:12,fontWeight:700,cursor:"pointer"}}>{editMode?"Done":"✏️ Edit"}</button>
        {!editMode&&<button onClick={()=>setShowAP(!showAP)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${A}`,background:`${A}15`,color:A,fontSize:12,fontWeight:700,cursor:"pointer"}}>{showAP?"Cancel":"+ Add"}</button>}
      </div>
    </div>
    {showAP&&!editMode&&<div style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:12}}>
      <input placeholder="Name *" value={nn} onChange={e=>setNN(e.target.value)} style={{...inp,marginBottom:8}}/>
      <input placeholder="Nickname" value={nk} onChange={e=>setNK(e.target.value)} style={{...inp,marginBottom:8}}/>
      <button onClick={addP} style={{width:"100%",padding:10,borderRadius:10,border:"none",background:A,color:BG,fontSize:13,fontWeight:700,cursor:"pointer"}}>Add Player</button>
    </div>}
    {players.map(p=>{const s=ps[p.id];const e=elo[p.id]||1500;const badges=ACHS.filter(a=>a.ck(s));
      if(editMode&&editPid===p.id) return (<div key={p.id} style={{background:CD,borderRadius:12,border:`1px solid ${GD}40`,padding:14,marginBottom:6}}>
        <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Name *" style={{...inp,marginBottom:6,borderColor:`${GD}40`}}/>
        <input value={editNick} onChange={e=>setEditNick(e.target.value)} placeholder="Nickname" style={{...inp,marginBottom:8,borderColor:`${GD}40`}}/>
        <div style={{display:"flex",gap:6}}><button onClick={saveEdit} style={{flex:1,padding:8,borderRadius:8,border:"none",background:A,color:BG,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button><button onClick={()=>setEditPid(null)} style={{flex:1,padding:8,borderRadius:8,border:`1px solid ${BD}`,background:"transparent",color:MT,fontSize:12,fontWeight:700,cursor:"pointer"}}>Cancel</button></div>
      </div>);
      return (<div key={p.id} onClick={()=>{if(!editMode)setSp(p.id);}} style={{display:"flex",alignItems:"center",padding:"12px 14px",marginBottom:6,background:CD,borderRadius:12,border:`1px solid ${editMode?`${GD}20`:BD}`,cursor:editMode?"default":"pointer"}}>
        {editMode&&<div style={{display:"flex",flexDirection:"column",gap:4,marginRight:10}}>
          <button onClick={e=>{e.stopPropagation();startEdit(p);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",padding:0}}>✏️</button>
          {confirmDel===p.id?<div style={{display:"flex",flexDirection:"column",gap:2}}><button onClick={e=>{e.stopPropagation();deletePlayer(p.id);setConfirmDel(null);}} style={{background:DG,border:"none",color:"#fff",fontSize:8,fontWeight:700,padding:"3px 4px",borderRadius:4,cursor:"pointer"}}>Yes</button><button onClick={e=>{e.stopPropagation();setConfirmDel(null);}} style={{background:BD,border:"none",color:TX,fontSize:8,fontWeight:700,padding:"3px 4px",borderRadius:4,cursor:"pointer"}}>No</button></div>:<button onClick={e=>{e.stopPropagation();setConfirmDel(p.id);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",padding:0}}>🗑️</button>}
        </div>}
        <div style={{width:38,height:38,borderRadius:"50%",background:`${A}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:A,marginRight:10}}>{p.name[0]}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14,fontWeight:600}}>{p.name}</span>{p.nickname&&<span style={{fontSize:12,color:MT}}>"{p.nickname}"</span>}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}><span style={{fontSize:11,color:MT}}>{s.games} GP</span><FD f={getForm(p.id)}/>{badges.length>0&&<span style={{fontSize:10}}>{badges.slice(0,3).map(b=>b.icon).join("")}</span>}</div>
        </div>
        <div style={{textAlign:"right"}}><div style={{fontSize:16,fontWeight:800,color:BL,fontFamily:"'JetBrains Mono'"}}>{e}</div><div style={{fontSize:10,color:MT}}>{s.games>0?(s.wins/s.games*100).toFixed(0):"—"}%</div></div>
      </div>);
    })}
  </div>);
}

// ── MATCH HISTORY ──
function MatchHistory({matches,pm,players,onEdit,onDelete,getName,shareMatch,sel}){
  const[fp,setFp]=useState("");const[cd,setCd]=useState(null);
  const f=fp?matches.filter(m=>m.teamA.includes(fp)||m.teamB.includes(fp)):matches;
  const s=[...f].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return (<div className="fu">
    <div style={{display:"flex",gap:8,marginBottom:12}}><select value={fp} onChange={e=>setFp(e.target.value)} style={{...sel,flex:1}}><option value="">All Players</option>{players.map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}</select></div>
    <div style={{fontSize:11,color:MT,marginBottom:8,fontWeight:500}}>{s.length} matches</div>
    {s.map(m=>{const w=win(m.sets);const tA=m.sets.reduce((s,x)=>s+x[0],0);const tB=m.sets.reduce((s,x)=>s+x[1],0);
      return (<div key={m.id} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:11,color:MT,fontWeight:500}}>{new Date(m.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</span>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            {m.motm&&<span style={{fontSize:10,background:`${GD}20`,color:GD,padding:"2px 6px",borderRadius:6,fontWeight:600}}>⭐{getName(m.motm)}</span>}
            <button onClick={()=>shareMatch(m)} style={{background:"none",border:"none",fontSize:13,cursor:"pointer",padding:"2px 4px"}}>📤</button>
            <button onClick={()=>onEdit(m)} style={{background:"none",border:"none",color:BL,fontSize:13,cursor:"pointer",padding:"2px 4px"}}>✏️</button>
            {cd===m.id?<div style={{display:"flex",gap:3}}><button onClick={()=>{onDelete(m.id);setCd(null);}} style={{background:DG,border:"none",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 6px",borderRadius:6,cursor:"pointer"}}>Yes</button><button onClick={()=>setCd(null)} style={{background:BD,border:"none",color:TX,fontSize:9,fontWeight:700,padding:"3px 6px",borderRadius:6,cursor:"pointer"}}>No</button></div>:<button onClick={()=>setCd(m.id)} style={{background:"none",border:"none",color:DG,fontSize:13,cursor:"pointer",padding:"2px 4px"}}>🗑️</button>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center"}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:w==="A"?A:DG}}>{getName(m.teamA[0])}</div><div style={{fontSize:13,fontWeight:700,color:w==="A"?A:DG}}>{getName(m.teamA[1])}</div>{w==="A"?<div style={{fontSize:10,color:A,fontWeight:700,marginTop:3}}>WIN</div>:<div style={{fontSize:10,color:DG,fontWeight:700,marginTop:3}}>LOSS</div>}</div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{display:"flex",gap:6,fontFamily:"'JetBrains Mono'",fontWeight:700,fontSize:16}}>{m.sets.map((s,i)=><span key={i} style={{color:s[0]>s[1]?A:DG}}>{s[0]}-{s[1]}</span>)}</div><span style={{fontSize:10,color:MT,fontFamily:"'JetBrains Mono'"}}>{tA}-{tB}</span></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:w==="B"?A:DG}}>{getName(m.teamB[0])}</div><div style={{fontSize:13,fontWeight:700,color:w==="B"?A:DG}}>{getName(m.teamB[1])}</div>{w==="B"?<div style={{fontSize:10,color:A,fontWeight:700,marginTop:3}}>WIN</div>:<div style={{fontSize:10,color:DG,fontWeight:700,marginTop:3}}>LOSS</div>}</div>
        </div>
      </div>);})}
  </div>);
}

// ── COMBOS VIEW ──
function CombosView({combos,players,fm,pm,getName}){
  const[view,setView]=useState("duos");
  const[selPlayer,setSelP]=useState("");

  // Build full partner matrix
  const matrix=useMemo(()=>{
    const m={};
    players.forEach(p=>{m[p.id]={};players.forEach(q=>{if(p.id!==q.id)m[p.id][q.id]={w:0,l:0,games:0};});});
    fm.forEach(match=>{
      const w=win(match.sets);
      [[match.teamA,w==="A"],[match.teamB,w==="B"]].forEach(([team,won])=>{
        const[a,b]=team;
        if(m[a]&&m[a][b]){m[a][b].games++;m[b][a].games++;if(won){m[a][b].w++;m[b][a].w++;}else{m[a][b].l++;m[b][a].l++;}}
      });
    });
    return m;
  },[players,fm]);

  const activePlayers=players.filter(p=>{const s=matrix[p.id];return s&&Object.values(s).some(v=>v.games>0);});
  const top3=combos.filter(c=>c.games>=1).slice(0,3);
  const worst3=combos.filter(c=>c.games>=1).slice(-3).reverse();

  const pctColor=(pct,games)=>{if(games===0)return BD;if(pct>=60)return A;if(pct>=40)return TX;return DG;};

  return (<div className="fu">
    {/* View Toggle */}
    <div style={{display:"flex",gap:6,marginBottom:16}}>
      {[["duos","🔥 Best Duos"],["player","👤 My Combos"],["matrix","📊 Chemistry"]].map(([k,l])=>(
        <button key={k} onClick={()=>setView(k)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${view===k?A:BD}`,background:view===k?`${A}15`:"transparent",color:view===k?A:MT,fontSize:11,fontWeight:600,cursor:"pointer",flex:1,textAlign:"center"}}>{l}</button>
      ))}
    </div>

    {/* BEST DUOS */}
    {view==="duos"&&<div>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:14}}>🔥 Top Partnerships</h2>
      {top3.length===0&&<p style={{fontSize:13,color:MT}}>No partnerships recorded yet</p>}
      {top3.map((c,i)=>{
        const pct=c.games>0?(c.w/c.games*100):0;
        const medals=["🥇","🥈","🥉"];
        const colors=[GD,SV,BZ];
        return (<div key={"t"+i} style={{background:CD,borderRadius:16,border:`1px solid ${colors[i]}30`,padding:16,marginBottom:10,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`${colors[i]}08`,filter:"blur(20px)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:32}}>{medals[i]}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:800,color:TX}}>{getName(c.players[0])} <span style={{color:MT,fontWeight:400}}>x</span> {getName(c.players[1])}</div>
              <div style={{display:"flex",gap:12,marginTop:6}}>
                <span style={{fontSize:13,color:A,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.w}W</span>
                <span style={{fontSize:13,color:DG,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.l}L</span>
                <span style={{fontSize:13,color:MT}}>{c.games} GP</span>
              </div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{width:60,height:60,borderRadius:"50%",border:`3px solid ${colors[i]}`,display:"flex",alignItems:"center",justifyContent:"center",background:`${colors[i]}10`}}>
                <span style={{fontSize:20,fontWeight:900,color:colors[i],fontFamily:"'JetBrains Mono'"}}>{pct.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>);
      })}

      {/* Worst Partnerships */}
      {worst3.length>0&&worst3[0]!==top3[0]&&<div style={{marginTop:16}}>
        <h2 style={{fontSize:16,fontWeight:700,marginBottom:14,color:DG}}>💔 Worst Partnerships</h2>
        {worst3.map((c,i)=>{
          const pct=c.games>0?(c.w/c.games*100):0;
          const skulls=["💀","🥶","😅"];
          return (<div key={"w"+i} style={{background:CD,borderRadius:16,border:`1px solid ${DG}20`,padding:16,marginBottom:10,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`${DG}06`,filter:"blur(20px)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:32}}>{skulls[i]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:800,color:TX}}>{getName(c.players[0])} <span style={{color:MT,fontWeight:400}}>x</span> {getName(c.players[1])}</div>
                <div style={{display:"flex",gap:12,marginTop:6}}>
                  <span style={{fontSize:13,color:A,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.w}W</span>
                  <span style={{fontSize:13,color:DG,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.l}L</span>
                  <span style={{fontSize:13,color:MT}}>{c.games} GP</span>
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{width:60,height:60,borderRadius:"50%",border:`3px solid ${DG}`,display:"flex",alignItems:"center",justifyContent:"center",background:`${DG}10`}}>
                  <span style={{fontSize:20,fontWeight:900,color:DG,fontFamily:"'JetBrains Mono'"}}>{pct.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>);
        })}
      </div>}

      {/* All remaining partnerships */}
      {combos.filter(c=>c.games>=1).length>6&&<div style={{marginTop:16}}>
        <h3 style={{fontSize:13,fontWeight:700,color:MT,marginBottom:8}}>All Partnerships</h3>
        {combos.filter(c=>c.games>=1).slice(3,-3).map((c,i)=>{const pct=c.games>0?(c.w/c.games*100):0;
          return (<div key={"r"+i} style={{display:"flex",alignItems:"center",padding:"10px 12px",marginBottom:4,background:CD,borderRadius:10,border:`1px solid ${BD}`}}>
            <span style={{fontSize:13,fontWeight:800,color:MT,width:24,fontFamily:"'JetBrains Mono'"}}>{i+4}</span>
            <span style={{flex:1,fontSize:13,fontWeight:600}}>{getName(c.players[0])} x {getName(c.players[1])}</span>
            <span style={{fontSize:11,color:MT,marginRight:8}}>{c.w}W {c.l}L</span>
            <span style={{fontSize:14,fontWeight:800,color:pctColor(pct,c.games),fontFamily:"'JetBrains Mono'"}}>{pct.toFixed(0)}%</span>
          </div>);
        })}
      </div>}
    </div>}

    {/* MY COMBOS */}
    {view==="player"&&<div>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:10}}>Partner Chemistry</h2>
      <p style={{fontSize:12,color:MT,marginBottom:12}}>Select a player to see who they work best with</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
        {players.map(p=>{const on=selPlayer===p.id;return (
          <button key={p.id} onClick={()=>setSelP(on?"":p.id)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${on?A:BD}`,background:on?`${A}15`:"transparent",color:on?A:MT,fontSize:12,fontWeight:600,cursor:"pointer"}}>{p.nickname||p.name}</button>
        );})}
      </div>
      {selPlayer&&<div>
        {(() => {
          const partners=Object.entries(matrix[selPlayer]||{})
            .filter(([,v])=>v.games>0)
            .map(([pid,v])=>({pid,...v,pct:v.games>0?(v.w/v.games*100):0}))
            .sort((a,b)=>b.pct-a.pct);
          const best=partners[0];
          const worst=partners[partners.length-1];
          if(!partners.length) return (<p style={{fontSize:13,color:MT}}>No partnerships recorded for {getName(selPlayer)}</p>);
          return (<div>
            {/* Best/Worst highlight */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div style={{background:CD,borderRadius:12,border:`1px solid ${A}30`,padding:14,textAlign:"center"}}>
                <div style={{fontSize:10,color:A,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Best Partner</div>
                <div style={{fontSize:20}}>🤝</div>
                <div style={{fontSize:15,fontWeight:700,marginTop:4}}>{getName(best.pid)}</div>
                <div style={{fontSize:22,fontWeight:900,color:A,fontFamily:"'JetBrains Mono'",marginTop:4}}>{best.pct.toFixed(0)}%</div>
                <div style={{fontSize:11,color:MT}}>{best.w}W {best.l}L · {best.games} GP</div>
              </div>
              {worst&&worst.pid!==best.pid&&<div style={{background:CD,borderRadius:12,border:`1px solid ${DG}30`,padding:14,textAlign:"center"}}>
                <div style={{fontSize:10,color:DG,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Worst Partner</div>
                <div style={{fontSize:20}}>💔</div>
                <div style={{fontSize:15,fontWeight:700,marginTop:4}}>{getName(worst.pid)}</div>
                <div style={{fontSize:22,fontWeight:900,color:DG,fontFamily:"'JetBrains Mono'",marginTop:4}}>{worst.pct.toFixed(0)}%</div>
                <div style={{fontSize:11,color:MT}}>{worst.w}W {worst.l}L · {worst.games} GP</div>
              </div>}
            </div>
            {/* All partners */}
            {partners.map((p,i)=>{
              const barW=Math.max(p.pct,5);
              return (<div key={p.pid} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600}}>{getName(p.pid)}</span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:11,color:MT}}>{p.games} GP</span>
                    <span style={{fontSize:14,fontWeight:800,color:pctColor(p.pct,p.games),fontFamily:"'JetBrains Mono'",width:42,textAlign:"right"}}>{p.pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div style={{height:6,background:BD,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${barW}%`,background:pctColor(p.pct,p.games),borderRadius:3,transition:"width 0.4s ease"}}/>
                </div>
              </div>);
            })}
          </div>);
        })()}
      </div>}
    </div>}

    {/* CHEMISTRY MATRIX */}
    {view==="matrix"&&<div>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:6}}>Chemistry Matrix</h2>
      <p style={{fontSize:12,color:MT,marginBottom:14}}>Win % when paired together. GP = Games Played.</p>
      {activePlayers.length<2?<p style={{fontSize:13,color:MT}}>Need at least 2 active players</p>:
      <div style={{overflowX:"auto",paddingBottom:8}}>
        <div style={{display:"inline-grid",gridTemplateColumns:`70px repeat(${activePlayers.length},52px)`,gap:2,fontSize:10}}>
          {/* Header row */}
          <div/>
          {activePlayers.map(p => (
            <div key={p.id} style={{textAlign:"center",fontWeight:700,color:MT,padding:"4px 2px",fontSize:9,height:60,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
              <span style={{writingMode:"vertical-rl",transform:"rotate(180deg)",whiteSpace:"nowrap"}}>{p.nickname||p.name}</span>
            </div>
          ))}
          {/* Data rows */}
          {activePlayers.map(p => (
            <React.Fragment key={p.id}>
              <div style={{fontWeight:700,color:MT,padding:4,display:"flex",alignItems:"center",fontSize:10,whiteSpace:"nowrap"}}>{p.nickname||p.name}</div>
              {activePlayers.map(q => {
                if(p.id===q.id) return (<div key={q.id} style={{background:`${MT}20`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",padding:4}}>
                  <span style={{fontSize:10,color:MT}}>—</span>
                </div>);
                const d=matrix[p.id]?.[q.id];
                const games=d?.games||0;
                const pct=games>0?(d.w/games*100):0;
                const bg=games===0?`${BD}40`:pct>=60?`${A}25`:pct>=40?`${BL}20`:`${DG}25`;
                const tc=games===0?MT:pct>=60?A:pct>=40?TX:DG;
                return (<div key={q.id} style={{background:bg,borderRadius:4,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:4,minHeight:40}}>
                  {games>0?<>
                    <span style={{fontSize:12,fontWeight:800,color:tc,fontFamily:"'JetBrains Mono'"}}>{pct.toFixed(0)}%</span>
                    <span style={{fontSize:7,color:MT}}>{games} GP</span>
                  </>:<span style={{fontSize:9,color:MT}}>-</span>}
                </div>);
              })}
            </React.Fragment>
          ))}
        </div>
      </div>}
      {/* Legend */}
      <div style={{display:"flex",gap:12,marginTop:12,justifyContent:"center"}}>
        {[["60%+",`${A}25`,A],["40-60%",`${BL}20`,TX],["<40%",`${DG}25`,DG],["No data",`${BD}40`,MT]].map(([l,bg,c])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:12,height:12,borderRadius:3,background:bg}}/>
            <span style={{fontSize:10,color:c,fontWeight:500}}>{l}</span>
          </div>
        ))}
      </div>
    </div>}
  </div>);
}


// ── Mexicano round generator ──
function generateMexicanoRound(playerIds, currentPoints, courts) {
  const sorted = [...playerIds].sort((a, b) => (currentPoints[b] || 0) - (currentPoints[a] || 0));
  const hasBye = sorted.length % 2 === 1;
  const sitting = hasBye ? sorted[sorted.length - 1] : null;
  const active = hasBye ? sorted.slice(0, -1) : [...sorted];
  const matches = [];
  for (let i = 0; i < active.length - 2; i += 4) {
    if (i + 3 < active.length) {
      matches.push({ teamA: [active[i], active[i + 3]], teamB: [active[i + 1], active[i + 2]], court: (matches.length % courts) + 1 });
    }
  }
  if (active.length % 4 >= 2) {
    const rem = active.slice(-(active.length % 4));
    if (rem.length >= 4) matches.push({ teamA: [rem[0], rem[3]], teamB: [rem[1], rem[2]], court: (matches.length % courts) + 1 });
    else if (rem.length === 2) matches.push({ teamA: [rem[0]], teamB: [rem[1]], court: (matches.length % courts) + 1 });
  }
  return { matches, sitting, round: 0 };
}

// ── GAME MODE ──
function GameMode({players,getName,tournament,setTournament,sel}){
  const[selPlayers,setSelP]=useState([]);
  const[courts,setCourts]=useState(2);
  const[ptsPerRound,setPPR]=useState(24);
  const[mode,setMode]=useState("americano");

  function startTournament(){
    if(selPlayers.length<4)return;
    if(mode==="americano"){
      const schedule=generateAmericanoSchedule(selPlayers,courts);
      setTournament({id:gid(),date:new Date().toISOString().split("T")[0],mode,players:selPlayers,courts,ptsPerRound,rounds:schedule,scores:{},status:"active"});
    } else {
      const round=generateMexicanoRound(selPlayers,{},courts);
      round.round=1;
      setTournament({id:gid(),date:new Date().toISOString().split("T")[0],mode,players:selPlayers,courts,ptsPerRound,rounds:[round],scores:{},status:"active"});
    }
  }

  function recordScore(roundIdx,matchIdx,scoreA,scoreB){
    const key=`${roundIdx}-${matchIdx}`;
    setTournament({...tournament,scores:{...tournament.scores,[key]:{a:scoreA,b:scoreB}}});
  }

  function getPoints(){
    const pts={};if(!tournament)return pts;
    tournament.players.forEach(p=>{pts[p]=0;});
    const rounds=tournament.rounds||[];
    rounds.forEach((round,ri)=>{
      const matches=round.matches||[];
      matches.forEach((match,mi)=>{
        const key=`${ri}-${mi}`;const sc=tournament.scores[key];
        if(sc){(match.teamA||[]).forEach(p=>{pts[p]=(pts[p]||0)+sc.a;});(match.teamB||[]).forEach(p=>{pts[p]=(pts[p]||0)+sc.b;});}
      });
    });
    return pts;
  }

  function getLeaderboard(){
    const pts=getPoints();
    return Object.entries(pts).sort((a,b)=>b[1]-a[1]).map(([pid,points],i)=>({pid,points,rank:i+1}));
  }

  function nextMexicanoRound(){
    const pts=getPoints();
    const sorted=tournament.players.sort((a,b)=>(pts[b]||0)-(pts[a]||0));
    const round=generateMexicanoRound(sorted,pts,tournament.courts);
    round.round=tournament.rounds.length+1;
    setTournament({...tournament,rounds:[...tournament.rounds,round]});
  }

  function endTournament(){setTournament({...tournament,status:"complete"});}
  function resetTournament(){setTournament(null);}

  // Setup screen
  if(!tournament||tournament.status==="complete"){
    const prevLb=tournament?.status==="complete"?getLeaderboard():null;
    const prevMode=tournament?.mode;
    return (<div className="fu">
      <h2 style={{fontSize:18,fontWeight:800,marginBottom:4}}>⚡ Game Mode</h2>
      <p style={{fontSize:12,color:MT,marginBottom:16,lineHeight:1.5}}>Tournament formats for your padel sessions</p>

      {prevLb&&<div style={{marginBottom:20}}>
        <h3 style={{fontSize:14,fontWeight:700,color:GD,marginBottom:10}}>🏆 Last Tournament — {prevMode==="americano"?"Americano":"Mexicano"}</h3>
        {prevLb.map((p,i) => (
          <div key={p.pid} style={{display:"flex",alignItems:"center",padding:"10px 12px",marginBottom:4,background:CD,borderRadius:10,border:`1px solid ${i===0?`${GD}40`:BD}`}}>
            <span style={{fontSize:16,fontWeight:800,color:i<3?[GD,SV,BZ][i]:TX,width:28,fontFamily:"'JetBrains Mono'"}}>{i+1}</span>
            <span style={{flex:1,fontSize:14,fontWeight:600}}>{getName(p.pid)}</span>
            <span style={{fontSize:18,fontWeight:800,color:i===0?GD:A,fontFamily:"'JetBrains Mono'"}}>{p.points}pts</span>
          </div>
        ))}
        <button onClick={resetTournament} style={{marginTop:8,padding:"8px 16px",borderRadius:10,border:`1px solid ${BD}`,background:"transparent",color:MT,fontSize:12,fontWeight:600,cursor:"pointer"}}>Clear Results</button>
      </div>}

      {/* Mode Selector */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Format</div>
        <div style={{display:"flex",gap:6}}>
          {[["americano","Americano","Pre-set rotation, play with everyone"],["mexicano","Mexicano","Dynamic pairing by standings"]].map(([k,l,d])=>(
            <button key={k} onClick={()=>setMode(k)} style={{flex:1,padding:"12px 10px",borderRadius:12,border:`1px solid ${mode===k?PU:BD}`,background:mode===k?`${PU}15`:"transparent",cursor:"pointer",textAlign:"left"}}>
              <div style={{fontSize:13,fontWeight:700,color:mode===k?PU:TX}}>⚡ {l}</div>
              <div style={{fontSize:10,color:MT,marginTop:4,lineHeight:1.3}}>{d}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Player Selection */}
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
      <button onClick={startTournament} disabled={selPlayers.length<4} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:selPlayers.length>=4?`linear-gradient(135deg,${PU},${PU}cc)`:BD,color:selPlayers.length>=4?TX:MT,fontSize:15,fontWeight:800,cursor:selPlayers.length>=4?"pointer":"not-allowed",textTransform:"uppercase"}}>Start {mode==="americano"?"Americano":"Mexicano"} ({selPlayers.length} players)</button>
    </div>);
  }

  // Active tournament
  const leaderboard=getLeaderboard();
  const isMex=tournament.mode==="mexicano";
  const allRounds=tournament.rounds||[];
  const totalMatches=allRounds.reduce((s,r)=>s+(r.matches||[]).length,0);
  const scored=Object.keys(tournament.scores).length;
  const lastRoundDone=(()=>{const ri=allRounds.length-1;if(ri<0)return false;const ms=allRounds[ri]?.matches||[];return ms.length>0&&ms.every((_,mi)=>tournament.scores[`${ri}-${mi}`]);})();

  return (<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div><h2 style={{fontSize:18,fontWeight:800}}>⚡ {isMex?"Mexicano":"Americano"}</h2><p style={{fontSize:11,color:MT}}>{scored}/{totalMatches} scored · Round {allRounds.length} · {tournament.players.length} players</p></div>
      <button onClick={()=>{if(confirm("End tournament?"))endTournament();}} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${DG}40`,color:DG,background:"transparent",fontSize:11,fontWeight:600,cursor:"pointer"}}>End</button>
    </div>

    {/* Live Leaderboard */}
    <div style={{background:CD,borderRadius:14,border:`1px solid ${PU}30`,padding:14,marginBottom:12}}>
      <h3 style={{fontSize:13,fontWeight:700,color:PU,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Live Standings</h3>
      {leaderboard.map((p,i) => (
        <div key={p.pid} style={{display:"flex",alignItems:"center",padding:"6px 0",borderBottom:i<leaderboard.length-1?`1px solid ${BD}20`:"none"}}>
          <span style={{width:24,fontSize:14,fontWeight:800,color:i<3?[GD,SV,BZ][i]:TX,fontFamily:"'JetBrains Mono'"}}>{i+1}</span>
          <span style={{flex:1,fontSize:14,fontWeight:600}}>{getName(p.pid)}</span>
          <span style={{fontSize:18,fontWeight:800,color:i===0?GD:A,fontFamily:"'JetBrains Mono'"}}>{p.points}</span>
        </div>
      ))}
    </div>

    {/* Mexicano: Next Round */}
    {isMex&&lastRoundDone&&<button onClick={nextMexicanoRound} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${PU},${PU}cc)`,color:TX,fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:12,textTransform:"uppercase"}}>Generate Next Round</button>}

    {/* Rounds */}
    {allRounds.map((round,ri) => {
      const matches=round.matches||[];
      return (<div key={ri} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <h3 style={{fontSize:14,fontWeight:700}}>Round {ri+1}</h3>
          {round.sitting&&<span style={{fontSize:11,color:MT,background:BD,padding:"2px 8px",borderRadius:6}}>Sitting: {getName(round.sitting)}</span>}
        </div>
        {matches.map((match,mi)=>{
          const key=`${ri}-${mi}`;const sc=tournament.scores[key];
          const tA=match.teamA||[];const tB=match.teamB||[];
          return (<div key={mi} style={{marginBottom:mi<matches.length-1?10:0}}>
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
          </div>);
        })}
      </div>);
    })}
  </div>);
}
