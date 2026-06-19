# Issue #46 — Phase 3: Login + League Picker

> **Status:** PLAN — drafted S060 (post-Phase-2 ship), to be built in same session if user keeps going.
> **Issue:** mmuwahid/Padel-Battle#46 — UI Redesign
> **Approved mockup:** [`docs/PadelHub_Complete_v2.jsx`](../docs/PadelHub_Complete_v2.jsx) (LoginScreen at lines 1023–1056, OnboardingScreen at 1061–1185, CSS at 186–208)
> **Spec section:** "Phase 3 — Login + Onboarding"
> **Build session:** S060 continuation (or S061 if fresh session)

---

## Phase 3 goal

Apply the new design system (Phase 1 tokens + Phase 2 typography) to the **AuthGate** and **LeagueGate** screens. Visual-only refactor — no behavioral changes, no DB additions, no new auth flows.

The spec's full **OnboardingScreen** with 3 steps (claim player + profile fields + join league) **does NOT belong in Phase 3** — it requires:
- Player claim UX before league context exists (refactors flow)
- New DB columns: `profiles.date_of_birth`, `gender`, `playing_side`
- New `players.gender` / `players.position` columns

All of those are **Phase 11 (the only DB-touching phase)**. Phase 3 is purely visual.

**Success criteria:**
- AuthGate LoginScreen + Signup + Recovery views all use `.lscreen/.lhero/.lform/.flbl/.finput/.fwrap/.pwtog/.lcta/.gbg2/.or-div` classes
- LeagueGate picker uses the same form-input language (`.flbl/.finput/.lcta`)
- Animated radial-gradient + grid backdrop (`.lbg`)
- Glow-pulse logo box (`@keyframes pg`)
- Mono-font labels, Syne-font heads
- All existing auth flows still work: email/password sign-in, sign-up, password recovery, Google OAuth, forgot-password, resend-confirmation
- All existing league flows still work: list, create, join, rename, delete, share-invite, sign-out, auto-skip on 1-league users (S058 #41)

---

## In scope

1. **AuthGate.jsx restyle** — replace inline-styled login/signup/recovery views with class-based markup. Drop the inline `inputStyle / labelStyle / btnPrimary / linkStyle / btnGoogle` consts; use new CSS classes throughout.
2. **LeagueGate.jsx restyle** — same form-input language, plus a hero block with the logo + "Select a league" tagline.
3. **`src/index.css`** — append Phase 3 CSS block: `.lscreen/.lbg/.lhero/.llogobox/.lbrand/.ltag/.lform/.flbl/.fwrap/.finput/.pwtog/.lcta/.gbg2/.or-div` + `@keyframes pg` glow-pulse animation.
4. **SW v81 → v82.**

## Out of scope (deferred)

- Full OnboardingScreen with claim-player + 3-step wizard → **Phase 11** (DB-touching).
- New profile fields (DOB / gender / playing_side) → **Phase 11**.
- Sign-up email/password collection enhancements (current minimal form stays) → may revisit in Phase 11.
- Replacing `PadelLogoSmall` / `PadelLogo` with `<Icon name="trophy">` per spec → **decline**: brand consistency wins. Phase 2 already kept PadelLogoSmall in the header.
- Recovery view restyle if it complicates merge — keep as-is for now if needed; spec doesn't show it.

---

## File-by-file changes

### 1. `padelhub/src/index.css` — append Phase 3 styles

```css
/* Phase 3 — Login + League Picker */

@keyframes pg {
  0%, 100% { box-shadow: 0 0 40px rgba(74, 222, 128, 0.15); }
  50%      { box-shadow: 0 0 60px rgba(74, 222, 128, 0.25); }
}

.lscreen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.lbg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% 0%, rgba(74, 222, 128, 0.08), transparent 60%),
    linear-gradient(rgba(74, 222, 128, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 222, 128, 0.02) 1px, transparent 1px),
    var(--bg);
  background-size: auto, 28px 28px, 28px 28px, auto;
  pointer-events: none;
}
.lhero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 0 32px 36px;
  position: relative;
  z-index: 1;
}
.llogobox {
  width: 72px; height: 72px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.14), rgba(74, 222, 128, 0.04));
  border: 1px solid var(--accent-glow);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 40px rgba(74, 222, 128, 0.15);
  animation: pg 3s ease-in-out infinite;
  margin-bottom: 18px;
  overflow: hidden;
}
.lbrand {
  font-size: 32px;
  font-weight: 800;
  font-family: 'Outfit', sans-serif;
  letter-spacing: 0.02em;
}
.lbrand .accent { color: var(--accent); }
.ltag {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 6px;
}
.lform {
  flex-shrink: 0;
  padding: 0 20px 32px;
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.flbl {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 6px;
  display: block;
}
.fwrap { position: relative; }
.finput {
  width: 100%;
  padding: 13px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  outline: none;
  transition: border-color 200ms var(--ease-smooth);
  box-sizing: border-box;
}
.finput::placeholder { color: var(--muted); }
.finput:focus { border-color: var(--accent-glow); }
.finput.pw { padding-right: 48px; }
.pwtog {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--muted);
  padding: 4px;
  display: flex;
  font-size: 16px;
  line-height: 1;
}
.pwtog:hover { color: var(--text); }
.lcta {
  width: 100%;
  padding: 15px;
  border-radius: var(--r-md);
  background: var(--accent);
  border: none;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #000;
  transition: transform 200ms var(--ease-spring), box-shadow 200ms var(--ease-smooth), opacity 150ms;
}
.lcta:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(74, 222, 128, 0.35); }
.lcta:active { transform: translateY(0); }
.lcta:disabled { opacity: 0.5; cursor: not-allowed; }
.gbg2 {
  width: 100%;
  padding: 13px 16px;
  border-radius: var(--r-md);
  background: var(--surface);
  border: 1px solid var(--border);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: background 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth);
}
.gbg2:hover { background: var(--surface-2); border-color: var(--border-hover); }
.or-div {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.1em;
}
.or-div::before, .or-div::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}
.llink {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 12px;
  font-family: var(--mono);
  cursor: pointer;
  text-decoration: none;
  padding: 0;
}
.llink:hover { text-decoration: underline; }
.lerr {
  font-size: 12px;
  padding: 10px 14px;
  background: var(--danger-dim);
  border: 1px solid var(--danger-glow);
  border-radius: var(--r-md);
  color: var(--danger);
}
.lok {
  font-size: 12px;
  padding: 10px 14px;
  background: var(--accent-dim);
  border: 1px solid var(--accent-glow);
  border-radius: var(--r-md);
  color: var(--accent);
}

/* League picker — extends the same form language */
.lgcard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: border-color 150ms var(--ease-smooth);
}
.lgcard:hover { border-color: var(--border-hover); }
```

### 2. `padelhub/src/components/AuthGate.jsx` — restyle

- Drop the `PasswordField` inline-style component; build inline within each form using `.fwrap > .finput.pw + .pwtog`. The eye toggle uses `<Icon name={show ? "eye-off" : "eye"} size={17}/>` from the new Icon.jsx.
- Drop inline `inputStyle / labelStyle / btnPrimary / linkStyle / btnGoogle` consts.
- Keep `friendlyAuthError`, `useEffect` auth listener, recovery flow logic, sign-up/sign-in/forgot/resend handlers — all unchanged.
- Recovery view: keep its own block but apply class-based form styling (`.lscreen` wrapper, `.lform`, `.flbl`, `.finput`, `.lcta`).
- Login view structure:
  ```jsx
  <div className="lscreen">
    <div className="lbg"/>
    <div className="lhero">
      <div className="llogobox"><PadelLogoSmall size={42}/></div>
      <div className="lbrand">Padel<span className="accent">Hub</span></div>
      <div className="ltag">Your league. Your rankings.</div>
    </div>
    <form className="lform" onSubmit={handleSignIn}>
      {error && <div className="lerr">{error}</div>}
      {successMsg && <div className="lok">{successMsg}</div>}
      <div>
        <label className="flbl">Email</label>
        <input className="finput" type="email" .../>
      </div>
      <div>
        <label className="flbl">Password</label>
        <div className="fwrap">
          <input className="finput pw" type={showPassword?"text":"password"} .../>
          <button type="button" className="pwtog" onClick={...}><Icon name={showPassword?"eye-off":"eye"} size={17}/></button>
        </div>
      </div>
      <button type="submit" className="lcta">Sign In</button>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <button type="button" className="llink" onClick={handleForgotPassword}>Forgot password?</button>
        <button type="button" className="llink" onClick={handleResendConfirmation}>Resend confirmation</button>
      </div>
      <div style={{textAlign:"center",fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>
        Don't have an account? <button type="button" className="llink" onClick={...}>Sign Up</button>
      </div>
      <div className="or-div">or</div>
      <button type="button" className="gbg2" onClick={handleGoogleSignIn}>
        <span style={{width:18,height:18,borderRadius:"50%",background:"linear-gradient(135deg,#4285f4,#ea4335,#fbbc05,#34a853)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>G</span>
        Continue with Google
      </button>
    </form>
  </div>
  ```
- Sign-up view: same `.lscreen` shell with `<form className="lform">` containing display name + email + password + submit.
- Add `import Icon from './Icon';` at the top.

### 3. `padelhub/src/components/LeagueGate.jsx` — restyle picker

- Replace the inline-styled outer div + hero with `<div className="lscreen"><div className="lbg"/><div className="lhero">…</div>…</div>`.
- The "Select a league" tagline becomes `<div className="ltag">Select a League</div>`.
- League list cards use `.lgcard`.
- Create + Join sections use `<div className="lform">` containers with `.flbl > .finput + .lcta` (small variant).
- Sign-out button stays as `.llink` red variant or similar.

### 4. `padelhub/public/sw.js` — bump cache `v81 → v82`.

---

## Verification (Definition-of-Done — Phase 3)

After deploy:

### Local Vite
- [ ] esbuild on AuthGate.jsx + LeagueGate.jsx — both pass
- [ ] Sign-in form renders with `.lscreen / .lhero / .lform`, animated `.lbg`, glow-pulse `.llogobox`
- [ ] Password field shows `.pwtog` eye icon, toggling password visibility
- [ ] Forgot-password + resend-confirmation links render
- [ ] "Sign Up" link toggles to sign-up form
- [ ] Sign-up form renders display-name + email + password fields + submit
- [ ] Google OAuth button renders with G logo
- [ ] OR divider has horizontal lines on each side via `.or-div::before/::after`
- [ ] No console errors / React warnings
- [ ] Sign-in then sign-out flow works end-to-end
- [ ] LeagueGate renders with same `.lscreen` background, list of leagues + create + join cards

### Production / iPhone
- [ ] Loaded over Vercel preview URL on iPhone Safari (390px)
- [ ] No layout overflow at 390px width
- [ ] Sign-in flow works against prod Supabase
- [ ] Forgot-password email arrives
- [ ] Glow-pulse animation runs smoothly (no jank)

If ANY box fails → STOP, do not start Phase 4.

---

## Rollback plan

Phase 3 touches AuthGate.jsx + LeagueGate.jsx + index.css + sw.js. Single PR — `git revert <merge-commit>` if anything regresses.

---

## Hand-off to Phase 4

Phase 4 (per spec: Leaderboard / Ranking screen redesign) starts with:
- Login + League picker on the new design system
- Tokens, Icon.jsx, NavIcons.jsx, AppHeader, BottomNav all stable
- The Ranking screen is currently the most complex view (podium + 8-col table + form strip + season selector + season awards) — Phase 4 will get its own plan file

---

_Plan v1 — 2026-05-07 — drafted in S060 post-Phase-2._
