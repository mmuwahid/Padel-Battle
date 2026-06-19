import React, { useState, useMemo, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { supabase } from './supabase';
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, BL, PU, TL, TR } from './theme';
import { formatTeam, win, formatDate, setTotals, flagEmoji, decodeImageFile } from './utils/helpers';
import { calcElo } from './utils/elo';
import { RULES, ARGUED } from './data/rules';
import { CourtIcon, PadelLogo, PadelLogoSmall, PadelHubMark, PadelHubMarkHeader } from './components/icons';
import { NavIcon } from './components/NavIcons';
import Icon from './components/Icon';
import { LiquidPressDelegate } from './components/LiquidPress';
import { FD } from './components/FormDots';
import { Sidebar } from './components/Sidebar';
import { ProfileView } from './components/ProfileView';
import { AdminDashboard } from './components/AdminDashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { ApprovalQueueScreen } from './components/ApprovalQueueScreen';
import { SeasonManagement } from './components/SeasonManagement';
import { PairsRanking } from './components/PairsRanking';
import { LeagueManagement } from './components/LeagueManagement';
import { PlatformAdmin } from './components/PlatformAdmin';
import { SettingsView } from './components/SettingsView';
import { RulesView } from './components/RulesView';
import { NotificationCenter } from './components/NotificationCenter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LeagueContext } from './LeagueContext';
import { VAPID_PUBLIC_KEY } from './vapidPublicKey';
import { PLATFORM_ADMIN_ID } from './components/PlatformAdmin';

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
import { AvatarCropModal } from './components/AvatarCropModal';
import { LogMatch } from './components/LogMatch';
const PlayerStats = lazy(() => import('./components/PlayerStats').then(m => ({default: m.PlayerStats})));
const PairsList = lazy(() => import('./components/PairsList').then(m => ({default: m.PairsList})));
const PairStats = lazy(() => import('./components/PairStats').then(m => ({default: m.PairStats})));
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
  const [selectedPair,setSelectedPair]=useState(null);
  // S068: track origin tab when a drill-in is opened from a non-Players tab
  // (e.g. Ranking podium → drill-in). On back chevron, restore origin tab so
  // user lands where they came from instead of always landing on Players grid.
  const [drillInOrigin,setDrillInOrigin]=useState(null);
  // S070 Issue #79: notification click-through. When set, MatchHistory scrolls
  // to the matching .mcard, flashes a highlight, then calls onScrolled() to clear.
  const [scrollToMatchId,setScrollToMatchId]=useState(null);
  // S074 FT-16: deep-link target for an open-match card (notification click-through).
  const [prefilledOpenMatch,setPrefilledOpenMatch]=useState(null);
  const [scrollToOpenMatchId,setScrollToOpenMatchId]=useState(null);
  const [selectedSeason,setSelectedSeason]=useState(null);
  const [tournament,setTournament]=useState(null);
  // FT-05: Challenges/Scheduling
  const [challenges,setChallenges]=useState([]);
  // S073 FT-16: open-match voting (open/locked/completed/cancelled lifecycle).
  const [openMatches,setOpenMatches]=useState([]);
  const [openMatchPlayers,setOpenMatchPlayers]=useState([]);
  // S076 FT-15: pairs roster (registered pair entities for pairs-format seasons)
  const [pairs,setPairs]=useState([]);
  // S077 r9: per-season rosters (seasonId -> Set of playerIds). Loaded once
  // on loadLeagueData so SeasonManagement doesn't have to round-trip on open.
  const [seasonRosters,setSeasonRosters]=useState({});
  const [smAutoCreate,setSmAutoCreate]=useState(false); // A1: auto-open Season create from Ranking CTA
  const [matchSubTab,setMatchSubTab]=useState(()=>{const h=window.location.hash.replace("#","");return h==="schedule"?"schedule":"history";}); // history | schedule
  const [claimedPlayer,setClaimedPlayer]=useState(undefined); // undefined=loading, null=unclaimed, object=claimed
  // Sidebar and view management
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [sidebarView,setSidebarView]=useState(null); // null | "profile" | "settings" | "admin" | "leagues"
  // S068: history stack so drill-down chains (drawer → settings → admin → playerMgmt)
  // can incrementally back-out one level at a time. Each navigateSidebar push the
  // CURRENT view onto the stack; goBackSidebar pops it. Empty stack + back == reopen
  // the drawer (since the user originally entered from the drawer).
  const [sidebarHistory,setSidebarHistory]=useState([]);
  // S077 r13: lifted from LeagueManagement so the detail-mode survives unmount
  // when navigating to PlayerManagement / SeasonManagement (back button returns
  // to the same league detail instead of falling back to the leagues list).
  const [lmDetailLeagueId,setLmDetailLeagueId]=useState(null);
  // S079: track when LeagueManagement detail was opened from PlatformAdmin so
  // the back button returns to PlatformAdmin instead of the LM list view.
  const [lmDetailFromPlatform,setLmDetailFromPlatform]=useState(false);
  // S077 r13: per-league counts for League Management card subtitles.
  const [leagueStats,setLeagueStats]=useState({});
  const navigateSidebar = useCallback((next) => {
    setSidebarHistory(prev => [...prev, sidebarView]);
    setSidebarView(next);
    setSidebarOpen(false);
  }, [sidebarView]);
  // S077 r14: scroll to top whenever the sidebarView changes so submenu screens
  // (League Management, Platform Admin, Season Management, etc.) always open at
  // the top of the page instead of inheriting the previous screen's scroll.
  useEffect(() => {
    try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch {}
  }, [sidebarView]);

  const goBackSidebar = useCallback(() => {
    setSidebarHistory(prev => {
      if (prev.length === 0) {
        setSidebarView(null);
        setSidebarOpen(true);
        return prev;
      }
      const top = prev[prev.length - 1];
      setSidebarView(top);
      if (top === null) setSidebarOpen(true);
      return prev.slice(0, -1);
    });
  }, []);
  // Avatar click should reset the chain — opening the drawer fresh.
  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    setSidebarView(null);
    setSidebarHistory([]);
  }, []);
  // S063: "Switch League" / "Back to Leagues" now open the in-app Leagues
  // sub-view in the sidebar instead of nulling out the leagueId. Replaces
  // the old LeagueGate full-screen picker.
  const onSwitchLeague = () => navigateSidebar("leagues");

  // S070 Issue #79: route a NotificationCenter click to its destination tab/screen.
  // Declared after sidebarHistory state so the setter is in TDZ-safe scope.
  // S075 FT-16: navigate to LogMatch with an open_match pre-filled.
  const handleLogOpenMatch = useCallback((om) => {
    setPrefilledOpenMatch(om);
    setTab("log");
  }, []);

  const handleNotifNavigate = useCallback((target) => {
    if (!target) return;
    // Always close the notif drawer + sidebar overlay before routing.
    setSidebarView(null);
    setSidebarHistory([]);
    setSidebarOpen(false);
    if (target.sidebarView) {
      // S087: render the requested sub-view (e.g. approvalQueue) in the main
      // content area; keep the drawer CLOSED. Previously this opened the drawer
      // (setSidebarOpen(true)) which stacked the menu OVER the approval queue.
      setSidebarView(target.sidebarView);
      return;
    }
    if (target.tab === "stats" && target.playerId) {
      setDrillInOrigin("history");
      setSelectedPlayer(target.playerId);
      setTab("stats");
      return;
    }
    if (target.tab) {
      setSelectedPlayer(null);
      setTab(target.tab);
      // S074 FT-16: schedule sub-tab for open-match deep-links
      if (target.subTab === "schedule") setMatchSubTab("schedule");
      else if (target.tab === "history") setMatchSubTab("history");
      if (target.matchId) {
        // Defer scroll-target set until after the tab switch + first paint.
        setTimeout(() => setScrollToMatchId(target.matchId), 0);
      }
      if (target.openMatchId) {
        setTimeout(() => setScrollToOpenMatchId(target.openMatchId), 0);
      }
    }
  }, []);

  const [avatarUrl,setAvatarUrl]=useState(null);
  const [avatarUploading,setAvatarUploading]=useState(false);

  // FT-03: Load avatar URL from profiles table
  useEffect(()=>{
    (async()=>{
      const {data}=await supabase.from("profiles").select("avatar_url").eq("id",user.id).single();
      if(data?.avatar_url)setAvatarUrl(data.avatar_url);
    })();
  },[user.id]);

  // S069: avatar pick now opens AvatarCropModal first; the modal returns a
  // pre-cropped 200x200 JPEG blob to uploadCroppedAvatar(). The legacy
  // auto-center-crop path is retained as fallback if the cropper fails.
  const [avatarFile, setAvatarFile] = useState(null);
  const uploadAvatar = (file) => {
    if (!file) return;
    setAvatarFile(file);
  };

  // FT-03 / Issue #20: Upload avatar (200x200 already, upload to storage, save URL).
  // S069: input is now a pre-cropped blob from AvatarCropModal. Path/storage logic
  // unchanged; we just skip the canvas resize step.
  const uploadCroppedAvatar = async (blob) => {
    if (!blob) return;
    setAvatarFile(null);
    setAvatarUploading(true);
    try{
      const path=`${user.id}/avatar.jpg`;
      // S067: 1-retry upload pattern (iOS PWA storage cold-start race)
      let upErr=null;
      for(let attempt=0;attempt<2;attempt++){
        const {error}=await supabase.storage.from("avatars").upload(path,blob,{upsert:true,contentType:"image/jpeg"});
        if(!error){upErr=null;break;}
        upErr=error;
        if(attempt===0)await new Promise(r=>setTimeout(r,250));
      }
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
  // S068 Issue #46: pending join-request count for Matches-tab banner + AdminDashboard card
  const [pendingJoinCount,setPendingJoinCount]=useState(0);
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

  // S108 Issue #108: an existing member who clicked an invite link for ANOTHER
  // league had a pending approval request created (LeagueGate). They keep full
  // access here, so surface a one-time toast letting them know it's pending.
  useEffect(()=>{
    try {
      const lg = sessionStorage.getItem("padelhub_join_pending");
      if (lg) {
        sessionStorage.removeItem("padelhub_join_pending");
        showToast(`Request sent to "${lg}". Waiting for admin approval.`);
      }
    } catch { /* sessionStorage may be unavailable */ }
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
  // S087: debouncedReload is memoized once ([]), but loadLeagueData is recreated
  // each render closing over the CURRENT leagueId. Calling loadLeagueData directly
  // pinned this debounced realtime reload to the INITIAL league — so after
  // switching leagues, a realtime tick reloaded the OLD league's data (only an
  // app restart fixed it). Route through a ref that always holds the latest fn.
  const loadLeagueDataRef = useRef(null);
  const debouncedReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => { loadLeagueDataRef.current?.(); }, 500);
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
      // S068: refresh pending join-request count alongside notifications
      supabase.from("join_requests").select("id",{count:"exact",head:true}).eq("league_id",leagueId).eq("status","pending").then(({count})=>setPendingJoinCount(count||0));
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
        {data:challengesData},
        {data:openMatchesData},
        {data:openMatchPlayersData},
        {data:pairsData},
        {data:seasonPlayersData}
      ] = await Promise.all([
        supabase.from("leagues").select("id,name,invite_code,created_by").eq("id",leagueId).single(),
        supabase.from("league_members").select("id,role").eq("league_id",leagueId).eq("user_id",user.id).single(),
        supabase.from("league_members").select("id,user_id,role,profiles(id,email,display_name,avatar_url)").eq("league_id",leagueId),
        supabase.from("players").select("id,name,nickname,user_id,created_by,created_at,avatar_url,country,playing_position,gender,date_of_birth,handedness,grade,grade_source,self_assessment").eq("league_id",leagueId).order("name"),
        supabase.from("matches").select("id,team_a,team_b,sets,motm,date,season_id,league_id,status,logged_by,created_at,open_match_id").eq("league_id",leagueId).order("date",{ascending:false}).limit(500),
        supabase.from("seasons").select("id,name,active,start_date,end_date,location,format,ruleset").eq("league_id",leagueId).order("start_date"),
        supabase.from("challenges").select("id,team_a,team_b,status,date,time,location,notes,created_by,match_id,responses,duration,league_id").eq("league_id",leagueId).in("status",["open","pending","confirmed","played"]).order("date",{ascending:true}),
        supabase.from("open_matches").select("id,league_id,season_id,organizer_id,scheduled_at,duration_minutes,court,notes,status,team_a_player_ids,team_b_player_ids,locked_at,created_at").eq("league_id",leagueId).in("status",["open","locked"]).order("scheduled_at",{ascending:true}),
        supabase.from("open_match_players").select("id,open_match_id,player_id,joined_at"),
        supabase.from("pairs").select("id,season_id,league_id,player_a_id,player_b_id,name,color,elo,created_at").eq("league_id",leagueId),
        supabase.from("season_players").select("season_id,player_id")
      ]);

      if (leagueErr) throw leagueErr;
      setLeague(leagueData);
      // S044/FT-09: Split owner vs admin. Owner = league creator (cannot be demoted).
      // Admin = owner OR league_members.role='admin' (can be promoted/demoted by owner).
      // S079 Issue #99: Platform Admin elevates to owner+admin in ANY league they're
      // viewing, so Player/Season Management buttons unlock + data renders.
      const isPlatform = user.id === PLATFORM_ADMIN_ID;
      const owner = leagueData?.created_by === user.id || isPlatform;
      setIsOwner(owner);
      setIsAdmin(owner || memberData?.role==="admin" || isPlatform);
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
      // S073 FT-16: open-match state — filter join-table rows to only those
      // belonging to the loaded open matches (defensive against orphans).
      const omIds = new Set((openMatchesData||[]).map(o=>o.id));
      setOpenMatches(openMatchesData||[]);
      setOpenMatchPlayers((openMatchPlayersData||[]).filter(p=>omIds.has(p.open_match_id)));
      setPairs(pairsData||[]);
      // S077 r13: fetch per-league counts via the new RPC. Best-effort — errors
      // don't block the main load.
      supabase.rpc("get_league_stats").then(({data, error}) => {
        if (error || !data) return;
        const map={};
        data.forEach(r => { map[r.league_id] = { players: r.player_count, matches: r.match_count, seasons: r.season_count, is_playing: r.is_playing }; });
        setLeagueStats(map);
      });
      const rostersMap={};
      (seasonPlayersData||[]).forEach(r=>{
        if(!rostersMap[r.season_id]) rostersMap[r.season_id]=new Set();
        rostersMap[r.season_id].add(r.player_id);
      });
      setSeasonRosters(rostersMap);
      // Auto-cancel stale open matches whose scheduled time has passed
      supabase.rpc("expire_stale_open_matches",{p_league_id:leagueId}).then(()=>{});

      // Fetch unread notification count
      supabase.from("notifications").select("id",{count:"exact",head:true}).eq("league_id",leagueId).eq("user_id",user.id).eq("read",false).then(({count})=>setUnreadNotifCount(count||0));
      // S068: refresh pending join-request count alongside notifications
      supabase.from("join_requests").select("id",{count:"exact",head:true}).eq("league_id",leagueId).eq("status","pending").then(({count})=>setPendingJoinCount(count||0));

      // Auto-expire stale challenges (48h) — lightweight, runs on each load
      supabase.rpc("expire_stale_challenges").then(()=>{});

      const claimed = (playersData||[]).find(p => p.user_id === user.id);
      setClaimedPlayer(claimed || null);

      setLoading(false);
      firstLoadRef.current = false;
    } catch (_err) {
      // S026: Clear state on error so user sees empty state, not stale data
      setLeague(null); setPlayers([]); setMatches([]); setSeasons([]); setChallenges([]); setOpenMatches([]); setOpenMatchPlayers([]); setPairs([]); setSeasonRosters({});
      setLoading(false);
      showToast("Failed to load data — tap refresh to retry", "error");
    }
  };
  // S087: keep the ref pointing at the latest loadLeagueData (current leagueId)
  // so the memoized debouncedReload always reloads the ACTIVE league.
  loadLeagueDataRef.current = loadLeagueData;

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

  // === Issue #92 — pair-format season isolation ===
  // Source of truth: seasons.format. We compute the set of pair-format season IDs once,
  // then derive parallel match slices so individual-player aggregations (ps / elo /
  // form / streak) never include matches from pair-format seasons.
  const pairFormatSeasonIds = useMemo(() => {
    const set = new Set();
    for (const sea of seasons) if (sea.format === 'pairs') set.add(sea.id);
    return set;
  }, [seasons]);
  const individualMatches = useMemo(
    () => approvedMatches.filter(m => !m.season_id || !pairFormatSeasonIds.has(m.season_id)),
    [approvedMatches, pairFormatSeasonIds]
  );
  const pairsMatches = useMemo(
    () => approvedMatches.filter(m => m.season_id && pairFormatSeasonIds.has(m.season_id)),
    [approvedMatches, pairFormatSeasonIds]
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
    const pMatches = individualMatches.filter(m => m.team_a.includes(pid) || m.team_b.includes(pid));
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
  const sendPushNotification = async (type, title, body, body_text, target_user_ids, opts) => {
    // Allow legacy 4-arg call: sendPushNotification(type, title, body, target_user_ids)
    // when arg 4 is array, treat it as target_user_ids and arg 3 as body
    if (Array.isArray(body_text)) { target_user_ids = body_text; body_text = undefined; }
    // S075 FT-16: also accept opts object in body_text slot (when caller passes null body_text + opts)
    if (body_text && typeof body_text === "object" && !Array.isArray(body_text) && body_text.skip_in_app !== undefined) { opts = body_text; body_text = undefined; }
    try {
      const payload = { league_id: leagueId, type, title, body, exclude_user_id: user.id };
      if (target_user_ids) payload.target_user_ids = target_user_ids;
      if (opts && opts.skip_in_app) payload.skip_in_app = true;
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

  // Set initial season. S087: also re-pick when the current selection isn't in
  // the loaded seasons (i.e. after a league switch the old league's season id is
  // stale) — otherwise the season-scoped leaderboard filters against a season
  // that doesn't exist in the new league and renders empty.
  useEffect(() => {
    if(seasons.length > 0 && (!selectedSeason || !seasons.some(s => s.id === selectedSeason))){
      const activeSeason = seasons.find(s => s.active);
      setSelectedSeason(activeSeason?.id || seasons[0]?.id);
    }
  }, [seasons, selectedSeason]);

  // Compute stats for each player
  const ps = useMemo(()=>{
    return players.map(p=>{
      const pMatches = individualMatches.filter(m=>m.team_a.includes(p.id)||m.team_b.includes(p.id));
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
      individualMatches.forEach(m=>{ if(m.motm===p.id)motm++; });

      return {
        ...p,
        wins,losses,winRate,games:pMatches.length,gamesWon,gamesLost,streak,comebacks,motm,
      };
    });
  },[players,individualMatches]);

  // ELO ratings — based on approved matches only (pending don't count)
  const elo = useMemo(()=>calcElo(players,individualMatches),[players,individualMatches]);

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
    const rosterSet = seasonRosters[selectedSeason];
    const sps = players.map(p => {
      const pM = selectedSeasonMatches.filter(m => m.team_a.includes(p.id) || m.team_b.includes(p.id));
      const wins = pM.filter(m => win(m.sets) === (m.team_a.includes(p.id) ? 'A' : 'B')).length;
      const losses = pM.length - wins;
      const winRate = pM.length > 0 ? wins / pM.length : 0;
      return { ...p, wins, losses, winRate, games: pM.length };
    });
    return sps.filter(p => p.games > 0 && (!rosterSet || rosterSet.size === 0 || rosterSet.has(p.id))).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const wrA = Math.round(a.winRate * 1000), wrB = Math.round(b.winRate * 1000);
      if (wrB !== wrA) return wrB - wrA;
      const eA = seasonElo[a.id] || 1500, eB = seasonElo[b.id] || 1500;
      if (eB !== eA) return eB - eA;
      if (b.games !== a.games) return b.games - a.games;
      return a.name.localeCompare(b.name);
    });
  }, [players, selectedSeasonMatches, seasonElo, seasonRosters, selectedSeason]);

  // Combos (most common team-ups). Issue #96: gamesDiff = signed sum of (myGames - oppGames) across all sets.
  const combos = useMemo(()=>{
    const combo={};
    matches.forEach(m=>{
      const w=win(m.sets);
      const [gA,gB]=setTotals(m.sets);
      [[m.team_a,w==="A",gA-gB],[m.team_b,w==="B",gB-gA]].forEach(([t,won,diff])=>{
        const key=t.slice().sort().join(",");
        if(!combo[key])combo[key]={players:t,wins:0,losses:0,gamesDiff:0};
        if(won)combo[key].wins++;else combo[key].losses++;
        combo[key].gamesDiff+=diff;
      });
    });
    return Object.values(combo).map(c=>({...c,games:c.wins+c.losses})).sort((a,b)=>b.games-a.games);
  },[matches]);

  // S067: pull-to-refresh — placed BEFORE the early `if (loading)` and
  // `if (!leagueId)` returns to satisfy Rules of Hooks (Lesson #25 BF-32).
  const ptrStartY = useRef(null);
  const ptrPulledRef = useRef(0);
  const [ptrPull, setPtrPull] = useState(0);
  const [ptrRefreshing, setPtrRefreshing] = useState(false);
  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY > 0) { ptrStartY.current = null; return; }
      ptrStartY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (ptrStartY.current == null || ptrRefreshing) return;
      const dy = e.touches[0].clientY - ptrStartY.current;
      if (dy > 0 && window.scrollY === 0) {
        const damped = Math.min(dy * 0.5, 100);
        ptrPulledRef.current = damped;
        setPtrPull(damped);
      }
    };
    const onTouchEnd = () => {
      if (ptrStartY.current == null || ptrRefreshing) { setPtrPull(0); return; }
      if (ptrPulledRef.current > 60) {
        setPtrRefreshing(true);
        setPtrPull(0);
        Promise.all([loadLeagueData(), new Promise(r => setTimeout(r, 1000))])
          .finally(() => setPtrRefreshing(false));
      } else {
        setPtrPull(0);
      }
      ptrStartY.current = null;
      ptrPulledRef.current = 0;
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptrRefreshing]);

  // S068 Issue #54: unified loading screen — matches AuthGate + LeagueGate
  // .lscreen design so the user sees ONE continuous splash from app cold-start
  // through login → leagues fetch → match data fetch, instead of three flashes
  // (auth lscreen → leagues lscreen → full-screen shimmer skeleton).
  if (loading) return (
    <div className="lscreen splash">
      <div className="lbg"/>
      <div className="lhero">
        <div className="llogobox"><PadelHubMark size={140}/></div>
        <div className="ltag">Loading…</div>
      </div>
    </div>
  );

  // S068 follow-up: orphaned league_member without a claimed player → show
  // a locked "pending review" screen instead of the legacy inline claim form.
  // The legacy form would have let users bypass the approval queue (Lesson #92).
  // PlayerMgmt.deletePlayer (S067) closed the source of new orphans; this
  // closes the bypass for any pre-S068 orphans still in the DB.
  //
  // S079 Issue #99 follow-up: Platform Admin entering another user's league
  // has no claimedPlayer (they're not a member), so this check would lock
  // them out. Platform Admin already has RLS-elevated visibility into every
  // league; they just need to bypass the claim-flow gate.
  if (claimedPlayer === null && user?.id !== PLATFORM_ADMIN_ID) {
    return (
      <div className="pend-screen">
        <div className="pend-brand">
          <div className="pend-brand-ico"><PadelHubMarkHeader size={28}/></div>
          <div className="pend-brand-tx">Padel<span className="accent">Hub</span></div>
        </div>
        <div className="pend-wrap">
          <div className="pend-bg-g"/>
          <div className="pend-ico g"><Icon name="clock" size={32} color="var(--accent)"/></div>
          <div className="pend-title">Pending Review</div>
          <div className="pend-sub">
            Your access to <strong>{league?.name || "this league"}</strong> is being reviewed. Your league admin will set up your player profile shortly.
          </div>
          <div className="pend-ctabtn">
            <Icon name="bell" size={15} color="var(--accent)"/>
            You'll be notified once approved
          </div>
          {leagues && leagues.length > 1 && (
            <button className="pend-signout" onClick={()=>{
              const other = leagues.find(l => l.id !== leagueId);
              if (other && leagueHandlers?.switchLeague) leagueHandlers.switchLeague(other.id);
            }}>
              Switch to another league
            </button>
          )}
          <button className="pend-signout" onClick={async ()=>{ await supabase.auth.signOut(); }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // A-04: React Context — shared data available to all children without prop drilling
  // S022/S026: Plain object — NOT useMemo. Early returns above this line make useMemo violate Rules of Hooks.
  const leagueCtx = {
    supabase, user, leagueId, league, players, matches, approvedMatches, pendingMatches, incompleteMatches,
    user, elo, seasons, selectedSeason, setSelectedSeason, isAdmin, isOwner, myMemberId, leagueMembers, memberProfiles,
    getName, showToast, sendPushNotification, loadLeagueData,
    openMatches, openMatchPlayers, pairs, seasonRosters, claimedPlayer,
    updateMemberRole,
  };

  return (
    <LeagueContext.Provider value={leagueCtx}>
    <div style={{background:BG,minHeight:"100vh",paddingBottom:"calc(82px + env(safe-area-inset-bottom, 0px))",fontFamily: "var(--font)",color:TX}}>
      {/* S070 Issue #80: pull-to-refresh now uses the full-screen brand splash
          (same .lscreen design as cold-start) instead of a small top spinner.
          User flagged that PTR should "see the same screen" as cold-start. */}
      {ptrRefreshing && (
        <div className="ptr-splash">
          <div className="lbg"/>
          <div className="lhero">
            <div className="llogobox"><PadelHubMark size={160}/></div>
            <h1 className="lbrand"><span>Padel</span><span className="accent">Hub</span></h1>
            <div className="ltag">Refreshing…</div>
          </div>
        </div>
      )}
      {ptrPull > 20 && !ptrRefreshing && (
        <div className={`ptr-pull visible`} style={{transform:`translateX(-50%) translateY(${ptrPull * 0.4}px)`}}>
          <Icon name={ptrPull > 60 ? "refresh" : "chevron-d"} size={14} color="currentColor" />
          {ptrPull > 60 ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}
      {/* Issue #15 + #43 (S058): paint html/body to gradient-start color (#0d0d14) so rubber-band overscroll at the page top reveals a color identical to the header — no visible seam. The body bg paint is the actual fix; the previous `overscroll-behavior-y:none` was defensive and is now removed to restore native iOS rubber-band + momentum scrolling per #43. `-webkit-overflow-scrolling:touch` re-enables iOS momentum on legacy WebKit (no-op on iOS 13+).
          S050 .flag class: forces an emoji-priority font stack so country flag glyphs render across Windows / iOS / Android / macOS — without it, Windows may fall back to "PS"/"GB" letter blocks because the inherited Outfit font lacks emoji glyphs. */}
      <style>{`html,body{margin:0;padding:0;background:#0d0d14;-webkit-overflow-scrolling:touch;} #root{margin:0;padding:0;} .flag{font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Twemoji Mozilla','EmojiOne Color','Android Emoji',sans-serif;font-style:normal;font-weight:normal;} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}} input:focus,select:focus,textarea:focus{border-color:${A} !important;box-shadow:0 0 0 2px ${A}30 !important;}`}</style>
      {/* HEADER — Issue #46 Phase 2: class-based markup. Header is ALWAYS the
          standard PadelHub bar (logo + bell + avatar). Drill-down screens render
          their own .back-btn-row chevron at the top of their content area —
          consistent with every other drill-down. */}
      <header className="hdr">
        <div className="hl">
          {/* S068: PadelHub logo is now a home link — clicking returns to the
              Ranking (home) tab and clears any drill-in / sidebar view. */}
          <button className="logo logo-home" onClick={()=>{
            setSelectedPlayer(null);
            setDrillInOrigin(null);
            setSidebarView(null);
            setSidebarOpen(false);
            setSidebarHistory([]);
            setTab("board");
          }} aria-label="Go to Ranking">
            <PadelHubMarkHeader size={32}/>
            <h1 className="lt"><span>Padel</span><span className="accent">Hub</span></h1>
          </button>
        </div>
        <div className="hr">
          {/* S067: refresh button removed — pull-to-refresh covers manual reload now. */}
          <button className={"ibtn"+(sidebarView==="notifications"?" on":"")} onClick={()=>{
            if (sidebarView==="notifications") { goBackSidebar(); }
            else { navigateSidebar("notifications"); }
          }} aria-label="Notifications">
            <Icon name="bell" size={16}/>
            {unreadNotifCount>0 && <span className="ndot">{unreadNotifCount>9?"9+":unreadNotifCount}</span>}
          </button>
          <button className={"av"+(sidebarOpen?" on":"")} onClick={()=>{
            if (sidebarOpen) { setSidebarOpen(false); }
            else { openSidebar(); }
          }} title="Profile & Settings" aria-label="Profile & Settings">
            {avatarUrl ? <img src={avatarUrl} alt=""/> : (user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
          </button>
        </div>
      </header>

      {/* SIDEBAR — extracted component */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} setSidebarView={setSidebarView} navigateSidebar={navigateSidebar} user={user} avatarUrl={avatarUrl} league={league} isAdmin={isAdmin} onSwitchLeague={onSwitchLeague} showToast={showToast} installPrompt={installPrompt} handleInstall={handleInstall} playerCount={players.length} activeSeasonName={seasons.find(s=>s.id===selectedSeason)?.name||seasons.find(s=>s.active)?.name||null}/>

      {/* SIDEBAR VIEWS — render in main content area */}
      {sidebarView && (
        <div style={{padding:"0"}}>
          {sidebarView==="profile" && (
            <ProfileView user={user} avatarUrl={avatarUrl} avatarUploading={avatarUploading} uploadAvatar={uploadAvatar} removeAvatar={removeAvatar} claimedPlayer={claimedPlayer} ps={ps} elo={elo} matches={approvedMatches} players={players} isAdmin={isAdmin} getName={getName} getStreak={getStreak} setSidebarView={setSidebarView} navigateSidebar={navigateSidebar} goBack={goBackSidebar} setTab={setTab} setSidebarOpen={setSidebarOpen}/>
          )}
          {sidebarView==="admin" && (
            <AdminDashboard memberProfiles={memberProfiles} setSidebarView={setSidebarView} navigateSidebar={navigateSidebar} goBack={goBackSidebar} setTab={setTab} setSidebarOpen={setSidebarOpen}/>
          )}
          {sidebarView==="approvalQueue" && (
            <ApprovalQueueScreen setSidebarView={setSidebarView} goBack={goBackSidebar}/>
          )}
          {sidebarView==="playerManagement" && (
            <PlayerManagement memberProfiles={memberProfiles} setSidebarView={setSidebarView} goBack={goBackSidebar}/>
          )}
          {sidebarView==="seasonManagement" && (
            <SeasonManagement setSidebarView={setSidebarView} goBack={goBackSidebar} autoCreate={smAutoCreate} clearAutoCreate={()=>setSmAutoCreate(false)}/>
          )}
          {sidebarView==="leagueManagement" && (
            <LeagueManagement setSidebarView={setSidebarView} navigateSidebar={navigateSidebar} goBack={goBackSidebar} leagues={leagues||[]} leagueHandlers={leagueHandlers} leagueStats={leagueStats} detailLeagueId={lmDetailLeagueId} setDetailLeagueId={setLmDetailLeagueId} detailFromPlatform={lmDetailFromPlatform} setDetailFromPlatform={setLmDetailFromPlatform}/>
          )}
          {sidebarView==="settings" && (
            <SettingsView user={user} claimedPlayer={claimedPlayer} isAdmin={isAdmin} pushSubscribed={pushSubscribed} subscribeToPush={subscribeToPush} unsubscribeFromPush={unsubscribeFromPush} notifNewMatch={notifNewMatch} notifRankingChange={notifRankingChange} notifNewMembers={notifNewMembers} notifChallenges={notifChallenges} toggleNotification={toggleNotification} onSwitchLeague={onSwitchLeague} setSidebarView={setSidebarView} navigateSidebar={navigateSidebar} goBack={goBackSidebar} showToast={showToast} loadLeagueData={loadLeagueData} testPushNotification={testPushNotification}/>
          )}
          {sidebarView==="platform" && (
            <PlatformAdmin onClose={goBackSidebar} showToast={showToast} onOpenLeague={(id)=>{ if(leagueHandlers?.switchLeague) leagueHandlers.switchLeague(id); setLmDetailLeagueId(id); setLmDetailFromPlatform(true); navigateSidebar("leagueManagement"); }}/>
          )}
          {sidebarView==="notifications" && (
            <NotificationCenter
              onClose={()=>{goBackSidebar();loadLeagueData();}}
              onNavigate={handleNotifNavigate}
            />
          )}
          {sidebarView==="leagues" && (
            <LeaguesView
              user={user}
              leagues={leagues || []}
              leagueId={leagueId}
              handlers={leagueHandlers}
              onClose={goBackSidebar}
              showToast={showToast}
            />
          )}
          {sidebarView==="rules" && <RulesView setSidebarView={setSidebarView} goBack={goBackSidebar}/>}
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
            <button className="pbtn" style={{justifyContent:"center"}} onClick={()=>setSidebarView("leagueManagement")}>
              Create your first league
            </button>
            <button className="gbtn" style={{justifyContent:"center"}} onClick={()=>setSidebarView("leagueManagement")}>
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
            {seasons.find(s=>s.id===selectedSeason)?.format==="pairs" && (
              <span className="fmtpill fmtpill-pairs">PAIRS</span>
            )}
            {seasons.length>0 && (()=>{ const _sa=seasons.find(s=>s.id===selectedSeason)?.active; return (
              <div style={{position:"relative",display:"inline-flex",alignItems:"center"}}>
                <select className="spill" value={selectedSeason||""} onChange={e=>setSelectedSeason(e.target.value)}
                  style={{appearance:"none",WebkitAppearance:"none",paddingRight:26,backgroundImage:"none",color:_sa?"var(--accent)":"var(--text)",fontWeight:_sa?700:400}}>
                  {seasons.map(s=><option key={s.id} value={s.id} style={{color:"#fff"}}>{s.name}{s.active?" (active)":""}</option>)}
                </select>
                <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%) rotate(90deg)",pointerEvents:"none",display:"flex"}}>
                  <Icon name="chevron" size={12} color={_sa?"var(--accent)":"#9090a4"}/>
                </span>
              </div>
            );})()}
          </div>

          {/* S076 FT-15 C4: branch to PairsRanking for pairs-format seasons */}
          {selectedSeason && seasons.find(s=>s.id===selectedSeason)?.format==="pairs" ? (
            <PairsRanking
              pairs={(pairs||[]).filter(pr=>pr.season_id===selectedSeason)}
              matches={approvedMatches.filter(m=>m.season_id===selectedSeason)}
              players={players}
              getName={getName}
              onPairDrillIn={(pr)=>{setDrillInOrigin(tab); setSelectedPair(pr.id); setTab("stats");}}
            />
          ) : (<>

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
                {/* S077: dropped trophy emoji — use Icon SVG. */}
                <h3 className="saw-title"><Icon name="trophy" size={14} color={A} strokeWidth={2}/>Season Awards</h3>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {/* Champion + Runner-Up — S077: centered title + centered
                      avatar+name+wins stack. SVG award icons replace emoji. */}
                  {(awards.champion || awards.runnerUp) && (
                    <div style={{display:"grid",gridTemplateColumns:awards.runnerUp?"1fr 1fr":"1fr",gap:10}}>
                      {awards.champion && (
                        <div className="saw-card saw-card-champ">
                          <div className="saw-cardh"><Icon name="award" size={11} color={GD} strokeWidth={2}/>Champion</div>
                          <div className="saw-stack">
                            <Avatar pid={awards.champion.playerId} size={36}/>
                            <div className="saw-pname">{getName(awards.champion.playerId)}</div>
                            <div className="saw-pmeta" style={{color:GD}}>{awards.champion.wins} wins</div>
                          </div>
                        </div>
                      )}
                      {awards.runnerUp && (
                        <div className="saw-card saw-card-runner">
                          <div className="saw-cardh"><Icon name="award" size={11} color={SV} strokeWidth={2}/>Runner-Up</div>
                          <div className="saw-stack">
                            <Avatar pid={awards.runnerUp.playerId} size={36}/>
                            <div className="saw-pname">{getName(awards.runnerUp.playerId)}</div>
                            <div className="saw-pmeta" style={{color:SV}}>{awards.runnerUp.wins} wins</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Top Pair — S077 redesign: crown SVG header, no × separator,
                      '/' between players, W/L on its own row with color coding
                      (W green if >0 else muted; L red if >0 else muted). */}
                  {awards.topPair && (() => {
                    const tpW = awards.topPair.wins;
                    const tpL = awards.topPair.total - awards.topPair.wins;
                    return (
                      <div className="saw-card saw-toppair">
                        <div className="saw-cardh"><Icon name="crown" size={12} color="#FFD700" strokeWidth={2}/>Top Pair</div>
                        <div className="saw-tpstack">
                          <div className="saw-tpplayer">
                            <Avatar pid={awards.topPair.playerIds[0]} size={34}/>
                            <div className="saw-pname">{getName(awards.topPair.playerIds[0])}</div>
                          </div>
                          <div className="saw-tpsep">/</div>
                          <div className="saw-tpplayer">
                            <Avatar pid={awards.topPair.playerIds[1]} size={34}/>
                            <div className="saw-pname">{getName(awards.topPair.playerIds[1])}</div>
                          </div>
                        </div>
                        <div className="saw-tpwr">{awards.topPair.winRate}% WR</div>
                        <div className="saw-tpwl">
                          <span style={{color: tpW > 0 ? "var(--win)" : "var(--muted)"}}>{tpW}W</span>
                          <span className="saw-tpwldot">·</span>
                          <span style={{color: tpL > 0 ? "var(--loss)" : "var(--muted)"}}>{tpL}L</span>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Bottom row: Most Active · Most MOTM · Longest Streak.
                      S077: titles + content centered, emoji → SVG icons. */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {awards.mostActive && (
                      <div className="saw-card saw-mini">
                        <div className="saw-cardh"><Icon name="zap" size={11} color={MT} strokeWidth={2}/>Most Active</div>
                        <div className="saw-stack">
                          <Avatar pid={awards.mostActive.playerId} size={28}/>
                          <div className="saw-pname-sm">{getName(awards.mostActive.playerId)}</div>
                          <div className="saw-pmeta-sm" style={{color:A}}>{awards.mostActive.value} MP</div>
                        </div>
                      </div>
                    )}
                    {awards.mostMotm && (
                      <div className="saw-card saw-mini">
                        <div className="saw-cardh"><Icon name="star" size={11} color={MT} strokeWidth={2}/>Most MOTM</div>
                        <div className="saw-stack">
                          <Avatar pid={awards.mostMotm.playerId} size={28}/>
                          <div className="saw-pname-sm">{getName(awards.mostMotm.playerId)}</div>
                          <div className="saw-pmeta-sm" style={{color:GD}}>{awards.mostMotm.value}× MOTM</div>
                        </div>
                      </div>
                    )}
                    {awards.longestStreak && (
                      <div className="saw-card saw-mini">
                        <div className="saw-cardh"><Icon name="flame" size={11} color={MT} strokeWidth={2}/>Cons. Wins</div>
                        <div className="saw-stack">
                          <Avatar pid={awards.longestStreak.playerId} size={28}/>
                          <div className="saw-pname-sm">{getName(awards.longestStreak.playerId)}</div>
                          <div className="saw-pmeta-sm" style={{color:A}}>{awards.longestStreak.value} in a row</div>
                        </div>
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
              <div style={{marginBottom:12,display:"flex",justifyContent:"center"}}>
                <Icon name="trophy" size={56} color="var(--muted)" strokeWidth={1.5}/>
              </div>
              <div style={{fontSize:15,fontWeight:600,color:TX,marginBottom:6}}>No rankings yet</div>
              <div style={{fontSize:12,color:MT,lineHeight:1.5}}>{seasons.length===0?"Create a season, then play your first match to appear here.":"Play your first match to appear in the ranking."}</div>
              {isAdmin&&seasons.length===0&&(
                <button className="pbtn" style={{margin:"16px auto 0"}} onClick={()=>{setSmAutoCreate(true);navigateSidebar("seasonManagement");}}>+ Create a Season</button>
              )}
            </div>
          )}

          {/* Podium (Top 3) — only when 3+ players qualified */}
          {seasonLb.length>=3&&(
            <div className="pod-wrap">
              {/* 2nd place */}
              <div className="pod p2" onClick={()=>{setDrillInOrigin(tab);setSelectedPlayer(seasonLb[1].id);setTab("stats");}}>
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
              <div className="pod p1" onClick={()=>{setDrillInOrigin(tab);setSelectedPlayer(seasonLb[0].id);setTab("stats");}}>
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
              <div className="pod p3" onClick={()=>{setDrillInOrigin(tab);setSelectedPlayer(seasonLb[2].id);setTab("stats");}}>
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
                <div className="lbh c">Player</div>{/* S068: also center the Player header text */}
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
                    onClick={()=>{setDrillInOrigin(tab);setSelectedPlayer(p.id);setTab("stats");}}>
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
                            {[...form].reverse().map((r,i)=><div key={i} className={`fdot ${r==="W"?"w":"l"}`}/>)}
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

          </>)}
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
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily: "var(--font)"}}
          lbl={{fontSize:12,color:MT,fontWeight:600,marginBottom:8}}
          getName={getName}
          seasonId={selectedSeason}
          seasons={seasons}
          roster={seasonRosters[selectedSeason]}
          setCurSeason={setSelectedSeason}
          onSave={loadLeagueData}
          showToast={showToast}
          sendPushNotification={sendPushNotification}
          prefilledOpenMatch={prefilledOpenMatch}
          onPrefilledHandled={()=>setPrefilledOpenMatch(null)}
          pairs={pairs}
        />
      )}

      {/* MATCHES TAB — with History | Schedule sub-tabs */}
      {!sidebarView && tab==="history"&&(
        <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
          {/* S068: per user direction, the join-request banner was removed from the
              Matches tab. The AdminDashboard's "Approval Queue" card is the single
              entry point for pending join requests. */}
          {/* FT-05: Sub-tab toggle */}
          <div style={{display:"flex",gap:4,marginBottom:16,background:CD,borderRadius:10,padding:3}}>
            {["history","schedule"].map(t=>(
              <button key={t} onClick={()=>setMatchSubTab(t)} style={{flex:1,padding:"8px 12px",borderRadius:8,border:"none",background:matchSubTab===t?A:"transparent",color:matchSubTab===t?"#000":MT,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily: "var(--font)",textTransform:"capitalize"}}>{t}</button>
            ))}
          </div>

          <div style={{display:matchSubTab==="history"?"block":"none"}}>
            <MatchHistory
              onEdit={(m)=>{setEditingMatch(m);setTab("log");}}
              shareMatch={shareMatch}
              sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily: "var(--font)"}}
              onMatchDeleted={loadLeagueData}
              scrollToMatchId={scrollToMatchId}
              onScrolled={()=>setScrollToMatchId(null)}
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
          seasons={seasons}
          seasonRosters={seasonRosters}
              openMatches={openMatches}
              openMatchPlayers={openMatchPlayers}
              claimedPlayer={claimedPlayer}
              scrollToOpenMatchId={scrollToOpenMatchId}
              onOpenMatchScrolled={()=>setScrollToOpenMatchId(null)}
              onLogOpenMatch={handleLogOpenMatch}
              sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily: "var(--font)"}}
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
      {!sidebarView && tab==="stats" && seasons.find(s=>s.id===selectedSeason)?.format==="pairs" && (
        selectedPair ? (
          <ErrorBoundary><Suspense fallback={<LazyFallback/>}><PairStats
            pair={(pairs||[]).find(pr=>pr.id===selectedPair)}
            pairs={(pairs||[]).filter(pr=>pr.season_id===selectedSeason)}
            matches={approvedMatches.filter(m=>m.season_id===selectedSeason)}
            players={players}
            getName={getName}
            season={seasons.find(s=>s.id===selectedSeason)}
            onBack={()=>setSelectedPair(null)}
          /></Suspense></ErrorBoundary>
        ) : (
          <ErrorBoundary><Suspense fallback={<LazyFallback/>}><PairsList
            pairs={(pairs||[]).filter(pr=>pr.season_id===selectedSeason)}
            matches={approvedMatches.filter(m=>m.season_id===selectedSeason)}
            players={players}
            getName={getName}
            onPairClick={(id)=>setSelectedPair(id)}
          /></Suspense></ErrorBoundary>
        )
      )}

      {/* PLAYERS TAB — individual format (default) */}
      {!sidebarView && tab==="stats" && seasons.find(s=>s.id===selectedSeason)?.format!=="pairs" && (
        <ErrorBoundary><Suspense fallback={<LazyFallback/>}><PlayerStats
          players={players}
          ps={Object.fromEntries(ps.map(p=>[p.id,p]))}
          pm={Object.fromEntries(players.map(p=>[p.id,p]))}
          getStreak={getStreak}
          getForm={getForm}
          elo={elo}
              seasonId={selectedSeason}
          sp={selectedPlayer}
          setSp={(id)=>{
            setSelectedPlayer(id);
            // S068: when closing the drill-in (id===null) and an origin tab was
            // captured at open-time, restore it so e.g. Ranking → drill-in →
            // back returns to Ranking instead of Players grid.
            if(id===null && drillInOrigin){ setTab(drillInOrigin); setDrillInOrigin(null); }
          }}
          matches={approvedMatches}
          supabase={supabase}
          leagueId={leagueId}
          isAdmin={isAdmin}
          getName={getName}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily: "var(--font)"}}
          onPlayersChange={loadLeagueData}
          showToast={showToast}
          claimedPlayer={claimedPlayer}
          leagueMembers={leagueMembers}
          league={league}
          seasons={seasons}
          seasonRosters={seasonRosters}
        /></Suspense></ErrorBoundary>
      )}

      {/* GAMEMODE TAB */}
      {!sidebarView && tab==="gamemode"&&(
        <ErrorBoundary><Suspense fallback={<LazyFallback/>}><GameMode
          tournament={tournament}
          setTournament={setTournament}
          sel={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily: "var(--font)"}}
        /></Suspense></ErrorBoundary>
      )}

      {/* RULES TAB */}
      {!sidebarView && tab==="rules"&&<div className="fu">
        <h2 style={{fontSize:18,fontWeight:800,marginBottom:4}}>Padel Rules</h2>
        <p style={{fontSize:11,color:MT,marginBottom:16}}>Official FIP rules summary</p>
        {RULES.map((r,i) => (
          <div key={i} style={{background:CD,borderRadius:12,border:`1px solid ${BD}`,padding:14,marginBottom:8}}>
            <h3 style={{fontSize:14,fontWeight:700,color:A,marginBottom:r.intro?4:6}}>{r.title}</h3>
            {r.intro && <p style={{fontSize:11,color:MT,marginBottom:10}}>{r.intro}</p>}
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
            <p style={{fontSize:12,color:MT,lineHeight:1.5}}>{detail}</p>
          </div>
        ))}
      </div>}

      {/* S069: Avatar crop/zoom modal — opens after the user picks a file via
          ProfileView (or any future caller of uploadAvatar). Returns a 200x200
          JPEG blob to uploadCroppedAvatar(). */}
      {avatarFile && (
        <AvatarCropModal
          file={avatarFile}
          onCancel={()=>setAvatarFile(null)}
          onCropped={uploadCroppedAvatar}
        />
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{position:"fixed",top:"calc(env(safe-area-inset-top, 20px) + 12px)",left:"50%",transform:"translateX(-50%)",zIndex:200,padding:"12px 24px",borderRadius:12,background:toast.type==="success"?A:DG,color:toast.type==="success"?"#000":"#fff",fontSize:13,fontWeight:700,fontFamily: "var(--font)",boxShadow:"0 4px 20px rgba(0,0,0,0.3)",animation:"fadeIn 0.2s ease-out",maxWidth:"90%",textAlign:"center"}}>
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
          <button className="fab lp" onClick={()=>{setEditingMatch(null);setTab("log");setSidebarOpen(false);setSidebarView(null);}} aria-label="Log a match">
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
    <>
      <LiquidPressDelegate/>
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
    </>
  );
}
