# Заливка клипов на три площадки через управляемый браузер — рабочий рецепт (проверен 2026-11-18)

Отдельный Chromium с профилем в `~/.config/codeframe-stream/` (`zsh tools/stream/browser/start.sh`), входы в аккаунты делаешь один раз руками.
Селекторы и подписи интерфейса — для русского языка студий; площадки их меняют, при сбое смотри снимок (`shot.mjs`) и правь. Публикуешь только своё
и только с разрешения стримера. Расчёт на macOS.

Перед командами: `export PATH="/opt/homebrew/bin:$PATH"; cd tools/stream/browser`.
`DO` = `python3 do.py '<вкладка>' '<json шагов>'`, `CDP` = `/opt/homebrew/opt/node@22/bin/node cdp.mjs '<вкладка>' '<json шагов>'`.
Текст с «», — и `\n` в командную строку не вставлять: шаги собирать в файле (heredoc `<<'EOF'`) или в Python (`json.dumps`).
Подпись держи в текстовом файле и читай кодом (Python), а не в командной строке (awk по кириллице не сработал).

## Общее
- **Сначала сверка.** Перед каждой загрузкой прочитать список роликов площадки: клип мог выйти в прошлой сессии
  и не попасть в журнал (18.11 так нашлись «тигры» на всех трёх площадках).
- **Файл — только через `CDP`: `{"files":"<js, возвращающий input>","path":"<файл>"}`.** Шаг `upload` в `do.py`
  (Playwright `setFiles`) на 20–50 МБ виснет на 30 с и файл не ставит.
- Вкладки нет — открыть: `node -e "fetch('http://127.0.0.1:9222/json/new?'+encodeURIComponent(URL),{method:'PUT'})"`.
- `eval` в `do.py` должен вернуть строку (дописывать `+''`): на `undefined` шаг падает и рвёт цепочку.
- `click` по тексту — настоящий клик. Чтобы прочитать состояние — только `eval` или `shot`.
- Хэштеги печатаются обычным текстом; после последнего висит список подсказок — закрыть кликом по нейтральному
  заголовку (не Escape). Перед «Опубликовать» всегда снимок: превью клипа, текст, переключатели.
- Порядок на один клип (экономит ~10 мин): TikTok «подготовить» → YouTube целиком → Instagram целиком → TikTok «Опубликовать».
- Каждую публикацию записывай строкой в свой журнал (дата | площадка | название | ссылка); в названии без символа `|`.

## YouTube (вкладка `studio.youtube.com`)
1. `{"goto":"https://studio.youtube.com/channel/<id канала>/videos/short"}`; проверить: в адресе id нужного канала,
   `document.querySelector('#entity-name').innerText` — его название (если у аккаунта несколько каналов). Список — `ytcp-video-row` (`a#video-title`).
2. `DO`: `{"click":"Создать","role":"button"}`, `{"click":"Добавить видео"}`.
3. `CDP`: `{"files":"document.querySelector('ytcp-uploads-dialog input[type=file]')","path":"…mp4"}`, `{"wait":8000}`.
4. `DO`: `{"fill":"<название>","sel":"ytcp-uploads-dialog #title-textarea #textbox","clear":true}`,
   `{"fill":"<описание>","sel":"ytcp-uploads-dialog #description-textarea #textbox","clear":true}`,
   `{"click":"Значок","exact":true}`, `{"sel":"ytcp-uploads-dialog tp-yt-paper-radio-button[name=VIDEO_MADE_FOR_KIDS_NOT_MFK]"}`.
5. Ссылка: `[...document.querySelectorAll('ytcp-uploads-dialog a')].map(a=>a.href).filter(h=>/shorts/.test(h)).join(' ')+''`
   (появляется через несколько секунд после начала загрузки).
6. Ждать по `ytcp-uploads-dialog .progress-label`: сначала «Загружено: N %» (до 1,5 мин), потом «Проверка: N %», до
   «Проверка завершена. Нарушений не найдено.» Затем `{"sel":"ytcp-uploads-dialog #next-button"}` ×3,
   `{"sel":"ytcp-uploads-dialog tp-yt-paper-radio-button[name=PUBLIC]"}`, снимок (`PUBLIC=true`, кнопка «Опубликовать»),
   `{"sel":"ytcp-uploads-dialog #done-button"}`.
7. Окно «Видео опубликовано»: `{"click":"Закрыть","role":"button","exact":true}` («Включить продвижение» не трогать).

## TikTok (вкладка `tiktok.com/tiktokstudio`)
1. Список и ссылки: `{"goto":"https://www.tiktok.com/tiktokstudio/content"}`, `eval` по `a[href*="/video/"]` и `body.innerText`
   (там же статус: «Контент проверяется / Только я» через 20–60 с сам меняется на дату и «Все»).
2. `DO`: `{"goto":"https://www.tiktok.com/tiktokstudio/upload?from=webapp"}`.
3. `CDP`: `{"files":"document.querySelector('input[type=file]')","path":"…mp4"}`, `{"wait":14000}`.
4. `DO`: при первом заходе `{"click":"Понятно","role":"button"}` (подсказка «Предпросмотр на телефоне»);
   `{"fill":"<подпись>","sel":"div[contenteditable=true]","clear":true}` (сотрёт имя файла),
   `{"click":"Подробности","exact":true}`, `{"click":"Показать больше"}`; снимок: «Сейчас», «Все», галочка «Комментарий»,
   «Контент, сгенерированный ИИ» и «Ограничение аудитории» выключены.
5. `{"click":"Опубликовать","role":"button","exact":true}`. «Быстрая проверка контента» идёт от 3 до 11+ минут и не
   обязательна: если она не кончилась, выйдет окно «Продолжить публикацию?» —
   `{"sel":"button.TUXButton--primary:has-text('Опубликовать')"}`. После этого страница сама уходит на `/tiktokstudio/content`.

## Instagram (вкладка `instagram.com`)
1. Список и ссылки: `{"goto":"https://www.instagram.com/<аккаунт>/"}`, `eval` по `a[href*="/reel/"]` (подпись — `img.alt`).
2. `DO`: `{"sel":"svg[aria-label='Новая публикация']"}`.
3. `CDP`: `{"files":"document.querySelector('[role=dialog] input[type=file][accept*=video]')","path":"…mp4"}`, `{"wait":7000}`.
4. `DO`: `{"sel":"[role=dialog] svg[aria-label='Выбрать размер и обрезать']"}`, `{"click":"9:16","exact":true}` (иначе обрежет
   в квадрат), `{"click":"Далее","role":"button","exact":true}` ×2,
   `{"fill":"<подпись>","sel":"[role=dialog] [contenteditable=true]"}`, снимок, `{"click":"Поделиться","role":"button","exact":true}`.
5. Ждать 40–70 с, пока текст окна сменится с «Публикация» на «Видео Reels опубликовано»; `{"sel":"svg[aria-label='Закрыть']"}`.
   «Добавить метку ИИ» не трогать.
