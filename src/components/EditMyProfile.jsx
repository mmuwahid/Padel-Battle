import React, { useState } from "react";
import { A, CD, CD2, BD, TX, MT } from "../theme";
import { useLeague } from "../LeagueContext";
import { COUNTRIES } from "./EditPlayerModal";

// S050: User self-edit modal for the player record they've claimed.
// Lets the user update name / nickname / country / playing_position on
// their own player row. Backed by RLS policy `players_update_self`
// (user_id = auth.uid()).
//
// Photo is intentionally NOT exposed here — the user already has a
// separate profile photo upload at the top of ProfileView (writes to
// avatars/{userId}/...). The player.avatar_url path used by the admin
// EditPlayerModal is admin-managed and remains so.
export function EditMyProfile({ player, onClose }) {
  const { supabase, showToast, loadLeagueData } = useLeague();

  const [name, setName] = useState(player.name || "");
  const [nickname, setNickname] = useState(player.nickname || "");
  const [country, setCountry] = useState(player.country || "");
  const [position, setPosition] = useState(player.playing_position || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmedName = (name || "").trim();
    if (!trimmedName) { showToast("Display name is required", "error"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("players")
        .update({
          name: trimmedName,
          nickname: (nickname || "").trim() || null,
          country: country || null,
          playing_position: position || null,
        })
        .eq("id", player.id);
      if (error) throw error;
      showToast("Profile updated");
      await loadLeagueData();
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to save", "error");
    }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={(e)=>e.stopPropagation()} style={{width:"100%",maxWidth:480,maxHeight:"90vh",overflow:"auto",background:CD,borderTopLeftRadius:20,borderTopRightRadius:20,padding:"16px 16px calc(20px + env(safe-area-inset-bottom, 0px))",fontFamily:"'Outfit',sans-serif"}}>
        <div style={{width:36,height:4,background:BD,borderRadius:2,margin:"0 auto 14px"}}/>
        <h3 style={{fontSize:16,fontWeight:900,fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5,color:TX,margin:"0 0 14px"}}>Edit My Profile</h3>

        {/* Display Name */}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Display Name</label>
          <input type="text" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" style={{width:"100%",padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
          <div style={{fontSize:10,color:MT,marginTop:4,lineHeight:1.4}}>This is what shows on the leaderboard and match history.</div>
        </div>

        {/* Nickname */}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Nickname (optional)</label>
          <input type="text" value={nickname} onChange={(e)=>setNickname(e.target.value)} placeholder="e.g. The Wall" style={{width:"100%",padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
        </div>

        {/* Country */}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Country</label>
          <select value={country} onChange={(e)=>setCountry(e.target.value)} style={{width:"100%",padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}>
            <option value="">— Not set —</option>
            {COUNTRIES.map(c => <option key={c.iso3} value={c.iso3}>{c.name} ({c.iso3})</option>)}
          </select>
        </div>

        {/* Playing Position */}
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Playing Side</label>
          <div style={{display:"flex",gap:6}}>
            {[["", "Not set"], ["left", "Left"], ["right", "Right"]].map(([v, l]) => (
              <button key={v || "none"} onClick={()=>setPosition(v)} style={{flex:1,padding:"10px",background:position===v?A:"transparent",color:position===v?"#000":MT,border:`1px solid ${position===v?A:BD}`,borderRadius:10,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5}}>{l}</button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} disabled={saving} style={{flex:1,padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:10,color:MT,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()} style={{flex:1,padding:"12px",background:A,border:"none",borderRadius:10,color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontStyle:"italic",textTransform:"uppercase",letterSpacing:0.5,opacity:(saving||!name.trim())?0.6:1}}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
