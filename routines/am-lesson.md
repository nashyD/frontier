# Routine — Morning lesson (AM slot)

Self-contained job for the Frontier agent. Assume no memory of previous runs.
Working directory is the root of the `frontier` repo.

## Goal
Teach ONE existing landmark study, written for a sharp, curious reader with **no
formal science background** who loves the cutting edge. Output is a single lesson
JSON file that the static site renders.

## Steps
1. `cd /Users/nashdavis/Documents/frontier` and `git pull --rebase origin main`.
2. Today's date: `date +%F` (LOCAL America/New_York — never UTC). Slot is **am**, so
   `id = <date>-am`. If `lessons/<id>.json` already exists, STOP (already filed).
3. Open `data/curriculum.json`.
   - If `mode` is `"existing"` (the default for the first couple of months): take the
     FIRST entry in `queue`. That is your study.
   - If `mode` is `"new"`: instead, use WebSearch/WebFetch to find a genuinely
     interesting study published recently (last ~2 weeks) in one of the six topics,
     rotating topics day to day. Verify it with a real source.
4. **Research the study** with WebSearch/WebFetch. Confirm the authors, year, venue,
   and a working link (DOI or arXiv). Read enough to get the method and findings right.
5. **Write** `lessons/<id>.json`, following `templates/lesson-template.json` exactly
   (read it first) and matching the voice of existing lessons in `lessons/`. Required:
   - `topic` + `topicLabel` from the curriculum entry (or the topic you chose).
   - Exactly 5 sections with headings: "The question", "What they did", "What they
     found", "Why it's on the frontier", "The catch". ~60-110 words each.
   - 2-3 `terms`, 3 `takeaways`, exactly 3 `quiz` questions (4 choices, integer
     `answer` 0-3, a teaching `why`). A one-sentence `tldr`. Integer `readMinutes`.
6. **Voice rules (strict):**
   - Explain like you're talking to a smart friend. Define every technical term in
     plain words the first time it appears. Avoid math.
   - Accurate above all. Only state what is well established and central to the study.
     Describe uncertain figures qualitatively. **Never fabricate** an author, date,
     number, or finding. If you can't source it, pick a different study.
   - **Never use the "X, not Y" contrastive construction** anywhere in the prose.
   - No hype, no "as an AI", no marketing tone. Concrete and vivid beats abstract.
7. **Update the queue** (only in `existing` mode): remove the entry you used from
   `queue` and append a one-line record to `done` (e.g. `"<id> — <topic> — <citation>"`).
8. **Publish:**
   ```
   node scripts/build-manifest.mjs
   git add -A
   git commit -m "lesson(<topic>): <short title> for <date> am"
   git pull --rebase origin main && git push origin main
   ```

## Notes
- Pick studies that are real, well-documented, and teachable. When in doubt, prefer the
  landmark/most-cited version over an obscure follow-up.
- If the queue is empty in `existing` mode, either add a few solid studies to it or
  switch behavior to `new` mode for the day — and mention it in the commit.
