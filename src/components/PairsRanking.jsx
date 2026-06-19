import React, { useMemo } from "react";
import Icon from "./Icon";
import { flagEmoji } from "../utils/helpers";

// S076 FT-15 C4 / S077 polish: Pairs Leaderboard for pairs-format seasons.
// Spec from padelhub/planning/FT-15-pairs-leaderboard.md (v2 locked S072) +
// user-approved mockup public/mockup-ft15-pairs.html + S077 smoke-test
// feedback (header renames, lowered podium threshold, vertical-stack rows
// with country flags, color-coded MP/MW/ML/CW matching individual leaderboard).
//
// Inputs:
//   pairs            \u2014 array of pair rows for the current season.
//   matches          \u2014 array of approved matches for the current season.
//   players          \u2014 full league players array (for avatar/name/country lookup).
//   getName(pid)     \u2014 shared helper for player display name.
//   onPairDrillIn    \u2014 optional click handler.
export function PairsRanking({ pairs, matches, players, getName, onPairDrillIn }) {
  const pairStats = useMemo(() => {
    if (!pairs || pairs.length === 0) return [];
    const teamIsPair = (team, pr) => {
      if (!team || team.length !== 2) return false;
      return (
        (team[0] === pr.player_a_id && team[1] === pr.player_b_id) ||
        (team[0] === pr.player_b_id && team[1] === pr.player_a_id)
      );
    };
    const sortedMatches = [...(matches || [])].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    return pairs.map((pr) => {
      let mp = 0, mw = 0, ml = 0, cw = 0;
      let streakBroken = false;
      const last5 = [];
      let motm_a = 0, motm_b = 0;
      for (const m of sortedMatches) {
        const onA = teamIsPair(m.team_a, pr);
        const onB = teamIsPair(m.team_b, pr);
        if (!onA && !onB) continue;
        mp++;
        const setsA = (m.sets || []).reduce((acc, [a, b]) => acc + (a > b ? 1 : 0), 0);
        const setsB = (m.sets || []).reduce((acc, [a, b]) => acc + (b > a ? 1 : 0), 0);
        const won = (onA && setsA > setsB) || (onB && setsB > setsA);
        if (won) mw++; else ml++;
        if (last5.length < 5) last5.push(won ? "W" : "L");
        if (m.motm === pr.player_a_id) motm_a++;
        if (m.motm === pr.player_b_id) motm_b++;
        if (!streakBroken) {
          if (won) cw++;
          else streakBroken = true;
        }
      }
      const eff = mp > 0 ? Math.round((mw / mp) * 100) : 0;
      return { ...pr, mp, mw, ml, cw, eff, last5, motm_a, motm_b };
    }).sort((a, b) => {
      if (b.eff !== a.eff) return b.eff - a.eff;
      if (b.mw !== a.mw) return b.mw - a.mw;
      return (b.elo || 1500) - (a.elo || 1500);
    });
  }, [pairs, matches]);

  // Helpers
  const playerOf = (pid) => (players || []).find(p => p.id === pid);
  const pInit = (pid) => {
    const p = playerOf(pid);
    return (p?.name || "?").charAt(0).toUpperCase();
  };
  const pName = (pid) => {
    const p = playerOf(pid);
    return p?.nickname || p?.name || "?";
  };
  const pAvatar = (pid) => {
    const p = playerOf(pid);
    return p?.avatar_url || null;
  };
  const pFlag = (pid) => {
    const p = playerOf(pid);
    return p?.country ? flagEmoji(p.country) : "";
  };
  const pairDisplayName = (pr) => pr.name || `${pName(pr.player_a_id)} / ${pName(pr.player_b_id)}`;

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

  // S077: lowered podium threshold so 1+ pair shows a podium-style top card.
  // 1 pair \u2192 just the gold pedestal; 2 pairs \u2192 gold + silver; 3+ \u2192 full 3-up.
  const podium = pairStats.slice(0, 3);
  const showPodium = podium.length >= 1;

  // Render a single podium card with stacked players (avatar + name + flag).
  const PodCard = ({ pr, rank, podClass }) => (
    <div className={`prk-pod pod ${podClass}`} onClick={() => onPairDrillIn && onPairDrillIn(pr)}>
      <div className="prk-podh">{rank}</div>
      <div className="prk-podstack">
        <div className="prk-podrow">
          {pAvatar(pr.player_a_id) ? (<img className="prk-avi prk-avi-img" src={pAvatar(pr.player_a_id)} alt=""/>) : (<div className="prk-avi">{pInit(pr.player_a_id)}</div>)}
          <div className="prk-podpname">
            <span className="prk-podpnamea">{pName(pr.player_a_id)}</span>
            {pFlag(pr.player_a_id) && <span className="prk-podflag">{pFlag(pr.player_a_id)}</span>}
          </div>
        </div>
        <div className="prk-podrow">
          {pAvatar(pr.player_b_id) ? (<img className="prk-avi prk-avi-img" src={pAvatar(pr.player_b_id)} alt=""/>) : (<div className="prk-avi">{pInit(pr.player_b_id)}</div>)}
          <div className="prk-podpname">
            <span className="prk-podpnamea">{pName(pr.player_b_id)}</span>
            {pFlag(pr.player_b_id) && <span className="prk-podflag">{pFlag(pr.player_b_id)}</span>}
          </div>
        </div>
      </div>
      <div className="prk-podwl">
        <span style={{color: pr.mw > 0 ? "var(--win)" : "var(--muted)"}}>{pr.mw}W</span>
        <span style={{color: pr.ml > 0 ? "var(--loss)" : "var(--muted)"}}>{pr.ml}L</span>
      </div>
      <div className="prk-podpct">{pr.eff}%</div>
    </div>
  );

  return (
    <div className="prk">
      {showPodium && (
        <div className={`prk-podium prk-podium-${podium.length}`}>
          {podium.length >= 2 && <PodCard pr={podium[1]} rank={2} podClass="p2" />}
          <PodCard pr={podium[0]} rank={1} podClass="p1" />
          {podium.length >= 3 && <PodCard pr={podium[2]} rank={3} podClass="p3" />}
        </div>
      )}

      {/* S077: table with renamed headers (Rank / Players) + stacked-row layout. */}
      <div className="prk-tbl">
        <div className="prk-trow prk-thead">
          <div className="prk-cell prk-c-num">Rank</div>
          <div className="prk-cell prk-c-pair">Players</div>
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
            {/* S077: stacked players \u2014 avatar + name + flag, one per row. */}
            <div className="prk-cell prk-c-pair">
              <div className="prk-pairstack">
                {pr.name && <div className="prk-pairname">{pr.name}</div>}
                <div className="prk-pairrow">
                  {pAvatar(pr.player_a_id) ? (<img className="prk-avi prk-avi-img" src={pAvatar(pr.player_a_id)} alt=""/>) : (<div className="prk-avi">{pInit(pr.player_a_id)}</div>)}
                  <span className="prk-pname">{pName(pr.player_a_id)}</span>
                  {pFlag(pr.player_a_id) && <span className="prk-pflag">{pFlag(pr.player_a_id)}</span>}
                </div>
                <div className="prk-pairrow">
                  {pAvatar(pr.player_b_id) ? (<img className="prk-avi prk-avi-img" src={pAvatar(pr.player_b_id)} alt=""/>) : (<div className="prk-avi">{pInit(pr.player_b_id)}</div>)}
                  <span className="prk-pname">{pName(pr.player_b_id)}</span>
                  {pFlag(pr.player_b_id) && <span className="prk-pflag">{pFlag(pr.player_b_id)}</span>}
                </div>
                <div className="prk-formstrip">
                  {pr.last5 && pr.last5.length > 0 ? [...pr.last5].reverse().map((r, k) => (
                    <span key={k} className={"fdot " + (r === "W" ? "w" : "l")} />
                  )) : (<span className="prk-formstrip-empty">no matches yet</span>)}
                </div>
              </div>
            </div>
            {/* S077: color-coded MP/MW/ML/CW matching individual leaderboard \u2014
                MP = neutral text, MW = green if >0 else muted, ML = red if >0 else
                muted, CW = green if streak >= 3 else neutral. */}
            <div className="prk-cell prk-c-stat">{pr.mp}</div>
            <div className="prk-cell prk-c-stat" style={{color: pr.mw > 0 ? "var(--win)" : "var(--muted)"}}>{pr.mw}</div>
            <div className="prk-cell prk-c-stat" style={{color: pr.ml > 0 ? "var(--loss)" : "var(--muted)"}}>{pr.ml}</div>
            <div className="prk-cell prk-c-stat" style={{color: pr.cw >= 3 ? "var(--win)" : "var(--text)"}}>{pr.cw}</div>
            <div className="prk-cell prk-c-eff">{pr.eff}%</div>
          </div>
        ))}
      </div>

      {(() => {
        if (pairStats.length === 0 || pairStats.every(p => p.mp === 0)) return null;
        const mostActive = [...pairStats].sort((a, b) => b.mp - a.mp)[0];
        const motmFlat = pairStats.flatMap(p => [
          { pid: p.player_a_id, count: p.motm_a },
          { pid: p.player_b_id, count: p.motm_b },
        ]).filter(x => x.count > 0).sort((a, b) => b.count - a.count);
        const motmLeader = motmFlat[0] || null;
        return (
          <div className="prk-awards">
            <div className="prk-awards-h">Awards</div>
            <div className="prk-awards-grid">
              <div className="prk-award-card">
                <div className="prk-award-l">Most Active Pair</div>
                <div className="prk-award-row">
                  <div className="prk-award-stack">
                    {pAvatar(mostActive.player_a_id) ? <img className="prk-avi prk-avi-img" src={pAvatar(mostActive.player_a_id)} alt=""/> : <div className="prk-avi">{pInit(mostActive.player_a_id)}</div>}
                    {pAvatar(mostActive.player_b_id) ? <img className="prk-avi prk-avi-img" src={pAvatar(mostActive.player_b_id)} alt=""/> : <div className="prk-avi">{pInit(mostActive.player_b_id)}</div>}
                  </div>
                  <div className="prk-award-meta">
                    <div className="prk-award-name">{pairDisplayName(mostActive)}</div>
                    <div className="prk-award-v">{mostActive.mp} matches</div>
                  </div>
                </div>
              </div>
              {motmLeader && (
                <div className="prk-award-card">
                  <div className="prk-award-l">MOTM Leader</div>
                  <div className="prk-award-row">
                    {pAvatar(motmLeader.pid) ? <img className="prk-avi prk-avi-img" src={pAvatar(motmLeader.pid)} alt=""/> : <div className="prk-avi">{pInit(motmLeader.pid)}</div>}
                    <div className="prk-award-meta">
                      <div className="prk-award-name">{pName(motmLeader.pid)}</div>
                      <div className="prk-award-v">{motmLeader.count} MOTM</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {pairStats.length > 0 && pairStats.every(p => p.mp === 0) && (
        <div className="prk-note">
          <Icon name="info" size={14} color="rgba(255, 215, 0,.85)" />
          <span>No matches logged yet. Pair stats will populate as matches are recorded.</span>
        </div>
      )}
    </div>
  );
}
