#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy"]
# ///
"""Final audio for a code-motion film: music (ducked under the voice) + voice-over + recorded SFX.

usage:
  uv run --script mix.py MUSIC.wav|- VO.wav|- EVENTS.json OUT.wav
         [--no-music] [--lufs -14] [--tp -1] [--sfx-dir DIR] [options]

  MUSIC.wav    the music bed: the loop from loop.py or the cut from edit.py (any file ffmpeg reads);
               "-" = no music: voice + SFX only (the same as --no-music, but explicit)
  VO.wav       the voice-over (any sample rate / channels; padded or trimmed to the film length);
               "-" = no voice-over: music + SFX, nothing to duck
  EVENTS.json  SFX cues [{"t": 1.20, "name": "hit", "gain_db": 0}, ...] or {"duration": D, "events": [...], "cuts": [...]}
               (what `node render.mjs events` writes); t in seconds of film time, gain_db optional;
               "-" = no SFX. name = a file in the SFX folder without ".wav": "hit" rotates through hit_1,
               hit_2, ... (never the same twice in a row), "hit_2" forces one variant.
               Classes shipped: hit thud paper whoosh scribble boom mech (any <name>_<n>.wav you add works too).
               cuts (optional, from window.CUTS): scene cut times; a sound whose audible tail rings past the next
               cut after its start gets a WARNING (trim it: sfx_make.py maxdur/fout, or move the event).
  OUT.wav      48 kHz stereo 16-bit.
  --no-music   voice + SFX only; the music file is still accepted (it may supply the length), so one command
               line serves both deliveries: with and without the music.

Length of the output: --dur if given, else "duration" of EVENTS.json, else the longest input (music file, even
with --no-music, or voice-over). Music is padded with silence / trimmed (20 ms fade-out) to that length; a loop
that is only a few samples off is left alone, so the wrap stays seamless.

What it does
  * VO: 70 Hz high-pass, levelled to -16 LUFS integrated (BS.1770 gated) before the master stage.
  * Music: levelled to (VO - 3.5 LU) when not ducked (--bed-rel), ducked by 9 dB (--duck, in the 8..10 dB range)
    under speech: side-chain = voice envelope (100 Hz-5 kHz, 10 ms RMS), hold 120 ms, attack 80 ms, release 400 ms,
    80 ms look-ahead so the dip is complete when the first syllable starts. In pauses / before / after the voice the
    music returns to full level (a loop ends in a pause on purpose: no level jump at the wrap).
    Without a voice-over the music simply stays at full bed level.
  * SFX: loudness is set against the VOICE, not by file peak: each sound's loudest 200 ms window (RMS) is put
    --sfx-rel (-6 dB) under the 90th-percentile speech level (same 200 ms measure), plus a class offset
    (hit 0, thud -1, paper -2, whoosh -2, scribble -3, boom -2, mech -4), plus gain_db of the event. Short sounds have a
    much higher crest than speech, so a second rule caps the sample peak at (voice peak - 4 dB + the same offsets):
    hits/mech clicks are limited by it, scribble/whoosh by the 200 ms rule. Repeated small sounds
    get quieter: a sound of the same name within 0.35 s of the previous one is lowered 1.5 dB per repeat
    (max -5 dB); +-0.5 dB deterministic jitter. Without a voice-over the music bed (raised by what --bed-rel
    lowers it) stands in for the voice as the reference, so SFX keep the same distance to the music.
  * Same room: voice and SFX bus go through the same small-room impulse response (RT60 0.22 s, 6 ms pre-delay,
    dark; wet -24 dB on the voice, -16 dB on the SFX), so the recordings do not sound pasted on.
  * Master: --lufs integrated (default -14 for reels/shorts; use -16 for an explainer), true peak <= --tp
    (default -1.0 dBTP; 4x oversampled look-ahead limiter, gain iterated so the limiter does not leave the
    mix below target). No fade-in/out: a loop must wrap, a cut from edit.py brings its own ending.
  * SFX folder: ../../assets/sfx next to this script, or --sfx-dir DIR (a folder with NAME_N.wav files and,
    best, the meta.json that sfx_make.py writes; a sound missing from meta.json is measured on the fly).
    --sfx-dir replaces the default folder: copy the default sounds into yours if you want to keep them.
Options: --duck 9  --bed-rel -3.5  --sfx-rel -6  --attack 0.08  --release 0.4  --lookahead 0.08
         --vo-offset 0.0 (delay the voice, s)  --room-vo -24  --room-sfx -16  --no-room  --dur D
         --stems (also OUT.music.wav / OUT.vo.wav / OUT.sfx.wav at the final gains)
"""
import argparse
import glob
import json
import os
import re
import sys

