import React, { useState, useEffect } from "react";
import { supabase } from '../supabase';
import { A, BG, CD, CD2, BD, TX, MT, DG } from '../theme';
import { PadelLogo, PadelLogoSmall } from './icons';

export function AuthGate({children}){
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  // authMode: "signin" | "signup"
  const [authMode,setAuthMode]=useState("signin");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [error,setError]=useState("");
  const [successMsg,setSuccessMsg]=useState("");

  useEffect(()=>{
    // Handle auth callback (magic link / OAuth redirect)
    const handleAuthCallback = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      if (hash && hash.includes("access_token")) {
        // Supabase will auto-handle this via onAuthStateChange
        // Clean the URL
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      if (params.get("code")) {
        // OAuth code exchange — Supabase handles this automatically
        const cleanUrl = window.location.pathname + (params.get("invite") ? `?invite=${params.get("invite")}` : "");
        window.history.replaceState(null, "", cleanUrl);
      }
    };
    handleAuthCallback();

    // Check current auth state
    const checkAuth = async () => {
      const {data:{session}} = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };
    checkAuth();

    // Listen for auth changes
    const {data:{subscription}} = supabase.auth.onAuthStateChange((evt,session)=>{
      setUser(session?.user || null);
    });
    return ()=>subscription?.unsubscribe();
  },[]);

  const clearForm = () => { setError(""); setSuccessMsg(""); };

  // Forgot Password
  const handleForgotPassword = async () => {
    clearForm();
    if (!email.trim()) { setError("Enter your email above, then tap 'Forgot password?'"); return; }
    try {
      const {error:err} = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + window.location.pathname + window.location.search
      });
      if (err) throw err;
      setSuccessMsg("Password reset link sent! Check your email.");
    } catch (err) { setError(err.message || "Failed to send reset link"); }
  };

  // Email/Password Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    clearForm();
    if (!email.trim()) { setError("Please enter your email"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    try {
      const {data,error:err} = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() || email.trim().split("@")[0] }, emailRedirectTo: window.location.origin + window.location.pathname + window.location.search }
      });
      if (err) throw err;
      if (data?.user?.identities?.length === 0) {
        setError("An account with this email already exists. Try signing in.");
      } else {
        setSuccessMsg("Account created! Check your email to confirm, or sign in directly.");
        setPassword("");
      }
    } catch (err) { setError(err.message || "Failed to create account"); }
  };

  // Email/Password Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    clearForm();
    if (!email.trim()) { setError("Please enter your email"); return; }
    if (!password) { setError("Please enter your password"); return; }
    try {
      const {error:err} = await supabase.auth.signInWithPassword({email:email.trim(),password});
      if (err) throw err;
    } catch (err) { setError(err.message || "Failed to sign in"); }
  };

  // Google OAuth (ready for when configured)
  const handleGoogleSignIn = async () => {
    clearForm();
    try {
      const {error:err} = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + window.location.pathname + window.location.search, queryParams: { prompt: "select_account" } }
      });
      if (err) throw err;
    } catch (err) { setError(err.message || "Google sign-in failed"); }
  };

  if (loading) return <div style={{background:BG,width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:TX}}>Loading...</div>;

  if (!user) {
    const inputStyle = {
      width:"100%",padding:"12px 14px",background:CD,border:`1px solid ${BD}`,borderRadius:10,
      color:TX,fontSize:14,fontFamily:"'Outfit',sans-serif",boxSizing:"border-box",outline:"none",
    };
    const labelStyle = {display:"block",color:MT,fontSize:11,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:6};
    const btnPrimary = {
      padding:"14px",background:`linear-gradient(135deg,${A},${A}cc)`,border:"none",borderRadius:12,
      color:"#000",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"'Outfit',sans-serif",
      textTransform:"uppercase",letterSpacing:1,width:"100%",
    };
    const linkStyle = {background:"none",border:"none",color:A,fontSize:12,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textDecoration:"underline"};
    const btnGoogle = {
      padding:"12px",background:"transparent",border:`1px solid ${TX}40`,borderRadius:10,
      color:TX,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Outfit',sans-serif",width:"100%",
    };

    return (
      <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Outfit',sans-serif"}}>
        <div style={{maxWidth:"380px",width:"100%"}}>
          {/* Logo + Wordmark (no tagline) */}
          <div style={{textAlign:"center",marginBottom:"28px"}}>
            <div style={{display:"flex",justifyContent:"center"}}><PadelLogo/></div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",marginTop:"16px"}}>
              <PadelLogoSmall/>
              <h1 style={{fontSize:22,fontWeight:900,letterSpacing:2,color:TX,fontFamily:"'Outfit',sans-serif"}}><span style={{color:TX}}>Padel</span><span style={{color:A}}>Hub</span></h1>
            </div>
          </div>

          {/* Error / Success Messages */}
          {error && <div style={{color:DG,fontSize:12,padding:"10px 14px",background:`${DG}15`,borderRadius:10,border:`1px solid ${DG}30`,marginBottom:12}}>{error}</div>}
          {successMsg && <div style={{color:A,fontSize:12,padding:"10px 14px",background:`${A}15`,borderRadius:10,border:`1px solid ${A}30`,marginBottom:12}}>{successMsg}</div>}

          {/* SIGN IN VIEW (default) */}
          {authMode==="signin" && (
            <form onSubmit={handleSignIn} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Your password" style={inputStyle}/>
              </div>
              <button type="submit" style={btnPrimary}>Sign In</button>
              <div style={{textAlign:"center",marginTop:4}}>
                <button type="button" onClick={handleForgotPassword} style={linkStyle}>Forgot password?</button>
              </div>
              <div style={{textAlign:"center",marginTop:2}}>
                <span style={{color:MT,fontSize:12}}>Don't have an account? </span>
                <button type="button" onClick={()=>{setAuthMode("signup");clearForm();}} style={linkStyle}>Sign Up</button>
              </div>
            </form>
          )}

          {/* SIGN UP VIEW */}
          {authMode==="signup" && (
            <form onSubmit={handleSignUp} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div>
                <label style={labelStyle}>Display Name</label>
                <input type="text" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Your name (e.g. Moody)" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Min 6 characters" style={inputStyle}/>
              </div>
              <button type="submit" style={btnPrimary}>Create Account</button>
              <div style={{textAlign:"center",marginTop:4}}>
                <span style={{color:MT,fontSize:12}}>Already have an account? </span>
                <button type="button" onClick={()=>{setAuthMode("signin");clearForm();}} style={linkStyle}>Sign In</button>
              </div>
            </form>
          )}

          {/* Divider + Google Sign-In */}
          <div style={{marginTop:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{flex:1,height:1,background:BD}}/>
              <span style={{color:MT,fontSize:11,fontWeight:600,letterSpacing:1}}>OR</span>
              <div style={{flex:1,height:1,background:BD}}/>
            </div>
            <button onClick={handleGoogleSignIn} style={btnGoogle}>
              <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return typeof children === 'function' ? children(user) : children;
}
