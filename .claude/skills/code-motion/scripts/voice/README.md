# voice: озвучка и тайминги слов для code-motion

`script.json` -> дубли голоса (синтез или живая запись) -> лучший дубль каждой фразы -> `vo.wav` -> `words.json` (время каждого экранного слова).
Скрипты самодостаточны и не привязаны к проектам: запускайте из любой папки, пути передавайте аргументами.

## Как запускать

Каждый скрипт: `uv run --script <файл>.py ...`. Зависимости записаны в шапке файла (PEP 723), ручные venv не нужны; версии
зафиксированы датой `exclude-newer` в шапке (чтобы обновить пакеты, поменяйте дату). Первый запуск скрипта собирает окружение и качает
модель (2-15 минут, зависит от сети), следующие стартуют за секунды. Скорость на Mac M-серии (MPS, замер на 16 ГБ): Chatterbox грузится
около 10 с, дубль фразы из 5-8 слов 3-5 с (40 слов: около 20 с); `check_takes.py` около 0.5 с на дубль; `assemble.py` около 1 с; `align.py` около 6 с.

```bash
export PATH="/opt/homebrew/bin:$PATH"          # macOS с Homebrew: uv и ffmpeg лежат здесь
V=~/.claude/skills/code-motion/scripts/voice
```

## Порядок команд: от script.json до words.json

```bash
# 1. дубли. Русский: Chatterbox (берите 4-6 seed: интонация "лотерея"); английский: Kokoro
uv run --script $V/tts_chatterbox.py --script script.json --out takes/ --seeds 7,11,13,17 [--stress] [--phrases 1,3]
uv run --script $V/tts_kokoro.py     --script script.json --out takes/ --voice am_michael --speed 1.1
# 2. проверка дублей и выбор лучшего на каждую фразу -> picks.json
uv run --script $V/check_takes.py --script script.json --takes takes/ --out picks.json [--prefer wer|pace]
# 3. склейка -> vo.wav (+ vo.phrases.json рядом)
uv run --script $V/assemble.py --script script.json --picks picks.json --out vo.wav [--pick 3:p3_s11.wav]
# 4. тайминги экранных слов -> words.json
uv run --script $V/align.py --script script.json --wav vo.wav --out words.json
```

В командах два `--script`: первый (до имени файла) флаг uv, второй (после) аргумент скрипта с путём к `script.json`.
Перед шагом 1 проверьте `memory_pressure`: Chatterbox занимает около 5 ГБ памяти, не запускайте его вместе с другими моделями.
Ошибки в `script.json` (число слов, латиница в `align`) скрипты печатают по-русски до загрузки моделей.

## Живой голос: от записи к vo.wav

Голос автора, записанный на диктофон или ноутбук. Как готовить текст для записи и почему такие настройки —
`references/audio.md` §3б. Распознавание (`takes.py`, `live_words.py`, `check_takes.py`) — mlx-whisper: Mac на Apple Silicon.

```bash
V=~/.claude/skills/code-motion/scripts/voice; G=audio/vo/live
# 1. запись -> дубли. Фразы по 2-3 раза подряд или 2-3 прохода всего текста:
uv run --script $V/takes.py audio/vo/raw/rec.m4a script.json $G/takes > $G/takes.log
#    split.json: какой кусок к какой фразе отнесён, missing — фразы без дублей
# 1б. запись вразброс (повторы не подряд, поправки, сбои): слова с таймингами -> отрезки дублей вручную
uv run --script $V/live_words.py $G/takes/_raw48.wav $G/words_raw.json --segments $G/takes/split.json
#    по напечатанным «слово@время» составить spans.json (формат — в шапке live_cut.py), затем:
uv run --script $V/live_cut.py audio/vo/raw/rec.m4a $G/words_raw.json $G/spans.json $G/cand
# 2. отбор: текст + просодия; выбор — в picks (руками или picks.json)
uv run --script $V/check_takes.py --script script.json --takes $G/cand --out $G/picks.json --pace 2.1,2.8
uv run --script $V/prosody.py $G/cand
# 3. обработка и склейка: цепочка C, без вдохов, паузы ×0,7, темп до +8 %
uv run --script $V/live_chain.py --script script.json --cand $G/cand --picks $G/picks.json --out $G/vo_pre.wav --tempo 1.06
# 4. диэссер -> громкость -16 LUFS и лимитер -2 dBFS -> vo.wav -> слова -> тайминги
uv run --script $V/deess.py $G/vo_pre.wav $G/vo_deess.wav --pct 90 --max 6
I=$(ffmpeg -hide_banner -nostats -i $G/vo_deess.wav -af ebur128 -f null - 2>&1 | awk '/I:/{v=$2} END{print v}')
G16=$(python3 -c "print(round(-16 - ($I) + 0.1, 2))")      # +0,1 дБ — поправка на лимитер
ffmpeg -loglevel error -y -i $G/vo_deess.wav -af "volume=${G16}dB,alimiter=limit=0.794:attack=5:release=50:level=disabled" \
       -ar 48000 -c:a pcm_s24le audio/vo/vo.wav
cp $G/vo_pre.phrases.json audio/vo/vo.phrases.json        # границы фраз: align.py выравнивает каждую в своём окне
uv run --script $V/align.py --script script.json --wav audio/vo/vo.wav --out audio/vo/words.json
node tools/timing.mjs
# замена одной фразы без пересборки (перезаписал кусок): вне отрезка дорожка бит в бит прежняя
uv run --script $V/patch_phrase.py --vo audio/vo/vo.wav --piece audio/vo/raw/fix.m4a --region 5.28:6.65 --out audio/vo/vo_fix.wav
```

