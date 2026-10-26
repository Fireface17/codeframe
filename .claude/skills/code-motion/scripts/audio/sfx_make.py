#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy"]
# ///
"""Prepare SFX for mix.py: recordings in -> trimmed, faded, level-normalized NAME.wav + meta.json out.

usage: uv run --script sfx_make.py SRC_DIR OUT_DIR [--spec SPEC.json] [--source TEXT] [--license TEXT] [--url URL]

  SRC_DIR   folder with the downloaded recordings (wav, ogg, mp3, flac, ... anything ffmpeg reads; subfolders
            are searched too)
  OUT_DIR   the SFX folder to write: NAME.wav (48 kHz mono, 32-bit PCM with 24-bit resolution) and meta.json.
            An existing meta.json is updated, not replaced, so sounds can be added to a copy of the default set.
  --spec    JSON object {"whoosh_1": {"src": "168-preview.mp3", "maxdur": 0.58, "fin": 0.02, "fout": 0.15,
            "hp": 90, "lp": 9000, "source": "...", "license": "...", "url": "..."}, ...}
              src      file in SRC_DIR (a path relative to it, or just the file name)
              maxdur   keep only the most energetic window of this length, s
              fin/fout cosine fade-in / fade-out, s (defaults 0.002 / 0.010)
              hp/lp    2nd-order high-/low-pass, Hz
              source/license/url   provenance written to meta.json (note: free text, kept as is)
            Without --spec every audio file in SRC_DIR becomes a sound named after the file: name it
            <class>_<n> (hit_3.wav, whoosh_4.mp3, ...); <class> is what events.json asks for ("whoosh").
  --source/--license/--url   provenance for the sounds that bring none of their own.

Per sound: silence trim at -45 dB, optional window around the energy peak (maxdur), DC removal, optional
high-/low-pass, cosine fades, re-trim, then scaled so the loudest 200 ms window has RMS -26 dBFS (peak capped
at -3 dBFS). meta.json gets what mix.py needs (e200_db, peak_db) plus duration, centroid, share above 4 kHz
and the provenance.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

sys.dont_write_bytecode = True  # keep the shared skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import audiolib as A  # noqa: E402

SR = A.SR
AUDIO_EXT = ('.wav', '.ogg', '.mp3', '.flac', '.m4a', '.aac', '.aif', '.aiff', '.opus')


def e200(y):
    """Loudest 200 ms window, power in dB (the scale mix.py uses)."""
    w = int(0.2 * SR)
    if len(y) <= w:
        return 10 * np.log10(np.sum(y ** 2) / w + 1e-14)
    c = np.concatenate([[0], np.cumsum(y ** 2)])
    return 10 * np.log10(np.max(c[w:] - c[:-w]) / w + 1e-14)


def decode_mono48(path):
    """Any audio file -> 48 kHz mono float64 (ffmpeg does the decoding, downmix and resampling)."""
    with tempfile.TemporaryDirectory() as d:
        tmp = os.path.join(d, 'x.wav')
        r = subprocess.run([A.ffmpeg(), '-v', 'error', '-y', '-i', path, '-vn', '-ac', '1', '-ar', str(SR),
                            '-c:a', 'pcm_f32le', tmp], capture_output=True, text=True)
        if r.returncode:
            raise SystemExit(f'ffmpeg could not decode {path}: {r.stderr.strip()[-300:]}')
        return wavfile.read(tmp)[1].astype(np.float64)


def build(x, o):
    """Trim / filter / fade / level one sound. x: 48 kHz mono float64, o: options. -> (x, meta without provenance)."""
    x = x - x.mean()
    e = np.abs(x)
    if e.max() == 0:
        raise SystemExit('silent file')
    idx = np.where(e > e.max() * 10 ** (-45 / 20))[0]
    x = x[idx[0]:idx[-1] + 1]
    if 'maxdur' in o and len(x) > o['maxdur'] * SR:
        n = int(o['maxdur'] * SR)
        w = int(0.04 * SR)
        env = np.convolve(x ** 2, np.ones(w) / w, 'same')
        # keep the window with the most energy
        c = np.concatenate([[0], np.cumsum(env)])
        best = int(np.argmax(c[n:] - c[:-n]))
        x = x[best:best + n]
    if o.get('hp'):
        x = sosfilt(butter(2, o['hp'], 'highpass', fs=SR, output='sos'), x)
    if o.get('lp'):
        x = sosfilt(butter(2, o['lp'], 'lowpass', fs=SR, output='sos'), x)
    n = len(x)
    fi, fo = int(o.get('fin', 0.002) * SR), int(o.get('fout', 0.010) * SR)
    fi, fo = min(fi, n), min(fo, n)   # a fade longer than the sound is cut to its length
    x[:fi] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi))
    x[n - fo:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))
    # re-trim any quiet lead / tail created by the window
    e = np.abs(x)
    idx = np.where(e > e.max() * 10 ** (-50 / 20))[0]
    x = x[idx[0]:idx[-1] + 1]
    g = 10 ** ((-26 - e200(x)) / 20)
    pk = np.abs(x).max() * g
    if pk > 10 ** (-3 / 20):
        g *= 10 ** (-3 / 20) / pk
    x = x * g
    S = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    meta = dict(dur=round(len(x) / SR, 3), peak_db=round(20 * np.log10(np.abs(x).max()), 1),
                e200_db=round(e200(x), 1), centroid_hz=int((S * f).sum() / S.sum()),
                hf4k_pct=round(100 * S[f > 4000].sum() / S.sum(), 1))
    return x, meta


def find_source(src_dir, ref):
    """A file of SRC_DIR by relative path or by bare file name (searched in subfolders)."""
    p = os.path.join(src_dir, ref)
    if os.path.isfile(p):
        return p
    hits = [os.path.join(r, f) for r, _, fs in os.walk(src_dir) for f in fs if f == os.path.basename(ref)]
    if len(hits) == 1:
        return hits[0]
    raise SystemExit(f'{ref}: ' + ('not found in ' + src_dir if not hits else 'ambiguous: ' + ', '.join(sorted(hits))))


def auto_spec(src_dir, out_dir):
    """No --spec: every audio file of SRC_DIR (outside OUT_DIR) becomes a sound named after the file."""
    out_real = os.path.realpath(out_dir)
    spec = {}
    for r, _, fs in os.walk(src_dir):
        if os.path.realpath(r).startswith(out_real):
            continue
        for f in sorted(fs):
            if f.lower().endswith(AUDIO_EXT) and not f.startswith('.'):
                name = os.path.splitext(f)[0]
                if name in spec:
                    raise SystemExit(f'two files would become "{name}"; use --spec to name them')
                spec[name] = dict(src=os.path.relpath(os.path.join(r, f), src_dir))
    return spec


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src_dir', metavar='SRC_DIR')
    ap.add_argument('out_dir', metavar='OUT_DIR')
    ap.add_argument('--spec', metavar='SPEC.json', help='which files become which sounds, with options and provenance')
    ap.add_argument('--source', default='', help='provenance text for sounds without their own')
    ap.add_argument('--license', default='', help='licence of the sounds without their own (written to meta.json)')
    ap.add_argument('--url', default='', help='page the sounds come from')
    args = ap.parse_args()
    if not os.path.isdir(args.src_dir):
        raise SystemExit(f'{args.src_dir}: not a folder')
    if args.spec:
        with open(args.spec, encoding='utf-8') as f:
            spec = json.load(f)
    else:
        spec = auto_spec(args.src_dir, args.out_dir)
    if not spec:
        raise SystemExit(f'no audio files in {args.src_dir}')
    os.makedirs(args.out_dir, exist_ok=True)
    meta_path = os.path.join(args.out_dir, 'meta.json')
    metas = {}
    if os.path.exists(meta_path):
        with open(meta_path, encoding='utf-8') as f:
            metas = json.load(f)
    for name, o in spec.items():
        if not re.fullmatch(r'[A-Za-z0-9_-]+', name):
            raise SystemExit(f'bad sound name "{name}": use letters, digits, _ and -')
        if not o.get('src'):
            raise SystemExit(f'{name}: "src" (the source file) is missing in the spec')
        src = find_source(args.src_dir, o['src'])
        x, meta = build(decode_mono48(src), o)
        wavfile.write(os.path.join(args.out_dir, name + '.wav'), SR, (np.clip(x, -1, 1) * 8388607).astype(np.int32) << 8)
        meta = dict(file=name + '.wav', **meta,
                    source=o.get('source') or args.source or os.path.basename(src),
                    license=o.get('license') or args.license or 'unspecified: check before sharing',
                    url=o.get('url') or args.url)
        if o.get('note'):
            meta['note'] = o['note']
        metas[name] = meta
        print(f"{name:11} {meta['dur']:5.3f}s peak {meta['peak_db']:5.1f} e200 {meta['e200_db']:6.1f} cen {meta['centroid_hz']:5d} Hz "
              f"hf4k {meta['hf4k_pct']:5.1f}%  <- {meta['source']}")
    A.dump_json(meta_path, dict(sorted(metas.items())), ensure_ascii=False)
    print(f'{len(spec)} sound(s) -> {args.out_dir}, meta.json has {len(metas)} entries')


if __name__ == '__main__':
    main()
