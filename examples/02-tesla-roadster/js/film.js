// film.js — ролик №2 «Tesla Roadster: разбор трюков» (канал «Код и кадр», рубрика «За минуту»).
// Три трюка с показа 2026-10-15 восстановлены в 2D своей перерисовкой (не кадры Tesla): трюк в движении →
// стоп или замедление → наезд, рентген и физика поверх → трюк продолжается. Кадр — чистая функция t;
// все cues — от слов голоса (window.WORDS из script.json через tools/timing.mjs).
// Стадии: SIDE — вид сбоку, мир поворачивается (рампа-арка, срыв с кромки); FRONT — вид спереди
// (крен — поворот в плоскости кадра: полубочка при срыве, кувырок над рядом машин); GAS — бок на земле, рентген баллонов.
// Хореография — refs/research/tesla-roadster-motion.md; факты — content/scripts/2026-10-22-tesla-roadster-razbor.md.

const P = { bg: '#0E1016', bg2: '#1A1F2A', panel: '#161A23', line: '#2A3141', ink: '#F4F0E6', mute: '#8C93A3', hot: '#FFC83D', road: '#191D26', roadHi: '#4A505E', jet: '#CFE6F0' };
window.SAFE = { x0: 120, x1: 888, y0: 250, y1: 1450, xLow: 780, yLow: 840 };

// ------------------------------------------------------------------ cues (от слов)
const T = {};
const ph = i => phrase(i);
T.h1 = 0.1; T.chpok = 0.3;
T.kak = pw(1, 'как').start - 0.06;
T.s2 = ph(2).start - 0.1;
T.card1 = pw(2, 'три').start - 0.06; T.card2 = pw(2, 'трюка').start - 0.06; T.card3 = T.card2 + 0.16;
T.third = pw(2, 'третий').start - 0.06;
T.mad = pw(2, 'безумный').start - 0.04;          // вспышка-тизер третьего трюка
T.teaseEnd = T.mad + 0.5;
T.s3 = ph(3).start - 0.1;
T.scan = ph(3).start + 0.02;
T.fans = pw(3, 'вентиляторы').start - 0.08;
T.air = pw(3, 'воздух').start - 0.06;
T.skirt = pw(3, 'юбки').start - 0.05;
T.back = pw(3, 'обратно').start - 0.1;
T.s4 = ph(4).start - 0.1;
T.press = pw(4, 'давит').start - 0.08;
T.ten = pw(4, 'десяти').start - 0.1;
T.s5 = ph(5).start - 0.1;
T.s6 = ph(6).start - 0.1;
T.surf = pw(6, 'поверхности').start - 0.2;           // заголовок «К ПОВЕРХНОСТИ, А НЕ ВНИЗ» сменяет субтитр
T.down = pw(6, 'вниз').start - 0.1;
T.s7 = ph(7).start - 0.1;
T.five = pw(7, 'пяти').start - 0.1;
T.three = pw(7, 'два-три').start - 0.1;
T.s8 = ph(8).start - 0.12;
T.edge = pw(8, 'воздухе').start - 0.05;
T.freeze = pw(8, 'чему').start;
T.s9 = ph(9).start - 0.16;
T.spin = pw(9, 'сначала').start - 0.06;
T.brake = pw(9, 'потом').start - 0.06;
T.land1 = Math.max(ph(9).end + 0.1, T.brake + 1.0);
T.s10 = ph(10).start - 0.16;
T.toss = pw(10, 'подбросить').start - 0.08;
T.spinW = pw(10, 'закрутить').start - 0.06;          // струи по фазам: подбросить → закрутить → поймать
T.catchW = pw(10, 'поймать').start - 0.06;
T.landA = T.catchW + 0.42;                              // касание в реальном времени (сжато)
T.s11 = ph(11).start - 0.08;
T.up8 = pw(11, 'восьми').start - 0.1;
T.s12 = ph(12).start - 0.16;
T.rB0 = ph(11).start + 0.08;                            // повтор кувырка: отрыв
T.landB = T.s12 + 0.05;
T.rc = Math.ceil((ph(11).start + 0.02) * FPS) / FPS;           // кат на повтор — по границе кадра                                 // повтор: касание (пыль и ударная волна на «Откуда сила?»)
T.gasCut = T.s12 + 0.55;                                // переход к баллонам
T.gasT = pw(12, 'газ').start - 0.08;
T.ball = pw(12, 'шарика').start - 0.2;
T.s13 = ph(13).start - 0.1;
T.secs = pw(13, 'секунды').start - 0.1;
T.hops = pw(13, 'прыжками').start - 0.35;
T.s14 = ph(14).start - 0.1;
T.cta2 = pw(14, 'ждал').start - 0.1;
T.logo = ph(14).end + 0.05;
T.end = window.WORDS.duration + 1.25;
T.clear = T.end - 0.45;
const DURATION = Math.round(T.end * FPS) / FPS;
const SIDE_ON = t => t < T.s9 || t >= T.gasCut;                      // какая стадия на экране (вне тизера)
const TEASE = t => t >= T.mad && t < T.teaseEnd;

// ------------------------------------------------------------------ матрицы и общие помощники
const Mx = {
  mul: (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]],
  T: (x, y) => [1, 0, 0, 1, x, y], S: (sx, sy = sx) => [sx, 0, 0, sy, 0, 0],
  R: deg => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, 0, 0]; },
  ap: (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]],
  str: m => `matrix(${m.map(v => f2(v)).join(' ')})`,
};
const chain = (...ms) => ms.reduce((a, b) => Mx.mul(a, b));
const CX = 504;                                                   // центр текстовых блоков (правый край ≤ 888)
function label(parent, str, x, y, size, o = {}) {
  const e = S('text', { x, y, 'font-family': o.font || FONT.head, 'font-weight': o.weight || 900, 'font-size': size, fill: o.fill || P.ink, 'text-anchor': o.anchor || 'start', 'letter-spacing': o.ls || 0, ...(o.attrs || {}) }, parent);
  e.textContent = str; return e;
}
const monoL = (parent, str, x, y, size, fill = P.mute, anchor = 'start') => label(parent, str, x, y, size, { font: FONT.mono, weight: 700, fill, anchor, ls: 1 });
const popIn = (g, t, t0, t1, cx, cy, dy = 26) => { const a = t < t0 ? 0 : step(t - t0, SP.pop), o = vis(t, t0, t1, SP.fade, SP.out); popAt(g, cx, cy, lerp(0.85, 1, a), o, (1 - a) * dy); return o; };
// стрелка силы: толстый ствол + наконечник; set(x0,y0,x1,y1,o)
function forceArrow(parent, color, w = 12) {
  const g = S('g', {}, parent), ln = S('path', { d: '', fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' }, g), hd = S('path', { d: '', fill: color }, g);
  g.set = (x0, y0, x1, y1, o = 1) => {
    const L = Math.hypot(x1 - x0, y1 - y0); show(g, L > 2 ? o : 0); if (L <= 2) return;
    const ux = (x1 - x0) / L, uy = (y1 - y0) / L, hl = Math.min(L * 0.45, w * 2.6), hw = w * 1.5, bx = x1 - ux * hl, by = y1 - uy * hl;
    A(ln, 'd', `M${f2(x0)} ${f2(y0)}L${f2(bx)} ${f2(by)}`);
    A(hd, 'd', `M${f2(x1)} ${f2(y1)}L${f2(bx - uy * hw)} ${f2(by + ux * hw)}L${f2(bx + uy * hw)} ${f2(by - ux * hw)}Z`);
  };
  return g;
}

// ------------------------------------------------------------------ build: фон и параллакс (экран)
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: P.bg }, svg);
S('ellipse', { cx: 540, cy: 760, rx: 820, ry: 780, fill: radGrad(defs, [[0, P.bg2, 1], [0.6, '#131720', 0.7], [1, P.bg, 0]]) }, svg);
// дальний план: прожекторы полигона (конусы света) и пылинки — двигаются медленнее мира (параллакс)
const farG = S('g', {}, svg);
const beamGrad = linGrad(defs, [[0, '#FFF3D6', 0.22], [0.5, '#FFF3D6', 0.06], [1, '#FFF3D6', 0]], { x1: 0.5, y1: 0, x2: 0.5, y2: 1 });
const BEAMS = [[-60, -40, 18], [1140, -40, -20], [300, -80, 6]].map(([x, y, a], k) => {
  const g = S('g', {}, farG);
  S('path', { d: 'M-26 0 L26 0 L240 1500 L-240 1500 Z', fill: beamGrad }, g);
  S('circle', { cx: 0, cy: 0, r: 18, fill: '#FFF7E8', opacity: 0.9 }, g);
  S('circle', { cx: 0, cy: 0, r: 46, fill: radGrad(defs, [[0, '#FFF3D6', 0.6], [1, '#FFF3D6', 0]]) }, g);
  return { g, x, y, a, k };
});
const MOTES = Array.from({ length: 60 }, (_, i) => ({ el: S('circle', { r: 1.2 + 1.8 * hash01(i, 41), fill: '#E9E3D3', opacity: 0.12 + 0.22 * hash01(i, 43) }, farG), x: hash01(i, 45) * 1200 - 60, y: hash01(i, 47) * 2000 - 40, sp: 6 + 18 * hash01(i, 49), ph: hash01(i, 51) * 6.28 }));
// дальние силуэты конструкций полигона (внизу), плоские
const skyline = S('path', { d: 'M-40 1720 L-40 1560 L60 1560 L60 1500 L120 1500 L120 1580 L240 1580 L240 1470 L262 1470 L262 1580 L420 1580 L420 1540 L560 1540 L560 1600 L700 1600 L700 1450 L716 1450 L716 1600 L880 1600 L880 1520 L1000 1520 L1000 1580 L1120 1580 L1120 1720 Z', fill: '#11141B' }, farG);

