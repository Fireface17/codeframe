#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy"]
# ///
"""Cut a music track to an exact duration on bar lines, with a natural ending (for films that do not loop).

usage: uv run --script edit.py SRC OUT.wav DURATION
         [--start-bar N] [--end auto|ring|fade] [--fade-in 0.35] [--plan "f0:f1:s0,..." [--fade-from T]]
         [--no-match]
       (SRC: wav, mp3, ogg, ... anything ffmpeg reads; DURATION in seconds)

How the auto plan works (bar map from bars.py: straight beat grid, downbeats, chords):
  * start   on the downbeat of the first bar that is not near-silent (or --start-bar), with a
            short raised-cosine fade-in (default 0.35 s) so nothing hits at frame 0.
  * ending  'ring': the track's own final cadence (last full bar before the drop into silence)
            and its natural decay; its downbeat lands on a film bar line, the decay is trimmed
            with a short cosine fade exactly at DURATION if it is longer than needed.
            'fade': a run of tonic-chord bars from the track; a cos^2 fade of 1.5-2.1 s that
            starts on a beat of the tonic bar and reaches silence exactly at DURATION.
            'auto' = ring when the track ends on a ringing tonic chord, otherwise fade.
  * middle  the body runs straight from the start bar; at most one jump (bar line -> bar line)
            joins it to the ending block. The join is chosen for matching chords on both sides,
            similar loudness and phrase position (multiples of 4/2 bars). Joins are 12 ms
            equal-power crossfades placed 8 ms before the downbeat.
  * output  48 kHz stereo 16-bit wav + OUT.plan.json (segments, film-time beat grid for the
            animation, ending type). Loudness is set later by mix.py.
  level     a segment after a jump gets a clip gain matching the bar before the join
            (e.g. a loud final chord after a quiet intro), off with --no-match.
  --plan    manual override: "film_start:film_end:source_start,..." (seconds).
"""
import argparse
import os
import sys

import numpy as np

sys.dont_write_bytecode = True  # keep the shared skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import audiolib as A  # noqa: E402
from bars import bar_table, TRI  # noqa: E402
from analyze import NAMES, KS_MAJ, KS_MIN, chroma  # noqa: E402

PRE, XF = 0.008, 0.012
TAIL_MIN = 1.4


def csim(a, b):
    return float(TRI[a] @ TRI[b])  # 1 same chord, ~0.67 relative/shared two notes


def tonic_of(x):
    S, fq, fps = A.stft_mag(x.mean(0), nfft=8192, hop=2048)
    v = chroma(S, fq).mean(0)
    best = max(((np.corrcoef(np.roll(p, k), v)[0, 1], k, q) for p, q in ((KS_MAJ, ''), (KS_MIN, 'm'))
                for k in range(12)))
    return NAMES[best[1]] + best[2]


def ring_ending(T, dur):
    """Index of the cadence bar (last bar at full level before the drop) if it rings out."""
    bars = T['bars']
    L = np.array([b['lufs'] for b in bars])
    med = np.median(L[L > -60])
    full = np.where(L > med - 3)[0]
    if not len(full):
        return None, 0.0
    last = full[-1]
    # cadence bar = first bar after the last full bar whose level drops, or the last full bar itself
    e = last + 1 if last + 1 < len(bars) and L[last + 1] > med - 12 else last
    avail = dur - bars[e]['t']
    return e, avail


