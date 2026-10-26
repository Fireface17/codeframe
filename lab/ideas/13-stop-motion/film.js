// Стилизатор «стоп-моушн на двойках»: одна и та же сцена scene(t, fx) идёт сначала гладко
// (60 к/с, плоский вектор), потом её «перерезает» шов-ножницы — справа налево всё становится
// бумажной аппликацией на двойках: время квантовано до 12 к/с, на каждом шаге детерминированное
// дрожание позиций и поворотов (hash01 от номера шага), контуры rough.js «кипят» ступенькой раз в шаг
// (3 заранее посчитанных варианта seed), у вырезок смещённая тень. Подложка-бумага статична.
//
// Стилизатор — обёртка над любой сценой вида scene(t, fx):
//   const play = stopMotion(scene, { fps: 12 });  play(t)       // вместо scene(t, SMOOTH)
// Сцена ставит элементы через fx.put(el, id, x, y, s, rot, o): обёртка добавляет дрожание и
// выбирает вариант контура; гладкий fx (SMOOTH) — без дрожания, вариант 0.

const P = {
  paper: '#f2ead9', fiber: '#d8cbb0', ink: '#2d2620', shadow: '#3b2a1a',
  hillB: '#5aa85f', hillF: '#93d07f', sun: '#ffc93c', ray: '#ffad33', cloud: '#ffffff',
  trunk: '#8a5a3b', crown: '#3f9b4f', house: '#e4572e', roof: '#7d3a2a', door: '#f2c14e', win: '#aee3ff',
  bird: '#2f4a8a', beak: '#ff8a3d',
  tiles: ['#ff8a5c', '#ffd23f', '#7cc6fe', '#f7a1c4', '#9be29b'],
};
window.SAFE = { x0: 54, x1: W - 54, y0: 54, y1: H - 54 };

// ------------------------------------------------------------------ cues (с)
const T = {};
T.hills = 0.15; T.tree = 0.5; T.house = 0.62; T.sun = 0.8; T.cloud = 1.0;
T.text = 1.2;                         // буквы-аппликация, шаг 0,07
T.bird = 1.9;                         // птица пролетает
T.wipe = 2.35; T.wipeD = 0.95;        // шов: гладкое -> на двойках
T.label = T.wipe + T.wipeD + 0.15;    // плашка с вызовом обёртки
T.end = 7.2;
T.out = T.end - 0.75;                 // уход каскадом (к T.end − 0,2 пустая бумага = кадр 0)

// ------------------------------------------------------------------ стилизатор (обёртка)
const ZERO = { dx: 0, dy: 0, rot: 0 };
function putWith(jit, vari) {
  return (el, id, x, y, s = 1, rot = 0, o = 1, k = 1) => {
    const j = jit(id, k);
    pose(el.g, x + j.dx, y + j.dy, s, s, rot + j.rot, o);
    if (el.outs) el.outs.forEach(p => A(p, 'd', p.vars[vari(id)]));
  };
}
const SMOOTH = t => ({ t, step: -1, put: putWith(() => ZERO, () => 0) });
// fps — частота «съёмки» (12 = на двойках при 24), pos/rot — сила дрожания (px, градусы),
// variants — сколько вариантов контура «кипит». Граница шага сдвинута на полкадра: смаз рендера
// (16 подкадров внутри кадра) никогда не смешивает два соседних шага.
function stopMotion(scene, { fps = 12, pos = 2.4, rot = 1.3, variants = 3, seed = 1 } = {}) {
  return t => {
    const n = Math.floor((t + 0.5 / FPS) * fps), tq = n / fps;
    const jit = (id, k) => ({
      dx: k * pos * (2 * hash01(n, seed + id * 7) - 1),
      dy: k * pos * (2 * hash01(n, seed + id * 7 + 3) - 1),
      rot: k * rot * (2 * hash01(n, seed + id * 7 + 5) - 1),
    });
    const vari = id => (n + Math.floor(hash01(id, seed + 99) * variants)) % variants;
    scene(tq, { t: tq, step: n, put: putWith(jit, vari) });
  };
}

