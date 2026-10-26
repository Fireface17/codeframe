#!/usr/bin/env -S uv run --script
# /// script
# requires-python = "==3.11.*"
# dependencies = [
#   "numpy",
#   "scipy",
#   "soundfile",
#   "soxr",
#   "torch>=2.6",
#   "transformers>=4.46",
#   "huggingface_hub",
#   "num2words",
# ]
# [tool.uv]
# exclude-newer = "2026-10-19T00:00:00Z"
# ///
"""Пословные тайминги озвучки по известному тексту: forced alignment (CTC, wav2vec2) -> words.json.

  uv run --script align.py --script script.json --wav vo.wav --out words.json

Что делает:
  1. Берёт из script.json текст `align` (для ru термины кириллицей: «Афтер Эффектс», «Клод», «тэ») и выравнивает его по звуку
     моделью wav2vec2 + CTC (ru: jonatasgrosman/wav2vec2-large-xlsr-53-russian, en: facebook/wav2vec2-large-960h-lv60-self).
     Начала слов точны примерно до 20 мс (у whisper-таймингов ошибка около 125 мс).
  2. Доводка (приёмы проверены на готовом ролике):
       - начало фразы = слышимое начало звука (по огибающей), а не пик CTC;
       - конец слова = начало следующего слова, а перед паузой = начало паузы (CTC даёт концы раньше реальных на ~70 мс);
       - короткие слова («Я», «тэ») CTC делает слишком короткими: их конец ставится в минимум энергии до следующего слова.
  3. Пишет ЭКРАННЫЕ слова из `display` (с пунктуацией, как в субтитрах):
       {"duration": .., "phrases": [{"i": 1, "start": .., "end": .., "text": "<display>"}], "words": [{"w": "<слово display>", "start": .., "end": ..}]}

Если рядом с wav лежит <имя>.phrases.json (его пишет assemble.py), каждая фраза выравнивается в своём окне и начала фраз берутся
оттуда: так надёжнее на длинных файлах. Без него выравнивается весь файл целиком. Флаг --global отключает окна.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True   # не мусорить __pycache__ в папке скилла
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _common as cm  # noqa: E402

cm.setup_env()

import numpy as np  # noqa: E402

MODELS = {
    "ru": "jonatasgrosman/wav2vec2-large-xlsr-53-russian",
    "en": "facebook/wav2vec2-large-960h-lv60-self",
}
MODEL_FILES = ["config.json", "preprocessor_config.json", "vocab.json", "pytorch_model.bin", "special_tokens_map.json", "tokenizer_config.json"]
FR = 0.02          # шаг кадра wav2vec2, с
HOP = 0.005        # шаг огибающей для доводки, с
WIN = 0.020        # окно огибающей, с
LOW_CONF = -6.0    # средний log-prob символа ниже этого значения - слово помечается как ненадёжное


# --------------------------------------------------------------------------- CTC
def ctc_viterbi(logp: np.ndarray, tokens: list[int], blank: int):
    """Принудительное выравнивание CTC (Витерби). logp: (T, V); tokens: id символов.
    Возврат: для каждого токена (первый кадр, последний кадр) и средний log-prob его кадров."""
    T = logp.shape[0]
    L = len(tokens)
    S = 2 * L + 1
    need = L + sum(1 for a, b in zip(tokens, tokens[1:]) if a == b)      # одинаковые символы подряд разделяются пустым кадром
    if T < need:
        raise cm.ScriptError(f"Звук слишком короткий для текста: {T} кадров модели ({T * FR:.2f} с) на {need} символов. "
                             f"Проверьте, что в align тот же текст, что звучит в файле.")
    ext = np.full(S, blank, dtype=np.int64)
    ext[1::2] = tokens
    NEG = -1e30
    allow2 = np.zeros(S, dtype=bool)
    allow2[2:] = (ext[2:] != blank) & (ext[2:] != ext[:-2])
    bp = np.zeros((T, S), dtype=np.int8)
    dp = np.full(S, NEG)
    dp[0] = logp[0, blank]
    dp[1] = logp[0, ext[1]]
    for t in range(1, T):
        c1 = np.concatenate([[NEG], dp[:-1]])
        c2 = np.concatenate([[NEG, NEG], dp[:-2]])
        c2 = np.where(allow2, c2, NEG)
        best = dp
        k = np.zeros(S, dtype=np.int8)
        m1 = c1 > best
        best = np.where(m1, c1, best)
        k[m1] = 1
        m2 = c2 > best
        best = np.where(m2, c2, best)
        k[m2] = 2
        dp = best + logp[t, ext]
        bp[t] = k
    s = S - 1 if dp[S - 1] >= dp[S - 2] else S - 2
    path = np.zeros(T, dtype=np.int64)
    for t in range(T - 1, -1, -1):
        path[t] = s
        s -= int(bp[t, s])
    first = np.full(L, -1, dtype=np.int64)
    last = np.full(L, -1, dtype=np.int64)
    total = np.zeros(L)
    count = np.zeros(L)
    for t in range(T):
        st = path[t]
        if st % 2 == 1:
            k = (st - 1) // 2
            if first[k] < 0:
                first[k] = t
            last[k] = t
            total[k] += logp[t, ext[st]]
            count[k] += 1
    return [(int(first[k]), int(last[k])) for k in range(L)], (total / np.maximum(count, 1)).tolist()


class Aligner:
    def __init__(self, repo: str, device: str = "cpu"):
        import torch
        from huggingface_hub import snapshot_download
        from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC

        from transformers.utils import logging as hf_logging

        hf_logging.set_verbosity_error()                  # без отчётов о загрузке весов («masked_spec_embed MISSING» безвредно)
        cm.log(f"Модель выравнивания: {repo} (кэш {cm.cache_root()})")
        path = snapshot_download(repo, allow_patterns=MODEL_FILES)
        self.torch = torch
        self.device = device
        self.fe = Wav2Vec2FeatureExtractor.from_pretrained(path)
        self.model = Wav2Vec2ForCTC.from_pretrained(path).to(device).eval()
        self.vocab = json.loads((Path(path) / "vocab.json").read_text(encoding="utf-8"))
        self.blank = self.vocab.get("<pad>", 0)
        self.sep = self.vocab.get("|")
        letters = [k for k in self.vocab if len(k) == 1 and k.isalpha()]
        self.upper = bool(letters) and all(k.isupper() for k in letters)   # английская модель: буквы заглавные

    def logp(self, x16: np.ndarray) -> np.ndarray:
        torch = self.torch
        inp = self.fe(x16, sampling_rate=16000, return_tensors="pt").input_values.to(self.device)
        with torch.inference_mode():
            lg = self.model(inp).logits[0].float()
        return torch.log_softmax(lg, dim=-1).cpu().numpy()

    # слово align -> подслова -> id символов
    def subwords(self, token: str, lang: str) -> list[list[int]]:
        t = token.lower().replace("\u0301", "").replace("+", "")

        def spell(m: re.Match) -> str:
            from num2words import num2words

            try:
                return " " + num2words(int(m.group(0)), lang=lang) + " "
            except Exception as e:  # noqa: BLE001
                raise cm.ScriptError(f"Не получилось прочитать число «{m.group(0)}» в align ({e}). Напишите его словами.") from None

        t = re.sub(r"(\d+)\s*%", lambda m: f"{m.group(1)} {cm.percent_word(int(m.group(1)), lang)} ", t)
        t = t.replace("%", " " + cm.percent_word(5, lang) + " ")
        t = re.sub(r"\d+", spell, t)
        out = []
        for part in re.split(r"[^\w']+|_", t):
            if self.upper:
                part = part.upper()
            ids = [self.vocab[c] for c in part if c in self.vocab and c not in "|"]
            if ids:
                out.append(ids)
        return out

    def align(self, x16: np.ndarray, units: list[list[list[int]]]):
        """units[u] = список подслов (id символов). Возврат: на каждый unit (start, end, conf) в секундах от начала x16."""
        lp = self.logp(x16)
        ids, owner = [], []
        for u, subs in enumerate(units):
            for sub in subs:
                if ids and self.sep is not None:
                    ids.append(self.sep)
                    owner.append(-1)
                ids.extend(sub)
                owner.extend([u] * len(sub))
        spans, scores = ctc_viterbi(lp, ids, self.blank)
        res: list[list[float] | None] = [None] * len(units)
        conf: list[list[float]] = [[] for _ in units]
        for (f0, f1), sc, u in zip(spans, scores, owner):
            if u < 0 or f0 < 0:
                continue
            s, e = f0 * FR, (f1 + 1) * FR
            if res[u] is None:
                res[u] = [s, e]
            else:
                res[u] = [min(res[u][0], s), max(res[u][1], e)]
            conf[u].append(sc)
        return [(r[0], r[1], float(np.mean(c))) if r is not None else None for r, c in zip(res, conf)]


# --------------------------------------------------------------------------- доводка границ по энергии
def find_pauses(db: np.ndarray, hop: float, pause_min: float = 0.10, drop_db: float = 35.0):
    """Паузы = участки тише (95-й перцентиль - 35 дБ) длиной >= pause_min. Тишина в самом начале файла паузой не считается;
    тишина в конце считается (чтобы последнее слово кончалось там, где кончился звук)."""
    ref = np.percentile(db, 95)
    sil = db < ref - drop_db
    pauses, i, n = [], 0, len(sil)
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            if (j - i) * hop >= pause_min and i > 0:
                pauses.append((i * hop, j * hop))
            i = j
        else:
            i += 1
    return pauses, ref


def refine_ctc(words, pauses, near: float = 0.25, join_gap: float = 0.15):
    """Концы слов: перед паузой -> начало паузы; внутри фразы конец = начало следующего слова, если зазор < join_gap
    (CTC-концы раньше реальных на ~70 мс). Начала слов не трогаем: у CTC они точнее всего."""
    out = [dict(w) for w in words]
    for w in out:
        for ps, _pe in pauses:
            if abs(ps - w["e"]) <= near:
                w["e"] = ps
                break
    for k in range(len(out) - 1):
        a, b = out[k], out[k + 1]
        paused = any(a["e"] - 0.02 <= ps <= b["s"] + 0.02 for ps, _pe in pauses)
        if not paused and 0 <= b["s"] - a["e"] < join_gap:
            a["e"] = b["s"]
    return out


def audible_onset(x: np.ndarray, sr: int, t0: float, t1: float, back: float = 0.25, fwd: float = 0.15, floor: float = 0.0) -> float:
    """Начало слышимого звука фразы: первый кадр 5 мс, где уровень выше пика фразы - 45 дБ (тот же детектор, что в assemble.py).
    floor: не искать раньше этого времени (конец предыдущей фразы плюс запас), иначе при короткой паузе в окно попадёт её хвост."""
    h = int(0.005 * sr)
    lo = (max(0, int(max(t0 - back, min(floor, t0 - 0.02)) * sr)) // h) * h
    hi = min(len(x), int((t1 + fwd) * sr))
    a, _ = cm.sound_bounds(x[lo:hi], sr)
    return lo / sr + a


def finish_words(words, phrase_first, onsets, db, hop, ref):
    """Доводка по приёмам final_words.py. words: [{s, e}] подряд по всем фразам; phrase_first: индексы первых слов фраз;
    onsets: {индекс первого слова: слышимое начало фразы}."""
    from scipy.ndimage import uniform_filter1d

    sm = uniform_filter1d(db, size=3)
    n = len(words)
    for idx, on in onsets.items():
        if on is not None and abs(words[idx]["s"] - on) <= 0.2:
            words[idx]["s"] = on
    first = set(phrase_first)
    for i in range(n - 1):
        if i + 1 in first:
            continue
        a, b = words[i], words[i + 1]
        if b["s"] - a["e"] >= 0.04:                      # зазор внутри фразы (тире, двоеточие, короткое слово)
            lo, hi = int(a["e"] / hop), int(b["s"] / hop)
            seg = sm[lo:hi + 1]
            run = best = 0
            for v in (seg < ref - 35):                   # самая длинная тишина в зазоре
                run = run + 1 if v else 0
                best = max(best, run)
            if len(seg) and best * hop < 0.10:           # настоящей паузы (>= 100 мс) нет -> конец на минимуме огибающей
                a["e"] = (lo + int(seg.argmin())) * hop
    for i in range(n - 1):                               # конец слова не позже начала следующего
        if words[i + 1]["s"] > words[i]["s"]:
            words[i]["e"] = min(words[i]["e"], words[i + 1]["s"])
    for w in words:
        w["s"] = round(w["s"], 3)
        w["e"] = round(max(w["e"], w["s"] + 0.03), 3)
    return words


# --------------------------------------------------------------------------- основной ход
def load_phrase_extents(path: Path, n: int, duration: float):
    """Границы звука фраз из <имя>.phrases.json (пишет assemble.py). Возврат [(start, end)] или None, если файл не подходит."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        ph = data["phrases"]
        if len(ph) != n:
            cm.log(f"ВНИМАНИЕ: в {path.name} {len(ph)} фраз, в сценарии {n}: окна по фразам отключены.")
            return None
        if "duration" in data and abs(float(data["duration"]) - duration) > 0.01:
            cm.log(f"ВНИМАНИЕ: длительность в {path.name} ({data['duration']:.3f} с) не совпадает с wav ({duration:.3f} с): окна по фразам отключены.")
            return None
        return [(float(p["start"]), float(p["end"])) for p in ph]
    except (OSError, KeyError, ValueError, TypeError) as e:
        cm.log(f"ВНИМАНИЕ: {path.name} не прочитан ({e}): окна по фразам отключены.")
        return None


