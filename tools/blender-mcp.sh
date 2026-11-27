#!/bin/zsh
# Открыть Blender с включённым сервером MCP (порт localhost:9876), чтобы Claude мог работать со сценой.
#   zsh tools/blender-mcp.sh [файл.blend]
# Автозапуск сервера в Blender выключен нарочно: порт без пароля, любой процесс на машине может слать в него код.
# Остановить: закрыть Blender или кнопка «Disconnect» в боковой панели (N → MCP for Blender).
# Правила и настройки — .claude/skills/code-motion/references/blender.md
B=/Applications/Blender.app
[ -d "$B" ] || { echo "Blender не установлен: brew install --cask blender"; exit 1; }
START='import bpy; bpy.app.timers.register(lambda: (bpy.ops.blendermcp.start_server(), None)[1], first_interval=3.0)'
if [ -n "$1" ]; then
  open -a "$B" --args "${1:A}" --python-expr "$START"
else
  open -a "$B" --args --python-expr "$START"
fi
echo "Blender открывается; сервер MCP поднимется через ~3 с на localhost:9876"
