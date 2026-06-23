import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== Main Handler =====
// S099: push-notify is now BELL-INSERT ONLY. Web Push delivery (VAPID signing +
// RFC 8291 aes128gcm encryption) was moved to the push-on-notify edge fn, fired
// by the AFTER INSERT trigger on public.notifications — so every bell row pushes
// uniformly regardless of source. The crypto helpers that used to live here were
// removed with that refactor.

// M-3: Simple in-memory rate limiter (per-user, per-minute)
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 30; // max requests per window
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(userId, { count: 1, reset: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  // H-2: Restrict CORS to production domain (+ localhost for dev)
  const origin = req.headers.get("Origin") || "";
  const allowedOrigins = ["https://padel-battle.vercel.app", "http://localhost:5173"];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : "https://padel-battle.vercel.app";
  const corsHeaders = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- JWT VERIFICATION ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // --- END JWT VERIFICATION ---

    // M-3: Rate limit check
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { league_id, title, body, type, exclude_user_id, target_user_ids, skip_in_app } = await req.json();

    if (!league_id || !body) {
      return new Response(JSON.stringify({ error: "league_id and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // C-3: Verify caller is a member of this league
    const { data: members, error: memberErr } = await supabaseUser
      .rpc("get_league_member_ids", { p_league_id: league_id });
    if (memberErr) throw memberErr;
    const memberIds = (members || []).map((m: any) => m.user_id);
    if (!memberIds.includes(user.id)) {
      return new Response(JSON.stringify({ error: "Not a member of this league" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // H-1: Validate target_user_ids against actual league members
    const validTargetIds = target_user_ids && target_user_ids.length > 0
      ? target_user_ids.filter((uid: string) => memberIds.includes(uid))
      : null;

    // Notification type filter
    const typeFilter = type === "match" ? "notif_new_match"
      : type === "ranking" ? "notif_ranking"
      : type === "members" ? "notif_members"
      : type === "challenge" ? "notif_challenges"
      : type === "open_match" ? "notif_challenges"
      : null;

    // Fetch push subscriptions via SECURITY DEFINER RPC (bypasses RLS).
    // S099: push is now sent by the AFTER INSERT trigger on `notifications`
    // (push-on-notify edge fn), so push-notify is bell-insert ONLY. We still
    // read subscriptions to apply each user's type-preference to the bell rows.
    // NO early-return on empty subscriptions anymore — bell rows must insert
    // even when nobody has push enabled (fixes "match never hit the center").
    const { data: subsRaw } = await supabaseUser
      .rpc("get_league_push_subs", { p_league_id: league_id });
    const subscriptions = subsRaw || [];

    // Filter by target users (if provided), exclude sender, and notification preference
    let filtered = validTargetIds
      ? subscriptions.filter((s: any) => validTargetIds.includes(s.user_id))
      : subscriptions;
    filtered = exclude_user_id
      ? filtered.filter((s: any) => s.user_id !== exclude_user_id)
      : filtered;
    filtered = typeFilter
      ? filtered.filter((s: any) => s[typeFilter] === true)
      : filtered;

    // Insert in-app notifications — must respect user's notification preferences
    // (Bug #1 fix S038: previously ignored prefs and spammed bell for all members)
    // Use 'filtered' which has type-preference applied; fall back to membership for users without subscriptions.
    // S075: skip_in_app=true bypasses bell-row insertion when an RPC has already inserted them (avoids dupes for FT-16 open_match flows).
    if (!skip_in_app) try {
      // Subscribed users who have this notification type enabled
      const subscribedAllowedIds = new Set(filtered.map((s: any) => s.user_id));
      // Users who have NOT subscribed to push at all → still get in-app bell unless they're the sender
      // (we can't read their pref without a subscription row; default to allow)
      const subscribedAnyIds = new Set(subscriptions.map((s: any) => s.user_id));
      // S099 decision #3: for match results, the logger SHOULD see their own
      // match in the bell center (they're normally excluded as the sender).
      // All other types keep excluding the sender from their own bell row.
      const candidatePool = (validTargetIds || memberIds)
        .filter((uid: string) => type === "match" ? true : uid !== exclude_user_id);
      const notifUserIds = candidatePool.filter((uid: string) =>
        // Allow if (subscribed AND pref-enabled) OR (not subscribed at all → no pref recorded yet)
        subscribedAllowedIds.has(uid) || !subscribedAnyIds.has(uid)
      );
      if (notifUserIds.length > 0) {
        const notifRows = notifUserIds.map((uid: string) => ({
          league_id,
          user_id: uid,
          type: type || "general",
          title: title || "PadelHub",
          body,
        }));
        await supabaseUser
          .rpc("insert_notifications", { p_rows: JSON.stringify(notifRows) });
      }
    } catch (notifErr) {
      console.error("In-app notification insert error:", notifErr);
    }

    // S099: Web Push delivery is handled centrally by the AFTER INSERT trigger
    // on public.notifications (push-on-notify edge fn). push-notify no longer
    // sends push itself — this avoids double-push and makes EVERY bell row
    // (including those created by RPCs, cron, and triggers) push uniformly.
    return new Response(
      JSON.stringify({ ok: true, bell_inserted: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Push notify error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
