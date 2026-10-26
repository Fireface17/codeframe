#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy"]
# ///
"""Cut a track to an exact duration D as a seamless LOOP that starts on a kick at t = 0.

usage: uv run --script loop.py SRC OUT.wav D
         [--start-bar N] [--bars n] [--max-stretch 0.07] [--pre 0.008] [--xf 0.04] [--top 6] [--no-stretch]
       (SRC: wav, mp3, ogg, ... anything ffmpeg reads; D in seconds, e.g. the film duration)

Idea
  * D is a parameter. The loop is n whole bars; the track is time-stretched (ffmpeg atempo, pitch kept)
    by f = D / (n * bar) so that n bars last exactly D seconds (|ln f| <= max-stretch, 0.07 = 7 %).
    The program tries all n (6..12) and start bars and takes the plan with the smallest stretch and the
    best musical fit (planning score), then renders the TOP candidates and measures their seams
    with seam.py (out+out+out), keeping the one with the lowest seam cost.
  * start: the first downbeat of the chosen bar at t = PRE (8 ms lead-in so the kick is not cut), no fade-in;
    the bar must be at full energy and carry the track's groove -> a hook from the first frame.
  * end: the output ends at the bar line n bars later (minus PRE). The last XF (40 ms) are an equal-power
    crossfade into the audio that originally PRECEDED the start (src[start-PRE-XF : start-PRE]), so when the
    file wraps, the sound just before the first kick is the real, continuous predecessor: no click,
    no hole, decays carry on. No fade-out to zero anywhere.
  * writes OUT (48 kHz stereo 16-bit) and OUT.plan.json (bars, bpm, stretch, beat grid in film time,
    seam metrics, source positions). Peak is kept <= -1 dBFS; loudness is set later by mix.py.
"""
import argparse
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.signal import butter, sosfiltfilt

sys.dont_write_bytecode = True  # keep the shared skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import audiolib as A  # noqa: E402
from bars import bar_table, TRI  # noqa: E402
import seam  # noqa: E402

SR = A.SR


def csim(a, b):
    return float(TRI[a] @ TRI[b])


def plans(T, D, max_stretch, start_bar=None, only_n=None):
    """Heuristic candidates (score, s, n, f)."""
    bars = T['bars']
    L = np.array([b['lufs'] for b in bars])
    ch = [b['chord'] for b in bars]
    P = np.array([b['perc'] for b in bars])
    B = T['period'] * T['bpb']
    med = np.median(L[L > -60])
    out = []
    for n in ([only_n] if only_n else range(6, 13)):
        f = D / (n * B)
        if abs(np.log(f)) > max_stretch:
            continue
        for s in ([start_bar] if start_bar is not None else range(1, len(bars) - n - 2)):
            e = s + n
            if s < 1 or e + 1 >= len(bars) - 1:
                continue
            seg = L[s:e + 1]
            if start_bar is None and (seg.min() < med - 4 or L[s] < med - 2.5 or L[e - 1] < med - 2.5):
                continue
            sc = (1.5 * csim(ch[e], ch[s]) + csim(ch[e - 1], ch[s - 1])
                  - 0.4 * abs(L[e - 1] - L[s - 1]) - 0.3 * abs(L[e] - L[s])
                  + 0.5 * (s % 8 == 0) + 0.25 * (s % 4 == 0) + 0.3 * (n % 4 == 0) + 0.15 * (n % 2 == 0)
                  + 1.0 * P[s]  # percussive start bar
                  - 25 * abs(np.log(f)) ** 1.5)
            out.append((sc, s, n, f))
    out.sort(reverse=True)
    return out


def atempo(x, r):
    """Pitch-preserving tempo change by factor r (>1 faster) with ffmpeg's atempo."""
    if abs(r - 1) < 1e-6:
        return x
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        A.save(a, x)
        subprocess.run([A.ffmpeg(), '-v', 'error', '-y', '-i', a, '-af', f'atempo={r:.7f}', '-ar', str(SR), b], check=True)
        return A.load(b)


def hf_env(x):
    hp = sosfiltfilt(butter(2, 2000, 'highpass', fs=SR, output='sos'), x.mean(0))
    k = int(0.002 * SR)
    return np.convolve(np.abs(hp), np.ones(k) / k, mode='same')


