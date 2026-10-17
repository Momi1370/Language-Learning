import { clear, mount, h, button, fa } from './dom.js';
import { speakable, say, sayItCheck } from './widgets.js';
import { ensureBatch, batchOf, batchLeft, markKnown, teach, statusOf, searchVocab, wordsOf, newCount, settleBatch } from '../vocab.js';
import { TRACKS, TRACK_NAMES } from '../vocabtext.js';
import { stageOf, STAGE_LABELS } from '../learned.js';
import { stageLine, quickCheck } from './tracking.js';

const TENSE_LABELS = { past: 'Past · گذشته', present: 'Present · حال', future: 'Future · آینده' };

// One word: pronunciation, Farsi meaning and note, and the examples. Used here and in Cards.
export function wordPage(ctx, w, { actions = null } = {}) {
  const farsi = ctx.state.settings.farsi;
  const lang = w.lang ?? 'en';
  return h('div', { class: 'card vocab' },
    h('div', { class: 'speakable-row' },
      h('p', { class: 'vocab-word', lang }, w.word),
      h('span', { class: 'audio-buttons' },
        button('🔊', () => say(ctx, w.word, lang, 1), { class: 'icon', 'aria-label': 'Play the word' }),
        button('🐢', () => say(ctx, w.word, lang, 0.7), { class: 'icon', 'aria-label': 'Play the word slowly' }))),
    w.en ? h('p', { class: 'gloss', lang: 'en' }, w.en) : null,
    h('p', { class: 'hint' }, `${w.pos}${w.register ? ` · ${w.register}` : ''}`),
    h('p', { class: 'ipa' }, `/${w.ipa}/ `, h('span', { class: 'hint' }, lang === 'nl' ? 'Standard Dutch' : 'American English')),
    h('p', { class: 'stress' }, 'Stress: ', w.stress.join(' · ')),
    fa(w.fa.meaning),
    farsi ? fa(w.fa.note) : null,
    w.morph ? h('div', { class: 'forms' },
      h('p', { class: 'label' }, 'Word forms ', h('span', { dir: 'rtl', lang: 'fa' }, '(شکل‌های کلمه)')),
      h('dl', {}, w.morph.map(([label, text]) => [h('dt', {}, label), h('dd', { lang }, text)]))) : null,
    w.examples.map((ex, i) => h('div', { class: 'example' },
      ex.tense ? h('p', { class: 'tense-tag' }, TENSE_LABELS[ex.tense]) : null,
      speakable(ctx, ex.text, lang),
      farsi ? fa(ex.fa) : null,
      farsi && ex.grammar ? h('p', { class: 'grammar', dir: 'rtl', lang: 'fa' }, ex.grammar) : null,
      i === 0 ? sayItCheck(ctx, ex.text, lang) : null)),
    actions);
}

const LANG_UI = {
  en: { title: 'Words', listTitle: 'All English words', home: '#/words', list: '#/words/list', section: null, noVoice: 'No English voice found on this device, so 🔊 will not play. iPhone: Settings → Accessibility → Spoken Content → Voices → English.' },
  nl: { title: 'Words', listTitle: 'All Dutch words', home: '#/woorden', list: '#/woorden/list', section: 'nl-everyday', noVoice: 'No Dutch voice found on this device, so 🔊 may not play. iPhone: Settings → Accessibility → Spoken Content → Voices → Dutch.' },
};

function loadFailed(ctx, root, tab) {
  mount(root, h('h1', {}, tab.title),
    h('div', { class: 'card' },
      h('p', {}, 'Could not load the words.'),
      h('p', { class: 'hint' }, 'Check your internet connection. If you installed the app, open it once while online.'),
      button('Try again', () => ctx.rerender(), { class: 'primary' })));
}

// #/words shows the language you used last; #/woorden is the Dutch one and makes it the remembered one.
export const render = (ctx, root) => renderTab(ctx, root, ctx.state.settings.wordsLang);
export const renderNl = (ctx, root) => { setLang(ctx, 'nl'); return renderTab(ctx, root, 'nl'); };
export const renderList = (ctx, root) => renderListFor(ctx, root, ctx.state.settings.wordsLang);
export const renderListNl = (ctx, root) => { setLang(ctx, 'nl'); return renderListFor(ctx, root, 'nl'); };

function setLang(ctx, lang) {
  if (ctx.state.settings.wordsLang !== lang) ctx.update((s) => ({ ...s, settings: { ...s.settings, wordsLang: lang } }));
}

// Dutch | English: one switch on top of the Words tab (it remembers the choice).
function langSwitch(ctx, lang) {
  const pick = (l) => { setLang(ctx, l); ctx.go('#/words'); };
  return h('div', { class: 'seg', role: 'group', 'aria-label': 'Language' },
    [['nl', 'Dutch · Woorden'], ['en', 'English · Words']].map(([l, text]) =>
      button(text, () => pick(l), { class: l === lang ? 'on' : '', 'aria-pressed': String(l === lang) })));
}

