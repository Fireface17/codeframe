"""Сторож эфира: копит ленту и кандидатов по идущей записи Twitch и завершается, когда в свежем окне есть сильный всплеск чата.

python3 storozh.py <логин> <vod> [папка стримера]

Каждые 4–5 минут: свежий кусок записи с перекрытием 2 минуты (scout fetch → transcribe), слияние с накопленным,
лента по хвосту записи (scout timeline). Нашёл новый сильный всплеск (★) — печатает строки «КАНДИДАТ …» и выходит.
Эфир закончился — печатает «ЭФИР ЗАКОНЧЕН …» и выходит. Иначе молча ждёт следующего прохода.

В папке стримера: storozh.json (до какой секунды обработано, о каких окнах уже сообщено), chat_all.json, segs_all.json,
rms_all.json (накопленное), lenta.txt (вся лента), kandidaty.txt (все сильные кандидаты), _hvost/ (последний расчёт ленты).
Куски звука — в папке STOROZH_TMP (по умолчанию <папка стримера>/_kuski), звук после расшифровки удаляется.
"""
import contextlib
import io
import json
import os
import re
import sys
import time

K = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, K)
import hls  # noqa: E402
import scout  # noqa: E402
from gql import gql  # noqa: E402

LOGIN, VOD = sys.argv[1], sys.argv[2]
ROOT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.getcwd(), "work", LOGIN)
TMP = os.environ.get("STOROZH_TMP") or os.path.join(ROOT, "_kuski")
STEP = 270        # секунд между проходами
OVERLAP = 120     # перекрытие с уже обработанным
TAIL = 2400       # лента считается по хвосту такой длины (нужна местная норма чата)
MIN_NEW = 240     # меньше нового материала — ждём
MAX_LINES = 6

os.makedirs(ROOT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)


def load(name, default):
    p = os.path.join(ROOT, name)
    return json.load(open(p)) if os.path.exists(p) else default


def save(name, obj):
    p = os.path.join(ROOT, name)
    json.dump(obj, open(p + ".tmp", "w"), ensure_ascii=False)
    os.replace(p + ".tmp", p)


def secs(hms):
    h, m, s = hms.split(":")
    return int(h) * 3600 + int(m) * 60 + int(s)


def live():
    try:
        d = gql({"query": 'query($l:String!){user(login:$l){stream{id}}}', "variables": {"l": LOGIN}})
        return bool(d["data"]["user"]["stream"])
    except Exception:  # noqa: BLE001
        return True


