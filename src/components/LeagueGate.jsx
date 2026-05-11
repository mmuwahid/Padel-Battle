import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from '../supabase';
import { PadelLogoSmall, PadelHubMark } from './icons';
import { OnboardingScreen } from './OnboardingScreen';
import { PendingApprovalScreen } from './PendingApprovalScreen';
import { RejectedScreen } from './RejectedScreen';

/**
 * S063 redesign: LeagueGate is now a slim state shell, NOT a full-screen
 * picker. The full UI for switching/creating/joining leagues lives inside
 * the in-app sidebar (LeaguesView.jsx).
 *
 * Responsibilities of this shell:
 * - Load the user's league memberships from Supabase
 * - Manage the currently-selected leagueId (with localStorage persistence)
 * - Auto-resolve to last-used / first / null based on memberships
 * - Handle the ?invite=... auto-join flow on cold-launch
 * - Expose handlers for create / join / rename / delete / refresh / switch
 *
 * Children render-prop receives:
 *   leagueId        — currently selected (string | null)
 *   leagues         — array of memberships (with role, invite_code, format, ...)
 *   handlers        — { switchLeague, refreshLeagues, createLeague, joinLeague,
 *                       renameLeague, deleteLeague }
 *   loading         — true during initial load (suppress empty-state flash)
 *
 * AppContent handles leagueId=null by rendering an inline 0-league
 * empty-state on the Ranking tab (S063 Q1=A).
 */
const LAST_LEAGUE_LS_KEY = "padelhub_lastLeagueId";

