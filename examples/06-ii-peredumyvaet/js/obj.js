// obj.js — предметы ролика №6 на материале серии (mat.js): столбец чата, картонные карточки с текстом, малярный скотч,
// карандаш с ластиком и флажком, картонный лайк, отрывной календарь, сетка «2023», поднос, кармашек, листки, пометки ручкой.
// Всё — чистые функции времени: build создаёт SVG один раз, set(...) ставит состояние кадра.
// Карандаш, флажок и знак — из №5 (`projects/05-php2shell/js/obj.js`, свой код серии).

const RED = '#B5432F';                 // приглушённая красная ручка: только вердикт («?» на скотче, «≠», «✓» на «подтвердил»)
const GRAPH = '#434852';               // графит: реплики человека, надписи карандашом
const GRAPH_L = '#8A8F99';             // приглушённый графит (реплики пользователя в колонке теста, непроизнесённое)

// ------------------------------------------------------------------ мелочи
// пометка «фактура»: текст вне своего окна чтения не проверяется на безопасную зону
function texOn(el, on) { if (!el || el._tex === on) return; el._tex = on; if (on) el.setAttribute('data-texture', ''); else el.removeAttribute('data-texture'); }
const inkP = (parent, d, w = 3, attrs = {}) => S('path', { d, fill: 'none', stroke: PAL.ink, style: olw(w), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attrs }, parent);
// текст с якорем: start | middle | end; y — базовая линия
function txt(parent, str, { x = 0, y = 0, size = 40, font = FONT.text, weight = 600, fill = PAL.ink, anchor = 'start', ls = 0, o = 1 } = {}) {
  const t = S('text', { x, y, 'font-family': font, 'font-size': size, 'font-weight': weight, fill, 'text-anchor': anchor, 'letter-spacing': ls, opacity: o }, parent);
  t.textContent = str;
  return t;
}
const tw = (str, size, weight = 600, font = 'Onest', ls = 0) => textWidth(str, size, font, weight, ls);
// ширина пробела (SVG схлопывает пробел на конце строки, поэтому textWidth('слово ') его не считает)
const spaceW = (size, weight = 500, font = 'Onest') => textWidth('н н', size, font, weight) - 2 * textWidth('н', size, font, weight);
const dPts = (pts, close = true) => pts.map((p, i) => (i ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1])).join('') + (close ? 'Z' : '');

// ------------------------------------------------------------------ бумага: большой плоский лист (столбец чата, колонка теста)
// мягкая тень по силуэту, лицо чуть белее листа стола, тонкая кромка; без торца — это бумага, не картон
function makePaper(layer, shLayer, { x0, y0, w, h, r = 6, face = '#FBF9F3', edge = '#DAD2C2', grain = 0.35 } = {}) {
  const sg = S('g', {}, shLayer), g = S('g', {}, layer);
  S('path', { d: rr(x0 + 3, y0 + 6, w, h, r), fill: 'none', stroke: PAL.shadow, 'stroke-opacity': 0.035, 'stroke-width': 12, 'stroke-linejoin': 'round' }, sg);
  S('path', { d: rr(x0 + 3, y0 + 5, w, h, r), fill: PAL.shadow, opacity: 0.075 }, sg);
  S('path', { d: rr(x0, y0, w, h, r), fill: face }, g);
  S('path', { d: rr(x0, y0, w, h, r), fill: 'url(#pGrain)', opacity: grain }, g);
  S('path', { d: rr(x0, y0, w, h, r), fill: 'url(#gLit)', opacity: 0.6 }, g);
  S('path', { d: rr(x0, y0, w, h, r), fill: 'none', stroke: edge, style: olw(1.4) }, g);
  return { g, sg, x0, y0, w, h };
}

// ------------------------------------------------------------------ картонная карточка с текстом (makeTile + строки)
// lines: [{ t, size, weight, y (база от центра), x? (от левого края), anchor?, fill?, font? }]
function makeTextCard(layer, shLayer, { w, h, tone = 'gray', r = 7, depth = 5, line = 3, lines = [], pad = 28, yellow = false } = {}) {
  const tile = makeTile(layer, shLayer, { w, h, tone, r, depth, line, yellow });
  tile.texts = lines.map(l => txt(tile.front, l.t, {
    x: l.anchor === 'middle' ? (l.x ?? 0) : (l.x ?? (-w / 2 + pad)), y: l.y, size: l.size, weight: l.weight ?? 700,
    fill: l.fill ?? PAL.ink, anchor: l.anchor ?? 'start', font: l.font ?? FONT.text,
  }));
  tile.W = w; tile.H = h;
  return tile;
}

// ------------------------------------------------------------------ пометки: «?», «≠», «✓» (рукой, seed фиксирован)
// «?» ручкой: завиток и точка; рисуется от 0 до 1 (draw), можно сразу целиком
function penQ(parent, { size = 100, color = RED, w = 8, seed = 5 } = {}) {
  const g = S('g', {}, parent), k = size / 100;
  const d = `M${-26 * k} ${-24 * k}C${-24 * k} ${-46 * k} ${-6 * k} ${-52 * k} ${8 * k} ${-50 * k}C${26 * k} ${-47 * k} ${32 * k} ${-30 * k} ${24 * k} ${-17 * k}` +
    `C${17 * k} ${-6 * k} ${3 * k} ${-2 * k} ${1 * k} ${12 * k}L${0} ${20 * k}`;
  const stroke = drawStroke(g, roughD(d, { seed, roughness: 0.55, bowing: 0.5, disableMultiStroke: true, preserveVertices: true }), { stroke: color, 'stroke-width': w });
  const dot = S('path', { d: `M${-1.5 * k} ${38 * k}l${3 * k} ${1 * k}`, stroke: color, 'stroke-width': w * 1.25, 'stroke-linecap': 'round', fill: 'none' }, g);
  g.draw = v => { stroke.draw(clamp(v / 0.8)); show(dot, v >= 0.92 ? 1 : 0); };
  g.draw(1);
  return g;
}
// «≠» ручкой: две черты и наклонная
function penNeq(parent, { size = 90, color = RED, w = 9, seed = 21, wk = 1 } = {}) {
  const g = S('g', {}, parent), k = size / 100, b = 40 * k * wk;
  const s = [
    `M${-b} ${-14 * k}L${b} ${-16 * k}`, `M${-b} ${16 * k}L${b} ${14 * k}`, `M${16 * k * wk} ${-44 * k}L${-14 * k * wk} ${44 * k}`,
  ].map((d, i) => drawStroke(g, roughD(d, { seed: seed + i, roughness: 0.5, bowing: 0.6, disableMultiStroke: true }), { stroke: color, 'stroke-width': w }));
  g.draw = v => { s[0].draw(clamp(v / 0.33)); s[1].draw(clamp((v - 0.3) / 0.33)); s[2].draw(clamp((v - 0.62) / 0.38)); };
  g.draw(0);
  return g;
}
// галочка (карандашом или ручкой)
function penCheck(parent, { size = 60, color = GRAPH, w = 7, seed = 13 } = {}) {
  const k = size / 60;
  const p = drawStroke(parent, roughD(`M${-24 * k} ${-2 * k}L${-8 * k} ${16 * k}L${26 * k} ${-24 * k}`, { seed, roughness: 0.45, bowing: 0.4, disableMultiStroke: true, preserveVertices: true }), { stroke: color, 'stroke-width': w });
  return p;
}

