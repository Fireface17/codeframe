// car_front.js — Tesla Roadster (редизайн 2026), вид спереди: многослойная векторная иллюстрация (v6: свет и материал от крена).
// Тот же масштаб и та же логика линий, что у вида сбоку (car.js, L = 1000): ось машины x = 0,
// земля y = 0, вверх — минус. Ширина кузова 444,6 ед. (W/L = 0,4446), высота ≈ 264 ед.
// Опорные точки сняты с фото-подложки assets/ref/front.jpg (proportions.json → front: W_body = 866 px,
// ось x = 1107, низ шин y = 795) и записаны в px фото: h — отступ от оси (одна половина, вторая — зеркало), p — y фото.
// Свои имена — с префиксом cf_ (глобальные имена car.js и движка не переобъявляются); итог — своя стилизация, без логотипов и надписей.
// Слои: тень → шины → кузов (фасция, пластины, сплиттер → купол → капот → грани → крылья → полоса света → швы и рёбра) → рентген → струи.
// Свет неподвижен в экране (сверху, чуть слева): у каждой грани своя нормаль, set({ roll }) пересчитывает цвета градиентов, блики
// и светлые нити рёбер под текущий крен; отражения стекла держат ориентацию экрана. Всё строится один раз; set() только выставляет атрибуты.
// Вращение (крен) делает сцена трансформацией группы-родителя (ось крена — car.pivot); roll сообщает ассету тот же угол.

// ------------------------------------------------------------------ масштаб
const cf_K = 444.6 / 866;                 // ед. на 1 px фото: ширина кузова 866 px ↔ 444,6 ед.
const cf_AX = 1107, cf_GY = 795;          // ось машины (x) и низ шин (y) на front.jpg
const cf_hx = h => h * cf_K;              // отступ от оси, px → ед.
const cf_py = p => -(cf_GY - p) * cf_K;   // y на фото → локальный y (вверх — минус)
const cf_P = { ink: '#0E1016', light: '#F4F0E6', yellow: '#FFC83D' };

// ------------------------------------------------------------------ пути
const cf_n = v => String(Math.round(v * 100) / 100);
const cf_p = p => cf_n(p[0]) + ' ' + cf_n(p[1]);
// сглаженный проход через точки (Catmull-Rom → кубические Безье); концы — изломы; путь должен уже стоять в pts[0]
function cf_run(pts, k = 1 / 6) {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += 'C' + cf_p(c1) + ' ' + cf_p(c2) + ' ' + cf_p(p2);
  }
  return d;
}
const cf_poly = (pts, close = true) => 'M' + pts.map(cf_p).join('L') + (close ? 'Z' : '');
const cf_smooth = pts => 'M' + cf_p(pts[0]) + cf_run(pts);
const cf_L = pts => pts.map(p => 'L' + cf_p(p)).join('');
// лента вдоль ломаной с сужением: ширина w0 → w1 (ед.)
function cf_band(pts, w0, w1) {
  const n = pts.length, A_ = [], B_ = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = (w0 + (w1 - w0) * i / (n - 1)) / 2;
    A_.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); B_.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  return cf_poly([...A_, ...B_.reverse()]);
}
// шина: скруглённый снизу прямоугольник (верх спрятан под крылом)
const cf_tireD = (x0, x1, yt, yb, r, rt = 6) => `M${cf_n(x0)} ${cf_n(yt + rt)}Q${cf_n(x0)} ${cf_n(yt)} ${cf_n(x0 + rt)} ${cf_n(yt)}H${cf_n(x1 - rt)}Q${cf_n(x1)} ${cf_n(yt)} ${cf_n(x1)} ${cf_n(yt + rt)}V${cf_n(yb - r)}Q${cf_n(x1)} ${cf_n(yb)} ${cf_n(x1 - r)} ${cf_n(yb)}H${cf_n(x0 + r)}Q${cf_n(x0)} ${cf_n(yb)} ${cf_n(x0)} ${cf_n(yb - r)}Z`;

