# Session Log — 2026-05-11 — Session078 — Issue 92+93 + Polish + Cold-Start Hardening

**Project:** PadelHub
**Phase:** Issue #92 (pairs season stats isolation) — full ship + FT-15 polish + LogMatch open-match polish
**Duration:** ~6h
**Commits:** `fed6449`, `08b6121`, `da07550`, `8f08693` — 4 push-direct commits, SW v162 → v166. GitHub Issue #93 closed; Issue #92 implementation complete (awaiting iPhone smoke-test before close).

---

## What Was Done

### Cold-start protocol hardening (mid-session, after Issue #93 ship)
- Added two new steps to `CLAUDE.md` Cold Start protocol:
  - **Step 4** — `gh issue list --state open --limit 30` to surface issues filed between sessions
  - **Step 5** — sync OneDrive `padelhub/src/` FROM `/tmp/Padel-Battle/` at session start (never the other direction) to prevent stale-mirror reverts
- Rewrote auto-memory `feedback_git_repo_path.md` → "Git repo write path + OneDrive stale-mirror trap"
- Updated `MEMORY.md` index entry
- Two new lessons captured (OneDrive stale-mirror trap + cold-start gh check rule)
- Trigger: today's S078 r1 ship of Issue #93 almost reverted 27 sessions of CSS when a naive `cp OneDrive/index.css → /tmp` produced a `git diff --stat` showing implausible churn (172 deletions / 150 insertions on a tiny visual fix). Caught and reverted in time.

### Issue #93 — Rules screen width + drop expand subtitle (commit `fed6449`, SW v163)
- Root cause: `.rtb` outer wrapper had `padding: 18px 18px 4px`, AND every inner section (`.rtsrchw`, `.rtfbar`, `.rtbody`) self-padded `0 18px`. Doubled to 36px gutters on rule cards while Settings `.stcard` sat at 18px.
- Fix: dropped horizontal padding from `.rtb` outer (now `18px 0 4px`); added `padding: 0 18px` to `.rtbey` / `.rtbh1` / `.rtbsub` since they relied on the parent for horizontal positioning.
- Dropped the "Tap a card to expand details" subtitle JSX line from `RulesView.jsx`.
- User confirmed PASS on iPhone — issue closed via `gh issue close 93`.

### Issue #92 (1/2) — pair-format isolation + Pairs grid + PairStats drill-in (commit `08b6121`, SW v164)
Foundation + Players tab branch + drill-in screen.

- **Mockup-first cadence:** built `padelhub/public/mockup-issue92.html` and iterated v1 → v2 → v3 → v4 with the user before any source code change. Each round took ~5 minutes at zero implementation cost; locked decisions:
  - Pairs format → Players tab hides individual roster entirely, renames to "Pairs"
  - Drill-in scope: hero / eff bar / 6 metrics / last 5 / best+worst opp / **Achievements** / **Pair Match History**
  - Achievements catalogue (6): First Win · 5 In A Row · 10 Together · Comeback (earned) · 10 Wins · Perfect Set (locked teases) — Iron Pair dropped to keep clean 3×2 grid
  - Partners sub-tab repurposed as "Pair Synergy" (4 metrics, sorted by Matches Won)
  - League sub-tab uses same 7-col format as singles ranking (PairsRanking.jsx S076)
  - MOTM stays per-player (individual effort); pair-level MOTM tile = sum of player-MOTMs across pair's matches
  - **Universal season isolation rule:** every season is its own silo, regardless of format. No cross-season aggregation in any view.

- **DB:** verified `update_pair_elo_on_match` trigger already has `IF v_format <> 'pairs' THEN RETURN NEW` gate (S072 wiring intact). No migration needed.

- **App.jsx** — new memos:
  - `pairFormatSeasonIds` — Set of season IDs whose format='pairs'
  - `individualMatches` — approvedMatches filtered to non-pair seasons
  - `pairsMatches` — approvedMatches filtered to pair seasons
  - `ps`, `elo`, `getForm` now consume `individualMatches`. Defense-in-depth on top of per-season filtering.

- **App.jsx stats tab** — branched on `seasons.find(s=>s.id===selectedSeason)?.format`:
  - format='pairs' + `selectedPair` set: render `<PairStats>`
  - format='pairs' + no selectedPair: render `<PairsList>`
  - else: render existing `<PlayerStats>` (unchanged)

- **NEW `src/components/PairsList.jsx`** (~120 LOC initially):
  - Pair cards grid sorted by EFF% desc, MW desc, MP desc
  - Paired overlapping avatars + display name + country flags
  - 4-col stats footer: MP / MW / ML / EFF%
  - `onPairClick` → setSelectedPair → drill-in

- **NEW `src/components/PairStats.jsx`** (~295 LOC):
  - Hero with 60px paired avatars + name + season subtitle + flags
  - Effectiveness bar (animated width)
  - 6-metric grid: MP / MW / ML / Cons.W (best streak) / Set Diff / MOTM
  - Last 5 form strip
  - Best/Worst Opponent (pair-vs-pair, dedup if same pair)
  - 6 Achievement tiles with earned/locked state
  - Pair Match History (5 newest, date · opponent · score W/L color-coded)

