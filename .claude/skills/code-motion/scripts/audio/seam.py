#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy"]
# ///
"""Numeric check of a loop seam: tile OUT.wav (out + out + out) and compare the join with the
ordinary bar lines inside the track.

usage: uv run --script seam.py OUT.wav [--bars N] [--pre 0.008] [--json f]
  (N and pre are read from OUT.plan.json when it exists, which loop.py writes next to the loop)

Metrics (seam = the join at t = D; the "bar line" there is at D + pre, where pre is the lead-in kept
before the first kick):
  level_db    |loudness 80 ms before the line - 80 ms after| at the seam, and the median / worst of the same
              quantity over the n-1 ordinary bar lines (same windows). z = (seam - mean)/std of the others.
  spec_db     RMS distance (dB) of 40-band log spectra of the same two windows; same statistics.
  join_*_z    the same two statistics with 25 ms windows centred on the join point (sensitive to a cut).
  click       largest |first difference| of the 1 kHz high-passed signal within +-2 ms of the seam
              relative to the 99.9th percentile of that signal in the body (<= 1.0: no click).
  timing_ms   position of the strongest HF onset near the line relative to its expected place, seam
              versus the median of ordinary lines (rhythmic hiccup at the join if large).
  gap         lowest 5 ms RMS within +-30 ms of the seam relative to the lowest in ordinary lines (dip = hole).
verdict OK when level/spec z < 2.5, click <= 1.2, |timing dev| < 4 ms, no gap.
"""
import argparse
import json
import os
import sys

import numpy as np
from scipy.signal import butter, sosfiltfilt

sys.dont_write_bytecode = True  # keep the shared skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import audiolib as A  # noqa: E402

SR = A.SR


def bands(x, n=40):
    w = np.hanning(len(x))
    S = np.abs(np.fft.rfft(x * w)) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    edges = np.geomspace(60, 16000, n + 1)
    return np.array([10 * np.log10(S[(f >= a) & (f < b)].sum() + 1e-9) for a, b in zip(edges[:-1], edges[1:])])


def win_stats(y, c, w):
    a, b = y[c - w:c], y[c:c + w]
    la = 10 * np.log10(np.mean(a ** 2) + 1e-12)
    lb = 10 * np.log10(np.mean(b ** 2) + 1e-12)
    return abs(la - lb), float(np.sqrt(np.mean((bands(a) - bands(b)) ** 2)))


