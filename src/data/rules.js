export const RULES=[
  // GitHub issue #10 (S044): expanded Scoring entry with the 4 official FIP-aligned
  // sub-rules used by this league. Display-only — scoringEngine.js has not been
  // updated to enforce these (deferred to a later session).
  {
    title:"Scoring & Ranked Matches",
    intro:"How matches count toward league rankings — FIP / Premier Padel standard.",
    subRules:[
      {
        title:"Match Completion",
        content:"A match counts toward league ranking ONLY when completed. Best-of-3 sets required — one pair must win 2 sets to close the match. Incomplete matches (e.g. time runs out at 1-1 in sets) are void and do not count. Sets in progress when time expires are not recorded."
      },
      {
        title:"Deuce Rule (Game Tiebreaker)",
        content:"At 40-40 (deuce) in any game, Advantage play applies — win 2 consecutive points to win the game. Applies to all sets and tie-breaks. No Golden Point cutoff. Games may extend indefinitely (Deuce 1, Deuce 2, Advantage, Deuce 2, Deuce 3, etc.)."
      },
      {
        title:"Tie-Break Format (at 6-6 in a set)",
        content:"When a set reaches 6-6 games, a standard tie-break is played. First pair to 7 points (with a 2-point margin) wins the set 7-6. Numeric scoring: \"zero, 1, 2, 3, … 7\" — not 15-30-40. Serving rotation: the player whose turn it is serves the first point only (right side); opponents serve the next 2 points (left, then right); thereafter every player serves 2 consecutive points in rotation. Players change ends every 6 points. Same format applies in sets 1, 2, and 3."
      },
      {
        title:"Incomplete / Interrupted Sets",
        content:"If a set is interrupted before completion (e.g. 4-1 at time limit, injury, light loss), the set is void and does not count toward ranking. Only complete sets count: a set must reach either 6 games with a 2-game minimum lead (e.g. 6-4, 7-5) OR a tie-break conclusion at 6-6 (first to 7 with 2-point margin). Abandoned sets restart from 0-0 next session."
      },
    ]
  },
  {title:"The Serve",content:"Underhand, bounce first, struck at/below waist. Diagonally into opposite box. Two attempts. Ball may hit glass after bounce (rally continues), but fence = fault."},
  {title:"Return of Serve",content:"Must bounce first. You cannot volley the return — instant loss of point."},
  {title:"Walls & Fences",content:"During rallies, ball can bounce off glass walls. Must always bounce on ground before hitting a wall on your side."},
  {title:"Playing Outside Court",content:"Ball goes over back wall or through door after bouncing? You may leave the court to play it back before second bounce."},
  {title:"Net Touch",content:"Touch net with racket, body, or clothing = lose point. No exceptions."},
  {title:"Switching Sides",content:"Change ends after every odd game (1-0, 2-1, etc.). Max 90 seconds rest."},
];

export const ARGUED=[
  {q:"Serve hits net → bounces in box → goes out door?",a:"With out-of-court play: LET (replay). Without: FAULT. Agree before match."},
  {q:"Ball hits fence (mesh) after serve bounce?",a:"FAULT. On serve, after bounce: glass = play on, fence = fault. Strictest rule in padel."},
  {q:"Golden Point or Advantage at deuce?",a:"No universal default. WPT uses Golden Point. FIP uses advantage. MUST agree before match. Can't change mid-set."},
  {q:"Opponent wasn't ready when I served?",a:"LET if they didn't attempt return. If they attempted return, can't claim 'not ready'."},
  {q:"Ball bounces my side → hits glass → goes over net to opponent?",a:"YOUR point. Ball crossing back over after your wall = you win."},
  {q:"Can I reach over the net?",a:"NO. Racket may cross net only on follow-through AFTER contact on your side."},
  {q:"Ball hits my body during rally?",a:"You LOSE the point. Must only be struck with racket."},
  {q:"Who serves first in tiebreak?",a:"Player whose turn it is serves 1 point, then each player serves 2 consecutive. Change ends every 6 points."},
];
