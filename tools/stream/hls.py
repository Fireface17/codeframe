"""Быстрый забор куска записи Twitch (в том числе идущей): сегменты качаются параллельно, без ffmpeg-загрузчика,
который на растущей записи идёт со скоростью 1x.

python3 hls.py <vod> <формат: Audio_Only | 1080p60 | best> <a> <b> <выход.mp4>
Печатает JSON: {"start": время начала первого сегмента, "end": ..., "segments": N, "total": длина записи}
"""
import json
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin


def get(url, tries=4):
    last = None
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
    raise last


def playlist(vod, fmt):
    sel = {"best": "best[height<=1080]"}.get(fmt, fmt)
    r = subprocess.run(["yt-dlp", "--no-warnings", "-g", "-f", sel, f"https://www.twitch.tv/videos/{vod}"], capture_output=True, text=True)
    url = r.stdout.strip().splitlines()[0]
    text = get(url).decode()
    init, segs, t, dur = None, [], 0.0, None
    for line in text.splitlines():
        if line.startswith("#EXT-X-MAP:"):
            init = urljoin(url, line.split('URI="')[1].split('"')[0])
        elif line.startswith("#EXTINF:"):
            dur = float(line[8:].split(",")[0])
        elif line and not line.startswith("#"):
            segs.append((t, t + dur, urljoin(url, line)))
            t += dur
    return init, segs, t


def fetch(vod, fmt, a, b, out):
    init, segs, total = playlist(vod, fmt)
    pick = [s for s in segs if s[1] > a and s[0] < b]
    with ThreadPoolExecutor(16) as ex:
        data = list(ex.map(lambda s: get(s[2]), pick))
    with open(out, "wb") as f:
        if init:
            f.write(get(init))
        for d in data:
            f.write(d)
    return {"start": pick[0][0] if pick else None, "end": pick[-1][1] if pick else None, "segments": len(pick), "total": total}


if __name__ == "__main__":
    print(json.dumps(fetch(sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5])))
