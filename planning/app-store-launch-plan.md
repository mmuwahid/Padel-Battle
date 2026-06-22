# App Store Launch Plan — PadelHub

> **Created:** S093 (2026-06-22)
> **Status:** PLAN — decisions resolved, ready for BUILD
> **Goal:** Launch PadelHub as a paid subscription app on Apple App Store (priority) + Google Play Store

---

## 1. Subscription Model

### Tier Structure

| | **Free (Trial Expired)** | **PadelHub Pro** |
|---|---|---|
| **Price** | $0 | Monthly: $4.99 / Annual: $34.99 (~42% saving) |
| **Trial** | — | 7-day free trial (full Pro access) |
| Join leagues | 1 league, 1 season | Unlimited |
| View rankings & match history | Yes | Yes |
| Log matches | Yes (in your 1 league/season) | Yes |
| View player profiles | Yes | Yes |
| Player Grade self-assessment | Yes | Yes |
| Create leagues | No | Yes |
| Season management | No (view only) | Yes |
| Tournament / Game Mode | No | Yes |
| Open Match voting | No | Yes |
| Admin tools (permissions, roster, approvals) | No | Yes |
| Full analytics & stats drill-in | Basic (own stats) | Full (all players, pairs, trends) |
| Priority support | No | Yes |

