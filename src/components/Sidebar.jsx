import React from "react";
import { supabase } from '../supabase';
import Icon from './Icon';
import { pressable } from '../utils/a11y';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { flagEmoji } from '../utils/helpers';
import { gradeColor } from '../utils/grade';

// S066 Phase 12: spec-faithful restyle. Slide-in right drawer (.ssheet) with
// .sbprof header (clickable to open My Profile), .sbsec sections containing
// .sbitem rows, .sbdiv divider, .sbfoot with .signout. Spec lines 2174-2196.
export function Sidebar({ sidebarOpen, setSidebarOpen, setSidebarView, navigateSidebar, user, claimedPlayer, avatarUrl, league, isAdmin, onSwitchLeague: _onSwitchLeague, showToast, installPrompt, handleInstall, playerCount, activeSeasonName }) {
  // S068: drawer entry clicks must push history so the drill-down can incrementally
  // back out to the drawer. navigateSidebar handles drawer-close + history push.
  const go = navigateSidebar || ((v)=>{ setSidebarView(v); setSidebarOpen(false); });
  const trapRef = useFocusTrap(sidebarOpen, ()=>setSidebarOpen(false));
  if (!sidebarOpen) return null;

  const userInitial = (user.user_metadata?.display_name || user.email || "U")[0].toUpperCase();
  const userName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User";

  const handleInvite = () => {
    const code = league?.invite_code;
    if (!code) return;
    const url = `${window.location.origin}${window.location.pathname}?invite=${code}`;
    if (navigator.share) {
      navigator.share({ title: "Join my PadelHub league", text: `Join "${league?.name}" on PadelHub!`, url });
    } else {
      navigator.clipboard.writeText(url);
      if (showToast) showToast("Invite link copied!");
    }
  };

  const isIos = /iPhone|iPad/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  return (
    <div className="overlay" onClick={()=>setSidebarOpen(false)}>
      <div ref={trapRef} role="dialog" aria-modal="true" aria-label="Menu" tabIndex={-1} className="ssheet" onClick={e=>e.stopPropagation()}>
        <div className="shdl"/>
        <button onClick={()=>setSidebarOpen(false)} aria-label="Close" style={{position:"absolute",top:12,right:14,width:30,height:30,borderRadius:"var(--r-full)",background:"var(--surface-2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#9090a4"}}>
          <Icon name="close" size={14}/>
        </button>

        {/* User profile header — click opens My Profile (Issue #21) */}
        <div className="sbprof" {...pressable(()=>go("profile"))}>
          <div className="sbav">
            {avatarUrl
              ? <img src={avatarUrl} alt={userName} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <div className="sbavi">{userInitial}</div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div className="sbn">{userName}</div>
            {/* Issue: replaced email with country flag + grade pill (when self-assessed) */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
              {claimedPlayer?.country && (
                <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,color:"#9090a4"}}>
                  <span className="flag">{flagEmoji(claimedPlayer.country)}</span>{claimedPlayer.country}
                </span>
              )}
              {claimedPlayer?.grade && (
                <span style={{fontFamily:"var(--mono)",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:"var(--r-full)",color:gradeColor(claimedPlayer.grade),border:`1px solid ${gradeColor(claimedPlayer.grade)}`,background:`${gradeColor(claimedPlayer.grade)}1a`}}>
                  {claimedPlayer.grade}
                </span>
              )}
            </div>
          </div>
          <div style={{color:"#5a5a6a",marginLeft:"auto",display:"flex"}}>
            <Icon name="chevron" size={16}/>
          </div>
        </div>

        {/* League section */}
        <div className="sbsec">
          <div className="sbsl">League</div>
          {league ? (
            <div className="sbitem" {...pressable(()=>go("leagueManagement"))}>
              <div className="sbico"><Icon name="league" size={16}/></div>
              <div className="sbibd">
                <div className="sbit">{league.name}</div>
                {(playerCount != null || activeSeasonName) && (
                  <div className="sbis">
                    {playerCount != null && `${playerCount} player${playerCount===1?"":"s"}`}
                    {playerCount != null && activeSeasonName && " · "}
                    {activeSeasonName}
                  </div>
                )}
              </div>
              {isAdmin && <div className="sbbadge">Admin</div>}
              <span className="sb-chev"><Icon name="chevron" size={16} color="currentColor"/></span>
            </div>
          ) : (
            <div className="sbitem" {...pressable(()=>go("leagueManagement"))}>
              <div className="sbico"><Icon name="league" size={16}/></div>
              <div className="sbibd">
                <div className="sbit">Join or create</div>
                <div className="sbis">No league selected</div>
              </div>
              <span className="sb-chev"><Icon name="chevron" size={16} color="currentColor"/></span>
            </div>
          )}
          {league && isAdmin && (
            <div className="sbitem" {...pressable(handleInvite)}>
              <div className="sbico"><Icon name="user-plus" size={16}/></div>
              <div className="sbibd">
                <div className="sbit">Invite Players</div>
              </div>
              <span className="sb-chev"><Icon name="chevron" size={16} color="currentColor"/></span>
            </div>
          )}
        </div>

        <div className="sbdiv"/>

        {/* App section */}
        <div className="sbsec">
          <div className="sbsl">App</div>
          <div className="sbitem" {...pressable(()=>go("rules"))}>
            <div className="sbico"><Icon name="book" size={16}/></div>
            <div className="sbibd">
              <div className="sbit">Official Rules</div>
            </div>
            <span className="sb-chev"><Icon name="chevron" size={16} color="currentColor"/></span>
          </div>
          <div className="sbitem" {...pressable(()=>go("privacy"))}>
            <div className="sbico"><Icon name="shield" size={16}/></div>
            <div className="sbibd">
              <div className="sbit">Privacy Policy</div>
            </div>
            <span className="sb-chev"><Icon name="chevron" size={16} color="currentColor"/></span>
          </div>
          <div className="sbitem" {...pressable(()=>go("terms"))}>
            <div className="sbico"><Icon name="book" size={16}/></div>
            <div className="sbibd">
              <div className="sbit">Terms of Service</div>
            </div>
            <span className="sb-chev"><Icon name="chevron" size={16} color="currentColor"/></span>
          </div>
          <div className="sbitem" {...pressable(()=>go("settings"))}>
            <div className="sbico"><Icon name="settings" size={16}/></div>
            <div className="sbibd">
              <div className="sbit">Settings</div>
            </div>
            <span className="sb-chev"><Icon name="chevron" size={16} color="currentColor"/></span>
          </div>
          {installPrompt ? (
            <div className="sbitem" {...pressable(handleInstall)}>
              <div className="sbico"><Icon name="share" size={16}/></div>
              <div className="sbibd">
                <div className="sbit" style={{color:"var(--accent)"}}>Install App</div>
              </div>
              <span className="sb-chev"><Icon name="chevron" size={16} color="currentColor"/></span>
            </div>
          ) : (isIos && !isStandalone) ? (
            <div className="sbitem" style={{cursor:"default"}}>
              <div className="sbico"><Icon name="share" size={16}/></div>
              <div className="sbibd">
                <div className="sbit">Install App</div>
                <div className="sbis">Tap Share → Add to Home Screen</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sign out footer */}
        <div className="sbfoot">
          {/* S067: dropped the close-X icon — red text alone is sufficient signal. */}
          <button className="signout" onClick={async()=>{try{await supabase.auth.signOut();}catch(_e){/* best-effort: local session is cleared regardless */}}}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
