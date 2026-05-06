import React, { useState, useEffect } from "react";
import { supabase } from '../supabase';
import { A, BG, CD, CD2, BD, TX, MT, DG } from '../theme';

export const PLATFORM_ADMIN_ID = "8362be01-8e73-49c1-90c8-065fc6a09159";

export function PlatformAdmin({ onClose, showToast }) {
  const [stats, setStats] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteTyped, setDeleteTyped] = useState("");
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null);
  const [deleteUserTyped, setDeleteUserTyped] = useState("");

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

  const handleDeleteUser = async (userId, userEmail) => {
    if (deleteUserConfirm !== userId) { setDeleteUserConfirm(userId); setDeleteUserTyped(""); return; }
    if (deleteUserTyped.trim() !== userEmail.trim()) { if (showToast) showToast("Email didn't match", "error"); return; }
    try {
      const { error } = await supabase.rpc("platform_delete_user", { p_user_id: userId });
      if (error) throw error;
      if (showToast) showToast("User deleted");
      setDeleteUserConfirm(null);
      setDeleteUserTyped("");
      await loadData();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to delete user", "error");
    }
  };

  const handleDeleteLeague = async (leagueId, leagueName) => {
    if (deleteConfirm !== leagueId) { setDeleteConfirm(leagueId); setDeleteTyped(""); return; }
    if (deleteTyped.trim() !== leagueName.trim()) { if (showToast) showToast("Name didn't match", "error"); return; }
    try {
      const { error } = await supabase.rpc("platform_delete_league", { p_league_id: leagueId });
      if (error) throw error;
      if (showToast) showToast("League deleted");
      setDeleteConfirm(null);
      setDeleteTyped("");
      await loadData();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to delete", "error");
    }
  };

  const fmtDate = (d) => {
    if (!d) return "\u2014";
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, "0");
    const mmm = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getMonth()];
    return dd + "/" + mmm + "/" + dt.getFullYear();
  };

  const tabStyle = (t) => ({
    padding: "8px 16px", background: activeTab === t ? A + "20" : "transparent",
    border: activeTab === t ? "1px solid " + A + "40" : "1px solid " + BD,
    borderRadius: 8, color: activeTab === t ? A : MT, fontSize: 12, fontWeight: 700,
    cursor: "pointer", fontFamily: "'Outfit',sans-serif",
  });

  const filteredLeagues = leagues.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.creator_email || "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "20px 16px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", minHeight: "100vh", background: BG }}>
      {/* Issue #16: Back button matching SettingsView/AdminDashboard convention */}
      <button onClick={onClose} style={{ marginBottom: 20, background: "none", border: "none", color: A, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif", padding: 0 }}>← Back</button>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase", letterSpacing: 1, color: TX }}>Platform Admin</div>
        <div style={{ fontSize: 10, color: MT, fontWeight: 600, marginTop: 2 }}>Super Admin Dashboard</div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: MT, padding: 40, fontSize: 13 }}>Loading platform data...</div>
      ) : loadError ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ color: MT, fontSize: 13, marginBottom: 16 }}>Failed to load platform data</div>
          <button onClick={loadData} style={{ padding: "8px 20px", background: A + "20", border: "1px solid " + A + "40", borderRadius: 8, color: A, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>↺ Retry</button>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Total Users", value: stats.total_users, icon: "\uD83D\uDC65" },
                { label: "Total Leagues", value: stats.total_leagues, icon: "\uD83C\uDFDF\uFE0F" },
                { label: "Total Matches", value: stats.total_matches, icon: "\uD83C\uDFBE" },
                { label: "Active (7d)", value: stats.active_users_7d, icon: "\uD83D\uDCCA" },
              ].map((s, i) => (
                <div key={i} style={{ background: CD, border: "1px solid " + BD, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, color: MT, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{s.icon} {s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: A, fontFamily: "'JetBrains Mono',monospace" }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => { setActiveTab("leagues"); setSearch(""); }} style={tabStyle("leagues")}>Leagues ({leagues.length})</button>
            <button onClick={() => { setActiveTab("users"); setSearch(""); }} style={tabStyle("users")}>Users ({users.length})</button>
          </div>

          {/* Search */}
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === "leagues" ? "Search leagues or creator..." : "Search email or name..."}
            style={{ width: "100%", padding: "10px 14px", background: CD, border: "1px solid " + BD, borderRadius: 10, color: TX, fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
          />

          {/* Leagues Tab */}
          {activeTab === "leagues" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredLeagues.length === 0 && <div style={{ color: MT, fontSize: 12, textAlign: "center", padding: 20 }}>No leagues found</div>}
              {filteredLeagues.map(l => (
                <div key={l.id} style={{ background: CD, border: "1px solid " + BD, borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: TX }}>{l.name}</div>
                      <div style={{ fontSize: 10, color: MT, marginTop: 2 }}>by {l.creator_email || "\u2014"}</div>
                    </div>
                    <div style={{ fontSize: 9, color: MT, textAlign: "right" }}>{fmtDate(l.created_at)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: MT }}>
                      <span style={{ color: A, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{l.member_count}</span> members
                    </div>
                    <div style={{ fontSize: 11, color: MT }}>
                      <span style={{ color: A, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{l.match_count}</span> matches
                    </div>
                    <div style={{ fontSize: 10, color: MT, fontFamily: "'JetBrains Mono',monospace" }}>
                      Code: {l.invite_code}
                    </div>
                  </div>
                  {deleteConfirm === l.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input value={deleteTyped} onChange={e => setDeleteTyped(e.target.value)} placeholder={"Type \"" + l.name + "\" to delete"} style={{ flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 6, border: "1px solid " + DG, background: CD2, color: TX, fontSize: 11, fontFamily: "'Outfit',sans-serif", outline: "none" }} />
                      <button onClick={() => handleDeleteLeague(l.id, l.name)} style={{ padding: "6px 10px", background: DG, border: "none", borderRadius: 6, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Confirm</button>
                      <button onClick={() => { setDeleteConfirm(null); setDeleteTyped(""); }} style={{ padding: "6px 8px", background: "none", border: "1px solid " + BD, borderRadius: 6, color: MT, fontSize: 10, cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => handleDeleteLeague(l.id, l.name)} style={{ padding: "5px 10px", background: "none", border: "1px solid " + DG + "40", borderRadius: 6, color: DG, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Delete League</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredUsers.length === 0 && <div style={{ color: MT, fontSize: 12, textAlign: "center", padding: 20 }}>No users found</div>}
              {filteredUsers.map(u => (
                <div key={u.id} style={{ background: CD, border: "1px solid " + BD, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: deleteUserConfirm === u.id ? 8 : 0 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TX }}>{u.display_name || u.email?.split("@")[0]}</div>
                      <div style={{ fontSize: 10, color: MT, marginTop: 1 }}>{u.email}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: A, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{u.league_count} league{u.league_count !== 1 ? "s" : ""}</div>
                      <div style={{ fontSize: 9, color: MT, marginBottom: 4 }}>{fmtDate(u.created_at)}</div>
                      {deleteUserConfirm !== u.id && (
                        <button onClick={() => handleDeleteUser(u.id, u.email)} style={{ padding: "4px 8px", background: "none", border: "1px solid " + DG + "40", borderRadius: 6, color: DG, fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Delete</button>
                      )}
                    </div>
                  </div>
                  {deleteUserConfirm === u.id && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input value={deleteUserTyped} onChange={e => setDeleteUserTyped(e.target.value)} placeholder={"Type email to confirm"} style={{ flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 6, border: "1px solid " + DG, background: CD2, color: TX, fontSize: 11, fontFamily: "'Outfit',sans-serif", outline: "none" }} />
                      <button onClick={() => handleDeleteUser(u.id, u.email)} style={{ padding: "6px 10px", background: DG, border: "none", borderRadius: 6, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Confirm</button>
                      <button onClick={() => { setDeleteUserConfirm(null); setDeleteUserTyped(""); }} style={{ padding: "6px 8px", background: "none", border: "1px solid " + BD, borderRadius: 6, color: MT, fontSize: 10, cursor: "pointer" }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
