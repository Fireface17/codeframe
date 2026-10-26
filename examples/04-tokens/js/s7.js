// s7.js — сцены 7–8: «Напиши по буквам через пробел: хорошо» → ответ плитками (3 пачки = 3 ряда сетки 3×2) →
// стрелка «на вход» → тот же переворот, что в сцене 2: 724 · 913 / 1839 · 913 / 2982 · 913 → крэш-зум ×1,6 →
// круги и жёлтая заливка трёх 913 → удар, штамп «3» на погашенном левом столбце → перо ведёт камеру к «·о» вопроса.
window.SC = window.SC || {};

SC.grid = async (ctx) => {
  const { L, API } = ctx;
  const AP = TOK.answer.pieces;                               // х ·о ·р ·о ·ш ·о
  const C7 = LY.s7, toW = (sx, sy) => ({ x: sx + C7.x - W / 2, y: sy + C7.y - H / 2 });
  const TS = 170, CG = 60, RG = 24;
  const G0 = toW(400, 560);                                   // левый верх сетки в кадре сцены 7
  const cellX = c => G0.x + TS / 2 + c * (TS + CG), cellY = r => G0.y + TS / 2 + r * (TS + RG);
  API.grid = { x: G0.x + 200, y: G0.y + 279, cellX, cellY };
  // ---- вырезка-запрос (крафт, как реплика пользователя)
  const reqLines = ['Напиши по буквам', 'через пробел:', 'хорошо'];
  const RQ = toW(470, 424), rqW = 660, rqH = 262;
  const req = makeTile(L.tiles, L.sh, { w: rqW, h: rqH, tone: 'kraft', r: 14, depth: 4, line: 2.5 });
  reqLines.forEach((s, i) => tText(req.front, s, { x: -rqW / 2 + 40, y: -80 + i * 80, size: 64, weight: 600, anchor: 'start' }));
  // ---- россыпь букв внизу кадра: оттуда прилетают кусочки ответа
  const PILE_L = ['а', 'к', 'е', 'т', 'н', 'и', 'л', 'с', 'в', 'м', 'у', 'д'];
  // только в правой половине низа: при отъезде ×0,6 (сцена 4) они за краем кадра
  // россыпь — своей группой: на кульминации уходит в глубину (блюр 6–8 px, −30 % контраста)
  const pileG = S('g', {}, L.tiles), pileSh = S('g', {}, pileG), pileT = S('g', {}, pileG);
  const pf = S('filter', { id: 'pileBlur', x: '-20%', y: '-20%', width: '140%', height: '140%' }, ctx.defs), pfb = S('feGaussianBlur', { stdDeviation: 0 }, pf);
  const pile = PILE_L.map((ch, i) => {
    const x = C7.x - 470 + (i % 6) * 178 + hash01(i, 61) * 50, y = C7.y + 370 + Math.floor(i / 6) * 175 + hash01(i, 62) * 50;
    const t = makeTile(pileT, pileSh, { w: 132, h: 132, tone: i % 2 ? 'gray' : 'kraft', r: 8, depth: 5 });
    A(tText(t.front, ch, { size: 74, weight: 700, fill: PAL.graphite }), 'data-texture', '');
    return { t, x, y, rot: (hash01(i, 63) - 0.5) * 30 };
  });
  // ---- шесть кусочков ответа
  const PK = [T.pk1, T.pk1, T.pk2, T.pk2, T.pk3, T.pk3];
  const ans = AP.map((p, k) => {
    const r = Math.floor(k / 2), c = k % 2;
    const t = makeTile(L.tiles2, L.sh, { w: TS, h: TS, tone: c ? 'kraft' : 'gray', r: 10, depth: 6, yellow: true });
    const lead = p.text.startsWith(' '), txt = p.text.trim();
    if (lead) S('circle', { cx: -44, cy: 10, r: 9, fill: PAL.graphite }, t.front);
    tText(t.front, txt, { x: lead ? 14 : 0, y: -4, size: 104, weight: 700 });
    const num = tText(t.back, String(p.id), { size: 60, font: FONT.mono, weight: 700 });
    const SPOT = [[0.9, 0.3], [3.3, 1.5], [1.9, 2.4], [2.7, 0.2], [0.3, 1.8], [4.1, 2.2]][k];
    const sx = C7.x - 420 + SPOT[0] * 210, sy = C7.y + 400 + SPOT[1] * 92;
    return { k, r, c, t, p, num, sx, sy, rot0: (hash01(k, 73) - 0.5) * 40, rot1: (hash01(k, 74) - 0.5) * 3, t0: PK[k] + (c ? 0.05 : 0) };
  });
  const FL = [T.fl7, T.fl7 + 0.35, T.fl7, T.fl7 + 0.55, T.fl7, T.fl7 + 0.75];
  const CIRC = [T.c1, T.c2, T.c3];
  // ---- стрелка «на вход» и подпись
  const BRx = toW(384, 0).x, BRy0 = toW(0, 560).y, BRy1 = toW(0, 1118).y, BRm = (BRy0 + BRy1) / 2;
  const brace = inkStroke(L.sheetInk, `M${BRx + 10} ${BRy0}Q${BRx - 6} ${BRy0} ${BRx - 6} ${BRy0 + 24}V${BRm - 24}Q${BRx - 6} ${BRm} ${BRx - 24} ${BRm}Q${BRx - 6} ${BRm} ${BRx - 6} ${BRm + 24}V${BRy1 - 24}Q${BRx - 6} ${BRy1} ${BRx + 10} ${BRy1}`, { seed: 52, w: 6 });
  // стрелка: от середины скобки вверх-влево к правому краю 46825 (~140 px); подпись слева от неё, под плиткой
  const arG = S('g', {}, L.sheetInk);
  const HE = toW(347, 714);
  const AR = [[BRx - 30, BRm + 8], [BRx - 64, BRm - 64], [HE.x, HE.y]];
  const arrow = inkArrow(arG, AR, { seed: 51, w: 6 });
  const arLab = writeOn(arG, 'на вход', { x: toW(128, 846).x, y: toW(128, 846).y, size: 46, weight: 700, fill: PAL.ink, font: 'Onest' });
  // ---- круги вокруг 913 (тёмные чернила 6 px)
  const loops = [0, 1, 2].map(r => inkLoop(L.over, cellX(1), cellY(r), 108, 95, { seed: 80 + r, w: 6 }));
  // ---- штамп №3 «3» на левом столбце
  const st3 = stampPrint(L.over, [{ t: '3', size: 400 }], { rot: -4, seed: 91 });
  const blk3 = makeStampBlock(L.props, 150, 300, { dir: -1, tilt: 8, side: 24 });   // узкий, входит слева сверху: правый край ≤ x 500, 913 видны
  // ---- перо: от третьей 913 к «·о» вопроса (финал)
  const pencil = makePencil(L.props, L.propsSh, { len: 820, w: 46 });
  const penLine = S('path', { fill: 'none', stroke: PAL.graphite, 'stroke-width': 6, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '0 1' }, L.over);
  const PA = { x: cellX(1) - 40, y: cellY(2) + 58 };
  const penB = () => { const o = API.oTile(T.penArr); return { x: o.x + o.w / 2 - 20, y: o.y - PH2 + 18 }; };
  const PH2 = 42;
  API.penRoute = [PA, penB()];
  const penAt = t => {                                         // та же кривая, что у камеры (inOut)
    const B = penB(), m = ease.inOut(prog(t, T.pen, 0.8));
    return { x: lerp(PA.x, B.x, m), y: lerp(PA.y, B.y, m) - 140 * Math.sin(Math.PI * m), m };
  };
  API.penAt = penAt;
  API.ans = ans;
  // ---- положение кусочка ответа во времени
  const SLIDE = T.arrow + 0.28;                                 // ряд ответа едет ко входу
  function ansState(a, t) {
    const p = step(t - a.t0, { r: 0.46, z: 0.8 }), pc = clamp(p);
    const sh = ease.inOut(prog(t, SLIDE, 0.45));
    const gx = cellX(a.c) + 12 * (1 - sh), gy = cellY(a.r);
    const x = lerp(a.sx, gx, p), y = lerp(a.sy, gy, p) - 120 * Math.sin(Math.PI * pc);
    const rot = lerp(a.rot0, a.rot1, p), s = lerp(132 / TS, 1, ease.out(pc));
    const fl = ease.inOut(prog(t, FL[a.k], 0.24));
    let lift = 4 + 30 * Math.sin(Math.PI * pc) + 9 * Math.sin(Math.PI * fl);
    // кульминация: три 913 приподнимаются (тень 4 → 12), левый столбец гаснет до 40 %
    const up = ease.inOut(prog(t, T.liftN, 0.4));
    let dim = 0, yel = 0;
    if (a.c === 1) { lift += 8 * up; yel = prog(t, CIRC[a.r], 0.2, ease.out); }
    else dim = 0.7 * up + 0.29 * prog(t, T.hit - 0.04, 0.08);   // на ударе левый столбец — 15 %
    return { x, y, rot, s, lift, flip: fl, dim, yel };
  }
  function frame(t) {
    // запрос
    const ri = step(t - T.req, { r: 0.44, z: 0.8 });
    // запрос приходит на «Попроси» и уезжает вверх перед переворотом (в крэш-зуме его не видно)
    // уходит на 120 px вверх с затуханием, без рывка
    const ro = ease.inOut(prog(t, T.fl7 - 0.5, 0.5));
    if (t < T.req || ro >= 1) req.hide(); else req.set({ x: RQ.x - 30 * ro, y: RQ.y - 260 * (1 - ri) - 120 * ro, rot: lerp(-7, -1.2, ri) - 2 * ro, lift: 4 + 26 * (1 - clamp(ri)) + 8 * ro, o: 1 - ro });
    pile.forEach(p => p.t.set({ x: p.x, y: p.y, rot: p.rot, lift: 4 }));
    const deep = prog(t, T.crash, 0.2) * (1 - prog(t, T.pen + 0.1, 0.4));
    A(pfb, 'stdDeviation', f2(4.8 * deep)); A(pileG, 'filter', deep > 0.01 ? 'url(#pileBlur)' : 'none'); A(pileG, 'opacity', f2(1 - 0.3 * deep));
    ans.forEach(a => {
      if (t < a.t0) { a.t.set({ x: a.sx, y: a.sy, rot: a.rot0, s: 132 / TS, lift: 4 }); return; }
      a.t.set(ansState(a, t));
    });
    brace.draw(prog(t, T.arrow, 0.22, ease.inOut));
    arrow.draw(prog(t, T.arrow + 0.16, 0.34, ease.inOut));
    arLab.draw(prog(t, T.arrow + 0.25, 0.3, ease.out));
    A(arG, 'opacity', f2(1 - prog(t, T.crash, 0.15)));        // на крэш-зуме гаснут: у края не торчит обрезок «од»
    loops.forEach((lp, r) => lp.draw(prog(t, CIRC[r], 0.26, ease.inOut)));
    // штамп «3»: брусок приходит сверху-слева, касание на T.hit; отпечаток — единственная пружина pop
    const ph = t < T.hit ? 1 - clamp((T.hit - t) / 0.28) : 1 + clamp((t - T.hit - 0.02) / 0.2);
    const cx3 = cellX(0), cy3 = cellY(1) + 6;
    blk3(t < T.hit - 0.28 ? 0 : ph, cx3, cy3, 0);
    if (t >= T.hit) { const k = step(t - T.hit, SP.pop); st3.set(1, cx3, cy3, lerp(1.22, 1, k)); } else st3.set(0, cx3, cy3);
    // перо и линия-указатель (хвост втягивается — к последнему кадру линии нет)
    const tp = t - T.pen;
    if (tp > -0.25 && tp < 1.45) {
      const P = penAt(t), inA = ease.out4(clamp((tp + 0.25) / 0.25)), outA = ease.in4(clamp((tp - 0.95) / 0.45));
      const lift = (1 - inA) + 0.25 * Math.sin(Math.PI * P.m) + outA * 1.4;
      pencil(P.x + 500 * (1 - inA) + 700 * outA, P.y + 380 * (1 - inA) + 560 * outA, 32, lift, 1);
      const B = penB();
      const d = `M${f2(PA.x)} ${f2(PA.y)}Q${f2((PA.x + B.x) / 2)} ${f2((PA.y + B.y) / 2 - 280)} ${f2(B.x)} ${f2(B.y)}`;
      A(penLine, 'd', d);
      const head = P.m, tail = clamp(P.m - 0.42 - 1.2 * clamp(tp - 0.8));
      A(penLine, 'stroke-dasharray', `0 ${f2(tail)} ${f2(Math.max(0, head - tail))} 2`);
      show(penLine, head - tail > 0.002 && tp > 0 ? 1 : 0);
    } else { pencil(0, 0, 0, 0, 0); show(penLine, 0); }
  }
  // звуки
  sfx(T.req, 'paper', -12);
  [T.pk1, T.pk2, T.pk3].forEach(tt => sfx(tt + 0.12, 'chip_lay', -11));
  sfx(T.arrow, 'pencil', -14);
  sfx(T.fl7, 'roll', -12);
  [1, 2, 3].forEach(r => sfx(FL[2 * r - 1], 'tick', -10));
  sfx(CIRC[0], 'pencil', -15); sfx(CIRC[2], 'pencil', -15);
  sfx(T.hit - 0.06, 'stamp', -4);
  sfx(T.hit + 0.13, 'ding', -9);
  sfx(T.pen + 0.02, 'pencil', -12);
  return { frame, mapT: 41.9 };
};