import numpy as np
from scipy.ndimage import maximum_filter1d
from scipy.signal import butter, fftconvolve, sosfilt, sosfiltfilt

HERE = os.path.dirname(os.path.realpath(__file__))
sys.dont_write_bytecode = True  # keep the shared skill folder free of __pycache__
sys.path.insert(0, HERE)
import audiolib as A  # noqa: E402

SR = A.SR
DEFAULT_SFX_DIR = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'sfx'))
CLASS_OFFSET = {'hit': 0.0, 'thud': -1.0, 'paper': -2.0, 'whoosh': -2.0, 'scribble': -3.0, 'boom': -2.0, 'mech': -4.0,
                # names of older SFX folders (interface sounds, no longer shipped): kept so old projects mix the same
                'pop': 0.0, 'tick': -6.0, 'click': -3.0, 'ding': -4.0}
SFX_ONLY_REF = (-15.0, -1.0)  # speech level (200 ms, P90) and peak, dB, of a typical voice at -16 LUFS
LEN_TOL = int(0.0005 * SR)  # a loop this many samples off the film length is left alone (rounding of D)


def finish(y, target, tp):
    """Gain to the loudness target, true-peak limit, re-iterate so we land on target."""
    g = 0.0
    z = y
    for _ in range(5):
        z = y * 10 ** ((target - A.lufs(y) + g) / 20)
        z = A.true_peak_limit(z, tp)
        err = target - A.lufs(z)
        if abs(err) < 0.05:
            break
        g += err
    return z


