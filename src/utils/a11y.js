// S096 (#137 A1/A3): accessibility helper for interactive non-button elements.
//
// Many list rows / cards in the app are <div onClick={...}> for styling reasons
// (full-bleed pressable rows that <button> can't easily replicate). Those are
// invisible to keyboard + screen-reader users. Spreading {...pressable(handler)}
// onto such a div makes it a focusable, Enter/Space-activatable button role.
//
// Usage: <div className="sbitem" {...pressable(()=>go("rules"))}> … </div>
export function pressable(onClick) {
  return {
    role: "button",
    tabIndex: 0,
    onClick,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(e);
      }
    },
  };
}
