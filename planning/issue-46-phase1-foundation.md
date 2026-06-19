# Issue #46 — Phase 1: Foundation

> **Status:** PLAN — drafted S059, ready to build in S060
> **Issue:** mmuwahid/Padel-Battle#46 — UI Redesign: Design System Upgrade
> **Approved mockup:** [`padelhub/docs/PadelHub_Complete_v2.jsx`](../docs/PadelHub_Complete_v2.jsx) (2,425 lines, 22 screens)
> **Spec section:** "Phase 1 — Foundation"
> **Decisions locked (S059):**
> - Tokens use spec's long names (`--accent`, `--surface`, `--ease-spring`)
> - Phase 1 verified via standalone demo HTML page first
> - Build session = S060

---

## Phase 1 goal

Establish the design-system foundation that every later phase depends on, **without altering any existing screen's appearance**. Phase 1 is intentionally a visual no-op on the live app — tokens and fonts are defined, the new `<Icon>` component is built, but no production component references them yet.

**Success criteria:**
- Token CSS available app-wide via `:root`
- Syne + DM Mono loaded from Google Fonts
- New `<Icon>` switch component covering all 50+ icons in the spec
- Standalone `tokens-demo.html` deployed for iPhone smoke-test
- Live app pixel-identical to pre-S060 state on iPhone (visual no-op)
- iOS Safari (390px) ✓ + Android Chrome (412px) ✓

---

## In scope

1. **Google Fonts import** (Syne 400/600/700/800 + DM Mono 400/500)
2. **`:root` design tokens** — full token block from spec, long names
3. **`<Icon>` component** — new file `src/components/Icon.jsx`, switch-based, all icons from spec
4. **Standalone demo page** — `padelhub/public/tokens-demo.html` for verification

## Out of scope (deferred to later phases)

