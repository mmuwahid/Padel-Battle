# Session104 — Season Creation Fix + Auth Bypass + iOS 27

**Date:** 2026-09-15
**Type:** Fix/Research
**Phase:** Pre-store-launch

---

## What Was Done

### 1. Restored hosting (app "wouldn't open")

- Diagnosed as **Supabase free-tier auto-pause**, not Vercel. Project status was `INACTIVE` after ~7 days without traffic.
- Restored the project → `ACTIVE_HEALTHY`. The web app itself was serving `200` the whole time; only the data layer was down.
- Vercel's `"live": false` flag and the `403` on `unpause_project` are hobby-plan artefacts, not a suspension — red herring.
- Flagged the recurrence risk before store launch. Two options given (Supabase Pro $25/mo, or a weekly keep-warm cron). **User has not chosen yet.**

### 2. Issue #154 — season creation failing with `PGRST203` (CLOSED)

- Root cause: the database had **two** `create_season` functions with identical parameter *names* but different type ordering.
  - `s081_handedness_and_season_end` (2026-06-18) — `(p_league_id, p_name, p_start_date, p_clone_from, p_location, p_format, p_ruleset, p_end_date)`
  - `s093_manage_seasons_permission` (2026-06-22) — `(p_league_id, p_name, p_start_date, p_end_date, p_location, p_format, p_ruleset, p_clone_from)`
- `s093` used `CREATE OR REPLACE FUNCTION` while reordering parameters. Postgres identifies functions by argument *types*, not names, so it created a **second overload** instead of replacing. The old one was never dropped.
- `SeasonManagement.jsx:96-108` sends all 8 args **by name**; PostgREST binds by name; both overloads expose the same 8 names → no best candidate → `PGRST203`.
- Broken since 2026-06-22. Only surfaced now because no season had been created in the interval. Unrelated to the Supabase pause.
- Fixed by migration `s104_drop_stale_create_season_overload` — dropped the stale S081 overload. No app deploy needed.
- Audited the entire `public` schema: `create_season` was the **only** function with duplicate overloads.

### 3. Issue #155 — CRITICAL auth bypass (FILED + FIXED)

Discovered incidentally while verifying #154.

- `is_platform_admin()` was `SELECT auth.uid() = '<uuid>'::uuid`. For an unauthenticated caller `auth.uid()` is `NULL`, and `NULL = <uuid>` is **`NULL`**, not `false`.
- That `NULL` propagated through the OR-chain in `admin_has_permission()` (`false OR NULL OR false = NULL`).
- Every admin RPC gates with `IF NOT admin_has_permission(...) THEN RAISE`. `NOT NULL` is `NULL`, which is not TRUE, so the `IF` body never ran — **execution fell straight through into the privileged body**.
- These are `SECURITY DEFINER` functions, so RLS gave no protection; the permission gate was the only control.
- **Blast radius (corrected after a grants + guards audit):**
  - All 11 admin RPCs were exploitable by **any authenticated user against any league**, including leagues they had no membership in. Signup is open, so this was trivially reachable. This is the main impact.
  - **6 of them** (`create_season`, `update_season`, `delete_season`, `end_season`, `reactivate_season`, `set_season_roster`) were additionally exploitable **with no account at all** using only the public `anon` key — these lack a `caller IS NULL` guard.
  - The other 5 (`approve_match`, `reject_match`, `update_pending_match`, `approve_join_request`, `reject_join_request`) were saved from anonymous access by a second layer — an explicit `IF caller IS NULL THEN RAISE` or no `anon` EXECUTE grant.
- Fixed by migration `s104_fix_null_permission_bypass` — `COALESCE(..., false)` at the source in `is_platform_admin()` plus a `COALESCE` wrapper on the whole `admin_has_permission()` expression as defence-in-depth. No client change, no deploy.
- Audited every other boolean auth helper. `is_league_admin_or_owner` uses `EXISTS`, which is strict and never returns NULL — safe as written. The remaining boolean functions are `IMMUTABLE` scoring/validation helpers with no auth role. The NULL-bypass class is confined to the two functions already fixed.
- Window: ~2026-06-21 → 2026-09-15 (introduced by `s092`/`s093`). User base is the private beta group, so real-world exploitation is very unlikely, but this was a hard blocker for App Store launch.

