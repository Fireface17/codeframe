// film.js — ролик №5 «Сайты гаснут сами» (PHP2Shell). Один лист на столе, камера сверху; сцены — места на листе.
// Карта (сценарий §6): плита PHP (крафт) с рядами окон A (герой, блог, магазин, госпортал) и Б (форум, новости, школа),
// шов между рядами — поле плиток-кода; торец из 10 пластов; ниже — серая плита (видео, карта, почта); знак { | } слева.
// Структура: cues T (от слов) → раскладка LY → камера → построение → frame(t).

const Q_ = new URLSearchParams(location.search);
const MAP = Q_.get('map') === '1';
const COVER = Q_.get('cover') === '1';
window.SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 };

// ------------------------------------------------------------------ cues: от слов (сценарий v5, 9 фраз; индекс слова — надёжнее повторов)
const WS = i => window.WORDS.words[i].start, WE = i => window.WORDS.words[i].end;
const T = {};
// 1. «Сайты один за другим выключили сами хозяева. Даже госпортал Нидерландов.»
T.click2 = WS(1) - 0.08; T.off2 = WS(1) + 0.02; T.plate2 = T.off2 + 0.16;
T.pull = T.plate2 + 0.2;                              // табличка садится, пока план крупный, — потом отъезд
T.strip = Math.min(1.45, T.pull + 0.35); T.off3 = WS(3) + 0.02; T.plate3 = T.off3 + 0.24; T.off6 = WS(4) + 0.08; T.plate6 = T.off6 + 0.24;
T.toGov = WS(7) - 0.18; T.off4 = WS(8) + 0.06; T.note4 = WS(9) - 0.02;
// 2. «Под ними общий фундамент — язык PHP. На нём большинство сайтов.»
T.look = WS(10); T.edge = WS(13) - 0.15; T.php = WS(15) - 0.05; T.chip70 = T.php + 0.18; T.most = WS(16) - 0.05; T.chipOut = WS(18);
// 3–5. лист памяти
T.mem = WS(20) - 0.3; T.part = T.mem + 0.3; T.formA = WS(21) - 0.05; T.lines = WS(23) - 0.05; T.linesEnd = WE(28);
T.halt = WS(32); T.tear = WS(34) - 0.06; T.scraps = WS(37) - 0.05;
T.formB = WS(39) - 0.06; T.catch = WS(42); T.note = WS(44) - 0.1; T.slide = WS(46); T.chip92 = WS(47) - 0.2; T.chip92Out = WS(50) - 0.15; T.pass = WS(50) - 0.05;
// 6. «Похожую дыру находили в 2004-м. А новые в августе почти разом нашли три команды — и у всех ИИ.»
T.y2004 = WS(52) - 0.1; T.cr = WS(53); T.write2004 = WS(55) - 0.15;
T.aug = WS(57) - 0.05; T.augT = WS(60) - 0.05; T.st = [WS(63), WS(64) + 0.1, WS(65) + 0.15]; T.teamsZ = WS(66) - 0.25; T.namesOut = WS(68) - 0.15; T.ai1 = WS(69);
// 7. «Человек вспомнил старую находку, а ИИ разобрал код аварийного выхода и нашёл: память убирается не в том порядке.»
T.calif = WS(70) - 0.12; T.circle = WS(71) - 0.05; T.tap = WS(73) + 0.05; T.jump = WS(75) - 0.05; T.read = WS(76); T.found = WS(81); T.bug = WS(83) - 0.05;
// 8. «Патч вышел 21 октября. Но ИИ помогает и взломщику быстро превратить патч в атаку.»
T.upd = Math.max(WS(88) - 0.1, T.bug + 1.05); T.stamp21 = WS(90) - 0.05;
T.patPan = T.stamp21 + 0.1;                            // камера: первая заплатка со штампом «21.10» → проезд влево к двум другим
T.pat = [WS(89), T.stamp21 + 0.32, T.stamp21 + 0.5];
T.crash = WS(93) - 0.02; T.race = T.crash - 0.5; T.prePan = Math.max(T.pat[2] + 0.1, T.race - 0.4);   // проезд кончается до въезда пары «?»
T.any = WS(97); T.hit = WS(101) - 0.04;
// 9. «А пока не обновились, хозяева гасят свет сами.»
T.loop = WS(102) - 0.05; T.off5 = T.loop + 0.62; T.off7 = T.off5 + 0.3; T.push = Math.max(WS(105), T.off7 + 0.3); T.owner = WS(106);   // общий план стоит, окна гаснут при стоящей камере
T.end = window.WORDS.duration;
const DUR = Math.round(T.end * FPS) / FPS;
T.capEnd = Math.min(DUR - 0.26, WE(109) + 0.12);