// ================================================================== SIDE: мир сбоку (рампа-арка поворачивается)
const sideG = S('g', {}, svg);
const shakeG = S('g', {}, sideG);
const world = S('g', {}, shakeG);
const GY = 900, PX = 540, PY = 785, CS = 0.9, CAR_X = 540 + 500 * CS, LIP = 1130;   // кромка рампы в мире
const CAR_TOP = (() => {
  const pts = [...SIDE.hood, ...SIDE.roof.slice(1)].map(([x, y]) => [CAR_X - CS * x, GY + CS * y]).sort((a, b) => a[0] - b[0]);
  return x => { if (x <= pts[0][0] || x >= pts[pts.length - 1][0]) return GY; for (let i = 0; i < pts.length - 1; i++) if (x >= pts[i][0] && x <= pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0])); return GY; };
})();
// воздух точками
const airG = S('g', {}, world);
const DOTS = [];
for (let gx = -330, i = 0; gx <= 1410; gx += 58) for (let gy = PY - 1180; gy <= PY + 1180; gy += 58, i++) {
  const x = gx + (hash01(i, 3) - 0.5) * 34, y = gy + (hash01(i, 7) - 0.5) * 34;
  const inCar = x > CAR_X - CS * 1003 - 6 && x < CAR_X + 6 && y > CAR_TOP(x) - 8 && y < GY + 6;
  if (inCar || (y > GY - 4 && y < GY + 70)) continue;
  DOTS.push({ el: S('circle', { cx: f2(x), cy: f2(y), r: 2.6, fill: P.mute }, airG), x, y, d: Math.hypot(x - 540, y - (GY - 110)), ph: hash01(i, 11) * 6.28 });
}
// стрелки давления (в мире — сверху на кузов; после поворота — к арке)
const pushG = S('g', {}, world);
const PUSH = [190, 320, 450, 580, 710, 840].map((x, k) => {
  const yEnd = CAR_TOP(x) - 20, d = arrowD(x, yEnd - 72, x, yEnd, { head: 22 }), g = S('g', {}, pushG);
  S('path', { d: d.line, fill: 'none', stroke: P.hot, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
  S('path', { d: d.head, fill: 'none', stroke: P.hot, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  return { g, k };
});
// вся рампа «C» до земли (≈20 м): видна, когда в хуке камера отъезжает. Строится в осях кадра хука (мир повёрнут на 170°)
// и переводится в мир обратным поворотом. 1 м ≈ 206 ед. (машина 4,36 м = 900 ед.); профиль — по разбору записи: дуга R ≈ 9 м, потолок, обрыв.
const M1 = 900 / 4.36, TH0 = 170;
const rotP = (q, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), dx = q[0] - PX, dy = q[1] - PY; return [PX + c * dx - sn * dy, PY + sn * dx + c * dy]; };
const toW = q => rotP(q, -TH0), toS = q => rotP(q, TH0);
const RAMPX = (() => {
  const k = 1 / 1150, arch = []; for (let x = LIP; x >= -420; x -= 23) arch.push(toS([x, roadY(x, k)]));
  const E = arch[arch.length - 1], E2 = arch[arch.length - 2], dl = Math.hypot(E[0] - E2[0], E[1] - E2[1]), d = [(E[0] - E2[0]) / dl, (E[1] - E2[1]) / dl];
  const CEIL = toS([540, GY])[1], GND = CEIL + 20 * M1, R2 = 9 * M1, xW = E[0] + 640, Wp = [xW, GND - R2], Bp = [xW - R2, GND];
  const bz = (a, b, c, e, n) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * e[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * e[1]]; });
  const L1 = Math.hypot(Wp[0] - E[0], Wp[1] - E[1]) * 0.45;
  const C = [...bz(E, [E[0] + d[0] * L1, E[1] + d[1] * L1], [Wp[0], Wp[1] - L1], Wp, 24), ...bz(Wp, [Wp[0], Wp[1] + R2 * 0.552], [Bp[0] + R2 * 0.552, Bp[1]], Bp, 24).slice(1)];
  const off = (pts, o) => pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [q[0] + (b[1] - a[1]) / l * o, q[1] - (b[0] - a[0]) / l * o]; });
  const ceilY = x => { for (let i = 0; i < arch.length - 1; i++) { const a = arch[i], b = arch[i + 1]; if ((x - a[0]) * (x - b[0]) <= 0) return lerp(a[1], b[1], (x - a[0]) / ((b[0] - a[0]) || 1)); } return CEIL; };
  return { arch, C, Cb: off(C, 64), Ct: off(C, 330), CEIL, GND, Bp, Wp, E, ceilY };
})();
const rampXG = S('g', {}, world);
{
  const W_ = pts => pts.map(toW), pD = pts => 'M' + W_(pts).map(cf).join('L');
  const { C, Cb, Ct, GND, Bp } = RAMPX;
  S('path', { d: polyD(W_([[-12000, GND], [12000, GND], [12000, GND + 9000], [-12000, GND + 9000]])), fill: '#12151C' }, rampXG);
  S('path', { d: pD([[-12000, GND], [12000, GND]]), stroke: P.roadHi, 'stroke-width': 10 }, rampXG);
  S('path', { d: polyD(W_([[Bp[0] - 9 * M1, GND], [Bp[0] + 40, GND], [Bp[0] + 40, GND + 46], [Bp[0] - 9 * M1, GND + 46]])), fill: '#2B303B' }, rampXG);
  let tr = '';
  for (let i = 0; i < C.length - 2; i += 2) tr += `M${cf(toW(Cb[i]))}L${cf(toW(Ct[i + 2]))}M${cf(toW(Ct[i + 2]))}L${cf(toW(Cb[i + 2]))}`;
  tr += 'M' + Ct.map(q => cf(toW(q))).join('L');
  [0.1, 0.24, 0.38].forEach(f => { const q = Ct[Math.round(f * (C.length - 1))]; tr += `M${cf(toW(q))}L${cf(toW([q[0], GND]))}`; });
  S('path', { d: tr, fill: 'none', stroke: '#2C323E', 'stroke-width': 9 }, rampXG);
  S('path', { d: polyD([...W_(C), ...W_(Cb).reverse()]), fill: P.road }, rampXG);
  S('path', { d: pD(C), fill: 'none', stroke: P.roadHi, 'stroke-width': 7 }, rampXG);
  S('path', { d: pD(Cb), fill: 'none', stroke: P.hot, 'stroke-width': 9 }, rampXG);
  // люди и машины внизу — масштаб высоты
  const up = (x, el) => A(el, 'transform', `translate(${cf(toW([x, GND]))}) rotate(${-TH0}) scale(${f2(M1 / 100)})`);
  [[-60, 'stand'], [120, 'point'], [260, 'stand'], [470, 'stand']].forEach(([x, pose]) => up(x, makePerson(rampXG, defs, { pose }).g));
  [[-760, 'sedan'], [-1380, 'crossover']].forEach(([x, kind]) => up(x, makeVehicle(rampXG, defs, kind, { tone: 0.95, stroke: 12 }).g));
}
// рампа: полоса, кромка, светодиодная нить, ферма с обратной стороны; обрыв на LIP
const roadG = S('g', {}, world);
const truss = S('path', { d: '', fill: 'none', stroke: '#2C323E', 'stroke-width': 3 }, roadG);
const roadBand = S('path', { d: '', fill: P.road }, roadG);
const roadEdge = S('path', { d: '', fill: 'none', stroke: P.roadHi, 'stroke-width': 3 }, roadG);
const roadDash = S('path', { d: '', fill: 'none', stroke: '#6A7080', 'stroke-width': 3, 'stroke-dasharray': '24 54.98', 'stroke-linecap': 'round' }, roadG);
const roadGlow = S('path', { d: '', fill: 'none', stroke: P.hot, 'stroke-width': 16, opacity: 0.12 }, roadG);
const roadLed = S('path', { d: '', fill: 'none', stroke: P.hot, 'stroke-width': 4 }, roadG);
const lipCap = S('path', { d: '', fill: 'none', stroke: P.hot, 'stroke-width': 4 }, roadG);
const dustG = S('g', {}, world);
const DUST = [0, 1, 2, 3, 4, 5].map(() => S('ellipse', { cx: 0, cy: GY, rx: 1, ry: 1, fill: P.ink, opacity: 0 }, dustG));
const jShadow = S('ellipse', { cx: 540, cy: GY + 3, rx: 360, ry: 16, fill: radGrad(defs, [[0, '#000', 0.9], [0.6, '#000', 0.45], [1, '#000', 0]]), opacity: 0 }, world);
// машина сбоку
const carPose = S('g', {}, world);
const carPlace = S('g', { transform: Mx.str(chain(Mx.T(CAR_X, GY), Mx.S(-CS, CS))) }, carPose);
const car = makeCarSide(carPlace, defs, { id: 'hero' });
const partG = S('g', {}, carPlace);
const FLOW = [[300, -9], [858, -9], [922, -38], [952, -74], [1010, -82], [1130, -88]];
const FLOWL = (() => { const L = [0]; for (let i = 1; i < FLOW.length; i++) L.push(L[i - 1] + Math.hypot(FLOW[i][0] - FLOW[i - 1][0], FLOW[i][1] - FLOW[i - 1][1])); return L; })();
const flowAt = u => { const s = u * FLOWL[FLOWL.length - 1]; for (let i = 1; i < FLOW.length; i++) if (s <= FLOWL[i]) { const k = (s - FLOWL[i - 1]) / (FLOWL[i] - FLOWL[i - 1]); return [lerp(FLOW[i - 1][0], FLOW[i][0], k), lerp(FLOW[i - 1][1], FLOW[i][1], k)]; } return FLOW[FLOW.length - 1]; };
const PARTS = Array.from({ length: 26 }, (_, i) => ({ el: S('circle', { r: 6.5, fill: i % 3 ? P.ink : P.hot }, partG), ph: hash01(i, 21), sp: 0.42 + 0.2 * hash01(i, 23) }));
const lowZone = S('rect', { x: 296, y: -21, width: 468, height: 21, fill: P.hot, opacity: 0 }, carPlace);
const chpokRing = S('ellipse', { cx: 520, cy: 0, rx: 10, ry: 4, fill: 'none', stroke: P.hot, 'stroke-width': 6, opacity: 0 }, carPlace);
const bounceG = S('g', {}, carPlace);
const BOUNCE = [360, 470, 580, 690].map((x, k) => { const g = S('g', {}, bounceG); S('path', { d: 'M0 34 L0 8 M-9 18 L0 8 L9 18', fill: 'none', stroke: P.ink, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g); return { g, x, k }; });

const speedG = S('g', {}, sideG);
const SPEED = Array.from({ length: 14 }, (_, i) => ({ el: S('rect', { x: 0, y: 0, width: 0, height: 2 + 3 * hash01(i, 71), rx: 2, fill: P.ink, opacity: 0 }, speedG), y: 260 + 1100 * hash01(i, 73), ph: hash01(i, 75) }));

// ================================================================== FRONT: вид спереди (крен в плоскости кадра)
// Мир спереди: ряд из пяти машин стоит поперёк кадра на земле FGY (FKM px на метр в плоскости ряда), горизонт FHZ (камера ≈3 м
// над землёй). Roadster взлетает из-за тягача, кувыркается над ним и садится перед рядом — ближе к камере, поэтому крупнее.
// Ряд поставлен поперёк кадра ради читаемости (на показе машины стояли вдоль траектории): это схема, не план площадки.
const frontG = S('g', { display: 'none' }, svg);
const fShake = S('g', {}, frontG);
const FGY = 1290, FHZ = 1100, FKM = 30, FS = FKM / (444.6 / 1.94), FX = 476;   // FX — за кабиной тягача   // земля ряда, горизонт, px/м, масштаб машины в плоскости ряда
const fGround = S('g', {}, fShake);
S('rect', { x: -4000, y: FHZ, width: 9000, height: 3000, fill: linGrad(defs, [[0, '#0C0F14', 0], [0.025, '#0F1218', 0.85], [0.06, '#12151C', 1], [0.25, '#151922', 1], [1, '#1A1E27', 1]], { x1: 0, y1: 0, x2: 0, y2: 1 }) }, fGround);

const fPad = S('g', {}, fGround);                                 // низкая площадка ряда с LED-кромкой
S('rect', { x: 36, y: FGY - 3, width: 1008, height: 9, rx: 3, fill: '#1D222C' }, fPad);
S('path', { d: `M36 ${FGY + 6}H1044`, stroke: P.hot, 'stroke-width': 1.6, opacity: 0.55, 'vector-effect': 'non-scaling-stroke' }, fPad);
const fSmokeB = S('g', {}, fShake);                               // дым взлёта — за рядом
const fShock = S('ellipse', { cx: 540, cy: FGY, rx: 1, ry: 1, fill: radGrad(defs, [[0, '#E8EDF2', 0], [0.7, '#E8EDF2', 0.08], [0.93, '#E8EDF2', 0.42], [1, '#E8EDF2', 0]]), opacity: 0 }, fShake);
const fShadow = S('ellipse', { cx: 540, cy: FGY, rx: 30, ry: 4, fill: radGrad(defs, [[0, '#000', 0.85], [1, '#000', 0]]), opacity: 0.8 }, fShake);
const fPose = S('g', {}, fShake);
const front = makeCarFront(fPose, defs, { id: 'front' });
const fSmokeF = S('g', {}, fShake);                               // пыль посадки — перед машиной
const fCapBand = S('rect', { x: 0, y: 1290, width: W, height: 630, fill: linGrad(defs, [[0, P.bg, 0], [0.2, P.bg, 0.78], [1, P.bg, 0.9]], { x1: 0, y1: 0, x2: 0, y2: 1 }) }, frontG);
const SMOKE = Array.from({ length: 18 }, (_, i) => ({ el: S('circle', { cx: 0, cy: 0, r: 1, fill: radGrad(defs, [[0, '#CFC7BC', 0.6], [1, '#9C948A', 0]]), opacity: 0 }, i < 8 ? fSmokeB : fSmokeF), back: i < 8, k: (i < 8 ? i : i - 8) / (i < 8 ? 8 : 10) }));
// ряд: робот-такси, пикап, тягач (в центре), кроссовер, седан — без марок; кромки не толстеют при наезде камеры
const rowG = S('g', { transform: `translate(540 ${FGY}) scale(${FKM / 100})` }, fShake);
const ROWV = makeRow(rowG, defs, { gap: 120 });
rowG.querySelectorAll('[stroke-width]').forEach(e => { const w = +e.getAttribute('stroke-width'); if (w > 0 && w <= 10) { e.setAttribute('vector-effect', 'non-scaling-stroke'); e.setAttribute('stroke-width', f2(clamp(w * FKM / 100, 0.8, 1.8))); } });
// масштаб: линейка 0–10 м под рядом и высота тягача
const rowScale = S('g', {}, fShake);
{
  const semi = ROWV.items.find(o => o.kind === 'semi'), sx = 540 + (semi.x - semi.len / 2) * FKM / 100 - 12, st = { stroke: P.mute, 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke', fill: 'none' };
  S('path', { d: `M${f2(sx)} ${FGY}V${FGY - 4 * FKM}M${f2(sx - 6)} ${FGY}H${f2(sx + 6)}M${f2(sx - 6)} ${FGY - 4 * FKM}H${f2(sx + 6)}`, ...st, stroke: P.hot }, rowScale);
  monoL(rowScale, '4 М', sx - 10, FGY - 2 * FKM + 9, 26, P.hot, 'end');
  const x0 = 205, y0 = FGY + 22;
  S('path', { d: `M${x0} ${y0}H${x0 + 10 * FKM}` + [0, 5, 10].map(m => `M${x0 + m * FKM} ${y0 - 7}V${y0 + 7}`).join('') + [1, 2, 3, 4, 6, 7, 8, 9].map(m => `M${x0 + m * FKM} ${y0 - 3}V${y0 + 3}`).join(''), ...st }, rowScale);
  [[0, '0'], [5, '5'], [10, '10 М']].forEach(([m, str]) => monoL(rowScale, str, x0 + m * FKM, y0 + 26, 22, P.mute, 'middle'));
}

// ================================================================== UI (экранные тексты)
const ui = S('g', {}, svg);
const capsLayer = S('g', {}, svg);
const flash = S('rect', { width: W, height: H, fill: '#FFFFFF', opacity: 0 }, svg);
const whipG = S('g', {}, svg);
const WHIP = Array.from({ length: 7 }, (_, i) => S('rect', { x: 0, y: 300 + i * 200 + 60 * hash01(i, 61), width: 0, height: 2 + 2 * hash01(i, 63), rx: 2, fill: P.ink, opacity: 0 }, whipG));
let SCHEMA, HOOK, CARDS, TAGL, S3L, S4G, S5G, S6G, S7G, S8G, S9G, S11G, S12G, S13G, S14G, LOGO;

function buildUI() {
  // --- хук: «МАГНИТ? КЛЕЙ?» крупно, замер мелко
  HOOK = S('g', {}, ui);
  HOOK.q = headline(HOOK, 'МАГНИТ?  КЛЕЙ?', { x: CX, y: 420, size: fitSize('МАГНИТ?  КЛЕЙ?', 720, 108), fill: P.ink, outline: P.bg, stagger: 0.02 });
  HOOK.strike = drawStroke(HOOK, `M${CX - 330} 386 L${CX + 330} 392`, { stroke: P.hot, 'stroke-width': 10 });
  HOOK.note = S('g', {}, HOOK);
  [['≈10 С ВВЕРХ КОЛЁСАМИ', CX - 150], ['ВЫСОТА ≈20 М', CX + 205]].forEach(([str, x]) => { const w = textWidth(str, 30, FONT.mono, 700, 1) + 36; S('rect', { x: x - w / 2, y: 462, width: w, height: 50, rx: 25, fill: P.hot }, HOOK.note); monoL(HOOK.note, str, x, 497, 30, P.bg, 'middle'); });
  monoL(HOOK.note, 'ЗАМЕР ПО ЗАПИСИ ПОКАЗА · ВЫСОТА — ЭКРАН TESLA', CX, 548, 22, P.mute, 'middle');
  // до земли ≈20 м: размерная линия от потолка рампы до земли (концы считаются в кадре — камера отъезжает)
  HOOK.drop = S('g', {}, HOOK);
  HOOK.dropL = S('path', { d: '', fill: 'none', stroke: P.ink, 'stroke-width': 3, 'stroke-dasharray': '10 9' }, HOOK.drop);
  HOOK.dropA = S('path', { d: '', fill: 'none', stroke: P.ink, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, HOOK.drop);
  HOOK.dropT = monoL(HOOK.drop, 'ДО ЗЕМЛИ ≈20 М', 0, 0, 28, P.ink, 'end');
  // --- три карточки трюков
  CARDS = S('g', {}, ui);
  const cw = 230, chh = 136, gap = 18, x0 = CX - (3 * cw + 2 * gap) / 2, cy = 1010;
  CARDS.items = [0, 1, 2].map(k => {
    const g = S('g', {}, CARDS), x = x0 + k * (cw + gap);
    const box = S('rect', { x, y: cy - chh / 2, width: cw, height: chh, rx: 22, fill: P.panel, stroke: P.line, 'stroke-width': 3 }, g);
    label(g, String(k + 1), x + 20, cy - chh / 2 + 38, 30, { fill: P.mute });
    const ic = S('g', { transform: `translate(${x + cw / 2 + 10} ${cy + 16}) scale(0.85)`, fill: 'none', stroke: P.ink, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    if (k === 0) { S('path', { d: 'M-70 -30 Q0 -62 70 -30' }, ic); S('path', { d: 'M-46 -30 L46 -30 L36 -6 L-36 -6 Z', fill: P.ink, stroke: 'none' }, ic); }
    if (k === 1) { S('path', { d: 'M-80 -40 L10 -40' }, ic); S('path', { d: 'M20 -30 Q60 -30 62 10', 'stroke-dasharray': '6 8' }, ic); S('path', { d: 'M40 6 L62 14 L76 -6' }, ic); }
    if (k === 2) { [-48, 0, 48].forEach(dx => S('rect', { x: dx - 20, y: 4, width: 40, height: 20, rx: 6, fill: P.mute, stroke: 'none' }, ic)); S('path', { d: 'M-70 10 Q0 -86 70 10', 'stroke-dasharray': '6 8' }, ic); S('path', { d: 'M-18 -46 L18 -46 L12 -32 L-12 -32 Z', fill: P.ink, stroke: 'none' }, ic); }
    return { g, box, x, cy, cw };
  });
  // --- метки трюков в углу
  TAGL = ['ТРЮК 1 · ПРИСОСКА', 'ТРЮК 2 · СРЫВ', 'ТРЮК 3 · КУВЫРОК'].map(s => { const g = S('g', {}, ui); const w = textWidth(s, 26, FONT.mono, 700, 1) + 34; S('rect', { x: 120, y: 312, width: w, height: 46, rx: 23, fill: P.hot }, g); monoL(g, s, 137, 344, 26, P.bg); return g; });
  SCHEMA = S('g', {}, ui); monoL(SCHEMA, 'СХЕМА · РЕКОНСТРУКЦИЯ', 880, 344, 24, P.mute, 'end');
  // --- S3: вентиляторы и юбки (выноски)
  S3L = S('g', {}, ui);
  S3L.fan = S('g', {}, S3L); S3L.fanLead = drawStroke(S3L.fan, '', { stroke: P.ink, 'stroke-width': 3, opacity: 0.8 }); S3L.fanDot = S('circle', { r: 8, fill: P.hot }, S3L.fan);
  label(S3L.fan, 'ВЕНТИЛЯТОРЫ', 880, 430, 54, { anchor: 'end' }); label(S3L.fan, 'ОТКАЧИВАЮТ ВОЗДУХ', 880, 478, 32, { font: FONT.text, weight: 800, fill: P.mute, anchor: 'end' });
  S3L.sk = S('g', {}, S3L); S3L.skLead = drawStroke(S3L.sk, '', { stroke: P.ink, 'stroke-width': 3, opacity: 0.8 });
  label(S3L.sk, 'ЮБКИ', 150, 430, 66); label(S3L.sk, 'НЕ ПУСКАЮТ ВОЗДУХ ОБРАТНО', 150, 478, 32, { font: FONT.text, weight: 800, fill: P.mute });
  // --- S4: 1 м² и счётчик «≈10 т»
  S4G = S('g', {}, ui);
  monoL(S4G, 'ДАВЛЕНИЕ ВОЗДУХА', 150, 418, 30);
  S('rect', { x: 150, y: 438, width: 140, height: 140, fill: P.hot, 'fill-opacity': 0.12, stroke: P.hot, 'stroke-width': 4 }, S4G);
  label(S4G, '1 М²', 220, 522, 38, { anchor: 'middle', fill: P.hot });
  S4G.eq = label(S4G, '≈', 330, 550, 84, { fill: P.mute });
  S4G.num = label(S4G, '', 410, 562, 132, { fill: P.ink });
  S4G.unit = label(S4G, 'Т', 0, 562, 84, { fill: P.hot });
  // --- S5: снаружи 100 % / под днищем
  S5G = S('g', {}, ui);
  monoL(S5G, 'СНАРУЖИ', 150, 418, 30, P.ink);
  S('rect', { x: 150, y: 436, width: 600, height: 36, rx: 18, fill: P.ink }, S5G);
  monoL(S5G, 'ПОД ДНИЩЕМ', 150, 522, 30, P.hot);
  S5G.track = S('rect', { x: 150, y: 540, width: 600, height: 36, rx: 18, fill: P.panel, stroke: P.line, 'stroke-width': 2 }, S5G);
  S5G.bar = S('rect', { x: 150, y: 540, width: 600, height: 36, rx: 18, fill: P.hot }, S5G);
  S5G.pct = monoL(S5G, 'МИНИМУМ 4–8 %, ЧТОБЫ ДЕРЖАТЬ ВЕС · ОЦЕНКА', 750, 606, 22, P.mute, 'end');
  // --- S6: «g» вниз и стрелки в поверхность; «ВЕРХ НЕ ВАЖЕН»
  S6G = S('g', {}, ui);
  S6G.g = S('g', {}, S6G);
  S('path', { d: 'M860 560 V700 M840 676 L860 700 L880 676', fill: 'none', stroke: P.mute, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, S6G.g);
  label(S6G.g, 'g', 832, 600, 44, { font: FONT.text, weight: 800, fill: P.mute, anchor: 'end' });
  S6G.t = S('g', {}, S6G); const st6 = { stroke: P.bg, 'stroke-width': 10, 'stroke-linejoin': 'round', 'paint-order': 'stroke' };
  { const w6 = Math.max(textWidth('К ПОВЕРХНОСТИ,', 46, FONT.head, 900), textWidth('А НЕ ВНИЗ', 58, FONT.head, 900)); S('rect', { x: 96, y: 1316, width: w6 + 48, height: 136, rx: 22, fill: P.bg, opacity: 0.88 }, S6G.t); }
  label(S6G.t, 'К ПОВЕРХНОСТИ,', 120, 1366, 46, { attrs: st6 }); label(S6G.t, 'А НЕ ВНИЗ', 120, 1428, 58, { fill: P.hot, attrs: st6 });
  // --- S7: прижим против веса — два столбика
  S7G = S('g', {}, ui);
  monoL(S7G, 'МАШИНА ≈1,7–2,3 Т', 150, 418, 34, P.ink); monoL(S7G, 'ВЕС МАШИНЫ НЕ РАСКРЫТ · ПРИЖИМ — ЭКРАН TESLA', 150, 640, 22, P.mute);
  S7G.w = S('rect', { x: 150, y: 436, width: 0, height: 46, rx: 12, fill: P.mute }, S7G);
  S7G.w2 = S('rect', { x: 150, y: 436, width: 0, height: 46, fill: 'url(#hatchGrey)', stroke: P.mute, 'stroke-width': 2 }, S7G);
  monoL(S7G, 'ПРИЖИМ 4 698 КГ', 150, 540, 34, P.hot);
  S7G.f = S('rect', { x: 150, y: 558, width: 0, height: 46, rx: 12, fill: P.hot }, S7G);
  S7G.x3 = label(S7G, '×2–3', 880, 484, 88, { fill: P.hot, anchor: 'end' });
  { const hp = S('pattern', { id: 'hatchGrey', width: 10, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs); S('path', { d: 'M0 0V10', stroke: P.mute, 'stroke-width': 3.5 }, hp); }
  // --- S8: стоп-кадр в воздухе
  S8G = S('g', {}, ui);
  S8G.t = S('g', {}, S8G); label(S8G.t, 'ПРИЖИМАТЬСЯ', CX, 420, fitSize('ПРИЖИМАТЬСЯ', 700, 76), { anchor: 'middle' }); label(S8G.t, 'НЕ К ЧЕМУ', CX, 500, 64, { anchor: 'middle', fill: P.hot });
  S8G.other = monoL(S8G, 'ДРУГОЙ ЗАЕЗД ТОГО ЖЕ ПОКАЗА', CX, 548, 24, P.mute, 'middle');
  // --- S9: полубочка и торможение (вид спереди)
  S9G = S('g', {}, ui);
  S9G.spin = S('g', {}, S9G); label(S9G.spin, 'СНАЧАЛА КРУТЯТ', CX, 430, fitSize('СНАЧАЛА КРУТЯТ', 700, 54), { anchor: 'middle' });
  S9G.brake = S('g', {}, S9G); label(S9G.brake, 'ПОТОМ ТОРМОЗЯТ', CX, 496, fitSize('ПОТОМ ТОРМОЗЯТ', 700, 54), { anchor: 'middle', fill: P.hot });
  S9G.hud = S('g', {}, S9G);
  monoL(S9G.hud, 'ПЕРЕГРУЗКА', CX - 16, 572, 26, P.mute, 'end'); S9G.g = label(S9G.hud, '0,3 G', CX, 586, 64, { font: FONT.mono, weight: 700, fill: P.hot }); monoL(S9G.hud, 'ЭКРАН TESLA', CX + 214, 572, 22, P.mute);
  // --- S11: тяга против веса, высота
  S11G = S('g', {}, ui);
  S11G.t = S('g', {}, S11G); label(S11G.t, 'ТЯГА > 3 ВЕСОВ', CX, 400, fitSize('ТЯГА > 3 ВЕСОВ', 720, 84), { anchor: 'middle', fill: P.hot });
  monoL(S11G.t, 'ПО ПЕРЕГРУЗКЕ НА ЭКРАНЕ TESLA', CX, 440, 26, P.mute, 'middle');
  S11G.hud = S('g', {}, S11G); S11G.h = label(S11G.hud, '0 М', CX, 516, 72, { font: FONT.mono, weight: 700, fill: P.ink, anchor: 'middle' });
  monoL(S11G.hud, 'ВЫСОТА — ЭКРАН TESLA · ≈4 С В ВОЗДУХЕ — НАШ ЗАМЕР', CX, 552, 22, P.mute, 'middle'); monoL(S11G.hud, 'БЕЗ ВОДИТЕЛЯ', CX, 578, 22, P.mute, 'middle');
  // тяга против веса — полосы как у «машина / прижим» (между счётчиком и машиной): вес ×1, тяга ×3,4
  S11G.f = S('g', {}, S11G);
  monoL(S11G.f, 'ВЕС', 150, 620, 24, P.ink); S('rect', { x: 250, y: 603, width: 130, height: 20, rx: 10, fill: P.mute }, S11G.f);
  monoL(S11G.f, 'ТЯГА', 150, 652, 24, P.hot); S11G.fb = S('rect', { x: 250, y: 635, width: 0, height: 20, rx: 10, fill: P.hot }, S11G.f);
  // линейка высоты 0–8 м слева, маркер едет вместе со счётчиком
  S11G.rul = S('g', {}, S11G.hud);
  S('path', { d: 'M132 1100 V800', stroke: P.mute, 'stroke-width': 3 }, S11G.rul);
  for (let m = 0; m <= 8; m += 2) { const y = 1100 - m / 8 * 300; S('path', { d: `M132 ${y} H${m % 4 ? 146 : 156}`, stroke: P.mute, 'stroke-width': 3 }, S11G.rul); monoL(S11G.rul, m + ' М', 164, y + 8, 22, P.mute); }
  S11G.mark = S('path', { d: 'M122 1100 L132 1093 L132 1107 Z M132 1100 H160', fill: P.hot, stroke: P.hot, 'stroke-width': 4 }, S11G.rul);
  S11G.replay = monoL(S11G, 'ПОВТОР · ЗАМЕДЛЕНИЕ', 880, 318, 24, P.hot, 'end');
  // --- S12: откуда сила — газ; шарик
  S12G = S('g', {}, ui);
  S12G.t = S('g', {}, S12G); label(S12G.t, 'НЕ ОГОНЬ —', CX, 400, 60, { anchor: 'middle', fill: P.mute }); label(S12G.t, 'ХОЛОДНЫЙ ГАЗ', CX, 476, fitSize('ХОЛОДНЫЙ ГАЗ', 720, 76), { anchor: 'middle', fill: P.ink });
  monoL(S12G.t, '2 БАЛЛОНА · 600 Л · СЖАТЫЙ ВОЗДУХ', CX, 526, 24, P.mute, 'middle');
  S12G.ball = S('g', {}, S12G);
  S('path', { d: 'M0 -70 C 46 -70 58 -20 40 14 C 28 36 12 46 0 50 C -12 46 -28 36 -40 14 C -58 -20 -46 -70 0 -70 Z', fill: P.hot, 'fill-opacity': 0.18, stroke: P.hot, 'stroke-width': 6 }, S12G.ball);
  S('path', { d: 'M-8 50 L8 50 L4 60 L-4 60 Z', fill: P.hot }, S12G.ball);
  S12G.puff = S('g', {}, S12G.ball);
  [0, 1, 2].forEach(i => S('circle', { cx: 0, cy: 74 + i * 26, r: 10 + i * 6, fill: P.jet, opacity: 0.5 - i * 0.14 }, S12G.puff));
  // --- S13: газа хватает на секунды
  S13G = S('g', {}, ui);
  label(S13G, 'ХВАТАЕТ НА СЕКУНДЫ', CX, 400, fitSize('ХВАТАЕТ НА СЕКУНДЫ', 720, 66), { anchor: 'middle' });
  S13G.sub = label(S13G, 'ЛЕТАЕТ ПРЫЖКАМИ', CX, 466, 52, { anchor: 'middle', fill: P.hot });
  monoL(S13G, 'ГАЗ В БАЛЛОНАХ · СХЕМА', CX, 522, 28, P.mute, 'middle'); monoL(S13G, 'ROCKET · ПРОТОТИП · СЕКУНДЫ — ОЦЕНКА', CX, 648, 24, P.mute, 'middle'); S13G.pct = label(S13G, '100 %', CX, 608, 84, { font: FONT.mono, weight: 700, fill: P.hot, anchor: 'middle' });
  // --- S14: призыв
  S14G = S('g', {}, ui);
  S14G.l1 = headline(S14G, 'ПЕРЕШЛИ ТОМУ, КТО ЖДАЛ', { x: CX, y: 392, size: fitSize('ПЕРЕШЛИ ТОМУ, КТО ЖДАЛ', 700, 54), fill: P.ink, outline: P.bg, stagger: 0.012, ls: 1 });
  S14G.l2 = headline(S14G, 'ЛЕТАЮЩИЕ', { x: CX, y: 494, size: fitSize('ЛЕТАЮЩИЕ', 700, 96), fill: P.hot, outline: P.bg, stagger: 0.018, ls: 2 });
  S14G.l3 = headline(S14G, 'МАШИНЫ', { x: CX, y: 590, size: 96, fill: P.hot, outline: P.bg, stagger: 0.018, ls: 2 });
  S14G.sum = label(S14G, 'АТМОСФЕРА ДЕРЖИТ · ГАЗ БРОСАЕТ', CX, 660, fitSize('АТМОСФЕРА ДЕРЖИТ · ГАЗ БРОСАЕТ', 720, 38, FONT.text, 800), { font: FONT.text, weight: 800, fill: P.ink, anchor: 'middle' });
  // --- знак канала
  LOGO = S('g', {}, ui);
  LOGO.mark = S('g', {}, LOGO);
  const LM = S('g', { transform: `translate(${CX} 420)` }, LOGO.mark);
  S('path', { d: rr(-150, -107, 300, 214, 42), fill: P.hot }, LM);
  const a = 18.7, c = 21.3, h = 59.3;
  const BR = [`M0 0Q${a} 0 ${a} ${-c}V${-h + a}Q${a} ${-h} ${2 * a} ${-h}`, `M0 0Q${a} 0 ${a} ${c}V${h - a}Q${a} ${h} ${2 * a} ${h}`];
  [-1, 1].forEach(sg => { const o = S('g', { transform: `translate(${sg * 88} 0) scale(${-sg} 1)` }, LM); BR.forEach(d => S('path', { d, fill: 'none', stroke: P.bg, 'stroke-width': 16.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, o)); });
  LOGO.caret = S('rect', { x: -4.5, y: -32, width: 9, height: 64, rx: 4.5, fill: P.bg }, LM);
  const ox = 168, oy = 125, vl = 38;
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => S('path', { d: `M${-ox} ${-oy + vl}V${-oy + 14}Q${-ox} ${-oy} ${-ox + 14} ${-oy}H${-ox + vl}`, transform: `scale(${sx} ${sy})`, fill: 'none', stroke: P.ink, 'stroke-width': 7, 'stroke-linecap': 'round' }, LM));
  LOGO.word = headline(LOGO, 'КОД  И  КАДР', { x: CX, y: 650, size: 76, fill: P.ink, stagger: 0.025 });
  LOGO.nick = S('g', {}, LOGO); monoL(LOGO.nick, '@kod_i_kadr', CX, 712, 38, P.hot, 'middle');
}

// ------------------------------------------------------------------ SIDE: поворот мира, камера, поза машины
function theta(t) {
  if (t < T.s12) {
    const a = prog(t, T.s6 + 0.05, 0.75, ease.inOut), b = prog(t, T.down - 0.05, 0.8, ease.inOut);
    return 170 - 85 * a + 85 * b;
  }
  const t0 = T.logo + 0.2;
  return 170 * ease.inOut(clamp((t - t0) / Math.max(0.3, T.clear - 0.08 - t0)));
}
const CAM0 = [1.1, 540, 785, 540, 960];
const CAMW = [0.165, 540, 785, 464, 686];                          // хук: отъезд вокруг машины — вся рампа до земли, люди и машины внизу
const CAMS = [
  [0, CAM0],
  [0.05, [1.12, 540, 785, 540, 958]],                           // S3 (в хуке камеру ведёт явная кривая в camAt)
  [T.skirt - 0.15, [1.62, 548, 676, 540, 830]],
  [T.s4 - 0.05, [1.05, 540, 785, 540, 960]],
  [T.s6, [0.9, 540, 785, 540, 840]],
  [T.s7, [1.05, 540, 785, 540, 960]],
  [T.gasCut - 0.3, [1.15, 540, 800, 540, 1000]],
  [T.s13 - 0.1, [1.1, 540, 785, 540, 1060]],
];
const camTr = [0, 1, 2, 3, 4].map(k => track(CAMS[0][1][k], CAMS.slice(1).map(([t, v]) => [t, v[k], SP.move])));
// срыв с кромки: «эффективное время» с замедлением до стопа; машина едет к кромке и уходит от поверхности
function slowTime(t) {
  let u = 0; const dt = 1 / 240, t1 = Math.min(t, T.s9);
  for (let x = T.s8; x < t1; x += dt) { const sp = x < T.edge + 0.1 ? 1 : x < T.freeze ? lerp(1, 0.18, (x - T.edge - 0.1) / Math.max(0.1, T.freeze - T.edge - 0.1)) : 0.05; u += sp * dt; }
  return u;
}
function sidePose(t) {
  // зазор «чпок»: в начале 8 px → 0 с отскоком; в конце — обратно 8 px (кадр 0 = последний кадр)
  let gap = 0;
  if (t < 1.2) gap = t < T.chpok ? 30 * (1 - 0.25 * t / T.chpok) : 24 * Math.exp(-(t - T.chpok) / 0.09) * Math.cos((t - T.chpok) * 34);
  if (t > T.end - 0.4) gap = 30 * prog(t, T.end - 0.4, 0.4, ease.inOut);
  const p = { x: 0, y: -gap, r: 0 };
  if (t >= T.s8 && t < T.s12) {
    const u = slowTime(t), uL = Math.max(0.35, T.edge - T.s8 + 0.05), a = 590 / (uL * uL);   // к кромке — к слову «воздухе»
    if (u < uL) p.x = a * u * u;
    else { const du = u - uL; p.x = 590 + 420 * du; p.y = -0.5 * 2600 * du * du - 60 * du; p.r = -22 * du; }
  }
  return p;
}
function camAt(t) {
  const c = camTr.map(f => f(t));
  if (t < T.s3 + 0.5) {   // хук: наезд → отъезд до земли (≈20 м) → на полпути под карточки → к присоске; зум в логарифме, точка P — машина
    const lz = (a, b, e) => Math.exp(lerp(Math.log(a), Math.log(b), e));
    const e0 = ease.inOut(prog(t, 0, 0.85)), e1 = ease.inOut(prog(t, 0.85, 1.05)), e2 = ease.inOut(prog(t, T.card1 - 0.05, 0.9)), e3 = ease.inOut(prog(t, T.teaseEnd + 0.02, 0.55));
    let z = lz(1.1, 1.16, e0), sx = 540, sy = 960;
    z = lz(z, 0.15, e1); sx = lerp(sx, 470, e1); sy = lerp(sy, 650, e1);
    z = lz(z, 0.42, e2); sx = lerp(sx, 520, e2); sy = lerp(sy, 640, e2);
    z = lz(z, 1.12, e3); sx = lerp(sx, 540, e3); sy = lerp(sy, 958, e3);
    c[0] = z; c[1] = 540; c[2] = 785; c[3] = sx; c[4] = sy;
  }
  // медленный наезд в сценах давления и прижима (картинка не стоит)
  c[0] *= 1 + (t < T.s6 ? 0.1 * ease.inOut(prog(t, T.s4, T.s6 - T.s4 - 0.2)) : t < T.s7 ? 0.1 * (1 - prog(t, T.s6, 0.5, ease.inOut)) : 0.08 * ease.inOut(prog(t, T.s7, T.s8 - T.s7)) * (1 - prog(t, T.s8 - 0.1, 0.4, ease.inOut)));
  if (t >= T.s8 && t < T.s12) {                                  // камера ведёт машину к кромке
    const p = sidePose(t), k = prog(t, T.s8, 0.6, ease.inOut), th = theta(t);
    const q = Mx.ap(chain(Mx.T(PX, PY), Mx.R(th), Mx.T(-PX, -PY)), [540 + p.x, GY - 110 + p.y]);
    c[0] = lerp(c[0], 0.95, k); c[1] = lerp(c[1], lerp(540, q[0], 0.85), k); c[2] = lerp(c[2], q[1], k); c[3] = lerp(c[3], 540, k); c[4] = lerp(c[4], 900, k);
  }
  const e = prog(t, T.clear - 0.4, 0.4, ease.inOut);
  c[0] *= 1 + 0.025 * Math.sin(t * 0.45) * Math.sin(Math.PI * clamp(t / T.end));   // лёгкий «дышащий» наезд, в начале и в конце 0
  return c.map((v, k) => lerp(v, CAM0[k], e));
}
function roadY(x, k) { if (k < 1e-6) return GY; const R = 1 / k, dx = x - 540; return GY - (R - Math.sqrt(Math.max(0, R * R - dx * dx))); }
function carToScreen(t, p) {
  const th = theta(t), [z, Fx, Fy, Sx, Sy] = camAt(t), sp = sidePose(t);
  const Wm = chain(Mx.T(Sx, Sy), Mx.S(z), Mx.T(-Fx, -Fy), Mx.T(PX, PY), Mx.R(th), Mx.T(-PX, -PY), Mx.T(sp.x, sp.y), Mx.T(CAR_X, GY), Mx.S(-CS, CS));
  return Mx.ap(Wm, p);
}
// колёса: медленно катятся там, где машина едет (в остальное время стоят)
function wheelAngle(t) { const sp = sidePose(t); return (sp.x / (83.8 * CS)) * 180 / Math.PI + (t > T.s12 && t < T.logo ? (t - T.s12) * 120 : 0); }

function frameSide(t) {
  const th = theta(t), flipK = clamp(Math.abs(th) / 170);
  const [z, Fx, Fy, Sx, Sy] = camAt(t);
  const sh = shake(t, T.kak, 7, 0.3, 9, 24), sh2 = shake(t, T.chpok, 16, 0.35, 4, 26);
  A(shakeG, 'transform', `translate(${f2(sh.x + sh2.x)} ${f2(sh.y + sh2.y)})`);
  A(world, 'transform', Mx.str(chain(Mx.T(Sx, Sy), Mx.S(z), Mx.T(-Fx, -Fy), Mx.T(PX, PY), Mx.R(th), Mx.T(-PX, -PY))));
  show(rampXG, t < T.s3 + 0.8 ? 1 : 0);
  // рампа: дуга, обрывается на кромке LIP; ферма с обратной стороны
  const k = flipK * (1 / 1150), xs = []; for (let x = -420; x <= LIP; x += 46) xs.push(x); xs.push(LIP);
  const top = xs.map(x => [x, roadY(x, k)]), bot = xs.map(x => [x, roadY(x, k) + 64]);
  A(roadBand, 'd', polyD([...top, ...bot.slice().reverse()]));
  A(roadEdge, 'd', 'M' + top.map(cf).join('L'));
  const botD = 'M' + bot.map(cf).join('L');
  A(roadLed, 'd', botD); A(roadGlow, 'd', botD);
  A(lipCap, 'd', `M${cf(top[top.length - 1])}L${cf(bot[bot.length - 1])}`); show(lipCap, flipK);
  let tr = ''; for (let i = 0; i < xs.length - 1; i += 1) { const a = [xs[i], roadY(xs[i], k) + 64], b = [xs[i + 1], roadY(xs[i + 1], k) + 150]; tr += `M${cf(a)}L${cf(b)}M${cf([xs[i], roadY(xs[i], k) + 150])}L${cf([xs[i + 1], roadY(xs[i + 1], k) + 150])}`; }
  A(truss, 'd', tr); show(truss, flipK);
  const wa = wheelAngle(t), dist = wa * Math.PI / 180 * 83.8 * CS;
  A(roadDash, 'd', 'M' + xs.map(x => cf([x, roadY(x, k) + 24])).join('L')); A(roadDash, 'stroke-dashoffset', f2(dist % 78.98));
  // машина
  const sp = sidePose(t);
  A(carPose, 'transform', Mx.str(chain(Mx.T(sp.x, sp.y), Mx.T(540, GY - 110), Mx.R(sp.r), Mx.T(-540, -(GY - 110)))));
  const xr = prog(t, T.scan, 0.55, ease.inOut) * (1 - prog(t, T.s8 - 0.1, 0.4)) + prog(t, T.s12, 0.4) * (1 - prog(t, T.s14 - 0.2, 0.4));
  const fanOn = prog(t, T.fans, 0.6) * (1 - prog(t, T.edge, 0.4));
  const fanSpin = t < T.fans ? 0 : 900 * Math.pow(Math.max(0, t - T.fans), 1.6) / (1 + 0.6 * Math.max(0, t - T.fans));
  const skirt = prog(t, T.skirt, 0.5, ease.out) * (1 - prog(t, T.edge, 0.3));
  const gasLevel = gasLevelAt(t);
  const hop = hopPose(t);
  car.set({
    wheel: -wa, body: lerp(1, 0.2, xr), wheels: lerp(1, 0.4, xr), xray: xr, frame: 1,
    fan: fanSpin, flow: (t - T.fans) * 60 * fanOn, skirt, t,
    jet: { down: hop.jet, rear: 0, front: 0 }, ground: Math.max(30, -hop.y / CS + 40),
    x_tanks: (t > T.s12 ? 1 : 0) * xr, x_pipes: (t > T.s12 ? 1 : 0) * xr, x_nozzles: (t > T.s12 ? 1 : 0) * xr,
    gas: gasLevel, gasOn: prog(t, T.gasT, 0.3) * (1 - prog(t, T.s14 - 0.2, 0.3)), gasflow: (t - T.gasT) * 70,
    gloss: (t > T.chpok + 0.2 && t < T.chpok + 1.2) ? (t - T.chpok - 0.2) : 0, shadow: hop.y < -2 ? 0 : 1,
  });
  if (hop.y < -0.5) A(carPose, 'transform', Mx.str(chain(Mx.T(0, hop.y), Mx.T(540, GY - 110), Mx.R(hop.r), Mx.T(-540, -(GY - 110)))));
  A(jShadow, 'opacity', f2(hop.y < -0.5 ? 0.7 * (1 + hop.y / 300) : 0)); A(jShadow, 'rx', f2(360 * (1 + hop.y / 500)));
  // линии скорости: машина несётся к кромке (влево по экрану), фон проносится вправо
  const sv = t > T.s8 && t < T.freeze ? clamp((t - T.s8) / 0.3) * (1 - clamp((t - T.edge - 0.15) / 0.3)) : 0;
  SPEED.forEach((ln, i) => { const u = ((t * 2.4 + ln.ph) % 1); A(ln.el, 'x', f2(lerp(-300, 1180, u))); A(ln.el, 'y', f2(ln.y)); A(ln.el, 'width', f2(120 + 160 * hash01(i, 77))); A(ln.el, 'opacity', f2(0.35 * sv)); });
  // частицы воздуха к вентилятору
  const pv = fanOn * (1 - prog(t, T.s4 + 0.6, 0.5));
  PARTS.forEach((pa, i) => {
    const u = ((t - T.fans) * pa.sp * 0.55 + pa.ph) % 1, [x, y] = flowAt(u);
    A(pa.el, 'cx', f2(x)); A(pa.el, 'cy', f2(y + (hash01(i, 5) - 0.5) * 8));
    show(pa.el, pv * clamp(Math.min(u / 0.06, (1 - u) / 0.12)) * (0.55 + 0.45 * hash01(i, 9)));
  });
  BOUNCE.forEach(b => {
    const ph2 = ((t - T.back) * 1.6 + b.k * 0.27) % 1, on = vis(t, T.back, T.s4 + 0.1) * (t > T.back ? 1 : 0);
    const dy = ph2 < 0.6 ? lerp(46, 4, ph2 / 0.6) : lerp(4, 22, (ph2 - 0.6) / 0.4);
    A(b.g, 'transform', `translate(${b.x} ${f2(dy)})`); show(b.g, on * (ph2 < 0.6 ? 1 : 1 - (ph2 - 0.6) / 0.4));
  });
  const airOn = (t < T.s4 ? 0 : 1) * (1 - prog(t, T.s7, 0.5));
  DOTS.forEach(d => {
    const a = clamp((t - T.press - d.d / 1400) / 0.35) * airOn;
    if (a <= 0.003) { A(d.el, 'visibility', 'hidden'); return; }
    A(d.el, 'visibility', 'visible'); A(d.el, 'opacity', f2(0.36 * a));
    A(d.el, 'transform', `translate(${f2(3 * Math.sin(t * 1.3 + d.ph))} ${f2(3 * Math.cos(t * 1.1 + d.ph))})`);
  });
  PUSH.forEach(pu => {
    const a = popO(t, T.press + pu.k * 0.05) * (1 - prog(t, T.s7 - 0.15, 0.25)) * (1 - prog(t, T.edge, 0.2)), bob = 6 * Math.sin((t - T.press) * 5 + pu.k);
    A(pu.g, 'transform', `translate(0 ${f2(bob - (1 - a) * 30)})`); show(pu.g, a);
  });
  A(lowZone, 'opacity', f2(0.4 * prog(t, T.s5, 0.4) * (1 - prog(t, T.s6 + 0.5, 0.4))));
  { const u = clamp((t - T.chpok) / 0.55); A(chpokRing, 'rx', f2(60 + 620 * ease.out(u))); A(chpokRing, 'ry', f2(6 + 30 * ease.out(u))); A(chpokRing, 'opacity', 0); A(chpokRing, 'stroke-width', f2(8 - 6 * u)); }   // кольцо «чпока» читалось как глитч — остались отскок, толчок и звук
  // пыль посадки прыжков (стадия газа)
  DUST.forEach((du, i) => {
    const tl = hop.land, tt = t - tl, side = i % 2 ? 1 : -1, wx = i < 2 ? 540 + 330 : i < 4 ? 540 - 290 : 540 + side * 60;
    if (!tl || tt < 0 || tt > 0.9) { A(du, 'opacity', 0); return; }
    const e = ease.out(tt / 0.9);
    A(du, 'cx', f2(wx + side * 110 * e)); A(du, 'cy', f2(GY - 8 - 18 * e)); A(du, 'rx', f2(28 + 130 * e)); A(du, 'ry', f2(10 + 22 * e)); A(du, 'opacity', f2(0.2 * (1 - e)));
  });
}
// «летает прыжками»: два коротких прыжка на газе в стадии GAS
const HOPS = () => { const t0 = T.secs - 0.45; return [[t0, 0.72, 220], [t0 + 0.86, 0.66, 180], [t0 + 1.66, 0.6, 150]]; };
function hopPose(t) {
  for (const [t0, d, h] of HOPS()) {
    if (t >= t0 - 0.06 && t < t0 + d + 0.18) {
      const u = clamp((t - t0) / d), y = t < t0 + d ? -4 * h * u * (1 - u) : 0;
      const jet = (t >= t0 - 0.06 && t < t0 + 0.22) || (t > t0 + d - 0.2 && t < t0 + d + 0.04) ? 1 : 0;
      return { y, r: 5 * Math.sin(u * Math.PI * 2) * (1 - u), jet, land: t >= t0 + d ? t0 + d : 0 };
    }
  }
  const last = HOPS().filter(([t0, d]) => t >= t0 + d).pop();
  return { y: 0, r: 0, jet: 0, land: last ? last[0] + last[1] : 0 };
}
// газ в баллонах: тратится только пока горят струи (ступеньками на каждом прыжке)
function gasLevelAt(t) {
  let used = 0;
  for (const [t0, d] of HOPS()) { used += 0.17 * clamp((t - t0 + 0.06) / 0.28) + 0.12 * clamp((t - (t0 + d - 0.2)) / 0.24); }
  return clamp(1 - used, 0.1, 1);
}

// ------------------------------------------------------------------ FRONT: полубочка + торможение (трюк 2); кувырок над рядом (трюк 3)
// поза машины спереди: { x, y — низ шин в мире, s — масштаб, r — крен°, jet, sq — сплющивание, m — глубина, Y — высота (м), yG — земля, kpx — px/м }
function frontFall(t) {   // S9: падение вверх колёсами → полубочка → торможение → мягкая посадка; камера стоит
  const s = 1.6, x = 540, tau = t - T.s9, tb = T.brake - T.s9, tl = T.land1 - T.s9;
  let y;
  if (tau < tb) y = 970 + 70 * tau * tau / (tb * tb);                           // падает, разгоняясь
  else { const u = clamp((tau - tb) / (tl - tb)); y = lerp(1040, FGY, 1 - Math.pow(1 - u, 2.2)); }
  const r = 180 + 180 * prog(t, T.spin, 0.75, ease.inOut);
  // по телеметрии: крен начинают правая пара колёсных + левое носовое; с вида на нос правый борт — слева на экране
  const jet = {
    downL: (t > T.spin && t < T.spin + 0.6) || (t > T.brake && t < T.land1 + 0.1) ? 1 : 0,
    downR: t > T.brake ? (t < T.land1 + 0.1 ? 1 : 0) : 0,
    sideL: 0, sideR: t > T.spin - 0.05 && t < T.spin + 0.5 ? 1 : 0,
  };
  return { x, y: Math.min(y, FGY), s, r: r % 360, jet, sq: 0, m: 1, Y: 0, yG: FGY, kpx: s * 444.6 / 1.94, u: -1 };
}
// кувырок: u — доля трюка (0 — отрыв, 1 — касание); вершина ≈8 м при u = 0,4 (над тягачом). Глубина m: 0,94 — за рядом,
// 1 — над тягачом, 1,55 — касание перед рядом (ближе к камере). Крен 360° влево: при виде на нос — по часовой.
function flipPose(u) {
  const uc = clamp(u), w = uc < 0.4 ? 0.5 * uc / 0.4 : 0.5 + 0.5 * (uc - 0.4) / 0.6;
  const Y = u > 0 && u < 1 ? 8 * Math.sin(Math.PI * w) : 0;
  const m = uc < 0.4 ? lerp(0.94, 1, uc / 0.4) : lerp(1, 1.55, ease.inOut((uc - 0.4) / 0.6));
  const r = uc < 0.1 ? 0 : uc < 0.32 ? 170 * ease.inOut((uc - 0.1) / 0.22) : uc < 0.48 ? lerp(170, 190, (uc - 0.32) / 0.16) : uc < 0.68 ? 190 + 170 * ease.inOut((uc - 0.48) / 0.2) : 360;
  // струи по фазам: подбросить — все четыре колёсных; закрутить — правая пара (слева на экране) и левое носовое;
  // поймать — встречная пара гасит вращение, у земли все четыре тормозят
  const toss = u > -0.07 && u < 0.11, spin = u > 0.1 && u < 0.26, stop = u > 0.6 && u < 0.7, brake = u > 0.8 && u < 0.97;
  const jet = { downL: toss || spin || brake ? 1 : 0, downR: toss || stop || brake ? 1 : 0, sideL: stop ? 1 : 0, sideR: spin ? 1 : 0 };
  const yG = FHZ + (FGY - FHZ) * m;
  return { x: FX, y: yG - Y * FKM * m, s: FS * m, r: r % 360, jet, sq: 0, m, Y, yG, kpx: FKM * m, u };
}
const pieceU = (t, K) => { if (t < K[0][0]) return Math.max(-0.1, (t - K[0][0]) * 0.4); for (let i = 1; i < K.length; i++) if (t < K[i][0]) return lerp(K[i - 1][1], K[i][1], (t - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); return 1 + (t - K[K.length - 1][0]); };
const uFlipA = t => pieceU(t, [[T.toss, 0], [T.spinW, 0.12], [T.catchW, 0.66], [T.landA, 1]]);                       // в реальном времени (сжато), по словам
const uFlipB = t => pieceU(t, [[T.rB0, 0], [T.rB0 + 0.55, 0.22], [T.landB - 1.05, 0.5], [T.landB, 1]]);               // повтор: медленно через вершину
const REPLAY = t => t >= T.rc;
const flipU = t => (TEASE(t) ? lerp(0.22, 0.5, (t - T.mad) / (T.teaseEnd - T.mad)) : REPLAY(t) ? uFlipB(t) : uFlipA(t));
// камера спереди: [z, Fx, Fy, Sx, Sy] — точку мира (Fx, Fy) держим на экране в (Sx, Sy)
function fCam(t, p) {
  const cx = p.x, cy = p.y - 112 * p.s;
  if (TEASE(t)) return [5.5, cx, cy, 540, 700];
  if (t < T.s10) return [1, 540, 1000, 540, 1000];
  if (!REPLAY(t)) {                                              // короткий общий план ряда → средний → ведём машину → посадка перед рядом
    const k0 = prog(t, T.s10 + 0.38, 0.5, ease.inOut), k1 = prog(t, T.toss + 0.05, 0.5, ease.inOut), k2 = prog(t, T.catchW - 0.15, 0.55, ease.inOut);
    let z = lerp(1.15, 2.2, k0), Fx = lerp(540, FX, k0), Fy = FGY, Sy = 1240;
    z = lerp(z, 4, k1); Fx = lerp(Fx, cx, k1); Fy = lerp(Fy, cy, k1); Sy = lerp(Sy, 760, k1);
    z = lerp(z, 2.6, k2); Fx = lerp(Fx, cx, k2); Fy = lerp(Fy, p.yG - 50, k2); Sy = lerp(Sy, 1170, k2);
    return [z, Fx, Fy, 540, Sy];
  }
  const u = p.u;                                                 // повтор: машина крупно, камера ведёт её
  const z = u < 0.22 ? lerp(3.4, 9, ease.inOut(clamp((u + 0.05) / 0.27))) : u < 0.5 ? 9 : lerp(9, 4.2, ease.inOut(clamp((u - 0.5) / 0.4)));
  const Sy = u < 0.5 ? 990 : lerp(990, 1080, ease.inOut(clamp((u - 0.5) / 0.4)));
  return [z, cx, cy, 540, Sy];
}
function frameFront(t) {
  const flip = t >= T.s10 || TEASE(t);
  const p = flip ? flipPose(flipU(t)) : frontFall(t);
  const tl = !flip ? T.land1 : REPLAY(t) ? T.landB : T.landA;
  if (t >= tl && !TEASE(t)) { const e = t - tl; p.sq = (flip ? 0.05 : 0.04) * Math.exp(-e / 0.08) * Math.cos(e * 36); }
  // ряд — только в кувырке; пока машина за рядом, ряд её закрывает
  show(rowG, flip ? 1 : 0); show(fPad, flip ? 1 : 0);
  if (flip && p.m < 0.999) fShake.insertBefore(rowG, fSmokeF); else fShake.insertBefore(rowG, fShock);
  const pv = front.pivot, M = chain(Mx.T(p.x, p.y), Mx.S(p.s * (1 + p.sq), p.s * (1 - p.sq)), Mx.T(pv[0], pv[1]), Mx.R(p.r), Mx.T(-pv[0], -pv[1]));
  A(fPose, 'transform', Mx.str(M));
  const xr = flip ? 0 : prog(t, T.s9 + 0.05, 0.4) * (1 - prog(t, T.land1 - 0.1, 0.4));
  const upc = Math.cos(p.r * Math.PI / 180), air = p.yG - p.y, gl = upc > 0.35 ? air / p.s / upc + 12 : 420;
  front.set({ xray: xr, body: lerp(1, 0.6, xr), t, jet: p.jet, ground: { downL: gl, downR: gl }, reach: 240, gloss: 0, roll: p.r });
  // тень на земле
  const hk = 1 - Math.min(0.6, air / p.kpx / 12);
  A(fShadow, 'cx', f2(p.x)); A(fShadow, 'cy', f2(p.yG + 1)); A(fShadow, 'rx', f2(1.2 * p.kpx * hk)); A(fShadow, 'ry', f2(0.17 * p.kpx * hk)); A(fShadow, 'opacity', f2(0.85 * (1 - Math.min(0.85, air / p.kpx / 9))));
  // дым взлёта (за рядом) и пыль посадки с ударной волной (перед рядом)
  const gy = m => FHZ + (FGY - FHZ) * m;
  const EV = !flip ? [{ t0: T.land1 - 0.3, x: 540, y: FGY, k: 140, back: false, ring: true }]
    : REPLAY(t) ? [{ t0: T.rB0 - 0.06, x: FX, y: gy(0.94), k: FKM * 0.94, back: true }, { t0: T.landB, x: FX, y: gy(1.55), k: FKM * 1.55, back: false, ring: true }]
    : [{ t0: T.toss - 0.06, x: FX, y: gy(0.94), k: FKM * 0.94, back: true }, { t0: T.landA, x: FX, y: gy(1.55), k: FKM * 1.55, back: false, ring: true }];
  SMOKE.forEach((sm, i) => {
    const ev = EV.find(e => e.back === sm.back && t >= e.t0 && t < e.t0 + 1.8 && !TEASE(t));
    if (!ev) { A(sm.el, 'opacity', 0); return; }
    const e = ease.out((t - ev.t0) / 1.8), side = i % 2 ? 1 : -1, kk = sm.k, big = ev.ring ? 1.25 : 0.9;
    A(sm.el, 'cx', f2(ev.x + side * (0.5 + 4.2 * kk) * e * ev.k * big)); A(sm.el, 'cy', f2(ev.y - (0.25 + 1.1 * kk * e) * ev.k));
    A(sm.el, 'r', f2((0.45 + 1.5 * kk) * ev.k * big * (0.5 + e))); A(sm.el, 'opacity', f2(0.6 * (1 - e)));
  });
  const rv = EV.find(e => e.ring && t >= e.t0 && t < e.t0 + 0.75 && !TEASE(t));
  if (rv) { const q = (t - rv.t0) / 0.75, rx = (1.2 + 4.4 * ease.out(q)) * rv.k; A(fShock, 'cx', f2(rv.x)); A(fShock, 'cy', f2(rv.y)); A(fShock, 'rx', f2(rx)); A(fShock, 'ry', f2(rx * 0.2)); A(fShock, 'opacity', f2(0.6 * Math.sin(Math.PI * Math.min(1, q * 1.3 + 0.08)))); } else A(fShock, 'opacity', 0);
  // камера и толчки посадки
  const [z, Fx, Fy, Sx, Sy] = fCam(t, p);
  show(rowScale, flip && !REPLAY(t) && !TEASE(t) ? (t < T.s10 + 0.5 ? vis(t, T.s10 + 0.04, T.s10 + 0.18) : 0) : 0);
  const k1 = shake(t, T.land1, 12, 0.4, 3, 22), k2 = shake(t, T.landA, 6, 0.3, 4, 22), k3 = shake(t, T.landB, 14, 0.45, 4, 22);
  A(fShake, 'transform', `translate(${f2(Sx + k1.x + k2.x + k3.x)} ${f2(Sy + k1.y + k2.y + k3.y)}) scale(${f2(z)}) translate(${f2(-Fx)} ${f2(-Fy)})`);
  return p;
}

// ------------------------------------------------------------------ frame(t)
let caps = null;
function frame(t) {
  const sideOn = SIDE_ON(t) && !TEASE(t), frontOn = !SIDE_ON(t) || TEASE(t);
  A(sideG, 'display', sideOn ? 'inline' : 'none'); A(frontG, 'display', frontOn ? 'inline' : 'none');
  // хлёсткие переходы: уходящая стадия улетает влево с разгоном, новая влетает справа с торможением
  const slideOut = c => (t >= c - 0.16 && t < c ? -1250 * ease.in4((t - c + 0.16) / 0.16) : 0), slideIn = c => (t >= c && t < c + 0.2 ? 1250 * (1 - ease.out4((t - c) / 0.2)) : 0);
  A(sideG, 'transform', `translate(${f2(slideOut(T.s9) + slideIn(T.gasCut))} 0)`); A(frontG, 'transform', `translate(${f2(slideOut(T.gasCut) + slideIn(T.s9))} 0)`);
  // параллакс дальнего плана: прожекторы качаются, пылинки дрейфуют
  BEAMS.forEach(b => A(b.g, 'transform', `translate(${b.x} ${b.y}) rotate(${f2(b.a + 7 * Math.sin(t * 0.6 + b.k * 2))})`));
  MOTES.forEach(m => { A(m.el, 'cx', f2(m.x + 12 * Math.sin(t * 0.7 + m.ph))); A(m.el, 'cy', f2(((m.y - m.sp * t) % 2000 + 2000) % 2000 - 40)); });
  if (sideOn) frameSide(t);
  if (frontOn) frameFront(t);
  // вспышки и хлёсткие переходы
  const rc = T.rc;                                               // кат на повтор кувырка
  const fl = Math.max(TEASE(t) ? 1 - (t - T.mad) / 0.08 : 0, t > T.teaseEnd && t < T.teaseEnd + 0.08 ? 1 - (t - T.teaseEnd) / 0.08 : 0, t >= rc && t < rc + 1 / FPS ? 0.25 : 0);
  A(flash, 'opacity', f2(clamp(fl) * 0.85));
  const wh = Math.max(t > T.s9 - 0.18 && t < T.s9 + 0.12 ? 1 - Math.abs(t - T.s9 + 0.03) / 0.15 : 0, t > T.gasCut - 0.18 && t < T.gasCut + 0.12 ? 1 - Math.abs(t - T.gasCut + 0.03) / 0.15 : 0);
  WHIP.forEach((r, i) => { A(r, 'width', f2(520 * wh * (0.4 + 0.6 * hash01(i, 7)))); A(r, 'x', f2(120 + (1 - wh) * 400 * hash01(i, 9))); A(r, 'opacity', f2(0.4 * clamp(wh))); });
  frameUI(t);
  if (caps) caps.frame(t);
  show(capsLayer, t < T.s14 - 0.02 && !(t > T.surf + 0.05 && t < T.s7 + 0.02) ? 1 : 0);                   // на призыве слова несёт крупный заголовок
}

function frameUI(t) {
  // хук
  const hookOut = T.scan + 0.35;
  HOOK.q.set(t, T.h1, hookOut); show(HOOK, TEASE(t) ? 0 : 1);
  HOOK.strike.draw(prog(t, T.scan - 0.05, 0.25, ease.out) * (t < hookOut + 0.3 ? 1 : 0));
  show(HOOK.note, vis(t, T.h1 + 0.35, T.card1 - 0.05) * (TEASE(t) ? 0 : 1));
  { const [z, Fx, Fy, Sx, Sy] = camAt(t), xs = 1150, sc = q => [Sx + z * (q[0] - Fx), Sy + z * (q[1] - Fy)];
    const a = sc([xs, RAMPX.ceilY(xs) + 70]), b = sc([xs, RAMPX.GND - 6]), on = vis(t, 1.25, T.card1 - 0.3) * (TEASE(t) ? 0 : 1) * clamp((b[1] - a[1] - 300) / 200) * clamp((1420 - b[1]) / 60);
    show(HOOK.drop, on);
    if (on > 0.002) { A(HOOK.dropL, 'd', `M${f2(a[0])} ${f2(a[1])}V${f2(b[1])}`); A(HOOK.dropA, 'd', `M${f2(a[0] - 14)} ${f2(a[1] + 18)}L${f2(a[0])} ${f2(a[1])}L${f2(a[0] + 14)} ${f2(a[1] + 18)}M${f2(b[0] - 14)} ${f2(b[1] - 18)}L${f2(b[0])} ${f2(b[1])}L${f2(b[0] + 14)} ${f2(b[1] - 18)}`); A(HOOK.dropT, 'x', f2(a[0] - 16)); A(HOOK.dropT, 'y', f2((a[1] + b[1]) / 2 + 10)); } }
  // карточки трюков, третья разгорается
  const co = vis(t, T.card1, T.s3 - 0.1);
  show(CARDS, co * (TEASE(t) ? 0 : 1));
  CARDS.items.forEach((c, k) => {
    const t0 = [T.card1, T.card2, T.card3][k];
    popIn(c.g, t, t0, Infinity, c.x + c.cw / 2, c.cy, 30);
    const hot = k === 2 && t > T.third;
    A(c.box, 'stroke', hot ? P.hot : P.line); A(c.box, 'stroke-width', hot ? 5 : 3); A(c.box, 'fill', hot ? '#2A2410' : P.panel);
  });
  // метки трюков
  show(TAGL[0], vis(t, T.scan, T.s8 - 0.1)); show(TAGL[1], vis(t, T.s8, T.s10 - 0.12)); show(TAGL[2], vis(t, T.s10, T.s11 - 0.05)); // в повторе место занимает заголовок «ТЯГА > 3 ВЕСОВ»
  show(SCHEMA, Math.max(vis(t, T.scan + 0.6, T.s4 - 0.1), vis(t, T.s9 + 0.1, T.land1 - 0.1), vis(t, T.s10 + 0.1, T.s11 + 0.1), vis(t, T.gasT, T.s14 - 0.15)));
  // S3: выноски к вентилятору и к юбкам
  const fo = vis(t, T.fans, T.skirt - 0.28);
  show(S3L.fan, fo);
  if (fo > 0.002) { const [fx, fy] = carToScreen(t, [952, -74]); S3L.fanLead.setAttribute('d', `M${f2(Math.min(fx - 20, 820))} 500 L${f2(fx)} ${f2(fy - 36)}`); S3L.fanLead.draw(prog(t, T.fans + 0.1, 0.3, ease.out)); A(S3L.fanDot, 'cx', f2(fx)); A(S3L.fanDot, 'cy', f2(fy - 36)); }
  const so = vis(t, T.skirt, T.s4 - 0.15);
  show(S3L.sk, so);
  if (so > 0.002) { const [kx, ky] = carToScreen(t, [470, -12]); S3L.skLead.setAttribute('d', `M220 500 L${f2(kx)} ${f2(ky - 26)}`); S3L.skLead.draw(prog(t, T.skirt + 0.15, 0.3, ease.out)); }
  // S4
  const s4o = popIn(S4G, t, T.s4 + 0.12, T.s5 - 0.1, 400, 500);
  if (s4o > 0.002) { const on = t >= T.ten - 0.05, v = Math.max(1, Math.round(countTo(t, T.ten - 0.05, 0.6, 0, 10))); setText(S4G.num, on ? String(v) : ''); show(S4G.eq, on ? 1 : 0); show(S4G.unit, on ? 1 : 0); A(S4G.unit, 'x', f2(410 + textWidth(String(v), 132, FONT.head, 900) + 16)); }
  // S5
  const s5o = popIn(S5G, t, T.s5 + 0.02, T.s6 - 0.12, 450, 500);
  if (s5o > 0.002) A(S5G.bar, 'width', f2(600 * (1 - 0.06 * prog(t, T.s5 + 0.3, 0.5, ease.inOut))));
  // S6
  show(S6G.g, vis(t, T.s6 + 0.4, T.down + 0.2)); show(S6G.t, vis(t, T.surf, T.s7 - 0.28));
  // S7: прижим против веса
  const s7o = popIn(S7G, t, T.s7 + 0.02, T.s8 - 0.1, 450, 500);
  if (s7o > 0.002) { const k = step(t - T.s7 - 0.1, SP.move); A(S7G.w, 'width', f2(530 * 1.7 / 4.7 * k)); A(S7G.w2, 'width', f2(530 * 2.35 / 4.7 * k)); A(S7G.f, 'width', f2(530 * step(t - T.five, SP.move))); show(S7G.x3, prog(t, T.three, 0.25)); }
  // S8
  show(S8G.t, vis(t, T.edge + 0.1, T.s9 - 0.28)); show(S8G.other, vis(t, T.s8 + 0.1, T.s9 - 0.28));
  // S9
  show(S9G.spin, vis(t, T.spin, T.s10 - 0.1)); show(S9G.brake, vis(t, T.brake, T.s10 - 0.1)); show(S9G.hud, vis(t, T.brake, T.s10 - 0.1));
  const gv = t < T.brake ? 0.3 : lerp(0.3, 3.1, prog(t, T.brake, 0.5, ease.out)); setText(S9G.g, gv.toFixed(1).replace('.', ',') + ' G');
  // S11
  show(S11G.t, vis(t, T.s11 + 0.3, T.landB - 0.55)); show(S11G.hud, vis(t, T.s11 + 0.3, T.landB - 0.55));
  show(S11G.f, vis(t, T.s11 + 0.4, T.s11 + 1.9)); A(S11G.fb, 'width', f2(130 * 3.4 * prog(t, T.s11 + 0.45, 0.8, ease.out))); show(S11G.replay, vis(t, T.rB0 + 0.45, T.landB - 1.1));
  if (t > T.s11) { const hm = clamp(flipPose(uFlipB(t)).Y, 0, 8); setText(S11G.h, '≈' + Math.round(hm) + ' М'); A(S11G.mark, 'transform', `translate(0 ${f2(-hm / 8 * 300)})`); }
  // S12
  show(S12G.t, vis(t, T.gasT - 0.1, T.s13 - 0.1));
  const bo = vis(t, T.ball, T.s13 - 0.05); show(S12G.ball, bo);
  if (bo > 0.002) { const u = clamp((t - T.ball) / 1.3), bx = lerp(800, 260, ease.inOut(u)), by = 760 - 110 * Math.sin(u * Math.PI); A(S12G.ball, 'transform', `translate(${f2(bx)} ${f2(by)}) rotate(${f2(-70 + 40 * Math.sin(u * 9))}) scale(${f2(1.25 - 0.4 * u)})`); }
  // S13
  show(S13G, vis(t, T.s13 + 0.05, T.s14 - 0.2));
  setText(S13G.pct, Math.round(gasLevelAt(t) * 100) + ' %');
  // S14 + знак
  S14G.l1.set(t, T.s14 + 0.12, T.logo - 0.3); S14G.l2.set(t, T.s14 + 0.45, T.logo - 0.27); S14G.l3.set(t, T.s14 + 0.6, T.logo - 0.24);
  show(S14G.sum, vis(t, T.s14 + 0.9, T.logo - 0.25));
  popIn(LOGO.mark, t, T.logo, T.clear - 0.08, CX, 420, 0);
  A(LOGO.caret, 'opacity', Math.floor((t - T.logo) / 0.4) % 2 === 0 ? 1 : 0.15);
  LOGO.word.set(t, T.logo + 0.12, T.clear - 0.1);
  show(LOGO.nick, vis(t, T.logo + 0.3, T.clear - 0.1));
}

// ------------------------------------------------------------------ звук (записанные, тише голоса)
sfx(T.chpok - 0.02, 'thump_2', -10);
sfx(0.9, 'suck_2', -15);                                // отъезд камеры: вся рампа
sfx(T.kak, 'tick_1', -13);
sfx(T.card1, 'pop_1', -14); sfx(T.card2, 'pop_2', -15); sfx(T.card3, 'pop_1', -15);
sfx(T.mad, 'flip_1', -9);
sfx(T.scan, 'scan_1', -14);
sfx(T.fans, 'fan_1', -11);
sfx(T.skirt + 0.05, 'click_3', -12);
sfx(T.ten, 'tick_1', -14);
sfx(T.s6 + 0.05, 'flip_2', -12);
sfx(T.five, 'thump_2', -13);
sfx(T.edge, 'flip_1', -12);
sfx(T.s9, 'flip_2', -10);
sfx(T.spin, 'gas_1', -10);
sfx(T.brake, 'gas_long_1', -11);
sfx(T.land1 - 0.02, 'thump_1', -9);
sfx(T.toss - 0.06, 'gas_1', -9);
sfx(T.spinW, 'gas_2', -12);
sfx(T.catchW, 'gas_long_1', -13);
sfx(T.landA - 0.02, 'thump_1', -12);
sfx(T.rc, 'flip_2', -14);
sfx(T.rB0 - 0.06, 'gas_long_2', -14);
sfx(T.landB - 0.02, 'thump_1', -8);
sfx(T.gasCut, 'flip_1', -11);
sfx(T.ball, 'gas_2', -15);
sfx(T.hops, 'gas_1', -12);
sfx(T.logo, 'ding_1', -7);

// ------------------------------------------------------------------ boot
window.DURATION = DURATION;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, DURATION));
window.READY = (async () => {
  await loadFonts();
  await preloadImages(svg);
  buildUI();
  caps = makeCaptions(capsLayer, autoCaptions({ maxWords: 3, maxChars: 18 }), { x: 126, y: 1396, size: 52, lh: 62, maxW: 640, font: 'Onest, sans-serif', weight: 800,
    ink: P.ink, grey: P.mute, red: P.hot, dim: 0.42, end: T.s14 - 0.05, gap: 8 });
  capsLayer.querySelectorAll('text').forEach(e => { e.setAttribute('stroke', P.bg); e.setAttribute('stroke-width', 12); e.setAttribute('stroke-linejoin', 'round'); e.setAttribute('paint-order', 'stroke'); });
  frame(0);
  return true;
})();
