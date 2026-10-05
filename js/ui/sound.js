import { clear, mount, h, button, fa } from './dom.js';
import { speakable, sayItCheck, doneBar, RECOG } from './widgets.js';
import { speak, voicesFor } from '../speech.js';

const ROUNDS = 8;
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

export function render(ctx, root) {
  mount(root, h('h1', {}, '🇧🇪 Sound of the week'), soundPanel(ctx, ctx.session.nl.sound, 'nl'), doneBar(ctx, 'sound'));
}

export function soundPanel(ctx, sound, lang) {
  const intro = h('div', { class: 'card' },
    h('h2', {}, sound.title),
    h('p', {}, sound.explain),
    h('p', {}, '🔗 ', sound.anchor),
    ctx.state.settings.farsi ? fa(sound.fa) : null);
  return h('section', {},
    sound.intro ? intro : h('details', {}, h('summary', {}, `Show the explanation: ${sound.title}`), intro),
    earQuiz(ctx, sound, lang),
    sound.sayPairs.length ? h('h3', {}, 'Say these pairs') : null,
    sound.sayPairs.map((pair) => h('div', { class: 'card' },
      pair.map((word) => h('div', {}, speakable(ctx, word, lang), sayItCheck(ctx, word, lang))))));
}

function earQuiz(ctx, sound, lang) {
  const voices = voicesFor(ctx.allVoices, lang);
  const box = h('div', { class: 'card' });
  let round = 0;
  let right = 0;

  function start() {
    round = 0;
    right = 0;
    nextRound();
  }

  function finish() {
    ctx.update((s) => {
      const prev = s.ear[sound.id] ?? { right: 0, total: 0 };
      return { ...s, ear: { ...s.ear, [sound.id]: { right: prev.right + right, total: prev.total + ROUNDS } } };
    });
    mount(clear(box),
      h('p', {}, `You heard ${right} of ${ROUNDS} correctly.`),
      h('p', { class: 'hint' }, 'Your ear gets better with practice, and your pronunciation follows.'),
      button('Play again', start));
  }

  function nextRound() {
    if (round === ROUNDS) return finish();
    round++;
    const pair = pickOne(sound.pairs);
    const answer = Math.floor(Math.random() * 2);
    const voice = voices.length ? pickOne(voices) : ctx.voices[lang];
    const play = (word = pair[answer]) => speak(word, { voice, lang: RECOG[lang][0] });
    const feedback = h('div', {});
    const choices = pair.map((word, i) => button(word, () => {
      if (i === answer) right++;
      choices.forEach((c) => { c.disabled = true; });
      mount(clear(feedback),
        h('p', {}, i === answer ? '✓ Right!' : `✗ It was “${pair[answer]}”.`),
        button(`🔊 ${pair[0]}`, () => play(pair[0]), { class: 'chip' }),
        button(`🔊 ${pair[1]}`, () => play(pair[1]), { class: 'chip' }),
        button(round === ROUNDS ? 'See result →' : 'Next →', nextRound, { class: 'primary' }));
    }, { class: 'choice' }));
    mount(clear(box),
      h('p', { class: 'muted' }, `Ear quiz · ${round}/${ROUNDS}`),
      button('🔊 Play again', () => play(), {}),
      h('div', { class: 'choices' }, choices),
      feedback);
    play();
  }

  box.append(
    h('h3', {}, '👂 Ear quiz'),
    h('p', {}, 'Listen and tap the word you hear. The voice changes each time.'),
    voices.length < 2 ? h('p', { class: 'hint' }, 'Tip: install more voices for this language in your device settings to make the quiz better.') : null,
    button('Start ear quiz', start, { class: 'primary' }));
  return box;
}
