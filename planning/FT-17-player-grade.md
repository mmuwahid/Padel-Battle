# FT-17 — Player Grade / Level (self-assessment + admin override)

> **Status:** DESIGN v4 — awaiting sign-off on the matrix. No code until approved.
> **Drafted:** S084 (2026-06-19) · **v2:** 10-tier ladder, full matrix, i–v labels · **v3:** merged 8-dim model (online sample), consistency folded into the answer spine, **weighted** advanced techniques, weighted total 0–72, scoring walkthrough · **v4:** descriptions sharpened with the 9-dim CSV + deep-research sources, **Playtomic reference column** added. Mental & Consistency stay folded into the spine (cross-cutting qualities, not skills); Movement stays inside Positioning & Movement.
> **Owner decisions locked:** ladder = `D- D D+ C- C C+ B- B B+ A` (10 tiers); source = self-assessment questionnaire; who-sets = **self + admin override**; **weighted** (advanced techniques count more); clean pill (no provenance); **no** leaderboard column; blank until opt-in.

---

## 1. Goal

A single, legible **skill grade** per player that is self-computed from a structured, padel-specific self-assessment, can be overridden by a league admin, and shows on the profile surfaces. Descriptive (how good a player is, for pairing/matchmaking) — **not** competitive ranking (ELO/leaderboard stays the result-based metric).

---

## 2. The ladder (10 tiers)

4 main tiers (**D / C / B / A**), each lower tier carrying three sub-bands (`− · plain · +`); **A** is the single elite pinnacle.

| Grade | Label | ≈ Playtomic | One-line identity |
|-------|-------|-------------|-------------------|
| **D-** | Newcomer            | 0–0.5 | Just starting; learning the rules and contact. |
| **D**  | Novice              | 1.0   | Can keep a few balls going on easy feeds. |
| **D+** | Beginner            | 1.5   | Sustains short rallies; basic positioning. |
| **C-** | Lower Intermediate  | 2.0   | Consistent on easy balls; starting wall play. |
| **C**  | Intermediate        | 2.5   | Reliable fundamentals; bandeja appears; up/back understood. |
| **C+** | Solid Intermediate  | 3.0   | Reliable groundstrokes + bandeja + back-glass. |
| **B-** | Upper Intermediate  | 3.5   | Controls glass + net; víbora working; coordinated pair play. |
| **B**  | Strong              | 4.0   | All-court game; attacks under pressure; reads the point. |
| **B+** | Advanced            | 4.5–5.0 | Full overhead arsenal; tactical; dictates points. |
| **A**  | Expert / Competitive | 5.5–7.0 | Tournament-level all-court game, weaponised under pressure. |

> Playtomic mapping is approximate, anchored to the deep-research source (e.g. Playtomic ~3.0 ≈ a strong C/B club player). It is an external reference only — the grade is computed from the matrix, not from Playtomic.

---

## 3. The answer scale — the "spine" (consistency + pressure baked in)

