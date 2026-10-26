"""Shared audio helpers for the music tools (numpy + scipy; ffmpeg only for non-WAV input and tempo changes).

load/save 48 kHz stereo wav, BS.1770 loudness, true-peak limiting, beat grid.
The beat tracker takes the tempo from the autocorrelation of spectral flux (comb over multiples + log-normal
prior), the beats by dynamic programming (Ellis 2007) and the downbeats from chroma novelty.
"""
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy"]
# ///
import json
import os
import shutil
import subprocess
import tempfile
from fractions import Fraction

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d
from scipy.signal import butter, lfilter, resample_poly, sosfiltfilt

SR = 48000


def ffmpeg():
    """Path of the ffmpeg executable (looked up in PATH); exits with a clear message when it is missing."""
    exe = shutil.which('ffmpeg')
    if exe is None:
        raise SystemExit('ffmpeg is not in PATH (needed for tempo changes and for non-WAV input): '
                         'install it or add its folder to PATH')
    return exe


def to_float(x):
    """Integer or float WAV samples -> float64 in [-1, 1] (24-bit PCM arrives left-justified in int32)."""
    if x.dtype == np.uint8:
        return (x.astype(np.float64) - 128.0) / 128.0
    if np.issubdtype(x.dtype, np.integer):
        return x.astype(np.float64) / float(1 << (8 * x.dtype.itemsize - 1))
    return x.astype(np.float64)


def decode(path):
    """Decode any file ffmpeg can read to float WAV in memory -> (sr, float64 (n,) or (n, ch))."""
    with tempfile.TemporaryDirectory() as d:
        tmp = os.path.join(d, 'decoded.wav')
        r = subprocess.run([ffmpeg(), '-v', 'error', '-y', '-i', path, '-vn', '-c:a', 'pcm_f32le', tmp],
                           capture_output=True, text=True)
        if r.returncode:
            raise SystemExit(f'ffmpeg could not decode {path}: {r.stderr.strip()[-300:]}')
        sr, x = wavfile.read(tmp)
    return sr, to_float(x)


def read(path):
    """Any audio file -> (sr, float64 array (n,) or (n, ch) in [-1, 1]), native rate and channels.
    WAV is read directly; other formats (mp3, ogg, flac, m4a, ...) and WAV variants scipy cannot parse go through ffmpeg."""
    if not os.path.exists(path):
        raise SystemExit(f'{path}: file not found')
    if path.lower().endswith(('.wav', '.wave')):
        try:
            sr, x = wavfile.read(path)
            return sr, to_float(x)
        except (ValueError, NotImplementedError):
            pass
    return decode(path)


def _resample(x, sr):
    """Resample the last axis from sr to SR (rational polyphase)."""
    if sr == SR:
        return x
    r = Fraction(SR, sr).limit_denominator(1000)
    if x.ndim == 1:
        return resample_poly(x, r.numerator, r.denominator)
    return np.stack([resample_poly(c, r.numerator, r.denominator) for c in x])


def load(path):
    """-> (2, n) float64 in [-1, 1] at 48 kHz (mono is duplicated, channels beyond two are dropped)."""
    sr, x = read(path)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    return _resample(x.T[:2], sr)


def load_mono(path):
    """-> (n,) float64 mono at 48 kHz (channels averaged)."""
    sr, x = read(path)
    if x.ndim > 1:
        x = x.mean(axis=1)
    return _resample(x, sr)


def save(path, x):
    """Write (2, n) float as a 48 kHz 16-bit WAV (clipped, no dither); creates the folder when needed."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    wavfile.write(path, SR, (np.clip(x, -1, 1).T * 32767).round().astype(np.int16))


def dump_json(path, obj, **kw):
    """Write obj as indented JSON; creates the folder when needed."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, indent=1, **kw)


def plan_path(out_path):
    """OUT.wav -> OUT.plan.json (the sidecar written by loop.py / edit.py and read by seam.py)."""
    return os.path.splitext(out_path)[0] + '.plan.json'


