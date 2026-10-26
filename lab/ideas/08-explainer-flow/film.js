// Explainer в духе Excalidraw: процесс «заявка → проверка → подпись → архив».
// Приёмы: блок рисуется контуром (rrHalves + rough.js, фиксированный seed, один штрих) · подписи
// рукописным Excali раскрываются клипом, как будто пишутся · стрелка: сначала древко, потом наконечник ·
// «пакет» бежит по стрелке (точка по таблице длин дуги) · камера ведёт к активному блоку зумом через
// неподвижную точку (масштаб логарифмически) и в конце отъезжает на общий план · петля через пустую бумагу.

const P = {
  paper: '#fbfaf6', ink: '#1e1e1e', muted: '#5f646c', grid: '#d6d9df', ok: '#2f9e44',
  blue: '#afd7fb', yellow: '#fceda3', violet: '#cdc0fa', green: '#bff0c0', pink: '#f7cbca',
};
window.SAFE = { x0: 96, x1: W - 96, y0: 54, y1: H - 54 };

// ------------------------------------------------------------------ раскладка (мир = кадр общего плана)
const BW = 420, BH = 200, ZOOM = 1.6;
const BLOCKS = [
  { x: 520, y: 350, fill: P.blue, label: 'Заявка', sub: 'форма на сайте', icon: 'doc', seed: 11 },
  { x: 1400, y: 350, fill: P.yellow, label: 'Проверка', sub: 'юрист, 1 день', icon: 'lens', seed: 23 },
  { x: 1400, y: 790, fill: P.violet, label: 'Подпись', sub: 'директор, ЭП', icon: 'pen', seed: 37 },
  { x: 520, y: 790, fill: P.green, label: 'Архив', sub: 'хранится 5 лет', icon: 'box', seed: 41 },
];
// стрелки: квадратичные кривые [начало, контрольная, конец] между краями блоков
const ARROWS = [
  [[748, 342], [960, 292], [1172, 342]],
  [[1412, 466], [1468, 570], [1412, 674]],
  [[1172, 800], [960, 852], [748, 800]],
];
const TITLE = { text: 'Путь заявки', x: 960, y: 158, size: 68 };

// ------------------------------------------------------------------ cues (с)
const T = {};
const ARROW_D = 0.55, HEAD_D = 0.18, PAN_D = 1.0, HOP_D = 0.5, STEP = 1.5;
T.zin = 0.1;                        // общий план -> блок 1
T.b = [0.32];                       // старт рисования блока
T.a = []; T.pan = []; T.hop = [];
for (let k = 0; k < 3; k++) {
  T.a[k] = 1.5 + k * STEP;          // стрелка k: древко
  T.pan[k] = T.a[k] + 0.1;          // камера чуть позже стрелки: линия ведёт взгляд
  T.b[k + 1] = T.a[k] + 0.55;       // следующий блок рисуется, пока камера подъезжает
  T.hop[k] = T.a[k] + ARROW_D + HEAD_D;   // пакет выходит, когда стрелка готова
}
T.check = T.hop[2] + HOP_D + 0.05;  // галочка у архива
T.zout = T.check + 0.32;            // отъезд на общий план
T.title = T.zout + 0.45;
T.flow = T.zout + 0.35;             // пакеты бегут по всем стрелкам
T.end = 8.4;
T.out = T.end - 0.62;               // уход: к T.end − 0.18 пустая бумага = кадр 0

