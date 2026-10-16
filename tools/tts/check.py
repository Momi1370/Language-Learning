#!/usr/bin/env python3
"""Flags clips whose length looks wrong for their text (a voice that stumbled, repeated or cut off).
Usage: python tools/tts/check.py [en|nl]   (needs ffprobe)"""
import json, statistics, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
texts = json.loads((ROOT / "tools/tts/texts.json").read_text())
voices = json.loads((ROOT / "tools/tts/voices.json").read_text())
langs = sys.argv[1:] or ["en", "nl"]
bad = 0
for lang in langs:
    by_key = {t["key"]: t for t in texts[lang]}
    for v in voices[lang]["voices"]:
        rows = []
        for f in sorted((ROOT / "audio" / lang / v["id"]).glob("*.mp3")):
            d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)]))
            t = by_key.get(f.stem)
            if t:
                rows.append((d, len(t["say"]), t))
        # seconds per character, for the clips long enough to judge
        per = [d / n for d, n, _ in rows if n >= 12]
        mid = statistics.median(per)
        for d, n, t in rows:
            ratio = d / max(n, 1) / mid
            if n >= 12 and (ratio > 2.2 or ratio < 0.45):
                bad += 1
                print(f"{lang}/{v['id']}: {d:.1f}s for {n} chars (x{ratio:.1f}): {t['text'][:70]}")
            elif n < 12 and d > 3.0:
                bad += 1
                print(f"{lang}/{v['id']}: {d:.1f}s for a short text: {t['text'][:70]}")
print(f"{bad} clips to look at")