def kweight(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=-1), axis=-1)


def lufs(x):
    """Integrated loudness, ITU-R BS.1770-4 with absolute (-70) and relative (-10 LU) gates."""
    y = kweight(np.atleast_2d(x))
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    if y.shape[1] < blk:
        return -0.691 + 10 * np.log10(np.sum(np.mean(y ** 2, axis=1)) + 1e-12)
    starts = np.arange(0, y.shape[1] - blk + 1, hop)
    cs = np.concatenate([np.zeros((y.shape[0], 1)), np.cumsum(y ** 2, axis=1)], axis=1)
    z = ((cs[:, starts + blk] - cs[:, starts]) / blk).sum(0)
    l = -0.691 + 10 * np.log10(z + 1e-12)
    z = z[l > -70]
    if not len(z):
        return -70.0
    rel = -0.691 + 10 * np.log10(z.mean()) - 10
    z = z[-0.691 + 10 * np.log10(z) > rel]
    return -0.691 + 10 * np.log10(z.mean())


def short_term(x, win=3.0, hop=0.5):
    """Short-term loudness curve (LUFS) -> (times, values)."""
    y = kweight(np.atleast_2d(x))
    w, h = int(win * SR), int(hop * SR)
    cs = np.concatenate([np.zeros((y.shape[0], 1)), np.cumsum(y ** 2, axis=1)], axis=1)
    st = np.arange(0, max(1, y.shape[1] - w + 1), h)
    z = ((cs[:, np.minimum(st + w, y.shape[1])] - cs[:, st]) / w).sum(0)
    return (st + w / 2) / SR, -0.691 + 10 * np.log10(z + 1e-12)


def true_peak_db(x):
    up = np.stack([resample_poly(c, 4, 1) for c in np.atleast_2d(x)])
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def true_peak_limit(x, ceil_db, hold=0.02):
    """Transparent peak limiter on the 4x oversampled peak: the gain dips smoothly over
    about +/-hold seconds around any overshoot and is guaranteed <= the needed gain."""
    ceil = 10 ** (ceil_db / 20)
    n = x.shape[1]
    up = np.max(np.abs(np.stack([resample_poly(c, 4, 1) for c in x])), axis=0)[: n * 4]
    up = np.pad(up, (0, n * 4 - len(up)))
    need = np.minimum(1.0, ceil / np.maximum(up.reshape(n, 4).max(axis=1), 1e-12))
    if need.min() >= 1.0:
        return x
    R = max(1, int(hold * SR))
    g = minimum_filter1d(need, size=2 * R + 1, mode='nearest')
    g = np.convolve(g, np.ones(R + 1) / (R + 1), mode='same')
    y = x * np.minimum(g, 1.0)
    tp = true_peak_db(y)
    if tp > ceil_db:  # residual overshoot from gain modulation: tiny static trim
        y *= 10 ** ((ceil_db - tp) / 20)
    return y


