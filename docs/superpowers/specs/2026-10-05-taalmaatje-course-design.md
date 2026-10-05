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

## 2. Learner profile

| | |
|---|---|
| Mother tongue | Farsi (Persian) |
| Location | Hasselt, Belgium (Limburg) |
| Context | University student; works in a Dutch-speaking environment |
| Dutch level | About **A2** (CVO course *Zo Gezegd* 2.1 → 2.2) |
| English level | About **B1+/B2** (studied collocations, conditionals, reported speech, embedded questions, idioms) |
| Time | **30–45 min per day**, weekdays |
| Main problem | Low confidence when speaking, in both languages |

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
- No automatic pronunciation scoring. Speech recognition only shows what it heard.
- No exam-preparation content.
- No copying of CVO course documents or other copyrighted course material.

## 4. Course structure

### 4.1 One session (35–40 min)

A session is one "day". The course moves forward **by completed session, not by calendar date**. Missing a day never puts the learner behind.

| # | Block | Min | Content |
|---|---|---|---|
| 1 | 🇧🇪 Cards | 5 | FSRS review + new chunks of this week |
| 2 | 🇧🇪 Listen & shadow | 8 | Dialogue line by line: listen → repeat → record → compare |
| 3 | 🇧🇪 Speak | 7 | Prompt + sentence frames, 60–90 s answer, speech recognition transcript, model answer |
| 4 | 🇧🇪 Grammar | 5 | One spoken pattern per week, 3–4 new items per session (sessions 1–4); mixed review in session 5 |
| 5 | 🇬🇧 Phrases + speak | 12 | 3 new academic phrases + one 60–90 s speaking task + pronunciation focus |

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

### 4.4 Farsi-speaker focus

Pronunciation and grammar points are chosen for a Farsi speaker:

- **Dutch:** vowels *ui*, *eu*, *ij/ei*, *uu / u / oe*, long vs. short vowels; the Dutch *w* (not Farsi و = v); de/het (Farsi has no articles or gender). Strength to use: Farsi خ / غ ≈ Dutch *g/ch*. Strength to use: Farsi verb-final order ≈ Dutch subordinate clauses.
- **English:** *he/she* confusion (Farsi «او» is one pronoun), articles *a/the*, *th* sounds, *w/v*, vowel length (*ship/sheep*), extra vowel before *s* + consonant ("e-school", "e-student").

One pronunciation focus per week, in both languages (a pair list for listen-and-repeat).

### 4.5 Farsi hints

- Short Farsi notes on: grammar explanations, false friends, chunks whose meaning is not literal.
- Not every card has a hint. Hints are written only where they help.
- Shown under the English gloss, right-to-left, smaller text. Setting **Farsi hints: on/off** (default on).

### 4.6 Limburg ear (session 5 of every Dutch week)

- 6–10 sentences per week, each shown as **standard Belgian Dutch ↔ everyday Flemish/Limburg form** with a short note.
- Examples of features: *ge/gij/u* (you), *efkes* (even), *goesting* (zin), *amai*, *allee*, *seffens* (straks), dropped final *-n* and *-t* (*da*, *nie*, *wa*), *-ke* diminutives, *salukes* (Limburg goodbye), soft *g*.
- The learner **understands** these forms but **practises speaking** standard Belgian Dutch.
- Every form is checked against a web source before it goes into the content. Uncertain forms are left out.

### 4.7 Weekly role-play and mission

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
| Cards | FSRS review (Again / Hard / Good / Easy), 🔊 audio, de/het colour, Farsi hint |
| Shadow | One line at a time: 🔊 listen (normal / slow) → 🎙 record → ⇄ play original then own recording |
| Speak | Prompt, sentence frames, timer, record, speech-recognition transcript, model answer |
| Grammar | Short explanation (+ Farsi hint), then spoken items: see prompt → say answer → reveal |
| Role-play | Shows the prompt; **Copy** button |
| Limburg ear | Pairs: standard ↔ everyday form, 🔊 for the standard form, note |
| Progress | Sessions done, chunks known, speaking diary (play any week's recording) |
| Settings | Farsi hints, voice choice (nl / en), extra words per session, export / import, reset |

### 5.3 Code units

| File | One job | Depends on |
|---|---|---|
| `content/nl/week-NN.json`, `content/en/week-NN.json`, `content/words.json` | Course data only | — |
| `js/content.js` | Load and cache content files | fetch |
| `js/session.js` | Build a session from (week, session) + content; advance position | content.js |
| `js/srs.js` | Wrap ts-fsrs: new card, review, due list | vendor/ts-fsrs |
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
  "pronunciation": { "focus": "ui", "pairs": [["huis", "hoes"], ["buit", "boot"]] },
  "chunks": [
    { "id": "nl-01-001", "text": "Kan je dat efkes herhalen?", "en": "Can you repeat that for a moment?",
      "fa": "…", "register": "informal", "article": null }
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

**Minimum per Dutch week:** 25 chunks, 2 dialogues (8–12 lines each), 5 speaking prompts, 15 grammar items, 6 Limburg pairs, 1 role-play, 1 mission, 6 pronunciation pairs.
**Minimum per English week:** 15 chunks, 5 speaking prompts, 1 role-play, 6 pronunciation pairs.

`fa` and `register` are optional. `article` is required (`"de"`, `"het"` or `null`) on Dutch chunks.

### 5.5 Stored data (on the device only)

- `localStorage["taalmaatje.v1"]`: `{ position: {week, session}, history: [{date, week, session}], settings: {farsi, voiceNl, voiceEn, extraWords}, cards: {id: fsrsState}, missions: {week: "done"|"notyet"} }`
- IndexedDB `taalmaatje` / store `diary`: `{ id: "nl-01" | "en-01", date, blob }`
- **Export:** one JSON file with the localStorage object + diary recordings as base64. **Import:** replaces current data after a confirm.

### 5.6 When something is not available

| Situation | Behaviour |
|---|---|
| No Dutch voice installed | Banner with steps to add the voice "Ellen (nl-BE)" on iPhone / Mac; text still shown |
| Only nl-NL voice | Use it; small note that the accent is Dutch, not Flemish |
| Microphone refused | Record buttons hidden; tasks still usable without recording |
| No speech recognition (e.g. Firefox) | Transcript step hidden |
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
- `node --test`: unit tests for `session.js` (session building, advance from session 5 to next week, end of course), `srs.js` (new card → review → due date moves), `store.js` (export → import gives the same data).
- Manual check in a desktop browser through a local server (all screens, keyboard use, phone width).
- **Learner check on iPhone:** Ellen voice, microphone, recording playback, install to home screen.

## 9. Milestones

1. **App shell + Week 1** (Dutch and English) working from start to end, deployed, so the learner can start.
2. **Weeks 2–4** + Limburg ear content checked against sources.
3. **Weeks 5–12** + speaking diary on the Progress screen.

Each milestone ends with validator + tests passing and a deploy.

## 10. Decisions log

| Date | Decision |
|---|---|
| 2026-10-05 | Approach A: static PWA, forked from woorden, role-play through an external voice assistant |
| 2026-10-05 | Farsi hints added (on by default, can be switched off) |
| 2026-10-05 | Code in `Momi1370/Language-Learning`; repo made public; hosted on GitHub Pages |
