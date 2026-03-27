import React, { useState, useEffect } from "react";
import { supabase } from '../supabase';
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, PU } from '../theme';
import { PadelLogoSmall } from './icons';

export function LeagueGate({user,children}){
  const [leagues,setLeagues]=useState([]);
  const [selectedLeagueId,setSelectedLeagueId]=useState(null);
  const [loading,setLoading]=useState(true);
  const [showCreate,setShowCreate]=useState(false);
  const [showJoin,setShowJoin]=useState(false);
  const [leagueName,setLeagueName]=useState("");
  const [inviteCode,setInviteCode]=useState("");
  const [error,setError]=useState("");
  const [editingLeagueId,setEditingLeagueId]=useState(null);
  const [editLeagueName,setEditLeagueName]=useState("");
  const [joinMsg,setJoinMsg]=useState("");

  useEffect(()=>{
    const init = async () => {
      await loadUserLeagues();
      // Check URL for invite code and auto-join
      const params = new URLSearchParams(window.location.search);
      const code = params.get("invite");
      if (code) {
        setInviteCode(code);
        // Auto-join the league from invite link
        await autoJoinByInvite(code);
        // Clean the URL
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    init();
  },[user.id]);

  const autoJoinByInvite = async (code) => {
    try {
      const {data:leagueData,error:findErr} = await supabase
        .from("leagues").select("id,name").eq("invite_code",code.trim()).single();
      if (findErr || !leagueData) return; // silently fail — invalid code
      // Check if already member
      const {data:existing} = await supabase
        .from("league_members").select("id").eq("league_id",leagueData.id).eq("user_id",user.id).single();
      if (existing) {
        // Already a member — just select the league
        setSelectedLeagueId(leagueData.id);
        return;
      }
      // Add as member
      const {error:addErr} = await supabase
        .from("league_members").insert({league_id:leagueData.id,user_id:user.id,role:"member"});
      if (addErr) throw addErr;
      await loadUserLeagues();
      setSelectedLeagueId(leagueData.id);
      setInviteCode("");
      setJoinMsg(`Welcome to ${leagueData.name}!`);
    } catch (err) {
      console.error("Auto-join error:", err);
      // Don't block — user can still manually join
    }
  };

  const loadUserLeagues = async () => {
    try {
      const {data,error:err} = await supabase
        .from("league_members")
        .select("league_id,role,leagues(id,name,invite_code,created_by)")
        .eq("user_id",user.id);

      if (err) throw err;
      const userLeagues = data?.map(m=>({...m.leagues,_userRole:m.role})).filter(Boolean) || [];
      setLeagues(userLeagues);
      setLoading(false);
    } catch (err) {
      console.error("Load leagues error:",err);
      setLoading(false);
    }
  };

  const handleCreateLeague = async (e) => {
    e.preventDefault();
    setError("");
    if (!leagueName.trim()) {
      setError("League name required");
      return;
    }
    try {
      // Create league (created_by required for RLS, trigger auto-adds user as admin)
      const {data:leagueData,error:leagueErr} = await supabase
        .from("leagues")
        .insert({name:leagueName.trim(),created_by:user.id})
        .select()
        .single();

      if (leagueErr) throw leagueErr;

      const leagueId = leagueData.id;

      // Note: handle_new_league trigger auto-inserts user as admin member

      // Create default Season 1
      const {data:seasonData,error:seasonErr} = await supabase
        .from("seasons")
        .insert({league_id:leagueId,name:"Season 1",start_date:new Date().toISOString().split("T")[0],active:true})
        .select()
        .single();

      if (seasonErr) throw seasonErr;

      // No default roster — players are created when users join and claim/create their identity

      // Refresh and select
      await loadUserLeagues();
      setSelectedLeagueId(leagueId);
      setShowCreate(false);
      setLeagueName("");
    } catch (err) {
      setError(err.message || "Failed to create league");
    }
  };

  const handleJoinLeague = async (e) => {
    e.preventDefault();
    setError("");
    if (!inviteCode.trim()) {
      setError("Invite code required");
      return;
    }
    try {
      // Find league by invite_code
      const {data:leagues,error:findErr} = await supabase
        .from("leagues")
        .select("id")
        .eq("invite_code",inviteCode.trim())
        .single();

      if (findErr || !leagues) throw new Error("Invalid invite code");

      const leagueId = leagues.id;

      // Check if already member
      const {data:existing} = await supabase
        .from("league_members")
        .select("id")
        .eq("league_id",leagueId)
        .eq("user_id",user.id)
        .single();

      if (existing) {
        setSelectedLeagueId(leagueId);
        setShowJoin(false);
        setInviteCode("");
        return;
      }

      // Add as member
      const {error:addErr} = await supabase
        .from("league_members")
        .insert({league_id:leagueId,user_id:user.id,role:"member"});

      if (addErr) throw addErr;

      // Refresh and select
      await loadUserLeagues();
      setSelectedLeagueId(leagueId);
      setShowJoin(false);
      setInviteCode("");
    } catch (err) {
      setError(err.message || "Failed to join league");
    }
  };

  const handleRenameLeague = async (leagueId) => {
    if(!editLeagueName.trim()) return;
    try {
      const {error:err} = await supabase.from("leagues").update({name:editLeagueName.trim()}).eq("id",leagueId);
      if(err) throw err;
      setEditingLeagueId(null);
      setEditLeagueName("");
      await loadUserLeagues();
    } catch(err) { setError(err.message || "Failed to rename league"); }
  };

  const handleDeleteLeague = async (leagueId, leagueName) => {
    const typed = prompt(`This will permanently delete "${leagueName}" and ALL its data (players, matches, seasons).\n\nType the league name to confirm:`);
    if(!typed || typed.trim() !== leagueName.trim()) { if(typed !== null) alert("League name didn't match. Delete cancelled."); return; }
    try {
      const {error:err} = await supabase.from("leagues").delete().eq("id",leagueId);
      if(err) throw err;
      await loadUserLeagues();
    } catch(err) { setError(err.message || "Failed to delete league"); }
  };

  if (loading) return <div style={{background:BG,width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:TX}}>Loading leagues...</div>;

  if (selectedLeagueId && leagues.some(l=>l.id===selectedLeagueId)) {
    const switchLeague = () => setSelectedLeagueId(null);
    return children(selectedLeagueId, switchLeague);
  }

  return (
    <div style={{background:BG,minHeight:"100vh",padding:"20px",fontFamily:"'Outfit',sans-serif",color:TX}}>
      <div style={{maxWidth:"420px",margin:"0 auto",paddingTop:"20px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <PadelLogoSmall/>
            <h1 style={{fontSize:20,fontWeight:900,letterSpacing:2}}><span style={{color:A}}>Padel</span>Hub</h1>
          </div>
          <p style={{color:MT,fontSize:11,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginTop:6}}>Select a League</p>
        </div>

        {/* Join success message */}
        {joinMsg && (
          <div style={{marginBottom:16,padding:"12px 16px",background:`${A}15`,border:`1px solid ${A}40`,borderRadius:12,color:A,fontSize:13,fontWeight:600,textAlign:"center"}}>
            {joinMsg}
          </div>
        )}

        {/* Existing leagues */}
        {leagues.length > 0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Your Leagues</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {leagues.map(l=>(
                <div key={l.id} style={{background:CD,border:`1px solid ${BD}`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
                  {editingLeagueId===l.id ? (
                    <div style={{flex:1,display:"flex",gap:6,alignItems:"center"}}>
                      <input value={editLeagueName} onChange={e=>setEditLeagueName(e.target.value)} style={{flex:1,padding:"6px 10px",background:CD2,border:`1px solid ${BD}`,borderRadius:8,color:TX,fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
                      <button onClick={()=>handleRenameLeague(l.id)} style={{padding:"6px 10px",background:A,border:"none",borderRadius:8,color:"#000",fontSize:11,fontWeight:700,cursor:"pointer"}}>Save</button>
                      <button onClick={()=>setEditingLeagueId(null)} style={{padding:"6px 10px",background:"transparent",border:`1px solid ${BD}`,borderRadius:8,color:MT,fontSize:11,fontWeight:600,cursor:"pointer"}}>✕</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={()=>setSelectedLeagueId(l.id)} style={{flex:1,background:"none",border:"none",color:TX,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:18}}>🏟️</span> {l.name}
                      </button>
                      <button onClick={()=>{const url=`${window.location.origin}${window.location.pathname}?invite=${l.invite_code}`;if(navigator.share)navigator.share({title:"Join my PadelHub league",text:`Join "${l.name}" on PadelHub!`,url});else{navigator.clipboard.writeText(url);alert("Invite link copied!");}}} style={{background:"none",border:`1px solid ${A}40`,borderRadius:6,color:A,fontSize:10,fontWeight:600,cursor:"pointer",padding:"4px 8px",fontFamily:"'Outfit',sans-serif"}} title="Share invite link">Invite</button>
                      {(l.created_by===user.id || l._userRole==="admin") && <button onClick={()=>{setEditingLeagueId(l.id);setEditLeagueName(l.name);}} style={{background:"none",border:`1px solid ${BD}`,borderRadius:6,color:MT,fontSize:10,fontWeight:600,cursor:"pointer",padding:"4px 8px",fontFamily:"'Outfit',sans-serif"}} title="Edit">Edit</button>}
                      {l.created_by===user.id && <button onClick={()=>handleDeleteLeague(l.id,l.name)} style={{background:"none",border:`1px solid ${DG}40`,borderRadius:6,color:DG,fontSize:10,fontWeight:600,cursor:"pointer",padding:"4px 8px",fontFamily:"'Outfit',sans-serif"}} title="Delete">Delete</button>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create league */}
        <div style={{marginBottom:12,padding:"16px",background:CD,border:`1px solid ${BD}`,borderRadius:14}}>
          <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Create a League</div>
          <form onSubmit={handleCreateLeague} style={{display:"flex",gap:8}}>
            <input
              type="text"
              value={leagueName}
              onChange={(e)=>setLeagueName(e.target.value)}
              placeholder="League name"
              style={{
                flex:1,
                padding:"10px 14px",
                background:CD2,
                border:`1px solid ${BD}`,
                borderRadius:10,
                color:TX,
                fontSize:13,
                fontFamily:"'Outfit',sans-serif",
                outline:"none",
              }}
            />
            <button
              type="submit"
              style={{
                padding:"10px 18px",
                background:A,
                border:"none",
                borderRadius:10,
                color:"#000",
                fontWeight:700,
                fontSize:13,
                cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",
              }}
            >
              Create
            </button>
          </form>
        </div>

        {/* Join league */}
        <div style={{padding:"16px",background:CD,border:`1px solid ${BD}`,borderRadius:14}}>
          <div style={{fontSize:11,color:MT,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Join a League</div>
          <form onSubmit={handleJoinLeague} style={{display:"flex",gap:8}}>
            <input
              type="text"
              value={inviteCode}
              onChange={(e)=>setInviteCode(e.target.value)}
              placeholder="Invite code"
              style={{
                flex:1,
                padding:"10px 14px",
                background:CD2,
                border:`1px solid ${BD}`,
                borderRadius:10,
                color:TX,
                fontSize:13,
                fontFamily:"'Outfit',sans-serif",
                outline:"none",
              }}
            />
            <button
              type="submit"
              style={{
                padding:"10px 18px",
                background:A,
                border:"none",
                borderRadius:10,
                color:"#000",
                fontWeight:700,
                fontSize:13,
                cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",
              }}
            >
              Join
            </button>
          </form>
        </div>

        {error && <div style={{marginTop:14,color:DG,fontSize:12,padding:"10px 14px",background:`${DG}15`,borderRadius:10,border:`1px solid ${DG}30`}}>{error}</div>}
      </div>
    </div>
  );
}
