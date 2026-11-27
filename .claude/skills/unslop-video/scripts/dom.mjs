// Приметы шаблона в том, что реально отрисовано: шрифты, подписи по углам, капс с разрядкой, «призрачный» текст,
// служебные счётчики, мелкий текст, сколько текстовых слоёв одновременно, «число + ярлык».
//   node dom.mjs <папка проекта code-motion> [--json]
// Нужен проект на движке code-motion: index.html с window.READY, window.FRAME, window.seek(t), window.DURATION
// и Playwright в node_modules проекта. Идея проверок «элемент стоит на месте в t и t+0,1 с» — из lint.mjs
// motionmaxxing (Apache-2.0, Tejashmakwana/motionmaxxing), код свой.
import { createRequire } from 'node:module';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const dir = path.resolve(process.argv[2] || '.');
const asJson = process.argv.includes('--json');
if (!existsSync(path.join(dir, 'index.html'))) { console.error(`Нет index.html в ${dir}`); process.exit(2); }
let chromium;
try { ({ chromium } = createRequire(path.join(dir, 'package.json'))('playwright')); }
catch { console.error('Playwright не найден в node_modules проекта (npm i в папке проекта)'); process.exit(2); }

const BANNED = /^(inter|roboto|arial|helvetica( neue)?|open sans|lato|poppins|nunito|outfit|sora|geist|space grotesk|montserrat|syne|playfair display|cormorant|cinzel|dm sans|plus jakarta sans|manrope|system-ui|-apple-system|sf pro.*|sans-serif|serif|times new roman|times)$/i;
const b = await chromium.launch({ args: ['--disable-partial-raster'] });
const p = await b.newPage();
await p.goto(pathToFileURL(path.join(dir, 'index.html')).href);
await Promise.race([p.evaluate(() => window.READY), new Promise(r => setTimeout(r, 20000))]);
const { W, H } = await p.evaluate(() => window.FRAME || { W: 1080, H: 1920 });
await p.setViewportSize({ width: W, height: H });
const D = await p.evaluate(() => window.DURATION || 0);
const N = Math.max(12, Math.min(40, Math.round(D * 1.5)));
const times = Array.from({ length: N }, (_, i) => +(0.05 + (D - 0.2) * i / (N - 1)).toFixed(2));

const snap = t => p.evaluate(t => {
  window.seek(t); window.__flush && window.__flush();
  const out = [];
  const eff = e => { let o = 1; for (let n = e; n && n.nodeType === 1 && n.tagName !== 'HTML'; n = n.parentNode) { const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= +cs.opacity * (n.tagName === 'text' || n.tagName === 'tspan' ? +(cs.fillOpacity || 1) : 1); } return o; };
  const nodes = [...document.querySelectorAll('svg text')].filter(e => !e.closest('text text'));
  // HTML-текст тоже (если сцены в HTML): листовые элементы с текстом
  for (const e of document.querySelectorAll('body *:not(svg *):not(script):not(style)')) if (e.childElementCount === 0 && e.textContent.trim()) nodes.push(e);
  for (const e of nodes) {
    const s = e.textContent.replace(/\s+/g, ' ').trim(); if (!s) continue;
    const o = eff(e); if (o < 0.02) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) continue;
    const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize) || 0;
    const sc = e.getScreenCTM ? Math.hypot(e.getScreenCTM()?.a || 1, e.getScreenCTM()?.b || 0) : 1;
    out.push({ s: s.slice(0, 40), font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: fs * sc,
      ls: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) / (fs || 1), up: cs.textTransform === 'uppercase' || (/\p{Lu}{2}/u.test(s) && s === s.toUpperCase()),
      o: +o.toFixed(2), x0: r.left, x1: r.right, y0: r.top, y1: r.bottom, tex: !!e.closest('[data-texture]'), ui: !!e.closest('[data-ui]'), fill: cs.fill || cs.color });
  }
  return out;
}, t);

