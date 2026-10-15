# Taalmaatje — English Vocabulary (Words tab) Design Spec

- **Date:** 2026-10-16
- **Status:** Approved by the learner 2026-10-16; milestone 1 (engine + pack 1) implemented
- **Repo:** `Momi1370/Language-Learning`
- **Builds on:** `2026-10-05-taalmaatje-course-design.md` (same app, same card system)

## 1. Goal

A **Words** tab that grows the learner's everyday English vocabulary, a few words a day, on top of the daily session (not instead of it).

For every word the learner sees: its pronunciation, a Farsi meaning and usage note, and **at least two example sentences** in current spoken English, each with audio and a Farsi translation. Words the learner chooses to learn become spaced-repetition cards.

**Success:** after a month the learner has learned about 100 new useful words, can say each of them correctly, and can use them in a sentence, because the examples sound like what people say today.

## 2. Learner and constraints

| | |
|---|---|
| Learner | Farsi native, English about B1+/B2 (see spec 1, §2) |
| Wants | More vocabulary for everyday life, correct pronunciation, Farsi explanations, **modern** sentences |
| Time | Words are extra. Default 5 new words a day, about 5–10 minutes |
| Platforms | Same as the app: iPhone home-screen app (no speech recognition there), laptop browsers, offline after first visit |

## 3. Content sources and licences

The learner asked for words from an essential-vocabulary book. **No text, definition or example is copied from any published book**: their text is copyrighted and the repo is public. Instead:

| Source | Used for | Licence / duty |
|---|---|---|
| NGSL-Spoken 1.2 (Browne & Culligan), 721 words of everyday conversation | Choosing the words of pack 1 (word list only) | CC BY-SA 4.0. Credit the authors; the vocabulary data files (`content/vocab/`) are published under CC BY-SA 4.0 too. Code stays MIT |
| Core NGSL 1.2 (about 2,800 words) | Choosing words for later packs | The site says only "Word lists released under Creative Commons" without a version. **Confirm the exact licence before using it**; until then later packs use the rest of NGSL-Spoken and words I choose myself |
| CMU Pronouncing Dictionary (`cmudict.dict`) | IPA (American English) | "Unrestricted" use; they ask for credit. Credit in `THIRD_PARTY_NOTICES.md` |
| Everything else (sentences, Farsi, notes) | — | Self-written, in the repo licence for code and CC BY-SA 4.0 for `content/vocab/` |

Credit line: Browne, C., Culligan, B. (2013). *The New General Service List – Spoken.* newgeneralservicelist.com.

**Word choice for pack 1 (about 120 words):** from NGSL-Spoken, leaving out the most basic words (pronouns, articles, numbers, *be/have/do/go*, colours, days) and words already taught in the English course weeks. The aim is words a B1+/B2 learner has seen but cannot use yet (for example *figure out, deal with, available, honestly, reliable, struggle, afford, apparently*). If the learner already knows a word, **"I know it"** skips it.

## 4. Scope

**In scope**

- A **Words** tab in the bottom navigation, with a daily batch and a searchable list of all words.
- Content packs `content/vocab/pack-NN.json`, loaded like the weekly files (offline, listed in the service worker).
- Vocabulary cards in the existing spaced-repetition system, shown in the existing Cards block.
- Settings: new words per day (3 / 5 / 10, default 5).
- A line in Progress: words known / words learning.
- Validator, tests and a fresh-reviewer pass for every pack.

**Out of scope (YAGNI)**

- English definitions (the learner asked for Farsi explanations).
- British IPA (the open dictionary is American; the voice stays British, see §6).
- Speech-recognition scoring beyond the existing 🎯 check (hidden on iPhone home-screen apps).
- Themes, quizzes, idioms and phrasal-verb packs of their own.
- Sentences made at runtime by an AI.
- Importing the learner's own word lists (the existing "＋ Add my phrase" already covers single phrases).

## 5. Content format

`content/vocab/pack-01.json`:

```json
{
  "pack": 1,
  "source": "Word choice: NGSL-Spoken 1.2 (Browne & Culligan, CC BY-SA 4.0). IPA: CMU Pronouncing Dictionary.",
  "words": [
    {
      "id": "v-0001",
      "word": "figure out",
      "pos": "phrasal verb",
      "forms": ["figure out", "figures out", "figured out", "figuring out"],
      "ipa": "ˈfɪɡjɚ ˈaʊt",
      "stress": ["FIG-ure OUT"],
      "fa": {
        "meaning": "…",
        "note": "…"
      },
      "examples": [
        { "text": "I still can't figure out why the app keeps crashing.", "fa": "…" },
        { "text": "Let's figure out who's paying before we order.", "fa": "…" }
      ],
      "register": "neutral"
    }
  ]
}
```

