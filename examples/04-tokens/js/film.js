// film.js — ролик №4 «Ты видишь три о. ИИ — ни одной». Один лист на столе, камера сверху; сцены — места на листе.
// Карта — подкова: 1–5 вниз по левой колонке, карман strawberry (6) на повороте, 7–8 вверх по правой, финал — шаг
// влево к полоске вопроса (кадр 0). Структура: cues T (от слов) → раскладка LY → камера → построение → frame(t).
// Сцены — модули SC.* (s1.js … s7.js, hero.js), каждый ставит только свои элементы.

const Q_ = new URLSearchParams(location.search);
const MAP = Q_.get('map') === '1';
const COVER = Q_.get('cover') === '1';            // обложка: кадр хука + заголовок на бумажном ярлыке
window.SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 };

// ------------------------------------------------------------------ cues: от слов (индекс слова — надёжнее повторов)
const WS = i => window.WORDS.words[i].start, WE = i => window.WORDS.words[i].end;
const T = {};
T.lineUp = WS(4) - 0.05;                                       // «слове»: «хорошо?» приподнимается и подрагивает
T.hor = WS(5) - 0.09; T.y1 = WS(6) - 0.08; T.y2 = WS(7) - 0.08; T.y3 = WS(8) - 0.08;
T.col = WS(9) - 0.04; T.st1 = WS(11) - 0.08;                 // штамп №1: касание на «одной»
T.s2m = Math.max(T.st1 + 0.6, window.WORDS.phrases[1].start + 0.3);   // 46825 держится крупно до ~5,1, потом проезд к полоске
T.cut = WS(15) - 0.08; T.open = WS(17) - 0.05; T.flip = WS(23) - 0.06;
T.jump = WS(25) - 0.12;                                       // «почему»: 46825 спрыгивает
T.snap0 = Math.max(WS(26) + 0.18, T.jump + 0.95);
T.guides = WS(29) - 0.05;                                     // «Склеили»: пунктиром гнёзда будущих ярусов
T.m1 = WS(31) - 0.06; T.m2 = WS(34) - 0.12; T.m3 = WS(35) - 0.04; T.m6 = WS(38) - 0.16;
// «И снова, и снова» у живого голоса идёт парами слов — четыре склейки ровно между «И» и последним «снова»
T.mStep = (T.m6 - T.m3) / 3; T.m4 = T.m3 + T.mStep; T.m5 = T.m3 + 2 * T.mStep;
T.burst = T.m6 - 0.3;
T.pull = T.m6 + 0.55;                                         // отъезд ×0,6: наружу 0,55 с, полка 0,6 с, внутрь 0,6 с
T.pullIn = T.pull + 1.4; T.pullEnd = T.pullIn + 0.6;   // полка ×0,6 — 0,85 с
T.box = WS(44) - 0.05; T.write = WS(47) - 0.05; T.count = WS(51) - 0.05; T.slipOut5 = WS(49) - 0.05;
T.s6 = WS(57) - 0.12; T.straw = WS(57) + 0.12; T.two = WS(60) - 0.04; T.st2 = WS(61) - 0.08;
T.q = WS(65) - 0.06; T.ans = WS(68) - 0.06; T.re = WS(70) - 0.04; T.ans2 = WS(72) - 0.06;
T.s7 = Math.max(T.ans2 + 0.85, window.WORDS.phrases[5].start - 0.62);
T.req = WS(73) - 0.06; T.heroIn = WS(76) - 0.12;
T.pk1 = WS(79) - 0.06; T.pk2 = WS(81) - 0.06; T.pk3 = (WS(81) + WS(82)) / 2 + 0.02; T.arrow = Math.max(WS(82) - 0.04, T.pk3 + 0.2);
T.fl7 = WS(84) - 0.06;
T.crash = WS(89) - 0.08; T.c1 = WS(89) - 0.04; T.c2 = WS(90) - 0.02; T.c3 = WS(91) - 0.04; T.liftN = WS(93) - 0.06;
T.hit = WS(96) - 0.07;                                        // удар всем кадром, штамп №3 «3»
T.pen = window.WORDS.phrases[6].end;                          // пауза 1,5 с: перо ведёт камеру к «·о» вопроса
T.penArr = T.pen + 0.6;
T.noteOut = window.WORDS.phrases[7].start - 0.34;             // пометка и заливка уходят до фразы 8
T.slip9Out = WS(104) - 0.42; T.writeF = WS(104) - 0.04;      // «пока сам их не выпишет»: графит под полоской
T.sock = WS(100) - 0.04;                                      // 46825 садится в гнездо на «Букв»
T.chk = WS(109) - 0.04;                                       // «Проверь:» — переворот волной
T.end = window.WORDS.duration;
const DUR = Math.round(T.end * FPS) / FPS;
T.lift = DUR - 0.35;                                          // последние 0,35 с: полоска и россыпь поднимаются в позу кадра 0

