// Демо интерфейса (выдуманное приложение «Склейка», ассистент монтажа):
//   * курсор едет по кривой Безье пружиной без перелёта, ОСТАНАВЛИВАЕТСЯ на кнопке, кнопка
//     подсвечивается от наведения, и только потом клик: курсор сжимается, рябь внутри кнопки
//     (клип по форме кнопки) + кольцо вокруг острия;
//   * камера наезжает к точке клика и отъезжает (масштаб вокруг неподвижной точки, логарифмически);
//   * прогресс заливает кнопку, уведомления копятся стопкой: новое сверху, старые съезжают
//     пружиной без перелёта — ничего не прыгает;
//   * ответ ассистента печатается неравномерными порциями (hash01), пузырь и карточка растут плавно.
// В конце всё уходит, пустой фон = первый кадр (петля).

const P = {
  bg: '#e8eaf0', grid: '#d2d6df', card: '#ffffff', shadow: '#cdd2dd', ink: '#1b1d24', muted: '#7a8091',
  line: '#e6e8ee', field: '#f4f5f8', accent: '#4b55e8', accentHi: '#5d67f2', accentLo: '#3a43c9',
  green: '#2e9e68', amber: '#dd8f2a', bubble: '#eef0fd',
};
window.SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 };
const UI = 'Onest';
const CX = 450, CARD = { x: 120, y: 650, w: 660 };      // ниже y 840 правый край зоны 780: карточка 120..780

