# English vocabulary packs

`pack-NN.json` are the word packs of the Words tab.

- **Word choice:** the New General Service List – Spoken (NGSL-S 1.2), Browne, C., Culligan, B. (2013), https://www.newgeneralservicelist.com, licensed under Creative Commons Attribution-ShareAlike 4.0 International.
- **Pronunciation (IPA):** generated from the CMU Pronouncing Dictionary (Copyright (C) 1993-2014 Carnegie Mellon University; unrestricted use, credit requested).
- **Sentences, Farsi explanations and notes:** written for this project.

Because the word list is share-alike, the files in this folder are published under **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/). The app's code stays under the repository's MIT licence.

Authoring: `node tools/vocab-ipa.mjs content/vocab/pack-01.json <path to cmudict.dict>` fills the `ipa` field. `node tools/validate.mjs` checks every pack.
