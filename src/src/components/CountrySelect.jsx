import React, { useState, useMemo, useRef, useEffect } from "react";
import { A, CD, CD2, BD, TX, MT } from "../theme";
import { flagEmoji } from "../utils/helpers";

// S050: Searchable country combobox.
// Replaces the native <select> used previously in EditPlayerModal + EditMyProfile.
// Sorted ALPHABETICALLY BY NAME (not ISO-3) so "Germany" appears under G, not
// under D for DEU.
//
// Coverage: all UN member states + Palestine, Taiwan, Vatican (~194 entries).
// **Israel intentionally excluded per project decision.**
//
// Must stay in sync with ISO3_TO_ISO2 in helpers.js (flag emoji rendering).
export const COUNTRIES = [
  { iso3: "AFG", name: "Afghanistan" },
  { iso3: "ALB", name: "Albania" },
  { iso3: "DZA", name: "Algeria" },
  { iso3: "AND", name: "Andorra" },
  { iso3: "AGO", name: "Angola" },
  { iso3: "ATG", name: "Antigua and Barbuda" },
  { iso3: "ARG", name: "Argentina" },
  { iso3: "ARM", name: "Armenia" },
  { iso3: "AUS", name: "Australia" },
  { iso3: "AUT", name: "Austria" },
  { iso3: "AZE", name: "Azerbaijan" },
  { iso3: "BHS", name: "Bahamas" },
  { iso3: "BHR", name: "Bahrain" },
  { iso3: "BGD", name: "Bangladesh" },
  { iso3: "BRB", name: "Barbados" },
  { iso3: "BLR", name: "Belarus" },
  { iso3: "BEL", name: "Belgium" },
  { iso3: "BLZ", name: "Belize" },
  { iso3: "BEN", name: "Benin" },
  { iso3: "BTN", name: "Bhutan" },
  { iso3: "BOL", name: "Bolivia" },
  { iso3: "BIH", name: "Bosnia and Herzegovina" },
  { iso3: "BWA", name: "Botswana" },
  { iso3: "BRA", name: "Brazil" },
  { iso3: "BRN", name: "Brunei" },
  { iso3: "BGR", name: "Bulgaria" },
  { iso3: "BFA", name: "Burkina Faso" },
  { iso3: "BDI", name: "Burundi" },
  { iso3: "CPV", name: "Cabo Verde" },
  { iso3: "KHM", name: "Cambodia" },
  { iso3: "CMR", name: "Cameroon" },
  { iso3: "CAN", name: "Canada" },
  { iso3: "CAF", name: "Central African Republic" },
  { iso3: "TCD", name: "Chad" },
  { iso3: "CHL", name: "Chile" },
  { iso3: "CHN", name: "China" },
  { iso3: "COL", name: "Colombia" },
  { iso3: "COM", name: "Comoros" },
  { iso3: "COG", name: "Congo (Brazzaville)" },
  { iso3: "COD", name: "Congo (Kinshasa)" },
  { iso3: "CRI", name: "Costa Rica" },
  { iso3: "CIV", name: "Côte d'Ivoire" },
  { iso3: "HRV", name: "Croatia" },
  { iso3: "CUB", name: "Cuba" },
  { iso3: "CYP", name: "Cyprus" },
  { iso3: "CZE", name: "Czech Republic" },
  { iso3: "DNK", name: "Denmark" },
  { iso3: "DJI", name: "Djibouti" },
  { iso3: "DMA", name: "Dominica" },
  { iso3: "DOM", name: "Dominican Republic" },
  { iso3: "ECU", name: "Ecuador" },
  { iso3: "EGY", name: "Egypt" },
  { iso3: "SLV", name: "El Salvador" },
  { iso3: "GNQ", name: "Equatorial Guinea" },
  { iso3: "ERI", name: "Eritrea" },
  { iso3: "EST", name: "Estonia" },
  { iso3: "SWZ", name: "Eswatini" },
  { iso3: "ETH", name: "Ethiopia" },
  { iso3: "FJI", name: "Fiji" },
  { iso3: "FIN", name: "Finland" },
  { iso3: "FRA", name: "France" },
  { iso3: "GAB", name: "Gabon" },
  { iso3: "GMB", name: "Gambia" },
  { iso3: "GEO", name: "Georgia" },
  { iso3: "DEU", name: "Germany" },
  { iso3: "GHA", name: "Ghana" },
  { iso3: "GBR", name: "Great Britain" },
  { iso3: "GRC", name: "Greece" },
  { iso3: "GRD", name: "Grenada" },
  { iso3: "GTM", name: "Guatemala" },
  { iso3: "GIN", name: "Guinea" },
  { iso3: "GNB", name: "Guinea-Bissau" },
  { iso3: "GUY", name: "Guyana" },
  { iso3: "HTI", name: "Haiti" },
  { iso3: "HND", name: "Honduras" },
  { iso3: "HUN", name: "Hungary" },
  { iso3: "ISL", name: "Iceland" },
  { iso3: "IND", name: "India" },
  { iso3: "IDN", name: "Indonesia" },
  { iso3: "IRN", name: "Iran" },
  { iso3: "IRQ", name: "Iraq" },
  { iso3: "IRL", name: "Ireland" },
  { iso3: "ITA", name: "Italy" },
  { iso3: "JAM", name: "Jamaica" },
  { iso3: "JPN", name: "Japan" },
  { iso3: "JOR", name: "Jordan" },
  { iso3: "KAZ", name: "Kazakhstan" },
  { iso3: "KEN", name: "Kenya" },
  { iso3: "KIR", name: "Kiribati" },
  { iso3: "KWT", name: "Kuwait" },
  { iso3: "KGZ", name: "Kyrgyzstan" },
  { iso3: "LAO", name: "Laos" },
  { iso3: "LVA", name: "Latvia" },
  { iso3: "LBN", name: "Lebanon" },
  { iso3: "LSO", name: "Lesotho" },
  { iso3: "LBR", name: "Liberia" },
  { iso3: "LBY", name: "Libya" },
  { iso3: "LIE", name: "Liechtenstein" },
  { iso3: "LTU", name: "Lithuania" },
  { iso3: "LUX", name: "Luxembourg" },
  { iso3: "MDG", name: "Madagascar" },
  { iso3: "MWI", name: "Malawi" },
  { iso3: "MYS", name: "Malaysia" },
  { iso3: "MDV", name: "Maldives" },
  { iso3: "MLI", name: "Mali" },
  { iso3: "MLT", name: "Malta" },
  { iso3: "MHL", name: "Marshall Islands" },
  { iso3: "MRT", name: "Mauritania" },
  { iso3: "MUS", name: "Mauritius" },
  { iso3: "MEX", name: "Mexico" },
  { iso3: "FSM", name: "Micronesia" },
  { iso3: "MDA", name: "Moldova" },
  { iso3: "MCO", name: "Monaco" },
  { iso3: "MNG", name: "Mongolia" },
  { iso3: "MNE", name: "Montenegro" },
  { iso3: "MAR", name: "Morocco" },
  { iso3: "MOZ", name: "Mozambique" },
  { iso3: "MMR", name: "Myanmar" },
  { iso3: "NAM", name: "Namibia" },
  { iso3: "NRU", name: "Nauru" },
  { iso3: "NPL", name: "Nepal" },
  { iso3: "NLD", name: "Netherlands" },
  { iso3: "NZL", name: "New Zealand" },
  { iso3: "NIC", name: "Nicaragua" },
  { iso3: "NER", name: "Niger" },
  { iso3: "NGA", name: "Nigeria" },
  { iso3: "PRK", name: "North Korea" },
  { iso3: "MKD", name: "North Macedonia" },
  { iso3: "NOR", name: "Norway" },
  { iso3: "OMN", name: "Oman" },
  { iso3: "PAK", name: "Pakistan" },
  { iso3: "PLW", name: "Palau" },
  { iso3: "PSE", name: "Palestine" },
  { iso3: "PAN", name: "Panama" },
  { iso3: "PNG", name: "Papua New Guinea" },
  { iso3: "PRY", name: "Paraguay" },
  { iso3: "PER", name: "Peru" },
  { iso3: "PHL", name: "Philippines" },
  { iso3: "POL", name: "Poland" },
  { iso3: "PRT", name: "Portugal" },
  { iso3: "QAT", name: "Qatar" },
  { iso3: "ROU", name: "Romania" },
  { iso3: "RUS", name: "Russia" },
  { iso3: "RWA", name: "Rwanda" },
  { iso3: "KNA", name: "Saint Kitts and Nevis" },
  { iso3: "LCA", name: "Saint Lucia" },
  { iso3: "VCT", name: "Saint Vincent and the Grenadines" },
  { iso3: "WSM", name: "Samoa" },
  { iso3: "SMR", name: "San Marino" },
  { iso3: "STP", name: "Sao Tome and Principe" },
  { iso3: "SAU", name: "Saudi Arabia" },
  { iso3: "SEN", name: "Senegal" },
  { iso3: "SRB", name: "Serbia" },
  { iso3: "SYC", name: "Seychelles" },
  { iso3: "SLE", name: "Sierra Leone" },
  { iso3: "SGP", name: "Singapore" },
  { iso3: "SVK", name: "Slovakia" },
  { iso3: "SVN", name: "Slovenia" },
  { iso3: "SLB", name: "Solomon Islands" },
  { iso3: "SOM", name: "Somalia" },
  { iso3: "ZAF", name: "South Africa" },
  { iso3: "KOR", name: "South Korea" },
  { iso3: "SSD", name: "South Sudan" },
  { iso3: "ESP", name: "Spain" },
  { iso3: "LKA", name: "Sri Lanka" },
  { iso3: "SDN", name: "Sudan" },
  { iso3: "SUR", name: "Suriname" },
  { iso3: "SWE", name: "Sweden" },
  { iso3: "CHE", name: "Switzerland" },
  { iso3: "SYR", name: "Syria" },
  { iso3: "TWN", name: "Taiwan" },
  { iso3: "TJK", name: "Tajikistan" },
  { iso3: "TZA", name: "Tanzania" },
  { iso3: "THA", name: "Thailand" },
  { iso3: "TLS", name: "Timor-Leste" },
  { iso3: "TGO", name: "Togo" },
  { iso3: "TON", name: "Tonga" },
  { iso3: "TTO", name: "Trinidad and Tobago" },
  { iso3: "TUN", name: "Tunisia" },
  { iso3: "TUR", name: "Turkey" },
  { iso3: "TKM", name: "Turkmenistan" },
  { iso3: "TUV", name: "Tuvalu" },
  { iso3: "UGA", name: "Uganda" },
  { iso3: "UKR", name: "Ukraine" },
  { iso3: "ARE", name: "United Arab Emirates" },
  { iso3: "USA", name: "United States" },
  { iso3: "URY", name: "Uruguay" },
  { iso3: "UZB", name: "Uzbekistan" },
  { iso3: "VUT", name: "Vanuatu" },
  { iso3: "VAT", name: "Vatican City" },
  { iso3: "VEN", name: "Venezuela" },
  { iso3: "VNM", name: "Vietnam" },
  { iso3: "YEM", name: "Yemen" },
  { iso3: "ZMB", name: "Zambia" },
  { iso3: "ZWE", name: "Zimbabwe" },
];

