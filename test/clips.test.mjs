import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalise, clipKey, clipPath, loadManifest, hasClip, pickClip, voicesOf, playClip, stopClip, resetClips } from '../js/clips.js';

beforeEach(() => resetClips());

const json = (body, ok = true) => async () => ({ ok, status: ok ? 200 : 404, json: async () => body });
const manifestWith = (en, nl = {}, version = 1) => ({ version, voices: { en: Object.keys(en), nl: Object.keys(nl) }, en, nl });

class FakeAudio {
  static made = [];
  constructor() { FakeAudio.made.push(this); this.paused = true; this.playbackRate = 1; }
  pause() { this.paused = true; }
  play() { this.paused = false; return this.failPlay ? Promise.reject(new Error('blocked')) : Promise.resolve(); }
  end() { this.onended?.(); }
}

test('the clip key ignores extra spaces and differs by language and text', () => {
  assert.equal(normalise('  Goeiemorgen!   Ik  ben Sam. '), 'Goeiemorgen! Ik ben Sam.');
  assert.equal(clipKey('nl', 'Dag  allemaal'), clipKey('nl', ' Dag allemaal '));
  assert.notEqual(clipKey('nl', 'Dag'), clipKey('en', 'Dag'));
  assert.notEqual(clipKey('en', 'Dag'), clipKey('en', 'Dag.'));
  assert.match(clipKey('en', 'x'), /^[0-9a-z]{10,12}$/);
});

test('the file path has the language, the voice and the key', () => {
  assert.equal(clipPath('en', 'heart', 'hello'), `audio/en/heart/${clipKey('en', 'hello')}.mp3`);
});

test('before the manifest is loaded no clip is known', () => {
  assert.equal(hasClip('en', 'hello'), false);
  assert.deepEqual(voicesOf('en'), []);
});

test('the manifest lists, per voice, the keys that have a recording', async () => {
  await loadManifest(json(manifestWith({ heart: [clipKey('en', 'hello')], emma: [] })));
  assert.deepEqual(voicesOf('en'), ['heart', 'emma']);
  assert.equal(hasClip('en', 'hello'), true);
  assert.equal(hasClip('en', ' hello '), true);
  assert.equal(hasClip('en', 'goodbye'), false);
  assert.equal(hasClip('nl', 'hello'), false);
});

test('a missing or broken manifest is not an error: no clips, so the phone voice is used', async () => {
  await loadManifest(json({}, false));
  assert.equal(hasClip('en', 'hello'), false);
  await loadManifest(async () => { throw new TypeError('offline'); });
  assert.equal(hasClip('en', 'hello'), false);
  await loadManifest(json('nonsense'));
  assert.equal(hasClip('en', 'hello'), false);
  await loadManifest(json({ version: 1, voices: { en: ['heart'] }, en: { heart: 'oops' } }));
  assert.equal(hasClip('en', 'hello'), false);
});

const both = (text) => ({ heart: [clipKey('en', text)], emma: [clipKey('en', text)] });

test('a speaker slot picks that voice (a dialogue uses one voice per speaker)', async () => {
  await loadManifest(json(manifestWith(both('hello'))));
  assert.equal(pickClip('en', 'hello', { slot: 0 }), 'heart');
  assert.equal(pickClip('en', 'hello', { slot: 1 }), 'emma');
});

test('a chosen voice is used; "mixed" gives the same voice for the same text every time and uses both voices', async () => {
  await loadManifest(json(manifestWith(both('hello'))));
  assert.equal(pickClip('en', 'hello', { prefer: 'emma' }), 'emma');
  assert.equal(pickClip('en', 'hello', { prefer: 'heart' }), 'heart');
  const texts = Array.from({ length: 40 }, (_, i) => `sentence number ${i}`);
  await loadManifest(json(manifestWith({ heart: texts.map((t) => clipKey('en', t)), emma: texts.map((t) => clipKey('en', t)) })));
  const picked = texts.map((t) => pickClip('en', t, { prefer: 'mixed' }));
  assert.deepEqual(picked, texts.map((t) => pickClip('en', t, { prefer: 'mixed' })));
  assert.ok(picked.includes('heart') && picked.includes('emma'));
});

test('when the wanted voice has no recording of that text, the other voice is used; with none, null', async () => {
  await loadManifest(json(manifestWith({ heart: [clipKey('en', 'only heart')], emma: [clipKey('en', 'only emma')] })));
  assert.equal(pickClip('en', 'only heart', { slot: 1 }), 'heart');
  assert.equal(pickClip('en', 'only emma', { prefer: 'heart' }), 'emma');
  assert.equal(pickClip('en', 'neither', { slot: 0 }), null);
});

test('playClip plays the voice file at the asked speed and resolves true when it ends', async () => {
  FakeAudio.made = [];
  const p = playClip('en', 'emma', 'hello', 0.7, { AudioCtor: FakeAudio });
  const a = FakeAudio.made[0];
  assert.equal(a.src, clipPath('en', 'emma', 'hello'));
  assert.equal(a.playbackRate, 0.7);
  a.end();
  assert.equal(await p, true);
});

test('playClip resolves false when the file cannot be played, so the caller can fall back', async () => {
  class Blocked extends FakeAudio { constructor() { super(); this.failPlay = true; } }
  assert.equal(await playClip('en', 'heart', 'hello', 1, { AudioCtor: Blocked }), false);
});

test('one new clip stops the one before it, and stopClip pauses', async () => {
  FakeAudio.made = [];
  const first = playClip('en', 'heart', 'one', 1, { AudioCtor: FakeAudio });
  const a = FakeAudio.made[0];
  const second = playClip('en', 'heart', 'two', 1, { AudioCtor: FakeAudio });
  assert.equal(FakeAudio.made.length, 1, 'the same audio element is reused (iPhone)');
  assert.equal(await first, true, 'the interrupted clip counts as handled');
  assert.equal(a.src, clipPath('en', 'heart', 'two'));
  stopClip();
  assert.equal(a.paused, true);
  assert.equal(await second, true);
});

test('the manifest version becomes part of every clip address', async () => {
  await loadManifest(json(manifestWith({ heart: [clipKey('en', 'hello')] }, {}, 3)));
  assert.equal(clipPath('en', 'heart', 'hello'), `audio/en/heart/${clipKey('en', 'hello')}.mp3?v=3`);
  FakeAudio.made = [];
  const p = playClip('en', 'heart', 'hello', 1, { AudioCtor: FakeAudio });
  assert.match(FakeAudio.made[0].src, /\.mp3\?v=3$/);
  FakeAudio.made[0].end();
  await p;
});

test('audio/manifest.json lists exactly the clips that exist, per voice', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const root = new URL('../', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('audio/manifest.json', root), 'utf8'));
  for (const lang of ['en', 'nl']) {
    assert.deepEqual(Object.keys(manifest[lang]).sort(), [...manifest.voices[lang]].sort());
    for (const voice of manifest.voices[lang]) {
      const files = (await readdir(new URL(`audio/${lang}/${voice}/`, root)).catch(() => [])).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort();
      assert.deepEqual([...manifest[lang][voice]].sort(), files, `${lang}/${voice}: run node tools/tts/manifest.mjs`);
    }
  }
});
