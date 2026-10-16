# Taalmaatje — Dutch Words tab and Learned-Words Tracking Design Spec

- **Date:** 2026-10-16
- **Status:** Draft, waiting for the learner's approval
- **Builds on:** `2026-10-16-english-vocabulary-design.md` (Words tab, packs, format 2), `2026-10-16-recorded-voices-design.md` (clips)

## 1. Intent

The learner's Dutch (about A2+) is weaker than their English, and they live and work in Hasselt. The English Words tab works well for them. They asked for the same for Dutch, "excluding university terms", and for "a mechanism to track learned vocabulary". They left the tracking method to me: "find the best method how to keep the things can learn".

What they want, in their words: Dutch words like the English ones (pronunciation, example sentences, Farsi explanations, forms, one sentence per tense), and to be able to trust that a word counted as "learned" really is learned.

**Success:** after a month the learner has met about 150 new everyday Dutch words, can say each one, and the app can honestly tell them how many they still remember after weeks, not just how many they have seen once.

## 2. Goals, non-goals, anti-goals

**Goals**

- A second tab, **Woorden** (Dutch), built like **Words**: daily batch, tick-to-sort screen, word page, list, review cards.
- Everyday Dutch only. One section, no University track.
- A tracking system that tells "seen once" from "remembered for weeks", for **both** languages, shown in the tabs and in Progress.
- All new Dutch words and sentences get recorded voices (Nathalie, Ronnie).

**Non-goals**

- Dutch academic vocabulary.
- Quizzes, badges, points, leaderboards.
- Changing how English words are chosen, taught or scheduled.
- Writing or speech scoring.

**Anti-goals** (a failure even if it technically works)

- Counting a word as learned because the learner ticked "I know it" or saw it once.
- Streak pressure or guilt messages.
- Losing any English progress the learner has now.
- Dutch sentences that sound like a textbook, or that are only Netherlands-Dutch when the learner lives in Flanders.

## 3. Decisions the learner made

- A Dutch tab like the English one, without university terms (their message).
- The tracking method is mine to choose.
- Voices stay as they are (approved earlier); no cloning.

## 4. My calls (the learner can overrule any of these)

| # | Call | Why | Cost if wrong |
|---|---|---|---|
| C1 | A new bottom tab **Woorden**, next to **Words** (5 tabs). Not a language switch inside Words | They asked for "a tab"; two tabs are one tap each | One more icon in the bar |
| C2 | Dutch is standard Dutch with Belgian usage where it differs. Words that are Belgian or Netherlands-only carry a `register` tag (`Belgian`, `Netherlands`) and a Farsi note | The learner lives in Flanders, but standard Dutch is what they read and are examined on | A few words may be missing the other variant |
| C3 | First delivery: **150 words** in two packs (pack 4: 75, pack 5: 75), about 15 days at 10 a day. More after feedback | Same cautious start as English pack 1; authoring and checking is the slow part | They finish early and wait for pack 6 |
| C4 | **Words-per-day is set per language.** English keeps its current value; Dutch defaults to **5** (3 / 5 / 10 / 15) | Dutch words are mostly new to them, English were mostly known; 10 + 10 new cards a day would pile up reviews | They raise it in Settings |
| C5 | Word choice: my own selection of everyday vocabulary for work, shops, health, housing, travel and small talk, checked against an open frequency list. Not copied from a book. Skip anything already taught in Dutch weeks 1–4 | Same rule as English: no copyrighted text in a public repo | Some useful words are missed; the learner can tell me |
| C6 | Each word also gets a **short English gloss** (`en`) next to the Farsi meaning | Their English is stronger than their Dutch, so the gloss anchors the meaning | None |
| C7 | IPA for Dutch comes from **espeak-ng**'s Dutch phonemes, converted to IPA and **hand-corrected**; shown as "standard Dutch" | There is no open Dutch pronouncing dictionary as handy as CMU; espeak-ng is already on the machine for the voices | Small errors; the same fix path as English (hand-set `ipa` is kept) |

