const code = (lang) => String(lang ?? '').replace('_', '-').toLowerCase();

// Apple's novelty and "Eloquence" voices sing, whisper or sound robotic: useless for hearing vowels.
const NOVELTY = new Set([
  'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Deranged', 'Fred', 'Good News',
  'Hysterical', 'Jester', 'Junior', 'Kathy', 'Organ', 'Pipe Organ', 'Princess', 'Ralph', 'Superstar',
  'Trinoids', 'Whisper', 'Wobble', 'Zarvox',
  'Eddy', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Sandy', 'Shelley',
]);
const isNovelty = (v) => NOVELTY.has(String(v.name).split(' (')[0]);

export function voicesFor(voices, lang) {
  return voices.filter((v) => code(v.lang).startsWith(lang) && !isNovelty(v));
}

export function pickVoice(voices, lang, preferredName = '') {
  const list = voicesFor(voices, lang);
  if (preferredName) {
    const chosen = list.find((v) => v.name === preferredName);
    if (chosen) return chosen;
  }
  for (const want of lang === 'nl' ? ['nl-be', 'nl-nl'] : ['en-gb', 'en-us']) {
    const v = list.find((x) => code(x.lang) === want);
    if (v) return v;
  }
  return list[0] ?? null;
}

export function accentOf(voice) {
  if (!voice) return null;
  const c = code(voice.lang);
  if (c === 'nl-be') return 'be';
  return c.startsWith('nl') ? 'nl' : 'other';
}

export function getVoices(timeoutMs = 1500) {
  const synth = globalThis.speechSynthesis;
  if (!synth) return Promise.resolve([]);
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener?.('voiceschanged', done, { once: true });
    setTimeout(done, timeoutMs);
  });
}

export function speak(text, { voice = null, lang = 'nl-BE', rate = 1 } = {}) {
  const synth = globalThis.speechSynthesis;
  if (!synth || !text) return Promise.resolve();
  synth.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? lang;
    u.rate = rate;
    // Safari sometimes never fires onend; never wait forever.
    const limit = setTimeout(resolve, 2000 + (text.length * 120) / rate);
    u.onend = u.onerror = () => { clearTimeout(limit); resolve(); };
    synth.speak(u);
  });
}

export function canRecord() {
  return Boolean(globalThis.navigator?.mediaDevices?.getUserMedia && globalThis.MediaRecorder);
}

// iPhone sometimes never sends MediaRecorder's stop event, or stops the recorder by itself.
// So stopping never waits for that event alone: after stopWaitMs the microphone is released
// and the recording is returned anyway, built from the data that arrived every second.
export async function startRecording({ media = globalThis.navigator?.mediaDevices, Recorder = globalThis.MediaRecorder, stopWaitMs = 1500 } = {}) {
  const stream = await media.getUserMedia({ audio: true });
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => Recorder.isTypeSupported?.(t)) ?? '';
  const recorder = new Recorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start(1000);
  let stopped = null;
  return {
    stop() {
      stopped ??= new Promise((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: recorder.mimeType || type || 'audio/webm' }));
        };
        const timer = setTimeout(finish, stopWaitMs);
        recorder.onstop = finish;
        if (recorder.state === 'inactive') return finish();
        try { recorder.stop(); } catch { finish(); }
      });
      return stopped;
    },
  };
}

const Recognition = (g = globalThis) => g.SpeechRecognition ?? g.webkitSpeechRecognition;
const failure = (codeName) => Object.assign(new Error(codeName), { code: codeName });

// iPhone home-screen apps have the API, but it never works there (WebKit bug 225298): it reports
// "no microphone" or hangs with the microphone on. So it counts as not available.
export function canRecognise(g = globalThis) {
  return Boolean(Recognition(g)) && g.navigator?.standalone !== true;
}

// Whole-sentence guesses: every guess for one part, joined with the best guess for the other parts.
function sentences(parts) {
  if (!parts.length) return [];
  const most = Math.max(...parts.map((p) => p.length));
  return Array.from({ length: most }, (_, k) => parts.map((p) => p[k] ?? p[0]).join(' ').trim());
}

// Listens through pauses (learners stop to think mid-sentence; browsers would end at the first
// pause) until stop() is called or maxMs passes. onHeard gets the sentence so far after every
// pause, so the caller can stop once the whole target was heard. iPhone sometimes never sends
// 'end': stop() then waits at most endWaitMs and aborts, so the microphone is always released.
export function listen(lang, { Recognition: R = Recognition(), maxMs = 30000, endWaitMs = 2000, onHeard } = {}) {
  if (!R) throw failure('not-available');
  const r = new R();
  r.lang = lang;
  r.continuous = true;
  r.interimResults = false;
  r.maxAlternatives = 5;
  const parts = [];
  let error = null;
  let limit = null;
  let endWait = null;
  let finished = false;
  let finish;
  const done = new Promise((resolve, reject) => {
    finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(limit);
      clearTimeout(endWait);
      try { r.abort?.(); } catch { /* already ended */ }
      if (error && !parts.length) reject(failure(error));
      else resolve(sentences(parts));
    };
  });
  r.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) parts.push(Array.from({ length: res.length }, (_, k) => res[k].transcript.trim()));
    }
    onHeard?.(sentences(parts));
  };
  r.onerror = (e) => { error = e.error; };
  r.onend = () => finish();
  const session = {
    done,
    stop() {
      if (!endWait) {
        endWait = setTimeout(finish, endWaitMs);
        try { r.stop(); } catch { finish(); }
      }
      return done;
    },
  };
  limit = setTimeout(() => session.stop(), maxMs);
  try { r.start(); } catch { error = 'start-failed'; finish(); }
  return session;
}

export function startTranscript(lang) {
  const R = Recognition();
  if (!R) throw failure('not-available');
  const r = new R();
  r.lang = lang;
  r.continuous = true;
  r.interimResults = false;
  const parts = [];
  let error = null;
  r.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) parts.push(e.results[i][0].transcript);
  };
  r.onerror = (e) => { error = e.error; };
  const ended = new Promise((resolve) => { r.onend = resolve; });
  r.start();
  return {
    async stop() {
      r.stop();
      await ended;
      if (error && !parts.length) throw failure(error);
      return parts.join(' ').trim();
    },
  };
}
