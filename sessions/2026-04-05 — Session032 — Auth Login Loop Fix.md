# Session Log — 2026-04-05 — Session032 — Auth Login Loop Fix

**Project:** PadelHub
**Phase:** Post-P7
**Duration:** ~45 minutes
**Commits:** e1e3d85

---

## What Was Done

### BF-28: Auth Login Loop (Can't Sign In, Can't Sign Up, Can't Reset)
- **Problem:** User (amakkawi89@gmail.com) created account via Google OAuth but tried to log in with email/password. Got "Invalid login credentials" (no password exists), "Account already exists" (Google identity owns email), and eventually "email rate limit exceeded" after multiple password reset attempts. Password reset links redirected to app but no reset form existed — user was silently logged in with unchanged password.
- **Root cause (code):** `handleAuthCallback()` in AuthGate.jsx detected `#access_token` in URL hash but never checked for `type=recovery`. Supabase fires `PASSWORD_RECOVERY` event in `onAuthStateChange`, but the code ignored this event and auto-logged the user in. No "Set New Password" form existed anywhere in the codebase.
- **Root cause (user):** Account was created via Google OAuth only — `auth.identities` shows only `provider: "google"`, no email/password identity. User expected email/password login to work.
- **Root cause (config):** Supabase free tier email rate limit was 2/hour — user got locked out after just 2 reset attempts.

### Fix 1: Password Recovery Form
- Added `PASSWORD_RECOVERY` event detection in `onAuthStateChange`
- New `authMode: "recovery"` state renders a "Set New Password" form with confirm field
- `isRecoveryRef` (useRef) prevents stale closure from auto-logging user in during recovery
- On submit: `supabase.auth.updateUser({ password })` → sign out → redirect to login with success toast
- Cancel button signs out recovery session and returns to login

### Fix 2: Friendly Error Messages
- New `friendlyAuthError()` helper maps raw Supabase errors:
  - "email rate limit exceeded" → "Too many attempts. Please wait a few minutes..."
  - "Invalid login credentials" → "Incorrect email or password. Try 'Forgot password?' to reset."
  - "email not confirmed" → "Check inbox... or tap 'Resend confirmation'"
  - All other errors pass through as-is
- Applied to all 5 auth handlers (signIn, signUp, forgotPassword, googleSignIn, setNewPassword)

### Fix 3: Resend Confirmation Button
- Added "Resend confirmation" link next to "Forgot password?" on sign-in screen
- Calls `supabase.auth.resend({ type: "signup", email })` — useful if email confirmation is ever enabled

### Fix 4: Supabase Cleanup (via CLI)
- Cleared 6 stale sessions for the locked-out user via `DELETE FROM auth.sessions`
- Verified email is confirmed (`email_confirmed_at` is set)
- Identified user's only identity is Google OAuth — no email/password

### Supabase Dashboard Review
- Rate limit: 2 emails/hour (free tier, can't increase without paid plan)
- Email confirmation: already disabled (good)
- Google OAuth: enabled and configured
- Auto-linking: enabled by default, no toggle visible (free tier default)

---

## Files Modified

### Commit e1e3d85 — 2 files
- `src/components/AuthGate.jsx` — Added PASSWORD_RECOVERY handler, recovery form UI, friendlyAuthError() helper, resend confirmation button, isRecoveryRef for stale closure prevention. 212 → 340 lines (+128).
- `public/sw.js` — Cache bump v29 → v30

## Key Decisions
- **Sign out after password reset** — forces user to log in fresh with new password. Cleaner than auto-navigating into the app.
- **useRef for recovery state** — `onAuthStateChange` callback captures stale `recoveryUser` state (always null from mount). Ref avoids this by reading `.current` at call time.
- **No separate route for recovery** — kept as `authMode` state within AuthGate. App is a SPA with hash-based routing — adding a `/reset-password` route would require URL config changes in Supabase.
- **URL hash handling restructured** — removed premature hash stripping that ran before Supabase could process recovery tokens. Now only cleans hash after `PASSWORD_RECOVERY` event fires.
- **Immediate user fix** — told user to tap "Continue with Google" since their account was created via Google OAuth, not email/password.

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-04-05 | Password reset link landed user on login screen with no reset form — existed since auth was built | `handleAuthCallback` stripped URL hash before Supabase could process `type=recovery`. `onAuthStateChange` never checked for `PASSWORD_RECOVERY` event. No recovery UI existed. | **Always implement a PASSWORD_RECOVERY handler when using Supabase auth.** The reset email sends a recovery token — the app MUST detect `PASSWORD_RECOVERY` in `onAuthStateChange` and render a "Set New Password" form. Without this, the reset link is useless. |
| 2026-04-05 | Raw Supabase error messages shown to users since auth was built ("Invalid login credentials", "email rate limit exceeded") | No error message translation layer — raw `err.message` passed directly to UI | **Always wrap auth error messages in a friendlyAuthError() mapper.** Raw API errors confuse users and don't guide them to the correct action. Map known error strings to actionable messages. |

### Validated Patterns
- `isRecoveryRef` (useRef) for cross-render state in event callbacks — `onAuthStateChange` is set up once in `useEffect([], [])`. Any useState values captured in the closure are stale. useRef.current is always fresh. Pattern: use refs for state that event listeners need to read.
- Supabase CLI `db query --linked` for auth table operations — can read/write `auth.users`, `auth.sessions`, `auth.identities` directly. Faster than Dashboard for diagnostics. Can confirm emails, clear sessions, check identities.
- Checking `auth.identities` provider to diagnose login issues — immediately revealed the user had Google-only identity, no email/password. Without this, would have spent time debugging password hashing or email confirmation.

## Next Actions
- [ ] Monitor if the locked-out user can now sign in via Google
- [ ] If user wants email/password access: sign in with Google → use "Forgot password?" → set password via new recovery form
- [ ] Any user-reported issues from production testing

---

## Commits & Deploy
- **Commit:** `e1e3d85` — fix: BF-28 auth login loop — password reset form, friendly errors, resend confirmation
- **Live:** https://padel-battle.vercel.app (auto-deploy from main)

---
_Session logged: 2026-04-05 | Logged by: Claude | Session032_
