import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice, voicesFor, accentOf, canRecognise, canRecord, startRecording, listen } from '../js/speech.js';

const voices = [
  { name: 'Xander', lang: 'nl-NL' },
  { name: 'Ellen', lang: 'nl_BE' },
  { name: 'Samantha', lang: 'en-US' },
  { name: 'Daniel', lang: 'en-GB' },
];

test('Dutch prefers a Belgian voice, even with an underscore in the code', () => {
  assert.equal(pickVoice(voices, 'nl').name, 'Ellen');
});
test('a chosen voice wins when it exists', () => {
  assert.equal(pickVoice(voices, 'nl', 'Xander').name, 'Xander');
  assert.equal(pickVoice(voices, 'nl', 'Gone').name, 'Ellen');
});
test('English prefers British, then American', () => {
  assert.equal(pickVoice(voices, 'en').name, 'Daniel');
  assert.equal(pickVoice(voices.filter((v) => v.name !== 'Daniel'), 'en').name, 'Samantha');
});
test('no voice for a language gives null', () => assert.equal(pickVoice([], 'nl'), null));
test('voicesFor filters by language', () => assert.deepEqual(voicesFor(voices, 'nl').map((v) => v.name), ['Xander', 'Ellen']));

test('voicesFor leaves out novelty voices that sing, whisper or sound robotic', () => {
  const mac = [
    { name: 'Bells', lang: 'en-US' }, { name: 'Whisper', lang: 'en-US' }, { name: 'Zarvox', lang: 'en-US' },
    { name: 'Good News', lang: 'en-US' }, { name: 'Eddy (English (UK))', lang: 'en-GB' }, { name: 'Daniel', lang: 'en-GB' },
  ];
  assert.deepEqual(voicesFor(mac, 'en').map((v) => v.name), ['Daniel']);
});
test('accentOf', () => {
  assert.equal(accentOf(voices[1]), 'be');
  assert.equal(accentOf(voices[0]), 'nl');
  assert.equal(accentOf(null), null);
});
test('in Node there is no recognition or recording', () => {
  assert.equal(canRecognise(), false);
  assert.equal(canRecord(), false);
});

// A fake microphone and MediaRecorder. `onStop` decides what the fake does when stop() is called.
function fakeMic({ onStop = 'fires', state = 'recording' } = {}) {
  const track = { ended: false, stop() { this.ended = true; } };
  const stream = { getTracks: () => [track] };
  class Recorder {
    static isTypeSupported = (t) => t === 'audio/mp4';
    constructor(s, options) {
      this.mimeType = options?.mimeType ?? '';
      Recorder.last = this;
    }
    start(timeslice) {
      this.timeslice = timeslice;
      this.state = state;
    }
    // What the browser does every `timeslice` ms while recording.
    tick(text) { this.ondataavailable({ data: new Blob([text]) }); }
    stop() {
      if (this.state === 'inactive') throw new Error('InvalidStateError');
      this.state = 'inactive';
      if (onStop === 'fires') {
        this.ondataavailable({ data: new Blob(['end']) });
        this.onstop();
      }
    }
  }
  return { track, Recorder, media: { getUserMedia: async () => stream } };
}

test('a recording returns everything that was recorded and releases the microphone', async () => {
  const mic = fakeMic();
  const rec = await startRecording({ media: mic.media, Recorder: mic.Recorder });
  mic.Recorder.last.tick('one ');
  const blob = await rec.stop();
  assert.equal(await blob.text(), 'one end');
  assert.equal(blob.type, 'audio/mp4');
  assert.equal(mic.track.ended, true);
});

test('recording asks for data every second, so it survives a lost final chunk', async () => {
  const mic = fakeMic();
  await startRecording({ media: mic.media, Recorder: mic.Recorder });
  assert.equal(mic.Recorder.last.timeslice, 1000);
});

test('stop still finishes when the browser never sends the stop event (iPhone)', async () => {
  const mic = fakeMic({ onStop: 'silent' });
  const rec = await startRecording({ media: mic.media, Recorder: mic.Recorder, stopWaitMs: 20 });
  mic.Recorder.last.tick('one');
  const blob = await rec.stop();
  assert.equal(await blob.text(), 'one');
  assert.equal(mic.track.ended, true);
});

