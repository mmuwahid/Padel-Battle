// Issue #95: V2 Standard liquid-glass interaction layer.
//
// Global pointer-delegate. Any element with class `lp` gets the 4-effect
// stack on press: radial highlight from tap origin + brief backdrop blur
// (interaction-only) + spring scale + translucent accent overlay tint.
//
// CSS lives in src/index.css under `.lp` / `.lp.pressing` / `@keyframes lp-radial`.
//
// Usage: mount <LiquidPressDelegate/> once near the root, then add `lp`
// to any className you want to receive the effect.
import { useEffect } from "react";
import { triggerHaptic } from "../capacitor";

export function LiquidPressDelegate() {
  useEffect(() => {
    const timers = new WeakMap();

    const onDown = (e) => {
      const el = e.target.closest && e.target.closest(".lp");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--lp-x", x + "%");
      el.style.setProperty("--lp-y", y + "%");
      el.classList.remove("pressing");
      // Native-only light haptic on press (no-op on web). Fire-and-forget.
      triggerHaptic("light");
      // Force reflow so the radial keyframe restarts cleanly on rapid taps.
      void el.offsetWidth;
      el.classList.add("pressing");

      const prev = timers.get(el);
      if (prev) clearTimeout(prev);
      const t = setTimeout(() => {
        el.classList.remove("pressing");
        timers.delete(el);
      }, 650);
      timers.set(el, t);
    };

    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
