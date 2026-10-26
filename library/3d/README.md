# library/3d — каталог 3D-ассетов (и окружения к ним)

Собрано 2026-10-22 под ролик №3 «GTA 6: что у тебя за спиной» (three.js, стилизованный low-poly,
ночь). Эталон качества — `refs/repos/lemomo-ai__lemo-opuscar/styles/tilt-shift/poster.jpg`
(простые коробки-дома с окнами, мягкий свет, огни улиц, tilt-shift). Оценка 1–5: насколько пак
дотягивает до этого эталона при нашем освещении.

В каждой папке: `preview.png`/`preview.jpg` (превью пака), файл лицензии (`License.txt` автора или
`LICENSE-*.txt` с текстом лицензии), `SOURCE.md` или `CREDITS.md` со ссылкой на источник.
Скачанное ничего не запускает: только модели, текстуры, звуки и тексты.

## Как перекрашивать под палитру бренда

- **Kenney** (все `kenney__*`, кроме nature-kit): один материал `colormap` с текстурой-палитрой
  `Models/GLB format/Textures/colormap.png` (квадраты цветов). Перекраска — своя копия colormap.png
  или замена `material.map` на свою палитру в коде. Nature-kit — простые цветные материалы без текстур.
- **Quaternius-персонажи, малый самолёт, фонари, урны, скамейка** — плоские цветные материалы
  (`Skin`, `Hair`, `White`, `Red`…): меняется `material.color`.
- Пальмы Quaternius и вывески — материал с маленьким атласом-текстурой; цвет листвы проще сдвинуть
  через `material.color` (умножение) или заменить атлас.

---

## Паки

### Город

| Папка | Что внутри | Формат | Размер | Лицензия | Оценка |
|---|---|---|---|---|---|
| `kenney__city-kit-commercial/` | 41 модель: 14 домов `building-a…n`, 5 небоскрёбов, 16 упрощённых `low-detail-building-*` (для горизонта), навесы, зонты | GLB (+FBX/OBJ) | 11 МБ | CC0 — https://kenney.nl/assets/city-kit-commercial | **5** — почти один в один с эталоном |
| `kenney__city-kit-roads/` | 95 моделей: прямые, повороты, перекрёстки, круг, мосты, тротуарные края, фонари `light-*`, светофоры `traffic-light*`, знаки без текста, ЛЭП, стройзаграждения, мусорный бак | GLB (+FBX/OBJ) | 8 МБ | CC0 — https://kenney.nl/assets/city-kit-roads | **5** |
| `kenney__city-kit-suburban/` | 40 моделей: частные дома, заборы, деревья, дорожки | GLB (+FBX/OBJ) | 8 МБ | CC0 — https://kenney.nl/assets/city-kit-suburban | **3** — окраины острова, зелёные крыши перекрасить |
| `kenney__city-kit-industrial/` | 37 моделей: склады, ангары, трубы, баки, контейнеры | GLB (+FBX/OBJ) | 11 МБ | CC0 — https://kenney.nl/assets/city-kit-industrial | **3** — порт/набережная |
| `polypizza__street-props/` | 8 моделей: 3 уличных фонаря, скамейка, 2 урны, набор неоновых вывесок (японские надписи, без брендов), пустой билборд | GLB | 4 МБ | 7 × CC0; билборд CC-BY 3.0 — см. `CREDITS.md` | **4** |

### Герой

| Папка | Что внутри | Формат | Размер | Лицензия | Оценка |
|---|---|---|---|---|---|
| `quaternius__ultimate-modular-characters/` | 11 человек (`Individual Characters/glTF/`): Casual_Hoodie, Casual_2, Punk, Worker, Suit, Swat, Adventurer, Beach, Farmer, King, Spacesuit. В каждом 24 анимации: **Idle, Idle_Neutral, Walk, Run**, Run_Back/Left/Right, Roll, Wave, Interact, Punch, Kick, Death и др. | glTF (буферы внутри файла) | 35 МБ | CC0 — https://quaternius.com/packs/ultimatemodularcharacters.html | **4** — пропорции взрослые, плоские цвета; со спины читается силуэт куртки/худи |

