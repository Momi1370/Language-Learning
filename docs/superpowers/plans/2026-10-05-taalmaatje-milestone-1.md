# Taalmaatje Milestone 1 (App + Week 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working, installable web app with the full daily-session engine and Week 1 of the Dutch and English course, deployed on GitHub Pages, so the learner can start using it every day.

**Architecture:** A static PWA in plain HTML, CSS and ES modules, with no build step. Pure logic modules (`session`, `srs`, `cards`, `match`, `store`, `content`) are unit-tested with `node:test`. Browser-only modules (`speech`, `diary`) and UI screens (`js/ui/*`) are checked with a headless-Chrome smoke test and by hand. Course content lives in JSON files checked by a schema validator. One context object (`ctx`, built in `js/app.js`) is passed to every screen.

**Tech Stack:** HTML, CSS, JavaScript ES modules; ts-fsrs 5.4.2 (bundled into `vendor/`); Web Speech API (speech synthesis + recognition); MediaRecorder; IndexedDB; localStorage; Service Worker; Node 22 (`node:test`) for tests and tools; headless Google Chrome for the smoke test; GitHub Pages for hosting.

**Spec:** `docs/superpowers/specs/2026-10-05-taalmaatje-course-design.md`

**Scope of this plan:** Milestone 1 only (spec §9.1), plus the speaking diary (moved into milestone 1 by the spec's decisions log). Weeks 2–12 content gets its own plan after the learner has used Week 1, so their feedback can shape it.

## Global Constraints

- Plain HTML, CSS and ES modules. **No build step, no framework.**
- The only runtime dependency is **ts-fsrs 5.4.2**, bundled as `vendor/ts-fsrs.mjs` (MIT).
- Tools and tests: **Node ≥ 22**, `node:test`, **no npm dependencies**.
- All URLs are **relative** (the site is served under `/Language-Learning/`).
- Device storage only: localStorage key **`taalmaatje.v1`**, IndexedDB database **`taalmaatje`**, store **`diary`**.
- Session blocks and minutes: **cards 5, sound 3, listen 6, speak 7, grammar 4, english 12** (≈37 min).
- Dutch voice: prefer **nl-BE** ("Ellen"), fall back to nl-NL. Recognition: **nl-BE → nl-NL**, **en-GB → en-US**.
- Speech recognition is always presented as a **"was it understood?" check, never a score**.
- Farsi hints are **on by default**, shown **right-to-left**.
- Content: **Belgian Standard Dutch** for speaking; informal forms marked `"register": "informal"`; **no employer names or personal details**; **no text from CVO / Zo Gezegd materials**; Limburg forms only if listed with a source in `content/SOURCES.md`.
- Ear-quiz pairs must be two **different spellings**.
- Must work from **320 px** wide, in light and dark mode.
- Repo is public: **MIT licence** + `THIRD_PARTY_NOTICES.md` for woorden and ts-fsrs.

## Review Focus

1. **Finishing Week 1 before Week 2 exists.** The app must show "Week 2 is coming soon" with Cards still usable, not a blank page or crash. Pinned by `test/content.test.mjs` ("missing week") and the smoke check `set-position week=2` in Task 15.
2. **Offline after install.** A JS file missing from the service worker's list breaks the app offline. Pinned by `test/sw.test.mjs` in Task 14.
3. **No microphone or speech recognition** (permission denied, Firefox, headless). Screens must still render and explain, never throw. Pinned by the smoke test (headless Chrome has no recognition) in Task 15; widgets return `null`/a message when unsupported (Task 10).
4. **Opening the Cards screen several times in one session** must not add the extra words again. Pinned by the `introduceExtraWords` idempotence test in Task 6.
5. **Broken saved data or a wrong backup file** must not crash the app. Pinned by the `migrate` and `parseImport` tests in Task 7.

---

## File Structure

```
index.html                  App page (header, <main id="app">, tab bar)
manifest.webmanifest        PWA manifest
sw.js                       Service worker: network-first + offline cache
.nojekyll                   Serve files as-is on GitHub Pages
package.json                Scripts: test, validate, smoke, serve
LICENSE                     MIT (project)
THIRD_PARTY_NOTICES.md      woorden + ts-fsrs licences
README.md                   What it is, how to install on iPhone, dev commands
css/app.css                 All styles (tokens, light/dark, mobile first)
icons/icon.svg, icon-192.png, icon-512.png
vendor/ts-fsrs.mjs          ts-fsrs 5.4.2 ESM build (unchanged)
js/srs.js                   FSRS wrapper (plain JSON cards)
js/match.js                 Compare recognised text with a target, word by word
js/session.js               Build a session from (week, session) + content; position; streak
js/cards.js                 Deck logic: introduce, grade, due queue, my phrases, card views
js/store.js                 State shape, localStorage store, export/import
js/diary.js                 IndexedDB speaking diary (memory fallback)
js/content.js               Load week/words JSON; "missing week" detection
js/speech.js                Voices, text-to-speech, recording, recognition
js/app.js                   ctx, routing, boot
js/ui/dom.js                h(), button(), fa()
js/ui/widgets.js            speakable(), sayItCheck(), recorder(), transcriptWidget(), cardDetails(), doneBar()
js/ui/today.js              Today screen
js/ui/cards.js              Cards screen + My phrases
js/ui/sound.js              Sound of the week (also used by English)
js/ui/shadow.js             Listen & shadow
js/ui/limburg.js            Limburg ear
js/ui/speak.js              Speak / speaking diary (speakTask also used by English)
js/ui/grammar.js            Grammar
js/ui/english.js            English block
js/ui/roleplay.js           Role-play prompts
js/ui/progress.js           Progress
js/ui/settings.js           Settings, backup, reset
content/nl/week-01.json     Dutch week 1
content/en/week-01.json     English week 1
content/words.json          1,946 extra words (from woorden)
content/SOURCES.md          Sources for Limburg / Belgian forms
tools/schema.mjs            validateWeek(), validateWords()
tools/validate.mjs          Validate all content files (CLI)
tools/import-woorden.mjs    Build content/words.json from woorden's index.html
tools/smoke.mjs             Headless-Chrome smoke test
tools/set-position.html     Test helper: set course position, then open the app
tools/icon.html             Renders icon.svg for PNG export
test/*.test.mjs, test/fixtures.mjs
```

---

### Task 1: Project scaffold, ts-fsrs bundle, licences, `srs.js`

**Files:**
- Create: `package.json`, `.gitignore`, `.nojekyll`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `vendor/ts-fsrs.mjs`, `js/srs.js`
- Test: `test/srs.test.mjs`

**Interfaces:**
- Produces: `Grade = {Again:1, Hard:2, Good:3, Easy:4}`; `newCard(now?: Date) → Card`; `review(card: Card, grade: number, now?: Date) → Card`; `isDue(card: Card, now?: Date) → boolean`; `isLearned(card: Card) → boolean`. `Card` is a plain JSON object (dates as ISO strings) with at least `due: string`, `reps: number`, `state: number`.

- [ ] **Step 1: Create the scaffold files**

`package.json`:
```json
{
  "name": "taalmaatje",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/*.test.mjs",
    "validate": "node tools/validate.mjs",
    "smoke": "node tools/smoke.mjs",
    "serve": "python3 -m http.server 8080"
  }
}
```

`.gitignore`:
```
.DS_Store
node_modules/
taalmaatje-backup-*.json
```

`.nojekyll`: empty file.

`LICENSE`:
```
MIT License

Copyright (c) 2026 Momi1370

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Bundle ts-fsrs 5.4.2 and write the notices**

```bash
TMP=$(mktemp -d) && (cd "$TMP" && npm pack ts-fsrs@5.4.2 -q && tar xzf ts-fsrs-5.4.2.tgz)
mkdir -p vendor && cp "$TMP/package/dist/index.mjs" vendor/ts-fsrs.mjs
ls "$TMP/package"   # find the licence file name (LICENSE or LICENSE.md)
grep -c "^import" vendor/ts-fsrs.mjs   # expect 0: the build has no imports
```

Create `THIRD_PARTY_NOTICES.md`. It has a `## ts-fsrs 5.4.2 (vendor/ts-fsrs.mjs)` section with the full text of the package's licence file (copy it verbatim from `$TMP/package/`), and a `## woorden (content/words.json)` section with:
```
Source: https://github.com/iamsergeyka/woorden

MIT License

Copyright (c) 2026 iamsergeyka

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Write the failing test** — `test/srs.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCard, review, isDue, isLearned, Grade } from '../js/srs.js';

const now = new Date('2026-10-05T10:00:00Z');

test('a new card is due immediately and not learned', () => {
  const c = newCard(now);
  assert.equal(isDue(c, now), true);
  assert.equal(isLearned(c), false);
});

test('cards are plain JSON (dates are strings)', () => {
  const c = newCard(now);
  assert.equal(typeof c.due, 'string');
  assert.deepEqual(JSON.parse(JSON.stringify(c)), c);
});

test('Good moves the due date into the future and marks the card learned', () => {
  const c = review(newCard(now), Grade.Good, now);
  assert.ok(new Date(c.due) > now);
  assert.equal(isLearned(c), true);
});

test('after two Good reviews the card is not due now but is due next year', () => {
  let c = review(newCard(now), Grade.Good, now);
  c = review(c, Grade.Good, new Date(c.due));
  assert.equal(isDue(c, now), false);
  assert.equal(isDue(c, new Date('2027-10-05T00:00:00Z')), true);
});