def duck_envelope(vo, n, duck_db, attack, release, look, hold=0.12):
    """Gain (linear, per sample) for the music from the voice envelope; also returns the 0..1 envelope."""
    v = sosfiltfilt(butter(2, [100, 5000], 'bandpass', fs=SR, output='sos'), vo.mean(0))
    hop = int(0.01 * SR)
    m = len(v) // hop
    rms = np.sqrt(np.mean(v[: m * hop].reshape(m, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    speech = np.percentile(db[db > db.max() - 40], 90)
    act = np.clip((db - (speech - 26)) / 10, 0, 1)
    h = max(1, int(hold / 0.01))
    act = maximum_filter1d(act, size=h, origin=(h - 1) // 2)
    k = int(round(look / 0.01))
    act = np.concatenate([act[k:], np.zeros(k)])
    aa, ar = np.exp(-0.01 / (attack / 2.2)), np.exp(-0.01 / (release / 2.2))
    env = np.zeros_like(act)
    cur = 0.0
    for i, a in enumerate(act):
        c = aa if a > cur else ar
        cur = c * cur + (1 - c) * a
        env[i] = cur
    t_frames = (np.arange(m) + 0.5) * hop
    env_s = np.interp(np.arange(n), t_frames, env, left=env[0] if m else 0, right=0.0)
    return 10 ** (-duck_db * env_s / 20), env_s


def level200(y):
    """Loudest 200 ms window, power in dB (same scale as e200_db in the SFX meta.json)."""
    w = int(0.2 * SR)
    c = np.concatenate([[0], np.cumsum(y ** 2)])
    return 10 * np.log10(np.max(c[w:] - c[:-w]) / w + 1e-14) if len(y) > w else 10 * np.log10(np.sum(y ** 2) / w + 1e-14)


def speech_level(vo):
    """90th percentile of the 200 ms RMS (dB) over the active parts of the voice."""
    m = vo.mean(0)
    w, h = int(0.2 * SR), int(0.05 * SR)
    c = np.concatenate([[0], np.cumsum(m ** 2)])
    st = np.arange(0, len(m) - w, h)
    db = 10 * np.log10((c[st + w] - c[st]) / w + 1e-14)
    return float(np.percentile(db[db > db.max() - 30], 90))


def peak_level(x):
    """99.9th percentile of the absolute sample value, dBFS."""
    return float(20 * np.log10(np.percentile(np.abs(x), 99.9) + 1e-12))


def room_ir(seed, rt60=0.22, pre=0.006, lp=6500):
    rng = np.random.default_rng(seed)
    n = int((pre + rt60 * 1.1) * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-6.91 * np.clip(t - pre, 0, None) / rt60)
    ir[: int(pre * SR)] = 0
    ir = sosfilt(butter(2, lp, 'lowpass', fs=SR, output='sos'), ir)
    return ir / np.sqrt(np.sum(ir ** 2))


def apply_room(x, wet_db, seed0=11):
    wet = np.stack([fftconvolve(x[c], room_ir(seed0 + c))[: x.shape[1]] for c in range(2)])
    return x + wet * 10 ** (wet_db / 20)


def load_events(path):
    """-> (events sorted by time, duration in seconds or None). '-' = no events."""
    if path == '-':
        return [], None
    if not os.path.exists(path):
        raise SystemExit(f'{path}: events file not found')
    with open(path, encoding='utf-8') as f:
        ev = json.load(f)
    dur = None
    if isinstance(ev, dict):
        dur = ev.get('duration')
        ev = ev.get('events', [])
    return sorted(ev, key=lambda e: e['t']), (float(dur) if dur else None)


def load_cuts(path):
    """Scene cut times from EVENTS.json ("cuts", written when the film sets window.CUTS), sorted; [] if none."""
    if path == '-' or not os.path.exists(path):
        return []
    with open(path, encoding='utf-8') as f:
        ev = json.load(f)
    return sorted(float(c) for c in ev.get('cuts', [])) if isinstance(ev, dict) else []


def audible_len(x, rel_db=-40.0):
    """Seconds until the sound falls for good below rel_db under its peak (what the ear hears as its tail)."""
    a = np.abs(x)
    idx = np.where(a > a.max() * 10 ** (rel_db / 20))[0]
    return (idx[-1] + 1) / SR if len(idx) else 0.0


def load_meta(sfx_dir):
    p = os.path.join(sfx_dir, 'meta.json')
    if os.path.exists(p):
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    return {}


def sound_names(sfx_dir):
    """Sound classes available in the folder (file names without the _N suffix)."""
    return sorted({re.sub(r'_\d+$', '', os.path.basename(f)[:-4]) for f in glob.glob(os.path.join(sfx_dir, '*.wav'))})


def find_variants(sfx_dir, name):
    """'hit' -> hit_1.wav, hit_2.wav, ...; 'hit_2' -> that one file; a plain NAME.wav also works."""
    if name.rsplit('_', 1)[-1].isdigit():
        variants = [os.path.join(sfx_dir, name + '.wav')]
    else:
        variants = sorted(glob.glob(os.path.join(glob.escape(sfx_dir), glob.escape(name) + '_*.wav')))
    if not variants or not os.path.exists(variants[0]):
        variants = [os.path.join(sfx_dir, name + '.wav')]
    return [v for v in variants if os.path.exists(v)]


def render_sfx(events, n, ref_db, ref_peak_db, sfx_dir, rel, verbose=True, cuts=()):
    """Mono sounds placed on a stereo bus at levels set against the reference (voice or music stand-in)."""
    meta = load_meta(sfx_dir)
    rng = np.random.default_rng(7)
    bus = np.zeros((2, n))
    last = {}      # name -> (t, repeat count)
    rot = {}       # name -> last variant index
    cache = {}
    missing = {}   # name -> number of skipped events
    measured = set()
    rows = []
    for e in events:
        name, t = str(e['name']), float(e['t'])
        cls = name.split('_')[0]
        variants = find_variants(sfx_dir, name)
        if not variants:
            missing[name] = missing.get(name, 0) + 1
            continue
        if t < 0:
            print(f'WARNING: event {name} at {t:.2f}s is before the start; skipped')
            continue
        k = int(rng.integers(len(variants)))
        if len(variants) > 1 and rot.get(name) == k:
            k = (k + 1 + int(rng.integers(len(variants) - 1))) % len(variants)
        rot[name] = k
        f = variants[k]
        key = os.path.basename(f)[:-4]
        if key not in cache:
            x = A.load_mono(f)
            m = meta.get(key)
            if m is None:   # not in meta.json: measure the same two numbers here
                m = dict(e200_db=float(level200(x)), peak_db=float(20 * np.log10(np.max(np.abs(x)) + 1e-12)))
                measured.add(key)
            cache[key] = (x, m)
        x, m = cache[key]
        prev = last.get(name)
        rep = prev[1] + 1 if prev and t - prev[0] < 0.35 else 0
        last[name] = (t, rep)
        att = -min(5.0, 1.5 * rep)
        jit = rng.uniform(-0.5, 0.5)
        adj = CLASS_OFFSET.get(cls, 0.0) + float(e.get('gain_db') or 0.0) + att + jit
        g_db = ref_db + rel + adj - m['e200_db']         # 200 ms loudness rule
        cap = ref_peak_db - 4.0 + adj - m['peak_db']     # and the peak rule (short sounds have a high crest)
        capped = g_db > cap
        g_db = min(g_db, cap)
        i0 = int(round(t * SR))
        if i0 >= n:
            print(f'WARNING: event {name} at {t:.2f}s is after the end ({n / SR:.2f}s); skipped')
            continue
        y = x * 10 ** (g_db / 20)
        seg = y[: n - i0]
        if len(seg) < len(y):
            r = min(len(seg), int(0.005 * SR))
            seg = seg.copy()
            seg[-r:] *= np.linspace(1, 0, r)
            print(f'WARNING: {name} at {t:.2f}s is cut by the end of the film')
        bus[:, i0:i0 + len(seg)] += seg
        nxt = next((c for c in cuts if c > t + 0.02), None)   # the next cut after the sound starts
        tail = audible_len(seg)
        if nxt is not None and t + tail > nxt + 0.03:
            print(f'WARNING: {key} at {t:.2f}s rings {t + tail - nxt:.2f}s past the cut at {nxt:.2f}s '
                  f'(audible {tail:.2f}s): trim it (sfx_make.py maxdur/fout) or move the event')
        rows.append((t, key, g_db, att, capped, level200(seg) - ref_db))
    for name, cnt in missing.items():
        print(f'WARNING: no sound "{name}" in {sfx_dir} (available: {", ".join(sound_names(sfx_dir)) or "none"}); '
              f'{cnt} event(s) skipped')
    if measured:
        print(f'note: not in meta.json, levels measured on the fly: {", ".join(sorted(measured))}')
    if verbose:
        for t, key, g, att, capped, rl in rows:
            print(f'  sfx {t:6.2f}s {key:11} gain {g:+6.1f} dB (repeat {att:+.1f}){"  [peak-capped]" if capped else ""}  '
                  f'200 ms level vs reference {rl:+.1f} dB')
    return bus, len(rows)


def fit_music(m, n):
    """Pad / trim the music to n samples. A real trim gets a 20 ms fade-out; a loop that is a few samples
    off (rounding of D) is padded / cut silently so the wrap stays seamless."""
    L = m.shape[1]
    if L == n:
        return m
    off = abs(L - n)
    if L > n:
        m = m[:, :n].copy()
        if off > LEN_TOL:
            k = min(n, int(0.02 * SR))
            m[:, -k:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k))
            print(f'note: music is {L / SR:.3f}s, trimmed to the film length {n / SR:.3f}s (20 ms fade-out at the cut)')
        return m
    if off > LEN_TOL:
        print(f'WARNING: music is {L / SR:.3f}s, shorter than the film {n / SR:.3f}s; the rest is silent')
    return np.pad(m, ((0, 0), (0, n - L)))


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
                                 usage='%(prog)s MUSIC.wav|- VO.wav|- EVENTS.json OUT.wav '
                                       '[--no-music] [--lufs -14] [--tp -1] [--sfx-dir DIR] [options]')
    ap.add_argument('music', metavar='MUSIC.wav|-')
    ap.add_argument('vo', metavar='VO.wav|-')
    ap.add_argument('events', metavar='EVENTS.json|-')
    ap.add_argument('out', metavar='OUT.wav')
    ap.add_argument('--no-music', action='store_true', help='voice + SFX only')
    ap.add_argument('--lufs', '--target', dest='lufs', type=float, default=-14.0,
                    help='integrated loudness of the result, LUFS (default -14; explainer: -16)')
    ap.add_argument('--tp', type=float, default=-1.0, help='true-peak ceiling, dBTP (default -1.0)')
    ap.add_argument('--sfx-dir', metavar='DIR', help='SFX folder (default: ../../assets/sfx next to this script)')
    ap.add_argument('--dur', type=float, metavar='D', help='output length, s (default: duration of EVENTS.json, else the longest input)')
    ap.add_argument('--duck', type=float, default=9.0, help='music dip under speech, dB (default 9)')
    ap.add_argument('--bed-rel', type=float, default=-3.5, help='music bed vs voice when not ducked, LU (default -3.5)')
    ap.add_argument('--sfx-rel', type=float, default=-6.0, help='SFX 200 ms level vs speech level, dB (default -6)')
    ap.add_argument('--attack', type=float, default=0.08, help='ducking attack, s (default 0.08)')
    ap.add_argument('--release', type=float, default=0.4, help='ducking release, s (default 0.4)')
    ap.add_argument('--lookahead', type=float, default=0.08, help='ducking look-ahead, s (default 0.08)')
    ap.add_argument('--vo-offset', type=float, default=0.0, help='delay the voice-over, s')
    ap.add_argument('--room-vo', type=float, default=-24.0, help='room reverb on the voice, wet dB (default -24)')
    ap.add_argument('--room-sfx', type=float, default=-16.0, help='room reverb on the SFX, wet dB (default -16)')
    ap.add_argument('--no-room', action='store_true', help='no room reverb')
    ap.add_argument('--stems', action='store_true', help='also write OUT.music.wav / OUT.vo.wav / OUT.sfx.wav')
    return ap.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    sfx_dir = args.sfx_dir or DEFAULT_SFX_DIR
    nomusic = args.no_music or args.music == '-'
    novoice = args.vo == '-'

    events, ev_dur = load_events(args.events)
    if events and not os.path.isdir(sfx_dir):
        raise SystemExit(f'SFX folder not found: {sfx_dir} (default is ../../assets/sfx next to the scripts; pass --sfx-dir DIR)')

    # inputs; with --no-music the music file is only read for its length (and may be absent)
    music = None
    if args.music != '-' and (not args.no_music or os.path.exists(args.music)):
        music = A.load(args.music)
    vo = None
    if not novoice:
        if not os.path.exists(args.vo):
            raise SystemExit(f'{args.vo}: voice-over not found (pass "-" for a film without a voice-over)')
        vo = A.load(args.vo)
        off = int(round(args.vo_offset * SR))
        if off > 0:
            vo = np.pad(vo, ((0, 0), (off, 0)))
    sfx_only = nomusic and novoice
    if sfx_only and not events:
        raise SystemExit('nothing to mix: give a music file, a voice-over and/or SFX events')

    # length of the film
    if args.dur:
        n = int(round(args.dur * SR))
        how = '--dur'
    elif ev_dur:
        n = int(round(ev_dur * SR))
        how = 'duration of events.json'
    else:
        n = max(a.shape[1] for a in (music, vo) if a is not None)
        how = 'longest input'
    if n <= 0:
        raise SystemExit('zero length: check --dur / the duration of events.json')

    # voice: high-pass, level to -16 LUFS, fit to the film
    if vo is not None:
        if vo.shape[1] > n:
            if np.max(np.abs(vo[:, n:])) > 10 ** (-50 / 20):
                print(f'WARNING: VO is {vo.shape[1] / SR:.2f}s, longer than the film {n / SR:.2f}s; trimmed')
            vo = vo[:, :n]
        vo = np.pad(vo, ((0, 0), (0, n - vo.shape[1])))
        vo = sosfiltfilt(butter(2, 70, 'highpass', fs=SR, output='sos'), vo, axis=1)
        vo = vo * 10 ** ((-16.0 - A.lufs(vo)) / 20)

    # music bed: fit to the film, level to (VO - 3.5 LU) when not ducked
    bed_full = None
    if music is not None and not nomusic:
        m = fit_music(music, n)
        bed_full = m * 10 ** ((-16.0 + args.bed_rel - A.lufs(m)) / 20)

    # reference for the SFX levels: the voice, or (no voice) the music bed raised to where a voice would sit
    if vo is not None:
        ref, ref_peak = speech_level(vo), peak_level(vo)
    elif bed_full is not None:
        virt = bed_full * 10 ** (-args.bed_rel / 20)
        ref, ref_peak = speech_level(virt), peak_level(virt)
    else:   # SFX only (a demo, or the voice comes later): levels against a virtual voice at -16 LUFS
        ref, ref_peak = SFX_ONLY_REF
    sfx, n_sfx = (render_sfx(events, n, ref, ref_peak, sfx_dir, args.sfx_rel, cuts=load_cuts(args.events))
                  if events else (np.zeros((2, n)), 0))

    # room: the same small space for the voice and the SFX bus
    if args.no_room:
        vo_r, sfx_r = vo, sfx
    else:
        vo_r = apply_room(vo, args.room_vo) if vo is not None else None
        sfx_r = apply_room(sfx, args.room_sfx) if n_sfx else sfx
    if vo_r is None:
        vo_r = np.zeros((2, n))

    # music under the voice: ducked by the voice envelope; no voice = full bed level
    if bed_full is None:
        bed, env = np.zeros((2, n)), np.zeros(n)
    elif vo is None:
        bed, env = bed_full, np.zeros(n)
    else:
        g, env = duck_envelope(vo, n, args.duck, args.attack, args.release, args.lookahead)
        bed = bed_full * g

    mix = bed + vo_r + sfx_r
    if sfx_only:   # sparse hits normalized to a loudness target would come out far too loud: keep the voice-relative levels
        out = A.true_peak_limit(mix, args.tp - 0.05)
        print('note: SFX only (no voice, no music): levels set against a virtual voice at -16 LUFS, no loudness normalization')
    else:
        out = finish(mix, args.lufs, args.tp - 0.05)   # 0.05 dB margin for the 16-bit rounding
    gain = np.sum(out * mix) / (np.sum(mix * mix) + 1e-12)
    A.save(args.out, out)
    if args.stems:
        base = os.path.splitext(args.out)[0]
        if bed_full is not None:
            A.save(base + '.music.wav', bed * gain)
        if vo is not None:
            A.save(base + '.vo.wav', vo_r * gain)
        if n_sfx:
            A.save(base + '.sfx.wav', sfx_r * gain)

    back = A.load(args.out)  # measure the file as written (16-bit)
    parts = [p for p, ok in (('voice', vo is not None), ('music', bed_full is not None), ('SFX', n_sfx > 0)) if ok]
    print(f'mix -> {args.out}: {A.lufs(back):.2f} LUFS integrated, TP {A.true_peak_db(back):.2f} dBTP, {n / SR:.3f}s '
          f'(length from {how}) [{" + ".join(parts)}]')
    sp = env > 0.9
    if vo is not None and bed_full is not None and sp.sum() > SR * 0.3:
        print(f'  under speech: voice {A.lufs((vo_r * gain)[:, sp]):.1f} LUFS, music {A.lufs((bed * gain)[:, sp]):.1f} LUFS '
              f'(voice-music {A.lufs(vo_r[:, sp]) - A.lufs(bed[:, sp]):.1f} LU); '
              f'music in pauses {A.lufs((bed * gain)[:, env < 0.05]):.1f} LUFS')
    if vo is not None and n_sfx:
        print(f'  voice speech level (200 ms, P90) {ref + 20 * np.log10(gain):.1f} dB, voice peak '
              f'{ref_peak + 20 * np.log10(gain):.1f} dBFS; {n_sfx} SFX, loudest SFX 200 ms '
              f'{level200(sfx_r.mean(0) * gain):.1f} dB, SFX peak {20 * np.log10(np.abs(sfx_r * gain).max()):.1f} dBFS')
    elif n_sfx and not sfx_only:
        print(f'  no voice: SFX referenced to the music bed; {n_sfx} SFX, loudest SFX 200 ms '
              f'{level200(sfx_r.mean(0) * gain):.1f} dB vs music 200 ms P90 '
              f'{speech_level(bed * gain):.1f} dB, SFX peak {20 * np.log10(np.abs(sfx_r * gain).max()):.1f} dBFS')


if __name__ == '__main__':
    main()
