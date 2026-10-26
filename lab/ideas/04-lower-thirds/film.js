// Три плашки-титра подряд поверх «кадра-заглушки» (пейзаж в сумерках из мягких слоёв с
// параллаксом и лёгким дрейфом камеры — имитация видео):
//   (а) раскрытие маской: акцентная линия рисуется, светлая плашка выезжает из-под неё,
//       имя и должность поднимаются внутри плашки;
//   (б) kicker + имя + должность, вертикальная линейка рисуется сверху вниз, текст выезжает
//       из-за неё (клип справа от линейки);
//   (в) минимал: подчёркивание рисуется, текст поднимается «из линии» (клип над ней).
// Каждая держится ≥ 1,2 с, уход быстрее входа (power4.in). Дрейф камеры периодичен по
// длительности — первый и последний кадр совпадают (петля).
//
// Приёмы для повторного использования:
//   ridge(y0, amp, seed)  — гладкий контур холма из fbm1 (закрытый путь до низа кадра);
//   loopDrift(t)          — дрейф камеры, периодичный по DURATION (петля без шва);
//   slideIn(t, t0, dx)    — въезд без перелёта (пружина z = 1) + быстрая непрозрачность.

const P = {
  white: '#f6f3ec', plate: '#f4f1ea', ink: '#15181c', inkMute: '#5b616a',
  accent: '#ff6b3d', soft: 'rgba(246,243,236,0.74)',
};
window.SAFE = { x0: 96, x1: 1824, y0: 54, y1: 1026 };
const SANS = 'Onest';
const LX = 150;                                   // левый край всех титров (внутри SAFE.x0)

const TITLES = {
  a: { name: 'Алина Воронцова', role: 'продюсер документального кино' },
  b: { kicker: 'ГОСТЬ ВЫПУСКА', name: 'Тимур Есенов', role: 'инженер-акустик, 20 лет в кино' },
  c: { name: 'Вера Сомова', role: 'архитектор, Казань' },
};

// ------------------------------------------------------------------ cues (с)
const T = {};
T.aIn = 0.35;  T.aOut = 2.35;
T.bIn = 2.95;  T.bOut = 4.95;
T.cIn = 5.5;   T.cOut = 7.4;
T.end = 8.0;
const D = Math.round(T.end * FPS) / FPS;

// ------------------------------------------------------------------ helpers
const SP_IN = { r: 0.5, z: 1 };                   // въезд без перелёта (соседи, клипы)
function slideIn(t, t0, dx = -60) { const a = step(t - t0, SP_IN); return { dx: dx * (1 - a), o: prog(t, t0, 0.14, ease.out) }; }
const outG = (t, t0, d = 0.24) => ease.in4((t - t0) / d);
function loopDrift(t) {
  const u = 2 * Math.PI * t / D;
  return { x: 28 * Math.sin(u), y: 7 * Math.sin(2 * u + 0.6), s: 1.05 + 0.012 * (1 - Math.cos(u)) };
}
function ridge(y0, amp, seed, freq = 1 / 430) {
  const pts = [];
  for (let x = -220; x <= W + 220; x += 40) pts.push([x, y0 + amp * fbm1(x * freq, seed, 3)]);
  let d = `M${pts[0][0]} ${H + 80}L${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${pts[i][0]} ${pts[i][1].toFixed(1)} ${mx} ${my.toFixed(1)}`;
  }
  return d + `L${pts[pts.length - 1][0]} ${H + 80}Z`;
}
const vgrad = (stops) => linGrad(defs, stops, { x1: 0, y1: 0, x2: 0, y2: 1 });

// ------------------------------------------------------------------ build: кадр-заглушка
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
const cam = S('g', {}, svg);
const layers = [];
{
  const sky = S('g', {}, cam);
  S('rect', { x: -200, y: -200, width: W + 400, height: H + 400, fill: vgrad([[0, '#1b2433'], [0.42, '#465469'], [0.66, '#a48577'], [0.74, '#cfa185'], [1, '#cfa185']]) }, sky);
  S('circle', { cx: 1270, cy: 585, r: 190, fill: radGrad(defs, [[0, '#f8dcbc', 0.95], [0.62, '#f3d0ad', 0.75], [1, '#f3d0ad', 0]]) }, sky);
  layers.push([sky, 0.08]);
  const hills = [
    [600, 70, 4, ['#8d8d98', '#77798a'], 0.22],
    [690, 80, 9, ['#5a6272', '#454d5d'], 0.45],
    [800, 70, 15, ['#2f3743', '#252c37'], 0.72],
    [925, 55, 23, ['#171d25', '#0f1318'], 1.0],
  ];
  for (const [y0, amp, seed, cols, k] of hills) {
    const g = S('g', {}, cam);
    S('path', { d: ridge(y0, amp, seed), fill: vgrad([[0, cols[0]], [1, cols[1]]]) }, g);
    layers.push([g, k]);
  }
  // «грейд»: затемнение к низу для читаемости титров (часть картинки, не украшение)
  S('rect', { x: 0, y: 560, width: W, height: H - 560, fill: vgrad([[0, '#05070a', 0], [1, '#05070a', 0.55]]) }, svg);
}
const ui = S('g', {}, svg);
let L = null;

