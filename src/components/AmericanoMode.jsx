import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, PU } from '../theme';
import { generateAmericanoSchedule, generateMexicanoRound } from '../utils/tournaments';
import { ScoreStepper } from './ScoreStepper';
import Icon from './Icon';

export function AmericanoMode({ players, getName, supabase, leagueId, tournament, setTournament, sel, endTournament, resetTournament, deleteTournament, showToast }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  // ── State ──
  const [selPlayers, setSelP] = useState([]);
  const [courts, setCourts] = useState(2);
  const [ptsPerRound, setPPR] = useState(24);
  const [casualMode, setCasualMode] = useState("americano");

  // ── Existing Americano / Mexicano logic ──
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
      if (showToast) showToast(err.message || "Failed to start tournament", "error");
    }
  }

  async function recordScore(roundIdx, matchIdx, scoreA, scoreB) {
    const newScores = { ...tournament.scores, [`${roundIdx}-${matchIdx}`]: { a: scoreA, b: scoreB } };
    try {
      const { error } = await supabase.from("tournaments").update({ scores: newScores }).eq("id", tournament.id);
      if (error) throw error;
      setTournament({ ...tournament, scores: newScores });
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to save score", "error");
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
      if (showToast) showToast(err.message || "Failed to start next round", "error");
    }
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
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => { if (confirm("End tournament?")) endTournament(); }} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${DG}40`, color: DG, background: "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>End</button>
            {confirmDelete ? <><button onClick={() => { deleteTournament(); setConfirmDelete(false); }} style={{ padding: "6px 10px", borderRadius: 8, background: DG, border: "none", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Confirm</button><button onClick={() => setConfirmDelete(false)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BD}`, background: "transparent", color: MT, fontSize: 11, cursor: "pointer" }}>No</button></> : <button onClick={() => setConfirmDelete(true)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${DG}20`, color: MT, background: "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Delete</button>}
          </div>
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
                      <ScoreStepper value={sc?.a||0} max={ptsPerRound} aColor={A} ariaLabel="Team A points" onChange={(n)=>recordScore(ri,mi,n,ptsPerRound-n)}/>
                      <span style={{ color: MT, fontWeight: 700, fontSize: 12 }}>-</span>
                      <ScoreStepper value={sc?.b||0} max={ptsPerRound} aColor={DG} ariaLabel="Team B points" onChange={(n)=>recordScore(ri,mi,ptsPerRound-n,n)}/>
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
  // RENDER: Casual Selector UI (default — no active tournament)
  // ════════════════════════════════════
  const enough = selPlayers.length >= 4;
  return (
    <div className="gm-body">
      {/* Mode picker — Americano */}
      <div className={`gm-card ${casualMode === "americano" ? "on" : ""}`} onClick={() => setCasualMode("americano")} role="button" tabIndex={0}>
        <div className="gm-card-hd">
          <div className="gm-card-ico"><Icon name="target" size={20} /></div>
          <div className="gm-card-tw">
            <div className="gm-card-title">Americano</div>
            <span className="gm-card-tag">Quick session</span>
          </div>
        </div>
        <p className="gm-card-sub">Rotating partners — play with everyone. Points accumulate individually across rounds.</p>
      </div>

      {/* Mode picker — Mexicano */}
      <div className={`gm-card ${casualMode === "mexicano" ? "on gold" : ""}`} onClick={() => setCasualMode("mexicano")} role="button" tabIndex={0}>
        <div className="gm-card-hd">
          <div className="gm-card-ico"><Icon name="trending-up" size={20} /></div>
          <div className="gm-card-tw">
            <div className="gm-card-title">Mexicano</div>
            <span className="gm-card-tag">Adaptive</span>
          </div>
        </div>
        <p className="gm-card-sub">Dynamic matchmaking based on standings. Balanced matches every round.</p>
      </div>

      {/* Player selection */}
      <div className="gm-pblk">
        <div className="gm-plbl-row">
          <span className="gm-plbl">Players ({selPlayers.length} selected)</span>
          <button className="gm-plink" onClick={() => setSelP(selPlayers.length === players.length ? [] : players.map(p => p.id))}>
            {selPlayers.length === players.length ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="gm-pwrap">
          {players.map(p => {
            const on = selPlayers.includes(p.id);
            return (
              <button
                key={p.id}
                className={`gm-pchip ${on ? "on" : ""}`}
                onClick={() => setSelP(on ? selPlayers.filter(x => x !== p.id) : [...selPlayers, p.id])}
              >
                {p.nickname || p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Courts & Points */}
      <div className="gm-grid2">
        <div className="gm-fld">
          <span className="gm-fld-lbl">Courts</span>
          <select className="gm-fld-sel" value={courts} onChange={e => setCourts(+e.target.value)}>
            {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="gm-fld">
          <span className="gm-fld-lbl">Points / Round</span>
          <select className="gm-fld-sel" value={ptsPerRound} onChange={e => setPPR(+e.target.value)}>
            {[16, 20, 24, 32].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Start button */}
      <button
        className={`gm-startbtn ${enough ? "" : "off"}`}
        onClick={startCasualTournament}
        disabled={!enough}
      >
        <Icon name="zap" size={14} />
        Start {casualMode === "americano" ? "Americano" : "Mexicano"} ({selPlayers.length} players)
      </button>
      {!enough && <div className="gm-hint">Select at least 4 players to start</div>}
    </div>
  );
}

