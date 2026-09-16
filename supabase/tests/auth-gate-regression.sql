-- ============================================================================
-- PadelHub — admin RPC auth-gate regression test
-- Added S104 (2026-09-15) after issue #155.
--
-- WHAT THIS GUARDS AGAINST
--   #155: is_platform_admin() returned NULL (not false) for an unauthenticated
--   caller, because `auth.uid() = '<uuid>'` is NULL when auth.uid() is NULL.
--   That NULL propagated through admin_has_permission()'s OR-chain, and since
--   `NOT NULL` is NULL (not TRUE), every `IF NOT admin_has_permission(...) THEN
--   RAISE` gate silently failed to fire and execution fell through into the
--   privileged body. All 11 admin RPCs are SECURITY DEFINER, so RLS gave no
--   backstop -- the gate was the only control.
--
-- HOW TO RUN
--   psql "$DATABASE_URL" -f supabase/tests/auth-gate-regression.sql
--   ...or paste into the Supabase SQL editor.
--
--   PASS = the script runs to completion with no error.
--   FAIL = the script aborts with a 'SECURITY REGRESSION' exception naming the
--          RPC that executed when it should have been denied.
--
-- SAFETY
--   Every statement that could write is wrapped in a plpgsql sub-block that is
--   unwound by an exception, so its changes are discarded even if the outer
--   transaction is committed by the client. The whole file is ALSO wrapped in
--   BEGIN/ROLLBACK. This is deliberate belt-and-braces: during S104 a live anon
--   probe against production created a real season and deactivated another one.
--   Never test an auth boundary with a call that can commit.
--
-- CUSTOM SQLSTATES USED HERE
--   TEST0 = "the call succeeded as intended, now unwind so nothing persists"
--   TEST1 = "SECURITY REGRESSION -- a denied call was allowed through"
--   Neither collides with the 42501 / P0001 that the RPCs raise, so the
--   expected-denial handlers below cannot accidentally swallow a real failure.
-- ============================================================================

BEGIN;

DO $regression$
DECLARE
  v_league    uuid;
  v_season    uuid;
  v_owner     uuid;
  v_outsider  uuid := gen_random_uuid();  -- a real-looking JWT sub in no league
  v_fake      uuid := gen_random_uuid();  -- non-resolving object id
  v_new       uuid;
  v_denied    int  := 0;
  v_checked   int  := 0;

  -- Every admin RPC, as a callable statement. Object ids are substituted below.
  -- The 6 season RPCs gained explicit null-caller guards in S104
  -- (s104_null_caller_guards_season_rpcs); the other 5 already had them.
  v_calls text[];
  v_call  text;
