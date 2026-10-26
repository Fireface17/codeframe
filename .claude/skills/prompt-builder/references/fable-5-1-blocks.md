# Библиотека блоков — Claude Fable 5.1 / Mythos 5.1

Источник: Anthropic, «Prompting Claude Fable 5.1»
(`platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1`).
Блоки сверены с первоисточником 2026-10-26 (дословно, 14/14). Блоки для Opus 5.5, Sonnet 5.5 и
Haiku 5.5 — в `models-5-5-blocks.md`.

**Блоки копировать ДОСЛОВНО.** Они откалиброваны на evals Anthropic; пересказ и «улучшение
формулировки» теряют эффект. Переводить на русский только если пользователь явно попросил
промпт целиком по-русски — и тогда сказать ему, что англоязычный оригинал измерен, а перевод нет.

**Вставлять только по симптому.** Все блоки сразу — это раздутый промпт с конфликтующими
требованиями. Промпты, написанные под Fable 5, работают на 5.1 без правок; ниже — лечение
конкретных наблюдаемых отличий.

Пометка **[harness]** — правится кодом обвязки, а не текстом промпта.

## Оглавление

1. Effort — прогон уровней [harness]
2. Прогресс-апдейты во время длинных tool-цепочек
3. Батчинг независимых tool calls в агентных циклах
4. История разговора — только append [harness]
5. Плотность письма (mannered prose)
6. Форматирование в чате — инверсия относительно прежних моделей
7. Цитирование извлечённых источников
8. Довести задачу до конца (8a автономность, 8b граница поставки)
9. Что сохранять в summary при компакции
10. Держать правки и тесты в границах задачи
11. Срабатывание поиска на `low` effort
12. Ложные срабатывания safeguard-классификаторов
13. Точечные правки вместо переписывания файла целиком
14. Место под длинный вывод на `xhigh` и `max`
15. Ведущий агент не должен простаивать под субагентами [harness]
16. Vision — дать инструменты кропа и зума [harness]
— Старое: переход с Fable 5 и даты

---

## 1. Effort — прогон уровней [harness]

Старт с дефолта `high`, затем прогнать `low`, `medium`, `xhigh`, `max` на своих evals. Effort —
главный рычаг обмена «интеллект ↔ латентность ↔ цена».

- Sweep пересчитывать заново, даже если он делался на Fable 5: имена уровней НЕ соответствуют
  одинаковому объёму размышления у разных моделей.
- Прирост 5.1 над 5 виден на всех уровнях, максимален на верхних. На `medium` результат примерно
  как у Fable 5, но дешевле → спускаться до `medium`/`low` там, где evals держат качество.
- На `low` 5.1 часто выигрывает у Opus/Sonnet по цене за задачу при более высоком счёте →
  включать `low` в сравнение везде, где иначе взяли бы модель поменьше на высоком effort.
- Два побочных эффекта уровней — свои разделы: §11 (`low` реже зовёт поиск) и §14 (`xhigh`/`max`
  дольше думают перед длинным ответом).

---

## 2. Прогресс-апдейты во время длинных tool-цепочек

Симптом: между вызовами инструментов почти нет текста; пользователь видит тишину минутами; финальное
сообщение описывает только последний шаг. У 5.1 это дефолт (сильнее при высоком effort и длинных
цепочках).

Порядок починки — три шага, промпт ПОСЛЕДНИЙ:

1. **[harness]** Проверить, доходят ли апдейты вообще. Короткие заметки модели между вызовами
   приезжают как progress-update `thinking`-блоки, а при дефолтном `thinking.display: "omitted"`
   эти блоки пустые. Поставить `display: "updates"` (beta, заголовок
   `thinking-display-updates-2026-08-18`) и рисовать каждый непустой `thinking`-блок строкой
   статуса; либо `"summarized"` — тогда придут вместе с суммаризованным рассуждением.
2. **Вычистить глушилки.** Прежние модели охотно нарратировали, из-за чего в system prompt-ы
   попадали строки вида «hold all findings for the final response». Удалить их ДО того, как
   что-то добавлять.
3. Только теперь — строка в system prompt (нужна при парном программировании и другой
   human-in-the-loop работе):

```text
Before you start, say in a line what you're about to do; brief updates while you work help the user follow along. Close with a short recap that stands on its own — what you found, what you did, and what's next — so a reader who only sees the last message has the full picture.
```

