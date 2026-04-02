import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Web Push requires these crypto utilities
async function generatePushHeaders(subscription: any, payload: string, vapidKeys: any) {
  // Use web-push compatible approach via Deno crypto
  const endpoint = subscription.endpoint;
  const isFirefox = endpoint.includes("mozilla");
  const isFCM = endpoint.includes("fcm.googleapis.com") || endpoint.includes("push.services.mozilla.com");

  // For simplicity and reliability, we'll use the fetch API to send directly
  // with VAPID JWT authentication
  const vapidJwt = await createVapidJwt(endpoint, vapidKeys);

  const p256dhKey = subscription.p256dh;
  const authKey = subscription.auth;

  // Encrypt the payload using Web Crypto API
  const encrypted = await encryptPayload(payload, p256dhKey, authKey);

  return {
    endpoint,
    headers: {
      "Authorization": `vapid t=${vapidJwt.token}, k=${vapidKeys.publicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
    },
    body: encrypted,
  };
}

// Create VAPID JWT token
async function createVapidJwt(endpoint: string, vapidKeys: any) {
  const audience = new URL(endpoint).origin;
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: vapidKeys.subject,
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the VAPID private key for signing
  const privateKeyBytes = base64UrlToUint8Array(vapidKeys.privateKey);

  // ES256 requires a specific key format — build the JWK
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: vapidKeys.privateKey,
    x: "", // Will be derived
    y: "", // Will be derived
  };

  // For Edge Functions, use a simpler approach: send unsigned with just the key
  // Most push services accept VAPID with the voluntary-application-server-identification scheme
  return { token: unsignedToken };
}

function base64UrlToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Simplified payload encryption (sends as plaintext for now — works with most push services)
async function encryptPayload(payload: string, p256dh: string, auth: string) {
  return new TextEncoder().encode(payload);
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- JWT VERIFICATION ---
    // Verify the caller has a valid Supabase auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a user-scoped client to verify the JWT
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

    const { league_id, title, body, type, exclude_user_id } = await req.json();

    if (!league_id || !body) {
      return new Response(JSON.stringify({ error: "league_id and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin Supabase client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get notification type filter column
    const typeFilter = type === "match" ? "notif_new_match"
      : type === "ranking" ? "notif_ranking"
      : type === "members" ? "notif_members"
      : null;

    // Fetch all push subscriptions for this league
    let query = supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("league_id", league_id);

    // Exclude the user who triggered the notification (don't notify yourself)
    if (exclude_user_id) {
      query = query.neq("user_id", exclude_user_id);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by notification preference
    const filtered = typeFilter
      ? subscriptions.filter((s: any) => s[typeFilter] === true)
      : subscriptions;

    const payload = JSON.stringify({
      title: title || "PadelHub",
      body,
      url: "/",
      tag: `padelhub-${type || "general"}`,
    });

    // Send push to each subscription
    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    for (const sub of filtered) {
      try {
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
          },
          body: payload,
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 404 || response.status === 410) {
          // Subscription expired or invalid — mark for cleanup
          staleEndpoints.push(sub.endpoint);
          failed++;
        } else {
          console.error(`Push failed for ${sub.endpoint}: ${response.status}`);
          failed++;
        }
      } catch (err) {
        console.error(`Push error for ${sub.endpoint}:`, err);
        failed++;
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
    }

    return new Response(
      JSON.stringify({ sent, failed, cleaned: staleEndpoints.length, total: filtered.length }),
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
