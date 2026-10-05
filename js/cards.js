import { newCard, review, isDue } from './srs.js';

export const SOON_MS = 15 * 60 * 1000;

export function indexChunks(weeks) {
  const index = {};
  for (const w of weeks) for (const c of w.chunks) index[c.id] = { ...c, lang: w.lang };
  return index;
}

export function indexWords(words) {
  return Object.fromEntries(words.map((w) => [w.id, w]));
}

export function introduce(state, ids, now = new Date()) {
  const missing = ids.filter((id) => !state.cards[id]);
  if (!missing.length) return state;
  const cards = { ...state.cards };
  for (const id of missing) cards[id] = newCard(now);
  return { ...state, cards };
}

export function grade(state, id, g, now = new Date()) {
  if (!state.cards[id]) throw new Error(`unknown card ${id}`);
  return { ...state, cards: { ...state.cards, [id]: review(state.cards[id], g, now) } };
}

export function dueQueue(state, now = new Date(), limit = 50) {
  return Object.entries(state.cards)
    .filter(([, c]) => isDue(c, now))
    .sort(([, a], [, b]) => new Date(a.due) - new Date(b.due))
    .slice(0, limit)
    .map(([id]) => id);
}

export function shouldRepeat(card, now, timesSeen) {
  return timesSeen < 3 && new Date(card.due) - now < SOON_MS;
}

export function nextExtraWords(state, words, count) {
  if (count <= 0) return [];
  return words.filter((w) => !state.cards[w.id]).slice(0, count).map((w) => w.id);
}

export function introduceExtraWords(state, words, count, positionKey, now = new Date()) {
  if (count <= 0 || state.extraFor === positionKey) return state;
  return { ...introduce(state, nextExtraWords(state, words, count), now), extraFor: positionKey };
}

const randomId = (now) => `my-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function addMyPhrase(state, { lang, text, meaning, note = '' }, now = new Date(), makeId = () => randomId(now)) {
  if (!['nl', 'en'].includes(lang)) throw new Error('Choose Dutch or English.');
  if (!text?.trim() || !meaning?.trim()) throw new Error('Please fill in the phrase and its meaning.');
  const id = makeId();
  const phrase = { id, lang, text: text.trim(), meaning: meaning.trim(), note: note.trim(), created: now.toISOString() };
  return {
    state: { ...state, myPhrases: [...state.myPhrases, phrase], cards: { ...state.cards, [id]: newCard(now) } },
    id,
  };
}

export function deleteMyPhrase(state, id) {
  const { [id]: _removed, ...cards } = state.cards;
  return { ...state, myPhrases: state.myPhrases.filter((p) => p.id !== id), cards };
}

export function cardView(id, { chunkIndex, wordIndex, myPhrases }) {
  const c = chunkIndex[id];
  if (c) {
    return {
      id, kind: 'course', lang: c.lang, text: c.text, meaning: c.en, article: c.article ?? null,
      fa: c.fa ?? '', stress: c.stress ?? [], note: c.register === 'informal' ? 'informal' : '',
    };
  }
  const w = wordIndex[id];
  if (w) return { id, kind: 'word', lang: 'nl', text: w.text, meaning: w.en, article: w.article, fa: '', stress: [], note: w.example ?? '' };
  const p = myPhrases.find((x) => x.id === id);
  if (p) return { id, kind: 'mine', lang: p.lang, text: p.text, meaning: p.meaning, article: null, fa: '', stress: [], note: p.note };
  return null;
}
