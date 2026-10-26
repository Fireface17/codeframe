// s1.js — полоска вопроса (хук, сцена 2, финал) и россыпь с знаком канала.
// Полоска — крафтовая верстатка с 4 желобками; в желобках — серые строки с вопросом (как набор в типографии).
// Хук: «хорошо» срывается 7 плитками, три «о» заливаются жёлтым на «Ты · видишь · три», ряд схлопывается в одну плитку
// (её ведёт hero.js). Сцена 2: нож режет строки по границам кусочков, швы раскрываются волной, плитки переворачиваются
// номерами. Финал: на «Проверь:» обратный переворот, швы смыкаются — полоска снова как в кадре 0, и поднимается.
window.SC = window.SC || {};

SC.strip = async (ctx) => {
  const { L, API } = ctx;
  const QP = TOK.question.pieces;
  const TR = { cx: 470, cy: 570, w: 690, h: 540 };
  const CHX0 = 145, CHW = 650, CHY = [390, 510, 630, 750];
  const FS = 78, NS = 54, PADX = 18, PH = 84, DOT = 26, GAP = 14, X0 = 155, TX0 = 173;
  const LINES = [[0, 1], [2, 3], [4, 5, 6], [7, 8]];
  const WORD_OF = [0, 0, 1, 2, 3, 4, 4, 5, 5];
  const tw = s => textWidth(s, FS, 'Onest', 600);
  const spW = tw('a a') - 2 * tw('a');

  // ---- геометрия: печатное положение (строка целиком) и раскрытое (кусочки с зазорами)
  const P = QP.map((p, k) => ({ k, id: p.id, raw: p.text, lead: p.text.startsWith(' '), word: WORD_OF[k] }));
  LINES.forEach((ln, li) => {
    let str = '';
    ln.forEach((k, j) => {
      const p = P[k], atStart = j === 0, shown = atStart ? p.raw.trimStart() : p.raw;
      const off = tw(str || '​') * (str ? 1 : 0);
      p.line = li; p.j = j; p.first = atStart; p.last = j === ln.length - 1;
      p.txt = p.raw.trimStart();
      p.txtOff = off + (p.lead && !atStart ? spW : 0);     // x начала букв от TX0
      p.txtW = tw(p.txt);
      str += shown;
    });
    const lw = tw(str);
    ln.forEach((k, j) => {
      const p = P[k];
      const left = j === 0 ? X0 : TX0 + p.txtOff - (p.lead ? spW : 0) * (j === 0 ? 0 : 1);
      const nxt = P[ln[j + 1]];
      const right = j === ln.length - 1 ? TX0 + lw + PADX : TX0 + nxt.txtOff - (nxt.lead ? spW : 0);
      p.pr = { x0: left, x1: right, cx: (left + right) / 2, w: right - left };
    });
    // раскрытое положение
    let x = X0;
    ln.forEach(k => {
      const p = P[k];
      const contentW = p.txtW + (p.lead ? DOT : 0);
      const w = Math.max(contentW + 2 * PADX, monoW(String(p.id), NS) + 2 * PADX);
      p.op = { x0: x, x1: x + w, cx: x + w / 2, w };
      p.contentW = contentW;
      x += w + (li === 3 ? 20 : GAP);
    });
    ln.lineW = lw;
  });

  // ---- верстатка: тень и тело (поднимается в кадре 0 и в последних 6 к)
  const tray = makeTile(L.tiles, L.sh, { w: TR.w, h: TR.h, tone: 'kraft', r: 12, depth: 7 });
  const trayG = S('g', {}, L.tiles);                       // всё, что лежит на верстатке
  const chG = S('g', {}, trayG), trSh = S('g', {}, trayG), trT = S('g', {}, trayG);
  // желобки: утоплены, тень от верхней и левой стенки
  CHY.forEach(cy => {
    const y0 = cy - 50, x0 = CHX0, x1 = CHX0 + CHW, y1 = cy + 50;
    S('path', { d: rr(x0, y0, CHW, 100, 8), fill: '#BE9E72' }, chG);
    S('path', { d: rr(x0, y0, CHW, 100, 8), fill: 'url(#pGrain)', opacity: 0.8 }, chG);
    S('path', { d: `M${x0 + 2} ${y1 - 6}V${y0 + 9}Q${x0 + 2} ${y0 + 2} ${x0 + 9} ${y0 + 2}H${x1 - 6}V${y0 + 13}H${x0 + 13}V${y1 - 6}Z`, fill: PAL.shadow, opacity: 0.16 }, chG);
    S('path', { d: `M${x0 + 1} ${y1 - 8}V${y0 + 8}Q${x0 + 1} ${y0 + 1} ${x0 + 8} ${y0 + 1}H${x1 - 8}`, fill: 'none', stroke: '#7E623F', 'stroke-width': 3, 'stroke-linecap': 'round' }, chG);
    S('path', { d: `M${x0 + 8} ${y1 - 1}H${x1 - 8}Q${x1 - 1} ${y1 - 1} ${x1 - 1} ${y1 - 8}V${y0 + 8}`, fill: 'none', stroke: '#EBD7B4', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, chG);
  });
  // строки «как напечатано» (кадр 0) и кусочки
  const textEl = (parent, p, size = FS) => {
    const g = S('g', {}, parent);
    const dot = S('circle', { cx: 0, cy: 2, r: 6.5, fill: PAL.graphite }, g);
    const te = S('text', { x: 0, y: size * 0.35, 'font-family': 'Onest', 'font-size': size, 'font-weight': 600, fill: PAL.ink }, g);
    te.textContent = p.txt;
    return { g, dot, te };
  };
  const strips = LINES.map((ln, li) => {
    const x0 = X0, x1 = P[ln[ln.length - 1]].pr.x1, cx = (x0 + x1) / 2;
    const t = makeTile(trT, trSh, { w: x1 - x0, h: PH, tone: 'gray', r: 6, depth: 3, line: 2.5 });
    const texts = ln.map(k => { const e = textEl(t.front, P[k]); show(e.dot, 0); A(e.te, 'x', f2(TX0 + P[k].txtOff - cx)); return { k, ...e }; });
    return { li, t, cx, w: x1 - x0, texts };
  });
  const pieces = P.map(p => {
    const t = makeTile(trT, trSh, { w: p.pr.w, h: PH, tone: 'gray', r: 6, depth: 3, line: 2.5, yellow: p.k === 3 });
    const fr = textEl(t.front, p);
    const num = S('text', { x: 0, y: NS * 0.35, 'font-family': FONT.mono, 'font-size': NS, 'font-weight': 700, fill: PAL.ink, 'text-anchor': 'middle' }, t.back);
    num.textContent = String(p.id);
    let mark = null;
    if (p.k === 3) {                                       // «·о» 913: графитная точка — завязка финала
      mark = S('g', {}, t.back);
      mark.dot = S('circle', { cx: 0, cy: 0, r: 8, fill: PAL.graphite, stroke: PAL.ink, 'stroke-width': 0 }, mark);
    }
    return { p, t, fr, num, mark };
  });

  // ---- нож: стальное лезвие сверху, идёт по швам строк 1–3
  const seams = [];
  [0, 1, 2].forEach(li => LINES[li].slice(1).forEach(k => seams.push({ x: P[k].pr.x0, y: CHY[li], li, k })));
  const knifeSh = S('path', { fill: PAL.shadow, opacity: 0.1 }, L.propsSh);
  const knife = S('g', {}, L.props);
  const bladeD = 'M-7 -96L7 -96L9 30L0 58L-9 30Z';
  S('path', { d: bladeD, fill: '#CBD0D6', stroke: PAL.line, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, knife);
  S('path', { d: 'M-3 -90L-4 28', stroke: '#F5F7F9', 'stroke-width': 2.5, opacity: 0.8 }, knife);
  S('path', { d: 'M-10 -170H10V-96H-10Z', fill: '#6B7079', stroke: PAL.line, 'stroke-width': 2.5 }, knife);
  A(knifeSh, 'd', bladeD + 'M-10 -170H10V-96H-10Z');
  const slits = seams.map(s => drawStroke(trayG, `M${s.x} ${s.y - 40}L${s.x} ${s.y + 40}`, { stroke: PAL.line, 'stroke-width': 3 }));
  const SEAM_DT = 0.11;
  const seamT = j => T.cut + j * SEAM_DT;
  const lineCutEnd = li => { const js = seams.map((s, j) => s.li === li ? j : -1).filter(j => j >= 0); return seamT(js[js.length - 1]) + 0.09; };

  // ---- волны: раскрытие швов и переворот (неровный шаг)
  const OPEN = [0, 3, 1, 5, 2, 6, 4, 0, 7].map(f => f / 30);     // по кусочкам
  const FLIP = [0, 2, 3, 5, 7, 8, 10, 11, 13].map(f => f / 30);
  const BACK = [0, 1, 2, 3, 3, 4, 5, 5, 6].map(f => f / 30);     // финал: 0,2 с волна + 0,16 с
  const uOf = (k, t) => {
    const p = P[k];
    const o1 = ease.inOut(prog(t, T.open + OPEN[k], 0.42));
    const c1 = ease.inOut(prog(t, T.chk + 0.29, 0.14));            // швы смыкаются
    return o1 * (1 - c1);
  };
  const flipOf = (k, t) => {
    const f = ease.inOut(prog(t, T.flip + FLIP[k], 0.24));
    const b = ease.inOut(prog(t, T.chk + BACK[k], 0.16));
    return f * (1 - b);
  };
  // «?» после срыва слова отходит на 20 px и стоит отдельно; в финале зазор смыкается вместе со швами
  const qGap = t => 20 * ease.inOut(prog(t, T.hor - 0.04, 0.22)) * (1 - ease.inOut(prog(t, T.chk + 0.29, 0.14)));
  const rectOf = (k, t) => {
    const p = P[k], u = uOf(k, t);
    const extra = k === 8 ? qGap(t) * (1 - u) : 0;
    return { cx: lerp(p.pr.cx, p.op.cx, u) + extra, w: lerp(p.pr.w, p.op.w, u), cy: CHY[p.line], h: PH, u };
  };
  const T_SWAP = T.chk + 0.44;                                     // после смыкания — снова целые строки
  const karaO = (k, t) => COVER ? 1 : t >= T.chk ? 0.46 : lerp(0.46, 1, t >= WS(WORD_OF[k]) - 0.03 ? step(t - WS(WORD_OF[k]) + 0.03, SP.out) : 0);
  // кадр 0: полоска падает на лист (×1,06 → 1, −2,5° → 0, тень 24 → 6 px за 0,35 с); последние 0,33 с — обратно в ту же позу
  const trayK = t => t < 0.35 ? 1 - ease.inOut(t / 0.35) : t >= T.lift ? ease.inOut(prog(t, T.lift, DUR - T.lift)) : 0;
  const trayLift = t => lerp(2, 14, trayK(t));
  const trayRot = t => -2.5 * trayK(t);

  // ---- бумажный ярлык «= 9 номеров» под полоской и ярлык «та же „о“»
  const slip9 = makeTile(L.tiles, L.sh, { w: 650, h: 118, tone: 'slip', r: 3, depth: 2, line: 0 });
  const brace9 = inkStroke(slip9.front, braceD(-290, 290, -6, 30), { seed: 21, w: 5 });
  const txt9 = writeOn(slip9.front, '= 9 номеров', { x: 0, y: 42, size: 46, weight: 700, fill: PAL.ink, anchor: 'middle', font: 'Onest' });
  const slipOW = textWidth('тот же номер —', 54, 'Onest', 700) + 70;
  const slipO = makeTile(L.tiles2, L.sh, { w: slipOW, h: 172, tone: 'slip', r: 3, depth: 2, line: 0 });
  tText(slipO.front, 'тот же номер —', { y: -36, size: 54, weight: 700 });
  tText(slipO.front, 'та же строка', { y: 38, size: 54, weight: 700 });
  // финал: графит под полоской — его собственная запись «х о р о ш о»
  const FIN = [...'хорошо'].map((ch, i) => writeOn(L.sheetInk, ch, { x: 205 + i * 104, y: 925, size: 84, weight: 500, fill: PAL.graphite, anchor: 'middle', font: 'Onest' }));
  const finPencil = makePencil(L.props, L.propsSh, { len: 760, w: 44 });

  // ---- 7 плиток хука (· х о р о ш о): из печатного слова вниз в ряд y 1000
  const WORDP = P[7];
  const HOOK = [];
  const letters = ['·', ...'хорошо'];
  const STG = [0, 2, 3, 5, 6, 8, 9].map(f => f / 30);
  letters.forEach((ch, k) => {
    const sl = LY.slots[k];
    const t = makeTile(L.tiles, L.sh, { w: sl.w, h: 110, tone: k % 2 ? 'gray' : 'kraft', r: 6, depth: 5, yellow: true });
    let te;
    if (k === 0) te = S('circle', { cx: 0, cy: 0, r: 8, fill: PAL.graphite }, t.front);
    else te = tText(t.front, ch, { size: 76, weight: 700 });
    // старт: место буквы в напечатанном слове
    const pre = 'хорошо'.slice(0, Math.max(0, k - 1)), cw = k ? tw('хорошо'[k - 1]) : 20;
    const sx = k === 0 ? TX0 - 14 : TX0 + WORDP.txtOff + tw(pre) + cw / 2;
    HOOK.push({ k, t, te, sl, sx, sy: CHY[3], rot0: (hash01(k, 31) - 0.5) * 14, rot1: (hash01(k, 32) - 0.5) * 3.2, t0: T.hor + 0.07 + STG[k] });
  });
  const Y_AT = [0, 0, T.y1, 0, T.y2, 0, T.y3];
  const COLLAPSE = T.col, COL_D = 0.24;
  API.hookRow = { y: LY.row.y, x0: 122, x1: 778, tOff: COLLAPSE + COL_D };

  // ---- API для героя: гнездо (место «·хорошо» в 4-й строке)
  API.sock = t => {
    const r = rectOf(7, t);
    return { x: r.cx, y: r.cy, w: r.w, h: PH, s: trayScale(t) };
  };
  API.sockPrinted = { x: WORDP.pr.cx, y: CHY[3], w: WORDP.pr.w, txtX: TX0 + WORDP.txtOff - WORDP.pr.cx };
  API.oTile = t => { const r = rectOf(3, t); return { x: r.cx, y: r.cy, w: r.w, h: PH }; };
  API.tSwap = T_SWAP;
  API.karaO = karaO;
  const trayScale = t => 1 + 0.06 * trayK(t);

  function frame(t) {
    const lift = trayLift(t), s = trayScale(t), rot = trayRot(t);
    tray.set({ x: TR.cx, y: TR.cy, lift, s, rot });
    A(trayG, 'transform', s !== 1 || rot ? `translate(${TR.cx} ${TR.cy}) rotate(${f2(rot)}) scale(${f2(s)}) translate(${-TR.cx} ${-TR.cy})` : '');
    // строки целиком: до разреза своей строки и после смыкания в финале
    strips.forEach(st => {
      const li = st.li;
      const cutDone = li === 3 ? T.hor - 0.02 : lineCutEnd(li);
      const on = t < cutDone || t >= T_SWAP;
      if (!on) { st.t.hide(); return; }
      const up = li === 3 ? ease.out(prog(t, T.lineUp, 0.2)) * (t < T.hor ? 1 : 0) : 0;
      const tr = up ? 1.0 * Math.sin(2 * Math.PI * 7 * (t - T.lineUp)) * up : 0;
      st.t.set({ x: st.cx, y: CHY[li], lift: 2 + 5.3 * up, rot: tr, s: 1 + 0.012 * up });
      st.texts.forEach(e => A(e.te, 'opacity', f2(karaO(e.k, t))));
    });
    // кусочки
    pieces.forEach(pc => {
      const p = pc.p, k = p.k, li = p.line;
      let on;
      if (k === 7) on = t >= T.hor - 0.02 && t < T.hor + 0.07;   // слово в хуке приподнимается и рассыпается
      else if (li === 3) on = t >= T.hor - 0.02 && t < T_SWAP;
      else on = t >= seamT(seams.findIndex(s => s.li === li)) && t < T_SWAP;
      if (!on) { pc.t.hide(); return; }
      const r = rectOf(k, t), fl = flipOf(k, t);
      let lift = 2 + 9 * Math.sin(Math.PI * fl), y = r.cy, sc = 1;
      if (k === 7) { const a = prog(t, T.hor - 0.02, 0.09, ease.out); lift = 7.3 + 9 * a; sc = 1.012 + 0.02 * a; }
      if (k === 8 && t < T.hor + 0.3) { const a = ease.inOut(prog(t, T.hor - 0.02, 0.28)); lift = lerp(7.3, 2, a); sc = lerp(1.012, 1, a); }
      // «·о» 913: на паузе после удара — заливка всей плитки (рифма с тремя 913), уходит до фразы 8
      const yel = k === 3 ? prog(t, T.penArr - 0.05, 0.18, ease.out) * (1 - prog(t, T.noteOut - 0.02, 0.2, ease.inOut)) : 0;
      pc.t.set({ x: r.cx, y, w: r.w, h: PH, lift, flip: fl, s: sc, yel });
      // текст: из печатного положения в центр с точкой-пробелом
      const prX = TX0 + p.txtOff - p.pr.cx, opX = -p.contentW / 2 + (p.lead ? DOT : 0);
      A(pc.fr.te, 'x', f2(lerp(prX, opX, r.u)));
      A(pc.fr.dot, 'cx', f2(lerp(prX - spW / 2, -p.contentW / 2 + 9, r.u)));
      show(pc.fr.dot, p.lead ? r.u : 0);
      A(pc.fr.te, 'opacity', f2(karaO(k, t)));
      if (pc.mark) {
        // точка: графит → в паузе после удара заливается жёлтым
        A(pc.mark, 'transform', `translate(${f2(r.w / 2 - 20)} ${f2(-PH / 2 + 18)})`);
      }
    });
    // нож
    const tk = t - T.cut;
    if (tk > -0.14 && tk < seams.length * SEAM_DT + 0.14) {
      let x, y, j = Math.floor(tk / SEAM_DT);
      if (tk < 0) { const a = ease.out((tk + 0.14) / 0.14); x = lerp(seams[0].x + 260, seams[0].x, a); y = lerp(seams[0].y - 260, seams[0].y - 60, a); }
      else if (j >= seams.length) { const a = ease.in4((tk - seams.length * SEAM_DT) / 0.14); const sl = seams[seams.length - 1]; x = lerp(sl.x, sl.x + 300, a); y = lerp(sl.y + 60, sl.y + 300, a); }
      else {
        const ph = (tk - j * SEAM_DT) / 0.085, s0 = seams[j];
        if (ph <= 1) { x = s0.x; y = lerp(s0.y - 60, s0.y + 60, ease.inOut(ph)); }
        else { const s1 = seams[Math.min(j + 1, seams.length - 1)], a = ease.inOut((ph - 1) / ((SEAM_DT - 0.085) / 0.085)); x = lerp(s0.x, s1.x, a); y = lerp(s0.y + 60, s1.y - 60, a); }
      }
      A(knife, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(16)`); show(knife, 1);
      A(knifeSh, 'transform', `translate(${f2(x + 10)} ${f2(y + 14)}) rotate(16)`); show(knifeSh, 1);
    } else { show(knife, 0); show(knifeSh, 0); }
    seams.forEach((s, j) => { const v = prog(t, seamT(j), 0.085, ease.inOut); slits[j].draw(t < lineCutEnd(s.li) ? v : 0); });
    // ярлык «= 9 номеров»
    const sIn = ease.out4(prog(t, T.flip - 0.08, 0.4)), sOut = ease.in4(prog(t, T.penArr - 0.34, 0.3));   // уходит до пометки: уголки не торчат
    if (sIn <= 0 || sOut >= 1) slip9.hide();
    else {
      slip9.set({ x: lerp(-380, 470, sIn) - 900 * sOut, y: 905 + 300 * sOut, rot: lerp(-6, -0.8, sIn) - 8 * sOut, lift: 3 + 10 * (1 - sIn) + 10 * sOut });
      brace9.draw(prog(t, T.flip + 0.12, 0.4, ease.inOut));
      txt9.draw(prog(t, T.flip + 0.34, 0.3, ease.out));
    }
    const oIn = ease.out4(prog(t, T.penArr - 0.04, 0.28)), oOut = ease.in4(prog(t, T.noteOut, 0.28));
    if (oIn <= 0 || oOut >= 1) slipO.hide();
    else slipO.set({ x: lerp(1250, 470, oIn) + 900 * oOut, y: 1012, rot: lerp(8, -1.5, oIn) + 6 * oOut, lift: 3 + 12 * (1 - oIn) + 10 * oOut });
    // графит финала: по букве за 0,1 с; на «Проверь:» строчку стирает переворот (справа налево)
    FIN.forEach((f, i) => f.draw(prog(t, T.writeF + i * 0.1, 0.1, ease.out) * (1 - prog(t, T.chk + (5 - i) * 0.035, 0.1))));
    const fp = t - T.writeF;
    if (fp > -0.18 && fp < 1.05) {
      const inA = ease.out4(clamp((fp + 0.18) / 0.18)), outA = ease.in4(clamp((fp - 0.62) / 0.4)), k = clamp(fp / 0.6);
      finPencil(205 - 30 + 5 * 104 * k + 40 + 420 * (1 - inA) + 620 * outA, 895 + 8 * Math.sin(fp * 40) + 320 * (1 - inA) + 520 * outA, 34, (1 - inA) + 1.2 * outA + 0.12 * Math.abs(Math.sin(fp * 18)), 1);
    } else finPencil(0, 0, 0, 0, 0);
    // 7 плиток хука
    HOOK.forEach(h => {
      const on = t >= h.t0 - 0.001 && t < T.st1 - 0.1;
      if (!on) { h.t.hide(); return; }
      const p = step(t - h.t0, { r: 0.42, z: 0.82 }), pc = clamp(p);
      let x = lerp(h.sx, h.sl.cx, pc * pc), y = lerp(h.sy, LY.row.y, p) - 18 * Math.sin(Math.PI * pc) * (1 - pc);
      const rot = lerp(h.rot0, h.rot1, p), lift = 4 + 22 * Math.sin(Math.PI * pc);
      const s = lerp(0.84, 1, ease.out(clamp(p * 1.4)));
      // схлопывание (FLIP): съезжаются к центру с неровным стаггером, наползают и дорастают до плиты 720×250;
      // буквы гаснут внутри, жёлтые «о» — последними
      const isO = h.k % 2 === 0 && h.k > 0, d = [0.12, 0.07, 0.04, 0, 0.04, 0.07, 0.12][h.k];
      const cp = ease.inOut(prog(t, COLLAPSE + d, 0.38));
      x = lerp(x, 450 + (h.k - 3) * 104, cp); y = lerp(y, LY.row.y, cp);
      const yel = isO ? prog(t, Y_AT[h.k], 0.16, ease.out) * (1 - prog(t, T.st1 - 0.28, 0.16)) : 0;
      h.t.set({ x, y, rot: rot * (1 - cp), lift, s, yel, dim: 0, w: lerp(h.sl.w, 150, cp), h: lerp(110, 250, cp) });
      // буквы гаснут внутри до появления плиты (T.st1 − 0,1), «о» — последними; привязано к словам, не к секундам
      const fe = T.st1 - 0.14, fs = Math.min(COLLAPSE + 0.2, fe - 0.2);
      A(h.te, 'opacity', f2(1 - prog(t, fs + (isO ? 0.08 : 0), fe - fs + (isO ? 0.03 : 0) - (isO ? 0.08 : 0))));
      A(h.t.g, 'opacity', f2(1));
    });
  }
  // звуки
  sfx(0.02, 'chip_lay', -14);
  sfx(T.hor + 0.02, 'card_slide', -12);
  [2, 4, 6].forEach((k, i) => sfx([T.y1, T.y2, T.y3][i] - 0.02, 'tick', -12));
  sfx(T.col + 0.05, 'chips_collide', -11);
  seams.forEach((s, j) => { if (j % 2 === 0) sfx(seamT(j), 'slice', -13); });
  sfx(T.open, 'chips_handle', -15);
  sfx(T.flip, 'roll', -12);
  sfx(T.chk, 'roll', -13);
  return { frame, mapT: 10.6 };
};

// ------------------------------------------------------------------ россыпь под полоской и знак канала { | }
SC.scatter = async (ctx) => {
  const { L, API } = ctx;
  // реальные кусочки o200k (из tokens.json) и «рубашки»; знак — серая плитка с чернильными скобками
  const F = TOK.field;
  // настоящие кусочки o200k (графит), остальные лежат «рубашкой» вверх
  const RU = TOK.field.filter(p => /^ ?[а-я]{2,4}$/.test(p.text)).map(p => p.text.replace(' ', '·'));
  const items = [
    { x: 40, y: 1330, w: 150, h: 96, tone: 'gray', rot: -8, txt: RU[3] },
    { x: 1010, y: 1300, w: 160, h: 96, tone: 'kraft', rot: 9, txt: null },
    { x: 60, y: 1560, w: 140, h: 96, tone: 'kraft', rot: 6, txt: RU[11] },
    { x: 1050, y: 1590, w: 130, h: 96, tone: 'gray', rot: -4, txt: RU[17] },
    { x: 20, y: 1800, w: 140, h: 96, tone: 'gray', rot: 12, txt: null },
    { x: 1040, y: 1850, w: 150, h: 96, tone: 'kraft', rot: -11, txt: RU[23] },
    { x: 330, y: 1340, w: 130, h: 96, tone: 'kraft', rot: -5, txt: RU[29] },
  ];
  const tiles = items.map((it, i) => {
    const t = makeTile(L.tiles, L.sh, { w: it.w, h: it.h, tone: it.tone, r: 6, depth: 5 });
    if (it.txt) A(tText(t.front, it.txt, { size: 46, weight: 600, font: 'Onest', fill: PAL.graphite }), 'data-texture', '');   // россыпь — фактура, не текст для чтения
    return { ...it, t };
  });
  // знак канала: { | } чернилами на сером картоне
  const sign = makeTile(L.tiles, L.sh, { w: 190, h: 130, tone: 'gray', r: 10, depth: 6 });
  const sg = S('g', {}, sign.front);
  ['M-38 -46Q-52 -46 -52 -32V-12Q-52 0 -64 0Q-52 0 -52 12V32Q-52 46 -38 46', 'M38 -46Q52 -46 52 -32V-12Q52 0 64 0Q52 0 52 12V32Q52 46 38 46', 'M0 -30V30']
    .forEach(d => S('path', { d, fill: 'none', stroke: PAL.ink, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sg));
  const SIGN = { x: 880, y: 1420, rot: 6 };
  function frame(t) {
    // удар штампа №1 — локальный: соседи вздрагивают
    const k = t > T.st1 ? Math.exp(-(t - T.st1) / 0.08) * Math.sin((t - T.st1) * 60) : 0;
    // кадр 0: россыпь оседает неровной волной 0,05–0,4 с; в конце — обратно (шов петли)
    const settle = i => { const d = 0.05 + 0.3 * hash01(i, 91); return 1 - ease.inOut(prog(t, d, 0.25)) + ease.inOut(prog(t, DUR - d - 0.25, 0.25)); };
    tiles.forEach((it, i) => { const u = settle(i); it.t.set({ x: it.x + k * 3 * (hash01(i, 5) - 0.5) - 10 * u * (hash01(i, 8) - 0.5), y: it.y + k * 4 * (hash01(i, 6) - 0.5) - 16 * u, rot: it.rot + k * 1.2 * (hash01(i, 7) - 0.5) + 4 * u * (hash01(i, 9) - 0.5), lift: 4 + 10 * u, s: 1 + 0.03 * u }); });
    const us = settle(17);
    sign.set({ x: SIGN.x + k * 2, y: SIGN.y - 16 * us, rot: SIGN.rot + 2 * us, lift: 4 + 10 * us, s: 1 + 0.03 * us });
  }
  return { frame, mapT: 1 };
};
