#!/usr/bin/env -S uv run --script
# /// script
# requires-python = "==3.11.*"
# dependencies = [
#   "numpy",
#   "scipy",
#   "soundfile",
#   "soxr",
#   "pyloudnorm",
# ]
# [tool.uv]
# exclude-newer = "2026-10-19T00:00:00Z"
# ///
"""Сборка озвучки из выбранных дублей: паузы по сценарию, фейды, громкость -16 LUFS, 48 кГц моно PCM 24.

  uv run --script assemble.py --script script.json --picks picks.json --out vo.wav

Что делает:
  - берёт по одному дублю на фразу из picks.json (его пишет check_takes.py; можно поправить руками или флагом --pick 3:p3_s11.wav);
  - границы звука каждого дубля ищет по огибающей (RMS 5 мс, порог = пик - 45 дБ), оставляет запас 20 мс до и 30 мс после;
  - тишина `lead` до первого звука, `pauses[k]` между КОНЦОМ звука одной фразы и НАЧАЛОМ следующей, `tail` после последнего;
  - фейды 5 мс на стыках; фразы выравниваются между собой по громкости (BS.1770), затем один общий gain до -16 LUFS integrated;
  - true peak не выше -1.5 dBTP (при необходимости лимитер с упреждением на 4-кратной частоте);
  - рядом пишет <имя>.phrases.json: где в итоговом файле звучит каждая фраза (его читает align.py).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True   # не мусорить __pycache__ в папке скилла
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _common as cm  # noqa: E402

import numpy as np  # noqa: E402

SR = 48000
PRE, POST = 0.020, 0.030     # запас вокруг границ звука, с
FADE = 0.005                 # фейд на стыках, с
THR_DB = 45.0                # порог звука ниже пика, дБ
PHRASE_LUFS = -22.0          # уровень фраз до общего gain (выравнивание между собой)


def fade(seg: np.ndarray, n: int) -> np.ndarray:
    n = max(0, min(n, len(seg) // 2))
    seg = seg.copy()
    if n:
        w = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))
        seg[:n] *= w
        seg[-n:] *= w[::-1]
    return seg


def true_peak_db(x: np.ndarray, sr: int) -> float:
    import soxr

    up = soxr.resample(x.astype(np.float64), sr, sr * 4, quality="HQ")
    return float(20 * np.log10(max(np.max(np.abs(up)), 1e-9)))


def soft_limit(x: np.ndarray, sr: int, ceiling_lin: float) -> np.ndarray:
    """Лимитер с упреждением 5 мс: плавное снижение усиления там, где |x| выше потолка."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d

    la = int(0.005 * sr)
    need = np.minimum(1.0, ceiling_lin / np.maximum(np.abs(x), 1e-9))
    g = minimum_filter1d(need, size=2 * la + 1, mode="nearest")
    g = uniform_filter1d(g, size=la * 2 + 1, mode="nearest")
    return x * g


def lufs(meter, x: np.ndarray) -> float:
    """Integrated loudness. Измеритель BS.1770 требует звук не короче блока 400 мс: более короткий кусок повторяется внахлёст
    до 0.5 с (добивать тишиной нельзя: блоки наполовину из тишины занижают результат на 2-6 дБ)."""
    if 0 < len(x) < int(0.5 * SR):
        x = np.tile(x, int(np.ceil(0.5 * SR / len(x))))
    v = float(meter.integrated_loudness(x))
    if not np.isfinite(v):
        raise cm.ScriptError("В дубле нет звука (тишина): громкость не измерить.")
    return v


def resolve_takes(script: dict, picks_path: Path, takes_dir_arg, overrides: dict[int, str]) -> list[Path]:
    n = len(script["phrases"])
    try:
        data = json.loads(picks_path.read_text(encoding="utf-8"))
    except OSError:
        raise cm.ScriptError(f"Файл выбора дублей не найден: {picks_path}. Его пишет check_takes.py (или передайте --pick 1:p1_s7.wav,...).") from None
    except json.JSONDecodeError as e:
        raise cm.ScriptError(f"{picks_path}: некорректный JSON ({e}).") from None
    picks = data.get("picks", data) if isinstance(data, dict) else {}
    base = picks_path.parent
    if takes_dir_arg:
        tdir = Path(takes_dir_arg)
    else:
        td = data.get("takes_dir") if isinstance(data, dict) else None
        tdir = (base / td) if td and not Path(td).is_absolute() else Path(td or base / "takes")
    names: dict[int, str] = {}
    for i in range(1, n + 1):
        ent = picks.get(str(i)) if isinstance(picks, dict) else None
        if isinstance(ent, dict):
            ent = ent.get("take")
        if isinstance(ent, str):
            names[i] = ent
    names.update(overrides)
    missing = [i for i in range(1, n + 1) if i not in names]
    if missing:
        raise cm.ScriptError(f"В {picks_path.name} нет дубля для фраз {missing}. Прогоните check_takes.py по всем фразам "
                             f"или укажите их вручную: --pick {missing[0]}:p{missing[0]}_s7.wav")
    paths = []
    for i in range(1, n + 1):
        p = Path(names[i])
        if not p.is_absolute():
            p = tdir / p
        if not p.is_file():
            raise cm.ScriptError(f"Фраза {i}: файл дубля не найден: {p}")
        paths.append(p)
    return paths


