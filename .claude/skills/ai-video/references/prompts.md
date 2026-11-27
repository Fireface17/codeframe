# Как писать промпты для кадров и клипов

Собрано по руководствам к Seedance 2.0 и Nano Banana Pro (источники внизу) и по замерам на серии роликов. Принимать — `qa.md`, здесь — как просить.

## Стартовый кадр (Nano Banana Pro) — как фотография, а не «CGI»

Шаблон из руководства Google: вид плана → герой и поза → место → свет → камера и объектив → фактуры → формат.

1. **Начинать со слов «A photorealistic photograph»** и вида плана (tight close-up, high-angle medium shot…). Формула «High-end
   photorealistic CGI like a premium commercial» даёт мультяшную гладкость — её не писать.
2. **Камера и объектив конкретно:** `full-frame mirrorless camera, 50mm lens at f/2.8, eye level`. Слова «8k, masterpiece, ultra detailed» ничего не дают.
3. **Свет — отдельной строкой и конкретно:** откуда, какой, какого цвета (`soft overcast daylight through the windows on the left,
   warm ceiling strip lights`). По официальному руководству Seedance свет влияет на качество сильнее любых слов о стиле.
4. **Фактуры:** `real fur with individual hairs, natural catchlights in the eyes, worn rubber floor, wool coat texture, subtle film grain`.
5. **Размер героя числом:** `the character's head takes up about 40 percent of the frame height`. Без числа модель даёт общий план.
6. **Каждый предмет назван один раз и точно:** цвет, материал, где лежит. Чего в кадре быть не должно — в конце после `Avoid:`.
7. **Надписей в кадре нет.** Всё, что нужно прочитать, рисуется поверх при монтаже: модель перерисовывает и коверкает текст.
8. **Кадр-образец (`image_references`) копирует композицию.** Давать его только когда точка съёмки та же; для нового ракурса — описывать место словами.

## Клип (Seedance 2.0, из стартового кадра) — описывать движение, а не картинку

1. **Не пересказывать кадр.** Модель его видит; повторное описание внешности снижает связность. В промпте — что движется, как, в каком порядке, и что остаётся неподвижным.
2. **Каждая движущаяся деталь названа:** лапы, уши, глаза, хвост, руки, предметы. Для каждой — глагол и результат
   (`the briefcase bumps the ring, the ring dents slightly and springs back`).
3. **Точки опоры:** за что держится, на чём стоит — тогда у тела есть вес.
4. **Порядок событий словами:** `first… then… finally`. Одно главное действие на клип, не больше трёх шагов.
5. **Движение плавное:** `slowly, gently, softly` работают лучше резких слов; одновременных сложных действий не просить.
6. **Камера названа:** `locked-off static camera`. Одно движение камеры или ни одного.
7. **Что не меняется — строкой `Keep unchanged:`** (предметы на герое, цвет, фон, число людей).
8. **Запреты пишутся в самом промпте:** `no talking, no music, no text, no faces`. Отдельного поля для них нет.
9. **Длина клипа — 4 секунды.** По замерам клипы по 4 с выходят без повторов кадров в 8 случаях из 10, по 5 с — почти никогда.
10. **Реплика — короткая, одна на клип,** звук подаётся образцом (`audio_references`); в ролик ставится исходная озвучка, выставленная по рту.
11. **Объём — 60–120 слов.** Длиннее модель начинает пропускать части.

## Источники
- fal.ai — Seedance 2.0 Prompting Guide: https://fal.ai/learn/tools/seedance-2-0-prompting-guide
- Atlabs — Seedance 2.0 Prompting Guide: https://www.atlabs.ai/blog/seedance-2.0-prompting-guide-how-to-write-like-a-director-using-atlabs
- NemoVideo — Seedance 2.0 Prompt Guide: https://cn.nemovideo.com/blog/seedance-2-0-prompt-guide
- Creative Tim — шпаргалка по Seedance (про свет): https://www.creative-tim.com/ui/cheatsheet/seedance
- VEED — Nano Banana Pro Prompting Guide: https://www.veed.io/learn/nano-banana-pro-prompts
- iPentec — шаблон фотореалистичного промпта из руководства Google: https://www.ipentec.com/document/ai-image/nano-banana-pro-prompt-note
- flick.art — фактуры и «неидеальная камера»: https://flick.art/docs/Image-Generation-prompts
