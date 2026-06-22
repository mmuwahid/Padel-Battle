import React, { useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

// S089 #119: in-app confirmation dialog that replaces native window.confirm().
// The native dialog rendered as an OS popup that looked foreign to the app
// (especially on iOS — "feels like a different application"). This matches the
// app's surfaces/typography and is theme-aware.
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  const trapRef = useFocusTrap(open, onCancel);
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Confirm"}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 340,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)", padding: 22,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontFamily: "var(--font)", fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: message ? 8 : 18 }}>
          {title}
        </div>
        {message && (
          <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 18 }}>
            {message}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: "11px", borderRadius: "var(--r-md)", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontFamily: "var(--font)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: "11px", borderRadius: "var(--r-md)", border: "none", background: danger ? "#f87171" : "var(--accent)", color: danger ? "#fff" : "#000", fontFamily: "var(--font)", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// A trigger button that owns its own confirm-dialog state, so callers can swap a
// native-confirm <button> for <ConfirmButton ... onConfirm={fn}> with no extra
// state plumbing.
export function ConfirmButton({ className, style, children, title, message, confirmLabel, cancelLabel, danger, onConfirm, ...rest }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} style={style} onClick={() => setOpen(true)} {...rest}>{children}</button>
      <ConfirmModal
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        danger={danger}
        onCancel={() => setOpen(false)}
        onConfirm={() => { setOpen(false); onConfirm && onConfirm(); }}
      />
    </>
  );
}
