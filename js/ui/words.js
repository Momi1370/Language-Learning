import { clear, mount, h, button, fa } from './dom.js';
import { speakable, say, sayItCheck } from './widgets.js';
import { ensureBatch, batchLeft, markKnown, teach, statusOf, searchVocab, wordsOf } from '../vocab.js';

// One word: pronunciation, Farsi meaning and note, and the examples. Used here and in Cards.
export function wordPage(ctx, w, { actions = null } = {}) {
  const farsi = ctx.state.settings.farsi;
  return h('div', { class: 'card vocab' },
    h('div', { class: 'speakable-row' },
      h('p', { class: 'vocab-word', lang: 'en' }, w.word),
      h('span', { class: 'audio-buttons' },
        button('🔊', () => say(ctx, w.word, 'en', 1), { class: 'icon', 'aria-label': 'Play the word' }),
        button('🐢', () => say(ctx, w.word, 'en', 0.7), { class: 'icon', 'aria-label': 'Play the word slowly' }))),
    h('p', { class: 'hint' }, `${w.pos}${w.register ? ` · ${w.register}` : ''}`),
    h('p', { class: 'ipa' }, `/${w.ipa}/ `, h('span', { class: 'hint' }, 'American English')),
    h('p', { class: 'stress' }, 'Stress: ', w.stress.join(' · ')),
    fa(w.fa.meaning),
    farsi ? fa(w.fa.note) : null,
    w.examples.map((ex, i) => h('div', { class: 'example' },
      speakable(ctx, ex.text, 'en'),
      farsi ? fa(ex.fa) : null,
      i === 0 ? sayItCheck(ctx, ex.text, 'en') : null)),
    actions);
}

function loadFailed(ctx, root) {
  mount(root, h('h1', {}, '📚 Words'),
    h('div', { class: 'card' },
      h('p', {}, 'Could not load the words.'),
      h('p', { class: 'hint' }, 'Check your internet connection. If you installed the app, open it once while online.'),
      button('Try again', () => ctx.rerender(), { class: 'primary' })));
}

export async function render(ctx, root) {
  const { packs, error } = await ctx.getVocab();
  if (error && !packs.length) return loadFailed(ctx, root);
  const words = wordsOf(packs);
  ctx.update((s) => ensureBatch(s, words, new Date()));

  const head = h('p', { class: 'muted' });
  const stage = h('div', {});
  mount(root, h('h1', {}, '📚 Words'), head,
    ctx.voices.en ? null : h('p', { class: 'warn' }, 'No English voice found on this device, so 🔊 will not play. iPhone: Settings → Accessibility → Spoken Content → Voices → English.'),
    stage,
    error ? h('p', { class: 'hint' }, 'Some words could not be loaded.') : null,
    h('p', {}, h('a', { href: '#/words/list' }, 'All words →')));
  show();

  function show() {
    const total = ctx.state.vocab.day.ids.filter((id) => ctx.vocabIndex[id]).length;
    const left = batchLeft(ctx.state).filter((id) => ctx.vocabIndex[id]);
    head.textContent = total ? `Today: ${total - left.length} of ${total} words done` : '';
    clear(stage);
    if (!total) return mount(stage, h('div', { class: 'card' }, h('p', {}, 'More words are coming soon.')));
    if (!left.length) return mount(stage, h('div', { class: 'card' }, h('p', {}, '✓ Today’s words are finished.'), h('p', {}, h('a', { href: '#/words/list' }, 'See all words →'))));
    const w = ctx.vocabIndex[left[0]];
    mount(stage, wordPage(ctx, w, {
      actions: h('div', { class: 'vocab-actions' },
        button('I know it', () => decide((s) => markKnown(s, w.id))),
        button('Teach me', () => decide((s) => teach(s, w.id, new Date())), { class: 'primary' })),
    }));
  }

  function decide(change) {
    ctx.update(change);
    show();
    window.scrollTo(0, 0);
  }
}

const STATUS = { new: 'new', known: 'known', learning: 'learning' };

export async function renderList(ctx, root) {
  const { packs, error } = await ctx.getVocab();
  const words = wordsOf(packs);
  const results = h('div', {});
  const box = h('input', { type: 'search', placeholder: 'Search a word or its Farsi meaning', 'aria-label': 'Search words', onInput: list });
  mount(root, h('h1', {}, '📚 All words'), h('p', {}, h('a', { href: '#/words' }, '← Today’s words')), box, results);
  list();

  function list() {
    const found = searchVocab(words, box.value);
    mount(clear(results), found.length ? found.map(row) : h('p', { class: 'muted' }, error ? 'Could not load the words.' : 'No words found.'));
  }

  // The word page is built only when a row is opened (120 pages at once would be slow).
  function row(w) {
    const status = statusOf(ctx.state, w.id);
    const details = h('details', {}, h('summary', {}, `${w.word} · ${w.fa.meaning} · ${STATUS[status]}`));
    details.addEventListener('toggle', () => {
      if (!details.open || details.dataset.built) return;
      details.dataset.built = '1';
      const again = () => { ctx.update((s) => teach(s, w.id, new Date())); ctx.rerender(); };
      const actions = status === 'learning' ? null : h('div', { class: 'vocab-actions' },
        status === 'new' ? button('I know it', () => { ctx.update((s) => markKnown(s, w.id)); ctx.rerender(); }) : null,
        button('Teach me', again, { class: 'primary' }));
      details.append(wordPage(ctx, w, { actions }));
    });
    return details;
  }
}
