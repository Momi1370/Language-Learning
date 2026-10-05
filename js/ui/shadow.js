import { clear, mount, h, button } from './dom.js';
import { speakable, sayItCheck, recorder, compare, say, doneBar } from './widgets.js';

export function render(ctx, root) {
  const d = ctx.session.nl.shadow;
  let i = 0;
  const stage = h('div', { class: 'card' });
  const playAll = async () => { for (const line of d.lines) await say(ctx, line.text, 'nl', 0.9); };
  mount(root,
    h('h1', {}, `🇧🇪 ${d.title}`),
    h('p', { class: 'muted' }, 'For each line: listen → repeat out loud → record → compare.'),
    button('▶ Play the whole dialogue', playAll),
    stage,
    doneBar(ctx, 'listen'));
  show();

  function show() {
    const line = d.lines[i];
    const rec = recorder(ctx);
    mount(clear(stage),
      h('p', { class: 'muted' }, `Line ${i + 1} of ${d.lines.length} · ${line.speaker}`),
      speakable(ctx, line.text, 'nl', { big: true }),
      h('details', {}, h('summary', {}, 'Meaning'), h('p', {}, line.en)),
      rec.el,
      button('⇄ Compare: original, then me', () => compare(ctx, line.text, 'nl', rec.blob)),
      sayItCheck(ctx, line.text, 'nl'),
      h('div', { class: 'nav-row' },
        button('← Back', () => { i -= 1; show(); }, { disabled: i === 0 }),
        button(i === d.lines.length - 1 ? 'From the top ↺' : 'Next line →', () => { i = (i + 1) % d.lines.length; show(); }, { class: 'primary' })));
  }
}
