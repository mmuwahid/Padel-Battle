import React, { useState, useRef } from "react";
import Icon from "./Icon";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, BL } from "../theme";
import { flagEmoji, decodeImageFile } from "../utils/helpers";
import { useLeague } from "../LeagueContext";
import { CountrySelect } from "./CountrySelect";

// S050: COUNTRIES moved to ./CountrySelect (full UN list, sorted by name,
// Israel excluded). EditPlayerModal renders <CountrySelect/> instead of a
// native <select>. flagEmoji helper handles the matching ISO3→ISO2 map in
// utils/helpers.js.

export function EditPlayerModal({ player, onClose, onSaved }) {
  const { supabase, user, showToast, loadLeagueData } = useLeague();

  const [name, setName] = useState(player.name || "");
  const [nickname, setNickname] = useState(player.nickname || "");
  const [country, setCountry] = useState(player.country || "");
  const [position, setPosition] = useState(player.playing_position || "");
  const [gender, setGender] = useState(player.gender || ""); // S066 Phase 8
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const inp = { background: CD2, color: TX, border: `1px solid ${BD}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, width: "100%", outline: "none", fontWeight: 400, fontFamily: "'Outfit',sans-serif" };

  // Resize + upload (mirrors App.jsx uploadAvatar pattern; player path: players/{playerId}.jpg).
  // S051 Issue #20: switched to decodeImageFile() — fixes iOS first-attempt failure.
  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const img = await decodeImageFile(file);
      if (!img.width || !img.height) throw new Error("Invalid image dimensions");
      const canvas = document.createElement("canvas");
      canvas.width = 200; canvas.height = 200;
      const ctx = canvas.getContext("2d");
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2, sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, 200, 200);
      if (img.close) img.close();
      const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.85));
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
        // eslint-disable-next-line no-console
        console.warn(`[EditPlayerModal] upload attempt ${attempt + 1} failed:`, error?.message || error);
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
      const { error } = await supabase.from("players")
        .update({
          name: name.trim(),
          nickname: nickname.trim() || null,
          country: country || null,
          playing_position: position || null,
          gender: gender || null,
          avatar_url: avatarUrl || null,
        })
        .eq("id", player.id);
      if (error) throw error;
      showToast("Player updated");
      await loadLeagueData();
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to save", "error");
    }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", padding: "20px 16px calc(24px + env(safe-area-inset-bottom, 0px))", border: `1px solid ${BD}`, borderBottom: "none" }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: BD, borderRadius: 2, margin: "0 auto 16px" }} />

        {/* Title */}
        <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 18px", textAlign: "center" }}>Edit Player</h2>

        {/* Photo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
          <div style={{ position: "relative", width: 96, height: 96, borderRadius: "50%", overflow: "hidden", background: `linear-gradient(135deg, ${A}25, ${A}08)`, border: `2px solid ${A}50`, display: "flex", alignItems: "center", justifyContent: "center", color: A, fontSize: 36, fontWeight: 800 }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (name[0] || "?").toUpperCase()}
            {uploading && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: TX }}>...</div>}
          </div>
          {/* S067: dropped capture="environment" — that attr forced iOS to open the rear camera and skip the gallery. Without it, iOS shows the standard sheet (Photo Library / Take Photo / Choose File). */}
          <input ref={fileRef} type="file" accept="image/*" onChange={e => uploadPhoto(e.target.files?.[0])} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: "8px 14px", background: `${A}15`, border: `1px solid ${A}`, borderRadius: 8, color: A, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", opacity: uploading ? 0.5 : 1 }}>📷 {avatarUrl ? "Change Photo" : "Upload Photo"}</button>
            {avatarUrl && <button onClick={removePhoto} disabled={uploading} style={{ padding: "8px 14px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 8, color: MT, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", opacity: uploading ? 0.5 : 1 }}>Remove</button>}
          </div>
        </div>

        {/* Name */}
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, marginBottom: 12 }} placeholder="Full name" />

        {/* Nickname */}
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Nickname</label>
        <input value={nickname} onChange={e => setNickname(e.target.value)} style={{ ...inp, marginBottom: 12 }} placeholder="Optional" />

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

        {/* Playing Side */}
        <div className="fgrp" style={{ marginBottom: 18 }}>
          <div className="fl2"><Icon name="court-l" size={12} />Playing Side</div>
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
