// Бесшовный фон-петля под титр. Кадр t = 0 и кадр t = D совпадают точно (без пустого кадра):
//   * мягкие пятна (radGrad) ходят по замкнутым фигурам Лиссажу: x, y = sin(2π·m·t/D + φ) с ЦЕЛЫМИ m,
//     радиус «дышит» с целой частотой — любой параметр возвращается в исходное значение ровно за D;
//   * боке: частицы поднимаются и переносятся через край (сдвиг за ролик = целое число высот кадра
//     с полями), качаются и мерцают с целыми частотами; перенос происходит за кадром, его не видно;
//   * три глубины боке: крупные — тусклее и медленнее, мелкие — чётче и быстрее (параллакс).
// Сверху одна строка-заглушка титра. Палитра — приглушённые «сумерки», без неона.

const P = {
  bg0: '#1b1d26', bg1: '#121318', text: '#f3eee6',
  blobs: ['#3f7f86', '#c0745a', '#c9a25a', '#4a5f93', '#7a5378'],
  bokeh: ['#f4e6cf', '#e9c9a8', '#cfe0e3'],
};
window.SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 };
const TITLE = 'Ваш титр здесь';

// ------------------------------------------------------------------ cues
const T = {};
T.end = 6.0;                                   // период петли = длительность ролика
const D = Math.round(T.end * FPS) / FPS;
const TAU = 2 * Math.PI;
const wave = (t, m, ph) => Math.sin(TAU * (m * t / D + ph));   // m — целое: период делит D

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: linGrad(defs, [[0, P.bg0], [1, P.bg1]], { x1: 0, y1: 0, x2: 0.3, y2: 1 }) }, svg);

// пятна: центр, радиус, амплитуды и целые частоты траектории, фаза
const BLOBS = [
  { c: 0, a: 0.62, x: 300, y: 520, r: 640, ax: 140, ay: 110, mx: 1, my: 2, ph: 0.00 },
  { c: 1, a: 0.50, x: 860, y: 760, r: 600, ax: 120, ay: 160, mx: 1, my: 1, ph: 0.30 },
  { c: 2, a: 0.38, x: 520, y: 1260, r: 560, ax: 160, ay: 90, mx: 2, my: 1, ph: 0.55 },
  { c: 3, a: 0.55, x: 180, y: 1540, r: 620, ax: 110, ay: 120, mx: 1, my: 1, ph: 0.75 },
  { c: 4, a: 0.45, x: 920, y: 1720, r: 580, ax: 130, ay: 100, mx: 1, my: 2, ph: 0.15 },
];
const blobs = BLOBS.map(b => {
  const col = P.blobs[b.c];
  return { ...b, el: S('circle', { r: b.r, fill: radGrad(defs, [[0, col, b.a], [0.45, col, b.a * 0.55], [1, col, 0]]) }, svg) };
});

// боке: общие градиенты в единицах объекта — один на цвет, подходят к кругу любого размера
const bokehFill = P.bokeh.map(c => radGrad(defs, [[0, c, 0.16], [0.72, c, 0.22], [0.9, c, 0.34], [1, c, 0]]));
const LAYERS = [
  { n: 7, r: [46, 70], o: 0.55, k: 1, sway: 34 },   // ближний план: крупные, тусклые, медленные
  { n: 11, r: [20, 34], o: 0.75, k: 1, sway: 22 },
  { n: 14, r: [7, 14], o: 0.9, k: 2, sway: 14 },     // дальний: мелкие, чёткие, два круга за ролик
];
const bokeh = [];
const bokehG = S('g', {}, svg);
LAYERS.forEach((ly, li) => {
  for (let i = 0; i < ly.n; i++) {
    const id = li * 100 + i, h = s => hash01(id, s);
    const r = lerp(ly.r[0], ly.r[1], h(1)), margin = ly.r[1] + 10;
    bokeh.push({
      el: S('circle', { r: f2(r), fill: bokehFill[Math.floor(h(2) * P.bokeh.length)] }, bokehG),
      x0: lerp(80, W - 80, (i + h(3)) / ly.n), y0: h(4) * (H + 2 * margin), span: H + 2 * margin, margin,
      k: ly.k, sway: ly.sway * (0.6 + 0.8 * h(5)), mS: 1 + Math.floor(h(6) * 2), pS: h(7),
      o: ly.o * (0.55 + 0.45 * h(8)), mT: 1 + Math.floor(h(9) * 3), pT: h(10),
    });
  }
});
S('rect', { width: W, height: H, fill: radGrad(defs, [[0.5, '#000', 0], [1, '#000', 0.5]], { r: 0.78 }) }, svg);   // виньетка

// титр-заглушка: статичен, поэтому петля не нарушается
const titleG = S('g', {}, svg);
let titleEl = null;
function build() {
  const Z = window.SAFE, cx = (Z.x0 + Z.x1) / 2, size = Math.min(76, 0.9 * (Z.x1 - Z.x0) / (textWidth(TITLE, 100, 'Unbounded', 700) / 100));
  S('rect', { x: cx - 36, y: 812 - size - 34, width: 72, height: 6, rx: 3, fill: P.blobs[2] }, titleG);
  titleEl = S('text', { x: cx, y: 812, 'text-anchor': 'middle', 'font-family': 'Unbounded', 'font-weight': 700, 'font-size': f2(size), fill: P.text }, titleG);
  titleEl.textContent = TITLE;
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  blobs.forEach((b, i) => {
    A(b.el, 'cx', f2(b.x + b.ax * wave(t, b.mx, b.ph)));
    A(b.el, 'cy', f2(b.y + b.ay * wave(t, b.my, b.ph + 0.25)));
    A(b.el, 'r', f2(b.r * (1 + 0.07 * wave(t, 1, b.ph + 0.5 + 0.1 * i))));
  });
  bokeh.forEach(p => {
    // подъём с переносом: за D частица проходит ровно k полных высот (кадр + поля)
    const y = ((p.y0 - p.k * p.span * t / D) % p.span + p.span) % p.span - p.margin;
    A(p.el, 'cx', f2(p.x0 + p.sway * wave(t, p.mS, p.pS)));
    A(p.el, 'cy', f2(y));
    A(p.el, 'opacity', f2(p.o * (0.62 + 0.38 * wave(t, p.mT, p.pT))));
  });
}

// ------------------------------------------------------------------ boot
window.DURATION = D;
window.T = T;
[0.5, 2.5, 4.5].forEach(ts => sfx(ts, 'whoosh', -24));   // фон: три едва слышных «вдоха», период делит D
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, D));
window.READY = (async () => {
  await loadFonts(); build();
  frame(0); return true;
})();
