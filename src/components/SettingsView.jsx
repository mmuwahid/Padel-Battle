import React, { useState } from "react";
import { supabase } from '../supabase';
import { ErrorBoundary } from './ErrorBoundary';
import Icon from './Icon';

// S066 Phase 12: spec-faithful restyle.
// Uses .stbody/.slbl/.stcard/.strow/.stico/.stbod/.sttitle/.stsub/.saar/.staf
// Toggle component is a custom .stoggle pill.
// Behavior preserved: notification toggles, switch league, admin dashboard
// link, display name edit, account info, delete account confirm flow.
function Toggle({ on, onChange, label }) {
  return (
    <div className={`stoggle${on?' on':''}`} onClick={onChange} role="switch" aria-checked={on} aria-label={label}/>
  );
}

export function SettingsView({ user, claimedPlayer, isAdmin, pushSubscribed, subscribeToPush, unsubscribeFromPush, notifNewMatch, notifRankingChange, notifNewMembers, notifChallenges, toggleNotification, onSwitchLeague, setSidebarView, showToast, loadLeagueData, testPushNotification }) {
  const [editDisplayName, setEditDisplayName] = useState(user.user_metadata?.display_name || user.email?.split("@")[0] || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const togglePush = () => pushSubscribed
    ? unsubscribeFromPush()
    : subscribeToPush().then(ok => { if (ok && showToast) showToast("Notifications enabled!"); });

  const saveDisplayName = async () => {
    const v = editDisplayName.trim();
    if (!v) return;
    setProfileSaving(true);
    setProfileMsg("");
    try {
      const { error: err } = await supabase.auth.updateUser({ data: { display_name: v } });
      if (err) throw err;
      await supabase.from("profiles").update({ display_name: v }).eq("id", user.id);
      if (claimedPlayer) {
        await supabase.from("players").update({ name: v }).eq("id", claimedPlayer.id);
        await loadLeagueData();
      }
      setProfileMsg("Saved!");
      setTimeout(() => setProfileMsg(""), 2000);
    } catch (err) {
      setProfileMsg(err.message || "Failed to update");
    }
    setProfileSaving(false);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      if (showToast) showToast("Account deleted");
      await supabase.auth.signOut();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to delete account", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const linkedGoogle = user.identities?.find(i => i.provider === "google");
  const notifBlocked = "Notification" in window && Notification.permission === 'denied';

  return (
    <div className="stbody" style={{paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView(null)} style={{background:"none",border:"none",color:"var(--accent)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--font)",alignSelf:"flex-start",display:"flex",alignItems:"center",gap:5,padding:0}}>
        <Icon name="back" size={14}/> Back
      </button>

      <h2 style={{fontSize:20,fontWeight:800,fontStyle:"italic",letterSpacing:"-.01em",color:"var(--text)",margin:0}}>Settings</h2>

      <ErrorBoundary>

      {/* Notifications */}
      <div>
        <div className="slbl">Notifications</div>
        <div className="stcard">
          {pushSubscribed && testPushNotification && (
            <button onClick={testPushNotification} style={{width:"100%",padding:"13px 16px",background:"none",border:"none",borderBottom:"1px solid var(--border)",fontFamily:"var(--font)",fontSize:13,fontWeight:600,color:"var(--accent)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <Icon name="zap" size={14} color="var(--accent)"/>Send Test Notification
            </button>
          )}
          {notifBlocked && (
            <div style={{padding:"10px 14px",background:"rgba(248,113,113,.08)",borderBottom:"1px solid var(--border)",fontSize:11,color:"var(--danger)",fontFamily:"var(--mono)"}}>
              Notifications blocked. Enable in your browser settings.
            </div>
          )}
          <div className="strow">
            <div className="stico"><Icon name="bell" size={16}/></div>
            <div className="stbod"><div className="sttitle">Push Notifications</div><div className="stsub">{pushSubscribed?"Enabled":"Master toggle"}</div></div>
            <Toggle on={pushSubscribed} onChange={togglePush} label="Push notifications"/>
          </div>
          <div className="strow">
            <div className="stico"><Icon name="racket" size={16}/></div>
            <div className="stbod"><div className="sttitle">New Match Logged</div><div className="stsub">When result submitted</div></div>
            <Toggle on={notifNewMatch} onChange={()=>toggleNotification("match",!notifNewMatch)} label="New match"/>
          </div>
          <div className="strow">
            <div className="stico"><Icon name="zap" size={16}/></div>
            <div className="stbod"><div className="sttitle">Match Challenges</div><div className="stsub">When challenged</div></div>
            <Toggle on={notifChallenges} onChange={()=>toggleNotification("challenges",!notifChallenges)} label="Challenges"/>
          </div>
          <div className="strow">
            <div className="stico"><Icon name="trophy" size={16}/></div>
            <div className="stbod"><div className="sttitle">Ranking Changes</div><div className="stsub">Position changes</div></div>
            <Toggle on={notifRankingChange} onChange={()=>toggleNotification("ranking",!notifRankingChange)} label="Ranking"/>
          </div>
          <div className="strow">
            <div className="stico"><Icon name="user-plus" size={16}/></div>
            <div className="stbod"><div className="sttitle">New Members</div><div className="stsub">When someone joins</div></div>
            <Toggle on={notifNewMembers} onChange={()=>toggleNotification("members",!notifNewMembers)} label="New members"/>
          </div>
        </div>
      </div>

      {/* League */}
      <div>
        <div className="slbl">League</div>
        <div className="stcard">
          <div className="saar" onClick={onSwitchLeague}>
            <div className="stico"><Icon name="league" size={16}/></div>
            <div className="stbod"><div className="sttitle">Switch League</div><div className="stsub">Join a different league</div></div>
            <Icon name="chevron" size={16} color="#5a5a6a"/>
          </div>
          {isAdmin && (
            <div className="saar pr" onClick={()=>setSidebarView("admin")}>
              <div className="stico"><Icon name="admin" size={16}/></div>
              <div className="stbod"><div className="sttitle">Admin Dashboard</div><div className="stsub">Manage players and matches</div></div>
              <Icon name="chevron" size={16} color="var(--accent)"/>
            </div>
          )}
        </div>
      </div>

      {/* Account */}
      <div>
        <div className="slbl">Account</div>
        <div className="stcard">
          <div className="staf">
            <div className="stafL">Display Name</div>
            <div className="stafR">
              <input className="stafI" type="text" value={editDisplayName} onChange={e=>setEditDisplayName(e.target.value)} placeholder="Your name"/>
              <button onClick={saveDisplayName} disabled={profileSaving} style={{padding:"10px 16px",borderRadius:"var(--r-sm)",background:"var(--accent)",border:"none",fontFamily:"var(--font)",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",flexShrink:0,opacity:profileSaving?.6:1}}>{profileSaving?"…":"Save"}</button>
            </div>
            {profileMsg && <div style={{fontSize:11,color:profileMsg==="Saved!"?"var(--accent)":"var(--danger)",fontFamily:"var(--mono)"}}>{profileMsg}</div>}
          </div>
          <div className="staf">
            <div className="stafL">Email</div>
            <input className="stafI" value={user.email} readOnly style={{opacity:.6}}/>
          </div>
          <div className="staf">
            <div className="stafL">Linked Accounts</div>
            {linkedGoogle ? (
              <div style={{display:"flex",alignItems:"center",gap:8,fontFamily:"var(--mono)",fontSize:12}}>
                <Icon name="check-circle" size={16} color="var(--accent)"/>
                <span style={{color:"var(--accent)"}}>Google</span>
                {linkedGoogle.identity_data?.email && <span style={{color:"#9090a4",fontSize:11}}>({linkedGoogle.identity_data.email})</span>}
              </div>
            ) : (
              <div style={{fontFamily:"var(--mono)",fontSize:12,color:"#9090a4"}}>Google: Not connected</div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account */}
      {!confirmDelete ? (
        <button onClick={()=>setConfirmDelete(true)} style={{width:"100%",padding:14,borderRadius:"var(--r-md)",background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.32)",fontFamily:"var(--font)",fontSize:14,fontWeight:700,color:"var(--danger)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <Icon name="alert" size={16} color="var(--danger)"/>Delete Account
        </button>
      ) : (
        <div style={{padding:16,background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.32)",borderRadius:"var(--r-lg)"}}>
          <div style={{fontFamily:"var(--mono)",fontSize:11,fontWeight:800,letterSpacing:".12em",color:"var(--danger)",textTransform:"uppercase",marginBottom:10}}>Danger Zone</div>
          <p style={{fontSize:12,color:"var(--danger)",opacity:.9,marginBottom:14,lineHeight:1.5,fontFamily:"var(--font)"}}>
            Permanently delete your account, profile, league memberships, notifications, and push subscriptions. Your match history is preserved. <strong>If you own any leagues, you must transfer ownership or delete them first.</strong>
          </p>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setConfirmDelete(false)} disabled={deleting} className="shcancel" style={{flex:1,padding:"12px 0",fontSize:13}}>Cancel</button>
            <button onClick={deleteAccount} disabled={deleting} style={{flex:1,padding:"12px 0",borderRadius:"var(--r-md)",background:"var(--danger)",border:"none",color:"#fff",fontFamily:"var(--font)",fontSize:13,fontWeight:800,cursor:deleting?"not-allowed":"pointer",letterSpacing:".04em",opacity:deleting?.6:1}}>{deleting?"Deleting…":"Yes, Delete"}</button>
          </div>
        </div>
      )}
      </ErrorBoundary>
    </div>
  );
}
