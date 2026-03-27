export function formatTeam(p1,p2){return `${p1} x ${p2}`;}
export function win(sets){let a=0,b=0;sets.forEach(([x,y])=>{if(x>y)a++;else b++;});return a>b?"A":"B";}
export function formatDate(d){const dt=new Date(d);const dd=String(dt.getDate()).padStart(2,"0");const mmm=dt.toLocaleString("en-GB",{month:"short"});const yyyy=dt.getFullYear();return `${dd}/${mmm}/${yyyy}`;}
export function gid(){return"id_"+Math.random().toString(36).substr(2,9);}
