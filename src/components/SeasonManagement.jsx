import React, { useState, useEffect, useRef } from "react";
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
export function SeasonManagement({ setSidebarView, goBack, autoCreate, clearAutoCreate }) {
  const { supabase, leagueId, players, seasons, pairs, seasonRosters, showToast, loadLeagueData, isAdmin, setSelectedSeason } = useLeague();

  // S077 r9: read seasonRosters from context (no separate round-trip).
  // S083 smoke: mirror into local state so roster chips flip instantly
  // (optimistic) instead of waiting for the RPC + loadLeagueData round-trip.
  const [localRosters, setLocalRosters] = useState(seasonRosters || {});
  const rostersRef = useRef(localRosters);
  useEffect(() => {
    const next = seasonRosters || {};
    rostersRef.current = next;
    setLocalRosters(next);
  }, [seasonRosters]);
  const rosters = localRosters;
  const rosterWriteChain = useRef(Promise.resolve());
  const loading = false;
  const [openSeasonId, setOpenSeasonId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState(new Date().toISOString().slice(0, 10));
  const [newEnd, setNewEnd] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [cloneFrom, setCloneFrom] = useState("");
  const [newFormat, setNewFormat] = useState("individual"); // S073 FT-15
  const [newRuleset, setNewRuleset] = useState("fip"); // S080: season ruleset
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteSeasonTyped, setDeleteSeasonTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  // S076 FT-15: pair management state
  const [showCreatePair, setShowCreatePair] = useState(false);
  const [newPairA, setNewPairA] = useState("");
  const [newPairB, setNewPairB] = useState("");
  const [newPairName, setNewPairName] = useState("");
  const [pairBusy, setPairBusy] = useState(false);
  const [editingPairId, setEditingPairId] = useState(null);
  const [editPairName, setEditPairName] = useState("");
  const [confirmDeletePair, setConfirmDeletePair] = useState(null);

  // S077: filter seasons by permission. League admins/owners see all;
  // season admins (without league-level role) see only their assigned seasons.
  // S077 r7: simplified model — owner + league admin see all seasons.
  const sortedSeasons = [...(seasons || [])].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (b.start_date || "").localeCompare(a.start_date || "");
  });

  // S077 r9: loadRosters dropped — context already has seasonRosters.

  const openCreate = () => {
    setNewName("");
    setNewStart(new Date().toISOString().slice(0, 10));
    setNewEnd("");
    setNewLocation("");
    setCloneFrom(sortedSeasons[0]?.id || "");
    setNewRuleset("fip");
    setShowCreate(true);
  };

  // A1: auto-open the create sheet when arriving from the Ranking empty-state CTA.
  useEffect(() => {
    if (autoCreate) { openCreate(); if (clearAutoCreate) clearAutoCreate(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally fires only when autoCreate prop toggles; openCreate/clearAutoCreate are stable callbacks
  }, [autoCreate]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { showToast("Season name is required", "error"); return; }
    setCreating(true);
    try {
      const args = {
        p_league_id: leagueId,
        p_name: name,
        p_start_date: newStart,
        p_clone_from: cloneFrom || null,
        p_location: newLocation.trim() || null,
        p_format: newFormat,
        p_ruleset: newRuleset,
        p_end_date: newEnd || null,
      };
      // S082: transient "Load failed" retries are now handled globally by the
      // fetch wrapper in supabase.js, so no per-call retry is needed here.
      const { data: newId, error } = await supabase.rpc("create_season", args);
      if (error) throw error;
      showToast("Season created");
      setShowCreate(false);
      loadLeagueData(); // C1: background refresh, UI unblocks immediately
      // S081: switch the app context to the season just created so logging,
      // leaderboard and ruleset all immediately reflect it (was stuck on the
      // previously-active season, breaking the Casual ruleset at log time).
      if (newId) setSelectedSeason(newId);
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
      loadLeagueData(); // C1: background refresh, UI unblocks immediately
    } catch (err) {
      showToast(err.message || "Failed to save", "error");
    }
    setSavingMeta(false);
  };

  // S083 smoke: optimistic toggle — flip the chip instantly, then persist.
  // Writes are serialized via rosterWriteChain so rapid taps (full-replace RPC)
  // can't race and clobber each other; on error we resync from the server.
  const togglePlayer = (seasonId, playerId) => {
    const prev = rostersRef.current;
    const current = prev[seasonId] ? new Set(prev[seasonId]) : new Set();
    if (current.has(playerId)) current.delete(playerId); else current.add(playerId);
    const next = { ...prev, [seasonId]: current };
    rostersRef.current = next;
    setLocalRosters(next);
    const ids = Array.from(current);
    rosterWriteChain.current = rosterWriteChain.current.then(async () => {
      const { error } = await supabase.rpc("set_season_roster", {
        p_season_id: seasonId,
        p_player_ids: ids,
      });
      if (error) {
        showToast(error.message || "Failed to update roster", "error");
        loadLeagueData(); // resync optimistic state with server truth
      }
    });
  };

  const endSeason = async (seasonId) => {
    try {
      const { error } = await supabase.rpc("end_season", { p_season_id: seasonId, p_end_date: new Date().toISOString().slice(0, 10) });
      if (error) throw error;
      showToast("Season ended");
      setConfirmEnd(false);
      loadLeagueData(); // C1: background refresh, UI unblocks immediately
    } catch (err) {
      showToast(err.message || "Failed to end season", "error");
    }
  };

  const reactivateSeason = async (seasonId) => {
    try {
      const { error } = await supabase.rpc("reactivate_season", { p_season_id: seasonId });
      if (error) throw error;
      showToast("Season reactivated");
      loadLeagueData(); // C1: background refresh, UI unblocks immediately
    } catch (err) {
      showToast(err.message || "Failed to reactivate", "error");
    }
  };

  const deleteSeason = async (seasonId) => {
    if (deleteSeasonTyped.trim().toLowerCase() !== "delete") {
      showToast('Type "delete" to confirm', "error");
      return;
    }
    setDeleting(true);
    // S077 r16: dropped the retry-with-backoff that was masking the underlying
    // slowness (each retry added ~30s when the RPC was hanging). delete_season
    // RPC is now atomic + no-matches-guard-free — one call, return on commit.
    // loadLeagueData runs in background so UI unblocks immediately.
    try {
      const { error } = await supabase.rpc("delete_season", { p_season_id: seasonId });
      if (error) throw error;
      showToast("Season deleted");
      setConfirmDelete(false);
      setDeleteSeasonTyped("");
      closeEdit();
      loadLeagueData(); // fire-and-forget
    } catch (err) {
      showToast(err.message || "Failed to delete season", "error");
    }
    setDeleting(false);
  };

  // S076 FT-15: pair management handlers ------------------------------------
  const seasonPairs = (pairs || []).filter(pr => pr.season_id === openSeasonId);
  const openCreatePair = () => {
    setNewPairA(""); setNewPairB(""); setNewPairName(""); setShowCreatePair(true);
  };
  const handleCreatePair = async () => {
    if (!openSeasonId) return;
    if (!newPairA || !newPairB || newPairA === newPairB) {
      showToast("Pick two different players", "error"); return;
    }
    setPairBusy(true);
    try {
      const { error } = await supabase.rpc("create_pair", {
        p_season_id: openSeasonId,
        p_player_a: newPairA,
        p_player_b: newPairB,
        p_name: newPairName.trim() || null,
        p_color: null,
      });
      if (error) throw error;
      showToast("Pair created");
      setShowCreatePair(false);
      loadLeagueData(); // C1: background refresh, UI unblocks immediately
    } catch (err) {
      showToast(err.message || "Failed to create pair", "error");
    }
    setPairBusy(false);
  };
  const handleEditPair = (pr) => {
    setEditingPairId(pr.id);
    setEditPairName(pr.name || "");
  };
  const handleSavePairName = async () => {
    if (!editingPairId) return;
    setPairBusy(true);
    try {
      const { error } = await supabase.rpc("update_pair", {
        p_pair_id: editingPairId,
        p_name: editPairName.trim() || null,
        p_color: null,
      });
      if (error) throw error;
      showToast("Pair updated");
      setEditingPairId(null);
      loadLeagueData(); // C1: background refresh, UI unblocks immediately
    } catch (err) {
      showToast(err.message || "Failed to update pair", "error");
    }
    setPairBusy(false);
  };
  const handleDeletePair = async (pairId) => {
    setPairBusy(true);
    try {
      const { error } = await supabase.rpc("delete_pair", { p_pair_id: pairId });
      if (error) throw error;
      showToast("Pair deleted");
      setConfirmDeletePair(null);
      loadLeagueData(); // C1: background refresh, UI unblocks immediately
    } catch (err) {
      showToast(err.message || "Failed to delete pair", "error");
    }
    setPairBusy(false);
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    const dow = dt.toLocaleString("en-GB", { weekday: "short" }).toUpperCase();
    const dd = String(dt.getDate()).padStart(2, "0");
    const mmm = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getMonth()];
    return `${dow} ${dd} ${mmm} ${dt.getFullYear()}`;
  };

  const openSeason = openSeasonId ? sortedSeasons.find(s => s.id === openSeasonId) : null;
  const openRoster = openSeasonId ? (rosters[openSeasonId] || new Set()) : new Set();

  // ── Full-screen Season Detail (S055 pattern preserved per Q6=A) ───────────
  if (openSeason) {
    return (
      <div className="sm-screen">
        <div className="back-btn-row">
          <button className="back-btn" aria-label="Back" onClick={closeEdit}>
            <Icon name="chevron-left" size={18} color="currentColor" />
          </button>
        </div>

        <div className="ad-h sm-detail-h">
          <div className="adey">Season Detail</div>
          <div className="adh1-row">
            <div className="adh1">{openSeason.name}</div>
            <div className={openSeason.active ? "badgea" : "badgee"}>{openSeason.active ? "ACTIVE" : "ENDED"}</div>
            <div className="badgee" style={{textTransform:"uppercase"}}>{openSeason.ruleset === "casual" ? "Casual" : "FIP"}</div>
          </div>
        </div>

        <div className="sm-detail-body">
          <div className="shf">
            <div className="shlbl"><Icon name="hash" size={12} color="var(--muted)" />Name</div>
            <input aria-label="Season name" className="shi" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>

          <div className="shf">
            <div className="shlbl"><Icon name="globe" size={12} color="var(--muted)" />Location</div>
            <input aria-label="Location" className="shi" type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. Sports Club A" />
          </div>

          <div className="shf-row">
            <div className="shf">
              <div className="shlbl"><Icon name="calendar" size={12} color="var(--muted)" />Start</div>
              <input aria-label="Start date" className="shi" type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
            </div>
            <div className="shf">
              <div className="shlbl"><Icon name="calendar" size={12} color="var(--muted)" />End</div>
              <input aria-label="End date" className="shi" type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
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
                  <button key={p.id} className={`sm-rost${inRoster ? " on" : ""}`} onClick={() => togglePlayer(openSeasonId, p.id)}>
                    <span className="sm-rost-n">{p.name}{p.nickname ? ` (${p.nickname})` : ""}</span>
                    <span className="sm-rost-s">{inRoster ? <><Icon name="check" size={12} strokeWidth={2.5} />In</> : <>+ Add</>}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {openSeason.format === "pairs" && (
            <div className="sm-roster sm-pairs">
              <div className="sm-roster-h">
                <div className="slbl">Pairs Roster</div>
                <span className="sm-roster-ct">{seasonPairs.length} pair{seasonPairs.length === 1 ? "" : "s"}</span>
              </div>
              <button className="pbtn pbtn-block" onClick={openCreatePair} disabled={openRoster.size < 2}>
                <Icon name="plus" size={16} strokeWidth={2.5} />Add Pair
              </button>
              {seasonPairs.length === 0 && (
                <div className="sm-empty">No pairs yet. Add pairs above before logging matches.</div>
              )}
              {seasonPairs.map(pr => {
                const pA = (players || []).find(pl => pl.id === pr.player_a_id);
                const pB = (players || []).find(pl => pl.id === pr.player_b_id);
                const nameFallback = `${pA?.name || "?"} / ${pB?.name || "?"}`;
                const isEditing = editingPairId === pr.id;
                const isConfirmDel = confirmDeletePair === pr.id;
                return (
                  <div key={pr.id} className="sm-paircard">
                    <div className="sm-paircard-main">
                      <div className="sm-pairavi">{(pA?.name || "?").charAt(0).toUpperCase()}</div>
                      <div className="sm-pairavi">{(pB?.name || "?").charAt(0).toUpperCase()}</div>
                      <div className="sm-pairnames">
                        {isEditing ? (
                          <input aria-label="Pair name" className="shi" type="text" value={editPairName} onChange={(e) => setEditPairName(e.target.value)} placeholder={nameFallback} autoFocus />
                        ) : (
                          <>
                            <div className="sm-pairnames-line1">{pr.name || nameFallback}</div>
                            {pr.name && <div className="sm-pairnames-line2">{nameFallback}</div>}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="sm-paircard-acts">
                      {isEditing ? (
                        <>
                          <button className="gbtn pair-iconbtn" aria-label="Save name" title="Save" onClick={handleSavePairName} disabled={pairBusy}><Icon name="check" size={14} /></button>
                          <button className="gbtn ghost pair-iconbtn" aria-label="Cancel" title="Cancel" onClick={() => setEditingPairId(null)}><Icon name="close" size={14} /></button>
                        </>
                      ) : isConfirmDel ? (
                        <>
                          <button className="dbtn" onClick={() => handleDeletePair(pr.id)} disabled={pairBusy}>{pairBusy ? "..." : "Delete"}</button>
                          <button className="gbtn ghost" onClick={() => setConfirmDeletePair(null)}>No</button>
                        </>
                      ) : (
                        <>
                          <button className="gbtn pair-iconbtn" aria-label="Rename pair" title="Rename" onClick={() => handleEditPair(pr)}><Icon name="edit" size={14} /></button>
                          <button className="dbtn pair-iconbtn" aria-label="Delete pair" title="Delete" onClick={() => setConfirmDeletePair(pr.id)}><Icon name="trash" size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
              <div className="sm-confirmrow danger" style={{flexWrap:"wrap",gap:8}}>
                <input
                  aria-label='Type "delete" to confirm season deletion'
                  className="shi"
                  type="text"
                  value={deleteSeasonTyped}
                  onChange={(e) => setDeleteSeasonTyped(e.target.value)}
                  placeholder='Type "delete" to confirm'
                  autoFocus
                  style={{flex:1,minWidth:160}}
                />
                <button className="dbtn" onClick={() => deleteSeason(openSeasonId)} disabled={deleting || deleteSeasonTyped.trim().toLowerCase() !== "delete"}>{deleting ? "..." : "Delete"}</button>
                <button className="gbtn ghost" onClick={() => { setConfirmDelete(false); setDeleteSeasonTyped(""); }}>Cancel</button>
              </div>
            ) : (
              <button className="sm-bigaction danger ghost" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={14} />Delete Season
              </button>
            )
          )}
        </div>

        {showCreatePair && (
          <div className="overlay" onClick={() => !pairBusy && setShowCreatePair(false)}>
            <div className="bsheet" onClick={(e) => e.stopPropagation()}>
              <div className="shdl" />
              <div className="shhdr">
                <div className="shtitle">Add Pair</div>
                <button className="shclose" aria-label="Close" onClick={() => setShowCreatePair(false)}><Icon name="close" size={14} /></button>
              </div>
              <div className="shbody">
                <div className="shf">
                  <div className="shlbl"><Icon name="hash" size={12} color="var(--muted)" />Player A</div>
                  <select aria-label="Player A" className="shsel" value={newPairA} onChange={(e) => setNewPairA(e.target.value)}>
                    <option value="">— Pick player —</option>
                    {(players || []).filter(pl => openRoster.has(pl.id) && pl.id !== newPairB).map(pl => (
                      <option key={pl.id} value={pl.id}>{pl.name}{pl.nickname ? ` (${pl.nickname})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="shf">
                  <div className="shlbl"><Icon name="hash" size={12} color="var(--muted)" />Player B</div>
                  <select aria-label="Player B" className="shsel" value={newPairB} onChange={(e) => setNewPairB(e.target.value)}>
                    <option value="">— Pick player —</option>
                    {(players || []).filter(pl => openRoster.has(pl.id) && pl.id !== newPairA).map(pl => (
                      <option key={pl.id} value={pl.id}>{pl.name}{pl.nickname ? ` (${pl.nickname})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="shf">
                  <div className="shlbl"><Icon name="trophy" size={12} color="var(--muted)" />Pair Name (optional)</div>
                  <input aria-label="Pair name" className="shi" type="text" value={newPairName} onChange={(e) => setNewPairName(e.target.value)} placeholder='e.g. "Thunder"' />
                </div>
              <div className="inote">
                  <Icon name="info" size={14} color="rgba(74,222,128,.85)" />
                  <div className="inotet">Both players must be in this season's roster. Pair ELO starts at 1500.</div>
                </div>
              </div>
              <div className="shact">
                <button className="shcancel" onClick={() => setShowCreatePair(false)} disabled={pairBusy}>Cancel</button>
                <button className="shsubmit" onClick={handleCreatePair} disabled={pairBusy || !newPairA || !newPairB || newPairA === newPairB}>{pairBusy ? "..." : "Create Pair"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Season List ────────────────────────────────────────────────────────────
  return (
    <div className="sm-screen">
      <div className="back-btn-row">
        <button className="back-btn" aria-label="Back" onClick={() => goBack ? goBack() : setSidebarView("admin")}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>

      <div className="ad-h">
        <div className="adey">League</div>
        <div className="adh1">Season Management</div>
      </div>

      <div className="sm-body">
        {!isAdmin && (
          <div className="sm-note">Admin or Owner only.</div>
        )}

        {isAdmin && (
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
                <input aria-label="Season name" className="shi" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='e.g. "Season 2"' />
              </div>
              <div className="shf">
                <div className="shlbl"><Icon name="globe" size={12} color="var(--muted)" />Location</div>
                <input aria-label="Location" className="shi" type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="e.g. Sports Club A" />
              </div>
              <div className="shf-row">
                <div className="shf">
                  <div className="shlbl"><Icon name="calendar" size={12} color="var(--muted)" />Start Date</div>
                  <input aria-label="Start date" className="shi" type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                </div>
                <div className="shf">
                  <div className="shlbl"><Icon name="calendar" size={12} color="var(--muted)" />End Date</div>
                  <input aria-label="End date" className="shi" type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                </div>
              </div>
              <div className="shf">
                <div className="shlbl"><Icon name="players" size={12} color="var(--muted)" />Clone Roster From</div>
                <select aria-label="Clone roster from" className="shsel" value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)}>
                  <option value="">— Start fresh (empty roster) —</option>
                  {sortedSeasons.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({rosters[s.id]?.size || 0} players)</option>
                  ))}
                </select>
              </div>
              {/* S073 FT-15: format toggle — defaults to individual; pairs unlocks Pair Roster admin (deferred to S074). */}
              <div className="shf">
                <div className="shlbl"><Icon name="trophy" size={12} color="var(--muted)" />Format</div>
                <div className="sform-typetoggle">
                  <button type="button" className={`sform-typebtn${newFormat==="individual"?" on":""}`} onClick={()=>setNewFormat("individual")}>
                    Individual Leaderboard
                    <span className="sform-typebtn-sub">Any partner</span>
                  </button>
                  <button type="button" className={`sform-typebtn${newFormat==="pairs"?" on":""}`} onClick={()=>setNewFormat("pairs")}>
                    Pairs/Team Leaderboard
                    <span className="sform-typebtn-sub">Fixed teams</span>
                  </button>
                </div>
                <div style={{fontSize:10,color:"var(--muted)",marginTop:6,lineHeight:1.5}}>
                  {newFormat==="pairs"
                    ? "Pairs/Team tracks fixed teams that stay together for the whole season."
                    : "Individual tracks each player's own scores — they can play with any partner."}
                </div>
              </div>
              {/* S080: ruleset toggle — chosen once, immutable for the life of the season. */}
              <div className="shf">
                <div className="shlbl"><Icon name="shield" size={12} color="var(--muted)" />Ruleset</div>
                <div className="sform-typetoggle">
                  <button type="button" className={`sform-typebtn${newRuleset==="fip"?" on":""}`} onClick={()=>setNewRuleset("fip")}>
                    Official (FIP)
                    <span className="sform-typebtn-sub">Premier Padel · Best of 3</span>
                  </button>
                  <button type="button" className={`sform-typebtn${newRuleset==="casual"?" on":""}`} onClick={()=>setNewRuleset("casual")}>
                    Casual
                    <span className="sform-typebtn-sub">Any sets & scores</span>
                  </button>
                </div>
                <div style={{fontSize:10,color:"var(--muted)",marginTop:6}}>Ruleset is locked for the life of the season.</div>
              </div>
              <div className="inote">
                <Icon name="info" size={14} color="rgba(255, 215, 0,.85)" />
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
