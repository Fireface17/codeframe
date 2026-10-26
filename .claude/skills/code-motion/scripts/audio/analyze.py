#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy"]
# ///
"""Objective look at candidate tracks (we cannot listen): tempo/grid, key, softness,
dynamics of the first 30 s, intro and ending shape, a vocal-likeness hint.

usage: uv run --script analyze.py TRACK [TRACK ...] [--json out.json]
       (TRACK: wav, mp3, ogg, flac, ... anything ffmpeg reads)

Metrics
  bpm, grid_ms     tempo from the beat tracker; std of measured beat attacks around a straight grid
  key, maj_margin  Krumhansl-Schmuckler on a log-chroma (110-2000 Hz); margin = r(best major) - r(best minor)
  hf4k_%           share of spectral energy above 4 kHz (lower = softer / darker)
  centroid_hz      median spectral centroid
  perc_crest_db    crest factor (peak / RMS) of the percussive component (median-filter HPSS); high = hard hits
  onset_peak       99th percentile / mean of the onset envelope: how "spiky" the rhythm is
  lra              loudness range (10th..95th pct of short-term loudness, gated), LU
  intro_s          seconds until short-term loudness first reaches (median - 3 LU): length of the soft intro
  first30          short-term loudness every 3 s over 0..30 s, relative to the track median (LU)
  end              ending shape over the last 12 s: fade (slow decline), ring (final chord decay), cut
  voc              vocal-likeness: 3-8 Hz modulation of the 300-3000 Hz harmonic-band spectral shape,
                   normalized; values well above the batch median deserve a whisper check (vocal_check.py)
"""
import argparse
import os
import sys

import numpy as np
from scipy.ndimage import median_filter

sys.dont_write_bytecode = True  # keep the shared skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import audiolib as A  # noqa: E402

NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
KS_MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KS_MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def chroma(S, fq, lo=80, hi=2500):
    """Peak-picked chroma: only spectral local maxima (partials) count, so the noise
    floor and drums do not flatten the pitch-class profile. Use a long FFT."""
    band = (fq >= lo) & (fq < hi)
    pc = np.round(12 * np.log2(fq[band] / 440) + 9).astype(int) % 12  # 0 = C
    P = S[:, band] ** 2
    pk = np.zeros_like(P, dtype=bool)
    pk[:, 1:-1] = (P[:, 1:-1] > P[:, :-2]) & (P[:, 1:-1] > P[:, 2:])
    Q = np.sqrt(P * pk)
    return np.stack([Q[:, pc == c].sum(1) for c in range(12)], axis=1)


def key_of(cvec):
    best = []
    for mode, prof in (('major', KS_MAJ), ('minor', KS_MIN)):
        r = [np.corrcoef(np.roll(prof, k), cvec)[0, 1] for k in range(12)]
        k = int(np.argmax(r))
        best.append((r[k], f'{NAMES[k]} {mode}', mode))
    best.sort(reverse=True)
    rmaj = [b for b in best if b[2] == 'major'][0][0]
    rmin = [b for b in best if b[2] == 'minor'][0][0]
    return best[0][1], rmaj - rmin, best[0][0]


