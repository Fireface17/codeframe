// Данные: оси и сетка рисуются первыми, линейный график прорисовывается (drawStroke),
// точки значений выпрыгивают ровно когда «голова» линии проходит через них, площадь под
// линией открывается клипом за головой, пик подписан. Затем смена: старое уходит, сетка
// остаётся и меняет подписи, столбики растут каскадом от оси, значения доезжают счётчиком,
// лучший столбик ×1,12, остальные гаснут до 35 %. Уход каскадом в пустой лист (петля).
// Данные выдуманные, но согласованные: сумма по месяцам = сумма по каналам = 35,4.
//
// Приёмы для повторного использования:
//   polyMeasure(pts)        — длины отрезков ломаной -> доля пути у каждой вершины;
//   pointAtFrac(M, f)       — точка на ломаной по доле длины (голова рисующейся линии);
//   easeInvert(e, y)        — обратная к easing (бисекция): когда голова достигнет вершины;
//   barD(x, base, w, h, r)  — столбик со скруглёнными только верхними углами;
//   countTo(tq(t), ...)     — счётчик по времени, защёлкнутому на кадр (цифры без смаза).

const P = { paper: '#f5f3ee', ink: '#1c1f24', ink2: '#575e68', muted: '#9198a1', grid: '#e1ddd5', accent: '#2f55e4', area: '#2f55e4' };
window.SAFE = { x0: 96, x1: 1824, y0: 54, y1: 1026 };
const SANS = 'Onest';

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];
const REV = [4.2, 5.1, 4.8, 6.3, 7.9, 7.1];                          // млн ₽, сумма 35,4
const CH = [['Сайт', 14.6], ['Приложение', 11.2], ['Партнёры', 6.1], ['Офлайн', 3.5]];   // сумма 35,4
const TOTAL = REV.reduce((a, b) => a + b, 0);
const BEST = CH.reduce((b, c, i) => (c[1] > CH[b][1] ? i : b), 0);
const PEAK = REV.indexOf(Math.max(...REV));

// раскладка графика
const CX0 = 260, CX1 = 1680, BASE = 880, TOP = 320;
const NG = 5;                                                       // 6 линий сетки: 0..NG
const MAX_L = 10, MAX_B = 20;
const yL = v => BASE - (v / MAX_L) * (BASE - TOP), yB = v => BASE - (v / MAX_B) * (BASE - TOP);
const PX = MONTHS.map((_, i) => 340 + i * (1620 - 340) / (MONTHS.length - 1));
const BX = CH.map((_, i) => 470 + i * (1500 - 470) / (CH.length - 1)), BW = 168;

// ------------------------------------------------------------------ cues (с)
const T = {};
T.title = 0.15;
T.axes = 0.3;
T.grid = 0.42;
T.months = 0.78;
T.line = 1.05;  T.lineD = 1.0;
T.peak = 0;      // после расписания точек
T.lineOut = 3.45;
T.title2 = 3.7;
T.bars = 3.85;
T.hl = 5.25;
T.out = 6.95;
T.end = 7.95;

// ------------------------------------------------------------------ helpers
function polyMeasure(pts) {
  const seg = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = seg[seg.length - 1];
  return { pts, len, frac: seg.map(s => s / len) };
}
function pointAtFrac(M, f) {
  const { pts, frac } = M;
  for (let i = 1; i < pts.length; i++) if (f <= frac[i]) {
    const u = (f - frac[i - 1]) / (frac[i] - frac[i - 1] || 1);
    return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
  }
  return pts[pts.length - 1];
}
function easeInvert(e, y) { let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (e(m) < y) lo = m; else hi = m; } return (lo + hi) / 2; }
function barD(x, base, w, h, r = 8) {
  h = Math.max(0, h); r = Math.min(r, w / 2, h);
  return `M${f2(x - w / 2)} ${f2(base)}V${f2(base - h + r)}Q${f2(x - w / 2)} ${f2(base - h)} ${f2(x - w / 2 + r)} ${f2(base - h)}H${f2(x + w / 2 - r)}Q${f2(x + w / 2)} ${f2(base - h)} ${f2(x + w / 2)} ${f2(base - h + r)}V${f2(base)}Z`;
}
const outG = (t, t0, d = 0.26) => ease.in4((t - t0) / d);
// число, «защёлкнутое» на кадр: все подкадры motion blur видят одно значение -> цифры не смазываются
const tq = t => Math.round(t * FPS) / FPS;

const LINE = polyMeasure(REV.map((v, i) => [PX[i], yL(v)]));
const PT_AT = LINE.frac.map(f => T.line + T.lineD * easeInvert(ease.inOut, f));   // когда голова в вершине
T.peak = PT_AT[PEAK] + 0.45;

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: P.paper }, svg);
const stage = S('g', {}, svg);
let L = null;
const txt = (parent, s, attrs) => { const e = S('text', { 'font-family': SANS, ...attrs }, parent); e.textContent = s; return e; };

