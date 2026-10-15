# English vocabulary packs

`pack-NN.json` are the word packs of the Words tab.

- **Sections:** every pack has a `track`: `everyday` (packs 1 and 2) or `university` (pack 3). The Words tab draws the day's words from the chosen section.
- **Word choice:** pack 1 from the New General Service List – Spoken (NGSL-S 1.2) and pack 3 from the New Academic Word List (NAWL 1.2), Browne, C., Culligan, B., Phillips, J. (2013), https://www.newgeneralservicelist.com, both licensed under Creative Commons Attribution-ShareAlike 4.0 International. Pack 2 (phrasal verbs and everyday B2 words) was picked by hand for this project and checked against the NGSL-S list.
- **Pronunciation (IPA):** generated from the CMU Pronouncing Dictionary (Copyright (C) 1993-2014 Carnegie Mellon University; unrestricted use, credit requested).
- **Sentences, Farsi explanations and notes:** written for this project.

Because the word list is share-alike, the files in this folder are published under **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/). The app's code stays under the repository's MIT licence.

**Format 2** (packs 2 and 3, `"format": 2` on the pack): every word has `morph` (a list of `[label, text]` word forms) and exactly three examples with `tense` (`past`, `present`, `future`; the future one must use will / 'll / going to) and a Farsi `grammar` note. The pack-1 words keep the older format (2–3 examples, no forms).

A word may carry `ipa` (set by hand where the dictionary entry is odd for a learner) or `cmu` (a dictionary variant such as `lead(2)`).

Authoring: `node tools/vocab-ipa.mjs content/vocab/pack-01.json <path to cmudict.dict>` fills the `ipa` field. `node tools/validate.mjs` checks every pack.
