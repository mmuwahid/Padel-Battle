import { win } from './helpers';

const K=40,ES=1500;
export { ES };

export function calcElo(pl,ma){
  const r={};
  pl.forEach(p=>{r[p.id]=ES;});
  [...ma].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(m=>{
    const w=win(m.sets);
    const aA=((r[m.team_a[0]]||ES)+(r[m.team_a[1]]||ES))/2;
    const aB=((r[m.team_b[0]]||ES)+(r[m.team_b[1]]||ES))/2;
    const eA=1/(1+Math.pow(10,(aB-aA)/400));
    const sA=w==="A"?1:0;
    m.team_a.forEach(p=>{if(r[p]!==undefined)r[p]=Math.max(0,r[p]+Math.round(K*(sA-eA)));});
    m.team_b.forEach(p=>{if(r[p]!==undefined)r[p]=Math.max(0,r[p]+Math.round(K*((1-sA)-(1-eA))));});
  });
  return r;
}
