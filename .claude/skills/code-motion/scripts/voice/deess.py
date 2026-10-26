#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Диэссер для голоса: приглушает свист «с/ш/ч/щ», остальную речь не трогает.

  Ставится после склейки дублей (свист копится от EQ и компрессии цепочки), до громкости и выравнивания.

  uv run --script $V/deess.py <in.wav> <out.wav> [--max 6] [--split 4500] [--pct 90] [--slope 1.5]
  По умолчанию мягко (--pct 90 --max 6); средне — --pct 85 --max 8 (пережатый диэссер сам звучит шепеляво).

Как работает: сигнал делится без фазовых сдвигов на низ (до --split Гц) и верх = вход − низ, поэтому
низ + верх дают исходник без потерь. Детектор — уровень верха относительно низа в окне 5 мс. Где верх
«торчит» сильнее, чем в обычной речи этого же диктора (порог — pct-перцентиль отношения по речевым
кадрам), верх приглушается: (превышение × slope) дБ, но не больше --max. Кривая приглушения сглажена
(~3 мс вперёд, ~15 мс плавность), низ не трогается никогда. Тайминги не меняются: words.json остаётся верным.
Печатает порог, долю речи под приглушением, среднее и максимум приглушения, уровень верха до/после.
"""
import argparse

import numpy as np
import soundfile as sf
from scipy.ndimage import maximum_filter1d
from scipy.signal import butter, filtfilt, sosfiltfilt

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('inp'); ap.add_argument('out')
ap.add_argument('--max', type=float, default=6.0, help='максимум приглушения верха, дБ')
ap.add_argument('--split', type=float, default=4500, help='граница низ/верх, Гц')
ap.add_argument('--pct', type=float, default=90, help='порог: перцентиль отношения верх/низ по речи')
ap.add_argument('--slope', type=float, default=1.5, help='дБ приглушения на дБ превышения порога')
a = ap.parse_args()

x, sr = sf.read(a.inp, dtype='float64', always_2d=True)
info = sf.info(a.inp)
x = x.mean(axis=1)
low = sosfiltfilt(butter(4, a.split, 'low', fs=sr, output='sos'), x)
high = x - low

win = max(1, int(0.005 * sr))
kern = np.ones(win) / win
rms = lambda s: np.sqrt(np.convolve(s * s, kern, 'same') + 1e-12)
eh, el, ea = rms(high), rms(low), rms(x)
ratio = 20 * np.log10(eh / el)
level = 20 * np.log10(ea)
speech = level > np.percentile(level, 95) - 30          # речь: не тише 30 дБ от громких мест
thr = np.percentile(ratio[speech], a.pct)
red = np.minimum(a.max, np.clip(ratio - thr, 0, None) * a.slope) * speech
red = maximum_filter1d(red, size=max(1, int(0.003 * sr)))   # приглушение начинается чуть раньше свиста
pole = np.exp(-1 / (0.015 * sr))
red = filtfilt([1 - pole], [1, -pole], red)               # плавно, без щелчков
gain = 10 ** (-red / 20)
y = low + high * gain

hit = speech & (red > 1.0)
sib = speech & (ratio > thr)
db = lambda s: 10 * np.log10(np.mean(s * s) + 1e-20)
print(f'порог верх/низ {thr:+.1f} дБ (перцентиль {a.pct:g} по речи), граница {a.split:.0f} Гц')
print(f'приглушение >1 дБ: {100 * hit.sum() / max(1, speech.sum()):.1f} % речи; среднее {red[hit].mean() if hit.any() else 0:.1f} дБ, максимум {red.max():.1f} дБ')
print(f'верх на свистящих: {db(high[sib]):.1f} -> {db((high * gain)[sib]):.1f} дБ; вся речь: {db(x[speech]):.1f} -> {db(y[speech]):.1f} дБ')
sf.write(a.out, y.astype(np.float32 if info.subtype == 'FLOAT' else np.float64), sr, subtype=info.subtype)
print(f'-> {a.out}')
