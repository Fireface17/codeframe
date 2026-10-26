# /// script
# dependencies = ["pillow"]
# ///
# Средние цвета фото-подложки в точках (x, y — доли L, как в proportions.json).
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
L, ox, oy = 1598.5, 221.5, 1651
pts = {
 'fender_top': (0.12, 0.15), 'fender_low': (0.13, 0.115), 'nose_facet': (0.03, 0.08), 'cheek_top': (0.29, 0.125), 'cheek_low': (0.30, 0.08),
 'upper_front': (0.40, 0.17), 'upper_mid': (0.55, 0.183), 'upper_rear': (0.75, 0.205), 'lower_door_top': (0.42, 0.14), 'lower_door_mid': (0.45, 0.10),
 'lower_door_low': (0.45, 0.07), 'lower_rear_top': (0.68, 0.17), 'lower_rear_mid': (0.68, 0.12), 'haunch': (0.84, 0.19), 'haunch_low': (0.90, 0.15),
 'rocker': (0.5, 0.04), 'glass_front_low': (0.33, 0.19), 'glass_mid': (0.5, 0.22), 'glass_top': (0.5, 0.25), 'glass_rear': (0.68, 0.235),
 'roof_strip': (0.54, 0.2635), 'disc_F': (0.19 + 0.04, 0.075 + 0.02), 'spoke_F': (0.19, 0.075 + 0.04), 'tire_F': (0.19 - 0.07, 0.075), 'disc_R': (0.838 + 0.04, 0.0845 + 0.02),
 'tail_dark': (0.96, 0.10), 'ground_front': (0.05, -0.02), 'ground_mid': (0.5, -0.02),
}
r = 3
for k, (x, y) in pts.items():
    px, py = ox + x * L, oy - y * L
    box = im.crop((int(px - r), int(py - r), int(px + r + 1), int(py + r + 1)))
    c = [sum(v) // len(v) for v in zip(*box.getdata())]
    print(f"{k:16s} #{c[0]:02X}{c[1]:02X}{c[2]:02X}")
