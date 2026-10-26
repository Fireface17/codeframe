# /// script
# dependencies = ["fonttools", "brotli"]
# ///
# Excalifont (Excalidraw's hand-drawn font, OFL-1.1) ships split into unicode subsets.
# This fetches @excalidraw/excalidraw from npm and merges all subsets into ONE woff2
# with Latin + Cyrillic + the rest. The merged file is a modified font: keep it inside
# your project (do not publish it as a font).
#   uv run --script tools/excalifont.py assets/fonts/Excalifont-full.woff2 [--version 0.18.1]
import glob, os, subprocess, sys, tarfile, tempfile
from fontTools.ttLib import TTFont
from fontTools.merge import Merger
out = sys.argv[1]
ver = sys.argv[sys.argv.index('--version') + 1] if '--version' in sys.argv else '0.18.1'
with tempfile.TemporaryDirectory() as tmp:
    tgz = subprocess.run(['npm', 'pack', f'@excalidraw/excalidraw@{ver}', '--silent'], cwd=tmp, capture_output=True, text=True, check=True).stdout.strip().splitlines()[-1]
    with tarfile.open(os.path.join(tmp, tgz)) as tf:
        tf.extractall(tmp, members=[m for m in tf.getmembers() if '/fonts/Excalifont/' in m.name and m.name.endswith('.woff2') and '/prod/' in m.name])
    parts = sorted(glob.glob(os.path.join(tmp, 'package/dist/prod/fonts/Excalifont/*.woff2')))
    ttfs = []
    for i, f in enumerate(parts):
        t = TTFont(f); t.flavor = None; p = os.path.join(tmp, f'part{i}.ttf'); t.save(p); ttfs.append(p)
    m = Merger().merge(ttfs)
    m.flavor = 'woff2'
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    m.save(out)
    cmap = m.getBestCmap()
    ru = sum(1 for c in list(range(0x410, 0x450)) + [0x401, 0x451] if c in cmap)
    print(f'{len(parts)} subsets -> {out}: {len(cmap)} glyphs, Russian letters {ru}/66')
