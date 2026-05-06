import React, { useState, useEffect, useCallback } from "react";
import { A, CD, CD2, BD, TX, MT, DG } from "../theme";
import { useLeague } from "../LeagueContext";

// FT-14 / Issue #14: Season Management screen — owner-only.
// Lives under AdminDashboard → League Management. Lets the league owner
// create new seasons (optionally cloning the previous roster), end /
// reactivate seasons, edit name + dates, and edit per-season player roster.
//
// Stats consumers (ranking / partners / H2H) currently still show all
// league players regardless of season_players — Option C "phase 2" wiring
// is deferred per the FT-14 plan.
export function SeasonManagement({ setSidebarView }) {
  const { supabase, leagueId, players, seasons, showToast, loadLeagueData, isOwner } = useLeague();

  const [rosters, setRosters] = useState({}); // season_id -> Set(player_id)
  const [loading, setLoading] = useState(true);
  const [openSeasonId, setOpenSeasonId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState(new Date().toISOString().slice(0, 10));
  const [cloneFrom, setCloneFrom] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit form state (per-season editing)
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingRoster, setSavingRoster] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Sort: active first, then by start_date desc
  const sortedSeasons = [...(seasons || [])].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (b.start_date || "").localeCompare(a.start_date || "");
  });

  const loadRosters = useCallback(async () => {
    setLoading(true);
    try {
      const seasonIds = (seasons || []).map(s => s.id);
      if (seasonIds.length === 0) { setRosters({}); setLoading(false); return; }
      const { data, error } = await supabase.from("season_players").select("season_id,player_id").in("season_id", seasonIds);
      if (error) throw error;
      const map = {};
      (data || []).forEach(r => {
        if (!map[r.season_id]) map[r.season_id] = new Set();
        map[r.season_id].add(r.player_id);
      });
      setRosters(map);
    } catch (err) {
      showToast(err.message || "Failed to load rosters", "error");
    }
    setLoading(false);
  }, [supabase, seasons, showToast]);

  useEffect(() => { loadRosters(); }, [loadRosters]);

  // Default clone-from to most-recent existing season when opening create modal
  const openCreate = () => {
    setNewName("");
    setNewStart(new Date().toISOString().slice(0, 10));
    setCloneFrom(sortedSeasons[0]?.id || "");
    setShowCreate(true);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { showToast("Season name is required", "error"); return; }
    setCreating(true);
    try {
      const { error } = await supabase.rpc("create_season", {
        p_league_id: leagueId,
        p_name: name,
        p_start_date: newStart,
        p_clone_from: cloneFrom || null,
      });
      if (error) throw error;
      showToast("Season created");
      setShowCreate(false);
      await loadLeagueData();
      await loadRosters();
    } catch (err) {
      showToast(err.message || "Failed to create season", "error");
    }
    setCreating(false);
  };

  const openEdit = (s) => {
    setOpenSeasonId(s.id);
    setEditName(s.name || "");
    setEditStart(s.start_date || "");
    setEditEnd(s.end_date || "");
    setConfirmEnd(false);
  };
  const closeEdit = () => { setOpenSeasonId(null); setConfirmEnd(false); };

  const saveMeta = async () => {
    if (!openSeasonId) return;
    const name = editName.trim();
    if (!name) { showToast("Season name is required", "error"); return; }
    setSavingMeta(true);
    try {
      const { error } = await supabase.rpc("update_season", {
        p_season_id: openSeasonId,
        p_name: name,
        p_start_date: editStart || null,
        p_end_date: editEnd || null,
      });
      if (error) throw error;
      showToast("Season updated");
      await loadLeagueData();
    } catch (err) {
      showToast(err.message || "Failed to save", "error");
    }
    setSavingMeta(false);
  };

  const togglePlayer = async (seasonId, playerId) => {
    const current = rosters[seasonId] ? new Set(rosters[seasonId]) : new Set();
    if (current.has(playerId)) current.delete(playerId); else current.add(playerId);
    setSavingRoster(true);
    try {
      const { error } = await supabase.rpc("set_season_roster", {
        p_season_id: seasonId,
        p_player_ids: Array.from(current),
      });
      if (error) throw error;
      setRosters(prev => ({ ...prev, [seasonId]: current }));
    } catch (err) {
      showToast(err.message || "Failed to update roster", "error");
    }
    setSavingRoster(false);
  };

  const endSeason = async (seasonId) => {
    try {
      const { error } = await supabase.rpc("end_season", { p_season_id: seasonId, p_end_date: new Date().toISOString().slice(0, 10) });
      if (error) throw error;
      showToast("Season ended");
      setConfirmEnd(false);
      await loadLeagueData();
    } catch (err) {
      showToast(err.message || "Failed to end season", "error");
    }
  };

  const reactivateSeason = async (seasonId) => {
    try {
      const { error } = await supabase.rpc("reactivate_season", { p_season_id: seasonId });
      if (error) throw error;
      showToast("Season reactivated");
      await loadLeagueData();
    } catch (err) {
      showToast(err.message || "Failed to reactivate", "error");
    }
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    const dd = String(dt.getDate()).padStart(2, "0");
    const mmm = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getMonth()];
    return `${dd}/${mmm}/${dt.getFullYear()}`;
  };

  const openSeason = openSeasonId ? sortedSeasons.find(s => s.id === openSeasonId) : null;
  const openRoster = openSeasonId ? (rosters[openSeasonId] || new Set()) : new Set();

  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(96px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView("admin")} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",padding:0}}>← Back</button>

      <h2 style={{fontSize:20,fontWeight:900,fontStyle:"italic",textTransform:"uppercase",letterSpacing:1,marginBottom:8,color:TX}}>Season Management</h2>
      <div style={{fontSize:11,color:MT,marginBottom:20,lineHeight:1.5}}>Create, edit, end, or reactivate seasons. Season rosters control who can play matches in that season (ranking integration coming soon).</div>

      {!isOwner && (
        <div style={{padding:"12px",background:`${DG}15`,border:`1px solid ${DG}30`,borderRadius:8,fontSize:12,color:DG}}>Owner-only screen.</div>
      )}

      {isOwner && (
        <>
          {/* + New Season */}
          <button onClick={openCreate} style={{width:"100%",padding:"14px",background:A,border:"none",borderRadius:10,color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5,marginBottom:20}}>+ New Season</button>

          {/* Seasons list */}
          {loading && <div style={{textAlign:"center",color:MT,padding:20,fontSize:12}}>Loading rosters...</div>}
          {!loading && sortedSeasons.length === 0 && <div style={{textAlign:"center",color:MT,padding:20,fontSize:12}}>No seasons yet. Create one above.</div>}
          {!loading && sortedSeasons.map(s => {
            const rosterCount = rosters[s.id] ? rosters[s.id].size : 0;
            return (
              <button key={s.id} onClick={()=>openEdit(s)} style={{width:"100%",padding:"14px",background:CD,border:`1px solid ${s.active ? A+"50" : BD}`,borderRadius:10,marginBottom:8,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:800,fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5,color:TX,marginBottom:2}}>{s.name}</div>
                    <div style={{fontSize:10,color:MT}}>{fmtDate(s.start_date)}{s.end_date ? ` → ${fmtDate(s.end_date)}` : ""} · {rosterCount} player{rosterCount===1?"":"s"}</div>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,padding:"4px 8px",borderRadius:4,background:s.active?`${A}20`:BD,color:s.active?A:MT,textTransform:"uppercase",letterSpacing:0.5}}>{s.active ? "Active" : "Ended"}</span>
                </div>
              </button>
            );
          })}
        </>
      )}

      {/* ───── New Season modal ───── */}
      {showCreate && (
        <div onClick={()=>!creating && setShowCreate(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={(e)=>e.stopPropagation()} style={{width:"100%",maxWidth:480,background:CD,borderTopLeftRadius:20,borderTopRightRadius:20,padding:"16px 16px calc(20px + env(safe-area-inset-bottom, 0px))",fontFamily:"'Outfit',sans-serif"}}>
            <div style={{width:36,height:4,background:BD,borderRadius:2,margin:"0 auto 14px"}}/>
            <h3 style={{fontSize:16,fontWeight:900,fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5,color:TX,margin:"0 0 14px"}}>New Season</h3>

            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Name</label>
              <input type="text" value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder='e.g. "Season 2"' style={{width:"100%",padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Start Date</label>
              <input type="date" value={newStart} onChange={(e)=>setNewStart(e.target.value)} style={{width:"100%",padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Clone roster from</label>
              <select value={cloneFrom} onChange={(e)=>setCloneFrom(e.target.value)} style={{width:"100%",padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}>
                <option value="">— Start fresh (empty roster) —</option>
                {sortedSeasons.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({rosters[s.id]?.size || 0} players)</option>
                ))}
              </select>
              <div style={{fontSize:10,color:MT,marginTop:6,lineHeight:1.4}}>Active seasons will be auto-ended when this one starts.</div>
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowCreate(false)} disabled={creating} style={{flex:1,padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:10,color:MT,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Cancel</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()} style={{flex:1,padding:"12px",background:A,border:"none",borderRadius:10,color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5,opacity:(creating||!newName.trim())?0.6:1}}>{creating ? "..." : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ───── Edit Season bottom sheet ───── */}
      {openSeason && (
        <div onClick={closeEdit} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={(e)=>e.stopPropagation()} style={{width:"100%",maxWidth:480,maxHeight:"90vh",overflow:"auto",background:CD,borderTopLeftRadius:20,borderTopRightRadius:20,padding:"16px 16px calc(20px + env(safe-area-inset-bottom, 0px))",fontFamily:"'Outfit',sans-serif"}}>
            <div style={{width:36,height:4,background:BD,borderRadius:2,margin:"0 auto 14px"}}/>
            <h3 style={{fontSize:16,fontWeight:900,fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5,color:TX,margin:"0 0 14px"}}>{openSeason.name}</h3>

            {/* Name */}
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Name</label>
              <input type="text" value={editName} onChange={(e)=>setEditName(e.target.value)} style={{width:"100%",padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
            </div>

            {/* Dates */}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <div style={{flex:1}}>
                <label style={{display:"block",fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Start</label>
                <input type="date" value={editStart} onChange={(e)=>setEditStart(e.target.value)} style={{width:"100%",padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{display:"block",fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>End</label>
                <input type="date" value={editEnd} onChange={(e)=>setEditEnd(e.target.value)} style={{width:"100%",padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
              </div>
            </div>

            <button onClick={saveMeta} disabled={savingMeta} style={{width:"100%",padding:"10px",background:A,border:"none",borderRadius:8,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:16,opacity:savingMeta?0.6:1}}>{savingMeta ? "..." : "Save Details"}</button>

            {/* Roster */}
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <label style={{fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>Roster</label>
                <span style={{fontSize:10,color:MT}}>{openRoster.size} of {(players||[]).length}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {(players || []).map(p => {
                  const inRoster = openRoster.has(p.id);
                  return (
                    <button key={p.id} onClick={()=>togglePlayer(openSeasonId, p.id)} disabled={savingRoster} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"10px 12px",background:inRoster ? `${A}15` : CD2,border:`1px solid ${inRoster ? `${A}40` : BD}`,borderRadius:8,color:TX,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textAlign:"left",opacity:savingRoster?0.6:1}}>
                      <span>{p.name}{p.nickname ? ` (${p.nickname})` : ""}</span>
                      <span style={{fontSize:11,color:inRoster ? A : MT,fontWeight:700}}>{inRoster ? "✓ In" : "+ Add"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* End / Reactivate + Close */}
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              {openSeason.active ? (
                confirmEnd ? (
                  <>
                    <span style={{fontSize:11,color:TX,alignSelf:"center",flex:1}}>End this season?</span>
                    <button onClick={()=>endSeason(openSeasonId)} style={{padding:"10px 14px",background:DG,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Yes, end</button>
                    <button onClick={()=>setConfirmEnd(false)} style={{padding:"10px 14px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:MT,fontSize:12,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>No</button>
                  </>
                ) : (
                  <button onClick={()=>setConfirmEnd(true)} style={{flex:1,padding:"10px",background:`${DG}15`,border:`1px solid ${DG}40`,borderRadius:8,color:DG,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>End Season</button>
                )
              ) : (
                <button onClick={()=>reactivateSeason(openSeasonId)} style={{flex:1,padding:"10px",background:`${A}15`,border:`1px solid ${A}40`,borderRadius:8,color:A,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Reactivate Season</button>
              )}
            </div>

            <button onClick={closeEdit} style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:10,color:MT,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