// ------------------------------------------------------------------ формы (локальные координаты, центр/опора в 0)
function circleD(cx, cy, r, n = 36) {
  let d = '';
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1); }
  return d + 'Z';
}
function raysD(n, r0, r1) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, w = Math.PI / n * 0.55;
    const p = (ang, r) => `${(r * Math.cos(ang)).toFixed(1)} ${(r * Math.sin(ang)).toFixed(1)}`;
    d += `M${p(a - w, r0)}L${p(a, r1)}L${p(a + w, r0)}Z`;
  }
  return d;
}
// «вырезанный ножницами» четырёхугольник: углы чуть гуляют (hash01, постоянно)
function cutRect(w, h, seed) {
  const j = i => (hash01(i, seed) - 0.5) * 7;
  return `M${-w / 2 + j(1)} ${-h / 2 + j(2)}L${w / 2 + j(3)} ${-h / 2 + j(4)}L${w / 2 + j(5)} ${h / 2 + j(6)}L${-w / 2 + j(7)} ${h / 2 + j(8)}Z`;
}
const SHAPES = {
  hillB: 'M-60 1140L-60 760C160 680 360 700 560 780C700 836 900 800 1140 750L1140 1140Z',
  hillF: 'M-60 1140L-60 880C200 820 420 850 600 872C800 896 960 832 1140 852L1140 1140Z',
  cloud: 'M-130 34C-150 0 -112 -36 -78 -26C-70 -70 -10 -84 22 -52C46 -82 110 -66 112 -22C150 -18 150 34 118 40Z',
  trunk: 'M-14 0L-10 -170L10 -170L14 0Z',
  roofD: 'M-136 -160L0 -268L136 -160Z',
  bird: 'M-46 0C-30 -26 22 -26 44 -6L66 -10L50 4C30 22 -26 24 -46 0Z',
  wing: 'M-10 -4L26 -4L-4 -58Z',
  beak: 'M62 -12L84 -6L62 0Z',
};

