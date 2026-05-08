import React, { useState, useMemo } from "react";
import Icon from "./Icon";
import { flagEmoji } from "../utils/helpers";
import { useLeague } from "../LeagueContext";
import { EditPlayerModal } from "./EditPlayerModal";

// S067 Phase 12 PR 3: spec-faithful Player Management.
// Class names match docs/PadelHub_Complete_v2.jsx lines 2137-2169 verbatim:
//   .plmhr / .plmtit / .plmct / .pbtn       — header (title + count + Add Player)
//   .plmsrw / .plmsri / .plmsr             — search bar
//   .plmlist / .plmrow / .plmavi / .plminf  — list rows
//   .plmn / .plmm / .plmfl / .plmct2 / .plmrole — name + meta + flag + role badge
//   .plmac / .aib (.go .da .gd)             — action buttons (promote/edit/delete)
// User decisions S067:
//   Q5=A preserve all current UX (claim dot, Owner/Admin/You badges, confirm
//        strips, country+position pills, '+ Add' inline form). Restyle only.
//   Q8=A icon-button promote/demote, opens existing confirm strip.
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
  const [search, setSearch] = useState("");

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

  const sQ = search.trim().toLowerCase();
  const filtered = (players || []).filter(p => {
    if (!sQ) return true;
    const n = (p.nickname || p.name || "").toLowerCase();
    return n.startsWith(sQ);
  });

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
      // S068 fix: if the player was claimed (has user_id), also remove the user
      // from league_members. Otherwise they stay as a member with no claimed
      // player → on next login the OLD inline claim-player flow short-circuits
      // around the new approval-gated workflow. Capture user_id BEFORE delete.
      const target = (players || []).find(p => p.id === playerId);
      const claimedUserId = target?.user_id || null;

      const { error } = await supabase.from("players").delete().eq("id", playerId).eq("league_id", leagueId);
      if (error) throw error;

      if (claimedUserId) {
        // Best-effort — if the league_members row is missing or RLS blocks,
        // we still proceed since the player record is gone.
        const { error: lmErr } = await supabase
          .from("league_members")
          .delete()
          .eq("league_id", leagueId)
          .eq("user_id", claimedUserId);
        if (lmErr) console.warn("[PlayerManagement] league_members cleanup failed:", lmErr.message);
      }

      showToast(claimedUserId ? "Player deleted + user removed from league" : "Player deleted");
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
    <div className="plm-screen">
      <div className="back-btn-row">
        <button className="back-btn" onClick={() => setSidebarView("admin")}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>

      <div className="ad-h">
        <div className="adey">League</div>
        <div className="adh1">Player Management</div>
      </div>

      <div className="plmhr">
        <div>
          <div className="plmtit">Players</div>
          <div className="plmct">{filtered.length} player{filtered.length === 1 ? "" : "s"}</div>
        </div>
        <button className="pbtn" onClick={() => setShowAdd(s => !s)}>
          {showAdd ? <><Icon name="close" size={14} />Cancel</> : <><Icon name="user-plus" size={14} />Add Player</>}
        </button>
      </div>

      {showAdd && (
        <div className="plm-addform">
          <input className="shi" placeholder="Name *" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className="shi" placeholder="Nickname (optional)" value={newNick} onChange={e => setNewNick(e.target.value)} />
          <button className="shsubmit" onClick={addPlayer} disabled={adding || !newName.trim()}>
            {adding ? "Adding…" : "Add Player"}
          </button>
        </div>
      )}

      <div className="plmsrw">
        <div className="plmsri"><Icon name="search" size={15} color="var(--muted)" /></div>
        <input className="plmsr" placeholder="Search players…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="plmlist">
        {filtered.length === 0 && (
          <div className="plm-empty">{sQ ? `No players match "${search}"` : "No players yet."}</div>
        )}
        {filtered.map(p => {
          const profile = p.user_id ? memberProfiles?.[p.user_id] : null;
          const claimed = !!p.user_id;
          const isLeagueOwner = claimed && league?.created_by === p.user_id;
          const isMe = claimed && p.user_id === user?.id;
          const role = claimed ? (roleByUserId[p.user_id] || "member") : null;
          const playerIsAdmin = isLeagueOwner || role === "admin";
          const memberId = claimed ? memberIdByUserId[p.user_id] : null;
          const showRoleControls = isOwner && claimed && !isLeagueOwner && memberId;
          const initial = (p.nickname || p.name || "?")[0].toUpperCase();

          return (
            <div key={p.id} className="plmrow">
              <div className="plmrow-main">
                <div className="plmavi">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" /> : <span>{initial}</span>}
                  <div className={`plmavi-dot${claimed ? " claimed" : ""}`} title={claimed ? "Linked" : "Unclaimed"} />
                </div>

                <div className="plminf">
                  <div className="plmn-row">
                    <span className="plmn">{p.nickname || p.name}</span>
                    {isLeagueOwner && <span className="plmrole gold">★ Owner</span>}
                    {!isLeagueOwner && playerIsAdmin && <span className="plmrole gold">⚡ Admin</span>}
                    {isMe && <span className="plmrole accent">You</span>}
                  </div>
                  <div className="plmm">
                    {p.country && flagEmoji(p.country) && (
                      <>
                        <span className="plmfl flag">{flagEmoji(p.country)}</span>
                        <span className="plmct2">{p.country}</span>
                      </>
                    )}
                    {p.playing_position && (
                      <>
                        {p.country && <span className="plm-sep">·</span>}
                        <span className="plm-side">{p.playing_position} side</span>
                      </>
                    )}
                    {!p.country && !p.playing_position && (
                      <span className="plm-faint">{claimed ? (profile?.email || "Linked") : "Not yet joined"}</span>
                    )}
                  </div>
                </div>

                <div className="plmac">
                  {showRoleControls && (
                    role === "admin" ? (
                      <button className="aib gd" title="Demote to member" disabled={roleBusy === memberId} onClick={() => setConfirmRole({ memberId, newRole: "member", name: p.nickname || p.name, userId: p.user_id })}>
                        <Icon name="arrow-down" size={13} />
                      </button>
                    ) : (
                      <button className="aib gd" title="Promote to admin" disabled={roleBusy === memberId} onClick={() => setConfirmRole({ memberId, newRole: "admin", name: p.nickname || p.name, userId: p.user_id })}>
                        <Icon name="arrow-up" size={13} />
                      </button>
                    )
                  )}
                  <button className="aib" title="Edit" onClick={() => setEditingPlayer(p)}>
                    <Icon name="edit" size={13} />
                  </button>
                  <button className="aib da" title="Delete" onClick={() => setConfirmDel(p.id)}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>

              {confirmRole && confirmRole.memberId === memberId && (
                <div className="plm-confirm gold">
                  <div className="plm-confirm-q">
                    {confirmRole.newRole === "admin"
                      ? <>Promote <strong>{confirmRole.name}</strong> to admin?</>
                      : <>Demote <strong>{confirmRole.name}</strong> to member?</>}
                  </div>
                  <div className="plm-confirm-acts">
                    <button className="goldbtn" disabled={roleBusy === confirmRole.memberId} onClick={() => setRole(confirmRole.memberId, confirmRole.newRole, confirmRole.userId, confirmRole.name)}>
                      {roleBusy === confirmRole.memberId ? "…" : "Confirm"}
                    </button>
                    <button className="gbtn ghost" onClick={() => setConfirmRole(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {confirmDel === p.id && (
                <div className="plm-confirm danger">
                  <div className="plm-confirm-q">Delete <strong>{p.nickname || p.name}</strong>?</div>
                  <div className="plm-confirm-acts">
                    <button className="dbtn" disabled={busyId === p.id + "-del"} onClick={() => { deletePlayer(p.id); setConfirmDel(null); }}>
                      {busyId === p.id + "-del" ? "…" : "Yes"}
                    </button>
                    <button className="gbtn ghost" onClick={() => setConfirmDel(null)}>No</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isOwner && (
        <div className="plm-note">Only the league owner can promote or demote admins.</div>
      )}

      {editingPlayer && (
        <EditPlayerModal player={editingPlayer} onClose={() => setEditingPlayer(null)} />
      )}
    </div>
  );
}