Consistency and "holds under pressure" are **not** dimensions — they are the *quality* of every skill. So they live in the shared i–v answer ladder that **every** dimension is scored against. (This repurposes the online sample's "Consistency" and "Under Pressure" rows as the measuring stick instead of double-counting them.)

| Option | Points | Meaning (applies to every dimension) |
|--------|--------|--------------------------------------|
| **i**   | 0 | Error-driven; slow pace only; shot avoided |
| **ii**  | 1 | Structured but medium-pace only; loses shape when rushed |
| **iii** | 2 | Reliable & consistent at a medium pace |
| **iv**  | 3 | Reliable at medium-high pace, under pressure |
| **v**   | 4 | Sustains high pace & intensity across a full match; weaponised |

Options are labelled **i–v** (roman numerals) to avoid collision with the D/C/B/A grade letters.

---

## 4. The grading matrix (8 dimensions × 5 options · weighted)

Merged from our model + the online sample. Specialised padel shots live in dims 3 (Overheads) and 6 (Transition). **Advanced-technique dimensions are weighted ×3** so the harder shots carry you into the top grades.

| # | Dimension | Wt | i (0) | ii (1) | iii (2) | iv (3) | v (4) |
|---|-----------|----|-------|--------|---------|--------|-------|
| 1 | **Groundstrokes** — FH/BH off the bounce | ×2 | Contact unreliable; mishits common, slow pace only | Basic FH/BH exist but control is weak; loses shape when rushed | Rallies with reliable depth & direction at a steady pace | Controls depth, pace & cross/down-the-line under pressure | Strong shot package — varies pace, spin & angle to dictate |
| 2 | **Serve & Return** | ×1 | Serve just starts the point; return floats or errors | Reliable serve placement; return blocks back at medium pace | Consistent serve to body/T; return neutralises most serves | Serves with intent & variation; aggressive returns under pressure | Serve & return are weapons — on the attack from the first ball |
| 3 | **Overheads & Smash** — bandeja · víbora · smash · x3/x4 · rulo · gancho | **×3** | Overheads avoided; smash mishit or netted | Bandeja emerging to hold net; flat smash inconsistent | Reliable bandeja; controlled smash on easy balls | Working víbora + controlled smash; attacks under pressure | Full range incl. x3/x4, rulo & gancho, executed under pressure |
| 4 | **Glass / Wall Usage** — back & side glass | **×3** | Doesn't read rebounds; ball off the wall usually lost | Reads back glass late; side glass not trusted | Comfortable off both walls; handles standard rebounds | Defends & resets off back + side glass under pressure | Anticipates rebounds; attacks off x3/x4 — glass is a weapon |
| 5 | **Net Play & Volleys** | ×2 | Volleys pop up or net; unstable at the net | Blocks easy volleys; basic control with no pressure | Controls volleys with reliable placement | Punches & angles volleys; holds the net under pressure | Dominates net exchanges — put-aways & drop volleys by choice |
| 6 | **Transition & Soft Game** — chiquita · lob · bajada · drop | **×3** | No feel for drops or soft blocks; lob hit or miss | Limited touch; lob to escape pressure only | Reliable lob & chiquita to reset the point | Bajada & drops used tactically — turns defence into attack | World-class touch, disguise & tempo control under pressure |
| 7 | **Positioning & Movement** | ×2 | Both players chase the ball; limited movement & balance | Knows up/back roles but slow to react, often out of place | Moves as a pair; covers court with adequate footwork | Efficient footwork & recovery; covers court under pressure | Reads play early; elite speed & balance set traps, close space |
| 8 | **Tactics & Attack/Defence** | ×2 | Defends only; cannot build a point | Defends well; basic attacking shots inconsistent | Attacks & defends comfortably; understands spacing | Builds points with intent; adjusts the game plan mid-match | Dominates tempo; exploits weaknesses systematically by choice |

**Weights:** ×3 ×3 ×3 (Overheads, Glass, Transition) · ×2 ×2 ×2 ×2 (Groundstrokes, Net, Positioning, Tactics) · ×1 (Serve & Return). **Sum of weights = 18 → weighted max = 18 × 4 = 72.**

---

## 5. How answers compute to a grade

1. For each dimension, the player picks one option → raw points **0–4**.
2. **Weighted points** = raw × dimension weight.
3. **Total** = sum of the 8 weighted points (range **0–72**).
4. **Grade** = band the total falls into (§6), then the sub-band modifier (− · plain · +) from position within the band.

### Worked example — advanced all-court player

| Dimension | Wt | Answer | Raw | Weighted |
|-----------|----|--------|-----|----------|
| Groundstrokes | ×2 | iv | 3 | 6 |
| Serve & Return | ×1 | iv | 3 | 3 |
| Overheads & Smash | ×3 | v | 4 | 12 |
| Glass / Wall Usage | ×3 | iv | 3 | 9 |
| Net Play & Volleys | ×2 | iv | 3 | 6 |
| Transition & Soft Game | ×3 | iii | 2 | 6 |
| Positioning & Movement | ×2 | iv | 3 | 6 |
| Tactics & Attack/Defence | ×2 | iv | 3 | 6 |
| **TOTAL** | | | | **54 / 72** → band 51–57 → **B** |

### Contrast — why weighting matters

A player who maxes every **fundamental** (Groundstrokes v, Serve v, Net v, Positioning v) but owns **no** advanced shots (Overheads/Glass/Transition all at i) and is moderate tactically:
`8 + 4 + 0 + 0 + 8 + 0 + 8 + 4 = 32 / 72 → C`. Solid intermediate, but the advanced ×3 dimensions are what carry a player into **B / A** — exactly the intent.

---

## 6. Banding (weighted total 0–72 → tier)

| Total | Grade |  | Total | Grade |
|---|---|---|---|---|
| 0–6   | **D-** | | 36–43 | **C+** |
| 7–14  | **D**  | | 44–50 | **B-** |
| 15–21 | **D+** | | 51–57 | **B**  |
| 22–28 | **C-** | | 58–65 | **B+** |
| 29–35 | **C**  | | 66–72 | **A**  |

> Cutoffs tunable. A is deliberately elite (needs ~66+/72 = near-max, heavily in the advanced ×3 dimensions).

---

## 7. Where the grade is visible

| Surface | File | Treatment |
|---------|------|-----------|
| **Own My-Profile** | `ProfileView.jsx` `.protags` row | Clean grade pill (letter only) next to country/age/handedness. **+ a "Self-Assessment" entry point** below the hero (next to Edit Profile) → opens the questionnaire. |
| **Drill-down player profile** | `PlayerStats.jsx` `.dpro` hero tag row | Same clean grade pill (read-only). |
| **Edit profile (self)** | `EditMyProfile.jsx` | Current-grade row + "Take / Retake self-assessment" button → questionnaire sheet → computes & saves. |
| **Edit profile (admin)** | `EditPlayerModal.jsx` | Current-grade row + admin tier picker (set any tier directly), `grade_source='admin'`. |

Pill colour (reuses medal palette): **A** → gold `#FFD700`; **B / B±** → green `#4ADE80`; **C / C±** → blue `#4da6ff`; **D / D±** → muted `#9090a4`. No "self/admin" marker on the pill (kept clean per decision).

---

## 8. Data model (additive migration `s084_player_grade`)

```sql
ALTER TABLE players ADD COLUMN grade text
  CHECK (grade IN ('D-','D','D+','C-','C','C+','B-','B','B+','A'));   -- nullable, blank until opt-in
ALTER TABLE players ADD COLUMN grade_source text
  CHECK (grade_source IN ('self','admin'));                          -- nullable
ALTER TABLE players ADD COLUMN self_assessment jsonb;                -- nullable
```

`self_assessment` shape: `{ "answers":[3,3,4,3,3,2,3,3], "total":54, "computed_grade":"B", "version":3, "rated_at":"..." }`
(`answers` = raw 0–4 per dimension, in matrix order; weights live in code, not stored.)

- **Self path:** existing `players_update_self` RLS lets a claimed user write `grade`, `grade_source='self'`, `self_assessment` (confirm column allow-list). No new RPC.
- **Admin path:** EditPlayerModal's existing admin-gated `.update({...})` adds `grade` + `grade_source='admin'`; does not touch `self_assessment`. Override is sticky until the player retakes (retake resets `grade_source='self'`).

---

## 9. Components to add / touch

- **NEW `GradeAssessmentModal.jsx`** — bottom-sheet, 8 question cards (5 i–v descriptor options each), live weighted running total, result screen with computed grade + Save. Mirrors `AvatarCropModal`/`EditMyProfile` pattern.
- **NEW helper** `utils/grade.js` (or in `helpers.js`): `computeGrade(answers) → { total, grade }` + `GRADE_META` (label, colour, order) + `GRADE_RUBRIC` (the matrix + **weights** + band cutoffs) — single source of truth.
- **`EditMyProfile.jsx`** / **`EditPlayerModal.jsx`** / **`ProfileView.jsx`** / **`PlayerStats.jsx`** — wire per §7.
- **App.jsx players select** — confirm new columns reach the UI.

---

## 10. Decisions (resolved)

1. **Cutoffs** — per §6 (10-tier, weighted 0–72), tunable. ✔
2. **Weighting** — **weighted v3** (advanced techniques ×3, core ×2, serve ×1). *Supersedes the earlier "equal weight v1".* ✔
3. **Consistency** — folded into the answer spine, not a dimension. ✔
4. **Provenance** — clean pill, no self/admin marker. ✔
5. **Leaderboard** — no grade column (would squeeze the table). ✔
6. **Required vs optional** — blank until the player opts in. ✔
7. **Admin transparency** — no admin-set indicator; keep clean. ✔

---

## 11. Build order (after matrix sign-off)

1. Migration `s084_player_grade` (additive, low blast radius).
2. `computeGrade` + `GRADE_META` + `GRADE_RUBRIC` (with weights) helper (pure, node-harness tested incl. the §5 worked example).
3. `GradeAssessmentModal.jsx`.
4. Wire EditMyProfile (self) + the profile-page Self-Assessment entry point.
5. Wire EditPlayerModal (admin override).
6. Render pill in ProfileView + PlayerStats.
7. SW bump, deploy, smoke test.
