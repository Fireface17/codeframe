// row.js — ряд машин и люди для масштаба (сцена «кувырок над рядом машин», масштаб в хуке).
// Вид строго сбоку, нос влево. Единицы: 1 м = 100 ед.; начало координат — земля под серединой
// машины; вверх — минус y. Силуэты без марок: седан, кроссовер, пикап, тягач, роботакси.
//   makeVehicle(parent, defs, kind, opt) -> { g, len, hgt, wheels: [{ g, x, y, r }] }
//   makePerson(parent, defs, opt)        -> { g, hgt }      opt.pose: 'stand' | 'point', opt.fill
//   makeRow(parent, defs, opt)           -> { g, items: [{ kind, x, len, hgt, g }], width }
// opt: stroke — толщина светлой кромки, ед. (4,5 ≈ 1,3 px при ≈30 px/м; крупно — ≈2 px / (px на ед.));
//      tone — общий тон 0..1 (1 — как задумано, 0,5 — темнее, дальний план); base — цвет, к которому
//      уходит тон (фон сцены, #0E1016); gap — зазор в ряду, ед. (120 = 1,2 м); kinds — свой порядок ряда.
// Строится один раз; в кадре меняй только transform/opacity групп (wheels[i].g — вращение колеса).
// Глобальные имена — с префиксом rv_ (кроме трёх функций выше). Нужны core.js и lab.js.

const rv_C = {
  body0: '#2E3543', body1: '#232936', edge: '#6B7486', glass: '#11151C', glassHi: '#1A2029',
  tire: '#15181E', tireHi: '#2A2F3A', rim: '#4A5364', rimHi: '#5F697C', rimDark: '#14171D', hub: '#717B8D',
  well: '#0A0C10', trim: '#1A1E26', seam: '#0F1218', line: '#3E4657', head: '#DCE5EE', tail: '#C4444F',
  chassis: '#15181F', metal0: '#474F60', metal1: '#272C36', rail: '#363D4A', guard: '#1E222B',
  person: '#4A5366',
};
const rv_ORDER = ['robotaxi', 'pickup', 'semi', 'crossover', 'sedan'];
let rv_n = 0;                                                     // счётчик id клипов