export function LeagueGate({ user, children }) {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueIdRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  // S068 Issue #46: track latest join_request per league so 0-membership users
  // can see PendingApprovalScreen / RejectedScreen instead of restarting Onboarding.
  const [joinRequest, setJoinRequest] = useState(null); // { ...latest non-superseded request, league: {name,...} }
  const [retrying, setRetrying] = useState(false); // user tapped Try Again on RejectedScreen → show Onboarding
  const initRef = useRef(false);

  // Wrapper around setSelectedLeagueId that persists to localStorage.
  // Per S063 Q3=A: cold-launch restores last-used league.
  const setSelectedLeagueId = useCallback((id) => {
    setSelectedLeagueIdRaw(id);
    try {
      if (id) localStorage.setItem(LAST_LEAGUE_LS_KEY, id);
      else localStorage.removeItem(LAST_LEAGUE_LS_KEY);
    } catch { /* localStorage may be unavailable in private mode */ }
  }, []);

  const loadUserLeagues = useCallback(async () => {
    const { data, error } = await supabase
      .from("league_members")
      .select("league_id, role, leagues(id, name, invite_code, created_by, format, description)")
      .eq("user_id", user.id);
    if (error) {
      setLoading(false);
      // S077 r11: keep stale leagues on error — don't clobber to [] which
      // would route the user to OnboardingScreen/PendingApproval.
      return [];
    }
    const userLeagues = (data || [])
      .map(m => ({ ...m.leagues, _userRole: m.role }))
      .filter(Boolean);
    // S077 r11: stale-while-revalidate. If this fetch returned empty BUT we
    // previously had leagues for this user, keep the cached list. A transient
    // read-replica lag or stale JWT shouldn't route the user away. Only set
    // empty when we know for sure (initial cold-start where loading is true).
    setLeagues(prev => {
      if (userLeagues.length === 0 && prev.length > 0) return prev;
      return userLeagues;
    });
    return userLeagues;
  }, [user.id]);

  // Cold-launch resolution: pick a leagueId from memberships + localStorage
  const resolveSelectedLeague = useCallback((userLeagues) => {
    if (userLeagues.length === 0) {
      setSelectedLeagueIdRaw(null);
      return;
    }
    // Try restoring last-used (S063 Q3=A)
    let lastId = null;
    try { lastId = localStorage.getItem(LAST_LEAGUE_LS_KEY); } catch { /* noop */ }
    const restored = lastId && userLeagues.find(l => l.id === lastId);
    if (restored) {
      setSelectedLeagueIdRaw(restored.id);
    } else {
      // Fall back to first by membership join-order
      setSelectedLeagueIdRaw(userLeagues[0].id);
      try { localStorage.setItem(LAST_LEAGUE_LS_KEY, userLeagues[0].id); } catch { /* noop */ }
    }
  }, []);

  // S068 Issue #46: load this user's most-recent join_request that has not yet
  // been superseded. Used by the 0-leagues branch to route to Pending/Rejected.
  // Declared BEFORE the useEffects that depend on it — moving it after caused
  // a TDZ ReferenceError ("Cannot access before initialization") that broke
  // <LeagueGate> render entirely (S068 hotfix #2).
  const loadJoinRequest = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("join_requests")
        .select("id, league_id, type, player_id, display_name, country, gender, playing_position, status, reject_reason, created_at, leagues(id, name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) { setJoinRequest(null); return null; }
      const top = (data || [])[0];
      if (!top) { setJoinRequest(null); return null; }
      const shaped = { ...top, league: top.leagues || null };
      delete shaped.leagues;
      setJoinRequest(shaped);
      return shaped;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[LeagueGate] loadJoinRequest failed (non-fatal):", err);
      setJoinRequest(null);
      return null;
    }
  }, [user.id]);

  // Initial load + ?invite=... auto-join handling
  // S068 hardening: wrapped in try/finally so setLoading(false) ALWAYS runs.
  // Previously a thrown promise inside the IIFE could leave the app stuck on
  // the loading screen with no recovery path.
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("invite");
        let userLeagues = await loadUserLeagues();
        if (code) {
          const joined = await tryAutoJoin(code, userLeagues);
          if (joined) {
            userLeagues = await loadUserLeagues();
            setSelectedLeagueIdRaw(joined);
            try { localStorage.setItem(LAST_LEAGUE_LS_KEY, joined); } catch { /* noop */ }
            window.history.replaceState(null, "", window.location.pathname);
            return;
          }
          window.history.replaceState(null, "", window.location.pathname);
        }
        resolveSelectedLeague(userLeagues);
        // Load any open join_request so the 0-leagues branch knows whether to show
        // Onboarding vs Pending vs Rejected. loadJoinRequest is internally wrapped
        // and never throws, but the cover here is defense-in-depth.
        if (userLeagues.length === 0) await loadJoinRequest();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[LeagueGate] cold-start failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadUserLeagues, loadJoinRequest, resolveSelectedLeague]);

  // S068: poll join_request every 8s while on the Pending screen so the user sees
  // the approval transition without manually refreshing.
  useEffect(() => {
    if (leagues.length > 0) return;
    if (!joinRequest || joinRequest.status !== "pending") return;
    const t = setInterval(async () => {
      const j = await loadJoinRequest();
      if (j && j.status === "approved") {
        const updated = await loadUserLeagues();
        if (updated && updated.length > 0) {
          setSelectedLeagueId(updated[0].id);
        }
      }
    }, 8000);
    return () => clearInterval(t);
  }, [leagues.length, joinRequest, loadJoinRequest, loadUserLeagues, setSelectedLeagueId]);

  // S077 r8 safety net: when the user lands on the 0-leagues branch but has no
  // pending join_request, auto-retry loadUserLeagues every 3s for up to 30s.
  // Catches the createLeague trigger-commit race (and any stale-session race
  // where the user actually does have memberships but the first fetch returned
  // empty). Also retries on tab focus / visibilitychange so resuming from the
  // home screen triggers a fresh check.
  useEffect(() => {
    if (loading) return;
    if (leagues.length > 0) return;
    if (joinRequest && joinRequest.status === "pending") return;
    let tries = 0;
    const tick = async () => {
      tries++;
      const updated = await loadUserLeagues();
      if (updated && updated.length > 0) {
        setSelectedLeagueId(updated[0].id);
        return true;
      }
      return false;
    };
    const interval = setInterval(async () => {
      const ok = await tick();
      if (ok || tries >= 10) clearInterval(interval);
    }, 3000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loading, leagues.length, joinRequest, loadUserLeagues, setSelectedLeagueId]);

  // ── Handlers exposed to children ──
  const tryAutoJoin = async (code, currentLeagues) => {
    try {
      const { data: rpcData, error: findErr } = await supabase
        .rpc("lookup_league_by_invite", { code: code.trim() });
      const found = rpcData?.[0] || null;
      if (findErr || !found) return null;
      const already = currentLeagues.find(l => l.id === found.id);
      if (already) return found.id;
      const { error: addErr } = await supabase
        .from("league_members")
        .insert({ league_id: found.id, user_id: user.id, role: "member" });
      if (addErr) return null;
      const dn = user.user_metadata?.display_name || user.email?.split("@")[0] || "Someone";
      supabase.functions.invoke("push-notify", {
        body: { league_id: found.id, type: "members", title: "New Member Joined!", body: `${dn} joined the league`, exclude_user_id: user.id },
      }).catch(() => {});
      return found.id;
    } catch { return null; }
  };

  const refreshLeagues = useCallback(async () => {
    const userLeagues = await loadUserLeagues();
    await loadJoinRequest();
    return userLeagues;
  }, [loadUserLeagues, loadJoinRequest]);

  // S063: createLeague accepts {name, format, autoSeason} — format defaults
  // to 'singles' for backward compat. autoSeason creates "Season 1" with the
  // same format so new leagues are immediately usable.
  // S077 r9: atomic create_league RPC. The DB function inserts the league,
  // the owner's admin membership (via handle_new_league trigger), and the
  // optional Season 1 inside a single transaction. No more multi-step race.
  const createLeague = useCallback(async ({ name, format = "singles", autoSeason = true }) => {
    if (!name?.trim()) throw new Error("League name required");
    if (!["singles", "pairs"].includes(format)) throw new Error("Invalid format");
    const { data, error } = await supabase.rpc("create_league", {
      p_name: name.trim(),
      p_format: format,
      p_auto_season: autoSeason,
    });
    if (error) throw error;
    const leagueId = data?.id;
    if (!leagueId) throw new Error("Create league returned no id");
    const updated = await loadUserLeagues();
    const newLeague = updated.find(l => l.id === leagueId);
    setSelectedLeagueId(leagueId);
    return newLeague || { id: leagueId, name: name.trim(), invite_code: data.invite_code };
  }, [loadUserLeagues, setSelectedLeagueId]);

  const joinLeague = useCallback(async (code) => {
    if (!code?.trim()) throw new Error("Invite code required");
    const { data: rpcData, error: findErr } = await supabase
      .rpc("lookup_league_by_invite", { code: code.trim() });
    const found = rpcData?.[0] || null;
    if (findErr || !found) throw new Error("Invalid invite code");
    const leagueId = found.id;
    const { data: existing } = await supabase
      .from("league_members").select("id").eq("league_id", leagueId).eq("user_id", user.id).single();
    if (!existing) {
      const { error: addErr } = await supabase
        .from("league_members").insert({ league_id: leagueId, user_id: user.id, role: "member" });
      if (addErr) throw addErr;
      const dn = user.user_metadata?.display_name || user.email?.split("@")[0] || "Someone";
      supabase.functions.invoke("push-notify", {
        body: { league_id: leagueId, type: "members", title: "New Member Joined!", body: `${dn} joined the league`, exclude_user_id: user.id },
      }).catch(() => {});
    }
    await loadUserLeagues();
    setSelectedLeagueId(leagueId);
    return found;
  }, [user.id, loadUserLeagues, setSelectedLeagueId]);

  const renameLeague = useCallback(async (leagueId, newName) => {
    if (!newName?.trim()) throw new Error("Name required");
    const { error } = await supabase.from("leagues").update({ name: newName.trim() }).eq("id", leagueId);
    if (error) throw error;
    await loadUserLeagues();
  }, [loadUserLeagues]);

  const deleteLeague = useCallback(async (leagueId) => {
    const { error } = await supabase.from("leagues").delete().eq("id", leagueId);
    if (error) throw error;
    if (selectedLeagueId === leagueId) {
      const remaining = await loadUserLeagues();
      setSelectedLeagueId(remaining[0]?.id || null);
    } else {
      await loadUserLeagues();
    }
  }, [selectedLeagueId, loadUserLeagues, setSelectedLeagueId]);

  // Slim loading screen (re-uses Phase 3 .lscreen styling, but only shows
  // briefly during cold launch — usually <500ms).
  if (loading) {
    return (
      <div className="lscreen splash">
        <div className="lbg" />
        <div className="lhero">
          <div className="llogobox"><PadelHubMark size={140} /></div>
          <div className="ltag">Loading…</div>
        </div>
      </div>
    );
  }

  const handlers = {
    switchLeague: setSelectedLeagueId,
    refreshLeagues,
    createLeague,
    joinLeague,
    renameLeague,
    deleteLeague,
  };

  // S066 Phase 11 + S068 Issue #46: brand-new user with 0 leagues → either run
  // the 3-step Onboarding wizard, OR (if they have an open join_request) route
  // to PendingApprovalScreen / RejectedScreen.
  if (leagues.length === 0) {
    const showToast = (msg, kind) => {
      if (kind === "error") {
        console.error(msg);
        try { window.alert(msg); } catch { /* noop */ }
      } else {
        console.log("[onboarding]", msg);
      }
    };
    const onSignOut = async () => { await supabase.auth.signOut(); };

    // Pending: show waiting screen (Q2=A — locked, no app access).
    if (!retrying && joinRequest && joinRequest.status === "pending") {
      return (
        <PendingApprovalScreen
          leagueName={joinRequest.league?.name}
          request={joinRequest}
          onSignOut={onSignOut}
        />
      );
    }
    // Rejected (with no newer pending): show rejected screen + Try Again.
    if (!retrying && joinRequest && joinRequest.status === "rejected") {
      return (
        <RejectedScreen
          leagueName={joinRequest.league?.name}
          request={joinRequest}
          onTryAgain={() => setRetrying(true)}
          onSignOut={onSignOut}
        />
      );
    }
    // Default / Try Again: run Onboarding.
    return (
      <OnboardingScreen
        user={user}
        handlers={handlers}
        showToast={showToast}
        onComplete={async () => { await refreshLeagues(); setRetrying(false); }}
      />
    );
  }

  return children({ leagueId: selectedLeagueId, leagues, handlers });
}
