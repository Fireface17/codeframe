// Субтитры по словам — три стиля подряд, по фразе на стиль, тайминг только от слов (script.json):
//   (а) «пилюля-караоке»: цветная плашка перетекает от слова к слову — передний край едет
//       быстрой пружиной, задний догоняет медленной; текст под плашкой темнеет (клип копии);
//   (б) «заливка-развёртка»: слово закрашивается слева направо за время своего звучания;
//   (в) «поп по слову»: каждое слово выпрыгивает с перелётом, ключевое — крупнее и цветом.
// Под субтитрами — заглушка «кадра видео»: тёмный градиент, мягкие пятна, холмы; всё периодично,
// поэтому первый и последний кадр совпадают (петля). Замени script.json и SPEC — раскладка сама.

const V = H > W;
const P = {
  sky0: '#1c2233', sky1: '#0b0d13', hill0: '#121622', hill1: '#0d1018',
  white: '#f6f3ec', ink: '#15161c', pill: '#ffd23f', fill: '#ff9466', key: '#ffd23f',
};
window.SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 };
const CX = 450;                 // ось субтитров: ниже y 840 правый край зоны — 780, поэтому центр 450
const FONT = 'Rubik';

// ------------------------------------------------------------------ cues (только от слов)
const T = {};
T.p1 = phrase(1).start - 0.15;          // стиль (а)
T.p1out = phrase(2).start - 0.26;       // уход за 0,14 с, потом пауза — без двойной экспозиции
T.p2 = phrase(2).start - 0.1;           // стиль (б)
T.p2out = phrase(3).start - 0.26;
T.p3 = phrase(3).start - 0.05;          // стиль (в)
T.key = word('ритм').start - 0.04;
T.end = window.WORDS.duration;
T.clear = T.end - 0.52;                 // всё ушло за ~0,1 с до конца: шов петли — пустой кадр
const D = Math.round(T.end * FPS) / FPS;

// фразы: строки токенов [текст на экране, слово озвучки, ключевое?]
const SPEC = [
  { style: 'pill', size: 84, base: [1010, 1110], lines: [[['Плашка', word('Плашка')], ['бежит', word('бежит')]], [['за', word('за')], ['голосом.', word('голосом')]]] },
  { style: 'fill', size: 84, base: [1010, 1110], lines: [[['Цвет', word('Цвет')], ['заливает', word('заливает')]], [['каждое', word('каждое')], ['слово.', word('слово')]]] },
  { style: 'pop', size: 80, base: [985, 1135], lines: [[['Монтаж —', word('Монтаж')], ['это', word('это')]], [['ритм.', word('ритм'), 1.8]]] },
];

// ------------------------------------------------------------------ build: фон «кадр видео»
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: linGrad(defs, [[0, P.sky0], [1, P.sky1]], { x1: 0, y1: 0, x2: 0, y2: 1 }) }, svg);
const BLOBS = [
  // цвет, альфа, центр, радиус, амплитуды дрейфа, фаза; дрейф — целое число оборотов за ролик
  { c: '#2f6f78', a: 0.55, x: 250, y: 560, r: 560, ax: 70, ay: 50, ph: 0.1 },
  { c: '#6a3f78', a: 0.5, x: 900, y: 860, r: 620, ax: 60, ay: 70, ph: 0.45 },
  { c: '#b07a3c', a: 0.45, x: 560, y: 1330, r: 420, ax: 50, ay: 30, ph: 0.75 },
  { c: '#34507e', a: 0.4, x: 120, y: 1500, r: 520, ax: 40, ay: 60, ph: 0.3 },
];
const blobs = BLOBS.map(b => ({ ...b, el: S('circle', { r: b.r, fill: radGrad(defs, [[0, b.c, b.a], [0.5, b.c, b.a * 0.5], [1, b.c, 0]]) }, svg) }));
const hills = [
  S('path', { d: 'M-80 1560 C 200 1440 420 1470 640 1530 S 1000 1600 1180 1500 V 2000 H -80 Z', fill: P.hill0 }, svg),
  S('path', { d: 'M-80 1700 C 160 1640 380 1660 560 1720 S 940 1800 1180 1690 V 2000 H -80 Z', fill: P.hill1 }, svg),
];
S('rect', { width: W, height: H, fill: radGrad(defs, [[0.55, '#000', 0], [1, '#000', 0.55]], { r: 0.8 }) }, svg);   // виньетка
const capL = S('g', {}, svg);

