# Живой голос студийного качества (без синтеза)

Исследование 2026-10-22. Цель — живой голос, записанный на встроенный микрофон MacBook, довести до «студийного», не превращая его в ИИ.
Метки: **[Изм]** — мои замеры (ffmpeg, numpy/scipy через uv), **[Ф]** — факт из документации, **[М]** — мнение
пользователей или обзоров, **[Вывод]** — мой вывод. Цены на 2026-10-22, `{{проверить}}` — цена не подтверждена.

## Коротко

- В записи мешают не шум и не клиппинг, а **тон и комната**. Звук глухой и «коробочный»: полоса 100–600 Гц на
  ~25 дБ громче полосы 2–5 кГц, воздуха выше 12 кГц нет, после каждого слова слышен хвост комнаты.
- Обработка в проекте сейчас минимальная. В `mix.py` голос проходит только фильтр низа 70 Гц и выравнивание
  до −16 LUFS, в `deess.py` — мягкий диэссер. Эквалайзера и компрессора на голосе нет.
- Бесплатная цепочка ffmpeg (EQ, экспандер, компрессор) лечит тон. Комнату она не уберёт: в ffmpeg нет
  де-ревербератора. Отражения убирает только сама запись: микрофон ближе, вокруг мягкое.
- Порядок по отдаче: **ближе к микрофону и мягкая комната → динамический USB-микрофон за ~$70–80 → обработка**.
  Нейросети — последний шаг и в малой дозе.

## 1. Пример диагностики: запись на встроенный микрофон ноутбука [Изм]

Пример — реальная запись диктора на MacBook: 201 с, 48 кГц, моно, float32. Финальный голос —
`vo.wav`, 45,4 с.

| Параметр | Сырая запись | `vo.wav` (финал) |
|---|---|---|
| Громкость интегральная / LRA | −33,8 LUFS / 6,8 LU | −16,2 LUFS / 2,2 LU |
| Пик сэмпла | −11,1 dBFS | −2,0 dBFS |
| Клиппинг (сэмплов ≥ −0,2 dBFS) | 0 | 0 |
| Речь, средний RMS | −32,9 dBFS | −14,7 dBFS |
| Фон в паузах (102 паузы ≥ 200 мс, всего 41,9 с) | −74,6 dBFS RMS → отношение сигнал/шум ≈ 42 дБ | −60,9 dBFS (пауз почти нет, они вырезаны) |
| Спектр фона | в основном низ: 20–65 Гц −93…−96 дБ/Гц, 4–12 кГц −130 дБ/Гц | — |
| Разброс громкости речи (окна 400 мс, p10–p90) | 13,2 дБ | 10,1 дБ |
| Пик-фактор речи | 21,8 дБ | 12,7 дБ |

**Спектр речи** (средний по речи, дБ относительно полосы 800–1250 Гц; полосы по 1/6 октавы):

| Зона | Значение | Что это |
|---|---|---|
| < 60 Гц | −13…−2 | низа и гула почти нет, сетевого фона 50/60 Гц нет |
| 100–600 Гц | **+15…+21,5**, пик 125 Гц +21,5, плато 250–560 Гц +15…+17 | «бубнёж» и «коробка» |
| 630 → 1000 Гц | спад на 17 дБ за 2/3 октавы | резкий обрыв середины |
| ~1,0–1,1 кГц и ~2 кГц | провалы −3,4 и −8,8 | похоже на гребенчатую фильтрацию от отражения (стол или экран) [Вывод] |
| 3–4 кГц (присутствие, разборчивость) | −6,5…−7,3 | недобор |
| 4,5–7 кГц (свист) | −3,4…−4,7, то есть на ~3 дБ выше зоны присутствия | лёгкий избыток «с/ш» |
| 5–9 кГц против 1–4 кГц, окна 10 мс | медиана −7,2 дБ, p95 +13,8 дБ; 23,6 % окон > 0 дБ | всплески свиста; диэссер нужен |
| > 11 кГц | −8,8 на 11,3 кГц → −17 на 12,7 кГц → −31 на 16 кГц | срез «воздуха» (микрофон MacBook или его обработка) |

