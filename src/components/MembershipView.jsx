import { useState } from 'react';
import Icon from './Icon';

/* Membership / subscription screen — sidebar sub-view (Settings › Account ›
   Membership). Display-only for now: shows the current plan (Free), the Pro
   upgrade card with pricing, and a Free-vs-Pro comparison. The Upgrade button
   is a placeholder until store billing (RevenueCat) is wired in the
   store-launch phase. Same back-btn + safe-area treatment as the other
   drill-in screens. */

const GOLD = "#FFD700";

// NOTE: these tier limits are display-only copy. The actual enforcement
// (Free = 1 league / 1 season / max 5 player invites; Pro = unlimited) still
// needs to be WIRED into the create/invite flows + entitlement checks once the
// Capacitor wrap / App Store launch lands store billing (RevenueCat). Until
// then this screen just advertises the plan; nothing is gated yet.
const FEATURES = [
  { label: "Leagues", free: "1", pro: "\u221E" },
  { label: "Seasons", free: "1", pro: "\u221E" },
  { label: "Player invites", free: "5", pro: "\u221E" },
  { label: "Log matches & rankings", free: true, pro: true },
  { label: "Leaderboard & profiles", free: true, pro: true },
  { label: "Advanced stats & H2H", free: false, pro: true },
  { label: "Season awards & share report", free: false, pro: true },
  { label: "Tournaments & game modes", free: false, pro: true },
  { label: "Push notifications", free: false, pro: true },
  { label: "Priority support", free: false, pro: true },
];

function Cell({ value, pro }) {
  if (value === true) return <div style={{textAlign:"center",color:"var(--accent)",fontFamily:"var(--mono)",fontSize:13}}>{"\u2713"}</div>;
  if (value === false) return <div style={{textAlign:"center",color:"#4a4a58",fontFamily:"var(--mono)",fontSize:13}}>{"\u2014"}</div>;
  return <div style={{textAlign:"center",fontFamily:"var(--mono)",fontSize:11,fontWeight:600,color:pro?GOLD:"var(--text)"}}>{value}</div>;
}

