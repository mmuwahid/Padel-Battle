# Session Log — 2026-06-23 — Session100 — Unified Onboarding + Profile Gate + Recent-Match Drill-down

**Project:** PadelHub
**Phase:** Pre-store-launch (onboarding integrity + drill-down UX + Google Play account)
**Duration:** long session
**Commits:** `5c7b469` (#150), `353793c` (#151), `4eb6784` (#150 card redesign), `fe14dab` (#150/#151 polish)

---

## What Was Done

### #150 — Recent matches on player drill-down
- New reusable `src/components/RecentMatches.jsx` (last-5 matches filtered to a player id, newest first; imports `win`/`formatTeam`/`formatDate`). Replaced the inline block in `ProfileView.jsx` (visually identical) and added a "Recent Matches" section to the `PlayerStats.jsx` drill-down.
- Card redesigned per user feedback (`4eb6784`): taller; **day/date as a header line above the player names** (top-left); **set-score result moved to the far right**; WIN/LOSS pill unchanged on the far left. Shared component → identical on own-profile and other-player views.
- Drill-down ordering + Head-to-Head polish (`fe14dab`): Recent Matches now sits **above** Head to Head; a **0 W/L count in Head to Head is muted** (`MT`) instead of green/red.

### #151 — Unified onboarding + profile-completeness gate
- Root cause: invite-link new users had `LeagueGate.tryAutoJoin` auto-submit an **empty** join request (no profile data) and skip `OnboardingScreen` entirely; the only gate (`App.jsx`, `claimedPlayer===null`) checked that a player row existed, not that the profile was filled. Result: invited users landed on the leaderboard with a name-only profile.
- **Welcome intro step** added to `OnboardingScreen` (step 0): login → welcome → profile. (Redundant "Welcome" eyebrow removed in `fe14dab` since the title already reads "Welcome to PadelHub".)
- **Up-front capture for invite links:** `LeagueGate` now defers the join request for brand-new (0-league) invite-link users (`needs_onboarding` kind + `pendingInvite` state); they go through welcome + profile in `OnboardingScreen` (invite mode, `inviteLeague` prop) and the join request is submitted **with real profile data**, then Pending Approval. Existing multi-league users keep the instant auto-join.
- **Completeness backstop:** new `isProfileComplete(player)` helper (`utils/helpers.js` — name, country, DOB, gender, court position, handedness) + a blocking `CompleteProfileScreen.jsx` gate in `App.jsx` (after the Pending-Review gate). Any claimed player with an incomplete profile must finish before reaching the leaderboard. Writes the player row (RLS `players_update_self`) + `sync_player_identity` fan-out, then `loadLeagueData` clears the gate.
- **Scope decision (data-driven):** production has 18 claimed players / 16 users, **14 incomplete** (mostly missing DOB + court position). User chose **force-all** (clean profiles before store launch) over gating only the near-empty invited users.

### Reviews & fixes
- security-reviewer: clean (gate is UX-only; RLS is the real boundary; self-update is RLS-safe; no new data exposure/injection).
- code-reviewer: 1 CRITICAL (mass force-gate) → converted to an informed product decision via the force-all choice. 3 HIGH fixed: `CompleteProfileScreen` `setSaving(false)` success-path safety net; `canSave` strict enum parity with `isProfileComplete`; `pendingInvite` cleared in `onComplete` (prevents duplicate join requests on Try Again).

### Ops
- Google Play Console developer account created + $25 paid (owner `support.padelhub@gmail.com`, dev ID `7573132350565793581`) — saved to memory `reference_google_play_console`. Identity verification in progress; cannot create app records until verified.
- Fixed stale per-PC dev-server paths in `.claude/launch.json` (`hardening-dev` and new `clone-dev-user` now point to `C:/Users/User/dev/Padel-Battle`).

---

## Files Modified

### Commit `5c7b469` (#150)
- `src/components/RecentMatches.jsx` — NEW shared last-5 list.
- `src/components/ProfileView.jsx` — use RecentMatches; drop now-unused `win`/`formatTeam`/`formatDate` imports.
- `src/components/PlayerStats.jsx` — Recent Matches section in drill-down + import.

### Commit `353793c` (#151)
- `src/utils/helpers.js` — `isProfileComplete`.
- `src/components/OnboardingScreen.jsx` — welcome step + invite mode (`inviteLeague`, `handleInviteJoin`).
- `src/components/LeagueGate.jsx` — `pendingInvite` + `needs_onboarding` deferral.
- `src/components/CompleteProfileScreen.jsx` — NEW blocking completion screen.
- `src/App.jsx` — import + completeness gate; SW v240→v241.

### Commit `4eb6784` (#150 redesign)
- `src/components/RecentMatches.jsx` — date-header layout + result on the right; taller card. SW v241→v242.

### Commit `fe14dab` (#150/#151 polish)
- `src/components/OnboardingScreen.jsx` — remove redundant Welcome eyebrow.
- `src/components/PlayerStats.jsx` — Recent Matches above Head to Head; mute 0 W/L. SW v242→v243.

## Key Decisions
- Profile-completeness gate is **force-all** for existing users (14 of 16), accepted as clean-data-before-launch rather than gating only the ~2 near-empty invited users.
- Up-front capture AND a completeness backstop ("both") — invited new users complete profile before the request is submitted, and the gate catches anyone approved with a partial profile.
- Welcome screen included for every onboarding path (direct signup + invite link).
- Gate is intentionally client-side/UX-only — RLS remains the security boundary (confirmed by security review).

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-06-23 | Initial completeness gate would have force-walled 14 of 16 active users, far beyond the one near-empty invited user the request implied. | A "complete profile" check enforced the newest mandatory fields (DOB, court position, handedness) retroactively on a user base that pre-dates those requirements. | **Before shipping a retroactive data gate, query production for the real blast radius (`COUNT(*) FILTER (...)`) and confirm the scope with the user — don't assume "the one case" is the only one.** |
| 2026-06-23 | `npm run build` failed on `@capacitor/core` unresolved — unrelated to the change. | Capacitor deps were in `package.json` but not installed in this PC's `node_modules`. | **On a fresh/secondary PC, run `npm install` before trusting a build failure that points at an untouched file.** |

### Validated Patterns
- [2026-06-23] **One shared presentational component for "the same list in two places."** `RecentMatches` (own profile + drill-down) means a single edit (card redesign) applied to both, and the user's "apply the same rule to my profile too" was free. **Why:** divergence is the default when you copy-paste UI between screens.
- [2026-06-23] **A UX gate is not a security boundary — keep it client-side and lean on RLS.** The completeness gate only changes which screen renders; bypassing it grants zero extra data because `players`/`matches` RLS already scopes everything. **Why:** avoids over-engineering a server-side enforcement for a pure UX nudge.
- [2026-06-23] **Match the validation predicate exactly between the gate and the form that satisfies it.** `CompleteProfileScreen.canSave` had to use the same strict enum checks as `isProfileComplete`, or a legacy out-of-enum value would save, never clear the gate, and freeze the button. **Why:** a gate + a looser form = an unescapable loop.
- [2026-06-23] **The custom LiquidPress nav delegate ignores synthetic DOM clicks; drive it with real `pointerdown`/`pointerup`/`click` PointerEvents in `preview_eval`.** Unblocked full click-through verification of the drill-down. **Why:** `preview_click` alone silently no-ops on press-delegate buttons.

## Next Actions
- [ ] Owner smoke-test of the existing-user force-complete flow (14 users will hit CompleteProfileScreen on next open).
- [ ] Google Play: finish identity verification → device-access check → create app record → Capacitor Android build → AAB → store listing → testing track.
- [ ] #129 v2 permissions decision; padelhub.app email addresses; tier-limit enforcement + RevenueCat at store launch.
- [ ] ⚠️ Regenerate Apple secret before 2026-12-18 (`scripts/gen-apple-secret.cjs`).
- [ ] (Cleanup) Remaining stale `.claude/launch.json` configs (`clone-dev`, `padel-dev-cleanup`, `mockup-static`) still point at the old `/tmp` path.

---

## Commits & Deploy
- **`5c7b469` (#150):** RecentMatches component + drill-down section — SW v241.
- **`353793c` (#151):** unified onboarding + completeness gate — SW v241.
- **`4eb6784` (#150):** card redesign (date header + result right) — SW v242.
- **`fe14dab` (#150/#151):** drop Welcome eyebrow; Recent above Head-to-Head; mute 0 W/L — SW v243, main `fe14dab`, prod READY.
- **Live:** padel-battle.vercel.app
- **Issues closed:** #150, #151.

---
_Session logged: 2026-06-23 | Logged by: Claude | Session100_