**Комната.** Взял медиану огибающей после 101 конца фразы. Хвост падает на 10 дБ за 35 мс, на 20 дБ — за 65 мс,
на 30 дБ — за 125–135 мс. По наклону от −10 до −30 дБ это даёт T60 ≈ 270–300 мс. Оценка верхняя: в неё входит и
естественное затухание самой речи. Хвост на ~130 мс после каждого слова и провалы на 1 и 2 кГц вместе дают
ощущение «говорит в комнате, а не в микрофон».

**Фон очень чистый для встроенного микрофона:** 92 % пауз тише −70 dBFS. Возможно, macOS сама давила шум
(режим микрофона), но по файлу этого не установить.

**Что делает звук «не студийным», по убыванию вклада**

1. **Тон:** «коробка» 100–600 Гц при провале 2–5 кГц, разрыв ~25 дБ — глухо и бубняще.
2. **Комната:** хвост ~130 мс до −30 дБ и ранние отражения (провалы 1 и 2 кГц); обработкой почти не лечится.
3. **Нет воздуха:** выше 12 кГц спад на 17–31 дБ.
4. **Дистанция:** −33,8 LUFS, пики −11 dBFS. Уровень в float32 не страшен, но выдаёт дальность → больше комнаты.
5. **Свист 4,5–7 кГц** умеренный, `deess.py` справляется. 6. **Шум** не проблема (42 дБ), **клиппинга нет**.

## 2. Как записывать лучше без покупок

| Что | Как | Источник |
|---|---|---|
| Главный рычаг — расстояние | Вдвое ближе — прямой звук на +6 дБ, а комната почти не меняется. Shure советует 5–30 см | Shure 2025-02-01; Sweetwater |
| iPhone вместо MacBook | «Диктофон» на 10–15 см (кулак), нижний торец направлен в уголок рта. Настройки → Диктофон → Качество → **Lossless**. Режим **Стандартный**: «Изоляция голоса» пишется прямо в файл, и на iOS 26 на неё жалуются («зернисто») [М]. «Улучшить запись» меняет только воспроизведение, файл не меняет | Brown Univ.; BGR 2026-07-04; Apple Discussions |
| iOS 27 Studio Sound | работает только для записей Spatial Audio, моно-закадру не подходит | BGR; MacObserver |
| MacBook, если пишешь на него | Режим микрофона — **Стандартный** (не Voice Isolation). Не печатать во время записи: вибрация идёт через корпус. Сесть ближе и держать постоянную дистанцию | Apple Support; Focusrite |
| Шкаф с одеждой | Одно из лучших мест в доме: одежда гасит отражения со всех сторон | FilmThreat; Shutterstock |
| Одеяла | Одеяло за спиной, на столе и на стене перед лицом. Это «форт», с которого начинали Pacific Content. Отражения гасит, от улицы не изолирует | Pacific Content; Gearspace |
| Проверка комнаты | Хлопнуть в ладоши: звенящий хвост — значит, много голых поверхностей | Billo |
| Проверка до и после | Записать одну фразу на месте сейчас и в шкафу или под одеялом, сравнить хвосты | [Вывод] |

[Вывод] Для автора самый дешёвый выигрыш — iPhone в 10–15 см, Lossless, режим «Стандартный», в шкафу или под
одеялом. Это бьёт в пункты 1, 2 и 4: эффект близости даёт плотность, а 2–5 кГц доходят без потерь на комнату.

## 3. Недорогое железо (цены — агрегатор Equipboard по магазинам США и ЕС, 2026-10-22)

**Почему динамический микрофон.** У конденсатора чувствительность выше, и он «подчёркивает недостатки комнаты».
Кардиоидный динамический на 5–10 см берёт рот, а комнату почти не слышит. Эффект близости даёт тёплый низ,
лишнее срезается фильтром низа. Комнату магически не отсекает никто: работают дистанция и окружение
(Shure 2025-02-01; Sweetwater; мануал MV7 — 2,5–15 см).

