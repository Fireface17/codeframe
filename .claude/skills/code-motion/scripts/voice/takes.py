#!/usr/bin/env -S uv run --script
# /// script
# requires-python = "==3.11.*"
# dependencies = ["numpy", "soundfile", "soxr", "mlx-whisper"]
# [tool.uv]
# exclude-newer = "2026-10-19T00:00:00Z"
# ///
"""Одна запись диктора (каждая фраза 2-3 раза подряд или 2-3 прохода всего текста) -> takes/p<k>_s<n>.wav для check_takes.py.

  uv run --script $V/takes.py <запись> <script.json> <папка дублей> > <папка дублей>/takes.log
  дальше: check_takes.py -> assemble.py -> deess.py -> align.py   (или, если запись вразброс: live_words.py -> live_cut.py
  -> prosody.py -> live_chain.py; порядок — README.md, раздел «Живой голос»)
  Распознавание — mlx-whisper: только Mac на Apple Silicon. Язык — поле "lang" в script.json (по умолчанию ru).

1) ffmpeg: 48 кГц моно, срез ниже 70 Гц, мягкое шумоподавление;
2) куски речи по энергии (паузы >= 0.45 с режут, короче — нет: запятые остаются внутри дубля);
3) каждый кусок распознаётся whisper отдельно (повторы одной фразы целиком whisper иногда «склеивает»);
4) куски сопоставляются фразам (любым, при равенстве — по порядку; можно склеить до 3 соседних кусков), похожесть по буквам;
5) дубль = кусок с запасом 0.12 с до и 0.2 с после (не заходя на соседей) -> p<k>_s<n>.wav + split.json
   (в split.json и все куски речи с текстом: "segments" — по ним live_words.py распознаёт слова с таймингами).
"""
import json, os, re, subprocess, sys
from difflib import SequenceMatcher
from pathlib import Path

os.environ.setdefault('HF_HOME', str(Path.home() / '.cache/code-motion/hf'))
import numpy as np
import soundfile as sf
import soxr
import mlx_whisper

raw, script_path, out_dir = sys.argv[1:4]
out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
sc = json.load(open(script_path, encoding='utf-8'))
norm = lambda s: ' '.join(re.sub(r'[^\w\s]', ' ', s.lower().replace('ё', 'е')).split())
refs = [norm(p.get('align') or p['display']) for p in sc['phrases']]
LANG = sc.get('lang', 'ru')

wav = out / '_raw48.wav'
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-ac', '1', '-ar', '48000',
                '-af', 'highpass=f=70,afftdn=nr=10:nf=-40', '-c:a', 'pcm_f32le', str(wav)], check=True)
x, sr = sf.read(wav, dtype='float32')
print(f'запись: {len(x) / sr:.1f} с')

# --- куски речи по энергии
hop = int(0.02 * sr)
fr = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2) + 1e-12) for i in range(0, len(x) - hop, hop)])
db = 20 * np.log10(fr)
floor, peak = np.percentile(db, 10), np.percentile(db, 99.5)
thr = max(floor + 10, peak - 38)
on = db > thr
segs, i = [], 0
while i < len(on):
    if on[i]:
        j = i
        while j < len(on) and on[j]: j += 1
        segs.append([i, j]); i = j
    else: i += 1
merged = []
for s in segs:                                         # паузы короче 0.45 с — внутри фразы
    if merged and (s[0] - merged[-1][1]) * 0.02 < 0.45: merged[-1][1] = s[1]
    else: merged.append(s)
chunks = [(a * 0.02, b * 0.02) for a, b in merged if (b - a) * 0.02 >= 0.3]
print(f'порог {thr:.1f} dB (шум {floor:.1f}, пик {peak:.1f}); кусков речи: {len(chunks)}')

# --- распознавание каждого куска
x16 = soxr.resample(x, sr, 16000).astype(np.float32)
def asr(a, b):
    seg = x16[int(max(0, a - 0.1) * 16000):int((b + 0.1) * 16000)]
    r = mlx_whisper.transcribe(seg, path_or_hf_repo='mlx-community/whisper-large-v3-turbo', language=LANG,
                               condition_on_previous_text=False, temperature=0.0)
    return norm(r['text'])
texts = [asr(a, b) for a, b in chunks]
for (a, b), t in zip(chunks, texts): print(f'  {a:7.2f}-{b:7.2f}  {t}')

# --- сопоставление по порядку
sim = lambda a, b: SequenceMatcher(None, a, b).ratio()
takes, k, i = [], 0, 0
while i < len(chunks):
    best = None
    for m in (1, 2, 3):
        if i + m > len(chunks): break
        t = ' '.join(texts[i:i + m])
        for kk in range(len(refs)):                    # любая фраза: можно переписать только часть и не по порядку
            r = sim(t, refs[kk]) + (0.02 if k <= kk <= k + 2 else 0)   # при равенстве — следующая по порядку
            if not best or r > best[0] + 0.02 * (m - best[1]): best = (r, m, kk)
    if best[0] < 0.55:
        print(f'  пропуск куска {chunks[i][0]:.2f}: «{texts[i]}» (похожесть {best[0]:.2f})'); i += 1; continue
    r, m, kk = best
    takes.append({'phrase': kk + 1, 'start': chunks[i][0], 'end': chunks[i + m - 1][1], 'sim': round(r, 3), 'text': ' '.join(texts[i:i + m])})
    k, i = kk, i + m

# --- нарезка
count, rep = {}, []
for j, tk in enumerate(takes):
    lo = takes[j - 1]['end'] + 0.05 if j else 0
    hi = takes[j + 1]['start'] - 0.05 if j + 1 < len(takes) else len(x) / sr
    a, b = max(lo, tk['start'] - 0.12), min(hi, tk['end'] + 0.2)
    n = count[tk['phrase']] = count.get(tk['phrase'], 0) + 1
    y = x[int(a * sr):int(b * sr)].copy()
    f = int(0.01 * sr); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    name = f"p{tk['phrase']}_s{n}.wav"
    sf.write(out / name, y, sr, subtype='FLOAT')
    rep.append({**tk, 'file': name, 'cut': [round(a, 3), round(b, 3)]})
    print(f"  {name}: {a:.2f}-{b:.2f}  sim {tk['sim']}  «{tk['text']}»")
missing = [i + 1 for i in range(len(refs)) if i + 1 not in count]
json.dump({'chunks': len(chunks), 'segments': [[round(a, 3), round(b, 3), t] for (a, b), t in zip(chunks, texts)],
           'takes': rep, 'missing': missing}, open(out / 'split.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('нет дублей для фраз:', missing if missing else '—')
