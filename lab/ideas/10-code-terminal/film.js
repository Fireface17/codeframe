// Терминал -> плашка кода. Команда печатается с «человеческим» ритмом (hash01-джиттер, паузы
// после пробелов, «думание» перед Enter), лог идёт строками: шаг появляется с точкой-ожиданием и
// закрывается галочкой со временем; прогресс-бар доезжает до 100 % неровными порциями; финальная
// галочка с отскоком. Смена сцены без двойной экспозиции: окно уходит вверх, потом выезжает плашка
// и код печатается (codeScene), подсветка строк гасит остальное. Команда и код выдуманы.

const P = {
  paper: '#efede7', slabT: '#bff0c0', slabC: '#cdc0fa',
  term: '#0a0c10', bar: '#161b22', fg: '#f0f3f6', dim: '#9ea7b3', blue: '#71b7ff', green: '#26cd4d', yellow: '#f0b72f',
};
window.SAFE = { x0: 96, x1: W - 96, y0: 54, y1: H - 54 };
const MONO_F = '"JetBrains Mono", Menlo, monospace';
SP.rise = { r: 0.62, z: 0.8 };                                // въезд панели: ~1,5 % перелёта

// ------------------------------------------------------------------ раскладка терминала
const FS = 36, CWp = 0.6 * FS, LHp = 58;                     // кегль, ширина колонки, шаг строки
const COLS = 46;                                              // ширина содержимого в колонках
const TW = Math.round(COLS * CWp + 2 * 56), TH = 664;
const TX = Math.round(W / 2 - TW / 2), TY = Math.round(H / 2 - TH / 2) + 6;
const CX0 = TX + 56, ROW0 = TY + 56 + 78;                    // колонка 0 и базовая линия строки 0
const col = c => CX0 + c * CWp, row = r => ROW0 + r * LHp;

const PROMPT = '~/маяк $ ';
const CMD = 'kometa build --target web --minify';
const STEPS = [
  { text: 'конфиг прочитан', ms: '12 мс' },
  { text: 'модули разобраны: 148', ms: '312 мс' },
  { text: 'типы проверены', ms: '604 мс' },
  { text: 'ассеты сжаты: 3,1 → 0,9 МБ', ms: '211 мс' },
];

// ------------------------------------------------------------------ cues (с)
const T = {};
T.win = 0.12;                       // окно терминала
T.type0 = 0.62; T.type1 = 1.62;     // печать команды
T.enter = 1.9;                      // пауза «подумать» и Enter
T.head = T.enter + 0.08;            // заголовок лога
T.step = [0.16, 0.38, 0.67, 0.9].map(d => T.enter + d);      // строки появляются неровно
T.done = [0.11, 0.21, 0.24, 0.15].map((d, i) => T.step[i] + d);   // ... и закрываются галочкой
T.bar = T.enter + 1.12; T.barD = 1.25;                         // прогресс-бар
T.fin = T.bar + T.barD + 0.2;       // «Готово»
T.wout = 5.3;                       // окно уходит вверх (0,28 с)
T.card = T.wout + 0.3;              // плашка кода (окно уже за кадром)
T.ct0 = T.card + 0.16; T.ct1 = T.ct0 + 1.5;                    // печать кода
T.hl1 = T.ct1 + 0.18; T.hl2 = T.hl1 + 0.6;                     // подсветка строк
T.cout = T.hl2 + 0.5;               // плашка уходит вверх (к T.end − 0,16 кадр пуст)
T.end = 9.0;

// ------------------------------------------------------------------ помощники (локальные)
// текст в моноширинной сетке: <text> на колонке
function mono(parent, str, c, r, fill, attrs = {}) {
  const e = S('text', { x: col(c), y: row(r), fill, 'font-family': MONO_F, 'font-size': FS, style: 'white-space:pre', ...attrs }, parent);
  e.textContent = str;
  return e;
}
// галочка-штрих в клетке колонки c строки r
const checkD = (x, y, s) => `M${x} ${y}l${0.32 * s} ${0.34 * s}l${0.62 * s} ${-0.72 * s}`;
// прогресс «порциями»: n кусков случайного (hash01) размера в случайные моменты, каждый доезжает за 0,07 с
function chunkProgress(t, t0, d, n = 15, seed = 5) {
  const sz = [], at = [];
  let s = 0, a = 0;
  for (let i = 0; i < n; i++) { sz.push(0.3 + hash01(i, seed)); s += sz[i]; a += 0.4 + 1.2 * hash01(i, seed + 9); at.push(a); }
  let p = 0;
  for (let i = 0; i < n; i++) p += sz[i] / s * prog(t, t0 + d * (at[i] - at[0]) / (a - at[0] + 1e-9) * 0.95, 0.07, ease.out);
  return clamp(p);
}

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: P.paper }, svg);
const termG = S('g', {}, svg), cardG = S('g', {}, svg);
let B = null;

