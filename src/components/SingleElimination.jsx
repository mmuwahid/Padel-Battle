import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, PU } from '../theme';
import { BracketSVG } from './BracketSVG';
import { ScoreStepper } from './ScoreStepper';
import { ConfirmButton } from './ConfirmModal';
import { rankBadge, TeamPlayers } from './tournamentResults';
import Icon from './Icon';

const TEAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const getTeamLabel = (idx) => TEAM_LETTERS[idx] ? `Team ${TEAM_LETTERS[idx]}` : `Team ${idx + 1}`;

export function SingleElimination({ players, getName, supabase, leagueId, tournament, setTournament, sel, endTournament, resetTournament, deleteTournament, setScreen, showToast }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Lets the user open the bracket from the completed-results screen (was a no-op
  // because the `complete` early-return ignored screen state).
  const [viewBracket, setViewBracket] = useState(false);
  // Controlled score-entry drafts keyed by `${ri}-${mi}` (S084: replaced getElementById inputs).
  const [draftScores, setDraftScores] = useState({});
  const setDraft = (key, side, n) => setDraftScores(s => ({ ...s, [key]: { ...(s[key] || { a: 0, b: 0 }), [side]: n } }));
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
    } catch (err) { if (showToast) showToast(err.message || "Failed to create tournament", "error"); }
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
      } catch (err) { if (showToast) showToast(err.message || "Failed to save score", "error"); }
    } else {
      try {
        const { error } = await supabase.from("tournaments").update({ scores: newScores }).eq("id", tournament.id);
        if (error) throw error;
        setTournament({ ...tournament, scores: newScores });
      } catch (err) { if (showToast) showToast(err.message || "Failed to save score", "error"); }
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
      <div>
        <div className="back-btn-row">
          <button className="back-btn" onClick={() => setScreen("selector")} aria-label="Back to formats">
            <Icon name="back" size={18} />
          </button>
        </div>
        <div className="gm-h">
          <span className="gm-h-eyebrow">Tournament Setup</span>
          <h1 className="gm-h-title">Single Elimination</h1>
          <p className="gm-h-sub">Lose once, you're out &mdash; knockout bracket</p>
        </div>
        <div className="gm-setup">
          <div className="gm-setup-blk">
            <span className="gm-setup-lbl">Tournament Name</span>
            <input type="text" className="gm-tinput" value={tournamentName} onChange={e => setTournamentName(e.target.value)} placeholder="Friday Night Showdown" />
          </div>

          <div className="gm-setup-blk">
            <span className="gm-setup-lbl">Format</span>
            <span className="gm-fmt-pill"><Icon name="trophy" size={12} /> Single Elimination</span>
          </div>

          <div className="gm-setup-blk">
            <span className="gm-setup-lbl">Teams ({seTeams.length} registered)</span>
            <div className="gm-tlist">
              {seTeams.map((team, idx) => {
                const seAllSel = seTeams.flatMap(t => [t.p1, t.p2]).filter(Boolean);
                const p1O = seAllSel.filter(v => v !== team.p1);
                const p2O = seAllSel.filter(v => v !== team.p2);
                return (
                  <div key={idx} className="gm-tcard">
                    <div className="gm-tcard-h">
                      <input type="text" className="gm-tname" value={team.name} onChange={e => updateTeam(idx, "name", e.target.value)} />
                      <button className="gm-trm" disabled={seTeams.length <= 2} onClick={() => removeTeam(idx)} aria-label="Remove team">
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                    <div className="gm-tsels">
                      <select className="gm-tsel" value={team.p1} onChange={e => updateTeam(idx, "p1", e.target.value)}>
                        <option value="">Player 1</option>
                        {players.filter(p => !p1O.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                      </select>
                      <select className="gm-tsel" value={team.p2} onChange={e => updateTeam(idx, "p2", e.target.value)}>
                        <option value="">Player 2</option>
                        {players.filter(p => !p2O.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="gm-addteam" onClick={addTeam}>
              <Icon name="plus" size={12} /> Add Team
            </button>
          </div>

          <button
            className={`gm-startbtn ${validTeams.length >= 4 ? "" : "off"}`}
            onClick={createSETournament}
            disabled={validTeams.length < 4}
          >
            <Icon name="zap" size={14} />
            Create Tournament {validTeams.length >= 4 ? `(${validTeams.length} teams)` : "(min 4 teams)"}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════
  // RENDER: Active SE Tournament
  // ════════════════════════════════════
  const rounds = tournament.schedule?.rounds || [];
  const standings = getSEStandings();
  const complete = isSEComplete();

  if (complete && !viewBracket) {
    const champion = standings[0];
    const runnerUp = standings[1];

    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ margin: "0 0 16px", padding: 24, background: `linear-gradient(135deg, ${GD}14 0%, ${GD}05 100%)`, border: `2px solid ${GD}`, borderRadius: 18, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{"\uD83C\uDFC6"}</div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: GD, marginBottom: 8 }}>Champion</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: TX, marginBottom: 10 }}>{champion?.name || "TBD"}</div>
          <TeamPlayers playerIds={champion?.players} players={players} getName={getName} size={28} fontSize={13} color={TX} weight={700} justify="center" />
        </div>

        {runnerUp && (
          <div style={{ margin: "0 0 20px", padding: 16, background: `${SV}0a`, border: `1px solid ${SV}40`, borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: SV, marginBottom: 6 }}>{"\uD83E\uDD48"} Runner-Up</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TX, marginBottom: 8 }}>{runnerUp.name}</div>
            <TeamPlayers playerIds={runnerUp.players} players={players} getName={getName} size={22} fontSize={12} color={MT} justify="center" />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Final Standings</h3>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
            <thead><tr>
              <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", padding: "6px 10px", width: 40 }}>#</th>
              <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", padding: "6px 10px" }}>Players</th>
              <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right", padding: "6px 10px" }}>Record</th>
            </tr></thead>
            <tbody>
              {standings.map((t, i) => (
                <tr key={t.name}>
                  <td style={{ background: CD, padding: 10, fontSize: i < 3 ? 16 : 13, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: i === 0 ? GD : i === 1 ? SV : i === 2 ? BZ : MT, borderRadius: "8px 0 0 8px", textAlign: "center" }}>{rankBadge(i)}</td>
                  <td style={{ background: CD, padding: 10 }}>
                    <TeamPlayers playerIds={t.players} players={players} getName={getName} size={20} fontSize={12} color={i < 3 ? TX : MT} weight={i === 0 ? 700 : 600} />
                  </td>
                  <td style={{ background: CD, padding: 10, fontSize: 11, fontFamily: "'JetBrains Mono'", textAlign: "right", borderRadius: "0 8px 8px 0", whiteSpace: "nowrap" }}>
                    <span style={{ color: A }}>{t.wins}W</span> <span style={{ color: t.losses > 0 ? DG : A }}>{t.losses}L</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setViewBracket(true)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${BD}`, background: "transparent", color: TX, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>View Bracket</button>
          <button onClick={async () => { await endTournament(); resetTournament(); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: A, color: BG, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>New Tournament</button>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TX }}>{m.team_a_name || "Team A"}</div>
                      <div style={{ fontSize: 11, color: MT, fontFamily: "var(--mono)", marginTop: 1 }}>{m.team_a?.filter(Boolean).map(pid => getName(pid)).join(" / ") || "TBD"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TX }}>{m.team_b_name || "Team B"}</div>
                      <div style={{ fontSize: 11, color: MT, fontFamily: "var(--mono)", marginTop: 1 }}>{m.team_b?.filter(Boolean).map(pid => getName(pid)).join(" / ") || "TBD"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                    <ScoreStepper value={draftScores[`${ri}-${mi}`]?.a || 0} aColor={A} ariaLabel={`${m.team_a_name || "Team A"} score`} onChange={(n) => setDraft(`${ri}-${mi}`, "a", n)} />
                    <ScoreStepper value={draftScores[`${ri}-${mi}`]?.b || 0} aColor={DG} ariaLabel={`${m.team_b_name || "Team B"} score`} onChange={(n) => setDraft(`${ri}-${mi}`, "b", n)} />
                    <button onClick={() => {
                      const d = draftScores[`${ri}-${mi}`] || { a: 0, b: 0 };
                      if (d.a === d.b) { if (showToast) showToast("Scores can't be equal", "error"); return; }
                      recordSEScore(ri, mi, d.a, d.b);
                    }} style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: A, color: BG, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)" }}>Save</button>
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

      {complete ? (
        <button onClick={() => setViewBracket(false)} style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", background: A, color: BG, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Back to Results</button>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <ConfirmButton title="End tournament?" message="This finalizes the standings and closes the tournament." confirmLabel="End" cancelLabel="Cancel" danger onConfirm={endTournament} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${DG}40`, background: "transparent", color: DG, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>End Tournament</ConfirmButton>
          {confirmDelete ? <div style={{ display: "flex", gap: 4, flex: 1 }}><button onClick={() => { deleteTournament(); setConfirmDelete(false); }} style={{ flex: 1, padding: 12, borderRadius: 12, background: DG, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Confirm Delete</button><button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${BD}`, background: "transparent", color: MT, fontSize: 13, cursor: "pointer" }}>Cancel</button></div> : <button onClick={() => setConfirmDelete(true)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${DG}20`, background: "transparent", color: MT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete</button>}
        </div>
      )}
    </div>
  );
}
