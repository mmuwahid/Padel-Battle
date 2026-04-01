import React, { useState } from "react";
import { supabase } from '../supabase';
import { A, CD, CD2, BD, TX, MT, DG } from '../theme';
import { formatTeam, win } from '../utils/helpers';

export function AdminDashboard({ players, memberProfiles, league, leagueId, showToast, loadLeagueData, setSidebarView, getName, matches }) {
  // State moved from AppContent — admin-only, never used elsewhere
  const [adminEditId, setAdminEditId] = useState(null);
  const [adminEditName, setAdminEditName] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [confirmRegenCode, setConfirmRegenCode] = useState(false);
  const [adminLoading, setAdminLoading] = useState(null);

  // Update player name
  const updatePlayerName = async (playerId, newName) => {
    setAdminLoading(playerId+"-rename");
    try {
      const {error:err} = await supabase.from("players").update({name: newName}).eq("id", playerId);
      if (err) throw err;
      await loadLeagueData();
    } catch (err) {
      showToast("Failed to update player name","error");
    }
    setAdminLoading(null);
  };

  // Deactivate player
  const deactivatePlayer = async (playerId) => {
    setAdminLoading(playerId+"-deactivate");
    try {
      const {error:err} = await supabase.from("players").update({active: false}).eq("id", playerId);
      if (err) throw err;
      await loadLeagueData();
    } catch (err) {
      showToast("Failed to deactivate player","error");
    }
    setAdminLoading(null);
  };

  // Export matches as CSV
  const exportMatchesCSV = () => {
    if (matches.length === 0) {
      showToast("No matches to export","error");
      return;
    }
    const csv = [
      ["Date", "Team A", "Team B", "Sets", "Winner"].join(","),
      ...matches.map(m => {
        const w = win(m.sets);
        const winnerTeam = w === "A" ? formatTeam(getName(m.team_a[0]),getName(m.team_a[1])) : formatTeam(getName(m.team_b[0]),getName(m.team_b[1]));
        return [
          new Date(m.date).toLocaleDateString(),
          formatTeam(getName(m.team_a[0]),getName(m.team_a[1])),
          formatTeam(getName(m.team_b[0]),getName(m.team_b[1])),
          m.sets.map(s => `${s[0]}-${s[1]}`).join(" "),
          winnerTeam
        ].map(v => `"${v}"`).join(",");
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

  // Regenerate invite code
  const regenerateInviteCode = async () => {
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const {error:err} = await supabase.from("leagues").update({invite_code: newCode}).eq("id", leagueId);
      if (err) throw err;
      await loadLeagueData();
    } catch (err) {
      showToast("Failed to regenerate invite code","error");
    }
  };

  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

      <h2 style={{fontSize:18,fontWeight:700,marginBottom:20,color:TX}}>Admin Dashboard</h2>

      {/* Player Management Section */}
      <div style={{marginBottom:28}}>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12}}>Player Management</h3>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {players.map(p => {const profile=p.user_id?memberProfiles[p.user_id]:null;const claimed=!!p.user_id;return(
            <div key={p.id} style={{padding:"12px",background:CD2,borderRadius:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:claimed?6:0}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:claimed?A:MT,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:TX}}>{p.nickname||p.name}</div>
                  <div style={{fontSize:10,color:claimed?MT:`${MT}80`}}>{claimed?(profile?.email||"Linked account"):"Not yet joined"}</div>
                </div>
                {adminEditId===p.id?<div style={{display:"flex",gap:4,alignItems:"center"}}><input value={adminEditName} onChange={e=>setAdminEditName(e.target.value)} style={{width:80,padding:"4px 6px",borderRadius:6,border:"1px solid "+A,background:CD2,color:TX,fontSize:11,fontFamily:"'Outfit',sans-serif"}} autoFocus onKeyDown={e=>{if(e.key==="Enter"&&adminEditName.trim()){updatePlayerName(p.id,adminEditName.trim());setAdminEditId(null);}if(e.key==="Escape")setAdminEditId(null);}}/><button onClick={()=>{if(adminEditName.trim()){updatePlayerName(p.id,adminEditName.trim());}setAdminEditId(null);}} disabled={adminLoading===p.id+"-rename"} style={{padding:"4px 8px",background:A,border:"none",borderRadius:6,color:"#000",fontSize:10,fontWeight:700,cursor:"pointer",opacity:adminLoading===p.id+"-rename"?0.5:1}}>{adminLoading===p.id+"-rename"?"..":"OK"}</button><button onClick={()=>setAdminEditId(null)} style={{padding:"4px 6px",background:"none",border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:10,cursor:"pointer"}}>X</button></div>:<button onClick={()=>{setAdminEditId(p.id);setAdminEditName(p.name);}} style={{padding:"6px 10px",background:A,border:"none",borderRadius:6,color:"#000",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                  Rename
                </button>}
                {confirmDeactivate===p.id?<div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,color:DG}}>Sure?</span><button onClick={()=>{deactivatePlayer(p.id);setConfirmDeactivate(null);}} disabled={adminLoading===p.id+"-deactivate"} style={{padding:"4px 8px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",opacity:adminLoading===p.id+"-deactivate"?0.5:1}}>{adminLoading===p.id+"-deactivate"?"..":"Yes"}</button><button onClick={()=>setConfirmDeactivate(null)} style={{padding:"4px 6px",background:"none",border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:10,cursor:"pointer"}}>No</button></div>:<button onClick={()=>setConfirmDeactivate(p.id)} style={{padding:"6px 10px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                  Deactivate
                </button>}
              </div>
            </div>
          );})}
        </div>
      </div>

      {/* League Settings Section */}
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
        {confirmRegenCode?<div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",width:"100%"}}><span style={{fontSize:11,color:TX}}>Old links stop working. Sure?</span><button onClick={()=>{regenerateInviteCode();setConfirmRegenCode(false);}} style={{padding:"6px 10px",background:DG,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>Yes</button><button onClick={()=>setConfirmRegenCode(false)} style={{padding:"6px 10px",background:CD2,border:"1px solid "+BD,borderRadius:6,color:MT,fontSize:11,cursor:"pointer"}}>No</button></div>:<button onClick={()=>setConfirmRegenCode(true)} style={{width:"100%",padding:"10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
          Regenerate Code
        </button>}
      </div>

      {/* Data Export Section */}
      <div>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12}}>Data Export</h3>
        <button onClick={exportMatchesCSV} style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
          Export Match History (CSV)
        </button>
      </div>
    </div>
  );
}