Если продукт схлопывает или прячет вывод инструментов — сказать об этом модели, иначе она будет
запускать команды, чтобы «показать» пользователю то, что UI не отображает. Доставлять
turn-scoped system message (`clear_at: "next_user_message"`, beta):

```text
Only you see that command's output — the user's terminal shows at most a few lines of it. If the user needs to read any of it, put it in your reply.
```

---

## 3. Батчинг независимых tool calls в агентных циклах

Симптом: один вызов инструмента за ход. 5.1 обычно параллелит нормально, когда запрос прямо
перечисляет, что достать. Исключение — кодинг и computer-use циклы, где следующие независимые
вызовы подразумеваются задачей, а не названы (кастомные кодинг-агенты, bash+editor обвязки,
computer use). На качество ответа не влияет, но каждый лишний ход стоит токенов, round-trip и
времени.

```text
First privately list what you need next; then request every item that doesn't depend on another's result in this one response.
```

**[harness]** Куда класть: каждый раз, отправляя обратно результаты инструментов, дописывать эту
фразу ПОСЛЕ user-сообщения как turn-scoped system message — запись `role: "system"` в `messages`
с `clear_at: "next_user_message"`, beta-заголовок `mid-conversation-system-clear-at-2026-08-21`.
Без беты — текстовым блоком после `tool_result`-блоков в том же user-сообщении.

Прежние копии оставлять на месте байт-в-байт: API их гасит, модель видит только свежую, входных
токенов они не стоят. Удаление или переписывание прежних копий = правка ранних ходов → сброс
prompt-кэша с этой точки и инвалидация последующих thinking-блоков (см. §4).

---

## 4. История разговора — только append [harness]

Каждый assistant-ход дописывать ровно в том виде, в каком его вернул API, вместе с
thinking-блоками; ранние ходы между запросами не править.

Thinking-блоки Fable 5.1 валидны только в том самом
разговоре, который их породил: запрос, воспроизводящий thinking-блок после изменения его префикса
(system prompt, список инструментов, любое более раннее сообщение), вернёт 400 — либо выбросит
затронутые блоки при `thinking.block_binding.prefix_mismatch_behavior: "drop_block"` (beta,
`thinking-binding-controls-2026-08-01`). Паттерн принимать для всех аккаунтов, даже если у
вашего проверка пока не включена (с какой даты она действует — см. «Старое»).

Правки истории, которые ломают проверку, — те же, что сбрасывают prompt-кэш: вставка и удаление
per-turn напоминаний, суммаризация старых ходов на месте, смена system prompt посреди сессии.
Вместо этого: per-turn напоминания — turn-scoped system messages; смена инструкций или инструментов —
mid-conversation system message, а не переписывание `system`/`tools`; подрезание — серверная
compaction или context editing. При клиентской компакции простейшая форма — заменить всю историю
одним summary-сообщением плюс новый user-ход и ничего больше не воспроизводить.

Кэш-чтения подешевели → ранняя компакция ради экономии может уже не быть верным разменом:
пробовать более поздние точки компакции.

Диагностика: прогнать сессию с `prefix_mismatch_behavior: "drop_block"` и логировать
`input_transformations`, либо снять точные запросы за несколько обычных ходов и убедиться, что
соседние запросы байт-идентичны до дописанных ходов.

---

## 5. Плотность письма (mannered prose)

Симптом: проза идёт длинно и плотно — длинные предложения, мало абзацных разрывов. Письмо 5.1 в
целом лучше прежних моделей (меньше штампов и необъяснённого жаргона), но местами плотнее, чем у
Fable 5. Помогает инструкция, определяющая анти-паттерн. Класть в user-сообщение (предпочтительно)
либо в system prompt:

```text
Mannered prose substitutes metaphor and flourish for direct statement. Instead of "a parameter worth varying," the mannered writer produces "a dial worth turning." Instead of "this point still matters," they write "this point earns its keep." The phrases exist to display the writer, not to convey the idea, and readers can tell. That is why mannered prose irritates: it makes the reader work harder so the writer can perform. It is also imprecise. Metaphors drag in connotations the writer did not choose and cannot control. The fix is to say what you mean. When a literal phrase is available, use it.
```

Короткая версия тоже обычно работает:

```text
Please remove all mannered prose.
```

---

## 6. Форматирование в чате — ИНВЕРСИЯ относительно прежних моделей 🔴