## 5. Tracking: how "learned" is decided

The scheduler (FSRS) already stores, for each card, a **stability**: roughly the number of days until the learner has a 90 % chance of still remembering the word. That is the honest measure. A word's stage comes from it, and is recomputed from the card, so it can go down when the learner forgets.

| Stage | Meaning | Rule |
|---|---|---|
| **New** | Not decided yet | No card, not marked |
| **Claimed** | Learner ticked "I know it", not checked | In `vocab.known`, not in `vocab.checked` |
| **Learning** | Taught, being practised | Card exists, stability under 7 days |
| **Familiar** | Remembered after about a week | Stability 7 days or more |
| **Learned** | Remembered for weeks | Stability 21 days or more **and** at least 3 reviews |
| **Confirmed** | A claimed word that passed a spot-check | In `vocab.checked` |

Two additions make the numbers trustworthy:

1. **Spot-check of claimed words.** The learner ticked every English word as known, and may do the same for Dutch. Each time they open the tab, a small optional card offers **"Quick check, 3 words"**: it shows a claimed word, they say or think its meaning, tap to reveal, then "I knew it" (→ Confirmed) or "Not sure" (→ the word is taught as a normal card). It takes under a minute and never blocks the daily words.
2. **"Learned on" dates.** The first day each word reaches *Learned* is stored (`vocab.learnedOn[id] = 'YYYY-MM-DD'`). The stage shown is always the current one, but the date lets Progress say "12 words reached Learned this week" and keeps that history even if a word later slips back.

**Where it shows**

- **Woorden / Words tab header:** one line, for example `Dutch: 8 learned · 14 familiar · 22 learning · 30 claimed`, and a thin stacked bar.
- **All words list:** a stage chip on each row and a stage filter (All / New / Learning / Familiar / Learned / Claimed).
- **Progress:** a "Words" block per language with the ladder counts, "reached Learned this week / this month", and a short **Tricky words** list: words with 2 or more lapses, each linking to its word page.
- No streak or reminder is added.

Nothing about existing cards changes. The English words the learner already has are classified by the same rules the first time the new screen loads, with no reset.

## 6. Dutch content format

`content/vocab/pack-04.json`, `pack-05.json`: same structure as English format 2, plus:

```json
{
  "pack": 4, "lang": "nl", "track": "everyday", "format": 2,
  "source": "Word choice: own selection, frequency-checked. IPA: espeak-ng, hand-corrected.",
  "words": [{
    "id": "d-0001",
    "word": "de afspraak",
    "en": "appointment",
    "pos": "noun (de)",
    "forms": ["de afspraak", "de afspraken", "het afspraakje"],
    "stress": ["AF-spraak"],
    "ipa": "ˈɑfspraːk",
    "fa": { "meaning": "...", "note": "..." },
    "morph": [["Plural", "de afspraken"], ["Small form", "het afspraakje"]],
    "examples": [
      { "tense": "past", "text": "...", "fa": "...", "grammar": "..." },
      { "tense": "present", "text": "...", "fa": "...", "grammar": "..." },
      { "tense": "future", "text": "...", "fa": "...", "grammar": "..." }
    ],
    "register": "neutral"
  }]
}
```

