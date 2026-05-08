import React, { useState } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, BL, PU } from '../theme';
import { formatDate, win, setTotals } from '../utils/helpers';
import { TeamShuffler } from './TeamShuffler';
import { ScoreStepper } from './ScoreStepper';
import { validateMatch } from '../utils/scoringEngine';

export function ScheduleView({challenges,players,matches,supabase,leagueId,user,getName,isAdmin,onUpdate,showToast,sendPushNotification,sel,elo,seasonId}){
  const [showForm,setShowForm]=useState(false);
  const [step,setStep]=useState(1); // 1=teams, 2=date/venue
  const [showShuffler,setShowShuffler]=useState(false); // FT-08
  const [date,setDate]=useState(new Date().toISOString().split("T")[0]);
  const [time,setTime]=useState("18:00");
  const [duration,setDuration]=useState(90);
  const [location,setLocation]=useState("");
  const [tA,setTA]=useState(["",""]);
  const [tB,setTB]=useState(["",""]);
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [loggingMatch,setLoggingMatch]=useState(null);
  const [cancelConfirmId,setCancelConfirmId]=useState(null);
  const [logSets,setLogSets]=useState([[0,0],[0,0],[0,0]]);
  const [logNs,setLogNs]=useState(2);
  const [logMotm,setLogMotm]=useState("");
  const [logSaving,setLogSaving]=useState(false);
  // FT-09b / S045: FIP validation state for the inline log form
  const [logInvalidIdx,setLogInvalidIdx]=useState([]);
  const [logValidationError,setLogValidationError]=useState("");

  const inp={background:CD2,color:TX,border:`1px solid ${BD}`,borderRadius:8,padding:"10px 12px",fontSize:13,width:"100%",outline:"none",fontFamily:"'Outfit',sans-serif"};
  const getEloBadge=(pid)=>{const gp=(matches||[]).filter(m=>(m.team_a||[]).includes(pid)||(m.team_b||[]).includes(pid)).length;if(gp<5)return null;const e=elo?.[pid]||1500;if(e>=1600)return{label:"Pro",color:DG};if(e>=1400)return{label:"Advanced",color:GD};if(e>=1200)return{label:"Intermediate",color:PU};return{label:"Beginner",color:BL};};
  const claimedP=players.find(p=>p.user_id===user.id);
  // Map player IDs to user IDs for targeted notifications
  const getPlayerUserIds=(playerIds)=>playerIds.map(pid=>{const p=players.find(x=>x.id===pid);return p?.user_id;}).filter(Boolean);

  async function createChallenge(){
    const teamA=tA.filter(Boolean);const teamB=tB.filter(Boolean);
    const today=new Date().toISOString().split("T")[0];
    if(!date||date<today){showToast("Select a future date","error");return;}
    if(teamA.length===0){showToast("Select at least 1 player per team","error");return;}
    setSaving(true);
    try{
      // Creator is auto-accepted. All 4 players selected → pending (needs confirmation from others)
      const creatorPid=claimedP?.id;
      const allPlayerIds=[...teamA,...teamB];
      const initialResponses={};
      if(creatorPid&&allPlayerIds.includes(creatorPid)) initialResponses[creatorPid]="accepted";
      const hasFourPlayers=teamA.length>=2&&teamB.length>=2;
      const {error}=await supabase.from("challenges").insert({league_id:leagueId,created_by:user.id,date,time:time||null,duration:duration||null,location:location.trim()||null,team_a:teamA,team_b:teamB,notes:notes.trim()||null,status:hasFourPlayers?"pending":"open",responses:initialResponses});
      if(error)throw error;
      showToast("Match scheduled — waiting for players to confirm!");
      if(sendPushNotification){
        const allNames=allPlayerIds.map(id=>getName(id)).join(", ");
        const targetUids=getPlayerUserIds(allPlayerIds);
        sendPushNotification("challenge","Match Invitation",`You've been invited to a match on ${formatDate(date)} — ${allNames}. Tap to accept or decline.`,targetUids);
      }
      setShowForm(false);setStep(1);setTA(["",""]);setTB(["",""]);setNotes("");setLocation("");
      if(onUpdate)onUpdate();
    }catch(err){showToast(err.message||"Failed to schedule","error");}
    setSaving(false);
  }

  // S026: Atomic challenge response via server-side RPC (prevents read-modify-write race)
  async function respondToChallenge(ch,response){
    if(!claimedP){showToast("Claim a player first","error");return;}
    const pid=claimedP.id;
    try{
      const {data,error}=await supabase.rpc("respond_to_challenge",{p_challenge_id:ch.id,p_player_id:pid,p_response:response});
      if(error)throw error;
      if(response==="accepted") showToast("You accepted the match!");
      else showToast("You declined the match");
      const newStatus=data?.status;
      const matchPlayerIds=[...ch.team_a,...ch.team_b];
      const targetUids=getPlayerUserIds(matchPlayerIds);
      if(newStatus==="confirmed"&&sendPushNotification){
        const allNames=matchPlayerIds.map(id=>getName(id)).join(", ");
        sendPushNotification("challenge","Match Confirmed!",`All players confirmed for ${formatDate(ch.date)} — ${allNames}`,targetUids);
      }
      if(response==="accepted"&&newStatus!=="confirmed"&&sendPushNotification){
        sendPushNotification("challenge","Player Accepted",`${getName(pid)} accepted the match on ${formatDate(ch.date)}`,targetUids);
      }
      if(response==="declined"&&sendPushNotification){
        sendPushNotification("challenge","Player Declined",`${getName(pid)} declined the match on ${formatDate(ch.date)}`,targetUids);
      }
      if(onUpdate)onUpdate();
    }catch(err){showToast(err.message||"Failed to respond","error");}
  }

  // S026: Atomic challenge join via server-side RPC (prevents concurrent overfill)
  async function joinChallenge(ch,team){
    if(!claimedP){showToast("Claim a player first","error");return;}
    const pid=claimedP.id;
    try{
      const {data,error}=await supabase.rpc("join_challenge",{p_challenge_id:ch.id,p_player_id:pid,p_team:team});
      if(error)throw error;
      showToast("Joined!");
      const newStatus=data?.status;
      const joinPlayerIds=[...(data?.team_a||ch.team_a),...(data?.team_b||ch.team_b)];
      const joinTargetUids=getPlayerUserIds(joinPlayerIds);
      if(newStatus==="confirmed"&&sendPushNotification){
        const allNames=joinPlayerIds.map(id=>getName(id)).join(", ");
        sendPushNotification("challenge","Match Confirmed!",`All players confirmed for ${formatDate(ch.date)} — ${allNames}`,joinTargetUids);
      } else if(newStatus==="pending"&&sendPushNotification){
        const allNames=joinPlayerIds.map(id=>getName(id)).join(", ");
        sendPushNotification("challenge","Match Invitation",`You've been invited to a match on ${formatDate(ch.date)} — ${allNames}. Tap to accept or decline.`,joinTargetUids);
      }
      if(onUpdate)onUpdate();
    }catch(err){showToast(err.message||"Failed to join","error");}
  }

  async function leaveChallenge(ch){
    if(!claimedP)return;
    const {data,error}=await supabase.rpc("leave_challenge",{p_challenge_id:ch.id,p_player_id:claimedP.id});
    if(error||(data&&data.error)){showToast(data?.error||"Failed to leave","error");}else{showToast("Left match");if(onUpdate)onUpdate();}
  }

  async function cancelChallenge(id){
    const ch=challenges.find(c=>c.id===id);
    const {error}=await supabase.from("challenges").update({status:"cancelled"}).eq("id",id);
    if(error){showToast("Failed to cancel","error");}else{
      showToast("Match cancelled");
      if(ch&&sendPushNotification){
        const cancelPlayerIds=[...(ch.team_a||[]),...(ch.team_b||[])];
        const cancelTargetUids=getPlayerUserIds(cancelPlayerIds);
        const allNames=cancelPlayerIds.map(id2=>getName(id2)).join(", ");
        sendPushNotification("challenge","Match Cancelled",`The match on ${formatDate(ch.date)} was cancelled — ${allNames}`,cancelTargetUids);
      }
      if(onUpdate)onUpdate();
    }
  }

  function openLogMatch(ch){setLoggingMatch(ch.id);setLogSets([[0,0],[0,0],[0,0]]);setLogNs(2);setLogMotm("");setLogInvalidIdx([]);setLogValidationError("");}
  async function saveLoggedMatch(){
    const ch=challenges.find(c2=>c2.id===loggingMatch);if(!ch)return;
    // FT-09b / S045: FIP validation — auto-truncates dead rubbers, rejects invalid shapes.
    const v=validateMatch(logSets.slice(0,logNs));
    if(v.status==='invalid'){
      setLogInvalidIdx(v.invalidIndexes);
      setLogValidationError(v.error);
      showToast(v.error,"error");
      return;
    }
    setLogInvalidIdx([]);
    setLogValidationError("");
    const sd=v.completedSets;
    if(!sd.length){showToast("Enter at least one set score","error");return;}
    const isIncomplete=v.status==='incomplete';
    const droppedSets=v.droppedSets;
    setLogSaving(true);
    try{
      // S026: Transactional match creation via RPC (atomic insert+update)
      // S044/FT-09: RPC now returns JSONB {id, status} so we know if it landed pending or approved.
      const {data:result,error:rpcErr}=await supabase.rpc("play_challenge",{
        p_challenge_id:ch.id,
        p_league_id:leagueId,
        p_season_id:seasonId||null,
        p_date:ch.date,
        p_team_a:JSON.stringify(ch.team_a),
        p_team_b:JSON.stringify(ch.team_b),
        p_sets:JSON.stringify(sd),
        p_motm:logMotm||null,
        p_logged_by:user.id
      });
      if(rpcErr)throw rpcErr;
      // result may be {id, status} (post-migration) or just a uuid string (pre-migration legacy) — handle both.
      const status = (result && typeof result === "object" && result.status) || "approved";
      const isPending = status === "pending";
      const isIncompleteSaved = status === "incomplete";
      if(isIncompleteSaved){
        showToast("Saved as incomplete — won't count toward rankings");
      } else if(isPending){
        showToast("Submitted — waiting for admin approval");
      } else {
        showToast(droppedSets>0?"Match logged (dead-rubber set dropped)":"Match logged!");
        if(sendPushNotification){
          const allNames=[...(ch.team_a||[]),...(ch.team_b||[])].map(id=>getName(id)).join(", ");
          sendPushNotification("match","Match Result",`${allNames} — tap to see the score`);
        }
      }
      setLoggingMatch(null);
      if(onUpdate)onUpdate();
    }catch(err){showToast(err.message||"Failed to log match","error");}
    setLogSaving(false);
  }

  // Phase 7 (S065 Q9): Past tab dropped — once played, matches surface in MatchHistory.
  const upcoming=challenges.filter(c=>c.status==="open"||c.status==="pending"||c.status==="confirmed");

  return (
    <div>
      {/* Phase 7: sched-bar replaces Upcoming/Past tab toggle (Q9 dropped Past) */}
      <div className="sched-bar">
        <div className="sched-title">Scheduled</div>
        <button className="sched-add" onClick={()=>setShowForm(!showForm)}>{showForm?"Cancel":"+ Schedule"}</button>
      </div>

      {/* Phase 7: Multi-step schedule form, restyled to .sform component vocabulary */}
      {showForm && step===1 && (
        <div className="sform">
          <div className="sform-steps">
            <div className="sform-step on">1</div>
            <div className="sform-line"/>
            <div className="sform-step">2</div>
            <span className="sform-step-label">Players {"\u2192"} Details</span>
          </div>

          <div className="sform-body">
            <div className="sform-banner">
              <span style={{fontSize:16,lineHeight:1}}>{"\uD83C\uDFBE"}</span>
              <span>Select Players</span>
            </div>

            {/* FT-08: Shuffle entry point */}
            {!showShuffler && (
              <button className="sform-shuffle" onClick={()=>setShowShuffler(true)}>
                <span style={{fontSize:15}}>{"\uD83C\uDFB2"}</span> Shuffle Teams
              </button>
            )}
            {showShuffler && (
              <TeamShuffler
                players={players}
                getName={getName}
                singleMatchMode={true}
                onAccept={({matches})=>{
                  if(matches.length>0){
                    const first=matches[0];
                    setTA([...first.team_a]);
                    setTB([...first.team_b]);
                    if(showToast)showToast("Teams locked in — pick a date next.");
                  }
                  setShowShuffler(false);
                }}
                onCancel={()=>setShowShuffler(false)}
              />
            )}

            <div className="sform-section">
              <div className="sform-lbl">Team 1</div>
              <div className="sform-grid-2">
                {[0,1].map(i=>{const allSel=[tA[0],tA[1],tB[0],tB[1]].filter(Boolean);const others=allSel.filter(v=>v!==tA[i]);const badge=tA[i]?getEloBadge(tA[i]):null;return(
                  <div key={i} className="sform-pcard">
                    <div className="sform-pcard-l">Player {i+1}</div>
                    <select className="sform-input" value={tA[i]} onChange={e=>{const n=[...tA];n[i]=e.target.value;setTA(n);}}>
                      <option value="">Select Player...</option>
                      {players.filter(p=>!others.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
                    </select>
                    {badge && <div className="sform-elobadge" style={{background:`${badge.color}20`,color:badge.color}}>{badge.label}</div>}
                  </div>
                );})}
              </div>
            </div>

            <div className="sform-section">
              <div className="sform-lbl">Team 2</div>
              <div className="sform-grid-2">
                {[0,1].map(i=>{const allSel=[tA[0],tA[1],tB[0],tB[1]].filter(Boolean);const others=allSel.filter(v=>v!==tB[i]);const badge=tB[i]?getEloBadge(tB[i]):null;return(
                  <div key={i} className="sform-pcard">
                    <div className="sform-pcard-l">Player {i+3}</div>
                    <select className="sform-input" value={tB[i]} onChange={e=>{const n=[...tB];n[i]=e.target.value;setTB(n);}}>
                      <option value="">Select Player...</option>
                      {players.filter(p=>!others.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
                    </select>
                    {badge && <div className="sform-elobadge" style={{background:`${badge.color}20`,color:badge.color}}>{badge.label}</div>}
                  </div>
                );})}
              </div>
            </div>
          </div>

          <div className="sform-actions">
            <button className="sform-cta" onClick={()=>setStep(2)} disabled={!tA[0]}>Continue</button>
            <button className="sform-cta sec" onClick={()=>{setShowForm(false);setStep(1);}}>Cancel</button>
          </div>
        </div>
      )}

      {showForm && step===2 && (
        <div className="sform">
          <div className="sform-steps">
            <div className="sform-step done">{"\u2713"}</div>
            <div className="sform-line on"/>
            <div className="sform-step on">2</div>
            <span className="sform-step-label">Players {"\u2192"} Details</span>
          </div>

          <div className="sform-body">
            <div className="sform-section">
              <div className="sform-lbl">Match Date</div>
              <div className="sform-row">
                <input className="sform-input" type="date" value={date} min={new Date().toISOString().split("T")[0]} onChange={e=>setDate(e.target.value)}/>
                <input className="sform-input" type="time" value={time} onChange={e=>setTime(e.target.value)}/>
              </div>
            </div>

            <div className="sform-section">
              <div className="sform-lbl">Duration</div>
              <div className="sform-pillrow">
                {[60,90,120].map(d=>(
                  <button key={d} className={`sform-pill${duration===d?' on':''}`} onClick={()=>setDuration(d)}>{d} min</button>
                ))}
              </div>
            </div>

            <div className="sform-section">
              <div className="sform-lbl">Court</div>
              <input className="sform-input" placeholder="e.g., Harmony 3 - Padel Court 1" value={location} onChange={e=>setLocation(e.target.value)}/>
            </div>

            <div className="sform-section">
              <div className="sform-lbl">Notes</div>
              <input className="sform-input" placeholder="Optional" value={notes} onChange={e=>setNotes(e.target.value)}/>
            </div>
          </div>

          <div className="sform-actions">
            <button className="sform-cta" onClick={createChallenge} disabled={saving}>{saving?"Scheduling...":"Schedule Match"}</button>
            <button className="sform-cta sec" onClick={()=>setStep(1)}>Back</button>
          </div>
        </div>
      )}

      {/* Phase 7 (S065 Q9): Upcoming-only list (Past tab dropped — once played,
          matches surface in MatchHistory automatically). Empty state when no upcoming
          challenges and no schedule form open. */}
      {upcoming.length===0 && !showForm && (
        <div className="sched-empty">
          <div className="sched-empty-icon">{"\uD83D\uDCC5"}</div>
          <div className="sched-empty-title">No matches scheduled</div>
          <div className="sched-empty-sub">Tap "+ Schedule" to set up your next game.</div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mlist">
          {upcoming.map(ch=>{
            const isCreator = ch.created_by===user.id;
            const myPid = claimedP?.id;
            const imInA = ch.team_a.includes(myPid);
            const imInB = ch.team_b.includes(myPid);
            const imIn = imInA || imInB;
            const canJoinA = !imIn && ch.team_a.length<2 && ch.status==="open";
            const canJoinB = !imIn && ch.team_b.length<2 && ch.status==="open";
            const isConfirmed = ch.status==="confirmed";
            const isPending = ch.status==="pending";
            const myResponse = myPid ? (ch.responses||{})[myPid] : null;
            const needsMyResponse = isPending && imIn && !myResponse;
            const acceptedCount = isPending ? Object.values(ch.responses||{}).filter(v=>v==='accepted').length : 0;
            const totalSlots = (ch.team_a||[]).length + (ch.team_b||[]).length;
            const statusClass = isConfirmed ? 'confirmed' : isPending ? 'pending' : 'open';
            const statusText = isConfirmed
              ? 'Confirmed'
              : isPending
                ? `${acceptedCount}/${totalSlots} Confirmed`
                : `Open \u00B7 ${4-totalSlots} Slot${(4-totalSlots)===1?'':'s'}`;
            const dateShort = formatDate(ch.date);
            const renderTeam = (team, side) => (
              <div className={`scard-team${side==='r'?' r':''}`}>
                {[0,1].map(i=>{
                  const pid = team[i];
                  if(!pid) return (
                    <div key={'empty-'+i} className="scard-team-pl">
                      <div className="scard-pavi empty">?</div>
                      <span className="scard-pname empty">Open</span>
                    </div>
                  );
                  const av = players.find(p=>p.id===pid)?.avatar_url;
                  const r = (ch.responses||{})[pid];
                  const indicator = isPending && r==='accepted' ? '\u2713' : isPending && r==='declined' ? '\u2717' : isPending && !r ? '\u23F3' : '';
                  return (
                    <div key={pid} className="scard-team-pl">
                      <div className="scard-pavi">{av?<img src={av} alt=""/>:(getName(pid)[0]||'?').toUpperCase()}</div>
                      <span className="scard-pname">{getName(pid)}{indicator?` ${indicator}`:''}</span>
                    </div>
                  );
                })}
              </div>
            );
            return (
              <div key={ch.id} className="scard">
                <div className="scard-hd">
                  <div className="scard-when">
                    <span className="scard-date">{dateShort}</span>
                    {ch.time && <span className="scard-time">{ch.time}{ch.duration?` \u00B7 ${ch.duration} min`:''}</span>}
                  </div>
                  <span className={`scard-status ${statusClass}`}>{statusText}</span>
                </div>

                <div className="scard-body">
                  <div className="scard-teams">
                    {renderTeam(ch.team_a, 'l')}
                    <span className="scard-vs">VS</span>
                    {renderTeam(ch.team_b, 'r')}
                  </div>
                  {(ch.location || ch.notes) && (
                    <div className="scard-meta">
                      {ch.location && <span className="scard-meta-item">{"\uD83D\uDCCD"} {ch.location}</span>}
                      {ch.notes && <span className="scard-meta-item" style={{fontStyle:'italic'}}>{ch.notes}</span>}
                    </div>
                  )}
                  {isPending && imIn && myResponse==='accepted' && (
                    <div style={{fontSize:11,color:'var(--accent)',fontWeight:600,textAlign:'center',marginTop:8}}>{"\u2713"} You accepted \u2014 waiting for others</div>
                  )}
                  {isPending && imIn && myResponse==='declined' && (
                    <div style={{fontSize:11,color:'var(--danger)',fontWeight:600,textAlign:'center',marginTop:8}}>{"\u2717"} You declined this match</div>
                  )}
                </div>

                {/* Inline log-match form (preserved verbatim — out of Phase 7 scope) */}
                {loggingMatch===ch.id && (
                  <div style={{padding:'12px 14px',background:'var(--surface-2)',borderTop:'1px solid var(--border)'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--accent)',marginBottom:10}}>{"\uD83C\uDFBE"} Log Match Result</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <div style={{fontSize:11,color:'#9090a4',fontWeight:600}}>Sets</div>
                      <div style={{display:'flex',gap:4}}>{[2,3].map(n=>(
                        <button key={n} onClick={()=>setLogNs(n)} style={{padding:'3px 8px',borderRadius:6,border:`1px solid ${logNs===n?'var(--accent)':'var(--border)'}`,background:logNs===n?'var(--accent-dim)':'transparent',color:logNs===n?'var(--accent)':'#9090a4',fontSize:10,fontWeight:600,cursor:'pointer'}}>{n}</button>
                      ))}</div>
                    </div>
                    {logSets.slice(0,logNs).map((sset,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                        <span style={{fontSize:10,color:'#9090a4',width:32,fontWeight:600}}>Set {i+1}</span>
                        <ScoreStepper value={sset[0]} max={7} aColor={A} ariaLabel={`Set ${i+1} Team A`} invalid={logInvalidIdx.includes(i)} onChange={(n)=>{const x=logSets.map(y=>[...y]);x[i]=[n,x[i][1]];setLogSets(x);if(logInvalidIdx.length)setLogInvalidIdx([]);if(logValidationError)setLogValidationError("");}}/>
                        <span style={{color:'#9090a4',fontWeight:700}}>-</span>
                        <ScoreStepper value={sset[1]} max={7} aColor={DG} ariaLabel={`Set ${i+1} Team B`} invalid={logInvalidIdx.includes(i)} onChange={(n)=>{const x=logSets.map(y=>[...y]);x[i]=[x[i][0],n];setLogSets(x);if(logInvalidIdx.length)setLogInvalidIdx([]);if(logValidationError)setLogValidationError("");}}/>
                      </div>
                    ))}
                    {logValidationError && (
                      <div style={{marginTop:8,padding:'6px 10px',background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.3)',borderRadius:6,fontSize:11,color:'var(--danger)',fontWeight:600}}>
                        {"\u26A0\uFE0F"} {logValidationError}
                      </div>
                    )}
                    <div style={{marginTop:8,marginBottom:10}}>
                      <div style={{fontSize:10,color:'#9090a4',fontWeight:600,marginBottom:4}}>{"\u2B50"} Man of the Match</div>
                      <select value={logMotm} onChange={e=>setLogMotm(e.target.value)} style={{...sel,fontSize:12}}>
                        <option value="">Select MVP</option>
                        {[...(ch.team_a||[]),...(ch.team_b||[])].map(pid=>(<option key={pid} value={pid}>{getName(pid)}</option>))}
                      </select>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={saveLoggedMatch} disabled={logSaving} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'var(--accent)',color:'#000',fontSize:12,fontWeight:700,cursor:'pointer',opacity:logSaving?0.6:1}}>{logSaving?'Saving...':'Save Match'}</button>
                      <button onClick={()=>setLoggingMatch(null)} style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:12,fontWeight:700,cursor:'pointer'}}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Action buttons — restyled to .sab (Q9-derived) */}
                <div className="scard-actions">
                  {needsMyResponse && (
                    <>
                      <button className="sab accept" onClick={()=>respondToChallenge(ch,'accepted')}>Accept</button>
                      <button className="sab decline" onClick={()=>respondToChallenge(ch,'declined')}>Decline</button>
                    </>
                  )}
                  {canJoinA && <button className="sab accept" onClick={()=>joinChallenge(ch,'a')}>Join Team A</button>}
                  {canJoinB && <button className="sab accept" onClick={()=>joinChallenge(ch,'b')}>Join Team B</button>}
                  {imIn && !isCreator && ch.status==='open' && (
                    <button className="sab decline" onClick={()=>leaveChallenge(ch)}>Leave</button>
                  )}
                  {isConfirmed && !loggingMatch && (
                    <button className="sab log" onClick={()=>openLogMatch(ch)}>{"\uD83C\uDFBE"} Log Match</button>
                  )}
                  {(isCreator || isAdmin) && (
                    cancelConfirmId===ch.id ? (
                      <>
                        <button className="sab decline" onClick={()=>{cancelChallenge(ch.id);setCancelConfirmId(null);}}>Yes, cancel</button>
                        <button className="sab cancel" onClick={()=>setCancelConfirmId(null)}>No</button>
                      </>
                    ) : (
                      <button className="sab cancel" onClick={()=>setCancelConfirmId(ch.id)}>Cancel</button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}