import React, { useState, useMemo, useEffect } from "react";
import { supabase } from './supabase';

// Color palette
const A="#4ADE80",BG="#0a0a0f",CD="#12121a",CD2="#1a1a26",BD="#2a2a3a",TX="#e4e4ef",MT="#7a7a8e",DG="#f87171",GD="#FFD700",SV="#C0C0C0",BZ="#CD7F32",BL="#4da6ff",PU="#a855f7";

// Default roster (used when creating a new league)
const DEFAULT_ROSTER=[
  {name:"Mohammed",nickname:"Moody"},
  {name:"Basel",nickname:null},
  {name:"Jawad",nickname:null},
  {name:"Saleh",nickname:null},
  {name:"Hamza",nickname:null},
  {name:"Hani",nickname:null},
  {name:"Barhoum",nickname:null},
  {name:"MAK",nickname:null},
  {name:"Luke",nickname:null},
  {name:"Aboody",nickname:null},
  {name:"Husain",nickname:null}
];

// Helper functions
function win(sets){let a=0,b=0;sets.forEach(([x,y])=>{if(x>y)a++;else b++;});return a>b?"A":"B";}
function gid(){return"id_"+Math.random().toString(36).substr(2,9);}

const K=40,ES=1500;
function calcElo(pl,ma){
  const r={};
  pl.forEach(p=>{r[p.id]=ES;});
  [...ma].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(m=>{
    const w=win(m.sets);
    const aA=((r[m.team_a[0]]||ES)+(r[m.team_a[1]]||ES))/2;
    const aB=((r[m.team_b[0]]||ES)+(r[m.team_b[1]]||ES))/2;
    const eA=1/(1+Math.pow(10,(aB-aA)/400));
    const sA=w==="A"?1:0;
    m.team_a.forEach(p=>{if(r[p]!==undefined)r[p]+=Math.round(K*(sA-eA));});
    m.team_b.forEach(p=>{if(r[p]!==undefined)r[p]+=Math.round(K*((1-sA)-(1-eA)));});
  });
  return r;
}

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

// SVG Icons
const PadelLogo = () => (
  <svg viewBox="0 0 100 100" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" stroke={A} strokeWidth="2"/>
    <ellipse cx="50" cy="45" rx="20" ry="25" stroke={A} strokeWidth="2"/>
    <path d="M 35 70 Q 35 85 50 85 Q 65 85 65 70" stroke={A} strokeWidth="2" fill="none"/>
    <circle cx="40" cy="35" r="3" fill={A}/>
    <circle cx="60" cy="35" r="3" fill={A}/>
  </svg>
);

const CourtIcon = () => (
  <svg viewBox="0 0 100 100" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="15" width="80" height="70" stroke={A} strokeWidth="2" fill="none"/>
    <line x1="10" y1="50" x2="90" y2="50" stroke={MT} strokeWidth="1" strokeDasharray="3,3"/>
    <rect x="35" y="20" width="30" height="15" stroke={MT} strokeWidth="1" fill="none"/>
    <rect x="35" y="65" width="30" height="15" stroke={MT} strokeWidth="1" fill="none"/>
  </svg>
);

// ============================================================================
// AUTH GATE - Shows login screen if not authenticated
// ============================================================================
function AuthGate({children}){
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [email,setEmail]=useState("");
  const [sent,setSent]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    // Check current auth state
    const checkAuth = async () => {
      const {data:{session}} = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };
    checkAuth();

    // Listen for auth changes
    const {data:{subscription}} = supabase.auth.onAuthStateChange((evt,session)=>{
      setUser(session?.user || null);
    });
    return ()=>subscription?.unsubscribe();
  },[]);

  const handleSendLink = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    try {
      const {error:err} = await supabase.auth.signInWithOtp({email:email.trim()});
      if (err) throw err;
      setSent(true);
      setTimeout(()=>setSent(false),5000);
    } catch (err) {
      setError(err.message || "Failed to send magic link");
    }
  };

  if (loading) return <div style={{background:BG,width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:TX}}>Loading...</div>;

  if (!user) {
    return (
      <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"Outfit"}}>
        <div style={{maxWidth:"400px",width:"100%"}}>
          <div style={{textAlign:"center",marginBottom:"40px"}}>
            <PadelLogo/>
            <h1 style={{color:A,fontSize:"32px",fontWeight:"bold",margin:"20px 0 10px 0"}}>PADEL BATTLE</h1>
            <p style={{color:MT,fontSize:"14px"}}>Track your game. Master the court.</p>
          </div>

          <form onSubmit={handleSendLink} style={{display:"flex",flexDirection:"column",gap:"16px"}}>
            <div>
              <label style={{display:"block",color:TX,fontSize:"12px",fontWeight:"600",marginBottom:"8px"}}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width:"100%",
                  padding:"12px",
                  background:CD,
                  border:`1px solid ${BD}`,
                  borderRadius:"6px",
                  color:TX,
                  fontSize:"14px",
                  fontFamily:"Outfit",
                  boxSizing:"border-box",
                }}
              />
            </div>

            {error && <div style={{color:DG,fontSize:"12px",padding:"8px",background:`${DG}20`,borderRadius:"4px"}}>{error}</div>}
            {sent && <div style={{color:A,fontSize:"12px",padding:"8px",background:`${A}20`,borderRadius:"4px"}}>Check your email for the magic link!</div>}

            <button
              type="submit"
              style={{
                padding:"12px",
                background:A,
                border:"none",
                borderRadius:"6px",
                color:"#000",
                fontWeight:"bold",
                fontSize:"14px",
                cursor:"pointer",
                fontFamily:"Outfit",
              }}
            >
              Send Magic Link
            </button>
          </form>

          <p style={{color:MT,fontSize:"12px",textAlign:"center",marginTop:"20px"}}>
            We'll send you a secure link to sign in. No password needed.
          </p>
        </div>
      </div>
    );
  }

  return typeof children === 'function' ? children(user) : children;
}

