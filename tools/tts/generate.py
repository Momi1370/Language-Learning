#!/usr/bin/env python3
"""Makes the recorded voice clips (audio/<lang>/<voice>/<key>.mp3) for every text in tools/tts/texts.json.

Usage (see tools/tts/README.md for the one-time setup):
    python tools/tts/generate.py en                    # all missing English clips, every voice
    python tools/tts/generate.py nl --voice ronnie --limit 20   # a few clips to try one voice
Only clips that do not exist yet are made. Delete audio/<lang>/<voice>/ to remake everything with a new voice.
"""
import argparse, json, os, subprocess, sys, tempfile, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent


TARGET_DB = -20.0   # average level of the speech, in dB below full scale
PEAK_DB = -1.5      # the loudest peak is never pushed above this


def gain_db(wav_path):
    """The voices differ a lot in loudness (Piper is ~10 dB louder than Kokoro); bring every clip to one level."""
    import numpy as np, soundfile as sf
    x, _ = sf.read(str(wav_path))
    if x.ndim > 1:
        x = x.mean(axis=1)
    peak = float(np.max(np.abs(x))) or 1e-9
    active = x[np.abs(x) > 0.01]
    if active.size < 100:
        return 0.0
    rms_db = 20 * np.log10(float(np.sqrt(np.mean(active ** 2))))
    return min(TARGET_DB - rms_db, PEAK_DB - 20 * np.log10(peak))


def to_mp3(wav_path, mp3_path, bitrate):
    g = gain_db(wav_path)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav_path), "-af", f"volume={g:.2f}dB", "-ac", "1", "-ar", "24000", "-b:a", bitrate, str(mp3_path)], check=True)


def kokoro_synth(cfg):
    import numpy as np, soundfile as sf
    from kokoro import KPipeline
    pipe = KPipeline(lang_code=cfg["lang_code"], repo_id="hexgrad/Kokoro-82M")
    def synth(text, wav_path):
        audio = np.concatenate([a for _, _, a in pipe(text, voice=cfg["voice"], speed=cfg.get("speed", 1.0))])
        sf.write(wav_path, audio, 24000)
    return synth


def piper_synth(cfg):
    from piper import PiperVoice
    model = Path(os.environ.get("PIPER_VOICES", HERE / "voices")) / f"{cfg['model']}.onnx"
    voice = PiperVoice.load(str(model))
    def synth(text, wav_path):
        with wave.open(str(wav_path), "wb") as f:
            voice.synthesize_wav(text, f)
    return synth


ENGINES = {"kokoro": kokoro_synth, "piper": piper_synth}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lang", choices=["en", "nl"])
    ap.add_argument("--voice", default="", help="only this voice id from voices.json")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--bitrate", default="32k")
    args = ap.parse_args()
    voices = json.loads((HERE / "voices.json").read_text())[args.lang]["voices"]
    texts = json.loads((HERE / "texts.json").read_text())[args.lang]
    for cfg in voices:
        if args.voice and cfg["id"] != args.voice:
            continue
        out = ROOT / "audio" / args.lang / cfg["id"]
        out.mkdir(parents=True, exist_ok=True)
        todo = [t for t in texts if not (out / f"{t['key']}.mp3").exists()]
        if args.limit:
            todo = todo[: args.limit]
        print(f"{args.lang}/{cfg['id']}: {len(todo)} clips to make with {cfg['engine']}", flush=True)
        if not todo:
            continue
        synth = ENGINES[cfg["engine"]](cfg)
        failed = []
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "clip.wav"
            for i, t in enumerate(todo, 1):
                try:
                    synth(t["say"], wav)
                    to_mp3(wav, out / f"{t['key']}.mp3", args.bitrate)
                except Exception as e:  # keep going: one odd text must not stop the run
                    failed.append((t["text"], str(e)))
                if i % 200 == 0:
                    print(f"  {i}/{len(todo)}", flush=True)
        for text, err in failed:
            print(f"FAILED: {text!r}: {err}", file=sys.stderr)
        print(f"{args.lang}/{cfg['id']}: {len(todo) - len(failed)} made, {len(failed)} failed", flush=True)


main()