export function MembershipView({ goBack, showToast }) {
  // Selected billing period — display-only until store billing (RevenueCat) is wired.
  const [plan, setPlan] = useState("annual");
  const onUpgrade = () => showToast && showToast("Pro is coming soon — stay tuned!");
  // Restore flow is a placeholder until store billing (RevenueCat) is wired.
  const onRestore = () => showToast && showToast("No purchases to restore yet.");

  return (
    <div style={{paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>
      <div className="back-btn-row">
        <button className="back-btn" aria-label="Back" onClick={()=>goBack && goBack()}>
          <Icon name="chevron-left" size={18} color="currentColor"/>
        </button>
      </div>

      <div className="stbody" style={{paddingTop:8}}>
        <h2 style={{fontSize:20,fontWeight:800,letterSpacing:"-.01em",color:"var(--text)",margin:0}}>Membership</h2>
        <p style={{fontSize:12.5,color:"var(--muted)",lineHeight:1.5,margin:"6px 0 4px"}}>Manage your plan and unlock the full PadelHub experience.</p>

        {/* Current plan */}
        <div className="slbl">Current Plan</div>
        <div style={{background:"linear-gradient(135deg,rgba(74,222,128,.10),rgba(74,222,128,.02))",border:"1px solid rgba(74,222,128,.30)",borderRadius:"var(--r-lg)",padding:16}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <span style={{fontSize:17,fontWeight:800,color:"var(--text)"}}>Free</span>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",fontFamily:"var(--mono)",padding:"4px 9px",borderRadius:999,background:"rgba(74,222,128,.15)",color:"var(--accent)",border:"1px solid rgba(74,222,128,.40)"}}>Active</span>
          </div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:7,lineHeight:1.5}}>You're on the Free plan — 1 league, 1 season, up to 5 players, and core match tracking. Upgrade to Pro for unlimited leagues, seasons, players, and advanced stats.</div>
        </div>

        {/* Upgrade */}
        <div className="slbl">Upgrade</div>
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r-lg)",padding:"18px 16px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,var(--accent),${GOLD})`}}/>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <Icon name="crown" size={16} color={GOLD}/>
            <span style={{fontSize:17,fontWeight:800,color:"var(--text)"}}>PadelHub Pro</span>
          </div>
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:14}}>Everything in Free, plus the full toolkit.</div>

          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <button type="button" className="memplan" onClick={()=>setPlan("monthly")} aria-pressed={plan==="monthly"} style={{flex:1,border:plan==="monthly"?"1px solid var(--accent)":"1px solid var(--border)",borderRadius:"var(--r-md)",padding:"12px 10px",textAlign:"center",background:plan==="monthly"?"rgba(74,222,128,.08)":"#1a1a26",cursor:"pointer",fontFamily:"var(--font)"}}>
              <div style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".08em"}}>Monthly</div>
              <div style={{fontSize:22,fontWeight:800,color:"var(--text)",margin:"3px 0 1px"}}>$4.99<span style={{fontSize:12,fontWeight:600,color:"var(--muted)"}}>/mo</span></div>
            </button>
            <button type="button" className="memplan" onClick={()=>setPlan("annual")} aria-pressed={plan==="annual"} style={{flex:1,border:plan==="annual"?"1px solid var(--accent)":"1px solid var(--border)",borderRadius:"var(--r-md)",padding:"12px 10px",textAlign:"center",background:plan==="annual"?"rgba(74,222,128,.08)":"#1a1a26",position:"relative",cursor:"pointer",fontFamily:"var(--font)"}}>
              <div style={{position:"absolute",top:-8,right:10,fontSize:9,fontWeight:700,background:GOLD,color:"#1a1500",padding:"2px 7px",borderRadius:999,fontFamily:"var(--mono)",letterSpacing:".04em"}}>SAVE 42%</div>
              <div style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".08em"}}>Annual</div>
              <div style={{fontSize:22,fontWeight:800,color:"var(--text)",margin:"3px 0 1px"}}>$34.99<span style={{fontSize:12,fontWeight:600,color:"var(--muted)"}}>/yr</span></div>
              <div style={{fontSize:10,color:"var(--accent)",fontFamily:"var(--mono)",marginTop:2}}>$2.92/mo</div>
            </button>
          </div>

          <button onClick={onUpgrade} style={{width:"100%",padding:14,borderRadius:"var(--r-md)",border:"none",background:"linear-gradient(135deg,var(--accent),#34c46a)",color:"#04210f",fontFamily:"var(--font)",fontSize:15,fontWeight:800,letterSpacing:".02em",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <Icon name="zap" size={16} color="#04210f" strokeWidth={2.4}/>Upgrade to Pro
          </button>
          <div style={{textAlign:"center",fontSize:11,color:"var(--muted)",marginTop:9,fontFamily:"var(--mono)"}}>7-day free trial · cancel anytime</div>
        </div>

        {/* Comparison */}
        <div className="slbl">Free vs Pro</div>
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r-lg)",overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 64px 64px",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid var(--border)",background:"#1a1a26"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",fontFamily:"var(--mono)",color:"var(--muted)"}}>Feature</div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",fontFamily:"var(--mono)",color:"var(--muted)",textAlign:"center"}}>Free</div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",fontFamily:"var(--mono)",color:GOLD,textAlign:"center"}}>Pro</div>
          </div>
          {FEATURES.map((f,i)=>(
            <div key={f.label} style={{display:"grid",gridTemplateColumns:"1fr 64px 64px",alignItems:"center",padding:"11px 14px",borderBottom:i<FEATURES.length-1?"1px solid rgba(42,42,58,.5)":"none"}}>
              <div style={{fontSize:12.5,color:"var(--text)"}}>{f.label}</div>
              <Cell value={f.free}/>
              <Cell value={f.pro} pro/>
            </div>
          ))}
        </div>

        <div style={{textAlign:"center",marginTop:18}}>
          <button onClick={onRestore} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"var(--mono)",fontSize:12,letterSpacing:".04em",color:"rgba(144,144,164,.45)",textShadow:"0 1px 2px rgba(0,0,0,.5)",padding:"4px 8px"}}>Restore Purchases</button>
        </div>

        <div style={{fontSize:10.5,color:"var(--muted)",textAlign:"center",marginTop:10,lineHeight:1.5,fontFamily:"var(--mono)",padding:"0 6px"}}>Billed via the App Store / Google Play. Prices may vary by region. Cancel anytime in your store subscription settings.</div>
      </div>
    </div>
  );
}