function build() {
  // заголовки двух графиков
  const t1 = S('g', {}, stage), t2 = S('g', {}, stage);
  const head = (g, a, b) => [txt(g, a, { x: CX0, y: 168, 'font-weight': 700, 'font-size': 50, fill: P.ink }), txt(g, b, { x: CX0, y: 216, 'font-weight': 500, 'font-size': 27, fill: P.ink2 })];
  const h1 = head(t1, 'Выручка по месяцам', 'млн ₽ · январь–июнь 2026');
  const h2 = head(t2, 'Выручка по каналам', `млн ₽ · итого за полугодие ${fmtNum(TOTAL, 1)}`);

  // сетка, оси, подписи шкал
  const gridG = S('g', {}, stage);
  const grid = [...Array(NG)].map((_, k) => { const y = BASE - (k + 1) * (BASE - TOP) / NG; return drawStroke(gridG, `M${CX0} ${y}H${CX1}`, { stroke: P.grid, 'stroke-width': 2, 'stroke-linecap': 'butt' }); });
  const yAxis = drawStroke(gridG, `M${CX0} ${BASE}V${TOP - 10}`, { stroke: P.ink, 'stroke-width': 3, 'stroke-linecap': 'butt' });
  const xAxis = drawStroke(gridG, `M${CX0} ${BASE}H${CX1}`, { stroke: P.ink, 'stroke-width': 3, 'stroke-linecap': 'butt' });
  const ylab = (v, k) => txt(gridG, fmtNum(v), { x: CX0 - 22, y: BASE - k * (BASE - TOP) / NG + 9, 'text-anchor': 'end', 'font-weight': 500, 'font-size': 25, fill: P.muted });
  const zero = ylab(0, 0);
  const yA = [...Array(NG)].map((_, k) => ylab((k + 1) * MAX_L / NG, k + 1));
  const yB_ = [...Array(NG)].map((_, k) => ylab((k + 1) * MAX_B / NG, k + 1));

  // линейный график: площадь (клип за головой), линия, точки, подпись пика
  const lineG = S('g', {}, stage);
  const areaD = `M${PX[0]} ${BASE}` + LINE.pts.map(p => `L${p[0]} ${f2(p[1])}`).join('') + `L${PX[PX.length - 1]} ${BASE}Z`;
  const area = S('path', { d: areaD, fill: linGrad(defs, [[0, P.area, 0.16], [1, P.area, 0]], { x1: 0, y1: 0, x2: 0, y2: 1 }) }, lineG);
  const areaClip = clipRect(defs, area);
  const line = drawStroke(lineG, 'M' + LINE.pts.map(p => `${p[0]} ${f2(p[1])}`).join('L'), { stroke: P.accent, 'stroke-width': 6 });
  const dots = LINE.pts.map(p => { const g = S('g', {}, lineG); S('circle', { r: 14, fill: P.paper }, g); S('circle', { r: 9, fill: P.accent }, g); return { g, x: p[0], y: p[1] }; });
  const months = MONTHS.map((m, i) => txt(lineG, m, { x: PX[i], y: BASE + 46, 'text-anchor': 'middle', 'font-weight': 500, 'font-size': 27, fill: P.ink2 }));
  const peakG = S('g', {}, S('g', { transform: `translate(${LINE.pts[PEAK][0]} ${f2(LINE.pts[PEAK][1] - 8)})` }, lineG));
  const pLabel = `Пик · ${fmtNum(REV[PEAK], 1)}`, pw = textWidth(pLabel, 28, SANS, 600) + 40;
  S('path', { d: rr(-pw / 2, -86, pw, 52, 26), fill: P.ink }, peakG);
  S('path', { d: 'M-9 -35L0 -24L9 -35Z', fill: P.ink }, peakG);
  txt(peakG, pLabel, { x: 0, y: -50, 'text-anchor': 'middle', 'font-weight': 600, 'font-size': 28, fill: P.paper });

  // столбики
  const barsG = S('g', {}, stage);
  const bars = CH.map(([name, v], i) => {
    const g = S('g', {}, barsG);
    const path = S('path', { fill: P.accent }, g);
    const val = txt(g, '0', { x: BX[i], 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 36, fill: P.ink });
    const lab = txt(g, name, { x: BX[i], y: BASE + 46, 'text-anchor': 'middle', 'font-weight': 500, 'font-size': 27, fill: P.ink2 });
    return { g, path, val, lab, v, i, x: BX[i] };
  });
  L = { t1, t2, h1, h2, grid, yAxis, xAxis, zero, yA, yB_, lineG, area, areaClip, line, dots, months, peakG, barsG, bars };
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const { t1, t2, h1, h2, grid, yAxis, xAxis, zero, yA, yB_, lineG, areaClip, line, dots, months, peakG, barsG, bars } = L;
  const gEnd = outG(t, T.out + 0.25, 0.3);                         // общий уход осей и сетки

  // заголовки: первый уходит вверх, второй поднимается снизу
  const o1 = outG(t, T.lineOut + 0.08, 0.24);
  h1.forEach((e, i) => { rise(e, vis(t, T.title + i * 0.08, Infinity, SP.fade) * (1 - o1), 16); if (o1 > 0) A(e, 'transform', `translate(0 ${f2(-24 * o1)})`); });
  const o2 = outG(t, T.out + 0.3 + 0.0, 0.26);
  h2.forEach((e, i) => { rise(e, vis(t, T.title2 + i * 0.08, Infinity, SP.fade) * (1 - o2), 16); if (o2 > 0) A(e, 'transform', `translate(0 ${f2(-24 * o2)})`); });

  // оси и сетка рисуются первыми; на уходе сматываются
  xAxis.draw(prog(t, T.axes, 0.95, ease.inOut) * (1 - gEnd));
  yAxis.draw(prog(t, T.axes + 0.1, 0.45, ease.inOut) * (1 - gEnd));
  grid.forEach((g, k) => g.draw(prog(t, T.grid + k * 0.07, 0.8, ease.inOut) * (1 - outG(t, T.out + 0.1 + (NG - k) * 0.03, 0.26))));
  rise(zero, vis(t, T.grid, Infinity, SP.fade) * (1 - gEnd), 8);
  yA.forEach((e, k) => rise(e, vis(t, T.grid + 0.15 + k * 0.07, T.lineOut + k * 0.02, SP.fade, SP.out), 8));
  yB_.forEach((e, k) => rise(e, vis(t, T.bars - 0.1 + k * 0.05, Infinity, SP.fade) * (1 - outG(t, T.out + 0.15 + k * 0.02, 0.24)), 8));

  // линейный график
  const lOut = outG(t, T.lineOut + 0.05, 0.28);
  A(lineG, 'display', t < T.lineOut + 0.4 ? 'inline' : 'none');
  if (t < T.lineOut + 0.4) {
    const f = prog(t, T.line, T.lineD, ease.inOut);
    line.draw(f);
    const head = pointAtFrac(LINE, f);
    areaClip.set(PX[0], TOP - 40, (head[0] - PX[0]) * (f > 0 ? 1 : 0), BASE - TOP + 44);
    A(lineG, 'transform', `translate(0 ${f2(30 * lOut)})`); A(lineG, 'opacity', f2(1 - lOut));
    dots.forEach((d, i) => {
      const t0 = PT_AT[i] - 0.02, s = t < t0 ? 0 : lerp(0.2, 1, step(t - t0, SP.pop)) * (1 + (i === PEAK ? 0.3 * step(t - T.peak + 0.1, SP.hl) : 0));
      place(d.g, d.x, d.y, s, popO(t, t0));
    });
    months.forEach((m, i) => rise(m, vis(t, T.months + i * 0.05, Infinity, SP.fade), 12));
    popAt(peakG, 0, -24, popS(t, T.peak, SP.popS), popO(t, T.peak));
  }

  // столбики: рост каскадом, счётчик, подсветка лучшего, уход в ось
  const bOn = t > T.bars - 0.05;
  A(barsG, 'display', bOn ? 'inline' : 'none');
  if (bOn) {
    const hl = step(t - T.hl, SP.hl), dim = step(t - T.hl - 0.06, SP.dim);
    bars.forEach(b => {
      const t0 = T.bars + b.i * 0.11, gr = step(t - t0, { r: 0.6, z: 0.82 });
      const go = outG(t, T.out + b.i * 0.05, 0.26);
      const best = b.i === BEST, s = best ? 1 + 0.12 * hl : 1;
      const h = (BASE - yB(b.v)) * gr * (1 - go) * s, w = BW * s;
      A(b.path, 'd', barD(b.x, BASE - 1.5, w, h, 10));
      A(b.path, 'visibility', h > 0.5 ? 'visible' : 'hidden');
      const v = countTo(tq(t), t0 + 0.04, 0.95, 0, b.v);
      setText(b.val, fmtNum(v, 1));
      A(b.val, 'y', f2(BASE - 1.5 - h - 20));
      A(b.val, 'font-size', f2(36 * (best ? 1 + 0.18 * hl : 1)));
      show(b.val, prog(t, t0 + 0.05, 0.18, ease.out) * (1 - outG(t, T.out + b.i * 0.04, 0.16)));
      rise(b.lab, vis(t, t0 + 0.06, Infinity, SP.fade) * (1 - outG(t, T.out + 0.05 + b.i * 0.04, 0.2)), 12);
      A(b.g, 'opacity', f2(best ? 1 : 1 - 0.65 * dim));
    });
  }
}

// ------------------------------------------------------------------ звук
sfx(T.axes, 'scribble', -16); sfx(T.line, 'scribble', -14); sfx(T.peak, 'pop', -10); sfx(T.bars, 'whoosh', -15); sfx(T.hl, 'ding', -12); sfx(T.out, 'whoosh', -15);

// ------------------------------------------------------------------ boot
window.DURATION = Math.round(T.end * FPS) / FPS;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, window.DURATION));
window.READY = (async () => { await loadFonts(); build(); frame(0); return true; })();
