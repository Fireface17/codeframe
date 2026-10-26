# -*- coding: utf-8 -*-
"""Общий код конвейера живого голоса (live_chain.py, patch_phrase.py): «цепочка C» и замеры речи.

numpy, soundfile, pyloudnorm и ffmpeg из PATH. Лежит рядом со скриптами; `uv run --script` кладёт папку скрипта в sys.path.
"""
from __future__ import annotations

import subprocess

import numpy as np
import soundfile as sf

SR = 48000
PRE_TARGET_LUFS = -20.0    # куда pregain ставит запись (LUFS integrated): на этом уровне стоят пороги экспандера и компрессора

# «Цепочка C» для записи на встроенный микрофон ноутбука или диктофон в 15–20 см: ФВЧ 80 Гц, щелчки рта (adeclick),
# мягкое шумоподавление, EQ (минус «бубнение» 120–330 Гц, минус «коробка» 560, плюс разборчивость 2–3,5 кГц и воздух 9 кГц),
# экспандер (тише паузы), компрессор 3:1. Перед ней — pregain до речи около −20 дБ.
CHAIN_C = ("highpass=f=80:p=2,adeclick=w=55:o=75,afftdn=nr=10:nf=-62:tn=1,"
           "equalizer=f=120:t=q:w=1.4:g=-3,equalizer=f=330:t=o:w=1.6:g=-6,equalizer=f=560:t=q:w=2:g=-2,"
           "equalizer=f=2000:t=q:w=1.2:g=3,equalizer=f=3500:t=o:w=1.5:g=3,highshelf=f=9000:g=3,"
           "agate=threshold=0.016:ratio=3:range=0.25:attack=2:release=35:knee=2,"
           "acompressor=threshold=-26dB:ratio=3:attack=8:release=120:knee=4")


def ff(src, dst, af=None, sr=SR):
    """ffmpeg: любой файл -> моно float32 48 кГц, с фильтрами af."""
    cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-i', str(src), '-ac', '1', '-ar', str(sr)]
    if af:
        cmd += ['-af', af]
    subprocess.run(cmd + ['-c:a', 'pcm_f32le', str(dst)], check=True)


def read(path):
    x, sr = sf.read(str(path), dtype='float32', always_2d=True)
    assert sr == SR, f'{path}: {sr} Гц, ожидается {SR}'
    return x.mean(axis=1)


def env_db(x, win=0.01):
    """Огибающая RMS по окнам win, дБ."""
    n = int(SR * win); m = len(x) // n
    return 20 * np.log10(np.sqrt(np.mean(x[:m * n].reshape(m, n) ** 2, axis=1) + 1e-12))


def band_db(x, f0, f1, win=0.01):
    """Энергия полосы f0..f1 по окнам win, дБ (звонкие звуки: 80–600 Гц)."""
    n = int(SR * win); m = len(x) // n
    sp = np.abs(np.fft.rfft(x[:m * n].reshape(m, n) * np.hanning(n), axis=1)) ** 2
    fr = np.fft.rfftfreq(n, 1 / SR); k = (fr >= f0) & (fr < f1)
    return 10 * np.log10(sp[:, k].sum(1) + 1e-12)


def speech_thr(e, rel=32):
    """Порог «речь/не речь» по огибающей: на rel дБ ниже громких мест, но выше шума."""
    return max(np.percentile(e, 95) - rel, np.percentile(e, 10) + 8)


def speech_span(x, rel=32):
    """(начало, конец, порог) речи в секундах по окнам 10 мс."""
    e = env_db(x); thr = speech_thr(e, rel)
    idx = np.where(e > thr)[0]
    return idx[0] * 0.01, (idx[-1] + 1) * 0.01, thr


def speech_rms(x, thr=None):
    """RMS речевых кадров, дБ."""
    e = env_db(x)
    if thr is None:
        thr = speech_thr(e)
    msk = np.repeat(e > thr, int(SR * .01)); sp = x[:len(msk)][msk]
    return 20 * np.log10(np.sqrt(np.mean(sp ** 2)) + 1e-12)


def lufs(x):
    import pyloudnorm
    return pyloudnorm.Meter(SR).integrated_loudness(x.astype(np.float64))


def pregain_for(x):
    """pregain, дБ: запись -> PRE_TARGET_LUFS (пороги цепочки C рассчитаны на этот уровень).
    Пример: запись на встроенный микрофон −34,5 LUFS -> +14,5 дБ."""
    return round(PRE_TARGET_LUFS - lufs(x), 2)
