"""Сборка вертикального клипа по монтажному листу. python3 build.py <edl.json>

edl: {
  src, out, work, title:[...], tag,
  blocks: [ { a, b, flash_out?, flash_in?, parts:[ {to, mode} ... ] } ],   # a..b — непрерывный кусок исходника; parts делят его по режимам
  subs:   [ { a, b, text } ],            # время исходника, text — 1–3 слова
  captions: [ { name, text, a, b, y? } ],# время исходника (показывается, пока идёт этот кусок)
  sfx: [ { file, at_block, gain_db } ]   # звук в начале блока
}
Режимы: split (камера сверху, игра снизу), zoom (то же, камера крупнее), game (игра во весь экран).
"""
import json
import os
import subprocess
import sys

E = json.load(open(sys.argv[1]))
WORK = E["work"]
os.makedirs(WORK, exist_ok=True)
os.makedirs(os.path.dirname(E["out"]), exist_ok=True)
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
FPS = 60
SUB_Y = E.get("sub_y", 1270)
SEAM_Y = E.get("seam_y", 607)

# --- раскладка времени: исходник -> ролик
segs = []      # (src_a, src_b, mode, block_index, first_in_block, last_in_block)
t_out = 0.0
block_out = []  # (out_start, out_end) по блокам
for bi, bl in enumerate(E["blocks"]):
    start = t_out
    a = bl["a"]
    for pi, p in enumerate(bl["parts"]):
        segs.append({"a": a, "b": p["to"], "mode": p["mode"], "block": bi, "first": pi == 0, "last": pi == len(bl["parts"]) - 1,
                     "out": t_out, "zoom": p.get("zoom", bl.get("zoom", []))})
        t_out += p["to"] - a
        a = p["to"]
    assert abs(a - bl["b"]) < 1e-6, f"блок {bi}: части не сходятся с концом"
    block_out.append((start, t_out))
TOTAL = t_out


def to_out(ts):
    """Время исходника -> время ролика (или None, если момент не вошёл)."""
    acc = 0.0
    for bl in E["blocks"]:
        if bl["a"] - 1e-6 <= ts <= bl["b"] + 1e-6:
            return acc + (ts - bl["a"])
        acc += bl["b"] - bl["a"]
    return None


# --- текст
subs_states = []   # (out_a, out_b, png)
job_subs = []
for i, s in enumerate(E["subs"]):
    raw = s["text"].split()
    emph = [w.startswith("_") and w.rstrip(",.!?:»").endswith("_") for w in raw]
    words = [w.replace("_", "") for w in raw]
    if "ow" in s:                      # точные времена слов в секундах ролика: [[a, b], ...]
        spans = [(max(0.0, a), b) for a, b in s["ow"]]
        assert len(spans) == len(words), f"число времён не равно числу слов: {s}"
        for j in range(len(spans) - 1):            # слово светится до начала следующего
            spans[j] = (spans[j][0], spans[j + 1][0])
    else:
        oa, ob = to_out(s["a"]), to_out(s["b"])
        assert oa is not None and ob is not None, f"субтитр вне ролика: {s}"
        weights = [max(2, len(w)) for w in words]
        tot = sum(weights); t = oa; spans = []
        for j in range(len(words)):
            d = (ob - oa) * weights[j] / tot
            spans.append((t, t + d)); t += d
    if E.get("karaoke", True):
        for j, w in enumerate(words):
            name = f"sub_{i:02d}_{j}"
            job_subs.append({"name": name, "color": s.get("color"),
                             "words": [{"t": x, "on": k == j, "e": emph[k]} for k, x in enumerate(words)]})
            subs_states.append((spans[j][0], spans[j][1], name))
    else:                              # кусок целиком: цвет несут только акцентные слова (и цвет говорящего)
        name = f"sub_{i:02d}"
        job_subs.append({"name": name, "color": s.get("color"), "flat": True,
                         "words": [{"t": x, "on": False, "e": emph[k]} for k, x in enumerate(words)]})
        subs_states.append((spans[0][0], spans[-1][1], name))
caps = []
for c in E.get("captions", []):
    caps.append({"name": c["name"], "text": c["text"], "y": c.get("y", 770), "oa": to_out(c["a"]), "ob": to_out(c["b"])})
