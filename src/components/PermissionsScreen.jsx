import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { useLeague } from "../LeagueContext";

// S092 #129 — League Permissions (v1). Owner-only screen to choose which
// capabilities the Admin role is allowed to use. Defaults are all-on, so until
// the owner turns something off, admins behave exactly as before. The toggles
// are enforced server-side (admin_has_permission + re-gated RPCs/RLS); this
// screen is the control surface + the "who are the admins" roster.
const TOGGLES = [
  { key: "invite_players",  title: "Invite & approve players", desc: "Send invites and approve or reject join requests." },
  { key: "approve_matches", title: "Approve & edit matches",   desc: "Approve, edit, and reject submitted match results." },
  { key: "edit_roster",     title: "Edit season roster",       desc: "Add or remove players from a season." },
  { key: "edit_profiles",   title: "Edit player profiles",     desc: "Edit other players' names, photos, and details." },
  { key: "manage_seasons", title: "Manage seasons",            desc: "Create, edit, activate, and delete seasons." },
];

function Toggle({ on, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 46, height: 28, flexShrink: 0, borderRadius: 999, padding: 3, border: "none",
        background: on ? "var(--accent)" : "#2a2a3a",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 180ms var(--ease-smooth)",
        display: "flex", alignItems: "center",
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: "50%", background: on ? "#04140a" : "#e4e4ef",
        transform: on ? "translateX(18px)" : "translateX(0)",
        transition: "transform 180ms var(--ease-smooth)",
      }} />
    </button>
  );
}

export function PermissionsScreen({ goBack, setSidebarView }) {
  const { supabase, league, leagueId, isOwner, leagueMembers, memberProfiles, adminPermissions, showToast, loadLeagueData } = useLeague();
  const back = goBack || (() => setSidebarView && setSidebarView("leagueManagement"));

  const [perms, setPerms] = useState(adminPermissions);
  const [saving, setSaving] = useState(null); // key currently saving

  // Keep local toggles in sync if the league reloads.
  useEffect(() => { setPerms(adminPermissions); }, [adminPermissions]);

  const setPerm = async (key, value) => {
    if (!isOwner) return;
    const prev = perms;
    setPerms({ ...perms, [key]: value });   // optimistic
    setSaving(key);
    try {
      const { error } = await supabase.rpc("set_league_permissions", { p_league_id: leagueId, p_permissions: { [key]: value } });
      if (error) throw error;
      loadLeagueData(); // background refresh so context perms stay authoritative
    } catch (err) {
      setPerms(prev); // rollback
      showToast(err.message || "Couldn't update permission", "error");
    }
    setSaving(null);
  };

  // Build the admins roster: owner first, then role==='admin' members.
  const ownerId = league?.created_by;
  const admins = (leagueMembers || [])
    .filter((m) => m.user_id === ownerId || m.role === "admin")
    .map((m) => {
      const prof = m.profiles || memberProfiles?.[m.user_id] || {};
      return {
        userId: m.user_id,
        name: prof.display_name || prof.email || "Member",
        avatar: prof.avatar_url,
        isOwner: m.user_id === ownerId,
      };
    })
    .sort((a, b) => (b.isOwner ? 1 : 0) - (a.isOwner ? 1 : 0));

  return (
    <div className="lm-screen">
      <div className="back-btn-row">
        <button className="back-btn" aria-label="Back" onClick={back}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>

      <div className="ad-h">
        <div className="adey">League</div>
        <div className="adh1">Permissions</div>
      </div>

      <div className="lm-body">
        <div className="inote" style={{ marginBottom: 4 }}>
          <Icon name="info" size={14} color="rgba(74,222,128,.85)" />
          <div className="inotet">
            {isOwner
              ? <>Choose what <strong>Admins</strong> can do. As the owner you can always do everything, and only you can change these.</>
              : <>What <strong>Admins</strong> can do in this league. Only the league owner can change these settings.</>}
          </div>
        </div>

        <div>
          <div className="slbl">Admin Permissions</div>
          {TOGGLES.map((t) => (
            <div key={t.key} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 2px",
              borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{t.desc}</div>
              </div>
              <Toggle on={perms[t.key] !== false} disabled={!isOwner || saving === t.key} onChange={(v) => setPerm(t.key, v)} />
            </div>
          ))}
        </div>

        <div className="inote" style={{ background: "transparent", border: "none", padding: "8px 2px" }}>
          <div className="inotet" style={{ color: "var(--muted)" }}>
            These apply across all seasons in this league. Per-season overrides may come later.
          </div>
        </div>

        {/* League admins footer (WhatsApp-style) */}
        <div>
          <div className="slbl">League Admins</div>
          {admins.length === 0 && (
            <div className="sm-empty">No admins yet — promote a member from Player Management.</div>
          )}
          {admins.map((a) => (
            <div key={a.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px" }}>
              <div className="av" style={{ width: 36, height: 36 }}>
                {a.avatar ? <img src={a.avatar} alt="" /> : (a.name[0] || "?").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
              <div className={a.isOwner ? "badgea" : "badgee"}>{a.isOwner ? "OWNER" : "ADMIN"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
