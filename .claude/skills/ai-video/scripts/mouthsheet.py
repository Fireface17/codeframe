# Лист мордочки для поиска окон рта: python mouthsheet.py <клип> x0,y0,x1,y1 <шаг кадров> <лист.jpg>
import sys, subprocess, numpy as np
from PIL import Image, ImageDraw
f, box, step, out = sys.argv[1], [int(v) for v in sys.argv[2].split(",")], int(sys.argv[3]), sys.argv[4]
w, h = 1080, 1920
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vf", f"fps=24,scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
a = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3); x0, y0, x1, y1 = box
idx = list(range(0, len(a), step)); tw = 180; th = round((y1 - y0) * tw / (x1 - x0)); cols = 8
S = Image.new("RGB", (tw * cols, (th + 18) * ((len(idx) + cols - 1) // cols)), "black"); d = ImageDraw.Draw(S)
for k, i in enumerate(idx):
    X, Y = (k % cols) * tw, (k // cols) * (th + 18)
    S.paste(Image.fromarray(a[i][y0:y1, x0:x1]).resize((tw, th)), (X, Y + 18)); d.text((X + 4, Y + 3), f"{i/24:.2f}", fill="yellow")
S.save(out, quality=85); print(out, len(a), "кадров")