- Порядок выбора дубля: текст дословно -> интонация как в тексте для записи (конец ↘, не вопрос: `prosody.py`, колонка
  «конец») -> живость (σ) -> темп. Ударения скрипты не слышат: выбранные дубли надо прослушать.
- `live_cut.py` ставит стыки в тишину (окно 20 мс ниже −55 дБFS в пределах 0,35 с от границы слова): тайминги
  mlx-whisper бывают сдвинуты на 0,2–0,35 с. Ручная граница куска — `_bounds` в spans.json.
- `live_chain.py --pregain auto` ставит запись к ≈ −20 LUFS: на этом уровне стоят пороги экспандера и компрессора.
  Свои паузы: `--pause 3=0.9` (после фразы 3), свой темп дубля: `--tempo-take p3_s1=1.0`.
- Диэссер — после склейки (свист копится от EQ и компрессора), мягко: `--pct 90 --max 6`; средне — `--pct 85 --max 8`.
- Темп живой записи — 2,1–2,5 сл/с, после обработки +6–8 %: подбирайте `--pace` для `check_takes.py` под свой голос.

## script.json

```json
{"lang": "ru", "lead": 0.3, "tail": 0.6, "pauses": [0.28],
 "phrases": [{"display": "Это не After Effects. Это код.",
              "tts":     "Это не After Effects. Это код.",
              "align":   "Это не Афтер Эффектс. Это код."},
             {"display": "Линия рисуется сама."}]}
```

- `lang`: `ru` или `en`. `lead` / `tail`: тишина до первого и после последнего звука, с. `pauses`: тишина между концом звука одной
  фразы и началом следующей, с (на одну меньше, чем фраз; недостающие добираются последним значением).
- `display`: текст субтитров; слова в `words.json` берутся отсюда, с пунктуацией.
- `tts`: что слышит модель: «тэ» вместо «t», ударения (U+0301 или «+» перед гласной), числа словами. Нет поля: берётся `display`.
- `align`: текст для выравнивания и сверки с whisper; для `ru` только кириллица: «Афтер Эффектс», «Клод», «тэ». Нет поля: берётся `display`.
- Слово = кусок между пробелами, где есть буква или цифра; одинокое тире словом не считается. **Число слов в `display` и `align`
  каждой фразы должно совпадать**, иначе скрипты остановятся и покажут обе строки рядом. Несколько слов под одно слово экрана
  склейте дефисом: «восемь-процентов». Цифры и «%» в `align` читаются автоматически («8%» = «восемь процентов»).

## Chatterbox: параметры «живости»

| параметр | по умолчанию | эффект |
|---|---|---|
| `--exaggeration` | 0.5 | выразительность: 0.5 спокойно, 0.75 живо, 0.9 драматично; выше = эмоциональнее и быстрее |
| `--cfg` | 0.5 | cfg_weight, 0-1: ниже = медленнее и размереннее; при высокой экспрессии 0.3-0.4 держит темп; с референсом на другом языке 0 |
| `--temperature` | 0.8 | случайность интонации: 0.8-0.9 обычно; ниже = ровнее, выше = живее, но больше ошибок |
| `--seeds` | 7,11,13 | один seed = один дубль; темп и интонация у разных seed разные |
| `--voice` | default | встроенный голос или путь к референсу (6-10 с чистой речи на том же языке) |
| `--stress` | выкл | ударения RUAccent (U+0301) в `tts`; слова с ручным ударением (U+0301 или `+`) не трогаются |

Готовые дубли с теми же текстом и параметрами пропускаются (`takes/takes.json`); `--force` пересинтезирует. Лимиты MPS-памяти
(`PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.8`, `LOW=0.6`) скрипт выставляет сам: без них Chatterbox на 16 ГБ уходит в своп.
Kokoro почти детерминирован: seed меняет дубли слабо, рычаги там `--speed`, `--voice` и пунктуация в `tts`.

## Выбор дублей

