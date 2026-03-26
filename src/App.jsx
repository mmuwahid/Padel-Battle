import React, { useState, useMemo, useEffect } from "react";
import { supabase } from './supabase';

// Color palette
const A="#4ADE80",BG="#0a0a0f",CD="#12121a",CD2="#1a1a26",BD="#2a2a3a",TX="#e4e4ef",MT="#7a7a8e",DG="#f87171",GD="#FFD700",SV="#C0C0C0",BZ="#CD7F32",BL="#4da6ff",PU="#a855f7";

// No default roster — players created when users join and claim/create identity

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

// SVG Icons (exact match from original)
// Court icon for nav bar "Matches" tab
const CourtIcon = () => (<svg width="16" height="20" viewBox="0 0 24 30" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="24" rx="1"/><line x1="12" y1="3" x2="12" y2="27"/><line x1="2" y1="15" x2="22" y2="15"/><rect x="8" y="3" width="8" height="5" rx="0" fill="none"/><rect x="8" y="22" width="8" height="5" rx="0" fill="none"/></svg>);
// Tennis ball logo — large (login screen)
const PadelLogo = () => (<div style={{width:48,height:48,borderRadius:14,background:`${A}12`,display:"flex",alignItems:"center",justifyContent:"center"}}>
  <svg width="32" height="32" viewBox="0 0 50 50" fill="none">
    <circle cx="25" cy="25" r="22" stroke={A} strokeWidth="2.5" fill={`${A}10`}/>
    <path d="M8 20 Q25 8 42 20" stroke={A} strokeWidth="2" fill="none"/>
    <path d="M8 30 Q25 42 42 30" stroke={A} strokeWidth="2" fill="none"/>
  </svg>
</div>);
// Tennis ball logo — small (header, league screen)
const PadelLogoSmall = () => (<svg width="22" height="22" viewBox="0 0 50 50" fill="none">
  <circle cx="25" cy="25" r="22" stroke={A} strokeWidth="2.5" fill={`${A}10`}/>
  <path d="M8 20 Q25 8 42 20" stroke={A} strokeWidth="2" fill="none"/>
  <path d="M8 30 Q25 42 42 30" stroke={A} strokeWidth="2" fill="none"/>
</svg>);

// Tab definitions (original layout: 3 left + center button + 3 right)
const TL=[{key:"board",label:"Leaderboard",icon:"🏆"},{key:"history",label:"Matches",icon:"court"},{key:"combos",label:"Combos",icon:"🤝"}];
const TR=[{key:"stats",label:"Players",icon:"📊"},{key:"gamemode",label:"Game Mode",icon:"⚡"},{key:"rules",label:"Rules",icon:"📖"}];

