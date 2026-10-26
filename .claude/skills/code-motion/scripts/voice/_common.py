# -*- coding: utf-8 -*-
"""Общий код скриптов озвучки code-motion.

Здесь: кэш моделей, чтение и проверка script.json, подсчёт слов, имена дублей, мелкие функции для звука.
Только стандартная библиотека и numpy: тяжёлые модели сюда не импортируются.
Лежит рядом со скриптами; `uv run --script` кладёт папку скрипта в sys.path, отдельной установки не нужно.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

import numpy as np

LANGS = ("ru", "en")
TAKE_RE = re.compile(r"^p(\d+)_s(\d+)\.wav$")
LATIN_RE = re.compile(r"[A-Za-z]")


class ScriptError(Exception):
    """Понятная пользователю ошибка входных данных: печатается без трейсбека."""


def log(*args) -> None:
    print(*args, file=sys.stderr, flush=True)


def run(main) -> None:
    """Запуск main() с красивой печатью ScriptError (код выхода 2)."""
    try:
        main()
    except ScriptError as e:
        print(f"\nОШИБКА: {e}", file=sys.stderr)
        sys.exit(2)
    except KeyboardInterrupt:
        sys.exit(130)


# --------------------------------------------------------------------------- кэш моделей
def cache_root() -> Path:
    """Папка тяжёлых кэшей: $CODE_MOTION_CACHE или ~/.cache/code-motion (вне проектов)."""
    return Path(os.environ.get("CODE_MOTION_CACHE") or (Path.home() / ".cache" / "code-motion")).expanduser()


def setup_env() -> Path:
    """Направляет кэши моделей в ~/.cache/code-motion, если они не заданы снаружи.
    Вызывать ДО import torch / transformers / huggingface_hub / mlx_whisper."""
    root = cache_root()
    root.mkdir(parents=True, exist_ok=True)
    for key, sub in (("HF_HOME", "hf"), ("TORCH_HOME", "torch"), ("XDG_CACHE_HOME", "xdg")):
        os.environ.setdefault(key, str(root / sub))
    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
    if not sys.stderr.isatty():                       # вывод идёт в файл или к агенту: индикаторы tqdm не чаще раза в 10 с
        os.environ.setdefault("TQDM_MININTERVAL", "10")
    return root


def mps_limits() -> None:
    """Лимиты MPS-аллокатора: без них Chatterbox раздувает кэш до ~18 ГБ и на 16-гигабайтном Mac уходит в своп
    (1 токен/с вместо 20). Вызывать ДО import torch."""
    os.environ.setdefault("PYTORCH_MPS_HIGH_WATERMARK_RATIO", "0.8")
    os.environ.setdefault("PYTORCH_MPS_LOW_WATERMARK_RATIO", "0.6")


# --------------------------------------------------------------------------- слова и сценарий
def is_word(tok: str) -> bool:
    """Слово = токен между пробелами, в котором есть буква или цифра. Одинокое тире («—») словом не считается."""
    return re.search(r"[^\W_]", tok) is not None


def words_of(text: str) -> list[str]:
    return [t for t in text.split() if is_word(t)]


def _explain_mismatch(i: int, d: list[str], a: list[str], lang: str = "ru") -> str:
    rows = []
    for k in range(max(len(d), len(a))):
        left = d[k] if k < len(d) else "(нет)"
        right = a[k] if k < len(a) else "(нет)"
        rows.append(f"    {k + 1:>2}  {left:<22} {right}")
    table = "\n".join(rows) if len(rows) <= 40 else "\n".join(rows[:40] + ["    ..."])
    return (
        f"Фраза {i}: в display {len(d)} слов, в align {len(a)}. Их число должно совпадать: каждому слову из display "
        f"соответствует ровно одно слово из align.\n"
        f"    №  display                 align\n{table}\n"
        f"  Слово = кусок между пробелами, в котором есть буква или цифра; одинокое тире словом не считается.\n"
        + ("  Как чинить: «After Effects» -> «Афтер Эффектс» (2 и 2), «t» -> «тэ» (1 и 1). Если слово надо произнести "
           "несколькими словами, склейте их дефисом: «8%» -> «восемь-процентов»."
           if lang == "ru" else
           "  Как чинить: «A.I.» -> «A-I» (1 и 1). Если слово надо произнести несколькими словами, склейте их дефисом: "
           "«8%» -> «eight-percent». Цифры можно оставить цифрами: они будут прочитаны автоматически.")
    )


def load_script(path, *, strict_align: bool = False) -> dict:
    """Читает и проверяет script.json. Возвращает {lang, lead, tail, pauses, phrases:[{i, display, tts, align,
    display_words, align_words}], path}. Все найденные проблемы собираются в одно сообщение ScriptError."""
    p = Path(path)
    if not p.is_file():
        raise ScriptError(f"Файл сценария не найден: {p}")
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise ScriptError(f"{p}: это не корректный JSON (строка {e.lineno}, столбец {e.colno}: {e.msg}).") from None
    if not isinstance(raw, dict) or not isinstance(raw.get("phrases"), list) or not raw["phrases"]:
        raise ScriptError(f'{p}: ожидается объект {{"lang": "ru", "phrases": [{{"display": "..."}}, ...]}} с непустым списком phrases.')

    problems: list[str] = []
    lang = str(raw.get("lang", "ru")).lower()
    if lang not in LANGS:
        problems.append(f'"lang" = {raw.get("lang")!r}: поддерживаются только {", ".join(LANGS)}.')

    def seconds(key: str, default: float) -> float:
        v = raw.get(key, default)
        if isinstance(v, bool) or not isinstance(v, (int, float)) or v < 0:
            problems.append(f'"{key}" должно быть числом секунд >= 0, а не {v!r}.')
            return default
        return float(v)

    lead, tail = seconds("lead", 0.3), seconds("tail", 0.6)
    pauses_raw = raw.get("pauses", [])
    pauses: list[float] = []
    if not isinstance(pauses_raw, list) or any(isinstance(v, bool) or not isinstance(v, (int, float)) or v < 0 for v in pauses_raw):
        problems.append('"pauses" должно быть списком чисел секунд >= 0, например [0.28, 0.3].')
    else:
        pauses = [float(v) for v in pauses_raw]

    phrases = []
    for i, ph in enumerate(raw["phrases"], 1):
        if isinstance(ph, str):
            ph = {"display": ph}
        if not isinstance(ph, dict) or not isinstance(ph.get("display"), str) or not ph["display"].strip():
            problems.append(f'Фраза {i}: нет текста "display" (непустая строка).')
            continue
        display = ph["display"].strip()
        tts = str(ph.get("tts") or display).strip()
        align = str(ph.get("align") or display).strip()
        d, a = words_of(display), words_of(align)
        if not d:
            problems.append(f"Фраза {i}: в display нет ни одного слова (нужна хотя бы одна буква или цифра): {display!r}.")
        elif len(d) != len(a):
            problems.append(_explain_mismatch(i, d, a, lang))
        elif strict_align and lang == "ru":
            lat = [w for w in a if LATIN_RE.search(w)]
            if lat:
                problems.append(
                    f"Фраза {i}: в align есть латиница: {', '.join('«' + w + '»' for w in lat)}. Для выравнивания пишите так, как слово звучит "
                    f"по-русски, кириллицей: «Effects» -> «Эффектс», «Claude» -> «Клод», «t» -> «тэ»."
                )
        phrases.append({"i": i, "display": display, "tts": tts, "align": align, "display_words": d, "align_words": a})
    if problems:
        raise ScriptError(f"{p}:\n" + "\n".join(problems))
    return {"path": p, "lang": lang, "lead": lead, "tail": tail, "pauses": pauses, "phrases": phrases}


def pauses_for(script: dict) -> list[float]:
    """Ровно len(phrases)-1 пауз: недостающие добираются последним значением (или 0.3 с), лишние отбрасываются."""
    need = len(script["phrases"]) - 1
    pauses = list(script["pauses"])
    if len(pauses) < need:
        fill = pauses[-1] if pauses else 0.3
        log(f'ВНИМАНИЕ: в "pauses" {len(pauses)} значений, нужно {need}; недостающие = {fill} с.')
        pauses += [fill] * (need - len(pauses))
    elif len(pauses) > need:
        log(f'ВНИМАНИЕ: в "pauses" {len(pauses)} значений, нужно {need}; лишние отброшены.')
    return pauses[:need]


def parse_ints(text, what: str = "список") -> list[int]:
    """'7,11,13' или '1-3,5' -> [7, 11, 13] / [1, 2, 3, 5]."""
    out: list[int] = []
    for part in str(text).replace(" ", "").split(","):
        if not part:
            continue
        m = re.fullmatch(r"(\d+)-(\d+)", part)
        if m:
            lo, hi = int(m.group(1)), int(m.group(2))
            if hi < lo:
                raise ScriptError(f"{what}: диапазон {part} задан наоборот.")
            out.extend(range(lo, hi + 1))
        elif re.fullmatch(r"\d+", part):
            out.append(int(part))
        else:
            raise ScriptError(f"{what}: не понимаю «{part}». Нужны целые числа через запятую, например 7,11,13 или 1-3.")
    if not out:
        raise ScriptError(f"{what}: пустой список.")
    return list(dict.fromkeys(out))


def select_phrases(arg, n: int) -> list[int]:
    """--phrases '1,3' -> [1, 3] (нумерация с 1); None -> все."""
    if not arg:
        return list(range(1, n + 1))
    sel = parse_ints(arg, "--phrases")
    bad = [i for i in sel if not 1 <= i <= n]
    if bad:
        raise ScriptError(f"--phrases: в сценарии {n} фраз (нумерация с 1), а запрошены {bad}.")
    return sel


def percent_word(n: int, lang: str) -> str:
    """Слово после числа с «%»: ru 1 процент / 2-4 процента / 5+ процентов; en percent."""
    if lang != "ru":
        return "percent"
    n10, n100 = n % 10, n % 100
    if n10 == 1 and n100 != 11:
        return "процент"
    if 2 <= n10 <= 4 and not 12 <= n100 <= 14:
        return "процента"
    return "процентов"


def take_name(i: int, seed: int) -> str:
    return f"p{i}_s{seed}.wav"


def parse_take(name: str):
    """'p3_s11.wav' -> (3, 11); не дубль -> None."""
    m = TAKE_RE.match(Path(name).name)
    return (int(m.group(1)), int(m.group(2))) if m else None


# --------------------------------------------------------------------------- дубли TTS
def manifest_load(out_dir) -> dict:
    """takes.json в папке дублей: параметры, с которыми сделан каждый дубль (чтобы не пересинтезировать то, что уже есть)."""
    p = Path(out_dir) / "takes.json"
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def manifest_save(out_dir, manifest: dict) -> None:
    write_json(Path(out_dir) / "takes.json", manifest)


def take_is_current(out_dir, manifest: dict, name: str, params: dict) -> bool:
    """Дубль уже есть и сделан с теми же текстом и параметрами."""
    return (Path(out_dir) / name).is_file() and manifest.get(name, {}).get("params") == params


def write_take(path, audio, sr: int) -> None:
    """Дубль как float32 WAV (без квантования и без обрезки пиков: клиппинг потом видно в check_takes)."""
    import soundfile as sf

    Path(path).parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), np.asarray(audio, dtype="float32").reshape(-1), int(sr), subtype="FLOAT")


# --------------------------------------------------------------------------- файлы и звук
def write_json(path, obj) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def rel_path(path, base) -> str:
    """Путь относительно base, если получается без выхода за пределы; иначе абсолютный."""
    path, base = Path(path).resolve(), Path(base).resolve()
    try:
        return str(path.relative_to(base))
    except ValueError:
        return str(path)


def read_mono(path) -> tuple[np.ndarray, int]:
    import soundfile as sf

    x, sr = sf.read(str(path), dtype="float64", always_2d=True)
    return x.mean(axis=1), int(sr)


def resample(x: np.ndarray, sr_in: int, sr_out: int, quality: str = "HQ") -> np.ndarray:
    if sr_in == sr_out:
        return x
    import soxr

    return soxr.resample(x, sr_in, sr_out, quality=quality)


def frame_db(x: np.ndarray, frame: int, hop: int) -> np.ndarray:
    """RMS в дБ по окнам frame/hop с центрированием (нулевое дополнение по краям, как librosa.feature.rms, но без librosa)."""
    x = np.asarray(x, dtype=np.float64)
    x = np.pad(x, (frame // 2, frame // 2))
    n = 1 + (len(x) - frame) // hop if len(x) >= frame else 0
    c = np.concatenate([[0.0], np.cumsum(x * x)])
    idx = np.arange(n) * hop
    ms = np.maximum((c[idx + frame] - c[idx]) / frame, 0.0)
    return 20 * np.log10(np.sqrt(ms) + 1e-9)


def sound_bounds(x: np.ndarray, sr: int, thr_db: float = 45.0, hop_s: float = 0.005) -> tuple[float, float]:
    """Границы слышимого звука: RMS по кадрам 5 мс, порог = пик - thr_db. Возврат (начало, конец) в секундах."""
    h = int(hop_s * sr)
    n = len(x) // h
    if n == 0:
        return 0.0, len(x) / sr
    db = 20 * np.log10(np.sqrt(np.mean(np.asarray(x[: n * h], dtype=np.float64).reshape(n, h) ** 2, axis=1)) + 1e-9)
    idx = np.where(db > db.max() - thr_db)[0]
    return idx[0] * h / sr, (idx[-1] + 1) * h / sr
