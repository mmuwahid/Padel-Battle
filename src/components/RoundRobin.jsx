import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, PU } from '../theme';

const TEAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const getTeamLabel = (idx) => TEAM_LETTERS[idx] ? `Team ${TEAM_LETTERS[idx]}` : `Team ${idx + 1}`;

export function RoundRobin({ players, getName, supabase, leagueId, tournament, setTournament, sel, endTournament, resetTournament, setScreen }) {
  // ── State ──
  const [rrTeams, setRrTeams] = useState([
    { name: "Team A", p1: "", p2: "" },
    { name: "Team B", p1: "", p2: "" },
    { name: "Team C", p1: "", p2: "" },
    { name: "Team D", p1: "", p2: "" },
  ]);
  const [rrTournamentName, setRrTournamentName] = useState("");

  // ── Helpers ──
  function addRrTeam() {
    const idx = rrTeams.length;
    setRrTeams([...rrTeams, { name: getTeamLabel(idx), p1: "", p2: "" }]);
  }
  function removeRrTeam(idx) {
    if (rrTeams.length <= 2) return;
    setRrTeams(rrTeams.filter((_, i) => i !== idx));
  }
  function updateRrTeam(idx, field, value) {
    const updated = [...rrTeams];
    updated[idx] = { ...updated[idx], [field]: value };
    setRrTeams(updated);
  }

  function generateRRSchedule(teamData) {
    const teams = [...teamData];
    if (teams.length % 2 === 1) teams.push({ name: "BYE", players: [null, null] });
    const total = teams.length;
    const rounds = [];
    const fixed = teams[0];
    const rotating = teams.slice(1);
    for (let r = 0; r < total - 1; r++) {
      const matches = [];
      const current = [fixed, ...rotating];
      for (let i = 0; i < total / 2; i++) {
        const t1 = current[i]; const t2 = current[total - 1 - i];
        if (t1.name === "BYE" || t2.name === "BYE") continue;
        matches.push({ team_a: t1.players, team_b: t2.players, team_a_name: t1.name, team_b_name: t2.name });
      }
      rounds.push({ round: r, matches });
      rotating.push(rotating.shift());
    }
    return rounds;
  }

  async function createRRTournament() {
    const validTeams = rrTeams.filter(t => t.p1 && t.p2);
    if (validTeams.length < 3) return;
    const teamData = validTeams.map(t => ({ players: [t.p1, t.p2], name: t.name }));
    const rounds = generateRRSchedule(teamData);
    const allPlayerIds = validTeams.flatMap(t => [t.p1, t.p2]);
    const scheduleData = { rounds, round_robin: true, teams: validTeams.map(t => ({ name: t.name, players: [t.p1, t.p2] })) };
    try {
      const { data, error } = await supabase.from("tournaments").insert({
        league_id: leagueId, date: new Date().toISOString().split("T")[0], mode: "round_robin",
        players: allPlayerIds, courts: 1, pts_per_round: 0, schedule: scheduleData, scores: {}, status: "active",
        name: rrTournamentName || "RR Tournament",
      }).select().single();
      if (error) throw error;
      setTournament(data); setScreen("rr-active");
    } catch (err) { }
  }

  async function recordRRScore(roundIdx, matchIdx, scoreA, scoreB) {
    const newScores = { ...tournament.scores, ["rr-" + roundIdx + "-" + matchIdx]: { a: scoreA, b: scoreB } };
    try {
      const { error } = await supabase.from("tournaments").update({ scores: newScores }).eq("id", tournament.id);
      if (error) throw error;
      setTournament({ ...tournament, scores: newScores });
    } catch (err) { }
  }

  function getRRStandings() {
    if (!tournament?.schedule?.teams) return [];
    const sc = tournament.scores || {};
    const stats = {};
    tournament.schedule.teams.forEach(t => { stats[t.name] = { name: t.name, players: t.players, played: 0, wins: 0, losses: 0, draws: 0, pf: 0, pa: 0, pts: 0 }; });
    (tournament.schedule.rounds || []).forEach((round, ri) => {
      (round.matches || []).forEach((m, mi) => {
        const s = sc["rr-" + ri + "-" + mi];
        if (s && m.team_a_name && m.team_b_name) {
          const tA = stats[m.team_a_name]; const tB = stats[m.team_b_name];
          if (tA) { tA.played++; tA.pf += s.a; tA.pa += s.b; if (s.a > s.b) { tA.wins++; tA.pts += 3; } else if (s.a === s.b) { tA.draws++; tA.pts += 1; } else { tA.losses++; } }
          if (tB) { tB.played++; tB.pf += s.b; tB.pa += s.a; if (s.b > s.a) { tB.wins++; tB.pts += 3; } else if (s.b === s.a) { tB.draws++; tB.pts += 1; } else { tB.losses++; } }
        }
      });
    });
    return Object.values(stats).sort((a, b) => { if (b.pts !== a.pts) return b.pts - a.pts; const gdA=a.pf-a.pa; const gdB=b.pf-b.pa; if (gdB!==gdA) return gdB-gdA; return b.pf-a.pf; });
  }

  function isRRComplete() {
    if (!tournament?.schedule?.rounds) return false;
    return tournament.schedule.rounds.every((round, ri) => (round.matches || []).every((_, mi) => tournament.scores["rr-" + ri + "-" + mi]));
  }

  // ════════════════════════════════════
  // RENDER: RR Setup Screen
  // ════════════════════════════════════
  if (!tournament || tournament.mode !== "round_robin") {
    const validTeams = rrTeams.filter(t => t.p1 && t.p2);
    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <button onClick={() => setScreen("selector")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: MT, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 12, padding: 0 }}>{"\u2190"} Back to formats</button>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Tournament Name</label>
          <input type="text" value={rrTournamentName} onChange={e => setRrTournamentName(e.target.value)} placeholder="Round Robin League" style={{ width: "100%", padding: "12px 16px", background: CD, border: "1px solid " + BD, borderRadius: 12, color: TX, fontFamily: "Outfit, sans-serif", fontSize: 14, outline: "none" }} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Format</label>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: A + "1a", border: "1px solid " + A + "40", borderRadius: 20, fontSize: 12, fontWeight: 600, color: A }}>{"\uD83D\uDCCA"} Round Robin</span>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "block" }}>Teams ({rrTeams.length} registered)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {rrTeams.map((team, idx) => { const rrAllSel = rrTeams.flatMap(t => [t.p1, t.p2]).filter(Boolean); const p1O = rrAllSel.filter(v => v !== team.p1); const p2O = rrAllSel.filter(v => v !== team.p2); return (
              <div key={idx} style={{ background: CD, border: "1px solid " + BD, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <input type="text" value={team.name} onChange={e => updateRrTeam(idx, "name", e.target.value)} style={{ background: "transparent", border: "none", color: TX, fontSize: 13, fontWeight: 600, outline: "none", width: "60%" }} />
                  <button onClick={() => removeRrTeam(idx)} style={{ width: 28, height: 28, borderRadius: 8, background: DG + "1a", border: "1px solid " + DG + "33", color: DG, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={team.p1} onChange={e => updateRrTeam(idx, "p1", e.target.value)} style={{ ...sel, flex: 1, fontSize: 12 }}>
                    <option value="">Player 1</option>
                    {players.filter(p => !p1O.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                  </select>
                  <select value={team.p2} onChange={e => updateRrTeam(idx, "p2", e.target.value)} style={{ ...sel, flex: 1, fontSize: 12 }}>
                    <option value="">Player 2</option>
                    {players.filter(p => !p2O.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                  </select>
                </div>
              </div>
            ); })}
          </div>
          <button onClick={addRrTeam} style={{ width: "100%", padding: 12, background: CD2, border: "1px dashed " + BD, borderRadius: 12, color: MT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Team</button>
        </div>
        <button onClick={createRRTournament} disabled={validTeams.length < 3} style={{ width: "100%", padding: 14, background: validTeams.length >= 3 ? A : BD, border: "none", borderRadius: 14, color: validTeams.length >= 3 ? BG : MT, fontSize: 15, fontWeight: 700, cursor: validTeams.length >= 3 ? "pointer" : "not-allowed", marginBottom: 20 }}>
          Create Tournament {validTeams.length >= 3 ? "(" + validTeams.length + " teams)" : "(min 3 teams)"}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════
  // RENDER: Active RR Tournament
  // ════════════════════════════════════
  const standings = getRRStandings();
  const complete = isRRComplete();

  if (complete) {
    const champion = standings[0];
    const runnerUp = standings[1];
    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ margin: "0 0 16px", padding: 24, background: "linear-gradient(135deg, " + GD + "14 0%, " + GD + "05 100%)", border: "2px solid " + GD, borderRadius: 18, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{"\uD83C\uDFC6"}</div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: GD, marginBottom: 4 }}>Round Robin Champion</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: TX, marginBottom: 4 }}>{champion?.name || "TBD"}</div>
          <div style={{ fontSize: 12, color: MT }}>{champion?.players?.map(pid => getName(pid)).join(" x ")}</div>
        </div>
        {runnerUp && (
          <div style={{ margin: "0 0 20px", padding: 16, background: SV + "0a", border: "1px solid " + SV + "40", borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: SV, marginBottom: 4 }}>{"\uD83E\uDD48"} Runner-Up</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TX }}>{runnerUp.name}</div>
            <div style={{ fontSize: 11, color: MT, marginTop: 2 }}>{runnerUp.players?.map(pid => getName(pid)).join(" x ")}</div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Final Table</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
              <thead><tr>
                {["#","Team","P","W","L","PTS","GD"].map(h=><th key={h} style={{ fontSize:10, fontWeight:600, color:MT, textTransform:"uppercase", padding:"6px 6px", textAlign: h==="Team"?"left":"center" }}>{h}</th>)}
              </tr></thead>
              <tbody>{standings.map((t,i) => {
                const rc = i===0?GD:i===1?SV:i===2?BZ:MT;
                return (<tr key={t.name}>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:12, fontWeight:700, fontFamily:"JetBrains Mono", color:rc, borderRadius:"8px 0 0 8px", textAlign:"center" }}>{i+1}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:12, fontWeight:i<2?700:500, color:i===0?GD:TX, textAlign:"left" }}>{t.name}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:MT, textAlign:"center" }}>{t.played}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:A, textAlign:"center" }}>{t.wins}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:DG, textAlign:"center" }}>{t.losses}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:12, fontWeight:700, fontFamily:"JetBrains Mono", color:i===0?GD:TX, textAlign:"center" }}>{t.pts}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:MT, textAlign:"center", borderRadius:"0 8px 8px 0" }}>{t.pf-t.pa>0?"+"+(t.pf-t.pa):t.pf-t.pa}</td>
                </tr>);
              })}</tbody>
            </table>
          </div>
        </div>
        <button onClick={()=>{endTournament();resetTournament();}} style={{ width:"100%", padding:12, borderRadius:12, border:"none", background:A, color:BG, fontSize:13, fontWeight:600, cursor:"pointer" }}>New Tournament</button>
      </div>
    );
  }

  // RR Active view
  const allRounds = tournament.schedule?.rounds || [];
  const totalM = allRounds.reduce((s,r) => s + (r.matches||[]).length, 0);
  const scoredM = Object.keys(tournament.scores||{}).filter(k=>k.startsWith("rr-")).length;

  return (
    <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ margin: "0 0 16px", padding: 16, background: CD, border: "1px solid " + BD, borderRadius: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{tournament.name || "Round Robin"}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: A + "1a", color: A }}>{"\uD83D\uDCCA"} Round Robin</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: PU + "1a", color: PU }}>{scoredM}/{totalM} scored</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: DG + "26", color: DG }}>{"\u25CF"} LIVE</span>
        </div>
      </div>

      <div style={{ background: CD, borderRadius: 14, border: "1px solid " + A + "30", padding: 14, marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: A, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Group Standings</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["Team","P","W","L","PTS","GD"].map(h=><th key={h} style={{ fontSize:10, fontWeight:600, color:MT, textTransform:"uppercase", padding:"6px 6px", textAlign:h==="Team"?"left":"center", borderBottom:"1px solid "+BD }}>{h}</th>)}
            </tr></thead>
            <tbody>{standings.map((t,i) => (
              <tr key={t.name} style={{ borderBottom: i<standings.length-1?"1px solid "+BD+"40":"none" }}>
                <td style={{ padding:"8px 6px", fontSize:12, fontWeight:600, color: i===0?GD:TX }}>{i+1}. {t.name}</td>
                <td style={{ padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:MT, textAlign:"center" }}>{t.played}</td>
                <td style={{ padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:A, textAlign:"center" }}>{t.wins}</td>
                <td style={{ padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:DG, textAlign:"center" }}>{t.losses}</td>
                <td style={{ padding:"8px 6px", fontSize:12, fontWeight:700, fontFamily:"JetBrains Mono", color:i===0?GD:TX, textAlign:"center" }}>{t.pts}</td>
                <td style={{ padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:MT, textAlign:"center" }}>{t.pf-t.pa>0?"+"+(t.pf-t.pa):t.pf-t.pa}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {allRounds.map((round, ri) => {
        const matches = round.matches || [];
        return (
          <div key={ri} style={{ background: CD, borderRadius: 12, border: "1px solid " + BD, padding: 14, marginBottom: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Round {ri + 1}</h3>
            {matches.map((m, mi) => {
              const key = "rr-" + ri + "-" + mi;
              const sc = tournament.scores?.[key];
              return (
                <div key={mi} style={{ marginBottom: mi < matches.length - 1 ? 10 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ flex:1, fontSize:13, fontWeight:600, textAlign:"right", color: sc?(sc.a>sc.b?A:TX):TX }}>{m.team_a_name}</span>
                    <span style={{ color:MT, fontSize:11, fontWeight:700 }}>vs</span>
                    <span style={{ flex:1, fontSize:13, fontWeight:600, color: sc?(sc.b>sc.a?A:TX):TX }}>{m.team_b_name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" value={sc?.a??""} placeholder="0" onFocus={e=>e.target.select()}
                      onChange={e=>{const v=parseInt(e.target.value)||0;recordRRScore(ri,mi,v,sc?.b||0);}}
                      style={{ width:50, textAlign:"center", background:CD2, color:TX, border:"1px solid "+A+"30", borderRadius:8, padding:"6px", fontSize:16, fontWeight:700, fontFamily:"JetBrains Mono", outline:"none" }} />
                    <span style={{ color:MT, fontWeight:700, fontSize:12 }}>-</span>
                    <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" value={sc?.b??""} placeholder="0" onFocus={e=>e.target.select()}
                      onChange={e=>{const v=parseInt(e.target.value)||0;recordRRScore(ri,mi,sc?.a||0,v);}}
                      style={{ width:50, textAlign:"center", background:CD2, color:TX, border:"1px solid "+DG+"30", borderRadius:8, padding:"6px", fontSize:16, fontWeight:700, fontFamily:"JetBrains Mono", outline:"none" }} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{ background: CD, borderRadius: 12, border: "1px solid " + BD, padding: 14, marginBottom: 12 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, color: MT, marginBottom: 6 }}>{"\u2139\uFE0F"} How it works</h4>
        <p style={{ fontSize: 11, color: MT, lineHeight: 1.6 }}>Win = 3 pts, Draw = 1 pt, Loss = 0 pts. Ties broken by goal difference, then goals scored.</p>
      </div>

      <button onClick={()=>{if(confirm("End tournament?"))endTournament();}} style={{ width:"100%", padding:12, borderRadius:12, border:"1px solid "+DG+"40", background:"transparent", color:DG, fontSize:13, fontWeight:600, cursor:"pointer" }}>End Tournament</button>
    </div>
  );
}
