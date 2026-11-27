// Прямое управление одной вкладкой Chromium (без Playwright: он зависает, когда в браузере открыты служебные панели).
// Запуск: /opt/homebrew/opt/node@22/bin/node cdp.mjs <часть адреса вкладки> '<json-шаги>'
// Шаги: {eval:"js"} {shot:"файл.png"} {files:"js-выражение, возвращающее input", path:"файл"} {clickText:"текст", tag?:"button"} {wait:мс} {goto:"url"} {type:"текст"} {key:"Enter"}
import fs from 'node:fs';

const [needle, stepsJson] = process.argv.slice(2);
const steps = JSON.parse(stepsJson);
const tabs = await (await fetch('http://127.0.0.1:9222/json')).json();
const tab = tabs.find((t) => t.type === 'page' && t.url.includes(needle));
if (!tab) { console.log('вкладка не найдена:', needle); process.exit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
const events = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) events.push(d); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (expr, byValue = true) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: byValue, awaitPromise: true, userGesture: true });
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
  return r.result?.result;
};
// поиск по тексту с заходом в теневые деревья
const FIND = `(function(){
  window.__deep = function(root, test, out){ out = out || [];
    const walk = (n) => { if (!n) return; if (n.nodeType === 1 && test(n)) out.push(n);
      if (n.shadowRoot) walk(n.shadowRoot); for (const c of (n.children || [])) walk(c); };
    walk(root); return out; };
  window.__byText = function(txt, tag){ const els = window.__deep(document.documentElement, (e) => {
      if (tag && e.tagName.toLowerCase() !== tag) return false;
      const t = (e.innerText || e.textContent || '').trim(); if (t !== txt) return false;
      const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    return els.sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length); };
})()`;
await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
await ev(FIND);
for (const s of steps) {
  let note = '';
  if (s.goto) { await send('Page.navigate', { url: s.goto }); await sleep(s.after || 6000); await ev(FIND); }
  else if (s.eval) { const r = await ev(s.eval); note = JSON.stringify(r?.value ?? r).slice(0, s.max || 1200); }
  else if (s.shot) { await send('Page.bringToFront'); await sleep(400); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(s.shot, Buffer.from(r.result.data, 'base64')); }
  else if (s.files) {
    const r = await ev(s.files, false);
    if (!r?.objectId) { note = 'input не найден: ' + JSON.stringify(r).slice(0, 200); }
    else { const x = await send('DOM.setFileInputFiles', { files: [s.path], objectId: r.objectId }); note = x.error ? JSON.stringify(x.error) : 'файл подставлен'; }
  } else if (s.choose) {
    // как у человека: клик по кнопке открывает выбор файла, мы перехватываем его и подставляем файл
    await send('Page.setInterceptFileChooserDialog', { enabled: true });
    events.length = 0;
    const r = await ev(`(function(){ const e = window.__byText(${JSON.stringify(s.choose)}, 'button')[${s.nth || 0}]; if(!e) return null; e.scrollIntoView({block:'center'}); const b = e.getBoundingClientRect(); return {x: b.x + b.width/2, y: b.y + b.height/2}; })()`);
    if (!r?.value) note = 'кнопка не найдена';
    else {
      const { x, y } = r.value;
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await sleep(250);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await sleep(80);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      let evn = null;
      for (let k = 0; k < 40 && !evn; k++) { await sleep(250); evn = events.find((e) => e.method === 'Page.fileChooserOpened'); }
      if (!evn) note = 'окно выбора файла не открылось';
      else { const x2 = await send('DOM.setFileInputFiles', { files: [s.path], backendNodeId: evn.params.backendNodeId }); note = x2.error ? JSON.stringify(x2.error) : 'файл выбран'; }
    }
    await send('Page.setInterceptFileChooserDialog', { enabled: false });
  } else if (s.clickText) {
    const r = await ev(`(function(){ const e = window.__byText(${JSON.stringify(s.clickText)}, ${JSON.stringify(s.tag || null)})[${s.nth || 0}]; if(!e) return null; e.scrollIntoView({block:'center'}); const b = e.getBoundingClientRect(); return {x: b.x + b.width/2, y: b.y + b.height/2, tag: e.tagName}; })()`);
    if (!r?.value) note = 'не найдено';
    else {
      const { x, y } = r.value;
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 40, y: y - 15 }); await sleep(150 + Math.random() * 200);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await sleep(200 + Math.random() * 300);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await sleep(60 + Math.random() * 80);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      note = `клик по <${r.value.tag}> в ${Math.round(x)},${Math.round(y)}`;
    }
  } else if (s.type) { for (const ch of s.type) { await send('Input.insertText', { text: ch }); await sleep(60 + Math.random() * 70); } }
  else if (s.key) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: s.key, code: s.key, windowsVirtualKeyCode: s.key === 'Enter' ? 13 : 0 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: s.key, code: s.key }); }
  else if (s.wait) { await sleep(s.wait); }
  console.log('шаг:', JSON.stringify(s).slice(0, 80), note ? '→ ' + note : '');
}
const u = await ev('location.href'); console.log('адрес:', u?.value);
ws.close();
