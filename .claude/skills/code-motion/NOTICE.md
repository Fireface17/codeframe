# Сторонние компоненты

| Что | Где | Лицензия |
|---|---|---|
| rough.js | ставится из npm (`roughjs`), копируется в `js/vendor/` при развёртывании | MIT |
| Shiki | npm, только на этапе сборки (`tools/tokens.mjs`) | MIT |
| Playwright | npm | Apache-2.0 |
| Rubik | npm `@fontsource/rubik` | OFL-1.1 |
| JetBrains Mono | npm `jetbrains-mono` | OFL-1.1 |
| Excalifont | собирается из npm `@excalidraw/excalidraw` (`tools/excalifont.py`), только внутри проекта | OFL-1.1 |
| Иконки Tabler (если используются) | npm `@tabler/icons` | MIT |
| three.js (если `--3d`) | ставится из npm (`three@0.170.0`), оборачивается в `js/vendor/three.js` внутри проекта | MIT |
| esbuild (если нужна своя сборка three.js) | npx, только на этапе сборки | MIT |
| Звуки в `assets/sfx/` | Kenney (kenney.nl): Impact Sounds, RPG Audio, Casino Audio, Sci-Fi Sounds | CC0 |
| mlx-whisper (распознавание живой записи и дублей) | ставится uv при запуске скрипта | MIT |
| Praat через parselmouth (`praat-parselmouth`: σF0 в `check_takes.py`, `prosody.py`) | ставится uv при запуске скрипта, в навык не вшит и не распространяется | GPL-3.0 |
| Голосовые модели | скачиваются при первом запуске (см. `scripts/voice/README.md`) | см. там |

Правила «законов хорошего ролика» частично основаны на открытых наборах:
latent-spaces/brag (MIT) и heygen-com/hyperframes (Apache-2.0) — пересказ своими словами.

Код навыка не включает исходники GPL-зависимостей: `praat-parselmouth` скачивается менеджером uv в отдельное
окружение при первом запуске скрипта, который его использует (зависимость записана в шапке файла по PEP 723).
