import React, { useState, useMemo } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, SV, BZ, BL, PU } from '../theme';
import { formatTeam, win } from '../utils/helpers';

export function CombosView({combos,players,matches,pm,getName}){
  const [view,setView]=useState("duos");
  const [selPlayer,setSelP]=useState("");

  const matrix=useMemo(()=>{
    const m={};
    players.forEach(p=>{m[p.id]={};players.forEach(q=>{if(p.id!==q.id)m[p.id][q.id]={w:0,l:0,games:0};});});
    matches.forEach(match=>{
      const w=win(match.sets);
      [[match.team_a,w==="A"],[match.team_b,w==="B"]].forEach(([team,won])=>{
        const [a,b]=team;
        if(m[a]&&m[a][b]){m[a][b].games++;m[b][a].games++;if(won){m[a][b].w++;m[b][a].w++;}else{m[a][b].l++;m[b][a].l++;}}
      });
    });
    return m;
  },[players,matches]);

  const activePlayers=players.filter(p=>{const s=matrix[p.id];return s&&Object.values(s).some(v=>v.games>0);});
  // S1-03: Fix combos — sort best by win rate desc, worst by win rate asc
  // Only show worst when 6+ unique combos exist to prevent overlap with top 3
  const activeCombos=combos.filter(c=>c.games>=1);
  const sortedByWinRate=[...activeCombos].sort((a,b)=>{
    const pA=a.games>0?a.wins/a.games:0, pB=b.games>0?b.wins/b.games:0;
    if(pB!==pA)return pB-pA;
    return b.games-a.games;
  });
  const top3=sortedByWinRate.slice(0,3);
  const top3Keys=new Set(top3.map(c=>c.players.slice().sort().join(",")));
  // Worst: sort ascending by win rate, exclude any that appear in top 3
  const worstCandidates=[...activeCombos]
    .filter(c=>!top3Keys.has(c.players.slice().sort().join(",")))
    .sort((a,b)=>{
      const pA=a.games>0?a.wins/a.games:0, pB=b.games>0?b.wins/b.games:0;
      if(pA!==pB)return pA-pB;
      return b.games-a.games;
    });
  const worst3=activeCombos.length>=6?worstCandidates.slice(0,3):[];
  const pctColor=(pct,games)=>{if(games===0)return BD;if(pct>=60)return A;if(pct>=40)return TX;return DG;};

  if(activeCombos.length===0)return (
    <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto",textAlign:"center"}}>
      <div style={{padding:"40px 20px"}}>
        <div style={{fontSize:40,marginBottom:12}}>🤝</div>
        <div style={{fontSize:15,fontWeight:600,color:TX,marginBottom:6}}>No partnerships yet</div>
        <div style={{fontSize:12,color:MT,lineHeight:1.5}}>Play some doubles matches to see partnership stats here.</div>
      </div>
    </div>
  );

  return (
    <div style={{padding:"20px 16px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["duos","🔥 Best Duos"],["player","👤 My Combos"],["matrix","🧪 Chemistry"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${view===k?A:BD}`,background:view===k?`${A}15`:"transparent",color:view===k?A:MT,fontSize:11,fontWeight:600,cursor:"pointer",flex:1,textAlign:"center"}}>{l}</button>
        ))}
      </div>

      {view==="duos"&&<div>
        <h2 style={{fontSize:16,fontWeight:700,marginBottom:14}}>🔥 Top Partnerships</h2>
        {top3.length===0&&<p style={{fontSize:13,color:MT}}>No partnerships recorded yet</p>}
        {top3.map((c,i)=>{
          const pct=c.games>0?(c.wins/c.games*100):0;
          const medals=["🥇","🥈","🥉"];
          const colors=[GD,SV,BZ];
          return (<div key={"t"+i} style={{background:CD,borderRadius:16,border:`1px solid ${colors[i]}30`,padding:16,marginBottom:10,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`${colors[i]}08`,filter:"blur(20px)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:32}}>{medals[i]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:800,color:TX}}>{getName(c.players[0])} <span style={{color:MT,fontWeight:400}}>x</span> {getName(c.players[1])}</div>
                <div style={{display:"flex",gap:12,marginTop:6}}>
                  <span style={{fontSize:13,color:A,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.wins}W</span>
                  <span style={{fontSize:13,color:DG,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.losses}L</span>
                  <span style={{fontSize:13,color:MT}}>{c.games} GP</span>
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{width:60,height:60,borderRadius:"50%",border:`3px solid ${colors[i]}`,display:"flex",alignItems:"center",justifyContent:"center",background:`${colors[i]}10`}}>
                  <span style={{fontSize:20,fontWeight:900,color:colors[i],fontFamily:"'JetBrains Mono'"}}>{pct.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>);
        })}

        {worst3.length>0&&<div style={{marginTop:16}}>
          <h2 style={{fontSize:16,fontWeight:700,marginBottom:14,color:DG}}>💔 Worst Partnerships</h2>
          {worst3.map((c,i)=>{
            const pct=c.games>0?(c.wins/c.games*100):0;
            const skulls=["💀","🥶","😅"];
            return (<div key={"w"+i} style={{background:CD,borderRadius:16,border:`1px solid ${DG}20`,padding:16,marginBottom:10,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`${DG}06`,filter:"blur(20px)"}}/>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:32}}>{skulls[i]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:800,color:TX}}>{getName(c.players[0])} <span style={{color:MT,fontWeight:400}}>x</span> {getName(c.players[1])}</div>
                  <div style={{display:"flex",gap:12,marginTop:6}}>
                    <span style={{fontSize:13,color:A,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.wins}W</span>
                    <span style={{fontSize:13,color:DG,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{c.losses}L</span>
                    <span style={{fontSize:13,color:MT}}>{c.games} GP</span>
                  </div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{width:60,height:60,borderRadius:"50%",border:`3px solid ${DG}`,display:"flex",alignItems:"center",justifyContent:"center",background:`${DG}10`}}>
                    <span style={{fontSize:20,fontWeight:900,color:DG,fontFamily:"'JetBrains Mono'"}}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>);
          })}
        </div>}
      </div>}

      {view==="player"&&<div>
        <h2 style={{fontSize:16,fontWeight:700,marginBottom:10}}>Partner Chemistry</h2>
        <p style={{fontSize:12,color:MT,marginBottom:12}}>Select a player to see who they work best with</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {players.map(p=>{const on=selPlayer===p.id;return (
            <button key={p.id} onClick={()=>setSelP(on?"":p.id)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${on?A:BD}`,background:on?`${A}15`:"transparent",color:on?A:MT,fontSize:12,fontWeight:600,cursor:"pointer"}}>{p.nickname||p.name}</button>
          );})}
        </div>
        {selPlayer&&<div>
          {(() => {
            const partners=Object.entries(matrix[selPlayer]||{})
              .filter(([,v])=>v.games>0)
              .map(([pid,v])=>({pid,...v,pct:v.games>0?(v.w/v.games*100):0}))
              .sort((a,b)=>b.pct-a.pct);
            const best=partners[0];
            const worst=partners[partners.length-1];
            if(!partners.length) return (<p style={{fontSize:13,color:MT}}>No partnerships recorded for {getName(selPlayer)}</p>);
            return (<div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <div style={{background:CD,borderRadius:12,border:`1px solid ${A}30`,padding:14,textAlign:"center"}}>
                  <div style={{fontSize:10,color:A,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Best Partner</div>
                  <div style={{fontSize:20}}>🤝</div>
                  <div style={{fontSize:15,fontWeight:700,marginTop:4}}>{getName(best.pid)}</div>
                  <div style={{fontSize:22,fontWeight:900,color:A,fontFamily:"'JetBrains Mono'",marginTop:4}}>{best.pct.toFixed(0)}%</div>
                  <div style={{fontSize:11,color:MT}}>{best.w}W {best.l}L · {best.games} GP</div>
                </div>
                {worst&&worst.pid!==best.pid&&<div style={{background:CD,borderRadius:12,border:`1px solid ${DG}30`,padding:14,textAlign:"center"}}>
                  <div style={{fontSize:10,color:DG,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Worst Partner</div>
                  <div style={{fontSize:20}}>💔</div>
                  <div style={{fontSize:15,fontWeight:700,marginTop:4}}>{getName(worst.pid)}</div>
                  <div style={{fontSize:22,fontWeight:900,color:DG,fontFamily:"'JetBrains Mono'",marginTop:4}}>{worst.pct.toFixed(0)}%</div>
                  <div style={{fontSize:11,color:MT}}>{worst.w}W {worst.l}L · {worst.games} GP</div>
                </div>}
              </div>
              {partners.map((p,i)=>{
                const barW=Math.max(p.pct,5);
                return (<div key={p.pid} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600}}>{getName(p.pid)}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:11,color:MT}}>{p.games} GP</span>
                      <span style={{fontSize:14,fontWeight:800,color:pctColor(p.pct,p.games),fontFamily:"'JetBrains Mono'",width:42,textAlign:"right"}}>{p.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{height:6,background:BD,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${barW}%`,background:pctColor(p.pct,p.games),borderRadius:3,transition:"width 0.4s ease"}}/>
                  </div>
                </div>);
              })}
            </div>);
          })()}
        </div>}
      </div>}

      {view==="matrix"&&<div>
        <h2 style={{fontSize:16,fontWeight:700,marginBottom:6}}>Chemistry Matrix</h2>
        <p style={{fontSize:12,color:MT,marginBottom:14}}>Win % when paired. GP = Games Played.</p>
        {activePlayers.length<2?<p style={{fontSize:13,color:MT}}>Need at least 2 active players</p>:
        <div style={{position:"relative"}}>
        <div style={{overflowX:"auto",paddingBottom:8}}>
          <div style={{display:"inline-grid",gridTemplateColumns:`70px repeat(${activePlayers.length},52px)`,gap:2,fontSize:10}}>
            <div/>
            {activePlayers.map(p => (
              <div key={p.id} style={{textAlign:"center",fontWeight:700,color:MT,padding:"4px 2px",fontSize:9,height:60,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
                <span style={{writingMode:"vertical-rl",transform:"rotate(180deg)",whiteSpace:"nowrap"}}>{p.nickname||p.name}</span>
              </div>
            ))}
            {activePlayers.map(p => (
              <React.Fragment key={p.id}>
                <div style={{fontWeight:700,color:MT,padding:4,display:"flex",alignItems:"center",fontSize:10,whiteSpace:"nowrap"}}>{p.nickname||p.name}</div>
                {activePlayers.map(q => {
                  if(p.id===q.id) return (<div key={q.id} style={{background:`${MT}20`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",padding:4}}><span style={{fontSize:10,color:MT}}>—</span></div>);
                  const d=matrix[p.id]?.[q.id];
                  const games=d?.games||0;
                  const pct=games>0?(d.w/games*100):0;
                  const bg=games===0?`${BD}40`:pct>=60?`${A}25`:pct>=40?`${BL}20`:`${DG}25`;
                  const tc=games===0?MT:pct>=60?A:pct>=40?TX:DG;
                  return (<div key={q.id} style={{background:bg,borderRadius:4,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:4,minHeight:40}}>
                    {games>0?<><span style={{fontSize:12,fontWeight:800,color:tc,fontFamily:"'JetBrains Mono'"}}>{pct.toFixed(0)}%</span><span style={{fontSize:7,color:MT}}>{games} GP</span></>:<span style={{fontSize:9,color:MT}}>-</span>}
                  </div>);
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{position:"absolute",top:0,right:0,bottom:8,width:32,background:`linear-gradient(to right, transparent, ${BG})`,pointerEvents:"none"}}/>
        </div>}
      </div>}
    </div>
  );
}
