#!/usr/bin/env node
/**
 * make-podcast.mjs
 * --------------------------------------------------------------------------
 * Turn a two-host script into a podcast MP3 using Gemini multi-speaker TTS.
 * The SCRIPT is written by the routine agent (an LLM already) — this script
 * only does voices + encoding + metadata, so there's no separate gen cost.
 *
 * Usage:
 *   node scripts/make-podcast.mjs --date 2026-06-13 --script /tmp/ep.txt \
 *        --title "Frontier — Jun 13" --summary "Today's two studies, walked through."
 *
 *   # pipeline test with no API call (4s of silence):
 *   node scripts/make-podcast.mjs --mock --date 2026-06-13 --title "Test" --summary "Test"
 *
 * Env:
 *   GEMINI_API_KEY     (required unless --mock)
 *   PODCAST_TTS_MODEL  default gemini-2.5-flash-preview-tts
 *   PODCAST_HOST_A/B   speaker labels in the script   (default Maya / Theo)
 *   PODCAST_VOICE_A/B  Gemini prebuilt voices          (default Kore / Puck)
 *   PODCAST_KEEP       how many recent episodes to retain (default 90)
 *
 * The script file must label every line with the host, e.g.:
 *   Maya: Morning. Today we're starting with a study most people get backwards...
 *   Theo: Right — the testing effect. Let's get into it.
 *
 * Requires ffmpeg + ffprobe on PATH.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_DIR = join(ROOT, 'audio');

const KEEP       = Number(process.env.PODCAST_KEEP || 90);
const TTS_MODEL  = process.env.PODCAST_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
const HOST_A     = process.env.PODCAST_HOST_A || 'Maya';
const HOST_B     = process.env.PODCAST_HOST_B || 'Theo';
const VOICE_A    = process.env.PODCAST_VOICE_A || 'Kore';
const VOICE_B    = process.env.PODCAST_VOICE_B || 'Puck';
const MAX_CHARS  = Number(process.env.PODCAST_CHUNK_CHARS || 3600); // safe under the 32k-token TTS window

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return def;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};

const date = arg('date');
const title = arg('title') || `Frontier — ${date}`;
const summary = arg('summary') || '';
const scriptPath = arg('script');
const mock = !!arg('mock', false);

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
  console.error('Need --date YYYY-MM-DD'); process.exit(1);
}

mkdirSync(AUDIO_DIR, { recursive: true });
const mp3Path = join(AUDIO_DIR, `${date}.mp3`);
const metaPath = join(AUDIO_DIR, `${date}.json`);
const tmp = join(tmpdir(), `frontier-pod-${date}-${process.pid}`);
mkdirSync(tmp, { recursive: true });

const ff = (args) => execFileSync('ffmpeg', ['-y', ...args], { stdio: 'pipe' });
const probeDuration = (file) => {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', file]).toString().trim();
    return Math.round(parseFloat(out)) || 0;
  } catch { return 0; }
};

async function tts(text, key, attempt = 1) {
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: HOST_A, voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_A } } },
            { speaker: HOST_B, voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_B } } },
          ],
        },
      },
    },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const t = await res.text();
    if ([429, 500, 503].includes(res.status) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return tts(text, key, attempt + 1);
    }
    throw new Error(`Gemini TTS ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  const data = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  if (!data) throw new Error('No audio in TTS response: ' + JSON.stringify(j).slice(0, 300));
  return data; // base64 PCM (24kHz, 16-bit, mono)
}

if (mock) {
  ff(['-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '4', '-b:a', '96k', mp3Path]);
  console.log('✓ mock episode (4s silence) written');
} else {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.error('GEMINI_API_KEY not set'); process.exit(1); }
  if (!scriptPath || !existsSync(scriptPath)) { console.error('Need --script <file>'); process.exit(1); }

  const lines = readFileSync(scriptPath, 'utf8').trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const chunks = [];
  let cur = '';
  for (const line of lines) {
    if (cur && (cur.length + 1 + line.length) > MAX_CHARS) { chunks.push(cur); cur = line; }
    else cur = cur ? cur + '\n' + line : line;
  }
  if (cur) chunks.push(cur);
  console.log(`Synthesizing ${chunks.length} chunk(s) with ${TTS_MODEL} (${VOICE_A}/${VOICE_B})…`);

  const pcmBuffers = [];
  for (let i = 0; i < chunks.length; i++) {
    const b64 = await tts(chunks[i], key);
    const pcm = Buffer.from(b64, 'base64');
    pcmBuffers.push(pcm);
    console.log(`  ✓ chunk ${i + 1}/${chunks.length} — ${(pcm.length / 1e6).toFixed(2)}MB pcm`);
  }
  const combined = join(tmp, 'combined.pcm');
  writeFileSync(combined, Buffer.concat(pcmBuffers));
  ff(['-f', 's16le', '-ar', '24000', '-ac', '1', '-i', combined, '-b:a', '96k', mp3Path]);
}

const bytes = statSync(mp3Path).size;
const durationSec = probeDuration(mp3Path);
writeFileSync(metaPath, JSON.stringify({ date, title, summary, file: `audio/${date}.mp3`, durationSec, bytes }, null, 2) + '\n');
console.log(`✓ ${date}.mp3 — ${durationSec}s, ${(bytes / 1e6).toFixed(1)}MB`);

// Prune to the most recent KEEP episodes
const mp3s = readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.mp3')).sort().reverse();
for (const old of mp3s.slice(KEEP)) {
  rmSync(join(AUDIO_DIR, old), { force: true });
  rmSync(join(AUDIO_DIR, old.replace(/\.mp3$/, '.json')), { force: true });
  console.log(`  · pruned old episode ${old}`);
}
rmSync(tmp, { recursive: true, force: true });
