import React from "react";
import { supabase } from '../supabase';
import { A, CD, CD2, BD, TX, MT, DG, BL } from '../theme';
import { PLATFORM_ADMIN_ID } from './PlatformAdmin';

export function Sidebar({ sidebarOpen, setSidebarOpen, setSidebarView, user, avatarUrl, league, isAdmin, onSwitchLeague, showToast, installPrompt, handleInstall }) {
  return (
    <>
      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={()=>setSidebarOpen(false)}
          style={{
            position:"fixed",top:0,left:0,right:0,bottom:0,
            background:"rgba(0,0,0,0.5)",zIndex:98,
          }}
        />
      )}

      {/* SIDEBAR */}
      <div style={{
        position:"fixed",top:0,right:0,width:Math.min(320,window.innerWidth),height:"100vh",
        background:CD,borderLeft:`1px solid ${BD}`,
        zIndex:99,
        transform:sidebarOpen?"translateX(0)":"translateX(100%)",
        transition:"transform 0.3s ease-in-out",
        display:"flex",flexDirection:"column",
        boxShadow:sidebarOpen?"0 0 20px rgba(0,0,0,0.5)":"none",
        overflow:"auto",
      }}>
        {/* Header with user info */}
        <div style={{padding:"20px 16px",paddingTop:"calc(env(safe-area-inset-top, 0px) + 20px)",borderBottom:`1px solid ${BD}`}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
            <button onClick={()=>setSidebarOpen(false)} style={{background:"none",border:"none",color:MT,fontSize:20,cursor:"pointer",padding:"4px 8px",lineHeight:1}} aria-label="Close sidebar">✕</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:`${A}20`,border:`2px solid ${A}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:A,overflow:"hidden"}}>
              {avatarUrl?<img src={avatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(user.user_metadata?.display_name||user.email||"U")[0].toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:TX}}>{user.user_metadata?.display_name||user.email?.split("@")[0]||"User"}</div>
              <div style={{fontSize:10,color:MT,marginTop:2}}>{user.email}</div>
            </div>
          </div>
        </div>

        {/* Sidebar content — NAVIGATION ONLY, closes on selection */}
          <style>{`
            .sidebar-nav button:active { background: ${CD2} !important; }
          `}</style>
        <div className="sidebar-nav" style={{flex:1,padding:"16px",overflow:"auto"}}>
          <div>
            <button onClick={()=>{setSidebarView("profile");setSidebarOpen(false);}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              👤 My Profile
            </button>
          </div>

          <div style={{height:"1px",background:BD,margin:"12px 0"}} />

          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",paddingLeft:16,marginBottom:8}}>League</div>
            <div style={{padding:"12px 16px",background:CD2,borderRadius:8,marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:600,color:TX,display:"flex",alignItems:"center",gap:6}}>
                {league?.name||"—"}
                {isAdmin && <span style={{fontSize:9,color:A,fontWeight:700,background:`${A}20`,padding:"2px 6px",borderRadius:4}}>Admin</span>}
              </div>
            </div>
            <button onClick={()=>{onSwitchLeague();}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              🔄 Switch League
            </button>
            <button onClick={()=>{const code=league?.invite_code;if(code){const url=`${window.location.origin}${window.location.pathname}?invite=${code}`;if(navigator.share)navigator.share({title:"Join my PadelHub league",text:`Join "${league?.name}" on PadelHub!`,url});else{navigator.clipboard.writeText(url);showToast("Invite link copied!");}}}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>📩 Invite Players</button>
          </div>

          <div style={{height:"1px",background:BD,margin:"12px 0"}} />

          <div>
            <div style={{fontSize:10,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",paddingLeft:16,marginBottom:8}}>App</div>
            <button onClick={()=>{setSidebarView("settings");setSidebarOpen(false);}} style={{width:"100%",padding:"12px 16px",background:"transparent",border:"none",color:TX,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",borderRadius:8,transition:"all 0.2s"}}>
              ⚙️ Settings
            </button>
            {installPrompt ? (
              <button onClick={handleInstall} style={{width:"100%",padding:"12px 16px",background:`${A}15`,border:`1px solid ${A}40`,borderRadius:8,color:A,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",transition:"all 0.2s"}}>
                📲 Install App
              </button>
            ) : !window.matchMedia("(display-mode: standalone)").matches && /iPhone|iPad/i.test(navigator.userAgent) ? (
              <div style={{padding:"12px 16px",background:`${BL}10`,border:`1px solid ${BL}30`,borderRadius:8,fontSize:11,color:MT,lineHeight:1.4}}>
                📲 To install: tap <span style={{color:BL}}>Share</span> → <span style={{color:BL}}>Add to Home Screen</span>
              </div>
            ) : null}
          </div>

          {user.id === PLATFORM_ADMIN_ID && (
            <div style={{marginTop:12}}>
              <button onClick={()=>{setSidebarView("platform");setSidebarOpen(false);}} style={{width:"100%",padding:"12px 16px",background:`${A}10`,border:`1px solid ${A}30`,borderRadius:8,color:A,fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",transition:"all 0.2s"}}>
                🛡️ Platform Admin
              </button>
            </div>
          )}

          <div style={{padding:"16px 0",borderTop:`1px solid ${BD}`,marginTop:12}}>
            <button onClick={async()=>{await supabase.auth.signOut();}} style={{width:"100%",padding:"12px",background:`${DG}15`,border:`1px solid ${DG}40`,borderRadius:8,color:DG,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
