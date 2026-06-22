import React, { useState, useEffect } from "react";
import { TeamShuffler } from './TeamShuffler';
import { createInitialLiveState, scorePoint, undoPoint, getLiveDisplay, liveToSets, validateMatch } from '../utils/scoringEngine';
import { formatTeam, formatDateParts } from '../utils/helpers';
import Icon from './Icon';

// S066 Phase 9: spec-faithful restyle of LogMatch.
// Uses Phase 7's .tcard/.tcardh/.shufbtn/.tinner/.tcolh/.tcoldot/.tcollbl/.tcolvs/.pslot/.psel
// + Phase 9's new .modebar/.modebtn/.sccard/.cstep/.csbtn/.csval/.livebi/.acbtn/.mvpcard/.savebtn etc.
// Behavior preserved: 2/3 set toggle, Manual entry, LIVE scoring engine, FT-09 approval flow,
// FT-09b FIP validation, dead-rubber auto-truncate, post-save broadcast push.
export function LogMatch({players,matches:_matches,supabase,leagueId,user,pm,em,setEm,goBack,sel:_sel,lbl:_lbl,getName,seasonId,seasons,setCurSeason,onSave,showToast,sendPushNotification,prefilledOpenMatch,onPrefilledHandled,pairs,roster}){
  const isE=!!em;
  const [tA,setTA]=useState(["",""]);
  const [tB,setTB]=useState(["",""]);
  const [sets,setSets]=useState([[0,0],[0,0],[0,0]]);
  const [ns,setNs]=useState(2);
  const [motm,setMotm]=useState("");
  const [date,setDate]=useState(new Date().toISOString().split("T")[0]);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [showShuffler,setShowShuffler]=useState(false);
  const [queue,setQueue]=useState([]);
  const [mode,setMode]=useState('manual');
  const [liveState,setLiveState]=useState(createInitialLiveState);
  const [liveNs,setLiveNs]=useState(3);
  const [invalidIdx,setInvalidIdx]=useState([]);
  const [validationError,setValidationError]=useState("");
  const [teamsLocked,setTeamsLocked]=useState(false); // F3: lock teams before scoring
  // S076 FT-15: pair-aware picker state (pairs-format seasons only)
  const currentSeason = (seasons || []).find(sea => sea.id === seasonId);
  const isPairsFormat = currentSeason?.format === "pairs";
  const isCasual = currentSeason?.ruleset === "casual"; // S080
  const seasonPairs = isPairsFormat ? (pairs || []).filter(pr => pr.season_id === seasonId) : [];
  const [selectedPairA,setSelectedPairA]=useState("");
  const [selectedPairB,setSelectedPairB]=useState("");
  // Pair labels — "Custom Name · A / B" or "A / B"
  const pairLabel = (pr) => {
    const pA = (players || []).find(p => p.id === pr.player_a_id);
    const pB = (players || []).find(p => p.id === pr.player_b_id);
    const fallback = `${pA?.name || "?"} / ${pB?.name || "?"}`;
    return pr.name ? `${pr.name} · ${fallback}` : fallback;
  };
  // When a pair is selected, push its player IDs into tA/tB
  useEffect(() => {
    if (!isPairsFormat) return;
    if (selectedPairA) {
      const pr = seasonPairs.find(p => p.id === selectedPairA);
      if (pr) setTA([pr.player_a_id, pr.player_b_id]);
    } else {
      setTA(["",""]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seasonPairs is derived from context and only used for lookup; adding it would cause infinite re-sync loops
  }, [selectedPairA, isPairsFormat]);
  useEffect(() => {
    if (!isPairsFormat) return;
    if (selectedPairB) {
      const pr = seasonPairs.find(p => p.id === selectedPairB);
      if (pr) setTB([pr.player_a_id, pr.player_b_id]);
    } else {
      setTB(["",""]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seasonPairs is derived from context and only used for lookup; adding it would cause infinite re-sync loops
  }, [selectedPairB, isPairsFormat]);
  // When editing an existing match in a pairs season, pre-select the pairs
  useEffect(() => {
    if (!isPairsFormat || !em) return;
    const findPair = (team) => seasonPairs.find(pr =>
      (pr.player_a_id === team[0] && pr.player_b_id === team[1]) ||
      (pr.player_a_id === team[1] && pr.player_b_id === team[0])
    );
    const pA = findPair(em.team_a || []);
    const pB = findPair(em.team_b || []);
    if (pA) setSelectedPairA(pA.id);
    if (pB) setSelectedPairB(pB.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seasonPairs is derived from context and only used for lookup; adding it would cause infinite re-sync loops
  }, [em, isPairsFormat]);
  // S075 FT-16: hold the open_match id so we can attach it to the insert payload.
  const [openMatchId,setOpenMatchId]=useState(null);

  // S075 FT-16: pre-fill teams from a locked open_match.
  useEffect(()=>{
    if(!prefilledOpenMatch)return;
    const ta=prefilledOpenMatch.team_a_player_ids||[];
    const tb=prefilledOpenMatch.team_b_player_ids||[];
    if(ta.length===2 && tb.length===2){
      setTA([ta[0],ta[1]]);
      setTB([tb[0],tb[1]]);
      setOpenMatchId(prefilledOpenMatch.id);
      setTeamsLocked(true);
      // Pre-fill date from scheduled_at if it exists
      if(prefilledOpenMatch.scheduled_at){
        const d=new Date(prefilledOpenMatch.scheduled_at);
        setDate(d.toISOString().split("T")[0]);
      }
    }
  },[prefilledOpenMatch]);

  useEffect(()=>{
    if(em){
      setTA([...em.team_a]);
      setTB([...em.team_b]);
      const s=[...em.sets.map(x=>[...x])];
      while(s.length<3)s.push([0,0]);
      setSets(s);
      setNs(em.sets.length);
      setMotm(em.motm||"");
      setDate(em.date);
      setTeamsLocked(true);
    }
  },[em]);

  const {ptA,ptB,gA,gB,isDeuce,inTiebreak}=getLiveDisplay(liveState);
  const {sA,sB,completedSets:_completedSets,matchOver,history:liveHistory}=liveState;

  const teamName=(ids)=>{
    const names=ids.filter(Boolean).map(id=>getName?getName(id):id);
    if(names.length===0)return 'Team';
    if(names.length===1)return names[0];
    return formatTeam(names[0],names[1]);
  };

  function handleModeChange(m){
    if(m===mode)return;
    if(m==='manual'){
      const ls=liveToSets(liveState);
      if(ls.length>0){
        const padded=[...ls];
        while(padded.length<3)padded.push([0,0]);
        setSets(padded);
        setNs(ls.length);
      }
    } else {
      setLiveState(createInitialLiveState());
    }
    setMode(m);
  }

  const all=[...tA,...tB].filter(Boolean);
  const avail=c=>players.filter(p=>(!all.includes(p.id)||p.id===c) && (roster&&roster.size>0?roster.has(p.id):true));
  const playerName=(pid)=>pm[pid]?.nickname||pm[pid]?.name||"";
  const getAvatar=(pid)=>players.find(p=>p.id===pid)?.avatar_url;

  async function submit(){
    if(tA.some(x=>!x)||tB.some(x=>!x))return;
    if(date>new Date().toISOString().split("T")[0]){if(showToast)showToast("Cannot log a match for a future date","error");return;}

    const rawSets = mode==='live' ? liveToSets(liveState) : sets.slice(0,ns);
    const result = validateMatch(rawSets, isCasual ? 'casual' : 'fip');

    if(result.status === 'invalid'){
      setInvalidIdx(result.invalidIndexes);
      setValidationError(result.error);
      if(showToast)showToast(result.error,"error");
      return;
    }
    setInvalidIdx([]);
    setValidationError("");

    const as = result.completedSets;
    if(!as.length){if(showToast)showToast("Score at least one set to save","error");return;}
    const isIncomplete = result.status === 'incomplete';

    setSaving(true);
    let insertedStatus = "approved";
    try{
      if(isE){
        const {error}=await supabase
          .from("matches")
          .update({date,team_a:[...tA],team_b:[...tB],sets:as,motm:motm||null})
          .eq("id",em.id);
        if(error)throw error;
      }else{
        const {data:inserted,error}=await supabase
          .from("matches")
          .insert({league_id:leagueId,season_id:seasonId,date,team_a:[...tA],team_b:[...tB],sets:as,motm:motm||null,logged_by:user.id,open_match_id:openMatchId||null})
          .select("status")
          .single();
        if(error)throw error;
        insertedStatus = inserted?.status || "approved";
      }
      const hasNext=!isE&&queue.length>0;
      if(hasNext){
        const next=queue[0];
        setTA([...next.team_a]);
        setTB([...next.team_b]);
        setSets([[0,0],[0,0],[0,0]]);
        setMotm("");
        setNs(2);
        setQueue(queue.slice(1));
        setLiveState(createInitialLiveState());
        setTeamsLocked(true);
      } else {
        reset();
      }
      setSaved(true);
      setTimeout(()=>setSaved(false),2000);
      if(onSave)onSave();
      // S075 FT-16: clear the open_match handoff so a subsequent log doesnt re-attach.
      if(openMatchId){ setOpenMatchId(null); if(onPrefilledHandled) onPrefilledHandled(); }
      const isPending = !isE && insertedStatus === "pending";
      const isIncompleteSaved = !isE && insertedStatus === "incomplete";
      if(showToast){
        if(isE) showToast("Match updated");
        else if(isIncompleteSaved) showToast("Saved as incomplete — won't count toward rankings");
        else if(isPending) showToast(hasNext?`Submitted for approval — ${queue.length} remaining`:"Submitted — waiting for admin approval");
        else if(result.droppedSets>0) showToast(hasNext?`Match saved (dead-rubber set dropped). Next up — ${queue.length} remaining`:"Match saved (dead-rubber set dropped)");
        else showToast(hasNext?`Match saved! Next up — ${queue.length} remaining`:"Match saved!");
      }
      if(!isE && !isPending && !isIncompleteSaved && !isIncomplete && sendPushNotification){
        const tANames=formatTeam(getName?getName(tA[0]):tA[0],getName?getName(tA[1]):tA[1]);
        const tBNames=formatTeam(getName?getName(tB[0]):tB[0],getName?getName(tB[1]):tB[1]);
        let setsA=0,setsB=0;
        as.forEach(([a,b])=>{if(a>b)setsA++;else if(b>a)setsB++;});
        const winnerNames=setsA>setsB?tANames:tBNames;
        const loserNames=setsA>setsB?tBNames:tANames;
        const setSummary=as.map(([a,b])=>setsA>setsB?`${a}-${b}`:`${b}-${a}`).join(", ");
        sendPushNotification("match","New Match Result",`${winnerNames} beat ${loserNames} (${setSummary}) — leaderboard updated`);
      }
    }catch(_err){
      if(showToast)showToast("Failed to save match","error");
    }finally{
      setSaving(false);
    }
  }

  function reset(){
    setTA(["",""]);
    setTB(["",""]);
    setSets([[0,0],[0,0],[0,0]]);
    setMotm("");
    setDate(new Date().toISOString().split("T")[0]);
    setNs(2);
    setEm(null);
    setLiveState(createInitialLiveState());
    setLiveNs(3);
    setMode('manual');
    setTeamsLocked(false);
  }

  function cancel(){
    reset();
    goBack();
  }

  function shuffleNow(){
    setShowShuffler(true);
  }

  // S078 Issue #71 polish: open-match read-only state. When LogMatch was
  // opened from a locked open-match notification, lock the team picker so
  // the user cannot inadvertently swap players. Provide a single Undo
  // button that clears the link back to the open match and re-enables editing.
  const isFromOpenMatch = !!openMatchId;
  const undoPrefill = () => {
    setOpenMatchId(null);
    setTA(["",""]);
    setTB(["",""]);
    if (isPairsFormat) { setSelectedPairA(""); setSelectedPairB(""); }
    setTeamsLocked(false);
    if (onPrefilledHandled) onPrefilledHandled();
  };

  // Manual mode results
  const manualSets = sets.slice(0,ns);
  const aWins = manualSets.filter(s=>s[0]>s[1]).length;
  const bWins = manualSets.filter(s=>s[1]>s[0]).length;
  const hasResult = manualSets.some(s=>s[0]>0||s[1]>0);

  const allFilled = tA[0]&&tA[1]&&tB[0]&&tB[1];
  const scoresEntered = mode==='manual' ? hasResult : (liveState.history.length>0);
  const canSave = allFilled && scoresEntered;
  const saveHint = !allFilled ? "Select all 4 players to continue" : !scoresEntered ? "Enter at least one set score" : "";

  const teamAlbl = teamName(tA);
  const teamBlbl = teamName(tB);
  const tbA = liveState.tbA || 0;
  const tbB = liveState.tbB || 0;

  return (
    <div className="logbody">
      {/* S091 (#127.5): screen header (hidden in edit mode, which shows its own bar). */}
      {!isE && <h2 className="scrn-title">Log Match</h2>}
      {/* S091 (#127): top Cancel removed (it overflowed) — Cancel now sits beside
          the Update Match button at the bottom. */}
      {isE && (
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:700,color:"var(--gold)",fontFamily:"var(--mono)",letterSpacing:".08em",textTransform:"uppercase"}}>
          <Icon name="edit" size={14}/> Editing
        </div>
      )}
      {saved && (
        <div style={{background:"var(--accent-dim)",border:"1px solid var(--accent-glow)",borderRadius:"var(--r-md)",padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
          <Icon name="check" size={14} color="var(--accent)" strokeWidth={2.5}/>
          <span style={{color:"var(--accent)",fontWeight:700,fontSize:13}}>{isE?"Updated!":"Saved!"}</span>
        </div>
      )}

      {/* Manual / LIVE mode bar (hidden in edit mode) */}
      {!isE && !isCasual && (
        <div className="modebar" style={{margin:0}}>
          <button className={`modebtn ${mode==='manual'?'man':''}`} onClick={()=>handleModeChange('manual')}>
            <Icon name="edit" size={15} color={mode==='manual'?"var(--text)":"#9090a4"}/>Manual
          </button>
          <button className={`modebtn ${mode==='live'?'live':''}`} onClick={()=>handleModeChange('live')}>
            {mode==='live'?<div className="livedot"/>:<Icon name="zap" size={15} color="#9090a4"/>}Live
          </button>
        </div>
      )}

      {/* Date + Season context bar */}
      {/* S091 (#127.4): season pill on the right (date left) for app-wide consistency. */}
      <div className="ctxbar" style={{padding:"8px 0",borderBottom:"none",justifyContent:"space-between"}}>
        {/* S091 (#127.5): native date inputs can't show a weekday, so a weekday
            badge sits beside the picker, derived from the selected date. */}
        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
          {date && <span className="ctx-dow">{formatDateParts(date).dow}</span>}
          <input
            type="date"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={e=>setDate(e.target.value)}
            className="ctxchip"
            style={{colorScheme:"dark",cursor:"pointer",appearance:"none",WebkitAppearance:"none"}}
          />
        </div>
        {!isE && seasons && seasons.length > 0 && (
          <div style={{position:"relative",display:"inline-flex",alignItems:"center",flexShrink:0}}>
            <select
              value={seasonId||""}
              onChange={e=>setCurSeason(e.target.value)}
              className="spill"
              style={{appearance:"none",WebkitAppearance:"none",cursor:"pointer",paddingRight:26,backgroundImage:"none",color:currentSeason?.active?"var(--accent)":"#9090a4",fontWeight:currentSeason?.active?700:400}}
            >
              {seasons.filter(s=>s.active||s.id===seasonId).map(s=>(
                <option key={s.id} value={s.id} style={{color:s.active?"#fff":"#9090a4"}}>{s.name}</option>
              ))}
            </select>
            <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%) rotate(90deg)",pointerEvents:"none",display:"flex"}}>
              <Icon name="chevron" size={12} color={currentSeason?.active?"var(--accent)":"#9090a4"}/>
            </span>
          </div>
        )}
      </div>

      {!isE && showShuffler && (
        <TeamShuffler
          players={roster&&roster.size>0?players.filter(p=>roster.has(p.id)):players}
          getName={getName}
          onAccept={({matches})=>{
            if(matches.length===0){setShowShuffler(false);return;}
            const first=matches[0];
            setTA([...first.team_a]);
            setTB([...first.team_b]);
            setSets([[0,0],[0,0],[0,0]]);
            setMotm("");
            setNs(2);
            setQueue(matches.slice(1));
            setLiveState(createInitialLiveState());
            setShowShuffler(false);
            setTeamsLocked(true);
            if(showToast)showToast(matches.length>1?`Locked in! ${matches.length-1} more match${matches.length-1===1?"":"es"} queued.`:"Teams locked in — enter the score.");
          }}
          onCancel={()=>setShowShuffler(false)}
        />
      )}

      {isFromOpenMatch && !isE && (
        <div className="ommfb">
          <div className="ommfb-text"><Icon name="users" size={14} color="var(--accent)"/>From open match — players locked</div>
          <button className="ommfb-undo" onClick={undoPrefill}>Undo</button>
        </div>
      )}
      {/* Players card (.tcard with .tinner — same as Schedule form). S076 FT-15: pair-aware in pairs seasons. */}
      <div className="tcard">
        <div className="tcardh">
          <div className="tcardtit">{teamsLocked ? (isPairsFormat ? "Pairs locked" : "Teams locked") : (isPairsFormat ? "Select pairs" : "Select players")}</div>
          {teamsLocked ? (!isFromOpenMatch && (
            <button className="shufbtn" onClick={()=>setTeamsLocked(false)}>
              <Icon name="edit" size={13}/>Edit {isPairsFormat?"pairs":"teams"}
            </button>
          )) : (!isE && !showShuffler && !isPairsFormat && (
            <button className="shufbtn" onClick={shuffleNow}>
              <Icon name="shuffle" size={13}/>Shuffle{queue.length>0?` · ${queue.length}`:''}
            </button>
          ))}
        </div>
        {teamsLocked ? (
          <div className="tlock">
            <div className="tlock-team a">
              <div className="tlock-h tlock-ha">{isPairsFormat?"Pair A":"Team A"}</div>
              {tA.filter(Boolean).map(pid=>(
                <div key={pid} className="tlock-p">
                  {getAvatar(pid)?<img className="tlock-avi" src={getAvatar(pid)} alt=""/>:<div className="tlock-avi tlock-ph">{(playerName(pid)||"?").charAt(0).toUpperCase()}</div>}
                  <span className="tlock-nm">{playerName(pid)}</span>
                </div>
              ))}
            </div>
            <div className="tlock-vs">VS</div>
            <div className="tlock-team b">
              <div className="tlock-h tlock-hb">{isPairsFormat?"Pair B":"Team B"}</div>
              {tB.filter(Boolean).map(pid=>(
                <div key={pid} className="tlock-p">
                  {getAvatar(pid)?<img className="tlock-avi" src={getAvatar(pid)} alt=""/>:<div className="tlock-avi tlock-ph">{(playerName(pid)||"?").charAt(0).toUpperCase()}</div>}
                  <span className="tlock-nm">{playerName(pid)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : isPairsFormat ? (
          <div className="tinner">
            <div>
              <div className="tcolh">
                <div className="tcoldot tcolha"/>
                <div className="tcollbl tcollbla">Pair A</div>
              </div>
              <div className="pslot">
                <select
                  className={`psel af${selectedPairA?' fi':''}`}
                  value={selectedPairA}
                  onChange={e=>setSelectedPairA(e.target.value)} disabled={isFromOpenMatch}>
                  <option value="">— Pick a pair —</option>
                  {seasonPairs.filter(pr => pr.id !== selectedPairB).map(pr => (
                    <option key={pr.id} value={pr.id}>{pairLabel(pr)}</option>
                  ))}
                </select>
                <div className="pselch"><Icon name="chevron" size={13} color="rgba(74,222,128,.45)"/></div>
              </div>
            </div>
            <div className="tcolvs">VS</div>
            <div>
              <div className="tcolh" style={{justifyContent:"flex-end"}}>
                <div className="tcollbl tcollblb">Pair B</div>
                <div className="tcoldot tcolhb"/>
              </div>
              <div className="pslot">
                <select
                  className={`psel bf${selectedPairB?' fi':''}`}
                  value={selectedPairB}
                  onChange={e=>setSelectedPairB(e.target.value)} disabled={isFromOpenMatch}>
                  <option value="">— Pick a pair —</option>
                  {seasonPairs.filter(pr => pr.id !== selectedPairA).map(pr => (
                    <option key={pr.id} value={pr.id}>{pairLabel(pr)}</option>
                  ))}
                </select>
                <div className="pselch"><Icon name="chevron" size={13} color="rgba(255, 215, 0,.45)"/></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="tinner">
            <div>
              <div className="tcolh">
                <div className="tcoldot tcolha"/>
                <div className="tcollbl tcollbla">Team A</div>
              </div>
              {tA.map((pid,i)=>(
                <div key={i} className="pslot">
                  <select
                    className={`psel af${pid?' fi':''}`}
                    value={pid}
                    onChange={e=>{const t=[...tA];t[i]=e.target.value;setTA(t);}} disabled={isFromOpenMatch}>
                    <option value="">Player {i+1}</option>
                    {avail(pid).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
                  </select>
                  <div className="pselch"><Icon name="chevron" size={13} color="rgba(74,222,128,.45)"/></div>
                </div>
              ))}
            </div>
            <div className="tcolvs">VS</div>
            <div>
              <div className="tcolh" style={{justifyContent:"flex-end"}}>
                <div className="tcollbl tcollblb">Team B</div>
                <div className="tcoldot tcolhb"/>
              </div>
              {tB.map((pid,i)=>(
                <div key={i} className="pslot">
                  <select
                    className={`psel bf${pid?' fi':''}`}
                    value={pid}
                    onChange={e=>{const t=[...tB];t[i]=e.target.value;setTB(t);}} disabled={isFromOpenMatch}>
                    <option value="">Player {i+1}</option>
                    {avail(pid).map(p=><option key={p.id} value={p.id}>{p.nickname||p.name}</option>)}
                  </select>
                  <div className="pselch"><Icon name="chevron" size={13} color="rgba(255, 215, 0,.45)"/></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!teamsLocked && allFilled && !isFromOpenMatch && (
          <div style={{padding:"0 14px 14px",display:"flex",justifyContent:"center"}}>
            {/* S091 (#127.2): tick removed + button sized to its text (was full-width/stretched). */}
            <button className="acceptbtn" onClick={()=>setTeamsLocked(true)}>
              Accept &amp; use
            </button>
          </div>
        )}
        {isPairsFormat && seasonPairs.length < 2 && (
          <div className="sm-empty" style={{marginTop:8,fontSize:12}}>
            Register at least 2 pairs in Season Management before logging matches.
          </div>
        )}
      </div>

      {/* Score card — Manual mode */}
      {teamsLocked && mode==='manual' && (
        <div className="sccard">
          <div className="sccardh">
            <div className="sccardhT">Score</div>
            <div className="stog">
              {(isCasual?[1,2,3,4,5]:[2,3]).map(n=>(
                <button key={n} className={`stogbtn${ns===n?' on':''}`} onClick={()=>setNs(n)}>{n} sets</button>
              ))}
            </div>
          </div>
          <div className="sctbody">
            {Array.from({length:ns}).map((_,i)=>{
              const s=sets[i]||[0,0];
              const inv=invalidIdx.includes(i);
              const setVal=(idx,val)=>{
                const x=sets.map(y=>[...y]);
                while(x.length<=i)x.push([0,0]);
                x[i]=idx===0?[val,x[i][1]]:[x[i][0],val];
                setSets(x);
                if(invalidIdx.length)setInvalidIdx([]);
                if(validationError)setValidationError("");
              };
              return (
                <div key={i} className="scrow">
                  <div className="scrowl">S{i+1}</div>
                  <div className={`cstep a${inv?' invalid':''}`}>
                    <button className="csbtn" aria-label={`Decrease team A score, set ${i+1}`} onClick={()=>setVal(0,Math.max(0,s[0]-1))}><Icon name="minus" size={14} strokeWidth={2.5} color="var(--accent)"/></button>
                    <div className="csval">{s[0]}</div>
                    <button className="csbtn" aria-label={`Increase team A score, set ${i+1}`} onClick={()=>setVal(0,Math.min(isCasual?99:9,s[0]+1))}><Icon name="plus" size={14} strokeWidth={2.5} color="var(--accent)"/></button>
                  </div>
                  <div className="scrows">—</div>
                  <div className={`cstep b${inv?' invalid':''}`}>
                    <button className="csbtn" aria-label={`Decrease team B score, set ${i+1}`} onClick={()=>setVal(1,Math.max(0,s[1]-1))}><Icon name="minus" size={14} strokeWidth={2.5} color="var(--gold)"/></button>
                    <div className="csval">{s[1]}</div>
                    <button className="csbtn" aria-label={`Increase team B score, set ${i+1}`} onClick={()=>setVal(1,Math.min(isCasual?99:9,s[1]+1))}><Icon name="plus" size={14} strokeWidth={2.5} color="var(--gold)"/></button>
                  </div>
                </div>
              );
            })}
            {validationError && (
              <div className="lmerr"><Icon name="alert" size={12}/> {validationError}</div>
            )}
          </div>
          {hasResult && (
            <div className="scrrow">
              <div className="scrteam a">{formatTeam(playerName(tA[0]),playerName(tA[1]))||"Team A"}</div>
              <div className="scrscore a">{aWins}</div>
              <div className="scrdash">—</div>
              <div className="scrscore b">{bWins}</div>
              <div className="scrteam b">{formatTeam(playerName(tB[0]),playerName(tB[1]))||"Team B"}</div>
            </div>
          )}
        </div>
      )}

      {/* Score card — LIVE mode */}
      {teamsLocked && mode==='live' && !showShuffler && (
        <div className="sccard">
          <div className="sccardh">
            <div className="sccardhT" style={{display:"flex",alignItems:"center",gap:6}}>
              <div className="livedot"/> LIVE Score
            </div>
            <div className="stog">
              {(isCasual?[1,2,3,4,5]:[2,3]).map(n=>(
                <button key={n} className={`stogbtn${liveNs===n?' on':''}`} onClick={()=>setLiveNs(n)}>{n} sets</button>
              ))}
            </div>
          </div>
          <div className="livebi">
            <div className="liveh">
              <div className="livetn a">{teamAlbl}</div>
              <div className="livevsp">VS</div>
              <div className="livetn b">{teamBlbl}</div>
            </div>
            <div className="liverws">
              <div className="liverow">
                <div className="livenum a">{sA}</div>
                <div className="liverl">SETS</div>
                <div className="livenum b">{sB}</div>
              </div>
              <div className="liverow">
                <div className="livenum a" style={{fontSize:22,color:"#9090a4"}}>{inTiebreak?tbA:gA}</div>
                <div className="liverl">{inTiebreak?"TB":"GAMES"}</div>
                <div className="livenum b" style={{fontSize:22,color:"#9090a4"}}>{inTiebreak?tbB:gB}</div>
              </div>
              {!matchOver && (
                <div className="liverow">
                  <div className="livenum a" style={{fontSize:22,color:isDeuce?"var(--gold)":(ptA==='Ad'?"var(--accent)":"var(--text)")}}>{isDeuce?'—':ptA}</div>
                  <div className="liverl" style={{color:isDeuce?"var(--gold)":undefined}}>{isDeuce?'DEUCE':'PTS'}</div>
                  <div className="livenum b" style={{fontSize:22,color:isDeuce?"var(--gold)":(ptB==='Ad'?"var(--gold)":"var(--text)")}}>{isDeuce?'—':ptB}</div>
                </div>
              )}
            </div>
            {!matchOver && (
              <div className="liveacs">
                <button className="acbtn a" onClick={()=>setLiveState(s=>scorePoint(s,'A',liveNs))}>
                  <div className="acval">+1</div>
                  <div className="aclbl">{teamAlbl}</div>
                </button>
                <button className="acbtn b" onClick={()=>setLiveState(s=>scorePoint(s,'B',liveNs))}>
                  <div className="acval">+1</div>
                  <div className="aclbl">{teamBlbl}</div>
                </button>
              </div>
            )}
            {matchOver && (() => {
              const tied = sA===sB;
              const winnerIsA = sA>sB;
              const winSets = tied?sA:(winnerIsA?sA:sB);
              const loseSets = tied?sB:(winnerIsA?sB:sA);
              return (
                <div style={{background:"var(--accent-dim)",border:"1px solid var(--accent-glow)",borderRadius:"var(--r-md)",padding:"12px 14px",textAlign:"center",marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--accent)",marginBottom:6,fontFamily:"var(--font)"}}>
                    {tied?`${teamAlbl} vs ${teamBlbl}`:`${winnerIsA?teamAlbl:teamBlbl} — Winners`}
                  </div>
                  <div style={{fontFamily:"var(--mono)",fontWeight:800,fontSize:18,color:"var(--text)"}}>{tied?`${sA} – ${sB}`:`${winSets} – ${loseSets}`}</div>
                </div>
              );
            })()}
            {(liveHistory.length>0||matchOver) && (
              <div className="livectrls">
                {liveHistory.length>0 && (
                  <button className="undobtn" onClick={()=>setLiveState(undoPoint)}>
                    <Icon name="undo" size={12}/>Undo last point
                  </button>
                )}
                <button className="resetbtn" onClick={()=>setLiveState(createInitialLiveState())}>Reset</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOTM card */}
      {teamsLocked && (
      <div className="mvpcard">
        <div className="mvpiw"><Icon name="star" size={18} color="var(--gold)"/></div>
        <div className="mvpsw">
          <div className="mvplbl">Man of the Match</div>
          <select className="mvpsel" value={motm} onChange={e=>setMotm(e.target.value)}>
            <option value="">— Select MOTM</option>
            {[...tA,...tB].filter(Boolean).map(pid=>(
              <option key={pid} value={pid}>{playerName(pid)}</option>
            ))}
          </select>
          <div className="mvpch"><Icon name="chevron" size={14}/></div>
        </div>
      </div>
      )}

      {/* Save */}
      {teamsLocked && (
      <div>
        {/* S091 (#127): tick removed; in edit mode Cancel sits next to Update Match. */}
        {isE ? (
          <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:8}}>
            <button onClick={submit} disabled={saving||!canSave} className={`savebtn lp${canSave&&!saving?' on':' off'}`}>
              {saving?"Saving…":"Update Match"}
            </button>
            <button onClick={cancel} className="shcancel">Cancel</button>
          </div>
        ) : (
          <button onClick={submit} disabled={saving||!canSave} className={`savebtn lp${canSave&&!saving?' on':' off'}`}>
            {saving?"Saving…":"Save Match"}
          </button>
        )}
        {!canSave && saveHint && <div className="savehint">{saveHint}</div>}
      </div>
      )}
    </div>
  );
}