> **DECIDED (S093):** Free tier = 1 league + 1 season with basic access. Keeps users engaged while Pro gates power features. (Was: "join 1 league with basic access" or "read-only after trial expires"? The above proposes a functional free tier (keeps users engaged) with Pro gating the power features.

### Payment Flow
- Users pay through **Apple's StoreKit** (iOS) and **Google Play Billing** (Android) — these natively support Apple Pay, credit/debit cards, carrier billing, etc. Samsung Pay works through Google Play's billing on Samsung devices.
- **No custom payment gateway needed.** The stores handle all payment processing.
- Apple takes 15% (small business program, <$1M revenue) or 30%.
- Google takes 15% (first $1M) for subscriptions, dropping to 10% for subscriptions after 12 months.

---

## 2. Technical Architecture — RevenueCat + Capacitor

### Why RevenueCat
- Official Capacitor plugin: `@revenuecat/purchases-capacitor`
- Handles both App Store + Play Store from a single SDK
- Receipt validation, subscription status, trial management, analytics
- Free tier for <$2,500 monthly tracked revenue (covers launch period easily)
- Webhook support for server-side subscription status (Supabase Edge Function)

### Implementation Stack

```
App (Capacitor)
  └─ @revenuecat/purchases-capacitor
       ├─ StoreKit (iOS) — Apple handles payment UI
       └─ Google Play Billing (Android) — Google handles payment UI

RevenueCat Dashboard
  └─ Webhook → Supabase Edge Function
       └─ Updates `user_subscriptions` table
            └─ App reads subscription status from DB
```

### New DB Schema

```sql
-- Subscription status (source of truth via RevenueCat webhooks)
CREATE TABLE user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  rc_customer_id text,              -- RevenueCat customer ID
  plan text DEFAULT 'free',          -- 'free' | 'monthly' | 'annual'
  status text DEFAULT 'none',        -- 'none' | 'trial' | 'active' | 'expired' | 'cancelled'
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  store text,                        -- 'app_store' | 'play_store'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only read their own subscription
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_sub" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
-- Writes via Edge Function (service role) only
```

### New App Components

1. **`MembershipScreen.jsx`** — Main subscription management screen
   - Current plan status (Free / Pro / Trial with days remaining)
   - Plan comparison cards (Free vs Pro features)
   - Subscribe / Upgrade buttons (trigger native StoreKit / Play Billing sheet)
   - Manage subscription link (opens device's subscription settings)
   - Restore purchases button

2. **`PaywallModal.jsx`** — Shown when a free user taps a Pro feature
   - "This feature requires PadelHub Pro"
   - Feature highlight + Subscribe CTA + "Start 7-day free trial"
   - Dismiss option

3. **`useSubscription` hook** — Reads subscription status from context
   - `isPro`, `isTrial`, `trialDaysLeft`, `plan`, `subscribe()`, `restore()`
   - Injected into `LeagueContext` or a parallel `SubscriptionContext`

4. **Pro-gating logic** — Wraps restricted features
   - Create league → paywall if free
   - Tournament/Game Mode → paywall if free
   - League count check → paywall if >1 league on free
   - Admin tools → paywall if free

5. **Supabase Edge Function: `webhook-revenuecat`**
   - Receives RevenueCat webhooks (subscription started, renewed, cancelled, expired)
   - Updates `user_subscriptions` table via service role
   - Idempotent (handles duplicate webhook deliveries)

---

## 3. Required Policies & Legal Pages

### Must-Have (both stores)

| Document | Purpose | Where |
|----------|---------|-------|
| **Privacy Policy** | What data collected, how used, who shared with, retention, deletion | Hosted URL + in-app link + App Store Connect / Play Console |
| **Terms of Service** | Usage terms, subscription terms, cancellation, refund policy | Hosted URL + in-app link |
| **Subscription Terms** | Auto-renewal disclosure, pricing, cancellation instructions | Shown before purchase + in-app |

### Apple-Specific
- **App Privacy Nutrition Labels** — declare in App Store Connect: email (account), display name (account), avatar photos (user content), match data (app functionality), usage data (analytics). Mark as "linked to user."
- **EULA** (optional — Apple provides a default, but custom recommended for subscriptions)
- **Restore Purchases** button — MANDATORY for any app with in-app purchases
- **Subscription management** link — must be easy to find

### Google-Specific
- **Data Safety Section** — similar to Apple's nutrition labels
- **Billing Library v8+** — required by Aug 31, 2026 (RevenueCat handles this)
- **Content Rating** — IARC questionnaire in Play Console

### Where to Host
- Simple static pages at `padel-battle.vercel.app/privacy` and `/terms`
- Can be markdown-rendered or simple HTML
- Link from in-app Settings screen + store listings

---

## 4. App Store Submission Checklist

### Apple App Store

- [ ] **App Store Connect record** — create app, set bundle ID `com.mohammedmuwahid.padelhub`
- [ ] **Screenshots** — 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 14 Plus), 5.5" (iPhone 8 Plus), iPad Pro 12.9" (if supporting iPad)
- [ ] **App icon** — 1024x1024 (no transparency, no rounded corners)
- [ ] **Description** — title (30 char), subtitle (30 char), description, keywords, categories (Sports)
- [ ] **Age rating** — questionnaire (likely 4+ or 9+ depending on competitive content)
- [ ] **Privacy policy URL** — live and accessible
- [ ] **App Privacy labels** — filled in App Store Connect
- [ ] **In-App Purchases** — configured in App Store Connect (monthly + annual subscriptions)
- [ ] **Review notes** — test account credentials for reviewer
- [ ] **Sign in with Apple** — already wired (required when app has third-party login)
- [ ] **Capacitor build** — Xcode project, signing, provisioning profiles
- [ ] **TestFlight** — internal testing before submission

### Google Play Store

- [ ] **Play Console account** — individual developer account ($25 one-time fee)
- [ ] **App signing** — Google Play App Signing enrolled
- [ ] **Store listing** — title, description, screenshots (phone + 7" tablet + 10" tablet)
- [ ] **Content rating** — IARC questionnaire
- [ ] **Data safety** — declare data collection
- [ ] **Privacy policy URL** — live and accessible
- [ ] **Subscriptions** — configured in Play Console (monthly + annual)
- [ ] **Billing Library v8** — RevenueCat handles
- [ ] **AAB (Android App Bundle)** — Capacitor + Android Studio build
- [ ] **Closed testing track** — test before production release

---

## 5. Implementation Phases

### Phase A: Legal & Store Setup (no code)
1. Write Privacy Policy + Terms of Service (can draft from templates)
2. Deploy as static pages on Vercel (`/privacy`, `/terms`)
3. Create App Store Connect record (app ID already registered)
4. Create Google Play Console individual account ($25)
5. Configure subscription products in both stores (monthly + annual + 7-day trial)
6. Set up RevenueCat account + create project + connect both stores

### Phase B: Subscription Infrastructure (DB + backend)
1. DB migration: `user_subscriptions` table + RLS
2. Supabase Edge Function: `webhook-revenuecat` (receives + processes webhook events)
3. Helper RPC: `get_subscription_status(user_id)` for app queries
4. Test webhook flow with RevenueCat sandbox

### Phase C: App Subscription UI (frontend)
1. Install `@revenuecat/purchases-capacitor` + initialize in App.jsx
2. `SubscriptionContext` provider — reads RevenueCat SDK + DB status
3. `MembershipScreen.jsx` — plan display, subscribe, manage, restore
4. `PaywallModal.jsx` — triggered when free user taps Pro feature
5. Wire Pro-gating into: create league, tournament, admin tools, analytics, league count
6. Add Membership row to Settings/sidebar
7. Add subscription terms disclosure before purchase

### Phase D: Capacitor Native Wrap (iOS first, then Android)
1. Capacitor scaffold (per existing `capacitor-wrap.md`)
2. iOS build + TestFlight (Sign in with Apple already works)
3. Face ID (#124) + native push + Universal Links
4. Submit to App Store review
5. Android build + Play Console closed testing
6. Submit to Google Play review

### Phase E: Launch
1. App Store approval → release
2. Google Play approval → release
3. Monitor RevenueCat analytics + store reviews
4. OTA updates via Capacitor Live Update for quick patches

---

## 6. Decisions (Resolved S093)

1. **Free tier model:** 1 league + 1 season with basic access (keeps users engaged, Pro gates power features)
2. **Pricing:** USD 4.99/mo + USD 34.99/yr (~42% saving on annual). Competitive analysis: mid-market for padel apps.
3. **Subscription branding:** "PadelHub Pro"
4. **Existing users:** 1 year free Pro access when subscription goes live (loyalty reward for early adopters)
5. **Phase priority:** Build subscriptions BEFORE Capacitor wrap — app launches with subscriptions from day 1
6. **Legal:** Claude drafts Privacy Policy + Terms of Service (referencing Hello Padel and competitor policies as templates)

---

## 7. Competitor Pricing Analysis (S093)

| App | Monthly | Annual | Free Tier | Notes |
|-----|---------|--------|-----------|-------|
| Padel Manager | USD 4.99/mo | USD 39.99/yr | Limited (view only) | Spain-focused, est. 50K+ downloads |
| Playtomic | Free (booking fees) | N/A | Full access | Revenue from court booking commissions |
| Padelstein | USD 3.99/mo | USD 29.99/yr | Basic stats | Nordic market focus |
| Setmatch | USD 5.99/mo | USD 49.99/yr | 14-day trial | Multi-sport platform |
| Padel Mates | Free | N/A | Full | Revenue from ads + premium features |
| Hello Padel | EUR 12/mo (~USD 13) | EUR 99/yr (~USD 108) | 20+ free lessons | Coaching/video platform, not league mgmt. Indirect competitor. |
| **PadelHub** | **USD 4.99/mo** | **USD 34.99/yr** | **1 league + 1 season** | **7-day free trial, mid-market positioning** |

> PadelHub pricing sits in the mid-range — below premium multi-sport platforms (Setmatch) and above budget/free options. The annual plan offers ~42% savings to incentivize long-term commitment.

---

## 8. Cost Estimates

| Item | Cost |
|------|------|
| Apple Developer Program | $99/year (already active) |
| Google Play Console | $25 one-time |
| RevenueCat | Free up to $2,500/mo tracked revenue |
| Vercel hosting | Free tier (current) |
| Supabase | Free tier (current) |
| **Total launch cost** | **~$25 (Google Play fee only)** |

Apple takes 15-30% of subscription revenue. Google takes 15% (first $1M).

---

_Plan authored: S093 (2026-06-22) | Decisions resolved S093 — ready for BUILD_
