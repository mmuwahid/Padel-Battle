export function generateAmericanoSchedule(playerIds,courts){
  const n=playerIds.length;const rounds=[];const pids=[...playerIds];const totalRounds=n-1+(n%2===1?1:0);const hasBye=n%2===1;
  if(hasBye)pids.push("BYE");const fixed=pids[0];const rotating=pids.slice(1);
  for(let r=0;r<totalRounds;r++){
    const current=[fixed,...rotating];const matches=[];const half=current.length/2;const pairs=[];
    for(let i=0;i<half;i++){pairs.push([current[i],current[current.length-1-i]]);}
    const validPairs=pairs.filter(p=>!p.includes("BYE"));const sitting=pairs.find(p=>p.includes("BYE"));const sittingPlayer=sitting?sitting.find(x=>x!=="BYE"):null;
    for(let i=0;i<validPairs.length;i+=2){if(i+1<validPairs.length){matches.push({teamA:validPairs[i],teamB:validPairs[i+1],court:(matches.length%courts)+1});}}
    rounds.push({round:r+1,matches,sitting:sittingPlayer});rotating.push(rotating.shift());
  }
  return rounds;
}

export function generateMexicanoRound(playerIds,currentPoints,courts){
  const sorted=[...playerIds].sort((a,b)=>(currentPoints[b]||0)-(currentPoints[a]||0));
  const hasBye=sorted.length%2===1;const sitting=hasBye?sorted[sorted.length-1]:null;const active=hasBye?sorted.slice(0,-1):[...sorted];const matches=[];
  for(let i=0;i<active.length-2;i+=4){if(i+3<active.length){matches.push({teamA:[active[i],active[i+3]],teamB:[active[i+1],active[i+2]],court:(matches.length%courts)+1});}}
  if(active.length%4>=2){const rem=active.slice(-(active.length%4));if(rem.length>=4)matches.push({teamA:[rem[0],rem[3]],teamB:[rem[1],rem[2]],court:(matches.length%courts)+1});else if(rem.length===2)matches.push({teamA:[rem[0]],teamB:[rem[1]],court:(matches.length%courts)+1});}
  return {matches,sitting,round:0};
}
