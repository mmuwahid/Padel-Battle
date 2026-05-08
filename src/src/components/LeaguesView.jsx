import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { supabase } from "../supabase";

/**
 * S063: LeaguesView — full sidebar sub-view for league management.
 * Replaces the standalone LeagueGate full-screen picker.
 *
 * Sections:
 *   1. Switch league — list of memberships, current selected indicator
 *   2. Create new league — name + format (singles/pairs) + auto-season toggle
 *   3. Join with invite code
 *   4. Manage current league (admin/owner only — rename + delete)
 *
 * Visual: reuses Phase 4/5 token-based class styling (.seg, .gbtn, .pbtn,
 * .srch, etc.) where applicable. Bespoke `.lv-*` classes for the rest;
 * intentionally minimal — visual polish lives in PR2 (S063 visuals).
 */
export function LeaguesView({
  user,
  leagues,
  leagueId,            // currently selected
  handlers,            // { switchLeague, createLeague, joinLeague, renameLeague, deleteLeague }
  onClose,
  showToast,
}) {
  const [section, setSection] = useState(null); // null | "create" | "join"
  const [newName, setNewName] = useState("");
  const [newFormat, setNewFormat] = useState("singles");
  const [autoSeason, setAutoSeason] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState("");

  const [inviteCode, setInviteCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinErr, setJoinErr] = useState("");

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [delConfirmId, setDelConfirmId] = useState(null);
  const [delTyped, setDelTyped] = useState("");

  // #67: lazy-fetch player + match counts per visible league when this view mounts.
  // Map keyed by league_id → { players, matches }.
  const [counts, setCounts] = useState({});
  useEffect(() => {
    if (!leagues || leagues.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        leagues.map(async (l) => {
          const [{ count: pc }, { count: mc }] = await Promise.all([
            supabase.from("players").select("id", { count: "exact", head: true }).eq("league_id", l.id),
            supabase.from("matches").select("id", { count: "exact", head: true }).eq("league_id", l.id).eq("status", "approved"),
          ]);
          return [l.id, { players: pc || 0, matches: mc || 0 }];
        })
      );
      if (cancelled) return;
      setCounts(Object.fromEntries(results));
    })();
    return () => { cancelled = true; };
  }, [leagues]);

  const handleCreate = async (e) => {
    e?.preventDefault();
    setCreateErr("");
    if (!newName.trim()) { setCreateErr("League name required"); return; }
    setCreateBusy(true);
    try {
      await handlers.createLeague({ name: newName.trim(), format: newFormat, autoSeason });
      showToast?.(`League "${newName.trim()}" created.`);
      setNewName(""); setNewFormat("singles"); setAutoSeason(true); setSection(null);
      onClose?.();
    } catch (err) {
      setCreateErr(err.message || "Failed to create league");
    } finally {
      setCreateBusy(false);
    }
  };

  const handleJoin = async (e) => {
    e?.preventDefault();
    setJoinErr("");
    if (!inviteCode.trim()) { setJoinErr("Invite code required"); return; }
    setJoinBusy(true);
    try {
      const found = await handlers.joinLeague(inviteCode.trim());
      showToast?.(`Joined "${found.name}".`);
      setInviteCode(""); setSection(null);
      onClose?.();
    } catch (err) {
      setJoinErr(err.message || "Failed to join league");
    } finally {
      setJoinBusy(false);
    }
  };

  const handleRename = async (id) => {
    if (!editName.trim()) return;
    try {
      await handlers.renameLeague(id, editName.trim());
      showToast?.("League renamed.");
      setEditId(null); setEditName("");
    } catch (err) {
      showToast?.(err.message || "Rename failed", "error");
    }
  };

  const handleDelete = async (id, name) => {
    if (delConfirmId !== id) { setDelConfirmId(id); setDelTyped(""); return; }
    if (delTyped.trim() !== name.trim()) {
      showToast?.("Name didn't match", "error");
      return;
    }
    try {
      await handlers.deleteLeague(id);
      showToast?.(`Deleted "${name}".`);
      setDelConfirmId(null); setDelTyped("");
    } catch (err) {
      showToast?.(err.message || "Delete failed", "error");
    }
  };

  const handleShareInvite = (l) => {
    const url = `${window.location.origin}${window.location.pathname}?invite=${l.invite_code}`;
    if (navigator.share) {
      navigator.share({ title: "Join my PadelHub league", text: `Join "${l.name}" on PadelHub!`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      showToast?.("Invite link copied!");
    }
  };

  return (
    <div className="lv-screen">
      {/* Header */}
      <div className="lv-header">
        <button className="lv-back" onClick={onClose} aria-label="Back">
          <Icon name="chevron" size={18} />
        </button>
        <h1 className="lv-title">Leagues</h1>
      </div>

      {/* Switch league — list */}
      {leagues.length > 0 && (
        <div className="lv-section">
          <div className="lv-section-label">Your leagues</div>
          <div className="lv-list">
            {leagues.map(l => {
              const isCurrent = l.id === leagueId;
              const isOwner = l.created_by === user.id;
              const isAdminLike = isOwner || l._userRole === "admin";
              return (
                <div key={l.id} className={`lv-card${isCurrent ? " current" : ""}`}>
                  {editId === l.id ? (
                    <div className="lv-card-row">
                      <input
                        className="lv-input"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        autoFocus
                      />
                      <button className="gbtn on" onClick={() => handleRename(l.id)}>Save</button>
                      <button className="gbtn" onClick={() => { setEditId(null); setEditName(""); }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="lv-card-main"
                        onClick={() => { handlers.switchLeague(l.id); onClose?.(); }}
                      >
                        <span className="lv-card-emoji">🏟️</span>
                        <div className="lv-card-body">
                          <div className="lv-card-row1">
                            <span className="lv-card-name">{l.name}</span>
                            {l.format === "pairs" && <span className="lv-card-fmt">PAIRS</span>}
                            {isCurrent && <span className="pbadge">CURRENT</span>}
                          </div>
                          <div className="lv-card-meta">
                            <Icon name="users" size={11} color="currentColor" strokeWidth={2}/>
                            <span>{counts[l.id]?.players ?? "—"} players</span>
                            <span className="lv-card-meta-sep">·</span>
                            <Icon name="racket" size={11} color="currentColor" strokeWidth={2}/>
                            <span>{counts[l.id]?.matches ?? "—"} matches</span>
                          </div>
                        </div>
                      </button>
                      <div className="lv-card-actions">
                        {isAdminLike && (
                          <button className="gbtn" title="Share invite" onClick={() => handleShareInvite(l)}>
                            <Icon name="share" size={12} /> Invite
                          </button>
                        )}
                        {isAdminLike && (
                          <button className="gbtn" title="Rename" onClick={() => { setEditId(l.id); setEditName(l.name); }}>
                            <Icon name="edit" size={12} />
                          </button>
                        )}
                        {isOwner && (
                          delConfirmId === l.id ? (
                            <div className="lv-del-confirm">
                              <input
                                className="lv-input lv-input-sm"
                                placeholder={`Type "${l.name}" to confirm`}
                                value={delTyped}
                                onChange={e => setDelTyped(e.target.value)}
                              />
                              <button className="gbtn danger" onClick={() => handleDelete(l.id, l.name)}>Confirm</button>
                              <button className="gbtn" onClick={() => { setDelConfirmId(null); setDelTyped(""); }}>X</button>
                            </div>
                          ) : (
                            <button className="gbtn danger" title="Delete" onClick={() => handleDelete(l.id, l.name)}>
                              <Icon name="trash" size={12} />
                            </button>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action toggles */}
      {section === null && (
        <div className="lv-section lv-actions">
          <button className="pbtn" onClick={() => { setSection("create"); setCreateErr(""); }}>
            <Icon name="plus" size={13} color="#000" strokeWidth={2.5} /> Create new league
          </button>
          <button className="gbtn" onClick={() => { setSection("join"); setJoinErr(""); }}>
            Join with invite code
          </button>
        </div>
      )}

      {/* Create form */}
      {section === "create" && (
        <form className="lv-section lv-form" onSubmit={handleCreate}>
          <div className="lv-section-label">Create a new league</div>

          <label className="lv-label">League name</label>
          <input
            className="lv-input"
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Padel Stars"
            autoFocus
          />

          <label className="lv-label" style={{marginTop:14}}>Format</label>
          <div className="lv-fmt">
            <button
              type="button"
              className={`lv-fmt-opt${newFormat === "singles" ? " on" : ""}`}
              onClick={() => setNewFormat("singles")}
            >
              <div className="lv-fmt-title">Singles</div>
              <div className="lv-fmt-sub">Individual ranking — current default</div>
            </button>
            <button
              type="button"
              className={`lv-fmt-opt${newFormat === "pairs" ? " on" : ""}`}
              onClick={() => setNewFormat("pairs")}
            >
              <div className="lv-fmt-title">Pairs</div>
              <div className="lv-fmt-sub">Fixed teams — Premier-Padel style</div>
            </button>
          </div>
          {newFormat === "pairs" && (
            <div className="lv-note">
              ⚠ Pair leaderboard rendering is not yet shipped. Matches and seasons
              will work, but the Ranking screen will show a placeholder until
              the pair-tracking feature lands.
            </div>
          )}

          <label className="lv-checkbox" style={{marginTop:14}}>
            <input
              type="checkbox"
              checked={autoSeason}
              onChange={e => setAutoSeason(e.target.checked)}
            />
            <span>Auto-create "Season 1" so the league is ready to use</span>
          </label>

          {createErr && <div className="lv-err">{createErr}</div>}

          <div className="lv-form-actions">
            <button type="button" className="gbtn" onClick={() => setSection(null)} disabled={createBusy}>Cancel</button>
            <button type="submit" className="pbtn" disabled={createBusy}>
              {createBusy ? "Creating…" : "Create League"}
            </button>
          </div>
        </form>
      )}

      {/* Join form */}
      {section === "join" && (
        <form className="lv-section lv-form" onSubmit={handleJoin}>
          <div className="lv-section-label">Join an existing league</div>
          <label className="lv-label">Invite code</label>
          <input
            className="lv-input"
            type="text"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            placeholder="8-character code"
            autoFocus
          />
          {joinErr && <div className="lv-err">{joinErr}</div>}
          <div className="lv-form-actions">
            <button type="button" className="gbtn" onClick={() => setSection(null)} disabled={joinBusy}>Cancel</button>
            <button type="submit" className="pbtn" disabled={joinBusy}>
              {joinBusy ? "Joining…" : "Join League"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
