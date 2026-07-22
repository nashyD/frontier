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
   - If `queue` has entries: take the FIRST entry. That is your study (a human queued
     it deliberately, so it wins regardless of mode). Skip to step 4.
   - If `mode` is `"existing"`: take the first `queue` entry; if the queue is empty,
     follow the `"new"` procedure below for the day and say so in the commit.
   - If `mode` is `"new"` (current since 2026-07-21): surface a study that is
     genuinely NEW. Procedure:
     a. **Pick the topic.** Read `data/manifest.json` and list the topics of the last
        6 lessons. Choose a topic from `biohacking / ai / learning / cannabis /
        finance / frontier` that appears least recently in that list, so all six
        rotate roughly every three days.
     b. **Recency bar.** The study must have been published or posted within the last
        ~30 days; prefer the last 14. "Published" means a dated primary source: a
        journal article, an arXiv/bioRxiv/medRxiv/SSRN preprint, or a peer-reviewed
        conference paper. A press release or news story is a lead, never the source.
     c. **Where to hunt** (2-4 distinct searches minimum):
        - `ai` / `frontier`: arXiv listings, major-lab publications, NeurIPS/ICML/ICLR
          accepted papers, Nature/Science news coverage of new results.
        - `biohacking` / `cannabis`: PubMed "sort by most recent", medRxiv/bioRxiv,
          journal new-issue pages (e.g. Cell Metabolism, JAMA, Journal of Cannabis
          Research), NIH press releases.
        - `learning`: Psychological Science, Nature Human Behaviour, npj Science of
          Learning, Cognition recent issues.
        - `finance`: NBER working papers this week, SSRN top recent, Journal of
          Finance/AER early-access, FRED/central-bank research blogs.
        General sweeps of Quanta, Nature news, Science news, and Ars Technica science
        also surface candidates across topics; always chase the primary paper behind
        the coverage.
     d. **Selection bar.** Real methods and a concrete finding a curious layperson can
        grasp; big-if-true is fine when the evidence is real. Skip papers whose only
        substance is a benchmark table, an opinion/position piece, or a press release
        with no paper behind it. Check `done` in `data/curriculum.json` so you never
        repeat a study.
     e. **If the chosen topic has nothing fresh worth teaching**, rotate to the
        next-least-recent topic rather than reaching back to an older classic. The
        whole point of `"new"` mode is that the site covers the frontier as it moves.
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
7. **Update the curriculum bookkeeping.** In `existing` mode (or when you consumed a
   queued entry): remove the entry you used from `queue`. In EVERY mode: append a
   one-line record to `done` (e.g. `"<id> — <topic> — <citation>"`) — `done` is the
   dedupe ledger that stops a future run from re-teaching the same study.
8. **Publish:**
   ```
   node scripts/build-manifest.mjs
   git add -A
   git commit -m "lesson(<topic>): <short title> for <date> am"
   git pull --rebase origin main && git push origin main
   ```

## Notes
- Pick studies that are real, well-documented, and teachable.
- In `"new"` mode, "The catch" section is where preprint status, small samples, and
  unreplicated-yet caveats live — state them plainly. A brand-new result with honest
  caveats beats a safe classic; an unsourced hype story beats nothing at all and must
  still be skipped.
- Fresh preprints often have thin secondary coverage. That is fine: the arXiv/DOI page
  itself is the source. Cite what the paper says and resist filling gaps from
  imagination.
