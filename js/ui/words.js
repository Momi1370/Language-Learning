import { clear, mount, h, button, fa } from './dom.js';
import { speakable, say, sayItCheck } from './widgets.js';
import { ensureBatch, batchLeft, markKnown, teach, statusOf, searchVocab, wordsOf, newCount, settleBatch } from '../vocab.js';
import { TRACKS, TRACK_NAMES } from '../vocabtext.js';

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

  const track = ctx.state.settings.vocabTrack;
  const choose = (t) => { ctx.update((s) => ({ ...s, settings: { ...s.settings, vocabTrack: t } })); ctx.rerender(); };
  const switcher = h('div', { class: 'row', role: 'group', 'aria-label': 'Section' },
    TRACKS.map((t) => button(`${TRACK_NAMES[t]} · ${newCount(ctx.state, words, t)} new`, () => choose(t),
      { class: t === track ? 'chip primary' : 'chip', 'aria-pressed': String(t === track) })));
  const head = h('p', { class: 'muted' });
  const stage = h('div', {});
  let sorted = false; // the quick sort is offered once per visit, while nothing of today's batch is decided
  mount(root, h('h1', {}, '📚 Words'), switcher, head,
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
    if (!sorted && left.length === total && total > 1) return sortScreen(left);
    const w = ctx.vocabIndex[left[0]];
    mount(stage, wordPage(ctx, w, {
      actions: h('div', { class: 'vocab-actions' },
        button('I know it', () => decide((s) => markKnown(s, w.id))),
        button('Teach me', () => decide((s) => teach(s, w.id, new Date())), { class: 'primary' })),
    }));
  }

  // Tick the words that are new to you; everything you leave unticked counts as known.
  function sortScreen(left) {
    const ticked = new Set();
    const done = button('', () => { sorted = true; ctx.update((s) => settleBatch(s, [...ticked])); show(); window.scrollTo(0, 0); }, { class: 'primary wide' });
    const label = () => { done.textContent = ticked.size ? `Done — teach me ${ticked.size} ${ticked.size === 1 ? 'word' : 'words'}` : 'Done — I know all of these'; };
    label();
    mount(stage, h('div', { class: 'card' },
      h('p', {}, 'Tick the words that are ', h('b', {}, 'new to you'), '. The others count as known.'),
      left.map((id) => {
        const w = ctx.vocabIndex[id];
        const box = h('input', { type: 'checkbox', 'aria-label': `${w.word}: new to me`, onChange: (e) => { if (e.target.checked) ticked.add(id); else ticked.delete(id); label(); } });
        return h('label', { class: 'row sort-row' }, box, h('span', { class: 'sort-word', lang: 'en' }, w.word), h('span', { class: 'hint' }, w.pos),
          button('🔊', () => say(ctx, w.word, 'en', 1), { class: 'icon', 'aria-label': `Play ${w.word}` }));
      }),
      done,
      h('p', { class: 'hint' }, button('Go through them one by one instead', () => { sorted = true; show(); }, { class: 'chip' }))));
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
  const all = wordsOf(packs);
  let section = 'all';
  const results = h('div', {});
  const box = h('input', { type: 'search', placeholder: 'Search a word or its Farsi meaning', 'aria-label': 'Search words', onInput: list });
  const filter = h('div', { class: 'row', role: 'group', 'aria-label': 'Section' },
    ['all', ...TRACKS].map((t) => button(t === 'all' ? 'All' : TRACK_NAMES[t], (e) => {
      section = t;
      filter.querySelectorAll('button').forEach((b) => { const on = b === e.currentTarget; b.className = on ? 'chip primary' : 'chip'; b.setAttribute('aria-pressed', String(on)); });
      list();
    }, { class: t === 'all' ? 'chip primary' : 'chip', 'aria-pressed': String(t === 'all') })));
  mount(root, h('h1', {}, '📚 All words'), h('p', {}, h('a', { href: '#/words' }, '← Today’s words')), filter, box, results);
  list();

  function list() {
    const found = searchVocab(all.filter((w) => section === 'all' || w.track === section), box.value);
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
