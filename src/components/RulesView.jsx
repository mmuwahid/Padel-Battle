import React, { useState, useMemo } from "react";
import Icon from "./Icon";
import { SECTIONS } from "../data/rules";
import { pressable } from "../utils/a11y";

// S067 Phase 12 PR 3: Rules screen restructured per user iPhone-mockup.
// Each rule is its own collapsible card under a section header. Sections:
//   - "Scoring & Ranked Matches" (green accent) — Match Completion / Deuce
//      Rule / Tie-Break (6-6) / The Serve / Walls & Fences / etc.
//   - "Most Argued Calls" (gold accent) — Q&A cards
// New classes (additive on top of S066 Rules port):
//   .rsec / .rsec-h / .rsec-ico / .rsec-tw / .rsec-tit / .rsec-sub
//   .rtags / .rtag (.g .r .go)  — colored chip tags inside expanded cards
function RuleCard({ rule, sectionAccent }) {
  const [open, setOpen] = useState(false);
  const isArgued = !!rule.isArgued || sectionAccent === "argued";
  return (
    <div className={`rcard${isArgued ? " q" : ""}${open ? " open" : ""}`} aria-expanded={open} {...pressable(() => setOpen(v => !v))}>
      <div className="rchd">
        <div className="rcico">
          <Icon name={rule.icon || (isArgued ? "help" : "info")} size={16} color={isArgued ? "var(--gold)" : "var(--accent)"} />
        </div>
        <div className="rctw">
          <div className="rct">{rule.title}</div>
          {!open && rule.preview && <div className="rcprev">{rule.preview}</div>}
        </div>
        <div className="rcchev">
          <Icon name="chevron" size={14} color="currentColor" />
        </div>
      </div>
      <div className={`rcbody ${open ? "op" : "cl"}`}>
        <div className="rccont">
          <div className="rcontent">{rule.content}</div>
          {rule.tags && rule.tags.length > 0 && (
            <div className="rtags">
              {rule.tags.map((t, i) => (
                <span key={i} className={`rtag ${t.c || "g"}`}>{t.l}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RulesView({ setSidebarView, goBack }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "rules" | "argued"

  const sQ = search.trim().toLowerCase();

  // Filter sections + their rules. A rule passes if its title, preview, or
  // content includes the search query (case-insensitive contains, NOT
  // startsWith — different domain than the cross-app player-search rule).
  const filteredSections = useMemo(() => {
    return SECTIONS.map(sec => {
      if (filter === "rules" && sec.accent !== "rules") return null;
      if (filter === "argued" && sec.accent !== "argued") return null;
      const matched = sec.rules.filter(r => {
        if (!sQ) return true;
        const hay = `${r.title} ${r.preview || ""} ${r.content || ""}`.toLowerCase();
        return hay.includes(sQ);
      });
      return matched.length > 0 ? { ...sec, rules: matched } : null;
    }).filter(Boolean);
  }, [filter, sQ]);

  const counts = useMemo(() => {
    const all = SECTIONS.reduce((n, s) => n + s.rules.length, 0);
    const rulesC = SECTIONS.filter(s => s.accent === "rules").reduce((n, s) => n + s.rules.length, 0);
    const arguedC = SECTIONS.filter(s => s.accent === "argued").reduce((n, s) => n + s.rules.length, 0);
    return { all, rules: rulesC, argued: arguedC };
  }, []);

  const totalShown = filteredSections.reduce((n, s) => n + s.rules.length, 0);

  return (
    <div className="rules-screen rtb">
      {setSidebarView && (
        <div className="back-btn-row">
          <button className="back-btn" aria-label="Back" onClick={() => goBack ? goBack() : setSidebarView(null)}>
            <Icon name="chevron-left" size={18} color="currentColor" />
          </button>
        </div>
      )}
      <div className="rtbey">Reference</div>
      <div className="rtbh1">Rules</div>

      <div className="rtsrchw">
        <div className="rtsrchi"><Icon name="search" size={16} color="var(--muted)" /></div>
        <input
          className="rtsrch"
          placeholder="Search rules…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="rtfbar">
        <button className={`rtfpill${filter === "all" ? " fg" : ""}`} onClick={() => setFilter("all")}>
          All <span className="pillct">{counts.all}</span>
        </button>
        <button className={`rtfpill${filter === "rules" ? " fg" : ""}`} onClick={() => setFilter("rules")}>
          Rules <span className="pillct">{counts.rules}</span>
        </button>
        <button className={`rtfpill${filter === "argued" ? " fo" : ""}`} onClick={() => setFilter("argued")}>
          Disputes <span className="pillct">{counts.argued}</span>
        </button>
      </div>

      <div className="rtbody">
        {totalShown === 0 && (
          <div className="rules-empty">No rules match "{search}".</div>
        )}
        {filteredSections.map(sec => (
          <div key={sec.id} className={`rsec rsec-${sec.accent}`}>
            <div className="rsec-h">
              <div className="rsec-ico"><Icon name={sec.icon} size={18} color={sec.accent === "argued" ? "var(--gold)" : "var(--accent)"} /></div>
              <div className="rsec-tw">
                <div className="rsec-tit">{sec.title}</div>
                <div className="rsec-sub">{sec.subtitle}</div>
              </div>
            </div>
            <div className="rsec-body">
              {sec.rules.map(r => (
                <RuleCard key={r.id} rule={r} sectionAccent={sec.accent} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
