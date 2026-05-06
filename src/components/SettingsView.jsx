import React, { useState } from "react";
import { supabase } from '../supabase';
import { A, CD, CD2, BD, TX, MT, DG } from '../theme';
import { ErrorBoundary } from './ErrorBoundary';

export function SettingsView({ user, claimedPlayer, isAdmin, pushSubscribed, subscribeToPush, unsubscribeFromPush, notifNewMatch, notifRankingChange, notifNewMembers, notifChallenges, toggleNotification, onSwitchLeague, setSidebarView, showToast, loadLeagueData, testPushNotification }) {
  // State moved from AppContent — settings-only
  const [editDisplayName, setEditDisplayName] = useState(user.user_metadata?.display_name || user.email?.split("@")[0] || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  // S053 Issue #22: delete-account confirm state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

      <h2 style={{fontSize:18,fontWeight:700,marginBottom:20,color:TX}}>Settings</h2>
      <ErrorBoundary>

      {/* Notifications Section */}
      <div style={{marginBottom:24}}>
        <h3 style={{fontSize:12,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Notifications</h3>

        {/* Master push toggle */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:pushSubscribed?`${A}10`:CD2,borderRadius:8,marginBottom:8,border:`1px solid ${pushSubscribed?`${A}30`:BD}`}}>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:TX}}>Push Notifications</label>
            <div style={{fontSize:10,color:MT,marginTop:2}}>{pushSubscribed?"Enabled — receiving alerts":"Tap to enable"}</div>
          </div>
          <button onClick={()=>pushSubscribed?unsubscribeFromPush():subscribeToPush().then(ok=>{if(ok)showToast("Notifications enabled!");})} style={{width:48,height:28,borderRadius:14,background:pushSubscribed?A:BD,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",padding:0}}>
            <div style={{width:24,height:24,background:CD,borderRadius:"50%",position:"absolute",top:2,left:pushSubscribed?22:2,transition:"left 0.2s"}}/>
          </button>
        </div>

        {"Notification" in window && Notification.permission === 'denied' && (
          <div style={{padding:"8px 12px",background:`${DG}15`,border:`1px solid ${DG}30`,borderRadius:8,marginBottom:8,fontSize:11,color:DG}}>
            Notifications blocked. Enable in your browser settings.
          </div>
        )}

        {/* Fix D S038: Test push button for diagnostics */}
        {pushSubscribed && testPushNotification && (
          <button onClick={testPushNotification} style={{width:"100%",padding:"10px 12px",background:CD2,border:`1px solid ${A}40`,borderRadius:8,color:A,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:8}}>
            🔔 Send Test Notification
          </button>
        )}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:CD2,borderRadius:8,marginBottom:8}}>
          <label style={{fontSize:12,fontWeight:600,color:TX}}>New Match Logged</label>
          <button onClick={()=>toggleNotification("match",!notifNewMatch)} style={{width:48,height:28,borderRadius:14,background:notifNewMatch?A:BD,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",padding:0}}>
            <div style={{width:24,height:24,background:CD,borderRadius:"50%",position:"absolute",top:2,left:notifNewMatch?22:2,transition:"left 0.2s"}}/>
          </button>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:CD2,borderRadius:8,marginBottom:8}}>
          <label style={{fontSize:12,fontWeight:600,color:TX}}>Match Challenges</label>
          <button onClick={()=>toggleNotification("challenges",!notifChallenges)} style={{width:48,height:28,borderRadius:14,background:notifChallenges?A:BD,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",padding:0}}>
            <div style={{width:24,height:24,background:CD,borderRadius:"50%",position:"absolute",top:2,left:notifChallenges?22:2,transition:"left 0.2s"}}/>
          </button>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:CD2,borderRadius:8,marginBottom:8}}>
          <label style={{fontSize:12,fontWeight:600,color:TX}}>Ranking Changes</label>
          <button onClick={()=>toggleNotification("ranking",!notifRankingChange)} style={{width:48,height:28,borderRadius:14,background:notifRankingChange?A:BD,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",padding:0}}>
            <div style={{width:24,height:24,background:CD,borderRadius:"50%",position:"absolute",top:2,left:notifRankingChange?22:2,transition:"left 0.2s"}}/>
          </button>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:CD2,borderRadius:8}}>
          <label style={{fontSize:12,fontWeight:600,color:TX}}>New Members</label>
          <button onClick={()=>toggleNotification("members",!notifNewMembers)} style={{width:48,height:28,borderRadius:14,background:notifNewMembers?A:BD,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",padding:0}}>
            <div style={{width:24,height:24,background:CD,borderRadius:"50%",position:"absolute",top:2,left:notifNewMembers?22:2,transition:"left 0.2s"}}/>
          </button>
        </div>
      </div>

      {/* League Section */}
      <div style={{marginBottom:24}}>
        <h3 style={{fontSize:12,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>League</h3>

        <button onClick={()=>{onSwitchLeague();}} style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:8}}>
          Switch League
        </button>

        {isAdmin && (
          <button onClick={()=>setSidebarView("admin")} style={{width:"100%",padding:"12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
            Admin Dashboard
          </button>
        )}
      </div>

      {/* Account Section — S053 Issue #22: moved to bottom */}
      <div style={{marginBottom:24}}>
        <h3 style={{fontSize:12,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Account</h3>

        <div style={{marginBottom:12}}>
          <label style={{display:"block",color:MT,fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Display Name</label>
          <div style={{display:"flex",gap:8}}>
            <input type="text" value={editDisplayName} onChange={(e)=>setEditDisplayName(e.target.value)} placeholder="Your name" style={{flex:1,padding:"10px 12px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
            <button onClick={async()=>{if(!editDisplayName.trim())return;setProfileSaving(true);setProfileMsg("");try{const {error:err}=await supabase.auth.updateUser({data:{display_name:editDisplayName.trim()}});if(err)throw err;await supabase.from("profiles").update({display_name:editDisplayName.trim()}).eq("id",user.id);if(claimedPlayer){await supabase.from("players").update({name:editDisplayName.trim()}).eq("id",claimedPlayer.id);await loadLeagueData();}setProfileMsg("Saved!");setTimeout(()=>setProfileMsg(""),2000);}catch(err){setProfileMsg(err.message||"Failed to update");}setProfileSaving(false);}} disabled={profileSaving} style={{padding:"10px 14px",background:A,border:"none",borderRadius:8,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:profileSaving?0.6:1}}>
              {profileSaving?"...":"Save"}
            </button>
          </div>
          {profileMsg && <div style={{fontSize:11,color:profileMsg==="Saved!"?A:DG,marginTop:4}}>{profileMsg}</div>}
        </div>

        <div style={{padding:"10px 12px",background:CD2,borderRadius:8,marginBottom:12}}>
          <label style={{display:"block",color:MT,fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Email</label>
          <div style={{fontSize:13,color:TX}}>{user.email}</div>
        </div>

        <div style={{padding:"10px 12px",background:CD2,borderRadius:8}}>
          <label style={{display:"block",color:MT,fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Linked Accounts</label>
          {(()=>{const gi=user.identities?.find(i=>i.provider==="google");return gi?(<div style={{fontSize:12,color:A,display:"flex",alignItems:"center",gap:6}}>✅ Google: Connected{gi.identity_data?.email&&<span style={{color:MT}}>({gi.identity_data.email})</span>}</div>):(<div style={{fontSize:12,color:MT}}>Google: Not connected</div>);})()}
        </div>
      </div>

      {/* Delete Account Section — S053 Issue #22 */}
      <div style={{marginBottom:24,padding:14,background:`${DG}08`,border:`1px solid ${DG}40`,borderRadius:12}}>
        <h3 style={{fontSize:12,fontWeight:700,color:DG,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Danger Zone</h3>
        <p style={{fontSize:11,color:DG,opacity:0.85,marginBottom:12,lineHeight:1.4}}>
          Permanently delete your account, profile, league memberships, notifications, and push subscriptions. Your match history is preserved (your name remains on past matches as an unclaimed player). This action cannot be undone.
          <br/><br/>
          <span style={{fontWeight:700}}>Note:</span> if you own any leagues, you must transfer ownership or delete those leagues first.
        </p>
        {!confirmDelete ? (
          <button onClick={()=>setConfirmDelete(true)} style={{width:"100%",padding:"12px",background:"transparent",border:`1px solid ${DG}`,borderRadius:8,color:DG,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textTransform:"uppercase",letterSpacing:0.5}}>
            Delete Account
          </button>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:11,color:DG,fontWeight:700,textAlign:"center",padding:"6px 0"}}>Are you absolutely sure?</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setConfirmDelete(false)} disabled={deleting} style={{flex:1,padding:"12px",background:"transparent",border:`1px solid ${BD}`,borderRadius:8,color:MT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Cancel</button>
              <button onClick={async()=>{setDeleting(true);try{const {error}=await supabase.rpc("delete_my_account");if(error)throw error;showToast("Account deleted");await supabase.auth.signOut();}catch(err){showToast(err.message||"Failed to delete account","error");setDeleting(false);setConfirmDelete(false);}}} disabled={deleting} style={{flex:1,padding:"12px",background:DG,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textTransform:"uppercase",letterSpacing:0.5,opacity:deleting?0.6:1}}>
                {deleting?"Deleting...":"Yes, Delete"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Version */}
      <div style={{textAlign:"center",paddingTop:20,borderTop:`1px solid ${BD}`,marginTop:20}}>
        <div style={{fontSize:10,color:MT,fontWeight:600}}>PadelHub</div>
      </div>
      </ErrorBoundary>
    </div>
  );
}
