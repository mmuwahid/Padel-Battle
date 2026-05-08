import React, { useState, useEffect, useCallback } from "react";
import Icon from "./Icon";
import { useLeague } from "../LeagueContext";

// S067 Phase 12 PR 3: spec-faithful Season Management list + Create bsheet.
// Class names match docs/PadelHub_Complete_v2.jsx lines 2032-2076 verbatim:
//   .secard / .secdtop / .secname / .badgea / .badgee / .secmr / .secmi /
//   .secft / .gbtn / .dbtn / .goldbtn — list cards
//   .pbtn (top "+ New Season")
//   .overlay / .bsheet / .shdl / .shhdr / .shtitle / .shclose / .shbody /
//   .shf / .shlbl / .shi / .shsel / .inote / .inotet / .shact / .shcancel /
//   .shsubmit — bottom-sheet create form
// User decision S067 Q6=A: keep S055 full-screen Season Detail pattern for
// edit (rich roster toggle UX doesn't fit a sheet). List + Create restyled.
export function SeasonManagement({ setSidebarView, goBack }) {
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
    return `${dd} ${mmm} ${dt.getFullYear()}`;
  };

  const openSeason = openSeasonId ? sortedSeasons.find(s => s.id === openSeasonId) : null;
  const openRoster = openSeasonId ? (rosters[openSeasonId] || new Set()) : new Set();

  // ── Full-screen Season Detail (S055 pattern preserved per Q6=A) ───────────
  if (openSeason) {
    return (
      <div className="sm-screen">
        <div className="back-btn-row">
          <button className="back-btn" onClick={closeEdit}>
            <Icon name="chevron-left" size={18} color="currentColor" />
          </button>
        </div>

        <div className="ad-h sm-detail-h">
          <div className="adey">Season Detail</div>
          <div className="adh1-row">
            <div className="adh1">{openSeason.name}</div>
            <div className={openSeason.active ? "badgea" : "badgee"}>{openSeason.active ? "ACTIVE" : "ENDED"}</div>
          </div>
        </div>

        <div className="sm-detail-body">
          <div className="shf">
            <div className="shlbl"><Icon name="hash" size={12} color="var(--muted)" />Name</div>
            <input className="shi" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>

          <div className="shf">
            <div className="shlbl"><Icon name="globe" size={12} color="var(--muted)" />Location</div>
            <input className="shi" type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. Sports Club A" />
          </div>

          <div className="shf-row">
            <div className="shf">
              <div className="shlbl"><Icon name="calendar" size={12} color="var(--muted)" />Start</div>
              <input className="shi" type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
            </div>
            <div className="shf">
              <div className="shlbl"><Icon name="calendar" size={12} color="var(--muted)" />End</div>
              <input className="shi" type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
            </div>
          </div>

          <button className="shsubmit sm-savemeta" onClick={saveMeta} disabled={savingMeta}>
            {savingMeta ? "Saving…" : "Save Details"}
          </button>

          <div className="sm-roster">
            <div className="sm-roster-h">
              <div className="slbl">Roster</div>
              <span className="sm-roster-ct">{openRoster.size} / {(players || []).length}</span>
            </div>
            <div className="sm-roster-list">
              {(players || []).map(p => {
                const inRoster = openRoster.has(p.id);
                return (
                  <button key={p.id} className={`sm-rost${inRoster ? " on" : ""}`} onClick={() => togglePlayer(openSeasonId, p.id)} disabled={savingRoster}>
                    <span className="sm-rost-n">{p.name}{p.nickname ? ` (${p.nickname})` : ""}</span>
                    <span className="sm-rost-s">{inRoster ? <><Icon name="check" size={12} strokeWidth={2.5} />In</> : <>+ Add</>}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {openSeason.active ? (
            confirmEnd ? (
              <div className="sm-confirmrow danger">
                <span>End this season?</span>
                <button className="dbtn" onClick={() => endSeason(openSeasonId)}>Yes, end</button>
                <button className="gbtn ghost" onClick={() => setConfirmEnd(false)}>No</button>
              </div>
            ) : (
              <button className="sm-bigaction danger" onClick={() => setConfirmEnd(true)}>
                <Icon name="close" size={14} />End Season
              </button>
            )
          ) : (
            <button className="sm-bigaction accent" onClick={() => reactivateSeason(openSeasonId)}>
              <Icon name="refresh" size={14} />Reactivate Season
            </button>
          )}

          {!openSeason.active && (
            confirmDelete ? (
              <div className="sm-confirmrow danger">
                <span>Delete permanently? (no matches allowed)</span>
                <button className="dbtn" onClick={() => deleteSeason(openSeasonId)} disabled={deleting}>{deleting ? "..." : "Delete"}</button>
                <button className="gbtn ghost" onClick={() => setConfirmDelete(false)}>No</button>
              </div>
            ) : (
              <button className="sm-bigaction danger ghost" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={14} />Delete Season
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  // ── Season List ────────────────────────────────────────────────────────────
  return (
    <div className="sm-screen">
      <div className="back-btn-row">
        <button className="back-btn" onClick={() => goBack ? goBack() : setSidebarView("admin")}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>

      <div className="ad-h">
        <div className="adey">League</div>
        <div className="adh1">Season Management</div>
      </div>

      <div className="sm-body">
        {!isOwner && (
          <div className="sm-note">Owner-only screen.</div>
        )}

        {isOwner && (
          <>
            <button className="pbtn pbtn-block" onClick={openCreate}>
              <Icon name="plus" size={16} strokeWidth={2.5} />New Season
            </button>

            {loading && <div className="sm-empty">Loading…</div>}
            {!loading && sortedSeasons.length === 0 && <div className="sm-empty">No seasons yet. Create one above.</div>}

            {!loading && sortedSeasons.map(s => {
              const rosterCount = rosters[s.id] ? rosters[s.id].size : 0;
              // Per spec lines 2042-2054 each card carries its own inline
              // Edit / End / Reactivate buttons in a footer row.
              return (
                <div key={s.id} className="secard" onClick={() => openEdit(s)}>
                  <div className="secdtop">
                    <div className="secname">{s.name}</div>
                    <div className={s.active ? "badgea" : "badgee"}>{s.active ? "ACTIVE" : "ENDED"}</div>
                  </div>
                  <div className="secmr">
                    <div className="secmi"><Icon name="calendar" size={12} color="var(--muted)" />{fmtDate(s.start_date)}{s.end_date ? ` → ${fmtDate(s.end_date)}` : ""}</div>
                    <div className="secmi"><Icon name="players" size={12} color="var(--muted)" />{rosterCount} player{rosterCount === 1 ? "" : "s"}</div>
                  </div>
                  {s.location && (
                    <div className="secmr">
                      <div className="secmi"><Icon name="globe" size={12} color="var(--muted)" />{s.location}</div>
                    </div>
                  )}
                  <div className="secft">
                    <span className="secft-meta">{rosterCount} player{rosterCount === 1 ? "" : "s"}</span>
                    <div className="secft-acts" onClick={(e) => e.stopPropagation()}>
                      <button className="gbtn" onClick={() => openEdit(s)}>
                        <Icon name="edit" size={12} />Edit
                      </button>
                      {s.active && (
                        <button className="dbtn" onClick={() => endSeason(s.id)}>
                          <Icon name="close" size={12} />End
                        </button>
                      )}
                      {!s.active && (
                        <button className="goldbtn" onClick={() => reactivateSeason(s.id)}>
                          <Icon name="refresh" size={12} />Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {showCreate && (
        <div className="overlay" onClick={() => !creating && setShowCreate(false)}>
          <div className="bsheet" onClick={(e) => e.stopPropagation()}>
            <div className="shdl" />
            <div className="shhdr">
              <div className="shtitle">New Season</div>
              <button className="shclose" onClick={() => setShowCreate(false)}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="shbody">
              <div className="shf">
                <div className="shlbl"><Icon name="hash" size={12} color="var(--muted)" />Name</div>
                <input className="shi" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='e.g. "Season 2"' />
              </div>
              <div className="shf">
                <div className="shlbl"><Icon name="globe" size={12} color="var(--muted)" />Location</div>
                <input className="shi" type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="e.g. Sports Club A" />
              </div>
              <div className="shf">
                <div className="shlbl"><Icon name="calendar" size={12} color="var(--muted)" />Start Date</div>
                <input className="shi" type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div className="shf">
                <div className="shlbl"><Icon name="players" size={12} color="var(--muted)" />Clone Roster From</div>
                <select className="shsel" value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)}>
                  <option value="">— Start fresh (empty roster) —</option>
                  {sortedSeasons.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({rosters[s.id]?.size || 0} players)</option>
                  ))}
                </select>
              </div>
              <div className="inote">
                <Icon name="info" size={14} color="rgba(245,158,11,.85)" />
                <div className="inotet">Active seasons will be auto-ended when this one starts.</div>
              </div>
            </div>
            <div className="shact">
              <button className="shcancel" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button className="shsubmit" onClick={handleCreate} disabled={creating || !newName.trim()}>{creating ? "..." : "Create Season"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
