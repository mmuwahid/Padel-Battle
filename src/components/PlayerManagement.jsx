import React, { useState, useMemo } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD } from "../theme";
import { flagEmoji } from "../utils/helpers";
import { useLeague } from "../LeagueContext";
import { EditPlayerModal } from "./EditPlayerModal";

// FT-12 v2: dedicated Player Management screen.
// Extracted from AdminDashboard so admins can edit name/nickname/photo/country/position
// in a focused modal rather than inline.
export function PlayerManagement({ memberProfiles, setSidebarView }) {
  const {
    supabase, user, league, leagueId, players,
    showToast, loadLeagueData, sendPushNotification,
    leagueMembers, isOwner,
  } = useLeague();

  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNick, setNewNick] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirmRole, setConfirmRole] = useState(null);
  const [roleBusy, setRoleBusy] = useState(null);

  const memberIdByUserId = useMemo(() => {
    const m = {};
    (leagueMembers || []).forEach(lm => { m[lm.user_id] = lm.id; });
    return m;
  }, [leagueMembers]);
  const roleByUserId = useMemo(() => {
    const m = {};
    (leagueMembers || []).forEach(lm => { m[lm.user_id] = lm.role || "member"; });
    return m;
  }, [leagueMembers]);

  const inp = { background: CD2, color: TX, border: `1px solid ${BD}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, width: "100%", outline: "none", fontWeight: 400, fontFamily: "'Outfit',sans-serif" };

  const addPlayer = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase.from("players").insert({ league_id: leagueId, name: newName.trim(), nickname: newNick.trim() || null });
      if (error) throw error;
      setNewName(""); setNewNick(""); setShowAdd(false);
      showToast("Player added");
      await loadLeagueData();
    } catch (err) {
      showToast(err.message || "Failed to add player", "error");
    }
    setAdding(false);
  };

  const deletePlayer = async (playerId) => {
    setBusyId(playerId + "-del");
    try {
      const { error } = await supabase.from("players").delete().eq("id", playerId).eq("league_id", leagueId);
      if (error) throw error;
      showToast("Player deleted");
      await loadLeagueData();
    } catch (_err) {
      showToast("Failed to delete — they may have match history", "error");
    }
    setBusyId(null);
  };

  const setRole = async (memberId, newRole, targetUserId, targetName) => {
    setRoleBusy(memberId);
    try {
      const { error } = await supabase.rpc("set_member_role", { p_member_id: memberId, p_role: newRole });
      if (error) throw error;
      showToast(newRole === "admin" ? "Promoted to admin" : "Demoted to member");
      if (sendPushNotification && targetUserId && targetUserId !== user?.id) {
        const isPromote = newRole === "admin";
        const title = isPromote ? "You're now an admin" : "Admin access removed";
        const body = isPromote
          ? `You were made an admin of ${league?.name || "the league"}. You can now approve, edit, and reject match submissions.`
          : `Your admin role in ${league?.name || "the league"} was removed.`;
        sendPushNotification("members", title, body, [targetUserId]);
      }
      await loadLeagueData();
    } catch (err) {
      showToast(err.message || "Failed to change role", "error");
    }
    setRoleBusy(null);
    setConfirmRole(null);
  };

  return (
    <div style={{ padding: "20px 16px", paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}>
      <button onClick={() => setSidebarView("admin")} style={{ marginBottom: 16, background: "none", border: "none", color: A, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>← Admin Dashboard</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase", letterSpacing: 1, margin: 0, color: TX }}>Player Management</h2>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: "8px 14px", background: showAdd ? "transparent" : A, color: showAdd ? MT : "#000", border: showAdd ? `1px solid ${BD}` : "none", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontStyle: "italic", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: CD, borderRadius: 12, border: `1px solid ${BD}`, padding: 14, marginBottom: 14 }}>
          <input placeholder="Name *" value={newName} onChange={e => setNewName(e.target.value)} style={{ ...inp, marginBottom: 8 }} />
          <input placeholder="Nickname (optional)" value={newNick} onChange={e => setNewNick(e.target.value)} style={{ ...inp, marginBottom: 10 }} />
          <button onClick={addPlayer} disabled={adding || !newName.trim()} style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: A, color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontStyle: "italic", textTransform: "uppercase", letterSpacing: 0.5, opacity: adding || !newName.trim() ? 0.5 : 1 }}>{adding ? "Adding..." : "Add Player"}</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {players.map(p => {
          const profile = p.user_id ? memberProfiles[p.user_id] : null;
          const claimed = !!p.user_id;
          const isLeagueOwner = claimed && league?.created_by === p.user_id;
          const isMe = claimed && p.user_id === user?.id;
          const role = claimed ? (roleByUserId[p.user_id] || "member") : null;
          const playerIsAdmin = isLeagueOwner || role === "admin";
          const memberId = claimed ? memberIdByUserId[p.user_id] : null;
          const showRoleControls = isOwner && claimed && !isLeagueOwner && memberId;

          return (
            <div key={p.id} style={{ background: CD, border: `1px solid ${BD}`, borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: `linear-gradient(135deg, ${A}25, ${A}08)`, border: `2px solid ${A}30`, display: "flex", alignItems: "center", justifyContent: "center", color: A, fontSize: 16, fontWeight: 800 }}>
                    {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (p.nickname || p.name || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: claimed ? A : MT, boxShadow: `0 0 0 2px ${CD}` }} title={claimed ? "Linked" : "Unclaimed"} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase", letterSpacing: 0.5, color: TX }}>{p.nickname || p.name}</span>
                    {isLeagueOwner && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.8, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", background: `${GD}2e`, color: GD, border: `1px solid ${GD}59` }}>★ Owner</span>}
                    {!isLeagueOwner && playerIsAdmin && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.8, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", background: `${GD}2e`, color: GD, border: `1px solid ${GD}59` }}>⚡ Admin</span>}
                    {isMe && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.8, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", background: `${A}24`, color: A, border: `1px solid ${A}59` }}>You</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 10, color: MT }}>
                    {p.country && flagEmoji(p.country) && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 12, lineHeight: 1 }}>{flagEmoji(p.country)}</span>
                        <span style={{ fontWeight: 600, letterSpacing: 0.5 }}>{p.country}</span>
                      </span>
                    )}
                    {p.playing_position && (
                      <>
                        {p.country && <span style={{ opacity: 0.5 }}>·</span>}
                        <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{p.playing_position} hand</span>
                      </>
                    )}
                    {!p.country && !p.playing_position && (
                      <span style={{ fontStyle: "italic", opacity: 0.7 }}>{claimed ? (profile?.email || "Linked") : "Not yet joined"}</span>
                    )}
                  </div>
                </div>

                <button onClick={() => setEditingPlayer(p)} style={{ flexShrink: 0, padding: "8px 10px", background: "transparent", border: `1px solid ${A}`, borderRadius: 8, color: A, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>✎ Edit</button>
              </div>

              {/* Role + Delete row */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                {showRoleControls && (
                  role === "admin" ? (
                    <button onClick={() => setConfirmRole({ memberId, newRole: "member", name: p.nickname || p.name, userId: p.user_id })} disabled={roleBusy === memberId} style={{ padding: "6px 10px", background: "transparent", color: MT, border: `1px solid ${BD}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif", opacity: roleBusy === memberId ? 0.5 : 1 }}>Demote</button>
                  ) : (
                    <button onClick={() => setConfirmRole({ memberId, newRole: "admin", name: p.nickname || p.name, userId: p.user_id })} disabled={roleBusy === memberId} style={{ padding: "6px 10px", background: "transparent", color: GD, border: `1px solid ${GD}80`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif", opacity: roleBusy === memberId ? 0.5 : 1 }}>Promote</button>
                  )
                )}

                {confirmDel === p.id ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: DG }}>Delete?</span>
                    <button onClick={() => { deletePlayer(p.id); setConfirmDel(null); }} disabled={busyId === p.id + "-del"} style={{ padding: "4px 8px", background: DG, border: "none", borderRadius: 6, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", opacity: busyId === p.id + "-del" ? 0.5 : 1 }}>{busyId === p.id + "-del" ? ".." : "Yes"}</button>
                    <button onClick={() => setConfirmDel(null)} style={{ padding: "4px 6px", background: "none", border: `1px solid ${BD}`, borderRadius: 6, color: MT, fontSize: 10, cursor: "pointer" }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDel(p.id)} style={{ padding: "6px 10px", background: "transparent", color: DG, border: `1px solid ${DG}50`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Delete</button>
                )}
              </div>

              {confirmRole && confirmRole.memberId === memberId && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: BG, border: `1px solid ${GD}50`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 11, color: TX, lineHeight: 1.4 }}>
                    {confirmRole.newRole === "admin" ? <>Promote <strong style={{ color: GD, fontWeight: 700 }}>{confirmRole.name}</strong> to admin?</> : <>Demote <strong style={{ color: GD, fontWeight: 700 }}>{confirmRole.name}</strong> to member?</>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setRole(confirmRole.memberId, confirmRole.newRole, confirmRole.userId, confirmRole.name)} disabled={roleBusy === confirmRole.memberId} style={{ background: GD, color: "#000", border: 0, borderRadius: 6, padding: "0 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", height: 28, opacity: roleBusy === confirmRole.memberId ? 0.6 : 1 }}>{roleBusy === confirmRole.memberId ? "..." : "Confirm"}</button>
                    <button onClick={() => setConfirmRole(null)} style={{ background: "transparent", border: `1px solid ${BD}`, color: MT, borderRadius: 6, padding: "0 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif", height: 28 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isOwner && (
        <div style={{ marginTop: 12, padding: "8px 12px", background: CD, border: `1px dashed ${BD}`, borderRadius: 8, fontSize: 10, color: MT, lineHeight: 1.4 }}>
          Only the league owner can promote or demote admins.
        </div>
      )}

      {editingPlayer && (
        <EditPlayerModal player={editingPlayer} onClose={() => setEditingPlayer(null)} />
      )}
    </div>
  );
}
