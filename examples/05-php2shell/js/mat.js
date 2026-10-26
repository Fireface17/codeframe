// mat.js — материал мира ролика №4: лист с волокном, серый картон и крафт, торец, тень по силуэту,
// бумажные ярлыки и вырезки, чернила и графит (rough.js с фиксированным seed), штамп.
// Всё — чистые функции времени; текстуры запекаются один раз на старте (canvas → dataURL, детерминированно).
// Свет один: сверху-слева. Торец и тень — вниз-вправо, тень ≤ 12 %.

const PAL = {
  sheet: '#F4F0E6', fiberD: '#DCD2BE', fiberL: '#FFFDF7',
  desk: '#DCC9A8', deskLine: '#C7B08B',
  gray: '#D2CEC5', grayEdge: '#A39E93', kraft: '#D5B78C', kraftEdge: '#A88A61',
  slip: '#FBFAF6', slipEdge: '#D9D2C4',
  line: '#26231E', ink: '#0E1016', graphite: '#5F6675', yellow: '#FFC83D', shadow: '#3B2D1D',
  fieldFace: '#F0ECE3', fieldLine: '#DCD5C9', fieldInk: '#BCB6AB',
  wood: '#C9A57A', woodD: '#A9845A', rubber: '#3A3632',
  board: '#7E8494', boardEdge: '#5E6370', tape: '#D8BF8E', tapeEdge: '#B89A66',
  k1: '#D5B78C', k2: '#C4A175', k3: '#B08C5E', slabGray: '#A39E93', slabGrayEdge: '#857F74',
};
// тона плиток: лицо и торец
const TONES = { gray: [PAL.gray, PAL.grayEdge], kraft: [PAL.kraft, PAL.kraftEdge], slip: [PAL.slip, PAL.slipEdge],
  yellow: [PAL.yellow, '#C9962A'], board: [PAL.board, PAL.boardEdge], tape: [PAL.tape, PAL.tapeEdge] };
// толщина обводки на экране растёт медленнее масштаба камеры: css --k = z^-0.6 (ставит film.js каждый кадр)
const olw = w => `stroke-width:calc(var(--k, 1) * ${w}px)`;
const FONT = { text: 'Onest', mono: '"JetBrains Mono"', head: 'Unbounded' };
const LIGHT = { x: 0.62, y: 1 };   // направление тени (вниз-вправо)