test('Again keeps the card due within one day', () => {
  const c = review(newCard(now), Grade.Again, now);
  assert.ok(new Date(c.due) - now < 24 * 3600 * 1000);
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `node --test test/srs.test.mjs`
Expected: FAIL, `Cannot find module '.../js/srs.js'`.

- [ ] **Step 5: Implement** — `js/srs.js`

```js
import { fsrs, generatorParameters, createEmptyCard, Rating } from '../vendor/ts-fsrs.mjs';

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export const Grade = Object.freeze({
  Again: Rating.Again,
  Hard: Rating.Hard,
  Good: Rating.Good,
  Easy: Rating.Easy,
});

const plain = (card) => JSON.parse(JSON.stringify(card));

export function newCard(now = new Date()) {
  return plain(createEmptyCard(now));
}

export function review(card, grade, now = new Date()) {
  return plain(scheduler.next(card, now, grade).card);
}

export function isDue(card, now = new Date()) {
  return new Date(card.due).getTime() <= now.getTime();
}

export function isLearned(card) {
  return card.reps > 0;
}
```

- [ ] **Step 6: Run the test to see it pass**

Run: `node --test test/srs.test.mjs`
Expected: 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore .nojekyll LICENSE THIRD_PARTY_NOTICES.md vendor/ts-fsrs.mjs js/srs.js test/srs.test.mjs
git commit -m "feat: scaffold project, bundle ts-fsrs, add FSRS wrapper"
```

---

### Task 2: Content schema validator

**Files:**
- Create: `tools/schema.mjs`, `tools/validate.mjs`, `test/fixtures.mjs`
- Test: `test/schema.test.mjs`

**Interfaces:**
- Produces: `validateWeek(data, {lang: 'nl'|'en', week: number}) → string[]` (empty = valid); `validateWords(words) → string[]`; `MINIMUMS`. Test fixtures `validNl()` and `validEn()` return complete minimal week objects (Dutch: 25 chunks, 2 dialogues × 8 lines, 5 speaking, 15 grammar items, 6 Limburg pairs, 6 sound pairs; English: 15 chunks, 5 speaking, 6 sound pairs). Later tasks use these fixtures.

- [ ] **Step 1: Write the fixtures** — `test/fixtures.mjs`

```js
const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const pad = (n) => String(n + 1).padStart(3, '0');

const sound = (lang) => ({
  id: `${lang}-test`, title: 'a or aa?', explain: 'Long and short.', anchor: 'Length is the key.',
  pairs: rep(6, (i) => [`man${i}`, `maan${i}`]),
});
const speaking = (lang) => rep(5, (i) => ({
  id: `${lang}-01-s${i + 1}`, prompt: 'Vertel iets.', frames: ['Ik ben …', 'Ik werk …'], model: 'Ik ben Amir.', seconds: 90,
}));
const roleplay = () => ({ title: 'Koffie', prompt: 'x'.repeat(120) });

export function validNl() {
  return {
    lang: 'nl', week: 1, theme: 'Thema', themeEn: 'Theme', mission: 'Doe iets.',
    sound: sound('nl'), roleplay: roleplay(), speaking: speaking('nl'),
    chunks: rep(25, (i) => ({ id: `nl-01-${pad(i)}`, text: `zin ${i}`, en: `sentence ${i}`, article: null })),
    dialogues: rep(2, (d) => ({
      id: `nl-01-d${d}`, title: `Dialoog ${d}`,
      lines: rep(8, (i) => ({ speaker: i % 2 ? 'B' : 'A', text: `regel ${d}-${i}`, en: `line ${d}-${i}` })),
    })),
    grammar: { id: 'v2', title: 'Verb second', explain: 'The verb is in place 2.', fa: 'فعل', items: rep(15, (i) => ({ prompt: `p${i}`, answer: `a${i}` })) },
    limburg: rep(6, (i) => ({ standard: `s${i}`, everyday: `e${i}`, note: 'n' })),
  };
}

export function validEn() {
  return {
    lang: 'en', week: 1, theme: 'Introducing yourself', themeEn: 'Introducing yourself', mission: 'Do it.',
    sound: sound('en'), roleplay: roleplay(), speaking: speaking('en'),
    chunks: rep(15, (i) => ({ id: `en-01-${pad(i)}`, text: `phrase ${i}`, en: `use ${i}` })),
  };
}
```

- [ ] **Step 2: Write the failing test** — `test/schema.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWeek, validateWords } from '../tools/schema.mjs';
import { validNl, validEn } from './fixtures.mjs';

const nl = { lang: 'nl', week: 1 };
const en = { lang: 'en', week: 1 };
const has = (errors, text) => errors.some((e) => e.includes(text));

test('a complete Dutch week has no errors', () => assert.deepEqual(validateWeek(validNl(), nl), []));
test('a complete English week has no errors', () => assert.deepEqual(validateWeek(validEn(), en), []));

test('too few chunks is reported', () => {
  const w = validNl(); w.chunks.pop();
  assert.ok(has(validateWeek(w, nl), 'chunks needs at least 25'));
});

test('a Dutch chunk without article is reported', () => {
  const w = validNl(); delete w.chunks[0].article;
  assert.ok(has(validateWeek(w, nl), 'chunks[0].article'));
});

test('an English chunk with an article is reported', () => {
  const w = validEn(); w.chunks[0].article = 'de';
  assert.ok(has(validateWeek(w, en), 'article is only for Dutch'));
});

test('a duplicate chunk id is reported', () => {
  const w = validNl(); w.chunks[1].id = w.chunks[0].id;
  assert.ok(has(validateWeek(w, nl), 'used twice'));
});

test('a chunk id from another week is reported', () => {
  const w = validNl(); w.chunks[0].id = 'nl-02-001';
  assert.ok(has(validateWeek(w, nl), 'chunks[0].id must look like nl-01-001'));
});

test('a speaking prompt without model answer is reported', () => {
  const w = validEn(); delete w.speaking[2].model;
  assert.ok(validateWeek(w, en).includes('speaking[2].model is required'));
});

test('a sound pair with the same spelling is reported', () => {
  const w = validEn(); w.sound.pairs[0] = ['present', 'Present'];
  assert.ok(has(validateWeek(w, en), 'spelled differently'));
});

test('wrong week number is reported', () => {
  assert.ok(validateWeek(validNl(), { lang: 'nl', week: 2 }).includes('week must be 2'));
});

test('Dutch-only parts are required for Dutch', () => {
  const w = validNl(); delete w.limburg; delete w.grammar;
  const errors = validateWeek(w, nl);
  assert.ok(has(errors, 'limburg needs at least 6'));
  assert.ok(has(errors, 'grammar needs id, title and explain'));
});

test('a dialogue with too few lines is reported', () => {
  const w = validNl(); w.dialogues[0].lines.length = 7;
  assert.ok(has(validateWeek(w, nl), 'dialogues[0] needs 8–12 lines'));
});

test('words: bad id and bad article are reported', () => {
  const errors = validateWords([
    { id: 'w-0001', text: 'de afspraak', article: 'de', en: 'appointment' },
    { id: 'x', text: 'het huis', article: 'het', en: 'house' },
    { id: 'w-0003', text: 'lopen', article: 'the', en: 'to walk' },
  ]);
  assert.equal(errors.length, 2);
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `node --test test/schema.test.mjs`
Expected: FAIL, `Cannot find module '.../tools/schema.mjs'`.

- [ ] **Step 4: Implement** — `tools/schema.mjs`

```js
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const REGISTERS = ['informal', 'neutral', 'formal'];

export const MINIMUMS = {
  nl: { chunks: 25, speaking: 5, grammarItems: 15, limburg: 6, soundPairs: 6, dialogues: 2 },
  en: { chunks: 15, speaking: 5, soundPairs: 6 },
};

export function validateWeek(data, { lang, week }) {
  const errors = [];
  const err = (msg) => errors.push(msg);
  if (!data || typeof data !== 'object') return ['file is not a JSON object'];
  const min = MINIMUMS[lang];
  if (!min) return [`unknown language "${lang}"`];
  if (data.lang !== lang) err(`lang must be "${lang}"`);
  if (data.week !== week) err(`week must be ${week}`);
  for (const key of ['theme', 'themeEn', 'mission']) if (!isText(data[key])) err(`${key} is required`);

  const s = data.sound;
  if (!s) err('sound is required');
  else {
    for (const key of ['id', 'title', 'explain', 'anchor']) if (!isText(s[key])) err(`sound.${key} is required`);
    if (!Array.isArray(s.pairs) || s.pairs.length < min.soundPairs) err(`sound.pairs needs at least ${min.soundPairs}`);
    else s.pairs.forEach((p, i) => {
      if (!Array.isArray(p) || p.length !== 2 || !isText(p[0]) || !isText(p[1])) err(`sound.pairs[${i}] must be two words`);
      else if (p[0].trim().toLowerCase() === p[1].trim().toLowerCase()) err(`sound.pairs[${i}] words must be spelled differently`);
    });
  }

  const prefix = `${lang}-${String(week).padStart(2, '0')}-`;
  const idPattern = new RegExp(`^${prefix}\\d{3}$`);
  const ids = new Set();
  if (!Array.isArray(data.chunks) || data.chunks.length < min.chunks) err(`chunks needs at least ${min.chunks}`);
  for (const [i, c] of (data.chunks ?? []).entries()) {
    const where = `chunks[${i}]`;
    if (!isText(c.id) || !idPattern.test(c.id)) err(`${where}.id must look like ${prefix}001`);
    else if (ids.has(c.id)) err(`${where}.id "${c.id}" is used twice`);
    else ids.add(c.id);
    if (!isText(c.text)) err(`${where}.text is required`);
    if (!isText(c.en)) err(`${where}.en is required`);
    if (lang === 'nl' && !('article' in c && [null, 'de', 'het'].includes(c.article))) err(`${where}.article must be "de", "het" or null`);
    if (lang === 'en' && 'article' in c) err(`${where}.article is only for Dutch`);
    if ('fa' in c && !isText(c.fa)) err(`${where}.fa must be text`);
    if ('register' in c && !REGISTERS.includes(c.register)) err(`${where}.register must be one of ${REGISTERS.join(', ')}`);
    if ('stress' in c && !(Array.isArray(c.stress) && c.stress.every(isText))) err(`${where}.stress must be a list of text`);
  }

  if (!Array.isArray(data.speaking) || data.speaking.length < min.speaking) err(`speaking needs at least ${min.speaking}`);
  for (const [i, p] of (data.speaking ?? []).entries()) {
    const where = `speaking[${i}]`;
    if (!isText(p.id)) err(`${where}.id is required`);
    if (!isText(p.prompt)) err(`${where}.prompt is required`);
    if (!Array.isArray(p.frames) || p.frames.length < 2 || !p.frames.every(isText)) err(`${where}.frames needs at least 2`);
    if (!isText(p.model)) err(`${where}.model is required`);
    if (!Number.isInteger(p.seconds) || p.seconds < 30 || p.seconds > 180) err(`${where}.seconds must be 30–180`);
  }

  const r = data.roleplay;
  if (!r || !isText(r.title) || !isText(r.prompt) || r.prompt.length < 100) err('roleplay needs a title and a prompt of at least 100 characters');

  if (lang === 'nl') {
    if (!Array.isArray(data.dialogues) || data.dialogues.length < min.dialogues) err(`dialogues needs at least ${min.dialogues}`);
    for (const [i, d] of (data.dialogues ?? []).entries()) {
      if (!isText(d.id) || !isText(d.title)) err(`dialogues[${i}] needs id and title`);
      if (!Array.isArray(d.lines) || d.lines.length < 8 || d.lines.length > 12) err(`dialogues[${i}] needs 8–12 lines`);
      for (const [k, l] of (d.lines ?? []).entries()) {
        if (!isText(l.speaker) || !isText(l.text) || !isText(l.en)) err(`dialogues[${i}].lines[${k}] needs speaker, text and en`);
      }
    }
    const g = data.grammar;
    if (!g || !isText(g.id) || !isText(g.title) || !isText(g.explain)) err('grammar needs id, title and explain');
    if (!g || !Array.isArray(g.items) || g.items.length < min.grammarItems) err(`grammar.items needs at least ${min.grammarItems}`);
    for (const [i, it] of (g?.items ?? []).entries()) {
      if (!isText(it.prompt) || !isText(it.answer)) err(`grammar.items[${i}] needs prompt and answer`);
    }
    if (!Array.isArray(data.limburg) || data.limburg.length < min.limburg) err(`limburg needs at least ${min.limburg}`);
    for (const [i, l] of (data.limburg ?? []).entries()) {
      if (!isText(l.standard) || !isText(l.everyday) || !isText(l.note)) err(`limburg[${i}] needs standard, everyday and note`);
    }
  }
  return errors;
}

export function validateWords(words) {
  if (!Array.isArray(words)) return ['words.json must be a list'];
  const errors = [];
  const ids = new Set();
  words.forEach((w, i) => {
    if (!/^w-\d{4}$/.test(w.id ?? '')) errors.push(`words[${i}].id must look like w-0001`);
    else if (ids.has(w.id)) errors.push(`words[${i}].id "${w.id}" is used twice`);
    else ids.add(w.id);
    if (!isText(w.text) || !isText(w.en)) errors.push(`words[${i}] needs text and en`);
    if (![null, 'de', 'het'].includes(w.article)) errors.push(`words[${i}].article must be "de", "het" or null`);
  });
  return errors;
}
```

- [ ] **Step 5: Implement the CLI** — `tools/validate.mjs`

```js
import { readFile, readdir } from 'node:fs/promises';
import { validateWeek, validateWords } from './schema.mjs';

const root = new URL('../content/', import.meta.url);
let failed = false;
const report = (file, errors) => {
  if (!errors.length) return console.log(`✓ ${file}`);
  failed = true;
  console.error(`✗ ${file}`);
  for (const e of errors) console.error(`   - ${e}`);
};

const seen = new Map();
for (const lang of ['nl', 'en']) {
  const dir = new URL(`${lang}/`, root);
  const files = (await readdir(dir).catch(() => [])).filter((f) => /^week-\d\d\.json$/.test(f)).sort();
  for (const file of files) {
    const name = `${lang}/${file}`;
    let data;
    try { data = JSON.parse(await readFile(new URL(file, dir), 'utf8')); }
    catch (e) { report(name, [`invalid JSON: ${e.message}`]); continue; }
    const errors = validateWeek(data, { lang, week: Number(file.slice(5, 7)) });
    for (const c of data.chunks ?? []) {
      if (seen.has(c.id) && seen.get(c.id) !== name) errors.push(`chunk id ${c.id} is also used in ${seen.get(c.id)}`);
      seen.set(c.id, name);
    }
    report(name, errors);
  }
}

try { report('words.json', validateWords(JSON.parse(await readFile(new URL('words.json', root), 'utf8')))); }
catch (e) { report('words.json', [`cannot read: ${e.message}`]); }

process.exit(failed ? 1 : 0);
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `node --test test/schema.test.mjs`
Expected: 13 tests pass.

- [ ] **Step 7: Commit**

```bash
git add tools/schema.mjs tools/validate.mjs test/fixtures.mjs test/schema.test.mjs
git commit -m "feat: add content schema validator"
```

---

### Task 3: Import the woorden word list

**Files:**
- Create: `tools/import-woorden.mjs`, `content/words.json` (generated)
- Test: `test/import-woorden.test.mjs`

**Interfaces:**
- Produces: `extractSeed(html: string) → any[][]`; `toWords(seed) → Word[]` where `Word = {id: 'w-0001', text, article: 'de'|'het'|null, en, pos, example}`. `content/words.json` holds 1,946 `Word`s.

- [ ] **Step 1: Write the failing test** — `test/import-woorden.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSeed, toWords } from '../tools/import-woorden.mjs';

const html = `<script>
const SEED = [
  ["de afspraak","de","встреча","appointment","zn","Ik heb een afspraak [morgen]."],
  ["bespreken",null,"обсуждать","to discuss","ww","We bespreken het.",{vt:"besprak"}]
];
const OTHER = [1];
</script>`;

test('extractSeed reads the SEED list, even with brackets inside strings', () => {
  const seed = extractSeed(html);
  assert.equal(seed.length, 2);
  assert.equal(seed[0][5], 'Ik heb een afspraak [morgen].');
});

test('toWords keeps Dutch, article, English, part of speech and example; drops Russian', () => {
  assert.deepEqual(toWords(extractSeed(html)), [
    { id: 'w-0001', text: 'de afspraak', article: 'de', en: 'appointment', pos: 'zn', example: 'Ik heb een afspraak [morgen].' },
    { id: 'w-0002', text: 'bespreken', article: null, en: 'to discuss', pos: 'ww', example: 'We bespreken het.' },
  ]);
});

test('extractSeed fails clearly when there is no SEED', () => {
  assert.throws(() => extractSeed('<p>nothing</p>'), /SEED list not found/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/import-woorden.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** — `tools/import-woorden.mjs`

```js
// Usage: node tools/import-woorden.mjs <path to woorden/index.html>
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

export function extractSeed(html) {
  const at = html.indexOf('const SEED');
  if (at < 0) throw new Error('SEED list not found');
  const start = html.indexOf('[', at);
  let depth = 0;
  let quote = null;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) return vm.runInNewContext(`(${html.slice(start, i + 1)})`);
  }
  throw new Error('SEED list is not closed');
}

export function toWords(seed) {
  return seed.map(([text, article, , en, pos, example], i) => ({
    id: `w-${String(i + 1).padStart(4, '0')}`,
    text,
    article: article ?? null,
    en,
    pos,
    example,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const words = toWords(extractSeed(await readFile(process.argv[2], 'utf8')));
  const out = '[\n' + words.map((w) => JSON.stringify(w)).join(',\n') + '\n]\n';
  await writeFile(new URL('../content/words.json', import.meta.url), out);
  console.log(`wrote ${words.length} words`);
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test test/import-woorden.test.mjs`
Expected: 3 tests pass.

- [ ] **Step 5: Generate `content/words.json`**

```bash
TMP=$(mktemp -d) && git clone --depth 1 -q https://github.com/iamsergeyka/woorden "$TMP/woorden"
mkdir -p content && node tools/import-woorden.mjs "$TMP/woorden/index.html"
```
Expected: `wrote 1946 words`.

- [ ] **Step 6: Commit**

```bash
git add tools/import-woorden.mjs test/import-woorden.test.mjs content/words.json
git commit -m "feat: import woorden word list as extra deck"
```

---

### Task 4: Week 1 content (Dutch + English) and sources

**Files:**
- Create: `content/nl/week-01.json`, `content/en/week-01.json`, `content/SOURCES.md`
- Test: `test/content-files.test.mjs`

**Interfaces:**
- Consumes: `validateWeek` (Task 2).
- Produces: the two week files in the schema of spec §5.4.

- [ ] **Step 1: Write the failing test** — `test/content-files.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { validateWeek, validateWords } from '../tools/schema.mjs';

const read = async (p) => JSON.parse(await readFile(new URL(`../content/${p}`, import.meta.url), 'utf8'));

for (const lang of ['nl', 'en']) {
  test(`every ${lang} week file is valid`, async () => {
    const files = (await readdir(new URL(`../content/${lang}/`, import.meta.url))).filter((f) => /^week-\d\d\.json$/.test(f));
    assert.ok(files.length >= 1, 'at least week 1 exists');
    for (const f of files) assert.deepEqual(validateWeek(await read(`${lang}/${f}`), { lang, week: Number(f.slice(5, 7)) }), [], f);
  });
}

test('words.json is valid and has 1946 words', async () => {
  const words = await read('words.json');
  assert.deepEqual(validateWords(words), []);
  assert.equal(words.length, 1946);
});

test('every Limburg form in week files is listed in SOURCES.md', async () => {
  const sources = await readFile(new URL('../content/SOURCES.md', import.meta.url), 'utf8');
  const files = (await readdir(new URL('../content/nl/', import.meta.url))).filter((f) => f.endsWith('.json'));
  for (const f of files) for (const l of (await read(`nl/${f}`)).limburg) assert.ok(sources.includes(l.everyday), `${l.everyday} has no source`);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/content-files.test.mjs`
Expected: FAIL, `ENOENT ... content/nl/`.

- [ ] **Step 3: Write** `content/nl/week-01.json`

```json
{
  "lang": "nl",
  "week": 1,
  "theme": "Mezelf voorstellen op het werk",
  "themeEn": "Introducing yourself at work, small talk",
  "sound": {
    "id": "nl-a-aa",
    "title": "a or aa? (man – maan)",
    "explain": "Dutch has a short a (man, tak, stad) and a long aa (maan, taak, staat). The difference changes the meaning: ‘man’ is a man, ‘maan’ is the moon. Make the short a really short and quick. Make aa long and open, and hold it a little.",
    "anchor": "Length is the key. Think of «آ», but keep your lips relaxed (not round): hold it for aa, cut it short for a.",
    "fa": "در هلندی طول صدا معنی را عوض می‌کند: man یعنی مرد و maan یعنی ماه. a کوتاه و سریع است؛ aa کشیده است. شبیه «آ» است ولی لب‌ها گرد نمی‌شوند.",
    "pairs": [["man", "maan"], ["tak", "taak"], ["stad", "staat"], ["bal", "baal"], ["hak", "haak"], ["ram", "raam"], ["zat", "zaad"]]
  },
  "chunks": [
    { "id": "nl-01-001", "text": "Goeiemorgen!", "en": "Good morning! (the usual Flemish greeting until about noon)", "article": null },
    { "id": "nl-01-002", "text": "Hoe gaat het met u?", "en": "How are you? (polite)", "article": null, "register": "formal", "fa": "u مؤدبانه است، مثل «شما». با همکار جدید یا رئیس از u استفاده کن؛ با همکاران نزدیک از jij/je." },
    { "id": "nl-01-003", "text": "Alles goed?", "en": "All good? / How's it going?", "article": null, "register": "informal" },
    { "id": "nl-01-004", "text": "Goed, en met jou?", "en": "Fine, and you?", "article": null },
    { "id": "nl-01-005", "text": "Ik ben nieuw hier.", "en": "I'm new here.", "article": null },
    { "id": "nl-01-006", "text": "Ik werk hier sinds maandag.", "en": "I've been working here since Monday.", "article": null, "fa": "درست مثل فارسی: «از دوشنبه اینجا کار می‌کنم» — زمان حال + sinds. لازم نیست بگویی heb gewerkt." },
    { "id": "nl-01-007", "text": "Aangenaam.", "en": "Nice to meet you.", "article": null, "stress": ["aan-ge-NAAM"] },
    { "id": "nl-01-008", "text": "Hoe heet je ook alweer?", "en": "What was your name again?", "article": null, "register": "informal", "fa": "«ook alweer» یعنی «...دوباره؟ یادم رفت». طبیعی و مؤدبانه است." },
    { "id": "nl-01-009", "text": "de collega", "en": "the colleague", "article": "de", "stress": ["col-LE-ga"], "fa": "همکار. جمع: collega's" },
    { "id": "nl-01-010", "text": "Op welke afdeling werk je?", "en": "Which department do you work in?", "article": null },
    { "id": "nl-01-011", "text": "de afdeling", "en": "the department", "article": "de", "stress": ["AF-de-ling"] },
    { "id": "nl-01-012", "text": "Waar werk je aan?", "en": "What are you working on?", "article": null, "fa": "حرف اضافه (aan) می‌تواند آخر جمله بیاید: Waar … aan? = روی چه چیزی؟" },
    { "id": "nl-01-013", "text": "het project", "en": "the project", "article": "het", "stress": ["pro-JECT"] },
    { "id": "nl-01-014", "text": "Kan je dat nog eens herhalen?", "en": "Can you repeat that, please?", "article": null, "stress": ["her-HA-len"], "fa": "مهم‌ترین جمله‌ی این هفته! اگر چیزی را نفهمیدی، این را بگو. هیچ اشکالی ندارد." },
    { "id": "nl-01-015", "text": "Kan je wat trager spreken, alstublieft?", "en": "Could you speak a bit more slowly, please?", "article": null, "fa": "در بلژیک بیشتر «trager» می‌گویند و در هلند بیشتر «langzamer». هر دو درست است." },
    { "id": "nl-01-016", "text": "Ik spreek nog niet zo goed Nederlands.", "en": "My Dutch isn't very good yet.", "article": null },
    { "id": "nl-01-017", "text": "Ik leer elke dag bij.", "en": "I learn something new every day.", "article": null, "fa": "«bijleren» در بلژیک خیلی رایج است = چیز تازه یاد گرفتن." },
    { "id": "nl-01-018", "text": "Hoe was je weekend?", "en": "How was your weekend?", "article": null },
    { "id": "nl-01-019", "text": "Heb je iets leuks gedaan?", "en": "Did you do anything fun?", "article": null, "fa": "بعد از iets، صفت -s می‌گیرد: iets leuks, iets nieuws." },
    { "id": "nl-01-020", "text": "Niet veel, ik heb vooral gerust.", "en": "Not much, I mostly rested.", "article": null },
    { "id": "nl-01-021", "text": "Het weer is weer slecht, hè?", "en": "The weather's bad again, isn't it?", "article": null, "fa": "«hè» در آخر جمله مثل «نه؟» در فارسی است. weer دو معنی دارد: هوا و دوباره!" },
    { "id": "nl-01-022", "text": "Zin in koffie?", "en": "Fancy a coffee?", "article": null, "register": "informal" },
    { "id": "nl-01-023", "text": "Smakelijk!", "en": "Enjoy your meal!", "article": null, "stress": ["SMA-ke-lijk"], "fa": "مثل «نوش جان». در بلژیک همکاران قبل از ناهار به هم می‌گویند." },
    { "id": "nl-01-024", "text": "het bureau", "en": "the office / the desk", "article": "het", "stress": ["bu-REAU"], "fa": "در بلژیک bureau هم یعنی دفتر کار و هم میز کار." },
    { "id": "nl-01-025", "text": "Tot morgen!", "en": "See you tomorrow!", "article": null },
    { "id": "nl-01-026", "text": "Nog een fijne avond!", "en": "Have a nice evening!", "article": null }
  ],
  "dialogues": [
    {
      "id": "nl-01-dA",
      "title": "Eerste dag op het werk",
      "lines": [
        { "speaker": "Lien", "text": "Goeiemorgen! Ben jij de nieuwe collega?", "en": "Good morning! Are you the new colleague?" },
        { "speaker": "Amir", "text": "Ja, goeiemorgen. Ik ben Amir. Aangenaam.", "en": "Yes, good morning. I'm Amir. Nice to meet you." },
        { "speaker": "Lien", "text": "Aangenaam, ik ben Lien. Op welke afdeling werk je?", "en": "Nice to meet you, I'm Lien. Which department do you work in?" },
        { "speaker": "Amir", "text": "Op de afdeling logistiek. Ik werk hier sinds maandag.", "en": "In the logistics department. I've been working here since Monday." },
        { "speaker": "Lien", "text": "Leuk! Dan zien we elkaar vaak. Hoe gaat het tot nu toe?", "en": "Nice! Then we'll see each other often. How's it going so far?" },
        { "speaker": "Amir", "text": "Goed, maar alles is nog nieuw. Ik spreek nog niet zo goed Nederlands.", "en": "Good, but everything is still new. My Dutch isn't very good yet." },
        { "speaker": "Lien", "text": "Geen probleem. Je spreekt al goed, hoor!", "en": "No problem. You already speak well, really!" },
        { "speaker": "Amir", "text": "Dank je. Kan je soms wat trager spreken?", "en": "Thanks. Could you sometimes speak a bit more slowly?" },
        { "speaker": "Lien", "text": "Natuurlijk. Zeg het maar als je iets niet begrijpt.", "en": "Of course. Just tell me if you don't understand something." },
        { "speaker": "Amir", "text": "Dat is fijn. Dank je wel!", "en": "That's nice. Thank you!" }
      ]
    },
    {
      "id": "nl-01-dB",
      "title": "Maandagochtend bij de koffie",
      "lines": [
        { "speaker": "Tom", "text": "Hé Amir, alles goed? Hoe was je weekend?", "en": "Hey Amir, all good? How was your weekend?" },
        { "speaker": "Amir", "text": "Goed, dank je. Zaterdag was ik in het centrum van Hasselt.", "en": "Good, thanks. On Saturday I was in the centre of Hasselt." },
        { "speaker": "Tom", "text": "Leuk! Heb je iets leuks gedaan?", "en": "Nice! Did you do anything fun?" },
        { "speaker": "Amir", "text": "Ik heb een beetje gewandeld. Zondag heb ik vooral gerust. En jij?", "en": "I walked around a bit. On Sunday I mostly rested. And you?" },
        { "speaker": "Tom", "text": "Ik heb gefietst met mijn kinderen. Maar het weer was slecht, hè.", "en": "I went cycling with my kids. But the weather was bad, wasn't it." },
        { "speaker": "Amir", "text": "Ja, het regent hier veel! In mijn land is het warmer.", "en": "Yes, it rains a lot here! In my country it's warmer." },
        { "speaker": "Tom", "text": "Dat geloof ik. Zin in koffie?", "en": "I believe that. Fancy a coffee?" },
        { "speaker": "Amir", "text": "Ja, graag. Met melk, zonder suiker.", "en": "Yes, please. With milk, no sugar." },
        { "speaker": "Tom", "text": "Alstublieft. Tot straks in de vergadering!", "en": "Here you go. See you later in the meeting!" },
        { "speaker": "Amir", "text": "Dank je. Tot straks!", "en": "Thanks. See you later!" }
      ]
    }
  ],
  "speaking": [
    {
      "id": "nl-01-s1",
      "prompt": "Stel jezelf voor aan een nieuwe collega. (Introduce yourself to a new colleague.)",
      "frames": ["Goeiemorgen, ik ben …", "Ik kom uit … en ik woon in …", "Ik werk hier sinds …", "Ik werk op de afdeling …"],
      "model": "Goeiemorgen, ik ben Amir. Aangenaam! Ik kom uit Iran en ik woon nu in Hasselt. Ik werk hier sinds maandag, op de afdeling logistiek. Ik spreek nog niet zo goed Nederlands, maar ik leer elke dag bij.",
      "seconds": 60
    },
    {
      "id": "nl-01-s2",
      "prompt": "Een collega vraagt: ‘Hoe gaat het tot nu toe?’ Vertel hoe je eerste week is. (A colleague asks how it's going so far. Tell them about your first week.)",
      "frames": ["Het gaat goed, maar …", "Alles is nog nieuw voor mij.", "Ik vind het werk …", "Mijn collega's zijn …"],
      "model": "Het gaat goed, dank je. Alles is nog nieuw voor mij, dus ik moet veel vragen. Ik vind het werk interessant. Mijn collega's zijn heel vriendelijk. Soms spreken ze snel, maar dan vraag ik: kan je dat nog eens herhalen?",
      "seconds": 60
    },
    {
      "id": "nl-01-s3",
      "prompt": "Vertel over je weekend. Begin elke zin met een tijdwoord: zaterdag, zondag, ’s avonds. (Tell about your weekend. Start each sentence with a time word, and remember: verb in place 2!)",
      "frames": ["Zaterdag was ik …", "Zondag heb ik …", "’s Avonds …"],
      "model": "Zaterdag was ik in het centrum van Hasselt. Daar heb ik boodschappen gedaan. Zondag heb ik vooral gerust. ’s Avonds heb ik met mijn familie gebeld. Het weer was slecht, dus ik ben thuis gebleven.",
      "seconds": 90
    },
    {
      "id": "nl-01-s4",
      "prompt": "Je begrijpt een collega in een vergadering niet. Vraag beleefd om hulp. Oefen drie manieren. (You don't understand a colleague in a meeting. Ask politely for help, three different ways.)",
      "frames": ["Sorry, kan je dat nog eens herhalen?", "Kan je wat trager spreken, alstublieft?", "Wat bedoel je met …?"],
      "model": "Sorry, ik begrijp het niet helemaal. Kan je dat nog eens herhalen? Dank je. Kan je ook wat trager spreken, alstublieft? Mijn Nederlands is nog niet zo goed. En wat bedoel je met ‘de deadline verschuiven’?",
      "seconds": 60
    },
    {
      "id": "nl-01-s5",
      "prompt": "Mijn eerste minuut in het Nederlands: vertel wie je bent, waar je werkt en waarom je Nederlands leert. (Your first Dutch minute. This recording is saved in your speaking diary.)",
      "frames": ["Ik ben … en ik kom uit …", "Ik woon in … en ik werk …", "Ik leer Nederlands omdat …"],
      "model": "Ik ben Amir en ik kom uit Iran. Ik woon in Hasselt en ik werk op de afdeling logistiek. Ik studeer ook aan de universiteit. Ik leer Nederlands omdat ik met mijn collega's wil praten. Het is soms moeilijk, maar ik leer elke dag bij.",
      "seconds": 60
    }
  ],
  "grammar": {
    "id": "v2",
    "title": "The verb in place 2",
    "explain": "In a Dutch main sentence, the verb (the one that changes with the person) is always in place 2. Place 1 can be the subject, but also a time or place word. If you start with ‘Vandaag’, ‘Zaterdag’ or ‘In Hasselt’, the subject moves AFTER the verb: Ik werk vandaag thuis. → Vandaag werk ik thuis. Say each answer out loud: this one pattern makes you sound natural very fast.",
    "fa": "در جمله‌ی اصلی هلندی، فعل همیشه در جای دوم است. اگر جمله را با زمان یا مکان شروع کنی (Vandaag, Zaterdag, In Hasselt)، فاعل بعد از فعل می‌آید: Vandaag werk ik thuis. در فارسی فعل آخر جمله است، پس این الگو را با صدای بلند تمرین کن تا عادت شود.",
    "items": [
      { "prompt": "Vandaag … (ik / thuis werken)", "answer": "Vandaag werk ik thuis." },
      { "prompt": "Morgen … (wij / een vergadering hebben)", "answer": "Morgen hebben wij een vergadering." },
      { "prompt": "Zaterdag … (ik / naar de markt gaan)", "answer": "Zaterdag ga ik naar de markt." },
      { "prompt": "Nu … (zij / koffie drinken)", "answer": "Nu drinkt zij koffie." },
      { "prompt": "Om negen uur … (ik / beginnen)", "answer": "Om negen uur begin ik." },
      { "prompt": "Elke dag … (ik / Nederlands leren)", "answer": "Elke dag leer ik Nederlands." },
      { "prompt": "Soms … (mijn collega / te snel spreken)", "answer": "Soms spreekt mijn collega te snel." },
      { "prompt": "Na het werk … (ik / naar huis fietsen)", "answer": "Na het werk fiets ik naar huis." },
      { "prompt": "In Hasselt … (het / veel regenen)", "answer": "In Hasselt regent het veel." },
      { "prompt": "Maandag … (jij / naar het bureau komen)", "answer": "Maandag kom jij naar het bureau." },
      { "prompt": "Deze week … (wij / een nieuw project hebben)", "answer": "Deze week hebben wij een nieuw project." },
      { "prompt": "’s Middags … (ik / met mijn collega's eten)", "answer": "’s Middags eet ik met mijn collega's." },
      { "prompt": "Gisteren … (ik / ziek zijn)", "answer": "Gisteren was ik ziek." },
      { "prompt": "Volgende week … (Lien / op vakantie gaan)", "answer": "Volgende week gaat Lien op vakantie." },
      { "prompt": "Daarom … (ik / elke dag oefenen)", "answer": "Daarom oefen ik elke dag." }
    ]
  },
  "limburg": [
    { "standard": "Heb je tijd?", "everyday": "'Ebde gij tijd?", "note": "The gij-system plus a dropped h: ‘hebt gij’ becomes ‘ebde (gij)’. Very common in Flemish everyday speech." },
    { "standard": "Dat weet ik niet.", "everyday": "Da weet ik nie.", "note": "The final -t is often dropped: dat → da, niet → nie, wat → wa." },
    { "standard": "Wat ben je aan het doen?", "everyday": "Wa zijt ge bezig?", "note": "wa = wat, zijt ge = ben je. You will hear this at work." },
    { "standard": "Wacht even.", "everyday": "Waggeffe.", "note": "‘Wacht effe’ said fast: the t disappears. Typical for Limburg." },
    { "standard": "Mooi, hè?", "everyday": "Sjiek, he!?", "note": "In Limburg ‘sjiek’ means nice or cool." },
    { "standard": "Heb je zin?", "everyday": "Hebde goesting?", "note": "‘Goesting’ = zin (feeling like it). A Flemish word that came from old French; not used in the Netherlands." },
    { "standard": "Mijn mobieltje (Netherlands Dutch, like Duolingo)", "everyday": "Mijn gsm", "note": "In Belgium everybody says ‘gsm’. ‘Mobieltje’ is Netherlands Dutch." },
    { "standard": "Wauw! / Tjonge!", "everyday": "Amai!", "note": "A Flemish word for surprise. You will also hear ‘allee’ and ‘awel’." }
  ],
  "roleplay": {
    "title": "Koffie met een nieuwe collega",
    "prompt": "You are Lien, a friendly colleague in an office in Hasselt, Belgium. Speak Belgian Dutch (Flemish) at a simple A2 level: short sentences, a bit slower than normal. I am a new colleague; we meet at the coffee machine on Monday morning. Ask me who I am, which department I work in and how my weekend was. Ask one question at a time and wait for my answer. If I answer in English, kindly ask me to try in Dutch. Do not correct me during the conversation. After about 10 exchanges, stop and give me, in English: (1) three corrections of real mistakes — quote my sentence and give a better version; (2) two things I said well; (3) one useful Flemish phrase for next time. Do not comment on my pronunciation unless you could not understand a word. Start now with: ‘Goeiemorgen! Ben jij de nieuwe collega?’"
  },
  "mission": "Say ‘Smakelijk!’ to your colleagues at lunch, and on Monday ask one colleague: ‘Hoe was je weekend?’"
}
```

- [ ] **Step 4: Write** `content/en/week-01.json`

```json
{
  "lang": "en",
  "week": 1,
  "theme": "Introducing yourself and your field",
  "themeEn": "Introducing yourself and your field",
  "sound": {
    "id": "en-i-ee",
    "title": "ship or sheep? (/ɪ/ – /iː/)",
    "explain": "English has a short, relaxed i (ship, slip, fill) and a long, tense ee (sheep, sleep, feel). Mixing them up changes the meaning, and with a few pairs the wrong one sounds rude. This is one of the sounds that matters most for being understood.",
    "anchor": "The long ee (sheep) is like Farsi «ای» in «ایران». The short i (ship) is shorter and more relaxed: between «ای» and «اِ».",
    "fa": "صدای ee (sheep) مثل «ای» فارسی و کشیده است. صدای i (ship) کوتاه‌تر و شل‌تر است، چیزی بین «ای» و «اِ». این جفت‌ها معنی را عوض می‌کنند.",
    "pairs": [["ship", "sheep"], ["slip", "sleep"], ["fill", "feel"], ["bit", "beat"], ["sit", "seat"], ["it", "eat"], ["hill", "heel"]]
  },
  "chunks": [
    { "id": "en-01-001", "text": "I'm doing a master's in …", "en": "Say your study programme.", "stress": ["MAS-ter's"] },
    { "id": "en-01-002", "text": "My field is …", "en": "Your subject area, e.g. ‘My field is data science.’" },
    { "id": "en-01-003", "text": "I'm particularly interested in …", "en": "What you like most in your field.", "stress": ["par-TIC-u-lar-ly", "IN-ter-est-ed"], "fa": "interested in = علاقه‌مند به. حرف اضافه همیشه in است، نه to." },
    { "id": "en-01-004", "text": "My background is in …", "en": "What you studied or did before.", "stress": ["BACK-ground"] },
    { "id": "en-01-005", "text": "Before this, I worked as …", "en": "Your earlier job. Remember the article: ‘as an engineer’, ‘as a teacher’.", "fa": "در فارسی می‌گوییم «مهندس بودم» بدون a، ولی در انگلیسی باید بگویی: as an engineer." },
    { "id": "en-01-006", "text": "At the moment, I'm working on …", "en": "A current project or assignment." },
    { "id": "en-01-007", "text": "The main focus of my research is …", "en": "The central topic of your research or thesis.", "stress": ["re-SEARCH"] },
    { "id": "en-01-008", "text": "It's closely related to …", "en": "Connect your topic to something people know.", "stress": ["re-LA-ted"] },
    { "id": "en-01-009", "text": "In simple terms, …", "en": "Before you explain something difficult in an easy way." },
    { "id": "en-01-010", "text": "What about you? What are you studying?", "en": "Turn the question back. It keeps the conversation going." },
    { "id": "en-01-011", "text": "That sounds really interesting.", "en": "React to what someone tells you.", "stress": ["IN-ter-est-ing"], "fa": "تکیه روی بخش اول است: IN-ter-est-ing، نه inter-EST-ing." },
    { "id": "en-01-012", "text": "Nice to meet you.", "en": "When you meet someone for the first time." },
    { "id": "en-01-013", "text": "I'm originally from …, but I live in Hasselt now.", "en": "Where you come from and where you live.", "stress": ["o-RIG-i-nal-ly"] },
    { "id": "en-01-014", "text": "I'm still getting used to …", "en": "Something new that slowly becomes normal for you.", "fa": "get used to + اسم یا فعل ing = عادت کردن به. مثال: I'm still getting used to the weather." },
    { "id": "en-01-015", "text": "Sorry, could you say that again?", "en": "A polite way to ask someone to repeat." },
    { "id": "en-01-016", "text": "the development of …", "en": "A key academic word: stress the second part.", "stress": ["de-VEL-op-ment"], "fa": "در فارسی تکیه معمولاً آخر کلمه است، ولی اینجا تکیه روی VEL است: de-VEL-op-ment." }
  ],
  "speaking": [
    {
      "id": "en-01-s1",
      "prompt": "Introduce yourself to your seminar group in about one minute: your name, where you're from, what you study and what interests you.",
      "frames": ["Hi everyone, I'm …", "I'm originally from …", "I'm doing a master's in …", "I'm particularly interested in …"],
      "model": "Hi everyone, I'm Amir. I'm originally from Iran, but I live in Hasselt now. I'm doing a master's in business engineering. My background is in industrial engineering, and before this, I worked as a planner. I'm particularly interested in supply chains and how data can make them more efficient.",
      "seconds": 60
    },
    {
      "id": "en-01-s2",
      "prompt": "Describe one classmate or colleague: who they are and what they study or do. Careful: he for a man, she for a woman, and keep it the same in every sentence.",
      "frames": ["This is my classmate …", "She's / He's from …", "She's / He's studying …", "What I like about her / him is …"],
      "model": "This is my classmate Sara. She's from Spain, and she's doing the same master's as me. Her background is in economics. She's particularly interested in sustainability. What I like about her is that she always explains things clearly in group work.",
      "seconds": 60
    },
    {
      "id": "en-01-s3",
      "prompt": "A professor asks: ‘So, what's your background?’ Answer in 60–90 seconds.",
      "frames": ["My background is in …", "Before this, I worked as …", "That's why I'm interested in …"],
      "model": "My background is in industrial engineering. I studied it in Iran, and after that I worked as a production planner for three years. In that job I saw how much time and money a company loses when planning goes wrong. That's why I'm interested in supply chain management, and that's why I chose this programme.",
      "seconds": 90
    },
    {
      "id": "en-01-s4",
      "prompt": "Explain your field to a friend who knows nothing about it.",
      "frames": ["In simple terms, …", "For example, …", "It's closely related to …"],
      "model": "In simple terms, my field is about getting products from the factory to the customer in the best way. For example, when you order something online, someone has to decide where it is stored and which truck brings it. It's closely related to data science, because we use a lot of data to make those decisions.",
      "seconds": 90
    },
    {
      "id": "en-01-s5",
      "prompt": "Explain one idea from your own course this week, in about 90 seconds. (This recording is saved in your speaking diary.)",
      "frames": ["This week we studied …", "The main idea is …", "For example, …", "This matters because …"],
      "model": "This week we studied how memory works. The main idea is spaced repetition: you remember things better when you review them a few times with longer breaks in between, instead of all at once. For example, if you learn twenty new words, it's better to review them after one day, then after three days, then after a week. This matters because it saves time, and it's exactly how the flashcards in this app work.",
      "seconds": 90
    }
  ],
  "roleplay": {
    "title": "First seminar with a professor",
    "prompt": "You are Dr. Peeters, a friendly professor at a Belgian university. It is the first seminar of the year and I am a master's student. Speak natural English at B2 level. Ask me to introduce myself, then ask follow-up questions about my background, my field and what I want to learn. Ask one question at a time and wait for my answer. Do not correct me during the conversation. After about 10 exchanges, stop and give me: (1) three corrections of real mistakes — quote my sentence and give a better version; pay special attention to he/she and to missing articles (a/the); (2) two phrases I used well; (3) one useful academic phrase for next time. Do not comment on my pronunciation unless you could not understand a word. Start now with: ‘Welcome! Could you start by telling us a bit about yourself?’"
  },
  "mission": "In one of your classes this week, ask one question or make one comment, using a phrase from this week."
}
```

- [ ] **Step 5: Write** `content/SOURCES.md`

```markdown
# Sources for Flemish / Limburg forms

Every `everyday` form in the Limburg ear must appear in this file with a source.

| Form | Source |
|---|---|
| 'Ebde gij tijd? (gij-system, dropped h) | [Vlaanderen.be, Tussentaal – kenmerken](https://www.vlaanderen.be/taaladvies/taaladviezen/tussentaal-kenmerken) |
| Da weet ik nie. (dropped final t: da, nie, wa) | [Vlaanderen.be, Tussentaal – kenmerken](https://www.vlaanderen.be/taaladvies/taaladviezen/tussentaal-kenmerken) |
| Amai! (also allee, awel) | [Vlaanderen.be, Tussentaal – kenmerken](https://www.vlaanderen.be/taaladvies/taaladviezen/tussentaal-kenmerken) |
| Wa zijt ge bezig? | [Goesting in Taal, informele spreektaal in Limburg](https://www.goestingintaal.be/nl/lokale-accenten-en-dialecten-alles-wat-je-moet-weten-over-de-informele-spreektaal-in-limburg/) |
| Waggeffe. | [Goesting in Taal, informele spreektaal in Limburg](https://www.goestingintaal.be/nl/lokale-accenten-en-dialecten-alles-wat-je-moet-weten-over-de-informele-spreektaal-in-limburg/) |
| Sjiek, he!? | [Goesting in Taal, informele spreektaal in Limburg](https://www.goestingintaal.be/nl/lokale-accenten-en-dialecten-alles-wat-je-moet-weten-over-de-informele-spreektaal-in-limburg/) |
| Hebde goesting? (goesting + gij-system) | [Canon van Vlaanderen, goesting](https://www.canonvanvlaanderen.be/en/events/goesting/); [Vlaanderen.be, Tussentaal – kenmerken](https://www.vlaanderen.be/taaladvies/taaladviezen/tussentaal-kenmerken) |
| Mijn gsm (Belgium) vs. mobieltje (Netherlands) | [Webwoordenboek, Welke woorden zijn anders in het Belgisch?](https://webwoordenboek.nl/kenniscentrum/welke-woorden-zijn-anders-in-het-belgisch); [Vlaanderen.be, verschillen België–Nederland](https://www.vlaanderen.be/taaladvies/standaardtaal-verschillen-tussen-belgië-en-nederland) |

Not used until a source is found: *efkes*, *seffens*, *salukes*.
```

- [ ] **Step 6: Run the tests and the validator**

Run: `node --test test/content-files.test.mjs && node tools/validate.mjs`
Expected: 4 tests pass; validator prints `✓ nl/week-01.json`, `✓ en/week-01.json`, `✓ words.json` and exits 0.

- [ ] **Step 7: Commit**

```bash
git add content/nl/week-01.json content/en/week-01.json content/SOURCES.md test/content-files.test.mjs
git commit -m "feat: add week 1 content (Dutch + English) with sources"
```

---

### Task 5: `match.js`, the word-by-word "was it understood?" comparison

**Files:**
- Create: `js/match.js`
- Test: `test/match.test.mjs`

**Interfaces:**
- Produces: `words(text) → string[]`; `normaliseWord(word, lang) → string`; `compareWords(target, heard, lang) → {words: {text: string, ok: boolean|null}[], score: number}` (`ok: null` = punctuation-only token, not checked; `score` = share of checked words that were heard); `bestMatch(target, alternatives: string[], lang) → same shape`.

- [ ] **Step 1: Write the failing test** — `test/match.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareWords, bestMatch, normaliseWord } from '../js/match.js';

const oks = (r) => r.words.map((w) => w.ok);

test('exact sentence: every word understood', () => {
  const r = compareWords('Kan je dat nog eens herhalen?', 'kan je dat nog eens herhalen', 'nl');
  assert.equal(r.score, 1);
  assert.deepEqual(oks(r), [true, true, true, true, true, true]);
});

test('a missing word is marked', () => {
  const r = compareWords('Kan je dat nog eens herhalen?', 'kan je nog eens herhalen', 'nl');
  assert.deepEqual(oks(r), [true, true, false, true, true, true]);
  assert.equal(r.score, 5 / 6);
});

test('case and punctuation are ignored, original text is kept', () => {
  const r = compareWords('Goeiemorgen!', 'goeiemorgen', 'nl');
  assert.deepEqual(r.words, [{ text: 'Goeiemorgen!', ok: true }]);
});

test('digits match number words', () => {
  assert.equal(compareWords('Ik werk hier twee jaar.', 'ik werk hier 2 jaar', 'nl').score, 1);
  assert.equal(compareWords('I have three classes.', 'I have 3 classes', 'en').score, 1);
});

test('accents are ignored', () => {
  assert.equal(compareWords('Dat is één koffie.', 'dat is een koffie', 'nl').score, 1);
});

test('placeholder tokens are not checked and extra words are fine', () => {
  const r = compareWords("I'm doing a master's in …", "I'm doing a master's in economics", 'en');
  assert.equal(r.score, 1);
  assert.equal(r.words.at(-1).ok, null);
});

test('curly apostrophes match straight ones', () => {
  assert.equal(normaliseWord('master’s', 'en'), normaliseWord("master's", 'en'));
});

test('bestMatch picks the alternative with most words understood', () => {
  const r = bestMatch('Zin in koffie?', ['zin in kopje', 'zin in koffie'], 'nl');
  assert.equal(r.score, 1);
});

test('nothing heard: score 0, all words missed', () => {
  const r = bestMatch('Tot morgen!', [], 'nl');
  assert.equal(r.score, 0);
  assert.deepEqual(oks(r), [false, false]);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/match.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** — `js/match.js`

```js
const NUMBERS = {
  nl: ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf'],
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'],
};

export function words(text) {
  return String(text ?? '').split(/\s+/).filter(Boolean);
}

export function normaliseWord(word, lang) {
  const w = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}']/gu, '')
    .replace(/^'+|'+$/g, '');
  if (/^\d+$/.test(w)) return NUMBERS[lang]?.[Number(w)] ?? w;
  return w;
}

function lcsFlags(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const flags = new Array(a.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { flags[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return flags;
}

export function compareWords(target, heard, lang) {
  const tokens = words(target).map((text) => ({ text, norm: normaliseWord(text, lang), ok: null }));
  const checked = tokens.filter((t) => t.norm);
  const said = words(heard).map((w) => normaliseWord(w, lang)).filter(Boolean);
  const flags = lcsFlags(checked.map((t) => t.norm), said);
  checked.forEach((t, i) => { t.ok = flags[i]; });
  const score = checked.length ? checked.filter((t) => t.ok).length / checked.length : 0;
  return { words: tokens.map(({ text, ok }) => ({ text, ok })), score };
}

export function bestMatch(target, alternatives, lang) {
  let best = compareWords(target, '', lang);
  for (const alt of alternatives) {
    const r = compareWords(target, alt, lang);
    if (r.score > best.score) best = r;
  }
  return best;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test test/match.test.mjs`
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add js/match.js test/match.test.mjs
git commit -m "feat: add word-by-word understood check"
```

---

### Task 6: `session.js` and `cards.js`, the course engine

**Files:**
- Create: `js/session.js`, `js/cards.js`, and a first version of `js/store.js` containing only `defaultState()` (Task 7 completes the file)
- Test: `test/session.test.mjs`, `test/cards.test.mjs`

**Interfaces:**
- Consumes: `newCard`, `review`, `isDue`, `Grade` (Task 1); fixtures (Task 2).
- Produces (session.js): `SESSIONS_PER_WEEK = 5`, `TOTAL_WEEKS = 12`, `BLOCKS = ['cards','sound','listen','speak','grammar','english']`, `part(list, index, parts)`, `diaryId(lang, week) → 'nl-01'`, `buildSession({week, session}, nlWeek, enWeek) → Session`, `nextPosition({week, session}) → {week, session} | null`, `blockLabel(block, session) → {title, flag, minutes}`, `localDate(date) → 'YYYY-MM-DD'`, `streak(history, now?) → number`.
- `Session = { week, session, last, nl: { theme, themeEn, newCards: string[], sound: Sound & {intro, sayPairs}, shadow: {id, title, lines} | null, limburg: [] | null, speak: Prompt | null, diary: (Prompt & {diaryId}) | null, grammar: {id, title, explain, fa, intro, review, items}, mission: {text, show, check}, roleplay: {title, prompt} | null }, en: { theme, newCards, sound, speak, diary, mission, roleplay } }`.
- Produces (cards.js): `indexChunks(weeks) → {[id]: chunk & {lang}}`, `indexWords(words) → {[id]: word}`, `introduce(state, ids, now?)`, `grade(state, id, g, now?)`, `dueQueue(state, now?, limit = 50) → string[]`, `SOON_MS`, `shouldRepeat(card, now, timesSeen) → boolean`, `nextExtraWords(state, words, count) → string[]`, `introduceExtraWords(state, words, count, positionKey, now?)`, `addMyPhrase(state, {lang, text, meaning, note}, now?, makeId?) → {state, id}`, `deleteMyPhrase(state, id)`, `cardView(id, {chunkIndex, wordIndex, myPhrases}) → CardView | null`, where `CardView = {id, kind: 'course'|'word'|'mine', lang, text, meaning, article, fa, stress: string[], note}`.
- Produces (store.js, first part): `defaultState()`. Every state-changing function returns a **new** state object and never mutates its input.

- [ ] **Step 1: Write the state shape** — `js/store.js` (first part; Task 7 adds the rest of the file)

```js
export const STORAGE_KEY = 'taalmaatje.v1';

export function defaultState() {
  return {
    version: 1,
    position: { week: 1, session: 1 },
    done: [],
    history: [],
    settings: { farsi: true, voiceNl: '', voiceEn: '', extraWords: 0 },
    cards: {},
    myPhrases: [],
    ear: {},
    missions: {},
    extraFor: '',
    finished: false,
  };
}
```

- [ ] **Step 2: Write the failing session test** — `test/session.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession, nextPosition, blockLabel, streak, part, diaryId, BLOCKS } from '../js/session.js';
import { validNl, validEn } from './fixtures.mjs';

const nl = validNl();
const en = validEn();
const s = (session) => buildSession({ week: 1, session }, nl, en);

test('part splits a list evenly and covers every item once', () => {
  const list = Array.from({ length: 26 }, (_, i) => i);
  const parts = [0, 1, 2, 3, 4].map((i) => part(list, i, 5));
  assert.deepEqual(parts.flat(), list);
  assert.ok(parts.every((p) => p.length === 5 || p.length === 6));
});

test('session 1: first half of dialogue A, prompt 1, grammar intro, mission shown', () => {
  const x = s(1);
  assert.equal(x.nl.shadow.id, 'nl-01-d0');
  assert.equal(x.nl.shadow.lines.length, 4);
  assert.equal(x.nl.speak.id, 'nl-01-s1');
  assert.equal(x.nl.diary, null);
  assert.equal(x.nl.limburg, null);
  assert.equal(x.nl.grammar.intro, true);
  assert.equal(x.nl.grammar.items.length, 4);
  assert.equal(x.nl.mission.show, true);
  assert.equal(x.nl.sound.intro, true);
  assert.equal(x.nl.roleplay, null);
});

test('sessions 2–4 use the right dialogue part', () => {
  assert.equal(s(2).nl.shadow.lines.length, 8);
  assert.equal(s(3).nl.shadow.id, 'nl-01-d1');
  assert.equal(s(3).nl.shadow.lines.length, 4);
  assert.equal(s(4).nl.shadow.lines.length, 8);
});

test('session 5: Limburg ear, diaries, grammar review, role-plays, mission check', () => {
  const x = s(5);
  assert.equal(x.last, true);
  assert.equal(x.nl.shadow, null);
  assert.equal(x.nl.limburg.length, 6);
  assert.equal(x.nl.speak, null);
  assert.equal(x.nl.diary.diaryId, 'nl-01');
  assert.equal(x.nl.diary.id, 'nl-01-s5');
  assert.equal(x.en.diary.diaryId, 'en-01');
  assert.equal(x.nl.grammar.review, true);
  assert.equal(x.nl.grammar.items.length, 5);
  assert.ok(x.nl.roleplay && x.en.roleplay);
  assert.equal(x.nl.mission.check, true);
});

test('every chunk is introduced exactly once over the week', () => {
  const nlIds = [1, 2, 3, 4, 5].flatMap((n) => s(n).nl.newCards);
  const enIds = [1, 2, 3, 4, 5].flatMap((n) => s(n).en.newCards);
  assert.deepEqual(nlIds, nl.chunks.map((c) => c.id));
  assert.deepEqual(enIds, en.chunks.map((c) => c.id));
});

test('every grammar item is practised once in sessions 1–4', () => {
  const items = [1, 2, 3, 4].flatMap((n) => s(n).nl.grammar.items);
  assert.deepEqual(items, nl.grammar.items);
});

test('every sound pair is said once over the week', () => {
  assert.deepEqual([1, 2, 3, 4, 5].flatMap((n) => s(n).nl.sound.sayPairs), nl.sound.pairs);
});

test('nextPosition moves through sessions, weeks and stops at the end', () => {
  assert.deepEqual(nextPosition({ week: 1, session: 1 }), { week: 1, session: 2 });
  assert.deepEqual(nextPosition({ week: 1, session: 5 }), { week: 2, session: 1 });
  assert.equal(nextPosition({ week: 12, session: 5 }), null);
});

test('blockLabel: listen block is Limburg ear and speak is the diary in session 5', () => {
  assert.equal(blockLabel('listen', s(5)).title, 'Limburg ear');
  assert.equal(blockLabel('speak', s(5)).title, 'Speaking diary');
  assert.equal(BLOCKS.reduce((sum, b) => sum + blockLabel(b, s(1)).minutes, 0), 37);
});

test('diaryId pads the week', () => assert.equal(diaryId('en', 3), 'en-03'));

// 2026-10-05 is a Monday.
const at = (d) => new Date(`${d}T12:00:00`);
const h = (...dates) => dates.map((date) => ({ date, week: 1, session: 1 }));

test('streak: empty history is 0', () => assert.equal(streak([], at('2026-10-05')), 0));
test('streak: today counts', () => assert.equal(streak(h('2026-10-05'), at('2026-10-05')), 1));
test('streak: a weekend does not break it', () => {
  assert.equal(streak(h('2026-10-01', '2026-10-02', '2026-10-05'), at('2026-10-05')), 3);
});
test('streak: today not done yet does not break it', () => {
  assert.equal(streak(h('2026-10-02'), at('2026-10-05')), 1);
});
test('streak: a missed weekday breaks it', () => {
  assert.equal(streak(h('2026-09-30', '2026-10-02'), at('2026-10-02')), 1);
});
test('streak: two sessions on one day count as one day', () => {
  assert.equal(streak(h('2026-10-05', '2026-10-05'), at('2026-10-05')), 1);
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `node --test test/session.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement** — `js/session.js`

```js
export const SESSIONS_PER_WEEK = 5;
export const TOTAL_WEEKS = 12;
export const BLOCKS = ['cards', 'sound', 'listen', 'speak', 'grammar', 'english'];

export function part(list, index, parts) {
  const n = list.length;
  return list.slice(Math.round((index * n) / parts), Math.round(((index + 1) * n) / parts));
}

export function diaryId(lang, week) {
  return `${lang}-${String(week).padStart(2, '0')}`;
}

function soundFor(sound, session) {
  return { ...sound, intro: session === 1, sayPairs: part(sound.pairs, session - 1, SESSIONS_PER_WEEK) };
}

export function buildSession({ week, session }, nl, en) {
  const i = session - 1;
  const last = session === SESSIONS_PER_WEEK;
  const dialogue = session <= 2 ? nl.dialogues[0] : nl.dialogues[1];
  const half = Math.ceil(dialogue.lines.length / 2);
  const g = nl.grammar;
  return {
    week,
    session,
    last,
    nl: {
      theme: nl.theme,
      themeEn: nl.themeEn,
      newCards: part(nl.chunks, i, SESSIONS_PER_WEEK).map((c) => c.id),
      sound: soundFor(nl.sound, session),
      shadow: last ? null : {
        id: dialogue.id,
        title: dialogue.title,
        lines: session % 2 === 1 ? dialogue.lines.slice(0, half) : dialogue.lines,
      },
      limburg: last ? nl.limburg : null,
      speak: last ? null : nl.speaking[i],
      diary: last ? { ...nl.speaking[4], diaryId: diaryId('nl', week) } : null,
      grammar: {
        id: g.id,
        title: g.title,
        explain: g.explain,
        fa: g.fa ?? '',
        intro: session === 1,
        review: last,
        items: last ? g.items.filter((_, k) => k % 3 === 0) : part(g.items, i, 4),
      },
      mission: { text: nl.mission, show: session === 1, check: last },
      roleplay: last ? nl.roleplay : null,
    },
    en: {
      theme: en.theme,
      newCards: part(en.chunks, i, SESSIONS_PER_WEEK).map((c) => c.id),
      sound: soundFor(en.sound, session),
      speak: last ? null : en.speaking[i],
      diary: last ? { ...en.speaking[4], diaryId: diaryId('en', week) } : null,
      mission: { text: en.mission, show: session === 1, check: last },
      roleplay: last ? en.roleplay : null,
    },
  };
}

export function nextPosition({ week, session }) {
  if (session < SESSIONS_PER_WEEK) return { week, session: session + 1 };
  if (week < TOTAL_WEEKS) return { week: week + 1, session: 1 };
  return null;
}

export function blockLabel(block, s) {
  switch (block) {
    case 'cards': return { title: 'Cards', flag: '🇧🇪', minutes: 5 };
    case 'sound': return { title: `Sound: ${s.nl.sound.title}`, flag: '🇧🇪', minutes: 3 };
    case 'listen': return s.nl.shadow
      ? { title: `Listen & shadow: ${s.nl.shadow.title}`, flag: '🇧🇪', minutes: 6 }
      : { title: 'Limburg ear', flag: '🇧🇪', minutes: 6 };
    case 'speak': return { title: s.nl.diary ? 'Speaking diary' : 'Speak', flag: '🇧🇪', minutes: 7 };
    case 'grammar': return { title: `Grammar: ${s.nl.grammar.title}`, flag: '🇧🇪', minutes: 4 };
    case 'english': return { title: `English: ${s.en.theme}`, flag: '🇬🇧', minutes: 12 };
    default: throw new Error(`unknown block ${block}`);
  }
}

export function localDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function streak(history, now = new Date()) {
  const days = new Set(history.map((x) => x.date));
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let count = 0;
  for (let step = 0; step < 400; step++) {
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (days.has(localDate(d))) count++;
    else if (!weekend && step > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
```

- [ ] **Step 5: Run the session tests to see them pass**

Run: `node --test test/session.test.mjs`
Expected: 16 tests pass.

- [ ] **Step 6: Write the failing cards test** — `test/cards.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../js/store.js';
import {
  introduce, grade, dueQueue, shouldRepeat, nextExtraWords, introduceExtraWords,
  addMyPhrase, deleteMyPhrase, cardView, indexChunks, indexWords,
} from '../js/cards.js';
import { Grade } from '../js/srs.js';
import { validNl, validEn } from './fixtures.mjs';

const now = new Date('2026-10-05T10:00:00Z');
const words = [
  { id: 'w-0001', text: 'de afspraak', article: 'de', en: 'appointment', pos: 'zn', example: 'Ik heb een afspraak.' },
  { id: 'w-0002', text: 'bespreken', article: null, en: 'to discuss', pos: 'ww', example: 'We bespreken het.' },
  { id: 'w-0003', text: 'het doel', article: 'het', en: 'goal', pos: 'zn', example: 'Mijn doel is…' },
];

test('introduce adds new cards once and does not touch the input', () => {
  const s0 = defaultState();
  const s1 = introduce(s0, ['a', 'b'], now);
  assert.deepEqual(Object.keys(s1.cards), ['a', 'b']);
  assert.deepEqual(s0.cards, {});
  assert.equal(introduce(s1, ['a'], now), s1);
});

test('dueQueue lists due cards, oldest due first', () => {
  let s = introduce(defaultState(), ['late'], now);
  s = introduce(s, ['early'], new Date('2026-10-01T10:00:00Z'));
  assert.deepEqual(dueQueue(s, now), ['early', 'late']);
});

test('grading Good twice takes a card out of the due queue', () => {
  let s = introduce(defaultState(), ['a'], now);
  s = grade(s, 'a', Grade.Good, now);
  s = grade(s, 'a', Grade.Good, new Date(s.cards.a.due));
  assert.deepEqual(dueQueue(s, now), []);
});

test('grade throws for an unknown card', () => {
  assert.throws(() => grade(defaultState(), 'nope', Grade.Good, now), /unknown card/);
});

test('shouldRepeat: soon-due cards come back, at most 3 times', () => {
  const soon = { due: new Date(now.getTime() + 60_000).toISOString() };
  const later = { due: new Date(now.getTime() + 3 * 86400_000).toISOString() };
  assert.equal(shouldRepeat(soon, now, 1), true);
  assert.equal(shouldRepeat(soon, now, 3), false);
  assert.equal(shouldRepeat(later, now, 1), false);
});

test('nextExtraWords skips words already in the deck', () => {
  const s = introduce(defaultState(), ['w-0001'], now);
  assert.deepEqual(nextExtraWords(s, words, 2), ['w-0002', 'w-0003']);
  assert.deepEqual(nextExtraWords(s, words, 0), []);
});

test('introduceExtraWords adds words only once per session', () => {
  const s1 = introduceExtraWords(defaultState(), words, 2, '1-1', now);
  assert.deepEqual(Object.keys(s1.cards), ['w-0001', 'w-0002']);
  const s2 = introduceExtraWords(s1, words, 2, '1-1', now);
  assert.equal(s2, s1);
  const s3 = introduceExtraWords(s2, words, 2, '1-2', now);
  assert.deepEqual(Object.keys(s3.cards), ['w-0001', 'w-0002', 'w-0003']);
});

test('addMyPhrase checks input and creates a phrase with a card', () => {
  assert.throws(() => addMyPhrase(defaultState(), { lang: 'nl', text: ' ', meaning: 'x' }, now), /fill in/);
  assert.throws(() => addMyPhrase(defaultState(), { lang: 'fr', text: 'x', meaning: 'x' }, now), /Dutch or English/);
  const { state, id } = addMyPhrase(defaultState(), { lang: 'en', text: ' give or take ', meaning: 'about', note: 'film' }, now, () => 'my-1');
  assert.equal(id, 'my-1');
  assert.deepEqual(state.myPhrases, [{ id: 'my-1', lang: 'en', text: 'give or take', meaning: 'about', note: 'film', created: now.toISOString() }]);
  assert.ok(state.cards['my-1']);
});

test('deleteMyPhrase removes the phrase and its card', () => {
  const { state } = addMyPhrase(defaultState(), { lang: 'nl', text: 'amai', meaning: 'wow' }, now, () => 'my-2');
  const after = deleteMyPhrase(state, 'my-2');
  assert.deepEqual(after.myPhrases, []);
  assert.equal(after.cards['my-2'], undefined);
});

test('cardView finds course chunks, words and my phrases', () => {
  const nl = validNl();
  nl.chunks[0] = { ...nl.chunks[0], text: 'de collega', article: 'de', fa: 'همکار', stress: ['col-LE-ga'], register: 'informal' };
  const sources = {
    chunkIndex: indexChunks([nl, validEn()]),
    wordIndex: indexWords(words),
    myPhrases: [{ id: 'my-3', lang: 'en', text: 'give or take', meaning: 'about', note: 'film' }],
  };
  assert.deepEqual(cardView('nl-01-001', sources), {
    id: 'nl-01-001', kind: 'course', lang: 'nl', text: 'de collega', meaning: 'sentence 0',
    article: 'de', fa: 'همکار', stress: ['col-LE-ga'], note: 'informal',
  });
  assert.equal(cardView('en-01-001', sources).lang, 'en');
  assert.equal(cardView('w-0003', sources).article, 'het');
  assert.equal(cardView('my-3', sources).kind, 'mine');
  assert.equal(cardView('missing', sources), null);
});
```

- [ ] **Step 7: Run it to see it fail**

Run: `node --test test/cards.test.mjs`
Expected: FAIL, `Cannot find module '.../js/cards.js'`.

- [ ] **Step 8: Implement** — `js/cards.js`

```js
import { newCard, review, isDue } from './srs.js';

export const SOON_MS = 15 * 60 * 1000;

export function indexChunks(weeks) {
  const index = {};
  for (const w of weeks) for (const c of w.chunks) index[c.id] = { ...c, lang: w.lang };
  return index;
}

export function indexWords(words) {
  return Object.fromEntries(words.map((w) => [w.id, w]));
}

export function introduce(state, ids, now = new Date()) {
  const missing = ids.filter((id) => !state.cards[id]);
  if (!missing.length) return state;
  const cards = { ...state.cards };
  for (const id of missing) cards[id] = newCard(now);
  return { ...state, cards };
}

export function grade(state, id, g, now = new Date()) {
  if (!state.cards[id]) throw new Error(`unknown card ${id}`);
  return { ...state, cards: { ...state.cards, [id]: review(state.cards[id], g, now) } };
}

export function dueQueue(state, now = new Date(), limit = 50) {
  return Object.entries(state.cards)
    .filter(([, c]) => isDue(c, now))
    .sort(([, a], [, b]) => new Date(a.due) - new Date(b.due))
    .slice(0, limit)
    .map(([id]) => id);
}

export function shouldRepeat(card, now, timesSeen) {
  return timesSeen < 3 && new Date(card.due) - now < SOON_MS;
}

export function nextExtraWords(state, words, count) {
  if (count <= 0) return [];
  return words.filter((w) => !state.cards[w.id]).slice(0, count).map((w) => w.id);
}

export function introduceExtraWords(state, words, count, positionKey, now = new Date()) {
  if (count <= 0 || state.extraFor === positionKey) return state;
  return { ...introduce(state, nextExtraWords(state, words, count), now), extraFor: positionKey };
}

const randomId = (now) => `my-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function addMyPhrase(state, { lang, text, meaning, note = '' }, now = new Date(), makeId = () => randomId(now)) {
  if (!['nl', 'en'].includes(lang)) throw new Error('Choose Dutch or English.');
  if (!text?.trim() || !meaning?.trim()) throw new Error('Please fill in the phrase and its meaning.');
  const id = makeId();
  const phrase = { id, lang, text: text.trim(), meaning: meaning.trim(), note: note.trim(), created: now.toISOString() };
  return {
    state: { ...state, myPhrases: [...state.myPhrases, phrase], cards: { ...state.cards, [id]: newCard(now) } },
    id,
  };
}

export function deleteMyPhrase(state, id) {
  const { [id]: _removed, ...cards } = state.cards;
  return { ...state, myPhrases: state.myPhrases.filter((p) => p.id !== id), cards };
}

export function cardView(id, { chunkIndex, wordIndex, myPhrases }) {
  const c = chunkIndex[id];
  if (c) {
    return {
      id, kind: 'course', lang: c.lang, text: c.text, meaning: c.en, article: c.article ?? null,
      fa: c.fa ?? '', stress: c.stress ?? [], note: c.register === 'informal' ? 'informal' : '',
    };
  }
  const w = wordIndex[id];
  if (w) return { id, kind: 'word', lang: 'nl', text: w.text, meaning: w.en, article: w.article, fa: '', stress: [], note: w.example ?? '' };
  const p = myPhrases.find((x) => x.id === id);
  if (p) return { id, kind: 'mine', lang: p.lang, text: p.text, meaning: p.meaning, article: null, fa: '', stress: [], note: p.note };
  return null;
}
```

- [ ] **Step 9: Run both tests to see them pass**

Run: `node --test test/session.test.mjs test/cards.test.mjs`
Expected: 26 tests pass.

- [ ] **Step 10: Commit**

```bash
git add js/session.js js/cards.js js/store.js test/session.test.mjs test/cards.test.mjs
git commit -m "feat: add session engine and deck logic"
```

---

### Task 7: `store.js` (saving, migration, export/import) and `diary.js`

**Files:**
- Modify: `js/store.js` (add everything below `defaultState`)
- Create: `js/diary.js`
- Test: `test/store.test.mjs`, `test/diary.test.mjs`

**Interfaces:**
- Produces (store.js): `migrate(raw) → State`; `createStore(storage) → {available: boolean, load(): State, save(state): boolean}`; `blobToBase64(blob) → Promise<string>`; `base64ToBlob(b64, type) → Blob`; `buildExport(state, diaryEntries, now?) → Promise<string>`; `parseImport(text) → {state, diary: {id, date, blob}[]}` (throws `Error('This is not a Taalmaatje backup file.')`).
- Produces (diary.js): `openDiary(idb?) → Promise<Diary>` where `Diary = {persistent: boolean, put({id, date, blob}), get(id) → entry|null, all() → entry[] sorted by id, clear()}`.

- [ ] **Step 1: Write the failing tests**

`test/store.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, migrate, createStore, buildExport, parseImport, STORAGE_KEY } from '../js/store.js';

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test('migrate fills in missing fields and settings', () => {
  const s = migrate({ version: 1, position: { week: 2, session: 3 }, settings: { farsi: false } });
  assert.deepEqual(s.position, { week: 2, session: 3 });
  assert.equal(s.settings.farsi, false);
  assert.equal(s.settings.extraWords, 0);
  assert.deepEqual(s.myPhrases, []);
});

test('migrate turns garbage or unknown versions into a fresh state', () => {
  assert.deepEqual(migrate(null), defaultState());
  assert.deepEqual(migrate('hello'), defaultState());
  assert.deepEqual(migrate({ version: 99 }), defaultState());
});

test('store saves and loads', () => {
  const store = createStore(memoryStorage());
  assert.equal(store.available, true);
  const s = { ...defaultState(), done: ['cards'] };
  assert.equal(store.save(s), true);
  assert.deepEqual(store.load(), s);
});

test('store survives broken saved JSON', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, '{oops');
  assert.deepEqual(createStore(storage).load(), defaultState());
});

test('store without working storage still loads a fresh state', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() {} };
  for (const storage of [broken, null]) {
    const store = createStore(storage);
    assert.equal(store.available, false);
    assert.deepEqual(store.load(), defaultState());
    assert.equal(store.save(defaultState()), false);
  }
});

test('export then import gives back the same state and recordings', async () => {
  const state = { ...defaultState(), history: [{ date: '2026-10-05', week: 1, session: 1 }] };
  const bytes = new Uint8Array([0, 1, 2, 250, 255]);
  const text = await buildExport(state, [{ id: 'nl-01', date: '2026-10-09T10:00:00.000Z', blob: new Blob([bytes], { type: 'audio/mp4' }) }]);
  const back = parseImport(text);
  assert.deepEqual(back.state, state);
  assert.equal(back.diary[0].id, 'nl-01');
  assert.equal(back.diary[0].blob.type, 'audio/mp4');
  assert.deepEqual(new Uint8Array(await back.diary[0].blob.arrayBuffer()), bytes);
});

test('import rejects files that are not backups', () => {
  assert.throws(() => parseImport('not json'), /not a Taalmaatje backup/);
  assert.throws(() => parseImport('{"app":"other"}'), /not a Taalmaatje backup/);
});
```

`test/diary.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDiary } from '../js/diary.js';

test('without IndexedDB the diary works in memory and says it is not persistent', async () => {
  const d = await openDiary(undefined);
  assert.equal(d.persistent, false);
  await d.put({ id: 'nl-02', date: 'b', blob: new Blob(['2']) });
  await d.put({ id: 'nl-01', date: 'a', blob: new Blob(['1']) });
  assert.deepEqual((await d.all()).map((e) => e.id), ['nl-01', 'nl-02']);
  assert.equal((await d.get('nl-01')).date, 'a');
  assert.equal(await d.get('nope'), null);
  await d.clear();
  assert.deepEqual(await d.all(), []);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/store.test.mjs test/diary.test.mjs`
Expected: FAIL, `migrate` is not exported and `diary.js` is not found.

- [ ] **Step 3: Implement** — append to `js/store.js` (below `defaultState`)

```js
export function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return base;
  return { ...base, ...raw, settings: { ...base.settings, ...(raw.settings ?? {}) } };
}

export function createStore(storage) {
  let available = true;
  try {
    const probe = `${STORAGE_KEY}.probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
  } catch {
    available = false;
  }
  return {
    available,
    load() {
      if (!available) return defaultState();
      try { return migrate(JSON.parse(storage.getItem(STORAGE_KEY))); } catch { return defaultState(); }
    },
    save(state) {
      if (!available) return false;
      try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
    },
  };
}

export async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function base64ToBlob(b64, type) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function buildExport(state, diaryEntries, now = new Date()) {
  const diary = [];
  for (const e of diaryEntries) diary.push({ id: e.id, date: e.date, type: e.blob.type, data: await blobToBase64(e.blob) });
  return JSON.stringify({ app: 'taalmaatje', version: 1, exportedAt: now.toISOString(), state, diary });
}

const NOT_BACKUP = 'This is not a Taalmaatje backup file.';

export function parseImport(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(NOT_BACKUP); }
  if (data?.app !== 'taalmaatje' || data.version !== 1 || !data.state || typeof data.state !== 'object') throw new Error(NOT_BACKUP);
  return {
    state: migrate(data.state),
    diary: (data.diary ?? []).map((e) => ({ id: e.id, date: e.date, blob: base64ToBlob(e.data, e.type) })),
  };
}
```

- [ ] **Step 4: Implement** — `js/diary.js`

```js
const DB_NAME = 'taalmaatje';
const STORE = 'diary';

const byId = (a, b) => a.id.localeCompare(b.id);

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function memoryDiary() {
  const entries = new Map();
  return {
    persistent: false,
    async put(entry) { entries.set(entry.id, entry); },
    async get(id) { return entries.get(id) ?? null; },
    async all() { return [...entries.values()].sort(byId); },
    async clear() { entries.clear(); },
  };
}

export async function openDiary(idb = globalThis.indexedDB) {
  if (!idb) return memoryDiary();
  try {
    const open = idb.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: 'id' });
    const db = await promisify(open);
    const store = (mode) => db.transaction(STORE, mode).objectStore(STORE);
    return {
      persistent: true,
      put: (entry) => promisify(store('readwrite').put(entry)),
      get: async (id) => (await promisify(store('readonly').get(id))) ?? null,
      all: async () => (await promisify(store('readonly').getAll())).sort(byId),
      clear: () => promisify(store('readwrite').clear()),
    };
  } catch {
    return memoryDiary();
  }
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `node --test test/store.test.mjs test/diary.test.mjs`
Expected: 8 tests pass.

- [ ] **Step 6: Commit**

```bash
git add js/store.js js/diary.js test/store.test.mjs test/diary.test.mjs
git commit -m "feat: add state storage, backup export/import and speaking diary"
```

---

### Task 8: `speech.js` (voices, speaking, recording, recognition) and `content.js`

**Files:**
- Create: `js/speech.js`, `js/content.js`
- Test: `test/speech.test.mjs`, `test/content.test.mjs`

**Interfaces:**
- Produces (speech.js): `voicesFor(voices, lang: 'nl'|'en') → voice[]`; `pickVoice(voices, lang, preferredName?) → voice|null`; `accentOf(voice) → 'be'|'nl'|'other'|null`; `getVoices(timeoutMs?) → Promise<voice[]>`; `speak(text, {voice, lang, rate}) → Promise<void>`; `canRecord() → boolean`; `startRecording() → Promise<{stop(): Promise<Blob>}>`; `canRecognise() → boolean`; `recognise(bcp47) → Promise<string[]>` (rejects with `err.code`); `startTranscript(bcp47) → {stop(): Promise<string>}`.
- Produces (content.js): `class ContentMissing extends Error`; `weekUrl(lang, week)`; `loadJson(url, fetchFn?)`; `loadWeek(lang, week, fetchFn?)`; `loadWords(fetchFn?)`; `loadCourse(week, fetchFn?) → {nl, en, weeks: object[], missing: boolean}`; `clearCache()`.

- [ ] **Step 1: Write the failing tests**

`test/speech.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice, voicesFor, accentOf, canRecognise, canRecord } from '../js/speech.js';

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
test('accentOf', () => {
  assert.equal(accentOf(voices[1]), 'be');
  assert.equal(accentOf(voices[0]), 'nl');
  assert.equal(accentOf(null), null);
});
test('in Node there is no recognition or recording', () => {
  assert.equal(canRecognise(), false);
  assert.equal(canRecord(), false);
});
```

`test/content.test.mjs`:
```js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadCourse, loadWeek, clearCache, ContentMissing, weekUrl } from '../js/content.js';

const files = {
  'content/nl/week-01.json': { lang: 'nl', week: 1, chunks: [] },
  'content/en/week-01.json': { lang: 'en', week: 1, chunks: [] },
};
let calls = 0;
const fakeFetch = async (url) => {
  calls++;
  if (url === 'content/nl/week-03.json') return { ok: false, status: 500, json: async () => ({}) };
  if (!(url in files)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => structuredClone(files[url]) };
};

beforeEach(() => { clearCache(); calls = 0; });

test('weekUrl pads the week', () => assert.equal(weekUrl('nl', 1), 'content/nl/week-01.json'));

test('loadCourse for an existing week returns that week and all earlier ones', async () => {
  const c = await loadCourse(1, fakeFetch);
  assert.equal(c.missing, false);
  assert.equal(c.nl.lang, 'nl');
  assert.equal(c.en.lang, 'en');
  assert.equal(c.weeks.length, 2);
});

test('loadCourse for a week that is not written yet says missing and keeps earlier weeks', async () => {
  const c = await loadCourse(2, fakeFetch);
  assert.equal(c.missing, true);
  assert.equal(c.nl, null);
  assert.equal(c.weeks.length, 2);
});

test('a missing week is a ContentMissing error; a server error is a normal error', async () => {
  await assert.rejects(loadWeek('nl', 9, fakeFetch), ContentMissing);
  await assert.rejects(loadWeek('nl', 3, fakeFetch), (e) => !(e instanceof ContentMissing) && /500/.test(e.message));
});

test('files are fetched once and then cached', async () => {
  await loadWeek('nl', 1, fakeFetch);
  await loadWeek('nl', 1, fakeFetch);
  assert.equal(calls, 1);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/speech.test.mjs test/content.test.mjs`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** — `js/speech.js`

```js
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
```

- [ ] **Step 4: Implement** — `js/content.js`

```js
export class ContentMissing extends Error {}

const cache = new Map();

export function clearCache() {
  cache.clear();
}

export function weekUrl(lang, week) {
  return `content/${lang}/week-${String(week).padStart(2, '0')}.json`;
}

export async function loadJson(url, fetchFn = globalThis.fetch) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetchFn(url);
  if (res.status === 404) throw new ContentMissing(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

export const loadWeek = (lang, week, fetchFn) => loadJson(weekUrl(lang, week), fetchFn);
export const loadWords = (fetchFn) => loadJson('content/words.json', fetchFn);

export async function loadCourse(week, fetchFn) {
  const weeks = [];
  for (let w = 1; w <= week; w++) {
    try {
      const [nl, en] = await Promise.all([loadWeek('nl', w, fetchFn), loadWeek('en', w, fetchFn)]);
      weeks.push(nl, en);
      if (w === week) return { nl, en, weeks, missing: false };
    } catch (e) {
      if (e instanceof ContentMissing && w === week) return { nl: null, en: null, weeks, missing: true };
      throw e;
    }
  }
  return { nl: null, en: null, weeks, missing: true };
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `node --test test/speech.test.mjs test/content.test.mjs`
Expected: 12 tests pass.

- [ ] **Step 6: Commit**

```bash
git add js/speech.js js/content.js test/speech.test.mjs test/content.test.mjs
git commit -m "feat: add speech helpers and content loading"
```

---

### Task 9: App shell, styles, DOM helpers, router and the Today screen

**Files:**
- Create: `index.html`, `css/app.css`, `js/ui/dom.js`, `js/app.js`, `js/ui/today.js`, `tools/set-position.html`; temporary stubs for the other screens (replaced in Tasks 10–13)

**Interfaces:**
- Consumes: everything from Tasks 1–8.
- Produces (dom.js): `h(tag, props?, ...children) → HTMLElement` (props: `class`, `text`, `on<Event>` handlers, `dataset`, other attributes; `null`/`false` skipped); `clear(el)`; `button(label, onClick, props?) → HTMLButtonElement`; `fa(text) → HTMLElement|null` (RTL paragraph).
- Produces (`ctx`, passed to every screen as `render(ctx, root)`):
  `ctx.state` (current State); `ctx.storageOk`; `ctx.update(fn: State → State)` (replaces and saves state); `ctx.go(hash)`; `ctx.rerender()`; `ctx.reload()` (reload content, then re-render); `ctx.markDone(block)`; `ctx.finishSession()`; `ctx.session` (Session or `null`); `ctx.course` (`{nl, en, weeks, missing}`); `ctx.chunkIndex`; `ctx.wordIndex`; `ctx.getWords() → Promise<Word[]>`; `ctx.cardSources() → {chunkIndex, wordIndex, myPhrases}`; `ctx.voices = {nl, en}`; `ctx.allVoices`; `ctx.pickVoices()`; `ctx.diary` (Diary).
- Each screen module exports `render(ctx, root)` (may be `async`).

- [ ] **Step 1: Write** `index.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Taalmaatje</title>
  <meta name="description" content="Daily Flemish Dutch and English speaking practice.">
  <meta name="theme-color" content="#1f6f5c">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Taalmaatje">
  <link rel="stylesheet" href="css/app.css">
  <script type="module" src="js/app.js"></script>
</head>
<body>
  <header class="top">
    <a href="#/today" class="brand">Taalmaatje</a>
    <span id="position" class="muted small"></span>
  </header>
  <main id="app" aria-live="polite"><p class="muted">Loading…</p></main>
  <nav class="tabs" aria-label="Main">
    <a href="#/today" data-tab="today">Today</a>
    <a href="#/progress" data-tab="progress">Progress</a>
    <a href="#/settings" data-tab="settings">Settings</a>
  </nav>
</body>
</html>
```

- [ ] **Step 2: Write** `css/app.css`

```css
:root {
  --bg: #f7f5f0; --surface: #ffffff; --text: #1d2420; --muted: #5f6b65; --line: #dfe3df;
  --accent: #1f6f5c; --accent-text: #ffffff; --ok: #1e7d3c; --miss: #c2570c; --warn-bg: #fff4e5;
  --de: #2563a6; --het: #b4462b; --radius: 14px; --gap: 12px;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #121614; --surface: #1c221f; --text: #e8ece9; --muted: #9aa7a0; --line: #2c3530;
    --accent: #4fb39a; --accent-text: #0d1311; --ok: #5cc27e; --miss: #f08a4b; --warn-bg: #3a2c17;
    --de: #7fb2ea; --het: #f08f76;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 17px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.top { display: flex; justify-content: space-between; align-items: baseline; padding: calc(12px + env(safe-area-inset-top)) 16px 4px; max-width: 680px; margin: 0 auto; }
.brand { font-weight: 700; color: var(--accent); text-decoration: none; }
main { max-width: 680px; margin: 0 auto; padding: 0 16px 24px; overflow-wrap: anywhere; }
h1 { font-size: 1.5rem; margin: 8px 0 4px; }
h2 { font-size: 1.15rem; margin: 20px 0 8px; }
h3 { font-size: 1rem; margin: 16px 0 6px; }
.muted { color: var(--muted); }
.small, .hint { font-size: .875rem; }
.hint { color: var(--muted); }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; margin: var(--gap) 0; }
.card.de { border-left: 6px solid var(--de); }
.card.het { border-left: 6px solid var(--het); }
.warn { background: var(--warn-bg); padding: 8px 12px; border-radius: 10px; }
.label { font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin: 10px 0 0; }
button, .button {
  font: inherit; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--text);
  padding: 8px 16px; min-height: 44px; cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center; gap: 6px; margin: 4px 4px 4px 0;
}
button.primary, .button.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
button.wide { width: 100%; justify-content: center; }
button:disabled { opacity: .5; cursor: default; }
button.icon { padding: 6px 10px; min-width: 44px; justify-content: center; }
button.chip { min-height: 36px; padding: 4px 12px; font-size: .9rem; }
button.recording { background: var(--miss); color: #fff; border-color: var(--miss); }
.speakable-row { display: flex; align-items: flex-start; gap: 4px 8px; flex-wrap: wrap; }
.speakable { margin: 6px 0; flex: 1 1 220px; }
.speakable.big { font-size: 1.35rem; }
.audio-buttons { display: inline-flex; }
button.word { border: 0; background: none; padding: 0 1px; margin: 0; min-height: 0; border-radius: 4px; color: inherit; display: inline; font: inherit; }
button.word:hover, button.word:focus-visible { background: color-mix(in srgb, var(--accent) 18%, transparent); }
.check-words .ok { color: var(--ok); font-weight: 600; }
.check-words .miss { color: var(--miss); font-weight: 600; text-decoration: underline wavy; }
.fa { direction: rtl; text-align: right; font-family: Tahoma, "Vazirmatn", system-ui, sans-serif; color: var(--muted); font-size: .95rem; }
.meaning { font-weight: 600; }
.stress { font-family: ui-monospace, Menlo, monospace; font-size: .9rem; }
.everyday { font-style: italic; font-size: 1.15rem; margin: 4px 0; }
.ok-text { color: var(--ok); }
.blocks { list-style: none; padding: 0; margin: 12px 0; }
.block { display: flex; gap: 10px; align-items: center; padding: 14px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); margin: 8px 0; color: var(--text); text-decoration: none; }
.block.done { opacity: .7; }
.block .tick { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--accent); display: inline-flex; align-items: center; justify-content: center; color: var(--accent); flex: none; font-weight: 700; }
.block .title { flex: 1; }
.block .min { color: var(--muted); font-size: .875rem; flex: none; }
a.card.link { display: block; color: var(--accent); text-decoration: none; font-weight: 600; }
.tabs { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: var(--surface); border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom); }
.tabs a { flex: 1; text-align: center; padding: 14px 0; color: var(--muted); text-decoration: none; }
.tabs a.active { color: var(--accent); font-weight: 700; }
.choices { display: flex; gap: 8px; }
.choice { flex: 1; justify-content: center; font-size: 1.2rem; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 12px; }
.stat b { font-size: 1.5rem; display: block; }
.timer { font-variant-numeric: tabular-nums; font-size: 1.4rem; font-weight: 700; margin-right: 8px; }
.record-row { display: flex; align-items: center; flex-wrap: wrap; margin-top: 12px; }
.nav-row { display: flex; justify-content: space-between; flex-wrap: wrap; }
.done-bar { margin-top: 24px; }
textarea { width: 100%; font: inherit; font-size: .9rem; border-radius: 10px; border: 1px solid var(--line); padding: 10px; background: var(--bg); color: var(--text); }
input, select { font: inherit; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--text); max-width: 100%; }
label.row { display: flex; gap: 8px; align-items: center; margin: 12px 0; flex-wrap: wrap; }
form.stack { display: grid; gap: 8px; }
audio { width: 100%; margin-top: 8px; }
details { margin: 8px 0; }
summary { cursor: pointer; color: var(--accent); min-height: 32px; }
.diary-entry { display: grid; gap: 4px; margin: 10px 0; }
```

- [ ] **Step 3: Write** `js/ui/dom.js`

```js
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export function button(label, onClick, props = {}) {
  return h('button', { type: 'button', ...props, onClick }, label);
}

export function fa(text) {
  return text ? h('p', { class: 'fa', dir: 'rtl', lang: 'fa' }, text) : null;
}
```

- [ ] **Step 4: Write** `js/app.js`

```js
import { createStore } from './store.js';
import { openDiary } from './diary.js';
import { getVoices, pickVoice } from './speech.js';
import { loadCourse, loadWords } from './content.js';
import { buildSession, nextPosition, localDate } from './session.js';
import { indexChunks, indexWords } from './cards.js';
import { h, clear, button } from './ui/dom.js';
import * as today from './ui/today.js';
import * as cards from './ui/cards.js';
import * as sound from './ui/sound.js';
import * as shadow from './ui/shadow.js';
import * as limburg from './ui/limburg.js';
import * as speak from './ui/speak.js';
import * as grammar from './ui/grammar.js';
import * as english from './ui/english.js';
import * as roleplay from './ui/roleplay.js';
import * as progress from './ui/progress.js';
import * as settings from './ui/settings.js';

const root = document.getElementById('app');
let storage = null;
try { storage = window.localStorage; } catch { storage = null; }
const store = createStore(storage);

const routes = {
  today: today.render,
  progress: progress.render,
  settings: settings.render,
  roleplay: roleplay.render,
  'block/cards': cards.render,
  'block/sound': sound.render,
  'block/listen': (ctx, el) => (ctx.session.nl.shadow ? shadow.render(ctx, el) : limburg.render(ctx, el)),
  'block/speak': speak.render,
  'block/grammar': grammar.render,
  'block/english': english.render,
};
const NEEDS_SESSION = ['block/sound', 'block/listen', 'block/speak', 'block/grammar', 'block/english'];

const ctx = {
  state: store.load(),
  storageOk: store.available,
  session: null,
  course: null,
  loadError: null,
  chunkIndex: {},
  wordIndex: {},
  words: null,
  voices: { nl: null, en: null },
  allVoices: [],
  diary: null,
  update(fn) {
    ctx.state = fn(ctx.state);
    store.save(ctx.state);
  },
  go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  },
  rerender: () => render(),
  async reload() {
    await reloadCourse();
    await render();
  },
  markDone(block) {
    ctx.update((s) => (s.done.includes(block) ? s : { ...s, done: [...s.done, block] }));
    ctx.go('#/today');
  },
  async finishSession() {
    const next = nextPosition(ctx.state.position);
    ctx.update((s) => ({
      ...s,
      history: [...s.history, { date: localDate(new Date()), ...s.position }],
      position: next ?? s.position,
      done: [],
      finished: next === null,
    }));
    await reloadCourse();
    ctx.go('#/today');
  },
  async getWords() {
    if (!ctx.words) {
      ctx.words = await loadWords();
      ctx.wordIndex = indexWords(ctx.words);
    }
    return ctx.words;
  },
  cardSources: () => ({ chunkIndex: ctx.chunkIndex, wordIndex: ctx.wordIndex, myPhrases: ctx.state.myPhrases }),
  pickVoices() {
    const s = ctx.state.settings;
    ctx.voices = { nl: pickVoice(ctx.allVoices, 'nl', s.voiceNl), en: pickVoice(ctx.allVoices, 'en', s.voiceEn) };
  },
};

async function reloadCourse() {
  ctx.loadError = null;
  try {
    ctx.course = await loadCourse(ctx.state.position.week);
    ctx.chunkIndex = indexChunks(ctx.course.weeks);
    ctx.session = ctx.course.missing || ctx.state.finished
      ? null
      : buildSession(ctx.state.position, ctx.course.nl, ctx.course.en);
  } catch (e) {
    console.warn(e);
    ctx.loadError = e;
    ctx.session = null;
  }
}

function errorPanel() {
  return h('div', { class: 'card' },
    h('h1', {}, 'Could not load the lessons'),
    h('p', {}, 'Check your internet connection and try again. If you installed the app, open it once while online.'),
    button('Try again', () => ctx.reload(), { class: 'primary' }));
}

async function render() {
  const route = location.hash.replace(/^#\/?/, '') || 'today';
  const view = routes[route] ?? routes.today;
  document.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === route));
  const { week, session } = ctx.state.position;
  document.getElementById('position').textContent = ctx.state.finished ? 'Course complete' : `Week ${week} · Session ${session}`;
  globalThis.speechSynthesis?.cancel?.();
  clear(root);
  if (ctx.loadError) {
    root.append(errorPanel());
  } else if (NEEDS_SESSION.includes(route) && !ctx.session) {
    ctx.go('#/today');
    return;
  } else {
    try {
      await view(ctx, root);
    } catch (e) {
      console.warn(e);
      root.append(h('div', { class: 'card' }, h('p', {}, 'Something went wrong on this screen.'), button('Back to today', () => ctx.go('#/today'), { class: 'primary' })));
    }
  }
  document.body.dataset.ready = route;
  window.scrollTo(0, 0);
}

async function boot() {
  ctx.diary = await openDiary();
  ctx.allVoices = await getVoices();
  ctx.pickVoices();
  globalThis.speechSynthesis?.addEventListener?.('voiceschanged', () => {
    ctx.allVoices = globalThis.speechSynthesis.getVoices();
    ctx.pickVoices();
  });
  await reloadCourse();
  window.addEventListener('hashchange', render);
  await render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
```

- [ ] **Step 5: Write** `js/ui/today.js`

```js
import { h, button } from './dom.js';
import { BLOCKS, blockLabel, streak, diaryId, TOTAL_WEEKS, SESSIONS_PER_WEEK } from '../session.js';
import { accentOf } from '../speech.js';

const card = (title, text) => h('div', { class: 'card' }, h('h1', {}, title), h('p', {}, text));
const cardsLink = () => h('a', { href: '#/block/cards', class: 'card link' }, '🃏 Review your cards →');

function voiceNotice(ctx) {
  const accent = accentOf(ctx.voices.nl);
  if (!accent) {
    return h('div', { class: 'warn' },
      h('p', {}, 'No Dutch voice found on this device, so audio will not play.'),
      h('p', { class: 'small' }, 'iPhone: Settings → Accessibility → Spoken Content → Voices → Dutch → Ellen.'),
      h('p', { class: 'small' }, 'Mac: System Settings → Accessibility → Spoken Content → System voice → Manage Voices → Dutch (Belgium) → Ellen.'));
  }
  if (accent === 'nl') return h('p', { class: 'hint' }, 'Using a Netherlands Dutch voice. Add “Ellen (Belgium)” in your device settings for a Flemish accent.');
  return null;
}

function missionCard(ctx, lang, text, check, week) {
  const key = diaryId(lang, week);
  const status = ctx.state.missions[key];
  const set = (value) => {
    ctx.update((s) => ({ ...s, missions: { ...s.missions, [key]: value } }));
    ctx.rerender();
  };
  return h('div', { class: 'card' },
    h('p', {}, `${lang === 'nl' ? '🇧🇪' : '🇬🇧'} 🎯 Mission this week: ${text}`),
    check ? h('div', {},
      button(status === 'done' ? 'Done ✓' : 'I did it', () => set('done'), { class: status === 'done' ? 'primary' : '' }),
      button('Not yet', () => set('notyet'), { class: status === 'notyet' ? 'primary' : '' })) : null,
    check && status === 'notyet' ? h('p', { class: 'hint' }, 'That is fine. Try it next week — it gets easier every time.') : null);
}

export function render(ctx, root) {
  const { state, session } = ctx;
  root.append(
    h('p', { class: 'muted' }, `🔥 ${streak(state.history)}-day streak · ${state.history.length}/${TOTAL_WEEKS * SESSIONS_PER_WEEK} sessions`),
    ctx.storageOk ? null : h('p', { class: 'warn' }, 'This browser is not saving data (private mode?). Your progress will be lost when you close the page.'),
    voiceNotice(ctx),
  );
  if (state.finished) {
    root.append(card('🎉 You finished all 12 weeks!', 'Keep reviewing your cards, and listen to your speaking diary in Progress.'), cardsLink());
    return;
  }
  if (!session) {
    root.append(card(`Week ${state.position.week} is coming soon`, 'New lessons are being written. Keep reviewing your cards until then.'), cardsLink());
    return;
  }
  root.append(
    h('h1', {}, `Week ${session.week} · Session ${session.session}`),
    h('p', { class: 'muted' }, `🇧🇪 ${session.nl.theme} — ${session.nl.themeEn}`),
    h('p', { class: 'muted' }, `🇬🇧 ${session.en.theme}`),
  );
  if (session.nl.mission.show || session.nl.mission.check) {
    root.append(
      missionCard(ctx, 'nl', session.nl.mission.text, session.nl.mission.check, session.week),
      missionCard(ctx, 'en', session.en.mission.text, session.en.mission.check, session.week),
    );
  }
  const list = h('ol', { class: 'blocks' });
  for (const block of BLOCKS) {
    const label = blockLabel(block, session);
    const done = state.done.includes(block);
    list.append(h('li', {}, h('a', { href: `#/block/${block}`, class: `block${done ? ' done' : ''}` },
      h('span', { class: 'tick', 'aria-label': done ? 'done' : 'not done' }, done ? '✓' : ''),
      h('span', { class: 'title' }, `${label.flag} ${label.title}`),
      h('span', { class: 'min' }, `${label.minutes} min`))));
  }
  root.append(list);
  if (session.last) root.append(h('a', { href: '#/roleplay', class: 'card link' }, '🗣 This week’s role-plays (Claude voice mode) →'));
  const allDone = BLOCKS.every((b) => state.done.includes(b));
  root.append(button(
    allDone ? 'Finish session ✓' : `Finish session (${state.done.length}/${BLOCKS.length} blocks done)`,
    () => ctx.finishSession(),
    { class: 'primary wide', disabled: !allDone },
  ));
}
```

- [ ] **Step 6: Add temporary screen stubs** so the app loads before Tasks 10–13. For each of `cards`, `sound`, `shadow`, `limburg`, `speak`, `grammar`, `english`, `roleplay`, `progress`, `settings`, create `js/ui/<name>.js` with:

```js
import { h } from './dom.js';
export function render(ctx, root) { root.append(h('p', {}, 'Coming in the next task.')); }
```

- [ ] **Step 7: Write** `tools/set-position.html` (a testing helper that sets the course position, then opens the app)

```html
<!doctype html>
<meta charset="utf-8">
<title>Set position (testing)</title>
<script>
  const p = new URLSearchParams(location.search);
  const key = 'taalmaatje.v1';
  let s = null;
  try { s = JSON.parse(localStorage.getItem(key)); } catch {}
  if (!s || s.version !== 1) s = { version: 1 };
  s.position = { week: Number(p.get('week') || 1), session: Number(p.get('session') || 1) };
  s.done = [];
  s.finished = false;
  localStorage.setItem(key, JSON.stringify(s));
  location.replace('../index.html#/' + (p.get('to') || 'today'));
</script>
```

- [ ] **Step 8: Check in the browser**

Run: `python3 -m http.server 8080` (in the background), open `http://localhost:8080/#/today` in Chrome.
Expected:
- "Week 1 · Session 1" with the Dutch and English themes;
- two mission cards;
- six blocks adding up to 37 minutes;
- a disabled "Finish session (0/6 blocks done)" button;
- the tabs work and no errors appear in the console.

At 320 px wide (DevTools device mode) nothing scrolls sideways.

- [ ] **Step 9: Run all tests and commit**

Run: `npm test`
Expected: all tests pass.

```bash
git add index.html css/app.css js/app.js js/ui/ tools/set-position.html
git commit -m "feat: add app shell, router and Today screen"
```

---

### Task 10: Widgets, the Cards screen and Sound of the week

**Files:**
- Create: `js/ui/widgets.js`
- Replace stubs: `js/ui/cards.js`, `js/ui/sound.js`

**Interfaces:**
- Consumes: `ctx` (Task 9); `speak`, `canRecord`, `startRecording`, `canRecognise`, `recognise`, `startTranscript`, `voicesFor` (Task 8); `bestMatch` (Task 5); `introduce`, `introduceExtraWords`, `grade`, `dueQueue`, `cardView`, `shouldRepeat`, `addMyPhrase`, `deleteMyPhrase` (Task 6); `Grade` (Task 1).
- Produces (widgets.js): `RECOG = {nl: ['nl-BE','nl-NL'], en: ['en-GB','en-US']}`; `say(ctx, text, lang, rate?) → Promise`; `speakable(ctx, text, lang, {big}?) → HTMLElement`; `sayItCheck(ctx, target, lang) → HTMLElement | null` (`null` when recognition is unavailable); `recorder(ctx, {onStart, onRecorded}?) → {el, blob, recording, toggle()}`; `compare(ctx, text, lang, blob) → Promise`; `transcriptWidget(lang) → HTMLElement | null`; `cardDetails(ctx, view) → HTMLElement`; `doneBar(ctx, block) → HTMLElement`; `recognitionMessage(err) → string`.
- Produces (sound.js): `render(ctx, root)` and `soundPanel(ctx, sound, lang) → HTMLElement` (used by the English screen in Task 12).

- [ ] **Step 1: Write** `js/ui/widgets.js`

```js
import { h, button, fa } from './dom.js';
import { speak, canRecord, startRecording, canRecognise, recognise, startTranscript } from '../speech.js';
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

async function recogniseWithFallback(lang) {
  const [first, second] = RECOG[lang];
  try {
    return await recognise(first);
  } catch (e) {
    if (e.code === 'language-not-supported') return recognise(second);
    throw e;
  }
}

export function sayItCheck(ctx, target, lang) {
  if (!canRecognise()) return null;
  let tries = 0;
  const out = h('div', { class: 'check-result' });
  const btn = button('🎯 Say it', run, { class: 'secondary' });
  async function run() {
    btn.disabled = true;
    btn.textContent = '🎙 Listening…';
    try {
      const alternatives = await recogniseWithFallback(lang);
      tries++;
      const r = bestMatch(target, alternatives, lang);
      const missed = r.words.filter((w) => w.ok === false);
      out.replaceChildren(
        h('p', { class: 'check-words' }, r.words.map((w) => [h('span', { class: w.ok === null ? '' : w.ok ? 'ok' : 'miss' }, w.text), ' '])),
        h('p', { class: 'hint' }, r.score === 1
          ? 'Understood ✓'
          : alternatives.length ? `It heard: “${alternatives[0]}”` : 'Nothing was heard. Try again, a bit louder.'),
        tries >= 3 && missed.length
          ? h('p', {}, 'Listen to these words: ', missed.map((w) => button(`🔊 ${bare(w.text)}`, () => say(ctx, bare(w.text), lang, 0.7), { class: 'chip' })))
          : null,
      );
    } catch (e) {
      out.replaceChildren(h('p', { class: 'hint' }, recognitionMessage(e)));
    } finally {
      btn.disabled = false;
      btn.textContent = '🎯 Say it again';
    }
  }
  return h('div', { class: 'check' }, btn, out, h('p', { class: 'hint' }, 'Green = understood by speech recognition. A rough check, not a score.'));
}

export function recorder(ctx, { onStart, onRecorded } = {}) {
  if (!canRecord()) {
    return { el: h('p', { class: 'hint' }, 'Recording is not available in this browser. You can still say it out loud.'), blob: null, recording: false, toggle() {} };
  }
  let active = null;
  let url = null;
  const audio = h('audio', { controls: true, hidden: true });
  const status = h('span', { class: 'hint' });
  const api = { blob: null, recording: false, toggle };
  const btn = button('🎙 Record', toggle, { class: 'primary' });
  async function toggle() {
    if (!active) {
      try {
        active = await startRecording();
      } catch {
        status.textContent = 'The microphone is not allowed. Check your browser settings.';
        return;
      }
      api.recording = true;
      btn.textContent = '■ Stop';
      btn.classList.add('recording');
      status.textContent = 'Recording…';
      onStart?.();
    } else {
      const blob = await active.stop();
      active = null;
      api.recording = false;
      api.blob = blob;
      btn.textContent = '🎙 Record again';
      btn.classList.remove('recording');
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
  const out = h('p', { class: 'transcript' });
  const btn = button('🗣 What does it hear?', toggle, { class: 'secondary' });
  async function toggle() {
    if (!session) {
      try { session = startTranscript(RECOG[lang][0]); } catch (e) { out.textContent = recognitionMessage(e); return; }
      btn.textContent = '■ Stop listening';
      out.textContent = 'Listening… speak now.';
      return;
    }
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
```

- [ ] **Step 2: Write** `js/ui/cards.js`

```js
import { h, button } from './dom.js';
import { speakable, sayItCheck, cardDetails, doneBar } from './widgets.js';
import { introduce, introduceExtraWords, grade, dueQueue, cardView, shouldRepeat, addMyPhrase, deleteMyPhrase } from '../cards.js';
import { Grade } from '../srs.js';

export async function render(ctx, root) {
  const now = new Date();
  if (ctx.session) {
    ctx.update((s) => introduce(s, ctx.session.nl.newCards, now));
    if (ctx.state.settings.extraWords > 0) {
      const words = await ctx.getWords();
      const key = `${ctx.session.week}-${ctx.session.session}`;
      ctx.update((s) => introduceExtraWords(s, words, s.settings.extraWords, key, now));
    }
  }
  if (Object.keys(ctx.state.cards).some((id) => id.startsWith('w-'))) await ctx.getWords();

  const queue = dueQueue(ctx.state, now);
  const seen = {};
  const stage = h('div', {});
  root.append(h('h1', {}, '🃏 Cards'), h('p', { class: 'muted' }, `${queue.length} card${queue.length === 1 ? '' : 's'} to review`), stage, myPhrases(ctx), doneBar(ctx, 'cards'));
  next();

  function next() {
    let id = null;
    let view = null;
    while (queue.length && !view) {
      id = queue.shift();
      view = cardView(id, ctx.cardSources());
    }
    if (!view) {
      stage.replaceChildren(h('div', { class: 'card' }, h('p', {}, '✓ No more cards for now. Well done!')));
      return;
    }
    seen[id] = (seen[id] ?? 0) + 1;
    stage.replaceChildren(ctx.state.cards[id].reps === 0 ? newCard(id, view) : reviewCard(id, view));
  }

  function onGrade(id, g) {
    ctx.update((s) => grade(s, id, g, new Date()));
    if (shouldRepeat(ctx.state.cards[id], new Date(), seen[id])) queue.push(id);
    next();
  }

  function newCard(id, view) {
    return h('div', { class: `card ${view.article ?? ''}` },
      h('p', { class: 'label' }, view.lang === 'nl' ? 'New · Dutch' : 'New · English'),
      speakable(ctx, view.text, view.lang, { big: true }),
      cardDetails(ctx, view),
      sayItCheck(ctx, view.text, view.lang),
      button('Got it →', () => onGrade(id, Grade.Good), { class: 'primary' }));
  }

  function reviewCard(id, view) {
    const answer = h('div', { hidden: true },
      speakable(ctx, view.text, view.lang, { big: true }),
      view.stress.length ? h('p', { class: 'stress' }, 'Stress: ', view.stress.join(' · ')) : null,
      sayItCheck(ctx, view.text, view.lang),
      h('p', { class: 'label' }, 'How well did you know it?'),
      h('div', {},
        button('Again', () => onGrade(id, Grade.Again)),
        button('Hard', () => onGrade(id, Grade.Hard)),
        button('Good', () => onGrade(id, Grade.Good), { class: 'primary' }),
        button('Easy', () => onGrade(id, Grade.Easy))));
    const show = button('Show', () => { answer.hidden = false; show.remove(); }, { class: 'primary' });
    return h('div', { class: `card ${view.article ?? ''}` },
      h('p', { class: 'label' }, `Say it in ${view.lang === 'nl' ? 'Dutch' : 'English'}`),
      h('p', { class: 'meaning' }, view.meaning),
      ctx.state.settings.farsi && view.fa ? h('p', { class: 'fa', dir: 'rtl', lang: 'fa' }, view.fa) : null,
      show, answer);
  }
}

function myPhrases(ctx) {
  const msg = h('p', { class: 'hint' });
  const lang = h('select', { name: 'lang' }, h('option', { value: 'nl' }, 'Dutch'), h('option', { value: 'en' }, 'English'));
  const text = h('input', { name: 'text', placeholder: 'Phrase, e.g. give or take', autocomplete: 'off' });
  const meaning = h('input', { name: 'meaning', placeholder: 'Meaning, e.g. more or less', autocomplete: 'off' });
  const note = h('input', { name: 'note', placeholder: 'Where did you hear it? (optional)', autocomplete: 'off' });
  const list = h('ul', {});
  const drawList = () => list.replaceChildren(...ctx.state.myPhrases.map((p) => h('li', {},
    `${p.lang === 'nl' ? '🇧🇪' : '🇬🇧'} ${p.text} — ${p.meaning} `,
    button('Delete', () => {
      if (!confirm(`Delete “${p.text}”?`)) return;
      ctx.update((s) => deleteMyPhrase(s, p.id));
      drawList();
    }, { class: 'chip' }))));
  const form = h('form', { class: 'stack', onSubmit: (e) => {
    e.preventDefault();
    try {
      const result = addMyPhrase(ctx.state, { lang: lang.value, text: text.value, meaning: meaning.value, note: note.value });
      ctx.update(() => result.state);
      text.value = meaning.value = note.value = '';
      msg.textContent = 'Added ✓ It will show up in your cards.';
      drawList();
    } catch (err) {
      msg.textContent = err.message;
    }
  } }, lang, text, meaning, note, h('button', { type: 'submit', class: 'primary' }, 'Save phrase'), msg);
  drawList();
  return h('details', { class: 'card' },
    h('summary', {}, '＋ Add my phrase (from a film, game, class or colleague)'),
    form, h('h3', {}, 'My phrases'), list);
}
```

- [ ] **Step 3: Write** `js/ui/sound.js`

```js
import { h, button, fa } from './dom.js';
import { speakable, sayItCheck, doneBar, RECOG } from './widgets.js';
import { speak, voicesFor } from '../speech.js';

const ROUNDS = 8;
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

export function render(ctx, root) {
  root.append(h('h1', {}, '🇧🇪 Sound of the week'), soundPanel(ctx, ctx.session.nl.sound, 'nl'), doneBar(ctx, 'sound'));
}

export function soundPanel(ctx, sound, lang) {
  const intro = h('div', { class: 'card' },
    h('h2', {}, sound.title),
    h('p', {}, sound.explain),
    h('p', {}, '🔗 ', sound.anchor),
    ctx.state.settings.farsi ? fa(sound.fa) : null);
  return h('section', {},
    sound.intro ? intro : h('details', {}, h('summary', {}, `Show the explanation: ${sound.title}`), intro),
    earQuiz(ctx, sound, lang),
    sound.sayPairs.length ? h('h3', {}, 'Say these pairs') : null,
    sound.sayPairs.map((pair) => h('div', { class: 'card' },
      pair.map((word) => h('div', {}, speakable(ctx, word, lang), sayItCheck(ctx, word, lang))))));
}

function earQuiz(ctx, sound, lang) {
  const voices = voicesFor(ctx.allVoices, lang);
  const box = h('div', { class: 'card' });
  let round = 0;
  let right = 0;

  function start() {
    round = 0;
    right = 0;
    nextRound();
  }

  function finish() {
    ctx.update((s) => {
      const prev = s.ear[sound.id] ?? { right: 0, total: 0 };
      return { ...s, ear: { ...s.ear, [sound.id]: { right: prev.right + right, total: prev.total + ROUNDS } } };
    });
    box.replaceChildren(
      h('p', {}, `You heard ${right} of ${ROUNDS} correctly.`),
      h('p', { class: 'hint' }, 'Your ear gets better with practice, and your pronunciation follows.'),
      button('Play again', start));
  }

  function nextRound() {
    if (round === ROUNDS) return finish();
    round++;
    const pair = pickOne(sound.pairs);
    const answer = Math.floor(Math.random() * 2);
    const voice = voices.length ? pickOne(voices) : ctx.voices[lang];
    const play = (word = pair[answer]) => speak(word, { voice, lang: RECOG[lang][0] });
    const feedback = h('div', {});
    const choices = pair.map((word, i) => button(word, () => {
      if (i === answer) right++;
      choices.forEach((c) => { c.disabled = true; });
      feedback.replaceChildren(
        h('p', {}, i === answer ? '✓ Right!' : `✗ It was “${pair[answer]}”.`),
        button(`🔊 ${pair[0]}`, () => play(pair[0]), { class: 'chip' }),
        button(`🔊 ${pair[1]}`, () => play(pair[1]), { class: 'chip' }),
        button(round === ROUNDS ? 'See result →' : 'Next →', nextRound, { class: 'primary' }));
    }, { class: 'choice' }));
    box.replaceChildren(
      h('p', { class: 'muted' }, `Ear quiz · ${round}/${ROUNDS}`),
      button('🔊 Play again', () => play(), {}),
      h('div', { class: 'choices' }, choices),
      feedback);
    play();
  }

  box.append(
    h('h3', {}, '👂 Ear quiz'),
    h('p', {}, 'Listen and tap the word you hear. The voice changes each time.'),
    voices.length < 2 ? h('p', { class: 'hint' }, 'Tip: install more voices for this language in your device settings to make the quiz better.') : null,
    button('Start ear quiz', start, { class: 'primary' }));
  return box;
}
```

- [ ] **Step 4: Check in the browser** (with the local server from Task 9)

Open `#/block/cards`, then:
1. Session 1's new Dutch cards appear as "New" cards with de/het colour, a Farsi hint, tappable words, 🔊 and 🐢.
2. "Got it" brings a card back once as a review card (meaning → Show → grades).
3. After all cards, "No more cards for now" appears.
4. Add a phrase under "＋ Add my phrase", reload, and it is still listed. Delete it.

Open `#/block/sound`: the explanation shows; 8 ear-quiz rounds work; the result is shown; "Say these pairs" lists 1–2 pairs. In Chrome on the Mac, check that 🎯 marks words green/orange.

- [ ] **Step 5: Run all tests and commit**

Run: `npm test` (all pass)
```bash
git add js/ui/widgets.js js/ui/cards.js js/ui/sound.js
git commit -m "feat: add Cards and Sound of the week screens with say-it check"
```

---

### Task 11: Listen & shadow, Limburg ear, Speak/diary and Grammar screens

**Files:**
- Replace stubs: `js/ui/shadow.js`, `js/ui/limburg.js`, `js/ui/speak.js`, `js/ui/grammar.js`

**Interfaces:**
- Consumes: widgets (Task 10), `ctx` (Task 9).
- Produces (speak.js): `render(ctx, root)` and `speakTask(ctx, prompt, lang) → HTMLElement` (saves to the diary when `prompt.diaryId` is set; used by the English screen in Task 12).

- [ ] **Step 1: Write** `js/ui/shadow.js`

```js
import { h, button } from './dom.js';
import { speakable, sayItCheck, recorder, compare, say, doneBar } from './widgets.js';

export function render(ctx, root) {
  const d = ctx.session.nl.shadow;
  let i = 0;
  const stage = h('div', { class: 'card' });
  const playAll = async () => { for (const line of d.lines) await say(ctx, line.text, 'nl', 0.9); };
  root.append(
    h('h1', {}, `🇧🇪 ${d.title}`),
    h('p', { class: 'muted' }, 'For each line: listen → repeat out loud → record → compare.'),
    button('▶ Play the whole dialogue', playAll),
    stage,
    doneBar(ctx, 'listen'));
  show();

  function show() {
    const line = d.lines[i];
    const rec = recorder(ctx);
    stage.replaceChildren(
      h('p', { class: 'muted' }, `Line ${i + 1} of ${d.lines.length} · ${line.speaker}`),
      speakable(ctx, line.text, 'nl', { big: true }),
      h('details', {}, h('summary', {}, 'Meaning'), h('p', {}, line.en)),
      rec.el,
      button('⇄ Compare: original, then me', () => compare(ctx, line.text, 'nl', rec.blob)),
      sayItCheck(ctx, line.text, 'nl'),
      h('div', { class: 'nav-row' },
        button('← Back', () => { i -= 1; show(); }, { disabled: i === 0 }),
        button(i === d.lines.length - 1 ? 'From the top ↺' : 'Next line →', () => { i = (i + 1) % d.lines.length; show(); }, { class: 'primary' })));
  }
}
```

- [ ] **Step 2: Write** `js/ui/limburg.js`

```js
import { h } from './dom.js';
import { speakable, doneBar } from './widgets.js';

export function render(ctx, root) {
  root.append(
    h('h1', {}, '🇧🇪 Limburg ear'),
    h('p', { class: 'muted' }, 'You will hear these forms from colleagues. Understand them, but practise speaking the standard form.'),
    ctx.session.nl.limburg.map((p) => h('div', { class: 'card' },
      h('p', { class: 'label' }, 'Standard'),
      speakable(ctx, p.standard, 'nl'),
      h('p', { class: 'label' }, 'Everyday (Flemish / Limburg)'),
      h('p', { class: 'everyday' }, p.everyday),
      h('p', { class: 'hint' }, p.note))),
    h('p', { class: 'hint' }, 'The app voice cannot say the everyday forms correctly, so they are shown as text only. Listen for them at work!'),
    doneBar(ctx, 'listen'));
}
```

- [ ] **Step 3: Write** `js/ui/speak.js`

```js
import { h } from './dom.js';
import { speakable, recorder, transcriptWidget, doneBar } from './widgets.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function render(ctx, root) {
  const nl = ctx.session.nl;
  root.append(h('h1', {}, nl.diary ? '🇧🇪 Speaking diary' : '🇧🇪 Speak'), speakTask(ctx, nl.diary ?? nl.speak, 'nl'), doneBar(ctx, 'speak'));
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
```

- [ ] **Step 4: Write** `js/ui/grammar.js`

```js
import { h, button, fa } from './dom.js';
import { speakable, sayItCheck, doneBar } from './widgets.js';

export function render(ctx, root) {
  const g = ctx.session.nl.grammar;
  const intro = h('div', { class: 'card' }, h('h2', {}, g.title), h('p', {}, g.explain), ctx.state.settings.farsi ? fa(g.fa) : null);
  root.append(
    h('h1', {}, `🇧🇪 Grammar${g.review ? ' review' : ''}: ${g.title}`),
    g.intro ? intro : h('details', {}, h('summary', {}, 'Show the explanation'), intro),
    h('p', { class: 'muted' }, 'Say the full sentence out loud first. Then tap Show.'),
    g.items.map((item, n) => {
      const answer = h('div', { hidden: true }, speakable(ctx, item.answer, 'nl'), sayItCheck(ctx, item.answer, 'nl'));
      const show = button('Show', () => { answer.hidden = false; show.remove(); });
      return h('div', { class: 'card' }, h('p', {}, `${n + 1}. ${item.prompt}`), show, answer);
    }),
    doneBar(ctx, 'grammar'));
}
```

- [ ] **Step 5: Check in the browser**

1. `#/block/listen` (session 1) shows 5 lines of "Eerste dag op het werk". Record → play → Compare plays Ellen, then your voice. Next/Back work; on the last line the button says "From the top ↺".
2. `#/block/speak` shows the prompt, 4 frames, a 1:00 timer that counts down when recording starts and stops at 0:00, "What does it hear?", and the model answer in a collapsed section.
3. `#/block/grammar` shows the explanation with the Farsi hint and 4 items. Show reveals the answer + 🎯.
4. Open `http://localhost:8080/tools/set-position.html?week=1&session=5&to=block/listen`. It shows the Limburg ear with 8 pairs. The speak block shows "Speaking diary" and saving shows "✓ Saved in your speaking diary".

- [ ] **Step 6: Run all tests and commit**

Run: `npm test` (all pass)
```bash
git add js/ui/shadow.js js/ui/limburg.js js/ui/speak.js js/ui/grammar.js
git commit -m "feat: add shadowing, Limburg ear, speaking diary and grammar screens"
```

---

### Task 12: English block and role-play screens

**Files:**
- Replace stubs: `js/ui/english.js`, `js/ui/roleplay.js`

**Interfaces:**
- Consumes: `soundPanel` (Task 10), `speakTask` (Task 11), widgets, `introduce`, `cardView` (Task 6).

- [ ] **Step 1: Write** `js/ui/english.js`

```js
import { h } from './dom.js';
import { speakable, sayItCheck, cardDetails, doneBar } from './widgets.js';
import { soundPanel } from './sound.js';
import { speakTask } from './speak.js';
import { introduce, cardView } from '../cards.js';

export function render(ctx, root) {
  const en = ctx.session.en;
  ctx.update((s) => introduce(s, en.newCards, new Date()));
  const phrases = en.newCards.map((id) => cardView(id, ctx.cardSources())).filter(Boolean);
  root.append(
    h('h1', {}, `🇬🇧 English: ${en.theme}`),
    h('h2', {}, '1 · Sound of the week'),
    soundPanel(ctx, en.sound, 'en'),
    h('h2', {}, '2 · New phrases'),
    h('p', { class: 'hint' }, 'These phrases come back later in your cards.'),
    phrases.map((v) => h('div', { class: 'card' }, speakable(ctx, v.text, 'en', { big: true }), cardDetails(ctx, v), sayItCheck(ctx, v.text, 'en'))),
    h('h2', {}, en.diary ? '3 · Speaking diary: explain your course' : '3 · Speak'),
    speakTask(ctx, en.diary ?? en.speak, 'en'),
    doneBar(ctx, 'english'));
}
```

- [ ] **Step 2: Write** `js/ui/roleplay.js`

```js
import { h, button } from './dom.js';

function promptCard(flag, rp) {
  const area = h('textarea', { readonly: true, rows: 9 }, rp.prompt);
  const msg = h('span', { class: 'ok-text' });
  return h('section', { class: 'card' },
    h('h2', {}, `${flag} ${rp.title}`),
    area,
    button('📋 Copy prompt', async () => {
      try {
        await navigator.clipboard.writeText(rp.prompt);
        msg.textContent = 'Copied ✓';
      } catch {
        area.select();
        msg.textContent = 'Select all and copy.';
      }
    }, { class: 'primary' }),
    msg);
}

export function render(ctx, root) {
  const s = ctx.session;
  root.append(
    h('h1', {}, '🗣 Role-play'),
    h('p', {}, 'Copy a prompt, open the Claude app, start voice mode, paste the prompt and talk for about 10 minutes.'),
    h('p', { class: 'hint' }, 'Voice assistants mostly hear text, so they are great for fluency and confidence, but not for judging single sounds. Use the 🎯 check in this app for that.'),
    s?.last ? [promptCard('🇧🇪', s.nl.roleplay), promptCard('🇬🇧', s.en.roleplay)] : h('p', { class: 'muted' }, 'Role-plays open in session 5 of each week.'),
    h('a', { href: '#/today', class: 'button' }, '← Back to today'));
}
```

- [ ] **Step 3: Check in the browser**

1. `#/block/english` shows the English sound panel (ship/sheep quiz with English voices), 3–4 new phrases with stress marks and Farsi hints, and the speaking task (60 s).
2. With the position set to week 1 session 5, `#/roleplay` shows both prompts, and Copy puts the text on the clipboard.
3. Done ✓ on every block ticks all six on Today and enables "Finish session ✓".
4. Finishing session 1 shows "Week 1 · Session 2" with all ticks reset.

- [ ] **Step 4: Run all tests and commit**

Run: `npm test` (all pass)
```bash
git add js/ui/english.js js/ui/roleplay.js
git commit -m "feat: add English block and role-play screens"
```

---

### Task 13: Progress and Settings screens

**Files:**
- Replace stubs: `js/ui/progress.js`, `js/ui/settings.js`

**Interfaces:**
- Consumes: `ctx` (Task 9); `isLearned` (Task 1); `streak`, `localDate` (Task 6); `voicesFor`, `speak` (Task 8); `buildExport`, `parseImport`, `defaultState` (Task 7).

- [ ] **Step 1: Write** `js/ui/progress.js`

```js
import { h } from './dom.js';
import { isLearned } from '../srs.js';
import { streak } from '../session.js';

const stat = (value, label) => h('div', { class: 'stat' }, h('b', {}, String(value)), label);

export async function render(ctx, root) {
  const s = ctx.state;
  const learned = Object.values(s.cards).filter(isLearned).length;
  const titles = Object.fromEntries((ctx.course?.weeks ?? []).map((w) => [w.sound.id, `${w.lang === 'nl' ? '🇧🇪' : '🇬🇧'} ${w.sound.title}`]));
  const ear = Object.entries(s.ear);
  root.append(
    h('h1', {}, 'Progress'),
    h('div', { class: 'stats' },
      stat(s.history.length, 'sessions done'),
      stat(streak(s.history), 'day streak'),
      stat(learned, 'cards learned'),
      stat(s.myPhrases.length, 'my phrases')),
    h('h2', {}, '👂 Ear quiz'),
    ear.length
      ? h('ul', {}, ear.map(([id, r]) => h('li', {}, `${titles[id] ?? id}: ${Math.round((100 * r.right) / r.total)}% (${r.right}/${r.total})`)))
      : h('p', { class: 'muted' }, 'No ear quizzes yet.'),
    h('h2', {}, '📔 Speaking diary'));

  const entries = await ctx.diary.all();
  if (!entries.length) root.append(h('p', { class: 'muted' }, 'Your first diary recordings happen in session 5 of week 1.'));
  for (const [lang, label] of [['nl', '🇧🇪 Dutch'], ['en', '🇬🇧 English']]) {
    const list = entries.filter((e) => e.id.startsWith(`${lang}-`));
    if (!list.length) continue;
    root.append(h('h3', {}, label), list.map((e) => h('div', { class: 'diary-entry' },
      h('span', {}, `Week ${Number(e.id.slice(3))} · ${new Date(e.date).toLocaleDateString()}`),
      h('audio', { controls: true, preload: 'none', src: URL.createObjectURL(e.blob) }))));
  }
  if (!ctx.diary.persistent) root.append(h('p', { class: 'warn' }, 'This browser cannot keep recordings after you close the page.'));
}
```

- [ ] **Step 2: Write** `js/ui/settings.js`

```js
import { h, button } from './dom.js';
import { voicesFor, speak } from '../speech.js';
import { buildExport, parseImport, defaultState } from '../store.js';
import { localDate } from '../session.js';

export function render(ctx, root) {
  const s = ctx.state.settings;
  const set = (patch) => {
    ctx.update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
    ctx.pickVoices();
  };
  root.append(
    h('h1', {}, 'Settings'),
    h('label', { class: 'row' },
      h('input', { type: 'checkbox', checked: s.farsi, onChange: (e) => set({ farsi: e.target.checked }) }),
      'Show Farsi hints ', h('span', { dir: 'rtl', lang: 'fa' }, '(راهنمای فارسی)')),
    voiceRow(ctx, 'nl', 'Dutch voice', s.voiceNl, 'Hallo, dit is mijn stem.', (v) => set({ voiceNl: v })),
    voiceRow(ctx, 'en', 'English voice', s.voiceEn, 'Hello, this is my voice.', (v) => set({ voiceEn: v })),
    h('label', { class: 'row' }, 'Extra Dutch words per session',
      h('select', { onChange: (e) => set({ extraWords: Number(e.target.value) }) },
        [0, 3, 5, 10].map((n) => h('option', { value: n, selected: n === s.extraWords }, String(n))))),
    h('p', { class: 'hint' }, 'Extra words come from a list of 1,946 common Dutch words (from the open-source app “woorden”). 0 = only the course chunks.'),
    h('h2', {}, 'Backup'),
    h('p', { class: 'hint' }, 'Your progress and recordings stay on this device; nothing is sent to a server. Use a backup to move to another device.'),
    backup(ctx),
    h('h2', {}, 'Start over'),
    button('Reset all progress', async () => {
      if (!confirm('Delete all progress and recordings?') || !confirm('Are you sure? This cannot be undone.')) return;
      ctx.update(() => defaultState());
      await ctx.diary.clear();
      ctx.pickVoices();
      await ctx.reload();
    }));
}

function voiceRow(ctx, lang, label, current, sample, onPick) {
  const voices = voicesFor(ctx.allVoices, lang);
  return h('label', { class: 'row' }, label,
    h('select', { onChange: (e) => onPick(e.target.value) },
      h('option', { value: '' }, 'Automatic (best available)'),
      voices.map((v) => h('option', { value: v.name, selected: v.name === current }, `${v.name} (${v.lang})`))),
    button('🔊 Test', () => speak(sample, { voice: ctx.voices[lang], lang: lang === 'nl' ? 'nl-BE' : 'en-GB' }), { class: 'chip' }),
    voices.length ? null : h('span', { class: 'hint' }, 'No voice installed for this language.'));
}

function backup(ctx) {
  const msg = h('p', { class: 'hint' });
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onChange: async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = parseImport(await f.text());
      if (!confirm('Replace your current progress with this backup?')) return;
      ctx.update(() => data.state);
      await ctx.diary.clear();
      for (const entry of data.diary) await ctx.diary.put(entry);
      ctx.pickVoices();
      await ctx.reload();
    } catch (err) {
      msg.textContent = err.message;
    }
  } });
  return h('div', {},
    button('⬇ Download backup', async () => {
      const text = await buildExport(ctx.state, await ctx.diary.all());
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = h('a', { href: url, download: `taalmaatje-backup-${localDate(new Date())}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      msg.textContent = 'Backup downloaded ✓';
    }, { class: 'primary' }),
    button('⬆ Restore from backup', () => file.click()),
    file, msg);
}
```

- [ ] **Step 3: Check in the browser**

1. Settings: turning Farsi hints off hides the Farsi on Cards and Grammar; the voice lists show Ellen (nl-BE) and Xander (nl-NL) on the Mac; 🔊 Test speaks.
2. "Download backup" saves a JSON file. Reset (twice confirm) → Week 1 · Session 1. Restoring the backup brings back the old position.
3. Progress after an ear quiz and a diary recording (week 1 session 5) shows the stats, the ear-quiz percentage with the sound title, and a playable diary entry.
4. `tools/set-position.html?week=2&session=1&to=today` shows "Week 2 is coming soon" and the "Review your cards" link works.

- [ ] **Step 4: Run all tests and commit**

Run: `npm test` (all pass)
```bash
git add js/ui/progress.js js/ui/settings.js
git commit -m "feat: add Progress and Settings screens with backup and reset"
```

---

### Task 14: Installable offline app (manifest, service worker, icons) and README

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`, `tools/icon.html`, `README.md`
- Test: `test/sw.test.mjs`

