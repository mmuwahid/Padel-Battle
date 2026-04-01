import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, PU } from '../theme';
import { BracketSVG } from './BracketSVG';

const TEAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const getTeamLabel = (idx) => TEAM_LETTERS[idx] ? `Team ${TEAM_LETTERS[idx]}` : `Team ${idx + 1}`;

export function SingleElimination({ players, getName, supabase, leagueId, tournament, setTournament, sel, endTournament, resetTournament, deleteTournament, setScreen }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  // ── State ──
  const [tournamentName, setTournamentName] = useState("");
  const [seTeams, setSeTeams] = useState([
    { name: "Team A", p1: "", p2: "" },
    { name: "Team B", p1: "", p2: "" },
    { name: "Team C", p1: "", p2: "" },
    { name: "Team D", p1: "", p2: "" },
  ]);

  // ── Helpers ──
  function addTeam() {
    const idx = seTeams.length;
    setSeTeams([...seTeams, { name: getTeamLabel(idx), p1: "", p2: "" }]);
  }

  function removeTeam(idx) {
    if (seTeams.length <= 2) return;
    setSeTeams(seTeams.filter((_, i) => i !== idx));
  }

  function updateTeam(idx, field, value) {
    const updated = [...seTeams];
    updated[idx] = { ...updated[idx], [field]: value };
    setSeTeams(updated);
  }

  async function createSETournament() {
    const validTeams = seTeams.filter(t => t.p1 && t.p2);
    if (validTeams.length < 4) return;

    const shuffled = [...validTeams].sort(() => Math.random() - 0.5);
    const teamData = shuffled.map(t => ({ players: [t.p1, t.p2], name: t.name }));

    let currentTeams = [...teamData];
    const rounds = [];
    let roundNum = 0;
    while (currentTeams.length > 1) {
      const matches = [];
      for (let i = 0; i < currentTeams.length - 1; i += 2) {
        matches.push({
          team_a: currentTeams[i].players, team_b: currentTeams[i + 1].players,
          team_a_name: currentTeams[i].name, team_b_name: currentTeams[i + 1].name, winner: null,
        });
      }
      if (currentTeams.length % 2 === 1) {
        matches.push({
          team_a: currentTeams[currentTeams.length - 1].players, team_b: null,
          team_a_name: currentTeams[currentTeams.length - 1].name, team_b_name: null, winner: "a",
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
        league_id: leagueId, date: new Date().toISOString().split("T")[0], mode: "single_elimination",
        players: allPlayerIds, courts: 1, pts_per_round: 0, schedule: scheduleData, scores: {}, status: "active",
        name: tournamentName || "Tournament",
      }).select().single();
      if (error) throw error;
      setTournament(data);
      setScreen("se-active");
    } catch (err) { }
  }

  async function recordSEScore(roundIdx, matchIdx, scoreA, scoreB) {
    if (scoreA === scoreB) return;
    const newScores = { ...tournament.scores, [`${roundIdx}-${matchIdx}`]: { a: scoreA, b: scoreB } };

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
      } catch (err) { }
    } else {
      try {
        const { error } = await supabase.from("tournaments").update({ scores: newScores }).eq("id", tournament.id);
        if (error) throw error;
        setTournament({ ...tournament, scores: newScores });
      } catch (err) { }
    }
  }

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

  function isSEComplete() {
    if (!tournament?.schedule?.rounds) return false;
    const rounds = tournament.schedule.rounds;
    const lastRound = rounds[rounds.length - 1];
    if (!lastRound?.matches?.length) return false;
    return lastRound.matches.every((_, mi) => tournament.scores[`${rounds.length - 1}-${mi}`]);
  }

  // ════════════════════════════════════
  // RENDER: SE Setup Screen
  // ════════════════════════════════════
  if (!tournament || tournament.mode !== "single_elimination") {
    const validTeams = seTeams.filter(t => t.p1 && t.p2);
    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <button onClick={() => setScreen("selector")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: MT, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 12, padding: 0 }}>{"\u2190"} Back to formats</button>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Tournament Name</label>
          <input type="text" value={tournamentName} onChange={e => setTournamentName(e.target.value)} placeholder="Friday Night Showdown" style={{ width: "100%", padding: "12px 16px", background: CD, border: `1px solid ${BD}`, borderRadius: 12, color: TX, fontFamily: "Outfit, sans-serif", fontSize: 14, outline: "none" }} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Format</label>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: `${GD}1a`, border: `1px solid ${GD}40`, borderRadius: 20, fontSize: 12, fontWeight: 600, color: GD }}>{"\uD83C\uDFC6"} Single Elimination</span>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Teams ({seTeams.length} registered)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {seTeams.map((team, idx) => { const seAllSel = seTeams.flatMap(t => [t.p1, t.p2]).filter(Boolean); const p1O = seAllSel.filter(v => v !== team.p1); const p2O = seAllSel.filter(v => v !== team.p2); return (
              <div key={idx} style={{ background: CD, border: `1px solid ${BD}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <input type="text" value={team.name} onChange={e => updateTeam(idx, "name", e.target.value)} style={{ background: "transparent", border: "none", color: TX, fontSize: 13, fontWeight: 600, outline: "none", width: "60%" }} />
                  <button onClick={() => removeTeam(idx)} style={{ width: 28, height: 28, borderRadius: 8, background: `${DG}1a`, border: `1px solid ${DG}33`, color: DG, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={team.p1} onChange={e => updateTeam(idx, "p1", e.target.value)} style={{ ...sel, flex: 1, fontSize: 12 }}>
                    <option value="">Player 1</option>
                    {players.filter(p => !p1O.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                  </select>
                  <select value={team.p2} onChange={e => updateTeam(idx, "p2", e.target.value)} style={{ ...sel, flex: 1, fontSize: 12 }}>
                    <option value="">Player 2</option>
                    {players.filter(p => !p2O.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                  </select>
                </div>
              </div>
            ); })}
          </div>
          <button onClick={addTeam} style={{ width: "100%", padding: 12, background: CD2, border: `1px dashed ${BD}`, borderRadius: 12, color: MT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Team</button>
        </div>

        <button onClick={createSETournament} disabled={validTeams.length < 4} style={{ width: "100%", padding: 14, background: validTeams.length >= 4 ? A : BD, border: "none", borderRadius: 14, color: validTeams.length >= 4 ? BG : MT, fontSize: 15, fontWeight: 700, cursor: validTeams.length >= 4 ? "pointer" : "not-allowed", marginBottom: 20 }}>
          Create Tournament {validTeams.length >= 4 ? `(${validTeams.length} teams)` : "(min 4 teams)"}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════
  // RENDER: Active SE Tournament
  // ════════════════════════════════════
  const rounds = tournament.schedule?.rounds || [];
  const standings = getSEStandings();
  const complete = isSEComplete();

  if (complete) {
    const champion = standings[0];
    const runnerUp = standings[1];

    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ margin: "0 0 16px", padding: 24, background: `linear-gradient(135deg, ${GD}14 0%, ${GD}05 100%)`, border: `2px solid ${GD}`, borderRadius: 18, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{"\uD83C\uDFC6"}</div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: GD, marginBottom: 4 }}>Champion</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: TX, marginBottom: 4 }}>{champion?.name || "TBD"}</div>
          <div style={{ fontSize: 12, color: MT }}>{champion?.players?.map(pid => getName(pid)).join(" x ") || ""}</div>
        </div>

        {runnerUp && (
          <div style={{ margin: "0 0 20px", padding: 16, background: `${SV}0a`, border: `1px solid ${SV}40`, borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: SV, marginBottom: 4 }}>{"\uD83E\uDD48"} Runner-Up</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TX }}>{runnerUp.name}</div>
            <div style={{ fontSize: 11, color: MT, marginTop: 2 }}>{runnerUp.players?.map(pid => getName(pid)).join(" x ") || ""}</div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Final Standings</h3>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
            <thead><tr>
              <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", padding: "6px 10px" }}>#</th>
              <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", padding: "6px 10px" }}>Team</th>
              <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right", padding: "6px 10px" }}>Record</th>
            </tr></thead>
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
      <div style={{ margin: "0 0 16px", padding: 16, background: CD, border: `1px solid ${BD}`, borderRadius: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{tournament.name || "Tournament"}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: `${GD}1a`, color: GD }}>{"\uD83C\uDFC6"} Single Elimination</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: `${A}1a`, color: A }}>{tournament.schedule?.teams?.length || 0} Teams</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: `${PU}1a`, color: PU }}>{new Date(tournament.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: `${DG}26`, color: DG, animation: "pulse 2s infinite" }}>{"\u25CF"} LIVE</span>
        </div>
      </div>

      <BracketSVG bracket={rounds} getName={getName} scores={tournament.scores || {}} onSaveScore={recordSEScore} />

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
                    <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" placeholder="0" id={`se-a-${ri}-${mi}`} style={{ width: 44, padding: "4px", borderRadius: 6, border: `1px solid ${BD}`, background: CD2, color: TX, textAlign: "center", fontSize: 13, fontFamily: "'JetBrains Mono'" }} />
                    <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" placeholder="0" id={`se-b-${ri}-${mi}`} style={{ width: 44, padding: "4px", borderRadius: 6, border: `1px solid ${BD}`, background: CD2, color: TX, textAlign: "center", fontSize: 13, fontFamily: "'JetBrains Mono'" }} />
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

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { if (confirm("End tournament?")) endTournament(); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${DG}40`, background: "transparent", color: DG, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>End Tournament</button>
        {confirmDelete ? <div style={{ display: "flex", gap: 4, flex: 1 }}><button onClick={() => { deleteTournament(); setConfirmDelete(false); }} style={{ flex: 1, padding: 12, borderRadius: 12, background: DG, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Confirm Delete</button><button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${BD}`, background: "transparent", color: MT, fontSize: 13, cursor: "pointer" }}>Cancel</button></div> : <button onClick={() => setConfirmDelete(true)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${DG}20`, background: "transparent", color: MT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete</button>}
      </div>
    </div>
  );
}