def analyze(path):
    x = A.load(path)
    mono = x.mean(0)
    dur = len(mono) / A.SR
    S, fq, fps = A.stft_mag(mono)
    P = S ** 2
    tot = P.sum()
    hf = P[:, fq > 4000].sum() / tot
    cen = np.median((P * fq).sum(1) / (P.sum(1) + 1e-12))

    # HPSS by median filtering (on a decimated spectrogram for speed)
    Sd = S[:, :512]
    H = median_filter(Sd, size=(17, 1))
    Pm = median_filter(Sd, size=(1, 17))
    mask_p = Pm ** 2 / (H ** 2 + Pm ** 2 + 1e-12)
    perc = (Sd * mask_p) ** 2
    perc_env = np.sqrt(perc.sum(1))
    act = perc_env[perc_env > 0.05 * perc_env.max()]
    perc_crest = 20 * np.log10(np.percentile(act, 99.5) / (np.sqrt(np.mean(act ** 2)) + 1e-12))

    g = A.beat_grid(mono)
    on = g['onset']
    onset_peak = np.percentile(on, 99) / (np.mean(on) + 1e-9)

    # key on whole track and on the first 30 s
    SK, fqk, fpsk = A.stft_mag(mono, nfft=8192, hop=2048)
    C = chroma(SK, fqk)
    key, margin, r = key_of(C.mean(0))
    key30, margin30, _ = key_of(C[: int(30 * fpsk)].mean(0))

    # loudness
    I = A.lufs(x)
    t, st = A.short_term(x, 3.0, 0.5)
    gate = st > max(-70, I - 20)
    med = np.median(st[gate])
    lra = np.percentile(st[gate], 95) - np.percentile(st[gate], 10)
    hit = np.where(st >= med - 3)[0]
    intro_s = float(t[hit[0]] - 1.5) if len(hit) else dur
    first30 = [round(float(np.interp(s, t, st) - med), 1) for s in np.arange(1.5, 30, 3)]

    # ending: last 12 s, 0.5 s momentary loudness
    tm, mm = A.short_term(x, 0.4, 0.1)
    tail = tm > dur - 12
    te, me = tm[tail], mm[tail]
    last_loud = te[np.where(me > med - 6)[0][-1]] if np.any(me > med - 6) else te[0]
    after = dur - last_loud
    seg = me[(te > dur - 12) & (te < last_loud)]
    slope = np.polyfit(te[(te > dur - 12) & (te < last_loud)], seg, 1)[0] if len(seg) > 10 else 0
    if after < 0.6:
        end = 'cut'
    elif slope < -0.8:
        end = f'fade ({slope:.1f} LU/s over the last bars, tail {after:.1f}s)'
    else:
        end = f'ring (final chord, tail {after:.1f}s after last full-level note)'

    # vocal-likeness: modulation of the harmonic 300-3000 Hz spectral shape at 3-8 Hz
    band = (fq >= 300) & (fq < 3000)
    Hb = median_filter(S[:, band][:, ::4], size=(9, 1))
    Lb = np.log(Hb + 1e-6)
    Lb = Lb - Lb.mean(1, keepdims=True)  # shape only (formant-ish), not level
    shape_flux = np.sqrt((np.diff(Lb, axis=0) ** 2).mean(1))
    F = np.abs(np.fft.rfft(shape_flux - shape_flux.mean()))
    mf = np.fft.rfftfreq(len(shape_flux), 1 / fps)
    voc = F[(mf >= 3) & (mf < 8)].mean() / (F[(mf >= 0.5) & (mf < 20)].mean() + 1e-12)

    down0 = g['beats'][g['down']]
    return dict(file=os.path.basename(path), dur=round(dur, 2), bpm=round(g['bpm'], 2),
                grid_ms=round(float(np.std(g['resid_ms'])), 1), first_downbeat=round(float(down0), 3),
                key=key, maj_margin=round(margin, 3), key_r=round(r, 3), key30=key30,
                hf4k_pct=round(100 * hf, 2), centroid_hz=int(cen), perc_crest_db=round(perc_crest, 1),
                onset_peak=round(onset_peak, 2), lufs=round(I, 1), lra=round(lra, 1), intro_s=round(intro_s, 1),
                first30=first30, end=end, voc=round(voc, 3))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('tracks', nargs='+', metavar='TRACK', help='audio files to analyze')
    ap.add_argument('--json', metavar='FILE', help='also write the metrics of all tracks to FILE')
    args = ap.parse_args()
    rows = []
    for p in args.tracks:
        r = analyze(p)
        rows.append(r)
        print(f"{r['file']:>14} {r['dur']:6.1f}s {r['bpm']:6.1f}bpm grid±{r['grid_ms']:4.1f}ms {r['key']:>9} "
              f"(m{r['maj_margin']:+.2f}, 30s:{r['key30']}) hf>4k {r['hf4k_pct']:4.1f}% cen {r['centroid_hz']:4d} "
              f"pcrest {r['perc_crest_db']:4.1f} onpk {r['onset_peak']:4.1f} LRA {r['lra']:4.1f} "
              f"intro {r['intro_s']:4.1f}s voc {r['voc']:.2f}\n               first30 {r['first30']}  end: {r['end']}",
              flush=True)
    if args.json:
        A.dump_json(args.json, rows)


if __name__ == '__main__':
    main()
