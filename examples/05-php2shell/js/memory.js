// memory.js — «лист памяти» (сценарий v5, фразы 3–5): бытовая модель, без кода и терминала.
// Чистый участок шва раскрывается белым листом → бланк-запрос собирается строчками → на «кончилась память» рвётся,
// верх улетает, остаются клочки → новый бланк ложится сверху и цепляет клочок → пунктирная чужая записка уходит под его край.

const FA = { x: 990, y: 462, rot: -2 };        // бланк A (центр в мире)
const FB = { x: 982, y: 602, rot: 2.5 };       // бланк B — садится в нижней части листа, на упавшие клочки
const FORM = { w: 196, h: 132 };
const LINES = [[-40, 150], [-26, 118], [-12, 160], [2, 138], [16, 112], [30, 150], [44, 92]];   // [y, длина] от x −84
const HALT_LINE = 4;                            // строка, на которой запрос обрывается (наполовину)

let _useN = 0;
function buildMemory() {
  const M = LY.mem, defs = L.defs;
  // ---- чистый лист: белая вырезка, раскрывается от центра клипом
  const shG = S('g', {}, L.memSh), shGrp = S('g', {}, shG);
  S('path', { d: rr(M.x0 + 5, M.y0 + 7, M.x1 - M.x0, M.y1 - M.y0, 6), fill: PAL.shadow, opacity: 0.09 }, shGrp);
  const shClip = clipRect(defs, shG);
  const sheetG = S('g', {}, L.mem), sg = S('g', {}, sheetG);
  const fd = rr(M.x0, M.y0, M.x1 - M.x0, M.y1 - M.y0, 6);
  S('path', { d: fd, fill: '#EEE7D8' }, sg);                       // лист памяти чуть темнее бланков
  S('path', { d: fd, fill: 'url(#pGrain)', opacity: 0.45 }, sg);
  S('path', { d: fd, fill: 'none', stroke: '#D9D2C4', style: olw(1.4) }, sg);
  const clip = clipRect(defs, sheetG);
  // ---- бланк A: содержимое один раз в <defs>, куски — <use> под своими клипами
  const idA = 'formA' + (++_useN), formA = S('g', { id: idA }, defs);
  const card = (g, w, h) => {
    S('path', { d: rrD(w, h, 4), fill: '#FFFFFF' }, g);
    S('path', { d: rrD(w, h, 4), fill: 'url(#pGrain)', opacity: 0.35 }, g);
    S('path', { d: rrD(w, h, 4), fill: 'none', stroke: '#CFC7B8', style: olw(1.2) }, g);
    plaque(g, -w / 2 + 14, -h / 2 + 9, 62, 9, PAL.graphite, 3);
    S('circle', { cx: w / 2 - 16, cy: -h / 2 + 14, r: 5, fill: 'none', stroke: PAL.graphite, style: olw(1.4) }, g);
  };
  card(formA, FORM.w, FORM.h);
  LINES.forEach(([y, len]) => S('path', { d: `M-84 ${y}H${-84 + len}`, stroke: '#E3DDD2', style: olw(2.2), 'stroke-linecap': 'round' }, formA));  // пустые строки
  const inkLines = LINES.map(([y, len], k) => drawStroke(formA, roughD(`M-84 ${y}L${-84 + len} ${y + (hash01(k, 5) - 0.5) * 2}`, { seed: 40 + k, roughness: 0.4, disableMultiStroke: true }), { stroke: PAL.ink, style: olw(2.6) }));
  // линия разрыва (слева направо, с волокном) и два надрыва вниз — три клочка
  const P = []; for (let x = -102; x <= 102; x += 10) P.push([x, -5 + (x === -102 || x === 102 ? 0 : (hash01(x + 200, 31) - 0.5) * 11)]);
  const yT = x => yAtX(P, x);
  const cut = (x0, x1, seed) => { const c = []; const yt = yT(x0); for (let k = 0; k <= 6; k++) { const u = k / 6; c.push([lerp(x0, x1, u) + (k && k < 6 ? (hash01(k, seed) - 0.5) * 9 : 0), lerp(yt, 70, u)]); } return c; };
  const C1 = cut(-34, -30, 51), C2 = cut(32, 37, 53);
  const seg = (a, b) => P.filter(p => p[0] >= a && p[0] <= b);
  const polys = {
    top: [[-102, -72], [102, -72], ...[...P].reverse()],
    s1: [[-102, P[0][1]], ...seg(-101, -34), [-34, yT(-34)], ...C1.slice(1), [-102, 70]],
    s2: [[-34, yT(-34)], ...seg(-34, 32), [32, yT(32)], ...C2.slice(1), ...[...C1].reverse()],
    s3: [[32, yT(32)], ...seg(32, 101), [102, P[P.length - 1][1]], [102, 70], ...[...C2].reverse()],
  };
  const edges = {               // рваные кромки каждого куска (рисуются после разрыва)
    top: [...P].reverse(), s1: [...seg(-102, -34), ...C1.slice(1)], s2: [...seg(-34, 32), ...C2.slice(1).concat([]).reverse().reverse()], s3: [...seg(32, 102)],
  };
  const dP = (pts, close = true) => pts.map((p, i) => (i ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1])).join('') + (close ? 'Z' : '');
  const pieces = {};
  for (const k of ['s1', 's2', 's3', 'top']) {
    const id = 'mp' + (++_useN), cp = S('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, defs);
    S('path', { d: dP(polys[k]) }, cp);
    const sh = S('path', { d: dP(polys[k]), fill: PAL.shadow, opacity: 0.075, stroke: PAL.shadow, 'stroke-opacity': 0.04, 'stroke-width': 5, 'stroke-linejoin': 'round' }, L.memSh);
    const g = S('g', {}, L.mem);
    const inner = S('g', { 'clip-path': `url(#${id})` }, g);
    S('use', { href: '#' + idA }, inner);
    const edge = S('path', { d: dP(edges[k], false), fill: 'none', stroke: '#EAD7B0', style: olw(2.4), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }, g);
    const edgeD = S('path', { d: dP(edges[k].map(([x, y]) => [x + 0.6, y + 1.2]), false), fill: 'none', stroke: '#B9AC98', 'stroke-opacity': 0.5, style: olw(0.9), opacity: 0 }, g);
    pieces[k] = { g, sh, edge, edgeD };
  }
  // кромка разрыва бежит справа налево (по всему бланку, поверх, пока куски вместе)
  const tearRun = drawStroke(L.mem, dP([...P].reverse(), false), { stroke: '#EAD7B0', style: olw(3) });
  const tearDark = drawStroke(L.mem, dP([...P].reverse().map(([x, y]) => [x, y + 2]), false), { stroke: '#2A2018', style: olw(1.6) });
  // ---- бланк B: новый запрос с пустым полем «пароль» и кнопкой «→» (надписи «ВХОД» нет)
  const fbSh = S('path', { d: rrD(188, 124, 4), fill: PAL.shadow, opacity: 0.08, stroke: PAL.shadow, 'stroke-opacity': 0.04, 'stroke-width': 6 }, L.memSh);
  const fbG = S('g', {}, L.mem);
  const noteLayer = S('g', {}, L.mem);                       // записка — под бланком B
  L.mem.appendChild(fbG);
  card(fbG, 188, 124);
  [[-40, 140], [-26, 110], [-12, 150]].forEach(([y, len], k) => S('path', { d: roughD(`M-80 ${y}L${-80 + len} ${y}`, { seed: 70 + k, roughness: 0.4, disableMultiStroke: true }), fill: 'none', stroke: PAL.ink, style: olw(2.6), 'stroke-linecap': 'round' }, fbG));
  const fieldBg = S('path', { d: rr(-80, 18, 118, 26, 5), fill: '#FFFFFF' }, fbG);
  const fieldOl = drawStroke(fbG, rr(-80, 18, 118, 26, 5), { stroke: PAL.line, style: olw(1.6) });
  const hint = tText(fbG, 'пароль', { x: -72, y: 31, size: 12, weight: 500, fill: '#8E939B', anchor: 'start' });
  const btn = S('g', {}, fbG);
  S('path', { d: rr(46, 18, 36, 26, 5), fill: PAL.graphite }, btn);
  ink(btn, 'M54 31H72M66 25L72 31L66 37', 2, { stroke: '#FBFAF6' });
  // ---- пунктирная чужая записка: пунктир со штриховкой, безымянная
  const noteSh = S('path', { d: rrD(96, 54, 5), fill: PAL.shadow, opacity: 0.06 }, L.memSh);
  const noteG = S('g', {}, noteLayer);
  const nid = 'nh' + (++_useN), ncp = S('clipPath', { id: nid, clipPathUnits: 'userSpaceOnUse' }, defs);
  S('path', { d: rrD(96, 54, 5) }, ncp);
  S('path', { d: rrD(96, 54, 5), fill: '#F7F3EA', opacity: 0.85 }, noteG);
  const hatch = S('g', { 'clip-path': `url(#${nid})` }, noteG);
  for (let k = -8; k <= 8; k++) S('path', { d: `M${k * 9 - 30} 30L${k * 9 + 30} -30`, stroke: PAL.graphite, 'stroke-opacity': 0.35, style: olw(1.1) }, hatch);
  S('path', { d: rrD(96, 54, 5), fill: 'none', stroke: PAL.ink, style: olw(2.4), 'stroke-dasharray': '7 5', 'stroke-linecap': 'round' }, noteG);
  // ---- чип «при определённых условиях · 9,2 из 10»
  const ch = makeTile(L.slip, L.slipSh, { w: 140, h: 64, tone: 'slip', r: 3, depth: 2, line: 0 });
  const chT = [tText(ch.front, 'при определённых условиях', { y: -14, size: 9.2, weight: 600, fill: PAL.graphite }), tText(ch.front, '9,2 из 10', { y: 13, size: 18, font: '"JetBrains Mono"', weight: 700 })];
  // клякса на месте обрыва записи (в содержимом бланка A — попадает в клочок)
  const hl = LINES[HALT_LINE];
  const blot = S('path', { d: 'M0 -5C4 -6 7 -3 6 1C8 4 4 7 0 6C-4 8 -8 4 -6 0C-8 -3 -4 -7 0 -5Z', fill: PAL.ink, opacity: 0, transform: `translate(${-84 + hl[1] * 0.5 + 3} ${hl[0]})` }, formA);
  // перо: стальной кончик с прорезью на коротком держателе — ведёт строку
  const nibSh = S('path', { d: 'M0 0L-7 -24L7 -24Z', fill: PAL.shadow, opacity: 0.12 }, L.memSh);
  const nib = S('g', {}, L.mem);
  const nibIn = S('g', { transform: 'rotate(-35)' }, nib);
  S('path', { d: rr(-9, -150, 18, 112, 6), fill: '#4E545E', stroke: PAL.line, style: olw(1.6) }, nibIn);
  S('path', { d: rr(-10, -46, 20, 14, 3), fill: '#B4B8BF', stroke: PAL.line, style: olw(1.4) }, nibIn);
  S('path', { d: 'M0 0L-9 -34Q-9 -38 -5 -38H5Q9 -38 9 -34Z', fill: '#C9CDD3', stroke: PAL.line, style: olw(1.6), 'stroke-linejoin': 'round' }, nibIn);
  S('path', { d: 'M0 -2V-22', stroke: PAL.line, style: olw(1.2) }, nibIn);
  S('circle', { cx: 0, cy: -24, r: 2.2, fill: PAL.line }, nibIn);
  R.mem = { sheetG, shClip, clip, pieces, tearRun, tearDark, inkLines, fbG, fbSh, hint, fieldBg, fieldOl, btn, noteG, noteSh, chip: ch, chipT: chT, blot, nib, nibSh };
  // плитки поля, которые лежат на месте листа: расходятся в стороны
  R.memTiles = R.fieldTiles.filter(t => t.x + t.w > M.x0 - 6 && t.x < M.x1 + 6 && t.y + ROWH > M.y0 && t.y < M.y1);
  R.memTiles.forEach(t => { t.mem = true; });
}

