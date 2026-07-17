---
name: merge-request
description: >-
  End-of-session flow for this repo: record today's work in
  documents/changes/YYYY-MM-DD.md, keep documents/changes/README.md's index
  in sync, and produce a short/simple/clear merge request title. Use when the
  user asks to "compile changes into documentation", "update the changes
  log", "masukkan dalam changes file", wants a merge request / MR / PR title,
  or is wrapping up a session and wants both the docs and a title. Always
  update the daily changes file AND the README index together — never one
  without the other.
---

# Merge Request Flow

This repo keeps a hand-written daily changelog in `documents/changes/` (see
`documents/changes/README.md` for the template and index table). This skill
does two things every time it runs, in order:

1. Log today's work into `documents/changes/YYYY-MM-DD.md`.
2. Produce a merge request title.

Never do just the title without touching the docs — the user's standing
instruction is both happen together.

## Step 1 — Figure out what changed

Run these to see the actual diff, don't guess from conversation memory alone:

```bash
git status
git diff --stat
git diff
```

If work spans multiple prior turns in the conversation, cross-check against
what's actually in the working tree — the changelog should reflect real
file changes, not just what was discussed.

## Step 2 — Write/update the daily file

Path: `documents/changes/YYYY-MM-DD.md` (today's date, `YYYY-MM-DD`).

- **If the file doesn't exist yet today**: create it from the template in
  `documents/changes/README.md` (`Quick Overview` → `What Changed` →
  `User Impact` → `Notes for Next Time`). List every touched file in Quick
  Overview.
- **If it already exists** (you're adding more work on top of an earlier
  entry from today): don't overwrite — append. Follow the precedent in
  `documents/changes/2026-07-12.md`, which added a `## Follow-up fixes (same
  day, after first pass)` section with its own numbered subsections rather
  than rewriting the earlier ones. Update the `Quick Overview` bullets and
  file list at the top too if the new work adds files not already listed.
- Write in plain, simple language — a non-technical reader should follow
  `What Changed` and definitely `User Impact`. Explain the *why* when it's
  not obvious from the *what*.
- Number sections sequentially within whichever top-level section they land
  in (don't restart numbering when appending — continue from the last
  number used earlier that day).

## Step 3 — Update the README index

File: `documents/changes/README.md`, the `## Log Index` table.

- **New date today**: add a new row, one line, past the last existing row —
  `| [YYYY-MM-DD](YYYY-MM-DD.md) | <short summary> |`. Keep the summary to
  the same terse style as existing rows (e.g. "Chase vs normal diecast
  photos and catalog tiles split apart") — a few comma-separated fragments,
  not a sentence.
- **Same date already indexed** (appending more work to today): only touch
  the existing row if the new work changes what the headline summary should
  be — otherwise leave it alone. Don't create a duplicate row for the same
  date.

## Step 4 — Draft the merge request title

Look at recent commit message style for tone (`git log --oneline -10`) —
this repo mixes short imperative titles ("add pre order tracker", "Fix
catalog brand navigation and image cache busting") and short factual
statements ("Purchase price now accepts RM 0.00"). Either register is fine;
consistency with the diff's actual scope matters more than matching one
exact past commit.

Rules for the title:

- Short — aim under ~70 characters, one line, no period at the end.
- Plain description of the *outcome*, not implementation detail — someone
  scanning the git log a month from now should understand what changed
  without opening the diff.
- Cover the actual scope of the diff. If the session touched several
  unrelated things, name the two or three biggest, don't just pick the
  first thing done.
- English (matches this repo's commit history), even if the conversation
  itself was in Malay/English mix.
- Offer it as **one clear recommended title**. Only offer a second, more
  detailed alternative if the change genuinely has enough surface area that
  a single short line loses something important — don't pad with options
  for their own sake.

## Step 5 — Reply to the user

- Link the changed/created doc files with markdown links so they're
  clickable.
- State the title(s) in a fenced code block so it's easy to copy-paste
  as-is into a merge request.
- Don't create the actual PR/MR or push anything — this skill only prepares
  the docs and drafts the message text. Creating/pushing stays subject to
  the normal explicit-confirmation rule.
