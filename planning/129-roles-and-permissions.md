# Issue #129 — Roles & Permissions: Current-State Assessment + Target Proposal

> **Status:** ANALYSIS ONLY. No database or code changes made. This is the
> "before we build anything" step the issue explicitly asks for.
> **Session:** S092 · **Date:** 2026-06-21
> **Sources:** frontend audit (UI gates, `src/...`) + live RLS policies and
> SECURITY DEFINER RPCs read from the production Supabase project.

---

## 1. The role model today

There are **three effective roles** plus a hidden super-admin. "Owner" is **not**
a stored role — it is derived from `leagues.created_by`.

| Role | How it's determined | Stored where |
|------|--------------------|--------------|
| **Owner** | `leagues.created_by === user.id` | derived (not a DB value) |
| **Admin** | `league_members.role = 'admin'` (owner always counts as admin too) | `league_members.role` |
| **Member** | `league_members.role = 'member'` (default) | `league_members.role` |
| **Platform super-admin** | hardcoded UUID `8362be01-…09159` | `PlatformAdmin.jsx` constant |

- Only **two** role strings exist in the DB: `'admin'` and `'member'`.
- Frontend computes: `isOwner = (created_by===uid) || platform`; `isAdmin = isOwner || role==='admin' || platform` (`App.jsx:459-462`).
- Roles are **scoped per-league**. There is currently **no season-level role** — `season_admins` table exists but is only read for display; nothing writes per-season admins today.

---

## 2. Two enforcement layers (this matters)

Every capability is governed at **two** layers:

1. **UI gate** — whether the button/screen is shown (`isAdmin`/`isOwner` checks in React).
2. **Database** — Row-Level Security policies + SECURITY DEFINER RPCs that run with
   elevated rights but re-check the caller's role internally.

**The database is the real security boundary.** The UI gate is convenience/UX.
Where the two disagree, the DB wins. Helper functions used by RLS:
`get_user_admin_league_ids(uid)`, `get_user_league_ids(uid)`,
`is_league_admin_or_owner(lid,uid)`, `is_platform_admin()`,
`_assert_can_manage_season(season_id)`.

---

## 3. Current-state permission matrix

Legend: ✅ allowed · ❌ blocked · 👤 own records only

