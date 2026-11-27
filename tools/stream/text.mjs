// Рисует прозрачные PNG с текстом для вертикального клипа.
// node text.mjs <job.json>
// job: { out, seamY, capY, title:[строки], tag, captions:[{name,text}], subs:[{name, words:[{t,on}]}] }
// Результат: title.png, tag.png, cap_<name>.png (1080×1920), <sub>.png и blank.png (1080×330).
import { chromium } from '../../lab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const F = new URL('../../library/node_modules/@fontsource/montserrat/files/', import.meta.url).href;
const face = (w) => ['cyrillic', 'cyrillic-ext', 'latin', 'latin-ext']
  .map((s) => `@font-face{font-family:M;font-weight:${w};src:url("${encodeURI(F)}montserrat-${s}-${w}-normal.woff2") format("woff2");}`)
  .join('\n');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const css = `
${face(700)}
${face(800)}
${face(900)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:transparent}
body{font-family:M,sans-serif;position:relative;overflow:hidden}
.title{position:absolute;left:0;width:1080px;display:flex;flex-direction:column;align-items:center}
.title span{display:inline-block;background:#fff;color:#0c0c0c;font-weight:900;font-size:56px;line-height:1;letter-spacing:-0.5px;
  padding:16px 26px 18px;border-radius:14px;text-transform:uppercase;white-space:nowrap}
.title span+span{margin-top:-6px}
.title span.acc{background:#ffd60a}
.tag{position:absolute;left:36px;top:${job.tagY ?? 150}px;font-weight:800;font-size:${job.tagY ? 34 : 30}px;color:#fff;background:rgba(0,0,0,.55);
  padding:10px 18px 11px;border-radius:999px;letter-spacing:.2px}
.cap{position:absolute;left:0;width:1080px;display:flex;justify-content:center}
.cap span{display:inline-block;font-weight:700;font-style:italic;font-size:40px;line-height:1.15;color:#fff;background:rgba(10,10,10,.72);
  padding:12px 24px 14px;border-radius:12px;max-width:900px;text-align:center}
.sub{position:absolute;left:100px;width:860px;top:0;height:100%;display:flex;flex-wrap:wrap;justify-content:center;align-content:center;
  gap:6px 20px;font-weight:900;font-size:72px;line-height:1.08;text-transform:uppercase;color:#fff;letter-spacing:-0.5px;
  -webkit-text-stroke:14px #000;paint-order:stroke fill;filter:drop-shadow(0 6px 0 rgba(0,0,0,.55))}
.sub b{font-weight:900;color:#ffd60a}
.sub .e{font-size:1.32em;color:#ffd60a;line-height:1}
.sub b.e{color:#fff;-webkit-text-stroke:14px #d91f1f}
`;

const browser = await chromium.launch();
fs.mkdirSync(job.out, { recursive: true });
const full = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });

// заголовок на стыке этажей
{
  const lines = (job.title || []).map((l, i) => `<span class="${i === job.title.length - 1 && job.title.length > 1 ? 'acc' : ''}">${esc(l)}</span>`).join('');
  await full.setContent(`<style>${css}</style><div class="title" id="t">${lines}</div>`);
  await full.evaluate(async (seamY) => {
    await document.fonts.ready;
    const t = document.getElementById('t');
    t.style.top = Math.round(seamY - t.offsetHeight / 2) + 'px';
  }, job.seamY);
  await full.screenshot({ path: path.join(job.out, 'title.png'), omitBackground: true });
}
// метка стримера
await full.setContent(`<style>${css}</style>${job.tag ? `<div class="tag">${esc(job.tag)}</div>` : ''}`);
await full.evaluate(() => document.fonts.ready);
await full.screenshot({ path: path.join(job.out, 'tag.png'), omitBackground: true });
// подписи монтажёра
for (const c of job.captions || []) {
  await full.setContent(`<style>${css}${job.capBold ? '.cap span{font-style:normal;font-weight:800;font-size:44px}' : ''}</style><div class="cap" style="top:${c.y ?? job.capY}px"><span>${esc(c.text)}</span></div>`);
  await full.evaluate(() => document.fonts.ready);
  await full.screenshot({ path: path.join(job.out, `cap_${c.name}.png`), omitBackground: true });
}
await full.close();

// субтитры: полоса 1080×330
const strip = await browser.newPage({ viewport: { width: 1080, height: 330 }, deviceScaleFactor: 1 });
await strip.setContent(`<style>${css}${job.subBottom ? '.sub{align-content:flex-end;padding-bottom:22px}' : ''}</style><div class="sub" id="s"></div>`);
await strip.evaluate(() => document.fonts.ready);
await strip.screenshot({ path: path.join(job.out, 'blank.png'), omitBackground: true });
for (const s of job.subs || []) {
  const flatColor = s.flat && s.color ? ` style="color:${s.color}"` : '';
  const html = s.flat ? s.words.map((w) => `<span class="${w.e ? 'e' : ''}"${w.e ? '' : flatColor}>${esc(w.t)}</span>`).join('') : s.words.map((w) => (w.on ? `<b class="${w.e ? 'e' : ''}"${s.color && !w.e ? ` style="color:${s.color}"` : ''}>${esc(w.t)}</b>` : `<span class="${w.e ? 'e' : ''}">${esc(w.t)}</span>`)).join('');
  await strip.evaluate((h) => { document.getElementById('s').innerHTML = h; }, html);
  await strip.screenshot({ path: path.join(job.out, s.name + '.png'), omitBackground: true });
}
await browser.close();
console.log('текст готов:', (job.subs || []).length, 'кадров субтитров,', (job.captions || []).length, 'подписей');
