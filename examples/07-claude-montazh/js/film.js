// №7 «Его смонтировал Claude», v2 — детальная версия по образцу рилса winkguys (структура и приёмы — их,
// текст и графика — наши, кодом). Горизонталь 1920×1200 под экран MacBook: ролик включают на ноутбуке и
// снимают на телефон. Кадр — функция t; все cues — от слов голоса (window.WORDS).
// Слой интерфейса камеры (уголки, «● CLAUDE — СДЕЛАНО КОДОМ», номер сцены, REC-таймкод) лежит поверх всех сцен.

const P = {
  navy: '#0B1220', navy2: '#141D33', red: '#E4261C', blue: '#2B3CFF', light2: '#CBD6E2',
  ink: '#0E1424', white: '#FFFFFF', grey: '#9AA6B6', grey2: '#5B6678', code: '#0D1424',
  peach: '#F6B38E', pink: '#FF5FA2', violet: '#7B4FD6', violet2: '#5634A8', gold: '#F4A340', cyan: '#5EE0FF',
};
window.SAFE = { x0: 60, x1: W - 60, y0: 40, y1: H - 40 };
const F = { con: 'Oswald', ser: 'Playfair', mono: 'JetBrains Mono', body: 'Onest' };
const CX = W / 2, CY = H / 2;

// ------------------------------------------------------------------ cues
function pw(i, text, n = 1) {
  const ph = phrase(i), key = _norm(text);
  let k = 0;
  for (const w of window.WORDS.words) {
    if (w.start < ph.start - 0.01 || w.start > ph.end + 0.01) continue;
    if (_norm(w.w).startsWith(key) && ++k === n) return w.start;
  }
  console.warn('cue: нет слова', text, 'во фразе', i);
  return ph.start;
}
const T = {};
T.open = phrase(1).start - 0.04;
T.end = window.WORDS.duration + 0.6;
const DURATION = Math.round(T.end * FPS) / FPS;

// сцены = группы фраз; внутри сцены — свои биты и переходы
const GROUPS = [[1], [2], [3, 4], [5], [6], [7, 8], [9], [10], [11], [12], [13]];
const LABELS = ['КИНЕТИКА / ШРИФТ', 'КИНЕТИКА / ШРИФТ', 'ДАННЫЕ / ВРЕМЯ', 'КИНЕТИКА / РИТМ', 'ИНТЕРФЕЙС / ИДЕЯ', 'ГЕНЕРАТИВ / ЧАСТИЦЫ', 'ДАННЫЕ / ЦЕНА',
  'ДАННЫЕ / ЦЕНА', 'ФОРМА / МОРФ', '3D / РЕНДЕР', 'КОД / ЦВЕТ', 'ПРИЗЫВ'];

