# Проверка готового ролика: python3 qa.py out/<файл>.mp4 "<начала сегментов через пробел>"
# Печатает: замершие кадры, громкость, участки речи; сохраняет раскадровку склеек _check/cuts_<имя>.jpg.
import subprocess, sys, os, tempfile, numpy as np
f = sys.argv[1]; offs = [float(x) for x in sys.argv[2].split()] if len(sys.argv) > 2 else []
B = os.path.dirname(os.path.abspath(__file__)); os.makedirs(B + "/_check", exist_ok=True); TMP = tempfile.mkdtemp()
w, h = 90, 160
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
a = np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w).astype(np.float32)
d = np.abs(a[1:] - a[:-1]).mean(axis=(1, 2)); med = float(np.median(d))
runs, s = [], None
for i, v in enumerate(d < max(0.02, med * 0.1)):
    if v and s is None: s = i
    if not v and s is not None:
        if i - s >= 3: runs.append((round((s + 1) / 24, 2), i - s))
        s = None
print("кадров", len(a), "| длина %.2f с" % (len(a) / 24), "| замершие участки (с, кадров):", runs or "нет")
pcm = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32)
e = np.sqrt((pcm[:len(pcm) // 160 * 160].reshape(-1, 160) ** 2).mean(1))
out = subprocess.run(["ffmpeg", "-hide_banner", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
I = [l for l in out.splitlines() if l.strip().startswith("I:")][-1].strip(); P = [l for l in out.splitlines() if "Peak:" in l][-1].strip()
print("громкость:", I, "|", P)
name = os.path.splitext(os.path.basename(f))[0]; ts = []
for o in offs[1:]: ts += [o - 0.10, o + 0.10]
ts = [0.3] + ts + [len(a) / 24 - 0.2]
for i, t in enumerate(ts):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "%.3f" % t, "-i", f, "-frames:v", "1", "-vf", "scale=216:-1", f"{TMP}/_c{i:02d}.jpg"])
cols = (len(ts) + 1) // 2
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{TMP}/_c%02d.jpg", "-filter_complex", f"tile={cols}x2", "-frames:v", "1", f"{B}/_check/cuts_{name}.jpg"])
print("раскадровка склеек:", f"_check/cuts_{name}.jpg", "| моменты:", " ".join("%.2f" % t for t in ts))