// ------------------------------------------------------------------ малярный скотч: две полосы крепированной бумаги, рваные торцы
// Лицо — полупрозрачный беж с крепом поперёк ленты; на стыке полос — темнее (два слоя). Тень тонкая: лента плоская.
function tapeOutline(w, h, seed) {
  // рваные торцы: зубцы 3–7 px, неровный шаг; длинные края — ровные (заводской рез)
  const L = [], R = [], n = 9;
  for (let i = 0; i <= n; i++) {
    const y = -h / 2 + h * i / n;
    L.push([-w / 2 - (i % 2 ? 3 + 5 * hash01(i, seed) : 0) + 2 * (hash01(i, seed + 1) - 0.5), y]);
    R.push([w / 2 + (i % 2 ? 3 + 5 * hash01(i, seed + 2) : 0) + 2 * (hash01(i, seed + 3) - 0.5), y]);
  }
  // верхний край L[0] → R[0], правый торец вниз, нижний край к L[n], левый торец вверх
  return [L[0], ...R, ...L.slice().reverse()];
}
function tapeFace(parent, { w = 470, h = 150, seed = 3 } = {}) {
  // parent — группа с центром ленты в (0, 0)
  const sh = h * 0.56, gap = h - 2 * sh;                     // две полосы с нахлёстом
  const strips = [{ y: -h / 2 + sh / 2, rot: -0.6, dx: -6, s: seed }, { y: h / 2 - sh / 2, rot: 0.5, dx: 8, s: seed + 7 }];
  const out = [];
  strips.forEach((st, k) => {
    const g = S('g', { transform: `translate(${st.dx} ${f2(st.y)}) rotate(${st.rot})` }, parent);
    const P = tapeOutline(w, sh, st.s), d = dPts(P);
    S('path', { d, fill: '#E6D7AF', opacity: 0.95 }, g);
    S('path', { d, fill: 'url(#pCrepe)', opacity: 0.9 }, g);
    S('path', { d: `M${-w / 2 + 4} ${f2(-sh / 2 + 2)}H${w / 2 - 4}`, stroke: '#FFF8E6', 'stroke-opacity': 0.55, style: olw(2) }, g);   // свет на верхней кромке
    S('path', { d: `M${-w / 2 + 4} ${f2(sh / 2 - 1.5)}H${w / 2 - 4}`, stroke: '#B79F6E', 'stroke-opacity': 0.35, style: olw(1.6) }, g);
    S('path', { d, fill: 'none', stroke: '#B9A274', 'stroke-opacity': 0.55, style: olw(1.2) }, g);
    out.push(g);
  });
  // стык полос: второй слой ленты чуть темнее
  S('path', { d: rr(-w / 2 + 6, -gap / 2 - 1, w - 12, gap + 2, 1), fill: '#CDBB8C', opacity: 0.28 }, parent);
  return out;
}
// лента целиком: тень + лицо + «?» ручкой; peel 0..1 — правый конец отходит (подъём перед рывком)
function makeTape(layer, shLayer, { w = 470, h = 150, seed = 3, q = true, qx = 6 } = {}) {
  const sg = S('g', {}, shLayer), g = S('g', {}, layer);
  const shp = S('path', { d: rr(-w / 2, -h / 2, w, h, 2), fill: PAL.shadow, opacity: 0.09 }, sg);
  const body = S('g', {}, g);
  tapeFace(body, { w, h, seed });
  const qm = q ? penQ(body, { size: 104, color: RED, w: 9, seed: 5 }) : null;
  if (qm) A(qm, 'transform', `translate(${qx} 2) rotate(4)`);
  const T_ = { g, sg, body, qm, w, h };
  T_.set = (x, y, rot = 0, lift = 0, o = 1, sx = 1, sy = 1) => {
    if (o <= 0.002) { show(g, 0); show(sg, 0); return; }
    const s = 1 + 0.012 * lift;
    A(g, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(rot)}) scale(${f2(s * sx)} ${f2(s * sy)})`);
    const L_ = 1.5 + lift * 1.4;
    A(sg, 'transform', `translate(${f2(x + L_ * LIGHT.x)} ${f2(y + L_ * LIGHT.y)}) rotate(${f2(rot)}) scale(${f2(s * sx)} ${f2(s * sy)})`);
    A(shp, 'opacity', f2(0.09 - 0.035 * clamp(lift / 30)));
    show(g, o); show(sg, o);
  };
  T_.set(0, 0, 0, 0, 0);
  return T_;
}

// ------------------------------------------------------------------ карандаш: дерево, графит, металлический обжим и ластик (из №5)
// Рисуется вдоль +x от «рабочего конца» (0, 0): по умолчанию это грифель. flag — бумажный флажок на корпусе (стоит прямо).
function makePencil2(layers, { len = 430, w = 28, eraser = false, flag = null, flagW = 96, flagH = 54, flagSize = 30, flagAt = 150, flagSide = -1 } = {}) {
  const sh = S('path', { fill: PAL.shadow, opacity: 0.075 }, layers.sh);
  const g = S('g', {}, layers.g);
  const inner = S('g', { transform: eraser ? `scale(-1 1) translate(${-len} 0)` : '' }, g);
  const cone = Math.round(w * 2.05), lead = Math.round(w * 0.6), erL = Math.round(w * 1.2), feL = Math.round(w * 1.05), bodyEnd = len - erL - feL;
  const ow = olw(2.4);
  S('path', { d: `M${cone} ${-w / 2}H${bodyEnd}V${w / 2}H${cone}Z`, fill: '#4E545E', stroke: PAL.line, style: ow, 'stroke-linejoin': 'round' }, inner);
  S('path', { d: `M${cone + 3} ${-w / 6}H${bodyEnd}`, stroke: '#6E7580', style: olw(2.4) }, inner);
  S('path', { d: `M${cone + 3} ${w / 6}H${bodyEnd}`, stroke: '#3E434B', style: olw(2.4) }, inner);
  S('path', { d: `M${cone + 3} ${-w / 2 + 3}H${bodyEnd}`, stroke: '#FFFFFF', 'stroke-opacity': 0.25, style: olw(1.6) }, inner);
  S('path', { d: `M${lead} ${-w * 0.14}L${cone} ${-w / 2}L${cone} ${w / 2}L${lead} ${w * 0.14}Z`, fill: '#E3C69C', stroke: PAL.line, style: ow, 'stroke-linejoin': 'round' }, inner);
  S('path', { d: `M${cone} ${-w / 2}Q${cone - 7} ${-w / 4} ${cone} 0Q${cone - 7} ${w / 4} ${cone} ${w / 2}`, fill: 'none', stroke: '#B8955F', style: olw(1.6) }, inner);
  S('path', { d: `M0 0L${lead} ${-w * 0.14}L${lead} ${w * 0.14}Z`, fill: '#3A3D44', stroke: PAL.line, style: olw(1.6), 'stroke-linejoin': 'round' }, inner);
  S('path', { d: `M${bodyEnd} ${-w / 2 - 1}H${bodyEnd + feL}V${w / 2 + 1}H${bodyEnd}Z`, fill: '#B4B8BF', stroke: PAL.line, style: ow }, inner);
  [0.2, 0.4, 0.6, 0.8].forEach(f => S('path', { d: `M${f2(bodyEnd + feL * f)} ${-w / 2}V${w / 2}`, stroke: '#7D838C', style: olw(1.4) }, inner));
  S('path', { d: `M${bodyEnd + 2} ${-w / 2 + 3}H${bodyEnd + feL - 2}`, stroke: '#FFFFFF', 'stroke-opacity': 0.6, style: olw(1.6) }, inner);
  const e0 = bodyEnd + feL;
  S('path', { d: `M${e0} ${-w / 2 + 1}H${len - 9}Q${len} ${-w / 2 + 1} ${len} ${-w / 2 + 10}V${w / 2 - 10}Q${len} ${w / 2 - 1} ${len - 9} ${w / 2 - 1}H${e0}Z`, fill: '#D6CDC2', stroke: PAL.line, style: ow, 'stroke-linejoin': 'round' }, inner);
  S('path', { d: `M${len - 7} ${-w / 2 + 8}V${w / 2 - 8}`, stroke: '#9E968C', 'stroke-opacity': 0.7, style: olw(2.6), 'stroke-linecap': 'round' }, inner);
  S('path', { d: `M${e0 + 3} ${-w / 2 + 4}H${len - 12}`, stroke: '#FFFFFF', 'stroke-opacity': 0.45, style: olw(1.6) }, inner);
  A(sh, 'd', `M0 0L${lead} ${-w * 0.14}L${cone} ${-w / 2}H${len - 9}Q${len} ${-w / 2} ${len} ${-w / 2 + 9}V${w / 2 - 9}Q${len} ${w / 2} ${len - 9} ${w / 2}H${cone}L${lead} ${w * 0.14}Z`);
  const shInner = eraser ? `scale(-1 1) translate(${-len} 0)` : '';
  let fl = null, flTxt = null;
  if (flag !== null) {
    fl = S('g', {}, g);
    const fsh = S('path', { d: rrAt(flagW, flagH, 3, 3, 5), fill: PAL.shadow, opacity: 0.12 }, fl);
    S('path', { d: rrD(flagW, flagH, 3), fill: PAL.slip, stroke: '#CFC7B8', style: olw(1.2) }, fl);
    S('path', { d: `M${-flagW / 2} ${-flagH / 2 + 3}H${flagW / 2}`, stroke: '#FFFFFF', 'stroke-opacity': 0.6, style: olw(1.4) }, fl);
    flTxt = tText(fl, flag, { size: flagSize, weight: 800 });
    fl.txt = flTxt; fl.sh = fsh;
  }
  const P = { g, sh, fl, flTxt, len, w, side: flagSide, flagAt };
  // (x, y) — рабочий конец; ang — направление корпуса от него (°); lift — высота: тень уходит вниз-вправо; flagO, flagS — флажок
  P.set = (x, y, ang = 35, lift = 0, o = 1, flagO = 1, flagS = 1) => {
    if (o <= 0.002) { show(g, 0); show(sh, 0); return; }
    const s = 1 + 0.05 * lift;
    A(g, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(ang)}) scale(${f2(s)})`);
    A(sh, 'transform', `translate(${f2(x + 4 + 16 * lift)} ${f2(y + 7 + 24 * lift)}) rotate(${f2(ang)}) scale(${f2(s)}) ${shInner}`);
    show(g, o); show(sh, o * (1 - 0.55 * clamp(lift / 1.4)));
    if (fl) {
      const side = P.side * (w / 2 + flagH / 2 - 2);
      A(fl, 'transform', `translate(${f2(P.flagAt)} ${f2(side)}) rotate(${f2(-ang)}) scale(${f2(Math.max(0.001, flagS))})`);
      show(fl, flagO);
    }
  };
  P.set(0, 0, 0, 0, 0);
  return P;
}

