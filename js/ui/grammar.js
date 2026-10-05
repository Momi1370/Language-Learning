import { mount, h, button, fa } from './dom.js';
import { speakable, sayItCheck, doneBar } from './widgets.js';

export function render(ctx, root) {
  const g = ctx.session.nl.grammar;
  const intro = h('div', { class: 'card' }, h('h2', {}, g.title), h('p', {}, g.explain), ctx.state.settings.farsi ? fa(g.fa) : null);
  mount(root,
    h('h1', {}, `🇧🇪 Grammar${g.review ? ' review' : ''}: ${g.title}`),
    g.intro ? intro : h('details', {}, h('summary', {}, 'Show the explanation'), intro),
    h('p', { class: 'muted' }, 'Say the full sentence out loud first. Then tap Show.'),
    g.items.map((item, n) => {
      const answer = h('div', { hidden: true }, speakable(ctx, item.answer, 'nl'), sayItCheck(ctx, item.answer, 'nl'));
      const show = button('Show', () => { answer.hidden = false; show.remove(); });
      return h('div', { class: 'card' }, h('p', {}, `${n + 1}. ${item.prompt}`), show, answer);
    }),
    doneBar(ctx, 'grammar'));
}