// ------------------------------------------------------------------ cues (с)
const T = {};
T.card = 0.15;
T.cur = 0.7;                // курсор выезжает
T.hover = 1.42;             // доехал: наведение подсвечивает кнопку
T.click = 1.75;             // клик — после остановки, не на ходу
T.zin = 1.68; T.zinD = 0.7; // наезд к точке клика
T.busy = 1.95;              // «Собираю…» + прогресс в кнопке
T.zout = 2.55; T.zoutD = 0.75;
T.away = 2.85;              // курсор отходит, чтобы не закрывать ответ
T.n = [3.15, 3.6, 4.05];    // уведомления — после отъезда камеры (иначе первое выше безопасной зоны)
T.done = 4.2;
T.reply = 4.35; T.type = 4.45;
T.out = 7.35;
T.end = 8.0;
const D = Math.round(T.end * FPS) / FPS;

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: P.bg }, svg);
const stage = S('g', {}, svg);                         // «камера» — трансформация этой группы
{
  const pat = S('pattern', { id: 'dots', width: 40, height: 40, patternUnits: 'userSpaceOnUse' }, defs);
  S('circle', { cx: 20, cy: 20, r: 2, fill: P.grid }, pat);
  S('rect', { x: -200, y: -200, width: W + 400, height: H + 400, fill: 'url(#dots)' }, stage);
}
const tx = (parent, x, y, str, size, weight, fill, anchor = 'start') => { const e = S('text', { x, y, 'font-family': UI, 'font-size': size, 'font-weight': weight, fill, 'text-anchor': anchor }, parent); e.textContent = str; return e; };
const check = (parent, cx, cy, s, stroke = '#fff') => S('path', { d: `M${cx - 0.42 * s} ${cy + 0.02 * s} L${cx - 0.12 * s} ${cy + 0.3 * s} L${cx + 0.42 * s} ${cy - 0.28 * s}`, fill: 'none', stroke, 'stroke-width': 0.16 * s, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);

let L = null;
function build() {
  const X0 = CARD.x, X1 = CARD.x + CARD.w, PAD = 32;
  // ---- уведомления (стопка над карточкой)
  const TOASTS = [
    { c: P.green, t: 'Клипы загружены', s: '3 из 3 · 0:39 материала' },
    { c: P.amber, t: 'Ритм найден', s: '112 ударов в минуту' },
    { c: P.accent, t: 'Склейки расставлены', s: '14 склеек по долям трека' },
  ];
  const TH = 92, TG = 14, TY = 318;
  const toasts = TOASTS.map((d, i) => {
    const g = S('g', {}, stage), inner = S('g', {}, g);
    S('rect', { x: X0 + 6, y: 8, width: CARD.w, height: TH, rx: 24, fill: P.shadow }, inner);
    S('rect', { x: X0, y: 0, width: CARD.w, height: TH, rx: 24, fill: P.card }, inner);
    S('circle', { cx: X0 + 50, cy: TH / 2, r: 24, fill: d.c }, inner); check(inner, X0 + 50, TH / 2, 26);
    tx(inner, X0 + 92, 40, d.t, 30, 600, P.ink); tx(inner, X0 + 92, 73, d.s, 25, 500, P.muted);
    tx(inner, X1 - 26, 40, 'сейчас', 21, 500, P.muted, 'end');
    return { g, inner, t0: T.n[i] };
  });

  // ---- карточка приложения
  const card = S('g', {}, stage);
  const cShadow = S('rect', { x: X0 + 10, y: CARD.y + 12, width: CARD.w, rx: 34, fill: P.shadow }, card);
  const cBody = S('rect', { x: X0, y: CARD.y, width: CARD.w, rx: 34, fill: P.card }, card);
  const parts = [];                                       // каскад содержимого
  const head = S('g', {}, card); parts.push(head);
  S('rect', { x: X0 + PAD, y: CARD.y + 26, width: 56, height: 56, rx: 16, fill: P.accent }, head);
  // знак приложения: две плёнки внахлёст
  S('rect', { x: X0 + PAD + 12, y: CARD.y + 40, width: 20, height: 28, rx: 5, fill: '#fff', opacity: 0.55 }, head);
  S('rect', { x: X0 + PAD + 24, y: CARD.y + 40, width: 20, height: 28, rx: 5, fill: '#fff' }, head);
  tx(head, X0 + PAD + 74, CARD.y + 52, 'Склейка', 32, 700, P.ink);
  tx(head, X0 + PAD + 74, CARD.y + 80, 'ассистент монтажа', 22, 500, P.muted);
  S('rect', { x: X0, y: CARD.y + 104, width: CARD.w, height: 2, fill: P.line }, head);

  const field = S('g', {}, card); parts.push(field);
  S('rect', { x: X0 + PAD, y: CARD.y + 126, width: CARD.w - 2 * PAD, height: 84, rx: 20, fill: P.field, stroke: P.line, 'stroke-width': 2 }, field);
  tx(field, X0 + PAD + 26, CARD.y + 178, 'Собери тизер из трёх клипов', 29, 500, P.ink);

  const THUMBS = [['#7d8fb3', '#5f7099', '0:12'], ['#b38a6d', '#94704f', '0:18'], ['#6fa58f', '#4f8670', '0:09']];
  const thumbs = THUMBS.map(([c0, c1, dur], i) => {
    const g = S('g', {}, card), x = X0 + PAD + i * 140, y = CARD.y + 230;
    S('rect', { x, y, width: 126, height: 76, rx: 14, fill: linGrad(defs, [[0, c0], [1, c1]]) }, g);
    S('path', { d: `M${x + 52} ${y + 24} L${x + 74} ${y + 38} L${x + 52} ${y + 52} Z`, fill: '#fff', opacity: 0.9 }, g);
    tx(g, x + 10, y + 69, dur, 20, 700, '#fff');
    parts.push(g); return g;
  });

  const BTN = { x: X0 + PAD, y: CARD.y + 328, w: CARD.w - 2 * PAD, h: 80, r: 22 };
  const btnG = S('g', {}, card); parts.push(btnG);
  const btn = S('rect', { x: BTN.x, y: BTN.y, width: BTN.w, height: BTN.h, rx: BTN.r, fill: P.accent }, btnG);
  const bclipId = 'btnClip', bcp = S('clipPath', { id: bclipId }, defs);
  S('rect', { x: BTN.x, y: BTN.y, width: BTN.w, height: BTN.h, rx: BTN.r }, bcp);
  const inBtn = S('g', { 'clip-path': `url(#${bclipId})` }, btnG);
  const progress = S('rect', { x: BTN.x, y: BTN.y, width: 0, height: BTN.h, fill: '#ffffff', opacity: 0.2 }, inBtn);
  const ripple = S('circle', { r: 0, fill: '#ffffff' }, inBtn);
  const by = BTN.y + BTN.h / 2 + 11;
  const lb = [tx(btnG, CX, by, 'Собрать тизер', 31, 700, '#fff', 'middle'), tx(btnG, CX, by, 'Собираю…', 31, 700, '#fff', 'middle'), tx(btnG, CX, by, 'Тизер готов', 31, 700, '#fff', 'middle')];

  // ---- ответ ассистента: перенос по словам заранее, печать по порциям
  const REPLY = 'Готово: тизер 0:39, 14 склеек ровно в долю.';
  const RS = 28, RW = 500, RLH = 38, bx = X0 + PAD + 50, byTop = BTN.y + BTN.h + 24;
  const lines = [];
  { let cur = '';
    for (const w of REPLY.split(' ')) { const nx = cur ? cur + ' ' + w : w; if (cur && textWidth(nx, RS, UI, 500) > RW) { lines.push(cur); cur = w; } else cur = nx; }
    lines.push(cur); }
  const starts = []; { let k = 0; lines.forEach(l => { starts.push(k); k += l.length + 1; }); }
  // порции: 1..6 символов, пауза 0,04..0,16 с, после знаков препинания — дольше (детерминированно)
  const chunks = [{ t: T.type, n: 0 }];
  { let n = 0, t = T.type, k = 0;
    while (n < REPLY.length) {
      n = Math.min(REPLY.length, n + 1 + Math.floor(hash01(k, 7) * 6));
      t += 0.035 + 0.1 * hash01(k, 8) + (/[,:.]/.test(REPLY[n - 1]) ? 0.12 : 0);
      chunks.push({ t, n }); k++;
    } }
  const typedAt = t => { let n = 0; for (const c of chunks) { if (c.t <= t) n = c.n; else break; } return n; };
  const tEnd = chunks[chunks.length - 1].t;
  // когда начинается каждая строка — по этим моментам пузырь (и карточка) растут пружиной
  const lineT = starts.map(s => chunks.find(c => c.n > s).t);
  const reply = S('g', {}, card);
  const avatar = S('g', {}, reply);
  S('circle', { cx: X0 + PAD + 20, cy: byTop + 30, r: 20, fill: P.accent }, avatar);
  S('circle', { cx: X0 + PAD + 20, cy: byTop + 30, r: 7, fill: '#fff' }, avatar);
  const bubble = S('rect', { x: bx, y: byTop, width: CARD.w - PAD - (bx - X0), rx: 20, fill: P.bubble }, reply);
  const rl = lines.map((_, j) => tx(reply, bx + 22, byTop + 40 + j * RLH, '', RS, 500, P.ink));
  const caret = S('rect', { width: 3, height: 32, rx: 1.5, fill: P.accent }, reply);
  const bubbleH = track(0, lineT.map((t, j) => [j ? t - 0.02 : T.reply, 58 + j * RLH, SP.snap]), SP.snap);

  // ---- курсор (в «камере»: при наезде остаётся на кнопке)
  const cur = S('g', {}, stage);
  const arrow = 'M0 0 L0 36 L9.5 27.5 L16 42 L22.5 39 L16 25 L28 25 Z';
  S('path', { d: arrow, fill: '#000', opacity: 0.18, transform: 'translate(3 5)' }, cur);
  S('path', { d: arrow, fill: '#fff', stroke: P.ink, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, cur);
  const ring = S('circle', { r: 0, fill: 'none', stroke: P.accent }, stage);

  const E = { x: CX + 92, y: BTN.y + 46 };                   // точка клика: правее центра, по тексту кнопки
  L = { toasts, TH, TG, TY, card, cShadow, cBody, parts, thumbs, btnG, btn, BTN, progress, ripple, lb, reply, avatar, bubble, rl, lines, starts, caret, typedAt, tEnd, bubbleH, byTop, bx, RS, cur, ring, E, baseH: BTN.y + BTN.h + 30 - CARD.y };
}

// ------------------------------------------------------------------ frame(t)
const PUSH = { r: 0.5, z: 1 };   // сдвиг стопки: без перелёта, соседи не сталкиваются
const bez = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * c + u * u * b;
function frame(t) {
  const { toasts, TH, TG, TY, card, cShadow, cBody, parts, btnG, btn, BTN, progress, ripple, lb, reply, avatar, bubble, rl, lines, starts, caret, typedAt, tEnd, bubbleH, byTop, bx, RS, cur, ring, E, baseH } = L;
  const gone = (i = 0) => ease.in4((t - T.out - i * 0.06) / 0.3);  // уход каскадом, power4.in

  // камера: наезд к кнопке и обратно (масштаб логарифмически вокруг неподвижной точки F на высоте клика;
  // F чуть левее точки клика — так при ×1,15 левый край текста карточки не выходит из безопасной зоны)
  const z = prog(t, T.zin, T.zinD, ease.inOut) - prog(t, T.zout, T.zoutD, ease.inOut), s = Math.exp(z * Math.log(1.15)), F = { x: 440, y: E.y };
  A(stage, 'transform', z > 1e-4 ? `translate(${f2(F.x)} ${f2(F.y)}) scale(${f2(s)}) translate(${f2(-F.x)} ${f2(-F.y)})` : '');

  // карточка: поп + каскад содержимого; высота растёт вместе с ответом
  const ci = t < T.card ? 0 : step(t - T.card, SP.popS), cg = gone(2);
  popAt(card, CX, CARD.y + 300, lerp(0.94, 1, ci) * (1 - 0.06 * cg), (t < T.card ? 0 : step(t - T.card, SP.out)) * (1 - cg), (1 - ci) * 40 + 60 * cg);
  parts.forEach((g, i) => rise(g, t < T.card + 0.1 + i * 0.06 ? 0 : step(t - T.card - 0.1 - i * 0.06, SP.fade), 14));
  const rIn = t < T.reply ? 0 : step(t - T.reply, SP.snap);
  const bh = bubbleH(t), h = baseH + bh + 24 * clamp(bh / 58);
  A(cBody, 'height', f2(h)); A(cShadow, 'height', f2(h));

  // кнопка: наведение -> нажатие -> «Собираю…» с прогрессом -> «Тизер готов»
  const hov = t < T.hover ? 0 : step(t - T.hover, SP.fade);
  const press = clamp((t - T.click) / 0.2), pr = press > 0 && press < 1 ? Math.sin(Math.PI * press) : 0;
  A(btn, 'fill', rgb(lerpV(lerpV(hex(P.accent), hex(P.accentHi), hov), hex(P.accentLo), pr)));   // mix() ждёт два hex — смешиваем векторы
  popAt(btnG, CX, BTN.y + BTN.h / 2, 1 - 0.03 * pr, 1);
  const pg = prog(t, T.busy, T.done - T.busy, ease.sine);
  A(progress, 'width', f2(BTN.w * pg)); A(progress, 'opacity', f2(0.22 * (1 - prog(t, T.done, 0.3))));
  const ru = clamp((t - T.click) / 0.6);
  A(ripple, 'cx', E.x); A(ripple, 'cy', E.y); A(ripple, 'r', f2(ru > 0 ? 40 + 460 * ease.out(ru) : 0)); show(ripple, ru > 0 && ru < 1 ? 0.3 * (1 - ru) : 0);
  const sw = (a, b) => (t < a ? 0 : step(t - a, SP.fade)) * (1 - prog(t, b - 0.12, 0.12, ease.in4));
  rise(lb[0], 1 - prog(t, T.busy - 0.12, 0.12, ease.in4), 0);
  rise(lb[1], sw(T.busy, T.done), 12);
  rise(lb[2], t < T.done ? 0 : step(t - T.done, SP.fade), 12);

  // ответ: аватар, пузырь растёт по строкам, печать порциями, каретка
  rise(avatar, rIn, 10);
  A(bubble, 'height', f2(Math.max(0, bubbleH(t)))); show(bubble, rIn);
  const n = typedAt(t);
  let cx_ = bx + 22, cy_ = byTop + 40;
  rl.forEach((e, j) => {
    const s0 = starts[j], vis_ = clamp(n - s0, 0, lines[j].length);
    setText(e, lines[j].slice(0, vis_)); show(e, rIn);
    if (n > s0) { cx_ = bx + 22 + (vis_ ? e.getComputedTextLength() : 0); cy_ = byTop + 40 + j * 38; }   // каретка — по реальной длине набранного
  });
  A(caret, 'x', f2(cx_ + 4)); A(caret, 'y', f2(cy_ - 26));
  const blink = t < tEnd + 0.1 ? 1 : (Math.floor((t - tEnd) / 0.45) % 2 ? 0 : 1);
  show(caret, t >= T.type - 0.1 ? blink * rIn : 0);

  // уведомления: новое сверху, старые съезжают вниз пружиной без перелёта
  toasts.forEach((o, i) => {
    show(o.g, t < o.t0 ? 0 : 1); if (t < o.t0) return;
    let y = TY;
    // старые начинают съезжать за 0,15 с до нового: место открывается раньше, чем оно проявится
    for (let k = i + 1; k < toasts.length; k++) y += (TH + TG) * after(t, toasts[k].t0 - 0.15, PUSH);
    const a = step(t - o.t0, SP.snap), g = gone(toasts.length - 1 - i);
    A(o.g, 'transform', `translate(0 ${f2(y - 26 * (1 - a) - 24 * g)})`);
    popAt(o.inner, CX, TH / 2, lerp(0.94, 1, a), step(t - o.t0, SP.fade) * (1 - g));
  });

  // курсор: въезд по кривой (пружина без перелёта) -> остановка -> клик -> отходит в сторону
  const u = step(t - T.cur, { r: 0.85, z: 1 });
  let px = bez(880, 930, E.x, u), py = bez(1500, 1180, E.y, u);
  const v = step(t - T.away, SP.tuck);
  px = lerp(px, E.x + 150, v); py = lerp(py, E.y + 190, v);
  const ps = 1 - 0.16 * pr;
  pose(cur, px, py, ps, ps, 0, (t < T.cur ? 0 : step(t - T.cur, SP.fade)) * (1 - gone(0)));
  const ku = clamp((t - T.click) / 0.45);
  A(ring, 'cx', E.x); A(ring, 'cy', E.y); A(ring, 'r', f2(18 + 46 * ease.out(ku))); A(ring, 'stroke-width', f2(5 * (1 - ku)));
  show(ring, ku > 0 && ku < 1 ? 0.8 * (1 - ku) : 0);
}

// ------------------------------------------------------------------ звук
sfx(T.click, 'click', -6);
T.n.forEach((tn, i) => sfx(tn, 'pop', -15 + i));
sfx(T.done, 'ding', -12);
sfx(T.out, 'whoosh', -16);

// ------------------------------------------------------------------ boot
window.DURATION = D;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, D));
window.READY = (async () => { await loadFonts(); build(); frame(0); return true; })();