- New CSS classes for `.pcard / .dpair / .dpro-* / .mgrid-pair / .sec-h-pair / .form-strip-pair / .opp-card / .ach / .mh-card`. Reuses existing tokens.

### Issue #92 (2/2) — pair-aware Analytics (commit `da07550`, SW v165)
- PairsList expanded from 123 → 363 LOC with internal Pairs/Analytics toggle + 4 analytics sub-sections:
  - **League** — top-5 Pair Standings as 7-col grid (#/Pair/MP/MW/ML/CW/EFF%) with gold/silver/bronze tints
  - **H2H** — two pair-dropdowns, tally + per-match list when both selected
  - **Synergy** — per-pair card with Sets Won / Matches Won / Tiebreaks / EFF%, sorted by MW
  - **Insights** — Most Active Pair / Most Matches Won / Longest Streak / MOTM Leader
- New CSS for `.an-card-pair / .prk-table-pair / .pair-sel / .h2h-tally / .syn-row / .insight-card`.

### Option A + B follow-up polish (commit `8f08693`, SW v166)

**A. LogMatch read-only when opened from open match** (Issue #71 polish):
- New `isFromOpenMatch = !!openMatchId` derived flag
- All 4 picker `<select>` elements gain `disabled={isFromOpenMatch}`
- Green banner above picker: "👥 From open match — players locked" + Undo button
- `undoPrefill()` helper clears `openMatchId` + resets tA/tB + calls `onPrefilledHandled`
- New `.ommfb` CSS

**B. FT-15 polish on PairsRanking** (deferred from S076):
- Form strip per row — `last5` array computed in pairStats useMemo, rendered as colored `.fdot` dots beneath stacked players in each row
- New Awards section between table and empty-state note:
  - Most Active Pair (highest MP)
  - MOTM Leader (per-player, NOT per-pair — matches mockup v4 decision)
- `onPairDrillIn` in App.jsx now wired to `setSelectedPair + setTab('stats')` so tapping a pair row routes to PairStats. Previously hardcoded null.
- New `.prk-formstrip / .prk-awards / .prk-award-card` CSS

---

## Files Modified

### Commit `fed6449` (Issue #93) — 3 files
- `src/components/RulesView.jsx` — Drop subtitle line
- `src/index.css` — `.rtb` padding fix + `.rtbey/.rtbh1/.rtbsub` self-pad
- `public/sw.js` — v162 → v163

### Commit `08b6121` (Issue #92 1/2) — 5 files
- `src/App.jsx` — pairFormatSeasonIds / individualMatches / pairsMatches memos; selectedPair state; stats tab branch on season.format; lazy imports for new components
- `src/components/PairsList.jsx` — NEW (~120 LOC)
- `src/components/PairStats.jsx` — NEW (~295 LOC)
- `src/index.css` — pair card / drill-in / achievements / match history CSS
- `public/sw.js` — v163 → v164

### Commit `da07550` (Issue #92 2/2) — 3 files
- `src/components/PairsList.jsx` — Internal Pairs/Analytics toggle + 4 analytics sub-sections (123 → 363 LOC)
- `src/index.css` — `.an-card-pair / .prk-table-pair / .pair-sel / .h2h-* / .syn-*` CSS
- `public/sw.js` — v164 → v165

### Commit `8f08693` (Options A+B polish) — 5 files
- `src/components/LogMatch.jsx` — isFromOpenMatch + undoPrefill + 4 disabled props + banner
- `src/components/PairsRanking.jsx` — last5 in pairStats memo + form strip render + Awards section
- `src/App.jsx` — onPairDrillIn callback wired
- `src/index.css` — `.ommfb / .prk-formstrip / .prk-awards` CSS
- `public/sw.js` — v165 → v166

---

## Key Decisions

- **Mockup-first iteration before any code** — Issue #92 went through 4 mockup rounds (v1 → v4) before a single source file changed. Each round resolved 4-6 ambiguities at zero implementation cost. Held the same cadence as Issue #36 (S057) and Issue #46 phases.
- **MOTM stays per-player, even in pairs format** — pair-level MOTM tile in drill-in is a SUM of player-MOTMs across the pair's matches. Award is for individual effort.
- **Achievements catalogue 6 not 7** — Iron Pair dropped to keep the 3-col grid clean (3+3 layout). User direction.
- **Universal season isolation** — every season is its own silo regardless of format. Individual stats never include pair-format matches, and vice versa. This is the user's explicit philosophical rule.
- **Pair-ELO trigger was already format-gated** — no DB migration needed for Issue #92. Verified via `pg_proc` inspection (`v_format <> 'pairs' THEN RETURN NEW`).
- **Phase 4 (Analytics) shipped same-day** rather than deferred — user wanted full mockup-v4 parity in production. Originally planned as a follow-up commit.
- **LogMatch undo button instead of two-way edit lock** — simpler than allowing partial edits; one click clears the link to the open match and re-enables free editing.

---

## Lessons Learned

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-05-11 | Tried to `cp OneDrive/padelhub/src/index.css → /tmp/Padel-Battle/src/index.css` as part of the Issue #93 ship. Diff showed 172 deletions / 150 insertions on a "small visual fix" — would have reverted S069 → S077 CSS. | OneDrive `padelhub/src/` is a stale mirror that doesn't auto-sync after pushes. Edits via Edit/Write tool target CWD (OneDrive), not /tmp. Naive `cp` from OneDrive to /tmp can revert pushed work. | **Always sync `/tmp → OneDrive` (never the reverse). Edit /tmp directly via Bash + Node fs.writeFileSync for git-tracked code. `git diff --stat` before commit — implausibly large churn on a small fix = mirror-revert bug.** Codified in CLAUDE.md Cold Start step 5 + auto-memory `feedback_git_repo_path.md`. |
| 2026-05-11 | First attempt to write PairStats.jsx via bash heredoc broke on `${r === "W" ? "w" : "l"}` template literal — bash interpreted the `${}` before reaching Node. | Bash treats `${...}` as variable expansion even inside heredocs unless escaped. JSX template literals (className={`a ${b}`}) trigger it. | **For files containing JSX template literals or backticks, use the Write tool on OneDrive then `cp` to /tmp, OR Node fs.writeFileSync with the content as a JS string (no template literal in the bash invocation).** Never use bash heredoc for JSX. |
| 2026-05-11 | Replaced too many `</div>` in PairsRanking with a regex — silently consumed the closing div of the second `.prk-pairrow`, leaving an unbalanced JSX tree. Vite build failed with "Unexpected token". | Regex `(<\/div>\s*<\/div>\s*<\/div>)$` captured 3 closing divs but my replacement only re-emitted 2. | **When inserting JSX between elements, use a single-element anchor (e.g. the line right before insertion point) and prepend, not a multi-element regex replace. Or run `npm run build` immediately after any multi-line JSX edit.** |

### Validated Patterns
- **Cold-start GitHub issue check** — running `gh issue list` at session start surfaces issues filed between sessions. Without it, new tickets are invisible until the user mentions them. Codified as CLAUDE.md Cold Start step 4.
- **Mockup-first iteration in HTML files** — for any non-trivial visual work, build `padelhub/public/mockup-issueN.html` and iterate v1 → vN with the user. Each round is a ~5-min Edit + reload cycle vs ~5-min source build + dev-server cycle. Resolved Issue #92 in 4 rounds.
- **Lazy chunks for component-level code-splitting** — PairsList and PairStats both became lazy chunks (3.5KB and 8.5KB gz) without manual config. Vite/Rolldown handle this when `lazy(() => import(...))` is used at the consumer site.
- **Universal isolation as a single filter axis** — using `season.format` as the only filter for individual-vs-pair aggregation is cleaner than mixing per-row format checks across every memo. Compute once (`pairFormatSeasonIds`), filter once (`individualMatches` / `pairsMatches`), let everything downstream consume the filtered slice.
- **Toggle UX consistency across formats** — PairsList uses the same internal `.seg/.sb` + `.seg-4/.sb-4` structure as PlayerStats, so the user gets the same feel whether they're in an individual or pairs season. Reuse > rebuild for sub-tab patterns.

---

## Next Actions
- [ ] **iPhone smoke-test of S078 ships (SW v166):**
  - Issue #93 Rules width (already passed)
  - Issue #92 pairs grid + drill-in + Analytics (League / H2H / Synergy / Insights)
  - LogMatch open-match read-only banner + Undo
  - PairsRanking form strip + Awards + tap-to-drill-in
- [ ] After smoke-test passes: close Issue #92 via `gh issue close 92`
- [ ] **Color sweep Note A from S069** — awaiting user A1/A2/A3 decision
- [ ] **Game Mode Phase 10 PR-D / PR-E** — SE/DE/RR active tournament views (needs state-based score input refactor first) + BracketSVG color tokens
- [ ] **LogMatch undo polish** — currently only banner+button; could add a subtle visual lock indicator on each select (e.g. lock icon overlay). Defer until smoke-test.

---

## Commits & Deploy
- **Commit 1:** `fed6449` — Issue #93 Rules screen width fix
- **Commit 2:** `08b6121` — Issue #92 (1/2) pair-format isolation + Pairs grid + PairStats drill-in
- **Commit 3:** `da07550` — Issue #92 (2/2) pair-aware Analytics (League/H2H/Synergy/Insights)
- **Commit 4:** `8f08693` — LogMatch open-match read-only + FT-15 polish (form strip, Awards, drill-in)
- **Live:** padel-battle.vercel.app on SW v166, deploy `dpl_AecC895KENFFajMgVzRkEHktBcrK` READY

---
_Session logged: 2026-05-11 | Logged by: Claude | Session078_
