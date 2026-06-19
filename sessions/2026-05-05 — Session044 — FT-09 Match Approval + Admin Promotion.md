# Session Log — 2026-05-05 — Session044 — FT-09 Match Approval + Admin Promotion

**Project:** PadelHub
**Phase:** Post-P7
**Duration:** ~6 hours (incl. multiple iPhone-test rounds)
**Commits:** fb6b3c7 (initial FT-09 ship), 4329493 (hotfix — admin notifications + queue relocation + Promote button bugfix attempt #1 + password show/hide), 141c0aa (close issues #9/#10 — header padding v1 + FIP scoring rules), e7b6a59 (header v2 + diagnostic), a78b537 (real Promote root cause + challenge confirm bug), b756a98 (role-change UI purple→gold + push notification on promote/demote), 5560e1a (Remove → Delete on player management), a896849 (header v3 — shrink content not just padding)

---

## What Was Done

### Decision: Tackle GitHub issue #8 before deferred S044 candidates
Cold start surfaced a brand-new GitHub issue (#8 "admin approval for logged matches") created the same morning. User asked to handle it before the previously planned SE/DE stepper conversion or FT-07. Resulted in FT-09 — bundles match approval queue + admin role promotion in a single migration + single deploy. Plan written to `padelhub/planning/FT-09-match-approval.md` (git-tracked-able, per S043 lost-plan lesson).

### Mockups (5, all approved without edits)
- `mockups/ft-09-mockup-1-admin-queue.html` — Match Approvals queue card with gold-bordered pending rows, count badge, Approve/Edit/Reject button row, empty state
- `mockups/ft-09-mockup-2-edit-modal.html` — Full edit form (Date / Team A / Team B / Sets / MOTM) + live diff banner + "Save & Approve" CTA
- `mockups/ft-09-mockup-3-promote-demote.html` — Player rows with ★ Owner / ⚡ Admin / You badges, owner-only Promote/Demote buttons, inline confirm strip
- `mockups/ft-09-mockup-4-pending-submissions.html` — "My Pending" collapsible section above MatchHistory's approved list
- `mockups/ft-09-mockup-5-notifications.html` — 5 notification card variants (pending, approved, edited, rejected, role_change) with diff inset for edits

Followed S043 pattern: copy mockup → `padelhub/public/` → preview_eval to navigate → preview_screenshot at mobile viewport → user reviews → remove file before commit (mockups never enter git).

### DB Migration (5 sub-migrations, applied via Supabase MCP)
1. `s044_match_approval_schema` — `matches.status` column (`'pending' | 'approved'`, default 'pending'), backfilled all 7 existing rows to 'approved', 3 indexes (`league_id+status`, partial pending, partial logged_by+pending)
2. `s044_match_approval_trigger` — BEFORE INSERT trigger calls existing `is_league_admin_or_owner(lid, uid)` to flip status to 'approved' for admin/owner submissions. Single source of truth — covers direct INSERTs (LogMatch + LIVE finalize) AND `play_challenge` RPC (ScheduleView)
3. `s044_match_approval_rls` — DROP + CREATE `matches_select` policy. New 3-way union: approved-as-member OR pending-mine OR pending-as-admin. Realtime subscriptions inherit this filter automatically
4. `s044_match_approval_rpcs` — 4 SECURITY DEFINER RPCs: `approve_match`, `reject_match` (hard delete + notify), `update_pending_match` (server builds JSONB diff), `set_member_role` (owner-only)
5. `s044_play_challenge_returns_jsonb` — DROP + CREATE `play_challenge` (return type uuid → jsonb `{id, status}`). ScheduleView reads back status to drive toast
- Reused existing helpers: `is_league_admin_or_owner`, `get_user_league_ids`, `get_user_admin_league_ids`. No re-implementation
- Defense-in-depth applied: every UPDATE/DELETE includes `league_id` in predicate (S030 lesson), FOR UPDATE row locks, status guards on reject DELETE

### Frontend (single commit fb6b3c7, 9 files, +659 / -90)
- `src/App.jsx` — `isOwner` state split from `isAdmin`. `myMemberId` for own role lookups. Added `approvedMatches` and `pendingMatches` `useMemo` selectors right after `getName()`. Switched ELO + ps + getStreak + getForm + season awards to read `approvedMatches`. Switched MOTM count, ProfileView/CombosView/PlayerStats/LogMatch/ScheduleView's `matches` prop pass-through to `approvedMatches`. Context exposes: `isOwner`, `myMemberId`, `approvedMatches`, `pendingMatches`, `leagueMembers`, `memberProfiles`. Members select now also pulls `id` (needed for role-mutation RPC)
- `src/components/AdminDashboard.jsx` — Match Approvals queue at top with PendingRow sub-component (gold-tint design, Approve/Edit/Reject grid). Player rows now show role badges (★ Owner / ⚡ Admin / You) + inline Promote/Demote buttons (owner-only, claimed players only, not the league owner). Inline confirm strip before role mutation. Regenerate Code button gated to `isOwner`. CSV export now includes `status` column
- `src/components/EditMatchModal.jsx` *(new, 198 lines)* — Full match editor with all-field controlled state, live diff calculation in `useMemo`, ScoreStepper integration for set scores, green-tinted diff banner shown only when changes exist, "Save & Approve" calls `update_pending_match` RPC. Handles team-player constraints (excludes already-picked players from selects)
- `src/components/MatchHistory.jsx` — destructure `approvedMatches` (renamed locally to `matches` to keep existing JSX intact) + `pendingMatches`. Derived `myPendingMatches` = pendingMatches.filter(m => m.logged_by === user.id). New collapsible "My Pending" section above approved list, hidden when count = 0
- `src/components/LogMatch.jsx` — INSERT now `.select("status").single()`. Closure-scoped `insertedStatus` drives toast text + push gating. Pending submissions get "Submitted — waiting for admin approval", skip the broadcast push (admin server-notification handled by trigger / future edge function path)
- `src/components/ScheduleView.jsx` — `play_challenge` RPC return shape changed; reads `result.status` (with legacy uuid fallback). Same pending-toast handling as LogMatch
- `src/components/NotificationCenter.jsx` — `ft09Variant(n)` helper detects `data.kind` and returns icon char + color (✓ green / ✎ blue / ✕ red / ⚡ purple). New `data.diff` inset rendering for edited-and-approved variant (each diff line: field + old strikethrough + arrow + new highlighted)
- `src/components/SettingsView.jsx` — Admin Management section gated to `isOwner` (was `isAdmin`). Local var `isOwner` renamed to `memberIsOwner` to avoid shadowing the prop
- `public/sw.js` — `CACHE_NAME` v43 → v44

### Verification
- All 8 changed JSX files pass per-file esbuild syntax check (path-with-spaces blocks ESLint runner — S042 lesson)
- Live preview reload after each step: zero console errors, zero server errors, app loads to league gate normally
- Post-migration sanity: `SELECT status, COUNT(*) FROM matches GROUP BY status` returned `{approved: 7}` — all existing matches preserved
- Vercel deployment `dpl_43aQv5TLgmfBs4Yu6F4qDsMw7yN6` READY (~8s build)
- iPhone end-to-end smoke test deferred to user (PWA cache invalidates to v44 on next load)

---

## Files Modified

### Commit fb6b3c7 — 9 files (+659 / -90)
- `src/App.jsx` — isOwner state, approvedMatches/pendingMatches selectors, context expansion, stats consumers switched
- `src/components/AdminDashboard.jsx` — Match Approvals queue + role promotion + edit modal launcher (294-line rewrite)
- `src/components/EditMatchModal.jsx` *(new)* — admin edit form + live diff
- `src/components/MatchHistory.jsx` — My Pending collapsible section
- `src/components/LogMatch.jsx` — pending toast + push gating
- `src/components/ScheduleView.jsx` — play_challenge JSONB return handling
- `src/components/NotificationCenter.jsx` — 4 new data.kind variants + diff inset
- `src/components/SettingsView.jsx` — Admin Management gated to owner-only
- `public/sw.js` — v43 → v44

### Out-of-repo files (in OneDrive only, not git-tracked)
- `padelhub/planning/FT-09-match-approval.md` *(new)* — full feature plan
- `padelhub/docs/S044-match-approval.sql` *(new)* — migration source-of-truth (already applied to prod)
- `padelhub/mockups/ft-09-mockup-{1..5}-*.html` *(new)* — 5 review mockups

## Key Decisions
- **Bundled migration + role promotion in one feature.** User chose to ship both together (single migration, single SW bump, single deploy) rather than sequence FT-09a + FT-09b. Reduces blast radius windows
- **Owner-only role mutation, NOT admin-promotes-admin.** Prevents privilege drift — one rogue admin can't elevate accomplices. League owner is `leagues.created_by`, cannot be demoted
- **Trigger for status assignment, NOT client.** Single source of truth — direct console-driven INSERT can't bypass. Covers both Supabase Postgres direct insert AND `play_challenge` RPC path
- **`approvedMatches` selector at the App.jsx level**, then passed as the `matches` prop to all stats consumers. Opt-out architecture — only AdminDashboard's queue and MatchHistory's My-Pending section read the raw `matches` array. Less error-prone than each consumer remembering to filter
- **Server-built diff in `update_pending_match`**, not client. Keeps the diff source-of-truth on the server, avoids client-side comparison bugs, and lets the notification body be deterministic
- **`play_challenge` return type changed (uuid → jsonb).** Coupling means the migration and the front-end MUST ship together. Acceptable trade-off because it's the cleanest way to get the new status back to the caller without a second round-trip
- **Pre-migration graceful fallback in front-end.** `approvedMatches = matches.filter(m => !m.status || m.status === 'approved')` — absent status counts as approved. Means front-end could theoretically run before migration without breaking existing data; deploy ordering chose Option B (front-end first locally, migration second on prod, deploy third). All three completed cleanly
- **Mockups stayed in OneDrive only.** Followed established convention — no mockup HTML in git. Plan file lives in `planning/` (also not git-tracked, per existing repo .gitignore convention; future plan files might shift to a tracked location to satisfy S043 lesson but kept consistent here)

## Lessons Learned

### Validated Patterns
- **Stage migrations in independent named sub-migrations.** Five `apply_migration` calls each with a distinct name (`s044_match_approval_schema`, `_trigger`, `_rls`, `_rpcs`, `_play_challenge_returns_jsonb`) gave a cleaner audit trail than one monolithic file, and allowed mid-stage verification (e.g. backfill check after step 1 before adding the trigger). The `S044-match-approval.sql` source file remains the canonical reference but the actual application was per-step. **Why:** Five smaller migrations means five smaller rollback granularities and five distinct verification gates
- **`approvedMatches` derived selector instead of per-consumer filter.** Single useMemo at App.jsx top level. Stats consumers (ELO, ps, getStreak, getForm, season awards, props passed to PlayerStats/CombosView/ProfileView/LogMatch/ScheduleView) all read approved-only. AdminDashboard's queue + MatchHistory's My-Pending are the only two consumers of raw `matches`. **Why:** Opt-out architecture. New stats consumers automatically inherit the filter. New pending-aware consumers must explicitly destructure `pendingMatches` from context — making the choice intentional
- **Reuse existing `is_league_admin_or_owner` helper in trigger + RPCs.** No duplication of the role check logic in 5 different functions. Confirmed it's SECURITY DEFINER, STABLE, and already used by RLS — safe to lean on. **Why:** Follows DRY, and means a future change to "what counts as admin" is a single point of edit
- **Coupled migration + front-end shipped in one commit.** `play_challenge` return shape change is breaking. Bundling the migration application with the front-end commit (deployed after) means there's no window where one is live without the other. **Why:** Pre-existing front-end against post-migration DB would break ScheduleView's challenge logging (would receive jsonb but treat as uuid). Sequencing prevented the gap
- **Stage migration in 5 named pieces via Supabase MCP.** Each `mcp__apply_migration` call records its own migration row in the project. If one step fails, only that piece needs reapplying. **Why:** Beats running a single 200-line file via SQL editor — granular history + per-step verification

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-05-05 | Admin notifications never fired on pending submission, despite NotificationCenter having `data.kind='pending'` rendering. | Two parts: (1) Trigger `trg_matches_set_status` only set the status column — I assumed *somewhere* a fan-out would happen, but never wrote the code. (2) Mockup 5 included the admin-pending notification card, which made me think the path was wired end-to-end. The mockup was aspirational; the implementation was incomplete. | **Notification mockups must be backed by an explicit DB-side fan-out (trigger or RPC).** When designing a notification UI, also write the SQL that populates it. Don't rely on "the trigger handles status, surely something handles notifications too." |
| 2026-05-05 | Promote/Demote button silently invisible because `league_members` select missed `id` column. | Pre-existing query (line 230) was `select("user_id,role,profiles(...)")`. The new feature needed `id` for the role-mutation RPC. I added `id` to the OTHER `league_members` query (line 229, single-row for current user) but missed the multi-row one. The lookup `memberIdByUserId[user_id]` returned undefined → `showRoleControls` short-circuited to false silently. | **When adding a feature that needs a new column, grep for ALL `select()` queries on that table** — not just the one you're looking at. `grep "from(\"<table>\").select"` and update each. Easier: add `id` to every `select` call by default; bytes are cheap, missing columns aren't. |
| 2026-05-05 | Approval queue placement mismatch with user expectation. | Mockup 1 specifically located it inside AdminDashboard. User naturally looked at the Matches tab. I designed it where I drew it, not where it would naturally be discovered. | **For admin actions on user-generated content, prefer co-locating the action with the content surface (the Matches tab) over a dedicated admin sidebar.** Sidebar dashboards work for league-wide settings (rename, regenerate code, manage roster); per-content actions belong inline on the content tab. |
| 2026-05-05 | Promote button silently invisible on prod despite all FE code being correct. Root cause was `league_members_select` RLS policy `(user_id = auth.uid())` from S025 hardening — only the user's own row visible. | I fixed `id` in the select query (commit 4329493) without auditing whether the rows themselves were RLS-restricted. Two layers of "select returns less than expected" — column-level (which I checked) and row-level (which I didn't). | **When a feature relies on enumerating rows of a table behind RLS, write a smoke query first.** Run `SELECT count(*) FROM <table> WHERE <league_filter>` as the affected user before debugging React render gates. Saves diagnostic round-trips. |
| 2026-05-05 | `respond_to_challenge` and `join_challenge` confirmed challenges after only some players accepted. | `bool_and(new_responses->>pid::TEXT = 'accepted')` over a SELECT — bool_and IGNORES NULLs. Players who hadn't responded got NULL lookups, NULL = 'accepted' was NULL, bool_and only evaluated non-NULL values → only counted accepts. | **Never use `bool_and` over a SELECT where missing values must count as failure.** Use `count(*) WHERE condition` against the expected total instead. Pattern: `(SELECT count(*) FROM unnest(arr) AS x WHERE COALESCE(map->>x::TEXT, '') = 'accepted') = array_length(arr, 1)`. |
| 2026-05-05 | Promotion to admin had no push delivery — promoted user only saw the bell badge if they opened the app on their own. | The `set_member_role` RPC inserted an in-app `notifications` row but never invoked the Edge Function. Asymmetry with match-result and challenge notifications which do both. | **In-app + push is the standard pair for any user-affecting state change.** Whenever a feature inserts a `notifications` row for another user, it should also call `sendPushNotification(...)` from the client (or have the Edge Function invoked server-side). Audit any future RPC that does `INSERT INTO notifications`. |
| 2026-05-05 | Header padding changes (12→4→0px) felt invisible to user across 3 deploys. | Padding was already the small contributor to header height. The header CONTENT (logo 32, fontSize 16, subtitle 10) plus the system safe-area inset (47px on Dynamic Island) made up the bulk of the visible height. Tweaking the buffer above content = invisible change on prod. | **For "feels too tall" complaints, scale the content first, padding second.** Pixel diffs of 4–8px in padding rarely register visually; reducing fontSize and image dimensions does. Apple HIG tap targets (32×32 minimum for buttons) are the floor — content typography can scale below this. |

## Next Actions
- [ ] **iPhone smoke test (user)** — load PWA after cache invalidates to v44, verify:
  - Submit a match as a non-admin → toast says "Submitted — waiting for admin approval"
  - Match invisible in MatchHistory for other non-admins (test with second account)
  - Match visible in current user's "My Pending" section
  - Admin sees it in AdminDashboard queue + push notification
  - Approve/Edit/Reject all work; submitter receives the right notification (with diff for edit)
  - Owner promotes member to admin → that member starts seeing the queue
  - Owner demotes admin → that user stops seeing the queue
  - Pending matches don't count in leaderboard, ELO, win rate, partner stats, H2H
- [ ] **SE/DE stepper conversion (deferred again to S045)** — uncontrolled inputs read via `document.getElementById(...).value` need conversion to controlled state before adding ScoreStepper
- [ ] **FT-07 Player Deletion Redesign (still deferred)** — fresh plan reconstruction needed; FT-09 path now has the soft-delete pattern (status column + filter selector) as a reference
- [ ] **Future hardening:** add `SET search_path = public` to all SECURITY DEFINER functions (existing functions don't have it either — would be a separate cleanup pass, not regression-introducing this session)
- [ ] Optional: extend BL/GD team-identity convention from LogMatch manual mode to LIVE mode and ScheduleView's inline log form (S043 deferred item)
- [ ] Optional: kill stale `tournaments` realtime subscription (S043 deferred item — debouncedReload triggers reload with no consumer)

---

## Polish Round (commits b756a98, 5560e1a, a896849)

After the RLS + challenge-confirm bugs were fixed, user iPhone-tested role mutation end-to-end and requested three follow-ups:

### Polish A — Role-change UI: purple → gold (commit b756a98)
User said purple felt off; gold matches the league-status visual language already in use (Owner ★ badge gold, pending-approval banners gold). All 6 sites switched: Promote button color, Confirm strip border, Promote/Demote name highlight in confirm copy, Confirm button background (now gold-on-black to match the approve convention), Admin badge background+border+text. NotificationCenter `role_change` variant icon color also flipped purple → gold for consistency. Owner ★ and Admin ⚡ badges are both gold but stay distinct via icon + label and never co-render on the same player.

### Polish B — Push notification on promote/demote (commit b756a98)
The `set_member_role` RPC inserts an in-app `'members'` notification (already wired since the original migration), but no push was ever sent. Promoted users only saw the bell badge if they happened to open the app. Added a client-side `sendPushNotification("members", title, body, [targetUserId])` call inside `setRole`'s success path. `setRole` signature widened to `(memberId, newRole, targetUserId, targetName)`; the Promote/Demote and Confirm buttons now pass `p.user_id` and the displayed name into the `confirmRole` state object so both are available when the RPC succeeds.

### Polish C — "Remove" → "Delete" on player management (commit 5560e1a)
User: "Remove" implied keep-history-but-deactivate, when the actual behaviour is hard-deletion of the player record. Renamed button label, confirm prompt, and toast. `"Admin access removed"` notification copy intentionally kept (accurate description of role removal — user still exists, only role changes).

### Polish D — Header v3: shrink CONTENT, not just padding (commit a896849)
User reported header still felt too low after v1 (12→4px buffer) and v2 (4→0px + bottom 12→8px). Diagnosis: padding-only changes were imperceptible because the header's `safe-area-inset-top` value is 47px on Dynamic Island devices regardless of any extra buffer, and the header content itself (32×32 logo + 16px h1 + 10px subtitle) was the bulk of the visible height. Real fix: shrink the content.

| Element | Before | After |
|---|---|---|
| PadelLogoSmall | 32×32 | **26×26** |
| `PadelHub` h1 fontSize | 16px | **14px** |
| League/Season subtitle | 10px | **9px** (margin 2→1) |
| Header vertical padding | 8px | **4px** |

Right-side action buttons (Refresh/Bell/Avatar) kept at 32×32 for Apple HIG tap-target compliance. Combined: header drops ~12–14px AND feels substantially smaller because of the proportional scaling.

## Final Round — Real Root Cause (commits e7b6a59, a78b537)

iPhone test after the closure round still showed Promote missing + new bug surfaced:

### Bug A — Promote button still missing (RLS root cause)
Hotfix commit 4329493 added `id` to the `league_members` select but the issue was deeper. Diagnostic block readout from user iPhone (commit e7b6a59):
```
isOwner: true            ✓
user.id: 8362be01-…       ✓
league.created_by: 8362be01-…   ✓ (matches user.id)
leagueMembers: 1 rows    ← BUG (should be 14)
first lm has id: YES
memberIdByUserId keys: 1
```
Root cause: `league_members_select` RLS policy was `(user_id = auth.uid())` from S025 hardening. Returned only the user's own row. With only 1 entry in `memberIdByUserId`, the lookup `memberIdByUserId[other_user_id]` was always undefined → `showRoleControls` short-circuited to false for every non-self player.

**DB fix (commit a78b537, migration `s044_league_members_visible_to_co_members_and_fix_challenge_confirm`):** policy widened to `league_id IN (SELECT get_user_league_ids(auth.uid()))`. Members of a league can now see every other member of that same league. No data leak — player rows already exposed names; this just exposes the (user_id, role) link the app needs.

### Bug B — Challenges confirmed too early
User reported: scheduling a match with 4 players got marked "confirmed" after only the creator + 1 other accepted (instead of all 4).

Root cause in `respond_to_challenge` and `join_challenge`:
```sql
bool_and(new_responses->>pid::TEXT = 'accepted')
```
**`bool_and` IGNORES NULLs.** When a player hadn't responded yet, `new_responses->>pid` returned NULL → `NULL = 'accepted'` was NULL → bool_and only evaluated the non-NULL values. Creator + 1 other accept → `bool_and(true, true)` over 4 players = TRUE (the other 2 NULLs invisible to the aggregate).

**Fix:** explicit count comparison.
```sql
SELECT count(*) INTO accepted_count FROM unnest(all_ids) AS pid
WHERE COALESCE(new_responses->>pid::TEXT, '') = 'accepted';
-- new_status = 'confirmed' only if accepted_count = total_count AND total_count > 0
```
NULL responses now correctly fail the equality and aren't counted.

**Backfill:** one mistakenly-confirmed challenge (id 17488cb7-…) reverted to `pending`.

### Bug C — Header still off (commit e7b6a59)
After commit 141c0aa reduced buffer 12px → 4px, user reported no visible difference. Round 2: top buffer `safe-area + 4px → safe-area + 0px` (zero buffer above safe-area). Bottom padding `12px → 8px`. Whole header now compact — content sits as tight against the Dynamic Island as is safely possible.

### Files (final round, 2 commits)
- e7b6a59: App.jsx (header v2, 2 sites via replace_all), AdminDashboard.jsx (diagnostic block added), public/sw.js (v46→v47)
- a78b537: AdminDashboard.jsx (diagnostic removed), public/sw.js (v47→v48)
- DB migration `s044_league_members_visible_to_co_members_and_fix_challenge_confirm`: 1 RLS policy replace + 2 RPC redefinitions + 1 backfill UPDATE

## GitHub Issues #9 + #10 Round (commit 141c0aa)

After the FT-09 hotfix landed, swept the open GitHub issue queue. Closed all three (#8 was the FT-09 work, plus #9 and #10).

### Issue #9 — Header pushed too low + Dynamic Island clearance
- All 3 header instances (loading skeleton + main app header) used `paddingTop: calc(env(safe-area-inset-top, 0px) + 12px)`. The 12px buffer on top of the safe-area inset pushed content visibly below the iPhone's Dynamic Island
- **Fix:** Buffer reduced 12px → 4px. Header content now sits tight against the safe-area boundary while still clearing the camera cutout. `env(safe-area-inset-top)` automatically respects the Dynamic Island as it changes shape, so no per-device handling needed
- Toast at line 1117 left unchanged (its 20px fallback is intentional for non-PWA browsers where there's no system UI to clear)

### Issue #10 — Add official FIP scoring rules
- User option: replace existing one-liner Scoring rule entry, display-only this session, scoring engine behaviour deferred
- **Implementation:**
  - `src/data/rules.js`: replaced `RULES[0]` (`{title:"Scoring", content:"…"}`) with `{title:"Scoring & Ranked Matches", intro:"…", subRules:[{title, content}, …]}` containing 4 FIP-aligned sub-rules: Match Completion, Deuce Rule, Tie-Break Format, Incomplete/Interrupted Sets
  - `src/App.jsx` Rules tab renderer extended to handle entries with `subRules`. Sub-rules render in CD2-tinted nested cards with GD-coloured headers, distinguishing them from the simpler `content`-only entries used by the other 6 rules
  - Backwards-compatible — the conditional `r.subRules ? (…map…) : <p>{r.content}</p>` keeps existing rule entries rendering identically
- **Deferred:** scoringEngine.js NOT updated to enforce these (no Golden Point switch, no validation that a match has 2 sets won at save time). User explicitly chose display-only this round

### Files (commit 141c0aa, +40 / -6)
- `src/App.jsx` — paddingTop change (3 sites via replace_all) + Rules tab renderer extension
- `src/data/rules.js` — RULES[0] replaced with subRules shape
- `public/sw.js` — v45 → v46

## Hotfix Round (After User iPhone Test)

User-reported issues from initial deploy:

1. **Admin didn't receive a notification** when test account submitted a pending match. **Root cause:** the original migration set status via BEFORE INSERT trigger but never inserted notifications. NotificationCenter had the rendering for `data.kind='pending'` but no DB code ever produced one. **Fix:** new AFTER INSERT trigger `trg_matches_notify_admins` calling `notify_admins_on_pending_match()` that fans out a `type='match'` notification to each league admin (owner + role='admin'), excluding the submitter. Migration `s044_notify_admins_on_pending_match`.

2. **Approval queue not visible on Matches screen.** User looked there expecting it; queue was actually inside Admin Dashboard sidebar (per Mockup 1). User chose option C (inline queue above Matches list). **Fix:** extracted `src/components/MatchApprovalsQueue.jsx` (admin-self-gated, mounts EditMatchModal internally), rendered above MatchHistory's "My Pending" section. AdminDashboard's queue section + edit modal removed; replaced with a one-liner pointer.

3. **Promote button missing in Player Management.** User couldn't find it. **Root cause:** `App.jsx` line 230 selected `league_members.user_id, role, profiles(...)` — no `id` column. `memberIdByUserId[user_id]` always returned undefined → `showRoleControls = isOwner && claimed && !isLeagueOwner && memberId` short-circuited to false. Subtle bug — page rendered fine, button just never showed. **Fix:** added `id` to the select.

4. **Password show/hide on login.** User-requested feature, not a bug. Eye icon (`👁`/`🙈`) inside password field. Two state toggles: `showPassword`, `showConfirmPassword`. Applied to login + signup + recovery flows via new `PasswordField` helper at top of AuthGate.jsx.

### Hotfix files (commit 4329493, +163 / -122)
- `src/App.jsx` — `league_members` select adds `id` column
- `src/components/MatchApprovalsQueue.jsx` *(new, 76 lines)* — extracted queue + EditMatchModal launcher
- `src/components/MatchHistory.jsx` — renders `<MatchApprovalsQueue />` at top
- `src/components/AdminDashboard.jsx` — queue section + edit-modal launcher removed; replaced with pointer text. PendingRow component, approveMatch/rejectMatch handlers, EditMatchModal import all dropped (now in MatchApprovalsQueue). Unused `BL`/`formatDate`/`setTotals`/`pendingMatches`/`user`/`players` imports/destructures dropped.
- `src/components/AuthGate.jsx` — new `PasswordField` helper, `showPassword`/`showConfirmPassword` state, all 4 password inputs swapped
- `public/sw.js` — v44 → v45
- DB: migration `s044_notify_admins_on_pending_match` (1 new function + 1 new trigger)

---

## Commits & Deploy
- **Commit 1:** `fb6b3c7` — [Session044] FT-09: match approval + admin promotion
- **Commit 2:** `4329493` — [Session044] FT-09 hotfix: admin notifications + queue moved to Matches tab + password show/hide
- **Commit 3:** `141c0aa` — [Session044] close GitHub issues #9 + #10 (header padding v1 + FIP scoring rules)
- **Commit 4:** `e7b6a59` — [Session044] header v2 + AdminDashboard diagnostic
- **Commit 5:** `a78b537` — [Session044] fix league_members RLS + challenge confirm bug + remove diagnostic
- **Commit 6:** `b756a98` — [Session044] role-change UI: purple → gold + push notification on promote/demote
- **Commit 7:** `5560e1a` — [Session044] AdminDashboard: rename Remove → Delete on Player Management
- **Commit 8:** `a896849` — [Session044] header v3 — actually compact this time (shrink content not just padding)
- **Deploys:** all 8 commits READY. Latest production: `a896849` SW v51
- **Live:** https://padel-battle.vercel.app
- **DB migrations applied (Supabase project nkvqbwdsoxylkqhubhig):**
  - `s044_match_approval_schema`
  - `s044_match_approval_trigger`
  - `s044_match_approval_rls`
  - `s044_match_approval_rpcs`
  - `s044_play_challenge_returns_jsonb`
  - `s044_notify_admins_on_pending_match` *(hotfix — adds AFTER INSERT trigger that notifies admins on pending submission)*
  - `s044_league_members_visible_to_co_members_and_fix_challenge_confirm` *(final round — widens league_members SELECT RLS, fixes bool_and NULL bug in respond_to_challenge + join_challenge, backfills broken-confirmed challenge)*

---
_Session logged: 2026-05-05 | Logged by: Claude | Session044_