// ------------------------------------------------------------------ помощники (локальные)
// rough-контур одним непрерывным штрихом: rough.js начинает каждый сегмент с M —
// склеиваем их в L, чтобы drawStroke рисовал путь последовательно, а не все куски сразу
function oneStroke(d) { let first = true; return d.replace(/M/g, () => (first ? (first = false, 'M') : 'L')); }
const rough1 = (d, seed, ro = {}) => oneStroke(roughD(d, { seed, roughness: 0.9, bowing: 0.8, disableMultiStroke: true, ...ro }));
// таблица длин дуги квадратичной кривой: точка и касательная по доле длины (вместо getPointAtLength —
// то же самое, но без DOM и одинаково в любом браузере)
function qCurve([p0, c, p1], n = 160) {
  const at = u => [(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1]];
  const pts = [], len = [0];
  for (let i = 0; i <= n; i++) pts.push(at(i / n));
  for (let i = 1; i <= n; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = len[n];
  const point = f => {                       // f = доля длины 0..1
    const s = clamp(f) * L;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len[m] < s) lo = m; else hi = m; }
    const k = (s - len[lo]) / Math.max(1e-6, len[hi] - len[lo]);
    return [lerp(pts[lo][0], pts[hi][0], k), lerp(pts[lo][1], pts[hi][1], k)];
  };
  const d = `M${p0[0]} ${p0[1]}Q${c[0]} ${c[1]} ${p1[0]} ${p1[1]}`;
  return { point, L, d, end: p1, dir: [p1[0] - c[0], p1[1] - c[1]] };
}
// камера: поза { s, tx, ty } (экран = s·мир + t). Переход между позами — гомотетия с неподвижной
// точкой F = (t1 − k·t0)/(1 − k), k = s1/s0; масштаб k^u растёт логарифмически, F стоит на месте.
const camPose = (cx, cy, s) => ({ s, tx: W / 2 - s * cx, ty: H / 2 - s * cy });
function camLerp(a, b, u) {
  const k = b.s / a.s;
  if (Math.abs(Math.log(k)) < 1e-3) return { s: lerp(a.s, b.s, u), tx: lerp(a.tx, b.tx, u), ty: lerp(a.ty, b.ty, u) };
  const fx = (b.tx - k * a.tx) / (1 - k), fy = (b.ty - k * a.ty) / (1 - k), ku = Math.exp(u * Math.log(k));
  return { s: a.s * ku, tx: fx + ku * (a.tx - fx), ty: fy + ku * (a.ty - fy) };
}
// последовательность наездов: [{ t0, d, to }], сегменты не пересекаются
function camAt(t, start, segs) {
  let p = start;
  for (const g of segs) { if (t <= g.t0) break; p = camLerp(p, g.to, ease.inOut((t - g.t0) / g.d)); }
  return p;
}
// импульс 0 -> 1 -> 0 (толчок при приходе пакета)
const pulse = (t, t0, w = 0.12, sp = SP.hl) => step(t - t0, sp) - step(t - t0 - w, sp);

// иконки-каракули в локальных координатах (~80 px, центр в 0)
function circleD(cx, cy, r, n = 28) {
  let d = '';
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2; d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1); }
  return d;
}
const ICONS = {
  doc: ['M-24 -34H12L26 -20V34H-24Z', 'M12 -34V-20H26', 'M-14 -8H14', 'M-14 6H14', 'M-14 20H4'],
  lens: [circleD(-6, -6, 22), 'M10 10L30 30'],
  pen: ['M-34 10C-26 -22 -16 28 -6 -2C2 -24 10 22 20 2C24 -6 28 -4 32 0', 'M-34 30H34'],
  box: ['M-36 -30H36V-14H-36Z', 'M-30 -14V30H30V-14', 'M-10 2H10'],
};

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: P.paper }, svg);
const cam = S('g', {}, svg);
{ // точечная сетка живёт в мире: при движении камеры видно, что камера движется
  const pat = S('pattern', { id: 'dots', width: 36, height: 36, patternUnits: 'userSpaceOnUse' }, defs);
  S('circle', { cx: 18, cy: 18, r: 1.8, fill: P.grid }, pat);
  S('rect', { x: -1200, y: -1200, width: W + 2400, height: H + 2400, fill: 'url(#dots)' }, cam);
}
const curves = ARROWS.map(a => qCurve(a));
let B = null;   // всё, что зависит от ширины текста, — после loadFonts()

