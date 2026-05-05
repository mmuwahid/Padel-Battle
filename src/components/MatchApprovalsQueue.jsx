import React, { useState } from "react";
import { A, CD, CD2, BD, TX, MT, DG, GD, BL } from '../theme';
import { formatTeam, win, formatDate } from '../utils/helpers';
import { useLeague } from '../LeagueContext';
import { EditMatchModal } from './EditMatchModal';

// FT-09 / S044: Admin-facing approval queue.
// Renders a section with the count badge + per-match Approve/Edit/Reject controls.
// Used inline on the Matches tab (visible only to admins/owners with non-empty queue).
export function MatchApprovalsQueue() {
  const { supabase, pendingMatches, getName, showToast, loadLeagueData, isAdmin } = useLeague();
  const [confirmReject, setConfirmReject] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);

  // Don't render at all for non-admins or when nothing pending.
  if (!isAdmin || !pendingMatches || pendingMatches.length === 0) return null;

  const approveMatch = async (matchId) => {
    setActionBusy(matchId + "-approve");
    try {
      const { error } = await supabase.rpc("approve_match", { p_match_id: matchId });
      if (error) throw error;
      showToast("Match approved");
      await loadLeagueData();
    } catch (err) {
      console.error("approve_match failed", err);
      showToast(err.message || "Failed to approve", "error");
    }
    setActionBusy(null);
  };

  const rejectMatch = async (matchId) => {
    setActionBusy(matchId + "-reject");
    try {
      const { error } = await supabase.rpc("reject_match", { p_match_id: matchId });
      if (error) throw error;
      showToast("Match rejected");
      await loadLeagueData();
    } catch (err) {
      console.error("reject_match failed", err);
      showToast(err.message || "Failed to reject", "error");
    }
    setActionBusy(null);
    setConfirmReject(null);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: GD, margin: 0, display: "flex", alignItems: "center", gap: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>
          <span>⏳ Approvals Queue</span>
          <span style={{ background: GD, color: "#000", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 8, letterSpacing: 0.5 }}>{pendingMatches.length}</span>
        </h3>
      </div>

      {pendingMatches.map(m => {
        const submitterName = m.logged_by ? getName(m.logged_by) : "Unknown";
        return (
          <div key={m.id} style={{ background: CD2, border: `1px solid ${BD}`, borderLeft: `3px solid ${GD}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: MT }}>Submitted by <strong style={{ color: TX, fontWeight: 600 }}>{submitterName}</strong></span>
              <span style={{ fontSize: 10, color: MT, fontFamily: "'JetBrains Mono',monospace" }}>{formatDate(m.date)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <div style={{ textAlign: "center", color: BL, fontSize: 12, fontWeight: 600 }}>{formatTeam(getName(m.team_a?.[0]), getName(m.team_a?.[1]))}</div>
              <div style={{ fontSize: 10, color: MT, fontWeight: 700 }}>vs</div>
              <div style={{ textAlign: "center", color: GD, fontSize: 12, fontWeight: 600 }}>{formatTeam(getName(m.team_b?.[0]), getName(m.team_b?.[1]))}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, background: CD, borderRadius: 8, padding: 6, marginBottom: 10 }}>
              {(m.sets || []).map((s, i) => {
                const wn = (s[0] > s[1]) ? "A" : (s[1] > s[0] ? "B" : null);
                const col = wn === "A" ? BL : (wn === "B" ? GD : TX);
                return <span key={i} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: col, letterSpacing: 1 }}>{s[0]}–{s[1]}</span>;
              })}
            </div>
            {m.motm && <div style={{ textAlign: "center", fontSize: 10, color: MT, marginBottom: 8 }}>⭐ MOTM: <strong style={{ color: GD }}>{getName(m.motm)}</strong></div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {confirmReject === m.id ? (
                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: DG }}>Reject permanently?</span>
                  <button onClick={() => rejectMatch(m.id)} disabled={actionBusy === m.id + "-reject"} style={{ background: DG, color: "#fff", border: 0, borderRadius: 6, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", opacity: actionBusy === m.id + "-reject" ? 0.5 : 1 }}>{actionBusy === m.id + "-reject" ? "..." : "Yes"}</button>
                  <button onClick={() => setConfirmReject(null)} style={{ background: "none", border: `1px solid ${BD}`, color: MT, borderRadius: 6, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>No</button>
                </div>
              ) : (
                <>
                  <button onClick={() => approveMatch(m.id)} disabled={actionBusy === m.id + "-approve"} style={{ background: A, color: "#000", border: 0, borderRadius: 8, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", height: 38, opacity: actionBusy === m.id + "-approve" ? 0.6 : 1 }}>{actionBusy === m.id + "-approve" ? "..." : "✓ Approve"}</button>
                  <button onClick={() => setEditingMatch(m)} style={{ background: CD, color: TX, border: `1px solid ${BD}`, borderRadius: 8, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", height: 38 }}>✎ Edit</button>
                  <button onClick={() => setConfirmReject(m.id)} style={{ background: CD, color: DG, border: `1px solid ${DG}40`, borderRadius: 8, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", height: 38 }}>✕ Reject</button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {editingMatch && (
        <EditMatchModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={loadLeagueData}
        />
      )}
    </div>
  );
}
