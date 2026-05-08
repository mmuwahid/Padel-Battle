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

// S068 Issue #54: brand mark — same hub-pattern SVG as the static index.html
// splash (6-dot network around a center node + connecting lines). Used on all
// loading screens so the user sees ONE consistent logo from cold-start through
// auth → leagues → match data, without the static-splash → React-splash
// "different logo flash" the user reported.
export const PadelHubMark = ({ size = 96 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="45" stroke="#4ADE80" strokeWidth="3" fill="none" opacity="0.3"/>
    <circle cx="50" cy="50" r="6" fill="#4ADE80"/>
    <circle cx="50" cy="22" r="4" fill="#4ADE80" opacity="0.7"/>
    <circle cx="74" cy="38" r="4" fill="#4ADE80" opacity="0.7"/>
    <circle cx="74" cy="62" r="4" fill="#4ADE80" opacity="0.7"/>
    <circle cx="50" cy="78" r="4" fill="#4ADE80" opacity="0.7"/>
    <circle cx="26" cy="62" r="4" fill="#4ADE80" opacity="0.7"/>
    <circle cx="26" cy="38" r="4" fill="#4ADE80" opacity="0.7"/>
    <line x1="50" y1="50" x2="50" y2="22" stroke="#4ADE80" strokeWidth="1.5" opacity="0.4"/>
    <line x1="50" y1="50" x2="74" y2="38" stroke="#4ADE80" strokeWidth="1.5" opacity="0.4"/>
    <line x1="50" y1="50" x2="74" y2="62" stroke="#4ADE80" strokeWidth="1.5" opacity="0.4"/>
    <line x1="50" y1="50" x2="50" y2="78" stroke="#4ADE80" strokeWidth="1.5" opacity="0.4"/>
    <line x1="50" y1="50" x2="26" y2="62" stroke="#4ADE80" strokeWidth="1.5" opacity="0.4"/>
    <line x1="50" y1="50" x2="26" y2="38" stroke="#4ADE80" strokeWidth="1.5" opacity="0.4"/>
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
