import React from "react";
import Icon from "./Icon";
import { useLeague } from "../LeagueContext";
import { PLATFORM_ADMIN_ID } from "./PlatformAdmin";

// S067 Phase 12 PR 3: spec-faithful Admin Dashboard.
// Class names match docs/PadelHub_Complete_v2.jsx lines 1977-2007 verbatim:
//   .adey / .adh1                 — eyebrow + headline
//   .alban / .aldot               — pending-approvals banner (dot + count)
//   .adstats / .adsc / .adscv / .adscl — 3 live stat cards (Players/Matches/Season)
//   .adcard / .adcico / .adcbody / .adctit / .adcdesc / .adcarr — nav row
//   .adcard.pr                    — gold-tinted Platform Admin variant
// User decisions S067 Q1=A (alban live count + tap-to-jump),
//   Q2=A (live stats), Q3=drop CSV export entirely.
export function AdminDashboard({ setSidebarView, setTab, setSidebarOpen }) {
  const {
    user, league, players, seasons,
    pendingMatches, approvedMatches,
    isAdmin,
  } = useLeague();

  // Pending approvals visible to this admin (excludes self-submitted).
  const visiblePending = (pendingMatches || []).filter(m => isAdmin && m.logged_by !== user?.id);
  const pendingCount = visiblePending.length;
  const activeSeason = (seasons || []).find(s => s.active);

  const jumpToApprovals = () => {
    if (pendingCount === 0) return;
    if (typeof setTab === "function") setTab("history");
    if (typeof setSidebarOpen === "function") setSidebarOpen(false);
    setSidebarView(null);
  };

  const stats = [
    { v: (players || []).length, l: "Players" },
    { v: (approvedMatches || []).length, l: "Matches" },
    { v: activeSeason?.name ? activeSeason.name.replace(/^Season\s+/i, "S") : "—", l: "Season" },
  ];

  const cards = [
    { t: "Player Management", d: `${(players || []).length} active`, i: "players", view: "playerManagement" },
    { t: "League Management", d: league?.name || "—", i: "settings", view: "leagueManagement" },
  ];

  return (
    <div className="ad-screen">
      <div className="back-btn-row">
        <button className="back-btn" onClick={() => setSidebarView(null)}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>

      <div className="ad-h">
        <div className="adey">Admin</div>
        <div className="adh1">Dashboard</div>
      </div>

      <div className="ad-body">
        {pendingCount > 0 && (
          <button className="alban" onClick={jumpToApprovals} aria-label="Jump to approvals queue">
            <div className="aldot" />
            <span>{pendingCount} match {pendingCount === 1 ? "result" : "results"} awaiting approval</span>
          </button>
        )}

        <div className="adstats">
          {stats.map(s => (
            <div key={s.l} className="adsc">
              <div className="adscv">{s.v}</div>
              <div className="adscl">{s.l}</div>
            </div>
          ))}
        </div>

        {cards.map(c => (
          <button key={c.t} className="adcard" onClick={() => setSidebarView(c.view)}>
            <div className="adcico"><Icon name={c.i} size={18} color="var(--muted)" /></div>
            <div className="adcbody">
              <div className="adctit">{c.t}</div>
              <div className="adcdesc">{c.d}</div>
            </div>
            <div className="adcarr"><Icon name="chevron" size={16} color="var(--muted-2)" /></div>
          </button>
        ))}

        {user?.id === PLATFORM_ADMIN_ID && (
          <button className="adcard pr" onClick={() => setSidebarView("platform")}>
            <div className="adcico"><Icon name="admin" size={18} color="var(--accent)" /></div>
            <div className="adcbody">
              <div className="adctit">Platform Admin</div>
              <div className="adcdesc">Full system access</div>
            </div>
            <div className="adcarr"><Icon name="chevron" size={16} color="var(--accent)" /></div>
          </button>
        )}
      </div>
    </div>
  );
}
