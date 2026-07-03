# PadelHub — Google Play Store Listing (v1)

> **Purpose:** Copy-paste-ready content + form answers for the Play Console listing.
> **Package:** `com.mohammedmuwahid.padelhub` · **AAB:** `android/app/build/outputs/bundle/release/app-release.aab` (versionCode 1, versionName 1.0)
> **Account:** personal/individual (dev name *PadelHubApp*, owner `support.padelhub@gmail.com`)
> **Status:** Ready to paste once device verification clears. Native push deferred to v1.1.

---

## ⚠️ Personal-account gate: 12 testers / 14-day closed test

New **personal** Google Play accounts MUST run a **closed test with at least 12 testers who stay opted-in for 14 continuous days** before you can apply for production access. Plan for this:

- Line up **12+ testers** (friends/league members with Google accounts) NOW.
- Create a **Closed testing** track → upload the AAB → add testers by email (or a Google Group).
- The 14-day clock runs in parallel with everything else — start it the day device verification clears.
- After 14 days + Google's review, you unlock the **Production** track.

---

## 1. Store listing — text

**App name** (max 30 chars)
```
PadelHub
```

**Short description** (max 80 chars)
```
Track padel matches, rankings, stats & rivalries with your padel crew.
```
*(70 chars)*

**Full description** (max 4000 chars)
```
PadelHub is the all-in-one match tracker for padel groups, clubs, and friendly leagues. Log every match, watch the rankings shift, and settle who's really on top.

CREATE YOUR LEAGUE
Start a private league in seconds and invite your crew with a share link. Run it your way — casual scoring for friendly games, or official FIP rules for serious seasons.

RANKINGS THAT MEAN SOMETHING
Every match feeds a live ELO-based ranking. See who's climbing, who's on a streak, and where you stand — filtered by season so each competition starts fresh.

LOG MATCHES IN SECONDS
Record set scores with a fast, tap-friendly score entry. LIVE scoring lets you track a match point by point as you play. Man-of-the-match, match approval, and edit tools keep your league's history clean and fair.

DEEP STATS & ANALYTICS
Go beyond the scoreboard: win rate, match differential, longest winning and losing streaks, head-to-head records, and a form guide of your last five results. Drill into any player's full profile.

PAIRS & PARTNERSHIPS
Padel is a doubles game — so PadelHub tracks it that way. See your best and worst partnerships, a dedicated pairs leaderboard, and partner chemistry at a glance.

TOURNAMENTS
Run Single Elimination, Double Elimination, Round Robin, or Americano formats right inside the app, with live brackets and standings.

KNOW YOUR LEVEL
Take the built-in skill self-assessment to earn a player grade from D- to A across eight dimensions of your padel game — or let a league admin set it.

BUILT FOR YOUR GROUP
- Admin roles and permissions
- Season management with rosters
- Match approval queue
- Achievements
- Player profiles with country, avatar, and playing position

PadelHub is free to use for your whole league. Grab a court, play your match, and let PadelHub keep score of the story.
```

**What's new** (release notes, max 500 chars)
```
Welcome to PadelHub! Create leagues, log matches, track ELO rankings and stats, run tournaments, and see your best partnerships — all in one app. This is our first release; we'd love your feedback.
```

---

## 2. Store settings & categorization

| Field | Value |
|---|---|
| App or game | **App** |
| Category | **Sports** |
| Tags | padel, sports, league, tracker, rankings |
| Email (public) | `support.padelhub@gmail.com` |
| Website | `https://padel-battle.vercel.app` |
| Phone | *(optional — leave blank)* |
| Privacy policy URL | `https://padel-battle.vercel.app/privacy` |

---

## 3. Graphic assets (need to produce)

| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG, 32-bit, **no alpha** | ✅ DONE — `store-assets/play-icon-512.png` (mark flattened on #0d0d14, alpha stripped) |
| Feature graphic | 1024×500 PNG/JPG (no alpha) | ✅ DONE — `store-assets/play-feature-1024x500.png` (mark + "PadelHub" wordmark + tagline) |
| Phone screenshots | 2–8 images, 16:9 or 9:16, each side 320–3840px | TODO — capture from device/emulator |
| 7" tablet screenshots | optional | skip for v1 |
| 10" tablet screenshots | optional | skip for v1 |

**Recommended phone screenshots (capture these 5–6 screens):**
1. Ranking / leaderboard (the hero shot)
2. Log a match (score entry)
3. Player profile with stats + form guide
4. Pairs leaderboard / partnerships
5. Tournament bracket
6. Match history feed

*Capture at a clean 1080×1920 (9:16). Use the emulator (Pixel) or a real device once available.*

---

## 4. Data safety form

PadelHub collects account and gameplay data via Supabase. Answers:

- **Does your app collect or share user data?** → **Yes**
- **Is all data encrypted in transit?** → **Yes** (HTTPS/TLS to Supabase)
- **Do you provide a way to request data deletion?** → **Yes** (in-app account deletion, `delete_my_account` in Settings) + email `support.padelhub@gmail.com`

**Data types collected (all _collected_, linked to the user, NOT sold/shared):**

| Data type | Collected | Purpose |
|---|---|---|
| Email address | Yes | Account management, authentication |
| Name (display name) | Yes | App functionality (identify players) |
| Photos (avatar) | Yes | App functionality (profile picture) |
| Date of birth | Yes | App functionality (player profile/age) |
| Gender | Yes | App functionality (player profile) |
| Other info (country, playing position, match data) | Yes | App functionality |
| App activity (matches logged, in-app actions) | Yes | Analytics / app functionality |

- **Data shared with third parties?** → **No** (Supabase is a processor/infrastructure provider, not a data sale/share)
- **Data collection required or optional?** → account data required to use the app.

> ⚠️ Verify against the live text at `/privacy` before submitting so the form and policy match exactly.

---

## 5. Content rating questionnaire

- Category: **Reference, News, or Educational** → actually select **Utility/Productivity/Communication or Other → App**; answer the questionnaire honestly:
- Violence: **None**
- Sexual content: **None**
- Profanity: **None**
- Controlled substances: **None**
- User-generated content / social features: **Yes** — users create player names and can share invite links (no public chat/feed). Declare this so the rating is accurate.
- Expected result: **Everyone / PEGI 3** (or similar), possibly with a "users interact" note.

---

## 6. Target audience & content

- **Target age group:** **18 and over** (app is designed for adult padel players, requires account creation + DOB). Not directed at children.
- **Ads:** **No ads.**
- **News app:** **No.**

---

## 7. Membership/Pro screen — DECISION: keep the button, wire RevenueCat (separate session)

The app has a **Membership** screen showing a "PadelHub Pro" tier with prices ($4.99/mo, $34.99/yr) and Upgrade/Restore buttons. Today these are **display-only placeholders** (toast messages) — RevenueCat/IAP is NOT wired yet.

**Decision (user, S102):** KEEP the membership button and **wire RevenueCat into it in a dedicated separate session**. Do NOT hide it, do NOT ship dead pricing buttons to production.

**Sequencing implication — this gates production, not the closed test:**
- The 14-day **closed test** can run with the placeholder UI (internal testers only, no public commerce exposure).
- **Before the Production submission**, RevenueCat must be wired so the Upgrade button completes a real purchase, AND the Play listing must then declare **in-app purchases** ($4.99/mo, $34.99/yr) and the Data-safety form updated accordingly.
- If RevenueCat is not ready by production time, fall back to hiding the pricing/upgrade UI for the first production release and re-enable on the RevenueCat ship.

**Action:** Schedule the RevenueCat wiring session before applying for production. Until then, the AAB in the closed test keeps the placeholder screen as-is.

---

## 8. Submission checklist

- [ ] Device verification cleared (blocks app record creation)
- [ ] App record created in Play Console
- [ ] Store listing text pasted (§1)
- [x] App icon 512×512 (no alpha) generated → `store-assets/play-icon-512.png`
- [x] Feature graphic 1024×500 generated → `store-assets/play-feature-1024x500.png`
- [ ] 2+ phone screenshots uploaded (§3) — **still need emulator/device capture**
- [ ] Data safety form completed (§4)
- [ ] Content rating questionnaire completed (§5)
- [ ] Target audience set (§6)
- [ ] Privacy policy URL live at `/privacy`
- [x] Membership/Pro screen decision made (§7) — keep button; wire RevenueCat before **production** (separate session)
- [ ] AAB uploaded to **Closed testing** track
- [ ] 12+ testers added, 14-day test started
- [ ] After 14 days → apply for production
```
