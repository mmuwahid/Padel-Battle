# Issue #11 — Country Presets (User-supplied 2026-05-06)

> Preset values to backfill into `players.country` when the country column is added in Issue #11. Source: user message during S046 mockup review.

## Scope
When the `players.country` migration ships (Issue #11), the migration must `UPDATE` the existing player rows with these values BEFORE the country column is exposed in the UI. ISO 3166-1 alpha-3 codes are the recommended storage format (matches Premier Padel `ARE`/`ESP`/`ARG` 3-letter display).

## Padel Stars League (12 players)

| # | Player name | Country (user) | ISO-3 | Flag |
|---|---|---|---|---|
| 1 | Moody | Palestine | PSE | 🇵🇸 |
| 2 | Husain | Iraq | IRQ | 🇮🇶 |
| 3 | Ahmad Abdallah | Palestine | PSE | 🇵🇸 |
| 4 | Luke | Great Britain | GBR | 🇬🇧 |
| 5 | Mazhar | Lebanon | LBN | 🇱🇧 |
| 6 | Abood | Lebanon | LBN | 🇱🇧 |
| 7 | Hani Taha | Palestine | PSE | 🇵🇸 |
| 8 | Jawad | Palestine | PSE | 🇵🇸 |
| 9 | Basel | Palestine | PSE | 🇵🇸 |
| 10 | Hamza | Iraq | IRQ | 🇮🇶 |
| 11 | Mak | Kuwait | KWT | 🇰🇼 |
| 12 | Marwan | Lebanon | LBN | 🇱🇧 |

## Other league (separate from above)

| # | Player name | Country (user) | ISO-3 | Flag |
|---|---|---|---|---|
| 1 | Ryan | Germany | DEU | 🇩🇪 |

## Implementation notes for #11
- Match by `players.name` ILIKE — names supplied are first names / informal, may not match DB casing. Confirm exact `name` and/or `nickname` against current DB rows before generating the UPDATE statements.
- Resolve `Mak` carefully — short nickname; verify which row it maps to before backfill.
- Country-edit UI (player profile + admin dashboard) needs a searchable dropdown sourced from a known country table (we'll need to ship a small country list — recommend `iso-3166-countries-languages` or hand-curate a focused MENA + EU + Americas list given the user base).
- Storage column: `text` with CHECK constraint allowing only ISO-3 codes (we can validate against the dropdown choices server-side too).
- Add `playing_position` enum/text alongside (`'left' | 'right'`) — deferred until user provides preset values for that field.

## Open items (not yet supplied)
- Playing position (left/right) per player — user has not yet provided
- Country for any other leagues' players in the DB