// ------------------------------------------------------------------ геометрия (метры, y вверх → единицы)
const rv_f = p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const rv_u = (x, y) => [x * 100, -y * 100];
const rv_pl = (pts, close = false) => 'M' + pts.map(([x, y]) => rv_f(rv_u(x, y))).join('L') + (close ? 'Z' : '');
const rv_Q = (cx, cy, x, y) => `Q${rv_f(rv_u(cx, cy))} ${rv_f(rv_u(x, y))}`;
const rv_L = (x, y) => 'L' + rv_f(rv_u(x, y));
const rv_box = (x0, y0, x1, y1, r = 0) => rr(x0 * 100, -y1 * 100, (x1 - x0) * 100, (y1 - y0) * 100, r * 100);
// круглая колёсная арка вокруг (cx, cy) радиуса R: от высоты y0 (задний край) через верх к y1 (передний)
function rv_arc(n) {
  const [cx, cy, R] = n.arch;
  const dA = Math.sqrt(Math.max(0, R * R - (n.y0 - cy) ** 2)), dB = Math.sqrt(Math.max(0, R * R - (n.y1 - cy) ** 2));
  let span = Math.atan2(n.y1 - cy, -dB) - Math.atan2(n.y0 - cy, dA);
  while (span < 0) span += 2 * Math.PI;
  return { A: rv_u(cx + dA, n.y0), B: rv_u(cx - dB, n.y1), r: R * 100, large: span > Math.PI ? 1 : 0 };
}
// узлы контура → вершины: [x, y, c] (c — срез угла под скругление, м) | { arch } | { sq } (угловатая арка)
function rv_V(nodes) {
  const V = [];
  for (const n of nodes) {
    if (Array.isArray(n)) V.push({ p: rv_u(n[0], n[1]), c: (n[2] || 0) * 100 });
    else if (n.arch) { const a = rv_arc(n); V.push({ p: a.A, c: 0, arc: a }, { p: a.B, c: 0 }); }
    else {
      const [cx, cy, R] = n.sq;
      [[cx + R * 0.98, n.y0, 0], [cx + R * 0.98, cy + R * 0.40, 0.07], [cx + R * 0.60, cy + R * 0.98, 0.09],
        [cx - R * 0.60, cy + R * 0.98, 0.09], [cx - R * 0.98, cy + R * 0.40, 0.07], [cx - R * 0.98, n.y1, 0]]
        .forEach(q => V.push({ p: rv_u(q[0], q[1]), c: q[2] * 100 }));
    }
  }
  return V;
}
function rv_fil(V, i) {
  const v = V[i]; if (!v.c) return null;
  const n = V.length, a = V[(i + n - 1) % n].p, b = V[(i + 1) % n].p, p = v.p;
  const l1 = Math.hypot(a[0] - p[0], a[1] - p[1]), l2 = Math.hypot(b[0] - p[0], b[1] - p[1]);
  const c = Math.min(v.c, l1 / 2, l2 / 2);
  return { a: [p[0] + (a[0] - p[0]) * c / l1, p[1] + (a[1] - p[1]) * c / l1], b: [p[0] + (b[0] - p[0]) * c / l2, p[1] + (b[1] - p[1]) * c / l2] };
}
const rv_seg = (V, F, i) => (F[i] ? `L${rv_f(F[i].a)}Q${rv_f(V[i].p)} ${rv_f(F[i].b)}` : `L${rv_f(V[i].p)}`);
const rv_arcCmd = (a, p) => `A${a.r.toFixed(1)} ${a.r.toFixed(1)} 0 ${a.large} 0 ${rv_f(p)}`;
// замкнутый контур со скруглёнными углами и дугами арок
function rv_d(V) {
  const n = V.length, F = V.map((_, i) => rv_fil(V, i));
  let d = 'M' + rv_f(F[0] ? F[0].b : V[0].p);
  for (let i = 1; i < n; i++) d += V[i - 1].arc ? rv_arcCmd(V[i - 1].arc, V[i].p) : rv_seg(V, F, i);
  return d + (F[0] ? `L${rv_f(F[0].a)}Q${rv_f(V[0].p)} ${rv_f(F[0].b)}` : '') + 'Z';
}
const rv_dn = nodes => rv_d(rv_V(nodes));
// открытый участок того же контура от вершины i0 до i1 (кромка, рама стёкол)
function rv_open(V, i0, i1) {
  const F = V.map((_, i) => rv_fil(V, i));
  let d = 'M' + rv_f(F[i0] ? F[i0].a : V[i0].p) + (F[i0] ? `Q${rv_f(V[i0].p)} ${rv_f(F[i0].b)}` : '');
  for (let i = i0 + 1; i <= i1; i++) d += V[i - 1].arc ? rv_arcCmd(V[i - 1].arc, V[i].p) : rv_seg(V, F, i);
  return d;
}
// путь арки от заднего края к переднему: ниша (с Z) и накладка-расширитель (обводка)
function rv_archOpen(n) {
  if (n.arch) { const a = rv_arc(n); return 'M' + rv_f(a.A) + rv_arcCmd(a, a.B); }
  const V = rv_V([n]); return rv_open(V, 0, V.length - 1);
}

// ------------------------------------------------------------------ цвет и градиенты
const rv_tc = (c, t, base) => (t >= 0.999 ? c : mix(base, c, t));
function rv_grad(defs, key, make) { const C = defs.__rv || (defs.__rv = {}); return C[key] || (C[key] = make()); }
const rv_shadow = defs => rv_grad(defs, 'sh', () => radGrad(defs, [[0, '#000', 0.9], [0.55, '#000', 0.45], [1, '#000', 0]]));

