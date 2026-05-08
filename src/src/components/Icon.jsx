/**
 * Issue #46 Phase 1 — Generic icon component.
 *
 * Switch-based (NOT object map — JSX values in object literals
 * confuse some transpilers). Stroke-based SVG, viewBox 0 0 24 24,
 * strokeWidth 1.75 default.
 *
 * Coexists with src/components/NavIcons.jsx (S057) — that file
 * stays as the bottom-nav artwork (frozen by #46 Phase 2 spec).
 * THIS file covers the ~55 icons used everywhere else (trophy in
 * podium card, edit/share/star/etc.).
 *
 * Phase 1 ships this without referencing it from any production
 * component. Phase 2+ progressively replaces emoji + ad-hoc SVGs.
 *
 * Ported verbatim from docs/PadelHub_Complete_v2.jsx lines 6–71.
 */
export default function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.75 }) {
  const s = { width: size, height: size, display: "block", flexShrink: 0 };
  const p = { fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "trophy":      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M8 21h8M12 17v4"/><path d="M5 5H4a2 2 0 0 0-2 2v1c0 2.8 2 5.1 4.8 5.9"/><path d="M19 5h1a2 2 0 0 1 2 2v1c0 2.8-2 5.1-4.8 5.9"/><path d="M7 3h10v7a5 5 0 0 1-10 0V3z"/></svg>;
    // racket / players / gamemode silhouettes ported from NavIcons.jsx (S057,
    // shipped to live) so non-nav UI uses the same artwork as the bottom nav.
    case "racket":      return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M11 2c-3.3 0-6 2.7-6 6 0 2.3 1.3 4.3 3.2 5.3l-.7 1.4 1.4.7L9.5 14H11l1 1 1-1h1.5l.6 1.4 1.4-.7-.7-1.4C17.7 12.3 19 10.3 19 8c0-3.3-2.7-6-6-6z"/><line x1="11" y1="15" x2="11" y2="20"/><line x1="13" y1="15" x2="13" y2="20"/><line x1="10" y1="20" x2="14" y2="20"/><circle cx="9" cy="7" r="0.7" fill={color} stroke="none"/><circle cx="12" cy="6" r="0.7" fill={color} stroke="none"/><circle cx="15" cy="7" r="0.7" fill={color} stroke="none"/><circle cx="10" cy="9" r="0.7" fill={color} stroke="none"/><circle cx="14" cy="9" r="0.7" fill={color} stroke="none"/><circle cx="12" cy="10" r="0.7" fill={color} stroke="none"/></svg>;
    case "players":     return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="5" cy="9" r="2"/><path d="M2 19c0-2 1.3-3.5 3-3.5"/><circle cx="12" cy="7" r="3"/><path d="M6 21c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="19" cy="9" r="2"/><path d="M22 19c0-2-1.3-3.5-3-3.5"/></svg>;
    case "gamemode":    return <svg style={s} viewBox="0 0 24 24" {...p}><ellipse cx="7.5" cy="7.5" rx="4.2" ry="4.8" transform="rotate(-30 7.5 7.5)"/><line x1="10.5" y1="10.5" x2="16" y2="19"/><ellipse cx="16.5" cy="7.5" rx="4.2" ry="4.8" transform="rotate(30 16.5 7.5)"/><line x1="13.5" y1="10.5" x2="8" y2="19"/></svg>;
    case "plus":        return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "minus":       return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "bell":        return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case "refresh":     return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>;
    case "edit":        return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
    case "trash":       return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
    case "share":       return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>;
    case "copy":        return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case "star":        return <svg style={s} viewBox="0 0 24 24" {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case "eye":         return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "eye-off":     return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
    case "search":      return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case "chevron":     return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="9 18 15 12 9 6"/></svg>;
    case "chevron-d":   return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="6 9 12 15 18 9"/></svg>;
    case "back":
    case "chevron-left": return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="15 18 9 12 15 6"/></svg>;
    case "close":       return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    case "check":       return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="20 6 9 17 4 12"/></svg>;
    case "check-circle":return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
    case "alert":       return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case "zap":         return <svg style={s} viewBox="0 0 24 24" {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    case "shuffle":     return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>;
    case "calendar":    return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "admin":       return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
    case "shield":      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "book":        return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
    case "settings":    return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case "user":        return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "user-plus":   return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
    case "league":      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"/><path d="M12 2v4M9 10h6M9 14h4"/></svg>;
    case "activity":    return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case "arrow-up":    return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
    case "arrow-right": return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
    case "globe":       return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case "info":        return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
    case "hash":        return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
    case "help":        return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case "camera":      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
    case "flame":       return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
    case "crown":       return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M2 20h20M5 20l-2-9 5 3 4-8 4 8 5-3-2 9"/></svg>;
    case "target":      return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case "lock":        return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "trending-up": return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case "clock":       return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "award":       return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>;
    case "flag":        return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
    case "switch":      return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
    case "court-l":
      return <svg style={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="0.75" width="21" height="22.5" rx="1" stroke={color} strokeWidth={strokeWidth}/><line x1="12" y1="0.75" x2="12" y2="23.25" stroke={color} strokeWidth={strokeWidth*.6}/><line x1="1.5" y1="12" x2="22.5" y2="12" stroke={color} strokeWidth={strokeWidth*2.2}/><line x1="1.5" y1="17.5" x2="22.5" y2="17.5" stroke={color} strokeWidth={strokeWidth*.6}/><line x1="1.5" y1="6.5" x2="22.5" y2="6.5" stroke={color} strokeWidth={strokeWidth*.6}/><circle cx="6.75" cy="20.5" r="2.1" fill={color} stroke="none"/></svg>;
    case "court-r":
      return <svg style={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="0.75" width="21" height="22.5" rx="1" stroke={color} strokeWidth={strokeWidth}/><line x1="12" y1="0.75" x2="12" y2="23.25" stroke={color} strokeWidth={strokeWidth*.6}/><line x1="1.5" y1="12" x2="22.5" y2="12" stroke={color} strokeWidth={strokeWidth*2.2}/><line x1="1.5" y1="17.5" x2="22.5" y2="17.5" stroke={color} strokeWidth={strokeWidth*.6}/><line x1="1.5" y1="6.5" x2="22.5" y2="6.5" stroke={color} strokeWidth={strokeWidth*.6}/><circle cx="17.25" cy="20.5" r="2.1" fill={color} stroke="none"/></svg>;
    case "court-any":
      return <svg style={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="0.75" width="21" height="22.5" rx="1" stroke={color} strokeWidth={strokeWidth}/><line x1="12" y1="0.75" x2="12" y2="23.25" stroke={color} strokeWidth={strokeWidth*.6}/><line x1="1.5" y1="12" x2="22.5" y2="12" stroke={color} strokeWidth={strokeWidth*2.2}/><line x1="1.5" y1="17.5" x2="22.5" y2="17.5" stroke={color} strokeWidth={strokeWidth*.6}/><line x1="1.5" y1="6.5" x2="22.5" y2="6.5" stroke={color} strokeWidth={strokeWidth*.6}/><circle cx="6.75" cy="20.5" r="1.5" fill={color} stroke="none"/><circle cx="17.25" cy="20.5" r="1.5" fill={color} stroke="none"/></svg>;
    case "male":        return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="14.14" y2="9.86"/><polyline points="15 5 19 5 19 9"/></svg>;
    case "female":      return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>;
    case "sliders":     return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
    case "users":       return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "swords":      return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/></svg>;
    case "bulb":        return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>;
    /* S068: emoji-style filled 💪 silhouette. Single closed path traces the
       outline of a flexed arm — horizontal upper-arm at the bottom, vertical
       forearm + fist on the right, pronounced bicep bulge curving up between
       shoulder and elbow. fill={color} overrides the SVG-level fill:none
       so the shape renders solid like the emoji, not stroke-only. */
    case "muscle":      return <svg style={s} viewBox="0 0 24 24" {...p}><path fill={color} stroke="none" d="M2 20h16V4h-4v8c0-8-10-6-12 3z"/><line x1="14" y1="7" x2="18" y2="7" strokeWidth={strokeWidth*0.5} stroke={color === 'currentColor' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.4)'}/><line x1="14" y1="10" x2="18" y2="10" strokeWidth={strokeWidth*0.5} stroke={color === 'currentColor' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.4)'}/></svg>;
    default:            return null;
  }
}
