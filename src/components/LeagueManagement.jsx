import React, { useState } from "react";
import { A, CD, CD2, BD, TX, MT, DG } from '../theme';
import { useLeague } from '../LeagueContext';

export function LeagueManagement({ setSidebarView }) {
  const {
    supabase, league, leagueId,
    showToast, loadLeagueData,
    isOwner,
  } = useLeague();

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(league?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [confirmRegenCode, setConfirmRegenCode] = useState(false);

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

  const regenerateInviteCode = async () => {
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const {error:err} = await supabase.from("leagues").update({invite_code: newCode}).eq("id", leagueId);
      if (err) throw err;
      await loadLeagueData();
      setConfirmRegenCode(false);
    } catch (_err) {
      showToast("Failed to regenerate invite code","error");
    }
  };

  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(96px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView("admin")} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

      <h2 style={{fontSize:20,fontWeight:900,textTransform:"uppercase",letterSpacing:1,marginBottom:20,color:TX}}>League Management</h2>

      {/* League Name */}
      <div style={{marginBottom:16}}>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>League Name</h3>
        <div style={{padding:"14px",background:CD2,borderRadius:12,border:`1px solid ${BD}`}}>
          {editingName && isOwner ? (
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="text" value={draftName} onChange={(e)=>setDraftName(e.target.value)} placeholder="League name" style={{flex:1,padding:"8px 10px",background:CD,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
              <button onClick={saveLeagueName} disabled={savingName} style={{padding:"8px 12px",background:A,border:"none",borderRadius:8,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:savingName?0.6:1}}>{savingName?"...":"Save"}</button>
              <button onClick={()=>{setEditingName(false);setDraftName(league?.name||"");}} style={{padding:"8px 10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:MT,fontSize:12,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Cancel</button>
            </div>
          ) : (
            <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:14,color:TX,fontWeight:700,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis"}}>{league?.name}</div>
              {isOwner && (
                <button onClick={()=>{setDraftName(league?.name||"");setEditingName(true);}} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${BD}`,borderRadius:8,color:A,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Edit</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Code */}
      <div style={{marginBottom:16}}>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Invite Code</h3>
        <div style={{padding:"14px",background:CD2,borderRadius:12,border:`1px solid ${BD}`}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <code style={{flex:1,padding:"8px 10px",background:CD,borderRadius:8,color:A,fontSize:14,fontWeight:800,wordBreak:"break-all",letterSpacing:1}}>{league?.invite_code}</code>
            {isOwner && (
              confirmRegenCode ? (
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <span style={{fontSize:10,color:TX,whiteSpace:"nowrap"}}>Sure?</span>
                  <button onClick={regenerateInviteCode} style={{padding:"6px 10px",background:DG,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Yes</button>
                  <button onClick={()=>setConfirmRegenCode(false)} style={{padding:"6px 10px",background:CD2,border:"1px solid "+BD,borderRadius:8,color:MT,fontSize:12,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>No</button>
                </div>
              ) : (
                <button onClick={()=>setConfirmRegenCode(true)} title="Regenerate invite code" style={{width:36,height:36,flexShrink:0,background:"transparent",border:`1px solid ${BD}`,borderRadius:8,color:MT,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>{"↻"}</button>
              )
            )}
            <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}?invite=${league?.invite_code}`);showToast("Invite link copied!");}} style={{padding:"8px 12px",background:A,border:"none",borderRadius:8,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>
              Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* Season Management — owner only */}
      {isOwner && (
        <div>
          <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Seasons</h3>
          <button onClick={()=>setSidebarView("seasonManagement")} style={{width:"100%",padding:"16px 14px",background:CD,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <span style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>📅</span>
              <span style={{fontSize:14,fontWeight:900,textTransform:"uppercase",letterSpacing:0.5}}>Season Management</span>
            </span>
            <span style={{fontSize:18,color:MT}}>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
