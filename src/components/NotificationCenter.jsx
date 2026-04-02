import React, { useState, useEffect } from "react";
import { A, BG, CD, CD2, BD, TX, MT, DG, GD, PU } from '../theme';
import { useLeague } from '../LeagueContext';

const TYPE_ICONS = {
  match: "\uD83C\uDFBE",
  ranking: "\uD83D\uDCC8",
  members: "\uD83D\uDC65",
  challenge: "\u2694\uFE0F",
  tournament: "\uD83C\uDFC6",
  system: "\uD83D\uDD14",
};

export function NotificationCenter({ onClose }) {
  const { supabase, user, leagueId } = useLeague();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !leagueId) return;
    loadNotifications();
  }, [user, leagueId]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("league_id", leagueId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) { }
    setLoading(false);
  }

  async function markRead(id) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("league_id", leagueId)
      .eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function clearAll() {
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("league_id", leagueId);
    setNotifications([]);
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ padding: "20px 16px", maxWidth: "600px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{"\uD83D\uDD14"} Notifications</h2>
          {unreadCount > 0 && <p style={{ fontSize: 11, color: A, fontWeight: 600 }}>{unreadCount} unread</p>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: MT, fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>{"\u2715"}</button>
      </div>

      {/* Action Bar */}
      {notifications.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${A}40`, background: "transparent", color: A, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Mark all read</button>
          )}
          <button onClick={clearAll} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${BD}`, background: "transparent", color: MT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Clear all</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: MT }}>Loading...</div>
      )}

      {/* Empty State */}
      {!loading && notifications.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{"\uD83D\uDD15"}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: TX, marginBottom: 6 }}>No notifications</div>
          <div style={{ fontSize: 12, color: MT, lineHeight: 1.5 }}>You'll see match results, challenges, and league updates here.</div>
        </div>
      )}

      {/* Notification List */}
      {notifications.map(n => (
        <div
          key={n.id}
          onClick={() => !n.read && markRead(n.id)}
          style={{
            background: n.read ? "transparent" : `${A}08`,
            border: `1px solid ${n.read ? BD : A + "30"}`,
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 6,
            cursor: n.read ? "default" : "pointer",
            transition: "all 0.15s",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 18, marginTop: 1 }}>{TYPE_ICONS[n.type] || "\uD83D\uDD14"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: n.read ? 400 : 700, color: n.read ? MT : TX }}>{n.title}</span>
                <span style={{ fontSize: 10, color: MT, whiteSpace: "nowrap", marginLeft: 8 }}>{timeAgo(n.created_at)}</span>
              </div>
              <p style={{ fontSize: 12, color: MT, lineHeight: 1.4, margin: 0 }}>{n.body}</p>
            </div>
            {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: A, marginTop: 6, flexShrink: 0 }} />}
          </div>
        </div>
      ))}
    </div>
  );
}
