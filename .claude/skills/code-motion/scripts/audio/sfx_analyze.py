#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy"]
# ///
"""Objective table of SFX candidates (we cannot listen): length after silence trim, peak, centroid,
share >4 kHz (harshness), attack time (10->90 % of the peak envelope), noisiness (spectral flatness),
tail (time from peak to -30 dB), RMS level of the loudest 100 ms, tonality (the narrowest strongest spectral
peak over the median of its +-1/3 octave neighbourhood, 150 Hz-8 kHz).

usage: uv run --script sfx_analyze.py FILE [FILE ...]      (wav, ogg, mp3, ... anything ffmpeg reads)

How to read it: compare with the sounds shipped in assets/sfx (their meta.json has dur, centroid_hz, hf4k_pct).
A high centroid and a high hf4k mean a bright, possibly harsh sound; att is how fast the sound reaches its peak,
tail how long it takes to fall 30 dB; flat (spectral flatness over 100 Hz-12 kHz) is near 0 for a pure tone and for
any band-limited sound alike, so it only singles out broadband noise. tone is the tonality in dB at its frequency:
above ~25 dB the sound has a steady pitch (a beep, a ding, a ring, a squeak) and is flagged TONE: such sounds read as
cartoonish or as interface sounds, replace them with toneless recordings (impact, paper, air). Wood and metal impacts
have resonances of 15-21 dB and are fine. A pitch sweep (whistle up/down) spreads over many bins and scores low:
look at the spectrogram for those. Synthesized bleeps and sweeps sound
unpleasant: prefer recordings. The numbers only screen candidates: a person must listen to the final sound.
"""
import argparse
import os
import sys

import numpy as np

sys.dont_write_bytecode = True  # keep the shared skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import audiolib as A  # noqa: E402


def tonality(y, sr, f_lo=150.0, f_hi=8000.0):
    """(prominence dB, Hz) of the strongest narrow peak: averaged spectrum in dB minus the median of +-1/3 octave."""
    n = 4096
    if len(y) < n:
        y = np.pad(y, (0, n - len(y)))
    hop = n // 4
    fr = np.array([y[i:i + n] * np.hanning(n) for i in range(0, len(y) - n + 1, hop)])
    P = 10 * np.log10(np.mean(np.abs(np.fft.rfft(fr, axis=1)) ** 2, axis=0) + 1e-20)
    f = np.fft.rfftfreq(n, 1 / sr)
    best = (0.0, 0.0)
    for k in np.where((f >= f_lo) & (f <= f_hi))[0]:
        lo, hi = np.searchsorted(f, f[k] / 2 ** (1 / 3)), np.searchsorted(f, f[k] * 2 ** (1 / 3))
        prom = P[k] - np.median(P[lo:hi + 1])
        if prom > best[0]:
            best = (float(prom), float(f[k]))
    return best


def metrics(path):
    sr, x = A.read(path)
    if x.ndim > 1:
        x = x.mean(1)
    env = np.convolve(np.abs(x), np.ones(int(0.003 * sr)) / int(0.003 * sr), 'same')
    pk = env.max()
    idx = np.where(env > pk * 10 ** (-45 / 20))[0]
    a, b = idx[0], idx[-1]
    y = x[a:b + 1]
    e = env[a:b + 1]
    ip = int(np.argmax(e))
    pre = e[:ip + 1]
    try:
        t10 = np.where(pre >= 0.1 * e[ip])[0][0]
        t90 = np.where(pre >= 0.9 * e[ip])[0][0]
        att = (t90 - t10) / sr * 1000
    except IndexError:
        att = 0
    post = np.where(e[ip:] < e[ip] * 10 ** (-30 / 20))[0]
    tail = (post[0] / sr * 1000) if len(post) else (len(e) - ip) / sr * 1000
    S = np.abs(np.fft.rfft(y * np.hanning(len(y)))) ** 2
    f = np.fft.rfftfreq(len(y), 1 / sr)
    cen = (S * f).sum() / S.sum()
    hf = S[f > 4000].sum() / S.sum() * 100
    m = (f > 100) & (f < 12000)
    flat = np.exp(np.mean(np.log(S[m] + 1e-12))) / (np.mean(S[m]) + 1e-12)
    w = int(0.1 * sr)
    rms = np.sqrt(np.max(np.convolve(y ** 2, np.ones(w) / w, 'valid'))) if len(y) > w else np.sqrt(np.mean(y ** 2))
    tone, tone_hz = tonality(y, sr)
    return dict(dur=len(y) / sr, peak_db=20 * np.log10(np.abs(x).max() + 1e-12),
                cen=cen, hf=hf, att=att, tail=tail, flat=flat, rms_db=20 * np.log10(rms + 1e-12),
                tone=tone, tone_hz=tone_hz)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('files', nargs='+', metavar='FILE', help='sound files to measure')
    args = ap.parse_args()
    for p in args.files:
        m = metrics(p)
        print(f"{os.path.basename(p):26} dur {m['dur']:5.2f}s peak {m['peak_db']:6.1f} dB cen {m['cen']:6.0f}Hz "
              f"hf4k {m['hf']:5.1f}% att {m['att']:5.1f}ms tail {m['tail']:6.0f}ms flat {m['flat']:.3f} rms {m['rms_db']:6.1f} "
              f"tone {m['tone']:4.1f} dB @{m['tone_hz']:5.0f}Hz{'  TONE' if m['tone'] > 25 else ''}")


if __name__ == '__main__':
    main()
