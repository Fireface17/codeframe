#!/bin/zsh
# Новый ролик: проект code-motion в projects/<имя> + папка для ТЗ и макетов inbox/<имя>.
#   zsh tools/new.sh <имя> [--size 1080x1920|1920x1080|1080x1080] [--fps 60] [--excalifont]
# Дальше: cd projects/<имя>; open index.html; node render.mjs sheet out/sheet.png 0.3,1,2,4 4
set -e
WS="${0:A:h:h}"
NAME=$1; shift || true
[ -n "$NAME" ] || { echo "usage: zsh tools/new.sh <имя> [--size WxH] [--fps 60] [--excalifont]"; exit 1; }
mkdir -p "$WS/inbox/$NAME"
SK="$WS/.claude/skills/code-motion"; [ -d "$SK" ] || SK="$HOME/.claude/skills/code-motion"
zsh "$SK/scripts/new_project.sh" "$WS/projects/$NAME" --name "$NAME" "$@"
# все шрифты лаборатории (Rubik 400–900, Onest, Unbounded, JetBrains Mono, Excali); ещё — tools/font.mjs
cp "$WS/lab/assets/fonts/"* "$WS/projects/$NAME/assets/fonts/"
# дополнительные приёмы лаборатории (шум, тряска, разбивка текста, счётчики, маски)
cp "$WS/lab/js/lab.js" "$WS/projects/$NAME/js/lab.js"
sed -i '' 's|<script src="js/cast.js"></script>|<script src="js/cast.js"></script><script src="js/lab.js"></script>|' "$WS/projects/$NAME/index.html"
echo "ТЗ и макеты клади в: inbox/$NAME   ·   идеи-образцы: lab/ideas/ (open gallery.html)"