// ------------------------------------------------------------------ раскладка листа (мировые px)
const LY = {
  sheet: { x0: -1500, y0: -1400, x1: 3300, y1: 3900 },
  php: { x0: 0, y0: 0, x1: 2000, y1: 1060, depth: 240, skew: 0.2, layers: 10 },
  gray: { x0: 240, y0: 1600, x1: 1760, y1: 2000, depth: 46 },
  rowA: 210, rowB: 850,
  sign: { x: -110, y: 120, w: 180, h: 140 },
  strip: { x: 698, y: -332, w: 860, h: 214 },
  mem: { x0: 868, x1: 1112, y0: 372, y1: 690, cx: 990 },          // «лист памяти»: чистый участок шва между окнами 2/3 и 5/6
};
// окна: [вид, центр x, центр y]
const WINS = [
  ['blog', 270, LY.rowA], ['blog', 740, LY.rowA], ['shop', 1210, LY.rowA], ['gov', 1680, LY.rowA],
  ['school', 505, LY.rowB], ['news', 975, LY.rowB], ['forum', 1445, LY.rowB],
  ['video', 500, 1800], ['map', 1000, 1800], ['mail', 1500, 1800],
];
// ряды поля плиток-кода: верх ряда y = 18 + 54k, высота 40
const ROW = k => 18 + 54 * k, ROWH = 40;
// трещины: опорные точки справа налево; «нырки» под край рамы (ряд А — вверх под низ рамы, ряд Б — вниз под верх)
const dipA = xd => [[xd + 44, 393], [xd + 16, 368], [xd, 346], [xd - 16, 366], [xd - 44, 395]];
const dipB = xd => [[xd + 44, 664], [xd + 16, 690], [xd, 714], [xd - 16, 692], [xd - 44, 666]];
const CR1 = [[1925, 398], [1880, 392], [1830, 405], ...dipA(1720), [1610, 398], [1540, 409], [1462, 396], [1400, 404], ...dipA(1262), [1150, 399], [1062, 409], [985, 393], [905, 401], ...dipA(770), [690, 397], [610, 387], [528, 383], [490, 370], [466, 352], [452, 336]];
const CR2 = [[1858, 648], [1800, 657], [1745, 645], [1660, 661], [1580, 652], ...dipB(1470), [1340, 650], [1250, 663], [1180, 652], [1100, 660], ...dipB(975), [870, 650], [790, 662], [720, 652], [668, 666], [632, 690], [614, 712]];
// джиттер ломаной: подразбиение на шаги ~16 px со смещением поперёк (детерминированно)
function jag(pts, seed, amp = 5, stepL = 16) {
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / stepL));
    const nx = -(by - ay) / (L || 1), ny = (bx - ax) / (L || 1);
    for (let k = 1; k <= n; k++) {
      const u = k / n, j = k === n ? 0 : (hash01(i * 37 + k, seed) - 0.5) * 2 * amp;
      out.push([lerp(ax, bx, u) + nx * j, lerp(ay, by, u) + ny * j]);
    }
  }
  return out;
}
const CR1J = jag(CR1, 11), CR2J = jag(CR2, 23);
// заплатки (на местах, где трещина ныряет под раму): окно 3 (первая, с крупным «21.10»), 6, 2; четвёртая — в воздухе
const PATCH = [
  { win: 2, x: 1262, y: 378, w: 300, h: 96, rot: -3, text: '', size: 15, t: () => T.pat[0] },
  { win: 5, x: 975, y: 700, w: 170, h: 54, rot: 4, text: '21.10', size: 15, t: () => T.pat[1] },
  { win: 1, x: 770, y: 372, w: 170, h: 54, rot: -2, text: '21.10', size: 15, t: () => T.pat[2] },
];
// пары команд: стоп (кончик курсора)
const TEAMS = [
  { name: 'Calif', x: 1640, y: 446, rot: -32 },
  { name: 'OpenAI', x: 1196, y: 468, rot: -28 },
  { name: 'Wiz', x: 1892, y: 560, rot: -38 },
];
// «как нашли»: круг карандаша и ряд номеров «4 · 5 · 7 · 6 · 8» (ряд 9 — y 504–544), справа от листа памяти
const FIND = { cx: 1574, cy: 500, rx: 158, ry: 80, row: 9, nums: ['4', '5', '7', '6', '8'], x0: 1440, tw: 46, gap: 10, th: 46 };

const scr = (c, wx, wy) => ({ x: (wx - c.x) * c.z + W / 2, y: (wy - c.y) * c.z + H / 2 });
const wld = (c, sx, sy) => ({ x: c.x + (sx - W / 2) / c.z, y: c.y + (sy - H / 2) / c.z });

