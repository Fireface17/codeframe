# Соцсети для агента: статистика и загрузка Shorts, Reels, TikTok и Telegram

Исследование 2026-10-21 по официальной документации площадок, сайтам сервисов и сообществу. Все страницы открыты
2026-10-21, в скобках дата обновления страницы, если она указана («б/д» — даты нет). Метки: **[О]** официальная
документация площадки или Anthropic, **[Серв]** сайт или документация сервиса, **[С]** сообщество (блоги, GitHub, форумы),
**[Вывод]** вывод исследователя. `{{проверить}}` — не подтверждено. Цены и правила меняются, перед покупкой сверять.

## 1. Коротко

- **Страны зрителей по каждому ролику** через API: YouTube — да, официально; TikTok — только через агрегатор
  (Upload-Post, Ayrshare), официальный Display API стран не отдаёт; Instagram — только по аккаунту в целом
  (от 100 подписчиков или вовлечений), по отдельному Reels стран нет; Telegram — стран нет вообще, только языки. [О]/[Серв]
- **TikTok: своё приложение для публичной загрузки бесполезно.** Без аудита публикация идёт только `SELF_ONLY` и
  только на приватный аккаунт, а «утилиту для загрузки в свои аккаунты» правила прямо называют неприемлемой для
  аудита (2026-08-04). [О]
- **YouTube:** справка `videos.insert` (2026-10-15) пишет, что видео из непроверенных проектов **не** блокируются в
  приватном режиме, хотя правило 2020 года об обратном в истории изменений так и не отменено — противоречие,
  проверить одной приватной загрузкой. Загрузки с 01.06.2026 считаются отдельно: 100 вызовов в сутки. [О]
- **Instagram:** для своего аккаунта хватает Standard Access, App Review не нужен. Reels публикуются только по
  публичной ссылке на файл, обложка — JPEG до 8 МБ (наши PNG конвертировать), Trial Reels через API есть с
  03.12.2025, отложенной публикации в API нет. [О]
- **Telegram:** бот публикует видео с подписью и своей обложкой (`cover`, Bot API 8.3, 12.02.2025), но не видит
  просмотров и не умеет откладывать. Статистику даёт только MTProto под личным аккаунтом. [О]
- **Официальных MCP для обычных публикаций нет ни у одной из 4 площадок**; у Meta и TikTok MCP только для рекламы.
  MCP сообщества на официальном API — молодые, от единиц до десятков звёзд. [О]/[С]
- **Агрегаторы со всеми 4 площадками:** Upload-Post, Ayrshare, Zernio (бывший Late), Publer, PostFast, Postiz.
  Без Telegram: Metricool, Buffer, Blotato. [Серв]
- **Лучшее соотношение для нас — Upload-Post:** Basic $24/мес или $16/мес при оплате за год; публичный TikTok через
  их приложение, по ролику TikTok — удержание, сохранения, новые подписчики и страны. Ayrshare даёт похожее от
  $149/мес. Zernio дешевле ($12/мес за 4 аккаунта), но страны TikTok — только при подключении бизнес-аккаунта. [Серв]
- **Claude в Chrome** умеет загружать файлы, но не больше 10 МБ за раз — наши ролики ~10 МБ, на границе. Правила
  YouTube, TikTok и Instagram запрещают автоматизированный доступ без разрешения. Годится только как запасной путь. [О]
- **Охват:** глава Instagram Моссери говорил, что отложенная публикация на охват не влияет — известно только в
  пересказе сервисов. По TikTok и YouTube данных нет. [С]

**Рекомендуемая связка: А + Б (Upload-Post), В — запасной [Вывод]**

| Площадка | Статистика | Загрузка | Почему |
|---|---|---|---|
| YouTube | свой скрипт: YouTube Analytics API | свой скрипт: Data API `videos.insert` | страны и кривая удержания по каждому Shorts есть только здесь; бесплатно. Обложку Shorts — руками в Студии на компьютере. Если тестовая загрузка уйдёт в приват — грузить через Upload-Post |
| Instagram | свой скрипт: Instagram API with Instagram Login | Upload-Post | свой API даёт среднее время просмотра и skip rate (в Upload-Post их нет); своя загрузка требует публичного хостинга файла — Upload-Post принимает файл сам, есть обложка и Trial Reels |
| TikTok | Upload-Post: аналитика по ролику и аудитория | Upload-Post | единственный недорогой путь к публичной загрузке и странам для личного аккаунта без аудита своего приложения |
| Telegram | свой скрипт MTProto (Telethon), только чтение, раз в сутки | свой бот: `sendVideo` с `cover` | стран нет ни в одном пути; бот бесплатный, публикует сразу — время выбирает агент |

