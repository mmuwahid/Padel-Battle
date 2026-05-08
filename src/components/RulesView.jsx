import React, { useState } from "react";
import Icon from './Icon';
import { RULES, ARGUED } from '../data/rules';

// S066 Phase 12 PR 3: spec-faithful Rules screen.
// Class names match docs/PadelHub_Complete_v2.jsx lines 1907-1972 verbatim:
//   .rtb / .rtbey / .rtbh1 / .rtbsub   — header
//   .rtsrchw / .rtsrchi / .rtsrch       — search bar
//   .rtfbar / .rtfpill (.fg .fo) / .pillct — filter pills (All/Rules/Disputes)
//   .rtbody                              — body wrapper
//   .rcard (.q .open) / .rchd / .rcico / .rctw / .rct / .rcprev / .rcchev / .rcbody (.op .cl) / .rccont
//
// Cards collapse/expand on tap, chevron rotates 90deg, .rcard:active gives
// press-state accent feedback.
function RuleCard({ rule, type }) {
  const [open, setOpen] = useState(false);
  const isArgued = type === "argued";

  const icoName = isArgued ? "help" :
    rule.title.includes("Scoring") ? "trophy" :
    rule.title.includes("Serve") || rule.title.includes("Return") ? "racket" :
    rule.title.includes("Wall") || rule.title.includes("Outside") ? "court-any" :
    rule.title.includes("Net") ? "alert" :
    rule.title.includes("Switch") ? "refresh" :
    "info";

  const previewText = isArgued
    ? rule.a.length > 90 ? rule.a.slice(0, 88) + "…" : rule.a
    : rule.intro || (rule.subRules?.[0]?.content?.slice(0, 88) + "…") || (rule.content?.length > 90 ? rule.content.slice(0, 88) + "…" : rule.content);

  return (
    <div className={`rcard${isArgued?' q':''}${open?' open':''}`} onClick={()=>setOpen(v=>!v)}>
      <div className="rchd">
        <div className="rcico"><Icon name={icoName} size={16} color={isArgued?"var(--gold)":"var(--accent)"}/></div>
        <div className="rctw">
          <div className="rct">{isArgued ? rule.q : rule.title}</div>
          {!open && previewText && <div className="rcprev">{previewText}</div>}
        </div>
        <div className="rcchev"><Icon name="chevron" size={14} color="currentColor"/></div>
      </div>
      <div className={`rcbody ${open?'op':'cl'}`}>
        <div className="rccont">
          {isArgued ? (
            <div className="rcontent">{rule.a}</div>
          ) : (
            <>
              {rule.intro && <div className="rcintro">{rule.intro}</div>}
              {rule.subRules ? (
                rule.subRules.map((sr, j) => (
                  <div key={j} className="rsub">
                    <div className="rsub-h">{sr.title}</div>
                    <div className="rsub-c">{sr.content}</div>
                  </div>
                ))
              ) : (
                <div className="rcontent">{rule.content}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function RulesView({ setSidebarView }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'g' (rules) | 'o' (disputes)

  const matchesQuery = (text, query) => {
    if (!query) return true;
    return (text || "").toLowerCase().includes(query.toLowerCase());
  };

  const filteredRules = RULES.filter(r => matchesQuery(r.title, q) || matchesQuery(r.intro, q) || matchesQuery(r.content, q) || (r.subRules || []).some(sr => matchesQuery(sr.title, q) || matchesQuery(sr.content, q)));
  const filteredArgued = ARGUED.filter(r => matchesQuery(r.q, q) || matchesQuery(r.a, q));

  const showRules = filter === "all" || filter === "g";
  const showArgued = filter === "all" || filter === "o";

  return (
    <div>
      <div style={{padding:"16px 18px 0"}}>
        <button onClick={()=>setSidebarView(null)} className="back-btn">
          <Icon name="back" size={14}/> Back
        </button>
      </div>

      {/* Header (.rtb) */}
      <div className="rtb">
        <div className="rtbey">Official FIP</div>
        <div className="rtbh1">Padel Rules</div>
        <div className="rtbsub">{RULES.length + ARGUED.length} rules · tap any card to expand</div>
      </div>

      {/* Search bar */}
      <div className="rtsrchw">
        <div className="rtsrchi"><Icon name="search" size={15}/></div>
        <input className="rtsrch" placeholder="Search rules…" value={q} onChange={e=>setQ(e.target.value)}/>
      </div>

      {/* Filter pills (All / Rules / Disputes) — IDs match spec ('g'=rules, 'o'=disputes) */}
      <div className="rtfbar">
        {[
          { id:"all", l:"All",      count: RULES.length + ARGUED.length, cls:"" },
          { id:"g",   l:"Rules",    count: RULES.length,                 cls:"fg" },
          { id:"o",   l:"Disputes", count: ARGUED.length,                cls:"fo" },
        ].map(f=>(
          <button key={f.id} className={`rtfpill${filter===f.id?' '+(f.cls||'fg'):''}`} onClick={()=>setFilter(f.id)}>
            {f.l}<span className="pillct">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="rtbody">
        {((!showRules || filteredRules.length===0) && (!showArgued || filteredArgued.length===0)) && (
          <div style={{padding:"40px 12px",textAlign:"center",color:"#9090a4",fontFamily:"var(--mono)",fontSize:11}}>
            {q ? `No rules found for "${q}"` : "No rules in this filter."}
          </div>
        )}

        {showRules && filteredRules.length > 0 && filteredRules.map((r, i) => (
          <RuleCard key={`r${i}`} rule={r} type="rule"/>
        ))}

        {showArgued && filteredArgued.length > 0 && (
          <>
            {filter === "all" && (
              <div className="rtb" style={{padding:"24px 0 4px"}}>
                <div className="rtbey gold">Disputes</div>
                <div className="rtbh1">Most Argued Calls</div>
                <div className="rtbsub">Settle it once and for all.</div>
              </div>
            )}
            {filteredArgued.map((r, i) => (
              <RuleCard key={`a${i}`} rule={r} type="argued"/>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
