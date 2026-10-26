// Снимок отладочной страницы: node tools/shot.mjs <page.html> "<query>" <out.png> [W H]
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [page_, query, out, W = 1800, H = 900] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--disable-partial-raster'] });
const p = await b.newPage({ viewport: { width: +W, height: +H } });
p.on('pageerror', e => console.error('pageerror:', e.message));
p.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
await p.goto(pathToFileURL(path.join(here, '..', page_)).href + '?' + query + `&W=${W}&H=${H}`);
await p.waitForFunction(() => window.READY === true, null, { timeout: 20000 });
await p.screenshot({ path: out });
await b.close();
console.log('->', out);
