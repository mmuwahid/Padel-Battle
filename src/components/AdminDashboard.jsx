import React, { useState, useMemo } from "react";
import { A, CD, CD2, BD, TX, MT, DG, GD } from '../theme';
import { formatTeam, win } from '../utils/helpers';
import { useLeague } from '../LeagueContext';

export function AdminDashboard({ memberProfiles, setSidebarView }) {
  const {
    supabase, user, league, leagueId, players,
    showToast, loadLeagueData, getName, sendPushNotification,
    matches, leagueMembers,
    isOwner,
  } = useLeague();

  // Player rename / remove state (existing)
  const [adminEditId, setAdminEditId] = useState(null);
  const [adminEditName, setAdminEditName] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [confirmRegenCode, setConfirmRegenCode] = useState(false);
  const [adminLoading, setAdminLoading] = useState(null);

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
      showToast("Player deleted");
      await loadLeagueData();
    } catch (_err) {
      showToast("Failed to remove player — they may have match history","error");
    }
    setAdminLoading(null);
  };

  // ────────────────────────────────────────
  // FT-09: Role promotion (owner-only)
  // ────────────────────────────────────────
  const setRole = async (memberId, newRole, targetUserId, targetName) => {
    setRoleBusy(memberId);
    try {
      const { error } = await supabase.rpc("set_member_role", {
        p_member_id: memberId,
        p_role: newRole,
      });
      if (error) throw error;
      showToast(newRole === "admin" ? "Promoted to admin" : "Demoted to member");
      // S044: in-app notification is inserted by the RPC; fire push so the target sees it on their device too.
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

  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

      <h2 style={{fontSize:18,fontWeight:700,marginBottom:8,color:TX}}>Admin Dashboard</h2>
      <div style={{fontSize:11,color:MT,marginBottom:20,lineHeight:1.5}}>Pending match approvals appear inline at the top of the <strong style={{color:TX}}>Matches</strong> tab.</div>

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
                      {!isLeagueOwner && playerIsAdmin && <span style={{fontSize:9,fontWeight:800,letterSpacing:0.8,padding:"2px 6px",borderRadius:4,textTransform:"uppercase",background:`${GD}2e`,color:GD,border:`1px solid ${GD}59`}}>⚡ Admin</span>}
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
                      <button onClick={() => setConfirmRole({ memberId, newRole: "member", name: p.nickname || p.name, userId: p.user_id })} disabled={roleBusy === memberId} style={{ padding: "6px 10px", background: "transparent", color: MT, border: `1px solid ${BD}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif", opacity: roleBusy === memberId ? 0.5 : 1 }}>Demote</button>
                    ) : (
                      <button onClick={() => setConfirmRole({ memberId, newRole: "admin", name: p.nickname || p.name, userId: p.user_id })} disabled={roleBusy === memberId} style={{ padding: "6px 10px", background: "transparent", color: GD, border: `1px solid ${GD}80`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif", opacity: roleBusy === memberId ? 0.5 : 1 }}>Promote</button>
                    )
                  )}

                  {/* Remove */}
                  {confirmDeactivate===p.id ? (
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <span style={{fontSize:10,color:DG}}>Delete?</span>
                      <button onClick={()=>{deactivatePlayer(p.id);setConfirmDeactivate(null);}} disabled={adminLoading===p.id+"-deactivate"} style={{padding:"4px 8px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",opacity:adminLoading===p.id+"-deactivate"?0.5:1}}>{adminLoading===p.id+"-deactivate"?"..":"Yes"}</button>
                      <button onClick={()=>setConfirmDeactivate(null)} style={{padding:"4px 6px",background:"none",border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:10,cursor:"pointer"}}>No</button>
                    </div>
                  ) : (
                    <button onClick={()=>setConfirmDeactivate(p.id)} style={{padding:"6px 10px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Delete</button>
                  )}
                </div>

                {/* Role change confirm strip */}
                {confirmRole && confirmRole.memberId === memberId && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: CD, border: `1px solid ${GD}50`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 11, color: TX, lineHeight: 1.4 }}>
                      {confirmRole.newRole === "admin" ? <>Promote <strong style={{ color: GD, fontWeight: 700 }}>{confirmRole.name}</strong> to admin? They'll be able to approve, edit, and reject matches.</> : <>Demote <strong style={{ color: GD, fontWeight: 700 }}>{confirmRole.name}</strong> to member? They'll lose admin powers.</>}
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

    </div>
  );
}
