import React, { useState } from "react";
import { supabase } from '../supabase';
import { CountrySelect } from './CountrySelect';
import { PadelHubMarkHeader } from "./icons";
import Icon from './Icon';

// S066 Phase 11 / S082: 2-step onboarding wizard for new users.
// Shown by LeagueGate when the authenticated user has 0 league memberships.
// Step 1: Full player profile (display name, country, DOB, gender, handedness,
//         court position) — each field captured exactly once (S082 de-dup of
//         the old step1/step2 which both asked for name + country).
// Step 2: Join existing league via invite code, OR create a new league.
//
// On step 2 submit:
//   - "Create new league" path: createLeague({ autoSeason:false }) then insert
//     player row with all profile data + user_id (user becomes owner+claimed in
//     one go). autoSeason:false (S082) — the new owner creates the first season
//     (and chooses its ruleset) deliberately instead of getting a default FIP
//     "Season 1".
//   - "Join via invite code" path: create_join_request only. Player claim
//     happens post-approval.
//
// Player creation is skipped for join-via-code because RLS on players insert
// requires admin role; joined users start as members. Creator gets full insert.
export function OnboardingScreen({ user, handlers, onComplete, showToast }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.user_metadata?.display_name || user?.email?.split("@")[0] || "");
  const [country, setCountry] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [side, setSide] = useState("");
  const [handedness, setHandedness] = useState("");
  const [code, setCode] = useState("");
  const [lgName, setLgName] = useState("");
  const [attempted, setAttempt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState(null); // 'join' | 'create'

  // S082: the single profile step now gates on the full field set.
  const canStep1 = name.trim().length >= 2 && country && dob && gender && side && (handedness === "left" || handedness === "right");
  const canStep2 = code.trim().length > 0 || lgName.trim().length > 0;

  const today = new Date().toISOString().split("T")[0];

  // S068 Issue #46: invite-code submit creates a join_request (pending) instead of
  // immediately joining. Admin must approve before user gets league access. Owner-creates-
  // new-league path still bypasses the queue (creator IS the admin — see handleCreate).
  const handleJoin = async () => {
    if (!code.trim() || busy) return;
    setBusy(true); setBusyAction('join');
    try {
      // 1. Look up league by invite code via the existing SECURITY DEFINER RPC.
      // Direct .from("leagues") would fail because non-members can't read the
      // leagues table under current RLS. lookup_league_by_invite bypasses that.
      // Code stored as-mixed-case in DB; preserve the user's input casing.
      const { data: rpcData, error: lgErr } = await supabase
        .rpc("lookup_league_by_invite", { code: code.trim() });
      const lg = rpcData?.[0] || null;
      if (lgErr || !lg) throw new Error("Invalid invite code");

      // 2. Submit a new_profile join request. The data captured in step 1 becomes the
      //    snapshot the admin reviews. Claim-during-onboarding (picking an unclaimed
      //    player at this point) is a follow-up; for now requests are always new_profile.
      const { error: rqErr } = await supabase.rpc("create_join_request", {
        p_league_id: lg.id,
        p_type: "new_profile",
        p_player_id: null,
        p_display_name: name.trim(),
        p_country: country || null,
        p_dob: dob || null,
        p_gender: gender || null,
        p_position: side || null,
        p_handedness: handedness || null,
      });
      if (rqErr) throw rqErr;

      if (showToast) showToast(`Request sent to ${lg.name}. Waiting for admin approval.`);
      // LeagueGate will detect the new pending request on next render via loadLeagueData
      // and route to PendingApprovalScreen.
      if (onComplete) onComplete();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[OnboardingScreen] join request failed:", err);
      if (showToast) showToast(err.message || "Failed to submit request", "error");
    }
    setBusy(false); setBusyAction(null);
  };

  const handleCreate = async () => {
    if (!lgName.trim() || busy) return;
    setBusy(true); setBusyAction('create');
    try {
      // S082: autoSeason:false — do NOT auto-create a default FIP "Season 1".
      // The new owner creates their first season (and picks its ruleset, e.g.
      // Casual) deliberately from the Seasons screen.
      const newLeague = await handlers.createLeague({ name: lgName.trim(), autoSeason: false });
      // Create the user's own player record in the new league with all profile data.
      // RLS allows owners to insert players in their own leagues.
      const { error: playerErr } = await supabase
        .from("players")
        .insert({
          league_id: newLeague.id,
          name: name.trim(),
          country: country || null,
          gender: gender || null,
          playing_position: (side === 'left' || side === 'right') ? side : null,
          handedness: (handedness === 'left' || handedness === 'right') ? handedness : null,
          date_of_birth: dob || null,
          user_id: user.id,
          created_by: user.id,
        });
      if (playerErr) {
        // Non-fatal — league exists, user can edit profile later. Log only.
        console.warn("Player auto-create failed:", playerErr.message);
      }
      if (showToast) showToast(`League "${lgName.trim()}" created!`);
      if (onComplete) onComplete();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to create league", "error");
    }
    setBusy(false); setBusyAction(null);
  };

  return (
    <div className="oscreen">
      <div className="obg"/>
      <div className="otop">
        <div className="logo">
          <div className="lm"><PadelHubMarkHeader size={20}/></div>
          <div className="lt">Padel<span style={{color:"var(--accent)"}}>Hub</span></div>
        </div>
      </div>

      <div className="obody">
        {/* S082: back button now matches the app-wide top-left chevron convention
            (.back-btn-row / .back-btn) instead of the old top-right .bbtn pill. */}
        {step > 1 && (
          <div className="back-btn-row">
            <button className="back-btn" onClick={()=>setStep(step-1)} aria-label="Back">
              <Icon name="chevron-left" size={18} color="currentColor"/>
            </button>
          </div>
        )}

        <div className="pdots">
          {[1,2].map(n=><div key={n} className={`dot ${step===n?"on":step>n?"dn":""}`}/>)}
        </div>

        {step === 1 && (
          <>
            <div className="oey">Step 1 of 2</div>
            <div className="oth1">Your profile</div>
            <div className="osub">All fields are required before you can join.</div>

            {/* Photo placeholder (visual only — actual upload deferred per Phase 11 Q3) */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:18}}>
              <div style={{width:80,height:80,borderRadius:"50%",background:"var(--surface)",border:"2px dashed var(--border)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,color:"#9090a4",cursor:"default"}}>
                <Icon name="camera" size={20}/>
                <div style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".04em"}}>Tap to add</div>
              </div>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"#9090a4"}}>Skip for now</div>
            </div>

            {/* Display Name */}
            <div className="fgrp">
              <div className="fl2"><Icon name="user" size={12}/>Display Name<span className="req">*</span></div>
              <input className="fi2" placeholder="How you appear on the leaderboard" value={name} onChange={e=>setName(e.target.value)} maxLength={40}/>
              {attempted && name.trim().length<2 && <div className="ferr">Min 2 characters required</div>}
            </div>

            {/* Country */}
            <div className="fgrp">
              <div className="fl2"><Icon name="globe" size={12}/>Country<span className="req">*</span></div>
              <CountrySelect value={country} onChange={setCountry}/>
              {attempted && !country && <div className="ferr">Country is required</div>}
            </div>

            {/* DOB */}
            <div className="fgrp">
              <div className="fl2"><Icon name="calendar" size={12}/>Date of Birth<span className="req">*</span></div>
              <input className="fi2" type="date" value={dob} max={today} onChange={e=>setDob(e.target.value)} style={{colorScheme:"dark"}}/>
              {attempted && !dob && <div className="ferr">Date of birth is required</div>}
            </div>

            {/* Gender — blue/pink active per Phase 8 */}
            <div className="fgrp">
              <div className="fl2"><Icon name="male" size={12}/>Gender<span className="req">*</span></div>
              <div className="gtog">
                <button className={`gbtn2 gm${gender==="male"?" on":""}`} onClick={()=>setGender("male")}>
                  <Icon name="male" size={16} color={gender==="male"?"#60a5fa":"#9090a4"}/>Male
                </button>
                <button className={`gbtn2 gf${gender==="female"?" on":""}`} onClick={()=>setGender("female")}>
                  <Icon name="female" size={16} color={gender==="female"?"#f472b6":"#9090a4"}/>Female
                </button>
              </div>
              {attempted && !gender && <div className="ferr">Please select your gender</div>}
            </div>

            {/* S081: Handedness — left/right hand (matches Edit Profile). */}
            <div className="fgrp">
              <div className="fl2"><Icon name="user" size={12}/>Handedness<span className="req">*</span></div>
              <div className="gtog">
                <button className={`gbtn2${handedness==="left"?" on":""}`} onClick={()=>setHandedness("left")}>
                  <Icon name="user" size={16} color={handedness==="left"?"var(--accent)":"#9090a4"}/>Left Hand
                </button>
                <button className={`gbtn2${handedness==="right"?" on":""}`} onClick={()=>setHandedness("right")}>
                  <Icon name="user" size={16} color={handedness==="right"?"var(--accent)":"#9090a4"}/>Right Hand
                </button>
              </div>
              {attempted && !(handedness==="left"||handedness==="right") && <div className="ferr">Handedness is required</div>}
            </div>

            {/* S070 Issue #83: renamed "Playing Side" → "Court Position". */}
            <div className="fgrp">
              <div className="fl2"><Icon name="court-l" size={12}/>Court Position<span className="req">*</span></div>
              <div className="stog2">
                {[
                  {v:"left",  l:"Left Side",  i:"court-l"},
                  {v:"right", l:"Right Side", i:"court-r"},
                  {v:"any",   l:"Any",        i:"court-any"},
                ].map(opt=>(
                  <button key={opt.v} className={`ssbtn2${side===opt.v?" on":""}`} onClick={()=>setSide(opt.v)}>
                    <Icon name={opt.i} size={20} color={side===opt.v?"#000":"#9090a4"}/>
                    {opt.l}
                  </button>
                ))}
              </div>
              {attempted && !side && <div className="ferr">Court position is required</div>}
            </div>

            <button className={`octa${canStep1?'':' off'}`} onClick={()=>{setAttempt(true); if(canStep1) setStep(2);}}>
              Continue <Icon name="arrow-right" size={16} color={canStep1?"#000":"#9090a4"} strokeWidth={2}/>
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="oey">Step 2 of 2</div>
            <div className="oth1">Find your league</div>
            <div className="osub">Join with an invite code or start a new league.</div>

            <div className="ocard">
              <div className="ocard-lbl"><Icon name="hash" size={11}/> Join with invite code</div>
              <div className="lrow">
                <input className="linput" placeholder="e.g. PADEL-7X2K" value={code} onChange={e=>{setCode(e.target.value); if(e.target.value) setLgName("");}}/>
                <button className="lacbtn" disabled={!code.trim()||busy} onClick={handleJoin}>
                  {busy && busyAction==='join' ? "…" : "Join"}
                </button>
              </div>
            </div>

            <div className="ocard">
              <div className="ocard-lbl"><Icon name="plus" size={11}/> Create a new league</div>
              <div className="lrow">
                <input className="linput" placeholder="League name" value={lgName} onChange={e=>{setLgName(e.target.value); if(e.target.value) setCode("");}}/>
                <button className="lacbtn" disabled={!lgName.trim()||busy} onClick={handleCreate}>
                  {busy && busyAction==='create' ? "…" : "Create"}
                </button>
              </div>
            </div>

            <div className="osub" style={{textAlign:"center",marginTop:8,fontSize:11}}>
              Choose one option above to continue.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
