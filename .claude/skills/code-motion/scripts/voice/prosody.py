#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "soundfile", "praat-parselmouth"]
# ///
"""Просодия дублей: σF0 (живость), спад тона в конце (↘ или вопрос), паузы внутри дубля, громкость речи.

  uv run --script $V/prosody.py <папка дублей | файлы p*_s*.wav ...> [--floor 70] [--ceiling 350]

  σ       разброс высоты тона, полутоны: ниже ~1,5 — монотонно, 2–4 — живо
  конец   средний тон последних 0,4 с речи минус предыдущих 0,6 с, полутоны: отрицательный — утверждение (↘),
          положительный — звучит как вопрос (для фразы с «↘» в тексте для записи это брак)
  паузы   паузы длиннее 0,15 с внутри дубля, с (заминки, вдохи посреди мысли)
  I       медианная громкость речи, дБ (Praat)
Порядок выбора дубля: текст дословно (check_takes.py) -> интонация как в тексте для записи (конец ↘, не вопрос)
-> живость -> темп. Ударения скрипт не слышит: выбранные дубли надо прослушать.
Зависимость: Praat через parselmouth (GPL-3.0), ставится uv при запуске, в навык не вшита (NOTICE.md).
"""
import argparse
import glob
import os
import re
from pathlib import Path

import numpy as np
import parselmouth

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('paths', nargs='+')
ap.add_argument('--floor', type=float, default=70, help='нижняя граница F0, Гц (женский голос: 100)')
ap.add_argument('--ceiling', type=float, default=350, help='верхняя граница F0, Гц (женский голос: 500)')
a = ap.parse_args()

files = []
for p in a.paths:
    files += glob.glob(os.path.join(p, 'p*_s*.wav')) if os.path.isdir(p) else [p]
key = lambda s: [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', Path(s).name)]
for f in sorted(files, key=key):
    snd = parselmouth.Sound(f)
    pit = snd.to_pitch(time_step=0.01, pitch_floor=a.floor, pitch_ceiling=a.ceiling)
    f0 = pit.selected_array['frequency']; t = pit.xs(); v = f0 > 0
    if v.sum() < 5:
        print(f'{Path(f).name:12s} нет голоса'); continue
    st = 12 * np.log2(f0[v] / np.median(f0[v])); tv = t[v]
    end = tv[-1]; tail = st[tv > end - 0.4]; head = st[(tv > end - 1.0) & (tv <= end - 0.4)]
    fall = (tail.mean() - head.mean()) if len(head) and len(tail) else 0.0
    inten = snd.to_intensity(time_step=0.01); I = inten.values[0]; ti = inten.xs()
    on = I > I.max() - 25; gaps = []; g0 = None; first = ti[np.argmax(on)]
    for k in range(len(on)):
        if not on[k] and g0 is None: g0 = ti[k]
        if on[k] and g0 is not None:
            if ti[k] - g0 > 0.15 and g0 > first: gaps.append(round(float(ti[k] - g0), 2))
            g0 = None
    mark = '↘' if fall < -0.5 else ('?' if fall > 0.5 else '→')
    print(f"{Path(f).name:12s} σ {st.std():4.1f}  конец {fall:+5.1f} пт {mark}  паузы {gaps}  I {np.percentile(I[on], 50):.1f} дБ")