// ------------------------------------------------------------------ картонный лайк: большой палец вверх, вырезан из жёлтого картона
// Свой контур (не значок площадки): манжета + кулак с пальцами + большой палец. Локально 100×100, центр (60, 52).
const LIKE_D = 'M30 46L30 96L84 96Q92 96 92 89Q92 84 88 82Q95 81 95 74Q95 68 90 66Q97 65 97 58Q97 51 90 50Q95 47 94 42Q93 36 86 36L61 36Q65 26 64 17Q63 5 54 4Q47 3 46 11Q44 26 30 46Z';
const CUFF_D = 'M5 48Q5 44 9 44H24Q27 44 27 48V94Q27 98 23 98H9Q5 98 5 94Z';
function makeLike(layer, shLayer, { size = 120, tone = 'kraft', seed = 3, yellow = false } = {}) {
  // картонный жетон (крафт или серый; жёлтый — только решающий лайк на А) с пиктограммой пальца чернилами, без эмодзи-заливки
  // yellow: крафтовый жетон желтеет мазком (set(..., yel 0..1)) — решающий лайк желтеет при посадке на А
  const t = makeTile(layer, shLayer, { w: size, h: size, tone, r: size * 0.18, depth: 5, line: 3, yellow });
  const k = 0.66 * size / 94;
  const ic = S('g', { transform: `translate(${f2(-0.02 * size)} ${f2(0.01 * size)}) scale(${f2(k)}) translate(-51 -51)` }, t.front);
  const sw = 4.6 / k;
  [LIKE_D, CUFF_D].forEach((d, i) => S('path', { d: roughD(d, { seed: seed + i, roughness: 0.35, bowing: 0.4, disableMultiStroke: true }), fill: 'none', stroke: PAL.ink, 'stroke-width': f2(sw), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, ic));
  ['M72 51H89', 'M73 66H91', 'M71 81H87'].forEach(d => S('path', { d, stroke: PAL.ink, 'stroke-width': f2(sw * 0.8), 'stroke-linecap': 'round', fill: 'none' }, ic));
  const Lk = { g: t.g, sg: t.sg, size, tile: t };
  Lk.set = (x, y, rot = 0, s = 1, lift = 4, o = 1, yel = 0) => {
    if (o <= 0.002 || s <= 0.002) { t.hide(); return; }
    t.set({ x, y, rot, s, lift, o, yel });
  };
  Lk.set(0, 0, 0, 0, 0, 0);
  return Lk;
}

// ------------------------------------------------------------------ отрывной календарь: колодка с пачкой листков, переплёт сверху
// pages: [{ d: '25', m: 'апреля', y: '2025' }, ...]; set(x, y, rot, idx, f): idx — текущий лист, f 0..1 — его отрыв (вверх, через переплёт)
function makeCalendar(layer, shLayer, { w = 360, h = 360, pages = [] } = {}) {
  const sg = S('g', {}, shLayer), g = S('g', {}, layer);
  const top = -h / 2, bindH = 58;
  S('path', { d: rr(-w / 2 + 6, top + 12, w, h, 8), fill: PAL.shadow, opacity: 0.1 }, sg);
  S('path', { d: rr(-w / 2 + 2, top + 4, w + 4, h + 6, 8), fill: 'none', stroke: PAL.shadow, 'stroke-opacity': 0.04, 'stroke-width': 14 }, sg);
  // пачка: торцы листков снизу-справа
  for (let i = 5; i >= 1; i--) S('path', { d: rr(-w / 2 + 1.2 * i, top + bindH - 6 + 1.6 * i, w - 2, h - bindH + 6, 4), fill: i % 2 ? '#E8E2D5' : '#F3EFE6', stroke: '#CFC7B8', style: olw(1) }, g);
  const pageG = S('g', {}, g);
  const mk = (p, parent) => {
    const pg = S('g', {}, parent);
    S('path', { d: rr(-w / 2, top + bindH - 6, w, h - bindH + 6, 4), fill: '#FBFAF6' }, pg);
    S('path', { d: rr(-w / 2, top + bindH - 6, w, h - bindH + 6, 4), fill: 'url(#pGrain)', opacity: 0.3 }, pg);
    S('path', { d: rr(-w / 2, top + bindH - 6, w, h - bindH + 6, 4), fill: 'none', stroke: '#D4CCBD', style: olw(1.4) }, pg);
    const cy = top + bindH + (h - bindH) * 0.47;
    const k = h / 360;
    pg.dd = txt(pg, p.d, { x: 0, y: cy + 52 * k, size: 150 * k, font: FONT.head, weight: 900, anchor: 'middle', fill: PAL.ink });
    pg.mm = txt(pg, p.m, { x: 0, y: cy + 108 * k, size: 40 * k, weight: 700, anchor: 'middle', fill: PAL.ink });
    pg.yy = txt(pg, p.y, { x: 0, y: top + bindH + 40 * k, size: 28 * k, font: FONT.mono, weight: 700, anchor: 'middle', fill: GRAPH });
    return pg;
  };
  const P = pages.map(p => mk(p, pageG));
  // отрываемый лист — копия текущего, отдельный слой поверх; изнанка — чистая бумага
  const flipG = S('g', {}, g), flipSh = S('path', { d: rr(-w / 2, 0, w, h - bindH + 6, 4), fill: PAL.shadow, opacity: 0.1 }, flipG);
  const flipFace = S('g', {}, flipG), flipBack = S('path', { d: rr(-w / 2, 0, w, h - bindH + 6, 4), fill: '#EFEADF', stroke: '#CFC7B8', style: olw(1.2) }, flipG);
  const FP = pages.map(p => { const q = mk(p, flipFace); A(q, 'transform', `translate(0 ${-(top + bindH - 6)})`); return q; });
  // переплёт: тёмный картон с двумя кольцами
  S('path', { d: rr(-w / 2 - 6, top, w + 12, bindH, 8), fill: '#5E6370', stroke: PAL.line, style: olw(3) }, g);
  S('path', { d: rr(-w / 2 - 6, top, w + 12, bindH, 8), fill: 'url(#pGrain)', opacity: 0.6 }, g);
  S('path', { d: `M${-w / 2} ${top + 5}H${w / 2}`, stroke: '#FFFFFF', 'stroke-opacity': 0.22, style: olw(2) }, g);
  [-w * 0.27, w * 0.27].forEach(x => {
    S('path', { d: rr(x - 9, top + bindH - 26, 18, 40, 9), fill: '#B4B8BF', stroke: PAL.line, style: olw(2.4) }, g);
    S('path', { d: `M${x - 4} ${top + bindH - 20}V${top + bindH + 6}`, stroke: '#FFFFFF', 'stroke-opacity': 0.6, style: olw(2) }, g);
  });
  const C = { g, sg, P, w, h, top, bindH };
  C.set = (x, y, rot, idx, f = 0, lift = 4) => {
    A(g, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(rot)})`);
    A(sg, 'transform', `translate(${f2(x + 4)} ${f2(y + 6)}) rotate(${f2(rot)})`);
    show(g, 1); show(sg, 1);
    const cur = Math.min(P.length - 1, idx), nxt = Math.min(P.length - 1, idx + (f > 0 ? 1 : 0));
    P.forEach((p, i) => A(p, 'display', i === (f > 0 ? nxt : cur) ? 'inline' : 'none'));
    if (f <= 0 || f >= 1) { A(flipG, 'display', 'none'); return; }
    A(flipG, 'display', 'inline');
    // лист поворачивается вокруг линии переплёта: высота cos(π f), после половины — изнанкой, уходит вверх
    const c = Math.cos(Math.PI * f), y0 = top + bindH - 6;
    A(flipG, 'transform', `translate(0 ${f2(y0)}) scale(1 ${f2(Math.max(0.001, Math.abs(c)) * (c >= 0 ? 1 : -1))})`);
    FP.forEach((p, i) => A(p, 'display', i === cur && c >= 0 ? 'inline' : 'none'));
    A(flipBack, 'display', c < 0 ? 'inline' : 'none');
    A(flipSh, 'transform', `translate(${f2(10 * Math.sin(Math.PI * f))} ${f2(16 * Math.sin(Math.PI * f))})`);
    A(flipSh, 'opacity', f2(0.12 * Math.sin(Math.PI * f)));
  };
  return C;
}

// ------------------------------------------------------------------ сетка «2023»: 10×10 белых карточек, переворачиваются волной
// на изнанке — серый картон «Простите, / я ошибся»; keep — карточки, которые не переворачиваются (2 из 100)
function makeGrid(layer, shLayer, { rows = 10, cols = 10, cw = 72, ch = 52, gap = 8, x0 = 0, y0 = 0, keep = [] } = {}) {
  const cards = [];
  const keepSet = new Set(keep.map(([r, c]) => r * cols + c));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cx = x0 + c * (cw + gap) + cw / 2, cy = y0 + r * (ch + gap) + ch / 2;
    const rot = (hash01(r * cols + c, 77) - 0.5) * 2.4, jx = (hash01(r * cols + c, 78) - 0.5) * 3, jy = (hash01(r * cols + c, 79) - 0.5) * 3;
    const sh = S('path', { d: rrD(cw, ch, 4), fill: PAL.shadow, opacity: 0.1 }, shLayer);
    const g = S('g', {}, layer), inner = S('g', {}, g);
    const front = S('g', {}, inner), back = S('g', {}, inner);
    // рубашка (до волны): серый картон без надписи
    S('path', { d: rrAt(cw, ch, 4, 1.4, 2.4), fill: PAL.grayEdge }, front);
    S('path', { d: rrD(cw, ch, 4), fill: PAL.gray }, front);
    S('path', { d: rrD(cw, ch, 4), fill: 'url(#pGrain)', opacity: 0.8 }, front);
    S('path', { d: rrD(cw, ch, 4), fill: 'none', stroke: PAL.line, style: olw(1.6) }, front);
    // лицо (после волны): белая карточка «Простите, я ошибся»
    S('path', { d: rrAt(cw, ch, 4, 1.2, 2), fill: '#D9D2C4' }, back);
    S('path', { d: rrD(cw, ch, 4), fill: PAL.slip }, back);
    S('path', { d: rrD(cw, ch, 4), fill: 'url(#pGrain)', opacity: 0.35 }, back);
    S('path', { d: rrD(cw, ch, 4), fill: 'none', stroke: '#C9C1B1', style: olw(1.2) }, back);
    const t1 = txt(back, 'Простите,', { x: 0, y: -2, size: 12.5, weight: 700, anchor: 'middle', fill: GRAPH });
    const t2 = txt(back, 'я ошибся', { x: 0, y: 14, size: 12.5, weight: 700, anchor: 'middle', fill: GRAPH });
    texOn(t1, true); texOn(t2, true);
    cards.push({ r, c, cx: cx + jx, cy: cy + jy, rot, g, inner, front, back, sh, keep: keepSet.has(r * cols + c) });
  }
  const G = { cards, rows, cols, cw, ch, gap, x0, y0, W: cols * (cw + gap) - gap, H: rows * (ch + gap) - gap };
  // flipAt(card) — время начала переворота; op — непрозрачность переворачиваемых; keepLift/keepOp — две белые (2 из 100)
  G.set = (flipAt, dur = 0.2, op = 1, hidden = false, keepLift = 0, keepOp = 1) => {
    for (const k of cards) {
      if (hidden) { A(k.g, 'display', 'none'); A(k.sh, 'display', 'none'); continue; }
      A(k.g, 'display', 'inline'); A(k.sh, 'display', 'inline');
      const t0 = k.keep ? Infinity : flipAt(k), f = clamp(t0 === Infinity ? 0 : (G.t - t0) / dur);
      const fe = ease.inOut(f), c = Math.cos(Math.PI * fe), lift = 10 * Math.sin(Math.PI * fe) + (k.keep ? keepLift : 0);
      A(k.g, 'transform', `translate(${f2(k.cx)} ${f2(k.cy - 2 * Math.sin(Math.PI * fe))}) rotate(${f2(k.rot)})`);
      A(k.inner, 'transform', Math.abs(c) < 0.999 ? `scale(${f2(Math.max(0.001, Math.abs(c)))} 1)` : '');
      A(k.front, 'display', fe < 0.5 ? 'inline' : 'none'); A(k.back, 'display', fe >= 0.5 ? 'inline' : 'none');
      A(k.sh, 'transform', `translate(${f2(k.cx + 2 + 0.8 * lift)} ${f2(k.cy + 3 + 1.2 * lift)}) rotate(${f2(k.rot)}) scale(${f2(Math.max(0.001, Math.abs(c)))} 1)`);
      A(k.g, 'opacity', f2(k.keep ? keepOp : op)); A(k.sh, 'opacity', f2(0.1 * (k.keep ? keepOp : op) * (1 + 0.04 * (k.keep ? keepLift : 0))));
    }
  };
  return G;
}

// ------------------------------------------------------------------ поднос: серый картон с бортом и углублением
function makeTray(layer, shLayer, { x, y, w = 820, h = 470, rim = 26 } = {}) {
  const sg = S('g', {}, shLayer), g = S('g', { transform: `translate(${x} ${y})` }, layer);
  S('path', { d: rr(x - w / 2 + 8, y - h / 2 + 14, w, h, 14), fill: PAL.shadow, opacity: 0.1 }, sg);
  S('path', { d: rr(x - w / 2 + 2, y - h / 2 + 4, w + 6, h + 10, 14), fill: 'none', stroke: PAL.shadow, 'stroke-opacity': 0.04, 'stroke-width': 16 }, sg);
  S('path', { d: rrAt(w, h, 14, 4, 8), fill: PAL.grayEdge, stroke: PAL.line, 'stroke-opacity': 0.7, style: olw(1.8) }, g);
  S('path', { d: rrD(w, h, 14), fill: PAL.gray }, g);
  S('path', { d: rrD(w, h, 14), fill: 'url(#pGrain)', opacity: 0.9 }, g);
  S('path', { d: rrD(w, h, 14), fill: 'url(#gLit)' }, g);
  S('path', { d: rrD(w, h, 14), fill: 'none', stroke: PAL.line, style: olw(3) }, g);
  // углубление: дно темнее, внутренняя тень сверху-слева от борта
  const iw = w - 2 * rim, ih = h - 2 * rim;
  S('path', { d: rrD(iw, ih, 8), fill: '#BDB7AC' }, g);
  S('path', { d: rrD(iw, ih, 8), fill: 'url(#pGrain)', opacity: 0.7 }, g);
  S('path', { d: `M${-iw / 2 + 2} ${ih / 2 - 8}V${-ih / 2 + 8}Q${-iw / 2 + 2} ${-ih / 2 + 2} ${-iw / 2 + 8} ${-ih / 2 + 2}H${iw / 2 - 6}`, fill: 'none', stroke: '#8F897E', 'stroke-opacity': 0.6, style: olw(5) }, g);
  S('path', { d: rrD(iw, ih, 8), fill: 'none', stroke: PAL.line, 'stroke-opacity': 0.75, style: olw(2) }, g);
  S('path', { d: `M${-w / 2 + 6} ${h / 2 - 16}V${-h / 2 + 12}Q${-w / 2 + 6} ${-h / 2 + 6} ${-w / 2 + 14} ${-h / 2 + 6}H${w / 2 - 16}`, fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.4, style: olw(2.4) }, g);
  return { g, sg, x, y, w, h, iw, ih };
}

// ------------------------------------------------------------------ кармашек «2023»: крафтовый конверт, из него торчат белые карточки
function makePocket(backL, midL, frontL, shL, { x, y, w = 840, h = 300, label = '2023' } = {}) {
  const top = y - h / 2;
  S('path', { d: rr(x - w / 2 + 8, top + 2, w, h + 12, 10), fill: PAL.shadow, opacity: 0.1 }, shL);
  // задняя стенка: видна выше переднего края (выемка под палец), темнее
  const back = S('g', {}, backL);
  S('path', { d: rr(x - w / 2, top - 46, w, h + 46, 10), fill: '#B9966A' }, back);
  S('path', { d: rr(x - w / 2, top - 46, w, h + 46, 10), fill: 'url(#pGrain)', opacity: 0.85 }, back);
  S('path', { d: rr(x - w / 2, top - 46, w, h + 46, 10), fill: 'none', stroke: PAL.line, style: olw(3) }, back);
  // карточки внутри (верхние края торчат)
  const cards = S('g', {}, midL);
  [[-250, -6, -4, 'slip'], [-80, -26, 2, 'slip'], [70, -14, -2, 'gray'], [235, -30, 3, 'slip'], [-170, 4, 5, 'gray']].forEach(([dx, dy, r, tn], i) => {
    const cw = 170, chh = 150, gx = x + dx, gy = top + 40 + dy;
    const g = S('g', { transform: `translate(${gx} ${gy}) rotate(${r})` }, cards);
    S('path', { d: rrAt(cw, chh, 6, 3, 5), fill: PAL.shadow, opacity: 0.12 }, g);
    S('path', { d: rrD(cw, chh, 6), fill: tn === 'slip' ? PAL.slip : PAL.gray, stroke: tn === 'slip' ? '#C9C1B1' : PAL.line, style: olw(tn === 'slip' ? 1.4 : 2.2) }, g);
    S('path', { d: rrD(cw, chh, 6), fill: 'url(#pGrain)', opacity: tn === 'slip' ? 0.35 : 0.8 }, g);
  });
  // передняя стенка с выемкой посередине
  const front = S('g', {}, frontL);
  const nx = x, nw = 150, nd = 44;
  const fd = `M${x - w / 2} ${top + 10}Q${x - w / 2} ${top} ${x - w / 2 + 10} ${top}H${nx - nw / 2}Q${nx - nw / 2 + 10} ${top + nd} ${nx} ${top + nd}Q${nx + nw / 2 - 10} ${top + nd} ${nx + nw / 2} ${top}` +
    `H${x + w / 2 - 10}Q${x + w / 2} ${top} ${x + w / 2} ${top + 10}V${top + h - 10}Q${x + w / 2} ${top + h} ${x + w / 2 - 10} ${top + h}H${x - w / 2 + 10}Q${x - w / 2} ${top + h} ${x - w / 2} ${top + h - 10}Z`;
  S('path', { d: fd, fill: PAL.shadow, opacity: 0.12, transform: 'translate(0 -6)' }, front);
  S('path', { d: fd, fill: PAL.kraft }, front);
  S('path', { d: fd, fill: 'url(#pGrain)', opacity: 0.9 }, front);
  S('path', { d: fd, fill: 'url(#gLit)' }, front);
  S('path', { d: `M${x - w / 2 + 14} ${top + 5}H${nx - nw / 2 - 4}`, stroke: '#FFFFFF', 'stroke-opacity': 0.4, style: olw(2.4) }, front);
  // сгибы конверта: боковые швы и нижний клапан чуть темнее
  [x - w / 2 + 34, x + w / 2 - 34].forEach(sx => S('path', { d: `M${sx} ${top + 18}V${top + h - 12}`, stroke: '#A88A61', 'stroke-opacity': 0.55, style: olw(2) }, front));
  S('path', { d: `M${x - w / 2 + 6} ${top + h - 74}L${x - w / 2 + 70} ${top + h - 120}H${x + w / 2 - 70}L${x + w / 2 - 6} ${top + h - 74}V${top + h - 8}H${x - w / 2 + 6}Z`, fill: '#B9966A', opacity: 0.32 }, front);
  S('path', { d: `M${x - w / 2 + 6} ${top + h - 74}L${x - w / 2 + 70} ${top + h - 120}H${x + w / 2 - 70}L${x + w / 2 - 6} ${top + h - 74}`, fill: 'none', stroke: '#8E7046', 'stroke-opacity': 0.5, style: olw(1.8) }, front);
  S('path', { d: fd, fill: 'none', stroke: PAL.line, style: olw(3) }, front);
  // ярлык «2023» на передней стенке
  const lb = S('g', { transform: `translate(${x - w / 2 + 250} ${top + 96}) rotate(-2)` }, front);
  const lbSh = S('path', { d: rrAt(176, 70, 4, 3, 4), fill: PAL.shadow, opacity: 0.12 }, lb);
  S('path', { d: rrD(176, 70, 4), fill: '#CDAE80', stroke: '#B39467', style: olw(1.2) }, lb);          // бирка в тон крафта
  const lbHi = S('path', { d: rrD(176, 70, 4), fill: PAL.slip, stroke: '#CFC7B8', style: olw(1.2) }, lb); // яркая (только «2023»)
  const lt = txt(lb, label, { x: 0, y: 15, size: 44, font: FONT.mono, weight: 700, anchor: 'middle' });
  // b: 0 — в тон крафта, цифры графитом ~35 %; 1 — белая бирка, цифры чернилами
  const setTag = b => { A(lbHi, 'opacity', f2(b)); A(lbSh, 'opacity', f2(0.04 + 0.08 * b)); A(lt, 'fill', b > 0.5 ? PAL.ink : '#434852'); A(lt, 'opacity', f2(lerp(0.35, 1, b))); };
  setTag(0);
  return { back, cards, front, label: lt, setTag, x, y, w, h, top };
}

// ------------------------------------------------------------------ знак канала { | } на серой плитке (из №5)
function makeSign(layer, shLayer, { w = 180, h = 140 } = {}) {
  const t = makeTile(layer, shLayer, { w, h, tone: 'gray', r: 12, depth: 6 });
  const sg = S('g', { transform: 'scale(1.15)' }, t.front);
  ['M-38 -46Q-52 -46 -52 -32V-12Q-52 0 -64 0Q-52 0 -52 12V32Q-52 46 -38 46', 'M38 -46Q52 -46 52 -32V-12Q52 0 64 0Q52 0 52 12V32Q52 46 38 46', 'M0 -30V30']
    .forEach(d => S('path', { d, fill: 'none', stroke: PAL.ink, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sg));
  return t;
}

// ------------------------------------------------------------------ письмо карандашом: строки проявляются маской вслед за кончиком
// lines: [{ t, x, y }] (x — левый край, y — база); v: 0..N (сколько строк написано, дробная часть — текущая строка)
let _wrN = 0;
function makeWriting(parent, defs, lines, { size = 64, font = 'Unbounded', weight = 900, fill = GRAPH, ls = 0, tex = false, plate = null } = {}) {
  const g = S('g', {}, parent);
  let plateEl = null;
  const L_ = lines.map((l, i) => {
    const id = 'wr' + (++_wrN), cp = S('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, defs);
    const r = S('rect', { x: l.x - 30, y: l.y - size * 1.25, width: 0, height: size * 1.75 }, cp);
    const w = textWidth(l.t, size, font, weight, ls);
    if (plate && plate.line === i) {
      // жёлтая плашка под строкой: проявляется вместе со строкой (тот же клип)
      const pd = rr(l.x - 16, l.y - size * 0.86, (plate.w ?? w) + 34, size * 1.04, 12);
      plateEl = S('path', { d: pd, fill: plate.fill || PAL.yellow, 'clip-path': `url(#${id})` }, g);
      S('path', { d: pd, fill: 'url(#pGrain)', opacity: 0.5, 'clip-path': `url(#${id})` }, g);
    }
    const t = S('text', { x: l.x, y: l.y, 'font-family': font === 'Unbounded' ? FONT.head : font, 'font-size': size, 'font-weight': weight, fill, 'letter-spacing': ls, 'clip-path': `url(#${id})` }, g);
    t.textContent = l.t;
    let t2 = null;
    if (tex) { t2 = S('text', { x: l.x, y: l.y, 'font-family': font === 'Unbounded' ? FONT.head : font, 'font-size': size, 'font-weight': weight, fill: 'url(#pGraph)', 'letter-spacing': ls, 'clip-path': `url(#${id})` }, g); t2.textContent = l.t; }
    return { ...l, w, r, t, t2 };
  });
  const W_ = { g, lines: L_, size, plate: plateEl };
  // кончик карандаша на строке i при доле u
  W_.tip = (i, u) => { const l = L_[Math.max(0, Math.min(L_.length - 1, i))]; return [l.x + l.w * clamp(u), l.y - size * 0.32]; };
  W_.set = (v, o = 1) => {
    L_.forEach((l, i) => {
      const u = clamp(v - i);
      A(l.r, 'width', f2(u <= 0 ? 0 : u >= 1 ? l.w + 80 : l.w * u + 6));
      const vis = u > 0;
      A(l.t, 'visibility', vis ? 'visible' : 'hidden'); if (l.t2) A(l.t2, 'visibility', vis ? 'visible' : 'hidden');
    });
    A(g, 'opacity', f2(o));
  };
  W_.set(0);
  return W_;
}

