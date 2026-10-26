// s6.js — карман на повороте подковы (сцена 6): графит выписывает strawberry, счёт под r обрывается на втором, скобка
// «повтор» над rr, графитная «2»; штамп №2 «2024 · по жалобам пользователей» (реконструкция); бумажные вырезки чата:
// «Сколько r в strawberry?» → «2» перелетает и становится ответом «Две.» → «Посчитай ещё раз» → «Их две.».
window.SC = window.SC || {};

SC.pocket = async (ctx) => {
  const { L, API } = ctx;
  const C6 = LY.s6, toW = (sx, sy) => ({ x: sx + C6.x - W / 2, y: sy + C6.y - H / 2 });
  const DRIFT = 120, F = (sx, sy) => toW(sx, sy + DRIFT);       // координаты конечного кадра (после проезда 120 px)
  // графит strawberry: буквы по одной (≤ 0,8 с)
  const SW = 'strawberry', FS = 92, LS = 8;
  const sx0 = F(196, 0).x, sy = F(0, 458).y;
  const cw = [...SW].map((ch, i) => textWidth(SW.slice(0, i + 1), FS, 'Onest', 500) + LS * (i + 1));
  const cx = i => sx0 + (i ? cw[i - 1] : 0) + (cw[i] - (i ? cw[i - 1] : 0)) / 2;
  const word = writeOn(L.sheetInk, SW, { x: sx0, y: sy, size: FS, weight: 500, fill: PAL.graphite, ls: LS, font: 'Onest' });
  const R = [2, 7, 8];
  const strokes = R.slice(0, 2).map((i, j) => inkStroke(L.sheetInk, `M${f2(cx(i))} ${sy + 26}L${f2(cx(i) + 2)} ${sy + 74}`, { seed: 70 + j, w: 6, color: PAL.graphite, rough: 0.5 }));
  const br = inkStroke(L.sheetInk, braceD(cx(7) - 30, cx(8) + 30, sy - 92, 22).replace(/M(\S+) (\S+)/, 'M$1 $2'), { seed: 74, w: 5 });
  const brLab = writeOn(L.sheetInk, 'повтор', { x: (cx(7) + cx(8)) / 2, y: sy - 128, size: 44, weight: 700, fill: PAL.ink, anchor: 'middle', font: 'Onest' });
  const two = S('g', {}, L.sheetInk);
  const twoT = S('text', { x: 0, y: 0, 'font-family': 'Onest', 'font-size': 140, 'font-weight': 500, fill: PAL.graphite, 'text-anchor': 'middle' }, two);
  twoT.textContent = '2';
  const TWO = F(190, 640);
  // штамп №2
  const st2 = stampPrint(L.sheetInk, [{ t: '2024', size: 136 }, { t: 'по жалобам пользователей', size: 38, mono: false, weight: 700 }], { frame: true, rot: -5, seed: 29 });
  const blk2 = makeStampBlock(L.props, 600, 280, { tilt: 10, side: 34 });
  const ST2 = F(600, 650);                                    // под словом, в ≥ 100 px от «2»: не читается «2 2024»
  // вырезки чата (бумага): реплики пользователя — крафт справа, ответы — белая бумага слева
  const bub = (lines, size, tone, right, sy2) => {
    const w = Math.max(...lines.map(s => textWidth(s, size, 'Onest', 600))) + 64, h = lines.length * size * 1.18 + 44;
    const t = makeTile(L.tiles, L.sh, { w, h, tone, r: 16, depth: 3, line: tone === 'slip' ? 2 : 2.5 });
    lines.forEach((s, i) => tText(t.front, s, { x: -w / 2 + 32, y: -((lines.length - 1) * size * 1.18) / 2 + i * size * 1.18, size, weight: 600, anchor: 'start' }));
    const p = F(right ? 802 - w / 2 : 140 + w / 2, sy2 + h / 2);     // справа текст кончается ≤ 780 (кнопки TikTok)
    return { t, w, h, x: p.x, y: p.y, right };
  };
  const B = [
    // вырезки ложатся стопкой поверх прошлых: в 27–28 с читаются две верхние
    // в кадре не больше двух реплик, обе целиком: пара «вопрос / Две.» уезжает на «Переспрашивали», её место
    // занимает «Посчитай ещё раз / Их две.»; зазор между карточками 20 px
    { b: bub(['Сколько r', 'в strawberry?'], 70, 'kraft', true, 770), t0: T.q, out: T.re - 0.06 },
    { b: bub(['Две.'], 84, 'slip', false, 999), t0: T.ans, out: T.re - 0.02 },
    { b: bub(['Посчитай ещё раз'], 70, 'kraft', true, 770), t0: T.re + 0.26 },
    { b: bub(['Их две.'], 84, 'slip', false, 917), t0: T.ans2 },
  ];
  // карандаш пишет strawberry
  const pencil = makePencil(L.props, L.propsSh, { len: 760, w: 44 });
  const REST = F(600, 1430);
  // обрезки бумаги от вырезок — внизу слева, у края листа
  const scraps = [[150, 1300, 12, 70], [300, 1390, -20, 54], [110, 1480, 33, 60], [420, 1520, 8, 46], [250, 1580, -8, 66], [880, 1350, 20, 50]].map(([sx, sy, rot, s], i) => {
    const p = F(sx, sy), g = S('g', {}, L.tiles);
    let d = ''; const n = 5 + (i % 3);
    for (let k = 0; k < n; k++) { const a = k / n * 6.283 + hash01(k, 300 + i) * 0.9, r = s * (0.55 + 0.45 * hash01(k, 310 + i)); d += (k ? 'L' : 'M') + f2(r * Math.cos(a)) + ' ' + f2(r * 0.7 * Math.sin(a)); }
    d += 'Z';
    S('path', { d, fill: PAL.shadow, opacity: 0.08, transform: 'translate(5 7)' }, g);
    S('path', { d, fill: i % 2 ? PAL.slip : PAL.kraft, stroke: PAL.line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
    return { g, x: p.x, y: p.y, rot };
  });
  const WT0 = T.straw, WD = 0.78;
  function frame(t) {
    const wp = prog(t, WT0, WD, x => x);
    word.draw(wp);
    strokes.forEach((s, j) => s.draw(prog(t, WT0 + WD + j * 0.1, 0.09, ease.out)));
    br.draw(prog(t, WT0 + WD + 0.22, 0.25, ease.inOut));
    brLab.draw(prog(t, WT0 + WD + 0.35, 0.25, ease.out));
    // карандаш: ведёт письмо, потом уходит вниз-вправо
    // после письма карандаш ложится на стол у края листа (низ кадра к концу проезда камеры)
    const tp = t - WT0;
    if (tp > -0.2) {
      const inA = ease.out4(clamp((tp + 0.2) / 0.2)), outA = ease.inOut(clamp((tp - WD - 0.35) / 0.55));
      const px = sx0 + word.w * clamp(wp) + 6, py = sy - 18 + 8 * Math.sin(tp * 40) * (1 - outA);
      const RX_ = REST.x, RY_ = REST.y;
      pencil(lerp(px + 400 * (1 - inA), RX_, outA), lerp(py + 300 * (1 - inA), RY_, outA), lerp(34, 14, outA), (1 - inA) + 1.6 * Math.sin(Math.PI * outA) + 0.15 * Math.abs(Math.sin(tp * 20)) * (1 - outA), 1);
    } else pencil(0, 0, 0, 0, 0);
    scraps.forEach(sc => { A(sc.g, 'transform', `translate(${f2(sc.x)} ${f2(sc.y)}) rotate(${sc.rot})`); });
    // «2» — на «сбивается»; на «две» перелетает в ответ
    const ti = prog(t, T.two, 0.16, ease.out), fly = ease.inOut(prog(t, T.ans - 0.08, 0.26));
    const dB = B[1].b, tgt = { x: dB.x - dB.w / 2 + 32 + 24, y: dB.y + 28 };
    if (ti <= 0 || fly >= 1) show(two, 0);
    else { A(two, 'transform', `translate(${f2(lerp(TWO.x, tgt.x, fly))} ${f2(lerp(TWO.y, tgt.y, fly) - 80 * Math.sin(Math.PI * fly))}) scale(${f2(lerp(1, 0.66, fly))})`); show(two, ti); }
    // штамп №2
    const ph = t < T.st2 ? 1 - clamp((T.st2 - t) / 0.28) : 1 + clamp((t - T.st2 - 0.03) / 0.22);
    blk2(t < T.st2 - 0.28 ? 0 : ph, ST2.x, ST2.y, -5);
    st2.set(t >= T.st2 ? 1 : 0, ST2.x, ST2.y);
    // вырезки
    B.forEach(({ b, t0, out }, i) => {
      if (t < t0) { b.t.hide(); return; }
      const a = step(t - t0, { r: 0.4, z: 0.8 }), o = out ? ease.in4(prog(t, out, 0.3)) : 0;
      if (o >= 1) { b.t.hide(); return; }
      b.t.set({ x: b.x + (b.right ? 200 : -200) * (1 - clamp(a)) - 1100 * o, y: b.y + 30 * (1 - clamp(a)) - 160 * o, rot: (b.right ? 4 : -4) * (1 - clamp(a)) + (b.right ? 0.8 : -0.8) - 6 * o, lift: 3 + 20 * (1 - clamp(a)) + 14 * o });
    });
  }
  API.pocket = { two: TWO };
  sfx(T.straw, 'pencil', -12);
  sfx(T.st2 - 0.05, 'stamp', -6);
  B.forEach(({ t0 }, i) => { if (i !== 2) sfx(t0 + 0.03, 'paper', -12 - (i % 2)); });
  return { frame, mapT: 31.2 };
};
