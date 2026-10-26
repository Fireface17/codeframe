// Расшифровка заголовка: строка-моноширинка проступает из шума слева направо. Каждая буква
// перебирает символы (кириллица, цифры, знаки — по hash01) ступенькой раз в 2–3 кадра и
// фиксируется со вспышкой акцента; линейка сверху работает как индикатор прогресса.
// Потом вторая строка печатается с кареткой, маркер прорисовывается за ключевыми словами
// (текст под маркером инвертируется клипом). Уход — обратная «шифровка» в пустой кадр (петля).
//
// Приёмы для повторного использования:
//   frameNo(t)            — дискретные состояния (глиф, фиксация, мигание) считаем по номеру
//                           кадра: подкадры motion blur одного кадра видят одно и то же состояние,
//                           иначе блюр смешивает два глифа в «кашу»;
//   scrambleGlyph(i, t)   — символ-шум ячейки i: своя фаза и свой шаг (2 или 3 кадра), чтобы
//                           ячейки не менялись хором;
//   typeTimes(str)     — моменты появления символов с «человеческим» ритмом.

const P = { bg: '#0f1215', dot: '#1d2329', ink: '#ece8de', dim: '#4f5964', mute: '#8b939c', line2: '#c3c6c9', accent: '#e2a64b', onAccent: '#17130b' };
window.SAFE = { x0: 96, x1: 1824, y0: 54, y1: 1026 };

const LINE1 = 'ИЗ ШУМА — В СМЫСЛ';
const LINE2 = 'Сырые логи превращаются в ясные решения';
const KEY = 'ясные решения';
const LABEL = 'ДЕШИФРОВКА';
const POOL = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯ0123456789#%&*+=<>/?§';
const FMONO = 'JetBrains Mono', SANS = 'Onest';
const S1 = 136, S2 = 54;

// ------------------------------------------------------------------ дискретное время
const frameNo = t => Math.round(t * FPS);                 // один номер на все подкадры кадра
const tq = t => frameNo(t) / FPS;                          // время, «защёлкнутое» на кадр
function scrambleGlyph(i, t, seed = 13) {
  const per = 2 + (hash01(i, 3) < 0.5 ? 1 : 0);            // шаг смены: 2 или 3 кадра
  const k = Math.floor((frameNo(t) + Math.floor(hash01(i, 5) * per)) / per);
  return POOL[Math.floor(hash01(i * 7919 + k, seed) * POOL.length)];
}
// печать: момент появления каждого символа (паузы после пробела, лёгкий джиттер)
function typeTimes(str, t0, base = 0.016, jit = 0.022, space = 0.045, seed = 21) {
  const ts = [t0];
  for (let n = 1; n < str.length; n++) ts.push(ts[n - 1] + base + jit * hash01(n, seed) + (str[n - 1] === ' ' ? space : 0));
  return ts;
}
const typedCount = (ts, t) => { let n = 0; while (n < ts.length && t >= ts[n]) n++; return n; };

// ------------------------------------------------------------------ cues (с)
const T = {};
T.hud = 0.2;               // подпись и линейка
T.slots = 0.3;             // подчёркивания-ячейки
T.scr = 0.45;              // шум во всех ячейках
T.lock = 0.95;             // первая буква фиксируется
T.lockStep = 0.07;
T.done = T.lock + (LINE1.length - 1) * T.lockStep + 0.03;
T.type = T.done + 0.2;     // вторая строка печатается
T.mark = 0;                // считается после расписания печати
T.out = 5.4;               // уход
T.end = 6.2;

