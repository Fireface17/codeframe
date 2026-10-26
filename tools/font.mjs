// Шрифты с кириллицей (OFL, @fontsource) -> проект: копирует кириллический и латинский поднаборы
// в <проект>/assets/fonts/ и дописывает @font-face в его fonts.css (loadFonts() движка их подхватит).
//   node tools/font.mjs list
//   node tools/font.mjs add <пакет> <папка проекта> [400,700]     напр. add golos-text projects/promo 400,600,800
// Пакеты ищутся в library/node_modules/@fontsource и lab/node_modules/@fontsource.
// Новый шрифт в библиотеку: cd library && npm i -D @fontsource/<имя>  (проверь кириллицу: files/<имя>-cyrillic-*)
import { appendFileSync, copyFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ws = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = ['library/node_modules/@fontsource', 'lab/node_modules/@fontsource'].map(r => path.join(ws, r)).filter(existsSync);
const CYR = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const LAT = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const find = pkg => ROOTS.map(r => path.join(r, pkg)).find(existsSync);
const family = dir => (readFileSync(path.join(dir, 'index.css'), 'utf8').match(/font-family: '([^']+)'/) || [])[1];
const weights = dir => [...new Set(readdirSync(path.join(dir, 'files')).map(f => f.match(/-cyrillic-(\d+)-normal\.woff2$/)?.[1]).filter(Boolean))].sort();

const [cmd, pkg, proj, ws_] = process.argv.slice(2);
if (cmd === 'add') {
  const dir = find(pkg);
  if (!dir) throw new Error(`нет пакета @fontsource/${pkg} (cd library && npm i -D @fontsource/${pkg})`);
  const fam = family(dir), all = weights(dir);
  if (!all.length) throw new Error(`у ${pkg} нет кириллицы`);
  const want = ws_ ? ws_.split(',') : all;
  const out = path.resolve(ws, proj, 'assets/fonts');
  if (!existsSync(out)) throw new Error('нет папки ' + out);
  const css = path.join(out, 'fonts.css'), have = existsSync(css) ? readFileSync(css, 'utf8') : '';
  let add = `\n/* ${fam} (OFL-1.1, @fontsource/${pkg}) */\n`, n = 0;
  for (const w of want) {
    if (!all.includes(w)) { console.log(`  нет веса ${w} (есть: ${all.join(', ')})`); continue; }
    for (const [sub, range] of [['cyrillic', CYR], ['latin', LAT]]) {
      const f = `${pkg}-${sub}-${w}-normal.woff2`;
      if (have.includes(`"./${f}"`)) continue;
      copyFileSync(path.join(dir, 'files', f), path.join(out, f));
      add += `@font-face { font-family: "${fam}"; font-weight: ${w}; src: url("./${f}") format("woff2"); unicode-range: ${range}; font-display: block; }\n`; n++;
    }
  }
  if (n) appendFileSync(css, add);
  console.log(`${fam}: +${n} файлов -> ${path.relative(ws, out)}  (font-family: "${fam}")`);
} else {
  for (const r of ROOTS) for (const p of readdirSync(r).sort()) {
    const d = path.join(r, p), w = existsSync(path.join(d, 'files')) ? weights(d) : [];
    if (w.length) console.log(`${p.padEnd(16)} "${family(d)}"`.padEnd(40) + ` веса: ${w.join(' ')}   (${path.relative(ws, r)})`);
  }
}
