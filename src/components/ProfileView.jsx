import React, { useState } from "react";
import { formatTeam, win, formatDate, flagEmoji } from '../utils/helpers';
import { calcElo } from '../utils/elo';
import { ACHS } from '../data/achievements';
import { EditMyProfile } from './EditMyProfile';
import Icon from './Icon';

// S066 Phase 12: spec-faithful header restyle.
// Header uses .prohero/.propic/.procb/.proname/.proemail/.prorole/.protag/.proedit
// Stats strip uses .prostrip/.prosc/.proscl/.proscv
// Win rate uses .wrsec/.wrh/.wrl/.wrp/.wrbg/.wrf
// Highlights use .hlrow/.hlcard/.hll/.hlv/.hlu
// Deeper sections (ELO history, achievements, recent matches) preserved with
// minor token cleanup but still render below the spec header.
export function ProfileView({ user, avatarUrl, avatarUploading, uploadAvatar, removeAvatar, claimedPlayer, ps, elo, matches, players, isAdmin, getName, getStreak, setSidebarView, setTab, setSidebarOpen }) {
  const [editingMyProfile, setEditingMyProfile] = useState(false);
  const fileInputRef = React.useRef(null);

  const userName = claimedPlayer?.name || user.user_metadata?.display_name || user.email?.split("@")[0] || "User";
  const userInitial = (userName || "U")[0].toUpperCase();

  // Stats for claimed player
  const myStat = claimedPlayer ? ps.find(p => p.id === claimedPlayer.id) : null;
  const myElo = myStat ? Math.round(elo[myStat.id] || 1500) : null;
  const myStreak = myStat ? getStreak(myStat.id) : 0;
  const wins = myStat?.wins || 0;
  const losses = myStat?.losses || 0;
  const motm = myStat?.motm || 0;
  const winRate = myStat ? Math.round((myStat.winRate || 0) * 100) : 0;

  return (
    <div style={{paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
      <div style={{padding:"16px 18px 0"}}>
        <button onClick={()=>setSidebarView(null)} style={{background:"none",border:"none",color:"var(--accent)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--font)",display:"flex",alignItems:"center",gap:5,padding:0}}>
          <Icon name="back" size={14}/> Back
        </button>
      </div>

      {/* Spec header — .prohero */}
      <div className="prohero">
        <div className="prowrap">
          <div className="propic">
            {avatarUrl ? <img src={avatarUrl} alt=""/> : userInitial}
          </div>
          <button className="procb" aria-label="Change photo" onClick={()=>fileInputRef.current?.click()}>
            <Icon name="camera" size={13} color="#000" strokeWidth={2.2}/>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={(e)=>uploadAvatar(e.target.files?.[0])} style={{display:"none"}}/>
        </div>
        {avatarUploading && <div style={{fontSize:11,color:"var(--accent)",marginTop:6,fontFamily:"var(--mono)"}}>Uploading…</div>}
        {avatarUrl && <button className="prorm" onClick={removeAvatar}>Remove photo</button>}
        <div className="proname">{userName}</div>
        <div className="proemail">{user.email}</div>
        {claimedPlayer && (
          <div className="prorole">
            <Icon name="admin" size={12} color="var(--accent)"/>{isAdmin?"Admin":"Member"}
          </div>
        )}
        {claimedPlayer && (
          <div className="protags">
            {claimedPlayer.country && (
              <div className="protag"><span className="flag">{flagEmoji(claimedPlayer.country)}</span>{claimedPlayer.country}</div>
            )}
            {claimedPlayer.playing_position && (
              <div className="protag">
                <Icon name={claimedPlayer.playing_position==="left"?"court-l":claimedPlayer.playing_position==="right"?"court-r":"court-any"} size={13} color="#9090a4"/>
                {claimedPlayer.playing_position==="left"?"Left Side":claimedPlayer.playing_position==="right"?"Right Side":"Any Side"}
              </div>
            )}
            {claimedPlayer.nickname && (
              <div className="protag" style={{fontStyle:"italic"}}>"{claimedPlayer.nickname}"</div>
            )}
          </div>
        )}
        {claimedPlayer && (
          <button className="proedit" onClick={()=>setEditingMyProfile(true)}>
            <Icon name="edit" size={14} color="#9090a4"/>Edit Profile
          </button>
        )}
      </div>

      {editingMyProfile && claimedPlayer && (
        <EditMyProfile player={claimedPlayer} onClose={()=>setEditingMyProfile(false)}/>
      )}

      {/* Spec stats strip */}
      {claimedPlayer && myStat && (
        <>
          <div className="prostrip">
            <div className="prosc"><div className="proscl">Won</div><div className="proscv win">{wins}</div></div>
            <div className="prosc"><div className="proscl">Lost</div><div className="proscv">{losses}</div></div>
            <div className="prosc"><div className="proscl">ELO</div><div className="proscv elo">{myElo}</div></div>
          </div>

          <div className="wrsec">
            <div className="wrh"><div className="wrl">Win Rate</div><div className="wrp">{winRate}%</div></div>
            <div className="wrbg"><div className="wrf" style={{width:`${Math.max(winRate,2)}%`}}/></div>
          </div>

          <div className="hlrow">
            <div className="hlcard"><div className="hll">Best Streak</div><div className="hlv">{myStreak}<span className="hlu">wins</span></div></div>
            <div className="hlcard"><div className="hll">MOTM Awards</div><div className="hlv">{motm}<span className="hlu">{motm===1?"badge":"badges"}</span></div></div>
          </div>

          {/* ELO history (preserved) */}
          {matches.some(m=>m.team_a.includes(myStat.id)||m.team_b.includes(myStat.id)) && (
            <div style={{padding:"0 18px 18px"}}>
              <h3 style={{fontFamily:"var(--mono)",fontSize:10,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"#9090a4",margin:"0 0 10px"}}>ELO History</h3>
              <div style={{display:"flex",alignItems:"flex-end",gap:2,height:90,background:"var(--surface)",border:"1px solid var(--border)",padding:8,borderRadius:"var(--r-md)"}}>
                {(()=>{
                  const pMatches=matches.filter(m=>m.team_a.includes(myStat.id)||m.team_b.includes(myStat.id)).sort((a,b)=>new Date(a.date)-new Date(b.date));
                  if(!pMatches.length)return null;
                  const sortedAll=[...matches].sort((a,b)=>new Date(a.date)-new Date(b.date));
                  const eloHistory=[];
                  const pMatchIds=new Set(pMatches.map(m=>m.id));
                  const runningMatches=[];
                  for(const m of sortedAll){
                    runningMatches.push(m);
                    if(pMatchIds.has(m.id)){
                      const snap=calcElo(players,runningMatches);
                      eloHistory.push(snap[myStat.id]||1500);
                    }
                  }
                  const last10=eloHistory.slice(-10);
                  const minElo=Math.min(...last10);
                  const maxElo=Math.max(...last10);
                  const range=maxElo-minElo||1;
                  return (<>
                    <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",marginRight:4,fontSize:9,color:"#9090a4",fontFamily:"var(--mono)",fontWeight:600,minWidth:28,textAlign:"right"}}>
                      <span>{Math.round(maxElo)}</span>
                      <span>{Math.round(minElo)}</span>
                    </div>
                    {last10.map((e,i)=>(
                      <div key={i} style={{flex:1,background:"var(--accent)",borderRadius:2,height:`${Math.max(((e-minElo)/range)*100,5)}%`,opacity:.8}}/>
                    ))}
                  </>);
                })()}
              </div>
            </div>
          )}

          {/* Achievements */}
          <div style={{padding:"0 18px 18px"}}>
            <h3 style={{fontFamily:"var(--mono)",fontSize:10,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"#9090a4",margin:"0 0 10px"}}>Achievements</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {ACHS.map(a=>{
                const earned=a.ck(myStat);
                return (
                  <div key={a.id} style={{padding:12,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r-md)",opacity:earned?1:.45}}>
                    <div style={{fontSize:22,marginBottom:6}}>{a.icon}</div>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>{a.name}</div>
                    <div style={{fontFamily:"var(--mono)",fontSize:9,color:"#9090a4",marginTop:2}}>{a.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent matches */}
          <div style={{padding:"0 18px 18px"}}>
            <h3 style={{fontFamily:"var(--mono)",fontSize:10,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"#9090a4",margin:"0 0 10px"}}>Recent Matches</h3>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {matches.filter(m=>m.team_a.includes(myStat.id)||m.team_b.includes(myStat.id)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(m=>{
                const w=win(m.sets);
                const pTeam=m.team_a.includes(myStat.id)?"A":"B";
                const won=w===pTeam;
                return (
                  <div key={m.id} style={{padding:"10px 12px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r-md)",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:10,fontWeight:800,color:won?"var(--accent)":"var(--danger)",background:won?"var(--accent-dim)":"rgba(248,113,113,.10)",padding:"4px 9px",borderRadius:"var(--r-sm)",fontFamily:"var(--mono)",letterSpacing:".06em"}}>
                      {won?"WIN":"LOSS"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"var(--font)",fontSize:12,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{formatTeam(getName(m.team_a[0]),getName(m.team_a[1]))} vs {formatTeam(getName(m.team_b[0]),getName(m.team_b[1]))}</div>
                      <div style={{fontFamily:"var(--mono)",fontSize:10,marginTop:2,display:"flex",gap:6}}>
                        {m.sets.map((s,i)=>{const pWon=pTeam==="A"?s[0]>s[1]:s[1]>s[0];return <span key={i} style={{color:pWon?"var(--accent)":"var(--danger)"}}>{s[0]}-{s[1]}</span>;})}
                      </div>
                    </div>
                    <div style={{fontFamily:"var(--mono)",fontSize:9,color:"#9090a4"}}>{formatDate(m.date)}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={()=>{setSidebarView(null);setSidebarOpen(false);setTab("history");}} style={{width:"100%",marginTop:12,padding:"10px",background:"transparent",border:"1px solid var(--border)",borderRadius:"var(--r-md)",color:"var(--accent)",fontFamily:"var(--font)",fontSize:12,fontWeight:700,cursor:"pointer"}}>View All Matches</button>
          </div>
        </>
      )}

      {/* No claimed player — empty state */}
      {!claimedPlayer && (
        <div style={{padding:"30px 18px",textAlign:"center",fontFamily:"var(--mono)",fontSize:11,color:"#9090a4"}}>
          Claim a player record to see your stats here.
        </div>
      )}
    </div>
  );
}