**Interfaces:**
- Consumes: the file list of all previous tasks.

- [ ] **Step 1: Write the failing test** — `test/sw.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const sw = await readFile(new URL('sw.js', root), 'utf8');
const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));

test('every file in the offline list exists', async () => {
  for (const f of shell.filter((x) => x !== './')) await access(new URL(f, root));
});

test('every JS module is in the offline list', async () => {
  const js = (await readdir(new URL('js/', root))).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`);
  const ui = (await readdir(new URL('js/ui/', root))).filter((f) => f.endsWith('.js')).map((f) => `js/ui/${f}`);
  for (const f of [...js, ...ui]) assert.ok(shell.includes(f), `${f} is missing from SHELL in sw.js`);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/sw.test.mjs`
Expected: FAIL, `ENOENT ... sw.js`.

- [ ] **Step 3: Write** `sw.js`

```js
const CACHE = 'taalmaatje-v1';
const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'vendor/ts-fsrs.mjs',
  'js/app.js',
  'js/cards.js',
  'js/content.js',
  'js/diary.js',
  'js/match.js',
  'js/session.js',
  'js/speech.js',
  'js/srs.js',
  'js/store.js',
  'js/ui/cards.js',
  'js/ui/dom.js',
  'js/ui/english.js',
  'js/ui/grammar.js',
  'js/ui/limburg.js',
  'js/ui/progress.js',
  'js/ui/roleplay.js',
  'js/ui/settings.js',
  'js/ui/shadow.js',
  'js/ui/sound.js',
  'js/ui/speak.js',
  'js/ui/today.js',
  'js/ui/widgets.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first, so new lessons appear as soon as they are online; cache when offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit ?? Response.error())),
  );
});
```

- [ ] **Step 4: Write** `manifest.webmanifest`

```json
{
  "name": "Taalmaatje — Dutch & English speaking",
  "short_name": "Taalmaatje",
  "start_url": "./#/today",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f7f5f0",
  "theme_color": "#1f6f5c",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

- [ ] **Step 5: Write the icon and render the PNGs**

`icons/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#1f6f5c"/>
  <path d="M120 140h272a40 40 0 0 1 40 40v136a40 40 0 0 1-40 40H246l-78 62v-62h-48a40 40 0 0 1-40-40V180a40 40 0 0 1 40-40z" fill="#f7f5f0"/>
  <text x="256" y="296" font-family="Georgia, 'Times New Roman', serif" font-size="150" font-weight="700" text-anchor="middle" fill="#1f6f5c">Tm</text>
</svg>
```

`tools/icon.html`:
```html
<!doctype html>
<meta charset="utf-8">
<style>html, body { margin: 0; background: transparent; }</style>
<img src="../icons/icon.svg" width="512" height="512" alt="">
```

Render:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --window-size=512,512 --default-background-color=00000000 \
  --screenshot="$PWD/icons/icon-512.png" "file://$PWD/tools/icon.html"
sips -z 192 192 icons/icon-512.png --out icons/icon-192.png
sips -g pixelWidth -g pixelHeight icons/icon-512.png icons/icon-192.png
```
Expected: 512×512 and 192×192. Open `icons/icon-512.png` and check that the icon fills the image.

- [ ] **Step 6: Write** `README.md`

````markdown
# Taalmaatje

A daily speaking course for **Flemish Dutch** (work and daily life in Hasselt) and **English** (university), made for a Farsi speaker. About 37 minutes a day: cards, sound of the week, shadowing, speaking, grammar and English.

**Open the app:** https://momi1370.github.io/Language-Learning/

## Install on iPhone

1. Open the link above in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. For the Flemish voice: **Settings → Accessibility → Spoken Content → Voices → Dutch → Ellen**.
4. The first time you use 🎙 or 🎯, allow the microphone and speech recognition.

Your progress and recordings stay on your device. Use **Settings → Backup** to move them.

## Development

```bash
npm test            # unit tests (Node 22+, no dependencies)
npm run validate    # check all lesson files
npm run serve       # http://localhost:8080
npm run smoke       # headless Chrome check of every screen
```

Lessons live in `content/<lang>/week-NN.json`; the format is in `docs/superpowers/specs/2026-10-05-taalmaatje-course-design.md` §5.4.

## Credits

- Extra word list from [woorden](https://github.com/iamsergeyka/woorden) (MIT).
- Scheduling by [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT).
- See `THIRD_PARTY_NOTICES.md` and `content/SOURCES.md`.
````

- [ ] **Step 7: Run all tests and commit**

Run: `npm test`
Expected: all pass, including the 2 service-worker tests.
```bash
git add sw.js manifest.webmanifest icons/ tools/icon.html README.md test/sw.test.mjs
git commit -m "feat: make the app installable and usable offline"
```

---

### Task 15: Smoke test of every screen

**Files:**
- Create: `tools/smoke.mjs`

**Interfaces:**
- Consumes: `tools/set-position.html` (Task 9); `document.body.dataset.ready` set by `render()` (Task 9).

- [ ] **Step 1: Write** `tools/smoke.mjs`

```js
// Opens every screen in headless Chrome and checks it rendered without errors.
import { spawn, execFile } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8765;
const base = `http://localhost:${PORT}`;
const cwd = fileURLToPath(new URL('..', import.meta.url));

const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const profile = await mkdtemp(join(tmpdir(), 'taalmaatje-smoke-'));

let failed = 0;
async function check(url, route, expectText) {
  const result = await run(CHROME, [
    '--headless=new', '--disable-gpu', `--user-data-dir=${profile}`,
    '--virtual-time-budget=8000', '--enable-logging=stderr', '--v=0', '--dump-dom', url,
  ], { maxBuffer: 50e6 }).catch((e) => e);
  const dom = result.stdout ?? '';
  const errors = String(result.stderr ?? '').split('\n').filter((l) => l.includes('CONSOLE') && /Uncaught|TypeError|ReferenceError|SyntaxError/.test(l));
  const problems = [];
  if (!dom.includes(`data-ready="${route}"`)) problems.push('screen did not finish rendering');
  if (dom.includes('Something went wrong on this screen')) problems.push('screen showed the error panel');
  if (expectText && !dom.includes(expectText)) problems.push(`missing text "${expectText}"`);
  problems.push(...errors);
  if (problems.length) failed++;
  console.log(`${problems.length ? '✗' : '✓'} ${url.replace(base, '')}${problems.map((p) => `\n   - ${p}`).join('')}`);
}

const routes = ['today', 'block/cards', 'block/sound', 'block/listen', 'block/speak', 'block/grammar', 'block/english', 'roleplay', 'progress', 'settings'];
for (const r of routes) await check(`${base}/index.html#/${r}`, r);
await check(`${base}/tools/set-position.html?week=1&session=5&to=block/listen`, 'block/listen', 'Limburg ear');
await check(`${base}/tools/set-position.html?week=1&session=5&to=block/speak`, 'block/speak', 'Speaking diary');
await check(`${base}/tools/set-position.html?week=1&session=5&to=roleplay`, 'roleplay', 'Copy prompt');
await check(`${base}/tools/set-position.html?week=2&session=1&to=today`, 'today', 'coming soon');

server.kill();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll screens OK');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it**

Run: `npm run smoke`
Expected: 14 `✓` lines and `All screens OK`. Headless Chrome has no speech recognition, so this also checks that screens render with 🎯 hidden (Review Focus 3).

If the `set-position` checks fail only because `--dump-dom` captured the helper page before the redirect, change those four checks to open `index.html` directly after a first visit to `set-position.html` with the same `--user-data-dir`. Do not loosen the other checks.

- [ ] **Step 3: Fix anything that fails, rerun until all pass, then commit**

```bash
npm test && npm run validate && npm run smoke
git add tools/smoke.mjs
git commit -m "test: add headless smoke test for every screen"
```

---

### Task 16: Deploy to GitHub Pages and hand over the iPhone checklist

**Files:**
- Modify: none (repo settings only)

The learner approved making the repo public and using GitHub Pages (spec §10, 2026-10-05).

- [ ] **Step 1: Final local check**

Run: `npm test && npm run validate && npm run smoke`
Expected: everything passes.

- [ ] **Step 2: Check that the public repo will hold no personal files**

Run: `git ls-files | grep -viE '^(index\.html|manifest\.webmanifest|sw\.js|\.nojekyll|\.gitignore|package\.json|LICENSE|THIRD_PARTY_NOTICES\.md|README\.md|css/|js/|vendor/|icons/|content/|tools/|test/|docs/)'`
Expected: no output (only app files are tracked; nothing from `../Telegram-chat` or `../Dutch language course`).

- [ ] **Step 3: Push, make the repo public, turn on Pages**

```bash
git push origin main
gh repo edit Momi1370/Language-Learning --visibility public --accept-visibility-change-consequences
gh api -X POST repos/Momi1370/Language-Learning/pages -f 'source[branch]=main' -f 'source[path]=/'
```

- [ ] **Step 4: Wait for the build and check the site**

```bash
gh api repos/Momi1370/Language-Learning/pages/builds/latest --jq .status   # repeat until "built"
curl -sI https://momi1370.github.io/Language-Learning/ | head -1                       # HTTP/2 200
curl -s https://momi1370.github.io/Language-Learning/content/nl/week-01.json | head -c 80
curl -s -o /dev/null -w '%{http_code}\n' https://momi1370.github.io/Language-Learning/content/nl/week-02.json   # 404
```

- [ ] **Step 5: Hand over the iPhone checklist to the learner**

1. Open https://momi1370.github.io/Language-Learning/ in Safari → Share → Add to Home Screen → open from the home screen.
2. Settings → Dutch voice shows **Ellen (nl-BE)**; 🔊 Test sounds Flemish. If not: Settings → Accessibility → Spoken Content → Voices → Dutch → Ellen.
3. Cards: tap a single word → it is said slowly.
4. 🎯 Say it: allow microphone + speech recognition; words turn green when understood.
5. Shadow: record → play → Compare.
6. Sound: the ear quiz plays and counts.
7. Airplane mode → close and reopen the app → it still opens Week 1.
8. Settings → Download backup works.

Report back anything that fails. Recognition inside the home-screen app on iOS is the most likely issue; if so, the fallback is opening the same URL in Safari.

---

## Self-Review Notes

- **Spec coverage:**

  | Spec | Covered by |
  |---|---|
  | §4.1 blocks/minutes | Task 6 test (37 min) |
  | §4.2 session plan | Task 6 |
  | §4.4 pronunciation | Tasks 5, 10, 11, 12 |
  | §4.5 Farsi hints | content + `fa()` + setting |
  | §4.6 Limburg ear + sources | Tasks 4, 11 |
  | §4.7 existing input | My phrases in Task 10; "Explain your course" in Task 4 `en-01-s5` |
  | §4.8 role-play/mission | Tasks 9, 12 |
  | §5.2 screens | Tasks 9–13 |
  | §5.3 units | Tasks 1–8 |
  | §5.4 schema | Task 2 |
  | §5.5 storage | Task 7 |
  | §5.6 degradation | Tasks 9, 10, 13, 15 |
  | §6 licences | Task 1 |
  | §7 hosting | Task 16 |
  | §8 testing | all tasks |
  | §9 milestone 1 + diary | this plan |

- **Refinement vs. spec:** missions are keyed per language (`"nl-01"`, `"en-01"`), and state has `extraFor` and `finished`. The spec's §5.5 line was updated to match.
