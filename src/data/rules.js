export const RULES=[
  {title:"Scoring",content:"Best of 3 sets. Tennis scoring: 15, 30, 40, deuce. Tiebreak at 6-6 (first to 7, win by 2). Agree on Golden Point vs Advantage before match."},
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
