# SFX для code-motion (CC0)

Короткие звуки для `scripts/audio/mix.py`. По умолчанию mix.py берёт эту папку (`../../assets/sfx` от скрипта), `--sfx-dir DIR` подменяет её.

Всё здесь под CC0 1.0 (Creative Commons Zero, http://creativecommons.org/publicdomain/zero/1.0/), автор Kenney (kenney.nl). Можно использовать в личных и коммерческих проектах и раздавать вместе со скиллом; указывать автора не обязательно (в `License.txt` паков: credit would be nice but is not mandatory).

**Звуки на слух не проверялись**: подбор по метрикам (`sfx_analyze.py`) и спектрограммам, вердикт за человеком.

Набор — только физические звуки мира: удар, бумага, воздух, «бум», механика. Интерфейсных (pop, ding, click, tick, свисты и писки
из наборов Interface/UI) здесь нет и не будет: даже записанные, на слух они детские и мультяшные (см. `references/audio.md` §6).

| Файл | Длит., с | Класс: где ставить | Источник | Ссылка |
|---|---|---|---|---|
| `hit_1.wav` | 0.093 | hit: лёгкий деревянный стук — появление предмета, посадка | Impact Sounds, `impactWood_light_002` | https://kenney.nl/assets/impact-sounds |
| `hit_2.wav` | 0.190 | hit: стук плотнее и ниже | Impact Sounds, `impactWood_medium_001` | https://kenney.nl/assets/impact-sounds |
| `thud_1.wav` | 0.385 | thud: мягкий тяжёлый удар — финальный акцент, крупный предмет | Impact Sounds, `impactSoft_heavy_000` | https://kenney.nl/assets/impact-sounds |
| `thud_2.wav` | 0.278 | thud: глухой удар с телом | Impact Sounds, `impactPunch_heavy_002` | https://kenney.nl/assets/impact-sounds |
| `paper_1.wav` | 0.190 | paper: книга/карточка легла на стол — плашка, карточка | RPG Audio, `bookPlace1` | https://kenney.nl/assets/rpg-audio |
| `paper_2.wav` | 0.223 | paper: то же, мягче | RPG Audio, `bookPlace2` | https://kenney.nl/assets/rpg-audio |
| `paper_3.wav` | 0.203 | paper: карта на сукно, светлее | Casino Audio, `card-place-1` | https://kenney.nl/assets/casino-audio |
| `whoosh_1.wav` | 0.448 | whoosh: мягкий воздух — перелёт камеры, уход сцены (приближение) | Casino Audio, `cards-pack-take-out-1`, фильтр | https://kenney.nl/assets/casino-audio |
| `whoosh_2.wav` | 0.434 | whoosh: то же, ровнее (приближение) | Casino Audio, `cards-pack-take-out-2`, фильтр | https://kenney.nl/assets/casino-audio |
| `whoosh_3.wav` | 0.474 | whoosh: низкий порыв воздуха без тона | Sci-Fi Sounds, `thrusterFire_001`, окно 0,5 с, фильтр | https://kenney.nl/assets/sci-fi-sounds |
| `scribble_1.wav` | 0.507 | scribble: росчерк — рисующаяся линия (приближение) | RPG Audio, `cloth1`, фильтр | https://kenney.nl/assets/rpg-audio |
| `scribble_2.wav` | 0.355 | scribble: короче и ровнее (приближение) | RPG Audio, `cloth4`, фильтр | https://kenney.nl/assets/rpg-audio |
| `boom_1.wav` | 0.658 | boom: низкий «бум» — главный удар ролика, 1–2 раза на ролик | Sci-Fi Sounds, `lowFrequency_explosion_001` | https://kenney.nl/assets/sci-fi-sounds |
| `boom_2.wav` | 1.272 | boom: длиннее, с хвостом (следи за следующей склейкой) | Sci-Fi Sounds, `lowFrequency_explosion_000`, окно 1,6 с | https://kenney.nl/assets/sci-fi-sounds |
| `mech_1.wav` | 0.112 | mech: металлическая защёлка — переключатель, фиксация | RPG Audio, `metalLatch`, хвост подрезан | https://kenney.nl/assets/rpg-audio |
| `mech_2.wav` | 0.092 | mech: металлический щелчок механизма | RPG Audio, `metalClick`, окно 0,1 с | https://kenney.nl/assets/rpg-audio |

**whoosh_1/2 и scribble — приближения.** Готовых мягких whoosh и росчерков пера у Kenney нет: это foley-шум (достают колоду карт из
упаковки; шорох ткани), пропущенный через `sfx_make.py` (фильтры и фейды), выбран по метрикам и спектрограммам. Если на слух не подходят,
замените их (раздел ниже) или удалите файлы и записи из `meta.json`: тогда mix.py пропустит такие события с предупреждением.

## Формат

48 кГц, моно, WAV PCM 32 бит (24-битное разрешение). Тишина обрезана по -45 dB, края с косинусными фейдами, громкость нормализована по самому громкому окну 200 мс (RMS -26 dBFS, пик не выше -3 dBFS).

`meta.json` по ключу `имя_файла_без_wav`. mix.py читает из него `e200_db` (уровень самого громкого окна 200 мс, dB) и `peak_db` (пик, dB); остальное справка: `dur`, `centroid_hz`, `hf4k_pct` (доля энергии выше 4 кГц), `source`, `license`, `url`, у приближений ещё `note`. Звук без записи в `meta.json` mix.py измеряет сам.

Рецепт каждого звука (исходный файл, фильтры, фейды, источник) лежит в `sfx_spec.json`; весь набор пересобирается из исходников: скачайте паки Kenney (ссылки в таблице), распакуйте в одну папку (подпапки можно оставить) и запустите `uv run --script ../../scripts/audio/sfx_make.py <папка с ogg> <куда> --spec sfx_spec.json`.

Имя в `events.json` это класс без номера: `whoosh` по очереди берёт `whoosh_1`, `whoosh_2`... и не повторяет вариант подряд, `whoosh_2` задаёт вариант. Поправки громкости классов в mix.py: hit 0, thud -1, paper -2, whoosh -2, scribble -3, boom -2, mech -4 dB; у остальных имён 0.

**Длина звука — не дальше следующей склейки.** Хвост, который тянется в следующую сцену, звучит посторонним. Если фильм выставляет `window.CUTS` (времена склеек), `render.mjs events` кладёт их в `events.json`, и mix.py предупреждает о каждом звуке, заходящем за следующую склейку; длинный звук режьте при подготовке (`maxdur`, `fout` в spec).

## Почему здесь нет звуков Mixkit

Mixkit Sound Effects Free License (https://mixkit.co/license/#sfxFree) разрешает использовать звуки в видео, но запрещает раздавать сами файлы отдельно, поэтому в скилл они не входят. Скачайте их в свой проект и подключите так же, как любые свои записи.

## Как добавить звуки Mixkit или свои

1. **Скачать в проект**, не в скилл: например в `audio/sfx_src/`. Превью Mixkit-звука лежит по адресу `https://assets.mixkit.co/active_storage/sfx/<id>/<id>-preview.mp3`. Без curl и wget:
   ```
   ffmpeg -v error -i https://assets.mixkit.co/active_storage/sfx/168/168-preview.mp3 -c copy audio/sfx_src/168-preview.mp3
   python3 -I -c "import sys, urllib.request; urllib.request.urlretrieve(sys.argv[1], sys.argv[2])" <url> <файл>
   ```
2. **Если нужны и звуки по умолчанию**, скопируйте их в папку проекта: `--sfx-dir` заменяет папку целиком, а не дополняет.
   ```
   mkdir -p audio/sfx && cp <скилл>/assets/sfx/*.wav <скилл>/assets/sfx/meta.json audio/sfx/
   ```
3. **Прогнать `sfx_make.py`**: исходники на вход, папка SFX на выход; существующий `meta.json` дополняется.
   - Без spec каждый файл становится звуком с именем файла, назовите его по схеме `<класс>_<n>` (`whoosh_4.mp3`):
     ```
     uv run --script <скилл>/scripts/audio/sfx_make.py audio/sfx_src audio/sfx --license "Mixkit Sound Effects Free License" --url https://mixkit.co/free-sound-effects/
     ```
   - Со spec можно задать окно, фильтры, фейды и источник (`--spec spec.json`):
     ```json
     {
      "whoosh_4": {"src": "168-preview.mp3", "maxdur": 0.58, "fin": 0.02, "fout": 0.15, "hp": 90, "lp": 9000,
                   "source": "Mixkit SFX #168 Fast air sweep transition",
                   "license": "Mixkit Sound Effects Free License", "url": "https://mixkit.co/free-sound-effects/"}
     }
     ```
     `maxdur` оставляет самое энергичное окно такой длины, `fin`/`fout` косинусные фейды (с), `hp`/`lp` фильтры 2-го порядка (Гц).
4. **Проверить цифры**: `uv run --script <скилл>/scripts/audio/sfx_analyze.py audio/sfx/*.wav` (длительность, пик, центроид, доля выше 4 кГц, атака, хвост). Как звучит, решает человек.
5. **Указать папку** при сведении: `mix.py ... --sfx-dir audio/sfx`.

Mixkit-звуки, которые уже пробовали (все из превью-mp3, на слух не проверялись; опции `sfx_make.py` подобраны под них):

| Класс | Mixkit ID | Название | Опции |
|---|---|---|---|
| whoosh | 168 | Fast air sweep transition | `maxdur` 0.58, `fin` 0.02, `fout` 0.15, `hp` 90, `lp` 9000 |
| whoosh | 1461 | Short wind swoosh | `maxdur` 0.45, `fin` 0.015, `fout` 0.09, `hp` 90, `lp` 9000 |
| whoosh | 2608 | Air zoom vacuum | `maxdur` 0.45, `fin` 0.015, `fout` 0.10, `hp` 90, `lp` 9000 |
| scribble | 2367 | Writing with a pen on paper | `maxdur` 0.68, `fin` 0.008, `fout` 0.06, `hp` 150, `lp` 9000 |
| scribble | 2369 | Writing scribble on paper | `maxdur` 0.58, `fin` 0.008, `fout` 0.08, `hp` 150, `lp` 9000 |
