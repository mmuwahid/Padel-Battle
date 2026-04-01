import React from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, PU } from '../theme';

export function BracketSVG({ bracket, getName, scores, onSaveScore }) {
  const rounds = bracket || [];
  if (!rounds.length) return null;

  const matchH = 48, matchGap = 16, slotH = 22, slotR = 6;
  const colW = 135, matchW = 110, lineColor = BD, padX = 4;

  const numRounds = rounds.length;
  const maxMatches = rounds[0]?.matches?.length || 1;
  const svgW = numRounds * colW + 20;
  const svgH = Math.max(maxMatches * (matchH + matchGap) + 60, 200);

  const roundLabels = numRounds === 1 ? ["FINAL"]
    : numRounds === 2 ? ["SEMIFINALS", "FINAL"]
    : numRounds === 3 ? ["QUARTERFINALS", "SEMIFINALS", "FINAL"]
    : rounds.map((_, i) => i === numRounds - 1 ? "FINAL" : `ROUND ${i + 1}`);

  // Compute Y positions for each match in each round
  const positions = [];
  for (let ri = 0; ri < numRounds; ri++) {
    const ms = rounds[ri]?.matches || [];
    const arr = [];
    if (ri === 0) {
      const totalH = ms.length * matchH + (ms.length - 1) * matchGap;
      const startY = (svgH - totalH) / 2 + 20;
      for (let mi = 0; mi < ms.length; mi++) {
        arr.push(startY + mi * (matchH + matchGap));
      }
    } else {
      // Center between the two source matches
      const prev = positions[ri - 1];
      for (let mi = 0; mi < ms.length; mi++) {
        const srcA = prev[mi * 2] ?? prev[prev.length - 1];
        const srcB = prev[mi * 2 + 1] ?? srcA;
        arr.push((srcA + srcB) / 2);
      }
    }
    positions.push(arr);
  }

  const elements = [];

  // Draw connecting lines
  for (let ri = 1; ri < numRounds; ri++) {
    const prevX = padX + (ri - 1) * colW + matchW;
    const curX = padX + ri * colW;
    const curMs = rounds[ri]?.matches || [];
    for (let mi = 0; mi < curMs.length; mi++) {
      const srcA = positions[ri - 1][mi * 2];
      const srcB = positions[ri - 1][mi * 2 + 1];
      const dst = positions[ri][mi];
      if (srcA != null) {
        const midYa = srcA + matchH / 2;
        const midX = prevX + (curX - prevX) / 2;
        elements.push(
          <line key={`la-${ri}-${mi}`} x1={prevX} y1={midYa} x2={midX} y2={midYa} stroke={lineColor} strokeWidth={1.5} />,
          <line key={`lav-${ri}-${mi}`} x1={midX} y1={midYa} x2={midX} y2={dst + matchH / 2} stroke={lineColor} strokeWidth={1.5} />
        );
      }
      if (srcB != null) {
        const midYb = srcB + matchH / 2;
        const midX = prevX + (curX - prevX) / 2;
        elements.push(
          <line key={`lb-${ri}-${mi}`} x1={prevX} y1={midYb} x2={midX} y2={midYb} stroke={lineColor} strokeWidth={1.5} />,
          <line key={`lbv-${ri}-${mi}`} x1={midX} y1={midYb} x2={midX} y2={dst + matchH / 2} stroke={lineColor} strokeWidth={1.5} />
        );
      }
      elements.push(
        <line key={`lc-${ri}-${mi}`} x1={prevX + (curX - prevX) / 2} y1={dst + matchH / 2} x2={curX} y2={dst + matchH / 2} stroke={lineColor} strokeWidth={1.5} />
      );
    }
  }

  // Draw rounds
  for (let ri = 0; ri < numRounds; ri++) {
    const x = padX + ri * colW;
    const ms = rounds[ri]?.matches || [];
    const isFinal = ri === numRounds - 1;
    const labelColor = isFinal ? GD : MT;

    elements.push(
      <text key={`rl-${ri}`} x={x + matchW / 2} y={positions[ri][0] - 10} fill={labelColor} fontFamily="Outfit" fontSize={9} fontWeight={isFinal ? 700 : 600} textAnchor="middle">
        {roundLabels[ri]}
      </text>
    );

    for (let mi = 0; mi < ms.length; mi++) {
      const m = ms[mi];
      const y = positions[ri][mi];
      const sc = scores[`${ri}-${mi}`];
      const teamAName = m.team_a ? m.team_a.filter(Boolean).map(pid => getName(pid)).join(" x ") : "TBD";
      const teamBName = m.team_b ? m.team_b.filter(Boolean).map(pid => getName(pid)).join(" x ") : "TBD";
      const isBye = !m.team_b;
      const hasScore = sc && sc.a != null && sc.b != null;
      const aWins = hasScore && sc.a > sc.b;
      const bWins = hasScore && sc.b > sc.a;
      const inProgress = !hasScore && !isBye && m.team_a && m.team_b;

      // Top slot (team A)
      const strokeA = aWins ? A : bWins ? BD : inProgress ? PU : isFinal ? GD : BD;
      elements.push(
        <rect key={`ra-${ri}-${mi}`} x={x} y={y} width={matchW} height={slotH} rx={slotR} fill={CD} stroke={strokeA} strokeWidth={inProgress || isFinal ? 1.5 : 1} />
      );
      elements.push(
        <text key={`ta-${ri}-${mi}`} x={x + 8} y={y + 15} fill={aWins ? A : bWins ? DG : TX} fontFamily="Outfit" fontSize={10} fontWeight={600} opacity={bWins ? 0.6 : 1}>
          {teamAName}
        </text>
      );
      if (hasScore) {
        elements.push(
          <text key={`sa-${ri}-${mi}`} x={x + matchW - 12} y={y + 15} fill={aWins ? A : DG} fontFamily="JetBrains Mono" fontSize={10} fontWeight={700} textAnchor="end" opacity={bWins ? 0.6 : 1}>
            {sc.a}
          </text>
        );
      } else if (!isBye) {
        elements.push(
          <text key={`sa-${ri}-${mi}`} x={x + matchW - 12} y={y + 15} fill={MT} fontFamily="JetBrains Mono" fontSize={10} fontWeight={600} textAnchor="end">{"\u2014"}</text>
        );
      }

      // Bottom slot (team B)
      const strokeB = bWins ? A : aWins ? BD : inProgress ? PU : isFinal ? GD : BD;
      elements.push(
        <rect key={`rb-${ri}-${mi}`} x={x} y={y + slotH + 2} width={matchW} height={slotH} rx={slotR} fill={CD} stroke={strokeB} strokeWidth={inProgress || isFinal ? 1.5 : 1} />
      );
      elements.push(
        <text key={`tb-${ri}-${mi}`} x={x + 8} y={y + slotH + 17} fill={bWins ? A : aWins ? DG : TX} fontFamily="Outfit" fontSize={10} fontWeight={600} opacity={aWins ? 0.6 : 1}>
          {isBye ? "BYE" : teamBName}
        </text>
      );
      if (hasScore) {
        elements.push(
          <text key={`sb-${ri}-${mi}`} x={x + matchW - 12} y={y + slotH + 17} fill={bWins ? A : DG} fontFamily="JetBrains Mono" fontSize={10} fontWeight={700} textAnchor="end" opacity={aWins ? 0.6 : 1}>
            {sc.b}
          </text>
        );
      } else if (!isBye) {
        elements.push(
          <text key={`sb-${ri}-${mi}`} x={x + matchW - 12} y={y + slotH + 17} fill={MT} fontFamily="JetBrains Mono" fontSize={10} fontWeight={600} textAnchor="end">{"\u2014"}</text>
        );
      }

      // Pulsing dot for in-progress matches
      if (inProgress) {
        elements.push(
          <circle key={`dot-${ri}-${mi}`} cx={x - 6} cy={y + matchH / 2} r={3} fill={PU}>
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
        );
      }

      // Trophy under final
      if (isFinal) {
        elements.push(
          <text key={`trophy-${ri}`} x={x + matchW / 2} y={y + matchH + 24} fill={GD} fontFamily="sans-serif" fontSize={20} textAnchor="middle">{"\uD83C\uDFC6"}</text>
        );
      }
    }
  }

  return (
    <div style={{ margin: "0 12px 16px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <svg width={svgW} height={svgH + 40} viewBox={`0 0 ${svgW} ${svgH + 40}`} style={{ display: "block" }}>
        {elements}
      </svg>
    </div>
  );
}
