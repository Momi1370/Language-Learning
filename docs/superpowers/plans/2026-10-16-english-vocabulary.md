# English Vocabulary (Words tab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a **Words** tab to Taalmaatje: about 120 everyday English words (pack 1) with American IPA, a stress guide, a Farsi meaning and note, at least two modern example sentences with Farsi translations, a daily batch with "I know it / Teach me", and flashcards (capped at 10 reviews per session) in the existing Cards block.

**Architecture:** Content is JSON packs (`content/vocab/pack-NN.json`) loaded like the weekly files and cached offline by the service worker. IPA is generated from the CMU Pronouncing Dictionary at authoring time by `tools/vocab-ipa.mjs`, never typed by hand. Learning state is a small `vocab` object in the existing state, and all batch/triage/cap rules are pure functions in `js/vocab.js`, so they are unit-tested without a browser. The UI is one new screen file (`js/ui/words.js`) plus small changes to Cards, Settings and Progress.

**Tech Stack:** Plain ES modules (no build), JSON content, `node --test`, headless-Chrome smoke test (`tools/smoke.mjs`), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-16-english-vocabulary-design.md` (read it first). Conventions and tooling from earlier work: `docs/superpowers/plans/2026-10-06-taalmaatje-milestone-2.md`.

## Global Constraints

- Work in a git worktree: `git worktree add .claude/worktrees/vocab -b feature-vocab` from `/Users/user/Document/EN Learning/Language-Learning` (local `main`, which already contains the spec commit `6755392`). Deploy with `git push origin HEAD:main` from that worktree. Deploying is part of this plan (Task 7 and, for a first look, Task 6); the learner approves the plan including this.
- Checks before every commit that changes code or content: `npm test && npm run validate && npm run smoke` — all green. (For Tasks 1–2 `npm run smoke` can be skipped until Task 5, but must still pass when run.)
- End every commit message with the attribution line the session's system reminder gives (currently `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
- No text, definition or example sentence is copied from any published book or dictionary. All sentences, Farsi and notes are self-written.
- Word choice comes only from the table in Task 3 (taken from NGSL-Spoken 1.2). IPA comes only from `cmudict.dict` through `tools/vocab-ipa.mjs`.
- **Example sentences must be today's spoken English** (spec §5): 5–16 words, contractions where people use them, everyday situations (work and meetings, uni, shopping and delivery, messaging and apps, travel, health, home). Rejected by test: *whom, whilst, I/you/he/she/it/we/they shall, ought to, upon, thus, perchance, I dare say, one must, thou, henceforth*.
- Public repo: no employer names, no real people, no personal details. Names in examples are made up.
- Every word has 2 or 3 examples; each example contains one of the word's `forms`.
- Farsi (`fa.meaning`, `fa.note`, every example `fa`) is written in Persian script. Farsi hints can be switched off in Settings: then `fa.note` and the example translations are hidden, the Farsi meaning stays.
- `ipa` is American English (CMUdict). The app's English voice is British; the word page says "American English".
- State shape (spec §7): `state.vocab = { known: string[], day: { date: string, ids: string[] }, reviews: { key: string, count: number } }` and `settings.vocabPerDay` (3, 5 or 10; default 5). `state.version` stays `1`.
- Constants: `MIN_PACK_WORDS = 100`, `VOCAB_REVIEW_CAP = 10`, example length 5–16 words.
- New JS modules and the pack file must be added to `SHELL` in `sw.js` (the tests enforce it).
- Code licence stays MIT; `content/vocab/` is CC BY-SA 4.0 (NGSL word list). Credit NGSL (Browne & Culligan) and CMU in `THIRD_PARTY_NOTICES.md` and `content/vocab/README.md`.

## Review Focus

1. A word with one example, an example that does not contain the word, or a stress guide that disagrees with the IPA would teach something wrong — Task 2 tests.
2. Reopening the Words tab on the same day must show the same batch; a new day gives the next undecided words; an empty or failed pack load must never store an empty batch for the day — Task 4 tests.
3. An old save or old backup (no `vocab`, no `vocabPerDay`, or garbage there) must still load — Task 3 (store) tests.
4. A word already taught in the English course weeks (for example *catch* in "I didn't quite catch that") must not be in the pack — Task 2 `courseOverlap` test and the real-file test.
5. No English voice, speech recognition missing (iPhone home-screen app), Farsi hints off, or a pack that fails to load must never crash the Words screens — Task 5 smoke tests.
6. Vocabulary reviews must not flood the daily Cards block (cap of 10 per session) — Task 4 unit test and Task 6 smoke test.

---

## File map

| File | Change | Task |
|---|---|---|
| `tools/ipa.mjs` | new: ARPAbet → IPA, CMUdict parser, IPA syllable helpers | 1 |
| `tools/vocab-ipa.mjs` | new: `fillIpa` + command line | 1 |
| `test/ipa.test.mjs` | new | 1 |
| `js/vocabtext.js` | new: `formMatches`, `clozeOf` (also used by the validator) | 2 |
| `tools/vocab-schema.mjs` | new: `validateVocab`, `findVocabRepeats`, `courseOverlap` | 2 |
| `tools/validate.mjs` | also validates vocabulary packs | 2 |
| `test/vocabtext.test.mjs`, `test/vocab-schema.test.mjs`, `test/fixtures.mjs`, `test/content-files.test.mjs` | new/extended | 2 |
| `content/vocab/pack-01.json`, `content/vocab/README.md`, `THIRD_PARTY_NOTICES.md` | new/extended: 120 words | 3 |
| `js/store.js`, `test/store.test.mjs` | `vocab`, `vocabPerDay` in state and `migrate` | 4 |
| `js/vocab.js`, `test/vocab.test.mjs` | new: batch, triage, search, cap | 4 |
| `js/content.js`, `test/vocab-load.test.mjs` | `loadVocab` | 4 |
| `js/cards.js` | `cardView` handles vocabulary ids | 4 |
| `js/ui/words.js`, `js/app.js`, `index.html`, `css/app.css`, `sw.js`, `test/sw.test.mjs`, `tools/smoke.mjs` | Words tab, routes, nav, offline | 5 |
| `js/ui/cards.js`, `js/ui/settings.js`, `js/ui/progress.js`, `tools/smoke.mjs` | vocabulary cards, cap, setting, progress line | 6 |
| `README.md`, spec status | docs, deploy | 7 |

---

### Task 1: IPA from the CMU dictionary

**Files:**
- Create: `tools/ipa.mjs`, `tools/vocab-ipa.mjs`, `test/ipa.test.mjs`

**Interfaces:**
- Produces (from `tools/ipa.mjs`): `arpaToIpa(phones: string[]): string`, `parseCmudict(text: string): Map<string, string[]>`, `ipaFor(phrase: string, dict: Map): string` (throws `Error('not in the pronunciation dictionary: "x"')`), `ipaSyllableCount(ipa: string): number`, `ipaStressedSyllables(ipa: string): number[]` (0-based syllable indexes that follow a primary-stress mark `ˈ`).
- Produces (from `tools/vocab-ipa.mjs`): `fillIpa(pack, dict, { force }?) → { pack, missing: string[] }`; command line `node tools/vocab-ipa.mjs <pack.json> <cmudict.dict>`.

- [ ] **Step 0: Set up the worktree and the dictionary**

```bash
cd "/Users/user/Document/EN Learning/Language-Learning"
git worktree add .claude/worktrees/vocab -b feature-vocab
cd .claude/worktrees/vocab
SP=/private/tmp/claude-501/-Users-user-Document-EN-Learning/ab24d292-c83a-4fb7-89ee-38c1f12e5a6e/scratchpad
mkdir -p $SP/cmu && test -s $SP/cmu/cmudict.dict || curl -sL -o $SP/cmu/cmudict.dict https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
wc -l $SP/cmu/cmudict.dict
npm test 2>&1 | grep -E "^# (pass|fail)"
```
Expected: about 135,000 lines; baseline tests pass (130).

- [ ] **Step 1: Write the failing tests**

`test/ipa.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arpaToIpa, parseCmudict, ipaFor, ipaSyllableCount, ipaStressedSyllables } from '../tools/ipa.mjs';
import { fillIpa } from '../tools/vocab-ipa.mjs';

const P = (s) => s.split(' ');

test('a stressed first syllable gets the mark at the very start', () => {
  assert.equal(arpaToIpa(P('F IH1 G Y ER0')), 'ˈfɪɡjɚ');
  assert.equal(arpaToIpa(P('AA1 N AH0 S T L IY0')), 'ˈɑnəstli');
  assert.equal(arpaToIpa(P('S T AH1 F')), 'ˈstʌf');
});

test('the mark goes before the whole onset of the stressed syllable', () => {
  assert.equal(arpaToIpa(P('AH0 F AO1 R D')), 'əˈfɔɹd');
  assert.equal(arpaToIpa(P('R IH0 L AY1 AH0 B AH0 L')), 'ɹɪˈlaɪəbəl');
  assert.equal(arpaToIpa(P('IH0 K S P EH1 N S IH0 V')), 'ɪkˈspɛnsɪv');
  assert.equal(arpaToIpa(P('IH0 M P AO1 R T AH0 N T')), 'ɪmˈpɔɹtənt');
  assert.equal(arpaToIpa(P('S T R AH1 G AH0 L')), 'ˈstɹʌɡəl');
});

test('secondary stress gets its own mark', () => {
  assert.equal(arpaToIpa(P('AH2 N D ER0 S T AE1 N D')), 'ˌʌndɚˈstænd');
});

test('an unknown phone is an error, not a silent gap', () => {
  assert.throws(() => arpaToIpa(P('S Q AH1')), /Q/);
});

test('the dictionary parser keeps the first pronunciation and skips comments', () => {
  const dict = parseCmudict(';;; a comment\nhonestly AA1 N AH0 S T L IY0\nhonestly(2) AA1 N AH0 S L IY0\n');
  assert.deepEqual(dict.get('honestly'), ['AA1', 'N', 'AH0', 'S', 'T', 'L', 'IY0']);
  assert.equal(dict.size, 1);
});

test('a phrase is looked up word by word; a weak second word carries no stress mark', () => {
  const dict = parseCmudict('deal D IY1 L\nwith W IH1 DH\nfigure F IH1 G Y ER0\nout AW1 T\n');
  assert.equal(ipaFor('deal with', dict), 'ˈdil wɪð');
  assert.equal(ipaFor('figure out', dict), 'ˈfɪɡjɚ ˈaʊt');
});

test('a word that is not in the dictionary is reported by name', () => {
  assert.throws(() => ipaFor('blorptastic', new Map()), /blorptastic/);
});

test('syllables and stressed syllables are counted from the IPA', () => {
  assert.equal(ipaSyllableCount('ɹɪˈlaɪəbəl'), 4);
  assert.deepEqual(ipaStressedSyllables('ɹɪˈlaɪəbəl'), [1]);
  assert.equal(ipaSyllableCount('ˈfɪɡjɚ ˈaʊt'), 3);
  assert.deepEqual(ipaStressedSyllables('ˈfɪɡjɚ ˈaʊt'), [0, 2]);
  assert.deepEqual(ipaStressedSyllables('ˌʌndɚˈstænd'), [2]);
});

test('fillIpa adds IPA, leaves existing IPA alone and lists words the dictionary does not have', () => {
  const dict = parseCmudict('stuff S T AH1 F\n');
  const { pack, missing } = fillIpa({ pack: 1, words: [{ word: 'stuff' }, { word: 'zzz' }, { word: 'kept', ipa: 'x' }] }, dict);
  assert.equal(pack.words[0].ipa, 'ˈstʌf');
  assert.deepEqual(missing, ['zzz']);
  assert.equal(pack.words[2].ipa, 'x');
});
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test test/ipa.test.mjs`
Expected: FAIL — cannot find `tools/ipa.mjs`.

