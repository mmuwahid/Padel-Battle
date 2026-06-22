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
  leagueStats = {},
  // S077 r13: detailLeagueId lifted to App.jsx so the back button from
  // PlayerManagement / SeasonManagement returns to the SAME league's detail
  // view, not the list. When these props aren't supplied (old callers) the
  // component falls back to internal state.
  detailLeagueId: detailLeagueIdProp,
  setDetailLeagueId: setDetailLeagueIdProp,
  // S079: when set, the detail view was opened from PlatformAdmin —
  // closeDetail must goBack() to return to PlatformAdmin instead of the
  // LeagueManagement list (which shows the user's OWN leagues only).
  detailFromPlatform = false,
  setDetailFromPlatform,
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

  // S077 r13: prefer lifted prop, fall back to local state.
  const [detailLeagueIdLocal, setDetailLeagueIdLocal] = useState(null);
  const detailLeagueId = detailLeagueIdProp !== undefined ? detailLeagueIdProp : detailLeagueIdLocal;
  const setDetailLeagueId = setDetailLeagueIdProp || setDetailLeagueIdLocal;
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

  // S077 r16: Delete-league Danger Zone in detail view.
  const [showDeleteLeague, setShowDeleteLeague] = useState(false);
  const [deleteLeagueTyped, setDeleteLeagueTyped] = useState("");
  const [deletingLeague, setDeletingLeague] = useState(false);

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
    const dow = dt.toLocaleString("en-GB", { weekday: "short" }).toUpperCase();
    const dd = String(dt.getDate()).padStart(2, "0");
    const mmm = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getMonth()];
    return `${dow} ${dd} ${mmm} ${dt.getFullYear()}`;
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
    // S079: if the detail view was opened from PlatformAdmin, back returns
    // to the platform list rather than to the LM list (which only shows
    // the user's own leagues — confusing for a platform admin who tapped
    // a league they don't own).
    if (detailFromPlatform) {
      if (setDetailFromPlatform) setDetailFromPlatform(false);
      setDetailLeagueId(null);
      setEditingName(false);
      if (goBack) goBack();
      return;
    }
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
      loadLeagueData(); // C1: background refresh, UI unblocks immediately
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
      loadLeagueData(); // C1: background refresh, UI unblocks immediately
      setConfirmRegen(false);
      showToast("Invite code regenerated");
    } catch (_err) {
      showToast("Failed to regenerate invite code", "error");
    }
    setRegenerating(false);
  };

  // S108 Issue #108: the copy button copies the raw invite CODE only (e.g.
  // "11030f72"), not a URL. The Share button (shareInvite) still shares the link.
  const copyLink = () => {
    navigator.clipboard.writeText(league?.invite_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // D1: native share of the invite link (mirrors Sidebar "Invite Players").
  const shareInvite = () => {
    const url = `${window.location.origin}${window.location.pathname}?invite=${league?.invite_code}`;
    if (navigator.share) {
      navigator.share({ title: "Join my PadelHub league", text: `Join "${league?.name}" on PadelHub!`, url });
    } else {
      navigator.clipboard.writeText(url);
      showToast("Invite link copied!");
    }
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

          {isAdmin && (
            <div>
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

          {isAdmin && (
            <div>
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
              <button className="crow" onClick={() => goTo("leaguePermissions")}>
                <div className="cricon"><Icon name="shield" size={16} color="var(--accent)" /></div>
                <div className="crbody">
                  <div className="crtitle">League Permissions</div>
                  <div className="crsub">{isOwner ? "Choose what admins can do · invite, approve, roster, profiles" : "What admins can do in this league (owner sets these)"}</div>
                </div>
                <div className="crchev"><Icon name="chevron" size={16} color="var(--muted-2)" /></div>
              </button>
            </div>
          )}

          <div>
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
                    <button className="gbtn pair-iconbtn" aria-label="Rename league" title="Rename" onClick={() => { setDraftName(league?.name || ""); setEditingName(true); }}>
                      <Icon name="edit" size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
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
              <div style={{display:"flex",gap:8}}>
                <button style={{padding:"9px 11px",borderRadius:"var(--r-md)",background:"var(--surface)",border:"1px solid var(--border)",cursor:"pointer",color:"var(--muted)",display:"flex",alignItems:"center"}} onClick={copyLink} title="Copy invite code" aria-label="Copy invite code">
                  {copied ? <Icon name="check" size={16} strokeWidth={2.5} /> : <Icon name="copy" size={16} />}
                </button>
                <button style={{padding:"9px 11px",borderRadius:"var(--r-md)",background:"var(--surface)",border:"1px solid var(--border)",cursor:"pointer",color:"var(--muted)",display:"flex",alignItems:"center"}} onClick={shareInvite} title="Share invite" aria-label="Share invite">
                  <Icon name="share" size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* S077 r16: Danger Zone — Delete League at the bottom of detail
              view, owner-only, with type-"delete" confirmation modal.
              Matches the SettingsView delete-account pattern. */}
          {isOwner && (
            <div style={{marginTop:24}}>
              {!showDeleteLeague ? (
                <button
                  onClick={() => { setShowDeleteLeague(true); setDeleteLeagueTyped(""); }}
                  style={{width:"100%",padding:14,borderRadius:"var(--r-md)",background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.32)",fontFamily:"var(--font)",fontSize:14,fontWeight:700,color:"var(--danger)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
                >
                  <Icon name="alert" size={16} color="var(--danger)"/>Delete League
                </button>
              ) : (
                <div style={{padding:16,background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.32)",borderRadius:"var(--r-lg)"}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:11,fontWeight:800,letterSpacing:".12em",color:"var(--danger)",textTransform:"uppercase",marginBottom:10}}>Danger Zone</div>
                  <p style={{fontSize:12,color:"var(--danger)",opacity:.9,marginBottom:14,lineHeight:1.5,fontFamily:"var(--font)"}}>
                    Permanently delete <strong>{league?.name}</strong> and ALL of its data: members, players, seasons, matches, pair rosters, leaderboards. This cannot be undone.
                  </p>
                  <input
                    className="shi"
                    type="text"
                    value={deleteLeagueTyped}
                    onChange={(e) => setDeleteLeagueTyped(e.target.value)}
                    placeholder='Type "delete" to confirm'
                    style={{marginBottom:12,width:"100%"}}
                    autoFocus
                  />
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={() => { setShowDeleteLeague(false); setDeleteLeagueTyped(""); }} disabled={deletingLeague} className="shcancel" style={{flex:1,padding:"12px 0",fontSize:13}}>Cancel</button>
                    <button
                      onClick={async () => {
                        if (deleteLeagueTyped.trim().toLowerCase() !== "delete") { showToast('Type "delete" to confirm', "error"); return; }
                        setDeletingLeague(true);
                        try {
                          await leagueHandlers.deleteLeague(leagueId);
                          showToast("League deleted");
                          // Pop back to list (lifted state).
                          setDetailLeagueId(null);
                          setShowDeleteLeague(false);
                          setDeleteLeagueTyped("");
                        } catch (err) {
                          showToast(err.message || "Failed to delete league", "error");
                        }
                        setDeletingLeague(false);
                      }}
                      disabled={deletingLeague || deleteLeagueTyped.trim().toLowerCase() !== "delete"}
                      style={{flex:1,padding:"12px 0",borderRadius:"var(--r-md)",background:"var(--danger)",border:"none",color:"#fff",fontFamily:"var(--font)",fontSize:13,fontWeight:800,cursor:deletingLeague?"not-allowed":"pointer",letterSpacing:".04em",opacity:(deletingLeague || deleteLeagueTyped.trim().toLowerCase() !== "delete")?.6:1}}
                    >{deletingLeague ? "Deleting…" : "Yes, Delete"}</button>
                  </div>
                </div>
              )}
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
        {/* Dashboard — S077 r15: "Joined" was confusing. Renamed to "Playing"
            and based on whether the user has a claimed player row in the
            league (not just membership). Owner-of-league always has a player
            row post-r13 backfill, so for own leagues both Owned and Playing
            count. */}
        <div className="lmstats">
          <div className="lmsc"><div className="lmscv">{leagues.length}</div><div className="lmscl">Leagues</div></div>
          <div className="lmsc"><div className="lmscv">{leagues.filter(l => l.created_by === user?.id).length}</div><div className="lmscl">Owned</div></div>
          <div className="lmsc"><div className="lmscv">{leagues.filter(l => leagueStats[l.id]?.is_playing).length}</div><div className="lmscl">Playing</div></div>
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
            // Whole card is the open trigger (per user direction: no separate
            // "Open" button). Inline rename/delete forms stop propagation so
            // they don't bubble up to the card click.
            const cardOnClick = () => {
              if (isRenaming) return;
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
                {/* S077 r13: per-league counts from get_league_stats RPC. */}
                {(() => {
                  const st = leagueStats[l.id] || { players: 0, matches: 0, seasons: 0 };
                  return (
                    <div className="secmr">
                      <div className="secmi"><Icon name="players" size={12} color="var(--muted)" />{st.players} player{st.players === 1 ? "" : "s"}</div>
                      <div className="secmi"><Icon name="racket" size={12} color="var(--muted)" />{st.matches} match{st.matches === 1 ? "" : "es"}</div>
                      <div className="secmi"><Icon name="calendar" size={12} color="var(--muted)" />{st.seasons} season{st.seasons === 1 ? "" : "s"}</div>
                    </div>
                  );
                })()}
                {isRenaming ? (
                  <div className="lm-list-form" onClick={(e) => e.stopPropagation()}>
                    <input className="shi" type="text" value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} placeholder="New name" autoFocus />
                    <button className="gbtn" disabled={renaming || !renameDraft.trim()} onClick={() => handleRename(l.id)}>
                      <Icon name="check" size={12} />{renaming ? "..." : "Save"}
                    </button>
                    <button className="gbtn ghost" onClick={() => { setRenameId(null); setRenameDraft(""); }}>Cancel</button>
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