job = {"out": WORK + "/txt", "seamY": SEAM_Y, "capY": 770, "title": E["title"], "tag": E.get("tag"), "tagY": E.get("tag_y", 150),
       "subBottom": E.get("sub_bottom", False), "capBold": E.get("cap_bold", False),
       "captions": [{"name": c["name"], "text": c["text"], "y": c["y"]} for c in caps], "subs": job_subs}
json.dump(job, open(WORK + "/textjob.json", "w"), ensure_ascii=False)
r = subprocess.run(["node", SCRIPTS + "/text.mjs", WORK + "/textjob.json"], capture_output=True, text=True)
print(r.stdout.strip(), r.stderr.strip()[:300])
TXT = WORK + "/txt"

# лента субтитров для concat: пустой кадр в промежутках
lines = []
cur = 0.0
for a, b, name in sorted(subs_states):
    a = max(a, cur)
    if a - cur > 1e-3:
        lines += [f"file '{TXT}/blank.png'", f"duration {a - cur:.4f}"]
    if b - a > 1e-3:
        lines += [f"file '{TXT}/{name}.png'", f"duration {b - a:.4f}"]
        cur = b
if TOTAL - cur > 1e-3:
    lines += [f"file '{TXT}/blank.png'", f"duration {TOTAL - cur:.4f}"]
lines += [f"file '{TXT}/blank.png'"]
open(WORK + "/subs.txt", "w").write("\n".join(lines) + "\n")

# --- фильтры видео
MODE = {
    "split": "split=2[c{i}][g{i}];[c{i}]crop=626:352:0:0,scale=1080:607:flags=lanczos,unsharp=5:5:0.5[cc{i}];"
             "[g{i}]crop=778:946:626:67,scale=1080:1313:flags=lanczos[gg{i}];[cc{i}][gg{i}]vstack",
    "zoom": "split=2[c{i}][g{i}];[c{i}]crop=556:312:0:38,scale=1080:607:flags=lanczos,unsharp=5:5:0.6[cc{i}];"
            "[g{i}]crop=778:946:626:67,scale=1080:1313:flags=lanczos[gg{i}];[cc{i}][gg{i}]vstack",
    "game": "crop=608:1080:656:0,scale=1080:1920:flags=lanczos",
    # разговорный стрим: камера на размытом фоне из неё же
    "talk": "split=2[c{i}][g{i}];[g{i}]crop=188:333:200:8,scale=1080:1920,boxblur=26:2,eq=brightness=-0.20:saturation=0.9[bg{i}];"
            "[c{i}]crop=592:333:0:8,scale=1080:607:flags=lanczos,unsharp=5:5:0.5[cc{i}];[bg{i}][cc{i}]overlay=0:540",
    "talkzoom": "split=2[c{i}][g{i}];[g{i}]crop=188:333:200:8,scale=1080:1920,boxblur=26:2,eq=brightness=-0.20:saturation=0.9[bg{i}];"
                "[c{i}]crop=520:292:20:40,scale=1080:607:flags=lanczos,unsharp=5:5:0.6[cc{i}];[bg{i}][cc{i}]overlay=0:540",
}
CAM = E.get("cam", [0, 8, 592, 333])            # x, y, w, h вебкамеры в исходном кадре
FOCUS = E.get("focus", [0.42, 0.50])            # точка лица в кадре камеры: к ней идёт наезд


def zoom_expr(keys, a):
    """Ключевые точки [[время исходника, масштаб], ...] -> выражение масштаба от времени кадра (плавные переходы)."""
    ks = sorted((t - a, z) for t, z in keys)
    if not ks:
        return "1"
    e = f"{ks[-1][1]:.4f}"
    for (t0, z0), (t1, z1) in reversed(list(zip(ks, ks[1:]))):
        u = f"((it-{t0:.3f})/{max(t1 - t0, 0.001):.3f})"
        seg = f"({z0:.4f}+({z1 - z0:.4f})*{u}*{u}*(3-2*{u}))"
        e = f"if(lt(it,{t1:.3f}),{seg},{e})"
    return f"if(lt(it,{ks[0][0]:.3f}),{ks[0][1]:.4f},{e})"


