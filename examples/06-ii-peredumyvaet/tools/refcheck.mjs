// Overlay the client's mockups on your frames (red-tinted, 45 %) to check the layout.
// refs.json: [{ "t": 9.5, "img": "assets/ref/2-core.png", "left": 40.8, "top": 119, "scale": 0.88 }, ...]
// (left/top/scale = where the mockup sits in the frame; derive them from mockup pixels).
//   node tools/refcheck.mjs [refs.json] -> out/ref_<k>.png
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const refs = JSON.parse(readFileSync(path.resolve(root, process.argv[2] || 'refs.json'), 'utf8'));
mkdirSync(path.join(root, 'out'), { recursive: true });
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(pathToFileURL(path.join(root, 'index.html')).href);
await p.evaluate(() => window.READY);
const { W, H } = await p.evaluate(() => window.FRAME);
await p.setViewportSize({ width: W, height: H });
for (const [k, r] of refs.entries()) {
  await p.evaluate(r => new Promise(res => {
    window.seek(r.t);
    document.querySelectorAll('img.__ref').forEach(e => e.remove());
    const im = new Image();
    im.className = '__ref';
    im.onload = () => { im.style.width = im.naturalWidth * r.scale + 'px'; res(); };
    im.src = r.img;
    im.style.cssText = `position:absolute;left:${r.left}px;top:${r.top}px;opacity:.45;filter:sepia(1) saturate(6) hue-rotate(-50deg);mix-blend-mode:multiply;transform-origin:0 0`;
    document.getElementById('root').appendChild(im);
  }), r);
  const f = path.join(root, `out/ref_${k + 1}.png`);
  await p.screenshot({ path: f });
  console.log('->', f);
}
await b.close();