// ------------------------------------------------------------------ камера: кадры-функции времени + переходы (r — поворот кадра, °)
const sine = ease.sine;
const SEAM = { a: { x: 740, y: 292 }, b: { x: 270, y: 292 }, z: 2.1, k: 0.03 };   // шов: окно 2 в кадре 0 = герой в конце
const seamZ = t => SEAM.z * (1 + SEAM.k * t);                                        // t от кадра 0 (в конце t − DUR < 0)
const drift = (t, t0, d, a) => a * sine(prog(t, t0, d, x => x));                    // медленный наезд/дрейф на выдержке
const SHOT = {
  hook0: t => ({ x: SEAM.a.x, y: SEAM.a.y, z: seamZ(t), r: 0 }),
  // отъезд хука влево-вниз: герой со знаком, окна 2, 3, 6; полоска «ВЫКЛЮЧИЛИ / САМИ» сверху
  // отъезд хука — чистый зум вокруг окна 2 (без бокового броска), потом медленный дрейф вправо к госпорталу
  hook1: t => ({ x: 740 + 30 * Math.max(0, t - T.pull - 0.6), y: 330, z: 0.86 * (1 + drift(t, T.pull + 0.6, 1.6, 0.025)), r: 0 }),
  gov: t => ({ x: 1680, y: 330, z: 2.0 * (1 + drift(t, T.toGov + 0.4, T.look - T.toGov - 0.4, 0.04)), r: 1.5 }),
  edge: t => ({ x: 965, y: 1080, z: 1.05 * (1 + drift(t, T.edge + 0.6, T.most - T.edge - 0.6, 0.04)), r: -2 }),
  reveal: t => ({ x: 900, y: 1020, z: 0.5 * (1 + drift(t, T.most + 0.8, T.mem - T.most - 0.8, 0.03)), r: 0 }),
  // лист памяти: камера ныряет в чистый участок шва, лёгкий поворот листа +3°, внимание сверху вниз
  mem: t => {
    // x стоит (медленный дрейф), по y — вниз по строкам; за клочками вниз; новый бланк внизу; записка справа; чип вверху слева; поле внизу
    const avail = Math.max(0.8, T.halt - 0.22 - T.lines), stepL = avail / HALT_LINE;
    const q = clamp((t - T.lines) / stepL, 0, HALT_LINE + 0.5), k = Math.min(HALT_LINE, Math.floor(q)), f = q - k;
    const lyS = k < HALT_LINE && f > 0.86 ? lerp(LINES[k][0], LINES[k + 1][0], ease.inOut((f - 0.86) / 0.14)) : LINES[k][0];
    const wOn = clamp((t - T.lines + 0.3) / 0.3);
    let x = 990 + 1.5 * (t - T.mem), y = lerp(512, 512 + lyS * 0.5, wOn);
    y = lerp(y, 590, ease.inOut(prog(t, T.tear + 0.3, 0.42)));                                // камера опускается за клочками
    x += 24 * ease.inOut(prog(t, T.note - 0.1, 0.45)) * (1 - ease.inOut(prog(t, T.slide + 0.2, 0.5)));   // за запиской вправо
    y = lerp(y, 566, ease.inOut(prog(t, T.chip92 - 0.1, 0.4)));                             // чуть вверх к чипу
    y = lerp(y, 618, ease.inOut(prog(t, T.pass - 0.12, 0.4)));                              // вниз на поле «пароль»
    const z = 3.4 * (1 + drift(t, T.mem + 1, T.y2004 - T.mem - 1, 0.04)) * (1 + 0.04 * ease.inOut(prog(t, T.halt - 0.1, 0.3)) * (1 - ease.inOut(prog(t, T.tear + 0.3, 0.5)))) * (1 + 0.05 * ease.inOut(prog(t, T.pass - 0.1, 0.5)));
    return { x, y, z, r: 3 - 2.5 * prog(t, T.formA, T.halt - T.formA, x => x) + 1.5 * ease.inOut(prog(t, T.formB, 1.2)) - 2 * ease.inOut(prog(t, T.note, 1.5)) };
  },
  y2004: t => ({ x: 868, y: 452, z: 2.6 * (1 + drift(t, T.y2004 + 0.4, T.aug - T.y2004, 0.03)), r: -2 }),
  teams: t => ({ x: 1500, y: 773, z: 0.75 * (1 + drift(t, T.aug + 0.8, T.teamsZ - T.aug - 0.8, 0.03)), r: 0 }),
  teamsZ: t => ({ x: 1500, y: 600, z: 0.95 * (1 + drift(t, T.teamsZ + 0.5, T.calif - T.teamsZ - 0.5, 0.02)), r: 0 }),
  calif: t => {
    // круг → проезд за курсором по рядам → наезд на «7 · 6»; везде медленный дрейф
    const rd = ease.inOut(prog(t, T.read, T.found - T.read)), pk = ease.inOut(prog(t, T.found + 0.1, 0.6));
    const x = 1556 + 54 * rd - 8 * pk, y = 600 - 18 * rd - 30 * pk;
    return { x, y, z: 2.35 * (1 + 0.03 * rd) * (1 + 0.04 * pk) * (1 + drift(t, T.found + 0.7, T.upd - T.found - 0.7, 0.02)), r: 1.5 - 2.5 * rd + 1 * pk };
  },
  // все три заплатки в одном кадре: садятся, когда камера пришла
  patch: t => ({ x: lerp(1150, 900, ease.inOut(prog(t, T.patPan, 0.32))) - 20 * prog(t, T.patPan + 0.32, T.race - T.patPan, x => x), y: 500, z: 1.5 * (1 + drift(t, T.upd + 0.6, T.race - T.upd - 0.6, 0.04)), r: 0 }),
  pre: t => ({ x: 330, y: 470, z: 1.25, r: 0 }),
  strike: t => {
    // крэш-зум 6 к ease-in (в переходе) + перелёт 3 %; удар — пружина масштаба (единственная на ролик)
    const o = t > T.crash ? 0.03 * Math.exp(-(t - T.crash - 0.2) / 0.09) * Math.sin(clamp((t - T.crash - 0.2) / 0.16) * Math.PI) : 0;
    const kick = t > T.hit ? 0.035 * Math.exp(-(t - T.hit) / 0.11) * Math.cos((t - T.hit) * 28) : 0;
    return { x: 460, y: 520, z: 2.88 * (1 + (t > T.crash + 0.2 ? o : 0)) * (1 + kick) * (1 + drift(t, T.hit + 0.15, T.loop - T.hit, 0.02)), r: 0 };
  },
  over: t => ({ x: 480 + 30 * prog(t, T.loop + 0.5, T.push - T.loop - 0.5, x => x), y: 1320, z: 0.5 * (1 + drift(t, T.loop + 0.5, T.push - T.loop - 0.5, 0.02)), r: 0 }),
  seam: t => ({ x: SEAM.b.x, y: SEAM.b.y, z: seamZ(t - DUR), r: 0 }),
};
const CAMS = [
  [0, 0, SHOT.hook0],
  [T.pull, 0.6, SHOT.hook1, ease.inOut],
  [T.toGov, 0.4, SHOT.gov, ease.inOut],           // проезд ≤ 0,4 с
  [T.edge, 0.55, SHOT.edge, ease.inOut],
  [T.most, 0.9, SHOT.reveal, ease.inOut],
  [T.mem, 0.9, SHOT.mem, ease.inOut],
  [T.y2004 - 0.05, 0.4, SHOT.y2004, ease.inOut],  // проезд к «2004»
  [T.aug, 0.8, SHOT.teams, ease.inOut],
  [T.teamsZ, 0.55, SHOT.teamsZ, ease.inOut],
  [T.calif, 0.7, SHOT.calif, ease.inOut],
  [T.upd, 0.75, SHOT.patch, ease.inOut],
  [T.prePan, 0.38, SHOT.pre, ease.inOut],
  [T.crash, 0.2, SHOT.strike, ease.in4],
  [T.loop, 0.5, SHOT.over, ease.inOut],
  [T.push, 1.1, SHOT.seam, ease.inOut],
];
function camAt(t) {
  let c = CAMS[0][2](t);
  for (let k = 1; k < CAMS.length; k++) {
    const [t0, d, fn, e = ease.inOut] = CAMS[k];
    if (t <= t0) break;
    const m = e(clamp((t - t0) / d)), n = fn(t);
    c = { x: lerp(c.x, n.x, m), y: lerp(c.y, n.y, m), z: Math.exp(lerp(Math.log(c.z), Math.log(n.z), m)), r: lerp(c.r || 0, n.r || 0, m) };
  }
  const sk = shake(t, T.hit, 10, 0.34, 5, 24);                // единственный удар всем кадром
  return { x: c.x + sk.x / c.z, y: c.y + sk.y / c.z, z: c.z, r: c.r || 0 };
}
const camXf = (c, k = 1) => `translate(${f2(W / 2)} ${f2(H / 2)})${c.r ? ` rotate(${f2(c.r)})` : ''} scale(${f2(c.z * k)}) translate(${f2(-c.x)} ${f2(-c.y)})`;

// ------------------------------------------------------------------ состояние окон по времени
const flipAt = (t, t0, d = 0.2) => ease.inOut(prog(t, t0, d));
const OFF = { 1: [T.off2, T.pat[2] + 0.2], 2: [T.off3, T.pat[0] + 0.2], 5: [T.off6, T.pat[1] + 0.2], 3: [T.off4, Infinity], 4: [T.off5, Infinity], 6: [T.off7, Infinity] };
const winFlip = (i, t) => { const o = OFF[i]; if (!o) return 0; return flipAt(t, o[0]) * (1 - flipAt(t, o[1])); };
const winKey = (i, t) => { const o = OFF[i]; if (!o) return 0; const k0 = i === 1 ? T.click2 : o[0] - 0.08; return t >= k0 && t < o[1] - 0.06 ? 1 : 0; };

