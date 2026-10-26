# Готовые скиллы для сценариев и SMM: разведка на 20.10.2026

Метаданные (звёзды, push, размер, лицензия) взяты из GitHub API через прокси r.jina.ai: прямой api.github.com отвечал 403. Тексты SKILL.md и references открывал через raw.githubusercontent.com. Полный список из 19 позиций — в `skills_found.json`.

## Топ-10 под задачу: обучающие, поясняющие и рассказывающие ролики, влог, русский язык

1. **Melvynx/video-agent-skill → studio-script** (MIT, 31★, push 20.10.2026). Самая продуманная система сценариев. Есть файлы автора `voice.md` / `swipe.md` / `log.md` (последний не даёт повторять темы последних 4 недель). Неделя собирается из типов Teach / Proof / Story / Opinion / Offer. Хук оценивается по рубрике 5×0–2, у сценария четыре гейта качества, а банк концептов строится на выбросах: просмотры делятся на медиану аккаунта. Звёзд мало, потому что репозиторий новый. Брать только markdown: остальная часть набора ставит движок, whisper, Treg и прочее.
2. **calesthio/OpenMontage → skills/creative/storytelling.md, short-form.md, long-form.md** (AGPL-3.0, 70k★). Лучшее знание об объясняющих роликах, и только здесь есть внятные источники: Mayer «Multimedia Learning», диссертация Derek Muller (2008), методы Kurzgesagt и 3Blue1Brown. Из-за AGPL текст не копировать, только пересказывать своими словами.
3. **vyralcontent/content-skills** (MIT, 157★). Лучший набор именно по хукам: архетипы Kallaway, MrBeast, Hormozi, Welsh и Galloway с шаблонами, хук из трёх слоёв, отдельные правила для Reels, TikTok и Shorts. Минус: в SKILL.md зашита реклама Vyral.
4. **Jakeschincariol/instagram-agent-skill** (MIT, 2026★). Конвейер для Reels: бит-лист с таймингами, безопасные зоны в пикселях, недельный план, исследование выбросов с порогами. Звёзды подозрительные (2 коммита), Python-эвристики работают только на английском.
5. **coreyhaines31/marketingskills → social (+ references/short-form-video.md)** (MIT, 55,6k★, обновляется ежедневно). Стратегия, переупаковка контента, рутина вовлечения, чёрный список «примет ИИ», правила, когда менять курс. Набор широкий, но ориентирован на SaaS.
6. **Jakeschincariol/youtube-agent-skill** (MIT, 1,9k★). 21 формула хука с условиями провала и разбор CSV удержания из YouTube Studio. Это единственная честная аналитика по собственным данным без API.
7. **AgriciDaniel/claude-youtube** (MIT, 492★, последний push в апреле 2026). Стратегия YouTube, диагностика графика удержания, шаблоны каналов `education` и `vlog`, бенчмарки Shorts с датами 2025 года. Требует API-ключи и OAuth, если включать скрипты.
8. **jointime1/reels-skill** (0★, лицензия не оформлена). Единственный по-настоящему русскоязычный: `register-ru.md` (живой русский против «ИИ-русского»), `ban-list-ru.md`, `hook-bank-ru.md` на 22 формулы. Ниша узкая (build-in-public по git), но справочники подходят любому автору.
9. **iart-ai/explainer-video-skills → explainer-video** (MIT, 41★). Математика объясняющего ролика: 2,3 слова/с, длительность сцены = слова / 2,3 + 0,4 с, ровно одна аналогия, ограничения для титров.
10. **ootto-ai/claude-content-skills → virality** (MIT, 224★). Ценен прежде всего методом: автор покадрово сравнил первые 3 с у 262 своих роликов и вывел из этого чек-лист первого кадра из 8 пунктов. Остальная часть набора — промо и автопостинг.

Ниже по ценности: Hooksmith (карточка хука из 11 полей), sergebulaev/instagram-skills (столпы 40/30/20/10 и цели по сохранениям и репостам, но часть данных устарела), promptmetrics/video-skill (стоп-точка «одобри сценарий»), charlie947 (веса QA), ndsmirnov/claude-reels-kit (русский, через Apify). Официальный маркетинговый плагин Anthropic (knowledge-work-plugins) про видео не пишет вообще.

## Сильные приёмы, которые повторяются в лучших скиллах