// ============================================================================
// LEAGUE GATE - Shows create/join league screen if no league selected
// ============================================================================
function LeagueGate({user,children}){
  const [leagues,setLeagues]=useState([]);
  const [selectedLeagueId,setSelectedLeagueId]=useState(null);
  const [loading,setLoading]=useState(true);
  const [showCreate,setShowCreate]=useState(false);
  const [showJoin,setShowJoin]=useState(false);
  const [leagueName,setLeagueName]=useState("");
  const [inviteCode,setInviteCode]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    loadUserLeagues();
    // Check URL for invite code
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");
    if (code) setInviteCode(code);
  },[user.id]);

  const loadUserLeagues = async () => {
    try {
      const {data,error:err} = await supabase
        .from("league_members")
        .select("league_id,leagues(id,name)")
        .eq("user_id",user.id);

      if (err) throw err;
      const userLeagues = data?.map(m=>m.leagues).filter(Boolean) || [];
      setLeagues(userLeagues);
      setLoading(false);
    } catch (err) {
      console.error("Load leagues error:",err);
      setLoading(false);
    }
  };

  const handleCreateLeague = async (e) => {
    e.preventDefault();
    setError("");
    if (!leagueName.trim()) {
      setError("League name required");
      return;
    }
    try {
      // Create league
      const {data:leagueData,error:leagueErr} = await supabase
        .from("leagues")
        .insert({name:leagueName.trim()})
        .select()
        .single();

      if (leagueErr) throw leagueErr;

      const leagueId = leagueData.id;

      // Add user as admin
      const {error:memberErr} = await supabase
        .from("league_members")
        .insert({league_id:leagueId,user_id:user.id,role:"admin"});

      if (memberErr) throw memberErr;

      // Create default Season 1
      const {data:seasonData,error:seasonErr} = await supabase
        .from("seasons")
        .insert({league_id:leagueId,name:"Season 1",start_date:new Date().toISOString().split("T")[0],active:true})
        .select()
        .single();

      if (seasonErr) throw seasonErr;

      // Create default roster (11 players)
      const playerInserts = DEFAULT_ROSTER.map(p=>({
        league_id:leagueId,
        name:p.name,
        nickname:p.nickname,
      }));

      const {error:playerErr} = await supabase
        .from("players")
        .insert(playerInserts);

      if (playerErr) throw playerErr;

      // Refresh and select
      await loadUserLeagues();
      setSelectedLeagueId(leagueId);
      setShowCreate(false);
      setLeagueName("");
    } catch (err) {
      setError(err.message || "Failed to create league");
    }
  };

  const handleJoinLeague = async (e) => {
    e.preventDefault();
    setError("");
    if (!inviteCode.trim()) {
      setError("Invite code required");
      return;
    }
    try {
      // Find league by invite_code
      const {data:leagues,error:findErr} = await supabase
        .from("leagues")
        .select("id")
        .eq("invite_code",inviteCode.trim())
        .single();

      if (findErr || !leagues) throw new Error("Invalid invite code");

      const leagueId = leagues.id;

      // Check if already member
      const {data:existing} = await supabase
        .from("league_members")
        .select("id")
        .eq("league_id",leagueId)
        .eq("user_id",user.id)
        .single();

      if (existing) {
        setSelectedLeagueId(leagueId);
        setShowJoin(false);
        setInviteCode("");
        return;
      }

      // Add as member
      const {error:addErr} = await supabase
        .from("league_members")
        .insert({league_id:leagueId,user_id:user.id,role:"member"});

      if (addErr) throw addErr;

      // Refresh and select
      await loadUserLeagues();
      setSelectedLeagueId(leagueId);
      setShowJoin(false);
      setInviteCode("");
    } catch (err) {
      setError(err.message || "Failed to join league");
    }
  };

  if (loading) return <div style={{background:BG,width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:TX}}>Loading leagues...</div>;

  if (selectedLeagueId && leagues.some(l=>l.id===selectedLeagueId)) {
    return children(selectedLeagueId);
  }

  return (
    <div style={{background:BG,minHeight:"100vh",padding:"20px",fontFamily:"Outfit",color:TX}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>
        <h1 style={{color:A,fontSize:"28px",fontWeight:"bold",marginBottom:"30px",textAlign:"center"}}>Select a League</h1>

        {/* Existing leagues */}
        {leagues.length > 0 && (
          <div style={{marginBottom:"30px"}}>
            <h2 style={{fontSize:"16px",fontWeight:"bold",marginBottom:"12px",color:MT}}>Your Leagues</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              {leagues.map(l=>(
                <button
                  key={l.id}
                  onClick={()=>setSelectedLeagueId(l.id)}
                  style={{
                    padding:"16px",
                    background:CD,
                    border:`1px solid ${BD}`,
                    borderRadius:"8px",
                    color:TX,
                    fontSize:"14px",
                    fontWeight:"500",
                    cursor:"pointer",
                    textAlign:"left",
                    transition:"all 0.2s",
                  }}
                  onMouseEnter={(e)=>{e.target.style.borderColor=A;e.target.style.background=CD2;}}
                  onMouseLeave={(e)=>{e.target.style.borderColor=BD;e.target.style.background=CD;}}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create league */}
        <div style={{marginBottom:"20px",padding:"20px",background:CD,border:`1px solid ${BD}`,borderRadius:"8px"}}>
          <h2 style={{fontSize:"16px",fontWeight:"bold",marginBottom:"12px"}}>Create a League</h2>
          <form onSubmit={handleCreateLeague} style={{display:"flex",gap:"8px"}}>
            <input
              type="text"
              value={leagueName}
              onChange={(e)=>setLeagueName(e.target.value)}
              placeholder="League name"
              style={{
                flex:1,
                padding:"10px",
                background:CD2,
                border:`1px solid ${BD}`,
                borderRadius:"6px",
                color:TX,
                fontSize:"13px",
                fontFamily:"Outfit",
              }}
            />
            <button
              type="submit"
              style={{
                padding:"10px 16px",
                background:A,
                border:"none",
                borderRadius:"6px",
                color:"#000",
                fontWeight:"bold",
                fontSize:"13px",
                cursor:"pointer",
              }}
            >
              Create
            </button>
          </form>
        </div>

        {/* Join league */}
        <div style={{padding:"20px",background:CD,border:`1px solid ${BD}`,borderRadius:"8px"}}>
          <h2 style={{fontSize:"16px",fontWeight:"bold",marginBottom:"12px"}}>Join a League</h2>
          <form onSubmit={handleJoinLeague} style={{display:"flex",gap:"8px"}}>
            <input
              type="text"
              value={inviteCode}
              onChange={(e)=>setInviteCode(e.target.value)}
              placeholder="Invite code"
              style={{
                flex:1,
                padding:"10px",
                background:CD2,
                border:`1px solid ${BD}`,
                borderRadius:"6px",
                color:TX,
                fontSize:"13px",
                fontFamily:"Outfit",
              }}
            />
            <button
              type="submit"
              style={{
                padding:"10px 16px",
                background:A,
                border:"none",
                borderRadius:"6px",
                color:"#000",
                fontWeight:"bold",
                fontSize:"13px",
                cursor:"pointer",
              }}
            >
              Join
            </button>
          </form>
        </div>

        {error && <div style={{marginTop:"16px",color:DG,fontSize:"13px",padding:"12px",background:`${DG}20`,borderRadius:"6px"}}>{error}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
function AppContent({leagueId,user}){
  const [league,setLeague]=useState(null);
  const [players,setPlayers]=useState([]);
  const [matches,setMatches]=useState([]);
  const [seasons,setSeasons]=useState([]);
  const [tournaments,setTournaments]=useState([]);
  const [tab,setTab]=useState("leaderboard");
  const [loading,setLoading]=useState(true);
  const [isAdmin,setIsAdmin]=useState(false);
  const [selectedLeagueId,setSelectedLeagueId]=useState(leagueId);
  const [editingMatch,setEditingMatch]=useState(null);
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [selectedSeason,setSelectedSeason]=useState(null);
  const [tournament,setTournament]=useState(null);

  // Load league data from Supabase
  useEffect(()=>{
    loadLeagueData();
  },[leagueId,user.id]);

  const loadLeagueData = async () => {
    try {
      setLoading(true);

      // Fetch league
      const {data:leagueData,error:leagueErr} = await supabase
        .from("leagues")
        .select("*")
        .eq("id",leagueId)
        .single();

      if (leagueErr) throw leagueErr;
      setLeague(leagueData);

      // Check user role
      const {data:memberData} = await supabase
        .from("league_members")
        .select("role")
        .eq("league_id",leagueId)
        .eq("user_id",user.id)
        .single();

      setIsAdmin(memberData?.role==="admin");

      // Fetch players
      const {data:playersData,error:playersErr} = await supabase
        .from("players")
        .select("*")
        .eq("league_id",leagueId)
        .order("name");

      if (playersErr) throw playersErr;
      setPlayers(playersData || []);

      // Fetch matches
      const {data:matchesData,error:matchesErr} = await supabase
        .from("matches")
        .select("*")
        .eq("league_id",leagueId)
        .order("date",{ascending:false});

      if (matchesErr) throw matchesErr;
      setMatches(matchesData || []);

      // Fetch seasons
      const {data:seasonsData,error:seasonsErr} = await supabase
        .from("seasons")
        .select("*")
        .eq("league_id",leagueId)
        .order("start_date");

      if (seasonsErr) throw seasonsErr;
      setSeasons(seasonsData || []);

      // Fetch tournaments
      const {data:tournamentsData,error:tournamentsErr} = await supabase
        .from("tournaments")
        .select("*")
        .eq("league_id",leagueId)
        .order("created_at");

      if (tournamentsErr) throw tournamentsErr;
      setTournaments(tournamentsData || []);

      setLoading(false);
    } catch (err) {
      console.error("Load league data error:",err);
      setLoading(false);
    }
  };

  // Helper functions
  const getName = (pid) => {
    const p = players.find(x => x.id === pid);
    return p ? (p.nickname || p.name) : "?";
  };

  const getForm = (pid) => {
    const pMatches = matches.filter(m => m.team_a.includes(pid) || m.team_b.includes(pid));
    const sorted = [...pMatches].sort((a,b) => new Date(b.date) - new Date(a.date));
    return sorted.slice(0, 5).map(m => {
      const w = win(m.sets);
      const pTeam = m.team_a.includes(pid) ? "A" : "B";
      return w === pTeam ? "W" : "L";
    });
  };

  const getStreak = (pid) => {
    const pMatches = matches.filter(m => m.team_a.includes(pid) || m.team_b.includes(pid));
    const sorted = [...pMatches].sort((a,b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    for(let m of sorted){
      const w = win(m.sets);
      const pTeam = m.team_a.includes(pid) ? "A" : "B";
      if(w === pTeam) streak++;
      else break;
    }
    return streak;
  };

  const shareMatch = (m) => {
    const text = `${getName(m.team_a[0])} & ${getName(m.team_a[1])} vs ${getName(m.team_b[0])} & ${getName(m.team_b[1])}\n${m.sets.map((s,i)=>`Set ${i+1}: ${s[0]}-${s[1]}`).join("\n")}`;
    if(navigator.share) navigator.share({title:"Match",text});
    else alert(text);
  };

  // Set initial season
  useEffect(() => {
    if(seasons.length > 0 && !selectedSeason){
      const activeSeason = seasons.find(s => s.active);
      setSelectedSeason(activeSeason?.id || seasons[0]?.id);
    }
  }, [seasons]);

  // Compute stats for each player
  const ps = useMemo(()=>{
    return players.map(p=>{
      const pMatches = matches.filter(m=>m.team_a.includes(p.id)||m.team_b.includes(p.id));
      const wins = pMatches.filter(m=>win(m.sets)===(m.team_a.includes(p.id)?"A":"B")).length;
      const losses = pMatches.length - wins;
      const winRate = pMatches.length>0?wins/pMatches.length:0;

      // Calculate gamesWon and gamesLost
      let gamesWon=0,gamesLost=0;
      pMatches.forEach(m=>{
        const isTeamA=m.team_a.includes(p.id);
        m.sets.forEach(([a,b])=>{
          if(isTeamA){if(a>b)gamesWon++;else gamesLost++;}
          else{if(b>a)gamesWon++;else gamesLost++;}
        });
      });

      // Win streak
      let streak=[];
      const sorted = [...pMatches].sort((a,b)=>new Date(b.date)-new Date(a.date));
      for(let m of sorted){
        const w=win(m.sets);
        const pTeam=m.team_a.includes(p.id)?"A":"B";
        streak.push(w===pTeam?"W":"L");
      }

      // Comebacks: lost set 1 but won match
      let comebacks=0;
      pMatches.forEach(m=>{
        const isTeamA=m.team_a.includes(p.id);
        const s1a=m.sets[0][0],s1b=m.sets[0][1];
        const lostSet1=isTeamA?s1a<s1b:s1b<s1a;
        const won=win(m.sets)===(isTeamA?"A":"B");
        if(lostSet1&&won)comebacks++;
      });

      // MOTM count
      let motm=0;
      matches.forEach(m=>{
        if(m.motm===p.id)motm++;
      });

      return {
        ...p,
        wins,losses,winRate,games:pMatches.length,gamesWon,gamesLost,streak,comebacks,motm,
      };
    });
  },[players,matches]);

  // Leaderboard (sorted by wins, then winRate, then name)
  const lb = useMemo(()=>{
    return [...ps].sort((a,b)=>{
      if(b.wins!==a.wins)return b.wins-a.wins;
      if(b.winRate!==a.winRate)return b.winRate-a.winRate;
      return a.name.localeCompare(b.name);
    });
  },[ps]);

  // ELO ratings
  const elo = useMemo(()=>calcElo(players,matches),[players,matches]);

  // Combos (most common team-ups)
  const combos = useMemo(()=>{
    const combo={};
    matches.forEach(m=>{
      const teams=[m.team_a,m.team_b];
      teams.forEach(t=>{
        const key=t.slice().sort().join(",");
        if(!combo[key])combo[key]={players:t,wins:0,losses:0};
        const w=win(m.sets);
        const isTeamA=m.team_a===t;
        if((isTeamA&&w==="A")||(!isTeamA&&w==="B"))combo[key].wins++;
        else combo[key].losses++;
      });
    });
    return Object.values(combo).map(c=>({...c,games:c.wins+c.losses})).sort((a,b)=>b.games-a.games);
  },[matches]);

  if (loading) return <div style={{background:BG,width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:TX}}>Loading league...</div>;

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))",fontFamily:"Outfit",color:TX}}>
      {/* HEADER */}
      <div style={{background:CD,borderBottom:`1px solid ${BD}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <CourtIcon/>
          <div>
            <h1 style={{fontSize:"18px",fontWeight:"bold",margin:0,color:A}}>{league?.name||"League"}</h1>
            <p style={{fontSize:"11px",color:MT,margin:"2px 0 0 0"}}>ELO Season 1</p>
          </div>
        </div>
        <button
          onClick={()=>{
            setSelectedLeagueId(null);
          }}
          style={{
            padding:"6px 12px",
            background:CD2,
            border:`1px solid ${BD}`,
            borderRadius:"4px",
            color:MT,
            fontSize:"11px",
            cursor:"pointer",
          }}
        >
          Switch
        </button>
      </div>

      {/* LEADERBOARD TAB */}
      {tab==="leaderboard"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
            <h2 style={{fontSize:"18px",fontWeight:"bold",margin:0}}>Leaderboard</h2>
            <div style={{fontSize:"12px",color:MT}}>
              ELO • {lb.filter(p=>p.games>0).length} active
            </div>
          </div>

          {/* Podium (Top 3) */}
          {lb.length>=1&&lb[0].games>0&&(
            <div style={{marginBottom:"24px",background:CD,padding:"16px",borderRadius:"8px",border:`1px solid ${BD}`}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",alignItems:"flex-end"}}>
                {/* 2nd place */}
                {lb.length>=2&&lb[1].games>0&&(
                  <div style={{textAlign:"center",padding:"12px",background:CD2,borderRadius:"6px",borderTop:`3px solid ${SV}`}}>
                    <div style={{fontSize:"20px",marginBottom:"4px"}}>🥈</div>
                    <div style={{fontSize:"13px",fontWeight:"bold",marginBottom:"4px"}}>{lb[1].name}</div>
                    <div style={{fontSize:"11px",color:MT}}>{lb[1].wins}W {lb[1].losses}L</div>
                    <div style={{fontSize:"12px",color:A,fontWeight:"bold",marginTop:"4px"}}>{Math.round(elo[lb[1].id]||1500)}</div>
                  </div>
                )}

                {/* 1st place */}
                <div style={{textAlign:"center",padding:"16px",background:CD2,borderRadius:"6px",borderTop:`3px solid ${GD}`,transform:"scale(1.05)"}}>
                  <div style={{fontSize:"28px",marginBottom:"6px"}}>🥇</div>
                  <div style={{fontSize:"14px",fontWeight:"bold",marginBottom:"6px"}}>{lb[0].name}</div>
                  <div style={{fontSize:"12px",color:MT}}>{lb[0].wins}W {lb[0].losses}L</div>
                  <div style={{fontSize:"13px",color:GD,fontWeight:"bold",marginTop:"6px"}}>{Math.round(elo[lb[0].id]||1500)}</div>
                </div>

                {/* 3rd place */}
                {lb.length>=3&&lb[2].games>0&&(
                  <div style={{textAlign:"center",padding:"12px",background:CD2,borderRadius:"6px",borderTop:`3px solid ${BZ}`}}>
                    <div style={{fontSize:"20px",marginBottom:"4px"}}>🥉</div>
                    <div style={{fontSize:"13px",fontWeight:"bold",marginBottom:"4px"}}>{lb[2].name}</div>
                    <div style={{fontSize:"11px",color:MT}}>{lb[2].wins}W {lb[2].losses}L</div>
                    <div style={{fontSize:"12px",color:BZ,fontWeight:"bold",marginTop:"4px"}}>{Math.round(elo[lb[2].id]||1500)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full leaderboard table */}
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {lb.map((p,idx)=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",padding:"12px",background:CD,borderRadius:"6px",border:`1px solid ${BD}`,justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px",flex:1}}>
                  <div style={{width:"32px",height:"32px",background:CD2,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:"bold",color:A}}>
                    #{idx+1}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"13px",fontWeight:"600"}}>{p.name}</div>
                    <div style={{fontSize:"11px",color:MT}}>{p.games} game{p.games!==1?"s":""}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:"16px",alignItems:"center"}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"13px",fontWeight:"bold",color:A}}>{Math.round(elo[p.id]||1500)}</div>
                    <div style={{fontSize:"10px",color:MT}}>ELO</div>
                  </div>
                  <div style={{textAlign:"right",minWidth:"50px"}}>
                    <div style={{fontSize:"13px",fontWeight:"bold"}}>{p.wins}W</div>
                    <div style={{fontSize:"10px",color:MT}}>{p.losses}L</div>
                  </div>
                  <div style={{textAlign:"right",minWidth:"40px"}}>
                    <div style={{fontSize:"13px",fontWeight:"bold",color:(p.winRate>0.5?A:DG)}}>{(p.winRate*100).toFixed(0)}%</div>
                    <div style={{fontSize:"10px",color:MT}}>WR</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOG MATCH TAB */}
      {tab==="logmatch"&&selectedSeason&&(
        <LogMatch
          players={players}
          matches={matches}
          supabase={supabase}
          leagueId={leagueId}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          em={editingMatch}
          setEm={setEditingMatch}
          goBack={()=>setTab("matches")}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
          lbl={{fontSize:12,color:MT,fontWeight:600,marginBottom:8}}
          getName={getName}
          seasonId={selectedSeason}
          seasons={seasons}
          setCurSeason={setSelectedSeason}
          onSave={loadLeagueData}
        />
      )}

      {/* MATCHES TAB */}
      {tab==="matches"&&(
        <MatchHistory
          matches={matches}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          players={players}
          onEdit={(m)=>{setEditingMatch(m);setTab("logmatch");}}
          supabase={supabase}
          isAdmin={isAdmin}
          getName={getName}
          shareMatch={shareMatch}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
          onMatchDeleted={loadLeagueData}
        />
      )}

      {/* COMBOS TAB */}
      {tab==="combos"&&(
        <CombosView
          combos={combos}
          players={players}
          fm={matches}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          getName={getName}
        />
      )}

      {/* PLAYERS TAB */}
      {tab==="players"&&(
        <PlayerStats
          players={players}
          ps={Object.fromEntries(ps.map(p=>[p.id,p]))}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          getStreak={getStreak}
          getForm={getForm}
          elo={elo}
          sp={selectedPlayer}
          setSp={setSelectedPlayer}
          fm={matches}
          supabase={supabase}
          leagueId={leagueId}
          isAdmin={isAdmin}
          getName={getName}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
          onPlayersChange={loadLeagueData}
        />
      )}

      {/* GAMEMODE TAB */}
      {tab==="gamemode"&&(
        <GameMode
          players={players}
          getName={getName}
          supabase={supabase}
          leagueId={leagueId}
          tournament={tournament}
          setTournament={setTournament}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
        />
      )}

      {/* RULES TAB */}
      {tab==="rules"&&(
        <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
          <h2 style={{fontSize:18,fontWeight:bold,marginBottom:20,color:A}}>📋 Padel Rules</h2>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {RULES.map((r,i)=>(
              <div key={i} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:16}}>
                <h3 style={{fontSize:14,fontWeight:700,marginBottom:8,color:A}}>{r.title}</h3>
                <p style={{fontSize:13,color:TX,lineHeight:1.6}}>{r.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DISPUTES TAB */}
      {tab==="disputes"&&(
        <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
          <h2 style={{fontSize:18,fontWeight:bold,marginBottom:20,color:DG}}>⚖️ Disputed Calls</h2>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {ARGUED.map((r,i)=>(
              <div key={i} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:16}}>
                <h3 style={{fontSize:14,fontWeight:700,marginBottom:8,color:GD}}>{r.q}</h3>
                <p style={{fontSize:13,color:TX,lineHeight:1.6}}>{r.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM TAB NAVIGATION */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:CD,borderTop:`1px solid ${BD}`,display:"flex",justifyContent:"space-around",alignItems:"center",height:"calc(60px + env(safe-area-inset-bottom, 0px))",paddingBottom:"env(safe-area-inset-bottom, 0px)",zIndex:100}}>
        {[
          {id:"leaderboard",icon:"📊",label:"Leaderboard"},
          {id:"matches",icon:"🎾",label:"Matches"},
          {id:"combos",icon:"👥",label:"Combos"},
          {id:"players",icon:"👤",label:"Players"},
          {id:"gamemode",icon:"🎮",label:"Game Mode"},
          {id:"rules",icon:"📋",label:"Rules"},
        ].map(t=>(
          <button
            key={t.id}
            onClick={()=>setTab(t.id)}
            style={{
              flex:1,
              height:"100%",
              background:"transparent",
              border:"none",
              color:tab===t.id?A:MT,
              fontSize:"12px",
              cursor:"pointer",
              display:"flex",
              flexDirection:"column",
              alignItems:"center",
              justifyContent:"center",
              gap:"2px",
              transition:"color 0.2s",
            }}
          >
            <span style={{fontSize:"18px"}}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* FLOATING ADD BUTTON */}
      <button
        onClick={()=>{
          setEditingMatch(null);
          setTab("logmatch");
        }}
        style={{
          position:"fixed",
          bottom:"calc(70px + env(safe-area-inset-bottom, 0px))",
          right:"16px",
          width:"56px",
          height:"56px",
          background:A,
          border:"none",
          borderRadius:"50%",
          color:"#000",
          fontSize:"24px",
          cursor:"pointer",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          fontWeight:"bold",
          boxShadow:"0 4px 12px rgba(0,0,0,0.3)",
          zIndex:99,
        }}
      >
        +
      </button>
    </div>
  );
}

// ============================================================================
// FD COMPONENT - Form Dots (5 last games)
// ============================================================================
function FD({f}){
  if(!f||!f.length)return null;
  return (
    <div style={{display:"flex",gap:3,alignItems:"center"}}>
      {f.map((r,i)=>(
        <div key={i} style={{width:8,height:8,borderRadius:"50%",background:r==="W"?A:DG,opacity:0.5+(i/f.length)*0.5}}/>
      ))}
    </div>
  );
}

// ============================================================================
// LOG MATCH COMPONENT
// ============================================================================
function LogMatch({players,matches,supabase,leagueId,pm,em,setEm,goBack,sel,lbl,getName,seasonId,seasons,setCurSeason,onSave}){
  const isE=!!em;
  const [tA,setTA]=useState(["",""]);
  const [tB,setTB]=useState(["",""]);
  const [sets,setSets]=useState([[0,0],[0,0],[0,0]]);
  const [ns,setNs]=useState(2);
  const [motm,setMotm]=useState("");
  const [date,setDate]=useState(new Date().toISOString().split("T")[0]);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);

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
          .insert({league_id:leagueId,season_id:seasonId,date,team_a:[...tA],team_b:[...tB],sets:as,motm:motm||null,logged_by:null});
        if(error)throw error;
      }
      reset();
      setSaved(true);
      setTimeout(()=>setSaved(false),2000);
      if(onSave)onSave();
    }catch(err){
      console.error("Submit match error:",err);
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
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {seasons.filter(s=>s.active||s.id===seasonId).map(s=>(
            <button key={s.id} onClick={()=>setCurSeason(s.id)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${seasonId===s.id?PU:BD}`,background:seasonId===s.id?`${PU}15`:"transparent",color:seasonId===s.id?PU:MT,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              {s.active&&<span style={{width:5,height:5,borderRadius:"50%",background:A}}/>}{s.name}
            </button>
          ))}
        </div>
      </div>}

      <div style={{marginBottom:16}}>
        <div style={lbl}>Date</div>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...sel,colorScheme:"dark"}}/>
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
            <input type="number" min="0" max="7" value={s[0]} onFocus={e=>e.target.select()} onChange={e=>{const n=sets.map(x=>[...x]);n[i]=[+e.target.value,n[i][1]];setSets(n);}} style={{...sel,width:60,textAlign:"center",fontFamily:"'JetBrains Mono'",fontWeight:700,fontSize:18,borderColor:`${A}40`}}/>
            <span style={{color:MT,fontWeight:700}}>-</span>
            <input type="number" min="0" max="7" value={s[1]} onFocus={e=>e.target.select()} onChange={e=>{const n=sets.map(x=>[...x]);n[i]=[n[i][0],+e.target.value];setSets(n);}} style={{...sel,width:60,textAlign:"center",fontFamily:"'JetBrains Mono'",fontWeight:700,fontSize:18,borderColor:`${DG}40`}}/>
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

// ============================================================================
// PLAYER STATS COMPONENT
// ============================================================================
function PlayerStats({players,ps,pm,getStreak,getForm,elo,sp,setSp,fm,supabase,leagueId,isAdmin,getName,sel,onPlayersChange}){
  const player=sp?pm[sp]:null;
  const stats=sp?ps[sp]:null;
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

  return (
    <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
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
    </div>
  );
}

// ============================================================================
// MATCH HISTORY COMPONENT
// ============================================================================
function MatchHistory({matches,pm,players,onEdit,supabase,isAdmin,getName,shareMatch,sel,onMatchDeleted}){
  const [fp,setFp]=useState("");
  const [cd,setCd]=useState(null);
  const f=fp?matches.filter(m=>m.team_a.includes(fp)||m.team_b.includes(fp)):matches;
  const s=[...f].sort((a,b)=>new Date(b.date)-new Date(a.date));

  async function deleteMatch(matchId){
    if(!isAdmin)return;
    try{
      const {error}=await supabase.from("matches").delete().eq("id",matchId);
      if(error)throw error;
      setCd(null);
      if(onMatchDeleted)onMatchDeleted();
    }catch(err){
      console.error("Delete match error:",err);
    }
  }

  return (
    <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <select value={fp} onChange={e=>setFp(e.target.value)} style={{...sel,flex:1}}>
          <option value="">All Players</option>
          {players.map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
        </select>
      </div>
      <div style={{fontSize:11,color:MT,marginBottom:8,fontWeight:500}}>{s.length} matches</div>
      {s.map(m=>{const w=win(m.sets);const tA=m.sets.reduce((s,x)=>s+x[0],0);const tB=m.sets.reduce((s,x)=>s+x[1],0);
        return (<div key={m.id} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:11,color:MT,fontWeight:500}}>{new Date(m.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</span>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {m.motm&&<span style={{fontSize:10,background:`${GD}20`,color:GD,padding:"2px 6px",borderRadius:6,fontWeight:600}}>⭐{getName(m.motm)}</span>}
              <button onClick={()=>shareMatch(m)} style={{background:"none",border:"none",fontSize:13,cursor:"pointer",padding:"2px 4px"}}>📤</button>
              <button onClick={()=>onEdit(m)} style={{background:"none",border:"none",color:BL,fontSize:13,cursor:"pointer",padding:"2px 4px"}}>✏️</button>
              {isAdmin&&(cd===m.id?<div style={{display:"flex",gap:3}}><button onClick={()=>{deleteMatch(m.id);}} style={{background:DG,border:"none",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 6px",borderRadius:6,cursor:"pointer"}}>Yes</button><button onClick={()=>setCd(null)} style={{background:BD,border:"none",color:TX,fontSize:9,fontWeight:700,padding:"3px 6px",borderRadius:6,cursor:"pointer"}}>No</button></div>:<button onClick={()=>setCd(m.id)} style={{background:"none",border:"none",color:DG,fontSize:13,cursor:"pointer",padding:"2px 4px"}}>🗑️</button>)}
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

// ============================================================================
// COMBOS VIEW COMPONENT
// ============================================================================
function CombosView({combos,players,fm,pm,getName}){
  const [view,setView]=useState("duos");
  const [selPlayer,setSelP]=useState("");

  const matrix=useMemo(()=>{
    const m={};
    players.forEach(p=>{m[p.id]={};players.forEach(q=>{if(p.id!==q.id)m[p.id][q.id]={w:0,l:0,games:0};});});
    fm.forEach(match=>{
      const w=win(match.sets);
      [[match.team_a,w==="A"],[match.team_b,w==="B"]].forEach(([team,won])=>{
        const [a,b]=team;
        if(m[a]&&m[a][b]){m[a][b].games++;m[b][a].games++;if(won){m[a][b].w++;m[b][a].w++;}else{m[a][b].l++;m[b][a].l++;}}
      });
    });
    return m;
  },[players,fm]);

  const activePlayers=players.filter(p=>{const s=matrix[p.id];return s&&Object.values(s).some(v=>v.games>0);});
  const top3=combos.filter(c=>c.games>=1).slice(0,3);
  const worst3=combos.filter(c=>c.games>=1).slice(-3).reverse();
  const pctColor=(pct,games)=>{if(games===0)return BD;if(pct>=60)return A;if(pct>=40)return TX;return DG;};

  return (
    <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["duos","🔥 Best Duos"],["player","👤 My Combos"],["matrix","📊 Chemistry"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${view===k?A:BD}`,background:view===k?`${A}15`:"transparent",color:view===k?A:MT,fontSize:11,fontWeight:600,cursor:"pointer",flex:1,textAlign:"center"}}>{l}</button>
        ))}
      </div>

      {view==="duos"&&<div>
        <h2 style={{fontSize:16,fontWeight:700,marginBottom:14}}>🔥 Top Partnerships</h2>
        {top3.length===0&&<p style={{fontSize:13,color:MT}}>No partnerships recorded yet</p>}
        {top3.map((c,i)=>{
          const pct=c.games>0?(c.wins/c.games*100):0;
          const medals=["🥇","🥈","🥉"];
          const colors=[GD,SV,BZ];
          return (<div key={"t"+i} style={{background:CD,borderRadius:16,border:`1px solid ${colors[i]}30`,padding:16,marginBottom:10,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`${colors[i]}08`,filter:"blur(20px)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:32}}>{medals[i]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:800,color:TX}}>{getName(c.players[0])} <span style={{color:MT,fontWeight:400}}>x</span> {getName(c.players[1])}</div>
                <div style={{display:"flex",gap:12,marginTop:6}}>
                  <span style={{fontSize:13,color:A,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.wins}W</span>
                  <span style={{fontSize:13,color:DG,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.losses}L</span>
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

        {worst3.length>0&&worst3[0]!==top3[0]&&<div style={{marginTop:16}}>
          <h2 style={{fontSize:16,fontWeight:700,marginBottom:14,color:DG}}>💔 Worst Partnerships</h2>
          {worst3.map((c,i)=>{
            const pct=c.games>0?(c.wins/c.games*100):0;
            const skulls=["💀","🥶","😅"];
            return (<div key={"w"+i} style={{background:CD,borderRadius:16,border:`1px solid ${DG}20`,padding:16,marginBottom:10,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`${DG}06`,filter:"blur(20px)"}}/>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:32}}>{skulls[i]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:800,color:TX}}>{getName(c.players[0])} <span style={{color:MT,fontWeight:400}}>x</span> {getName(c.players[1])}</div>
                  <div style={{display:"flex",gap:12,marginTop:6}}>
                    <span style={{fontSize:13,color:A,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.wins}W</span>
                    <span style={{fontSize:13,color:DG,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.losses}L</span>
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
      </div>}

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

      {view==="matrix"&&<div>
        <h2 style={{fontSize:16,fontWeight:700,marginBottom:6}}>Chemistry Matrix</h2>
        <p style={{fontSize:12,color:MT,marginBottom:14}}>Win % when paired. GP = Games Played.</p>
        {activePlayers.length<2?<p style={{fontSize:13,color:MT}}>Need at least 2 active players</p>:
        <div style={{overflowX:"auto",paddingBottom:8}}>
          <div style={{display:"inline-grid",gridTemplateColumns:`70px repeat(${activePlayers.length},52px)`,gap:2,fontSize:10}}>
            <div/>
            {activePlayers.map(p => (
              <div key={p.id} style={{textAlign:"center",fontWeight:700,color:MT,padding:"4px 2px",fontSize:9,height:60,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
                <span style={{writingMode:"vertical-rl",transform:"rotate(180deg)",whiteSpace:"nowrap"}}>{p.nickname||p.name}</span>
              </div>
            ))}
            {activePlayers.map(p => (
              <React.Fragment key={p.id}>
                <div style={{fontWeight:700,color:MT,padding:4,display:"flex",alignItems:"center",fontSize:10,whiteSpace:"nowrap"}}>{p.nickname||p.name}</div>
                {activePlayers.map(q => {
                  if(p.id===q.id) return (<div key={q.id} style={{background:`${MT}20`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",padding:4}}><span style={{fontSize:10,color:MT}}>—</span></div>);
                  const d=matrix[p.id]?.[q.id];
                  const games=d?.games||0;
                  const pct=games>0?(d.w/games*100):0;
                  const bg=games===0?`${BD}40`:pct>=60?`${A}25`:pct>=40?`${BL}20`:`${DG}25`;
                  const tc=games===0?MT:pct>=60?A:pct>=40?TX:DG;
                  return (<div key={q.id} style={{background:bg,borderRadius:4,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:4,minHeight:40}}>
                    {games>0?<><span style={{fontSize:12,fontWeight:800,color:tc,fontFamily:"'JetBrains Mono'"}}>{pct.toFixed(0)}%</span><span style={{fontSize:7,color:MT}}>{games} GP</span></>:<span style={{fontSize:9,color:MT}}>-</span>}
                  </div>);
                })}
              </React.Fragment>
            ))}
          </div>
        </div>}
      </div>}
    </div>
  );
}

// ============================================================================
// GAME MODE COMPONENT
// ============================================================================
function generateAmericanoSchedule(playerIds,courts){
  const n=playerIds.length;const rounds=[];const pids=[...playerIds];const totalRounds=n-1+(n%2===1?1:0);const hasBye=n%2===1;
  if(hasBye)pids.push("BYE");const fixed=pids[0];const rotating=pids.slice(1);
  for(let r=0;r<totalRounds;r++){
    const current=[fixed,...rotating];const matches=[];const half=current.length/2;const pairs=[];
    for(let i=0;i<half;i++){pairs.push([current[i],current[current.length-1-i]]);}
    const validPairs=pairs.filter(p=>!p.includes("BYE"));const sitting=pairs.find(p=>p.includes("BYE"));const sittingPlayer=sitting?sitting.find(x=>x!=="BYE"):null;
    for(let i=0;i<validPairs.length;i+=2){if(i+1<validPairs.length){matches.push({teamA:validPairs[i],teamB:validPairs[i+1],court:(matches.length%courts)+1});}}
    rounds.push({round:r+1,matches,sitting:sittingPlayer});rotating.push(rotating.shift());
  }
  return rounds;
}

function generateMexicanoRound(playerIds,currentPoints,courts){
  const sorted=[...playerIds].sort((a,b)=>(currentPoints[b]||0)-(currentPoints[a]||0));
  const hasBye=sorted.length%2===1;const sitting=hasBye?sorted[sorted.length-1]:null;const active=hasBye?sorted.slice(0,-1):[...sorted];const matches=[];
  for(let i=0;i<active.length-2;i+=4){if(i+3<active.length){matches.push({teamA:[active[i],active[i+3]],teamB:[active[i+1],active[i+2]],court:(matches.length%courts)+1});}}
  if(active.length%4>=2){const rem=active.slice(-(active.length%4));if(rem.length>=4)matches.push({teamA:[rem[0],rem[3]],teamB:[rem[1],rem[2]],court:(matches.length%courts)+1});else if(rem.length===2)matches.push({teamA:[rem[0]],teamB:[rem[1]],court:(matches.length%courts)+1});}
  return {matches,sitting,round:0};
}

function GameMode({players,getName,supabase,leagueId,tournament,setTournament,sel}){
  const [selPlayers,setSelP]=useState([]);
  const [courts,setCourts]=useState(2);
  const [ptsPerRound,setPPR]=useState(24);
  const [mode,setMode]=useState("americano");

  async function startTournament(){
    if(selPlayers.length<4)return;
    try{
      const scheduleData={rounds:mode==="americano"?generateAmericanoSchedule(selPlayers,courts):[generateMexicanoRound(selPlayers,{},courts)]};
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
          <h3 style={{fontSize:14,fontWeight:700,color:GD,marginBottom:10}}>🏆 Last Tournament — {prevMode==="americano"?"Americano":"Mexicano"}</h3>
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
          <div style={{display:"flex",gap:6}}>
            {[["americano","Americano","Pre-set rotation, play with everyone"],["mexicano","Mexicano","Dynamic pairing by standings"]].map(([k,l,d])=>(
              <button key={k} onClick={()=>setMode(k)} style={{flex:1,padding:"12px 10px",borderRadius:12,border:`1px solid ${mode===k?PU:BD}`,background:mode===k?`${PU}15`:"transparent",cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:13,fontWeight:700,color:mode===k?PU:TX}}>⚡ {l}</div>
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
        <button onClick={startTournament} disabled={selPlayers.length<4} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:selPlayers.length>=4?`linear-gradient(135deg,${PU},${PU}cc)`:BD,color:selPlayers.length>=4?TX:MT,fontSize:15,fontWeight:800,cursor:selPlayers.length>=4?"pointer":"not-allowed",textTransform:"uppercase"}}>Start {mode==="americano"?"Americano":"Mexicano"} ({selPlayers.length} players)</button>
      </div>
    );
  }

  const leaderboard=getLeaderboard();
  const isMex=tournament.mode==="mexicano";
  const allRounds=tournament.schedule?.rounds||[];
  const totalMatches=allRounds.reduce((s,r)=>s+(r.matches||[]).length,0);
  const scored=Object.keys(tournament.scores).length;
  const lastRoundDone=(()=>{const ri=allRounds.length-1;if(ri<0)return false;const ms=allRounds[ri]?.matches||[];return ms.length>0&&ms.every((_,mi)=>tournament.scores[`${ri}-${mi}`]);})();

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

// ============================================================================
// ROOT APP COMPONENT
// ============================================================================
export default function App(){
  return (
    <AuthGate>
      {(user)=>(
        <LeagueGate user={user}>
          {(leagueId)=><AppContent leagueId={leagueId} user={user}/>}
        </LeagueGate>
      )}
    </AuthGate>
  );
}
