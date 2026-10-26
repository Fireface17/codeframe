#!/bin/zsh
# Scaffold a code-motion project: engine + tools + a working demo film.
#   zsh ~/.claude/skills/code-motion/scripts/new_project.sh <dir> [--size 1080x1920|1920x1080|1080x1080]
#        [--fps 60] [--name my-film] [--excalifont] [--3d]
#   --3d   adds the three.js layer: three@0.170.0 (pinned), js/vendor/three.js, js/gl.js (references/3d.md)
# Then: cd <dir>; open index.html (preview), node render.mjs sheet ..., zsh tools/build.sh v1
# Needs zsh, node 20+, npm, ffmpeg, uv (for the Python tools). The project does not store the skill path:
# tools/build.sh finds the skill at $CODE_MOTION_SKILL or ~/.claude/skills/code-motion.
set -e
[ -d /opt/homebrew/bin ] && export PATH="/opt/homebrew/bin:$PATH"   # macOS with Homebrew
SCRIPTS="${0:A:h}"; SKILL="${SCRIPTS:h}"
DIR=""; SIZE=1080x1920; FPS=60; NAME=""; EXCALI=0; GL3D=0
while [ $# -gt 0 ]; do
  case "$1" in
    --size) SIZE=$2; shift 2 ;;
    --fps) FPS=$2; shift 2 ;;
    --name) NAME=$2; shift 2 ;;
    --excalifont) EXCALI=1; shift ;;
    --3d) GL3D=1; shift ;;
    *) DIR=$1; shift ;;
  esac
done
[ -n "$DIR" ] || { echo "usage: new_project.sh <dir> [--size WxH] [--fps 60] [--name n] [--excalifont] [--3d]"; exit 1; }
[ -e "$DIR" ] && [ -n "$(ls -A "$DIR" 2>/dev/null)" ] && { echo "$DIR exists and is not empty"; exit 1; }
W=${SIZE%x*}; H=${SIZE#*x}; NAME=${NAME:-${DIR:t}}
mkdir -p "$DIR"; DIR="${DIR:A}"
cp -R "$SCRIPTS/template/." "$DIR/"
mkdir -p "$DIR/js/vendor" "$DIR/tools" "$DIR/out" "$DIR/audio/music" "$DIR/assets/ref"
cp "$SCRIPTS/engine/"*.js "$DIR/js/"
cp "$SCRIPTS/render.mjs" "$DIR/"
cp "$SCRIPTS/tools/"* "$DIR/tools/"
for f in index.html css/style.css package.json tools/build.sh; do   # portable in-place edit (BSD and GNU sed differ)
  sed -e "s|__W__|$W|g" -e "s|__H__|$H|g" -e "s|__FPS__|$FPS|g" -e "s|__NAME__|$NAME|g" "$DIR/$f" > "$DIR/$f.tmp" && mv "$DIR/$f.tmp" "$DIR/$f"
done
chmod +x "$DIR/tools/build.sh"
cd "$DIR"
echo "npm install..."; npm install --silent 2>&1 | tail -2
if [ $GL3D = 1 ]; then
  # three@0.170.0: the last release with a full CJS build (newer build/three.cjs is a stub), see references/3d.md
  npm install --silent -D -E three@0.170.0 2>&1 | tail -2
  node tools/three_vendor.mjs
  sed -e 's|<script src="js/film.js"></script>|<script src="js/vendor/three.js"></script>\
<script src="js/gl.js"></script>\
<script src="js/film.js"></script>|' index.html > index.html.tmp && mv index.html.tmp index.html
fi
cp node_modules/roughjs/bundled/rough.js js/vendor/rough.js
cp node_modules/@fontsource/rubik/files/rubik-{cyrillic,latin}-{800,900}-normal.woff2 assets/fonts/
cp node_modules/jetbrains-mono/fonts/webfonts/JetBrainsMono-{Regular,Bold}.woff2 assets/fonts/
if [ $EXCALI = 1 ]; then uv run --script tools/excalifont.py assets/fonts/Excalifont-full.woff2
else grep -v -e 'Excali' assets/fonts/fonts.css > assets/fonts/fonts.css.tmp && mv assets/fonts/fonts.css.tmp assets/fonts/fonts.css; fi   # no missing-font error
npx --yes playwright install chromium >/dev/null 2>&1 || echo "note: run 'npx playwright install chromium' if rendering fails"
node tools/timing.mjs --estimate
node tools/tokens.mjs
cat <<MSG

Project ready: $DIR  (${W}x${H} @ ${FPS} fps)
  preview     open index.html            (space play, arrows seek, g safe zone, ?audio=none)
  stills      node render.mjs sheet out/sheet.png 0.3,1,2,3 4
  draft video SUB=4 node render.mjs video out/draft.mp4 6
  full build  zsh tools/build.sh v1      (MUSIC=audio/music/track.wav MODE=loop|edit LUFS=-14|-16)
  voice       edit script.json, then $SKILL/scripts/voice/README.md
MSG
[ $GL3D = 1 ] && echo "  3D layer    js/gl.js (GL.scene / GL.draw / GL.clear), example scene 'orb'; see $SKILL/references/3d.md"
true
