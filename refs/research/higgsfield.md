# Higgsfield: как правильно работать (с Claude Code и нашим конвейером)

Исследование 2026-10-20 по официальной документации Higgsfield и свежим источникам. Подробные разделы
с метками источников ниже: **[О]** официально, **[О-блог]** блог Higgsfield (маркетинг), **[П]** провайдер модели,
**[С]** сообщество, **[Вывод]** вывод исследователя. Цены и состав моделей меняются — сверять перед покупкой.

## Коротко

- Higgsfield — агрегатор видео- и фото-моделей (Kling 3.0, Veo 3.1, Seedance 2.x, Wan, Minimax, Grok, свои Soul /
  Cinema Studio) плюс студии поверх них. Sora не рассчитывать: OpenAI закрыла её API 24.09.2026.
- Три канала доступа: **сайт / MCP / CLI** — по подписке и на кредитах (Unlimited действует только на сайте);
  **API** — отдельный долларовый баланс от $5, оплата видео посекундно, Veo и Sora через API недоступны;
  **плагин для After Effects и Premiere** с мостом `bridge.higgsfield.ai/mcp` — официальная связка Claude ↔ AE
  от Higgsfield (подробно в `after-effects.md`).
- Для Claude Code сама Higgsfield советует **CLI + skills**, а не MCP (меньше токенов):
  `brew install higgsfield-ai/tap/higgsfield` → `higgsfield auth login` (вход в браузере) →
  в Claude Code `/plugin marketplace add higgsfield-ai/skills` и `/plugin install higgsfield@higgsfield`.
  Хостинговый MCP — `https://mcp.higgsfield.ai/mcp` (OAuth), он для чатов (claude.ai).
- Промпты: сначала ключевой кадр → image-to-video в 720p → финал в 1080p; одно движение камеры на клип;
  персонажи и продукты держать через Soul ID / Elements; **текст и логотипы не генерировать — накладывать кодом**.
- Права: результаты можно отдавать заказчикам и в рекламу без атрибуции; защита от исков по IP — только Enterprise;
  по умолчанию контент идёт в обучение моделей Higgsfield; на бесплатном плане водяной знак.
- В наш конвейер: скачивать сразу (хранение от 7 дней) вместе с JSON-журналом (модель, промпт, request_id, кредиты);
  клипы обычно 24 fps → к 60 fps отдельно (ffmpeg `fps`/`minterpolate`, RIFE, Topaz); в страницу под Playwright
  `<video>` не встраивать — кадры PNG-секвенцией или наложение графики с альфой в ffmpeg.

## Решения и статус (2026-10-20)

- Ничего из Higgsfield не установлено и не подключено: нужна платная подписка, установка — по решению автора.
- Не ставить: MCP-серверы на cookies сессии (jfikrat, nukIeer), скиллы с входом через Playwright (AKCodez) —
  нарушают ToS. Скрипт `setup` из higgsfield-ai/skills ставит CLI через `curl | sh` — CLI ставить заранее через brew.
- Агент может слить кредиты: лимита расхода нет. Генерации — только с явного разрешения, перед партией `generate cost`.
- Оплата из РФ: российские карты через Stripe не проходят [С].
- Репозитории по теме склонированы: `refs/repos/` (группа «Higgsfield», приоритет R в `refs/repos.json`).

---

# Подробно

Метки: **[О]** означает официальные docs, help center или GitHub `higgsfield-ai`. **[О-блог]** означает официальный блог (там много маркетинга). **[П]** означает первоисточник провайдера модели. **[С]** означает сообщество и сторонние сайты. **[Вывод]** означает мой вывод без прямого источника.

---

### 1. Что такое Higgsfield сейчас