def render(x, T, s, n, D, pre, xf, stretch=True):
    """-> (out (2, D*SR), info). x: source (2, N)."""
    B = T['period'] * T['bpb']
    f = D / (n * B)
    t_s = T['first_downbeat'] + s * B
    a = max(0.0, t_s - 1.0)
    b = min(x.shape[1] / SR, t_s + n * B + 1.0)
    reg = x[:, int(a * SR):int(b * SR)]
    if not stretch:
        f = 1.0
    ys = atempo(reg, 1.0 / f)
    # timing offset of the stretched region (atempo latency) by cross-correlating HF envelopes
    eo, es = hf_env(reg), hf_env(ys)
    u = np.arange(es.shape[0]) / SR
    eo_w = np.interp(u * 1.0 / f, np.arange(eo.shape[0]) / SR, eo)
    step = 48
    lo, so = eo_w[::step], es[::step]
    m = min(len(lo), len(so))
    lo, so = lo[:m] - lo[:m].mean(), so[:m] - so[:m].mean()
    lags = np.arange(-60, 61)  # x 1 ms
    cc = [np.dot(lo[:m - l], so[l:m]) if l >= 0 else np.dot(lo[-l:m], so[:m + l]) for l in lags]
    delta = lags[int(np.argmax(cc))] / 1000.0  # seconds the stretched audio lags the ideal warp
    t0 = (t_s - a) * f + delta  # bar line in stretched region (s)
    i0 = int(round((t0 - pre) * SR))
    N = int(round(D * SR))
    if i0 - int(xf * SR) < 0 or i0 + N > ys.shape[1]:
        raise SystemExit('region too short for this plan')
    seg = ys[:, i0:i0 + N].copy()
    k = int(round(xf * SR))
    pre_mat = ys[:, i0 - k:i0]
    ramp = np.linspace(0, np.pi / 2, k)
    seg[:, -k:] = seg[:, -k:] * np.cos(ramp) + pre_mat * np.sin(ramp)
    info = dict(stretch=round(f, 5), delta_ms=round(delta * 1000, 1), src_start=round(float(t_s), 4),
                src_bpm=round(T['bpm'], 3), out_bpm=round(T['bpm'] / f, 3))
    return seg, info


def beats_in_film(T, n, D, pre):
    per = D / (n * 4)
    return [dict(t=round(pre + i * per, 4), downbeat=(i % 4 == 0)) for i in range(n * 4)]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', metavar='SRC', help='source track')
    ap.add_argument('out', metavar='OUT.wav', help='the loop to write (OUT.plan.json is written next to it)')
    ap.add_argument('dur', metavar='D', type=float, help='exact loop length, seconds')
    ap.add_argument('--start-bar', type=int, help='force the start bar (index from bars.py)')
    ap.add_argument('--bars', type=int, help='force the number of bars (default: try 6..12)')
    ap.add_argument('--max-stretch', type=float, default=0.07, help='largest |ln f| of the tempo change (default 0.07 = 7 %%)')
    ap.add_argument('--pre', type=float, default=0.008, help='lead-in before the first kick, s (default 0.008)')
    ap.add_argument('--xf', type=float, default=0.04, help='wrap crossfade length, s (default 0.04)')
    ap.add_argument('--top', type=int, default=6, help='how many planned candidates to render and compare (default 6)')
    ap.add_argument('--no-stretch', action='store_true', help='no tempo change (the loop length then follows the bars)')
    args = ap.parse_args()
    src, out_path, D, pre, xf = args.src, args.out, args.dur, args.pre, args.xf
    x = A.load(src)
    T = bar_table(x)
    cand = plans(T, D, args.max_stretch, args.start_bar, args.bars)
    if not cand:
        raise SystemExit('no plan within the stretch limit; raise --max-stretch or use --bars')
    # diversify: best per (s, n) pair, top K by score
    top = cand[:args.top]
    best = None
    for sc, s, n, f in top:
        seg, info = render(x, T, s, n, D, pre, xf, not args.no_stretch)
        r = seam.check(seg, n, pre, verbose=False)
        # a mild preference for the planning score and a small stretch
        total = r['cost'] - 0.35 * sc + 12 * abs(np.log(f))
        print(f"  cand start_bar {s:3d} n {n:2d} stretch {f:.4f} score {sc:6.2f} -> seam cost {r['cost']:5.2f} "
              f"(lvl z {r['level_z']:+.1f}, spec z {r['spec_z']:+.1f}, click {r['click_ratio']:.2f}, "
              f"timing {r['timing_dev_ms']:+.1f} ms, gap {r['gap_db']:+.1f}) total {total:.2f}")
        if best is None or total < best[0]:
            best = (total, sc, s, n, f, seg, info, r)
    total, sc, s, n, f, seg, info, r = best
    pk = np.max(np.abs(seg))
    if pk > 0.89:  # keep the sample peak <= -1 dBFS (one constant gain: seam unchanged)
        seg = seg * (0.89 / pk)
    A.save(out_path, seg)
    bar_out = D / n
    plan = dict(source=os.path.basename(src), duration=D, bars=n, bar_s=round(bar_out, 4), pre=pre, xfade=xf,
                start_bar=int(s), plan_score=round(float(sc), 2), seam=r, chords=[T['bars'][s + i]['chord'] for i in range(n)],
                **info, beats=beats_in_film(T, n, D, pre))
    A.dump_json(A.plan_path(out_path), plan)
    print(f"{os.path.basename(out_path)}: D={D:.2f}s = {n} bars @ {plan['out_bpm']:.1f} BPM (src {plan['src_bpm']:.1f}, "
          f"stretch x{f:.4f}), start bar {s}, chords {' '.join(plan['chords'])}")
    seam.check(seg, n, pre)


if __name__ == '__main__':
    main()