- [ ] **Step 3: Implement `tools/ipa.mjs`**

```js
// ARPAbet (CMU Pronouncing Dictionary) → IPA for American English, with stress marks.
// IPA is generated, never typed by hand (spec §5).
const VOWELS = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', EH: 'ɛ', ER: 'ɝ', EY: 'eɪ', IH: 'ɪ', IY: 'i',
  OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'u',
};
const CONSONANTS = {
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ',
  P: 'p', R: 'ɹ', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};
// Consonant clusters that can start an English syllable: the stress mark goes before the longest one.
const ONSET2 = new Set('pl pɹ pj bl bɹ bj tɹ tw tj dɹ dw dj kl kɹ kw kj ɡl ɡɹ ɡw fl fɹ fj vɹ vj θɹ θw ʃɹ sl sw sj sp st sk sm sn hj mj nj lj'.split(' '));
const ONSET3 = new Set('spl spɹ spj stɹ stj skl skɹ skw skj'.split(' '));
const isOnset = (units) => (units.length <= 1 ? units[0] !== 'ŋ' : units.length === 2 ? ONSET2.has(units.join('')) : units.length === 3 && ONSET3.has(units.join('')));

// Words that are not stressed when they come second in a phrase ("deal with").
const WEAK = new Set(['with', 'to', 'of', 'for', 'at', 'in', 'on', 'from', 'a', 'the', 'it', 'as', 'and']);

export function arpaToIpa(phones) {
  const units = phones.map((p) => {
    const m = /^([A-Z]+)([012])?$/.exec(p);
    if (!m) throw new Error(`bad phone "${p}"`);
    const [, base, stress] = m;
    if (base in VOWELS) {
      let ipa = VOWELS[base];
      if (base === 'AH' && stress === '0') ipa = 'ə';
      if (base === 'ER' && stress === '0') ipa = 'ɚ';
      return { vowel: true, ipa, stress: stress ?? '' };
    }
    if (base in CONSONANTS) return { vowel: false, ipa: CONSONANTS[base] };
    throw new Error(`unknown phone "${p}"`);
  });
  const marks = new Map(); // unit index → mark written before it
  let clusterStart = 0;
  let seenVowel = false;
  units.forEach((u, i) => {
    if (!u.vowel) return;
    if (u.stress === '1' || u.stress === '2') {
      const cluster = units.slice(clusterStart, i).map((c) => c.ipa);
      let take = seenVowel ? Math.min(3, cluster.length) : cluster.length;
      while (take > 0 && !isOnset(cluster.slice(cluster.length - take))) take--;
      marks.set(i - take, u.stress === '1' ? 'ˈ' : 'ˌ');
    }
    seenVowel = true;
    clusterStart = i + 1;
  });
  return units.map((u, i) => (marks.get(i) ?? '') + u.ipa).join('');
}

export function parseCmudict(text) {
  const dict = new Map();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith(';;;')) continue;
    const [head, ...phones] = line.trim().split(/\s+/);
    if (!phones.length) continue;
    const word = head.replace(/\(\d+\)$/, '');
    if (!dict.has(word)) dict.set(word, phones);
  }
  return dict;
}

export function ipaFor(phrase, dict) {
  return phrase.toLowerCase().split(/\s+/).map((w, i) => {
    const phones = dict.get(w);
    if (!phones) throw new Error(`not in the pronunciation dictionary: "${w}"`);
    const ipa = arpaToIpa(phones);
    return i > 0 && WEAK.has(w) ? ipa.replace(/[ˈˌ]/gu, '') : ipa;
  }).join(' ');
}

const NUCLEUS = 'eɪ|aɪ|ɔɪ|aʊ|oʊ|[iɪɛæɑɔʊuʌəɚɝ]';

export function ipaSyllableCount(ipa) {
  return [...ipa.matchAll(new RegExp(NUCLEUS, 'gu'))].length;
}

// Index (0-based, counted over the whole phrase) of every syllable that follows a primary-stress mark.
export function ipaStressedSyllables(ipa) {
  const out = [];
  let seen = 0;
  for (const m of ipa.matchAll(new RegExp(`ˈ|${NUCLEUS}`, 'gu'))) {
    if (m[0] === 'ˈ') out.push(seen);
    else seen++;
  }
  return out;
}
```

- [ ] **Step 4: Implement `tools/vocab-ipa.mjs`**

