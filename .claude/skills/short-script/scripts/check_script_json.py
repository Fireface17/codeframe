#!/usr/bin/env python3
"""Проверка script.json для code-motion перед озвучкой.
   python3 check_script_json.py script.json [--wps 2.8]
Проверяет: число слов display == align в каждой фразе; в align (ru) нет латиницы; оценивает
хронометраж (слова / wps + lead + паузы + tail). Слово = кусок между пробелами с буквой или цифрой
(так же считает code-motion). Темп по умолчанию 2,8 слова/с — бодрая живая подача;
   спокойный диктор — --wps 2.4."""
import json, re, sys

def words(s):
    return [w for w in s.split() if re.search(r'[^\W_]', w)]

path = sys.argv[1] if len(sys.argv) > 1 else 'script.json'
wps = float(sys.argv[sys.argv.index('--wps') + 1]) if '--wps' in sys.argv else 2.8
d = json.load(open(path, encoding='utf-8'))
ph = d.get('phrases', [])
lang = d.get('lang', 'ru')
bad = 0
total = 0
for i, p in enumerate(ph, 1):
    disp = p.get('display', '')
    al = p.get('align', disp)
    nd, na = len(words(disp)), len(words(al))
    total += nd
    msgs = []
    if nd != na:
        msgs.append(f'слов display {nd} ≠ align {na}')
    if lang == 'ru' and re.search(r'[A-Za-z]', al):
        msgs.append('латиница в align (для ru только кириллица)')
    if re.search(r'\d \d', disp):
        msgs.append('число с пробелом в display («5 000» = два слова)')
    if msgs:
        bad += 1
        print(f'фраза {i}: ' + '; '.join(msgs))
        print(f'   display: {disp}\n   align:   {al}')
pauses = d.get('pauses', [])
gaps = [pauses[min(k, len(pauses) - 1)] if pauses else 0.3 for k in range(max(0, len(ph) - 1))]
dur = total / wps + d.get('lead', 0.3) + sum(gaps) + d.get('tail', 0.6)
print(f'{len(ph)} фраз, {total} слов, ≈{dur:.1f} с при {wps} слова/с'
      f' (нейроголос ~3 слова/с: ≈{total / 3 + d.get("lead", 0.3) + sum(gaps) + d.get("tail", 0.6):.1f} с)')
print('OK' if not bad else f'ошибок во фразах: {bad}')
sys.exit(1 if bad else 0)
