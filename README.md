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
