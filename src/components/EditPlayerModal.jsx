import React, { useState, useRef } from "react";
import Icon from "./Icon";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, BL } from "../theme";
import { flagEmoji } from "../utils/helpers";
import { useLeague } from "../LeagueContext";
import { CountrySelect } from "./CountrySelect";
import { AvatarCropModal } from "./AvatarCropModal";
import { GRADE_ORDER, GRADE_META, gradeColor } from "../utils/grade";
import { useFocusTrap } from "../hooks/useFocusTrap";

// S050: COUNTRIES moved to ./CountrySelect (full UN list, sorted by name,
// Israel excluded). EditPlayerModal renders <CountrySelect/> instead of a
// native <select>. flagEmoji helper handles the matching ISO3→ISO2 map in
// utils/helpers.js.

export function EditPlayerModal({ player, onClose, onSaved }) {
  const { supabase, showToast, loadLeagueData } = useLeague();
  const trapRef = useFocusTrap(true, onClose);

  const [name, setName] = useState(player.name || "");
  const [nickname, setNickname] = useState(player.nickname || "");
  const [country, setCountry] = useState(player.country || "");
  const [position, setPosition] = useState(player.playing_position || "");
  const [gender, setGender] = useState(player.gender || ""); // S066 Phase 8
  const [handedness, setHandedness] = useState(player.handedness || ""); // S070 Issue #83
  const [grade, setGrade] = useState(player.grade || ""); // FT-17 admin override
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  // S069: pending file → AvatarCropModal → cropped blob → uploadCroppedPhoto
  const [pendingFile, setPendingFile] = useState(null);

  const inp = { background: CD2, color: TX, border: `1px solid ${BD}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, width: "100%", outline: "none", fontWeight: 400, fontFamily: "var(--font)" };

  // S069: file pick now defers to AvatarCropModal — see pickPhoto. Once the
  // user crops, uploadCroppedPhoto receives a 200x200 JPEG blob and uploads.
  const pickPhoto = (file) => {
    if (!file) return;
    setPendingFile(file);
  };

  const uploadCroppedPhoto = async (blob) => {
    if (!blob) { setPendingFile(null); return; }
    setPendingFile(null);
    setUploading(true);
    try {
      const path = `players/${player.id}.jpg`;
      // S067 fix: iOS PWA storage upload intermittently fails on first try
      // (likely SW cold-start latency vs upload race). Single auto-retry after
      // 250ms makes the user-visible failure rate effectively zero. Replaces
      // the user's previous "tap upload twice" workaround.
      let upErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
        if (!error) { upErr = null; break; }
        upErr = error;
        if (import.meta.env.DEV) console.warn(`[EditPlayerModal] upload attempt ${attempt + 1} failed:`, error?.message || error);
        if (attempt === 0) await new Promise(r => setTimeout(r, 250));
      }
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = publicUrl + "?t=" + Date.now();
      setAvatarUrl(url);
      showToast("Photo uploaded — tap Save to apply");
    } catch (err) {
      showToast(err.message || "Failed to upload photo", "error");
    }
    setUploading(false);
  };

  const removePhoto = async () => {
    setUploading(true);
    try {
      await supabase.storage.from("avatars").remove([`players/${player.id}.jpg`]);
      setAvatarUrl(null);
      showToast("Photo removed — tap Save to apply");
    } catch (_err) {
      showToast("Failed to remove photo", "error");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast("Name is required", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        nickname: nickname.trim() || null,
        country: country || null,
        playing_position: position || null,
        gender: gender || null,
        handedness: handedness || null,
        avatar_url: avatarUrl || null,
      };
      // FT-17: only touch grade fields when the admin actually changed the tier,
      // so an untouched self-set grade keeps its grade_source='self'.
      if ((grade || "") !== (player.grade || "")) {
        payload.grade = grade || null;
        payload.grade_source = grade ? "admin" : null;
      }
      const { error } = await supabase.from("players")
        .update(payload)
        .eq("id", player.id);
      if (error) throw error;
      // Issue #110: propagate identity to the player's other leagues (grade override stays local).
      supabase.rpc("sync_player_identity",{p_player_id:player.id}).then(undefined, e => { if (import.meta.env.DEV) console.warn("[EditPlayerModal] identity sync:",e); });
      showToast("Player updated");
      loadLeagueData(); // C1: background refresh, UI unblocks immediately
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to save", "error");
    }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div ref={trapRef} role="dialog" aria-modal="true" aria-label="Edit Player" tabIndex={-1} onClick={e => e.stopPropagation()} style={{ background: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", padding: "20px 16px calc(24px + env(safe-area-inset-bottom, 0px))", border: `1px solid ${BD}`, borderBottom: "none" }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: BD, borderRadius: 2, margin: "0 auto 16px" }} />

        {/* Title */}
        <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 18px", textAlign: "center" }}>Edit Player</h2>

        {/* Photo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
          <div style={{ position: "relative", width: 96, height: 96, borderRadius: "50%", overflow: "hidden", background: `linear-gradient(135deg, ${A}25, ${A}08)`, border: `2px solid ${A}50`, display: "flex", alignItems: "center", justifyContent: "center", color: A, fontSize: 36, fontWeight: 800 }}>
            {avatarUrl ? <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (name[0] || "?").toUpperCase()}
            {uploading && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: TX }}>...</div>}
          </div>
          {/* S067: dropped capture="environment" — that attr forced iOS to open the rear camera and skip the gallery. Without it, iOS shows the standard sheet (Photo Library / Take Photo / Choose File). */}
          <input aria-label="Upload photo" ref={fileRef} type="file" accept="image/*" onChange={e => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: `${A}15`, border: `1px solid ${A}`, borderRadius: 8, color: A, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)", opacity: uploading ? 0.5 : 1 }}><Icon name="camera" size={14} color={A} />{avatarUrl ? "Edit Photo" : "Upload Photo"}</button>
            {avatarUrl && <button onClick={removePhoto} disabled={uploading} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: `1px solid ${DG}`, borderRadius: 8, color: DG, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)", opacity: uploading ? 0.5 : 1 }}>Delete</button>}
          </div>
        </div>

        {/* Name */}
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Name *</label>
        <input aria-label="Name" value={name} onChange={e => setName(e.target.value)} style={{ ...inp, marginBottom: 12 }} placeholder="Full name" />

        {/* Nickname */}
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Nickname</label>
        <input aria-label="Nickname" value={nickname} onChange={e => setNickname(e.target.value)} style={{ ...inp, marginBottom: 12 }} placeholder="Optional" />

        {/* Country */}
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Country {country && <span className="flag" style={{ fontSize: 14, marginLeft: 4 }}>{flagEmoji(country)}</span>}</label>
        <div style={{ marginBottom: 12 }}>
          <CountrySelect value={country} onChange={setCountry}/>
        </div>

        {/* S067: Gender + Playing-side now use the same .gtog/.gbtn2/.stog2/.ssbtn2
            spec vocab as EditMyProfile so admin and self-edit screens match. */}

        {/* Gender */}
        <div className="fgrp">
          <div className="fl2"><Icon name="male" size={12} />Gender</div>
          <div className="gtog">
            <button className={`gbtn2 gm${gender === "male" ? " on" : ""}`} onClick={() => setGender(gender === "male" ? "" : "male")}>
              <Icon name="male" size={16} color={gender === "male" ? "#60a5fa" : "#9090a4"} />Male
            </button>
            <button className={`gbtn2 gf${gender === "female" ? " on" : ""}`} onClick={() => setGender(gender === "female" ? "" : "female")}>
              <Icon name="female" size={16} color={gender === "female" ? "#f472b6" : "#9090a4"} />Female
            </button>
          </div>
        </div>

        {/* S070 Issue #83: Handedness (left/right hand) — separate from court position. */}
        <div className="fgrp">
          <div className="fl2"><Icon name="user" size={12} />Handedness</div>
          <div className="gtog">
            <button className={`gbtn2${handedness === "left" ? " on" : ""}`} onClick={() => setHandedness(handedness === "left" ? "" : "left")}>
              <Icon name="hand-left" size={16} color={handedness === "left" ? "#000" : "#9090a4"} />Left Hand
            </button>
            <button className={`gbtn2${handedness === "right" ? " on" : ""}`} onClick={() => setHandedness(handedness === "right" ? "" : "right")}>
              <Icon name="hand-right" size={16} color={handedness === "right" ? "#000" : "#9090a4"} />Right Hand
            </button>
          </div>
        </div>

        {/* S070 Issue #83: renamed "Playing Side" → "Court Position". */}
        <div className="fgrp" style={{ marginBottom: 18 }}>
          <div className="fl2"><Icon name="court-l" size={12} />Court Position</div>
          <div className="stog2">
            {[
              { v: "left",  l: "Left Side",  i: "court-l" },
              { v: "right", l: "Right Side", i: "court-r" },
              { v: "any",   l: "Any",        i: "court-any" },
            ].map(({ v, l, i }) => (
              <button key={v} className={`ssbtn2${position === v ? " on" : ""}`} onClick={() => setPosition(position === v ? "" : v)}>
                <Icon name={i} size={20} color={position === v ? "#000" : "#9090a4"} />
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* FT-17: admin grade override — sets grade_source='admin'. The 10-tier
            ladder; tap a tier to set, tap again to clear. */}
        <div className="fgrp" style={{ marginBottom: 18 }}>
          <div className="fl2"><Icon name="star" size={12} />Skill Grade
            {grade && <span style={{ marginLeft: 6, color: gradeColor(grade), fontWeight: 800 }}>{grade} · {GRADE_META[grade]?.label}</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {GRADE_ORDER.map(g => {
              const on = grade === g;
              const c = gradeColor(g);
              return (
                <button key={g} type="button" onClick={() => setGrade(on ? "" : g)} style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, padding: "7px 0", flex: "1 0 16%", minWidth: 40, borderRadius: 8, cursor: "pointer", color: on ? c : MT, background: on ? `${c}22` : CD2, border: `1px solid ${on ? c : BD}` }}>{g}</button>
              );
            })}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: MT, marginTop: 6 }}>Admin override. Replaces the player's self-assessment grade until they retake it.</div>
        </div>

        {/* S069: crop/zoom modal — opens when user picks a file. */}
        {pendingFile && (
          <AvatarCropModal
            file={pendingFile}
            onCancel={() => setPendingFile(null)}
            onCropped={uploadCroppedPhoto}
          />
        )}

        {/* Actions — :active press-state added via .savebtn / .shcancel CSS in S067-r1 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={saving} className="shcancel" style={{ flex: 1, height: 44 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className={`savebtn${name.trim() && !saving ? " on" : " off"}`} style={{ flex: 1.4, padding: "12px 0", fontSize: 13 }}>
            {name.trim() && !saving && <Icon name="check" size={14} color="#000" strokeWidth={2.5} />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
