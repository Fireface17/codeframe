#!/bin/zsh
# Full build: data -> sound events -> music cut to the film -> mixes -> silent master
# -> deliveries (+ no-music variant) + poster -> automatic checks.
#   zsh tools/build.sh [tag]                 e.g. tag=v2 -> out/final/<name>_v2.mp4
#   MUSIC=audio/music/track.wav MODE=loop|edit LUFS=-14|-16 POSTER=1.5 zsh tools/build.sh v2
#   BARS=18 — число тактов петли (loop.py --bars), MIXOPT="--bed-rel -6" — опции mix.py (музыка тише)
# Every version goes to a NEW file: a delivered file is never overwritten.
set -e
export PATH="/opt/homebrew/bin:$PATH"
cd "${0:A:h}/.."
TAG=${1:-v1}
ROOT=$(git -C "${0:A:h}" rev-parse --show-toplevel 2>/dev/null); SKILL="${CODE_MOTION_SKILL:-$ROOT/.claude/skills/code-motion}"; [ -d "$SKILL" ] || SKILL="$HOME/.claude/skills/code-motion"
NAME=${NAME:-01-rolik-formula}
MUSIC=${MUSIC:-audio/music/track.wav}
MODE=${MODE:-loop}          # loop: seamless whole bars (social) | edit: natural ending (explainer)
LUFS=${LUFS:--14}           # -14 social, -16 explainer
POSTER=${POSTER:-1.5}
AUD="$SKILL/scripts/audio"
mkdir -p out/final
node tools/timing.mjs
node tools/codecheck.mjs
[ -n "$(ls snippets 2>/dev/null)" ] && node tools/tokens.mjs
node render.mjs events out/events.json
D=$(node -e "console.log(require('./out/events.json').duration.toFixed(4))")
echo "duration $D s"
VO=audio/vo/vo.wav; [ -f $VO ] || VO=-
if [ -f "$MUSIC" ]; then
  rm -f out/music_$TAG.wav
  if [ $MODE = loop ]; then
    # whole bars must fit the film: try the normal tempo nudge (±7 %), then ±15 %, else a natural ending
    uv run --script $AUD/loop.py "$MUSIC" out/music_$TAG.wav $D ${BARS:+--bars} $BARS | tail -3
    [ -f out/music_$TAG.wav ] || uv run --script $AUD/loop.py "$MUSIC" out/music_$TAG.wav $D --max-stretch 0.15 ${BARS:+--bars} $BARS | tail -3
    [ -f out/music_$TAG.wav ] || { echo "NOTE: no seamless loop for $D s at this tempo: natural ending instead"; uv run --script $AUD/edit.py "$MUSIC" out/music_$TAG.wav $D | tail -3; }
  else uv run --script $AUD/edit.py "$MUSIC" out/music_$TAG.wav $D | tail -3; fi
  M=out/music_$TAG.wav
else M=-; echo "no music ($MUSIC missing): voice + SFX only"; fi
uv run --script $AUD/mix.py $M $VO out/events.json audio/mix_vo.wav --lufs $LUFS --sfx-dir audio/sfx ${=MIXOPT}
[ $M != - ] && [ $VO != - ] && uv run --script $AUD/mix.py $M $VO out/events.json audio/mix_novo.wav --no-music --lufs $LUFS --sfx-dir audio/sfx ${=MIXOPT}
node render.mjs video out/master_$TAG.mp4 6
node render.mjs mux out/master_$TAG.mp4 audio/mix_vo.wav out/final/${NAME}_$TAG.mp4
[ -f audio/mix_novo.wav ] && [ $M != - ] && [ $VO != - ] && node render.mjs mux out/master_$TAG.mp4 audio/mix_novo.wav out/final/${NAME}_no-music_$TAG.mp4
ffmpeg -loglevel error -y -ss $POSTER -i out/master_$TAG.mp4 -frames:v 1 -q:v 2 out/final/poster_$TAG.jpg
echo "--- checks"
uv run --script tools/jumps.py out/master_$TAG.mp4
uv run --script tools/loopcheck.py out/master_$TAG.mp4
node tools/safecheck.mjs 0.05 || true
ls -la out/final
