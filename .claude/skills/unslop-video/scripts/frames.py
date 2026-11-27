#!/usr/bin/env python3
"""Приметы шаблона по готовому MP4: тёмные кадры, вспышки, застывшие куски, ровный ритм склеек, плоский звук.

  python3 -I frames.py <ролик.mp4> [--sheet <лист.jpg>] [--json]

Нужен только ffmpeg (stdlib Python). Это замеры-зацепки, а не вердикт: «почему так?» решает человек или оценщик.
--sheet — контактный лист ~24 кадров (6×4) для свежего оценщика (references/judge.md).
"""
import json, os, re, statistics, subprocess, sys

args = sys.argv[1:]
if not args or args[0].startswith('-'):
    print(__doc__); sys.exit(1)
src = args[0]
as_json = '--json' in args
sheet = args[args.index('--sheet') + 1] if '--sheet' in args else None
FPS = 10  # частота замера; для рывков и склеек хватает

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.stdout + r.stderr

# --- длительность
probe = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).strip().split('\n')[0]
dur = float(probe or 0)
if not dur:
    print(f'Не читается: {src}'); sys.exit(2)

# --- покадровые замеры: яркость, насыщенность, разница с прошлым кадром
out = run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'fps={FPS},scale=270:-2,signalstats,metadata=print:file=-', '-an', '-f', 'null', '-'])
Y, S, D = [], [], []
for line in out.splitlines():
    m = re.search(r'lavfi\.signalstats\.(YAVG|SATAVG|YDIF)=([\d.]+)', line)
    if not m: continue
    k, v = m.group(1), float(m.group(2))
    (Y if k == 'YAVG' else S if k == 'SATAVG' else D).append(v)
n = len(Y)
if not n:
    print('ffmpeg не вернул замеры'); sys.exit(2)
D = D[:n] if D else [0] * n

# тёмные кадры (лимитированный диапазон 16–235: 40 ≈ 11 % яркости)
dark = sum(1 for y in Y if y < 40) / n
flash_white = [i / FPS for i in range(1, n) if Y[i] > 225 and Y[i - 1] < 200]
flash_black = [i / FPS for i in range(1, n - 1) if Y[i] < 20 and Y[i - 1] > 45]
# застывшие куски: разница кадров ниже порога дольше 0,6 с
FREEZE = 0.35
runs, cur = [], None
for i, d in enumerate(D):
    if d < FREEZE:
        cur = cur if cur is not None else i
    else:
        if cur is not None and (i - cur) / FPS > 0.6: runs.append((cur / FPS, i / FPS))
        cur = None
if cur is not None and (n - cur) / FPS > 0.6: runs.append((cur / FPS, n / FPS))
frozen = sum(b - a for a, b in runs)
tail = next((b - a for a, b in runs if abs(b - n / FPS) < 0.2), 0)
mid_runs = [(a, b) for a, b in runs if abs(b - n / FPS) >= 0.2]
# склейки: резкий скачок разницы; ритм — разброс интервалов между склейками
CUT = 18
cuts = [i / FPS for i in range(1, n) if D[i] > CUT and D[i] > 3 * (D[i - 1] + 1)]
iv = [b - a for a, b in zip(cuts, cuts[1:]) if b - a > 0.25]
cv = statistics.pstdev(iv) / statistics.mean(iv) if len(iv) >= 4 else None
# «всё всегда движется»: доля кадров с заметным движением
moving = sum(1 for d in D if d > 1.0) / n
sat = statistics.mean(S)

# --- звук: громкость и диапазон
au = run(['ffmpeg', '-v', 'info', '-nostats', '-i', src, '-vn', '-af', 'ebur128', '-f', 'null', '-'])
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', au)
L = re.findall(r'LRA:\s+([\d.]+) LU', au)
lufs = float(I[-1]) if I else None
lra = float(L[-1]) if L else None

has_audio = 'audio' in run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', src])
flags = []
def flag(w, s): flags.append((w, s))
if dark > 0.6: flag(3, f'тёмных кадров {dark:.0%}: почти чёрный фон «как дорого» — у ИИ-роликов 6 из 10. Фон — от материала темы')
elif dark > 0.3: flag(1, f'тёмных кадров {dark:.0%}: проверь, что тёмное выбрано темой')
if len(flash_white) > 2: flag(2, f'белых вспышек {len(flash_white)} ({", ".join(f"{t:.1f}" for t in flash_white[:5])} с): максимум 1–2 на главных ударах')
if len(flash_black) > 1: flag(2, f'провалов в чёрное {len(flash_black)} ({", ".join(f"{t:.1f}" for t in flash_black[:5])} с): склейка по действию')
if mid_runs:
    longest = max(b - a for a, b in mid_runs)
    w = 2 if longest > 1.2 or frozen - tail > dur / 30 else 1
    flag(w, f'застывших кусков {len(mid_runs)}, самый длинный {longest:.1f} с, всего {frozen - tail:.1f} с ({", ".join(f"{a:.1f}–{b:.1f}" for a, b in mid_runs[:4])}): пауза — только после развязки и 0,5–1 с')
