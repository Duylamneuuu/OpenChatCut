#!/usr/bin/env python3
"""Generate the CutPilot Live voiceover with Kokoro-82M.

    npm run cutpilot:vo

Reads promo/voiceover.txt. Writes public/cutpilot/promo-vo.wav (30 seconds,
24 kHz, 16-bit mono) and promo/voiceover.json with the measured cue lengths.
The model weights download on first run from Hugging Face.
"""

from __future__ import annotations

import json
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "promo" / "voiceover.txt"
WAV_PATH = ROOT / "public" / "cutpilot" / "promo-vo.wav"
META_PATH = ROOT / "promo" / "voiceover.json"
FPS = 30
DURATION_FRAMES = 900
SAMPLE_RATE = 24000
VOICE = "af_heart"
SPEED = 0.93
PEAK = 0.72


def read_cues() -> list[tuple[int, int, str]]:
    cues: list[tuple[int, int, str]] = []
    for raw in SCRIPT.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        start_s, end_s, text = line.split(maxsplit=2)
        cues.append((int(start_s), int(end_s), text))
    if not cues:
        raise SystemExit(f"No cues in {SCRIPT}")
    return cues


def synthesize(text: str) -> np.ndarray:
    from kokoro import KPipeline

    if not hasattr(synthesize, "pipeline"):
        synthesize.pipeline = KPipeline(lang_code="a")
    chunks: list[np.ndarray] = []
    for _graphemes, _phonemes, audio in synthesize.pipeline(text, voice=VOICE, speed=SPEED):
        chunks.append(np.asarray(audio, dtype=np.float32))
    if not chunks:
        raise SystemExit(f"Kokoro returned no audio for: {text}")
    audio = np.concatenate(chunks)
    threshold = 0.01
    loud = np.flatnonzero(np.abs(audio) > threshold)
    if len(loud) == 0:
        raise SystemExit(f"Kokoro returned silence for: {text}")
    audio = audio[loud[0] : loud[-1] + 1]
    fade = min(int(SAMPLE_RATE * 0.012), len(audio) // 4)
    if fade > 0:
        ramp = np.linspace(0, 1, fade, dtype=np.float32)
        audio[:fade] *= ramp
        audio[-fade:] *= ramp[::-1]
    peak = float(np.max(np.abs(audio)))
    if peak > 0:
        audio *= PEAK / peak
    return audio


def write_wav(samples: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(samples, -1, 1)
    pcm = (pcm * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(pcm.tobytes())


def main() -> None:
    cues = read_cues()
    total = SAMPLE_RATE * DURATION_FRAMES // FPS
    mix = np.zeros(total, dtype=np.float32)
    report = []
    for start_frame, end_frame, text in cues:
        audio = synthesize(text)
        start = int(start_frame / FPS * SAMPLE_RATE)
        stop = start + len(audio)
        limit = int(end_frame / FPS * SAMPLE_RATE)
        if stop > limit or stop > total:
            seconds = len(audio) / SAMPLE_RATE
            budget = (end_frame - start_frame) / FPS
            raise SystemExit(
                f"Cue overruns its scene ({seconds:.2f}s > {budget:.2f}s): {text}"
            )
        mix[start:stop] += audio
        report.append(
            {
                "startFrame": start_frame,
                "endFrame": end_frame,
                "seconds": round(len(audio) / SAMPLE_RATE, 3),
                "text": text,
                "voice": VOICE,
                "speed": SPEED,
            }
        )
        print(f"{start_frame:>4}  {len(audio) / SAMPLE_RATE:5.2f}s  {text}")
    # The white hold must stay silent.
    hold_start = int(720 / FPS * SAMPLE_RATE)
    hold_stop = int(780 / FPS * SAMPLE_RATE)
    if float(np.max(np.abs(mix[hold_start:hold_stop]))) > 0.001:
        raise SystemExit("Voiceover leaks into the white hold")
    write_wav(mix, WAV_PATH)
    META_PATH.write_text(json.dumps({"sampleRate": SAMPLE_RATE, "cues": report}, indent=2) + "\n")
    print(f"wrote {WAV_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
