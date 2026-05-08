import React, { useState, useMemo, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { supabase } from './supabase';
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, BL, PU, TL, TR } from './theme';
import { formatTeam, win, formatDate, setTotals, flagEmoji, decodeImageFile } from './utils/helpers';
import { calcElo } from './utils/elo';
import { RULES, ARGUED } from './data/rules';
import { CourtIcon, PadelLogo, PadelLogoSmall } from './components/icons';
import { NavIcon } from './components/NavIcons';
import Icon from './components/Icon';
import { FD } from './components/FormDots';
import { Sidebar } from './components/Sidebar';
import { ProfileView } from './components/ProfileView';
import { AdminDashboard } from './components/AdminDashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { SeasonManagement } from './components/SeasonManagement';
import { LeagueManagement } from './components/LeagueManagement';
import { PlatformAdmin } from './components/PlatformAdmin';
import { SettingsView } from './components/SettingsView';
import { RulesView } from './components/RulesView';
import { NotificationCenter } from './components/NotificationCenter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LeagueContext } from './LeagueContext';
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
import { LeaguesView } from './components/LeaguesView';
import { LogMatch } from './components/LogMatch';
const PlayerStats = lazy(() => import('./components/PlayerStats').then(m => ({default: m.PlayerStats})));
import { ScheduleView } from './components/ScheduleView';
import { MatchHistory } from './components/MatchHistory';
const CombosView = lazy(() => import('./components/CombosView').then(m => ({default: m.CombosView})));
const GameMode = lazy(() => import('./components/GameMode').then(m => ({default: m.GameMode})));


