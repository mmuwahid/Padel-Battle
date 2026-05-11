import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { useLeague } from "../LeagueContext";

// S077 r10: League Management is now the SINGLE home for all league
// operations. The old standalone "Switch Leagues" view is gone — its
// listing + rename + delete + invite features all live here.
//
// Two modes:
//   - LIST  (detailLeagueId === null): dashboard + list of all leagues +
//     "Create new league" bsheet trigger at the bottom.
//   - DETAIL (detailLeagueId set): the previously-existing per-league
//     management view (name, invite code, Player Mgmt nav, Season Mgmt nav).
//
// Props leagues + leagueHandlers come from <AppContent> which gets them
// from <LeagueGate>.
export function LeagueManagement({
  setSidebarView, navigateSidebar, goBack,
  leagues = [], leagueHandlers = {},
}) {
  // S077 r11: nav helper — push current view onto sidebar history so the
  // back button on Player/Season Management returns here, not the drawer.
  const goTo = navigateSidebar || setSidebarView;
  const {
    supabase, league, leagueId,
    showToast, loadLeagueData,
    isOwner, isAdmin, players, approvedMatches, seasons,
    user,
  } = useLeague();

  // Mode: null = list, otherwise the league we're viewing detail for.
  const [detailLeagueId, setDetailLeagueId] = useState(null);
  const [switching, setSwitching] = useState(false);

  // Detail-view state (preserved from previous LeagueManagement)
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Create-league bsheet
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createFormat, setCreateFormat] = useState("singles");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  // Rename-league modal (from list mode)
  const [renameId, setRenameId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Delete-league modal — user types "delete" to confirm.
  const [deleteId, setDeleteId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Once the active leagueId matches the league the user wanted to view,
  // clear the switching spinner.
  useEffect(() => {
    if (switching && detailLeagueId && leagueId === detailLeagueId) {
      setSwitching(false);
    }
  }, [leagueId, detailLeagueId, switching]);

  const activeSeason = (seasons || []).find(s => s.active);
  const seasonShort = activeSeason?.name ? activeSeason.name.replace(/^Season\s+/i, "S") : "—";
  const fmtDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const dd = String(dt.getDate()).padStart(2, "0");
    const mmm = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getMonth()];
    return `${dd} ${mmm} ${dt.getFullYear()}`;
  };

  const openDetail = (id) => {
    if (id === leagueId) {
      setDetailLeagueId(id);
      return;
    }
    setSwitching(true);
    setDetailLeagueId(id);
    if (leagueHandlers.switchLeague) leagueHandlers.switchLeague(id);
  };

  const closeDetail = () => {
    setDetailLeagueId(null);
    setEditingName(false);
  };

  // ── Detail-view handlers ──────────────────────────────────────────────
  const saveLeagueName = async () => {
    const trimmed = (draftName || "").trim();
    if (!trimmed || trimmed === league?.name) { setEditingName(false); return; }
    setSavingName(true);
    try {
      const { error } = await supabase.rpc("update_league_name", { p_league_id: leagueId, p_name: trimmed });
      if (error) throw error;
      await loadLeagueData();
      showToast("League renamed");
      setEditingName(false);
    } catch (err) {
      showToast(err.message || "Failed to rename", "error");
    }
    setSavingName(false);
  };

  const regenerateInviteCode = async () => {
    setRegenerating(true);
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error } = await supabase.from("leagues").update({ invite_code: newCode }).eq("id", leagueId);
      if (error) throw error;
      await loadLeagueData();
      setConfirmRegen(false);
      showToast("Invite code regenerated");
    } catch (_err) {
      showToast("Failed to regenerate invite code", "error");
    }
    setRegenerating(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?invite=${league?.invite_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── List-view handlers ────────────────────────────────────────────────
  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) { setCreateErr("League name required"); return; }
    setCreating(true);
    setCreateErr("");
    try {
      // r9 atomic RPC via LeagueGate handler
      await leagueHandlers.createLeague({ name, format: createFormat, autoSeason: true });
      showToast("League created");
      setShowCreate(false);
      setCreateName("");
    } catch (err) {
      setCreateErr(err.message || "Failed to create league");
    }
    setCreating(false);
  };

  const handleRename = async (lid) => {
    const trimmed = (renameDraft || "").trim();
    if (!trimmed) return;
    setRenaming(true);
    try {
      await leagueHandlers.renameLeague(lid, trimmed);
      showToast("League renamed");
      setRenameId(null);
      setRenameDraft("");
    } catch (err) {
      showToast(err.message || "Failed to rename", "error");
    }
    setRenaming(false);
  };

  const handleDelete = async (lid) => {
    if (deleteConfirm.trim().toLowerCase() !== "delete") return;
    setDeleting(true);
    try {
      await leagueHandlers.deleteLeague(lid);
      showToast("League deleted");
      setDeleteId(null);
      setDeleteConfirm("");
    } catch (err) {
      showToast(err.message || "Failed to delete", "error");
    }
    setDeleting(false);
  };

  // ── DETAIL VIEW ──────────────────────────────────────────────────────
  if (detailLeagueId && !switching) {
    return (
      <div className="lm-screen">
        <div className="back-btn-row">
          <button className="back-btn" onClick={closeDetail}>
            <Icon name="chevron-left" size={18} color="currentColor" />
          </button>
        </div>

        <div className="ad-h">
          <div className="adey">League</div>
          <div className="adh1">{league?.name || "League"}</div>
        </div>

        <div className="lm-body">
          <div className="lmstats">
            <div className="lmsc"><div className="lmscv">{(players || []).length}</div><div className="lmscl">Players</div></div>
            <div className="lmsc"><div className="lmscv">{(approvedMatches || []).length}</div><div className="lmscl">Matches</div></div>
            <div className="lmsc"><div className="lmscv">{seasonShort}</div><div className="lmscl">Season</div></div>
          </div>

          <div>
            <div className="slbl">League Name</div>
            <div className="lmnamerow">
              {editingName && isOwner ? (
                <>
                  <input className="lmnameinput" type="text" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="League name" autoFocus />
                  <button className="gbtn" onClick={saveLeagueName} disabled={savingName}>
                    <Icon name="check" size={13} strokeWidth={2.5} />
                    {savingName ? "..." : "Save"}
                  </button>
                  <button className="gbtn ghost" onClick={() => { setEditingName(false); setDraftName(league?.name || ""); }}>Cancel</button>
                </>
              ) : (
                <>
                  <div className="lmnameval">{league?.name}</div>
                  {isOwner && (
                    <button className="gbtn" onClick={() => { setDraftName(league?.name || ""); setEditingName(true); }}>
                      <Icon name="edit" size={13} />Edit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <div className="slbl">Invite Code</div>
            <div className="invrow">
              <div className="invcb">
                <div className="invcv">{league?.invite_code}</div>
                {isOwner && (
                  confirmRegen ? (
                    <div className="invconf">
                      <span className="invconfq">New?</span>
                      <button className="invconfy" onClick={regenerateInviteCode} disabled={regenerating}>{regenerating ? "..." : "Yes"}</button>
                      <button className="invconfn" onClick={() => setConfirmRegen(false)}>No</button>
                    </div>
                  ) : (
                    <button className="invreb" onClick={() => setConfirmRegen(true)} title="Regenerate invite code">
                      <Icon name="refresh" size={14} />
                    </button>
                  )
                )}
              </div>
              <button className="pbtn" onClick={copyLink}>
                {copied ? <><Icon name="check" size={14} strokeWidth={2.5} />Copied</> : <><Icon name="copy" size={14} />Copy Link</>}
              </button>
            </div>
          </div>

          {isAdmin && (
            <div>
              <div className="slbl">Players</div>
              <button className="crow" onClick={() => goTo("playerManagement")}>
                <div className="cricon"><Icon name="players" size={16} color="var(--accent)" /></div>
                <div className="crbody">
                  <div className="crtitle">Player Management</div>
                  <div className="crsub">{(players || []).length} player{(players || []).length === 1 ? "" : "s"} in this league</div>
                </div>
                <div className="crchev"><Icon name="chevron" size={16} color="var(--muted-2)" /></div>
              </button>
            </div>
          )}

          {isAdmin && (
            <div>
              <div className="slbl">Seasons</div>
              <button className="crow" onClick={() => goTo("seasonManagement")}>
                <div className="cricon"><Icon name="calendar" size={16} color="var(--accent)" /></div>
                <div className="crbody">
                  <div className="crtitle">Season Management</div>
                  <div className="crsub">
                    {activeSeason
                      ? `${activeSeason.name} active${activeSeason.start_date ? ` · ${fmtDate(activeSeason.start_date)}` : ""}`
                      : `${(seasons || []).length} season${(seasons || []).length === 1 ? "" : "s"} · none active`}
                  </div>
                </div>
                <div className="crchev"><Icon name="chevron" size={16} color="var(--muted-2)" /></div>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LIST VIEW (default) ──────────────────────────────────────────────
  return (
    <div className="lm-screen">
      <div className="back-btn-row">
        <button className="back-btn" onClick={() => goBack ? goBack() : setSidebarView("admin")}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>

      <div className="ad-h">
        <div className="adey">League</div>
        <div className="adh1">Management</div>
      </div>

      <div className="lm-body">
        {/* Dashboard */}
        <div className="lmstats">
          <div className="lmsc"><div className="lmscv">{leagues.length}</div><div className="lmscl">Leagues</div></div>
          <div className="lmsc"><div className="lmscv">{leagues.filter(l => l.created_by === user?.id).length}</div><div className="lmscl">Owned</div></div>
          <div className="lmsc"><div className="lmscv">{leagues.length - leagues.filter(l => l.created_by === user?.id).length}</div><div className="lmscl">Joined</div></div>
        </div>

        {/* All leagues list */}
        <div>
          <div className="slbl">All Leagues</div>
          {leagues.length === 0 && (
            <div className="sm-empty">No leagues yet. Create one below or join with an invite code.</div>
          )}
          {leagues.map(l => {
            const isLOwner = l.created_by === user?.id;
            const isActive = l.id === leagueId;
            const isRenaming = renameId === l.id;
            const isDeleting = deleteId === l.id;
            // Whole card is the open trigger (per user direction: no separate
            // "Open" button). Inline rename/delete forms stop propagation so
            // they don't bubble up to the card click.
            const cardOnClick = () => {
              if (isRenaming || isDeleting) return;
              openDetail(l.id);
            };
            return (
              <div
                key={l.id}
                className={`secard${isActive ? " on" : ""}`}
                onClick={cardOnClick}
                style={{ cursor: "pointer" }}
              >
                <div className="secdtop">
                  <span className="secname">{l.name}</span>
                  <div className={isLOwner ? "badgea" : "badgee"}>
                    {isLOwner ? "OWNER" : (l._userRole === "admin" ? "ADMIN" : "MEMBER")}
                  </div>
                </div>
                {isRenaming ? (
                  <div className="lm-list-form" onClick={(e) => e.stopPropagation()}>
                    <input className="shi" type="text" value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} placeholder="New name" autoFocus />
                    <button className="gbtn" disabled={renaming || !renameDraft.trim()} onClick={() => handleRename(l.id)}>
                      <Icon name="check" size={12} />{renaming ? "..." : "Save"}
                    </button>
                    <button className="gbtn ghost" onClick={() => { setRenameId(null); setRenameDraft(""); }}>Cancel</button>
                  </div>
                ) : isDeleting ? (
                  <div className="lm-list-form" onClick={(e) => e.stopPropagation()}>
                    <input className="shi" type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder='Type "delete" to confirm' autoFocus />
                    <button className="dbtn" disabled={deleting || deleteConfirm.trim().toLowerCase() !== "delete"} onClick={() => handleDelete(l.id)}>
                      {deleting ? "..." : "Delete"}
                    </button>
                    <button className="gbtn ghost" onClick={() => { setDeleteId(null); setDeleteConfirm(""); }}>Cancel</button>
                  </div>
                ) : isLOwner ? (
                  <div className="secft" onClick={(e) => e.stopPropagation()}>
                    <button className="gbtn" onClick={() => { setRenameId(l.id); setRenameDraft(l.name); }}>
                      <Icon name="edit" size={12} />Rename
                    </button>
                    <button className="dbtn" onClick={() => { setDeleteId(l.id); setDeleteConfirm(""); }}>
                      <Icon name="trash" size={12} />Delete
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Create new league (bottom) */}
        <div>
          <button className="pbtn pbtn-block" onClick={() => { setShowCreate(true); setCreateName(""); setCreateFormat("singles"); setCreateErr(""); }}>
            <Icon name="plus" size={16} strokeWidth={2.5} />Create new league
          </button>
        </div>
      </div>

      {/* Switching spinner (after clicking a league that isn't currently active) */}
      {switching && (
        <div className="overlay">
          <div className="lv-loading" style={{padding:"32px",background:"var(--surface)",borderRadius:"12px"}}>Switching league…</div>
        </div>
      )}

      {/* Create-league bottom-sheet */}
      {showCreate && (
        <div className="overlay" onClick={() => !creating && setShowCreate(false)}>
          <div className="bsheet" onClick={(e) => e.stopPropagation()}>
            <div className="shdl" />
            <div className="shhdr">
              <div className="shtitle">New League</div>
              <button className="shclose" onClick={() => setShowCreate(false)}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="shbody">
              {createErr && <div className="lv-error">{createErr}</div>}
              <div className="shf">
                <div className="shlbl"><Icon name="hash" size={12} color="var(--muted)" />League name</div>
                <input className="shi" type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder='e.g. "Padel Stars"' autoFocus />
              </div>
              <div className="shf">
                <div className="shlbl"><Icon name="trophy" size={12} color="var(--muted)" />Format</div>
                <div className="sform-typetoggle">
                  <button type="button" className={`sform-typebtn${createFormat === "singles" ? " on" : ""}`} onClick={() => setCreateFormat("singles")}>
                    Singles
                    <span className="sform-typebtn-sub">Individual ranking</span>
                  </button>
                  <button type="button" className={`sform-typebtn${createFormat === "pairs" ? " on" : ""}`} onClick={() => setCreateFormat("pairs")}>
                    Pairs
                    <span className="sform-typebtn-sub">Fixed teams</span>
                  </button>
                </div>
              </div>
              <div className="inote">
                <Icon name="info" size={14} color="rgba(74,222,128,.85)" />
                <div className="inotet">A Season 1 is auto-created so the league is ready to use.</div>
              </div>
            </div>
            <div className="shact">
              <button className="shcancel" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button className="shsubmit" onClick={handleCreate} disabled={creating || !createName.trim()}>{creating ? "..." : "Create League"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
