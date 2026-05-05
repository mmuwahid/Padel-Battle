import React, { useState, useMemo } from "react";
import { A, CD, CD2, BD, TX, MT, DG, GD, BL, PU } from '../theme';
import { formatTeam, win, formatDate, setTotals } from '../utils/helpers';
import { useLeague } from '../LeagueContext';
import { EditMatchModal } from './EditMatchModal';

export function AdminDashboard({ memberProfiles, setSidebarView }) {
  const {
    supabase, user, players, league, leagueId,
    showToast, loadLeagueData, getName,
    matches, pendingMatches, leagueMembers,
    isOwner,
  } = useLeague();

  // Player rename / remove state (existing)
  const [adminEditId, setAdminEditId] = useState(null);
  const [adminEditName, setAdminEditName] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [confirmRegenCode, setConfirmRegenCode] = useState(false);
  const [adminLoading, setAdminLoading] = useState(null);

  // FT-09: pending-match action state
  const [confirmReject, setConfirmReject] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);

  // FT-09: role-promotion state
  const [confirmRole, setConfirmRole] = useState(null); // { memberId, newRole }
  const [roleBusy, setRoleBusy] = useState(null);

  // user_id -> league_members.id (for role mutations on the right row)
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

  // ────────────────────────────────────────
  // Player actions (existing)
  // ────────────────────────────────────────
  const updatePlayerName = async (playerId, newName) => {
    setAdminLoading(playerId+"-rename");
    try {
      const {error:err} = await supabase.from("players").update({name: newName}).eq("id", playerId);
      if (err) throw err;
      await loadLeagueData();
    } catch (_err) {
      showToast("Failed to update player name","error");
    }
    setAdminLoading(null);
  };

  const deactivatePlayer = async (playerId) => {
    setAdminLoading(playerId+"-deactivate");
    try {
      const {error:err} = await supabase.from("players").delete().eq("id", playerId);
      if (err) throw err;
      showToast("Player removed from league");
      await loadLeagueData();
    } catch (_err) {
      showToast("Failed to remove player — they may have match history","error");
    }
    setAdminLoading(null);
  };

  // ────────────────────────────────────────
  // FT-09: Pending match actions
  // ────────────────────────────────────────
  const approveMatch = async (matchId) => {
    setActionBusy(matchId+"-approve");
    try {
      const { error } = await supabase.rpc("approve_match", { p_match_id: matchId });
      if (error) throw error;
      showToast("Match approved");
      await loadLeagueData();
    } catch (err) {
      console.error("approve_match failed", err);
      showToast(err.message || "Failed to approve", "error");
    }
    setActionBusy(null);
  };

  const rejectMatch = async (matchId) => {
    setActionBusy(matchId+"-reject");
    try {
      const { error } = await supabase.rpc("reject_match", { p_match_id: matchId });
      if (error) throw error;
      showToast("Match rejected");
      await loadLeagueData();
    } catch (err) {
      console.error("reject_match failed", err);
      showToast(err.message || "Failed to reject", "error");
    }
    setActionBusy(null);
    setConfirmReject(null);
  };

  // ────────────────────────────────────────
  // FT-09: Role promotion (owner-only)
  // ────────────────────────────────────────
  const setRole = async (memberId, newRole) => {
    setRoleBusy(memberId);
    try {
      const { error } = await supabase.rpc("set_member_role", {
        p_member_id: memberId,
        p_role: newRole,
      });
      if (error) throw error;
      showToast(newRole === "admin" ? "Promoted to admin" : "Demoted to member");
      await loadLeagueData();
    } catch (err) {
      console.error("set_member_role failed", err);
      showToast(err.message || "Failed to change role", "error");
    }
    setRoleBusy(null);
    setConfirmRole(null);
  };

  // ────────────────────────────────────────
  // CSV Export (existing)
  // ────────────────────────────────────────
  const exportMatchesCSV = () => {
    if (matches.length === 0) {
      showToast("No matches to export","error");
      return;
    }
    const csv = [
      ["Date", "Team A", "Team B", "Sets", "Winner", "Status"].join(","),
      ...matches.map(m => {
        const w = win(m.sets);
        const winnerTeam = w === "A" ? formatTeam(getName(m.team_a[0]),getName(m.team_a[1])) : formatTeam(getName(m.team_b[0]),getName(m.team_b[1]));
        return [
          new Date(m.date).toLocaleDateString(),
          formatTeam(getName(m.team_a[0]),getName(m.team_a[1])),
          formatTeam(getName(m.team_b[0]),getName(m.team_b[1])),
          m.sets.map(s => `${s[0]}-${s[1]}`).join(" "),
          winnerTeam,
          m.status || "approved",
        ].map(v => {let s=String(v).replace(/"/g,'""');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return `"${s}"`;}).join(",");
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

  const regenerateInviteCode = async () => {
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const {error:err} = await supabase.from("leagues").update({invite_code: newCode}).eq("id", leagueId);
      if (err) throw err;
      await loadLeagueData();
    } catch (_err) {
      showToast("Failed to regenerate invite code","error");
    }
  };

  // ────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────
  const PendingRow = ({ m }) => {
    const submitterName = m.logged_by ? getName(m.logged_by) : "Unknown";
    const w = win(m.sets || []);
    return (
      <div style={{ background: CD2, border: `1px solid ${BD}`, borderLeft: `3px solid ${GD}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: MT }}>Submitted by <strong style={{ color: TX, fontWeight: 600 }}>{submitterName}</strong></span>
          <span style={{ fontSize: 10, color: MT, fontFamily: "'JetBrains Mono',monospace" }}>{formatDate(m.date)}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <div style={{ textAlign: "center", color: BL, fontSize: 12, fontWeight: 600 }}>{formatTeam(getName(m.team_a?.[0]), getName(m.team_a?.[1]))}</div>
          <div style={{ fontSize: 10, color: MT, fontWeight: 700 }}>vs</div>
          <div style={{ textAlign: "center", color: GD, fontSize: 12, fontWeight: 600 }}>{formatTeam(getName(m.team_b?.[0]), getName(m.team_b?.[1]))}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, background: CD, borderRadius: 8, padding: 6, marginBottom: 10 }}>
          {(m.sets || []).map((s, i) => {
            const wn = (s[0] > s[1]) ? "A" : (s[1] > s[0] ? "B" : null);
            const col = wn === "A" ? BL : (wn === "B" ? GD : TX);
            return <span key={i} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: col, letterSpacing: 1 }}>{s[0]}–{s[1]}</span>;
          })}
        </div>
        {m.motm && <div style={{ textAlign: "center", fontSize: 10, color: MT, marginBottom: 8 }}>⭐ MOTM: <strong style={{ color: GD }}>{getName(m.motm)}</strong></div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {confirmReject === m.id ? (
            <>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: DG }}>Reject permanently?</span>
                <button onClick={() => rejectMatch(m.id)} disabled={actionBusy === m.id+"-reject"} style={{ background: DG, color: "#fff", border: 0, borderRadius: 6, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", opacity: actionBusy === m.id+"-reject" ? 0.5 : 1 }}>{actionBusy === m.id+"-reject" ? "..." : "Yes"}</button>
                <button onClick={() => setConfirmReject(null)} style={{ background: "none", border: `1px solid ${BD}`, color: MT, borderRadius: 6, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>No</button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => approveMatch(m.id)} disabled={actionBusy === m.id+"-approve"} style={{ background: A, color: "#000", border: 0, borderRadius: 8, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", height: 38, opacity: actionBusy === m.id+"-approve" ? 0.6 : 1 }}>{actionBusy === m.id+"-approve" ? "..." : "✓ Approve"}</button>
              <button onClick={() => setEditingMatch(m)} style={{ background: CD, color: TX, border: `1px solid ${BD}`, borderRadius: 8, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", height: 38 }}>✎ Edit</button>
              <button onClick={() => setConfirmReject(m.id)} style={{ background: CD, color: DG, border: `1px solid ${DG}40`, borderRadius: 8, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", height: 38 }}>✕ Reject</button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

      <h2 style={{fontSize:18,fontWeight:700,marginBottom:20,color:TX}}>Admin Dashboard</h2>

      {/* ────── FT-09: Match Approvals queue ────── */}
      <div style={{marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <h3 style={{fontSize:13,fontWeight:700,color:A,margin:0,display:"flex",alignItems:"center",gap:8}}>
            <span>⏳ Match Approvals</span>
            <span style={{ background: pendingMatches.length > 0 ? GD : CD2, color: pendingMatches.length > 0 ? "#000" : MT, fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 8, letterSpacing: 0.5 }}>{pendingMatches.length}</span>
          </h3>
        </div>
        {pendingMatches.length === 0 ? (
          <div style={{textAlign:"center",padding:"24px 12px",background:CD2,borderRadius:10,color:MT}}>
            <div style={{fontSize:24,marginBottom:6,opacity:0.4}}>✓</div>
            <div style={{fontSize:13,fontWeight:600,color:TX,marginBottom:2}}>All caught up</div>
            <div style={{fontSize:11,color:MT}}>No matches awaiting approval.</div>
          </div>
        ) : (
          pendingMatches.map(m => <PendingRow key={m.id} m={m} />)
        )}
      </div>

      {/* ────── Player Management (with FT-09 promote/demote) ────── */}
      <div style={{marginBottom:28}}>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12}}>Player Management</h3>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
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
              <div key={p.id} style={{padding:"12px",background:CD2,borderRadius:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:claimed?A:MT,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,fontWeight:600,color:TX}}>{p.nickname||p.name}</span>
                      {isLeagueOwner && <span style={{fontSize:9,fontWeight:800,letterSpacing:0.8,padding:"2px 6px",borderRadius:4,textTransform:"uppercase",background:`${GD}2e`,color:GD,border:`1px solid ${GD}59`}}>★ Owner</span>}
                      {!isLeagueOwner && playerIsAdmin && <span style={{fontSize:9,fontWeight:800,letterSpacing:0.8,padding:"2px 6px",borderRadius:4,textTransform:"uppercase",background:`${PU}2e`,color:PU,border:`1px solid ${PU}59`}}>⚡ Admin</span>}
                      {isMe && <span style={{fontSize:9,fontWeight:800,letterSpacing:0.8,padding:"2px 6px",borderRadius:4,textTransform:"uppercase",background:`${A}24`,color:A,border:`1px solid ${A}59`}}>You</span>}
                    </div>
                    <div style={{fontSize:10,color:claimed?MT:`${MT}80`}}>{claimed?(profile?.email||"Linked account"):"Not yet joined"}</div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  {/* Rename / Rename-edit */}
                  {adminEditId===p.id ? (
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <input value={adminEditName} onChange={e=>setAdminEditName(e.target.value)} style={{width:90,padding:"4px 6px",borderRadius:6,border:"1px solid "+A,background:CD2,color:TX,fontSize:11,fontFamily:"'Outfit',sans-serif"}} autoFocus onKeyDown={e=>{if(e.key==="Enter"&&adminEditName.trim()){updatePlayerName(p.id,adminEditName.trim());setAdminEditId(null);}if(e.key==="Escape")setAdminEditId(null);}}/>
                      <button onClick={()=>{if(adminEditName.trim()){updatePlayerName(p.id,adminEditName.trim());}setAdminEditId(null);}} disabled={adminLoading===p.id+"-rename"} style={{padding:"4px 8px",background:A,border:"none",borderRadius:6,color:"#000",fontSize:10,fontWeight:700,cursor:"pointer",opacity:adminLoading===p.id+"-rename"?0.5:1}}>{adminLoading===p.id+"-rename"?"..":"OK"}</button>
                      <button onClick={()=>setAdminEditId(null)} style={{padding:"4px 6px",background:"none",border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:10,cursor:"pointer"}}>X</button>
                    </div>
                  ) : (
                    <button onClick={()=>{setAdminEditId(p.id);setAdminEditName(p.name);}} style={{padding:"6px 10px",background:A,border:"none",borderRadius:6,color:"#000",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Rename</button>
                  )}

                  {/* Promote / Demote — owner only, claimed players only, not the league owner themselves */}
                  {showRoleControls && (
                    role === "admin" ? (
                      <button onClick={() => setConfirmRole({ memberId, newRole: "member", name: p.nickname || p.name })} disabled={roleBusy === memberId} style={{ padding: "6px 10px", background: "transparent", color: MT, border: `1px solid ${BD}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif", opacity: roleBusy === memberId ? 0.5 : 1 }}>Demote</button>
                    ) : (
                      <button onClick={() => setConfirmRole({ memberId, newRole: "admin", name: p.nickname || p.name })} disabled={roleBusy === memberId} style={{ padding: "6px 10px", background: "transparent", color: PU, border: `1px solid ${PU}80`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif", opacity: roleBusy === memberId ? 0.5 : 1 }}>Promote</button>
                    )
                  )}

                  {/* Remove */}
                  {confirmDeactivate===p.id ? (
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <span style={{fontSize:10,color:DG}}>Remove?</span>
                      <button onClick={()=>{deactivatePlayer(p.id);setConfirmDeactivate(null);}} disabled={adminLoading===p.id+"-deactivate"} style={{padding:"4px 8px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",opacity:adminLoading===p.id+"-deactivate"?0.5:1}}>{adminLoading===p.id+"-deactivate"?"..":"Yes"}</button>
                      <button onClick={()=>setConfirmDeactivate(null)} style={{padding:"4px 6px",background:"none",border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:10,cursor:"pointer"}}>No</button>
                    </div>
                  ) : (
                    <button onClick={()=>setConfirmDeactivate(p.id)} style={{padding:"6px 10px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Remove</button>
                  )}
                </div>

                {/* Role change confirm strip */}
                {confirmRole && confirmRole.memberId === memberId && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: CD, border: `1px solid ${PU}50`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 11, color: TX, lineHeight: 1.4 }}>
                      {confirmRole.newRole === "admin" ? <>Promote <strong style={{ color: PU, fontWeight: 700 }}>{confirmRole.name}</strong> to admin? They'll be able to approve, edit, and reject matches.</> : <>Demote <strong style={{ color: PU, fontWeight: 700 }}>{confirmRole.name}</strong> to member? They'll lose admin powers.</>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setRole(confirmRole.memberId, confirmRole.newRole)} disabled={roleBusy === confirmRole.memberId} style={{ background: PU, color: "#fff", border: 0, borderRadius: 6, padding: "0 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", height: 28, opacity: roleBusy === confirmRole.memberId ? 0.6 : 1 }}>{roleBusy === confirmRole.memberId ? "..." : "Confirm"}</button>
                      <button onClick={() => setConfirmRole(null)} style={{ background: "transparent", border: `1px solid ${BD}`, color: MT, borderRadius: 6, padding: "0 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif", height: 28 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!isOwner && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: CD, border: `1px dashed ${BD}`, borderRadius: 8, fontSize: 10, color: MT, lineHeight: 1.4 }}>
            Only the league owner can promote or demote admins.
          </div>
        )}
      </div>

      {/* ────── League Settings (regenerate code = owner-only) ────── */}
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
        {isOwner && (
          confirmRegenCode ? (
            <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",width:"100%"}}>
              <span style={{fontSize:11,color:TX}}>Old links stop working. Sure?</span>
              <button onClick={()=>{regenerateInviteCode();setConfirmRegenCode(false);}} style={{padding:"6px 10px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>Yes</button>
              <button onClick={()=>setConfirmRegenCode(false)} style={{padding:"6px 10px",background:CD2,border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:11,cursor:"pointer"}}>No</button>
            </div>
          ) : (
            <button onClick={()=>setConfirmRegenCode(true)} style={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
              Regenerate Code
            </button>
          )
        )}
      </div>

      {/* ────── Data Export ────── */}
      <div>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12}}>Data Export</h3>
        <button onClick={exportMatchesCSV} style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
          Export Match History (CSV)
        </button>
      </div>

      {/* ────── FT-09 Edit Match Modal ────── */}
      {editingMatch && (
        <EditMatchModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={loadLeagueData}
        />
      )}
    </div>
  );
}
