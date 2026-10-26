// lab.js — приёмы поверх движка (core.js), общие для идей лаборатории.
// Всё по-прежнему чистые функции времени: никакого состояния между кадрами.
// При переносе идеи в проект копируй этот файл в js/ проекта и подключай после cast.js.

// ------------------------------------------------------------------ шум и тряска
// гладкий детерминированный 1D-шум (value noise с косинусной интерполяцией), [-1, 1]
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = 0.5 - 0.5 * Math.cos(Math.PI * f);
  return lerp(hash01(i, seed) * 2 - 1, hash01(i + 1, seed) * 2 - 1, u);
}
// сумма октав: живой дрейф камеры или «дыхание» объекта
const fbm1 = (x, seed = 0, oct = 3) => { let s = 0, a = 0.5, fr = 1; for (let k = 0; k < oct; k++) { s += a * noise1(x * fr, seed + 17 * k); a *= 0.5; fr *= 2; } return s; };
// удар: затухающая тряска после t0 -> { x, y, rot }
function shake(t, t0, amp = 18, dur = 0.45, seed = 3, freq = 22) {
  if (t < t0 || t > t0 + dur) return { x: 0, y: 0, rot: 0 };
  const k = Math.exp(-4 * (t - t0) / dur) * (1 - (t - t0) / dur), x = (t - t0) * freq;
  return { x: amp * k * noise1(x, seed), y: amp * k * noise1(x, seed + 5), rot: 0.12 * amp * k * noise1(x, seed + 9) };
}

// ------------------------------------------------------------------ текст
// измерить строку (после loadFonts)
let _measEl = null;
function textWidth(str, size, font = 'Rubik', weight = 800, ls = 0) {
  // data-texture: служебный элемент замера, safecheck его пропускает
  if (!_measEl) { const s = S('svg', { width: 10, height: 10, style: 'position:absolute;left:-9999px', 'data-texture': '' }); document.body.appendChild(s); _measEl = S('text', { style: 'white-space:pre' }, s); }
  A(_measEl, 'font-family', font); A(_measEl, 'font-size', size); A(_measEl, 'font-weight', weight); A(_measEl, 'letter-spacing', ls);
  _measEl.textContent = str;
  return _measEl.getComputedTextLength();
}
// строка, разбитая на буквы: каждая буква — свой <g> с началом в точке её базовой линии.
// -> { g, chars: [{ g, t, x, w, i }], width }   anchor: 'start' | 'middle' | 'end'
// Каждую букву ставь place/pose(ch.g, x0 + ch.x + ..., y, ...); ширины из реальной вёрстки (кернинг учтён).
function splitText(parent, str, { x = 0, y = 0, size = 96, font = 'Rubik', weight = 800, fill = '#1e1e1e', anchor = 'start', ls = 0, attrs = {} } = {}) {
  const g = S('g', {}, parent), full = textWidth(str, size, font, weight, ls);
  const x0 = anchor === 'middle' ? -full / 2 : anchor === 'end' ? -full : 0;
  const chars = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === ' ') continue;
    const before = textWidth(str.slice(0, i), size, font, weight, ls), w = textWidth(c, size, font, weight, 0);
    const cg = S('g', {}, g);
    const te = S('text', { x: -w / 2, y: 0, 'font-family': font, 'font-size': size, 'font-weight': weight, fill, ...attrs }, cg);
    te.textContent = c;
    chars.push({ g: cg, el: te, t: c, x: x + x0 + before + w / 2, y, w, i: chars.length });
  }
  return { g, chars, width: full };
}
// печать: первые n символов строки (p = 0..1)
const typed = (str, p) => str.slice(0, Math.round(clamp(p) * str.length));

// ------------------------------------------------------------------ числа
// 1234567.8 -> «1 234 567,8» (узкий неразрывный пробел, русская запятая)
function fmtNum(v, dec = 0, lang = 'ru') {
  const s = Math.abs(v).toFixed(dec), [a, b] = s.split('.');
  const sep = lang === 'ru' ? ' ' : ',', dot = lang === 'ru' ? ',' : '.';
  return (v < 0 ? '−' : '') + a.replace(/\B(?=(\d{3})+(?!\d))/g, sep) + (b ? dot + b : '');
}
// счётчик, который «доезжает» к цели: ease.outExpo даёт быстрый старт и мягкий финиш
const countTo = (t, t0, d, v0, v1, e = ease.outExpo) => lerp(v0, v1, prog(t, t0, d, e));

// ------------------------------------------------------------------ маски, градиенты, геометрия
// прямоугольный клип: el.set(x, y, w, h) в кадре -> шторки, раскрытия, сканы
let _clipN = 0;
function clipRect(defs, target) {
  const id = 'cr' + (++_clipN), cp = S('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, defs);
  const r = S('rect', { x: 0, y: 0, width: 0, height: 0 }, cp);
  if (target) A(target, 'clip-path', `url(#${id})`);
  r.set = (x, y, w, h) => { A(r, 'x', f2(x)); A(r, 'y', f2(y)); A(r, 'width', f2(Math.max(0, w))); A(r, 'height', f2(Math.max(0, h))); };
  r.id_ = id;
  return r;
}
// круглый клип (раскрытие кругом из точки)
function clipCircle(defs, target) {
  const id = 'cc' + (++_clipN), cp = S('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, defs);
  const c = S('circle', { cx: 0, cy: 0, r: 0 }, cp);
  if (target) A(target, 'clip-path', `url(#${id})`);
  c.set = (cx, cy, r) => { A(c, 'cx', f2(cx)); A(c, 'cy', f2(cy)); A(c, 'r', f2(Math.max(0, r))); };
  return c;
}
let _gradN = 0;
function linGrad(defs, stops, { x1 = 0, y1 = 0, x2 = 1, y2 = 1, units = 'objectBoundingBox' } = {}) {
  const id = 'lg' + (++_gradN), g = S('linearGradient', { id, x1, y1, x2, y2, gradientUnits: units }, defs);
  stops.forEach(([o, c, a = 1]) => S('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
  return `url(#${id})`;
}
function radGrad(defs, stops, { cx = 0.5, cy = 0.5, r = 0.5, units = 'objectBoundingBox' } = {}) {
  const id = 'rg' + (++_gradN), g = S('radialGradient', { id, cx, cy, r, gradientUnits: units }, defs);
  stops.forEach(([o, c, a = 1]) => S('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
  return `url(#${id})`;
}
// дуга окружности как путь (углы в градусах, 0 = вверх, по часовой)
function arcD(cx, cy, r, a0, a1) {
  const p = a => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1), large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
// сцена-группа, которую включаем/выключаем целиком (display, не visibility — см. engine.md §3)
function sceneG(parent) { const g = S('g', {}, parent); g.on = v => A(g, 'display', v ? 'inline' : 'none'); return g; }
// задержка элемента i в каскаде с ускорением к концу (первые идут реже)
const stag = (i, d = 0.06, accel = 0) => i * d * (1 - accel * Math.min(i, 10) / 20);