| Класс | Модель | Цена | Заметка |
|---|---|---|---|
| USB/XLR динамический | Fifine AmpliGame AM8 | $48–57 | самый дешёвый вариант |
| | **Audio-Technica ATR2100x-USB** | Amazon $69,99 · Sweetwater $78,99 · B&H $79 | USB-C + XLR; стойка в комплекте хлипкая |
| | Maono PD200X | ~$70 {{проверить}}; ЕС €57–61 | |
| | Fifine K688 | $72,99 (официальный магазин) | USB-C + XLR |
| | **Samson Q2U** | Amazon $79,99 · B&H $99,99 | USB + XLR |
| | Shure MV6 | $169 | USB-C, автоуровень |
| | Rode PodMic USB | $190 | встроенный DSP: фильтр низа, гейт, компрессор |
| | Shure MV7X | $199 | только XLR, нужен интерфейс |
| | Shure MV7+ | $249–299 | USB-C + XLR |
| Петличка | Rode smartLav+ | $39–69 | TRRS в телефон |
| | Rode Lavalier II | $79–102 | 3,5 мм TRS |
| | DJI Mic Mini | $59 (1 передатчик + приёмник) | на 2026-10-22 нет в наличии |
| | Rode Wireless Micro | $86 | USB-C |
| | Hollyland Lark M2S | $89–99 | |
| Для сравнения: USB-конденсатор | Rode NT-USB Mini / Blue Yeti | $79–109 / $110–140 | в необработанной комнате берут больше комнаты |
| Аксессуары | пантограф ~$20, комплект «пантограф + поп-фильтр» ~$30 | {{проверить}} | пантограф снимает вибрации стола |

Петличка — всенаправленный конденсатор, но всегда на одной дистанции (15–20 см от рта). В комнате она часто
лучше ноутбука, но хуже динамического микрофона в 5–10 см [Вывод].

## 4. Классическая обработка (DSP) — голос остаётся своим

| Шаг | Типичное для мужского голоса | Под эту запись (из диагностики) |
|---|---|---|
| Фильтр низа (HPF) | 70–100 Гц, 12 дБ/окт | 80 Гц: основной тон мужского голоса ~100–125 Гц, ниже 60 Гц полезного нет |
| Шумоподавление | мягко, до компрессора | `afftdn nr=10`: шум не главная беда, сильнее давить вредно |
| Против бубнёжа | −2…−4 дБ в зоне 200–500 Гц | −3 дБ на 120 Гц, **−6 дБ на 330 Гц** (ширина 1,6 октавы), −2 дБ на 560 Гц |
| Присутствие | +1…+3 дБ на 3–5 кГц | +3 дБ на 2 кГц (заполнить провал), +3 дБ на 3,5 кГц |
| Воздух | полка +1…+2 дБ от 10–12 кГц | полка +3 дБ от 9 кГц: выше 12 кГц сигнала почти нет, тянуть оттуда нечего |
| Экспандер (не гейт) | глубина 6–12 дБ | **нужен**: компрессор поднимает хвосты комнаты на ~9 дБ (замер ниже) |
| Компрессор | ratio 2–4, атака 5–10 мс, релиз 50–150 мс, сжатие ~4 дБ | порог −26 дБ, ratio 3, атака 8 мс, релиз 120 мс |
| Диэссер | 5–8 кГц | `deess.py --pct 90 --max 6`, как сейчас |
| Громкость | Shorts/Reels −14 LUFS, true peak −1 dBTP | делает `mix.py` |

Источники типичных значений: mixinggpt 2026, vocalfy, orphiq, Pulsar Audio, forasoft 2026-06-05.

**Готовая цепочка** (вариант C из проб). Предусиление `volume` подбирается так, чтобы речь оказалась около
−20 LUFS: для этой записи +14 дБ. Для новой записи — `−20 − (её LUFS)`, иначе пороги поедут.

