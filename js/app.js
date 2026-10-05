import { createStore } from './store.js';
import { openDiary } from './diary.js';
import { getVoices, pickVoice } from './speech.js';
import { loadCourse, loadWords } from './content.js';
import { buildSession, finishSession } from './session.js';
import { indexChunks, indexWords } from './cards.js';
import { h, clear, button } from './ui/dom.js';
import { stopAllRecording } from './ui/widgets.js';
import * as today from './ui/today.js';
import * as cards from './ui/cards.js';
import * as sound from './ui/sound.js';
import * as shadow from './ui/shadow.js';
import * as limburg from './ui/limburg.js';
import * as speak from './ui/speak.js';
import * as grammar from './ui/grammar.js';
import * as english from './ui/english.js';
import * as roleplay from './ui/roleplay.js';
import * as progress from './ui/progress.js';
import * as settings from './ui/settings.js';

const root = document.getElementById('app');
let storage = null;
try { storage = window.localStorage; } catch { storage = null; }
const store = createStore(storage);

const routes = {
  today: today.render,
  progress: progress.render,
  settings: settings.render,
  roleplay: roleplay.render,
  'block/cards': cards.render,
  'block/sound': sound.render,
  'block/listen': (ctx, el) => (ctx.session.nl.shadow ? shadow.render(ctx, el) : limburg.render(ctx, el)),
  'block/speak': speak.render,
  'block/grammar': grammar.render,
  'block/english': english.render,
};
const NEEDS_SESSION = ['block/sound', 'block/listen', 'block/speak', 'block/grammar', 'block/english'];

const ctx = {
  state: store.load(),
  storageOk: store.available,
  session: null,
  course: null,
  loadError: null,
  chunkIndex: {},
  wordIndex: {},
  words: null,
  voices: { nl: null, en: null },
  allVoices: [],
  diary: null,
  update(fn) {
    ctx.state = fn(ctx.state);
    store.save(ctx.state);
  },
  go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  },
  rerender: () => render(),
  async reload() {
    await reloadCourse();
    await render();
  },
  markDone(block) {
    ctx.update((s) => (s.done.includes(block) ? s : { ...s, done: [...s.done, block] }));
    ctx.go('#/today');
  },
  async finishSession() {
    const before = ctx.state;
    ctx.update((s) => finishSession(s, new Date()));
    if (ctx.state === before) return; // not all blocks done, or a second tap
    await reloadCourse();
    ctx.go('#/today');
  },
  async getWords() {
    if (!ctx.words) {
      ctx.words = await loadWords();
      ctx.wordIndex = indexWords(ctx.words);
    }
    return ctx.words;
  },
  cardSources: () => ({ chunkIndex: ctx.chunkIndex, wordIndex: ctx.wordIndex, myPhrases: ctx.state.myPhrases }),
  pickVoices() {
    const s = ctx.state.settings;
    ctx.voices = { nl: pickVoice(ctx.allVoices, 'nl', s.voiceNl), en: pickVoice(ctx.allVoices, 'en', s.voiceEn) };
  },
};

async function reloadCourse() {
  ctx.course = await loadCourse(ctx.state.position.week);
  ctx.loadError = ctx.course.error;
  if (ctx.loadError) console.warn(ctx.loadError);
  ctx.chunkIndex = indexChunks(ctx.course.weeks);
  ctx.session = ctx.course.missing || ctx.loadError || ctx.state.finished
    ? null
    : buildSession(ctx.state.position, ctx.course.nl, ctx.course.en);
}

function errorPanel() {
  return h('div', { class: 'card' },
    h('h1', {}, 'Could not load the lessons'),
    h('p', {}, 'Check your internet connection and try again. If you installed the app, open it once while online.'),
    button('Try again', () => ctx.reload(), { class: 'primary' }),
    h('p', {}, h('a', { href: '#/block/cards' }, 'Review your cards'), ' · ', h('a', { href: '#/progress' }, 'Progress')));
}

function showPosition() {
  const { week, session } = ctx.state.position;
  document.getElementById('position').textContent = ctx.state.finished ? 'Course complete' : `Week ${week} · Session ${session}`;
}

async function render() {
  const route = location.hash.replace(/^#\/?/, '') || 'today';
  const view = routes[route] ?? routes.today;
  document.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === route));
  globalThis.speechSynthesis?.cancel?.();
  stopAllRecording();
  clear(root);
  try {
    showPosition();
    if (ctx.loadError && (route === 'today' || NEEDS_SESSION.includes(route))) {
      root.append(errorPanel());
    } else if (NEEDS_SESSION.includes(route) && !ctx.session) {
      ctx.go('#/today');
      return;
    } else {
      await view(ctx, root);
    }
  } catch (e) {
    console.warn(e);
    root.append(h('div', { class: 'card' }, h('p', {}, 'Something went wrong on this screen.'), button('Back to today', () => ctx.go('#/today'), { class: 'primary' })));
  }
  document.body.dataset.ready = route;
  window.scrollTo(0, 0);
}

async function boot() {
  ctx.diary = await openDiary();
  ctx.allVoices = await getVoices();
  ctx.pickVoices();
  globalThis.speechSynthesis?.addEventListener?.('voiceschanged', () => {
    ctx.allVoices = globalThis.speechSynthesis.getVoices();
    ctx.pickVoices();
  });
  await reloadCourse();
  window.addEventListener('hashchange', render);
  await render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
