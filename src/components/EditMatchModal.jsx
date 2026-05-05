import React, { useState, useMemo } from "react";
import { A, CD, CD2, BD, TX, MT, DG, GD, BL } from '../theme';
import { useLeague } from '../LeagueContext';
import { ScoreStepper } from './ScoreStepper';

// FT-09 / S044: Admin edits a pending match, then "Save & Approve" applies + flips status.
// Calls update_pending_match RPC (server builds diff, notifies submitter, sets status='approved').
export function EditMatchModal({ match, onClose, onSaved }) {
  const { supabase, players, getName, showToast } = useLeague();

  const [date, setDate] = useState(match.date);
  const [teamA, setTeamA] = useState(match.team_a || []);
  const [teamB, setTeamB] = useState(match.team_b || []);
  const [sets, setSets] = useState(match.sets && match.sets.length ? match.sets.map(s => [s[0], s[1]]) : [[0, 0]]);
  const [motm, setMotm] = useState(match.motm || "");
  const [saving, setSaving] = useState(false);

  // Players in match (for MOTM dropdown)
  const matchPlayerIds = useMemo(() => [...teamA, ...teamB].filter(Boolean), [teamA, teamB]);

  // Diff calculation for live preview
  const diff = useMemo(() => {
    const d = [];
    if (date !== match.date) d.push({ field: "Date", old: match.date, new: date });
    if (JSON.stringify(teamA) !== JSON.stringify(match.team_a)) {
      d.push({
        field: "Team A",
        old: (match.team_a || []).map(getName).join(" & "),
        new: teamA.map(getName).join(" & "),
      });
    }
    if (JSON.stringify(teamB) !== JSON.stringify(match.team_b)) {
      d.push({
        field: "Team B",
        old: (match.team_b || []).map(getName).join(" & "),
        new: teamB.map(getName).join(" & "),
      });
    }
    if (JSON.stringify(sets) !== JSON.stringify(match.sets)) {
      d.push({
        field: "Sets",
        old: (match.sets || []).map(s => `${s[0]}-${s[1]}`).join(", "),
        new: sets.map(s => `${s[0]}-${s[1]}`).join(", "),
      });
    }
    if ((motm || null) !== (match.motm || null)) {
      d.push({
        field: "MOTM",
        old: match.motm ? getName(match.motm) : "—",
        new: motm ? getName(motm) : "—",
      });
    }
    return d;
  }, [date, teamA, teamB, sets, motm, match, getName]);

  const setSetValue = (i, side, n) => {
    const x = sets.map(s => [...s]);
    x[i][side] = n;
    setSets(x);
  };
  const addSet = () => setSets([...sets, [0, 0]]);
  const removeSet = (i) => {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (teamA.filter(Boolean).length !== 2 || teamB.filter(Boolean).length !== 2) {
      showToast("Each team needs 2 players", "error");
      return;
    }
    if (sets.some(s => s[0] === 0 && s[1] === 0)) {
      showToast("All sets must have a score", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_pending_match", {
        p_match_id: match.id,
        p_team_a: JSON.stringify(teamA),
        p_team_b: JSON.stringify(teamB),
        p_sets: JSON.stringify(sets),
        p_date: date,
        p_motm: motm || null,
      });
      if (error) throw error;
      showToast("Match approved with edits");
      onSaved && onSaved();
      onClose();
    } catch (err) {
      console.error("update_pending_match failed", err);
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  // Player options excluding already-picked
  const playerOpts = (excludeIds = []) =>
    players.filter(p => !excludeIds.includes(p.id));

  const fieldChanged = (field) => diff.some(d => d.field === field);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 12px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: CD, border: `1px solid ${BD}`, borderRadius: 16, width: "100%", maxWidth: 420, marginTop: "calc(env(safe-area-inset-top, 0px) + 8px)", marginBottom: 20, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BD}`, background: CD2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: TX }}>Edit & Approve Match</h3>
          <button onClick={onClose} style={{ background: "none", border: 0, color: MT, fontSize: 22, cursor: "pointer", padding: 0, width: 28, height: 28 }}>×</button>
        </div>

        {/* Submitter context */}
        <div style={{ background: `${GD}14`, borderLeft: `3px solid ${GD}`, padding: "10px 16px", fontSize: 11, color: MT }}>
          Submitted by <strong style={{ color: TX, fontWeight: 600 }}>{match.logged_by ? getName(match.logged_by) : "—"}</strong>
        </div>

        {/* Form */}
        <div style={{ padding: 16 }}>

          {/* Date */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: MT, marginBottom: 6, display: "block" }}>Date</label>
            <input type="date" value={date} max={new Date().toISOString().split("T")[0]} onChange={e => setDate(e.target.value)} style={{ width: "100%", background: fieldChanged("Date") ? `${A}15` : CD2, border: `1px solid ${fieldChanged("Date") ? A : BD}`, color: TX, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontFamily: "'Outfit',sans-serif", colorScheme: "dark", height: 42 }} />
          </div>

          {/* Team A */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: BL, marginBottom: 6, display: "block" }}>Team A</label>
            {[0, 1].map(idx => (
              <select key={idx} value={teamA[idx] || ""} onChange={e => { const x = [...teamA]; x[idx] = e.target.value; setTeamA(x); }} style={{ width: "100%", background: CD2, border: `1px solid ${BL}80`, color: TX, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontFamily: "'Outfit',sans-serif", height: 42, marginBottom: idx === 0 ? 6 : 0 }}>
                <option value="">— Select player —</option>
                {playerOpts([teamA[1 - idx], ...teamB].filter(Boolean)).map(p => (
                  <option key={p.id} value={p.id}>{p.nickname || p.name}</option>
                ))}
              </select>
            ))}
          </div>

          {/* Team B */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: GD, marginBottom: 6, display: "block" }}>Team B</label>
            {[0, 1].map(idx => (
              <select key={idx} value={teamB[idx] || ""} onChange={e => { const x = [...teamB]; x[idx] = e.target.value; setTeamB(x); }} style={{ width: "100%", background: CD2, border: `1px solid ${GD}80`, color: TX, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontFamily: "'Outfit',sans-serif", height: 42, marginBottom: idx === 0 ? 6 : 0 }}>
                <option value="">— Select player —</option>
                {playerOpts([teamB[1 - idx], ...teamA].filter(Boolean)).map(p => (
                  <option key={p.id} value={p.id}>{p.nickname || p.name}</option>
                ))}
              </select>
            ))}
          </div>

          {/* Sets */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: MT, marginBottom: 6, display: "block" }}>Sets</label>
            {sets.map((s, i) => (
              <div key={i} style={{ background: CD2, border: `1px solid ${BD}`, borderRadius: 10, padding: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: MT, textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Set {i + 1}</span>
                  {sets.length > 1 && (
                    <button onClick={() => removeSet(i)} style={{ background: "none", border: 0, color: MT, cursor: "pointer", fontSize: 11, padding: 0 }}>remove</button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <ScoreStepper value={s[0]} max={7} aColor={BL} ariaLabel={`Set ${i + 1} Team A`} onChange={(n) => setSetValue(i, 0, n)} />
                  <ScoreStepper value={s[1]} max={7} aColor={GD} ariaLabel={`Set ${i + 1} Team B`} onChange={(n) => setSetValue(i, 1, n)} />
                </div>
              </div>
            ))}
            <button onClick={addSet} style={{ width: "100%", background: "transparent", border: `1px dashed ${BD}`, color: MT, padding: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 4, fontFamily: "'Outfit',sans-serif" }}>+ Add Set</button>
          </div>

          {/* MOTM */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: MT, marginBottom: 6, display: "block" }}>Man of the Match (optional)</label>
            <select value={motm || ""} onChange={e => setMotm(e.target.value || null)} style={{ width: "100%", background: CD2, border: `1px solid ${BD}`, color: TX, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontFamily: "'Outfit',sans-serif", height: 42 }}>
              <option value="">— None —</option>
              {matchPlayerIds.map(pid => (
                <option key={pid} value={pid}>{getName(pid)}</option>
              ))}
            </select>
          </div>

          {/* Diff preview */}
          {diff.length > 0 && (
            <div style={{ background: `${A}10`, border: `1px solid ${A}40`, borderRadius: 10, padding: "10px 12px", marginBottom: 6, fontSize: 11, color: TX }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: A, marginBottom: 6, textTransform: "uppercase" }}>⚡ Changes (sent to submitter)</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {diff.map((d, i) => (
                  <li key={i} style={{ lineHeight: 1.6, color: MT }}>
                    <span style={{ color: TX, fontWeight: 500 }}>{d.field}:</span>{" "}
                    <span style={{ color: DG, textDecoration: "line-through" }}>{String(d.old)}</span>
                    <span style={{ color: MT, margin: "0 4px" }}>→</span>
                    <span style={{ color: A, fontWeight: 600 }}>{String(d.new)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${BD}`, background: CD2, display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 8 }}>
          <button onClick={onClose} disabled={saving} style={{ background: CD, color: TX, border: `1px solid ${BD}`, borderRadius: 10, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Outfit',sans-serif", height: 42, opacity: saving ? 0.5 : 1 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background: A, color: "#000", border: 0, borderRadius: 10, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Outfit',sans-serif", height: 42, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save & Approve"}</button>
        </div>
      </div>
    </div>
  );
}
