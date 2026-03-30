import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from "react";
import { supabase } from './supabase';
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, BL, PU, TL, TR } from './theme';
import { formatTeam, win, formatDate, gid } from './utils/helpers';
import { calcElo } from './utils/elo';
import { generateAmericanoSchedule, generateMexicanoRound } from './utils/tournaments';
import { ACHS } from './data/achievements';
import { RULES, ARGUED } from './data/rules';
import { CourtIcon, PadelLogo, PadelLogoSmall } from './components/icons';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FD } from './components/FormDots';
import { VAPID_PUBLIC_KEY } from './vapidPublicKey';

// Convert VAPID public key from base64 URL to Uint8Array (required by pushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}
import { AuthGate } from './components/AuthGate';
import { LeagueGate } from './components/LeagueGate';
import { LogMatch } from './components/LogMatch';
const PlayerStats = lazy(() => import('./components/PlayerStats').then(m => ({default: m.PlayerStats})));
import { ScheduleView } from './components/ScheduleView';
import { MatchHistory } from './components/MatchHistory';
const CombosView = lazy(() => import('./components/CombosView').then(m => ({default: m.CombosView})));
const GameMode = lazy(() => import('./components/GameMode').then(m => ({default: m.GameMode})));


// Lazy loading fallback
const LazyFallback = () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',padding:40,color:'#7a7a8e'}}>Loading...</div>;
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
  // FT-05: Challenges/Scheduling
  const [challenges,setChallenges]=useState([]);
  const [matchSubTab,setMatchSubTab]=useState("history"); // history | schedule
  const [claimedPlayer,setClaimedPlayer]=useState(undefined); // undefined=loading, null=unclaimed, object=claimed
  const [adminEditId,setAdminEditId]=useState(null);
  const [adminEditName,setAdminEditName]=useState("");
  const [confirmDeactivate,setConfirmDeactivate]=useState(null);
  const [confirmRegenCode,setConfirmRegenCode]=useState(false);
  const [adminLoading,setAdminLoading]=useState(null);
  const [newPlayerName,setNewPlayerName]=useState("");
  const [newPlayerNick,setNewPlayerNick]=useState("");
  const [claimError,setClaimError]=useState("");
  // Sidebar and view management
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [sidebarView,setSidebarView]=useState(null); // null | "profile" | "settings" | "admin"
  // Settings/Profile panel (reused for both)
  const [editDisplayName,setEditDisplayName]=useState("");
  const [profileSaving,setProfileSaving]=useState(false);
  const [profileMsg,setProfileMsg]=useState("");
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [avatarUploading,setAvatarUploading]=useState(false);

  // FT-03: Load avatar URL from profiles table
  useEffect(()=>{
    (async()=>{
      const {data}=await supabase.from("profiles").select("avatar_url").eq("id",user.id).single();
      if(data?.avatar_url)setAvatarUrl(data.avatar_url);
    })();
  },[user.id]);

  // FT-03: Upload avatar (resize to 200x200, upload to storage, save URL)
  const uploadAvatar=async(file)=>{
    if(!file)return;
    setAvatarUploading(true);
    try{
      // Read file as data URL (works for all image formats including HEIF on iOS)
      const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
      const canvas=document.createElement("canvas");
      canvas.width=200;canvas.height=200;
      const ctx=canvas.getContext("2d");
      const img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error("Failed to load image"));img.src=dataUrl;});
      if(!img.width||!img.height)throw new Error("Invalid image dimensions");
      const s=Math.min(img.width,img.height);
      const sx=(img.width-s)/2,sy=(img.height-s)/2;
      ctx.drawImage(img,sx,sy,s,s,0,0,200,200);
      const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",0.85));
      const path=`${user.id}/avatar.jpg`;
      const {error:upErr}=await supabase.storage.from("avatars").upload(path,blob,{upsert:true,contentType:"image/jpeg"});
      if(upErr)throw upErr;
      const {data:{publicUrl}}=supabase.storage.from("avatars").getPublicUrl(path);
      const url=publicUrl+"?t="+Date.now();
      await supabase.from("profiles").update({avatar_url:url}).eq("id",user.id);
      setAvatarUrl(url);
      showToast("Photo updated!");
    }catch(err){
      showToast("Failed to upload photo","error");
    }
    setAvatarUploading(false);
  };

  const removeAvatar=async()=>{
    try{
      await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
      await supabase.from("profiles").update({avatar_url:null}).eq("id",user.id);
      setAvatarUrl(null);
      showToast("Photo removed");
    }catch(err){showToast("Failed to remove photo","error");}
  };

  // Notifications toggle state
  const [notifNewMatch,setNotifNewMatch]=useState(()=>JSON.parse(localStorage.getItem("notif_new_match")??'true'));
  const [notifRankingChange,setNotifRankingChange]=useState(()=>JSON.parse(localStorage.getItem("notif_ranking")??'true'));
  const [notifNewMembers,setNotifNewMembers]=useState(()=>JSON.parse(localStorage.getItem("notif_members")??'true'));
  const [notifChallenges,setNotifChallenges]=useState(()=>JSON.parse(localStorage.getItem("notif_challenges")??'true'));
  const [pushSubscribed,setPushSubscribed]=useState(false);

  // Check if user already has a push subscription on mount
  useEffect(()=>{
    (async()=>{
      if(!("serviceWorker" in navigator)||!("PushManager" in window))return;
      try{
        const reg=await navigator.serviceWorker.ready;
        const sub=await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      }catch(e){/* push check — non-critical */}
    })();
  },[]);
  // Admin Management state
  const [leagueMembers,setLeagueMembers]=useState([]);
  const [memberProfiles,setMemberProfiles]=useState({});
  // Toast notification system
  const [toast,setToast]=useState(null);
  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  // PWA install prompt
  const [installPrompt,setInstallPrompt]=useState(null);
  useEffect(()=>{const h=(e)=>{e.preventDefault();setInstallPrompt(e);};window.addEventListener("beforeinstallprompt",h);return ()=>window.removeEventListener("beforeinstallprompt",h);},[]);
  const handleInstall=async()=>{if(!installPrompt)return;installPrompt.prompt();const r=await installPrompt.userChoice;if(r.outcome==="accepted")setInstallPrompt(null);};

  // GN-09: Scroll to top on tab change
  useEffect(()=>{window.scrollTo({top:0,behavior:"smooth"});},[tab]);

  // GN-06: Keyboard viewport fix — prevent content pushing off screen on mobile
  useEffect(()=>{
    if(!window.visualViewport)return;
    const onResize=()=>{document.documentElement.style.setProperty("--vh",`${window.visualViewport.height*0.01}px`);};
    window.visualViewport.addEventListener("resize",onResize);onResize();
    return ()=>window.visualViewport.removeEventListener("resize",onResize);
  },[]);

  // GN-17: Session expiry handling — listen for auth errors and redirect to login
  useEffect(()=>{
    const {data:{subscription}}=supabase.auth.onAuthStateChange((evt)=>{
      if(evt==="SIGNED_OUT"||evt==="TOKEN_REFRESHED"){/* handled by parent AuthGate */}
    });
    return ()=>subscription?.unsubscribe();
  },[]);

  // Browser back button support — push state on tab/view changes, pop to go back
  const prevTab=useRef(tab);
  const prevView=useRef(sidebarView);
  useEffect(()=>{
    if(tab!==prevTab.current||sidebarView!==prevView.current){
      window.history.pushState({tab,sidebarView,sidebarOpen},"");
      prevTab.current=tab;prevView.current=sidebarView;
    }
  },[tab,sidebarView]);
  useEffect(()=>{
    const onPop=(e)=>{
      if(e.state){setTab(e.state.tab||"board");setSidebarView(e.state.sidebarView||null);setSidebarOpen(!!e.state.sidebarOpen);}
      else{setSidebarView(null);setSidebarOpen(false);setTab("board");}
    };
    window.addEventListener("popstate",onPop);
    return ()=>window.removeEventListener("popstate",onPop);
  },[]);

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

      // PA-04: Parallelize all independent queries
      const [
        {data:leagueData,error:leagueErr},
        {data:memberData},
        {data:membersData},
        {data:playersData,error:playersErr},
        {data:matchesData,error:matchesErr},
        {data:seasonsData,error:seasonsErr},
        {data:tournamentsData,error:tournamentsErr},
        {data:challengesData}
      ] = await Promise.all([
        supabase.from("leagues").select("*").eq("id",leagueId).single(),
        supabase.from("league_members").select("role").eq("league_id",leagueId).eq("user_id",user.id).single(),
        supabase.from("league_members").select("user_id,role,profiles(id,email,user_metadata)").eq("league_id",leagueId),
        supabase.from("players").select("*").eq("league_id",leagueId).order("name"),
        supabase.from("matches").select("*").eq("league_id",leagueId).order("date",{ascending:false}),
        supabase.from("seasons").select("*").eq("league_id",leagueId).order("start_date"),
        supabase.from("tournaments").select("*").eq("league_id",leagueId).order("created_at"),
        supabase.from("challenges").select("*").eq("league_id",leagueId).in("status",["open","confirmed","played"]).order("date",{ascending:true})
      ]);

      if (leagueErr) throw leagueErr;
      setLeague(leagueData);
      setIsAdmin(memberData?.role==="admin" || leagueData?.created_by === user.id);

      if(membersData){
        setLeagueMembers(membersData);
        const profiles = {};
        membersData.forEach(m => {
          if(m.profiles) profiles[m.user_id] = m.profiles;
        });
        setMemberProfiles(profiles);
      }

      if (playersErr) throw playersErr;
      setPlayers(playersData || []);

      if (matchesErr) throw matchesErr;
      setMatches(matchesData || []);

      if (seasonsErr) throw seasonsErr;
      setSeasons(seasonsData || []);

      if (tournamentsErr) throw tournamentsErr;
      setTournaments(tournamentsData || []);
      setChallenges(challengesData||[]);

      const claimed = (playersData||[]).find(p => p.user_id === user.id);
      setClaimedPlayer(claimed || null);

      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };;

  // Helper functions
  const getName = (pid) => {
    const p = players.find(x => x.id === pid);
    return p ? (p.nickname || p.name) : "?";
  };

  // Calculate season awards
  const calculateSeasonAwards = (seasonId) => {
    const seasonMatches = matches.filter(m => m.season_id === seasonId);
    const awards = {};

    if (seasonMatches.length === 0) return awards;

    // MVP (highest ELO)
    const eloAtSeason = calcElo(players, seasonMatches);
    const mvpPlayer = Object.entries(eloAtSeason).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
    if (mvpPlayer[0]) awards.mvp = { playerId: mvpPlayer[0], value: Math.round(mvpPlayer[1]) };

    // Most Active (most matches played)
    const matchCounts = {};
    seasonMatches.forEach(m => {
      m.team_a.forEach(p => matchCounts[p] = (matchCounts[p] || 0) + 1);
      m.team_b.forEach(p => matchCounts[p] = (matchCounts[p] || 0) + 1);
    });
    const activePlayer = Object.entries(matchCounts).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
    if (activePlayer[0]) awards.mostActive = { playerId: activePlayer[0], value: activePlayer[1] };

    // Best Partnership (pair with highest win rate, min 3 matches)
    const partnerships = {};
    seasonMatches.forEach(m => {
      const teamA = [m.team_a[0], m.team_a[1]].sort().join('-');
      const teamB = [m.team_b[0], m.team_b[1]].sort().join('-');
      partnerships[teamA] = (partnerships[teamA] || { wins: 0, total: 0 });
      partnerships[teamB] = (partnerships[teamB] || { wins: 0, total: 0 });
      partnerships[teamA].total++;
      partnerships[teamB].total++;
      const w = win(m.sets);
      if (w === 'A') partnerships[teamA].wins++;
      else partnerships[teamB].wins++;
    });
    const validPartnerships = Object.entries(partnerships).filter(([_, p]) => p.total >= 3);
    if (validPartnerships.length > 0) {
      const bestPair = validPartnerships.reduce((a, b) => (b[1].wins / b[1].total) > (a[1].wins / a[1].total) ? b : a);
      const [p1, p2] = bestPair[0].split('-');
      awards.bestPartnership = {
        playerIds: [p1, p2],
        winRate: ((bestPair[1].wins / bestPair[1].total) * 100).toFixed(0)
      };
    }

    // Most Improved (biggest ELO gain)
    if (seasonMatches.length > 0) {
      const firstMatch = seasonMatches[0];
      const eloFirstMatch = calcElo(players, [firstMatch]);
      const eloLastMatch = eloAtSeason;
      const improvements = {};
      Object.keys(eloLastMatch).forEach(pid => {
        const start = eloFirstMatch[pid] || 1500;
        const end = eloLastMatch[pid] || 1500;
        improvements[pid] = end - start;
      });
      const improvedPlayer = Object.entries(improvements).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
      if (improvedPlayer[0] && improvedPlayer[1] > 0) awards.mostImproved = { playerId: improvedPlayer[0], value: Math.round(improvedPlayer[1]) };
    }

    // Longest Win Streak
    const streaks = {};
    players.forEach(p => {
      const pMatches = seasonMatches.filter(m => m.team_a.includes(p.id) || m.team_b.includes(p.id)).sort((a, b) => new Date(a.date) - new Date(b.date));
      let currentStreak = 0;
      let maxStreak = 0;
      pMatches.forEach(m => {
        const w = win(m.sets);
        const pTeam = m.team_a.includes(p.id) ? 'A' : 'B';
        if (w === pTeam) currentStreak++;
        else currentStreak = 0;
        maxStreak = Math.max(maxStreak, currentStreak);
      });
      streaks[p.id] = maxStreak;
    });
    const streakPlayer = Object.entries(streaks).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
    if (streakPlayer[0] && streakPlayer[1] > 0) awards.longestStreak = { playerId: streakPlayer[0], value: streakPlayer[1] };

    return awards;
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

  // Update member role (admin/member toggle)
  const updateMemberRole = async (userId, newRole) => {
    try {
      const {error:err} = await supabase
        .from("league_members")
        .update({role: newRole})
        .eq("league_id", leagueId)
        .eq("user_id", userId);
      if (err) throw err;
      await loadLeagueData();
    } catch (err) {
      showToast("Failed to update member role","error");
    }
  };

  // Update player name
  const updatePlayerName = async (playerId, newName) => {
    setAdminLoading(playerId+"-rename");
    try {
      const {error:err} = await supabase
        .from("players")
        .update({name: newName})
        .eq("id", playerId);
      if (err) throw err;
      await loadLeagueData();
    } catch (err) {
      showToast("Failed to update player name","error");
    }
    setAdminLoading(null);
  };

  // Deactivate player
  const deactivatePlayer = async (playerId) => {
    setAdminLoading(playerId+"-deactivate");
    try {
      const {error:err} = await supabase
        .from("players")
        .update({active: false})
        .eq("id", playerId);
      if (err) throw err;
      await loadLeagueData();
    } catch (err) {
      showToast("Failed to deactivate player","error");
    }
    setAdminLoading(null);
  };

  // Export matches as CSV
  const exportMatchesCSV = () => {
    if (matches.length === 0) {
      showToast("No matches to export","error");
      return;
    }
    const csv = [
      ["Date", "Team A", "Team B", "Sets", "Winner"].join(","),
      ...matches.map(m => {
        const w = win(m.sets);
        const winnerTeam = w === "A" ? formatTeam(getName(m.team_a[0]),getName(m.team_a[1])) : formatTeam(getName(m.team_b[0]),getName(m.team_b[1]));
        return [
          new Date(m.date).toLocaleDateString(),
          formatTeam(getName(m.team_a[0]),getName(m.team_a[1])),
          formatTeam(getName(m.team_b[0]),getName(m.team_b[1])),
          m.sets.map(s => `${s[0]}-${s[1]}`).join(" "),
          winnerTeam
        ].map(v => `"${v}"`).join(",");
      })
    ].join("\n");

    const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${league?.name || "matches"}-export.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Regenerate invite code
  const regenerateInviteCode = async () => {
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const {error:err} = await supabase
        .from("leagues")
        .update({invite_code: newCode})
        .eq("id", leagueId);
      if (err) throw err;
      await loadLeagueData();
    } catch (err) {
      showToast("Failed to regenerate invite code","error");
    }
  };

  // Subscribe to Web Push and save subscription to Supabase
  const subscribeToPush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      showToast("Push notifications not supported on this browser","error");
      return false;
    }
    try {
      // Request permission if needed
      if ("Notification" in window && Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { showToast("Notification permission denied","error"); return false; }
      }
      if ("Notification" in window && Notification.permission === "denied") {
        showToast("Notifications blocked. Enable in browser settings.","error");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      // Save to Supabase
      const subJson = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        league_id: leagueId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        notif_new_match: notifNewMatch,
        notif_ranking: notifRankingChange,
        notif_members: notifNewMembers,
      }, { onConflict: "user_id,endpoint" });
      if (error) throw error;
      setPushSubscribed(true);
      return true;
    } catch (err) {
      showToast("Failed to enable notifications","error");
      return false;
    }
  };

  // Unsubscribe from Web Push and remove from Supabase
  const unsubscribeFromPush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
      }
      setPushSubscribed(false);
    } catch (err) {
    }
  };

  // Handle notification toggle — syncs localStorage + Supabase preference
  const toggleNotification = async (type, value) => {
    if (type === "match") {
      setNotifNewMatch(value);
      localStorage.setItem("notif_new_match", JSON.stringify(value));
    } else if (type === "ranking") {
      setNotifRankingChange(value);
      localStorage.setItem("notif_ranking", JSON.stringify(value));
    } else if (type === "members") {
      setNotifNewMembers(value);
      localStorage.setItem("notif_members", JSON.stringify(value));
    } else if (type === "challenges") {
      setNotifChallenges(value);
      localStorage.setItem("notif_challenges", JSON.stringify(value));
    }
    // Sync preferences to Supabase if subscribed
    if (pushSubscribed) {
      const prefs = {
        notif_new_match: type === "match" ? value : notifNewMatch,
        notif_ranking: type === "ranking" ? value : notifRankingChange,
        notif_members: type === "members" ? value : notifNewMembers,
      };
      await supabase.from("push_subscriptions").update(prefs).eq("user_id", user.id);
    }
  };

  // Request notification permission + subscribe
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      showToast("Browser doesn't support notifications","error");
      return;
    }
    if (Notification.permission === "granted" && pushSubscribed) {
      showToast("Notifications already enabled");
      return;
    }
    const success = await subscribeToPush();
    if (success) showToast("Notifications enabled!");
  };

  // Send push notification to league members via Edge Function
  const sendPushNotification = async (type, title, body) => {
    try {
      const { data, error } = await supabase.functions.invoke("push-notify", {
        body: { league_id: leagueId, type, title, body, exclude_user_id: user.id },
      });
      if (error) { /* push notify error — non-critical */ }
    } catch (err) {
    }
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
    const tA=formatTeam(getName(m.team_a[0]),getName(m.team_a[1]));
    const tB=formatTeam(getName(m.team_b[0]),getName(m.team_b[1]));
    const w=win(m.sets);
    const gA=m.sets.reduce((s,x)=>s+x[0],0);
    const gB=m.sets.reduce((s,x)=>s+x[1],0);
    const winner=w==="A"?tA:tB;
    const loser=w==="A"?tB:tA;
    const mvp=m.motm?getName(m.motm):"—";
    const sets=m.sets.map((s,i)=>`Set ${i+1}: ${s[0]}-${s[1]}`).join("\n");
    const text=`🎾 PadelHub - Match Result\n🗓️ ${formatDate(m.date)}\n\n${tA}\nVs\n${tB}\n\n${sets}\n\nFinal Score: ${gA}-${gB}\n\n✅ Winners: ${winner}\n❌ Losers: ${loser}\n⭐ MVP: ${mvp}`;
    if(navigator.share) navigator.share({title:"PadelHub Match Result",text});
    else{navigator.clipboard.writeText(text);showToast("Match result copied!");}
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

  if (loading) return (<div style={{background:BG,width:"100vw",height:"100vh",fontFamily:"'Outfit',sans-serif"}}>
    <style>{`@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}} .skel{background:linear-gradient(90deg,${CD} 25%,${CD2} 50%,${CD} 75%);background-size:400px 100%;animation:shimmer 1.5s infinite;border-radius:6px;}`}</style>
    {/* Skeleton header */}
    <div style={{background:CD,borderBottom:`1px solid ${BD}`,padding:"12px 16px",paddingTop:"calc(env(safe-area-inset-top, 0px) + 12px)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div className="skel" style={{width:32,height:32,borderRadius:"50%"}}/>
        <div><div className="skel" style={{width:80,height:14,marginBottom:4}}/><div className="skel" style={{width:140,height:10}}/></div>
      </div>
      <div className="skel" style={{width:32,height:32,borderRadius:"50%"}}/>
    </div>
    {/* Skeleton leaderboard rows */}
    <div style={{padding:"20px 16px"}}>
      <div className="skel" style={{width:120,height:18,marginBottom:20}}/>
      {[...Array(5)].map((_,i)=><div key={i} style={{display:"flex",alignItems:"center",padding:12,background:CD,borderRadius:6,border:`1px solid ${BD}`,marginBottom:8,gap:12}}>
        <div className="skel" style={{width:32,height:32,borderRadius:"50%"}}/>
        <div style={{flex:1}}><div className="skel" style={{width:100,height:13,marginBottom:4}}/><div className="skel" style={{width:60,height:10}}/></div>
        <div className="skel" style={{width:40,height:13}}/>
      </div>)}
    </div>
  </div>);

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
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}} input:focus,select:focus,textarea:focus{border-color:${A} !important;box-shadow:0 0 0 2px ${A}30 !important;}`}</style>
      {/* HEADER — Line 1: PadelHub branding, Line 2: League | Season */}
      <div style={{background:CD,borderBottom:`1px solid ${BD}`,padding:"12px 16px",paddingTop:"calc(env(safe-area-inset-top, 0px) + 12px)",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <PadelLogoSmall/>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <h1 style={{fontSize:"16px",fontWeight:900,margin:0,letterSpacing:1,fontFamily:"'Outfit',sans-serif"}}><span style={{color:TX}}>Padel</span><span style={{color:A}}>Hub</span></h1>
            </div>
            <p style={{fontSize:"10px",color:MT,margin:"2px 0 0 0",fontWeight:400}}>
              {league?.name||"League"}{seasons.find(s=>s.active) ? ` | ${seasons.find(s=>s.active).name}` : ""}
            </p>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
        {/* GN-04: Refresh button */}
        <button onClick={()=>{loadLeagueData();showToast("Refreshed!");}} style={{width:32,height:32,borderRadius:"50%",background:"transparent",border:`1px solid ${BD}`,color:MT,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>↻</button>
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
            fontFamily:"'Outfit',sans-serif",transition:"all 0.2s",overflow:"hidden",padding:0,
          }}
          title="Profile & Settings"
        >
          {avatarUrl?<img src={avatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
        </button>
        </div>
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
        position:"fixed",top:0,right:0,width:Math.min(320,window.innerWidth),height:"100vh",
        background:CD,borderLeft:`1px solid ${BD}`,
        zIndex:99,
        transform:sidebarOpen?"translateX(0)":"translateX(100%)",
        transition:"transform 0.3s ease-in-out",
        display:"flex",flexDirection:"column",
        boxShadow:sidebarOpen?"0 0 20px rgba(0,0,0,0.5)":"none",
        overflow:"auto",
      }}>
        {/* Header with user info */}
        <div style={{padding:"20px 16px",paddingTop:"calc(env(safe-area-inset-top, 0px) + 20px)",borderBottom:`1px solid ${BD}`}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
            <button onClick={()=>setSidebarOpen(false)} style={{background:"none",border:"none",color:MT,fontSize:20,cursor:"pointer",padding:"4px 8px",lineHeight:1}} aria-label="Close sidebar">✕</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:`${A}20`,border:`2px solid ${A}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:A,overflow:"hidden"}}>
              {avatarUrl?<img src={avatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:TX}}>{user.user_metadata?.display_name||user.email?.split("@")[0]||"User"}</div>
              <div style={{fontSize:10,color:MT,marginTop:2}}>{user.email}</div>
            </div>
          </div>
        </div>

        {/* Sidebar content — NAVIGATION ONLY, closes on selection */}
          <style>{`
            .sidebar-nav button:active { background: ${CD2} !important; }
          `}</style>
        <div className="sidebar-nav" style={{flex:1,padding:"16px",overflow:"auto"}}>
          <div>
            <button onClick={()=>{setSidebarView("profile");setSidebarOpen(false);}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              👤 My Profile
            </button>
          </div>

          <div style={{height:"1px",background:BD,margin:"12px 0"}} />

          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",paddingLeft:16,marginBottom:8}}>League</div>
            <div style={{padding:"12px 16px",background:CD2,borderRadius:8,marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:600,color:TX,display:"flex",alignItems:"center",gap:6}}>
                {league?.name||"—"}
                {isAdmin && <span style={{fontSize:9,color:A,fontWeight:700,background:`${A}20`,padding:"2px 6px",borderRadius:4}}>Admin</span>}
              </div>
            </div>
            <button onClick={()=>{onSwitchLeague();}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              🔄 Switch League
            </button>
            <button onClick={()=>{const code=league?.invite_code;if(code){const url=`${window.location.origin}${window.location.pathname}?invite=${code}`;if(navigator.share)navigator.share({title:"Join my PadelHub league",text:`Join "${league?.name}" on PadelHub!`,url});else{navigator.clipboard.writeText(url);showToast("Invite link copied!");}}}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>📩 Invite Players</button>
          </div>

          <div style={{height:"1px",background:BD,margin:"12px 0"}} />

          <div>
            <div style={{fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",paddingLeft:16,marginBottom:8}}>App</div>
            <button onClick={()=>{setSidebarView("settings");setSidebarOpen(false);}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              ⚙️ Settings
            </button>
            {installPrompt ? (
              <button onClick={handleInstall} style={{width:"100%",padding:"12px 16px",background:`${A}15`,border:`1px solid ${A}40`,borderRadius:8,color:A,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",transition:"all 0.2s"}}>
                📲 Install App
              </button>
            ) : !window.matchMedia("(display-mode: standalone)").matches && /iPhone|iPad/i.test(navigator.userAgent) ? (
              <div style={{padding:"12px 16px",background:`${BL}10`,border:`1px solid ${BL}30`,borderRadius:8,fontSize:11,color:MT,lineHeight:1.4}}>
                📲 To install: tap <span style={{color:BL}}>Share</span> → <span style={{color:BL}}>Add to Home Screen</span>
              </div>
            ) : null}
          </div>

          <div style={{padding:"16px 0",borderTop:`1px solid ${BD}`,marginTop:12}}>
            <button onClick={async()=>{await supabase.auth.signOut();}} style={{width:"100%",padding:"12px",background:`${DG}15`,border:`1px solid ${DG}40`,borderRadius:8,color:DG,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* SIDEBAR VIEWS — render in main content area (sidebar closes first) */}
      {sidebarView && (
        <div style={{padding:"0"}}>
          {/* PROFILE VIEW */}
          {sidebarView==="profile" && (
            <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
              <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

              {/* Profile Card with Avatar Upload */}
              <div style={{textAlign:"center",marginBottom:24}}>
                <div style={{position:"relative",display:"inline-block",marginBottom:12}}>
                  <div style={{width:80,height:80,borderRadius:"50%",background:`${A}20`,border:`3px solid ${A}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,fontWeight:800,color:A,overflow:"hidden"}}>
                    {avatarUrl?<img src={avatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
                  </div>
                  <label style={{position:"absolute",bottom:0,right:0,width:28,height:28,borderRadius:"50%",background:A,border:`2px solid ${CD}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14}}>
                    📷
                    <input type="file" accept="image/*" onChange={(e)=>uploadAvatar(e.target.files[0])} style={{display:"none"}}/>
                  </label>
                </div>
                {avatarUploading && <div style={{fontSize:11,color:A,marginBottom:4}}>Uploading...</div>}
                {avatarUrl && <button onClick={removeAvatar} style={{background:"none",border:"none",color:DG,fontSize:10,cursor:"pointer",marginBottom:4,fontFamily:"'Outfit',sans-serif"}}>Remove Photo</button>}
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
                      <div style={{fontSize:20,fontWeight:800,color:p.losses>0?DG:TX}}>{p.losses}</div>
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

                  {/* ELO History — only show when player has matches */}
                  {matches.some(m=>m.team_a.includes(p.id)||m.team_b.includes(p.id)) && (
                  <div style={{marginBottom:24}}>
                    <h3 style={{fontSize:13,fontWeight:700,color:TX,marginBottom:12}}>ELO History</h3>
                    <div style={{display:"flex",alignItems:"flex-end",gap:2,height:100,background:CD2,padding:8,borderRadius:8}}>
                      {(() => {
                        const pMatches = matches.filter(m=>m.team_a.includes(p.id)||m.team_b.includes(p.id)).sort((a,b)=>new Date(a.date)-new Date(b.date));
                        if(!pMatches.length) return null;
                        const sortedAll = [...matches].sort((a,b)=>new Date(a.date)-new Date(b.date));
                        const eloHistory = [];
                        const pMatchIds = new Set(pMatches.map(m=>m.id));
                        let runningMatches = [];
                        for(const m of sortedAll){
                          runningMatches.push(m);
                          if(pMatchIds.has(m.id)){
                            const snap = calcElo(players, runningMatches);
                            eloHistory.push(snap[p.id] || 1500);
                          }
                        }
                        const last10 = eloHistory.slice(-10);
                        const minElo = Math.min(...last10);
                        const maxElo = Math.max(...last10);
                        const range = maxElo - minElo || 1;
                        return (<>
                          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",marginRight:4,fontSize:9,color:MT,fontFamily:"'JetBrains Mono'",fontWeight:600,minWidth:28,textAlign:"right"}}>
                            <span>{Math.round(maxElo)}</span>
                            <span>{Math.round(minElo)}</span>
                          </div>
                          {last10.map((e, i) => (
                            <div key={i} style={{flex:1,background:A,borderRadius:2,height:`${Math.max(((e-minElo)/range)*100,5)}%`,opacity:0.8}}/>
                          ))}
                        </>);
                      })()}
                    </div>
                  </div>
                  )}

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
                            <div style={{fontSize:9,color:MT,marginTop:2}}>{a.desc}</div>
                            {!earned && <div style={{fontSize:9,color:MT,marginTop:2}}>🔒 Locked</div>}
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
                              <div style={{fontWeight:600,color:TX}}>{formatTeam(getName(m.team_a[0]),getName(m.team_a[1]))} vs {formatTeam(getName(m.team_b[0]),getName(m.team_b[1]))}</div>
                              <div style={{fontSize:10,marginTop:2,display:"flex",gap:4}}>{m.sets.map((s,i)=>{const pWon=pTeam==="A"?s[0]>s[1]:s[1]>s[0];return <span key={i} style={{color:pWon?A:DG}}>{s[0]}-{s[1]}</span>;})}</div>
                            </div>
                            <div style={{fontSize:9,color:MT}}>{formatDate(m.date)}</div>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={()=>{setSidebarView(null);setSidebarOpen(false);setTab("history");}} style={{width:"100%",marginTop:12,padding:"10px",background:"transparent",border:`1px solid ${BD}`,borderRadius:8,color:A,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                      View All Matches
                    </button>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ADMIN DASHBOARD VIEW */}
          {sidebarView==="admin" && (
            <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
              <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

              <h2 style={{fontSize:18,fontWeight:700,marginBottom:20,color:TX}}>Admin Dashboard</h2>

              {/* Player Management Section */}
              <div style={{marginBottom:28}}>
                <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12}}>Player Management</h3>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {players.map(p => {const profile=p.user_id?memberProfiles[p.user_id]:null;const claimed=!!p.user_id;return(
                    <div key={p.id} style={{padding:"12px",background:CD2,borderRadius:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:claimed?6:0}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:claimed?A:MT,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:TX}}>{p.nickname||p.name}</div>
                          <div style={{fontSize:10,color:claimed?MT:`${MT}80`}}>{claimed?(profile?.email||"Linked account"):"Not yet joined"}</div>
                        </div>
                        {adminEditId===p.id?<div style={{display:"flex",gap:4,alignItems:"center"}}><input value={adminEditName} onChange={e=>setAdminEditName(e.target.value)} style={{width:80,padding:"4px 6px",borderRadius:6,border:"1px solid "+A,background:CD2,color:TX,fontSize:11,fontFamily:"'Outfit',sans-serif"}} autoFocus onKeyDown={e=>{if(e.key==="Enter"&&adminEditName.trim()){updatePlayerName(p.id,adminEditName.trim());setAdminEditId(null);}if(e.key==="Escape")setAdminEditId(null);}}/><button onClick={()=>{if(adminEditName.trim()){updatePlayerName(p.id,adminEditName.trim());}setAdminEditId(null);}} disabled={adminLoading===p.id+"-rename"} style={{padding:"4px 8px",background:A,border:"none",borderRadius:6,color:"#000",fontSize:10,fontWeight:700,cursor:"pointer",opacity:adminLoading===p.id+"-rename"?0.5:1}}>{adminLoading===p.id+"-rename"?"..":"OK"}</button><button onClick={()=>setAdminEditId(null)} style={{padding:"4px 6px",background:"none",border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:10,cursor:"pointer"}}>X</button></div>:<button onClick={()=>{setAdminEditId(p.id);setAdminEditName(p.name);}} style={{padding:"6px 10px",background:A,border:"none",borderRadius:6,color:"#000",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                          Rename
                        </button>}
                        {confirmDeactivate===p.id?<div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,color:DG}}>Sure?</span><button onClick={()=>{deactivatePlayer(p.id);setConfirmDeactivate(null);}} disabled={adminLoading===p.id+"-deactivate"} style={{padding:"4px 8px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",opacity:adminLoading===p.id+"-deactivate"?0.5:1}}>{adminLoading===p.id+"-deactivate"?"..":"Yes"}</button><button onClick={()=>setConfirmDeactivate(null)} style={{padding:"4px 6px",background:"none",border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:10,cursor:"pointer"}}>No</button></div>:<button onClick={()=>setConfirmDeactivate(p.id)} style={{padding:"6px 10px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                          Deactivate
                        </button>}
                      </div>
                    </div>
                  );})}
                </div>
              </div>

              {/* League Settings Section */}
              <div style={{marginBottom:28}}>
                <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12}}>League Settings</h3>
                <div style={{padding:"12px",background:CD2,borderRadius:8,marginBottom:8}}>
                  <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>League Name</div>
                  <div style={{fontSize:13,color:TX,fontWeight:600}}>{league?.name}</div>
                </div>
                <div style={{padding:"12px",background:CD2,borderRadius:8,marginBottom:8}}>
                  <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>Invite Code</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <code style={{flex:1,padding:"8px 10px",background:CD,borderRadius:6,color:A,fontSize:12,fontWeight:700,wordBreak:"break-all"}}>{league?.invite_code}</code>
                    <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}?invite=${league?.invite_code}`);showToast("Invite link copied!");}} style={{padding:"6px 10px",background:A,border:"none",borderRadius:6,color:"#000",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>
                      Copy Link
                    </button>
                  </div>
                </div>
                {confirmRegenCode?<div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",width:"100%"}}><span style={{fontSize:11,color:TX}}>Old links stop working. Sure?</span><button onClick={()=>{regenerateInviteCode();setConfirmRegenCode(false);}} style={{padding:"6px 10px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>Yes</button><button onClick={()=>setConfirmRegenCode(false)} style={{padding:"6px 10px",background:CD2,border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:11,cursor:"pointer"}}>No</button></div>:<button onClick={()=>setConfirmRegenCode(true)} style={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                  Regenerate Code
                </button>}
              </div>

              {/* Data Export Section */}
              <div>
                <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12}}>Data Export</h3>
                <button onClick={exportMatchesCSV} style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                  Export Match History (CSV)
                </button>
              </div>
            </div>
          )}


          {/* SETTINGS VIEW */}
          {sidebarView==="settings" && (
            <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
              <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

              <h2 style={{fontSize:18,fontWeight:700,marginBottom:20,color:TX}}>Settings</h2>
              <ErrorBoundary>

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
                  {(()=>{const gi=user.identities?.find(i=>i.provider==="google");return gi?(<div style={{fontSize:12,color:A,display:"flex",alignItems:"center",gap:6}}>✅ Google: Connected{gi.identity_data?.email&&<span style={{color:MT}}>({gi.identity_data.email})</span>}</div>):(<div style={{fontSize:12,color:MT}}>Google: Not connected</div>);})()}
                </div>
              </div>

              {/* Notifications Section */}
              <div style={{marginBottom:24}}>
                <h3 style={{fontSize:12,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Notifications</h3>

                {/* Master push toggle */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:pushSubscribed?`${A}10`:CD2,borderRadius:8,marginBottom:8,border:`1px solid ${pushSubscribed?`${A}30`:BD}`}}>
                  <div>
                    <label style={{fontSize:12,fontWeight:600,color:TX}}>Push Notifications</label>
                    <div style={{fontSize:10,color:MT,marginTop:2}}>{pushSubscribed?"Enabled — receiving alerts":"Tap to enable"}</div>
                  </div>
                  <button onClick={()=>pushSubscribed?unsubscribeFromPush():subscribeToPush().then(ok=>{if(ok)showToast("Notifications enabled!");})} style={{width:48,height:28,borderRadius:14,background:pushSubscribed?A:BD,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",padding:0}}>
                    <div style={{width:24,height:24,background:CD,borderRadius:"50%",position:"absolute",top:2,left:pushSubscribed?22:2,transition:"left 0.2s"}}/>
                  </button>
                </div>

                {"Notification" in window && Notification.permission === 'denied' && (
                  <div style={{padding:"8px 12px",background:`${DG}15`,border:`1px solid ${DG}30`,borderRadius:8,marginBottom:8,fontSize:11,color:DG}}>
                    Notifications blocked. Enable in your browser settings.
                  </div>
                )}

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:CD2,borderRadius:8,marginBottom:8}}>
                  <label style={{fontSize:12,fontWeight:600,color:TX}}>New Match Logged</label>
                  <button onClick={()=>toggleNotification("match",!notifNewMatch)} style={{width:48,height:28,borderRadius:14,background:notifNewMatch?A:BD,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",padding:0}}>
                    <div style={{width:24,height:24,background:CD,borderRadius:"50%",position:"absolute",top:2,left:notifNewMatch?22:2,transition:"left 0.2s"}}/>
                  </button>
                </div>

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:CD2,borderRadius:8}}>
                  <label style={{fontSize:12,fontWeight:600,color:TX}}>Match Challenges</label>
                  <button onClick={()=>toggleNotification("challenges",!notifChallenges)} style={{width:48,height:28,borderRadius:14,background:notifChallenges?A:BD,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",padding:0}}>
                    <div style={{width:24,height:24,background:CD,borderRadius:"50%",position:"absolute",top:2,left:notifChallenges?22:2,transition:"left 0.2s"}}/>
                  </button>
                </div>
              </div>

              {/* Admin Management Section */}
              {isAdmin && (
                <div style={{marginBottom:24}}>
                  <h3 style={{fontSize:12,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Admin Management</h3>

                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {leagueMembers.map(member => {
                      const profile = memberProfiles[member.user_id];
                      const isOwner = league?.created_by === member.user_id;
                      return (
                        <div key={member.user_id} style={{padding:"10px 12px",background:CD2,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:TX,overflow:"hidden",textOverflow:"ellipsis"}}>{profile?.user_metadata?.display_name || profile?.email?.split("@")[0] || "User"}</div>
                            <div style={{fontSize:10,color:MT}}>{profile?.email || ""}</div>
                          </div>
                          <div style={{marginLeft:12}}>
                            {isOwner ? (
                              <span style={{fontSize:10,color:A,fontWeight:700,background:`${A}20`,padding:"4px 8px",borderRadius:4}}>Owner</span>
                            ) : (
                              <select value={member.role || "member"} onChange={(e)=>updateMemberRole(member.user_id,e.target.value)} style={{fontSize:11,padding:"4px 8px",background:BD,border:`1px solid ${BD}`,borderRadius:4,color:TX,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* League Section */}
              <div style={{marginBottom:24}}>
                <h3 style={{fontSize:12,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>League</h3>

                <button onClick={()=>{onSwitchLeague();}} style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:8}}>
                  Switch League
                </button>

                {isAdmin && (
                  <button onClick={()=>setSidebarView("admin")} style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                    Admin Dashboard
                  </button>
                )}
              </div>

              {/* Version */}
              <div style={{textAlign:"center",paddingTop:20,borderTop:`1px solid ${BD}`,marginTop:20}}>
                <div style={{fontSize:10,color:MT,fontWeight:600}}>PadelHub</div>
              </div>
              </ErrorBoundary>
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

          {/* Season Awards Section — only shown for ended seasons */}
          {selectedSeason && !seasons.find(s=>s.id===selectedSeason)?.active && (() => {
            const awards = calculateSeasonAwards(selectedSeason);
            const hasAwards = Object.keys(awards).length > 0;
            return hasAwards && (
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,cursor:"pointer"}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:A,margin:0}}>🏆 Season Awards</h3>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
                  {awards.mvp && (
                    <div style={{padding:12,background:CD2,borderRadius:8,border:`1px solid ${A}40`}}>
                      <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:4}}>MVP</div>
                      <div style={{fontSize:13,fontWeight:700,color:TX,marginBottom:2}}>{getName(awards.mvp.playerId)}</div>
                      <div style={{fontSize:11,color:A,fontWeight:600}}>{awards.mvp.value} ELO</div>
                    </div>
                  )}
                  {awards.mostActive && (
                    <div style={{padding:12,background:CD2,borderRadius:8,border:`1px solid ${A}40`}}>
                      <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:4}}>Most Active</div>
                      <div style={{fontSize:13,fontWeight:700,color:TX,marginBottom:2}}>{getName(awards.mostActive.playerId)}</div>
                      <div style={{fontSize:11,color:A,fontWeight:600}}>{awards.mostActive.value} matches</div>
                    </div>
                  )}
                  {awards.bestPartnership && (
                    <div style={{padding:12,background:CD2,borderRadius:8,border:`1px solid ${A}40`}}>
                      <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:4}}>Best Partnership</div>
                      <div style={{fontSize:13,fontWeight:700,color:TX,marginBottom:2}}>{formatTeam(getName(awards.bestPartnership.playerIds[0]),getName(awards.bestPartnership.playerIds[1]))}</div>
                      <div style={{fontSize:11,color:A,fontWeight:600}}>{awards.bestPartnership.winRate}% WR</div>
                    </div>
                  )}
                  {awards.mostImproved && (
                    <div style={{padding:12,background:CD2,borderRadius:8,border:`1px solid ${A}40`}}>
                      <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:4}}>Most Improved</div>
                      <div style={{fontSize:13,fontWeight:700,color:TX,marginBottom:2}}>{getName(awards.mostImproved.playerId)}</div>
                      <div style={{fontSize:11,color:A,fontWeight:600}}>{awards.mostImproved.value > 0 ? "+" : ""}{awards.mostImproved.value} ELO</div>
                    </div>
                  )}
                  {awards.longestStreak && (
                    <div style={{padding:12,background:CD2,borderRadius:8,border:`1px solid ${A}40`}}>
                      <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:4}}>Longest Streak</div>
                      <div style={{fontSize:13,fontWeight:700,color:TX,marginBottom:2}}>{getName(awards.longestStreak.playerId)}</div>
                      <div style={{fontSize:11,color:A,fontWeight:600}}>{awards.longestStreak.value} wins 🔥</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
                  <div style={{fontSize:"11px"}}><span style={{color:A}}>{lb[1].wins}W</span> <span style={{color:lb[1].losses>0?DG:TX}}>{lb[1].losses}L</span></div>
                  <div style={{fontSize:"12px",color:A,fontWeight:"bold",marginTop:"4px"}}>{Math.round(elo[lb[1].id]||1500)}</div>
                </div>

                {/* 1st place */}
                <div style={{textAlign:"center",padding:"16px",background:CD2,borderRadius:"6px",borderTop:`3px solid ${GD}`,transform:"scale(1.05)"}}>
                  <div style={{fontSize:"28px",marginBottom:"6px"}}>🥇</div>
                  <div style={{fontSize:"14px",fontWeight:"bold",marginBottom:"6px"}}>{lb[0].nickname||lb[0].name}</div>
                  <div style={{fontSize:"12px"}}><span style={{color:A}}>{lb[0].wins}W</span> <span style={{color:lb[0].losses>0?DG:TX}}>{lb[0].losses}L</span></div>
                  <div style={{fontSize:"13px",color:GD,fontWeight:"bold",marginTop:"6px"}}>{Math.round(elo[lb[0].id]||1500)}</div>
                </div>

                {/* 3rd place */}
                <div style={{textAlign:"center",padding:"12px",background:CD2,borderRadius:"6px",borderTop:`3px solid ${BZ}`}}>
                  <div style={{fontSize:"20px",marginBottom:"4px"}}>🥉</div>
                  <div style={{fontSize:"13px",fontWeight:"bold",marginBottom:"4px"}}>{lb[2].nickname||lb[2].name}</div>
                  <div style={{fontSize:"11px"}}><span style={{color:A}}>{lb[2].wins}W</span> <span style={{color:lb[2].losses>0?DG:TX}}>{lb[2].losses}L</span></div>
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
                    <div style={{fontSize:"10px",color:p.losses>0?DG:TX}}>{p.losses}L</div>
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
          showToast={showToast}
          sendPushNotification={sendPushNotification}
        />
      )}

      {/* MATCHES TAB — with History | Schedule sub-tabs */}
      {!sidebarView && tab==="history"&&(
        <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
          {/* FT-05: Sub-tab toggle */}
          <div style={{display:"flex",gap:4,marginBottom:16,background:CD,borderRadius:10,padding:3}}>
            {["history","schedule"].map(t=>(
              <button key={t} onClick={()=>setMatchSubTab(t)} style={{flex:1,padding:"8px 12px",borderRadius:8,border:"none",background:matchSubTab===t?A:"transparent",color:matchSubTab===t?"#000":MT,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textTransform:"capitalize"}}>{t}</button>
            ))}
          </div>

          <div style={{display:matchSubTab==="history"?"block":"none"}}>
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
              showToast={showToast}
            />
          </div>
          <div style={{display:matchSubTab==="schedule"?"block":"none"}}>
            <ScheduleView
              challenges={challenges}
              players={players}
              matches={matches}
              supabase={supabase}
              leagueId={leagueId}
              user={user}
              getName={getName}
              isAdmin={isAdmin}
              onUpdate={loadLeagueData}
              showToast={showToast}
              sendPushNotification={sendPushNotification}
              elo={elo}
              seasonId={selectedSeason}
              sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
            />
          </div>
        </div>
      )}

      {/* COMBOS TAB */}
      {!sidebarView && tab==="combos"&&(
        <Suspense fallback={<LazyFallback/>}><CombosView
          combos={combos}
          players={players}
          matches={matches}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          getName={getName}
        /></Suspense>
      )}

      {/* PLAYERS TAB */}
      {!sidebarView && tab==="stats"&&(
        <Suspense fallback={<LazyFallback/>}><PlayerStats
          players={players}
          ps={Object.fromEntries(ps.map(p=>[p.id,p]))}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          getStreak={getStreak}
          getForm={getForm}
          elo={elo}
              seasonId={selectedSeason}
          sp={selectedPlayer}
          setSp={setSelectedPlayer}
          matches={matches}
          supabase={supabase}
          leagueId={leagueId}
          isAdmin={isAdmin}
          getName={getName}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
          onPlayersChange={loadLeagueData}
        /></Suspense>
      )}

      {/* GAMEMODE TAB */}
      {!sidebarView && tab==="gamemode"&&(
        <Suspense fallback={<LazyFallback/>}><GameMode
          players={players}
          getName={getName}
          supabase={supabase}
          leagueId={leagueId}
          tournament={tournament}
          setTournament={setTournament}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
        /></Suspense>
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
            <p style={{fontSize:13,color:TX,lineHeight:1.5,fontWeight:400}}>{r.a}</p>
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
          ["Single Elimination","The classic knockout format — lose once and you're out. Teams are randomly seeded into a bracket and play through Quarterfinals, Semifinals, and the Final. Fast-paced, high-stakes format perfect for a decisive winner-takes-all tournament. Best for 4-16 players.","How it works: 8 teams start → 4 advance from Quarterfinals → 2 advance from Semifinals → 1 Champion. Each match is winner-takes-all. The entire tournament can be completed in a single session."],
          ["Double Elimination","Second chances matter. Teams that lose in the Winners bracket drop to a Losers bracket for a comeback opportunity. Only a second loss eliminates you. The Grand Final pits the Winners bracket champion against the Losers bracket champion, with the Winners champion having a 1-game advantage.","How it works: All teams start in the Winners bracket. Losers drop to the Losers bracket. Lose in the Losers bracket and you're eliminated. Grand Final: Winners champ vs Losers champ. If Losers champ wins Game 1, a decisive Game 2 is played."],
        ].map(([title,desc,detail],i) => (
          <div key={i} style={{background:CD,borderRadius:12,border:`1px solid ${PU}25`,padding:14,marginBottom:8}}>
            <h3 style={{fontSize:14,fontWeight:700,color:PU,marginBottom:6}}>⚡ {title}</h3>
            <p style={{fontSize:13,color:TX,lineHeight:1.5,marginBottom:8}}>{desc}</p>
            <p style={{fontSize:12,color:MT,lineHeight:1.5,fontStyle:"italic"}}>{detail}</p>
          </div>
        ))}
      </div>}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{position:"fixed",top:"calc(env(safe-area-inset-top, 20px) + 12px)",left:"50%",transform:"translateX(-50%)",zIndex:200,padding:"12px 24px",borderRadius:12,background:toast.type==="success"?A:DG,color:toast.type==="success"?"#000":"#fff",fontSize:13,fontWeight:700,fontFamily:"'Outfit',sans-serif",boxShadow:"0 4px 20px rgba(0,0,0,0.3)",animation:"fadeIn 0.2s ease-out",maxWidth:"90%",textAlign:"center"}}>
          {toast.msg}
        </div>
      )}

      {/* BOTTOM NAV — 7-column grid: 3 left + center "+" + 3 right */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:`${CD}f0`,backdropFilter:"blur(20px)",borderTop:`1px solid ${BD}`,display:"grid",gridTemplateColumns:"repeat(7,1fr)",alignItems:"end",padding:`6px 0 env(safe-area-inset-bottom, 6px)`,zIndex:100}}>
        {TL.map(t => (
          <button key={t.key} onClick={()=>{setTab(t.key);setSidebarOpen(false);setSidebarView(null);}} style={{background:tab===t.key?A+"15":"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:tab===t.key?A:MT,cursor:"pointer",padding:"6px 0",borderRadius:8,minHeight:44}}>
            <div style={{height:24,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:18,lineHeight:1}}>{t.icon==="court"?<CourtIcon/>:t.icon}</span></div>
            <div style={{height:12,display:"flex",alignItems:"center"}}><span style={{fontSize:9,fontWeight:600}}>{t.label}</span></div>
          </button>
        ))}
        <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end"}}>
          <button onClick={()=>{setEditingMatch(null);setTab("log");setSidebarOpen(false);setSidebarView(null);}} style={{width:56,height:56,borderRadius:"50%",border:"none",background:`linear-gradient(135deg,${A},${A}cc)`,color:BG,fontSize:30,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:-20,boxShadow:`0 4px 20px ${A}40`,lineHeight:1}}>+</button>
        </div>
        {TR.map(t => (
          <button key={t.key} onClick={()=>{setTab(t.key);setSidebarOpen(false);setSidebarView(null);}} style={{background:tab===t.key?A+"15":"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:tab===t.key?A:MT,cursor:"pointer",padding:"6px 0",borderRadius:8,minHeight:44}}>
            <div style={{height:24,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:18,lineHeight:1}}>{t.icon}</span></div>
            <div style={{height:12,display:"flex",alignItems:"center"}}><span style={{fontSize:9,fontWeight:600}}>{t.label}</span></div>
          </button>
        ))}
      </div>

    </div>
  );
}

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
