import React, { useMemo, useState } from "react";
import Icon from "./Icon";
import { flagEmoji } from "../utils/helpers";

// Issue #92 — Players-tab content for pairs-format seasons.
// Replaces PlayerStats entirely when selectedSeason.format === 'pairs'.
//
// Top-level toggle: Pairs / Analytics
//   Pairs view: registered pair cards sorted by EFF%, tap → drill-in
//   Analytics view: 4 sub-tabs — League / H2H / Synergy / Insights — all
//     pair-aware. Mirrors PlayerStats' internal seg/seg-4 structure so the
//     UX feels consistent across formats.
//
// Props:
//   pairs          — pairs filtered to the current season
//   matches        — approved matches for this season (already format-isolated)
//   players        — full league players for lookups
//   getName        — display-name helper
//   onPairClick    — (pairId) => void; opens drill-in
export function PairsList({ pairs, matches, players, getName, onPairClick }) {
  const [subTab, setSubTab] = useState("pairs"); // "pairs" | "analytics"
  const [analyticsSection, setAnalyticsSection] = useState("league"); // league|h2h|synergy|insights
  const [h2hA, setH2hA] = useState("");
  const [h2hB, setH2hB] = useState("");

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

  // Compute per-pair stats (used by every analytics section)
  const pairStats = useMemo(() => {
    if (!pairs || pairs.length === 0) return [];
    return pairs.map((pr) => {
      let mp = 0, mw = 0, ml = 0;
      let setsForUs = 0, setsAgainstUs = 0;
      let tiebreaksWon = 0, tiebreaksLost = 0;
      let bestStreak = 0, curStreak = 0;
      let motm = 0;
      const chrono = (matches || []).filter(m => teamIsPair(m.team_a, pr) || teamIsPair(m.team_b, pr))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      for (const m of chrono) {
        const onA = teamIsPair(m.team_a, pr);
        const sets = m.sets || [];
        const setsA = sets.reduce((acc, [a, b]) => acc + (a > b ? 1 : 0), 0);
        const setsB = sets.reduce((acc, [a, b]) => acc + (b > a ? 1 : 0), 0);
        const ourSets = onA ? setsA : setsB;
        const oppSets = onA ? setsB : setsA;
        mp++;
        setsForUs += ourSets;
        setsAgainstUs += oppSets;
        for (const [a, b] of sets) {
          const ourG = onA ? a : b;
          const oppG = onA ? b : a;
          // tiebreak heuristic: 7-6 set
          if ((ourG === 7 && oppG === 6) || (oppG === 7 && ourG === 6)) {
            if (ourG > oppG) tiebreaksWon++; else tiebreaksLost++;
          }
        }
        if (ourSets > oppSets) {
          mw++;
          curStreak++;
          if (curStreak > bestStreak) bestStreak = curStreak;
        } else if (oppSets > ourSets) {
          ml++;
          curStreak = 0;
        }
        if (m.motm === pr.player_a_id || m.motm === pr.player_b_id) motm++;
      }
      const eff = mp > 0 ? Math.round((mw / mp) * 100) : 0;
      return { ...pr, mp, mw, ml, eff, setsForUs, setsAgainstUs, tiebreaksWon, tiebreaksLost, bestStreak, motm };
    });
  }, [pairs, matches]);

  // Ranked variants
  const byEff = useMemo(() => [...pairStats].sort((a, b) => {
    if (b.eff !== a.eff) return b.eff - a.eff;
    if (b.mw !== a.mw) return b.mw - a.mw;
    return b.mp - a.mp;
  }), [pairStats]);

  const byMatchesWon = useMemo(() => [...pairStats].sort((a, b) => {
    if (b.mw !== a.mw) return b.mw - a.mw;
    return b.eff - a.eff;
  }), [pairStats]);

  // Pair-vs-pair H2H when both selected
  const h2hRecord = useMemo(() => {
    if (!h2hA || !h2hB || h2hA === h2hB) return null;
    const pA = pairs.find(p => p.id === h2hA);
    const pB = pairs.find(p => p.id === h2hB);
    if (!pA || !pB) return null;
    let aWins = 0, bWins = 0;
    const matchList = [];
    for (const m of matches || []) {
      const aOnA = teamIsPair(m.team_a, pA);
      const aOnB = teamIsPair(m.team_b, pA);
      const bOnA = teamIsPair(m.team_a, pB);
      const bOnB = teamIsPair(m.team_b, pB);
      const isHead = (aOnA && bOnB) || (aOnB && bOnA);
      if (!isHead) continue;
      const sets = m.sets || [];
      const setsA = sets.reduce((acc, [a, b]) => acc + (a > b ? 1 : 0), 0);
      const setsB = sets.reduce((acc, [a, b]) => acc + (b > a ? 1 : 0), 0);
      const aWon = (aOnA && setsA > setsB) || (aOnB && setsB > setsA);
      const bWon = (bOnA && setsA > setsB) || (bOnB && setsB > setsA);
      if (aWon) aWins++;
      else if (bWon) bWins++;
      matchList.push({ m, aWon, bWon });
    }
    return { pA, pB, aWins, bWins, matches: matchList };
  }, [h2hA, h2hB, pairs, matches]);

  // Insights — derived from pairStats
  const insights = useMemo(() => {
    if (pairStats.length === 0) return null;
    const mostMP   = [...pairStats].sort((a, b) => b.mp - a.mp)[0];
    const mostMW   = [...pairStats].sort((a, b) => b.mw - a.mw)[0];
    const longest  = [...pairStats].sort((a, b) => b.bestStreak - a.bestStreak)[0];
    const mostMotm = [...pairStats].sort((a, b) => b.motm - a.motm)[0];
    return { mostMP, mostMW, longest, mostMotm };
  }, [pairStats]);

  // Empty state — no pairs registered yet
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

  const labelFor = (pr) => {
    if (!pr) return "";
    const pa = playerById.get(pr.player_a_id);
    const pb = playerById.get(pr.player_b_id);
    const nameA = pa ? (pa.nickname || pa.name) : getName(pr.player_a_id);
    const nameB = pb ? (pb.nickname || pb.name) : getName(pr.player_b_id);
    return pr.name && pr.name.trim() ? pr.name : `${nameA} / ${nameB}`;
  };

  return (
    <div className="plist" style={{ maxWidth: "600px", margin: "0 auto" }}>
      {/* Top toggle — Pairs / Analytics — matches PlayerStats .seg/.sb */}
      <div className="seg">
        {[["pairs","Pairs"],["analytics","Analytics"]].map(([k,l])=>(
          <button key={k} className={`sb${subTab===k?" on":""}`} onClick={()=>setSubTab(k)}>{l}</button>
        ))}
      </div>

      {subTab === "pairs" && (
        <>
          <div className="adsub" style={{ padding: "4px 18px 8px" }}>
            {byEff.length} {byEff.length === 1 ? "pair" : "pairs"}
          </div>
          <div style={{ padding: "0 18px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
            {byEff.map((pr) => {
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
                      <PairAvatar player={pa} fallbackLetter={nameA && nameA[0]} />
                      <PairAvatar player={pb} fallbackLetter={nameB && nameB[0]} className="g" />
                    </div>
                    <div className="pcard-mid">
                      <div className="pname">{displayName}</div>
                      <div className="psub">
                        {pa && pa.country && <span className="flag">{flagEmoji(pa.country)} {pa.country}</span>}
                        {pa && pa.country && pb && pb.country && <span> · </span>}
                        {pb && pb.country && <span className="flag">{flagEmoji(pb.country)} {pb.country}</span>}
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
        </>
      )}

      {subTab === "analytics" && (
        <div className="an-body" style={{ padding: "0 18px 24px" }}>
          {/* 4-section sub-tab bar */}
          <div className="seg-4">
            {[["league","trending-up","League"],["h2h","swords","H2H"],["synergy","users","Synergy"],["insights","bulb","Insights"]].map(([k,ic,l])=>(
              <button key={k} className={`sb-4${analyticsSection===k?" on":""}`} onClick={()=>setAnalyticsSection(k)}>
                <Icon name={ic} size={13}/>{l}
              </button>
            ))}
          </div>

          {/* LEAGUE — 7-col Pairs Standings (#/Pair/MP/MW/ML/CW/EFF%), top 5 */}
          {analyticsSection === "league" && (
            <div className="an-card-pair">
              <div className="an-card-h">Pair Standings <span style={{ float: "right", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 10 }}>top {Math.min(5, byMatchesWon.length)}</span></div>
              <div className="prk-table-pair">
                <div className="prk-h">#</div>
                <div className="prk-h">Pair</div>
                <div className="prk-h">MP</div>
                <div className="prk-h">MW</div>
                <div className="prk-h">ML</div>
                <div className="prk-h">CW</div>
                <div className="prk-h">EFF%</div>
                {byMatchesWon.slice(0, 5).map((pr, i) => {
                  const rankClass = i === 0 ? "gd" : (i === 1 ? "si" : (i === 2 ? "br" : ""));
                  const rowClass = i < 3 ? `prk-row-${i+1}` : "";
                  const pa = playerById.get(pr.player_a_id);
                  const pb = playerById.get(pr.player_b_id);
                  const nameA = pa ? (pa.nickname || pa.name) : getName(pr.player_a_id);
                  const nameB = pb ? (pb.nickname || pb.name) : getName(pr.player_b_id);
                  const dn = pr.name && pr.name.trim() ? pr.name : `${nameA} / ${nameB}`;
                  return (
                    <React.Fragment key={pr.id}>
                      <div className={`prk-c ${rankClass} ${rowClass}`}>{i+1}</div>
                      <div className={`prk-c pair-cell ${rowClass}`}>
                        <div className="dpair">
                          <PairAvatar player={pa} fallbackLetter={nameA && nameA[0]} small />
                          <PairAvatar player={pb} fallbackLetter={nameB && nameB[0]} className="g" small />
                        </div>
                        <span className="prk-pn">{dn}</span>
                      </div>
                      <div className={`prk-c ${rowClass}`}>{pr.mp}</div>
                      <div className={`prk-c mw ${rowClass}`}>{pr.mw}</div>
                      <div className={`prk-c ml ${rowClass}`}>{pr.ml}</div>
                      <div className={`prk-c ${rankClass} ${rowClass}`}>{pr.bestStreak}</div>
                      <div className={`prk-c eff ${rowClass}`}>{pr.eff}%</div>
                    </React.Fragment>
                  );
                })}
              </div>
              {byMatchesWon.length > 5 && (
                <div className="see-all-pair">Switch to the Ranking tab for the full leaderboard →</div>
              )}
            </div>
          )}

          {/* H2H — pair-vs-pair selector */}
          {analyticsSection === "h2h" && (
            <div className="an-card-pair">
              <div className="an-card-h">Pair vs Pair</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select aria-label="Pair A" className="pair-sel" value={h2hA} onChange={e => setH2hA(e.target.value)}>
                  <option value="">— Pair A —</option>
                  {pairs.map(pr => <option key={pr.id} value={pr.id}>{labelFor(pr)}</option>)}
                </select>
                <select aria-label="Pair B" className="pair-sel" value={h2hB} onChange={e => setH2hB(e.target.value)}>
                  <option value="">— Pair B —</option>
                  {pairs.map(pr => <option key={pr.id} value={pr.id}>{labelFor(pr)}</option>)}
                </select>
              </div>
              {h2hRecord ? (
                <div className="h2h-result">
                  <div className="h2h-tally">
                    <span className="h2h-name">{labelFor(h2hRecord.pA)}</span>
                    <span className="h2h-score">{h2hRecord.aWins} – {h2hRecord.bWins}</span>
                    <span className="h2h-name">{labelFor(h2hRecord.pB)}</span>
                  </div>
                  {h2hRecord.matches.length === 0 && (
                    <div className="h2h-empty">No matches played between these pairs yet.</div>
                  )}
                </div>
              ) : (
                <div className="h2h-hint">Pick two different pairs to see their record.</div>
              )}
            </div>
          )}

          {/* SYNERGY — per-pair cards with 4 metrics, sorted by Matches Won */}
          {analyticsSection === "synergy" && (
            <>
              <div className="syn-hint">
                Sorted by <b>Matches Won</b> ↓ · Sets Won · Matches Won · Tiebreaks · EFF%
              </div>
              {byMatchesWon.map((pr, i) => {
                const rankLabel = i === 0 ? "1st" : (i === 1 ? "2nd" : (i === 2 ? "3rd" : `${i+1}th`));
                const rankColor = i === 0 ? "var(--accent)" : "var(--muted)";
                return (
                  <div key={pr.id} className="an-card-pair">
                    <div className="an-card-h">
                      {labelFor(pr)}
                      <span style={{ float: "right", color: rankColor }}>{i === 0 ? "★ " : ""}{rankLabel}</span>
                    </div>
                    <div className="syn-row">
                      <div className="syn-cell"><div className="syn-v">{pr.setsForUs}/{pr.setsForUs + pr.setsAgainstUs}</div><div className="syn-l">SETS WON</div></div>
                      <div className="syn-cell"><div className="syn-v" style={{ color: "var(--accent)" }}>{pr.mw}/{pr.mp}</div><div className="syn-l">MATCHES WON</div></div>
                      <div className="syn-cell"><div className="syn-v">{pr.tiebreaksWon}/{pr.tiebreaksWon + pr.tiebreaksLost}</div><div className="syn-l">TIEBREAKS</div></div>
                      <div className="syn-cell"><div className="syn-v" style={{ color: pr.eff >= 60 ? "var(--accent)" : "var(--text)" }}>{pr.eff}%</div><div className="syn-l">EFF%</div></div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* INSIGHTS — pair-level superlatives */}
          {analyticsSection === "insights" && insights && (
            <>
              <InsightCard label="Most Active Pair"   title={labelFor(insights.mostMP)}   value={`${insights.mostMP.mp} matches`} />
              <InsightCard label="Most Matches Won"   title={labelFor(insights.mostMW)}   value={`${insights.mostMW.mw} wins`} />
              <InsightCard label="Longest Streak"     title={labelFor(insights.longest)}  value={`${insights.longest.bestStreak} in a row`} />
              <InsightCard label="MOTM Leader"        title={labelFor(insights.mostMotm)} value={`${insights.mostMotm.motm} MOTM`} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PairAvatar({ player, fallbackLetter, className, small }) {
  const cls = `av${className ? " " + className : ""}`;
  const style = small ? { width: 22, height: 22, fontSize: 9, borderWidth: 2 } : undefined;
  if (player && player.avatar_url) {
    return (
      <div className={cls} style={{ ...(style || {}), overflow: "hidden", background: "var(--surface-2)" }}>
        <img src={player.avatar_url} alt={player.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
      </div>
    );
  }
  return <div className={cls} style={style}>{(fallbackLetter || "?").toString().toUpperCase()}</div>;
}

function InsightCard({ label, title, value }) {
  return (
    <div className="an-card-pair insight-card">
      <div className="an-card-h">{label}</div>
      <div className="insight-row">
        <div className="insight-title">{title}</div>
        <div className="insight-value">{value}</div>
      </div>
    </div>
  );
}