// ============================================================================
// AUTH GATE - Shows login screen if not authenticated
// Supports: Magic Link, Email/Password Sign Up, Email/Password Sign In, Google OAuth
// ============================================================================
function AuthGate({children}){
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  // authMode: "magic" | "signup" | "signin" | (future: "google")
  const [authMode,setAuthMode]=useState("signin");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [sent,setSent]=useState(false);
  const [error,setError]=useState("");
  const [successMsg,setSuccessMsg]=useState("");

  useEffect(()=>{
    // Handle auth callback (magic link / OAuth redirect)
    const handleAuthCallback = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      if (hash && hash.includes("access_token")) {
        // Supabase will auto-handle this via onAuthStateChange
        // Clean the URL
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      if (params.get("code")) {
        // OAuth code exchange — Supabase handles this automatically
        const cleanUrl = window.location.pathname + (params.get("invite") ? `?invite=${params.get("invite")}` : "");
        window.history.replaceState(null, "", cleanUrl);
      }
    };
    handleAuthCallback();

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

  const clearForm = () => { setError(""); setSuccessMsg(""); };

  // Magic Link
  const handleSendLink = async (e) => {
    e.preventDefault();
    clearForm();
    if (!email.trim()) { setError("Please enter your email"); return; }
    try {
      const redirectUrl = window.location.origin + window.location.pathname + window.location.search;
      const {error:err} = await supabase.auth.signInWithOtp({email:email.trim(), options:{emailRedirectTo:redirectUrl}});
      if (err) throw err;
      setSent(true);
      setTimeout(()=>setSent(false),8000);
    } catch (err) { setError(err.message || "Failed to send magic link"); }
  };

  // Email/Password Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    clearForm();
    if (!email.trim()) { setError("Please enter your email"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    try {
      const {data,error:err} = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() || email.trim().split("@")[0] } }
      });
      if (err) throw err;
      if (data?.user?.identities?.length === 0) {
        setError("An account with this email already exists. Try signing in.");
      } else {
        setSuccessMsg("Account created! Check your email to confirm, or sign in directly.");
        setPassword("");
      }
    } catch (err) { setError(err.message || "Failed to create account"); }
  };

  // Email/Password Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    clearForm();
    if (!email.trim()) { setError("Please enter your email"); return; }
    if (!password) { setError("Please enter your password"); return; }
    try {
      const {error:err} = await supabase.auth.signInWithPassword({email:email.trim(),password});
      if (err) throw err;
    } catch (err) { setError(err.message || "Failed to sign in"); }
  };

  // Google OAuth (ready for when configured)
  const handleGoogleSignIn = async () => {
    clearForm();
    try {
      const {error:err} = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + window.location.pathname + window.location.search }
      });
      if (err) throw err;
    } catch (err) { setError(err.message || "Google sign-in failed"); }
  };

  if (loading) return <div style={{background:BG,width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:TX}}>Loading...</div>;

  if (!user) {
    const inputStyle = {
      width:"100%",padding:"12px 14px",background:CD,border:`1px solid ${BD}`,borderRadius:10,
      color:TX,fontSize:14,fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",outline:"none",
    };
    const labelStyle = {display:"block",color:MT,fontSize:11,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6};
    const btnPrimary = {
      padding:"14px",background:`linear-gradient(135deg,${A},${A}cc)`,border:"none",borderRadius:12,
      color:"#000",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"'Outfit',sans-serif",
      textTransform:"uppercase",letterSpacing:1,width:"100%",
    };
    const btnOutline = (color) => ({
      padding:"12px",background:"transparent",border:`1px solid ${color}40`,borderRadius:10,
      color,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Outfit',sans-serif",width:"100%",
    });
    const tabStyle = (active) => ({
      flex:1,padding:"10px 0",background:active?`${A}15`:"transparent",border:"none",
      borderBottom:active?`2px solid ${A}`:`2px solid transparent`,color:active?A:MT,
      fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Outfit',sans-serif",
      textTransform:"uppercase",letterSpacing:0.5,transition:"all 0.2s",
    });

    return (
      <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Outfit',sans-serif"}}>
        <div style={{maxWidth:"380px",width:"100%"}}>
          {/* Logo */}
          <div style={{textAlign:"center",marginBottom:"28px"}}>
            <div style={{display:"flex",justifyContent:"center"}}><PadelLogo/></div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",marginTop:"16px"}}>
              <PadelLogoSmall/>
              <h1 style={{fontSize:22,fontWeight:900,letterSpacing:2,color:TX,fontFamily:"'Outfit',sans-serif"}}><span style={{color:A}}>Padel</span>Hub</h1>
            </div>
            <p style={{color:MT,fontSize:12,fontWeight:500,letterSpacing:1,marginTop:6,textTransform:"uppercase"}}>Track your game. Master the court.</p>
          </div>

          {/* Auth Mode Tabs */}
          <div style={{display:"flex",marginBottom:"20px",borderRadius:8,overflow:"hidden",border:`1px solid ${BD}`}}>
            <button onClick={()=>{setAuthMode("signin");clearForm();}} style={tabStyle(authMode==="signin")}>Sign In</button>
            <button onClick={()=>{setAuthMode("signup");clearForm();}} style={tabStyle(authMode==="signup")}>Sign Up</button>
            <button onClick={()=>{setAuthMode("magic");clearForm();}} style={tabStyle(authMode==="magic")}>Magic Link</button>
          </div>

          {/* Error / Success Messages */}
          {error && <div style={{color:DG,fontSize:12,padding:"10px 14px",background:`${DG}15`,borderRadius:10,border:`1px solid ${DG}30`,marginBottom:12}}>{error}</div>}
          {successMsg && <div style={{color:A,fontSize:12,padding:"10px 14px",background:`${A}15`,borderRadius:10,border:`1px solid ${A}30`,marginBottom:12}}>{successMsg}</div>}
          {sent && <div style={{color:A,fontSize:12,padding:"10px 14px",background:`${A}15`,borderRadius:10,border:`1px solid ${A}30`,marginBottom:12}}>✓ Check your email for the magic link!</div>}

          {/* SIGN IN FORM */}
          {authMode==="signin" && (
            <form onSubmit={handleSignIn} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Your password" style={inputStyle}/>
              </div>
              <button type="submit" style={btnPrimary}>Sign In</button>
              <div style={{textAlign:"center",marginTop:4}}>
                <button type="button" onClick={()=>{setAuthMode("magic");clearForm();}} style={{background:"none",border:"none",color:A,fontSize:12,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textDecoration:"underline"}}>
                  Forgot password? Use magic link
                </button>
              </div>
            </form>
          )}

          {/* SIGN UP FORM */}
          {authMode==="signup" && (
            <form onSubmit={handleSignUp} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div>
                <label style={labelStyle}>Display Name</label>
                <input type="text" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Your name (e.g. Moody)" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Min 6 characters" style={inputStyle}/>
              </div>
              <button type="submit" style={btnPrimary}>Create Account</button>
            </form>
          )}

          {/* MAGIC LINK FORM */}
          {authMode==="magic" && (
            <form onSubmit={handleSendLink} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle}/>
              </div>
              <button type="submit" style={btnPrimary}>Send Magic Link</button>
              <p style={{color:MT,fontSize:11,textAlign:"center",marginTop:4,lineHeight:1.5}}>
                We'll send you a secure link to sign in — no password needed.
              </p>
            </form>
          )}

          {/* Google Sign-In (shows when OAuth is configured in Supabase) */}
          <div style={{marginTop:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{flex:1,height:1,background:BD}}/>
              <span style={{color:MT,fontSize:11,fontWeight:500}}>OR</span>
              <div style={{flex:1,height:1,background:BD}}/>
            </div>
            <button onClick={handleGoogleSignIn} style={btnOutline(TX)}>
              <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </span>
            </button>
          </div>
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
  const [editingLeagueId,setEditingLeagueId]=useState(null);
  const [editLeagueName,setEditLeagueName]=useState("");

  useEffect(()=>{
    const init = async () => {
      await loadUserLeagues();
      // Check URL for invite code and auto-join
      const params = new URLSearchParams(window.location.search);
      const code = params.get("invite");
      if (code) {
        setInviteCode(code);
        // Auto-join the league from invite link
        await autoJoinByInvite(code);
        // Clean the URL
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    init();
  },[user.id]);

  const autoJoinByInvite = async (code) => {
    try {
      const {data:leagueData,error:findErr} = await supabase
        .from("leagues").select("id,name").eq("invite_code",code.trim()).single();
      if (findErr || !leagueData) return; // silently fail — invalid code
      // Check if already member
      const {data:existing} = await supabase
        .from("league_members").select("id").eq("league_id",leagueData.id).eq("user_id",user.id).single();
      if (existing) {
        // Already a member — just select the league
        setSelectedLeagueId(leagueData.id);
        return;
      }
      // Add as member
      const {error:addErr} = await supabase
        .from("league_members").insert({league_id:leagueData.id,user_id:user.id,role:"member"});
      if (addErr) throw addErr;
      await loadUserLeagues();
      setSelectedLeagueId(leagueData.id);
      setInviteCode("");
    } catch (err) {
      console.error("Auto-join error:", err);
      // Don't block — user can still manually join
    }
  };

  const loadUserLeagues = async () => {
    try {
      const {data,error:err} = await supabase
        .from("league_members")
        .select("league_id,leagues(id,name,invite_code)")
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
      // Create league (created_by required for RLS, trigger auto-adds user as admin)
      const {data:leagueData,error:leagueErr} = await supabase
        .from("leagues")
        .insert({name:leagueName.trim(),created_by:user.id})
        .select()
        .single();

      if (leagueErr) throw leagueErr;

      const leagueId = leagueData.id;

      // Note: handle_new_league trigger auto-inserts user as admin member

      // Create default Season 1
      const {data:seasonData,error:seasonErr} = await supabase
        .from("seasons")
        .insert({league_id:leagueId,name:"Season 1",start_date:new Date().toISOString().split("T")[0],active:true})
        .select()
        .single();

      if (seasonErr) throw seasonErr;

      // No default roster — players are created when users join and claim/create their identity

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

  const handleRenameLeague = async (leagueId) => {
    if(!editLeagueName.trim()) return;
    try {
      const {error:err} = await supabase.from("leagues").update({name:editLeagueName.trim()}).eq("id",leagueId);
      if(err) throw err;
      setEditingLeagueId(null);
      setEditLeagueName("");
      await loadUserLeagues();
    } catch(err) { setError(err.message || "Failed to rename league"); }
  };

  const handleDeleteLeague = async (leagueId) => {
    if(!confirm("Delete this league and ALL its data (players, matches, seasons)? This cannot be undone.")) return;
    try {
      const {error:err} = await supabase.from("leagues").delete().eq("id",leagueId);
      if(err) throw err;
      await loadUserLeagues();
    } catch(err) { setError(err.message || "Failed to delete league"); }
  };

  if (loading) return <div style={{background:BG,width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:TX}}>Loading leagues...</div>;

  if (selectedLeagueId && leagues.some(l=>l.id===selectedLeagueId)) {
    const switchLeague = () => setSelectedLeagueId(null);
    return children(selectedLeagueId, switchLeague);
  }

  return (
    <div style={{background:BG,minHeight:"100vh",padding:"20px",fontFamily:"'Outfit',sans-serif",color:TX}}>
      <div style={{maxWidth:"420px",margin:"0 auto",paddingTop:"20px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <PadelLogoSmall/>
            <h1 style={{fontSize:20,fontWeight:900,letterSpacing:2}}><span style={{color:A}}>Padel</span>Hub</h1>
          </div>
          <p style={{color:MT,fontSize:11,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginTop:6}}>Select a League</p>
        </div>

        {/* Existing leagues */}
        {leagues.length > 0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Your Leagues</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {leagues.map(l=>(
                <div key={l.id} style={{background:CD,border:`1px solid ${BD}`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
                  {editingLeagueId===l.id ? (
                    <div style={{flex:1,display:"flex",gap:6,alignItems:"center"}}>
                      <input value={editLeagueName} onChange={e=>setEditLeagueName(e.target.value)} style={{flex:1,padding:"6px 10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
                      <button onClick={()=>handleRenameLeague(l.id)} style={{padding:"6px 10px",background:A,border:"none",borderRadius:8,color:"#000",fontSize:11,fontWeight:700,cursor:"pointer"}}>Save</button>
                      <button onClick={()=>setEditingLeagueId(null)} style={{padding:"6px 10px",background:"transparent",border:`1px solid ${BD}`,borderRadius:8,color:MT,fontSize:11,fontWeight:600,cursor:"pointer"}}>✕</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={()=>setSelectedLeagueId(l.id)} style={{flex:1,background:"none",border:"none",color:TX,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:18}}>🏟️</span> {l.name}
                      </button>
                      <button onClick={()=>{const url=`${window.location.origin}${window.location.pathname}?invite=${l.invite_code}`;if(navigator.share)navigator.share({title:"Join my PadelHub league",text:`Join "${l.name}" on PadelHub!`,url});else{navigator.clipboard.writeText(url);alert("Invite link copied!");}}} style={{background:"none",border:`1px solid ${A}40`,borderRadius:6,color:A,fontSize:10,fontWeight:600,cursor:"pointer",padding:"4px 8px",fontFamily:"'Outfit',sans-serif"}} title="Share invite link">Invite</button>
                      <button onClick={()=>{setEditingLeagueId(l.id);setEditLeagueName(l.name);}} style={{background:"none",border:`1px solid ${BD}`,borderRadius:6,color:MT,fontSize:10,fontWeight:600,cursor:"pointer",padding:"4px 8px",fontFamily:"'Outfit',sans-serif"}} title="Edit">Edit</button>
                      <button onClick={()=>handleDeleteLeague(l.id)} style={{background:"none",border:`1px solid ${DG}40`,borderRadius:6,color:DG,fontSize:10,fontWeight:600,cursor:"pointer",padding:"4px 8px",fontFamily:"'Outfit',sans-serif"}} title="Delete">Delete</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create league */}
        <div style={{marginBottom:12,padding:"16px",background:CD,border:`1px solid ${BD}`,borderRadius:14}}>
          <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Create a League</div>
          <form onSubmit={handleCreateLeague} style={{display:"flex",gap:8}}>
            <input
              type="text"
              value={leagueName}
              onChange={(e)=>setLeagueName(e.target.value)}
              placeholder="League name"
              style={{
                flex:1,
                padding:"10px 14px",
                background:CD2,
                border:`1px solid ${BD}`,
                borderRadius:10,
                color:TX,
                fontSize:13,
                fontFamily:"'Outfit',sans-serif",
                outline:"none",
              }}
            />
            <button
              type="submit"
              style={{
                padding:"10px 18px",
                background:A,
                border:"none",
                borderRadius:10,
                color:"#000",
                fontWeight:700,
                fontSize:13,
                cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",
              }}
            >
              Create
            </button>
          </form>
        </div>

        {/* Join league */}
        <div style={{padding:"16px",background:CD,border:`1px solid ${BD}`,borderRadius:14}}>
          <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Join a League</div>
          <form onSubmit={handleJoinLeague} style={{display:"flex",gap:8}}>
            <input
              type="text"
              value={inviteCode}
              onChange={(e)=>setInviteCode(e.target.value)}
              placeholder="Invite code"
              style={{
                flex:1,
                padding:"10px 14px",
                background:CD2,
                border:`1px solid ${BD}`,
                borderRadius:10,
                color:TX,
                fontSize:13,
                fontFamily:"'Outfit',sans-serif",
                outline:"none",
              }}
            />
            <button
              type="submit"
              style={{
                padding:"10px 18px",
                background:A,
                border:"none",
                borderRadius:10,
                color:"#000",
                fontWeight:700,
                fontSize:13,
                cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",
              }}
            >
              Join
            </button>
          </form>
        </div>

        {error && <div style={{marginTop:14,color:DG,fontSize:12,padding:"10px 14px",background:`${DG}15`,borderRadius:10,border:`1px solid ${DG}30`}}>{error}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
function AppContent({leagueId,user,onSwitchLeague}){
  const [league,setLeague]=useState(null);
  const [players,setPlayers]=useState([]);
  const [matches,setMatches]=useState([]);
  const [seasons,setSeasons]=useState([]);
  const [tournaments,setTournaments]=useState([]);
  const [tab,setTab]=useState("board");
  const [loading,setLoading]=useState(true);
  const [isAdmin,setIsAdmin]=useState(false);
  const [selectedLeagueId,setSelectedLeagueId]=useState(leagueId);
  const [editingMatch,setEditingMatch]=useState(null);
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [selectedSeason,setSelectedSeason]=useState(null);
  const [tournament,setTournament]=useState(null);
  const [claimedPlayer,setClaimedPlayer]=useState(undefined); // undefined=loading, null=unclaimed, object=claimed
  const [newPlayerName,setNewPlayerName]=useState("");
  const [newPlayerNick,setNewPlayerNick]=useState("");
  const [claimError,setClaimError]=useState("");
  // Sidebar and view management
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [sidebarView,setSidebarView]=useState(null); // null | "profile" | "h2h" | "settings"
  // Settings/Profile panel (reused for both)
  const [editDisplayName,setEditDisplayName]=useState("");
  const [profileSaving,setProfileSaving]=useState(false);
  const [profileMsg,setProfileMsg]=useState("");
  // H2H view state
  const [h2hPlayer1,setH2hPlayer1]=useState(null);
  const [h2hPlayer2,setH2hPlayer2]=useState(null);

  // Load league data from Supabase
  useEffect(()=>{
    loadLeagueData();

    // S1-05: Supabase Realtime — subscribe to changes for live cross-device sync
    const channel = supabase.channel(`league-${leagueId}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"matches",filter:`league_id=eq.${leagueId}`},()=>loadLeagueData())
      .on("postgres_changes",{event:"*",schema:"public",table:"players",filter:`league_id=eq.${leagueId}`},()=>loadLeagueData())
      .on("postgres_changes",{event:"*",schema:"public",table:"seasons",filter:`league_id=eq.${leagueId}`},()=>loadLeagueData())
      .on("postgres_changes",{event:"*",schema:"public",table:"league_members",filter:`league_id=eq.${leagueId}`},()=>loadLeagueData())
      .on("postgres_changes",{event:"*",schema:"public",table:"tournaments",filter:`league_id=eq.${leagueId}`},()=>loadLeagueData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

      // Check if current user has claimed a player in this league
      const claimed = (playersData||[]).find(p => p.user_id === user.id);
      setClaimedPlayer(claimed || null);

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

  // Leaderboard — S1-01: Only show players with 1+ games played (hide 0-game players entirely)
  const lb = useMemo(()=>{
    return [...ps].filter(p=>p.games>0).sort((a,b)=>{
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

  if (loading) return <div style={{background:BG,width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:TX,fontFamily:"'Outfit',sans-serif"}}>Loading league...</div>;

  // CLAIM PLAYER SCREEN — shown if user hasn't claimed a player in this league
  const claimPlayer = async (playerId) => {
    try {
      setClaimError("");
      const {error:err} = await supabase.from("players").update({user_id:user.id}).eq("id",playerId).is("user_id",null);
      if(err) throw err;
      await loadLeagueData();
    } catch(err) { setClaimError(err.message||"Failed to claim player"); }
  };

  const createAndClaimPlayer = async () => {
    if(!newPlayerName.trim()) { setClaimError("Name required"); return; }
    try {
      setClaimError("");
      const {data,error:err} = await supabase.from("players").insert({league_id:leagueId,name:newPlayerName.trim(),nickname:newPlayerNick.trim()||null,user_id:user.id}).select().single();
      if(err) throw err;
      setNewPlayerName("");setNewPlayerNick("");
      await loadLeagueData();
    } catch(err) { setClaimError(err.message||"Failed to create player"); }
  };

  if (claimedPlayer === null) {
    const unclaimed = players.filter(p => !p.user_id);
    return (
      <div style={{background:BG,minHeight:"100vh",padding:20,fontFamily:"'Outfit',sans-serif",color:TX}}>
        <div style={{maxWidth:420,margin:"0 auto",paddingTop:20}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <PadelLogoSmall/>
            <h1 style={{fontSize:20,fontWeight:900,letterSpacing:2,marginTop:8}}><span style={{color:A}}>Padel</span>Hub</h1>
            <p style={{color:MT,fontSize:11,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginTop:6}}>Welcome to {league?.name}</p>
          </div>

          <h2 style={{fontSize:16,fontWeight:700,marginBottom:4}}>Who are you?</h2>
          <p style={{fontSize:12,color:MT,marginBottom:16,lineHeight:1.5}}>Select your player name to link your account, or create a new one if you're not listed.</p>

          {/* Unclaimed players */}
          {unclaimed.length > 0 && (
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Existing Players</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {unclaimed.map(p=>(
                  <button key={p.id} onClick={()=>claimPlayer(p.id)} style={{padding:"12px 16px",background:CD,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span>{p.nickname||p.name}{p.nickname?` (${p.name})`:""}</span>
                    <span style={{fontSize:11,color:A,fontWeight:700}}>That's me →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create new player */}
          <div style={{padding:16,background:CD,border:`1px solid ${BD}`,borderRadius:14}}>
            <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>I'm not listed — create my profile</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <input value={newPlayerName} onChange={e=>setNewPlayerName(e.target.value)} placeholder="Full name" style={{padding:"10px 14px",background:CD2,border:`1px solid ${BD}`,borderRadius:10,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
              <input value={newPlayerNick} onChange={e=>setNewPlayerNick(e.target.value)} placeholder="Nickname (optional)" style={{padding:"10px 14px",background:CD2,border:`1px solid ${BD}`,borderRadius:10,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
              <button onClick={createAndClaimPlayer} style={{padding:"12px",background:`linear-gradient(135deg,${A},${A}cc)`,border:"none",borderRadius:12,color:"#000",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textTransform:"uppercase",letterSpacing:1}}>Join as New Player</button>
            </div>
          </div>

          {claimError && <div style={{marginTop:14,color:DG,fontSize:12,padding:"10px 14px",background:`${DG}15`,borderRadius:10,border:`1px solid ${DG}30`}}>{claimError}</div>}

          <button onClick={()=>setSelectedLeagueId(null)} style={{marginTop:16,width:"100%",padding:"10px",background:"transparent",border:`1px solid ${BD}`,borderRadius:10,color:MT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back to Leagues</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))",fontFamily:"'Outfit',sans-serif",color:TX}}>
      {/* HEADER — Line 1: PadelHub branding, Line 2: League | Season */}
      <div style={{background:CD,borderBottom:`1px solid ${BD}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <PadelLogoSmall/>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <h1 style={{fontSize:"16px",fontWeight:900,margin:0,letterSpacing:1,fontFamily:"'Outfit',sans-serif"}}><span style={{color:TX}}>Padel</span><span style={{color:A}}>Hub</span></h1>
            </div>
            <p style={{fontSize:"10px",color:MT,margin:"2px 0 0 0",fontWeight:500}}>
              {league?.name||"League"}{seasons.find(s=>s.active) ? ` | ${seasons.find(s=>s.active).name}` : ""}
            </p>
          </div>
        </div>
        {/* User avatar — opens sidebar */}
        <button
          onClick={()=>{setSidebarOpen(!sidebarOpen);setSidebarView(null);setEditDisplayName(user.user_metadata?.display_name||user.email?.split("@")[0]||"");setProfileMsg("");}}
          style={{
            width:36,height:36,borderRadius:"50%",
            background:sidebarOpen?A:`${A}20`,
            border:sidebarOpen?`2px solid ${A}`:`2px solid ${A}40`,
            color:sidebarOpen?"#000":A,
            fontSize:14,fontWeight:800,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"'Outfit',sans-serif",transition:"all 0.2s",
          }}
          title="Profile & Settings"
        >
          {(user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
        </button>
      </div>

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={()=>setSidebarOpen(false)}
          style={{
            position:"fixed",top:0,left:0,right:0,bottom:0,
            background:"rgba(0,0,0,0.5)",zIndex:98,
          }}
        />
      )}

      {/* SIDEBAR */}
      <div style={{
        position:"fixed",top:0,right:0,width:320,height:"100vh",
        background:CD,borderLeft:`1px solid ${BD}`,
        zIndex:99,
        transform:sidebarOpen?"translateX(0)":"translateX(100%)",
        transition:"transform 0.3s ease-in-out",
        display:"flex",flexDirection:"column",
        boxShadow:sidebarOpen?"0 0 20px rgba(0,0,0,0.5)":"none",
        overflow:"auto",
      }}>
        {/* Header with user info */}
        <div style={{padding:"20px 16px",borderBottom:`1px solid ${BD}`}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:`${A}20`,border:`2px solid ${A}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:A}}>
              {(user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:TX}}>{user.user_metadata?.display_name||user.email?.split("@")[0]||"User"}</div>
              <div style={{fontSize:10,color:MT,marginTop:2}}>{user.email}</div>
            </div>
          </div>
        </div>

        {/* Sidebar content */}
        <div style={{flex:1,padding:"16px",overflow:"auto"}}>
          {/* User section */}
          <div>
            <button onClick={()=>{setSidebarView("profile");}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              My Profile
            </button>
            <button onClick={()=>{setSidebarView("h2h");}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              Head-to-Head
            </button>
            <button onClick={()=>{setSidebarView(null);setTab("stats");setSidebarOpen(false);}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              My Stats
            </button>
          </div>

          {/* Divider */}
          <div style={{height:"1px",background:BD,margin:"12px 0"}} />

          {/* League section */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",paddingLeft:16,marginBottom:8}}>League</div>
            <div style={{padding:"12px 16px",background:CD2,borderRadius:8,marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:600,color:TX,display:"flex",alignItems:"center",gap:6}}>
                {league?.name||"—"}
                {isAdmin && <span style={{fontSize:9,color:A,fontWeight:700,background:`${A}20`,padding:"2px 6px",borderRadius:4}}>Admin</span>}
              </div>
            </div>
            <button onClick={()=>{onSwitchLeague();}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              Switch League
            </button>
            <button onClick={()=>{const code=league?.invite_code;if(code){const url=`${window.location.origin}${window.location.pathname}?invite=${code}`;if(navigator.share)navigator.share({title:"Join my PadelHub league",text:`Join "${league?.name}" on PadelHub!`,url});else{navigator.clipboard.writeText(url);alert("Invite link copied!");}}}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              Invite Players
            </button>
          </div>

          {/* Divider */}
          <div style={{height:"1px",background:BD,margin:"12px 0"}} />

          {/* App section */}
          <div>
            <div style={{fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",paddingLeft:16,marginBottom:8}}>App</div>
            <button onClick={()=>{setSidebarView("settings");}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              Settings
            </button>
          </div>
        </div>

        {/* Sign Out button at bottom */}
        <div style={{padding:"16px",borderTop:`1px solid ${BD}`}}>
          <button onClick={async()=>{await supabase.auth.signOut();}} style={{width:"100%",padding:"12px",background:`${DG}15`,border:`1px solid ${DG}40`,borderRadius:8,color:DG,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
            Sign Out
          </button>
        </div>
      </div>

      {/* SIDEBAR VIEWS - only show if sidebarView is active */}
      {sidebarView && (
        <div style={{padding:"0"}}>
          {/* PROFILE VIEW */}
          {sidebarView==="profile" && (
            <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
              <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

              {/* Profile Card */}
              <div style={{textAlign:"center",marginBottom:24}}>
                <div style={{width:80,height:80,borderRadius:"50%",background:`${A}20`,border:`3px solid ${A}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,fontWeight:800,color:A,margin:"0 auto 12px"}}>
                  {(user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
                </div>
                <h2 style={{fontSize:18,fontWeight:700,margin:0,color:TX}}>{user.user_metadata?.display_name||user.email?.split("@")[0]||"User"}</h2>
                <p style={{fontSize:12,color:MT,margin:"4px 0 0 0"}}>{user.email}</p>
                {claimedPlayer && <div style={{fontSize:11,color:A,marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                  <span>{isAdmin?"👤 Admin":"👤 Member"}</span>
                </div>}
              </div>

              {/* Career Stats Grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:24}}>
                {claimedPlayer && ps.filter(p=>p.id===claimedPlayer.id).map(p=>(
                  <React.Fragment key={p.id}>
                    <div style={{background:CD2,padding:12,borderRadius:8,textAlign:"center"}}>
                      <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>Wins</div>
                      <div style={{fontSize:20,fontWeight:800,color:A}}>{p.wins}</div>
                    </div>
                    <div style={{background:CD2,padding:12,borderRadius:8,textAlign:"center"}}>
                      <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>Losses</div>
                      <div style={{fontSize:20,fontWeight:800,color:A}}>{p.losses}</div>
                    </div>
                    <div style={{background:CD2,padding:12,borderRadius:8,textAlign:"center"}}>
                      <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>ELO</div>
                      <div style={{fontSize:20,fontWeight:800,color:A}}>{Math.round(elo[p.id]||1500)}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Win Rate Progress */}
              {claimedPlayer && ps.filter(p=>p.id===claimedPlayer.id).map(p=>(
                <React.Fragment key={p.id}>
                  <div style={{marginBottom:24}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <label style={{fontSize:12,fontWeight:600,color:TX}}>Win Rate</label>
                      <span style={{fontSize:12,fontWeight:700,color:A}}>{Math.round(p.winRate*100)}%</span>
                    </div>
                    <div style={{width:"100%",height:8,background:CD2,borderRadius:4,overflow:"hidden"}}>
                      <div style={{width:`${Math.max(p.winRate*100,5)}%`,height:"100%",background:A,transition:"width 0.3s"}}/>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24}}>
                    <div style={{background:CD2,padding:12,borderRadius:8}}>
                      <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>Best Streak</div>
                      <div style={{fontSize:16,fontWeight:800,color:A}}>{getStreak(p.id)} wins</div>
                    </div>
                    <div style={{background:CD2,padding:12,borderRadius:8}}>
                      <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>MOTM Awards</div>
                      <div style={{fontSize:16,fontWeight:800,color:A}}>{p.motm}</div>
                    </div>
                  </div>

                  {/* ELO History */}
                  <div style={{marginBottom:24}}>
                    <h3 style={{fontSize:13,fontWeight:700,color:TX,marginBottom:12}}>ELO History</h3>
                    <div style={{display:"flex",alignItems:"flex-end",gap:2,height:100,background:CD2,padding:8,borderRadius:8}}>
                      {(() => {
                        const pMatches = matches.filter(m=>m.team_a.includes(p.id)||m.team_b.includes(p.id)).sort((a,b)=>new Date(a.date)-new Date(b.date));
                        const eloHistory = [];
                        let currentElo = 1500;
                        pMatches.forEach(m => {
                          const allElo = calcElo(players, matches.filter(mm => new Date(mm.date) <= new Date(m.date)));
                          eloHistory.push(allElo[p.id] || 1500);
                        });
                        const minElo = Math.min(...eloHistory, 1500);
                        const maxElo = Math.max(...eloHistory, 1500);
                        const range = maxElo - minElo || 1;
                        return eloHistory.slice(-10).map((e, i) => (
                          <div key={i} style={{flex:1,background:A,borderRadius:2,height:`${((e-minElo)/range)*100}%`,minHeight:4,opacity:0.8}}/>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Achievements */}
                  <div style={{marginBottom:24}}>
                    <h3 style={{fontSize:13,fontWeight:700,color:TX,marginBottom:12}}>Achievements</h3>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {ACHS.map(a => {
                        const earned = a.ck(p);
                        return (
                          <div key={a.id} style={{padding:10,background:earned?CD2:`${CD2}80`,borderRadius:8,opacity:earned?1:0.5}}>
                            <div style={{fontSize:20,marginBottom:4}}>{a.icon}</div>
                            <div style={{fontSize:11,fontWeight:600,color:TX}}>{a.name}</div>
                            {!earned && <div style={{fontSize:9,color:MT}}>🔒</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Matches */}
                  <div style={{marginBottom:24}}>
                    <h3 style={{fontSize:13,fontWeight:700,color:TX,marginBottom:12}}>Recent Matches</h3>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {matches.filter(m=>m.team_a.includes(p.id)||m.team_b.includes(p.id)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(m => {
                        const w = win(m.sets);
                        const pTeam = m.team_a.includes(p.id)?"A":"B";
                        const won = w === pTeam;
                        return (
                          <div key={m.id} style={{padding:10,background:CD2,borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
                            <div style={{fontSize:11,fontWeight:700,color:won?A:DG,background:won?`${A}15`:`${DG}15`,padding:"4px 8px",borderRadius:4,minWidth:36,textAlign:"center"}}>
                              {won?"W":"L"}
                            </div>
                            <div style={{flex:1,fontSize:11}}>
                              <div style={{fontWeight:600,color:TX}}>{getName(m.team_a[0])} & {getName(m.team_a[1])} vs {getName(m.team_b[0])} & {getName(m.team_b[1])}</div>
                              <div style={{color:MT,fontSize:10,marginTop:2}}>{m.sets.map((s,i)=>`${s[0]}-${s[1]}`).join(", ")}</div>
                            </div>
                            <div style={{fontSize:9,color:MT}}>{new Date(m.date).toLocaleDateString()}</div>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={()=>{setSidebarView(null);setTab("history");}} style={{width:"100%",marginTop:12,padding:"10px",background:"transparent",border:`1px solid ${BD}`,borderRadius:8,color:A,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                      View All Matches
                    </button>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* H2H VIEW */}
          {sidebarView==="h2h" && (
            <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
              <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

              <h2 style={{fontSize:18,fontWeight:700,marginBottom:16,color:TX}}>Head-to-Head</h2>

              {/* Player Selectors */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                <div>
                  <label style={{display:"block",fontSize:11,color:MT,fontWeight:600,marginBottom:6}}>Player 1</label>
                  <select value={h2hPlayer1||""} onChange={(e)=>setH2hPlayer1(e.target.value||null)} style={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",cursor:"pointer"}}>
                    <option value="">Select player</option>
                    {ps.map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,color:MT,fontWeight:600,marginBottom:6}}>Player 2</label>
                  <select value={h2hPlayer2||""} onChange={(e)=>setH2hPlayer2(e.target.value||null)} style={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",cursor:"pointer"}}>
                    <option value="">Select player</option>
                    {ps.map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
                  </select>
                </div>
              </div>

              {h2hPlayer1 && h2hPlayer2 && (
                <>
                  {(() => {
                    const p1 = ps.find(p=>p.id===h2hPlayer1);
                    const p2 = ps.find(p=>p.id===h2hPlayer2);
                    const h2hMatches = matches.filter(m=>(m.team_a.includes(h2hPlayer1)&&m.team_b.includes(h2hPlayer2))||(m.team_a.includes(h2hPlayer2)&&m.team_b.includes(h2hPlayer1)));
                    const p1Wins = h2hMatches.filter(m=>{const w=win(m.sets);return (m.team_a.includes(h2hPlayer1)&&w==="A")||(m.team_b.includes(h2hPlayer1)&&w==="B");}).length;
                    const p2Wins = h2hMatches.length - p1Wins;

                    const partnerMatches = matches.filter(m=>(m.team_a.includes(h2hPlayer1)&&m.team_a.includes(h2hPlayer2))||(m.team_b.includes(h2hPlayer1)&&m.team_b.includes(h2hPlayer2)));
                    const opponentMatches = matches.filter(m=>(m.team_a.includes(h2hPlayer1)&&m.team_b.includes(h2hPlayer2))||(m.team_a.includes(h2hPlayer2)&&m.team_b.includes(h2hPlayer1)));

                    return (
                      <>
                        {/* H2H Card */}
                        <div style={{background:CD2,padding:16,borderRadius:12,marginBottom:20,textAlign:"center"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:12}}>
                            <div style={{width:48,height:48,borderRadius:"50%",background:`${A}20`,border:`2px solid ${A}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:A}}>
                              {(p1?.name||"?")[0]}
                            </div>
                            <div style={{fontSize:16,fontWeight:700,color:TX}}>{p1Wins} - {p2Wins}</div>
                            <div style={{width:48,height:48,borderRadius:"50%",background:`${A}20`,border:`2px solid ${A}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:A}}>
                              {(p2?.name||"?")[0]}
                            </div>
                          </div>
                          <div style={{width:"100%",height:4,background:CD,borderRadius:2,overflow:"hidden",marginBottom:8}}>
                            <div style={{width:`${h2hMatches.length>0?(p1Wins/h2hMatches.length)*100:50}%`,height:"100%",background:A}}/>
                          </div>
                          <div style={{fontSize:11,color:MT}}>All-time record ({h2hMatches.length} matches)</div>
                        </div>

                        {/* As Partners vs As Opponents */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                          <div style={{background:CD2,padding:12,borderRadius:8}}>
                            <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:8}}>As Partners</div>
                            {partnerMatches.length > 0 ? (
                              <div>
                                {(() => {
                                  const pWins = partnerMatches.filter(m=>{const w=win(m.sets);return (m.team_a.includes(h2hPlayer1)&&w==="A")||(m.team_b.includes(h2hPlayer1)&&w==="B");}).length;
                                  const pLoss = partnerMatches.length - pWins;
                                  return <div style={{fontSize:13,fontWeight:700,color:A}}>{pWins}W - {pLoss}L</div>;
                                })()}
                              </div>
                            ) : <div style={{fontSize:12,color:MT}}>No matches</div>}
                          </div>
                          <div style={{background:CD2,padding:12,borderRadius:8}}>
                            <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:8}}>As Opponents</div>
                            {opponentMatches.length > 0 ? (
                              <div>
                                {(() => {
                                  const oWins = opponentMatches.filter(m=>{const w=win(m.sets);return (m.team_a.includes(h2hPlayer1)&&w==="A")||(m.team_b.includes(h2hPlayer1)&&w==="B");}).length;
                                  const oLoss = opponentMatches.length - oWins;
                                  return <div style={{fontSize:13,fontWeight:700,color:A}}>{oWins}W - {oLoss}L</div>;
                                })()}
                              </div>
                            ) : <div style={{fontSize:12,color:MT}}>No matches</div>}
                          </div>
                        </div>

                        {/* Last 5 Encounters */}
                        {h2hMatches.length > 0 && (
                          <div>
                            <h3 style={{fontSize:13,fontWeight:700,color:TX,marginBottom:12}}>Last 5 Encounters</h3>
                            <div style={{display:"flex",flexDirection:"column",gap:8}}>
                              {h2hMatches.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(m=>{
                                const w=win(m.sets);
                                const p1Won=(m.team_a.includes(h2hPlayer1)&&w==="A")||(m.team_b.includes(h2hPlayer1)&&w==="B");
                                return (
                                  <div key={m.id} style={{padding:10,background:CD,borderRadius:8}}>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                                      <span style={{fontSize:11,fontWeight:600,color:p1Won?A:DG}}>{p1Won?"✓ Won":"✗ Lost"}</span>
                                      <span style={{fontSize:10,color:MT}}>{new Date(m.date).toLocaleDateString()}</span>
                                    </div>
                                    <div style={{fontSize:10,color:TX}}>
                                      {m.sets.map((s,i)=>`${s[0]}-${s[1]}`).join(" ")}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* SETTINGS VIEW */}
          {sidebarView==="settings" && (
            <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
              <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

              <h2 style={{fontSize:18,fontWeight:700,marginBottom:20,color:TX}}>Settings</h2>

              {/* Account Section */}
              <div style={{marginBottom:24}}>
                <h3 style={{fontSize:12,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Account</h3>

                <div style={{marginBottom:12}}>
                  <label style={{display:"block",color:MT,fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Display Name</label>
                  <div style={{display:"flex",gap:8}}>
                    <input type="text" value={editDisplayName} onChange={(e)=>setEditDisplayName(e.target.value)} placeholder="Your name" style={{flex:1,padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
                    <button onClick={async()=>{if(!editDisplayName.trim())return;setProfileSaving(true);setProfileMsg("");try{const {error:err}=await supabase.auth.updateUser({data:{display_name:editDisplayName.trim()}});if(err)throw err;await supabase.from("profiles").update({display_name:editDisplayName.trim()}).eq("id",user.id);if(claimedPlayer){await supabase.from("players").update({name:editDisplayName.trim()}).eq("id",claimedPlayer.id);await loadLeagueData();}setProfileMsg("Saved!");setTimeout(()=>setProfileMsg(""),2000);}catch(err){setProfileMsg(err.message||"Failed to update");}setProfileSaving(false);}} disabled={profileSaving} style={{padding:"10px 14px",background:A,border:"none",borderRadius:8,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:profileSaving?0.6:1}}>
                      {profileSaving?"...":"Save"}
                    </button>
                  </div>
                  {profileMsg && <div style={{fontSize:11,color:profileMsg==="Saved!"?A:DG,marginTop:4}}>{profileMsg}</div>}
                </div>

                <div style={{padding:"10px 12px",background:CD2,borderRadius:8,marginBottom:12}}>
                  <label style={{display:"block",color:MT,fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Email</label>
                  <div style={{fontSize:13,color:TX}}>{user.email}</div>
                </div>

                <div style={{padding:"10px 12px",background:CD2,borderRadius:8}}>
                  <label style={{display:"block",color:MT,fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Linked Accounts</label>
                  <div style={{fontSize:12,color:MT}}>Google: Not connected</div>
                </div>
              </div>

              {/* Notifications Section */}
              <div style={{marginBottom:24}}>
                <h3 style={{fontSize:12,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Notifications</h3>

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:CD2,borderRadius:8,marginBottom:8}}>
                  <label style={{fontSize:12,fontWeight:600,color:TX,cursor:"pointer"}}>Push Notifications</label>
                  <input type="checkbox" defaultChecked style={{cursor:"pointer"}}/>
                </div>

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:CD2,borderRadius:8,marginBottom:8}}>
                  <label style={{fontSize:12,fontWeight:600,color:TX,cursor:"pointer"}}>Ranking Changes</label>
                  <input type="checkbox" defaultChecked style={{cursor:"pointer"}}/>
                </div>

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:CD2,borderRadius:8}}>
                  <label style={{fontSize:12,fontWeight:600,color:TX,cursor:"pointer"}}>New Members</label>
                  <input type="checkbox" defaultChecked style={{cursor:"pointer"}}/>
                </div>
              </div>

              {/* League Section */}
              <div style={{marginBottom:24}}>
                <h3 style={{fontSize:12,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>League</h3>

                <button onClick={()=>{onSwitchLeague();}} style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:8}}>
                  Switch League
                </button>

                {isAdmin && (
                  <button style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                    League Settings
                  </button>
                )}
              </div>

              {/* Version */}
              <div style={{textAlign:"center",paddingTop:20,borderTop:`1px solid ${BD}`,marginTop:20}}>
                <div style={{fontSize:10,color:MT,fontWeight:600}}>PadelHub v2.0</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEADERBOARD TAB - only show if no sidebar view is active */}
      {!sidebarView && tab==="board"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
            <h2 style={{fontSize:"18px",fontWeight:"bold",margin:0}}>Leaderboard</h2>
            <div style={{fontSize:"12px",color:MT}}>
              {lb.length} player{lb.length!==1?"s":""}
            </div>
          </div>

          {/* S1-01: Empty state when no players have games */}
          {lb.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",background:CD,borderRadius:12,border:`1px solid ${BD}`}}>
              <div style={{fontSize:40,marginBottom:12}}>🎾</div>
              <div style={{fontSize:15,fontWeight:600,color:TX,marginBottom:6}}>No rankings yet</div>
              <div style={{fontSize:12,color:MT,lineHeight:1.5}}>Play your first match to appear on the leaderboard.</div>
            </div>
          )}

          {/* Podium (Top 3) — only when 3+ players qualified */}
          {lb.length>=3&&(
            <div style={{marginBottom:"24px",background:CD,padding:"16px",borderRadius:"8px",border:`1px solid ${BD}`}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",alignItems:"flex-end"}}>
                {/* 2nd place */}
                <div style={{textAlign:"center",padding:"12px",background:CD2,borderRadius:"6px",borderTop:`3px solid ${SV}`}}>
                  <div style={{fontSize:"20px",marginBottom:"4px"}}>🥈</div>
                  <div style={{fontSize:"13px",fontWeight:"bold",marginBottom:"4px"}}>{lb[1].nickname||lb[1].name}</div>
                  <div style={{fontSize:"11px",color:MT}}>{lb[1].wins}W {lb[1].losses}L</div>
                  <div style={{fontSize:"12px",color:A,fontWeight:"bold",marginTop:"4px"}}>{Math.round(elo[lb[1].id]||1500)}</div>
                </div>

                {/* 1st place */}
                <div style={{textAlign:"center",padding:"16px",background:CD2,borderRadius:"6px",borderTop:`3px solid ${GD}`,transform:"scale(1.05)"}}>
                  <div style={{fontSize:"28px",marginBottom:"6px"}}>🥇</div>
                  <div style={{fontSize:"14px",fontWeight:"bold",marginBottom:"6px"}}>{lb[0].nickname||lb[0].name}</div>
                  <div style={{fontSize:"12px",color:MT}}>{lb[0].wins}W {lb[0].losses}L</div>
                  <div style={{fontSize:"13px",color:GD,fontWeight:"bold",marginTop:"6px"}}>{Math.round(elo[lb[0].id]||1500)}</div>
                </div>

                {/* 3rd place */}
                <div style={{textAlign:"center",padding:"12px",background:CD2,borderRadius:"6px",borderTop:`3px solid ${BZ}`}}>
                  <div style={{fontSize:"20px",marginBottom:"4px"}}>🥉</div>
                  <div style={{fontSize:"13px",fontWeight:"bold",marginBottom:"4px"}}>{lb[2].nickname||lb[2].name}</div>
                  <div style={{fontSize:"11px",color:MT}}>{lb[2].wins}W {lb[2].losses}L</div>
                  <div style={{fontSize:"12px",color:BZ,fontWeight:"bold",marginTop:"4px"}}>{Math.round(elo[lb[2].id]||1500)}</div>
                </div>
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
      {!sidebarView && tab==="log"&&selectedSeason&&(
        <LogMatch
          players={players}
          matches={matches}
          supabase={supabase}
          leagueId={leagueId}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          em={editingMatch}
          setEm={setEditingMatch}
          goBack={()=>setTab("history")}
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
      {!sidebarView && tab==="history"&&(
        <MatchHistory
          matches={matches}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          players={players}
          onEdit={(m)=>{setEditingMatch(m);setTab("log");}}
          supabase={supabase}
          isAdmin={isAdmin}
          getName={getName}
          shareMatch={shareMatch}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
          onMatchDeleted={loadLeagueData}
        />
      )}

      {/* COMBOS TAB */}
      {!sidebarView && tab==="combos"&&(
        <CombosView
          combos={combos}
          players={players}
          fm={matches}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          getName={getName}
        />
      )}

      {/* PLAYERS TAB */}
      {!sidebarView && tab==="stats"&&(
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
      {!sidebarView && tab==="gamemode"&&(
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
      {!sidebarView && tab==="rules"&&<div className="fu">
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

      {/* BOTTOM NAV — Original layout: 3 left tabs + center "+" button + 3 right tabs */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:`${CD}f0`,backdropFilter:"blur(20px)",borderTop:`1px solid ${BD}`,display:"flex",justifyContent:"space-around",alignItems:"flex-end",padding:`4px 0 env(safe-area-inset-bottom, 6px)`,zIndex:100}}>
        {TL.map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)} style={{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:1,color:tab===t.key?A:MT,cursor:"pointer",padding:"5px 6px",flex:1}}>
            <span style={{fontSize:16}}>{t.icon==="court"?<CourtIcon/>:t.icon}</span><span style={{fontSize:8,fontWeight:600}}>{t.label}</span>
          </button>
        ))}
        <button onClick={()=>{setEditingMatch(null);setTab("log");}} style={{width:56,height:56,borderRadius:"50%",border:"none",background:`linear-gradient(135deg,${A},${A}cc)`,color:BG,fontSize:30,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:-20,boxShadow:`0 4px 20px ${A}40`,flexShrink:0,lineHeight:1}}>+</button>
        {TR.map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)} style={{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:1,color:tab===t.key?A:MT,cursor:"pointer",padding:"5px 6px",flex:1}}>
            <span style={{fontSize:16}}>{t.icon}</span><span style={{fontSize:8,fontWeight:600}}>{t.label}</span>
          </button>
        ))}
      </div>

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
  // S1-03: Fix combos — sort best by win rate desc, worst by win rate asc
  // Only show worst when 6+ unique combos exist to prevent overlap with top 3
  const activeCombos=combos.filter(c=>c.games>=1);
  const sortedByWinRate=[...activeCombos].sort((a,b)=>{
    const pA=a.games>0?a.wins/a.games:0, pB=b.games>0?b.wins/b.games:0;
    if(pB!==pA)return pB-pA;
    return b.games-a.games;
  });
  const top3=sortedByWinRate.slice(0,3);
  const top3Keys=new Set(top3.map(c=>c.players.slice().sort().join(",")));
  // Worst: sort ascending by win rate, exclude any that appear in top 3
  const worstCandidates=[...activeCombos]
    .filter(c=>!top3Keys.has(c.players.slice().sort().join(",")))
    .sort((a,b)=>{
      const pA=a.games>0?a.wins/a.games:0, pB=b.games>0?b.wins/b.games:0;
      if(pA!==pB)return pA-pB;
      return b.games-a.games;
    });
  const worst3=activeCombos.length>=6?worstCandidates.slice(0,3):[];
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

        {worst3.length>0&&<div style={{marginTop:16}}>
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
          {(leagueId,switchLeague)=><AppContent leagueId={leagueId} user={user} onSwitchLeague={switchLeague}/>}
        </LeagueGate>
      )}
    </AuthGate>
  );
}