### 4. Issue #156 — iOS 27 readiness (FILED, research only)

iOS 27.0 released 2026-09-14. Full audit filed as a tracking issue.

- **Headline: do NOT rush to the iOS 27 SDK for the v1 launch.** The iOS 26 SDK is accepted for uploads until ~April 2027. Adopting Xcode 27 mid-launch would add a launch-blocking migration for zero user benefit.
- **Verified current state:** `@capacitor/core|ios|cli` at **8.4.1** (below the 8.5 that adds UIScene support); no `ios/App/App/SceneDelegate.swift`; no `UIApplicationSceneManifest` in Info.plist; `UILaunchStoryboardName = LaunchScreen` **is** present, which already satisfies the new mandatory launch-screen key.
- **Breaking (native, v1.1):** UIScene lifecycle adoption via Capacitor 8.5+. Four mechanical steps. Knock-on effect that matters — once the scene manifest is active, iOS stops calling `application(_:open:options:)` and `application(_:continue:restorationHandler:)` on `AppDelegate` and routes them to the scene delegate, which is exactly the deep-link path, so it must be coordinated with Universal Links (#6).
- **Breaking (web, affects PWA users today):** WebKit scroll anchoring is now on (test leaderboards, match history, notification list; opt out with `overflow-anchor: none` if needed) and inline layout is now subpixel-precise (visual-regression pass on the hand-tuned Syne/DM Mono typography).
- **Opportunities:** customizable `<select>` (`appearance: base-select`) to theme our native selects without a JS dropdown lib; `ariaNotify` for LIVE match scoring announcements; Liquid Glass v2 / icon refresh folded into the S103 logo-swap task; Service Worker static routing; StoreKit additions (only actionable via RevenueCat).
- **Explicitly ruled out — no iOS 27 action needed:** Face ID / passkeys / WebAuthn (so **#124 is unaffected**, plan it on existing APIs), Web Push / Declarative Web Push, home-screen install behaviour, `navigator.setAppBadge`.

---

## Files Modified

- `tasks/lessons.md` — appended S104 lessons (mistakes table + 3 validated patterns).
- `tasks/todo.md` — session state updated.
- `padelhub/CLAUDE.md` — DB gotchas + last-updated.
- Supabase migrations applied (no repo files): `s104_drop_stale_create_season_overload`, `s104_fix_null_permission_bypass`.
- **No source-code changes. Zero git commits, zero app deploys.** Web stays on SW v245, main `373442f`.

---

## Key Decisions

- **Fix #154 in the database, not the client.** Both overloads were valid SQL; the client call was correct. Dropping the stale one is the minimal, correct fix — renaming client args would have masked the ambiguity.
- **Keep the S093 overload as canonical** — it gates on `admin_has_permission(..., 'manage_seasons')` (Permissions v2) rather than the retired `_assert_league_admin_or_owner` helper.
- **Apply the #155 fix immediately rather than batching it into a release.** It is a database-only change with no deploy, and it was an active critical auth bypass on production.
- **`COALESCE` at both levels, not just the source.** Fixing only `is_platform_admin()` would close today's hole; wrapping the aggregate too means a future NULL-returning sub-expression cannot silently re-open it.
- **Corrected the #155 blast radius publicly rather than leaving the overstatement.** The first write-up claimed all 11 RPCs were anon-exploitable; a grants audit showed 6. Posted a correction comment — an accurate record is worth more than a dramatic one.
- **Defer all iOS 27 native work to v1.1.** Ship v1 on the current toolchain.
- **Bundle the UIScene migration with Universal Links (#6)** when it happens, since UIScene moves the deep-link entry point anyway.

---

## Lessons Learned

### Mistakes

| Mistake | Root Cause | Prevention Rule |
|---|---|---|
| Fired a live `POST rpc/create_season` with the anon key at the real league to prove the bypass — it returned `200`, created a real season, and auto-deactivated `Season 1`. | Treated a mutating endpoint as a read-only probe because I expected it to be rejected. The whole point of the test was that it might not be. | Never send a mutating request to production to test an auth boundary. Use `BEGIN; SET LOCAL role ...; SELECT rpc(...); ROLLBACK;` or pass a non-resolving ID so the call cannot commit even if the gate fails. |
| Reported "all 11 RPCs anon-exploitable" before auditing EXECUTE grants and per-function null-caller guards. | Inferred blast radius from the shared gate alone, ignoring the second layer of defence some functions had. | Blast radius is not derivable from the vulnerable function alone. Enumerate grants and per-callsite guards before stating scope. |
| Conflated "the app won't open" with "hosting suspended" and went looking at Vercel first. | Took the user's diagnosis as the starting hypothesis instead of reproducing the symptom. | Reproduce first. "Won't open" vs "one action errors" are different failures with different layers. |

### Validated Patterns

- **`CREATE OR REPLACE FUNCTION` is not safe when parameter order or types change** — Postgres keys on argument types, so it silently creates an overload. Always `DROP FUNCTION <old exact signature>` first. Especially dangerous with PostgREST, which resolves RPCs by argument *name* and hard-fails with `PGRST203` on ambiguity. Detection query:
  ```sql
  select proname, count(*), string_agg(oid::regprocedure::text, ' || ')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
  group by proname having count(*) > 1;
  ```
- **A permission function must return a strict boolean, never `NULL`.** `NULL = <value>` is `NULL`; `false OR NULL` is `NULL`; `NOT NULL` is `NULL`, which is not TRUE, so `IF NOT check() THEN RAISE` never fires. Always `COALESCE(..., false)`. Prefer `EXISTS(...)`, which is strict by construction.
- **Test auth gates in a rolled-back transaction.** `BEGIN; SET LOCAL role authenticated; SET LOCAL request.jwt.claims = '{"sub":"<uuid>"}'; SELECT rpc(...); ROLLBACK;` proves the gate against real production rows with zero risk of a write landing.
- **Verify a security fix across the full caller matrix, not just the reported case** — anon, authenticated outsider, cross-league owner, real owner, plus a regression check that the legitimate path still succeeds.

---

## Next Actions

1. ~~**Optional #155 hardening**~~ — **items B and C done before session close** (see the late-session addendum below). Only **Item A** (revoke `anon` EXECUTE) is still open, deliberately: it needs a grants audit first, because `REVOKE … FROM anon` is a silent no-op if the original grant went to `PUBLIC`, and revoking from `PUBLIC` without re-granting `authenticated` in the same transaction locks out every admin. With B and C in place, A is now defence-in-depth rather than the fix.
2. ~~**Decide on the Supabase auto-pause fix**~~ — **settled by the user: neither.** Pro ($25/mo) rejected as not worth it yet, and the keep-warm cron rejected on the grounds that "the app will be more active now as we will start playing again" — i.e. real usage is the keep-warm. Risk accepted: if play goes quiet for 7+ days the backend pauses again. Re-open on launch week regardless.
3. **Google Play account verification** — still blocking (carried from S103). Then create the Play app → service-account JSON → RevenueCat Play config → `goog_` key into `src/revenuecat.js`.
4. **ASC subscription-group Localization** (English U.S., display name `PadelHub Pro`) — required before iOS build submission.
5. **Wire `isPro` tier-limit enforcement** (Free 1 league / 1 season / 5 invites; Pro unlimited).
6. **Sandbox device smoke-test** of the iOS purchase flow.
7. **iOS 27 (#156):** after v1 ships, device smoke-test scroll anchoring + subpixel layout on iOS 27 (affects live PWA users today, costs only testing time). UIScene migration is v1.1, bundled with #6.
8. **Correct the clone path in `CLAUDE.md`** — it says `C:/Users/User/dev/Padel-Battle`, but on this PC the repo is at `C:/Users/UNHOEC03/dev/Padel-Battle`.
9. Open issues: **#156** (iOS 27), **#137** (only B5 bundle visualizer left), **#124** (Face ID, native-blocked), **#6** (Universal Links). #155 is now closed.

---

## Addendum — #155 hardening items B + C (2026-09-16)

The user approved items B and C and explicitly declined the keep-warm cron. Both shipped before the session was closed out.

**Item B — explicit null-caller guards.** Migration `s104_null_caller_guards_season_rpcs`. Each of the 6 season RPCs now opens with `DECLARE v_uid uuid := auth.uid();` and `IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;`.

Two details that mattered:

- The guard is placed **before the season lookup**, not after. Put it after and an unauthenticated caller can distinguish "season not found" (`22023`) from "not authenticated" (`42501`) and use the RPC as an existence oracle for season ids.
- Signatures were preserved **byte-for-byte**. This is the exact trap that caused #154 earlier in the same session — Postgres keys functions on argument *types*, so a `CREATE OR REPLACE` that changes the parameter list creates a second overload instead of replacing the first, and PostgREST then fails with `PGRST203`. Post-apply verification confirmed all 6 signatures unchanged and the whole-schema duplicate-overload query empty.

Before applying, I scanned `pg_proc.prosrc` for internal callers of the 6 season RPCs (triggers, cron, other functions) — none. Adding a JWT requirement therefore couldn't break a server-side path.

**Item C — regression test.** `supabase/tests/auth-gate-regression.sql`, committed in PR #157, squash-merged as `a6ea8c5`. Three tiers against all 11 admin RPCs:

1. **anon** (no session, `anon` role) — the exact condition that was exploitable.
2. **authenticated outsider** — a real signed-in user with a random `sub` who belongs to no league. Signup is open, so this is trivially reachable by anyone; it was the main #155 impact.
3. **league owner** — asserts `create_season` still returns a non-NULL id. A permission fix that also blocks the owner is a broken fix, and without this tier the test would pass just as happily against a database where everything is denied.

Result: **22/22 denial checks passed, owner path intact, nothing persisted.**

The safety design is the part worth remembering. Every mutating call sits in a plpgsql sub-block (an implicit savepoint) that an exception unwinds, and the whole file is wrapped in `BEGIN`/`ROLLBACK` — belt and braces, so the test cannot commit even if the client commits the outer transaction. Tier 3 exploits this deliberately: on success it raises a custom `TEST0` sentinel purely to throw away the created season *and* the deactivation of the previously-active season that `create_season` performs as a side effect. Two custom SQLSTATEs (`TEST0` = unwind, `TEST1` = regression) keep the expected-denial handlers from ever swallowing a real failure, since the RPCs themselves raise `42501`/`P0001`/`22023`.

This belt-and-braces stance is a direct consequence of the mistake logged above: the original proof of the bypass was a live anon call that created a real season in production and deactivated the running one.

**Item A stays deferred.** See Next Action 1.

---

## Commits & Deploy

- **Commits:** `a6ea8c5` — `[Session104] test: add admin RPC auth-gate regression test for #155` (PR #157, squash-merged). Test file only; **no app source changed**, so SW stays v245 and the deploy is a no-op rebuild.
- **Deploy:** none required. Every functional change this session was a database catalog change applied via Supabase migration.
- **Migrations (3):** `s104_drop_stale_create_season_overload`, `s104_fix_null_permission_bypass`, `s104_null_caller_guards_season_rpcs`.
- **Live app state unchanged:** SW v245.
- **Issues:** #154 closed; #156 opened; **#155 opened, fixed, hardened, and closed** within the session.

---

_Session logged: 2026-09-15 (addendum 2026-09-16) | Logged by: Claude | Session104_