```js
// Fills the "ipa" field of a vocabulary pack from the CMU Pronouncing Dictionary.
// Usage: node tools/vocab-ipa.mjs content/vocab/pack-01.json /path/to/cmudict.dict
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseCmudict, ipaFor } from './ipa.mjs';

export function fillIpa(pack, dict, { force = false } = {}) {
  const missing = [];
  const words = pack.words.map((w) => {
    if (w.ipa && !force) return w;
    try { return { ...w, ipa: ipaFor(w.word, dict) }; } catch { missing.push(w.word); return w; }
  });
  return { pack: { ...pack, words }, missing };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [packPath, dictPath] = process.argv.slice(2);
  if (!packPath || !dictPath) {
    console.error('Usage: node tools/vocab-ipa.mjs <pack.json> <cmudict.dict>');
    process.exit(2);
  }
  const dict = parseCmudict(await readFile(dictPath, 'utf8'));
  const { pack, missing } = fillIpa(JSON.parse(await readFile(packPath, 'utf8')), dict);
  await writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`);
  if (missing.length) {
    console.error(`Not in the dictionary (pick another word): ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`IPA filled for ${pack.words.length} words`);
}
```

- [ ] **Step 5: Run the tests**

Run: `node --test test/ipa.test.mjs && npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: all ipa tests pass; full suite passes.

- [ ] **Step 6: Commit**

```bash
git add tools/ipa.mjs tools/vocab-ipa.mjs test/ipa.test.mjs
git commit -m "feat: IPA for vocabulary words from the CMU Pronouncing Dictionary"
```

---

### Task 2: Vocabulary schema, text helpers and validator

**Files:**
- Create: `js/vocabtext.js`, `tools/vocab-schema.mjs`, `test/vocabtext.test.mjs`, `test/vocab-schema.test.mjs`
- Modify: `tools/validate.mjs`, `test/fixtures.mjs`, `test/content-files.test.mjs`, `sw.js` (add `js/vocabtext.js` to `SHELL`)

**Interfaces:**
- Consumes: `countWords` from `tools/schema.mjs`; `ipaSyllableCount`, `ipaStressedSyllables` from `tools/ipa.mjs` (Task 1).
- Produces: `formMatches(text: string, forms: string[]): boolean` and `clozeOf(text: string, forms: string[]): string | null` (in `js/vocabtext.js`, pure, runs in browser and Node); `validateVocab(pack, { minWords }?): string[]`, `findVocabRepeats(packs): string[]`, `courseOverlap(packs, enWeeks): string[]`, constants `MIN_PACK_WORDS`, `DATED` (in `tools/vocab-schema.mjs`); `validVocabWord(n?)`, `validVocabPack()` fixtures.

- [ ] **Step 1: Write the failing tests for the text helpers**

`test/vocabtext.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formMatches, clozeOf } from '../js/vocabtext.js';

test('a form matches whole words only, ignoring case and punctuation', () => {
  assert.ok(formMatches('Stuff happens.', ['stuff']));
  assert.ok(formMatches("The budget's tight this month.", ['budget']));
  assert.ok(!formMatches('I love stuffing.', ['stuff']));
  assert.ok(!formMatches("It's a rebuff.", ['buff']));
});

test('… lets up to three words sit inside a phrasal verb', () => {
  const forms = ['figure … out'];
  assert.ok(formMatches("Let's figure it out together.", forms));
  assert.ok(formMatches('I figure out problems for a living.', forms));
  assert.ok(!formMatches('We figure one two three four out.', forms));
});

test('the cloze hides the word in the example and keeps the rest', () => {
  assert.equal(clozeOf('I left all my stuff in the car.', ['stuff']), 'I left all my ____ in the car.');
  assert.equal(clozeOf("Let's figure it out together.", ['figure … out']), "Let's ____ together.");
  assert.equal(clozeOf('Nothing matches here.', ['stuff']), null);
});

test('the cloze picks the earliest match, preferring the longer form', () => {
  assert.equal(clozeOf('Deal with it, and deal with that.', ['deal', 'deal with']), '____ it, and deal with that.');
});
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test test/vocabtext.test.mjs`
Expected: FAIL — cannot find `js/vocabtext.js`.

- [ ] **Step 3: Implement `js/vocabtext.js`**

```js
// Text helpers for vocabulary examples. Pure: used by the app and by tools/vocab-schema.mjs.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "figure … out" lets up to three words sit between the two parts ("figure it out").
function formRegex(form) {
  const tokens = form.trim().split(/\s+/);
  const body = tokens
    .map((t, i) => (t === '…' ? '(?:\\S+\\s+){0,3}' : escapeRegExp(t) + (i < tokens.length - 1 ? '\\s+' : '')))
    .join('');
  return new RegExp(`(?<!\\p{L})${body}(?!\\p{L})`, 'iu');
}

export const formMatches = (text, forms) => forms.some((f) => formRegex(f).test(text));

export function clozeOf(text, forms) {
  let best = null;
  for (const f of forms) {
    const m = formRegex(f).exec(text);
    if (m && (!best || m.index < best.index || (m.index === best.index && m[0].length > best[0].length))) best = m;
  }
  return best ? `${text.slice(0, best.index)}____${text.slice(best.index + best[0].length)}` : null;
}
```

- [ ] **Step 4: Run them**

Run: `node --test test/vocabtext.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing tests for the validator**

Append to `test/fixtures.mjs`:

```js
// A vocabulary word that passes validateVocab (tools/vocab-schema.mjs).
export function validVocabWord(n = 1) {
  return {
    id: `v-${String(n).padStart(4, '0')}`,
    word: 'stuff',
    pos: 'noun',
    forms: ['stuff'],
    ipa: 'ˈstʌf',
    stress: ['STUFF'],
    fa: { meaning: 'چیزها؛ وسایل', note: 'اسم غیرقابل‌شمارش و غیررسمی.' },
    examples: [
      { text: 'I left all my stuff in the car.', fa: 'همه‌ی وسایلم را توی ماشین جا گذاشتم.' },
      { text: 'There is so much stuff to do before the trip.', fa: 'قبل از سفر کلی کار برای انجام دادن هست.' },
    ],
    register: 'informal',
  };
}

export function validVocabPack() {
  return { pack: 1, source: 'Test source', words: [validVocabWord(1)] };
}
```

`test/vocab-schema.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVocab, findVocabRepeats, courseOverlap } from '../tools/vocab-schema.mjs';
import { validVocabPack, validVocabWord } from './fixtures.mjs';

const has = (errors, text) => errors.some((e) => e.includes(text));
const one = { minWords: 1 };
const pack = (change) => { const p = validVocabPack(); change(p.words[0], p); return validateVocab(p, one); };

test('a complete pack has no errors', () => assert.deepEqual(validateVocab(validVocabPack(), one), []));

test('a pack needs 100 words unless it is a draft', () => {
  assert.ok(has(validateVocab(validVocabPack()), 'words needs at least 100'));
  const draft = validVocabPack();
  draft.draft = true;
  assert.deepEqual(validateVocab(draft), []);
});

test('a missing source credit is reported', () => assert.ok(has(pack((w, p) => { delete p.source; }), 'source is required')));

test('one example is not enough and four are too many', () => {
  assert.ok(has(pack((w) => { w.examples.pop(); }), 'examples needs 2 or 3'));
  assert.ok(has(pack((w) => { w.examples.push(w.examples[0], w.examples[1]); }), 'examples needs 2 or 3'));
});

test('an example that does not contain the word is reported', () => {
  assert.ok(has(pack((w) => { w.examples[1].text = 'There is so much to do before the trip.'; }), 'examples[1] does not contain the word'));
});

test('an example that is too short or too long is reported', () => {
  assert.ok(has(pack((w) => { w.examples[0].text = 'My stuff.'; }), 'examples[0] has 2 words'));
  assert.ok(has(pack((w) => { w.examples[0].text = 'I left all my stuff in the car because the trunk was full and the weather was getting really quite bad.'; }), 'examples[0] has 21 words'));
});

test('old-fashioned phrasing in an example is reported', () => {
  assert.ok(has(pack((w) => { w.examples[0].text = 'Whilst I carry my stuff, you can lock the car.'; }), 'old-fashioned'));
  assert.ok(has(pack((w) => { w.examples[0].text = 'I shall take all my stuff to the car now.'; }), 'old-fashioned'));
  assert.deepEqual(pack((w) => { w.examples[0].text = 'Shall we take all my stuff to the car now?'; }), []);
});

test('Farsi is required for the meaning, the note and every translation', () => {
  assert.ok(has(pack((w) => { w.fa.meaning = 'things'; }), 'fa.meaning must be Farsi'));
  assert.ok(has(pack((w) => { w.fa.note = 'a note'; }), 'fa.note must be Farsi'));
  assert.ok(has(pack((w) => { w.examples[1].fa = 'translation'; }), 'examples[1].fa must be Farsi'));
});

test('IPA is required and the id must look like v-0001', () => {
  assert.ok(has(pack((w) => { delete w.ipa; }), 'ipa is required'));
  assert.ok(has(pack((w) => { w.id = 'w-1'; }), 'id must look like v-0001'));
});

test('the stress guide must have the IPA’s syllables and stressed syllable', () => {
  const set = (ipa, stress) => pack((w) => { w.ipa = ipa; w.stress = stress; });
  assert.deepEqual(set('ɹɪˈlaɪəbəl', ['ri-LY-uh-bul']), []);
  assert.ok(has(set('ɹɪˈlaɪəbəl', ['ri-LY-bul']), 'stress has 3 syllables but ipa has 4'));
  assert.ok(has(set('ɹɪˈlaɪəbəl', ['RI-ly-uh-bul']), 'capitals (1) must match'));
  assert.deepEqual(set('ˈdil wɪð', ['DEAL with']), []);
  assert.deepEqual(set('ˈfɪɡjɚ ˈaʊt', ['FIG-yer OUT']), []);
});

test('a register that is not informal, neutral or formal is reported', () => {
  assert.ok(has(pack((w) => { w.register = 'slangy'; }), 'register must be one of'));
});

test('a repeated id or a repeated word is reported across packs', () => {
  const a = validVocabPack();
  const b = validVocabPack();
  b.pack = 2;
  assert.ok(findVocabRepeats([a, b]).some((e) => e.includes('v-0001 is used twice')));
  b.words[0].id = 'v-0002';
  assert.deepEqual(findVocabRepeats([a, b]), ['v-0002 repeats v-0001: "stuff"']);
  b.words[0].word = 'Budget';
  assert.deepEqual(findVocabRepeats([a, b]), []);
});

test('a word already taught in an English week is reported', () => {
  const week = { lang: 'en', week: 2, chunks: [{ id: 'en-02-008', text: "Sorry, I didn't quite catch that." }] };
  const catchWord = { ...validVocabWord(5), word: 'catch', forms: ['catch', 'catches', 'caught', 'catching'] };
  assert.deepEqual(courseOverlap([{ pack: 1, words: [catchWord] }], [week]), ['v-0005 "catch" is already taught in en-02-008']);
  assert.deepEqual(courseOverlap([validVocabPack()], [week]), []);
});
```

- [ ] **Step 6: Run to see them fail**

Run: `node --test test/vocab-schema.test.mjs`
Expected: FAIL — cannot find `tools/vocab-schema.mjs`.

- [ ] **Step 7: Implement `tools/vocab-schema.mjs`**

```js
import { countWords } from './schema.mjs';
import { ipaSyllableCount, ipaStressedSyllables } from './ipa.mjs';
import { formMatches } from '../js/vocabtext.js';

export const MIN_PACK_WORDS = 100;
export const EXAMPLE_WORDS = { min: 5, max: 16 };
// Old-fashioned or stiff English that learners should not copy (spec §5). "Shall we …?" is still current.
export const DATED = [
  /\bwhom\b/i, /\bwhilst\b/i, /\b(?:i|you|he|she|it|we|they) shall\b/i, /\bought to\b/i, /\bupon\b/i,
  /\bthus\b/i, /\bperchance\b/i, /\bi dare say\b/i, /\bone must\b/i, /\bthou\b/i, /\bhenceforth\b/i,
];
const REGISTERS = ['informal', 'neutral', 'formal'];
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isFarsi = (v) => isText(v) && /[؀-ۿ]/.test(v);

function respelling(stress) {
  const tokens = stress.join(' ').split(/[\s-]+/).filter(Boolean);
  const capitals = tokens.flatMap((t, i) => (/\p{Lu}/u.test(t) && t === t.toUpperCase() ? [i] : []));
  return { count: tokens.length, capitals };
}

export function validateVocab(pack, { minWords } = {}) {
  const errors = [];
  const err = (m) => errors.push(m);
  if (!pack || typeof pack !== 'object') return ['file is not a JSON object'];
  if (!Number.isInteger(pack.pack) || pack.pack < 1) err('pack must be a number from 1');
  if (!isText(pack.source)) err('source is required (credit for the word list and the IPA)');
  if (!Array.isArray(pack.words)) return [...errors, 'words must be a list'];
  const min = minWords ?? (pack.draft === true ? 1 : MIN_PACK_WORDS);
  if (pack.words.length < min) err(`words needs at least ${min}`);

  const ids = new Set();
  pack.words.forEach((w, i) => {
    const where = `words[${i}] "${w?.word ?? ''}"`;
    if (!/^v-\d{4}$/.test(w?.id ?? '')) err(`${where}.id must look like v-0001`);
    else if (ids.has(w.id)) err(`${where}.id "${w.id}" is used twice`);
    else ids.add(w.id);
    if (!isText(w.word)) err(`${where}.word is required`);
    if (!isText(w.pos)) err(`${where}.pos is required`);
    if (!Array.isArray(w.forms) || !w.forms.length || !w.forms.every(isText)) err(`${where}.forms needs at least one spelling`);
    if ('register' in w && !REGISTERS.includes(w.register)) err(`${where}.register must be one of ${REGISTERS.join(', ')}`);
    if (!isFarsi(w.fa?.meaning)) err(`${where}.fa.meaning must be Farsi text`);
    if (!isFarsi(w.fa?.note)) err(`${where}.fa.note must be Farsi text`);

    if (!isText(w.ipa)) err(`${where}.ipa is required (run tools/vocab-ipa.mjs)`);
    if (!Array.isArray(w.stress) || !w.stress.length || !w.stress.every(isText)) err(`${where}.stress is required`);
    else if (isText(w.ipa)) {
      const r = respelling(w.stress);
      const n = ipaSyllableCount(w.ipa);
      if (r.count !== n) err(`${where}.stress has ${r.count} syllables but ipa has ${n}`);
      else {
        const marked = ipaStressedSyllables(w.ipa);
        if (r.capitals.join() !== marked.join()) {
          err(`${where}.stress capitals (${r.capitals.map((x) => x + 1).join(',')}) must match the stressed syllables of the ipa (${marked.map((x) => x + 1).join(',')})`);
        }
      }
    }

    if (!Array.isArray(w.examples) || w.examples.length < 2 || w.examples.length > 3) err(`${where}.examples needs 2 or 3 examples`);
    (w.examples ?? []).forEach((ex, k) => {
      if (!isText(ex.text)) return err(`${where}.examples[${k}].text is required`);
      const n = countWords(ex.text);
      if (n < EXAMPLE_WORDS.min || n > EXAMPLE_WORDS.max) err(`${where}.examples[${k}] has ${n} words; use ${EXAMPLE_WORDS.min}–${EXAMPLE_WORDS.max}`);
      if (Array.isArray(w.forms) && !formMatches(ex.text, w.forms)) err(`${where}.examples[${k}] does not contain the word (check forms)`);
      for (const re of DATED) {
        const m = re.exec(ex.text);
        if (m) err(`${where}.examples[${k}] uses old-fashioned English: "${m[0]}"`);
      }
      if (!isFarsi(ex.fa)) err(`${where}.examples[${k}].fa must be Farsi text`);
    });
  });
  return errors;
}

// The same id or the same word twice would become two cards for one thing.
export function findVocabRepeats(packs) {
  const ids = new Map();
  const words = new Map();
  const errors = [];
  for (const p of packs) {
    for (const w of p.words ?? []) {
      if (ids.has(w.id)) errors.push(`${w.id} is used twice`);
      ids.set(w.id, true);
      const key = String(w.word).toLowerCase().trim();
      if (words.has(key)) errors.push(`${w.id} repeats ${words.get(key)}: "${w.word}"`);
      else words.set(key, w.id);
    }
  }
  return errors;
}

// Words the English course weeks already teach as phrases are left out of the packs (spec §3).
export function courseOverlap(packs, enWeeks) {
  const errors = [];
  for (const p of packs) {
    for (const w of p.words ?? []) {
      for (const week of enWeeks) {
        for (const c of week.chunks ?? []) {
          if (formMatches(c.text, w.forms ?? [])) errors.push(`${w.id} "${w.word}" is already taught in ${c.id}`);
        }
      }
    }
  }
  return errors;
}
```

- [ ] **Step 8: Run the validator tests**

Run: `node --test test/vocab-schema.test.mjs`
Expected: PASS (13 tests). If a message differs from a test's expectation, change the code's message to match the test text exactly (the test strings are the contract).

- [ ] **Step 9: Wire the validator into `tools/validate.mjs` and the content tests**

In `tools/validate.mjs` change the imports and add the vocabulary block just before the final `process.exit`:

```js
import { validateVocab, findVocabRepeats, courseOverlap } from './vocab-schema.mjs';
```
```js
const vocabDir = new URL('vocab/', root);
const packs = [];
for (const file of (await readdir(vocabDir).catch(() => [])).filter((f) => /^pack-\d\d\.json$/.test(f)).sort()) {
  const name = `vocab/${file}`;
  let data;
  try { data = JSON.parse(await readFile(new URL(file, vocabDir), 'utf8')); }
  catch (e) { report(name, [`invalid JSON: ${e.message}`]); continue; }
  packs.push(data);
  const errors = validateVocab(data);
  if (data.pack !== Number(file.slice(5, 7))) errors.push(`pack must be ${Number(file.slice(5, 7))}`);
  report(name, errors);
}
report('vocabulary (repeated words)', findVocabRepeats(packs));
report('vocabulary (words already in the English course)', courseOverlap(packs, all.filter((w) => w.lang === 'en')));
```

Append to `test/content-files.test.mjs` (add `import { validateVocab, findVocabRepeats, courseOverlap } from '../tools/vocab-schema.mjs';` at the top):

```js
const vocabPacks = async () => {
  const dir = new URL('../content/vocab/', import.meta.url);
  const files = (await readdir(dir).catch(() => [])).filter((f) => /^pack-\d\d\.json$/.test(f)).sort();
  return Promise.all(files.map((f) => read(`vocab/${f}`).then((p) => ({ f, p }))));
};

test('every vocabulary pack is valid', async () => {
  for (const { f, p } of await vocabPacks()) assert.deepEqual(validateVocab(p), [], f);
});

test('no vocabulary word or id is used twice, and none is already taught in the English course', async () => {
  const packs = (await vocabPacks()).map(({ p }) => p);
  assert.deepEqual(findVocabRepeats(packs), []);
  const en = [];
  for (const f of await weekFiles('en')) en.push(await read(`en/${f}`));
  assert.deepEqual(courseOverlap(packs, en), []);
});
```

- [ ] **Step 10: Add the module to the offline list and run everything**

In `sw.js`, add `'js/vocabtext.js',` to `SHELL` after `'js/store.js',`.

Run: `npm test && npm run validate`
Expected: all tests pass; validate prints `✓ vocabulary (repeated words)` and `✓ vocabulary (words already in the English course)` (no pack files yet).

- [ ] **Step 11: Commit**

```bash
git add js/vocabtext.js tools/vocab-schema.mjs tools/validate.mjs sw.js test/vocabtext.test.mjs test/vocab-schema.test.mjs test/fixtures.mjs test/content-files.test.mjs
git commit -m "feat: vocabulary schema, example/stress/old-English checks and course-overlap check"
```

---

### Task 3: Pack 1 — 120 words

**Files:**
- Create: `content/vocab/pack-01.json`, `content/vocab/README.md`
- Modify: `THIRD_PARTY_NOTICES.md`, `sw.js` (add `'content/vocab/pack-01.json'` to `SHELL`), `test/sw.test.mjs`

**Interfaces:**
- Consumes: `tools/vocab-ipa.mjs` CLI (Task 1); `validate.mjs` vocabulary rules (Task 2).
- Produces: `content/vocab/pack-01.json` (ids `v-0001…v-0120`, all complete, no `draft`) that Tasks 4–6 load.

#### The word table (authoritative: ids, order, part of speech and the sense to teach)

Words are in NGSL-Spoken rank order (the rank is shown). Teach the sense given; a third example is allowed when a word has two clearly different everyday senses.

| id | word | pos | NGSL-S rank | sense to teach |
|---|---|---|---|---|
| v-0001 | stuff | noun | 160 | things (informal, uncountable) |
| v-0002 | anyway | adverb | 190 | changing the subject; despite that |
| v-0003 | issue | noun | 202 | a problem or topic |
| v-0004 | guess | verb | 217 | say without being sure; 'I guess' |
| v-0005 | whatever | adverb | 218 | any thing; 'Whatever.' = I don't mind/care |
| v-0006 | pretty | adverb | 235 | quite; 'pretty good' |
| v-0007 | couple | noun | 266 | 'a couple of' = a few |
| v-0008 | obviously | adverb | 280 | clearly; as anyone can see |
| v-0009 | yet | adverb | 282 | 'not yet'; 'have you … yet?' |
| v-0010 | either | adverb | 284 | 'either… or'; negative 'me neither' alternative |
| v-0011 | deal with | phrasal verb | 290 | handle a problem, task or person |
| v-0012 | alright | adjective | 294 | okay; 'Alright?' as greeting/check |
| v-0013 | rather | adverb | 305 | 'would rather'; quite |
| v-0014 | certainly | adverb | 306 | for sure; 'Certainly' = of course |
| v-0015 | matter | verb | 317 | 'it doesn't matter'; 'what's the matter?' |
| v-0016 | level | noun | 321 | height or stage |
| v-0017 | cost | noun | 330 | price; 'the cost of living' |
| v-0018 | concern | noun | 335 | worry; 'a concern' |
| v-0019 | lose | verb | 344 | lose your keys, a game, track of time; lose weight |
| v-0020 | process | noun | 358 | series of steps |
| v-0021 | hold | verb | 359 | hold on; hold a meeting |
| v-0022 | expect | verb | 385 | think something will happen |
| v-0023 | particular | adjective | 386 | special; 'in particular' |
| v-0024 | situation | noun | 389 | the facts of a moment |
| v-0025 | involve | verb | 390 | include as a necessary part |
| v-0026 | check | verb | 391 | make sure; check in; check out |
| v-0027 | certain | adjective | 397 | sure; a certain (some) kind |
| v-0028 | local | adjective | 398 | near you; of this area |
| v-0029 | ring | verb | 399 | phone someone (British: 'ring me') |
| v-0030 | figure out | phrasal verb | 400 | solve a problem or understand something after thinking |
| v-0031 | worry | verb | 407 | feel anxious; 'don't worry' |
| v-0032 | absolutely | adverb | 415 | completely; 'Absolutely!' = yes |
| v-0033 | policy | noun | 417 | official rule or plan |
| v-0034 | provide | verb | 422 | give what is needed |
| v-0035 | comment | noun | 423 | a short remark; comment online |
| v-0036 | cover | verb | 424 | include; pay for; protect |
| v-0037 | difference | noun | 428 | 'make a difference' |
| v-0038 | allow | verb | 440 | let; 'be allowed to' |
| v-0039 | experience | noun | 444 | things you have done; work experience |
| v-0040 | decision | noun | 447 | 'make a decision' |
| v-0041 | stick | verb | 459 | stick to a plan; get stuck |
| v-0042 | pass | verb | 466 | pass an exam; pass something to someone |
| v-0043 | carry | verb | 474 | hold and move; carry on |
| v-0044 | response | noun | 475 | an answer or reaction |
| v-0045 | include | verb | 477 | have as a part |
| v-0046 | suggest | verb | 481 | propose an idea |
| v-0047 | although | conjunction | 489 | even though |
| v-0048 | amount | noun | 492 | how much |
| v-0049 | save | verb | 495 | save money, time or a file |
| v-0050 | miss | verb | 506 | fail to catch; feel the absence of |
| v-0051 | raise | verb | 511 | lift; raise a question; raise money |
| v-0052 | discuss | verb | 512 | talk about (no 'about' after it: trap for Farsi speakers) |
| v-0053 | pull | verb | 514 | draw towards you; pull an all-nighter |
| v-0054 | consider | verb | 517 | think about carefully |
| v-0055 | increase | verb | 519 | go up or make bigger |
| v-0056 | budget | noun | 522 | plan for spending money |
| v-0057 | depend | verb | 524 | 'it depends (on)' |
| v-0058 | notice | verb | 530 | see or become aware of |
| v-0059 | chance | noun | 532 | possibility; 'give it a chance' |
| v-0060 | standard | noun | 533 | level of quality; also adjective 'standard' |
| v-0061 | especially | adverb | 534 | more than others |
| v-0062 | realize | verb | 541 | suddenly understand |
| v-0063 | lead | verb | 545 | guide; 'lead to' = cause |
| v-0064 | fit | verb | 547 | be the right size; fit into a schedule |
| v-0065 | staff | noun | 548 | the people who work somewhere (uncountable) |
| v-0066 | control | noun | 549 | power over something; 'under control' |
| v-0067 | definitely | adverb | 550 | without doubt |
| v-0068 | free | adjective | 554 | not costing money; not busy |
| v-0069 | develop | verb | 556 | grow or build gradually |
| v-0070 | opportunity | noun | 558 | a good chance |
| v-0071 | bear | verb | 562 | 'can't bear'; 'bear with me' |
| v-0072 | offer | verb | 564 | say you will give or do something |
| v-0073 | throw | verb | 568 | throw away; throw a party |
| v-0074 | major | adjective | 569 | very important or big |
| v-0075 | charge | verb | 570 | ask a price; charge a phone |
| v-0076 | individual | adjective | 572 | single; one person's own |
| v-0077 | load | noun | 577 | 'a load of work'; a washing load |
| v-0078 | effect | noun | 578 | a result of a change; 'side effect' |
| v-0079 | wish | verb | 579 | 'I wish I had…' (unreal wish) |
| v-0080 | worth | adjective | 582 | 'worth it'; 'worth + -ing' |
| v-0081 | brief | adjective | 583 | short in time |
| v-0082 | unless | conjunction | 585 | 'if not' |
| v-0083 | trouble | noun | 592 | problems; 'be in trouble' |
| v-0084 | quality | noun | 595 | how good something is |
| v-0085 | share | verb | 598 | give part to others; post online |
| v-0086 | hit | verb | 600 | hit a deadline; hit 'send' |
| v-0087 | fair | adjective | 601 | just; 'that's not fair' |
| v-0088 | cool | adjective | 611 | good, 'okay'; slightly cold |
| v-0089 | drop | verb | 612 | let fall; drop by; drop a class |
| v-0090 | bother | verb | 615 | annoy; take the trouble; 'don't bother' |
| v-0091 | detail | noun | 617 | a small piece of information |
| v-0092 | benefit | noun | 621 | a helpful result |
| v-0093 | hang | verb | 625 | hang out; hang up; hang on |
| v-0094 | instead | adverb | 631 | in place of something |
| v-0095 | tend | verb | 634 | 'tend to' = usually do |
| v-0096 | fairly | adverb | 641 | quite, to a fair degree |
| v-0097 | push | verb | 647 | press forward; push back a deadline |
| v-0098 | accept | verb | 648 | agree to take or believe |
| v-0099 | specific | adjective | 655 | exact; not general |
| v-0100 | degree | noun | 659 | university degree; also temperature |
| v-0101 | produce | verb | 664 | make or create |
| v-0102 | ahead | adverb | 666 | in front; 'go ahead'; 'ahead of time' |
| v-0103 | fill | verb | 667 | fill in a form; fill up |
| v-0104 | aware | adjective | 690 | knowing about something |
| v-0105 | single | adjective | 692 | only one; not married |
| v-0106 | effort | noun | 694 | energy spent on something |
| v-0107 | review | verb | 695 | look at again; a review online |
| v-0108 | totally | adverb | 698 | completely (informal) |
| v-0109 | therefore | adverb | 699 | so (more formal) |
| v-0110 | awful | adjective | 703 | very bad (informal intensifier) |
| v-0111 | completely | adverb | 705 | in every way |
| v-0112 | affect | verb | 706 | change or influence (not the noun effect) |
| v-0113 | cheap | adjective | 707 | low price; also low quality |
| v-0114 | receive | verb | 708 | get an email, package or message |
| v-0115 | require | verb | 709 | need; rules that say you must have something |
| v-0116 | apply | verb | 714 | ask formally for a job, course or visa; also be relevant |
| v-0117 | various | adjective | 716 | several different |
| v-0118 | bet | verb | 717 | 'I bet…' (I'm sure) |
| v-0119 | normally | adverb | 718 | usually |
| v-0120 | purpose | noun | 719 | reason for doing something |

#### Authoring rules

1. Each word: 2 examples (3 only for two real senses). Each example is **5–16 words**, spoken and current, in a different situation from the other example of the same word.
2. `forms` lists every spelling that appears in an example (`"figure … out"` allows up to three words between the parts: *figure it out*). Examples must contain a form (validator).
3. `stress` is a respelling with syllables joined by `-`, words separated by a space, the stressed syllable in CAPITALS (`ri-LY-uh-bul`, `DEAL with`, `FIG-yer OUT`). The validator checks syllable count and stress against the generated IPA.
4. `fa.meaning`: the Farsi meaning in a few words; separate senses with «؛». `fa.note`: 1–3 sentences in Persian — when to use it (casual / neutral / formal), common partners, and traps for Farsi speakers (for example *discuss* takes no «about»; *stuff* is uncountable; *he/she*; articles). `examples[].fa`: a natural Persian translation, not word-for-word.
5. `register`: `informal` for casual words and senses (stuff, awful, cool, totally, pretty, alright, bet, whatever, anyway, load, bother, bear in "can't bear"), otherwise `neutral`; `formal` only for clearly formal words (therefore).
6. Made-up names only; no employer names, brands as the point of a sentence, or personal details. Nothing copied from a book, dictionary or the English course chunks.
7. The sentence should sound like what a person says today (texting, calls, uni, work chat, shopping, delivery, travel, health, home). No old-fashioned forms (the validator rejects the list in Global Constraints).

#### Worked examples (match this quality)

```js
{ word: 'stuff', forms: ['stuff'], stress: ['STUFF'], register: 'informal',
  meaning: 'چیزها؛ وسایل',
  note: 'اسم غیرقابل‌شمارش و غیررسمی: s نمی‌گیرد و «a stuff» نمی‌گوییم. برای چیزهایی که اسمشان را نمی‌دانیم یا مهم نیست: my stuff = «وسایل من»، this stuff = «این چیزها».',
  examples: [
    ['I left all my stuff in the car.', 'همه‌ی وسایلم را توی ماشین جا گذاشتم.'],
    ['There is so much stuff to do before the trip.', 'قبل از سفر کلی کار برای انجام دادن هست.'],
  ] },
{ word: 'figure out', forms: ['figure … out', 'figures … out', 'figured … out', 'figuring … out'], stress: ['FIG-yer OUT'], register: 'neutral',
  meaning: 'فهمیدن؛ راه‌حل پیدا کردن',
  note: 'یعنی بعد از فکر کردن به جواب یا راه‌حل رسیدن. جداشدنی است: figure it out (ضمیر وسط می‌آید) و figure out the problem هر دو درست‌اند. در گفتار روزمره بسیار رایج است.',
  examples: [
    ["I can't figure out why my phone keeps shutting down.", 'نمی‌توانم بفهمم چرا گوشی‌ام مدام خاموش می‌شود.'],
    ["Let's figure it out together before the meeting.", 'قبل از جلسه با هم راهش را پیدا کنیم.'],
  ] },
```

- [ ] **Step 1: Create the author helper (scratchpad, not committed)**

`$SP/vocab-emit.mjs` where `SP=/private/tmp/claude-501/-Users-user-Document-EN-Learning/ab24d292-c83a-4fb7-89ee-38c1f12e5a6e/scratchpad`:

```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const PLAN = '/Users/user/Document/EN Learning/Language-Learning/.claude/worktrees/vocab/docs/superpowers/plans/2026-10-16-english-vocabulary.md';
const SOURCE = 'Word choice: NGSL-Spoken 1.2 (Browne & Culligan, CC BY-SA 4.0, newgeneralservicelist.com). IPA: CMU Pronouncing Dictionary (American English).';

function wordTable() {
  return readFileSync(PLAN, 'utf8').split('\n').filter((l) => /^\| v-\d{4} \|/.test(l))
    .map((l) => l.split('|').map((s) => s.trim())).map((r) => ({ id: r[1], word: r[2], pos: r[3] }));
}

// entries are for table rows first, first+1, …; each: { word, forms, stress, meaning, note, examples: [[en, fa], …], register? }
export function addWords(packPath, first, entries) {
  const table = wordTable();
  const pack = existsSync(packPath) ? JSON.parse(readFileSync(packPath, 'utf8')) : { pack: 1, draft: true, source: SOURCE, words: [] };
  entries.forEach((e, i) => {
    const row = table[first - 1 + i];
    if (!row || row.word !== e.word) throw new Error(`entry ${i} is "${e.word}" but the table says "${row?.word}" (${row?.id})`);
    const word = { id: row.id, word: e.word, pos: row.pos, forms: e.forms, stress: e.stress, fa: { meaning: e.meaning, note: e.note }, examples: e.examples.map(([text, fa]) => ({ text, fa })) };
    if (e.register) word.register = e.register;
    const at = pack.words.findIndex((w) => w.id === row.id);
    if (at >= 0) pack.words[at] = { ...pack.words[at], ...word };
    else pack.words.push(word);
  });
  pack.words.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(packPath, `${JSON.stringify(pack, null, 2).replace(/(?<=\p{L})’(?=\p{L})/gu, "'")}\n`);
}
```

(If the worktree is somewhere else, change `PLAN`.)

- [ ] **Step 2: Licence and notices (first commit of this task)**

Create `content/vocab/README.md`:

```markdown
# English vocabulary packs

`pack-NN.json` are the word packs of the Words tab.

- **Word choice:** the New General Service List – Spoken (NGSL-S 1.2), Browne, C., Culligan, B. (2013), https://www.newgeneralservicelist.com, licensed under Creative Commons Attribution-ShareAlike 4.0 International.
- **Pronunciation (IPA):** generated from the CMU Pronouncing Dictionary (Copyright (C) 1993-2014 Carnegie Mellon University; unrestricted use, credit requested).
- **Sentences, Farsi explanations and notes:** written for this project.

Because the word list is share-alike, the files in this folder are published under **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/). The app's code stays under the repository's MIT licence.

Authoring: `node tools/vocab-ipa.mjs content/vocab/pack-01.json <path to cmudict.dict>` fills the `ipa` field. `node tools/validate.mjs` checks every pack.
```

Append to `THIRD_PARTY_NOTICES.md`:

```markdown

## NGSL-Spoken 1.2 (word choice for content/vocab/)

Browne, C., Culligan, B. (2013). The New General Service List – Spoken. https://www.newgeneralservicelist.com. Creative Commons Attribution-ShareAlike 4.0 International (https://creativecommons.org/licenses/by-sa/4.0/). Only the choice of words is taken from the list; `content/vocab/` is therefore also published under CC BY-SA 4.0.

## CMU Pronouncing Dictionary (IPA in content/vocab/)

Copyright (C) 1993-2014 by Carnegie Mellon University. "Use of this dictionary for any research or commercial purpose is completely unrestricted." The dictionary is not stored in this repository: `tools/vocab-ipa.mjs` reads a local copy while authoring. Source: https://github.com/cmusphinx/cmudict
```

Commit:

```bash
git add content/vocab/README.md THIRD_PARTY_NOTICES.md
git commit -m "docs: credits and licence for the vocabulary packs"
```

- [ ] **Step 3: Batch 1 — words v-0001 to v-0030**

Write `$SP/vocab-batch1.mjs`:

```js
import { addWords } from './vocab-emit.mjs';
addWords('content/vocab/pack-01.json', 1, [
  // one object per table row v-0001 … v-0030, in table order (the helper checks each word against the table)
]);
```
Fill the array with 30 entries following the worked examples and the authoring rules. Run from the worktree:

```bash
node $SP/vocab-batch1.mjs && node tools/vocab-ipa.mjs content/vocab/pack-01.json $SP/cmu/cmudict.dict && npm run validate 2>&1 | sed -n 1,40p
```
Expected: `IPA filled for 30 words` and `✓ vocab/pack-01.json` (it is a draft, so the 100-word minimum is skipped). If the validator reports an error, fix the entry in the batch script (never the rule) and rerun; the helper replaces existing words by id. Typical fixes: a `forms` entry missing, a respelling with the wrong number of syllables, a capital on the wrong syllable, a sentence outside 5–16 words.

Read every sentence and every Persian line aloud once (authoring rule 7), then:

```bash
git add content/vocab/pack-01.json
git commit -m "feat: vocabulary pack 1, words 1–30 (draft)"
```

- [ ] **Step 4: Batches 2–4**

Repeat Step 3 with `vocab-batch2.mjs` (first = 31, rows v-0031…v-0060), `vocab-batch3.mjs` (first = 61, v-0061…v-0090) and `vocab-batch4.mjs` (first = 91, v-0091…v-0120), committing after each (`"feat: vocabulary pack 1, words 31–60 (draft)"`, and so on).

- [ ] **Step 5: Finish the pack**

Edit `content/vocab/pack-01.json`: remove the line `"draft": true,`. Add `'content/vocab/pack-01.json'` to `SHELL` in `sw.js` after `'content/en/week-04.json'`. In `test/sw.test.mjs`, change the lesson-file test so it also requires vocabulary packs: after the `for (const lang …)` loop inside `'every lesson file is in the offline list …'` add

```js
  for (const f of await readdir(new URL('content/vocab/', root))) if (/^pack-\d\d\.json$/.test(f)) files.push(`content/vocab/${f}`);
```

Run: `npm test && npm run validate && npm run smoke`
Expected: pack 1 is valid with 120 words (`✓ vocab/pack-01.json`), no repeats, no course overlap; tests and smoke pass.

- [ ] **Step 6: Commit**

```bash
git add content/vocab/pack-01.json sw.js test/sw.test.mjs
git commit -m "feat: vocabulary pack 1 complete (120 words) and available offline"
```

---

### Task 4: State, vocabulary logic, loader and card view

**Files:**
- Modify: `js/store.js`, `js/content.js`, `js/cards.js`, `test/store.test.mjs`, `sw.js`
- Create: `js/vocab.js`, `test/vocab.test.mjs`, `test/vocab-load.test.mjs`

**Interfaces:**
- Consumes: `introduce(state, ids, now)` and `grade` from `js/cards.js`; `newCard` from `js/srs.js`; `localDate` from `js/session.js`; `formMatches`/`clozeOf` (Task 2, used later by Task 6).
- Produces (`js/vocab.js`): `VOCAB_REVIEW_CAP = 10`, `isVocabId(id)`, `wordsOf(packs)`, `indexVocab(packs)`, `statusOf(state, id) → 'new'|'known'|'learning'`, `ensureBatch(state, words, now?) → state`, `batchLeft(state) → string[]`, `markKnown(state, id) → state`, `teach(state, id, now?) → state`, `searchVocab(words, query) → words[]`, `vocabCounts(state) → {learning, known}`, `reviewKey(position) → 'W-S'`, `reviewsLeft(state, key) → number`, `capQueue(queue, state, key) → string[]`, `countReview(state, key) → state`.
- Produces (`js/content.js`): `vocabUrl(n)`, `loadVocab(fetchFn?) → Promise<{ packs, error }>` (never throws; skips packs with `draft: true`).
- Produces (`js/cards.js`): `cardView(id, { …, vocabIndex })` returns `{ kind: 'vocab', lang: 'en', text, meaning, article: null, fa, stress, note: '', vocab }` for `v-` ids.
- Produces (`js/store.js`): `defaultState()` and `migrate()` carry `vocab` and `settings.vocabPerDay`.

- [ ] **Step 1: Write the failing store tests**

Append to `test/store.test.mjs`:

```js
test('a fresh state has an empty vocabulary section and 5 new words a day', () => {
  const s = defaultState();
  assert.deepEqual(s.vocab, { known: [], day: { date: '', ids: [] }, reviews: { key: '', count: 0 } });
  assert.equal(s.settings.vocabPerDay, 5);
});

test('an old save or backup without vocabulary data still loads, with the defaults', () => {
  const s = migrate({ version: 1, position: { week: 2, session: 3 }, settings: { farsi: false } });
  assert.deepEqual(s.vocab, defaultState().vocab);
  assert.equal(s.settings.vocabPerDay, 5);
});

test('good vocabulary data is kept and broken parts are reset', () => {
  const good = { known: ['v-0001'], day: { date: '2026-10-16', ids: ['v-0002'] }, reviews: { key: '1-2', count: 3 } };
  assert.deepEqual(migrate({ version: 1, vocab: good, settings: { vocabPerDay: 10 } }).vocab, good);
  assert.equal(migrate({ version: 1, settings: { vocabPerDay: 10 } }).settings.vocabPerDay, 10);
  assert.equal(migrate({ version: 1, settings: { vocabPerDay: 7 } }).settings.vocabPerDay, 5);
  const broken = migrate({ version: 1, vocab: { known: 'x', day: { date: 5 }, reviews: { key: 'a', count: -1 } } });
  assert.deepEqual(broken.vocab, defaultState().vocab);
  assert.deepEqual(migrate({ version: 1, vocab: 'nope' }).vocab, defaultState().vocab);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test test/store.test.mjs`
Expected: FAIL — `s.vocab` is undefined.

- [ ] **Step 3: Implement the state changes in `js/store.js`**

In `defaultState()` set `settings: { farsi: true, voiceNl: '', voiceEn: '', extraWords: 0, vocabPerDay: 5 },` and add `vocab: { known: [], day: { date: '', ids: [] }, reviews: { key: '', count: 0 } },` after `myPhrases: [],`.

In `migrate`, after `const s = …;` add:

```js
  const v = isObject(raw.vocab) ? raw.vocab : {};
```
and in the returned object add to `settings` the line
```js
      vocabPerDay: [3, 5, 10].includes(s.vocabPerDay) ? s.vocabPerDay : base.settings.vocabPerDay,
```
and after `myPhrases: …,`:
```js
    vocab: {
      known: Array.isArray(v.known) && v.known.every(isText) ? v.known : base.vocab.known,
      day: isObject(v.day) && isText(v.day.date) && Array.isArray(v.day.ids) && v.day.ids.every(isText) ? v.day : base.vocab.day,
      reviews: isObject(v.reviews) && isText(v.reviews.key) && Number.isInteger(v.reviews.count) && v.reviews.count >= 0 ? v.reviews : base.vocab.reviews,
    },
```

Run: `node --test test/store.test.mjs && npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: store tests pass; full suite passes.

- [ ] **Step 4: Write the failing tests for `js/vocab.js`**

`test/vocab.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../js/store.js';
import { newCard } from '../js/srs.js';
import { cardView } from '../js/cards.js';
import {
  VOCAB_REVIEW_CAP, isVocabId, wordsOf, indexVocab, statusOf, ensureBatch, batchLeft, markKnown, teach,
  searchVocab, vocabCounts, reviewKey, reviewsLeft, capQueue, countReview,
} from '../js/vocab.js';

const id = (n) => `v-${String(n).padStart(4, '0')}`;
const word = (n) => ({
  id: id(n), word: `word${n}`, pos: 'noun', forms: [`word${n}`], ipa: 'ˈwɝd', stress: ['WORD'],
  fa: { meaning: `معنی ${n}`, note: 'نکته' },
  examples: [{ text: `This is word${n} here today.`, fa: 'الف' }, { text: `Use word${n} in a sentence now.`, fa: 'ب' }],
});
const packs = [{ pack: 1, words: Array.from({ length: 12 }, (_, i) => word(i + 1)) }];
const words = wordsOf(packs);
const day1 = new Date('2026-10-16T09:00:00');
const day2 = new Date('2026-10-17T09:00:00');
const ids = (...ns) => ns.map(id);

test('isVocabId recognises vocabulary card ids only', () => {
  assert.ok(isVocabId('v-0001'));
  assert.ok(!isVocabId('w-0001'));
  assert.ok(!isVocabId('nl-01-001'));
});

test('the day’s batch is the next 5 undecided words in pack order, stored with the date', () => {
  const s = ensureBatch(defaultState(), words, day1);
  assert.deepEqual(s.vocab.day, { date: '2026-10-16', ids: ids(1, 2, 3, 4, 5) });
  assert.deepEqual(batchLeft(s), ids(1, 2, 3, 4, 5));
});

test('reopening on the same day gives exactly the same batch, even if the setting changed', () => {
  const s = ensureBatch(defaultState(), words, day1);
  assert.equal(ensureBatch(s, words, day1), s);
  const bigger = { ...s, settings: { ...s.settings, vocabPerDay: 10 } };
  assert.equal(ensureBatch(bigger, words, day1), bigger);
});

test('the next day gives the next undecided words; words skipped yesterday come back', () => {
  let s = ensureBatch(defaultState(), words, day1);
  s = markKnown(s, id(1));
  s = teach(s, id(2), day1);
  s = ensureBatch(s, words, day2);
  assert.deepEqual(s.vocab.day, { date: '2026-10-17', ids: ids(3, 4, 5, 6, 7) });
});

test('with no words loaded, no batch is stored for the day (a failed load must not use up the day)', () => {
  const s = defaultState();
  assert.equal(ensureBatch(s, [], day1), s);
  assert.equal(s.vocab.day.date, '');
});

test('when every word is decided the batch is empty', () => {
  let s = defaultState();
  for (const w of words) s = markKnown(s, w.id);
  assert.deepEqual(ensureBatch(s, words, day1).vocab.day.ids, []);
});

test('"I know it" saves the word as known without a card; "Teach me" makes a card', () => {
  let s = markKnown(defaultState(), id(1));
  assert.equal(statusOf(s, id(1)), 'known');
  assert.deepEqual(s.cards, {});
  s = teach(s, id(1), day1);
  assert.equal(statusOf(s, id(1)), 'learning');
  assert.deepEqual(s.vocab.known, []);
  assert.ok(s.cards[id(1)]);
  assert.equal(markKnown(s, id(1)), s);
  assert.equal(statusOf(s, id(9)), 'new');
});

test('batchLeft hides decided words', () => {
  let s = ensureBatch(defaultState(), words, day1);
  s = markKnown(s, id(1));
  s = teach(s, id(3), day1);
  assert.deepEqual(batchLeft(s), ids(2, 4, 5));
});

test('search finds a word by its English spelling or its Farsi meaning', () => {
  assert.deepEqual(searchVocab(words, 'WORD1').map((w) => w.id), ids(1, 10, 11, 12));
  assert.deepEqual(searchVocab(words, 'معنی 7').map((w) => w.id), ids(7));
  assert.equal(searchVocab(words, '  ').length, 12);
  assert.deepEqual(searchVocab(words, 'zzz'), []);
});

test('counts show words learning and known', () => {
  let s = markKnown(defaultState(), id(1));
  s = teach(s, id(2), day1);
  s = teach(s, id(3), day1);
  assert.deepEqual(vocabCounts(s), { learning: 2, known: 1 });
});

test('at most 10 vocabulary cards are shown per session; other cards are untouched', () => {
  const cards = {};
  for (let n = 1; n <= 12; n++) cards[id(n)] = newCard(day1);
  cards['nl-01-001'] = newCard(day1);
  let s = { ...defaultState(), cards };
  const queue = [...Object.keys(cards)];
  const key = reviewKey({ week: 1, session: 2 });
  assert.equal(key, '1-2');
  const capped = capQueue(queue, s, key);
  assert.equal(capped.filter(isVocabId).length, VOCAB_REVIEW_CAP);
  assert.ok(capped.includes('nl-01-001'));
  assert.deepEqual(capped.filter(isVocabId), ids(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
  for (let i = 0; i < 4; i++) s = countReview(s, key);
  assert.equal(reviewsLeft(s, key), 6);
  assert.equal(capQueue(queue, s, key).filter(isVocabId).length, 6);
  assert.equal(reviewsLeft(s, '1-3'), 10, 'a new session starts with a full allowance');
  assert.deepEqual(s.vocab.reviews, { key, count: 4 });
});

test('cardView gives a vocabulary card in English with the Farsi meaning as its prompt', () => {
  const v = cardView(id(4), { chunkIndex: {}, wordIndex: {}, myPhrases: [], vocabIndex: indexVocab(packs) });
  assert.equal(v.kind, 'vocab');
  assert.equal(v.lang, 'en');
  assert.equal(v.text, 'word4');
  assert.equal(v.meaning, 'معنی 4');
  assert.equal(v.vocab.id, id(4));
  assert.equal(cardView(id(99), { chunkIndex: {}, wordIndex: {}, myPhrases: [], vocabIndex: indexVocab(packs) }), null);
  assert.equal(cardView(id(4), { chunkIndex: {}, wordIndex: {}, myPhrases: [] }), null, 'works without a vocabIndex');
});
```

- [ ] **Step 5: Write the failing tests for the loader**

`test/vocab-load.test.mjs`:

```js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadVocab, vocabUrl, clearCache } from '../js/content.js';

const files = {
  'content/vocab/pack-01.json': { pack: 1, words: [{ id: 'v-0001' }] },
  'content/vocab/pack-02.json': { pack: 2, draft: true, words: [{ id: 'v-0101' }] },
  'content/vocab/pack-03.json': { pack: 3, words: [{ id: 'v-0201' }] },
};
const fetchWith = (extra = {}) => async (url) => {
  if (url in extra) return extra[url];
  if (!(url in files)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => structuredClone(files[url]) };
};

beforeEach(() => clearCache());

test('vocabUrl pads the pack number', () => assert.equal(vocabUrl(1), 'content/vocab/pack-01.json'));

test('loadVocab loads packs until the first missing one and skips drafts', async () => {
  const r = await loadVocab(fetchWith({ 'content/vocab/pack-03.json': { ok: false, status: 404, json: async () => ({}) } }));
  assert.equal(r.error, null);
  assert.deepEqual(r.packs.map((p) => p.pack), [1]);
});

test('loadVocab with no packs at all is not an error', async () => {
  const r = await loadVocab(async () => ({ ok: false, status: 404, json: async () => ({}) }));
  assert.deepEqual(r, { packs: [], error: null });
});

test('a server error keeps the packs that did load and reports the error', async () => {
  const r = await loadVocab(fetchWith({ 'content/vocab/pack-02.json': { ok: false, status: 500, json: async () => ({}) } }));
  assert.deepEqual(r.packs.map((p) => p.pack), [1]);
  assert.match(r.error.message, /pack-02/);
});

test('a network failure is reported, not thrown', async () => {
  const r = await loadVocab(async () => { throw new TypeError('offline'); });
  assert.deepEqual(r.packs, []);
  assert.equal(r.error.message, 'offline');
});
```

- [ ] **Step 6: Run to see them fail**

Run: `node --test test/vocab.test.mjs test/vocab-load.test.mjs`
Expected: FAIL — `js/vocab.js` missing; `loadVocab` is not exported.

- [ ] **Step 7: Implement `js/vocab.js`**

```js
import { introduce } from './cards.js';
import { localDate } from './session.js';

export const VOCAB_REVIEW_CAP = 10;

export const isVocabId = (id) => /^v-\d{4}$/.test(id);
export const wordsOf = (packs) => packs.flatMap((p) => p.words);
export const indexVocab = (packs) => Object.fromEntries(wordsOf(packs).map((w) => [w.id, w]));

export function statusOf(state, id) {
  if (state.cards[id]) return 'learning';
  if (state.vocab.known.includes(id)) return 'known';
  return 'new';
}

// The day's batch: the next N undecided words, kept for the whole calendar day.
// With no words loaded nothing is stored, so a failed load cannot use up the day.
export function ensureBatch(state, words, now = new Date()) {
  const date = localDate(now);
  if (state.vocab.day.date === date || !words.length) return state;
  const ids = words.filter((w) => statusOf(state, w.id) === 'new').slice(0, state.settings.vocabPerDay).map((w) => w.id);
  return { ...state, vocab: { ...state.vocab, day: { date, ids } } };
}

export const batchLeft = (state) => state.vocab.day.ids.filter((id) => statusOf(state, id) === 'new');

export function markKnown(state, id) {
  if (state.cards[id] || state.vocab.known.includes(id)) return state;
  return { ...state, vocab: { ...state.vocab, known: [...state.vocab.known, id] } };
}

export function teach(state, id, now = new Date()) {
  const s = introduce(state, [id], now);
  return { ...s, vocab: { ...s.vocab, known: s.vocab.known.filter((k) => k !== id) } };
}

export function searchVocab(words, query) {
  const q = query.trim().toLowerCase();
  if (!q) return words;
  return words.filter((w) => w.word.toLowerCase().includes(q) || w.fa.meaning.includes(q));
}

export function vocabCounts(state) {
  return { learning: Object.keys(state.cards).filter(isVocabId).length, known: state.vocab.known.length };
}

export const reviewKey = (position) => `${position.week}-${position.session}`;

export function reviewsLeft(state, key) {
  const r = state.vocab.reviews;
  return Math.max(0, VOCAB_REVIEW_CAP - (r.key === key ? r.count : 0));
}

// Keeps at most the session's remaining allowance of vocabulary cards (oldest due first); other cards stay.
export function capQueue(queue, state, key) {
  let left = reviewsLeft(state, key);
  return queue.filter((id) => !isVocabId(id) || left-- > 0);
}

export function countReview(state, key) {
  const r = state.vocab.reviews;
  return { ...state, vocab: { ...state.vocab, reviews: { key, count: (r.key === key ? r.count : 0) + 1 } } };
}
```

- [ ] **Step 8: Implement the loader and the card view**

Append to `js/content.js`:

```js
export const vocabUrl = (n) => `content/vocab/pack-${String(n).padStart(2, '0')}.json`;

// Loads pack-01, pack-02, … until the first one that does not exist. Never throws: a failure is
// reported in `error`, and the packs that did load are kept. Packs marked `draft` are skipped.
export async function loadVocab(fetchFn) {
  const packs = [];
  for (let n = 1; ; n++) {
    try {
      const pack = await loadJson(vocabUrl(n), fetchFn);
      if (!pack.draft) packs.push(pack);
    } catch (e) {
      return { packs, error: e instanceof ContentMissing ? null : e };
    }
  }
}
```

In `js/cards.js` change the `cardView` signature and add the vocabulary branch before the `myPhrases` lookup:

```js
export function cardView(id, { chunkIndex, wordIndex, myPhrases, vocabIndex = {} }) {
```
```js
  const v = vocabIndex[id];
  if (v) {
    return { id, kind: 'vocab', lang: 'en', text: v.word, meaning: v.fa.meaning, article: null, fa: v.fa.note, stress: v.stress, note: '', vocab: v };
  }
```

Add `'js/vocab.js',` to `SHELL` in `sw.js` after `'js/store.js',`.

- [ ] **Step 9: Run all tests**

Run: `npm test && npm run validate`
Expected: all pass (the new store, vocab and loader tests included).

- [ ] **Step 10: Commit**

```bash
git add js/store.js js/vocab.js js/content.js js/cards.js sw.js test/store.test.mjs test/vocab.test.mjs test/vocab-load.test.mjs
git commit -m "feat: vocabulary state, daily batch, triage, review cap, loader and card view"
```

---

### Task 5: The Words tab

**Files:**
- Create: `js/ui/words.js`
- Modify: `js/app.js`, `index.html`, `css/app.css`, `sw.js`, `tools/smoke.mjs`

**Interfaces:**
- Consumes: Task 4 (`js/vocab.js`, `loadVocab`, `cardView`); `speakable`, `say`, `sayItCheck` from `js/ui/widgets.js`; `h`, `button`, `mount`, `clear`, `fa` from `js/ui/dom.js`.
- Produces: `render(ctx, root)` and `renderList(ctx, root)` from `js/ui/words.js`; `wordPage(ctx, word, { actions }?) → HTMLElement` (reused by Task 6); `ctx.getVocab() → Promise<{packs, error}>` and `ctx.vocabIndex` in `js/app.js`; routes `words` and `words/list`.

- [ ] **Step 1: Write the failing smoke checks**

In `tools/smoke.mjs`, add `'words', 'words/list'` to the `routes` array (so every screen opens), and add this block before the `// Leaving a line while recording must turn the microphone off.` comment:

```js
  // Words tab: today's batch, "Teach me" makes a card, and reopening the tab shows the same batch.
  const vocabState = `(() => { const s = JSON.parse(localStorage.getItem('taalmaatje.v1')); return s; })()`;
  await check('index.html#/words', 'words', 'I know it');
  const text = await b.text();
  const batch = await b.evaluate(`${vocabState}.vocab.day.ids.join()`);
  const batchOk = batch.split(',').length === 5 && /Teach me/.test(text) && /\/.+\//.test(text);
  if (!batchOk) failed++;
  console.log(`${batchOk ? '✓' : '✗'} Words tab shows 5 words for today with IPA and the triage buttons (${batch})`);
  await b.click('Teach me');
  const taught = await b.evaluate(`Object.keys(${vocabState}.cards).filter((id) => /^v-/.test(id)).join()`);
  const first = batch.split(',')[0];
  const cardOk = taught === first;
  if (!cardOk) failed++;
  console.log(`${cardOk ? '✓' : '✗'} "Teach me" makes a card for the first word (${taught})`);
  await check('index.html?again#/words', 'words', 'Today: 1 of 5 words done');
  const same = (await b.evaluate(`${vocabState}.vocab.day.ids.join()`)) === batch;
  if (!same) failed++;
  console.log(`${same ? '✓' : '✗'} reopening the Words tab keeps the same batch`);
  await check('index.html#/words/list', 'words/list', 'All words');

  // The words fail to load: the Words tab explains and offers "Try again"; other screens keep working.
  await b.block(['*content/vocab/*']);
  await check('index.html?blocked#/words', 'words', 'Could not load the words', ['ERR_BLOCKED_BY_CLIENT', 'pack-0']);
  await check('index.html#/progress', 'progress', 'Progress', ['ERR_BLOCKED_BY_CLIENT', 'pack-0']);
  await b.block([]);

  // Farsi hints off: the word page hides the Farsi note and translations but keeps the Farsi meaning.
  await b.evaluate(`(() => { const s = JSON.parse(localStorage.getItem('taalmaatje.v1')); s.settings.farsi = false; localStorage.setItem('taalmaatje.v1', JSON.stringify(s)); })()`);
  await check('index.html?nofarsi#/words', 'words', 'I know it');
  const farsiCount = await b.evaluate(`document.querySelectorAll('.card.vocab .fa').length`);
  const hintsOff = farsiCount === 1;
  if (!hintsOff) failed++;
  console.log(`${hintsOff ? '✓' : '✗'} with Farsi hints off the word page keeps only the Farsi meaning (${farsiCount} Farsi line)`);
  await b.evaluate(`(() => { const s = JSON.parse(localStorage.getItem('taalmaatje.v1')); s.settings.farsi = true; localStorage.setItem('taalmaatje.v1', JSON.stringify(s)); })()`);

```

Run: `npm run smoke`
Expected: FAIL — the `words` routes fall back to Today (the screen never reports `data-ready = words`), so those checks report ✗.

- [ ] **Step 2: Implement `js/ui/words.js`**

```js
import { clear, mount, h, button, fa } from './dom.js';
import { speakable, say, sayItCheck } from './widgets.js';
import { ensureBatch, batchLeft, markKnown, teach, statusOf, searchVocab, wordsOf } from '../vocab.js';

// One word: pronunciation, Farsi meaning and note, and the examples. Used here and in Cards.
export function wordPage(ctx, w, { actions = null } = {}) {
  const farsi = ctx.state.settings.farsi;
  return h('div', { class: 'card vocab' },
    h('div', { class: 'speakable-row' },
      h('p', { class: 'vocab-word', lang: 'en' }, w.word),
      h('span', { class: 'audio-buttons' },
        button('🔊', () => say(ctx, w.word, 'en', 1), { class: 'icon', 'aria-label': 'Play the word' }),
        button('🐢', () => say(ctx, w.word, 'en', 0.7), { class: 'icon', 'aria-label': 'Play the word slowly' }))),
    h('p', { class: 'hint' }, `${w.pos}${w.register ? ` · ${w.register}` : ''}`),
    h('p', { class: 'ipa' }, `/${w.ipa}/ `, h('span', { class: 'hint' }, 'American English')),
    h('p', { class: 'stress' }, 'Stress: ', w.stress.join(' · ')),
    fa(w.fa.meaning),
    farsi ? fa(w.fa.note) : null,
    w.examples.map((ex, i) => h('div', { class: 'example' },
      speakable(ctx, ex.text, 'en'),
      farsi ? fa(ex.fa) : null,
      i === 0 ? sayItCheck(ctx, ex.text, 'en') : null)),
    actions);
}

function loadFailed(ctx, root) {
  mount(root, h('h1', {}, '📚 Words'),
    h('div', { class: 'card' },
      h('p', {}, 'Could not load the words.'),
      h('p', { class: 'hint' }, 'Check your internet connection. If you installed the app, open it once while online.'),
      button('Try again', () => ctx.rerender(), { class: 'primary' })));
}

export async function render(ctx, root) {
  const { packs, error } = await ctx.getVocab();
  if (error && !packs.length) return loadFailed(ctx, root);
  const words = wordsOf(packs);
  ctx.update((s) => ensureBatch(s, words, new Date()));

  const head = h('p', { class: 'muted' });
  const stage = h('div', {});
  mount(root, h('h1', {}, '📚 Words'), head,
    ctx.voices.en ? null : h('p', { class: 'warn' }, 'No English voice found on this device, so 🔊 will not play. iPhone: Settings → Accessibility → Spoken Content → Voices → English.'),
    stage,
    error ? h('p', { class: 'hint' }, 'Some words could not be loaded.') : null,
    h('p', {}, h('a', { href: '#/words/list' }, 'All words →')));
  show();

  function show() {
    const total = ctx.state.vocab.day.ids.filter((id) => ctx.vocabIndex[id]).length;
    const left = batchLeft(ctx.state).filter((id) => ctx.vocabIndex[id]);
    head.textContent = total ? `Today: ${total - left.length} of ${total} words done` : '';
    clear(stage);
    if (!total) return mount(stage, h('div', { class: 'card' }, h('p', {}, 'More words are coming soon.')));
    if (!left.length) return mount(stage, h('div', { class: 'card' }, h('p', {}, '✓ Today’s words are finished.'), h('p', {}, h('a', { href: '#/words/list' }, 'See all words →'))));
    const w = ctx.vocabIndex[left[0]];
    mount(stage, wordPage(ctx, w, {
      actions: h('div', { class: 'vocab-actions' },
        button('I know it', () => decide((s) => markKnown(s, w.id))),
        button('Teach me', () => decide((s) => teach(s, w.id, new Date())), { class: 'primary' })),
    }));
  }

  function decide(change) {
    ctx.update(change);
    show();
    window.scrollTo(0, 0);
  }
}

const STATUS = { new: 'new', known: 'known', learning: 'learning' };

export async function renderList(ctx, root) {
  const { packs, error } = await ctx.getVocab();
  const words = wordsOf(packs);
  const results = h('div', {});
  const box = h('input', { type: 'search', placeholder: 'Search a word or its Farsi meaning', 'aria-label': 'Search words', onInput: list });
  mount(root, h('h1', {}, '📚 All words'), h('p', {}, h('a', { href: '#/words' }, '← Today’s words')), box, results);
  list();

  function list() {
    const found = searchVocab(words, box.value);
    mount(clear(results), found.length ? found.map(row) : h('p', { class: 'muted' }, error ? 'Could not load the words.' : 'No words found.'));
  }

  // The word page is built only when a row is opened (120 pages at once would be slow).
  function row(w) {
    const status = statusOf(ctx.state, w.id);
    const details = h('details', {}, h('summary', {}, `${w.word} · ${w.fa.meaning} · ${STATUS[status]}`));
    details.addEventListener('toggle', () => {
      if (!details.open || details.dataset.built) return;
      details.dataset.built = '1';
      const again = () => { ctx.update((s) => teach(s, w.id, new Date())); ctx.rerender(); };
      const actions = status === 'learning' ? null : h('div', { class: 'vocab-actions' },
        status === 'new' ? button('I know it', () => { ctx.update((s) => markKnown(s, w.id)); ctx.rerender(); }) : null,
        button('Teach me', again, { class: 'primary' }));
      details.append(wordPage(ctx, w, { actions }));
    });
    return details;
  }
}
```

- [ ] **Step 3: Routes, navigation, loader, CSS, offline list**

`js/app.js`: add `import * as wordsUi from './ui/words.js';` and `import { loadCourse, loadWords, loadVocab } from './content.js';`, `import { indexVocab } from './vocab.js';`; add to `routes`:

```js
  words: wordsUi.render,
  'words/list': wordsUi.renderList,
```
to `ctx` add `vocab: null,` and `vocabIndex: {},` next to `words: null,` and, after `getWords`:

```js
  async getVocab() {
    if (!ctx.vocab || ctx.vocab.error) {
      ctx.vocab = await loadVocab();
      ctx.vocabIndex = indexVocab(ctx.vocab.packs);
    }
    return ctx.vocab;
  },
```
and change `cardSources` to `({ chunkIndex: ctx.chunkIndex, wordIndex: ctx.wordIndex, myPhrases: ctx.state.myPhrases, vocabIndex: ctx.vocabIndex })`.

`index.html`: add the tab between Today and Progress:
```html
    <a href="#/words" data-tab="words">Words</a>
```

`css/app.css` (append):
```css
.vocab-word { font-size: 1.6rem; font-weight: 700; margin: 6px 0; flex: 1 1 auto; }
.ipa { margin: 2px 0; }
.example { border-top: 1px solid var(--line); margin-top: 10px; padding-top: 4px; }
.vocab-actions { display: flex; gap: 8px; margin-top: 12px; }
.vocab-actions button { flex: 1; }
details > summary { cursor: pointer; padding: 8px 0; }
```

`sw.js`: add `'js/ui/words.js',` to `SHELL` after `'js/ui/today.js',`.

- [ ] **Step 4: Run all checks**

Run: `npm test && npm run validate && npm run smoke`
Expected: all green; smoke shows `✓ Words tab shows 5 words for today with IPA and the triage buttons`, `✓ "Teach me" makes a card …`, `✓ reopening the Words tab keeps the same batch`, `✓ … Could not load the words`, `✓ with Farsi hints off …`.

If the batch check fails because the IPA regex `/\/.+\//` does not match, look at what `b.text()` returned (print it) before changing the check: the word page must show the IPA between slashes.

- [ ] **Step 5: Commit**

```bash
git add js/ui/words.js js/app.js index.html css/app.css sw.js tools/smoke.mjs
git commit -m "feat: Words tab with daily batch, word pages, I know it / Teach me, and an all-words list"
```

---

### Task 6: Vocabulary cards, review cap, setting and progress — publish

**Files:**
- Modify: `js/ui/cards.js`, `js/ui/settings.js`, `js/ui/progress.js`, `tools/smoke.mjs`

**Interfaces:**
- Consumes: `wordPage` (Task 5); `isVocabId`, `capQueue`, `countReview`, `reviewKey`, `vocabCounts` (Task 4); `clozeOf` (Task 2); `ctx.getVocab()`.
- Produces: vocabulary new/review cards in the Cards block with the cap; Settings row "New English words per day"; Progress line "📚 Words: N learning · M known".

- [ ] **Step 1: Write the failing smoke checks**

Add this block to `tools/smoke.mjs` after the Words-tab block from Task 5 (before the microphone checks):

```js
  // Vocabulary in the Cards block: a new card shows the word page; reviews show the Farsi meaning and a gap.
  // A finished course has no course cards, so only the vocabulary card is due.
  await b.evaluate(`(() => { const s = JSON.parse(localStorage.getItem('taalmaatje.v1')); s.finished = true; localStorage.setItem('taalmaatje.v1', JSON.stringify(s)); })()`);
  await check('index.html?cards#/block/cards', 'block/cards', 'New · English word');
  await b.evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('taalmaatje.v1'));
    const template = s.cards[Object.keys(s.cards).find((id) => /^v-/.test(id))];
    for (let n = 1; n <= 12; n++) s.cards['v-' + String(n).padStart(4, '0')] = { ...template, due: '2020-01-01T00:00:00.000Z', reps: 3 };
    s.vocab.reviews = { key: '', count: 0 };
    localStorage.setItem('taalmaatje.v1', JSON.stringify(s));
  })()`);
  await check('index.html?cap#/block/cards', 'block/cards', '10 cards to review');
  const review = await b.text();
  const reviewOk = /Say the English word/.test(review) && /____/.test(review);
  if (!reviewOk) failed++;
  console.log(`${reviewOk ? '✓' : '✗'} a vocabulary review shows the Farsi meaning and the example with a gap`);
  await b.click('Show');
  await b.click('Good');
  const left = await b.waitFor(`/9 cards to review|Say the English word/.test(document.querySelector('main').innerText)`, 3000);
  const counted = await b.evaluate(`JSON.parse(localStorage.getItem('taalmaatje.v1')).vocab.reviews.count`);
  if (!left || counted !== 1) failed++;
  console.log(`${left && counted === 1 ? '✓' : '✗'} grading a vocabulary card counts one review toward the cap of 10 (${counted})`);
  await check('index.html#/settings', 'settings', 'New English words per day');
  await check('index.html#/progress', 'progress', '📚 Words:');
```

Run: `npm run smoke`
Expected: FAIL — Cards has no vocabulary card ("New · English word" missing) and Settings/Progress lack the new lines.

- [ ] **Step 2: Vocabulary cards and the cap in `js/ui/cards.js`**

Change the imports at the top:

```js
import { clear, mount, h, button, fa } from './dom.js';
import { speakable, sayItCheck, cardDetails, doneBar } from './widgets.js';
import { wordPage } from './words.js';
import { clozeOf } from '../vocabtext.js';
import { isVocabId, capQueue, countReview, reviewKey } from '../vocab.js';
```

In `render`, after the existing line that loads the Dutch word deck add the vocabulary load, and cap the queue:

```js
  if (Object.keys(ctx.state.cards).some((id) => isVocabId(id))) await ctx.getVocab();

  const key = reviewKey(ctx.state.position);
  const queue = capQueue(dueQueue(ctx.state, now), ctx.state, key);
```
(replacing `const queue = dueQueue(ctx.state, now);`).

Replace `onGrade` with:

```js
  function onGrade(id, g) {
    ctx.update((s) => grade(s, id, g, new Date()));
    if (isVocabId(id)) {
      ctx.update((s) => countReview(s, key));
      queue.splice(0, queue.length, ...capQueue(queue, ctx.state, key));
    }
    if (shouldRepeat(ctx.state.cards[id], new Date(), seen[id])) queue.push(id);
    next();
  }

  const gradeRow = (id) => h('div', {},
    button('Again', () => onGrade(id, Grade.Again)),
    button('Hard', () => onGrade(id, Grade.Hard)),
    button('Good', () => onGrade(id, Grade.Good), { class: 'primary' }),
    button('Easy', () => onGrade(id, Grade.Easy)));
```

At the start of `newCard` and `reviewCard` add the vocabulary branches, and make `reviewCard` use `gradeRow`:

```js
  function newCard(id, view) {
    if (view.kind === 'vocab') {
      return h('div', { class: 'card' },
        h('p', { class: 'label' }, 'New · English word'),
        wordPage(ctx, view.vocab),
        button('Got it →', () => onGrade(id, Grade.Good), { class: 'primary' }));
    }
    // … the existing course-card code, unchanged
  }

  function vocabReview(id, view) {
    const w = view.vocab;
    const gap = clozeOf(w.examples[0].text, w.forms) ?? w.examples[0].text;
    const answer = h('div', { hidden: true }, wordPage(ctx, w), h('p', { class: 'label' }, 'How well did you know it?'), gradeRow(id));
    const show = button('Show', () => { answer.hidden = false; show.remove(); }, { class: 'primary' });
    return h('div', { class: 'card' },
      h('p', { class: 'label' }, 'Say the English word'),
      fa(w.fa.meaning),
      h('p', { class: 'cloze', lang: 'en' }, gap),
      show, answer);
  }

  function reviewCard(id, view) {
    if (view.kind === 'vocab') return vocabReview(id, view);
    // … the existing code, with the four grade buttons replaced by gradeRow(id)
  }
```
In the existing `reviewCard`, replace the `h('div', {}, button('Again' …), … button('Easy' …))` block by `gradeRow(id)`.

- [ ] **Step 3: Settings and Progress**

`js/ui/settings.js`: after the `extraWords` hint paragraph add

```js
    h('label', { class: 'row' }, 'New English words per day',
      h('select', { onChange: (e) => set({ vocabPerDay: Number(e.target.value) }) },
        [3, 5, 10].map((n) => h('option', { value: n, selected: n === s.vocabPerDay }, String(n))))),
    h('p', { class: 'hint' }, 'The Words tab gives you this many new English words each day.'),
```

`js/ui/progress.js`: add `import { vocabCounts } from '../vocab.js';`, compute `const words = vocabCounts(s);` next to `const learned …`, and add after the `h('div', { class: 'stats' }, …)` block:

```js
    h('p', { class: 'muted' }, `📚 Words: ${words.learning} learning · ${words.known} known`),
```

- [ ] **Step 4: Run all checks**

Run: `npm test && npm run validate && npm run smoke`
Expected: all green, including `✓ a vocabulary review shows the Farsi meaning and the example with a gap` and `✓ grading a vocabulary card counts one review toward the cap of 10 (1)`.

- [ ] **Step 5: Commit and publish**

```bash
git add js/ui/cards.js js/ui/settings.js js/ui/progress.js tools/smoke.mjs
git commit -m "feat: vocabulary cards in Cards (cap of 10 per session), words-per-day setting, progress line"
git push origin HEAD:main
git log --oneline -1 origin/main
```
Then poll until the live pack is served (about 30–60 seconds):
`curl -s "https://momi1370.github.io/Language-Learning/content/vocab/pack-01.json?t=$RANDOM" | grep -c '"pack": 1'` prints `1`.

---

### Task 7: Docs and close-out

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/2026-10-16-english-vocabulary-design.md`

- [ ] **Step 1: README**

Append a short section to `README.md`:

```markdown
## Words (English vocabulary)

The **Words** tab teaches everyday English words: pronunciation (IPA, American), a Farsi meaning and note, and two or more current example sentences with Farsi translations. Each day it shows a few new words; **Teach me** turns one into a flashcard that is reviewed in the Cards block (at most 10 vocabulary cards per session).

Packs live in `content/vocab/` (CC BY-SA 4.0; word choice from the NGSL-Spoken list, IPA from the CMU Pronouncing Dictionary — see `content/vocab/README.md`). `node tools/vocab-ipa.mjs <pack> <cmudict.dict>` fills the IPA; `npm run validate` checks every pack.
```

- [ ] **Step 2: Spec status and decisions log**

In the spec change `- **Status:** Draft, waiting for learner review` to `- **Status:** Approved by the learner 2026-10-16; milestone 1 (engine + pack 1) implemented`, and add to §12:

```markdown
| 2026-10-16 | Words in a list row: undecided words also get "I know it" next to "Teach me" (so the learner can jump ahead); learning words have no triage buttons |
| 2026-10-16 | Packs marked `"draft": true` are skipped by the app and by the 100-word minimum while a pack is being written |
```

- [ ] **Step 3: Final checks, commit, publish, verify**

Run: `npm test && npm run validate && npm run smoke`, then

```bash
git add README.md docs/superpowers/specs/2026-10-16-english-vocabulary-design.md
git commit -m "docs: Words tab in the README; spec status and decisions"
git push origin HEAD:main
```
Poll until `curl -s "https://momi1370.github.io/Language-Learning/sw.js?t=$RANDOM" | grep -c "js/ui/words.js"` prints `1`.

- [ ] **Step 4: Tell the learner how to start**

Open the app, close it, open it again, tap **Words**. Report what changed, the pack size, and the open choices from the spec (American IPA with a British voice; cap of 10).
