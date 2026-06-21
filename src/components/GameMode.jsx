import React, { useState } from "react";
import { useLeague } from '../LeagueContext';
import { AmericanoMode } from './AmericanoMode';
import { SingleElimination } from './SingleElimination';
import { DoubleElimination } from './DoubleElimination';
import { RoundRobin } from './RoundRobin';
import Icon from './Icon';

// Format rules — split per tab (Casual = Americano/Mexicano, Competitive = RR/SE/DE).
const CASUAL_FORMAT_RULES = [
  {
    id: "fmt-americano",
    title: "Americano",
    icon: "target",
    preview: "Rotating partners — everyone plays everyone",
    content: "Casual round-robin format. Partners rotate each round so you play with every other player at least once. Points accumulate INDIVIDUALLY across all rounds — partner doesn't matter for ranking. Best for groups of 4–8 looking for a relaxed session. Player with most total points wins.",
    tags: [{ l: "Quick session", c: "g" }, { l: "Individual scoring", c: "g" }, { l: "Partner rotates", c: "go" }],
  },
  {
    id: "fmt-mexicano",
    title: "Mexicano",
    icon: "trending-up",
    preview: "Adaptive matchmaking by current standings",
    content: "Like Americano but pairings are recomputed each round based on the live leaderboard — top players face top players, mid faces mid. Keeps every match competitive instead of letting strong players steamroll. Each round starts when the previous is fully scored. Same individual point scoring as Americano.",
    tags: [{ l: "Adaptive pairings", c: "g" }, { l: "Balanced matches", c: "g" }, { l: "Re-seeded each round", c: "go" }],
  },
];

const COMPETITIVE_FORMAT_RULES = [
  {
    id: "fmt-single-elim",
    title: "Single Elimination",
    icon: "trophy",
    preview: "Lose once, you're out",
    content: "Classic knockout bracket. Lose a match and you're done — winners advance until one team is left. Fast, high-stakes resolution. Best for 4, 8, or 16 teams (powers of 2). Bye rounds applied to top seeds when team count isn't a power of 2.",
    tags: [{ l: "Fastest format", c: "g" }, { l: "Single loss = out", c: "r" }, { l: "Best 4–16 teams", c: "go" }],
  },
  {
    id: "fmt-double-elim",
    title: "Double Elimination",
    icon: "refresh",
    preview: "Two chances — winners + losers brackets",
    content: "Lose once → drop to the losers bracket but stay alive. Lose twice → eliminated. Final = winners-bracket champion vs losers-bracket champion. If the losers-bracket team wins the final, a 'true final' rematch may be required (winners-bracket team has only lost once). Roughly 2× the matches of single elimination.",
    tags: [{ l: "Second chance", c: "g" }, { l: "Two losses = out", c: "r" }, { l: "More matches", c: "go" }],
  },
  {
    id: "fmt-round-robin",
    title: "Round Robin",
    icon: "grid",
    preview: "Every team plays every other team",
    content: "Fixed teams (you pick partners up front). Every team plays every other team exactly once. Final standings ranked by wins, then by point differential as tiebreaker. Most matches of any format, fairest for ranking purposes.",
    tags: [{ l: "Fixed teams", c: "g" }, { l: "Wins → diff tiebreak", c: "g" }, { l: "Most matches", c: "go" }],
  },
];

function FormatRuleCard({ rule }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rcard${open ? " open" : ""}`} onClick={() => setOpen(v => !v)}>
      <div className="rchd">
        <div className="rcico">
          <Icon name={rule.icon} size={16} color="var(--accent)" />
        </div>
        <div className="rctw">
          <div className="rct">{rule.title}</div>
          {!open && rule.preview && <div className="rcprev">{rule.preview}</div>}
        </div>
        <div className="rcchev">
          <Icon name="chevron" size={14} color="currentColor" />
        </div>
      </div>
      <div className={`rcbody ${open ? "op" : "cl"}`}>
        <div className="rccont">
          <div className="rcontent">{rule.content}</div>
          {rule.tags && rule.tags.length > 0 && (
            <div className="rtags">
              {rule.tags.map((t, i) => (
                <span key={i} className={`rtag ${t.c || "g"}`}>{t.l}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function GameMode({ tournament, setTournament, sel }) {
  const { supabase, players, getName, leagueId, showToast } = useLeague();
  const [topTab, setTopTab] = useState("casual");
  const [screen, setScreen] = useState("selector");
  // S091 (#127): casual setup step lifted here so the Format Rules can be hidden
  // on the player-setup follow-up screen (they already show on the format picker).
  const [casualStep, setCasualStep] = useState("mode"); // "mode" | "setup"

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

  const sharedProps = { players, getName, supabase, leagueId, tournament, setTournament, sel, endTournament, resetTournament, deleteTournament, setScreen, showToast, casualStep, setCasualStep };

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

      {topTab === "casual" && (
        <>
          <AmericanoMode {...sharedProps} />
          {/* S091 (#127): Format Rules only on the format picker, not the player-setup step. */}
          {casualStep === "mode" && (
            <div className="gm-rules-sec">
              <div className="gm-rules-sec-h">
                <Icon name="book" size={14} />
                <span>Format Rules</span>
              </div>
              <div className="gm-rules-list">
                {CASUAL_FORMAT_RULES.map(rule => <FormatRuleCard key={rule.id} rule={rule} />)}
              </div>
            </div>
          )}
        </>
      )}

      {topTab === "competitive" && (
        <>
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
                <div className="gm-card-ico"><Icon name="grid" size={20} /></div>
                <div className="gm-card-tw">
                  <div className="gm-card-title">Round Robin</div>
                  <span className="gm-card-tag">Everyone plays</span>
                </div>
                <span className="gm-card-chev"><Icon name="chevron" size={16} /></span>
              </div>
              <p className="gm-card-sub">All teams play each other. Final standings by wins, then point differential. Fairest format.</p>
            </div>
          </div>
          <div className="gm-rules-sec">
            <div className="gm-rules-sec-h">
              <Icon name="book" size={14} />
              <span>Format Rules</span>
            </div>
            <div className="gm-rules-list">
              {COMPETITIVE_FORMAT_RULES.map(rule => <FormatRuleCard key={rule.id} rule={rule} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
