const code = (lang) => String(lang ?? '').replace('_', '-').toLowerCase();

export function voicesFor(voices, lang) {
  return voices.filter((v) => code(v.lang).startsWith(lang));
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

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start();
  return {
    stop: () => new Promise((resolve) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: recorder.mimeType || type || 'audio/webm' }));
      };
      recorder.stop();
    }),
  };
}

const Recognition = () => globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition;
const failure = (codeName) => Object.assign(new Error(codeName), { code: codeName });

export function canRecognise() {
  return Boolean(Recognition());
}

export function recognise(lang) {
  return new Promise((resolve, reject) => {
    const R = Recognition();
    if (!R) return reject(failure('not-available'));
    const r = new R();
    r.lang = lang;
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 5;
    let alternatives = [];
    r.onresult = (e) => {
      const res = e.results[0];
      alternatives = Array.from({ length: res.length }, (_, i) => res[i].transcript);
    };
    r.onerror = (e) => reject(failure(e.error));
    r.onend = () => resolve(alternatives);
    r.start();
  });
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
