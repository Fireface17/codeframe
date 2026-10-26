#!/usr/bin/env -S uv run --script
# /// script
# requires-python = "==3.11.*"
# dependencies = [
#   "numpy",
#   "scipy",
#   "soundfile",
#   "soxr",
#   "num2words",
#   "praat-parselmouth",
#   "mlx-whisper; sys_platform == 'darwin' and platform_machine == 'arm64'",
#   "faster-whisper; sys_platform != 'darwin' or platform_machine != 'arm64'",
# ]
# [tool.uv]
# exclude-newer = "2026-10-19T00:00:00Z"
# ///
"""Проверка дублей озвучки и выбор лучшего на каждую фразу -> picks.json.

  uv run --script check_takes.py --script script.json --takes takes/ --out picks.json [--prefer wer|pace]

Для каждого дубля takes/p<i>_s<seed>.wav:
  - распознавание whisper (large-v3-turbo: mlx-whisper на Apple Silicon, иначе faster-whisper), без подсказок;
  - WER относительно текста `align` (или --ref tts|display): строгий, но без ложных ошибок. Не считаются ошибкой: слитное/раздельное
    написание («с двигом»/«сдвигом»), оглушение на конце слова («код»/«кот»), «ё»/«е», числа цифрами или словами, а у терминов
    (слова, где в display латиница или цифры) допускаются близкие написания («Афтер Эффектс» / «After Effects»);
  - темп, слов/с: число слов фразы / длительность речи от первого до последнего звука;
  - клиппинг (отсчёты >= 0.999), щелчки, обрезанный хвост (звук доходит до конца файла), σF0 в полутонах (живость интонации).
Лучший дубль:
  --prefer wer  (по умолчанию) сначала минимальный WER, при равенстве темп ближе к диапазону --pace, затем больше σF0;
  --prefer pace сначала дубли с WER <= --max-wer, среди них темп ближе к диапазону --pace, затем меньший WER, затем σF0.
Дубли с клиппингом, щелчками, обрезанным хвостом или без речи выбираются только если других нет (с предупреждением).
"""
from __future__ import annotations

import argparse
import json
import platform
import re
import sys
import unicodedata
from pathlib import Path

sys.dont_write_bytecode = True   # не мусорить __pycache__ в папке скилла
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _common as cm  # noqa: E402

cm.setup_env()

import numpy as np  # noqa: E402

DEFAULT_MODEL = {"mlx": "mlx-community/whisper-large-v3-turbo", "faster": "large-v3-turbo"}
DEVOICE = str.maketrans("бвгдж" "з", "пфктш" "с")
TRANSLIT = {"a": "а", "b": "б", "c": "к", "d": "д", "e": "е", "f": "ф", "g": "г", "h": "х", "i": "и", "j": "дж", "k": "к", "l": "л",
            "m": "м", "n": "н", "o": "о", "p": "п", "q": "к", "r": "р", "s": "с", "t": "т", "u": "у", "v": "в", "w": "в", "x": "кс",
            "y": "и", "z": "з"}
DIGRAPHS = (("sh", "ш"), ("ch", "ч"), ("th", "т"), ("ph", "ф"), ("ck", "к"), ("oo", "у"), ("ee", "и"))
CAPTURE_VOWELS = str.maketrans("эыёй", "еиеи")


# --------------------------------------------------------------------------- текст и WER
def norm_text(text: str, lang: str) -> list[str]:
    """Слова для сравнения: нижний регистр, без знаков препинания, ударений и «ё»; числа словами."""
    s = unicodedata.normalize("NFC", text).lower().replace("\u0301", "").replace("+", " ").replace("ё", "е")
    s = re.sub(r"(\d+)\s*%", lambda m: f"{m.group(1)} {cm.percent_word(int(m.group(1)), lang)} ", s)
    s = s.replace("%", " " + cm.percent_word(5, lang) + " ")

    def spell(m: re.Match) -> str:
        try:
            from num2words import num2words

            return " " + num2words(int(m.group(0)), lang=lang) + " "
        except Exception:  # noqa: BLE001
            return " " + m.group(0) + " "

    s = re.sub(r"\d+", spell, s)
    s = re.sub(r"['’`]", "", s)
    s = re.sub(r"[^\w\s]|_", " ", s)
    return s.split()