// ------------------------------------------------------------------ build
let root = null, wg = null, fg = null, L = null, caps = null, mapG = null;
const R = {};                                                 // всё построенное
async function build() {
  root = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  document.getElementById('root').appendChild(root);
  const defs = S('defs', {}, root);
  // период листа и зерна делит 470 — шаг ряда окон (герой → окно 2): кадр шва и кадр 0 совпадают до волокна
  const paper = bakePaper(470, PAL.sheet, 1, 1), grain = bakeGrain(235, 5), desk = bakeDesk(1024, 1024, 7);
  patternFrom(defs, 'pPaper', await toURL(paper, 'image/jpeg', 0.92), 470, 470);
  patternFrom(defs, 'pGrain', await toURL(grain), 235, 235);
  patternFrom(defs, 'pDesk', await toURL(desk, 'image/jpeg', 0.92), 1024, 1024);
  const gl = S('linearGradient', { id: 'gLit', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  [[0, '#FFFFFF', 0.13], [0.45, '#FFFFFF', 0], [1, '#2A1E10', 0.07]].forEach(([o, c, a]) => S('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, gl));
  S('rect', { width: W, height: H, fill: PAL.desk }, root);
  wg = S('g', {}, root);
  const sh = LY.sheet;
  S('rect', { x: -6000, y: -6000, width: 14000, height: 14000, fill: 'url(#pDesk)' }, wg);
  S('rect', { x: sh.x0 + 6, y: sh.y0 + 9, width: sh.x1 - sh.x0, height: sh.y1 - sh.y0, fill: PAL.shadow, opacity: 0.08 }, wg);
  S('rect', { x: sh.x0, y: sh.y0, width: sh.x1 - sh.x0, height: sh.y1 - sh.y0, fill: 'url(#pPaper)' }, wg);
  L = {
    defs,
    sheetInk: S('g', {}, wg), slabSh: S('g', {}, wg), slab: S('g', {}, wg), field: S('g', {}, wg), crack: S('g', {}, wg), memSh: S('g', {}, wg), mem: S('g', {}, wg), slabInk: S('g', {}, wg),
    winSh: S('g', {}, wg), win: S('g', {}, wg), overSh: S('g', {}, wg), over: S('g', {}, wg),
    slipSh: S('g', {}, wg), slip: S('g', {}, wg), actSh: S('g', {}, wg), act: S('g', {}, wg),
  };
  mapG = S('g', {}, wg);
  fg = S('g', {}, root);
  const capL = S('g', {}, root);

  buildSlabs();
  buildField();
  R.cr1 = makeCrack(L.crack, defs, [{ pts: CR1J, clip: 'x', wmin: 4.5, wmax: 10 }], { seed: 3 });
  R.cr2 = makeCrack(L.crack, defs, [{ pts: CR2J, clip: 'x', wmin: 3.5, wmax: 8 }], { seed: 9 });
  R.win = WINS.map(([k, x, y]) => makeWindow(L, k, x, y));
  buildSign();
  buildScatter();
  buildNotes();
  buildActors();
  await buildFore();
  if (!MAP && !COVER) buildSfx();

  // субтитры: Onest по словам, 60 px, на бумажной плашке; x 120–780, y 1110–1240
  const ch = (...ix) => ix.map(i => [window.WORDS.words[i].w, i]);
  const spec = [
    [0, 1, 2, 3], [4, 5], [6], [7, 8], [9],
    [10, 11], [12, 13], [14, 15], [16, 17, 18], [19],
    [20, 21, 22], [23, 24, 25], [26, 27, 28],
    [29, 30, 31], [32, 33], [34, 35], [36, 37, 38],
    [39, 40], [41, 42], [43, 44, 45], [46, 47], [48, 49], [50, 51],
    [52, 53], [54, 55, 56], [57, 58, 59, 60], [61, 62, 63], [64, 65], [66, 67, 68, 69],
    [70, 71], [72, 73], [74, 75, 76], [77, 78], [79, 80, 81], [82, 83], [84, 85, 86, 87],
    [88, 89], [90, 91], [92, 93, 94], [95, 96], [97, 98], [99, 100, 101],
    [102, 103, 104], [105], [106], [107, 108, 109],
  ].map(ix => ({ lines: [ch(...ix)] }));
  const DASH_AFTER = new Set([13, 33, 35, 49, 65]);
  spec.forEach(c => c.lines[0].forEach(tk => { if (DASH_AFTER.has(tk[1])) tk[0] += ' —'; }));
  caps = makeCaptions(capL, spec, { x: 120, y: 1206, size: 60, lh: 70, maxW: 640, font: 'Onest, sans-serif', weight: 700, ink: PAL.ink, end: T.capEnd, plate: true });
  if (MAP) buildMap();
  if (COVER) buildCover(capL);
}

// ------------------------------------------------------------------ плиты: крафт PHP с торцом из 10 пластов, серая монолитная
function buildSlabs() {
  const P = LY.php, D = P.depth, sk = P.skew;
  const g = L.slab;
  // тень плиты на листе
  S('path', { d: `M${P.x0 + 30} ${P.y1 + D}H${P.x1 + D * sk + 26}V${P.y0 + 40}H${P.x1 + D * sk}V${P.y1 + D}Z`, fill: PAL.shadow, opacity: 0.07 }, L.slabSh);
  S('path', { d: rr(P.x0 + 14, P.y0 + 22, P.x1 - P.x0 + D * sk, P.y1 - P.y0 + D, 10), fill: PAL.shadow, opacity: 0.07 }, L.slabSh);
  // правый бок (узкий, темнее) и торец с пластами
  S('path', { d: `M${P.x1} ${P.y0 + 6}L${P.x1 + D * sk} ${P.y0 + D}V${P.y1 + D}L${P.x1} ${P.y1}Z`, fill: '#9C7E57', stroke: PAL.line, style: olw(2.4), 'stroke-linejoin': 'round' }, g);
  const tones = [PAL.k1, PAL.k2, PAL.k3];
  R.layers = [];
  for (let i = 0; i < P.layers; i++) {
    const d0 = D * i / P.layers, d1 = D * (i + 1) / P.layers;
    const d = `M${P.x0 + d0 * sk} ${P.y1 + d0}H${P.x1 + d0 * sk}L${P.x1 + d1 * sk} ${P.y1 + d1}H${P.x0 + d1 * sk}Z`;
    R.layers.push(S('path', { d, fill: tones[i % 3] }, g));
    S('path', { d, fill: 'url(#pGrain)', opacity: 0.85 }, g);
    if (i) S('path', { d: `M${P.x0 + d0 * sk} ${P.y1 + d0}H${P.x1 + d0 * sk}`, stroke: '#7E6342', 'stroke-opacity': 0.55, style: olw(1.4) }, g);
  }
  S('path', { d: `M${P.x0} ${P.y1}H${P.x1}L${P.x1 + D * sk} ${P.y1 + D}H${P.x0 + D * sk}Z`, fill: 'none', stroke: PAL.line, style: olw(3), 'stroke-linejoin': 'round' }, g);
  // лицо плиты
  const fd = rr(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0, 10);
  S('path', { d: fd, fill: PAL.kraft }, g);
  S('path', { d: fd, fill: 'url(#pGrain)', opacity: 0.9 }, g);
  S('path', { d: fd, fill: 'url(#gLit)' }, g);
  S('path', { d: `M${P.x0 + 4} ${P.y1 - 14}V${P.y0 + 12}Q${P.x0 + 4} ${P.y0 + 4} ${P.x0 + 12} ${P.y0 + 4}H${P.x1 - 14}`, fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.4, style: olw(2.4) }, g);
  S('path', { d: fd, fill: 'none', stroke: PAL.line, style: olw(3) }, g);
  // серая плита: монолитный серый картон, без пластов и без поля
  const G = LY.gray, gd = G.depth;
  S('path', { d: rr(G.x0 + 10, G.y0 + 16, G.x1 - G.x0 + 8, G.y1 - G.y0 + gd, 8), fill: PAL.shadow, opacity: 0.08 }, L.slabSh);
  S('path', { d: `M${G.x0} ${G.y1}H${G.x1}L${G.x1 + gd * 0.2} ${G.y1 + gd}H${G.x0 + gd * 0.2}Z`, fill: PAL.slabGrayEdge, stroke: PAL.line, style: olw(2.6), 'stroke-linejoin': 'round' }, g);
  S('path', { d: `M${G.x1} ${G.y0 + 4}L${G.x1 + gd * 0.2} ${G.y0 + gd}V${G.y1 + gd}L${G.x1} ${G.y1}Z`, fill: '#77726A', stroke: PAL.line, style: olw(2.4), 'stroke-linejoin': 'round' }, g);
  const gdd = rr(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0, 8);
  S('path', { d: gdd, fill: PAL.slabGray }, g);
  S('path', { d: gdd, fill: 'url(#pGrain)', opacity: 0.9 }, g);
  S('path', { d: gdd, fill: 'url(#gLit)' }, g);
  S('path', { d: gdd, fill: 'none', stroke: PAL.line, style: olw(3) }, g);
  // трафарет «PHP» на торце (Unbounded 900) — проявляется краской на «PHP»
  const st = S('g', {}, L.slabInk);
  const id = 'stM', m = S('mask', { id, maskUnits: 'userSpaceOnUse', x: -500, y: 800, width: 3500, height: 800 }, L.defs);
  R.stMask = S('rect', { x: 600, y: 1040, width: 0, height: 300, fill: '#fff' }, m);
  // крап — краска легла неровно
  let dots = '';
  for (let i = 0; i < 260; i++) { const x = 620 + hash01(i, 71) * 700, y = 1080 + hash01(i, 72) * 210, r = 0.8 + 3 * Math.pow(hash01(i, 73), 2); dots += `M${f2(x - r)} ${f2(y)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0`; }
  S('path', { d: dots, fill: '#000' }, m);
  const sg = S('g', { mask: `url(#${id})` }, st);
  R.stencil = S('text', { x: 958, y: 1252, 'font-family': 'Unbounded', 'font-size': 212, 'font-weight': 900, 'text-anchor': 'middle', fill: PAL.ink, opacity: 0.88, 'letter-spacing': 10, transform: `matrix(1 0 ${Math.tan(11 * Math.PI / 180).toFixed(4)} 1 ${(-Math.tan(11 * Math.PI / 180) * 1180).toFixed(1)} 0)` }, sg);
  R.stencil.textContent = 'PHP';
  // перемычки трафарета: светлые просветы поперёк букв
}

// ------------------------------------------------------------------ поле плиток-кода: ряды «строк» без букв
function buildField() {
  const P = LY.php, g = S('g', {}, L.field);
  R.field = g;
  R.fieldTiles = [];
  const inWin = (x0, x1, y0, y1) => WINS.slice(0, 7).some(([, cx, cy]) => x0 > cx - 196 && x1 < cx + 196 && y0 > cy - 146 && y1 < cy + 146);
  const widths = [40, 54, 68, 82, 96, 120, 150];
  const nearCrack = (x, y) => {
    for (const C of [CR1J, CR2J]) { const yy = yAtX(C, x); if (x >= C[C.length - 1][0] && x <= C[0][0] && Math.abs(yy - y) < 26) return Math.sign(y - yy) || 1; }
    return 0;
  };
  const PER = 470, PER_END = 1010;                                // слева поле периодично с шагом окон (шов петли)
  const addTile = (k, n, tx, y0, w, isNum) => {
    const hh = isNum ? FIND.th : ROWH, y = isNum ? y0 - (FIND.th - ROWH) / 2 : y0;     // номера чуть крупнее строки
    if (inWin(tx, tx + w, y, y + hh)) return;
    const tone = hash01(k * 31 + n, 6);
    const fill = tone < 0.62 ? '#E6CEA6' : tone < 0.86 ? '#CDB083' : '#D8D3C9';
    const tg = S('g', {}, g);
    S('path', { d: rr(tx + 2, y + 3, w, hh, 5), fill: PAL.shadow, opacity: 0.1 }, tg);
    S('path', { d: rr(tx, y, w, hh, 5), fill, stroke: '#9C7F57', style: olw(1.6) }, tg);
    S('path', { d: `M${tx + 4} ${y + 3}H${tx + w - 5}`, stroke: '#FFFFFF', 'stroke-opacity': 0.4, style: olw(1.4) }, tg);
    const T_ = { g: tg, x: tx, y, w, side: nearCrack(tx + w / 2, y + ROWH / 2), num: null, k, n };
    if (isNum) {
      const j = Math.round((tx - FIND.x0) / (FIND.tw + FIND.gap));
      const ny = S('path', { d: rr(tx, y, w, hh, 5), fill: PAL.yellow, opacity: 0 }, tg);
      const nt = S('text', { x: tx + w / 2, y: y + hh * 0.77, 'font-family': '"JetBrains Mono"', 'font-size': 35, 'font-weight': 700, fill: PAL.ink, 'text-anchor': 'middle' }, tg);
      nt.textContent = FIND.nums[j];
      T_.num = { j, ny, nt };
    }
    R.fieldTiles.push(T_);
  };
  // строка = «строки кода»: отступ, токены разной длины, пустые строки, разрывы
  const lineToks = (k, x0, x1, seed) => {
    const out = []; let x = x0, n = 0, seg = 0;
    while (x < x1 - 40) {
      const hs = hash01(k * 53 + seg, seed), indent = 44 * Math.floor(hash01(k * 53 + seg, seed + 1) * 3.4);
      const segEnd = Math.min(x1, x + 180 + 520 * hs), blank = hash01(k * 53 + seg, seed + 2) < 0.16;
      let tx = x + indent;
      while (!blank && tx < segEnd - 30) {
        let w = widths[Math.floor(hash01(k * 101 + n + seed, 5) * widths.length)];
        if (tx + w > segEnd) w = Math.max(36, segEnd - tx);
        out.push([tx, w, n]); tx += w + 12 + Math.round(4 * hash01(k * 7 + n, 8)); n++;
      }
      x = segEnd + 50 + 110 * hash01(k * 53 + seg, seed + 3); seg++;
    }
    return out;
  };
  // ряд номеров: в каждом периоде пять плиток 42 px на местах (352 + 52j) mod 470; цифры — только у копии периода 1 (x 822–1082)
  const NUMLOC = [0, 1, 2, 3, 4].map(j => (FIND.x0 - PER + j * (FIND.tw + FIND.gap)) % PER);
  for (let k = 0; k * 54 + 18 + ROWH < P.y1 - 8; k++) {
    const y = ROW(k), isRow = k === FIND.row;
    const numPer = FIND.x0 < PER_END;                            // ряд номеров в периодической части поля или правее
    const base = isRow && numPer ? [...lineToks(k, 150, 330, 21), ...NUMLOC.map((x, j) => [x, FIND.tw, 900 + j, true])] : lineToks(k, 14, PER - 20, 21);
    let lastEnd = 0;
    for (let p = 0; p * PER < PER_END; p++) base.forEach(([tx, w, n, nm]) => {
      const X = tx + p * PER, isNum = !!nm && X >= FIND.x0 - 1 && X < FIND.x0 + 5 * (FIND.tw + FIND.gap);
      if (X >= PER_END - 20 && !isNum) return;
      addTile(k, n, X, y, w, isNum); lastEnd = Math.max(lastEnd, X + w);
    });
    const NX0 = FIND.x0 - 24, NX1 = FIND.x0 + 5 * (FIND.tw + FIND.gap) + 14;
    lineToks(k, Math.max(lastEnd + 60, PER_END + 10), P.x1 - 24, 31).forEach(([tx, w, n]) => { if (isRow && !numPer && tx + w > NX0 && tx < NX1) return; addTile(k, 500 + n, tx, y, w, false); });
    if (isRow && !numPer) for (let j = 0; j < 5; j++) addTile(k, 900 + j, FIND.x0 + j * (FIND.tw + FIND.gap), y, FIND.tw, true);
  }
  R.numTiles = R.fieldTiles.filter(t => t.num).sort((a, b) => a.x - b.x);
  R.crackTiles = R.fieldTiles.filter(t => t.side);
}

// ------------------------------------------------------------------ россыпь: запасные плитки-код и обрезки бумаги на листе (низ общих планов)
// слева от плиты пусто — оттуда в кульминации въезжает пара «?»
function buildScatter() {
  const items = [];
  // под серой плитой: запасные плитки-код, чистые вырезки-страницы, обрезки; справа от плиты PHP — горстка плиток
  for (let i = 0; i < 40; i++) {
    const zone = i < 30 ? 0 : 1;
    const x = zone === 0 ? -120 + 2260 * hash01(i, 301) : 1660 + 480 * hash01(i, 302);
    const y = zone === 0 ? 2790 + 1000 * hash01(i, 303) : 1390 + 560 * hash01(i, 304);
    const kind = hash01(i, 305);
    const page = kind > 0.78;
    const w = page ? 250 + 80 * hash01(i, 306) : 120 + 170 * hash01(i, 306), h = page ? 150 : 62;
    const tone = page ? 'slip' : (hash01(i, 307) < 0.6 ? 'kraft' : 'gray');
    const t = makeTile(L.win, L.winSh, { w, h, tone, r: page ? 4 : 7, depth: page ? 2 : 5, line: page ? 1.6 : 3 });
    if (page) [[-0.38, -0.3, 0.5], [-0.38, -0.05, 0.72], [-0.38, 0.2, 0.6]].forEach(([fx, fy, fw]) => S('path', { d: rr(w * fx, h * fy, w * fw, 9, 3), fill: '#C9C4BA' }, t.front));
    t.set({ x, y, rot: (hash01(i, 308) - 0.5) * 50, lift: 4 });
    items.push(t);
  }
  // рулон крафт-скотча — из него заплатки
  const rx = 1840, ry = 3150, roll = S('g', {}, L.win);
  S('circle', { cx: rx + 14, cy: ry + 20, r: 150, fill: PAL.shadow, opacity: 0.09 }, L.winSh);
  S('circle', { cx: rx + 6, cy: ry + 10, r: 146, fill: '#A88A61' }, roll);
  S('circle', { cx: rx, cy: ry, r: 146, fill: '#C9A672', stroke: PAL.line, style: olw(3) }, roll);
  [130, 116, 102].forEach((r, k) => S('circle', { cx: rx, cy: ry, r, fill: 'none', stroke: '#B08C5E', 'stroke-opacity': 0.5 - k * 0.1, style: olw(1.6) }, roll));
  S('circle', { cx: rx, cy: ry, r: 88, fill: '#E9DDC6', stroke: PAL.line, style: olw(2.6) }, roll);
  S('circle', { cx: rx, cy: ry, r: 70, fill: PAL.sheet, stroke: '#A39E93', style: olw(2) }, roll);
  S('path', { d: `M${rx + 120} ${ry - 84}L${rx + 260} ${ry - 150}L${rx + 280} ${ry - 104}L${rx + 140} ${ry - 44}Z`, fill: '#C9A672', opacity: 0.88, stroke: '#8E7046', 'stroke-opacity': 0.5, style: olw(1.2) }, roll);
  R.scatter = items;
}

// ------------------------------------------------------------------ знак канала { | } и ник
function buildSign() {
  const s = LY.sign;
  R.sign = makeTile(L.win, L.winSh, { w: s.w, h: s.h, tone: 'gray', r: 12, depth: 6, yellow: true });
  const sg = S('g', { transform: 'scale(1.15)' }, R.sign.front);
  ['M-38 -46Q-52 -46 -52 -32V-12Q-52 0 -64 0Q-52 0 -52 12V32Q-52 46 -38 46', 'M38 -46Q52 -46 52 -32V-12Q52 0 64 0Q52 0 52 12V32Q52 46 38 46', 'M0 -30V30']
    .forEach(d => S('path', { d, fill: 'none', stroke: PAL.ink, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sg));
  R.nick = writeOn(L.sheetInk, 'kod_i_kadr', { x: -160, y: s.y + s.h / 2 + 76, size: 56, font: '"JetBrains Mono"', weight: 700, fill: PAL.ink, anchor: 'middle' });
}

// ------------------------------------------------------------------ бумага: таблички, записка, полоска, чипы, штамп, строка имён
function buildNotes() {
  // таблички «ВРЕМЕННО / НЕДОСТУПЕН» — по одной на погасшее окно (кроме госпортала: там записка)
  R.plates = {};
  [1, 2, 5, 4, 6].forEach(i => { R.plates[i] = makePlate(L); });
  // записка на госпортале
  const n = makeTile(L.over, L.overSh, { w: 372, h: 112, tone: 'slip', r: 3, depth: 2, line: 0 });
  R.noteA = tText(n.front, 'закрыто из предосторожности', { y: -16, size: 22, weight: 600, fill: PAL.ink });
  R.noteB = tText(n.front, 'признаков взлома не было', { y: 24, size: 17, weight: 500, fill: PAL.graphite });
  tapeStrip(n.over, 70, 22, -4, 0, -58);
  R.note = n;
  // полоска «ВЫКЛЮЧИЛИ / САМИ» (садится к ~1,45 с, уходит на проезде к госпорталу)
  const st = LY.strip, s = makeTile(L.slip, L.slipSh, { w: st.w, h: st.h, tone: 'slip', r: 4, depth: 3, line: 0 });
  R.stripT = [tText(s.front, 'ВЫКЛЮЧИЛИ', { y: -44, size: 84, font: FONT.head, weight: 900 }), tText(s.front, 'САМИ', { y: 50, size: 84, font: FONT.head, weight: 900 })];
  R.strip = s;
  // чип «≈ 70 % сайтов*» на нитке от трафарета (лежит на низе окон ряда Б, нитка к «PHP»)
  const c1 = makeTile(L.slip, L.slipSh, { w: 600, h: 150, tone: 'slip', r: 5, depth: 3, line: 0 });
  R.chip1T = [tText(c1.front, '≈ 70 % сайтов*', { y: -20, size: 54, weight: 700 }), tText(c1.front, '*где язык известен · W3Techs', { y: 44, size: 25, weight: 500, fill: PAL.graphite })];
  S('circle', { cx: 0, cy: 62, r: 6, fill: '#CFC7B8' }, c1.front);
  R.chip1 = c1;
  R.thread = S('path', { fill: 'none', stroke: PAL.graphite, style: olw(2.4), 'stroke-linecap': 'round' }, L.slip);
  buildMemory();
  // «2004» — ярлык, на котором карандаш пишет год (похожую дыру находили в 2004-м)
  const y4 = makeTile(L.slip, L.slipSh, { w: 150, h: 74, tone: 'slip', r: 3, depth: 2, line: 0 });
  R.y2004 = y4;
  R.y2004T = writeOn(y4.front, '2004', { x: 0, y: 16, size: 46, font: '"JetBrains Mono"', weight: 700, fill: PAL.ink, anchor: 'middle' });
  tapeStrip(y4.over, 46, 16, -10, -60, -34);
  R.pen2004 = makePencil2(L, { len: 430, w: 28 });
  // полоска «АВГУСТ / Calif · OpenAI · Wiz»: растёт вместе с текстом
  const nm = makeTile(L.slip, L.slipSh, { w: 900, h: 196, tone: 'slip', r: 4, depth: 2, line: 0 });
  R.augT = tText(nm.front, 'АВГУСТ', { y: -40, size: 70, font: '"JetBrains Mono"', weight: 700 });
  R.namesT = ['Calif', '·', 'OpenAI', '·', 'Wiz'];
  const sz = 80, ws = R.namesT.map(s => textWidth(s, sz, 'Onest', 700)), gap = 22;
  R.namesW = ws.reduce((a, b) => a + b, 0) + gap * 4;
  let x = -R.namesW / 2;
  R.namesEl = R.namesT.map((s, i) => { const e = tText(nm.front, s, { x: x + ws[i] / 2, y: 46, size: sz, weight: 700 }); e.x1 = x + ws[i] + R.namesW / 2; x += ws[i] + gap; return e; });
  R.names = nm;
  // волосная от «7 · 6» к большой трещине
  R.hair = inkStroke(L.slabInk, `M${FIND.x0 + 2.5 * (FIND.tw + FIND.gap) + 4} ${ROW(FIND.row) - 2}L${FIND.x0 + 2.5 * (FIND.tw + FIND.gap) - 8} ${ROW(FIND.row) - 40}L${FIND.x0 + 2.5 * (FIND.tw + FIND.gap) + 6} ${ROW(FIND.row) - 76}L${FIND.x0 + 2.5 * (FIND.tw + FIND.gap) - 4} ${yAtX(CR1J, FIND.x0 + 2.5 * (FIND.tw + FIND.gap)) + 4}`, { seed: 61, w: 2.6, color: PAL.ink, rough: 1.2 });
  // круг карандаша Calif
  R.circle = inkLoop(L.slabInk, FIND.cx, FIND.cy, FIND.rx, FIND.ry, { seed: 6, w: 5, color: PAL.graphite });
  // раскрытый разрыв в точке удара (между героем и окном 2): светлые волокна, толща картона, тёмная глубина
  {
    const HX = 548, HY = yAtX(CR1J, 548) + 2, g = S('g', { opacity: 0 }, L.crack);
    const ring = (rx, ry, jit, seed, n = 26) => Array.from({ length: n }, (_, i) => { const a = i / n * 2 * Math.PI, r = 1 + (hash01(i, seed) - 0.5) * jit; return [HX + rx * r * Math.cos(a), HY + ry * r * Math.sin(a)]; });
    const dP = P => P.map((p, i) => (i ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1])).join('') + 'Z';
    S('path', { d: dP(ring(58, 26, 0.34, 71)), fill: '#F1DFBF', opacity: 0.9 }, g);                 // задранные волокна
    S('path', { d: dP(ring(50, 21, 0.3, 72)), fill: '#9A7A50' }, g);                               // толща картона (стенка)
    const inner = ring(42, 15, 0.3, 73).map(([x, y]) => [x + 2, y + 4]);
    S('path', { d: dP(inner), fill: '#1C140C' }, g);                                                // глубина
    S('path', { d: dP(inner.map(([x, y]) => [x + 3, y + 3])), fill: '#0E0A06', opacity: 0.7 }, g);
    S('path', { d: dP(ring(50, 21, 0.3, 72)), fill: 'none', stroke: PAL.ink, style: olw(2.6), 'stroke-linejoin': 'round' }, g);
    R.hole = g; R.holeAt = { x: HX, y: HY };
  }
  // края трещины у героя — жёлтым на «Зачем»
  const hx = CR1J.filter(p => p[0] > 470 && p[0] < 540);
  R.heroEdge = S('path', { d: hx.map((p, i) => (i ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1] - 6)).join(''), fill: 'none', stroke: PAL.yellow, style: olw(9), 'stroke-linecap': 'round', opacity: 0 }, L.crack);
}

// ------------------------------------------------------------------ герои-предметы: карандаши, курсоры, заплатки
function buildActors() {
  R.owner = makePencil2(L, { eraser: true, len: 470, w: 30 });
  R.teams = TEAMS.map((tm, i) => ({ ...tm, cur: makeCursor(L), pen: makePencil2(L, i === 0 ? { flag: '', flagW: 84, flagH: 46, flagSize: 26, flagAt: 58 } : { flag: '', flagW: 104, flagH: 50, flagSize: 30, flagAt: 132 }) }));
  // флажок «Calif» появляется только в сцене 7
  R.califFlag = tText(R.teams[0].pen.fl, '2004', { size: 26, font: '"JetBrains Mono"', weight: 700 });   // метка находки человека (Esser, 2004)
  R.q = { cur: makeCursor(L, { tagScale: 0.36, scale: 1.5 }), pen: makePencil2(L, { flag: '?', flagW: 76, flagH: 80, flagSize: 64, flagAt: 4, flagSide: 1 }) };
  R.patches = PATCH.map(p => makePatch(L, { w: p.w, h: p.h, text: p.text, size: p.size }));
  R.patchD = makePatch(L, { w: 170, h: 54, text: '21.10', size: 15, floating: true, light: true });
  R.stamp21 = stampPrint(R.patches[0].g, [{ t: '21.10', size: 62 }], { rot: -2, seed: 23 });
}

// ------------------------------------------------------------------ третий план: размытые плитки у объектива (экранные, у каждого кадра свои)
// Плитка живёт в своём кадре и уезжает к ближнему краю при смене кадра (ближний план движется быстрее листа).
async function buildFore() {
  const mk = async (tone, seed, w = 300, h = 220) => {
    const pad = 70, c = cnv(w + 2 * pad, h + 2 * pad), g = c.getContext('2d');
    const [face, edge] = TONES[tone];
    g.translate(pad, pad);
    g.fillStyle = 'rgba(59,45,29,0.12)'; g.beginPath(); g.roundRect(14, 20, w, h, 14); g.fill();
    g.fillStyle = edge; g.beginPath(); g.roundRect(6, 9, w, h, 14); g.fill();
    g.fillStyle = face; g.beginPath(); g.roundRect(0, 0, w, h, 14); g.fill();
    g.strokeStyle = PAL.line; g.lineWidth = 4; g.stroke();
    const b = cnv(c.width, c.height), bg = b.getContext('2d');
    bg.filter = 'blur(12px)'; bg.drawImage(c, 0, 0);
    return { url: await toURL(b), w: c.width, h: c.height };
  };
  const SPR = [await mk('kraft', 1), await mk('gray', 2), await mk('gray', 3, 340, 200), await mk('kraft', 4, 260, 240)];
  // [кадр-якорь, x, y на экране, спрайт, поворот, масштаб]; hook0 и seam — одни и те же (шов петли)
  R.foreItems = [
    ['hook0', 230, 1890, 0, -12, 1.45], ['hook0', 1140, 1120, 1, 9, 1.12], ['hook0', 960, 1930, 3, 10, 1.15],
    ['seam', 230, 1890, 0, -12, 1.45], ['seam', 1140, 1120, 1, 9, 1.12], ['seam', 960, 1930, 3, 10, 1.15],
    ['hook1', 1060, 150, 2, 12, 1.0], ['hook1', 40, 1840, 3, -9, 1.1],
    ['gov', 30, 1760, 1, -10, 1.15], ['gov', 1070, 230, 0, 14, 0.9],
    ['edge', 1060, 1780, 0, 8, 1.1],
    ['reveal', 1030, 1830, 3, 10, 1.1], ['reveal', 20, 1700, 2, -6, 0.9],
    ['mem', 1050, 1820, 0, 10, 1.25], ['mem', 20, 220, 2, -12, 1.0],
    ['y2004', 1060, 1820, 3, 8, 1.1],
    ['teams', 40, 1820, 1, -12, 1.05],
    ['calif', 1060, 1820, 3, 8, 1.2], ['calif', 10, 160, 1, -14, 1.0],
    ['patch', 1050, 1850, 0, 12, 1.1],
    ['strike', 30, 1830, 2, -8, 1.15],
    ['over', 1040, 1830, 1, 10, 1.0],
  ].map(([k, sx, sy, si, rot, sc]) => {
    const sp = SPR[si], g = S('g', {}, fg);
    S('image', { href: sp.url, x: -sp.w / 2, y: -sp.h / 2, width: sp.w, height: sp.h }, g);
    return { k, sx, sy, rot, sc, g, dir: { x: sx < 540 ? -1 : 1, y: sy < 960 ? -1 : 1 } };
  });
}
// активность кадра-якоря: 1 — камера в этом кадре, 0 — далеко (по расписанию CAMS)
function shotActive(name, t) {
  const idx = CAMS.findIndex(c => c[2] === SHOT[name]);
  if (idx < 0) return 0;
  const t0 = CAMS[idx][0], d = CAMS[idx][1], next = CAMS[idx + 1];
  const tin = name === 'hook0' ? -1 : t0, din = Math.max(0.2, d);
  const a = name === 'hook0' ? 1 : ease.inOut(prog(t, tin + din * 0.3, din * 0.7));
  const b = next ? ease.inOut(prog(t, next[0], Math.max(0.2, next[1]) * 0.6)) : 0;
  return a * (1 - b);
}
function foreFrame(t, c) {
  for (const f of R.foreItems) {
    const a = shotActive(f.k, t);
    if (a <= 0.001) { A(f.g, 'visibility', 'hidden'); continue; }
    const out = 1 - a, s = f.sc;
    const x = f.sx + f.dir.x * 700 * out * out, y = f.sy + f.dir.y * 500 * out * out;
    A(f.g, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f.rot}) scale(${f2(s * (1 + 0.15 * out))})`);
    A(f.g, 'visibility', 'visible'); A(f.g, 'opacity', '0.92');
  }
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  if (MAP) return mapFrame();
  const c = COVER ? coverCam() : camAt(t);
  A(wg, 'transform', camXf(c));
  root.style.setProperty('--k', f2(Math.pow(c.z, -0.6)));
  window.__cam = c;
  sceneFrame(COVER ? COVER_T : t, c);
  foreFrame(COVER ? COVER_T : t, c);
  if (COVER) { coverFrame(c); return; }
  caps.frame(t);
}

// ------------------------------------------------------------------ boot
window.DURATION = DUR;
window.T = T;
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
