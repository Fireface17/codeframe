# Референсы: 191 репозиторий

Чужие репозитории подключены **подмодулями**: в нашем репозитории хранится только ссылка на оригинал и точный коммит, сам код живёт у авторов.
Нажми на папку в `refs/repos/` — попадёшь в оригинал.

**Как скачать себе:**
- нужные группы, только полезные папки (быстро): `node tools/refs.mjs sync A` (главные 8), `sync B`, `sync <id>`; список — `node tools/refs.mjs list`;
- один репозиторий целиком: `git submodule update --init --depth 1 refs/repos/<id>`;
- всё сразу: `git submodule update --init --depth 1` — **несколько гигабайт**.

**Лицензии.** «Публичный» не значит «свободный». Колонка «Код» — можно ли брать код в свои работы: ✅ — да, по лицензии; 👀 — только смотреть и учиться (нет лицензии, некоммерческая, «all rights reserved» и т. п.).

## A — главные: системы и правила видео кодом для агентов (8)

| Репозиторий | Лицензия | Код | Что брать |
|---|---|---|---|
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | Apache-2.0 | ✅ | каталог ~150 блоков (registry: переходы, титры, субтитры, данные), 21 скилл (тайминг, анимация, субтитры), правила детерминизма и проверки |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | нет LICENSE | ✅ | официальные Agent Skills Remotion: ~36 тем (тайминг, переходы, озвучка, звук, эффекты), субтитры по словам |
| [howseen-ai/claude-motion-design](https://github.com/howseen-ai/claude-motion-design) | MIT | ✅ | HTML + Playwright + ffmpeg, seek(t), пружины в замкнутой форме, motion blur подкадрами, поиск вспышек в 1 кадр и шва петли — сверить со своим движком |
| [echris6/motion-video-kit](https://github.com/echris6/motion-video-kit) | MIT | ✅ | references/: motion-grammar (6 правил, 16 механизмов, темп в цифрах), промпты критика, quality-bar; скрипты frozen-time, loudness, contact-sheet |
| [Tejashmakwana/motionmaxxing](https://github.com/Tejashmakwana/motionmaxxing) | Apache-2.0 | ✅ | 25 примет «ИИ-слопа», lint.mjs, проверки G0–G5 (look.py), library/moments.jsonl (716 удачных моментов), taste/ |
| [latent-spaces/brag](https://github.com/latent-spaces/brag) | MIT | ✅ | skills/brag (references, scripts), slim.md — версия под Opus 5.5; examples/ — бенчмарк |
| [iart-ai/motion-skills](https://github.com/iart-ai/motion-skills) | MIT | ✅ | 55 навыков, ключевой javascript-animation (кадр — функция времени); kinetic-typography, explainer, lower-thirds, b-roll под слова |
| [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) | Apache-2.0 | ✅ | ~150 рецептов шотов с кодом (axis-rescale shock, beat freeze cut и др.) |

## B — дополнительные: стили, процессы, шаблоны (18)

| Репозиторий | Лицензия | Код | Что брать |
|---|---|---|---|
| [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | MIT (демо CC BY 4.0) | ✅ | 51 стилевой промпт styles/*/STYLE.md для фильмов кодом с Opus 5.5; DIRECTOR.md, TECHNIQUE.md |
| [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) | AGPL-3.0 | ✅ | AGENT_GUIDE.md, skills/meta (ревьюер, контрольные точки), pipeline_defs/*.yaml, styles/ |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | Remotion License | ✅ | spring/interpolate, морфинг путей, шум, motion blur, переходы — как устроено; skills-evals — как тестируют скиллы |
| [digitalsamba/claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit) | MIT | ✅ | .claude/skills (ffmpeg, playwright-recording), команда /scene-review, lib/transitions (glitch, zoomBlur, lightLeak) |
| [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) | MIT | ✅ | тайминг, easing, хореография, 12 принципов Disney |
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | ✅ | официальные скиллы GSAP: таймлайн, position-параметр, метки — словарь хореографии |
| [RenderComp/free-remotion-templates](https://github.com/RenderComp/free-remotion-templates) | MIT | ✅ | 50 шаблонов: logo stroke draw, scramble, shatter, bar race, starfield, персонаж — приёмы переносимы |
| [degueba/onda](https://github.com/degueba/onda) | MIT | ✅ | счётчики, барабан цифр, компоненты данных |
| [kapishdima/remocn](https://github.com/kapishdima/remocn) | MIT | ✅ | ~395 компонентов: фоны (mesh, aurora, grain), текстовые эффекты |
| [reactvideoeditor/remotion-templates](https://github.com/reactvideoeditor/remotion-templates) | MIT (по README) | ✅ | 81 шаблон: логотипы, тексты, переходы |
| [vincentsch/explainroo](https://github.com/vincentsch/explainroo) | MIT | ✅ | доска с rough.js: камера наезжает на описываемое, элементы по таймстампам слов (Kokoro + Whisper) |
| [ythx-101/live-panel-skill](https://github.com/ythx-101/live-panel-skill) | MIT (кроме реплик чужих дизайнов) | ✅ | архитектурные панели: пакеты бегут по линиям, окно window.seek(t) |
| [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) | MIT | ✅ | персонаж Clawd на p5.brush, 31 эмоция — как строить живого героя |
| [remotion-dev/template-tiktok](https://github.com/remotion-dev/template-tiktok) | Remotion License | ✅ | субтитры по словам из Whisper — стиль и разбивка |
| [remotion-dev/template-prompt-to-motion-graphics-saas](https://github.com/remotion-dev/template-prompt-to-motion-graphics-saas) | Remotion License | ✅ | src/skills/ — подбор скиллов под промпт |
| [yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) | MIT | ✅ | 703 промпта роликов, сделанных с Opus 5.5 — банк идей |
| [athemeroy/awesome-opus-5-5-videos](https://github.com/athemeroy/awesome-opus-5-5-videos) | CC BY 4.0 | ✅ | каталог роликов Opus 5.5 с промптами |
| [zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills) | NOASSERTION | ✅ | 318 репозиториев видео-скиллов для Claude с пометками риска |

## K — коллекция готовых работ для вдохновения и разбора (71)

| Репозиторий | Лицензия | Код | Что брать |
|---|---|---|---|
| [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | MIT | ✅ | генераторы анимации, не поддерживается с 2024 |
| [mifi/editly](https://github.com/mifi/editly) | MIT | ✅ | декларативный монтаж на ffmpeg (не обновляется с 05.2025) |
| [heygen-com/hyperframes-launches](https://github.com/heygen-com/hyperframes-launches) | Apache-2.0 (код; медиа/шрифты/бренды — не покрыты) | ✅ | покадровая структура сцен, раскадровка → compositions/, переходы и типографика продакшен-уровня; медиа лежат в LFS, их не тянуть |
| [magicuidesign/magicui](https://github.com/magicuidesign/magicui) | MIT | ✅ | текстовые reveal/hyper-text/word-rotate, shine/border-beam, animated-beam для схем, number-ticker |
| [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits) | MIT + Commons Clause | 👀 | Split/Blur/Decrypted/Shiny text, шейдерные фоны (Aurora, Silk, Iridescence) как подложки сцен; использовать в роликах можно, перепродавать компоненты — нет |
| [juliangarnier/anime](https://github.com/juliangarnier/anime) | MIT | ✅ | stagger-сетки и сплит текста по буквам, рисование линий SVG (createDrawable), морфинг путей, seek по таймлайну для детерминированного рендера |
| [ibelick/motion-primitives](https://github.com/ibelick/motion-primitives) | MIT | ✅ | текстовые пресеты (blur-in по словам, scramble, морф текста), sliding number для цифр, progressive blur, кастомный курсор |
| [codrops/KineticTypePageTransition](https://github.com/codrops/KineticTypePageTransition) | MIT | ✅ | кинетический текстовый вайп как переход между сценами (GSAP-таймлайн по строкам) |
| [codrops/TypeShuffleAnimation](https://github.com/codrops/TypeShuffleAnimation) | MIT | ✅ | эффект «расшифровки» заголовков и цифр, крошечный код без зависимостей |
| [mojs/mojs](https://github.com/mojs/mojs) | MIT | ✅ | бёрсты/конфетти/«лайк»-всплески как акценты на клики и появление элементов |
| [codrops/OnScrollTypographyAnimations](https://github.com/codrops/OnScrollTypographyAnimations) | MIT | ✅ | привязку прогресса к времени вместо скролла: 3D-повороты букв, разлёт, blur-reveal строк |
| [pqoqubbw/icons](https://github.com/pqoqubbw/icons) | MIT | ✅ | готовые микроанимации иконок для explainer-ов и UI-сцен |
| [tholman/cursor-effects](https://github.com/tholman/cursor-effects) | MIT (по README, файла LICENSE нет; API: null) | ✅ | шлейфы/частицы за курсором в UI-демо и промо |
| [gl-transitions/gl-transitions](https://github.com/gl-transitions/gl-transitions) | MIT (у отдельных переходов своя лицензия в шапке файла) | ✅ | весь каталог .glsl — подключать в WebGL/Remotion/ffmpeg; перед использованием проверять license в шапке каждого файла |
| [scriptituk/xfade-easing](https://github.com/scriptituk/xfade-easing) | MIT | ✅ | готовые expr-файлы для transition=custom — шейдерные переходы прямо в ffmpeg без пересборки |
| [vysmodev/vysmo](https://github.com/vysmodev/vysmo) | MIT | ✅ | свежая компактная альтернатива gl-transitions с HDR-мультипасс эффектами; молодой проект — проверять качество |
| [pixijs/filters](https://github.com/pixijs/filters) | MIT | ✅ | шейдеры glitch / old film (пыль, царапины, виньетка) / CRT / shockwave — основа для glitch- и film-переходов |
| [codrops/SlideshowAnimations](https://github.com/codrops/SlideshowAnimations) | MIT | ✅ | готовые переходы «кадр → кадр» на чистом HTML: маски, сдвиги слоёв, WebGL-дисторсии |
| [7PH/powerglitch](https://github.com/7PH/powerglitch) | MIT | ✅ | CSS-glitch (слайсы, сдвиг, тряска), который детерминированно рендерится в headless-браузере |
| [robin-dela/hover-effect](https://github.com/robin-dela/hover-effect) | MIT | ✅ | displacement-переход с разными картами — универсальный «жидкий» переход между кадрами |
| [fand/vfx-js](https://github.com/fand/vfx-js) | MIT | ✅ | наложить шейдер (glitch/RGB/пикселизация) на DOM-текст и картинки в HTML-сцене |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | Zlib | ✅ | шейдеры glitch/хроматическая аберрация/зерно/скан-линии для WebGL-сцен |
| [codrops/PixelTransition](https://github.com/codrops/PixelTransition) | MIT | ✅ | пиксельный/мозаичный вайп на DOM-сетке + GSAP stagger, без WebGL |
| [av/remotion-bits](https://github.com/av/remotion-bits) | MIT (по README; API: null) | ✅ | компоненты-переходы и текстовые reveal под Remotion; есть skill для агентов |
| [paper-design/shaders](https://github.com/paper-design/shaders) | Apache-2.0 | ✅ | Фоны и логотипные эффекты для промо: mesh gradient, grain gradient, liquid metal, halftone. Чистые фрагментные шейдеры от u_time, так что кадр — функция времени без накопления сост |
| [mattdesl/canvas-sketch](https://github.com/mattdesl/canvas-sketch) | MIT | ✅ | Модель скетча: render({playhead, time, frame}) + duration/fps, экспорт кадров, сидированный random из canvas-sketch-util. Эталон «кадр = f(t)», примеры петель и шейдерных скетчей |
| [shader-park/shader-park-core](https://github.com/shader-park/shader-park-core) | MIT | ✅ | Быстро собрать органические 3D-формы и blob-логотипы через raymarching. Анимация через time в шейдере, детерминированно. Таргеты есть для three.js и чистого WebGL |
| [ruucm/shadergradient](https://github.com/ruucm/shadergradient) | MIT (указана в README, файла LICENSE в корне нет) | ✅ | «Дорогой» фон промо-ролика: градиент на деформированной геометрии с grain. Ядро — R3F + шейдер с uTime, детерминированно |
| [LingDong-/shan-shui-inf](https://github.com/LingDong-/shan-shui-inf) | MIT | ✅ | Генеративное SVG: горы, деревья, штрихи кистью. Сид → SVG, панорамирование камерой по t. Хорошо сочетается с прорисовкой stroke-dashoffset. Похожее у того же автора: LingDong-/fish |
| [patriciogonzalezvivo/thebookofshaders](https://github.com/patriciogonzalezvivo/thebookofshaders) | Собственная, «All rights reserved» (API: NOASSERTION) | 👀 | ТОЛЬКО СМОТРЕТЬ: LICENSE запрещает копировать, хостить и использовать в любых проектах. Учиться приёмам (shaping functions, fbm, domain warping) и писать своё |
| [anvaka/fieldplay](https://github.com/anvaka/fieldplay) | MIT | ✅ | Flow field с шлейфами частиц. ВНИМАНИЕ: позиции и шлейфы копятся от кадра к кадру. Для ролика либо рендер подряд с фиксированным dt и сидом, либо считать траектории аналитически |
| [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) | MIT | ✅ | Цветной дым и чернила для переходов и фонов. Симуляция с состоянием: нужен фиксированный dt и сценарные «мазки» вместо мыши, рендер строго подряд |
| [piellardj/reaction-diffusion-webgl](https://github.com/piellardj/reaction-diffusion-webgl) | MIT | ✅ | Органическое прорастание узора поверх логотипа или фото. Накопительная симуляция: фиксированный шаг, рендер подряд. Альтернатива: pmneila/jsexp (BSD-3) |
| [kgolid/p5ycho](https://github.com/kgolid/p5ycho) | MIT | ✅ | Процедурные паттерны и композиции на сетке, сидированные. Большинство статичны, анимировать раскрытием по t. Палитры брать из kgolid/chromotome (MIT) |
| [patriciogonzalezvivo/lygia](https://github.com/patriciogonzalezvivo/lygia) | Prosperity Public License 3.0.0 (API: NOASSERTION) | 👀 | ТОЛЬКО СМОТРЕТЬ: бесплатно лишь некоммерческое использование, для коммерции 30-дневный триал и платная лицензия. MIT-замена для шума: ashima/webgl-noise (MIT, 3k★) |
| [terkelg/awesome-creative-coding](https://github.com/terkelg/awesome-creative-coding) | CC0-1.0 (в README, в API null) | ✅ | Только как индекс для поиска новых референсов. Кода нет |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | MIT | ✅ | Справочник приёмов: webgl_postprocessing_*, webgl_gpgpu_*, webgl_geometry_text*, webgpu_tsl_*. Брать примеры без моделей, текстур и звуков. Анимации через clock легко перевести на  |
| [pmndrs/examples](https://github.com/pmndrs/examples) | MIT | ✅ | Готовые hero-сцены для промо. Брать отдельные папки демо. Внешние ассеты (модели, HDRI) лицензируются отдельно, их список в pmndrs.json каждого демо |
| [pmndrs/drei](https://github.com/pmndrs/drei) | MIT | ✅ | Готовые материалы и эффекты для hero-сцены: стекло, искажение, искры, 3D-текст. Float, Sparkles и Distort завязаны на clock: в рендере подменять время на t |
| [theatre-js/theatre](https://github.com/theatre-js/theatre) | Apache-2.0 (@theatre/core); @theatre/studio — AGPL-3.0 | ✅ | Ключевой для детерминизма: sequence.position = t даёт кадр как функцию времени, ключи лежат в JSON. В сборку идёт только core (Apache). Публичная разработка временно на паузе |
| [spite/looper](https://github.com/spite/looper) | MIT | ✅ | Идеальный формат под ролик: draw(t) без накопления состояния, бесшовные петли. Брать шейдеры и паттерны из loops/ и shaders/. Демо только в Chrome |
| [edankwan/The-Spirit](https://github.com/edankwan/The-Spirit) | MIT | ✅ | Curl-noise частицы для hero-фона. Симуляция в FBO копит состояние: фиксированный dt и рендер подряд, либо аналитический curl-noise от (p0, t). Код старый (three r7x) |
| [ykob/sketch-threejs](https://github.com/ykob/sketch-threejs) | MIT (часть ассетов исключена: water, glass, skull, crystal, newyear2019, buddha) | ✅ | Вершинные анимации и шейдерные материалы, почти все на uniform time, то есть детерминированно. Репо больше не обновляется, новое у автора в ykob/threejs-experiments |
| [protectwise/troika](https://github.com/protectwise/troika) | MIT | ✅ | Чёткая кинетическая 3D-типографика: текст в сцене, побуквенная анимация через шейдер. Детерминированно |
| [boytchev/tsl-textures](https://github.com/boytchev/tsl-textures) | MIT | ✅ | Процедурные материалы без файлов текстур, подход актуального three.js. Есть пример texture-in-motion. Параметры и время задаются явно |
| [oframe/ogl](https://github.com/oframe/ogl) | Unlicense (в API null) | ✅ | Лёгкая альтернатива three.js для ролика. Примеры flowmap, MSDF-текста и particles читаются за минуты. Public domain |
| [codrops/WebGLBlobs](https://github.com/codrops/WebGLBlobs) | MIT | ✅ | Вершинная анимация шумом в вертекс-шейдере с uniform time, детерминированно. Типовой «живой blob» для промо. Есть туториал на tympanus.net/codrops/?p=52932 |
| [vizzuhq/vizzu-lib](https://github.com/vizzuhq/vizzu-lib) | Apache-2.0 | ✅ | Главный приём для инфографики в ролике: переход между состояниями данных как один непрерывный морф; цепочка animate() = раскадровка сцен |
| [apache/echarts-examples](https://github.com/apache/echarts-examples) | Apache-2.0 | ✅ | bar-race.ts (realtimeSort + animationDurationUpdate) и примеры universalTransition как готовые сцены; заголовки файлов уже содержат videoStart/videoEnd |
| [visgl/deck.gl](https://github.com/visgl/deck.gl) | MIT | ✅ | Анимированная карта как функция времени: currentTime + trailLength = детерминированный кадр; брать только пример trips и слой |
| [takanori-fujiwara/d3-gallery-javascript](https://github.com/takanori-fujiwara/d3-gallery-javascript) | BSD-3-Clause | ✅ | Готовые vanilla-JS исходники bar chart race, animated treemap, zoomable sunburst и пр. — проще встроить в кадровый рендер, чем ноутбуки Observable |
| [veltman/flubber](https://github.com/veltman/flubber) | MIT | ✅ | interpolate(a,b)(t) — чистая функция времени; приём «регион карты превращается в столбик» и прочие переходы карта↔диаграмма |
| [hatemhosny/racing-bars](https://github.com/hatemhosny/racing-bars) | MIT | ✅ | Типографика и раскладка гонки (счётчик даты, подписи на/вне столбца, иконки); для кадрового рендера — управлять через API/события, а не автоплей |
| [visgl/flowmap.gl](https://github.com/visgl/flowmap.gl) | Apache-2.0 | ✅ | Визуальный язык «потоков между городами»: толщина/цвет стрелок + бегущие частицы по линиям |
| [russellgoldenberg/scrollama](https://github.com/russellgoldenberg/scrollama) | MIT | ✅ | Модель «шаг + progress 0..1» напрямую переносится в ролик: заменить скролл на время — получится раскадровка сцен с внутренним прогрессом |
| [the-pudding/svelte-starter](https://github.com/the-pudding/svelte-starter) | MIT | ✅ | Структура data-story (Scrolly + LayerCake-чарты); логотипы и шрифты Pudding не брать — это прямо запрещено в README |
| [uwdata/gemini](https://github.com/uwdata/gemini) | BSD-3-Clause | ✅ | Методика стейджинга перехода (сначала оси, потом метки, потом пересортировка) — готовые правила тайминга для анимации диаграмм |
| [keplergl/kepler.gl](https://github.com/keplergl/kepler.gl) | MIT | ✅ | Стили слоёв (3D-гексагоны, дуги, тёмные базовые карты) как референс для анимированных карт; сам инструмент — для быстрых прототипов |
| [mhkeller/layercake](https://github.com/mhkeller/layercake) | MIT | ✅ | Галерея компонентов (линии, площади, бейсворм, карты) — чистые SVG-шаблоны, которые легко анимировать по t |
| [ledbetterljoshua/functional-emotions-video](https://github.com/ledbetterljoshua/functional-emotions-video) | MIT | ✅ | Брашстрок-рендерер (мазки берут цвет из плоского подмалёвка и ориентируются по краям) + ANIMATION_GUIDE/STORYBOARD + check.mjs; кадр = функция времени песни |
| [JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) | нет | 👀 | Только смотреть: структура глав src/ch/*, ANIMATION_GUIDE.md, STORYBOARD.md; лицензионная база — уже собранный ClaudeAnimationBase (MIT) |
| [xdis/opus-video-studio](https://github.com/xdis/opus-video-studio) | MIT | ✅ | Ближе всего к задаче: explainer с цифрами/графиками по window.draw(t), проверка check_video.py; works/ — готовые пары исходник+mp4 |
| [alexgreensh/anidoodle](https://github.com/alexgreensh/anidoodle) | Apache-2.0 | ✅ | Штрихи в порядке, как рисует человек (draw-on), seeded RNG, музыка как данные и синтез кодом; canvas-core/character — риг персонажей |
| [EGSECDA/vocaloid-style-mv-pipeline](https://github.com/EGSECDA/vocaloid-style-mv-pipeline) | MIT (кадры/песня примера — нет) | ✅ | Кинетическая типографика под тайминг слов, трёхслойная композиция + WebGL-пост, параллельные воркеры по кадрам |
| [francozanardi/papermotion](https://github.com/francozanardi/papermotion) | MIT | ✅ | Риги на пружинах вместо ключей, фиксированный шаг + seeded random, звук привязан к событиям (шаг = стук); всего 0,4 МБ |
| [WinterArc21/Battle-of-Austerlitz-Film](https://github.com/WinterArc21/Battle-of-Austerlitz-Film) | нет | 👀 | Только смотреть: «анимированная карта-документалка» — рельеф + Kuwahara + звук, выведенный из кадра; 89 МБ из 95 — это mp4 в video/ |
| [brucx/opus55-video](https://github.com/brucx/opus55-video) | нет | 👀 | Только смотреть: полный explainer-пайплайн (script/ → audio/timeline.json → src/timeline.js), сверка озвучки ASR |
| [tuzhechen2005/opus-video-skills](https://github.com/tuzhechen2005/opus-video-skills) | MIT | ✅ | kinetic-reel/template + examples/site-intro — готовая кинетическая типографика с 3D; детектор темпа для синхрона под бит |
| [neelnanda-io/dont-go-quiet-on-me](https://github.com/neelnanda-io/dont-go-quiet-on-me) | MIT (код; песня/видео — all rights reserved) | ✅ | Связка «бит-сетка + пословное выравнивание текста» как данные для кадра; научные фигуры (data/figures) внутри клипа |
| [latent-variable/deep-learning-birthday](https://github.com/latent-variable/deep-learning-birthday) | MIT (код) + CC BY-SA 4.0 (арт) | ✅ | Шейдер ризографии с мисрегистрацией на сильную долю — переносимый пост-эффект; брать только код, 330 МБ — PNG-плиты |
| [Bemly/video](https://github.com/Bemly/video) | нет | 👀 | Только смотреть: math-execute-me/openai-math (Canvas/WebGL математика) и odyssey (Three.js) — лёгкие папки; ime/ и gemini/ — сотни МБ mp4 |

## R — исследования: Higgsfield, After Effects, Lottie, MCP (79)

| Репозиторий | Лицензия | Код | Что брать |
|---|---|---|---|
| [higgsfield-ai/cli](https://github.com/higgsfield-ai/cli) | MIT | ✅ | Основной путь для Claude Code: brew install higgsfield-ai/tap/higgsfield; MODELS.md — справочник параметров моделей; осторожно: создаёт ссылку hf (конфликт с Hugging Face CLI) |
| [higgsfield-ai/skills](https://github.com/higgsfield-ai/skills) | MIT | ✅ | Скилл higgsfield-generate через /plugin marketplace add higgsfield-ai/skills; CLI ставить заранее через brew, потому что setup делает curl/sh |
| [higgsfield-ai/higgsfield-client](https://github.com/higgsfield-ai/higgsfield-client) | Apache-2.0 | ✅ | Если нужен свой скрипт генерации b-roll на отдельном долларовом балансе API (без Veo) |
| [higgsfield-ai/higgsfield-js](https://github.com/higgsfield-ai/higgsfield-js) | MIT (по README; файла LICENSE нет, GitHub лицензию не распознал) | ✅ | Если обвязку пишем на Node рядом с Playwright; перед использованием уточнить лицензию |
| [higgsfield-ai/cursor-plugin](https://github.com/higgsfield-ai/cursor-plugin) | MIT | ✅ | Не нужен для Claude Code |
| [Hikhakk/higgsfield-mcp-unified](https://github.com/Hikhakk/higgsfield-mcp-unified) | MIT | ✅ | Только если нужен MCP на ключе API; HIGGSFIELD_ENABLE_WEB_BACKEND не включать (конфликт с ToS) |
| [geopopos/higgsfield_ai_mcp](https://github.com/geopopos/higgsfield_ai_mcp) | MIT | ✅ | Ничего: устарел, лучше официальный CLI |
| [OSideMedia/higgsfield-ai-prompt-skill](https://github.com/OSideMedia/higgsfield-ai-prompt-skill) | MIT | ✅ | Читать как справочник промптинга (формула MCSLA, ограничения форматов Kling, роли референсов Seedance 2.5); ставить целиком необязательно |
| [rediumvex/ai-video-generator-claude](https://github.com/rediumvex/ai-video-generator-claude) | MIT | ✅ | Идеи шаблонов промптов; install.py прочитать перед запуском |
| [beshuaxian/higgsfield-seedance2-jineng](https://github.com/beshuaxian/higgsfield-seedance2-jineng) | нет | 👀 | Только почитать: нет лицензии, устарел относительно Seedance 2.5 |
| [cth9191/motion-design](https://github.com/cth9191/motion-design) | нет | 👀 | Только почитать подход к стилям; лицензии нет, копировать нельзя |
| [robonuggets/higgsfield-skill](https://github.com/robonuggets/higgsfield-skill) | NOASSERTION | 👀 | Ничего: официальные skills полнее |
| [docsforadobe/after-effects-scripting-guide](https://github.com/docsforadobe/after-effects-scripting-guide) | нет (контент © Adobe, «educational purposes») | 👀 | Читать как справочник: changelog, Property/CompItem/RenderQueue, matchNames; не копировать тексты в продукт |
| [docsforadobe/after-effects-expression-reference](https://github.com/docsforadobe/after-effects-expression-reference) | нет | 👀 | Справочник по выражениям, changelog (previousKey/nextKey, Dropdown items, fontAxis) |
| [docsforadobe/javascript-tools-guide](https://github.com/docsforadobe/javascript-tools-guide) | нет | 👀 | Справка по File/Folder I/O и ScriptUI для сборщика .jsx |
| [docsforadobe/Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe) | MIT | ✅ | Подключить в tsconfig (noLib) для автодополнения и проверки .jsx, генерируемых агентом |
| [docsforadobe/aequery](https://github.com/docsforadobe/aequery) | MIT | ✅ | Хелперы обхода слоёв/свойств, если писать сборщик вручную |
| [AdobeDocs/uxp-after-effects](https://github.com/AdobeDocs/uxp-after-effects) | Apache-2.0 | ✅ | Следить за выходом UXP в AE; сверять перенос ExtendScript-кода |
| [AdobeDocs/after-effects](https://github.com/AdobeDocs/after-effects) | Apache-2.0 | ✅ | Официальные примеры из samples/ при необходимости |
| [hyperbrew/bolt-cep](https://github.com/hyperbrew/bolt-cep) | MIT | ✅ | Основа для постоянной панели-моста агент↔AE (WebSocket → JSX) |
| [hyperbrew/bolt-uxp](https://github.com/hyperbrew/bolt-uxp) | MIT | ✅ | Отложить до публичного UXP в AE 27; затем — путь миграции |
| [hyperbrew/after-effects-command-ids](https://github.com/hyperbrew/after-effects-command-ids) | MIT | ✅ | JSON с ID для app.executeCommand() (команды без API) |
| [inlife/nexrender](https://github.com/inlife/nexrender) | MIT | ✅ | Формат job JSON и паттерн «шаблон .aep + данные» для серийных роликов; render-only node |
| [bodymovin/bodymovin-extension](https://github.com/bodymovin/bodymovin-extension) | MIT | ✅ | Запасной вариант экспорта; в AE 26 есть отчёты о ч/б градиентах — основной путь через плагин LottieFiles |
| [lottie/lottie-spec](https://github.com/lottie/lottie-spec) | Other (NOASSERTION — проверить LICENSE) | 👀 | Схема для генерации и валидации Lottie JSON из кода |
| [motiondeveloper/expression-globals-typescript](https://github.com/motiondeveloper/expression-globals-typescript) | MIT | ✅ | Писать и тестировать выражения в TS до вставки в AE |
| [motiondeveloper/create-expression-lib](https://github.com/motiondeveloper/create-expression-lib) | MIT | ✅ | Паттерн «общая библиотека easing/spring для кода и AE» |
| [motiondeveloper/rollup-plugin-ae-jsx](https://github.com/motiondeveloper/rollup-plugin-ae-jsx) | MIT | ✅ | Сборка библиотек выражений и скриптов |
| [motiondeveloper/adobe-script-starter](https://github.com/motiondeveloper/adobe-script-starter) | MIT | ✅ | Минимальная схема сборки TS → ES3; полифилы добавлять самим |
| [motiondeveloper/aefunctions](https://github.com/motiondeveloper/aefunctions) | MIT | ✅ | Готовые функции (layout, размеры, утилиты) для выражений |
| [motiondeveloper/eKeys](https://github.com/motiondeveloper/eKeys) | MIT | ✅ | Задавать анимацию кодом прямо в выражении — близко к HTML-движку пользователя |
| [motiondeveloper/editor](https://github.com/motiondeveloper/editor) | MIT | ✅ | Опционально, как редактор и линтер выражений |
| [Klustre/extender](https://github.com/Klustre/extender) | MIT | ✅ | Идеи конфигурации сборки; живой форк msongz/extender (0★, 2026) |
| [runegan/jsxbin](https://github.com/runegan/jsxbin) | MIT | ✅ | Только если нужно закрыть код; агенту обычно не нужно |
| [rendertom/Include](https://github.com/rendertom/Include) | MIT | ✅ | Склейка build.jsx + json2.js в один файл для osascript |
| [rendertom/VSCode-Adobe-Script-Runner](https://github.com/rendertom/VSCode-Adobe-Script-Runner) | нет | 👀 | Посмотреть, как устроен запуск на macOS (AppleScript); код не копировать |
| [ExtendScript/extendscript-es5-shim](https://github.com/ExtendScript/extendscript-es5-shim) | нет | 👀 | Список нужных полифилов; без лицензии — лучше написать или взять из MIT-источника |
| [douglascrockford/JSON-js](https://github.com/douglascrockford/JSON-js) | Public Domain (в заголовке json2.js; SPDX нет) | ✅ | Обязательно подключать в каждый .jsx (в ExtendScript нет надёжного JSON) |
| [kyletmartinez/after-effects-scripts](https://github.com/kyletmartinez/after-effects-scripts) | нет | 👀 | Читать как примеры приёмов API; без лицензии — не копировать |
| [MysteryPancake/After-Effects-Fun](https://github.com/MysteryPancake/After-Effects-Fun) | MIT | ✅ | Примеры нетривиальных выражений |
| [baku89/ISF4AE](https://github.com/baku89/ISF4AE) | MIT | ✅ | Перенос шейдерных эффектов из кода в AE (проверить сборку под Apple Silicon) |
| [google/AEUX](https://github.com/google/AEUX) | Apache-2.0 | ✅ | Бесплатная альтернатива Overlord для макетов; проверить совместимость с AE 26 |
| [Experience-Monks/ae-to-json](https://github.com/Experience-Monks/ae-to-json) | MIT | ✅ | Идея и структура экспорта ключей AE → JSON для своего .jsx |
| [joonaspaakko/ScriptUI-Dialog-Builder-Joonas](https://github.com/joonaspaakko/ScriptUI-Dialog-Builder-Joonas) | нет | 👀 | Пользоваться онлайн-сервисом, если понадобится UI для скрипта |
| [Arman-Luthra/aftr](https://github.com/Arman-Luthra/aftr) | MIT | ✅ | Архитектура моста CEP↔WebSocket и симулятор AE; MCP-часть — зона другого агента |
| [kumoproductions/mcp-aftereffects](https://github.com/kumoproductions/mcp-aftereffects) | MIT | ✅ | Основной кандидат: ставить через npx @kumoproductions/mcp-aftereffects, начать с AE_MCP_READONLY=1, eval не включать |
| [solomondivyananth/aftereffects-mcp](https://github.com/solomondivyananth/aftereffects-mcp) | MIT | ✅ | Второй кандидат и образец безопасности; ставить только из исходников — npm-пакет aftereffects-mcp не опубликован (404) |
| [Engine-Room-Games/after-effects-mcp](https://github.com/Engine-Room-Games/after-effects-mcp) | MIT | ✅ | Брать, если будет AE 2026: /plugin marketplace add Engine-Room-Games/after-effects-mcp |
| [JUNKDOGE-JOE/after-effects-mcp](https://github.com/JUNKDOGE-JOE/after-effects-mcp) | MIT | ✅ | Идеи чекпоинтов и валидации выражений; авторизация эндпоинта не описана — осторожно |
| [Dakkshin/after-effects-mcp](https://github.com/Dakkshin/after-effects-mcp) | MIT | ✅ | Не ставить; смотреть только как исторический образец. В issues — подозрительная ссылка на «исправленный релиз» (#39) |
| [a-y-ibrahim/after-effects-mcp](https://github.com/a-y-ibrahim/after-effects-mcp) | MIT | ✅ | Запасной вариант на базе Dakkshin; фоновый aerender-рендер |
| [ishu86/after-effects-mcp](https://github.com/ishu86/after-effects-mcp) | MIT | ✅ | Список шаблонных операций как идеи; инструкция для Claude Code в README неверная (settings.json) |
| [HeroicSwan/after-effects-mcp](https://github.com/HeroicSwan/after-effects-mcp) | MIT | ✅ | Идея blueprint → валидация → сборка; для Mac не проверено |
| [Aodaruma/adobe-mcp-rs](https://github.com/Aodaruma/adobe-mcp-rs) | MIT | ✅ | Только как референс архитектуры; на Mac не подтверждено |
| [mikechambers/adb-mcp](https://github.com/mikechambers/adb-mcp) | MIT | ✅ | Для Photoshop/Premiere-экспериментов; для AE есть варианты лучше |
| [zachshallbetter/adobe-mcp](https://github.com/zachshallbetter/adobe-mcp) | MIT | ✅ | Слишком свежий для AE; следить |
| [AJSMonty/adobe-mcp](https://github.com/AJSMonty/adobe-mcp) | MIT | ✅ | Минималистичный образец osascript-моста |
| [ilyamorozov13/ae-mcp](https://github.com/ilyamorozov13/ae-mcp) | MIT | ✅ | Русскоязычная инструкция; экспериментальный код |
| [StanleySweet/ae-mcp](https://github.com/StanleySweet/ae-mcp) | MIT | ✅ | Следить; документация не прочитана |
| [tzdwindows/after-effects-mcp](https://github.com/tzdwindows/after-effects-mcp) | MIT | ✅ | Не брать |
| [plainly-videos/mcp-server](https://github.com/plainly-videos/mcp-server) | none | 👀 | Если понадобится массовый рендер AE-шаблонов без своего AE |
| [hetpatel-11/Adobe_Premiere_Pro_MCP](https://github.com/hetpatel-11/Adobe_Premiere_Pro_MCP) | MIT | ✅ | Если будет монтаж в Premiere |
| [leancoderkavy/premiere-pro-mcp](https://github.com/leancoderkavy/premiere-pro-mcp) | MIT | ✅ | AE→MOGRT-коннектор для Premiere |
| [alisaitteke/photoshop-mcp](https://github.com/alisaitteke/photoshop-mcp) | MIT | ✅ | Подготовка растровых ассетов; отключить аналитику |
| [ie3jp/illustrator-mcp-server](https://github.com/ie3jp/illustrator-mcp-server) | MIT | ✅ | Экспорт SVG из Illustrator прямо в наш HTML/SVG-движок |
| [SFKislev/Flue](https://github.com/SFKislev/Flue) | MIT | ✅ | Альтернатива MCP с меньшим контекстом; проверить на AE |
| [TerminalSkills/skills](https://github.com/TerminalSkills/skills) | Apache-2.0 | ✅ | Раздел про aerender и MOGRT |
| [iart-ai/motion-design-skills](https://github.com/iart-ai/motion-design-skills) | MIT | ✅ | Сниппеты выражений и рига на контрол-нуле |
| [aedev-tools/adobe-agent-skills](https://github.com/aedev-tools/adobe-agent-skills) | Apache-2.0 | ✅ | Библиотека готовых JSX и раннер через osascript |
| [LobzyJay/motion-design-with-claude-and-codex](https://github.com/LobzyJay/motion-design-with-claude-and-codex) | MIT | ✅ | Правило «много операций — один идемпотентный JSX» и references/limits-and-pitfalls |
| [blixvip/skills](https://github.com/blixvip/skills) | MIT | ✅ | Лучший практичный SKILL.md для связки «Claude пишет .jsx → AE исполняет» |
| [Mfrostbutter/claude-skills](https://github.com/Mfrostbutter/claude-skills) | MIT | ✅ | Шпаргалка matchName и ловушки модальных окон при aerender |
| [vlad7329-debug/claude-after-effects-skills](https://github.com/vlad7329-debug/claude-after-effects-skills) | MIT | ✅ | Идея проверки редактируемости .aep для заказчика |
| [ZEROTCREATIVE/adobe-suite-agent-skills](https://github.com/ZEROTCREATIVE/adobe-suite-agent-skills) | MIT | ✅ | rules/ как основа CLAUDE.md для AE |
| [GUNMIN-KIM/after-effects-codex-agent](https://github.com/GUNMIN-KIM/after-effects-codex-agent) | none | 👀 | Только идеи (лицензии нет): не перезаписывать .aep, сохранять версии, рендерить первый/средний/последний кадр |
| [LevyBytes/AI-SKILL-adobe-products](https://github.com/LevyBytes/AI-SKILL-adobe-products) | AGPL-3.0 | 👀 | Не брать (AGPL) |
| [korbanovalex/hyperframes-to-after-effects](https://github.com/korbanovalex/hyperframes-to-after-effects) | MIT | ✅ | Идея моста «HTML-анимация → .aep для заказчика»; проект нулевой зрелости |
| [obeskay/lottie-animator-skill](https://github.com/obeskay/lottie-animator-skill) | MIT | ✅ | Линтер Lottie и конвертер SVG→Lottie |
| [adobe/skills](https://github.com/adobe/skills) | Apache-2.0 | ✅ | Только если нужен коннектор Adobe for creativity |

## C — только ссылка (крупные или с ограничениями лицензии) (15)

| Репозиторий | Лицензия | Код | Что брать |
|---|---|---|---|
| [browser-use/video-use](https://github.com/browser-use/video-use) | MIT | ✅ | 12 жёстких правил монтажа, работа через транскрипт с таймкодами |
| [redotvideo/revideo](https://github.com/redotvideo/revideo) | MIT | ✅ | форк Motion Canvas для рендера на сервере |
| [ManimCommunity/manim](https://github.com/ManimCommunity/manim) | MIT | ✅ | математическая анимация; example_scenes/ |
| [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill) | MIT | ✅ | скилл Manim для агентов |
| [diffusionstudio/lottie](https://github.com/diffusionstudio/lottie) | MIT | ✅ | Lottie для агентов |
| [KyaniteLabs/mcp-video](https://github.com/KyaniteLabs/mcp-video) | ? | ✅ | MCP-сервер над ffmpeg — не нужен, ffmpeg вызывается напрямую |
| [jfikrat/higgsfield-mcp](https://github.com/jfikrat/higgsfield-mcp) | MIT | ✅ | Не использовать: нарушение ToS, хрупкость, утечка сессии |
| [nukIeer/higgsfield-unlimited-mcp](https://github.com/nukIeer/higgsfield-unlimited-mcp) | MIT | ✅ | Не использовать: риск бана и нарушение ToS |
| [AKCodez/higgsfield-claude-skills](https://github.com/AKCodez/higgsfield-claude-skills) | нет | 👀 | Не брать: нет лицензии, браузерная автоматизация сайта |
| [Adobe-CEP/CEP-Resources](https://github.com/Adobe-CEP/CEP-Resources) | нет SPDX на уровне репо | 👀 | Только CEP Cookbook и CSInterface.js для своей панели-моста; репо целиком не клонировать (1.7 ГБ) |
| [airbnb/lottie-web](https://github.com/airbnb/lottie-web) | MIT | ✅ | Проигрывать экспорт из AE в HTML-пайплайне; покадровый рендер через goToAndStop в Playwright |
| [RxLaboratory/Duik](https://github.com/RxLaboratory/Duik) | GPL-3.0 | 👀 | Использовать как инструмент; код не встраивать (copyleft) |
| [Tencent/libpag](https://github.com/Tencent/libpag) | Other (NOASSERTION — проверить) | 👀 | Рассмотреть, если Lottie не тянет эффекты; лицензию проверить |
| [Trentonom0r3/PyShiftAE](https://github.com/Trentonom0r3/PyShiftAE) | AGPL-3.0 | 👀 | Не брать: AGPL, не обновлялся с 2025 |
| [Immersive-Media-Technologies/aftereffects-mcp-imt](https://github.com/Immersive-Media-Technologies/aftereffects-mcp-imt) | IMT Non-Commercial (NOASSERTION) | 👀 | Не для коммерческих заказов (некоммерческая лицензия); идеи dry-run и project lock |
