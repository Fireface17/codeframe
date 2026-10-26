// car.js — Tesla Roadster (редизайн 2026) как многослойная векторная иллюстрация.
// Вид сбоку: локальные единицы, длина машины L = 1000 (кончик носа x = 0, корма x ≈ 1000),
// земля y = 0, вверх — минус (как в SVG). Опорные точки сняты с фото-подложки
// (assets/ref/proportions.json, side.jpg); итог — своя стилизация, без логотипов и надписей.
// Слои: тень → колёсные ниши → кузов (панели, стекло, линии) → колёса → рентген (отдельная группа).
// Всё строится один раз; car.set(state) только выставляет атрибуты (кадр — чистая функция t).

const CAR_P = {
  ink: '#0E1016', light: '#F4F0E6', yellow: '#FFC83D', muted: '#8C93A3',
  black: '#0B0C10', black2: '#1A1C22', bronze: '#B98D4F', red: '#E23B3B', amber: '#FFB43A',
};

// ------------------------------------------------------------------ геометрия (доли L → единицы)
const cp = (x, y) => [x * 1000, -y * 1000];
const cpts = a => a.map(([x, y]) => cp(x, y));
const cf = p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
// сглаженный проход через точки (Catmull-Rom → кубические Безье); концы — изломы
function crRun(pts, k = 1 / 6) {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${cf(c1)} ${cf(c2)} ${cf(p2)}`;
  }
  return d;
}
const polyD = (pts, close = true) => 'M' + pts.map(cf).join('L') + (close ? 'Z' : '');
const smoothD = (pts, close = false) => 'M' + cf(pts[0]) + crRun(pts) + (close ? 'Z' : '');
const arcTo = (r, large, sweep, p) => `A${r.toFixed(1)} ${r.toFixed(1)} 0 ${large} ${sweep} ${cf(p)}`;
// точка на окружности (угол в градусах, 0 — вправо, по часовой на экране)
const onC = (cx, cy, r, a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];

const SIDE = (() => {
  const G = {};
  G.hood = cpts([[0, 0.1082], [0.0491, 0.1345], [0.1117, 0.1633], [0.1586, 0.1764], [0.2043, 0.182]]);
  G.roof = cpts([[0.2043, 0.182], [0.2993, 0.2165], [0.3932, 0.2471], [0.4714, 0.2646], [0.5389, 0.2668], [0.6121, 0.2646], [0.6935, 0.2577], [0.7685, 0.2477], [0.8373, 0.2362], [0.918, 0.2183]]);
  // корма со сложенным крылом-«утиным хвостом»: дека продолжается к задней плоскости фонаря
  G.tail = cpts([[0.918, 0.2183], [0.958, 0.2105], [0.9905, 0.2035], [0.9985, 0.1905], [0.9965, 0.1705], [1.0013, 0.1245], [0.9969, 0.0976], [0.9894, 0.0663], [0.9825, 0.0469], [0.9293, 0.0319], [0.9187, 0.0294]]);
  G.wheelF = { c: cp(0.1902, 0.0751), rt: 77.3, rr: 61.9, rl: 64.7 };
  G.wheelR = { c: cp(0.838, 0.0845), rt: 83.8, rr: 61.9, rl: 64.1 };
  G.archF = { c: cp(0.1912, 0.0683), r: 90.4 };
  G.archR = { c: cp(0.8393, 0.0793), r: 93.1 };
  G.rearArchEnd = cp(0.7498, 0.0963);
  G.rockerRear = cp(0.7835, 0.02); G.rockerFront = cp(0.2756, 0.02);
  G.frontArchStart = cp(0.2837, 0.0557); G.frontArchEnd = cp(0.1035, 0.0576);
  G.nose = cpts([[0.1067, 0.03], [0.0491, 0.0347], [0.0116, 0.0375], [0.0016, 0.0413], [-0.0006, 0.0507], [0, 0.0557], [0.0116, 0.0626]]);
  // полный силуэт кузова (без колёс)
  const rA = G.archR, fA = G.archF, wR = G.wheelR;
  const rockR = onC(wR.c[0], wR.c[1], wR.rt + 1.5, 130);   // задний край порога огибает шину
  G.body = 'M' + cf(G.hood[0]) + crRun(G.hood) + crRun(G.roof) +
    G.tail.slice(1).map(p => 'L' + cf(p)).join('') +
    arcTo(rA.r, 1, 0, G.rearArchEnd) +
    `Q${cf(onC(wR.c[0], wR.c[1], wR.rt + 6, 158))} ${cf(rockR)}` + 'L' + cf(G.rockerRear) +
    'L' + cf(G.rockerFront) + 'L' + cf(G.frontArchStart) +
    arcTo(fA.r, 1, 0, G.frontArchEnd) +
    G.nose.map(p => 'L' + cf(p)).join('') + 'Z';
  // линии и панели
  G.glass = cpts([[0.2337, 0.182], [0.2993, 0.2096], [0.3619, 0.2308], [0.4245, 0.2496], [0.4808, 0.2584], [0.5371, 0.2596], [0.5996, 0.2565], [0.6497, 0.2527], [0.6935, 0.2477], [0.7491, 0.2409], [0.7122, 0.2202], [0.6747, 0.214], [0.6121, 0.2046], [0.5496, 0.1964], [0.487, 0.1896], [0.437, 0.1839], [0.3869, 0.1783], [0.3381, 0.1789], [0.2868, 0.1808]]);
  G.glassTop = G.glass.slice(0, 10);
  G.seamA = [cpts([[0.3394, 0.1789], [0.4138, 0.2465]]), cpts([[0.3635, 0.1783], [0.447, 0.2546]])];
  G.seamB = [cpts([[0.5637, 0.1989], [0.5827, 0.229], [0.6028, 0.2546]]), cpts([[0.5959, 0.2039], [0.6096, 0.229], [0.6221, 0.2546]])];
  G.door = cpts([[0.3381, 0.1789], [0.3137, 0.152], [0.3375, 0.0576], [0.4245, 0.0613], [0.487, 0.0644], [0.5571, 0.0669], [0.5759, 0.132], [0.5949, 0.2024]]);
  G.handle = cpts([[0.5946, 0.1958], [0.6053, 0.1952], [0.6071, 0.1921], [0.6065, 0.1852]]);
  G.marker = cpts([[0.2493, 0.1442], [0.2622, 0.1374], [0.3187, 0.1401], [0.3119, 0.1514]]);
  G.sill = cpts([[0.2837, 0.0557], [0.2993, 0.0551], [0.3619, 0.0582], [0.4245, 0.0613], [0.487, 0.0644], [0.5496, 0.0676], [0.6121, 0.0738], [0.6747, 0.0832], [0.7373, 0.0926], [0.7498, 0.0963]]);
  // складка-«плечо»: от дуги переднего крыла через указатель поворота и угол двери к корме
  G.crease = cpts([[0.2494, 0.1395], [0.3137, 0.152], [0.3381, 0.1551], [0.4245, 0.1645], [0.487, 0.172], [0.5496, 0.1789], [0.6121, 0.1858], [0.6747, 0.1921], [0.7373, 0.1975], [0.8, 0.2035], [0.86, 0.2095], [0.918, 0.2183]]);
  // кромка граней носа: от кончика носа к передней арке
  G.noseCrease = cpts([[0, 0.1082], [0.04, 0.1045], [0.075, 0.1015], [0.1063, 0.0992]]);
  G.tailLamp = cpts([[0.9287, 0.1383], [0.9324, 0.1339], [0.9762, 0.1551], [0.9744, 0.1589]]);
  G.tailFace = cpts([[0.9905, 0.2035], [0.9985, 0.1905], [0.9965, 0.1705], [0.9862, 0.1712], [0.9868, 0.1985]]);
  return G;
})();


// ------------------------------------------------------------------ вид сбоку
// Свет — ключевой слева-сверху-спереди (как на студийных фото); краска — матовая нейтрально-холодная белая.
// Линии одной логики: шов = тёмная 1 ед. (α0,6) + светлая 1 ед. (α0,3) со сдвигом; дверная щель 1,5; стойки стёкол 1,6.
function makeCarSide(parent, defs, opt = {}) {
  const id = opt.id || 'car' + (makeCarSide.n = (makeCarSide.n || 0) + 1);
  const G = SIDE, P = CAR_P;
  const root = S('g', { 'stroke-miterlimit': 2 }, parent);
  const lg = (stops, x1, y1, x2, y2) => linGrad(defs, stops, { x1, y1, x2, y2, units: 'userSpaceOnUse' });
  const eg = stops => radGrad(defs, stops);   // эллиптический (по рамке фигуры)
  const clip = (name, d) => { const c = S('clipPath', { id: id + name, clipPathUnits: 'userSpaceOnUse' }, defs); S('path', { d }, c); return `url(#${id + name})`; };
  const bodyClip = clip('-body', G.body);

  // тень: мягкое эллиптическое пятно + плотные контакты шин
  const shadow = S('g', {}, root);
  S('ellipse', { cx: 505, cy: 3, rx: 610, ry: 34, fill: eg([[0, '#000', 0.78], [0.55, '#000', 0.4], [1, '#000', 0]]) }, shadow);
  [G.wheelF, G.wheelR].forEach(w => S('ellipse', { cx: w.c[0] + 4, cy: 1, rx: 62, ry: 6, fill: eg([[0, '#000', 0.95], [0.6, '#000', 0.6], [1, '#000', 0]]) }, shadow));

  // колёсные ниши: глубина за колесом (видна в просвете арки)
  const wells = S('g', {}, root);
  [G.archF, G.archR].forEach((a, k) => {
    const c = clip('-well' + k, `M${a.c[0] - 140} -270H${a.c[0] + 140}V-44H${a.c[0] - 140}Z`);
    S('circle', { cx: a.c[0], cy: a.c[1], r: a.r - 0.5, fill: radGrad(defs, [[0, '#1E2128'], [0.7, '#0C0D11'], [1, '#050608']], { cx: a.c[0], cy: a.c[1] - 20, r: a.r, units: 'userSpaceOnUse' }), 'clip-path': c }, wells);
  });

  // ---------------- кузов
  const body = S('g', {}, root);
  const fill = S('g', { 'clip-path': bodyClip }, body);
  // нижняя боковина: свет спадает спереди назад, к низу чуть темнее
  S('path', { d: G.body, fill: lg([[0, '#7C7F8A'], [0.3, '#6C6F7A'], [0.6, '#53565F'], [0.88, '#33353D'], [1, '#2B2D34']], 300, 0, 960, 0) }, fill);
  S('rect', { x: 200, y: -270, width: 820, height: 270, fill: lg([[0, '#0E1016', 0], [0.62, '#0E1016', 0.06], [1, '#0E1016', 0.42]], 0, -200, 0, -30) }, fill);
  // «плечо» над складкой: светлая грань, к корме гаснет
  S('path', { d: 'M150 -139.5L' + cf(G.crease[0]) + crRun(G.crease) + 'L930 -300L150 -300Z', fill: lg([[0, '#F3F4F6'], [0.35, '#E4E5E8'], [0.7, '#C2C4CA'], [1, '#9A9CA3']], 240, 0, 930, 0) }, fill);
  // мягкое скругление складки: светлая полоса под ней
  S('path', { d: smoothD(G.crease.map(([x, y]) => [x, y + 3.2])), fill: 'none', stroke: lg([[0, '#E8E9EC', 0.55], [0.6, '#C9CCD2', 0.3], [1, '#8F929B', 0.12]], 250, 0, 920, 0), 'stroke-width': 6 }, fill);
  // переднее крыло: самое светлое
  const fenderD = 'M' + cf(G.hood[0]) + crRun(G.hood) + 'L' + cf(cp(0.2337, 0.182)) + 'L' + cf(cp(0.3381, 0.1789)) + 'L' + cf(cp(0.3137, 0.152)) + 'L' + cf(G.crease[0]) +
    arcTo(G.archF.r, 0, 0, G.noseCrease[3]) + 'L' + cf(G.noseCrease[2]) + 'L' + cf(G.noseCrease[1]) + 'Z';
  S('path', { d: fenderD, fill: lg([[0, '#D3D6DB'], [0.38, '#E9EBEF'], [0.75, '#F2F3F5'], [1, '#E6E8EC']], 0, -95, 0, -185) }, fill);
  S('ellipse', { cx: 170, cy: -160, rx: 135, ry: 42, fill: eg([[0, '#FFFFFF', 0.32], [1, '#FFFFFF', 0]]), transform: 'rotate(-13 170 -160)' }, fill);
  // грань носа под кромкой
  S('path', { d: 'M' + cf(G.noseCrease[0]) + crRun(G.noseCrease) + arcTo(G.archF.r, 0, 0, G.frontArchEnd) + 'L' + cf(G.nose[6]) + 'Z', fill: lg([[0, '#CDD0D6'], [1, '#9A9EA7']], 0, -105, 60, -60) }, fill);
  // щека за передней аркой
  const cheekD = 'M' + cf(G.crease[0]) + 'L' + cf(cp(0.3137, 0.152)) + 'L' + cf(cp(0.3375, 0.0576)) + 'L' + cf(G.frontArchStart) + arcTo(G.archF.r, 0, 0, G.crease[0]) + 'Z';
  S('path', { d: cheekD, fill: lg([[0, '#C9CBD1'], [0.45, '#8E929B'], [1, '#5A5D66']], 0, -150, 0, -55) }, fill);
  // заднее крыло над аркой: мягкий объём
  S('ellipse', { cx: 800, cy: -192, rx: 160, ry: 48, fill: eg([[0, '#FFFFFF', 0.16], [1, '#FFFFFF', 0]]), transform: 'rotate(-5 800 -192)' }, fill);
  // порог: тёмный, но не сливается с фоном; кромка сверху
  S('path', { d: 'M' + cf(G.sill[0]) + crRun(G.sill) + 'L' + cf(G.rockerRear) + 'L' + cf(G.rockerFront) + 'Z', fill: lg([[0, '#20232B'], [1, '#0F1117']], 0, -95, 0, -20) }, fill);
  // сплиттер: угловая пластина
  S('path', { d: polyD([G.nose[6], G.frontArchEnd, ...G.nose]), fill: '#15171C' }, fill);
  // корма: три тёмные ступени (верхняя плоскость, средняя, диффузор)
  S('path', { d: polyD(cpts([[0.9287, 0.1383], [0.9762, 0.1551], [0.9862, 0.1712], [0.9965, 0.1705], [1.0013, 0.1245], [0.9969, 0.0976], [0.9324, 0.0793], [0.9268, 0.1185]])), fill: lg([[0, '#3A3D46'], [1, '#262830']], 0, -160, 0, -80) }, fill);
  S('path', { d: polyD(cpts([[0.9324, 0.0793], [0.9969, 0.0976], [0.9894, 0.0663], [0.936, 0.0603]])), fill: '#1C1E26' }, fill);
  S('path', { d: polyD(cpts([[0.9293, 0.0319], [0.9825, 0.0469], [0.9894, 0.0663], [0.936, 0.0603], [0.931, 0.0526]])), fill: '#0C0D11' }, fill);
  S('path', { d: polyD(G.tailFace), fill: '#2A2D34' }, fill);

  // стекло: бронза, светлее снизу-спереди, к корме почти чёрное
  const glassD = 'M' + cf(G.glass[0]) + crRun(G.glassTop) + G.glass.slice(10).map(p => 'L' + cf(p)).join('') + 'Z';
  const glassG = S('g', {}, body);
  S('path', { d: glassD, fill: lg([[0, '#B5A094'], [0.22, '#7A6660'], [0.42, '#4A3D39'], [0.68, '#241B1A'], [1, '#120D0C']], 260, -185, 745, -245) }, glassG);
  const refl = S('g', { 'clip-path': clip('-glass', glassD) }, glassG);
  S('path', { d: 'M562 -190 L575 -236 Q578 -246 588 -245 L601 -243 Q609 -241 607 -232 L595 -190 Z', fill: '#1A100E', opacity: 0.6 }, refl);
  const belt = G.glass.slice(10).concat([G.glass[0]]);   // нижняя кромка стекла (от кормы к носу)
  S('path', { d: polyD([...belt.map(([x, y]) => [x, y - 7]), ...belt.slice().reverse().map(([x, y]) => [x, y - 17])]), fill: '#FFFFFF', opacity: 0.08 }, refl);
  S('path', { d: smoothD(G.glassTop), fill: 'none', stroke: '#F4E8DC', 'stroke-width': 1.6, opacity: 0.28 }, refl);
  // стойки: сужаются кверху, до кромки крыши
  const roofY = x => { const r = G.roof; for (let i = 0; i < r.length - 1; i++) if (x >= r[i][0] && x <= r[i + 1][0]) return lerp(r[i][1], r[i + 1][1], (x - r[i][0]) / (r[i + 1][0] - r[i][0])); return r[0][1]; };
  const pillar = (pts) => {
    const a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], k = (roofY(b[0]) + 2.5 - a[1]) / dy, top = [a[0] + dx * k, a[1] + dy * k];
    const len = Math.hypot(top[0] - a[0], top[1] - a[1]), nx = -(top[1] - a[1]) / len, ny = (top[0] - a[0]) / len;
    S('path', { d: polyD([[a[0] + nx * 1.15, a[1] + ny * 1.15], [top[0] + nx * 0.55, top[1] + ny * 0.55], [top[0] - nx * 0.55, top[1] - ny * 0.55], [a[0] - nx * 1.15, a[1] - ny * 1.15]]), fill: '#0A0A0E', opacity: 0.85 }, glassG);
  };
  [...G.seamA, ...G.seamB].forEach(pillar);

  // линии и швы
  const lines = S('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, body);
  const seam = (d, w = 1, dx = 1.2) => { S('path', { d, stroke: '#0E1016', 'stroke-width': w, opacity: 0.6 }, lines); S('path', { d, stroke: '#FFFFFF', 'stroke-width': 1, opacity: 0.3, transform: `translate(${dx} 0)` }, lines); };
  seam(polyD(G.door.slice(0, 3), false), 1.5); seam(polyD(G.door.slice(5), false), 1.5);
  seam('M' + cf(cp(0.918, 0.2183)) + 'L' + cf(cp(0.9268, 0.1185)), 1);
  seam('M620 -264.2L620 -257.4', 1);   // шов съёмной панели крыши
  S('path', { d: smoothD(G.crease), stroke: lg([[0, '#FFFFFF', 0.9], [0.55, '#FFFFFF', 0.55], [1, '#FFFFFF', 0.12]], 250, 0, 920, 0), 'stroke-width': 1.1 }, lines);
  S('path', { d: smoothD(G.noseCrease.map(([x, y]) => [x, y - 0.8])), stroke: '#FFFFFF', 'stroke-width': 1.2, opacity: 0.6 }, lines);
  S('path', { d: smoothD(G.sill), stroke: '#2E313C', 'stroke-width': 1.2 }, lines);
  S('path', { d: polyD([G.nose[0], G.nose[1], G.nose[2], G.nose[3], G.nose[4]], false), stroke: '#3A3D48', 'stroke-width': 1 }, lines);
  // ручка двери: паз
  S('rect', { x: 594.6, y: -197.4, width: 12, height: 3.5, rx: 1.2, fill: '#0E1016', opacity: 0.7 }, body);
  S('path', { d: 'M595.5 -193.2H605.8', stroke: '#FFFFFF', 'stroke-width': 0.9, opacity: 0.35 }, body);
  // указатель поворота: тонкая щель и тёмно-янтарная линза
  S('path', { d: polyD(cpts([[0.2493, 0.1442], [0.2622, 0.1394], [0.3187, 0.1411], [0.3119, 0.1484]])), fill: '#121318' }, body);
  S('path', { d: polyD(cpts([[0.2493, 0.1442], [0.2622, 0.1394], [0.2835, 0.1400], [0.2725, 0.1452]])), fill: lg([[0, '#B4501F'], [1, '#5B1F12']], 249, -144, 284, -140) }, body);
  // задний фонарь: тонкая красная нить вдоль ребра с мягким свечением
  const lampD = 'M' + cf(cp(0.9292, 0.1362)) + 'L' + cf(cp(0.9753, 0.157));
  S('path', { d: lampD, stroke: '#D7263D', 'stroke-width': 7, opacity: 0.16, 'stroke-linecap': 'round' }, body);
  S('path', { d: lampD, stroke: lg([[0, '#D7263D', 0.25], [0.5, '#E8334A', 1], [1, '#D7263D', 0.3]], 929, 0, 975, 0), 'stroke-width': 2.8, 'stroke-linecap': 'round' }, body);
  // светлая кромка по верху (капот, рейка, крыша, дека) и контур
  S('path', { d: 'M' + cf([G.hood[0][0] + 1, G.hood[0][1] + 1.5]) + crRun(G.hood.map(([x, y]) => [x, y + 1.5])) + crRun(G.roof.map(([x, y]) => [x, y + 1.5])), fill: 'none', stroke: lg([[0, '#FFFFFF', 0.85], [0.6, '#FFFFFF', 0.7], [1, '#FFFFFF', 0.25]], 0, 0, 920, 0), 'stroke-width': 1.8, 'stroke-linecap': 'round' }, body);
  S('path', { d: G.body, fill: 'none', stroke: '#0E1016', 'stroke-width': 1.2, opacity: 0.55, 'stroke-linejoin': 'round' }, body);
  S('path', { d: polyD(G.tail.slice(0, 10), false), fill: 'none', stroke: '#3A3D48', 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, body);

  // проход блика по кузову (set({ gloss: 0..1 })): мягкая косая полоса, обрезанная силуэтом
  const glossG = S('g', { 'clip-path': bodyClip, visibility: 'hidden' }, body);
  const glossBand = S('path', { d: 'M-60 -320L40 -320L-60 40L-160 40Z', fill: lg([[0, '#FFFFFF', 0], [0.5, '#FFFFFF', 0.45], [1, '#FFFFFF', 0]], -160, 0, 40, 0) }, glossG);

  // ---------------- колёса (передние светлее, задние в тени)
  const wheels = [G.wheelF, G.wheelR].map((w, k) => makeWheelSide(root, defs, w, id + '-w' + k, k === 0 ? 1 : 0));

  // ---------------- рентген и струи
  const xray = makeCarXray(root, defs, id);
  const jets = makeCarJets(root, defs, id, xray.nz);

  return {
    g: root, body, shadow, wells, wheels, xray, jets, G,
    set(s = {}) {
      if (s.wheel !== undefined) wheels.forEach(w => w.spin(s.wheel * (w.w === G.wheelF ? G.wheelR.rt / G.wheelF.rt : 1)));
      if (s.shadow !== undefined) show(shadow, s.shadow);
      if (s.gloss !== undefined) { const on = s.gloss > 0 && s.gloss < 1; A(glossG, 'visibility', on ? 'visible' : 'hidden'); if (on) A(glossBand, 'transform', `translate(${f2(lerp(-120, 1240, s.gloss))} 0)`); }
      if (s.body !== undefined) { show(body, s.body); show(wells, s.body); }
      if (s.wheels !== undefined) wheels.forEach(w => show(w.g, s.wheels));
      xray.set(s);
      jets.set(s);
    },
  };
}

// колесо сбоку: шина, тонкий обод, аэро-диск с шестью сдвоенными спицами постоянной ширины, суппорт в прорезях.
// Свет на диске — неподвижный слой поверх вращающихся спиц. tone: 1 — переднее (светлее), 0 — заднее (в тени).
function makeWheelSide(parent, defs, w, id, tone = 1) {
  const [cx, cy] = w.c, g = S('g', {}, parent);
  const rgU = (stops, r, fx = 0, fy = 0) => radGrad(defs, stops, { cx: cx + fx, cy: cy + fy, r, units: 'userSpaceOnUse' });
  const lgW = stops => linGrad(defs, stops, { x1: cx - w.rt, y1: cy - w.rt, x2: cx + w.rt, y2: cy + w.rt, units: 'userSpaceOnUse' });
  // шина
  S('circle', { cx, cy, r: w.rt, fill: lgW([[0, '#34373E'], [0.45, '#1C1E23'], [1, '#08090B']]) }, g);
  S('circle', { cx, cy, r: w.rt, fill: rgU([[0, '#000', 0], [w.rl / w.rt, '#000', 0], [0.92, '#000', 0.2], [1, '#000', 0.65]], w.rt) }, g);
  const rotA = S('g', {}, g);   // надпись-штрихи на боковине вращаются с шиной
  const rm = (w.rt + w.rl) / 2;
  for (let k = 0; k < 9; k++) {
    const a0 = 196 + k * 6.2, a1 = a0 + (k % 3 === 2 ? 2.2 : 4.4);
    S('path', { d: `M${cf(onC(cx, cy, rm, a0))}A${rm.toFixed(1)} ${rm.toFixed(1)} 0 0 1 ${cf(onC(cx, cy, rm, a1))}`, fill: 'none', stroke: '#D8D8DC', 'stroke-width': 2, opacity: 0.16 }, rotA);
  }
  S('path', { d: `M${cf(onC(cx, cy, rm + 1, 200))}A${(rm + 1).toFixed(1)} ${(rm + 1).toFixed(1)} 0 0 1 ${cf(onC(cx, cy, rm + 1, 252))}`, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 4, opacity: 0.07, 'stroke-linecap': 'round' }, g);
  // обод: тёмный, с тонкой светлой кромкой
  S('circle', { cx, cy, r: w.rl, fill: '#14151A' }, g);
  S('circle', { cx, cy, r: w.rr + 0.6, fill: 'none', stroke: '#8A8C94', 'stroke-width': 1, opacity: 0.5 }, g);
  // глубина диска и суппорт (не вращаются)
  S('circle', { cx, cy, r: w.rr, fill: '#0B0C0F' }, g);
  S('path', { d: polyD([onC(cx, cy, w.rr - 6, 22), onC(cx, cy, w.rr - 6, 52), onC(cx, cy, w.rr - 21, 50), onC(cx, cy, w.rr - 21, 24)]), fill: '#B07A3C' }, g);
  // вращающаяся часть: секторы и спицы
  const rotB = S('g', {}, g);
  const r0 = 17, r1 = w.rr - 1, slot = 3.4, blade = 6.3, o = slot / 2 + blade;
  const sector = tone ? '#80838B' : '#4E5058';
  const U = a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
  const at = (a, r, off) => { const [ux, uy] = U(a); return [cx + ux * r - uy * off, cy + uy * r + ux * off]; };
  for (let k = 0; k < 6; k++) {
    const a = 90 + k * 60, b = a + 60;
    const A_ = at(a, Math.sqrt(r0 * r0 - o * o), o), B_ = at(a, Math.sqrt(r1 * r1 - o * o), o), C_ = at(b, Math.sqrt(r1 * r1 - o * o), -o), D_ = at(b, Math.sqrt(r0 * r0 - o * o), -o);
    S('path', { d: `M${cf(A_)}L${cf(B_)}A${r1} ${r1} 0 0 1 ${cf(C_)}L${cf(D_)}A${r0} ${r0} 0 0 0 ${cf(A_)}Z`, fill: sector }, rotB);
  }
  for (let k = 0; k < 6; k++) {
    const a = 90 + k * 60;
    [-1, 1].forEach(sgn => {
      const o0 = sgn * slot / 2, o1 = sgn * o;
      const pts = [at(a, r0 - 3, o0), at(a, Math.sqrt(r1 * r1 - o0 * o0), o0), at(a, Math.sqrt(r1 * r1 - o1 * o1), o1), at(a, r0 - 3, o1)];
      S('path', { d: polyD(pts), fill: '#07080B' }, rotB);
      S('path', { d: polyD([pts[3], pts[2]], false), stroke: '#CFD0D6', 'stroke-width': 0.8, opacity: 0.4 }, rotB);
    });
    S('path', { d: polyD([at(a, r0 + 4, 0), at(a, r1 - 6, 0)], false), stroke: '#8A6A44', 'stroke-width': 0.9, opacity: 0.3 }, rotB);
  }
  S('circle', { cx, cy, r: r0 + 1, fill: '#0B0C10', stroke: '#2A2D35', 'stroke-width': 1 }, rotB);
  S('circle', { cx, cy, r: 9, fill: '#16181D', stroke: '#4A4E58', 'stroke-width': 1 }, rotB);
  // неподвижный свет поверх диска
  const dc = id + '-disc';
  { const c = S('clipPath', { id: dc, clipPathUnits: 'userSpaceOnUse' }, defs); S('circle', { cx, cy, r: w.rr }, c); }
  const lit = S('g', { 'clip-path': `url(#${dc})` }, g);
  S('circle', { cx, cy, r: w.rr, fill: lgW([[0, '#FFFFFF', 0.22], [0.45, '#FFFFFF', 0.02], [0.7, '#000000', 0.15], [1, '#000000', 0.45]]) }, lit);
  S('circle', { cx, cy, r: w.rr - 3.5, fill: 'none', stroke: '#0B0C0F', 'stroke-width': 6, opacity: 0.35 }, lit);
  S('circle', { cx, cy, r: w.rl, fill: 'none', stroke: '#14151A', 'stroke-width': 2 }, g);
  return { g, rot: rotB, w, spin(deg) { const tr = `rotate(${f2(deg)} ${cx} ${cy})`; A(rotA, 'transform', tr); A(rotB, 'transform', tr); } };
}

// ------------------------------------------------------------------ рентген: что внутри
// Схема по описаниям Tesla и патенту (вентиляторы + юбки, баллоны COPV, 10 сопел — 5 на борт); положение узлов
// условное: это иллюстрация принципа, а не чертёж. Каркас — светлые линии, механизм — жёлтый.
function makeCarXray(parent, defs, id) {
  const G = SIDE, P = CAR_P;
  const g = S('g', { visibility: 'hidden' }, parent);
  const Lt = { fill: 'none', stroke: P.light, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const Yl = { fill: 'none', stroke: P.yellow, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  // каркас
  const frame = S('g', {}, g);
  S('path', { d: G.body, ...Lt, 'stroke-width': 2.4, fill: '#8C93A3', 'fill-opacity': 0.05, opacity: 0.9 }, frame);
  S('path', { d: 'M' + cf(G.glass[0]) + crRun(G.glassTop) + G.glass.slice(10).map(p => 'L' + cf(p)).join('') + 'Z', ...Lt, 'stroke-width': 1.3, opacity: 0.4 }, frame);
  S('path', { d: polyD(G.door, false), ...Lt, 'stroke-width': 1.1, opacity: 0.28 }, frame);
  [G.wheelF, G.wheelR].forEach(w => {
    S('circle', { cx: w.c[0], cy: w.c[1], r: w.rt, ...Lt, 'stroke-width': 2, opacity: 0.55 }, frame);
    S('circle', { cx: w.c[0], cy: w.c[1], r: w.rr, ...Lt, 'stroke-width': 1.1, opacity: 0.32 }, frame);
    S('circle', { cx: w.c[0], cy: w.c[1], r: 46, ...Lt, 'stroke-width': 1, opacity: 0.25, 'stroke-dasharray': '3 4' }, frame);
    S('circle', { cx: w.c[0], cy: w.c[1], r: 4, fill: P.light, opacity: 0.5 }, frame);
  });
  S('rect', { x: 292, y: -64, width: 432, height: 27, rx: 5, ...Lt, 'stroke-width': 1.2, opacity: 0.22 }, frame);
  S('circle', { cx: 838, cy: -84.5, r: 21, ...Lt, 'stroke-width': 1.1, opacity: 0.35 }, frame);
  // механизм
  const mech = S('g', {}, g);
  // поток из-под днища к вентилятору: бегущий пунктир (сдвиг задаёт set({flow}))
  const flowD = 'M290 -10H858Q902 -10 922 -38L934 -56';
  const flow = S('path', { d: flowD, ...Yl, 'stroke-width': 2.4, 'stroke-dasharray': '10 9', opacity: 0.9 }, mech);
  // вентилятор в диффузоре: обод, 7 лопастей, ступица, стрелка вращения
  const fanC = [952, -74], fanR = 31;
  S('circle', { cx: fanC[0], cy: fanC[1], r: fanR + 3.5, fill: '#0E1016', 'fill-opacity': 0.6, ...Yl, 'stroke-width': 2.6 }, mech);
  const fanRot = S('g', {}, mech);
  for (let k = 0; k < 7; k++) S('path', { d: `M${fanC[0]} ${fanC[1]}Q${fanC[0] + 12} ${fanC[1] - 9} ${fanC[0] + 5} ${fanC[1] - fanR}`, ...Yl, 'stroke-width': 2.2, transform: `rotate(${(k * 360 / 7).toFixed(2)} ${fanC[0]} ${fanC[1]})` }, fanRot);
  S('circle', { cx: fanC[0], cy: fanC[1], r: 5, fill: P.yellow }, mech);
  S('path', { d: `M${cf(onC(fanC[0], fanC[1], fanR + 11, -140))}A${fanR + 11} ${fanR + 11} 0 0 1 ${cf(onC(fanC[0], fanC[1], fanR + 11, -70))}`, ...Yl, 'stroke-width': 1.8, opacity: 0.8 }, mech);
  const ah = onC(fanC[0], fanC[1], fanR + 11, -70);
  S('path', { d: `M${cf([ah[0] - 6, ah[1] - 4])}L${cf(ah)}L${cf([ah[0] - 2, ah[1] + 7])}`, ...Yl, 'stroke-width': 1.8, opacity: 0.8 }, mech);
  // юбки: штрихованная полоса вдоль порога до поверхности, кромка-уплотнение зигзагом
  const pat = id + '-hatch';
  { const p = S('pattern', { id: pat, width: 9, height: 9, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs); S('rect', { width: 9, height: 9, fill: P.yellow, opacity: 0.16 }, p); S('path', { d: 'M0 0V9', stroke: P.yellow, 'stroke-width': 2.2, opacity: 0.9 }, p); }
  const skirtG = S('g', {}, mech);
  const skirtClip = id + '-skirt';
  const skirtRect = (() => { const c = S('clipPath', { id: skirtClip, clipPathUnits: 'userSpaceOnUse' }, defs); return S('rect', { x: 296, y: -21, width: 468, height: 1 }, c); })();
  S('rect', { x: 296, y: -21, width: 468, height: 21, fill: `url(#${pat})`, 'clip-path': `url(#${skirtClip})` }, skirtG);
  const zig = S('path', { d: '', ...Yl, 'stroke-width': 2 }, skirtG);
  // баллоны COPV: капсулы, намотка под 45°, хомуты, вентиль
  const tanks = S('g', {}, mech);
  const tank = (x, y, w, h, k) => {
    const t = S('g', {}, tanks), tc = id + '-tank' + k;
    { const c = S('clipPath', { id: tc, clipPathUnits: 'userSpaceOnUse' }, defs); S('rect', { x, y, width: w, height: h, rx: h / 2 }, c); }
    S('rect', { x, y, width: w, height: h, rx: h / 2, fill: P.yellow, 'fill-opacity': 0.1 }, t);
    const hg = S('g', { 'clip-path': `url(#${tc})` }, t);
    t.level = S('rect', { x, y, width: w, height: h, fill: P.yellow, opacity: 0.42 }, hg); t.lw = w; t.lx = x;
    for (let i = -3; i < w / 15 + 3; i++) S('path', { d: `M${x + i * 15} ${y + h}L${x + i * 15 + h} ${y}`, stroke: P.yellow, 'stroke-width': 1, opacity: 0.4 }, hg);
    S('rect', { x, y, width: w, height: h, rx: h / 2, ...Yl, 'stroke-width': 2.4 }, t);
    [x + 38, x + w - 38].forEach(cx => S('rect', { x: cx - 3, y: y - 1.5, width: 6, height: h + 3, rx: 1.5, fill: P.yellow, opacity: 0.85 }, t));
    S('path', { d: `M${x + 2} ${y + h / 2}H${x - 9}`, ...Yl, 'stroke-width': 3 }, t);
    S('circle', { cx: x - 11, cy: y + h / 2, r: 4.5, fill: P.yellow }, t);
    return t;
  };
  const TANKS = [tank(588, -184, 150, 44, 0), tank(588, -134, 150, 40, 1)];
  // трубки с «выбивкой» (читаются поверх колёс), скруглённые углы, узлы
  const pipes = S('g', {}, mech);
  const PIPES = [
    'M577 -162H420Q404 -162 397 -150L376 -116Q370 -106 358 -106H150Q136 -106 130 -94L112 -60',   // к переднему нижнему соплу
    'M150 -106H58Q46 -106 43 -96L40 -88',                                                         // к носовому боковому
    'M577 -114H560Q548 -114 548 -102V-98',                                                        // перемычка между баллонами
    'M738 -162H930Q946 -162 952 -148L968 -112',                                                   // к задним соплам
    'M738 -114H880Q896 -114 902 -100L922 -60',                                                    // к заднему нижнему
  ];
  PIPES.forEach(d => S('path', { d, fill: 'none', stroke: '#0E1016', 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, pipes));
  PIPES.forEach(d => S('path', { d, ...Yl, 'stroke-width': 4 }, pipes));
  const gasFlow = PIPES.map(d => S('path', { d, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2.2, 'stroke-dasharray': '5 13', 'stroke-linecap': 'round', opacity: 0 }, pipes));
  [[150, -106], [577, -162], [577, -114], [738, -162], [738, -114]].forEach(([x, y]) => S('circle', { cx: x, cy: y, r: 4.5, fill: P.yellow }, pipes));
  // сопла этого борта (5 из 10): 2 сзади (струя назад), 2 снизу у колёс (вниз), 1 в носу (вбок, к зрителю)
  const nozzles = S('g', {}, mech);
  const NZ = { rearHi: [975, -104, 0], rearLo: [982, -84, 0], downR: [924, -50, 90], downF: [108, -50, 90], front: [36, -86, null] };
  const nz = {};
  Object.entries(NZ).forEach(([k, [x, y, a]]) => {
    if (a === null) { S('circle', { cx: x, cy: y, r: 7, fill: '#0E1016', ...Yl, 'stroke-width': 2.4 }, nozzles); S('circle', { cx: x, cy: y, r: 2.5, fill: P.yellow }, nozzles); }
    else S('path', { d: 'M0 -5L16 -11L16 11L0 5Z', fill: P.yellow, 'fill-opacity': 0.3, ...Yl, 'stroke-width': 2.2, transform: `translate(${x} ${y}) rotate(${a})` }, nozzles);
    nz[k] = { x: x + (a === null ? 0 : 16 * Math.cos(a * Math.PI / 180)), y: y + (a === null ? 0 : 16 * Math.sin(a * Math.PI / 180)), a };
  });
  return {
    g, frame, mech, flow, fanRot, fanC, tanks, pipes, nozzles, nz, skirtG,
    set(s) {
      if (s.xray !== undefined) show(g, s.xray);
      if (s.frame !== undefined) show(frame, s.frame);
      if (s.fan !== undefined) A(fanRot, 'transform', `rotate(${f2(s.fan)} ${fanC[0]} ${fanC[1]})`);
      if (s.flow !== undefined) A(flow, 'stroke-dashoffset', f2(-s.flow));
      if (s.skirt !== undefined) {
        const h = lerp(1, 19.5, clamp(s.skirt)); skirtRect.setAttribute('height', f2(h));
        let d = ''; const yb = -21 + h;
        for (let x = 296, i = 0; x <= 764; x += 6, i++) d += (i ? 'L' : 'M') + x + ' ' + f2(yb - (i % 2) * 2.4);
        A(zig, 'd', d); show(zig, s.skirt > 0.02 ? 1 : 0);
      }
      ['tanks', 'pipes', 'nozzles'].forEach(k => { if (s['x_' + k] !== undefined) show(this[k], s['x_' + k]); });
      if (s.gas !== undefined) TANKS.forEach(tk => A(tk.level, 'width', f2(tk.lw * clamp(s.gas))));
      if (s.gasOn !== undefined) gasFlow.forEach(fp => { A(fp, 'opacity', f2(0.9 * s.gasOn)); A(fp, 'stroke-dashoffset', f2(-(s.gasflow || 0))); });
    },
  };
}

// струи сжатого газа: светлый конус + клубы, бегущие от сопла (холодный газ — без огня); мерцание — шум от t.
// Видны и без рентгена. s.jet = { rear, down, front } — сила 0..1; s.t — время; s.ground — до земли (лок. ед.) для нижних.
function makeCarJets(parent, defs, id, nz) {
  const g = S('g', {}, parent);
  const coneG = linGrad(defs, [[0, '#FFFFFF', 0.95], [0.18, '#EEF2F6', 0.75], [0.6, '#C9CED8', 0.25], [1, '#8C93A3', 0]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const puffG = radGrad(defs, [[0, '#FFFFFF', 0.85], [0.5, '#E6EAF0', 0.4], [1, '#C9CED8', 0]]);
  const make = key => {
    const n = nz[key], j = S('g', { opacity: 0 }, g);
    const inner = S('g', { transform: `translate(${n.x} ${n.y}) rotate(${n.a === null ? 0 : n.a})` }, j);
    const cone = S('path', { d: '', fill: coneG }, inner);
    const puffs = [0, 1, 2, 3, 4, 5].map(() => S('circle', { cx: 0, cy: 0, r: 1, fill: puffG }, inner));
    const core = S('path', { d: '', fill: '#FFFFFF', opacity: 0.95 }, inner);
    const diamonds = [0, 1, 2].map(() => S('path', { d: '', fill: '#F4F0E6', opacity: 0 }, inner));
    return { key, j, cone, puffs, core, diamonds, n };
  };
  const J = ['rearHi', 'rearLo', 'downR', 'downF', 'front'].map(make);
  const group = { rearHi: 'rear', rearLo: 'rear', downR: 'down', downF: 'down', front: 'front' };
  return {
    g, J,
    set(s) {
      if (!s.jet) return;
      const t = s.t || 0;
      J.forEach((q, i) => {
        const v = clamp(s.jet[group[q.key]] || 0);
        A(q.j, 'opacity', f2(v < 0.01 ? 0 : 1)); A(q.j, 'visibility', v < 0.01 ? 'hidden' : 'visible');
        if (v < 0.01) return;
        const fl = 1 + 0.07 * Math.sin(t * 61 + i * 1.7) + 0.05 * Math.sin(t * 37.3 + i);
        if (q.key === 'front') {   // боковое сопло бьёт к зрителю: радиальная вспышка-клуб
          const r = 30 * v * fl;
          A(q.cone, 'd', `M${f2(-r)} 0A${f2(r)} ${f2(r)} 0 1 0 ${f2(r)} 0A${f2(r)} ${f2(r)} 0 1 0 ${f2(-r)} 0Z`); A(q.cone, 'fill', puffG);
          A(q.core, 'd', 'M-4 0A4 4 0 1 0 4 0A4 4 0 1 0 -4 0Z');
          q.puffs.forEach((pf, k) => { const a = (k * 60 + t * 160) * Math.PI / 180, d = r * (0.6 + 0.5 * ((t * 2 + k * 0.17) % 1)); A(pf, 'cx', f2(Math.cos(a) * d)); A(pf, 'cy', f2(Math.sin(a) * d)); A(pf, 'r', f2(r * 0.45)); A(pf, 'opacity', f2(0.5 * v)); });
          return;
        }
        const down = q.key.startsWith('down');
        const lenMax = down ? Math.max(40, (s.ground !== undefined ? s.ground : 200) + 30) : 210;
        const len = Math.min(lenMax, 230 * v) * fl, w0 = 5, w1 = 12 + 30 * v;
        A(q.cone, 'd', `M0 ${-w0}C${f2(len * 0.35)} ${f2(-w0 - 2)} ${f2(len * 0.7)} ${f2(-w1)} ${f2(len)} ${f2(-w1 * 1.1)}L${f2(len)} ${f2(w1 * 1.1)}C${f2(len * 0.7)} ${f2(w1)} ${f2(len * 0.35)} ${f2(w0 + 2)} 0 ${w0}Z`);
        A(q.core, 'd', `M0 -3.2L${f2(len * 0.3)} -1L${f2(len * 0.3)} 1L0 3.2Z`);
        q.puffs.forEach((pf, k) => {
          const u = ((t * 2.6 + k / 6 + i * 0.11) % 1), d = u * len, r = lerp(7, w1 * 1.15, u) * (0.85 + 0.3 * hash01(k, i));
          const off = (hash01(k * 7 + Math.floor(t * 12), i) - 0.5) * w1 * 0.5 * u;
          A(pf, 'cx', f2(d)); A(pf, 'cy', f2(off)); A(pf, 'r', f2(r)); A(pf, 'opacity', f2((1 - u) * 0.55 * v));
        });
        q.diamonds.forEach((dm, k) => { const x0 = 10 + k * 15, h = 3.6 - k * 0.8; A(dm, 'd', `M${f2(x0)} 0L${f2(x0 + 6)} ${f2(-h)}L${f2(x0 + 12)} 0L${f2(x0 + 6)} ${f2(h)}Z`); A(dm, 'opacity', f2(down ? 0 : 0.85 * v)); });
      });
    },
  };
}
