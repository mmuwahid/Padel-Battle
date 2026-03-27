export const ACHS=[
  {id:"w1",icon:"🌟",name:"First Blood",desc:"Win first match",ck:s=>s.wins>=1},
  {id:"s3",icon:"🔥",name:"Hot Streak",desc:"3 consecutive wins",ck:s=>{let m=0,c=0;s.streak.forEach(r=>{if(r==="W"){c++;m=Math.max(m,c);}else c=0;});return m>=3;}},
  {id:"s5",icon:"💥",name:"Unstoppable",desc:"5 consecutive wins",ck:s=>{let m=0,c=0;s.streak.forEach(r=>{if(r==="W"){c++;m=Math.max(m,c);}else c=0;});return m>=5;}},
  {id:"m3",icon:"⭐",name:"MVP Machine",desc:"3+ MOTM awards",ck:s=>s.motm>=3},
  {id:"m5",icon:"🏅",name:"Living Legend",desc:"5+ MOTM awards",ck:s=>s.motm>=5},
  {id:"cb",icon:"💪",name:"Comeback King",desc:"Win after losing set 1",ck:s=>s.comebacks>=1},
  {id:"sh",icon:"🎯",name:"Sharpshooter",desc:"70%+ win rate (5+ games)",ck:s=>s.games>=5&&(s.wins/s.games)>=0.7},
  {id:"t1",icon:"🔟",name:"Centurion",desc:"Play 10+ matches",ck:s=>s.games>=10},
  {id:"t2",icon:"👑",name:"Veteran",desc:"Play 20+ matches",ck:s=>s.games>=20},
  {id:"iw",icon:"🛡️",name:"Iron Wall",desc:"Positive game diff (5+ games)",ck:s=>s.games>=5&&(s.gamesWon-s.gamesLost)>0},
];
