# Сторонние компоненты и лицензии

Наш код, навыки и тексты — MIT (`LICENSE`). Ниже — чужое, что лежит в репозитории или ставится из npm.

| Что | Где | Лицензия |
|---|---|---|
| three.js r170 | `examples/07-claude-montazh/js/vendor/three.js` (CJS-сборка, обёрнута для `file://`), npm `three` | MIT |
| rough.js | `*/js/vendor/rough.js` | MIT |
| Shiki, Playwright | npm, только на этапе сборки и рендера | MIT / Apache-2.0 |
| Шрифты Rubik, Onest, Unbounded, Oswald, Playfair Display, JetBrains Mono, Excalifont | `*/assets/fonts/`, npm `@fontsource/*` | OFL-1.1 |
| Звуки Kenney | `library/sfx/kenney/`, `.claude/skills/code-motion/assets/sfx/` | CC0 |
| Звуки OpenGameArt, Wikimedia | `library/sfx/opengameart__*`, `library/sfx/wikimedia__hdd/` (авторы — `CREDITS.md` в папках) | CC0 / PD / CC-BY 4.0 |
| 3D-модели Kenney, Quaternius, Poly Pizza | `examples/03-gta6-open-world/assets/3d/` (лицензии и авторы — файлы `LICENSE-*` рядом) | CC0 / CC-BY 3.0 |
| Голосовые модели (Chatterbox, Kokoro, Whisper) | скачиваются при первом запуске (`.claude/skills/code-motion/scripts/voice/README.md`) | см. там |
| Репозитории в `refs/repos/` | подмодули-ссылки, код хранится у авторов | у каждого своя — `refs/README.md` |

Часть правил «хорошего ролика» в навыке `code-motion` — пересказ своими словами открытых наборов
latent-spaces/brag (MIT) и heygen-com/hyperframes (Apache-2.0).

Музыки, голоса автора и кадров из чужих роликов в репозитории нет.