- Replacing any hardcoded color/radius/font in existing components (Phase 2+)
- Touching `src/components/NavIcons.jsx` (S057, frozen per #46 Phase 2 "do not change existing nav bar icon artwork")
- Replacing emoji icons in UI chrome (Phase 2+)
- Any DOM/JSX changes inside existing screens
- AppHeader / BottomNav changes (Phase 2)
- Anything below Phase 1 in the issue checklist

---

## File-by-file changes

### 1. `padelhub/src/index.css` — token block + font import

Currently 9 lines (just resets). Append:

```css
/* ───────────────────────────────────────────────────────────
   Issue #46 Phase 1 — Design System Tokens
   Defined here for app-wide availability via :root cascade.
   Existing components do NOT yet reference these — Phase 2+
   will progressively replace hardcoded values screen-by-screen.
   ─────────────────────────────────────────────────────────── */

@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

:root {
  /* Surfaces */
  --bg: #080808;
  --surface: #111111;
  --surface-2: #1a1a1a;
  --surface-3: #222222;

  /* Borders */
  --border: rgba(255, 255, 255, 0.07);
  --border-hover: rgba(74, 222, 128, 0.28);

  /* Text */
  --text: #f0f0f0;
  --muted: #555555;
  --muted-2: #2e2e2e;

  /* Accent (green) */
  --accent: #4ade80;
  --accent-dim: rgba(74, 222, 128, 0.09);
  --accent-glow: rgba(74, 222, 128, 0.20);

  /* Gold */
  --gold: #f59e0b;
  --gold-dim: rgba(245, 158, 11, 0.08);
  --gold-glow: rgba(245, 158, 11, 0.25);

  /* Danger / loss */
  --danger: #f87171;
  --danger-dim: rgba(248, 113, 113, 0.08);
  --danger-glow: rgba(248, 113, 113, 0.22);

  /* Win / loss / warn */
  --win: #4ade80;
  --loss: #f87171;
  --warn: #fbbf24;

  /* Single-use accents (per spec) */
  --yellow-1: #facc15;   /* Podium 1st place ONLY */
  --pink: #f472b6;       /* Female gender indicator ONLY */

  /* Typography */
  --font: 'Syne', sans-serif;
  --mono: 'DM Mono', monospace;

  /* Radii */
  --r-sm: 8px;
  --r-md: 14px;
  --r-lg: 20px;
  --r-xl: 28px;
  --r-full: 9999px;

  /* Easing */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Important — DO NOT touch the existing 9 lines.** The reset (`* { margin:0; padding:0 ...}`) and the `body { padding-top: env(safe-area-inset-top) ...}` block are load-bearing for Lessons #40 and #44 (overscroll + dynamic-island gap fixes). Append the token block AFTER those.

**Why no `body` rule yet:** The spec has `body { background: var(--bg); ...}`, but `--bg` (`#080808`) differs from the current body bg (`#0d0d14`, set by Lesson #40 in App.jsx style block). Switching the body background in Phase 1 would change every screen's overscroll color. That's a Phase 2+ decision. Tokens defined, no `body` mutation here.

---

### 2. `padelhub/src/components/Icon.jsx` — NEW

Port the entire `<Icon>` component from `docs/PadelHub_Complete_v2.jsx` lines 6–71 verbatim. Single-file component, ~70 lines, named export.

```jsx
/**
 * Issue #46 Phase 1 — Generic icon component.
 *
 * Switch-based (NOT object map — breaks transpiler with JSX values).
 * Stroke-based SVG, viewBox 0 0 24 24, strokeWidth 1.75 default.
 *
 * Coexists with src/components/NavIcons.jsx (S057) — that file
 * stays as the bottom-nav artwork (frozen by #46 Phase 2 spec).
 * THIS file covers the ~50 icons used across all OTHER UI surfaces
 * (trophy, edit, trash, share, star, etc.).
 *
 * Phase 1 ships this without referencing it from any production
 * component. Phase 2+ progressively replaces emoji + ad-hoc SVGs.
 */
export default function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.75 }) {
  const s = { width: size, height: size, display: "block", flexShrink: 0 };
  const p = { fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "trophy": return <svg style={s} viewBox="0 0 24 24" {...p}>{/* paths from JSX line 10 */}</svg>;
    // ... all 50+ cases from JSX lines 10–69 ...
    default: return null;
  }
}
```

Full set of cases (per spec): `trophy`, `racket`, `players`, `gamemode`, `plus`, `minus`, `bell`, `refresh`, `edit`, `trash`, `share`, `copy`, `star`, `eye`, `eye-off`, `search`, `chevron`, `chevron-d`, `back`, `close`, `check`, `check-circle`, `alert`, `zap`, `shuffle`, `calendar`, `admin`, `shield`, `book`, `settings`, `user`, `user-plus`, `league`, `activity`, `arrow-up`, `arrow-right`, `globe`, `info`, `hash`, `help`, `camera`, `flame`, `crown`, `target`, `lock`, `trending-up`, `clock`, `award`, `flag`, `switch`, `court-l`, `court-r`, `court-any`, `male`, `female`, `sliders`.

**Reuse note:** Don't replace `src/components/icons.jsx` (existing legacy icon file, if any) in Phase 1 — old icons keep working unchanged. Phase 2+ migrates consumers to the new `Icon` and the legacy file gets deleted at the end of the redesign.

---

### 3. `padelhub/public/tokens-demo.html` — NEW (temporary)

Standalone HTML demo page for iPhone verification. Self-contained — does not import from React, does not bundle, does not reference any project file. Loads the same Google Fonts URL and inlines the same token block.

**Layout (single scrolling page):**
1. **Header** — "Phase 1 Tokens Demo" + sub "Issue #46 — verify on iPhone before S060 ships to live"
2. **Color swatches** — every token as a 80×80 card with hex value, name, and DM Mono label
3. **Typography specimens** — Syne 400/600/700/800 + DM Mono 400/500, 5 sizes each
4. **Radius samples** — 5 boxes showing `--r-sm` through `--r-full`
5. **Icon grid** — every icon name from the spec rendered at 24px in a 6-column grid with mono labels
6. **Easing animation** — two boxes that translate-X on click, one with `--ease-spring`, one with `--ease-smooth`, side-by-side
7. **iOS overflow fix sample** — 4 `<input type="date">` and 2 `<input type="time">` to confirm the spec's overflow CSS works (this CSS doesn't ship to prod yet — demo-only)

**Reachable at:** `padel-battle.vercel.app/tokens-demo.html` after Vercel deploys.

**Lifetime:** delete this file at the end of Phase 1 verification (committed deletion in the same commit that opens Phase 2).

---

## What changes in the live app

**On iPhone after S060 deploy, the live app should look identical to before.** Visual diff target = zero.

What's actually different under the hood:
- `:root` has new token CSS variables (cascading but unreferenced)
- Two new font files load on first page visit (~80 KB combined, async, no FOIT because no component uses them yet)
- New file `src/components/Icon.jsx` exists in the bundle (tree-shaken if no import → zero bundle impact; one tiny module added to the chunk if Vite registers it)
- New file `padelhub/public/tokens-demo.html` accessible at one URL (not linked from anywhere in the app)

If anything looks visually different on the LIVE app after S060 deploy → that's a regression and we roll back the commit.

---

## Migration / commit ordering

**Single commit** — Phase 1 is small enough.

