import { mount, h, button } from './dom.js';

function promptCard(flag, rp) {
  const area = h('textarea', { readonly: true, rows: 9 }, rp.prompt);
  const msg = h('span', { class: 'ok-text' });
  return h('section', { class: 'card' },
    h('h2', {}, `${flag} ${rp.title}`),
    area,
    button('📋 Copy prompt', async () => {
      try {
        await navigator.clipboard.writeText(rp.prompt);
        msg.textContent = 'Copied ✓';
      } catch {
        area.select();
        msg.textContent = 'Select all and copy.';
      }
    }, { class: 'primary' }),
    msg);
}

export function render(ctx, root) {
  const s = ctx.session;
  mount(root,
    h('h1', {}, '🗣 Role-play'),
    h('p', {}, 'Copy a prompt, open the Claude app, start voice mode, paste the prompt and talk for about 10 minutes.'),
    h('p', { class: 'hint' }, 'Voice assistants mostly hear text, so they are great for fluency and confidence, but not for judging single sounds. Use the 🎯 check in this app for that.'),
    s?.last ? [promptCard('🇧🇪', s.nl.roleplay), promptCard('🇬🇧', s.en.roleplay)] : h('p', { class: 'muted' }, 'Role-plays open in session 5 of each week.'),
    h('a', { href: '#/today', class: 'button' }, '← Back to today'));
}