// ------------------------------------------------------------------ раскладка листа (мировые px; при z = 1 — пиксели кадра)
const LY = {
  sheet: { x0: -520, y0: -380, x1: 2190, y1: 3850 },
  hook: { x: 540, y: 960 },
  s2: { x: 480, y: 860, z: 1.12 },
  s3: { x: 540, y: 2600 }, s3a: { x: 495, y: 2866, z: 1.1 },  // пирамида: сначала крупно на ряд (левее на 50 px), потом отъезд
  s4: { x: 450, y: 2580, z: 0.6 },                           // полка отъезда: основа выше y 1120, «= 9 номеров» за верхом кадра
  pyr0: 2680,                                                // центр основы пирамиды: вершина ниже кадра хука (петля)
  s5: { x: 620, y: 3900 },
  s6: { x: 1700, y: 3550 },
  s7: { x: 1640, y: 1700 },
  s8: { x: 1730, y: 1726.9, z: 1.45 },                      // ×1,45: низ сетки ≤ y 1150, субтитры в зоне
  row: { y: 1000 },                                          // ряд из 7 плиток хука; та же геометрия у основы пирамиды
  slots: (() => {                                            // пробел 50 + 6 букв по 92, зазор 9 → x 122–778
    const a = [{ x0: 122, w: 50 }];
    for (let j = 0; j < 6; j++) a.push({ x0: 181 + j * 101, w: 92 });
    a.forEach(s => { s.x1 = s.x0 + s.w; s.cx = s.x0 + s.w / 2; });
    return a;
  })(),
};
const scr = (c, wx, wy) => ({ x: (wx - c.x) * c.z + W / 2, y: (wy - c.y) * c.z + H / 2 });
const wld = (c, sx, sy) => ({ x: c.x + (sx - W / 2) / c.z, y: c.y + (sy - H / 2) / c.z });

