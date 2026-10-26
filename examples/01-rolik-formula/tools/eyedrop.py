# /// script
# dependencies = ["pillow"]
# ///
# Sample exact colours (and check geometry) from a mockup: prints the colour at each x,y
# and the dominant colours of a box. Copy colours from the client's mockups, never by eye.
#   uv run --script tools/eyedrop.py mockup.png 120,340 400,355 [--box x0,y0,x1,y1]
import sys
from collections import Counter
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
args = sys.argv[2:]
if '--box' in args:
    i = args.index('--box'); x0, y0, x1, y1 = map(int, args[i + 1].split(',')); del args[i:i + 2]
    c = Counter(im.crop((x0, y0, x1, y1)).getdata()).most_common(6)
    print('box', (x0, y0, x1, y1), ' '.join(f'#{r:02x}{g:02x}{b:02x}×{n}' for (r, g, b), n in c))
for a in args:
    x, y = map(int, a.split(',')); r, g, b = im.getpixel((x, y)); print(f'{x},{y}  #{r:02x}{g:02x}{b:02x}')
print('size', im.size)
