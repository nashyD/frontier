#!/usr/bin/env node
/**
 * build-podcast-feed.mjs
 * --------------------------------------------------------------------------
 * Scans audio/<date>.json sidecars and emits:
 *   - podcast.xml          a valid RSS 2.0 + iTunes feed (subscribe in any app)
 *   - data/episodes.json   a small list the hub player reads
 * Runs in CI on every push (no API key needed — audio is already generated).
 *
 * Run locally:  node scripts/build-podcast-feed.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_DIR = join(ROOT, 'audio');

// ---- Channel config (SITE can be overridden for a custom domain) ----
const SITE = process.env.PODCAST_SITE || 'https://nashyd.github.io/frontier';
const SHOW = {
  title: 'Frontier',
  description: 'A short twice-daily audio walk through one landmark study — biohacking, AI, learning, cannabis, finance, and frontier tech, explained in plain language by two hosts.',
  author: 'Frontier',
  ownerEmail: 'nashdavis@tsd-ventures.com',
  image: `${SITE}/assets/podcast-cover.png`,
  language: 'en-us',
  category: 'Science',
};

const xmlEscape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

const hms = (sec) => {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + ':' + String(s).padStart(2, '0');
};

// RFC-822 pubDate; stagger by index so same-day episodes keep order in apps
const pubDate = (date, idx) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, Math.min(59, idx))).toUTCString();
};

let episodes = [];
if (existsSync(AUDIO_DIR)) {
  episodes = readdirSync(AUDIO_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => { try { return JSON.parse(readFileSync(join(AUDIO_DIR, f), 'utf8')); } catch { return null; } })
    .filter((e) => e && e.date && e.file && existsSync(join(ROOT, e.file)))
    .sort((a, b) => b.date.localeCompare(a.date));
}

writeFileSync(join(ROOT, 'data', 'episodes.json'), JSON.stringify(episodes, null, 2) + '\n');

const items = episodes.map((e, i) => `    <item>
      <title>${xmlEscape(e.title)}</title>
      <description>${xmlEscape(e.summary)}</description>
      <itunes:summary>${xmlEscape(e.summary)}</itunes:summary>
      <enclosure url="${xmlEscape(`${SITE}/${e.file}`)}" length="${Number.isFinite(e.bytes) ? e.bytes : 0}" type="audio/mpeg"/>
      <guid isPermaLink="false">frontier-${xmlEscape(e.date)}</guid>
      <pubDate>${pubDate(e.date, i)}</pubDate>
      <itunes:duration>${hms(e.durationSec)}</itunes:duration>
      <itunes:episodeType>full</itunes:episodeType>
    </item>`).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xmlEscape(SHOW.title)}</title>
    <link>${SITE}/</link>
    <language>${SHOW.language}</language>
    <description>${xmlEscape(SHOW.description)}</description>
    <itunes:author>${xmlEscape(SHOW.author)}</itunes:author>
    <itunes:summary>${xmlEscape(SHOW.description)}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>false</itunes:explicit>
    <itunes:image href="${SHOW.image}"/>
    <image><url>${SHOW.image}</url><title>${xmlEscape(SHOW.title)}</title><link>${SITE}/</link></image>
    <itunes:category text="${xmlEscape(SHOW.category)}"/>
    <itunes:owner><itunes:name>${xmlEscape(SHOW.author)}</itunes:name><itunes:email>${xmlEscape(SHOW.ownerEmail)}</itunes:email></itunes:owner>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${SITE}/podcast.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
writeFileSync(join(ROOT, 'podcast.xml'), xml);
console.log(`✓ podcast.xml + data/episodes.json — ${episodes.length} episode(s)`);
