# Recorded voices

Status: approved and built (2026-10-16).

## Why
The phone's own speech voices (especially the iPhone's "Ellen"/"Xander") sound robotic, which makes the pronunciation harder to learn from. Goal: natural, identical voices on every device.

## Decisions
- Recordings are made ahead of time with open-source models and stored in the app (`audio/<lang>/<voice>/<key>.mp3`), not generated on the phone. Works offline, needs no voice downloads, and plays as normal media.
- **English:** Kokoro-82M (Apache-2.0), voices Heart (American) and Emma (British). **Dutch:** Piper, voices Nathalie (Belgian) and Ronnie (Netherlands). The learner chose these four after listening to a trial page. No voice cloning. Chatterbox (MIT, supports Dutch and cloning) was tried and rejected: 2–3× slower than the audio it made and one sample came out garbled.
- Two voices per language: a dialogue uses one voice per speaker; elsewhere Settings → "recorded voice" (Mixed by default: a fixed voice per text, so the same sentence always sounds the same).
- Coverage: every sentence and every single word in the Dutch and English weeks, the vocabulary words and their example sentences. Anything else (the learner's own phrases, the 1,946-word list, the Limburg everyday forms) still uses the phone voice, as does any clip that fails to play.
- File name = `cyrb53("<lang>|<normalised text>")` in base 36 (`js/clips.js`, also used by `tools/tts/collect.mjs`). `audio/manifest.json` lists the keys per voice and a `version`; the version is part of the URL so new recordings are never mistaken for cached old ones.
- Service worker: clips are cached after the first play and served with `206` byte-range answers (an iPhone only plays media that way).
- Slow play (🐢) uses the same clip at 0.7× speed with pitch kept.

## Open point
Whether the iPhone Silent switch mutes the recordings is not tested yet (they are normal media, which the switch should not mute). Check on the phone.