Прежние модели злоупотребляли буллетами и болдом, и множество промптов носит анти-форматные
правила, написанные против этого. 5.1 кренится в другую сторону: реже болдит, реже берёт
заголовки, списки, кавычки.

**Действие: найти в промпте анти-форматный язык и снять его** либо заменить правилом «когда
уместно какое форматирование»:

```text
Use lists and bullet points when asked to, or when the content is multifaceted enough that they help with clarity. If the person explicitly requests minimal formatting, always format your responses without bullet points, headers, lists, or bold emphasis, as requested. In conversational, personal, or emotional exchanges, keep to plain prose.
```

---

## 7. Цитирование извлечённых источников

Симптом: в пересказе документов воспроизводятся куски исходного текста без пометки, что это цитата.
У 5.1 вероятнее, чем у Fable 5. Лечится ОДНИМ полным примером правильного ответа в system prompt:
запрос пользователя, ответ и предложение о том, почему ответ верен.

```text
<example>
<user>look up how the Riverton Ledger and the Coast Dispatch each covered the Harbor Bridge closure and compare their reporting</user>
<response>
[web_search: Harbor Bridge closure Riverton Ledger]
[web_search: Harbor Bridge closure Coast Dispatch]
Both outlets agree on the basics: the bridge closed on March 3 after inspectors found cracked welds, and the state expects repairs to take about eight months. Where they differ is emphasis. The Ledger treats it as a local-economy story. The Dispatch frames it as a funding failure; its editorial calls the closure "entirely foreseeable." Read together, the Ledger explains who is affected now and the Dispatch explains how it came to this — neither account alone gives the whole picture.
</response>
<rationale>CORRECT: The response is organized around where the two outlets agree and differ, not as a walk through either article. Each outlet's reporting is conveyed in one or two sentences of the assistant's own indirect speech. One short marked phrase from one source; every other claim is reworded. The response is still specific and complete.</rationale>
</example>
```

Обе строки `[web_search: ...]` заменить на имя СВОЕГО инструмента — иначе модель прочтёт их как
буквальный текст к выводу, а не как шаблонный вывод инструмента.

---

## 8. Довести задачу до конца

