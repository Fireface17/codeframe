# Герой ролика №3 — hero.glb

- Исходник: Microsoft Rocketbox Avatar Library, `Male_Adult_18` + клипы `m_idle_neutral_01`, `m_idle_look_around_01`,
  `m_walk_neutral_01`, `m_walk_cool_01` (копия в `library/3d/microsoft__rocketbox/`, там же `SOURCE.md` со ссылкой на репозиторий).
- Лицензия: **MIT**, © 2020 Microsoft — `LICENSE.md` рядом (уведомление сохранять при распространении файла).
  Строка для титров по желанию: «Персонаж: Microsoft Rocketbox Avatar Library (MIT)».
- Доработка (2026-10-22, стенд `hero_lab/bake.html`): альбедо перекрашено в пастель стиля B (худи #94585C, джинсы #5C6E86,
  кеды #E6E0D4, складки из исходной текстуры — мягкой модуляцией), голова — мягче по контрасту, воротник кремовый;
  корневое движение клипов убрано (ходьба на месте, скорость — `clips.json`), дорожки масштаба выкинуты; масштаб 0.01 (метры).
- Пересборка: `node hero_lab/shot.mjs bake bake.html [hoodie=rrggbb&denim=rrggbb&shoe=rrggbb]` (нужны PNG в `hero_lab/src_tex/`,
  получаются из TGA библиотеки через ffmpeg — см. `hero_lab/README.md`).
