# /// script
# dependencies = ["numpy"]
# ///
# Seamless loop: the last frame must flow into the first.
#   uv run --script tools/loopcheck.py video.mp4
import subprocess, sys
import numpy as np
w, h = 240, 240
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', sys.argv[1], '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
seam = np.abs(f[-1] - f[0]).mean()
d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
print(f'loop seam (last -> first): {seam:.3f}   median frame-to-frame: {np.median(d):.3f}   p95: {np.percentile(d, 95):.3f}')
print('OK: seamless' if seam <= max(1.0, np.percentile(d, 95)) else 'CHECK: the loop jumps')
