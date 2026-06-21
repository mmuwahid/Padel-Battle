import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, PU } from '../theme';
import { ScoreStepper } from './ScoreStepper';
import { rankBadge, TeamPlayers } from './tournamentResults';
import { ConfirmButton } from './ConfirmModal';
import Icon from './Icon';

const TEAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const getTeamLabel = (idx) => TEAM_LETTERS[idx] ? `Team ${TEAM_LETTERS[idx]}` : `Team ${idx + 1}`;

export function RoundRobin({ players, getName, supabase, leagueId, tournament, setTournament, sel, endTournament, resetTournament, deleteTournament, setScreen, showToast }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    } catch (err) { if (showToast) showToast(err.message || "Failed to create tournament", "error"); }
  }

  async function recordRRScore(roundIdx, matchIdx, scoreA, scoreB) {
    const newScores = { ...tournament.scores, ["rr-" + roundIdx + "-" + matchIdx]: { a: scoreA, b: scoreB } };
    try {
      const { error } = await supabase.from("tournaments").update({ scores: newScores }).eq("id", tournament.id);
      if (error) throw error;
      setTournament({ ...tournament, scores: newScores });
    } catch (err) { if (showToast) showToast(err.message || "Failed to save score", "error"); }
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
    const sc = tournament.scores || {};
    return tournament.schedule.rounds.every((round, ri) => (round.matches || []).every((_, mi) => sc["rr-" + ri + "-" + mi]));
  }

  // ════════════════════════════════════
  // RENDER: RR Setup Screen
  // ════════════════════════════════════
  if (!tournament || tournament.mode !== "round_robin") {
    const validTeams = rrTeams.filter(t => t.p1 && t.p2);
    return (
      <div>
        <div className="back-btn-row">
          <button className="back-btn" onClick={() => setScreen("selector")} aria-label="Back to formats">
            <Icon name="back" size={18} />
          </button>
        </div>
        <div className="gm-h">
          <span className="gm-h-eyebrow">Tournament Setup</span>
          <h1 className="gm-h-title">Round Robin</h1>
          <p className="gm-h-sub">Every team plays every other team</p>
        </div>
        <div className="gm-setup">
          <div className="gm-setup-blk">
            <span className="gm-setup-lbl">Tournament Name</span>
            <input type="text" className="gm-tinput" value={rrTournamentName} onChange={e => setRrTournamentName(e.target.value)} placeholder="Round Robin League" />
          </div>

          {/* S091 (#127.6): "Format" block removed — the header already says Round Robin. */}
          <div className="gm-setup-blk">
            <span className="gm-setup-lbl">Teams ({rrTeams.length} registered)</span>
            <div className="gm-tlist">
              {rrTeams.map((team, idx) => {
                const rrAllSel = rrTeams.flatMap(t => [t.p1, t.p2]).filter(Boolean);
                const p1O = rrAllSel.filter(v => v !== team.p1);
                const p2O = rrAllSel.filter(v => v !== team.p2);
                return (
                  <div key={idx} className="gm-tcard">
                    <div className="gm-tcard-h">
                      <input type="text" className="gm-tname" value={team.name} onChange={e => updateRrTeam(idx, "name", e.target.value)} />
                      <button className="gm-trm" disabled={rrTeams.length <= 2} onClick={() => removeRrTeam(idx)} aria-label="Remove team">
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                    <div className="gm-tsels">
                      <select className="gm-tsel" value={team.p1} onChange={e => updateRrTeam(idx, "p1", e.target.value)}>
                        <option value="">Player 1</option>
                        {players.filter(p => !p1O.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                      </select>
                      <select className="gm-tsel" value={team.p2} onChange={e => updateRrTeam(idx, "p2", e.target.value)}>
                        <option value="">Player 2</option>
                        {players.filter(p => !p2O.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nickname || p.name}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="gm-addteam" onClick={addRrTeam}>
              <Icon name="plus" size={12} /> Add Team
            </button>
          </div>

          <button
            className={`gm-startbtn ${validTeams.length >= 3 ? "" : "off"}`}
            onClick={createRRTournament}
            disabled={validTeams.length < 3}
          >
            <Icon name="zap" size={14} />
            Create Tournament {validTeams.length >= 3 ? "(" + validTeams.length + " teams)" : "(min 3 teams)"}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════
  // RENDER: Active RR Tournament
  // ════════════════════════════════════
  const standings = getRRStandings();
  // S091 (#127.6): results only show after the user explicitly ends the tournament
  // (status==='complete'), matching Americano/Mexicano. Previously it auto-jumped to
  // results the moment every match had ANY score key, which fired mid-entry.
  const allScored = isRRComplete();

  if (tournament.status === "complete") {
    const champion = standings[0];
    const runnerUp = standings[1];
    return (
      <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ margin: "0 0 16px", padding: 24, background: "linear-gradient(135deg, " + GD + "14 0%, " + GD + "05 100%)", border: "2px solid " + GD, borderRadius: 18, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Icon name="trophy" size={44} color={GD} strokeWidth={1.5} /></div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: GD, marginBottom: 8 }}>Round Robin Champion</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: TX, marginBottom: 10 }}>{champion?.name || "TBD"}</div>
          <TeamPlayers playerIds={champion?.players} players={players} getName={getName} size={28} fontSize={13} color={TX} weight={700} justify="center" />
        </div>
        {runnerUp && (
          <div style={{ margin: "0 0 20px", padding: 16, background: SV + "0a", border: "1px solid " + SV + "40", borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: SV, marginBottom: 6 }}>Runner-Up</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TX, marginBottom: 8 }}>{runnerUp.name}</div>
            <TeamPlayers playerIds={runnerUp.players} players={players} getName={getName} size={22} fontSize={12} color={MT} justify="center" />
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Final Table</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
              <thead><tr>
                {["#","Players","MP","MW","ML","T","PTS","GD"].map(h=><th key={h} style={{ fontSize:10, fontWeight:600, color:MT, textTransform:"uppercase", padding:"6px 6px", textAlign: h==="Players"?"left":"center" }}>{h}</th>)}
              </tr></thead>
              <tbody>{standings.map((t,i) => (
                <tr key={t.name}>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:i<3?15:12, fontWeight:700, fontFamily:"JetBrains Mono", color:i===0?GD:i===1?SV:i===2?BZ:MT, borderRadius:"8px 0 0 8px", textAlign:"center" }}>{rankBadge(i)}</td>
                  <td style={{ background:CD, padding:"8px 6px", textAlign:"left" }}>
                    <TeamPlayers playerIds={t.players} players={players} getName={getName} size={18} fontSize={12} color={i<3?TX:MT} weight={i===0?700:600} />
                  </td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:MT, textAlign:"center" }}>{t.played}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:A, textAlign:"center" }}>{t.wins}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:t.losses>0?DG:A, textAlign:"center" }}>{t.losses}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:MT, textAlign:"center" }}>{t.draws}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:12, fontWeight:700, fontFamily:"JetBrains Mono", color:i===0?GD:TX, textAlign:"center" }}>{t.pts}</td>
                  <td style={{ background:CD, padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:MT, textAlign:"center", borderRadius:"0 8px 8px 0" }}>{t.pf-t.pa>0?"+"+(t.pf-t.pa):t.pf-t.pa}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <button onClick={async ()=>{ await endTournament(); resetTournament(); }} style={{ width:"100%", padding:12, borderRadius:12, border:"none", background:A, color:BG, fontSize:13, fontWeight:600, cursor:"pointer" }}>New Tournament</button>
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
        {/* S091 (#127.6): emoji pills \u2192 Icon + CSS dot (no-emoji rule). */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: A + "1a", color: A }}><Icon name="grid" size={10} />Round Robin</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: PU + "1a", color: PU }}>{scoredM}/{totalM} scored</span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: DG + "26", color: DG }}><span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background: DG }}/>LIVE</span>
        </div>
      </div>

      <div style={{ background: CD, borderRadius: 14, border: "1px solid " + A + "30", padding: 14, marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: A, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Group Standings</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            {/* S091 (#127.6): columns MP / MW / ML / T / PTS / GD */}
            <thead><tr>
              {["Team","MP","MW","ML","T","PTS","GD"].map(h=><th key={h} style={{ fontSize:10, fontWeight:600, color:MT, textTransform:"uppercase", padding:"6px 6px", textAlign:h==="Team"?"left":"center", borderBottom:"1px solid "+BD }}>{h}</th>)}
            </tr></thead>
            <tbody>{standings.map((t,i) => (
              <tr key={t.name} style={{ borderBottom: i<standings.length-1?"1px solid "+BD+"40":"none" }}>
                <td style={{ padding:"8px 6px", fontSize:12, fontWeight:600, color: i===0?GD:TX }}>{i+1}. {t.name}</td>
                <td style={{ padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:MT, textAlign:"center" }}>{t.played}</td>
                <td style={{ padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:A, textAlign:"center" }}>{t.wins}</td>
                <td style={{ padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:DG, textAlign:"center" }}>{t.losses}</td>
                <td style={{ padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:MT, textAlign:"center" }}>{t.draws}</td>
                <td style={{ padding:"8px 6px", fontSize:12, fontWeight:700, fontFamily:"JetBrains Mono", color:i===0?GD:TX, textAlign:"center" }}>{t.pts}</td>
                <td style={{ padding:"8px 6px", fontSize:11, fontFamily:"JetBrains Mono", color:MT, textAlign:"center" }}>{t.pf-t.pa>0?"+"+(t.pf-t.pa):t.pf-t.pa}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* S091 (#127.6): round cards re-styled to match Americano (gm-* classes) —
          player avatars + names per side, centered score steppers, win highlight.
          Team names retained as a small caption above each side for RR identity. */}
      {allRounds.map((round, ri) => {
        const matches = round.matches || [];
        return (
          <div key={ri} className="gm-rndcard">
            <div className="gm-rnd-h">
              <span className="gm-rnd-h-t">Round {ri + 1}</span>
            </div>
            {matches.map((m, mi) => {
              const key = "rr-" + ri + "-" + mi;
              const sc = tournament.scores?.[key];
              const tA = (m.team_a || []).filter(Boolean);
              const tB = (m.team_b || []).filter(Boolean);
              return (
                <div key={mi} className="gm-mtch">
                  <div className="gm-mtch-grid">
                    <div className={`gm-team l ${sc && sc.a > sc.b ? "win" : ""}`}>
                      <span className="gm-rr-tname">{m.team_a_name}</span>
                      {tA.map(p => { const pl=(players||[]).find(x=>x.id===p); return (
                        <div key={p} className="gm-tp">
                          <span className="gm-tp-avi">{pl?.avatar_url ? <img src={pl.avatar_url} alt=""/> : (getName(p)||"?")[0].toUpperCase()}</span>
                          <span className="gm-tp-n">{getName(p)}</span>
                        </div>); })}
                    </div>
                    <div className="gm-mtch-sc">
                      <ScoreStepper value={sc?.a||0} aColor={A} size={28} ariaLabel={`${m.team_a_name} score`} onChange={(n)=>recordRRScore(ri,mi,n,sc?.b||0)}/>
                      <ScoreStepper value={sc?.b||0} aColor={DG} size={28} ariaLabel={`${m.team_b_name} score`} onChange={(n)=>recordRRScore(ri,mi,sc?.a||0,n)}/>
                    </div>
                    <div className={`gm-team r ${sc && sc.b > sc.a ? "win" : ""}`}>
                      <span className="gm-rr-tname">{m.team_b_name}</span>
                      {tB.map(p => { const pl=(players||[]).find(x=>x.id===p); return (
                        <div key={p} className="gm-tp">
                          <span className="gm-tp-avi">{pl?.avatar_url ? <img src={pl.avatar_url} alt=""/> : (getName(p)||"?")[0].toUpperCase()}</span>
                          <span className="gm-tp-n">{getName(p)}</span>
                        </div>); })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{ background: CD, borderRadius: 12, border: "1px solid " + BD, padding: 14, marginBottom: 12 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, color: MT, marginBottom: 6, display:"flex", alignItems:"center", gap:6 }}><Icon name="info" size={12}/> How it works</h4>
        <p style={{ fontSize: 11, color: MT, lineHeight: 1.6 }}>Win = 3 pts, Draw = 1 pt, Loss = 0 pts. Ties broken by goal difference, then goals scored.</p>
      </div>

      {/* S091 (#127.6): the tournament no longer auto-ends — a hint appears once every
          match is scored so the user knows to finalize via End Tournament. */}
      {allScored && <div style={{ fontSize: 11, color: A, textAlign: "center", marginBottom: 8, fontWeight: 600 }}>All matches scored — tap End Tournament to see the final results.</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <ConfirmButton title="End tournament?" message="This finalizes the standings and closes the tournament." confirmLabel="End" cancelLabel="Cancel" danger onConfirm={endTournament} style={{ flex:1, padding:12, borderRadius:12, border:"1px solid "+DG+"40", background:"transparent", color:DG, fontSize:13, fontWeight:600, cursor:"pointer" }}>End Tournament</ConfirmButton>
        {confirmDelete ? <div style={{ display:"flex", gap:4, flex:1 }}><button onClick={()=>{deleteTournament();setConfirmDelete(false);}} style={{ flex:1, padding:12, borderRadius:12, background:DG, border:"none", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>Confirm Delete</button><button onClick={()=>setConfirmDelete(false)} style={{ flex:1, padding:12, borderRadius:12, border:"1px solid "+BD, background:"transparent", color:MT, fontSize:13, cursor:"pointer" }}>Cancel</button></div> : <button onClick={()=>setConfirmDelete(true)} style={{ flex:1, padding:12, borderRadius:12, border:"1px solid "+DG+"20", background:"transparent", color:MT, fontSize:13, fontWeight:600, cursor:"pointer" }}>Delete</button>}
      </div>
    </div>
  );
}
