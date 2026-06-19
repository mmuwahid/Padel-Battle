# Session Log — 2026-05-06 — Session052 — Issues #20 + #21 Photo Upload + Sidebar Profile

**Project:** PadelHub
**Phase:** Post-P7
**Duration:** ~50 minutes
**Commits:** e439b0a, 3b9ef98

---

## What Was Done

### Issue #20 — Photo upload (2 bugs)

**Bug A: "Failed to load on first attempt, works on second" (iOS Safari PWA)**
- Root cause: the `FileReader → data URL → Image()` decode chain was unreliable in iOS PWA mode, especially with HEIC photos from the iOS Photos library. Image.onerror fired on the first `img.src = dataUrl` attempt; the cached state on retry let the second attempt succeed.
- Fix: new helper `decodeImageFile(file)` in [src/utils/helpers.js](padelhub/src/utils/helpers.js) that prefers `createImageBitmap` (native HEIC decode on iOS 17+, more reliable async) with `URL.createObjectURL + Image` fallback. ImageBitmap and HTMLImageElement are both valid first args to `ctx.drawImage()`.
- Applied in **both** entry points: [App.jsx:uploadAvatar](padelhub/src/App.jsx) (My Profile photo) and [EditPlayerModal.jsx:uploadPhoto](padelhub/src/components/EditPlayerModal.jsx) (admin Player Management).

**Bug B: Photo not propagating to player avatar slots**
- Root cause: two disconnected identities. ProfileView upload wrote only to `profiles.avatar_url` (path `{userId}/avatar.jpg`), but every player-avatar slot in the app reads `players.avatar_url`. The user's profile photo never became the player's photo.
- Fix 1 — write-through: when a claimed user uploads/removes their profile photo, App.jsx now also `UPDATE players SET avatar_url = ... WHERE id = claimedPlayer.id` and triggers `loadLeagueData()` so the change appears immediately in ranking, partners, H2H, etc.
- Fix 2 — PlayerStats.jsx avatar coverage: 7 avatar slots that were rendering only the letter initial now check `avatar_url` first. Added a `getAvatar(pid)` helper (`players.find(pp=>pp.id===pid)?.avatar_url`). Slots updated:
  - L155 — drill-in profile top card
  - L232 — Insights "Most Active" row
  - L301 — Best Pairs partnership card
  - L309 — Worst Pairs partnership card
  - L372 + L374 — H2H opponents (×2)
  - L495 — Players grid card

### Issue #21 — Sidebar profile entry
- Removed standalone "👤 My Profile" button from sidebar nav (deleted button + the divider that followed it).
- Wrapped the existing avatar + name + email block at the top of the sidebar in a `<button>` with `onClick={()=>{setSidebarView("profile");setSidebarOpen(false);}}`. Tapping anywhere on it opens My Profile.
- Added a `›` chevron on the right as a discoverability hint.
- Result: one entry point, matching the user's mental model (the avatar IS the profile entry).

### MOTM Ranking avatar follow-up (commit 3b9ef98)
- iPhone smoke-test caught one missed slot: PlayerStats.jsx L440 MOTM Ranking row inside Insights still rendered name-only.
- Fix: 28×28 gold-tinted circle (`background:${GD}15; border:2px solid ${GD}40`) with `avatar_url` image (or letter fallback) inserted between the index number and the name. Same `getAvatar(pid)` helper.
- Layout protections: `flex:1 + minWidth:0 + ellipsis` on the name; `flexShrink:0` on the right-aligned `Nx ⭐` count so longer names don't push the count off-screen.

### Verification
- Esbuild syntax check on all 5 edited files in S052 first push — all OK.
- Esbuild syntax check on PlayerStats.jsx for MOTM follow-up — OK.
- Vercel deploys both READY.
- Dev preview reload after each push: zero console errors, zero server errors.
- iPhone-confirmed working end-to-end: sidebar profile entry, first-attempt photo upload, photo propagation to ranking + Player Management + analytics sub-menus, MOTM avatars rendering.

---

## Files Modified

### Commit e439b0a — 6 files (+67/-34)
- `padelhub/src/utils/helpers.js` — new `decodeImageFile(file)` export (createImageBitmap + Image fallback)
- `padelhub/src/App.jsx` — `uploadAvatar` uses `decodeImageFile` + write-through to `players.avatar_url` for the user's claimed player; `removeAvatar` clears the player row too; new helper imported
- `padelhub/src/components/EditPlayerModal.jsx` — `uploadPhoto` switched to `decodeImageFile`
- `padelhub/src/components/PlayerStats.jsx` — added `getAvatar(pid)` helper; 7 avatar slots updated to render `avatar_url` with letter fallback
- `padelhub/src/components/Sidebar.jsx` — top user info block converted to a button (open My Profile); standalone "👤 My Profile" button + following divider removed
- `padelhub/public/sw.js` — CACHE_NAME v63 → v64

### Commit 3b9ef98 — 2 files (+7/-3)
- `padelhub/src/components/PlayerStats.jsx` — MOTM Ranking row gains 28×28 avatar circle with letter fallback; flex layout protections
- `padelhub/public/sw.js` — CACHE_NAME v64 → v65

