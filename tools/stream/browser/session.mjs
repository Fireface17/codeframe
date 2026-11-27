// Постоянный сеанс управления Chromium: одно подключение на всю работу, команды приходят по HTTP.
// Запуск: node session.mjs   (браузер должен быть открыт с --remote-debugging-port=9222)
// Команда: POST http://127.0.0.1:9333/do  тело: {"tab":"часть адреса","steps":[...]}  → журнал шагов
// Шаги: {goto} {click, role?, exact?, nth?} {sel} {fill, sel|label|placeholder, clear?} {upload, via|sel} {press} {wait} {shot} {text, max?} {eval}
import { chromium } from '../../../lab/node_modules/playwright/index.mjs';
import http from 'node:http';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 30000 });
const ctx = browser.contexts()[0];
let page = null;
const rnd = (a, b) => a + Math.random() * (b - a);

async function run(tab, steps) {
  const log = [];
  if (tab) page = ctx.pages().find((p) => p.url().includes(tab)) || page || (await ctx.newPage());
  if (!page) page = await ctx.newPage();
  for (const s of steps) {
    try {
      if (s.goto) { await page.goto(s.goto, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(rnd(2500, 4000)); }
      else if (s.upload) {
        const target = (s.sel ? page.locator(s.sel) : page.getByText(s.via, { exact: !!s.exact })).nth(s.nth || 0);
        const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 20000 }), target.click()]);
        await chooser.setFiles(s.upload);
        await page.waitForTimeout(rnd(2500, 4000));
      } else if (s.fill !== undefined) {
        const loc = (s.sel ? page.locator(s.sel) : s.label ? page.getByLabel(s.label) : page.getByPlaceholder(s.placeholder)).nth(s.nth || 0);
        await loc.click({ timeout: 10000 });
        if (s.clear) { await page.keyboard.press('Meta+A'); await page.keyboard.press('Backspace'); await page.waitForTimeout(300); }
        await loc.pressSequentially(s.fill, { delay: rnd(45, 95) });
        await page.waitForTimeout(rnd(500, 1000));
      } else if (s.click !== undefined || s.sel) {
        const loc = s.sel ? page.locator(s.sel) : (s.role ? page.getByRole(s.role, { name: s.click, exact: !!s.exact }) : page.getByText(s.click, { exact: !!s.exact }));
        const el = loc.nth(s.nth || 0);
        await el.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
        await el.hover({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(rnd(300, 800));
        await el.click({ timeout: 10000 });
        await page.waitForTimeout(rnd(900, 1800));
      } else if (s.press) { await page.keyboard.press(s.press); await page.waitForTimeout(rnd(500, 1000)); }
      else if (s.wait) { await page.waitForTimeout(s.wait); }
      else if (s.shot) { await page.screenshot({ path: s.shot }); }
      else if (s.text) { const t = await page.evaluate(() => document.body.innerText); log.push(t.replace(/\n{2,}/g, '\n').slice(0, s.max || 1500)); }
      else if (s.eval) { const v = await page.evaluate(s.eval); log.push('→ ' + JSON.stringify(v).slice(0, s.max || 1500)); }
      log.push('ок: ' + JSON.stringify(s).slice(0, 100));
    } catch (e) { log.push('ОШИБКА: ' + JSON.stringify(s).slice(0, 80) + ' :: ' + String(e).split('\n').slice(0, 3).join(' | ').slice(0, 400)); break; }
  }
  log.push('адрес: ' + page.url());
  return log.join('\n');
}

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    if (req.url === '/quit') { res.end('пока'); await browser.close().catch(() => {}); process.exit(0); }
    try { const { tab, steps } = JSON.parse(body); res.end(await run(tab, steps)); }
    catch (e) { res.end('ошибка команды: ' + String(e).slice(0, 300)); }
  });
}).listen(9333, '127.0.0.1', () => console.log('сеанс готов: http://127.0.0.1:9333/do'));
