// Text helpers for vocabulary examples. Pure: used by the app and by tools/vocab-schema.mjs.
// The sections of the Words tab: each pack belongs to one.
export const TRACKS = ['everyday', 'university'];
export const TRACK_NAMES = { everyday: 'Everyday', university: 'University' };
// Every list of words a day's batch can be drawn from: the English tracks and the Dutch everyday words.
export const SECTIONS = [...TRACKS, 'nl-everyday'];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "figure … out" lets up to three words sit between the two parts ("figure it out").
function formRegex(form) {
  const tokens = form.trim().split(/\s+/);
  const body = tokens
    .map((t, i) => (t === '…' ? '(?:\\S+\\s+){0,3}' : escapeRegExp(t) + (i < tokens.length - 1 ? '\\s+' : '')))
    .join('');
  return new RegExp(`(?<!\\p{L})${body}(?!\\p{L})`, 'iu');
}

export const formMatches = (text, forms) => forms.some((f) => formRegex(f).test(text));

// Dutch separable verbs ("maak … schoon"): with `split` both parts are blanked and the words between stay,
// so the learner still sees the sentence ("Ik ____ zaterdag de badkamer ____.").
function splitRegex(form) {
  const [a, b] = form.split('…').map((part) => part.trim().split(/\s+/).map(escapeRegExp).join('\\s+'));
  return new RegExp(`(?<!\\p{L})(${a})\\s+((?:\\S+\\s+){0,3})(${b})(?!\\p{L})`, 'iu');
}

export function clozeOf(text, forms, { split = false } = {}) {
  let best = null;
  for (const f of forms) {
    const isSplit = split && f.includes('…');
    const m = (isSplit ? splitRegex(f) : formRegex(f)).exec(text);
    if (m && (!best || m.index < best.m.index || (m.index === best.m.index && m[0].length > best.m[0].length))) best = { m, isSplit };
  }
  if (!best) return null;
  const { m, isSplit } = best;
  const before = text.slice(0, m.index);
  const after = text.slice(m.index + m[0].length);
  return isSplit ? `${before}____ ${m[2]}____${after}` : `${before}____${after}`;
}
