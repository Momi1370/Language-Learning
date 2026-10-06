# Taalmaatje — Dutch + English Speaking Course (Design Spec)

- **Date:** 2026-10-05
- **Status:** Draft, waiting for learner review
- **Repo:** `Momi1370/Language-Learning`

## 1. Goal

A daily, self-paced course in a web app that makes the learner **confident when speaking**:

- **Dutch (main focus):** speaking at work and in daily life in Hasselt (Belgian Limburg).
- **English (second focus):** speaking at university.

**Success after 12 weeks (60 sessions = 12 weeks × 5):**

1. The learner can follow a Dutch work meeting and ask for clarification without switching to English.
2. The learner can talk for 2 minutes about their job in Dutch, and for 3 minutes present a topic in English.
3. The learner understands common Flemish/Limburg everyday speech (tussentaal) from colleagues.
4. The learner can hear their own progress: the week-1 recording next to the week-12 recording.
5. The learner worries less about pronunciation: they know which sounds matter most, can hear the difference in each week's sound pair, and can say each week's chunks so that speech recognition understands them within 3 tries.

## 2. Learner profile

| | |
|---|---|
| Mother tongue | Farsi (Persian) |
| Location | Hasselt, Belgium (Limburg) |
| Context | University student; works in a Dutch-speaking environment |
| Dutch level | About **A2** (CVO course *Zo Gezegd* 2.1 → 2.2). Course Dutch is written at **A2+** (week 1 at A2 felt too easy, 2026-10-06) |
| English level | About **B1+/B2** (studied collocations, conditionals, reported speech, embedded questions, idioms) |
| Time | **30–45 min per day**, weekdays |
| Current Dutch input | Duolingo Dutch, 415-day streak (Netherlands Dutch; mostly reading, tapping and recognition) |
| Current English input | Many films; PS5 games with subtitles; university course materials (all in English) |
| Main problem | Low confidence when speaking, in both languages. Input is already high; **output (speaking) is the gap**. A big cause: **worry about whether pronunciation is correct**, in both languages |

Goals chosen by the learner: Dutch at work, Dutch in daily life, English for university.
**Not** a goal: exam preparation (CVO tests, ITNA, Staatsexamen).

## 3. Scope

**In scope**

- A 12-week course (Dutch + English) delivered by a static web app (PWA).
- Listening, shadowing, speaking, flashcards (spaced repetition), one grammar pattern per week.
- Flemish voice (nl-BE) for Dutch audio; a "Limburg ear" listening module.
- Optional Farsi hints (on by default, can be switched off).
- Role-play prompts for an external voice assistant (Claude voice mode or similar).
- A speaking diary: one saved recording per week.

**Out of scope (YAGNI)**

- No server, no user accounts, no sync between devices (export/import file instead).
- No AI built into the app. Free conversation happens in Claude voice mode via copied prompts.
- No phoneme-level pronunciation scoring in v1. Speech recognition is used only as an honest "was it understood?" check (§4.4). Optional Azure pronunciation scoring (Netherlands Dutch and English only; not Belgian Dutch) is decided after the learner has used Week 1.
- No exam-preparation content.
- No copying of CVO course documents or other copyrighted course material.

## 4. Course structure

### 4.1 One session (35–40 min)

A session is one "day". The course moves forward **by completed session, not by calendar date**. Missing a day never puts the learner behind.

| # | Block | Min | Content |
|---|---|---|---|
| 1 | 🇧🇪 Cards | 5 | FSRS review + new chunks of this week |
| 2 | 🇧🇪 Sound of the week | 3 | Ear quiz in several voices + say the week's sound pairs with the 🎯 check (§4.4) |
| 3 | 🇧🇪 Listen & shadow | 6 | Dialogue line by line: listen → repeat → record → compare |
| 4 | 🇧🇪 Speak | 7 | Prompt + sentence frames, 60–90 s answer, "what it heard" transcript, model answer |
| 5 | 🇧🇪 Grammar | 4 | One spoken pattern per week, 3–4 new items per session (sessions 1–4); mixed review in session 5 |
| 6 | 🇬🇧 English | 12 | English sound of the week (2) + 3 new academic phrases (3) + one 60–90 s speaking task (7) |

