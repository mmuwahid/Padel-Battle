import React, { useState } from "react";
import { A, BG, CD, BD, TX, MT, DG, GD, PU } from '../theme';
import { AmericanoMode } from './AmericanoMode';
import { SingleElimination } from './SingleElimination';
import { DoubleElimination } from './DoubleElimination';
import { RoundRobin } from './RoundRobin';

// ══════════════════════════════════════
// MAIN COMPONENT — Orchestrator
// ══════════════════════════════════════
export function GameMode({ players, getName, supabase, leagueId, tournament, setTournament, sel }) {
  const [topTab, setTopTab] = useState("casual"); // "casual" | "competitive"
  const [screen, setScreen] = useState("selector"); // selector | se-setup/active | de-setup/active | rr-setup/active

  // ── Shared helpers ──
  async function endTournament() {
    try {
      const { error } = await supabase.from("tournaments").update({ status: "complete" }).eq("id", tournament.id);
      if (error) throw error;
      setTournament({ ...tournament, status: "complete" });
    } catch (err) { }
  }

  function resetTournament() {
    setTournament(null);
    setScreen("selector");
  }

  async function deleteTournament() {
    if (!tournament) return;
    try {
      const { error } = await supabase.from("tournaments").delete().eq("id", tournament.id);
      if (error) throw error;
      setTournament(null);
      setScreen("selector");
    } catch (err) { }
  }

  // ── Shared props for all tournament components ──
  const sharedProps = { players, getName, supabase, leagueId, tournament, setTournament, sel, endTournament, resetTournament, deleteTournament, setScreen };

  // ════════════════════════════════════
  // ROUTE: Active Americano / Mexicano
  // ════════════════════════════════════
  if (tournament && (tournament.mode === "americano" || tournament.mode === "mexicano")) {
    return <AmericanoMode {...sharedProps} />;
  }

  // ════════════════════════════════════
  // ROUTE: Single Elimination (setup or active)
  // ════════════════════════════════════
  if (screen === "se-setup" || (tournament && tournament.mode === "single_elimination")) {
    return <SingleElimination {...sharedProps} />;
  }

  // ════════════════════════════════════
  // ROUTE: Double Elimination (setup or active)
  // ════════════════════════════════════
  if (screen === "de-setup" || (tournament && tournament.mode === "double_elimination")) {
    return <DoubleElimination {...sharedProps} />;
  }

  // ════════════════════════════════════
  // ROUTE: Round Robin (setup or active)
  // ════════════════════════════════════
  if (screen === "rr-setup" || (tournament && tournament.mode === "round_robin")) {
    return <RoundRobin {...sharedProps} />;
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
        <AmericanoMode {...sharedProps} />
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

          {/* Double Elimination */}
          <div onClick={() => setScreen("de-setup")} style={{ background: CD, border: `1px solid ${BD}`, borderRadius: 14, padding: 18, marginBottom: 12, cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{"\uD83D\uDD04"}</span>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Double Elimination</h3>
            </div>
            <p style={{ fontSize: 12, color: GD, fontWeight: 600, marginBottom: 6, marginLeft: 34 }}>Two chances to compete</p>
            <p style={{ fontSize: 11, color: MT, lineHeight: 1.6, marginLeft: 34 }}>Winners and losers brackets. One loss sends you to the losers bracket. Two losses and you're out.</p>
          </div>

          {/* Round Robin */}
          <div onClick={() => setScreen("rr-setup")} style={{ background: CD, border: `1px solid ${BD}`, borderRadius: 14, padding: 18, marginBottom: 12, cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{"\uD83D\uDCCA"}</span>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Round Robin</h3>
            </div>
            <p style={{ fontSize: 12, color: GD, fontWeight: 600, marginBottom: 6, marginLeft: 34 }}>Everyone plays everyone</p>
            <p style={{ fontSize: 11, color: MT, lineHeight: 1.6, marginLeft: 34 }}>All teams play each other. Final standings by wins, then point differential. Fairest format, most total matches.</p>
          </div>
        </div>
      )}
    </div>
  );
}
