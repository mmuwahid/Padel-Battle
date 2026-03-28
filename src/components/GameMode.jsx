import React, { useState, useMemo } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, PU } from '../theme';
import { generateAmericanoSchedule, generateMexicanoRound } from '../utils/tournaments';

// ── Letter labels for auto-naming teams ──
const TEAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// ── SVG Bracket Generator ──
function BracketSVG({ bracket, getName, scores, onSaveScore }) {
  const rounds = bracket || [];
  if (!rounds.length) return null;

  const matchH = 48, matchGap = 16, slotH = 22, slotR = 6;
  const colW = 135, matchW = 110, lineColor = BD, padX = 4;

  const numRounds = rounds.length;
  const maxMatches = rounds[0]?.matches?.length || 1;
  const svgW = numRounds * colW + 20;
  const svgH = Math.max(maxMatches * (matchH + matchGap) + 60, 200);

  const roundLabels = numRounds === 1 ? ["FINAL"]
    : numRounds === 2 ? ["SEMIFINALS", "FINAL"]
    : numRounds === 3 ? ["QUARTERFINALS", "SEMIFINALS", "FINAL"]
    : rounds.map((_, i) => i === numRounds - 1 ? "FINAL" : `ROUND ${i + 1}`);

  // Compute Y positions for each match in each round
  const positions = [];
  for (let ri = 0; ri < numRounds; ri++) {
    const ms = rounds[ri]?.matches || [];
    const arr = [];
    if (ri === 0) {
      const totalH = ms.length * matchH + (ms.length - 1) * matchGap;
      const startY = (svgH - totalH) / 2 + 20;
      for (let mi = 0; mi < ms.length; mi++) {
        arr.push(startY + mi * (matchH + matchGap));
      }
    } else {
      // Center between the two source matches
      const prev = positions[ri - 1];
      for (let mi = 0; mi < ms.length; mi++) {
        const srcA = prev[mi * 2] ?? prev[prev.length - 1];
        const srcB = prev[mi * 2 + 1] ?? srcA;
        arr.push((srcA + srcB) / 2);
      }
    }
    positions.push(arr);
  }

  const elements = [];

  // Draw connecting lines
  for (let ri = 1; ri < numRounds; ri++) {
    const prevX = padX + (ri - 1) * colW + matchW;
    const curX = padX + ri * colW;
    const curMs = rounds[ri]?.matches || [];
    for (let mi = 0; mi < curMs.length; mi++) {
      const srcA = positions[ri - 1][mi * 2];
      const srcB = positions[ri - 1][mi * 2 + 1];
      const dst = positions[ri][mi];
      if (srcA != null) {
        const midYa = srcA + matchH / 2;
        const midX = prevX + (curX - prevX) / 2;
        elements.push(
          <line key={`la-${ri}-${mi}`} x1={prevX} y1={midYa} x2={midX} y2={midYa} stroke={lineColor} strokeWidth={1.5} />,
          <line key={`lav-${ri}-${mi}`} x1={midX} y1={midYa} x2={midX} y2={dst + matchH / 2} stroke={lineColor} strokeWidth={1.5} />
        );
      }
      if (srcB != null) {
        const midYb = srcB + matchH / 2;
        const midX = prevX + (curX - prevX) / 2;
        elements.push(
          <line key={`lb-${ri}-${mi}`} x1={prevX} y1={midYb} x2={midX} y2={midYb} stroke={lineColor} strokeWidth={1.5} />,
          <line key={`lbv-${ri}-${mi}`} x1={midX} y1={midYb} x2={midX} y2={dst + matchH / 2} stroke={lineColor} strokeWidth={1.5} />
        );
      }
      elements.push(
        <line key={`lc-${ri}-${mi}`} x1={prevX + (curX - prevX) / 2} y1={dst + matchH / 2} x2={curX} y2={dst + matchH / 2} stroke={lineColor} strokeWidth={1.5} />
      );
    }
  }

  // Draw rounds
  for (let ri = 0; ri < numRounds; ri++) {
    const x = padX + ri * colW;
    const ms = rounds[ri]?.matches || [];
    const isFinal = ri === numRounds - 1;
    const labelColor = isFinal ? GD : MT;

    elements.push(
      <text key={`rl-${ri}`} x={x + matchW / 2} y={positions[ri][0] - 10} fill={labelColor} fontFamily="Outfit" fontSize={9} fontWeight={isFinal ? 700 : 600} textAnchor="middle">
        {roundLabels[ri]}
      </text>
    );

    for (let mi = 0; mi < ms.length; mi++) {
      const m = ms[mi];
      const y = positions[ri][mi];
      const sc = scores[`${ri}-${mi}`];
      const teamAName = m.team_a ? m.team_a.filter(Boolean).map(pid => getName(pid)).join(" x ") : "TBD";
      const teamBName = m.team_b ? m.team_b.filter(Boolean).map(pid => getName(pid)).join(" x ") : "TBD";
      const isBye = !m.team_b;
      const hasScore = sc && sc.a != null && sc.b != null;
      const aWins = hasScore && sc.a > sc.b;
      const bWins = hasScore && sc.b > sc.a;
      const inProgress = !hasScore && !isBye && m.team_a && m.team_b;

      // Top slot (team A)
      const strokeA = aWins ? A : bWins ? BD : inProgress ? PU : isFinal ? GD : BD;
      elements.push(
        <rect key={`ra-${ri}-${mi}`} x={x} y={y} width={matchW} height={slotH} rx={slotR} fill={CD} stroke={strokeA} strokeWidth={inProgress || isFinal ? 1.5 : 1} />
      );
      elements.push(
        <text key={`ta-${ri}-${mi}`} x={x + 8} y={y + 15} fill={aWins ? A : bWins ? DG : TX} fontFamily="Outfit" fontSize={10} fontWeight={600} opacity={bWins ? 0.6 : 1}>
          {teamAName}
        </text>
      );
      if (hasScore) {
        elements.push(
          <text key={`sa-${ri}-${mi}`} x={x + matchW - 12} y={y + 15} fill={aWins ? A : DG} fontFamily="JetBrains Mono" fontSize={10} fontWeight={700} textAnchor="end" opacity={bWins ? 0.6 : 1}>
            {sc.a}
          </text>
        );
      } else if (!isBye) {
        elements.push(
          <text key={`sa-${ri}-${mi}`} x={x + matchW - 12} y={y + 15} fill={MT} fontFamily="JetBrains Mono" fontSize={10} fontWeight={600} textAnchor="end">{"\u2014"}</text>
        );
      }

      // Bottom slot (team B)
      const strokeB = bWins ? A : aWins ? BD : inProgress ? PU : isFinal ? GD : BD;
      elements.push(
        <rect key={`rb-${ri}-${mi}`} x={x} y={y + slotH + 2} width={matchW} height={slotH} rx={slotR} fill={CD} stroke={strokeB} strokeWidth={inProgress || isFinal ? 1.5 : 1} />
      );
      elements.push(
        <text key={`tb-${ri}-${mi}`} x={x + 8} y={y + slotH + 17} fill={bWins ? A : aWins ? DG : TX} fontFamily="Outfit" fontSize={10} fontWeight={600} opacity={aWins ? 0.6 : 1}>
          {isBye ? "BYE" : teamBName}
        </text>
      );
      if (hasScore) {
        elements.push(
          <text key={`sb-${ri}-${mi}`} x={x + matchW - 12} y={y + slotH + 17} fill={bWins ? A : DG} fontFamily="JetBrains Mono" fontSize={10} fontWeight={700} textAnchor="end" opacity={aWins ? 0.6 : 1}>
            {sc.b}
          </text>
        );
      } else if (!isBye) {
        elements.push(
          <text key={`sb-${ri}-${mi}`} x={x + matchW - 12} y={y + slotH + 17} fill={MT} fontFamily="JetBrains Mono" fontSize={10} fontWeight={600} textAnchor="end">{"\u2014"}</text>
        );
      }

      // Pulsing dot for in-progress matches
      if (inProgress) {
        elements.push(
          <circle key={`dot-${ri}-${mi}`} cx={x - 6} cy={y + matchH / 2} r={3} fill={PU}>
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
        );
      }

      // Trophy under final
      if (isFinal) {
        elements.push(
          <text key={`trophy-${ri}`} x={x + matchW / 2} y={y + matchH + 24} fill={GD} fontFamily="sans-serif" fontSize={20} textAnchor="middle">{"\uD83C\uDFC6"}</text>
        );
      }
    }
  }

  return (
    <div style={{ margin: "0 12px 16px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <svg width={svgW} height={svgH + 40} viewBox={`0 0 ${svgW} ${svgH + 40}`} style={{ display: "block" }}>
        {elements}
      </svg>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════
export function GameMode({ players, getName, supabase, leagueId, tournament, setTournament, sel }) {
  // ── State ──
  const [selPlayers, setSelP] = useState([]);
  const [courts, setCourts] = useState(2);
  const [ptsPerRound, setPPR] = useState(24);
  const [casualMode, setCasualMode] = useState("americano");
  const [topTab, setTopTab] = useState("casual"); // "casual" | "competitive"
  const [screen, setScreen] = useState("selector"); // "selector" | "se-setup" | "se-active" | "se-complete"
  const [tournamentName, setTournamentName] = useState("");
  const [seTeams, setSeTeams] = useState([
    { name: "Team A", p1: "", p2: "" },
    { name: "Team B", p1: "", p2: "" },
    { name: "Team C", p1: "", p2: "" },
    { name: "Team D", p1: "", p2: "" },
  ]);

  // ── Helpers ──
  const getTeamLabel = (idx) => TEAM_LETTERS[idx] ? `Team ${TEAM_LETTERS[idx]}` : `Team ${idx + 1}`;

  // ── Existing Americano / Mexicano logic (preserved from original) ──
  async function startCasualTournament() {
    if (selPlayers.length < 4) return;
    try {
      const scheduleData = {
        rounds: casualMode === "americano"
          ? generateAmericanoSchedule(selPlayers, courts)
          : [generateMexicanoRound(selPlayers, {}, courts)]
      };
      if (casualMode === "mexicano") scheduleData.rounds[0].round = 1;
      const { data, error } = await supabase.from("tournaments").insert({
        league_id: leagueId,
        date: new Date().toISOString().split("T")[0],
        mode: casualMode,
        players: selPlayers,
        courts,
        pts_per_round: ptsPerRound,
        schedule: scheduleData,
        scores: {},
        status: "active",
      }).select().single();
      if (error) throw error;
      setTournament(data);
    } catch (err) {
      console.error("Start tournament error:", err);
    }
  }

  async function recordScore(roundIdx, matchIdx, scoreA, scoreB) {
    const newScores = { ...tournament.scores, [`${roundIdx}-${matchIdx}`]: { a: scoreA, b: scoreB } };
    try {
      const { error } = await supabase.from("tournaments").update({ scores: newScores }).eq("id", tournament.id);
      if (error) throw error;
      setTournament({ ...tournament, scores: newScores });
    } catch (err) {
      console.error("Record score error:", err);
    }
  }

  function getPoints() {
    const pts = {};
    if (!tournament) return pts;
    tournament.players.forEach(p => { pts[p] = 0; });
    const rounds = tournament.schedule?.rounds || [];
    rounds.forEach((round, ri) => {
      const matches = round.matches || [];
      matches.forEach((match, mi) => {
        const key = `${ri}-${mi}`;
        const sc = tournament.scores[key];
        if (sc) {
          (match.teamA || []).forEach(p => { pts[p] = (pts[p] || 0) + sc.a; });
          (match.teamB || []).forEach(p => { pts[p] = (pts[p] || 0) + sc.b; });
        }
      });
    });
    return pts;
  }

  function getLeaderboard() {
    const pts = getPoints();
    return Object.entries(pts).sort((a, b) => b[1] - a[1]).map(([pid, points], i) => ({ pid, points, rank: i + 1 }));
  }

  async function nextMexicanoRound() {
    const pts = getPoints();
    const sorted = tournament.players.sort((a, b) => (pts[b] || 0) - (pts[a] || 0));
    const round = generateMexicanoRound(sorted, pts, tournament.courts);
    round.round = (tournament.schedule?.rounds?.length || 0) + 1;
    const newSchedule = { rounds: [...(tournament.schedule?.rounds || []), round] };
    try {
      const { error } = await supabase.from("tournaments").update({ schedule: newSchedule }).eq("id", tournament.id);
      if (error) throw error;
      setTournament({ ...tournament, schedule: newSchedule });
    } catch (err) {
      console.error("Next round error:", err);
    }
  }

  async function endTournament() {
    try {
      const { error } = await supabase.from("tournaments").update({ status: "complete" }).eq("id", tournament.id);
      if (error) throw error;
      setTournament({ ...tournament, status: "complete" });
    } catch (err) {
      console.error("End tournament error:", err);
    }
  }

  function resetTournament() {
    setTournament(null);
    setScreen("selector");
  }

  // ── Single Elimination helpers ──
  function addTeam() {
    const idx = seTeams.length;
    setSeTeams([...seTeams, { name: getTeamLabel(idx), p1: "", p2: "" }]);
  }

  function removeTeam(idx) {
    if (seTeams.length <= 2) return;
    const updated = seTeams.filter((_, i) => i !== idx);
    setSeTeams(updated);
  }

  function updateTeam(idx, field, value) {
    const updated = [...seTeams];
    updated[idx] = { ...updated[idx], [field]: value };
    setSeTeams(updated);
  }

  async function createSETournament() {
    const validTeams = seTeams.filter(t => t.p1 && t.p2);
    if (validTeams.length < 4) return;

    // Shuffle teams
    const shuffled = [...validTeams].sort(() => Math.random() - 0.5);
    const teamData = shuffled.map(t => ({ players: [t.p1, t.p2], name: t.name }));

    // Build bracket rounds
    let currentTeams = [...teamData];
    const rounds = [];
    let roundNum = 0;
    while (currentTeams.length > 1) {
      const matches = [];
      for (let i = 0; i < currentTeams.length - 1; i += 2) {
        matches.push({
          team_a: currentTeams[i].players,
          team_b: currentTeams[i + 1].players,
          team_a_name: currentTeams[i].name,
          team_b_name: currentTeams[i + 1].name,
          winner: null,
        });
      }
      if (currentTeams.length % 2 === 1) {
        matches.push({
          team_a: currentTeams[currentTeams.length - 1].players,
          team_b: null,
          team_a_name: currentTeams[currentTeams.length - 1].name,
          team_b_name: null,
          winner: "a",
        });
      }
      rounds.push({ round: roundNum, matches });
      currentTeams = matches.map(() => ({ players: null, name: "TBD" }));
      roundNum++;
    }

    const allPlayerIds = validTeams.flatMap(t => [t.p1, t.p2]);
    const scheduleData = { rounds, bracket: true, teams: validTeams.map(t => ({ name: t.name, players: [t.p1, t.p2] })) };

    try {
      const { data, error } = await supabase.from("tournaments").insert({
        league_id: leagueId,
        date: new Date().toISOString().split("T")[0],
        mode: "single_elimination",
        players: allPlayerIds,
        courts: 1,
        pts_per_round: 0,
        schedule: scheduleData,
        scores: {},
        status: "active",
        name: tournamentName || "Tournament",
      }).select().single();
      if (error) throw error;
      setTournament(data);
      setScreen("se-active");
    } catch (err) {
      console.error("Create SE tournament error:", err);
    }
  }

  // Advance winners in bracket after recording a score
  async function recordSEScore(roundIdx, matchIdx, scoreA, scoreB) {
    if (scoreA === scoreB) return; // No draws in elimination
    const newScores = { ...tournament.scores, [`${roundIdx}-${matchIdx}`]: { a: scoreA, b: scoreB } };

    // Advance winner to next round
    const rounds = tournament.schedule?.rounds || [];
    const match = rounds[roundIdx]?.matches?.[matchIdx];
    if (match && roundIdx + 1 < rounds.length) {
      const nextMatchIdx = Math.floor(matchIdx / 2);
      const slot = matchIdx % 2 === 0 ? "a" : "b";
      const winnerPlayers = scoreA > scoreB ? match.team_a : match.team_b;
      const winnerName = scoreA > scoreB ? match.team_a_name : match.team_b_name;
      const newRounds = JSON.parse(JSON.stringify(rounds));
      if (newRounds[roundIdx + 1]?.matches?.[nextMatchIdx]) {
        if (slot === "a") {
          newRounds[roundIdx + 1].matches[nextMatchIdx].team_a = winnerPlayers;
          newRounds[roundIdx + 1].matches[nextMatchIdx].team_a_name = winnerName;
        } else {
          newRounds[roundIdx + 1].matches[nextMatchIdx].team_b = winnerPlayers;
          newRounds[roundIdx + 1].matches[nextMatchIdx].team_b_name = winnerName;
        }
      }
      const newSchedule = { ...tournament.schedule, rounds: newRounds };
      try {
        const { error } = await supabase.from("tournaments").update({ scores: newScores, schedule: newSchedule }).eq("id", tournament.id);
        if (error) throw error;
        setTournament({ ...tournament, scores: newScores, schedule: newSchedule });
      } catch (err) {
        console.error("Record SE score error:", err);
      }
    } else {
      // Final round — just record score
      try {
        const { error } = await supabase.from("tournaments").update({ scores: newScores }).eq("id", tournament.id);
        if (error) throw error;
        setTournament({ ...tournament, scores: newScores });
      } catch (err) {
        console.error("Record SE score error:", err);
      }
    }
  }

  // SE Standings computation
  function getSEStandings() {
    if (!tournament?.schedule?.teams) return [];
    const teams = tournament.schedule.teams;
    const rounds = tournament.schedule?.rounds || [];
    const sc = tournament.scores || {};
    const stats = {};
    teams.forEach(t => { stats[t.name] = { name: t.name, players: t.players, wins: 0, losses: 0, eliminated: false, furthestRound: 0 }; });

    rounds.forEach((round, ri) => {
      (round.matches || []).forEach((m, mi) => {
        const key = `${ri}-${mi}`;
        const s = sc[key];
        if (s && m.team_a_name && m.team_b_name) {
          const wName = s.a > s.b ? m.team_a_name : m.team_b_name;
          const lName = s.a > s.b ? m.team_b_name : m.team_a_name;
          if (stats[wName]) { stats[wName].wins++; stats[wName].furthestRound = ri + 1; }
          if (stats[lName]) { stats[lName].losses++; stats[lName].eliminated = true; }
        }
      });
    });

    return Object.values(stats).sort((a, b) => {
      if (b.furthestRound !== a.furthestRound) return b.furthestRound - a.furthestRound;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });
  }

  // Check if SE tournament is complete
  function isSEComplete() {
    if (!tournament?.schedule?.rounds) return false;
    const rounds = tournament.schedule.rounds;
    const lastRound = rounds[rounds.length - 1];
    if (!lastRound?.matches?.length) return false;
    return lastRound.matches.every((_, mi) => tournament.scores[`${rounds.length - 1}-${mi}`]);
  }

  // ════════════════════════════════════
  // RENDER: Active Casual Tournament (Americano / Mexicano)
  // ════════════════════════════════════
  if (tournament && tournament.status === "active" && (tournament.mode === "americano" || tournament.mode === "mexicano")) {
    const leaderboard = getLeaderboard();
    const isMex = tournament.mode === "mexicano";
    const allRounds = tournament.schedule?.rounds || [];
    const totalMatches = allRounds.reduce((s, r) => s + (r.matches || []).length, 0);
    const scored = Object.keys(tournament.scores).length;
    const lastRoundDone = (() => { const ri = allRounds.length - 1; if (ri < 0) return false; const ms = allRounds[ri]?.matches || []; return ms.length > 0 && ms.every((_, mi) => tournament.scores[`${ri}-${mi}`]); })();

    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div><h2 style={{ fontSize: 18, fontWeight: 800 }}>{isMex ? "\uD83C\uDF2E Mexicano" : "\uD83C\uDFAF Americano"}</h2><p style={{ fontSize: 11, color: MT }}>{scored}/{totalMatches} scored · Round {allRounds.length} · {tournament.players.length} players</p></div>
          <button onClick={() => { if (confirm("End tournament?")) endTournament(); }} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${DG}40`, color: DG, background: "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>End</button>
        </div>

        <div style={{ background: CD, borderRadius: 14, border: `1px solid ${PU}30`, padding: 14, marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: PU, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Live Standings</h3>
          {leaderboard.map((p, i) => (
            <div key={p.pid} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderBottom: i < leaderboard.length - 1 ? `1px solid ${BD}20` : "none" }}>
              <span style={{ width: 24, fontSize: 14, fontWeight: 800, color: i < 3 ? [GD, SV, BZ][i] : TX, fontFamily: "'JetBrains Mono'" }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{getName(p.pid)}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? GD : A, fontFamily: "'JetBrains Mono'" }}>{p.points}</span>
            </div>
          ))}
        </div>

        {isMex && lastRoundDone && <button onClick={nextMexicanoRound} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${PU},${PU}cc)`, color: TX, fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 12, textTransform: "uppercase" }}>Generate Next Round</button>}

        {allRounds.map((round, ri) => {
          const matches = round.matches || [];
          return (
            <div key={ri} style={{ background: CD, borderRadius: 12, border: `1px solid ${BD}`, padding: 14, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Round {ri + 1}</h3>
                {round.sitting && <span style={{ fontSize: 11, color: MT, background: BD, padding: "2px 8px", borderRadius: 6 }}>Sitting: {getName(round.sitting)}</span>}
              </div>
              {matches.map((match, mi) => {
                const key = `${ri}-${mi}`;
                const sc = tournament.scores[key];
                const tA = match.teamA || [];
                const tB = match.teamB || [];
                return (
                  <div key={mi} style={{ marginBottom: mi < matches.length - 1 ? 10 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, textAlign: "right", color: sc ? (sc.a > sc.b ? A : TX) : TX }}>{tA.map(p => getName(p)).join(" x ")}</span>
                      <span style={{ color: MT, fontSize: 11, fontWeight: 700 }}>vs</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: sc ? (sc.b > sc.a ? A : TX) : TX }}>{tB.map(p => getName(p)).join(" x ")}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                      <input type="number" min="0" max={ptsPerRound} value={sc?.a || ""} placeholder="0"
                        onFocus={e => e.target.select()}
                        onChange={e => { const v = Math.min(+e.target.value || 0, ptsPerRound); recordScore(ri, mi, v, ptsPerRound - v); }}
                        style={{ width: 50, textAlign: "center", background: CD2, color: TX, border: `1px solid ${A}30`, borderRadius: 8, padding: "6px", fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono'", outline: "none" }} />
                      <span style={{ color: MT, fontWeight: 700, fontSize: 12 }}>-</span>
                      <input type="number" min="0" max={ptsPerRound} value={sc?.b || ""} placeholder="0"
                        onFocus={e => e.target.select()}
                        onChange={e => { const v = Math.min(+e.target.value || 0, ptsPerRound); recordScore(ri, mi, ptsPerRound - v, v); }}
                        style={{ width: 50, textAlign: "center", background: CD2, color: TX, border: `1px solid ${DG}30`, borderRadius: 8, padding: "6px", fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono'", outline: "none" }} />
                      {match.court && <span style={{ fontSize: 9, color: MT, marginLeft: 4 }}>Court {match.court}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // ════════════════════════════════════
  // RENDER: Active SE Tournament
  // ════════════════════════════════════
  if (tournament && tournament.status === "active" && tournament.mode === "single_elimination") {
    const rounds = tournament.schedule?.rounds || [];
    const standings = getSEStandings();
    const complete = isSEComplete();

    // If complete, show complete screen
    if (complete) {
      const champion = standings[0];
      const runnerUp = standings[1];

      return (
        <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
          {/* Champion Card */}
          <div style={{ margin: "0 0 16px", padding: 24, background: `linear-gradient(135deg, ${GD}14 0%, ${GD}05 100%)`, border: `2px solid ${GD}`, borderRadius: 18, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{"\uD83C\uDFC6"}</div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: GD, marginBottom: 4 }}>Champion</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: TX, marginBottom: 4 }}>{champion?.name || "TBD"}</div>
            <div style={{ fontSize: 12, color: MT }}>{champion?.players?.map(pid => getName(pid)).join(" x ") || ""}</div>
          </div>

          {/* Runner-up Card */}
          {runnerUp && (
            <div style={{ margin: "0 0 20px", padding: 16, background: `${SV}0a`, border: `1px solid ${SV}40`, borderRadius: 14, textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: SV, marginBottom: 4 }}>{"\uD83E\uDD48"} Runner-Up</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TX }}>{runnerUp.name}</div>
              <div style={{ fontSize: 11, color: MT, marginTop: 2 }}>{runnerUp.players?.map(pid => getName(pid)).join(" x ") || ""}</div>
            </div>
          )}

          {/* Final Standings Table */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Final Standings</h3>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", padding: "6px 10px" }}>#</th>
                  <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", padding: "6px 10px" }}>Team</th>
                  <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right", padding: "6px 10px" }}>Record</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((t, i) => {
                  const rankColor = i === 0 ? GD : i === 1 ? SV : i === 2 ? BZ : MT;
                  return (
                    <tr key={t.name}>
                      <td style={{ background: CD, padding: 10, fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: rankColor, borderRadius: "8px 0 0 8px" }}>{i + 1}</td>
                      <td style={{ background: CD, padding: 10, fontSize: 12, fontWeight: i === 0 ? 700 : i === 1 ? 600 : 500, color: i === 0 ? GD : i < 3 ? TX : MT }}>{t.name}</td>
                      <td style={{ background: CD, padding: 10, fontSize: 11, fontFamily: "'JetBrains Mono'", color: MT, textAlign: "right", borderRadius: "0 8px 8px 0" }}>{t.wins}W {t.losses}L</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button onClick={() => { setScreen("se-active"); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${BD}`, background: "transparent", color: TX, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>View Bracket</button>
            <button onClick={() => { endTournament(); resetTournament(); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: A, color: BG, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>New Tournament</button>
          </div>
        </div>
      );
    }

    // Active bracket view
    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        {/* Tournament Header */}
        <div style={{ margin: "0 0 16px", padding: 16, background: CD, border: `1px solid ${BD}`, borderRadius: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{tournament.name || "Tournament"}</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: `${GD}1a`, color: GD }}>{"\uD83C\uDFC6"} Single Elimination</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: `${A}1a`, color: A }}>{tournament.schedule?.teams?.length || 0} Teams</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: `${PU}1a`, color: PU }}>{new Date(tournament.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: `${DG}26`, color: DG, animation: "pulse 2s infinite" }}>{"\u25CF"} LIVE</span>
          </div>
        </div>

        {/* SVG Bracket */}
        <BracketSVG bracket={rounds} getName={getName} scores={tournament.scores || {}} onSaveScore={recordSEScore} />

        {/* Score Input for unscored matches */}
        {rounds.map((round, ri) => {
          const unscored = (round.matches || []).map((m, mi) => ({ m, mi })).filter(({ m, mi }) => !tournament.scores[`${ri}-${mi}`] && m.team_a && m.team_b);
          if (!unscored.length) return null;
          const numRounds = rounds.length;
          const roundLabel = numRounds === 1 ? "Final"
            : numRounds === 2 ? (ri === 0 ? "Semifinal" : "Final")
            : numRounds === 3 ? (ri === 0 ? "Quarterfinal" : ri === 1 ? "Semifinal" : "Final")
            : `Round ${ri + 1}`;
          return (
            <div key={ri} style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: PU, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${BD}` }}>Enter Scores — {roundLabel}</h3>
              {unscored.map(({ m, mi }) => (
                <div key={mi} style={{ background: CD, border: `1px solid ${PU}40`, borderRadius: 12, padding: 12, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.team_a_name || m.team_a?.filter(Boolean).map(pid => getName(pid)).join(" x ") || "TBD"}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{m.team_b_name || m.team_b?.filter(Boolean).map(pid => getName(pid)).join(" x ") || "TBD"}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                      <input type="number" min="0" placeholder="0" id={`se-a-${ri}-${mi}`} style={{ width: 44, padding: "4px", borderRadius: 6, border: `1px solid ${BD}`, background: CD2, color: TX, textAlign: "center", fontSize: 13, fontFamily: "'JetBrains Mono'" }} />
                      <input type="number" min="0" placeholder="0" id={`se-b-${ri}-${mi}`} style={{ width: 44, padding: "4px", borderRadius: 6, border: `1px solid ${BD}`, background: CD2, color: TX, textAlign: "center", fontSize: 13, fontFamily: "'JetBrains Mono'" }} />
                      <button onClick={() => {
                        const a = parseInt(document.getElementById(`se-a-${ri}-${mi}`).value) || 0;
                        const b = parseInt(document.getElementById(`se-b-${ri}-${mi}`).value) || 0;
                        if (a === b) return;
                        recordSEScore(ri, mi, a, b);
                      }} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: A, color: BG, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Save</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Live Standings */}
        <div style={{ margin: "0 0 20px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Live Standings</h3>
          {standings.map((t, i) => (
            <div key={t.name} style={{ display: "flex", alignItems: "center", padding: "10px 14px", background: CD, border: `1px solid ${BD}`, borderRadius: 10, marginBottom: 6, gap: 12 }}>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, fontWeight: 700, width: 24, textAlign: "center", color: i === 0 ? GD : i === 1 ? SV : i === 2 ? BZ : MT }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: t.eliminated ? MT : TX }}>{t.name}</span>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: MT }}>W{t.wins} L{t.losses}</span>
            </div>
          ))}
        </div>

        {/* End Tournament */}
        <button onClick={() => { if (confirm("End tournament?")) endTournament(); }} style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${DG}40`, background: "transparent", color: DG, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>End Tournament</button>
      </div>
    );
  }

  // ════════════════════════════════════
  // RENDER: Complete Casual Tournament Results
  // ════════════════════════════════════
  if (tournament && tournament.status === "complete" && (tournament.mode === "americano" || tournament.mode === "mexicano")) {
    const prevLb = getLeaderboard();
    const prevMode = tournament.mode;
    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: GD, marginBottom: 10 }}>{"\uD83C\uDFC6"} Last Tournament — {prevMode === "americano" ? "Americano" : "Mexicano"}</h3>
          {prevLb.map((p, i) => (
            <div key={p.pid} style={{ display: "flex", alignItems: "center", padding: "10px 12px", marginBottom: 4, background: CD, borderRadius: 10, border: `1px solid ${i === 0 ? `${GD}40` : BD}` }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: i < 3 ? [GD, SV, BZ][i] : TX, width: 28, fontFamily: "'JetBrains Mono'" }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{getName(p.pid)}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? GD : A, fontFamily: "'JetBrains Mono'" }}>{p.points}pts</span>
            </div>
          ))}
          <button onClick={resetTournament} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 10, border: `1px solid ${BD}`, background: "transparent", color: MT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Clear Results</button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════
  // RENDER: SE Setup Screen
  // ════════════════════════════════════
  if (screen === "se-setup") {
    const validTeams = seTeams.filter(t => t.p1 && t.p2);
    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        {/* Back button */}
        <button onClick={() => setScreen("selector")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: MT, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 12, padding: 0 }}>{"\u2190"} Back to formats</button>

        {/* Tournament Name */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Tournament Name</label>
          <input type="text" value={tournamentName} onChange={e => setTournamentName(e.target.value)} placeholder="Friday Night Showdown" style={{ width: "100%", padding: "12px 16px", background: CD, border: `1px solid ${BD}`, borderRadius: 12, color: TX, fontFamily: "Outfit, sans-serif", fontSize: 14, outline: "none" }} />
        </div>

        {/* Format Badge */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Format</label>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: `${GD}1a`, border: `1px solid ${GD}40`, borderRadius: 20, fontSize: 12, fontWeight: 600, color: GD }}>{"\uD83C\uDFC6"} Single Elimination</span>
        </div>

        {/* Teams */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Teams ({seTeams.length} registered)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {seTeams.map((team, idx) => (
              <div key={idx} style={{ background: CD, border: `1px solid ${BD}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <input type="text" value={team.name} onChange={e => updateTeam(idx, "name", e.target.value)} style={{ background: "transparent", border: "none", color: TX, fontSize: 13, fontWeight: 600, outline: "none", width: "60%" }} />
                  <button onClick={() => removeTeam(idx)} style={{ width: 28, height: 28, borderRadius: 8, background: `${DG}1a`, border: `1px solid ${DG}33`, color: DG, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={team.p1} onChange={e => updateTeam(idx, "p1", e.target.value)} style={{ ...sel, flex: 1, fontSize: 12 }}>
                    <option value="">Player 1</option>
                    {players.map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                  </select>
                  <select value={team.p2} onChange={e => updateTeam(idx, "p2", e.target.value)} style={{ ...sel, flex: 1, fontSize: 12 }}>
                    <option value="">Player 2</option>
                    {players.map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Add Team Button */}
          <button onClick={addTeam} style={{ width: "100%", padding: 12, background: CD2, border: `1px dashed ${BD}`, borderRadius: 12, color: MT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Team</button>
        </div>

        {/* Create Button */}
        <button onClick={createSETournament} disabled={validTeams.length < 4} style={{ width: "100%", padding: 14, background: validTeams.length >= 4 ? A : BD, border: "none", borderRadius: 14, color: validTeams.length >= 4 ? BG : MT, fontSize: 15, fontWeight: 700, cursor: validTeams.length >= 4 ? "pointer" : "not-allowed", marginBottom: 20 }}>
          Create Tournament {validTeams.length >= 4 ? `(${validTeams.length} teams)` : "(min 4 teams)"}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════
  // RENDER: Mode Selector (Default Screen)
  // ════════════════════════════════════
  return (
    <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{"\u26A1"} Game Mode</h2>
      <p style={{ fontSize: 12, color: MT, marginBottom: 16, lineHeight: 1.5 }}>Choose your format</p>

      {/* Top Toggle: Casual Play | Competitive Tournament */}
      <div style={{ display: "flex", margin: "0 0 16px", background: CD, borderRadius: 12, padding: 4, border: `1px solid ${BD}` }}>
        <button onClick={() => setTopTab("casual")} style={{ flex: 1, padding: "10px 0", fontFamily: "Outfit, sans-serif", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 9, cursor: "pointer", transition: "all 0.2s", background: topTab === "casual" ? A : "transparent", color: topTab === "casual" ? BG : MT }}>Casual Play</button>
        <button onClick={() => setTopTab("competitive")} style={{ flex: 1, padding: "10px 0", fontFamily: "Outfit, sans-serif", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 9, cursor: "pointer", transition: "all 0.2s", background: topTab === "competitive" ? A : "transparent", color: topTab === "competitive" ? BG : MT }}>Competitive Tournament</button>
      </div>

      {/* ── Casual Play Sub-Content ── */}
      {topTab === "casual" && (
        <div>
          {/* Americano Card */}
          <div onClick={() => { setCasualMode("americano"); }} style={{ background: CD, border: `1px solid ${casualMode === "americano" ? A : BD}`, borderRadius: 14, padding: 16, marginBottom: 12, cursor: "pointer", transition: "border-color 0.15s" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{"\uD83C\uDFAF"} Americano</h3>
            <p style={{ fontSize: 12, color: MT, lineHeight: 1.5 }}>Rotating partners — play with everyone. Points accumulate individually across rounds.</p>
            <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, marginTop: 8, background: `${A}1e`, color: A }}>Quick Session</span>
          </div>

          {/* Mexicano Card */}
          <div onClick={() => { setCasualMode("mexicano"); }} style={{ background: CD, border: `1px solid ${casualMode === "mexicano" ? PU : BD}`, borderRadius: 14, padding: 16, marginBottom: 16, cursor: "pointer", transition: "border-color 0.15s" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{"\uD83C\uDF2E"} Mexicano</h3>
            <p style={{ fontSize: 12, color: MT, lineHeight: 1.5 }}>Dynamic matchmaking based on standings. Balanced matches every round.</p>
            <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, marginTop: 8, background: `${PU}1e`, color: PU }}>Adaptive</span>
          </div>

          {/* Player Selection */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: MT, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Players ({selPlayers.length} selected)</div>
              <button onClick={() => setSelP(selPlayers.length === players.length ? [] : players.map(p => p.id))} style={{ background: "none", border: "none", color: A, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{selPlayers.length === players.length ? "Deselect All" : "Select All"}</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {players.map(p => { const on = selPlayers.includes(p.id); return (
                <button key={p.id} onClick={() => setSelP(on ? selPlayers.filter(x => x !== p.id) : [...selPlayers, p.id])} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${on ? A : BD}`, background: on ? `${A}15` : "transparent", color: on ? A : MT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{p.nickname || p.name}</button>
              ); })}
            </div>
          </div>

          {/* Courts & Points */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div><div style={{ fontSize: 11, color: MT, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Courts</div><select value={courts} onChange={e => setCourts(+e.target.value)} style={sel}>{[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
            <div><div style={{ fontSize: 11, color: MT, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Points / Round</div><select value={ptsPerRound} onChange={e => setPPR(+e.target.value)} style={sel}>{[16, 20, 24, 32].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
          </div>

          {/* Start Button */}
          <button onClick={startCasualTournament} disabled={selPlayers.length < 4} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: selPlayers.length >= 4 ? `linear-gradient(135deg,${PU},${PU}cc)` : BD, color: selPlayers.length >= 4 ? TX : MT, fontSize: 15, fontWeight: 800, cursor: selPlayers.length >= 4 ? "pointer" : "not-allowed", textTransform: "uppercase" }}>
            Start {casualMode === "americano" ? "Americano" : "Mexicano"} ({selPlayers.length} players)
          </button>
        </div>
      )}

      {/* ── Competitive Tournament Sub-Content ── */}
      {topTab === "competitive" && (
        <div>
          {/* Single Elimination */}
          <div onClick={() => setScreen("se-setup")} style={{ background: CD, border: `1px solid ${BD}`, borderRadius: 14, padding: 18, marginBottom: 12, cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{"\uD83C\uDFC6"}</span>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Single Elimination</h3>
            </div>
            <p style={{ fontSize: 12, color: GD, fontWeight: 600, marginBottom: 6, marginLeft: 34 }}>Lose once, you're out</p>
            <p style={{ fontSize: 11, color: MT, lineHeight: 1.6, marginLeft: 34 }}>Classic knockout bracket. Win to advance, lose and you're eliminated. High stakes, fast resolution. Best for 4-16 teams.</p>
          </div>

          {/* Double Elimination — Coming Soon */}
          <div style={{ background: CD, border: `1px solid ${BD}`, borderRadius: 14, padding: 18, marginBottom: 12, opacity: 0.7, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{"\uD83D\uDD04"}</span>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Double Elimination</h3>
            </div>
            <p style={{ fontSize: 12, color: GD, fontWeight: 600, marginBottom: 6, marginLeft: 34 }}>Two chances to compete</p>
            <p style={{ fontSize: 11, color: MT, lineHeight: 1.6, marginLeft: 34 }}>Winners and losers brackets. One loss sends you to the losers bracket. Two losses and you're out.</p>
            <span style={{ position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${PU}1e`, color: PU, textTransform: "uppercase", letterSpacing: 0.5 }}>Coming Soon</span>
          </div>

          {/* Round Robin — Coming Soon */}
          <div style={{ background: CD, border: `1px solid ${BD}`, borderRadius: 14, padding: 18, marginBottom: 12, opacity: 0.7, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{"\uD83D\uDCCA"}</span>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Round Robin</h3>
            </div>
            <p style={{ fontSize: 12, color: GD, fontWeight: 600, marginBottom: 6, marginLeft: 34 }}>Everyone plays everyone</p>
            <p style={{ fontSize: 11, color: MT, lineHeight: 1.6, marginLeft: 34 }}>All teams play each other. Final standings by wins, then point differential. Fairest format, most total matches.</p>
            <span style={{ position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${PU}1e`, color: PU, textTransform: "uppercase", letterSpacing: 0.5 }}>Coming Soon</span>
          </div>
        </div>
      )}
    </div>
  );
}
