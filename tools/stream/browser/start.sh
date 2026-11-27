#!/bin/zsh
# Открыть рабочий Chromium с сохранёнными входами и поднять сеанс управления.
# Запуск после перезагрузки или закрытия браузера: zsh tools/stream/browser/start.sh
export PATH="/opt/homebrew/bin:$PATH"
PROFILE="$HOME/.config/codeframe-stream/browser-profile"
APP=$(ls -d "$HOME/Library/Caches/ms-playwright/"chromium-*/chrome-mac-arm64/"Google Chrome for Testing.app" 2>/dev/null | sort -V | tail -1)
HERE="${0:A:h}"
mkdir -p "$HOME/.config/codeframe-stream"

if ! lsof -i :9222 >/dev/null 2>&1; then
  open -na "$APP" --args --user-data-dir="$PROFILE" --remote-debugging-port=9222 --restore-last-session --no-first-run --no-default-browser-check
  sleep 8
fi
if ! lsof -i :9333 >/dev/null 2>&1; then
  nohup node "$HERE/session.mjs" > "$HOME/.config/codeframe-stream/session.log" 2>&1 &
  sleep 5
fi
lsof -i :9222 >/dev/null 2>&1 && echo "браузер: работает" || echo "браузер: НЕ запустился"
lsof -i :9333 >/dev/null 2>&1 && echo "сеанс управления: работает" || echo "сеанс управления: НЕ запустился (см. ~/.config/codeframe-stream/session.log)"
