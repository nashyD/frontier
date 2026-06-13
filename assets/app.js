/* Frontier — shared helpers + topic registry. Loaded by every page. */

const TOPICS = {
  biohacking: { label: 'Biohacking',             color: '#34e3b0' },
  ai:         { label: 'Artificial Intelligence', color: '#8b7cff' },
  learning:   { label: 'Learning & Cognition',    color: '#ffb86b' },
  cannabis:   { label: 'Cannabis Science',        color: '#86d96b' },
  finance:    { label: 'Finance & Economics',     color: '#5fb3ff' },
  frontier:   { label: 'Frontier Tech',           color: '#ff7ea8' },
};

const topicColor = (t) => (TOPICS[t] && TOPICS[t].color) || '#8b7cff';
const topicLabel = (t, fallback) => (TOPICS[t] && TOPICS[t].label) || fallback || t;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

const slotLabel = (s) => (s === 'am' ? 'Morning' : s === 'pm' ? 'Evening' : '');

const ARROW = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

/* localStorage-backed quiz memory: per-question {seen, correct, lastTs, lastResult} */
const MEM_KEY = 'frontier.quizmem.v1';
const loadMem = () => { try { return JSON.parse(localStorage.getItem(MEM_KEY)) || {}; } catch { return {}; } };
const saveMem = (m) => { try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch {} };
function recordAnswer(qid, correct) {
  const m = loadMem();
  const e = m[qid] || { seen: 0, correct: 0 };
  e.seen += 1; if (correct) e.correct += 1;
  e.lastResult = correct ? 1 : 0;
  m[qid] = e; saveMem(m);
}
