// Хук на кинетической типографике: четыре строки, у каждой свой приём появления
// (падение букв с отскоком · удар с тряской кадра · наезд сбоку с растяжением по скорости ·
// раскрытие цветной шторкой), волна по буквам на удержании, уход каскадом в пустой кадр (петля).
// Текст — заглушка: поменяй LINES, размер подберётся под безопасную зону сам.

const V = H > W;
const P = { bg: '#111113', ink: '#f4f1ea', accent: '#ff5b2e' };
window.SAFE = V ? { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 } : { x0: 96, x1: W - 96, y0: 54, y1: H - 54 };
const LINES = ['МЕНЬШЕ', 'СЛОВ —', 'БОЛЬШЕ', 'ДВИЖЕНИЯ'];
const FONT = 'Rubik', WEIGHT = 900;

// ------------------------------------------------------------------ cues (с)
const T = {};
T.l1 = 0.25;              // падение букв
T.l2 = 0.95;              // удар
T.slam = T.l2 + 0.12;     // момент «приземления» удара: тряска
T.l3 = 1.5;               // наезд сбоку
T.l4 = 2.1;               // шторка
T.wave = 3.3;             // волна по буквам на удержании
T.out = 4.5;              // уход каскадом
T.end = 5.3;
T.cam = T.l4 + 0.6;       // медленный наезд камеры на удержании

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: P.bg }, svg);
const stage = S('g', {}, svg);
let L = null;   // раскладка считается после загрузки шрифтов (нужны реальные ширины)

function build() {
  const Z = window.SAFE, cx = (Z.x0 + Z.x1) / 2;
  const unit = Math.max(...LINES.map(s => textWidth(s, 100, FONT, WEIGHT))) / 100;
  const size = Math.min(V ? 132 : 150, (Z.x1 - Z.x0) * 0.94 / unit), lh = size * 1.0;
  // вертикаль: блок кончается выше y 840 (ниже справа кнопки TikTok); горизонталь — по центру
  const last = V ? (Z.yLow - 0.1 * size) : H / 2 + 1.5 * lh + 0.35 * size;
  const base = LINES.map((_, j) => last - (LINES.length - 1 - j) * lh);
  const wraps = LINES.map(() => S('g', {}, stage));
  const words = wraps.map(w => S('g', {}, w));
  const lines = LINES.map((s, j) => splitText(words[j], s, { x: cx, y: base[j], size, font: FONT, weight: WEIGHT, fill: j === 3 ? P.accent : P.ink, anchor: 'middle' }));
  // строка 4: цветная шторка и клип текста, который она открывает
  const w4 = lines[3].width, bx0 = cx - w4 / 2 - 0.12 * size, bx1 = cx + w4 / 2 + 0.12 * size;
  const by = base[3] - 0.86 * size, bh = 1.08 * size;
  const block = S('rect', { y: by, height: bh, fill: P.accent }, words[3]);
  const clip4 = clipRect(defs, lines[3].g);
  L = { cx, size, lh, base, wraps, words, lines, block, clip4, bx0, bx1, by, bh };
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const { cx, size, base, wraps, words, lines, block, clip4, bx0, bx1, by, bh } = L;
  // камера: медленный наезд на удержании + тряска от удара
  const cs = 1 + 0.03 * after(t, T.cam, SP.cam), sh = shake(t, T.slam, 16, 0.42, 5);
  const fy = (base[0] + base[3]) / 2 - 0.35 * size;
  A(stage, 'transform', `translate(${f2(cx + sh.x)} ${f2(fy + sh.y)}) rotate(${f2(sh.rot)}) scale(${f2(cs)}) translate(${f2(-cx)} ${f2(-fy)})`);

  // 1 — буквы падают сверху с отскоком и доворотом
  lines[0].chars.forEach((c, i) => {
    const t0 = T.l1 + i * 0.045, a = step(t - t0, SP.hop), r = step(t - t0, SP.pop);
    pose(c.g, c.x, c.y + lerp(-1.1 * size, 0, a), 1, 1, (hash01(i, 11) < 0.5 ? -1 : 1) * 16 * (1 - r), prog(t, t0, 0.12, ease.out));
  });

  // 2 — удар: слово влетает из крупного плана, кадр вздрагивает
  const s2 = t < T.l2 ? 0 : lerp(2.7, 1, step(t - T.l2, { r: 0.32, z: 0.68 }));
  const o2 = prog(t, T.l2, 0.07, ease.out);
  popAt(words[1], cx, base[1] - 0.35 * size, Math.max(s2, 1e-3), o2);
  lines[1].chars.forEach(c => place(c.g, c.x, c.y));

  // 3 — наезд слева: буквы растягиваются пропорционально скорости
  const n3 = lines[2].chars.length, D3 = 0.5;
  lines[2].chars.forEach((c, i) => {
    const t0 = T.l3 + i * 0.035, xAt = tt => lerp(-1.15 * W, 0, ease.out4((tt - t0) / D3));
    const v = (xAt(t + 0.004) - xAt(t - 0.004)) / 0.008, k = clamp(v / 7000, 0, 0.3);
    const sq = squash(1, k);
    pose(c.g, c.x + xAt(t), c.y, sq.sx, sq.sy, 0, prog(t, t0, 0.1, ease.out));
  });

  // 4 — шторка: блок вырастает слева, уезжает вправо и открывает слово
  const gA = prog(t, T.l4, 0.28, ease.inOut), gB = prog(t, T.l4 + 0.3, 0.3, ease.inOut);
  const left = lerp(bx0, bx1, gB), right = lerp(bx0, bx1, gA);
  A(block, 'x', f2(left)); A(block, 'width', f2(Math.max(0, right - left)));
  A(block, 'visibility', right - left > 0.5 ? 'visible' : 'hidden');
  clip4.set(bx0, by - 0.4 * size, left - bx0, bh + 0.8 * size);
  // волна по буквам: подъём и лёгкое увеличение бегут слева направо
  lines[3].chars.forEach((c, i) => {
    const u = (t - T.wave - i * 0.055) / 0.38, b = u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
    pose(c.g, c.x, c.y - 0.2 * size * b, 1 + 0.1 * b, 1 + 0.1 * b, 0, 1);
  });

  // уход: строки вверх каскадом (power4.in), в конце пустой кадр = шов петли
  // вторичное действие: удар второй строки подталкивает первую вверх, та пружинит обратно
  const nudge = -0.16 * size * (step(t - T.slam, SP.hop) - step(t - T.slam - 0.07, SP.hop));
  wraps.forEach((w, j) => {
    const g = ease.in4((t - T.out - j * 0.06) / 0.32);
    A(w, 'transform', `translate(0 ${f2(-0.6 * size * g + (j === 0 ? nudge : 0))})`);
    show(w, 1 - g);
  });
}

// ------------------------------------------------------------------ звук (для сборки с музыкой)
sfx(T.l1, 'pop', -10); sfx(T.slam - 0.03, 'pop', -4); sfx(T.l3, 'whoosh', -9); sfx(T.l4, 'whoosh', -11); sfx(T.out, 'whoosh', -12);

// ------------------------------------------------------------------ boot
window.DURATION = Math.round(T.end * FPS) / FPS;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, window.DURATION));
window.READY = (async () => { await loadFonts(); build(); frame(0); return true; })();
