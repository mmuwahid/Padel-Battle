import React from "react";
import { A, CD, BD, TX, MT } from '../theme';
import { formatTeam, win } from '../utils/helpers';
import { useLeague } from '../LeagueContext';
import { PLATFORM_ADMIN_ID } from './PlatformAdmin';

export function AdminDashboard({ setSidebarView }) {
  const {
    user, league, getName,
    matches,
    isOwner,
  } = useLeague();

  const exportMatchesCSV = () => {
    if (matches.length === 0) {
      return;
    }
    const csv = [
      ["Date", "Team A", "Team B", "Sets", "Winner", "Status"].join(","),
      ...matches.map(m => {
        const w = win(m.sets);
        const winnerTeam = w === "A" ? formatTeam(getName(m.team_a[0]),getName(m.team_a[1])) : formatTeam(getName(m.team_b[0]),getName(m.team_b[1]));
        return [
          new Date(m.date).toLocaleDateString(),
          formatTeam(getName(m.team_a[0]),getName(m.team_a[1])),
          formatTeam(getName(m.team_b[0]),getName(m.team_b[1])),
          m.sets.map(s => `${s[0]}-${s[1]}`).join(" "),
          winnerTeam,
          m.status || "approved",
        ].map(v => {let s=String(v).replace(/"/g,'""');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return `"${s}"`;}).join(",");
      })
    ].join("\n");

    const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${league?.name || "matches"}-export.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const NavButton = ({ icon, label, onClick }) => (
    <button onClick={onClick} style={{width:"100%",padding:"16px 14px",background:CD,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
      <span style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>{icon}</span>
        <span style={{fontSize:14,fontWeight:900,textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>
      </span>
      <span style={{fontSize:18,color:MT}}>→</span>
    </button>
  );

  return (
    <div style={{padding:"20px 16px",paddingBottom:"calc(96px + env(safe-area-inset-bottom, 0px))"}}>
      <button onClick={()=>setSidebarView(null)} style={{marginBottom:20,background:"none",border:"none",color:A,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>← Back</button>

      <h2 style={{fontSize:20,fontWeight:900,textTransform:"uppercase",letterSpacing:1,marginBottom:8,color:TX}}>Admin Dashboard</h2>
      <div style={{fontSize:11,color:MT,marginBottom:20,lineHeight:1.5}}>Pending match approvals appear inline at the top of the <strong style={{color:TX}}>Matches</strong> tab.</div>

      {/* Players */}
      <div style={{marginBottom:16}}>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Players</h3>
        <NavButton icon="👥" label="Player Management" onClick={()=>setSidebarView("playerManagement")}/>
      </div>

      {/* League Management */}
      <div style={{marginBottom:16}}>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>League</h3>
        <NavButton icon="⚙️" label="League Management" onClick={()=>setSidebarView("leagueManagement")}/>
      </div>

      {/* Data Export */}
      <div style={{marginBottom:user?.id === PLATFORM_ADMIN_ID ? 16 : 0}}>
        <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Data Export</h3>
        <button onClick={exportMatchesCSV} style={{width:"100%",padding:"12px",background:CD,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <span style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>📥</span>
            <span style={{fontSize:14,fontWeight:900,textTransform:"uppercase",letterSpacing:0.5}}>Export Matches (CSV)</span>
          </span>
          <span style={{fontSize:18,color:MT}}>↓</span>
        </button>
      </div>

      {/* Platform Admin — super-admin only */}
      {user?.id === PLATFORM_ADMIN_ID && (
        <div>
          <h3 style={{fontSize:13,fontWeight:700,color:A,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Platform</h3>
          <button onClick={()=>setSidebarView("platform")} style={{width:"100%",padding:"12px",background:`${A}10`,border:`1px solid ${A}30`,borderRadius:12,color:A,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16}}>🛡️</span>
            <span style={{fontSize:14,fontWeight:900,textTransform:"uppercase",letterSpacing:0.5}}>Platform Admin</span>
          </button>
        </div>
      )}
    </div>
  );
}
