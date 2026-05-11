import React, { useMemo } from "react";
import { flagEmoji } from "../utils/helpers";

// Issue #92 — Players-tab content for pairs-format seasons.
// Replaces PlayerStats entirely when selectedSeason.format === 'pairs'.
// Shows the registered pairs ranked by EFF%, with paired-avatar cards.
// Tap → onPairClick(pairId) → drill into <PairStats>.
//
// Props:
//   pairs          — pairs filtered to the current season (from useLeague context)
//   matches        — approved matches for this season (already format-isolated upstream)
//   players        — full league players for lookups (avatar/name/country)
//   getName        — shared display-name helper
//   getPlayer(id)  — quick lookup for full player row
//   onPairClick    — (pairId) => void; opens drill-in
export function PairsList({ pairs, matches, players, getName, onPairClick }) {
  const playerById = useMemo(() => {
    const m = new Map();
    for (const p of players || []) m.set(p.id, p);
    return m;
  }, [players]);

  const pairStats = useMemo(() => {
    if (!pairs || pairs.length === 0) return [];
    const teamIsPair = (team, pr) => {
      if (!team || team.length !== 2) return false;
      return (
        (team[0] === pr.player_a_id && team[1] === pr.player_b_id) ||
        (team[0] === pr.player_b_id && team[1] === pr.player_a_id)
      );
    };
    return pairs.map((pr) => {
      let mp = 0, mw = 0, ml = 0;
      for (const m of (matches || [])) {
        const onA = teamIsPair(m.team_a, pr);
        const onB = teamIsPair(m.team_b, pr);
        if (!onA && !onB) continue;
        mp++;
        const setsA = (m.sets || []).reduce((acc, [a, b]) => acc + (a > b ? 1 : 0), 0);
        const setsB = (m.sets || []).reduce((acc, [a, b]) => acc + (b > a ? 1 : 0), 0);
        const won = (onA && setsA > setsB) || (onB && setsB > setsA);
        if (won) mw++; else if (setsA !== setsB) ml++;
      }
      const eff = mp > 0 ? Math.round((mw / mp) * 100) : 0;
      return { ...pr, mp, mw, ml, eff };
    }).sort((a, b) => {
      if (b.eff !== a.eff) return b.eff - a.eff;
      if (b.mw !== a.mw) return b.mw - a.mw;
      return b.mp - a.mp;
    });
  }, [pairs, matches]);

  if (!pairs || pairs.length === 0) {
    return (
      <div className="plist" style={{ padding: "40px 18px", textAlign: "center", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>
        <div style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--font)", fontWeight: 700, marginBottom: 6 }}>
          No pairs registered yet
        </div>
        An admin needs to add pairs in Season Management before they appear here.
      </div>
    );
  }

  return (
    <div className="plist">
      <div className="adsub" style={{ padding: "12px 18px 8px" }}>
        {pairStats.length} {pairStats.length === 1 ? "pair" : "pairs"}
      </div>
      <div style={{ padding: "0 18px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {pairStats.map((pr) => {
          const pa = playerById.get(pr.player_a_id);
          const pb = playerById.get(pr.player_b_id);
          const nameA = pa ? (pa.nickname || pa.name) : getName(pr.player_a_id);
          const nameB = pb ? (pb.nickname || pb.name) : getName(pr.player_b_id);
          const displayName = pr.name && pr.name.trim() ? pr.name : `${nameA} / ${nameB}`;
          return (
            <div
              key={pr.id}
              className="pcard"
              onClick={() => onPairClick && onPairClick(pr.id)}
              style={{ cursor: "pointer" }}
            >
              <div className="pcard-top">
                <div className="dpair">
                  <PairAvatar player={pa} fallbackLetter={nameA?.[0]} />
                  <PairAvatar player={pb} fallbackLetter={nameB?.[0]} className="g" />
                </div>
                <div className="pcard-mid">
                  <div className="pname">{displayName}</div>
                  <div className="psub">
                    {pa?.country && <span className="flag">{flagEmoji(pa.country)} {pa.country}</span>}
                    {pa?.country && pb?.country && <span> · </span>}
                    {pb?.country && <span className="flag">{flagEmoji(pb.country)} {pb.country}</span>}
                  </div>
                </div>
              </div>
              <div className="pcard-stats">
                <div className="pstat"><span className="lbl">MP</span><span className="val">{pr.mp}</span></div>
                <div className="pstat"><span className="lbl">MW</span><span className="val acc">{pr.mw}</span></div>
                <div className="pstat"><span className="lbl">ML</span><span className="val dg">{pr.ml}</span></div>
                <div className="pstat"><span className="lbl">EFF%</span><span className="val acc">{pr.eff}%</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PairAvatar({ player, fallbackLetter, className }) {
  const cls = `av${className ? " " + className : ""}`;
  if (player?.avatar_url) {
    return (
      <div className={cls} style={{ overflow: "hidden", background: "var(--surface-2)" }}>
        <img src={player.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
      </div>
    );
  }
  return <div className={cls}>{(fallbackLetter || "?").toString().toUpperCase()}</div>;
}

export default PairsList;