// ------------------------------------------------------------------ запечённые текстуры
const TEX = {};
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// волокна и пятна бумаги; бесшовно (рисуем с переносом через край)
function bakePaper(size = 1024, base = PAL.sheet, seed = 1, k = 1) {
  const c = cnv(size, size), g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  const wrap = (fn) => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
  const area = (size * size) / (1024 * 1024);                // плотность волокон и пятен не зависит от размера тайла
  // крупная неровность тона
  for (let i = 0; i < Math.round(90 * area); i++) {
    const x = hash01(i, seed) * size, y = hash01(i, seed + 1) * size, r = 60 + 160 * hash01(i, seed + 2);
    const dark = hash01(i, seed + 3) < 0.5;
    wrap(() => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, dark ? `rgba(120,96,60,${0.016 * k})` : `rgba(255,255,250,${0.035 * k})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    });
  }
  // мелкое зерно
  const im = g.getImageData(0, 0, size, size), d = im.data;
  for (let p = 0; p < size * size; p++) {
    const n = (hash01(p, seed + 9) - 0.5) * 9 * k;
    d[p * 4] += n; d[p * 4 + 1] += n; d[p * 4 + 2] += n * 0.9;
  }
  g.putImageData(im, 0, 0);
  // волокна: короткие изогнутые, тёмные и светлые
  g.lineCap = 'round';
  const fibers = Math.round(1100 * k * area);
  for (let i = 0; i < fibers; i++) {
    const x = hash01(i, seed + 20) * size, y = hash01(i, seed + 21) * size;
    const long = hash01(i, seed + 22) < 0.07, L = long ? 40 + 60 * hash01(i, seed + 23) : 6 + 22 * hash01(i, seed + 23);
    const a = hash01(i, seed + 24) * Math.PI * 2, bend = (hash01(i, seed + 25) - 0.5) * L * 0.6;
    const dark = hash01(i, seed + 26) < 0.62;
    const x1 = x + Math.cos(a) * L, y1 = y + Math.sin(a) * L, mx = (x + x1) / 2 - Math.sin(a) * bend, my = (y + y1) / 2 + Math.cos(a) * bend;
    wrap(() => {
      g.strokeStyle = dark ? `rgba(150,128,95,${(0.16 + 0.2 * hash01(i, seed + 27)) * k})` : `rgba(255,255,252,${0.55 * k})`;
      g.lineWidth = (long ? 0.7 : 0.6) + 0.9 * hash01(i, seed + 28);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
    });
  }
  return c;
}
// прозрачный слой зерна картона (поверх любой заливки плитки, в т. ч. жёлтой)
function bakeGrain(size = 256, seed = 5) {
  const c = cnv(size, size), g = c.getContext('2d');
  const im = g.createImageData(size, size), d = im.data;
  for (let p = 0; p < size * size; p++) {
    const h = hash01(p, seed);
    if (h < 0.10) { d[p * 4] = 70; d[p * 4 + 1] = 55; d[p * 4 + 2] = 35; d[p * 4 + 3] = 20 + 40 * hash01(p, seed + 1); }
    else if (h > 0.93) { d[p * 4] = 255; d[p * 4 + 1] = 255; d[p * 4 + 2] = 250; d[p * 4 + 3] = 30 + 40 * hash01(p, seed + 2); }
  }
  g.putImageData(im, 0, 0);
  g.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const x = hash01(i, seed + 10) * size, y = hash01(i, seed + 11) * size, a = hash01(i, seed + 12) * 6.28, L = 4 + 12 * hash01(i, seed + 13);
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      g.strokeStyle = hash01(i, seed + 14) < 0.7 ? 'rgba(90,70,40,0.16)' : 'rgba(255,255,250,0.35)';
      g.lineWidth = 0.6 + 0.6 * hash01(i, seed + 15);
      g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a) * L, y + dy + Math.sin(a) * L); g.stroke();
    }
  }
  return c;
}
// стол: светлая берёзовая фанера, волокна вдоль x
function bakeDesk(w = 1024, h = 1024, seed = 7) {
  const c = cnv(w, h), g = c.getContext('2d');
  g.fillStyle = PAL.desk; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 150; i++) {
    const y0 = hash01(i, seed) * h, amp = 6 + 20 * hash01(i, seed + 1), ph = hash01(i, seed + 2) * 6.28, fr = 1 + Math.floor(3 * hash01(i, seed + 3));
    g.strokeStyle = `rgba(150,118,78,${0.08 + 0.14 * hash01(i, seed + 4)})`; g.lineWidth = 0.8 + 2.2 * hash01(i, seed + 5);
    for (const dy of [-h, 0, h]) {
      g.beginPath();
      for (let x = 0; x <= w; x += 16) { const y = y0 + dy + amp * Math.sin(ph + fr * 2 * Math.PI * x / w); x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
  }
  return c;
}
async function toURL(c, type = 'image/png', q) { return c.toDataURL(type, q); }
function patternFrom(defs, id, url, w, h, attrs = {}) {
  const p = S('pattern', { id, patternUnits: 'userSpaceOnUse', width: w, height: h, ...attrs }, defs);
  S('image', { href: url, width: w, height: h }, p);
  return `url(#${id})`;
}

// ------------------------------------------------------------------ геометрия
const rrD = (w, h, r) => rr(-w / 2, -h / 2, w, h, Math.min(r, w / 2, h / 2));
const rrAt = (w, h, r, dx, dy) => rr(-w / 2 + dx, -h / 2 + dy, w, h, Math.min(r, w / 2, h / 2));

// ------------------------------------------------------------------ плитка
// makeTile(layer, shadowLayer, { w, h, tone: 'gray'|'kraft'|'slip', r, depth, yellow })
//   .front / .back — группы содержимого (центр в 0); .set({ x, y, rot, s, lift, o, flip, yel, w, h, dim, edgeO })
// lift — высота над листом в px: длина тени = 2 + lift (покой: lift 4 → тень 6 px).
let _tileN = 0;
function makeTile(layer, shLayer, o = {}) {
  const id = ++_tileN;
  const tone = o.tone || 'gray';
  const [face, edge] = o.face ? [o.face, o.edge || o.face] : (TONES[tone] || TONES.gray);
  const T_ = { w: o.w || 100, h: o.h || 100, r: o.r ?? 6, depth: o.depth ?? 5, tone, line: o.line ?? 3 };
  const sg = S('g', {}, shLayer);
  const sh0 = S('path', { fill: 'none', stroke: PAL.shadow, 'stroke-opacity': 0.022, 'stroke-linejoin': 'round' }, sg);
  const sh1 = S('path', { fill: PAL.shadow, opacity: 0.04, stroke: PAL.shadow, 'stroke-linejoin': 'round' }, sg);
  const sh2 = S('path', { fill: PAL.shadow, opacity: 0.06 }, sg);
  const g = S('g', {}, layer);
  const e1 = S('path', { fill: edge }, g), e2 = S('path', { fill: edge, stroke: PAL.line, 'stroke-opacity': 0.7, style: olw(Math.min(T_.line, 1.8)), 'stroke-linejoin': 'round' }, g);
  const fc = S('path', { fill: face }, g);
  let yel = null, yclip = null;
  if (o.yellow) {
    const cid = 'yc' + id, cp = S('clipPath', { id: cid }, g);
    yclip = S('path', { d: 'M0 0' }, cp);
    yel = S('path', { fill: PAL.yellow, 'clip-path': `url(#${cid})` }, g);
  }
  const gr = S('path', { fill: 'url(#pGrain)', opacity: tone === 'slip' ? 0.5 : 0.9 }, g);
  const lit = S('path', { fill: 'url(#gLit)' }, g);               // один свет сверху-слева: лицо чуть светлее к нему
  const hi = S('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.42, 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
  const ol = S('path', { fill: 'none', stroke: PAL.line, style: olw(T_.line), 'stroke-linejoin': 'round' }, g);
  if (!T_.line) A(ol, 'display', 'none');
  const cw = S('g', {}, g);                                         // содержимое, сжимается при перевороте
  const front = S('g', {}, cw), back = S('g', {}, cw);
  const over = S('g', {}, g);                                       // поверх содержимого (точки, штамп на плитке)
  const dimR = S('path', { fill: PAL.sheet, opacity: 0 }, g);       // гашение «до тона листа/поля» (поверх текста)
  const tile = { id, g, sg, front, back, over, T: T_, last: {} };
  let geoKey = '';
  tile.setTone = (tn) => {
    if (tile._tone === tn) return; tile._tone = tn;
    const [f, e] = TONES[tn] || TONES.gray;
    A(fc, 'fill', f); A(e1, 'fill', e); A(e2, 'fill', e);
  };
  tile._tone = tone;
  tile.geo = (w, h) => {
    const key = w.toFixed(2) + '|' + h.toFixed(2) + '|' + T_.depth;
    if (key === geoKey) return;
    geoKey = key;
    const r = Math.min(T_.r, w / 2, h / 2), d = T_.depth;
    const fd = rrD(w, h, r);
    A(fc, 'd', fd); A(gr, 'd', fd); A(lit, 'd', fd); A(ol, 'd', fd); A(dimR, 'd', fd);
    A(e1, 'd', rrAt(w, h, r, d * LIGHT.x * 0.5, d * 0.5));
    A(e2, 'd', rrAt(w, h, r, d * LIGHT.x, d));
    A(sh0, 'd', fd); A(sh1, 'd', fd); A(sh2, 'd', fd);
    if (yel) A(yel, 'd', fd);
    // блик верхней и левой кромки
    const x0 = -w / 2 + 3, y0 = -h / 2 + 3, rr2 = Math.max(0, r - 2);
    A(hi, 'd', `M${f2(x0)} ${f2(h / 2 - r - 2)}V${f2(y0 + rr2)}Q${f2(x0)} ${f2(y0)} ${f2(x0 + rr2)} ${f2(y0)}H${f2(w / 2 - r - 2)}`);
  };
  tile.set = (st) => {
    const w = st.w ?? T_.w, h = st.h ?? T_.h, s = st.s ?? 1, x = st.x ?? 0, y = st.y ?? 0, rot = st.rot ?? 0;
    const op = st.o ?? 1, lift = st.lift ?? 4, flip = st.flip ?? 0;
    const c = Math.abs(Math.cos(Math.PI * clamp(flip, 0, 1)));
    const wv = Math.max(2, w * c);
    tile.geo(wv, h);
    const tr = `translate(${f2(x)} ${f2(y)})${rot ? ` rotate(${f2(rot)})` : ''} scale(${f2(Math.max(s, 1e-4))})`;
    A(g, 'transform', tr);
    show(g, op);
    // тень: длина 2 + lift, мягкий край растёт с высотой
    const L = (3 + lift * 1.5);
    A(sg, 'transform', `translate(${f2(x + L * LIGHT.x * s)} ${f2(y + L * LIGHT.y * s)})${rot ? ` rotate(${f2(rot)})` : ''} scale(${f2(Math.max(s, 1e-4))})`);
    A(sh1, 'stroke-width', f2(3 + lift * 0.8)); A(sh0, 'stroke-width', f2(9 + lift * 1.6));
    show(sg, op * (st.shO ?? 1));
    A(cw, 'transform', c < 0.999 ? `scale(${f2(Math.max(c, 0.001))} 1)` : '');
    const showBack = flip >= 0.5;
    A(front, 'display', showBack ? 'none' : 'inline');
    A(back, 'display', showBack ? 'inline' : 'none');
    if (yel) {
      const yv = clamp(st.yel ?? 0);
      // заливка жёлтым — мазок слева направо со скошенным фронтом
      const X = -wv / 2 - 12 + (wv + 40) * yv;
      A(yclip, 'd', yv <= 0 ? 'M0 0' : `M${f2(-wv / 2 - 20)} ${f2(-h / 2 - 20)}H${f2(X + 10)}L${f2(X - 10)} ${f2(h / 2 + 20)}H${f2(-wv / 2 - 20)}Z`);
      show(yel, yv > 0 ? 1 : 0);
    }
    A(dimR, 'opacity', f2(clamp(st.dim ?? 0) * 0.86));
    A(e1, 'opacity', f2(st.edgeO ?? 1)); A(e2, 'opacity', f2(st.edgeO ?? 1));
    A(ol, 'opacity', f2(st.lineO ?? 1)); A(hi, 'opacity', f2(st.lineO ?? 1));
    A(over, 'opacity', f2(st.overO ?? 1));
    tile.last = { x, y, w, h, s, rot };
  };
  tile.hide = () => { show(g, 0); show(sg, 0); };
  return tile;
}
// текст в группе (центр по x, оптическая середина по y)
function tText(parent, str, { size = 60, font = FONT.text, weight = 700, fill = PAL.ink, y = 0, x = 0, anchor = 'middle', ls = 0, o = 1 } = {}) {
  const t = S('text', { x, y: y + size * 0.35, 'font-family': font, 'font-size': size, 'font-weight': weight, fill, 'text-anchor': anchor, 'letter-spacing': ls, opacity: o }, parent);
  t.textContent = str;
  return t;
}
const monoW = (str, size) => str.length * 0.6 * size;

// ------------------------------------------------------------------ чернила и графит
// рукописная линия, рисуется от 0 до v; seed фиксирован — контур не кипит
function inkStroke(parent, d, { seed = 3, w = 5, color = PAL.ink, rough: ro = 0.8, bow = 0.8, o = 1 } = {}) {
  const dd = roughD(d, { seed, roughness: ro, bowing: bow, disableMultiStroke: true, preserveVertices: false });
  const p = drawStroke(parent, dd, { stroke: color, 'stroke-width': w, opacity: o });
  return p;
}
// незамкнутый круг пером вокруг (cx, cy) размером rx×ry
function inkLoop(parent, cx, cy, rx, ry, opt = {}) {
  let d = '';
  const n = 70, ph = hash01(2, opt.seed || 4) * 0.6, turns = 1.1;
  for (let k = 0; k <= n; k++) {
    const u = k / n, a = -2.2 + ph + u * turns * 2 * Math.PI, rr_ = 1 + 0.06 * u + 0.025 * Math.sin(3 * a + ph * 5);
    d += (k ? 'L' : 'M') + f2(cx + rx * rr_ * Math.cos(a)) + ' ' + f2(cy + ry * rr_ * Math.sin(a));
  }
  return drawStroke(parent, d, { stroke: opt.color || PAL.ink, 'stroke-width': opt.w || 6, opacity: opt.o ?? 1 });
}
// фигурная скобка (горизонтальная, открыта вверх) шириной w
function braceD(x0, x1, y, h = 26) {
  const m = (x0 + x1) / 2, q = h * 0.5;
  return `M${x0} ${y - h}Q${x0} ${y - q} ${x0 + h} ${y - q}H${m - h}Q${m} ${y - q} ${m} ${y}Q${m} ${y - q} ${m + h} ${y - q}H${x1 - h}Q${x1} ${y - q} ${x1} ${y - h}`;
}
// стрелка: древко + наконечник (рисуется после древка)
function inkArrow(parent, pts, opt = {}) {
  const [a, b, c] = pts;
  const shaft = inkStroke(parent, `M${a[0]} ${a[1]}Q${b[0]} ${b[1]} ${c[0]} ${c[1]}`, { seed: opt.seed || 9, w: opt.w || 5, color: opt.color || PAL.ink });
  const ang = Math.atan2(c[1] - b[1], c[0] - b[0]), L = opt.head || 26;
  const h1 = [c[0] - L * Math.cos(ang - 0.45), c[1] - L * Math.sin(ang - 0.45)], h2 = [c[0] - L * Math.cos(ang + 0.45), c[1] - L * Math.sin(ang + 0.45)];
  const head = inkStroke(parent, `M${f2(h1[0])} ${f2(h1[1])}L${c[0]} ${c[1]}L${f2(h2[0])} ${f2(h2[1])}`, { seed: (opt.seed || 9) + 1, w: opt.w || 5, color: opt.color || PAL.ink, rough: 0.4 });
  return { draw: v => { shaft.draw(clamp(v / 0.8)); head.draw(clamp((v - 0.8) / 0.2)); } };
}
// письмо маской: текст проявляется слева направо (по буквам, неровно)
let _maskN = 0;
function writeOn(parent, str, { x = 0, y = 0, size = 80, font = FONT.text, weight = 500, fill = PAL.graphite, ls = 0, anchor = 'start' } = {}) {
  const id = 'wm' + (++_maskN);
  const defs = S('defs', {}, parent);
  const m = S('mask', { id, maskUnits: 'userSpaceOnUse', x: -4000, y: -4000, width: 8000, height: 8000 }, defs);
  const r = S('rect', { x: 0, y: y - size * 1.2, width: 0, height: size * 1.8, fill: '#fff' }, m);
  const t = S('text', { x, y, 'font-family': font, 'font-size': size, 'font-weight': weight, fill, 'letter-spacing': ls, 'text-anchor': anchor, mask: `url(#${id})` }, parent);
  t.textContent = str;
  const w = textWidth(str, size, font.replace(/"/g, ''), weight, ls);
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  A(r, 'x', f2(x0 - 4));
  const o = { el: t, w, x0, draw: v => { A(r, 'width', f2((w + 10) * clamp(v))); A(t, 'visibility', v <= 0 ? 'hidden' : 'visible'); } };
  o.draw(0);
  return o;
}

// ------------------------------------------------------------------ бумажный ярлык с пометкой (уезжает, а не тает)
function makeSlip(layer, shLayer, str, { size = 44, pad = 22, weight = 600, w } = {}) {
  const tw = textWidth(str, size, 'Onest', weight);
  const W_ = w || tw + pad * 2, H_ = size * 1.55;
  const t = makeTile(layer, shLayer, { w: W_, h: H_, tone: 'slip', r: 3, depth: 2, line: 0 });
  // у бумаги нет тёмной обводки: тонкая кромка
  t.T.line = 0;
  tText(t.front, str, { size, weight, fill: PAL.ink });
  t.W = W_; t.H = H_;
  return t;
}

// ------------------------------------------------------------------ штамп
// Деревянный штамп сверху: брусок с ручкой; опускается, давит (тень сжимается до нуля), уходит.
// Отпечаток — отдельно (stampPrint), появляется в момент касания.
function makeStampBlock(layer, w, h, { dir = 1, tilt = 12, side = 34 } = {}) {
  // деревянный штамп в наклоне: верх бруска, бок 30–40 px с резиновой подошвой, ручка-грибок; тень отдельно
  const sh = S('path', { d: rrAt(w, h, 14, side * 0.4, side * 0.6), fill: PAL.shadow, opacity: 0.12 }, layer);
  const g = S('g', {}, layer);
  const body = S('g', {}, g);
  const sx = side * 0.62, sy = side;
  for (let k = 1; k <= 5; k++) S('path', { d: rrAt(w, h, 14, sx * k / 5, sy * k / 5), fill: k > 3 ? '#8A6440' : '#9B774C' }, body);
  S('path', { d: rrAt(w - 4, 14, 6, sx + 1, h / 2 + sy - 6), fill: PAL.rubber }, body);                 // подошва
  S('path', { d: rrAt(w, h, 14, sx, sy), fill: 'none', stroke: PAL.line, 'stroke-width': 3 }, body);
  S('path', { d: rrD(w, h, 14), fill: PAL.wood, stroke: PAL.line, 'stroke-width': 3 }, body);
  S('path', { d: rrD(w, h, 14), fill: 'url(#pGrain)', opacity: 0.9 }, body);
  S('path', { d: rrD(w, h, 14), fill: 'url(#gLit)' }, body);
  [[-0.32, 0.2], [0.05, -0.15], [0.3, 0.25]].forEach(([fx, fy], i) =>
    S('path', { d: `M${f2(-w * 0.42)} ${f2(h * fy)}C${f2(-w * 0.1)} ${f2(h * (fy - 0.08))} ${f2(w * 0.12)} ${f2(h * (fy + 0.07))} ${f2(w * 0.42)} ${f2(h * (fy - 0.03))}`, stroke: '#8E6C45', 'stroke-opacity': 0.28, 'stroke-width': 2, fill: 'none' }, body));
  const kr = Math.min(w, h) * 0.22;
  S('ellipse', { cx: 9, cy: 14, rx: kr * 0.72, ry: kr * 0.62, fill: '#6E4E2E' }, body);              // шейка ручки
  S('circle', { cx: 0, cy: 0, r: kr, fill: '#9C7448', stroke: PAL.line, 'stroke-width': 3 }, body);
  S('circle', { cx: -kr * 0.3, cy: -kr * 0.3, r: kr * 0.35, fill: '#FFFFFF', opacity: 0.22 }, body);
  // ph: 0…1 подлёт (0–0,3 — из-за края, 0,3–1 — опускание: ×1,2 → 1, тень 40 → 4 px), 1 касание, 1…2 подъём и уход
  return (ph, x, y, rot = 0) => {
    if (ph <= 0 || ph >= 2) { show(g, 0); show(sh, 0); return; }
    let hgt, far;
    if (ph <= 1) { const u = ph; far = u < 0.3 ? Math.pow(1 - u / 0.3, 2) : 0; hgt = u < 0.3 ? 1 : 1 - ease.inOut((u - 0.3) / 0.7); }
    else { const e = ph - 1; hgt = ease.out(Math.min(1, e / 0.5)); far = e < 0.5 ? 0 : Math.pow((e - 0.5) / 0.5, 2); }
    const dx = dir * (1300 * far + 60 * hgt), dy = -(1400 * far + 80 * hgt), s = 1 + 0.2 * hgt;
    const L = 4 + 36 * hgt;
    A(g, 'transform', `translate(${f2(x + dx)} ${f2(y + dy)}) rotate(${f2(rot + dir * tilt)}) scale(${f2(s)})`);
    A(sh, 'transform', `translate(${f2(x + dx + L * 0.53)} ${f2(y + dy + L * 0.85)}) rotate(${f2(rot + dir * tilt)}) scale(${f2(s * (1 + 0.04 * hgt))})`);
    A(sh, 'opacity', f2(0.12 * (1 - 0.45 * hgt)));
    show(g, 1); show(sh, 1);
  };
}
// отпечаток: текст с «неровной» краской (маска из крапинок), проявляется за 2 кадра в момент касания
function stampPrint(parent, lines, { size = 150, font = FONT.mono, weight = 700, frame = false, color = PAL.ink, rot = -2, seed = 11 } = {}) {
  const g = S('g', {}, parent), id = 'sp' + (++_maskN);
  const defs = S('defs', {}, g);
  const m = S('mask', { id, maskUnits: 'userSpaceOnUse', x: -3000, y: -3000, width: 6000, height: 6000 }, defs);
  S('rect', { x: -3000, y: -3000, width: 6000, height: 6000, fill: '#fff' }, m);
  // крапинки — места, где краска не легла
  let dots = '';
  const W_ = Math.max(...lines.map(l => (l.mono ? monoW(l.t, l.size || size) : textWidth(l.t, l.size || size, 'Onest', l.weight || 700)))) + 60;
  const H_ = lines.reduce((s, l) => s + (l.size || size) * 1.1, 0) + 40;
  for (let i = 0; i < Math.round(W_ * H_ / 260); i++) {
    const x = (hash01(i, seed) - 0.5) * W_, y = (hash01(i, seed + 1) - 0.5) * H_, r = 0.8 + 2.6 * Math.pow(hash01(i, seed + 2), 2);
    dots += `M${f2(x - r)} ${f2(y)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0`;
  }
  S('path', { d: dots, fill: '#000' }, m);
  const ink = S('g', { mask: `url(#${id})`, transform: `rotate(${rot})` }, g);
  let y = -H_ / 2 + 20;
  lines.forEach(l => {
    const sz = l.size || size;
    y += sz * 0.9;
    const t = S('text', { x: 0, y, 'font-family': l.mono === false ? FONT.text : font, 'font-size': sz, 'font-weight': l.weight || weight, fill: color, 'text-anchor': 'middle' }, ink);
    t.textContent = l.t;
    y += sz * 0.2;
  });
  if (frame) S('path', { d: roughD(rrD(W_, H_, 18), { seed: seed + 5, roughness: 0.6, disableMultiStroke: true }), fill: 'none', stroke: color, 'stroke-width': 6 }, ink);
  g.W = W_; g.H = H_;
  // v: 0 нет, 1 отпечаток; плотность краски «доходит» за 2 кадра
  g.set = (v, x, y2, s = 1) => { A(g, 'transform', `translate(${f2(x)} ${f2(y2)}) scale(${f2(s)})`); show(g, v <= 0 ? 0 : 0.55 + 0.37 * clamp(v)); };
  g.set(0, 0, 0);
  return g;
}

// ------------------------------------------------------------------ карандаш (сверху): кончик в (x, y), корпус уходит вниз-вправо
function makePencil(layer, shLayer, { len = 760, w = 46 } = {}) {
  const sh = S('path', { fill: PAL.shadow, opacity: 0.11 }, shLayer);
  const g = S('g', {}, layer);
  const cone = 92, lead = 26;
  const body = `M${cone} ${-w / 2}H${len}V${w / 2}H${cone}Z`;
  const coneD = `M${lead} ${-w * 0.14}L${cone} ${-w / 2}L${cone} ${w / 2}L${lead} ${w * 0.14}Z`;
  const leadD = `M0 0L${lead} ${-w * 0.14}L${lead} ${w * 0.14}Z`;
  S('path', { d: body, fill: '#4E545E', stroke: PAL.line, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
  S('path', { d: `M${cone + 4} ${-w / 6}H${len}`, stroke: '#6E7580', 'stroke-width': 3 }, g);
  S('path', { d: `M${cone + 4} ${w / 6}H${len}`, stroke: '#3E434B', 'stroke-width': 3 }, g);
  S('path', { d: `M${cone + 4} ${-w / 2 + 4}H${len}`, stroke: '#FFFFFF', 'stroke-opacity': 0.25, 'stroke-width': 2 }, g);
  S('path', { d: coneD, fill: '#E3C69C', stroke: PAL.line, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
  S('path', { d: `M${cone} ${-w / 2}Q${cone - 10} ${-w / 4} ${cone} 0Q${cone - 10} ${w / 4} ${cone} ${w / 2}`, fill: 'none', stroke: '#B8955F', 'stroke-width': 2 }, g);
  S('path', { d: leadD, fill: '#3A3D44', stroke: PAL.line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
  A(sh, 'd', `M0 0L${lead} ${-w * 0.14}L${cone} ${-w / 2}H${len}V${w / 2}H${cone}L${lead} ${w * 0.14}Z`);
  // lift: 0 — кончик на бумаге; тень уходит вниз-вправо с высотой
  return (x, y, ang = 32, lift = 0, o = 1) => {
    if (o <= 0) { show(g, 0); show(sh, 0); return; }
    const s = 1 + 0.06 * lift;
    A(g, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(ang)}) scale(${f2(s)})`);
    A(sh, 'transform', `translate(${f2(x + 10 + 30 * lift)} ${f2(y + 16 + 42 * lift)}) rotate(${f2(ang)}) scale(${f2(s)})`);
    show(g, o); show(sh, o * (1 - 0.65 * clamp(lift)));   // выше — тень бледнее (не читается вторым карандашом)
  };
}
