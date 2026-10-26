#!/usr/bin/env -S uv run --script
# /// script
# requires-python = "==3.11.*"
# dependencies = [
#   "kokoro>=0.9.4",
#   "misaki[en]>=0.9.4",
#   "en-core-web-sm @ https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl",
#   "torch",
#   "numpy",
#   "soundfile",
# ]
# [tool.uv]
# exclude-newer = "2026-10-19T00:00:00Z"
# ///
"""Озвучка фраз Kokoro-82M (английский): по одной фразе, несколько seed -> takes/p<i>_s<seed>.wav (24 кГц, float32).

  uv run --script tts_kokoro.py --script script.json --out takes/ --voice am_michael --speed 1.1 [--seeds 0] [--phrases 1,3]

Формат выхода тот же, что у tts_chatterbox.py, дальше те же check_takes.py -> assemble.py -> align.py.
Голоса: am_michael, am_adam (американский мужской), af_heart, af_bella (женский), bm_george, bf_emma (британский); первая буква
голоса = диалект (a/b). Лицензия Kokoro Apache-2.0. Работает на CPU, быстро. Kokoro почти детерминирован: seed влияет только на шум
вокодера и дубли практически одинаковы, поэтому по умолчанию один seed. Рычаги: --speed (1.0 как есть, 1.1-1.2 бодрее), --voice,
текст `tts` (запятые и точки дают паузы).
Берётся текст `tts` каждой фразы; в script.json должно быть lang = "en".
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True   # не мусорить __pycache__ в папке скилла
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _common as cm  # noqa: E402

cm.setup_env()

SR = 24000


def main() -> None:
    ap = argparse.ArgumentParser(description="Озвучка фраз Kokoro-82M (английский), несколько seed на фразу.")
    ap.add_argument("--script", required=True, help="script.json (lang: en)")
    ap.add_argument("--out", required=True, help="папка дублей (p<i>_s<seed>.wav)")
    ap.add_argument("--voice", default="am_michael", help="голос Kokoro (по умолчанию am_michael)")
    ap.add_argument("--speed", type=float, default=1.0, help="темп речи (по умолчанию 1.0; 1.1-1.2 бодрее)")
    ap.add_argument("--seeds", default="0", help="seed через запятую (по умолчанию 0)")
    ap.add_argument("--phrases", default=None, help="только эти фразы: 1,3 (нумерация с 1)")
    ap.add_argument("--force", action="store_true", help="пересинтезировать даже готовые дубли")
    args = ap.parse_args()

    script = cm.load_script(args.script)
    if script["lang"] != "en":
        raise cm.ScriptError(f'Kokoro озвучивает английский, а в сценарии lang = "{script["lang"]}". '
                             f"Для русского используйте tts_chatterbox.py.")
    if not 0.5 <= args.speed <= 2.0:
        raise cm.ScriptError("--speed: ожидается число от 0.5 до 2.0.")
    seeds = cm.parse_ints(args.seeds, "--seeds")
    sel = cm.select_phrases(args.phrases, len(script["phrases"]))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    manifest = cm.manifest_load(out)
    todo = []
    for i in sel:
        text = script["phrases"][i - 1]["tts"]
        for seed in seeds:
            name = cm.take_name(i, seed)
            params = {"engine": "kokoro", "voice": args.voice, "speed": args.speed, "text": text, "seed": seed}
            if not args.force and cm.take_is_current(out, manifest, name, params):
                cm.log(f"есть  {name} (те же текст и параметры)")
                continue
            todo.append((i, seed, name, params))
    if not todo:
        print(f"Все дубли уже готовы: {out}")
        return

    import numpy as np
    import torch
    from kokoro import KPipeline

    cm.log(f"Загружаю Kokoro-82M (голос {args.voice}); кэш моделей {cm.cache_root()}")
    t0 = time.time()
    pipe = KPipeline(lang_code=args.voice[0], repo_id="hexgrad/Kokoro-82M")
    cm.log(f"модель загружена за {time.time() - t0:.1f} с")

    for n, (i, seed, name, params) in enumerate(todo, 1):
        torch.manual_seed(seed)
        t0 = time.time()
        chunks = []
        for r in pipe(params["text"], voice=args.voice, speed=args.speed, split_pattern=None):
            au = r.audio.cpu().numpy() if hasattr(r.audio, "cpu") else np.asarray(r.audio)
            chunks.append(np.asarray(au, dtype="float32").reshape(-1))
        if not chunks:
            raise cm.ScriptError(f"Фраза {i}: Kokoro не вернул звук для текста {params['text']!r}.")
        a = np.concatenate(chunks)
        cm.write_take(out / name, a, SR)
        manifest[name] = {"params": params, "dur": round(len(a) / SR, 3), "sr": SR}
        cm.manifest_save(out, manifest)
        cm.log(f"[{n}/{len(todo)}] {name}  {len(a) / SR:.2f} с  генерация {time.time() - t0:.1f} с  пик {float(np.abs(a).max()):.2f}")
    print(f"Готово: {len(todo)} дублей в {out}. Дальше: check_takes.py --script {args.script} --takes {out} --out picks.json")


if __name__ == "__main__":
    cm.run(main)
