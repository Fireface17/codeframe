# Приёмка отрезка: python3 clipcheck.py <клип.mp4> <лист.jpg> — размер, длина, повторы кадров, лист из 12 кадров.
import sys, subprocess, numpy as np
from PIL import Image
f, out = sys.argv[1], sys.argv[2]
w, h = [int(v) for v in subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip().split(",")[:2]]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vf", "fps=24", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
a = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
d = np.abs(a[1:].astype(np.int16) - a[:-1].astype(np.int16)).mean(axis=(1, 2, 3))
rep = [i + 1 for i, v in enumerate(d) if v < 0.25]
print(f"{f}: {w}x{h}, кадров {len(a)} ({len(a)/24:.2f} с), повторов {len(rep)} ({100*len(rep)/max(1,len(a)-1):.1f} %): {rep[:20]}")
idx = np.linspace(0, len(a) - 1, 12).astype(int); tw = 240; th = round(h * tw / w)
S = Image.new("RGB", (tw * 6, th * 2))
for k, i in enumerate(idx): S.paste(Image.fromarray(a[i]).resize((tw, th)), ((k % 6) * tw, (k // 6) * th))
S.save(out, quality=85); print("лист:", out, "кадры:", " ".join(f"{i/24:.2f}" for i in idx))
