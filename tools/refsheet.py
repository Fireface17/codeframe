#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""Контактный лист сцен референса: кадры shots/*.jpg + shots.csv -> sheet.jpg с номером и таймкодом.
   uv run --script tools/refsheet.py refs/videos/<имя> [--cols 6]"""
import csv, math, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

d = Path(sys.argv[1])
cols = int(sys.argv[sys.argv.index('--cols') + 1]) if '--cols' in sys.argv else 6
rows_ = list(csv.DictReader(open(d / 'shots.csv')))
frames = [(r, d / 'shots' / f"{int(r['n']):03d}.jpg") for r in rows_]
frames = [(r, p) for r, p in frames if p.exists()]
if not frames:
    sys.exit('нет кадров')
w0, h0 = Image.open(frames[0][1]).size
tw = 320; th = round(tw * h0 / w0); pad = 26
rows = math.ceil(len(frames) / cols)
sheet = Image.new('RGB', (cols * tw, rows * (th + pad)), (245, 244, 240))
try:
    font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 15)
except OSError:
    font = ImageFont.load_default()
dr = ImageDraw.Draw(sheet)
for k, (r, p) in enumerate(frames):
    x, y = (k % cols) * tw, (k // cols) * (th + pad)
    sheet.paste(Image.open(p).convert('RGB').resize((tw, th)), (x, y + pad))
    s = float(r['start'])
    dr.text((x + 6, y + 5), f"#{int(r['n'])}  {int(s // 60)}:{s % 60:05.2f}  ·  {float(r['dur']):.2f} с", fill=(40, 40, 44), font=font)
sheet.save(d / 'sheet.jpg', quality=88)
print(f'sheet.jpg: {len(frames)} сцен, {cols}×{rows}')
