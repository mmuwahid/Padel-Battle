import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== Base64URL Utilities =====

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// ===== VAPID JWT Signing (ES256 via Web Crypto) =====

async function signVapidJwt(
  endpoint: string,
  privateKeyB64: string,
  publicKeyB64: string,
  subject: string
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  const header = b64urlEncode(new TextEncoder().encode(
    JSON.stringify({ alg: "ES256", typ: "JWT" })
  ));
  const payload = b64urlEncode(new TextEncoder().encode(
    JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })
  ));
  const unsigned = `${header}.${payload}`;

  // Build JWK from raw VAPID keys
  // Public key = 65 bytes: 0x04 || x(32) || y(32)
  const pubBytes = b64urlDecode(publicKeyB64);
  const x = b64urlEncode(pubBytes.slice(1, 33));
  const y = b64urlEncode(pubBytes.slice(33, 65));

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: privateKeyB64, x, y },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    new TextEncoder().encode(unsigned)
  );

  return `${unsigned}.${b64urlEncode(sig)}`;
}

// ===== RFC 8291 Payload Encryption (aes128gcm) =====

async function encryptPushPayload(
  plaintext: Uint8Array,
  subscriberPubKeyB64: string,  // p256dh from PushSubscription
  subscriberAuthB64: string     // auth from PushSubscription
): Promise<Uint8Array> {
  const uaPublic = b64urlDecode(subscriberPubKeyB64); // 65 bytes
  const authSecret = b64urlDecode(subscriberAuthB64);  // 16 bytes

  // 1. Ephemeral ECDH key pair
  const localKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // 2. Import subscriber public key for ECDH
  const uaKey = await crypto.subtle.importKey(
    "raw", uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false, []
  );

  // 3. ECDH shared secret (32 bytes)
  const ecdhSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: uaKey },
    localKP.privateKey,
    256
  );

  // 4. Export ephemeral public key (65 bytes, uncompressed)
  const asPublicRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKP.publicKey)
  );

  // 5. key_info = "WebPush: info\0" || ua_public(65) || as_public(65)
  const infoTag = new TextEncoder().encode("WebPush: info\0");
  const keyInfo = new Uint8Array(infoTag.length + 65 + 65);
  keyInfo.set(infoTag);
  keyInfo.set(uaPublic, infoTag.length);
  keyInfo.set(asPublicRaw, infoTag.length + 65);

  // 6. IKM = HKDF(salt=authSecret, ikm=ecdhSecret, info=keyInfo, L=32)
  const ecdhKey = await crypto.subtle.importKey(
    "raw", ecdhSecret, "HKDF", false, ["deriveBits"]
  );
  const ikm = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: keyInfo },
    ecdhKey, 256
  );

  // 7. Random 16-byte salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 8. Derive CEK (16 bytes) and nonce (12 bytes)
  const ikmKey = await crypto.subtle.importKey(
    "raw", ikm, "HKDF", false, ["deriveBits"]
  );
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const cek = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    ikmKey, 128
  );
  const nonce = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    ikmKey, 96
  );

  // 9. Pad plaintext: content || 0x02 (single-record delimiter)
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 2;

  // 10. AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey(
    "raw", cek, { name: "AES-GCM" }, false, ["encrypt"]
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(nonce) },
      aesKey, padded
    )
  );

  // 11. Build aes128gcm binary body
  // Header: salt(16) || rs(4, uint32 BE) || idlen(1) || keyid(65)
  const headerLen = 16 + 4 + 1 + 65; // 86 bytes
  const body = new Uint8Array(headerLen + ciphertext.length);
  body.set(salt, 0);
  new DataView(body.buffer).setUint32(16, 4096, false); // record size
  body[20] = 65; // idlen = uncompressed P-256 key length
  body.set(asPublicRaw, 21);
  body.set(ciphertext, headerLen);

  return body;
}

// ===== Main Handler =====

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
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

    const { league_id, title, body, type, exclude_user_id } = await req.json();

    if (!league_id || !body) {
      return new Response(JSON.stringify({ error: "league_id and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notification type filter
    const typeFilter = type === "match" ? "notif_new_match"
      : type === "ranking" ? "notif_ranking"
      : type === "members" ? "notif_members"
      : type === "challenge" ? "notif_challenges"
      : null;

    // Fetch push subscriptions via SECURITY DEFINER RPC (bypasses RLS)
    const { data: subscriptions, error: fetchError } = await supabaseUser
      .rpc("get_league_push_subs", { p_league_id: league_id });
    if (fetchError) throw fetchError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by exclude_user_id and notification preference
    let filtered = exclude_user_id
      ? subscriptions.filter((s: any) => s.user_id !== exclude_user_id)
      : subscriptions;
    filtered = typeFilter
      ? filtered.filter((s: any) => s[typeFilter] === true)
      : filtered;

    // VAPID keys from Supabase secrets
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:m.muwahid@gmail.com";

    const payloadJson = JSON.stringify({
      title: title || "PadelHub",
      body,
      url: "/",
      tag: `padelhub-${type || "general"}`,
    });
    const payloadBytes = new TextEncoder().encode(payloadJson);

    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    for (const sub of filtered) {
      try {
        // Sign VAPID JWT for this endpoint
        const jwt = await signVapidJwt(
          sub.endpoint, vapidPrivateKey, vapidPublicKey, vapidSubject
        );

        // Encrypt payload per RFC 8291
        const encrypted = await encryptPushPayload(
          payloadBytes, sub.p256dh, sub.auth
        );

        // Send Web Push request
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            "TTL": "86400",
          },
          body: encrypted,
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 404 || response.status === 410) {
          staleEndpoints.push(sub.endpoint);
          failed++;
        } else {
          const errText = await response.text();
          console.error(`Push failed ${sub.endpoint}: ${response.status} ${errText}`);
          failed++;
        }
      } catch (err) {
        console.error(`Push error ${sub.endpoint}:`, err);
        failed++;
      }
    }

    // Clean up expired subscriptions via SECURITY DEFINER RPC
    if (staleEndpoints.length > 0) {
      await supabaseUser
        .rpc("delete_stale_push_endpoints", { p_endpoints: JSON.stringify(staleEndpoints) });
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
