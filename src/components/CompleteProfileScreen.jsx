import React, { useState } from "react";
import { CountrySelect } from "./CountrySelect";
import { PadelHubMarkHeader } from "./icons";
import Icon from "./Icon";

// S100 #151: blocking profile-completion screen. Rendered by App.jsx when the
// user has a claimed player row but the profile is missing mandatory fields
// (isProfileComplete === false). This is the backstop that catches invited
// users who were approved with a name-only profile (and any approved-before-
// complete edge case) — they cannot reach the leaderboard until they finish.
// Same field set + validation as OnboardingScreen step 1 / EditMyProfile.
// Writes the player row directly (RLS players_update_self) then fans the
// identity fields out to the user's other leagues via sync_player_identity.
export function CompleteProfileScreen({ player, supabase, onDone, showToast, onSignOut }) {
  const [name, setName] = useState(player?.name || "");
  const [country, setCountry] = useState(player?.country || "");
  const [dob, setDob] = useState(player?.date_of_birth || "");
  const [gender, setGender] = useState(player?.gender || "");
  const [side, setSide] = useState(player?.playing_position || "");
  const [handedness, setHandedness] = useState(player?.handedness || "");
  const [attempted, setAttempt] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  // Match isProfileComplete's strict enum checks exactly — a legacy out-of-enum
  // DB value (e.g. gender "M") must NOT pass canSave, otherwise Save would write
  // it back, the gate would never clear, and the button would stay stuck.
  const canSave = name.trim().length >= 2
    && !!country
    && !!dob
    && (gender === "male" || gender === "female")
    && (side === "left" || side === "right" || side === "any")
    && (handedness === "left" || handedness === "right");

  const save = async () => {
    setAttempt(true);
    if (!canSave || saving) {
      if (!canSave) showToast && showToast("Please complete all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("players")
        .update({
          name: name.trim(),
          country,
          playing_position: side,
          gender,
          date_of_birth: dob,
          handedness,
        })
        .eq("id", player.id);
      if (error) throw error;
      // Issue #110: propagate identity fields to all my other leagues.
      supabase.rpc("sync_player_identity", { p_player_id: player.id }).then(undefined, e => { if (import.meta.env.DEV) console.warn("[CompleteProfile] sync:", e); });
      showToast && showToast("Profile complete — welcome aboard!");
      // Refresh league data → claimedPlayer becomes complete → gate clears
      // (this component unmounts). Safety net: if the refresh resolves but the
      // gate somehow doesn't clear, re-enable the button so the user isn't stuck
      // on a frozen "Saving…" with no retry.
      if (onDone) await onDone();
      setSaving(false);
    } catch (err) {
      if (import.meta.env.DEV) console.error("[CompleteProfile] save:", err);
      showToast && showToast(`${err?.message || "Failed to save"}${err?.code ? ` (${err.code})` : ""}`, "error");
      setSaving(false);
    }
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
        <div className="oey">Almost there</div>
        <div className="oth1">Complete your profile</div>
        <div className="osub">A few details are needed before you can view the leaderboard.</div>

        {/* Display Name */}
        <div className="fgrp">
          <div className="fl2"><Icon name="user" size={12}/>Display Name<span className="req">*</span></div>
          <input aria-label="Display name" className="fi2" value={name} onChange={e=>setName(e.target.value)} placeholder="How you appear on the leaderboard" maxLength={40}/>
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
          <input aria-label="Date of birth" className="fi2" type="date" value={dob} max={today} onChange={e=>setDob(e.target.value)} style={{colorScheme:"dark"}}/>
          {attempted && !dob && <div className="ferr">Date of birth is required</div>}
        </div>

        {/* Gender */}
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

        {/* Handedness */}
        <div className="fgrp">
          <div className="fl2"><Icon name="user" size={12}/>Handedness<span className="req">*</span></div>
          <div className="gtog">
            <button className={`gbtn2${handedness==="left"?" on":""}`} onClick={()=>setHandedness("left")}>
              <Icon name="hand-left" size={16} color={handedness==="left"?"#000":"#9090a4"}/>Left Hand
            </button>
            <button className={`gbtn2${handedness==="right"?" on":""}`} onClick={()=>setHandedness("right")}>
              <Icon name="hand-right" size={16} color={handedness==="right"?"#000":"#9090a4"}/>Right Hand
            </button>
          </div>
          {attempted && !(handedness==="left"||handedness==="right") && <div className="ferr">Handedness is required</div>}
        </div>

        {/* Court Position */}
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

        <button className={`octa${canSave?'':' off'}`} disabled={saving} onClick={save}>
          {saving ? "Saving…" : <>Save & Continue <Icon name="arrow-right" size={16} color={canSave?"#000":"#9090a4"} strokeWidth={2}/></>}
        </button>

        <button className="pend-signout" style={{marginTop:14}} onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