`check_takes.py` для каждого дубля считает: whisper large-v3-turbo (mlx-whisper на Apple Silicon, иначе faster-whisper) и WER к `align` (`--ref tts|display` меняет эталон);
темп слов/с; клиппинг, щелчки, обрезанный хвост; σF0 (живость интонации, полутоны). WER не штрафует «сдвигом»/«с двигом», «код»/«кот»,
«8»/«восемь», «Афтер Эффектс»/«After Effects» и пропуск одинокой «t».
`--prefer wer`: сначала WER, потом темп ближе к `--pace 2.8,3.3` (диапазон подбирайте под голос: Chatterbox ru около 3 сл/с,
Kokoro `--speed 1.1` около 3.3-3.8), потом σF0. `--prefer pace`: сначала дубли с WER <= `--max-wer`
(0), среди них ближе к диапазону темпа. Дубль с дефектом выбирается, только если других нет; скрипт предупредит о WER и о темпе вне диапазона.
`picks.json` можно править руками (поле `take`), одну фразу перепроверить: `--phrases 3` (остальные записи сохраняются).
Интонацию и лишние звуки скрипт не слышит: прослушайте выбранные дубли. На Intel/Linux faster-whisper ставится сам; на Apple Silicon
принудительно: `uv run --script --with faster-whisper $V/check_takes.py ... --backend faster`.

## Что на выходе

- `takes/p<i>_s<seed>.wav`: сырые дубли (24 кГц, float32, пики выше 1.0 видны) и `takes/takes.json`.
- `picks.json`: выбранный дубль каждой фразы с метриками и настройками выбора (`picks`) и все кандидаты (`candidates`).
- `vo.wav`: 48 кГц, моно, PCM 24, -16 LUFS integrated, true peak не выше -1.5 dBTP; фразы выровнены по громкости, фейды 5 мс.
  `vo.phrases.json`: где в `vo.wav` звучит каждая фраза (читает `align.py`).
- `words.json`: `{"duration", "phrases": [{"i", "start", "end", "text"}], "words": [{"w", "start", "end"}]}`, секунды от начала `vo.wav`.
  Начала слов точны примерно до 20 мс (CTC wav2vec2; у whisper-таймингов около 125 мс). Начало фразы = слышимое начало звука, конец слова =
  начало следующего слова или начало паузы, короткие слова («Я», «тэ») доведены по энергии. Слова, которые модель плохо «слышит», `align.py` называет в предупреждении.

## Кэши и место

Модели лежат в `~/.cache/code-motion/` (другая папка: `CODE_MOTION_CACHE`; заданные снаружи `HF_HOME` и `TORCH_HOME` уважаются).

| что | размер | качается при первом |
|---|---|---|
| Chatterbox V3 (`hf/`) | 3.0 ГБ | `tts_chatterbox.py` |
| Whisper large-v3-turbo, mlx (`hf/`) | 1.5 ГБ | `check_takes.py` |
| wav2vec2 ru (`hf/`) / wav2vec2 en (`hf/`) | по 1.2 ГБ | `align.py` для ru / en |
| RUAccent (`ruaccent/`) | 0.5 ГБ | `tts_chatterbox.py --stress` |
| Kokoro-82M (`hf/`) | 0.3 ГБ | `tts_kokoro.py` |

Русский сценарий: около 6.2 ГБ (с ударениями), английский: около 3.0 ГБ, всё вместе 7.7 ГБ. Пакеты Python (torch и др.) uv держит отдельно
в `~/.cache/uv`: окружения по 0.1-1.1 ГБ на скрипт. Удалить кэш моделей: `rm -r ~/.cache/code-motion` (скрипты скачают заново).

## Лицензии моделей

| модель | лицензия | заметки |
|---|---|---|
| Chatterbox (Resemble AI) | MIT | в звук вшит неслышимый водяной знак PerTh, снимать его нельзя |
| Kokoro-82M | Apache-2.0 | английский |
| Qwen3-TTS | Apache-2.0 | в набор не входит, запасной вариант |
| Supertonic | OpenRAIL-M | требует помечать контент как созданный ИИ; в набор не входит |
| Silero ru | некоммерческая (CC BY-NC-SA 4.0) | для коммерческих роликов не годится; в набор не входит |
| wav2vec2 (ru: jonatasgrosman, en: facebook) | Apache-2.0 | выравнивание |
| Whisper large-v3-turbo | MIT | проверка дублей, нарезка живой записи (mlx-whisper, MIT) |
| Praat через parselmouth | GPL-3.0 | σF0 в `check_takes.py`, `prosody.py`; ставится uv при запуске, в навык не вшит |
| RUAccent | MIT | ударения |

## Если что-то не так

- `ОШИБКА: ... число слов`: см. раздел script.json, обе строки показаны рядом.
- Chatterbox медленный (около 1 токена/с): память забита, закройте тяжёлые приложения; лимиты MPS уже включены.
- Установка Chatterbox берёт код из GitHub (нужны `git` и сеть, коммит зафиксирован). При обрыве `curl 92 / HTTP/2` повторите запуск
  или `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.version GIT_CONFIG_VALUE_0=HTTP/1.1 uv run --script ...`.
- Слово в `words.json` стоит не там: проверьте `align` (как слово звучит) и сам дубль на слух; при `vo.phrases.json` рядом с wav каждая фраза
  выравнивается в своём окне, флаг `--global` выравнивает весь файл целиком.
