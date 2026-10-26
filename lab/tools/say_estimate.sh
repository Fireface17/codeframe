#!/bin/zsh
# Rough phrase durations before any real voice exists (macOS `say`), to size the film.
# A typical neural narrator is ~7 % faster than `say` at 165 wpm.
#   zsh tools/say_estimate.sh [script.json] [voice]
export PATH="/opt/homebrew/bin:$PATH"
S=${1:-script.json}; V=${2:-}
TMP=$(mktemp -d)
node -e "const s=require('./$S'); s.phrases.forEach((p,i)=>console.log(p.tts||p.display))" | { i=0; tot=0; while IFS= read -r line; do i=$((i+1)); if [ -n "$V" ]; then say -v "$V" -r 165 -o $TMP/p$i.aiff "$line"; else say -r 165 -o $TMP/p$i.aiff "$line"; fi; d=$(afinfo $TMP/p$i.aiff | awk '/estimated duration/{print $3}'); printf 'p%s %5.2fs  %s\n' $i $d "$line"; done; }
rm -r $TMP
