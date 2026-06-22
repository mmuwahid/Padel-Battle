// Push-notification subsystem extracted from AppContent (Issue #2 god-component
// refactor). Owns Web Push subscription state, the per-preference toggles, and
// the Edge-Function send helpers. Behavior is identical to the inline version;
// callers pass the cross-cutting deps (supabase, user, leagueId, showToast) and
// receive the same values/functions AppContent previously exposed.
import { useState, useEffect } from "react";
import { VAPID_PUBLIC_KEY } from "../vapidPublicKey";

// Convert VAPID public key from base64 URL to Uint8Array (required by pushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotifications({ supabase, user, leagueId, showToast }) {
  // Notifications toggle state
  const [notifNewMatch,setNotifNewMatch]=useState(()=>JSON.parse(localStorage.getItem("notif_new_match")??'true'));
  const [notifRankingChange,setNotifRankingChange]=useState(()=>JSON.parse(localStorage.getItem("notif_ranking")??'true'));
  const [notifNewMembers,setNotifNewMembers]=useState(()=>JSON.parse(localStorage.getItem("notif_members")??'true'));
  const [notifChallenges,setNotifChallenges]=useState(()=>JSON.parse(localStorage.getItem("notif_challenges")??'true'));
  const [pushSubscribed,setPushSubscribed]=useState(false);

  // Check if user already has a push subscription on mount
  useEffect(()=>{
    (async()=>{
      if(!("serviceWorker" in navigator)||!("PushManager" in window))return;
      try{
        const reg=await navigator.serviceWorker.ready;
        const sub=await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      }catch(e){/* push check — non-critical */}
    })();
  },[]);

  // Subscribe to Web Push and save subscription to Supabase
  const subscribeToPush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      showToast("Push notifications not supported on this browser","error");
      return false;
    }
    try {
      // Request permission if needed
      if ("Notification" in window && Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { showToast("Notification permission denied","error"); return false; }
      }
      if ("Notification" in window && Notification.permission === "denied") {
        showToast("Notifications blocked. Enable in browser settings.","error");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      // Save to Supabase
      const subJson = sub.toJSON();
      // Bug #6 fix S038: delete this user's OTHER endpoints in this league before upserting
      // (assume single device; prevents stale endpoint accumulation across permission resets)
      await supabase.from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("league_id", leagueId)
        .neq("endpoint", subJson.endpoint);
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        league_id: leagueId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        notif_new_match: notifNewMatch,
        notif_ranking: notifRankingChange,
        notif_members: notifNewMembers,
        notif_challenges: notifChallenges,
      }, { onConflict: "user_id,endpoint" });
      if (error) throw error;
      setPushSubscribed(true);
      return true;
    } catch (_err) {
      showToast("Failed to enable notifications","error");
      return false;
    }
  };

  // Unsubscribe from Web Push and remove from Supabase
  const unsubscribeFromPush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
      }
      setPushSubscribed(false);
    } catch (_err) {
      showToast("Failed to disable notifications","error");
    }
  };

  // Handle notification toggle — syncs localStorage + Supabase preference
  const toggleNotification = async (type, value) => {
    if (type === "match") {
      setNotifNewMatch(value);
      localStorage.setItem("notif_new_match", JSON.stringify(value));
    } else if (type === "ranking") {
      setNotifRankingChange(value);
      localStorage.setItem("notif_ranking", JSON.stringify(value));
    } else if (type === "members") {
      setNotifNewMembers(value);
      localStorage.setItem("notif_members", JSON.stringify(value));
    } else if (type === "challenges") {
      setNotifChallenges(value);
      localStorage.setItem("notif_challenges", JSON.stringify(value));
    }
    // Sync preferences to Supabase if subscribed
    if (pushSubscribed) {
      const prefs = {
        notif_new_match: type === "match" ? value : notifNewMatch,
        notif_ranking: type === "ranking" ? value : notifRankingChange,
        notif_members: type === "members" ? value : notifNewMembers,
        notif_challenges: type === "challenges" ? value : notifChallenges,
      };
      await supabase.from("push_subscriptions").update(prefs).eq("user_id", user.id);
    }
  };

  // Send push notification via Edge Function. target_user_ids = array of user IDs to notify (optional — defaults to all league members)
  const sendPushNotification = async (type, title, body, body_text, target_user_ids, opts) => {
    // Allow legacy 4-arg call: sendPushNotification(type, title, body, target_user_ids)
    // when arg 4 is array, treat it as target_user_ids and arg 3 as body
    if (Array.isArray(body_text)) { target_user_ids = body_text; body_text = undefined; }
    // S075 FT-16: also accept opts object in body_text slot (when caller passes null body_text + opts)
    if (body_text && typeof body_text === "object" && !Array.isArray(body_text) && body_text.skip_in_app !== undefined) { opts = body_text; body_text = undefined; }
    try {
      const payload = { league_id: leagueId, type, title, body, exclude_user_id: user.id };
      if (target_user_ids) payload.target_user_ids = target_user_ids;
      if (opts && opts.skip_in_app) payload.skip_in_app = true;
      const { data, error } = await supabase.functions.invoke("push-notify", { body: payload });
      // Bug #4 fix S038: surface push send results in console for diagnostics (DEV-only since S042)
      if (import.meta.env.DEV) {
        if (error) console.warn("[push-notify] error:", error);
        else if (data) console.log("[push-notify]", type, "→", data);
      }
      return { data, error };
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[push-notify] threw:", err);
      return { error: err };
    }
  };

  // Fix D S038: send a self-targeted test push for diagnostics
  const testPushNotification = async () => {
    if (!pushSubscribed) {
      showToast("Enable push notifications first", "error");
      return;
    }
    try {
      const payload = {
        league_id: leagueId,
        type: "system",
        title: "PadelHub Test Push",
        body: "If you can see this, push notifications are working!",
        target_user_ids: [user.id],
        // intentionally NO exclude_user_id so sender receives their own test
      };
      const { data, error } = await supabase.functions.invoke("push-notify", { body: payload });
      if (error) {
        if (import.meta.env.DEV) console.warn("[test-push] error:", error);
        showToast("Test failed: " + (error.message || "unknown"), "error");
        return;
      }
      if (import.meta.env.DEV) console.log("[test-push] response:", data);
      const sent = data?.sent || 0, total = data?.total || 0;
      if (sent > 0) showToast(`Test sent (${sent}/${total}) — check your home screen`);
      else if (total === 0) showToast("No subscriptions found — re-subscribe?", "error");
      else showToast(`Test failed: 0/${total} delivered`, "error");
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[test-push] threw:", err);
      showToast("Test push threw: " + (err.message || "unknown"), "error");
    }
  };

  return {
    pushSubscribed,
    notifNewMatch, notifRankingChange, notifNewMembers, notifChallenges,
    subscribeToPush, unsubscribeFromPush, toggleNotification,
    sendPushNotification, testPushNotification,
  };
}
