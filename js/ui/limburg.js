import { mount, h } from './dom.js';
import { speakable, doneBar } from './widgets.js';

export function render(ctx, root) {
  mount(root,
    h('h1', {}, '🇧🇪 Limburg ear'),
    h('p', { class: 'muted' }, 'You will hear these forms from colleagues. Understand them, but practise speaking the standard form.'),
    ctx.session.nl.limburg.map((p) => h('div', { class: 'card' },
      h('p', { class: 'label' }, 'Standard'),
      speakable(ctx, p.standard, 'nl'),
      h('p', { class: 'label' }, 'Everyday (Flemish / Limburg)'),
      h('p', { class: 'everyday' }, p.everyday),
      h('p', { class: 'hint' }, p.note))),
    h('p', { class: 'hint' }, 'The app voice cannot say the everyday forms correctly, so they are shown as text only. Listen for them at work!'),
    doneBar(ctx, 'listen'));
}