def plan_auto(T, x, D, start_bar=None, end_mode='auto'):
    bars = T['bars']
    B = T['period'] * T['bpb']
    beat = T['period']
    dur = x.shape[1] / A.SR
    L = np.array([b['lufs'] for b in bars])
    med = np.median(L[L > -60])
    ch = [b['chord'] for b in bars]
    tonic = tonic_of(x)
    if start_bar is None:
        start_bar = int(np.where(L > med - 14)[0][0])
    s = start_bar
    e, avail = ring_ending(T, dur)
    ends_on_tonic = e is not None and csim(ch[e], tonic) > 0.99 or (e is not None and csim(ch[e], tonic) > 0.6
                                                                    and L[e] < med - 2)
    mode = end_mode
    if mode == 'auto':
        mode = 'ring' if (e is not None and ends_on_tonic and avail > 2.0 and
                          (e + 1 >= len(L) or L[min(e + 1, len(L) - 1)] < med - 15)) else 'fade'
    best = None
    for n in range(1, int(D / B) + 2):
        t_r = n * B
        tail = D - t_r
        if mode == 'ring':
            if tail < TAIL_MIN or tail > avail:
                continue
            # ending block = approach bars (e-k .. e-1) + cadence bar e; body = s .. s+n-k-1
            for k in range(0, n):
                m = n - k
                j = e - k  # first source bar of the ending block
                if s + m - 1 >= len(bars) or j <= s:
                    continue
                cont = (s + m == j)
                sc = 4.5 if cont else (2 * csim(ch[s + m], ch[j]) + csim(ch[s + m - 1], ch[j - 1])
                                       - 0.25 * abs(L[s + m - 1] - L[j - 1]) - 0.15 * abs(L[min(s + m, len(L) - 1)] - L[j])
                                       + 0.6 * (m % 4 == 0) + 0.3 * (m % 2 == 0))
                sc += 0.4 * min(k, 2) - 0.35 * abs(tail - 2.4) + 0.06 * m - (1.0 if m < 3 else 0.0)
                jump = abs(np.mean(L[j:e + 1]) - np.mean(L[s:s + m]))  # level arc body -> ending
                sc -= 0.3 * max(0.0, jump - 2.0)
                cand = (sc, n, m, j, tail, 'ring')
                best = max(best, cand) if best else cand
        else:
            if tail < 1.5 or tail > B + 2.1:
                continue
            r = int(np.ceil(tail / B))  # tonic bars needed under the fade
            for m in range(1, n + 1):
                for j in range(s + 1, len(bars) - r):
                    if L[j] < med - 6 or any(csim(ch[j + i], tonic) < 0.99 for i in range(r)):
                        continue
                    if j >= len(bars) - 2:
                        continue
                    # the bar right before the tonic run comes from the body (s+m-1) unless continuous
                    k = n - m  # bars between body and tonic run taken from j-k .. j-1
                    jj = j - k
                    if jj <= s or s + m - 1 >= len(bars):
                        continue
                    cont = (s + m == jj)
                    sc = 4.5 if cont else (2 * csim(ch[min(s + m, len(ch) - 1)], ch[jj]) + csim(ch[s + m - 1], ch[jj - 1])
                                           - 0.25 * abs(L[s + m - 1] - L[jj - 1])
                                           - 0.15 * abs(L[min(s + m, len(L) - 1)] - L[jj])
                                           + 0.6 * (m % 4 == 0) + 0.3 * (m % 2 == 0))
                    sc += 0.06 * m - (1.0 if m < 3 else 0.0)
                    jump = abs(np.mean(L[jj:j + r]) - np.mean(L[s:s + m]))  # level arc body -> ending
                    sc -= 0.3 * max(0.0, jump - 2.0)
                    sc -= 0.3 * abs(tail - 2.0)
                    cand = (sc, n, m, jj, tail, 'fade')
                    best = max(best, cand) if best else cand
    if best is None:
        raise SystemExit(f'no plan for {D}s with ending "{mode}"; try --end fade or another --start-bar')
    sc, n, m, j, tail, mode = best
    t0 = bars[s]['t']
    segs = [(0.0, m * B, t0)]
    if j != s + m:
        segs.append((m * B, D, bars[j]['t']))
    else:
        segs = [(0.0, D, t0)]
    sc, n, m, j, s = float(sc), int(n), int(m), int(j), int(s)
    info = dict(mode=mode, score=round(sc, 2), start_bar=s, body_bars=m, join_to_bar=j, bars_total=n,
                ending_downbeat=round(n * B, 3), tail=round(tail, 3), tonic=tonic,
                chords=[ch[s + i] for i in range(m)] + [ch[j + i] for i in range(n - m + int(np.ceil(tail / B)))
                                                       if j + i < len(ch)])
    if mode == 'ring':
        info['ring_trim_fade'] = round(float(max(0.0, min(1.0, avail - tail))), 3) if avail > tail + 0.05 else 0.0
        info['cadence_bar'] = int(e)
    else:
        fs = n * B
        while D - fs > 2.1:
            fs += beat
        info['fade_start'] = round(fs, 3)
    return segs, info


def seg_gains(x, segs, bar, match=True):
    """Clip gain per segment: a jump into a louder (or quieter) part of the track is
    matched to the level of the bar before the join (|change| > 1 dB, within -12..+3 dB)."""
    S = lambda s: int(round(s * A.SR))  # noqa: E731
    g = [0.0]
    for n in range(1, len(segs)):
        pf0, pf1, ps0 = segs[n - 1]
        f0, f1, s0 = segs[n]
        pe = ps0 + (pf1 - pf0)
        # loudest momentary (400 ms) level of the bar before vs the bar after the join
        before = A.short_term(x[:, S(max(ps0, pe - bar)):S(pe)], 0.4, 0.05)[1].max()
        after = A.short_term(x[:, S(s0):S(s0 + min(bar, f1 - f0))], 0.4, 0.05)[1].max()
        d = float(np.clip(before + g[-1] - after, -12, 3)) if match else 0.0
        g.append(d if abs(d) > 1.0 else 0.0)
    return g