- **Профиль автора и журнал как источник правды.** `voice.md` + `swipe.md` + `log.md` у Melvynx и Jakeschincariol, `HOOKS.md` с разделом «Forbidden Claims» у Hooksmith, `voice-builder` у charlie947. Скилл сначала читает профиль, а без него задаёт 4–6 вопросов. ([Melvynx studio-script](https://github.com/Melvynx/video-agent-skill/blob/main/skills/studio-script/SKILL.md))
- **Выбросы вместо интуиции.** Метрика ролика — просмотры ÷ медиана последних ~12 роликов аккаунта; ×3 и выше считается сигналом. Брать аккаунты не больше чем в 10 раз крупнее своего, для вывода нужно около 40 роликов. «Один хит — ставка, три хита на двух аккаунтах — рецепт». Свой ×3-хит повторить в течение 2 недель с новым хуком. ([ig-viral](https://github.com/Jakeschincariol/instagram-agent-skill/blob/main/skills/ig-viral/SKILL.md), [viral.md](https://github.com/Melvynx/video-agent-skill/blob/main/skills/studio-script/references/viral.md))
- **Пачка хуков с оценкой вместо одного.** 3–10 вариантов из разных формул. Рубрика Melvynx: Specific / Tension / Viewer / Fast / True по 0–2, проходной балл 7/10; «Fast» = не больше 12 слов, тема в первых пяти. Одну формулу не ставить два раза подряд. ([script-rules.md](https://github.com/Melvynx/video-agent-skill/blob/main/skills/studio-script/references/script-rules.md))
- **Хук в три слоя.** Визуал + голос + текст на экране, причём голос и текст выполняют разные задачи. Текст на экране 3–7 слов (у Jakeschincariol ≤6), всё работает без звука. ([viral-hooks](https://github.com/vyralcontent/content-skills/blob/main/skills/viral-hooks/SKILL.md), [Hooksmith](https://github.com/arhamhi/hooksmith))
- **Тайминг считается, а не угадывается.** Слова ÷ wpm (160 по умолчанию), строка ≤4 с, хук ≤3 с, смена кадра каждые 2–5 с и неравномерно («метроном читается как скука»), рехук на 40–60% хронометража, финальная фраза закольцовывает слово из хука. ([ig-reel](https://github.com/Jakeschincariol/instagram-agent-skill/blob/main/skills/ig-reel/SKILL.md), [short-form-video](https://github.com/iart-ai/tiktok-video-skills))
- **Объясняющий ролик.** Связки «но/поэтому» вместо «и потом», сначала заблуждение, не больше одного концепта за 30–45 с, 1–3 с тишины после «ага», таблица масштабирования дуги на 1/2/3/5 минут, одна бытовая аналогия. ([storytelling.md](https://github.com/calesthio/OpenMontage/blob/main/skills/creative/storytelling.md), [explainer-video](https://github.com/iart-ai/explainer-video-skills))
- **Запрет выдумывать.** Неизвестные цифры превращаются в `{{плейсхолдер}}` и список «Проверить». Это правило есть у Melvynx, Jakeschincariol, Hooksmith и charlie947.
- **Проход против «ИИ-тона».** Чёрные списки слов и конструкций: у coreyhaines31 и Melvynx для EN/FR, у jointime1 для RU (предложения ≤12 слов, без канцелярита и причастных оборотов, «Telegram-тест»).
- **Сбалансированная неделя.** Teach 2 / Proof 1 / Story 1 / Opinion 1 / Offer 0–1 (Melvynx). Минимум 3 Reels из 4–5 постов (Jakeschincariol). Минимум 3 поста на сохранения и 2 на репосты, ни один столп больше 50% (sergebulaev).
- **Диагностика по шагам.** Reels: оригинальность → отвал на 3 с → репосты → звук → SEO подписи (Vyral). YouTube: утечка на хуке (норма — потерять меньше 25% за первые 30 с) → обрывы → сползание (yt-retention). На выходе одна главная правка.

## Чего в готовых скиллах не хватает

- **Русского языка.** Почти всё на английском, эвристики оценки хуков (hookscore.py) построены на английских словах. Русские правила текста есть только у jointime1.
- **Российских площадок и контекста.** Нигде нет VK Клипов (кроме упоминания у jointime1), Telegram-каналов, Дзена, Rutube и учёта ситуации с YouTube в РФ.
- **Влога.** Отдельного скилла нет. Есть только шаблон `vlog` в claude-youtube и пайплайн talking-head в OpenMontage. Нет структуры «день/событие → конфликт → вывод» с работой по отснятому материалу.
- **Короткого обучающего ролика с автором в кадре.** Объясняющие скиллы либо длинные (OpenMontage), либо про продукт и анимацию (iart, promptmetrics). Ближе всего тип Teach у Melvynx.
- **Аналитики своего аккаунта без API и скрейпинга.** Нет разбора выгрузок Instagram Insights и TikTok Studio. Есть только CSV удержания YouTube и платный Treg.
- **Доказательной базы.** Цифры по шортсам почти везде без источников и дат. Исключения: OpenMontage и частично claude-youtube.
- **Серий и рубрик на дистанции.** Об этом есть максимум одна строка (series-planner у ootto, его не открывал).

## Что не удалось проверить

- Не открывал по существу: sergebulaev/youtube-skills, josiahsiegel/claude-plugin-marketplace (viral-video-hooks-retention), samalyxx/instagram-skills (0★, без лицензии), inference-sh/skills, CK42BB/vox-explainer-skill, kostja94/marketing-skills, xpoz-agent-skills, creator-skills.archive.com, платный бандл на Gumroad.
- Каталог SkillsMP в поиске не нашёлся. Вторичные каталоги (skillselion, claudskills, claudemarketplaces) показывают разные счётчики установок, поэтому я на них не опирался.
- Органичность звёзд Jakeschincariol (около 2k★ при 1–2 коммитах) не проверить; клоны-форки с той же подписью (hackayan и др.) не смотрел.
- Самозаявленные данные не проверяемы: «200 000+ роликов» у Vyral, AUC 0,83 у hookscore, медианы Ootto.
- Из платформенных фактов проверил один: лимит в 5 хэштегов в Instagram с 18.12.2025 подтверждён. У sergebulaev до сих пор указан лимит 30.
- Размер в МБ — поле `size` из API (КБ, примерно); для монорепозиториев это размер всего репо, а не скилла.
