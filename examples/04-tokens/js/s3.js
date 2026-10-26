// s3.js — поле словаря (напечатанные настоящие кусочки o200k, низкий контраст) и пирамида склеек « хорошо»
// (сцена 3) + отъезд ×0,6 (сцена 4). Пирамида — строго по номерам склеек из tokens.json; ярус задаёт только высоту.
window.SC = window.SC || {};

// ------------------------------------------------------------------ поле словаря: запечённый PNG
// Запечено в «читаемом» контрасте сцены 4; всё остальное время лежит приглушённым (непрозрачность 0,45 → контраст ниже
// прежнего на ~35 %): реже, крупнее, без ряби под субтитрами. Читаемым передним планом становится только в отъезде ×0,6.
SC.field = async (ctx) => {
  const { L } = ctx;
  const FR = { x0: -330, y0: 1290, x1: 1150, y1: 3830 };
  const w = FR.x1 - FR.x0, h = FR.y1 - FR.y0;
  const c = cnv(w, h), g = c.getContext('2d');
  const F = TOK.field;
  g.font = '500 28px "JetBrains Mono"';
  g.textBaseline = 'middle';
  let n = 0, row = 0;
  // полосы субтитров в кадрах сцен 3 и 5 (мировые y) — там поля нет
  const CAP_Y = [LY.s3.y + 1202 - 960, LY.s5.y + 1202 - 960];
  const edge = (x, y) => {
    const wy = y + FR.y0, wx = x + FR.x0;
    const ex = Math.min(x - 0, w - x) / 160, top = (y - 20) / 200, bot = (h - y) / 220;
    // просветы: под пирамидой и под сценой 5
    const dx = (wx - 450) / 470, dy = (wy - LY.pyr0 + 330) / 470, rr2 = Math.sqrt(dx * dx + dy * dy);
    const d5x = (wx - 600) / 560, d5y = (wy - LY.s5.y + 120) / 470, r5 = Math.sqrt(d5x * d5x + d5y * d5y);
    const clr = (0.3 + 0.7 * clamp((rr2 - 0.75) / 0.45)) * (0.18 + 0.82 * clamp((r5 - 0.8) / 0.5));
    const cap = Math.min(...CAP_Y.map(cy => clamp((Math.abs(wy - cy) - 70) / 60)));
    return clamp(Math.min(ex, top, bot)) * clr * cap * (0.72 + 0.28 * fbm1(x * 0.004 + y * 0.003, 4));
  };
  for (let y = 36; y < h - 10; y += 70, row++) {
    let x = 14 + (row % 2) * 46 + hash01(row, 9) * 40;
    while (x < w - 80) {
      const p = F[(n * 7 + row * 13) % F.length]; n++;
      const s = p.text.replace(/ /g, '·');
      const bw = Math.max(60, s.length * 16.8 + 26);
      const o = edge(x + bw / 2, y) * (hash01(n, 3) < 0.32 ? 0 : 1);
      if (o > 0.02) {
        g.globalAlpha = o;
        g.fillStyle = '#EDE8DE';
        g.beginPath(); g.roundRect(x, y - 24, bw, 48, 6); g.fill();
        g.strokeStyle = '#CFC8BA'; g.lineWidth = 1.8; g.stroke();
        g.fillStyle = '#A39D92'; g.fillText(s, x + 13, y + 1);
      }
      x += bw + 18 + hash01(n, 4) * 16;
    }
  }
  g.globalAlpha = 1;
  // тихий вариант: размыт на 2,5 px и почти в тон листа (контраст ≤ 8 %); читаемый — только на полке отъезда
  const q = cnv(w, h), qg = q.getContext('2d');
  qg.filter = 'blur(2.5px)'; qg.globalAlpha = 0.34; qg.drawImage(c, 0, 0);
  const imQ = S('image', { href: await toURL(q), x: FR.x0, y: FR.y0, width: w, height: h }, L.field);
  const imR = S('image', { href: await toURL(c), x: FR.x0, y: FR.y0, width: w, height: h, opacity: 0 }, L.field);
  function frame(t) {
    const up = ease.inOut(prog(t, T.pull + 0.25, 0.4)), dn = ease.inOut(prog(t, T.pullIn, 0.5));
    const r = up * (1 - dn);
    show(imR, r); show(imQ, 1 - 0.6 * r);
  }
  return { frame, mapT: 0 };
};