def check(out, n_bars, pre=0.008, verbose=True):
    """out: (2, N) array. Returns dict of metrics."""
    N = out.shape[1]
    y3 = np.concatenate([out, out, out], axis=1)
    y = y3.mean(0)
    B = N / n_bars
    w = int(0.08 * SR)
    lines = [int(round(pre * SR + k * B)) for k in range(1, 3 * n_bars)]
    seam_k = {n_bars, 2 * n_bars}
    ord_l, ord_s, sm_l, sm_s = [], [], [], []
    for k, c in zip(range(1, 3 * n_bars), lines):
        if c - w < 0 or c + w > len(y):
            continue
        l, s = win_stats(y, c, w)
        (sm_l if k in seam_k else ord_l).append(l)
        (sm_s if k in seam_k else ord_s).append(s)
    # same comparison with 25 ms windows centred on the join point itself (kick comes pre ms later)
    w2, pj = int(0.025 * SR), int(round(pre * SR))
    oj_l, oj_s, sj_l, sj_s = [], [], [], []
    for k, c in zip(range(1, 3 * n_bars), lines):
        c2 = c - pj
        if c2 - w2 < 0 or c2 + w2 > len(y):
            continue
        l, s = win_stats(y, c2, w2)
        (sj_l if k in seam_k else oj_l).append(l)
        (sj_s if k in seam_k else oj_s).append(s)
    zjl = (np.mean(sj_l) - np.mean(oj_l)) / (np.std(oj_l) + 1e-9)
    zjs = (np.mean(sj_s) - np.mean(oj_s)) / (np.std(oj_s) + 1e-9)
    zl = (np.mean(sm_l) - np.mean(ord_l)) / (np.std(ord_l) + 1e-9)
    zs = (np.mean(sm_s) - np.mean(ord_s)) / (np.std(ord_s) + 1e-9)

    hp = sosfiltfilt(butter(2, 1000, 'highpass', fs=SR, output='sos'), y)
    d = np.abs(np.diff(hp))
    body = np.concatenate([d[int(0.3 * SR):N - int(0.3 * SR)]])
    ref = np.percentile(body, 99.9)
    near = max(d[s - int(0.002 * SR):s + int(0.002 * SR)].max() for s in (N, 2 * N))
    click = float(near / ref)

    # onset timing: strongest HF slope within +-15 ms of each line
    env = np.convolve(np.abs(sosfiltfilt(butter(4, 2000, 'highpass', fs=SR, output='sos'), y)),
                      np.ones(24) / 24, mode='same')
    slope = env - np.roll(env, 24)
    dev = {}
    for k, c in zip(range(1, 3 * n_bars), lines):
        a, b = c - int(0.015 * SR), c + int(0.015 * SR)
        if a < 0 or b > len(y):
            continue
        dev[k] = (a + int(np.argmax(slope[a:b])) - c) / SR * 1000
    ordd = np.array([v for k, v in dev.items() if k not in seam_k])
    seamd = np.array([v for k, v in dev.items() if k in seam_k])
    t_dev = float(np.median(seamd) - np.median(ordd)) if len(seamd) and len(ordd) else 0.0

    # gap: min 5 ms RMS around the seam vs around ordinary lines
    g = int(0.005 * SR)

    def lowrms(c):
        seg = y[c - int(0.03 * SR):c + int(0.03 * SR)]
        r = np.sqrt(np.convolve(seg ** 2, np.ones(g) / g, mode='valid'))
        return r.min()
    gs = np.mean([lowrms(N), lowrms(2 * N)])
    go = np.mean([lowrms(c) for k, c in zip(range(1, 3 * n_bars), lines) if k not in seam_k and c > 2000
                  and c + 2000 < len(y)])
    gap = float(20 * np.log10(gs / (go + 1e-12) + 1e-12))

    res = dict(level_seam_db=round(float(np.mean(sm_l)), 2), level_lines_mean_db=round(float(np.mean(ord_l)), 2),
               level_lines_max_db=round(float(np.max(ord_l)), 2), level_z=round(float(zl), 2),
               spec_seam_db=round(float(np.mean(sm_s)), 2), spec_lines_mean_db=round(float(np.mean(ord_s)), 2),
               spec_lines_max_db=round(float(np.max(ord_s)), 2), spec_z=round(float(zs), 2),
               join_level_z=round(float(zjl), 2), join_spec_z=round(float(zjs), 2),
               click_ratio=round(click, 2), timing_dev_ms=round(t_dev, 2), gap_db=round(gap, 1))
    res['ok'] = bool(max(zl, zjl) < 2.5 and max(zs, zjs) < 2.5 and click <= 1.2 and abs(t_dev) < 4 and gap > -6)
    # single-number cost for ranking candidate loops
    res['cost'] = round(float(max(zl, 0) + max(zs, 0) + max(zjl, 0) + max(zjs, 0) + 3 * max(click - 1, 0) + abs(t_dev) / 2 + max(-gap - 3, 0) / 3), 2)
    if verbose:
        print(f"  level  seam {res['level_seam_db']:.2f} dB | lines mean {res['level_lines_mean_db']:.2f} max "
              f"{res['level_lines_max_db']:.2f} | z {res['level_z']:+.2f}")
        print(f"  spec   seam {res['spec_seam_db']:.2f} dB | lines mean {res['spec_lines_mean_db']:.2f} max "
              f"{res['spec_lines_max_db']:.2f} | z {res['spec_z']:+.2f}")
        print(f"  join   25 ms windows at the seam: level z {res['join_level_z']:+.2f}, spec z {res['join_spec_z']:+.2f}")
        print(f"  click  ratio {res['click_ratio']:.2f} (<=1.2 ok) | timing dev {res['timing_dev_ms']:+.2f} ms | "
              f"gap {res['gap_db']:+.1f} dB | verdict {'OK' if res['ok'] else 'CHECK'} (cost {res['cost']})")
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('loop', metavar='OUT.wav', help='the loop to check (from loop.py)')
    ap.add_argument('--bars', type=int, help='number of bars in the loop (default: from OUT.plan.json, else 8)')
    ap.add_argument('--pre', type=float, help='lead-in before the first kick, s (default: from OUT.plan.json, else 0.008)')
    ap.add_argument('--json', metavar='FILE', help='also write the metrics to FILE')
    ap.add_argument('--strict', action='store_true', help='exit with status 1 when the verdict is CHECK (for scripts)')
    args = ap.parse_args()
    out = A.load(args.loop)
    pp = A.plan_path(args.loop)
    plan = {}
    if os.path.exists(pp):
        with open(pp, encoding='utf-8') as f:
            plan = json.load(f)
    nb = args.bars if args.bars is not None else plan.get('bars', 8)
    pre = args.pre if args.pre is not None else plan.get('pre', 0.008)
    print(f'{args.loop}: {out.shape[1] / SR:.3f} s, {nb} bars, lead-in {pre * 1000:.0f} ms')
    r = check(out, nb, pre)
    if args.json:
        A.dump_json(args.json, r)
    return 1 if (args.strict and not r['ok']) else 0


if __name__ == '__main__':
    sys.exit(main())