// ------------------------------------------------------------------ виды машин (метры, нос влево)
// body — контур по часовой: низ переднего бампера → нос → капот → крыша → корма → низ, арки сзади вперёд;
// edge — участок контура под светлую кромку; band/bandW — рама стёкол (полоса цвета кузова вдоль контура);
// glass — стёкла (могут выходить за контур: всё внутреннее режется по силуэту); pillars — стойки;
// trim — тёмные накладки внутри силуэта; under/over — детали до/после кузова (рама, рейлинги, зеркала).
const rv_SPEC = {
  // седан ≈4,70 × 1,44 м: база 2,85, свесы 0,92/0,93, колёса Ø0,67
  sedan() {
    const r = 0.335, aR = { arch: [1.42, r, 0.385], y0: 0.24, y1: 0.17 }, aF = { arch: [-1.43, r, 0.385], y0: 0.17, y1: 0.205 };
    return {
      len: 4.70, hgt: 1.44, wheels: [[-1.43, r, 'car', 5], [1.42, r, 'car', 5]], arches: [aR, aF], low: 0.42,
      body: [[-2.28, 0.21, 0.06], [-2.35, 0.42, 0.12], [-2.32, 0.63, 0.10], [-2.13, 0.75, 0.16], [-1.05, 0.95, 0.20],
        [-0.28, 1.40, 0.32], [0.30, 1.44, 0.40], [0.88, 1.37, 0.30], [1.58, 1.01, 0.10], [2.27, 0.985, 0.05],
        [2.35, 0.83, 0.10], [2.35, 0.45, 0.10], [2.25, 0.24, 0.06], aR, aF],
      edge: [2, 10], band: [4, 8], bandW: 0.065,
      glass: [[[-0.95, 0.975], [-0.28, 1.60], [0.75, 1.60], [1.20, 1.03, 0.03]]],
      pillars: [[[0.10, 0.90], [0.19, 0.90], [0.25, 1.60], [0.16, 1.60]]],
      seams: rv_pl([[-0.93, 0.975], [-0.965, 0.62], [-0.95, 0.24]]) + rv_pl([[0.145, 0.995], [0.16, 0.22]]) +
        rv_pl([[1.17, 1.025], [1.15, 0.80]]) + rv_Q(1.03, 0.73, 0.985, 0.42) + rv_L(0.985, 0.22),
      handles: rv_pl([[-0.24, 0.885], [-0.10, 0.885]]) + rv_pl([[0.76, 0.895], [0.90, 0.895]]),
      lines: rv_pl([[-2.05, 0.72], [-1.0, 0.815], [0.5, 0.86], [2.30, 0.90]]),
      head: [[-2.40, 0.60], [-2.12, 0.675], [-1.93, 0.72], [-1.95, 0.755], [-2.40, 0.70]],
      tail: [[2.05, 0.90], [2.40, 0.855], [2.40, 0.81], [2.08, 0.87]],
      over: [{ d: rv_dn([[-0.95, 0.975, 0.015], [-0.84, 0.98, 0.015], [-0.825, 1.045, 0.02], [-0.90, 1.075, 0.02], [-0.99, 1.06, 0.015], [-1.0, 1.0, 0.015]]), fill: 'body', stroke: 'line', w: 0.008 }],
    };
  },
  // кроссовер ≈4,75 × 1,62 м: база 2,85, колёса Ø0,73, тёмные накладки по низу и аркам, рейлинги
  crossover() {
    const r = 0.375, aR = { arch: [1.40, r, 0.43], y0: 0.38, y1: 0.29 }, aF = { arch: [-1.45, r, 0.43], y0: 0.29, y1: 0.33 };
    return {
      len: 4.75, hgt: 1.62, wheels: [[-1.45, r, 'car', 5], [1.40, r, 'car', 5]], arches: [aR, aF], low: 0.5, flare: 0.075,
      body: [[-2.30, 0.33, 0.06], [-2.375, 0.55, 0.12], [-2.36, 0.84, 0.10], [-2.18, 0.99, 0.16], [-1.10, 1.12, 0.22],
        [-0.40, 1.54, 0.33], [0.45, 1.585, 0.45], [1.62, 1.54, 0.20], [1.86, 1.50, 0.05], [2.28, 1.16, 0.10],
        [2.365, 0.98, 0.12], [2.375, 0.64, 0.12], [2.30, 0.38, 0.06], aR, aF],
      edge: [2, 10], band: [4, 8], bandW: 0.065,
      glass: [[[-0.97, 1.15], [-0.35, 1.70], [1.55, 1.70], [1.86, 1.30, 0.04], [1.45, 1.215, 0.05]]],
      pillars: [[[0.10, 1.0], [0.19, 1.0], [0.24, 1.70], [0.15, 1.70]], [[1.17, 1.0], [1.24, 1.0], [1.35, 1.70], [1.28, 1.70]]],
      trim: [{ d: rv_pl([[-2.5, -0.1], [-2.5, 0.45], [-1.95, 0.44], [1.95, 0.42], [2.5, 0.48], [2.5, -0.1]], true), fill: 'trim' }],
      under: [{ d: rv_pl([[-0.05, 1.597], [1.45, 1.592], [1.45, 1.615], [-0.05, 1.62]], true) + rv_box(-0.07, 1.50, 0.05, 1.61, 0.01) + rv_box(1.35, 1.48, 1.47, 1.605, 0.01), fill: 'rail' }],
      seams: rv_pl([[-0.95, 1.14], [-0.98, 0.75], [-0.95, 0.45]]) + rv_pl([[0.135, 1.16], [0.155, 0.44]]) +
        rv_pl([[1.20, 1.21], [1.16, 0.90]]) + rv_Q(0.98, 0.84, 0.90, 0.50) + rv_L(0.90, 0.44),
      handles: rv_pl([[-0.26, 1.04], [-0.12, 1.04]]) + rv_pl([[0.74, 1.05], [0.88, 1.05]]),
      lines: rv_pl([[-2.10, 0.95], [-1.0, 1.02], [0.5, 1.065], [2.33, 1.10]]),
      head: [[-2.42, 0.83], [-2.14, 0.905], [-1.95, 0.955], [-1.97, 0.99], [-2.42, 0.91]],
      tail: [[2.05, 1.13], [2.45, 1.07], [2.45, 1.02], [2.08, 1.08]],
      over: [{ d: rv_dn([[-0.97, 1.155, 0.015], [-0.85, 1.16, 0.015], [-0.835, 1.235, 0.02], [-0.91, 1.265, 0.02], [-1.01, 1.25, 0.015], [-1.02, 1.18, 0.015]]), fill: 'body', stroke: 'line', w: 0.008 }],
    };
  },
  // пикап ≈5,70 × 1,90 м: двойная кабина, короткий кузов, угловатые арки с расширителями, подножка
  pickup() {
    const r = 0.41, aR = { sq: [1.66, r, 0.50], y0: 0.50, y1: 0.48 }, aF = { sq: [-1.92, r, 0.50], y0: 0.48, y1: 0.42 };
    return {
      len: 5.70, hgt: 1.90, wheels: [[-1.92, r, 'car', 6], [1.66, r, 'car', 6]], arches: [aR, aF], low: 0.55, flare: 0.07,
      body: [[-2.78, 0.38, 0.03], [-2.85, 0.50, 0.04], [-2.85, 1.20, 0.05], [-2.78, 1.31, 0.06], [-1.38, 1.41, 0.10],
        [-0.80, 1.86, 0.12], [0.60, 1.90, 0.08], [0.68, 1.84, 0.03], [0.71, 1.33, 0.02], [2.83, 1.33, 0.03],
        [2.85, 1.23, 0.03], [2.85, 0.58, 0.03], [2.78, 0.45, 0.03], aR, aF],
      edge: [2, 10], band: [4, 7], bandW: 0.065,
      glass: [[[-1.26, 1.46], [-0.70, 2.0], [0.62, 2.0], [0.58, 1.47, 0.03]]],
      pillars: [[[-0.22, 1.30], [-0.13, 1.30], [-0.12, 2.0], [-0.21, 2.0]]],
      trim: [{ d: rv_pl([[-3.0, 0.2], [-3.0, 0.66], [-2.55, 0.66], [-2.50, 0.2]], true), fill: 'trim' },
        { d: rv_pl([[2.55, 0.2], [2.55, 0.64], [3.0, 0.64], [3.0, 0.2]], true), fill: 'trim' }],
      seams: rv_pl([[-1.27, 1.445], [-1.30, 0.50]]) + rv_pl([[-0.175, 1.465], [-0.165, 0.49]]) +
        rv_pl([[0.575, 1.465], [0.60, 0.49]]) + rv_pl([[0.745, 1.33], [0.76, 0.52]]),
      handles: rv_pl([[-0.56, 1.33], [-0.42, 1.33]]) + rv_pl([[0.30, 1.335], [0.44, 1.335]]),
      lines: rv_pl([[-2.80, 1.125], [0.70, 1.13]]) + rv_pl([[0.80, 1.13], [2.82, 1.135]]),
      head: [[-2.90, 1.13], [-2.60, 1.17], [-2.60, 1.215], [-2.90, 1.19]],
      tail: [[2.79, 1.28], [2.90, 1.28], [2.90, 0.95], [2.80, 0.95]],
      over: [{ d: rv_box(-1.30, 0.37, 1.05, 0.43, 0.02), fill: 'trim' },
        { d: rv_dn([[-1.26, 1.47, 0.02], [-1.11, 1.475, 0.02], [-1.095, 1.58, 0.025], [-1.19, 1.615, 0.025], [-1.30, 1.595, 0.02], [-1.31, 1.50, 0.02]]), fill: 'body', stroke: 'line', w: 0.008 }],
    };
  },
  // седельный тягач ≈6,80 × 4,00 м без прицепа: кабина над мостом со спальником и обтекателем, 3 оси
  semi() {
    const r = 0.53, aF = { arch: [-1.95, r, 0.62], y0: 1.05, y1: 0.50 };
    return {
      len: 6.80, hgt: 4.00, wheels: [[-1.95, r, 'truck'], [1.25, r, 'truck'], [2.60, r, 'truck']], arches: [aF], low: 0.5, flare: 0.07,
      body: [[-3.36, 0.38, 0.04], [-3.40, 0.45, 0.03], [-3.40, 0.86, 0.03], [-3.36, 0.90, 0.02], [-3.33, 2.55, 0.08],
        [-3.24, 3.24, 0.10], [-3.08, 3.33, 0.10], [-2.05, 3.95, 0.30], [-1.20, 4.00, 0.08], [-1.10, 3.93, 0.03],
        [-1.08, 1.30, 0.03], [-1.14, 1.05, 0.03], aF, [-3.10, 0.44, 0.03]],
      edge: [4, 9],
      glass: [[[-3.25, 2.30, 0.03], [-3.20, 2.98, 0.05], [-2.42, 2.98, 0.05], [-2.42, 2.30, 0.03]],
        [[-3.45, 2.50], [-3.27, 2.52], [-3.18, 3.20], [-3.30, 3.30]]],
      trim: [{ d: rv_pl([[-3.6, 0.2], [-3.6, 0.90], [-2.98, 0.90], [-2.98, 0.2]], true), fill: 'trim' },
        { d: rv_box(-3.20, 0.60, -2.72, 0.68, 0.015) + rv_box(-3.20, 0.88, -2.74, 0.96, 0.015), fill: 'well' }],
      under: [{ d: rv_box(-2.60, 0.84, 3.40, 1.10, 0.02), fill: 'chassis' },
        { d: rv_box(-0.92, 0.46, 0.50, 1.02, 0.12), fill: 'metal' },
        { d: rv_pl([[-0.60, 0.46], [-0.60, 1.02]]) + rv_pl([[0.18, 0.46], [0.18, 1.02]]), stroke: 'chassis', w: 0.035 },
        { d: rv_pl([[1.30, 1.10], [1.36, 1.28], [2.30, 1.28], [2.56, 1.14], [2.56, 1.10]], true), fill: 'rail' }],
      seams: rv_box(-3.27, 1.18, -2.36, 3.07, 0.05) + rv_box(-2.22, 1.24, -1.32, 1.92, 0.05) + rv_pl([[-3.06, 3.345], [-1.10, 3.345]]),
      handles: rv_pl([[-2.62, 2.02], [-2.48, 2.02]]),
      lines: rv_pl([[-3.30, 2.20], [-1.12, 2.20]]),
      head: [[-3.45, 0.62], [-3.22, 0.62], [-3.22, 0.70], [-3.45, 0.70]],
      over: [{ d: [1.25, 2.60].map(x => rv_pl([[x + 0.562, 0.792]]) + `A62 62 0 0 0 ${rv_f(rv_u(x - 0.562, 0.792))}`).join(''), stroke: 'guard', w: 0.07 },
        { d: rv_box(3.20, 0.22, 3.26, 1.06, 0.01), fill: 'guard' },
        { d: rv_box(3.30, 0.92, 3.40, 1.04, 0.01), fill: 'tail' },
        { d: rv_dn([[-3.40, 2.22, 0.03], [-3.30, 2.22, 0.03], [-3.30, 2.96, 0.03], [-3.40, 2.96, 0.03]]), fill: 'trim', stroke: 'edge', w: 0.01 }],
    };
  },
  // роботакси ≈4,20 × 1,45 м: двухместное купе, сплошная дуга крыши, одно большое стекло, без зеркал
  robotaxi() {
    const r = 0.35, aR = { arch: [1.42, r, 0.395], y0: 0.23, y1: 0.18 }, aF = { arch: [-1.38, r, 0.395], y0: 0.18, y1: 0.21 };
    return {
      len: 4.20, hgt: 1.45, wheels: [[-1.38, r, 'aero', 5], [1.42, r, 'aero', 5]], arches: [aR, aF], low: 0.4,
      body: [[-2.03, 0.21, 0.06], [-2.10, 0.40, 0.14], [-2.04, 0.62, 0.14], [-1.80, 0.76, 0.30], [-1.20, 0.95, 0.45],
        [-0.50, 1.37, 0.55], [0.20, 1.45, 0.60], [1.00, 1.36, 0.55], [1.75, 1.08, 0.35], [2.08, 0.90, 0.12],
        [2.10, 0.45, 0.10], [2.03, 0.23, 0.06], aR, aF],
      edge: [2, 9], band: [4, 8], bandW: 0.065,
      glass: [[[-0.95, 0.99], [-0.45, 1.62], [1.00, 1.62], [1.42, 1.08, 0.15], [0.50, 1.03, 0.25]]],
      seams: rv_pl([[-0.93, 0.985], [-0.96, 0.55], [-0.92, 0.22]]) + rv_pl([[0.85, 1.04], [0.88, 0.22]]),
      lines: rv_pl([[-1.85, 0.72], [-0.8, 0.81], [0.6, 0.86], [2.05, 0.88]]),
      head: [[-2.15, 0.57], [-1.92, 0.635], [-1.70, 0.70], [-1.72, 0.735], [-2.15, 0.62]],
      tail: [[1.86, 0.98], [2.15, 0.885], [2.15, 0.845], [1.88, 0.94]],
    };
  },
};