Для героя «в куртке» — `Casual_Hoodie.gltf` или `Punk.gltf` (кожанка); `Worker.gltf` — жилет.

### Транспорт

| Папка | Что внутри | Формат | Размер | Лицензия | Оценка |
|---|---|---|---|---|---|
| `kenney__car-kit/` | 50 моделей: ~25 машин (sedan, sedan-sports, hatchback-sports, suv, suv-luxury, van, taxi, police, ambulance, firetruck, garbage-truck, delivery, truck…), колёса отдельно, обломки (debris-*) для аварии, конусы. Без марок и логотипов | GLB (+FBX/OBJ) | 15 МБ | CC0 — https://kenney.nl/assets/car-kit | **5** |
| `polypizza__small-plane/` | 3 модели: **Small Airplane** (лёгкий высокоплан, 584 треуг., 4 плоских материала), 2 игрушечных биплана | GLB | 2 МБ | CC-BY 3.0 — см. `CREDITS.md` | **4** (малый самолёт) / 3 (бипланы) |

### Растительность

| Папка | Что внутри | Формат | Размер | Лицензия | Оценка |
|---|---|---|---|---|---|
| `polypizza__palms/` | 6 моделей: 4 от Quaternius (3 одиночные пальмы + набор из 5 высоких тонких), 2 высокие изогнутые пальмы (Poly by Google, jeremy) | GLB | 5 МБ | 4 × CC0, 2 × CC-BY 3.0 — см. `CREDITS.md` | **4** |
| `kenney__nature-kit/` | 329 моделей природы: 6 пальм `tree_palm*`, деревья, кусты, камни, скалы, песок/трава, мостки | GLB (папка `Models/GLTF format/`, +FBX/OBJ/DAE/STL) | 36 МБ | CC0 — https://kenney.nl/assets/nature-kit | **3** — пальмы простые (≈190 треуг.), зато в одном стиле с Kenney-городом; камни и берег для острова |

### Окружение (не в 3d, но для этого ролика)

| Папка | Что внутри | Размер | Лицензия | Оценка |
|---|---|---|---|---|
| `../hdri/polyhaven__night/` | 3 ночные HDRI 2K: `blue_lagoon_night` (набережная у моря с фонарями), `kloppenheim_02_puresky` (чистое ночное небо без построек), `shanghai_bund` (неоновая набережная — **только для отражений**: в кадре узнаваемый реальный город) | 19 МБ | CC0 — https://polyhaven.com/license | 4 / 4 / 3 |
| `../textures/ambientcg__Asphalt025C/` | мокрый тёмный асфальт, 2K: Color, NormalGL/DX, Roughness, AO, Displacement | 30 МБ | CC0 — https://ambientcg.com/view?id=Asphalt025C | **4** |
| `../textures/ambientcg__Asphalt025B/` | мокрый чистый асфальт, 1K | 7 МБ | CC0 | 4 |
| `../textures/ambientcg__Asphalt024C/` | мокрый асфальт с трещинами, 1K | 8 МБ | CC0 | 3 |
| `../textures/polyhaven__concrete-floor-worn-001/` | бетон, 2K: diff, nor_gl, rough, ao, disp | 4 МБ | CC0 | 3 |
| `../textures/polyhaven__large-square-pattern-01/` | плитка тротуара/набережной, 2K | 11 МБ | CC0 | 4 |
| `../textures/threejs__waternormals/` | `waternormals.jpg` — карта нормалей воды из примеров three.js (под `Water` из three/examples) | 0,5 МБ | MIT (лицензия репозитория three.js; отдельной у файла нет) | 4 |

Совет по стилю: в стилизованной сцене текстуры асфальта брать не как цвет, а как `roughnessMap`
+ слабый `normalMap` поверх плоского цвета `#0E1016` — так появляются мокрые блики без фотореализма.

