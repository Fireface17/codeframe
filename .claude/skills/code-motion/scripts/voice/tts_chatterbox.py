#!/usr/bin/env -S uv run --script
# /// script
# requires-python = "==3.11.*"
# dependencies = [
#   "chatterbox-tts @ git+https://github.com/resemble-ai/chatterbox@5de7a54aa4e5e2baadb0182dde554908b48b85c2",
#   "soundfile",
#   "ruaccent",
#   "onnxruntime",
#   "setuptools<81",
# ]
# [tool.uv]
# exclude-newer = "2026-10-19T00:00:00Z"
# override-dependencies = [
#   "gradio; sys_platform == 'never'",
#   "resemble-perth==1.0.1",
# ]
# ///
"""Озвучка фраз Chatterbox Multilingual (V3): по одной фразе, несколько seed -> takes/p<i>_s<seed>.wav (24 кГц, float32).

  uv run --script tts_chatterbox.py --script script.json --out takes/ --seeds 7,11,13 \\
      --exaggeration 0.5 --cfg 0.5 --temperature 0.8 [--voice default|ref.wav] [--phrases 1,3] [--stress]

Основной движок для русского (лицензия MIT; в звук вшит неслышимый водяной знак Resemble PerTh, снимать его нельзя).
Берётся текст `tts` каждой фразы; язык = lang из script.json. Параметры «живости»:
  --exaggeration  выразительность, 0.25-2.0; 0.5 нейтрально, больше = эмоциональнее и быстрее (выше 1.0 бывают срывы);
  --cfg           cfg_weight, 0-1; меньше = медленнее, размереннее и ровнее; 0.5 по умолчанию;
  --temperature   случайность интонации, 0.05-5; меньше = ровнее, больше = живее, но чаще ошибки;
  --seeds         один seed = один дубль; интонация и темп «лотерея», берите 4-6 seed и выбирайте check_takes.py.
--voice default: встроенный голос; --voice ref.wav: клонирование по 6-10 секундам чистой речи на том же языке.
--stress: расставить ударения RUAccent (U+0301) в tts; слова, где ударение уже стоит (U+0301 или «+»), не трогаются.
Уже готовые дубли с теми же текстом и параметрами пропускаются (takes/takes.json); --force пересинтезирует.
На Mac лимиты MPS-памяти выставляются автоматически: без них Chatterbox уходит в своп на 16 ГБ.
"""
from __future__ import annotations

import argparse
import random
import re
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True   # не мусорить __pycache__ в папке скилла
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _common as cm  # noqa: E402

cm.setup_env()
cm.mps_limits()

import warnings  # noqa: E402

warnings.filterwarnings("ignore", message=".*pkg_resources is deprecated.*")        # Perth 1.0.1 импортирует pkg_resources
warnings.filterwarnings("ignore", message=".*local_dir_use_symlinks.*")             # RUAccent вызывает устаревший аргумент hub

import logging  # noqa: E402

# внутренний расстановщик ударений Chatterbox (пакет russian_text_stresser) не установлен, мы ставим ударения сами (--stress)
logging.getLogger("chatterbox.models.tokenizers.tokenizer").setLevel(logging.ERROR)

ACUTE = "\u0301"
VOWELS = "аеёиоуыэюяАЕЁИОУЫЭЮЯ"


# --------------------------------------------------------------------------- ударения
def plus_to_acute(s: str) -> str:
    """Знак «+» перед ударной гласной -> комбинируемый акут U+0301 после неё: «пос+адка» -> «посадка» с акутом над второй «а»."""
    return re.sub(r"\+([%s])" % VOWELS, lambda m: m.group(1) + ACUTE, s)


def has_manual_stress(token: str) -> bool:
    return ACUTE in token or "+" in token


def make_accentuator():
    import numpy as np
    import onnxruntime as ort

    # ONNX-модели RUAccent просят token_type_ids, а токенайзер transformers 5.x их не отдаёт: дописываем нули
    if not getattr(ort.InferenceSession, "_cm_patched", False):
        orig = ort.InferenceSession.run

        def run(self, output_names, input_feed, run_options=None):
            names = {i.name for i in self.get_inputs()}
            if "token_type_ids" in names and "token_type_ids" not in input_feed:
                input_feed = dict(input_feed)
                input_feed["token_type_ids"] = np.zeros_like(input_feed["input_ids"])
            return orig(self, output_names, input_feed, run_options)

        ort.InferenceSession.run = run
        ort.InferenceSession._cm_patched = True
    from ruaccent import RUAccent

    work = cm.cache_root() / "ruaccent"
    work.mkdir(parents=True, exist_ok=True)
    acc = RUAccent()
    acc.load(omograph_model_size="turbo3.1", use_dictionary=True, tiny_mode=False, workdir=str(work))
    return acc


def auto_stress(acc, text: str) -> str:
    """Ударения RUAccent на всю фразу (омографам нужен контекст). Ручные ударения в исходном тексте сохраняются.
    Английские слова RUAccent не трогает, «ё» уже ударная и не размечается."""
    src = text.split()
    manual = [has_manual_stress(t) for t in src]
    clean = " ".join(t.replace(ACUTE, "").replace("+", "") for t in src)
    res = acc.process_all(clean).split()
    if len(res) != len(src):                        # RUAccent поменял число токенов: сопоставить слова нельзя
        return plus_to_acute(text) if any(manual) else plus_to_acute(" ".join(res))
    return " ".join(plus_to_acute(s if m else r) for s, r, m in zip(src, res, manual))