// ------------------------------------------------------------------ геометрия (px фото: [h, p], h — от оси, p — y фото)
const cf_G = (() => {
  const G = {};
  const m = (sg, a) => a.map(([h, p]) => [sg * cf_hx(h), cf_py(p)]);   // → локальные точки стороны sg (−1 левая, +1 правая)
  G.m = m;
  // купол: кромка крыши y(h) = 280,3 + 0,000265·h²; светлая кромка стекла (стойка) — её осевая линия
  G.roofH = [[0, 280.3], [50, 281], [100, 283], [150, 286.3], [200, 290.9]];
  G.pillarH = [[212, 292.4], [221, 296.8], [233.5, 306], [248.8, 322], [263.7, 338], [277.8, 354], [291.4, 370], [304.4, 386], [317.2, 402], [329.9, 418], [342.8, 434], [349.5, 442.6]];
  // узлы: B — верхний угол капота, T — острие крыла, C — нижняя вершина граней (конец светлой полосы)
  G.B = [212.7, 463.5]; G.T = [379, 438.4]; G.C = [292, 604.5];
  // ребро AC между крылом и гранью (от C вверх к T)
  G.AC = [[292, 604.5], [297, 598], [305.2, 586], [315.6, 568], [325.7, 550], [335, 532], [345, 514], [354.5, 496], [363.7, 478], [369.7, 466], [374.9, 454], [377.8, 442], [379, 438.4]];
  // крыло (белый блок): внешний контур сверху вниз, нижняя кромка, внутренняя кромка (к фасции)
  G.outer = [[379, 438.4], [384.5, 442], [392.5, 448], [399.5, 454], [405.5, 460], [411.5, 466], [416.5, 472], [421.5, 478], [425.5, 484], [427.5, 490], [429.5, 502], [431.2, 512], [432.2, 522], [433, 534], [433, 598], [432, 610], [430.8, 628], [429.5, 643], [428.5, 653], [427.5, 661], [426.5, 673]];
  G.bottom = [[426.5, 673], [425, 678.5], [421, 680.5], [411, 682.5], [391, 685.5], [371, 688.5], [351, 690.5], [331, 692.5], [311, 693.5]];
  G.inner = [[311, 693.5], [308.5, 688], [304.5, 670], [299.5, 640], [295.5, 622], [292.5, 610], [292, 604.5]];
  // ниша фары: перевёрнутый треугольник у вершины C (верхняя кромка — светодиодная полоса)
  G.R1 = [337, 528.5]; G.R2 = [259, 541];
  // угловая пластина бампера под крылом (нижняя кромка спрятана под сплиттером) и сам сплиттер
  G.plate = [[423, 690.5], [391, 695.5], [351, 700.5], [311, 703.8], [313, 722], [316.5, 742], [318, 750], [412, 746], [418.5, 722], [421, 706]];
  G.lipUp = [[412, 733], [395, 735.5], [370, 739], [342, 743], [317, 745.5], [303, 743], [290, 738.5], [275, 733], [259, 729.8], [235, 729.5], [150, 729.5], [0, 729.5]];
  G.lipLo = [[0, 753], [150, 753], [235, 753], [259, 753.3], [275, 754.5], [292, 756.4], [307, 758.3], [342, 757], [384.5, 752.5], [402, 747.5], [411, 741.5], [413, 736]];
  // фасция: тёмная база между крыльями (от полосы света до сплиттера)
  G.fascia = [[292, 610], [305.1, 673], [311, 693.5], [310, 704], [316.5, 742], [318, 752]];

  // --- пути
  const R = m(1, G.roofH), L_ = m(-1, G.roofH), PR = m(1, G.pillarH), PL = m(-1, G.pillarH);
  // верхняя цепочка купола слева направо: основание → угол → крыша → центр → крыша → угол → основание
  G.domeChain = [...PL.slice().reverse(), ...L_.slice(1).reverse(), R[0], ...R.slice(1), ...PR];
  G.domeLineD = cf_smooth(G.domeChain);
  G.domeD = G.domeLineD + cf_L([...m(1, [[356, 452], [356, 470]]), ...m(-1, [[356, 470], [356, 452]])]) + 'Z';
  // кромка крыши (светлая нить): между углами стоек
  const roofPts = [PL[0], ...L_.slice(1).reverse(), R[0], ...R.slice(1), PR[0]];
  G.roofLineD = cf_smooth(roofPts);
  // то же, продолженное за углы стоек (мягкие пояса обрезаются контуром стекла, а не торцами штрихов)
  G.roofExtD = cf_smooth([m(-1, [[240, 295.7]])[0], ...roofPts, m(1, [[240, 295.7]])[0]]);

  // крыло, грань, ниша, пластина для стороны sg
  G.fender = sg => {
    const o = m(sg, G.outer), bt = m(sg, G.bottom), inn = m(sg, G.inner), ac = m(sg, G.AC);
    return 'M' + cf_p(o[0]) + cf_run(o) + cf_L(bt.slice(1)) + cf_run(inn) + cf_run(ac) + 'Z';
  };
  G.facet = sg => {
    const B = m(sg, [G.B])[0], T = m(sg, [G.T])[0], ac = m(sg, G.AC).slice().reverse();
    return 'M' + cf_p(B) + 'L' + cf_p(T) + cf_run(ac) + 'Z';
  };
  G.recess = sg => cf_poly(m(sg, [G.R1, G.R2, G.C]));
  G.plateD = sg => cf_poly(m(sg, G.plate));
  G.hoodD = (() => {
    const B1 = m(-1, [G.B])[0], B2 = m(1, [G.B])[0], C1 = m(-1, [G.C])[0], C2 = m(1, [G.C])[0];
    const e1 = m(-1, [[290, 609]])[0], e2 = m(1, [[290, 609]])[0];
    return 'M' + cf_p(B1) + 'Q' + cf_p([0, cf_py(459.5)]) + ' ' + cf_p(B2) + 'L' + cf_p(C2) + 'L' + cf_p(e2) + 'L' + cf_p(e1) + 'L' + cf_p(C1) + 'Z';
  })();
  // сплиттер целиком: верхняя кромка слева направо, затем нижняя справа налево
  G.lipD = (() => {
    const ul = m(-1, G.lipUp), ur = m(1, G.lipUp).reverse(), lr = m(1, G.lipLo).reverse(), ll = m(-1, G.lipLo);
    return 'M' + cf_p(ul[0]) + cf_run(ul) + cf_run(ur) + 'L' + cf_p(lr[0]) + cf_run(lr) + cf_run(ll) + 'Z';
  })();
  G.fasciaD = cf_poly([...m(-1, G.fascia), ...m(1, G.fascia).reverse()]);
  G.slabD = (() => {
    const hh = p => 292 + 0.205 * (p - 604.5), t = 618.5, b = 673.5;
    return cf_poly([...m(-1, [[hh(t), t], [hh(b), b]]), ...m(1, [[hh(b), b], [hh(t), t]])]);
  })();
  // силуэт кузова (без шин): купол → острие крыла → внешний контур → пластина → сплиттер; левая половина — зеркало
  G.bodyD = (() => {
    const half = sg => ({
      dome: [m(sg, [[0, 280.3]])[0], ...m(sg, G.roofH.slice(1)), ...m(sg, G.pillarH)],
      out: m(sg, G.outer),
      chamfer: m(sg, [[425, 678.5], [421, 680.5]]),
      low: m(sg, [[423, 690.5], [421, 705], [418.5, 722], [416, 732], [413, 738], [402, 747.5], [384.5, 752.5], [342, 757], [307, 758.3], [292, 756.4], [275, 754.5], [259, 753.3], [235, 753], [150, 753], [0, 753]]),
    });
    const r = half(1), l = half(-1);
    let d = 'M' + cf_p(r.dome[0]) + cf_run(r.dome) + 'L' + cf_p(r.out[0]) + cf_run(r.out) + cf_L([...r.chamfer, r.low[0]]) + cf_run(r.low);
    d += cf_run(l.low.slice().reverse()) + cf_L([l.chamfer[1], l.chamfer[0], l.out[l.out.length - 1]]) + cf_run(l.out.slice().reverse());
    // открытый контур без купола: от основания правой стойки вокруг низа к основанию левой (купол обводят свои кромки и стойки)
    G.outlineD = 'M' + cf_p(r.dome[r.dome.length - 1]) + 'L' + cf_p(r.out[0]) + cf_run(r.out) + cf_L([...r.chamfer, r.low[0]]) + cf_run(r.low) +
      cf_run(l.low.slice().reverse()) + cf_L([l.chamfer[1], l.chamfer[0], l.out[l.out.length - 1]]) + cf_run(l.out.slice().reverse()) + 'L' + cf_p(l.dome[l.dome.length - 1]);
    d += 'L' + cf_p(l.dome[l.dome.length - 1]) + cf_run(l.dome.slice().reverse()) + 'Z';
    return d;
  })();
  return G;
})();

