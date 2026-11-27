"""Цензура брани звуком и звуковые вставки поверх готового клипа (видео не перекодируется).
python3 censor.py <вход.mp4> <выход.mp4> <job.json>
job: {"mode": "quack" | "soft" | "none", "sample": "кряк.wav", "words": [[a,b],...], "sfx": [{"file":..., "t": сек, "gain_db": -9}]}
quack — речь на слове глушится полностью, поверх кряк; soft — речь приглушается (слово слышно), поверх тихий кряк."""
import json, subprocess, sys
SRC, DST, JOB = sys.argv[1:4]
job = json.load(open(JOB))
words = job.get("words", []); mode = job.get("mode", "none")
inputs = ["-i", SRC]; fc = []; mix = []; n = 1
if mode != "none" and words:
    en = "+".join(f"between(t,{a:.2f},{b:.2f})" for a, b in words)
    duck = 0.0 if mode == "quack" else 0.40
    fc.append(f"[0:a]volume={duck}:enable='{en}'[sp]"); mix.append("[sp]")
    gain = -5 if mode == "quack" else -11
    for a, b in words:
        starts = [a] if b - a < 0.75 else [a, a + (b - a) / 2]
        for st in starts:
            inputs += ["-i", job["sample"]]
            fc.append(f"[{n}:a]volume={gain}dB,adelay={int(st * 1000)}:all=1[q{n}]"); mix.append(f"[q{n}]"); n += 1
else:
    mix.append("[0:a]")
for fx in job.get("sfx", []):
    inputs += ["-i", fx["file"]]
    fc.append(f"[{n}:a]volume={fx.get('gain_db', -9)}dB,adelay={int(fx['t'] * 1000)}:all=1[q{n}]"); mix.append(f"[q{n}]"); n += 1
fc.append("".join(mix) + f"amix=inputs={len(mix)}:normalize=0:duration=first,alimiter=limit=0.89[a]")
r = subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "0:v", "-map", "[a]", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", DST], capture_output=True, text=True)
print("OK" if r.returncode == 0 else "ОШИБКА: " + r.stderr[-300:], "|", mode, "| слов:", len(words), "| вставок:", len(job.get("sfx", [])), "|", DST.rsplit("/", 1)[-1])