### Звуки (в `../sfx/`)

| Папка | Что внутри | Лицензия | Под что |
|---|---|---|---|
| `../sfx/opengameart__air-whoosh/` | `whoosh2.wav`, 5,2 с | CC0, pyranostudios — https://opengameart.org/content/air-whoosh | разворот камеры / вжух |
| `../sfx/opengameart__swishes/` | 13 коротких `swish-*.wav` | CC0, artisticdude — https://opengameart.org/content/swishes-sound-pack | быстрые вжухи |
| `../sfx/opengameart__propeller-cartoon-loop/` | `propeller_cartoon_loop.wav`, петля 1,7 с | CC0, Mish7913 — https://opengameart.org/content/propeller-cartoon-loop | мотор самолёта; сбой — сделать из петли (провалы громкости + падение высоты тона) |
| `../sfx/wikimedia__hdd/` | щелчки чтения HDD 16,6 с (CC0), «click of death» 43,8 с (Public domain), раскрутка/остановка HDD 59 с (**CC-BY 4.0**) | см. `CREDITS.md` | гул и щелчки жёсткого диска |

Уже были и не дублировались: глухой удар — `sfx/kenney/impact-sounds/impactSoft_heavy_*`,
`impactPunch_heavy_*`; тиканье — `~/.claude/skills/code-motion/assets/sfx/tick_1/2.wav` и
`sfx/kenney/interface-sounds/`; вжух — `whoosh_1/2.wav` в навыке; гул машин — `sfx/kenney/sci-fi-sounds/engineCircular_*`.

---

## Рекомендуемый набор для ролика №3

Основа — Kenney: одна палитра и один уровень детализации у города, дорог и машин, это главное
против «пёстрой сборки». Остальное подобрано под тот же плоский low-poly.

| Сцена | Что брать | Лицензия |
|---|---|---|
| Герой со спины на ночной неоновой улице | `quaternius__ultimate-modular-characters/…/Casual_Hoodie.gltf` (Idle → Walk → Run); улица — `kenney__city-kit-commercial` `building-a…n` + `kenney__city-kit-roads` (`road-straight`, `road-crossing`, `light-square`, `traffic-light`); вывески — `polypizza__street-props/cyberpunk-signs-…`; мокрый асфальт — `ambientcg__Asphalt025C` (roughness+normal); отражения — `hdri/polyhaven__night/shanghai_bund_2k.hdr` или `blue_lagoon_night_2k.hdr` как `scene.environment` | CC0 |
| Вид сверху на город-остров | кварталы — commercial (центр), suburban (окраины), industrial (порт); дороги — roads; набережная — `polyhaven__large-square-pattern-01`; пальмы — `polypizza__palms` (Quaternius) + `kenney__nature-kit` `tree_palm*`; берег/камни — nature-kit; вода — `threejs__waternormals` | CC0 (+MIT вода) |
| Горизонт с упрощёнными домами | `kenney__city-kit-commercial/…/low-detail-building-*` (16 шт.) — сделаны ровно для дальнего плана; небо — `kloppenheim_02_puresky_2k.hdr` | CC0 |
| Эпоха «2001» | те же `low-detail-building-*` без окон-огней + грубый материал (`flatShading`, 1–2 цвета); самолёт — `polypizza__small-plane/small-airplane-vojt-ch-bal-k-7cvx.glb`; звук — propeller loop + HDD | самолёт **CC-BY 3.0** |
| Машины на улицах | `kenney__car-kit`: sedan, sedan-sports, hatchback-sports, suv, van, taxi, truck (без марок); для «сбоя» — `debris-*` | CC0 |
| Фонари, скамейки, урны | roads `light-*`, `traffic-light*`; `polypizza__street-props` (фонари Quaternius/Kay Lousberg, скамейка, урны) | CC0 |