def stft_mag(x, nfft=2048, hop=256):
    pad = np.concatenate([np.zeros(nfft // 2), x, np.zeros(nfft)])
    fr = 1 + (len(pad) - nfft) // hop
    idx = np.arange(nfft)[None, :] + hop * np.arange(fr)[:, None]
    win = np.hanning(nfft)
    S = np.empty((fr, nfft // 2 + 1))
    step = 4000
    for i in range(0, fr, step):
        S[i:i + step] = np.abs(np.fft.rfft(pad[idx[i:i + step]] * win, axis=1))
    return S, np.fft.rfftfreq(nfft, 1 / SR), SR / hop


def beat_grid(mono, bpm_lo=70, bpm_hi=180, prior=110):
    """-> dict(bpm, period, beats (refined, s), down (index of first downbeat), resid_ms, pos)."""
    x = mono / (np.max(np.abs(mono)) + 1e-12)
    S, fq, fps = stft_mag(x)
    flux = np.maximum(np.diff(S, axis=0, prepend=S[:1]), 0)
    low = flux[:, (fq >= 30) & (fq < 400)].sum(1)
    allf = flux.sum(1)
    on = allf / allf.max() + low / (low.max() + 1e-12)
    on = np.maximum(on - np.convolve(on, np.ones(64) / 64, mode='same'), 0)

    ac = np.correlate(on - on.mean(), on - on.mean(), mode='full')[len(on) - 1:] if len(on) < 40000 else None
    if ac is None:
        f = np.fft.rfft(on - on.mean(), 2 * len(on))
        ac = np.fft.irfft(np.abs(f) ** 2)[: len(on)]
    ac = ac / ac[0]
    lags = np.arange(1, int(fps * 2))
    bpm = 60 * fps / lags
    comb = sum(np.interp(lags * k, np.arange(len(ac)), ac) / k for k in (1, 2, 3, 4))
    score = np.where((bpm >= bpm_lo) & (bpm <= bpm_hi), comb * np.exp(-0.5 * np.log2(bpm / prior) ** 2), -1)
    L = lags[np.argmax(score)]
    y0, y1, y2 = ac[L - 1], ac[L], ac[L + 1]
    period = L + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)

    n = len(on)
    cum = on.copy()
    back = -np.ones(n, int)
    for i in range(n):
        lo, hi = int(i - 2 * period), int(i - period / 2)
        if hi <= 0:
            continue
        prev = np.arange(max(lo, 0), hi)
        pen = -100 * np.log((i - prev) / period) ** 2
        j = np.argmax(cum[prev] + pen)
        cum[i] += cum[prev][j] + pen[j]
        back[i] = prev[j]
    tail = int(period * 2)
    i = int(np.argmax(cum[-tail:])) + n - tail
    beats = []
    while i >= 0:
        beats.append(i)
        i = back[i]
    beats = np.array(beats[::-1]) / fps

    band = (fq >= 110) & (fq < 2000)
    pc = np.round(12 * np.log2(fq[band] / 440)).astype(int) % 12
    C = np.zeros((len(S), 12))
    for c in range(12):
        C[:, c] = (S[:, band][:, pc == c] ** 2).sum(1)

    def seg(t0, t1):
        v = C[int(t0 * fps):max(int(t0 * fps) + 1, int(t1 * fps))].sum(0)
        return v / (np.linalg.norm(v) + 1e-9)

    nov = np.zeros(len(beats))
    for j in range(1, len(beats) - 1):
        nov[j] = 1 - seg(beats[j - 1], beats[j]) @ seg(beats[j], beats[j + 1])
    # low-frequency onset on the downbeat helps too (kick / bass note on 1)
    lowon = np.array([low[int(b * fps)] if int(b * fps) < len(low) else 0 for b in beats])
    lowon = lowon / (lowon.max() + 1e-12)
    pos = np.array([nov[p::4].mean() + 0.5 * lowon[p::4].mean() for p in range(4)])
    down = int(np.argmax(pos))

    hp = sosfiltfilt(butter(4, 2000, 'highpass', fs=SR, output='sos'), x)
    sm = max(1, int(0.0005 * SR))
    env = np.convolve(np.abs(hp), np.ones(sm) / sm, mode='same')
    slope = env - np.roll(env, sm)
    w = int(0.02 * SR)
    refined = []
    for b in beats:
        c = int(round(b * SR))
        a, z = max(0, c - w), min(len(x), c + w)
        refined.append((a + int(np.argmax(slope[a:z]))) / SR if z > a else b)
    refined = np.array(refined)
    k = np.arange(len(refined))
    sl, ic = np.polyfit(k, refined, 1)
    resid = refined - (sl * k + ic)
    return dict(bpm=60 / sl, period=sl, icpt=ic, beats=refined, down=down, pos=pos, resid_ms=resid * 1000,
                onset=on, fps=fps)