// Lazy loading fallback
const LazyFallback = () => <div style={{minHeight:80}}/>;
// MAIN APP COMPONENT
// ============================================================================
function AppContent({leagueId,user,leagues,leagueHandlers}){
  const [league,setLeague]=useState(null);
  const [players,setPlayers]=useState([]);
  const [matches,setMatches]=useState([]);
  const [seasons,setSeasons]=useState([]);
  const [tab,setTab]=useState(()=>{const h=window.location.hash.replace("#","");if(h==="schedule"||h==="history")return "history";return "board";});
  const [loading,setLoading]=useState(true);
  // Issue #24 (S058): only the FIRST loadLeagueData() shows the full-screen skeleton. Subsequent refreshes (realtime echo, post-write reload, refresh button) update data silently in place — no more flash on tab switch when a background reload is in flight.
  const firstLoadRef = useRef(true);
  const [isAdmin,setIsAdmin]=useState(false);
  const [isOwner,setIsOwner]=useState(false);
  const [myMemberId,setMyMemberId]=useState(null);
  const [editingMatch,setEditingMatch]=useState(null);
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [selectedSeason,setSelectedSeason]=useState(null);
  const [tournament,setTournament]=useState(null);
  // FT-05: Challenges/Scheduling
  const [challenges,setChallenges]=useState([]);
  const [matchSubTab,setMatchSubTab]=useState(()=>{const h=window.location.hash.replace("#","");return h==="schedule"?"schedule":"history";}); // history | schedule
  const [claimedPlayer,setClaimedPlayer]=useState(undefined); // undefined=loading, null=unclaimed, object=claimed
  const [newPlayerName,setNewPlayerName]=useState("");
  const [newPlayerNick,setNewPlayerNick]=useState("");
  const [claimError,setClaimError]=useState("");
  // Sidebar and view management
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [sidebarView,setSidebarView]=useState(null); // null | "profile" | "settings" | "admin" | "leagues"
  // S063: "Switch League" / "Back to Leagues" now open the in-app Leagues
  // sub-view in the sidebar instead of nulling out the leagueId. Replaces
  // the old LeagueGate full-screen picker.
  const onSwitchLeague = () => setSidebarView("leagues");
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [avatarUploading,setAvatarUploading]=useState(false);

  // FT-03: Load avatar URL from profiles table
  useEffect(()=>{
    (async()=>{
      const {data}=await supabase.from("profiles").select("avatar_url").eq("id",user.id).single();
      if(data?.avatar_url)setAvatarUrl(data.avatar_url);
    })();
  },[user.id]);

  // FT-03 / Issue #20: Upload avatar (resize to 200x200, upload to storage, save URL).
  // S051: switched from FileReader->dataURL->Image to decodeImageFile() helper —
  // fixes iOS Safari PWA "Failed to load on first attempt" by using createImageBitmap
  // (native HEIC decode + reliable async). Also write-through to claimedPlayer.avatar_url
  // so the user's photo propagates to every player-avatar slot in the app (ranking,
  // partners, H2H, etc.) which read from players.avatar_url.
  const uploadAvatar=async(file)=>{
    if(!file)return;
    setAvatarUploading(true);
    try{
      const img=await decodeImageFile(file);
      if(!img.width||!img.height)throw new Error("Invalid image dimensions");
      const canvas=document.createElement("canvas");
      canvas.width=200;canvas.height=200;
      const ctx=canvas.getContext("2d");
      const s=Math.min(img.width,img.height);
      const sx=(img.width-s)/2,sy=(img.height-s)/2;
      ctx.drawImage(img,sx,sy,s,s,0,0,200,200);
      if(img.close)img.close();
      const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",0.85));
      const path=`${user.id}/avatar.jpg`;
      const {error:upErr}=await supabase.storage.from("avatars").upload(path,blob,{upsert:true,contentType:"image/jpeg"});
      if(upErr)throw upErr;
      const {data:{publicUrl}}=supabase.storage.from("avatars").getPublicUrl(path);
      const url=publicUrl+"?t="+Date.now();
      await supabase.from("profiles").update({avatar_url:url}).eq("id",user.id);
      // S051 Issue #20: write-through to the user's claimed player row so the photo
      // appears everywhere players.avatar_url is rendered (ranking, partners, H2H,
      // Players grid, drill-in profile). Skip if the user hasn't claimed a player yet.
      if(claimedPlayer?.id){
        await supabase.from("players").update({avatar_url:url}).eq("id",claimedPlayer.id);
        await loadLeagueData();
      }
      setAvatarUrl(url);
      showToast("Photo updated!");
    }catch(_err){
      showToast("Failed to upload photo","error");
    }
    setAvatarUploading(false);
  };

  const removeAvatar=async()=>{
    try{
      await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
      await supabase.from("profiles").update({avatar_url:null}).eq("id",user.id);
      // S051 Issue #20: also clear the claimed player's avatar so all surfaces revert.
      if(claimedPlayer?.id){
        await supabase.from("players").update({avatar_url:null}).eq("id",claimedPlayer.id);
        await loadLeagueData();
      }
      setAvatarUrl(null);
      showToast("Photo removed");
    }catch(_err){showToast("Failed to remove photo","error");}
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
  const [unreadNotifCount,setUnreadNotifCount]=useState(0);
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

  // Preload lazy chunks on first mount to eliminate loading flash on first tab switch
  useEffect(()=>{
    import('./components/PlayerStats');
    import('./components/CombosView');
    import('./components/GameMode');
  },[]);

  // GN-09 / Issue #16: Scroll to top on tab change AND on sidebar-view change
  // (opening Admin Dashboard / Platform Admin / Settings / Profile / etc. should always start at the top)
  useEffect(()=>{window.scrollTo({top:0,behavior:"smooth"});},[tab,sidebarView]);

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

  // S026: Debounced reload — prevents thundering herd from rapid realtime events
  const reloadTimerRef = useRef(null);
  const debouncedReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => { loadLeagueData(); }, 500);
  }, []);

  // Load league data from Supabase
  useEffect(()=>{
    loadLeagueData();

    // S063: skip Realtime subscriptions when there's no league selected.
    // 0-league users have nothing to subscribe to.
    if (!leagueId) return;

    // S1-05: Supabase Realtime — subscribe to changes for live cross-device sync
    // P-12: Targeted Realtime subscriptions (per-table with league filter)
    // S026: Debounced to prevent rapid successive reloads
    const channel = supabase.channel(`league-${leagueId}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"matches",filter:`league_id=eq.${leagueId}`},()=>debouncedReload())
      .on("postgres_changes",{event:"*",schema:"public",table:"players",filter:`league_id=eq.${leagueId}`},()=>debouncedReload())
      .on("postgres_changes",{event:"*",schema:"public",table:"seasons",filter:`league_id=eq.${leagueId}`},()=>debouncedReload())
      .on("postgres_changes",{event:"*",schema:"public",table:"league_members",filter:`league_id=eq.${leagueId}`},()=>debouncedReload())
      .on("postgres_changes",{event:"*",schema:"public",table:"tournaments",filter:`league_id=eq.${leagueId}`},()=>debouncedReload())
      .on("postgres_changes",{event:"*",schema:"public",table:"challenges",filter:`league_id=eq.${leagueId}`},()=>debouncedReload())
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications",filter:`user_id=eq.${user.id}`},()=>{
        supabase.from("notifications").select("id",{count:"exact",head:true}).eq("league_id",leagueId).eq("user_id",user.id).eq("read",false).then(({count})=>setUnreadNotifCount(count||0));
      })
      .subscribe();

    return () => { if(reloadTimerRef.current) clearTimeout(reloadTimerRef.current); supabase.removeChannel(channel); };
  },[leagueId,user.id]);

  const loadLeagueData = async () => {
    // S063: 0-league users have leagueId=null. Skip the data fetch entirely
    // and render the inline empty-state on Ranking. Returning early here
    // also prevents the postgrest errors that .eq("league_id", null) would
    // emit if we let the queries run.
    if (!leagueId) {
      setLoading(false);
      firstLoadRef.current = false;
      return;
    }
    try {
      if (firstLoadRef.current) setLoading(true);

      // PA-04: Parallelize all independent queries
      // A-09: Specific column selects instead of SELECT *
      const [
        {data:leagueData,error:leagueErr},
        {data:memberData},
        {data:membersData},
        {data:playersData,error:playersErr},
        {data:matchesData,error:matchesErr},
        {data:seasonsData,error:seasonsErr},
        {data:challengesData}
      ] = await Promise.all([
        supabase.from("leagues").select("id,name,invite_code,created_by").eq("id",leagueId).single(),
        supabase.from("league_members").select("id,role").eq("league_id",leagueId).eq("user_id",user.id).single(),
        supabase.from("league_members").select("id,user_id,role,profiles(id,email,display_name,avatar_url)").eq("league_id",leagueId),
        supabase.from("players").select("id,name,nickname,user_id,created_by,created_at,avatar_url,country,playing_position,gender,date_of_birth").eq("league_id",leagueId).order("name"),
        supabase.from("matches").select("id,team_a,team_b,sets,motm,date,season_id,league_id,status,logged_by,created_at").eq("league_id",leagueId).order("date",{ascending:false}).limit(500),
        supabase.from("seasons").select("id,name,active,start_date,end_date,location").eq("league_id",leagueId).order("start_date"),
        supabase.from("challenges").select("id,team_a,team_b,status,date,time,location,notes,created_by,match_id,responses,duration,league_id").eq("league_id",leagueId).in("status",["open","pending","confirmed","played"]).order("date",{ascending:true})
      ]);

      if (leagueErr) throw leagueErr;
      setLeague(leagueData);
      // S044/FT-09: Split owner vs admin. Owner = league creator (cannot be demoted).
      // Admin = owner OR league_members.role='admin' (can be promoted/demoted by owner).
      const owner = leagueData?.created_by === user.id;
      setIsOwner(owner);
      setIsAdmin(owner || memberData?.role==="admin");
      setMyMemberId(memberData?.id || null);

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

      setChallenges(challengesData||[]);

      // Fetch unread notification count
      supabase.from("notifications").select("id",{count:"exact",head:true}).eq("league_id",leagueId).eq("user_id",user.id).eq("read",false).then(({count})=>setUnreadNotifCount(count||0));

      // Auto-expire stale challenges (48h) — lightweight, runs on each load
      supabase.rpc("expire_stale_challenges").then(()=>{});

      const claimed = (playersData||[]).find(p => p.user_id === user.id);
      setClaimedPlayer(claimed || null);

      setLoading(false);
      firstLoadRef.current = false;
    } catch (_err) {
      // S026: Clear state on error so user sees empty state, not stale data
      setLeague(null); setPlayers([]); setMatches([]); setSeasons([]); setChallenges([]);
      setLoading(false);
      showToast("Failed to load data — tap refresh to retry", "error");
    }
  };

  // Helper functions
  const getName = (pid) => {
    const p = players.find(x => x.id === pid);
    return p ? (p.nickname || p.name) : "?";
  };

  // S044/FT-09: Selector — approvedMatches drives all leaderboard/ELO/stats/H2H/awards.
  // Pre-migration matches don't have a status field → treat absent status as approved
  // so this is a no-op until the DB migration ships. Post-migration: pending matches
  // are filtered out for everyone (admin sees them ONLY in AdminDashboard's queue + MatchHistory's "My Pending" section, both of which read raw `matches`).
  const approvedMatches = useMemo(
    () => matches.filter(m => !m.status || m.status === 'approved'),
    [matches]
  );
  const pendingMatches = useMemo(
    () => matches.filter(m => m.status === 'pending'),
    [matches]
  );
  // FT-09b / S045: Incomplete matches — visible in MatchHistory with grey styling + badge,
  // but excluded from rankings (NOT in approvedMatches). Same league-wide visibility as approved.
  const incompleteMatches = useMemo(
    () => matches.filter(m => m.status === 'incomplete'),
    [matches]
  );

  // Calculate season awards
  const calculateSeasonAwards = (seasonId) => {
    const seasonMatches = approvedMatches.filter(m => m.season_id === seasonId);
    const awards = {};

    if (seasonMatches.length === 0) return awards;

    // Per-player stats
    const pStats = {};
    players.forEach(p => {
      const pM = seasonMatches.filter(m => m.team_a.includes(p.id) || m.team_b.includes(p.id));
      const wins = pM.filter(m => win(m.sets) === (m.team_a.includes(p.id) ? 'A' : 'B')).length;
      let motm = 0;
      seasonMatches.forEach(m => { if (m.motm === p.id) motm++; });
      let cur = 0, maxStreak = 0;
      [...pM].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(m => {
        const pTeam = m.team_a.includes(p.id) ? 'A' : 'B';
        if (win(m.sets) === pTeam) cur++;
        else cur = 0;
        maxStreak = Math.max(maxStreak, cur);
      });
      pStats[p.id] = { wins, games: pM.length, motm, maxStreak };
    });

    // Champion + Runner-Up (most wins, min 1 match played)
    const ranked = Object.entries(pStats)
      .filter(([_, s]) => s.games > 0)
      .sort((a, b) => b[1].wins - a[1].wins || b[1].games - a[1].games);
    if (ranked.length > 0) awards.champion = { playerId: ranked[0][0], wins: ranked[0][1].wins };
    if (ranked.length > 1) awards.runnerUp = { playerId: ranked[1][0], wins: ranked[1][1].wins };

    // Most Active (most games played)
    const mostActive = Object.entries(pStats).reduce((a, b) => b[1].games > a[1].games ? b : a, ['', { games: 0 }]);
    if (mostActive[0] && mostActive[1].games > 0) awards.mostActive = { playerId: mostActive[0], value: mostActive[1].games };

    // Top Pair (best win rate, min 3 matches together)
    const pairs = {};
    seasonMatches.forEach(m => {
      const keyA = [m.team_a[0], m.team_a[1]].sort().join('|');
      const keyB = [m.team_b[0], m.team_b[1]].sort().join('|');
      if (!pairs[keyA]) pairs[keyA] = { wins: 0, total: 0 };
      if (!pairs[keyB]) pairs[keyB] = { wins: 0, total: 0 };
      pairs[keyA].total++; pairs[keyB].total++;
      if (win(m.sets) === 'A') pairs[keyA].wins++;
      else pairs[keyB].wins++;
    });
    const validPairs = Object.entries(pairs).filter(([_, p]) => p.total >= 3);
    if (validPairs.length > 0) {
      const best = validPairs.reduce((a, b) => (b[1].wins / b[1].total) > (a[1].wins / a[1].total) ? b : a);
      const [p1, p2] = best[0].split('|');
      awards.topPair = { playerIds: [p1, p2], wins: best[1].wins, total: best[1].total, winRate: ((best[1].wins / best[1].total) * 100).toFixed(0) };
    }

    // Most MOTM
    const motmBest = Object.entries(pStats).reduce((a, b) => b[1].motm > a[1].motm ? b : a, ['', { motm: 0 }]);
    if (motmBest[0] && motmBest[1].motm > 0) awards.mostMotm = { playerId: motmBest[0], value: motmBest[1].motm };

    // Most Consecutive Wins
    const streakBest = Object.entries(pStats).reduce((a, b) => b[1].maxStreak > a[1].maxStreak ? b : a, ['', { maxStreak: 0 }]);
    if (streakBest[0] && streakBest[1].maxStreak > 0) awards.longestStreak = { playerId: streakBest[0], value: streakBest[1].maxStreak };

    return awards;
  };

  const getForm = (pid) => {
    const pMatches = approvedMatches.filter(m => m.team_a.includes(pid) || m.team_b.includes(pid));
    const sorted = [...pMatches].sort((a,b) => new Date(b.date) - new Date(a.date));
    return sorted.slice(0, 5).map(m => {
      const w = win(m.sets);
      const pTeam = m.team_a.includes(pid) ? "A" : "B";
      return w === pTeam ? "W" : "L";
    });
  };

  const getSeasonForm = (pid) => {
    const pMatches = selectedSeasonMatches.filter(m => m.team_a.includes(pid) || m.team_b.includes(pid));
    const sorted = [...pMatches].sort((a,b) => new Date(b.date) - new Date(a.date));
    return sorted.slice(0, 5).map(m => {
      const w = win(m.sets);
      const pTeam = m.team_a.includes(pid) ? "A" : "B";
      return w === pTeam ? "W" : "L";
    });
  };

  const getSeasonStreak = (pid) => {
    const pMatches = selectedSeasonMatches.filter(m => m.team_a.includes(pid) || m.team_b.includes(pid));
    const sorted = [...pMatches].sort((a,b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    for (let m of sorted) {
      const w = win(m.sets);
      const pTeam = m.team_a.includes(pid) ? "A" : "B";
      if (w === pTeam) streak++;
      else break;
    }
    return streak;
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
    } catch (_err) {
      showToast("Failed to update member role","error");
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
      // Bug #6 fix S038: delete this user's OTHER endpoints in this league before upserting
      // (assume single device; prevents stale endpoint accumulation across permission resets)
      await supabase.from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("league_id", leagueId)
        .neq("endpoint", subJson.endpoint);
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        league_id: leagueId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        notif_new_match: notifNewMatch,
        notif_ranking: notifRankingChange,
        notif_members: notifNewMembers,
        notif_challenges: notifChallenges,
      }, { onConflict: "user_id,endpoint" });
      if (error) throw error;
      setPushSubscribed(true);
      return true;
    } catch (_err) {
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
    } catch (_err) {
      showToast("Failed to disable notifications","error");
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
        notif_challenges: type === "challenges" ? value : notifChallenges,
      };
      await supabase.from("push_subscriptions").update(prefs).eq("user_id", user.id);
    }
  };

  // Send push notification via Edge Function. target_user_ids = array of user IDs to notify (optional — defaults to all league members)
  const sendPushNotification = async (type, title, body, body_text, target_user_ids) => {
    // Allow legacy 4-arg call: sendPushNotification(type, title, body, target_user_ids)
    // when arg 4 is array, treat it as target_user_ids and arg 3 as body
    if (Array.isArray(body_text)) { target_user_ids = body_text; body_text = undefined; }
    try {
      const payload = { league_id: leagueId, type, title, body, exclude_user_id: user.id };
      if (target_user_ids) payload.target_user_ids = target_user_ids;
      const { data, error } = await supabase.functions.invoke("push-notify", { body: payload });
      // Bug #4 fix S038: surface push send results in console for diagnostics (DEV-only since S042)
      if (import.meta.env.DEV) {
        if (error) console.warn("[push-notify] error:", error);
        else if (data) console.log("[push-notify]", type, "→", data);
      }
      return { data, error };
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[push-notify] threw:", err);
      return { error: err };
    }
  };

  // Fix D S038: send a self-targeted test push for diagnostics
  const testPushNotification = async () => {
    if (!pushSubscribed) {
      showToast("Enable push notifications first", "error");
      return;
    }
    try {
      const payload = {
        league_id: leagueId,
        type: "system",
        title: "PadelHub Test Push",
        body: "If you can see this, push notifications are working!",
        target_user_ids: [user.id],
        // intentionally NO exclude_user_id so sender receives their own test
      };
      const { data, error } = await supabase.functions.invoke("push-notify", { body: payload });
      if (error) {
        if (import.meta.env.DEV) console.warn("[test-push] error:", error);
        showToast("Test failed: " + (error.message || "unknown"), "error");
        return;
      }
      if (import.meta.env.DEV) console.log("[test-push] response:", data);
      const sent = data?.sent || 0, total = data?.total || 0;
      if (sent > 0) showToast(`Test sent (${sent}/${total}) — check your home screen`);
      else if (total === 0) showToast("No subscriptions found — re-subscribe?", "error");
      else showToast(`Test failed: 0/${total} delivered`, "error");
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[test-push] threw:", err);
      showToast("Test push threw: " + (err.message || "unknown"), "error");
    }
  };

    const getStreak = (pid) => {
    const pMatches = approvedMatches.filter(m => m.team_a.includes(pid) || m.team_b.includes(pid));
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
    const [gA,gB]=setTotals(m.sets);
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
      const pMatches = approvedMatches.filter(m=>m.team_a.includes(p.id)||m.team_b.includes(p.id));
      const wins = pMatches.filter(m=>win(m.sets)===(m.team_a.includes(p.id)?"A":"B")).length;
      const losses = pMatches.length - wins;
      const winRate = pMatches.length>0?wins/pMatches.length:0;

      // Match diff: matches won minus matches lost (drives "Match Diff" tile + Iron Wall achievement)
      const gamesWon=wins,gamesLost=losses;

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
      approvedMatches.forEach(m=>{
        if(m.motm===p.id)motm++;
      });

      return {
        ...p,
        wins,losses,winRate,games:pMatches.length,gamesWon,gamesLost,streak,comebacks,motm,
      };
    });
  },[players,approvedMatches]);

  // ELO ratings — based on approved matches only (pending don't count)
  const elo = useMemo(()=>calcElo(players,approvedMatches),[players,approvedMatches]);

  // Leaderboard — Ranked by Total Wins > Win Rate > ELO > Games Played
  const lb = useMemo(()=>{
    return [...ps].filter(p=>p.games>0).sort((a,b)=>{
      if(b.wins!==a.wins)return b.wins-a.wins;
      const wrA=Math.round(a.winRate*1000), wrB=Math.round(b.winRate*1000);
      if(wrB!==wrA)return wrB-wrA;
      const eloA=elo[a.id]||1500, eloB=elo[b.id]||1500;
      if(eloB!==eloA)return eloB-eloA;
      if(b.games!==a.games)return b.games-a.games;
      return a.name.localeCompare(b.name);
    });
  },[ps,elo]);

  // Season-filtered matches (ranking tab uses selectedSeason; falls back to all-time when no season set)
  const selectedSeasonMatches = useMemo(
    () => selectedSeason ? approvedMatches.filter(m => m.season_id === selectedSeason) : approvedMatches,
    [approvedMatches, selectedSeason]
  );

  // Season-specific ELO (ranking tab only)
  const seasonElo = useMemo(() => calcElo(players, selectedSeasonMatches), [players, selectedSeasonMatches]);

  // Season-specific leaderboard (ranking tab only)
  const seasonLb = useMemo(() => {
    const sps = players.map(p => {
      const pM = selectedSeasonMatches.filter(m => m.team_a.includes(p.id) || m.team_b.includes(p.id));
      const wins = pM.filter(m => win(m.sets) === (m.team_a.includes(p.id) ? 'A' : 'B')).length;
      const losses = pM.length - wins;
      const winRate = pM.length > 0 ? wins / pM.length : 0;
      return { ...p, wins, losses, winRate, games: pM.length };
    });
    return sps.filter(p => p.games > 0).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const wrA = Math.round(a.winRate * 1000), wrB = Math.round(b.winRate * 1000);
      if (wrB !== wrA) return wrB - wrA;
      const eA = seasonElo[a.id] || 1500, eB = seasonElo[b.id] || 1500;
      if (eB !== eA) return eB - eA;
      if (b.games !== a.games) return b.games - a.games;
      return a.name.localeCompare(b.name);
    });
  }, [players, selectedSeasonMatches, seasonElo]);

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
    {/* Skeleton header — FT-12: matches new blended header treatment with tight padding */}
    <div style={{background:"linear-gradient(180deg,#0d0d14 0%,"+CD+" 100%)",padding:"4px 16px",paddingTop:"calc(env(safe-area-inset-top, 0px) + 0px)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
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
      const {error:err} = await supabase.from("players").insert({league_id:leagueId,name:newPlayerName.trim(),nickname:newPlayerNick.trim()||null,user_id:user.id});
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

          <button onClick={onSwitchLeague} style={{marginTop:16,width:"100%",padding:"10px",background:"transparent",border:`1px solid ${BD}`,borderRadius:10,color:MT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back to Leagues</button>
        </div>
      </div>
    );
  }

  // A-04: React Context — shared data available to all children without prop drilling
  // S022/S026: Plain object — NOT useMemo. Early returns above this line make useMemo violate Rules of Hooks.
  const leagueCtx = {
    supabase, user, leagueId, league, players, matches, approvedMatches, pendingMatches, incompleteMatches,
    elo, seasons, selectedSeason, setSelectedSeason, isAdmin, isOwner, myMemberId, leagueMembers, memberProfiles,
    getName, showToast, sendPushNotification, loadLeagueData,
  };

  return (
    <LeagueContext.Provider value={leagueCtx}>
    <div style={{background:BG,minHeight:"100vh",paddingBottom:"calc(82px + env(safe-area-inset-bottom, 0px))",fontFamily:"'Outfit',sans-serif",color:TX}}>
      {/* Issue #15 + #43 (S058): paint html/body to gradient-start color (#0d0d14) so rubber-band overscroll at the page top reveals a color identical to the header — no visible seam. The body bg paint is the actual fix; the previous `overscroll-behavior-y:none` was defensive and is now removed to restore native iOS rubber-band + momentum scrolling per #43. `-webkit-overflow-scrolling:touch` re-enables iOS momentum on legacy WebKit (no-op on iOS 13+).
          S050 .flag class: forces an emoji-priority font stack so country flag glyphs render across Windows / iOS / Android / macOS — without it, Windows may fall back to "PS"/"GB" letter blocks because the inherited Outfit font lacks emoji glyphs. */}
      <style>{`html,body{margin:0;padding:0;background:#0d0d14;-webkit-overflow-scrolling:touch;} #root{margin:0;padding:0;} .flag{font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Twemoji Mozilla','EmojiOne Color','Android Emoji',sans-serif;font-style:normal;font-weight:normal;} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}} input:focus,select:focus,textarea:focus{border-color:${A} !important;box-shadow:0 0 0 2px ${A}30 !important;}`}</style>
      {/* HEADER — Issue #46 Phase 2 + Phase 6a: class-based markup. Phase 6a adds drill-in back-mode (.hdr-back) when on Players tab with a player selected; back chevron + PLAYER PROFILE title replace the logo. Sticky behavior unchanged so Lessons #18 / #44 still hold. */}
      {tab==="stats" && selectedPlayer ? (
        <header className="hdr-back">
          <div className="hl">
            <button className="ibtn" onClick={()=>setSelectedPlayer(null)} aria-label="Back to players"><Icon name="back" size={18}/></button>
            <div className="hdr-title">Player Profile</div>
          </div>
          <div className="hr">
            <button className={"ibtn"+(sidebarView==="notifications"?" on":"")} onClick={()=>{setSidebarView(sidebarView==="notifications"?null:"notifications");setSidebarOpen(false);}} aria-label="Notifications">
              <Icon name="bell" size={16}/>
              {unreadNotifCount>0 && <span className="ndot">{unreadNotifCount>9?"9+":unreadNotifCount}</span>}
            </button>
            <button className={"av"+(sidebarOpen?" on":"")} onClick={()=>{setSidebarOpen(!sidebarOpen);setSidebarView(null);}} title="Profile & Settings" aria-label="Profile & Settings">
              {avatarUrl ? <img src={avatarUrl} alt=""/> : (user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
            </button>
          </div>
        </header>
      ) : (
        <header className="hdr">
          <div className="hl">
            <div className="logo">
              <PadelLogoSmall size={36}/>
              <h1 className="lt"><span>Padel</span><span className="accent">Hub</span></h1>
            </div>
          </div>
          <div className="hr">
            <button className="ibtn" onClick={()=>{loadLeagueData();showToast("Refreshed!");}} aria-label="Refresh"><Icon name="refresh" size={16}/></button>
            <button className={"ibtn"+(sidebarView==="notifications"?" on":"")} onClick={()=>{setSidebarView(sidebarView==="notifications"?null:"notifications");setSidebarOpen(false);}} aria-label="Notifications">
              <Icon name="bell" size={16}/>
              {unreadNotifCount>0 && <span className="ndot">{unreadNotifCount>9?"9+":unreadNotifCount}</span>}
            </button>
            <button className={"av"+(sidebarOpen?" on":"")} onClick={()=>{setSidebarOpen(!sidebarOpen);setSidebarView(null);}} title="Profile & Settings" aria-label="Profile & Settings">
              {avatarUrl ? <img src={avatarUrl} alt=""/> : (user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
            </button>
          </div>
        </header>
      )}

      {/* SIDEBAR — extracted component */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} setSidebarView={setSidebarView} user={user} avatarUrl={avatarUrl} league={league} isAdmin={isAdmin} onSwitchLeague={onSwitchLeague} showToast={showToast} installPrompt={installPrompt} handleInstall={handleInstall} playerCount={players.length} activeSeasonName={seasons.find(s=>s.id===selectedSeason)?.name||seasons.find(s=>s.active)?.name||null}/>

      {/* SIDEBAR VIEWS — render in main content area */}
      {sidebarView && (
        <div style={{padding:"0"}}>
          {sidebarView==="profile" && (
            <ProfileView user={user} avatarUrl={avatarUrl} avatarUploading={avatarUploading} uploadAvatar={uploadAvatar} removeAvatar={removeAvatar} claimedPlayer={claimedPlayer} ps={ps} elo={elo} matches={approvedMatches} players={players} isAdmin={isAdmin} getName={getName} getStreak={getStreak} setSidebarView={setSidebarView} setTab={setTab} setSidebarOpen={setSidebarOpen}/>
          )}
          {sidebarView==="admin" && (
            <AdminDashboard memberProfiles={memberProfiles} setSidebarView={setSidebarView} setTab={setTab} setSidebarOpen={setSidebarOpen}/>
          )}
          {sidebarView==="playerManagement" && (
            <PlayerManagement memberProfiles={memberProfiles} setSidebarView={setSidebarView}/>
          )}
          {sidebarView==="seasonManagement" && (
            <SeasonManagement setSidebarView={setSidebarView}/>
          )}
          {sidebarView==="leagueManagement" && (
            <LeagueManagement setSidebarView={setSidebarView}/>
          )}
          {sidebarView==="settings" && (
            <SettingsView user={user} claimedPlayer={claimedPlayer} isAdmin={isAdmin} pushSubscribed={pushSubscribed} subscribeToPush={subscribeToPush} unsubscribeFromPush={unsubscribeFromPush} notifNewMatch={notifNewMatch} notifRankingChange={notifRankingChange} notifNewMembers={notifNewMembers} notifChallenges={notifChallenges} toggleNotification={toggleNotification} onSwitchLeague={onSwitchLeague} setSidebarView={setSidebarView} showToast={showToast} loadLeagueData={loadLeagueData} testPushNotification={testPushNotification}/>
          )}
          {sidebarView==="platform" && (
            <PlatformAdmin onClose={()=>setSidebarView("admin")} showToast={showToast}/>
          )}
          {sidebarView==="notifications" && (
            <NotificationCenter onClose={()=>{setSidebarView(null);loadLeagueData();}}/>
          )}
          {sidebarView==="leagues" && (
            <LeaguesView
              user={user}
              leagues={leagues || []}
              leagueId={leagueId}
              handlers={leagueHandlers}
              onClose={()=>setSidebarView(null)}
              showToast={showToast}
            />
          )}
          {sidebarView==="rules" && <RulesView setSidebarView={setSidebarView}/>}
        </div>
      )}

      {/* RANKING TAB — Issue #46 Phase 4: class-based markup */}
      {!sidebarView && tab==="board" && !leagueId && (
        // S063: 0-league empty state. Replaces what LeagueGate used to render
        // for users with no memberships. CTAs open the in-app Leagues view.
        <div className="empty-leagues">
          <div className="empty-leagues-icon">🏟️</div>
          <div className="empty-leagues-title">You're not in a league yet</div>
          <div className="empty-leagues-sub">Create your first league to start tracking matches and rankings, or join an existing one with an invite code.</div>
          <div className="empty-leagues-actions">
            <button className="pbtn" style={{justifyContent:"center"}} onClick={()=>setSidebarView("leagues")}>
              Create your first league
            </button>
            <button className="gbtn" style={{justifyContent:"center"}} onClick={()=>setSidebarView("leagues")}>
              Join with invite code
            </button>
          </div>
        </div>
      )}
      {!sidebarView && tab==="board" && leagueId && (
        <div style={{padding:"0 16px 20px"}}>

          {/* Title + season selector */}
          <div className="lbbar">
            <h2 className="lbtitle">Leaderboard</h2>
            {seasons.length>0 && (
              <select className="spill" value={selectedSeason||""} onChange={e=>setSelectedSeason(e.target.value)}>
                {seasons.map(s=><option key={s.id} value={s.id}>{s.name}{s.active?" (active)":""}</option>)}
              </select>
            )}
          </div>

          {/* Season Awards Section — only shown for ended seasons */}
          {selectedSeason && !seasons.find(s=>s.id===selectedSeason)?.active && (() => {
            const awards = calculateSeasonAwards(selectedSeason);
            const hasAwards = Object.keys(awards).length > 0;
            const Avatar = ({pid, size=32}) => {
              const pl = players.find(p=>p.id===pid);
              return (
                <div style={{width:size,height:size,borderRadius:"50%",overflow:"hidden",background:`linear-gradient(135deg,${A}25,${A}08)`,border:`1.5px solid ${A}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.4,fontWeight:800,color:A,flexShrink:0}}>
                  {pl?.avatar_url ? <img src={pl.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (pl?.name?.[0]||"?").toUpperCase()}
                </div>
              );
            };
            return hasAwards && (
              <div style={{marginBottom:20}}>
                <h3 style={{fontSize:13,fontWeight:800,color:A,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:0.5}}>🏆 Season Awards</h3>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {/* Champion + Runner-Up side by side */}
                  {(awards.champion || awards.runnerUp) && (
                    <div style={{display:"grid",gridTemplateColumns:awards.runnerUp?"1fr 1fr":"1fr",gap:10}}>
                      {awards.champion && (
                        <div style={{padding:"14px 12px",background:`linear-gradient(135deg,${GD}15,${CD2})`,borderRadius:10,border:`1.5px solid ${GD}50`,display:"flex",flexDirection:"column",gap:8}}>
                          <div style={{fontSize:9,fontWeight:800,color:GD,letterSpacing:0.8,textTransform:"uppercase"}}>🥇 Champion</div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <Avatar pid={awards.champion.playerId} size={34}/>
                            <div>
                              <div style={{fontSize:13,fontWeight:900,color:TX,textTransform:"uppercase"}}>{getName(awards.champion.playerId)}</div>
                              <div style={{fontSize:11,color:GD,fontWeight:700}}>{awards.champion.wins} wins</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {awards.runnerUp && (
                        <div style={{padding:"14px 12px",background:`linear-gradient(135deg,${SV}12,${CD2})`,borderRadius:10,border:`1.5px solid ${SV}50`,display:"flex",flexDirection:"column",gap:8}}>
                          <div style={{fontSize:9,fontWeight:800,color:SV,letterSpacing:0.8,textTransform:"uppercase"}}>🥈 Runner-Up</div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <Avatar pid={awards.runnerUp.playerId} size={34}/>
                            <div>
                              <div style={{fontSize:13,fontWeight:900,color:TX,textTransform:"uppercase"}}>{getName(awards.runnerUp.playerId)}</div>
                              <div style={{fontSize:11,color:SV,fontWeight:700}}>{awards.runnerUp.wins} wins</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Top Pair — full-width, centered avatar+name per player */}
                  {awards.topPair && (
                    <div style={{padding:"14px 12px",background:CD2,borderRadius:10,border:`1px solid ${A}30`,textAlign:"center"}}>
                      <div style={{fontSize:9,fontWeight:800,color:A,letterSpacing:0.8,textTransform:"uppercase",marginBottom:10}}>🤝 Top Pair</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20}}>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:0,flex:1}}>
                          <Avatar pid={awards.topPair.playerIds[0]} size={32}/>
                          <div style={{fontSize:11,fontWeight:800,color:TX,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{getName(awards.topPair.playerIds[0])}</div>
                        </div>
                        <div style={{fontSize:13,color:MT,fontWeight:700,flexShrink:0}}>×</div>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:0,flex:1}}>
                          <Avatar pid={awards.topPair.playerIds[1]} size={32}/>
                          <div style={{fontSize:11,fontWeight:800,color:TX,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{getName(awards.topPair.playerIds[1])}</div>
                        </div>
                      </div>
                      <div style={{fontSize:10,color:A,fontWeight:600,marginTop:8}}>{awards.topPair.winRate}% WR · {awards.topPair.wins}W/{awards.topPair.total-awards.topPair.wins}L</div>
                    </div>
                  )}
                  {/* Bottom row: Most Active · Most MOTM · Longest Streak */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {awards.mostActive && (
                      <div style={{padding:"10px 8px",background:CD2,borderRadius:10,border:`1px solid ${BD}`}}>
                        <div style={{fontSize:8,fontWeight:800,color:MT,letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>⚡ Most Active</div>
                        <Avatar pid={awards.mostActive.playerId} size={26}/>
                        <div style={{fontSize:11,fontWeight:800,color:TX,marginTop:5,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getName(awards.mostActive.playerId)}</div>
                        <div style={{fontSize:10,color:A,fontWeight:700,marginTop:2}}>{awards.mostActive.value} MP</div>
                      </div>
                    )}
                    {awards.mostMotm && (
                      <div style={{padding:"10px 8px",background:CD2,borderRadius:10,border:`1px solid ${BD}`}}>
                        <div style={{fontSize:8,fontWeight:800,color:MT,letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>⭐ Most MOTM</div>
                        <Avatar pid={awards.mostMotm.playerId} size={26}/>
                        <div style={{fontSize:11,fontWeight:800,color:TX,marginTop:5,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getName(awards.mostMotm.playerId)}</div>
                        <div style={{fontSize:10,color:GD,fontWeight:700,marginTop:2}}>{awards.mostMotm.value}× MOTM</div>
                      </div>
                    )}
                    {awards.longestStreak && (
                      <div style={{padding:"10px 8px",background:CD2,borderRadius:10,border:`1px solid ${BD}`}}>
                        <div style={{fontSize:8,fontWeight:800,color:MT,letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>🔥 Cons. Wins</div>
                        <Avatar pid={awards.longestStreak.playerId} size={26}/>
                        <div style={{fontSize:11,fontWeight:800,color:TX,marginTop:5,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getName(awards.longestStreak.playerId)}</div>
                        <div style={{fontSize:10,color:A,fontWeight:700,marginTop:2}}>{awards.longestStreak.value} in a row</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Empty state */}
          {seasonLb.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",background:CD,borderRadius:12,border:`1px solid ${BD}`}}>
              <div style={{fontSize:40,marginBottom:12}}>🎾</div>
              <div style={{fontSize:15,fontWeight:600,color:TX,marginBottom:6}}>No rankings yet</div>
              <div style={{fontSize:12,color:MT,lineHeight:1.5}}>Play your first match to appear in the ranking.</div>
            </div>
          )}

          {/* Podium (Top 3) — only when 3+ players qualified */}
          {seasonLb.length>=3&&(
            <div className="pod-wrap">
              {/* 2nd place */}
              <div className="pod p2" onClick={()=>{setSelectedPlayer(seasonLb[1].id);setTab("stats");}}>
                <div className="pmedal">🥈</div>
                <div className="pname">{seasonLb[1].nickname||seasonLb[1].name}</div>
                <div className="prec">
                  <span style={{color:"var(--win)"}}>{seasonLb[1].wins}W</span>
                  <span style={{color:"var(--loss)"}}>{seasonLb[1].losses}L</span>
                </div>
                <div className="ppct">{(seasonLb[1].winRate*100).toFixed(0)}%</div>
                <div className="pelo">{Math.round(seasonElo[seasonLb[1].id]||1500)} ELO</div>
              </div>
              {/* 1st place */}
              <div className="pod p1" onClick={()=>{setSelectedPlayer(seasonLb[0].id);setTab("stats");}}>
                <div className="pmedal">🥇</div>
                <div className="pname">{seasonLb[0].nickname||seasonLb[0].name}</div>
                <div className="prec">
                  <span style={{color:"var(--win)"}}>{seasonLb[0].wins}W</span>
                  <span style={{color:"var(--loss)"}}>{seasonLb[0].losses}L</span>
                </div>
                <div className="ppct">{(seasonLb[0].winRate*100).toFixed(0)}%</div>
                <div className="pelo">{Math.round(seasonElo[seasonLb[0].id]||1500)} ELO</div>
              </div>
              {/* 3rd place */}
              <div className="pod p3" onClick={()=>{setSelectedPlayer(seasonLb[2].id);setTab("stats");}}>
                <div className="pmedal">🥉</div>
                <div className="pname">{seasonLb[2].nickname||seasonLb[2].name}</div>
                <div className="prec">
                  <span style={{color:"var(--win)"}}>{seasonLb[2].wins}W</span>
                  <span style={{color:"var(--loss)"}}>{seasonLb[2].losses}L</span>
                </div>
                <div className="ppct">{(seasonLb[2].winRate*100).toFixed(0)}%</div>
                <div className="pelo">{Math.round(seasonElo[seasonLb[2].id]||1500)} ELO</div>
              </div>
            </div>
          )}

          {/* S047/Phase4: Full ranking table — season-filtered, class-based */}
          {seasonLb.length>0&&(
            <div className="lbtable">
              {/* Header row */}
              <div className="lbth">
                <div className="lbh c">Rank</div>{/* S067: c = horizontally center to match .lbrank cells */}
                <div className="lbh">Player</div>
                <div className="lbh r" style={{justifyContent:"center"}}><Icon name="globe" size={12}/></div>{/* S066: globe icon, vertically centered */}
                <div className="lbh r">MP</div>
                <div className="lbh r" style={{color:"var(--win)"}}>MW</div>
                <div className="lbh r" style={{color:"var(--loss)"}}>ML</div>
                <div className="lbh r" style={{color:"var(--gold)"}}>CW</div>
                <div className="lbh r">Eff%</div>
              </div>
              {/* Data rows */}
              {seasonLb.map((p,idx)=>{
                const player = players.find(pp=>pp.id===p.id);
                const flag = player?.country ? flagEmoji(player.country) : "";
                const ctry = player?.country || "";
                const eff = (p.winRate*100).toFixed(0);
                const cw = getSeasonStreak(p.id);
                const form = getSeasonForm(p.id);
                const isMe = claimedPlayer?.id === p.id;
                return (
                  <div key={p.id} className={`lbrow${isMe?" me":""}`}
                    onClick={()=>{setSelectedPlayer(p.id);setTab("stats");}}>
                    <div className={`lbrank ${idx<3?"medal":"num"}`} style={{color:idx===0?"#facc15":idx===1?"#94a3b8":idx===2?"#c97b2e":"#9090a4"}}>
                      {idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":idx+1}
                    </div>
                    <div className="lbply">
                      <div className="lbavi">
                        {player?.avatar_url
                          ? <img src={player.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          : (p.name[0]||"?").toUpperCase()}
                      </div>
                      <div className="lbpinfo">
                        <div className="lbn">{p.nickname||p.name}</div>
                        {form.length>0&&(
                          <div className="form-dots">
                            {form.map((r,i)=><div key={i} className={`fdot ${r==="W"?"w":"l"}`}/>)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="lbflag">{/* S066: vertically centered via .lbflag */}
                      {flag
                        ? <span className="flag">{flag}</span>
                        : <span style={{fontSize:11,color:"#9090a4",opacity:.4}}>—</span>}
                    </div>
                    <div className="lbc">{p.games}</div>
                    <div className="lbc w">{p.wins}</div>
                    <div className="lbc l">{p.losses||"–"}</div>
                    <div className={`lbc${cw>=3?" cw":""}`}>{cw}</div>
                    <div className={`lbc ${parseFloat(eff)>=50?"hi":"lo"}`}>{eff}%</div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* LOG MATCH TAB */}
      {!sidebarView && tab==="log"&&selectedSeason&&(
        <LogMatch
          players={players}
          matches={approvedMatches}
          supabase={supabase}
          leagueId={leagueId}
          user={user}
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
              onEdit={(m)=>{setEditingMatch(m);setTab("log");}}
              shareMatch={shareMatch}
              sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
              onMatchDeleted={loadLeagueData}
            />
          </div>
          <div style={{display:matchSubTab==="schedule"?"block":"none"}}>
            <ScheduleView
              challenges={challenges}
              players={players}
              matches={approvedMatches}
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
        <ErrorBoundary><Suspense fallback={<LazyFallback/>}><CombosView
          combos={combos}
          players={players}
          matches={approvedMatches}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          getName={getName}
        /></Suspense></ErrorBoundary>
      )}

      {/* PLAYERS TAB */}
      {!sidebarView && tab==="stats"&&(
        <ErrorBoundary><Suspense fallback={<LazyFallback/>}><PlayerStats
          players={players}
          ps={Object.fromEntries(ps.map(p=>[p.id,p]))}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          getStreak={getStreak}
          getForm={getForm}
          elo={elo}
              seasonId={selectedSeason}
          sp={selectedPlayer}
          setSp={setSelectedPlayer}
          matches={approvedMatches}
          supabase={supabase}
          leagueId={leagueId}
          isAdmin={isAdmin}
          getName={getName}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
          onPlayersChange={loadLeagueData}
          showToast={showToast}
          claimedPlayer={claimedPlayer}
          leagueMembers={leagueMembers}
          league={league}
        /></Suspense></ErrorBoundary>
      )}

      {/* GAMEMODE TAB */}
      {!sidebarView && tab==="gamemode"&&(
        <ErrorBoundary><Suspense fallback={<LazyFallback/>}><GameMode
          tournament={tournament}
          setTournament={setTournament}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"Outfit"}}
        /></Suspense></ErrorBoundary>
      )}

      {/* RULES TAB */}
      {!sidebarView && tab==="rules"&&<div className="fu">
        <h2 style={{fontSize:18,fontWeight:800,marginBottom:4}}>Padel Rules</h2>
        <p style={{fontSize:11,color:MT,marginBottom:16}}>Official FIP rules summary</p>
        {RULES.map((r,i) => (
          <div key={i} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
            <h3 style={{fontSize:14,fontWeight:700,color:A,marginBottom:r.intro?4:6}}>{r.title}</h3>
            {r.intro && <p style={{fontSize:11,color:MT,marginBottom:10,fontStyle:"italic"}}>{r.intro}</p>}
            {r.subRules ? (
              r.subRules.map((sr,j) => (
                <div key={j} style={{background:CD2,borderRadius:8,padding:"10px 12px",marginTop:j===0?0:6}}>
                  <h4 style={{fontSize:12,fontWeight:700,color:GD,margin:"0 0 4px 0",letterSpacing:0.3}}>{sr.title}</h4>
                  <p style={{fontSize:12,color:TX,lineHeight:1.5,margin:0}}>{sr.content}</p>
                </div>
              ))
            ) : (
              <p style={{fontSize:13,color:TX,lineHeight:1.5}}>{r.content}</p>
            )}
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

      {/* FT-12 v2: solid pedestal behind floating nav — hides scrolled content from showing through side gutters / below nav. Issue #15: pedestal slimmed 82→68px to track tighter nav. Restored after Phase 2 visual revert. */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,height:`calc(68px + env(safe-area-inset-bottom, 0px))`,background:"#12121a",zIndex:99,pointerEvents:"none"}}/>
      {/* BOTTOM NAV — Issue #46 Phase 2 markup with S058 visuals restored. .bnav uses class-based markup but every value matches the inline-styled S058 nav (bg #12121af0, accent border 25%, simple .ntab.on direct bg, FAB text + with single shadow). NavIcons.jsx (S057, frozen) renders inside .nicon. Pedestal restored above this block per Lesson #34. */}
      <nav className="bnav">
        {TL.map(t => (
          <button key={t.key} className={"ntab"+(tab===t.key?" on":"")} onClick={()=>{setTab(t.key);setSidebarOpen(false);setSidebarView(null);}} aria-label={t.label} aria-current={tab===t.key?"page":undefined}>
            <span className="npill"/>
            <span className="nicon"><NavIcon name={t.icon} active={tab===t.key} size={22}/></span>
            <span className="nlbl">{t.label}</span>
          </button>
        ))}
        <div className="fab-wrap">
          <button className="fab" onClick={()=>{setEditingMatch(null);setTab("log");setSidebarOpen(false);setSidebarView(null);}} aria-label="Log a match">
            +
          </button>
        </div>
        {TR.map(t => (
          <button key={t.key} className={"ntab"+(tab===t.key?" on":"")} onClick={()=>{setTab(t.key);setSidebarOpen(false);setSidebarView(null);}} aria-label={t.label} aria-current={tab===t.key?"page":undefined}>
            <span className="npill"/>
            <span className="nicon"><NavIcon name={t.icon} active={tab===t.key} size={22}/></span>
            <span className="nlbl">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
    </LeagueContext.Provider>
  );
}

export default function App(){
  return (
    <AuthGate>
      {(user)=>(
        <LeagueGate user={user}>
          {({ leagueId, leagues, handlers })=>(
            <AppContent
              leagueId={leagueId}
              user={user}
              leagues={leagues}
              leagueHandlers={handlers}
            />
          )}
        </LeagueGate>
      )}
    </AuthGate>
  );
}
