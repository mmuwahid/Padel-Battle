import React, { useMemo } from "react";
import Icon from "./Icon";
import { flagEmoji, formatDate } from "../utils/helpers";

// Issue #92 — Pair Stats drill-in screen.
// Mirrors PlayerStats drill-in for the pair-format world. Renders when the
// user taps a card on <PairsList> in a pairs-format season.
//
// Props:
//   pair         — selected pair row
//   pairs        — all pairs for this season (for best/worst opponent lookup)
//   matches      — approved matches for this season
//   players      — full league players
//   getName      — display-name helper
//   season       — current season row (for hero subtitle)
//   onBack()     — close handler
export function PairStats({ pair, pairs, matches, players, getName, season, onBack }) {
  const playerById = useMemo(() => {
    const m = new Map();
    for (const p of players || []) m.set(p.id, p);
    return m;
  }, [players]);

  const teamIsPair = (team, pr) => {
    if (!team || team.length !== 2) return false;
    return (
      (team[0] === pr.player_a_id && team[1] === pr.player_b_id) ||
      (team[0] === pr.player_b_id && team[1] === pr.player_a_id)
    );
  };
  const resolveOppPair = (team) => {
    if (!team || team.length !== 2) return null;
    for (const pr of pairs || []) {
      if (teamIsPair(team, pr)) return pr;
    }
    return null;
  };

  // Pair-scoped matches sorted newest-first
  const pairMatches = useMemo(() => {
    if (!pair) return [];
    return (matches || []).filter(m => teamIsPair(m.team_a, pair) || teamIsPair(m.team_b, pair))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [pair, matches]);

  const stats = useMemo(() => {
    if (!pair) return { mp:0, mw:0, ml:0, eff:0, setDiff:0, motm:0, bestStreak:0, comebacks:0, perfectSet:false, bestOpp:null, worstOpp:null };
    let mp = 0, mw = 0, ml = 0, setsForUs = 0, setsAgainstUs = 0;
    let comebacks = 0, perfectSet = false;
    let bestStreak = 0;
    let motm = 0;
    const oppRecord = new Map();
    const chronological = [...pairMatches].sort((a, b) => new Date(a.date) - new Date(b.date));
    let curStreak = 0;
    for (const m of chronological) {
      const onA = teamIsPair(m.team_a, pair);
      const onB = teamIsPair(m.team_b, pair);
      if (!onA && !onB) continue;
      mp++;
      const sets = m.sets || [];
      const setsA = sets.reduce((acc, [a, b]) => acc + (a > b ? 1 : 0), 0);
      const setsB = sets.reduce((acc, [a, b]) => acc + (b > a ? 1 : 0), 0);
      const ourSets = onA ? setsA : setsB;
      const oppSets = onA ? setsB : setsA;
      setsForUs += ourSets;
      setsAgainstUs += oppSets;
      const won = ourSets > oppSets;
      const lost = oppSets > ourSets;
      if (won) {
        mw++;
        curStreak++;
        if (curStreak > bestStreak) bestStreak = curStreak;
      } else if (lost) {
        ml++;
        curStreak = 0;
      }
      if (won && sets.length > 0) {
        const [s1a, s1b] = sets[0];
        const s1OurScore = onA ? s1a : s1b;
        const s1OppScore = onA ? s1b : s1a;
        if (s1OurScore < s1OppScore) comebacks++;
      }
      for (const [a, b] of sets) {
        const ourGames = onA ? a : b;
        const oppGames = onA ? b : a;
        if (ourGames === 6 && oppGames === 0) { perfectSet = true; break; }
      }
      if (m.motm === pair.player_a_id || m.motm === pair.player_b_id) motm++;
      const oppTeam = onA ? m.team_b : m.team_a;
      const oppPair = resolveOppPair(oppTeam);
      if (oppPair) {
        const cur = oppRecord.get(oppPair.id) || { pair: oppPair, mp: 0, mw: 0, ml: 0 };
        cur.mp++;
        if (won) cur.mw++;
        else if (lost) cur.ml++;
        oppRecord.set(oppPair.id, cur);
      }
    }
    const eff = mp > 0 ? Math.round((mw / mp) * 100) : 0;
    const setDiff = setsForUs - setsAgainstUs;
    const oppArr = Array.from(oppRecord.values());
    const sortedByOurWinRate = [...oppArr].sort((a, b) => (b.mw / b.mp) - (a.mw / a.mp) || b.mp - a.mp);
    const sortedByOurLossRate = [...oppArr].sort((a, b) => (b.ml / b.mp) - (a.ml / a.mp) || b.mp - a.mp);
    const bestOpp = sortedByOurWinRate[0] || null;
    const worstOpp = sortedByOurLossRate[0] || null;
    return { mp, mw, ml, eff, setDiff, motm, bestStreak, comebacks, perfectSet, bestOpp, worstOpp };
  }, [pair, pairMatches, pairs]);

  if (!pair) return null;

  const pa = playerById.get(pair.player_a_id);
  const pb = playerById.get(pair.player_b_id);
  const nameA = pa ? (pa.nickname || pa.name) : getName(pair.player_a_id);
  const nameB = pb ? (pb.nickname || pb.name) : getName(pair.player_b_id);
  const displayName = pair.name && pair.name.trim() ? pair.name : `${nameA} / ${nameB}`;

  const last5 = pairMatches.slice(0, 5).map((m) => {
    const onA = teamIsPair(m.team_a, pair);
    const setsA = (m.sets || []).reduce((acc, [a, b]) => acc + (a > b ? 1 : 0), 0);
    const setsB = (m.sets || []).reduce((acc, [a, b]) => acc + (b > a ? 1 : 0), 0);
    const ourSets = onA ? setsA : setsB;
    const oppSets = onA ? setsB : setsA;
    return ourSets > oppSets ? "W" : (oppSets > ourSets ? "L" : "-");
  });

  const ach = {
    firstWin:    stats.mw >= 1,
    fiveInARow:  stats.bestStreak >= 5,
    tenTogether: stats.mp >= 10,
    comeback:    stats.comebacks >= 1,
    tenWins:     stats.mw >= 10,
    perfectSet:  stats.perfectSet,
  };
  const earnedCount = Object.values(ach).filter(Boolean).length;

  return (
    <div className="pstat-screen" style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      <div className="back-btn-row">
        <button className="back-btn" onClick={onBack}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>

      <div className="dpro" style={{ padding: "0 18px 24px" }}>
        <div className="dpro-hero">
          <div className="dpair dpair-hero">
            <PairAvatar player={pa} fallbackLetter={nameA && nameA[0]} size={60} />
            <PairAvatar player={pb} fallbackLetter={nameB && nameB[0]} size={60} className="g" />
          </div>
          <div className="dpro-pn">{displayName}</div>
          {season && <div className="dpro-ppl">{season.name}{season.location ? ` · ${season.location}` : ""}</div>}
          <div className="dpro-flags">
            {pa && pa.country && <span className="dpro-flag"><span className="flag">{flagEmoji(pa.country)}</span> {pa.country}</span>}
            {pb && pb.country && <span className="dpro-flag"><span className="flag">{flagEmoji(pb.country)}</span> {pb.country}</span>}
          </div>
        </div>

        <div className="dpro-wr">
          <div className="dpro-wr-l">
            <span>Effectiveness</span>
            <span><b>{stats.eff}%</b></span>
          </div>
          <div className="dpro-bar">
            <div className="dpro-bar-fill" style={{ width: `${stats.eff}%` }} />
          </div>
        </div>

        <div className="mgrid mgrid-pair">
          <div className="mtile"><div className="v">{stats.mp}</div><div className="l">MP</div></div>
          <div className="mtile"><div className="v acc">{stats.mw}</div><div className="l">MW</div></div>
          <div className="mtile"><div className="v dg">{stats.ml}</div><div className="l">ML</div></div>
          <div className="mtile"><div className="v gd">{stats.bestStreak}</div><div className="l">Cons. W</div></div>
          <div className="mtile"><div className="v">{stats.setDiff > 0 ? `+${stats.setDiff}` : stats.setDiff}</div><div className="l">Set Diff</div></div>
          <div className="mtile"><div className="v gd">{stats.motm}</div><div className="l">MOTM</div></div>
        </div>

        {last5.length > 0 && (
          <>
            <div className="sec-h sec-h-pair">Last 5</div>
            <div className="form-strip form-strip-pair">
              {last5.map((r, i) => (
                <div key={i} className={`fdot ${r === "W" ? "w" : (r === "L" ? "l" : "")}`}>{r}</div>
              ))}
            </div>
          </>
        )}

        {stats.bestOpp && (
          <>
            <div className="sec-h sec-h-pair">Best Opponent</div>
            <OpponentCard rec={stats.bestOpp} playerById={playerById} getName={getName} variant="w" />
          </>
        )}

        {stats.worstOpp && stats.worstOpp.pair.id !== (stats.bestOpp && stats.bestOpp.pair.id) && (
          <>
            <div className="sec-h sec-h-pair">Worst Opponent</div>
            <OpponentCard rec={stats.worstOpp} playerById={playerById} getName={getName} variant="l" />
          </>
        )}

        <div className="sec-h sec-h-pair">
          Achievements <span style={{ float: "right", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 9 }}>{earnedCount} / 6</span>
        </div>
        <div className="ach-grid ach-grid-pair">
          <AchTile label="First Win"   earned={ach.firstWin}    color="var(--gold)" />
          <AchTile label="5 In A Row"  earned={ach.fiveInARow}  color="var(--accent)" />
          <AchTile label="10 Together" earned={ach.tenTogether} color="var(--pink)" />
          <AchTile label="Comeback"    earned={ach.comeback}    color="#7dd3fc" />
          <AchTile label="10 Wins"     earned={ach.tenWins}     color="var(--gold)" />
          <AchTile label="Perfect Set" earned={ach.perfectSet}  color="var(--accent)" />
        </div>

        {pairMatches.length > 0 && (
          <>
            <div className="sec-h sec-h-pair">Pair Match History</div>
            {pairMatches.slice(0, 5).map((m) => {
              const onA = teamIsPair(m.team_a, pair);
              const oppTeam = onA ? m.team_b : m.team_a;
              const oppPair = resolveOppPair(oppTeam);
              const oppPa = oppPair ? playerById.get(oppPair.player_a_id) : null;
              const oppPb = oppPair ? playerById.get(oppPair.player_b_id) : null;
              const oppName = oppPair
                ? (oppPair.name && oppPair.name.trim()
                  ? oppPair.name
                  : `${(oppPa && (oppPa.nickname || oppPa.name)) || getName(oppPair.player_a_id)} / ${(oppPb && (oppPb.nickname || oppPb.name)) || getName(oppPair.player_b_id)}`)
                : `${getName(oppTeam[0])} / ${getName(oppTeam[1])}`;
              const setsScore = (m.sets || []).map(([a, b]) => onA ? `${a}-${b}` : `${b}-${a}`).join(" · ");
              const setsA = (m.sets || []).reduce((acc, [a, b]) => acc + (a > b ? 1 : 0), 0);
              const setsB = (m.sets || []).reduce((acc, [a, b]) => acc + (b > a ? 1 : 0), 0);
              const won = (onA && setsA > setsB) || (!onA && setsB > setsA);
              return (
                <div key={m.id} className="mh-card">
                  <div className="mh-row">
                    <div className="mh-date">{formatDate(m.date)}</div>
                    <div className="mh-vs">vs <b>{oppName}</b></div>
                    <div className={`mh-score ${won ? "w" : "l"}`}>{setsScore}</div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function PairAvatar({ player, fallbackLetter, className, size }) {
  const cls = `av${className ? " " + className : ""}`;
  const style = size ? { width: size, height: size, fontSize: size * 0.36 } : undefined;
  if (player && player.avatar_url) {
    return (
      <div className={cls} style={{ ...style, overflow: "hidden", background: "var(--surface-2)" }}>
        <img src={player.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
      </div>
    );
  }
  return <div className={cls} style={style}>{(fallbackLetter || "?").toString().toUpperCase()}</div>;
}

function OpponentCard({ rec, playerById, getName, variant }) {
  const op = rec.pair;
  const opa = playerById.get(op.player_a_id);
  const opb = playerById.get(op.player_b_id);
  const nameA = opa ? (opa.nickname || opa.name) : getName(op.player_a_id);
  const nameB = opb ? (opb.nickname || opb.name) : getName(op.player_b_id);
  const displayName = op.name && op.name.trim() ? op.name : `${nameA} / ${nameB}`;
  return (
    <div className="opp-card">
      <div className="dpair">
        <PairAvatar player={opa} fallbackLetter={nameA && nameA[0]} />
        <PairAvatar player={opb} fallbackLetter={nameB && nameB[0]} className="g" />
      </div>
      <div className="opp-meta">
        <div className="pname">{displayName}</div>
        <div className="psub">Played {rec.mp} · {variant === "w" ? "Won" : "Lost"} {variant === "w" ? rec.mw : rec.ml}</div>
      </div>
      <div className={`opp-rec ${variant}`}>{rec.mw}–{rec.ml}</div>
    </div>
  );
}

function AchTile({ label, earned, color }) {
  return (
    <div className={`ach ${earned ? "earned" : "locked"}`}>
      <div className="ach-ico" style={earned ? { color } : undefined}>
        {earned ? <Icon name="star" size={14} color={color} /> : "✕"}
      </div>
      <div className="ach-nm">{label}</div>
    </div>
  );
}

export default PairStats;