```
ffmpeg -i in.wav -af "volume=14dB,highpass=f=80:p=2,afftdn=nr=10:nf=-62:tn=1,\
equalizer=f=120:t=q:w=1.4:g=-3,equalizer=f=330:t=o:w=1.6:g=-6,equalizer=f=560:t=q:w=2:g=-2,\
equalizer=f=2000:t=q:w=1.2:g=3,equalizer=f=3500:t=o:w=1.5:g=3,highshelf=f=9000:g=3,\
agate=threshold=0.016:ratio=3:range=0.25:attack=2:release=35:knee=2,\
acompressor=threshold=-26dB:ratio=3:attack=8:release=120:knee=4" -c:a pcm_f32le eq.wav
uv run --script tools/deess.py eq.wav vo_proc.wav --pct 90 --max 6     # дальше mix.py, как обычно
```

Место в конвейере: после склейки дублей, до `deess.py`. После перехода на микрофон ближе снова снять спектр и
ослабить EQ: на сухой близкой записи −6 дБ на 330 Гц может оказаться лишним.

**Чем бесплатное хуже профессионального.** В ffmpeg **нет де-ревербератора** (фильтры только добавляют
реверберацию); `afftdn`/`anlmdn` — для стационарного шума, сильнее давить — «вода»; `deesser` не задаётся в Гц
(лучше `deess.py` или `adynamicequalizer`); `alimiter` — по сэмплу, не true peak; `loudnorm` точен в два прохода.
Платные: iZotope RX 12 Elements $99 (De-reverb {{проверить}}) / Standard $399 (Dialogue Isolate) / Advanced $1399;
Supertone Clear $69–99 (шум и реверберация, нативно Apple Silicon); FabFilter Pro-Q 4 ~$199 {{проверить}}.
iZotope: де-реверб — несколькими мягкими проходами (izotope.com, 2024-04-17).

## 5. Нейросетевое улучшение (не синтез, но может «пластиковать»)

| Инструмент | Цена | Локально на Mac M | Тембр и риски | Лицензия |
|---|---|---|---|---|
| Adobe Podcast Enhance Speech (V1/V2) | бесплатно: ≤30 мин на файл, 1 ч обработки в день, **без ползунка силы**. Premium — в составе Firefly Pro {{проверить}} | нет, веб | убирает эхо, но пересинтезирует голос: шепелявость на глухом исходнике, «роботность», выдуманная фактура в паузах, лишний бас [М] | закрытая |
| Auphonic | 2 ч в месяц бесплатно; платно от ~$11 за 9 ч {{проверить}} | нет, облако | фильтрующий подход, ползунки Remove Noise / Reverb, Voice AutoEQ, Leveler. Натуральнее Adobe [М]. Новый Studio Voice (бета, 2026-07-21) — генеративный | закрытая |
| Descript Studio Sound | бесплатно ~60 мин в месяц; платно $16–35 {{проверить}} | нет | на 100 % «как из-под воды»; советуют ~50 % [М] | закрытая |
| Krisp | 7 дней пробно; от $8 в месяц | виртуальный микрофон в реальном времени | сделан для звонков, не для постобработки | закрытая |
| ElevenLabs Voice Isolator | Free ≈10 мин в месяц **без коммерческой лицензии**; Starter $6 | нет | убирает шум без явных искажений, пропускает щелчки [М] | закрытая |
| DeepFilterNet 3 | бесплатно | **да**: готовый бинарь `deep-filter` aarch64-darwin 26,6 МБ (v0.5.6, 2023) или колесо `deepfilternet-slim` 11,9 МБ без PyTorch | вычитающий, почти не портит чистую речь (PESQ 4,48 из 4,64). Естественнее с потолком `--atten-lim 12–40 дБ`. Реверберацию не убирает | MIT / Apache-2.0 |
| Resemble Enhance | бесплатно | с трудом: Python 3.10, сборка deepspeed, MPS не документирован; веса ~810 МБ | `--denoise_only` безопасен; полный enhance генеративный — жалобы «меняет слова», плохо на не-английском. Для русского риск | MIT |
| VoiceFixer | бесплатно | только CPU (CUDA в документации), Docker ~10 ГБ | вокодер пересобирает голос; для сильно повреждённой речи | MIT |
| Demucs (htdemucs) | бесплатно | CPU ≈1,5× длительности | сделан для музыки; эхо комнаты не уберёт | MIT (репозиторий в архиве) |
| ClearerVoice (MossFormer2 48k) / SGMSE+ (есть модель против реверберации) | бесплатно | не описано {{проверить}}; чекпойнт 222 МБ / исследовательский код | отзывов о тембре нет | Apache-2.0 / MIT |
| Apple: Final Cut Pro Voice Isolation | платно {{проверить}} | да | ползунок Amount; Apple сама предупреждает о «каше» при наложении нескольких изоляций | — |

