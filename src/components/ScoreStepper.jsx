import React from "react";
import { A, CD2, BD, TX, MT } from "../theme";

/**
 * ScoreStepper — horizontal [−] [value] [+] for entering numeric scores.
 *
 * Preserves S040 native-iOS input behaviour: type="text", inputMode="numeric",
 * pattern="[0-9]*". User can either tap ±1 or type directly. Empty input is
 * allowed (renders as placeholder "0", value reported as 0).
 *
 * Props
 * - value:   number — current score (0-based)
 * - max:     number | undefined — clamp ceiling. + button disables at value === max.
 *                                 Omit for no cap (RoundRobin).
 * - onChange: (n: number) => void — fires with the new value after clamp.
 * - aColor:   string  — accent border colour (defaults to theme A green).
 * - ariaLabel?: string — passed through to the input for screen readers.
 */
export function ScoreStepper({ value, max, onChange, aColor = A, ariaLabel }) {
  const v = Number.isFinite(value) ? value : 0;
  const atMin = v <= 0;
  const atMax = typeof max === "number" && v >= max;

  const dec = () => { if (!atMin) onChange(v - 1); };
  const inc = () => { if (!atMax) onChange(v + 1); };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw === "") return onChange(0);
    const n = parseInt(raw, 10);
    onChange(typeof max === "number" ? Math.min(max, n) : n);
  };

  const stop = (e) => e.stopPropagation();

  const btnBase = {
    width: 40,
    height: 40,
    border: 0,
    background: "transparent",
    color: aColor,
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    cursor: "pointer",
    lineHeight: 1,
    padding: 0,
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  };

  const btnDisabled = {
    color: MT,
    opacity: 0.3,
    cursor: "not-allowed",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        border: `1px solid ${aColor}40`,
        borderRadius: 10,
        overflow: "hidden",
        background: CD2,
        height: 40,
      }}
    >
      <button
        type="button"
        onClick={dec}
        disabled={atMin}
        aria-label={`Decrease${ariaLabel ? " " + ariaLabel : ""}`}
        style={atMin ? { ...btnBase, ...btnDisabled } : btnBase}
      >−</button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={v === 0 ? "" : String(v)}
        placeholder="0"
        onChange={handleChange}
        onClick={stop}
        aria-label={ariaLabel || "Score"}
        style={{
          width: 48,
          border: 0,
          borderLeft: `1px solid ${BD}`,
          borderRight: `1px solid ${BD}`,
          background: "transparent",
          color: TX,
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          textAlign: "center",
          outline: "none",
          padding: 0,
        }}
      />
      <button
        type="button"
        onClick={inc}
        disabled={atMax}
        aria-label={`Increase${ariaLabel ? " " + ariaLabel : ""}`}
        style={atMax ? { ...btnBase, ...btnDisabled } : btnBase}
      >+</button>
    </div>
  );
}
