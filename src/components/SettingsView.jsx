import React, { useState } from "react";
import { supabase } from '../supabase';
import { A, CD, CD2, BD, TX, MT, DG } from '../theme';
import { ErrorBoundary } from './ErrorBoundary';

export function SettingsView({ user, claimedPlayer, isAdmin, league, leagueMembers, memberProfiles, pushSubscribed, subscribeToPush, unsubscribeFromPush, notifNewMatch, notifRankingChange, notifNewMembers, notifChallenges, toggleNotification, updateMemberRole, onSwitchLeague, setSidebarView, showToast, loadLeagueData }) {
  // State moved from AppContent — settings-only
  const [editDisplayName, setEditDisplayName] = useState(user.user_metadata?.display_name || user.email?.split("@")[0] || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

      <h2 style={{fontSize:18,fontWeight:700,marginBottom:20,color:TX}}>Settings</h2>
      <ErrorBoundary>

      {/* Account Section */}
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

      {/* Admin Management Section */}
      {isAdmin && (
        <div style={{marginBottom:24}}>
          <h3 style={{fontSize:12,fontWeight:700,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Admin Management</h3>

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {leagueMembers.map(member => {
              const profile = memberProfiles[member.user_id];
              const isOwner = league?.created_by === member.user_id;
              return (
                <div key={member.user_id} style={{padding:"10px 12px",background:CD2,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:TX,overflow:"hidden",textOverflow:"ellipsis"}}>{profile?.display_name || profile?.email?.split("@")[0] || "User"}</div>
                    <div style={{fontSize:10,color:MT}}>{profile?.email || ""}</div>
                  </div>
                  <div style={{marginLeft:12}}>
                    {isOwner ? (
                      <span style={{fontSize:10,color:A,fontWeight:700,background:`${A}20`,padding:"4px 8px",borderRadius:4}}>Owner</span>
                    ) : (
                      <select value={member.role || "member"} onChange={(e)=>updateMemberRole(member.user_id,e.target.value)} style={{fontSize:11,padding:"4px 8px",background:BD,border:`1px solid ${BD}`,borderRadius:4,color:TX,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Version */}
      <div style={{textAlign:"center",paddingTop:20,borderTop:`1px solid ${BD}`,marginTop:20}}>
        <div style={{fontSize:10,color:MT,fontWeight:600}}>PadelHub</div>
      </div>
      </ErrorBoundary>
    </div>
  );
}