// ------------------------------------------------------------------ колесо
// style: car — диск с N простыми спицами; aero — плоский диск с прорезями; truck — диск с отверстиями и ступицей
function rv_wheel(parent, x, r, style, N, c, rimF) {
  const R = r * 100, o = S('g', { transform: `translate(${(x * 100).toFixed(1)} ${(-R).toFixed(1)})` }, parent);
  const g = S('g', {}, o), P = (rad, a) => rv_f([rad * Math.cos(a), rad * Math.sin(a)]);
  S('circle', { r: R.toFixed(1), fill: c('tire') }, g);
  S('circle', { r: (R * 0.9).toFixed(1), fill: 'none', stroke: c('tireHi'), 'stroke-width': (R * 0.045).toFixed(2) }, g);
  const q = R * (style === 'truck' ? 0.57 : style === 'aero' ? 0.76 : 0.67);
  S('circle', { r: q.toFixed(1), fill: rimF }, g);
  let d = '';
  if (style === 'truck') {
    const h = q * 0.085;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 2 * Math.PI, cx = q * 0.66 * Math.cos(a) + h, cy = q * 0.66 * Math.sin(a);
      d += `M${cx.toFixed(1)} ${cy.toFixed(1)}a${h.toFixed(1)} ${h.toFixed(1)} 0 1 0 ${(-2 * h).toFixed(1)} 0a${h.toFixed(1)} ${h.toFixed(1)} 0 1 0 ${(2 * h).toFixed(1)} 0Z`;
    }
    S('path', { d, fill: c('rimDark') }, g);
    S('circle', { r: (q * 0.36).toFixed(1), fill: c('rimDark') }, g);
    S('circle', { r: (q * 0.22).toFixed(1), fill: c('hub') }, g);
  } else {
    const aero = style === 'aero', ro = q * (aero ? 0.86 : 0.88), ri = q * (aero ? 0.6 : 0.3), w = q * 0.2;
    for (let i = 0; i < N; i++) {
      const a0 = -Math.PI / 2 + (i / N) * 2 * Math.PI, a1 = a0 + 2 * Math.PI / N;
      let s0, s1, t0, t1;
      if (aero) { const m = (a0 + a1) / 2, h = 0.23; s0 = t0 = m - h; s1 = t1 = m + h; }
      else { const dO = Math.asin(w / 2 / ro), dI = Math.asin(w / 2 / ri); s0 = a0 + dO; s1 = a1 - dO; t0 = a0 + dI; t1 = a1 - dI; }
      d += `M${P(ro, s0)}A${ro.toFixed(1)} ${ro.toFixed(1)} 0 0 1 ${P(ro, s1)}L${P(ri, t1)}A${ri.toFixed(1)} ${ri.toFixed(1)} 0 0 0 ${P(ri, t0)}Z`;
    }
    S('path', { d, fill: c('rimDark'), stroke: c('rimDark'), 'stroke-width': (q * 0.05).toFixed(2), 'stroke-linejoin': 'round' }, g);
    S('circle', { r: (q * (aero ? 0.16 : 0.2)).toFixed(1), fill: c('hub') }, g);
  }
  return { g, x: x * 100, y: -R, r: R };
}