Симптом: ход заканчивается раньше работы («Next, I'll …») или модель спрашивает разрешения на шаг,
уже покрытый исходным запросом («Shall I apply this?»). 5.1 умеет очень длинные задачи почти без
методических подсказок, но на сложных асинхронных нагрузках нужен нудж.

Два дополнения к system prompt, применять ОБА. Если длина промпта критична — только первое, оно
держит большую часть эффекта.

**8a. Автономная работа.** Первое предложение («пользователь не смотрит») несёт бо́льшую часть
эффекта — оставлять как написано. Если продукт обязан останавливаться на конкретных
подтверждениях — добавить предложение сразу после него с их перечнем. Побочный эффект: модель реже
переспрашивает и на действительно неоднозначных запросах — размен проверить на своих задачах.

```text
You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task, so asking 'Want me to…?' or 'Shall I…?' will block the work. For reversible actions that follow from the original request, proceed without asking. Stop only for destructive actions or genuine scope changes the user must decide. Offering follow-ups after the task is done is fine; asking permission before doing the work is not.

Exception: when the user is describing a problem, asking a question, or thinking out loud rather than requesting a change, the deliverable is your assessment. Report your findings and stop. Don't apply a fix until they ask for one.

Before ending your turn, check your last paragraph. If it is a plan, an analysis, a question, a list of next steps, or a promise about work you have not done ('I'll…', 'let me know when…'), do that work now with tool calls. That includes retrying after errors and gathering missing information yourself. Do not stop because the context or session is long. End your turn only when the task is complete or you are blocked on input only the user can provide.

Before running a command that changes system state (such as restarts, deletes, or config edits), check that the evidence actually supports that specific action. A signal that pattern-matches to a known failure may have a different cause.
```

**8b. Запрос = граница поставки.**

```text
# Delivering work
The user's request — or the plan they approved — sets the scope, and the scope is the deliverable: don't quietly narrow, widen, or swap it. Read ambiguity the way a careful colleague would: make routine judgment calls yourself, and check in only when different readings would lead to materially different work. If you see a real problem with the task as specified, say so in a sentence or two and keep building under stated assumptions; if the user hears the concern and reaffirms, that is their decision, so deliver the full request.

If a question comes up partway, first do everything that doesn't depend on the answer; then state the assumption you made, or — when going ahead on a wrong guess would be unsafe or would make the work useless — put the question at the end of a turn that also delivers that progress. If one part turns out to be blocked, complete every other part in full and say exactly what you left out and why — the whole task is the deliverable, and scaling it down is the user's call, not yours. A step you have decided on is something to run, not to announce: describing the next step and ending the turn leaves it undone until the user replies.

Keep changes to what the request needs. Something else you notice worth doing — cleanup or documentation the task didn't call for, a change to a file the task didn't require — is a suggestion to make at the end, not a change to make; actions clearly beyond what the ask implies, and risky or destructive ones, still need the user's go-ahead.
```

---

## 9. Что сохранять в summary при компакции

Серверная compaction это уже делает. Блок нужен только при КЛИЕНТСКОЙ компакции — 5.1 хорошо
отзывается на явный перечень того, что summary обязано удержать.

```text
Summarize the transcript inside <summary></summary> tags. Include relevant information in the summary such that this conversation will be continued by a new context window without needing to redo work or be reprovided with relevant constraints or context. Be sure to preserve: (1) any difficulties or problems that came up, and how they were handled or resolved; (2) any possibilities, options, or approaches that were raised, tried, or set aside, and why; (3) anything that was asked for, decided, agreed, ruled out, or established as a preference, constraint, or boundary — stated exactly; (4) exactly where things stand now — what has been covered, settled, or completed so far; (5) anything still open, unresolved, promised, or expected to happen next; (6) specific details that would be hard to reconstruct — names, numbers, dates, exact wording, links or references — kept exactly. Be complete on these even at the cost of length; keep everything else concise. Weight the two voices differently: keep what the user said, asked for, shared, or established carefully and close to their own words; your own explanations and reasoning can be condensed much further, to what they concluded or produced — as long as nothing in the six items above is dropped.
```

---

## 10. Держать правки и тесты в границах задачи

Симптом: на открытой фиче 5.1 доставляет запрошенное и иногда сверх того — чинит соседний код,
расширяет неупомянутое поведение, коммитит больше тестовых файлов, чем оправдано правкой. С этой
инструкцией незапрошенные добавки и закоммиченный тестовый код существенно падают без измеримого
изменения успешности задачи.

```text
If, while working or testing, you find a pre-existing bug, a performance concern, or behavior the task doesn't mention, don't fix, optimize or extend it in this change unless the requested behavior cannot work without it; report it as a follow-up in your summary. Where the task is ambiguous, implement the reading its wording and the surrounding code most directly support, state that assumption in your summary, and don't build for the other readings as well. Verify your work however you like; scratch scripts and quick checks need not be kept. Commit tests only where the task asks for them or this repository already keeps tests for this kind of change, sized like the neighboring test files — roughly one focused test per stated behavior — and don't turn scratch checks into additional permanent test files. This is about extras only: implement every behavior the task asks for, completely.
```

---

## 11. Срабатывание поиска на `low` effort

На `low` 5.1 реже Fable 5 зовёт поиск/retrieval и чаще отвечает по памяти. Иногда проще поднять
effort на затронутых ходах, а не на весь разговор (смена effort посреди разговора). Иначе — нудж в
system prompt: узнавание имени ≠ знание его текущего состояния.

```text
When a query centers on a name you do not confidently recognize, or recognize from a fast-moving area like AI models and developer tools where the landscape shifts within months, the name itself is the thing to verify: search before answering, and include the name as the user wrote it in at least one query alongside any reformulations. This holds even when you have some background on it — partial background is exactly what makes an out-of-date answer sound authoritative, so familiarity is not a reason to skip the search.
```

---

## 12. Ложные срабатывания safeguard-классификаторов

5.1 гоняет классификаторы безопасности и может вернуть `stop_reason: "refusal"`. Ложных
срабатываний меньше, чем было у Fable 5 на старте; поиск уязвимостей в исходном коде разрешён.
Три ситуации, повышающие вероятность ложного отказа:

- **Формулировка про компиляцию.** Вместо «Does this program compile without errors?» спрашивать
  «Are there any bugs in this program?».
- **Малоизвестные языки программирования.** Дать модели контекст: что это за язык и как он
  устроен — например, доступ к его документации.
- **Base64 в выводе инструментов.** Инструменты, возвращающие base64 в контекст, провоцируют
  ложные срабатывания; рекомендуемая починка — убрать эти данные.

---

## 13. Точечные правки вместо переписывания файла целиком

Симптом: файл переписывается целиком ради мелкой правки. У 5.1 это вероятнее, чем у Fable 5.
Результат обычно тот же, но если файл не короткий и меняется не бо́льшая его часть — переписывание
стоит лишних выходных токенов и времени. Дописать в конец system prompt либо первого
user-сообщения:

```text
The number of tokens used to edit files is best minimized, all else being equal. Therefore, when it will not affect the end result, try to surgically edit a file rather than rewrite the entire thing.
```

---

## 14. Место под длинный вывод на `xhigh` и `max`

На `xhigh` и особенно `max` 5.1 может думать дольше перед началом ответа. Когда один запрос просит
длинную поставку (полное переписывание длинного документа), модель может набросать бо́льшую её часть
в размышлении и затем написать заново в ответе — дольше и дороже по выходным токенам. Простейшее
решение: гонять такие запросы на `high` (рекомендованная точка старта), поднимая до `xhigh`/`max`
только там, где выигрыш измерен. Если всё же `xhigh`/`max`:

- **[harness]** Ставить `max_tokens` с запасом на размышление И ответ, а не только на ожидаемую
  длину ответа.
- Дописать в КОНЕЦ user-сообщения блок ниже, подставив реальное значение `max_tokens` вместо
  `[max_tokens]` (например, 64,000). Он заметно укорачивает размышление на прозе и коде.

```text
Everything produced in one reply, including any reasoning or drafting done before the reply, counts toward a single limit of about [max_tokens] tokens. If that limit is reached before the reply is finished, the person receives a cut-off response and has to start over. Composing an entire output or deliverable in full as reasoning and then again as a reply would double the length of the turn without improving the result, so don't do that.

Instead, when the person has asked for a long or effort-intensive deliverable such as a multi-section document, a large table or dataset, or a complete code file, spend extra effort on understanding the request, checking the inputs the answer depends on, settling the structure and other difficult decisions, and otherwise using the reasoning space to reason and the output space to write an output. Usually it is not needed to draft an output multiple times.
```

---

## 15. Ведущий агент не должен простаивать под субагентами [harness]

Если кодинг-агент даёт 5.1 делегировать работу субагентам — не заставлять ведущего останавливаться
и ждать каждого. На кодинг-задачах продолжение работы ведущего снижает среднее время до завершения
при сопоставимых качестве, расходе токенов и цене. Настройка:

- Инструмент запуска субагента возвращает управление сразу.
- Результат каждого субагента приезжает ведущему позже, отдельным `user`-сообщением.
- У ведущего есть отдельный инструмент, чтобы дождаться результата, когда он сам этого захочет.

Модель всё равно часто предпочтёт подождать; выигрыш даёт та доля прогонов, где она идёт дальше.

---

## 16. Vision — дать инструменты кропа и зума [harness]

Симптом: ответы про графики и плотные изображения теряют детали. Vision у 5.1 сильнее из коробки, а
на сложных визуальных входах лучший результат — когда модель может итеративно анализировать,
кропать и визуально сверяться. Максимум: гонять агентом с контейнером, где лежат сырые
изображения/видео и предустановлены базовые библиотеки обработки (PIL, OpenCV). Если контейнер —
избыточные накладные расходы, бо́льшую часть выигрыша даёт один инструмент кропа: он возвращает
выбранную область изображения увеличенной, что позволяет разглядывать детали и масштабировать
test-time compute вместе с числом токенов изображения. Готовое определение — рецепт crop tool в
Anthropic cookbook.

---

## Старое: переход с Fable 5 и даты

<details>
<summary>Нужно только при миграции промптов с Fable 5 или для сверки дат</summary>

- **Переход Fable 5 → 5.1.** Промпты, написанные под Fable 5, работают на 5.1 без правок; блоки
  выше лечат наблюдаемые отличия 5.1 от 5. Sweep effort, сделанный на Fable 5, не переносится.
- **Привязка thinking-блоков (§4)** по первоисточнику включена для новых аккаунтов, созданных
  31.08.2026 и позже; для остальных ожидается позже.
- **Beta-заголовки** в разделах выше (`thinking-display-updates-2026-08-18`,
  `mid-conversation-system-clear-at-2026-08-21`, `thinking-binding-controls-2026-08-01`) актуальны
  на 2026-10-26. Беты выходят в общий доступ и переименовываются — перед вставкой в код сверить
  с первоисточником.

</details>