- **IDs** are `d-0001…`. English stays `v-NNNN`. A helper `isVocabId` accepts both; the language of a word is read from its pack.
- **Morphology by word type.** Noun: article, plural, small form. Verb: infinitive, *ik / hij* present, past (*imperfectum* singular and plural), perfect with *hebben* or *zijn*, and whether it separates (*opbellen → ik bel op*). Adjective: base, form with *-e*, comparative, superlative.
- **Sentences:** exactly three, one per tense, in what people really say: the past sentence normally uses the perfect (*ik heb … gebeld*), the future uses *zal / zullen* or *gaan*. Each has a Farsi translation and a Farsi grammar note (word order, *de/het*, perfect auxiliary, separable verbs). At least 5 words each.
- **Validator** (extension of `tools/vocab-schema.mjs`): all English format-2 rules, plus `en` required, ids `d-NNNN`, article present for nouns, a future marker (`zal`, `zult`, `zullen`, `ga`, `gaat`, `gaan`) in the future sentence, a perfect or past form in the past sentence, and no word already in weeks 1–4 chunks.
- **Cloze** (`clozeOf` / `formMatches`) is extended for Dutch: it hides the matching form from `forms`, and for separable verbs hides both parts.
- **IPA tool:** `tools/vocab-ipa-nl.mjs` (new), same contract as `tools/vocab-ipa.mjs`: fills missing `ipa`, never overwrites a hand-set one.

## 7. Screens and behaviour

- `js/ui/words.js` becomes language-aware (`render(ctx, root, 'en' | 'nl')`). Routes: `#/words` (English, unchanged), `#/woorden` (Dutch), `#/woorden/list`.
- One section (no Everyday / University switch) on the Dutch tab; sort screen, "Teach me", "I know it", daily batch, top-up when the setting grows: all reused from the engine. The engine functions take a language, and batches are stored per language, keeping the existing `vocab.day.batches` keys for English and adding `nl-everyday`.
- Word page: label becomes "Standard Dutch" instead of "American English"; 🔊/🐢 and "Say it" use `nl`.
- Cards: Dutch vocab cards appear in the existing Cards block as cloze reviews with the review cap shared with English (10 per session in total, not each). First-time words are never capped, as now.
- Settings: "Dutch words per day" row next to the English one.
- Service worker `SHELL` gets the new packs; the pack list in `js/content.js` gets pack 4 and 5.

## 8. Voices

Words and all example sentences are added to `tools/tts/collect.mjs` and recorded with Nathalie and Ronnie (the same 32 kbps, normalised to −20 dB). About 150 words + 450 sentences, twice (two voices), about 1,200 clips and +12 MB in the repo. Manifest version stays `1` (new clips only, old URLs unchanged).

## 9. Data and migration

- `vocab.checked: []`, `vocab.learnedOn: {}` are new fields. `migrate()` supplies defaults and keeps old saves valid. `settings.vocabPerDay` stays the English number for old saves; the new `settings.vocabPerDayNl` defaults to 5.
- No reset of `vocab.known`, cards or the day batches.

## 10. Testing

- Unit tests (TDD): stage classification (thresholds, the 3-review rule, "slipping back"), learned-on date recording, spot-check results, per-language batches and top-up, review cap shared across languages, `migrate()` of old saves, validator rules for Dutch, Dutch cloze incl. separable verbs.
- Smoke test (`tools/smoke.mjs`): Woorden tab, sort screen, a Dutch word page with three tenses, a clip request for a Dutch word, the stage line in Progress.
- A fresh reviewer reads each Dutch pack before it ships (Dutch is the language I am least able to self-check); the learner is the final judge.

## 11. Build order

1. Tracking engine and screens for **English** first (smallest visible change, uses real data the learner has).
2. Language-aware engine and Woorden tab with a 10-word starter pack.
3. Packs 4 and 5 (content, IPA, validation, review).
4. Recorded voices for the new texts, push.

Each step is shippable on its own.

## 12. Left to the builder

Exact bar colours and wording, the stage chip design, how many tricky words to list (suggest 10), pack-4 word list (within C5), file names of tests.

## 13. Open risks

- Dutch example sentences and Farsi grammar notes are written by me and not checked by a native Dutch speaker; the reviewer pass lowers but does not remove this.
- Belgian versus Netherlands usage may differ from what the learner hears at work; they should flag any word that sounds wrong to them.
- The 7- and 21-day thresholds are my judgement. If the numbers feel too strict or too easy after a month, they are one constant to change.
