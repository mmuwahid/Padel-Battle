import React, { useState } from "react";
import { useLeague } from "../LeagueContext";
import { CountrySelect } from "./CountrySelect";
import { gradeColor, GRADE_META } from "../utils/grade";
import Icon from "./Icon";

// S050: User self-edit modal for the player record they've claimed.
// S066 Phase 12: full restyle to match Onboarding step 2 + DOB capture +
// mandatory-field validation. All 5 profile fields (name, DOB, country,
// gender, playing-side) are required. Nickname remains optional.
// Backed by RLS policy `players_update_self` (user_id = auth.uid()).
export function EditMyProfile({ player, onClose, onRetake }) {
  const { supabase, showToast, loadLeagueData } = useLeague();

  const [name, setName] = useState(player.name || "");
  const [country, setCountry] = useState(player.country || "");
  const [position, setPosition] = useState(player.playing_position || "");
  const [gender, setGender] = useState(player.gender || "");
  const [dob, setDob] = useState(player.date_of_birth || "");
  // S070 Issue #83: handedness (left/right hand) — separate from court position.
  const [handedness, setHandedness] = useState(player.handedness || "");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempt] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const trimmedName = (name || "").trim();
  const nameOk = trimmedName.length >= 2;
  const dobOk = !!dob;
  const countryOk = !!country;
  const genderOk = gender === "male" || gender === "female";
  const handednessOk = handedness === "left" || handedness === "right";
  const sideOk = position === "left" || position === "right" || position === "any";
  const canSave = nameOk && dobOk && countryOk && genderOk && handednessOk && sideOk;

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
          handedness,
        })
        .eq("id", player.id);
      if (error) {
        // S067 diagnostic: surface the underlying DB error so we can debug
        // the "first save fails, second succeeds" bug. Toast shows the real
        // error code/message instead of a generic "Failed to save".
        if (import.meta.env.DEV) console.error("[EditMyProfile] update error:", error);
        throw error;
      }
      // Issue #110: propagate identity fields to all my other leagues.
      await supabase.rpc("sync_player_identity",{p_player_id:player.id}).catch(e => { if (import.meta.env.DEV) console.warn("[EditMyProfile] profile sync:",e); });
      showToast("Profile updated");
      onClose();
      // Refresh in the background — don't block UX or surface refresh errors
      // as save failures (the supabase update has already succeeded).
      loadLeagueData().catch(e => { if (import.meta.env.DEV) console.warn("[EditMyProfile] refresh after save:", e); });
    } catch (err) {
      if (import.meta.env.DEV) console.error("[EditMyProfile] save catch:", err);
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

        {/* S070 Issue #83: Handedness — left/right hand of the player.
            Rendered ABOVE Court Position per spec; distinct concept (the hand
            you hold the racket with vs. which side of the court you play). */}
        <div className="fgrp">
          <div className="fl2"><Icon name="user" size={12}/>Handedness<span className="req">*</span></div>
          <div className="gtog">
            {/* S089 #114: when selected the pill bg is accent-green, so the icon
                must be #000 (not var(--accent)) or it vanished into the bg. The 45°
                tilt is baked into the hand-left/hand-right icons in Icon.jsx so it's
                consistent everywhere they appear. */}
            <button className={`gbtn2${handedness==="left"?" on":""}`} onClick={()=>setHandedness("left")}>
              <Icon name="hand-left" size={16} color={handedness==="left"?"#000":"#9090a4"}/>Left Hand
            </button>
            <button className={`gbtn2${handedness==="right"?" on":""}`} onClick={()=>setHandedness("right")}>
              <Icon name="hand-right" size={16} color={handedness==="right"?"#000":"#9090a4"}/>Right Hand
            </button>
          </div>
          {attempted && !handednessOk && <div className="ferr">Handedness is required</div>}
        </div>

        {/* S070 Issue #83: renamed "Playing Side" → "Court Position" — clearer label
            for which side of the court the player covers. */}
        <div className="fgrp" style={{marginBottom:18}}>
          <div className="fl2"><Icon name="court-l" size={12}/>Court Position<span className="req">*</span></div>
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
          {attempted && !sideOk && <div className="ferr">Court position is required</div>}
        </div>

        {/* FT-17: Skill grade — read-only here; set via the self-assessment. */}
        <div className="fgrp" style={{marginBottom:18}}>
          <div className="fl2"><Icon name="star" size={12}/>Your Grade</div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10}}>
            {player.grade ? (
              <>
                <span style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:800,color:gradeColor(player.grade)}}>{player.grade}</span>
                <span style={{fontSize:12,color:"#9090a4"}}>{GRADE_META[player.grade]?.label}</span>
              </>
            ) : (
              <span style={{fontFamily:"var(--mono)",fontSize:11,color:"#9090a4"}}>Not yet assessed</span>
            )}
            <button type="button" onClick={()=>{onClose();onRetake&&onRetake();}} style={{marginLeft:"auto",display:"inline-flex",alignItems:"center",gap:5,padding:"7px 11px",background:"transparent",border:"1px solid var(--accent)",borderRadius:8,color:"var(--accent)",fontFamily:"var(--font)",fontSize:11,fontWeight:700,cursor:"pointer"}}>
              <Icon name="star" size={12} color="var(--accent)"/>{player.grade?"Retake":"Take assessment"}
            </button>
          </div>
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