**Где граница «улучшил» → «звучит как ИИ»** [Вывод по источникам]
- **Вычитающие** (DeepFilterNet, Auphonic Static/Dynamic, RNNoise) убирают шум, голос не пересобирают — тембр
  сохраняется. **Генеративные** (Adobe, Studio Sound, Resemble enhance, VoiceFixer, Auphonic Studio Voice) рисуют
  голос заново: «студийнее», но пластик — от них.
- **Правила:** минимальная сила (Adobe, Descript — 30–50 %); бесплатный Adobe без ползунка — смешивать с оригиналом
  (60–90 % обработанного); **не ставить два генеративных подряд**; восстановление — до компрессора; слушать
  шепелявые согласные, обрубленные вдохи, «качание» тихих слов — в наушниках и на телефоне.
- Данных о качестве на **русской** речи не нашёл ни для одного инструмента — проверять на своём дубле.

**Что делают авторы без студии** (задокументированные примеры; чистых цепочек именно Shorts-авторов не нашёл)
MacBook Air → Adobe Enhance → EQ против лишнего баса (kirkville.com, 2022/2023) · iPhone → Adobe Podcast → WAV в
Premiere без EQ (jimbabbage.photography) · петличка в эхе → DeReverb 30 % + EQ + компрессор или Adobe, смешанный
с оригиналом на 60–90 % (форум Adobe, 2024) · Descript Studio Sound с ~50 % (Podcasting Business School).

## 6. Рекомендация — лестница

| Ступень | Что сделать | Что даст |
|---|---|---|
| **Сегодня, бесплатно** | iPhone, Lossless, режим «Стандартный», 10–15 см, шкаф или одеяла; уровень записи выше. Потом цепочка C, `deess.py`, `mix.py`. Опционально — DeepFilterNet с `--atten-lim 12` (нужно скачать бинарь 26,6 МБ) | тон и часть комнаты |
| **~$30–100** | ATR2100x-USB ($70–79) или Samson Q2U ($80–100) на 5–10 см + пантограф ~$20 {{проверить}} + поролон. Альтернатива — smartLav+ ($39–69) в iPhone. Из софта — Supertone Clear $69–99 или RX 12 Elements $99 против реверберации | основная ступень: комната уходит при записи |
| **Максимум** | Shure MV7+ ($249–299) или PodMic USB ($190); 2–4 акустические панели или ширма за спиной {{проверить}}; RX 12 Standard $399 (Dialogue Isolate); Auphonic на платном тарифе без Studio Voice | «студия» без пересинтеза |

## Источники (обращение 2026-10-22, если не указано иное)

