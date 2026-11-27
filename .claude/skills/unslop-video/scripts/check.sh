#!/bin/zsh
# Все автопроверки скилла unslop-video по проекту code-motion → один отчёт.
#   zsh check.sh <папка проекта> [ролик.mp4] [--no-dom]
# Ролик по умолчанию — последний out/final/<имя>_*v<N>.mp4 со звуком (без no-music), иначе последний out/master_*.mp4.
# Пишет <проект>/out/unslop.md и контактный лист <проект>/out/unslop_sheet.jpg (для свежего оценщика).
setopt null_glob
export PATH="/opt/homebrew/bin:$PATH"
S=${0:A:h}
P=${1:A}
[[ -f "$P/index.html" ]] || { echo "Нет проекта: $1"; exit 2; }
MP4=""; NODOM=0
for a in "${@:2}"; do [[ "$a" == "--no-dom" ]] && NODOM=1 || MP4=${a:A}; done
if [[ -z "$MP4" ]]; then
  MP4=$(ls -t "$P"/out/final/*.mp4 2>/dev/null | grep -v no-music | head -1)
  [[ -z "$MP4" ]] && MP4=$(ls -t "$P"/out/master_*.mp4 2>/dev/null | head -1)
fi
mkdir -p "$P/out"
R="$P/out/unslop.md"
{
  echo "# unslop: ${P:t} — $(date '+%Y-%m-%d %H:%M')"
  echo
  echo "Автопроверки дают зацепки, а не вердикт: каждая находка — вопрос «выбрано под этот ролик или по умолчанию?»."
  echo "Ответ «выбрано, потому что …» одной фразой — нормально. Нет ответа — заменить (references/tells.md)."
  echo
  node "$S/text.mjs" "$P/script.json" 2>&1; echo
  node "$S/code.mjs" "$P" 2>&1; echo
  if (( ! NODOM )); then node "$S/dom.mjs" "$P" 2>&1; echo; fi
  if [[ -n "$MP4" ]]; then python3 -I "$S/frames.py" "$MP4" --sheet "$P/out/unslop_sheet.jpg" 2>&1
  else echo "# Кадры: готового MP4 нет — пропущено"; fi
} > "$R"
cat "$R"
echo
echo "Отчёт: $R"
