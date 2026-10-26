#!/bin/zsh
# Pull everything out of a client brief: text, embedded mockups, and the COMMENTS
# (author, date, the text they hang on). Comments often carry the real animation
# directions; read every one of them literally.
#   zsh tools/brief_extract.sh "<brief>.pages|.docx|.pdf" <outDir>
# .pages: exported through Pages (PDF + DOCX + TXT); without Pages, iwa.py reads the raw strings.
set -e
export PATH="/opt/homebrew/bin:$PATH"
IN="${1:A}"; OUT="${2:A}"; HERE="${0:A:h}"
mkdir -p "$OUT"
case "$IN" in
  *.pages)
    if [ -d /Applications/Pages.app ]; then
      osascript <<OSA
set f to POSIX file "$IN"
tell application "Pages"
  set d to open f
  export d to POSIX file "$OUT/brief.pdf" as PDF
  export d to POSIX file "$OUT/brief.docx" as Microsoft Word
  export d to POSIX file "$OUT/brief.txt" as unformatted text
  close d saving no
end tell
OSA
    fi
    mkdir -p "$OUT/pages" && (cd "$OUT/pages" && unzip -o -q "$IN")
    [ -d "$OUT/pages/Data" ] && mkdir -p "$OUT/media" && cp "$OUT/pages/Data/"* "$OUT/media/" 2>/dev/null || true
    python3 -I "$HERE/iwa.py" "$OUT/pages/Index/Document.iwa" "$OUT/pages/Index/AnnotationAuthorStorage.iwa" > "$OUT/iwa_strings.txt" || true
    ;;
  *.docx) cp "$IN" "$OUT/brief.docx" ;;
  *.pdf) cp "$IN" "$OUT/brief.pdf" ;;
esac
if [ -f "$OUT/brief.docx" ]; then
  mkdir -p "$OUT/docx" && (cd "$OUT/docx" && unzip -o -q "$OUT/brief.docx")
  [ -d "$OUT/docx/word/media" ] && mkdir -p "$OUT/media" && cp "$OUT/docx/word/media/"* "$OUT/media/" 2>/dev/null || true
  python3 -I "$HERE/docx_comments.py" "$OUT/docx/word" > "$OUT/comments.txt"
fi
echo "-> $OUT"; ls "$OUT"
[ -f "$OUT/comments.txt" ] && { echo "--- comments"; cat "$OUT/comments.txt"; }
echo "Read brief.pdf page by page (it shows mockups next to the text), then comments.txt; media/ has full-size mockups."
