// S067: rules data restructured per user iPhone-mockup screenshots.
// Each rule is its OWN top-level collapsible card (Match Completion / Deuce
// Rule / Tie-Break (6-6) used to be subRules of "Scoring & Ranked Matches" —
// now they're 3 separate cards under a section header). Each rule may carry
// `tags: [{ l, c }]` where `c` = "g" (green/win), "r" (red/danger), "go" (gold/argued).
// Sections render their own group header (eyebrow + subtitle) above the cards.

export const SECTIONS = [
  {
    id: "scoring",
    title: "Scoring & Ranked Matches",
    subtitle: "FIP / Premier Padel standard",
    accent: "rules",   // green section accent
    icon: "trophy",    // section header icon
    rules: [
      {
        id: "match-completion",
        title: "Match Completion",
        icon: "trophy",
        preview: "2 sets required to close",
        content: "A match counts toward ranking ONLY when completed. Best-of-3 sets — one pair must win 2 sets. Incomplete matches are void.",
        tags: [
          { l: "2 sets to win", c: "g" },
          { l: "Incomplete = void", c: "r" },
        ],
      },
      {
        id: "deuce-rule",
        title: "Deuce Rule",
        icon: "activity",
        preview: "Win 2 consecutive at 40-40",
        content: "At 40-40 (deuce), Advantage play applies — win 2 consecutive points. No Golden Point cutoff.",
        tags: [
          { l: "No Golden Point", c: "go" },
          { l: "Win by 2", c: "g" },
        ],
      },
      {
        id: "tie-break",
        title: "Tie-Break (6-6)",
        icon: "hash",
        preview: "First to 7, 2-point margin",
        content: "When a set reaches 6-6, a tie-break is played. First to 7 points with a 2-point margin wins the set 7-6.",
        tags: [
          { l: "First to 7", c: "g" },
          { l: "2-point margin", c: "go" },
        ],
      },
      {
        id: "the-serve",
        title: "The Serve",
        icon: "racket",
        preview: "Underhand, bounce first",
        content: "Underhand, bounce first, struck at/below waist. Diagonally into opposite box. Two attempts. Ball may hit glass after bounce (rally continues), but fence = fault.",
        tags: [
          { l: "Underhand", c: "g" },
          { l: "Glass = play on", c: "g" },
          { l: "Fence = fault", c: "r" },
        ],
      },
      {
        id: "return-of-serve",
        title: "Return of Serve",
        icon: "racket",
        preview: "Must bounce before return",
        content: "Must bounce first. You cannot volley the return — instant loss of point.",
        tags: [
          { l: "No volley return", c: "r" },
        ],
      },
      {
        id: "walls-fences",
        title: "Walls & Fences",
        icon: "shield",
        preview: "Glass = play on, fence = lost",
        content: "During rallies, ball can bounce off glass walls. Must always bounce on ground before hitting a wall on your side.",
        tags: [
          { l: "Glass legal", c: "g" },
          { l: "Bounce first", c: "g" },
        ],
      },
      {
        id: "outside-court",
        title: "Playing Outside Court",
        icon: "court-any",
        preview: "Through door = chase it",
        content: "Ball goes over back wall or through door after bouncing? You may leave the court to play it back before second bounce.",
        tags: [
          { l: "Chase legal", c: "g" },
        ],
      },
      {
        id: "net-touch",
        title: "Net Touch",
        icon: "alert",
        preview: "Touch net = instant point lost",
        content: "Touch net with racket, body, or clothing = lose point. No exceptions.",
        tags: [
          { l: "Instant loss", c: "r" },
        ],
      },
      {
        id: "switching-sides",
        title: "Switching Sides",
        icon: "refresh",
        preview: "Every odd game",
        content: "Change ends after every odd game (1-0, 2-1, etc.). Max 90 seconds rest.",
        tags: [
          { l: "Odd games", c: "g" },
          { l: "90s max rest", c: "g" },
        ],
      },
    ],
  },
  {
    id: "argued",
    title: "Most Argued Calls",
    subtitle: "Settle it once and for all",
    accent: "argued",  // gold section accent
    icon: "zap",       // S067 user feedback: lightning icon for argued section
    rules: [
      { id: "a1", isArgued: true, title: "Serve hits net → bounces in box → goes out door?", icon: "help", preview: "Depends on out-of-court rule",
        content: "With out-of-court play: LET (replay). Without: FAULT. Agree before match." },
      { id: "a2", isArgued: true, title: "Ball hits fence after serve bounce?", icon: "help", preview: "Fault — strictest rule",
        content: "FAULT. On serve, after bounce: glass = play on, fence = fault. Strictest rule in padel." },
      { id: "a3", isArgued: true, title: "Golden Point or Advantage at deuce?", icon: "help", preview: "Must agree before match",
        content: "No universal default. WPT uses Golden Point. FIP uses advantage. MUST agree before match. Can't change mid-set." },
      { id: "a4", isArgued: true, title: "Opponent wasn't ready when I served?", icon: "help", preview: "LET if no return attempt",
        content: "LET if they didn't attempt return. If they attempted return, can't claim 'not ready'." },
      { id: "a5", isArgued: true, title: "Ball bounces my side → hits glass → goes over net to opponent?", icon: "help", preview: "Your point",
        content: "YOUR point. Ball crossing back over after your wall = you win." },
      { id: "a6", isArgued: true, title: "Can I reach over the net?", icon: "help", preview: "Only on follow-through",
        content: "NO. Racket may cross net only on follow-through AFTER contact on your side." },
      { id: "a7", isArgued: true, title: "Ball hits my body during rally?", icon: "help", preview: "You lose the point",
        content: "You LOSE the point. Must only be struck with racket." },
      { id: "a8", isArgued: true, title: "Who serves first in tiebreak?", icon: "help", preview: "1 point then rotate by 2",
        content: "Player whose turn it is serves 1 point, then each player serves 2 consecutive. Change ends every 6 points." },
    ],
  },
];

// Backwards-compat exports — preserved so any external reference still works.
// Flatten SECTIONS to a single rules list (excluding argued) + a separate
// argued list, mirroring the pre-S067 shape (RULES, ARGUED) so legacy callers
// don't break.
export const RULES = SECTIONS.find(s => s.id === "scoring")?.rules || [];
export const ARGUED = (SECTIONS.find(s => s.id === "argued")?.rules || []).map(r => ({
  q: r.title,
  a: r.content,
}));
