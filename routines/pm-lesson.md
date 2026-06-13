# Routine — Evening lesson + daily podcast (PM slot)

Self-contained job for the Frontier agent. Assume no memory of previous runs.
Working directory is the root of the `frontier` repo. Run this in the evening,
AFTER the morning lesson is filed.

## Goal
1. Teach ONE existing landmark study (the **pm** slot), same rules as the morning.
2. Then cut a short two-host audio episode covering the day's study (or both of
   today's studies), and publish it to the podcast feed.

## Part 1 — the evening lesson
Follow `routines/am-lesson.md` exactly, with one change: the slot is **pm**, so
`id = <date>-pm` and the commit message ends `for <date> pm`. Take the next entry
in the curriculum `queue`, write `lessons/<id>.json`, update the queue, then
`node scripts/build-manifest.mjs` and commit. (Do NOT push yet — push once after
the podcast in Part 2, so it's a single deploy.)

## Part 2 — the podcast
### Prereq
`GEMINI_API_KEY` must be available — the repo's `.env` (gitignored) holds it.
ffmpeg + node must be on PATH.

### Steps
1. Today's date: `date +%F` (LOCAL). If `audio/<date>.mp3` already exists, skip Part 2.
2. Read today's lesson files: `lessons/<date>-am.json` and `lessons/<date>-pm.json`
   (whichever exist). These are the source material — only say what's in them.
3. **Write the script** to a temp file (e.g. `/tmp/frontier-<date>.txt`). Two hosts,
   **Maya** and **Theo**. Label EVERY line `Maya:` or `Theo:` — those labels map to
   voices.
   - ~700-1100 words (≈4-7 min). Warm cold open → walk through each study as a real
     conversation (hand off, react, ask the dumb question a listener would) → a
     10-second sign-off that teases tomorrow.
   - Plain-spoken and accurate: only what's in today's lessons. No markdown, no URLs,
     no bracketed stage directions. Never use the "X, not Y" construction.
4. **Make the audio:**
   ```
   cd /Users/nashdavis/Documents/frontier
   set -a && . ./.env && set +a
   node scripts/make-podcast.mjs --date <date> --script /tmp/frontier-<date>.txt \
     --title "Frontier — <long date>" \
     --summary "<one-sentence rundown of today's studies>"
   ```
   This writes `audio/<date>.mp3` + `audio/<date>.json` and prunes old episodes.
5. **Publish everything (single deploy):**
   ```
   node scripts/build-podcast-feed.mjs
   git add -A
   git commit -m "podcast: Frontier for <date>"
   git pull --rebase origin main && git push origin main
   ```

## Notes
- Voices default to Kore (Maya) / Puck (Theo); override with `PODCAST_VOICE_A/B` in `.env`.
- If TTS fails after retries (rare 500s), skip the episode and still push the lesson —
  a missed episode is not a blocker.
