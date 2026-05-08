import React from "react";
import Icon from "./Icon";
import { PadelLogoSmall } from "./PadelLogo";

// S068 Issue #46: user-facing pending state. Spec ref: docs/PadelHub_Complete_v2.jsx lines 2250-2273.
// Shown by LeagueGate when the user has a pending join_request and no active league memberships.
// Locked screen — no nav, no tabs, no league data. Only options: Sign Out (passed-through) or wait.
export function PendingApprovalScreen({ leagueName, request, onSignOut }) {
  const claimChip = request?.type === "claim"
    ? `${request.display_name} · Claim`
    : `${request?.display_name || "Profile"} · New Profile`;

  return (
    <div className="pend-screen">
      <div className="pend-brand">
        <div className="pend-brand-ico"><PadelLogoSmall size={28}/></div>
        <div className="pend-brand-tx">Padel<span className="accent">Hub</span></div>
      </div>
      <div className="pend-wrap">
        <div className="pend-bg-g"/>
        <div className="pend-ico g"><Icon name="clock" size={32} color="var(--accent)"/></div>
        <div className="pend-title">Waiting for approval</div>
        <div className="pend-sub">
          Your request to join <strong>{leagueName || "the league"}</strong> is under review. The admin will approve your profile shortly.
        </div>
        <div className="pend-pill">
          <Icon name="user" size={14} color="var(--muted)"/>
          {claimChip}
        </div>
        <div className="pend-ctabtn">
          <Icon name="bell" size={15} color="var(--accent)"/>
          You'll be notified when approved
        </div>
        {onSignOut && (
          <button className="pend-signout" onClick={onSignOut}>
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