## 2. Площадки

| | Статистика своих роликов | Загрузка | Проверка приложения | Подвохи |
|---|---|---|---|---|
| **YouTube** | просмотры, `engagedViews`, среднее время и % просмотра, кривая удержания (100 точек), пересылки, подписки с ролика, лайки, комментарии; **страны по ролику** (порог скрыт); задержка 48–72 ч | название, описание, теги, приватность, `publishAt` (расписание), флаг ИИ, уведомление подписчиков; Shorts определяется сам; обложка Shorts через API — `{{проверить}}` | для себя не нужна: личный проект до 100 пользователей; аудит API — форма, срок не указан | противоречие о приватной блокировке; токены живут 7 дней, пока проект в режиме Testing; 100 загрузок в сутки |
| **Instagram** | просмотры, охват, лайки, комментарии, пересылки, сохранения, среднее и общее время просмотра, `reels_skip_rate`, репосты; **страны только по аккаунту** (≥100); подписок с Reels и кривой удержания нет | Reels: подпись, обложка JPEG, кадр-обложка, в ленту, соавторы, место, Trial Reels, ярлык ИИ; файл — по публичной ссылке; расписания нет | свой аккаунт: Standard Access, App Review не нужен; в одном гайде противоречие | токен на 60 дней, продлевать; лимит 50 или 100 публикаций в сутки — документы расходятся; тестовый аккаунт должен быть публичным |
| **TikTok** | Display API: просмотры, лайки, комментарии, пересылки по публичным роликам; **нет** сохранений, времени просмотра, стран | Direct Post: подпись, приватность, запрет дуэтов, стежков и комментариев, обложка — кадр по времени, ярлыки рекламы и ИИ; своей картинки-обложки и расписания нет; черновик в «Входящие» — без подписи | без аудита: до 5 авторов в сутки, только приватный аккаунт, только `SELF_ONLY`; личный инструмент аудит не пройдёт | ~15 публикаций в сутки на автора; 6 запросов в минуту; токен 24 ч, продление 365 дней |
| **Telegram** | бот: просмотров нет, только счётчики реакций; MTProto: просмотры и пересылки по постам, графики канала (рост, источники, языки, реакции); **стран нет** | бот: видео до 50 МБ, подпись до 1024 знаков, `cover`; откладывать бот не может; MTProto умеет `schedule_date` | нет | MTProto под личным аккаунтом: вход «под наблюдением», сессия = полный доступ к аккаунту |

### YouTube

