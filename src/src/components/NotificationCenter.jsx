import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { useLeague } from "../LeagueContext";

// S067: emoji-free Notification Center.
// All emoji icon characters replaced with <Icon> SVGs from Icon.jsx.
// Type icons map to the Icon name + a color class on the chip background.
const TYPE_META = {
  match:      { icon: "racket",      tone: "green" },
  ranking:    { icon: "trending-up", tone: "green" },
  members:    { icon: "users",       tone: "blue" },
  challenge:  { icon: "swords",      tone: "gold" },
  tournament: { icon: "trophy",      tone: "gold" },
  system:     { icon: "bell",        tone: "muted" },
};

// FT-09 / S044 variants — distinguished by data.kind. Returns { icon, tone, strokeWidth }
// or null if not a kind we want to override.
function ft09Variant(n) {
  const kind = n?.data?.kind;
  if (!kind) return null;
  switch (kind) {
    case "approved":    return { icon: "check",   tone: "green",  strokeWidth: 3 };
    case "edited":      return { icon: "edit",    tone: "blue",   strokeWidth: 2 };
    case "rejected":    return { icon: "close",   tone: "danger", strokeWidth: 3 };
    case "role_change": return { icon: "zap",     tone: "gold",   strokeWidth: 2 };
    default: return null;
  }
}

const TONE_COLOR = {
  green: "var(--accent)",
  gold: "var(--gold)",
  danger: "var(--loss)",
  blue: "#60a5fa",
  muted: "var(--muted)",
};

export function NotificationCenter({ onClose }) {
  const { supabase, user, leagueId, showToast } = useLeague();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !leagueId) return;
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to load notifications", "error");
    }
    setLoading(false);
  }

  async function markRead(id) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;
    await supabase.from("notifications").update({ read: true })
      .eq("user_id", user.id).eq("league_id", leagueId).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function clearAll() {
    await supabase.from("notifications").delete()
      .eq("user_id", user.id).eq("league_id", leagueId);
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
    <div className="nc-screen">
      <div className="nc-h">
        <div className="nc-h-l">
          <div className="nc-h-ico"><Icon name="bell" size={18} color="var(--accent)" /></div>
          <div className="nc-h-tw">
            <div className="nc-h-tit">Notifications</div>
            {unreadCount > 0 && <div className="nc-h-sub">{unreadCount} unread</div>}
          </div>
        </div>
        <button className="nc-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={14} color="currentColor" />
        </button>
      </div>

      {notifications.length > 0 && (
        <div className="nc-actions">
          {unreadCount > 0 && (
            <button className="nc-act acc" onClick={markAllRead}>Mark all read</button>
          )}
          <button className="nc-act" onClick={clearAll}>Clear all</button>
        </div>
      )}

      {loading && <div className="nc-loading">Loading…</div>}

      {!loading && notifications.length === 0 && (
        <div className="nc-empty">
          <div className="nc-empty-ico"><Icon name="bell" size={26} color="currentColor" /></div>
          <div className="nc-empty-tit">No notifications</div>
          <div className="nc-empty-sub">You'll see match results, challenges,<br/>and league updates here.</div>
        </div>
      )}

      <div className="nc-list">
        {notifications.map(n => {
          const variant = ft09Variant(n);
          const meta = variant || TYPE_META[n.type] || { icon: "bell", tone: "muted" };
          const diff = Array.isArray(n?.data?.diff) ? n.data.diff : null;
          return (
            <div
              key={n.id}
              className={`nc-item${n.read ? "" : " unread"}`}
              onClick={() => !n.read && markRead(n.id)}
            >
              <div className="nc-item-row">
                <div className={`nc-ico ${meta.tone}`}>
                  <Icon name={meta.icon} size={14} color={TONE_COLOR[meta.tone] || "var(--muted)"} strokeWidth={meta.strokeWidth} />
                </div>
                <div className="nc-body-w">
                  <div className="nc-line1">
                    <span className="nc-title">{n.title}</span>
                    <span className="nc-time">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="nc-msg">{n.body}</p>
                  {diff && diff.length > 0 && (
                    <div style={{ marginTop: 6, padding: "6px 10px", background: "var(--surface-2)", borderRadius: 6, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
                      {diff.map((d, i) => {
                        const label = ({ team_a: "Team A", team_b: "Team B", sets: "Sets", date: "Date", motm: "MOTM" }[d.field]) || d.field;
                        const renderVal = (v) => {
                          if (Array.isArray(v)) return v.join(", ");
                          if (v && typeof v === "object") return JSON.stringify(v);
                          return String(v);
                        };
                        return (
                          <div key={i}>
                            <span style={{ color: "var(--text)", fontWeight: 500 }}>{label}:</span>{" "}
                            <span style={{ color: "var(--loss)", textDecoration: "line-through", opacity: 0.7 }}>{renderVal(d.old)}</span>
                            <span style={{ color: "var(--muted)", margin: "0 4px" }}>→</span>
                            <span style={{ color: "var(--accent)", fontWeight: 600 }}>{renderVal(d.new)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {!n.read && <div className="nc-unread-dot" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