def main() -> None:
    ap = argparse.ArgumentParser(description="Пословные тайминги озвучки: forced alignment CTC по тексту align из script.json.")
    ap.add_argument("--script", required=True, help="script.json")
    ap.add_argument("--wav", required=True, help="озвучка целиком (vo.wav)")
    ap.add_argument("--out", required=True, help="куда писать words.json")
    ap.add_argument("--phrases", default=None, help="vo.phrases.json от assemble.py (по умолчанию <wav>.phrases.json рядом, если есть)")
    ap.add_argument("--global", dest="glob", action="store_true", help="выравнивать весь файл целиком, не по окнам фраз")
    ap.add_argument("--device", default="cpu", choices=["cpu", "mps"], help="cpu надёжнее; mps может дать другие числа")
    ap.add_argument("--model", default=None, help="другая модель wav2vec2-CTC с HF вместо стандартной для lang")
    ap.add_argument("--raw", action="store_true", help="без доводки границ (сырой CTC), для отладки")
    args = ap.parse_args()

    script = cm.load_script(args.script, strict_align=True)
    lang = script["lang"]
    wav = Path(args.wav)
    if not wav.is_file():
        raise cm.ScriptError(f"Файл озвучки не найден: {wav}")
    x, sr = cm.read_mono(wav)
    dur = len(x) / sr
    x16 = cm.resample(x, sr, 16000, "HQ").astype(np.float32)
    phrases = script["phrases"]
    n_words = sum(len(p["align_words"]) for p in phrases)
    cm.log(f"{wav.name}: {dur:.2f} с, {sr} Гц; фраз {len(phrases)}, слов {n_words}; язык {lang}")

    extents = None
    if not args.glob:
        ppath = Path(args.phrases) if args.phrases else wav.with_suffix(".phrases.json")
        if ppath.is_file():
            extents = load_phrase_extents(ppath, len(phrases), dur)
        elif args.phrases:
            raise cm.ScriptError(f"Файл --phrases не найден: {ppath}")

    al = Aligner(args.model or MODELS[lang], args.device)
    units, bad = [], []
    for p in phrases:
        row = []
        for w in p["align_words"]:
            subs = al.subwords(w, lang)
            if not subs:
                bad.append(f"фраза {p['i']}: «{w}»")
            row.append(subs)
        units.append(row)
    if bad:
        raise cm.ScriptError("В align есть слова без букв, известных модели выравнивания: " + ", ".join(bad) +
                             ". Напишите их буквами (для ru кириллицей), цифры допустимы.")

    # --- CTC
    res: list[tuple[float, float, float] | None] = []
    if extents:
        cm.log(f"Выравнивание по окнам фраз ({ppath.name})")
        for k, p in enumerate(phrases):
            s_k, e_k = extents[k]
            prev_end = extents[k - 1][1] if k else 0.0
            next_start = extents[k + 1][0] if k + 1 < len(phrases) else dur
            lo = max(0.0, s_k - min(0.25, max(s_k - prev_end, 0.0) / 2))
            hi = min(dur, e_k + min(0.25, max(next_start - e_k, 0.0) / 2))
            i0 = int(lo * 16000)
            lo = i0 / 16000                                  # окно начинается ровно на отсчёте
            try:
                part = al.align(x16[i0:int(hi * 16000)], units[k])
            except cm.ScriptError as e:
                raise cm.ScriptError(f"Фраза {p['i']}: {e}") from None
            res.extend(None if r is None else (r[0] + lo, r[1] + lo, r[2]) for r in part)
    else:
        cm.log("Выравнивание всего файла целиком")
        if dur > 120:
            cm.log(f"ВНИМАНИЕ: файл {dur:.0f} с без окон по фразам: на таком объёме модели может не хватить памяти. "
                   f"Соберите озвучку через assemble.py (vo.phrases.json рядом с wav) и запустите без --global.")
        res = al.align(x16, [u for row in units for u in row])
    if any(r is None for r in res):
        raise cm.ScriptError("Не удалось выровнять часть слов (звук короче текста?). Проверьте, что озвучка соответствует align.")

    # --- слова
    words = [{"s": r[0], "e": r[1]} for r in res]
    conf = [r[2] for r in res]
    phrase_first, k = [], 0
    for p in phrases:
        phrase_first.append(k)
        k += len(p["align_words"])
    if not args.raw:
        hop_n = int(HOP * sr)
        hop = hop_n / sr                                  # реальный шаг в секундах (при 22.05/44.1 кГц это не ровно 5 мс)
        db = cm.frame_db(x, int(WIN * sr), hop_n)
        pauses, ref = find_pauses(db, hop)
        words = refine_ctc(words, pauses)
        onsets = {}
        for pi, idx in enumerate(phrase_first):
            if extents:
                onsets[idx] = extents[pi][0]
            else:
                last = idx + len(phrases[pi]["align_words"]) - 1
                floor = words[idx - 1]["e"] + 0.10 if idx else 0.0
                onsets[idx] = audible_onset(x, sr, words[idx]["s"], words[last]["e"], floor=floor)
        words = finish_words(words, phrase_first, onsets, db, hop, ref)
    else:
        for w in words:
            w["s"], w["e"] = round(w["s"], 3), round(w["e"], 3)

    # --- вывод в экранных словах
    out_words, out_phrases, k = [], [], 0
    for p in phrases:
        n = len(p["display_words"])
        ws = words[k:k + n]
        for dw, w in zip(p["display_words"], ws):
            out_words.append({"w": dw, "start": w["s"], "end": w["e"]})
        out_phrases.append({"i": p["i"], "start": ws[0]["s"], "end": ws[-1]["e"], "text": p["display"]})
        k += n
    data = {"duration": round(dur, 3), "phrases": out_phrases, "words": out_words}
    cm.write_json(args.out, data)

    # --- отчёт
    for p in out_phrases:
        print(f"{p['i']:>2}  {p['start']:7.3f} - {p['end']:7.3f}  {p['text']}")
    # односложные предлоги и союзы («в», «и», «с») модель почти не «слышит» отдельно от соседей: их уверенность низкая всегда
    shaky = [(c, w["w"]) for c, w in zip(conf, out_words) if c < LOW_CONF and len(re.sub(r"[\W\d_]", "", w["w"])) >= 3]
    if shaky:
        cm.log("ВНИМАНИЕ: ненадёжно выровнены (модель плохо «слышит» эти слова, проверьте align и звук): " +
               ", ".join(f"{w} ({c:.1f})" for c, w in sorted(shaky)[:12]))
    odd = [w["w"] for w in out_words if w["end"] - w["start"] > 1.2]
    if odd:
        cm.log("ВНИМАНИЕ: слова длиннее 1.2 с (возможно, сдвиг выравнивания): " + ", ".join(odd))
    print(f"-> {args.out}: {len(out_words)} слов, {len(out_phrases)} фраз, длительность {dur:.3f} с")


if __name__ == "__main__":
    cm.run(main)