- Просмотры Shorts с 31.03.2025 считаются с каждого старта и повтора; прежний счёт сохранён в `engagedViews`.
  С конца августа 2026 так считаются все форматы. [О] [revision_history](https://developers.google.com/youtube/analytics/revision_history) (запись 2026-08-27)
- Метрики `averageViewDuration`, `averageViewPercentage`, `shares` (только кнопка «Поделиться»), `subscribersGained`
  (по одному ролику — только подписки со страницы просмотра), `likes`, `comments`. Отдельной метрики «сохранения» нет;
  ближайшее — `videosAddedToPlaylists` [Вывод]. [О] [metrics](https://developers.google.com/youtube/analytics/metrics) (2026-09-14)
- Удержание: отчёт по одному ролику с измерением `elapsedVideoTimeRatio` — `audienceWatchRatio`,
  `relativeRetentionPerformance`. Страны: отчёт «по странам» с фильтром по ролику (просмотры, среднее время,
  пересылки, подписки). [О] [channel_reports](https://developers.google.com/youtube/analytics/channel_reports) (б/д)
- Пороги для стран и демографии «не публикуются»; данные приходят с задержкой. [О] [data_model](https://developers.google.com/youtube/analytics/data_model) (2026-10-15)
- Фильтр Shorts: `creatorContentType=SHORTS`; источник трафика `SHORTS` — лента Shorts. [О] [dimensions](https://developers.google.com/youtube/analytics/dimensions) (2026-10-15)
- Загрузка: название до 100 знаков, описание до 5000 байт, теги до 500 знаков, `publishAt` — только для ещё
  не опубликованного приватного видео, `containsSyntheticMedia` (с 30.10.2024), `notifySubscribers`. [О] [videos](https://developers.google.com/youtube/v3/docs/videos) (2026-10-15)
- Shorts — любое квадратное или вертикальное видео до 3 минут; флага «Short» в API нет. [О] [справка](https://support.google.com/youtube/answer/15424877) (б/д)
- Обложка Shorts: справка — своя обложка «только в YouTube Студии на компьютере», нужен подтверждённый аккаунт [О]
  [справка](https://support.google.com/youtube/answer/72431); запуск с 25.07.2026 сначала для каналов Партнёрской программы
  [С] [ppc.land](https://ppc.land/youtube-ends-2-year-wait-for-shorts-thumbnails-but-blocks-a-b-testing/) (2026-07-26).
  `thumbnails.set` (50 единиц) про Shorts молчит — `{{проверить}}`.
- **Противоречие:** справка `videos.insert` — «Videos uploaded from unverified API projects are not restricted to
  private viewing mode»; в истории изменений правило 28.07.2020 о приватной блокировке без отмены. [О]
  [insert](https://developers.google.com/youtube/v3/docs/videos/insert) (2026-10-15), [v3 revision_history](https://developers.google.com/youtube/v3/revision_history).
  Блоги 2026 года ещё описывают блокировку и аудит в 2–4 недели [С] [postproxy](https://postproxy.dev/blog/youtube-upload-api-guide/).
- Квоты менялись дважды: 04.12.2025 загрузка подешевела с ~1600 до ~100 единиц; с 01.06.2026 у `videos.insert`
  своя корзина — 100 вызовов в сутки; прочее — 10 000 единиц в сутки. Квота Analytics API — `{{проверить}}`. [О]
  [quota](https://developers.google.com/youtube/v3/determine_quota_cost) (2026-10-15)
- OAuth: в режиме Testing доступ истекает через 7 дней вместе с refresh-токеном [О] [справка](https://support.google.com/cloud/answer/15549945);
  личные приложения до 100 пользователей освобождены от проверки и могут быть «In production» с предупреждением
  «непроверенное приложение» [О] [справка](https://support.google.com/cloud/answer/13464323). Клиент «Desktop app»,
  возврат на 127.0.0.1, PKCE [О] [installed-apps](https://developers.google.com/youtube/v3/guides/auth/installed-apps) (2026-10-16).
- Канал бренда выбирается в окне выбора аккаунта при входе; один токен — один канал. [С]

### Instagram (аккаунт «Автор», без страницы Facebook)

- Instagram API with Instagram Login работает с аккаунтами Business и Creator и не требует страницы Facebook
  (с 23.07.2024). Права: `instagram_business_basic`, `instagram_business_content_publish`,
  `instagram_business_manage_insights`; старые имена отключены 27.01.2025. [О] [обзор](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login), [changelog](https://developers.facebook.com/docs/instagram-platform/changelog)
- Метрики Reels: `views`, `reach`, `likes`, `comments`, `shares`, `saved`, `total_interactions`,
  `ig_reels_avg_watch_time`, `ig_reels_video_view_total_time`, `reels_skip_rate` (доля пропусков в первые 3 с,
  с 03.12.2025), `reposts`. `plays` и `impressions` отключены 21.04.2025. Подписки и визиты профиля — только для
  ленты и историй. Задержка до 48 ч. [О] [media insights](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights) (б/д)
- Страны: `follower_demographics` (от 100 подписчиков) и `engaged_audience_demographics` (от 100 вовлечений),
  разрез по стране, городу, возрасту, полу; топ-45; периоды только `this_week` и `this_month`. [О] [user insights](https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights) (б/д)
- Публикация: `media_type=REELS`, `video_url` — публичная ссылка; загрузка файла частями (`rupload`) — только для
  входа через Facebook Login for Business. Подпись до 2200 знаков, 30 хэштегов; `cover_url` — **JPEG до 8 МБ**;
  `thumb_offset`, `share_to_feed`, `collaborators` (до 3), `trial_params` (Trial Reels, стратегия MANUAL или
  SS_PERFORMANCE, с 03.12.2025), `is_ai_generated` (с 22.06.2026). Видео MP4, 3 с – 15 мин, до 300 МБ —
  наши подходят. Контейнер живёт 24 ч. [О] [content-publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing), [ig-user/media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media) (б/д)
- Лимит публикаций: в одном гайде 100 за 24 ч, в разделе каруселей того же гайда и в `content_publishing_limit`
  — 50. Для 5 роликов в неделю неважно. [О]
- Доступ: «If your app only serves your Instagram professional account… Standard Access is all your app needs»;
  App Review нужен только для Advanced Access. [О] [overview](https://developers.facebook.com/docs/instagram-platform/overview) (б/д).
  Но гайд по созданию приложения требует App Review «для живых данных», а тестовый аккаунт — публичный. [О]
  [create-a-meta-app](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/create-a-meta-app-with-instagram) — противоречие, `{{проверить}}` на деле.
  App Review, если всё же понадобится, ~20 дней [С] [bundle.social](https://bundle.social/blog/meta-app-review-20-days) (2026-07-05).
- Токены: короткий на 1 ч, длинный на 60 дней; продлевать не раньше чем через 24 ч и до истечения. [О] [business-login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login)

### TikTok (личный аккаунт)

- Display API: `user.info.stats` (подписчики, лайки, число видео); `video.list` — только публичные ролики:
  `view_count`, `like_count`, `comment_count`, `share_count`, `duration`, `is_aigc`. Сохранений, времени просмотра,
  удержания, стран нет. [О] [video object](https://developers.tiktok.com/doc/tiktok-api-v2-video-object) (2026-08-24)
- Страны и удержание через официальный API для личного аккаунта не подтверждены. Business API (Accounts) отдаёт
  `audience_countries`, `average_time_watched`, `full_video_watched_rate` для бизнес-профилей [С]
  [adverity](https://docs.adverity.com/reference/connectors/connector-tiktok-business.html); один блог 2026 года пишет, что
  и для личных, с заявкой на доступ с 20.03.2026 [С] [tryadeli](https://tryadeli.com/blog/tiktok-api-for-business-vs-developers) (2026-10-09) — `{{проверить}}`.
- Direct Post: сначала `creator_info`; поля `title` (подпись до 2200 знаков, хэштеги и упоминания распознаются),
  `privacy_level` (из выданных вариантов), `disable_duet/stitch/comment`, `video_cover_timestamp_ms`,
  `brand_content_toggle`, `is_aigc`. Своей картинки-обложки и расписания нет. [О] [direct post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post) (2026-08-24)
- Черновик во «Входящие» (`video.upload`): без подписи и приватности, автор дописывает в приложении; до 5
  неопубликованных за 24 ч. Нужен ли аудит — на странице не сказано, сообщество пишет «нет». [О] [upload](https://developers.tiktok.com/doc/content-posting-api-reference-upload-video), [С] [bundle.social](https://bundle.social/blog/tiktok-api-approval)
- Без аудита: «up to 5 users to post in a 24 hour window», аккаунт «must be set to private», «only post contents
  in SELF_ONLY». Неприемлемо: «A utility tool to help upload contents to the account(s) you or your team
  manages». ~15 публикаций в сутки на автора на все приложения. [О] [guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) (2026-08-04)
- Аудит: недели; Postiz-самосборщиков отклоняли за приватность по умолчанию [С] [issue #1563](https://github.com/gitroomhq/postiz-app/issues/1563);
  PostWire — ~3 недели и три отказа [С] [postwire](https://postwire.io/platforms/tiktok/approval).
- Токены: доступ 24 ч, продление 365 дней. [О] [tokens](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- Research API — только для учёных, не для автора. [О] [research-api](https://developers.tiktok.com/products/research-api)

### Telegram (публичный канал)

- Бот-админ канала: `sendVideo` с `caption` до 1024 знаков, `cover` и `start_timestamp` (Bot API 8.3,
  12.02.2025), `thumbnail` JPEG до 200 КБ, загрузка до 50 МБ (наши ~10 МБ). [О] [api](https://core.telegram.org/bots/api), [changelog](https://core.telegram.org/bots/api-changelog)
- «Bots cannot schedule messages»; просмотров у бота нет; счётчики анонимных реакций приходят обновлениями
  `message_reaction_count` с задержкой. [О] [sendMessage](https://core.telegram.org/method/messages.sendMessage), [api](https://core.telegram.org/bots/api)
- MTProto: `stats.getBroadcastStats` — рост, подписчики, часы, источники просмотров и подписок, **языки**,
  реакции; графика стран нет. Доступ по флагу `can_view_stats`, порог — «серверная настройка». [О] [stats](https://core.telegram.org/api/stats).
  Тур Telegram пишет «более 500 подписчиков» [О] [tour](https://telegram.org/tour/channels) (б/д), сторонние — 50 [С] — противоречие.
- `messages.getMessagesViews` — просмотры, пересылки, ответы по постам; `schedule_date` — отложенная публикация. [О] [getMessagesViews](https://core.telegram.org/method/messages.getMessagesViews), [scheduled](https://core.telegram.org/api/scheduled-messages)
- Риски MTProto: входы из неофициальных клиентов «automatically put under observation», за флуд и спам — бан. [О]
  [api_id](https://core.telegram.org/api/obtaining_api_id). §1.5 условий API запрещает использовать данные Telegram для
  обучения и «deployment of artificial intelligence» [О] [terms](https://core.telegram.org/api/terms) — чтение своей статистики
  агентом в серой зоне [Вывод].

## 3. MCP-серверы

Официальные: YouTube — нет, в списке MCP Google Cloud его нет [О] [release notes](https://docs.cloud.google.com/mcp/release-notes);
Meta — только Ads MCP (29.04.2026) [О] [Meta MCP](https://developers.facebook.com/documentation/mcp); TikTok — только Ads MCP
(13.05.2026) [С] digiday; Telegram — не найдено [Вывод]. Звёзды и дата последнего push — api.github.com, 2026-10-21 [С].

| Площадка | Сервер | ★ / push | Лицензия | Вход | Что умеет | Риск |
|---|---|---|---|---|---|---|
| YouTube | [pauling-ai/youtube-mcp-server](https://github.com/pauling-ai/youtube-mcp-server) | 28 / 2026-09-04 | MIT | свой Google OAuth | 40 инструментов: загрузка, обложка, страны, удержание, Shorts | низкий; README считает загрузку в 1600 единиц — устарело |
| YouTube | [ZubeidHendricks/youtube-mcp-server](https://github.com/ZubeidHendricks/youtube-mcp-server) | 587 / 2026-08-08 | MIT | API-ключ | только публичные данные, без Analytics и загрузки | низкий, нам не помогает |
| YouTube | [mrchevyceleb/youtube-mcp](https://github.com/mrchevyceleb/youtube-mcp), [t4god/youtube-creator-mcp](https://github.com/t4god/youtube-creator-mcp) | 3 / 2026-08…10 | MIT | OAuth | загрузка, аналитика | низкий, новые |
| Instagram | [IvanBBaev/instagram-mcp](https://github.com/IvanBBaev/instagram-mcp) | 4 / 2026-10-15 | MIT | **Instagram Login** | Reels, метрики, демография | низкий; в README — не проверен на живом аккаунте |
| Instagram | [jlbadano/ig-mcp](https://github.com/jlbadano/ig-mcp), [mcpware/instagram-mcp](https://github.com/mcpware/instagram-mcp), [mikusnuz/meta-mcp](https://github.com/mikusnuz/meta-mcp) | 199 / 61 / 30 | MIT | Facebook Login | публикация, метрики | нужна страница Facebook — не наш случай |
| Instagram | [trypeggy/instagram_dm_mcp](https://github.com/trypeggy/instagram_dm_mcp) | 186 / 2025-08-13 | MIT | логин и пароль | личка, сбор данных | **высокий: нарушение правил** |
| TikTok | [IvanBBaev/tiktok-mcp](https://github.com/IvanBBaev/tiktok-mcp) | 1 / 2026-10-19 | MIT | своё приложение, OAuth | Direct Post, черновики, список видео | низкий, но без аудита только `SELF_ONLY` |
| TikTok | [postoncehq/tiktok-mcp](https://github.com/postoncehq/tiktok-mcp) | 3 / 2026-10-16 | MIT | ключ PostOnce (хостинг) | публикация, расписание, обложка; без аналитики | третья сторона; платно после 7 дней |
| TikTok | [Seym0n/tiktok-mcp](https://github.com/Seym0n/tiktok-mcp) | 203 / 2026-08-19 | MIT | ключ TikNeuron | чтение данных постов | источник данных не раскрыт — `{{проверить}}` |
| TikTok | [makiisthenes/TiktokAutoUploader](https://github.com/makiisthenes/TiktokAutoUploader) (не MCP) | 1199 / 2026-10-16 | AGPL-3.0 | неофициальная веб-загрузка | загрузка | **высокий: нарушение правил**, AGPL |
| Telegram | [chigwell/telegram-mcp](https://github.com/chigwell/telegram-mcp) | 1871 / 2026-10-21 | Apache-2.0 | Telethon, личный аккаунт | отправка файлов, расписание; статистика не заявлена | средний: userbot, сессия = весь аккаунт |
| Telegram | [chaindead/telegram-mcp](https://github.com/chaindead/telegram-mcp) | 349 / 2026-05-28 | MIT | MTProto | чтение, черновики | средний: userbot |
| Telegram | [siavashdelkhosh81/telegram-bot-mcp-server](https://github.com/siavashdelkhosh81/telegram-bot-mcp-server) | 8 / 2026-09-12 | MIT | токен бота | 45 инструментов, видео с подписью; `cover` не описан | низкий; статистики нет |
| Все | Upload-Post MCP: `https://mcp.upload-post.com/mcp` или `npx @upload-post/mcp` | — | MIT | API-ключ или OAuth 2.1 | публикация, аналитика, аудитория | третья сторона держит токены [Серв] |
| Все | [gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app) | 37 519 / 2026-10-21 | AGPL-3.0 | ключ Postiz | 8 инструментов: публикация, расписание; без аналитики | на своём сервере TikTok — своё приложение и аудит |

Хостинговые MCP есть также у Metricool, Zernio, Ayrshare, Buffer, Publer, Blotato, PostFast — см. раздел 4.

## 4. Агрегаторы

| Сервис | Из 4 площадок | Instagram без страницы FB / личный TikTok | Публично в TikTok / YouTube | Обложки, Trial Reels | Статистика: страны, удержание | MCP | Цена за 4 аккаунта | Доступ к аккаунтам |
|---|---|---|---|---|---|---|---|---|
| **Upload-Post** | все 4 (Telegram — свой бот) | да / «любой аккаунт TikTok», личный прямо не назван | своё одобренное приложение, `DIRECT_POST` публично / YouTube публично по умолчанию | TikTok: кадр или картинка; IG `cover_url`, Trial Reels (по их доке — от 1000 подписчиков); YT обложка — подтверждённый канал | TikTok по ролику: сохранения, новые подписчики, среднее время, досмотры, кривая удержания, **страны и города**; IG по ролику: просмотры, охват, сохранения, пересылки + страны аккаунта; YT: просмотры, средний %, стран нет; TG нет | хостинг + npx, CLI, n8n | Basic $24/мес или $16/мес за год ($192), 5 профилей; Free без TikTok | токены хранятся до удаления + 30 дней; серверы Hetzner (Германия) |
| **Ayrshare** | все 4 | в доке противоречие о странице FB / «personal or business» | TikTok публично / YouTube **по умолчанию private** | TikTok и IG обложка, Trial Reels; Shorts без обложки | TikTok: **страны (топ-10)**, удержание, среднее время (от 100 подписчиков, неактивный >7 дней ролик — пусто); IG: среднее время, сохранения; YT: средний %, подписки, без демографии | хостинг | Premium **$149/мес**, без бесплатного | `{{проверить}}` |
| **Metricool** | без Telegram | да, базовые метрики / да | автопубликация TikTok | кадр-обложка; Trial Reels (12.2025) | YT: страны; TikTok: страны — только бизнес-аккаунт; REST API — только Advanced | хостинг, OAuth, **на любом плане, включая Free** | Starter $25/мес ($20 за год), Advanced $67 ($53); Free — 20 постов в месяц | `{{проверить}}` |
| **Buffer** | без Telegram | страница не нужна / не указано | TikTok публично | кадр-обложка; Shorts без обложки | просмотры, охват, пересылки, сохранения; **стран нет**; метрики «experimental» | на всех планах | $5/мес за канал (год $60) — помесячная цена `{{проверить}}` | взлом 2013 года, после — токены шифруются |
| **Zernio** (бывший Late) | все 4 (канал Telegram `{{проверить}}`) | да / через «TikTok for Business app», личный `{{проверить}}` | видео в TikTok только публично | «custom covers» | YT: удержание и страны по ролику; IG: страны аккаунта; TikTok: страны — только «Business» | хостинг | 2 аккаунта бесплатно + $6 за 3-й–10-й → **$12/мес** | `{{проверить}}` |
| **Publer** | все 4 | да / да | «Everyone» для публичного аккаунта; аудит `{{проверить}}` | YT обложка не для Shorts | поля `{{проверить}}`, демографии нет | только Business и Enterprise | Business от $10/мес за 1 аккаунт; за 4 `{{проверить}}` | `{{проверить}}` |
| **Blotato** | без Telegram | `{{проверить}}` | «already audited… public from the first call» | обложка, Trial Reels | просмотры, охват; страны `{{проверить}}` | хостинг; API не входит в пробный период | Starter $29/мес | `{{проверить}}` |
| **PostFast** | все 4 | `{{проверить}}` | `{{проверить}}` | обложка, Trial Reels | «Limited» на Starter | хостинг + npx | Starter €12/мес (€10 за год), 4 аккаунта | `{{проверить}}` |
| **Postiz** | все 4 | — | облако: аудит `{{проверить}}`; свой сервер — своё приложение → `SELF_ONLY` | — | без демографии, 30 запросов в час | на всех планах | облако $29/мес ($23 за год), открытый код AGPL | — |

Источники [Серв], 2026-10-21: Upload-Post — [цены](https://www.upload-post.com/llms-full.txt), [аналитика](https://docs.upload-post.com/api/get-analytics),
[аудитория](https://docs.upload-post.com/api/audience), [privacy](https://www.upload-post.com/privacy) (2026-10-19); Ayrshare — [цены](https://www.ayrshare.com/pricing/),
[аналитика](https://www.ayrshare.com/docs/apis/analytics/post); Metricool — [цены](https://metricool.com/pricing), [MCP](https://help.metricool.com/how-to-connect-metricools-mcp-with-claude-0l84v),
[TikTok](https://help.metricool.com/tiktok-metrics-fe7io); Buffer — [цены](https://buffer.com/pricing), [метрики](https://developers.buffer.com/guides/post-metrics);
Zernio — [цены](https://zernio.com/pricing), [TikTok](https://docs.zernio.com/platforms/tiktok), [ребрендинг](https://my.zernio.com/rebrand), с 06.05.2026 цена за аккаунт;
Publer — [help](https://publer.com/help); Blotato — [цены](https://blotato.com/pricing), [TikTok](https://blotato.com/api/tiktok); PostFast — [цены](https://postfa.st/pricing);
Postiz — [цены](https://postiz.com/pricing), [TikTok](https://docs.postiz.com/providers/tiktok). Привязка цен Metricool к помесячной и годовой оплате — [Вывод].

**Влияет ли публикация через API или агрегатор на охват**
- Instagram: Моссери в эфирах вопросов (29.03.2025, повтор 2026) — отложенная публикация «will not affect your reach»;
  первоисточник не найден, только пересказ сервисов. [С] [kontentino](https://www.kontentino.com/q-and-a/does-scheduling-instagram-posts-affect-reach/), [planoly](https://planoly.com/blog/does-scheduling-your-posts-affect-your-post-reach)
- TikTok: данных нет (есть только самопроверки авторов без контрольной группы). YouTube: данных нет.
- Реальные риски механические, а не алгоритмические: приватность по умолчанию (Ayrshare на YouTube, непроверенное
  приложение TikTok) и сервисы на логине и пароле. [Вывод]

## 5. Браузерный путь (Claude в Chrome)

**Что умеет [О]** ([Claude Code + Chrome](https://code.claude.com/docs/en/chrome), [справка](https://support.claude.com/en/articles/12012173-get-started-with-claude-in-chrome) 2026-08-26):
планы Pro, Max, Team, Enterprise; запуск `claude --chrome` или `/chrome`; работает в видимом окне Chrome под вашими
входами; на входе и CAPTCHA останавливается и просит сделать руками; прикрепляет файлы к полям загрузки — **не
больше 10 МБ за одну загрузку**; повторяющиеся задачи по расписанию в самом расширении; Anthropic называет его
«still risky». Сообщество сообщает о сбоях `file_upload` в 2026 году [С] (issues claude-code).

| Студия | Загрузка с подписью и обложкой | Отложенная публикация | Страны зрителей |
|---|---|---|---|
| YouTube Студия (компьютер) | да; своя обложка Shorts — только на компьютере, с 25.07.2026 сначала каналы Партнёрской программы [О]/[С] | да [Вывод: стандартная функция Студии] | «Топ географий» в «Аудитории», по IP; данные могут быть ограничены [О] [справка](https://support.google.com/youtube/answer/9314416) |
| TikTok Studio (веб) | да; своя картинка-обложка на компьютере [С] RouteNote (статья старая) | до 10 дней, у части аккаунтов до 30; отложенное нельзя править [С] | по ролику — «Зрители», это оценка по моделям [О] [Creator Academy](https://www.tiktok.com/creator-academy/en/article/tool-analytics-intro) (по выдержке поиска); для личного аккаунта `{{проверить}}` |
| Instagram (instagram.com) | загрузка Reels с компьютера есть; обложка в веб-версии `{{проверить}}` | в приложении до 75 дней [С]; на компьютере — Meta Business Suite | статистика в основном в приложении; на компьютере — Meta Business Suite, нужна ли страница FB — источники расходятся [С] `{{проверить}}` |
| Meta Business Suite | планировщик Reels для Instagram [С] | да [С] | «Аудитория» с топом стран [С]; без страницы FB `{{проверить}}` |

**Что говорят правила [О]:** YouTube (15.12.2023) запрещает «access the Service using any automated means (such as
robots, botnets or scrapers)» без письменного разрешения [условия](https://www.youtube.com/static?template=terms);
TikTok (01.12.2025) — «use automated scripts to collect information from or otherwise interact with the Services»
[условия](https://www.tiktok.com/legal/page/row/terms-of-service/en); Instagram — нельзя «collecting information in an automated
way without our express permission» [условия](https://help.instagram.com/581066165581870).

[Вывод] Агент в студии под входом автора формально подпадает под эти запреты; как часто за редкие действия
наказывают — данных нет. Плюс ролик ~10 МБ упирается в лимит загрузки. Браузер — только для редких дел по просьбе
автора: поставить обложку Shorts, сверить страны в TikTok Studio, если API промолчит.

## 6. Шаги настройки рекомендованной связки

**Автор руками (≈1–2 часа, один раз)**
1. **Google Cloud:** создать проект → включить YouTube Data API v3 и YouTube Analytics API → экран согласия
   «External», себя в тестовые пользователи → перевести в «In production» без верификации (иначе вход слетает
   каждые 7 дней) → OAuth-клиент «Desktop app» → скачать `client_secret.json` в папку вне проекта.
   При первом входе выбрать канал бренда `kod_i_kadr` и согласиться с предупреждением «непроверенное приложение».
2. **Meta for Developers:** приложение типа Business → продукт Instagram → «API setup with Instagram login» →
   добавить свой аккаунт (он должен быть публичным) → выдать права `basic`, `content_publish`, `manage_insights` →
   получить токен. App Review и проверку бизнеса не проходить.
3. **Upload-Post:** регистрация → тариф Basic ($24/мес или $192/год) → в одном профиле подключить TikTok и Instagram
   (YouTube — по желанию, как запасной путь) → выпустить API-ключ. В приложении TikTok включить аналитику.
   До оплаты спросить поддержку: работает ли личный TikTok и отдаются ли страны по ролику `{{проверить}}`.
4. **Telegram:** @BotFather → бот → добавить админом канала с правом публикации → токен.
   my.telegram.org → `api_id` и `api_hash` → при первом входе Telethon ввести код из Telegram.
5. Сложить ключи в одно место вне проекта (Связка ключей macOS или `.env` в `~/.config/`); агенту дать только путь.

**Агент (после «Одобряю» автора)**
1. Подключает Upload-Post MCP (`https://mcp.upload-post.com/mcp`) или REST и пишет скрипты на python через uv:
   статистика YouTube, Instagram, Telegram и публикация YouTube и Telegram.
2. Первую загрузку на YouTube делает приватной и проверяет, что статус можно сменить на публичный (снимает
   противоречие о блокировке); если нет — переключает YouTube на Upload-Post.
3. На каждый ролик собирает карточку: подпись и хэштеги под площадку, название для YouTube, обложку — PNG для
   Telegram и TikTok, JPEG для Instagram (конвертирует ffmpeg), флаг ИИ при необходимости, Trial Reels.
4. Публикует: TikTok и Instagram — Upload-Post (расписание у сервиса), YouTube — `publishAt`, Telegram — бот в
   нужное время (бот не откладывает).
5. Через 48–72 ч и через 7 дней снимает статистику: просмотры, удержание и среднее время, пересылки, сохранения,
   подписки, страны (YouTube и TikTok — по ролику, Instagram — по аккаунту, Telegram — только языки).
6. Раз в ~50 дней продлевает токен Instagram; MTProto дёргает не чаще раза в сутки и только на чтение.

## 7. Не удалось проверить

- Снята ли на деле приватная блокировка загрузок YouTube из непроверенных проектов (справка и история изменений расходятся).
- Работает ли `thumbnails.set` для Shorts и для канала вне Партнёрской программы; квота YouTube Analytics API.
- Нужен ли App Review для Instagram API with Instagram Login при работе только со своим аккаунтом (два гайда Meta расходятся).
- Доступен ли TikTok Business API (страны, удержание) личному аккаунту; нужен ли аудит для черновиков во «Входящие».
- Поддерживает ли Upload-Post личный TikTok явно; для каких роликов TikTok реально отдаёт страны; порог Trial Reels в 1000 подписчиков.
- Порог статистики Telegram-канала (500 в туре, «серверная настройка» в документации, 50 у сторонних).
- Цены: Buffer помесячно, Publer за 4 аккаунта, привязка цен Metricool к оплате помесячно и за год; доступ к аккаунтам у Ayrshare, Zernio, Publer, Blotato, PostFast.
- Веб-версии: обложка Reels на instagram.com, Meta Business Suite без страницы Facebook, названия разделов аналитики TikTok Studio у личного аккаунта.
- Первоисточник слов Моссери об охвате; данные о влиянии API-публикации на охват в TikTok и YouTube — данных нет.
