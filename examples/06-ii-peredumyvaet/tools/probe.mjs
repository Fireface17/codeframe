import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const root = process.argv[2], expr = process.argv[3];
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.error('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await p.goto(pathToFileURL(root + '/index.html').href);
await p.evaluate(() => window.READY);
console.log(JSON.stringify(await p.evaluate(expr)));
await b.close();
