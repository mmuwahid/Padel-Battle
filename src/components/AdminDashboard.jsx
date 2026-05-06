import React, { useState } from "react";
import { A, CD, CD2, BD, TX, MT, DG } from '../theme';
import { formatTeam, win } from '../utils/helpers';
import { useLeague } from '../LeagueContext';
import { PLATFORM_ADMIN_ID } from './PlatformAdmin';

export function AdminDashboard({ setSidebarView }) {
  const {
    supabase, user, league, leagueId,
    showToast, loadLeagueData, getName,
    matches,
    isOwner,
  } = useLeague();

  const [confirmRegenCode, setConfirmRegenCode] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(league?.name || "");
  const [savingName, setSavingName] = useState(false);

  // ────────────────────────────────────────
  // CSV Export
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

  const saveLeagueName = async () => {
    const trimmed = (draftName || "").trim();
    if (!trimmed || trimmed === league?.name) { setEditingName(false); return; }
    setSavingName(true);
    try {
      const { error: err } = await supabase.rpc("update_league_name", { p_league_id: leagueId, p_name: trimmed });
      if (err) throw err;
      await loadLeagueData();
      showToast("League renamed");
      setEditingName(false);
    } catch (err) {
      showToast(err.message || "Failed to rename","error");
    }
    setSavingName(false);
  };

  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(96px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

      <h2 style={{fontSize:20,fontWeight:900,textTransform:"uppercase",letterSpacing:1,marginBottom:8,color:TX}}>Admin Dashboard</h2>
      <div style={{fontSize:11,color:MT,marginBottom:20,lineHeight:1.5}}>Pending match approvals appear inline at the top of the <strong style={{color:TX}}>Matches</strong> tab.</div>

      {/* ────── Roster — Player Management button (Issue #17: subtitle removed) ────── */}
      <div style={{marginBottom:28}}>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Roster</h3>
        <button onClick={()=>setSidebarView("playerManagement")} style={{width:"100%",padding:"16px 14px",background:CD,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <span style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>👥</span>
            <span style={{fontSize:14,fontWeight:900,textTransform:"uppercase",letterSpacing:0.5}}>Player Management</span>
          </span>
          <span style={{fontSize:18,color:MT}}>→</span>
        </button>
      </div>

      {/* ────── League Management (Issue #16: name + invite + season management) ────── */}
      <div style={{marginBottom:28}}>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>League Management</h3>

        {/* League Name (owner can edit, others see it) */}
        <div style={{padding:"12px",background:CD2,borderRadius:8,marginBottom:8}}>
          <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:6}}>League Name</div>
          {editingName && isOwner ? (
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="text" value={draftName} onChange={(e)=>setDraftName(e.target.value)} placeholder="League name" style={{flex:1,padding:"8px 10px",background:CD,border:`1px solid ${BD}`,borderRadius:6,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
              <button onClick={saveLeagueName} disabled={savingName} style={{padding:"8px 12px",background:A,border:"none",borderRadius:6,color:"#000",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:savingName?0.6:1}}>{savingName?"...":"Save"}</button>
              <button onClick={()=>{setEditingName(false);setDraftName(league?.name||"");}} style={{padding:"8px 10px",background:CD2,border:`1px solid ${BD}`,borderRadius:6,color:MT,fontSize:11,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Cancel</button>
            </div>
          ) : (
            <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:13,color:TX,fontWeight:600,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis"}}>{league?.name}</div>
              {isOwner && (
                <button onClick={()=>{setDraftName(league?.name||"");setEditingName(true);}} style={{padding:"6px 10px",background:"transparent",border:`1px solid ${BD}`,borderRadius:6,color:A,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Edit</button>
              )}
            </div>
          )}
        </div>

        {/* Invite Code */}
        <div style={{padding:"12px",background:CD2,borderRadius:8,marginBottom:8}}>
          <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>Invite Code</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <code style={{flex:1,padding:"8px 10px",background:CD,borderRadius:6,color:A,fontSize:12,fontWeight:700,wordBreak:"break-all"}}>{league?.invite_code}</code>
            {isOwner && (
              confirmRegenCode ? (
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <span style={{fontSize:10,color:TX,whiteSpace:"nowrap"}}>Sure?</span>
                  <button onClick={()=>{regenerateInviteCode();setConfirmRegenCode(false);}} style={{padding:"4px 8px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>Yes</button>
                  <button onClick={()=>setConfirmRegenCode(false)} style={{padding:"4px 8px",background:CD2,border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:11,cursor:"pointer"}}>No</button>
                </div>
              ) : (
                <button onClick={()=>setConfirmRegenCode(true)} title="Regenerate invite code" style={{width:32,height:32,flexShrink:0,background:"transparent",border:`1px solid ${BD}`,borderRadius:6,color:MT,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>{"↻"}</button>
              )
            )}
            <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}?invite=${league?.invite_code}`);showToast("Invite link copied!");}} style={{padding:"6px 10px",background:A,border:"none",borderRadius:6,color:"#000",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>
              Copy Link
            </button>
          </div>
        </div>

        {/* Season Management button — owner-only entry to FT-14 screen */}
        {isOwner && (
          <button onClick={()=>setSidebarView("seasonManagement")} style={{width:"100%",padding:"16px 14px",background:CD,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <span style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>📅</span>
              <span style={{fontSize:14,fontWeight:900,textTransform:"uppercase",letterSpacing:0.5}}>Season Management</span>
            </span>
            <span style={{fontSize:18,color:MT}}>→</span>
          </button>
        )}
      </div>

      {/* ────── Data Export ────── */}
      <div style={{marginBottom:user?.id === PLATFORM_ADMIN_ID ? 28 : 0}}>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Data Export</h3>
        <button onClick={exportMatchesCSV} style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
          Export Match History (CSV)
        </button>
      </div>

      {/* ────── Platform Admin — super-admin only ────── */}
      {user?.id === PLATFORM_ADMIN_ID && (
        <div>
          <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Platform</h3>
          <button onClick={()=>setSidebarView("platform")} style={{width:"100%",padding:"12px",background:`${A}10`,border:`1px solid ${A}30`,borderRadius:8,color:A,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16}}>🛡️</span>
            <span>Platform Admin</span>
          </button>
        </div>
      )}

    </div>
  );
}
