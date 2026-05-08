// S068: emoji icons replaced with Icon SVG names from Icon.jsx (no more emojis
// per user direction). Renames per iPhone-mockup screenshot:
//   "First Blood" / "Hot Streak" / "Unstoppable" / "MVP Machine" / "Legend"
//   / "Comeback" / "Sharpshooter" / "Centurion" / "Veteran" / "Iron Wall"
export const ACHS = [
  { id: "w1", icon: "zap",     name: "First Blood",  desc: "Win your first match",        ck: s => s.wins >= 1 },
  { id: "s3", icon: "flame",   name: "Hot Streak",    desc: "3 consecutive wins",          ck: s => { let m=0,c=0; s.streak.forEach(r=>{if(r==="W"){c++;m=Math.max(m,c);}else c=0;}); return m>=3; } },
  { id: "s5", icon: "muscle",  name: "Unstoppable",   desc: "5 consecutive wins",          ck: s => { let m=0,c=0; s.streak.forEach(r=>{if(r==="W"){c++;m=Math.max(m,c);}else c=0;}); return m>=5; } },
  { id: "m3", icon: "star",    name: "MVP Machine",   desc: "3+ MOTM awards",              ck: s => s.motm >= 3 },
  { id: "m5", icon: "crown",   name: "Legend",        desc: "5+ MOTM awards",              ck: s => s.motm >= 5 },
  { id: "cb", icon: "refresh", name: "Comeback",      desc: "Win after losing S1",         ck: s => s.comebacks >= 1 },
  { id: "sh", icon: "target",  name: "Sharpshooter",  desc: "70%+ win rate",               ck: s => s.games >= 5 && (s.wins / s.games) >= 0.7 },
  { id: "t1", icon: "hash",    name: "Centurion",     desc: "Play 10+ matches",            ck: s => s.games >= 10 },
  { id: "t2", icon: "award",   name: "Veteran",       desc: "Play 20+ matches",            ck: s => s.games >= 20 },
  { id: "iw", icon: "shield",  name: "Iron Wall",     desc: "Positive game diff",          ck: s => s.games >= 5 && (s.gamesWon - s.gamesLost) > 0 },
];
