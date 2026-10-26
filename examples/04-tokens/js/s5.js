// s5.js — сцена 5 «Как же он отвечает?». Внизу кадра — картотека-таблица на краю листа: в ящике лежат строки (полоски
// делений без цифр и букв). На «Букв перед ним нет» 46825 становится закладкой у своей строки, строка выезжает вверх;
// ярлык «номер = адрес строки». На «он их» карандаш выписывает графитом «х о р о ш о», на «считает» — три штриха под «о»
// с заминкой перед третьим (пауза, не исправление: ошибку на «хорошо» не показываем).
window.SC = window.SC || {};

SC.box = async (ctx) => {
  const { L, API } = ctx;
  const C5 = LY.s5, toW = (sx, sy) => ({ x: sx + C5.x - W / 2, y: sy + C5.y - H / 2 });
  // ---- картотека: крафтовый ящик со стенками, уходит за нижний край кадра
  const B0 = toW(56, 1286), BW = 968, BH = 900, WALL = 26;
  const boxG = S('g', {}, L.tiles);
  S('path', { d: rr(B0.x + 10, B0.y + 14, BW, BH, 16), fill: PAL.shadow, opacity: 0.11 }, L.sh);
  S('path', { d: rr(B0.x + 7, B0.y + 9, BW, BH, 16), fill: PAL.kraftEdge, stroke: PAL.line, 'stroke-width': 3 }, boxG);
  S('path', { d: rr(B0.x, B0.y, BW, BH, 16), fill: PAL.kraft, stroke: PAL.line, 'stroke-width': 3 }, boxG);
  S('path', { d: rr(B0.x, B0.y, BW, BH, 16), fill: 'url(#pGrain)', opacity: 0.9 }, boxG);
  S('path', { d: rr(B0.x, B0.y, BW, BH, 16), fill: 'url(#gLit)' }, boxG);
  S('path', { d: rr(B0.x + WALL, B0.y + WALL, BW - 2 * WALL, BH - 2 * WALL, 8), fill: '#B89870', stroke: PAL.line, 'stroke-width': 2.5 }, boxG);
  S('path', { d: `M${B0.x + WALL + 2} ${B0.y + BH - WALL - 4}V${B0.y + WALL + 2}H${B0.x + BW - WALL - 4}V${B0.y + WALL + 16}H${B0.x + WALL + 16}V${B0.y + BH - WALL - 4}Z`, fill: PAL.shadow, opacity: 0.2 }, boxG);
  // ---- строки таблицы: полоски с делениями (у каждой свой рисунок — «свой список чисел»)
  const RW = BW - 2 * WALL - 24, RH = 50, RP = 62, NR = 13, RX = B0.x + BW / 2, R0 = B0.y + WALL + 14 + RH / 2;
  const SEL = 1;                                              // строка с адресом 46825 — вторая сверху
  const ticks = (parent, w, h, seed, o = 1) => {
    let d = '';
    const n = 58;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 20 + i * ((w - 40) / (n - 1)), hg = 4 + (h * 0.5 - 8) * Math.pow(hash01(i, seed), 1.25);   // деления ≤ 50 % высоты
      d += `M${f2(x)} ${f2(h / 2 - 7)}V${f2(h / 2 - 7 - hg)}`;
    }
    return S('path', { d, stroke: '#A9AEB8', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: o }, parent);   // светлее штрихов счёта
  };
  const rows = [];
  for (let i = 0; i < NR; i++) {
    if (i === SEL) { rows.push(null); continue; }
    const t = makeTile(L.tiles, L.sh, { w: RW, h: RH, tone: i % 2 ? 'gray' : 'slip', r: 4, depth: 3, line: 2 });
    ticks(t.front, RW, RH, 100 + i, 0.55);
    rows.push(t);
  }
  // выбранная строка: выезжает вверх и встаёт над ящиком
  const SW = 900, SH = 72;
  const strip = makeTile(L.tiles2, L.sh, { w: RW, h: RH, tone: 'gray', r: 5, depth: 4, line: 2.5 });
  const stTicks = ticks(strip.front, SW, SH, 46825, 1);
  const SY0 = R0 + SEL * RP, SY1 = toW(0, 926).y;
  API.boxSlot = { x: toW(250, 0).x, y: SY0 + 2, w: 300, h: 92 };
  // ---- ярлык
  const slip = makeSlip(L.tiles2, L.sh, 'номер = адрес строки', { size: 46 });
  // ---- графит: «х о р о ш о» над строкой, три штриха под «о»
  const LX = toW(250, 0).x, LYb = toW(0, 700).y, SPC = 116;
  const letters = [...'хорошо'].map((ch, i) => writeOn(L.sheetInk, ch, { x: LX + i * SPC, y: LYb, size: 90, weight: 500, fill: PAL.graphite, anchor: 'middle', font: 'Onest' }));
  // штрихи счёта: 90 px, 7 px, наклон ±4°, до строки ≥ 60 px — не путаются с делениями
  const tickD = (i, j) => { const k = [-1, 1, -0.6][j] * 3.2; return `M${LX + i * SPC - k} ${LYb + 36}L${LX + i * SPC + k} ${LYb + 126}`; };
  const tally = [1, 3, 5].map((i, j) => inkStroke(L.sheetInk, tickD(i, j), { seed: 60 + j, w: 7, color: PAL.graphite, rough: 0.4 }));
  const pencil = makePencil(L.props, L.propsSh, { len: 760, w: 44 });
  const WT = T.write, CT = T.count;
  const LET_T = i => WT + i * 0.11;
  const TICK = [CT, CT + 0.22, CT + 0.66];                    // заминка перед третьим
  // строка «поднимается» над ящиком и доходит до полной длины
  const SOUT = T.box + 0.62;

  function frame(t) {
    rows.forEach((r, i) => { if (r) r.set({ x: RX, y: R0 + i * RP, lift: 2 }); });
    const a = ease.inOut(prog(t, SOUT, 0.62));
    const w = lerp(RW, SW, a), h = lerp(RH, SH, a);
    strip.set({ x: RX, y: lerp(SY0, SY1, a), w, h, lift: 2 + 14 * Math.sin(Math.PI * a) + 3 * a });
    A(stTicks, 'transform', `scale(${f2(w / SW)} ${f2(h / SH)})`);
    const si = ease.out4(prog(t, T.box + 0.42, 0.36)), so = ease.in4(prog(t, T.slipOut5, 0.3));
    if (si <= 0 || so >= 1) slip.hide();
    else slip.set({ x: lerp(1500, toW(500, 1050).x, si) + 900 * so, y: toW(0, 1050).y, rot: lerp(9, -1.5, si) + 7 * so, lift: 4 + 12 * (1 - si) + 10 * so });
    letters.forEach((l, i) => l.draw(prog(t, LET_T(i), 0.12, ease.out)));
    tally.forEach((k, j) => k.draw(prog(t, TICK[j], 0.12, ease.out)));
    // карандаш ведёт письмо и счёт, потом уходит вниз-вправо
    const t0 = WT - 0.18, t1 = TICK[2] + 0.35;
    if (t > t0 && t < t1 + 0.4) {
      // путь карандаша: письмо слева направо → к первой «о» → ко второй → к третьей (без телепортов)
      const WP = [[LET_T(5) + 0.12, LX + 5 * SPC + 30, LYb - 30]];
      [1, 3, 5].forEach((i, j) => WP.push([TICK[j] - 0.04, LX + i * SPC + 4, LYb + 120]));
      let px, py, lift = 0;
      if (t < WP[0][0]) { const k = clamp((t - WT) / (WP[0][0] - WT)); px = lerp(LX - 30, LX + 5 * SPC + 30, k); py = LYb - 30 + 10 * Math.sin(t * 38); lift = 0.12 * Math.abs(Math.sin(t * 18)); }
      else {
        let j = 1; while (j < WP.length - 1 && t > WP[j][0]) j++;
        const a = WP[j - 1], b2 = WP[j], k = ease.inOut(clamp((t - a[0] - (j > 1 ? 0.12 : 0)) / Math.max(0.05, b2[0] - a[0] - (j > 1 ? 0.12 : 0))));
        px = lerp(a[1], b2[1], k); py = lerp(a[2], b2[2], k); lift = 0.4 * Math.sin(Math.PI * k);
      }
      const inA = ease.out4(clamp((t - t0) / 0.18)), outA = ease.in4(clamp((t - t1) / 0.4));
      pencil(px + 420 * (1 - inA) + 620 * outA, py + 320 * (1 - inA) + 520 * outA, 34, lift + (1 - inA) + 1.2 * outA, 1);
    } else pencil(0, 0, 0, 0, 0);
  }
  sfx(SOUT, 'card_slide', -12);
  sfx(WT, 'pencil', -13);
  sfx(TICK[0] - 0.02, 'pencil', -16);                       // штрихи — графит, без тиков (тики — у трёх 913)
  return { frame, mapT: 22.8 };
};