const fonts = {}, F = {}, at = (k, t, s) => ((F[k] ||= []).length < 6 && F[k].push(`${t} с «${s}»`), (F[k].n = (F[k].n || 0) + 1));
let layersMany = 0, statCard = 0;
const COUNTER = /^(0?\d{1,2}\s*[\/—–·|]\s*\S|(шаг|глава|сцена|часть|эпизод|step|chapter|scene|part)\s*0?\d)/iu;
const META = /\b\d+\s?BPM\b|\b\d{2,3}\s?FPS\b|1920\s?[×x]\s?1080|1080\s?[×x]\s?1920|\bREC\b|\bT\+\d|\bv\d+\.\d+\b|\b\d{2}:\d{2}:\d{2}\b/;
for (const t of times) {
  const A = await snap(t), B = await snap(Math.min(D, t + 0.1));
  const still = e => B.some(x => x.s === e.s && Math.abs(x.x0 - e.x0) < 2 && Math.abs(x.y0 - e.y0) < 2);
  const read = A.filter(e => !e.tex && e.o >= 0.3);
  for (const e of read) fonts[e.font] = (fonts[e.font] || 0) + 1;
  for (const e of A) {
    if (e.tex) continue;
    const h = e.size / H, cx = (e.x0 + e.x1) / 2 / W, cy = (e.y0 + e.y1) / 2 / H;
    if (e.o >= 0.3 && BANNED.test(e.font)) at('font', t, `${e.font}: ${e.s}`);
    if (e.o >= 0.3 && !e.ui && h <= 0.04 && (cx < 0.2 || cx > 0.8) && (cy < 0.14 || cy > 0.86) && still(e)) at('corner', t, e.s);
    if (e.o >= 0.3 && !e.ui && e.up && e.ls >= 0.05 && h <= 0.045 && e.s.length >= 2) at('caps', t, e.s);
    if (e.o >= 0.3 && !e.ui && (COUNTER.test(e.s) || META.test(e.s))) at('meta', t, e.s);
    if (h >= 0.12 && e.o >= 0.02 && e.o <= 0.14) at('ghost', t, e.s);
    if (e.o >= 0.3 && !e.ui && h < 0.02 && e.s.length > 3) at('tiny', t, e.s);
  }
  const big = read.filter(e => e.size / H >= 0.022);
  if (big.length > 4) layersMany++;
  const num = read.find(e => /^[\d\s.,%×xх+−-]+\s?\p{L}{0,4}$/u.test(e.s) && /\d/.test(e.s) && e.size / H >= 0.06);
  if (num && read.some(e => e !== num && e.up && e.size / H < num.size / H / 2 && Math.abs(e.y0 - num.y1) < 0.08 * H)) { statCard++; at('stat', t, `${num.s} + ярлык`); }
}
await b.close();

const TIP = {
  font: [2, 'шрифт «по умолчанию у ИИ» или системный фолбэк (шрифт не загрузился?)'],
  corner: [3, 'подпись в углу, стоит на месте — фальшивый HUD/брендинг в углу: убрать'],
  caps: [2, 'мелкий капс с разрядкой (кикер, рубрика): обычный регистр или убрать'],
  meta: [3, 'служебный текст в кадре: счётчик главы «01 / …», таймкод, REC, FPS, версия — убрать'],
  ghost: [2, 'призрачный гигантский текст 2–14 % непрозрачности как фон: декор по умолчанию, убрать'],
  tiny: [1, 'текст мельче 2 % высоты кадра (~38 px на 1920): на телефоне не прочитать — крупнее или в описание'],
  stat: [2, '«большое число + ярлык капсом» (stat card): число вшить в предмет (ценник, табло, шкала)'],
};
const flags = Object.entries(F).map(([k, v]) => ({ k, n: v.n, w: TIP[k][0], tip: TIP[k][1], ex: v.slice(0, 4) }));
if (layersMany / N > 0.25) flags.push({ k: 'layers', n: layersMany, w: 2, tip: `больше 4 текстовых слоёв одновременно в ${Math.round(100 * layersMany / N)}% замеров: не больше 2 целей чтения`, ex: [] });
const score = flags.reduce((s, f) => s + f.w * Math.min(3, Math.ceil(f.n / 2)), 0);
const fontList = Object.entries(fonts).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f} ${Math.round(100 * n / Object.values(fonts).reduce((a, b) => a + b, 0))}%`);
if (asJson) { console.log(JSON.stringify({ dir, duration: D, samples: N, fonts, flags, score }, null, 1)); process.exit(0); }
console.log(`# Кадр (DOM): ${path.basename(dir)} — ${D.toFixed(1)} с, ${N} замеров\n`);
console.log(`Шрифты на экране: ${fontList.join(', ') || '—'}`);
console.log(`«Число + ярлык» в ${statCard} из ${N} замеров; >4 текстовых слоёв — в ${layersMany} из ${N}\n`);
if (!flags.length) console.log('Явных примет в отрисованном тексте нет.');
for (const f of flags.sort((a, b) => b.w - a.w)) { console.log(`- ${f.k} ×${f.n} (вес ${f.w}) — ${f.tip}`); for (const e of f.ex) console.log(`    ${e}`); }
console.log(`\nБалл шаблонности кадра: ${score} (0–4 чисто · 5–11 есть что объяснить · 12+ много выборов по умолчанию)`);
