# Issue #46 — Phase 2: Header + Bottom Nav

> **Status:** PLAN — drafted S060, awaits Phase 1 (PR [#47](https://github.com/mmuwahid/Padel-Battle/pull/47)) merging cleanly before S061 build.
> **Issue:** mmuwahid/Padel-Battle#46 — UI Redesign
> **Approved mockup:** [`docs/PadelHub_Complete_v2.jsx`](../docs/PadelHub_Complete_v2.jsx) (lines 980–1018 for components, 101–127 for CSS)
> **Spec section:** "Phase 2 — Header + Nav"
> **Build session:** S061 (after Phase 1 verifies green)

---

## Phase 2 goal

Replace the live `AppHeader` and `BottomNav` markup/CSS with the spec versions — but **keep `NavIcons.jsx` (S057) as the bottom nav artwork**. The user has flagged the bottom-nav silhouettes as locked: never re-skin the existing Trophy/Racket/Players/CrossedRackets icons.

What changes visually:
- Header: blurred sticky bar with mono-font typography, accent-tinted logo block, glassmorphic `ibtn` icon buttons (refresh + bell), avatar with accent-glow border.
- Bottom nav: glassmorphic floating bar (`backdrop-filter: blur(20px)`), spec-style active pill (`.npill` with scale-in spring), per-icon scale on press/active state, FAB with green-glow shadow at `top: -4px`.

What does NOT change:
- The actual SVGs in NavIcons.jsx (Trophy/Racket/Players/CrossedRackets). Those remain the same.
- Tab IDs (board/history/combos/stats/gamemode/log) — locked since S054.

---

## In scope

1. Replace `AppHeader` JSX + styles in App.jsx with spec version (CSS classes `.hdr`, `.hl`, `.hc`, `.hr`, `.logo`, `.lm`, `.lt`, `.ibtn`, `.av`).
2. Replace bottom nav block in App.jsx with spec version (`.bnav`, `.ntab`, `.npill`, `.nicon`, `.nlbl`, `.fab`) — but render `<NavIcon name=…>` from NavIcons.jsx inside `.nicon`, NOT `<Icon name=…>` from the new component.
3. Append the relevant CSS rules to `src/index.css` after the Phase 1 token block.

## Out of scope (later phases)

- Logo wordmark glyphs / typography overhaul beyond what spec.css provides (Phase 3 polish).
- Migrating the sidebar / settings entries / drill-in screens (Phase 3+).
- Notification center redesign (Phase 7).
- Removing the existing inline-styled header / nav scaffolding code paths in App.jsx — replace cleanly, do not leave dead branches.

---

## File-by-file changes

### 1. `padelhub/src/index.css` — append Phase 2 component styles

Append after the Phase 1 `:root` token block. Use **token references** everywhere (`var(--accent)`, `var(--ease-spring)`, `var(--r-full)`, etc.) — never hardcoded hexes.

```css
/* ───────────────────────────────────────────────────────────
   Issue #46 Phase 2 — Header + Bottom Nav
   ─────────────────────────────────────────────────────────── */

.hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid var(--border);
  background: rgba(8, 8, 8, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  position: sticky;
  top: 0;
  z-index: 50;
}
.hl { flex: 1; display: flex; }
.hc {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 15px;
  font-weight: 700;
  pointer-events: none;
  white-space: nowrap;
}
.hr { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.logo { display: flex; align-items: center; gap: 8px; }
.lm {
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  background: var(--accent-dim);
  border: 1px solid var(--accent-glow);
  display: flex; align-items: center; justify-content: center;
}
.lt {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.lt span { color: var(--accent); }

.ibtn {
  width: 34px; height: 34px;
  border-radius: var(--r-full);
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; position: relative;
  transition: all 150ms var(--ease-smooth);
  color: var(--muted);
}
.ibtn:hover { border-color: var(--border-hover); color: var(--text); }
.ibtn:active { transform: scale(0.92); }

.av {
  width: 34px; height: 34px;
  border-radius: var(--r-full);
  border: 2px solid var(--accent-glow);
  overflow: hidden; cursor: pointer;
}

/* Bottom nav — keep NavIcons.jsx (S057) artwork; only motion + layout change */
.bnav {
  position: fixed; bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: 100%; max-width: 430px;
  background: rgba(8, 8, 8, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  padding: 8px 4px calc(22px + env(safe-area-inset-bottom, 0px));
  display: flex; align-items: center; justify-content: space-around;
  z-index: 100;
}
.ntab {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  cursor: pointer; position: relative;
  padding: 5px 14px;
  border: none; background: none;
  color: var(--muted);
  font-family: var(--font);
  transition: color 200ms var(--ease-smooth);
}
.ntab.on { color: var(--accent); }
.npill {
  position: absolute; inset: 0;
  border-radius: var(--r-full);
  background: var(--accent-dim);
  border: 1px solid var(--accent-glow);
  opacity: 0; transform: scale(0.6);
  transition: opacity 250ms, transform 350ms var(--ease-spring);
}
.ntab.on .npill { opacity: 1; transform: scale(1); }
.nicon { position: relative; z-index: 1; display: flex; transition: transform 300ms var(--ease-spring); }
.ntab.on .nicon { transform: scale(1.12); }
.ntab:active .nicon { transform: scale(0.85); }
.nlbl { font-size: 10px; font-weight: 600; position: relative; z-index: 1; }

.fab {
  width: 50px; height: 50px;
  border-radius: var(--r-full);
  background: var(--accent);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #000;
  box-shadow:
    0 0 0 1px rgba(74, 222, 128, 0.40),
    0 4px 20px rgba(74, 222, 128, 0.35);
  transition: all 200ms var(--ease-spring);
  position: relative; top: -4px;
}
.fab:hover { transform: scale(1.08); }
.fab:active { transform: scale(0.92); }
```

### 2. `padelhub/src/App.jsx` — replace AppHeader markup + bottom nav block

- AppHeader: pull the inline-style header out of App.jsx into a small named component using the new CSS classes. Logo uses `<Icon name="racket" size={16} color="var(--accent)" />` from the **new** Icon.jsx (Phase 1) — the racket case there matches NavIcons.jsx artwork already (S060 fix), so the header logo + bottom-nav racket render the same shape.
- Bottom nav: replace the existing inline-styled grid with the spec's `.bnav > .ntab` flex layout. **Inside `.nicon`, render `<NavIcon name={item.icon} active={tab===item.id} size={20} />`**, NOT `<Icon name=… />`. The active pill is now `.npill` (CSS-driven scale-in), so the inline 22px capsule from S057 + the `fontWeight` toggle can both go.
- Tab definitions in `theme.js` keep the existing icon keys (`trophy`/`racket`/`players`/`crossed`) — those are the NavIcons.jsx switch keys.
- The `+` button cell becomes `<button className="fab"><Icon name="plus" size={22} color="#000" strokeWidth={2.5}/></button>`. Plus is fine to import from the new Icon.jsx.

### 3. `padelhub/public/sw.js` — bump cache `v80 → v81`.

### 4. Delete `padelhub/public/tokens-demo.html` in this phase's commit (Phase 1's verification artifact — its job is done once Phase 2 ships).

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Bottom-nav active state regression vs S057 | Phase 2 deploys to a feature branch first; iPhone smoke-test on the preview URL before merge. |
| iOS rubber-band overscroll seam returns (S058 #43 / Lesson #40) | `.bnav` uses `position: fixed` + safe-area padding, doesn't touch `body` bg. Overscroll color stays `#0d0d14`. |
| Dynamic-island gap regression (S051 #18 / Lesson #44) | `.hdr` uses `position: sticky; top: 0;` — same anchoring as today. The body/html/#root margin/padding resets from S051 stay in `App.jsx` style block. Do NOT remove them. |
| `backdrop-filter` Safari glitch | Already `-webkit-` prefixed. Confirmed working via the existing pedestal blur (S046+). |
| Keyboard navigation / VoiceOver | Match existing nav buttons' `aria-label` + `aria-current="page"` on `.ntab.on`. |
| Bundle size | All-CSS — no new JS. Net diff likely negative (inline styles removed in App.jsx). |

---

## Verification (DoD — Phase 2)

After S061 deploy on the feature branch's Vercel preview:

### Header smoke-test (iPhone Safari + Android Chrome)
- [ ] Logo block renders with accent-tinted square + "PadelHub" wordmark, `Hub` in green
- [ ] Refresh + bell `ibtn` buttons render with mono-font appearance, hover/active scale works
- [ ] Avatar still navigates to My Profile
- [ ] Sticky behavior intact — header stays at top during scroll
- [ ] Dynamic-island gap STILL CLEAR at scrollY=0 (S051 #18 regression check)

### Bottom nav smoke-test
- [ ] All 5 tabs render with NavIcons.jsx artwork (Trophy / Racket / Players / CrossedRackets, plus FAB)
- [ ] Active tab shows green pill background with scale-in spring
- [ ] Tap-down scales icon to 0.85, releases back to 1.12 active or 1.0 inactive
- [ ] Pill centering: 7px above / 7px below symmetric (S058 #42 regression check)
- [ ] iOS rubber-band overscroll still seamless (S058 #43 regression check)
- [ ] FAB has green glow shadow + sits 4px above the row baseline

### Cross-screen
- [ ] Drill-in headers (Settings / Profile / Log Match / Rules / Admin / etc.) all show the back-button variant
- [ ] No console errors / React warnings
- [ ] Reload PWA + hard-refresh — no skeleton flash on tab switch (S058 #24 regression check)

If ANY box fails → STOP, do not start Phase 3. Roll back if needed.

---

## Rollback plan

Phase 2 is one branch (`feat/46-phase2-header-nav`) with one PR. Rollback = revert merge commit + redeploy. SW cache bust on next deploy purges Phase-2 CSS.

If only one piece regresses (e.g., bottom nav fine but header dynamic-island gap breaks), hot-fix on a follow-up commit rather than reverting the whole phase.

---

## Open questions

1. **Should the `.fab` `+` button still open the existing log-match flow?** Plan: yes, no behavioral change. Phase 2 is visual only.
2. **Should the spec's `tapped` scale animation (300ms cubic-bezier on the inline style) override the CSS `.ntab:active .nicon` rule?** Plan: drop the inline `tapped` state — the CSS `:active` selector covers the press feedback at no JS cost.
3. **Header `title` prop** — the spec shows a `title` parameter for drill-in screens. The current App.jsx uses screen-specific inline headers. Sweep them in this phase or leave for Phase 3? **Plan:** sweep top-level screens (Settings / Profile / Log Match / Rules / Admin / Platform Admin / Player Management / Pending Approvals / League Management / Season Management) in Phase 2 since the AppHeader is being refactored anyway. Drill-in detail screens (PlayerStats player drill-in, EditPlayerModal, EditMatchModal, EditMyProfile) keep their existing layouts — those are bottom-sheets/modals, not full-page screens.

---

## Hand-off to Phase 3

Phase 3 (per spec: Login + Onboarding) starts with:
- Header + nav stable on the new design system
- Tokens + Icon.jsx + NavIcons.jsx all in active use
- The login screen + onboarding flow rebuilt from the spec, including the new `<Icon name="trophy">` accent-tinted login logo and the 3-step `<OnboardingScreen>` (with the existing PadelHub auth flow wired to the new UI).

---

_Plan v1 — 2026-05-07 — drafted in S060 close, build deferred to S061 after Phase 1 verifies on iPhone._
