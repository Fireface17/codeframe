// Ролик №1 «Этот ролик посчитали» — канал «Код и кадр». 1080×1920, 30 к/с.
// Каждый кадр — чистая функция t; cues — от слов голоса (window.WORDS, tools/timing.mjs).
// Порядок: одна цифра и шарик (их код виден в ролике: snippets/a-seed.js + b-ball.js, проверка —
// tools/codecheck.mjs) → палитра → cues → герой (композиция хука) → акт 1 (сцены 1–4) →
// акт 2 (сцены 6–8) → модули js/scenes/*.js (5 и 10 — timeline.js, 9 — logo.js) → frame(t).

// одна цифра — весь ролик
const SEED = 7;
// шарик падает и пружинит
const ball = t =>
  560 * step(t, SP.hop);

// ------------------------------------------------------------------ палитра из SEED
// look(seed): поворот оттенка всех акцентов (SEED 7 — исходная палитра), темп героя, порядок и
// направления влёта фигур. ?seed=3 — весь ролик в другой палитре (проверка, что цифра правда работает).
const QS = new URLSearchParams(location.search);
const BASE = ['#FF5A3C', '#FFC83D', '#2DD4A0', '#4F7BFF', '#B58CFF'];   // коралл, жёлтый, мята, синий, сирень
const look = seed => ({ seed, turn: (seed - 7) * 137.5, c: BASE.map(c => hueRot(c, (seed - 7) * 137.5)), speed: 1 + (7 - seed) * 0.12 });
const LOOK = look(Number(QS.get('seed') || SEED));
const NEW = 3;                                            // во что превращается цифра в сцене 8
const COVER = QS.has('cover');                            // ?cover=1: обложка «НЕ СНЯТО. ПОСЧИТАНО.» без субтитров
const P = { bg: '#0E1016', band: '#07080B', panel: '#161A23', line: '#2A3141', ink: '#F4F0E6', mute: '#8C93A3', c: LOOK.c, hot: LOOK.c[1] };
window.SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 };
const CD = window.CODE_DATA;

// ------------------------------------------------------------------ cues (от слов)
const T = {};
T.freeze = pw(1, 'нет').start - 0.06;                   // стоп-кадр посреди движения
T.txt1 = T.freeze + 0.04;                               // «НЕ СНЯТО.»
T.txt2 = pw(1, 'нарисованного').start - 0.08;           // «НЕ НАРИСОВАНО.»
T.s2 = phrase(2).start - 0.12;                          // 2: стоп-кадр -> кадрик ленты
T.zoom = T.s2 + 0.02; T.zoomD = 0.7;
T.cells = T.zoom + 0.42;                                // соседние кадрики
T.count = pw(2, 'тридцать').start - 0.12;               // счётчик и прогон ленты
T.run = T.count; T.runD = 1.1;
T.s3 = phrase(3).start - 0.12;                          // 3: карандаш -> f(t) -> кадр
T.pencil = pw(3, 'картинку').start - 0.05;
T.strike = pw(3, 'рисовать').start + 0.1;
T.ft = pw(3, 'посчитать').start - 0.22;
T.grow = pw(3, 'посчитать').start + 0.08;
T.s4 = phrase(4).start - 0.12;                          // 4: ползунок времени
T.rew = pw(4, 'даёшь').start + 0.05;
T.sweep = pw(4, 'время').start - 0.05;
T.s5 = phrase(5).start - 0.15;                          // 5: без таймлайна (модуль)
T.s6 = phrase(6).start - 0.05;                          // 6: слова -> код -> кадры
T.code = pw(6, 'claude').start - 0.28;
T.type0 = pw(6, 'claude').start;
T.render = pw(6, 'браузер').start - 0.28;
T.prog0 = pw(6, 'браузер').start; T.prog1 = pw(6, 'кадры').end + 0.15;
T.type1 = Math.min(pw(6, 'код').end + 0.1, T.render - 0.04);   // допечатать до ухода камеры
T.s7 = phrase(7).start - 0.12;                          // 7: отъезд, одно число
T.hl = pw(7, 'главное').start - 0.08;
T.s8 = phrase(8).start - 0.12;                          // 8: цифра -> новый ролик
T.digit = pw(8, 'цифру').start - 0.06;
T.rebuild = pw(8, 'пересобирается').start - 0.06;
T.claim = pw(8, 'сам').start - 0.1;
T.s9 = phrase(9).start - 0.15;                          // 9: знак канала (модуль)
T.s10 = phrase(10).start - 0.12;                        // 10: финал и петля (модуль)
T.end = window.WORDS.duration + 0.35;
T.clear = T.end - 0.45;                                 // к T.end - 0.15 пустой фон = кадр 0
const DURATION = Math.round(T.end * FPS) / FPS;
const NF = Math.round(DURATION * FPS);                  // кадров в ролике (терминал рендера в сцене 6)

