import React, { useState } from "react";
import { supabase } from '../supabase';
import { CountrySelect } from './CountrySelect';
import { PadelLogoSmall } from './icons';
import Icon from './Icon';

// S066 Phase 11: 3-step onboarding wizard for new users.
// Shown by LeagueGate when the authenticated user has 0 league memberships.
// Step 1: Display name + country.
// Step 2: DOB + gender + playing-side (name + country pre-filled, editable).
// Step 3: Join existing league via invite code, OR create new league.
//
// On step 3 submit:
//   - "Create new league" path: createLeague() then insert player row with all
//     profile data + user_id (user becomes owner+claimed in one go).
//   - "Join via invite code" path: joinLeague() only. Player claim happens
//     post-join (admin creates player; user claims via existing flow).
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
  const [code, setCode] = useState("");
  const [lgName, setLgName] = useState("");
  const [attempted, setAttempt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState(null); // 'join' | 'create'

  const canStep1 = name.trim().length >= 2 && country;
  const canStep2 = canStep1 && dob && gender && side;
  const canStep3 = code.trim().length > 0 || lgName.trim().length > 0;

  const today = new Date().toISOString().split("T")[0];

  const handleJoin = async () => {
    if (!code.trim() || busy) return;
    setBusy(true); setBusyAction('join');
    try {
      await handlers.joinLeague(code.trim());
      if (showToast) showToast("Joined league! Ask the admin to claim your player profile.");
      if (onComplete) onComplete();
    } catch (err) {
      if (showToast) showToast(err.message || "Invalid invite code", "error");
    }
    setBusy(false); setBusyAction(null);
  };

  const handleCreate = async () => {
    if (!lgName.trim() || busy) return;
    setBusy(true); setBusyAction('create');
    try {
      const newLeague = await handlers.createLeague({ name: lgName.trim() });
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
          <div className="lm"><PadelLogoSmall size={20}/></div>
          <div className="lt">Padel<span style={{color:"var(--accent)"}}>Hub</span></div>
        </div>
        {step > 1 && (
          <button className="bbtn" onClick={()=>setStep(step-1)}>
            <Icon name="back" size={14}/> Back
          </button>
        )}
      </div>

      <div className="obody">
        <div className="pdots">
          {[1,2,3].map(n=><div key={n} className={`dot ${step===n?"on":step>n?"dn":""}`}/>)}
        </div>

        {step === 1 && (
          <>
            <div className="oey">Step 1 of 3</div>
            <div className="oth1">Who are you?</div>
            <div className="osub">Set up your player profile.</div>

            <div className="ocard">
              <div className="ocard-lbl">New profile</div>

              <div className="fgrp">
                <div className="fl2"><Icon name="players" size={12}/>Display Name<span className="req">*</span></div>
                <input className="fi2" placeholder="How you appear on the leaderboard" value={name} onChange={e=>setName(e.target.value)} maxLength={40}/>
              </div>

              <div className="fgrp" style={{marginBottom:0}}>
                <div className="fl2"><Icon name="globe" size={12}/>Country<span className="req">*</span></div>
                <CountrySelect value={country} onChange={setCountry}/>
              </div>
            </div>

            <button className={`octa${canStep1?'':' off'}`} disabled={!canStep1} onClick={()=>setStep(2)}>
              Continue <Icon name="arrow-right" size={16} color={canStep1?"#000":"#9090a4"} strokeWidth={2}/>
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="oey">Step 2 of 3</div>
            <div className="oth1">Complete your profile</div>
            <div className="osub">All fields are required before you can join.</div>

            {/* DOB */}
            <div className="fgrp">
              <div className="fl2"><Icon name="calendar" size={12}/>Date of Birth<span className="req">*</span></div>
              <input className="fi2" type="date" value={dob} max={today} onChange={e=>setDob(e.target.value)} style={{colorScheme:"dark"}}/>
              {attempted && !dob && <div className="ferr">Date of birth is required</div>}
            </div>

            {/* Gender — same blue/pink semantic as Phase 8 */}
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

            {/* Playing Side — Left / Right / Any */}
            <div className="fgrp">
              <div className="fl2"><Icon name="court-l" size={12}/>Playing Side<span className="req">*</span></div>
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
              {attempted && !side && <div className="ferr">Playing side is required</div>}
            </div>

            <button className={`octa${canStep2?'':' off'}`} onClick={()=>{setAttempt(true); if(canStep2) setStep(3);}}>
              Continue <Icon name="arrow-right" size={16} color={canStep2?"#000":"#9090a4"} strokeWidth={2}/>
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="oey">Step 3 of 3</div>
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
