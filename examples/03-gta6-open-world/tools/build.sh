#!/bin/zsh
# Full build: data -> sound events -> music cut to the film -> mixes -> silent master
# -> deliveries (+ no-music variant) + poster -> automatic checks.
#   zsh tools/build.sh [tag]                 e.g. tag=v2 -> out/final/<name>_v2.mp4
#   MUSIC=audio/music/track.wav MODE=loop|edit LUFS=-14|-16 POSTER=1.5 zsh tools/build.sh v2
# Every version goes to a NEW file: a delivered file is never overwritten.
set -e
export PATH="/opt/homebrew/bin:$PATH"
cd "${0:A:h}/.."
TAG=${1:-v1}
ROOT=$(git -C "${0:A:h}" rev-parse --show-toplevel 2>/dev/null); SKILL="${CODE_MOTION_SKILL:-$ROOT/.claude/skills/code-motion}"; [ -d "$SKILL" ] || SKILL="$HOME/.claude/skills/code-motion"
NAME=${NAME:-03-gta6-open-world}
MUSIC=${MUSIC:-audio/music/track.wav}
MODE=${MODE:-loop}          # loop: seamless whole bars (social) | edit: natural ending (explainer)
LUFS=${LUFS:--14}           # -14 social, -16 explainer
POSTER=${POSTER:-1.5}
AUD="$SKILL/scripts/audio"
mkdir -p out/final
node tools/timing.mjs
[ -n "$(ls snippets 2>/dev/null)" ] && node tools/tokens.mjs
node render.mjs events out/events.json
D=$(node -e "console.log(require('./out/events.json').duration.toFixed(4))")
echo "duration $D s"
VO=audio/vo/vo.wav; [ -f $VO ] || VO=-
if [ -f "$MUSIC" ]; then
  rm -f out/music_$TAG.wav
  if [ $MODE = loop ]; then
    # whole bars must fit the film: try the normal tempo nudge (±7 %), then ±15 %, else a natural ending
    uv run --script $AUD/loop.py "$MUSIC" out/music_$TAG.wav $D | tail -3
    [ -f out/music_$TAG.wav ] || uv run --script $AUD/loop.py "$MUSIC" out/music_$TAG.wav $D --max-stretch 0.15 | tail -3
    [ -f out/music_$TAG.wav ] || { echo "NOTE: no seamless loop for $D s at this tempo: natural ending instead"; uv run --script $AUD/edit.py "$MUSIC" out/music_$TAG.wav $D | tail -3; }
  else uv run --script $AUD/edit.py "$MUSIC" out/music_$TAG.wav $D | tail -3; fi
  M=out/music_$TAG.wav
  # проседание музыки перед кульминацией (DIP="начало,удар" в секундах): −12 дБ за 0,35 с до удара, возврат после
  if [ -n "$DIP" ]; then D0=${DIP%,*}; D1=${DIP#*,}
    ffmpeg -loglevel error -y -i $M -af "volume='if(between(t,$D0,$D1),0.32+0.68*max(0,1-(t-$D0)/0.15),if(between(t,$D1,$D1+0.6),0.32+0.68*(t-$D1)/0.6,1))':eval=frame" out/music_${TAG}_dip.wav && M=out/music_${TAG}_dip.wav; fi
else M=-; echo "no music ($MUSIC missing): voice + SFX only"; fi
uv run --script $AUD/mix.py $M $VO out/events.json audio/mix_vo.wav --lufs $LUFS --sfx-dir assets/sfx
[ $M != - ] && [ $VO != - ] && uv run --script $AUD/mix.py $M $VO out/events.json audio/mix_novo.wav --no-music --lufs $LUFS --sfx-dir assets/sfx
node render.mjs video out/master_$TAG.mp4 ${JOBS:-6}
node render.mjs mux out/master_$TAG.mp4 audio/mix_vo.wav out/final/${NAME}_$TAG.mp4
[ -f audio/mix_novo.wav ] && [ $M != - ] && [ $VO != - ] && node render.mjs mux out/master_$TAG.mp4 audio/mix_novo.wav out/final/${NAME}_no-music_$TAG.mp4
ffmpeg -loglevel error -y -ss $POSTER -i out/master_$TAG.mp4 -frames:v 1 -q:v 2 out/final/poster_$TAG.jpg
echo "--- checks"
uv run --script tools/jumps.py out/master_$TAG.mp4
uv run --script tools/loopcheck.py out/master_$TAG.mp4
node tools/safecheck.mjs 0.05 || true
ls -la out/final
