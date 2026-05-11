import React, { useState } from "react";
import Icon from "./Icon";
import { useLeague } from "../LeagueContext";

// S077 r5: Season Admins management screen. Reached from
// LeagueManagement -> "Season Admins" nav row. Owner-only.
//
// Layout:
//   - Current assignments listed as cards (player avatar + name +
//     season name + revoke button).
//   - Add bottom-sheet: pick a season + pick a player (single dropdown
//     each, native select for OS-level type-ahead).
//
// User direction: searchable dropdown instead of full player toggle list
// so 30+ player leagues remain usable.
export function SeasonAdminsManagement({ setSidebarView, goBack }) {
  const {
    supabase, players, seasons, seasonAdmins, isOwner,
    showToast, loadLeagueData,
  } = useLeague();

  const [showAdd, setShowAdd] = useState(false);
  const [pickSeason, setPickSeason] = useState("");
  const [pickPlayer, setPickPlayer] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(null); // season_admins.id

  const sortedAssignments = [...(seasonAdmins || [])].sort((a, b) => {
    // Order by season name, then granted_at desc.
    const sa = (seasons || []).find(se => se.id === a.season_id);
    const sb = (seasons || []).find(se => se.id === b.season_id);
    const seasonCmp = (sa?.name || "").localeCompare(sb?.name || "");
    if (seasonCmp !== 0) return seasonCmp;
    return new Date(b.granted_at) - new Date(a.granted_at);
  });

  // For the "Add" picker: claimed players only (RPC refuses unclaimed).
  // Then filter out players already admin of the chosen season so we don't
  // offer to re-grant.
  const claimedPlayers = (players || []).filter(p => p.user_id);
  const availablePlayers = pickSeason
    ? claimedPlayers.filter(p => !(seasonAdmins || []).some(sa => sa.season_id === pickSeason && sa.player_id === p.id))
    : claimedPlayers;

  const openAdd = () => {
    setPickSeason(seasons?.[0]?.id || "");
    setPickPlayer("");
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!pickSeason || !pickPlayer) {
      showToast("Pick a season and a player", "error");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("grant_season_admin", {
        p_season_id: pickSeason,
        p_player_id: pickPlayer,
      });
      if (error) throw error;
      showToast("Season admin granted");
      setShowAdd(false);
      await loadLeagueData();
    } catch (err) {
      showToast(err.message || "Failed to grant", "error");
    }
    setBusy(false);
  };

  const handleRevoke = async (sa) => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("revoke_season_admin", {
        p_season_id: sa.season_id,
        p_player_id: sa.player_id,
      });
      if (error) throw error;
      showToast("Season admin revoked");
      setConfirmRevoke(null);
      await loadLeagueData();
    } catch (err) {
      showToast(err.message || "Failed to revoke", "error");
    }
    setBusy(false);
  };

  return (
    <div className="sm-screen">
      <div className="back-btn-row">
        <button className="back-btn" onClick={() => goBack ? goBack() : setSidebarView("leagueManagement")}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>

      <div className="ad-h">
        <div className="adey">League</div>
        <div className="adh1">Season Admins</div>
      </div>

      <div className="sm-body">
        {!isOwner && (
          <div className="sm-note">Owner-only. Only the league owner can assign season admins.</div>
        )}

        {isOwner && (
          <>
            <button className="pbtn pbtn-block" onClick={openAdd}>
              <Icon name="plus" size={16} strokeWidth={2.5} />Assign Season Admin
            </button>

            {sortedAssignments.length === 0 && (
              <div className="sm-empty">No season admins assigned yet.</div>
            )}

            {sortedAssignments.map(sa => {
              const player = (players || []).find(p => p.id === sa.player_id);
              const season = (seasons || []).find(se => se.id === sa.season_id);
              const isConfirm = confirmRevoke === sa.id;
              const initial = (player?.name || "?").charAt(0).toUpperCase();
              return (
                <div key={sa.id} className="sm-paircard">
                  <div className="sm-paircard-main">
                    {player?.avatar_url ? (
                      <img className="sm-pairavi sm-pairavi-img" src={player.avatar_url} alt="" />
                    ) : (
                      <div className="sm-pairavi">{initial}</div>
                    )}
                    <div className="sm-pairnames">
                      <div className="sm-pairnames-line1">{player?.name || "Unknown"}</div>
                      <div className="sm-pairnames-line2">{season?.name || "Unknown season"}</div>
                    </div>
                  </div>
                  <div className="sm-paircard-acts">
                    {isConfirm ? (
                      <>
                        <button className="dbtn" disabled={busy} onClick={() => handleRevoke(sa)}>
                          {busy ? "..." : "Revoke"}
                        </button>
                        <button className="gbtn ghost pair-iconbtn" aria-label="Cancel" onClick={() => setConfirmRevoke(null)}>
                          <Icon name="close" size={14} />
                        </button>
                      </>
                    ) : (
                      <button className="dbtn pair-iconbtn" aria-label="Revoke" title="Revoke" onClick={() => setConfirmRevoke(sa.id)}>
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {showAdd && (
        <div className="overlay" onClick={() => !busy && setShowAdd(false)}>
          <div className="bsheet" onClick={(e) => e.stopPropagation()}>
            <div className="shdl" />
            <div className="shhdr">
              <div className="shtitle">Assign Season Admin</div>
              <button className="shclose" onClick={() => setShowAdd(false)}><Icon name="close" size={14} /></button>
            </div>
            <div className="shbody">
              <div className="shf">
                <div className="shlbl"><Icon name="calendar" size={12} color="var(--muted)" />Season</div>
                <select className="shsel" value={pickSeason} onChange={(e) => { setPickSeason(e.target.value); setPickPlayer(""); }}>
                  <option value="">— Pick season —</option>
                  {(seasons || []).map(se => (
                    <option key={se.id} value={se.id}>{se.name}{se.active ? " (active)" : ""}</option>
                  ))}
                </select>
              </div>
              <div className="shf">
                <div className="shlbl"><Icon name="players" size={12} color="var(--muted)" />Player</div>
                <select className="shsel" value={pickPlayer} onChange={(e) => setPickPlayer(e.target.value)} disabled={!pickSeason}>
                  <option value="">{pickSeason ? "— Pick player —" : "Pick a season first —"}</option>
                  {availablePlayers.map(pl => (
                    <option key={pl.id} value={pl.id}>{pl.name}{pl.nickname ? ` (${pl.nickname})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="inote">
                <Icon name="info" size={14} color="rgba(74,222,128,.85)" />
                <div className="inotet">Season admins can rename, edit roster, end, and manage pairs for the assigned season only. League admins do NOT inherit this power automatically.</div>
              </div>
            </div>
            <div className="shact">
              <button className="shcancel" onClick={() => setShowAdd(false)} disabled={busy}>Cancel</button>
              <button className="shsubmit" onClick={handleAdd} disabled={busy || !pickSeason || !pickPlayer}>{busy ? "..." : "Assign"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
