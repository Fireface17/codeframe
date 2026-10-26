// Логотип-заставка выдуманного бренда «ЛУНОРА» (свет для дома): знак — луна над водой
// (круг, нижняя часть рассечена тремя просветами-отражениями). Контур рисуется двумя
// половинами от верхней точки -> заливка поднимается шторкой снизу вверх, контур гаснет ->
// знак уезжает вверх, освобождая место, словесная часть поднимается по буквам из-под
// базовой линии (клип) -> на «ударе» (приземление последней буквы) от знака расходятся
// тонкие кольца-волны и кадр слегка вздрагивает -> слоган проявляется. Держится ~1 с,
// уходит каскадом в пустой кадр (петля). Один акцентный цвет, много воздуха.
//
// Приёмы для повторного использования:
//   circleHalves(R)        — две половины окружности от верхней точки (симметричный draw-on);
//   ringWave(t, t0, ...)   — кольцо-волна: радиус по ease.outExpo, толщина и прозрачность гаснут;
//   bandsClip(defs, ...)   — clipPath из нескольких полос (просветы в заливке без масок).

const P = { bg: '#0e1424', ink: '#f1ede4', muted: '#7e879b', accent: '#9fb2ff' };
window.SAFE = { x0: 96, x1: 1824, y0: 54, y1: 1026 };
const BRAND = 'ЛУНОРА', SLOGAN = 'СВЕТ ДЛЯ ТИХИХ ВЕЧЕРОВ';
const R = 96;                                       // радиус знака, px
const BANDS = [[-R - 4, 26], [34, 47], [55, 66], [74, R + 4]];   // видимые полосы заливки (y от центра)

// ------------------------------------------------------------------ cues (с)
const T = {};
T.draw = 0.25;               // контур
T.fill = 0.8;                // шторка заливки
T.lift = 1.18;               // знак уходит вверх
T.word = 1.3;                // буквы
T.hit = 0;                   // приземление последней буквы (считается ниже)
T.slogan = 0;
T.out = 0;
T.end = 0;
const LET_STEP = 0.065;
T.hit = T.word + (BRAND.length - 1) * LET_STEP + 0.3;   // последняя буква приземлилась
T.slogan = T.hit + 0.22;
T.out = T.slogan + 1.35;     // ~1 с удержания полного знака со слоганом
T.end = T.out + 0.85;

// ------------------------------------------------------------------ helpers
function circleHalves(r) {
  return [`M0 ${-r}A${r} ${r} 0 0 1 0 ${r}`, `M0 ${-r}A${r} ${r} 0 0 0 0 ${r}`];
}
function ringWave(t, t0, r0, r1, dur = 1.0) {
  if (t < t0) return null;
  const p = clamp((t - t0) / dur);
  if (p >= 1) return null;
  return { r: lerp(r0, r1, ease.outExpo(p)), o: Math.pow(1 - p, 1.6), w: lerp(2.6, 0.8, p) };
}
let _bandN = 0;
function bandsClip(defs, target, bands, x0, w) {
  const id = 'bc' + (++_bandN), cp = S('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, defs);
  bands.forEach(([a, b]) => S('rect', { x: x0, y: a, width: w, height: b - a }, cp));
  A(target, 'clip-path', `url(#${id})`);
}
const outG = (t, t0, d = 0.28) => ease.in4((t - t0) / d);

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: P.bg }, svg);
// едва заметная виньетка: глубина без пятен
S('rect', { width: W, height: H, fill: radGrad(defs, [[0.5, P.bg, 0], [1, '#070a13', 0.7]], { r: 0.8 }) }, svg);
const stage = S('g', {}, svg);
const rings = [S('circle', { fill: 'none', stroke: P.accent }, stage), S('circle', { fill: 'none', stroke: P.accent }, stage)];
// знак: контур (две половины) + заливка с просветами под шторкой
const mark = S('g', {}, stage);
const halves = circleHalves(R).map(d => drawStroke(mark, d, { stroke: P.accent, 'stroke-width': 3 }));
const shutterG = S('g', {}, mark);
const shutter = clipRect(defs, shutterG);
const bandG = S('g', {}, shutterG);
bandsClip(defs, bandG, BANDS, -R - 10, 2 * R + 20);
S('circle', { r: R, fill: P.accent }, bandG);
let L = null;

