import React from "react";
import { A } from "../theme";

export const CourtIcon = () => (<svg width="20" height="16" viewBox="0 0 30 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="2" width="24" height="20" rx="1"/><line x1="15" y1="2" x2="15" y2="22"/><line x1="3" y1="12" x2="27" y2="12"/><rect x="3" y="8" width="5" height="8" rx="0" fill="none"/><rect x="22" y="8" width="5" height="8" rx="0" fill="none"/></svg>);

export const PadelLogo = () => (<svg width="48" height="48" viewBox="0 0 80 80" fill="none">
  <ellipse cx="40" cy="28" rx="16" ry="20" stroke="#666" strokeWidth="3.5" fill="none"/>
  <circle cx="40" cy="28" r="5" fill={A}/>
  <circle cx="33" cy="20" r="2.5" fill={A}/><line x1="40" y1="28" x2="33" y2="20" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <circle cx="47" cy="20" r="2.5" fill={A}/><line x1="40" y1="28" x2="47" y2="20" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <circle cx="31" cy="30" r="2.5" fill={A}/><line x1="40" y1="28" x2="31" y2="30" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <circle cx="49" cy="30" r="2.5" fill={A}/><line x1="40" y1="28" x2="49" y2="30" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <circle cx="34" cy="37" r="2.5" fill={A}/><line x1="40" y1="28" x2="34" y2="37" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <circle cx="46" cy="37" r="2.5" fill={A}/><line x1="40" y1="28" x2="46" y2="37" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <circle cx="40" cy="17" r="2.5" fill={A}/><line x1="40" y1="28" x2="40" y2="17" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <rect x="37" y="47" width="6" height="14" rx="2.5" fill="#666"/>
  <line x1="38" y1="52" x2="42" y2="52" stroke="#888" strokeWidth="1"/><line x1="38" y1="55" x2="42" y2="55" stroke="#888" strokeWidth="1"/><line x1="38" y1="58" x2="42" y2="58" stroke="#888" strokeWidth="1"/>
</svg>);

// S072 redesign — 3D gold-orb hub with 6 orbiting satellite orbs.
// Design intent: a central pulsing gold orb (3D gradient — light highlight top,
// dark amber bottom) with 6 smaller satellite orbs orbiting around it. Subtle
// connecting lines + outer aura halo. Animations: center pulse, outer aura
// breathing, slow rotation on the satellite group, individual scale pulse on
// each satellite (staggered).
//
// Color palette: pure gold/bronze gradient using hub-orb-grad (mid #f59e0b,
// highlight #fde68a, shadow #92400e) for both the center hub and satellites,
// with a transparent aura via hub-aura-grad.
//
// Used at three sizes:
//   - 140px+ on AuthGate / LeagueGate / App.jsx loading splash (full effect)
//   - 26px in app header `.lm` slot via PadelHubMarkHeader (no aura)
//   - 32px static fallback in index.html splash (mirror this artwork there)
export const PadelHubMark = ({ size = 96 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="lhmark">
    <defs>
      <radialGradient id="hub-orb-grad" cx="35%" cy="28%" r="70%">
        <stop offset="0%"   stopColor="#fde68a"/>
        <stop offset="40%"  stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#78350f"/>
      </radialGradient>
      <radialGradient id="hub-sat-grad" cx="32%" cy="28%" r="72%">
        <stop offset="0%"   stopColor="#fef3c7"/>
        <stop offset="45%"  stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#92400e"/>
      </radialGradient>
      <radialGradient id="hub-aura-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.55"/>
        <stop offset="55%"  stopColor="#f59e0b" stopOpacity="0.18"/>
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
      </radialGradient>
    </defs>

    {/* Outer aura — pulsates softly */}
    <circle className="lhmark-aura" cx="50" cy="50" r="48" fill="url(#hub-aura-grad)"/>

    {/* Satellite group — slow orbit rotation around center */}
    <g className="lhmark-orbit" style={{transformOrigin:"50px 50px"}}>
      {/* 6 satellites at hexagonal positions, r=30 from center */}
      {/* Each: connector line + 3D orb + highlight reflection */}
      {/* Top */}
      <line x1="50" y1="50" x2="50" y2="20" stroke="#f59e0b" strokeWidth="0.7" opacity="0.32"/>
      <circle className="lhmark-sat" style={{animationDelay:"0ms",   transformOrigin:"50px 20px"}} cx="50" cy="20" r="6.2" fill="url(#hub-sat-grad)"/>
      <ellipse cx="48.5" cy="18.5" rx="1.8" ry="1.3" fill="#fef9c3" opacity="0.75"/>

      {/* Top-right */}
      <line x1="50" y1="50" x2="76" y2="35" stroke="#f59e0b" strokeWidth="0.7" opacity="0.32"/>
      <circle className="lhmark-sat" style={{animationDelay:"180ms", transformOrigin:"76px 35px"}} cx="76" cy="35" r="6.2" fill="url(#hub-sat-grad)"/>
      <ellipse cx="74.5" cy="33.5" rx="1.8" ry="1.3" fill="#fef9c3" opacity="0.75"/>

      {/* Bottom-right */}
      <line x1="50" y1="50" x2="76" y2="65" stroke="#f59e0b" strokeWidth="0.7" opacity="0.32"/>
      <circle className="lhmark-sat" style={{animationDelay:"360ms", transformOrigin:"76px 65px"}} cx="76" cy="65" r="6.2" fill="url(#hub-sat-grad)"/>
      <ellipse cx="74.5" cy="63.5" rx="1.8" ry="1.3" fill="#fef9c3" opacity="0.75"/>

      {/* Bottom */}
      <line x1="50" y1="50" x2="50" y2="80" stroke="#f59e0b" strokeWidth="0.7" opacity="0.32"/>
      <circle className="lhmark-sat" style={{animationDelay:"540ms", transformOrigin:"50px 80px"}} cx="50" cy="80" r="6.2" fill="url(#hub-sat-grad)"/>
      <ellipse cx="48.5" cy="78.5" rx="1.8" ry="1.3" fill="#fef9c3" opacity="0.75"/>

      {/* Bottom-left */}
      <line x1="50" y1="50" x2="24" y2="65" stroke="#f59e0b" strokeWidth="0.7" opacity="0.32"/>
      <circle className="lhmark-sat" style={{animationDelay:"720ms", transformOrigin:"24px 65px"}} cx="24" cy="65" r="6.2" fill="url(#hub-sat-grad)"/>
      <ellipse cx="22.5" cy="63.5" rx="1.8" ry="1.3" fill="#fef9c3" opacity="0.75"/>

      {/* Top-left */}
      <line x1="50" y1="50" x2="24" y2="35" stroke="#f59e0b" strokeWidth="0.7" opacity="0.32"/>
      <circle className="lhmark-sat" style={{animationDelay:"900ms", transformOrigin:"24px 35px"}} cx="24" cy="35" r="6.2" fill="url(#hub-sat-grad)"/>
      <ellipse cx="22.5" cy="33.5" rx="1.8" ry="1.3" fill="#fef9c3" opacity="0.75"/>
    </g>

    {/* Central 3D pulsing orb — top-left highlight ellipse for depth */}
    <circle className="lhmark-pulse" cx="50" cy="50" r="13" fill="url(#hub-orb-grad)"/>
    <ellipse cx="46" cy="45.5" rx="4.2" ry="3" fill="#fef9c3" opacity="0.55"/>
  </svg>
);

// S072 small variant — for app header .lm slot. No aura layer to avoid the
// "container box" effect on a 26px target. Only the central orb + satellites.
export const PadelHubMarkHeader = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="lhmark lhmark-sm">
    <defs>
      <radialGradient id="hub-orb-grad-sm" cx="35%" cy="28%" r="70%">
        <stop offset="0%"   stopColor="#fde68a"/>
        <stop offset="40%"  stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#78350f"/>
      </radialGradient>
      <radialGradient id="hub-sat-grad-sm" cx="32%" cy="28%" r="72%">
        <stop offset="0%"   stopColor="#fef3c7"/>
        <stop offset="50%"  stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#92400e"/>
      </radialGradient>
    </defs>
    <g className="lhmark-orbit" style={{transformOrigin:"50px 50px"}}>
      <circle cx="50" cy="20" r="7" fill="url(#hub-sat-grad-sm)"/>
      <circle cx="76" cy="35" r="7" fill="url(#hub-sat-grad-sm)"/>
      <circle cx="76" cy="65" r="7" fill="url(#hub-sat-grad-sm)"/>
      <circle cx="50" cy="80" r="7" fill="url(#hub-sat-grad-sm)"/>
      <circle cx="24" cy="65" r="7" fill="url(#hub-sat-grad-sm)"/>
      <circle cx="24" cy="35" r="7" fill="url(#hub-sat-grad-sm)"/>
    </g>
    <circle className="lhmark-pulse" cx="50" cy="50" r="14" fill="url(#hub-orb-grad-sm)"/>
    <ellipse cx="46" cy="45.5" rx="4.5" ry="3.2" fill="#fef9c3" opacity="0.55"/>
  </svg>
);

export const PadelLogoSmall = ({size=26}) => (<svg width={size} height={size} viewBox="0 0 80 80" fill="none">
  <ellipse cx="40" cy="28" rx="16" ry="20" stroke="#666" strokeWidth="4" fill="none"/>
  <circle cx="40" cy="28" r="5" fill={A}/>
  <circle cx="33" cy="20" r="2.8" fill={A}/><circle cx="47" cy="20" r="2.8" fill={A}/>
  <circle cx="31" cy="30" r="2.8" fill={A}/><circle cx="49" cy="30" r="2.8" fill={A}/>
  <circle cx="34" cy="37" r="2.8" fill={A}/><circle cx="46" cy="37" r="2.8" fill={A}/>
  <circle cx="40" cy="17" r="2.8" fill={A}/>
  <line x1="40" y1="28" x2="33" y2="20" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <line x1="40" y1="28" x2="47" y2="20" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <line x1="40" y1="28" x2="31" y2="30" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <line x1="40" y1="28" x2="49" y2="30" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <line x1="40" y1="28" x2="34" y2="37" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <line x1="40" y1="28" x2="46" y2="37" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <line x1="40" y1="28" x2="40" y2="17" stroke={A} strokeWidth="1.5" strokeDasharray="2 2"/>
  <rect x="37" y="47" width="6" height="14" rx="2.5" fill="#666"/>
</svg>);
