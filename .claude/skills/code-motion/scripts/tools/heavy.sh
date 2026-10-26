#!/bin/zsh
# Очередь тяжёлых задач (рендер, синтез голоса, распознавание): одна за раз — на 16 ГБ памяти две сразу уводят машину в своп.
#   zsh tools/heavy.sh <кто> <команда> [аргументы...]
#   zsh tools/heavy.sh render node render.mjs video out/master_v2.mp4 6
# Ждёт, пока не идёт чужой тяжёлый процесс и свободен замок, берёт замок, выполняет команду, отпускает.
#   HEAVY_LOCK     папка-замок, общая для всех проектов (по умолчанию ${TMPDIR:-/tmp}/code-motion-heavy.lock)
#   HEAVY_PATTERN  какие процессы считать тяжёлыми (регулярное выражение для ps; по умолчанию рендер и синтез)
LOCK="${HEAVY_LOCK:-${TMPDIR:-/tmp}/code-motion-heavy.lock}"
PATTERN="${HEAVY_PATTERN:-render\.mjs|tts_chatterbox|tts_kokoro|live_words|takes\.py}"
[ $# -ge 2 ] || { echo "usage: zsh heavy.sh <who> <command> [args...]"; exit 2; }
who=$1; shift
while true; do
  if [[ -d $LOCK ]]; then   # замок умершего процесса снимаем
    pid=$(awk '{print $3}' "$LOCK/owner" 2>/dev/null)
    if [[ -n $pid ]] && ! kill -0 $pid 2>/dev/null; then rm -r "$LOCK"; fi
  fi
  busy=$(ps -Ao command | grep -E "$PATTERN" | grep -v -E "heavy\.sh|grep" | head -1)
  if [[ -z $busy ]] && mkdir "$LOCK" 2>/dev/null; then
    echo "$who $(date +%H:%M:%S) $$" > "$LOCK/owner"
    break
  fi
  sleep 20
done
trap 'rm -r "$LOCK" 2>/dev/null' EXIT INT TERM
echo "[heavy] $who: старт $(date +%H:%M:%S)"
"$@"
code=$?
echo "[heavy] $who: конец $(date +%H:%M:%S), код $code"
exit $code