| Capability | Member | Admin | Owner | DB enforcement (authoritative) |
|---|:--:|:--:|:--:|---|
| View league data (leaderboard, players, matches, seasons) | ✅ | ✅ | ✅ | `*_select` = any league member |
| Log a new match | ✅ | ✅ | ✅ | `matches_insert` = any member |
| Edit own **pending** match | 👤 | ✅ | ✅ | `matches_update_self_pending` (own+pending) / `update_pending_match` RPC (admin) |
| Edit an **approved** match | ❌ | ✅ | ✅ | `matches_update_admin` = admin only **(UI shows the Edit button to everyone — it just fails for members; cosmetic bug, see §5.2)** |
| Approve / reject pending matches | ❌ | ✅ | ✅ | `approve_match` / `reject_match` RPC → `is_league_admin_or_owner` |
| Delete a match | ❌ | ✅ | ✅ | `matches_delete` → admin |
| React to matches (emoji) | ✅ | ✅ | ✅ | `match_reactions_*_own` |
| Edit **own** player profile | 👤 | 👤 | 👤 | `players_update_self` (user_id = self) |
| Edit **other** players' profiles | ❌ | ✅ | ✅ | `players_update_admin` = admin |
| Add a player to the league | ❌ | ✅ | ✅ | `players_insert` = admin |
| Delete a player | ❌ | ✅ | ✅ | `players_delete` = admin |
| Approve / reject join requests | ❌ | ✅ | ✅ | `approve_join_request` RPC → `is_league_admin_or_owner` |
| Invite players (share code) | ✅* | ✅ | ✅ | *invite-code is readable by any member; UI only shows the invite link to admins (see §5.3) |
| Regenerate invite code | ❌ | ❌ | ✅ | `leagues_update` = created_by |
| Create a season | ⚠️✅ | ✅ | ✅ | `seasons_insert` = **any member** at DB; UI gates to admin (see §5.1) |
| Edit season name / dates / location | ❌ | ✅ | ✅ | `update_season` RPC → `_assert_can_manage_season` |
| Edit season roster (who's in) | ❌ | ✅ | ✅ | `set_season_roster` RPC → `_assert_can_manage_season` |
| Change season format after matches exist | ❌ | ❌ | ❌ | `update_season` blocks format change once matches exist |
| End / reactivate / delete a season | ❌ | ✅ | ✅ | `seasons_delete` / `seasons_update_admin` = admin |
| Edit league name | ❌ | ❌ | ✅ | `leagues_update` = created_by |
| Delete the league | ❌ | ❌ | ✅ | `leagues_delete` = created_by |
| Promote / demote admins | ❌ | ❌ | ✅ | `set_member_role` RPC → **owner only**, cannot demote owner |
| Platform admin panel (any league/user) | ❌ | ❌ | ❌ | platform UUID only |

**Summary:** the model today is a clean coarse 3-tier hierarchy. Owner ⊃ Admin ⊃ Member.
Members are read+log-own; Admins manage content (matches, players, seasons, join
requests); Owner additionally controls the league shell (name, deletion, invite
code, who is an admin).

---

## 4. What members can and cannot SEE (UI)

Hidden from members entirely: Admin Dashboard, Player Management screen, Season
creation/edit screens, Approvals queue, League settings (name/danger zone/invite
regen), member role controls. Members **do** see: leaderboard, match history,
schedule, their own profile editor, notifications, react buttons, "request to join".

---

## 5. Findings — gaps between intent and reality

### 5.1 `seasons_insert` is too loose (real, low severity)
RLS lets **any league member** INSERT a season directly via the API (the
`with_check` only requires league membership, not admin). The UI hides season
creation behind `isAdmin`, so this is not reachable through normal use — but it's
a privilege the policy grants that the product clearly doesn't intend.
**Recommend:** tighten to `get_user_admin_league_ids` like `seasons_update/delete`.

### 5.2 Edit-match button shown to members (cosmetic)
`MatchHistory.jsx` renders the Edit pencil for everyone. For a member on an
approved match the DB rejects the write — so it's safe, but the user sees a button
that errors. **Recommend:** hide Edit for non-admins on approved matches (members
keep it only on their own pending matches).

### 5.3 `league_members_insert` allows self-join (review)
RLS allows an authenticated user to insert themselves into `league_members` for
**any** `league_id` (`with_check = user_id = auth.uid()`), which in principle
bypasses the join-request/approval flow if called directly. The normal flow goes
through `approve_join_request` (admin-gated), so this is an API-level concern, not
a UI one. **Recommend:** confirm whether self-insert should be blocked at RLS
(force all joins through the approval RPC).

> None of these are being changed now — they are logged here for the build phase.

---

## 6. Target proposal — granular "League/Season Permissions" (the #129 ask)

The issue wants WhatsApp-style delegation: the owner grants specific capabilities
to admins/members individually, rather than the all-or-nothing admin bundle.

### Recommended shape
- **Keep the 3 roles** (Owner / Admin / Member) as the base. Don't replace them.
- **Add a per-league permission set** that defines what an **Admin** is allowed to
  do, plus a small set of **member-grantable** toggles. Owner is always full.
- **One screen, two sections** rather than two separate screens: a single
  **"Permissions"** screen reachable from League Management, with a **League**
  block and a **Season** block. (Separating them into two screens duplicates the
  member list and confuses where a setting lives. Seasons inherit league
  permissions unless explicitly overridden — keep overrides minimal in v1.)

### Proposed permission toggles (owner-controlled)
Grant/revoke per role (default column = today's behaviour, so v1 ships
non-breaking):

| Permission | Default | Grantable to |
|---|---|---|
| Invite / approve new players | Admin | Admin, Member |
| Approve matches | Admin | Admin |
| Edit match history | Admin | Admin |
| Delete match history | Admin | Admin |
| Edit player roster (season) | Admin | Admin |
| Edit other players' profiles | Admin | Admin |
| Edit league / season names | Owner→Admin | Admin |
| Edit season dates | Admin | Admin |
| Edit season format/ruleset | Admin (locked after matches) | Admin |
| Manage admins (promote/demote) | Owner only | — (owner-locked) |

### Admins footer (WhatsApp-style)
Bottom of the Permissions screen: a read-only list of **"League admins"** (and, if
season-scoped, **"Season admins"**) showing avatar + name + role badge. Pulls from
`league_members.role='admin'` + owner.

### Data model sketch (for the build phase — NOT built yet)
- New table `league_permissions(league_id, permission_key, allowed_role)` **or** a
  `permissions jsonb` column on `leagues` (simpler for v1). Lean **jsonb on leagues**
  for v1: one row, easy default, no migration churn.
- All capability RPCs (`approve_match`, `update_pending_match`, `update_season`,
  `set_season_roster`, `players_*`) gain a permission-key check instead of the
  hardcoded `is_league_admin_or_owner`. This is the bulk of the build.

---

## 7. Decisions needed from owner before building

1. **Scope:** one combined Permissions screen (recommended) vs separate League /
   Season screens?
2. **Granularity for v1:** ship the full toggle matrix above, or start with the
   3–4 highest-value toggles (invite, approve matches, edit roster, edit profiles)
   and expand later?
3. **Member-grantable permissions:** should any capability be grantable to plain
   *members* (e.g. "let members invite"), or keep all delegation at the Admin tier
   for v1?
4. **Fix the three §5 gaps** as part of this work (recommended — they're cheap and
   the permission rebuild touches the same RPCs)?

Once these are answered, the build is: (a) permissions storage, (b) RPC re-gating,
(c) the Permissions screen + admins footer, (d) UI gate alignment, (e) close the
§5 gaps.