---

## Key Decisions

- **Write-through to `players.avatar_url` over a synthetic lookup.** Considered building a `avatarUrlByPlayerId` map in App.jsx that combined `profiles.avatar_url` (user-self) and `players.avatar_url` (admin-set) via `player.user_id` lookup. Rejected: invasive (every consumer would need the map), and the user expectation is "my photo is my photo" — one source of truth on the player row is simpler. The user-level `profiles.avatar_url` is still maintained for the Sidebar/ProfileView avatar (which doesn't have player context).
- **`createImageBitmap` first, Image+objectURL fallback.** `createImageBitmap` is the modern, robust path on iOS 17+ and decodes HEIC natively; older browsers fall back to the existing pattern. Helper signature is identical for both — both are valid first args to `ctx.drawImage()`. No retry/loop required because the failure mode was a decode-format quirk, not a transient race.
- **Asked the user before guessing.** Used `AskUserQuestion` to scope (a) PlayerStats coverage (all 6 slots vs. just visible 2), (b) photo write-through behavior (overwrite both vs. user-level only). Both came back with the recommended option, locking the scope before I touched code. Same pattern as S051 #18 — pause for confirmation on multi-axis fixes.
- **Sidebar entry point: turn the existing block into a button instead of adding a new "go to profile" affordance.** The user's mental model in #21 was "the avatar IS the profile entry" — the most direct interpretation of that is making the existing avatar/name/email row tappable, not adding a new button labeled "Go to profile". Chevron `›` hints discoverability without consuming visual real estate.
- **Catch-all sweep + named follow-up.** First push covered 7 PlayerStats slots; the MOTM Ranking inside Insights was missed because it was visually distinct (no avatar circle existed). Better: enumerate every name-rendering site, not just every existing-avatar site. (Lesson #47 below.)

## Lessons Learned

### Validated Patterns
- **`createImageBitmap` is the right primitive for "decode user-supplied image into a canvas" on the web.** It supersedes `FileReader → data URL → Image` on iOS Safari (intermittent failures, especially HEIC), works in all major browsers, and produces a drawable that's a drop-in for `ctx.drawImage`. Keep the Image+objectURL fallback for older Android WebView. **Why:** the existing pattern was inherited from blog posts circa 2018; the iOS PWA ecosystem has moved on. (S052 Issue #20.)
- **Write-through pattern for "user identity → app identity":** when a user-scoped column (`profiles.avatar_url`) and an entity-scoped column (`players.avatar_url`) coexist, write to BOTH on update if the user is bound to that entity. Simpler than a synthetic union lookup at every read site, and natural for "this player is me" cases. **Why:** UI consumers stay simple (`row.avatar_url`); the merge happens at write time when context is unambiguous (we know who the user is and which player they've claimed). (S052 Issue #20 fix.)
- **Sidebar/menu entry consolidation: prefer making an existing element clickable over adding a new entry.** The user's "the avatar IS the profile" framing in Issue #21 is a co-location signal (Lesson #41). Look for a place to attach the action to existing UI before adding a new affordance — fewer entries, less menu chrome, matches mental model. (S052 Issue #21.)

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| 2026-05-06 | Shipped #20 with 7 avatar slots updated but MOTM Ranking missed; required a follow-up commit | Sweep was scoped to "existing avatar circles that show only a letter" — MOTM Ranking didn't have an avatar circle at all (just `{i+1}. {name}`), so it didn't match the search pattern. The sweep should have been "every name-rendering site" not "every existing avatar site." | **When adding avatars to a multi-screen surface, grep for `getName(` (the name-rendering pattern), not for existing avatar circle markup. Sites that render names without avatars are the easy ones to miss.** Same logic applies to any "add X next to every Y" sweep — anchor the search on Y (the thing that already exists everywhere), not on the absence of X. (Lesson #47.) |

## Next Actions
- [ ] FT-14 phase 2 (deferred since S050) — apply Option C hybrid to ranking screen + LogMatch picker filtering by season roster.
- [ ] SE/DE stepper conversion + S045 `validateMatch` wiring (deferred since S043).
- [ ] FT-07 Player Deletion Redesign — needs FRESH plan written.
- [ ] Optional cleanup: tournament realtime sub, `SET search_path = public` on pre-S045 SECURITY DEFINER functions, country/position backfill for other leagues' players.

---

## Commits & Deploy
- **Commit e439b0a** — `[Session052] Issues #20 + #21: photo upload + sidebar profile entry` — 6 files (+67/-34)
- **Commit 3b9ef98** — `[Session052] MOTM Ranking: render avatar next to player name` — 2 files (+7/-3)
- **Deploys:** `dpl_Bxo181KHSDRFnfvBMYuvR8CYrpAq` (e439b0a) READY · `dpl_GjtXb3UknLC3NZf3YTRTJjYuxG78` (3b9ef98) READY (production)
- **Live:** https://padel-battle.vercel.app
- **Issues closed:** mmuwahid/Padel-Battle#20, mmuwahid/Padel-Battle#21 — all open issues clear.

---
_Session logged: 2026-05-06 | Logged by: Claude | Session052_