**Строки для титров/описания (CC-BY):**
- «Small Airplane» by Vojtěch Balák, CC-BY 3.0, via Poly Pizza — https://poly.pizza/m/7cvx6ex-xfL
- Если берутся: «Palm tree» by Poly by Google (https://poly.pizza/m/2RUnO1Yi99P), «Palm tree» by jeremy (https://poly.pizza/m/bjGeBbKhAVN), «Billboard» by Poly by Google (https://poly.pizza/m/3ALIEkWNbgR), «Airplane» by Poly by Google (https://poly.pizza/m/6D4MwQoxK-K, https://poly.pizza/m/8VysVKMXN2J) — все CC-BY 3.0
- Звук раскрутки HDD: «TOSHIBA HDWR480 spinup and spindown sounds» by TheDragonFire300, CC BY 4.0, Wikimedia Commons
- Kenney и Quaternius — CC0, упоминание по желанию («Assets: Kenney, Quaternius»).

---

## Смотрели и не взяли

| Пак | Почему | Оценка |
|---|---|---|
| Kenney Animated Characters Retro | FBX, 1 модель + 4 скина, грубее Quaternius (скачан, проверен, удалён) | 2 |
| Kenney Blocky Characters, Mini Characters | воксельные/чиби, не тот масштаб к городу | 2 |
| Kenney Modular Buildings | бежевые блоки, слабее City Kit Commercial | 3 |
| Kenney Pirate Kit | пальмы есть, но лучше в Nature Kit и Poly Pizza; остальное не по теме | 2 |
| Quaternius Downtown City MegaKit | полуреалистичные текстуры — выбивается из low-poly; раздаётся через itch.io | 3 |
| Quaternius Cars, Public Transport, Modular Streets, Simple Buildings, Ultimate Nature, Animated Men | на Google Drive только FBX/OBJ/Blend, без glTF; Kenney и Poly Pizza закрывают то же в GLB | 3–4 |
| Quaternius Cyberpunk Game Kit | парящие платформы, не город | 2 |
| Poly Pizza: авиалайнеры, джеты, «very cute airplane» | раскраска реальной авиакомпании у одного, остальные — не «маленький самолёт» | — |

## Не удалось

- **Quaternius Universal Animation Library и Universal Base Characters** (CC0, лучшие анимации
  ходьбы/бега) — раздаются только кнопкой itch.io: https://quaternius.itch.io/universal-animation-library,
  https://quaternius.itch.io/universal-base-characters. Скачать вручную, если анимаций Modular Characters не хватит.
- **Звук сбоя мотора маленького самолёта** под CC0 без логина не найден (Freesound требует аккаунт,
  Wikimedia — только полёт с птицами). Вариант: собрать из `opengameart__propeller-cartoon-loop`.
- **Карта нормалей воды под CC0** — у ambientCG и Poly Haven воды нет; взята `waternormals.jpg` из three.js (MIT).

---

## Набор v2 (детальнее)

Собрано 2026-10-22 после замечания автора: «модели буквально прямоугольные». Задача — заметно
детальнее Kenney, но стилизованно (не фотоскан), под солнечный Майами в духе Vice City. Оценка 1–5 —
по превью источников в сравнении с `projects/03-gta6-open-world/out/style/B4_day_a_behind.png`;
в three.js при нашем свете ещё не проверялось. Всего ~280 МБ.

| Модель | Сцена | Лицензия | Оценка | Путь |
|---|---|---|---|---|
| **Пальмы-перья** — 5 шт. (детская, изогнутая, обычная, старая, молодая), каждое перо отдельно, изогнутый ствол | набережная, пляж, бульвар | CC0, FabinhoSC — https://opengameart.org/content/exotic-palms-lowpoly-style | **5** | `opengameart__exotic-palms/` — **только FBX** + атлас `LowPolyTextureMap.png` (`FBXLoader`) |
| **Машины** — седан ×2, внедорожник, такси, полиция, пикап, 3 спорткара (Quaternius, ~3–6 тыс. треуг.: скруглённые кузова, арки, диски, отдельные материалы фар/стёкол) + кабриолет-хотрод (Poly by Google, 2,7 тыс.) | трафик улиц | 9 × CC0; кабриолет CC-BY 3.0 — `CREDITS.md` | **4** | `polypizza__cars-v2/models/` (GLB) |
| **Пальмы и кусты** — Palmyra 4,1 тыс., Royal 3,1 тыс., Alexandra 2,2 тыс., пальма в кадке (кафе), куст «small palm trees»; кусты/изгородь/цветы 300–600 треуг. | бульвары, кафе, клумбы | пальмы CC-BY 3.0 (Poly by Google, Steve B); кусты CC0 (Isa Lousberg, Quaternius) — `CREDITS.md` | пальмы **4**, кусты 3 | `polypizza__palms-v2/models/` (GLB) |
| **Пляж и кафе** — 4 полосатых пляжных зонта, 2 шезлонга, деревянный лежак, вышка спасателей (4,6 тыс.), зонт кафе, полосатый навес | пляж, кафе | CC-BY 3.0 (S. Paul Michael, Daniel Doran, Poly by Google, Dave Edwards) — `CREDITS.md` | **4** | `polypizza__beach-props/models/` (GLB) |
| **Улица** — 2 жёлтых американских светофора с фонарём-«коброй» и пешеходным сигналом, светофор с табличками улиц, классический фонарный столб 2,5 тыс. | перекрёсток | 3 × CC0 (Kay Lousberg, Quaternius); столб CC-BY 3.0 (Ellen Na) — `CREDITS.md` | **4** | `polypizza__street-props-v2/models/` (GLB) |
| **Downtown City MegaKit (free)** — 153 модульные детали (карнизы, пилястры, арочные окна, углы 90°, витрины, интерьеры за стеклом) + 3 готовых здания 18/26/45 тыс. треуг.; PBR-текстуры до 2K | улица героя, кварталы | CC0, Quaternius — https://quaternius.com/packs/downtowncitymegakit.html | детализация **4**, Майами **3** | `quaternius__downtown-city-megakit/gltf/` (glTF+bin) |
| **Здания Poly Pizza** — «Hotel» (белый модернистский отель с подиумом и круглыми окнами, 13,5 тыс.), 3 дома J-Toastie (карнизы, обрамления окон, витрины, 2–3 тыс., плоские материалы — легко в пастель) | Ocean Drive, второй план | CC-BY 3.0 — `CREDITS.md` | **3** | `polypizza__city-buildings/models/` (GLB) |
| **Герой: Microsoft Rocketbox** — Male_Adult_17 (синяя худи на молнии, джинсы, кепка), Male_Adult_18 (серая худи, капюшон на голове); ~7 тыс. треуг., скелет Biped `Bip01`, 8 клипов: idle ×3, walk ×3, run, разворот 180° | герой со спины | MIT, Microsoft — https://github.com/microsoft/Microsoft-Rocketbox | детализация **4**, стиль **2–3** | `microsoft__rocketbox/` — **только FBX** + TGA 2K |

Что учесть:
- **Rocketbox** — реалистичные фактурные текстуры, не мультяшка: рядом со стилизованным городом
  выбивается; треугольников меньше заказанных 10 тыс. Скелет не Mixamo — для клипов Mixamo нужен
  ретаргет (`SkeletonUtils.retargetClip`). У Male_Adult_17 мелкая надпись на груди (сзади не видна).
- **MegaKit** — стиль Нью-Йорк/Бостон (красный кирпич). Для Майами: `MI_Trim`/`MI_Concrete` → пастель,
  кирпич → штукатурка. В превью пака вымышленные вывески — сами модели вывесок не ставить.
- Пастельного ар-деко Ocean Drive (скруглённые углы, «брови», пилоны) под CC0/CC-BY без входа
  не нашлось — ближайшее собирается из MegaKit + перекраска, либо пак со входом ниже.
- Из машин спорткары напоминают американские маслкары, но без марок и решёток-«подписей».

**Строки для титров (CC-BY v2):** все авторы и ссылки — в `CREDITS.md` каждой папки
`polypizza__*-v2`, `polypizza__beach-props`, `polypizza__city-buildings`; формат: «<Модель> by <Автор>, CC-BY 3.0, via Poly Pizza — <ссылка>».
CC0/MIT по желанию: «Assets: Quaternius, Kay & Isa Lousberg, FabinhoSC (CC0); Microsoft Rocketbox (MIT)».

### Нужен вход — для автора (Sketchfab, все CC-BY, лицензия проверена через публичный API)

| # | Модель | Граней | Чем лучше | Ссылка | Превью |
|---|---|---|---|---|---|
| 1 | **Free Stylized Cartoon Game Boy Character Rigged** — Canino3d | 66 тыс. | белая худи, стилизация ближе всех к GTA/Fortnite, со скелетом (чуть выше лимита 60 тыс.) | https://sketchfab.com/3d-models/92b4b22d14194be191c0df00f6e62b3d | [jpg](https://media.sketchfab.com/models/92b4b22d14194be191c0df00f6e62b3d/thumbnails/48d2453ab4c34dcc84aab7e96d18971c/b50d4a390cda4586a8ee855799d400ff.jpeg) |
| 2 | **Cartoon Dude (Animated)** — jungle_jim | 50 тыс. | куртка и джинсы, качественная стилизация, с анимацией | https://sketchfab.com/3d-models/c0ce1cd8c4c944478898ff2ea1693243 | [jpg](https://media.sketchfab.com/models/c0ce1cd8c4c944478898ff2ea1693243/thumbnails/e18662b7b2d8444f8acc05d1f97b8b3e/3ac2e853981343f8b8e4d8643cb2ba66.jpeg) |
| 3 | **LOWPOLY CITY STREET PACK BUILDINGS STYLIZED** — haykel1993 | 73 тыс. | тёплые пастельные дома 4–6 этажей и изогнутые стеклянные башни; **убрать вывеску Starbucks** | https://sketchfab.com/3d-models/lowpoly-city-street-pack-buildings-stylized-8e1ba8a437c4460eaaa643953eaf79d0 | [jpg](https://media.sketchfab.com/models/8e1ba8a437c4460eaaa643953eaf79d0/thumbnails/0f888b5a89c74962bce4d3a1350eaf16/10477cae781542bf9a2095b96e3a7d3d.jpeg) |
| 4 | **Stylized Palm tree set** — parelaxel | 27,5 тыс. | стилизованный набор пальм в GLB-цепочке Sketchfab (альтернатива FBX-пальмам) | https://sketchfab.com/3d-models/b84b734847344cb6a81b9102a64ac63b | [jpg](https://media.sketchfab.com/models/b84b734847344cb6a81b9102a64ac63b/thumbnails/ad3eeb78b54d4943a906f68f755e22ed/019af787eb3245d3bc86d968d384ad35.jpeg) |
| 5 | **Low-poly City Buildings** — smooth998 | 7,2 тыс. | мультяшные небоскрёбы с силуэтами и коронами | https://sketchfab.com/3d-models/low-poly-city-buildings-e0209ac5bb684d2d85e5ade96c92d2ff | [jpg](https://media.sketchfab.com/models/e0209ac5bb684d2d85e5ade96c92d2ff/thumbnails/510e6e0319fc452e91ed030814debb60/85b1497c43b0429ead91153f79632a2a.jpeg) |
| 6 | **Edgy boy Orson** — MadKoko | 19,7 тыс. | белая худи, стилизованный (скелет проверить) | https://sketchfab.com/3d-models/71db0ec28cb14ac5b30338db945d0421 | [jpg](https://media.sketchfab.com/models/71db0ec28cb14ac5b30338db945d0421/thumbnails/d52128c097734956a46dd15ae93cc74c/1127c7a206434f13bc64509fa17de70c.jpeg) |
| 7 | **Stylized Highrise City Building TV Station** — 99-names | 26 тыс. | стеклянная башня с уступами и короной | https://sketchfab.com/3d-models/stylized-highrise-city-building-tv-station-ba2a076e08f74af2aeaabfaba31495fe | [jpg](https://media.sketchfab.com/models/ba2a076e08f74af2aeaabfaba31495fe/thumbnails/7a3a7dd1f58045a0a83eb9c1abce4191/792a06816afa4e409b3dfc268cb300ca.jpeg) |
| 8 | **New Zealand Art Deco Building** — wobbs_ | 1,5 тыс. | белое ар-деко с центральным пилоном — единственное настоящее ар-деко среди найденного | https://sketchfab.com/3d-models/new-zealand-art-deco-building-88067844b13b4bc0b7234aab9f70713d | [jpg](https://media.sketchfab.com/models/88067844b13b4bc0b7234aab9f70713d/thumbnails/a7198cd46d7743fcb51e7b7855cff635/a7f800674b0d4817b0a2e03c26dd99ef.jpeg) |
| 9 | **Stylized model Taxi -1** — dudkingalina | 9,4 тыс. | стилизованное такси, детальнее Quaternius | https://sketchfab.com/3d-models/ca5b06b2df04479eae8cf1b7fa071e49 | [jpg](https://media.sketchfab.com/models/ca5b06b2df04479eae8cf1b7fa071e49/thumbnails/413a77f162f3435abfa2d6436c3171fb/15a0057486ea44f498d046852ff3e5af.jpeg) |
| 10 | **Convertible_car** — dudkingalina | 3,3 тыс. | второй кабриолет в той же манере, что такси № 9 | https://sketchfab.com/3d-models/c2cb8f94b9304c3f8ddb36b2d7931bf7 | [jpg](https://media.sketchfab.com/models/c2cb8f94b9304c3f8ddb36b2d7931bf7/thumbnails/a503b7eda6e14429bf353c97f1ad77a6/c2693abcfc724b60beedc4c5157ee9a0.jpeg) |

Превью № 4, 9, 10 глазами не смотрели — только данные API. Перед скачиванием сверить лицензию на
странице (должно быть «CC Attribution»), записать автора в `CREDITS.md`.

### Не удалось / отклонено (v2)

- **Пастельное ар-деко Майами** под CC0/CC-BY без входа — нет ни на Poly Pizza, ни на OpenGameArt, ни у Quaternius/KayKit.
- **Стилизованный герой в худи 10–60 тыс. треуг. без входа** — не нашёлся: 100Avatars и прочие CC0-VRM
  (open-source-avatars) — игрушечные маскоты, Poly Pizza — только уже имеющийся Quaternius,
  OpenGameArt — low-poly; Quaternius Universal Base Characters — голые базовые тела (itch).
- **Маркизы для витрин и вывески без брендов** — на Poly Pizza нет (поиск «awning» даёт окна и беседки); есть только полосатый навес в `polypizza__beach-props`.
- Отклонено по лицензии/брендам: Sketchfab «Building» с вывеской «Ocean View» и «Building_Vice City» / «Grand Theft Auto Vice City» (фанатская GTA), «Franklin Hoodie» (рип из GTA), персонажи Scary Teacher; Empire State, Chrysler (реальные здания); машины-копии Camaro, Mustang, Hilux, Range Rover, Lamborghini, Cybertruck, DeLorean; синий кабриолет с решёткой как у BMW (скачан и удалён); «Male Hooded Character» (сгенерирован Meshy).
- Poly Haven: моделей пальм, зонтов, машин нет; фонари `street_lamp_01/02` фотореальные — не взяты.
- Quaternius Ultimate Buildings — только FBX/OBJ и почти так же коробочно, как Kenney; KayKit — уровень Kenney.
