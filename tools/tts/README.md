# Recorded voices

The app plays recorded clips (`audio/<lang>/<key>.mp3`) where it has one and falls back to the phone's own voice for any other text. Clips are made ahead of time with open-source voices:

- **English:** [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0).
- **Dutch:** [Piper](https://github.com/OHF-Voice/piper1-gpl) voices from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) (check the licence of the voice you choose).

The voice for each language is set in `voices.json`; change `version` when you remake the clips (it is part of the clip addresses, so phones fetch the new ones).

## Make or refresh the clips

1. `node tools/tts/collect.mjs` writes `texts.json` (every sentence and single word the app can say, with its file name).
2. Make the clips (needs Python 3.12, `ffmpeg` and `espeak-ng`; on a Mac `brew install ffmpeg espeak-ng`):
   - English: `uv venv --python 3.12 .venv-kokoro && source .venv-kokoro/bin/activate && uv pip install kokoro soundfile`, then
     `PHONEMIZER_ESPEAK_LIBRARY=/opt/homebrew/lib/libespeak-ng.dylib ESPEAK_DATA_PATH=/opt/homebrew/share/espeak-ng-data python tools/tts/generate.py en`
   - Dutch: `uv venv --python 3.12 .venv-piper && source .venv-piper/bin/activate && uv pip install piper-tts`, download the voice `.onnx` and `.onnx.json` into `tools/tts/voices/` (or set `PIPER_VOICES`), then
     `ESPEAK_DATA_PATH=/opt/homebrew/share/espeak-ng-data python tools/tts/generate.py nl`
3. `node tools/tts/manifest.mjs` writes `audio/manifest.json`.
4. `node --test` checks that every clip in the manifest exists.

Only missing clips are made. To change a voice, edit `voices.json`, bump `version`, delete `audio/<lang>/` and run the steps again.
