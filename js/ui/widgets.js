import { clear, mount, h, button, fa } from './dom.js';
import { speak, canRecord, startRecording, canRecognise, listen, startTranscript } from '../speech.js';
import { bestMatch } from '../match.js';

export const RECOG = { nl: ['nl-BE', 'nl-NL'], en: ['en-GB', 'en-US'] };

const bare = (word) => word.replace(/[^\p{L}\p{N}'’-]/gu, '');

export function say(ctx, text, lang, rate = 1) {
  return speak(text, { voice: ctx.voices[lang], lang: RECOG[lang][0], rate });
}

export function speakable(ctx, text, lang, { big = false } = {}) {
  const line = h('p', { class: `speakable${big ? ' big' : ''}`, lang });
  for (const piece of text.split(/(\s+)/)) {
    if (!bare(piece)) { line.append(piece); continue; }
    line.append(button(piece, () => say(ctx, bare(piece), lang, 0.7), { class: 'word', title: 'Hear this word slowly' }));
  }
  return h('div', { class: 'speakable-row' }, line,
    h('span', { class: 'audio-buttons' },
      button('🔊', () => say(ctx, text, lang, 1), { class: 'icon', 'aria-label': 'Play' }),
      button('🐢', () => say(ctx, text, lang, 0.7), { class: 'icon', 'aria-label': 'Play slowly' })));
}

export function recognitionMessage(e) {
  switch (e?.code) {
    case 'not-allowed':
    case 'service-not-allowed': return 'The microphone or speech recognition is blocked. Allow it in your browser settings to use this check.';
    case 'no-speech': return 'Nothing was heard. Try again, a bit louder and closer to the microphone.';
    case 'network': return 'Speech recognition needs an internet connection.';
    case 'audio-capture': return 'No microphone was found.';
    default: return 'The check did not work this time. Try again.';
  }
}

// Tap to start, say the whole sentence (pauses are fine), and it finishes by itself once every
// word was heard — or tap Done. If the Belgian variant is not supported, it listens in nl-NL.
export function sayItCheck(ctx, target, lang) {
  if (!canRecognise()) return null;
  let tries = 0;
  let session = null;
  const out = h('div', { class: 'check-result' });
  const btn = button('🎯 Say it', toggle, { class: 'secondary' });
  const stopper = () => { session?.stop(); };
  function listenIn(code) {
    session = listen(code, { onHeard: (heard) => { if (bestMatch(target, heard, lang).score === 1) session?.stop(); } });
    return session.done;
  }
  function show(alternatives) {
    const r = bestMatch(target, alternatives, lang);
    const missed = r.words.filter((w) => w.ok === false);
    mount(clear(out),
      h('p', { class: 'check-words' }, r.words.map((w) => [h('span', { class: w.ok === null ? '' : w.ok ? 'ok' : 'miss' }, w.text), ' '])),
      h('p', { class: 'hint' }, r.score === 1
        ? 'Understood ✓'
        : alternatives.length ? `It heard: “${alternatives[0]}”` : 'Nothing was heard. Try again, a bit louder.'),
      tries >= 3 && missed.length
        ? h('p', {}, 'Listen to these words: ', missed.map((w) => button(`🔊 ${bare(w.text)}`, () => say(ctx, bare(w.text), lang, 0.7), { class: 'chip' })))
        : null,
    );
  }
  async function toggle() {
    if (session) {
      btn.disabled = true;
      btn.textContent = '🎯 Checking…';
      session.stop();
      return;
    }
    live.add(stopper);
    btn.textContent = '■ Done';
    mount(clear(out), h('p', { class: 'hint' }, 'Listening… say the whole sentence. Pauses are fine. Tap Done when you finish.'));
    const [first, second] = RECOG[lang];
    try {
      let alternatives;
      try {
        alternatives = await listenIn(first);
      } catch (e) {
        if (e.code !== 'language-not-supported') throw e;
        alternatives = await listenIn(second);
      }
      tries++;
      show(alternatives);
    } catch (e) {
      mount(clear(out), h('p', { class: 'hint' }, recognitionMessage(e)));
    } finally {
      live.delete(stopper);
      session = null;
      btn.disabled = false;
      btn.textContent = '🎯 Say it again';
    }
  }
  return h('div', { class: 'check' }, btn, out, h('p', { class: 'hint' }, 'Green = understood by speech recognition. A rough check, not a score.'));
}

// Live recordings and listening sessions. app.js stops them all whenever the screen
// changes, so the microphone is never left on after the learner moves on.
const live = new Set();

export function stopAllRecording() {
  for (const stop of [...live]) stop();
  live.clear();
}

export function recorder(ctx, { onStart, onRecorded } = {}) {
  if (!canRecord()) {
    return { el: h('p', { class: 'hint' }, 'Recording is not available in this browser. You can still say it out loud.'), blob: null, recording: false, toggle() {} };
  }
  let active = null;
  let url = null;
  let stopper = null;
  const audio = h('audio', { controls: true, hidden: true });
  const status = h('span', { class: 'hint' });
  const api = { blob: null, recording: false, toggle };
  const btn = button('🎙 Record', toggle, { class: 'primary' });
  async function toggle() {
    // Busy starting or stopping: ignore taps and the speaking timer until it is done.
    if (btn.disabled) return;
    if (!active) {
      // Ignore taps while the microphone is opening, or a second recording would leak.
      btn.disabled = true;
      btn.textContent = '🎙 Starting…';
      let cancelled = false;
      stopper = () => {
        cancelled = true;
        api.recording = false;
        if (active) active.stop();
        active = null;
      };
      live.add(stopper);
      try {
        const started = await startRecording();
        if (cancelled) {
          started.stop();
          return;
        }
        active = started;
      } catch {
        live.delete(stopper);
        status.textContent = 'The microphone is not allowed. Check your browser settings.';
        btn.textContent = '🎙 Record';
        return;
      } finally {
        btn.disabled = false;
      }
      api.recording = true;
      btn.textContent = '■ Stop';
      btn.classList.add('recording');
      status.textContent = 'Recording…';
      onStart?.();
    } else {
      live.delete(stopper);
      // Stopping can take a moment on iPhone; ignore taps until it is done.
      btn.disabled = true;
      btn.textContent = '■ Stopping…';
      api.recording = false;
      const blob = await active.stop();
      active = null;
      btn.disabled = false;
      btn.classList.remove('recording');
      if (!blob.size) {
        api.blob = null;
        btn.textContent = '🎙 Record';
        status.textContent = 'Nothing was recorded. Try again.';
        audio.hidden = true;
        return;
      }
      api.blob = blob;
      btn.textContent = '🎙 Record again';
      status.textContent = '';
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      audio.src = url;
      audio.hidden = false;
      await onRecorded?.(blob);
    }
  }
  api.el = h('div', { class: 'recorder' }, btn, status, audio);
  return api;
}

export async function compare(ctx, text, lang, blob) {
  await say(ctx, text, lang, 1);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const player = new Audio(url);
  player.onended = () => URL.revokeObjectURL(url);
  await player.play().catch(() => {});
}

export function transcriptWidget(lang) {
  if (!canRecognise()) return null;
  let session = null;
  const stopper = () => {
    session?.stop().catch(() => {});
    session = null;
  };
  const out = h('p', { class: 'transcript' });
  const btn = button('🗣 What does it hear?', toggle, { class: 'secondary' });
  async function toggle() {
    if (!session) {
      try { session = startTranscript(RECOG[lang][0]); } catch (e) { out.textContent = recognitionMessage(e); return; }
      live.add(stopper);
      btn.textContent = '■ Stop listening';
      out.textContent = 'Listening… speak now.';
      return;
    }
    live.delete(stopper);
    btn.disabled = true;
    try {
      const text = await session.stop();
      out.textContent = text ? `It heard: “${text}”` : 'Nothing was heard.';
    } catch (e) {
      out.textContent = recognitionMessage(e);
    }
    session = null;
    btn.disabled = false;
    btn.textContent = '🗣 Try again';
  }
  return h('div', { class: 'card' }, btn, out,
    h('p', { class: 'hint' }, 'This does not record you. It only shows which words speech recognition understood.'));
}

export function cardDetails(ctx, view) {
  return h('div', { class: 'details' },
    h('p', { class: 'meaning' }, view.meaning),
    view.stress.length ? h('p', { class: 'stress' }, 'Stress: ', view.stress.join(' · ')) : null,
    view.note === 'informal' ? h('p', { class: 'hint' }, 'Informal: use with colleagues and friends.') : view.note ? h('p', { class: 'hint' }, view.note) : null,
    ctx.state.settings.farsi ? fa(view.fa) : null);
}

export function doneBar(ctx, block) {
  return h('div', { class: 'done-bar' }, button('Done ✓ Back to today', () => ctx.markDone(block), { class: 'primary wide' }));
}