if tail > 1.4: flag(2, f'неподвижный хвост {tail:.1f} с: финал посреди движения, удержание 0,6–1,4 с')
if moving > 0.97 and not mid_runs: flag(1, f'движение в {moving:.0%} кадров, пауз нет: «скринсейвер» — глазу негде остановиться; дать статику перед развязкой')
if cv is not None and cv < 0.35 and len(iv) >= 5: flag(2, f'склейки как метроном: {len(cuts)} склеек, интервал {statistics.mean(iv):.1f} ± {statistics.pstdev(iv):.1f} с — рваный ритм по смыслу')
if sat > 120: flag(1, f'средняя насыщенность {sat:.0f}: кричащие цвета')
# LRA у ролика с голосом мал всегда (голос сжат), поэтому это справка, а не примета; флаг — только у совсем плоского звука
if lra is not None and lra < 1.0: flag(1, f'диапазон громкости LRA {lra:.1f} LU: звук совсем плоский — тишина и удары как решения')
if lufs is not None and not (-16.5 <= lufs <= -11.5): flag(1, f'громкость {lufs:.1f} LUFS: для коротких роликов ориентир −14 ±2')
if not has_audio: flag(0, 'в файле нет звука — звук не проверен (финал со звуком у code-motion лежит в out/final/<имя>_vN.mp4)')
score = sum(w for w, _ in flags)

if sheet:
    # 24 кадра в середине равных отрезков; время на кадр — drawtext, если ffmpeg собран с freetype, иначе легенда рядом
    step = dur / 24
    # ровно 24 кадра: select по номеру кадра в середине каждого отрезка (fps+start_time иногда даёт 23 и чёрную ячейку)
    num, _, den = (run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', src]).strip().split('\n')[0] or '30/1').partition('/')
    fr = float(num) / float(den or 1)
    idx = '+'.join(f'eq(n\\,{int((k + 0.5) * step * fr)})' for k in range(24))
    sel = f"select='{idx}',scale=270:-2"
    txt = ",drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6"
    if os.path.exists(sheet): os.remove(sheet)
    for vf in (sel + txt, sel):
        run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', vf + ',tile=6x4:padding=4', '-fps_mode', 'vfr', '-frames:v', '1', sheet])
        if os.path.exists(sheet): break
    legend = sheet.rsplit('.', 1)[0] + '.txt'
    with open(legend, 'w') as fh:
        fh.write(f'Контактный лист {src.split("/")[-1]}: 6 столбцов × 4 ряда, слева направо и сверху вниз\n')
        for k in range(24):
            fh.write(f'ряд {k // 6 + 1}, кадр {k % 6 + 1}: {step * (k + 0.5):.1f} с\n')

res = dict(src=src, duration=round(dur, 2), dark_share=round(dark, 3), white_flashes=flash_white, black_dips=flash_black,
           frozen=[(round(a, 1), round(b, 1)) for a, b in runs], tail_freeze=round(tail, 2), cuts=len(cuts),
           cut_interval_cv=None if cv is None else round(cv, 2), moving_share=round(moving, 3), saturation=round(sat, 1),
           lufs=lufs, lra=lra, score=score, flags=[s for _, s in flags], sheet=sheet)
if as_json:
    print(json.dumps(res, ensure_ascii=False, indent=1)); sys.exit(0)
print(f'# Кадры: {src.split("/")[-1]} — {dur:.1f} с\n')
print(f'Тёмные кадры {dark:.0%} · насыщенность {sat:.0f} · движение {moving:.0%} · склеек {len(cuts)}'
      + (f' (разброс интервалов {cv:.2f})' if cv is not None else '') + f' · хвост {tail:.1f} с'
      + (f' · {lufs:.1f} LUFS, LRA {lra:.1f} LU' if lufs is not None and lra is not None else ''))
print()
for w, s in sorted(flags, key=lambda x: -x[0]): print(f'- (вес {w}) {s}')
if not flags: print('Явных примет по кадрам и звуку нет. Композицию, цвет и «подходит ли к любой теме» смотрит оценщик по листу.')
print(f'\nБалл шаблонности кадров: {score} (0–2 чисто · 3–5 есть что объяснить · 6+ много выборов по умолчанию)')
if sheet: print(f'Контактный лист для оценщика: {sheet}')
