#!/bin/zsh
# Full build: data -> sound events -> music cut to the film -> mixes -> silent master
# -> deliveries (+ no-music variant) + poster -> automatic checks.
#   zsh tools/build.sh [tag]                 e.g. tag=v2 -> out/final/<name>_v2.mp4
#   MUSIC=audio/music/track.wav MODE=loop|edit LUFS=-14|-16 POSTER=1.5 zsh tools/build.sh v2
# Music cut, all optional (":D:" in EDIT_ARGS is replaced by the film length):
#   EDIT_ARGS="--start-bar 12 --fade-in 0 --end auto"        edit.py: start on the drop, no fade-in
#   EDIT_ARGS="--plan 0:D:25.947 --fade-from 50.3"           edit.py: manual plan (film_start:film_end:source_start)
#   LOOP_ARGS="--start-bar 8 --bars 8"                       loop.py: force the bars
#   MUSIC_CUT=out/music_drop.wav                             a ready cut: used as is, nothing is re-cut or deleted
#   MIX_ARGS="--bed-rel -1.5 --duck 5"                       mix.py: energetic edit to the beat (voice - music 5-7 LU)
# The skill is found at $CODE_MOTION_SKILL, else <repo>/.claude/skills/code-motion, else ~/.claude/skills/code-motion.
# Every version goes to a NEW file: a delivered file is never overwritten.
set -e
[ -d /opt/homebrew/bin ] && export PATH="/opt/homebrew/bin:$PATH"   # macOS with Homebrew
cd "${0:A:h}/.."
TAG=${1:-v1}
# where the skill lives: $CODE_MOTION_SKILL > <git repo root>/.claude/skills/code-motion > ~/.claude/skills/code-motion
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
SKILL="${CODE_MOTION_SKILL:-}"
[ -z "$SKILL" ] && [ -n "$ROOT" ] && [ -d "$ROOT/.claude/skills/code-motion/scripts/audio" ] && SKILL="$ROOT/.claude/skills/code-motion"
SKILL="${SKILL:-$HOME/.claude/skills/code-motion}"
[ -d "$SKILL/scripts/audio" ] || { echo "code-motion skill not found at $SKILL: set CODE_MOTION_SKILL=<path to the skill>"; exit 1; }
NAME=${NAME:-__NAME__}
MUSIC=${MUSIC:-audio/music/track.wav}
MODE=${MODE:-loop}          # loop: seamless whole bars (social) | edit: natural ending (explainer, or a cut from the drop)
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
EA=(${=${EDIT_ARGS//:D:/:$D:}}); LA=(${=LOOP_ARGS}); MA=(${=MIX_ARGS})
if [ -n "$MUSIC_CUT" ]; then
  [ -f "$MUSIC_CUT" ] || { echo "MUSIC_CUT=$MUSIC_CUT not found"; exit 1; }
  M=$MUSIC_CUT; echo "music: ready cut $M (not re-cut)"
elif [ -f "$MUSIC" ]; then
  M=out/music_$TAG.wav
  rm -f $M
  if [ $MODE = loop ]; then
    # whole bars must fit the film: try the normal tempo nudge (±7 %), then ±15 %, else a natural ending
    uv run --script $AUD/loop.py "$MUSIC" $M $D $LA | tail -3
    [ -f $M ] || uv run --script $AUD/loop.py "$MUSIC" $M $D --max-stretch 0.15 $LA | tail -3
    [ -f $M ] || { echo "NOTE: no seamless loop for $D s at this tempo: natural ending instead"; uv run --script $AUD/edit.py "$MUSIC" $M $D $EA | tail -3; }
  else uv run --script $AUD/edit.py "$MUSIC" $M $D $EA | tail -3; fi
else M=-; echo "no music ($MUSIC missing): voice + SFX only"; fi
rm -f audio/mix_novo.wav
uv run --script $AUD/mix.py $M $VO out/events.json audio/mix_vo.wav --lufs $LUFS $MA
[ $M != - ] && [ $VO != - ] && uv run --script $AUD/mix.py $M $VO out/events.json audio/mix_novo.wav --no-music --lufs $LUFS $MA
node render.mjs video out/master_$TAG.mp4 6
node render.mjs mux out/master_$TAG.mp4 audio/mix_vo.wav out/final/${NAME}_$TAG.mp4
[ -f audio/mix_novo.wav ] && node render.mjs mux out/master_$TAG.mp4 audio/mix_novo.wav out/final/${NAME}_no-music_$TAG.mp4
ffmpeg -loglevel error -y -ss $POSTER -i out/master_$TAG.mp4 -frames:v 1 -q:v 2 out/final/poster_$TAG.jpg
echo "--- checks"
uv run --script tools/jumps.py out/master_$TAG.mp4
uv run --script tools/loopcheck.py out/master_$TAG.mp4
node tools/safecheck.mjs 0.05 || true
ls -la out/final