def talkdyn(i, s):
    keys = [k for k in s.get("zoom", []) if s["a"] - 1e-6 <= k[0] <= s["b"] + 1e-6] or [[s["a"], 1.0]]
    z = zoom_expr(keys, s["a"])
    cx, cy, cw, ch = CAM
    fx, fy = FOCUS
    return (f"split=2[c{i}][g{i}];[g{i}]crop={int(cw * 0.32)}:{ch}:{cx + int(cw * 0.34)}:{cy},scale=1080:1920,boxblur=26:2,"
            f"eq=brightness=-0.20:saturation=0.9[bg{i}];"
            f"[c{i}]crop={cw}:{ch}:{cx}:{cy},scale=2160:1214:flags=lanczos,"
            f"zoompan=z='{z}':x='{fx}*iw*(1-1/zoom)':y='{fy}*ih*(1-1/zoom)':d=1:s=1080x607:fps={FPS},unsharp=5:5:0.5[cc{i}];"
            f"[bg{i}][cc{i}]overlay=0:540")


FACE = E.get("face", {"crop": [69, 8, 360, 333], "box_y": 470, "box_h": 1000, "focus": [0.5, 0.38]})


def facedyn(i, s):
    """Лицо крупно: вырезаем из вебкамеры область вокруг стримера и ставим её большим окном на затемнённый размытый фон."""
    keys = [k for k in s.get("zoom", []) if s["a"] - 1e-6 <= k[0] <= s["b"] + 1e-6] or [[s["a"], 1.0]]
    z = zoom_expr(keys, s["a"])
    x, y, w, h = FACE["crop"]
    bh = FACE["box_h"]; fx, fy = FACE["focus"]
    return (f"split=2[c{i}][g{i}];[g{i}]crop={int(w * 0.5)}:{h}:{x + int(w * 0.25)}:{y},scale=1080:1920,boxblur=30:2,"
            f"eq=brightness=-0.36:saturation=0.85[bg{i}];"
            f"[c{i}]crop={w}:{h}:{x}:{y},scale=2160:{2 * bh}:flags=lanczos,"
            f"zoompan=z='{z}':x='{fx}*iw*(1-1/zoom)':y='{fy}*ih*(1-1/zoom)':d=1:s=1080x{bh}:fps={FPS},"
            f"eq=contrast=1.10:brightness=0.03:saturation=1.18,unsharp=5:5:0.7[cc{i}];"
            f"[bg{i}][cc{i}]overlay=0:{FACE['box_y']}")


LAYOUT = E.get("layout", {})   # раскладка эфира из монтажного листа — для режимов stack и full (GTA 6 и любая игра с камерой поверх поля)


def stackdyn(i, s):
    """Лицо крупно сверху, игра снизу. layout: {"face": [x, y, w, h] — область вокруг лица в исходном кадре,
    "game": [x, y, w, h] — поле игры без камеры и баннеров, "face_h": высота верхнего окна (760), "focus": точка лица для наезда}.
    Наезды — ключевыми точками zoom, как в режиме face. Соотношение сторон областей подгоняется обрезкой, без искажений."""
    keys = [k for k in s.get("zoom", []) if s["a"] - 1e-6 <= k[0] <= s["b"] + 1e-6] or [[s["a"], 1.0]]
    z = zoom_expr(keys, s["a"])
    x, y, w, h = LAYOUT["face"]
    gx, gy, gw, gh = LAYOUT["game"]
    fh = LAYOUT.get("face_h", 760); fx, fy = LAYOUT.get("focus", [0.5, 0.4])
    return (f"split=2[c{i}][g{i}];"
            f"[c{i}]crop={w}:{h}:{x}:{y},scale=2160:{2 * fh}:force_original_aspect_ratio=increase:flags=lanczos,crop=2160:{2 * fh},"
            f"zoompan=z='{z}':x='{fx}*iw*(1-1/zoom)':y='{fy}*ih*(1-1/zoom)':d=1:s=1080x{fh}:fps={FPS},"
            f"eq=contrast=1.08:brightness=0.02:saturation=1.12,unsharp=5:5:0.7[cc{i}];"
            f"[g{i}]crop={gw}:{gh}:{gx}:{gy},scale=1080:{1920 - fh}:force_original_aspect_ratio=increase:flags=lanczos,"
            f"crop=1080:{1920 - fh}[gg{i}];[cc{i}][gg{i}]vstack")


def fullgame(i, s):
    """Игра во весь экран: layout["full"] — вертикальная область исходного кадра (по умолчанию середина 608×1080)."""
    gx, gy, gw, gh = LAYOUT.get("full", [656, 0, 608, 1080])
    return f"crop={gw}:{gh}:{gx}:{gy},scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920"


