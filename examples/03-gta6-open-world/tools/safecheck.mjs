// Every readable text must sit inside window.SAFE = { x0, x1, y0, y1, xLow?, yLow? }
// (below yLow the right edge is xLow: e.g. the TikTok button column). Text marked
// data-texture (decorative code, tiny labels) is skipped; so is everything after
// window.SAFE.skipAfter (e.g. a zoom-out where the whole screen shrinks).
//   node tools/safecheck.mjs [step=0.05]
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stepS = parseFloat(process.argv[2] || '0.05');
const b = await chromium.launch({ args: ['--disable-partial-raster', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });   // проект №3: WebGL и ES-модули
const p = await b.newPage();
await p.goto(pathToFileURL(path.join(root, 'index.html')).href);
await p.evaluate(() => window.READY);
const { W, H } = await p.evaluate(() => window.FRAME);
await p.setViewportSize({ width: W, height: H });
const res = await p.evaluate(stepS => {
  const Z = window.SAFE, out = {};
  if (!Z) return { 'window.SAFE is not set': [0] };
  const xl = Z.xLow ?? Z.x1, yl = Z.yLow ?? Z.y1;
  const visible = e => { for (let n = e; n && n.tagName !== 'svg'; n = n.parentNode) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  for (let t = 0; t <= window.DURATION; t += stepS) {
    if (Z.skipAfter !== undefined && t >= Z.skipAfter) break;
    window.seek(t);
    document.querySelectorAll('svg text').forEach(e => {
      if (e.closest('[data-texture]') || !e.textContent.trim() || !visible(e)) return;
      const r = e.getBoundingClientRect();
      if (r.width < 1) return;
      const bad = [];
      if (r.left < Z.x0 - 0.5) bad.push(`left ${r.left.toFixed(0)}`);
      if (r.right > Z.x1 + 0.5) bad.push(`right ${r.right.toFixed(0)}`);
      if (r.top < Z.y0 - 0.5) bad.push(`top ${r.top.toFixed(0)}`);
      if (r.bottom > Z.y1 + 0.5) bad.push(`bottom ${r.bottom.toFixed(0)}`);
      if (r.bottom > yl && r.right > xl + 0.5) bad.push(`right ${r.right.toFixed(0)} below y ${yl}`);
      if (bad.length) { const k = e.textContent.slice(0, 24) + ' | ' + bad.join(', '); (out[k] = out[k] || []).push(+t.toFixed(2)); }
    });
  }
  return out;
}, stepS);
const keys = Object.keys(res);
console.log(keys.length ? 'OUTSIDE THE SAFE ZONE:' : 'all readable text inside the safe zone');
for (const k of keys) console.log(`  ${k}   at ${res[k][0]}–${res[k][res[k].length - 1]} s (${res[k].length}x)`);
await b.close();
process.exitCode = keys.length ? 1 : 0;
