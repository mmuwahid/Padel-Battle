import React, { useState } from "react";
import { useLeague } from '../LeagueContext';
import { AmericanoMode } from './AmericanoMode';
import { SingleElimination } from './SingleElimination';
import { DoubleElimination } from './DoubleElimination';
import { RoundRobin } from './RoundRobin';
import Icon from './Icon';

export function GameMode({ tournament, setTournament, sel }) {
  const { supabase, players, getName, leagueId, showToast } = useLeague();
  const [topTab, setTopTab] = useState("casual");
  const [screen, setScreen] = useState("selector");

  async function endTournament() {
    try {
      const { error } = await supabase.from("tournaments").update({ status: "complete" }).eq("id", tournament.id);
      if (error) throw error;
      setTournament({ ...tournament, status: "complete" });
    } catch (err) { if (showToast) showToast(err.message || "Failed to end tournament", "error"); }
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
    } catch (err) { if (showToast) showToast(err.message || "Failed to delete tournament", "error"); }
  }

  const sharedProps = { players, getName, supabase, leagueId, tournament, setTournament, sel, endTournament, resetTournament, deleteTournament, setScreen, showToast };

  if (tournament && (tournament.mode === "americano" || tournament.mode === "mexicano")) {
    return <AmericanoMode {...sharedProps} />;
  }
  if (screen === "se-setup" || (tournament && tournament.mode === "single_elimination")) {
    return <SingleElimination {...sharedProps} />;
  }
  if (screen === "de-setup" || (tournament && tournament.mode === "double_elimination")) {
    return <DoubleElimination {...sharedProps} />;
  }
  if (screen === "rr-setup" || (tournament && tournament.mode === "round_robin")) {
    return <RoundRobin {...sharedProps} />;
  }

  return (
    <div>
      <div className="gm-h">
        <span className="gm-h-eyebrow">Tournaments</span>
        <h1 className="gm-h-title">Game Mode</h1>
        <p className="gm-h-sub">Choose your format</p>
      </div>

      <div className="seg gm-seg">
        <button className={`sb ${topTab === "casual" ? "on" : ""}`} onClick={() => setTopTab("casual")}>Casual</button>
        <button className={`sb ${topTab === "competitive" ? "on" : ""}`} onClick={() => setTopTab("competitive")}>Competitive</button>
      </div>

      {topTab === "casual" && <AmericanoMode {...sharedProps} />}

      {topTab === "competitive" && (
        <div className="gm-body">
          <div className="gm-card" onClick={() => setScreen("se-setup")} role="button" tabIndex={0}>
            <div className="gm-card-hd">
              <div className="gm-card-ico"><Icon name="trophy" size={20} /></div>
              <div className="gm-card-tw">
                <div className="gm-card-title">Single Elimination</div>
                <span className="gm-card-tag">Knockout</span>
              </div>
              <span className="gm-card-chev"><Icon name="chevron" size={16} /></span>
            </div>
            <p className="gm-card-sub">Lose once, you're out. Classic knockout bracket — high stakes, fast resolution. Best for 4–16 teams.</p>
          </div>

          <div className="gm-card" onClick={() => setScreen("de-setup")} role="button" tabIndex={0}>
            <div className="gm-card-hd">
              <div className="gm-card-ico"><Icon name="refresh" size={20} /></div>
              <div className="gm-card-tw">
                <div className="gm-card-title">Double Elimination</div>
                <span className="gm-card-tag">Two chances</span>
              </div>
              <span className="gm-card-chev"><Icon name="chevron" size={16} /></span>
            </div>
            <p className="gm-card-sub">Winners and losers brackets. One loss sends you to the losers bracket. Two losses and you're out.</p>
          </div>

          <div className="gm-card" onClick={() => setScreen("rr-setup")} role="button" tabIndex={0}>
            <div className="gm-card-hd">
              <div className="gm-card-ico"><Icon name="award" size={20} /></div>
              <div className="gm-card-tw">
                <div className="gm-card-title">Round Robin</div>
                <span className="gm-card-tag">Everyone plays</span>
              </div>
              <span className="gm-card-chev"><Icon name="chevron" size={16} /></span>
            </div>
            <p className="gm-card-sub">All teams play each other. Final standings by wins, then point differential. Fairest format.</p>
          </div>
        </div>
      )}
    </div>
  );
}