export function CountrySelect({ value, onChange, placeholder = "Select country..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const selected = value ? COUNTRIES.find(c => c.iso3 === value) : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    // Strict startsWith on displayed name (or ISO-3 code) per user directive:
    // typing "p" matches only countries whose name starts with "p" (Pakistan,
    // Palau, Palestine, Panama, ...), NOT countries containing "p" elsewhere.
    // Same rule applies in every search bar in the app for consistency.
    // Trade-off: typing "korea" no longer matches "South Korea" / "North Korea";
    // user must search for "south" or "north" instead.
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().startsWith(q) ||
      c.iso3.toLowerCase().startsWith(q)
    );
  }, [query]);

  // Auto-focus search input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, [open]);

  const select = (iso3) => {
    onChange(iso3);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", fontFamily: "var(--font)" }}>
      {/* Trigger — styled like the prior select */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: CD2,
          border: `1px solid ${open ? A : BD}`,
          borderRadius: 8,
          color: selected ? TX : MT,
          fontSize: 13,
          fontFamily: "var(--font)",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          outline: "none",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, overflow: "hidden" }}>
          {selected ? (
            <>
              <span className="flag" style={{ fontSize: 15, lineHeight: 1 }}>{flagEmoji(selected.iso3)}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</span>
              <span style={{ color: MT, fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>({selected.iso3})</span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </span>
        <span style={{ color: MT, fontSize: 11, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: CD,
          border: `1px solid ${BD}`,
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          zIndex: 220,
          overflow: "hidden",
        }}>
          {/* Search input */}
          <div style={{ padding: "8px", borderBottom: `1px solid ${BD}`, background: CD2 }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country..."
              style={{
                width: "100%",
                padding: "8px 10px",
                background: CD,
                border: `1px solid ${BD}`,
                borderRadius: 6,
                color: TX,
                fontSize: 13,
                fontFamily: "var(--font)",
                outline: "none",
                boxSizing: "border-box",
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 260, overflowY: "auto", overscrollBehavior: "contain" }}>
            {/* "Not set" / clear option — always visible at the top */}
            <button
              type="button"
              onClick={() => select("")}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: !value ? `${A}15` : "transparent",
                border: "none",
                borderBottom: `1px solid ${BD}`,
                color: !value ? A : MT,
                fontSize: 12,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--font)",
              }}
            >
              — Not set —
            </button>

            {filtered.length === 0 && (
              <div style={{ padding: "16px 12px", color: MT, fontSize: 12, textAlign: "center" }}>
                No matches
              </div>
            )}

            {filtered.map(c => {
              const isSelected = c.iso3 === value;
              return (
                <button
                  key={c.iso3}
                  type="button"
                  onClick={() => select(c.iso3)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: isSelected ? `${A}20` : "transparent",
                    border: "none",
                    color: isSelected ? A : TX,
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--font)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className="flag" style={{ fontSize: 15, lineHeight: 1 }}>{flagEmoji(c.iso3)}</span>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ color: isSelected ? A : MT, fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{c.iso3}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