// ------------------------------------------------------------------ свет и материал (зависят от крена)
// Свет неподвижен в экране: ключевой — сверху, чуть слева и спереди; «небо» — полусфера сверху; блик — по полувектору к зрителю.
// Нормали граней заданы в осях рисунка (x вправо, y вниз, z к зрителю). Крен roll поворачивает машину по часовой (как rotate в SVG),
// поэтому свет переводится в оси машины поворотом на −roll; яркость грани: окружение + рассеянный (мягкий терминатор) + небо + блик.
const cf_n3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const cf_dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cf_LS = cf_n3(-0.38, -0.84, 0.42);   // на источник, оси экрана
function cf_light(roll = 0) {
  const a = -roll * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const rot = v => [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  const L = rot(cf_LS);
  return { L, U: rot([0, -1, 0]), H: cf_n3(L[0], L[1], L[2] + 1), roll, cr: Math.cos(roll * Math.PI / 180) };
}
const cf_ramp = stops => stops.map(([t, h]) => [t, [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))]);
function cf_rampC(r, t) {
  t = Math.min(1, Math.max(0, t));
  let i = 1; while (i < r.length - 1 && t > r[i][0]) i++;
  const [t0, c0] = r[i - 1], [t1, c1] = r[i], u = Math.min(1, Math.max(0, (t - t0) / ((t1 - t0) || 1)));
  const ch = k => Math.round(c0[k] + (c1[k] - c0[k]) * u);
  return '#' + ((1 << 24) + (ch(0) << 16) + (ch(1) << 8) + ch(2)).toString(16).slice(1);
}
// a — окружение, d — рассеянный (w — мягкость терминатора), h — небо, s/p — блик; ramp — яркость → цвет
const cf_MAT = {
  paint: { a: 0.02, d: 0.62, w: 0.15, h: 0.22, s: 0.16, p: 20, ramp: cf_ramp([[0, '#1B1D23'], [0.12, '#272930'], [0.25, '#383B44'], [0.4, '#5B5F6A'], [0.52, '#7F838D'], [0.62, '#A4A7AF'], [0.72, '#C6C8CE'], [0.82, '#E0E1E5'], [1, '#F8F9FB']]) },
  dark: { a: 0.05, d: 0.2, w: 0.2, h: 0.3, s: 0.5, p: 14, ramp: cf_ramp([[0, '#07080B'], [0.35, '#13151B'], [0.65, '#252831'], [0.85, '#3B3F4A'], [1, '#5C616E']]) },
  rubber: { a: 0.38, d: 0.4, w: 0.3, h: 0.3, s: 0.2, p: 8, ramp: cf_ramp([[0, '#1E2126'], [0.4, '#2B2F36'], [0.62, '#383D46'], [0.8, '#4B515C'], [0.92, '#5E6470'], [1, '#737A87']]) },
};
const cf_bright = (m, n, Lt) => m.a + m.d * Math.max(0, (cf_dot(n, Lt.L) + m.w) / (1 + m.w)) + m.h * (0.5 + 0.5 * cf_dot(n, Lt.U)) + m.s * Math.pow(Math.max(0, cf_dot(n, Lt.H)), m.p);
const cf_shade = (m, n, Lt) => cf_rampC(m.ramp, cf_bright(m, n, Lt));
const cf_sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// ------------------------------------------------------------------ вид спереди
// makeCarFront(parent, defs, { id }) → { g, body, tires, shadow, lights, xray, jets, set(state), W, H, track, pivot, nozzles, G }
//   g — корневая группа (ось машины x = 0, земля y = 0); крен делает сцена: rotate(угол, pivot[0], pivot[1]) на группе-родителе.
//   W, H, track — ширина кузова, высота, колея (по центрам шин), ед.; pivot — ось крена [0, −112]; nozzles — точки выхода и направление сопел.
//   set(state): { roll — текущий крен группы, град (как у сцены: + по часовой; по умолчанию 0) — свет, блики, отражения стекла;
//     xray 0..1 — рентген; body 0..1 — кузов (и шины, если нет wheels); wheels 0..1; shadow 0..1 (контактная тень, гаснет при крене);
//     lights 0..1 — полоса и диоды; gloss 0..1 — проход блика; frame, x_tanks, x_pipes, x_nozzles 0..1 — части рентгена; t — время, с;
//     jet: { downL, downR, sideL, sideR } 0..1 — струи; ground — до земли вдоль нижних струй (число или { downL, downR }), reach — длина боковых }
function makeCarFront(parent, defs, opt = {}) {
  const id = opt.id || 'carf' + (makeCarFront.n = (makeCarFront.n || 0) + 1);
  const G = cf_G, m = G.m, hx = cf_hx, py = cf_py, MAT = cf_MAT;
  const root = S('g', { 'stroke-miterlimit': 2 }, parent);
  const lg = (stops, x1, y1, x2, y2) => linGrad(defs, stops, { x1, y1, x2, y2, units: 'userSpaceOnUse' });
  const eg = stops => radGrad(defs, stops);   // эллиптический (по рамке фигуры)
  const clip = (name, d) => { const c = S('clipPath', { id: id + name, clipPathUnits: 'userSpaceOnUse' }, defs); S('path', { d }, c); return `url(#${id + name})`; };
  const bodyClip = clip('-body', G.bodyD);
  const SG = [-1, 1];   // −1 — левая половина, +1 — правая

  // ---------------- реестр освещения: всё строится здесь, relight(roll) только выставляет атрибуты
  const FACES = [], RIMS = [], SHEENS = [], RELIEF = [];
  let gN = 0;
  const dynGrad = (offs, alphas) => {
    const gid = id + '-lit' + (++gN);
    const el = S('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    const stops = offs.map((o, i) => S('stop', { offset: o, 'stop-color': '#808080', 'stop-opacity': alphas ? alphas[i] : 1 }, el));
    return { url: `url(#${gid})`, el, stops };
  };
  // грань-«заплатка»: нормаль n в центре c, кривизна k = [kx, ky] (1/ед.), полуразмах e; градиент идёт вдоль проекции света
  const patch = (d, parent_, o) => {
    const g = dynGrad([0, 0.5, 1]); FACES.push({ ...o, m: o.m || MAT.paint, n: cf_n3(...o.n), offs: [0, 0.5, 1], g });
    return S('path', { d, fill: g.url, ...(o.attrs || {}) }, parent_);
  };
  // полоса с заданными нормалями по неподвижной оси p1 → p2 (цилиндры: шины, сплиттер)
  const strip = (d, parent_, o) => {
    const g = dynGrad(o.offs, o.alpha); A(g.el, 'x1', f2(o.p1[0])); A(g.el, 'y1', f2(o.p1[1])); A(g.el, 'x2', f2(o.p2[0])); A(g.el, 'y2', f2(o.p2[1]));
    FACES.push({ ...o, ns: o.ns.map(v => cf_n3(...v)), g });
    return S('path', { d, fill: g.url, ...(o.attrs || {}) }, parent_);
  };
  // светлая нить по ребру: непрозрачность a0 + a1·(n·L)³, n — нормаль фаски ребра
  const rimLine = (d, parent_, n, w, a0, a1, color = '#FFFFFF', extra = {}) => {
    const el = S('path', { d, fill: 'none', stroke: color, 'stroke-width': w, opacity: a0, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra }, parent_);
    RIMS.push({ el, n: cf_n3(...n), a0, a1 }); return el;
  };
  // блик на выпуклой грани: стоит там, где нормаль смотрит по полувектору; яркость — (n·H)^p
  const sheen = (el, o) => { SHEENS.push({ el, ...o, n: cf_n3(...o.n) }); return el; };
  // рельеф: деталь светлее/темнее основы по разнице яркостей нормалей n и nb
  const relief = (el, o) => { RELIEF.push({ el, ...o, n: cf_n3(...o.n), nb: cf_n3(...o.nb) }); return el; };

  // ---------------- тень: мягкое пятно + плотные контакты шин
  const shadow = S('g', {}, opt.shadowParent || root);   // opt.shadowParent — группа в осях мира: тень не вращается вместе с кузовом
  S('ellipse', { cx: 0, cy: 3, rx: 330, ry: 30, fill: eg([[0, '#000', 0.78], [0.55, '#000', 0.4], [1, '#000', 0]]) }, shadow);
  SG.forEach(sg => S('ellipse', { cx: sg * 185.6, cy: 1, rx: 46, ry: 6, fill: eg([[0, '#000', 0.95], [0.6, '#000', 0.6], [1, '#000', 0]]) }, shadow));

  // ---------------- шины: видны под крылом и пластиной. Протектор — цилиндр (нормаль от «вперёд» вверху до «вниз» у земли),
  // плечи — свои нормали; канавки, ламели (сгущаются к пятну контакта), светлая кромка боковины, тень в арке.
  const tires = S('g', {}, root);
  const tireXo = hx(430), tireXi = hx(293), tireTop = py(681), TR = 77.5, TYC = -77.5;
  SG.forEach(sg => {
    const xa = sg * tireXo, xb = sg * tireXi, x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), w = x1 - x0;
    const d = cf_tireD(x0, x1, tireTop, 0, 13, 4);
    strip(d, tires, { m: MAT.rubber, p1: [0, tireTop], p2: [0, 0], offs: [0, 0.45, 0.8, 1], ns: [[0, 0.25, 0.97], [0, 0.6, 0.8], [0, 0.88, 0.47], [0, 1, 0.08]] });
    strip(d, tires, { m: MAT.rubber, p1: [xa, 0], p2: [xb, 0], offs: [0, 0.2, 0.8, 1], alpha: [0.9, 0, 0, 0.8], ns: [[sg * 0.9, 0.35, 0.28], [sg * 0.5, 0.4, 0.77], [-sg * 0.5, 0.4, 0.77], [-sg * 0.9, 0.35, 0.28]] });
    // протектор: 4 продольные канавки + ламели между ними (шаг по углу обода → у земли гуще)
    const gx = [0.2, 0.4, 0.6, 0.8].map(f => lerp(x0, x1, f));
    let tread = gx.map(x => `M${cf_n(x)} ${cf_n(tireTop + 1)}V-5`).join('');
    const ribs = [[x0 + 3, gx[0]], [gx[0], gx[1]], [gx[1], gx[2]], [gx[2], gx[3]], [gx[3], x1 - 3]];
    ribs.forEach(([ra, rb], k) => {
      if (k !== 0 && k !== 4) return;
      for (let a = 18 + (k === 2 ? 6 : 0); a < 76; a += 12) {
        const y = TYC + TR * Math.sin(a * Math.PI / 180); if (y < tireTop + 3 || y > -3) continue;
        tread += `M${cf_n(ra + 1.4)} ${cf_n(y)}H${cf_n(rb - 1.4)}`;
      }
    });
    S('path', { d: tread, fill: 'none', stroke: '#030405', 'stroke-width': 0.9, opacity: 0.6 }, tires);
    rimLine(tread, tires, [0, 0.5, 0.87], 0.75, 0.1, 0.4, '#C2C8D2', { transform: 'translate(0.9 -0.7)' });
    // блик протектора: пояс у пятна контакта светится, когда низ шины смотрит на свет (вверх колёсами)
    const tc = S('g', { 'clip-path': clip('-tire' + sg, d) }, tires);
    const tsh = S('rect', { x: x0, y: -21, width: w, height: 20, fill: lg([[0, '#FFFFFF', 0], [0.55, '#E6EBF2', 0.32], [1, '#FFFFFF', 0.04]], 0, -21, 0, -1) }, tc);
    RIMS.push({ el: tsh, n: cf_n3(0, 0.9, 0.42), a0: 0, a1: 0.95 });
    // светлая кромка боковины ≈2,2 ед. (≈3 px при ширине кузова 600 px): видна всегда, ярче со стороны света; огибает скругление у земли
    const edge = (x, s2) => `M${cf_n(x)} ${cf_n(tireTop + 4)}V${cf_n(-13)}Q${cf_n(x)} ${cf_n(-1.1)} ${cf_n(x + s2 * 13)} ${cf_n(-1.1)}`;
    rimLine(edge(xa - sg * 1.1, -sg), tires, [sg * 0.85, 0.3, 0.44], 2.2, 0.72, 0.28, '#9AA1AB');
    rimLine(edge(xb + sg * 1.1, sg), tires, [-sg * 0.85, 0.3, 0.44], 2.0, 0.55, 0.3, '#9AA1AB');
    // нижняя кромка протектора: при 0° на земле почти не видна, вверх колёсами — светлая «верхушка» шины
    rimLine(`M${cf_n(x0 + 13)} ${cf_n(-1.1)}H${cf_n(x1 - 13)}`, tires, [0, 1, 0.12], 2.2, 0.05, 0.9, '#9AA1AB');
    // тень в арке: кузов закрывает небо
    S('rect', { x: x0, y: tireTop, width: w, height: 20, fill: lg([[0, '#000', 0.8], [0.5, '#000', 0.35], [1, '#000', 0]], 0, tireTop, 0, tireTop + 20) }, tires);
  });

  // ---------------- кузов
  const body = S('g', {}, root);
  const fill = S('g', { 'clip-path': bodyClip }, body);
  S('path', { d: G.bodyD, fill: '#16181E' }, fill);   // подложка: швы между деталями не просвечивают фон

  // фасция: чёрная ниша; плита под полосой света — глянцевый чёрный с отражением; затенение под кромкой капота
  S('path', { d: G.fasciaD, fill: '#06070A' }, fill);
  const slabY0 = py(618.5), slabY1 = py(673.5);
  patch(G.slabD, fill, { m: MAT.dark, c: [0, (slabY0 + slabY1) / 2], e: 22, n: [0, 0.12, 0.99], k: [1 / 520, 1 / 45] });
  const slabRefl = S('rect', { x: -170, y: -9, width: 340, height: 18, fill: lg([[0, '#FFFFFF', 0], [0.5, '#DDE3EE', 0.16], [1, '#FFFFFF', 0]], 0, -9, 0, 9) }, S('g', { 'clip-path': clip('-slab', G.slabD) }, fill));
  sheen(slabRefl, { c: [0, (slabY0 + slabY1) / 2], n: [0, 0.12, 0.99], k: [0, 1 / 40], ex: 0, ey: 12, p: 4, a: 1 });
  S('path', { d: G.slabD, fill: lg([[0, '#000', 0.55], [0.35, '#000', 0.12], [1, '#000', 0]], 0, slabY0, 0, slabY0 + 18) }, fill);
  const slabEdge = (p, n, a0, a1) => { const hh = hx(292 + 0.205 * (p - 604.5)); rimLine(`M${cf_n(-hh + 2)} ${cf_n(py(p))}H${cf_n(hh - 2)}`, fill, n, 1.2, a0, a1, '#9AA0AE'); };
  slabEdge(624, [0, -0.75, 0.66], 0.12, 0.55);
  slabEdge(672, [0, 0.75, 0.66], 0.08, 0.5);
  // фасция у крыльев темнее (затенение у внутренних кромок)
  SG.forEach(sg => S('path', { d: G.fasciaD, fill: lg([[0, '#000', 0.6], [1, '#000', 0]], sg * hx(300), 0, sg * hx(255), 0) }, fill));

  // угловые пластины бампера: тёмный пластик
  SG.forEach(sg => patch(G.plateD(sg), fill, { m: MAT.dark, c: [sg * hx(368), py(721)], e: 24, n: [sg * 0.32, 0.18, 0.93], k: [1 / 110, 1 / 55] }));
  // сплиттер: низкая плита со скруглённой передней кромкой — верх ловит небо, низ — пол
  strip(G.lipD, fill, { m: MAT.dark, p1: [0, py(729.5)], p2: [0, py(759)], offs: [0, 0.3, 0.7, 1], ns: [[0, -0.9, 0.44], [0, -0.3, 0.95], [0, 0.3, 0.95], [0, 0.85, 0.53]] });

  // ---------------- стекло-купол: тёмная бронза + отражения окружения (по экрану), блик бежит по стеклу при крене
  const glassG = S('g', {}, body);
  const glassClip = clip('-glass', G.domeD);
  S('path', { d: G.domeD, fill: lg([[0, '#140E0D'], [0.3, '#211816'], [0.62, '#372A24'], [1, '#4E3D33']], 0, py(280), 0, py(466)) }, glassG);
  const refl = S('g', { 'clip-path': glassClip }, glassG);
  const DC = [0, py(372)], DA = 150, DB = 46, NG = cf_n3(0, -0.55, 0.83);
  // отражение пола: тёмная зона под горизонтом; горизонт — тонкая светлая нить; небо — мягкая светлая полоса; блик — широкое пятно
  const horizon = S('g', {}, refl);
  S('rect', { x: -260, y: -2, width: 520, height: 70, fill: lg([[0, '#000', 0.22], [0.4, '#000', 0.1], [1, '#000', 0]], 0, -2, 0, 68) }, horizon);
  S('rect', { x: -260, y: -22, width: 520, height: 20, fill: lg([[0, '#E9D9C8', 0], [1, '#E9D9C8', 0.07]], 0, -22, 0, -2) }, horizon);
  S('path', { d: 'M-260 6Q0 -9 260 6', fill: 'none', stroke: lg([[0, '#F1E4D6', 0], [0.3, '#F1E4D6', 0.2], [0.55, '#F1E4D6', 0.26], [1, '#F1E4D6', 0]], -260, 0, 260, 0), 'stroke-width': 1 }, horizon);
  const sky = S('rect', { x: -230, y: -17, width: 460, height: 34, fill: lg([[0, '#FFFFFF', 0], [0.42, '#F6EEE6', 0.2], [0.62, '#F6EEE6', 0.12], [1, '#FFFFFF', 0]], 0, -17, 0, 17) }, refl);
  const glint = S('ellipse', { cx: 0, cy: 0, rx: 118, ry: 30, fill: eg([[0, '#FFF6EC', 0.2], [0.45, '#FFF6EC', 0.08], [1, '#FFF6EC', 0]]) }, refl);
  // стекло загибается назад — мягкий светлый пояс вдоль передней кромки крыши (вложенные штрихи дают спад)
  const roofBand = S('g', { fill: 'none', stroke: '#F4E8DC' }, refl);
  [[16, 0.035], [9, 0.05], [4, 0.07]].forEach(([w, a]) => S('path', { d: G.roofExtD, 'stroke-width': w, opacity: a }, roofBand));
  RIMS.push({ el: roofBand, n: cf_n3(0, -0.92, 0.38), a0: 0.25, a1: 0.9 });
  // кромка крыши: тонкая светлая нить
  rimLine(G.roofLineD, glassG, [0, -0.92, 0.38], 1.5, 0.12, 0.62, '#F4E8DC');
  // стойки: светлая кромка стекла, сужается кверху; ярче со стороны света
  SG.forEach(sg => {
    const pts = m(sg, G.pillarH).slice().reverse();   // от основания вверх
    const band = S('path', { d: cf_band(pts, 3.0, 1.9), fill: lg([[0, '#FFFFFF', 0.98], [0.85, '#FFFFFF', 0.95], [1, '#FFFFFF', 0.5]], 0, py(442), 0, py(297)) }, glassG);
    RIMS.push({ el: band, n: cf_n3(sg * 0.8, -0.35, 0.48), a0: 0.42, a1: 0.58 });
    rimLine(cf_smooth(pts.map(([x, y]) => [x - sg * 1.6, y - 0.4])), glassG, [sg * 0.6, -0.4, 0.7], 0.9, 0.06, 0.22, '#F4E8DC');
  });

  // ---------------- капот: плоскость, к носу скругляется вниз (кривизна вдоль y), чуть выпуклая поперёк
  const barHalf = hx(291.5), barY0 = py(609.5), barY1 = py(612.9), barYc = (barY0 + barY1) / 2;
  const hoodClip = clip('-hood', G.hoodD), hood = S('g', { 'clip-path': hoodClip }, body);
  const HOOD = { c: [0, py(536)], e: 44, n: [0, -0.5, 0.87], k: [1 / 520, 1 / 95] };
  patch(G.hoodD, hood, HOOD);
  // блик капота: мягкая поперечная полоса, ездит вдоль капота с креном
  sheen(S('rect', { x: -170, y: -15, width: 340, height: 30, fill: lg([[0, '#FFFFFF', 0], [0.5, '#FFFFFF', 0.3], [1, '#FFFFFF', 0]], 0, -15, 0, 15) }, hood), { ...HOOD, k: [0, 1 / 105], ex: 0, ey: 40, p: 10, a: 0.9 });
  // передняя кромка капота: свет полосы подсвечивает передний край (hoodGlow гаснет вместе с lights)
  const hoodGlow = S('g', {}, hood);
  S('rect', { x: -hx(296), y: py(586), width: hx(592), height: py(609) - py(586), fill: lg([[0, '#FFF', 0], [0.7, '#FFF', 0.06], [1, '#FFF', 0.16]], 0, py(586), 0, py(609)) }, hoodGlow);
  S('rect', { x: -hx(296), y: barYc - 6, width: hx(592), height: 12, fill: lg([[0, '#FFFFFF', 0], [0.6, '#FFFFFF', 0.2], [1, '#FFFFFF', 0.04]], 0, barYc - 6, 0, barYc + 6) }, hoodGlow);

  // ---------------- верхние грани крыльев (треугольники B–T–C) с нишами фар
  SG.forEach(sg => {
    const fd = G.facet(sg), gf = S('g', { 'clip-path': clip('-facet' + sg, fd) }, body);
    const B = m(sg, [G.B])[0], T = m(sg, [G.T])[0], C = m(sg, [G.C])[0], rc = m(sg, [G.R1, G.R2, G.C]);
    const FC = { c: [(B[0] + T[0] + C[0]) / 3, (B[1] + T[1] + C[1]) / 3], e: 55, n: [sg * 0.42, -0.6, 0.68], k: [1 / 380, 1 / 380] };
    patch(fd, gf, FC);
    sheen(S('ellipse', { cx: 0, cy: 0, rx: 46, ry: 19, fill: eg([[0, '#FFFFFF', 0.42], [1, '#FFFFFF', 0]]), transform: '' }, gf), { ...FC, k: [1 / 140, 1 / 140], ex: 40, ey: 30, p: 12, a: 0.75 });
    // затенение вокруг ниши (мягкие вложенные штрихи)
    const nicheAO = S('g', { fill: 'none', stroke: '#05060A', 'stroke-linejoin': 'round' }, gf);
    [[9, 0.1], [5, 0.14], [2.4, 0.2]].forEach(([w, a]) => S('path', { d: cf_poly(rc), 'stroke-width': w, opacity: a }, nicheAO));
    // ниша фары: светлый треугольник под диодной полосой, тёмные стенки
    S('path', { d: cf_poly(rc), fill: lg([[0, '#C9CCD4'], [0.35, '#979AA4'], [1, '#6A6D78']], 0, rc[0][1], 0, rc[2][1]) }, gf);
    S('path', { d: cf_poly([rc[0], rc[2]], false), fill: 'none', stroke: '#0A0B10', 'stroke-width': 1.3, opacity: 0.65, 'stroke-linecap': 'round' }, gf);
    S('path', { d: cf_poly([rc[1], rc[2]], false), fill: 'none', stroke: '#0A0B10', 'stroke-width': 1.0, opacity: 0.5, 'stroke-linecap': 'round' }, gf);
  });

  // ---------------- крылья: выпуклые блоки; кромка уходит вбок (своя нормаль), складка носа — свет над ней, тень под ней
  SG.forEach(sg => {
    const fd = G.fender(sg), gf = S('g', { 'clip-path': clip('-fender' + sg, fd) }, body);
    const FN = { c: [sg * 192, -120], e: 72, n: [sg * 0.45, -0.1, 0.89], k: [1 / 140, 1 / 150] };
    patch(fd, gf, FN);
    // наружная кромка: поверхность заворачивает вбок
    strip(`M${cf_n(sg * hx(440))} ${cf_n(py(430))}H${cf_n(sg * hx(380))}V${cf_n(py(700))}H${cf_n(sg * hx(440))}Z`, gf, { m: MAT.paint, p1: [sg * hx(434), 0], p2: [sg * hx(392), 0], offs: [0, 0.45, 1], alpha: [0.92, 0.4, 0], ns: [[sg * 0.95, -0.05, 0.3], [sg * 0.78, -0.06, 0.62], [sg * 0.6, -0.07, 0.8]] });
    // низ крыла подворачивается
    strip(`M${cf_n(sg * hx(440))} ${cf_n(py(640))}H${cf_n(sg * hx(290))}V${cf_n(py(700))}H${cf_n(sg * hx(440))}Z`, gf, { m: MAT.paint, p1: [0, py(694)], p2: [0, py(650)], offs: [0, 0.5, 1], alpha: [0.85, 0.35, 0], ns: [[sg * 0.35, 0.75, 0.56], [sg * 0.4, 0.4, 0.82], [sg * 0.42, 0.15, 0.9]] });
    sheen(S('ellipse', { cx: 0, cy: 0, rx: 30, ry: 44, fill: eg([[0, '#FFFFFF', 0.5], [1, '#FFFFFF', 0]]) }, gf), { ...FN, ex: 32, ey: 52, p: 10, a: 0.65 });
    // складка носа: гребень от плеча к вершине C
    const ridge = [[418, 552], [357, 579], [293, 603]], up = ridge.map(([h, p]) => [h, p - 6]), dn = ridge.map(([h, p]) => [h, p + 10]);
    const rU = S('g', { fill: 'none', 'stroke-linecap': 'round' }, gf), rD = S('g', { fill: 'none', 'stroke-linecap': 'round' }, gf);
    [[16, 0.35], [10, 0.5], [5, 0.7]].forEach(([w, a]) => S('path', { d: cf_smooth(m(sg, up)), 'stroke-width': w, opacity: a }, rU));
    [[18, 0.35], [11, 0.5], [6, 0.7]].forEach(([w, a]) => S('path', { d: cf_smooth(m(sg, dn)), 'stroke-width': w, opacity: a }, rD));
    relief(rU, { m: MAT.paint, n: [sg * 0.35, -0.62, 0.7], nb: FN.n, k: 0.38, attr: 'stroke' });
    relief(rD, { m: MAT.paint, n: [sg * 0.3, 0.45, 0.84], nb: FN.n, k: 0.45, attr: 'stroke' });
    rimLine(cf_smooth(m(sg, ridge)), gf, [sg * 0.4, -0.35, 0.85], 1.3, 0.1, 0.6);
    // у внутренней кромки (к фасции) — затенение
    const inn = m(sg, G.inner);
    S('path', { d: cf_smooth(inn), fill: 'none', stroke: '#05060A', 'stroke-width': 7, opacity: 0.18, transform: `translate(${-sg * 2} 0)` }, gf);
  });

  // ---------------- свет: полоса через весь нос (ядро, мягкое свечение, отсвет) и диоды в нишах с ореолом
  const lights = S('g', {}, body);
  S('ellipse', { cx: 0, cy: barYc, rx: barHalf + 46, ry: 17, fill: eg([[0, '#FFF7EA', 0.2], [0.5, '#FFF7EA', 0.07], [1, '#FFF7EA', 0]]) }, lights);
  S('rect', { x: -barHalf - 2, y: barYc - 7, width: 2 * barHalf + 4, height: 14, fill: lg([[0, '#FFFFFF', 0], [0.5, '#FFFFFF', 0.36], [1, '#FFFFFF', 0]], 0, barYc - 7, 0, barYc + 7) }, lights);
  S('rect', { x: -barHalf, y: barY0, width: 2 * barHalf, height: barY1 - barY0, rx: 1.1, fill: lg([[0, '#FFF3DC'], [0.12, '#FFFFFF'], [0.88, '#FFFFFF'], [1, '#FFF3DC']], -barHalf, 0, barHalf, 0) }, lights);
  S('path', { d: `M${cf_n(-barHalf + 3)} ${cf_n(py(615.4))}H${cf_n(barHalf - 3)}`, stroke: '#0A0B10', 'stroke-width': 1.6, opacity: 0.8 }, lights);
  const ray = lg([[0, '#FFFFFF', 0.32], [1, '#FFFFFF', 0]], 0, 0, 0, 1);   // луч: единичная длина, масштабируется transform'ом
  SG.forEach(sg => {
    const rc = m(sg, [G.R1, G.R2, G.C]), a = rc[0], b = rc[1];
    const dx = b[0] - a[0], dy = b[1] - a[1], nl = Math.hypot(dx, dy);
    let nx = -dy / nl, ny = dx / nl; if (ny < 0) { nx = -nx; ny = -ny; }
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang = Math.atan2(dy, dx) * 180 / Math.PI;
    // ореол вокруг диодов (без обрезки — свет выходит за нишу)
    S('ellipse', { cx: 0, cy: 0, rx: 44, ry: 17, fill: eg([[0, '#FFFFFF', 0.4], [0.35, '#F2F6FF', 0.16], [1, '#F2F6FF', 0]]), transform: `translate(${cf_n(mid[0] + nx * 3)} ${cf_n(mid[1] + ny * 3)}) rotate(${cf_n(ang > 90 ? ang - 180 : ang < -90 ? ang + 180 : ang)})` }, lights);
    const gl = S('g', { 'clip-path': `url(#${id}-facet${sg})` }, lights);
    // диодная полоса: ярко-белая у верхней кромки, мягко гаснет вниз (по нормали к кромке)
    S('path', { d: cf_poly(rc), fill: lg([[0, '#FFFFFF', 1], [0.55, '#FDFEFF', 1], [0.75, '#EEF1F6', 0.6], [0.9, '#D2D7E0', 0.2], [1, '#B9BEC8', 0]], mid[0], mid[1], mid[0] + nx * 15, mid[1] + ny * 15) }, gl);
    [0.3, 0.5, 0.7].forEach((f, k) => {
      const x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f) + 4, len = 9 + 6 * hash01(k, 4);
      S('path', { d: 'M0 0V1', stroke: ray, 'stroke-width': 1.1, transform: `translate(${cf_n(x)} ${cf_n(y)}) scale(1 ${cf_n(len)})` }, gl);
    });
    // диоды: ряд светлых точек вдоль кромки и светлая кромка линзы
    S('path', { d: cf_poly([[a[0] + nx * 3.4 + dx * 0.06, a[1] + ny * 3.4 + dy * 0.06], [b[0] + nx * 3.4 - dx * 0.06, b[1] + ny * 3.4 - dy * 0.06]], false), fill: 'none', stroke: '#FFFFFF', 'stroke-width': 1.9, 'stroke-dasharray': '0 4.3', 'stroke-linecap': 'round', opacity: 0.95 }, gl);
    S('path', { d: cf_poly([a, b], false), fill: 'none', stroke: '#FFFFFF', 'stroke-width': 1.2, opacity: 0.9, 'stroke-linecap': 'round' }, gl);
  });

  // ---------------- швы и рёбра: тёмный шов постоянен, светлые нити по кромкам — от нормали фаски (бегут при крене)
  const lines = S('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'clip-path': bodyClip }, body);
  const dark = (d, w = 1, a = 0.6, extra = {}) => S('path', { d, stroke: '#0E1016', 'stroke-width': w, opacity: a, ...extra }, lines);
  // шов капота (передняя кромка верхней панели), чуть V-образный: тёмная щель + кромка, ловящая небо
  const hoodSeam = `M${cf_n(-hx(230.3))} ${cf_n(py(496.6))}Q0 ${cf_n(py(491.8))} ${cf_n(hx(230.3))} ${cf_n(py(496.6))}`;
  dark(hoodSeam, 1.1, 0.62);
  rimLine(hoodSeam, lines, [0, -0.85, 0.52], 1, 0.06, 0.4, '#FFFFFF', { transform: 'translate(0 1.1)' });
  SG.forEach(sg => {
    const B = m(sg, [G.B])[0], C = m(sg, [G.C])[0], T = m(sg, [G.T])[0];
    // V-ребро капот/грань: тонкий шов и фаска
    dark(cf_poly([B, C], false), 1, 0.5);
    rimLine(cf_poly([B, C], false), lines, [sg * 0.55, -0.55, 0.63], 1.1, 0.05, 0.6, '#FFFFFF', { transform: `translate(${sg * 1.1} 0)` });
    // ребро крыло/грань
    dark(cf_smooth(m(sg, G.AC)), 1.1, 0.55);
    rimLine(cf_smooth(m(sg, G.AC)), lines, [sg * 0.62, -0.5, 0.6], 1.1, 0.05, 0.62, '#FFFFFF', { transform: `translate(${sg * 1.2} 0)` });
    // внутренняя кромка крыла у фасции
    const inn = cf_smooth(m(sg, G.inner));
    dark(inn, 1.2, 0.6);
    rimLine(inn, lines, [-sg * 0.7, 0.2, 0.68], 1.1, 0.04, 0.5, '#FFFFFF', { transform: `translate(${-sg * 1.1} 0)` });
    // нижняя кромка крыла: зазор над пластиной и светлая фаска (ловит свет, когда машина вверх колёсами)
    dark(cf_poly(m(sg, G.bottom.slice(2)), false), 1.3, 0.75, { transform: 'translate(0 0.8)' });
    rimLine(cf_poly(m(sg, G.bottom.slice(1)), false), lines, [sg * 0.25, 0.9, 0.35], 1.1, 0.03, 0.6, '#FFFFFF', { transform: 'translate(0 -0.9)' });
    // наружный контур крыла: контровая нить по силуэту
    rimLine(cf_smooth(m(sg, G.outer)), lines, [sg * 0.92, -0.25, 0.3], 1.4, 0.04, 0.7, '#FFFFFF', { transform: `translate(${-sg * 1.1} 0.6)` });
    // верхняя кромка грани B–T
    rimLine(cf_poly([B, T], false), lines, [sg * 0.3, -0.88, 0.37], 1.2, 0.08, 0.75);
    // сплиттер: нить по верхней кромке и по нижней; пластина — по наружной кромке
    rimLine(cf_smooth(m(sg, G.lipUp)), lines, [0, -0.92, 0.4], 1, 0.08, 0.7, '#B9BFCC');
    rimLine(cf_smooth(m(sg, G.lipLo)), lines, [0, 0.92, 0.4], 0.9, 0.06, 0.65, '#D8DCE6', { transform: 'translate(0 -0.8)' });
    rimLine(cf_poly(m(sg, [[423, 690.5], [421, 706], [418.5, 722], [416, 732]]), false), lines, [sg * 0.9, 0.1, 0.42], 1, 0.03, 0.45, '#B9BFCC', { transform: `translate(${-sg * 1} 0)` });
  });
  // верхняя кромка капота (по стеклу)
  rimLine(`M${cf_n(-hx(212.7))} ${cf_n(py(463.5) - 0.8)}Q0 ${cf_n(py(459.5) - 0.8)} ${cf_n(hx(212.7))} ${cf_n(py(463.5) - 0.8)}`, lines, [0, -0.88, 0.47], 1.4, 0.1, 0.7);
  // контур кузова (как на боку: цвет фона, α0,55)
  S('path', { d: G.outlineD, fill: 'none', stroke: '#0E1016', 'stroke-width': 1.2, opacity: 0.55, 'stroke-linejoin': 'round' }, body);

  // проход блика по кузову (set({ gloss: 0..1 })): мягкая косая полоса, обрезанная силуэтом
  const glossG = S('g', { 'clip-path': bodyClip, visibility: 'hidden' }, body);
  const glossBand = S('path', { d: 'M-40 -300L20 -300L-30 20L-90 20Z', fill: lg([[0, '#FFFFFF', 0], [0.5, '#FFFFFF', 0.45], [1, '#FFFFFF', 0]], -90, 0, 20, 0) }, glossG);

  // ---------------- пересчёт света под крен (только атрибуты)
  let rollNow = null, rollCur = 0, shadowV = 1;
  const relight = roll => {
    if (roll === rollNow) return; rollNow = roll;
    const Lt = cf_light(roll);
    FACES.forEach(f => {
      let ax = null;
      if (!f.ns) {
        const gx = f.k[0] * Lt.L[0], gy = f.k[1] * Lt.L[1], gl = Math.hypot(gx, gy);
        ax = gl > 1e-9 ? [gx / gl, gy / gl] : [0, 1];
        A(f.g.el, 'x1', f2(f.c[0] - ax[0] * f.e)); A(f.g.el, 'y1', f2(f.c[1] - ax[1] * f.e));
        A(f.g.el, 'x2', f2(f.c[0] + ax[0] * f.e)); A(f.g.el, 'y2', f2(f.c[1] + ax[1] * f.e));
      }
      f.offs.forEach((t, i) => {
        const dd = (2 * t - 1) * f.e;
        const n = f.ns ? f.ns[i] : cf_n3(f.n[0] + f.k[0] * dd * ax[0], f.n[1] + f.k[1] * dd * ax[1], f.n[2]);
        A(f.g.stops[i], 'stop-color', cf_shade(f.m, n, Lt));
      });
    });
    RIMS.forEach(r => { const v = Math.max(0, cf_dot(r.n, Lt.L)); A(r.el, 'opacity', f2(clamp(r.a0 + r.a1 * v * v * v))); });
    SHEENS.forEach(q => {
      const H = Lt.H, sc = q.n[2] / Math.max(0.05, H[2]);
      const dx = q.k[0] ? clamp((H[0] * sc - q.n[0]) / q.k[0], -q.ex, q.ex) : 0, dy = q.k[1] ? clamp((H[1] * sc - q.n[1]) / q.k[1], -q.ey, q.ey) : 0;
      const n = cf_n3(q.n[0] + q.k[0] * dx, q.n[1] + q.k[1] * dy, q.n[2]);
      A(q.el, 'transform', `translate(${f2(q.c[0] + dx)} ${f2(q.c[1] + dy)})`);
      A(q.el, 'opacity', f2(q.a * Math.pow(Math.max(0, cf_dot(n, H)), q.p)));
    });
    RELIEF.forEach(q => { const dv = cf_bright(q.m, q.n, Lt) - cf_bright(q.m, q.nb, Lt); A(q.el, q.attr, dv > 0 ? '#FFFFFF' : '#05060A'); A(q.el, 'opacity', f2(clamp(Math.abs(dv) * q.k))); });
    // стекло: отражения держат ориентацию экрана (rotate −roll), места — по эллипсу купола; яркость — насколько стекло смотрит вверх
    const ux = Lt.U[0], uy = Lt.U[1], up = cf_dot(NG, Lt.U), hl2 = Math.hypot(Lt.H[0] * 2.2, Lt.H[1]) || 1;
    const rot = ` rotate(${f2(-roll)})`, at = (k, vx, vy) => `translate(${f2(DC[0] + k * DA * vx)} ${f2(DC[1] + k * DB * vy)})`;
    A(sky, 'transform', at(0.74, ux, uy) + rot); A(sky, 'opacity', f2(0.3 + 0.7 * cf_sm((up + 0.45) / 1.0)));
    A(horizon, 'transform', at(-0.36 * Lt.cr, ux, uy) + rot);
    A(glint, 'transform', at(0.6, Lt.H[0] * 2.2 / hl2, Lt.H[1] / hl2) + rot); A(glint, 'opacity', f2(0.4 + 0.6 * cf_sm((up + 0.55) / 1.1)));
  };
  // контактная тень имеет смысл только колёсами вниз: гаснет к крену ±56°
  const shadowSet = () => show(shadow, shadowV * cf_sm((Math.cos(rollCur * Math.PI / 180) - 0.55) / 0.4));
  relight(0);

  // ---------------- рентген и струи
  const xray = cf_buildXray(root, defs, id);
  const jets = cf_buildJets(root, defs, id, xray.nz);

  return {
    g: root, body, tires, shadow, lights, xray, jets, G,
    // габариты в локальных единицах и ось крена (≈ центр масс, около 0,43 высоты)
    W: 2 * hx(433), H: -py(280.3), track: tireXo + tireXi, pivot: [0, -112], nozzles: xray.nz,
    set(s = {}) {
      if (s.roll !== undefined) { rollCur = +s.roll || 0; relight(rollCur); }
      if (s.shadow !== undefined) shadowV = s.shadow;
      if (s.shadow !== undefined || s.roll !== undefined) shadowSet();
      if (s.body !== undefined) { show(body, s.body); if (s.wheels === undefined) show(tires, s.body); }
      if (s.wheels !== undefined) show(tires, s.wheels);
      if (s.lights !== undefined) { show(lights, s.lights); show(hoodGlow, s.lights); }
      if (s.gloss !== undefined) { const on = s.gloss > 0 && s.gloss < 1; A(glossG, 'visibility', on ? 'visible' : 'hidden'); if (on) A(glossBand, 'transform', `translate(${f2(lerp(-260, 330, s.gloss))} 0)`); }
      xray.set(s);
      jets.set(s);
    },
  };
}