// ------------------------------------------------------------------ машина
function makeVehicle(parent, defs, kind, opt = {}) {
  const sp = rv_SPEC[kind] && rv_SPEC[kind]();
  if (!sp) throw new Error('makeVehicle: неизвестный вид ' + kind);
  const t = opt.tone ?? 1, base = opt.base || '#0E1016', sw = opt.stroke ?? 4.5, tk = '|' + t.toFixed(3) + base;
  const c = k => rv_tc(rv_C[k], t, base);
  const L = sp.len * 100, Hh = sp.hgt * 100, g = S('g', {}, parent);
  const bodyF = rv_grad(defs, 'body' + Hh + tk, () => linGrad(defs, [[0, c('body0')], [1, c('body1')]], { x1: 0, y1: -Hh, x2: 0, y2: 0, units: 'userSpaceOnUse' }));
  const glassF = rv_grad(defs, 'glass' + tk, () => linGrad(defs, [[0, c('glass')], [0.36, c('glass')], [0.46, c('glassHi')], [0.56, c('glass')], [0.66, c('glass')], [0.70, c('glassHi')], [0.74, c('glass')], [1, c('glass')]], { x1: 0, y1: 0, x2: 1, y2: 0.25 }));
  const edgeF = rv_grad(defs, 'edge' + tk, () => linGrad(defs, [[0, c('edge'), 0.2], [0.08, c('edge'), 1], [0.92, c('edge'), 1], [1, c('edge'), 0.2]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
  const rimF = rv_grad(defs, 'rim' + tk, () => radGrad(defs, [[0, c('rimHi')], [1, c('rim')]], { cx: 0.4, cy: 0.32, r: 0.75 }));
  const metalF = rv_grad(defs, 'metal' + tk, () => linGrad(defs, [[0, c('metal0')], [0.45, c('metal0')], [1, c('metal1')]], { x1: 0, y1: 0, x2: 0, y2: 1 }));
  const lowF = rv_grad(defs, 'low', () => linGrad(defs, [[0, '#000', 0], [1, '#000', 0.3]], { x1: 0, y1: 0, x2: 0, y2: 1 }));
  const shF = rv_shadow(defs);
  const paint = k => (k === 'body' ? bodyF : k === 'metal' ? metalF : c(k));
  const parts = (to, list) => (list || []).forEach(p => S('path', {
    d: p.d, fill: p.fill ? paint(p.fill) : 'none',
    ...(p.stroke ? { stroke: paint(p.stroke), 'stroke-width': (p.w * 100).toFixed(2), 'stroke-linejoin': 'round' } : {}),
  }, to));

  // тени: мягкая под кузовом и контактные под колёсами
  S('ellipse', { cx: 0, cy: 0, rx: (L * 0.47).toFixed(1), ry: 8, fill: shF, opacity: f2(0.55 * t) }, g);
  sp.wheels.forEach(([x, r]) => S('ellipse', { cx: (x * 100).toFixed(1), cy: 0, rx: (r * 115).toFixed(1), ry: Math.max(4, r * 16).toFixed(1), fill: shF, opacity: f2(0.9 * t) }, g));
  parts(g, sp.under);
  // ниши арок, кузов
  S('path', { d: sp.arches.map(a => rv_archOpen(a) + 'Z').join(''), fill: c('well') }, g);
  const V = rv_V(sp.body), bodyD = rv_d(V);
  S('path', { d: bodyD, fill: bodyF }, g);
  // всё внутреннее — по силуэту кузова
  const id = 'rvc' + (++rv_n), cpE = S('clipPath', { id }, defs);
  S('path', { d: bodyD }, cpE);
  const k = S('g', { 'clip-path': `url(#${id})` }, g);
  parts(k, sp.trim);
  if (sp.flare) S('path', { d: sp.arches.map(rv_archOpen).join(''), fill: 'none', stroke: c('trim'), 'stroke-width': (sp.flare * 200).toFixed(1) }, k);
  S('rect', { x: (-L / 2 - 10).toFixed(1), y: (-sp.low * 100).toFixed(1), width: (L + 20).toFixed(1), height: (sp.low * 100).toFixed(1), fill: lowF }, k);
  S('path', { d: sp.glass.map(rv_dn).join(''), fill: glassF }, k);
  if (sp.band) S('path', { d: rv_open(V, sp.band[0], sp.band[1]), fill: 'none', stroke: bodyF, 'stroke-width': (sp.bandW * 200).toFixed(1), 'stroke-linejoin': 'round' }, k);
  if (sp.pillars) S('path', { d: sp.pillars.map(rv_dn).join(''), fill: bodyF }, k);
  if (sp.lines) S('path', { d: sp.lines, fill: 'none', stroke: c('line'), 'stroke-width': (sw * 0.5).toFixed(2), 'stroke-linecap': 'round', opacity: 0.9 }, k);
  if (sp.seams) S('path', { d: sp.seams, fill: 'none', stroke: c('seam'), 'stroke-width': (sw * 0.5).toFixed(2), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, k);
  if (sp.handles) S('path', { d: sp.handles, fill: 'none', stroke: c('seam'), 'stroke-width': 3.5, 'stroke-linecap': 'round' }, k);
  if (sp.head) S('path', { d: rv_dn(sp.head), fill: c('head'), opacity: 0.85 }, k);
  if (sp.tail) S('path', { d: rv_dn(sp.tail), fill: c('tail') }, k);
  S('path', { d: rv_open(V, sp.edge[0], sp.edge[1]), fill: 'none', stroke: edgeF, 'stroke-width': (sw * 2).toFixed(2), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, k);
  parts(g, sp.over);
  const wheels = sp.wheels.map(([x, r, style, N]) => rv_wheel(g, x, r, style, N, c, rimF));
  return { g, len: L, hgt: Hh, wheels };
}

// ------------------------------------------------------------------ человек ≈1,75 м (анфас)
function makePerson(parent, defs, opt = {}) {
  const t = opt.tone ?? 1, base = opt.base || '#0E1016', col = rv_tc(opt.fill || rv_C.person, t, base);
  const g = S('g', {}, parent), st = { fill: 'none', stroke: col, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  S('ellipse', { cx: 0, cy: 0, rx: 30, ry: 4.5, fill: rv_shadow(defs), opacity: f2(0.7 * t) }, g);
  S('path', { d: 'M-8.5 -95L-9.5 -6.5M8.5 -95L9.5 -6.5', 'stroke-width': 13, ...st }, g);                // ноги
  const arms = 'M-20.5 -139L-25 -84' + (opt.pose === 'point' ? 'M20.5 -139L31 -197' : 'M20.5 -139L25 -84') + 'M0 -142L0 -156';
  S('path', { d: arms, 'stroke-width': 9, ...st }, g);                                                      // руки, шея
  S('path', { d: rv_dn([[-0.215, 1.475, 0.07], [0.215, 1.475, 0.07], [0.18, 0.90, 0.03], [-0.18, 0.90, 0.03]]), fill: col }, g);
  S('circle', { cx: 0, cy: -163.5, r: 11.5, fill: col }, g);                                                // голова, верх 1,75 м
  return { g, hgt: 175 };
}

// ------------------------------------------------------------------ ряд: роботакси, пикап, тягач, кроссовер, седан
function makeRow(parent, defs, opt = {}) {
  const gap = opt.gap ?? 120, g = S('g', {}, parent);
  const vs = (opt.kinds || rv_ORDER).map(kind => { const slot = S('g', {}, g); return { kind, slot, v: makeVehicle(slot, defs, kind, opt) }; });
  const width = vs.reduce((s, o) => s + o.v.len, 0) + gap * (vs.length - 1);
  let x = -width / 2;
  const items = vs.map(o => {
    const cx = x + o.v.len / 2; x += o.v.len + gap;
    A(o.slot, 'transform', `translate(${cx.toFixed(1)} 0)`);
    return { kind: o.kind, x: cx, len: o.v.len, hgt: o.v.hgt, g: o.v.g, wheels: o.v.wheels };
  });
  return { g, items, width };
}
