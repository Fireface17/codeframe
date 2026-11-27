// Действия в управляемом Chromium. node act.mjs <часть адреса вкладки> '<json-список шагов>'
// Шаги: {goto:url} {click:"текст"|sel:"css"} {fill:"текст", sel|label|placeholder} {upload:"файл", sel?} {wait:мс} {shot:"файл.png"} {text:true} {press:"Enter"}
import { chromium } from '../../../lab/node_modules/playwright/index.mjs';

const [needle, stepsJson] = process.argv.slice(2);
const steps = JSON.parse(stepsJson);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 25000 });
const ctx = browser.contexts()[0];
let page = ctx.pages().find((p) => p.url().includes(needle)) || (await ctx.newPage());
const pause = (a, b) => page.waitForTimeout(a + Math.random() * (b - a));
try {
  for (const s of steps) {
    if (s.goto) { await page.goto(s.goto, { waitUntil: 'domcontentloaded', timeout: 45000 }); await pause(2500, 4000); }
    else if (s.click !== undefined || (s.sel && s.fill === undefined && s.upload === undefined)) {
      const loc = s.sel ? page.locator(s.sel) : (s.role ? page.getByRole(s.role, { name: s.click, exact: !!s.exact }) : page.getByText(s.click, { exact: !!s.exact }));
      const el = loc.nth(s.nth || 0);
      await el.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
      await el.hover({ timeout: 8000 }).catch(() => {});
      await pause(300, 800);
      await el.click({ timeout: 10000 });
      await pause(900, 1800);
    } else if (s.fill !== undefined) {
      const loc = s.sel ? page.locator(s.sel) : s.label ? page.getByLabel(s.label) : page.getByPlaceholder(s.placeholder);
      const el = loc.nth(s.nth || 0);
      await el.click({ timeout: 10000 });
      if (s.clear) { await page.keyboard.press('Meta+A'); await page.keyboard.press('Backspace'); }
      await el.pressSequentially(s.fill, { delay: 70 + Math.random() * 60 });
      await pause(500, 1000);
    } else if (s.upload) {
      const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 15000 }),
        (s.sel ? page.locator(s.sel) : page.getByText(s.via, { exact: !!s.exact })).nth(s.nth || 0).click()]);
      await chooser.setFiles(s.upload);
      await pause(2500, 4000);
    } else if (s.press) { await page.keyboard.press(s.press); await pause(600, 1200); }
    else if (s.wait) { await page.waitForTimeout(s.wait); }
    else if (s.shot) { await page.screenshot({ path: s.shot }); }
    else if (s.text) { const t = await page.evaluate(() => document.body.innerText); console.log(t.replace(/\n{2,}/g, '\n').slice(0, s.max || 1500)); }
    console.log('ок:', JSON.stringify(s).slice(0, 90));
  }
} catch (e) {
  console.log('ОШИБКА на шаге:', String(e).slice(0, 400));
  await page.screenshot({ path: (process.env.TMPDIR || '/tmp') + '/br-error.png' }).catch(() => {});
}
console.log('адрес:', page.url());
await browser.close();
