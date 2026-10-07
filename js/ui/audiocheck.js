import { h, button } from './dom.js';
import { voicesFor, canRecord, canRecognise, startRecording } from '../speech.js';

const SAMPLE = 'Goeiemorgen, hoe gaat het met jou?';

// Half a second of silence as a WAV file (8 kHz, 8-bit mono; the value 128 is silence).
function silentWav() {
  const samples = 4000;
  const view = new DataView(new ArrayBuffer(44 + samples));
  const text = (at, s) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + samples, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
  text(36, 'data'); view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
}

// A self-test for sound problems: what this device offers, what the app picks, and what really
// happens when it speaks and records. The learner copies the report and sends it for help.
export function audioCheck(ctx) {
  const out = h('pre', {});
  const note = h('p', { class: 'hint' });
  const player = h('audio', { controls: true, hidden: true });
  const log = (line) => { out.textContent += `${line}\n`; };
  const name = (v) => (v ? `${v.name} (${v.lang})` : 'none');
  // The full id tells same-named voices apart (for example a basic and an Enhanced ‘Ellen’).
  const full = (v) => (v ? `${v.name} (${v.lang}) [${v.voiceURI}${v.localService === false ? ', online' : ''}]` : 'none');

  function describe() {
    out.textContent = '';
    const all = globalThis.speechSynthesis?.getVoices() ?? [];
    const standalone = navigator.standalone === true || globalThis.matchMedia?.('(display-mode: standalone)').matches;
    log(`Browser: ${navigator.userAgent}`);
    log(`Home-screen app: ${standalone ? 'yes' : 'no'}`);
    log(`Voices: ${all.length} in total`);
    log(`Dutch voices: ${voicesFor(all, 'nl').map(full).join(', ') || 'none'}`);
    log(`English voices: ${voicesFor(all, 'en').length}`);
    log(`App uses for Dutch: ${ctx.voices.nl ? full(ctx.voices.nl) : 'no voice (device default)'}`);
    log(`App uses for English: ${ctx.voices.en ? name(ctx.voices.en) : 'no voice (device default)'}`);
    log(`Can record: ${canRecord() ? `yes, mp4 ${globalThis.MediaRecorder.isTypeSupported?.('audio/mp4') ? 'yes' : 'no'}` : 'no'}`);
    log(`Speech recognition: ${canRecognise() ? 'yes' : 'no'}`);
  }

  // Three speech tests that each change one thing: 1 is what the app does, 2 skips cancel(),
  // 3 also skips the chosen voice and lets the device pick one for nl-BE.
  function speakTest(n, { cancelFirst, useVoice, onDone = () => {} }) {
    const synth = globalThis.speechSynthesis;
    if (!synth) return log(`Test ${n}: this browser has no speech`);
    log(`Test ${n}: before: speaking=${synth.speaking} pending=${synth.pending} paused=${synth.paused}`);
    if (cancelFirst) synth.cancel();
    const u = new SpeechSynthesisUtterance(SAMPLE);
    if (useVoice && ctx.voices.nl) u.voice = ctx.voices.nl;
    u.lang = u.voice?.lang ?? 'nl-BE';
    const start = performance.now();
    const ms = () => Math.round(performance.now() - start);
    let ended = false;
    u.onstart = () => log(`Test ${n}: started after ${ms()} ms`);
    u.onend = () => { ended = true; onDone(); log(`Test ${n}: finished after ${ms()} ms with ${useVoice ? name(u.voice) : 'device default'}`); };
    u.onerror = (e) => { ended = true; onDone(); log(`Test ${n}: error "${e.error}" after ${ms()} ms`); };
    synth.speak(u);
    setTimeout(() => { if (!ended) log(`Test ${n}: no end after 6 s (speaking=${synth.speaking})`); }, 6000);
  }

  // iPhone's Silent mode mutes web speech but not recordings. Two ways around it:
  // 4 asks for the "playback" audio session, 5 plays a silent sound while the voice speaks.
  function sessionTest() {
    const session = navigator.audioSession;
    if (!session) return log('Test 4: this browser has no audioSession');
    const before = session.type;
    session.type = 'playback';
    log(`Test 4: audio session ${before} → ${session.type}`);
    speakTest(4, { cancelFirst: true, useVoice: true, onDone: () => { session.type = before; } });
  }

  function silentSoundTest() {
    const sound = new Audio(silentWav());
    sound.loop = true;
    const speakNow = () => speakTest(5, { cancelFirst: true, useVoice: true, onDone: () => sound.pause() });
    sound.play().then(
      () => { log('Test 5: silent sound playing'); speakNow(); },
      (e) => { log(`Test 5: silent sound blocked (${e.name})`); speakNow(); });
  }

  async function recordTest() {
    if (!canRecord()) return log('Recording: not available in this browser');
    let rec;
    try {
      rec = await startRecording();
    } catch (e) {
      return log(`Recording: microphone failed (${e.name}: ${e.message})`);
    }
    log('Recording: microphone on. Say something for 3 seconds…');
    await new Promise((r) => setTimeout(r, 3000));
    const start = performance.now();
    const blob = await rec.stop();
    log(`Recording: stopped after ${Math.round(performance.now() - start)} ms, ${blob.size} bytes, ${blob.type || 'no type'}`);
    if (!blob.size) return;
    player.src = URL.createObjectURL(blob);
    player.hidden = false;
    player.onended = () => log('Playback: finished');
    player.onerror = () => log(`Playback: error ${player.error?.code}`);
    try {
      await player.play();
      log('Playback: started (did you hear yourself?)');
    } catch (e) {
      log(`Playback: did not start by itself (${e.name}). Tap ▶ on the player.`);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(out.textContent);
      note.textContent = 'Copied ✓ Paste it into your message.';
    } catch {
      note.textContent = 'Could not copy. Take a screenshot instead.';
    }
  }

  return h('details', { class: 'audio-check', onToggle: (e) => { if (e.target.open) describe(); } },
    h('summary', {}, '🔧 Audio check'),
    h('p', { class: 'hint' }, 'If sound or recording does not work, run these tests, then copy the report and send it.'),
    h('div', { class: 'row' },
      button('▶ Test 1: like the app', () => speakTest(1, { cancelFirst: true, useVoice: true }), { class: 'chip' }),
      button('▶ Test 2: without cancel', () => speakTest(2, { cancelFirst: false, useVoice: true }), { class: 'chip' }),
      button('▶ Test 3: device default voice', () => speakTest(3, { cancelFirst: false, useVoice: false }), { class: 'chip' }),
      button('▶ Test 4: Silent mode, way A', sessionTest, { class: 'chip' }),
      button('▶ Test 5: Silent mode, way B', silentSoundTest, { class: 'chip' }),
      button('🎙 Test recording (3 s)', recordTest, { class: 'chip' })),
    out, player,
    button('📋 Copy report', copy, { class: 'primary' }),
    note);
}
