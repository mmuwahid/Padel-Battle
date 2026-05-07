import React, { useState, useEffect, useRef } from "react";
import { supabase } from '../supabase';
import { PadelLogoSmall } from './icons';

export function LeagueGate({user,children,showToast}){
  const [leagues,setLeagues]=useState([]);
  const [selectedLeagueId,setSelectedLeagueId]=useState(null);
  const [loading,setLoading]=useState(true);
  const [leagueName,setLeagueName]=useState("");
  const [inviteCode,setInviteCode]=useState("");
  const [error,setError]=useState("");
  const [editingLeagueId,setEditingLeagueId]=useState(null);
  const [editLeagueName,setEditLeagueName]=useState("");
  const [joinMsg,setJoinMsg]=useState("");
  const [creating,setCreating]=useState(false);
  const [joining,setJoining]=useState(false);
  const [toast,setToast]=useState(null);
  const _toast=(msg,type="success")=>{if(showToast)showToast(msg,type);else{setToast({msg,type});setTimeout(()=>setToast(null),3000);}};

  useEffect(()=>{
    const init = async () => {
      await loadUserLeagues();
      const params = new URLSearchParams(window.location.search);
      const code = params.get("invite");
      if (code) {
        setInviteCode(code);
        await autoJoinByInvite(code);
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    init();
  },[user.id]);

  const autoJoinByInvite = async (code) => {
    try {
      const {data:rpcData,error:findErr} = await supabase.rpc("lookup_league_by_invite",{code:code.trim()});
      const leagueData=rpcData?.[0]||null;
      if (findErr || !leagueData) return;
      const {data:existing} = await supabase
        .from("league_members").select("id").eq("league_id",leagueData.id).eq("user_id",user.id).single();
      if (existing) {
        setSelectedLeagueId(leagueData.id);
        return;
      }
      const {error:addErr} = await supabase
        .from("league_members").insert({league_id:leagueData.id,user_id:user.id,role:"member"});
      if (addErr) throw addErr;
      const dn = user.user_metadata?.display_name || user.email?.split("@")[0] || "Someone";
      supabase.functions.invoke("push-notify", {
        body: { league_id: leagueData.id, type: "members", title: "New Member Joined!", body: `${dn} joined the league`, exclude_user_id: user.id },
      }).catch(() => {});
      await loadUserLeagues();
      setSelectedLeagueId(leagueData.id);
      setInviteCode("");
      setJoinMsg(`Welcome to ${leagueData.name}!`);
    } catch (_err) {}
  };

  // S058 #41: auto-skip picker for users in exactly 1 league.
  const autoSelectedRef = useRef(false);
  const loadUserLeagues = async () => {
    try {
      const {data,error:err} = await supabase
        .from("league_members")
        .select("league_id,role,leagues(id,name,invite_code,created_by)")
        .eq("user_id",user.id);

      if (err) throw err;
      const userLeagues = data?.map(m=>({...m.leagues,_userRole:m.role})).filter(Boolean) || [];
      setLeagues(userLeagues);
      if (!autoSelectedRef.current && userLeagues.length === 1) {
        autoSelectedRef.current = true;
        setSelectedLeagueId(userLeagues[0].id);
      }
      setLoading(false);
    } catch (_err) {
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
    setCreating(true);
    try {
      const {data:leagueData,error:leagueErr} = await supabase
        .from("leagues")
        .insert({name:leagueName.trim(),created_by:user.id})
        .select()
        .single();

      if (leagueErr) throw leagueErr;
      const leagueId = leagueData.id;
      const {error:seasonErr} = await supabase
        .from("seasons")
        .insert({league_id:leagueId,name:"Season 1",start_date:new Date().toISOString().split("T")[0],active:true})
        .select()
        .single();
      if (seasonErr) throw seasonErr;
      await loadUserLeagues();
      setSelectedLeagueId(leagueId);
      setLeagueName("");
    } catch (err) {
      setError(err.message || "Failed to create league");
    }
    setCreating(false);
  };

  const handleJoinLeague = async (e) => {
    e.preventDefault();
    setError("");
    if (!inviteCode.trim()) {
      setError("Invite code required");
      return;
    }
    setJoining(true);
    try {
      const {data:rpcData,error:findErr} = await supabase.rpc("lookup_league_by_invite",{code:inviteCode.trim()});
      const foundLeague=rpcData?.[0]||null;
      if (findErr || !foundLeague) throw new Error("Invalid invite code");
      const leagueId = foundLeague.id;
      const {data:existing} = await supabase
        .from("league_members").select("id").eq("league_id",leagueId).eq("user_id",user.id).single();
      if (existing) {
        setSelectedLeagueId(leagueId);
        setInviteCode("");
        return;
      }
      const {error:addErr} = await supabase
        .from("league_members").insert({league_id:leagueId,user_id:user.id,role:"member"});
      if (addErr) throw addErr;
      const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Someone";
      supabase.functions.invoke("push-notify", {
        body: { league_id: leagueId, type: "members", title: "New Member Joined!", body: `${displayName} joined the league`, exclude_user_id: user.id },
      }).catch(() => {});
      await loadUserLeagues();
      setSelectedLeagueId(leagueId);
      setInviteCode("");
    } catch (err) {
      setError(err.message || "Failed to join league");
    }
    setJoining(false);
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

  const [deleteConfirmId,setDeleteConfirmId]=useState(null);
  const [deleteTyped,setDeleteTyped]=useState("");
  const handleDeleteLeague = async (leagueId, leagueName) => {
    if(deleteConfirmId!==leagueId){setDeleteConfirmId(leagueId);setDeleteTyped("");return;}
    if(deleteTyped.trim()!==leagueName.trim()){_toast("Name didn't match","error");return;}
    try {
      const {error:err} = await supabase.from("leagues").delete().eq("id",leagueId);
      if(err) throw err;
      await loadUserLeagues();
    } catch(err) { setError(err.message || "Failed to delete league"); }
  };

  if (loading) {
    return (
      <div className="lscreen">
        <div className="lbg"/>
        <div className="lhero">
          <div className="llogobox"><PadelLogoSmall size={42}/></div>
          <div className="ltag">Loading leagues…</div>
        </div>
      </div>
    );
  }

  if (selectedLeagueId && leagues.some(l=>l.id===selectedLeagueId)) {
    const switchLeague = () => setSelectedLeagueId(null);
    return children(selectedLeagueId, switchLeague);
  }

  return (
    <div className="lscreen">
      <div className="lbg"/>
      <div className="lhero" style={{padding:"32px 32px 18px"}}>
        <div className="llogobox" style={{width:60,height:60,marginBottom:14}}><PadelLogoSmall size={36}/></div>
        <div className="lbrand" style={{fontSize:24}}>Padel<span className="accent">Hub</span></div>
        <div className="ltag">Select a League</div>
      </div>

      <div className="lform">
        {joinMsg && <div className="lok">{joinMsg}</div>}
        {error && <div className="lerr">{error}</div>}

        {leagues.length > 0 && (
          <div>
            <div className="flbl" style={{marginBottom:8}}>Your Leagues</div>
            <div className="lgrow">
              {leagues.map(l=>(
                <div key={l.id} className="lgcard">
                  {editingLeagueId===l.id ? (
                    <>
                      <input className="finput" style={{flex:1,padding:"8px 12px",fontSize:13}} value={editLeagueName} onChange={e=>setEditLeagueName(e.target.value)}/>
                      <div className="lgactions">
                        <button className="lgactionbtn accent" onClick={()=>handleRenameLeague(l.id)}>Save</button>
                        <button className="lgactionbtn" onClick={()=>setEditingLeagueId(null)}>✕</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button onClick={()=>setSelectedLeagueId(l.id)} style={{flex:1,background:"none",border:"none",color:"var(--text)",fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:10,padding:0,minWidth:0}}>
                        <span style={{fontSize:18,flexShrink:0}}>🏟️</span>
                        <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.name}</span>
                      </button>
                      <div className="lgactions">
                        {(l.created_by===user.id || l._userRole==="admin") && (
                          <button className="lgactionbtn accent" title="Share invite link" onClick={()=>{
                            const url=`${window.location.origin}${window.location.pathname}?invite=${l.invite_code}`;
                            if(navigator.share)navigator.share({title:"Join my PadelHub league",text:`Join "${l.name}" on PadelHub!`,url}).catch(()=>{});
                            else{navigator.clipboard.writeText(url);if(showToast)showToast("Invite link copied!");}
                          }}>Invite</button>
                        )}
                        {(l.created_by===user.id || l._userRole==="admin") && (
                          <button className="lgactionbtn" title="Edit" onClick={()=>{setEditingLeagueId(l.id);setEditLeagueName(l.name);}}>Edit</button>
                        )}
                        {l.created_by===user.id && (
                          deleteConfirmId===l.id ? (
                            <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                              <input className="finput" style={{width:140,padding:"4px 6px",fontSize:10,borderColor:"var(--danger-glow)"}} value={deleteTyped} onChange={e=>setDeleteTyped(e.target.value)} placeholder={"Type \""+l.name+"\" to delete"}/>
                              <button className="lgactionbtn danger" onClick={()=>handleDeleteLeague(l.id,l.name)}>Confirm</button>
                              <button className="lgactionbtn" onClick={()=>{setDeleteConfirmId(null);setDeleteTyped("");}}>X</button>
                            </div>
                          ) : (
                            <button className="lgactionbtn danger" title="Delete" onClick={()=>handleDeleteLeague(l.id,l.name)}>Delete</button>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="lgsection">
          <div className="lgsection-label">Create a League</div>
          <form onSubmit={handleCreateLeague} className="lginline">
            <input className="finput" type="text" value={leagueName} onChange={(e)=>setLeagueName(e.target.value)} placeholder="League name"/>
            <button type="submit" className="lcta-sm" disabled={creating}>{creating?"Creating…":"Create"}</button>
          </form>
        </div>

        <div className="lgsection">
          <div className="lgsection-label">Join a League</div>
          <form onSubmit={handleJoinLeague} className="lginline">
            <input className="finput" type="text" value={inviteCode} onChange={(e)=>setInviteCode(e.target.value)} placeholder="Invite code"/>
            <button type="submit" className="lcta-sm" disabled={joining}>{joining?"Joining…":"Join"}</button>
          </form>
        </div>

        <div style={{textAlign:"center",marginTop:8}}>
          <button className="llink danger" onClick={async()=>{await supabase.auth.signOut();}}>Sign Out</button>
        </div>

        {toast && <div role="alert" aria-live="polite" style={{position:"fixed",top:`calc(env(safe-area-inset-top, 0px) + 12px)`,left:"50%",transform:"translateX(-50%)",padding:"10px 20px",borderRadius:"var(--r-md)",background:toast.type==="error"?"var(--danger)":"var(--accent)",color:"#fff",fontSize:12,fontWeight:700,zIndex:9999,boxShadow:"0 4px 12px rgba(0,0,0,0.3)",fontFamily:"'Outfit',sans-serif"}}>{toast.msg}</div>}
      </div>
    </div>
  );
}