- `id`: `v-0001…`, unique across all packs; never reused for a different word (card progress is stored by id).
- `forms`: every spelling of the word that may appear in an example. Each example must contain one of them.
- `ipa`: **never typed by hand.** `tools/vocab-ipa.mjs` takes it from `cmudict.dict` (downloaded when authoring, not stored in the repo). A word missing from the dictionary is replaced by another word.
- `stress`: respelling with the stressed syllable in capitals, written by hand and checked against the IPA (§8).
- `fa.meaning`: the Farsi meaning (short). `fa.note`: when to use it, what it sounds like in speech, and traps for Farsi speakers (for example *he/she*, articles, words that look like Farsi ones).
- `examples`: **2 to 3**, each with `text` and a Farsi translation `fa`.
- `register`: optional (`informal`, `neutral`, `formal`).

### Example sentences must be today's spoken English

- 5–16 words, with contractions where people use them (*can't, let's, I'd*).
- Everyday situations of today: work and meetings, uni, shopping and delivery, messaging and apps, travel, health, home.
- No old-fashioned or stiff forms: *whom, shall* (as in *I shall go*), *ought to, whilst, upon, thus, I dare say, perchance, one must*. A test rejects these words.
- Names and settings are made up; no employer names or personal details (the repo is public).

## 6. The Words tab

**Navigation:** a fourth tab "Words" (`#/words`), next to Today, Progress, Settings. A list route `#/words/list`.

**Today's batch (`#/words`):**
1. The next N words (N = setting) that are not known and not yet cards, in pack order. The batch for a calendar day is stored, so reopening the tab shows the same words.
2. For each word, a **word page**: the word, part of speech, 🔊 (plays the word), IPA, stress, the Farsi meaning and note (hidden when "Farsi hints" is off), and the examples. Every English text uses the existing tap-a-word, 🔊 and 🐢 widgets. The first example also has the 🎯 Say it check when speech recognition works.
3. Two buttons: **I know it** (saved as known, no card) and **Teach me** (a card is created). Both move to the next word.
4. When the batch is done: "Today's words are finished ✓", with a link to the list.
5. When no words are left: "More words are coming soon."

**List (`#/words/list`):** all words in all packs with a search box (matches the word or its Farsi meaning), a status mark (new / known / learning) and the word page when tapped. A known word has a **Teach me** button there. A learning word has no triage buttons.

**Pronunciation and the British voice:** the English voice in the app is British (Daniel, en-GB) and the IPA is American. The word page says "IPA: American English". The `stress` check (§8) makes sure the stressed syllable is the same in both; vowel and *r* differences are not hidden from the learner.

### Cards

- A vocabulary card has the id `v-NNNN`. `cardView()` gets a `vocabIndex` source and returns `{kind: 'vocab', lang: 'en', text: word, meaning: <Farsi meaning>, stress, fa, note}`.
- **New card (first time in Cards):** same as other English cards: word, 🔊, IPA, examples, "Got it".
- **Review card:** shows the Farsi meaning and the **first example with the word replaced by "____"**. The learner says the word, taps Show, sees the word, IPA, 🔊 and examples, then grades Again / Hard / Good / Easy.
- **Review cap:** at most 10 vocabulary **reviews** (cards the learner has seen before) are shown per session and day (key `week-session-date`), the ones that have waited longest; the rest stay due. **A word's first appearance, and its repeats in the same visit, are never capped or counted**, so new words always show up (otherwise 5 new words a day would use all 10 slots). The cap is a constant (`VOCAB_REVIEW_CAP = 10`).

### Settings and Progress

- Settings → **New words per day: 3 / 5 / 10** (`settings.vocabPerDay`, default 5).
- Progress → "📚 Words: N learning · M known".

## 7. Stored data

`localStorage["taalmaatje.v1"]` gets one new field, with defaults so old saves and old backups still load (`migrate` fills it in; `version` stays 1):

```json
"vocab": { "known": ["v-0003"], "day": { "date": "2026-10-16", "ids": ["v-0001", "v-0002"] }, "reviews": { "key": "1-2", "count": 4 } },
"settings": { "...": "...", "vocabPerDay": 5 }
```

- `known`: word ids the learner skipped with **I know it**.
- `day`: today's batch (ids), by calendar date.
- `reviews`: count of vocabulary review grades for the key `week-session-date` (the date keeps the cap working when the course position does not move), for the cap.
- Vocabulary cards live in the existing `cards` object. Export / import carries everything already.

## 8. Code units

| File | Job | Depends on |
|---|---|---|
| `content/vocab/pack-NN.json` | Word data only | — |
| `tools/vocab-ipa.mjs` | Author-time: fills `ipa` from `cmudict.dict` | Node, a downloaded dictionary |
| `tools/schema.mjs` | `validateVocab(pack)`, `findVocabRepeats(packs)` | — |
| `tools/validate.mjs` | Also validates every pack | schema.mjs |
| `js/content.js` | `loadVocab()`: loads `pack-01…` until the first missing | fetch |
| `js/vocab.js` | Today's batch, triage (know / teach), review cap, search, counts: **pure functions on state** | cards.js, srs.js |
| `js/cards.js` | `cardView` handles `v-` ids | — |
| `js/ui/words.js` | The Words tab: batch flow, word page, list | vocab.js, widgets.js |
| `js/ui/cards.js` | Vocabulary review card, cap | vocab.js |
| `js/ui/settings.js`, `js/ui/progress.js` | New setting, new line | — |
| `js/store.js` | `vocab` and `vocabPerDay` in default state and `migrate` | — |
| `sw.js`, `index.html`, `js/app.js` | Offline list, nav tab, routes | — |

## 9. When something is not available

| Situation | Behaviour |
|---|---|
| No English voice | 🔊 buttons do nothing; IPA, text and Farsi still show; same banner idea as Dutch |
| Speech recognition missing (iPhone home-screen app, Firefox) | 🎯 hidden; everything else works |
| A pack fails to load | Words tab shows "Could not load the words" with "Try again"; other screens keep working |
| Farsi hints off | Word pages and cards hide `fa.note` and the Farsi example translations; the Farsi meaning stays on the review card (it is the prompt) |
| Storage blocked | Same warning as the rest of the app |

## 10. Testing and checks

- `node tools/validate.mjs` (now also vocabulary): schema, unique ids, ≥ 2 examples (≤ 3), each example contains a `forms` entry, example length 5–16 words, no word from the dated-word list, IPA and `stress` present, no repeated word across packs.
- **Stress check:** the number of syllables in `stress` equals the number of vowel nuclei in `ipa`, and the capitalised syllable is the one after the primary-stress mark `ˈ`.
- `node --test`: `vocab.js` (batch picks the next N unknown words; same day gives the same batch; next day gives new ones; "know" and "teach" move a word out of the batch; teach creates a card; known words are never carded; cap of 10 per session; search by word and by Farsi), `cardView` for `v-` ids, `migrate` with an old save and an old backup, service worker list includes every pack.
- Smoke test: `#/words`, `#/words/list`, a vocabulary card in Cards, Settings and Progress lines; works offline.
- **Fresh reviewer (most capable model) for every pack:** naturalness and modernity of each sentence, correct Persian, correct stress, no copied text.

## 11. Milestones

1. **Engine + pack 1 (about 120 words)**, all of §6–§10, deployed so the learner can start.
2. **Pack 2 (about 100 words)** after the learner has used pack 1 and said what to change; core NGSL only after its licence is confirmed.
3. Further packs on request.

Each milestone ends with validator, tests and smoke passing, a fresh-reviewer pass and a deploy.

## 12. Decisions log

| Date | Decision |
|---|---|
| 2026-10-16 | Words are chosen from the open NGSL (Spoken first), not copied from a book; sentences and Farsi are self-written |
| 2026-10-16 | Separate **Words** tab (not a block in the daily session) |
| 2026-10-16 | Packs of about 100–120 words, written by hand, each reviewed by a fresh reviewer |
| 2026-10-16 | Pack 1 skips the most basic words; "I know it" skips known ones |
| 2026-10-16 | Vocabulary reviews appear in the Cards block, capped at 10 per session |
| 2026-10-16 | IPA is American, taken from CMUdict (never hand-typed); a test keeps the stress in line with the British voice |
| 2026-10-16 | `content/vocab/` is CC BY-SA 4.0 because of the NGSL word list; code stays MIT |
| 2026-10-16 | Words in a list row: undecided words also get "I know it" next to "Teach me" (so the learner can jump ahead); learning words have no triage buttons |
| 2026-10-16 | Packs marked `"draft": true` are skipped by the app and by the 100-word minimum while a pack is being written |
| 2026-10-16 | Final review: the cap counts reviews only (first-time cards always show) and its key includes the date; both found by simulating 30 days of study with the real modules |
| 2026-10-16 | A word may carry `"cmu": "lead(2)"` to pick a dictionary variant (the first CMU entry of "lead" is the metal, not the verb) |
| 2026-10-16 | After using pack 1 the learner knew every word. Answer: **two sections** (Everyday, University) instead of a level picker; **10 words a day** (the old 5 moves to 10 once); a **tick-to-sort** screen first (unticked = known, ticked go one by one); pack 2 = 100 everyday B2 words (37 phrasal verbs, feelings, daily-life nouns, spoken connectors), pack 3 = 100 general academic words from the NAWL |
| 2026-10-16 | Pack file gains `track`; the day's batch stores its `track` and is drawn again when the section changes; a word may carry a hand-set `ipa` (kept by `vocab-ipa`) |