function build() {
  // окно терминала: смещённая подложка вместо тени, полоса заголовка
  S('rect', { x: TX + 18, y: TY + 18, width: TW, height: TH, rx: 22, fill: P.slabT }, termG);
  S('rect', { x: TX, y: TY, width: TW, height: TH, rx: 22, fill: P.term }, termG);
  S('path', { d: `M${TX} ${TY + 56}V${TY + 22}Q${TX} ${TY} ${TX + 22} ${TY}H${TX + TW - 22}Q${TX + TW} ${TY} ${TX + TW} ${TY + 22}V${TY + 56}Z`, fill: P.bar }, termG);
  [0, 1, 2].forEach(i => S('circle', { cx: TX + 32 + i * 26, cy: TY + 28, r: 8, fill: '#30363d' }, termG));
  const ttl = S('text', { x: TX + TW / 2, y: TY + 37, 'text-anchor': 'middle', 'font-family': 'Onest', 'font-weight': 500, 'font-size': 24, fill: P.dim }, termG);
  ttl.textContent = 'маяк — терминал';
  // строка 0: приглашение + команда (печатается)
  mono(termG, '~/маяк', 0, 0, P.blue); mono(termG, ' $', 6, 0, P.dim);
  const cmd = mono(termG, '', PROMPT.length, 0, P.fg);
  const caret = S('rect', { width: 0.55 * FS, height: 1.12 * FS, y: row(0) - 0.88 * FS, fill: P.fg, rx: 2 }, termG);
  const sched = typeSchedule(CMD, T.type0, T.type1, 7);       // из code.js: джиттер hash01 + паузы
  // строка 1: заголовок лога
  const head = S('g', {}, termG);
  mono(head, 'kometa 2.4 · сборка «маяк» для web', 0, 1, P.dim);
  // строки 2..5: шаги
  const steps = STEPS.map((s, i) => {
    const g = S('g', {}, termG), r = i + 2;
    const wait = mono(g, '·', 1, r, P.yellow);
    const ck = drawStroke(g, checkD(col(1) - 4, row(r) - 0.42 * FS, 0.62 * FS), { stroke: P.green, 'stroke-width': 4.5 });
    mono(g, s.text, 3, r, P.fg);
    const ms = mono(g, s.ms, COLS - s.ms.length, r, P.dim);
    return { g, wait, ck, ms };
  });
  // строка 6: прогресс-бар (дорожка, заливка, проценты)
  const barG = S('g', {}, termG), br = 6;
  mono(barG, 'упаковка', 3, br, P.fg);
  const bx = col(13), bw = col(COLS - 7) - bx, by = row(br) - 0.74 * FS, bh = 0.8 * FS;
  S('rect', { x: bx, y: by, width: bw, height: bh, rx: 6, fill: 'none', stroke: '#30363d', 'stroke-width': 2 }, barG);
  const fill = S('rect', { x: bx + 4, y: by + 4, height: bh - 8, width: 0, rx: 3, fill: P.green }, barG);
  const pct = mono(barG, '0 %', COLS - 5, br, P.fg, { 'text-anchor': 'end', x: col(COLS) });
  // строка 8: итог
  const finG = S('g', {}, termG), fr = 8;
  const finCk = S('g', {}, finG);
  const finCkPath = drawStroke(finCk, checkD(-0.42 * FS, -0.05 * FS, 0.8 * FS), { stroke: P.green, 'stroke-width': 6 });
  const finTxt = S('g', {}, finG);
  mono(finTxt, 'Готово за 1,4 с', 2, fr, P.green, { 'font-weight': 700 });
  mono(finTxt, '· dist/ 912 КБ', 18, fr, P.dim);
  // плашка кода
  const CD = window.CODE_DATA.bar, cs = 40, ccw = 0.6 * cs, maxLen = Math.max(...CD.lines.map(l => l.length));
  const CW_ = Math.round(maxLen * ccw + 2 * 64), CH_ = Math.round(64 + 40 + CD.lines.length * 1.5 * cs + 36);
  const KX = Math.round(W / 2 - CW_ / 2), KY = Math.round(H / 2 - CH_ / 2);
  S('rect', { x: KX + 18, y: KY + 18, width: CW_, height: CH_, rx: 22, fill: P.slabC }, cardG);
  S('rect', { x: KX, y: KY, width: CW_, height: CH_, rx: 22, fill: CD.bg }, cardG);
  S('path', { d: `M${KX} ${KY + 64}V${KY + 22}Q${KX} ${KY} ${KX + 22} ${KY}H${KX + CW_ - 22}Q${KX + CW_} ${KY} ${KX + CW_} ${KY + 22}V${KY + 64}Z`, fill: P.bar }, cardG);
  const fname = S('text', { x: KX + 40, y: KY + 42, 'font-family': MONO_F, 'font-size': 26, fill: P.dim }, cardG);
  fname.textContent = 'progress/bar.js';
  const code = codeScene(cardG, {
    from: CD, x0: KX + 64, y0: KY + 64 + 40 + 0.85 * cs, size: cs,
    type: { t0: T.ct0, t1: T.ct1, seed: 4 },
    hl: [{ line: 2, t0: T.hl1, t1: T.hl2 }, { line: 4, t0: T.hl2, t1: T.cout + 1 }], dim: 0.32,
  });
  B = { cmd, caret, sched, head, steps, barG, fill, bw, pct, finG, finCk, finCkPath, finTxt, code, KX, KY, CW_, CH_ };
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  // окно: въезжает снизу пружиной, уходит вверх за кадр power4.in — без прозрачности:
  // тёмная панель на светлой бумаге при растворении стала бы серой
  const wi = after(t, T.win, SP.rise), wo = ease.in4((t - T.wout) / 0.3);
  const push = 1 + 0.02 * prog(t, T.win + 0.4, T.wout - T.win - 0.4, ease.sine);     // медленный наезд на удержании
  popAt(termG, W / 2, H / 2, push, t >= T.win && wo < 1 ? 1 : 0, (1 - wi) * 820 - 1000 * wo);

  // команда: печать по расписанию, каретка мигает до печати и после, исчезает на Enter
  const n = typeCount(B.sched, t);
  setText(B.cmd, CMD.slice(0, n));
  const tLast = n > 0 ? B.sched[n - 1] : T.win;
  const co = t < T.enter ? (n > 0 && n < CMD.length ? 1 : caretBlink(t, n ? tLast : T.win + 0.1)) : 0;
  A(B.caret, 'x', f2(col(PROMPT.length + n))); A(B.caret, 'opacity', f2(co)); A(B.caret, 'visibility', co > 0.01 ? 'visible' : 'hidden');

  // лог: строки появляются почти мгновенно (как в терминале), шаг закрывается галочкой
  rise(B.head, prog(t, T.head, 0.08, ease.out), 6);
  B.steps.forEach((s, i) => {
    rise(s.g, prog(t, T.step[i], 0.08, ease.out), 6);
    const d = t >= T.done[i];
    A(s.wait, 'visibility', d ? 'hidden' : 'visible');
    s.ck.draw(prog(t, T.done[i], 0.12, ease.out));
    show(s.ms, prog(t, T.done[i] + 0.04, 0.08, ease.out));
  });
  rise(B.barG, prog(t, T.bar - 0.08, 0.08, ease.out), 6);
  const p = chunkProgress(t, T.bar, T.barD);
  A(B.fill, 'width', f2(Math.max(0, (B.bw - 8) * p)));
  A(B.fill, 'visibility', p > 0.002 ? 'visible' : 'hidden');
  setText(B.pct, `${Math.round(p * 100)} %`);
  // итог: галочка с отскоком, текст следом
  const fs = t < T.fin ? 0 : lerp(0.4, 1, step(t - T.fin, SP.hop));
  place(B.finCk, col(0.6), row(8) - 0.3 * FS, fs, popO(t, T.fin));
  B.finCkPath.draw(prog(t, T.fin, 0.16, ease.out));
  rise(B.finTxt, prog(t, T.fin + 0.08, 0.14, ease.out), 8);

  // плашка кода: выезжает снизу после ухода окна (без наложения), печатается, подсветка, уход вверх
  const ci = after(t, T.card, SP.rise), co2 = ease.in4((t - T.cout) / 0.3);
  const push2 = 1 + 0.02 * prog(t, T.card + 0.4, T.cout - T.card - 0.4, ease.sine);
  popAt(cardG, W / 2, H / 2, push2, t >= T.card && co2 < 1 ? 1 : 0, (1 - ci) * 820 - 1000 * co2);
  B.code.seek(t);
}

// ------------------------------------------------------------------ звук
sfx(T.win, 'pop', -12);
sfx(T.enter, 'click', -8);
sfx(T.fin, 'ding', -9);
sfx(T.wout, 'whoosh', -13);
sfx(T.card, 'pop', -12);
sfx(T.hl1, 'tick', -12);
sfx(T.cout, 'whoosh', -14);

// ------------------------------------------------------------------ boot
window.DURATION = Math.round(T.end * FPS) / FPS;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, window.DURATION));
window.READY = (async () => { await loadFonts(); build(); frame(0); return true; })();