**Суть.** Это агрегатор чужих моделей плюс собственные модели и студии поверх них. На сайте и в агентах доступно 30+ моделей [О] ([cli](https://higgsfield.ai/cli), [mcp](https://higgsfield.ai/mcp)). Есть три отдельных канала доступа:

1. **Веб, MCP и CLI** работают по подписке и на кредитах.
2. **API** — отдельный продукт с отдельным долларовым балансом. Подписка для него не нужна [О] ([help: Higgsfield API](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api)).
3. **Плагин для After Effects и Premiere** [О-блог] ([AE](https://higgsfield.ai/blog/higgsfield-after-effects)).

**Продукты и режимы**
- **Cinema Studio 4.0** (12.08.2026) [О-блог] ([пост](https://higgsfield.ai/blog/cinema-studio-4-0)):
  - до 30 с за генерацию и до 50 референсов, до 1080p;
  - камера (Modern, 35mm, 8mm, DV), линзы (Anamorphic, Vintage…), диафрагма f/1.4–f/11;
  - 30+ пресетов движения, Tempo (Calm, Single Shot…), жанр, эпоха, свет, пост-грейдинг;
  - продление клипа вперёд и назад.
- **Пресеты камеры DoP**. Категории: Basic, Epic Camera Control, Effects, Mix (смешивание пресетов) [О] ([help DoP](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-use-dop)).
- **Персонажи** [О] ([Soul ID](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character)):
  - **Soul 2.0, Soul Cinematic** — модели изображений;
  - **Soul ID** — обученное лицо реального человека;
  - **Soul Cast** — вымышленные персонажи;
  - **Elements** — персонажи, предметы и продукты, которые переиспользуются между клипами.
- **Lipsync Studio**: Speak v2, Kling Avatars 2.0, lipsync-2, InfiniteTalk [О-блог] ([пост](https://higgsfield.ai/blog/19fPMcKM5T0c8o8HQGdgyW)).
- **Прочее**: Upscale (апскейл, дефликер, стабилизация) [О-блог] ([пост](https://higgsfield.ai/blog/Upgrade-the-Quality-of-Old-Videos-using-Upscale)). Также Genjutsu (перенос движения, замена объекта), Katana (монтаж), агент Supercomputer, Marketing Studio, удаление фона на видео [О] ([главная](https://higgsfield.ai), [MODELS.md](https://raw.githubusercontent.com/higgsfield-ai/cli/main/MODELS.md)).

**Модели в каталоге CLI** [О] ([MODELS.md](https://raw.githubusercontent.com/higgsfield-ai/cli/main/MODELS.md)):
- **Видео:**
  - Kling 2.6, 3.0, 3.0 Turbo. На вебе ещё Omni, O1, Motion Control [О] ([help Kling](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-use-kling)).
  - Veo 3, 3.1, 3.1 Lite.
  - Seedance 1.5 Pro, 2.0, 2.0 Mini. На вебе ещё 2.5 и 2.5 Edit [О] ([help Seedance](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-use-seedance)).
  - Minimax Hailuo 2.3, Wan 2.6 и 2.7 (Wan 3.0 на главной), Grok Video 1.5, Gemini Omni Flash, видеомодели Cinema Studio 2, 3.0 и 3.5.
- **Изображения:** Nano Banana Pro, Nano Banana 2 и Lite, GPT Image 2 и 2.5, Flux 2 и Kontext, Seedream 4.5 и 5 Lite, Recraft v4.1 (есть вектор), Soul v2, Kling Omni Image, Z-Image.
- **Аудио:** Seed Audio, TTS (варианты ElevenLabs, Minimax и др.), музыка Sonilo, звуковые эффекты Mirelo.
- **3D:** Tripo, image→3D, риггинг.

**Каталог API** — 84 эндпоинта (17 изображений, 67 видео). Семейства: Seedance, Kling, Wan, MiniMax, LTX, PixVerse, Grok, Cinema Studio, Soul и др. **Veo и Sora в API нет** [О] ([docs/models](https://docs.higgsfield.ai/docs/models.md)).

**Статус Sora 2**
- OpenAI убрала Sora 2 из своего API 24.09.2026 [С со ссылкой на страницу депрекаций OpenAI] ([techjack](https://techjacksolutions.com/ai-brief/openai-videos-api-sora-2-deprecated-september-2026/), [zilliz](https://zilliz.com/ai-faq/what-is-the-sora-shutdown-timeline)).
- В каталогах CLI и API Higgsfield Sora нет [О]. Промостраницы Sora на сайте ещё висят — на них не рассчитывать.

**Veo 3.1 Preview.** Google отключает эти модели 22.10.2026 [П] ([Gemini API](https://ai.google.dev/gemini-api/docs/video)). Варианты `veo-3-1-preview` в CLI могут перестать работать [Вывод].

---

### 2. Промпты: лучшие практики

#### Официальное (help center Higgsfield)

**Порядок работы с Seedance** [О] ([help Seedance](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-use-seedance)):
1. Начинать с image-to-video в 720p и с коротких клипов: это предсказуемее и дешевле text-to-video.
2. Порядок частей промпта: субъект и действие → окружение и свет → движение камеры → настроение или стиль.
3. Использовать конкретные термины камеры: `dolly in`, `truck left`, `arc shot`, `push in`, `pull back wide`, `handheld follow`, `crane up`, `orbital move`.
4. Смотреть клип целиком: проблемы чаще всего появляются на 5–8 секунде.
5. За одну итерацию менять одно: либо промпт, либо референс.
6. Когда композиция найдена, перезапустить тот же промпт в 1080p или 4K.

**Референсы Seedance** [О] (там же):
- Роли задаются тегами `@character`, `@style`, `@motion`, `@audio`.
- Лимиты Seedance 2.0: 9 изображений, 3 видео, 3 аудио.
- Лимиты Seedance 2.5: 30 изображений, 10 видео, 10 аудио, не больше 50 всего.
- `@character` держит лицо только внутри одной генерации. Между клипами нужен **Element** (для реальных людей — сначала Soul ID).

**Kling** [О] ([help Kling](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-use-kling)):
- Мультишот описывается сценами как связанные сюжетные биты.
- Ставить start-кадр и end-кадр. Последний кадр сцены становится стартовым кадром следующей.
- Персонажей и продукты фиксировать через Elements.
- Есть жанр и speed ramp (Slow-mo, Bullet Time, Impact…).
- Черновики делать на Turbo, финал на полной модели.

**Cinema Studio 4.0** [О-блог] ([пост](https://higgsfield.ai/blog/cinema-studio-4-0)):
- Сначала выбрать жанр, затем камеру, линзу и цвет в интерфейсе. Тогда промпту остаётся только описать сцену.
- Персонажей отмечать `@имя` с эмоцией, иначе выражения лиц получаются нейтральными.
- Для многобитовых сцен размечать таймкоды: `0–3s`, `3–6s`.

#### Консистентность персонажа и места

**Soul ID** [О] ([help Soul ID](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character)):
- Обучается на 20+ фото одного человека, максимум 80. Нужны разные ракурсы и хотя бы одно фото в полный рост.
- Не годятся очки, тени и групповые фото. Разрешены только свои фото или фото с согласием человека.
- Результат — «тот же человек», но не попиксельная копия. Экспортировать обученную модель нельзя.

**Место** [О-блог] ([гайд по консистентности](https://higgsfield.ai/blog/consistent-characters-locations)):
- Место задаётся референс-изображением локации, а не текстом. При текстовом описании окна и материалы «плывут» между кадрами.
- Лучший кадр каждой генерации вручную передаётся в следующую.

#### Сообщество (проверено на свежих гайдах)

**Шаблон промпта** [С] ([FrankX, 10.10.2026](https://www.frankx.ai/guides/higgsfield-camera-movement-prompts)): референс → стартовый кадр и высота камеры → **одно** движение камеры → одно действие → скорость → финальный кадр и удержание → что не должно меняться.

**Советы оттуда же:**
- Не смешивать push, orbit и zoom в одном промпте.
- Орбиту давать малой дугой, а не полным оборотом.
- Если ломается движение, зафиксировать либо камеру, либо субъект.
- **Текст и логотипы не генерировать, а накладывать в монтаже.**

**Прочее из сообщества:**
- Kling 3.0 выдаёт только 16:9, 9:16 и 1:1. «2.35:1» в промпте работает как стилистика, а не как формат кадра [С] ([OSideMedia](https://github.com/OSideMedia/higgsfield-ai-prompt-skill)).
- Точные размеры в пикселях модели часто отклоняют. Задавать соотношение сторон [С] ([techsy](https://techsy.io/en/blog/higgsfield-mcp-claude-code)).

#### Длительность и разрешение

| Модель | Длительность | Разрешение | Источник |
|---|---|---|---|
| Seedance 2.0 | 4–15 с | 480p–4K, 9:16 есть | [О] [API](https://docs.higgsfield.ai/docs/models/seedance-2/reference-to-video.md) |
| Seedance 2.5 | 4–30 с | до 1080p, только с Plus | [О] |
| Kling 3.0 | 3–15 с | до 4K | [О] |
| Kling 3.0 Motion Control | до 30 с | — | [О] |
| Veo 3.1 | 4, 6 или 8 с | 720p, 1080p, 4K; только 16:9 и 9:16 | [П] [Veo docs](https://ai.google.dev/gemini-api/docs/veo) |
| Minimax | 6 или 10 с | — | [О] MODELS.md |

- **Veo 3.1:** для 1080p и 4K обязательна длительность 8 с [П].
- **Значение по умолчанию в CLI и API — 720p.** Финальное разрешение нужно указывать явно [О].

#### Что ломается
- Деградация на 5–8 секунде.
- Неожиданные склейки внутри клипа.
- Лицо «уплывает» на орбите камеры.
- Не получаются руки и контакт с продуктом.
- Текст в кадре получается плохо [О], [С FrankX].
- NSFW-флаги срабатывают на безобидное: купальники, спорт, медицина. Помогает переформулировать или сменить референс. Кредиты возвращаются [О] ([help NSFW](https://higgsfield.ai/creator-hub/help-center/troubleshooting/content-flagged-as-nsfw)).

---

### 3. API и автоматизация

#### Путь А — CLI + Skills (официальная рекомендация для Claude Code)

**Что говорит Higgsfield.** CLI — для кодинговых агентов, MCP — для чатов. CLI расходует минимум токенов, а MCP передаёт полную схему при каждом вызове [О] ([help CLI](https://higgsfield.ai/creator-hub/help-center/mcp-cli/how-do-i-access-higgsfield-via-cli)).

**Установка CLI** [О] ([README cli](https://github.com/higgsfield-ai/cli), MIT):
- `brew install higgsfield-ai/tap/higgsfield` или `npm i -g @higgsfield/cli`.
- Вариант с `curl … | sh` автору не подходит: curl запрещён.
- Скрипт проверяет SHA-256, ставит бинарь в `/usr/local/bin` и создаёт ссылки `higgs` и `hf` [О] ([install.sh](https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh)).

**Вход.** Команда `higgsfield auth login` открывает вход в браузере. Токены короткоживущие. Как работать без браузера (CI), не описано [О].

**Команды** [О]:
- `generate create|cost|wait|get|list`, `model list`, `upload`, `soul-id create|wait`, `preset list`;
- флаги `--wait`, `--json`, `--aspect_ratio`, `--resolution`, `--duration`, `--start-image`, `--soul-id`.

**Skills** [О] ([skills](https://github.com/higgsfield-ai/skills), MIT, v0.13.0, 1.3k★):
- Установка внутри Claude Code: `/plugin marketplace add higgsfield-ai/skills`, затем `/plugin install higgsfield@higgsfield`.
- Другой путь: `npx skills add higgsfield-ai/skills`.
- Состав: generate, soul-id, product-photoshoot, brandkit, marketplace-cards, websites, video-explainer, youtube-thumbnail.
- Если CLI ещё нет, скрипт `setup` ставит его через `curl|sh` [О] ([setup](https://raw.githubusercontent.com/higgsfield-ai/skills/main/setup)). Поэтому CLI лучше поставить заранее через brew.

**Оплата и ответственность:**
- Нужна **платная подписка** [О] ([help connect](https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-connect-higgsfield-to-ai-agent)).
- Каждая генерация списывает кредиты. Unlimited и бесплатные генерации в CLI и MCP не действуют [О].
- За всё, что агент сгенерирует через аккаунт, отвечает владелец аккаунта (Developer Terms) [О].

#### Путь Б — хостинговый MCP

**Адрес сервера** [О] ([help connect](https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-connect-higgsfield-to-ai-agent)):
- `https://mcp.higgsfield.ai/mcp`, вход через OAuth, ключ не нужен.
- В claude.ai: Settings → Connectors → Add custom connector.

**Команда для Claude Code** [С] ([techsy](https://techsy.io/en/blog/higgsfield-mcp-claude-code)): `claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp`. Сама Higgsfield для Claude Code советует CLI [О], [С] ([MeltFlex](https://www.meltflexai.com/blog/higgsfield-mcp)).

**Ограничения** [О]:
- Лимита расхода кредитов нет. Ограничения в промпте агент не обязан соблюдать.
- Агент не видит локальные файлы: их загружают через окно Higgsfield.
- Когда токен истекает, MCP падает с ошибкой «Authorization… failed», и нужно переподключиться.

**Мост для After Effects:** `bridge.higgsfield.ai/mcp`. Нужен AE 2024+ и плагин; на macOS работает universal binary [О-блог] ([AE](https://higgsfield.ai/blog/higgsfield-after-effects)).

#### Путь В — Higgsfield API (для своего конвейера)

**Доступ** [О] ([quickstart](https://docs.higgsfield.ai/docs/quickstart.md), [auth](https://docs.higgsfield.ai/docs/authentication.md)):
- База — `https://api.higgsfield.ai`, заголовок `Authorization: Key KEY_ID:KEY_SECRET`.
- Ключи выдаёт консоль. В разных документах она называется console, open или cloud.higgsfield.ai — путаница в самих источниках.

**Цикл запроса** [О] ([quickstart](https://docs.higgsfield.ai/docs/quickstart.md)):
1. `POST /<модель>` с заголовком `Idempotency-Key`.
2. Ответ: `request_id`, `status_url`, `cancel_url`.
3. Опрос `GET /requests/{id}/status`, пока статус не станет `completed`, `failed`, `nsfw` или `canceled`.

**Вебхуки** [О] ([webhooks](https://docs.higgsfield.ai/docs/how-to/webhooks.md)):
- Задаются параметром `?hf_webhook=`.
- Приходят только для финальных статусов. Повторы идут 2 часа, возможны дубли.
- **Подпись не задокументирована.** Безопасная практика — использовать вебхук только как сигнал, а результат перечитывать через авторизованный status.

**Загрузка файлов** [О] ([uploads](https://docs.higgsfield.ai/docs/concepts/file-uploads.md)):
- Сначала `POST /files/generate-upload-url`, затем PUT на presigned-URL.
- Форматы: JPEG, PNG, WebP, GIF, WAV, MP4.

**Лимиты** [О] ([rate limits](https://docs.higgsfield.ai/docs/concepts/rate-limits.md), [help API](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api)):
- Ограничивается число одновременных запросов. При превышении приходит 400, заголовков `Retry-After` нет.
- По help center — 20 одновременных запросов на ключ.

**Деньги и хранение** [О] ([billing](https://docs.higgsfield.ai/docs/concepts/billing-and-retention.md), [FAQ](https://docs.higgsfield.ai/docs/help/faq.md)):
- Предоплата в USD, минимум $5.
- Видео тарифицируется посекундно. Цену можно узнать заранее через estimate-эндпоинт.
- Списание только за успешные генерации: `failed` и `nsfw` возвращаются.
- Средства сгорают через год.
- **Результаты хранятся минимум 7 дней — скачивать сразу.**

**SDK** [О] ([sdk](https://docs.higgsfield.ai/docs/how-to/sdk.md)):
- Python: `pip install higgsfield-client` (Apache-2.0), переменная `HF_KEY=id:secret`, методы `subscribe` и `submit` [О] ([repo](https://github.com/higgsfield-ai/higgsfield-client)).
- JS: `@higgsfield/client/v2`, переменная `HF_CREDENTIALS`, работает только на сервере. Лицензия MIT указана в README, но файла LICENSE нет [О] ([repo](https://github.com/higgsfield-ai/higgsfield-js)).

#### MCP-серверы сообщества (оценка)

| Репозиторий | Оценка |
|---|---|
| [Hikhakk/higgsfield-mcp-unified](https://github.com/Hikhakk/higgsfield-mcp-unified) (MIT, 97★, 17.10.2026, alpha) | Работает с официальным API по ключу, есть оценка цены и вебхуки. Опциональный «web backend» реверс-инжинирит приватный бэкенд; сам README предупреждает о конфликте с ToS — **держать выключенным**. Установка: `claude mcp add higgsfield -e HIGGSFIELD_API_KEY=… -e HIGGSFIELD_SECRET=… -- uvx --from higgsfield-mcp-unified higgsfield-mcp`. |
| [geopopos/higgsfield_ai_mcp](https://github.com/geopopos/higgsfield_ai_mcp) (MIT, 42★, 11.2025) | Работает с официальными ключами, но устарел. |
| [jfikrat/higgsfield-mcp](https://github.com/jfikrat/higgsfield-mcp) (3★) и [nukIeer/higgsfield-unlimited-mcp](https://github.com/nukIeer/higgsfield-unlimited-mcp) (14★) | **Не использовать.** Берут cookies сессии и обходят DataDome: риск бана и нарушение ToS (обход защиты запрещён [О] [help NSFW](https://higgsfield.ai/creator-hub/help-center/troubleshooting/content-flagged-as-nsfw)). |

**Только промпт-скиллы, без вызовов:**
- [OSideMedia/higgsfield-ai-prompt-skill](https://github.com/OSideMedia/higgsfield-ai-prompt-skill) (MIT, 766★). Пишет только промпты: в README указано, что CLI и API он не вызывает.
- [rediumvex](https://github.com/rediumvex/ai-video-generator-claude) (MIT).
- [AKCodez](https://github.com/AKCodez/higgsfield-claude-skills): без лицензии, автоматизирует вход через Playwright-браузер — не брать.

---

### 4. Тарифы, кредиты, лицензия

**Цены планов** — источники расходятся, официальная страница `/pricing` рендерится JS и не прочиталась:

| План | Вариант 1 [С] ([Techsifted, 09.2026](https://techsifted.com/roundups/higgsfield-ai-pricing-2026/)) | Вариант 2 [С] ([MeltFlex, 14.09.2026](https://www.meltflexai.com/blog/higgsfield-mcp)) |
|---|---|---|
| Starter | $19, 270 кр. | $15, 200 кр. |
| Plus | $47–59, 1200 кр. | $39, 1000 кр. |
| Ultra | $99–129, 3000 кр. | $99, 3000 кр. |
| Team | $65–79 за место, 5000 кр. на всех | — |

Вывод: **сверить на сайте перед покупкой.**

**Кредиты** [О] ([help](https://higgsfield.ai/creator-hub/help-center/credits-and-usage/how-credits-work)):
- Подписочные кредиты сгорают каждый цикл.
- Пакеты и автопополнение живут 90 дней.
- Unlimited действует только в вебе. MCP, CLI, Canvas и Supercomputer всегда тратят кредиты [О].

**Ориентиры цен:**
- Seedance 2.0, 720p, 8 с — 36 кредитов (Fast — 28). Обучение Soul ID — 25 кредитов [О-блог] ([гайд](https://higgsfield.ai/blog/consistent-characters-locations)).
- Seedance 2.0 в 1080p — около 9 кредитов в секунду [С Techsifted].
- Kling 3.0 — около 50, Veo 3.1 — около 60 кредитов за генерацию [С techsy].

**Возвраты** [С] ([Techsifted](https://techsifted.com/roundups/higgsfield-ai-pricing-2026/)):
- Только в течение 7 дней и только если кредиты не тратились. Продления не возвращаются.
- Жалобы на отмену подписки и списания собраны у конкурента [С] ([MindStudio](https://www.mindstudio.ai/blog/higgsfield-subscription-cancellation-complaints)).
- **Совет:** начинать с помесячной оплаты.

**Лицензия** [О] ([help: кто владеет](https://higgsfield.ai/creator-hub/help-center/account-and-privacy/who-owns-my-generations-and-can-i-use-them-commercially), [обновление ToU, вступило 27.08.2026](https://higgsfield.ai/blog/terms-of-use-privacy-policy-update)):
- Higgsfield не претендует на входные данные и результаты (ToU §4.4).
- Коммерческое использование не ограничено: реклама, клиентские работы, передача и сублицензия заказчику. Атрибуция не нужна. Права сохраняются после отмены подписки.
- Есть оговорки:
  - результаты не эксклюзивны;
  - нельзя обучать на них ИИ-модели;
  - вы отвечаете за чужие авторские права, товарные знаки и образ людей (§5.1, §5.3);
  - **защита от исков по IP — только на Enterprise**;
  - на бесплатном плане есть водяной знак;
  - контент по умолчанию идёт в обучение моделей Higgsfield. Исключение — Enterprise; удаление контента прекращает дальнейшее использование.
- Ролики Veo несут невидимый SynthID [П] ([Veo docs](https://ai.google.dev/gemini-api/docs/veo)).
- Площадки требуют маркировать реалистичный ИИ-контент: YouTube, TikTok, Meta [С] ([ppc.land](https://ppc.land/youtube-shifts-generative-ai-labels-to-spots-viewers-will-actually-see/)).

**Модерация** [О] ([trust](https://higgsfield.ai/trust)):
- Правила свои у каждой модели. Обходить модерацию запрещено.
- Для Team есть скоринг похожести на знаменитостей и чужие бренды.

**Оплата из РФ:** российские карты не проходят через Stripe, остаются посредники [С] ([РБК Компании](https://companies.rbc.ru/news/T4fASyy3Gs/kak-oplatit-higgsfield-iz-rossii-v-2026-godu-aktualnyie-sposobyi/)).

---

### 5. Встраивание в наш конвейер (HTML/SVG → Playwright → ffmpeg)

**Схема [Вывод на основе источников ниже]:**

1. **Сгенерировать ключевой кадр** в Nano Banana Pro, Soul или GPT Image, затем сделать image-to-video.
   - Вертикаль 9:16 заказывать нативно: её поддерживают Seedance, Kling и Veo [О], [П].
   - В промпте не должно быть текста и логотипов.
2. **Скачать сразу** в `assets/ai/` (хранение у Higgsfield — от 7 дней [О]).
   - Рядом положить JSON: модель, промпт, request_id, кредиты. Это журнал для повторов и для отчёта заказчику.
3. **Проверить через `ffprobe`:** fps, размер, `color_*`, аудио. Чего ожидать:
   - Veo — 24 fps [П];
   - Seedance 2.5 — CFR 24 fps, H.264 High, AAC 32 кГц [С] ([Segmind](https://blog.segmind.com/seedance-2-5-review-five-real-world-use-cases-and-exactly-what-each-one-costs/));
   - fps у Kling в источниках противоречит (24, 30, 60), поэтому проверять фактически [С].
   - По умолчанию разрешение 720p, то есть 720×1280 в вертикали [О].
4. **Привести к 1080×1920.** Лучше заказать 1080p сразу или сделать Upscale в Higgsfield, чем масштабировать в ffmpeg. Иначе `scale=1080:1920:flags=lanczos`.
5. **Привести к 60 fps.** 24→60 — нецелый множитель 2.5 [Вывод]. Варианты:
   - `fps=60` дублирует кадры: дёшево, но с неравномерной каденцией. Подходит для спокойного фона под графикой [Вывод].
   - `minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1` — классический оптический поток на CPU; на ИИ-видео бывают артефакты [О ffmpeg] ([filters](https://ffmpeg.org/ffmpeg-filters.html#minterpolate)).
   - RIFE на M5 через MPS: [venhance](https://libraries.io/npm/venhance) заявляет около 51 мс на кадр 720p [С]. Либо пресет Topaz «4K & 60 FPS» (Proteus + Apollo) [П] ([Topaz](https://docs.topazlabs.com/topaz-video/reference-guide/presets)).
   - Альтернатива: собирать финал в 30 fps или оставить ИИ-слой «киношным» 24p под 60p-графикой [Вывод].
6. **Цвет.** Финальный файл тегировать `-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv` [О ffmpeg] ([codecs](https://ffmpeg.org/ffmpeg-codecs.html)). Если у ИИ-клипа нет тегов, считать его bt709 и не конвертировать дважды [Вывод].
7. **Композитинг [Вывод]:**
   - Не встраивать `<video>` в страницу под Playwright: покадровый захват видео недетерминирован.
   - Детерминированные варианты: распаковать клип в PNG-секвенцию с нужным fps и подавать кадры в движок. Либо рендерить графику с альфой (PNG, ProRes 4444) и собирать через `overlay` в ffmpeg.
8. **Звук.** Нативный звук моделей (32 кГц) обычно отрезать (`-an`), ставить свой саунд-дизайн 48 кГц [Вывод].
9. **Путь через After Effects:** панель Higgsfield (AE 2024+) или мост MCP [О-блог].

---

### Подводные камни

- **CLI создаёт ссылку `hf`**, которая перекрывает CLI Hugging Face с тем же именем [О] ([install.sh](https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh)), [П] ([HF](https://www.huggingface.co/blog/hf-cli)). Переменные `HF_*` тоже легко спутать.
- **Агент может слить кредиты.** Лимита нет [О]. Автоодобрять только инструменты чтения, а `generate_*` — никогда [С techsy]. Перед партией запускать `generate cost`.
- **Утечки ключей.** Ключ API — это деньги. Не класть его в репозиторий, в логи и в URL [О].
- **Подпись вебхуков не задокументирована** [О].
- **Сроки хранения:** результаты живут от 7 дней, загрузки временные [О].
- **Расхождения в документации:** имя консоли (console, open, cloud), число моделей (7, 16, 30+) и URL MCP (`mcp.higgsfield.ai/mcp`, но в одном посте `higgsfield.ai/mcp`) [О], [С].
- **Противоречие в help Seedance:** советует включать аудио только на финале «для экономии», но там же сказано, что звук не влияет на цену [О].
- **Нельзя полагаться на** Sora и на варианты Veo 3.1 Preview.
- **Блоги Higgsfield и `geo.higgsfield.ai`** — SEO-маркетинг. Цифры из них проверять.
- **Скиллы с `curl|sh`, cookies и Playwright-логином** — не ставить.

### Что не удалось проверить

- Официальные цены планов и цены API в $ за секунду для каждой модели: страницы рендерятся JS.
- Фактические fps, кодек, битрейт и цветовые теги файлов, скачанных с Higgsfield, особенно у Kling. Нужен `ffprobe` на реальном файле.
- Официальна ли команда `claude mcp add …`: она есть только у сообщества. Точный список инструментов MCP после входа тоже не проверен.
- Как работать в CI или без браузера: долгоживущих токенов CLI нет в документации. Телеметрия CLI не проверена.
- Формат выхода `video_background_remover`: есть ли альфа-канал и в каком контейнере (MOV).
- Доступна ли ещё Sora 2 в веб-интерфейсе Higgsfield после 24.09.2026.
- Полные условия ToU (§5) по знаменитостям и дипфейкам: прочитаны только пересказы help center.
