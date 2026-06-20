import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, PU } from '../theme';
import { generateAmericanoSchedule, generateMexicanoRound } from '../utils/tournaments';
import { ConfirmButton } from './ConfirmModal';
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
      <div>
        <div className="gm-actbar">
          <div className="gm-actl">
            <span className="gm-h-eyebrow">{isMex ? "Mexicano" : "Americano"}</span>
            <h1 className="gm-acttitle">{tournament.players.length} Players</h1>
            <p className="gm-actsub">{scored}/{totalMatches} scored &middot; Round {allRounds.length}</p>
          </div>
          <div className="gm-actr">
            <ConfirmButton className="gm-actbtn dng" title="End tournament?" message="This finalizes the standings and closes the tournament." confirmLabel="End" cancelLabel="Cancel" danger onConfirm={endTournament}>End</ConfirmButton>
            {confirmDelete ? (
              <>
                <button className="gm-actbtn dng solid" onClick={() => { deleteTournament(); setConfirmDelete(false); }}>Confirm</button>
                <button className="gm-actbtn" onClick={() => setConfirmDelete(false)}>No</button>
              </>
            ) : (
              <button className="gm-actbtn" onClick={() => setConfirmDelete(true)}>Delete</button>
            )}
          </div>
        </div>

        <div className="gm-body">
          <div className="gm-stand">
            <div className="gm-stand-h"><Icon name="trophy" size={12} /> Live Standings</div>
            {leaderboard.map((p, i) => {
              const rankCls = i === 0 ? "g" : i === 1 ? "s" : i === 2 ? "b" : "";
              return (
                <div key={p.pid} className="gm-stand-row">
                  <span className={`gm-stand-rank ${rankCls}`}>{i + 1}</span>
                  <span className="gm-stand-avi">{(()=>{const pl=(players||[]).find(x=>x.id===p.pid);return pl?.avatar_url?<img src={pl.avatar_url} alt=""/>:(getName(p.pid)||"?")[0].toUpperCase();})()}</span>
                  <span className="gm-stand-name">{getName(p.pid)}</span>
                  <span className={`gm-stand-pts ${i === 0 ? "g" : ""}`}>{p.points}</span>
                </div>
              );
            })}
          </div>

          {isMex && lastRoundDone && (
            <button className="gm-startbtn" onClick={nextMexicanoRound}>
              <Icon name="refresh" size={14} />
              Generate Next Round
            </button>
          )}

          {allRounds.map((round, ri) => {
            const matches = round.matches || [];
            return (
              <div key={ri} className="gm-rndcard">
                <div className="gm-rnd-h">
                  <span className="gm-rnd-h-t">Round {ri + 1}</span>
                  {round.sitting && <span className="gm-sit">Sitting: {getName(round.sitting)}</span>}
                </div>
                {matches.map((match, mi) => {
                  const key = `${ri}-${mi}`;
                  const sc = tournament.scores[key];
                  const tA = match.teamA || [];
                  const tB = match.teamB || [];
                  return (
                    <div key={mi} className="gm-mtch">
                      <div className="gm-mtch-grid">
                        <div className={`gm-team l ${sc && sc.a > sc.b ? "win" : ""}`}>
                          {tA.map(p => { const pl=(players||[]).find(x=>x.id===p); return (
                            <div key={p} className="gm-tp">
                              <span className="gm-tp-avi">{pl?.avatar_url ? <img src={pl.avatar_url} alt=""/> : (getName(p)||"?")[0].toUpperCase()}</span>
                              <span className="gm-tp-n">{getName(p)}</span>
                            </div>); })}
                        </div>
                        <div className="gm-mtch-sc">
                          <ScoreStepper value={sc?.a || 0} max={ptsPerRound} aColor={A} size={28} ariaLabel="Team A points" onChange={(n) => recordScore(ri, mi, n, ptsPerRound - n)} />
                          <ScoreStepper value={sc?.b || 0} max={ptsPerRound} aColor={DG} size={28} ariaLabel="Team B points" onChange={(n) => recordScore(ri, mi, ptsPerRound - n, n)} />
                        </div>
                        <div className={`gm-team r ${sc && sc.b > sc.a ? "win" : ""}`}>
                          {tB.map(p => { const pl=(players||[]).find(x=>x.id===p); return (
                            <div key={p} className="gm-tp">
                              <span className="gm-tp-avi">{pl?.avatar_url ? <img src={pl.avatar_url} alt=""/> : (getName(p)||"?")[0].toUpperCase()}</span>
                              <span className="gm-tp-n">{getName(p)}</span>
                            </div>); })}
                        </div>
                      </div>
                      {match.court && <span className="gm-mtch-court"><svg width="12" height="10" viewBox="0 0 30 24" fill="none" stroke="currentColor" strokeWidth="2.4"><rect x="2" y="2" width="26" height="20" rx="1.5"/><line x1="15" y1="2" x2="15" y2="22"/><line x1="2" y1="12" x2="28" y2="12"/></svg>Court {match.court}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
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
      <div>
        <div className="gm-h">
          <span className="gm-h-eyebrow">Final Results</span>
          <h1 className="gm-h-title">{prevMode === "americano" ? "Americano" : "Mexicano"}</h1>
          <p className="gm-h-sub">Last tournament &middot; {prevLb.length} players</p>
        </div>
        <div className="gm-body">
          <div className="gm-stand">
            <div className="gm-stand-h"><Icon name="trophy" size={12} /> Final Standings</div>
            {prevLb.map((p, i) => {
              const rankCls = i === 0 ? "g" : i === 1 ? "s" : i === 2 ? "b" : "";
              return (
                <div key={p.pid} className="gm-stand-row">
                  <span className={`gm-stand-rank ${rankCls}`}>{i + 1}</span>
                  <span className="gm-stand-avi">{(()=>{const pl=(players||[]).find(x=>x.id===p.pid);return pl?.avatar_url?<img src={pl.avatar_url} alt=""/>:(getName(p.pid)||"?")[0].toUpperCase();})()}</span>
                  <span className="gm-stand-name">{getName(p.pid)}</span>
                  <span className={`gm-stand-pts ${i === 0 ? "g" : ""}`}>{p.points} pts</span>
                </div>
              );
            })}
          </div>
          <button className="gm-actbtn" style={{ alignSelf: "center" }} onClick={resetTournament}>Clear Results</button>
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

