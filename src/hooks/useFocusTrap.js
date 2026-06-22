import { useEffect, useRef } from "react";

// S096 (#137 A4): focus trap for modals / drawers.
//
// Attach the returned ref to the dialog content container and give that
// container role="dialog" aria-modal="true" tabIndex={-1}. While active the hook:
//  - moves focus into the dialog on open — onto the container itself, NOT the
//    first input, so mobile keyboards don't pop open the moment a modal appears
//  - keeps Tab / Shift+Tab cycling within the dialog (can't tab into the page behind)
//  - closes on Escape
//  - restores focus to the previously-focused element when the dialog closes/unmounts
//
// Usage:
//   const trapRef = useFocusTrap(open, onClose);
//   <div ref={trapRef} role="dialog" aria-modal="true" aria-label="…" tabIndex={-1}> … </div>
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active, onClose) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  // Keep the latest onClose in a ref (updated in an effect, not during render —
  // see react-hooks/refs) so the keydown handler always calls the current
  // callback without re-running the trap effect on every parent render.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const prevFocused = document.activeElement;

    // Focus the container (tabIndex=-1) rather than the first field, to avoid
    // auto-opening the on-screen keyboard on mobile.
    node.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (onCloseRef.current) {
          e.preventDefault();
          // Stop here so a nested dialog's Escape doesn't also close an outer
          // trap (e.g. AvatarCropModal inside EditPlayerModal).
          e.stopPropagation();
          onCloseRef.current();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const f = Array.from(node.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (f.length === 0) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      const cur = document.activeElement;
      if (e.shiftKey) {
        if (cur === first || cur === node || !node.contains(cur)) {
          e.preventDefault();
          e.stopPropagation();
          last.focus();
        }
      } else if (cur === last || !node.contains(cur)) {
        e.preventDefault();
        e.stopPropagation();
        first.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      if (prevFocused && typeof prevFocused.focus === "function") prevFocused.focus();
    };
    // onClose is read through onCloseRef so an inline-arrow identity change does
    // not re-run the trap (which would re-steal focus on every parent render).
  }, [active]);

  return ref;
}
