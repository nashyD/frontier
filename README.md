# Frontier — studies from the edge

Twice a day, one landmark study explained in plain language — biohacking, AI, learning,
cannabis, finance, and frontier tech — for a curious reader with no science background.
Each lesson ships with a **QuizMe** set, and a two-host **podcast** walks through the day's
studies. For the first couple of months it teaches *existing* landmark studies from a
curated queue; flip one flag later to start surfacing *new* ones.

**Live:** https://nashyd.github.io/frontier/ *(Pages → Source: GitHub Actions)*

## How it works

```
   curriculum.json ──▶ routine agent (twice daily) ──▶ lessons/<date>-<slot>.json ──▶ git push
   (queue of studies)   read → verify → write                                              │
                                                                                            ▼
                                        GitHub Actions (.github/workflows/pages.yml)
                                        • build-manifest.mjs  → data/manifest.json + data/quizbank.json
                                        • build-podcast-feed.mjs → podcast.xml + data/episodes.json
                                        • deploy to GitHub Pages
                                                                                            │
                                                                                            ▼
                                        index.html · lesson.html · quiz.html  (fetch the JSON)
```

The agent only drops a well-formed lesson JSON into `lessons/`. Indexing is mechanical
(CI rebuilds the manifest + quiz bank), so a hand-edit can't desync anything.

## Layout

| Path | What |
|------|------|
| `index.html` | The hub — hero stats, podcast player, topic filter, lesson cards. |
| `lesson.html` | Reads `?id=`, renders one lesson + an inline quiz. |
| `quiz.html` | QuizMe — pulls questions from every lesson, tracks progress in `localStorage`. |
| `lessons/<date>-<slot>.json` | One self-contained lesson (slot = `am`/`pm`). |
| `data/curriculum.json` | Curated backlog the routine works through, + a `done` log. |
| `data/manifest.json` · `data/quizbank.json` | Generated indexes. Don't hand-edit. |
| `data/episodes.json` · `podcast.xml` | Generated podcast feed. |
| `assets/theme.css` · `assets/app.js` | Shared dark theme + helpers (topic registry). |
| `scripts/build-manifest.mjs` | Scans lessons → manifest + quiz bank. |
| `scripts/make-podcast.mjs` | Two-host script → MP3 via Gemini multi-speaker TTS (needs ffmpeg + `GEMINI_API_KEY`). |
| `scripts/build-podcast-feed.mjs` | Audio sidecars → RSS + episode list. |
| `routines/am-lesson.md` · `routines/pm-lesson.md` | The agent's job specs (pm also cuts the podcast). |

## Topics
`biohacking` · `ai` · `learning` · `cannabis` · `finance` · `frontier` — defined with
labels + colors in `assets/app.js`. Add a topic there and it flows everywhere.

## Run the builds locally
```
node scripts/build-manifest.mjs
node scripts/build-podcast-feed.mjs
```

## Podcast (local)
```
set -a && . ./.env && set +a
node scripts/make-podcast.mjs --date $(date +%F) --script /tmp/ep.txt \
  --title "Frontier — today" --summary "Today's studies."
```

## First-time setup
- **Enable Pages:** repo Settings → Pages → Source = **GitHub Actions**.
- **Schedule the agent:** two local Claude Code scheduled tasks run `routines/am-lesson.md`
  (morning) and `routines/pm-lesson.md` (evening).
- **Secret:** `.env` holds `GEMINI_API_KEY` (gitignored) for the podcast step.
