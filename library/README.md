# library — общие ассеты

В репозитории лежат только звуки (`sfx/`), список пакетов (`package.json`: шрифты и иконки — `npm i` в этой папке) и каталог 3D (`3d/README.md` со ссылками). 3D-модели, HDRI, текстуры и модель whisper скачиваются по ссылкам из каталога.

| Путь | Что это | Лицензия |
|---|---|---|
| `sfx/kenney/<пак>/` | 619 звуков Kenney, 8 паков: interface-sounds, ui-audio, impact-sounds, digital-audio, sci-fi-sounds, casino-audio, rpg-audio, music-jingles (ogg/wav + `License.txt` в каждом) | CC0 |
| `node_modules/@tabler/icons/icons/{outline,filled}/` | иконки Tabler, SVG | MIT |
| `node_modules/lucide-static/icons/` | иконки Lucide, ~2160 SVG | ISC |
| `node_modules/@phosphor-icons/core/assets/<стиль>/` | иконки Phosphor, 6 стилей | MIT |
| `node_modules/simple-icons/icons/` | логотипы брендов, ~3470 SVG (сами знаки — товарные знаки владельцев) | CC0 |
| `node_modules/@fontsource/<шрифт>/files/` | шрифты с кириллицей: geologica, golos-text, inter-tight, jost, manrope, oswald, russo-one, tektur | OFL-1.1 |
| `models/ggml-large-v3-turbo-q5_0.bin` | модель whisper.cpp для расшифровки речи (574 МБ) | MIT |
| `music/`, `lottie/` | пусто: место для музыки и Lottie-анимаций с лицензией | — |
| `3d/README.md` | каталог 3D-паков, текстур, HDRI и звуков к ним: оценки, лицензии, набор для ролика №3 | — |
| `3d/kenney__city-kit-commercial/` | 41 модель: дома, небоскрёбы, упрощённые дома для горизонта (GLB) | CC0 |
| `3d/kenney__city-kit-roads/` | 95 моделей: дороги, перекрёстки, фонари, светофоры, знаки (GLB) | CC0 |
| `3d/kenney__city-kit-suburban/` | 40 моделей: частные дома, заборы (GLB) | CC0 |
| `3d/kenney__city-kit-industrial/` | 37 моделей: склады, ангары, баки (GLB) | CC0 |
| `3d/kenney__car-kit/` | 50 моделей: машины без марок, колёса, обломки (GLB) | CC0 |
| `3d/kenney__nature-kit/` | 329 моделей природы, в т.ч. 6 пальм, камни, берег (GLB) | CC0 |
| `3d/quaternius__ultimate-modular-characters/` | 11 людей с 24 анимациями (Idle/Walk/Run…), glTF | CC0 |
| `3d/polypizza__palms/` | 6 пальм (GLB), авторы в `CREDITS.md` | CC0 + CC-BY 3.0 |
| `3d/polypizza__street-props/` | фонари, скамейка, урны, неоновые вывески, билборд (GLB) | CC0 + CC-BY 3.0 (билборд) |
| `3d/polypizza__small-plane/` | малый самолёт и 2 биплана (GLB), авторы в `CREDITS.md` | CC-BY 3.0 |
| `3d/microsoft__rocketbox/` | v2, герой: 2 парня в худи (реализм, ~7 тыс. треуг.) + 8 анимаций idle/walk/run, FBX + TGA | MIT |
| `3d/quaternius__downtown-city-megakit/` | v2: 153 модульные детали фасадов + 3 здания, glTF, PBR до 2K | CC0 |
| `3d/polypizza__city-buildings/` | v2: отель и 3 дома с карнизами (GLB) | CC-BY 3.0 |
| `3d/polypizza__cars-v2/` | v2: 10 машин без марок, детальнее Kenney (GLB) | CC0 + CC-BY 3.0 (кабриолет) |
| `3d/polypizza__palms-v2/` | v2: 5 пальм, кусты, изгородь (GLB) | CC-BY 3.0 + CC0 |
| `3d/opengameart__exotic-palms/` | v2: 5 пальм с отдельными перьями, FBX | CC0 |
| `3d/polypizza__beach-props/` | v2: пляжные зонты, шезлонги, вышка спасателей, зонт кафе, навес (GLB) | CC-BY 3.0 |
| `3d/polypizza__street-props-v2/` | v2: американские светофоры, фонарный столб (GLB) | CC0 + CC-BY 3.0 |
| `hdri/polyhaven__night/` | 3 ночные HDRI 2K: blue_lagoon_night, kloppenheim_02_puresky, shanghai_bund | CC0 |
| `textures/ambientcg__Asphalt025C/`, `…Asphalt025B/`, `…Asphalt024C/` | мокрый асфальт PBR, 2K/1K/1K | CC0 |
| `textures/polyhaven__concrete-floor-worn-001/` | бетон PBR 2K | CC0 |
| `textures/polyhaven__large-square-pattern-01/` | плитка тротуара PBR 2K | CC0 |
| `textures/threejs__waternormals/` | карта нормалей воды из three.js | MIT |
| `sfx/opengameart__air-whoosh/`, `sfx/opengameart__swishes/` | вжух 5 с + 13 коротких свишей | CC0 |
| `sfx/opengameart__propeller-cartoon-loop/` | петля мотора винтового самолёта | CC0 |
| `sfx/wikimedia__hdd/` | щелчки и раскрутка жёсткого диска, авторы в `CREDITS.md` | CC0 / PD / CC-BY 4.0 |
| `package.json` | список npm-пакетов библиотеки | — |

Ещё шрифты: Rubik, Onest, Unbounded — в `lab/node_modules/@fontsource/` и `lab/assets/fonts/`.
Базовый набор из 13 звуков (pop, tick, click, ding, whoosh, scribble) — в навыке:
`~/.claude/skills/code-motion/assets/sfx/`.
