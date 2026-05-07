import React, { useState, useEffect, useRef } from "react";
import { supabase } from '../supabase';
import { PadelLogoSmall } from './icons';
import Icon from './Icon';

// Map raw Supabase error messages to user-friendly ones
function friendlyAuthError(msg) {
  if (!msg) return "Something went wrong. Please try again.";
  const m = msg.toLowerCase();
  if (m.includes("email rate limit exceeded") || m.includes("rate limit"))
    return "Too many attempts. Please wait a few minutes before trying again.";
  if (m.includes("invalid login credentials"))
    return "Incorrect email or password. Please try again, or tap 'Forgot password?' to reset.";
  if (m.includes("email not confirmed"))
    return "Your email hasn't been confirmed yet. Check your inbox for the confirmation link, or tap 'Resend confirmation' below.";
  if (m.includes("user already registered") || m.includes("already exists"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("signup is not allowed") || m.includes("signups not allowed"))
    return "New signups are currently disabled. Please contact the admin.";
  if (m.includes("password") && m.includes("at least"))
    return msg;
  return msg;
}

// Phase 3 password input with .pwtog eye toggle, replaces inline-style PasswordField
function PasswordField({ value, onChange, placeholder, autoFocus, show, setShow }) {
  return (
    <div className="fwrap">
      <input
        className="finput pw"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="pwtog"
        onClick={() => setShow(s => !s)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        <Icon name={show ? "eye-off" : "eye"} size={17} />
      </button>
    </div>
  );
}

export function AuthGate({children}){
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [authMode,setAuthMode]=useState("signin");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [showConfirmPassword,setShowConfirmPassword]=useState(false);
  const [displayName,setDisplayName]=useState("");
  const [error,setError]=useState("");
  const [successMsg,setSuccessMsg]=useState("");
  const [recoveryUser,setRecoveryUser]=useState(null);
  const [resetLoading,setResetLoading]=useState(false);
  const isRecoveryRef = useRef(false);

  useEffect(()=>{
    const {data:{subscription}} = supabase.auth.onAuthStateChange((evt,session)=>{
      if (evt === "PASSWORD_RECOVERY") {
        isRecoveryRef.current = true;
        setRecoveryUser(session?.user || null);
        setAuthMode("recovery");
        setError("");
        setSuccessMsg("Set your new password below.");
        setLoading(false);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        return;
      }
      if (evt === "SIGNED_OUT") {
        isRecoveryRef.current = false;
        setUser(null);
        setRecoveryUser(null);
      } else {
        if (!isRecoveryRef.current) {
          setUser(session?.user || null);
        }
      }
    });

    const handleAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("code")) {
        const cleanUrl = window.location.pathname + (params.get("invite") ? `?invite=${params.get("invite")}` : "");
        window.history.replaceState(null, "", cleanUrl);
      }
    };
    handleAuthCallback();

    const checkAuth = async () => {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);
        const hash = window.location.hash;
        if (hash && hash.includes("type=recovery")) return;
        setUser(result.data?.session?.user || null);
      } catch {
        setUser(null);
      }
      setLoading(false);
    };
    checkAuth();

    return ()=>subscription?.unsubscribe();
  },[]);

  const clearForm = () => { setError(""); setSuccessMsg(""); };

  const handleForgotPassword = async () => {
    clearForm();
    if (!email.trim()) { setError("Enter your email above, then tap 'Forgot password?'"); return; }
    try {
      const {error:err} = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + window.location.pathname + window.location.search
      });
      if (err) throw err;
      setSuccessMsg("Password reset link sent! Check your email. The link expires in 1 hour.");
    } catch (err) { setError(friendlyAuthError(err.message)); }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    clearForm();
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }
    setResetLoading(true);
    try {
      const {error:err} = await supabase.auth.updateUser({ password });
      if (err) throw err;
      isRecoveryRef.current = false;
      await supabase.auth.signOut();
      setRecoveryUser(null);
      setAuthMode("signin");
      setPassword("");
      setConfirmPassword("");
      setSuccessMsg("Password updated! Sign in with your new password.");
    } catch (err) {
      setError(friendlyAuthError(err.message));
    } finally { setResetLoading(false); }
  };

  const handleResendConfirmation = async () => {
    clearForm();
    if (!email.trim()) { setError("Enter your email above first"); return; }
    try {
      const {error:err} = await supabase.auth.resend({ type: "signup", email: email.trim() });
      if (err) throw err;
      setSuccessMsg("Confirmation email resent! Check your inbox.");
    } catch (err) { setError(friendlyAuthError(err.message)); }
  };

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
        setError("An account with this email already exists. Try signing in, or use 'Forgot password?' to reset.");
      } else {
        setSuccessMsg("Account created! You can sign in now.");
        setPassword("");
      }
    } catch (err) { setError(friendlyAuthError(err.message)); }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    clearForm();
    if (!email.trim()) { setError("Please enter your email"); return; }
    if (!password) { setError("Please enter your password"); return; }
    try {
      const {error:err} = await supabase.auth.signInWithPassword({email:email.trim(),password});
      if (err) throw err;
    } catch (err) { setError(friendlyAuthError(err.message)); }
  };

  const handleGoogleSignIn = async () => {
    clearForm();
    try {
      const {error:err} = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + window.location.pathname + window.location.search, queryParams: { prompt: "select_account" } }
      });
      if (err) throw err;
    } catch (err) { setError(friendlyAuthError(err.message)); }
  };

  useEffect(() => {
    if (!loading) {
      const splash = document.getElementById('splash');
      if (splash) splash.style.display = 'none';
    }
  }, [loading]);

  if (loading) return null;

  // Recovery flow — same .lscreen shell as login
  if (authMode === "recovery" || recoveryUser) {
    return (
      <div className="lscreen">
        <div className="lbg"/>
        <div className="lhero">
          <div className="llogobox"><PadelLogoSmall size={42}/></div>
          <div className="lbrand">Padel<span className="accent">Hub</span></div>
          <div className="ltag">Set a new password</div>
        </div>
        <form className="lform" onSubmit={handleSetNewPassword}>
          {error && <div className="lerr">{error}</div>}
          {successMsg && <div className="lok">{successMsg}</div>}
          <div>
            <label className="flbl">New Password</label>
            <PasswordField value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Min 6 characters" autoFocus show={showPassword} setShow={setShowPassword}/>
          </div>
          <div>
            <label className="flbl">Confirm Password</label>
            <PasswordField value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Re-enter password" show={showConfirmPassword} setShow={setShowConfirmPassword}/>
          </div>
          <button type="submit" className="lcta" disabled={resetLoading}>
            {resetLoading ? "Updating…" : "Update Password"}
          </button>
          <div style={{textAlign:"center"}}>
            <button type="button" className="llink" onClick={async()=>{isRecoveryRef.current=false;await supabase.auth.signOut();setRecoveryUser(null);setAuthMode("signin");clearForm();}}>
              Cancel — back to Sign In
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="lscreen">
        <div className="lbg"/>
        <div className="lhero">
          <div className="llogobox"><PadelLogoSmall size={42}/></div>
          <div className="lbrand">Padel<span className="accent">Hub</span></div>
          <div className="ltag">Your league. Your rankings.</div>
        </div>

        {authMode === "signin" && (
          <form className="lform" onSubmit={handleSignIn}>
            {error && <div className="lerr">{error}</div>}
            {successMsg && <div className="lok">{successMsg}</div>}
            <div>
              <label className="flbl">Email</label>
              <input className="finput" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email"/>
            </div>
            <div>
              <label className="flbl">Password</label>
              <PasswordField value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter password" show={showPassword} setShow={setShowPassword}/>
            </div>
            <button type="submit" className="lcta">Sign In</button>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <button type="button" className="llink" onClick={handleForgotPassword}>Forgot password?</button>
              <button type="button" className="llink" onClick={handleResendConfirmation}>Resend confirmation</button>
            </div>
            <div style={{textAlign:"center",fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>
              Don't have an account?{" "}
              <button type="button" className="llink" onClick={()=>{setAuthMode("signup");clearForm();}}>Sign Up</button>
            </div>
            <div className="or-div">or</div>
            <button type="button" className="gbg2" onClick={handleGoogleSignIn}>
              <span style={{width:18,height:18,borderRadius:"50%",background:"linear-gradient(135deg,#4285f4,#ea4335,#fbbc05,#34a853)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0}}>G</span>
              Continue with Google
            </button>
          </form>
        )}

        {authMode === "signup" && (
          <form className="lform" onSubmit={handleSignUp}>
            {error && <div className="lerr">{error}</div>}
            {successMsg && <div className="lok">{successMsg}</div>}
            <div>
              <label className="flbl">Display Name</label>
              <input className="finput" type="text" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Your name (e.g. Moody)" autoComplete="name"/>
            </div>
            <div>
              <label className="flbl">Email</label>
              <input className="finput" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email"/>
            </div>
            <div>
              <label className="flbl">Password</label>
              <PasswordField value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Min 6 characters" show={showPassword} setShow={setShowPassword}/>
            </div>
            <button type="submit" className="lcta">Create Account</button>
            <div style={{textAlign:"center",fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>
              Already have an account?{" "}
              <button type="button" className="llink" onClick={()=>{setAuthMode("signin");clearForm();}}>Sign In</button>
            </div>
            <div className="or-div">or</div>
            <button type="button" className="gbg2" onClick={handleGoogleSignIn}>
              <span style={{width:18,height:18,borderRadius:"50%",background:"linear-gradient(135deg,#4285f4,#ea4335,#fbbc05,#34a853)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0}}>G</span>
              Continue with Google
            </button>
          </form>
        )}
      </div>
    );
  }

  return typeof children === 'function' ? children(user) : children;
}
