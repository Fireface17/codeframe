#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "scipy", "soundfile", "pyloudnorm"]
# ///
"""Заменить кусок фразы в готовом vo.wav перезаписью, не пересобирая голос: вне отрезка дорожка бит в бит прежняя.

  uv run --script $V/patch_phrase.py --vo audio/vo/vo.wav --piece raw/fix.m4a --region 5.28:6.65 \\
         --out audio/vo/vo_fix.wav [--piece-span 0.58:2.16] [--pregain auto|16] [--tail-gap 0.06] [--max-tempo 0.08]

  --region      отрезок в vo.wav, который заменяется: от тишины перед первым словом до тишины (или провала) после
                последнего; границы — в тишине, туда ложатся кроссфейды 15 мс
  --piece       новая запись (любой формат ffmpeg); --piece-span — где в ней речь с запасом (иначе весь файл)
  --tail-gap    сколько тишины в конце отрезка отдать хвосту нового слова (затухающее «л», «н»), с
Кусок проходит ту же «цепочку C», что live_chain.py (pregain к −20 LUFS, если auto), подгоняется по длине речи к старой
через atempo (не больше --max-tempo, иначе нужна пересборка голоса и таймингов), проходит deess.py с мягкими настройками,
выравнивается по громкости речи с прежним отрезком, его начало речи ставится в начало речи прежнего. Тайминги слов вне
отрезка не меняются, внутри — сдвиг меньше 10 мс: words.json можно не пересчитывать, но после замены прогоните align.py
для проверки. Рядом пишется <out>.patch.json с параметрами.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True   # не мусорить __pycache__ в папке скилла
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
import _live as L  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('--vo', required=True); ap.add_argument('--piece', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--region', required=True, metavar='T0:T1')
ap.add_argument('--piece-span', metavar='T0:T1')
ap.add_argument('--pregain', default='auto')
ap.add_argument('--tail-gap', type=float, default=0.0)
ap.add_argument('--max-tempo', type=float, default=0.08)
ap.add_argument('--deess', default='--pct 90 --max 6', help='аргументы deess.py ("" — без диэссера)')
a = ap.parse_args()

SR = L.SR
R0, R1 = map(float, a.region.split(':'))
tmp = Path(tempfile.mkdtemp(prefix='patch_'))
vo, sr = sf.read(a.vo, dtype='float32', always_2d=True)
info = sf.info(a.vo)
assert sr == SR, f'{a.vo}: {sr} Гц, нужен {SR}'
vo = vo.mean(axis=1)
s0 = int(R0 * SR); reg = vo[s0:int(R1 * SR)]
o0, o1, othr = L.speech_span(reg)

# 1) кусок: 48 кГц моно, обрезка, фейды
L.ff(a.piece, tmp / 'raw.wav')
x = L.read(tmp / 'raw.wav')
if a.piece_span:
    p0, p1 = map(float, a.piece_span.split(':')); x = x[int(p0 * SR):int(p1 * SR)].copy()
fd = int(SR * .012); x[:fd] *= np.linspace(0, 1, fd); x[-fd:] *= np.linspace(1, 0, fd)
sf.write(tmp / 'piece.wav', x, SR, subtype='FLOAT')
pre = L.pregain_for(x) if a.pregain == 'auto' else float(a.pregain)

# 2) цепочка C и подгонка длины речи
L.ff(tmp / 'piece.wav', tmp / 'c0.wav', f'volume={pre:.2f}dB,' + L.CHAIN_C)
n0, n1, _ = L.speech_span(L.read(tmp / 'c0.wav'))
k = (n1 - n0) / (o1 - o0 + a.tail_gap)
print(f'речь: была {o1 - o0:.2f} с (+{a.tail_gap} хвост), кусок {n1 - n0:.2f} с -> atempo {k:.3f} ({(k - 1) * 100:+.1f} %), pregain {pre:+.1f} дБ')
if abs(k - 1) > a.max_tempo:
    sys.exit(f'разница длины {abs(k - 1) * 100:.0f} % > {a.max_tempo * 100:.0f} %: перезапишите ближе по темпу или пересоберите голос (live_chain.py) и тайминги')
L.ff(tmp / 'piece.wav', tmp / 'c.wav', f'volume={pre:.2f}dB,' + L.CHAIN_C + f',atempo={k:.4f}')
src = tmp / 'c.wav'
if a.deess.strip():
    subprocess.run(['uv', 'run', '--script', str(HERE / 'deess.py'), str(src), str(tmp / 'd.wav'), *a.deess.split()], check=True,
                   stdout=subprocess.DEVNULL)
    src = tmp / 'd.wav'
p = L.read(src)
n0, n1, nthr = L.speech_span(p)

# 3) громкость речи как у прежнего отрезка, начало речи — в начало прежней речи
p = p * 10 ** ((L.speech_rms(reg, othr) - L.speech_rms(p, nthr)) / 20)
seg = np.zeros(len(reg), np.float32)
off = int((o0 - n0) * SR)
part = p[max(0, -off): max(0, -off) + len(seg) - max(0, off)]
seg[max(0, off): max(0, off) + len(part)] = part
X = int(SR * .015)
w = np.ones(len(seg), np.float32); w[:X] = np.linspace(0, 1, X); w[-X:] = np.linspace(1, 0, X)
out = vo.copy()
out[s0:s0 + len(seg)] = vo[s0:s0 + len(seg)] * (1 - w) + seg * w
peak = np.abs(out).max()
if peak > 0.794:   # −2 dBFS, как лимитер финальной громкости
    print(f'ВНИМАНИЕ: пик {20 * np.log10(peak):.1f} дБFS выше −2: проверьте кусок на щелчки')
sf.write(a.out, out, SR, subtype=info.subtype if info.subtype in ('PCM_16', 'PCM_24', 'FLOAT') else 'PCM_24')
ch = np.where(np.abs(out - vo) > 1e-6)[0]
print(f'изменено {ch[0] / SR:.3f}–{ch[-1] / SR:.3f} с из {len(vo) / SR:.3f} с -> {a.out}' if len(ch) else 'ничего не изменилось')
json.dump({'region': [R0, R1], 'piece': a.piece, 'piece_span': a.piece_span, 'pregain_db': round(float(pre), 2),
           'atempo': round(float(k), 4), 'deess': a.deess}, open(str(a.out) + '.patch.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
