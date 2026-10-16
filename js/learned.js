import { localDate } from './session.js';
import { teach } from './vocab.js';

// How well a word is remembered, read from its spaced-repetition card (stability = days until the chance of
// remembering falls to 90 %). Nothing is stored for it, so a forgotten word moves back down by itself.
export const FAMILIAR_DAYS = 7;
export const LEARNED_DAYS = 21;
export const LEARNED_REPS = 3;
export const STAGES = ['learning', 'familiar', 'learned', 'claimed', 'confirmed'];

export const langOfId = (id) => (/^d-\d{4}$/.test(id) ? 'nl' : /^v-\d{4}$/.test(id) ? 'en' : null);

export function stageOf(state, id) {
  const card = state.cards[id];
  if (card) {
    const days = Number.isFinite(card.stability) ? card.stability : 0;
    if ((card.reps ?? 0) >= LEARNED_REPS && days >= LEARNED_DAYS) return 'learned';
    if ((card.reps ?? 0) > 0 && days >= FAMILIAR_DAYS) return 'familiar';
    return 'learning';
  }
  if (state.vocab.checked.includes(id)) return 'confirmed';
  if (state.vocab.known.includes(id)) return 'claimed';
  return 'new';
}

export function stageCounts(state, lang) {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0]));
  const ids = new Set([...Object.keys(state.cards), ...state.vocab.known]);
  for (const id of ids) {
    if (langOfId(id) !== lang) continue;
    const stage = stageOf(state, id);
    if (stage in counts) counts[stage]++;
  }
  return counts;
}

export function noteLearned(state, id, now = new Date(), date = localDate(now)) {
  if (stageOf(state, id) !== 'learned' || state.vocab.learnedOn[id]) return state;
  return { ...state, vocab: { ...state.vocab, learnedOn: { ...state.vocab.learnedOn, [id]: date } } };
}

// Cards that were already learned before the dates were kept: dated by their last review.
export function backfillLearned(state, now = new Date()) {
  return Object.keys(state.cards).filter(langOfId).reduce((s, id) => {
    const last = state.cards[id].last_review;
    return noteLearned(s, id, now, last ? localDate(new Date(last)) : localDate(now));
  }, state);
}

export function learnedSince(state, lang, fromDate) {
  return Object.entries(state.vocab.learnedOn).filter(([id, date]) => langOfId(id) === lang && date >= fromDate).length;
}

export function trickyIds(state, lang, limit = 10) {
  return Object.entries(state.cards)
    .filter(([id, c]) => langOfId(id) === lang && (c.lapses ?? 0) >= 2)
    .sort(([, a], [, b]) => b.lapses - a.lapses)
    .slice(0, limit)
    .map(([id]) => id);
}

const dayNumber = (now) => Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);

// Up to `count` words you said you know, to be checked once a day. Different days start at different words.
export function pickSpotCheck(state, lang, now = new Date(), count = 3) {
  if (state.vocab.checkDay[lang] === localDate(now)) return [];
  const claimed = state.vocab.known.filter((id) => langOfId(id) === lang && !state.vocab.checked.includes(id));
  if (claimed.length <= count) return claimed;
  const start = (dayNumber(now) * count) % claimed.length;
  return Array.from({ length: count }, (_, i) => claimed[(start + i) % claimed.length]);
}

export function resolveSpotCheck(state, id, knew, now = new Date()) {
  if (!knew) return teach(state, id, now);
  if (state.vocab.checked.includes(id)) return state;
  return { ...state, vocab: { ...state.vocab, checked: [...state.vocab.checked, id] } };
}

export function finishSpotCheck(state, lang, now = new Date()) {
  return { ...state, vocab: { ...state.vocab, checkDay: { ...state.vocab.checkDay, [lang]: localDate(now) } } };
}

export const STAGE_LABELS = { learned: 'Learned', familiar: 'Familiar', learning: 'Learning', confirmed: 'Confirmed', claimed: 'Claimed', new: 'New' };
const SUMMARY_ORDER = ['learned', 'familiar', 'learning', 'confirmed', 'claimed'];

// "8 learned · 14 familiar · 22 learning · 30 claimed": the stages that have words.
export const stageSummary = (counts) => SUMMARY_ORDER.filter((s) => counts[s] > 0).map((s) => `${counts[s]} ${s}`).join(' · ');

// The parts of the thin bar: each stage's share of all the words counted.
export function stageShares(counts) {
  const total = SUMMARY_ORDER.reduce((n, s) => n + counts[s], 0);
  return total ? SUMMARY_ORDER.filter((s) => counts[s] > 0).map((stage) => ({ stage, share: counts[stage] / total })) : [];
}
