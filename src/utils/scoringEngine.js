// Padel scoring state machine.
// Points: 0→15→30→40→Game, with Deuce/Advantage logic.
// Sets: first to 6 games win by 2; tiebreak at 6-6 (first to 7, win by 2).
// Match: best of 3 sets (first to 2).

const PT = ['0', '15', '30', '40'];

export function createInitialLiveState() {
  return {
    pA: 0, pB: 0,       // raw game points (deuce = both 3+, advantage = one ahead by 1+)
    gA: 0, gB: 0,       // games in current set
    tbA: 0, tbB: 0,     // tiebreak points (active when inTiebreak)
    sA: 0, sB: 0,       // sets won
    completedSets: [],  // [{a, b}] — each completed set's game score
    inTiebreak: false,
    matchOver: false,
    history: []         // undo stack — each entry is a snapshot (no history field)
  };
}

function snap(state) {
  const { history: _h, ...rest } = state;
  return rest;
}

export function scorePoint(state, team) {
  if (state.matchOver) return state;
  const s = { ...state, history: [...state.history, snap(state)] };
  return s.inTiebreak ? addTbPoint(s, team) : addGamePoint(s, team);
}

function addGamePoint(state, team) {
  let { pA, pB } = state;
  if (team === 'A') pA++; else pB++;
  // Win condition: ≥4 points AND lead by ≥2 (handles deuce loops)
  if (pA >= 4 && pA - pB >= 2) return winGame({ ...state, pA, pB }, 'A');
  if (pB >= 4 && pB - pA >= 2) return winGame({ ...state, pA, pB }, 'B');
  return { ...state, pA, pB };
}

function winGame(state, team) {
  let { gA, gB } = state;
  if (team === 'A') gA++; else gB++;
  const base = { ...state, pA: 0, pB: 0, gA, gB };
  // Tiebreak at 6-6
  if (gA === 6 && gB === 6) return { ...base, inTiebreak: true, tbA: 0, tbB: 0 };
  // Set win: first to 6, lead by ≥2 (max 7-5)
  if (gA >= 6 && gA - gB >= 2) return winSet(base, 'A');
  if (gB >= 6 && gB - gA >= 2) return winSet(base, 'B');
  return base;
}

function addTbPoint(state, team) {
  let { tbA, tbB } = state;
  if (team === 'A') tbA++; else tbB++;
  // Tiebreak win: ≥7 points, lead by ≥2
  if (tbA >= 7 && tbA - tbB >= 2) return winTiebreak({ ...state, tbA, tbB }, 'A');
  if (tbB >= 7 && tbB - tbA >= 2) return winTiebreak({ ...state, tbA, tbB }, 'B');
  return { ...state, tbA, tbB };
}

function winTiebreak(state, team) {
  const score = team === 'A' ? { a: 7, b: 6 } : { a: 6, b: 7 };
  return winSet({ ...state, inTiebreak: false, tbA: 0, tbB: 0 }, team, score);
}

function winSet(state, team, overrideScore) {
  const { gA, gB, sA, sB, completedSets } = state;
  const score = overrideScore || { a: gA, b: gB };
  const newSA = sA + (team === 'A' ? 1 : 0);
  const newSB = sB + (team === 'B' ? 1 : 0);
  return {
    ...state,
    gA: 0, gB: 0,
    sA: newSA, sB: newSB,
    completedSets: [...completedSets, score],
    matchOver: newSA === 2 || newSB === 2
  };
}

export function undoPoint(state) {
  if (!state.history.length) return state;
  const hist = [...state.history];
  const prev = hist.pop();
  return { ...prev, history: hist };
}

export function getLiveDisplay(state) {
  const { pA, pB, gA, gB, tbA, tbB, inTiebreak } = state;
  let ptA, ptB, isDeuce = false;

  if (inTiebreak) {
    ptA = String(tbA);
    ptB = String(tbB);
  } else if (pA < 3 || pB < 3) {
    ptA = PT[Math.min(pA, 3)];
    ptB = PT[Math.min(pB, 3)];
  } else if (pA === pB) {
    ptA = ptB = '40';
    isDeuce = true;
  } else {
    ptA = pA > pB ? 'Ad' : '40';
    ptB = pB > pA ? 'Ad' : '40';
  }

  return { ptA, ptB, gA, gB, isDeuce, inTiebreak };
}

// Convert live state's completed sets to [[a, b], ...] for saving to DB
export function liveToSets(state) {
  return state.completedSets.map(({ a, b }) => [a, b]);
}
