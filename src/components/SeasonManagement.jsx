import React, { useState, useEffect, useCallback } from "react";
import { A, CD, CD2, BD, TX, MT, DG } from "../theme";
import { useLeague } from "../LeagueContext";

export function SeasonManagement({ setSidebarView }) {
  const { supabase, leagueId, players, seasons, showToast, loadLeagueData, isOwner } = useLeague();

  const [rosters, setRosters] = useState({});
  const [loading, setLoading] = useState(true);
  const [openSeasonId, setOpenSeasonId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState(new Date().toISOString().slice(0, 10));
  const [newLocation, setNewLocation] = useState("");
  const [cloneFrom, setCloneFrom] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingRoster, setSavingRoster] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const openCreate = () => {
    setNewName("");
    setNewStart(new Date().toISOString().slice(0, 10));
    setNewLocation("");
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
        p_location: newLocation.trim() || null,
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
    setEditLocation(s.location || "");
    setConfirmEnd(false);
    setConfirmDelete(false);
  };
  const closeEdit = () => { setOpenSeasonId(null); setConfirmEnd(false); setConfirmDelete(false); };

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
        p_location: editLocation.trim() || null,
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

  const deleteSeason = async (seasonId) => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_season", { p_season_id: seasonId });
      if (error) throw error;
      showToast("Season deleted");
      closeEdit();
      await loadLeagueData();
      await loadRosters();
    } catch (err) {
      showToast(err.message || "Failed to delete season", "error");
    }
    setDeleting(false);
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

  const inputStyle = { width:"100%", padding:"10px 12px", background:CD2, border:`1px solid ${BD}`, borderRadius:8, color:TX, fontSize:13, fontFamily:"'Outfit',sans-serif", outline:"none", boxSizing:"border-box" };
  const labelStyle = { display:"block", fontSize:10, color:MT, fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:6 };

  // ── Full-screen Season Detail ──────────────────────────────────────────────
  if (openSeason) {
    return (
      <div style={{padding:"20px 16px", paddingBottom:"calc(96px + env(safe-area-inset-bottom, 0px))", fontFamily:"'Outfit',sans-serif"}}>
        <button onClick={closeEdit} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",padding:0}}>← Back</button>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,gap:8,flexWrap:"wrap"}}>
          <h2 style={{fontSize:20,fontWeight:900,fontStyle:"italic",textTransform:"uppercase",letterSpacing:1,margin:0,color:TX}}>{openSeason.name}</h2>
          <span style={{fontSize:9,fontWeight:700,padding:"4px 10px",borderRadius:4,background:openSeason.active?`${A}20`:BD,color:openSeason.active?A:MT,textTransform:"uppercase",letterSpacing:0.5}}>{openSeason.active ? "Active" : "Ended"}</span>
        </div>

        {/* Name */}
        <div style={{marginBottom:12}}>
          <label style={labelStyle}>Name</label>
          <input type="text" value={editName} onChange={(e)=>setEditName(e.target.value)} style={inputStyle}/>
        </div>

        {/* Location */}
        <div style={{marginBottom:12}}>
          <label style={labelStyle}>Location</label>
          <input type="text" value={editLocation} onChange={(e)=>setEditLocation(e.target.value)} placeholder="e.g. Sports Club A" style={inputStyle}/>
        </div>

        {/* Dates */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
            <label style={labelStyle}>Start</label>
            <input type="date" value={editStart} onChange={(e)=>setEditStart(e.target.value)} style={inputStyle}/>
          </div>
          <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
            <label style={labelStyle}>End</label>
            <input type="date" value={editEnd} onChange={(e)=>setEditEnd(e.target.value)} style={inputStyle}/>
          </div>
        </div>

        <button onClick={saveMeta} disabled={savingMeta} style={{width:"100%",padding:"12px",background:A,border:"none",borderRadius:10,color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:20,opacity:savingMeta?0.6:1,fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5}}>{savingMeta ? "Saving..." : "Save Details"}</button>

        {/* Roster */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <label style={{...labelStyle,marginBottom:0}}>Roster</label>
            <span style={{fontSize:10,color:MT}}>{openRoster.size} / {(players||[]).length}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {(players || []).map(p => {
              const inRoster = openRoster.has(p.id);
              return (
                <button key={p.id} onClick={()=>togglePlayer(openSeasonId, p.id)} disabled={savingRoster} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"10px 12px",background:inRoster?`${A}15`:CD2,border:`1px solid ${inRoster?`${A}40`:BD}`,borderRadius:8,color:TX,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textAlign:"left",opacity:savingRoster?0.6:1}}>
                  <span>{p.name}{p.nickname ? ` (${p.nickname})` : ""}</span>
                  <span style={{fontSize:11,color:inRoster?A:MT,fontWeight:700}}>{inRoster ? "✓ In" : "+ Add"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* End / Reactivate */}
        <div style={{marginBottom:10}}>
          {openSeason.active ? (
            confirmEnd ? (
              <div style={{display:"flex",gap:8,alignItems:"center",padding:"12px",background:`${DG}10`,border:`1px solid ${DG}30`,borderRadius:10}}>
                <span style={{fontSize:12,color:TX,flex:1}}>End this season?</span>
                <button onClick={()=>endSeason(openSeasonId)} style={{padding:"8px 14px",background:DG,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Yes, end</button>
                <button onClick={()=>setConfirmEnd(false)} style={{padding:"8px 14px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:MT,fontSize:12,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>No</button>
              </div>
            ) : (
              <button onClick={()=>setConfirmEnd(true)} style={{width:"100%",padding:"12px",background:`${DG}12`,border:`1px solid ${DG}40`,borderRadius:10,color:DG,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>End Season</button>
            )
          ) : (
            <button onClick={()=>reactivateSeason(openSeasonId)} style={{width:"100%",padding:"12px",background:`${A}12`,border:`1px solid ${A}40`,borderRadius:10,color:A,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Reactivate Season</button>
          )}
        </div>

        {/* Delete */}
        {!openSeason.active && (
          <div style={{marginBottom:10}}>
            {confirmDelete ? (
              <div style={{display:"flex",gap:8,alignItems:"center",padding:"12px",background:`${DG}10`,border:`1px solid ${DG}40`,borderRadius:10}}>
                <span style={{fontSize:12,color:TX,flex:1}}>Delete permanently? (no matches allowed)</span>
                <button onClick={()=>deleteSeason(openSeasonId)} disabled={deleting} style={{padding:"8px 14px",background:DG,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:deleting?0.6:1}}>{deleting?"...":"Delete"}</button>
                <button onClick={()=>setConfirmDelete(false)} style={{padding:"8px 14px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:MT,fontSize:12,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>No</button>
              </div>
            ) : (
              <button onClick={()=>setConfirmDelete(true)} style={{width:"100%",padding:"12px",background:"transparent",border:`1px solid ${DG}40`,borderRadius:10,color:DG,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:0.7}}>Delete Season</button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Season List ────────────────────────────────────────────────────────────
  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(96px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView("admin")} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",padding:0}}>← Back</button>

      <h2 style={{fontSize:20,fontWeight:900,fontStyle:"italic",textTransform:"uppercase",letterSpacing:1,marginBottom:8,color:TX}}>Season Management</h2>
      <div style={{fontSize:11,color:MT,marginBottom:20,lineHeight:1.5}}>Create, edit, end, or reactivate seasons. Tap a season to edit its details and roster.</div>

      {!isOwner && (
        <div style={{padding:"12px",background:`${DG}15`,border:`1px solid ${DG}30`,borderRadius:8,fontSize:12,color:DG}}>Owner-only screen.</div>
      )}

      {isOwner && (
        <>
          <button onClick={openCreate} style={{width:"100%",padding:"14px",background:A,border:"none",borderRadius:10,color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5,marginBottom:20}}>+ New Season</button>

          {loading && <div style={{textAlign:"center",color:MT,padding:20,fontSize:12}}>Loading...</div>}
          {!loading && sortedSeasons.length === 0 && <div style={{textAlign:"center",color:MT,padding:20,fontSize:12}}>No seasons yet. Create one above.</div>}
          {!loading && sortedSeasons.map(s => {
            const rosterCount = rosters[s.id] ? rosters[s.id].size : 0;
            return (
              <button key={s.id} onClick={()=>openEdit(s)} style={{width:"100%",padding:"14px",background:CD,border:`1px solid ${s.active ? A+"50" : BD}`,borderRadius:10,marginBottom:8,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:800,fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5,color:TX,marginBottom:2}}>{s.name}</div>
                    <div style={{fontSize:10,color:MT}}>
                      {fmtDate(s.start_date)}{s.end_date ? ` → ${fmtDate(s.end_date)}` : ""}
                      {s.location ? ` · ${s.location}` : ""}
                      {` · ${rosterCount} player${rosterCount===1?"":"s"}`}
                    </div>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,padding:"4px 8px",borderRadius:4,background:s.active?`${A}20`:BD,color:s.active?A:MT,textTransform:"uppercase",letterSpacing:0.5,flexShrink:0}}>{s.active ? "Active" : "Ended"}</span>
                </div>
              </button>
            );
          })}
        </>
      )}

      {/* New Season sheet */}
      {showCreate && (
        <div onClick={()=>!creating && setShowCreate(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={(e)=>e.stopPropagation()} style={{width:"100%",maxWidth:480,background:CD,borderTopLeftRadius:20,borderTopRightRadius:20,padding:"16px 16px calc(20px + env(safe-area-inset-bottom, 0px))",fontFamily:"'Outfit',sans-serif",overflow:"hidden"}}>
            <div style={{width:36,height:4,background:BD,borderRadius:2,margin:"0 auto 14px"}}/>
            <h3 style={{fontSize:16,fontWeight:900,fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5,color:TX,margin:"0 0 14px"}}>New Season</h3>

            <div style={{marginBottom:12}}>
              <label style={labelStyle}>Name</label>
              <input type="text" value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder='e.g. "Season 2"' style={inputStyle}/>
            </div>

            <div style={{marginBottom:12}}>
              <label style={labelStyle}>Location</label>
              <input type="text" value={newLocation} onChange={(e)=>setNewLocation(e.target.value)} placeholder="e.g. Sports Club A" style={inputStyle}/>
            </div>

            <div style={{marginBottom:12}}>
              <label style={labelStyle}>Start Date</label>
              <input type="date" value={newStart} onChange={(e)=>setNewStart(e.target.value)} style={inputStyle}/>
            </div>

            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Clone roster from</label>
              <select value={cloneFrom} onChange={(e)=>setCloneFrom(e.target.value)} style={{...inputStyle}}>
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
    </div>
  );
}