BEGIN
  -- ---------------------------------------------------------------- fixtures
  SELECT id, created_by INTO v_league, v_owner
    FROM public.leagues ORDER BY created_at LIMIT 1;
  IF v_league IS NULL THEN
    RAISE EXCEPTION 'No league found -- cannot run auth-gate regression test';
  END IF;

  SELECT id INTO v_season
    FROM public.seasons WHERE league_id = v_league ORDER BY start_date LIMIT 1;
  IF v_season IS NULL THEN
    RAISE EXCEPTION 'No season found in league % -- cannot run test', v_league;
  END IF;

  v_calls := ARRAY[
    -- 6 season RPCs (real ids, so the call reaches the permission gate)
    format('SELECT public.create_season(%L, %L)', v_league, 'REGRESSION TEST SEASON'),
    format('SELECT public.update_season(%L, %L)', v_season, 'REGRESSION TEST RENAME'),
    format('SELECT public.delete_season(%L)', v_season),
    format('SELECT public.end_season(%L)', v_season),
    format('SELECT public.reactivate_season(%L)', v_season),
    format('SELECT public.set_season_roster(%L, %L::uuid[])', v_season, '{}'),
    -- 5 match / join RPCs (fake ids are fine: the null-caller guard fires
    -- before the object lookup, which is the behaviour under test)
    format('SELECT public.approve_match(%L::uuid)', v_fake),
    format('SELECT public.reject_match(%L::uuid)', v_fake),
    format('SELECT public.update_pending_match(%L::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::uuid)', v_fake),
    format('SELECT public.approve_join_request(%L::uuid)', v_fake),
    format('SELECT public.reject_join_request(%L::uuid, NULL::text)', v_fake)
  ];

  -- ============================================================ TIER 1: anon
  -- No session at all, using the public anon role. NOTHING may get through.
  -- This is the exact condition that was exploitable during #155.
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claims', '', true);

  FOREACH v_call IN ARRAY v_calls LOOP
    v_checked := v_checked + 1;
    BEGIN
      EXECUTE v_call;
      RAISE EXCEPTION
        'SECURITY REGRESSION: anon executed [%] without being denied', v_call
        USING ERRCODE = 'TEST1';
    EXCEPTION
      -- 42501 = our gate, or a missing EXECUTE grant. P0001 = bare RAISE in the
      -- match/join RPCs. Either means the caller was correctly stopped.
      WHEN SQLSTATE '42501' OR SQLSTATE 'P0001' THEN
        v_denied := v_denied + 1;
    END;
  END LOOP;

  RESET ROLE;

  -- ============================ TIER 2: authenticated user, no league access
  -- A real signed-in user who is not a member of this league. Signup is open,
  -- so this is trivially reachable by anyone -- it was the main #155 impact.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_outsider)::text, true);

  FOREACH v_call IN ARRAY v_calls LOOP
    v_checked := v_checked + 1;
    BEGIN
      EXECUTE v_call;
      RAISE EXCEPTION
        'SECURITY REGRESSION: outsider executed [%] without being denied', v_call
        USING ERRCODE = 'TEST1';
    EXCEPTION
      WHEN SQLSTATE '42501' OR SQLSTATE 'P0001' THEN
        v_denied := v_denied + 1;
      -- 22023 = 'Season not found' / 'Match not found'. Only acceptable for the
      -- fake-id calls; a real-id season call must never reach that branch.
      WHEN SQLSTATE '22023' THEN
        IF v_call LIKE '%' || v_season::text || '%'
        OR v_call LIKE '%' || v_league::text || '%' THEN
          RAISE EXCEPTION
            'SECURITY REGRESSION: outsider passed the permission gate on [%]', v_call
            USING ERRCODE = 'TEST1';
        END IF;
        v_denied := v_denied + 1;
    END;
  END LOOP;

  RESET ROLE;

  -- ================================ TIER 3: the legitimate path still works
  -- A permission fix that also blocks the owner is a broken fix. This proves
  -- we tightened the gate without over-blocking.
  IF v_owner IS NOT NULL THEN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',
                       json_build_object('sub', v_owner)::text, true);
    BEGIN
      v_new := public.create_season(v_league, 'REGRESSION TEST SEASON');
      IF v_new IS NULL THEN
        RAISE EXCEPTION 'REGRESSION: owner create_season returned NULL'
          USING ERRCODE = 'TEST1';
      END IF;
      -- Success. Unwind so the season (and the deactivation of the previously
      -- active one that create_season performs) is discarded.
      RAISE EXCEPTION 'unwind' USING ERRCODE = 'TEST0';
    EXCEPTION
      WHEN SQLSTATE 'TEST0' THEN
        NULL;  -- expected: owner path works, changes thrown away
    END;
    RESET ROLE;
  END IF;

  IF v_denied <> v_checked THEN
    RAISE EXCEPTION 'REGRESSION: only % of % denial checks passed', v_denied, v_checked
      USING ERRCODE = 'TEST1';
  END IF;

  RAISE NOTICE 'PASS - % denial checks (anon + outsider) + owner path intact', v_denied;
END;
$regression$;

ROLLBACK;
