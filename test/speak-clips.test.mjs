import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { speak } from '../js/speech.js';
import { loadManifest, clipKey, resetClips } from '../js/clips.js';

let spoken;
let played;
let failPlay;

beforeEach(async () => {
  resetClips();
  spoken = [];
  played = [];
  failPlay = false;
  globalThis.speechSynthesis = { cancel() { spoken.push('cancel'); }, speak(u) { spoken.push(u.text); u.onend(); }, getVoices: () => [] };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  globalThis.Audio = class {
    pause() {}
    play() { played.push({ src: this.src, rate: this.playbackRate }); if (failPlay) return Promise.reject(new Error('x')); setTimeout(() => this.onended(), 0); return Promise.resolve(); }
  };
  const k = (lang, t) => clipKey(lang, t);
  await loadManifest(async () => ({
    ok: true,
    json: async () => ({
      version: 1,
      voices: { en: ['heart', 'emma'], nl: ['nathalie', 'ronnie'] },
      en: { heart: [k('en', 'Hello there.')], emma: [k('en', 'Hello there.')] },
      nl: { nathalie: [k('nl', 'Dag allemaal')], ronnie: [k('nl', 'Dag allemaal')] },
    }),
  }));
});
afterEach(() => { resetClips(); delete globalThis.speechSynthesis; delete globalThis.SpeechSynthesisUtterance; delete globalThis.Audio; });

const phoneSaid = () => spoken.filter((x) => x !== 'cancel');

test('a sentence with a recording plays the recording and the phone voice stays silent', async () => {
  await speak('Hello there.', { lang: 'en-GB', rate: 0.7, slot: 1 });
  assert.equal(played.length, 1);
  assert.match(played[0].src, /^audio\/en\/emma\/[0-9a-z]+\.mp3/);
  assert.equal(played[0].rate, 0.7);
  assert.deepEqual(phoneSaid(), []);
});

test('the language comes from the locale, and the speaker slot picks the voice', async () => {
  await speak('Dag allemaal', { lang: 'nl-BE', slot: 0 });
  assert.match(played[0].src, /^audio\/nl\/nathalie\//);
  await speak('Dag allemaal', { lang: 'nl-BE', slot: 1 });
  assert.match(played[1].src, /^audio\/nl\/ronnie\//);
  await speak('Dag allemaal', { lang: 'en-GB' });
  assert.equal(played.length, 2, 'the English voices have no recording for that text');
});

test('the learner’s chosen voice is used when no speaker slot is given', async () => {
  await speak('Hello there.', { lang: 'en-GB', prefer: 'emma' });
  assert.match(played[0].src, /\/emma\//);
});

test('a sentence without a recording uses the phone voice', async () => {
  await speak('Something new.', { lang: 'en-GB' });
  assert.equal(played.length, 0);
  assert.deepEqual(phoneSaid(), ['Something new.']);
});

test('when the recording cannot be played the phone voice takes over', async () => {
  failPlay = true;
  await speak('Hello there.', { lang: 'en-GB' });
  assert.deepEqual(phoneSaid(), ['Hello there.']);
});
