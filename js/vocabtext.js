// Text helpers for vocabulary examples. Pure: used by the app and by tools/vocab-schema.mjs.
// The sections of the Words tab: each pack belongs to one.
export const TRACKS = ['everyday', 'university'];
export const TRACK_NAMES = { everyday: 'Everyday', university: 'University' };

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

export function clozeOf(text, forms) {
  let best = null;
  for (const f of forms) {
    const m = formRegex(f).exec(text);
    if (m && (!best || m.index < best.index || (m.index === best.index && m[0].length > best[0].length))) best = m;
  }
  return best ? `${text.slice(0, best.index)}____${text.slice(best.index + best[0].length)}` : null;
}
