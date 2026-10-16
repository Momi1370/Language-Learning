import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalise, clipKey, clipPath, loadManifest, hasClip, playClip, stopClip, resetClips } from '../js/clips.js';

beforeEach(() => resetClips());

const json = (body, ok = true) => async () => ({ ok, status: ok ? 200 : 404, json: async () => body });

class FakeAudio {
  static made = [];
  constructor() { FakeAudio.made.push(this); this.listeners = {}; this.paused = true; this.playbackRate = 1; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  pause() { this.paused = true; }
  play() { this.paused = false; this.played = this.src; return this.failPlay ? Promise.reject(new Error('blocked')) : Promise.resolve(); }
  end() { this.onended?.(); }
}

test('the clip key ignores extra spaces and differs by language and text', () => {
  assert.equal(normalise('  Goeiemorgen!   Ik  ben Sam. '), 'Goeiemorgen! Ik ben Sam.');
  assert.equal(clipKey('nl', 'Dag  allemaal'), clipKey('nl', ' Dag allemaal '));
  assert.notEqual(clipKey('nl', 'Dag'), clipKey('en', 'Dag'));
  assert.notEqual(clipKey('en', 'Dag'), clipKey('en', 'Dag.'));
  assert.match(clipKey('en', 'x'), /^[0-9a-z]{10,12}$/);
});

test('the key is stable (the tools and the app must agree on it)', () => {
  assert.equal(clipKey('en', "I'll pick you up at six tomorrow."), clipKey('en', "I'll pick you up at six tomorrow."));
  assert.equal(clipPath('en', 'hello'), `audio/en/${clipKey('en', 'hello')}.mp3`);
});

test('before the manifest is loaded no clip is known', () => assert.equal(hasClip('en', 'hello'), false));

test('the manifest lists the keys that have a recording', async () => {
  await loadManifest(json({ en: [clipKey('en', 'hello')], nl: [] }));
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
});

test('playClip plays the file at the asked speed and resolves true when it ends', async () => {
  FakeAudio.made = [];
  const p = playClip('en', 'hello', 0.7, { AudioCtor: FakeAudio });
  const a = FakeAudio.made[0];
  assert.equal(a.src, clipPath('en', 'hello'));
  assert.equal(a.playbackRate, 0.7);
  a.end();
  assert.equal(await p, true);
});

test('playClip resolves false when the file cannot be played, so the caller can fall back', async () => {
  FakeAudio.made = [];
  class Blocked extends FakeAudio { constructor() { super(); this.failPlay = true; } }
  assert.equal(await playClip('en', 'hello', 1, { AudioCtor: Blocked }), false);
});

test('one new clip stops the one before it, and stopClip pauses', async () => {
  FakeAudio.made = [];
  const first = playClip('en', 'one', 1, { AudioCtor: FakeAudio });
  const a = FakeAudio.made[0];
  const second = playClip('en', 'two', 1, { AudioCtor: FakeAudio });
  assert.equal(FakeAudio.made.length, 1, 'the same audio element is reused (iPhone)');
  assert.equal(await first, true, 'the interrupted clip counts as handled');
  assert.equal(a.src, clipPath('en', 'two'));
  stopClip();
  assert.equal(a.paused, true);
  assert.equal(await second, true);
});

test('the manifest version becomes part of every clip address', async () => {
  await loadManifest(json({ version: 3, en: [clipKey('en', 'hello')], nl: [] }));
  assert.equal(clipPath('en', 'hello'), `audio/en/${clipKey('en', 'hello')}.mp3?v=3`);
  FakeAudio.made = [];
  const p = playClip('en', 'hello', 1, { AudioCtor: FakeAudio });
  assert.match(FakeAudio.made[0].src, /\.mp3\?v=3$/);
  FakeAudio.made[0].end();
  await p;
});

test('audio/manifest.json lists exactly the clips that exist', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const root = new URL('../', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('audio/manifest.json', root), 'utf8'));
  for (const lang of ['en', 'nl']) {
    const files = (await readdir(new URL(`audio/${lang}/`, root)).catch(() => [])).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort();
    assert.deepEqual([...manifest[lang]].sort(), files, `${lang}: run node tools/tts/manifest.mjs`);
  }
});
