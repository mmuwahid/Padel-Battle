# Session 069 — Cropper + Lightbox + Nav Burst + Title Spec Align + Color Audit

**Date:** 2026-05-09 (continuation of S068 day)
**Branch:** `feat/s069-cropper-lightbox-nav-titles` → squash-merged to `main` as commit `25f7a2d`
**PR:** [#85](https://github.com/mmuwahid/Padel-Battle/pull/85)
**SW:** v125 → v126
**Production:** [padel-battle.vercel.app](https://padel-battle.vercel.app), deploy `dpl_G2ip2fiLPiVhik4y2xpWB1Vpi4D4` (READY)

---

## Summary

Single-PR ship of 4 features + 1 spec-alignment + 1 research-only color audit. All 4 features verified in preview before merge.

1. **AvatarCropModal** (new) — `react-easy-crop` wrapper
2. **AvatarLightbox** (new) — WhatsApp/Instagram tap-to-expand
3. **Issue #81** — iOS-18 nav press burst animation (halo overflows above bar)
4. **Screen titles spec align** — drop `text-transform:uppercase` from `.lbtitle / .adh1 / .lv-title / .sched-title` so Syne 800 mixed-case renders per JSX spec
5. **Color audit** — research-only deliverable; sweep batch held pending user decision on `#9090a4 → --muted #555555` (Note A in audit)

---

## Files touched (10 changes, 466 +/45 -)

**New:**
- `src/components/AvatarCropModal.jsx` (~150 lines) — react-easy-crop wrapper, circular 1:1 crop, pan, zoom slider 1×–4×, outputs 200×200 JPEG blob via `onCropped(blob)` callback
- `src/components/AvatarLightbox.jsx` (~30 lines) — fixed overlay, click/Esc dismiss, body-scroll lock, contain-fit image, accent-tinted close button

**Modified:**
- `src/App.jsx` — `uploadAvatar` split into pickPhoto-style `setAvatarFile(file)` + new `uploadCroppedAvatar(blob)` that runs the storage upload pipeline; `<AvatarCropModal>` mounted globally so it overlays any screen the user is on when they pick a photo
- `src/components/EditPlayerModal.jsx` — same split pattern: `pickPhoto(file)` → `<AvatarCropModal>` → `uploadCroppedPhoto(blob)`; legacy auto-center-crop logic deleted; `decodeImageFile` import dropped (no longer used)
- `src/components/ProfileView.jsx` — `.propic` gets `tappable` class + `role="button"` + `onClick` opening lightbox when avatar exists
- `src/components/PlayerStats.jsx` — same lightbox wiring for `.dpro-pic` drill-in avatar
- `src/index.css` — Issue #81 nav burst (`.ntab::before` halo, `.ntab:active` icon lift), AvatarCropModal styles (`.acm-*`), AvatarLightbox styles (`.alb-*`), `.tappable` cursor hint, `.bnav`+`.ntab` set to `overflow: visible`, dropped uppercase from 4 screen-title classes
- `public/sw.js` — v125 → v126
- `package.json` / `package-lock.json` — `react-easy-crop` added

---

## Issue #81 — nav press burst animation details

User asked for a "GitHub-style press feedback that expands above the menu". Built via:

```css
.ntab::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 4px;
  width: 64px;
  height: 64px;
  margin-left: -32px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(74, 222, 128, 0.55) 0%,
    rgba(74, 222, 128, 0.30) 35%,
    rgba(74, 222, 128, 0.10) 65%,
    rgba(74, 222, 128, 0) 100%);
  transform: translateY(0) scale(0);
  opacity: 0;
  transition: transform 280ms var(--ease-spring),
              opacity 220ms ease;
  pointer-events: none;
  z-index: 0;
}
.ntab:active::before {
  transform: translateY(-26px) scale(1.45);
  opacity: 1;
}
.ntab:active .nicon { transform: translateY(-10px) scale(1.28); }
.ntab:active .nlbl  { transform: translateY(-2px); }
```

**Math check:** halo is 64px tall; at scale(1.45) it's ~93px; translateY(-26) shifts the centerline up by 26. The halo's top edge ends up at:
- `(tab top) + (top: 4) + (translateY -26) - (64/2 * 0.45)` = `tab top - 36px`

So the halo physically overflows ~36px above the nav bar's top edge. `.bnav` + `.ntab` had to be set to `overflow: visible` (the rounded `border-radius: 28px` on `.bnav` doesn't clip without `overflow: hidden`, but I made it explicit anyway).

**Hold behavior:** pure CSS `:active` holds while finger/mouse is pressed. No JS touch handlers needed. Spring eases on press AND release.

**Verified:** spoofed-active class showed pseudo at `matrix(1.45, 0, 0, 1.45, 0, -26)` opacity 1, icon at `matrix(1.28, 0, 0, 1.28, 0, -10)`. CSS rules confirmed in stylesheet via `.cssRules` enumeration.

---

## Screen titles spec align

User compared his JSX spec image showing "Leaderboard" mixed-case Syne 800 vs live "LEADERBOARD" all-caps. Diff:

| Class | Spec | Live (before) | Live (after) |
|---|---|---|---|
| `.lbtitle` | 26px/800/-.02em | + `text-transform:uppercase` | matches spec |
| `.adh1` | 26px/800/-.02em | + `text-transform:uppercase` | matches spec |
| `.lv-title` | 18px/800/-.02em | + `text-transform:uppercase` | matches spec |
| `.sched-title` | 18px/800/.04em | + `text-transform:uppercase` | matches spec (also tightened letter-spacing -.02em) |

Sub-section labels (`.secname`, `.shtitle`, all `.fl2/.slbl/.sbsl/.shlbl/.proscl/.hll/.wrl/.fl2/.adey/.adscl` mono eyebrows, etc.) **intentionally kept** their uppercase — those are designed as small-caps labels, not screen titles.

JSX text strings were already mixed-case ("Leaderboard", "Dashboard", "Leagues", "Scheduled", "Approval Queue", "Platform Admin", "Player Management", "Management") — only the CSS was forcing uppercase. CSS-only fix, zero JSX touched.

---

## Color audit — research deliverable

User asked for a "side-by-side comparison of existing colors used in the live DB vs the JSX spec palette" similar to the Outfit→Syne sweep approach. Done:

### Part 1 — `:root` token block

**100% match** with spec at the variable-definition level. Every spec token (`--bg`, `--surface`, `--surface-2/3`, `--text`, `--muted`, `--accent`, `--accent-dim`, `--accent-glow`, `--gold`, `--gold-dim`, `--gold-glow`, `--yellow-1`, `--warn`, `--danger`, `--danger-dim`, `--danger-glow`, `--pink`, `--border`, `--muted-2`) exists in live with identical value. Live extras (`--border-hover`, `--win`/`--loss` aliases, typography, radii, easing) are all non-color or utility.

### Part 2 — Hardcoded usage divergence

**395 hardcoded color references** scattered across `index.css`. Distilled to a frequency table; key drift points:

| Hardcoded | Count | Notes | Verdict |
|---|---|---|---|
| `#9090a4` | **119** | NOT in spec — spec says `--muted #555555` | 🟡 ASK USER — see Note A |
| `#5a5a6a` | 11 | NOT in spec — extra-faint tier | 🟡 ASK |
| `#0a0a0f` | 4 | LEGACY pre-S060 bg | 🟢 sweep → `var(--bg)` |
| `#e4e4ef`, `#c9c9d4` | 4 total | LEGACY pre-S067 text | 🟢 sweep → `var(--text)` |
| `#7a7a8e` | 2 | LEGACY old muted | 🟢 sweep → `var(--muted)` |
| `#3a3a3a / 3a3a4a / 2a2a3a` | 5 total | LEGACY borders | 🟢 sweep → `var(--surface-3)` or `var(--border)` |
| `#0d0d14`, `#12121a` | 4 total | LOAD-BEARING (Lesson #40/#44 — header gradient + .bnav bg) | 🔴 KEEP |
| `#94a3b8`, `#c97b2e` | 4 total | spec single-use silver/bronze podium | ✅ keep |
| `#60a5fa` | 4 | NOT in spec — male gender blue | ✅ keep (single-use, mirrors `--pink`) |
| `#4ade80` (inline) | 9 | matches `--accent` | ⚪ replace inline → var |
| `#facc15`, `#f87171`, `#f472b6` (inline) | 9 total | match `--yellow-1`, `--danger`, `--pink` | ⚪ replace inline → var |
| `#4ade8040 / 4ade8020 / 4ade80cc` | 6 total | hex-alpha — should use rgba/--accent-glow/--accent-dim | ⚪ minor cleanup |

### Note A — the call the user has to make

Spec defines `--muted: #555555` (33% lightness — barely readable on `#080808` bg). Live has been using `#9090a4` (~62% lightness) since Phase 1 because it actually passes legibility on dark surfaces. Three options surfaced:

- **A1** — Keep `#9090a4` everywhere as documented spec divergence (legibility).
- **A2** — Sweep to spec `var(--muted) #555555`. Spec-faithful but every secondary label/eyebrow/sub-stat across the entire app gets significantly fainter. Likely user-perceived regression.
- **A3** — Redefine `--muted` to `#9090a4` in `:root` so the token name matches usage. Treat the spec's `#555555` as wrong. *(My recommendation — semantically cleanest, legibility preserved.)*

User to decide A1/A2/A3 next session, then I sweep.

---

## What did NOT happen this session

- The color sweep itself (held for user decision on Note A)
- Lessons file update (no new lessons; everything captured in this session log)
- Other S069 backlog items (E2E re-test, claim-during-onboarding, parallelize queries, EditMyProfile diffs, FT-15 Pairs)

---

## Validated patterns

1. **`:active` pseudo for tactile hold** — for press-feedback animations that need to last as long as the user is pressing, pure CSS `:active` is sufficient. No `useState` + `onTouchStart`/`onTouchEnd` plumbing required. The browser holds the state through the entire press. (Issue #81)

2. **Spoofed-class verification for `:active` styles** — since CDP `forceState` isn't available via `preview_eval`, the cleanest way to visually verify a `:active` rule is to write a temporary `.ntab-spoof` class with `!important` overrides mirroring the active rule's transforms and opacity, then add it to the target element. Take screenshot, confirm computed values, remove. (Issue #81 verification)

3. **`overflow: visible` on parent + child for overflow-burst pseudos** — when a `::before` halo on a button needs to bleed past the parent container, BOTH the button (`.ntab`) AND its parent container (`.bnav`) need `overflow: visible`. Don't rely on `border-radius` alone; without `overflow: hidden`, content already escapes the rounded corners — but child overflow can still be clipped by an ancestor's `overflow: hidden` even if the immediate parent allows it.

4. **Class-name CSS strip > JSX rewrite** — when a spec mismatch is purely a CSS property (e.g., `text-transform: uppercase`) and the JSX text strings are already correct, fix the CSS, not the JSX. Saves token cost and keeps source-of-truth intent (mixed-case in JSX) while bringing render in line.

5. **Token-level audit before usage-level audit** — for any spec-alignment task, first compare `:root` against the spec palette. If `:root` matches (this session's case), the work shifts to "usage hygiene" (replacing hardcoded values with `var()` references). Saves enormous time vs. assuming there's a global redefinition needed.

6. **Frequency table > exhaustive scan for color audits** — for large-volume drift discovery (395 hardcoded references), a `grep -oE | sort | uniq -c | sort -rn` pipeline produces a Pareto distribution that reveals the 1–2 high-impact decisions worth surfacing to the user (here: `#9090a4` × 119) instead of forcing them to read 395 lines of context.

---

## Session metrics

- **Duration:** ~2h (rough estimate from message timestamps)
- **Tool calls:** ~75 (heavy preview verification phase + git/PR pipeline)
- **Lines net changed:** +466 / -45
- **GitHub issues closed:** #81 (and screen-title spec issue surfaced this session, no number)
- **PRs merged:** 1 (#85)
- **DB migrations:** 0
- **New lessons:** 0 (all patterns are validations of existing techniques)

---

## Open at session close

1. **Note A decision** (color audit) — A1, A2, or A3? Required before color sweep can ship.
2. iPhone smoke test of S069 ship — pull-to-refresh on PWA picks up SW v126.
3. S069 PLAN backlog (next session priority order):
   - Color sweep (after Note A decision)
   - E2E re-test of approval workflow (verify S067/S068 hotfixes hold)
   - Claim-during-onboarding flow
   - EditMyProfile design diffs (waiting on user screenshot)
   - Performance: parallelize auth → leagues → match queries (Issue #54 part-2)
   - FT-15 Pairs Leaderboard (Issue #25, DB-touching)

---

**Production state at session close:**
- Live URL: padel-battle.vercel.app
- Commit: `25f7a2d`
- SW: v126
- Vercel deploy: `dpl_G2ip2fiLPiVhik4y2xpWB1Vpi4D4` (READY)
- Branch: `main` clean
