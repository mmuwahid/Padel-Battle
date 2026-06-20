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

// S073 — 3D green-orb hub with 6 orbiting satellite orbs.
// Per Issue #90: brand color is GREEN (#4ade80, the app accent), not gold.
// S072 shipped this in gold — incorrect call against brand. Reverted to green
// while preserving the same 3D orb + 6 satellite + pulsating + orbit animation
// design that was approved.
//
// Design: central pulsing green orb (3D gradient — light highlight top,
// dark green bottom) with 6 smaller satellite orbs orbiting around it via
// hubOrbit group rotation. Subtle connecting lines. Outer aura halo.
//
// Color palette: pure green using hub-orb-grad (mid #4ade80, highlight #d1fae5,
// shadow #14532d) for both the center hub and satellites; transparent aura.
// Logo sits transparent on var(--bg) — no container box (S070 lesson).
//
// Used at three sizes:
//   - 140px+ on AuthGate / LeagueGate / App.jsx loading splash (full effect)
//   - 32px in app header `.lm` slot via PadelHubMarkHeader (no aura)
//   - 160px static fallback in index.html splash (mirror this artwork there)
export const PadelHubMark = ({ size = 96 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="lhmark">
    <defs>
      <radialGradient id="ph-orb" cx="36%" cy="30%" r="70%">
        <stop offset="0%"   stopColor="#eafff3"/>
        <stop offset="42%"  stopColor="#4ade80"/>
        <stop offset="100%" stopColor="#0f3d22"/>
      </radialGradient>
      <radialGradient id="ph-aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.42"/>
        <stop offset="55%"  stopColor="#4ade80" stopOpacity="0.13"/>
        <stop offset="100%" stopColor="#4ade80" stopOpacity="0"/>
      </radialGradient>
    </defs>
    {/* Option A — Refined Orb: one sphere, one tilted orbit ring, one satellite.
        S089: green aura layer removed (it clipped to the square viewBox and read as
        a flashing "box" behind the orb). Interim until the final logo is delivered. */}
    <ellipse cx="50" cy="50" rx="40" ry="17" fill="none" stroke="#4ade80" strokeWidth="1.8" opacity="0.5" transform="rotate(-28 50 50)"/>
    <circle className="lhmark-pulse" cx="50" cy="50" r="20" fill="url(#ph-orb)"/>
    <ellipse cx="43" cy="43" rx="6.5" ry="4.4" fill="#eafff3" opacity="0.5"/>
    <circle className="lhmark-sat" cx="82" cy="36" r="4.4" fill="#4ade80"/>
  </svg>
);

// Header variant — for app header .lm slot. No aura layer to avoid the
// "container box" effect at small size on the dark app bg.
export const PadelHubMarkHeader = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="lhmark lhmark-sm">
    <defs>
      <radialGradient id="ph-orb-sm" cx="36%" cy="30%" r="70%">
        <stop offset="0%"   stopColor="#eafff3"/>
        <stop offset="42%"  stopColor="#4ade80"/>
        <stop offset="100%" stopColor="#0f3d22"/>
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="50" rx="40" ry="16" fill="none" stroke="#4ade80" strokeWidth="3" opacity="0.55" transform="rotate(-28 50 50)"/>
    <circle className="lhmark-pulse" cx="50" cy="50" r="22" fill="url(#ph-orb-sm)"/>
    <circle cx="82" cy="36" r="5" fill="#4ade80"/>
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