// ------------------------------------------------------------------ герой: композиция хука
// hero(parent, look) -> { g, frame(tau) }: тот же код рисует хук во весь экран, кадрики ленты, окно
// ползунка и превью «одной цифры». Координаты — кадр 1080×1920, фон свой.
SP.fly = { r: 0.62, z: 0.6 };        // влёт с посадкой (~10 %)
SP.sweep = { r: 2.0, z: 1 };         // бегунок: долгий мягкий проезд
SP.cam = { r: 0.75, z: 1 };          // камера акта 2
const HERO = [                       // вид, x, y, размер, поворот, цвет; низ композиции не ниже y ~1050 (ниже — субтитры)
  ['disc', 540, 680, 190, 0, 0], ['half', 290, 420, 120, 35, 2], ['ring', 800, 430, 96, 0, 4],
  ['sq', 250, 850, 180, -14, 3], ['tri', 820, 870, 115, 10, 1], ['pill', 560, 1000, 270, -6, 4],
  ['plus', 150, 630, 42, 0, 1], ['zig', 930, 640, 60, 0, 2],
];
const HC = [540, 680];               // центр композиции: орбита точек, поворот раскладки от SEED
function heroShape(g, kind, s, fill) {
  if (kind === 'disc') S('circle', { r: s, fill }, g);
  else if (kind === 'half') S('path', { d: `M${-s} 0A${s} ${s} 0 0 1 ${s} 0Z`, fill }, g);
  else if (kind === 'ring') S('path', { d: arcD(0, 0, s, 20, 320), fill: 'none', stroke: fill, 'stroke-width': s * 0.3, 'stroke-linecap': 'round' }, g);
  else if (kind === 'sq') S('rect', { x: -s / 2, y: -s / 2, width: s, height: s, rx: s * 0.18, fill }, g);
  else if (kind === 'tri') S('path', { d: `M0 ${-s}L${s * 0.866} ${s / 2}L${-s * 0.866} ${s / 2}Z`, fill, stroke: fill, 'stroke-width': s * 0.14, 'stroke-linejoin': 'round' }, g);
  else if (kind === 'pill') S('rect', { x: -s / 2, y: -s * 0.15, width: s, height: s * 0.3, rx: s * 0.15, fill }, g);
  else if (kind === 'plus') S('path', { d: `M${-s} 0H${s}M0 ${-s}V${s}`, stroke: fill, 'stroke-width': s * 0.55, 'stroke-linecap': 'round' }, g);
  else if (kind === 'zig') S('path', { d: `M${-s} ${s / 4}L${-s / 2} ${-s / 4}L0 ${s / 4}L${s / 2} ${-s / 4}L${s} ${s / 4}`, fill: 'none', stroke: fill, 'stroke-width': s * 0.26, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
}
function hero(parent, lk) {
  const g = S('g', {}, parent);
  S('rect', { width: W, height: H, fill: P.bg }, g);
  const tr = (lk.turn || 0) * Math.PI / 180, cs = Math.cos(tr), sn = Math.sin(tr);   // раскладка поворачивается вокруг HC
  const exitD = (x, y, dx, dy) => Math.min(dx > 1e-6 ? (W - x) / dx : dx < -1e-6 ? -x / dx : 1e9, dy > 1e-6 ? (H - y) / dy : dy < -1e-6 ? -y / dy : 1e9);
  const items = HERO.map(([kind, x0, y0, s, rot, ci], i) => {
    const sg = S('g', { visibility: 'hidden' }, g);
    heroShape(sg, kind, s, lk.c[ci]);
    const x = HC[0] + (x0 - HC[0]) * cs - (y0 - HC[1]) * sn, y = HC[1] + (x0 - HC[0]) * sn + (y0 - HC[1]) * cs;
    const a = 2 * Math.PI * hash01(i, lk.seed * 7 + 1), dx = Math.cos(a), dy = Math.sin(a);
    return { kind, sg, x, y, rot, i, dx, dy, D: exitD(x, y, dx, dy) + 1.2 * s + 40, bend: (hash01(i, lk.seed + 3) - 0.5) * 520,
      spin: (hash01(i, lk.seed + 5) - 0.5) * 320, ph: hash01(i, lk.seed + 9) };
  });
  const keys = items.map(it => (it.kind === 'disc' ? -1 : hash01(it.i, lk.seed + 31)));   // диск первым, остальные — в порядке от SEED
  items.forEach((it, i) => { it.t0 = keys.filter(v => v < keys[i]).length * 0.2; });
  // три точки на орбите вокруг диска, со следом (у стоп-кадра след застывает)
  const dots = [0, 1, 2].map(k => ({ k,
    ghosts: [3, 2, 1].map(j => S('circle', { r: 18 - 3 * j, fill: P.ink, opacity: f2(0.34 - 0.09 * j), visibility: 'hidden' }, g)),
    d: S('circle', { r: 18, fill: P.ink, visibility: 'hidden' }, g) }));
  const at = (it, u) => {
    const v = u - it.t0;
    if (v <= 0) return null;
    const e = step(v, SP.fly), arc = Math.sin(Math.PI * clamp(e)) * it.bend, D = it.D, pe = step(v, SP.pop);
    let x = it.x + it.dx * D * (1 - e) - it.dy * arc, y = it.y + it.dy * D * (1 - e) + it.dx * arc;
    let rot = it.rot + it.spin * (1 - pe), s = lerp(0.55, 1, pe), q = 0;
    const live = clamp((v - 0.45) / 0.5);                         // жизнь после посадки
    y += live * 9 * Math.sin(2 * Math.PI * (0.55 * u + it.ph));
    rot += live * 4 * Math.sin(2 * Math.PI * (0.4 * u + it.ph));
    if (it.kind === 'disc') s *= 1 + live * 0.045 * Math.sin(2 * Math.PI * 1.25 * u);
    else if (it.kind === 'ring') rot += 110 * u;
    else if (it.kind === 'tri' && u > 1.5) {                        // прыжки со сквошем на приземлении
      const c = (u - 1.5) / 0.78, p = c % 1;
      y -= 380 * p * (1 - p);
      if (c >= 1) q = 0.2 * Math.exp(-p * 0.78 / 0.07);
    } else if (it.kind === 'plus') rot += 90 * (Math.floor(u / 0.7) + step(u % 0.7, SP.snap));
    else if (it.kind === 'pill') x += live * 40 * Math.sin(2 * Math.PI * 0.6 * u);
    else if (it.kind === 'zig') rot += live * 12 * Math.sin(2 * Math.PI * 1.1 * u);
    return { x, y, rot, s, q };
  };
  const frame = tau => {
    const u = Math.max(0, tau) * lk.speed;
    for (const it of items) {
      const p = at(it, u);
      if (!p) { A(it.sg, 'visibility', 'hidden'); continue; }
      const p0 = at(it, u - 1 / 60) || p;                           // скорость -> вытягивание по ходу
      const vx = (p.x - p0.x) * 60, vy = (p.y - p0.y) * 60, k = clamp(Math.hypot(vx, vy) / 9000, 0, 0.28);
      const dir = Math.atan2(vy, vx) * 57.29578;
      A(it.sg, 'visibility', 'visible');
      A(it.sg, 'transform', `translate(${f2(p.x)} ${f2(p.y)}) rotate(${f2(dir)}) scale(${f2(1 + k)} ${f2(1 - k)}) rotate(${f2(p.rot - dir)}) scale(${f2(p.s * (1 + p.q))} ${f2(p.s * (1 - p.q))})`);
    }
    for (const dt of dots) {
      const put = (el, w) => {
        if (w <= 1.55) { A(el, 'visibility', 'hidden'); return; }
        const e = step(w - 1.55, SP.pop), a = 2 * Math.PI * (0.42 * w + dt.k / 3);
        A(el, 'cx', f2(HC[0] + 290 * e * Math.cos(a))); A(el, 'cy', f2(HC[1] + 250 * e * Math.sin(a))); A(el, 'visibility', 'visible');
      };
      put(dt.d, u);
      dt.ghosts.forEach((gh, j) => put(gh, u - 0.05 * (3 - j)));
    }
  };
  return { g, frame };
}
// кадр: герой, обрезанный по рамке, + контур рамки (толщина не зависит от масштаба)
function cell(parent, lk) {
  const g = S('g', {}, parent), inner = S('g', { 'clip-path': 'url(#frameClip)' }, g);
  const h = hero(inner, lk);
  const edge = S('rect', { width: W, height: H, rx: 56, fill: 'none', stroke: P.line, 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke' }, g);
  return { g, h, edge };
}
const at2 = (g, cx, cy, s, o) => { A(g, 'transform', `translate(${f2(cx)} ${f2(cy)}) scale(${f2(Math.max(s, 1e-4))}) translate(${-W / 2} ${-H / 2})`); show(g, o); };

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
{ const cp = S('clipPath', { id: 'frameClip', clipPathUnits: 'userSpaceOnUse' }, defs); S('rect', { width: W, height: H, rx: 56 }, cp); }
S('rect', { width: W, height: H, fill: P.bg }, svg);
const L1 = sceneG(svg), L5 = sceneG(svg), L2 = sceneG(svg), L9 = sceneG(svg), L10 = sceneG(svg);
const capsLayer = S('g', {}, svg);
let f1, f2_, f5, f9, f10, caps;

// ------------------------------------------------------------------ акт 1: хук, лента, карандаш, ползунок
function buildAct1(g) {
  const CS = 0.22, cw = W * CS, chh = H * CS, CY = 790, pitch = cw + 26, K = 7;
  const Dt = (T.freeze - 1.2) / K;                  // шаг между кадриками: после прогона в центре кадр t = 1.2
  const tauK = k => T.freeze + k * Dt;
  // лента: подложка и перфорация
  const bandG = S('g', {}, g);
  S('rect', { x: -40, y: CY - chh / 2 - 64, width: W + 80, height: chh + 128, fill: P.band }, bandG);
  let d = '';
  for (let x = -8 * pitch; x < W + 3 * pitch; x += pitch / 4) d += rr(x - 9, CY - chh / 2 - 46, 18, 28, 6) + rr(x - 9, CY + chh / 2 + 18, 18, 28, 6);
  const perf = S('path', { d, fill: P.bg }, bandG);
  const pool = [...Array(8)].map(() => cell(g, LOOK));          // соседние кадрики — настоящие кадры хука
  const main = cell(g, LOOK);                                   // хук во весь экран, потом он же — кадрик
  const ca = cell(g, LOOK);                                     // сцена 3: «нарисованный» кадр
  const bWrap = S('g', {}, g), bClip = clipCircle(defs, bWrap), cb = cell(bWrap, LOOK);   // «посчитанный» = окно ползунка
  // стоп-кадр: вспышка, плашка-пауза, надписи
  const flash = S('rect', { width: W, height: H, fill: '#ffffff', visibility: 'hidden' }, g);
  const scrim = S('rect', { width: W, height: H, fill: P.bg }, g);                 // пауза: ровно гасим весь кадр
  const sz1 = fitSize(COVER ? 'ПОСЧИТАНО.' : 'НЕ НАРИСОВАНО.', 690, COVER ? 104 : 92);
  const h1 = headline(g, 'НЕ СНЯТО.', { x: 540, y: 700, size: sz1, fill: P.ink, outline: P.bg });
  const h2 = headline(g, COVER ? 'ПОСЧИТАНО.' : 'НЕ НАРИСОВАНО.', { x: 540, y: 700 + sz1 * 1.25, size: sz1, fill: P.hot, outline: P.bg });
  // счётчик «30 / СЕК»
  const cntG = S('g', {}, g);
  const cntN = S('text', { x: 560, y: 462, 'text-anchor': 'end', 'font-family': FONT.head, 'font-weight': 900, 'font-size': 150, fill: P.ink }, cntG);
  S('text', { x: 590, y: 462, 'font-family': FONT.head, 'font-weight': 900, 'font-size': 60, fill: P.hot }, cntG).textContent = '/ СЕК';
  // сцена 3: карандаш (Tabler) зачёркивается, f(t), заголовок
  const pen = icon(g, 'pencil', 150, P.ink, 1.7);
  const cross = drawStroke(g, roughD('M252 392 L410 552', { seed: 9, roughness: 0.9, disableMultiStroke: true }), { stroke: P.c[0], 'stroke-width': 14 });
  const ftG = S('g', {}, g);
  const ft = S('text', { x: 735, y: 545, 'text-anchor': 'middle', 'font-family': FONT.mono, 'font-weight': 700, 'font-size': 120, fill: P.hot }, ftG);
  ft.textContent = 'f(t)';
  const ftClip = clipRect(defs, ftG);
  const s3 = fitSize('НЕ РИСУЮ — СЧИТАЮ', 690, 60);
  const w3a = textWidth('НЕ РИСУЮ — ', s3, FONT.head, 900), w3 = w3a + textWidth('СЧИТАЮ', s3, FONT.head, 900);
  const h3a = headline(g, 'НЕ РИСУЮ —', { x: 540 - w3 / 2, y: 372, size: s3, fill: P.mute, anchor: 'start' });
  const h3b = headline(g, 'СЧИТАЮ', { x: 540 - w3 / 2 + w3a, y: 372, size: s3, fill: P.hot, anchor: 'start' });
  // сцена 4: подпись «t = 1.2 → кадр» и ползунок
  const labG = S('g', {}, g), ls = 68, wt = 4 * 0.6 * ls, wn = 3 * 0.6 * ls, wk = textWidth('кадр', ls, FONT.text, 800);
  const lx = 540 - (wt + wn + 34 + 70 + 34 + wk) / 2, ly = 380;
  S('text', { x: lx, y: ly, 'font-family': FONT.mono, 'font-weight': 700, 'font-size': ls, fill: P.ink, style: 'white-space:pre' }, labG).textContent = 't = ';
  const labN = S('text', { x: lx + wt, y: ly, 'font-family': FONT.mono, 'font-weight': 700, 'font-size': ls, fill: P.hot }, labG);
  const ad = arrowD(lx + wt + wn + 34, ly - 22, lx + wt + wn + 34 + 70, ly - 22, { head: 18 });
  S('path', { d: ad.line + ad.head, fill: 'none', stroke: P.mute, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, labG);
  S('text', { x: lx + wt + wn + 34 + 70 + 34, y: ly, 'font-family': FONT.text, 'font-weight': 800, 'font-size': ls, fill: P.ink }, labG).textContent = 'кадр';
  const SL = { x0: 230, x1: 750, y: 1010, v1: 2.5 };
  const sliG = S('g', {}, g);
  const track_ = drawStroke(sliG, `M${SL.x0} ${SL.y}H${SL.x1}`, { stroke: P.line, 'stroke-width': 8 });
  const fill_ = S('path', { d: '', stroke: P.hot, 'stroke-width': 8, 'stroke-linecap': 'round', fill: 'none' }, sliG);
  [['0', SL.x0], ['2.5', SL.x1]].forEach(([s, x]) => S('text', { x, y: SL.y - 34, 'text-anchor': 'middle', 'font-family': FONT.mono, 'font-size': 30, fill: P.mute }, sliG).textContent = s);
  const knob = S('g', {}, sliG);
  S('circle', { r: 26, fill: P.hot }, knob); S('circle', { r: 10, fill: P.bg }, knob);
  const kn = track(1.2, [[T.rew, 0, { r: 0.75, z: 1 }], [T.sweep, SL.v1, SP.sweep]]);   // перемотка назад (окно играет хук задом наперёд), потом вперёд
  const F = [(540 - cw / 2) / (1 - CS), (CY - chh / 2) / (1 - CS)];      // неподвижная точка зума (engine.md §9)
  pool.forEach(c => A(c.edge, 'opacity', 1));

  return t => {
    // ---- 1: хук играет до стоп-кадра, потом дрожит; 2: уменьшается в кадрик и едет с лентой
    const z = prog(t, T.zoom, T.zoomD, ease.inOut), s = Math.exp(Math.log(CS) * z);
    const scroll = K * pitch * prog(t, T.run, T.runD, ease.inOut);
    const fz = t >= T.freeze, n = Math.floor(t * 12), jit = fz ? 3.2 * (1 - z) : 0;
    const out3 = prog(t, T.s3, 0.3, ease.out);
    if (t < T.s3) {
      A(main.g, 'transform', `translate(${f2(F[0] + scroll + jit * (2 * hash01(n, 11) - 1))} ${f2(F[1] + jit * (2 * hash01(n, 12) - 1))}) scale(${f2(s)}) translate(${f2(-F[0])} ${f2(-F[1])})`);
      show(main.g, 1);
      A(main.edge, 'opacity', f2(fz && !COVER ? prog(t, T.freeze, 0.25) : 0));
      main.h.frame(Math.min(t, T.freeze));
    } else show(main.g, 0);
    show(bandG, clamp((z - 0.35) / 0.4) * (1 - out3));
    A(perf, 'transform', `translate(${f2(scroll)} 0)`);
    pool.forEach(c => show(c.g, 0));
    if (t >= T.cells && t < T.s3 + 0.3) {
      const kmin = Math.floor((-cw - (540 - cw / 2) - scroll) / pitch);
      for (let k = kmin; k < kmin + 8; k++) {
        if (k === 0 || (k === -K && t >= T.s3)) continue;
        const c = pool[((k % 8) + 8) % 8], t0 = T.cells + (Math.abs(k) - 1) * 0.07;
        if (t < t0) continue;
        at2(c.g, 540 + k * pitch + scroll, CY, CS * lerp(0.7, 1, step(t - t0, SP.pop)), popO(t, t0) * (1 - out3));
        c.h.frame(tauK(k));
      }
    }
    show(flash, fz ? 0.14 * (1 - prog(t, T.freeze, 0.22, ease.out)) : 0);
    const sOut = prog(t, T.s2 - 0.06, 0.24, ease.in4);
    show(scrim, fz ? (COVER ? 0.2 : 0.55) * prog(t, T.freeze, 0.12, ease.out) * (1 - sOut) : 0);   // на обложке фигуры остаются яркими
    h1.set(t, T.txt1, T.s2 - 0.06, shake(t, T.txt1, 12, 0.4, 3));
    h2.set(t, T.txt2, T.s2 - 0.06, shake(t, T.txt2, 12, 0.4, 5));
    // счётчик
    setText(cntN, String(Math.round(countTo(t, T.count, 0.9, 0, 30))));
    const ci = t < T.count - 0.15 ? 0 : step(t - T.count + 0.15, SP.pop), co = prog(t, T.s3, 0.24, ease.in4);
    popAt(cntG, 540, 400, lerp(0.7, 1, ci), (t < T.count - 0.15 ? 0 : step(t - T.count + 0.15, SP.out)) * (1 - co), -20 * co);
    // ---- 3: «нарисованный» кадр с карандашом против «посчитанного» из f(t)
    const out4 = prog(t, T.s4, 0.3, ease.in4), mv = after(t, T.s3, SP.move);
    if (t >= T.s3 && t < T.s4 + 0.35) {
      at2(ca.g, lerp(540, 330, mv), lerp(CY, 800, mv) + 420 * out4, CS, 1 - out4);
      ca.h.frame(tauK(-K));
    } else show(ca.g, 0);
    place(pen, 330, 470, t < T.pencil ? 0 : lerp(0.4, 1, step(t - T.pencil, SP.pop)), popO(t, T.pencil) * (1 - out4));
    cross.draw(prog(t, T.strike, 0.26, ease.out));
    A(cross, 'opacity', f2(1 - out4));
    ftClip.set(585, 400, 300 * prog(t, T.ft, 0.38, ease.inOut), 200);
    A(ftG, 'transform', `translate(0 ${f2(-50 * out4)})`); show(ftG, t < T.ft ? 0 : 1 - out4);
    h3a.set(t, T.strike, T.s4 - 0.1); h3b.set(t, T.grow, T.s4 - 0.1);
    // ---- 4: «посчитанный» кадр становится окном ползунка; бегунок = время, окно = кадр героя
    const mb = after(t, T.s4, SP.move), out5 = prog(t, T.s5 - 0.05, 0.28, ease.in4);
    const tau = Math.max(0, kn(t));
    if (t >= T.grow && t < T.s5 + 0.3) {
      bClip.set(735, 500, t < T.s4 ? 1500 * prog(t, T.grow, 0.6, ease.out) : 3000);
      at2(cb.g, lerp(735, 490, mb), lerp(800, 680, mb) + 60 * out5, lerp(CS, 0.28, mb) * (1 - 0.15 * out5), 1 - out5);
      cb.h.frame(t < T.s4 ? tauK(-K) : tau);
    } else show(cb.g, 0);
    const l0 = T.s4 + 0.3, li = t < l0 ? 0 : step(t - l0, SP.pop);          // после ухода «НЕ РИСУЮ — СЧИТАЮ»: без наложения
    popAt(labG, 540, 360, lerp(0.8, 1, li), (t < l0 ? 0 : step(t - l0, SP.out)) * (1 - out5));
    setText(labN, tau.toFixed(1));
    const sv = prog(t, T.s4 + 0.15, 0.4, ease.out), kx = lerp(SL.x0, SL.x1, clamp(tau / SL.v1, 0, 1));
    track_.draw(sv);
    A(fill_, 'd', `M${SL.x0} ${SL.y}H${f2(Math.max(SL.x0 + 0.01, kx))}`); show(fill_, sv > 0.95 ? 1 : 0);
    const kp = t < T.s4 + 0.3 ? 0 : step(t - T.s4 - 0.3, SP.pop);
    A(knob, 'transform', `translate(${f2(kx)} ${SL.y}) scale(${f2(Math.max(1e-3, kp))})`);
    show(sliG, t < T.s4 ? 0 : 1 - out5);
  };
}

// ------------------------------------------------------------------ акт 2: слова -> код -> кадры, одна цифра
function buildAct2(g) {
  const world = S('g', {}, g), over = S('g', {}, g);
  // облачко с промптом: слова «текут», как ответ в чате
  const BUB = { x: 540, y: 520 }, bs = 52, words = 'шарик падает и пружинит'.split(' ');
  const sp = textWidth('a a', bs, FONT.text, 700) - 2 * textWidth('a', bs, FONT.text, 700);
  const ws = words.map(w => textWidth(w, bs, FONT.text, 700)), tw = ws.reduce((a, b) => a + b) + sp * (words.length - 1);
  const bw = tw + 100, bh = 136, bx = BUB.x - bw / 2, by = BUB.y - bh / 2;
  const bubG = S('g', {}, world);
  S('rect', { x: bx, y: by, width: bw, height: bh, rx: 40, fill: P.panel, stroke: P.c[2], 'stroke-width': 3 }, bubG);
  S('path', { d: `M${bx + 70} ${by + bh - 2}L${bx + 52} ${by + bh + 42}L${bx + 118} ${by + bh - 2}`, fill: P.panel, stroke: P.c[2], 'stroke-width': 3, 'stroke-linejoin': 'round' }, bubG);
  let wx = bx + 50;
  const wEls = words.map((w, i) => { const e = S('text', { x: wx, y: BUB.y + 18, 'font-family': FONT.text, 'font-weight': 700, 'font-size': bs, fill: P.ink }, bubG); e.textContent = w; wx += ws[i] + sp; return e; });
  const ar1 = arrow(world, 540, by + bh + 26, 540, 718, { stroke: P.mute, 'stroke-width': 6 });
  // плашка кода: настоящий кусок film.js (SEED — приглушён, шарик — печатается)
  const PL = { x: 157, y: 740, w: 766, hdr: 56, size: 44 }, LHp = 1.5 * PL.size, y0 = PL.y + PL.hdr + 14 + 0.82 * PL.size;
  const H5 = y0 + 4 * LHp + 0.3 * PL.size + 24 - PL.y, H2 = y0 + LHp + 0.3 * PL.size + 24 - PL.y;
  const plateG = S('g', {}, world);
  const plateBg = S('rect', { x: PL.x, y: PL.y, width: PL.w, height: H5, rx: 26, fill: P.panel, stroke: P.line, 'stroke-width': 2 }, plateG);
  [0, 1, 2].forEach(i => S('circle', { cx: PL.x + 34 + i * 26, cy: PL.y + 28, r: 8, fill: P.line }, plateG));
  S('text', { x: PL.x + 130, y: PL.y + 38, 'font-family': FONT.mono, 'font-size': 28, fill: P.mute }, plateG).textContent = 'film.js';
  const seedG = S('g', {}, plateG), ballG = S('g', {}, plateG);
  const seedSc = codeScene(seedG, { from: CD['a-seed'], x0: PL.x + 40, y0, size: PL.size, dim: 1 });
  const ballSc = codeScene(ballG, { from: CD['b-ball'], x0: PL.x + 40, y0: y0 + 2 * LHp, size: PL.size, type: { t0: T.type0, t1: T.type1, seed: 5 }, dim: 1 });
  const ar2 = arrow(world, 540, PL.y + H5 + 22, 540, 1255, { stroke: P.mute, 'stroke-width': 6 });
  // терминал рендера: команда, прогресс, счёт кадров (NF — настоящее число кадров ролика)
  const TR = { x: 157, y: 1272, w: 766, h: 150 };
  const termG = S('g', {}, world);
  S('rect', { x: TR.x, y: TR.y, width: TR.w, height: TR.h, rx: 22, fill: P.band, stroke: P.line, 'stroke-width': 2 }, termG);
  S('text', { x: TR.x + 34, y: TR.y + 72, 'font-family': FONT.mono, 'font-weight': 700, 'font-size': 36, fill: P.c[2] }, termG).textContent = '$';
  const cmd = S('text', { x: TR.x + 34 + 0.6 * 36 * 2, y: TR.y + 72, 'font-family': FONT.mono, 'font-size': 36, fill: P.ink, style: 'white-space:pre' }, termG);
  S('rect', { x: TR.x + 34, y: TR.y + 104, width: 340, height: 12, rx: 6, fill: P.line }, termG);
  const bar = S('rect', { x: TR.x + 34, y: TR.y + 104, width: 0, height: 12, rx: 6, fill: P.c[2] }, termG);
  const fcount = S('text', { x: TR.x + TR.w - 54, y: TR.y + 120, 'text-anchor': 'end', 'font-family': FONT.mono, 'font-size': 30, fill: P.mute, style: 'white-space:pre' }, termG);
  // лента кадров шарика: ball(t) из кода выше, кадр 1080×1920 в масштабе ячейки
  const BS = { y: 1450, w: 140, gap: 17, n: 5 }, bk = BS.w / W, bhh = H * bk;
  const balls = [...Array(BS.n)].map((_, i) => {
    const x = 540 - (BS.n * BS.w + (BS.n - 1) * BS.gap) / 2 + i * (BS.w + BS.gap), cg = S('g', {}, world);
    S('rect', { x, y: BS.y, width: BS.w, height: bhh, rx: 14, fill: P.bg, stroke: P.line, 'stroke-width': 2 }, cg);
    S('circle', { cx: x + BS.w / 2, cy: BS.y + (300 + ball(i * 0.07)) * bk, r: 130 * bk, fill: P.c[0] }, cg);
    return { g: cg, cx: x + BS.w / 2, cy: BS.y + bhh / 2 };
  });
  // заголовок «СЛОВА → КОД → КАДРЫ» над камерой, с затемнением сверху
  const topBand = S('rect', { x: 0, y: 0, width: W, height: 470, fill: linGrad(defs, [[0, P.bg, 1], [0.72, P.bg, 0.92], [1, P.bg, 0]], { x1: 0, y1: 0, x2: 0, y2: 1 }) }, over);
  const s6 = fitSize('СЛОВА КОД КАДРЫ', 690 - 2 * 110, 50), hw = ['СЛОВА', 'КОД', 'КАДРЫ'].map(w => textWidth(w, s6, FONT.head, 900));
  let hx = 540 - (hw[0] + hw[1] + hw[2] + 2 * 110) / 2;
  const hd = ['СЛОВА', 'КОД', 'КАДРЫ'].map((w, i) => { const h = headline(over, w, { x: hx, y: 350, size: s6, fill: P.c[[2, 1, 0][i]], anchor: 'start' }); hx += hw[i] + 110; return h; });
  const harr = [0, 1].map(i => { const x = 540 - (hw[0] + hw[1] + hw[2] + 2 * 110) / 2 + hw[0] + (i ? hw[1] + 110 : 0); return arrow(over, x + 26, 350 - s6 * 0.36, x + 84, 350 - s6 * 0.36, { stroke: P.mute, 'stroke-width': 6 }, { head: 14 }); });
  // сцена 7–8: подсветка цифры, смена 7 -> 3
  const e7 = seedSc.els.find(e => e.t === String(SEED));
  const cw7 = 0.6 * PL.size, bxx = e7.ax - 12, byy = e7.ay - 0.8 * PL.size - 8, bww = cw7 + 24, bhh7 = PL.size + 16;
  const boxG = S('g', {}, plateG);
  S('rect', { x: bxx, y: byy, width: bww, height: bhh7, rx: 10, fill: P.hot }, boxG);
  const digG = S('g', {}, boxG), digClip = clipRect(defs, digG);
  digClip.set(bxx, byy, bww, bhh7);
  const dOld = S('text', { x: e7.ax, y: e7.ay, 'font-family': FONT.mono, 'font-weight': 700, 'font-size': PL.size, fill: P.bg }, digG); dOld.textContent = String(SEED);
  const dNew = S('text', { x: e7.ax, y: e7.ay, 'font-family': FONT.mono, 'font-weight': 700, 'font-size': PL.size, fill: P.bg }, digG); dNew.textContent = String(NEW);
  const ring = S('circle', { cx: bxx + bww / 2, cy: byy + bhh7 / 2, r: 30, fill: 'none', stroke: P.hot, 'stroke-width': 5 }, plateG);
  const loopG = S('g', { transform: `translate(${bxx + bww / 2} ${byy + bhh7 / 2})` }, plateG);
  const mark = drawStroke(loopG, handLoop(52, 1.1, 4), { stroke: P.hot, 'stroke-width': 5 });   // обвод маркером
  // превью: герой этого ролика, до и после смены цифры (после — тот же код с look(NEW))
  const PV = { y: 648, w: 191, gap: 21 }, pk = PV.w / W;
  const pv = [0, 1, 2, 3].map(i => {
    const g0 = S('g', {}, over), before = cell(g0, LOOK), aw = S('g', {}, g0), clip = clipRect(defs, aw), aft = cell(aw, look(NEW));
    const scan = S('rect', { x: 0, y: 0, width: W, height: 26, fill: P.hot }, g0);
    return { g0, before, aft, clip, scan, x: 540 - (4 * PV.w + 3 * PV.gap) / 2 + i * (PV.w + PV.gap) };
  });
  const s8 = fitSize('1 ЦИФРА НОВЫЙ РОЛИК', 690 - 100, 50), w8a = textWidth('1 ЦИФРА', s8, FONT.head, 900), w8 = w8a + 100 + textWidth('НОВЫЙ РОЛИК', s8, FONT.head, 900);
  const h8a = headline(over, '1 ЦИФРА', { x: 540 - w8 / 2, y: 598, size: s8, fill: P.hot, anchor: 'start' });
  const h8b = headline(over, 'НОВЫЙ РОЛИК', { x: 540 - w8 / 2 + w8a + 100, y: 598, size: s8, fill: P.ink, anchor: 'start' });
  const ar8 = arrow(over, 540 - w8 / 2 + w8a + 24, 598 - s8 * 0.36, 540 - w8 / 2 + w8a + 76, 598 - s8 * 0.36, { stroke: P.mute, 'stroke-width': 6 }, { head: 14 });
  // камера: фокус (fx, fy) встаёт в точку экрана (540, sy) с масштабом s
  const fy = track(520, [[T.code, 948, SP.cam], [T.render, 1450, SP.cam], [T.s7, 1075, SP.cam], [T.s8, PL.y + H2 / 2, SP.cam]]);
  const sy = track(640, [[T.code, 640, SP.cam], [T.render, 700, SP.cam], [T.s7, 674, SP.cam], [T.s8, 300 + H2 / 2, SP.cam]]);
  const ls_ = track(0, [[T.s7, Math.log(0.6), SP.cam], [T.s8, 0, SP.cam]]);
  const pr = (t, t0, sp = SP.pop) => (t < t0 ? 0 : step(t - t0, sp));

  return t => {
    const s = Math.exp(ls_(t)), out9 = prog(t, T.s9 - 0.05, 0.28, ease.in4);
    A(world, 'transform', `translate(540 ${f2(sy(t))}) scale(${f2(s)}) translate(-540 ${f2(-fy(t))})`);
    show(world, 1 - out9);
    const dim7 = after(t, T.s7, SP.dim), gone8 = prog(t, T.s8 - 0.1, 0.2, ease.out), side = lerp(1, 0.45, dim7) * (1 - gone8);
    const leave = t0 => 1 - prog(t, t0, 0.16, ease.out);                 // камера ушла к следующему звену — это гаснет
    const back7 = after(t, T.s7 + 0.45, SP.dim);                          // возвращаются, когда камера уже отъехала
    const oBub = Math.max(leave(T.code - 0.06), 0.45 * back7) * (1 - gone8), oPlate = Math.max(leave(T.render - 0.06), back7);
    // облачко
    const bi = pr(t, T.s6 + 0.04);
    popAt(bubG, bx + 60, by + bh, lerp(0.6, 1, bi), popO(t, T.s6 + 0.04) * oBub);
    wEls.forEach((e, i) => rise(e, t < T.s6 + 0.18 + i * 0.13 ? 0 : step(t - T.s6 - 0.18 - i * 0.13, SP.out), 14));
    ar1.draw(prog(t, T.code - 0.12, 0.32, ease.out)); show(ar1, oBub);
    // плашка
    const pi = pr(t, T.code + 0.2);
    popAt(plateG, 540, PL.y, lerp(0.85, 1, pi), popO(t, T.code + 0.2) * oPlate);
    A(plateBg, 'height', f2(lerp(H5, H2, after(t, T.s8, SP.tuck))));
    seedSc.seek(t); ballSc.seek(t);
    show(seedG, lerp(0.45, 1, dim7));
    show(ballG, lerp(1, 0.4, dim7) * (1 - gone8));
    ar2.draw(prog(t, T.render - 0.12, 0.32, ease.out)); show(ar2, Math.max(leave(T.render - 0.06), 0.45 * back7) * (1 - gone8));
    // терминал и кадры шарика
    const ti = pr(t, T.render + 0.2);
    popAt(termG, 540, TR.y, lerp(0.85, 1, ti), popO(t, T.render + 0.2) * side);
    setText(cmd, typed('node render.mjs video', prog(t, T.render + 0.05, 0.4, x => x)));
    const p = prog(t, T.prog0, T.prog1 - T.prog0, ease.inOut);
    A(bar, 'width', f2(340 * p));
    setText(fcount, `кадр ${String(Math.round(p * NF)).padStart(4, ' ')} / ${NF}`); show(fcount, t < T.prog0 || t > T.s7 ? 0 : 1);
    balls.forEach((b, i) => { const t0 = T.prog0 + (i + 0.6) / BS.n * (T.prog1 - T.prog0); popAt(b.g, b.cx, b.cy, lerp(0.6, 1, pr(t, t0)), popO(t, t0) * side); });
    // заголовок цепочки
    const hOut = T.s7 - 0.02;
    hd[0].set(t, T.s6 + 0.04, hOut); hd[1].set(t, T.code, hOut); hd[2].set(t, T.render, hOut);
    harr[0].draw(prog(t, T.code - 0.1, 0.25, ease.out)); harr[1].draw(prog(t, T.render - 0.1, 0.25, ease.out));
    const hv = 1 - prog(t, hOut, 0.25, ease.in4);
    show(harr[0], hv); show(harr[1], hv); show(topBand, hv * (t < T.s6 ? 0 : 1));
    // 7: одно число — жёлтая плашка поверх токена; 8: цифра уезжает вверх, новая — снизу
    show(e7.el, t < T.hl ? e7.so : 0);
    const bp = pr(t, T.hl);
    popAt(boxG, bxx + bww / 2, byy + bhh7 / 2, lerp(0.4, 1, bp), popO(t, T.hl));
    const rp = step(t - T.digit, SP.snap) * (t >= T.digit ? 1 : 0);
    A(dOld, 'y', f2(e7.ay - rp * bhh7)); A(dNew, 'y', f2(e7.ay + (1 - rp) * bhh7));
    mark.draw(prog(t, T.hl + 0.12, 0.45, ease.inOut)); A(loopG, 'opacity', f2(1 - out9));
    const rw = clamp((t - T.digit) / 0.5);
    A(ring, 'r', f2(30 + 90 * ease.out(rw))); show(ring, t < T.digit ? 0 : 0.8 * (1 - rw));
    // превью: появляются в старой палитре, на «пересобирается» пересчитываются сканом сверху вниз
    pv.forEach((v, i) => {
      const t0 = T.s8 + 0.18 + i * 0.07, a = pr(t, t0);
      if (t < t0 || t > T.s9 + 0.3) { show(v.g0, 0); return; }
      A(v.g0, 'transform', `translate(${f2(v.x + PV.w / 2)} ${f2(PV.y + H * pk / 2)}) scale(${f2(pk * lerp(0.75, 1, a))}) translate(${-W / 2} ${-H / 2})`);
      show(v.g0, popO(t, t0) * (1 - out9));
      const w = prog(t, T.rebuild + i * 0.08, 0.36, ease.inOut);
      if (w < 1) v.before.h.frame(0.6 + i * 0.5 + (t - T.s8)); show(v.before.g, w < 1 ? 1 : 0);
      v.clip.set(0, 0, W, H * w); show(v.aft.g, w > 0 ? 1 : 0);
      if (w > 0) v.aft.h.frame(t - T.rebuild - i * 0.08);
      A(v.scan, 'y', f2(H * w - 13)); show(v.scan, w > 0 && w < 1 ? 1 : 0);
    });
    h8a.set(t, T.digit + 0.25, T.s9 - 0.05); h8b.set(t, T.rebuild + 0.08, T.s9 - 0.05);       // «1 ЦИФРА» — после смены цифры, «НОВЫЙ РОЛИК» — со сканом
    ar8.draw(prog(t, T.rebuild - 0.05, 0.22, ease.out)); show(ar8, 1 - out9);
  };
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const on1 = t < T.s5 + 0.35, on5 = t >= T.s5 - 0.02 && t < T.s6 + 0.35, on2 = t >= T.s6 - 0.02 && t < T.s9 + 0.35;
  const on9 = t >= T.s9 - 0.02 && t < T.s10 + 0.35, on10 = t >= T.s10 - 0.02;
  L1.on(on1); if (on1) f1(t);
  L5.on(on5); if (on5) f5(t);
  L2.on(on2); if (on2) f2_(t);
  L9.on(on9); if (on9) f9(t);
  L10.on(on10); if (on10) f10(t);
  if (COVER) show(capsLayer, 0); else caps.frame(t);
}

// ------------------------------------------------------------------ звук: немного, тихо, записанное
// (сцены 5, 9, 10 ставят свои звуки в модулях)
sfx(0.1, 'whoosh', -6);
sfx(T.freeze, 'freeze', -2);
{ let last = -1; for (let j = 1; j <= 7; j++) { const tj = T.run + T.runD * easeAt(j / 7); if (tj - last >= 0.1) { sfx(tj, 'tick', -9); last = tj; } } }   // кадры проскакивают; не чаще раза в 0,1 с
sfx(T.strike, 'scribble', -4);
sfx(T.ft + 0.05, 'pop', -8);
sfx(T.type0, 'type', -8);
sfx(T.hl, 'tick', -2);
sfx(T.digit, 'click', -3);
sfx(T.rebuild, 'swish', -6);

// ------------------------------------------------------------------ boot
window.DURATION = DURATION;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, DURATION));
window.READY = (async () => {
  await loadFonts();
  const ctx = { P, T, LOOK, defs, FONT, NF };
  f1 = buildAct1(L1);
  f2_ = buildAct2(L2);
  f5 = SCENES.timeline(L5, ctx);
  f9 = SCENES.logo(L9, ctx);
  f10 = SCENES.outro(L10, ctx);
  // субтитры: куски по 1–4 слова (индексы слов script.json), ключевые слова — жёлтым ('r')
  const HAND = [[[0, 1]], [[2, 3, 4], [5, 6, 7]], [[8, 9]], [[10, 11], [12, 13, 14]], [[15, 16], [17, 18]],
    [[19, 20], [21, 22, '23s']], [[24, 25, '26r']], [[27, 28], [29]], [[30, 31, '32r']], [[33, 34, 35], [36, 37, 38]],
    [[39, 40, 41]], [[42, 43, 44]], [[45, 46, '47r']], [[48, 49], [50, 51, 52]], [[53, 54, '55r']], [[56, 57, 58], ['59r', 60]],
    [[61, 62, 63, 64]], [[65, 66]], [[67, 68]], [[69, 70], [71, 72, 73]], [[74, 75], [76, 77, 78, 79]], [[80, 81], ['82r']]];
  const WD = window.WORDS.words;
  const spec = WD.length === 83 ? HAND.map(ch => ({ lines: ch.map(l => l.map(x => { const i = parseInt(x), st = String(x).replace(/\d+/, ''); return [WD[i].w, i, st]; })) }))
    : autoCaptions({ maxWords: 3, maxChars: 16 });
  caps = makeCaptions(capsLayer, spec, { x: 120, y: 1140, size: 56, lh: 66, maxW: 660, font: 'Onest, sans-serif', weight: 800,
    ink: P.ink, grey: P.mute, red: P.hot, dim: 0.42, end: T.end - 0.1, gap: 8 });
  capsLayer.querySelectorAll('text').forEach(e => { e.setAttribute('stroke', P.bg); e.setAttribute('stroke-width', 12); e.setAttribute('stroke-linejoin', 'round'); e.setAttribute('paint-order', 'stroke'); });
  frame(0);
  return true;
})();