function build() {
  const arrowsG = S('g', {}, cam), blocksG = S('g', {}, cam), packG = S('g', {}, cam), titleG = S('g', {}, cam);
  // стрелки: древко + наконечник (два штриха от острия)
  const arrows = curves.map((c, k) => {
    const g = S('g', {}, arrowsG);
    const shaft = drawStroke(g, rough1(c.d, 101 + k), { stroke: P.ink, 'stroke-width': 3.2 });
    const n = Math.hypot(...c.dir), ux = c.dir[0] / n, uy = c.dir[1] / n, [ex, ey] = c.end, hl = 24;
    const wing = sgn => [ex - hl * (ux * Math.cos(0.5) - sgn * uy * Math.sin(0.5)), ey - hl * (uy * Math.cos(0.5) + sgn * ux * Math.sin(0.5))];
    const [a1, a2] = [wing(1), wing(-1)];
    const head = drawStroke(g, rough1(`M${a1[0]} ${a1[1]}L${ex} ${ey}L${a2[0]} ${a2[1]}`, 131 + k, { roughness: 0.6 }), { stroke: P.ink, 'stroke-width': 3.2 });
    return { g, shaft, head };
  });
  // блоки
  const blocks = BLOCKS.map((b, i) => {
    const g = S('g', {}, blocksG), x = b.x - BW / 2, y = b.y - BH / 2;
    const fill = S('path', { d: rr(x + 4, y + 4, BW - 8, BH - 8, 22), fill: b.fill }, g);
    const outline = rrHalves(x, y, BW, BH, 24).map((d, h) => drawStroke(g, rough1(d, b.seed + h), { stroke: P.ink, 'stroke-width': 3.4 }));
    const ig = S('g', { transform: `translate(${b.x - 128} ${b.y})` }, g);
    const icon = ICONS[b.icon].map((d, j) => drawStroke(ig, rough1(d, b.seed * 3 + j, { roughness: 0.7 }), { stroke: P.ink, 'stroke-width': 3 }));
    const lx = b.x - 70, maxW = b.x + BW / 2 - 26 - lx;
    const size = Math.min(56, 56 * maxW / textWidth(b.label, 56, 'Excali', 400));
    const label = S('text', { x: lx, y: b.y + 4, 'font-family': 'Excali', 'font-size': size.toFixed(1), fill: P.ink }, g);
    label.textContent = b.label;
    const sub = S('text', { x: lx, y: b.y + 50, 'font-family': 'Excali', 'font-size': 30, fill: P.muted }, g);
    sub.textContent = b.sub;
    const lw = textWidth(b.label, size, 'Excali', 400), sw = textWidth(b.sub, 30, 'Excali', 400);
    const lclip = clipRect(defs, label), sclip = clipRect(defs, sub);
    return { ...b, g, fill, outline, icon, label, sub, lclip, sclip, lx, lw, sw, size };
  });
  // галочка «готово» у архива
  const b4 = BLOCKS[3];
  const check = drawStroke(blocksG, rough1(`M${b4.x + 150} ${b4.y - 132}L${b4.x + 178} ${b4.y - 100}L${b4.x + 236} ${b4.y - 176}`, 77, { roughness: 0.5 }), { stroke: P.ok, 'stroke-width': 9 });
  // пакеты: прыжки по одному (на крупных планах) и поток (на общем)
  const mkDot = () => { const g = S('g', {}, packG); S('circle', { r: 13, fill: P.pink, stroke: P.ink, 'stroke-width': 3 }, g); return g; };
  const hops = curves.map(() => mkDot());
  const NF = 3, flow = curves.map(() => Array.from({ length: NF }, mkDot));
  // заголовок общего плана
  const title = S('text', { x: TITLE.x, y: TITLE.y, 'text-anchor': 'middle', 'font-family': 'Excali', 'font-size': TITLE.size, fill: P.ink }, titleG);
  title.textContent = TITLE.text;
  const tw = textWidth(TITLE.text, TITLE.size, 'Excali', 400), tclip = clipRect(defs, title);
  const under = drawStroke(titleG, rough1(`M${TITLE.x - tw / 2 - 6} ${TITLE.y + 22}C${TITLE.x - 60} ${TITLE.y + 30} ${TITLE.x + 80} ${TITLE.y + 14} ${TITLE.x + tw / 2 + 12} ${TITLE.y + 24}`, 91), { stroke: P.ok, 'stroke-width': 6 });
  B = { arrows, blocks, check, hops, flow, NF, title, titleG, tw, tclip, under, arrowsG, packG };
}