// ------------------------------------------------------------------ рулон малярного скотча (вид сверху): кольцо ленты на картонной втулке
function makeTapeRoll(layer, shLayer, x, y, r = 140, rot = 0) {
  S('circle', { cx: x + 8, cy: y + 13, r: r + 2, fill: PAL.shadow, opacity: 0.1 }, shLayer);
  S('circle', { cx: x + 4, cy: y + 6, r: r + 6, fill: 'none', stroke: PAL.shadow, 'stroke-opacity': 0.04, 'stroke-width': 14 }, shLayer);
  const g = S('g', { transform: `translate(${x} ${y}) rotate(${rot})` }, layer);
  S('circle', { cx: 4, cy: 7, r, fill: '#C9B585' }, g);                                   // торец рулона
  S('circle', { cx: 0, cy: 0, r, fill: '#E6D7AF' }, g);
  S('circle', { cx: 0, cy: 0, r, fill: 'url(#pCrepe)', opacity: 0.7 }, g);
  [0.93, 0.86, 0.79, 0.72].forEach((k, i) => S('circle', { cx: 0, cy: 0, r: r * k, fill: 'none', stroke: '#B9A274', 'stroke-opacity': 0.28 + 0.06 * (i % 2), style: olw(1.2) }, g));
  S('circle', { cx: 0, cy: 0, r, fill: 'none', stroke: PAL.line, style: olw(3) }, g);
  S('circle', { cx: 0, cy: 0, r: r * 0.62, fill: PAL.kraft, stroke: PAL.line, style: olw(2.6) }, g);   // втулка
  S('circle', { cx: 0, cy: 0, r: r * 0.62, fill: 'url(#pGrain)', opacity: 0.8 }, g);
  S('circle', { cx: 0, cy: 0, r: r * 0.5, fill: PAL.sheet, stroke: '#A88A61', style: olw(2) }, g);
  S('circle', { cx: 0, cy: 0, r: r * 0.5, fill: 'url(#pPaper)' }, g);
  // хвост ленты, отклеенный от рулона
  const tl = `M${f2(r * 0.7)} ${f2(-r * 0.72)}L${f2(r * 1.55)} ${f2(-r * 1.02)}L${f2(r * 1.62)} ${f2(-r * 0.7)}L${f2(r * 0.95)} ${f2(-r * 0.42)}Z`;
  S('path', { d: tl, fill: '#E6D7AF', opacity: 0.92, stroke: '#B9A274', 'stroke-opacity': 0.6, style: olw(1.2) }, g);
  S('path', { d: tl, fill: 'url(#pCrepe)', opacity: 0.8 }, g);
  return g;
}