# --------------------------------------------------------------------------- основной ход
def main() -> None:
    ap = argparse.ArgumentParser(description="Озвучка фраз Chatterbox Multilingual V3 (несколько seed на фразу).")
    ap.add_argument("--script", required=True, help="script.json")
    ap.add_argument("--out", required=True, help="папка дублей (p<i>_s<seed>.wav)")
    ap.add_argument("--seeds", default="7,11,13", help="seed через запятую, например 7,11,13")
    ap.add_argument("--exaggeration", type=float, default=0.5, help="выразительность (по умолчанию 0.5)")
    ap.add_argument("--cfg", type=float, default=0.5, help="cfg_weight (по умолчанию 0.5)")
    ap.add_argument("--temperature", type=float, default=0.8, help="температура (по умолчанию 0.8)")
    ap.add_argument("--voice", default="default", help="default или путь к референсу 6-10 с (wav)")
    ap.add_argument("--phrases", default=None, help="только эти фразы: 1,3 (нумерация с 1)")
    ap.add_argument("--stress", action="store_true", help="расставить ударения RUAccent в tts (для ru)")
    ap.add_argument("--t3", default="v3", help="версия T3: v3 (по умолчанию) или v2")
    ap.add_argument("--device", default=None, help="mps / cpu (по умолчанию mps, если есть)")
    ap.add_argument("--force", action="store_true", help="пересинтезировать даже готовые дубли")
    args = ap.parse_args()

    script = cm.load_script(args.script)
    lang = script["lang"]
    seeds = cm.parse_ints(args.seeds, "--seeds")
    sel = cm.select_phrases(args.phrases, len(script["phrases"]))
    voice = None
    if args.voice != "default":
        voice = Path(args.voice).expanduser()
        if not voice.is_file():
            raise cm.ScriptError(f"--voice: файл референса не найден: {voice}")
    if args.stress and lang != "ru":
        cm.log("ВНИМАНИЕ: --stress работает только для русского, для lang=%s игнорируется." % lang)
        args.stress = False
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    manifest = cm.manifest_load(out)
    base = {"engine": "chatterbox", "t3": args.t3, "lang": lang, "voice": str(voice.resolve()) if voice else "default",
            "voice_mtime": voice.stat().st_mtime_ns if voice else None, "exaggeration": args.exaggeration, "cfg": args.cfg,
            "temperature": args.temperature, "stress": args.stress}
    todo = []
    for i in sel:
        for seed in seeds:
            name = cm.take_name(i, seed)
            params = {**base, "text": script["phrases"][i - 1]["tts"], "seed": seed}
            if not args.force and cm.take_is_current(out, manifest, name, params):
                cm.log(f"есть  {name} (те же текст и параметры)")
                continue
            todo.append((i, seed, name, params))
    if not todo:
        print(f"Все дубли уже готовы: {out}")
        return

    # текст для модели: tts, с ударениями RUAccent при --stress (только для фраз, которые синтезируются); до загрузки Chatterbox
    texts = {i: plus_to_acute(script["phrases"][i - 1]["tts"]) for i in {t[0] for t in todo}}      # ручное «+» -> акут и без --stress
    if args.stress:
        acc = make_accentuator()
        for i in sorted(texts):
            texts[i] = auto_stress(acc, texts[i])
            cm.log(f"ударения, фраза {i}: {texts[i]}")
        del acc

    import numpy as np
    import torch

    dev = args.device or ("mps" if torch.backends.mps.is_available() else "cpu")
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    import chatterbox.models.tokenizers.tokenizer as _tok

    # китайский сегментатор pkuseg не нужен для ru/en, а при инициализации качает данные в ~/.pkuseg
    _tok.ChineseCangjieConverter._init_segmenter = lambda self: None
    cm.log(f"Загружаю Chatterbox ({args.t3}) на {dev}; кэш моделей {cm.cache_root()}")
    t0 = time.time()
    model = ChatterboxMultilingualTTS.from_pretrained(device=dev, t3_model=args.t3)
    cm.log(f"модель загружена за {time.time() - t0:.1f} с")
    if voice:
        model.prepare_conditionals(str(voice), exaggeration=args.exaggeration)

    for n, (i, seed, name, params) in enumerate(todo, 1):
        torch.manual_seed(seed)
        random.seed(seed)
        np.random.seed(seed)
        t0 = time.time()
        wav = model.generate(texts[i], language_id=lang, audio_prompt_path=None, exaggeration=args.exaggeration,
                             cfg_weight=args.cfg, temperature=args.temperature)
        a = wav.squeeze().cpu().numpy()
        cm.write_take(out / name, a, model.sr)
        dur = len(a) / model.sr
        manifest[name] = {"params": params, "text_sent": texts[i], "dur": round(dur, 3), "sr": model.sr}
        cm.manifest_save(out, manifest)
        warn = "  ВНИМАНИЕ: очень короткий дубль" if dur < 0.3 else ""
        cm.log(f"[{n}/{len(todo)}] {name}  {dur:.2f} с  генерация {time.time() - t0:.1f} с  пик {float(np.abs(a).max()):.2f}{warn}")
    print(f"Готово: {len(todo)} дублей в {out}. Дальше: check_takes.py --script {args.script} --takes {out} --out picks.json")


if __name__ == "__main__":
    cm.run(main)