// ------------------------------------------------------------------ камера: кадры-функции времени + переходы
const sine = ease.sine;
const SHOT = {
  hook: t => ({ x: LY.hook.x, y: LY.hook.y, z: 1 + 0.03 * sine(clamp(t / 1.5)) + 0.025 * sine(clamp((t - 1.5) / 3.6)) }),
  s2: t => ({ x: LY.s2.x, y: LY.s2.y, z: LY.s2.z * (1 + 0.025 * sine(prog(t, T.s2m, 5.4, x => x))) }),
  s3: t => {
    const a = ease.inOut(prog(t, T.m1, T.m5 - T.m1));         // ярусы растут — камера отъезжает
    const p = 1 + 0.02 * sine(prog(t, T.m6 + 0.2, 0.6, x => x));   // вершина: наезд 2 %
    return { x: lerp(LY.s3a.x, LY.s3.x, a), y: lerp(LY.s3a.y, LY.s3.y, a), z: Math.exp(lerp(Math.log(LY.s3a.z), 0, a)) * p };
  },
  s4: t => ({ x: LY.s4.x, y: LY.s4.y, z: LY.s4.z * (1 + 0.012 * sine(prog(t, T.pull + 0.5, 0.7, x => x))) }),
  s5: t => ({ x: LY.s5.x, y: LY.s5.y, z: 1 + 0.03 * sine(prog(t, T.pull + 1.2, 5.4, x => x)) }),
  s6: t => ({ x: LY.s6.x, y: LY.s6.y + 120 * ease.inOut(prog(t, T.s6 + 0.6, Math.max(0.6, T.q - 0.05 - T.s6 - 0.6))), z: 1 + 0.02 * sine(prog(t, T.s6, 7, x => x)) }),
  s7: t => ({ x: LY.s7.x, y: LY.s7.y, z: 1 + 0.025 * sine(prog(t, T.s7 + 0.6, 6.4, x => x)) }),
  s8: t => {
    // крэш-зум 6 к ease-in, наезд 2 % на выдержке; на ударе — единственная пружина pop всем кадром
    const kick = t > T.hit ? 0.045 * Math.exp(-(t - T.hit) / 0.12) * Math.cos((t - T.hit) * 26) : 0;
    return { x: LY.s8.x, y: LY.s8.y, z: LY.s8.z * (1 + 0.02 * sine(prog(t, T.crash + 0.3, 4.2, x => x))) * (1 + kick) };
  },
  fin: t => ({ x: LY.hook.x, y: LY.hook.y, z: lerp(0.96, 1, sine(prog(t, T.penArr, DUR - T.penArr, x => x))) }),
};
const CAMS = [
  [0, 0, SHOT.hook],
  [T.s2m, 0.55, SHOT.s2],
  [T.jump + 0.02, 0.58, SHOT.s3],
  [T.pull, 0.55, SHOT.s4],
  [T.pullIn, 0.6, SHOT.s5],
  [T.s6, 0.55, SHOT.s6],
  [T.s7, 0.6, SHOT.s7],
  [T.crash, 0.2, SHOT.s8, ease.in4],
  [T.pen, 0.6, SHOT.fin, ease.inOut],
];
function camAt(t) {
  let c = CAMS[0][2](t);
  for (let k = 1; k < CAMS.length; k++) {
    const [t0, d, fn, e = ease.inOut, o = {}] = CAMS[k];
    if (t <= t0) break;
    const m = e(clamp((t - t0) / d)), n = fn(t);
    let lz = lerp(Math.log(c.z), Math.log(n.z), m);
    // отъезд с «полкой»: быстро наружу, задержка на ×0,6, затем внутрь (плоская вершина)
    if (o.dip) lz += Math.log(o.dip) * Math.pow(Math.sin(Math.PI * clamp((t - t0) / d)), 0.45);
    c = { x: lerp(c.x, n.x, m) + (o.bx || 0) * Math.sin(Math.PI * clamp((t - t0) / d)), y: lerp(c.y, n.y, m), z: Math.exp(lz) };
  }
  // удар всем кадром: короткая тряска на T.hit (одна за ролик)
  const sk = shake(t, T.hit, 9, 0.32, 5, 24);
  return { x: c.x + sk.x / c.z, y: c.y + sk.y / c.z, z: c.z };
}
const camXf = (c, k = 1) => `translate(${f2(W / 2)} ${f2(H / 2)}) scale(${f2(c.z * k)}) translate(${f2(-c.x)} ${f2(-c.y)})`;

// ------------------------------------------------------------------ сцены-модули
window.SC = window.SC || {};
const API = {};          // то, чем модули делятся (гнездо полоски, вершина пирамиды, ящик, сетка, перо)
let MODS = [], caps = null, capsFin = null, root = null, wg = null, fg = null, LAYERS = null, mapG = null;

