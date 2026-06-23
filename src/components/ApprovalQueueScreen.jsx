import React, { useState, useEffect, useCallback } from "react";
import Icon from "./Icon";
import { flagEmoji } from "../utils/helpers";
import { useLeague } from "../LeagueContext";

// S068 Issue #46: admin-facing approval queue. Spec ref: docs/PadelHub_Complete_v2.jsx lines 2309-2376.
// Lists all pending join_requests for the active league. Admin can Approve (immediate access)
// or Reject (with optional free-text reason, max 120 chars). Approved/rejected items collapse
// to a single-line summary. Reachable from AdminDashboard nav card and Matches-tab inline banner.
export function ApprovalQueueScreen({ setSidebarView, goBack }) {
  const { supabase, leagueId, league, showToast, loadLeagueData, canDo } = useLeague();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  // After action, keep the row visible for 1.5s with the success/fail summary.
  const [doneRows, setDoneRows] = useState({}); // { id: { status:'approved'|'rejected', name } }
  // S087: requesters who already have a player in another league → "EXISTING USER"
  // (don't mislabel an existing PadelHub member's join as a brand-new profile).
  const [existingIds, setExistingIds] = useState(() => new Set());

  const loadRequests = useCallback(async () => {
    if (!leagueId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("join_requests")
        .select("id, type, player_id, user_id, display_name, country, gender, playing_position, status, created_at")
        .eq("league_id", leagueId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setRequests(data || []);
      // Flag requesters who already play in a league we can see (other than this one).
      const uids = [...new Set((data || []).map(r => r.user_id).filter(Boolean))];
      if (uids.length) {
        const { data: pl } = await supabase
          .from("players").select("user_id").in("user_id", uids).neq("league_id", leagueId);
        setExistingIds(new Set((pl || []).map(p => p.user_id)));
      } else {
        setExistingIds(new Set());
      }
    } catch (err) {
      showToast(err.message || "Failed to load queue", "error");
    }
    setLoading(false);
  }, [supabase, leagueId, showToast]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const approve = async (req) => {
    setBusyId(req.id);
    try {
      const { error } = await supabase.rpc("approve_join_request", { p_request_id: req.id });
      if (error) throw error;
      showToast(`Approved · ${req.display_name}`);
      setDoneRows(p => ({ ...p, [req.id]: { status: "approved", name: req.display_name } }));
      setTimeout(() => setRequests(p => p.filter(r => r.id !== req.id)), 1500);
      loadLeagueData().catch(() => {});
      // S087: approve_join_request inserts the in-app "Welcome" bell row.
      // S099: web push for that row is now fired by the AFTER INSERT trigger on
      // notifications — no separate client push call needed here.
    } catch (err) {
      showToast(err.message || "Failed to approve", "error");
    }
    setBusyId(null);
  };

  const reject = async (req) => {
    setBusyId(req.id);
    try {
      const { error } = await supabase.rpc("reject_join_request", {
        p_request_id: req.id,
        p_reason: rejectReason.trim() || null,
      });
      if (error) throw error;
      showToast(`Rejected · ${req.display_name}`);
      setDoneRows(p => ({ ...p, [req.id]: { status: "rejected", name: req.display_name } }));
      setRejectOpen(null);
      setRejectReason("");
      setTimeout(() => setRequests(p => p.filter(r => r.id !== req.id)), 1500);
    } catch (err) {
      showToast(err.message || "Failed to reject", "error");
    }
    setBusyId(null);
  };

  const visibleRequests = requests; // doneRows render inline; we filter on timeout
  const pendingCount = visibleRequests.filter(r => !doneRows[r.id]).length;

  // S092 #129: gated on the invite_players capability (was isAdmin).
  if (!canDo('invite_players')) {
    return (
      <div className="ad-screen">
        <div className="back-btn-row">
          <button className="back-btn" aria-label="Back" onClick={() => goBack ? goBack() : setSidebarView("admin")}>
            <Icon name="chevron-left" size={18} color="currentColor"/>
          </button>
        </div>
        <div className="ad-h">
          <div className="adey">Restricted</div>
          <div className="adh1">Admins only</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-screen aq-screen">
      <div className="back-btn-row">
        <button className="back-btn" aria-label="Back" onClick={() => goBack ? goBack() : setSidebarView("admin")}>
          <Icon name="chevron-left" size={18} color="currentColor"/>
        </button>
      </div>
      <div className="ad-h">
        <div className="adey">Pending Approvals</div>
        <div className="adh1">Approval Queue</div>
      </div>
      <div className="aq-count">
        {loading ? "Loading…" : pendingCount > 0
          ? `${pendingCount} request${pendingCount !== 1 ? "s" : ""} pending · League: ${league?.name || "—"}`
          : "All requests reviewed"}
      </div>
      <div style={{margin:"0 18px 14px"}}>
        <div className="inote">
          <Icon name="alert" size={14} color="rgba(255, 215, 0,.85)"/>
          <div className="inotet">Approved players get immediate access. Rejected players can try again.</div>
        </div>
      </div>

      <div className="aq-body">
        {!loading && visibleRequests.length === 0 && (
          <div className="aq-empty">
            <div className="aq-empty-ico"><Icon name="check-circle" size={26} color="var(--accent)"/></div>
            <div className="aq-empty-tit">No pending requests</div>
            <div className="aq-empty-sub">When someone applies to join {league?.name || "this league"}, you'll see them here.</div>
          </div>
        )}

        {visibleRequests.map(r => {
          const done = doneRows[r.id];
          if (done?.status === "approved") {
            return (
              <div key={r.id} className="aq-approved">
                <Icon name="check-circle" size={18} color="var(--accent)"/>
                <div>
                  <div className="aq-approved-n">{done.name}</div>
                  <div className="aq-approved-sub">Approved · access granted</div>
                </div>
              </div>
            );
          }
          if (done?.status === "rejected") {
            return (
              <div key={r.id} className="aq-rejected">
                <Icon name="close" size={18} color="var(--danger)" strokeWidth={2.5}/>
                <div>
                  <div className="aq-rejected-n">{done.name}</div>
                  <div className="aq-rejected-sub">Rejected</div>
                </div>
              </div>
            );
          }

          const isClaim = r.type === "claim";
          const isExisting = !isClaim && existingIds.has(r.user_id);
          const isRejectOpen = rejectOpen === r.id;
          const initial = (r.display_name || "?")[0].toUpperCase();
          return (
            <div key={r.id} className="aqcard">
              <div className="aqcard-top">
                <div className="aqavi">{initial}</div>
                <div className="aqinfo">
                  <div className="aqtyprow">
                    <div className={`aqtype ${isClaim ? "cl" : isExisting ? "ex" : "np"}`}>{isClaim ? "CLAIM" : isExisting ? "EXISTING USER" : "NEW PLAYER"}</div>
                    {r.gender && (
                      <Icon name={r.gender === "male" ? "male" : "female"} size={11} color="var(--muted)"/>
                    )}
                  </div>
                  <div className={`aqname ${isClaim ? "cl" : ""}`}>
                    {isClaim ? `Claiming: ${r.display_name}` : r.display_name}
                  </div>
                  <div className="aqmeta">
                    {r.country && (
                      <span><span className="flag">{flagEmoji(r.country)}</span> {r.country}</span>
                    )}
                    {r.country && <span className="aq-sep">·</span>}
                    <span>{timeAgo(r.created_at)}</span>
                  </div>
                </div>
              </div>

              {!isRejectOpen && (
                <>
                  <div className="aqdiv"/>
                  <div className="aqactions">
                    <button className="aqapprove" disabled={busyId === r.id} onClick={() => approve(r)}>
                      <Icon name="check" size={15} color="#000" strokeWidth={2.5}/>
                      {busyId === r.id ? "…" : "Approve"}
                    </button>
                    <button className="aqreject" disabled={busyId === r.id} onClick={() => { setRejectOpen(r.id); setRejectReason(""); }}>
                      <Icon name="close" size={14} color="var(--danger)"/>Reject
                    </button>
                  </div>
                </>
              )}

              {isRejectOpen && (
                <>
                  <div className="aqdiv"/>
                  <div className="aqrej-zone">
                    <div className="aqrej-lbl">Rejection reason (optional)</div>
                    <textarea
                      aria-label="Rejection reason"
                      className="aqrej-input"
                      rows={3}
                      maxLength={120}
                      placeholder="e.g. Player profile already claimed…"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                    />
                    <div className="aqrej-acts">
                      <button className="shcancel" onClick={() => { setRejectOpen(null); setRejectReason(""); }}>Cancel</button>
                      <button className="aqrej-confirm" disabled={busyId === r.id} onClick={() => reject(r)}>
                        {busyId === r.id ? "…" : "Confirm Reject"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
