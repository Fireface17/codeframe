#!/bin/zsh
# Разбор референсного ролика: скачать (или взять файл) -> склейки -> кадр каждой сцены ->
# контактный лист -> ритм монтажа -> расшифровка речи (whisper.cpp, если есть модель).
#   zsh tools/refvideo.sh <url|файл> [имя] [--thresh 0.3] [--no-asr] [--lang ru|en|auto]
# Итог в refs/videos/<имя>/: source.mp4, info.txt (длительность, сцены, средняя длина плана,
# темп речи), shots.csv, shots/NNN.jpg, sheet.jpg, transcript.srt + transcript.json (слова с временем).
# Только для личного разбора: чужие ролики и кадры в свои работы не попадают.
set -e
export PATH="/opt/homebrew/bin:$PATH"
WS="${0:A:h:h}"
SRC=""; NAME=""; THRESH=0.3; ASR=1; LANG_=auto
while [ $# -gt 0 ]; do
  case "$1" in
    --thresh) THRESH=$2; shift 2 ;;
    --no-asr) ASR=0; shift ;;
    --lang) LANG_=$2; shift 2 ;;
    *) if [ -z "$SRC" ]; then SRC=$1; else NAME=$1; fi; shift ;;
  esac
done
[ -n "$SRC" ] || { echo "usage: zsh tools/refvideo.sh <url|файл> [имя] [--thresh 0.3] [--no-asr] [--lang ru]"; exit 1; }
[ -n "$NAME" ] || NAME=$(date +%Y%m%d-%H%M%S)
D="$WS/refs/videos/$NAME"
mkdir -p "$D/shots"
cd "$D"

# 1. источник
if [[ "$SRC" == http* ]]; then
  if [ ! -f source.mp4 ]; then
    yt-dlp -q --no-playlist --write-info-json -f "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/b" \
      --merge-output-format mp4 -o "source.%(ext)s" "$SRC"
  fi
else
  [ -f source.mp4 ] || ffmpeg -loglevel error -y -i "$SRC" -c copy source.mp4 2>/dev/null || ffmpeg -loglevel error -y -i "$SRC" -c:v libx264 -crf 18 -c:a aac source.mp4
fi
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 source.mp4)
VINFO=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 source.mp4)

# 2. склейки: кадры, где смена сцены больше порога
ffmpeg -hide_banner -i source.mp4 -an -vf "select='gt(scene,$THRESH)',showinfo" -f null - 2>&1 \
  | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 > cuts.txt || true
node -e '
const fs = require("fs"), D = +process.argv[1];
const cuts = fs.readFileSync("cuts.txt", "utf8").split("\n").filter(Boolean).map(Number).filter(t => t > 0.15 && t < D - 0.15);
const b = [0, ...cuts, D], rows = ["n,start,end,dur"];
for (let i = 0; i + 1 < b.length; i++) rows.push([i + 1, b[i].toFixed(3), b[i + 1].toFixed(3), (b[i + 1] - b[i]).toFixed(3)].join(","));
fs.writeFileSync("shots.csv", rows.join("\n") + "\n");
' "$DUR"
# 3. кадр из середины каждой сцены
tail -n +2 shots.csv | while IFS=, read -r n s e d; do
  m=$(node -e "console.log(($s + $e) / 2)")
  ffmpeg -loglevel error -y -ss "$m" -i source.mp4 -frames:v 1 -vf "scale=480:-2" -q:v 3 "shots/$(printf %03d $n).jpg"
done
uv run --script "$WS/tools/refsheet.py" "$D" | tail -1

# 4. расшифровка речи
MODEL="$WS/library/models/ggml-large-v3-turbo-q5_0.bin"
WORDS=""
if [ $ASR = 1 ] && [ -f "$MODEL" ] && ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 source.mp4 | grep -q .; then
  ffmpeg -loglevel error -y -i source.mp4 -ar 16000 -ac 1 audio16k.wav
  whisper-cli -m "$MODEL" -f audio16k.wav -l "$LANG_" -osrt -ojf -of transcript -np >/dev/null 2>&1 || echo "whisper: ошибка, расшифровки нет"
  rm -f audio16k.wav
  [ -f transcript.srt ] && WORDS=$(grep -v -E '^[0-9]+$|-->|^$' transcript.srt | wc -w | tr -d ' ')
elif [ $ASR = 1 ]; then echo "нет модели whisper ($MODEL) или звука: расшифровку пропускаю"; fi

# 5. сводка
node -e '
const fs = require("fs"), [D, vinfo, words, src] = process.argv.slice(1);
const s = fs.readFileSync("shots.csv", "utf8").trim().split("\n").slice(1).map(l => +l.split(",")[3]).sort((a, b) => a - b);
const asl = s.reduce((a, b) => a + b, 0) / s.length, med = s[Math.floor(s.length / 2)];
let title = ""; try { const j = JSON.parse(fs.readFileSync("source.info.json", "utf8")); title = `${j.title} — ${j.uploader || j.channel || ""}`; } catch {}
const [w, h, fr] = vinfo.split(","), fps = fr.includes("/") ? (+fr.split("/")[0] / +fr.split("/")[1]) : +fr;
const out = [
  `источник: ${src}`, title && `название: ${title}`,
  `длительность: ${(+D).toFixed(2)} с · ${w}×${h} · ${fps.toFixed(2)} fps`,
  `сцен: ${s.length} · средний план ${asl.toFixed(2)} с · медиана ${med.toFixed(2)} с · min ${s[0].toFixed(2)} · max ${s[s.length - 1].toFixed(2)} · склеек на 10 с: ${(10 * (s.length - 1) / D).toFixed(1)}`,
  words && `речь: ${words} слов · ${(words / D).toFixed(2)} слов/с в среднем по ролику`,
].filter(Boolean).join("\n");
fs.writeFileSync("info.txt", out + "\n"); console.log(out);
' "$DUR" "$VINFO" "$WORDS" "$SRC"
rm -f cuts.txt
echo "-> $D (sheet.jpg, shots/, shots.csv, info.txt${WORDS:+, transcript.srt})"
