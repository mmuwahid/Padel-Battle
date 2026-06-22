import { A } from "../theme";

const baseProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function TrophyIcon({ active = false, size = 22 }) {
  const stroke = active ? A : "currentColor";
  const sw = active ? 2.2 : 1.8;
  return (
    <svg {...baseProps} width={size} height={size} stroke={stroke} strokeWidth={sw}>
      <path d="M7 3h10v5a5 5 0 01-10 0V3z" />
      <line x1="6" y1="3" x2="18" y2="3" />
      <path d="M7 4.5C5 4.5 3.5 6 3.5 7.5S5 10.5 7 10.5" />
      <path d="M17 4.5c2 0 3.5 1.5 3.5 3s-1.5 3-3.5 3" />
      <line x1="12" y1="13" x2="12" y2="17" />
      <line x1="9.5" y1="17" x2="14.5" y2="17" />
      <path d="M8 21h8l-1-3H9z" />
    </svg>
  );
}

function RacketIcon({ active = false, size = 22 }) {
  const stroke = active ? A : "currentColor";
  const sw = active ? 2.2 : 1.8;
  const dot = active ? A : "currentColor";
  return (
    <svg {...baseProps} width={size} height={size} stroke={stroke} strokeWidth={sw}>
      <path d="M11 2c-3.3 0-6 2.7-6 6 0 2.3 1.3 4.3 3.2 5.3l-.7 1.4 1.4.7L9.5 14H11l1 1 1-1h1.5l.6 1.4 1.4-.7-.7-1.4C17.7 12.3 19 10.3 19 8c0-3.3-2.7-6-6-6z" />
      <line x1="11" y1="15" x2="11" y2="20" />
      <line x1="13" y1="15" x2="13" y2="20" />
      <line x1="10" y1="20" x2="14" y2="20" />
      <circle cx="9" cy="7" r="0.7" fill={dot} stroke="none" />
      <circle cx="12" cy="6" r="0.7" fill={dot} stroke="none" />
      <circle cx="15" cy="7" r="0.7" fill={dot} stroke="none" />
      <circle cx="10" cy="9" r="0.7" fill={dot} stroke="none" />
      <circle cx="14" cy="9" r="0.7" fill={dot} stroke="none" />
      <circle cx="12" cy="10" r="0.7" fill={dot} stroke="none" />
    </svg>
  );
}

function PlayersIcon({ active = false, size = 22 }) {
  const stroke = active ? A : "currentColor";
  const sw = active ? 2.2 : 1.8;
  return (
    <svg {...baseProps} width={size} height={size} stroke={stroke} strokeWidth={sw}>
      <circle cx="5" cy="9" r="2" />
      <path d="M2 19c0-2 1.3-3.5 3-3.5" />
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="19" cy="9" r="2" />
      <path d="M22 19c0-2-1.3-3.5-3-3.5" />
    </svg>
  );
}

function CrossedRacketsIcon({ active = false, size = 22 }) {
  const stroke = active ? A : "currentColor";
  const sw = active ? 2.4 : 2.2;
  return (
    <svg {...baseProps} width={size} height={size} stroke={stroke} strokeWidth={sw}>
      <ellipse cx="7.5" cy="7.5" rx="4.2" ry="4.8" transform="rotate(-30 7.5 7.5)" />
      <line x1="10.5" y1="10.5" x2="16" y2="19" />
      <ellipse cx="16.5" cy="7.5" rx="4.2" ry="4.8" transform="rotate(30 16.5 7.5)" />
      <line x1="13.5" y1="10.5" x2="8" y2="19" />
    </svg>
  );
}

export function NavIcon({ name, active = false, size = 22 }) {
  switch (name) {
    case "trophy": return <TrophyIcon active={active} size={size} />;
    case "racket": return <RacketIcon active={active} size={size} />;
    case "players": return <PlayersIcon active={active} size={size} />;
    case "crossed": return <CrossedRacketsIcon active={active} size={size} />;
    default: return null;
  }
}
