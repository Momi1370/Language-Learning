import { mount, h } from './dom.js';
import { speakable, recorder, transcriptWidget, doneBar } from './widgets.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function render(ctx, root) {
  const nl = ctx.session.nl;
  mount(root, h('h1', {}, nl.diary ? '🇧🇪 Speaking diary' : '🇧🇪 Speak'), speakTask(ctx, nl.diary ?? nl.speak, 'nl'), doneBar(ctx, 'speak'));
}

export function speakTask(ctx, prompt, lang) {
  const timer = h('span', { class: 'timer' }, fmt(prompt.seconds));
  const saved = h('p', { class: 'ok-text' });
  let tick = null;
  const rec = recorder(ctx, {
    onStart() {
      let left = prompt.seconds;
      timer.textContent = fmt(left);
      clearInterval(tick);
      tick = setInterval(() => {
        left -= 1;
        timer.textContent = fmt(Math.max(left, 0));
        if (left <= 0) {
          clearInterval(tick);
          if (rec.recording) rec.toggle();
        }
      }, 1000);
    },
    async onRecorded(blob) {
      clearInterval(tick);
      if (!prompt.diaryId) return;
      await ctx.diary.put({ id: prompt.diaryId, date: new Date().toISOString(), blob });
      saved.textContent = ctx.diary.persistent
        ? '✓ Saved in your speaking diary (see Progress).'
        : 'Saved for now, but this browser cannot keep it after you close the page.';
    },
  });
  return h('section', { class: 'card' },
    prompt.diaryId ? h('p', { class: 'hint' }, '📔 This recording is saved in your speaking diary, so you can hear your progress later.') : null,
    h('p', { class: 'meaning' }, prompt.prompt),
    h('p', { class: 'label' }, 'Useful frames'),
    prompt.frames.map((f) => speakable(ctx, f, lang)),
    h('div', { class: 'record-row' }, timer, rec.el),
    saved,
    transcriptWidget(lang),
    h('details', {}, h('summary', {}, 'Model answer (after you have tried)'), speakable(ctx, prompt.model, lang)));
}
