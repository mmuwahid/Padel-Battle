import React, { useState, useRef } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, BL } from "../theme";
import { flagEmoji } from "../utils/helpers";
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
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const inp = { background: CD2, color: TX, border: `1px solid ${BD}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, width: "100%", outline: "none", fontWeight: 400, fontFamily: "'Outfit',sans-serif" };

  // Resize + upload (mirrors App.jsx uploadAvatar pattern; player path: players/{playerId}.jpg)
  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
      const canvas = document.createElement("canvas");
      canvas.width = 200; canvas.height = 200;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("Failed to load image")); img.src = dataUrl; });
      if (!img.width || !img.height) throw new Error("Invalid image dimensions");
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2, sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, 200, 200);
      const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.85));
      const path = `players/${player.id}.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
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
        <h2 style={{ fontSize: 18, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 18px", textAlign: "center" }}>Edit Player</h2>

        {/* Photo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
          <div style={{ position: "relative", width: 96, height: 96, borderRadius: "50%", overflow: "hidden", background: `linear-gradient(135deg, ${A}25, ${A}08)`, border: `2px solid ${A}50`, display: "flex", alignItems: "center", justifyContent: "center", color: A, fontSize: 36, fontWeight: 800 }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (name[0] || "?").toUpperCase()}
            {uploading && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: TX }}>...</div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={e => uploadPhoto(e.target.files?.[0])} style={{ display: "none" }} />
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
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Country {country && <span style={{ fontSize: 14, marginLeft: 4 }}>{flagEmoji(country)}</span>}</label>
        <div style={{ marginBottom: 12 }}>
          <CountrySelect value={country} onChange={setCountry}/>
        </div>

        {/* Playing position */}
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Playing Position</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[["", "Not set"], ["left", "Left"], ["right", "Right"]].map(([v, l]) => (
            <button key={v || "none"} onClick={() => setPosition(v)} style={{ flex: 1, padding: "10px", background: position === v ? A : "transparent", color: position === v ? "#000" : MT, border: `1px solid ${position === v ? A : BD}`, borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontStyle: "italic", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 10, color: MT, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{ flex: 1, padding: "12px", background: A, border: "none", borderRadius: 10, color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontStyle: "italic", textTransform: "uppercase", letterSpacing: 0.5, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
