"""Единый конвейер поиска моментов в записи Twitch (в том числе идущей).

python3 scout.py fetch <vod> <a> <b> <work>       — звук и чат отрезка [a, b] секунд записи
python3 scout.py transcribe <work>                — расшифровка кусками по 5 минут (без зацикливания)
python3 scout.py timeline <work>                  — лента по 30 с с метками и список кандидатов по чату
"""
import json
import os
import re
import statistics as st
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gql import comments  # noqa: E402

MODEL = os.environ.get("WHISPER_MODEL") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "library", "models", "ggml-large-v3-turbo-q5_0.bin")
LAUGH = re.compile(r"(LUL|KEKW|КЕКВ|LMAO|OMEGALUL|ICANT|[АХПЪ]{4,}|[AHX]{4,}|ОРУ|😂|🤣|💀|\){3,}|ЛОЛ|LOL|РЖУ|АХУЕ|ЧТО\?|WHAT)", re.I)
HALLU = re.compile(r"(Субтитры|Редактор субтитров|Продолжение следует|DimaTorzok|Корректор)", re.I)
CHUNK = 300
WIN = 30


def fmt(t):
    t = int(t)
    return f"{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}"


def fetch(vod, a, b, work):
    os.makedirs(work, exist_ok=True)
    json.dump({"vod": vod, "a": a, "b": b}, open(work + "/meta.json", "w"))

    def chat_one(t):
        for _ in range(3):
            try:
                c = comments(vod, t)
                if not c:
                    return {"t": t, "rate": 0, "laugh": 0, "msgs": []}
                span = max(1, c[-1][0] - c[0][0] + 1)
                return {"t": t, "rate": len(c) / span, "laugh": sum(bool(LAUGH.search(x[1])) for x in c) / len(c),
                        "msgs": [x[1][:50] for x in c[:30]]}
            except Exception:
                pass
        return {"t": t, "rate": 0, "laugh": 0, "msgs": [], "err": 1}

    # Длинный отрезок качаем целиком родным загрузчиком в 8 потоков (вырезка через ffmpeg идёт почти в реальном времени),
    # короткий хвост — вырезкой.
    import hls
    if not os.path.exists(work + "/audio.mp4"):
        info = hls.fetch(vod, "Audio_Only", a, b, work + "/audio.mp4")
        json.dump({"vod": vod, "a": int(info["start"]), "b": int(info["end"])}, open(work + "/meta.json", "w"))
    meta = json.load(open(work + "/meta.json"))
    a, b = meta["a"], meta["b"]
    with ThreadPoolExecutor(6) as ex:
        chat = list(ex.map(chat_one, range(a, b, 10)))
    r = type("R", (), {"stderr": ""})
    json.dump(chat, open(work + "/chat.json", "w"), ensure_ascii=False)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", work + "/audio.mp4", "-ac", "1", "-ar", "16000", work + "/audio.wav"])
    print("звук:", os.path.getsize(work + "/audio.wav") // 32000, "с | чат: точек", len(chat), "ошибок", sum("err" in c for c in chat), r.stderr[-200:])


def transcribe(work):
    meta = json.load(open(work + "/meta.json"))
    dur = os.path.getsize(work + "/audio.wav") // 32000
    segs = []
    for off in range(0, dur, CHUNK):
        part = f"{work}/c_{off}"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(off), "-t", str(CHUNK), "-i", work + "/audio.wav", part + ".wav"])
        subprocess.run(["whisper-cli", "-m", MODEL, "-l", "ru", "-mc", "0", "-f", part + ".wav", "-osrt", "-of", part], capture_output=True)
        srt = open(part + ".srt").read() if os.path.exists(part + ".srt") else ""
        for h, m, s, h2, m2, s2, t in re.findall(r"(\d\d):(\d\d):(\d\d),\d+ --> (\d\d):(\d\d):(\d\d),\d+\n(.*?)\n\n", srt, re.S):
            t = t.strip().replace("\n", " ")
            if t and not HALLU.search(t):
                segs.append([meta["a"] + off + int(h) * 3600 + int(m) * 60 + int(s), meta["a"] + off + int(h2) * 3600 + int(m2) * 60 + int(s2), t])
        os.remove(part + ".wav")
    json.dump(segs, open(work + "/segs.json", "w"), ensure_ascii=False)
    # громкость по секундам
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", work + "/audio.wav", "-af",
                        "asetnsamples=16000,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-"],
                       capture_output=True, text=True)
    rms = [float(x) if x not in ("-inf", "") else -90.0 for x in re.findall(r"RMS_level=(\S+)", r.stdout)]
    json.dump(rms, open(work + "/rms.json", "w"))
    print("расшифровано реплик:", len(segs), "| секунд громкости:", len(rms))