// ------------------------------------------------------------------ build: субтитры (после шрифтов)
let PH = null;
const space = (size, wt) => textWidth('a a', size, FONT, wt) - 2 * textWidth('a', size, FONT, wt);
function layout(sp, wt) {
  const toks = [];
  sp.lines.forEach((ln, r) => {
    const sz = ln.map(tk => sp.size * (tk[2] || 1)), ws = ln.map((tk, j) => textWidth(tk[0], sz[j], FONT, wt));
    const gap = space(sp.size, wt), tot = ws.reduce((a, b) => a + b, 0) + gap * (ln.length - 1);
    let x = CX - tot / 2;
    ln.forEach((tk, j) => { toks.push({ str: tk[0], wd: tk[1], key: !!tk[2], size: sz[j], x, w: ws[j], y: sp.base[r], row: r }); x += ws[j] + gap; });
  });
  return toks;
}
const txt = (parent, tk, fill, wt) => { const e = S('text', { x: f2(tk.x), y: tk.y, 'font-family': FONT, 'font-weight': wt, 'font-size': tk.size, fill }, parent); e.textContent = tk.str; return e; };

function build() {
  PH = SPEC.map(sp => {
    const g = sceneG(capL), wt = sp.style === 'pop' ? 900 : 800, toks = layout(sp, wt);
    if (sp.style === 'pill') {
      // плашка + тёмная копия текста, обрезанная той же плашкой: под плашкой слово тёмное
      const pill = S('rect', { fill: P.pill }, g);
      const light = S('g', {}, g), dark = S('g', {}, g);
      const cp = S('clipPath', { id: 'pillClip', clipPathUnits: 'userSpaceOnUse' }, defs), crect = S('rect', {}, cp);
      A(dark, 'clip-path', 'url(#pillClip)');
      toks.forEach(tk => { tk.gl = S('g', {}, light); tk.el = txt(tk.gl, tk, P.white, wt); tk.gd = S('g', {}, dark); txt(tk.gd, tk, P.ink, wt); });
      // коробки слов -> рёбра плашки: ребро по ходу движения — быстрая пружина, второе догоняет
      const pad = 0.2 * sp.size, box = tk => ({ L: tk.x - pad, R: tk.x + tk.w + pad, y: tk.y - 0.77 * sp.size });
      const B = toks.map(box), te = toks.map(tk => tk.wd.start - 0.05);
      const FAST = { r: 0.24, z: 0.8 }, SLOW = { r: 0.36, z: 0.92 }, ROW = { r: 0.3, z: 0.86 };
      const evL = [], evR = [], evY = [];
      for (let i = 1; i < B.length; i++) {
        evL.push([te[i], B[i].L, B[i].L < B[i - 1].L ? FAST : SLOW]);
        evR.push([te[i], B[i].R, B[i].R > B[i - 1].R ? FAST : SLOW]);
        evY.push([te[i], B[i].y, ROW]);
      }
      return { sp, g, toks, pill, crect, t0: te[0], L: track(B[0].L, evL), R: track(B[0].R, evR), Y: track(B[0].y, evY), h: 0.98 * sp.size };
    }
    if (sp.style === 'fill') {
      toks.forEach(tk => {
        tk.g = S('g', {}, g);
        tk.el = txt(tk.g, tk, P.white, wt);
        tk.fe = txt(tk.g, tk, P.fill, wt);
        tk.clip = clipRect(defs, tk.fe);
      });
      return { sp, g, toks };
    }
    toks.forEach(tk => {   // pop: каждое слово — группа с началом в центре базовой линии
      tk.g = S('g', {}, g);
      const e = S('text', { x: f2(-tk.w / 2), y: 0, 'font-family': FONT, 'font-weight': wt, 'font-size': tk.size, fill: tk.key ? P.key : P.white }, tk.g);
      e.textContent = tk.str; tk.el = e; tk.cx = tk.x + tk.w / 2;
    });
    return { sp, g, toks };
  });
}

// ------------------------------------------------------------------ frame(t)
// вход фразы: строки поднимаются каскадом; уход: короткий подъём + исчезновение (power4.in)
const rowIn = (t, t0, r) => (t < t0 + r * 0.07 ? 0 : step(t - t0 - r * 0.07, SP.fade));

