import React, { useState } from "react";
import { useLeague } from "../LeagueContext";
import Icon from "./Icon";
import {
  GRADE_RUBRIC, GRADE_ORDER, GRADE_META, GRADE_MAX, GRADE_VERSION,
  computeGrade, gradeColor,
} from "../utils/grade";

// FT-17 (S084) — self-assessment questionnaire bottom-sheet.
// Step-through: 8 dimension cards (i–v options each) → live running total →
// result screen with the 10-tier ladder + Save. Writes grade / grade_source='self'
// / self_assessment to the player's own row via the players_update_self RLS policy.
// Spec: planning/FT-17-player-grade.md (v4). Mirrors EditMyProfile bottom-sheet shape.
const ROMAN = ["i", "ii", "iii", "iv", "v"];

export function GradeAssessmentModal({ player, onClose, onSaved }) {
  const { supabase, showToast, loadLeagueData } = useLeague();

  // Pre-fill from an existing self-assessment if the player is retaking.
  const prior = (player.self_assessment && Array.isArray(player.self_assessment.answers)
    && player.self_assessment.answers.length === GRADE_RUBRIC.length)
    ? player.self_assessment.answers : null;

  const [answers, setAnswers] = useState(prior ? [...prior] : Array(GRADE_RUBRIC.length).fill(null));
  const [step, setStep] = useState(0);       // 0..7 question, 8 = result
  const [saving, setSaving] = useState(false);

  const answeredCount = answers.filter(a => a != null).length;
  const allAnswered = answeredCount === GRADE_RUBRIC.length;
  const result = allAnswered ? computeGrade(answers) : null;

  const pick = (raw) => {
    const next = [...answers];
    next[step] = raw;
    setAnswers(next);
    // Auto-advance to the next question (or the result once all are done).
    setTimeout(() => setStep(s => Math.min(s + 1, GRADE_RUBRIC.length)), 160);
  };

  const save = async () => {
    if (!result?.grade) return;
    setSaving(true);
    try {
      const self_assessment = {
        answers, total: result.total, computed_grade: result.grade,
        version: GRADE_VERSION, rated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("players")
        .update({ grade: result.grade, grade_source: "self", self_assessment })
        .eq("id", player.id);
      if (error) throw error;
      showToast(`Grade saved — ${result.grade}`);
      onClose();
      if (onSaved) onSaved();
      loadLeagueData().catch(e => console.warn("[GradeAssessment] refresh:", e));
    } catch (err) {
      console.error("[GradeAssessment] save error:", err);
      showToast(`${err?.message || "Failed to save grade"}${err?.code ? ` (${err.code})` : ""}`, "error");
    }
    setSaving(false);
  };

  const onResult = step >= GRADE_RUBRIC.length;
  const dim = onResult ? null : GRADE_RUBRIC[step];

  const sheet = { width: "100%", maxWidth: 480, maxHeight: "94vh", overflowY: "auto", background: "var(--bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: "14px 18px calc(20px + env(safe-area-inset-bottom, 0px))", fontFamily: "var(--font)", border: "1px solid var(--border)", borderBottom: "none", position: "relative" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 210, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={sheet}>
        <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 14px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--text)", margin: 0 }}>Self-Assessment</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: "#9090a4", cursor: "pointer", padding: 4, display: "flex" }}>
            <Icon name="close" size={18} color="currentColor" />
          </button>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {GRADE_RUBRIC.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: answers[i] != null ? "var(--accent)" : (i === step ? "#4a4a5a" : "var(--border)"), transition: "background .2s" }} />
          ))}
        </div>

        {!onResult && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#9090a4", letterSpacing: ".08em" }}>{step + 1} / {GRADE_RUBRIC.length}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>{dim.name}</div>
            {dim.sub && <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "#9090a4", marginBottom: 14, lineHeight: 1.4 }}>{dim.sub}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dim.opts.map((opt, ri) => {
                const on = answers[step] === ri;
                return (
                  <button key={ri} onClick={() => pick(ri)} style={{ display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left", padding: "11px 12px", background: on ? "var(--accent-dim)" : "var(--surface)", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--r-md)", color: "var(--text)", fontFamily: "var(--font)", fontSize: 12.5, lineHeight: 1.4, cursor: "pointer" }}>
                    <span style={{ flexShrink: 0, fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: on ? "var(--accent)" : "#9090a4", width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: on ? "transparent" : "#1a1a26", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}` }}>{ROMAN[ri]}</span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Nav row */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0} style={{ flex: 1, height: 42, background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: step === 0 ? "#4a4a5a" : "var(--text)", fontFamily: "var(--font)", fontWeight: 700, fontSize: 13, cursor: step === 0 ? "default" : "pointer" }}>Back</button>
              {allAnswered && (
                <button onClick={() => setStep(GRADE_RUBRIC.length)} style={{ flex: 1.4, height: 42, background: "var(--accent)", border: "none", borderRadius: "var(--r-md)", color: "#000", fontFamily: "var(--font)", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>See result</button>
              )}
            </div>
          </>
        )}

        {onResult && result && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "#9090a4" }}>Your computed grade</div>
            <div style={{ fontSize: 52, fontWeight: 800, fontFamily: "var(--mono)", lineHeight: 1, margin: "8px 0", color: gradeColor(result.grade) }}>{result.grade}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "#9090a4" }}>{result.total} / {GRADE_MAX} · {GRADE_META[result.grade]?.label}</div>

            {/* 10-tier ladder with the computed grade highlighted */}
            <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap", margin: "16px 0 4px" }}>
              {GRADE_ORDER.map(g => {
                const on = g === result.grade;
                const c = gradeColor(g);
                return (
                  <span key={g} style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, padding: "5px 7px", borderRadius: 7, color: on ? c : "#9090a4", background: on ? `${c}22` : "var(--surface)", border: `1px solid ${on ? c : "var(--border)"}`, transform: on ? "scale(1.12)" : "none", minWidth: 26, textAlign: "center" }}>{g}</span>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setStep(GRADE_RUBRIC.length - 1)} disabled={saving} style={{ flex: 1, height: 44, background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--text)", fontFamily: "var(--font)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Review</button>
              <button onClick={save} disabled={saving} className={`savebtn on`} style={{ flex: 1.4, padding: "12px 0", fontSize: 13 }}>
                {!saving && <Icon name="check" size={14} color="#000" strokeWidth={2.5} />}
                {saving ? "Saving…" : "Save grade"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
