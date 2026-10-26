# After Effects: как правильно работать (автоматизация, Claude, MCP, связка с кодом)

Исследование 2026-10-20 по документации Adobe, docsforadobe.dev и свежим источникам. Часть 1 — сам AE и его
автоматизация, часть 2 — AE вместе с Claude (MCP, скиллы, md, связки). **[форум]** — сторонний источник,
**[не проверено]** — подтвердить не удалось.

## Коротко

- Актуальная версия — **AE 26.5** (сентябрь 2026), нативно на Apple Silicon, macOS 14+, от 16 ГБ памяти.
  Подписка ~$22.99/мес при годовом договоре или $34.49 помесячно; в РФ Adobe не продаёт с 2022.
  **На этом Mac AE не установлен.**
- Автоматизация сегодня: **ExtendScript (.jsx, ES3) → `osascript` DoScriptFile → `aerender` → ffmpeg**.
  UXP для AE — только бета (API «Since 27.0»). Ключ `-r` у `afterfx` — только Windows. Нативного `JSON` в
  ExtendScript нет — подключать json2.js.
- Надёжная схема для агента: JSON-спецификация сцены → универсальный `build.jsx` → `.aep` → `aerender`
  (мастер ProRes 4444 с альфой) → ffmpeg под площадки. Данные в AE без скриптов: JSON как footage → `sourceData`.
- Мосты из нашего движка: **SVG** (с 26.0 импорт, с 26.3 вставка как редактируемые shape-слои; текст — в кривые),
  **ProRes 4444 с альфой** (наложение), **Lottie** (импорт плагином LottieFiles; Bodymovin в AE 26 ломает градиенты).

## Claude ↔ After Effects: что официально

- **Higgsfield (официально от Higgsfield, 21.07.2026):** плагин для AE 2024+ и Premiere + MCP-мост
  `bridge.higgsfield.ai/mcp`. Через него Claude работает в открытом проекте: композиции, слои, ключи, эффекты,
  выражения, повтор дизайна по картинке и анимации по видео-референсу, импорт генераций Higgsfield на таймлайн;
  результат — редактируемый проект AE. Нужен аккаунт Higgsfield (кредиты) и интернет. Источник:
  https://higgsfield.ai/blog/higgsfield-after-effects
- **Anthropic + Adobe (официально, 28.04.2026):** коннектор «Adobe for creativity» в Claude — 50+ инструментов
  Creative Cloud (Photoshop, Premiere, Express и др.), **After Effects в нём нет**. Источник:
  https://www.anthropic.com/news/claude-for-creative-work
- Собственного MCP-сервера для AE у Adobe нет; встроенный в AE AI Assistant (бета с 08.09.2026) снаружи недоступен.
- Совместного анонса Anthropic + Higgsfield + Adobe не найдено: Higgsfield подключается к Claude как обычный коннектор.

## Решения и статус (2026-10-20)

- Путь Claude ↔ AE, когда появятся AE и подписка Higgsfield: **мост Higgsfield** (официальный).
  Без Higgsfield — **kumoproductions/mcp-aftereffects** (MIT, без панели и сетевого порта, eval выключен по
  умолчанию, режим только чтения; нужен Node 24+):
  `claude mcp add --scope user --env AE_MCP_READONLY=1 --transport stdio aftereffects -- npx -y @kumoproductions/mcp-aftereffects`.
  Запасные: solomondivyananth/aftereffects-mcp (лучшая защита, ставить только из исходников),
  Engine-Room-Games/after-effects-mcp (плагин Claude Code со скиллами, только AE 2026).
- Не ставить: Dakkshin/after-effects-mcp (заброшен, приманка в issues), Volumetenrectify/ae-motion-compiler
  (приманка без кода), IMT (некоммерческая лицензия).
- Ничего не установлено: ни AE, ни MCP — по решению автора после покупки AE.
- Репозитории по теме склонированы: `refs/repos/`, приоритет R в `refs/repos.json`, группы «AE: MCP и мосты»,
  «AE: скиллы и md», «AE: скриптинг и инструменты», «Adobe: другие программы и облако», «Lottie».

---

# Часть 1. After Effects и автоматизация

Проверено 2026-10-20 через веб. Пометка **[форум]** = источник — форум или сторонний сайт, не документация Adobe. **[не проверено]** = подтвердить не удалось.

### Общая картина

- Актуальный релиз — **AE 26.5 (сентябрь 2026)**. Ветка 27.0 пока только в бете.
- UXP для AE существует **только как бета**: в документации Adobe у всех методов указано «Since 27.0». Поэтому сегодня рабочая связка такая: **ExtendScript (.jsx, ES3) → запуск через `osascript` → рендер `aerender` → дожим `ffmpeg`**.
- Для агента лучше всего работает схема «spec → сборщик»:
  1. агент пишет JSON-описание сцены;
  2. универсальный `build.jsx` по этому описанию собирает `.aep`;
  3. `aerender` рендерит мастер (ProRes 4444 с альфой или ProRes 422);
  4. ffmpeg делает файлы под соцсети.
- Обмен с кодом: в AE — через JSON как footage (`sourceData`), импорт Lottie (плагин LottieFiles) и вставку SVG (26.3+). Из AE — через экспорт в Lottie (LottieFiles/Bodymovin) или собственный .jsx-экспорт ключей в JSON.

---

### 1. Версия, требования, подписка, новое

