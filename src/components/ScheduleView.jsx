import React, { useState, useEffect } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, BL, PU } from '../theme';
import { formatDate, win, setTotals, formatTeam } from '../utils/helpers';
import { TeamShuffler } from './TeamShuffler';
import { ScoreStepper } from './ScoreStepper';
import { validateMatch } from '../utils/scoringEngine';
import Icon from './Icon';

export function ScheduleView({challenges,players,matches,supabase,leagueId,user,getName,isAdmin,onUpdate,showToast,sendPushNotification,sel,elo,seasonId,openMatches,openMatchPlayers,claimedPlayer,scrollToOpenMatchId,onOpenMatchScrolled}){
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
  // S073 FT-16: match type toggle in Step 1 + open-match action busy flag
  const [matchType,setMatchType]=useState("private"); // "private" | "open"
  const [omBusy,setOmBusy]=useState(false);

  // S074 FT-16: scroll-to + flash an .omcard when a notification deep-links here.
  useEffect(() => {
    if (!scrollToOpenMatchId) return;
    const t = setTimeout(() => {
      const el = document.querySelector(`.omcard[data-open-match-id="${scrollToOpenMatchId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("om-flash");
        setTimeout(() => el.classList.remove("om-flash"), 1800);
      }
      if (onOpenMatchScrolled) onOpenMatchScrolled();
    }, 120);
    return () => clearTimeout(t);
  }, [scrollToOpenMatchId, onOpenMatchScrolled]);
  const [loggingMatch,setLoggingMatch]=useState(null);
  const [cancelConfirmId,setCancelConfirmId]=useState(null);
  const [logSets,setLogSets]=useState([[0,0],[0,0],[0,0]]);
  const [logNs,setLogNs]=useState(2);
  const [logMotm,setLogMotm]=useState("");
  const [logSaving,setLogSaving]=useState(false);
  // FT-09b / S045: FIP validation state for the inline log form
  const [logInvalidIdx,setLogInvalidIdx]=useState([]);
  const [logValidationError,setLogValidationError]=useState("");

  const inp={background:CD2,color:TX,border:`1px solid ${BD}`,borderRadius:8,padding:"10px 12px",fontSize:13,width:"100%",outline:"none",fontFamily: "var(--font)"};
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

  // S073 FT-16: open-match RPC actions ----------------------------------
  async function createOpenMatch(){
    const today=new Date().toISOString().split("T")[0];
    if(!date||date<today){showToast("Select a future date","error");return;}
    if(!claimedPlayer){showToast("Claim a player first","error");return;}
    const scheduledAt=new Date(`${date}T${time||"18:00"}:00`).toISOString();
    setSaving(true);
    try{
      const {data,error}=await supabase.rpc("create_open_match",{
        p_league_id:leagueId,
        p_scheduled_at:scheduledAt,
        p_duration:duration||90,
        p_court:location.trim()||null,
        p_notes:notes.trim()||null,
        p_season_id:seasonId||null
      });
      if(error)throw error;
      showToast("Match opened to league — waiting for 3 more players");
      // S074 FT-16: in-app notification rows for all league members are inserted by
      // create_open_match RPC server-side (Lesson #54 — single source of truth to
      // avoid duplicates with push-notify Edge Function). Web push delivery is a
      // S074+ follow-up via pg_net / trigger pattern.
      setShowForm(false);setStep(1);setMatchType("private");
      setNotes("");setLocation("");
      if(onUpdate)onUpdate();
      return data;
    }catch(err){showToast(err.message||"Failed to open match","error");}
    finally{setSaving(false);}
  }
  async function joinOpenMatch(omId){
    if(!claimedPlayer){showToast("Claim a player first","error");return;}
    setOmBusy(true);
    try{
      const {data,error}=await supabase.rpc("join_open_match",{p_open_match_id:omId});
      if(error)throw error;
      if(data?.status==="locked"){
        showToast("Match locked in — teams shuffled!");
        // S074 FT-16: 'locked' notification rows for all 4 participants are
        // inserted by join_open_match RPC server-side (single source of truth).
      } else {
        showToast(`Spot claimed (${data?.count||"?"}/4)`);
      }
      if(onUpdate)onUpdate();
    }catch(err){showToast(err.message||"Failed to claim spot","error");}
    finally{setOmBusy(false);}
  }
  async function leaveOpenMatch(omId){
    setOmBusy(true);
    try{
      const {error}=await supabase.rpc("leave_open_match",{p_open_match_id:omId});
      if(error)throw error;
      showToast("Left the match");
      if(onUpdate)onUpdate();
    }catch(err){showToast(err.message||"Failed to leave","error");}
    finally{setOmBusy(false);}
  }
  async function cancelOpenMatch(omId){
    setOmBusy(true);
    try{
      const {error}=await supabase.rpc("cancel_open_match",{p_open_match_id:omId});
      if(error)throw error;
      showToast("Match cancelled");
      // S074 FT-16: 'cancelled' notification rows for all signed-up players are
      // inserted by cancel_open_match RPC server-side.
      if(onUpdate)onUpdate();
    }catch(err){showToast(err.message||"Failed to cancel","error");}
    finally{setOmBusy(false);}
  }
  // ---------------------------------------------------------------------

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

      {/* S073 FT-16: Open Matches section — renders above the regular schedule
          list. Each card shows date/time/court + 4 slot avatars + status pill +
          contextual action (Claim / Leave / Cancel / Log Score). */}
      {(openMatches||[]).length>0 && !showForm && (
        <div className="om-section">
          <div className="om-secheader">
            <span className="om-secheader-eb">Open to League</span>
            <span className="om-secheader-ct">{openMatches.length} active</span>
          </div>
          {openMatches.map(om=>{
            const signedUpRows=(openMatchPlayers||[]).filter(p=>p.open_match_id===om.id);
            const signedUpIds=signedUpRows.map(p=>p.player_id);
            const filledCount=signedUpIds.length;
            const isOrganizer=claimedPlayer?.id===om.organizer_id;
            const youSignedUp=claimedPlayer?signedUpIds.includes(claimedPlayer.id):false;
            const isLocked=om.status==="locked";
            const dt=new Date(om.scheduled_at);
            const dateStr=dt.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"}).toUpperCase();
            const timeStr=dt.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
            return (
              <div key={om.id} className={`omcard${isLocked?" locked":""}`} data-open-match-id={om.id}>
                <div className="omcard-hd">
                  <div className="omcard-when">
                    <div className="omcard-date">{dateStr} {"·"} {timeStr}</div>
                    <div className="omcard-meta">{om.duration_minutes} min{om.court?` ${"·"} ${om.court}`:""} {"·"} {getName(om.organizer_id)} opened</div>
                  </div>
                  <span className={`omcard-status ${isLocked?"locked":"open"}`}>
                    <span className="omcard-dot"/>{isLocked?"Locked":`${filledCount} / 4`}
                  </span>
                </div>
                <div className="omcard-slots">
                  {[0,1,2,3].map(idx=>{
                    let pid=null, team=null;
                    if(isLocked){
                      const teamA=om.team_a_player_ids||[];
                      const teamB=om.team_b_player_ids||[];
                      if(idx<teamA.length){pid=teamA[idx];team="a";}
                      else if(idx<teamA.length+teamB.length){pid=teamB[idx-teamA.length];team="b";}
                    } else {
                      pid=signedUpIds[idx]||null;
                    }
                    if(!pid) return (
                      <div key={idx} className="omslot">
                        <div className="omslot-avi empty">+</div>
                        <div className="omslot-name empty">Open</div>
                      </div>
                    );
                    const isOrg=pid===om.organizer_id;
                    const initial=(getName(pid)||"?").charAt(0).toUpperCase();
                    return (
                      <div key={idx} className="omslot">
                        <div className={`omslot-avi${isOrg?" org":""}${team?(team==="a"?" team-a":" team-b"):""}`}>{initial}</div>
                        <div className="omslot-name">{getName(pid)}</div>
                        {isOrg && !isLocked && <div className="omslot-role">Org</div>}
                        {team && <div className={`omslot-team ${team}`}>Team {team.toUpperCase()}</div>}
                      </div>
                    );
                  })}
                </div>
                {om.notes && <div className="omcard-notes">"{om.notes}"</div>}
                <div className="omcard-actions">
                  {!isLocked && !youSignedUp && filledCount<4 && (
                    <button className="omcard-btn primary" disabled={omBusy} onClick={()=>joinOpenMatch(om.id)}>Claim a Spot</button>
                  )}
                  {!isLocked && youSignedUp && !isOrganizer && (
                    <button className="omcard-btn muted" disabled={omBusy} onClick={()=>leaveOpenMatch(om.id)}>Leave</button>
                  )}
                  {!isLocked && (isOrganizer || isAdmin) && (
                    <button className="omcard-btn danger" disabled={omBusy} onClick={()=>cancelOpenMatch(om.id)}>Cancel</button>
                  )}
                  {isLocked && (isOrganizer || isAdmin) && (
                    <button className="omcard-btn ghost" disabled={omBusy} onClick={()=>cancelOpenMatch(om.id)}>Cancel</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phase 7 (S065 spec port): Multi-step schedule form. Markup ported verbatim
          from PadelHub_Complete_v2.jsx ScheduleScreen lines 1490-1622, with LONG
          token names. Step 1: Players card with Team A (green) / VS / Team B (gold).
          Step 2: summary chip + sheet-form Details card with info banner. */}

      {/* ── Step 1: Select Players ── */}
      {showForm && step===1 && (
        <div style={{padding:"10px 18px 0"}}>
          {/* Progress stepper */}
          <div className="sch-progress">
            <div className="sch-step-circle active">1</div>
            <div className="sch-connector"><div className="sch-connector-fill" style={{width:"0%"}}/></div>
            <div className="sch-step-circle idle">2</div>
            <div className="sch-step-label">{matchType==="open"?"Open":"Players"} {"\u2192"} Details</div>
          </div>

          {/* S073 FT-16: Match type toggle \u2014 Private vs Open to League */}
          <div className="sform-tcard">
            <div className="sform-tcardh"><span className="sform-tcardh-lbl">Match Type</span></div>
            <div className="sform-typetoggle">
              <button className={`sform-typebtn${matchType==="private"?" on":""}`} onClick={()=>setMatchType("private")}>
                Private Match
                <span className="sform-typebtn-sub">Pick all 4 players</span>
              </button>
              <button className={`sform-typebtn${matchType==="open"?" on":""}`} onClick={()=>setMatchType("open")}>
                Open to League
                <span className="sform-typebtn-sub">Anyone can claim</span>
              </button>
            </div>
          </div>

          {/* S073 FT-16 Open mode: show "you're in" card instead of team picker */}
          {matchType==="open" && claimedPlayer && (
            <div className="sform-youonly">
              <div className="sform-youavi">{(getName(claimedPlayer.id)||"?").charAt(0).toUpperCase()}</div>
              <div className="sform-youinfo">
                <div className="sform-youinfo-eb">Organizer {"\u00b7"} Spot 1 of 4</div>
                <div className="sform-youinfo-name">{getName(claimedPlayer.id)} (you)</div>
                <div className="sform-youinfo-sub">Other 3 spots open to all league members</div>
              </div>
            </div>
          )}

          {/* FT-08 Shuffler renders inline above the players card when active */}
          {matchType==="private" && showShuffler && (
            <div style={{marginTop:10}}>
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
            </div>
          )}

          {/* Teams card — only visible in Private match type */}
          {matchType==="private" && !showShuffler && (
            <div className="tcard" style={{marginTop:10}}>
              <div className="tcardh">
                <div className="tcardtit">Players</div>
                <button className="shufbtn" onClick={()=>setShowShuffler(true)}>
                  <Icon name="shuffle" size={13}/>Shuffle
                </button>
              </div>
              <div className="tinner">
                {/* Team A (green) */}
                <div>
                  <div className="tcolh"><div className="tcoldot tcolha"/><div className="tcollbl tcollbla">Team A</div></div>
                  {[0,1].map(i=>{
                    const allSel=[tA[0],tA[1],tB[0],tB[1]].filter(Boolean);
                    const others=allSel.filter(v=>v!==tA[i]);
                    return (
                      <div key={i} className="pslot">
                        <select className={`psel af${tA[i]?" fi":""}`} value={tA[i]} onChange={e=>{const n=[...tA];n[i]=e.target.value;setTA(n);}}>
                          <option value="">{"\u2014 Select \u2014"}</option>
                          {players.filter(p=>!others.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
                        </select>
                        <div className="pselch"><Icon name="chevron" size={13}/></div>
                      </div>
                    );
                  })}
                </div>
                <div className="tcolvs">VS</div>
                {/* Team B (gold) */}
                <div>
                  <div className="tcolh" style={{justifyContent:"flex-end"}}><div className="tcollbl tcollblb">Team B</div><div className="tcoldot tcolhb"/></div>
                  {[0,1].map(i=>{
                    const allSel=[tA[0],tA[1],tB[0],tB[1]].filter(Boolean);
                    const others=allSel.filter(v=>v!==tB[i]);
                    return (
                      <div key={i} className="pslot">
                        <select className={`psel bf${tB[i]?" fi":""}`} value={tB[i]} onChange={e=>{const n=[...tB];n[i]=e.target.value;setTB(n);}}>
                          <option value="">{"\u2014 Select \u2014"}</option>
                          {players.filter(p=>!others.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
                        </select>
                        <div className="pselch"><Icon name="chevron" size={13}/></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Actions: 3fr / 2fr (Continue / Cancel) */}
          {(() => {
            // S073 FT-16: Open mode requires only the organizer (you), not a full 4-player team.
            const canContinue = matchType==="open" ? !!claimedPlayer : (tA[0] && tA[1] && tB[0] && tB[1]);
            return (<>
              <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:8,marginTop:10}}>
                <button className={`savebtn ${canContinue?"on":"off"}`} disabled={!canContinue} onClick={()=>canContinue && setStep(2)}>
                  {canContinue && <Icon name="arrow-right" size={16} color="#000" strokeWidth={2}/>}Continue
                </button>
                <button className="shcancel" onClick={()=>{setShowForm(false);setStep(1);setTA(["",""]);setTB(["",""]);setMatchType("private");}}>Cancel</button>
              </div>
              {!canContinue && matchType==="private" && <div className="savehint">Select all 4 players to continue</div>}
              {!canContinue && matchType==="open" && <div className="savehint">Claim a player profile to open a match</div>}
            </>);
          })()}
        </div>
      )}

      {/* ── Step 2: Match Details ── */}
      {showForm && step===2 && (
        <div style={{padding:"10px 18px 0"}}>
          {/* Progress stepper (1 done, 2 active) */}
          <div className="sch-progress">
            <div className="sch-step-circle done"><Icon name="check" size={14} color="#000" strokeWidth={2.5}/></div>
            <div className="sch-connector"><div className="sch-connector-fill" style={{width:"100%"}}/></div>
            <div className="sch-step-circle active">2</div>
            <div className="sch-step-label">Players {"\u2192"} Details</div>
          </div>

          {/* Team summary chip — Premier Padel "/" format via formatTeam helper */}
          <div className="svsum" style={{marginTop:10}}>
            <span className="svsum-a">{formatTeam(getName(tA[0]), getName(tA[1]))}</span>
            <span className="svsum-vs">vs</span>
            <span className="svsum-b">{formatTeam(getName(tB[0]), getName(tB[1]))}</span>
            <button className="svsum-edit" onClick={()=>setStep(1)}>Edit <Icon name="edit" size={11}/></button>
          </div>

          {/* Details card */}
          <div className="tcard" style={{marginTop:10}}>
            <div style={{padding:"12px 14px 0"}}>
              {/* Match Date & Time */}
              <div className="shlbl" style={{marginBottom:6}}><Icon name="calendar" size={12}/>Match Date {"\u0026"} Time</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                <input type="date" className="shi" value={date} min={new Date().toISOString().split("T")[0]} onChange={e=>setDate(e.target.value)}/>
                <input type="time" className="shi" value={time} onChange={e=>setTime(e.target.value)}/>
              </div>

              {/* Duration — inline pillrow */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <div className="shlbl" style={{marginBottom:0}}><Icon name="clock" size={12}/>Duration</div>
                <div className="stog">
                  {[60,90,120].map(d=>(
                    <button key={d} className={`stogbtn${duration===d?' on':''}`} onClick={()=>setDuration(d)}>{d}m</button>
                  ))}
                </div>
              </div>
              <div style={{height:10}}/>

              {/* Court */}
              <div className="shlbl" style={{marginBottom:6}}><Icon name="court-l" size={12}/>Court</div>
              <input className="shi" style={{marginBottom:10}} placeholder={"e.g. Harmony 3 \u2013 Padel Court 1"} value={location} onChange={e=>setLocation(e.target.value)}/>

              {/* Notes */}
              <div className="shlbl" style={{marginBottom:6}}><Icon name="edit" size={12}/>Notes (optional)</div>
              <input className="shi" style={{marginBottom:14}} placeholder={"Any notes for the players\u2026"} value={notes} onChange={e=>setNotes(e.target.value)}/>
            </div>

            {/* Info note */}
            <div style={{margin:"0 14px 14px"}}>
              <div className="inote">
                <Icon name="info" size={14} color="rgba(245,158,11,.8)"/>
                <div className="inotet">All players will be notified when the match is scheduled.</div>
              </div>
            </div>
          </div>

          {/* Actions: 3fr / 2fr (Schedule Match / Back) */}
          <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:8,marginTop:10}}>
            <button className={`savebtn ${saving?"off":"on"}`} disabled={saving} onClick={matchType==="open"?createOpenMatch:createChallenge}>
              {!saving && <Icon name="check" size={16} color="#000" strokeWidth={2.5}/>}{saving?(matchType==="open"?"Opening...":"Scheduling..."):(matchType==="open"?"Open to League":"Schedule Match")}
            </button>
            <button className="shcancel" onClick={()=>setStep(1)}>Back</button>
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
                      {ch.notes && <span className="scard-meta-item">{ch.notes}</span>}
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