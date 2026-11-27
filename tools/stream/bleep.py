"""Писк на бранные слова с самопроверкой: накладывает писк, распознаёт результат, добавляет интервалы для того, что ещё слышно.
python3 bleep.py <видео без писка> <начальные интервалы.json> <выход.mp4> <рабочая папка>"""
import json, os, re, subprocess, sys
SRC, IV0, DST, W = sys.argv[1:5]
MODEL = os.environ.get("WHISPER_MODEL") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "library", "models", "ggml-large-v3-turbo-q5_0.bin")
MAT = re.compile(r"^(ху[йяеёюи]|наху|нах$|них|пизд|бля|бл[яе]д|[её]б|у[её]б|за[её]б|вы[её]б|объ[её]б|залуп|г[ао]ндон)", re.I)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", SRC], capture_output=True, text=True).stdout)
iv = json.load(open(IV0))

def merge(iv):
    iv = sorted([max(0, a), min(dur, b)] for a, b in iv); out = []
    for a, b in iv:
        if out and a <= out[-1][1] + 0.03: out[-1][1] = max(out[-1][1], b)
        else: out.append([a, b])
    return out

def render(iv):
    en = "+".join(f"between(t,{a:.2f},{b:.2f})" for a, b in iv)
    fc = (f"[0:a]volume=0:enable='{en}'[v];sine=frequency=1000:sample_rate=48000:duration={dur:.2f},volume=0.10[s0];"
          f"[s0]volume=0:enable='not({en})'[s];[v][s]amix=inputs=2:normalize=0:duration=first[a]")
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", DST], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-300:]

def heard():
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", DST, "-vn", "-ac", "1", "-ar", "16000", W + "/chk.wav"])
    subprocess.run(["whisper-cli", "-m", MODEL, "-l", "ru", "-mc", "0", "-ml", "1", "-sow", "-f", W + "/chk.wav", "-osrt", "-of", W + "/chk"], capture_output=True)
    srt = open(W + "/chk.srt").read()
    ws = [(int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000, int(h2) * 3600 + int(m2) * 60 + int(s2) + int(ms2) / 1000, t.strip())
          for h, m, s, ms, h2, m2, s2, ms2, t in re.findall(r"(\d\d):(\d\d):(\d\d),(\d+) --> (\d\d):(\d\d):(\d\d),(\d+)\n(.*?)\n\n", srt, re.S)]
    return [(a, b, w) for a, b, w in ws if MAT.search(w.strip('«»".,!?—-… ').lower())]

for it in range(5):
    iv = merge(iv); render(iv)
    left = heard()
    print(f"проход {it + 1}: интервалов {len(iv)}, писк {sum(b - a for a, b in iv):.1f} с из {dur:.1f}; ещё слышно: {[(round(a,1), w) for a, b, w in left]}")
    if not left: break
    for a, b, w in left: iv.append([a - 0.15, min(b, a + 0.9) + 0.15])
json.dump(merge(iv), open(W + "/bleep_final.json", "w"))
