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

// ===== VAPID JWT Signing (ES256) =====
async function signVapidJwt(endpoint: string, privateKeyB64: string, publicKeyB64: string, subject: string): Promise<string> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ alg: "ES256", typ: "JWT" })));
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })));
  const unsigned = `${header}.${payload}`;
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
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64urlEncode(sig)}`;
}

// ===== RFC 8291 Payload Encryption (aes128gcm) =====
async function encryptPushPayload(plaintext: Uint8Array, subscriberPubKeyB64: string, subscriberAuthB64: string): Promise<Uint8Array> {
  const uaPublic = b64urlDecode(subscriberPubKeyB64);
  const authSecret = b64urlDecode(subscriberAuthB64);
  const localKP = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, localKP.privateKey, 256);
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKP.publicKey));
  const infoTag = new TextEncoder().encode("WebPush: info\0");
  const keyInfo = new Uint8Array(infoTag.length + 65 + 65);
  keyInfo.set(infoTag);
  keyInfo.set(uaPublic, infoTag.length);
  keyInfo.set(asPublicRaw, infoTag.length + 65);
  const ecdhKey = await crypto.subtle.importKey("raw", ecdhSecret, "HKDF", false, ["deriveBits"]);
  const ikm = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: authSecret, info: keyInfo }, ecdhKey, 256);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const cek = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, ikmKey, 128);
  const nonce = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, ikmKey, 96);
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 2;
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(nonce) }, aesKey, padded));
  const headerLen = 16 + 4 + 1 + 65;
  const body = new Uint8Array(headerLen + ciphertext.length);
  body.set(salt, 0);
  new DataView(body.buffer).setUint32(16, 4096, false);
  body[20] = 65;
  body.set(asPublicRaw, 21);
  body.set(ciphertext, headerLen);
  return body;
}

// ===== Main Handler =====
// Called ONLY by the DB AFTER INSERT trigger on public.notifications (via pg_net).
// Custom auth via x-hook-secret header (validated inside get_push_payload). No user JWT.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  try {
    const hookSecret = req.headers.get("x-hook-secret") || "";
    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(JSON.stringify({ error: "notification_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: payload, error: rpcErr } = await admin.rpc("get_push_payload", {
      p_notification_id: notification_id,
      p_secret: hookSecret,
    });
    if (rpcErr) throw rpcErr;
    if (!payload || payload.error) {
      const status = payload?.error === "unauthorized" ? 401 : 200;
      return new Response(JSON.stringify({ skipped: payload?.error || "no_payload" }), { status, headers: { "Content-Type": "application/json" } });
    }

    const subs: any[] = Array.isArray(payload.subs) ? payload.subs : [];
    if (subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "no subscriptions" }), { headers: { "Content-Type": "application/json" } });
    }

    const type = payload.type;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:m.muwahid@gmail.com";

    const pushUrl = type === "challenge" ? "/#schedule"
      : type === "open_match" ? "/#schedule"
      : type === "match" ? "/#history"
      : "/";
    const payloadBytes = new TextEncoder().encode(JSON.stringify({
      title: payload.title || "PadelHub",
      body: payload.body,
      url: pushUrl,
      tag: `padelhub-${type || "general"}`,
      badge: typeof payload.badge === "number" ? payload.badge : undefined,
    }));

    const staleEndpoints: string[] = [];
    const sendOne = async (sub: any) => {
      const jwt = await signVapidJwt(sub.endpoint, vapidPrivateKey, vapidPublicKey, vapidSubject);
      const encrypted = await encryptPushPayload(payloadBytes, sub.p256dh, sub.auth);
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
      return { sub, status: response.status, response };
    };

    const results = await Promise.allSettled(subs.map((sub) => sendOne(sub)));
    let sent = 0, failed = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        const { sub, status } = r.value;
        if (status === 200 || status === 201) sent++;
        else if (status === 404 || status === 410) { staleEndpoints.push(sub.endpoint); failed++; }
        else { failed++; console.error(`Push failed ${sub.endpoint}: ${status}`); }
      } else { failed++; console.error("Push error:", r.reason); }
    }

    if (staleEndpoints.length > 0) {
      try {
        await admin.rpc("delete_stale_push_endpoints", { p_endpoints: staleEndpoints });
      } catch (e) { console.error("Stale cleanup threw:", e); }
    }

    return new Response(JSON.stringify({ sent, failed, cleaned: staleEndpoints.length, total: subs.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("push-on-notify error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