// ------------------------------------------------------------------ рентген: что внутри (вид спереди)
// Схема по описаниям Tesla и патенту; положение узлов условное — иллюстрация принципа, а не чертёж.
// Каркас — светлые линии, механизм — жёлтый: два баллона (торцом, как в боковом виде), трубки, по одному нижнему соплу у колёс
// и два носовых боковых (бьют вбок). Высоты сопел согласованы с боковым видом (низ y = −50, нос y = −86).
function cf_buildXray(parent, defs, id) {
  const G = cf_G, P = cf_P, m = G.m, hx = cf_hx, py = cf_py;
  const g = S('g', { visibility: 'hidden' }, parent);
  const Lt = { fill: 'none', stroke: P.light, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const Yl = { fill: 'none', stroke: P.yellow, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const SG = [-1, 1];
  // каркас
  const frame = S('g', {}, g);
  S('path', { d: G.bodyD, ...Lt, 'stroke-width': 2.4, fill: '#8C93A3', 'fill-opacity': 0.05, opacity: 0.9 }, frame);
  S('path', { d: G.domeLineD, ...Lt, 'stroke-width': 1.3, opacity: 0.4 }, frame);
  S('path', { d: G.hoodD, ...Lt, 'stroke-width': 1.1, opacity: 0.28 }, frame);
  SG.forEach(sg => {
    S('path', { d: G.facet(sg), ...Lt, 'stroke-width': 1.1, opacity: 0.3 }, frame);
    S('path', { d: G.fender(sg), ...Lt, 'stroke-width': 1.1, opacity: 0.26 }, frame);
    S('path', { d: G.recess(sg), ...Lt, 'stroke-width': 1, opacity: 0.4 }, frame);
    S('path', { d: G.plateD(sg), ...Lt, 'stroke-width': 1, opacity: 0.24 }, frame);
    // шина целиком (диаметр 155 ед.) и ширина обода
    const xa = sg * hx(430), xb = sg * hx(293), x0 = Math.min(xa, xb), w = Math.abs(xa - xb);
    S('rect', { x: x0, y: -155, width: w, height: 155, rx: 11, ...Lt, 'stroke-width': 2, opacity: 0.55 }, frame);
    S('rect', { x: x0 + 9, y: -131, width: w - 18, height: 107, rx: 6, ...Lt, 'stroke-width': 1.1, opacity: 0.3, 'stroke-dasharray': '3 4' }, frame);
  });
  S('path', { d: `M${cf_n(-hx(291.5))} ${cf_n(py(611.2))}H${cf_n(hx(291.5))}`, ...Lt, 'stroke-width': 1.6, opacity: 0.5 }, frame);
  S('path', { d: `M${cf_n(-hx(296))} ${cf_n(py(672))}H${cf_n(hx(296))}`, ...Lt, 'stroke-width': 1, opacity: 0.22 }, frame);
  S('path', { d: G.lipD, ...Lt, 'stroke-width': 1.1, opacity: 0.3 }, frame);
  S('path', { d: 'M0 -272V-4', ...Lt, 'stroke-width': 1, opacity: 0.16, 'stroke-dasharray': '3 6' }, frame);
  // механизм
  const mech = S('g', {}, g);
  // трубки с «выбивкой» (читаются поверх колёс), скруглённые углы, узлы; правая половина, левая — зеркало
  const pipes = S('g', {}, mech);
  const half = [
    'M20 -114H118Q134 -114 140 -100L147 -80Q152 -66 168 -66H179Q185.6 -66 185.6 -59V-51',    // нижний баллон → нижнее сопло у колеса
    'M22 -162H160Q172 -162 177 -150L183 -126Q186 -114 186 -104V-98Q186 -86 198 -86H208',     // верхний баллон → носовое боковое сопло
  ];
  SG.forEach(sg => half.forEach(d => S('path', { d, fill: 'none', stroke: '#0E1016', 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: sg < 0 ? 'scale(-1 1)' : '' }, pipes)));
  SG.forEach(sg => half.forEach(d => S('path', { d, ...Yl, 'stroke-width': 4, transform: sg < 0 ? 'scale(-1 1)' : '' }, pipes)));
  S('path', { d: 'M0 -140V-134', stroke: '#0E1016', 'stroke-width': 9, 'stroke-linecap': 'round' }, pipes);
  S('path', { d: 'M0 -140V-134', ...Yl, 'stroke-width': 4 }, pipes);
  [[118, -114], [160, -162], [168, -66], [186, -104]].forEach(([x, y]) => SG.forEach(sg => S('circle', { cx: sg * x, cy: y, r: 4.5, fill: P.yellow }, pipes)));
  // баллоны COPV: торцом — кольца, намотка диагональной штриховкой (как на боку), вентиль в центре; рисуются поверх трубок
  const tanks = S('g', {}, mech);
  [[0, -162, 22], [0, -114, 20]].forEach(([cx, cy, r], k) => {
    const t = S('g', {}, tanks), tc = id + '-tank' + k;
    { const c = S('clipPath', { id: tc, clipPathUnits: 'userSpaceOnUse' }, defs); S('circle', { cx, cy, r }, c); }
    S('circle', { cx, cy, r, fill: '#0E1016', 'fill-opacity': 0.55 }, t);
    S('circle', { cx, cy, r, fill: P.yellow, 'fill-opacity': 0.1 }, t);
    const hg = S('g', { 'clip-path': `url(#${tc})` }, t);
    for (let c = -1.45 * r; c <= 1.45 * r; c += 6) S('path', { d: `M${cx - r} ${cf_n(cy - r + c)}L${cx + r} ${cf_n(cy + r + c)}`, stroke: P.yellow, 'stroke-width': 1, opacity: 0.4 }, hg);
    S('circle', { cx, cy, r, ...Yl, 'stroke-width': 2.4 }, t);
    S('circle', { cx, cy, r: r - 6, ...Yl, 'stroke-width': 1.1, opacity: 0.4 }, t);
    S('circle', { cx, cy, r: 3.6, fill: P.yellow }, t);
    SG.forEach(sg => S('circle', { cx: sg * r, cy, r: 3.2, fill: P.yellow }, t));
  });
  // сопла: раструб 16 ед.; вниз у колёс и вбок на носу. nz — точка выхода и направление (0 — вправо, 90 — вниз, 180 — влево)
  const nozzles = S('g', {}, mech);
  const NZ = { downL: [-185.6, -50, 90], downR: [185.6, -50, 90], sideL: [-206, -86, 180], sideR: [206, -86, 0] };
  const nz = {};
  Object.entries(NZ).forEach(([k, [x, y, a]]) => {
    S('path', { d: 'M0 -5L16 -11L16 11L0 5Z', fill: P.yellow, 'fill-opacity': 0.3, ...Yl, 'stroke-width': 2.2, transform: `translate(${x} ${y}) rotate(${a})` }, nozzles);
    nz[k] = { x: x + 16 * Math.cos(a * Math.PI / 180), y: y + 16 * Math.sin(a * Math.PI / 180), a };
  });
  return {
    g, frame, mech, tanks, pipes, nozzles, nz,
    set(s) {
      if (s.xray !== undefined) show(g, s.xray);
      if (s.frame !== undefined) show(frame, s.frame);
      ['tanks', 'pipes', 'nozzles'].forEach(k => { if (s['x_' + k] !== undefined) show(this[k], s['x_' + k]); });
    },
  };
}

// ------------------------------------------------------------------ струи сжатого газа (вид спереди)
// Светлый бело-голубой конус + клубы, бегущие от сопла (холодный газ — без огня); мерцание — шум от t.
// s.jet = { downL, downR, sideL, sideR } — сила 0..1; s.t — время; s.ground — до земли вдоль струи (лок. ед.): число или { downL, … } для нижних,
// s.reach — длина боковых (по умолчанию 210). Нижние бьют вдоль «вниз» машины, боковые — наружу: при крене группа вращается вместе с кузовом.
function cf_buildJets(parent, defs, id, nz) {
  const g = S('g', {}, parent);
  const coneG = linGrad(defs, [[0, '#FFFFFF', 0.95], [0.18, '#E4F0FF', 0.8], [0.6, '#A9CBF2', 0.32], [1, '#7FA6D6', 0]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const puffG = radGrad(defs, [[0, '#FFFFFF', 0.85], [0.5, '#D3E6FB', 0.42], [1, '#A9CBF2', 0]]);
  const coreG = linGrad(defs, [[0, '#FFFFFF', 0.95], [1, '#FFFFFF', 0]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const make = key => {
    const n = nz[key], j = S('g', { opacity: 0, visibility: 'hidden' }, g);
    const inner = S('g', { transform: `translate(${f2(n.x)} ${f2(n.y)}) rotate(${n.a})` }, j);
    // конус из трёх вложенных слоёв (100 / 70 / 40 % ширины): плотнее к оси, мягче к краю
    const cones = [0.6, 0.6, 0.7].map(o => S('path', { d: '', fill: coneG, opacity: o }, inner));
    const puffs = [0, 1, 2, 3, 4, 5].map(() => S('circle', { cx: 0, cy: 0, r: 1, fill: puffG }, inner));
    const core = S('path', { d: '', fill: coreG }, inner);
    const diamonds = [0, 1, 2].map(() => S('path', { d: '', fill: '#F2F8FF', opacity: 0 }, inner));
    return { key, j, cones, puffs, core, diamonds, n };
  };
  const coneD = (len, w0, w1) => `M0 ${f2(-w0)}C${f2(len * 0.35)} ${f2(-w0 - 2)} ${f2(len * 0.7)} ${f2(-w1)} ${f2(len)} ${f2(-w1 * 1.1)}L${f2(len)} ${f2(w1 * 1.1)}C${f2(len * 0.7)} ${f2(w1)} ${f2(len * 0.35)} ${f2(w0 + 2)} 0 ${f2(w0)}Z`;
  const J = ['downL', 'downR', 'sideL', 'sideR'].map(make);
  return {
    g, J,
    set(s) {
      if (!s.jet) return;
      const t = s.t || 0;
      J.forEach((q, i) => {
        const v = clamp(s.jet[q.key] || 0);
        A(q.j, 'opacity', f2(v < 0.01 ? 0 : 1)); A(q.j, 'visibility', v < 0.01 ? 'hidden' : 'visible');
        if (v < 0.01) return;
        const fl = 1 + 0.07 * Math.sin(t * 61 + i * 1.7) + 0.05 * Math.sin(t * 37.3 + i);
        const down = q.key.startsWith('down');
        const gr = (typeof s.ground === 'object' && s.ground !== null) ? s.ground[q.key] : s.ground;
        const lenMax = down ? Math.max(30, (gr !== undefined ? gr : 200) + 30) : (s.reach !== undefined ? s.reach : 210);
        const len = Math.min(lenMax, 230 * v) * fl, w0 = 9, w1 = 12 + 30 * v;   // горловина струи ≈ раструбу сопла (полуширина 9–11)
        [1, 0.7, 0.4].forEach((f, k) => A(q.cones[k], 'd', coneD(len, w0 * f, w1 * f)));
        A(q.core, 'd', `M0 -3.2L${f2(len * 0.34)} -1L${f2(len * 0.34)} 1L0 3.2Z`);
        q.puffs.forEach((pf, k) => {
          const u = ((t * 2.6 + k / 6 + i * 0.11) % 1), d = u * len, r = lerp(6, w1 * 0.85, u) * (0.85 + 0.3 * hash01(k, i));
          const off = (hash01(k * 7 + Math.floor(t * 12), i) - 0.5) * w1 * 0.5 * u;
          A(pf, 'cx', f2(d)); A(pf, 'cy', f2(off)); A(pf, 'r', f2(r)); A(pf, 'opacity', f2(Math.pow(1 - u, 1.4) * 0.5 * v));
        });
        q.diamonds.forEach((dm, k) => { const x0 = 10 + k * 15, h = 3.6 - k * 0.8; A(dm, 'd', `M${f2(x0)} 0L${f2(x0 + 6)} ${f2(-h)}L${f2(x0 + 12)} 0L${f2(x0 + 6)} ${f2(h)}Z`); A(dm, 'opacity', 0); });   // «ромбов» у колёсных и носовых струй на записи нет (motion.md §6)
      });
    },
  };
}
