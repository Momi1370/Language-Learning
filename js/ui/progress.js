import { mount, h } from './dom.js';
import { isLearned } from '../srs.js';
import { streak } from '../session.js';
import { localDate } from '../session.js';
import { STAGE_LABELS, stageCounts, stageSummary, learnedSince, trickyIds } from '../learned.js';
import { stageLine } from './tracking.js';

const stat = (value, label) => h('div', { class: 'stat' }, h('b', {}, String(value)), label);

// One language's words: the ladder, what reached Learned lately, and the words that keep slipping.
function wordsBlock(ctx, lang, title) {
  const s = ctx.state;
  const counts = stageCounts(s, lang);
  const anyWords = Object.values(counts).some((n) => n > 0);
  if (!anyWords && lang !== 'en') return null;
  const ago = (days) => localDate(new Date(Date.now() - days * 86400000));
  const tricky = trickyIds(s, lang);
  const name = (id) => ctx.vocabIndex[id]?.word ?? id;
  return h('div', { class: 'card' },
    h('h3', {}, title),
    anyWords ? [h('p', {}, stageSummary(counts)), stageLine(s, lang)] : h('p', { class: 'muted' }, 'No words yet. Open the Words tab to start.'),
    h('p', { class: 'hint' }, `Reached ${STAGE_LABELS.learned}: ${learnedSince(s, lang, ago(6))} in the last 7 days · ${learnedSince(s, lang, ago(29))} in the last 30 days`),
    tricky.length ? [h('p', { class: 'label' }, 'Tricky words'), h('p', {}, tricky.map(name).join(' · '))] : null);
}

export async function render(ctx, root) {
  await ctx.getVocab();
  const s = ctx.state;
  const learned = Object.values(s.cards).filter(isLearned).length;
  const titles = Object.fromEntries((ctx.course?.weeks ?? []).map((w) => [w.sound.id, `${w.lang === 'nl' ? '🇧🇪' : '🇬🇧'} ${w.sound.title}`]));
  const ear = Object.entries(s.ear);
  mount(root,
    h('h1', {}, 'Progress'),
    h('div', { class: 'stats' },
      stat(s.history.length, 'sessions done'),
      stat(streak(s.history), 'day streak'),
      stat(learned, 'cards learned'),
      stat(s.myPhrases.length, 'my phrases')),
    h('h2', {}, '📚 Words'),
    wordsBlock(ctx, 'en', '🇬🇧 English'),
    wordsBlock(ctx, 'nl', '🇧🇪 Dutch'),
    h('h2', {}, '👂 Ear quiz'),
    ear.length
      ? h('ul', {}, ear.map(([id, r]) => h('li', {}, `${titles[id] ?? id}: ${Math.round((100 * r.right) / r.total)}% (${r.right}/${r.total})`)))
      : h('p', { class: 'muted' }, 'No ear quizzes yet.'),
    h('h2', {}, '📔 Speaking diary'));

  const entries = await ctx.diary.all();
  if (!entries.length) mount(root, h('p', { class: 'muted' }, 'Your first diary recordings happen in session 5 of week 1.'));
  for (const [lang, label] of [['nl', '🇧🇪 Dutch'], ['en', '🇬🇧 English']]) {
    const list = entries.filter((e) => e.id.startsWith(`${lang}-`));
    if (!list.length) continue;
    mount(root, h('h3', {}, label), list.map((e) => h('div', { class: 'diary-entry' },
      h('span', {}, `Week ${Number(e.id.slice(3))} · ${new Date(e.date).toLocaleDateString()}`),
      h('audio', { controls: true, preload: 'none', src: URL.createObjectURL(e.blob) }))));
  }
  if (!ctx.diary.persistent) mount(root, h('p', { class: 'warn' }, 'This browser cannot keep recordings after you close the page.'));
}