// ------------------------------------------------------------------ пирамида склеек
SC.pyr = async (ctx) => {
  const { L, API } = ctx;
  const M = TOK.merges, ST = M.steps, SL = LY.slots;
  const ROW_Y = r => LY.pyr0 - r * 160, TH = 110;
  const slotOf = b => (b === 0 ? 0 : Math.floor((b - 1) / 2) + 1);
  const tone = k => (k % 2 ? 'gray' : 'kraft');
  const BYTES = M.bytes.map(b => b.byte);                    // 20 d1 85 d0 be …
  const LET = ['·', ...'хорошо'];
  // ---- основа: пробел и 12 половинок-байтов → 6 букв (защёлка на месте)
  const halves = [];
  for (let b = 1; b < 13; b++) {
    const s = slotOf(b), left = (b - 1) % 2 === 0, sl = SL[s];
    const t = makeTile(L.tiles, L.sh, { w: 44, h: TH, tone: tone(s), r: 5, depth: 4 });
    tText(t.front, BYTES[b], { size: 30, font: FONT.mono, weight: 700 });
    halves.push({ b, s, left, t, x: left ? sl.x0 + 22 : sl.x1 - 22 });
  }
  const space = makeTile(L.tiles, L.sh, { w: SL[0].w, h: TH, tone: 'kraft', r: 6, depth: 5 });
  S('circle', { cx: 0, cy: -12, r: 8, fill: PAL.graphite }, space.front);
  tText(space.front, '20', { y: 34, size: 24, font: FONT.mono, weight: 500, fill: PAL.graphite });
  const letters = [];
  for (let s = 1; s <= 6; s++) {
    const sl = SL[s];
    const t = makeTile(L.tiles, L.sh, { w: sl.w, h: TH, tone: tone(s), r: 6, depth: 5, yellow: true });
    tText(t.front, LET[s], { y: -14, size: 62, weight: 700 });
    const bb = BYTES[2 * s - 1], bc = BYTES[2 * s];
    tText(t.front, bb, { x: -22, y: 36, size: 24, font: FONT.mono, weight: 500, fill: PAL.graphite });
    tText(t.front, bc, { x: 22, y: 36, size: 24, font: FONT.mono, weight: 500, fill: PAL.graphite });
    // шов половинок — бороздка
    S('path', { d: `M-0.8 ${-TH / 2 + 8}V${TH / 2 - 8}`, stroke: PAL.line, 'stroke-opacity': 0.45, 'stroke-width': 1.6 }, t.front);
    S('path', { d: `M1.4 ${-TH / 2 + 8}V${TH / 2 - 8}`, stroke: '#FFFFFF', 'stroke-opacity': 0.5, 'stroke-width': 1.2 }, t.front);
    letters.push({ s, t, sl });
  }
  // ---- шаги: восстанавливаем, кто с кем склеился (части по байтам)
  let parts = [{ kind: 'space', lo: 0, hi: 0, row: 0 }];
  for (let b = 1; b < 13; b++) parts.push({ kind: 'half', lo: b, hi: b, row: 0, half: halves[b - 1] });
  const SNAP = [0, 0.15, 0.3, 0.45, 0.6, 0.75];
  const dM = Math.min(0.28, 0.9 * T.mStep);
  const MT = [[T.m1, 0.7], [T.m2, 0.36], [T.m3, dM], [T.m4, dM], [T.m5, dM], [T.m6, Math.max(dM, 0.3)]];
  const merged = [];
  ST.forEach((st, i) => {
    const li = parts.findIndex(p => p.lo === st.bytes[0]), a = parts[li], b = parts[li + 1];
    const s0 = slotOf(st.bytes[0]), s1 = slotOf(st.bytes[1]);
    if (i < 6) {
      const L_ = letters[s0 - 1];
      L_.tSnap = T.snap0 + SNAP[i]; L_.id = st.id; L_.halves = [a.half, b.half];
      parts.splice(li, 2, { kind: 'letter', lo: st.bytes[0], hi: st.bytes[1], row: 0, letter: L_ });
      return;
    }
    const [t0, D] = MT[i - 6];
    const row = st.tier - 1, x0 = SL[s0].x0, x1 = SL[s1].x1;
    const node = { i, id: st.id, text: st.text, row, x0, x1, cx: (x0 + x1) / 2, w: x1 - x0, y: ROW_Y(row), t0, D, kids: [a, b], vertex: i === ST.length - 1 };
    node.tLand = t0 + 0.82 * D;
    if (!node.vertex) {
      node.t = makeTile(L.tiles, L.sh, { w: node.w, h: TH, tone: (i % 2) ? 'gray' : 'kraft', r: 6, depth: 5, yellow: true });
      const lead = st.text.startsWith(' '), txt = st.text.trimStart(), tw0 = textWidth(txt, 46, 'Onest', 600) + (lead ? 22 : 0);
      if (lead) S('circle', { cx: -tw0 / 2 + 7, cy: -16, r: 6.5, fill: PAL.graphite }, node.t.front);
      tText(node.t.front, txt, { x: lead ? 11 : 0, y: -18, size: 46, weight: 600 });
      node.num = tText(node.t.front, String(st.id), { y: 30, size: 32, font: FONT.mono, weight: 700 });
    }
    parts.splice(li, 2, { kind: 'node', lo: st.bytes[0], hi: st.bytes[1], row, node });
    merged.push(node);
  });
  const VTX = merged[merged.length - 1];
  // на «Склеили» карандашом пунктиром — контуры будущих ярусов (3 px, #A9AEB8); склейки садятся в готовые гнёзда
  const guides = merged.map((n, i) => {
    const h = n.vertex ? 170 : TH, y = n.vertex ? n.y - 30 : n.y;
    const dd = drawDashed(L.sheetInk, rrHalves(n.x0, y - h / 2, n.w, h, 8), { stroke: '#A9AEB8', 'stroke-width': 3, 'stroke-dasharray': '12 9', 'stroke-linecap': 'round' });
    return { n, dd, t0: T.guides + [0.0, 0.08, 0.14, 0.24, 0.34, 0.44][i] };
  });
  API.vertex = { x: VTX.cx, y: VTX.y - 30, w: VTX.w, h: 170, t0: VTX.t0, tLand: VTX.tLand, D: VTX.D };
  API.base = { x: (SL[0].x0 + SL[6].x1) / 2, y: ROW_Y(0), w: SL[6].x1 - SL[0].x0, h: TH };
  const T_LAND = T.jump + 0.6, T_SH = T_LAND + 0.02;           // садится вместе с камерой           // 46825 падает на основу и рассыпается
  API.pyrLand = T_LAND;
  // ---- ярлыки-пометки (бумажные, уезжают)
  const slipA = makeSlip(L.tiles2, L.sh, 'русская буква = 2 байта', { size: 44 });
  const slipB = makeSlip(L.tiles2, L.sh, 'самая частая в текстах', { size: 44 });
  // ---- всплеск перед вершиной: настоящие кусочки 23695–46824 защёлкиваются в поле
  const BU = TOK.burst.pieces, bursts = [];
  S('feGaussianBlur', { stdDeviation: 1.5 }, S('filter', { id: 'burstBlur', x: '-10%', y: '-30%', width: '120%', height: '160%' }, ctx.defs));
  let tries = 0;
  while (bursts.length < BU.length && tries < 900) {
    tries++;
    const x = -10 + hash01(tries, 41) * 1100, y = 1990 + hash01(tries, 42) * 1050;
    const p = BU[bursts.length], s = p.text.replace(/ /g, '·'), bw = s.length * 16.8 + 26;
    const inPyr = (x + bw > 100 && x < 800 && y > LY.pyr0 - 720 && y < LY.pyr0 + 80) || (y > LY.pyr0 + 90 && y < LY.pyr0 + 240);
    const clash = bursts.some(b => Math.abs(b.y - y) < 58 && x < b.x + b.bw + 16 && x + bw + 16 > b.x);
    if (inPyr || clash || x + bw > 1090) continue;
    const g = S('g', { 'data-texture': '', filter: 'url(#burstBlur)' }, L.burst);
    S('path', { d: rr(0, -24, bw, 48, 6), fill: '#EFEAE0', stroke: '#CFC8BB', 'stroke-width': 1.8 }, g);
    const te = S('text', { x: 13, y: 9, 'font-family': FONT.mono, 'font-size': 28, 'font-weight': 500, fill: '#ABA59A' }, g);
    te.textContent = s;
    bursts.push({ g, x, y, bw, t0: T.burst + hash01(bursts.length, 43) * 0.16 });
  }
  // ---- сцена 4: подписи словаря — чернилами на листе
  // ярлык словаря — бумажный, на полке отъезда ×0,6 (не оставляет следа: петля и кадры сцен 5–7 чистые)
  const LAB = makeTile(L.tiles2, L.sh, { w: textWidth('GPT-4o и GPT-5', 96, 'Onest', 700) + 110, h: 500, tone: 'slip', r: 4, depth: 2, line: 0 });
  [['словарь', 700], ['GPT-4o и GPT-5', 700], ['≈ 200 000', 600], ['кусочков', 600]].forEach(([s, wgt], i) => tText(LAB.front, s, { y: -168 + i * 112, size: 96, weight: wgt }));
  const LABP = { x: LY.s4.x - 66, y: LY.s4.y + (398 - 960) / LY.s4.z };   // выше вершины и левее размытых плиток у края

  function frame(t) {
    const fade = ease.inOut(prog(t, T.pull + 0.1, 0.7));     // отъезд: плитки гаснут до тона поля
    const dimF = st => Math.max(st, 0.8 * fade);
    const lineO = 1 - 0.7 * fade, shO = 1 - 0.75 * fade;
    // рассыпание на двойках: время квантовано до 12 к/с, дрожание по шагу
    const sh = prog(t, T_SH, 0.32), q = Math.floor((t - T_SH) * 12), jit = (i, k) => (t < T_SH + 0.32 ? (hash01(q * 31 + i, k) - 0.5) : 0);
    const shUp = t < T_SH ? 0 : Math.sin(Math.PI * clamp(Math.floor(sh * 4) / 4));
    // пробел
    if (t < T_SH) space.hide();
    else space.set({ x: SL[0].cx + 6 * jit(0, 1), y: ROW_Y(0) - 26 * shUp + 5 * jit(0, 2), rot: 7 * jit(0, 3), lift: 4 + 16 * shUp, dim: dimF(0), lineO, edgeO: lineO, shO });
    // половинки: до своей защёлки
    halves.forEach((h, i) => {
      const L_ = letters[h.s - 1];
      if (t < T_SH || t >= L_.tSnap + 4 / 30) { h.t.hide(); return; }
      const sp = prog(t, L_.tSnap, 4 / 30, ease.in4);           // съезжаются за 4 кадра
      const x = lerp(h.x + (h.left ? -3 : 3), L_.sl.cx + (h.left ? -22 : 22), sp);
      h.t.set({ x: x + 9 * jit(i + 1, 1), y: ROW_Y(0) - 26 * shUp * (0.7 + 0.6 * hash01(i, 8)) + 6 * jit(i + 1, 2), rot: 9 * jit(i + 1, 3), lift: 4 + 18 * shUp });
    });
    // буквы
    letters.forEach(L_ => {
      if (t < L_.tSnap + 4 / 30) { L_.t.hide(); return; }
      const k = t - L_.tSnap - 4 / 30, kick = Math.exp(-k / 0.05) * 0.03;
      // активная пара / склеено: жёлтый и гашение берутся от узла-родителя
      const par = merged.find(n => n.kids.some(c => c.kind === 'letter' && c.letter === L_));
      const yel = par ? yelOf(par, t) : 0, dm = par && t >= par.tLand ? 0.5 : 0;
      L_.t.set({ x: L_.sl.cx, y: ROW_Y(0), s: 1 + kick, lift: 4, yel, dim: dimF(dm), lineO, edgeO: lineO, shO });
    });
    // узлы
    merged.forEach(n => {
      if (n.vertex) return;                                    // вершину ведёт hero.js
      if (t < n.t0 + 0.25 * n.D) { n.t.hide(); return; }
      const a = prog(t, n.t0 + 0.25 * n.D, 0.57 * n.D, ease.out4);
      const kidY = Math.min(...n.kids.map(c => ROW_Y(c.row)));
      const y = lerp(kidY - 18, n.y, a), s = lerp(0.9, 1, a);
      const land = t >= n.tLand ? step(t - n.tLand, { r: 0.26, z: 0.7 }) : 0;
      const par = merged.find(m => m.kids.some(c => c.kind === 'node' && c.node === n));
      const yel = par ? yelOf(par, t) : 0, dm = par && t >= par.tLand ? 0.5 : 0;
      n.t.set({ x: n.cx, y: y + (t >= n.tLand ? 3 * (1 - land) : 0), s, lift: lerp(16, 4, a), yel, dim: dimF(dm), lineO, edgeO: lineO, shO });
      const pr = prog(t, n.tLand + 0.03, 0.07);
      A(n.num, 'opacity', f2(pr)); A(n.num, 'transform', pr < 1 ? `scale(${f2(1 + 0.15 * (1 - pr))})` : '');
    });
    // ярлыки
    const slipAt = (sl, tin, tout, y) => {
      const i = ease.out4(prog(t, tin, 0.36)), o = ease.in4(prog(t, tout, 0.3));
      if (i <= 0 || o >= 1) { sl.hide(); return; }
      sl.set({ x: lerp(1360, 450, i) + 900 * o, y, rot: lerp(9, -1.5, i) + 7 * o, lift: 4 + 12 * (1 - i) + 10 * o });
    };
    slipAt(slipA, T.snap0 - 0.12, T.m1 - 0.2, LY.pyr0 + 105);   // под рядом (над ним — гнёзда ярусов), выше субтитров
    slipAt(slipB, T.m1 + 0.08, T.m4 - 0.3, LY.pyr0 + 105);
    guides.forEach(g => g.dd.draw(prog(t, g.t0, 0.3, ease.inOut) * (t < g.n.tLand ? 1 : 1 - prog(t, g.n.tLand, 0.1))));
    // всплеск
    bursts.forEach(b => {
      if (t < b.t0) { A(b.g, 'visibility', 'hidden'); return; }
      const p = step(t - b.t0, SP.popS);
      A(b.g, 'transform', `translate(${f2(b.x + b.bw / 2)} ${f2(b.y)}) scale(${f2(lerp(0.6, 1, p))}) translate(${f2(-b.bw / 2)} 0)`);
      // защёлкнулись — и через полсекунды уходят в тон поля
      // видны 0,3 с и гаснут совсем до посадки вершины (в её стоп-кадре всплеска нет)
      const off = prog(t, T.burst + 0.3, 0.12);
      if (off >= 1) { A(b.g, 'visibility', 'hidden'); return; }
      A(b.g, 'opacity', f2(clamp(p * 1.6) * (1 - off)));
      A(b.g, 'visibility', 'visible');
    });
    const li = ease.out4(prog(t, T.pull + 0.3, 0.35)), lo = ease.in4(prog(t, T.pullIn - 0.05, 0.3));
    if (li <= 0 || lo >= 1) LAB.hide();
    else LAB.set({ x: LABP.x - 1500 * (1 - li) - 1500 * lo, y: LABP.y, rot: lerp(-8, -1.2, li) - 6 * lo, lift: 4 + 14 * (1 - li) + 14 * lo });
  }
  // активная пара: жёлтая заливка у детей узла от его старта до посадки
  function yelOf(n, t) { if (t >= n.tLand) return 0; return prog(t, n.t0, 0.22 * n.D + 0.04, ease.out); }
  API.yelOfVertexKids = t => yelOf(VTX, t);
  // звуки: защёлки — тик с подъёмом; первая пара и вершина — стопка фишек
  sfx(letters[0].tSnap, 'tick', -15);                       // защёлки байтов — один тик на серию
  merged.forEach((n, i) => sfx(n.tLand - 0.03, i === 0 || n.vertex ? 'chips_stack' : 'tick', i === 0 || n.vertex ? -9 : -13));
  sfx(T_SH, 'chips_collide', -10);
  return { frame, mapT: 16.4 };
};
