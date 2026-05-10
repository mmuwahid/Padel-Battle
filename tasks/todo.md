# Active Work

## NEXT SESSION (S073) — START HERE
**Last session:** S072 (2026-05-10) — **1 push-direct commit `ece8faf`, SW v137 → v138, 9 DB migrations applied via Supabase MCP, 2 plan-as-deliverable files written, 2 mockups reviewed and revised by user, ~5h day, 0 GitHub issues closed.** Gold-orb logo redesign: new `PadelHubMark` SVG (3D gold central orb + 6 satellite orbs orbiting via `hubOrbit` 22s + `hubAura` 2.4s breathing + per-satellite scale stagger via `hubSat` 2s at 0/180/360/540/720/900ms). New `PadelHubMarkHeader` no-aura variant for in-app header `.logo .lm` (replaces PadelLogoSmall at 32px). `index.html` static splash mirrored. Wordmark "Hub" tinted gold. SW bumped v137→v138. **DB foundation FT-16 (5 migrations):** open_matches table + open_match_players join + matches.open_match_id FK + RLS + 6 SECURITY DEFINER RPCs (create / join with auto-shuffle on lock / leave / cancel / set_teams override / expire_stale sweep). **DB foundation FT-15 (4 migrations):** seasons.format column (defaults 'individual', existing 2 seasons untouched) + pairs table with elo seeded at 1500 (Premier-Padel-style) + 3 admin RPCs + pair-ELO trigger fires on approved matches in pairs-format seasons. **2 lessons (#101, #102):** CREATE OR REPLACE FUNCTION can't rename input parameters at the same ordinal position; multi-statement Supabase MCP migrations are all-or-nothing transactions.

### 🎯 S073 PRIORITY — frontend wiring
1. **iPhone smoke test of S072 ship** — verify gold-orb logo on PWA after SW v138 cold-load: AuthGate splash, LeagueGate splash, in-app header `.lm` slot, index.html static splash, refresh transitions. Verify Vercel deploy `ece8faf` is READY.
2. **FT-16 frontend** (recommended next per plan — smaller surface, more contained than FT-15) — per `padelhub/planning/FT-16-open-match-voting.md` commit sequencing C2-C5:
   - C2: ScheduleView Open Matches section + claim/leave/cancel buttons + RPC wiring (`join_open_match` / `leave_open_match` / `cancel_open_match`)
   - C3: ScheduleView Step 1 Private/Open toggle + `create_open_match` wiring
   - C4: LogMatch pre-fill team_a/team_b from locked open match + insert `matches.open_match_id` FK
   - C5: NotificationCenter `open_match` renderer (3 kinds: new/locked/cancelled) + push-notify Edge Function branch + deep-link routing matrix extension
   - App.jsx: load `open_matches` + `open_match_players` in `loadLeagueData()` + run `expire_stale_open_matches` sweep
3. **FT-15 frontend** (larger surface — defer to S074 unless time permits) — per `padelhub/planning/FT-15-pairs-leaderboard.md` v2 commit sequencing C2-C4:
   - C2: SeasonManagement Format toggle (Individual/Pairs) + Pairs Roster admin section with create/update/delete RPCs
   - C3: LogMatch + ScheduleView pair-aware picker (gated on `selectedSeason.format === 'pairs'`)
   - C4: New `PairsRanking.jsx` (~250 lines, 7-col layout per Premier-Padel broadcast style with country flags below player names, no ELO column, podium mirrors normal league)
4. **Color sweep (Note A — S069 carry-over)** — answer A1/A2/A3 first:
   - **A1** keep `#9090a4` everywhere as documented spec divergence
   - **A2** sweep to spec `var(--muted) #555555` (likely user-perceived regression)
   - **A3 recommended** redefine `--muted` to `#9090a4` in `:root` so token name matches usage
   After Note A locked, sweep batch ~150 line touches, single commit, single PR.
5. **PR-D: SE/DE/RR active tournament views** (Game Mode Phase 10 finish) — bracket header bar + score-input cards + standings using gm-* classes. Brittle `getElementById` score input needs state-based refactor before classes work cleanly. Branch: `feat/46-phase10-pr-d-active-views`.
6. **PR-E: BracketSVG color tokens** — currently uses theme constants A/GD/etc. Migrate to var(--accent) etc. for consistency.

### S072 outcomes (this session — archived)
- [x] Gold-orb logo redesign — `PadelHubMark` 3D central orb + 6 satellites + aura with full animation suite (hubOrbit / hubAura / hubPulse / hubSat)
- [x] `PadelHubMarkHeader` small variant — replaces `PadelLogoSmall` in App.jsx header `.logo .lm`
- [x] `index.html` static splash mirrored verbatim per Lesson #98
- [x] Wordmark "Hub" tinted gold (`#f59e0b`) in both index.html splash + (defer JSX wordmark — `.lt .accent` token-based, will pick up from `--gold` if user wants it; left as-is for v1)
- [x] SW bumped v137 → v138
- [x] 5 FT-16 DB migrations applied (open_matches table, open_match_players, matches.open_match_id FK, RLS, 6 RPCs)
- [x] 4 FT-15 DB migrations applied (seasons.format, pairs, 3 RPCs + helper, pair-ELO trigger + extended update_season — split into 2 after parameter-rename error)
- [x] `planning/FT-16-open-match-voting.md` written (new plan-as-deliverable)
- [x] `planning/FT-15-pairs-leaderboard.md` v2 written (all 6 user decisions baked in)
- [x] `public/mockup-ft16-open-match.html` written + revised (split TEAM A / TEAM B header in locked card)
- [x] `public/mockup-ft15-pairs.html` written + revised (inline-avatar pairs + Premier-Padel broadcast naming + ELO column dropped from leaderboard)
- [x] Lessons #101, #102 captured
- [x] Pushed to origin/main as commit `ece8faf` (Vercel BUILDING at session close — verify READY at S073 cold start)
- [ ] FT-16 frontend wiring (deferred to S073 per plan-as-deliverable estimate)
- [ ] FT-15 frontend wiring (deferred to S074 per plan-as-deliverable estimate)
- [ ] iPhone smoke test of new logo (deferred to user)

---

## ARCHIVED — earlier session pointer (S070)
**Earlier session:** S070 (2026-05-09) — **4 PRs merged + 1 issue closed via comment, SW v126 → v130, ~3-4h, 6 GitHub issues closed.** PR [#86](https://github.com/mmuwahid/Padel-Battle/pull/86) `4e8a9c8` quick-wins bundle (#84 DOB overflow durable iOS fix + #69 invite share preview OG hygiene + #83 handedness DB column + Court Position rename, SW v126→v127). PR [#87](https://github.com/mmuwahid/Padel-Battle/pull/87) `ea7d506` #79 NotificationCenter click-through routing matrix + scroll-to-match flash highlight (SW v127→v128). PR [#88](https://github.com/mmuwahid/Padel-Battle/pull/88) `2c9cb1f` #80 loading screen redesign + multi-layer animation + 20%-above-center positioning + PTR full splash (SW v128→v129). PR [#89](https://github.com/mmuwahid/Padel-Battle/pull/89) `d3ada41` follow-up fix per user feedback ("logo in black box container, looks cheap") — dropped halo + outer dashed ring + inner solid ring; logo now sits transparent on app bg with mark-only artwork (SW v129→v130).

---

## ARCHIVED — earlier session pointer (S069)
**Earlier session:** S069 (2026-05-09) — **1 PR (#85, commit `25f7a2d`), SW v125 → v126, ~2h.** Photo crop/zoom modal (react-easy-crop, circle 1:1 + pan + zoom 1×-4×) wired into both My Profile + admin EditPlayerModal flows. Avatar tap-to-expand lightbox (WhatsApp-style) on ProfileView .propic + PlayerStats drill-in .dpro-pic. **Issue #81** iOS-18 nav burst — `.ntab::before` 64px radial halo overflows ~36px above the bar at scale(1.45) translateY(-26), icon lifts (-10/scale 1.28), pure `:active` holds while pressed. **Screen titles spec-aligned** — dropped `text-transform:uppercase` from `.lbtitle / .adh1 / .lv-title / .sched-title` so Syne 800 mixed-case renders matching JSX spec ("Leaderboard", "Dashboard", "Leagues", "Scheduled"). **Color audit research deliverable:** `:root` 100% matches spec; 395 hardcoded color refs across index.css; top drift `#9090a4` × 119 (NOT in spec; spec says `--muted #555555`) — 3 options surfaced for user, **A3 recommended (redefine `--muted` to `#9090a4` so token name matches usage)**. Sweep held pending Note A decision.

### 🎯 S070 PRIORITY — COLOR SWEEP (resume from S069)
User left S069 with the audit table presented but the sweep itself NOT shipped. Decision needed on Note A:
- **A1** — Keep `#9090a4` everywhere as documented spec divergence (legibility on dark bg).
- **A2** — Sweep to spec `var(--muted) #555555`. Spec-faithful but every secondary label gets significantly fainter — likely user-perceived regression.
- **A3 (recommended)** — Redefine `--muted` to `#9090a4` in `:root` so the token name matches usage, then sweep all hardcoded `#9090a4` → `var(--muted)`. Treat the spec's `#555555` as wrong (it's barely readable on `#080808`).

After Note A is locked, the sweep batch is:
- 🟢 Safe (no visible change): `#0a0a0f` (×4), `#080808` inline (×3), `#4ade80` inline (×9), `#facc15`/`#f87171`/`#f472b6` inline (×9 total) → respective `var()` references
- 🟢 Legacy collapse: `#e4e4ef`, `#c9c9d4` (×4) → `var(--text)`; `#7a7a8e` (×2) → `var(--muted)`; `#3a3a3a / 3a3a4a / 2a2a3a` (×5) → `var(--surface-3)` or `var(--border)`
- 🟢 Hex-alpha cleanup: `#4ade8040 / 4ade8020 / 4ade80cc` (×6) → rgba/`var(--accent-glow)`/`var(--accent-dim)` as appropriate
- 🔴 Keep load-bearing: `#0d0d14` + `#12121a` (header gradient + .bnav bg, Lesson #40/#44)
- 🟡 Per Note A decision: `#9090a4` (×119) and `#5a5a6a` (×11)

Estimated scope ~150 line touches, single commit, single PR. SW v126 → v127.

### S070 PLAN — direction options after color sweep
1. **Color sweep (above)** — answer Note A first.
2. **iPhone smoke test of S069 ship** — verify cropper opens, lightbox expands, nav burst feels right, screen titles read mixed-case Syne 800.
3. **E2E re-test of approval workflow** — verify all S067/S068 hotfixes hold (GRANT bug, post-approval routing, TDZ, chevron-left, deletePlayer→league_members cleanup).
4. **Claim-during-onboarding flow** — currently invite-code path always submits as `new_profile`. Spec wants users to also claim an unclaimed existing player.
5. **EditMyProfile design diffs** — user flagged but never sent screenshot. Defer until provided.
6. **Performance: parallelize auth → leagues → match queries** — currently sequential, ~3 cold-start round-trips. Halves perceived load time. Issue #54 part-2.
7. **FT-15 Pairs Leaderboard** (Issue #25) — DB-touching, 6 user questions still pending in `padelhub/planning/FT-15-pairs-leaderboard.md`.

### S069 outcomes (this session — archived)
- [x] Photo crop/zoom modal — react-easy-crop wrapper with circle crop + pan + 1×-4× zoom slider; outputs 200×200 JPEG blob; wired into App.jsx uploadAvatar + EditPlayerModal uploadPhoto
- [x] Avatar tap-to-expand lightbox (`AvatarLightbox.jsx`) — WhatsApp/Instagram-style; wired into ProfileView .propic + PlayerStats .dpro-pic
- [x] Issue #81 — nav press burst animation; `.ntab::before` halo overflows above bar; icon lifts; pure `:active` holds
- [x] Screen titles spec align — dropped uppercase from `.lbtitle / .adh1 / .lv-title / .sched-title`
- [x] Color audit — research deliverable produced, sweep held pending Note A decision
- [x] PR [#85](https://github.com/mmuwahid/Padel-Battle/pull/85) squash-merged as `25f7a2d`, prod deploy `dpl_G2ip2fiLPiVhik4y2xpWB1Vpi4D4` READY, SW v125 → v126

---

## ARCHIVED — earlier session pointer (S068)
**Earlier session:** S068 (2026-05-09) — **10 commits, 6 GitHub issues closed, SW v117 → v125, ~14h cross-day session**. Production was on **SW v125**, commit `5a0d249`. Major polish bundle from iPhone smoke + admin promotion testing: legacy claimPlayer gated, league menu status meta, YOU pill replaced with vertical accent bar, W/L color coding everywhere, reactions race fix, duplicate admin notif fix, unified back-button pattern, drill-in origin restoration, all italics stripped, sidebar history stack (incremental back-out from any drill-down depth), PadelHub logo home link, Outfit→Syne sweep across all UI text + wordmark 15px, Player leaderboard header centered. **GitHub issues closed:** #75, #68, #41, #46, #67, #82.

### 🎯 S069 PRIORITY — COLOR AUDIT (start here)
User has shared the JSX spec color palette as an image (preserved below). Tomorrow's first task is a side-by-side comparison: pull every color used in the live app's `index.css` (CSS variables + hardcoded hex/rgba values) and diff against the spec palette. Output as a table. Decide whether to sweep the app to align with spec colors (similar to how Outfit→Syne was swept in S068) OR keep current values.

**JSX spec color palette (from user-shared image):**

```
CORE BACKGROUNDS
  #080808       --bg          App background
  #111111       --surface     Cards, surfaces
  #1a1a1a       --surface-2   Elevated surface, hover rows
  #222222       --surface-3   Deepest surface layer
  #2e2e2e       --muted-2     Muted 2 / secondary surface

TEXT
  #f0f0f0       --text        Primary text
  #555555       --muted       Muted / labels / loser names
  #ffffff       (none)        High contrast text / FAB icon
  #000000       (none)        Text on accent green buttons

BRAND ACCENT — GREEN
  #4ade80                     --accent      Primary accent, WIN label, active nav, FAB
  rgba(74,222,128,.09)        --accent-dim  Accent tint backgrounds
  rgba(74,222,128,.20)        --accent-glow Accent border glow
  rgba(74,222,128,.02)        Grid background lines
  rgba(74,222,128,.04)        Current user row tint
  rgba(74,222,128,.75)        Form dots — wins
  rgba(74,222,128,.35)        FAB glow box-shadow

GOLD — MOTM / ELO / WARNINGS
  #f59e0b                     --gold        MOTM pill, ELO stat value, gold accents
  rgba(245,158,11,.08)        --gold-dim    Gold tint backgrounds
  rgba(245,158,11,.25)        --gold-glow   Gold border glow
  rgba(245,158,11,.32)        MOTM pill border
  #facc15                     --yellow-1    Podium 1st place ONLY — win%, top border
  rgba(250,204,21,.09)        Podium p1 card background tint
  #fbbf24                     --warn        Warn / notification dot

DANGER — RED
  #f87171                     --danger / --loss   LOSS label, danger actions, delete icon
  rgba(248,113,113,.08)       --danger-dim        Danger tint backgrounds
  rgba(248,113,113,.22)       --danger-glow       Danger border glow
  rgba(248,113,113,.50)       Form dots — losses

PODIUM MEDALS
  #facc15      1st place — win%, top border line (yellow)
  #94a3b8      2nd place (silver)
  #c97b2e      3rd place (bronze)

SPECIAL — SINGLE USE
  #f472b6                     --pink        Female gender indicator ONLY
  rgba(244,114,182,.08)       Female gender pill background
  rgba(244,114,182,.28)       Female gender pill border

BORDERS
  rgba(255,255,255,.07)       --border      Default card / component borders
  rgba(255,255,255,.04)       Very subtle separators
  rgba(255,255,255,.25)       High contrast borders
  rgba(148,163,184,.15)       Team B dropdown borders (Schedule)

OVERLAYS
  rgba(8,8,8,.92)             AppHeader blur background
  rgba(8,8,8,.95)             BottomNav blur background
  rgba(0,0,0,.65)             Modals / overlays

GOOGLE OAUTH BUTTONS (LOGIN SCREEN ONLY)
  #4285F4      Google Blue
  #ea4335      Google Red
  #fbbc05      Google Yellow
  #34a853      Google Green
```

**Audit deliverable:** mirror the table above with two columns — "Spec value" and "Live value" — for every token. Where divergent, decide: align to spec (sweep) / keep live (document why) / propose third option. Same approach as the Outfit→Syne sweep audit in S068.

### S069 PLAN — other direction options
1. **Color audit (above)** — recommended first task per user direction.
2. **E2E re-test of approval workflow** — verify all S067/S068 hotfixes hold (GRANT bug, post-approval routing, TDZ, chevron-left, deletePlayer→league_members cleanup).
3. **Photo crop/zoom in avatar uploader** — react-easy-crop integration; touches App.jsx uploadAvatar + EditPlayerModal uploadPhoto. User explicitly deferred from S067.
4. **Claim-during-onboarding flow** — currently invite-code path always submits as `new_profile`. Spec wants users to also claim an unclaimed existing player. Fetch unclaimed players from the league after invite-code submit, show a picker, submit appropriate type to `create_join_request`.
5. **EditMyProfile design diffs** — user flagged but never sent screenshot. Defer until provided.
6. **Performance: parallelize auth → leagues → match queries** — currently sequential, ~3 cold-start round-trips. Halves perceived load time. Addresses Issue #54 part-2.
7. **Spec page-title-in-AppHeader alignment** — user explicitly said NO last session, but flag if they change their mind.
8. **FT-15 Pairs Leaderboard** (Issue #25) — DB-touching, 6 user questions still pending in `padelhub/planning/FT-15-pairs-leaderboard.md`.

### S068 outcomes (this session — archived)
- [x] Legacy claimPlayer form gated → "Pending Review" lock screen (`d94b200`, SW v118)
- [x] Issue #67 League menu "N players · M matches" status (`ee15a42`, SW v119)
- [x] Issue #82 YOU pill dropped + green border tint, refined later to vertical accent bar (`ee15a42` + `dd33162`)
- [x] W/L color coding in roster pills (green when >0, grey when 0; red when >0, grey when 0)
- [x] Reactions disappear-after-1s race fix — stable matchIdsKey + cancelled flag in MatchHistory useEffect
- [x] Duplicate admin promotion notification fix — set_member_role RPC was inserting; dropped client-side push call
- [x] Green claimed-dot now only on UNCLAIMED players (claimed = no dot, less visual noise)
- [x] Unified back-button pattern across every drill-in (PlayerStats moved from `.hdr-back` to `.back-btn-row`)
- [x] Drill-in origin restoration — Ranking → drill-in → back returns to Ranking (was broken, landed on Players)
- [x] Player Management header simplified — dropped LEAGUE eyebrow + redundant Players subhead
- [x] All italics stripped — 12 CSS rules + 10 inline JSX `fontStyle:"italic"` (verified 0 italic elements DOM-wide)
- [x] Sidebar history stack — Settings → Admin → PlayerMgmt → back × 3 returns to drawer
- [x] PadelHub logo is now a home link → Ranking tab + clears all drill-in state
- [x] Drill-in Match Won/Lost cells grey when 0
- [x] Outfit→Syne sweep across all UI text (40 CSS + 26 inline JSX)
- [x] App header wordmark `.lt`: 14px/900 → 15px/800/.04em per user spec
- [x] Numerics on DM Mono untouched per user direction
- [x] Player leaderboard header text centered to match Rank column
- [x] 6 GitHub issues closed: #75, #68, #41, #46, #67, #82

### Standing rules (still apply across all #46 phases):
- spec class names ARE the contract (Lesson #81 — class-name parity audit before visual port)
- push-to-main is harness-blocked → always feature-branch + `gh pr merge <N> --squash --delete-branch` for big PRs (small hotfixes can push direct to main when scope is contained)
- NavIcons.jsx is frozen forever
- tokens use spec's LONG names
- PadelLogoSmall stays as brand mark
- before opening any #46 PR, run pre-merge gate (list prior tunings via `git log --oneline -- <file>`, diff visual props spec-vs-live, classify spec-wins/prior-wins/ambiguous → ASK USER, run getComputedStyle regression checks)
- declare hooks BEFORE useEffects that reference them (S067 Lesson #88 — TDZ)
- after every push to main, verify Vercel deploy state via `list_deployments` (S067 Lesson #93)
- when introducing a new gate flow, audit + rewire bypass surfaces (S067 Lesson #92)

### S067 outcomes (this session — archived)
- [x] Phase 12 PR3 admin batch (5 components) — PR #78 squash-merged as `b5fb06f`
- [x] Rules SECTIONS data restructure with .rtag chips
- [x] Leaderboard Rank header `.lbh.c` centering
- [x] Sidebar X-icon dropped next to Sign Out
- [x] EditPlayerModal gallery picker (drop capture="environment")
- [x] Back buttons surfaced (.back-btn-row padding)
- [x] Rules per-card press-state vertical accent
- [x] Most Argued zap icon
- [x] .rcontent body text mono+softer color
- [x] Italic dropped on .adh1, .plmtit, .secname, .shtitle
- [x] EditPlayerModal spec gender+position vocab
- [x] EditMyProfile DOB box-sizing fix + save-error diagnostic
- [x] NotificationCenter full emoji→Icon SVG rewrite
- [x] Header refresh button → pull-to-refresh (1s spinner overlay)
- [x] Season list inline Edit/End/Reactivate footer actions
- [x] PlatformAdmin rename-league inline editor
- [x] Rules-of-Hooks fix (PTR hook moved before early returns)
- [x] Age tag in ProfileView + PlayerStats drill-in (new getAge helper)
- [x] Match Won/Lost rename, Best Streak → Consecutive Wins, MOTM gold star badge
- [x] .propic 96→130px, Remove Photo red action button
- [x] S068 Approval-Gated Join Workflow — DB migration + 3 RPCs + 3 screens + OnboardingScreen rewire + LeagueGate routing + AdminDashboard card + Matches banner
- [x] Photo upload single-retry pattern (250ms backoff)
- [x] Achievements section spec restyle with .ach-* class system + gold star MOTM card
- [x] **CRITICAL TDZ hotfix** — loadJoinRequest declared before useEffects
- [x] **CRITICAL build error hotfix** — PadelLogo → icons import path
- [x] Defensive try/finally in LeagueGate cold-start
- [x] Invisible back button fix — `chevron-left` Icon alias for `back`
- [x] OnboardingScreen invite-code lookup → `lookup_league_by_invite` RPC (RLS bypass)
- [x] PlayerMgmt deletePlayer also removes claimed user from league_members
- [x] PlatformAdmin destructive-confirm simplified — type DELETE in caps
- [x] Achievements title centered + (earned/total) count badge

**Earlier session pointer (S066, archived):** S066 — 9 PRs + 3 DB migrations in one ~10h day. Phases 7v2/8/9/11/12 (PR1+PR2+fix+spec-port). Closed RulesView "undefined…" preview bug as first item of S067.

### 🐛 KNOWN BUG (fix first thing in S067)
**Rules cards show "undefined…" preview text** for non-`subRules` items (The Serve, Return of Serve, Walls & Fences, Playing Outside Court, Net Touch, Switching Sides, all 8 ARGUED items). Root cause in `RulesView.jsx:23` — `(rule.subRules?.[0]?.content?.slice(0, 88) + "…")` evaluates to `"undefined…"` when `subRules` is absent. **Fix:** wrap in a ternary so missing branches return `""`:
```js
const previewText = isArgued
  ? (rule.a.length > 90 ? rule.a.slice(0, 88) + "…" : rule.a)
  : rule.intro
    || (rule.subRules?.[0]?.content ? rule.subRules[0].content.slice(0, 88) + "…" : null)
    || (rule.content && rule.content.length > 90 ? rule.content.slice(0, 88) + "…" : rule.content)
    || "";
```
Verified visually in screenshot at session close.

### S067 PLAN — direction options
1. **PR 3 — Admin batch restyle (recommended next)** — AdminDashboard + SeasonManagement + LeagueManagement + PlayerManagement + PlatformAdmin all need spec port. Read spec lines 1977-2173 (`AdminScreen` / `LeagueMgmtScreen` / `SeasonMgmtScreen` / `PlatformScreen` / `PlayerMgmtScreen`). Branch: `feat/46-phase12-admin-batch`. SW v101→v102. Probably ~300-400 lines source + ~100 lines CSS. One PR fine; user already approved this scope earlier.
2. **PR 4 — Pending/Rejected approval-gated join workflow (DB-touching, NEW feature)** — spec has `PendingApprovalScreen` (line 2250) + `RejectedScreen` (line 2278) + `ApprovalQueueScreen` (line 2309) for a workflow that doesn't exist in our app yet. Currently OnboardingScreen joins immediately on invite-code submit; spec wants admin approval first. Requires: DB migration (`join_requests` table + RLS + RPCs `create_join_request` / `approve_join_request` / `reject_join_request`), 3 new screens, OnboardingScreen step 3 rewire to call `create_join_request` instead of immediate join, admin queue UI integration. Big scope; user-flagged as deferrable.
3. **Quick polish backlog** — `RulesView` undefined preview fix (above) · Admin Dashboard already gets a card-based intro per spec (the `.saar.pr` row in Settings linking to Admin) · Verify any other `<Icon name="..."/>` cases that don't render correctly on iPhone after SW v101 rolls out.

User picks at cold-start. **Production live at padel-battle.vercel.app on SW v101.**

### Issue #46 master redesign — STATUS at end of S066
| Phase | What | Status | PR |
|---|---|---|---|
| 1 | Foundation (tokens + Icon.jsx) | ✅ | #47 |
| 2 | Header + bottom nav | ✅ | #48 |
| 3 | Login + League picker | ✅ | #49 |
| 4 | Ranking screen | ✅ | S061 |
| 5 | Players screen | ✅ | S062 |
| 6a/6b/6c | Drill-in + Analytics + icon sweep | ✅ | #59/#61/#60 |
| 7 / 7v2 | Match cards + ScheduleView | ✅ | #63 / #65 |
| 8 | Gender column + filter pills | ✅ | #66 |
| 9 | LogMatch + EditMatchModal + TeamShuffler | ✅ | #70 |
| 10 | Tournament screens | ⏭ Skipped (not in spec JSX) | — |
| 11 | OnboardingScreen | ✅ | #72 |
| 12 PR1 | Sidebar / Settings / Profile / EditMyProfile fix | ✅ | #73 |
| 12 PR2 | Ranking globe header + Rules first-pass | ✅ | #74 |
| 12 fix | Rules emoji→Icon swap + switch icon + back btn | ✅ | #76 |
| 12 spec port | Rules collapsible cards + search + filter pills | ✅ | #77 |
| 12 PR3 | **Admin batch (AdminDashboard + 4 mgmt screens)** | ⏳ **deferred to S067** | — |
| Pending+Rejected | Approval-gated join workflow (DB-touching) | ⏳ **deferred to S067 / later** | — |

### S066 outcomes (archived) — 9 PRs + 3 DB migrations
- [x] PR [#65](https://github.com/mmuwahid/Padel-Battle/pull/65) Phase 7 v2 — Match card v2 (split per-team score grid, win/red/loss/red/TB-with-subscript, FINAL col with set count + total points "20-17", reactions popover with 8 emojis, `.mcard overflow:visible`, `.mhd2` rounded top) + Ranking-table tweaks ("Rank" header, country flag center, top-3 medals 22px, ranks 4+ +1pt, `.lbflag` class). Date format slashes dropped. SW v95→v96.
- [x] PR [#66](https://github.com/mmuwahid/Padel-Battle/pull/66) Phase 8 — `players.gender text NULL` migration + Edit forms gender 2-button toggle + spec-faithful sliders-icon-toggled filter bar (`.fbtn` + `.gfilter-bar/.gfpill.fa/.fm/.ff` with All/Men ♂/Women ♀ pills) + Settings field colors blue (#60a5fa) / pink (#f472b6) for Male/Female + leaderboard cells all vertically centered. SW v96→v97.
- [x] PR [#70](https://github.com/mmuwahid/Padel-Battle/pull/70) Phase 9 — LogMatch full restyle (`.modebar/.modebtn/.livedot` Manual/Live mode bar, `.tcard/.shufbtn` inline shuffle, `.sccard/.sctbody/.scrow/.cstep/.csbtn/.csval` score grid with 2/3 sets toggle, `.scrrow` win-tracker, full `.livebi/.liveh/.liverws/.acbtn/.acval/.aclbl/.undobtn` LIVE mode body, `.mvpcard/.mvpiw/.mvplbl/.mvpsel/.mvpch` MOTM picker, `.savebtn.on/.off + .savehint`, `.lmerr` validation banner) + EditMatchModal restyle (same vocab, variable-length sets) + TeamShuffler restyle (`.shuf-card/.shuf-pool/.shuf-chip/.shuf-list/.shuf-match` + `.savebtn/.shcancel`). SW v97→v98.
- [x] PR [#72](https://github.com/mmuwahid/Padel-Battle/pull/72) Phase 11 — `players.date_of_birth date NULL` migration + new OnboardingScreen.jsx (3-step wizard: 1) Display Name + Country, 2) Photo placeholder + DOB + Gender + Playing-side per spec, 3) Join via invite code OR create new league with auto-player-create) + LeagueGate gate. SW v98→v99.
- [x] PR [#73](https://github.com/mmuwahid/Padel-Battle/pull/73) Phase 12 PR 1 — `players.playing_position` CHECK extended to allow 'any' + EditMyProfile fix (Nickname dropped, DOB added, Left/Right/**Any** with court-l/r/any icons, all-mandatory validation with red asterisk + `.ferr`) + OnboardingScreen step 2 expanded (5 fields + photo placeholder) + Sidebar full restyle (`.ssheet/.sbprof/.sbsec/.sbitem/.sbico/.sbibd/.sbn/.sbe/.sbsl/.sbit/.sbis/.sbbadge/.sbdiv/.sbfoot/.signout` slide-in drawer with 280ms animation) + SettingsView full restyle (`.stbody/.slbl/.stcard/.strow/.stico/.stbod/.sttitle/.stsub/.saar/.staf/.stafL/.stafR/.stafI/.stoggle`) + ProfileView spec header (`.prohero/.propic/.procb/.prorm/.proname/.proemail/.prorole/.protag/.proedit/.prostrip/.prosc/.proscv/.wrsec/.wrh/.wrl/.wrp/.wrbg/.wrf/.hlrow/.hlcard/.hll/.hlv/.hlu`) + gear icon swap (settings was sun-spoke, now proper Feather gear) + Sidebar league subtitle ("14 players · Season 1") + press-state chevron (`.sb-chev` + `.sbitem:active` accent). SW v99→v100.
- [x] PR [#74](https://github.com/mmuwahid/Padel-Battle/pull/74) Phase 12 PR 2 — Ranking flag column header `<Icon name="globe">` (centered) + Rules first-pass restyle (token cleanup with .rules-h family).
- [x] PR [#76](https://github.com/mmuwahid/Padel-Battle/pull/76) Phase 12 fix — Rules emojis dropped, replaced with Icon SVGs (trophy/racket/court-any/alert/refresh/info/help) + `.rcico` 30×30 rounded chip + Settings 'Switch League' icon league→switch + Settings back button structure aligned with Profile/Rules pattern + `.back-btn` shared class.
- [x] PR [#77](https://github.com/mmuwahid/Padel-Battle/pull/77) Phase 12 spec port — Full Rules rewrite to spec class names verbatim (`.rtb/.rtbey/.rtbh1/.rtbsub` header + `.rtsrchw/.rtsrchi/.rtsrch` search + `.rtfbar/.rtfpill.fg/.fo/.pillct` filter pills All/Rules/Disputes with counts + `.rtbody` + `.rcard.q.open / .rchd / .rcico / .rctw / .rct / .rcprev / .rcchev / .rcbody.op/.cl / .rccont` collapsible cards) + collapse animation (max-height 280ms cubic-bezier) + chevron rotate 90° + press-state `.rcard:active` scale(.99) accent feedback + live search + count-aware filter pills + empty state. New `RulesView.jsx` component extracted.
- [x] DB migrations: `s066_add_players_gender_column`, `s066_add_players_date_of_birth`, `s066_extend_playing_position_any`. All idempotent (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS pattern).

### Earlier session history (S065 archived below)
**Last session:** S065 (2026-05-08) — **Four PRs shipped in one big day**. Phase 6b + Phase 7 + 2 hotfix bundles. Production now on **SW v95**.

**PR [#61](https://github.com/mmuwahid/Padel-Battle/pull/61) (`75cbf4f`, SW v91→v92):** Issue #46 **Phase 6b — Analytics views restyle** + iOS-18 nav spring restoration. PlayerStats analytics block (lines 217–490) refactored to class-based markup. User decisions: Q6=B (Phase 5 `.seg/.sb` 4-col variant for sub-tab bar via new `.seg-4/.sb-4`) · Q7=C (`.dpro-sec-card` frames from Phase 6a) · Q8=B (spec `.elobars` chart for League Activity — no axis, gradient bars, dates beneath) · Q9=A (native `<select>` H2H picker kept; refinement deferred) · Q10=hybrid (Biggest Wins removed, **Longest Winning Streak** + **Longest Losing Streak** added — top-5 each, chronological per-player run-tracking inside `analyticsData` useMemo). **Bonus restoration:** iOS-18 spring bounce on bottom nav was missing post-S060 PR #51 (which had hidden `.npill` with `display:none` and replaced active state with flat bg). Phase 2 (PR #48) spring system reinstated on top of S060 saturation: `.npill` opacity 0→1 + `transform: scale(0.6)→scale(1)` over 350ms cubic-bezier; `.ntab.on .nicon { scale(1.12) }`; `.ntab:active .nicon { scale(0.85) }` for tactile press feedback. CSS ~150 lines added. LONG token names only.

**PR [#62](https://github.com/mmuwahid/Padel-Battle/pull/62) (`a68f53d`, SW v92→v93→v94):** **Hotfix bundle — 6 iPhone-smoke regressions**. (1) `.an-body > .seg-4 { margin: 0 }` contextual override — pill was 36px from edge while cards sat at 18px because seg-4's own margin stacked on top of an-body's padding. (2) "Roster (N)" → "Players (N)" header rename in PlayerStats.jsx (cross-app consistency). (3) Edit + trash emoji glyphs in roster edit-mode → `<Icon name="edit|trash"/>`. (4) Leaderboard country cell — dropped ISO3 letters (PSE/TRQ/GBR/LBN), kept just the flag emoji at 16px (was 13px). (5) Leaderboard rank `#` column → `align-self: center` so rank centers vertically with the multi-line player cell. (6) Phase 6b sub-tab emojis 📈🤝⚔️💡 → SVG Icons (`trending-up / users / swords / bulb`). 3 new Icon cases added to Icon.jsx. All bundled to one Vercel preview = one iPhone smoke pass.

**PR [#63](https://github.com/mmuwahid/Padel-Battle/pull/63) (`bf0a9d4`, SW v94→v95):** Issue #46 **Phase 7 — Match cards restyle + ScheduleView simplification + Schedule form spec port**. User decisions Q1=A (MOTM absolute-centered gold pill) · Q2=A (WIN/LOSS label ABOVE team col) · Q3=C (24×24 avatars, no flags) · Q4=A (vertical 80px score column with "Final 2-1" set count chip — user revision from spec's cumulative game total) · Q5=C (incomplete = 60% opacity + 50% saturate hybrid) · Q6=C (My-Pending: collapsible header + `.mcard.pending` inner) · Q7=B (approvals queue: card frame restyle, KEEP Approve/Edit/Reject text labels) · **Q9: DROP the Past tab from ScheduleView entirely** (once played, matches surface in MatchHistory automatically — Past was redundant). MatchHistory.jsx + MatchApprovalsQueue.jsx full rewrites; ScheduleView.jsx restructured. Action buttons → `<Icon name="share|edit|trash"/>` (continues Phase 6c sweep). Phase 7 CSS block ~200 lines. **Schedule form spec port (3rd commit on same branch):** my first .sform draft didn't match the user's reference screenshots — re-ported from `padelhub/docs/PadelHub_Complete_v2.jsx` ScheduleScreen lines 1490–1622 verbatim. Step 1 uses `.sch-progress / .tcard / .tcardh / .shufbtn / .tinner / .tcoldot.tcolha (green) / .tcoldot.tcolhb (gold) / .tcollbl / .tcolvs / .pslot / .psel.af|.bf / .pselch / .savebtn.on|.off / .shcancel / .savehint`. Step 2 uses `.svsum` summary chip + `.tcard` body with `.shlbl` icon-prefixed labels (calendar/clock/court-l/edit), `.shi` inputs, `.stog/.stogbtn` inline duration toggle, `.inote` info banner ("All players will be notified..."), `.savebtn.on` "Schedule Match" with check icon. **Bug caught + fixed:** ScheduleView didn't import Icon — JSX threw on mount, ErrorBoundary masked it. Added `import Icon from './Icon'` (one-line fix). 306-line plan-as-deliverable at `padelhub/planning/issue-46-phase7-match-cards.md`.

**PR [#64](https://github.com/mmuwahid/Padel-Battle/pull/64) (`6414b65`):** Premier Padel team-name format. User-flagged via iPhone screenshot — schedule chip should read "Hamza / Basel vs MAK / Mano". Single-line change in `helpers.js`: `formatTeam(p1,p2)` separator `x` → `/`. Per CLAUDE.md rule "always use formatTeam," applies globally to all ~50 call sites with zero JSX edits. Also fixed the `.svsum` chip which I'd built with `.map(getName).join(" & ")` — CLAUDE.md violation from yesterday's Phase 7. Switched to `formatTeam(getName(tA[0]), getName(tA[1]))`.

### S065 outcomes (archived)
- [x] Issue #46 Phase 6b — Analytics views restyle + iOS-18 nav spring (PR #61, SW v91→v92)
- [x] Hotfix bundle — seg-4 alignment + Players rename + edit/trash icons + leaderboard ISO3 drop + rank centering + sub-tab emoji Icons (PR #62, SW v92→v94)
- [x] Issue #46 Phase 7 — Match cards + ScheduleView simplification + Schedule form spec port (PR #63, SW v94→v95)
- [x] Premier Padel team format `formatTeam: " / "` (PR #64)
- [x] Plan drafted: `padelhub/planning/issue-46-phase7-match-cards.md` (306 lines)
- [ ] **iPhone smoke-test of full S065 ship on production (SW v95) — user verified Phase 7 step 2 + spring during session, full app sweep pending**

### S066 PLAN — direction options
1. **Issue #46 Phase 8** (NEW prereq surfaced by user during S065): Add **gender** column to `players` (DB migration) + capture in EditPlayerModal/EditMyProfile/onboarding. **Then** add **All / Men / Women** filter pills + sliders icon button on Players section header (per user's iPhone-mockup screenshot). User explicitly said "maybe it needs a different phase input first that incorporates this in the profile creation/editing section" — they understand the dependency. Branch: `feat/46-phase8-gender-filter`. SW v95→v96. **DB-touching:** new column on `players` (text, NULL allowed for backfill grace period). RLS likely no change (existing `players_update_self` already allows the user to edit their own row). 5–6 line change in EditPlayerModal + EditMyProfile to capture, ~10 lines on roster header for the filter UI.
2. **Inline log-match form restyle inside upcoming `.scard`** — Phase 7 explicitly left this out. Currently the inline form is the original FT-09b styled markup. Smaller surface than the schedule form, similar `.shi/.stog/.savebtn` vocabulary already exists.
3. **Issue #46 Phase 9 candidate** — `LogMatch.jsx` + `EditMatchModal.jsx` restyle (paired since they share form patterns). Larger surface than the inline log form.
4. **Issue #46 Phase 10 candidate** — Tournament screens (GameMode.jsx + BracketSVG.jsx + AmericanoMode.jsx + SE/DE/RR mode files). Big surface, intricate state.
5. **FT-15 Pairs Leaderboard (Issue #25)** — DB-touching, 6 user questions still pending in `padelhub/planning/FT-15-pairs-leaderboard.md`.

User picks at cold-start. **Production live at padel-battle.vercel.app on SW v95.**

**Earlier in S060:** Phases 1 + 2 + 3 ALL SHIPPED to live in one session. Production `padel-battle.vercel.app` on SW v82→v85 (3 fix PRs). Phase 3 added [PR #49](https://github.com/mmuwahid/Padel-Battle/pull/49) squash-merged as `ac7cf35`: AuthGate.jsx (login/signup/recovery) + LeagueGate.jsx (picker) restyled with `.lscreen/.lbg/.lhero/.llogobox/.lbrand/.ltag/.lform/.flbl/.fwrap/.finput/.pwtog/.lcta/.gbg2/.or-div/.llink/.lerr/.lok/.lgcard/.lgsection/.lginline` classes; `@keyframes pg` glow-pulse; animated radial-gradient + 28px-grid backdrop on `.lbg`; password eye-toggle uses `<Icon name="eye"|"eye-off"/>`. PadelLogoSmall kept as brand mark (declined spec's `<Icon name="trophy">`). 3-step OnboardingScreen with claim-player + DOB/gender/playing-side fields explicitly deferred to Phase 11. Phase 3 plan at `padelhub/planning/issue-46-phase3-login-onboarding.md`.

### S064 outcomes (archived)
- [x] Issue #46 Phase 6a — drill-in player profile restyle (PR #59 → `a3fda56`, SW v89→v90)
- [x] Issue #46 Phase 6c — header bell + sidebar icon sweep (PR #60 → `3370ab6`, SW v90→v91)
- [x] Plan drafted: `padelhub/planning/issue-46-phase6-analytics.md` (covers 6a/6b/6c)
- [ ] **iPhone smoke-test of 6a + 6c on production (SW v91) — user pending**
- [ ] Phase 6b deferred to S065

**Spec scope:**
- Podium card with 1st/2nd/3rd, medals, names, W/L, EFF%, ELO
- Rankings table (8-col): #/medal · player avatar+name + form-dots stacked · country flag · MP · MW · ML · EFF%
- Season selector pill at top right
- Existing season awards section preserved (calculateSeasonAwards stays untouched)

**Caveats vs current code:**
- Ranking tab lives in App.jsx (lines ~942+) — large surface, similar CRLF gotcha risk as Phase 2; default to Node script over Edit
- `seasonLb / seasonElo / getSeasonForm / getSeasonStreak` selectors stay (S055)
- `selectedSeason / setSelectedSeason` from LeagueContext (S057)
- DO NOT touch the season awards calc — only restyle the awards card display

**Branch:** `feat/46-phase4-ranking` off `main`. Bump SW v85 → v86.

**MANDATORY pre-merge gate (per `feedback_issue46_dont_take_spec_literally.md`):**
1. List prior tunings on the Ranking tab — grep for S### / Lesson / FT-NN markers in `git log --oneline -- src/App.jsx` against `/tmp/Padel-Battle`
2. Diff every visual property between spec (LeaderboardScreen lines ~1190+) and current live values (S047 redesign, S055 season isolation, S056 awards layout, S057 NavIcons, S058 fixes)
3. Classify each diff: spec-wins (no prior reason) / prior-wins (documented S### bug fix) / **ambiguous → ASK USER**
4. Run `getComputedStyle` checks pre-PR-open on `.lbtitle / .pod / .lbtable / .lbrow / .form-dots / .lbavi` to confirm no regressions
5. **Don't bundle architecture migration with visual changes** — if the Ranking tab needs structural extraction, do it as 2 PRs (architecture-only that reproduces visuals byte-for-byte, then visual-tweak)

**Verification:** standard PR + Vercel preview READY + iPhone smoke-test gate (NOT auto-merge).

**Hand-off:** if Phase 4 verifies green, draft Phase 5 plan.

### Inherited from S060 (still in effect):
**Last session:** S060 (2026-05-07) — Phases 1 + 2 + 3 of #46 ALL SHIPPED to live in one session. **Phase 1** (PR [#47](https://github.com/mmuwahid/Padel-Battle/pull/47), squash-merged as `9325a55`) deployed Phase 1 tokens + new Icon.jsx (56 cases) + tokens-demo.html, SW v80. **Phase 2** (PR [#48](https://github.com/mmuwahid/Padel-Battle/pull/48), squash-merged as `4f7f693`) refactored AppHeader + bottom-nav from inline-styles to class-based markup using Phase 1 tokens, deleted tokens-demo.html, SW v81. Both production Vercel deploys READY. NavIcons.jsx (S057) untouched — bottom-nav `.nicon` renders `<NavIcon>` artwork, NOT the new `<Icon>`. **User-flagged icon mismatch in Phase 1 demo:** Icon.jsx racket/players/gamemode cases now use NavIcons.jsx silhouettes verbatim (commit `95c4a1f`, included in PR #47). **Auto-memory:** `feedback_nav_icons_frozen.md` enforces the freeze across all future phases. **Open issues:** #46 (Phase 3+ pending; Phases 1+2 closed via merges), #25 (pairs deferred).

### S061 PLAN — Issue #46 Phase 3 Login + Onboarding
**Read first:** Phase 3 plan needs to be drafted at `padelhub/planning/issue-46-phase3-login-onboarding.md` BEFORE building. Reference `padelhub/docs/PadelHub_Complete_v2.jsx` lines ~1023–1240 for `LoginScreen` + `OnboardingScreen` spec.

**Spec scope (per #46 master plan):**
- `LoginScreen` redesign: animated bg, accent-tinted trophy logo block, mono-styled labels, password show/hide toggle, Google OAuth pill, sign-up link, forgot-password + resend-confirmation links.
- `OnboardingScreen` redesign: 3-step progress dots, step 1 (claim existing player or new), step 2 (account profile: name + DOB + country + gender + position), step 3 (join existing league via code OR create new). NEW DB schema additions deferred to Phase 11 — Phase 3 can ship without DOB/gender (capture in localStorage as draft state).

**Caveats vs current code:**
- AuthGate.jsx + LeagueGate.jsx are SEPARATE components from the spec's monolithic LoginScreen/OnboardingScreen. Phase 3 refactors AuthGate + LeagueGate, not App.jsx.
- The spec uses `<Icon name="trophy">` for the login logo accent. Trophy in our Icon.jsx is still the spec version (not the NavIcons.jsx variant); that's fine for login since it's a different visual context than the bottom nav.
- Email/password auth + Google OAuth flows must keep working — Phase 3 is purely visual + structural.

**Branch:** `feat/46-phase3-login-onboarding` off `main`. Bump SW v81 → v82.

**Verification:** standard PR + Vercel preview READY + iPhone smoke-test gate. DoD checklist in plan file (to be drafted in S061 cold-start).

**Hand-off:** if Phase 3 verifies green, draft Phase 4 plan at `padelhub/planning/issue-46-phase4-*.md`.

### Decisions locked (S060) — applies to all future phases:
- **Push-to-main blocked by harness.** Always feature-branch + PR + `gh pr merge <N> --squash --delete-branch`. User pre-authorized squash-merge for visual-noop phases (#47); visual-change phases need explicit "merge it" go-ahead before merging.
- **NavIcons.jsx is FROZEN forever.** Never migrate the bottom nav to the new `<Icon>` — `<NavIcon>` permanently owns Trophy/Racket/Players/CrossedRackets artwork.
- **Tokens use spec's LONG names** (`--accent`, `--ease-spring`, `--r-md`) — never the JSX short aliases.
- **iOS rubber-band overscroll seam fix (Lesson #40)** + **dynamic-island gap reset (Lesson #44)** are load-bearing in App.jsx — `<style>` block with `html,body{margin:0;padding:0;background:#0d0d14;...}`. NEVER remove. Phase 2 added new tokens but did NOT switch body bg to var(--bg) (#080808) — keep deferring.
- **Edit tool fails silently on CRLF files.** When old_string lookup keeps failing on a known-correct snippet, run `tr -d '\r' < file > file.tmp && mv file.tmp file` first (git auto-restores CRLF on commit via core.autocrlf=true). For multi-step refactors of large files, prefer Node script with explicit `fs.readFileSync` + index lookup over Edit's pattern matching. (S060 lesson, see lessons.md #68.)

### Other open candidates (all deferred, no S060 blocker):
- **FT-14 phase 2** — apply Option C hybrid to ranking screen (leaderboard shows union of `season_players` + match participants for selected season) + LogMatch/ScheduleView player picker filtered to current-season roster. **DB schema is ready, RPCs are owner-gated. No new migrations needed — phase 2 is pure frontend wiring against existing `season_players` data.** Most natural follow-up since S050 shipped the management UI.
- **SE/DE stepper conversion** (deferred since S043) — `SingleElimination.jsx` + `DoubleElimination.jsx` use uncontrolled inputs read via `document.getElementById(...).value` at submit. Convert to controlled `scores` state keyed by `${ri}-${mi}`, replace getElementById reads, add ScoreStepper, **and apply S045's `validateMatch` validator at submit.**
- **FT-07 Player Deletion Redesign** — needs FRESH plan written. Soft-delete vs hard-delete UX, reactivate path, leaderboard/H2H/stats filter rules, RLS implications. Reference S044's `approvedMatches` filter selector pattern.
- Optional cleanup: kill stale `tournaments` realtime sub; `SET search_path = public` on pre-S045 SECURITY DEFINER functions; country/position backfill for other leagues' players.
- Header escalation path documented (in case any future regression): replace `position:sticky` with `position:fixed; top:0; left:0; right:0` + height-matching spacer below to fully decouple from natural document flow.

### Additional misc deferred items:
- **Render playing position on ranking screen** — once user supplies position presets (not yet provided).
- Country/position backfill for other leagues' players (only Padel Stars + Ryan have country values so far).
- `didPlayerWin` extraction across leaderboard/H2H/stats — defer until those areas are next touched.
- Optional: extend BL/GD team-identity convention to LIVE mode + ScheduleView inline log form (S043 deferred).
- Optional: re-evaluate keeping the `tournaments` realtime sub now that the state is gone.

### ⚠️ COLD START RULE (MANDATORY):
1. `git pull` in /tmp/Padel-Battle (or fresh clone if missing — happens on a different PC)
2. `diff -rq /tmp/Padel-Battle/src/ padelhub/src/` — check for desync
3. If ANY files differ → copy from git repo to local padelhub/
4. Read `tasks/lessons.md` for prevention rules
5. **Before first `git push`:** verify `cd /tmp/Padel-Battle && git config user.email` returns `m.muwahid@gmail.com`. Set with `git config user.email "m.muwahid@gmail.com" && git config user.name "mmuwahid"` if needed (prevents Vercel instant-ERROR — see S036 lesson).
6. **`gh issue list --repo mmuwahid/Padel-Battle --state open`** — surface any new GitHub-tracked bugs.

### Codebase Stats (as of S020):
- App.jsx: 1,084 lines (28 useState)
- GameMode.jsx: 115 lines (slim orchestrator — down from 1,450)
- Tournament components: BracketSVG (171), AmericanoMode (227), SingleElimination (325), DoubleElimination (344), RoundRobin (277)
- New S020 components: NotificationCenter (143)
- S019 components: Sidebar (100), ProfileView (162), AdminDashboard (144), SettingsView (135)
- Total codebase: ~5,500 lines across 29 source files (21 components)
- Production bundle: 6 chunks, no Vite warnings (S013 splitting)
- Dead assets: all cleaned (S013)
- DB tables: profiles, leagues, league_members, players, seasons, matches, tournaments, challenges, push_subscriptions, notifications (S020), match_reactions (S020)
- Edge Function: push-notify (RPC-based, --no-verify-jwt, CORS-restricted, rate-limited)
- DB RPCs: respond_to_challenge, join_challenge, play_challenge, leave_challenge, + platform admin RPCs

---


---

## Earlier session history (archived)

Phase 6 → S039 completed-block details live in [`_archive/todo-history-pre-s041.md`](_archive/todo-history-pre-s041.md). Rotated 04/MAY/2026 to keep this file focused on the active agenda.

## Future / Backlog
- [x] Add JWT verification to push-notify Edge Function — done S028
- [x] DB CHECK constraints (team_a/team_b array length = 2) — done S028
- [x] Tournament version column for optimistic concurrency — done S028
- [x] useLeague() migration — 4/8 done, closed as optional (no perf benefit) — S028
- [x] **FT-09: Match Approval + Admin Promotion** — done S044 (GitHub issue #8). Pending status column, trigger, RLS, 4 RPCs, role badges, EditMatchModal, My-Pending section, 4 notification variants. Live on prod.
- [x] **FT-09b: FIP Scoring Enforcement** — done S045. Per-set FIP shape validation (6-0..6-4, 7-5, 7-6 only), match completeness gate, `incomplete` status for valid-but-no-2-set-winner matches, dead-rubber auto-truncate, frontend validator + DB CHECK constraint defense-in-depth, existing data rectified.
- [x] **Issue #12: Premier Padel UI polish** — done S046. Header gradient blends under status bar, italic uppercase wordmark, floating pill bottom nav with pedestal, 2-col Players grid, dedicated Player Management screen with EditPlayerModal (photo + country + position), DB columns + 13-row country backfill, storage policies. SW v52→v54.
- [x] **Issue #11: Ranking format + terminology** — done S047 (commit c415b1a). Bottom nav Leaderboard→Ranking + Combos→Partners. Ranking screen redesigned: italic title + season selector + 8-column table (#/Player/Country/MP/MW/ML/CW/Eff%) + Last-5 Form strip. PlayerStats 5 flash-card renames + MOTM section. Nav bar re-locked. SW v54→v55.
- [x] **Issue #13: Admin dashboard consolidation** — done S048 (commit 1e6d58a). Admin Management section + Platform Admin button moved INTO AdminDashboard. SettingsView no longer has Admin Management. Sidebar no longer has Platform Admin button; Invite Players gated on `isAdmin`. `updateMemberRole` added to LeagueContext. SW v55→v56.
- [x] **Issue #15: Nav footer + header polish** — done S049 (commit d3200d6). Bottom nav floating-pill 14→6px above safe-area; pedestal 82→68; wrapper paddingBottom 96→82. Header overscroll fixed via `html,body{background:#0d0d14;overscroll-behavior-y:none;}` injected at App.jsx style block — matches gradient start so iOS rubber-band no longer reveals BG above sticky header. SW v56→v57.
- [x] **Issue #19: Partners screen 'Pairs' renames** — done S051 (commit a310946). CombosView sub-tab Best Duos→Best Pairs + Top/Worst Partnerships→Top/Worst Pairs (3 strings); PlayerStats partnership analytics cards Best/Worst Partnerships→Best/Worst Pairs (2 strings). Matches Premier Padel terminology. SW v61→v62.
- [x] **Issue #18: Dynamic island header gap at scrollY=0** — done S051 (commit ea7da90). Root cause: S049 CSS injection patched bg+overscroll on html/body but never reset margin/padding; iOS PWA black-translucent left implicit body offset that sticky `top:0` masked when scrolled but exposed at scrollY=0. Fix: extended injection at App.jsx:779 to `html,body{margin:0;padding:0;...}` + `#root{margin:0;padding:0}`. Plus index.html theme-color #0a0a0f→#0d0d14 to match body bg/header gradient start. SW v62→v63. iPhone-confirmed working.
- [x] **Issue #20: Photo upload — first-attempt failure + photo not propagating** — done S052 (commit e439b0a + follow-up 3b9ef98). New `decodeImageFile(file)` helper at utils/helpers.js using createImageBitmap (with Image+objectURL fallback) replaces fragile FileReader→dataURL→Image chain that was failing intermittently on iOS Safari PWA. Applied in both App.jsx uploadAvatar + EditPlayerModal uploadPhoto. App.jsx now write-throughs to claimedPlayer.avatar_url + triggers loadLeagueData() so My Profile uploads propagate to ranking/players/partners/H2H/Insights. PlayerStats.jsx gained `getAvatar(pid)` helper + 8 avatar slots updated (drill-in profile, Insights Most Active + MOTM Ranking, Best Pairs, Worst Pairs, H2H opponents ×2, Players grid). SW v63→v64→v65. iPhone-confirmed.
- [x] **Issue #21: My Profile sidebar entry consolidation** — done S052 (commit e439b0a). Removed standalone "👤 My Profile" sidebar button + the divider that followed it. Wrapped top user info block (avatar+name+email) in a `<button>` → opens My Profile. Added `›` chevron hint on the right. iPhone-confirmed.
- [x] **Issue #22: Settings reorganization + self-serve account delete** — done S053 (commits 4117846, d22c57a). Account section moved to bottom (order: Notifications → League → Account → Danger Zone). Sidebar Switch League button removed. New Danger Zone with progressive disclosure (button-only default, full block on tap) + working delete via SECURITY DEFINER RPC `delete_my_account()` (DB migration `s053_delete_my_account_rpc`): refuses if user owns leagues, unclaims players for history preservation, deletes notifications/push/memberships/profile + auth.users. Frontend signs out on success. Bottom version row removed. SW v65→v66→v67. iPhone-confirmed.
- [x] **Issue #23: Best/Worst Pairs avatars + always-show + gate fix** — done S053 (commits 4117846, badc389). Both pair cards in PlayerStats analytics→Partners restructured: avatar A | centered names+W-L | avatar B (flex with minWidth:0 + ellipsis + flexShrink:0). Worst Pairs always renders with "No losing partnerships yet" empty-state. Follow-up: dropped `partnerships.length >= 6` gate that was hiding worst pairs at per-player scope when league had plenty of data (Lesson #51). SW v67→v68. iPhone-confirmed.
- [x] **Issue #14: Season management (phase 1)** — done S050 (commit a24f2b9). DB: 3 staged migrations (`season_players` table + backfill 15 rows + 6 owner-gated SECURITY DEFINER RPCs via new `_assert_league_owner` helper). Frontend: `SeasonManagement.jsx` (~280 lines, CRUD: create with clone-from-previous, end, reactivate, edit name/dates, edit per-player roster atomically). Single-active enforced. **Phase 2 (ranking + LogMatch picker filtering by season roster) deferred to S051.**
- [x] **Issue #16: Admin Dashboard rework** — done S050 (commit a24f2b9). Scroll-to-top fixed (sidebarView dep). Platform Admin "← Back" arrow. AdminDashboard restructured: removed S048 Admin Management (redundant), new League Management section with editable league name + invite + Season Management button. Sections: Roster → League Management → Data Export → Platform Admin.
- [x] **Issue #17: Player Management text + flash card subtitle** — done S050 (commit a24f2b9). "hand" → "side"; Player Management button subtitle stripped.
- [x] **My Profile user self-edit** — done S050 (commit 985457c). New RLS policy `players_update_self` + new `EditMyProfile.jsx` slim bottom-sheet. User can now set own name/nickname/country/playing position from My Profile → ✎ Edit Profile button. Country/position/nickname chips render under role badge in ProfileView.
- [x] **CountrySelect searchable combobox + full UN list** — done S050 (commits 594d89e + f617c1c). New `CountrySelect.jsx` component replaces native `<select>` in EditPlayerModal + EditMyProfile. COUNTRIES expanded 42 → 195 entries (all UN states + Palestine + Taiwan + Vatican, sorted alphabetically by name, **Israel intentionally excluded**). `helpers.js` ISO3_TO_ISO2 map expanded to match. Filter is per-word startsWith ("p" → Pakistan/Palau/...; "south" → all 3 South-x; "korea" → both Koreas).
- [x] **Flag emoji font stack** — done S050 (commit f617c1c). Fixes Windows "PS" letter-block fallback. New `.flag` global CSS class with emoji-priority font stack applied to all 7 flag-rendering spans across 6 components.
- [ ] Any user-reported issues from production testing
- [ ] **FT-07: Player Deletion Redesign** — Unified two-option flow (Remove from League vs Delete All Data). Requires DB migration (`players.active` boolean column). Soft-delete preserves name + history + leaderboard; hard-delete purges matches + player. Reactivate option for soft-deleted players. Same flow from AdminDashboard and PlayerStats. Plan approved 2026-04-09 — see `plans/refactored-jumping-ember.md`. **PLAN FILE LOST** — original was overwritten by FT-08. Needs fresh plan reconstruction. **Reference S044's `approvedMatches` filter selector pattern** for soft-delete UX.

---

### Deferred / Backlog
- [x] BF-13: Google auth branding — PARTIALLY DONE. App name, logo, support email, home page set in Google Console. Verification skipped (requires custom domain, not needed for friends-only app). Custom auth domain still needs Supabase Pro ($25/mo) — cosmetic only.
- [x] User verified admin dashboard works on phone (confirmed 2026-04-01)

## Future Updates — CANCELLED (user decision 2026-04-01)
~~Phase 8+: GN-20, multi-league, social features, dark mode refinement~~
~~Phase 9+: venue integration, white-label, AI predictions~~

## Open Questions
- ~~Should ELO recalculate when a match is deleted?~~ → YES, confirmed auto-recalculates via useMemo (S027)
- PWA caching strategy: currently network-first via sw.js — revisit if offline mode needed

## GitHub & Deploy
- **Repo:** github.com/mmuwahid/Padel-Battle (main branch)
- **Live:** padel-battle.vercel.app (auto-deploys from main)
- **Vercel team:** team_HYo81T72HYGzt54bLoeLYkZx
- **Vercel project:** prj_bzHHFRoGxhigKIecyN20vw4M1rrr

## Deploy Process
1. Validate syntax: `node -e "require('esbuild').buildSync({...})"`
2. Clone repo to /tmp, copy files, commit, push via git CLI
3. Vercel auto-deploys on every push to main
4. Test on https://padel-battle.vercel.app

## Upcoming Projects
- SafeMix Portal — requirements gathering phase
