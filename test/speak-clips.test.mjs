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
  await loadManifest(async () => ({ ok: true, json: async () => ({ en: [clipKey('en', 'Hello there.')], nl: [clipKey('nl', 'Dag allemaal')] }) }));
});
afterEach(() => { resetClips(); delete globalThis.speechSynthesis; delete globalThis.SpeechSynthesisUtterance; delete globalThis.Audio; });

test('a sentence with a recording plays the recording and the phone voice stays silent', async () => {
  await speak('Hello there.', { lang: 'en-GB', rate: 0.7 });
  assert.equal(played.length, 1);
  assert.match(played[0].src, /^audio\/en\/[0-9a-z]+\.mp3$/);
  assert.equal(played[0].rate, 0.7);
  assert.deepEqual(spoken.filter((x) => x !== 'cancel'), []);
});

test('the language comes from the locale: nl-BE uses the Dutch recordings', async () => {
  await speak('Dag allemaal', { lang: 'nl-BE' });
  assert.match(played[0].src, /^audio\/nl\//);
  await speak('Dag allemaal', { lang: 'en-GB' });
  assert.equal(played.length, 1, 'the English voice has no recording for that text');
});

test('a sentence without a recording uses the phone voice', async () => {
  await speak('Something new.', { lang: 'en-GB' });
  assert.equal(played.length, 0);
  assert.deepEqual(spoken.filter((x) => x !== 'cancel'), ['Something new.']);
});

test('when the recording cannot be played the phone voice takes over', async () => {
  failPlay = true;
  await speak('Hello there.', { lang: 'en-GB' });
  assert.deepEqual(spoken.filter((x) => x !== 'cancel'), ['Hello there.']);
});
