#!/usr/bin/env node
/**
 * build-manifest.mjs
 * --------------------------------------------------------------------------
 * Scans lessons/*.json and (re)writes two indexes the static site reads:
 *   - data/manifest.json  — lightweight cards for the hub + lesson nav
 *   - data/quizbank.json  — every quiz question flattened, for QuizMe
 *
 * The routine agent only has to drop a well-formed lesson JSON into lessons/.
 * Indexing is mechanical and happens here (run in CI on every push), so the
 * agent can never desync the indexes by hand-editing them.
 *
 * Run locally:  node scripts/build-manifest.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS_DIR = join(ROOT, 'lessons');
const MANIFEST = join(ROOT, 'data', 'manifest.json');
const QUIZBANK = join(ROOT, 'data', 'quizbank.json');

let files = [];
try { files = readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.json')); } catch { files = []; }

const lessons = [];
const quizbank = [];

for (const file of files) {
  let lesson;
  try { lesson = JSON.parse(readFileSync(join(LESSONS_DIR, file), 'utf8')); }
  catch (e) { console.warn(`  ! skipped (invalid JSON): ${file} — ${e.message}`); continue; }

  const id = lesson.id || file.replace(/\.json$/, '');
  if (!lesson.date || !lesson.title) {
    console.warn(`  ! skipped (missing date or title): ${file}`);
    continue;
  }

  const quiz = Array.isArray(lesson.quiz) ? lesson.quiz : [];
  lessons.push({
    id,
    date: lesson.date,
    slot: lesson.slot || '',
    topic: lesson.topic || 'frontier',
    topicLabel: lesson.topicLabel || '',
    title: lesson.title,
    tldr: lesson.tldr || '',
    readMinutes: Number(lesson.readMinutes) || 0,
    citation: (lesson.study && lesson.study.citation) || '',
    quizCount: quiz.length,
  });

  quiz.forEach((q, i) => {
    if (!q || !q.q || !Array.isArray(q.choices)) return;
    quizbank.push({
      qid: `${id}#${i}`,
      lessonId: id,
      lessonTitle: lesson.title,
      topic: lesson.topic || 'frontier',
      topicLabel: lesson.topicLabel || '',
      q: q.q,
      choices: q.choices,
      answer: Number(q.answer) || 0,
      why: q.why || '',
    });
  });
}

const sortKey = (r) => r.date + (r.slot === 'pm' ? '-2' : r.slot === 'am' ? '-1' : '-0');
lessons.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

writeFileSync(MANIFEST, JSON.stringify(lessons, null, 2) + '\n');
writeFileSync(QUIZBANK, JSON.stringify(quizbank, null, 2) + '\n');
console.log(`✓ ${relative(ROOT, MANIFEST)} — ${lessons.length} lesson(s)`);
console.log(`✓ ${relative(ROOT, QUIZBANK)} — ${quizbank.length} quiz question(s)`);
