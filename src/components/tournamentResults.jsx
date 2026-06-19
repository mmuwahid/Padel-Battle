import React from "react";
import { CD2, MT } from "../theme";

// Shared helpers for tournament final-results screens (SE / DE / RR).
// rankBadge: 🏆/🥈/🥉 for top three, plain number otherwise.
// TeamPlayers: avatar + name chips for a team's players (matches the avatar
// treatment used across the rest of the app — players[].avatar_url).
export const rankBadge = (i) =>
  i === 0 ? "\uD83C\uDFC6" : i === 1 ? "\uD83E\uDD48" : i === 2 ? "\uD83E\uDD49" : String(i + 1);

export function TeamPlayers({ playerIds, players, getName, size = 22, fontSize = 12, color = MT, weight = 600, justify = "flex-start" }) {
  const ids = (playerIds || []).filter(Boolean);
  if (!ids.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: justify, flexWrap: "wrap" }}>
      {ids.map((pid) => {
        const p = players?.find(pp => pp.id === pid);
        const nm = getName(pid);
        const avatar = p?.avatar_url;
        return (
          <div key={pid} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            {avatar
              ? <img src={avatar} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: size, height: size, borderRadius: "50%", background: CD2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.45), fontWeight: 700, color: MT, flexShrink: 0 }}>{(nm || "?").charAt(0).toUpperCase()}</div>}
            <span style={{ fontSize, fontWeight: weight, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm}</span>
          </div>
        );
      })}
    </div>
  );
}
