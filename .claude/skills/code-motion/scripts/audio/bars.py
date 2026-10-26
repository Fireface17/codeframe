#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy"]
# ///
"""Bar map of a track: straight beat grid, downbeats, per-bar loudness, percussive share
and a rough chord guess -- to choose musical edit points.

usage: uv run --script bars.py TRACK [--beats-per-bar 4] [--json out.json]
"""
import argparse
import os
import sys

import numpy as np
from scipy.ndimage import median_filter

sys.dont_write_bytecode = True  # keep the shared skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import audiolib as A  # noqa: E402
from analyze import chroma, NAMES  # noqa: E402

TRI = {}
for r in range(12):
    for q, iv in (('', (0, 4, 7)), ('m', (0, 3, 7))):
        v = np.zeros(12)
        v[[(r + i) % 12 for i in iv]] = 1
        TRI[NAMES[r] + q] = v / np.linalg.norm(v)


def grid_of(x, bpb=4):
    g = A.beat_grid(x.mean(0))
    k = np.arange(len(g['beats']))
    per, ic = np.polyfit(k, g['beats'], 1)
    first = ic + per * g['down']
    while first - per * bpb > -per * 0.25:
        first -= per * bpb
    return per, first, g


def bar_table(x, bpb=4):
    per, first, g = grid_of(x, bpb)
    dur = x.shape[1] / A.SR
    starts = np.arange(first, dur, per * bpb)
    mono = x.mean(0)
    S, fq, fps = A.stft_mag(mono, nfft=8192, hop=1024)
    C = chroma(S, fq)
    Sd, fqd, fpsd = A.stft_mag(mono, 2048, 512)
    Sd = Sd[:, :400]
    H = median_filter(Sd, size=(17, 1))
    Pm = median_filter(Sd, size=(1, 17))
    perc = ((Sd * Pm ** 2 / (H ** 2 + Pm ** 2 + 1e-12)) ** 2).sum(1)
    harm = ((Sd * H ** 2 / (H ** 2 + Pm ** 2 + 1e-12)) ** 2).sum(1)
    y = A.kweight(x)
    rows = []
    for i, s in enumerate(starts):
        e = min(dur, s + per * bpb)
        a, b = max(0, int(s * A.SR)), int(e * A.SR)
        if b - a < A.SR * 0.2:
            continue
        L = -0.691 + 10 * np.log10(np.mean(y[:, a:b] ** 2, axis=1).sum() + 1e-12)
        c = C[int(max(s, 0) * fps):int(e * fps)].sum(0)
        c = c / (np.linalg.norm(c) + 1e-12)
        ch = max(TRI, key=lambda k: TRI[k] @ c)
        ps = perc[int(max(s, 0) * fpsd):int(e * fpsd)].sum() / (perc[int(max(s, 0) * fpsd):int(e * fpsd)].sum()
                                                            + harm[int(max(s, 0) * fpsd):int(e * fpsd)].sum() + 1e-12)
        rows.append(dict(bar=i, t=round(float(s), 3), lufs=round(float(L), 1), chord=ch, perc=round(float(ps), 2)))
    return dict(bpm=60 / per, period=per, first_downbeat=first, bpb=bpb, bars=rows, grid_ms=float(np.std(g['resid_ms'])))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('track', metavar='TRACK', help='audio file (wav, mp3, ... anything ffmpeg reads)')
    ap.add_argument('--beats-per-bar', type=int, default=4)
    ap.add_argument('--json', metavar='FILE', help='also write the bar table to FILE')
    args = ap.parse_args()
    bpb = args.beats_per_bar
    x = A.load(args.track)
    T = bar_table(x, bpb)
    med = np.median([r['lufs'] for r in T['bars'] if r['lufs'] > -60])
    print(f"{args.track}: {T['bpm']:.2f} BPM, bar {T['period'] * bpb:.3f}s, first downbeat {T['first_downbeat']:.3f}s, "
          f"grid std {T['grid_ms']:.1f} ms")
    for r in T['bars']:
        bar = '#' * max(0, int(round((r['lufs'] - med + 15))))
        print(f"  {r['bar']:3d} {r['t']:7.2f}s {r['lufs'] - med:+6.1f} LU perc {r['perc']:.2f} {r['chord']:>4} {bar}")
    if args.json:
        A.dump_json(args.json, T)


if __name__ == '__main__':
    main()