// ------------------------------------------------------------------ сцена: build(parent, look) -> scene(t, fx)
// look.paper: тень-подложка + рисованный контур (бумажный вид); без него — плоский вектор
let _seed = 1;
function piece(parent, d, fill, look, opts = {}) {
  const g = S('g', {}, parent), seed = (_seed += 13);
  if (look.paper && !opts.noShadow) S('path', { d, fill: P.shadow, opacity: 0.2, transform: 'translate(5 7)' }, g);
  S('path', { d, fill }, g);
  const el = { g, outs: null };
  if (look.paper && !opts.noLine) {
    const p = S('path', { fill: 'none', stroke: P.ink, 'stroke-width': opts.sw || 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
    p.vars = [0, 1, 2].map(v => roughD(d, { seed: seed + v * 31, roughness: 1.25, bowing: 0.9, disableMultiStroke: true }));
    A(p, 'd', p.vars[0]);
    el.outs = [p];
  }
  return el;
}
function group(parent, parts) { const g = S('g', {}, parent); return { g, outs: null, parts }; }

function buildScene(parent, look) {
  _seed = 1;
  const rays = piece(parent, raysD(12, 92, 138), P.ray, look);
  const sun = piece(parent, circleD(0, 0, 84), P.sun, look);
  const cloud = piece(parent, SHAPES.cloud, P.cloud, look);
  const hillB = piece(parent, SHAPES.hillB, P.hillB, look);
  // дерево: опора — основание ствола
  const tree = group(parent);
  tree.outs = [];
  [piece(tree.g, SHAPES.trunk, P.trunk, look), piece(tree.g, circleD(0, -230, 92), P.crown, look), piece(tree.g, circleD(-48, -190, 52), P.crown, look)]
    .forEach(p => { if (p.outs) tree.outs.push(...p.outs); });
  // дом: опора — середина основания
  const house = group(parent);
  house.outs = [];
  // дым из трубы: три клуба по кругу (за трубой, внутри группы дома — уходят вместе с ним)
  const puffs = [0, 1, 2].map(i => piece(house.g, circleD(0, 0, 27, 18), '#ffffff', look, { sw: 2 }));
  [piece(house.g, 'M52 -256L52 -196L86 -196L86 -256Z', P.roof, look),
    piece(house.g, 'M-112 0L-112 -168L112 -168L112 0Z', P.house, look), piece(house.g, SHAPES.roofD, P.roof, look),
    piece(house.g, 'M-26 0L-26 -86L26 -86L26 0Z', P.door, look, { noShadow: true }), piece(house.g, 'M44 -134L88 -134L88 -92L44 -92Z', P.win, look, { noShadow: true })]
    .forEach(p => { if (p.outs) house.outs.push(...p.outs); });
  puffs.forEach(p => { if (p.outs) house.outs.push(...p.outs); });
  const hillF = piece(parent, SHAPES.hillF, P.hillF, look);
  // птица: тело + крыло (машет вокруг плеча) + клюв + глаз
  const bird = group(parent);
  const body = piece(bird.g, SHAPES.bird, P.bird, look), beak = piece(bird.g, SHAPES.beak, P.beak, look, { noShadow: true });
  S('circle', { cx: 30, cy: -8, r: 4.5, fill: '#fff' }, bird.g);
  const wing = piece(bird.g, SHAPES.wing, '#4466b0', look);
  bird.outs = [...(body.outs || []), ...(beak.outs || [])];
  // буквы-аппликация: каждая на своём клочке цветной бумаги
  const ROWS = [['ДОБРОЕ', 96 + 46, 158], ['УТРО', 96 + 46 + 92, 272]];
  const tiles = [];
  ROWS.forEach(([word, x0, y], r) => [...word].forEach((ch, i) => {
    const k = tiles.length, tp = piece(parent, cutRect(84, 100, 50 + k), P.tiles[k % 5], look, { sw: 2.2 });
    const tx = S('text', { x: 0, y: 25, 'text-anchor': 'middle', 'font-family': 'Rubik', 'font-weight': 800, 'font-size': 70, fill: P.ink }, tp.g);
    tx.textContent = ch;
    tiles.push({ ...tp, x: x0 + i * 92, y, tilt: (hash01(k, 77) - 0.5) * 9, k });
  }));
  // плашка: вызов обёртки (только у бумажной версии — появляется после шва)
  let label = null;
  if (look.paper) {
    const str = 'stopMotion(scene, { fps: 12 })', lw = str.length * 0.6 * 36 + 56;
    label = piece(parent, cutRect(lw, 76, 901), '#fffdf7', look, { sw: 2.2 });
    const lt = S('text', { x: 0, y: 12, 'text-anchor': 'middle', 'font-family': '"JetBrains Mono", monospace', 'font-size': 36, fill: P.ink }, label.g);
    lt.textContent = str;
  }

  // сама сцена: чистая функция времени t; fx.put добавляет «стиль»
  return (t, fx) => {
    const out = k => ease.in4((t - T.out - k * 0.05) / 0.3);
    const ent = (t0, sp = SP.pop) => (t < t0 ? 0 : step(t - t0, sp));
    // солнце: выскакивает, лучи вращаются; уходит вверх
    const so = out(3), ss = lerp(0.3, 1, ent(T.sun)) * (t < T.sun ? 0 : 1);
    fx.put(rays, 1, 830, 236 - 420 * so, ss, 14 * t, t < T.sun ? 0 : 1);
    fx.put(sun, 2, 830, 236 - 420 * so, ss, 0, t < T.sun ? 0 : 1);
    // облако: въезжает слева и дрейфует
    const cx = lerp(-260, 250, ent(T.cloud, SP.move)) + 22 * Math.max(0, t - T.cloud) - 700 * out(2);
    fx.put(cloud, 3, cx, 418, 1, 0, t < T.cloud ? 0 : 1);
    // холмы: выезжают снизу, уходят вниз последними
    fx.put(hillB, 4, 0, 420 * (1 - ent(T.hills, SP.tuck)) + 460 * out(6), 1, 0, t < T.hills ? 0 : 1, 0.6);
    fx.put(hillF, 5, 0, 420 * (1 - ent(T.hills + 0.12, SP.tuck)) + 460 * out(6.4), 1, 0, t < T.hills + 0.12 ? 0 : 1, 0.6);
    // дерево растёт от основания и качается
    fx.put(tree, 6, 250, 880 + 700 * out(5), ent(T.tree), 2.4 * Math.sin(2 * Math.PI * 0.45 * t), t < T.tree ? 0 : 1);
    // дом падает сверху с отскоком
    fx.put(house, 7, 790, 892 - 700 * (1 - ent(T.house, SP.hop)) + 860 * out(4.6), 1, 0, t < T.house ? 0 : 1);   // 860: с дымом над трубой
    // дым: клуб поднимается, растёт и тает; цикл 1,5 с, первый выход — после приземления дома
    puffs.forEach((p, i) => {
      const t0 = T.house + 0.9 + i * 0.5;
      if (t < t0) { pose(p.g, 69, -262, 0.01, 0.01, 0, 0); return; }
      const ph = ((t - t0) / 1.5) % 1;
      pose(p.g, 69 + 34 * ph, -266 - 170 * ph, 0.45 + 0.85 * ph, 0.45 + 0.85 * ph, 0, (ph < 0.75 ? 1 : (1 - ph) / 0.25) * (1 - out(4.2)));
    });
    // птица: пролёт по синусоиде, крыло машет (на двойках — рывками, как в настоящей анимации)
    const bt = t - T.bird, bx = -150 + 330 * bt, by = 560 + 34 * Math.sin(2 * Math.PI * 0.45 * bt);
    const vy = 34 * 2 * Math.PI * 0.45 * Math.cos(2 * Math.PI * 0.45 * bt);
    fx.put(bird, 8, bx, by, 1.5, Math.atan2(vy, 330) * 57.3 * 0.6, t < T.bird || bx > W + 150 ? 0 : 1);
    pose(wing.g, -6, -4, 1, 1, 34 * Math.sin(2 * Math.PI * 2.4 * t), 1);
    if (wing.outs) wing.outs.forEach(p => A(p, 'd', p.vars[(fx.step < 0 ? 0 : fx.step) % 3]));
    // буквы: падают с доворотом по одной, уходят вверх каскадом
    tiles.forEach(tl => {
      const t0 = T.text + tl.k * 0.07, e = ent(t0, SP.hop), o = out(tl.k * 0.15);
      fx.put(tl, 20 + tl.k, tl.x, tl.y - 260 * (1 - e) - 520 * o, 1, tl.tilt + 24 * (1 - ent(t0, SP.pop)) * (tl.k % 2 ? 1 : -1), t < t0 ? 0 : 1, 0.7);
    });
    if (label) {
      const e = ent(T.label, SP.pop);
      fx.put(label, 40, W / 2, 978 + 180 * (1 - e) + 300 * out(1), 1, -1.5, t < T.label ? 0 : 1, 0.6);
    }
  };
}

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
{ // бумага: статичные волокна и крапинки (hash01, строится один раз)
  S('rect', { width: W, height: H, fill: P.paper }, svg);
  let d = '';
  for (let i = 0; i < 420; i++) {
    const x = hash01(i, 1) * W, y = hash01(i, 2) * H, a = hash01(i, 3) * Math.PI, l = 5 + 14 * hash01(i, 4);
    d += `M${x.toFixed(1)} ${y.toFixed(1)}l${(l * Math.cos(a)).toFixed(1)} ${(l * Math.sin(a)).toFixed(1)}`;
  }
  S('path', { d, stroke: P.fiber, 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.8 }, svg);
  let s = '';
  for (let i = 0; i < 160; i++) s += circleD(hash01(i, 5) * W, hash01(i, 6) * H, 0.8 + 1.4 * hash01(i, 7), 6);
  S('path', { d: s, fill: '#c9b998', opacity: 0.55 }, svg);
}
const flatG = sceneG(svg), paperG = sceneG(svg);
const seam = S('g', {}, svg);
S('path', { d: `M0 -20V${H + 20}`, stroke: P.ink, 'stroke-width': 3.5, 'stroke-dasharray': '18 12' }, seam);
const flatClip = clipRect(defs, flatG), paperClip = clipRect(defs, paperG);
let playFlat = null, playPaper = null;

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  // шов идёт слева направо: слева уже бумага на двойках, справа ещё гладкий вектор
  const wx = lerp(-10, W + 10, prog(t, T.wipe, T.wipeD, ease.inOut));
  const fOn = t < T.wipe + T.wipeD, pOn = t >= T.wipe;
  flatG.on(fOn); paperG.on(pOn);
  flatClip.set(wx, -50, W - wx + 50, H + 100);
  paperClip.set(-50, -50, wx + 50, H + 100);
  if (fOn) playFlat(t);
  if (pOn) playPaper(t);
  A(seam, 'transform', `translate(${f2(wx)} 0)`);
  A(seam, 'visibility', t > T.wipe && t < T.wipe + T.wipeD ? 'visible' : 'hidden');
}

// ------------------------------------------------------------------ звук
sfx(T.hills, 'whoosh', -14);
sfx(T.house + 0.2, 'pop', -11);
sfx(T.text, 'tick', -12);
sfx(T.wipe, 'scribble', -9);
sfx(T.label, 'pop', -12);
sfx(T.out, 'whoosh', -13);

// ------------------------------------------------------------------ boot
window.DURATION = Math.round(T.end * FPS) / FPS;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, window.DURATION));
window.READY = (async () => {
  await loadFonts();
  const flat = buildScene(flatG, { paper: false }), paper = buildScene(paperG, { paper: true });
  playFlat = t => flat(t, SMOOTH(t));                  // та же сцена, гладко
  playPaper = stopMotion(paper, { fps: 12 });           // та же сцена в обёртке
  frame(0);
  return true;
})();
