# PadelHub — Issue Tracker (Session 089)

_Last updated: S089 · SW v201 · all changes pushed to `main` + deployed via Vercel._

App-wide standard set this session: **18px** content gutter; **single static splash**;
season pills show name-only (accent = active, muted = inactive); handedness icon
tilted 45° everywhere.

---

## ✅ Completed, deployed & confirmed

| # | Title | What shipped | Verified |
|---|-------|--------------|----------|
| 113 | Headers & titles | clamp titles, leaderboard/season overlap, uppercase pills, Best/Worst pairs, achievements, league title, "Hani T." truncation | ✅ user-confirmed |
| 114 | Handedness | icon contrast (#000 on selected pill) + 45° tilt baked into Icon.jsx → applies on drill-in, profile, admin edit, onboarding, edit-my-profile | ✅ user-confirmed |
| 115 | Opening-app flash | single-source static splash (removed duplicate React splashes) | ✅ user-confirmed |
| 116 | H2H empty icon | emoji → `swords` icon, centered + enlarged | ✅ user-confirmed |
| 117 | Pill designs | History/Schedule → shared `.seg/.sb` uppercase pills | ✅ closed |
| 118 | Player-grid press | sticky `:hover`-on-touch gated behind `@media (hover:hover)` | ⚠️ re-test on device |
| 119 | Game mode | avatars in Live/Final standings + round cards; native End-tournament popup → in-app modal | ✅ verified live |
| 120 | Round Robin | round flashcard layout + RR grid icon | ✅ user-confirmed |
| 123 | Retake assessment | opens a fresh blank form | ✅ user-confirmed |
| 125 | Tournament round layout | mockup implemented (avatars outer edges, centered score, court on bottom border, single card) | ✅ user-confirmed |
| 126 | Season pill | name-only, accent/muted, consistent across all dropdowns | ✅ user-confirmed |
| — | Cross-screen alignment | standardized 18px gutter; fixed Ranking title/podium double-padding | ✅ verified |
| 112 | Logo black box | color unification + **final** aura-viewBox-clip fix (`overflow:visible`) | ⚠️ re-confirm on device (animation-timed flash) |

---

## 🟡 Pending — needs your action / decision

| # | Title | Blocked on |
|---|-------|-----------|
| 121 | Login page | **Enable the Apple provider in Supabase** (Auth → Providers → Apple) so the shipped "Sign in with Apple" button authenticates. Decide whether to keep the "Resend confirmation" button (see note). Tagline already removed; Apple button shipped. |
| 122 | Profile page | **Pick a redesign option (A / B / C)** → https://padel-battle.vercel.app/profile-redesign-mockup.html  · back-button already fixed. |
| 124 | Face ID login | Deferred to the **Capacitor native wrap** (biometric plugin). |
| 109 | Notification centre | S088 fix deployed — **your device smoke-test** to close. |
| 110 | Player profile sync | S088 fix deployed — **your device smoke-test** to close. |
| 111 | Leaderboard empty spacing | S088 fix deployed — **your device smoke-test** to close. |

### "Resend confirmation" button (#121) — what it does
It re-sends the **email-confirmation link** to someone who signed up but never
confirmed their email address. With Supabase email-confirmation enabled, an
unconfirmed account can't sign in until they click that link — this button lets
them request it again if the first email was lost. If your project has email
confirmation **disabled**, or you prefer a cleaner login, it's safe to remove
(leaving Forgot password + Sign Up). Say the word and I'll remove it.

---

## ⏭️ Optional follow-ups (not requested as blocking)

- **#120 RR final-results table**: trophy emoji→icon, dash between teammate names,
  `NP / MW / ML` column headers, round-card avatars in the RoundRobin component
  specifically. (Game-mode round cards done; RR results table not separately
  restructured — reopen #120 if wanted.)
- **Capacitor wrap**: iOS native launch screen (fully resolves the boxed-icon
  launch frame), Face ID (#124), App Store build.