// ------------------------------------------------------------------ смятый скотч (после рывка падает вниз): ком креп-бумаги, красный «?» наружу
function makeWad(layer, shLayer, { w = 250, h = 150, seed = 7 } = {}) {
  const sg = S('g', {}, shLayer), g = S('g', {}, layer);
  const n = 22, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, j = 0.72 + 0.34 * hash01(i, seed);
    pts.push([Math.cos(a) * w / 2 * j, Math.sin(a) * h / 2 * (0.8 + 0.3 * hash01(i, seed + 1))]);
  }
  const d = dPts(pts);
  const shp = S('path', { d, fill: PAL.shadow, opacity: 0.16 }, sg);
  S('path', { d, fill: '#CDBB8C', transform: 'translate(3 6)' }, g);                                   // нижняя сторона кома
  S('path', { d, fill: '#E6D7AF' }, g);
  S('path', { d, fill: 'url(#pCrepe)', opacity: 0.9 }, g);
  // заломы: светлые гребни и тёмные складки
  for (let k = 0; k < 9; k++) {
    const a0 = hash01(k, seed + 3) * Math.PI * 2, r0 = 0.15 + 0.3 * hash01(k, seed + 4);
    const x0 = Math.cos(a0) * w / 2 * r0, y0 = Math.sin(a0) * h / 2 * r0;
    const a1 = a0 + (hash01(k, seed + 5) - 0.5) * 1.6, L_ = 0.35 + 0.35 * hash01(k, seed + 6);
    const x1 = x0 + Math.cos(a1) * w / 2 * L_, y1 = y0 + Math.sin(a1) * h / 2 * L_;
    const mx = (x0 + x1) / 2 + (hash01(k, seed + 7) - 0.5) * 30, my = (y0 + y1) / 2 + (hash01(k, seed + 8) - 0.5) * 20;
    S('path', { d: `M${f2(x0)} ${f2(y0)}L${f2(mx)} ${f2(my)}L${f2(x1)} ${f2(y1)}`, fill: 'none', stroke: k % 3 ? '#A88F5E' : '#FFF7E0', 'stroke-opacity': k % 3 ? 0.55 : 0.7, 'stroke-width': k % 3 ? 2.2 : 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
  }
  S('path', { d, fill: 'none', stroke: '#9C8657', 'stroke-opacity': 0.75, style: olw(2) }, g);
  const qm = penQ(g, { size: 92, color: RED, w: 9, seed: 5 }); A(qm, 'transform', 'translate(4 4) rotate(-8) scale(1 0.9)');
  const W_ = { g, sg };
  W_.set = (x, y, rot = 0, s = 1, lift = 2, o = 1) => {
    if (o <= 0.002) { show(g, 0); show(sg, 0); return; }
    A(g, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(rot)}) scale(${f2(s)})`);
    const L_ = 3 + lift * 1.4;
    A(sg, 'transform', `translate(${f2(x + L_ * LIGHT.x)} ${f2(y + L_ * LIGHT.y)}) rotate(${f2(rot)}) scale(${f2(s * (1 + 0.01 * lift))})`);
    A(shp, 'opacity', f2(0.16 - 0.06 * clamp(lift / 30)));
    show(g, o); show(sg, o);
  };
  W_.set(0, 0, 0, 1, 0, 0);
  return W_;
}
