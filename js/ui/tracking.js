import { clear, mount, h, button, fa } from './dom.js';
import { say } from './widgets.js';
import { stageCounts, stageSummary, stageShares, pickSpotCheck, resolveSpotCheck, finishSpotCheck } from '../learned.js';

// "8 learned · 14 familiar · …" with a thin bar under it. Empty when the learner has no words in this language yet.
export function stageLine(state, lang) {
  const counts = stageCounts(state, lang);
  const shares = stageShares(counts);
  if (!shares.length) return null;
  return h('div', { class: 'stage-line' },
    h('p', { class: 'muted' }, stageSummary(counts)),
    h('div', { class: 'stage-bar', role: 'img', 'aria-label': stageSummary(counts) },
      shares.map(({ stage, share }) => h('span', { class: `stage-${stage}`, style: `flex: ${share} 1 0` }))));
}

// The daily quick check: up to 3 words you said you know. Returns null when there is nothing to check today.
export function quickCheck(ctx, lang) {
  const ids = pickSpotCheck(ctx.state, lang, new Date()).filter((id) => ctx.vocabIndex[id]);
  if (!ids.length) return null;
  const box = h('div', { class: 'card' });
  const start = () => step(0);
  mount(box,
    h('p', {}, h('b', {}, `Quick check · ${ids.length} ${ids.length === 1 ? 'word' : 'words'}`)),
    h('p', { class: 'hint' }, 'You said you know these. Say the meaning to yourself, then look.'),
    button('Start', start, { class: 'primary' }));

  function step(i) {
    if (i >= ids.length) {
      ctx.update((s) => finishSpotCheck(s, lang, new Date()));
      box.remove();
      return;
    }
    const w = ctx.vocabIndex[ids[i]];
    const answer = h('div', { hidden: true },
      fa(w.fa.meaning),
      w.en ? h('p', { class: 'hint', lang: 'en' }, w.en) : null,
      h('div', { class: 'vocab-actions' },
        button('Not sure', () => { ctx.update((s) => resolveSpotCheck(s, w.id, false, new Date())); step(i + 1); }),
        button('I knew it', () => { ctx.update((s) => resolveSpotCheck(s, w.id, true, new Date())); step(i + 1); }, { class: 'primary' })));
    const show = button('Show', () => { answer.hidden = false; show.remove(); }, { class: 'primary' });
    mount(clear(box),
      h('p', { class: 'label' }, `Quick check · ${i + 1} of ${ids.length}`),
      h('div', { class: 'speakable-row' },
        h('p', { class: 'vocab-word', lang: w.lang ?? 'en' }, w.word),
        button('🔊', () => say(ctx, w.word, w.lang ?? 'en', 1), { class: 'icon', 'aria-label': 'Play the word' })),
      show, answer);
  }
  return box;
}
