#!/usr/bin/env -S uv run --script
# /// script
# requires-python = "==3.11.*"
# dependencies = ["numpy", "soundfile", "soxr", "mlx-whisper"]
# [tool.uv]
# exclude-newer = "2026-10-19T00:00:00Z"
# ///
"""Слова живой записи с таймингами (whisper large-v3-turbo, word_timestamps): по ним live_cut.py режет дубли точно.

  uv run --script $V/live_words.py <запись.wav> <words_raw.json> [--segments takes/split.json | takes/takes.log] [--lang ru]

Нужен, когда запись идёт вразброс (фразы повторяются не подряд, с поправками и сбоями) и takes.py не может сам
сопоставить куски фразам. Куски речи берутся из split.json ("segments") или лога takes.py (строки «  a-  b  текст»);
без --segments запись делится на куски по энергии (паузы от 0,45 с). Каждый кусок распознаётся отдельно (с запасом
0,25 с до и 0,3 с после), слова склеиваются по времени. На экран печатается текст со временем начала каждого слова:
по нему выбирают отрезки дублей для live_cut.py.

Тайминги mlx-whisper сдвинуты на 0,2–0,35 с на отдельных кусках: live_cut.py поэтому ставит границы по тишине.
Распознавание — mlx-whisper: только Mac на Apple Silicon.
"""
import argparse
import json
import os
import re
from pathlib import Path

os.environ.setdefault('HF_HOME', str(Path.home() / '.cache/code-motion/hf'))
import numpy as np
import soundfile as sf
import soxr

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('wav'); ap.add_argument('out')
ap.add_argument('--segments', help='split.json от takes.py (поле segments) или его лог takes.log')
ap.add_argument('--lang', default='ru')
ap.add_argument('--model', default='mlx-community/whisper-large-v3-turbo')
a = ap.parse_args()

x, sr = sf.read(a.wav, dtype='float32', always_2d=True)
x = x.mean(axis=1)
SR = 16000
x16 = soxr.resample(x, sr, SR).astype(np.float32)


def energy_chunks(y, sr, gap=0.45, min_len=0.3):
    hop = int(0.02 * sr)
    db = 20 * np.log10(np.array([np.sqrt(np.mean(y[i:i + hop] ** 2) + 1e-12) for i in range(0, len(y) - hop, hop)]))
    thr = max(np.percentile(db, 10) + 10, np.percentile(db, 99.5) - 38)
    on, segs, i = db > thr, [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]: j += 1
            if segs and (i - segs[-1][1]) * 0.02 < gap: segs[-1][1] = j
            else: segs.append([i, j])
            i = j
        else: i += 1
    return [(s * 0.02, e * 0.02) for s, e in segs if (e - s) * 0.02 >= min_len]


chunks = []
if a.segments and a.segments.endswith('.json'):
    chunks = [(float(s[0]), float(s[1])) for s in json.load(open(a.segments, encoding='utf-8')).get('segments', [])]
elif a.segments:
    for ln in open(a.segments, encoding='utf-8'):
        m = re.match(r'\s+([\d.]+)-\s*([\d.]+)\s+\S', ln)
        if m and 'sim' not in ln:
            chunks.append((float(m.group(1)), float(m.group(2))))
if not chunks:
    chunks = energy_chunks(x, sr)
print(f'кусков речи: {len(chunks)}')

import mlx_whisper  # noqa: E402  (после разбора аргументов: модель грузится только для работы)

words = []
for a0, b0 in chunks:
    s0, s1 = max(0, a0 - 0.25), b0 + 0.3
    r = mlx_whisper.transcribe(x16[int(s0 * SR): int(s1 * SR)], path_or_hf_repo=a.model, language=a.lang,
                               word_timestamps=True, condition_on_previous_text=False)
    for s in r['segments']:
        for w in s.get('words', []):
            words.append({'w': w['word'].strip(), 'start': round(s0 + w['start'], 3), 'end': round(s0 + w['end'], 3),
                          'p': round(w.get('probability', 0), 3), 'chunk': [a0, b0]})
words.sort(key=lambda w: w['start'])
json.dump(words, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
line, last = [], None
for w in words:
    if last is not None and w['start'] - last > 0.45:
        print(' '.join(line)); line = []
    line.append(f"{w['w']}@{w['start']:.2f}"); last = w['end']
print(' '.join(line))
print(f'{len(words)} слов -> {a.out}')
