// Три цифры подряд (выдуманный видеоредактор «Кадрово», итоги года):
//   1) счётчик 0 -> 87 % и кольцо прогресса, которое рисуется тем же easing, что и число;
//   2) «барабан»: каждый разряд прокручивается столбиком цифр в окне с мягкой маской,
//      правые разряды делают больше оборотов и приземляются позже (каскад слева направо);
//   3) счётчик с дробью ×1,0 -> ×3,5, удар масштабом на приземлении и рисующееся подчёркивание.
// Подписи всегда появляются после числа. Сцены сменяются «уход -> вход», в конце пустой кадр (петля).
// Цифры согласованы: 248 615 роликов за год, 87 % досмотров, монтаж в 3,5 раза быстрее ручного.

const P = {
  bg: '#f1ede4', ink: '#17171c', muted: '#8b877e', track: '#e2dccf', cell: '#e7e1d4', cellEdge: '#d6cfbf',
  c1: '#ff5a36', c2: '#2f55d4', c3: '#1f8f5f',
};
window.SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 };
const CX = 450;                     // общая ось: подписи уходят ниже y 840, там правый край зоны 780
const NUM = 'Unbounded', UI = 'Onest';

// ------------------------------------------------------------------ cues (с)
const T = {};
T.head = 0.15;
T.s1 = 0.3; T.c1 = 0.45; T.c1d = 1.15; T.l1 = 1.3; T.o1 = 2.25;
T.s2 = 2.68; T.roll = 2.75; T.l2 = 4.2; T.o2 = 5.2;    // новая сцена — когда старая целиком ушла
T.s3 = 5.6; T.c3 = 5.67; T.c3d = 0.8; T.punch = T.c3 + 0.65; T.l3 = T.punch + 0.05;
T.end = 8.0;
T.clear = T.end - 0.45;
const D = Math.round(T.end * FPS) / FPS;

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: P.bg }, svg);
const stage = S('g', {}, svg);
let L = null;

const label = (parent, lines, y, color = P.ink) => lines.map((s, i) => {
  const g = S('g', {}, parent), e = S('text', { x: CX, y: y + i * 58, 'text-anchor': 'middle', 'font-family': UI, 'font-weight': 600, 'font-size': 46, fill: color }, g);
  e.textContent = s; return g;
});