function build() {
  const tw = (s, size, w) => textWidth(s, size, SANS, w);
  // (а) плашка
  const A_ = TITLES.a, aG = S('g', {}, ui);
  const aName = 58, aRole = 31, aPad = 40;
  const aW = Math.max(tw(A_.name, aName, 700), tw(A_.role, aRole, 500)) + 2 * aPad, aH = 158, aLineY = 952;
  const aClipG = S('g', {}, aG);
  const aClip = clipRect(defs, aClipG); aClip.set(LX - 4, aLineY - aH - 20, aW + 8, aH + 20);
  const aPlate = S('g', {}, aClipG);
  S('rect', { x: LX + 8, y: aLineY - aH + 8, width: aW, height: aH, fill: '#0b0e12', opacity: 0.35 }, aPlate);   // смещённая подложка-тень
  S('rect', { x: LX, y: aLineY - aH, width: aW, height: aH, fill: P.plate }, aPlate);
  const aN = S('text', { x: LX + aPad, y: aLineY - aH + 78, 'font-family': SANS, 'font-weight': 700, 'font-size': aName, fill: P.ink }, aPlate);
  aN.textContent = A_.name;
  const aR = S('text', { x: LX + aPad, y: aLineY - aH + 124, 'font-family': SANS, 'font-weight': 500, 'font-size': aRole, fill: P.inkMute }, aPlate);
  aR.textContent = A_.role;
  const aLine = drawStroke(aG, `M${LX} ${aLineY + 3}H${LX + aW}`, { stroke: P.accent, 'stroke-width': 6, 'stroke-linecap': 'butt' });

  // (б) kicker + линейка
  const B = TITLES.b, bG = S('g', {}, ui);
  const bTop = 790, bBot = 962, bX = LX + 32;
  const bBar = drawStroke(bG, `M${LX + 3} ${bTop}V${bBot}`, { stroke: P.accent, 'stroke-width': 6, 'stroke-linecap': 'butt' });
  const bClipG = S('g', {}, bG);
  const bClip = clipRect(defs, bClipG); bClip.set(LX + 10, bTop - 40, 1300, bBot - bTop + 80);
  const mk = (txt, y, size, weight, fill, extra = {}) => { const e = S('text', { x: bX, y, 'font-family': SANS, 'font-weight': weight, 'font-size': size, fill, ...extra }, bClipG); e.textContent = txt; return e; };
  const bK = mk(B.kicker, bTop + 24, 24, 700, P.accent, { 'letter-spacing': 5 });
  const bN = mk(B.name, bTop + 100, 68, 800, P.white);
  const bR = mk(B.role, bTop + 152, 31, 500, P.soft);

  // (в) минимал
  const C = TITLES.c, cG = S('g', {}, ui);
  const cSize = 46, cBase = 930, cLineY = 950;
  const cNW = tw(C.name, cSize, 700), cGap = 22;
  const cW = cNW + cGap + 10 + cGap + tw(C.role, cSize, 400);
  const cClipG = S('g', {}, cG);
  const cClip = clipRect(defs, cClipG); cClip.set(LX - 10, cBase - 80, cW + 40, cLineY - 6 - (cBase - 80));
  const cN = S('text', { x: LX, y: cBase, 'font-family': SANS, 'font-weight': 700, 'font-size': cSize, fill: P.white }, cClipG);
  cN.textContent = C.name;
  const cDot = S('circle', { cx: LX + cNW + cGap + 5, cy: cBase - cSize * 0.34, r: 5, fill: P.accent }, cClipG);
  const cR = S('text', { x: LX + cNW + 2 * cGap + 10, y: cBase, 'font-family': SANS, 'font-weight': 400, 'font-size': cSize, fill: P.soft }, cClipG);
  cR.textContent = C.role;
  const cLine = drawStroke(cG, `M${LX} ${cLineY}H${LX + cW}`, { stroke: P.white, 'stroke-width': 3, 'stroke-linecap': 'butt' });

  L = { aG, aPlate, aN, aR, aLine, aH, aW, bG, bBar, bK, bN, bR, cG, cN, cDot, cR, cLine, cW };
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const { aG, aPlate, aN, aR, aLine, aH, bG, bBar, bK, bN, bR, cG, cN, cDot, cR, cLine } = L;
  // камера: параллакс слоёв, периодичный дрейф
  const dr = loopDrift(t);
  layers.forEach(([g, k]) => A(g, 'transform', `translate(${f2(W / 2 + dr.x * k)} ${f2(H / 2 + dr.y * k)}) scale(${f2(1 + (dr.s - 1) * k)}) translate(${-W / 2} ${-H / 2})`));

  // (а) линия -> плашка из-под линии -> имя, должность; уход: текст, плашка вниз, линия
  {
    const on = t > T.aIn - 0.01 && t < T.aOut + 0.6;
    A(aG, 'display', on ? 'inline' : 'none');
    if (on) {
      const gP = outG(t, T.aOut, 0.26), gL = outG(t, T.aOut + 0.2, 0.2);
      const draw = prog(t, T.aIn, 0.42, ease.inOut);
      aLine.draw(draw); A(aLine, 'stroke-dashoffset', f2(gL > 0 ? -gL : 1 - draw));   // уход: линия «утекает» вправо
      if (gL >= 1) aLine.draw(0);
      const up = step(t - (T.aIn + 0.34), { r: 0.48, z: 0.92 });
      A(aPlate, 'transform', `translate(0 ${f2((1 - up) * (aH + 12) + gP * (aH + 12))})`);
      A(aPlate, 'visibility', up > 0.001 && gP < 1 ? 'visible' : 'hidden');
      rise(aN, vis(t, T.aIn + 0.48, Infinity, SP.fade), 18);   // уходит вместе с плашкой под линию
      rise(aR, vis(t, T.aIn + 0.56, Infinity, SP.fade), 14);
    }
  }
  // (б) линейка рисуется сверху вниз, строки выезжают из-за неё каскадом
  {
    const on = t > T.bIn - 0.01 && t < T.bOut + 0.6;
    A(bG, 'display', on ? 'inline' : 'none');
    if (on) {
      const gBar = outG(t, T.bOut + 0.16, 0.2);
      bBar.draw(prog(t, T.bIn, 0.32, ease.inOut));
      if (gBar > 0) A(bBar, 'stroke-dashoffset', f2(-gBar));                          // уход: стягивается вниз
      if (gBar >= 1) bBar.draw(0);
      [bK, bN, bR].forEach((e, i) => {
        const s = slideIn(t, T.bIn + 0.14 + i * 0.08, -70), g = outG(t, T.bOut + (2 - i) * 0.04, 0.2);
        A(e, 'transform', `translate(${f2(s.dx - 90 * g)} 0)`);
        show(e, s.o * (1 - g * g));
      });
    }
  }
  // (в) подчёркивание рисуется, текст поднимается из-под линии
  {
    const on = t > T.cIn - 0.01 && t < T.cOut + 0.6;
    A(cG, 'display', on ? 'inline' : 'none');
    if (on) {
      const gL = outG(t, T.cOut + 0.1, 0.22);
      cLine.draw(prog(t, T.cIn, 0.45, ease.inOut) * (1 - gL));                       // уход: сматывается обратно влево
      [cN, cDot, cR].forEach((e, i) => {
        const a = step(t - (T.cIn + 0.24 + i * 0.09), SP_IN), g = outG(t, T.cOut + i * 0.03, 0.2);
        A(e, 'transform', `translate(0 ${f2(70 * (1 - a) + 70 * g)})`);
        A(e, 'visibility', a > 0.002 && g < 1 ? 'visible' : 'hidden');
      });
    }
  }
}

// ------------------------------------------------------------------ звук
sfx(T.aIn + 0.2, 'whoosh', -16); sfx(T.bIn, 'whoosh', -16); sfx(T.bIn + 0.3, 'tick', -18); sfx(T.cIn, 'whoosh', -17); sfx(T.cOut, 'click', -18);

// ------------------------------------------------------------------ boot
window.DURATION = D;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, window.DURATION));
window.READY = (async () => { await loadFonts(); build(); frame(0); return true; })();