// ------------------------------------------------------------------ svg skeleton
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
{
  const glow = S('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  S('feGaussianBlur', { stdDeviation: 10, result: 'b' }, glow);
  const m = S('feMerge', {}, glow); S('feMergeNode', { in: 'b' }, m); S('feMergeNode', { in: 'SourceGraphic' }, m);
  const lg = S('radialGradient', { id: 'lightbg', cx: '50%', cy: '40%', r: '75%' }, defs);
  S('stop', { offset: '0', 'stop-color': '#F4F7FA' }, lg); S('stop', { offset: '1', 'stop-color': '#C9D4E0' }, lg);
  const dg = S('radialGradient', { id: 'darkbg', cx: '50%', cy: '45%', r: '80%' }, defs);
  S('stop', { offset: '0', 'stop-color': '#16213A' }, dg); S('stop', { offset: '1', 'stop-color': '#070B14' }, dg);
  const vg = S('linearGradient', { id: 'voxbg', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  S('stop', { offset: '0', 'stop-color': '#2B1F5C' }, vg); S('stop', { offset: '1', 'stop-color': '#4A2C8F' }, vg);
  const pg = S('radialGradient', { id: 'planet', cx: '35%', cy: '30%', r: '70%' }, defs);
  S('stop', { offset: '0', 'stop-color': '#BFF4FF' }, pg); S('stop', { offset: '0.5', 'stop-color': '#3BA7FF' }, pg); S('stop', { offset: '1', 'stop-color': '#1A3C9E' }, pg);
}
function blurFilter(id) {
  const f = S('filter', { id, x: '-30%', y: '-60%', width: '160%', height: '220%' }, defs);
  const gb = S('feGaussianBlur', { stdDeviation: '0 0' }, f);
  return v => A(gb, 'stdDeviation', `${f2(v)} ${f2(v * 0.35)}`);
}
svg.style.position = 'relative'; svg.style.zIndex = 1;
let glReq = null;   // какую 3D-сцену рисует кадр
const world = S('g', {}, svg);   // все сцены
const hud = S('g', {}, svg);     // интерфейс камеры поверх

// ------------------------------------------------------------------ helpers
function tx(parent, str, o = {}) {
  const e = S('text', {
    x: o.x ?? 0, y: o.y ?? 0, 'font-family': o.f || F.con, 'font-size': o.s || 100, 'font-weight': o.w || 700,
    fill: o.fill || P.ink, 'text-anchor': o.a || 'middle', 'dominant-baseline': 'central',
    'letter-spacing': o.ls ?? 0, ...(o.f === F.ser ? { 'font-style': 'italic', 'font-weight': 500 } : {}), ...(o.attrs || {}),
  }, parent);
  e.textContent = str;
  return e;
}
// поп-элемент: пружина масштаба + подъём; t1 — уход
function popper(g, cx, cy, t0, o = {}) {
  return t => {
    if (t < t0) { show(g, 0); return; }
    const k = step(t - t0, o.sp || SP.pop);
    let op = step(t - t0, SP.out);
    if (o.t1 != null && t >= o.t1) op *= 1 - prog(t, o.t1, 0.16, ease.in4);
    popAt(g, cx, cy, lerp(o.from ?? 0.4, 1, k), op, (1 - Math.min(1, k)) * (o.dy ?? 26));
  };
}
// буквы падают сверху по одной
function dropWord(parent, str, x, y, o = {}) {
  const meas = tx(parent, str, { ...o, x: 0, y: -9999, a: 'start' });
  const size = o.s || 100, total = meas.getComputedTextLength();
  const x0 = (o.a || 'middle') === 'middle' ? x - total / 2 : x;
  const letters = [...str].map((ch, i) => {
    const off = i ? meas.getSubStringLength(0, i) : 0;
    const g = S('g', {}, parent);
    tx(g, ch, { ...o, x: x0 + off, y, a: 'start' });
    return { g, i, cx: x0 + off + size * 0.25 };
  });
  meas.remove();
  return (t, t0, t1) => letters.forEach(L => {
    const ts = t0 + L.i * (o.stag ?? 0.035);
    if (t < ts) { show(L.g, 0); return; }
    const k = step(t - ts, o.sp || SP.hop);
    let op = clamp((t - ts) / 0.06);
    if (t1 != null && t >= t1) op *= 1 - prog(t, t1, 0.15);
    const rot = (1 - k) * (hash01(L.i, 3) - 0.5) * 50;
    A(L.g, 'transform', `translate(0 ${f2(-(1 - k) * (o.fall ?? 260))}) rotate(${f2(rot)} ${f2(L.cx)} ${f2(y)})`);
    A(L.g, 'opacity', f2(op)); A(L.g, 'visibility', op <= 0.002 ? 'hidden' : 'visible');
  });
}
// моноширинная строка, которая печатается, с курсором-блоком
function typer(parent, str, x, y, o = {}) {
  const s = o.s || 30, ls = o.ls ?? 4, adv = 0.6 * s + ls;
  const full = str.length * adv - ls;
  const x0 = (o.a || 'start') === 'middle' ? x - full / 2 : (o.a === 'end' ? x - full : x);
  const e = tx(parent, '', { f: F.mono, s, w: 700, fill: o.fill || P.ink, a: 'start', x: x0, y, ls });
  const cur = S('rect', { x: x0, y: y - s * 0.55, width: s * 0.55, height: s * 1.05, fill: o.cursor || P.red }, parent);
  const cps = o.cps || 26;
  return (t, t0, t1) => {
    const n = t < t0 ? 0 : Math.min(str.length, Math.floor((t - t0) * cps) + 1);
    let op = t < t0 ? 0 : 1;
    if (t1 != null && t >= t1) op *= 1 - prog(t, t1, 0.15);
    setText(e, str.slice(0, n)); A(e, 'opacity', f2(op));
    const typing = t >= t0 && n < str.length;
    const blink = typing || Math.floor((t - t0) * 2.2) % 2 === 0;
    const keep = o.keepCursor || t - t0 < str.length / cps + 0.6;
    A(cur, 'x', f2(x0 + n * adv)); show(cur, op * (blink && keep ? 1 : 0));
  };
}
const bgRect = (g, fill) => S('rect', { x: -400, y: -400, width: W + 800, height: H + 800, fill }, g);
// огромный «призрачный» текст на фоне, медленно плывёт
function ghost(g, str, y, o = {}) {
  const e = tx(g, str, { s: o.s || 420, fill: 'none', x: CX, y, attrs: { stroke: o.stroke || '#FFFFFF', 'stroke-width': 2, opacity: o.op ?? 0.07 } });
  return t => A(e, 'transform', `translate(${f2(120 - 40 * t)} 0)`);
}
function circleWipe(g, cx, cy, fill) {
  const c = S('circle', { cx, cy, r: 0, fill }, g);
  return (t, t0, d = 0.42) => { A(c, 'r', f2(prog(t, t0, d, ease.inOut) * 2400)); show(c, t >= t0 ? 1 : 0); };
}
const CURSOR = 'M0 0 L0 44 L12 33 L21 52 L29 48 L20 30 L36 30 Z';

// ------------------------------------------------------------------ сцены (строятся после загрузки шрифтов)
const SCN = [];
for (let k = 1; k <= GROUPS.length; k++) {
  const t0 = k === 1 ? T.open : phrase(GROUPS[k - 1][0]).start - 0.06;
  SCN.push({ k, t0, g: S('g', { display: 'none' }, world), draw: () => {}, hudDark: true });
}
SCN.forEach((s, i) => { s.t1 = i + 1 < SCN.length ? SCN[i + 1].t0 : DURATION + 1; });
const BUILD = {};

// 1 — тёмное вступление, сканирующая линия -> красный «САМЫЙ ПРОСТОЙ.»
BUILD[1] = s => {
  const g = s.g, tS = pw(1, 'самый') - 0.08;
  const dark = S('g', {}, g); bgRect(dark, 'url(#darkbg)');
  const line = S('rect', { x: 0, y: 0, width: W, height: 4, fill: P.red, filter: 'url(#glow)' }, dark);
  const play = S('path', { d: 'M1770 120 l34 20 l-34 20 Z', fill: P.cyan }, dark);
  const eto = typer(dark, 'ЭТО', CX, CY, { a: 'middle', s: 54, fill: P.white, cps: 14 });
  const red = S('g', {}, g); bgRect(red, P.red);
  const gh = ghost(red, 'САМЫЙ ПРОСТОЙ', CY - 30, { stroke: P.navy, op: 0.12 });
  const top = typer(red, 'СДЕЛАНО КОДОМ', CX, 300, { a: 'middle', s: 26, fill: P.navy, cursor: P.white, cps: 30 });
  const w1 = dropWord(red, 'САМЫЙ', CX, 470, { s: 250, fill: P.navy, stag: 0.04 });
  const w2 = dropWord(red, 'ПРОСТОЙ.', CX, 720, { s: 250, fill: P.navy, stag: 0.04 });
  const ser = S('g', {}, red);
  tx(ser, 'ролик, который я делал', { f: F.ser, s: 92, fill: P.white, x: CX + 120, y: 900 });
  const serP = popper(ser, CX + 120, 900, pw(1, 'ролик') - 0.05, { from: 0.9, dy: 18 });
  s.draw = t => {
    const isRed = t >= tS;
    show(dark, isRed ? 0 : 1); show(red, isRed ? 1 : 0);
    s.hudDark = !isRed;
    A(line, 'y', f2(lerp(150, 1050, prog(t, T.open + 0.05, 0.9, ease.inOut))));
    show(play, Math.floor(t * 3) % 2 ? 1 : 0.3);
    eto(t, T.open + 0.05);
    gh(t); top(t, tS + 0.05);
    w1(t, tS); w2(t, pw(1, 'простой') - 0.06); serP(t);
  };
};
// 2 — «● ПОТОМУ ЧТО» · «ДЕЛАЛ ЕГО / НЕ Я.» · красный круг · «CLAUDE» · пролёт сквозь букву
BUILD[2] = s => {
  const g = s.g;
  const tP = pw(2, 'потому'), tD = pw(2, 'делал'), tN = pw(2, 'не'), tE = pw(2, 'его', 2), tM = pw(2, 'смонтировал'), tC = pw(2, 'claude');
  const tZ = SCN[2].t0;   // пролёт кончается ровно на склейке в сцену 3
  const dark = S('g', {}, g); bgRect(dark, 'url(#darkbg)');
  const gh = ghost(dark, 'ПОТОМУ ЧТО НЕ Я', CY, { op: 0.1 });
  const dot = S('circle', { cx: CX - 250, cy: 380, r: 20, fill: P.red, filter: 'url(#glow)' }, dark);
  const lab = typer(dark, 'ПОТОМУ ЧТО', CX + 20, 380, { a: 'middle', s: 58, fill: P.red, cursor: P.red, cps: 22, ls: 8 });
  const d1 = dropWord(dark, 'ДЕЛАЛ ЕГО', CX, 600, { s: 210, fill: P.white });
  const d2 = dropWord(dark, 'НЕ Я.', CX, 860, { s: 250, fill: P.red, stag: 0.05 });
  const wipe = circleWipe(dark, 420, 760, P.red);
  const red = S('g', {}, g);
  const mon = typer(red, 'ЕГО СМОНТИРОВАЛ', CX, 360, { a: 'middle', s: 44, fill: P.navy, cursor: P.white, cps: 30, ls: 8 });
  const cl = dropWord(red, 'CLAUDE', CX, 640, { s: 330, fill: P.navy, stag: 0.05, fall: 420 });
  s.draw = t => {
    gh(t); show(dot, t >= tP ? 1 : 0); lab(t, tP);
    d1(t, tD, tE); d2(t, tN - 0.05, tE + 0.25);
    wipe(t, tE - 0.12, 0.42);
    show(red, t >= tE + 0.25 ? 1 : 0);
    mon(t, tM); cl(t, tC - 0.08);
    // пролёт сквозь букву: CLAUDE растёт, пока кадр не станет тёмным
    const z = prog(t, tZ - 0.26, 0.26, ease.in4);
    A(red, 'transform', z > 0 ? `translate(${CX + 120} 640) scale(${f2(1 + z * 40)}) translate(${-(CX + 120)} -640)` : '');
    s.hudDark = t < tE + 0.1;
  };
};
// 3 — секундомер: «ОБЫЧНО ТАКОЙ МОНТАЖ —» 3:00:00 против «А ТУТ — CLAUDE» 0:25:00
BUILD[3] = s => {
  const g = s.g; bgRect(g, 'url(#lightbg)'); s.hudDark = false;
  const t3 = phrase(3).start, t4 = phrase(4).start, tH = pw(3, 'часы'), tW = pw(4, 'хочу');
  const gh = () => {};
  const r1 = typer(g, 'ОБЫЧНО ТАКОЙ МОНТАЖ —', 250, 300, { s: 40, fill: P.ink, cps: 32, ls: 8 });
  const hours = typer(g, 'ЧАСЫ В AFTER EFFECTS', 250, 360, { s: 40, fill: P.ink, cps: 30, ls: 8 });
  const clk1 = tx(g, '0:00:00', { s: 110, fill: P.ink, a: 'end', x: W - 250, y: 330 });
  setText(clk1, '0:00:00'); const SWX = W - 250 - clk1.getComputedTextLength() - 90;
  const sw = S('g', {}, g);
  S('circle', { cx: SWX, cy: 330, r: 44, fill: 'none', stroke: P.ink, 'stroke-width': 6 }, sw);
  S('rect', { x: SWX - 10, y: 270, width: 20, height: 12, rx: 3, fill: P.ink }, sw);
  const hand = S('line', { x1: SWX, y1: 330, x2: SWX, y2: 296, stroke: P.red, 'stroke-width': 6, 'stroke-linecap': 'round' }, sw);
  S('rect', { x: 250, y: 420, width: W - 500, height: 50, rx: 6, fill: P.light2 }, g);
  const bar1 = S('rect', { x: 250, y: 420, width: 0, height: 50, rx: 6, fill: P.ink }, g);
  const r2 = typer(g, 'А ТУТ — CLAUDE', 250, 640, { s: 40, fill: P.ink, cps: 30, ls: 8 });
  const clk2 = tx(g, '', { s: 110, fill: P.red, a: 'end', x: W - 250, y: 670 });
  S('rect', { x: 250, y: 740, width: W - 500, height: 50, rx: 6, fill: P.light2 }, g);
  const bar2 = S('rect', { x: 250, y: 740, width: 0, height: 50, rx: 6, fill: P.red }, g);
  const big = S('g', {}, g);
  tx(big, '25 МИНУТ', { s: 200, fill: P.ink, x: 250, y: 930, a: 'start' });
  tx(big, 'до первой версии', { f: F.ser, s: 70, fill: P.red, x: 1250, y: 960, a: 'start' });
  const bigP = popper(big, 600, 930, tW - 0.05, { from: 0.7, dy: 30 });
  const fmt = sec => `${Math.floor(sec / 3600)}:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${String(Math.floor(sec) % 60).padStart(2, '0')}`;
  s.draw = t => {
    gh(t); r1(t, t3); hours(t, tH - 0.05);
    const p1 = prog(t, t3 + 0.2, tH - t3 + 0.3, ease.out);
    setText(clk1, fmt(p1 * 10800)); A(bar1, 'width', f2(p1 * (W - 500)));
    A(hand, 'transform', `rotate(${f2(t * 720)} ${SWX} 330)`);
    r2(t, t4);
    const p2 = prog(t, t4 + 0.25, 1.0, ease.out);
    setText(clk2, t >= t4 + 0.2 ? fmt(p2 * 1500) : ''); A(bar2, 'width', f2(p2 * (W - 500) * 1500 / 10800));
    bigP(t);
  };
};
// 4 — ПОДПИСИ · НАЕЗДЫ (размытие) · ГРАФИКА · «и ни одной монтажной программы» — AFTER EFFECTS зачёркнут
BUILD[4] = s => {
  const g = s.g;
  const tP = pw(5, 'подписи'), tN = pw(5, 'наезды'), tG = pw(5, 'графика'), tZ = pw(5, 'ни') - 0.2;
  const a = S('g', {}, g); bgRect(a, '#F2F4F7');
  tx(a, 'ПОДПИСИ', { s: 300, fill: P.ink, x: CX, y: CY - 40 });
  const chips = ['каждое', 'слово', 'вовремя'].map((w, k) => { const c = S('g', {}, a); S('path', { d: rr(670 + k * 290 - 130, 820, 260, 80, 14), fill: k === 1 ? P.red : P.ink }, c); tx(c, w, { f: F.body, w: 700, s: 40, fill: P.white, x: 670 + k * 290, y: 860 }); return popper(c, 670 + k * 290, 860, tP + 0.15 + k * 0.08, { from: 0.6 }); });
  const b = S('g', {}, g); bgRect(b, '#05070C');
  const zb = blurFilter('zb');
  const zt = tx(b, 'НАЕЗДЫ', { s: 320, fill: P.red, x: CX, y: CY, attrs: { filter: 'url(#zb)' } });
  const c = S('g', {}, g); bgRect(c, P.blue);
  tx(c, 'ГРАФИКА', { s: 300, fill: P.white, x: CX, y: CY });
  const shapes = [];
  for (let k = 0; k < 8; k++) {
    const sg = S('g', {}, c), col = [P.white, P.red, '#FFD34D'][k % 3];
    if (k % 3 === 0) S('circle', { r: 46, fill: col }, sg); else if (k % 3 === 1) S('rect', { x: -40, y: -40, width: 80, height: 80, rx: 10, fill: col }, sg); else S('path', { d: 'M0 -52 L48 38 L-48 38 Z', fill: col }, sg);
    shapes.push({ g: sg, a: k / 8 * 6.283 + 0.4 });
  }
  const d = S('g', {}, g); bgRect(d, P.blue);
  const no = typer(d, 'И НИ ОДНОЙ МОНТАЖНОЙ ПРОГРАММЫ', CX, 380, { a: 'middle', s: 40, fill: P.white, cursor: P.red, cps: 34, ls: 8 });
  const aeG = S('g', {}, d);
  tx(aeG, 'AFTER EFFECTS', { s: 230, fill: P.white, x: CX, y: 640 });
  const strike = drawStroke(d, `M${CX - 760} 668 L ${CX + 760} 612`, { stroke: P.red, 'stroke-width': 26 });
  const br = S('g', {}, d);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => S('path', { d: `M${CX + sx * 820} ${640 + sy * 120} V ${640 + sy * 180} H ${CX + sx * 760}`, fill: 'none', stroke: P.white, 'stroke-width': 8 }, br));
  const aeP = popper(aeG, CX, 640, tZ + 0.35, { from: 0.85 });
  const tProg = pw(5, 'программы');
  s.draw = t => {
    const which = t < tN - 0.04 ? 0 : t < tG - 0.04 ? 1 : t < tZ - 0.05 ? 2 : 3;
    [a, b, c, d].forEach((e, k) => show(e, k === which ? 1 : 0));
    s.hudDark = which !== 0;
    chips.forEach(f => f(t));
    if (which === 1) { const k = step(t - tN + 0.04, SP.snap); popAt(zt, CX, CY, lerp(2.6, 1, k) + 0.05 * (t - tN), 1); zb(lerp(60, 0, clamp((t - tN + 0.04) / 0.3))); }
    if (which === 2) shapes.forEach((sh, k) => { const p = step(t - tG - k * 0.03, SP.pop); pose(sh.g, CX + Math.cos(sh.a) * 640 * p, CY + Math.sin(sh.a) * 400 * p, Math.max(0.01, p), Math.max(0.01, p), 200 * (1 - p), 1); });
    no(t, tZ); aeP(t);
    strike.draw(prog(t, pw(5, 'монтажной'), 0.3, ease.out));
    const bk = step(t - tProg, SP.snap);
    A(br, 'transform', `translate(${CX} 640) scale(${f2(lerp(1.25, 1, bk))}) translate(${-CX} -640)`); show(br, t >= tProg ? bk : 0);
  };
};
// 5 — интерфейс: карточка «моя идея» -> курсор выделяет текст -> тащит в Claude -> сборка; «голос — я»
BUILD[5] = s => {
  const g = s.g; bgRect(g, 'url(#lightbg)'); s.hudDark = false;
  const t0 = phrase(6).start, tI = pw(6, 'идею'), tT = pw(6, 'написал'), tS = pw(6, 'собрал'), tV = pw(6, 'озвучил');
  const cam = S('g', {}, g);
  const head = typer(cam, 'СКИНУЛ ИДЕЮ — ОСТАЛЬНОЕ СДЕЛАЛ CLAUDE', CX, 200, { a: 'middle', s: 34, fill: P.ink, cps: 40, ls: 6 });
  S('rect', { x: 236, y: 316, width: 700, height: 600, rx: 26, fill: '#000', opacity: 0.08 }, cam);
  S('rect', { x: 220, y: 300, width: 700, height: 600, rx: 26, fill: P.white }, cam);
  tx(cam, 'моя идея', { f: F.body, w: 800, s: 50, fill: P.ink, x: 270, y: 380, a: 'start' });
  S('rect', { x: 270, y: 418, width: 600, height: 4, fill: P.red }, cam);
  const para = ['хочу буквально такое же', 'видео, только на русском.', 'Я включу его на Маке', 'и сниму на телефон'];
  const sel = para.map((l, k) => S('rect', { x: 262, y: 470 + k * 70 - 27, width: 0, height: 54, rx: 6, fill: '#9EC1FF' }, cam));
  para.forEach((l, k) => tx(cam, l, { f: F.body, w: 500, s: 40, fill: P.ink, x: 270, y: 470 + k * 70, a: 'start' }));
  const arr = drawStroke(cam, 'M945 600 L 1012 600 M 992 582 L 1012 600 L 992 618', { stroke: P.red, 'stroke-width': 7 });
  S('rect', { x: 1040, y: 300, width: 680, height: 600, rx: 26, fill: P.navy }, cam);
  tx(cam, 'Claude', { f: F.body, w: 800, s: 50, fill: P.white, x: 1090, y: 380, a: 'start' });
  S('circle', { cx: 1670, cy: 378, r: 11, fill: P.red }, cam);
  S('rect', { x: 1090, y: 450, width: 580, height: 100, rx: 14, fill: 'none', stroke: P.grey2, 'stroke-width': 3, 'stroke-dasharray': '14 10' }, cam);
  const inChip = S('g', {}, cam);
  S('rect', { x: 1104, y: 464, width: 552, height: 72, rx: 10, fill: '#EEF2F7' }, inChip);
  S('rect', { x: 1124, y: 488, width: 24, height: 24, rx: 4, fill: P.red }, inChip);
  tx(inChip, 'моя идея', { f: F.body, w: 700, s: 36, fill: P.ink, x: 1166, y: 500, a: 'start' });
  S('rect', { x: 1090, y: 590, width: 580, height: 44, rx: 10, fill: P.navy2 }, cam);
  S('rect', { x: 1090, y: 654, width: 400, height: 44, rx: 10, fill: P.navy2 }, cam);
  S('rect', { x: 1090, y: 760, width: 580, height: 90, rx: 18, fill: '#7A1712' }, cam);
  const fill = S('rect', { x: 1090, y: 760, width: 0, height: 90, rx: 18, fill: P.red }, cam);
  const btn = tx(cam, 'собрать ролик', { f: F.mono, w: 700, s: 34, fill: P.white, x: 1380, y: 805 });
  const chip = S('g', {}, cam);
  S('rect', { x: -120, y: -36, width: 240, height: 72, rx: 14, fill: P.blue }, chip);
  tx(chip, 'моя идея', { f: F.body, w: 700, s: 34, fill: P.white, x: 0, y: 0 });
  const cursor = S('path', { d: CURSOR, fill: P.ink, stroke: P.white, 'stroke-width': 3 }, cam);
  const voice = S('g', {}, g);
  S('path', { d: rr(CX - 260, 990, 520, 90, 45), fill: P.ink }, voice);
  S('circle', { cx: CX - 205, cy: 1035, r: 13, fill: P.red }, voice);
  tx(voice, 'ГОЛОС — Я', { f: F.mono, w: 700, s: 40, fill: P.white, x: CX + 20, y: 1035, ls: 6 });
  const voiceP = popper(voice, CX, 1035, tV - 0.05, { from: 0.5 });
  const cx_ = track(1500, [[t0, 280, SP.move], [tI + 0.5, 600, SP.tuck], [tT - 0.1, 1380, SP.move], [tS - 0.35, 1600, SP.tuck]]);
  const cy_ = track(1050, [[t0, 450, SP.move], [tI + 0.5, 650, SP.tuck], [tT - 0.1, 500, SP.move], [tS - 0.35, 820, SP.tuck]]);
  s.draw = t => {
    head(t, t0);
    const x = cx_(t), y = cy_(t);
    A(cursor, 'transform', `translate(${f2(x)} ${f2(y)})`);
    sel.forEach((r, k) => A(r, 'width', f2(prog(t, tI - 0.1 + k * 0.12, 0.2, ease.out) * 600)));
    const dragging = t >= tI + 0.55 && t < tT + 0.75;
    show(chip, dragging ? 1 : 0); A(chip, 'transform', `translate(${f2(x - 20)} ${f2(y + 50)})`);
    show(inChip, t >= tT + 0.75 ? 1 : 0);
    arr.draw(prog(t, tT, 0.3, ease.out));
    A(fill, 'width', f2(prog(t, tS, 1.1, ease.inOut) * 580));
    setText(btn, t < tS ? 'собрать ролик' : t < tS + 1.1 ? 'собираю ролик…' : 'ролик готов');
    const z = step(t - tS + 0.2, SP.move);
    A(cam, 'transform', `translate(1380 600) scale(${f2(1 + 0.22 * z)}) translate(-1380 -600) translate(${f2(-60 * z)} 0)`);
    voiceP(t);
  };
};
// 6 — вихрь частиц «И САМОЕ СТРАННОЕ:» -> кольцо -> синий круг -> сплит «ОБЫЧНО | ДЕШЕВЛЕ, ЧЕМ»: пиксели против кода
BUILD[6] = s => {
  const g = s.g;
  const t7 = phrase(7).start, tE = pw(7, 'это'), tCh = pw(7, 'дешевле'), tNs = pw(7, 'нейросети');
  const tR = pw(8, 'рисует'), tV = pw(8, 'видео'), tK = pw(8, 'код');
  const fx = S('g', {}, g);
  const pill = S('g', {}, fx);
  S('path', { d: rr(CX - 420, CY - 50, 840, 100, 16), fill: '#05070C', opacity: 0.85 }, pill);
  const strange = typer(pill, 'И САМОЕ СТРАННОЕ:', CX, CY, { a: 'middle', s: 46, fill: P.white, cps: 26, ls: 8 });
  const wipe = circleWipe(fx, CX, CY, P.blue);
  const sp = S('g', {}, g);
  S('rect', { x: 0, y: 0, width: W / 2, height: H, fill: '#E9EEF3' }, sp);
  S('rect', { x: W / 2, y: 0, width: W / 2, height: H, fill: P.code }, sp);
  S('rect', { x: W / 2 - 3, y: 0, width: 6, height: H, fill: P.red }, sp);
  const hL = typer(sp, 'ОБЫЧНО', W / 2 - 40, 170, { a: 'end', s: 46, fill: P.ink, cps: 40, ls: 8 });
  const hR = typer(sp, 'ДЕШЕВЛЕ, ЧЕМ', W / 2 + 40, 170, { s: 46, fill: P.white, cps: 40, ls: 8 });
  const nsL = typer(sp, 'НЕЙРОСЕТИ ДЛЯ ВИДЕО', 140, 280, { s: 32, fill: P.ink, cps: 30, ls: 6 });
  const blocks = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) {
    const v = 90 + Math.floor(hash01(r * 9 + c, 12) * 120);
    blocks.push({ e: S('rect', { x: 200 + c * 62, y: 360 + r * 62, width: 58, height: 58, fill: `rgb(${v},${v},${v + 8})` }, sp), k: hash01(r * 9 + c, 13) });
  }
  const vid = S('g', {}, sp); tx(vid, 'ВИДЕО', { s: 210, fill: P.ink, x: W / 4, y: 870 });
  const vidP = popper(vid, W / 4, 870, tV - 0.06, { from: 0.6 });
  const notV = typer(sp, 'НЕ РИСУЕТ', W / 4, 1010, { a: 'middle', s: 34, fill: P.ink, cps: 30, ls: 6 });
  const vStrike = drawStroke(sp, `M${W / 4 - 330} 900 L ${W / 4 + 330} 850`, { stroke: P.red, 'stroke-width': 18 });
  const code = [[['слово', '#9FD3FF'], [' = ', P.grey], ['"КАДР"', '#FF7A6B'], [';', P.grey]], [['вход', '#9FD3FF'], [' = ', P.grey], ['пружина', '#9BE7A8'], ['(0.4);', P.grey]], [['фигура', '#9FD3FF'], ['.', P.grey], ['в', '#9BE7A8'], ['("звезда");', '#FF7A6B']]];
  const codeLines = code.map((parts_, k) => { const e = S('text', { x: W / 2 + 90, y: 330 + k * 80, 'font-family': F.mono, 'font-size': 44, 'font-weight': 700, 'dominant-baseline': 'central' }, sp); return parts_.map(([str, col]) => ({ ts: S('tspan', { fill: col }, e), str })); });
  const kod = S('g', {}, sp); tx(kod, 'КОД', { s: 230, fill: P.red, x: W * 3 / 4, y: 840, attrs: { filter: 'url(#glow)' } });
  const kodP = popper(kod, W * 3 / 4, 840, tK - 0.07, { from: 0.4, sp: SP.hop });
  const genC = typer(sp, 'ПИШЕТ', W * 3 / 4, 1010, { a: 'middle', s: 34, fill: P.white, cps: 30, ls: 6 });
  const tSplit = tCh + 0.1;
  s.draw = t => {
    const isSplit = t >= tSplit;
    show(fx, isSplit ? 0 : 1); show(sp, isSplit ? 1 : 0);
    s.hudDark = !isSplit; s.hudSplit = isSplit; s.sub = isSplit ? 1 : 0;
    if (!isSplit) {
      const rk = prog(t, tE - 0.15, 0.9, ease.inOut);
      glReq = ['vortex', t, { ring: rk, lt: t - s.t0 + 0.6, k: clamp((t - s.t0) / Math.max(0.5, tSplit - s.t0)) }];
      strange(t, t7);
      wipe(t, tCh - 0.12, 0.42);
    } else {
      hL(t, tSplit - 0.02); hR(t, tSplit + 0.08);
      nsL(t, tNs - 0.05);
      const pb = clamp((t - tNs) / 1.6);
      blocks.forEach(b => show(b.e, b.k < pb ? 1 : 0));
      vidP(t); notV(t, tR - 0.1); vStrike.draw(prog(t, tR + 0.15, 0.3, ease.out));
      let budget = Math.max(0, Math.floor((t - (tR + 0.2)) * 30));
      codeLines.forEach(spans => spans.forEach(({ ts, str }) => { const n = Math.min(str.length, budget); budget -= n; setText(ts, str.slice(0, n)); }));
      kodP(t); genC(t, tK + 0.1);
    }
  };
};
// 7 — плёнка: каждый кадр заполняется пикселями с нуля -> «ЭТО ДОРОГО.» (глитч) -> растворение в красный
BUILD[7] = s => {
  const g = s.g; bgRect(g, 'url(#darkbg)');
  const t0 = phrase(9).start, tD = pw(9, 'дорого'), tEnd = phrase(9).end;
  const l1 = typer(g, 'НЕЙРОСЕТЬ ГЕНЕРИРУЕТ', CX, 260, { a: 'middle', s: 44, fill: P.white, cps: 30, ls: 8 });
  const l2 = typer(g, 'КАЖДЫЙ КАДР С НУЛЯ', CX, 330, { a: 'middle', s: 44, fill: P.white, cps: 30, ls: 8 });
  const fs = S('g', {}, g);
  S('rect', { x: 160, y: 430, width: W - 320, height: 300, rx: 8, fill: '#16223F' }, fs);
  for (let k = 0; k < 36; k++) { S('rect', { x: 180 + k * 44, y: 444, width: 22, height: 16, rx: 3, fill: '#2E3D63' }, fs); S('rect', { x: 180 + k * 44, y: 700, width: 22, height: 16, rx: 3, fill: '#2E3D63' }, fs); }
  const frames = [];
  for (let f = 0; f < 10; f++) {
    const fx0 = 190 + f * 156, cells = [];
    S('rect', { x: fx0, y: 480, width: 146, height: 204, fill: '#1E2C52' }, fs);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) { const v = hash01(f * 31 + r * 4 + c, 9); cells.push({ e: S('rect', { x: fx0 + 4 + c * 35.5, y: 484 + r * 33, width: 33, height: 31, fill: mix('#3D63C9', '#8FB0FF', v) }, fs), k: hash01(f * 77 + r * 4 + c, 4) }); }
    frames.push(cells);
  }
  const fcount = tx(g, '', { f: F.mono, w: 700, s: 30, fill: P.grey, x: CX, y: 790, ls: 4 });
  const ex = S('g', {}, g);
  const exR = tx(ex, 'ЭТО ДОРОГО.', { s: 260, fill: '#FF2A2A', x: CX, y: 950, attrs: { opacity: 0.7 } });
  const exC = tx(ex, 'ЭТО ДОРОГО.', { s: 260, fill: P.cyan, x: CX, y: 950, attrs: { opacity: 0.55 } });
  tx(ex, 'ЭТО ДОРОГО.', { s: 260, fill: P.red, x: CX, y: 950 });
  const exP = popper(ex, CX, 950, tD - 0.06, { from: 1.25, sp: SP.snap });
  const fade = S('rect', { x: 0, y: 0, width: W, height: H, fill: P.red, opacity: 0 }, g);
  s.draw = t => {
    l1(t, t0); l2(t, t0 + 0.75);
    const p = clamp((t - t0 - 0.2) / Math.max(0.8, tD - t0 - 0.2));
    frames.forEach((cells, f) => { const pf = clamp(p * 10 - f); cells.forEach(c => show(c.e, c.k < pf ? 1 : 0)); });
    setText(fcount, `КАДР ${String(Math.max(1, Math.floor(p * 1500))).padStart(4, '0')} / 1500`);
    exP(t);
    const j = t >= tD ? (hash01(Math.floor(t * 20), 3) - 0.5) * 18 : 0;
    A(exR, 'transform', `translate(${f2(-8 + j)} 3)`); A(exC, 'transform', `translate(${f2(8 - j)} -3)`);
    A(fade, 'opacity', f2(prog(t, tEnd - 0.05, 0.35, ease.inOut)));
  };
};
// 8 — красный: «CLAUDE ОПИСЫВАЕТ / кадр текстом» -> список + морф фигуры (круг -> треугольник -> звезда) + «СЛОВО» вертикально
BUILD[8] = s => {
  const g = s.g;
  const t0 = phrase(10).start, tK = pw(10, 'кадр'), tG = pw(10, 'где'), tSt = pw(10, 'стоит'), tW = pw(10, 'слово'), tM = pw(10, 'движется');
  const intro = S('g', {}, g);
  tx(intro, 'CLAUDE ОПИСЫВАЕТ', { s: 190, fill: P.navy, x: CX, y: CY - 70 });
  const introP = popper(intro, CX, CY - 70, s.t0 + 0.02, { from: 0.85, t1: tG - 0.1 });
  const ser = S('g', {}, g); tx(ser, 'кадр текстом', { f: F.ser, s: 110, fill: P.white, x: CX, y: CY + 110 });
  const serP = popper(ser, CX, CY + 110, tK - 0.05, { from: 0.85, t1: tG - 0.1, dy: 16 });
  const list = S('g', {}, g);
  const head = typer(list, 'ОПИСЫВАЕТ:', 200, 300, { s: 42, fill: P.navy, cursor: P.white, cps: 26, ls: 8 });
  const items = [['— ГДЕ СТОИТ', tSt], ['— КАЖДОЕ СЛОВО', tW], ['— КАК ДВИЖЕТСЯ', tM]].map(([str, tc], k) => ({ f: typer(list, str, 200, 400 + k * 80, { s: 42, fill: P.navy, cursor: P.white, cps: 30, ls: 8 }), tc }));
  const vert = S('g', {}, list); tx(vert, 'СЛОВО', { s: 200, fill: P.navy, x: 0, y: 0, attrs: { transform: 'translate(1640 640) rotate(90)' } });
  const vertP = popper(vert, 1640, 640, tW - 0.05, { from: 0.5 });
  s.draw = t => {
    introP(t); serP(t);
    show(list, t >= tG - 0.1 ? 1 : 0);
    head(t, tG - 0.05);
    items.forEach(it => it.f(t, it.tc - 0.08));
    const m1 = step(t - tSt, SP.move), m2 = step(t - tM, SP.move);
    glReq = ['morph', t, { m1, m2, s: step(t - tG, SP.pop) }];
    vertP(t);
  };
};
// 9 — 3D-ландшафт из кубиков с планетой «КОД → ВИДЕО» -> «ТЕКСТ — ДЁШЕВО.» с кольцом цены -> кость дважды падает на 6
BUILD[9] = s => {
  const g = s.g;
  const t0 = phrase(11).start, tT = pw(11, 'текст'), tK = pw(11, 'кадр'), tO = pw(11, 'одинаковым');
  const vox = S('g', {}, g);
  const vlab = typer(vox, 'КОД → ПРЕВРАЩАЕТСЯ В ВИДЕО', CX, 150, { a: 'middle', s: 44, fill: P.white, cps: 34, ls: 8 });
  const cheap = S('g', {}, g); bgRect(cheap, 'url(#lightbg)');
  S('circle', { cx: 560, cy: 600, r: 230, fill: 'none', stroke: '#D5DEE8', 'stroke-width': 42 }, cheap);
  const arc = drawStroke(cheap, 'M560 370 A 230 230 0 0 1 616 377', { stroke: P.red, 'stroke-width': 42, 'stroke-linecap': 'butt' });
  tx(cheap, 'цена', { f: F.ser, s: 70, fill: P.grey2, x: 560, y: 600 });
  const tl = typer(cheap, 'ТЕКСТ —', 940, 440, { s: 44, fill: P.ink, cps: 24, ls: 8 });
  const ch = S('g', {}, cheap); const chT = tx(ch, 'ДЁШЕВО', { s: 230, fill: P.ink, x: 940, y: 620, a: 'start' });
  S('circle', { cx: 940 + chT.getComputedTextLength() + 30, cy: 690, r: 20, fill: P.red }, ch);
  const chP = popper(ch, 1250, 620, tT + 0.25, { from: 0.7 });
  const same = S('g', {}, g); bgRect(same, 'url(#lightbg)');
  const die = S('g', {}, same);
  S('rect', { x: -90, y: -90, width: 180, height: 180, rx: 34, fill: P.ink }, die);
  const pipsAt = { 6: [[-45, -50], [-45, 0], [-45, 50], [45, -50], [45, 0], [45, 50]], 3: [[-45, -45], [0, 0], [45, 45]], 4: [[-45, -45], [45, -45], [-45, 45], [45, 45]], 2: [[-45, -45], [45, 45]] };
  const pips = [0, 1, 2, 3, 4, 5].map(() => S('circle', { r: 17, fill: P.white }, die));
  const kr = S('g', {}, same); tx(kr, 'КАЖДЫЙ РАЗ', { s: 180, fill: P.ink, x: 1180, y: 520 });
  const krP = popper(kr, 1180, 520, tK - 0.05, { from: 0.8 });
  const od = S('g', {}, same); tx(od, 'ОДИНАКОВО.', { s: 180, fill: P.red, x: 1180, y: 720 });
  const odP = popper(od, 1180, 720, tO - 0.05, { from: 0.8 });
  s.draw = t => {
    const which = t < tT - 0.05 ? 0 : t < tK - 0.06 ? 1 : 2;
    show(vox, which === 0 ? 1 : 0); show(cheap, which === 1 ? 1 : 0); show(same, which === 2 ? 1 : 0);
    s.hudDark = which === 0;
    if (which === 0) {
      glReq = ['city', t, { rise: clamp((t - t0 + 0.25) / 0.9), planet: step(t - t0 - 0.5, SP.pop), k: clamp((t - t0) / Math.max(1, tT - t0)) }];
      vlab(t, t0);
    }
    if (which === 1) { tl(t, tT); chP(t); arc.draw(prog(t, tT + 0.4, 0.5, ease.out)); }
    if (which === 2) {
      const r1 = clamp((t - tK) / 0.55), r2 = clamp((t - tK - 1.0) / 0.55);
      const rolling = (r1 > 0 && r1 < 1) || (r2 > 0 && r2 < 1);
      const face = rolling ? [3, 4, 2][Math.floor(t * 14) % 3] : 6;
      const pts = pipsAt[face];
      pips.forEach((p, k) => { if (k < pts.length) { A(p, 'cx', pts[k][0]); A(p, 'cy', pts[k][1]); show(p, 1); } else show(p, 0); });
      const r = r1 < 1 ? r1 : r2;
      const rot = rolling ? (1 - ease.out(r)) * 540 : 0;
      const bounce = rolling ? -Math.abs(Math.sin(r * Math.PI * 2)) * 70 : 0;
      A(die, 'transform', `translate(460 ${f2(620 + bounce)}) rotate(${f2(rot)})`);
      krP(t); odP(t);
    }
  };
};
// 10 — синий: «НУЖЕН ДРУГОЙ ЦВЕТ?» -> курсор выделяет значение -> новое -> диагональная шторка красным «БЕЗ ПЕРЕГЕНЕРАЦИИ.»
BUILD[10] = s => {
  const g = s.g;
  const t0 = phrase(12).start, tM = pw(12, 'меняет'), tO = pw(12, 'одну'), tN = pw(12, 'ничего');
  S('rect', { x: -200, y: -200, width: W + 400, height: H + 400, fill: P.blue }, g);
  const wipe = S('path', { d: '', fill: P.red }, g);
  const q = typer(g, 'НУЖЕН ДРУГОЙ ЦВЕТ?', CX, 220, { a: 'middle', s: 48, fill: P.white, cps: 28, ls: 8 });
  S('rect', { x: CX - 520, y: 320, width: 1040, height: 130, rx: 16, fill: P.navy }, g);
  tx(g, 'фон:', { f: F.mono, w: 700, s: 58, fill: P.white, x: CX - 470, y: 385, a: 'start' });
  tx(g, '"#2B3CFF"', { f: F.mono, w: 700, s: 58, fill: '#9FD3FF', x: CX - 270, y: 385, a: 'start' });
  const selR = S('rect', { x: CX - 280, y: 350, width: 0, height: 70, rx: 6, fill: '#3E7BFF', opacity: 0.6 }, g);
  const oldStrike = S('rect', { x: CX - 270, y: 382, width: 0, height: 6, fill: P.white }, g);
  const newG = S('g', {}, g);
  S('rect', { x: CX + 90, y: 345, width: 380, height: 80, rx: 10, fill: P.red }, newG);
  tx(newG, '"#E4261C"', { f: F.mono, w: 700, s: 58, fill: P.white, x: CX + 280, y: 385 });
  const newP = popper(newG, CX + 280, 385, tO - 0.05, { from: 0.6 });
  const one = typer(g, 'CLAUDE МЕНЯЕТ ОДНУ СТРОКУ', CX, 530, { a: 'middle', s: 40, fill: P.white, cps: 34, ls: 8 });
  const blobs = [0, 1, 2].map(k => { const bg_ = S('g', {}, g); let d = ''; for (let j = 0; j <= 40; j++) { const a = j / 40 * 6.283, r = 70 * (1 + 0.14 * Math.sin(3 * a + k) + 0.08 * Math.cos(5 * a + 2 * k)); d += (j ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1); } S('path', { d: d + 'Z', fill: '#0A0D16' }, bg_); const dot = S('circle', { r: 18, fill: P.red }, bg_); return { g: bg_, dot, x: CX - 260 + k * 260 }; });
  const no = S('g', {}, g); tx(no, 'БЕЗ ПЕРЕГЕНЕРАЦИИ.', { s: 150, fill: P.navy, x: CX, y: 690 });
  const noP = popper(no, CX, 690, tN + 0.25, { from: 0.8 });
  const cursor = S('path', { d: CURSOR, fill: P.ink, stroke: P.white, 'stroke-width': 3 }, g);
  const cx_ = track(1500, [[t0, CX - 260, SP.move], [tM - 0.2, CX + 70, SP.tuck], [tN - 0.2, 1700, SP.move]]);
  const cy_ = track(1150, [[t0, 400, SP.move], [tN - 0.2, 1200, SP.move]]);
  s.draw = t => {
    q(t, t0); one(t, tM);
    A(selR, 'width', f2(prog(t, tM - 0.1, 0.25, ease.out) * 290));
    A(oldStrike, 'width', f2(prog(t, tO - 0.15, 0.2, ease.out) * 270));
    newP(t);
    A(cursor, 'transform', `translate(${f2(cx_(t))} ${f2(cy_(t))})`);
    blobs.forEach((b, k) => { const wob = Math.sin(t * 3 + k * 2) * 0.05; pose(b.g, b.x, 880 + Math.sin(t * 2.4 + k) * 10, 1 + wob, 1 - wob, 0, 1); show(b.dot, t >= tN + 0.3 ? 1 : 0); });
    const w = prog(t, tN - 0.05, 0.45, ease.inOut);
    const xL = lerp(W + 400, -700, w);
    A(wipe, 'd', w > 0 ? `M${f2(xL)} ${H + 200}L${f2(xL + 500)} -200H${W + 900}V${H + 200}Z` : '');
    noP(t);
  };
};
// 11 — призыв: «● НАПИШИ» · поле с «КОД» и красной стрелкой · «И Я ПРИШЛЮ, КАК Я ЭТО СДЕЛАЛ.»
BUILD[11] = s => {
  const g = s.g; bgRect(g, 'url(#darkbg)');
  const t0 = phrase(13).start, tC = pw(13, 'комментариях'), tK = pw(13, 'код'), tP = pw(13, 'пришлю');
  const gh = ghost(g, 'КОД', CY + 40, { s: 700, op: 0.05 });
  const head = S('g', {}, g);
  S('circle', { cx: CX - 430, cy: 360, r: 26, fill: P.red, filter: 'url(#glow)' }, head);
  tx(head, 'НАПИШИ', { s: 200, fill: '#D9E6FF', x: CX + 40, y: 360 });
  const headP = popper(head, CX, 360, t0 - 0.03, { from: 0.7 });
  const inCom = typer(g, 'В КОММЕНТАРИЯХ', CX, 520, { a: 'middle', s: 38, fill: P.grey, cps: 30, ls: 8 });
  const pill = S('g', {}, g);
  S('rect', { x: CX - 440, y: 590, width: 880, height: 130, rx: 65, fill: '#1A2747', stroke: '#3A4E80', 'stroke-width': 4 }, pill);
  S('rect', { x: CX + 230, y: 610, width: 190, height: 90, rx: 45, fill: P.red }, pill);
  S('path', { d: `M${CX + 285} 655 H ${CX + 360} M ${CX + 335} 630 L ${CX + 362} 655 L ${CX + 335} 680`, fill: 'none', stroke: P.white, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, pill);
  const pillP = popper(pill, CX, 655, tC - 0.05, { from: 0.8 });
  const kod = typer(g, 'КОД', CX - 370, 655, { s: 74, fill: P.white, cursor: P.red, cps: 8, ls: 6, keepCursor: true });
  const send = typer(g, 'И Я ПРИШЛЮ', CX, 840, { a: 'middle', s: 46, fill: P.white, cps: 26, ls: 8 });
  const how = typer(g, 'КАК Я ЭТО СДЕЛАЛ.', CX, 920, { a: 'middle', s: 46, fill: P.red, cps: 24, ls: 8, keepCursor: true });
  s.draw = t => { gh(t); headP(t); inCom(t, tC); pillP(t); kod(t, tK - 0.1); send(t, tP - 0.05); how(t, tP + 0.45); };
};

// ------------------------------------------------------------------ звук: удары и пролёты на ключевых склейках (Kenney CC0 + свои whoosh)
[[T.open, 'whoosh', -7], [pw(1, 'самый') - 0.08, 'hit', 0], [pw(2, 'не') - 0.05, 'hit', -3], [pw(2, 'его', 2) - 0.12, 'whoosh', -3],
 [pw(2, 'claude') - 0.02, 'boom', 0], [phrase(2).end - 0.15, 'whoosh', -2], [pw(5, 'наезды') - 0.04, 'whoosh', -2], [pw(5, 'графика') - 0.03, 'hit', -4],
 [pw(5, 'монтажной'), 'hit', -3], [pw(7, 'дешевле') - 0.12, 'whoosh', -3], [pw(8, 'код') - 0.06, 'boom', -3], [pw(9, 'дорого') - 0.06, 'glitch', -1],
 [pw(9, 'дорого') - 0.06, 'hit', -2], [phrase(10).start - 0.1, 'whoosh', -5], [pw(12, 'ничего') - 0.05, 'whoosh', -2], [pw(13, 'код') - 0.08, 'hit', -3],
].forEach(([t, n, g]) => sfx(t, n, g));

// ------------------------------------------------------------------ HUD: интерфейс камеры поверх всего
let HUD = null;
function buildHud() {
  const h = {};
  const corner = (x, y, sx, sy) => S('path', { d: `M${x} ${y + sy * 46} V ${y} H ${x + sx * 46}`, fill: 'none', 'stroke-width': 4 }, hud);
  h.corners = [corner(44, 44, 1, 1), corner(W - 44, 44, -1, 1), corner(44, H - 44, 1, -1), corner(W - 44, H - 44, -1, -1)];
  S('circle', { cx: 80, cy: 80, r: 7, fill: P.red }, hud);
  h.tl = tx(hud, 'CLAUDE — СДЕЛАНО КОДОМ', { f: F.mono, w: 700, s: 20, x: 98, y: 80, a: 'start', ls: 4 });
  h.tr = tx(hud, '', { f: F.mono, w: 700, s: 20, x: W - 80, y: 80, a: 'end', ls: 4 });
  h.bl = tx(hud, '', { f: F.mono, w: 700, s: 20, x: 80, y: H - 80, a: 'start', ls: 4 });
  h.rec = S('circle', { cx: W - 400, cy: H - 80, r: 7, fill: P.red }, hud);
  h.br = tx(hud, '', { f: F.mono, w: 700, s: 20, x: W - 80, y: H - 80, a: 'end', ls: 4 });
  HUD = h;
}
function hudFrame(t, cur, idx) {
  show(hud, 1);
  const LIGHT = 'rgba(226,234,255,0.6)', DARK = 'rgba(14,20,36,0.55)';
  const colL = cur.hudSplit ? DARK : cur.hudDark ? LIGHT : DARK, colR = cur.hudSplit ? LIGHT : colL;
  HUD.corners.forEach((c, k) => A(c, 'stroke', k % 2 ? colR : colL));
  A(HUD.tl, 'fill', colL); A(HUD.bl, 'fill', colL); A(HUD.tr, 'fill', colR); A(HUD.br, 'fill', colR);
  const num = idx + 1 + (idx > 5 ? 1 : idx === 5 ? (cur.sub || 0) : 0);   // сплит после вихря — отдельная сцена 07
  setText(HUD.tr, `СЦЕНА ${String(num).padStart(2, '0')} / ${String(SCN.length + 1).padStart(2, '0')}`);
  setText(HUD.bl, LABELS[num - 1]);
  const fr = Math.floor(t * FPS);
  setText(HUD.br, `REC 00:00:${String(Math.floor(t)).padStart(2, '0')}:${String(fr % FPS).padStart(2, '0')}`);
  show(HUD.rec, Math.floor(t * 2) % 2 ? 1 : 0.25);
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const idx = t < T.open ? -1 : SCN.findIndex(s => t >= s.t0 && t < s.t1);
  const cur = idx >= 0 ? SCN[idx] : null;
  SCN.forEach(s => A(s.g, 'display', s === cur ? 'inline' : 'none'));
  if (!cur) { show(hud, 0); GL.clear('#000000'); return; }
  const k = clamp((t - cur.t0) / Math.max(1, cur.t1 - cur.t0));
  A(world, 'transform', `translate(${CX} ${CY}) scale(${f2(1 + 0.025 * ease.sine(k))}) translate(${-CX} ${-CY})`);
  glReq = null;
  cur.draw(t);
  if (glReq) GL.draw(...glReq); else GL.clear('#000000');
  hudFrame(t, cur, idx);
}

// ------------------------------------------------------------------ boot
window.DURATION = DURATION;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, DURATION));
window.READY = (async () => {
  await loadFonts();
  SCN.forEach(s => { A(s.g, 'display', 'inline'); BUILD[s.k](s); A(s.g, 'display', 'none'); });
  buildHud();
  frame(0);
  return true;
})();
