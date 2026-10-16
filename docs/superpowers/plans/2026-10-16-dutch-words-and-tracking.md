# Dutch Words Tab and Learned-Words Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Dutch "Woorden" tab (everyday words only) that works like the English Words tab, and a stage system that shows which words are truly learned, for both languages.

**Architecture:** Plain ES-module PWA, no build step. A new pure module `js/learned.js` derives each word's stage from its FSRS card (stability, reps), so nothing in the saved cards changes. `js/vocab.js` and `js/ui/words.js` become language-aware through a "section" key (`everyday`, `university`, `nl-everyday`) that already exists as the per-track batch key. Dutch words are `d-NNNN` in packs 4 and 5 with `"lang": "nl"`.

**Tech Stack:** Vanilla JS modules, `node --test`, ts-fsrs (vendored), headless-Chrome smoke test (`tools/smoke.mjs`), Kokoro/Piper clip tooling in `tools/tts/`, espeak-ng for Dutch IPA.

**Spec:** `docs/superpowers/specs/2026-10-16-dutch-words-and-tracking-design.md` (read it first; the repo's `content/vocab/README.md` and the English spec `2026-10-16-english-vocabulary-design.md` describe the pack format this extends).

## Global Constraints

- Repo root: `/Users/user/Document/EN Learning/Language-Learning`. Deploy = `git push` to `main` (GitHub Pages). Do not push without the learner's yes (see Handoff).
- No build step, no new runtime dependencies. Every `js/*.js` file must be listed in `SHELL` in `sw.js` (a test enforces it); new packs too.
- Stage thresholds: Learning = stability under 7 days (or no review yet); Familiar = stability ≥ 7 days; Learned = stability ≥ 21 days **and** reps ≥ 3. Constants `FAMILIAR_DAYS = 7`, `LEARNED_DAYS = 21`, `LEARNED_REPS = 3`.
- Quick check: 3 words, optional, offered once a day per language, never blocks the daily words.
- New saved fields: `vocab.checked: string[]`, `vocab.learnedOn: {id: 'YYYY-MM-DD'}`, `vocab.checkDay: {en: string, nl: string}`, `settings.vocabPerDayNl` (default 5, options 3/5/10/15). English `vocabPerDay` default (10) is untouched. Old saves migrate without loss; no card or `known` entry is reset.
- Dutch word ids `d-0001…`; English ids stay `v-NNNN`. Language of an id: `d-` → `nl`, `v-` → `en`.
- Dutch packs: 4 and 5, 75 words each in the end, `"lang": "nl"`, `"track": "everyday"`, `"format": 2`, content licence CC BY-SA 4.0 like the other packs. Words must not already appear in the Dutch course weeks 1–4 chunks. Standard Dutch with Belgian usage; `register` marks `Belgian` / `Netherlands`-only words.
- Dutch example sentences: exactly 3 per word (past, present, future), 5–16 words, real spoken Dutch (past normally in the perfect: *heb … gebeld*), future with `zal/zult/zullen/ga/gaat/gaan`, each with Farsi translation and Farsi `grammar`.
- Text style: no emoji except the existing UI ones; Farsi text for learner-facing explanations; code comments sparing, matching surrounding code.
- All 224 existing tests keep passing at every commit. Commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Old saves and existing English cards.** A save from before this change (no `checked`, `learnedOn`, `checkDay`, `vocabPerDayNl`) loads without losing anything; English cards already Learned get a `learnedOn` date from their last review, not "today" for all. (Tasks 1, 2)
2. **Cards with no review yet or odd FSRS values** (`reps` 0, `stability` 0/undefined) classify as Learning, never `NaN` or a crash. (Task 1)
3. **Spot-check with nothing to check** (no claimed words, or all confirmed, or already done today) shows no card and no error; a failed check teaches the word and removes it from claimed. (Tasks 1, 2)
4. **Two languages on one day.** English and Dutch batches, top-ups and per-day settings never touch each other; the shared 10-per-session review cap counts both. (Task 3)
5. **Dutch tab with content missing or still loading** (offline first visit, no pack-04) shows the "could not load" card, not a blank page; Progress counts need no packs loaded. (Tasks 2, 5)

---

### Task 1: Stage engine and saved fields

**Files:**
- Create: `js/learned.js`, `test/learned.test.mjs`
- Modify: `js/store.js` (defaults and `migrate()`), `test/store.test.mjs`, `sw.js` (add `js/learned.js` to SHELL)

**Interfaces:**
- Consumes: `statusOf`, `teach`, `isVocabId` from `js/vocab.js` (Task 3 widens `isVocabId`; here it still accepts `v-NNNN`, so `langOfId` handles `d-` itself); card shape `{reps, stability, lapses, last_review, ...}` from `js/srs.js`.
- Produces (all pure, in `js/learned.js`):
  - `FAMILIAR_DAYS, LEARNED_DAYS, LEARNED_REPS` constants.
  - `STAGES = ['learning','familiar','learned','claimed','confirmed']`.
  - `langOfId(id: string): 'en' | 'nl' | null`.
  - `stageOf(state, id): 'new' | 'claimed' | 'confirmed' | 'learning' | 'familiar' | 'learned'`.
  - `stageCounts(state, lang): Record<stage, number>` for ids of that language (cards + `known`; needs no packs).
  - `noteLearned(state, id, now): state` sets `vocab.learnedOn[id]` the first time `stageOf` is `learned` (date `localDate(now)`).
  - `backfillLearned(state, now): state` applies `noteLearned` to every vocab card, using the card's `last_review` date when present.
  - `learnedSince(state, lang, fromDate: string): number` count of `learnedOn` dates ≥ fromDate for that language.
  - `trickyIds(state, lang, limit = 10): string[]` cards with `lapses >= 2`, most lapses first.
  - `pickSpotCheck(state, lang, now, count = 3): string[]` claimed ids (known, not checked, of that lang); `[]` if `vocab.checkDay[lang] === localDate(now)`; stable for a given date (start index from the day number so different days rotate).
  - `resolveSpotCheck(state, id, knew: boolean, now): state` knew → id appended to `vocab.checked`; not knew → `teach(state, id, now)`. `finishSpotCheck(state, lang, now): state` sets `vocab.checkDay[lang]`.
- Store: `defaultState().vocab` gains `checked: []`, `learnedOn: {}`, `checkDay: {en: '', nl: ''}`; `migrate()` validates each (array of strings; object of `YYYY-MM-DD` strings; object with string values) and falls back to defaults.

- [ ] **Step 1: Write the failing tests** in `test/learned.test.mjs`: (a) `stageOf` for: no card/not known → `new`; in `known` → `claimed`; in `known` and `checked` → `confirmed`; card `{reps:0}` → `learning`; `{reps:2, stability:6.9}` → `learning`; `{reps:2, stability:7}` → `familiar`; `{reps:3, stability:21}` → `learned`; `{reps:2, stability:40}` → `familiar` (the 3-review rule); `{reps:5, stability:undefined}` → `learning`. (b) `langOfId('d-0001') === 'nl'`, `'v-0001' → 'en'`, `'nl-01-001' → null`; `stageCounts` counts only that language. (c) `noteLearned` sets the date once and never overwrites; `backfillLearned` uses `last_review`'s local date. (d) `trickyIds` orders by lapses and ignores `lapses < 2`. (e) `pickSpotCheck`: empty when none claimed, when `checkDay[lang]` is today, never returns confirmed or other-language ids, at most `count`, same result on the same date, different start on the next day when more than `count` exist. (f) `resolveSpotCheck(knew=true)` → in `checked`; `(knew=false)` → not in `known`, card exists with `reps === 0`. (g) store: a state with the new fields round-trips through `migrate`; an old state lacking them gets the defaults; garbage values (`checked: 5`, `learnedOn: {a: 3}`) are replaced by defaults, other fields intact.
- [ ] **Step 2: Run** `node --test test/learned.test.mjs test/store.test.mjs`. Expected: FAIL (module not found / fields missing).
- [ ] **Step 3: Implement** `js/learned.js` per the Interfaces block (stability and reps read defensively: `Number.isFinite(card.stability)`), extend `defaultState()` and `migrate()` in `js/store.js`, add `'js/learned.js'` to `SHELL`.
- [ ] **Step 4: Run** `node --test`. Expected: all tests pass (224 old + new).
- [ ] **Step 5: Commit** `feat: stage engine for learned words (learning, familiar, learned, claimed, confirmed) and the saved fields it needs`.

### Task 2: Tracking screens for English (Words tab, list, Progress, quick check)

**Files:**
- Modify: `js/ui/words.js`, `js/ui/progress.js`, `js/ui/cards.js` (call `noteLearned` after a vocab grade), `js/app.js` (run `backfillLearned` once at boot), `css/app.css`, `tools/smoke.mjs`
- Test: `test/learned-ui.test.mjs` (pure view-model helpers only), `tools/smoke.mjs`

**Interfaces:**
- Consumes: everything produced by Task 1.
- Produces in `js/learned.js` (extend Task 1, same test file): `stageSummary(counts): string` e.g. `'8 learned · 14 familiar · 22 learning · 30 claimed'` (omits zero entries; `''` when all zero); `stageShares(counts): {stage, share}[]` fractions summing to 1 for the stacked bar (empty when total 0); `STAGE_LABELS` (`learned: 'Learned'`, …).
- `js/ui/words.js` exports `stageChip(stage): HTMLElement` (small label), and the list rows show it.

- [ ] **Step 1: Write failing tests** for `stageSummary`, `stageShares` (zero total → `[]`, shares sum to 1, order learned → claimed) in `test/learned.test.mjs`.
- [ ] **Step 2: Run** `node --test test/learned.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** the three helpers in `js/learned.js`.
- [ ] **Step 4: Run** the same file. Expected: PASS.
- [ ] **Step 5: Screens.** (a) Words tab: under the section switcher, a line `stageSummary(stageCounts(state,'en'))` and a thin stacked bar from `stageShares` (CSS custom-property colours, accessible text alternative via the line). (b) List: each row's summary text gets the stage label; a stage filter row (All / New / Learning / Familiar / Learned / Claimed / Confirmed) next to the section filter; `stageOf` per word. (c) Quick check: when `pickSpotCheck(state,'en',now)` is non-empty, a card **"Quick check · N words"** with a Start button; each step shows the word (🔊 plays it), a Show button revealing its Farsi meaning, then **I knew it** / **Not sure** calling `resolveSpotCheck`; after the last, `finishSpotCheck` and the card disappears. Hidden when nothing to check. (d) Progress: replace the `📚 Words:` line with a per-language block (🇬🇧 now; 🇧🇪 appears in Task 5): ladder counts, `Reached Learned: N this week · N this month` via `learnedSince`, and **Tricky words** (`trickyIds`, up to 10, each a link to `#/words/list` opening that word is not required; plain text word + Farsi meaning is enough when packs are loaded, id otherwise). (e) `js/ui/cards.js`: after `grade(...)` on a vocab id, `ctx.update((s) => noteLearned(s, id, new Date()))`. (f) `js/app.js`: once at `boot()` after the state loads, `ctx.update((s) => backfillLearned(s, new Date()))`.
- [ ] **Step 6: Smoke.** In `tools/smoke.mjs` add: after teaching one English word, the Words tab shows the stage line containing `learning`; the list has the stage filter; with a seeded state that has 4 claimed words the Quick check card appears, running through 3 words ends with no card; Progress shows the Words block. Run `npm test` and `node tools/smoke.mjs` (see `package.json` for exact scripts). Expected: all pass.
- [ ] **Step 7: Commit** `feat: learned-words tracking for English: stage line and bar, stage filter, quick check, Progress block`. Update `README.md` Words section by one line. (Push only if the learner agreed, see Handoff.)

### Task 3: Language-aware vocabulary engine

**Files:**
- Modify: `js/vocab.js`, `js/vocabtext.js`, `js/store.js`, `js/cards.js` (`cardView`), `test/vocab.test.mjs`, `test/store.test.mjs`, `test/cards.test.mjs`, `test/vocabtext.test.mjs`
- Test: same files

**Interfaces:**
- Produces:
  - `js/vocabtext.js`: `SECTIONS = ['everyday','university','nl-everyday']` (replaces use of `TRACKS` inside `store.js`; keep `TRACKS` for the English switcher), `SECTION_NAMES`.
  - `js/vocab.js`: `wordsOf(packs)` attaches `lang` (`pack.lang ?? 'en'`) and `section` (`lang === 'nl' ? 'nl-everyday' : track`) to each word, keeping `track` as today; `isVocabId = /^[vd]-\d{4}$/`; `ensureBatch(state, words, now = new Date(), section = state.settings.vocabTrack)`; `batchOf(state, section = state.settings.vocabTrack)`; `batchLeft(state, section = …)`; `newCount(state, words, section)` (matches `w.section`); `settleBatch(state, unknownIds, section = …)`; `perDayOf(settings, section): number` returns `settings.vocabPerDayNl` for `nl-*`, else `settings.vocabPerDay`.
  - `cardView` for a vocab id returns `lang: v.lang ?? 'en'`.
  - Store: `settings.vocabPerDayNl` default 5 validated against `PER_DAY` (invalid → 5); `migrateDay` keeps batches for every section in `SECTIONS`.
- Callers that pass nothing keep the current English behaviour (all existing tests stay green unchanged).

- [ ] **Step 1: Write failing tests**: `isVocabId('d-0001')` true; `wordsOf` gives a nl pack's words `lang:'nl'`, `section:'nl-everyday'` and an English pack's words `lang:'en'`; `ensureBatch(..., 'nl-everyday')` draws only nl words, 5 by default, stored under `batches['nl-everyday']`, and leaves the English batch alone (and the reverse: English top-up never touches `nl-everyday`); `settleBatch` with the section argument marks only that batch known; `newCount` per section; `perDayOf`; capQueue/countReview treat `d-` reviews and `v-` reviews as one pool (10 total); `cardView('d-0001')` has `lang 'nl'`; store round trip keeps `batches['nl-everyday']` and `vocabPerDayNl`, an invalid `vocabPerDayNl` resets to 5, an old save gets 5.
- [ ] **Step 2: Run** `node --test`. Expected: the new tests FAIL, old ones pass.
- [ ] **Step 3: Implement** per the Interfaces block. `ensureBatch` uses `perDayOf(state.settings, section)` where it used `vocabPerDay`.
- [ ] **Step 4: Run** `node --test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: vocabulary engine works per language section (Dutch batches, per-language words per day)`.

### Task 4: Dutch pack format, validator, IPA tool, starter pack

**Files:**
- Modify: `tools/vocab-schema.mjs`, `tools/validate.mjs`, `test/vocab-schema.test.mjs`, `test/fixtures.mjs` (add `validDutchWord`, `validDutchPack`), `content/vocab/README.md`
- Create: `tools/vocab-ipa-nl.mjs`, `test/vocab-ipa-nl.test.mjs`, `content/vocab/pack-04.json` (10 words for now), `tools/tts/` untouched

**Interfaces:**
- Produces: `validateVocab(pack, opts)` branches on `pack.lang === 'nl'` with these Dutch rules (English rules unchanged): id `/^d-\d{4}$/`; `en` required text; nouns (`pos` starts with `noun`) have `word` starting `de ` or `het `; `morph` ≥ 2 pairs; exactly three examples, one per tense, `grammar` Farsi; future sentence matches `/\b(zal|zult|zullen|ga|gaat|gaan)\b/i`; past sentence matches `/\b(heb|hebt|heeft|hebben|ben|bent|is|zijn|was|waren|had|hadden)\b/i`; `register` in `['neutral','informal','formal','Belgian','Netherlands']`; stress capitals present (no English-IPA syllable check for Dutch); example length 5–16 words; no dated-English check. Minimum words: `MIN_PACK_WORDS_NL = 10` for now (Task 6 raises it to 75). `tools/vocab-ipa-nl.mjs`: `node tools/vocab-ipa-nl.mjs content/vocab/pack-04.json` fills missing `ipa` using `espeak-ng -v nl -q --ipa=3 --sep=` output (requires `espeak-ng` in PATH or `ESPEAK_DATA_PATH` as in `tools/tts/README.md`), never overwrites an existing `ipa`; exported pure function `cleanEspeakIpa(raw: string): string` removes line breaks and the tie/zero-width characters espeak adds. `courseOverlap` also compares nl packs against Dutch weeks 1–4 chunks (`w.lang === 'nl'` weeks). `findVocabRepeats` is language-aware only through ids.

- [ ] **Step 1: Write failing tests**: valid Dutch pack passes with `minWords: 1`; each rule above has a test that mutates the fixture and expects the matching message (id `v-0001` in a nl pack, noun without article, future without marker, past without auxiliary, missing `en`, `grammar` not Farsi, two examples only); `cleanEspeakIpa('ˈɑf.spraːk\n')` → `'ˈɑfspraːk'`; `courseOverlap` flags a Dutch word whose form is in a week chunk; in `test/vocabtext.test.mjs`, `clozeOf('Ik bel hem morgen op.', ['bel … op'])` → `'Ik ____ morgen.'` is not wanted, so assert the actual current result (`'Ik ____.'` with the whole span blanked) and `clozeOf('Omdat ik hem opbel, ...', ['opbel'])` blanks only `opbel`, pinning that Dutch separable verbs need no code change.
- [ ] **Step 2: Run** `node --test test/vocab-schema.test.mjs test/vocab-ipa-nl.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** the validator branch, `tools/vocab-ipa-nl.mjs`, `validate.mjs` handling (pack number must equal file number as today).
- [ ] **Step 4: Starter pack.** Author 10 real words for `pack-04.json` (everyday: work, shops, health, housing, small talk; not in weeks 1–4 chunks — `node tools/validate.mjs` tells you). Format per spec §6. Run `node tools/vocab-ipa-nl.mjs` and hand-check each IPA against the word and its `stress` respelling. Run `node tools/validate.mjs`. Expected: `✓ vocab/pack-04.json` and everything else green.
- [ ] **Step 5: Run** `node --test`. Expected: all pass.
- [ ] **Step 6: Commit** `feat: Dutch word pack format, validator, espeak IPA tool, starter pack of 10`.

### Task 5: The Woorden tab

**Files:**
- Modify: `index.html` (nav link), `js/app.js` (routes, tab highlight), `js/ui/words.js`, `js/ui/cards.js`, `js/ui/settings.js`, `js/ui/progress.js`, `sw.js` (pack-04 in SHELL), `css/app.css`, `tools/smoke.mjs`
- Test: `tools/smoke.mjs`, `test/sw.test.mjs` (SHELL lists pack-04), `test/learned-ui.test.mjs`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: `js/ui/words.js` exports `render(ctx, root)` (English, unchanged route `#/words`), `renderNl(ctx, root)` (`#/woorden`), `renderList(ctx, root)` / `renderListNl(ctx, root)` (`#/woorden/list`). Both share one internal `renderFor(lang)`; the Dutch one has no section switcher (section `nl-everyday`), uses `perDayOf`, `ensureBatch(..., 'nl-everyday')`, and the stage line/bar and quick check from Task 2 for `lang 'nl'`. `wordPage(ctx, w, opts)` reads `w.lang ?? 'en'`: audio, Say-it and the language label ("American English" / "Standaardnederlands") follow it; shows `w.en` as an English gloss line when present; cloze label on Dutch cards "Say the Dutch word". Nav gets a fifth link `Woorden` (`data-tab="woorden"`).

- [ ] **Step 1: Write failing tests**: a SHELL test line for `content/vocab/pack-04.json`; smoke expectations (Step 5) written first.
- [ ] **Step 2: Run** `node --test test/sw.test.mjs`. Expected: FAIL (pack-04 not in SHELL).
- [ ] **Step 3: Implement** the routes and nav (the tab highlight logic at `app.js` ~line 130 must light `woorden` for `woorden/list` the same way `words` is handled), the language-aware `words.js`, `cards.js` (labels from `view.lang`, Dutch new-card label "New · Dutch word"), Settings row "Dutch words per day" (`vocabPerDayNl`), Progress block for 🇧🇪, SHELL entry. When `ctx.voices.nl` is missing show the same warning as English with Dutch wording.
- [ ] **Step 4: Run** `node --test`. Expected: all pass.
- [ ] **Step 5: Smoke** additions: open `#/woorden`; sort screen lists Dutch words with article; tick one, Done → teach page shows a Dutch word, IPA, `Standaardnederlands`, three tense tags with Farsi grammar, and 🔊 requests a clip path under `/audio/nl/`; Cards tab shows the Dutch cloze review with the Dutch label; Progress shows the 🇧🇪 block; English tab still works. Run `node tools/smoke.mjs`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: Woorden tab for everyday Dutch words, with tracking, settings and cards`.

### Task 6: Dutch packs 4 and 5 (150 words)

**Files:**
- Modify: `content/vocab/pack-04.json` (to 75 words), `tools/vocab-schema.mjs` (`MIN_PACK_WORDS_NL = 75`)
- Create: `content/vocab/pack-05.json` (75 words), `sw.js` (pack-05 in SHELL), `content/vocab/README.md` (Dutch section), `THIRD_PARTY_NOTICES.md` (espeak-ng credit line for IPA, frequency list credit if one is used)

**Interfaces:** consumes the Task 4 validator and IPA tool. Produces `d-0001…d-0150`.

- [ ] **Step 1: Raise** `MIN_PACK_WORDS_NL` to 75 and update the validator test; run `node --test test/vocab-schema.test.mjs`. Expected: FAIL for the 10-word pack in `node tools/validate.mjs` (red).
- [ ] **Step 2: Choose the words.** About 150 everyday words for work, shops, health, housing, travel, bureaucracy and small talk, mix of nouns (about 55 %), verbs (about 30 %, incl. separable verbs and verbs with *zijn*), adjectives and adverbs. Check a candidate list against an open frequency list for spoken Dutch (record which one and its licence in `THIRD_PARTY_NOTICES.md`; if no list with a confirmed licence is used, say "own selection"). Exclude anything `node tools/validate.mjs` reports as already taught.
- [ ] **Step 3: Author in batches of 25** (json written to the scratchpad, merged into the pack): fields per spec §6; Farsi `fa.meaning` and `note` (include *de/het* tip for nouns, Belgian/Netherlands note where it applies); `morph` per word type (spec §6); three tense sentences with natural spoken Dutch and Farsi `fa` + `grammar`; Belgian forms tagged in `register`. After each batch: `node tools/vocab-ipa-nl.mjs`, hand-check IPA and `stress`, `node tools/validate.mjs`. Expected after the last batch: `✓ vocab/pack-04.json`, `✓ vocab/pack-05.json`, all green.
- [ ] **Step 4: Self-check pass** with a script over both packs: every example contains its word, no duplicate sentences, article matches *de/het* of the headword in all sentences, 50 random sentences re-read for naturalness and Flemish-acceptability; list findings and fixes in the commit body. (If the execution method allows a fresh reviewer, give them both packs and the spec §2 anti-goals.)
- [ ] **Step 5: Run** `node --test` and `node tools/smoke.mjs`. Expected: pass.
- [ ] **Step 6: Commit** `content: Dutch packs 4 and 5 (150 everyday words, format 2)`.

### Task 7: Recorded voices for the Dutch words, docs, push

**Files:**
- Modify: `audio/manifest.json` and new `audio/nl/{nathalie,ronnie}/*.mp3` (generated), `README.md`, `docs/superpowers/specs/2026-10-16-dutch-words-and-tracking-design.md` (status: implemented), memory note
- Tools used (no change expected): `tools/tts/collect.mjs`, `generate.py`, `manifest.mjs`, `check.py`

- [ ] **Step 1:** `node tools/tts/collect.mjs` and confirm the new Dutch words (with article) and all 450 example sentences appear in `texts.json` (the collector already reads every `pack-NN.json`; if it assumes English for vocab words, make it use `pack.lang`). Add a test in `test/clips.test.mjs` that a nl pack word maps to a `nl` text key.
- [ ] **Step 2:** Generate only the missing clips for both Dutch voices (activate `.venv-piper`, env vars as in `tools/tts/README.md`); `node tools/tts/manifest.mjs`; `python tools/tts/check.py` and review anything flagged.
- [ ] **Step 3:** `node --test`, `node tools/validate.mjs`, `node tools/smoke.mjs`. Expected: all green, smoke's clip request for a Dutch word returns an `/audio/nl/` path that exists.
- [ ] **Step 4:** Update README (Woorden tab, tracking), spec status, memory note. Commit `feat: recorded voices for the Dutch words; docs`.
- [ ] **Step 5 (only with the learner's yes):** `git push origin main`; then verify live: manifest has the new keys, a new clip returns `audio/mp3` and Range gives 206, `#/woorden` loads (smoke against the live URL if the script supports it).

## Handoff and execution

Tasks 1–2 are the learner's first visible win (tracking on the English tab); Tasks 3–5 add the Woorden tab with ten words; Task 6 is the bulk of the authoring; Task 7 adds voices. Each is shippable alone.

Self-review done: every spec section maps to a task (§5 tracking → 1–2, §6 format → 4, §7 screens → 5, §8 voices → 7, §9 migration → 1 and 3, §10 tests in each task, §11 order kept; the spec's Dutch-cloze extension is not needed because the existing `…` form syntax already blanks separable verbs, and Task 4 pins that with a test). Spec §9 calls the setting `vocabPerDayNl`; this plan matches.
