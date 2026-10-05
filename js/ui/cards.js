import { clear, mount, h, button } from './dom.js';
import { speakable, sayItCheck, cardDetails, doneBar } from './widgets.js';
import { introduce, introduceExtraWords, grade, dueQueue, cardView, shouldRepeat, addMyPhrase, deleteMyPhrase } from '../cards.js';
import { Grade } from '../srs.js';

export async function render(ctx, root) {
  const now = new Date();
  if (ctx.session) {
    ctx.update((s) => introduce(s, ctx.session.nl.newCards, now));
    if (ctx.state.settings.extraWords > 0) {
      const words = await ctx.getWords();
      const key = `${ctx.session.week}-${ctx.session.session}`;
      ctx.update((s) => introduceExtraWords(s, words, s.settings.extraWords, key, now));
    }
  }
  if (Object.keys(ctx.state.cards).some((id) => id.startsWith('w-'))) await ctx.getWords();

  const queue = dueQueue(ctx.state, now);
  const seen = {};
  const stage = h('div', {});
  mount(root, h('h1', {}, '🃏 Cards'), h('p', { class: 'muted' }, `${queue.length} card${queue.length === 1 ? '' : 's'} to review`), stage, myPhrases(ctx), doneBar(ctx, 'cards'));
  next();

  function next() {
    let id = null;
    let view = null;
    while (queue.length && !view) {
      id = queue.shift();
      view = cardView(id, ctx.cardSources());
    }
    if (!view) {
      mount(clear(stage), h('div', { class: 'card' }, h('p', {}, '✓ No more cards for now. Well done!')));
      return;
    }
    seen[id] = (seen[id] ?? 0) + 1;
    mount(clear(stage), ctx.state.cards[id].reps === 0 ? newCard(id, view) : reviewCard(id, view));
  }

  function onGrade(id, g) {
    ctx.update((s) => grade(s, id, g, new Date()));
    if (shouldRepeat(ctx.state.cards[id], new Date(), seen[id])) queue.push(id);
    next();
  }

  function newCard(id, view) {
    return h('div', { class: `card ${view.article ?? ''}` },
      h('p', { class: 'label' }, view.lang === 'nl' ? 'New · Dutch' : 'New · English'),
      speakable(ctx, view.text, view.lang, { big: true }),
      cardDetails(ctx, view),
      sayItCheck(ctx, view.text, view.lang),
      button('Got it →', () => onGrade(id, Grade.Good), { class: 'primary' }));
  }

  function reviewCard(id, view) {
    const answer = h('div', { hidden: true },
      speakable(ctx, view.text, view.lang, { big: true }),
      view.stress.length ? h('p', { class: 'stress' }, 'Stress: ', view.stress.join(' · ')) : null,
      sayItCheck(ctx, view.text, view.lang),
      h('p', { class: 'label' }, 'How well did you know it?'),
      h('div', {},
        button('Again', () => onGrade(id, Grade.Again)),
        button('Hard', () => onGrade(id, Grade.Hard)),
        button('Good', () => onGrade(id, Grade.Good), { class: 'primary' }),
        button('Easy', () => onGrade(id, Grade.Easy))));
    const show = button('Show', () => { answer.hidden = false; show.remove(); }, { class: 'primary' });
    return h('div', { class: `card ${view.article ?? ''}` },
      h('p', { class: 'label' }, `Say it in ${view.lang === 'nl' ? 'Dutch' : 'English'}`),
      h('p', { class: 'meaning' }, view.meaning),
      ctx.state.settings.farsi && view.fa ? h('p', { class: 'fa', dir: 'rtl', lang: 'fa' }, view.fa) : null,
      show, answer);
  }
}

function myPhrases(ctx) {
  const msg = h('p', { class: 'hint' });
  const lang = h('select', { name: 'lang' }, h('option', { value: 'nl' }, 'Dutch'), h('option', { value: 'en' }, 'English'));
  const text = h('input', { name: 'text', placeholder: 'Phrase, e.g. give or take', autocomplete: 'off' });
  const meaning = h('input', { name: 'meaning', placeholder: 'Meaning, e.g. more or less', autocomplete: 'off' });
  const note = h('input', { name: 'note', placeholder: 'Where did you hear it? (optional)', autocomplete: 'off' });
  const list = h('ul', {});
  const drawList = () => mount(clear(list), ...ctx.state.myPhrases.map((p) => h('li', {},
    `${p.lang === 'nl' ? '🇧🇪' : '🇬🇧'} ${p.text} — ${p.meaning} `,
    button('Delete', () => {
      if (!confirm(`Delete “${p.text}”?`)) return;
      ctx.update((s) => deleteMyPhrase(s, p.id));
      drawList();
    }, { class: 'chip' }))));
  const form = h('form', { class: 'stack', onSubmit: (e) => {
    e.preventDefault();
    try {
      const result = addMyPhrase(ctx.state, { lang: lang.value, text: text.value, meaning: meaning.value, note: note.value });
      ctx.update(() => result.state);
      text.value = meaning.value = note.value = '';
      msg.textContent = 'Added ✓ It will show up in your cards.';
      drawList();
    } catch (err) {
      msg.textContent = err.message;
    }
  } }, lang, text, meaning, note, h('button', { type: 'submit', class: 'primary' }, 'Save phrase'), msg);
  drawList();
  return h('details', { class: 'card' },
    h('summary', {}, '＋ Add my phrase (from a film, game, class or colleague)'),
    form, h('h3', {}, 'My phrases'), list);
}
