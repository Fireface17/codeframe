// Снимок вкладки управляемого Chromium. node shot.mjs <часть адреса> <файл.png> [адрес для перехода]
import { chromium } from '../../../lab/node_modules/playwright/index.mjs';

const [needle, out, goto] = process.argv.slice(2);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
let page = ctx.pages().find((p) => p.url().includes(needle));
if (!page) { page = await ctx.newPage(); }
if (goto) { await page.goto(goto, { waitUntil: 'domcontentloaded', timeout: 45000 }); await page.waitForTimeout(3500); }
console.log('адрес:', page.url());
console.log('заголовок:', await page.title());
await page.screenshot({ path: out });
await browser.close();   // отсоединяемся, окно остаётся открытым
