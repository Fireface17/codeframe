# /// script
# dependencies = ["numpy"]
# ///
# Per-frame change of the picture: flags frames that change much more than their
# neighbours (a jump). Planned hard cuts show up too: check that every flag is one.
#   uv run --script tools/jumps.py video.mp4
import json, subprocess, sys
import numpy as np
probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', sys.argv[1]], capture_output=True, text=True).stdout)['streams'][0]
fps = eval(probe['r_frame_rate'])
w = 240; h = int(round(w * probe['height'] / probe['width'] / 2) * 2)
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', sys.argv[1], '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
print(f'{len(f)} frames, mean change {d.mean():.3f}, max {d.max():.2f} at {(d.argmax() + 1) / fps:.3f}s')
med = np.array([np.median(d[max(0, i - 6):i + 7]) for i in range(len(d))])
for i in np.where((d > 4 * med + 0.4) & (d > 0.8))[0]:
    print(f'  jump at frame {i + 1} ({(i + 1) / fps:.3f}s): {d[i]:.2f} vs local {med[i]:.2f}')
top = np.argsort(d)[-8:][::-1]
print('  biggest changes:', ', '.join(f'{(i + 1) / fps:.2f}s={d[i]:.2f}' for i in top))
