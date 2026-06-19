# Log Session — Universal Instruction File for Claude

> **Purpose:** When the user says "log session" or "log this session", follow these instructions EXACTLY. This is the established format. Do NOT use a different format, do NOT add frontmatter YAML blocks, do NOT add emoji section headers.
> **Applies to ALL session types** — deploy, planning, research, audit. Every session gets a log.

---

## Overview: What "Log Session" Means

Logging a session means updating **5 files** in a specific order. This is NOT optional — ALL 5 must be updated every time (skip any that don't exist in the current project).

| # | File | What to update |
|---|------|----------------|
| 1 | `sessions/YYYY-MM-DD — Session### — Title.md` | Create new session log file |
| 2 | `sessions/INDEX.md` | Add row to table + update "Next session" pointer |
| 3 | `tasks/todo.md` | Mark completed items `[x]`, add new items, update header |
| 4 | `tasks/lessons.md` | Add mistakes/lessons AND validated patterns from this session |
| 5 | Project `CLAUDE.md` | Update "Last updated" date, phase status, add new gotchas |

---

## Step 1: Determine Session Number

Read `sessions/INDEX.md` and find the last session number. The new session is that number + 1. Session numbers NEVER reset — they always increment globally (Session001, Session002, ... Session015, Session016, ...).

---

## Step 2: Create Session Log File

**Filename:** `sessions/YYYY-MM-DD — Session### — Short Title.md`
- Format: Date first, then session number, then title
- Use an em dash (—) between parts, not a hyphen
- Session number is zero-padded to 3 digits (Session001, Session016, etc.)
- Date is the actual date of the session
- Title is 3-6 words describing the main work done
- Example: `2026-03-29 — Session016 — Quick Wins + UX Polish.md`

**Template — follow this EXACTLY:**

```markdown
# Session Log — YYYY-MM-DD — Session### — Short Title

**Project:** [Project name]
**Phase:** [Current phase or workstream]
**Duration:** [Approximate session duration, e.g., "~2 hours" — optional but encouraged]
**Commits:** [comma-separated SHAs, or "None (planning only — no code changes)"]

---

## What Was Done

### [Task/Feature Name]
- Bullet points describing what was done
- Include technical details: what changed, why, how
- Reference specific files and line numbers where relevant

### [Next Task/Feature Name]
- Same format
- Group by logical task, not by file

---

## Files Modified
[If multiple commits, break down by commit:]

### Commit 1 (SHA) — N files
- `path/to/file.ext` — Brief description of changes

### Commit 2 (SHA) — N files
- `path/to/file.ext` — Brief description of changes

[If single commit or no commits:]
- `path/to/file.ext` — Brief description of changes
- None (planning/audit session)

## Key Decisions
- [Decision] — [reason/context]
- Use this for architectural choices, things deferred, trade-offs made

## Lessons Learned
[Include if mistakes were made OR successful patterns were validated this session.]

### Mistakes
| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|
| YYYY-MM-DD | What went wrong | Why it happened | **Bold rule to prevent recurrence** |

### Validated Patterns
- [Approach that worked] — **Why:** [reason it was non-obvious or worth remembering]

[If no mistakes AND no notable patterns: omit this section entirely]

## Next Actions
- [ ] [Action item] — [Owner if relevant]
- [ ] [Action item] — [Priority indicator if needed]

---

## Commits & Deploy
- **Commit 1:** `SHA` — Description
- **Commit 2:** `SHA` — Description
- **Live:** [URL if applicable]

[If no commits:]
- **Commits:** None (planning/audit session)

---
_Session logged: YYYY-MM-DD | Logged by: Claude | Session###_
```

### IMPORTANT FORMAT RULES:
1. **NO frontmatter YAML block** (no `---\ndate:\ntitle:\n---` at the top)
2. **NO emoji in section headers** (use `## What Was Done` not `## ✅ What Was Done`)
3. **NO sections called** "Session Snapshot", "Ideas & Opportunities", "Context Captured", "Recurring Themes" — these are NOT part of the format
4. **Keep it factual and concise** — no narrative paragraphs, just bullets
5. **Technical specifics matter** — include line counts, file sizes, commit SHAs where relevant
6. **"What Was Done" is organized by task**, not by file

---

## Step 3: Update sessions/INDEX.md

Add a new row to the table in `sessions/INDEX.md`:

```
| Session### | YYYY-MM-DD | Short Title | Type | Phase | Key Deliverables one-liner |
```

**Type values:** `Build`, `Build/Fix`, `Audit`, `Audit/Plan`, `Plan`, `Fix`, `Research`

Then update the "Next session" line at the bottom:

```
**Next session:** Session### — Brief description of what's planned next.
```

If `sessions/INDEX.md` doesn't exist yet, create it with this structure:

```markdown
# Sessions Index

> **Convention:** `YYYY-MM-DD — Session### — Short Title.md`
> Session### is a global counter that never resets. Always increments.

| # | Date | Title | Type | Phase | Key Deliverables |
|---|------|-------|------|-------|-----------------|
| Session001 | YYYY-MM-DD | Title | Type | Phase | Deliverables |

**Next session:** Session002 — Brief description.
```

---

## Step 4: Update tasks/todo.md

1. **Update the header block** to point to the NEXT session number
2. **Mark completed items** as `[x]`
3. **Add any new items** discovered during the session
4. **If a new session plan exists**, add it as a new section with checkboxes

---

## Step 5: Update tasks/lessons.md

Add entries for **mistakes** AND **validated patterns** (non-obvious approaches that proved correct).

**Mistakes** — add rows to the table:
```
| YYYY-MM-DD | What went wrong | Why it happened | **Bold prevention rule** |
```

**Validated patterns** — add below the table in a "Patterns That Work" section:
```
- [YYYY-MM-DD] [Approach] — Why: [reason it's worth remembering]
```

If `tasks/lessons.md` doesn't exist yet, create it:

```markdown
# Lessons Learned

| Date | Mistake | Root Cause | Prevention Rule |
|------|---------|------------|-----------------|

## Patterns That Work
- [YYYY-MM-DD] [Pattern] — Why: [context]
```

---

## Step 6: Update Project CLAUDE.md

1. Update the `> **Last updated:**` line with today's date and current status
2. Add any new gotchas or technical notes discovered during the session
3. Update feature inventory or file stats if they changed

---

---

## Commit-Session Linking

When making git commits during a session, **include the session ID in the commit message** for traceability:

```
[Session016] fix tournament bracket rendering for 3-player edge case
```

This makes it easy to trace any commit back to its session log, and vice versa.

---

## Abandoned / Interrupted Session Recovery

If a session ends without the close protocol being run (crash, context loss, user leaves):

1. The **next Cold Start** must detect the gap: check if `INDEX.md`'s "Next session" pointer matches the last file in `sessions/`
2. If a session is missing, **reconstruct it** from:
   - `git log` (commits since last logged session)
   - Changes to `tasks/todo.md` since last logged session
   - Any available conversation context
3. Write the reconstructed session log with a note: `**Note:** Reconstructed from git history — original session was interrupted.`
4. Then proceed with the current session as normal

---

## Quick Reference: What NOT to Do

- Do NOT add YAML frontmatter to session logs
- Do NOT use emoji in section headers (##)
- Do NOT add sections that aren't in the template above
- Do NOT skip updating any of the 5 files (unless they don't exist in the project)
- Do NOT write vague summaries — include specific numbers, SHAs, file paths
- Do NOT forget to update the "Next session" pointer in INDEX.md
- Do NOT forget to update the header in todo.md to point to the NEXT session
- Do NOT skip writing a session log for non-deploy sessions — planning and research sessions get logs too
- Do NOT only log mistakes — also capture validated patterns and what worked well
