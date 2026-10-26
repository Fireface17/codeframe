#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "soundfile"]
# ///
"""Дубли живой записи по отрезкам слов: запись вразброс, с повторами и поправками -> cand/p<k>_<имя>.wav.

  uv run --script $V/live_cut.py <запись> <words_raw.json> <spans.json> <папка cand> [--quiet-db -55] [--snap 0.35]

spans.json — какие куски записи считать дублями фразы. Ключ — номер фразы script.json, значение — дубли:
  {"1":  {"s1": [[5.23, 7.31]], "s2": [[74.47, 76.67]]},
   "11": {"s3": [[186.13, 188.85], [191.91, 193.71]]},       <- склейка двух кусков в обход сбоя
   "_bounds": {"3/s2": [[null, 84.6]]}}                         <- ручные границы куска (null — оставить авто)
Каждый кусок — [начало первого слова, начало последнего слова] в секундах из words_raw.json (live_words.py печатает
«слово@время»). Кусок режется от слова до слова с запасом (0,2 с до, 0,22 с после, не заходя на соседние слова), затем края
двигаются к ближайшей тишине (окно 20 мс ниже --quiet-db дБFS в пределах --snap с): тайминги mlx-whisper бывают сдвинуты
на 0,2–0,35 с, а склейка посреди звука щёлкает. Куски одного дубля склеиваются через 0,18 с тишины, фейды 12 мс.

Режется исходник без обработки: шумоподавление и EQ делает live_chain.py один раз, на выбранных дублях.
Рядом пишется cand.json: какие секунды записи вошли в каждый дубль.
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('src'); ap.add_argument('words'); ap.add_argument('spans'); ap.add_argument('out')
ap.add_argument('--quiet-db', type=float, default=-55.0, help='тишина для стыка: окно 20 мс тише этого, дБFS')
ap.add_argument('--snap', type=float, default=0.35, help='насколько далеко искать тишину от границы, с')
a = ap.parse_args()

SR = 48000
out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
W = json.load(open(a.words, encoding='utf-8'))
SP = json.load(open(a.spans, encoding='utf-8'))
BOUNDS = SP.pop('_bounds', {})
src48 = out / '_src48.wav'
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', a.src, '-ac', '1', '-ar', str(SR), '-c:a', 'pcm_f32le', str(src48)], check=True)
x, _ = sf.read(src48, dtype='float32')

hop = int(0.005 * SR); win = int(0.02 * SR)
c = np.concatenate([[0], np.cumsum(x.astype(np.float64) ** 2)])
starts = np.arange(0, len(x) - win, hop)
wdb = 10 * np.log10((c[starts + win] - c[starts]) / win + 1e-14)   # уровень окна 20 мс с шагом 5 мс
quiet = wdb < a.quiet_db


def word_at(t):
    return min(W, key=lambda w: abs(w['start'] - t))


def snap(t, direction, lo, hi):
    """Ближайшее тихое окно от t в сторону direction (-1 раньше, +1 позже), не дальше --snap и в пределах [lo, hi]."""
    i0 = int(t * SR / hop)
    for k in range(int(a.snap * SR / hop) + 1):
        i = i0 + direction * k
        if i < 0 or i >= len(quiet): break
        tt = (i * hop + win / 2) / SR
        if tt < lo or tt > hi: break
        if quiet[i]: return tt
    return t


def span(t0, t1):
    wa, wb = word_at(t0), word_at(t1)
    prev = [w for w in W if w['end'] <= wa['start'] - 0.01]
    nxt = [w for w in W if w['start'] >= wb['end'] + 0.01]
    lo = prev[-1]['end'] if prev else 0.0
    hi = nxt[0]['start'] if nxt else len(x) / SR
    s0, s1 = max(wa['start'] - 0.2, (lo + wa['start']) / 2), min(wb['end'] + 0.22, (wb['end'] + hi) / 2)
    return snap(s0, -1, lo, wa['start']), snap(s1, +1, wb['end'], hi)


meta = {}
for k, takes in SP.items():
    for name, parts in takes.items():
        segs = [span(t0, t1) for t0, t1 in parts]
        for j, (o0, o1) in enumerate(BOUNDS.get(f'{k}/{name}', [])):
            if j < len(segs):
                segs[j] = (o0 if o0 is not None else segs[j][0], o1 if o1 is not None else segs[j][1])
        y = np.zeros(0, np.float32); fade = int(SR * 0.012)
        for s0, s1 in segs:
            z = x[int(s0 * SR): int(s1 * SR)].copy()
            z[:fade] *= np.linspace(0, 1, fade); z[-fade:] *= np.linspace(1, 0, fade)
            if len(y): y = np.concatenate([y, np.zeros(int(SR * 0.18), np.float32)])
            y = np.concatenate([y, z])
        f = out / f'p{k}_{name}.wav'
        sf.write(f, y, SR, subtype='FLOAT')
        meta[f.name] = [[round(s0, 3), round(s1, 3)] for s0, s1 in segs]
        print(f'{f.name}: {" + ".join(f"{s0:.2f}–{s1:.2f}" for s0, s1 in segs)}  {len(y) / SR:.2f} с')
json.dump(meta, open(out / 'cand.json', 'w', encoding='utf-8'), indent=1)
print(f'{len(meta)} дублей -> {out}')
