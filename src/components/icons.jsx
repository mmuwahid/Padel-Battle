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

// S070 Issue #80: redesigned brand mark — more visual depth + animated layers.
// Keeps the hub-pattern identity (6-dot network around a center node) but adds:
//   - dual concentric rings (outer dashed orbit + inner solid)
//   - radial-gradient inner glow behind center node
//   - .lhmark-orbit class on outer ring → CSS animates a slow rotation
//   - .lhmark-pulse class on center node → CSS animates a scale+glow pulse
//   - .lhmark-dot class on satellite dots → CSS staggers their fade
// Used on AuthGate / LeagueGate / App.jsx loading splashes + the static
// index.html splash (kept in sync visually). Numeric coords match index.html.
export const PadelHubMark = ({ size = 96 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="lhmark">
    <defs>
      <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.55"/>
        <stop offset="50%" stopColor="#4ADE80" stopOpacity="0.18"/>
        <stop offset="100%" stopColor="#4ADE80" stopOpacity="0"/>
      </radialGradient>
      <linearGradient id="hub-ring" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#4ADE80" stopOpacity="0.95"/>
        <stop offset="50%"  stopColor="#4ADE80" stopOpacity="0.35"/>
        <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.95"/>
      </linearGradient>
    </defs>
    {/* Soft halo — sits behind everything */}
    <circle cx="50" cy="50" r="48" fill="url(#hub-glow)"/>
    {/* Outer dashed orbit — rotates */}
    <circle className="lhmark-orbit" cx="50" cy="50" r="45" stroke="url(#hub-ring)" strokeWidth="1.5" fill="none" strokeDasharray="3 5" opacity="0.85"/>
    {/* Inner solid ring */}
    <circle cx="50" cy="50" r="36" stroke="#4ADE80" strokeWidth="1.5" fill="none" opacity="0.35"/>
    {/* Connecting lines — center → 6 satellites */}
    <line x1="50" y1="50" x2="50" y2="22" stroke="#4ADE80" strokeWidth="1.4" opacity="0.45"/>
    <line x1="50" y1="50" x2="74" y2="38" stroke="#4ADE80" strokeWidth="1.4" opacity="0.45"/>
    <line x1="50" y1="50" x2="74" y2="62" stroke="#4ADE80" strokeWidth="1.4" opacity="0.45"/>
    <line x1="50" y1="50" x2="50" y2="78" stroke="#4ADE80" strokeWidth="1.4" opacity="0.45"/>
    <line x1="50" y1="50" x2="26" y2="62" stroke="#4ADE80" strokeWidth="1.4" opacity="0.45"/>
    <line x1="50" y1="50" x2="26" y2="38" stroke="#4ADE80" strokeWidth="1.4" opacity="0.45"/>
    {/* Satellite nodes — staggered fade */}
    <circle className="lhmark-dot" style={{animationDelay:"0ms"}}    cx="50" cy="22" r="4.5" fill="#4ADE80"/>
    <circle className="lhmark-dot" style={{animationDelay:"160ms"}}  cx="74" cy="38" r="4.5" fill="#4ADE80"/>
    <circle className="lhmark-dot" style={{animationDelay:"320ms"}}  cx="74" cy="62" r="4.5" fill="#4ADE80"/>
    <circle className="lhmark-dot" style={{animationDelay:"480ms"}}  cx="50" cy="78" r="4.5" fill="#4ADE80"/>
    <circle className="lhmark-dot" style={{animationDelay:"640ms"}}  cx="26" cy="62" r="4.5" fill="#4ADE80"/>
    <circle className="lhmark-dot" style={{animationDelay:"800ms"}}  cx="26" cy="38" r="4.5" fill="#4ADE80"/>
    {/* Central pulsing orb */}
    <circle className="lhmark-pulse-aura" cx="50" cy="50" r="14" fill="#4ADE80" opacity="0.18"/>
    <circle className="lhmark-pulse" cx="50" cy="50" r="7" fill="#4ADE80"/>
    <circle cx="50" cy="50" r="3" fill="#0d0d14" opacity="0.5"/>
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