async function renderTab(ctx, root, lang) {
  const tab = LANG_UI[lang];
  const { packs, error } = await ctx.getVocab();
  if (error && !packs.length) return loadFailed(ctx, root, tab);
  const words = wordsOf(packs);
  const section = () => tab.section ?? ctx.state.settings.vocabTrack;
  ctx.update((s) => ensureBatch(s, words, new Date(), section()));

  const track = ctx.state.settings.vocabTrack;
  const choose = (t) => { ctx.update((s) => ({ ...s, settings: { ...s.settings, vocabTrack: t } })); ctx.rerender(); };
  const switcher = lang === 'en' ? h('div', { class: 'row', role: 'group', 'aria-label': 'Section' },
    TRACKS.map((t) => button(`${TRACK_NAMES[t]} · ${newCount(ctx.state, words, t)} new`, () => choose(t),
      { class: t === track ? 'chip primary' : 'chip', 'aria-pressed': String(t === track) }))) : null;
  const today = h('div', { class: 'card today-card' });
  const quick = quickCheck(ctx, lang);
  const stage = h('div', {});
  let sorted = false; // the quick sort is offered once per visit, while nothing of today's batch is decided
  mount(root, h('h1', {}, tab.title), langSwitch(ctx, lang), switcher, today, quick,
    ctx.voices[lang] ? null : h('p', { class: 'warn' }, tab.noVoice),
    stage,
    error ? h('p', { class: 'hint' }, 'Some words could not be loaded.') : null,
    h('p', {}, h('a', { href: tab.list }, 'All words →')));
  show();

  function fillToday(total, done) {
    const line = stageLine(ctx.state, lang);
    today.hidden = !total && !line;
    mount(clear(today),
      total ? [
        h('div', { class: 'today-head' }, h('b', {}, 'Today'), h('span', { class: 'muted' }, `${done} of ${total} words done`)),
        h('div', { class: 'today-bar', role: 'img', 'aria-label': `${done} of ${total} words done` }, h('span', { style: `width: ${Math.round((100 * done) / total)}%` })),
      ] : null,
      line);
  }

  function show() {
    const total = batchOf(ctx.state, section()).filter((id) => ctx.vocabIndex[id]).length;
    const left = batchLeft(ctx.state, section()).filter((id) => ctx.vocabIndex[id]);
    fillToday(total, total - left.length);
    clear(stage);
    if (!total) return mount(stage, h('div', { class: 'card' }, h('p', {}, 'More words are coming soon.')));
    if (!left.length) return mount(stage, h('div', { class: 'card' }, h('p', {}, '✓ Today’s words are finished.'), h('p', {}, h('a', { href: tab.list }, 'See all words →'))));
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
    const done = button('', () => { sorted = true; ctx.update((s) => settleBatch(s, [...ticked], section())); show(); window.scrollTo(0, 0); }, { class: 'primary wide' });
    const label = () => { done.textContent = ticked.size ? `Done — teach me ${ticked.size} ${ticked.size === 1 ? 'word' : 'words'}` : 'Done — I know all of these'; };
    label();
    mount(stage, h('div', { class: 'card' },
      h('p', {}, 'Tick the words that are ', h('b', {}, 'new to you'), '. The others count as known.'),
      left.map((id) => {
        const w = ctx.vocabIndex[id];
        const box = h('input', { type: 'checkbox', 'aria-label': `${w.word}: new to me`, onChange: (e) => { if (e.target.checked) ticked.add(id); else ticked.delete(id); label(); } });
        return h('label', { class: 'row sort-row' }, box, h('span', { class: 'sort-word', lang }, w.word), h('span', { class: 'hint' }, w.pos),
          button('🔊', () => say(ctx, w.word, lang, 1), { class: 'icon', 'aria-label': `Play ${w.word}` }));
      }),
      ),
      h('div', { class: 'sticky-action' }, done),
      h('p', { class: 'hint' }, button('Go through them one by one instead', () => { sorted = true; show(); }, { class: 'chip' })));
  }

  function decide(change) {
    ctx.update(change);
    show();
    window.scrollTo(0, 0);
  }
}

async function renderListFor(ctx, root, lang) {
  const tab = LANG_UI[lang];
  const { packs, error } = await ctx.getVocab();
  const all = wordsOf(packs).filter((w) => w.lang === lang);
  let section = 'all';
  let stageFilter = 'all';
  const results = h('div', {});
  const box = h('input', { type: 'search', placeholder: 'Search a word, its English or its Farsi meaning', 'aria-label': 'Search words', onInput: list });
  const chips = (label, options, onPick) => {
    const row = h('div', { class: 'row', role: 'group', 'aria-label': label },
      options.map(([value, text]) => button(text, (e) => {
        row.querySelectorAll('button').forEach((b) => { const on = b === e.currentTarget; b.className = on ? 'chip primary' : 'chip'; b.setAttribute('aria-pressed', String(on)); });
        onPick(value);
        list();
      }, { class: value === 'all' ? 'chip primary' : 'chip', 'aria-pressed': String(value === 'all') })));
    return row;
  };
  const filter = lang === 'en' ? chips('Section', [['all', 'All'], ...TRACKS.map((t) => [t, TRACK_NAMES[t]])], (v) => { section = v; }) : null;
  const stages = chips('Stage', [['all', 'Any stage'], ...['new', 'learning', 'familiar', 'learned', 'claimed', 'confirmed'].map((x) => [x, STAGE_LABELS[x]])], (v) => { stageFilter = v; });
  mount(root, h('h1', {}, tab.listTitle), h('p', {}, h('a', { href: tab.home }, '← Today’s words')), filter, stages, box, results);
  list();

  function list() {
    const found = searchVocab(all.filter((w) => (section === 'all' || w.track === section) && (stageFilter === 'all' || stageOf(ctx.state, w.id) === stageFilter)), box.value);
    mount(clear(results), found.length ? found.map(row) : h('p', { class: 'muted' }, error ? 'Could not load the words.' : 'No words found.'));
  }

  // The word page is built only when a row is opened (120 pages at once would be slow).
  function row(w) {
    const status = statusOf(ctx.state, w.id);
    const details = h('details', {}, h('summary', {}, `${w.word} · ${w.fa.meaning} · ${STAGE_LABELS[stageOf(ctx.state, w.id)]}`));
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
