import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, PU } from '../theme';
import { BracketSVG } from './BracketSVG';

const TEAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const getTeamLabel = (idx) => TEAM_LETTERS[idx] ? `Team ${TEAM_LETTERS[idx]}` : `Team ${idx + 1}`;

export function DoubleElimination({ players, getName, supabase, leagueId, tournament, setTournament, sel, endTournament, resetTournament, setScreen }) {
  // ── State ──
  const [deTeams, setDeTeams] = useState([
    { name: "Team A", p1: "", p2: "" },
    { name: "Team B", p1: "", p2: "" },
    { name: "Team C", p1: "", p2: "" },
    { name: "Team D", p1: "", p2: "" },
  ]);
  const [deTournamentName, setDeTournamentName] = useState("");

  // ── Helpers ──
  function addDeTeam() {
    const idx = deTeams.length;
    setDeTeams([...deTeams, { name: getTeamLabel(idx), p1: "", p2: "" }]);
  }
  function removeDeTeam(idx) {
    if (deTeams.length <= 2) return;
    setDeTeams(deTeams.filter((_, i) => i !== idx));
  }
  function updateDeTeam(idx, field, value) {
    const updated = [...deTeams];
    updated[idx] = { ...updated[idx], [field]: value };
    setDeTeams(updated);
  }

  function buildDEBracket(teamData) {
    let currentTeams = [...teamData];
    const wRounds = [];
    let rn = 0;
    while (currentTeams.length > 1) {
      const matches = [];
      for (let i = 0; i < currentTeams.length - 1; i += 2) {
        matches.push({ team_a: currentTeams[i].players, team_b: currentTeams[i + 1].players, team_a_name: currentTeams[i].name, team_b_name: currentTeams[i + 1].name, winner: null });
      }
      if (currentTeams.length % 2 === 1) {
        matches.push({ team_a: currentTeams[currentTeams.length - 1].players, team_b: null, team_a_name: currentTeams[currentTeams.length - 1].name, team_b_name: null, winner: "a" });
      }
      wRounds.push({ round: rn, matches });
      currentTeams = matches.map(() => ({ players: null, name: "TBD" }));
      rn++;
    }
    const numLRounds = Math.max(1, (wRounds.length - 1) * 2);
    const lRounds = [];
    for (let i = 0; i < numLRounds; i++) { lRounds.push({ round: i, matches: [] }); }
    return { winners: wRounds, losers: lRounds, grandFinal: { team_a: null, team_b: null, team_a_name: "W Champion", team_b_name: "L Champion", winner: null } };
  }

  async function createDETournament() {
    const validTeams = deTeams.filter(t => t.p1 && t.p2);
    if (validTeams.length < 4) return;
    const shuffled = [...validTeams].sort(() => Math.random() - 0.5);
    const teamData = shuffled.map(t => ({ players: [t.p1, t.p2], name: t.name }));
    const bracket = buildDEBracket(teamData);
    const allPlayerIds = validTeams.flatMap(t => [t.p1, t.p2]);
    const scheduleData = { bracket: true, double_elim: true, winners: bracket.winners, losers: bracket.losers, grandFinal: bracket.grandFinal, teams: validTeams.map(t => ({ name: t.name, players: [t.p1, t.p2] })) };
    try {
      const { data, error } = await supabase.from("tournaments").insert({
        league_id: leagueId, date: new Date().toISOString().split("T")[0], mode: "double_elimination",
        players: allPlayerIds, courts: 1, pts_per_round: 0, schedule: scheduleData, scores: {}, status: "active",
        name: deTournamentName || "DE Tournament",
      }).select().single();
      if (error) throw error;
      setTournament(data);
      setScreen("de-active");
    } catch (err) { }
  }

  async function recordDEScore(bracket, roundIdx, matchIdx, scoreA, scoreB) {
    if (scoreA === scoreB) return;
    const prefix = bracket === "winners" ? "w" : bracket === "losers" ? "l" : "gf";
    const scoreKey = prefix === "gf" ? "gf-0" : prefix + "-" + roundIdx + "-" + matchIdx;
    const newScores = { ...tournament.scores, [scoreKey]: { a: scoreA, b: scoreB } };
    const newSchedule = JSON.parse(JSON.stringify(tournament.schedule));
    if (bracket === "winners") {
      const match = newSchedule.winners[roundIdx]?.matches?.[matchIdx];
      if (!match) return;
      const winP = scoreA > scoreB ? match.team_a : match.team_b;
      const winN = scoreA > scoreB ? match.team_a_name : match.team_b_name;
      const losP = scoreA > scoreB ? match.team_b : match.team_a;
      const losN = scoreA > scoreB ? match.team_b_name : match.team_a_name;
      if (roundIdx + 1 < newSchedule.winners.length) {
        const nmi = Math.floor(matchIdx / 2);
        const slot = matchIdx % 2 === 0 ? "a" : "b";
        const nm = newSchedule.winners[roundIdx + 1]?.matches?.[nmi];
        if (nm) { if (slot==="a") { nm.team_a=winP; nm.team_a_name=winN; } else { nm.team_b=winP; nm.team_b_name=winN; } }
      } else { newSchedule.grandFinal.team_a = winP; newSchedule.grandFinal.team_a_name = winN; }
      const lri = Math.min(roundIdx * 2, newSchedule.losers.length - 1);
      if (lri >= 0 && losP) {
        const lm = newSchedule.losers[lri].matches;
        const last = lm[lm.length - 1];
        if (!lm.length || (last && last.team_a && last.team_b)) lm.push({ team_a: losP, team_b: null, team_a_name: losN, team_b_name: null, winner: null });
        else if (last && !last.team_b) { last.team_b = losP; last.team_b_name = losN; }
      }
    } else if (bracket === "losers") {
      const match = newSchedule.losers[roundIdx]?.matches?.[matchIdx];
      if (!match) return;
      const winP = scoreA > scoreB ? match.team_a : match.team_b;
      const winN = scoreA > scoreB ? match.team_a_name : match.team_b_name;
      if (roundIdx + 1 < newSchedule.losers.length) {
        const lm = newSchedule.losers[roundIdx + 1].matches;
        const last = lm[lm.length - 1];
        if (!lm.length || (last && last.team_a && last.team_b)) lm.push({ team_a: winP, team_b: null, team_a_name: winN, team_b_name: null, winner: null });
        else if (last && !last.team_b) { last.team_b = winP; last.team_b_name = winN; }
      } else { newSchedule.grandFinal.team_b = winP; newSchedule.grandFinal.team_b_name = winN; }
    } else { newSchedule.grandFinal.winner = scoreA > scoreB ? "a" : "b"; }
    try {
      const { error } = await supabase.from("tournaments").update({ scores: newScores, schedule: newSchedule }).eq("id", tournament.id);
      if (error) throw error;
      setTournament({ ...tournament, scores: newScores, schedule: newSchedule });
    } catch (err) { }
  }

  function getDEStandings() {
    if (!tournament?.schedule?.teams) return [];
    const sc = tournament.scores || {};
    const stats = {};
    tournament.schedule.teams.forEach(t => { stats[t.name] = { name: t.name, players: t.players, wins: 0, losses: 0, bracket: "winners" }; });
    (tournament.schedule.winners || []).forEach((round, ri) => {
      (round.matches || []).forEach((m, mi) => {
        const s = sc["w-" + ri + "-" + mi];
        if (s && m.team_a_name && m.team_b_name) {
          const wN = s.a > s.b ? m.team_a_name : m.team_b_name;
          const lN = s.a > s.b ? m.team_b_name : m.team_a_name;
          if (stats[wN]) stats[wN].wins++;
          if (stats[lN]) { stats[lN].losses++; stats[lN].bracket = "losers"; }
        }
      });
    });
    (tournament.schedule.losers || []).forEach((round, ri) => {
      (round.matches || []).forEach((m, mi) => {
        const s = sc["l-" + ri + "-" + mi];
        if (s && m.team_a_name && m.team_b_name) {
          const wN = s.a > s.b ? m.team_a_name : m.team_b_name;
          const lN = s.a > s.b ? m.team_b_name : m.team_a_name;
          if (stats[wN]) stats[wN].wins++;
          if (stats[lN]) { stats[lN].losses++; stats[lN].bracket = "eliminated"; }
        }
      });
    });
    const gf = tournament.schedule.grandFinal; const gfS = sc["gf-0"];
    if (gfS && gf?.team_a_name && gf?.team_b_name) {
      const wN = gfS.a > gfS.b ? gf.team_a_name : gf.team_b_name;
      const lN = gfS.a > gfS.b ? gf.team_b_name : gf.team_a_name;
      if (stats[wN]) stats[wN].wins++; if (stats[lN]) stats[lN].losses++;
    }
    return Object.values(stats).sort((a, b) => { if (b.wins !== a.wins) return b.wins - a.wins; return a.losses - b.losses; });
  }

  function isDEComplete() { return !!tournament?.scores?.["gf-0"]; }

  // ════════════════════════════════════
  // RENDER: DE Setup Screen
  // ════════════════════════════════════
  if (!tournament || tournament.mode !== "double_elimination") {
    const validTeams = deTeams.filter(t => t.p1 && t.p2);
    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <button onClick={() => setScreen("selector")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: MT, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 12, padding: 0 }}>{"\u2190"} Back to formats</button>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Tournament Name</label>
          <input type="text" value={deTournamentName} onChange={e => setDeTournamentName(e.target.value)} placeholder="Double Elimination Classic" style={{ width: "100%", padding: "12px 16px", background: CD, border: "1px solid " + BD, borderRadius: 12, color: TX, fontFamily: "Outfit, sans-serif", fontSize: 14, outline: "none" }} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Format</label>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: PU + "1a", border: "1px solid " + PU + "40", borderRadius: 20, fontSize: 12, fontWeight: 600, color: PU }}>{"\uD83D\uDD04"} Double Elimination</span>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Teams ({deTeams.length} registered)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {deTeams.map((team, idx) => { const deAllSel = deTeams.flatMap(t => [t.p1, t.p2]).filter(Boolean); const p1O = deAllSel.filter(v => v !== team.p1); const p2O = deAllSel.filter(v => v !== team.p2); return (
              <div key={idx} style={{ background: CD, border: "1px solid " + BD, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <input type="text" value={team.name} onChange={e => updateDeTeam(idx, "name", e.target.value)} style={{ background: "transparent", border: "none", color: TX, fontSize: 13, fontWeight: 600, outline: "none", width: "60%" }} />
                  <button onClick={() => removeDeTeam(idx)} style={{ width: 28, height: 28, borderRadius: 8, background: DG + "1a", border: "1px solid " + DG + "33", color: DG, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={team.p1} onChange={e => updateDeTeam(idx, "p1", e.target.value)} style={{ ...sel, flex: 1, fontSize: 12 }}>
                    <option value="">Player 1</option>
                    {players.filter(p => !p1O.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                  </select>
                  <select value={team.p2} onChange={e => updateDeTeam(idx, "p2", e.target.value)} style={{ ...sel, flex: 1, fontSize: 12 }}>
                    <option value="">Player 2</option>
                    {players.filter(p => !p2O.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                  </select>
                </div>
              </div>
            ); })}
          </div>
          <button onClick={addDeTeam} style={{ width: "100%", padding: 12, background: CD2, border: "1px dashed " + BD, borderRadius: 12, color: MT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Team</button>
        </div>
        <button onClick={createDETournament} disabled={validTeams.length < 4} style={{ width: "100%", padding: 14, background: validTeams.length >= 4 ? A : BD, border: "none", borderRadius: 14, color: validTeams.length >= 4 ? BG : MT, fontSize: 15, fontWeight: 700, cursor: validTeams.length >= 4 ? "pointer" : "not-allowed", marginBottom: 20 }}>
          Create Tournament {validTeams.length >= 4 ? "(" + validTeams.length + " teams)" : "(min 4 teams)"}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════
  // RENDER: Active DE Tournament
  // ════════════════════════════════════
  const standings = getDEStandings();
  const complete = isDEComplete();
  const gf = tournament.schedule?.grandFinal;
  const gfScore = tournament.scores?.["gf-0"];

  if (complete) {
    const champion = gfScore?.a > gfScore?.b
      ? { name: gf.team_a_name, players: gf.team_a }
      : { name: gf.team_b_name, players: gf.team_b };
    const runnerUp = gfScore?.a > gfScore?.b
      ? { name: gf.team_b_name, players: gf.team_b }
      : { name: gf.team_a_name, players: gf.team_a };

    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ margin: "0 0 16px", padding: 24, background: "linear-gradient(135deg, " + GD + "14 0%, " + GD + "05 100%)", border: "2px solid " + GD, borderRadius: 18, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{"\uD83C\uDFC6"}</div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: GD, marginBottom: 4 }}>Grand Final Champion</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: TX, marginBottom: 4 }}>{champion.name}</div>
          <div style={{ fontSize: 12, color: MT }}>{champion.players?.map(pid => getName(pid)).join(" x ")}</div>
        </div>
        {runnerUp.name && (
          <div style={{ margin: "0 0 20px", padding: 16, background: SV + "0a", border: "1px solid " + SV + "40", borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: SV, marginBottom: 4 }}>{"\uD83E\uDD48"} Runner-Up</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TX }}>{runnerUp.name}</div>
            <div style={{ fontSize: 11, color: MT, marginTop: 2 }}>{runnerUp.players?.map(pid => getName(pid)).join(" x ")}</div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Final Standings</h3>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
            <thead><tr>
              <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", textAlign: "left", padding: "6px 10px" }}>#</th>
              <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", textAlign: "left", padding: "6px 10px" }}>Team</th>
              <th style={{ fontSize: 10, fontWeight: 600, color: MT, textTransform: "uppercase", textAlign: "right", padding: "6px 10px" }}>Record</th>
            </tr></thead>
            <tbody>{standings.map((t, i) => {
              const rc = i===0 ? GD : i===1 ? SV : i===2 ? BZ : MT;
              return (<tr key={t.name}>
                <td style={{ background: CD, padding: 10, fontSize: 13, fontWeight: 700, fontFamily: "JetBrains Mono", color: rc, borderRadius: "8px 0 0 8px" }}>{i+1}</td>
                <td style={{ background: CD, padding: 10, fontSize: 12, fontWeight: i<2?700:500, color: i===0?GD:i<3?TX:MT }}>{t.name}</td>
                <td style={{ background: CD, padding: 10, fontSize: 11, fontFamily: "JetBrains Mono", color: MT, textAlign: "right", borderRadius: "0 8px 8px 0" }}>{t.wins}W {t.losses}L</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button onClick={() => { endTournament(); resetTournament(); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: A, color: BG, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>New Tournament</button>
        </div>
      </div>
    );
  }

  // DE Active bracket view
  return (
    <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ margin: "0 0 16px", padding: 16, background: CD, border: "1px solid " + BD, borderRadius: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{tournament.name || "DE Tournament"}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: PU + "1a", color: PU }}>{"\uD83D\uDD04"} Double Elimination</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: A + "1a", color: A }}>{tournament.schedule?.teams?.length || 0} Teams</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: DG + "26", color: DG }}>{"\u25CF"} LIVE</span>
        </div>
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 700, color: GD, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{"\uD83C\uDFC6"} Winners Bracket</h3>
      <BracketSVG bracket={tournament.schedule?.winners} getName={getName} scores={Object.fromEntries(Object.entries(tournament.scores||{}).filter(([k])=>k.startsWith("w-")).map(([k,v])=>[k.replace("w-","").replace(/-(d+)/,"-"),v]).map(([k,v])=>{const p=k.split("-");return[p[0]+"-"+p[1],v];}))} onSaveScore={(ri,mi,a,b)=>recordDEScore("winners",ri,mi,a,b)} />

      <h3 style={{ fontSize: 13, fontWeight: 700, color: DG, marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 }}>{"\uD83D\uDCA5"} Losers Bracket</h3>
      {(tournament.schedule?.losers || []).map((round, ri) => {
        const matches = round.matches || [];
        if (!matches.length) return null;
        return (
          <div key={"l-"+ri} style={{ background: CD, borderRadius: 12, border: "1px solid " + BD, padding: 14, marginBottom: 8 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: DG, marginBottom: 8 }}>Losers Round {ri + 1}</h4>
            {matches.map((m, mi) => {
              const key = "l-" + ri + "-" + mi;
              const sc = tournament.scores?.[key];
              const tAN = m.team_a_name || "TBD"; const tBN = m.team_b_name || "TBD";
              return (
                <div key={mi} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ flex:1, fontSize:13, fontWeight:600, textAlign:"right", color: sc?(sc.a>sc.b?A:TX):TX }}>{tAN}</span>
                    <span style={{ color:MT, fontSize:11, fontWeight:700 }}>vs</span>
                    <span style={{ flex:1, fontSize:13, fontWeight:600, color: sc?(sc.b>sc.a?A:TX):TX }}>{tBN}</span>
                  </div>
                  {!sc && m.team_a && m.team_b && (
                    <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"center" }}>
                      <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" placeholder="0" id={"de-la-"+ri+"-"+mi} style={{ width:44, padding:"4px", borderRadius:6, border:"1px solid "+BD, background:CD2, color:TX, textAlign:"center", fontSize:13, fontFamily:"JetBrains Mono" }} />
                      <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" placeholder="0" id={"de-lb-"+ri+"-"+mi} style={{ width:44, padding:"4px", borderRadius:6, border:"1px solid "+BD, background:CD2, color:TX, textAlign:"center", fontSize:13, fontFamily:"JetBrains Mono" }} />
                      <button onClick={()=>{const a=parseInt(document.getElementById("de-la-"+ri+"-"+mi).value)||0;const b=parseInt(document.getElementById("de-lb-"+ri+"-"+mi).value)||0;if(a===b)return;recordDEScore("losers",ri,mi,a,b);}} style={{ padding:"4px 10px", borderRadius:6, border:"none", background:A, color:BG, fontSize:9, fontWeight:700, cursor:"pointer" }}>Save</button>
                    </div>
                  )}
                  {sc && <div style={{ textAlign:"center", fontSize:13, fontWeight:700, fontFamily:"JetBrains Mono", color:MT }}>{sc.a} - {sc.b}</div>}
                </div>
              );
            })}
          </div>
        );
      })}

      {gf && (gf.team_a || gf.team_b) && (
        <div style={{ margin: "16px 0", padding: 16, background: "linear-gradient(135deg, " + GD + "14, " + GD + "05)", border: "2px solid " + GD + "60", borderRadius: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: GD, marginBottom: 10, textAlign: "center" }}>{"\uD83C\uDFC6"} Grand Final</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: gfScore?(gfScore.a>gfScore.b?A:TX):TX }}>{gf.team_a_name || "TBD"}</span>
            <span style={{ color: MT, fontSize: 12, fontWeight: 700 }}>vs</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: gfScore?(gfScore.b>gfScore.a?A:TX):TX }}>{gf.team_b_name || "TBD"}</span>
          </div>
          {!gfScore && gf.team_a && gf.team_b && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" placeholder="0" id="de-gf-a" style={{ width:50, padding:"6px", borderRadius:8, border:"1px solid "+GD+"40", background:CD2, color:TX, textAlign:"center", fontSize:16, fontWeight:700, fontFamily:"JetBrains Mono" }} />
              <span style={{ color: MT, fontWeight: 700 }}>-</span>
              <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" placeholder="0" id="de-gf-b" style={{ width:50, padding:"6px", borderRadius:8, border:"1px solid "+GD+"40", background:CD2, color:TX, textAlign:"center", fontSize:16, fontWeight:700, fontFamily:"JetBrains Mono" }} />
              <button onClick={()=>{const a=parseInt(document.getElementById("de-gf-a").value)||0;const b=parseInt(document.getElementById("de-gf-b").value)||0;if(a===b)return;recordDEScore("grand_final",0,0,a,b);}} style={{ padding:"6px 14px", borderRadius:8, border:"none", background:GD, color:BG, fontSize:11, fontWeight:700, cursor:"pointer" }}>Save</button>
            </div>
          )}
          {gfScore && <div style={{ textAlign:"center", fontSize:18, fontWeight:800, fontFamily:"JetBrains Mono", color:GD }}>{gfScore.a} - {gfScore.b}</div>}
        </div>
      )}

      <div style={{ margin: "0 0 20px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Live Standings</h3>
        {standings.map((t, i) => (
          <div key={t.name} style={{ display:"flex", alignItems:"center", padding:"10px 14px", background:CD, border:"1px solid "+BD, borderRadius:10, marginBottom:6, gap:12 }}>
            <span style={{ fontFamily:"JetBrains Mono", fontSize:14, fontWeight:700, width:24, textAlign:"center", color: i===0?GD:i===1?SV:i===2?BZ:MT }}>{i+1}</span>
            <span style={{ flex:1, fontSize:13, fontWeight:600, color: t.bracket==="eliminated"?MT:TX }}>{t.name}</span>
            <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:10, background: t.bracket==="winners"?GD+"1a":t.bracket==="losers"?DG+"1a":MT+"1a", color: t.bracket==="winners"?GD:t.bracket==="losers"?DG:MT }}>{t.bracket==="winners"?"W":t.bracket==="losers"?"L":"Out"}</span>
            <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:MT }}>W{t.wins} L{t.losses}</span>
          </div>
        ))}
      </div>

      <button onClick={()=>{if(confirm("End tournament?"))endTournament();}} style={{ width:"100%", padding:12, borderRadius:12, border:"1px solid "+DG+"40", background:"transparent", color:DG, fontSize:13, fontWeight:600, cursor:"pointer" }}>End Tournament</button>
    </div>
  );
}