### 4.2 Session plan inside one week (5 sessions)

| Session | Dutch | English |
|---|---|---|
| 1 | Dialogue A (first half), speak prompt 1, grammar intro + items. **Mission of the week** shown. | Phrases 1–3, speak 1 |
| 2 | Dialogue A (full), speak prompt 2, grammar items | Phrases 4–6, speak 2 |
| 3 | Dialogue B (first half), speak prompt 3, grammar items | Phrases 7–9, speak 3 |
| 4 | Dialogue B (full), speak prompt 4, grammar items | Phrases 10–12, speak 4 |
| 5 | Cards, **Limburg ear** (replaces shadowing), **diary recording** of speak prompt 5 (replaces speak), grammar review of the week, role-play card, mission check | Phrases 13–15, speak 5 (diary recording) + role-play card |

Flashcards run in every session. New cards per session: about 5 Dutch chunks, 3 English phrases. The extra woorden deck adds 0 new words per session by default (setting).

### 4.3 Twelve weekly themes

| Week | 🇧🇪 Dutch (work + daily life) | Grammar pattern | 🇬🇧 English (university) |
|---|---|---|---|
| 1 | Introducing yourself at work, small talk | Word order: verb in 2nd place | Introducing yourself and your field |
| 2 | Following meetings, asking to repeat/clarify | Questions (inversion, question words) | Asking questions in class (embedded questions) |
| 3 | Phone and Teams calls, making appointments | Modal verbs (kunnen, moeten, willen, mogen) | Seminar: agreeing, disagreeing, building on others |
| 4 | Lunch talk + Limburg everyday speech; weather and opinion | *omdat* / *want* (verb at the end vs. not) | Opinion + reasons (topic sentence, support) |
| 5 | Explaining tasks and problems | Perfectum (hebben/zijn + participle) | Group work, dividing tasks, deadlines |
| 6 | Doctor, pharmacy, calling in sick | *als*-sentences (condition, verb at the end) | Presentations: signposting |
| 7 | Gemeente, bank, letters, administration | Separable verbs (opbellen, invullen) | Handling Q&A after a presentation |
| 8 | Giving opinions, discussing at work | *dat*-sentences (ik denk dat…, volgens mij…) | Describing data and graphs |
| 9 | Shops, neighbours, living in Hasselt | Adjective *-e* (de/het, een) | Office hours and talking to professors |
| 10 | Feedback, apologising, being late | Reasons and excuses (omdat, daarom, toch) | Paraphrasing and summarising |
| 11 | Telling what happened | Imperfectum (was, had, ging…) | Hedging, being critical politely |
| 12 | Review + 2-minute talk about your job | Mixed review | Final 3-minute presentation |

Weeks 4, 6, 9 and 10 repeat CVO class topics (weather/opinion, health complaints, adjective *-e*, excuses) with **new, self-written** exercises.

### 4.4 Pronunciation confidence

#### 4.4.1 Farsi-speaker focus

Pronunciation and grammar points are chosen for a Farsi speaker:

- **Dutch:** vowels *ui*, *eu*, *ij/ei*, *uu / u / oe*, long vs. short vowels; the Dutch *w* (not Farsi و = v); de/het (Farsi has no articles or gender). Strength to use: Farsi خ / غ ≈ Dutch *g/ch*. Strength to use: Farsi verb-final order ≈ Dutch subordinate clauses.
- **English:** *he/she* confusion (Farsi «او» is one pronoun), articles *a/the*, *th* sounds, *w/v*, vowel length (*ship/sheep*), extra vowel before *s* + consonant ("e-school", "e-student").

One **sound of the week** per language (§4.4.3).

#### 4.4.2 Honest principles

- The goal is **being understood easily**, not sounding native. Colleagues in Hasselt hear many accents every day.
- Sounds are ordered by **how often they cause misunderstanding** (functional load), then by difficulty for a Farsi speaker. Low-impact sounds (English *th*) come late on purpose.
- Speech recognition is a rough stand-in for a listener. The app always calls it a **"was it understood?" check, never a score**. It can accept a wrong sound when the word is still clear, and it can fail because of noise.
- Voice assistants (role-play) mostly hear text, so role-play prompts tell them **not** to judge pronunciation unless a word was not understood.