DYN = {"face": facedyn, "talkdyn": talkdyn, "stack": stackdyn, "full": fullgame}

fc = []
for i, s in enumerate(segs):
    d = s["b"] - s["a"]
    body = DYN[s["mode"]](i, s) if s["mode"] in DYN else MODE[s["mode"]].format(i=i)
    chain = f"[0:v]trim={s['a']}:{s['b']},setpts=PTS-STARTPTS,fps={FPS}," + body
    bl = E["blocks"][s["block"]]
    if s["first"] and bl.get("flash_in"):
        chain += f",fade=t=in:st=0:d=0.28:c=white"
    if s["last"] and bl.get("flash_out"):
        chain += f",fade=t=out:st={max(0, d - 0.10):.3f}:d=0.10:c=white"
    fc.append(chain + f",setsar=1[v{i}]")
fc.append("".join(f"[v{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=1:a=0[vcat]")

# --- звук: по блокам, с короткими затуханиями на стыках
for bi, bl in enumerate(E["blocks"]):
    d = bl["b"] - bl["a"]
    fc.append(f"[0:a]atrim={bl['a']}:{bl['b']},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.015,afade=t=out:st={d - 0.02:.3f}:d=0.02[a{bi}]")
fc.append("".join(f"[a{bi}]" for bi in range(len(E["blocks"]))) + f"concat=n={len(E['blocks'])}:v=0:a=1[acat]")

inputs = ["-i", E["src"],
          "-f", "concat", "-safe", "0", "-i", WORK + "/subs.txt",
          "-loop", "1", "-framerate", str(FPS), "-i", TXT + "/title.png",
          "-loop", "1", "-framerate", str(FPS), "-i", TXT + "/tag.png"]
n_in = 4
# заголовок виден в режимах split и zoom
ranges = [(s["out"], s["out"] + s["b"] - s["a"]) for s in segs if s["mode"] not in ("game", "full")]
en_title = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in ranges) or "0"
fc.append(f"[1:v]fps={FPS},format=rgba[subv]")
fc.append(f"[vcat][2:v]overlay=0:0:enable='{en_title}'[o1]")
fc.append(f"[o1][3:v]overlay=0:0[o2]")
last = "o2"
for k, c in enumerate(caps):
    inputs += ["-loop", "1", "-framerate", str(FPS), "-i", f"{TXT}/cap_{c['name']}.png"]
    fc.append(f"[{last}][{n_in}:v]overlay=0:0:enable='between(t,{c['oa']:.3f},{c['ob']:.3f})'[oc{k}]")
    last = f"oc{k}"
    n_in += 1
fc.append(f"[{last}][subv]overlay=0:{SUB_Y}:eof_action=pass,format=yuv420p[vout]")

# звуковые эффекты
amix = ["[acat]"]
for k, fx in enumerate(E.get("sfx", [])):
    inputs += ["-i", fx["file"]]
    if "out" in fx:
        base = fx["out"]
    elif "at" in fx:
        base = to_out(fx["at"])
    else:
        base = block_out[fx["at_block"]][0]
    delay = int(base * 1000 + fx.get("shift_ms", 0))
    fc.append(f"[{n_in}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={fx.get('gain_db', -14)}dB,adelay={max(0, delay)}:all=1[fx{k}]")
    amix.append(f"[fx{k}]")
    n_in += 1
if len(amix) > 1:
    fc.append("".join(amix) + f"amix=inputs={len(amix)}:normalize=0:duration=first[amx]")
    a_last = "amx"
else:
    a_last = "acat"
fc.append(f"[{a_last}]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]")

cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "[aout]",
       "-t", f"{TOTAL:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", E["out"]]
r = subprocess.run(cmd, capture_output=True, text=True)
print("ffmpeg:", "OK" if r.returncode == 0 else "ОШИБКА", r.stderr.strip()[-600:])
json.dump({"total": TOTAL, "segs": segs, "subs": subs_states, "caps": caps}, open(WORK + "/timeline.json", "w"), ensure_ascii=False, indent=1)
print(f"длина {TOTAL:.2f} с | кусков {len(segs)} | блоков {len(E['blocks'])} | субтитров {len(E['subs'])} | {E['out']}")
