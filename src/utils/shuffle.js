// FT-08 RNG Team Selector — pure shuffle helpers
// Fisher-Yates shuffle (unbiased)
export function fisherYates(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

// Splits a shuffled player pool into matches of 4 (2v2) plus sitouts.
// Input:  array of player IDs (length >= 4)
// Output: { matches: [{team_a:[id,id], team_b:[id,id]}], sitouts: [id,...] }
export function shuffleIntoMatches(playerIds){
  const shuffled=fisherYates(playerIds);
  const matches=[];
  for(let i=0;i+3<shuffled.length;i+=4){
    matches.push({
      team_a:[shuffled[i],shuffled[i+1]],
      team_b:[shuffled[i+2],shuffled[i+3]]
    });
  }
  const sitouts=shuffled.slice(matches.length*4);
  return {matches,sitouts};
}
