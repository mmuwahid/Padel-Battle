import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { supabase } from "../supabase";

export const PLATFORM_ADMIN_ID = "8362be01-8e73-49c1-90c8-065fc6a09159";

// S067 Phase 12 PR 3: spec-faithful Platform Admin.
// Class names match docs/PadelHub_Complete_v2.jsx lines 2081-2132 verbatim:
//   .pastats / .pasc / .pasch / .pascico (.g .o .gr) / .pascl / .pascv / .pascsub
//   .pafilbar / .pafil (.on)        — filter pills (Leagues / Users)
//   .pasrw / .pasri / .pasr         — search bar
//   .palist / .paitem / .paavi / .paib / .pain / .paim / .paia / .aib (.da)
// User decision S067 Q7=A: Active (7d) card dropped (3 stat cards only).
// Type-to-confirm destructive flow preserved (typed name/email match before
// platform_delete_league / platform_delete_user).
export function PlatformAdmin({ onClose, showToast }) {
  const [stats, setStats] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("leagues");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteTyped, setDeleteTyped] = useState("");
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null);
  const [deleteUserTyped, setDeleteUserTyped] = useState("");
  // S067: rename-league inline editor.
  const [renameId, setRenameId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [statsRes, leaguesRes, usersRes] = await Promise.allSettled([
        supabase.rpc("platform_get_stats"),
        supabase.rpc("platform_get_leagues"),
        supabase.rpc("platform_get_users"),
      ]);
      if (statsRes.status === "fulfilled" && statsRes.value.data) setStats(statsRes.value.data);
      if (leaguesRes.status === "fulfilled" && leaguesRes.value.data) setLeagues(leaguesRes.value.data);
      if (usersRes.status === "fulfilled" && usersRes.value.data) setUsers(usersRes.value.data);
      const allFailed = [statsRes, leaguesRes, usersRes].every(r => r.status === "rejected" || r.value?.error);
      if (allFailed) setLoadError(true);
    } catch (_err) {
      setLoadError(true);
    }
    setLoading(false);
  };

  const handleRenameLeague = async (leagueId) => {
    const trimmed = renameDraft.trim();
    if (!trimmed) { if (showToast) showToast("Name required", "error"); return; }
    setRenaming(true);
    try {
      const { error } = await supabase.rpc("update_league_name", { p_league_id: leagueId, p_name: trimmed });
      if (error) throw error;
      if (showToast) showToast("League renamed");
      setRenameId(null); setRenameDraft("");
      await loadData();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to rename", "error");
    }
    setRenaming(false);
  };

  // S068: simplified destructive-confirm — type "DELETE" instead of the full
  // league name / user email. User direction: easier + still requires intent.
  const handleDeleteLeague = async (leagueId, leagueName) => {
    if (deleteConfirm !== leagueId) { setDeleteConfirm(leagueId); setDeleteTyped(""); return; }
    if (deleteTyped.trim().toUpperCase() !== "DELETE") { if (showToast) showToast('Type DELETE in capitals to confirm', "error"); return; }
    try {
      const { error } = await supabase.rpc("platform_delete_league", { p_league_id: leagueId });
      if (error) throw error;
      if (showToast) showToast("League deleted");
      setDeleteConfirm(null); setDeleteTyped("");
      await loadData();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to delete", "error");
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (deleteUserConfirm !== userId) { setDeleteUserConfirm(userId); setDeleteUserTyped(""); return; }
    if (deleteUserTyped.trim().toUpperCase() !== "DELETE") { if (showToast) showToast('Type DELETE in capitals to confirm', "error"); return; }
    try {
      const { error } = await supabase.rpc("platform_delete_user", { p_user_id: userId });
      if (error) throw error;
      if (showToast) showToast("User deleted");
      setDeleteUserConfirm(null); setDeleteUserTyped("");
      await loadData();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to delete user", "error");
    }
  };

  const sQ = search.trim().toLowerCase();
  const fLeagues = leagues.filter(l =>
    l.name.toLowerCase().startsWith(sQ) ||
    (l.creator_email || "").toLowerCase().startsWith(sQ)
  );
  const fUsers = users.filter(u =>
    (u.email || "").toLowerCase().startsWith(sQ) ||
    (u.display_name || "").toLowerCase().startsWith(sQ)
  );

  return (
    <div className="pa-screen">
      <div className="back-btn-row">
        <button className="back-btn" onClick={onClose}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>

      <div className="ad-h">
        <div className="adey">Super Admin · Read+Delete</div>
        <div className="adh1">Platform Admin</div>
      </div>

      <div className="pa-body">
        {loading ? (
          <div className="pa-loading">Loading platform data…</div>
        ) : loadError ? (
          <div className="pa-error">
            <div>Failed to load platform data</div>
            <button className="pbtn" onClick={loadData}><Icon name="refresh" size={14} />Retry</button>
          </div>
        ) : (
          <>
            {stats && (
              <div className="pastats">
                {[
                  { l: "Total Users", v: stats.total_users ?? "—", s: stats.total_users != null ? "All time" : "—", c: "g", i: "user" },
                  { l: "Total Leagues", v: stats.total_leagues ?? "—", s: stats.total_leagues != null ? "All time" : "—", c: "o", i: "league" },
                  { l: "Total Matches", v: stats.total_matches ?? "—", s: stats.total_matches != null ? "All time" : "—", c: "gr", i: "racket" },
                ].map(s => (
                  <div key={s.l} className="pasc">
                    <div className="pasch">
                      <div className={`pascico ${s.c}`}><Icon name={s.i} size={14} color={s.c === "o" ? "var(--gold)" : s.c === "gr" ? "var(--muted)" : "var(--accent)"} /></div>
                      <div className="pascl">{s.l}</div>
                    </div>
                    <div className={`pascv ${s.c}`}>{s.v}</div>
                    <div className="pascsub">{s.s}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="pafilbar">
              {[
                { id: "leagues", l: "Leagues", n: leagues.length, i: "league" },
                { id: "users", l: "Users", n: users.length, i: "user" },
              ].map(f => (
                <button key={f.id} className={`pafil${filter === f.id ? " on" : ""}`} onClick={() => { setFilter(f.id); setSearch(""); }}>
                  <Icon name={f.i} size={13} color={filter === f.id ? "var(--accent)" : "var(--muted)"} />
                  {f.l} ({f.n})
                </button>
              ))}
            </div>

            <div className="pasrw">
              <div className="pasri"><Icon name="search" size={16} color="var(--muted)" /></div>
              <input className="pasr" placeholder={`Search ${filter}…`} value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="palist">
              {filter === "leagues" && fLeagues.length === 0 && <div className="pa-empty">No leagues found</div>}
              {filter === "leagues" && fLeagues.map(l => (
                <div key={l.id} className="paitem-wrap">
                  <div className="paitem">
                    <div className="paavi">{(l.name || "?")[0].toUpperCase()}</div>
                    <div className="paib">
                      <div className="pain">{l.name}</div>
                      <div className="paim">{l.member_count} players · {l.match_count} matches · {l.invite_code}</div>
                    </div>
                    <div className="paia">
                      {deleteConfirm !== l.id && renameId !== l.id && (
                        <>
                          <button className="aib" title="Rename league" onClick={() => { setRenameId(l.id); setRenameDraft(l.name); }}>
                            <Icon name="edit" size={13} />
                          </button>
                          <button className="aib da" title="Delete league" onClick={() => { setDeleteConfirm(l.id); setDeleteTyped(""); }}>
                            <Icon name="trash" size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {renameId === l.id && (
                    <div className="pa-confirm">
                      <input
                        className="pa-confirm-input"
                        value={renameDraft}
                        onChange={e => setRenameDraft(e.target.value)}
                        placeholder="New league name"
                        autoFocus
                        style={{borderColor:"var(--border)"}}
                      />
                      <button className="goldbtn" disabled={renaming || !renameDraft.trim()} onClick={() => handleRenameLeague(l.id)}>{renaming ? "…" : "Save"}</button>
                      <button className="gbtn ghost" onClick={() => { setRenameId(null); setRenameDraft(""); }}>Cancel</button>
                    </div>
                  )}
                  {deleteConfirm === l.id && (
                    <div className="pa-confirm danger">
                      <input
                        className="pa-confirm-input"
                        value={deleteTyped}
                        onChange={e => setDeleteTyped(e.target.value)}
                        placeholder='Type DELETE to confirm'
                      />
                      <button className="dbtn" onClick={() => handleDeleteLeague(l.id, l.name)}>Confirm</button>
                      <button className="gbtn ghost" onClick={() => { setDeleteConfirm(null); setDeleteTyped(""); }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}

              {filter === "users" && fUsers.length === 0 && <div className="pa-empty">No users found</div>}
              {filter === "users" && fUsers.map(u => (
                <div key={u.id} className="paitem-wrap">
                  <div className="paitem">
                    <div className="paavi">{(u.display_name || u.email || "?")[0].toUpperCase()}</div>
                    <div className="paib">
                      <div className="pain">{u.display_name || u.email?.split("@")[0]}</div>
                      <div className="paim">{u.email} · {u.league_count} league{u.league_count === 1 ? "" : "s"}</div>
                    </div>
                    <div className="paia">
                      {deleteUserConfirm !== u.id && (
                        <button className="aib da" title="Delete user" onClick={() => { setDeleteUserConfirm(u.id); setDeleteUserTyped(""); }}>
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  {deleteUserConfirm === u.id && (
                    <div className="pa-confirm danger">
                      <input
                        className="pa-confirm-input"
                        value={deleteUserTyped}
                        onChange={e => setDeleteUserTyped(e.target.value)}
                        placeholder='Type DELETE to confirm'
                      />
                      <button className="dbtn" onClick={() => handleDeleteUser(u.id, u.email)}>Confirm</button>
                      <button className="gbtn ghost" onClick={() => { setDeleteUserConfirm(null); setDeleteUserTyped(""); }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
