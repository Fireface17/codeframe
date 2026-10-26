#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "soundfile", "pyloudnorm"]
# ///
"""Живой голос: выбранные дубли -> «цепочка C» -> обрезка вдохов и длинных пауз -> склейка с паузами script.json -> vo_pre.wav.

  uv run --script $V/live_chain.py --script script.json --cand audio/vo/live/cand --picks p1_s3,p2_s2,p3_s1 \\
         --out audio/vo/live/vo_pre.wav [--pregain auto|14.5] [--tempo 1.06] [--tempo-take p3_s1=1.0] \\
         [--pause-k 0.7] [--pause 3=0.9] [--lead 0.3] [--tail 0.6]
  --picks можно дать файлом: picks.json от check_takes.py ({"picks": [{"take": "p1_s3.wav"}, ...]}) или строки «p1_s3».

По каждому дублю:
  1) pregain: запись -> около −20 LUFS (auto: замер по всем выбранным дублям вместе), на этом уровне стоят пороги
     экспандера и компрессора цепочки C;
  2) цепочка C (_live.py: ФВЧ 80 Гц, adeclick, afftdn nr=10, EQ −3@120 / −6@330 / −2@560 / +3@2k / +3@3,5k / +3 полка 9k,
     экспандер, компрессор 3:1) + atempo (темп до +8 % без смены высоты; ускорение больше слышно);
  3) вдох перед фразой срезается: начало не раньше 0,17 с до первого звонкого кадра (энергия 80–600 Гц у гласных; у вдоха
     и «с/ш/ч» её почти нет), начальный согласный остаётся целиком;
  4) внутренние паузы длиннее 0,3 с сжимаются: по 0,12 с тишины с каждой стороны, ~0,24–0,28 с вместе с краями звука
     (вырезается только тишина, кроссфейд 15 мс);
  5) уровень дубля к одной громкости речи (дубли из разных проходов не прыгают).
Склейка: lead, паузы script.json × --pause-k (у живых дублей свои хвосты ~0,14 с и вдох), tail.
Выход: vo_pre.wav (float32) + vo_pre.phrases.json (где какая фраза, параметры). Дальше: deess.py -> громкость -> align.py
(README.md, раздел «Живой голос»).
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True   # не мусорить __pycache__ в папке скилла
sys.path.insert(0, str(Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
import _live as L  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('--script', required=True)
ap.add_argument('--cand', required=True, help='папка дублей (live_cut.py или takes.py)')
ap.add_argument('--picks', required=True, help='p1_s3,p2_s2,... или файл (picks.json / строки)')
ap.add_argument('--out', required=True)
ap.add_argument('--pregain', default='auto', help='дБ или auto (к −20 LUFS)')
ap.add_argument('--tempo', type=float, default=1.0, help='atempo для всех дублей (1.06 = +6 %%), до 1.08')
ap.add_argument('--tempo-take', action='append', default=[], metavar='TAKE=K', help='свой темп дубля: p3_s1=1.0')
ap.add_argument('--pause-k', type=float, default=0.7, help='паузы script.json × k (у живых дублей свои хвосты)')
ap.add_argument('--pause', action='append', default=[], metavar='I=SEC', help='пауза после фразы I, с (абсолютная)')
ap.add_argument('--lead', type=float); ap.add_argument('--tail', type=float)
ap.add_argument('--max-gap', type=float, default=0.30, help='внутренние паузы длиннее этого, с, сжимаются ...')
ap.add_argument('--gap-keep', type=float, default=0.12, help='... оставляя столько тишины с каждой стороны, с')
a = ap.parse_args()

SR = L.SR
SC = json.load(open(a.script, encoding='utf-8'))
cand = Path(a.cand)


def read_picks(spec):
    p = Path(spec)
    if p.exists():
        if p.suffix == '.json':
            d = json.load(open(p, encoding='utf-8'))
            items = d.get('picks', d) if isinstance(d, dict) else d
            return [Path(i['take'] if isinstance(i, dict) else i).stem for i in items]
        return [ln.strip().removesuffix('.wav') for ln in open(p, encoding='utf-8') if ln.strip() and not ln.startswith('#')]
    return [s.strip().removesuffix('.wav') for s in spec.split(',') if s.strip()]


PICKS = read_picks(a.picks)
if len(PICKS) != len(SC['phrases']):
    print(f'ВНИМАНИЕ: дублей {len(PICKS)}, фраз в script.json {len(SC["phrases"])}')
TEMPO = {k: float(v) for k, v in (s.split('=') for s in a.tempo_take)}
PAUSE_ABS = {int(k) - 1: float(v) for k, v in (s.split('=') for s in a.pause)}
for k in [a.tempo, *TEMPO.values()]:
    if not 0.9 <= k <= 1.08:
        sys.exit(f'atempo {k}: больше +8 % ускорение слышно, меньше 0.9 — тянет; сократите паузы или текст')

if a.pregain == 'auto':
    allx = np.concatenate([L.read(cand / f'{n}.wav') for n in PICKS])
    PRE = L.pregain_for(allx)
    print(f'pregain auto: запись {L.lufs(allx):.1f} LUFS -> {PRE:+.1f} дБ')
else:
    PRE = float(a.pregain)
proc = Path(a.out).parent / 'proc'; proc.mkdir(parents=True, exist_ok=True)


def process(name):
    src, dst = cand / f'{name}.wav', proc / f'{name}.wav'
    L.ff(src, dst, f'volume={PRE}dB,' + L.CHAIN_C + f',atempo={TEMPO.get(name, a.tempo)}')
    x = L.read(dst)
    e = L.env_db(x); thr = L.speech_thr(e)
    on = e > thr
    idx = np.where(on)[0]; s, b = idx[0], idx[-1]
    lo = L.band_db(x, 80, 600); fv = np.where(lo > np.percentile(lo, 95) - 18)[0]
    if len(fv): s = max(s, fv[0] - 17)                         # без вдоха: не раньше 0,17 с до звонкого
    gmax, keep = int(round(a.max_gap / 0.01)), int(round(a.gap_keep / 0.01))
    segs, cur, gap = [], s, 0
    for i in range(s, b + 1):
        if on[i]:
            if gap > gmax: segs.append((cur, i - gap + keep)); cur = i - keep
            gap = 0
        else: gap += 1
    segs.append((cur, b + 1))
    fade = int(SR * .015); out = np.zeros(0, np.float32)
    for k, (s0, s1) in enumerate(segs):
        s0 = max(0, int((s0 * .01 - (.06 if k == 0 else 0)) * SR)); s1 = min(len(x), int((s1 * .01 + (.14 if k == len(segs) - 1 else 0)) * SR))
        y = x[s0:s1].copy()
        if len(out) and len(y) > fade:
            r = np.linspace(0, 1, fade, dtype=np.float32); out[-fade:] = out[-fade:] * (1 - r) + y[:fade] * r; y = y[fade:]
        out = np.concatenate([out, y])
    out[:int(SR * .01)] *= np.linspace(0, 1, int(SR * .01)); out[-int(SR * .03):] *= np.linspace(1, 0, int(SR * .03))
    g = 10 ** ((-23 - L.speech_rms(out, thr)) / 20)          # речь каждого дубля к одной громкости
    return out * g, len(segs) - 1


lead = a.lead if a.lead is not None else SC.get('lead', 0.3)
tail = a.tail if a.tail is not None else SC.get('tail', 0.6)
pauses = SC.get('pauses', [0.3])
buf = [np.zeros(int(SR * lead), np.float32)]; t = lead; meta = []
for i, name in enumerate(PICKS):
    y, cuts = process(name)
    meta.append({'i': i + 1, 'take': name + '.wav', 'start': round(t, 3), 'end': round(t + len(y) / SR, 3), 'cuts': cuts})
    buf.append(y); t += len(y) / SR
    p = PAUSE_ABS.get(i, (pauses[i] if i < len(pauses) else pauses[-1]) * a.pause_k)
    if i < len(PICKS) - 1: buf.append(np.zeros(int(SR * p), np.float32)); t += p
buf.append(np.zeros(int(SR * tail), np.float32))
x = np.concatenate(buf)
sf.write(a.out, x, SR, subtype='FLOAT')
used = [round(PAUSE_ABS.get(i, (pauses[i] if i < len(pauses) else pauses[-1]) * a.pause_k), 3) for i in range(len(PICKS) - 1)]
json.dump({'sr': SR, 'duration': round(len(x) / SR, 3), 'lead': lead, 'tail': tail, 'pauses': used, 'phrases': meta,
           'chain': 'C', 'pregain_db': PRE, 'tempo': a.tempo, 'tempo_take': TEMPO},
          open(Path(a.out).with_suffix('.phrases.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for m in meta: print(m)
words = sum(len(p['display'].split()) for p in SC['phrases'])
print(f'голос {len(x) / SR:.2f} с, {words / (len(x) / SR - lead - tail):.2f} сл/с с паузами -> {a.out}')
