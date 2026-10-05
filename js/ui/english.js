import { mount, h } from './dom.js';
import { speakable, sayItCheck, cardDetails, doneBar } from './widgets.js';
import { soundPanel } from './sound.js';
import { speakTask } from './speak.js';
import { introduce, cardView } from '../cards.js';

export function render(ctx, root) {
  const en = ctx.session.en;
  ctx.update((s) => introduce(s, en.newCards, new Date()));
  const phrases = en.newCards.map((id) => cardView(id, ctx.cardSources())).filter(Boolean);
  mount(root,
    h('h1', {}, `🇬🇧 English: ${en.theme}`),
    h('h2', {}, '1 · Sound of the week'),
    soundPanel(ctx, en.sound, 'en'),
    h('h2', {}, '2 · New phrases'),
    h('p', { class: 'hint' }, 'These phrases come back later in your cards.'),
    phrases.map((v) => h('div', { class: 'card' }, speakable(ctx, v.text, 'en', { big: true }), cardDetails(ctx, v), sayItCheck(ctx, v.text, 'en'))),
    h('h2', {}, en.diary ? '3 · Speaking diary: explain your course' : '3 · Speak'),
    speakTask(ctx, en.diary ?? en.speak, 'en'),
    doneBar(ctx, 'english'));
}