def timeline(work):
    meta = json.load(open(work + "/meta.json"))
    a, b = meta["a"], meta["b"]
    segs = json.load(open(work + "/segs.json"))
    chat = json.load(open(work + "/chat.json"))
    rms = json.load(open(work + "/rms.json"))
    nb = (b - a) // WIN + 1
    rate = [[] for _ in range(nb)]
    laugh = [[] for _ in range(nb)]
    msgs = [[] for _ in range(nb)]
    for c in chat:
        i = (c["t"] - a) // WIN
        if 0 <= i < nb:
            rate[i].append(c["rate"]); laugh[i].append(c["laugh"]); msgs[i] += c["msgs"]
    rate = [st.mean(x) if x else 0 for x in rate]
    laugh = [st.mean(x) if x else 0 for x in laugh]
    loud = []
    for i in range(nb):
        seg = sorted(rms[i * WIN:(i + 1) * WIN] or [-90])
        loud.append(st.mean(seg[int(len(seg) * 0.8):]))

    def z(v, w=20):
        out = []
        for i in range(len(v)):
            loc = v[max(0, i - w):i + w + 1]
            m = st.median(loc); s = st.pstdev(loc) or 1
            out.append((v[i] - m) / s)
        return out

    zr, zl, zo = z(rate), z(laugh), z(loud)
    lines = []
    prev = None
    for i in range(nb):
        t = a + i * WIN
        txt = []
        for s, e, x in segs:
            if t <= s < t + WIN and x != prev:
                txt.append(x); prev = x
        mark = ("★" if zr[i] + zl[i] > 3 else "") + ("!" if zo[i] > 1.5 else "")
        lines.append(f"[{fmt(t)} ч{zr[i]:+.1f} см{laugh[i] * 100:.0f}% гр{zo[i]:+.1f}{mark}] " + " ".join(txt))
    open(work + "/timeline.txt", "w").write("\n".join(lines))
    # кандидаты по чату
    score = [zr[i] + zl[i] + 0.4 * max(0, zo[i]) for i in range(nb)]
    order = sorted(range(nb), key=lambda i: -score[i])
    picked = []
    for i in order:
        if all(abs(i - j) > 2 for j in picked):
            picked.append(i)
        if len(picked) == 14:
            break
    out = []
    for i in sorted(picked):
        freq = {}
        for m in msgs[i]:
            k = m.strip().upper()[:24]
            freq[k] = freq.get(k, 0) + 1
        top = ", ".join(f"{k}×{v}" for k, v in sorted(freq.items(), key=lambda kv: -kv[1])[:6])
        out.append(f"{fmt(a + i * WIN)}  счёт {score[i]:.1f} (чат {zr[i]:+.1f}, смех {laugh[i] * 100:.0f}%, громк {zo[i]:+.1f}) | чат: {top}")
    open(work + "/candidates.txt", "w").write("\n".join(out))
    print("окон:", nb, "| знаков ленты:", sum(len(x) for x in lines))
    print("\n".join(out))


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "fetch":
        fetch(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5])
    elif cmd == "transcribe":
        transcribe(sys.argv[2])
    elif cmd == "timeline":
        timeline(sys.argv[2])
