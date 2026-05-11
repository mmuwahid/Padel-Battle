import React, { useState } from "react";
import Icon from "./Icon";
import { useLeague } from "../LeagueContext";

// S067 Phase 12 PR 3: spec-faithful League Management.
// Class names match docs/PadelHub_Complete_v2.jsx lines 2012-2026 verbatim:
//   .lmstats / .lmsc / .lmscv / .lmscl   — 3 stat cards (Players/Matches/Season)
//   .slbl                                — uppercase section labels
//   .lmnamerow                           — name display row (custom — spec used inline style)
//   .gbtn                                — small ghost (icon + text) action
//   .invcb / .invcv / .invreb / .pbtn   — invite code row (code chip + regen + copy)
//   .crow / .cricon / .crbody / .crtitle / .crsub / .crchev — Season Mgmt row
// User decision S067 Q4=A: dropped the bottom Scoring Rules row entirely.
export function LeagueManagement({ setSidebarView, goBack }) {
  const {
    supabase, league, leagueId,
    showToast, loadLeagueData,
    isOwner, isAdmin, isSeasonAdminOfAny, seasonAdmins, players, approvedMatches, seasons,
  } = useLeague();

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(league?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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
                <input
                  className="lmnameinput"
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="League name"
                  autoFocus
                />
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

        {(isOwner || isSeasonAdminOfAny) && (
          <div>
            <div className="slbl">Seasons</div>
            <button className="crow" onClick={() => setSidebarView("seasonManagement")}>
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
            {isOwner && (() => {
              const totalAssign = (seasonAdmins || []).length;
              const seasonsWithAdmins = new Set((seasonAdmins || []).map(sa => sa.season_id)).size;
              return (
                <button className="crow" onClick={() => setSidebarView("seasonAdmins")}>
                  <div className="cricon"><Icon name="players" size={16} color="var(--accent)" /></div>
                  <div className="crbody">
                    <div className="crtitle">Season Admins</div>
                    <div className="crsub">
                      {totalAssign === 0
                        ? 'No season admins assigned'
                        : `${totalAssign} assignment${totalAssign === 1 ? '' : 's'} across ${seasonsWithAdmins} season${seasonsWithAdmins === 1 ? '' : 's'}`}
                    </div>
                  </div>
                  <div className="crchev"><Icon name="chevron" size={16} color="var(--muted-2)" /></div>
                </button>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