def main() -> None:
    ap = argparse.ArgumentParser(description="Сборка vo.wav из выбранных дублей (паузы, фейды, -16 LUFS, TP <= -1.5 dBTP).")
    ap.add_argument("--script", required=True, help="script.json (lead, tail, pauses)")
    ap.add_argument("--picks", required=True, help="picks.json от check_takes.py")
    ap.add_argument("--out", required=True, help="итоговый wav (48 кГц, моно, PCM 24)")
    ap.add_argument("--takes-dir", default=None, help="папка дублей (по умолчанию из picks.json)")
    ap.add_argument("--pick", default="", help="заменить дубль вручную: 3:p3_s11.wav,5:p5_s7.wav")
    ap.add_argument("--lufs", type=float, default=-16.0, help="целевая громкость, LUFS integrated (по умолчанию -16)")
    ap.add_argument("--tp", type=float, default=-1.5, help="потолок true peak, dBTP (по умолчанию -1.5)")
    args = ap.parse_args()

    import pyloudnorm as pyln
    import soundfile as sf

    script = cm.load_script(args.script)
    n = len(script["phrases"])
    pauses = cm.pauses_for(script)
    lead, tail = script["lead"], script["tail"]
    overrides: dict[int, str] = {}
    for kv in [s for s in args.pick.split(",") if s.strip()]:
        try:
            k, v = kv.split(":", 1)
            overrides[int(k)] = v.strip()
        except ValueError:
            raise cm.ScriptError(f"--pick: не понимаю «{kv}», нужен вид 3:p3_s11.wav") from None
        if not 1 <= int(k) <= n:
            raise cm.ScriptError(f"--pick: фразы {k} нет (в сценарии {n}).")
    takes = resolve_takes(script, Path(args.picks), args.takes_dir, overrides)

    # запас вокруг звука не больше тишины, которая отведена рядом (lead, пауза, tail): так lead, паузы и tail выдерживаются точно,
    # даже когда они короче обычного запаса 20/30 мс
    pre_allow = [min(PRE, lead)] + [min(PRE, 0.4 * p) for p in pauses]
    post_allow = [min(POST, 0.6 * p) for p in pauses] + [min(POST, tail)]
    meter = pyln.Meter(SR)
    segs, info = [], []
    for i, path in enumerate(takes, 1):
        x, sr = cm.read_mono(path)
        x = cm.resample(x, sr, SR, "VHQ")
        if not np.any(np.abs(x) > 1e-6):
            raise cm.ScriptError(f"Фраза {i}: дубль {path.name} пустой (тишина).")
        a, b = cm.sound_bounds(x, SR, THR_DB)
        s0, s1 = max(0, int((a - pre_allow[i - 1]) * SR)), min(len(x), int((b + post_allow[i - 1]) * SR))
        seg = x[s0:s1]
        loud = lufs(meter, seg)
        seg = seg * 10 ** ((PHRASE_LUFS - loud) / 20)
        segs.append(fade(seg, int(FADE * SR)))
        info.append({"i": i, "take": path.name, "raw_start": round(a, 4), "raw_end": round(b, 4), "lufs_before": round(loud, 2),
                     "pre": a - s0 / SR, "post": s1 / SR - b})

    # раскладка: звук фразы k начинается ровно через pauses[k-1] после конца звука фразы k-1
    pos = 0
    out = []

    def silence(sec: float) -> None:
        nonlocal pos
        m = int(round(max(0.0, sec) * SR))
        out.append(np.zeros(m))
        pos += m

    silence(lead - info[0]["pre"])
    for k, seg in enumerate(segs):
        inf = info[k]
        inf["pos"], inf["len"] = pos, len(seg)                     # кусок фразы в итоговом файле, отсчёты
        inf["offset"] = pos / SR                                   # начало вырезанного куска в итоговом файле, с
        inf["sound_start"] = pos / SR + inf["pre"]
        inf["sound_end"] = inf["sound_start"] + (inf["raw_end"] - inf["raw_start"])
        out.append(seg)
        pos += len(seg)
        if k + 1 < n:
            silence(pauses[k] - inf["post"] - info[k + 1]["pre"])
    silence(tail - info[-1]["post"])
    y = np.concatenate(out)

    # громкость: один линейный gain; если true peak выше потолка - лимитер, затем подгонка gain до цели
    gain = 10 ** ((args.lufs - lufs(meter, y)) / 20)
    ceiling = 10 ** ((args.tp - 0.5) / 20)
    limited, tp_first, z = False, None, y
    import soxr

    for _ in range(12):
        z = y * gain
        tp = true_peak_db(z, SR)
        tp_first = tp if tp_first is None else tp_first
        if tp > args.tp:
            limited = True
            z = soxr.resample(soft_limit(soxr.resample(z, SR, SR * 4, quality="HQ"), SR * 4, ceiling), SR * 4, SR, quality="HQ")
            tp = true_peak_db(z, SR)
        cur = lufs(meter, z)
        if abs(cur - args.lufs) < 0.01 and tp <= args.tp:
            break
        gain *= 10 ** ((args.lufs - cur) / 20)
    tp = true_peak_db(z, SR)
    if tp > args.tp:                                               # подгонка не сошлась: громкость уступает потолку пика
        z = z * 10 ** ((args.tp - 0.2 - tp) / 20)
        cm.log(f"ВНИМАНИЕ: уложиться в {args.tp} dBTP при {args.lufs} LUFS не удалось, звук чуть тише цели.")

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    sf.write(args.out, z, SR, subtype="PCM_24")

    # проверка по записанному файлу
    w, sr2 = cm.read_mono(args.out)
    meas_lufs, meas_tp = lufs(meter, w), true_peak_db(w, sr2)
    if abs(meas_lufs - args.lufs) > 0.1:
        cm.log(f"ВНИМАНИЕ: получилось {meas_lufs:.2f} LUFS вместо {args.lufs}: потолок true peak {args.tp} dBTP не даёт поднять громкость "
               f"(gain {20 * np.log10(gain):+.1f} дБ). Поднимите --tp или уменьшите --lufs.")
    for inf in info:                                               # тем же детектором, в пределах куска самой фразы
        lo, hi = inf["pos"], min(len(w), inf["pos"] + inf["len"])
        sa, sb = cm.sound_bounds(w[lo:hi], SR, THR_DB)
        inf["start"], inf["end"] = round(lo / SR + sa, 3), round(lo / SR + sb, 3)
    gaps = [float(info[k + 1]["start"] - info[k]["end"]) for k in range(n - 1)]
    meta = {
        "sr": sr2, "duration": round(len(w) / sr2, 3), "lufs": round(meas_lufs, 2), "tp_dbtp": round(meas_tp, 2),
        "limiter": limited, "gain_db": round(float(20 * np.log10(gain)), 2), "lead": lead, "tail": tail, "pauses": pauses,
        "phrases": [{"i": p["i"], "take": p["take"], "start": p["start"], "end": p["end"], "offset": round(p["offset"], 3),
                     "raw_start": p["raw_start"], "raw_end": p["raw_end"], "lufs_before": p["lufs_before"]} for p in info],
    }
    ppath = Path(args.out).with_suffix(".phrases.json")
    cm.write_json(ppath, meta)

    print(f"{Path(args.out).name}: {meta['duration']:.3f} с, {sr2} Гц, моно, PCM_24; {meas_lufs:.2f} LUFS, TP {meas_tp:.2f} dBTP"
          f"{' (лимитер: TP до него %.2f)' % tp_first if limited else ''}, gain {meta['gain_db']:+.2f} дБ")
    print(f"начало звука {info[0]['start']:.3f} с (lead {lead}), хвост {len(w) / sr2 - info[-1]['end']:.3f} с (tail {tail}), "
          f"паузы {[round(g, 3) for g in gaps]} (заданы {pauses})")
    bad = [(k + 1, round(g, 3), pauses[k]) for k, g in enumerate(gaps) if abs(g - pauses[k]) > 0.02]
    if bad:
        cm.log(f"ВНИМАНИЕ: измеренные паузы отличаются от заданных больше чем на 20 мс: {bad}")
    print(f"-> {ppath}")


if __name__ == "__main__":
    cm.run(main)