function build() {
  const size = 84, base = 652;
  const wordG = S('g', {}, stage);
  const wclip = clipRect(defs, wordG);
  wclip.set(0, base - size * 1.1, W, size * 1.1 + 10);
  const word = splitText(wordG, BRAND, { x: W / 2, y: base, size, font: 'Unbounded', weight: 700, fill: P.ink, anchor: 'middle', ls: 18 });
  const slogan = S('text', { x: W / 2 + 4, y: base + 74, 'text-anchor': 'middle', 'font-family': 'Onest', 'font-weight': 500, 'font-size': 27, 'letter-spacing': 8, fill: P.muted }, stage);
  slogan.textContent = SLOGAN;
  L = { size, base, word, slogan, wordG };
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const { size, word, slogan } = L;
  const sh = shake(t, T.hit, 7, 0.38, 4, 20);
  A(stage, 'transform', `translate(${f2(sh.x)} ${f2(sh.y)}) rotate(${f2(sh.rot * 0.5)} ${W / 2} ${H / 2})`);

  // знак: контур -> шторка -> подъём; уход последним
  const lift = step(t - T.lift, { r: 0.85, z: 1 });
  const my = lerp(H / 2, 432, lift);
  const gMark = outG(t, T.out + 0.16, 0.3);
  place(mark, W / 2, my - 14 * gMark, 1 - 0.08 * gMark, 1 - gMark);
  const dr = prog(t, T.draw, 0.6, ease.inOut);
  halves.forEach(h => h.draw(dr));
  const fl = prog(t, T.fill, 0.42, ease.inOut);
  shutter.set(-R - 10, R + 4 - (2 * R + 8) * fl, 2 * R + 20, (2 * R + 8) * fl);
  halves.forEach(h => A(h, 'opacity', f2(1 - prog(t, T.fill + 0.25, 0.3, ease.out))));

  // кольца-волны от знака на ударе
  [[T.hit, R + 6, 520, 1.05], [T.hit + 0.12, R + 6, 380, 0.95]].forEach(([t0, r0, r1, d], k) => {
    const w = ringWave(t, t0, r0, r1, d), c = rings[k];
    if (!w) { A(c, 'visibility', 'hidden'); return; }
    A(c, 'cx', W / 2); A(c, 'cy', f2(my)); A(c, 'r', f2(w.r)); A(c, 'stroke-width', f2(w.w * (k ? 0.7 : 1)));
    A(c, 'opacity', f2(w.o * (k ? 0.5 : 0.8))); A(c, 'visibility', 'visible');
  });

  // словесная часть: буквы поднимаются из-под базовой линии каскадом
  word.chars.forEach((c, i) => {
    const t0 = T.word + i * LET_STEP, a = step(t - t0, { r: 0.5, z: 0.9 });
    const g = outG(t, T.out + 0.06 + i * 0.022, 0.24);
    pose(c.g, c.x, c.y + size * 1.05 * (1 - a) - 30 * g, 1, 1, 0, (t >= t0 ? 1 : 0) * (1 - g));
  });
  // слоган
  const so = vis(t, T.slogan, Infinity, SP.fade) * (1 - outG(t, T.out, 0.2));
  rise(slogan, so, 14);
}

// ------------------------------------------------------------------ звук
sfx(T.draw, 'scribble', -16); sfx(T.fill, 'whoosh', -15); sfx(T.word, 'tick', -16); sfx(T.hit, 'ding', -8); sfx(T.out, 'whoosh', -15);

// ------------------------------------------------------------------ boot
window.DURATION = Math.round(T.end * FPS) / FPS;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, window.DURATION));
window.READY = (async () => { await loadFonts(); build(); frame(0); return true; })();