- Shure, Choosing a microphone for podcasting (2025-02-01): https://www.shure.com/en-MEA/insights/choosing-a-microphone-for-podcasting
- Shure MV7 manual: https://pubs.shure.com/view/guide/MV7/en-US.pdf · Sweetwater: https://www.sweetwater.com/insync/inverse-square-law/ , https://www.sweetwater.com/insync/best-microphones-for-recording-vocals-at-home/
- iPhone: https://gitbook.brown.edu/bai-creative-technology/guides/podcasting/iphone-smartphone-podcasting-cheat-sheet/using-your-phone-to-record · BGR (2026-07-04): https://www.bgr.com/2203479/hidden-iphone-voice-memo-features-using/ · https://discussions.apple.com/thread/256245016 · https://www.macobserver.com/tips/round-ups/how-to-use-studio-sound-ios-27-voice-memos/
- Режимы микрофона Mac: https://support.apple.com/en-kz/guide/mac-help/mchle82b42f0/mac · https://support.focusrite.com/hc/en-gb/articles/15437020104082
- Комната: https://filmthreat.com/features/how-to-record-voiceover-at-home-indie-filmmakers-acoustic-guide/ · https://pacific-content.com/blanket-forts-and-pantyhose/ · https://help.billo.app/en/articles/6562955-creator-education-tips-for-good-audio-quality
- Цены (Equipboard): https://equipboard.com/items/audio-technica-atr2100x-usb · https://equipboard.com/items/samson-q2u · https://equipboard.com/brands/fifine · https://fifinemicrophone.com/products/fifine-k688 · https://equipboard.com/items/shure-mv6-usb-gaming-microphone · https://equipboard.com/items/rode-podmic-usb-dynamic-broadcast-microphone · https://equipboard.com/items/shure-mv7x · https://equipboard.com/items/shure-mv7-hybrid-podcast-microphone · https://equipboard.com/items/rode-smartlav · https://equipboard.com/items/rode-lavaliere-ii · https://store.dji.com/product/dji-mic-mini · https://equipboard.com/items/rode-wireless-micro-usb-c-wireless-microphone-system · https://equipboard.com/items/hollyland-lark-m2s-wireless-system-with-usb-c-plug · https://equipboard.com/items/rode-nt-usb-mini · https://equipboard.com/items/blue-microphones-yeti-usb-microphone
- EQ и компрессия: https://mixinggpt.com/blog/how-to-eq-vocals-2026 · https://vocalfy.com/blog/how-to-eq-vocals/ · https://orphiq.com/resources/vocal-eq-cheat-sheet · https://pulsar.audio/wp-content/uploads/2024/05/Vocal-EQ-Compression-Cheat-Sheet-Pulsar-Audio.pdf · LUFS (2026-06-05): https://www.forasoft.com/learn/audio-for-video/articles-audio/lufs-targets-per-platform-2026
- ffmpeg: https://ffmpeg.org/ffmpeg-filters.html · https://en.pyvideotrans.com/blog/ffmpeg-nosie · rnnoise-модели: https://github.com/GregorR/rnnoise-models
- Платный софт: https://www.izotope.com/en/products/rx.html · https://www.izotope.com/en/learn/reducing-reverb (2024-04-17) · https://supertone.ai/clear
- Adobe: https://podcast.adobe.com/en/guides/whats-new-in-adobe-podcast-march-2026 (2026-03-05) · https://podcast.adobe.com/en/guides/what-is-enhance-speech · https://gauravtiwari.org/adobe-podcast-review/ (2026-09-21) · https://kirkville.com/adobes-speech-enhancement-tool-is-a-game-changer-for-podcasters/ · https://community.adobe.com/t5/premiere-pro-discussions/tips-on-improving-audio-lav-mic-came-out-echoey/td-p/14755061
- Auphonic: https://auphonic.com/pricing · https://auphonic.com/help/algorithms/singletrack.html · https://auphonic.com/blog/2026/07/21/studio-voice-beta/
- Descript: https://help.descript.com/hc/en-us/articles/10327603613837-Studio-Sound · https://www.skool.com/podcastingbusinessschool/tech-tip-for-the-week-editing-in-descript-edition-2
- Krisp: https://krisp.ai/pricing/ · ElevenLabs: https://elevenlabs.io/pricing · https://help.elevenlabs.io/hc/en-us/articles/26446706351377-How-much-does-Voice-Isolator-cost
- Открытые: https://github.com/rikorose/deepfilternet · https://github.com/Rikorose/DeepFilterNet/releases/tag/v0.5.6 · https://pypi.org/project/deepfilternet-slim/ · сравнение (2026-09-30): https://www.creativeainews.com/articles/deepfilternet-vs-rnnoise-vs-ffmpeg-noise-removal-2026/ · https://github.com/resemble-ai/resemble-enhance · https://github.com/haoheliu/voicefixer · https://github.com/facebookresearch/demucs · https://github.com/modelscope/ClearerVoice-Studio · https://github.com/sp-uhh/sgmse
- Общие правила ИИ-улучшения (2026-08-26): https://diyai.io/ai-tools/audio-generation/best-ai-audio-enhancers/ · FCP: https://support.apple.com/kb/PH12584