// ------------------------------------------------------------------ build
async function build() {
  root = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  document.getElementById('root').appendChild(root);
  const defs = S('defs', {}, root);
  // текстуры (детерминированно, один раз)
  const paper = bakePaper(1024, PAL.sheet, 1, 1), grain = bakeGrain(256, 5), desk = bakeDesk(1024, 1024, 7);
  patternFrom(defs, 'pPaper', await toURL(paper, 'image/jpeg', 0.92), 1024, 1024);
  patternFrom(defs, 'pGrain', await toURL(grain), 256, 256);
  patternFrom(defs, 'pDesk', await toURL(desk, 'image/jpeg', 0.92), 1024, 1024);
  const gl = S('linearGradient', { id: 'gLit', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  [[0, '#FFFFFF', 0.13], [0.45, '#FFFFFF', 0], [1, '#2A1E10', 0.07]].forEach(([o, c, a]) => S('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, gl));
  S('rect', { width: W, height: H, fill: PAL.desk }, root);
  wg = S('g', {}, root);
  const sh = LY.sheet;
  S('rect', { x: -3000, y: -3000, width: 9000, height: 10000, fill: 'url(#pDesk)' }, wg);
  // лист: мягкая тень на столе и тонкая светлая кромка
  S('rect', { x: sh.x0 + 5, y: sh.y0 + 7, width: sh.x1 - sh.x0, height: sh.y1 - sh.y0, fill: PAL.shadow, opacity: 0.08 }, wg);
  S('rect', { x: sh.x0 + 2, y: sh.y0 + 3, width: sh.x1 - sh.x0, height: sh.y1 - sh.y0, fill: PAL.shadow, opacity: 0.07 }, wg);
  S('rect', { x: sh.x0, y: sh.y0, width: sh.x1 - sh.x0, height: sh.y1 - sh.y0, fill: 'url(#pPaper)' }, wg);
  S('rect', { x: sh.x0, y: sh.y0, width: sh.x1 - sh.x0, height: sh.y1 - sh.y0, fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.6, 'stroke-width': 1.5 }, wg);
  LAYERS = {
    defs,
    field: S('g', {}, wg), burst: S('g', {}, wg), sheetInk: S('g', {}, wg),
    sh: S('g', {}, wg), tiles: S('g', {}, wg), tiles2: S('g', {}, wg), over: S('g', {}, wg),
    propsSh: S('g', {}, wg), props: S('g', {}, wg),
  };
  fg = S('g', {}, root);
  const capL = S('g', {}, root);
  mapG = S('g', {}, wg);
  const ctx = { L: LAYERS, API, defs, fg };
  // модули (порядок важен: hero последним — читает API остальных)
  for (const name of ['field', 'strip', 'scatter', 'pyr', 'box', 'pocket', 'grid', 'hero', 'fore']) {
    if (SC[name]) { const m = await SC[name](ctx); m.name = name; MODS.push(m); }
  }
  // субтитры: Onest по словам, ≥ 56 px; кайма цвета листа — читаются поверх плиток
  const ch = (...ix) => ix.map(i => [window.WORDS.words[i].w, i]);
  const spec = [
    [6, 7, 8], [9, 10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23],
    [24, 25], [26, 27, 28], [29], [30, 31, 32], [33, 34], [35, 36], [37, 38],
    [39, 40, 41, 42], [43, 44], [45, 46], [47, 48, 49], [50, 51, 52, 53],
    [54, 55, 56], [57], [58, 59, 60], [61, 62, 63], [64], [65], [66, 67], [68, 69], [70], [71, 72],
    [73, 74], [75, 76], [77, 78], [79, 80, 81], [82, 83], [84], [85, 86], [87, 88],
    [89, 90], [91, 92], [93], [94, 95, 96], [97, 98, 99],
  ].map(ix => ({ lines: [ch(...ix)] }));
  // тире «—» в тексте голоса — к предыдущему слову
  const DASH_AFTER = new Set([9, 19, 28, 32, 46, 70, 84, 90]);
  spec.forEach(c => c.lines[0].forEach(tk => { if (DASH_AFTER.has(tk[1])) tk[0] += ' —'; }));
  caps = makeCaptions(capL, spec, { x: 120, y: 1214, size: 60, lh: 70, maxW: 660, font: 'Onest, sans-serif', weight: 700, ink: PAL.ink, end: T.pen + 0.06 });
  capsFin = makeCaptions(capL, [
    { lines: [ch(100, 101), ch(102, 103)] }, { lines: [ch(104, 105, 106), ch(107, 108)] }, { lines: [ch(109)] },
  ], { x: 120, y: 1060, size: 72, lh: 84, maxW: 660, font: 'Onest, sans-serif', weight: 800, ink: PAL.ink, end: DUR - 0.04 });
  capL.querySelectorAll('text').forEach(t => { A(t, 'stroke', PAL.sheet); A(t, 'stroke-width', 9); A(t, 'paint-order', 'stroke'); A(t, 'stroke-linejoin', 'round'); });
  if (MAP) buildMap();
  if (COVER) {
    A(capL, 'display', 'none');
    const cg = S('g', {}, root), csh = S('g', {}, cg), ct = S('g', {}, cg);
    const slip = makeTile(ct, csh, { w: 960, h: 290, tone: 'slip', r: 6, depth: 3, line: 0 });
    tText(slip.front, 'Три «о»?', { y: -60, size: 100, font: FONT.head, weight: 900 });
    tText(slip.front, 'ИИ — ни одной', { y: 62, size: 80, font: FONT.head, weight: 900 });
    slip.set({ x: 540, y: 1360, rot: -2, lift: 8 });
    const ar = inkArrow(LAYERS.over, [[330, 800], [372, 838], [400, 868]], { seed: 77, w: 7, head: 28 }); ar.draw(1);   // из-под слова «хорошо», не после «?»
  }
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  if (MAP) return mapFrame();
  if (COVER) {                                               // полоска «как в вопросе», 46825 крупно, стрелка между ними
    const c = SHOT.hook(1.0);
    A(wg, 'transform', camXf(c)); A(fg, 'transform', camXf(c, 1.12));
    for (const m of MODS) m.frame(m.name === 'hero' ? 4.3 : 1.0, c);
    return;
  }
  const c = camAt(t);
  A(wg, 'transform', camXf(c));
  A(fg, 'transform', camXf(c, 1.12));
  window.__cam = c;
  for (const m of MODS) m.frame(t, c);
  caps.frame(t); capsFin.frame(t);
}

// ------------------------------------------------------------------ карта (QUERY=map=1): лист сверху, маршруты
function buildMap() {
  const M = mapG;
  const stops = [
    [1, LY.hook, 'хук'], [2, LY.s2, 'нарезка'], [3, LY.s3, 'пирамида'], [4, LY.s4, 'отъезд ×0,6'], [5, LY.s5, 'память'],
    [6, LY.s6, 'strawberry'], [7, LY.s7, 'по буквам'], [8, LY.s8, 'кульминация'], [9, LY.hook, 'финал → кадр 0'],
  ];
  // рамки кадров
  stops.forEach(([n, p], i) => {
    const z = p.z || 1, w = W / z, h = H / z;
    if (n === 9 || n === 4) return;
    S('rect', { x: p.x - w / 2, y: p.y - h / 2, width: w, height: h, fill: 'none', stroke: PAL.graphite, 'stroke-width': 7, 'stroke-dasharray': '26 16', opacity: 0.55 }, M);
  });
  // маршрут камеры (подкова)
  const pts = stops.map(s => s[1]);
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i].x} ${pts[i].y}`;
  S('path', { d: roughD(d, { seed: 3, roughness: 1, disableMultiStroke: true }), fill: 'none', stroke: PAL.ink, 'stroke-width': 12, opacity: 0.8 }, M);
  // подписи остановок: сдвиги, чтобы соседние не налезали
  const LAB = { 1: [80, 40, 'start'], 2: [-80, -30, 'end'], 3: [80, 0, 'start'], 4: [-80, 0, 'end'], 5: [80, 60, 'start'], 6: [80, 0, 'start'], 7: [-80, 0, 'end'], 8: [80, 0, 'start'], 9: [80, 0, 'start'] };
  stops.forEach(([n, p, lab], i) => {
    const off = n === 9 ? { x: 200, y: -260 } : { x: 0, y: 0 }, [lx, ly, an] = LAB[n];
    S('circle', { cx: p.x + off.x, cy: p.y + off.y, r: 62, fill: n === 8 ? PAL.yellow : PAL.slip, stroke: PAL.ink, 'stroke-width': 8 }, M);
    tText(M, String(n), { x: p.x + off.x, y: p.y + off.y, size: 70, font: FONT.mono, weight: 700 });
    const tl = tText(M, lab, { x: p.x + off.x + lx, y: p.y + off.y + ly, size: 72, weight: 800, anchor: an });
    A(tl, 'stroke', PAL.slip); A(tl, 'stroke-width', 16); A(tl, 'paint-order', 'stroke'); A(tl, 'stroke-linejoin', 'round');
  });
  // маршрут 46825: хук → гнездо → пирамида → ящик → рядом с сеткой → гнездо
  const hr = API.heroRoute || [];
  if (hr.length) {
    let hd = `M${hr[0].x} ${hr[0].y}`;
    hr.slice(1).forEach(p => { hd += `L${p.x} ${p.y}`; });
    S('path', { d: hd, fill: 'none', stroke: '#B07A12', 'stroke-width': 10, 'stroke-dasharray': '30 18', 'stroke-linecap': 'round' }, M);
    hr.forEach(p => S('circle', { cx: p.x, cy: p.y, r: 16, fill: '#B07A12' }, M));
  }
  // линия пера: столбец 913 → «·о» вопроса
  if (API.penRoute) {
    const [a, b] = API.penRoute;
    S('path', { d: `M${a.x} ${a.y}L${b.x} ${b.y}`, fill: 'none', stroke: PAL.graphite, 'stroke-width': 10, 'stroke-dasharray': '6 20', 'stroke-linecap': 'round' }, M);
  }
  // легенда — на столе, справа внизу
  const lg = S('g', { transform: `translate(-480 ${LY.sheet.y1 + 170})` }, M);
  tText(lg, 'Карта листа — подкова', { x: 0, y: 0, size: 110, weight: 800, anchor: 'start' });
  S('path', { d: 'M0 140H160', stroke: PAL.ink, 'stroke-width': 12 }, lg); tText(lg, 'камера: сцены 1–9', { x: 190, y: 140, size: 70, anchor: 'start', weight: 600 });
  S('path', { d: 'M0 240H160', stroke: '#B07A12', 'stroke-width': 10, 'stroke-dasharray': '30 18' }, lg); tText(lg, 'маршрут плитки 46825', { x: 190, y: 240, size: 70, anchor: 'start', weight: 600 });
  S('path', { d: 'M0 340H160', stroke: PAL.graphite, 'stroke-width': 10, 'stroke-dasharray': '6 20', 'stroke-linecap': 'round' }, lg); tText(lg, 'перо: 913 → «о» вопроса', { x: 190, y: 340, size: 70, anchor: 'start', weight: 600 });
}
function mapFrame() {
  const sh = LY.sheet, cx = (sh.x0 + sh.x1) / 2, cy = (sh.y0 + sh.y1 + 500) / 2;
  const z = Math.min(W / (sh.x1 - sh.x0 + 300), H / (sh.y1 - sh.y0 + 900));
  A(wg, 'transform', camXf({ x: cx, y: cy, z }));
  A(fg, 'display', 'none');
  for (const m of MODS) m.frame(m.mapT ?? 10, { x: cx, y: cy, z });
  caps.frame(-1); capsFin.frame(-1);
}

// ------------------------------------------------------------------ boot
window.DURATION = DUR;
window.T = T;
// звук: не больше одного на 0,1 с — из близких остаётся громкий (акцент); считается после построения сцен
const sfxFiltered = () => {
  const ev = [...SFX].sort((a, b) => a.t - b.t), out = [];
  for (const e of ev) {
    const last = out[out.length - 1];
    if (last && e.t - last.t < 0.1) { if ((e.gain_db ?? 0) > (last.gain_db ?? 0)) out[out.length - 1] = e; continue; }
    out.push(e);
  }
  return out;
};
window.SFX_EVENTS = [];
window.seek = t => frame(clamp(t, 0, DURATION));
window.READY = (async () => {
  await loadFonts();
  await build();
  window.SFX_EVENTS = sfxFiltered();
  frame(0);
  return true;
})();