def _lev(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _phon(tok: str, lang: str) -> str:
    """Грубый «слуховой» ключ слова: на конце ru-слова звонкий согласный = парный глухой."""
    if lang == "ru" and tok:
        return tok[:-1] + tok[-1].translate(DEVOICE)
    return tok


def _to_cyr(tok: str) -> str:
    t = tok
    for lat, cyr in DIGRAPHS:
        t = t.replace(lat, cyr)
    return "".join(TRANSLIT.get(c, c) for c in t).translate(CAPTURE_VOWELS)


NO_META = {"term": False, "alts": frozenset(), "opt": False, "free": False}


def tokens_match(ref: str, hyp: str, m: dict, lang: str, fuzzy: bool = True) -> bool:
    """Слова считаются одинаковыми, если совпали буквально, на слух (оглушение на конце), равны экранному написанию термина,
    а для терминов и латиницы (ru) - похожи по написанию кириллицей (расстояние Левенштейна <= 34%).
    Одинокая латинская буква («t») необязательна: ASR стабильно путает её или склеивает с соседом."""
    if ref == hyp or _phon(ref, lang) == _phon(hyp, lang):
        return True
    if not fuzzy:
        return False
    if m["alts"] and any(_phon(hyp, lang) == _phon(a, lang) for a in m["alts"]):
        return True
    if m["opt"] and len(hyp) <= 2:
        return True
    if lang == "ru" and (m["term"] or re.search(r"[a-z]", ref + hyp)):
        a, b = _to_cyr(ref), _to_cyr(hyp)
        return _lev(a, b) / max(len(a), len(b), 1) <= 0.34
    return False


def wer_report(ref: list[str], meta: list[dict], hyp: list[str], lang: str) -> tuple[float, list[str]]:
    """WER по Левенштейну на словах. Слитное и раздельное написание («сдвигом» = «с двигом») ошибкой не считается."""
    n, m = len(ref), len(hyp)
    INF = 10 ** 9
    d = [[INF] * (m + 1) for _ in range(n + 1)]
    op: list[list[tuple | None]] = [[None] * (m + 1) for _ in range(n + 1)]
    d[0][0] = 0
    for i in range(n + 1):
        for j in range(m + 1):
            if i == j == 0:
                continue
            best, how = INF, None
            if i > 0 and j > 1 and d[i - 1][j - 2] < INF and tokens_match(ref[i - 1], hyp[j - 2] + hyp[j - 1], NO_META, lang, fuzzy=False):
                best, how = d[i - 1][j - 2], ("split", i - 1, j - 2)
            if i > 1 and j > 0 and d[i - 2][j - 1] < best and tokens_match(ref[i - 2] + ref[i - 1], hyp[j - 1], NO_META, lang, fuzzy=False):
                best, how = d[i - 2][j - 1], ("merge", i - 2, j - 1)
            if i > 0 and j > 0:
                same = tokens_match(ref[i - 1], hyp[j - 1], meta[i - 1], lang)
                v = d[i - 1][j - 1] + (0 if same else 1)
                if v < best:
                    best, how = v, ("ok" if same else "sub", i - 1, j - 1)
            if i > 0:
                cost = 0 if (meta[i - 1]["opt"] or meta[i - 1]["free"]) else 1
                if d[i - 1][j] + cost < best:
                    best, how = d[i - 1][j] + cost, ("del" if cost else "delopt", i - 1, None)
            if j > 0 and d[i][j - 1] + 1 < best:
                best, how = d[i][j - 1] + 1, ("ins", None, j - 1)
            d[i][j], op[i][j] = best, how
    errors, i, j = [], n, m
    while i > 0 or j > 0:
        kind, ri, hj = op[i][j]
        if kind == "sub":
            errors.append(f"{ref[ri]}->{hyp[hj]}")
            i, j = i - 1, j - 1
        elif kind == "ok":
            i, j = i - 1, j - 1
        elif kind == "del":
            errors.append(f"{ref[ri]}->∅")
            i -= 1
        elif kind == "delopt":
            i -= 1
        elif kind == "ins":
            errors.append(f"∅->{hyp[hj]}")
            j -= 1
        elif kind == "split":
            i, j = i - 1, j - 2
        else:  # merge
            i, j = i - 2, j - 1
    errors.reverse()
    return len(errors) / max(n, 1), errors


def build_ref(ph: dict, kind: str, lang: str) -> tuple[list[str], list[dict]]:
    """Слова эталона (из align / tts / display) и пометки к ним: термин, допустимые экранные написания, «необязательная буква»,
    «хвост» многословного термина."""
    words = cm.words_of(ph[kind])
    disp = ph["display_words"] if len(ph["display_words"]) == len(words) else [None] * len(words)
    toks, meta = [], []
    for w, dw in zip(words, disp):
        t = norm_text(w, lang)
        is_term = bool(dw) and (bool(re.search(r"[A-Za-z]", dw)) if lang == "ru" else bool(re.search(r"\d", dw)))
        alts = frozenset(norm_text(dw, lang)) if (is_term and lang == "ru") else frozenset()
        acronym = re.sub(r"[^A-Za-z]", "", dw or "")
        if alts and len(acronym) >= 2 and acronym.isupper():           # «AI» ASR может написать и «A.I.»: принимаем и по буквам
            alts |= frozenset(acronym.lower())
        letters = re.sub(r"[\W_\d]", "", dw or "")
        opt = lang == "ru" and is_term and len(letters) == 1
        for n, tok in enumerate(t):
            toks.append(tok)
            # термин из нескольких слов под одно слово экрана («эф-эф-эм-пэг» = «FFmpeg»): ASR пишет его одним токеном,
            # поэтому первый токен сверяется с экранным написанием, а остальные можно пропустить без штрафа
            meta.append({"term": is_term, "alts": alts, "opt": opt, "free": is_term and lang == "ru" and n > 0})
    return toks, meta


# --------------------------------------------------------------------------- метрики звука
def vad_segments(x: np.ndarray, sr: int, rel_db: float = 32.0, floor_db: float = -70.0, min_gap: float = 0.04, min_seg: float = 0.05):
    hop_n = int(0.010 * sr)
    hop = hop_n / sr                                  # реальный шаг в секундах (при 22.05/44.1 кГц это не ровно 10 мс)
    db = cm.frame_db(x, int(0.025 * sr), hop_n)
    thr = max(np.percentile(db, 95) - rel_db, floor_db)
    mask = db > thr
    segs, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            segs.append([i * hop, j * hop])
            i = j
        else:
            i += 1
    merged: list[list[float]] = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < min_gap:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [(a, b) for a, b in merged if b - a >= min_seg], db, hop


def audio_metrics(x: np.ndarray, sr: int, n_words: int) -> dict:
    from scipy.ndimage import uniform_filter1d

    dur = len(x) / sr
    peak = float(np.max(np.abs(x))) if len(x) else 0.0
    segs, db, hop = vad_segments(x, sr)
    out = {"dur": round(dur, 3), "peak_dbfs": round(20 * np.log10(max(peak, 1e-9)), 2), "clipped_samples": int(np.sum(np.abs(x) >= 0.999))}
    # щелчки: всплески второй разности относительно локального среднего
    d2 = np.abs(np.diff(x, n=2))
    ratio = d2 / (uniform_filter1d(d2, size=max(int(0.02 * sr), 3)) + 1e-6)
    clicks, last = 0, -10 ** 9
    for c in np.where((ratio > 60) & (d2 > 0.03))[0]:
        if c - last > int(0.003 * sr):
            clicks += 1
        last = c
    out["clicks"] = clicks
    if not segs:
        out.update(speech_span=0.0, wps=0.0, wps_artic=0.0, head_silence_ms=0, tail_silence_ms=0, tail_truncated=False, no_speech=True)
        return out
    span = segs[-1][1] - segs[0][0]
    pauses = sum(segs[k + 1][0] - segs[k][1] for k in range(len(segs) - 1) if segs[k + 1][0] - segs[k][1] >= 0.12)
    tail_sil = dur - segs[-1][1]
    ref = np.percentile(db, 95)
    out.update(speech_span=round(span, 3), wps=round(n_words / span, 3), wps_artic=round(n_words / max(span - pauses, 1e-3), 3),
               head_silence_ms=round(segs[0][0] * 1000), tail_silence_ms=round(tail_sil * 1000),
               tail_truncated=bool(tail_sil < 0.02 and db[-1] - ref > -25), no_speech=False)
    return out


def f0_std_semitones(x: np.ndarray, sr: int):
    try:
        import parselmouth

        snd = parselmouth.Sound(np.asarray(x, dtype=np.float64), sampling_frequency=sr)
        pitch = snd.to_pitch_ac(time_step=0.01, pitch_floor=70.0, pitch_ceiling=450.0, very_accurate=True, voicing_threshold=0.5, octave_jump_cost=0.6)
        f0 = pitch.selected_array["frequency"]
        v = f0[f0 > 0]
        if len(v) < 20:
            return None
        return round(float(np.std(12 * np.log2(v / np.median(v)))), 2)
    except Exception:  # noqa: BLE001
        return None


# --------------------------------------------------------------------------- распознавание
def make_asr(backend: str, model, lang: str):
    if backend == "auto":
        mac_arm = platform.system() == "Darwin" and platform.machine() == "arm64"
        try:
            import mlx_whisper  # noqa: F401

            backend = "mlx" if mac_arm else "faster"
        except ImportError:
            backend = "faster"
    if backend == "mlx":
        import mlx_whisper

        repo = model or DEFAULT_MODEL["mlx"]

        def run(x16: np.ndarray) -> str:
            r = mlx_whisper.transcribe(x16, path_or_hf_repo=repo, language=lang, temperature=0.0, condition_on_previous_text=False,
                                       verbose=None, fp16=True, word_timestamps=False)
            return r["text"].strip()

        return run, "mlx", repo
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise cm.ScriptError("faster-whisper не установлен. На Apple Silicon он не ставится автоматически: запустите так\n"
                             "  uv run --script --with faster-whisper check_takes.py ... --backend faster") from None
    name = model or DEFAULT_MODEL["faster"]
    wm = WhisperModel(name, device="auto", compute_type="auto")

    def run(x16: np.ndarray) -> str:
        segs, _ = wm.transcribe(x16, language=lang, beam_size=5, temperature=0.0, condition_on_previous_text=False, vad_filter=False)
        return " ".join(s.text.strip() for s in segs).strip()

    return run, "faster", name


# --------------------------------------------------------------------------- выбор
def rank_key(t: dict, prefer: str, max_wer: float):
    bad = bool(t["flags"])
    pace = t["pace_dist"]
    f0 = -(t["f0_std_st"] or 0.0)
    if prefer == "pace":
        return (bad, t["wer"] > max_wer + 1e-9, round(pace, 2), t["wer"], f0, t["seed"])
    return (bad, round(t["wer"], 4), round(pace, 2), f0, t["seed"])


def main() -> None:
    ap = argparse.ArgumentParser(description="Проверка дублей (whisper, WER, темп, клиппинг, хвост) и выбор лучшего на фразу -> picks.json.")
    ap.add_argument("--script", required=True, help="script.json")
    ap.add_argument("--takes", required=True, help="папка с дублями p<i>_s<seed>.wav")
    ap.add_argument("--out", default="picks.json", help="куда писать выбор (по умолчанию picks.json)")
    ap.add_argument("--prefer", choices=["wer", "pace"], default="wer", help="что важнее при выборе: точность (wer) или темп (pace)")
    ap.add_argument("--pace", default="2.8,3.3", help="желаемый темп, слов/с: «мин,макс» (по умолчанию 2.8,3.3)")
    ap.add_argument("--max-wer", type=float, default=0.0, help="допустимый WER для --prefer pace (по умолчанию 0)")
    ap.add_argument("--ref", choices=["align", "tts", "display"], default="align", help="с каким текстом сравнивать распознанное (по умолчанию align)")
    ap.add_argument("--phrases", default=None, help="проверить только эти фразы: 1,3 (остальные записи picks.json сохраняются)")
    ap.add_argument("--backend", choices=["auto", "mlx", "faster"], default="auto", help="распознаватель (по умолчанию mlx-whisper на Apple Silicon)")
    ap.add_argument("--model", default=None, help="другая модель whisper (mlx: репозиторий HF; faster: имя, например tiny)")
    ap.add_argument("--no-cache", action="store_true", help="не использовать кэш распознавания takes/.check_cache.json")
    args = ap.parse_args()

    try:
        lo, hi = (float(v) for v in args.pace.split(","))
        assert 0 < lo <= hi
    except (ValueError, AssertionError):
        raise cm.ScriptError('--pace: нужно «мин,макс» в словах/с, например 2.8,3.3') from None

    script = cm.load_script(args.script)
    lang, phrases = script["lang"], script["phrases"]
    sel = cm.select_phrases(args.phrases, len(phrases))
    tdir = Path(args.takes)
    if not tdir.is_dir():
        raise cm.ScriptError(f"Папка с дублями не найдена: {tdir}")
    by_phrase: dict[int, list[tuple[int, Path]]] = {i: [] for i in sel}
    for f in sorted(tdir.glob("*.wav")):
        parsed = cm.parse_take(f.name)
        if parsed and parsed[0] in by_phrase:
            by_phrase[parsed[0]].append((parsed[1], f))
    empty = [i for i, v in by_phrase.items() if not v]
    if empty:
        raise cm.ScriptError(f"Нет дублей для фраз {empty} в {tdir} (ожидаются файлы вида p{empty[0]}_s7.wav). "
                             f"Сначала tts_chatterbox.py / tts_kokoro.py.")
    total = sum(len(v) for v in by_phrase.values())

    asr, backend, model = make_asr(args.backend, args.model, lang)
    desc = {"backend": backend, "model": model}
    cm.log(f"Проверяю {total} дублей; распознавание: {backend} {model}")
    cache_path = tdir / ".check_cache.json"
    cache = {}
    if not args.no_cache and cache_path.is_file():
        try:
            cache = json.loads(cache_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            cache = {}

    results: dict[int, list[dict]] = {}
    for i in sel:
        ph = phrases[i - 1]
        ref_tok, ref_meta = build_ref(ph, args.ref, lang)
        n_words = len(ph["display_words"])
        rows = []
        for seed, path in by_phrase[i]:
            x, sr = cm.read_mono(path)
            st = path.stat()
            key = f"{path.name}|{st.st_size}|{st.st_mtime_ns}|{backend}|{model}|{lang}"
            if key in cache:
                hyp = cache[key]
            else:
                hyp = asr(cm.resample(x, sr, 16000, "HQ").astype(np.float32))
                cache[key] = hyp
            t = {"take": path.name, "seed": seed}
            t.update(audio_metrics(x, sr, n_words))
            wer, errors = wer_report(ref_tok, ref_meta, norm_text(hyp, lang), lang)
            t.update(wer=round(wer, 3), n_ref=len(ref_tok), errors=errors, hyp=hyp, f0_std_st=f0_std_semitones(x, sr))
            flags = [name for name, on in (("clipping", t["clipped_samples"] > 0), ("clicks", t["clicks"] > 0),
                                           ("truncated_tail", t["tail_truncated"]), ("no_speech", t["no_speech"])) if on]
            t["flags"] = flags
            t["pace_dist"] = round(max(0.0, lo - t["wps"], t["wps"] - hi), 3)
            rows.append(t)
        rows.sort(key=lambda t: rank_key(t, args.prefer, args.max_wer))
        for r, t in enumerate(rows, 1):
            t["rank"] = r
        results[i] = rows
    if not args.no_cache:
        try:
            cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding="utf-8")
        except OSError:
            pass

    # --- итог и запись
    out = Path(args.out)
    doc = {}
    criteria = {"prefer": args.prefer, "pace_range": [lo, hi], "max_wer": args.max_wer, "ref": args.ref, "asr": desc}
    if args.phrases and out.is_file():                       # частичная проверка: сохраняем остальные фразы
        try:
            doc = json.loads(out.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            doc = {}
        old = {k: doc.get(k) for k in criteria}
        if doc.get("picks") and old != criteria:
            cm.log("ВНИМАНИЕ: остальные фразы в picks.json выбраны с другими настройками (--prefer/--pace/--max-wer/--ref/модель); "
                   "настройки каждой записи лежат в её поле criteria, шапка файла описывает только этот запуск.")
    doc.update({"version": 1, "script": cm.rel_path(args.script, out.parent.resolve()), "takes_dir": cm.rel_path(tdir, out.parent.resolve()),
                "lang": lang, **criteria})
    doc.setdefault("picks", {})
    doc.setdefault("candidates", {})
    for i, rows in results.items():
        best = dict(rows[0])
        warns = []
        if best["flags"]:
            warns.append("все дубли с дефектами (" + ", ".join(best["flags"]) + "): лучший из плохих")
        if best["wer"] > (args.max_wer if args.prefer == "pace" else 0.0) + 1e-9:
            warns.append(f"WER {best['wer']:.2f}: слышны отличия от текста, прослушайте дубль")
        if best["pace_dist"] > 0.3:
            warns.append(f"темп {best['wps']:.2f} сл/с далеко от диапазона {lo}-{hi}: проверьте на слух "
                         f"(долгая пауза или лишний звук в начале/конце?)")
        best["warnings"] = warns
        best["criteria"] = criteria
        doc["picks"][str(i)] = best
        doc["candidates"][str(i)] = rows
    doc["picks"] = dict(sorted(doc["picks"].items(), key=lambda kv: int(kv[0])))
    doc["candidates"] = dict(sorted(doc["candidates"].items(), key=lambda kv: int(kv[0])))
    cm.write_json(out, doc)

    for i, rows in results.items():
        print(f"\nФраза {i} ({len(phrases[i - 1]['display_words'])} сл.): {phrases[i - 1]['display']}")
        for t in rows:
            mark = "*" if t["rank"] == 1 else " "
            flags = f"  !{','.join(t['flags'])}" if t["flags"] else ""
            err = f"  {t['errors']}" if t["errors"] else ""
            f0 = f"{t['f0_std_st']:.1f}" if t["f0_std_st"] is not None else "-"
            print(f" {mark} {t['take']:<12} WER {t['wer']:.2f}  {t['wps']:.2f} сл/с  {t['dur']:.2f} с  σF0 {f0}{flags}{err}")
        for w in doc["picks"][str(i)]["warnings"]:
            cm.log(f"ВНИМАНИЕ (фраза {i}): {w}")
    print(f"\n-> {out}: выбрано {len(results)} из {len(phrases)} фраз; режим --prefer {args.prefer}, темп {lo}-{hi} сл/с")


if __name__ == "__main__":
    cm.run(main)