**Версии 2026 года**
- **26.0 (январь 2026):** материалы Substance 3D, 3D-меши, анимация осей вариативных шрифтов, импорт SVG, эффект Unmult, сжатый дисковый кэш ([CG Channel](https://www.cgchannel.com/2026/01/adobe-releases-after-effects-26-0-with-native-substance-support/), [Newsshooter](https://www.newsshooter.com/2026/01/22/whats-new-in-adobe-after-effects-26-0/)).
- **26.2 (апрель 2026):** ИИ-инструмент Object Matte.
- **26.3 (июнь 2026):**
  - вставка Illustrator/SVG как **нативных редактируемых shape-слоёв**;
  - глубина резкости в Advanced 3D, ускоренный Mask Tracker;
  - «Copy frame to clipboard», эффект Curl Noise ([PVC, август 2026](https://www.provideocoalition.com/after-effects-portal-august-2026/)).
- **26.5 (9–10 сентября 2026):** новые направляющие, дисковый кэш для Object Matte, переделанная панель Effect Controls, цветные метки эффектов, ACES 2.0 / OCIO 2.5.1 ([CG Channel](https://www.cgchannel.com/?p=178609), [Wikipedia](https://en.wikipedia.org/wiki/Adobe_After_Effects)).
- **В бете:** агентный **AI Assistant**. Он управляет AE командами на естественном языке: наводит порядок в проекте, работает с выражениями, генерирует изображения и видео. В бете бесплатен, но с дневным и недельным лимитом; лучше всего понимает английский ([CG Channel](https://www.cgchannel.com/?p=178609), [PVC](https://www.provideocoalition.com/after-effects-portal-august-2026/)).
- **Adobe MAX 2026** — 10–12 ноября, Майами ([события](https://www.bounteous.com/events/2026/11/10/adobe-max/)). Выход 27.0 с UXP примерно к этой дате — **[предположение]**.

**Что нового в API (важно для скриптов)** — по [журналу изменений скриптинга](https://ae-scripting.docsforadobe.dev/introduction/changelog/):
- 25.4: `app.restart()`;
- 26.0: `PropertyGroup.addVariableFontAxis()`, `Property.propertyParameters`, `Property.valueText`;
- 26.3: `LayerCollection.addParametricMesh()`;
- 26.5: `GuideOptions`, `Property.setInputLayerAndStage()`.

В выражениях с 26.0 появились `Property.previousKey()` / `nextKey()`, `Dropdown Menu.items/.text` и `fontAxis[Tag]` ([журнал изменений выражений](https://ae-expressions.docsforadobe.dev/introduction/changelog/)).

**Mac (Apple Silicon)**
- AE работает на Apple Silicon нативно ([Adobe KB](https://helpx.adobe.com/after-effects/kb/after-effects-apple-silicon.html)).
- Для версий 26.0/26.2: macOS Sonoma 14 или новее, минимум 16 ГБ памяти, 8 ГБ места под установку. Рекомендуется M1 Pro / Max / Ultra или новее ([системные требования](https://helpx.adobe.com/after-effects/system-requirements.html)). M5 подходит.
- macOS Tahoe 26: официальных проблем не найдено. Есть один пользовательский отчёт о сбоях GPU на Tahoe 26.6 **[форум]** ([тема](https://community.adobe.com/bug-reports-528/gpu-acceleration-failing-on-macos-tahoe-26-6-after-effects-crashes-effects-not-loading-preview-frozen-broken-video-files-1635393)).

**Цена** — только подписка:
- отдельное приложение — около $22.99 в месяц при годовом договоре, $34.49 помесячно, $263.88 за год предоплатой ([CG Channel](https://www.cgchannel.com/?p=178609), [обзор цен](https://photutorial.com/after-effects-pricing));
- All Apps — около $54.99 в месяц **[проверить на adobe.com]**.

Продажи в РФ приостановлены с марта 2022 ([iMore](https://www.imore.com/adobe-ceases-all-new-sales-russia-citing-attack-ukraine)). Есть сообщения 2026 года об отключении подписок **[форум, не проверено]**.

**Альтернатива для сравнения:** Cavalry теперь **бесплатен для частных лиц** (принадлежит Canva). Работает нативно на Apple Silicon, экспортирует Lottie, нужен аккаунт Canva ([cavalry.studio](https://cavalry.studio/en/)).

---

### 2. Скриптинг и автоматизация

#### 2.1 ExtendScript (.jsx) — основной путь
- **Жив и развивается:** API пополняется в каждом релизе, вплоть до 26.5 ([журнал изменений](https://ae-scripting.docsforadobe.dev/introduction/changelog/)).
- **Язык — ECMAScript 3:** нет `let`/`const`, стрелочных функций, шаблонных строк. Для выражений это прямо сказано в [документации Adobe](https://helpx.adobe.com/after-effects/using/legacy-and-extend-script-engine.html). Скрипты исполняются в ExtendScript, даже если в проекте для выражений выбран движок JavaScript **[форум]**.
- **Нативного `JSON` нет.** Его подмешивает панель Libraries, поэтому иногда он «есть», а иногда «пропал». Инженер Adobe советует подключать свой: [json2.js](https://github.com/douglascrockford/JSON-js) (Public Domain) ([тема](https://community.adobe.com/t5/after-effects-discussions/unexpected-removal-of-json-object-in-scripting/m-p/15250029)).
- **Файлы:** `.jsx` в UTF-8; `.jsxbin` совместим не со всем.
- **Запись файлов и сеть** работают только при включённой настройке «Allow Scripts To Write Files And Access Network». В документации она указана в *Preferences → General*; в новых версиях раздел, вероятно, называется *Scripting & Expressions*, а в 26.0 настройки реорганизовали — **[проверить на месте]** ([обзор](https://ae-scripting.docsforadobe.dev/introduction/overview/)).
- **Отладка:** ESTK устарел. Используйте [ExtendScript Debugger для VS Code](https://extendscript.docsforadobe.dev/vscode-debugger/) версии 2.x: с 2025 года он нативен для Apple Silicon, но формат `launch.json` у v2 другой ([форум](https://community.adobe.com/t5/indesign-discussions/vs-code-extendscript-debugger-update-requested/m-p/15372954)).
- **Документация:** официального «Scripting Guide» у Adobe больше нет. Фактический справочник — общественный [ae-scripting.docsforadobe.dev](https://ae-scripting.docsforadobe.dev/) (контент © Adobe).

#### 2.2 Запуск скрипта из терминала macOS
Ключ `afterfx -r script.jsx` (запуск в уже открытом AE) и `-s "код"` описаны **только для Windows** ([обзор](https://ae-scripting.docsforadobe.dev/introduction/overview/)). На Mac запуск идёт через AppleScript-команды `DoScript` и `DoScriptFile`:

```bash
## имя приложения зависит от версии: "Adobe After Effects 2026"
osascript -e 'tell application "Adobe After Effects 2026" to DoScriptFile "/Users/me/ae/build.jsx"'
## вариант с текстом скрипта:
osascript -e 'tell application "Adobe After Effects 2026" to DoScript "$.evalFile(\"/Users/me/ae/build.jsx\")"'
## обход ошибок прав доступа AE 2024 (форум): JXA
osascript -l JavaScript -e 'Application("Adobe After Effects 2026").doscriptfile("/Users/me/ae/build.jsx")'
```

Нюансы:
- В AE 2024 `DoScriptFile` падал с ошибками прав. Adobe пишет, что в 2025 «работает как ожидалось» ([баг-репорт](https://community.adobe.com/bug-reports-528/macos-command-line-applescript-doscriptfile-not-working-for-ae2024-1215737)).
- Терминалу или Claude Code нужно разрешение macOS «Автоматизация» на управление AE.
- Параллельные вызовы для нескольких проектов роняют интерфейс AE **[форум]**: вызывайте последовательно.
- Результат работы скрипт пишет в JSON-файл, агент читает его. Модальные окна подавляются через `app.beginSuppressDialogs()`; не используйте `alert()`. `app.exitAfterLaunchAndEval` работает только в Windows ([Application](https://ae-scripting.docsforadobe.dev/general/application/)).

#### 2.3 `aerender` — рендер из командной строки
Файл `aerender` лежит в папке приложения, например `/Applications/Adobe After Effects 2026/aerender`. Справка — `aerender -help`.

| Флаг | Что делает |
|---|---|
| `-project`, `-teamproject` | проект |
| `-comp`, `-rqindex` | композиция или номер в очереди рендера |
| `-RStemplate` / `-OMtemplate` | шаблоны настроек рендера и модуля вывода |
| `-output` | путь вывода |
| `-s` / `-e` / `-i` | первый кадр / последний (включительно) / шаг |
| `-log`, `-v ERRORS\|ERRORS_AND_PROGRESS` | журнал и уровень сообщений |
| `-close DO_NOT_SAVE_CHANGES\|SAVE_CHANGES\|DO_NOT_CLOSE` | что делать с проектом в конце |
| `-reuse` | рендер в уже запущенном AE |
| `-sound ON` | звук по окончании |
| `-mem_usage` | лимиты памяти |
| `-continueOnMissingFootage` | не останавливаться на отсутствующих файлах |
| `-mfr ON\|OFF max_cpu_percent` | многокадровый рендер (Multi-Frame Rendering) |

Источники: [Adobe](https://helpx.adobe.com/after-effects/using/automated-rendering-network-rendering.html), [копия справки](https://pypi.tcis.de/data/web/json/aerender).

```bash
AE="/Applications/Adobe After Effects 2026/aerender"
## сначала короткий тест
"$AE" -project ~/ae/main.aep -comp "MAIN" -s 0 -e 10 \
  -OMtemplate "High Quality with Alpha" -output ~/out/test.mov -log ~/out/r.log
## полный рендер
"$AE" -project ~/ae/main.aep -comp "MAIN" -RStemplate "Best Settings" \
  -OMtemplate "H.264 - Match Render Settings - 15 Mbps" -output ~/out/main.mp4 \
  -mfr ON 90 -v ERRORS_AND_PROGRESS -log ~/out/r.log
```

- Имена шаблонов должны совпадать **посимвольно**. Список берите в своей установке через `outputModule.templates` ([форум](https://community.adobe.com/t5/after-effects-beta-discussions/feature-focus-exporting-h-264-from-the-after-effects-render-queue-now-available-in-ae-2023/m-p/13885413/highlight/true)).
- Свой шаблон проще один раз создать скриптом: `saveAsTemplate`.
- H.264 прямо из очереди рендера появился с AE 2023. Пресеты до 40 Мбит/с, по умолчанию «…15 Mbps» ([Adobe](https://helpx.adobe.com/after-effects/desktop/render-and-export/export-h-264-from-the-after-effects/exporting-h264-from-the-after-effects-render-queue.html)).
- Коды выхода не документированы: проверяйте наличие файла и журнал ([skill-страница](https://terminalskills.io/skills/after-effects)).
- **Только рендер (render-only):** файл `ae_render_only_node.txt` в `~/Documents/` или `/Users/Shared/Adobe/` запускает AE как Render Engine. Чтобы вернуть обычный режим, удалите файл ([Adobe KB](https://helpx.adobe.com/after-effects/kb/accidental-render-node-launch-ae.html)). На этом режиме построен [nexrender](https://github.com/inlife/nexrender), но его README сам себе противоречит в вопросе лицензии.
- **Media Encoder:** `app.project.renderQueue.queueInAME(true)` (проверка — `canQueueInAME`). AME применяет **последний использованный пресет**, пресет через вызов передать нельзя, события «готово» нет ([RenderQueue](https://ae-scripting.docsforadobe.dev/renderqueue/renderqueue/), [форум](https://community.adobe.com/t5/after-effects/automatic-render-with-extend-script-with-mp4/m-p/11533823)). Агенту надёжнее рендерить мастер через `aerender`, а кодеки (в том числе HEVC) делать ffmpeg.

#### 2.4 UXP для After Effects
- **Документация** опубликована: [developer.adobe.com/after-effects/uxp](https://developer.adobe.com/after-effects/uxp/), исходники в [AdobeDocs/uxp-after-effects](https://github.com/AdobeDocs/uxp-after-effects) (Apache-2.0).
- **Статус:** бета. Подключение — `require("aftereffects")`. Объектная модель повторяет ExtendScript: `CompItem`, `LayerCollection.addShape/addText/addNull/addSolid/precompose`, `Property.setValueAtTime/setValuesAtTimes/setTemporalEaseAtKey/expression/addToMotionGraphicsTemplate`, `RenderQueue`. У всех членов указано «**Since 27.0**» ([LayerCollection](https://developer.adobe.com/after-effects/uxp/after-effects-api/layercollection), [Property](https://developer.adobe.com/after-effects/uxp/after-effects-api/property), [Application](https://developer.adobe.com/after-effects/uxp/after-effects-api/application)). Методы, судя по документации, синхронные.
- **Позиция Adobe (март 2026):** порядок внедрения — Premiere → Media Encoder → AE; «не ждите UXP» ([форум разработчиков](https://forums.creativeclouddeveloper.com/t/when-will-uxp-come-to-after-effect/11777)).
- **Bolt UXP 1.3** «готов для AE, как только Adobe откроет API» ([блог Adobe](https://blog.developer.adobe.com/en/publish/2026/08/building-plugins-faster-with-bolt-uxp-and-bolt-express)).
- **Вывод:** код пишем на ExtendScript, но только через объектную модель, без трюков. Тогда перенос на UXP будет почти механическим.

#### 2.5 CEP-панели
CEP в AE ещё работает. Его вывод из употребления ожидается, но сроков нет ([форум](https://forums.creativeclouddeveloper.com/t/uxp-vs-cep-for-premiere-pro-after-effects-which-should-i-use/10364.md)). Для агента CEP полезен как **постоянный мост**: панель с Node слушает WebSocket и выполняет JSX, без `osascript` на каждый вызов. Пример такой архитектуры — [aftr](https://github.com/Arman-Luthra/aftr) (у него есть и MCP-слой, см. часть 2). Заготовка для своей панели — [bolt-cep](https://github.com/hyperbrew/bolt-cep).

#### 2.6 Надёжный сборщик: фрагмент .jsx (ES3)
```js
#include "json2.js"
(function () {
  app.beginSuppressDialogs(); app.beginUndoGroup("agent build");
  var comp = app.project.items.addComp("MAIN", 1080, 1920, 1, 6, 60); // имя, w, h, PAR, сек, fps
  var shp = comp.layers.addShape(); shp.name = "CARD";
  var g = shp.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group")
             .property("ADBE Vectors Group");
  g.addProperty("ADBE Vector Shape - Rect").property("ADBE Vector Rect Size").setValue([800, 400]);
  g.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue([1, .4, .2, 1]);
  var tr = shp.property("ADBE Transform Group");
  var pos = tr.property("ADBE Position");
  pos.setValuesAtTimes([0, 0.8], [[540, 2300], [540, 960]]);     // все ключи одним вызовом
  var e = new KeyframeEase(0, 85);                                  // скорость, влияние 0.1–100
  pos.setTemporalEaseAtKey(2, [e], [e]);  // Position (пространственное) — 1 ease; Scale — 3
  var rot = tr.property("ADBE Rotate Z"); rot.expression = "wiggle(1.5, 3)";
  var err = rot.expressionError;                                    // "" если всё ок
  var rq = app.project.renderQueue.items.add(comp);
  rq.outputModule(1).applyTemplate("High Quality with Alpha");
  rq.outputModule(1).file = new File("~/out/main.mov");
  app.project.save(new File("~/out/main.aep"));
  app.endUndoGroup();
  var f = new File("~/out/report.json"); f.open("w");
  f.write(JSON.stringify({ok: err === "", exprError: err})); f.close();
  app.endSuppressDialogs(false);
})();
```

Правила:
- Обращайтесь к свойствам по **matchName**: они не зависят от языка интерфейса ([имена для shape-слоёв](https://ae-scripting.docsforadobe.dev/matchnames/layer/shapelayer/)).
- Проверяйте `canSetExpression` и `expressionError` ([Property](https://ae-scripting.docsforadobe.dev/property/property/)).
- После `setSettings` получайте модуль вывода заново: из-за бага объект становится недействительным ([OutputModule](https://ae-scripting.docsforadobe.dev/renderqueue/outputmodule/)).
- Пределы `addComp`: 4–30000 px, 1–99 fps, длительность до 10800 с ([ItemCollection](https://ae-scripting.docsforadobe.dev/item/itemcollection/)).
- Команды меню без API вызываются через `app.executeCommand(id)`. ID зависят от версии; базу ведёт [hyperbrew/after-effects-command-ids](https://github.com/hyperbrew/after-effects-command-ids).
- Для потоковых шаблонов (подставить тексты и медиа, отрендерить) подходит [nexrender](https://github.com/inlife/nexrender) (MIT): job JSON → `aerender` → postrender-действия.

---

### 3. Выражения

- **Движок.** С 16.0 есть движок **JavaScript (ECMAScript 2018)**; Adobe заявляла, что он «до 5× быстрее» ([блог Adobe 2018](https://blog.adobe.com/en/publish/2018/09/13/design-control-performance-improvements-effects-cc)). Старый движок Legacy ExtendScript соответствует ES3. Движок выбирается в Project Settings, старые проекты по умолчанию открываются на Legacy. Различия синтаксиса описаны [здесь](https://helpx.adobe.com/after-effects/using/legacy-and-extend-script-engine.html). Справочник — [ae-expressions.docsforadobe.dev](https://ae-expressions.docsforadobe.dev/).

**Типовые приёмы**
```js
seedRandom(index, true); var w = wiggle(2, 25); [value[0], w[1]];   // wiggle только по Y, стабильный
loopOut("cycle");            // "pingpong" | "offset" | "continue"; на входе — loopIn()
var d = 0.06*(index-1);      // каскад: повтор лидера с задержкой
thisComp.layer(1).transform.position.valueAtTime(time - d);
var r = thisComp.layer("TITLE").sourceRectAtTime(time, false); [r.width+40, r.height+24]; // плашка
var data = footage("scene.json").sourceData; data.title;   // данные из JSON-файла в проекте
```

**Пружина (инерционный перелёт), по Dan Ebberts** ([motionscript.com](http://www.motionscript.com/articles/bounce-and-overshoot.html)):
```js
freq = 3; decay = 5; n = 0;
if (numKeys > 0){ n = nearestKey(time).index; if (key(n).time > time) n--; }
if (n > 0){ t = time - key(n).time; amp = velocityAtTime(key(n).time - .001);
  w = freq*Math.PI*2; value + amp*(Math.sin(t*w)/Math.exp(decay*t)/w); } else value;
```
В той же статье есть «Bounce Back» — отскок с упругостью `e` и гравитацией `g`.

**Данные.** Импортированный в проект JSON доступен через `footage("x.json").sourceData`. CSV/TSV и MGJSON — через `dataValue()`; добавлять файл в композицию не нужно ([Footage](https://ae-expressions.docsforadobe.dev/objects/footage/), [Adobe](https://helpx.adobe.com/fr/after-effects/desktop/animate-in-after-effects/data-driven-animation/data-driven-animations.html)). Это главный мост «код → AE» без скриптов.

**Производительность**
- **Composition Profiler** (иконка-улитка, колонка Render Time) показывает время слоёв, эффектов и **выражений**. Перед замером очистите кэш (Purge) ([Adobe](https://helpx.adobe.com/ro/after-effects/desktop/work-with-compositions/composition-profiler/composition-profiler.html)).
- `posterizeTime(0)` фактически означает «вычислить один раз». С 17.0 выражения с posterizeTime вычисляются один раз на композицию ([журнал изменений](https://ae-expressions.docsforadobe.dev/introduction/changelog/)). Инженер Adobe советует, чтобы ссылки в выражениях оставались «O(1)» **[форум]** ([тема](https://community.adobe.com/t5/after-effects-discussions/do-expressions-use-caching-expression-performance-help/m-p/15548852/highlight/true)).
- Длинные цепочки `valueAtTime` между слоями (больше примерно 4 звеньев) лучше заменить абсолютной индексацией ([PVC](https://www.provideocoalition.com/dmoe6_time/)). Встроенный `velocityAtTime` быстрее ручного дифференцирования **[форум]**.
- `sourceRectAtTime` вместе с motion blur пересчитывается **на каждый сэмпл размытия**, и рендер резко замедляется **[форум]** ([тема](https://community.adobe.com/t5/after-effects-discussions/sourcerectattime-expression-causing-major-performance-issues-with-motionblur/m-p/12582948/highlight/true)).
- Перед экспортом в Lottie или MOGRT тяжёлые выражения запекайте в ключи: *Animation → Keyframe Assistant → Convert Expression to Keyframes*.

---

### 4. Шаблоны и обмен

**MOGRT (Essential Graphics)** — всё создаётся скриптом:
- `prop.addToMotionGraphicsTemplateAs(comp, "Заголовок")` (проверка — `canAddToMotionGraphicsTemplate`);
- `comp.motionGraphicsTemplateName`;
- `comp.exportAsMotionGraphicsTemplate(true, "/path/")` — сначала `project.save()`, иначе AE покажет диалог ([CompItem](https://ae-scripting.docsforadobe.dev/item/compitem/)).

Essential Properties (с 23.6) дают переопределять свойства пре-композиции на каждом её экземпляре ([Frame.io](https://blog.frame.io/2024/04/03/insider-tips-add-new-value-to-after-effects-essential-properties/)). Известная проблема: Premiere v26 на macOS неправильно рендерит сложные MOGRT с пре-композициями и выражениями; обход — импорт `.aegraphic` **[форум, июль 2026]** ([тема](https://community.adobe.com/bug-reports-728/premiere-v26-some-mogrts-faulty-but-work-fine-if-imported-as-aegraphic-1634743)).

**Lottie**
- **Плагин LottieFiles** (версия 4.9.1 от 15.06.2026 по данным aescripts):
  - экспорт через очередь рендера в Lottie JSON, оптимизированный JSON, dotLottie, TGS;
  - **импорт .lottie/.json/.svg в композицию AE**;
  - для части функций нужен аккаунт; бесплатный лимит — 20 МБ / 5 файлов ([документация](https://docs.lottiefiles.com/en/integrations/after-effects.md), [aescripts](https://aescripts.com/lottiefiles/)).
- **Что поддерживается** ([LottieFiles](https://help.lottiefiles.com/supported-after-effects-features)):
  - есть: фигуры, заливки, обводки, трансформации, маски и маттеры (с оговорками), простой time remap пре-композиций;
  - частично: эффекты (только fill, stroke, tint), режимы наложения (multiply, screen, add), текст (базовые свойства);
  - нет: сложные выражения, 3D, большинство эффектов (blur, distort).
- **Bodymovin** (MIT) застрял на 5.12.1 (июнь 2023), совместимость заявлена до AE 2024. В AE 26.0 замечены градиенты, экспортирующиеся чёрно-белыми ([aescripts](https://aescripts.com/bodymovin), [форум](https://community.adobe.com/bug-reports-528/color-gradients-exports-through-bodymovin-as-black-and-white-in-new-ae-26-0-1547625)).
- **Проигрыватель** — [lottie-web](https://github.com/airbnb/lottie-web) (MIT). В пайплайне с Playwright его можно рендерить покадрово.

**SVG и HTML → AE**
- **26.0:** импорт SVG как footage или композиции.
- **26.3:** *Edit → Paste* вставляет SVG из буфера как **нативные shape-слои** ([Adobe](https://helpx.adobe.com/after-effects/desktop/import-files/import-svg-files/import-svg-files.html)). Ограничения: текст нужно перевести в кривые, анимированные и растровые SVG не поддерживаются. Из Illustrator копировать с включённым «Include SVG Code». Вставка больше **не создаёт маски** на выделенном слое — это ломает старые приёмы ([бета-анонс](https://community.adobe.com/announcements-532/new-in-beta-copy-and-paste-illustrator-and-svg-content-as-native-shape-layers-26-3x51-1558094), [баг](https://community.adobe.com/bug-reports-528/illustrator-paste-behavior-changed-in-after-effects-26-3-breaking-existing-mask-based-workflow-1630149)).
- **Платные и альтернативы:** Overlord стоит около $75 ([Battle Axe](https://www.battleaxe.co/overlord/)). Бесплатный [AEUX](https://github.com/google/AEUX) (Apache-2.0) переносит из Sketch/Figma, последний push — 2024 год.
- **HTML** напрямую не импортируется. Варианты: рендер Playwright → PNG-последовательность или ProRes 4444 с альфой → footage; либо SVG-вставка; либо Lottie-мост.

**ProRes 4444 с альфой**
- **Из AE:** очередь рендера → QuickTime, Channels **RGB + Alpha**, кодек **Apple ProRes 4444**. ProRes 422 альфу не держит, H.264 тоже ([Evergreen](https://helpwiki.evergreen.edu/wiki/index.php/Exporting_Video_from_After_Effects)).
- **Тип альфы:** очередь рендера с «Lossless/High Quality with Alpha» даёт premultiplied, пресет AME — straight. В Premiere проверяйте Interpret Footage ([форум](https://community.adobe.com/t5/premiere-pro-discussions/same-animation-file-w-premultiplied-alpha-renders-differently-in-premiere-pro-than-in-after-effects/m-p/11143935/highlight/true)).
- **Сбои рендера ProRes 4444:** отключить аппаратное кодирование ProRes или взять 4444 XQ **[форум]**.
- **Из кода:** `ffmpeg -framerate 60 -i f/%05d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le -alpha_bits 16 out.mov`. Старый тикет: непрозрачная альфа читалась в AE как 254, сейчас помечен исправленным ([trac #8509](https://trac.ffmpeg.org/ticket/8509)).

**Обмен в обе стороны**

| Направление | Способ | Что сохраняется |
|---|---|---|
| Код → AE | JSON-спецификация → `build.jsx` | всё, что умеет API: ключи, ease, выражения, MOGRT |
| Код → AE | JSON как footage → `sourceData` в выражениях | данные и тексты, «живая» привязка |
| Код → AE | Lottie → импорт плагином LottieFiles | вектор и ключи (полнота не проверена) |
| Код → AE | SVG → Paste (26.3+) | статичный вектор |
| AE → код | LottieFiles/Bodymovin → lottie-web | вектор, ключи, часть выражений |
| AE → код | свой .jsx: `keyTime/keyValue/keyInTemporalEase` → JSON | точные ключи и кривые |
| Общая логика | одна функция пружины/ease и в коде, и в выражении | одинаковая динамика движения |

---

### 5. Лучшие практики моушна (кратко)

- **Graph Editor.**
  - Value Graph показывает значения, Speed Graph — скорость. По умолчанию для Position открывается Speed, для Opacity — Value ([Adobe](https://helpx.adobe.com/after-effects/using/speed.html), [интерполяция](https://helpx.adobe.com/after-effects/using/keyframe-interpolation.html)).
  - Точная настройка — через Keyframe Velocity (скорость и влияние; в скрипте `KeyframeEase`).
  - Если X и Y нужно вести отдельно — Separate Dimensions ([School of Motion](https://www.schoolofmotion.com/tutorials/intro-to-the-graph-editor-in-after-effects/)).
- **Пре-композиции и вложение** нужны для порядка рендера и общих трансформаций ([Adobe](https://helpx.adobe.com/after-effects/desktop/work-with-compositions/precomposing-and-nesting/precomposing-nesting-pre-rendering.html)). Для повторного использования одной композиции — Essential Properties с переопределениями.
- **Null-контроллеры.** Через parent передаются позиция, масштаб и поворот, но не прозрачность. Для путей есть *Create Nulls from Paths* ([Adobe](https://helpx.adobe.com/after-effects/desktop/drawing-painting-and-paths/null-controllers/create-nulls-for-positional-properties-and-paths.html)).
- **Организация проекта.** Базовые папки с префиксом `_` (`_Assets`, `_Precomps`, `_Renders`), префиксы типов у слоёв (`TXT_`, `SH_`, `CTRL_`), никаких автоматических имён, повторно используемое — в `.aet` ([vagon](https://vagon.io/blog/tips-for-organizing-your-compositions-in-after-effects), [форум](https://community.adobe.com/questions-529/what-naming-convention-do-you-use-62050)). Для агента это критично: он ищет слои по имени.
- **Motion blur** (*Composition Settings → Advanced*):
  - Shutter Angle по умолчанию 180°, Phase 0;
  - Samples per Frame — минимум сэмплов (используется для 3D и shape-слоёв);
  - Adaptive Sample Limit — максимум сэмплов;
  - больше сэмплов — меньше «ступенек», но дольше рендер ([Adobe](https://helpx.adobe.com/after-effects/desktop/work-with-compositions/composition-settings/composition-basics.html), [форум](https://community.adobe.com/t5/after-effects-discussions/reducing-motion-blur/m-p/11855164/highlight/true)).
  - В HTML-пайплайне 180° соответствуют размытию за половину кадра — так результаты кода и AE совпадут.
- **Многокадровый рендер (MFR)** включён по умолчанию и даёт 1.2–4× ускорения в зависимости от числа ядер ([Adobe](https://helpx.adobe.com/after-effects/using/multi-frame-rendering.html)).
- **Соцсети, вертикаль** 1080×1920.
  - YouTube (официально): MP4, H.264 High, 4:2:0, закрытый GOP длиной в половину частоты кадров, BT.709. Для 1080p — 8 Мбит/с при 24–30 fps и **12 Мбит/с при 60 fps**; AAC 48 кГц; moov в начале файла ([Google](https://support.google.com/youtube/answer/1722171)).
  - Instagram: рекомендуют 30 fps, 60 поддерживается **[сторонние сводки]** ([wyzowl](https://wyzowl.com/social-media-video-specs/)).
  - Схема: мастер ProRes из AE, затем ffmpeg:
    ```bash
    ffmpeg -i master.mov -c:v libx264 -profile:v high -pix_fmt yuv420p -r 60 -b:v 12M -maxrate 16M -bufsize 24M \
      -g 30 -bf 2 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -ar 48000 -movflags +faststart out.mp4
    ```
- **Цвет.** В 26.5 — OCIO 2.5.1 и ACES 2.0 ([Adobe](https://helpx.adobe.com/after-effects/desktop/adjust-colors/opencolorio-and-aces-color-management/opencolorio-aces-color-management.html)). Для графики проще рабочее пространство sRGB/Rec.709, совпадающее с выходным.
  - «Вымытый» H.264 в QuickTime на Mac — давняя проблема. Помогают совпадающие рабочее и выходное пространства и/или опция «Match Legacy After Effects QuickTime Gamma Adjustments» **[форум]** ([тема](https://community.adobe.com/t5/after-effects-discussions/washed-out-colors-on-after-effects-when-rendering-using-macos-high-sierra/m-p/9626863/highlight/true)).
  - Сверяйте результат в QuickTime и в браузере.

---

### 6. Инструменты сообщества
Полный список с лицензиями, звёздами и датами — в `refs/repos.json` (приоритет R, группа «AE: скриптинг и инструменты»). Главное:

- **Документация:** [after-effects-scripting-guide](https://github.com/docsforadobe/after-effects-scripting-guide), [after-effects-expression-reference](https://github.com/docsforadobe/after-effects-expression-reference), [javascript-tools-guide](https://github.com/docsforadobe/javascript-tools-guide). Лицензии у них нет, контент © Adobe: читать можно, копировать в продукт нельзя. Официальная документация по UXP — [AdobeDocs/uxp-after-effects](https://github.com/AdobeDocs/uxp-after-effects).
- **Типы:** [Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe) (MIT, 647★) для скриптов; [expression-globals-typescript](https://github.com/motiondeveloper/expression-globals-typescript) (MIT) для выражений.
- **Сборка .jsx:**
  - [adobe-script-starter](https://github.com/motiondeveloper/adobe-script-starter): TypeScript → ES3 через SWC, **без полифилов**;
  - [rollup-plugin-ae-jsx](https://github.com/motiondeveloper/rollup-plugin-ae-jsx);
  - [create-expression-lib](https://github.com/motiondeveloper/create-expression-lib) — библиотеки выражений в `.jsx`;
  - [Klustre/extender](https://github.com/Klustre/extender) — архив;
  - [rendertom/Include](https://github.com/rendertom/Include) — склейка `#include`;
  - [jsxbin](https://github.com/runegan/jsxbin);
  - `JSON` — [json2.js](https://github.com/douglascrockford/JSON-js).
- **Панели:** [bolt-cep](https://github.com/hyperbrew/bolt-cep), [bolt-uxp](https://github.com/hyperbrew/bolt-uxp) (MIT).
- **Автоматизация:** [nexrender](https://github.com/inlife/nexrender) (MIT, 1.9k★), [after-effects-command-ids](https://github.com/hyperbrew/after-effects-command-ids).
- **Выражения и риг:** [aefunctions](https://github.com/motiondeveloper/aefunctions), [eKeys](https://github.com/motiondeveloper/eKeys) (MIT), [After-Effects-Fun](https://github.com/MysteryPancake/After-Effects-Fun) (MIT). [Duik](https://github.com/RxLaboratory/Duik) — **GPL-3.0**.
- **Бесплатные панели:** Code Runner 2 от Jake In Motion — бесплатно за подписку на рассылку, AE 2021+. Запускает скрипты, применяет выражения, пресеты и ease ([сайт](https://www.jakeinmotion.com/code-runner)).
- **Motion Tools Pro сейчас НЕ бесплатен:** $40 на aescripts, есть пробная версия. Раньше существовала бесплатная версия ([aescripts](https://aescripts.com/motion-tools-pro/)).
- **Осторожно:** [Volumetenrectify/ae-motion-compiler](https://github.com/Volumetenrectify/ae-motion-compiler) (109★, создан в июле 2026, без лицензии, в репозитории нет кода, есть внешняя ссылка «Download») — признаки приманки, **не устанавливать**.

---

### Подводные камни
1. **ES3 в .jsx.** Современный JS из TypeScript нужно транспилировать в ES3 и добавлять полифилы (`Array.prototype.map` и т. п.). Встроенного `JSON` нет: всегда подключайте json2.js.
2. **Настройка записи файлов и сети** выключена по умолчанию. Без неё скрипт молча не напишет отчёт.
3. **`-r` для macOS не документирован.** Только `osascript`, нужно разрешение «Автоматизация», вызовы строго последовательные.
4. **Модальные окна** (alert, «сохранить проект?», отсутствующие шрифты) вешают автоматизацию. Используйте `beginSuppressDialogs`, `project.save()` перед экспортом MOGRT, `-close DO_NOT_SAVE_CHANGES`.
5. **Имена шаблонов вывода** зависят от версии и языка — берите их из `outputModule.templates`.
6. **Отображаемые имена свойств** локализованы — используйте matchName. ID для `executeCommand` тоже меняются от версии к версии.
7. **`queueInAME`** берёт последний пресет AME и не сообщает о завершении работы.
8. **Забытый `ae_render_only_node.txt`** превращает обычный запуск AE в Render Engine.
9. **Lottie:** выражения, эффекты и 3D теряются, а Bodymovin в AE 26 ломает градиенты. Запекайте выражения в ключи и проверяйте Feature Checker.
10. **Вставка SVG в 26.3** больше не создаёт маски — старые приёмы с эффектом Stroke ломаются.
11. **Premultiplied или straight альфа** — частая причина тёмных краёв при наложении.
12. **UXP для AE** — бета (27.0). Не стройте на нём основной пайплайн до публичного релиза.
13. **Проекты из старых версий** открываются на Legacy-движке выражений — переключите его в Project Settings.

### Что не удалось проверить
- Точную дату и состав публичного AE 27.0 и UXP GA. Есть ли в бете 27.0 загрузка UXP-плагинов через UXP Developer Tool.
- Полный актуальный вывод `aerender -help` для 26.5 (help.adobe.com отдаёт 403 для WebFetch).
- Возвращает ли `DoScript` на macOS значение последнего выражения агенту. Работает ли `-r` у бинарника в `Contents/MacOS`.
- Как включить «Allow Scripts…» без интерфейса (ключ в файле Prefs).
- Вставит ли AE SVG, положенный в буфер как простой текст (`pbcopy`), и можно ли вызвать вставку скриптом.
- Насколько полно импорт Lottie плагином LottieFiles превращается в нативные слои и ключи.
- HEVC в очереди рендера AE (найден только H.264).
- Нужен ли установленный AE для MOGRT в Premiere 26.
- Официальные спецификации Instagram и TikTok на 2026 год (только сторонние сводки). Точные цены Adobe и доступность в РФ на 2026 год.

---

# Часть 2. After Effects + Claude: MCP, скиллы, связки

### Общая картина

- **Официального MCP-сервера Adobe для After Effects нет.** Коннектор Adobe for creativity (28.04.2026) покрывает Ps, Ai, Firefly, Express, Premiere, Lr, InDesign и Stock, но не AE ([Adobe](https://blog.adobe.com/en/publish/2026/04/28/adobe-for-creativity-connector), [Anthropic](https://www.anthropic.com/news/claude-for-creative-work)). Свой AI Assistant у AE встроен в программу: публичная бета с 08.09.2026 в отдельной бета-сборке ([Adobe](https://blog.adobe.com/en/publish/2026/09/08/generate-create-directly-in-your-timeline-with-new-ai-powered-innovations-in-premiere-after-effects), [CG Channel](https://www.cgchannel.com/2026/09/adobe-releases-after-effects-26-5-and-new-ai-assistant-in-beta/)). Внешнего API или MCP к нему не нашёл.
- **Сообщество сделало больше 100 MCP-серверов для AE** ([поиск GitHub](https://api.github.com/search/repositories?q=after+effects+mcp), 113 результатов). Почти все созданы в 2026 году, звёзд мало. Устроены они по-разному:
  - CEP-панель в AE плюс HTTP или WebSocket на localhost;
  - файловый «почтовый ящик», который опрашивает панель или Startup-скрипт;
  - `osascript` → `DoScript` / `DoScriptFile` без панели.
  
  Внутри всегда ExtendScript (ES3).
- **Higgsfield сделал свой мост к AE**, коммерческий: плагин AE/Premiere и MCP `bridge.higgsfield.ai/mcp` ([Higgsfield](https://higgsfield.ai/plugins/after-effects)). Это единственная найденная связка «генератор видео ↔ Claude ↔ AE» от самого вендора.
- **Для работы без AE** главные мосты из нашего кода: SVG (AE 26.x импортирует его в родные шейп-слои) и ProRes 4444 с альфой. Lottie AE сам не импортирует.

**Решено:** если появятся AE и подписка Higgsfield — официальный мост Higgsfield (`bridge.higgsfield.ai/mcp`); без Higgsfield основной MCP — kumoproductions/mcp-aftereffects. Запасные — solomondivyananth/aftereffects-mcp и Engine-Room-Games/after-effects-mcp.
**Открыто:** ни один сервер не проверен на M5 и AE 26.x своими руками; надёжность моста Higgsfield никто независимо не описал.

---

### 1. MCP-серверы

#### 1.1. Для After Effects

Звёзды и даты — из GitHub API на 20.10.2026. «Порт» означает сетевой эндпоинт на машине.

| Сервер | ★ / последний push | Как устроен | Что умеет | macOS | Риски | Установка в Claude Code | Оценка |
|---|---|---|---|---|---|---|---|
| [kumoproductions/mcp-aftereffects](https://github.com/kumoproductions/mcp-aftereffects) | 123 / 16.10.2026, npm 0.3.2, есть в [официальном реестре MCP](https://registry.modelcontextprotocol.io/v0/servers?search=aftereffects) | Без панели: на macOS `osascript`/DoScript, ответы через файловый ящик во временной папке (права 0700); по желанию Startup-агент | 11 инструментов: инспекция, `ae_do` с реестром операций (comp.create, layer, keyframe, expression, effect, mask, text, shape), рендер-очередь (render.add_to_queue/start/variants, отправка в AME), PNG-кадры, экспорт и импорт проекта в JSON, undo-группы | Да. Проверено на AE 26.5 и macOS 26.4. Нужен AE 2024–2026 и Node 24+ | Порта нет. Произвольный eval по умолчанию выключен (`AE_MCP_ENABLE_EVAL`). Есть режим только чтения и список разрешённых категорий. Кто может писать в ящик, тот исполняет код в AE | `claude mcp add --scope user --env AE_MCP_READONLY=1 --transport stdio aftereffects -- npx -y @kumoproductions/mcp-aftereffects` | **Рекомендую** |
| [solomondivyananth/aftereffects-mcp](https://github.com/solomondivyananth/aftereffects-mcp) | 67 / 05.10.2026, v0.1 | CEP-панель, HTTP 127.0.0.1:7788 | 50 инструментов: чтение, рендер кадра, ревью движения с контакт-листами через ffmpeg, `ae_proof` (41 проверка), ключи, выражения, Essential Graphics, рендер; 22 скилла как MCP-промпты | Да, живые тесты только на macOS | Лучшая защита из найденных: токен 256 бит, отказ запросам с Origin/Referer, правка только «песочного» проекта, переключатель raw-JSX. Панель не подписана (нужен PlayerDebugMode). **npm-пакет `aftereffects-mcp` из README не опубликован** ([npm 404](https://registry.npmjs.org/aftereffects-mcp)), имя может занять кто угодно | Только из исходников: `./install.sh`, затем `claude mcp add after-effects -- node /АБС/ПУТЬ/aftereffects-mcp/mcp/ae-mcp.js` | **Можно** |
| [Engine-Room-Games/after-effects-mcp](https://github.com/Engine-Room-Games/after-effects-mcp) | 34 / 17.10.2026, 179 коммитов, npm 0.5.1 | CEP-панель; транспорт в README не описан | 76 инструментов, включая `export_mogrt`, скриншоты кадра и слоя, `run_batch`, house-style.md; скиллы и слэш-команды через плагин Claude Code | Да, тестируется больше всего на Mac; бинарники подписаны и нотаризованы | Есть `run_jsx`. Нужен PlayerDebugMode. Работает **только с AE 2026** | `/plugin marketplace add Engine-Room-Games/after-effects-mcp`, затем `/plugin install after-effects@engine-room` | **Можно** |
| [JUNKDOGE-JOE/after-effects-mcp](https://github.com/JUNKDOGE-JOE/after-effects-mcp) | 85 / 11.10.2026, v0.11.0 | CEP-панель — сама MCP по HTTP на 127.0.0.1:11488; нативный AEGP-плагин (arm64) | 16 инструментов: `ae_exec`, превью кадра, валидация выражений, чекпоинты и откат | Да, с macOS 14+. Сценарии «worker» на Mac не проверены | Токен для эндпоинта не описан. ZXP весит ~60 МБ. В README лежит «промпт автонастройки» для агента | `claude mcp add --transport http ae http://127.0.0.1:11488/mcp` | Можно, для продвинутых |
| [Dakkshin/after-effects-mcp](https://github.com/Dakkshin/after-effects-mcp) | 766 / 01.04.2026 | ScriptUI-панель опрашивает команды | Базовый набор: композиции, слои, ключи, выражения, `run-script` | PR с поддержкой macOS не влиты (#21, #14, #36) | Заброшен: 25 открытых issues/PR. Issue #43 — путь к любому файлу через `presetPath`. Issue #39 зовёт качать «исправленный релиз» по внешней ссылке | `claude mcp add AfterEffectsMCP -- node /АБС/build/index.js` | **Не рекомендую** |
| [a-y-ibrahim/after-effects-mcp](https://github.com/a-y-ibrahim/after-effects-mcp) | 22 / 10.10.2026, npm `after-effects-mcp` 1.13.0 | Форк Dakkshin, общая папка + ScriptUI-панель | 47–57 инструментов, фоновый рендер через aerender, execute-script | Заявлен. CI есть на macOS, но пути в README виндовые | Произвольный скрипт | `claude mcp add AfterEffectsMCP -- node /АБС/build/index.js` | Можно |
| [ishu86/after-effects-mcp](https://github.com/ishu86/after-effects-mcp) | 42 / 08.10.2026 | CEP + файлы в `~/Documents/ae-mcp-commands` | ~63 инструмента, шаблоны lower third, title card и т.п. | Да | Авторизации нет. Совет README «положить MCP в `~/.claude/settings.json`» не работает | `claude mcp add ae-mcp -- node /АБС/dist/index.js` | Не рекомендую |
| [HeroicSwan/after-effects-mcp](https://github.com/HeroicSwan/after-effects-mcp) | 43 / 20.07.2026 | Файловый мост + Startup-скрипт | Blueprint-система, editorial, рендер | Не описан, примеры под Windows | `ae_run_jsx` | `claude mcp add ae-mcp -- node /АБС/dist/index.js serve` | Не рекомендую для Mac |
| [Arman-Luthra/aftr](https://github.com/Arman-Luthra/aftr) | 24 / 13.07.2026 | CEP + WebSocket/HTTP на 8787 | ~100 команд; цикл «aerender → ревью через ffmpeg → правка»; мок-DOM AE для тестов | Да | Токен нужен только при открытии наружу | `claude mcp add --transport http aftr http://127.0.0.1:8787/mcp` | Можно как образец |
| [Immersive-Media-Technologies/aftereffects-mcp-imt](https://github.com/Immersive-Media-Technologies/aftereffects-mcp-imt) | 1 / 15.10.2026 | `osascript`, без панели | ~270 операций, dry-run, блокировка проекта | Да | **Некоммерческая лицензия**: заказы клиентам запрещены | npx `@immersive-media-technologies/aftereffects-mcp-imt` | Не рекомендую |
| [mikechambers/adb-mcp](https://github.com/mikechambers/adb-mcp) | 728 / 08.07.2026 | Python MCP + Node-прокси ws://localhost:3001; CEP для AE | Произвольный ExtendScript | Да | Прототип, Adobe его не поддерживает. Прокси без авторизации | Через `uv run mcp install … ae-mcp.py` (под Claude Desktop) | Не для AE |
| [zachshallbetter/adobe-mcp](https://github.com/zachshallbetter/adobe-mcp) | 26 / 20.10.2026 | ExtendScript | AE-пакет 0.1.0 вышел сегодня ([npm](https://registry.npmjs.org/adobe-mcp-aftereffects)) | Заявлен | Сырой | `claude mcp add aftereffects -- npx -y adobe-mcp-aftereffects` (по аналогии с README, это мой вывод) | Рано |

Мелкие и сырые, только для чтения кода: [AJSMonty/adobe-mcp](https://github.com/AJSMonty/adobe-mcp) (macOS, osascript DoScript), [ilyamorozov13/ae-mcp](https://github.com/ilyamorozov13/ae-mcp) (README на русском, но команда установки в нём ломается: `--env` стоит прямо перед именем, а [Claude Code такое отклоняет](https://code.claude.com/docs/en/mcp)), [StanleySweet/ae-mcp](https://github.com/StanleySweet/ae-mcp), [Aodaruma/adobe-mcp-rs](https://github.com/Aodaruma/adobe-mcp-rs) (Rust, документация под Windows и Codex). [SFKislev/Flue](https://github.com/SFKislev/Flue) (98★) — мост без MCP: ставится как скилл и шлёт скрипт в рантайм AE через CLI.

#### 1.2. Коммерческие и облачные

| Сервис | Суть | Оценка |
|---|---|---|
| **Higgsfield Bridge** — `https://bridge.higgsfield.ai/mcp` ([плагин](https://higgsfield.ai/plugins/after-effects), [блог 21.07.2026](https://higgsfield.ai/blog/higgsfield-after-effects)) | Плагин для AE и Premiere: генерация видео и картинок прямо на таймлайн, Reframe, Remove BG с альфой, Upscale до 8K. Через мост Claude работает с композициями, ключами и выражениями и импортирует генерации. Mac — universal-сборка; без интернета не работает; тратит кредиты Higgsfield. Требования к AE расходятся: блог пишет 2024+, страница плагина — 2025+ | Можно, когда будут и AE, и Higgsfield |
| **Prism** — `https://live.oneprism.io/after-effects` ([реестр](https://registry.modelcontextprotocol.io/v0/servers?search=after-effects), [сайт](https://oneprism.io)) | Закрытый ZXP-плагин плюс облачный ретранслятор, вход через браузер | Не рекомендую для NDA |
| **Plainly MCP** ([GitHub](https://github.com/plainly-videos/mcp-server)) | Рендер готовых AE-шаблонов в облаке; от $69 в месяц по их же [сравнению](https://www.plainlyvideos.com/dataclay-templater-alternative) | Ниша: массовый рендер шаблонов |
| **Adobe for creativity** — `https://adobe-creativity.adobe.io/mcp` ([developer.adobe.com](https://developer.adobe.com/adobe-for-creativity/getting-started/)) | Официальный, облачный. Видео ограничено ресайзом и Quick Cut, таймлайн Premiere он не открывает ([mcp.film](https://mcp.film/mcps/adobe-creativity/)). Включается в claude.ai → Connectors; в Claude Code коннекторы claude.ai появляются сами при входе по подписке ([docs](https://code.claude.com/docs/en/mcp)) | Можно для Firefly и ресайза; AE не закрывает |

#### 1.3. Соседние программы Adobe (для видео)

- **Premiere:**
  - [hetpatel-11/Adobe_Premiere_Pro_MCP](https://github.com/hetpatel-11/Adobe_Premiere_Pro_MCP) — 726★, CEP + файлы в /tmp, 283 инструмента, телеметрия включена по умолчанию;
  - [leancoderkavy/premiere-pro-mcp](https://github.com/leancoderkavy/premiere-pro-mcp) — 413★, 434 инструмента, есть дополнительный AE-коннектор, который собирает MOGRT по 5 рецептам. Установка: `/plugin marketplace add leancoderkavy/premiere-pro-mcp`.
- **Illustrator:** [ie3jp/illustrator-mcp-server](https://github.com/ie3jp/illustrator-mcp-server) — 173★, osascript, сам в сеть не ходит, экспортирует SVG по артбордам. Самый полезный для нашего SVG-движка: `claude mcp add illustrator-mcp -- npx illustrator-mcp-server`.
- **Photoshop:** [alisaitteke/photoshop-mcp](https://github.com/alisaitteke/photoshop-mcp) — 689★, аналитика включена по умолчанию.

#### 1.4. Каталоги

- **Официальный реестр MCP:** из AE есть только kumoproductions, zachshallbetter и Prism; записей `com.adobe` нет.
- **mcp.so и mcpmarket** ведут на заброшенный Dakkshin.
- **Glama** показывает 20+ AE-серверов с оценками. LiamcKerr/after-effects-mcp там ещё значится, хотя на GitHub уже 404.
- **Smithery:** серверов для AE не нашёл.

---

### 2. Скиллы и md-файлы

**Официального для AE нет ни у Anthropic, ни у Adobe.** В [anthropics/skills](https://github.com/anthropics/skills) нет ничего про AE или видео. В [adobe/skills](https://github.com/adobe/skills) (245★) только плагин adobe-for-creativity. Официальные скиллы есть у смежных инструментов:

- [remotion-dev/skills](https://github.com/remotion-dev/skills) — `npx skills add remotion-dev/skills`;
- [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) — 67,8k★, 21 скилл, [плагин в Claude](https://claude.com/plugins/hyperframes);
- [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) — принципы движения;
- [higgsfield-ai/skills](https://github.com/higgsfield-ai/skills) вместе с [higgsfield-ai/cli](https://github.com/higgsfield-ai/cli).

**Лучшие скиллы для AE от сообщества** (что брать из каждого):

| Репозиторий | Что взять |
|---|---|
| [blixvip/skills → ae-extendscript](https://github.com/blixvip/skills) (MIT) | Ловушки ES3; каждый скрипт пишет `result.json` с номером строки ошибки; запуск `osascript` → `DoScript $.evalFile`; проверка через `saveFrameToPng` на 3–5 кадрах. Готовый каркас для связки «Claude пишет .jsx» |
| [aedev-tools/adobe-agent-skills](https://github.com/aedev-tools/adobe-agent-skills) (112★, Apache-2.0, macOS) | 34 готовых JSX, `runner.sh` через osascript с `--background` (AE не забирает фокус) |
| [TerminalSkills/skills → after-effects](https://github.com/TerminalSkills/skills) (Apache-2.0) | Флаги aerender (`-mfr`, `-rqindex`, `-reuse`), экспорт MOGRT, CEP |
| [LobzyJay/motion-design-with-claude-and-codex](https://github.com/LobzyJay/motion-design-with-claude-and-codex) (MIT) | Правило: больше ~5 вызовов MCP — пиши один идемпотентный JSX, который сам чистит свои старые слои. Плюс `limits-and-pitfalls` |
| [Mfrostbutter/claude-skills](https://github.com/Mfrostbutter/claude-skills) (MIT) | Шпаргалка по matchName, шрифты по PostScript-имени, `sourceRectAtTime`; модальные окна блокируют `aerender -r` |
| [iart-ai/motion-design-skills](https://github.com/iart-ai/motion-design-skills) (143★, MIT) | Выражения (wiggle, loopOut, echo), риг на контрол-нуле, MOGRT |
| [GUNMIN-KIM/after-effects-codex-agent](https://github.com/GUNMIN-KIM/after-effects-codex-agent) (без лицензии) | Только идеи для CLAUDE.md: не перезаписывать .aep, сохранять версии, рендерить первый, средний и последний кадр |

**Справочники для контекста агента.** Давать ссылкой, не копией:
- [ae-scripting.docsforadobe.dev](https://github.com/docsforadobe/after-effects-scripting-guide) (движок — ECMA-262, 3-е издание);
- [ae-expressions.docsforadobe.dev](https://github.com/docsforadobe/after-effects-expression-reference);
- [Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe) (MIT) — чтобы проверять код типами до запуска.

Гайд [claudecodeguides.com](https://claudecodeguides.com/claude-code-after-effects-extendscript-2026/) содержит неверный код, верить ему осторожно.

**Каркас правил CLAUDE.md для AE** (свод из скиллов выше):
- только ES3: `var`, без стрелочных функций и `forEach`, `JSON` подключать через json2;
- индексы коллекций с 1, цвета в диапазоне 0–1;
- эффекты искать по matchName, а не по отображаемому имени;
- каждое действие — в `app.beginUndoGroup`;
- результат и ошибки писать в файл;
- повторный запуск скрипта не должен плодить дубли;
- после правки рендерить кадры и смотреть их;
- работать на копии .aep.

---

### 3. Связки и кейсы 2025–2026

**Claude пишет .jsx → AE исполняет.** Работает через `osascript` → `DoScript`/`DoScriptFile`, через MCP или вручную через File → Scripts. Что ломается — зафиксировано в PR к Dakkshin:
- В ES3 нет `toISOString`, вызов падает молча ([PR #33](https://github.com/Dakkshin/after-effects-mcp/pull/33), [PR #38](https://github.com/Dakkshin/after-effects-mcp/pull/38)).
- Неверные matchName у Glow и Directional Blur.
- Модальный диалог блокирует любой скрипт ([PR #40](https://github.com/Dakkshin/after-effects-mcp/pull/40)).
- AE на macOS не пишет во временные папки системы, поэтому мосты переносят файлы в `~/Documents` ([PR #20](https://github.com/Dakkshin/after-effects-mcp/pull/20)).
- В AE 2024 вызов `DoScriptFile` из osascript зависал; в 2025 исправили (известно только по сниппету community.adobe.com).

Надёжно работают короткие идемпотентные скрипты с try/catch, результатом в файл и проверкой кадром.

**Claude генерирует Lottie → AE.** Сам AE Lottie не импортирует. Нужен бесплатный плагин LottieFiles for AE; при импорте теряются SMIL, CSS и фильтры ([docs](https://docs.lottiefiles.com/en/integrations/after-effects/03_import/importing-from-file)). Модели путают схему Lottie: в работе OmniLottie (CVPR 2026) у GPT-5 успех от 12,7 до 68,7%, Claude не тестировали ([PDF](https://openaccess.thecvf.com/content/CVPR2026/supplemental/Yang_OmniLottie_Generating_Vector_CVPR_2026_supplemental.pdf)). Без линтера не обойтись — подойдёт [obeskay/lottie-animator-skill](https://github.com/obeskay/lottie-animator-skill). У LottieFiles есть официальный MCP: `claude mcp add --transport http lottiefiles https://mcp.lottiefiles.com/mcp`, отдельно идёт Creator MCP ([docs](https://docs.lottiefiles.com/en/platform/mcp)).

**SVG → AE.** Это лучший мост для нашего движка:
- AE 26.0 (21.01.2026) превращает SVG в родные шейп-слои с градиентами и обводками ([CG Channel](https://www.cgchannel.com/2026/01/adobe-releases-after-effects-26-0-with-native-substance-support/));
- AE 26.2 даёт выбор: импорт как композиция или как футаж ([CG Channel](https://www.cgchannel.com/2026/04/adobe-releases-after-effects-26-2/));
- текст внутри SVG в бете не импортировался (по сниппету).

**aerender.** Нужен установленный AE с лицензией. Открытый модальный диалог блокирует рендер. Обёртки: [nexrender](https://github.com/inlife/nexrender) (на macOS бывают проблемы с правами на /tmp и бинарник) и облачный Plainly.

**Higgsfield → AE → финал:**
- Плагин Higgsfield кладёт генерацию прямо на таймлайн; там же Remove BG даёт альфу, Upscale поднимает разрешение.
- Из Claude Code генерировать официально советуют через CLI и скиллы, а не через MCP ([help center](https://higgsfield.ai/creator-hub/help-center/mcp-cli/how-do-i-access-higgsfield-via-cli)): `npx skills add higgsfield-ai/skills`, затем `higgsfield auth login`.
- Ограничения генераторов:
  - альфа-канал из генераторов не описан ни в одном источнике;
  - частоты кадров у моделей разные: Veo 24 fps ([Google](https://ai.google.dev/gemini-api/docs/veo)), Kling 30 fps ([Kling](https://kling.ai/blog/kling-ai-video-integration-workflow-guide));
  - персонажи «дрейфуют» между шотами;
  - Sora закрыта ([the-decoder](https://the-decoder.com/openai-sets-two-stage-sora-shutdown-with-app-closing-april-2026-and-api-following-in-september/)).

**Что надёжно:** ИИ-клип служит фоном или плейтом, графика из кода идёт сверху слоями ProRes 4444 с альфой; проект собирается в одной частоте кадров.

**Наш код → .aep.** Есть [korbanovalex/hyperframes-to-after-effects](https://github.com/korbanovalex/hyperframes-to-after-effects): переводит GSAP в Bezier-ключи и сверяет результат через SSIM. 0★, годится только как идея.

---

### 4. Альтернативы без AE

| Задача | Без AE (код) | Нужен AE |
|---|---|---|
| Кинетическая типографика, инфографика, UI-анимации, explainer | Наш движок, [HyperFrames](https://github.com/heygen-com/hyperframes), Remotion | — |
| Векторные иконки и анимации для веба и приложений | Lottie (наш SVG → Lottie через скилл), Rive | — |
| Прозрачные оверлеи для монтажёра | ProRes 4444 с альфой (ffmpeg; у Remotion [тоже есть](https://www.remotion.dev/docs/prores)) | — |
| Ресайз под Reels и Shorts, Quick Cut | Adobe for creativity, Higgsfield Reframe | — |
| Заказчику нужен редактируемый **.aep** | — | Да |
| **MOGRT** для Premiere | — | Да, собирается только в AE ([helpx](https://helpx.adobe.com/after-effects/desktop/motion-graphics/work-with-motion-graphics-templates/replace-media-motion-graphics-templates.html)) |
| 3D Camera Tracker, Mocha (планарный трекинг), Object Matte / Roto, Content-Aware Fill | — | Да ([3D tracker](https://helpx.adobe.com/after-effects/desktop/work-with-3d-composition/3d-camera-tracker-effect/tracking-3d-camera-movement.html), [CAF](https://helpx.adobe.com/after-effects/desktop/remove-objects-from-your-videos/content-aware-fill.html)) |
| Композитинг живого видео и ИИ-клипов, кеинг | Частично: ffmpeg и Remove BG в Higgsfield | Удобнее в AE |

Промежуточные варианты:
- **Cavalry** (с 2026 года принадлежит Canva) экспортирует Lottie с ограничениями: без матов и фильтров, текст уходит кривыми ([docs](https://cavalry.studio/docs/user-interface/menus/window-menu/render-manager/lottie-export/)).
- **Rive** рендерит видео только на платном тарифе ([docs](https://rive.app/docs/editor/exporting/exporting-for-video-and-static-design)).

**Цена AE на 20.10.2026:**
- $22.99 в месяц при годовой подписке с помесячной оплатой, триал 7 дней ([adobe.com](https://www.adobe.com/products/aftereffects/plans.html));
- $34.49 при помесячной подписке или $263.88 за год ([CG Channel](https://www.cgchannel.com/2026/09/adobe-releases-after-effects-26-5-and-new-ai-assistant-in-beta/));
- нужен macOS 14+.

---

### Подводные камни

1. **Глобальная настройка AE.** Опция «Allow Scripts to Write Files and Access Network» нужна почти каждому мосту, но она открывает файлы и сеть **любому** скрипту, включая скачанные.
2. **PlayerDebugMode.** Неподписанные CEP-панели (solomondivyananth, Engine Room, ishu86) требуют этот режим, а он разрешает загрузку всех неподписанных расширений.
3. **Файловые мосты.** В схемах с файлами (`~/Documents/ae-mcp-commands`, `/tmp/...`) любой процесс, который может писать в папку, исполняет код в AE. У kumo папка закрыта правами 0700.
4. **HTTP на localhost без токена.** Так работают JUNKDOGE (11488) и прокси adb-mcp (3001). Есть риск атаки из локальных процессов и, по моей оценке, со страниц в браузере. solomondivyananth от этого закрыт: токен и отказ запросам с Origin.
5. **Захват имени в npm.** README solomondivyananth предлагает `npx -y aftereffects-mcp`, но такого пакета нет: его может зарегистрировать кто угодно.
6. **Приманки.** В issue #39 у Dakkshin пользователей зовут скачать «исправленный релиз» по внешней ссылке. JUNKDOGE даёт в README «промпт автонастройки», чтобы его вставили агенту. Не скачивать и не вставлять не глядя.
7. **Утечка данных проекта.** Имена слоёв и композиций, выражения и пути к футажу уходят провайдеру ИИ. Higgsfield и Prism ещё и гонят данные через своё облако.
8. **Телеметрия по умолчанию** у Photoshop MCP и hetpatel-11; её стоит выключить.
9. **Неверные команды установки в README.** ishu86 советует settings.json; у ilyamorozov13 `--env` стоит прямо перед именем сервера. Правильный синтаксис: `claude mcp add [опции] <имя> -- <команда>` ([docs](https://code.claude.com/docs/en/mcp)).
10. **Ненадёжный Undo.** Undo после скриптов срабатывает не всегда. Нужны чекпоинты или копия .aep; любой открытый модальный диалог вешает мост.
11. **Требования к Node.** kumo нужен Node 24+, Engine Room — Node 22+. На Mac автора node не в PATH по умолчанию.

---

### Что не удалось проверить

- Ни один MCP-сервер не запускался: AE не установлен, установка запрещена заданием. Совместимость с M5 подтверждена только тем, что AE поддерживает Apple Silicon и у JUNKDOGE есть arm64-плагин.
- **Higgsfield:**
  - надёжность моста `bridge.higgsfield.ai` и его работа из Claude Code (документировано только для claude.ai);
  - точный способ установки CLI: источники называют brew, `install.sh` и `npm i -g @higgsfield/cli`;
  - кодек, fps и альфа у генераций.
- Транспорт Engine Room и авторизация у JUNKDOGE: в README этого нет.
- Текст issue #39 у Dakkshin: GitHub ответил 403, видел только пересказ.
- Страницы helpx и community.adobe.com (403): часть фактов про SVG и DoScriptFile взята из сниппетов поиска.
- Даст ли встроенный AI Assistant в AE внешний доступ; дата отказа от ExtendScript в пользу UXP (UXP для AE пока в бете).
- Отзывы пользователей на Reddit про AE-MCP не нашлись. Независимых замеров, как часто Claude пишет рабочий JSX, нет.
- Лицензия remotion-dev/skills: API показывает null. Глубже не проверял.