const WIDE = camPose(960, 525, 1.12);   // общий план чуть крупнее кадра: схема заполняет безопасную зону
const SHOT = BLOCKS.map(b => camPose(b.x, b.y, ZOOM));
const CAM = [{ t0: T.zin, d: PAN_D, to: SHOT[0] }, ...[0, 1, 2].map(k => ({ t0: T.pan[k], d: PAN_D, to: SHOT[k + 1] })), { t0: T.zout, d: 1.05, to: WIDE }];

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const c = camAt(t, WIDE, CAM);
  A(cam, 'transform', `matrix(${f2(c.s)} 0 0 ${f2(c.s)} ${f2(c.tx)} ${f2(c.ty)})`);
  const outK = k => ease.in4((t - T.out - k * 0.04) / 0.28);   // уход каскадом, power4.in

  // блоки: контур -> заливка -> иконка -> подпись (клип слева направо = «пишется») -> толчок при приходе пакета
  B.blocks.forEach((b, i) => {
    const t0 = T.b[i];
    b.outline.forEach(o => o.draw(prog(t, t0, 0.5)));
    show(b.fill, after(t, t0 + 0.3, SP.fade));
    const ni = b.icon.length;
    b.icon.forEach((o, j) => o.draw(prog(t, t0 + 0.35 + j * 0.4 / ni, 0.4 / ni + 0.05)));
    b.lclip.set(b.lx - 10, b.y - 70, (b.lw + 20) * prog(t, t0 + 0.4, 0.32, ease.inOut), 100);
    b.sclip.set(b.lx - 10, b.y + 20, (b.sw + 20) * prog(t, t0 + 0.55, 0.3, ease.inOut), 50);
    const bump = i > 0 ? pulse(t, T.hop[i - 1] + HOP_D) : 0, o = outK(i + 1);
    popAt(b.g, b.x, b.y, (1 + 0.06 * bump) * (1 - 0.4 * o), 1 - o);
  });
  B.check.draw(prog(t, T.check, 0.3, ease.out));
  A(B.check, 'opacity', f2(1 - outK(4)));

  // стрелки: древко ease.inOut, наконечник ease.out после древка
  B.arrows.forEach((a, k) => {
    a.shaft.draw(prog(t, T.a[k], ARROW_D));
    a.head.draw(prog(t, T.a[k] + ARROW_D, HEAD_D, ease.out));
    show(a.g, 1 - outK(k + 1.5));
  });

  // пакет-прыжок: появляется у начала стрелки, едет, ныряет в блок
  B.hops.forEach((g, k) => {
    const t0 = T.hop[k], u = prog(t, t0, HOP_D);
    const [x, y] = curves[k].point(u * 0.93);
    const s = t < t0 ? 0 : lerp(0.35, 1, step(t - t0, SP.pop)) * (1 - prog(t, t0 + HOP_D - 0.06, 0.14, ease.in4));
    place(g, x, y, s, s > 0.01 ? 1 : 0);
  });
  // поток на общем плане: у каждой стрелки 3 пакета со сдвигом фаз, первый выход строго из начала
  const per = 1.25, env = 1 - prog(t, T.out - 0.05, 0.25, ease.in4);
  B.flow.forEach((dots, k) => dots.forEach((g, j) => {
    const ts = T.flow + k * 0.12 + j * per / B.NF;
    if (t < ts) { place(g, 0, 0, 0, 0); return; }
    const ph = ((t - ts) / per) % 1, [x, y] = curves[k].point(ease.sine(ph) * 0.93);
    const s = Math.min(1, ph / 0.12, (1 - ph) / 0.12) * env;
    place(g, x, y, 0.8 * s, s > 0.01 ? 1 : 0);
  }));

  // заголовок общего плана: пишется клипом, подчёркивание рисуется
  B.tclip.set(TITLE.x - B.tw / 2 - 12, TITLE.y - 80, (B.tw + 24) * prog(t, T.title, 0.5, ease.inOut), 120);
  B.under.draw(prog(t, T.title + 0.42, 0.35));
  const ot = outK(0);
  popAt(B.titleG, TITLE.x, TITLE.y - 20, 1 - 0.4 * ot, 1 - ot);
}

// ------------------------------------------------------------------ звук
sfx(T.b[0], 'scribble', -11);
T.hop.forEach(h => sfx(h + HOP_D - 0.03, 'pop', -10));
sfx(T.check, 'ding', -10);
sfx(T.zout, 'whoosh', -13);
sfx(T.title, 'scribble', -12);
sfx(T.out, 'whoosh', -14);

// ------------------------------------------------------------------ boot
window.DURATION = Math.round(T.end * FPS) / FPS;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, window.DURATION));
window.READY = (async () => { await loadFonts(); build(); frame(0); return true; })();
