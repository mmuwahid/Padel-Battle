import React, { useState } from "react";
import { useLeague } from "../LeagueContext";
import { CountrySelect } from "./CountrySelect";
import Icon from "./Icon";

// S050: User self-edit modal for the player record they've claimed.
// S066 Phase 12: full restyle to match Onboarding step 2 + DOB capture +
// mandatory-field validation. All 5 profile fields (name, DOB, country,
// gender, playing-side) are required. Nickname remains optional.
// Backed by RLS policy `players_update_self` (user_id = auth.uid()).
export function EditMyProfile({ player, onClose }) {
  const { supabase, showToast, loadLeagueData } = useLeague();

  const [name, setName] = useState(player.name || "");
  const [country, setCountry] = useState(player.country || "");
  const [position, setPosition] = useState(player.playing_position || "");
  const [gender, setGender] = useState(player.gender || "");
  const [dob, setDob] = useState(player.date_of_birth || "");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempt] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const trimmedName = (name || "").trim();
  const nameOk = trimmedName.length >= 2;
  const dobOk = !!dob;
  const countryOk = !!country;
  const genderOk = gender === "male" || gender === "female";
  const sideOk = position === "left" || position === "right" || position === "any";
  const canSave = nameOk && dobOk && countryOk && genderOk && sideOk;

  const save = async () => {
    setAttempt(true);
    if (!canSave) {
      showToast("Please complete all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("players")
        .update({
          name: trimmedName,
          country,
          playing_position: position,
          gender,
          date_of_birth: dob,
        })
        .eq("id", player.id);
      if (error) {
        // S067 diagnostic: surface the underlying DB error so we can debug
        // the "first save fails, second succeeds" bug. Toast shows the real
        // error code/message instead of a generic "Failed to save".
        // eslint-disable-next-line no-console
        console.error("[EditMyProfile] update error:", error);
        throw error;
      }
      showToast("Profile updated");
      onClose();
      // Refresh in the background — don't block UX or surface refresh errors
      // as save failures (the supabase update has already succeeded).
      loadLeagueData().catch(e => console.warn("[EditMyProfile] refresh after save:", e));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[EditMyProfile] save catch:", err);
      const msg = err?.message || err?.error_description || "Failed to save";
      showToast(`${msg}${err?.code ? ` (${err.code})` : ""}`, "error");
    }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={(e)=>e.stopPropagation()} style={{width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto",background:"var(--bg)",borderTopLeftRadius:24,borderTopRightRadius:24,padding:"16px 18px calc(20px + env(safe-area-inset-bottom, 0px))",fontFamily:"var(--font)",border:"1px solid var(--border)",borderBottom:"none"}}>
        <div style={{width:40,height:4,background:"var(--border)",borderRadius:2,margin:"0 auto 16px"}}/>
        <h3 style={{fontSize:18,fontWeight:900,textTransform:"uppercase",letterSpacing:".04em",color:"var(--text)",margin:"0 0 6px",textAlign:"center"}}>Edit My Profile</h3>
        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"#9090a4",marginBottom:14,display:"flex",alignItems:"center",gap:5,justifyContent:"center"}}>
          <span style={{color:"var(--danger)",fontWeight:700}}>*</span> All fields are required
        </div>

        {/* Display Name */}
        <div className="fgrp">
          <div className="fl2"><Icon name="user" size={12}/>Display Name<span className="req">*</span></div>
          <input className="fi2" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="How you appear on the leaderboard" maxLength={40}/>
          {attempted && !nameOk && <div className="ferr">Min 2 characters required</div>}
        </div>

        {/* Date of Birth */}
        <div className="fgrp">
          <div className="fl2"><Icon name="calendar" size={12}/>Date of Birth<span className="req">*</span></div>
          <input className="fi2" type="date" value={dob} max={today} onChange={e=>setDob(e.target.value)} style={{colorScheme:"dark"}}/>
          {attempted && !dobOk && <div className="ferr">Date of birth is required</div>}
        </div>

        {/* Country */}
        <div className="fgrp">
          <div className="fl2"><Icon name="globe" size={12}/>Country<span className="req">*</span></div>
          <CountrySelect value={country} onChange={setCountry}/>
          {attempted && !countryOk && <div className="ferr">Country is required</div>}
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
          {attempted && !genderOk && <div className="ferr">Please select your gender</div>}
        </div>

        {/* Playing Side */}
        <div className="fgrp" style={{marginBottom:18}}>
          <div className="fl2"><Icon name="court-l" size={12}/>Playing Side<span className="req">*</span></div>
          <div className="stog2">
            {[
              { v: "left",  l: "Left Side",  i: "court-l" },
              { v: "right", l: "Right Side", i: "court-r" },
              { v: "any",   l: "Any",        i: "court-any" },
            ].map(({ v, l, i }) => (
              <button key={v} className={`ssbtn2${position===v?" on":""}`} onClick={()=>setPosition(v)}>
                <Icon name={i} size={20} color={position===v?"#000":"#9090a4"}/>
                {l}
              </button>
            ))}
          </div>
          {attempted && !sideOk && <div className="ferr">Playing side is required</div>}
        </div>

        {/* Actions */}
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} disabled={saving} className="shcancel" style={{flex:1,height:44}}>Cancel</button>
          <button onClick={save} disabled={saving} className={`savebtn${canSave?' on':' off'}`} style={{flex:1.4,padding:"12px 0",fontSize:13}}>
            {canSave && !saving && <Icon name="check" size={14} color="#000" strokeWidth={2.5}/>}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
