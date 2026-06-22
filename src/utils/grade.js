// FT-17 (S084) — Player Grade single source of truth.
// Self-assessment questionnaire → weighted total (0–72) → 10-tier ladder.
// Design spec: planning/FT-17-player-grade.md (v4, signed off).
//
// The "answer spine": every dimension is scored on the same i–v scale, where
// consistency + "holds under pressure" are baked into the option meaning rather
// than being their own dimensions. Each option maps to raw points 0–4.
// Weighted points = raw × dimension weight. Advanced-technique dimensions are
// weighted ×3 so the harder shots carry a player into the top grades.
//
// self_assessment JSONB shape (stored on players.self_assessment):
//   { answers:[0..4 ×8], total, computed_grade, version, rated_at }
// answers are RAW 0–4 per dimension in GRADE_RUBRIC order; weights live here.

export const GRADE_VERSION = 4;

// 10-tier ladder, lowest → highest. order is used for sorting / banding.
export const GRADE_META = {
  "D-": { label: "Newcomer",             color: "#9090a4", order: 0 },
  "D":  { label: "Novice",               color: "#9090a4", order: 1 },
  "D+": { label: "Beginner",             color: "#9090a4", order: 2 },
  "C-": { label: "Lower Intermediate",   color: "#4da6ff", order: 3 },
  "C":  { label: "Intermediate",         color: "#4da6ff", order: 4 },
  "C+": { label: "Solid Intermediate",   color: "#4da6ff", order: 5 },
  "B-": { label: "Upper Intermediate",   color: "#4ADE80", order: 6 },
  "B":  { label: "Strong",               color: "#4ADE80", order: 7 },
  "B+": { label: "Advanced",             color: "#4ADE80", order: 8 },
  "A":  { label: "Expert / Competitive", color: "#FFD700", order: 9 },
};

export const GRADE_ORDER = ["D-","D","D+","C-","C","C+","B-","B","B+","A"];

// 8 weighted dimensions × 5 options. Order is authoritative for the answers array.
// opts[] are the per-dimension descriptors shown in the questionnaire.
export const GRADE_RUBRIC = [
  {
    key: "groundstrokes", name: "Groundstrokes", sub: "Forehand/backhand off the bounce", weight: 2,
    opts: [
      "Contact unreliable; mishits common, slow pace only",
      "Basic forehand/backhand exist but control is weak; loses shape when rushed",
      "Rallies with reliable depth & direction at a steady pace",
      "Controls depth, pace & cross/down-the-line under pressure",
      "Strong shot package — varies pace, spin & angle to dictate",
    ],
  },
  {
    key: "serve_return", name: "Serve & Return", sub: "", weight: 1,
    opts: [
      "Serve just starts the point; return floats or errors",
      "Reliable serve placement; return blocks back at medium pace",
      "Consistent serve to body/T; return neutralises most serves",
      "Serves with intent & variation; aggressive returns under pressure",
      "Serve & return are weapons — on the attack from the first ball",
    ],
  },
  {
    key: "overheads", name: "Overheads & Smash", sub: "bandeja · víbora · smash · x3/x4 · rulo · gancho", weight: 3,
    opts: [
      "Overheads avoided; smash mishit or netted",
      "Bandeja emerging to hold net; flat smash inconsistent",
      "Reliable bandeja; controlled smash on easy balls",
      "Working víbora + controlled smash; attacks under pressure",
      "Full range incl. x3/x4, rulo & gancho, executed under pressure",
    ],
  },
  {
    key: "glass", name: "Glass / Wall Usage", sub: "Backglass · sideglass · double glass", weight: 3,
    opts: [
      "Doesn't read rebounds; ball off the wall usually lost",
      "Reads back glass late; side glass not trusted",
      "Comfortable off both walls; handles standard rebounds",
      "Defends & resets off back + side glass under pressure",
      "Anticipates rebounds; attacks off x3/x4 — glass is a weapon",
    ],
  },
  {
    key: "net", name: "Net Play & Volleys", sub: "", weight: 2,
    opts: [
      "Volleys pop up and float or go into the net; not confident at the net",
      "Blocks easy volleys; basic control with no pressure",
      "Controls volleys with reliable placement",
      "Punches & angles volleys; holds the net under pressure",
      "Dominates net exchanges — put-aways & drop volleys by choice",
    ],
  },
  {
    key: "transition", name: "Transition & Soft Game", sub: "chiquita · lob · bajada · drop", weight: 3,
    opts: [
      "No feel for drops or soft blocks; lob hit or miss",
      "Limited touch; lob to escape pressure only",
      "Reliable lob & chiquita to reset the point",
      "Bajada & drops used tactically — turns defence into attack",
      "World-class touch, disguise & tempo control under pressure",
    ],
  },
  {
    key: "positioning", name: "Positioning & Movement", sub: "", weight: 2,
    opts: [
      "Both players chase the ball; limited movement & balance",
      "Knows up/back roles but slow to react, often out of place",
      "Moves as a pair; covers court with adequate footwork",
      "Efficient footwork & recovery; covers court under pressure",
      "Reads play early; elite speed & balance set traps, close space",
    ],
  },
  {
    key: "tactics", name: "Tactics & Attack/Defence", sub: "", weight: 2,
    opts: [
      "Defends only; cannot build a point",
      "Defends well; basic attacking shots inconsistent",
      "Attacks & defends comfortably; understands spacing",
      "Builds points with intent; adjusts the game plan mid-match",
      "Dominates tempo; exploits weaknesses systematically by choice",
    ],
  },
];

// Sum of weights = 18 → weighted max = 18 × 4 = 72.
export const GRADE_MAX = GRADE_RUBRIC.reduce((s, d) => s + d.weight * 4, 0);

// Banding: weighted total (0–72) → tier. [min, max] inclusive.
const GRADE_BANDS = [
  { grade: "D-", min: 0,  max: 6  },
  { grade: "D",  min: 7,  max: 14 },
  { grade: "D+", min: 15, max: 21 },
  { grade: "C-", min: 22, max: 28 },
  { grade: "C",  min: 29, max: 35 },
  { grade: "C+", min: 36, max: 43 },
  { grade: "B-", min: 44, max: 50 },
  { grade: "B",  min: 51, max: 57 },
  { grade: "B+", min: 58, max: 65 },
  { grade: "A",  min: 66, max: 72 },
];

// computeGrade(answers) → { total, grade }
// answers: array of 8 raw integers 0–4 (one per GRADE_RUBRIC dimension, in order).
export function computeGrade(answers) {
  if (!Array.isArray(answers) || answers.length !== GRADE_RUBRIC.length) {
    return { total: 0, grade: null };
  }
  let total = 0;
  for (let i = 0; i < GRADE_RUBRIC.length; i++) {
    const raw = Math.max(0, Math.min(4, Number(answers[i]) || 0));
    total += raw * GRADE_RUBRIC[i].weight;
  }
  const band = GRADE_BANDS.find(b => total >= b.min && total <= b.max) || GRADE_BANDS[0];
  return { total, grade: band.grade };
}

// Pill colour for a grade letter (falls back to muted).
export function gradeColor(grade) {
  return GRADE_META[grade]?.color || "#9090a4";
}
