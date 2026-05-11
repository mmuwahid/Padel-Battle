import React, { useMemo } from "react";
import Icon from "./Icon";

// S076 FT-15 C4: Pairs Leaderboard for pairs-format seasons.
// Spec from padelhub/planning/FT-15-pairs-leaderboard.md (v2 locked S072) +
// user-approved mockup public/mockup-ft15-pairs.html (Premier Padel broadcast
// style — 7-col table, no ELO column visible, podium with paired avatars).
//
// Columns: # / Pair (2-avatar + name + fallback) / MP / MW / ML / CW / EFF%
// MP = matches played, MW = wins, ML = losses, CW = current consecutive wins
// (streak), EFF% = MW/MP*100. ELO is held in pairs.elo (set 1500 default,
// recomputed by DB trigger) and not displayed in the table per user direction.
//
// Inputs:
//   pairs            — array of pair rows for the current season (already
//                      filtered by season_id at the App.jsx call site).
//   matches          — array of approved matches for the current season.
//   players          — full league players array (for avatar/name lookup).
//   getName(pid)     — shared helper for player display name.
//   onPairDrillIn    — optional; click handler when a pair card is tapped
//                      (future: drill into per-pair stats screen).
export function PairsRanking({ pairs, matches, players, getName, onPairDrillIn }) {
  const pairStats = useMemo(() => {
    if (!pairs || pairs.length === 0) return [];

    // Helper: detect whether a given pair owns a given team (uuid[2]).
    const teamIsPair = (team, pr) => {
      if (!team || team.length !== 2) return false;
      return (
        (team[0] === pr.player_a_id && team[1] === pr.player_b_id) ||
        (team[0] === pr.player_b_id && team[1] === pr.player_a_id)
      );
    };

    // Build per-pair stats by scanning approved matches.
    const sortedMatches = [...(matches || [])].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return pairs.map((pr) => {
      let mp = 0, mw = 0, ml = 0, cw = 0;
      let streakBroken = false;
      for (const m of sortedMatches) {
        const onA = teamIsPair(m.team_a, pr);
        const onB = teamIsPair(m.team_b, pr);
        if (!onA && !onB) continue;
        mp++;
        const setsA = (m.sets || []).reduce(
          (acc, [a, b]) => acc + (a > b ? 1 : 0),
          0
        );
        const setsB = (m.sets || []).reduce(
          (acc, [a, b]) => acc + (b > a ? 1 : 0),
          0
        );
        const won = (onA && setsA > setsB) || (onB && setsB > setsA);
        if (won) mw++; else ml++;
        if (!streakBroken) {
          if (won) cw++;
          else streakBroken = true;
        }
      }
      const eff = mp > 0 ? Math.round((mw / mp) * 100) : 0;
      return {
        ...pr,
        mp, mw, ml, cw, eff,
      };
    }).sort((a, b) => {
      // Sort by EFF% desc, then MW desc, then ELO desc (tiebreakers).
      if (b.eff !== a.eff) return b.eff - a.eff;
      if (b.mw !== a.mw) return b.mw - a.mw;
      return (b.elo || 1500) - (a.elo || 1500);
    });
  }, [pairs, matches]);

  const pInit = (pid) => (getName ? getName(pid) : "?").charAt(0).toUpperCase();
  const pairDisplayName = (pr) => {
    const aN = getName ? getName(pr.player_a_id) : "?";
    const bN = getName ? getName(pr.player_b_id) : "?";
    const fallback = `${aN} / ${bN}`;
    return pr.name ? pr.name : fallback;
  };
  const pairSubName = (pr) => {
    if (!pr.name) return null;
    const aN = getName ? getName(pr.player_a_id) : "?";
    const bN = getName ? getName(pr.player_b_id) : "?";
    return `${aN} / ${bN}`;
  };

  if (!pairs || pairs.length === 0) {
    return (
      <div className="prk-empty">
        <Icon name="trophy" size={32} color="var(--muted)" />
        <div className="prk-empty-t">No pairs registered yet</div>
        <div className="prk-empty-s">
          Pairs-format seasons need at least 2 registered pairs before matches
          can be logged. Admins can add pairs in Season Management.
        </div>
      </div>
    );
  }

  // Podium — top 3 pairs by EFF% (with min MP guard later if needed).
  const podium = pairStats.slice(0, 3);

  return (
    <div className="prk">
      {/* Podium (top 3 pairs) */}
      {podium.length >= 3 && (
        <div className="prk-podium">
          <div className="prk-pod pod p2" onClick={() => onPairDrillIn && onPairDrillIn(podium[1])}>
            <div className="prk-podh">2</div>
            <div className="prk-podavi">
              <div className="prk-avi">{pInit(podium[1].player_a_id)}</div>
              <div className="prk-avi">{pInit(podium[1].player_b_id)}</div>
            </div>
            <div className="prk-podname">{pairDisplayName(podium[1])}</div>
            <div className="prk-podwl">
              <span style={{color:"var(--win)"}}>{podium[1].mw}W</span>
              <span style={{color:"var(--loss)"}}>{podium[1].ml}L</span>
            </div>
            <div className="prk-podpct">{podium[1].eff}%</div>
          </div>

          <div className="prk-pod pod p1" onClick={() => onPairDrillIn && onPairDrillIn(podium[0])}>
            <div className="prk-podh">1</div>
            <div className="prk-podavi">
              <div className="prk-avi">{pInit(podium[0].player_a_id)}</div>
              <div className="prk-avi">{pInit(podium[0].player_b_id)}</div>
            </div>
            <div className="prk-podname">{pairDisplayName(podium[0])}</div>
            <div className="prk-podwl">
              <span style={{color:"var(--win)"}}>{podium[0].mw}W</span>
              <span style={{color:"var(--loss)"}}>{podium[0].ml}L</span>
            </div>
            <div className="prk-podpct">{podium[0].eff}%</div>
          </div>

          <div className="prk-pod pod p3" onClick={() => onPairDrillIn && onPairDrillIn(podium[2])}>
            <div className="prk-podh">3</div>
            <div className="prk-podavi">
              <div className="prk-avi">{pInit(podium[2].player_a_id)}</div>
              <div className="prk-avi">{pInit(podium[2].player_b_id)}</div>
            </div>
            <div className="prk-podname">{pairDisplayName(podium[2])}</div>
            <div className="prk-podwl">
              <span style={{color:"var(--win)"}}>{podium[2].mw}W</span>
              <span style={{color:"var(--loss)"}}>{podium[2].ml}L</span>
            </div>
            <div className="prk-podpct">{podium[2].eff}%</div>
          </div>
        </div>
      )}

      {/* Table — 7 columns per user-approved mockup */}
      <div className="prk-tbl">
        <div className="prk-trow prk-thead">
          <div className="prk-cell prk-c-num">#</div>
          <div className="prk-cell prk-c-pair">Pair</div>
          <div className="prk-cell prk-c-stat">MP</div>
          <div className="prk-cell prk-c-stat">MW</div>
          <div className="prk-cell prk-c-stat">ML</div>
          <div className="prk-cell prk-c-stat">CW</div>
          <div className="prk-cell prk-c-eff">EFF%</div>
        </div>
        {pairStats.map((pr, i) => (
          <div
            key={pr.id}
            className={`prk-trow${i === 0 ? " prk-r1" : i === 1 ? " prk-r2" : i === 2 ? " prk-r3" : ""}`}
            onClick={() => onPairDrillIn && onPairDrillIn(pr)}
          >
            <div className="prk-cell prk-c-num">{i + 1}</div>
            <div className="prk-cell prk-c-pair">
              <div className="prk-pairavis">
                <div className="prk-avi">{pInit(pr.player_a_id)}</div>
                <div className="prk-avi">{pInit(pr.player_b_id)}</div>
              </div>
              <div className="prk-pairmeta">
                <div className="prk-pairtit">{pairDisplayName(pr)}</div>
                {pairSubName(pr) && <div className="prk-pairsub">{pairSubName(pr)}</div>}
              </div>
            </div>
            <div className="prk-cell prk-c-stat">{pr.mp}</div>
            <div className="prk-cell prk-c-stat" style={{color: pr.mw > 0 ? "var(--win)" : "var(--muted)"}}>{pr.mw}</div>
            <div className="prk-cell prk-c-stat" style={{color: pr.ml > 0 ? "var(--loss)" : "var(--muted)"}}>{pr.ml}</div>
            <div className="prk-cell prk-c-stat">{pr.cw}</div>
            <div className="prk-cell prk-c-eff">{pr.eff}%</div>
          </div>
        ))}
      </div>

      {pairStats.length > 0 && pairStats.every(p => p.mp === 0) && (
        <div className="prk-note">
          <Icon name="info" size={14} color="rgba(245,158,11,.85)" />
          <span>No matches logged yet. Pair stats will populate as matches are recorded.</span>
        </div>
      )}
    </div>
  );
}
