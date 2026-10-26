# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10"]
# ///
# Контактный лист из готового MP4: кадр ровно каждые STEP с (номер кадра n = round(t·fps)), подпись — точное время кадра.
#   uv run --script tools/contact.py out/final/film.mp4 out/final/contact.png [--step 0.5] [--cols 10] [--w 216]
# Прежний способ (ffmpeg fps=2) брал кадры со сдвигом ~+0,25 с — подписи не совпадали со временем (прогон критиков 1).
import argparse, json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--step', type=float, default=0.5); ap.add_argument('--cols', type=int, default=10); ap.add_argument('--w', type=int, default=216)
ap.add_argument('--t0', type=float, default=0.0); ap.add_argument('--t1', type=float, default=None)
a = ap.parse_args()
pr = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries',
                                         'stream=r_frame_rate,nb_read_frames,width,height', '-of', 'json', a.src]))['streams'][0]
num, den = map(int, pr['r_frame_rate'].split('/')); fps = num / den; nf = int(pr['nb_read_frames'])
t1 = a.t1 if a.t1 is not None else (nf - 1) / fps
times, t = [], a.t0
while t <= t1 + 1e-6: times.append(round(t, 3)); t += a.step
idx = sorted({min(nf - 1, round(x * fps)) for x in times})
with tempfile.TemporaryDirectory() as d:
    # выражение select у ffmpeg не разбирает больше ~100 слагаемых (ролик 52 с при шаге 0,5 с) — режем на куски по 50
    for j in range(0, len(idx), 50):
        sel = '+'.join(f'eq(n,{i})' for i in idx[j:j + 50])
        subprocess.check_call(['ffmpeg', '-loglevel', 'error', '-y', '-i', a.src, '-vf', f"select='{sel}',scale={a.w}:-2:flags=lanczos",
                               '-fps_mode', 'passthrough', os.path.join(d, f'f_{j // 50:02d}_%04d.png')])
    files = sorted(f for f in os.listdir(d) if f.endswith('.png'))
    ims = [Image.open(os.path.join(d, f)).convert('RGB') for f in files]
h = ims[0].height; pad = 6; lab = 26; cols = a.cols; rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (a.w + pad) + pad, rows * (h + lab + pad) + pad), 'white')
dr = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 20)
except Exception: font = ImageFont.load_default()
for k, (im, i) in enumerate(zip(ims, idx)):
    x, y = pad + (k % cols) * (a.w + pad), pad + (k // cols) * (h + lab + pad)
    sheet.paste(im, (x, y + lab))
    dr.text((x + 2, y + 2), f'{i / fps:.2f}', fill=(200, 0, 0), font=font)
sheet.save(a.out)
print(f'{len(ims)} кадров, шаг {a.step} с, {fps:g} fps -> {a.out}')
