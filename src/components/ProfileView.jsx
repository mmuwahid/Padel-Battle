import React from "react";
import { A, CD, CD2, BD, TX, MT, DG } from '../theme';
import { formatTeam, win, formatDate } from '../utils/helpers';
import { calcElo } from '../utils/elo';
import { ACHS } from '../data/achievements';

export function ProfileView({ user, avatarUrl, avatarUploading, uploadAvatar, removeAvatar, claimedPlayer, ps, elo, matches, players, isAdmin, getName, getStreak, setSidebarView, setTab, setSidebarOpen }) {
  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

      {/* Profile Card with Avatar Upload */}
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{position:"relative",display:"inline-block",marginBottom:12}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:`${A}20`,border:`3px solid ${A}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,fontWeight:800,color:A,overflow:"hidden"}}>
            {avatarUrl?<img src={avatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
          </div>
          <label style={{position:"absolute",bottom:0,right:0,width:28,height:28,borderRadius:"50%",background:A,border:`2px solid ${CD}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14}}>
            📷
            <input type="file" accept="image/*" onChange={(e)=>uploadAvatar(e.target.files[0])} style={{display:"none"}}/>
          </label>
        </div>
        {avatarUploading && <div style={{fontSize:11,color:A,marginBottom:4}}>Uploading...</div>}
        {avatarUrl && <button onClick={removeAvatar} style={{background:"none",border:"none",color:DG,fontSize:10,cursor:"pointer",marginBottom:4,fontFamily:"'Outfit',sans-serif"}}>Remove Photo</button>}
        <h2 style={{fontSize:18,fontWeight:700,margin:0,color:TX}}>{user.user_metadata?.display_name||user.email?.split("@")[0]||"User"}</h2>
        <p style={{fontSize:12,color:MT,margin:"4px 0 0 0"}}>{user.email}</p>
        {claimedPlayer && <div style={{fontSize:11,color:A,marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
          <span>{isAdmin?"👤 Admin":"👤 Member"}</span>
        </div>}
      </div>

      {/* Career Stats Grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:24}}>
        {claimedPlayer && ps.filter(p=>p.id===claimedPlayer.id).map(p=>(
          <React.Fragment key={p.id}>
            <div style={{background:CD2,padding:12,borderRadius:8,textAlign:"center"}}>
              <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>Wins</div>
              <div style={{fontSize:20,fontWeight:800,color:A}}>{p.wins}</div>
            </div>
            <div style={{background:CD2,padding:12,borderRadius:8,textAlign:"center"}}>
              <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>Losses</div>
              <div style={{fontSize:20,fontWeight:800,color:p.losses>0?DG:TX}}>{p.losses}</div>
            </div>
            <div style={{background:CD2,padding:12,borderRadius:8,textAlign:"center"}}>
              <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>ELO</div>
              <div style={{fontSize:20,fontWeight:800,color:A}}>{Math.round(elo[p.id]||1500)}</div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Win Rate Progress */}
      {claimedPlayer && ps.filter(p=>p.id===claimedPlayer.id).map(p=>(
        <React.Fragment key={p.id}>
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <label style={{fontSize:12,fontWeight:600,color:TX}}>Win Rate</label>
              <span style={{fontSize:12,fontWeight:700,color:A}}>{Math.round(p.winRate*100)}%</span>
            </div>
            <div style={{width:"100%",height:8,background:CD2,borderRadius:4,overflow:"hidden"}}>
              <div style={{width:`${Math.max(p.winRate*100,5)}%`,height:"100%",background:A,transition:"width 0.3s"}}/>
            </div>
          </div>

          {/* Additional Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24}}>
            <div style={{background:CD2,padding:12,borderRadius:8}}>
              <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>Best Streak</div>
              <div style={{fontSize:16,fontWeight:800,color:A}}>{getStreak(p.id)} wins</div>
            </div>
            <div style={{background:CD2,padding:12,borderRadius:8}}>
              <div style={{fontSize:11,color:MT,fontWeight:600,marginBottom:4}}>MOTM Awards</div>
              <div style={{fontSize:16,fontWeight:800,color:A}}>{p.motm}</div>
            </div>
          </div>

          {/* ELO History — only show when player has matches */}
          {matches.some(m=>m.team_a.includes(p.id)||m.team_b.includes(p.id)) && (
          <div style={{marginBottom:24}}>
            <h3 style={{fontSize:13,fontWeight:700,color:TX,marginBottom:12}}>ELO History</h3>
            <div style={{display:"flex",alignItems:"flex-end",gap:2,height:100,background:CD2,padding:8,borderRadius:8}}>
              {(() => {
                const pMatches = matches.filter(m=>m.team_a.includes(p.id)||m.team_b.includes(p.id)).sort((a,b)=>new Date(a.date)-new Date(b.date));
                if(!pMatches.length) return null;
                const sortedAll = [...matches].sort((a,b)=>new Date(a.date)-new Date(b.date));
                const eloHistory = [];
                const pMatchIds = new Set(pMatches.map(m=>m.id));
                let runningMatches = [];
                for(const m of sortedAll){
                  runningMatches.push(m);
                  if(pMatchIds.has(m.id)){
                    const snap = calcElo(players, runningMatches);
                    eloHistory.push(snap[p.id] || 1500);
                  }
                }
                const last10 = eloHistory.slice(-10);
                const minElo = Math.min(...last10);
                const maxElo = Math.max(...last10);
                const range = maxElo - minElo || 1;
                return (<>
                  <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",marginRight:4,fontSize:9,color:MT,fontFamily:"'JetBrains Mono'",fontWeight:600,minWidth:28,textAlign:"right"}}>
                    <span>{Math.round(maxElo)}</span>
                    <span>{Math.round(minElo)}</span>
                  </div>
                  {last10.map((e, i) => (
                    <div key={i} style={{flex:1,background:A,borderRadius:2,height:`${Math.max(((e-minElo)/range)*100,5)}%`,opacity:0.8}}/>
                  ))}
                </>);
              })()}
            </div>
          </div>
          )}

          {/* Achievements */}
          <div style={{marginBottom:24}}>
            <h3 style={{fontSize:13,fontWeight:700,color:TX,marginBottom:12}}>Achievements</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {ACHS.map(a => {
                const earned = a.ck(p);
                return (
                  <div key={a.id} style={{padding:10,background:earned?CD2:`${CD2}80`,borderRadius:8,opacity:earned?1:0.5}}>
                    <div style={{fontSize:20,marginBottom:4}}>{a.icon}</div>
                    <div style={{fontSize:11,fontWeight:600,color:TX}}>{a.name}</div>
                    <div style={{fontSize:9,color:MT,marginTop:2}}>{a.desc}</div>
                    {!earned && <div style={{fontSize:9,color:MT,marginTop:2}}>🔒 Locked</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Matches */}
          <div style={{marginBottom:24}}>
            <h3 style={{fontSize:13,fontWeight:700,color:TX,marginBottom:12}}>Recent Matches</h3>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {matches.filter(m=>m.team_a.includes(p.id)||m.team_b.includes(p.id)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(m => {
                const w = win(m.sets);
                const pTeam = m.team_a.includes(p.id)?"A":"B";
                const won = w === pTeam;
                return (
                  <div key={m.id} style={{padding:10,background:CD2,borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:won?A:DG,background:won?`${A}15`:`${DG}15`,padding:"4px 8px",borderRadius:4,minWidth:36,textAlign:"center"}}>
                      {won?"W":"L"}
                    </div>
                    <div style={{flex:1,fontSize:11}}>
                      <div style={{fontWeight:600,color:TX}}>{formatTeam(getName(m.team_a[0]),getName(m.team_a[1]))} vs {formatTeam(getName(m.team_b[0]),getName(m.team_b[1]))}</div>
                      <div style={{fontSize:10,marginTop:2,display:"flex",gap:4}}>{m.sets.map((s,i)=>{const pWon=pTeam==="A"?s[0]>s[1]:s[1]>s[0];return <span key={i} style={{color:pWon?A:DG}}>{s[0]}-{s[1]}</span>;})}</div>
                    </div>
                    <div style={{fontSize:9,color:MT}}>{formatDate(m.date)}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={()=>{setSidebarView(null);setSidebarOpen(false);setTab("history");}} style={{width:"100%",marginTop:12,padding:"10px",background:"transparent",border:`1px solid ${BD}`,borderRadius:8,color:A,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
              View All Matches
            </button>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