// кадр «листа памяти»
function memFrame(t) {
  const M = LY.mem, Rm = R.mem;
  // лист раскрывается от центра; плитки расходятся
  const op = ease.inOut(prog(t, T.part, 0.45));
  const w = (M.x1 - M.x0 + 12) * op;
  Rm.clip.set(M.cx - w / 2, M.y0 - 10, w, M.y1 - M.y0 + 24); Rm.shClip.set(M.cx - w / 2 + 4, M.y0 - 4, w + 8, M.y1 - M.y0 + 24);
  A(Rm.sheetG, 'visibility', op > 0.001 ? 'visible' : 'hidden');
  R.memTiles.forEach(tl => {
    const side = tl.x + tl.w / 2 < M.cx ? -1 : 1, d = 0.05 * hash01(tl.n, 9);
    const u = ease.inOut(prog(t, T.part + d, 0.42));
    A(tl.g, 'transform', u > 0 ? `translate(${f2(side * (40 + 50 * hash01(tl.n, 3)) * u)} 0)` : '');
    A(tl.g, 'opacity', f2(1 - u));
  });
  // бланк A влетает из-за верхнего края
  const pose = (dx, dy, rot, lift) => `translate(${f2(FA.x + dx)} ${f2(FA.y + dy)}) rotate(${f2(FA.rot + rot)})`;
  const inA = t < T.formA - 0.1 ? null : (() => { const a = ease.out4(clamp((t - T.formA + 0.1) / 0.42)), s = land(t, T.formA + 0.2, { r: 0.36, z: 0.8 }); return { dy: -330 * (1 - a), rot: 6 * (1 - a) + 1.5 * (1 - s), lift: lerp(18, 3, s) }; })();
  // строки: 0–3 целиком, 4 — до середины и стоп на «середине»; перо ведёт строку
  const avail = Math.max(0.8, T.halt - 0.22 - T.lines), stepL = avail / HALT_LINE;
  Rm.inkLines.forEach((ln, k) => {
    const t0 = T.lines + k * stepL;
    let v = k < HALT_LINE ? prog(t, t0, stepL * 0.86, ease.inOut) : k === HALT_LINE ? Math.min(0.5, prog(t, t0, stepL * 0.86, x => x)) : 0;
    ln.draw(v);
  });
  A(Rm.blot, 'opacity', f2(prog(t, T.halt + 0.04, 0.08)));
  {
    const q = clamp((t - T.lines) / stepL, 0, HALT_LINE + 0.5), k = Math.min(HALT_LINE, Math.floor(q)), f = q - k;
    let hx, hy = LINES[k][0];
    if (k === HALT_LINE) hx = -84 + LINES[k][1] * Math.min(0.5, f / 0.86);
    else if (f < 0.86) hx = -84 + LINES[k][1] * ease.inOut(f / 0.86);
    else { const u = ease.inOut((f - 0.86) / 0.14); hx = lerp(-84 + LINES[k][1], -84, u); hy = lerp(LINES[k][0], LINES[k + 1][0], u); }
    const jerk = t > T.halt ? 3 * Math.exp(-(t - T.halt) / 0.06) * Math.sin((t - T.halt) * 70) : 0;   // дёргается на «середине»
    const offA = ease.in4(prog(t, T.tear - 0.05, 0.45));                                          // на «кончилась» отлетает
    const ar = FA.rot * Math.PI / 180, wx = FA.x + hx * Math.cos(ar) - hy * Math.sin(ar), wy = FA.y + hx * Math.sin(ar) + hy * Math.cos(ar);
    const on = t >= T.lines - 0.3 && t < T.tear + 0.5;
    const inN = ease.out4(prog(t, T.lines - 0.3, 0.3));
    const x = wx + 220 * (1 - inN) + 260 * offA, y = wy - 2 + jerk - 260 * (1 - inN) - 300 * offA, lift = 0.4 + 2 * offA + 1.5 * (1 - inN);
    A(Rm.nib, 'transform', `translate(${f2(x)} ${f2(y - lift * 2)}) rotate(${f2(-4 + 20 * offA)})`); show(Rm.nib, on ? 1 : 0);
    A(Rm.nibSh, 'transform', `translate(${f2(x + 3 + 5 * lift)} ${f2(y + 4 + 7 * lift)}) rotate(-35)`); show(Rm.nibSh, on ? 0.9 : 0);
  }
  // разрыв: кромка бежит справа налево, верх улетает вверх-вправо, клочки падают вниз с поворотом и оседают
  const tr = prog(t, T.tear, 0.3, ease.out);
  Rm.tearRun.draw(tr * (1 - prog(t, T.tear + 0.32, 0.05))); Rm.tearDark.draw(tr * (1 - prog(t, T.tear + 0.32, 0.05)));
  A(Rm.tearRun, 'transform', pose(0, 0, 0)); A(Rm.tearDark, 'transform', pose(0, 0, 0));
  const fly = ease.in4(prog(t, T.tear + 0.2, 0.6)), jolt = prog(t, T.tear + 0.18, 0.12, ease.out);
  const fall = land(t, T.tear + 0.32, { r: 0.52, z: 0.72 });
  const SC = { s1: [-8, 118, -10], s2: [4, 100, 9], s3: [10, 124, -11] };
  const cat = ease.inOut(prog(t, T.catch, 0.5));                                                  // бланк B тащит клочок влево
  for (const k of ['s1', 's2', 's3', 'top']) {
    const pc = Rm.pieces[k];
    if (!inA) { show(pc.g, 0); show(pc.sh, 0); continue; }
    let dx = 0, dy = inA.dy, rot = inA.rot, lift = inA.lift;
    if (k === 'top') { dx += 190 * fly; dy += -360 * fly; rot += 16 * fly; lift += 26 * fly; }
    else {
      const [sx, sy, sr] = SC[k];
      dx += sx * fall + 3 * jolt * (1 - Math.min(1, fall)); dy += sy * fall - 6 * jolt * (1 - Math.min(1, fall)); rot += sr * fall; lift += 10 * jolt * (1 - Math.min(1, fall));
      if (k === 's2') { dx -= 32 * cat; rot += 6 * cat; }
    }
    A(pc.g, 'transform', pose(dx, dy, rot)); show(pc.g, k === 'top' ? 1 - clamp((fly - 0.85) / 0.15) : 1);
    const Ls = 2 + lift * 1.1;
    A(pc.sh, 'transform', `translate(${f2(FA.x + dx + Ls * 0.62)} ${f2(FA.y + dy + Ls)}) rotate(${f2(FA.rot + rot)})`); show(pc.sh, k === 'top' ? 1 - fly : 1);
    const e = t >= T.tear + 0.2 ? 1 : 0; A(pc.edge, 'opacity', e); A(pc.edgeD, 'opacity', e);
  }
  // бланк B летит сверху и садится внизу на клочки; на «подхватит» тащит клочок влево с поворотом
  if (t < T.formB - 0.1) { show(Rm.fbG, 0); show(Rm.fbSh, 0); }
  else {
    const a = ease.out4(clamp((t - T.formB + 0.1) / 0.4)), s = land(t, T.formB + 0.18, { r: 0.36, z: 0.8 });
    const dy = -420 * (1 - a), lift = lerp(18, 3, s), rot = FB.rot - 4 * (1 - s) + 6 * cat, dx = -32 * cat;
    A(Rm.fbG, 'transform', `translate(${f2(FB.x + dx)} ${f2(FB.y + dy)}) rotate(${f2(rot)})`); show(Rm.fbG, 1);
    const Ls = 2 + lift * 1.1;
    A(Rm.fbSh, 'transform', `translate(${f2(FB.x + dx + Ls * 0.62)} ${f2(FB.y + dy + Ls)}) rotate(${f2(rot)})`); show(Rm.fbSh, 1);
  }
  // поле «пароль» скрыто до «без»: рамка прочерчивается за 0,3 с, потом подсказка
  { const fo = prog(t, T.pass - 0.05, 0.3, ease.inOut); Rm.fieldOl.draw(fo); A(Rm.fieldBg, 'opacity', f2(fo)); show(Rm.btn, prog(t, T.pass + 0.15, 0.15)); A(Rm.hint, 'opacity', f2(prog(t, T.pass + 0.3, 0.2))); }
  texOn(Rm.hint, !win(t, T.pass + 0.3, T.y2004));
  // пунктирная чужая записка: въезжает справа и уходит под край бланка B к клочку
  if (t < T.note - 0.05) { show(Rm.noteG, 0); show(Rm.noteSh, 0); }
  else {
    const a = ease.out4(prog(t, T.note, 0.5)), b = ease.inOut(prog(t, T.slide, 0.6));
    const x = lerp(lerp(1230, 1066, a), 1012, b), y = lerp(lerp(632, 640, a), 652, b), rot = lerp(lerp(8, -3, a), 6, b);
    A(Rm.noteG, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(rot)})`); show(Rm.noteG, 1);
    const Ls = 2 + 8 * (1 - b);
    A(Rm.noteSh, 'transform', `translate(${f2(x + Ls * 0.62)} ${f2(y + Ls)}) rotate(${f2(rot)})`); show(Rm.noteSh, 1 - 0.6 * b);
  }
  // чип «при определённых условиях · 9,2 из 10»
  const g = slipPose(t, T.chip92, T.chip92Out, { fx: -40, fy: -120, ox: -160, oy: -260, or: -6, dOut: 0.3 });
  if (!g) Rm.chip.hide(); else Rm.chip.set({ x: 978 + g.x, y: 418 + g.y, rot: -2 + g.rot, s: g.s, lift: g.lift + 1, o: g.o });
  const f = win(t, T.chip92 + 0.2, T.chip92Out - 0.05); Rm.chipT.forEach(e => texOn(e, !f));
}