#### 4.4.3 Features

| Feature | Where | Behaviour |
|---|---|---|
| **Tap a word** | Every Dutch/English text shown in the app | Tap a word → hear it alone at slow speed (rate 0.7). 🔊 plays the whole sentence; 🐢 plays it slowly |
| **🎯 Say-it check** | Cards, shadow lines, grammar answers, sound pairs, new English phrases | Learner says the text; recognised words turn **green**, others **orange**. After 3 tries with orange words, each orange word gets a 🔊 button. Hidden when speech recognition is not available |
| **Sound of the week** | Its own block (Dutch); first part of the English block | Session 1: short explanation with a Farsi anchor sound and Farsi hint. Every session: **ear quiz** — 8 rounds; the app says one word of a pair in a random installed voice of that language; learner taps which word they heard; ✓/✗ + replay both. Then say that session's pairs with the 🎯 check. Ear-quiz results are kept per sound |
| **Stress marks** | Chunks with tricky words | Optional `stress` list, e.g. `de-VEL-op-ment`, `pre-sen-TA-tie`. Farsi note: Farsi puts stress near the end of words, so check English words especially |

#### 4.4.4 Sound order

| Week | 🇧🇪 Dutch sound | Farsi anchor | 🇬🇧 English sound |
|---|---|---|---|
| 1 | *a* / *aa* (man – maan) | length is the key: *aa* long, *a* short and quick | /ɪ/ – /iː/ (ship – sheep); «ای» is the long one |
| 2 | *ui* vs *oe* (huis – hoes) | *oe* = «او»; *ui* has no Farsi sound | Initial *s* + consonant (school, study) — no «اِ» before |
| 3 | *uu* vs *oe* (muur – moer) | *oe* = «او»; *uu* = say «ای» with round lips | /w/ – /v/ (west – vest) |
| 4 | *eu* vs *oo* (deur – door) | — | /æ/ – /e/ (bad – bed) |
| 5 | *ij/ei* vs *ee* (mijn – meen) | *ij* ≈ «ِی» in «کِی» | -ed endings (worked, played, wanted) |
| 6 | *g/ch* vs *k* (geel – keel) | *g* = «غ/خ» — a strength | /ʌ/ – /æ/ (cut – cat) |
| 7 | *w* vs *v* vs *f* (wat – vat, wijn – fijn) | Dutch *w* is softer than «و» | /ʊ/ – /uː/ (full – fool) |
| 8 | *i* / *e* / *ee* (pit – pet – peet) | — | /ɜː/ – /ɔː/ (work – walk) |
| 9 | *o* / *oo* (pot – poot) | — | Weak forms (to, for, can) |
| 10 | Clusters: *sch-*, *st-*, *spr-* (no «اِ» before) | Farsi adds «اِ» before *s* + consonant | Noun/verb stress (PREsent – preSENT) |
| 11 | *ou/au* vs *oe* (zout – zoet) | *ou* ≈ «اُو» in «نو» | /θ/ – /s/ (think – sink) |
| 12 | Review of all sounds | — | Review of all sounds |

Every pair used in an ear quiz must be two **different spellings**, so text-to-speech says them differently. Stress (same spelling) is practised with stress marks, not in the ear quiz.

### 4.5 Farsi hints

- Short Farsi notes on: grammar explanations, false friends, chunks whose meaning is not literal.
- Not every card has a hint. Hints are written only where they help.
- Shown under the English gloss, right-to-left, smaller text. Setting **Farsi hints: on/off** (default on).

### 4.6 Limburg ear (session 5 of every Dutch week)

