import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from '../supabase';
import { PadelLogoSmall } from './icons';
import { OnboardingScreen } from './OnboardingScreen';

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
      return [];
    }
    const userLeagues = (data || [])
      .map(m => ({ ...m.leagues, _userRole: m.role }))
      .filter(Boolean);
    setLeagues(userLeagues);
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

  // Initial load + ?invite=... auto-join handling
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
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
          setLoading(false);
          return;
        }
        window.history.replaceState(null, "", window.location.pathname);
      }
      resolveSelectedLeague(userLeagues);
      setLoading(false);
    })();
  }, [loadUserLeagues, resolveSelectedLeague]);

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
    return userLeagues;
  }, [loadUserLeagues]);

  // S063: createLeague accepts {name, format, autoSeason} — format defaults
  // to 'singles' for backward compat. autoSeason creates "Season 1" with the
  // same format so new leagues are immediately usable.
  const createLeague = useCallback(async ({ name, format = "singles", autoSeason = true }) => {
    if (!name?.trim()) throw new Error("League name required");
    if (!["singles", "pairs"].includes(format)) throw new Error("Invalid format");
    const { data: leagueData, error: leagueErr } = await supabase
      .from("leagues")
      .insert({ name: name.trim(), created_by: user.id, format })
      .select()
      .single();
    if (leagueErr) throw leagueErr;
    const leagueId = leagueData.id;
    if (autoSeason) {
      await supabase
        .from("seasons")
        .insert({
          league_id: leagueId,
          name: "Season 1",
          start_date: new Date().toISOString().split("T")[0],
          active: true,
        });
    }
    const updated = await loadUserLeagues();
    const newLeague = updated.find(l => l.id === leagueId);
    setSelectedLeagueId(leagueId);
    return newLeague || leagueData;
  }, [user.id, loadUserLeagues, setSelectedLeagueId]);

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
      <div className="lscreen">
        <div className="lbg" />
        <div className="lhero">
          <div className="llogobox"><PadelLogoSmall size={42} /></div>
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

  // S066 Phase 11: brand-new user with 0 leagues → run the 3-step onboarding
  // wizard. Once they create or join a league, leagues.length > 0 and we fall
  // through to render the children (AppContent).
  if (leagues.length === 0) {
    const showToast = (msg, kind) => {
      // Light toast for onboarding flow only — AppContent's useToast isn't
      // mounted yet. Falls back to console + alert for errors.
      if (kind === "error") {
        console.error(msg);
        try { window.alert(msg); } catch { /* noop */ }
      } else {
        console.log("[onboarding]", msg);
      }
    };
    return <OnboardingScreen user={user} handlers={handlers} showToast={showToast} onComplete={refreshLeagues}/>;
  }

  return children({ leagueId: selectedLeagueId, leagues, handlers });
}