def one_pass(st):
    """Возвращает (список строк о новых кандидатах | None, если нового материала мало; длина записи)."""
    total = int(hls.playlist(VOD, "Audio_Only")[2])
    done = st["done_to"]
    if total - done < MIN_NEW:
        return None, total
    a, b = max(0, done - OVERLAP), total
    work = os.path.join(TMP, f"{a}-{b}")
    with contextlib.redirect_stdout(io.StringIO()):
        scout.fetch(VOD, a, b, work)
        scout.transcribe(work)
    meta = json.load(open(work + "/meta.json"))
    a, b = meta["a"], meta["b"]

    # слияние с накопленным: всё, что новее начала куска, заменяется свежим
    chat = {int(t): c for t, c in load("chat_all.json", {}).items() if int(t) < a}
    for c in json.load(open(work + "/chat.json")):
        chat[c["t"]] = c
    segs = [s for s in load("segs_all.json", []) if s[0] < a] + json.load(open(work + "/segs.json"))
    rms = {int(t): v for t, v in load("rms_all.json", {}).items()}
    for i, v in enumerate(json.load(open(work + "/rms.json"))):
        rms[a + i] = v
    save("chat_all.json", chat); save("segs_all.json", segs); save("rms_all.json", rms)

    # лента по хвосту
    ta = max(0, min(b - TAIL, done - 900)) // 30 * 30
    tail = os.path.join(ROOT, "_hvost")
    os.makedirs(tail, exist_ok=True)
    json.dump({"vod": VOD, "a": ta, "b": b}, open(tail + "/meta.json", "w"))
    json.dump([chat[t] for t in sorted(chat) if t >= ta], open(tail + "/chat.json", "w"), ensure_ascii=False)
    json.dump([s for s in segs if s[0] >= ta], open(tail + "/segs.json", "w"), ensure_ascii=False)
    json.dump([rms.get(ta + i, -90.0) for i in range(b - ta)], open(tail + "/rms.json", "w"))
    with contextlib.redirect_stdout(io.StringIO()):
        scout.timeline(tail)

    lenta = {int(t): x for t, x in load("lenta.json", {}).items()}
    stars = {}
    for line in open(tail + "/timeline.txt").read().splitlines():
        m = re.match(r"\[(\d+:\d\d:\d\d) [^\]]*\]", line)
        if not m:
            continue
        t = secs(m.group(1))
        if t >= a - 600 or t not in lenta:
            lenta[t] = line
        if "★" in m.group(0):
            stars[t] = line
    save("lenta.json", lenta)
    open(os.path.join(ROOT, "lenta.txt"), "w").write("\n".join(lenta[t] for t in sorted(lenta)) + "\n")

    cands = {}
    for line in open(tail + "/candidates.txt").read().splitlines():
        m = re.match(r"(\d+:\d\d:\d\d)\s+счёт (-?[\d.]+)", line)
        if m:
            cands[secs(m.group(1))] = (float(m.group(2)), line)

    lo, hi = (0 if done == 0 else done - OVERLAP - 30), b - 45   # последнее окно ещё не добрало чат — возьмём в следующий проход
    seen = set(st["reported"])
    fresh = []
    for t in sorted(stars):
        if lo <= t <= hi and not ({t - 30, t, t + 30} & seen):
            score, line = cands.get(t, (3.0, stars[t][:160]))
            fresh.append((score, t, line))
            seen.add(t)
    st["reported"] = sorted(seen)
    st["done_to"] = b
    st["total"] = total
    st["updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
    save("storozh.json", st)
    for f in ("audio.wav", "audio.mp4"):
        with contextlib.suppress(FileNotFoundError):
            os.remove(os.path.join(work, f))
    if fresh:
        with open(os.path.join(ROOT, "kandidaty.txt"), "a") as f:
            for score, t, line in sorted(fresh, key=lambda x: x[1]):
                f.write(f"{t}\t{line}\n")
    # будим только сильными: слабее порога STOROZH_MIN остаются в kandidaty.txt и ждут разбора вместе со следующим сильным
    fresh = [x for x in fresh if x[0] >= float(os.environ.get("STOROZH_MIN", "0"))]
    fresh.sort(reverse=True)
    out = [f"КАНДИДАТ {LOGIN} vod {VOD} | {t} с | {line}" for score, t, line in fresh[:MAX_LINES]]
    if len(fresh) > MAX_LINES:
        out.append(f"…и ещё {len(fresh) - MAX_LINES} слабее — в {ROOT}/kandidaty.txt")
    return out, total


st = load("storozh.json", None)
if not st or st.get("vod") != VOD:
    st = {"vod": VOD, "done_to": 0, "reported": []}
fails = stale = 0
while True:
    t0 = time.time()
    try:
        found, total = one_pass(st)
        fails = 0
    except Exception as e:  # noqa: BLE001
        fails += 1
        if fails >= 5:
            print(f"СБОЙ СТОРОЖА {LOGIN}: {e!r}"[:300])
            sys.exit(2)
        time.sleep(45)
        continue
    if found:
        print(f"обработано до {scout.fmt(st['done_to'])} (запись {scout.fmt(total)})")
        print("\n".join(found))
        sys.exit(0)
    if found is None:
        stale += 1
        if stale >= 3 and not live():
            print(f"ЭФИР ЗАКОНЧЕН {LOGIN}: запись {VOD}, обработано до {scout.fmt(st['done_to'])}")
            sys.exit(0)
        time.sleep(min(STEP, max(30, MIN_NEW - (total - st["done_to"]) + 10)))
    else:
        stale = 0
        time.sleep(max(20, STEP - (time.time() - t0)))