- 6–10 sentences per week, each shown as **standard Belgian Dutch ↔ everyday Flemish/Limburg form** with a short note.
- Examples of features (checked against vlaanderen.be *Tussentaal – kenmerken* and Goesting in Taal *informele spreektaal in Limburg*): *ge/gij* (*'Ebde (gij) tijd?*), dropped final *-t* (*da*, *nie*, *wa*), dropped *h*, *ne/nen* articles, *-ke* diminutives, *allee*, *amai*, *awel*, *goesting* (zin), Limburg *sjiek* (mooi/cool), *Waggeffe* (wacht even), *Enne?*, *Wa zijt ge bezig?*. Forms without a source (for example *efkes*, *seffens*, *salukes*) stay out until a source is found.
- The learner **understands** these forms but **practises speaking** standard Belgian Dutch.
- Every form is checked against a web source before it goes into the content. Uncertain forms are left out.

### 4.7 Working with existing input (Duolingo, films, games, course materials)

- **Duolingo stays.** It is outside the 30–45 min budget and is not replaced. Taalmaatje does not repeat what Duolingo does (single words, tapping): it trains **speaking with whole chunks**.
- **Belgian vs. Netherlands Dutch.** Duolingo teaches Netherlands Dutch. The Limburg ear block also shows Belgian alternatives for common Netherlands forms the learner already knows (for example *mobieltje → gsm*, *doei → salut / dag*, *jij (informal) → ge/gij* in speech, polite *u* used more often in Flanders). Each form is checked against a source (§4.6 rule).
- **My phrases.** In the Cards screen the learner can add their own cards (Dutch or English): a line from a film or game, a term from a course, a sentence a colleague said. They are reviewed with FSRS like the course cards, and kept in export / import.
- **"Explain your course" (English).** Speak prompt 5 of every English week (the diary recording) asks the learner to explain, in 90 s, one idea from their own university course of that week. Frames give the structure (*"The main idea is… / For example… / This matters because…"*). The model answer explains a general idea with the same frames, as an example.

### 4.8 Weekly role-play and mission

- **Role-play card:** a ready prompt the learner copies into Claude voice mode (or another voice assistant). It sets the role (for example a Limburg colleague in a team meeting), the learner's level, the target chunks, and the rule "do not correct me during the talk; give me 3 corrections at the end".
- **Mission:** one real action at work or in town (for example "ask a colleague about their weekend at lunch"). Shown in session 1, ticked in session 5 (done / not yet). There is no penalty for "not yet".

## 5. App design

### 5.1 Base and stack

- **Fork of [iamsergeyka/woorden](https://github.com/iamsergeyka/woorden)** (MIT). Kept from woorden: its 1,946-word list (`[nl, article, ru, en, pos, example]`; Russian column dropped), its Dutch voice selection logic, de/het colour coding, PWA meta tags. The UI is rewritten.
- Plain HTML, CSS and ES modules. **No build step, no framework.**
- **[ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)** (MIT) for spaced repetition, a copy kept in `vendor/` so the app works offline.
- Service worker + web manifest: installable on iPhone/Android/Mac, works offline after the first visit.

### 5.2 Screens

| Screen | Purpose |
|---|---|
| Today | The session's 5 blocks with ticks; "Week N · Session M"; streak |
| Cards | New card: text + meaning + audio + 🎯, then "Got it". Review: meaning shown → learner says the Dutch/English → reveal + audio + 🎯 → Again / Hard / Good / Easy. de/het colour, stress marks, Farsi hint; **＋ Add my phrase** (text, meaning, language, optional note) |
| Sound | Sound of the week: explanation (session 1 or on request), ear quiz, say the pairs |
| Shadow | One line at a time: 🔊 listen (normal / slow) → 🎙 record → ⇄ play original then own recording |
| Speak | Prompt, sentence frames, timer, record, speech-recognition transcript, model answer |
| Grammar | Short explanation (+ Farsi hint), then spoken items: see prompt → say answer → reveal |
| Role-play | Shows the prompt; **Copy** button |
| Limburg ear | Pairs: standard ↔ everyday form, 🔊 for the standard form, note |
| Progress | Sessions done, chunks known, ear-quiz results per sound, speaking diary (play any week's recording) |
| Settings | Farsi hints, voice choice (nl / en), extra words per session, export / import, reset |

### 5.3 Code units

| File | One job | Depends on |
|---|---|---|
| `content/nl/week-NN.json`, `content/en/week-NN.json`, `content/words.json` | Course data only | — |
| `js/content.js` | Load and cache content files | fetch |
| `js/session.js` | Build a session from (week, session) + content; advance position | content.js |
| `js/srs.js` | Wrap ts-fsrs: new card, review, due check | vendor/ts-fsrs |
| `js/match.js` | Compare recognised text with the target, word by word | — |
| `js/speech.js` | TTS (voice choice), recording (MediaRecorder), speech recognition | browser APIs |
| `js/store.js` | Progress in localStorage; diary in IndexedDB; export / import | browser APIs |
| `js/ui/*.js` | One file per screen | the modules above |
| `tools/validate.mjs` | Check all content files against the schema (§5.4) | Node |

### 5.4 Content schema (one Dutch week)

```json
{
  "lang": "nl",
  "week": 1,
  "theme": "Mezelf voorstellen op het werk",
  "themeEn": "Introducing yourself at work",
  "sound": { "id": "nl-a-aa", "title": "a or aa?", "explain": "…", "anchor": "…", "fa": "…",
             "pairs": [["man", "maan"], ["tak", "taak"]] },
  "chunks": [
    { "id": "nl-01-001", "text": "Kan je dat efkes herhalen?", "en": "Can you repeat that for a moment?",
      "fa": "…", "register": "informal", "article": null, "stress": ["her-HA-len"] }
  ],
  "dialogues": [
    { "id": "nl-01-dA", "title": "Eerste dag", "lines": [ { "speaker": "Collega", "text": "…", "en": "…" } ] }
  ],
  "speaking": [
    { "id": "nl-01-s1", "prompt": "…", "frames": ["Ik heet …", "Ik werk hier sinds …"], "model": "…", "seconds": 90 }
  ],
  "grammar": { "id": "v2", "title": "…", "explain": "…", "fa": "…",
               "items": [ { "prompt": "Vandaag … (ik / thuis werken)", "answer": "Vandaag werk ik thuis." } ] },
  "limburg": [ { "standard": "Heb je zin?", "everyday": "Hebde goesting?", "note": "…" } ],
  "roleplay": { "title": "…", "prompt": "…" },
  "mission": "…"
}
```

English weeks use the same shape, with `"lang": "en"`, phrases in `chunks`, no `article`, and no `limburg`.

**Minimum per Dutch week:** 25 chunks, 2 dialogues (8–12 lines each), 5 speaking prompts, 15 grammar items, 6 Limburg pairs, 1 role-play, 1 mission, 6 sound pairs.
**Minimum per English week:** 15 chunks, 5 speaking prompts, 1 role-play, 1 mission, 6 sound pairs.

**Dutch level floor (A2+)**, checked by `checkLevel` in `tools/schema.mjs`: chunks at most 14 words and on average at least 6; at most 3 chunks of 1–2 words (nouns for de/het); at least 6 chunks that join two ideas (dus, maar, omdat, want, als, daarom, wanneer, terwijl, zodat, toen); dialogue lines on average at least 9 words; every speaking task 90 s with a model answer of at least 70 words; grammar answers on average at least 6 words. Dutch role-play prompts ask for A2+.

`fa`, `register` and `stress` are optional. `article` is required (`"de"`, `"het"` or `null`) on Dutch chunks.

### 5.5 Stored data (on the device only)

- `localStorage["taalmaatje.v1"]`: `{ position: {week, session}, history: [{date, week, session}], settings: {farsi, voiceNl, voiceEn, extraWords}, cards: {id: fsrsState}, myPhrases: [{id, lang, text, meaning, note, created}], ear: {soundId: {right, total}}, missions: {"nl-01": "done"|"notyet", "en-01": …}, extraFor: "week-session", finished: false }`
- IndexedDB `taalmaatje` / store `diary`: `{ id: "nl-01" | "en-01", date, blob }`
- **Export:** one JSON file with the localStorage object + diary recordings as base64. **Import:** replaces current data after a confirm.

### 5.6 When something is not available

| Situation | Behaviour |
|---|---|
| No Dutch voice installed | Banner with steps to add the voice "Ellen (nl-BE)" on iPhone / Mac; text still shown |
| Only nl-NL voice | Use it; small note that the accent is Dutch, not Flemish |
| Microphone refused | Record buttons hidden; tasks still usable without recording |
| No speech recognition (e.g. Firefox) | 🎯 check and "what it heard" hidden; everything else works |
| Only one voice for a language | Ear quiz uses that one voice; small note that more voices make the quiz better |
| Storage blocked / private mode | App works for the session; warning that progress will not be kept |
| Content file fails to load | Error message with a "try again" button; other screens keep working |

## 6. Content sources and licences

| Source | Used for | Licence |
|---|---|---|
| Self-written lessons | All weekly content | Repo licence (MIT, same as fork) |
| woorden word list | Extra deck | MIT (notice kept) |
| ts-fsrs | Scheduling | MIT (notice kept) |
| hermitdave/FrequencyWords (nl) | Checking which words to teach first; not copied into the app | Data CC-BY-SA 4.0 — used only as a reference |
| Web sources on Flemish / Limburg speech | Checking Limburg-ear forms; not copied | — |

Content rules: Belgian Standard Dutch for speaking practice; informal forms marked `register: "informal"`; no employer names or personal details; no text copied from CVO or *Zo Gezegd* materials. A native speaker (colleague or teacher) is asked to skim a few weeks.

## 7. Hosting and privacy

- Code lives in `Momi1370/Language-Learning`.
- The app is served as static files, so the phone can open it by URL and install it.
- Progress and recordings never leave the device.
- **Hosting:** the repo is made **public** and served with **GitHub Pages** from the `main` branch (decided by the learner on 2026-10-05). Visibility is switched at the first deploy (milestone 1).
- Because the repo is public, content must not contain names of employers, colleagues or other personal details.

## 8. Testing

- `node tools/validate.mjs`: every content file matches the schema and the minimums in §5.4; no duplicate ids; every Dutch chunk has `article`; every speaking prompt has a `model`.
- `node --test`: unit tests for `match.js` (exact match, missing word, punctuation and case, digits vs. number words, accents, best of several alternatives), `session.js` (session building, advance from session 5 to next week, end of course; my phrases due for review appear in the Cards block), `srs.js` (new card → review → due date moves), `store.js` (export → import gives the same data, including my phrases).
- Manual check in a desktop browser through a local server (all screens, keyboard use, phone width).
- **Learner check on iPhone:** Ellen voice, microphone, recording playback, install to home screen.

## 9. Milestones

1. **App shell + Week 1** (Dutch and English) working from start to end, deployed, so the learner can start.
2. **Week 1 Dutch rewritten at A2+**, then **weeks 2–4** + Limburg ear content checked against sources.
3. **Weeks 5–12.**

The speaking diary (saving + Progress screen) is part of milestone 1, so the week-1 recording is kept.

Each milestone ends with validator + tests passing and a deploy.

## 10. Decisions log

| Date | Decision |
|---|---|
| 2026-10-05 | Approach A: static PWA, forked from woorden, role-play through an external voice assistant |
| 2026-10-05 | Learner keeps Duolingo (415-day streak); added My phrases, "Explain your course" prompt, Belgian-vs-Netherlands forms in Limburg ear |
| 2026-10-05 | Pronunciation confidence added (§4.4): tap a word, 🎯 say-it check, sound of the week with ear quiz, stress marks; Azure scoring postponed |
| 2026-10-05 | Speaking diary saving moved into milestone 1, so the week-1 recording is kept |
| 2026-10-05 | Farsi hints added (on by default, can be switched off) |
| 2026-10-05 | Code in `Momi1370/Language-Learning`; repo made public; hosted on GitHub Pages |
| 2026-10-06 | iPhone Silent mode mutes the browser voice; Audio check tests 4–5 found no web workaround. Accepted: the learner turns Silent off while studying. Possible later fix: pre-made audio files from an open voice |
| 2026-10-06 | The learner found week 1 Dutch too easy: Dutch moves to A2+ (level floor in §5.4); week 1 Dutch is rewritten before weeks 2–4. English stays at B2 |
| 2026-10-06 | A Limburg pair must show two different forms; Belgian-vs-Netherlands words go in chunk notes, not identical pairs |