function framePill(t, ph) {
  const on = t >= T.p1 - 0.001 && t < T.p1out + 0.15;
  ph.g.on(on); if (!on) return;
  const out = prog(t, T.p1out, 0.14, ease.in4);
  A(ph.g, 'transform', `translate(0 ${f2(-out * 16)})`); A(ph.g, 'opacity', f2(1 - out));
  ph.toks.forEach(tk => {
    const a = rowIn(t, T.p1, tk.row), tr = `translate(0 ${f2((1 - a) * 22)})`;
    A(tk.gl, 'transform', tr); A(tk.gd, 'transform', tr);
    const said = t >= tk.wd.start - 0.05 ? step(t - tk.wd.start + 0.05, SP.out) : 0;
    A(tk.gl, 'opacity', f2(a * lerp(0.5, 1, said)));   // ещё не сказанное — приглушено, сказанное плавно ярчает
  });
  // плашка: появляется поп-ом на первом слове, дальше перетекает
  const s = t < ph.t0 ? 0 : lerp(0.55, 1, step(t - ph.t0, SP.pop)), o = t < ph.t0 ? 0 : step(t - ph.t0, SP.out);
  const L = ph.L(t), R = ph.R(t), y = ph.Y(t), cx = (L + R) / 2, cy = y + ph.h / 2, w = (R - L) * s, h = ph.h * s;
  for (const e of [ph.pill, ph.crect]) { A(e, 'x', f2(cx - w / 2)); A(e, 'y', f2(cy - h / 2)); A(e, 'width', f2(Math.max(0, w))); A(e, 'height', f2(h)); A(e, 'rx', f2(h / 2)); }
  show(ph.pill, o);
}

function frameFill(t, ph) {
  const on = t >= T.p2 - 0.001 && t < T.p2out + 0.15;
  ph.g.on(on); if (!on) return;
  const out = prog(t, T.p2out, 0.14, ease.in4);
  A(ph.g, 'transform', `translate(0 ${f2(-out * 16)})`); A(ph.g, 'opacity', f2(1 - out));
  ph.toks.forEach(tk => {
    const a = rowIn(t, T.p2, tk.row), ws = tk.wd.start - 0.03, we = tk.wd.end;
    const p = prog(t, ws, we - ws, ease.sine);                         // развёртка за время звучания слова
    const lift = 6 * Math.sin(Math.PI * clamp((t - ws) / (we - ws + 0.15)));   // слово чуть приподнимается, пока красится
    A(tk.g, 'transform', `translate(0 ${f2((1 - a) * 22 - lift)})`);
    A(tk.g, 'opacity', f2(a));
    A(tk.el, 'opacity', f2(lerp(0.42, 0.55, p)));
    tk.clip.set(tk.x - 6, tk.y - tk.size, (tk.w + 12) * p, tk.size * 1.4);
    A(tk.fe, 'visibility', p > 0.001 ? 'visible' : 'hidden');
  });
}

const POP = { r: 0.38, z: 0.52 }, POPK = { r: 0.44, z: 0.45 };
function framePop(t, ph) {
  const on = t >= T.p3 - 0.1 && t < T.clear + 0.45;
  ph.g.on(on); if (!on) return;
  ph.toks.forEach((tk, i) => {
    const t0 = tk.wd.start - 0.04, dt = t - t0;
    if (dt <= 0) { show(tk.g, 0); return; }
    const sp = tk.key ? POPK : POP, s = lerp(0.2, 1, step(dt, sp));
    const rot = (hash01(i, 5) < 0.5 ? -1 : 1) * (tk.key ? 12 : 8) * (1 - step(dt, SP.pop));
    const dy = 40 * (1 - step(dt, SP.snap));
    // ключевое слово: сплющивается при «приземлении», объём сохраняется
    const k = tk.key ? 0.16 * Math.exp(-dt / 0.12) * Math.sin(dt * 26) : 0, sq = squash(s, k);
    const g = ease.in4((t - T.clear - i * 0.06) / 0.3);               // уход каскадом вверх
    pose(tk.g, tk.cx, tk.y + dy - 50 * g, sq.sx * (1 - 0.15 * g), sq.sy * (1 - 0.15 * g), rot, step(dt, SP.out) * (1 - g));
  });
}

function frame(t) {
  // фон: каждое пятно ходит по замкнутой кривой с периодом = длительность ролика
  const u = 2 * Math.PI * t / D;
  blobs.forEach((b, i) => {
    A(b.el, 'cx', f2(b.x + b.ax * Math.sin(u + 2 * Math.PI * b.ph)));
    A(b.el, 'cy', f2(b.y + b.ay * Math.cos(u + 2 * Math.PI * b.ph)));
    A(b.el, 'r', f2(b.r * (1 + 0.05 * Math.sin(2 * u + i))));
  });
  hills.forEach((h, i) => A(h, 'transform', `translate(${f2((i ? 14 : -10) * Math.sin(u))} 0)`));
  framePill(t, PH[0]);
  frameFill(t, PH[1]);
  framePop(t, PH[2]);
}

// ------------------------------------------------------------------ звук
sfx(T.p1 + 0.1, 'pop', -14);
sfx(T.p2, 'whoosh', -15);
sfx(word('Монтаж').start - 0.04, 'pop', -12); sfx(word('это').start - 0.04, 'pop', -13); sfx(T.key, 'pop', -6);

// ------------------------------------------------------------------ boot
window.DURATION = D;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, D));
window.READY = (async () => { await loadFonts(); build(); frame(0); return true; })();
