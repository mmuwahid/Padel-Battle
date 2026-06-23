import React from "react";
import { win, formatTeam, formatDate } from "../utils/helpers";

// S100 #150: shared last-5 match list for a single player. Extracted verbatim
// from the ProfileView "Recent Matches" block so the same rows render on
// another player's drill-down (PlayerStats) — issue #150. Filters the full
// match array to the given player, newest first, capped at 5.
// Renders the row list only; each caller supplies its own section header so it
// fits the surrounding visual system (ProfileView .ach-sec vs PlayerStats .dpro-sec).
export function RecentMatches({ playerId, matches, getName }) {
  const recent = (matches || [])
    .filter(m => m.team_a.includes(playerId) || m.team_b.includes(playerId))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recent.length === 0) {
    return <p style={{ fontSize: 12, color: "#9090a4", padding: "4px 0" }}>No matches yet</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {recent.map(m => {
        const w = win(m.sets);
        const pTeam = m.team_a.includes(playerId) ? "A" : "B";
        const won = w === pTeam;
        return (
          <div key={m.id} style={{ padding: "13px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: won ? "var(--accent)" : "var(--danger)", background: won ? "var(--accent-dim)" : "rgba(248,113,113,.10)", padding: "4px 9px", borderRadius: "var(--r-sm)", fontFamily: "var(--mono)", letterSpacing: ".06em", flexShrink: 0 }}>
              {won ? "WIN" : "LOSS"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* S100 #150: day/date now sits as a header line ABOVE the player names. */}
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#9090a4", letterSpacing: ".05em", marginBottom: 3 }}>{formatDate(m.date)}</div>
              <div style={{ fontFamily: "var(--font)", fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatTeam(getName(m.team_a[0]), getName(m.team_a[1]))} vs {formatTeam(getName(m.team_b[0]), getName(m.team_b[1]))}</div>
            </div>
            {/* S100 #150: match result (set scores) moved to the far right. */}
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
              {m.sets.map((s, i) => { const pWon = pTeam === "A" ? s[0] > s[1] : s[1] > s[0]; return <span key={i} style={{ color: pWon ? "var(--accent)" : "var(--danger)" }}>{s[0]}-{s[1]}</span>; })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
