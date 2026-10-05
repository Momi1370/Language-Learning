import { mount, h } from './dom.js';
import { isLearned } from '../srs.js';
import { streak } from '../session.js';

const stat = (value, label) => h('div', { class: 'stat' }, h('b', {}, String(value)), label);

export async function render(ctx, root) {
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
