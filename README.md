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
npm run serve       # http://127.0.0.1:8080
npm run smoke       # headless Chrome check of every screen (starts its own server)
```

Lessons live in `content/<lang>/week-NN.json`; the format is in `docs/superpowers/specs/2026-10-05-taalmaatje-course-design.md` §5.4.

## Credits

- Extra word list from [woorden](https://github.com/iamsergeyka/woorden) (MIT).
- Scheduling by [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT).
- See `THIRD_PARTY_NOTICES.md` and `content/SOURCES.md`.

## Words (English vocabulary)

The **Words** tab teaches everyday English words: pronunciation (IPA, American), a Farsi meaning and note, and current example sentences with Farsi translations. In all three packs (`"format": 2`) every word also has a **Word forms** table (past, past participle, -ing, plural, related words…) and exactly one example each in the **past, present and future**, each with a Farsi grammar note. It has two sections you switch between at the top: **Everyday** (spoken English; pack 1 basics, pack 2 at B2: phrasal verbs, feelings, daily-life words) and **University** (pack 3: general academic words). Each day it shows 10 new words (3, 5, 10 or 15 in Settings): first you tick the ones that are new to you (the rest count as known), then you go through those one by one; **Teach me** turns a word into a flashcard that is reviewed in the Cards block (at most 10 vocabulary reviews per session).

**Tracking.** Every word has a stage worked out from its flashcard: *Learning* (new or under a week of memory), *Familiar* (a week or more), *Learned* (about three weeks or more **and** at least 3 reviews), plus *Claimed* (you ticked “I know it”) and *Confirmed* (a claimed word that passed the daily **Quick check** of 3 words). A word can move back down if you forget it. The Words tab shows the counts and a thin bar, the list can be filtered by stage, and Progress shows the ladder, how many words reached Learned lately, and your tricky words.

## Woorden (Dutch vocabulary)

The **Woorden** half of the Words tab (switch Dutch | English at the top; `#/woorden` opens it directly) is the Dutch twin of English Words, for everyday Dutch only (work, shops, health, housing, travel, forms and feelings, with Belgian words marked). Packs 4 and 5 hold 150 words; each word has the Dutch article, IPA (standard Dutch), an English gloss, Farsi meaning and note, a **Word forms** list (plural, verb forms, comparatives) and exactly one example each in the **past (usually the perfect), present and future** with a Farsi grammar note. It works like Words: 5 new words a day by default (3, 5, 10 or 15 in Settings), tick the new ones, **Teach me** makes a card (shared limit of 10 vocabulary reviews per Cards session with English), stages and the daily Quick check are the same. Recorded voices: Nathalie and Ronnie.

Packs live in `content/vocab/` (CC BY-SA 4.0; word choice from the NGSL-Spoken and New Academic Word lists, IPA from the CMU Pronouncing Dictionary — see `content/vocab/README.md`). `node tools/vocab-ipa.mjs <pack> <cmudict.dict>` fills the IPA; `npm run validate` checks every pack.
