import { introduce } from './cards.js';
import { localDate } from './session.js';

export const VOCAB_REVIEW_CAP = 10;

export const isVocabId = (id) => /^v-\d{4}$/.test(id);
export const wordsOf = (packs) => packs.flatMap((p) => p.words);
export const indexVocab = (packs) => Object.fromEntries(wordsOf(packs).map((w) => [w.id, w]));

export function statusOf(state, id) {
  if (state.cards[id]) return 'learning';
  if (state.vocab.known.includes(id)) return 'known';
  return 'new';
}

// The day's batch: the next N undecided words, kept for the whole calendar day.
// With no words loaded nothing is stored, so a failed load cannot use up the day.
export function ensureBatch(state, words, now = new Date()) {
  const date = localDate(now);
  if (state.vocab.day.date === date || !words.length) return state;
  const ids = words.filter((w) => statusOf(state, w.id) === 'new').slice(0, state.settings.vocabPerDay).map((w) => w.id);
  return { ...state, vocab: { ...state.vocab, day: { date, ids } } };
}

export const batchLeft = (state) => state.vocab.day.ids.filter((id) => statusOf(state, id) === 'new');

export function markKnown(state, id) {
  if (state.cards[id] || state.vocab.known.includes(id)) return state;
  return { ...state, vocab: { ...state.vocab, known: [...state.vocab.known, id] } };
}

export function teach(state, id, now = new Date()) {
  const s = introduce(state, [id], now);
  return { ...s, vocab: { ...s.vocab, known: s.vocab.known.filter((k) => k !== id) } };
}

export function searchVocab(words, query) {
  const q = query.trim().toLowerCase();
  if (!q) return words;
  return words.filter((w) => w.word.toLowerCase().includes(q) || w.fa.meaning.includes(q));
}

export function vocabCounts(state) {
  return { learning: Object.keys(state.cards).filter(isVocabId).length, known: state.vocab.known.length };
}

// The date is part of the key: when the course position does not move (a week not written yet,
// or a finished course) the allowance must still start again each day.
export const reviewKey = (position, now = new Date()) => `${position.week}-${position.session}-${localDate(now)}`;

export function reviewsLeft(state, key) {
  const r = state.vocab.reviews;
  return Math.max(0, VOCAB_REVIEW_CAP - (r.key === key ? r.count : 0));
}

// Keeps at most the session's remaining allowance of vocabulary REVIEWS (oldest due first). Other cards
// stay, and so do words shown for the first time and cards in `exempt` (a new word's repeat), so new
// words are never pushed out by old reviews.
export function capQueue(queue, state, key, exempt = new Set()) {
  let left = reviewsLeft(state, key);
  return queue.filter((id) => !isVocabId(id) || exempt.has(id) || (state.cards[id]?.reps ?? 0) === 0 || left-- > 0);
}

export function countReview(state, key) {
  const r = state.vocab.reviews;
  return { ...state, vocab: { ...state.vocab, reviews: { key, count: (r.key === key ? r.count : 0) + 1 } } };
}