function build() {
  // шапка: продукт и период — держится весь ролик
  const head = S('g', {}, stage);
  S('circle', { cx: 136, cy: 318, r: 14, fill: P.c1 }, head);
  const ht = S('text', { x: 162, y: 330, 'font-family': UI, 'font-weight': 700, 'font-size': 36, fill: P.ink }, head); ht.textContent = 'Кадрово';
  const hs = S('text', { x: 162 + textWidth('Кадрово', 36, UI, 700) + 14, y: 330, 'font-family': UI, 'font-weight': 500, 'font-size': 36, fill: P.muted }, head); hs.textContent = '· итоги года';

  // 1 — кольцо + проценты
  const s1 = sceneG(stage), R = 240, cy1 = 700;
  const ring = S('g', {}, s1);
  S('circle', { cx: CX, cy: cy1, r: R, fill: 'none', stroke: P.track, 'stroke-width': 34 }, ring);
  const arc = drawStroke(ring, arcD(CX, cy1, R, 0, 359.9), { stroke: P.c1, 'stroke-width': 34 });
  const n1 = S('g', {}, s1), nSize = 168, pSize = 84;
  const w87 = textWidth('87', nSize, NUM, 900), wp = textWidth('%', pSize, NUM, 700), gap = 12;
  const xr = CX - (w87 + gap + wp) / 2 + w87;            // правый край числа: растёт влево, «%» не прыгает
  const num1 = S('text', { x: f2(xr), y: cy1 + 0.36 * nSize, 'text-anchor': 'end', 'font-family': NUM, 'font-weight': 900, 'font-size': nSize, fill: P.ink }, n1);
  const pc = S('text', { x: f2(xr + gap), y: cy1 + 0.36 * nSize, 'font-family': NUM, 'font-weight': 700, 'font-size': pSize, fill: P.c1 }, n1); pc.textContent = '%';
  const lab1 = label(s1, ['зрителей досматривают', 'ролики до конца'], 1062);

  // 2 — барабан: столбики цифр в окнах-ячейках, маска с мягкими краями
  const s2 = sceneG(stage), VAL = '248 615', cy2 = 700, OF = 'Rubik';   // барабан — узкий Rubik: цифры крупнее
  const digU = Math.max(...'0123456789'.split('').map(d => textWidth(d, 100, OF, 900))) / 100;
  const nd = VAL.replace(/\s/g, '').length, ng = VAL.split(' ').length - 1;
  const size2 = Math.min(190, 650 / ((digU + 0.09) * nd + 0.22 * ng)), cw = digU * size2, pitch = cw + 0.09 * size2, sgap = 0.22 * size2;
  const totalW = pitch * nd - 0.09 * size2 + sgap * ng;
  // окно = ячейка: цифра в покое занимает его середину, соседние цифры (шаг rowH) целиком за краем
  const base2 = cy2 + 0.36 * size2, winTop = base2 - 1.0 * size2, winH = 1.3 * size2, rowH = 1.1 * size2;
  const cellsG = S('g', {}, s2), digitsG = S('g', {}, s2);
  const mid = 'odoMask', mask = S('mask', { id: mid, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
  const mfill = linGrad(defs, [[0, '#fff', 0], [0.18, '#fff', 1], [0.82, '#fff', 1], [1, '#fff', 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  S('rect', { x: 0, y: winTop, width: W, height: winH, fill: mfill }, mask);
  const cfill = linGrad(defs, [[0, P.cellEdge], [0.28, P.cell], [0.72, P.cell], [1, P.cellEdge]], { x1: 0, y1: 0, x2: 0, y2: 1 });   // ячейка-цилиндр
  A(digitsG, 'mask', `url(#${mid})`);
  const cols = [];
  let x = CX - totalW / 2, k = 0;
  for (const ch of VAL) {
    if (ch === ' ') { x += sgap; continue; }
    const cell = S('rect', { x: f2(x - 0.035 * size2), y: f2(winTop), width: f2(cw + 0.07 * size2), height: f2(winH), rx: 16, fill: cfill }, cellsG);
    const slots = [-1, 0, 1].map(() => S('text', { x: f2(x + cw / 2), 'text-anchor': 'middle', 'font-family': OF, 'font-weight': 900, 'font-size': f2(size2), fill: P.ink }, digitsG));
    cols.push({ d: +ch, k, slots, cell, turns: 1 + Math.round(0.7 * k), t0: T.roll + 0.05 * k });
    x += pitch; k++;
  }
  const lab2 = label(s2, ['роликов смонтировано', 'за этот год'], 1062);
  const rule2 = S('rect', { x: CX - totalW / 2, y: winTop + winH + 26, width: totalW, height: 8, rx: 4, fill: P.c2 }, s2);

  // 3 — ×3,5 с ударом и подчёркиванием
  const s3 = sceneG(stage), size3 = 230, cy3 = 700, n3 = S('g', {}, s3);
  const wx = textWidth('×', size3 * 0.62, NUM, 700), w35 = textWidth('3,5', size3, NUM, 900), g3 = 18;
  const x3 = CX - (wx + g3 + w35) / 2;
  const times = S('text', { x: f2(x3), y: cy3 + 0.36 * size3, 'font-family': NUM, 'font-weight': 700, 'font-size': size3 * 0.62, fill: P.c3 }, n3); times.textContent = '×';
  const num3 = S('text', { x: f2(x3 + wx + g3), y: cy3 + 0.36 * size3, 'font-family': NUM, 'font-weight': 900, 'font-size': size3, fill: P.ink }, n3);
  const ul = drawStroke(s3, roughD(`M${x3 + wx + g3} ${cy3 + 0.36 * size3 + 46} C ${CX} ${cy3 + 0.36 * size3 + 34} ${CX + 120} ${cy3 + 0.36 * size3 + 40} ${x3 + wx + g3 + w35} ${cy3 + 0.36 * size3 + 30}`, { seed: 9, roughness: 0.6, disableMultiStroke: true }), { stroke: P.c3, 'stroke-width': 14 });
  const lab3 = label(s3, ['быстрее, чем', 'монтаж вручную'], 1062);

  L = { head, s1, ring, arc, n1, num1, lab1, cy1, s2, cols, cellsG, lab2, rule2, rw: totalW, base2, rowH, cy2, s3, n3, num3, ul, lab3, cy3 };
}

// ------------------------------------------------------------------ frame(t)
// уход: вверх + исчезновение + чуть меньше, power4.in, со сдвигом между частями
const leave = (t, t0, i = 0) => ease.in4((t - t0 - i * 0.05) / 0.28);
function labels(t, ls, t0, tout) {
  ls.forEach((g, i) => { const a = t < t0 + i * 0.08 ? 0 : step(t - t0 - i * 0.08, SP.fade), o = leave(t, tout, 1 + i); rise(g, a * (1 - o), 16); if (o > 0) A(g, 'transform', `translate(0 ${f2(-40 * o)})`); });
}

function frame(t) {
  const { head, s1, ring, arc, n1, num1, lab1, cy1, s2, cols, cellsG, lab2, rule2, rw, base2, rowH, cy2, s3, n3, num3, ul, lab3, cy3 } = L;
  const ho = leave(t, T.clear, 3);
  rise(head, (t < T.head ? 0 : step(t - T.head, SP.fade)) * (1 - ho), 12);

  // 1 — кольцо и число на одном easing: дуга «ведёт» цифру
  const on1 = t >= T.s1 && t < T.o1 + 0.5; s1.on(on1);
  if (on1) {
    const a = popS(t, T.s1, SP.popS), o = leave(t, T.o1, 0);
    popAt(ring, CX, cy1, lerp(0.85, 1, (a - 0.35) / 0.65) * (1 - 0.08 * o), popO(t, T.s1) * (1 - o), -40 * o);
    const v = countTo(t, T.c1, T.c1d, 0, 87);
    arc.draw(v / 100);
    setText(num1, fmtNum(Math.round(v)));
    const ni = t < T.s1 + 0.08 ? 0 : step(t - T.s1 - 0.08, SP.fade), no = leave(t, T.o1, 1);
    popAt(n1, CX, cy1, 1 - 0.08 * no, ni * (1 - no), (1 - ni) * 20 - 40 * no);
    labels(t, lab1, T.l1, T.o1);
  }

  // 2 — барабан
  const on2 = t >= T.s2 && t < T.o2 + 0.5; s2.on(on2);
  if (on2) {
    const ci = t < T.s2 ? 0 : step(t - T.s2, SP.fade), co = leave(t, T.o2, 0);
    A(s2, 'opacity', f2(1 - co)); A(s2, 'transform', `translate(0 ${f2(-40 * co)})`);
    cols.forEach(c => {
      const cin = t < T.s2 + 0.04 * c.k ? 0 : step(t - T.s2 - 0.04 * c.k, SP.fade);
      rise(c.cell, cin, 18);
      // позиция столбика: целое число оборотов + цифра; z 0,86 — перелёт ~0,5 %, т. е. четверть цифры на длинном пробеге
      const p = (c.turns * 10 + c.d) * step(t - c.t0, { r: 0.9 + 0.025 * c.k, z: 0.86 }), fl = Math.floor(p), fr = p - fl;
      c.slots.forEach((e, j) => {
        const n = fl + j;                                      // j = -1, 0, 1: предыдущая, текущая, следующая
        setText(e, String(((n % 10) + 10) % 10));
        A(e, 'y', f2(base2 + (j - fr) * rowH + (1 - cin) * 18));
        A(e, 'opacity', f2(cin));
      });
    });
    const lastLand = cols[cols.length - 1].t0 + 0.9;
    A(rule2, 'width', f2(rw * prog(t, lastLand - 0.2, 0.4, ease.out)));   // линейка дорисовывается, когда барабан встал
    labels(t, lab2, T.l2, T.o2);
  }

  // 3 — ×3,5: удар на приземлении, подчёркивание рисуется
  const on3 = t >= T.s3 && t < T.clear + 0.5; s3.on(on3);
  if (on3) {
    const v = countTo(t, T.c3, T.c3d, 1, 3.5);
    setText(num3, fmtNum(Math.round(v * 10) / 10, 1));   // к удару число уже 3,5
    const ni = t < T.s3 ? 0 : step(t - T.s3, SP.pop), no = leave(t, T.clear, 0);
    const u = clamp((t - T.punch) / 0.3), punch = u > 0 && u < 1 ? 0.09 * Math.sin(Math.PI * u) * (1 - 0.4 * u) : 0;
    popAt(n3, CX, cy3, (lerp(0.6, 1, ni) + punch) * (1 - 0.08 * no), (t < T.s3 ? 0 : step(t - T.s3, SP.out)) * (1 - no), -40 * no);
    ul.draw(prog(t, T.punch - 0.05, 0.35, ease.inOut));
    show(ul, 1 - leave(t, T.clear, 1));
    labels(t, lab3, T.l3, T.clear);
  }
}

// ------------------------------------------------------------------ звук
sfx(T.c1, 'whoosh', -15); sfx(T.c1 + 0.9, 'ding', -12);
sfx(T.roll + 0.85, 'tick', -10);
sfx(T.punch, 'pop', -7); sfx(T.clear, 'whoosh', -15);

// ------------------------------------------------------------------ boot
window.DURATION = D;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, D));
window.READY = (async () => {
  await loadFonts(); build();
  frame(0); return true;
})();