def render(x, D, segs, fade_in, info, gains=None):
    S = lambda s: int(round(s * A.SR))  # noqa: E731
    out = np.zeros((2, S(D)))
    gains = gains or [0.0] * len(segs)
    for n, (f0, f1, s0) in enumerate(segs):
        a = f0 - (PRE if n else 0)
        last = n == len(segs) - 1
        src0 = S(s0 - (f0 - a))
        piece = x[:, max(0, src0):src0 + S(f1 - a + (0 if last else XF))].copy()
        if src0 < 0:
            piece = np.pad(piece, ((0, 0), (-src0, 0)))
        k = S(XF)
        if n:
            piece[:, :k] *= np.sin(np.linspace(0, np.pi / 2, k)) ** 2
        if not last:
            piece[:, -k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
        piece *= 10 ** (gains[n] / 20)
        i0 = S(a)
        mlen = min(piece.shape[1], out.shape[1] - i0)
        out[:, i0:i0 + mlen] += piece[:, :mlen]
    t = np.arange(out.shape[1]) / A.SR
    if fade_in > 0:
        out *= np.where(t < fade_in, 0.5 - 0.5 * np.cos(np.pi * np.clip(t / fade_in, 0, 1)), 1.0)
    else:
        out *= np.clip(t / 0.015, 0, 1)
    mode = info.get('mode')
    if mode == 'fade':
        fs = info['fade_start']
        out *= np.where(t > fs, np.cos(np.pi / 2 * np.clip((t - fs) / (D - fs), 0, 1)) ** 2, 1.0)
    else:  # ring (or manual): a short cosine fade so the file ends in silence exactly at D
        tf = info.get('ring_trim_fade', 0.0) or 0.0
        tf = max(tf, 0.08)
        out *= np.where(t > D - tf, np.cos(np.pi / 2 * np.clip((t - (D - tf)) / tf, 0, 1)), 1.0)
    return out


def film_beats(T, segs, D):
    """Film-time beat grid (for syncing animation), following the segments."""
    per, first = T['period'], T['first_downbeat']
    beats = []
    for f0, f1, s0 in segs:
        k0 = int(np.ceil((s0 - first) / per - 1e-6))
        while True:
            sb = first + k0 * per
            ft = f0 + (sb - s0)
            if ft >= f1 - 1e-6:
                break
            if ft >= f0 - 1e-6:
                beats.append(dict(t=round(ft, 4), downbeat=bool(k0 % T['bpb'] == 0)))
            k0 += 1
    return [b for b in beats if b['t'] < D]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', metavar='SRC', help='source track')
    ap.add_argument('out', metavar='OUT.wav', help='the cut to write (OUT.plan.json is written next to it)')
    ap.add_argument('dur', metavar='DURATION', type=float, help='exact length, seconds')
    ap.add_argument('--start-bar', type=int, help='force the start bar (index from bars.py)')
    ap.add_argument('--end', default='auto', choices=['auto', 'ring', 'fade'], help='ending type (default auto)')
    ap.add_argument('--fade-in', type=float, default=0.35, help='fade-in length, s (default 0.35; 0 = 15 ms de-click only)')
    ap.add_argument('--plan', metavar='F0:F1:S0,...', help='manual segments "film_start:film_end:source_start,..." in seconds')
    ap.add_argument('--fade-from', type=float, metavar='T', help='with --plan: start a closing fade at film time T')
    ap.add_argument('--no-match', action='store_true', help='no level matching after a jump')
    args = ap.parse_args()
    src, out_path, D = args.src, args.out, args.dur
    x = A.load(src)
    T = bar_table(x)
    if args.plan:
        segs = [tuple(map(float, s.split(':'))) for s in args.plan.split(',')]
        info = dict(mode='manual', fade_start=args.fade_from)
        if info['fade_start'] is not None:
            info['mode'] = 'fade'
    else:
        segs, info = plan_auto(T, x, D, args.start_bar, args.end)
    gains = seg_gains(x, segs, T['period'] * T['bpb'], not args.no_match)
    info['segment_gain_db'] = [round(v, 1) for v in gains]
    y = render(x, D, segs, args.fade_in, info, gains)
    A.save(out_path, y)
    plan = dict(source=os.path.basename(src), duration=D, bpm=round(T['bpm'], 3), bar_s=round(T['period'] * 4, 4),
                segments=[dict(film_start=round(a, 4), film_end=round(b, 4), source_start=round(c, 4)) for a, b, c in segs],
                **info, beats=film_beats(T, segs, D))
    A.dump_json(A.plan_path(out_path), plan)
    desc = ', '.join(f'{a:.2f}-{b:.2f}s <- src {c:.2f}s' for a, b, c in segs)
    print(f"{os.path.basename(out_path)}: {D:.2f}s @ {T['bpm']:.1f} BPM | {desc} | end={info.get('mode')} "
          f"{'tail %.2fs' % info['tail'] if 'tail' in info else ''} "
          f"{'fade from %.2fs' % info['fade_start'] if info.get('fade_start') else ''} | "
          f"gains {info['segment_gain_db']} | chords {' '.join(info.get('chords', []))}")


if __name__ == '__main__':
    main()
