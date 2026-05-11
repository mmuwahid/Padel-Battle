import React from "react";
import Icon from "./Icon";
import { PadelHubMarkHeader } from "./icons";

// S068 Issue #46: user-facing rejected state. Spec ref: docs/PadelHub_Complete_v2.jsx lines 2278-2304.
// Shown by LeagueGate when the user's most recent join_request for a league is rejected
// (and there's no newer pending row).
// Try Again routes back to OnboardingScreen step 3 with the form pre-filled from the
// rejected request, so the user can resubmit a corrected request.
export function RejectedScreen({ leagueName, request, onTryAgain, onSignOut }) {
  return (
    <div className="pend-screen">
      <div className="pend-brand">
        <div className="pend-brand-ico"><PadelHubMarkHeader size={28}/></div>
        <div className="pend-brand-tx">Padel<span className="accent">Hub</span></div>
      </div>
      <div className="pend-wrap">
        <div className="pend-bg-r"/>
        <div className="pend-ico r"><Icon name="close" size={32} color="var(--danger)" strokeWidth={2.5}/></div>
        <div className="pend-title danger">Request not approved</div>
        <div className="pend-sub">
          Your request to join <strong>{leagueName || "the league"}</strong> was reviewed and could not be approved.
        </div>
        {request?.reject_reason && (
          <div className="rej-reason">
            <div className="rej-reason-lbl">Reason from admin</div>
            "{request.reject_reason}"
          </div>
        )}
        <button className="try-again-btn" onClick={onTryAgain}>
          <Icon name="refresh" size={16} color="#fff" strokeWidth={2}/>Try Again
        </button>
        {onSignOut && (
          <button className="pend-signout" onClick={onSignOut}>
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
