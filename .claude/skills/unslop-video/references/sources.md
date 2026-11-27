# Источники и лицензии

Собрано 2026-10-29 тремя разведками: почерк своих 11 роликов, каталог примет (33 внешние ссылки) и
способы построить свой стиль (21 источник). Полные отчёты в репозиторий не входят; ниже — внешние источники.

## Своды правил (формулировки пересказаны, код свой)
- **motionmaxxing** — github.com/Tejashmakwana/motionmaxxing, Apache-2.0 (+ NOTICE). `references/slop.md`
  (25 примет N1–N25, «рефлексы» и вторичный шаблон), `scripts/lint.mjs` (идея: выборка моментов через seek,
  правила в долях кадра, «элемент стоит на месте в t и t+0,1 с», освобождение UI-поверхностей). dom.mjs
  написан по мотивам этой схемы; код не копировался. При переносе их текста или кода — указать авторство
  и сохранить NOTICE.
- **motion-video-kit** — github.com/echris6/motion-video-kit, MIT: quality-bar, gauntlet (застывшие куски,
  «строитель ≠ судья»).
- **brag** — github.com/latent-spaces/brag, MIT: «конкретно, читаемо, понятно незнакомцу».
- **HyperFrames** — github.com/heygen-com/hyperframes, Apache-2.0: запрещённые шрифты, данные в движении.
  ⚠ Их house-style советует фоновый декор (свечения, призрачный текст, сетки) — здесь выбрана сторона motionmaxxing.

## Внешние (выборка)
- Anthropic — Prompting for frontend aesthetics: platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics
  (модель сходится к среднему; задавать каждое измерение отдельно и называть свои дефолты вслух).
- Anthropic — Improving frontend design through Skills (2025-11-12).
- IBM Carbon — Motion: carbondesignsystem.com/elements/motion/overview (тихое и громкое движение, длительности 70–700 мс).
- Jenni Romaniuk — distinctive assets (узнаваемость растёт повторением без изменений).
- The Brand Identity — 6 identities driven by motion (фирменный жест из формы знака).
- OpusClip — The AI Slop Aesthetic: 12 Tells (2026-04-17); Fountain Institute — Signs a UI Has Been Vibe Coded (2026-04-24);
  autoae — Why Claude Remotion Videos Look Flat (2026-10-07).
- Wikipedia — Signs of AI writing; Pangram — AI's Most Overused Phrases; humanizer-ru (vc.ru, И. Утов) — русские маркеры.

Слова-маркеры текста устаревают примерно за полгода — список в `text.mjs` пересматривать.