```
S060 phase1: Issue #46 design-system foundation

- src/index.css: append :root token block + Google Fonts import
- src/components/Icon.jsx: NEW switch-based icon component (~50 icons)
- public/tokens-demo.html: NEW verification demo page

No production component references the new tokens or Icon yet —
Phase 2+ progressively migrates consumers screen-by-screen.

SW vNN -> vNN+1
```

Bump `CACHE_NAME` in `public/sw.js` so PWA users force-refetch the new fonts and CSS.

---

## Verification (Definition-of-Done — Phase 1)

After S060 deploys, both must pass:

### Live app smoke-test (iPhone Safari + Android Chrome)
- [ ] Open `padel-battle.vercel.app` (NOT the demo page)
- [ ] Hard-refresh / kill-and-reopen PWA to bust SW cache
- [ ] Ranking, Matches, Players, Game Mode, sidebar, login, every existing screen visible — pixel-identical to pre-deploy
- [ ] No console errors, no React warnings (DevTools or Safari remote console)
- [ ] No visible layout overflow on any content
- [ ] Existing emoji icons still render
- [ ] Bottom nav active pill still 7px above / below (regression check on S058 #42)
- [ ] iOS rubber-band overscroll still has no seam (regression check on S058 #43)

### Demo page smoke-test (`/tokens-demo.html`)
- [ ] Page loads on iPhone (375×812 portrait) and Android (412×915)
- [ ] Syne font visible and bold on the headers
- [ ] DM Mono font visible and tabular on the labels
- [ ] All color swatches render with their hex value labeled
- [ ] All ~55 icons render at 24px (none missing, none broken)
- [ ] `--ease-spring` animation has visible overshoot
- [ ] `--ease-smooth` animation has no overshoot
- [ ] Date/time input samples don't overflow

If ANY box above fails → STOP, do not start Phase 2, debug or roll back first.

---

## Rollback plan

Phase 1 is additive — three new things, no edits to existing files (except 50 lines appended to `index.css`). Rollback = revert the single commit. SW cache bust on next deploy will purge the fonts.

If the rollback is needed mid-Phase-2, Phase 2 changes that reference tokens fail silently (CSS custom property fallback to undefined → invalid value → engine ignores) — nothing crashes, just visual regressions in whatever Phase 2 had touched.

---

## Open questions

1. **Font display strategy** — Google Fonts default is `&display=swap`, which means a brief flash of fallback font before Syne/DM Mono load (FOUT). The spec doesn't say. Default = swap. If you'd prefer FOIT (block, no flash but slight delay), change to `&display=block`. **Default I'll use: `swap`** unless you say otherwise.

2. **Should I delete `src/components/icons.jsx` (legacy)?** Need to grep S060 to see if it exists and what's referencing it. Plan: leave it alone in Phase 1; address in the phase that finishes migrating its consumers.

3. **Two `--accent` definitions** — the spec lists `--accent: #4ade80` AND the JSX has `--ac: #4ade80`. Confirmed: long names per your S059 decision. NavIcons.jsx (S057) hard-codes `#4ADE80` — that's fine for Phase 1 (we don't touch the nav). Phase 2 spec is "motion only" so the artwork stays hardcoded; tokens get adopted in later phases.

4. **DM Mono availability on iOS Safari** — DM Mono is a Google Fonts standard, served via woff2. Confirmed available on iOS 13+. No fallback work needed.

5. **Should the demo page link from anywhere in the live app?** Plan: NO — keep it isolated at `/tokens-demo.html` so the live app remains a visual no-op. You navigate to it manually for verification.

---

## Hand-off to Phase 2

After Phase 1 ships and verifies, Phase 2 starts with:
- Tokens available — Phase 2's AppHeader / BottomNav motion tweaks reference `var(--ease-spring)` directly
- `<Icon>` available — Phase 2 doesn't use it (nav artwork frozen) but Phase 3+ will
- Demo page can be deleted in Phase 2's first commit if not needed for Phase 2 verification

Phase 2 is the first phase that touches a live component (BottomNav motion). Plan for Phase 2 will be drafted in S060 close, in `padelhub/planning/issue-46-phase2-header-nav.md`.

---

## Next steps

- **S060 cold start:** read this plan, sync git, verify SW version bump path, branch off `main` as `feat/46-phase1-foundation`
- **S060 build:** apply changes per the file list above
- **S060 deploy:** push, verify Vercel build, smoke-test on iPhone + Android
- **S060 close:** update `tasks/todo.md`, append to `lessons.md` if new patterns emerged, write session log, OPEN Phase 2 plan file

---

_Plan v1 — 2026-05-07 — drafted in S059, awaiting S060 build approval_