test('stop still finishes when the browser already stopped the recorder by itself', async () => {
  const mic = fakeMic();
  const rec = await startRecording({ media: mic.media, Recorder: mic.Recorder, stopWaitMs: 20 });
  mic.Recorder.last.tick('one');
  mic.Recorder.last.state = 'inactive';
  const blob = await rec.stop();
  assert.equal(await blob.text(), 'one');
  assert.equal(mic.track.ended, true);
});

test('stopping twice returns the same recording', async () => {
  const mic = fakeMic();
  const rec = await startRecording({ media: mic.media, Recorder: mic.Recorder });
  const [a, b] = await Promise.all([rec.stop(), rec.stop()]);
  assert.equal(a, b);
});

// A fake SpeechRecognition. Like real browsers, it ends by itself after the first pause unless
// continuous is true. `quietEnd` mimics iPhone, which sometimes never sends 'end'.
function fakeRecognition({ quietEnd = false } = {}) {
  const made = [];
  class Recognition {
    constructor() { made.push(this); this.results = []; }
    start() { this.started = true; }
    stop() { if (!quietEnd) setTimeout(() => this.onend?.(), 0); }
    hear(...alternatives) {
      this.results.push(Object.assign(alternatives.map((transcript) => ({ transcript })), { isFinal: true }));
      this.onresult?.({ resultIndex: this.results.length - 1, results: this.results });
      if (!this.continuous && !quietEnd) setTimeout(() => this.onend?.(), 0);
    }
    fail(error) { this.onerror?.({ error }); this.onend?.(); }
  }
  return { Recognition, made };
}

test('listening keeps going through a pause and returns the whole sentence', async () => {
  const { Recognition, made } = fakeRecognition();
  const session = listen('nl-BE', { Recognition });
  const r = made[0];
  assert.equal(r.continuous, true);
  assert.equal(r.lang, 'nl-BE');
  r.hear('Ik ben hier pas begonnen');
  await new Promise((done) => setTimeout(done, 5));
  r.hear('dus ik ken nog niet iedereen');
  assert.deepEqual(await session.stop(), ['Ik ben hier pas begonnen dus ik ken nog niet iedereen']);
});

test('every pause tells the caller what was heard so far, so it can stop when the sentence is complete', async () => {
  const { Recognition, made } = fakeRecognition();
  const heard = [];
  const session = listen('nl-BE', { Recognition, onHeard: (alternatives) => heard.push(alternatives[0]) });
  made[0].hear('Goeiemorgen');
  made[0].hear('tot morgen');
  assert.deepEqual(heard, ['Goeiemorgen', 'Goeiemorgen tot morgen']);
  await session.stop();
});

test('alternatives are whole sentences: each guess of a part joined with the best guess of the others', async () => {
  const { Recognition, made } = fakeRecognition();
  const session = listen('nl-BE', { Recognition });
  made[0].hear('ik ben nieuw', 'ik been nieuw');
  made[0].hear('hier');
  assert.deepEqual(await session.stop(), ['ik ben nieuw hier', 'ik been nieuw hier']);
});

test('stop still finishes when recognition never sends its end event (iPhone)', async () => {
  const { Recognition, made } = fakeRecognition({ quietEnd: true });
  const session = listen('nl-BE', { Recognition, endWaitMs: 20 });
  made[0].hear('Smakelijk');
  assert.deepEqual(await session.stop(), ['Smakelijk']);
});

test('listening stops by itself after the time limit', async () => {
  const { Recognition, made } = fakeRecognition();
  const session = listen('nl-BE', { Recognition, maxMs: 20 });
  made[0].hear('Tot morgen');
  assert.deepEqual(await session.done, ['Tot morgen']);
});

test('an error with nothing heard is reported with its code', async () => {
  const { Recognition, made } = fakeRecognition();
  const session = listen('nl-BE', { Recognition });
  made[0].fail('no-speech');
  await assert.rejects(session.done, (e) => e.code === 'no-speech');
});

test('the say-it check is unavailable in an iPhone home-screen app (recognition never works there)', () => {
  const Recognition = class {};
  assert.equal(canRecognise({ webkitSpeechRecognition: Recognition, navigator: { standalone: true } }), false);
  assert.equal(canRecognise({ webkitSpeechRecognition: Recognition, navigator: { standalone: false } }), true);
  assert.equal(canRecognise({ SpeechRecognition: Recognition, navigator: {} }), true);
});
