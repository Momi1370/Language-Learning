import { mount, h, button } from './dom.js';
import { BLOCKS, blockLabel, streak, diaryId, TOTAL_WEEKS, SESSIONS_PER_WEEK } from '../session.js';
import { accentOf } from '../speech.js';

const card = (title, text) => h('div', { class: 'card' }, h('h1', {}, title), h('p', {}, text));
const cardsLink = () => h('a', { href: '#/block/cards', class: 'card link' }, '🃏 Review your cards →');

function voiceNotice(ctx) {
  const accent = accentOf(ctx.voices.nl);
  if (!accent) {
    return h('div', { class: 'warn' },
      h('p', {}, 'No Dutch voice found on this device, so audio will not play.'),
      h('p', { class: 'small' }, 'iPhone: Settings → Accessibility → Spoken Content → Voices → Dutch → Ellen.'),
      h('p', { class: 'small' }, 'Mac: System Settings → Accessibility → Spoken Content → System voice → Manage Voices → Dutch (Belgium) → Ellen.'));
  }
  if (accent === 'nl') return h('p', { class: 'hint' }, 'Using a Netherlands Dutch voice. Add “Ellen (Belgium)” in your device settings for a Flemish accent.');
  return null;
}

function missionCard(ctx, lang, text, check, week) {
  const key = diaryId(lang, week);
  const status = ctx.state.missions[key];
  const set = (value) => {
    ctx.update((s) => ({ ...s, missions: { ...s.missions, [key]: value } }));
    ctx.rerender();
  };
  return h('div', { class: 'card' },
    h('p', {}, `${lang === 'nl' ? '🇧🇪' : '🇬🇧'} 🎯 Mission this week: ${text}`),
    check ? h('div', {},
      button(status === 'done' ? 'Done ✓' : 'I did it', () => set('done'), { class: status === 'done' ? 'primary' : '' }),
      button('Not yet', () => set('notyet'), { class: status === 'notyet' ? 'primary' : '' })) : null,
    check && status === 'notyet' ? h('p', { class: 'hint' }, 'That is fine. Try it next week — it gets easier every time.') : null);
}

export function render(ctx, root) {
  const { state, session } = ctx;
  mount(root,
    h('p', { class: 'muted' }, `🔥 ${streak(state.history)}-day streak · ${state.history.length}/${TOTAL_WEEKS * SESSIONS_PER_WEEK} sessions`),
    ctx.storageOk ? null : h('p', { class: 'warn' }, 'This browser is not saving data (private mode?). Your progress will be lost when you close the page.'),
    voiceNotice(ctx),
  );
  if (state.finished) {
    mount(root, card('🎉 You finished all 12 weeks!', 'Keep reviewing your cards, and listen to your speaking diary in Progress.'), cardsLink());
    return;
  }
  if (!session) {
    mount(root, card(`Week ${state.position.week} is coming soon`, 'New lessons are being written. Keep reviewing your cards until then.'), cardsLink());
    return;
  }
  mount(root,
    h('h1', {}, `Week ${session.week} · Session ${session.session}`),
    h('p', { class: 'muted' }, `🇧🇪 ${session.nl.theme} — ${session.nl.themeEn}`),
    h('p', { class: 'muted' }, `🇬🇧 ${session.en.theme}`),
  );
  if (session.nl.mission.show || session.nl.mission.check) {
    mount(root,
      missionCard(ctx, 'nl', session.nl.mission.text, session.nl.mission.check, session.week),
      missionCard(ctx, 'en', session.en.mission.text, session.en.mission.check, session.week),
    );
  }
  const list = h('ol', { class: 'blocks' });
  for (const block of BLOCKS) {
    const label = blockLabel(block, session);
    const done = state.done.includes(block);
    list.append(h('li', {}, h('a', { href: `#/block/${block}`, class: `block${done ? ' done' : ''}` },
      h('span', { class: 'tick', 'aria-label': done ? 'done' : 'not done' }, done ? '✓' : ''),
      h('span', { class: 'title' }, `${label.flag} ${label.title}`),
      h('span', { class: 'min' }, `${label.minutes} min`))));
  }
  mount(root, list);
  if (session.last) mount(root, h('a', { href: '#/roleplay', class: 'card link' }, '🗣 This week’s role-plays (Claude voice mode) →'));
  const allDone = BLOCKS.every((b) => state.done.includes(b));
  mount(root, button(
    allDone ? 'Finish session ✓' : `Finish session (${state.done.length}/${BLOCKS.length} blocks done)`,
    (e) => { e.currentTarget.disabled = true; ctx.finishSession(); },
    { class: 'primary wide', disabled: !allDone },
  ));
}