const lockAt = i => T.lock + i * T.lockStep + (hash01(i, 7) - 0.5) * 0.04;
const scrAt = i => T.scr + i * 0.022;
const slotAt = i => T.slots + i * 0.018;
const outAt = i => T.out + 0.08 + i * 0.016;
const TYPE = typeTimes(LINE2, T.type);
T.typed = TYPE[TYPE.length - 1];
T.mark = T.typed + 0.12;

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: P.bg }, svg);
// точечная сетка паттерном (один элемент) + мягкая виньетка radGrad
const pat = S('pattern', { id: 'dots', width: 48, height: 48, patternUnits: 'userSpaceOnUse' }, defs);
S('circle', { cx: 24, cy: 24, r: 1.4, fill: P.dot }, pat);
S('rect', { width: W, height: H, fill: 'url(#dots)' }, svg);
S('rect', { width: W, height: H, fill: radGrad(defs, [[0.55, P.bg, 0], [1, '#07090b', 0.75]], { r: 0.75 }) }, svg);
const stage = S('g', {}, svg);
let L = null;

function build() {
  const cw = textWidth('Ш', S1, FMONO, 700);                // моноширинка: ширина ячейки
  const w1 = cw * LINE1.length, x0 = Math.round((W - w1) / 2), x1 = x0 + w1;
  const cy = H / 2;
  const yRule = cy - 120, yLabel = yRule - 20, y1 = yRule + 44 + 0.73 * S1, y2 = y1 + 132;

  // шапка: подпись, процент, линейка-прогресс
  const label = S('text', { x: x0, y: yLabel, 'font-family': FMONO, 'font-weight': 700, 'font-size': 22, 'letter-spacing': 5, fill: P.mute }, stage);
  label.textContent = LABEL;
  const pct = S('text', { x: x1, y: yLabel, 'font-family': FMONO, 'font-weight': 700, 'font-size': 22, 'text-anchor': 'end', fill: P.accent }, stage);
  const rule = drawStroke(stage, `M${x0} ${yRule}H${x1}`, { stroke: P.dim, 'stroke-width': 2, 'stroke-linecap': 'butt' });
  const bar = S('rect', { x: x0, y: yRule - 2, height: 4, width: 0, fill: P.accent }, stage);

  // строка 1: ячейка = своё <text> + подчёркивание
  const cells = [...LINE1].map((c, i) => {
    const g = S('g', {}, stage);
    const slot = S('rect', { x: x0 + i * cw + cw * 0.12, y: y1 + 0.16 * S1, width: cw * 0.76, height: 4, fill: P.dim }, g);
    const te = S('text', { x: x0 + i * cw + cw / 2, y: y1, 'text-anchor': 'middle', 'font-family': FMONO, 'font-weight': 700, 'font-size': S1, fill: P.ink }, g);
    return { c, g, slot, te, i, space: c === ' ' };
  });

  // строка 2: печать, каретка, маркер с инверсией текста под ним
  const g2 = S('g', {}, stage);
  const t2 = S('text', { x: x0, y: y2, 'font-family': SANS, 'font-weight': 500, 'font-size': S2, fill: P.line2 }, g2);
  const pre = [...Array(LINE2.length + 1)].map((_, n) => textWidth(LINE2.slice(0, n), S2, SANS, 500));
  const k0 = LINE2.indexOf(KEY), mx0 = x0 + pre[k0] - 3, mx1 = x0 + pre[k0 + KEY.length] + 7;
  const my = y2 - 0.8 * S2, mh = 1.06 * S2;
  const marker = S('rect', { x: mx0, y: my, height: mh, width: 0, fill: P.accent }, g2);
  const inv = S('text', { x: x0, y: y2, 'font-family': SANS, 'font-weight': 500, 'font-size': S2, fill: P.onAccent }, g2);
  inv.textContent = LINE2;
  const invClip = clipRect(defs, inv);
  const caret = S('rect', { y: y2 - 0.78 * S2, width: 4, height: 0.96 * S2, fill: P.accent }, g2);

  L = { cw, x0, x1, y1, y2, yRule, label, pct, rule, bar, cells, g2, t2, pre, marker, inv, invClip, caret, mx0, mx1, my, mh };
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const { x0, x1, label, pct, rule, bar, cells, g2, t2, pre, marker, invClip, caret, mx0, mx1, my, mh } = L;
  const cx = W / 2, cy = H / 2, cs = 1 + 0.025 * prog(t, 0, T.end, ease.sine);
  A(stage, 'transform', `translate(${f2(cx)} ${f2(cy)}) scale(${f2(cs)}) translate(${f2(-cx)} ${f2(-cy)})`);
  const q = tq(t);

  // шапка: линейка рисуется, подпись проявляется, процент = доля зафиксированных букв
  const gOut = ease.in4((t - T.out) / 0.3);
  rule.draw(prog(t, T.hud, 0.95, ease.inOut) * (1 - gOut));
  rise(label, vis(t, T.hud + 0.1, T.out, SP.fade, SP.out), 10);
  const letters = cells.filter(c => !c.space), nLocked = letters.filter(c => q >= lockAt(c.i)).length;
  setText(pct, `${String(Math.round(100 * nLocked / letters.length)).padStart(3, ' ')} %`);
  show(pct, vis(t, T.hud + 0.2, T.out, SP.fade, SP.out));
  const pr = clamp((t - T.lock) / (T.done - T.lock));
  A(bar, 'width', f2((x1 - x0) * ease.out(pr) * (1 - gOut)));
  A(bar, 'x', f2(x0 + (x1 - x0) * ease.out(pr) * gOut));
  A(bar, 'visibility', pr > 0 && gOut < 1 ? 'visible' : 'hidden');

  // строка 1: ячейка -> шум -> фиксация -> (уход) шум -> пусто
  for (const c of cells) {
    if (c.space) { show(c.g, 0); continue; }
    const s0 = scrAt(c.i), l0 = lockAt(c.i), o0 = outAt(c.i);
    const locked = q >= l0 && q < o0, noisy = (q >= s0 && q < l0) || (q >= o0 && q < o0 + 0.12);
    show(c.slot, vis(t, slotAt(c.i), l0, SP.fade, SP.out) * 0.9);
    A(c.slot, 'fill', q >= s0 && q < l0 && q >= l0 - T.lockStep * 2 ? P.mute : P.dim);
    if (locked) {
      setText(c.te, c.c);
      A(c.te, 'fill', mix(P.accent, P.ink, prog(t, l0, 0.32, ease.out)));
      show(c.te, 1);
    } else if (noisy) {
      setText(c.te, scrambleGlyph(c.i, t));
      A(c.te, 'fill', (q < l0 && q >= l0 - 0.18) || hash01(c.i * 31 + Math.floor(frameNo(t) / 3), 9) < 0.12 ? P.mute : P.dim);   // у фронта фиксации шум светлее
      show(c.te, q >= o0 ? 1 - prog(t, o0, 0.12, ease.in4) : prog(t, s0, 0.08, ease.out));
    } else show(c.te, 0);
    show(c.g, 1);
  }

  // строка 2: печать с кареткой
  const n = typedCount(TYPE, q);
  setText(t2, LINE2.slice(0, n));
  const typing = q >= T.type - 0.25 && q < T.typed + 0.05;
  const blinkOn = typing || ((q - T.typed) % 1.0 + 1.0) % 1.0 < 0.55;
  A(caret, 'x', f2(x0 + pre[n] + 5));
  show(caret, q >= T.type - 0.25 && q < T.out ? (blinkOn ? 1 : 0) : 0);
  // маркер за ключевыми словами + инвертированный текст в его клипе
  const m = prog(t, T.mark, 0.4, ease.inOut), mw = (mx1 - mx0) * m;
  A(marker, 'width', f2(mw)); A(marker, 'visibility', mw > 0.5 ? 'visible' : 'hidden');
  invClip.set(mx0, my, mw, mh);
  A(g2, 'transform', `translate(0 ${f2(-28 * gOut)})`); show(g2, 1 - gOut);
}

// ------------------------------------------------------------------ звук
sfx(T.scr, 'tick', -16); sfx(T.done - 0.03, 'click', -8); sfx(T.type, 'tick', -18); sfx(T.mark, 'scribble', -14); sfx(T.out, 'whoosh', -14);

// ------------------------------------------------------------------ boot
window.DURATION = Math.round(T.end * FPS) / FPS;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, window.DURATION));
window.READY = (async () => { await loadFonts(); build(); frame(0); return true; })();
