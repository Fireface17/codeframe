// obj.js — предметы ролика №5 на материале №4 (mat.js): окна-сайты из картона, плиты с полем плиток-кода и торцом
// из пластов, рваные трещины, карандаш с ластиком и флажком, картонный курсор с биркой, заплатки из крафт-скотча.
// Всё — чистые функции времени: build создаёт SVG один раз, set(...) ставит состояние кадра.

// ------------------------------------------------------------------ мелочи
const ink = (parent, d, w = 3, attrs = {}) => S('path', { d, fill: 'none', stroke: PAL.ink, style: olw(w), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attrs }, parent);
const plaque = (parent, x, y, w, h, fill = PAL.graphite, r = 4, attrs = {}) => S('path', { d: rr(x, y, w, h, r), fill, ...attrs }, parent);
const card = (parent, x, y, w, h, fill = PAL.gray, r = 4) => S('path', { d: rr(x, y, w, h, r), fill, stroke: PAL.line, style: olw(1.8) }, parent);
// пометка «фактура»: текст вне своего окна чтения не проверяется на безопасную зону
function texOn(el, on) { if (el._tex === on) return; el._tex = on; if (on) el.setAttribute('data-texture', ''); else el.removeAttribute('data-texture'); }

// ------------------------------------------------------------------ шаблоны страниц (380×212, центр в 0)
const PW = 380, PH = 212;
const PAGE = {
  blog(g) {
    plaque(g, -168, -92, 214, 20, PAL.graphite, 5);
    S('circle', { cx: 158, cy: -82, r: 10, fill: PAL.gray, stroke: PAL.line, style: olw(1.6) }, g);
    card(g, -168, -58, 150, 100, PAL.gray, 4);
    ink(g, 'M-160 30L-118 -14L-92 10L-74 -6L-26 30', 3);
    S('circle', { cx: -58, cy: -34, r: 9, fill: 'none', stroke: PAL.ink, style: olw(2.6) }, g);
    [[-56, 168], [-34, 140], [-12, 162], [10, 118], [32, 150]].forEach(([y, x1]) => ink(g, `M2 ${y}H${x1}`, 3.2, { stroke: PAL.graphite }));
    [[64, 160], [86, 96]].forEach(([y, x1]) => ink(g, `M-168 ${y}H${x1}`, 3.2, { stroke: PAL.graphite }));
  },
  shop(g) {
    plaque(g, -168, -92, 130, 18, PAL.graphite, 5);
    card(g, 110, -94, 58, 22, PAL.kraft, 6);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) {
      const x = -168 + c * 114, y = -60 + r * 82;
      card(g, x, y, 104, 74, PAL.slip, 4);
      S('path', { d: rr(x + 6, y + 6, 92, 40, 3), fill: r === c % 2 ? PAL.kraft : PAL.gray }, g);
      plaque(g, x + 8, y + 54, 46 + 18 * ((c + r) % 2), 10, PAL.graphite, 3);
    }
  },
  gov(g) {
    // пиктограмма «учреждение»: фронтон, 4 колонны, ступени — общий знак, без герба и флага
    const B = S('g', { transform: 'translate(-140 -66)' }, g);
    S('path', { d: 'M-26 -10L0 -28L26 -10Z', fill: PAL.graphite }, B);
    [-18, -6, 6, 18].forEach(x => S('path', { d: rr(x - 3.5, -7, 7, 26, 1.5), fill: PAL.graphite }, B));
    plaque(B, -28, 20, 56, 6, PAL.graphite, 1.5);
    plaque(g, -102, -82, 180, 16, PAL.graphite, 4);
    plaque(g, -102, -60, 110, 9, PAL.gray, 3);
    // 6 плиток-услуг с простыми значками
    const ic = [
      (q) => { S('path', { d: rr(-10, -13, 20, 26, 2), fill: 'none', stroke: PAL.ink, style: olw(2.4) }, q); ink(q, 'M-5 -5H5M-5 1H5M-5 7H2', 2); },          // документ
      (q) => { ink(q, 'M-13 2L0 -11L13 2M-9 -1V12H9V-1', 2.4); },                                                                                  // дом
      (q) => { S('circle', { cx: 0, cy: -6, r: 6, fill: 'none', stroke: PAL.ink, style: olw(2.4) }, q); ink(q, 'M-11 13Q0 -1 11 13', 2.4); },     // человек
      (q) => { S('path', { d: rr(-12, -10, 24, 22, 2), fill: 'none', stroke: PAL.ink, style: olw(2.4) }, q); ink(q, 'M-12 -3H12M-5 -14V-7M5 -14V-7', 2.2); }, // календарь
      (q) => { S('path', { d: rr(-13, -9, 26, 18, 2), fill: 'none', stroke: PAL.ink, style: olw(2.4) }, q); ink(q, 'M-13 -8L0 2L13 -8', 2.2); },       // конверт
      (q) => { S('circle', { cx: 0, cy: 0, r: 11, fill: 'none', stroke: PAL.ink, style: olw(2.4) }, q); ink(q, 'M0 -6V0L5 4', 2.2); },                 // часы
    ];
    for (let k = 0; k < 6; k++) {
      const c = k % 3, r = Math.floor(k / 3), x = -168 + c * 114, y = -36 + r * 70;
      card(g, x, y, 104, 60, k % 2 ? PAL.gray : PAL.slip, 5);
      ic[k](S('g', { transform: `translate(${x + 26} ${y + 30})` }, g));
      plaque(g, x + 46, y + 22, 44, 7, PAL.graphite, 2); plaque(g, x + 46, y + 34, 30, 6, PAL.gray, 2);
    }
  },
  forum(g, opt) {
    plaque(g, -168, -94, 120, 16, PAL.graphite, 5);
    [[-70, 230, 0], [-26, 196, 1], [18, 214, 0]].forEach(([y, w, o]) => {
      S('circle', { cx: -152, cy: y + 14, r: 13, fill: o ? PAL.kraft : PAL.gray, stroke: PAL.line, style: olw(1.6) }, g);
      S('path', { d: rr(-130, y, w, 36, 10), fill: PAL.slip, stroke: PAL.line, style: olw(1.8) }, g);
      ink(g, `M-118 ${y + 13}H${-130 + w - 22}`, 3, { stroke: PAL.graphite });
      ink(g, `M-118 ${y + 24}H${-130 + w * 0.55}`, 3, { stroke: PAL.graphite });
    });
    // строка входа: пустое поле с серой подсказкой «пароль» и кнопка «→»; надписи «ВХОД» нет
    S('path', { d: rr(-168, 66, 262, 32, 6), fill: '#FFFFFF', stroke: PAL.line, style: olw(2) }, g);
    const hint = tText(g, 'пароль', { x: -154, y: 82, size: 21, weight: 500, fill: '#8E939B', anchor: 'start' });
    S('path', { d: rr(104, 66, 64, 32, 6), fill: PAL.graphite }, g);
    ink(g, 'M120 82H150M140 72L150 82L140 92', 3, { stroke: '#FBFAF6' });
    if (opt) opt.hint = hint;
  },
  news(g) {
    plaque(g, -168, -94, 300, 16, PAL.ink, 4);
    plaque(g, -168, -72, 210, 12, PAL.ink, 4);
    card(g, -168, -50, 336, 104, PAL.gray, 4);
    ink(g, 'M-168 22Q-90 -2 -30 14T88 6T168 18', 3);
    S('path', { d: 'M-120 -20L-96 -36L-72 -20Z', fill: PAL.graphite }, g);
    [[70, 160], [90, 70]].forEach(([y, x1]) => ink(g, `M-168 ${y}H${x1}`, 3.2, { stroke: PAL.graphite }));
  },
  school(g) {
    plaque(g, -168, -94, 150, 16, PAL.graphite, 5);
    const cw = 66, ch = 34;
    for (let c = 0; c < 5; c++) for (let r = 0; r < 4; r++) {
      const x = -168 + c * (cw + 3), y = -68 + r * (ch + 4);
      const f = r === 0 ? PAL.graphite : (c * 3 + r * 5) % 4 === 0 ? PAL.kraft : (c + r) % 3 === 0 ? PAL.gray : PAL.slip;
      S('path', { d: rr(x, y, cw, ch, 3), fill: f, stroke: PAL.line, style: olw(1.4) }, g);
      if (r > 0 && f !== PAL.slip) plaque(g, x + 8, y + 13, 34, 7, PAL.graphite, 2);
    }
  },
  video(g) {
    S('path', { d: rr(-168, -94, 336, 150, 6), fill: '#5A606B', stroke: PAL.line, style: olw(1.8) }, g);
    S('path', { d: 'M-22 -46L32 -19L-22 8Z', fill: PAL.slip, stroke: PAL.line, style: olw(2), 'stroke-linejoin': 'round' }, g);
    plaque(g, -168, 66, 336, 8, PAL.gray, 4); plaque(g, -168, 66, 120, 8, PAL.kraft, 4);
    ink(g, 'M-168 92H40', 3.2, { stroke: PAL.graphite });
  },
  map(g) {
    S('path', { d: rr(-168, -94, 336, 188, 6), fill: '#E4D3B3', stroke: PAL.line, style: olw(1.8) }, g);
    [[-150, -70, 60, 44], [-60, -84, 70, 50], [60, 10, 90, 60], [-140, 30, 80, 50]].forEach(([x, y, w, h]) => S('path', { d: rr(x, y, w, h, 4), fill: PAL.gray }, g));
    ink(g, 'M-168 0Q-60 -40 20 -6T168 -40', 7, { stroke: '#FBFAF6' });
    ink(g, 'M-40 -94Q-20 0 -60 94', 6, { stroke: '#FBFAF6' });
    S('path', { d: 'M30 -6C30 -30 62 -30 62 -6C62 8 46 20 46 30C46 20 30 8 30 -6Z', fill: PAL.graphite, stroke: PAL.line, style: olw(1.8) }, g);
    S('circle', { cx: 46, cy: -8, r: 6, fill: PAL.slip }, g);
  },
  mail(g) {
    plaque(g, -168, -94, 110, 16, PAL.graphite, 5);
    for (let r = 0; r < 5; r++) {
      const y = -66 + r * 34;
      S('path', { d: rr(-168, y, 34, 22, 3), fill: r === 1 ? PAL.kraft : PAL.slip, stroke: PAL.line, style: olw(1.8) }, g);
      ink(g, `M-168 ${y + 1}L-151 ${y + 13}L-134 ${y + 1}`, 1.8);
      ink(g, `M-122 ${y + 7}H${40 + 60 * ((r * 7) % 3)}`, 3.4, { stroke: r === 1 ? PAL.ink : PAL.graphite });
      ink(g, `M-122 ${y + 17}H${-20 + 30 * (r % 2)}`, 2.6, { stroke: '#A9AEB8' });
    }
  },
};

// ------------------------------------------------------------------ окно-сайт: рама из серого картона + страница-вырезка
// Рама 400×300 (центр в cx, cy): строка вкладок с тремя точками, вкладка-крафт, пустая адресная строка, клавиша выключателя
// справа. Страница — отдельная вырезка 380×212, переворачивается тёмной изнанкой (переплётный картон #7E8494).
const WIN = { w: 400, h: 300, sw: { x: 168, y: -122, w: 40, h: 54 }, page: { x: 0, y: 36 } };
function makeWindow(L, kind, cx, cy, o = {}) {
  const fr = makeTile(L.win, L.winSh, { w: WIN.w, h: WIN.h, tone: 'gray', r: 9, depth: 6 });
  const F = fr.front;
  // углубление под страницу (чуть темнее рамы, мягкая внутренняя тень сверху-слева)
  S('path', { d: rr(-194, WIN.page.y - 110, 388, 220, 5), fill: '#BFB9AE' }, F);
  S('path', { d: `M-194 ${WIN.page.y + 106}V${WIN.page.y - 105}Q-194 ${WIN.page.y - 110} -189 ${WIN.page.y - 110}H194`, fill: 'none', stroke: '#8F897E', 'stroke-opacity': 0.55, style: olw(3) }, F);
  // строка вкладок
  [-182, -167, -152].forEach(x => S('circle', { cx: x, cy: -131, r: 4.6, fill: PAL.ink }, F));
  S('path', { d: 'M-138 -112V-137Q-138 -144 -131 -144H-38Q-31 -144 -31 -137V-112', fill: PAL.kraft, stroke: PAL.line, style: olw(2.2), 'stroke-linejoin': 'round' }, F);
  ink(F, 'M-126 -127H-64', 3.4, { stroke: PAL.graphite });
  // адресная строка — пустая вырезка
  S('path', { d: rr(-186, -106, 324, 26, 13), fill: PAL.slip, stroke: PAL.line, style: olw(1.8) }, F);
  S('circle', { cx: -172, cy: -93, r: 5, fill: 'none', stroke: '#A9AEB8', style: olw(2.2) }, F);
  // выключатель: вырезка-пластина и клавиша (вверх — горит)
  const swG = S('g', { transform: `translate(${WIN.sw.x} ${WIN.sw.y})` }, F);
  S('path', { d: rrAt(WIN.sw.w, WIN.sw.h, 7, 2, 3), fill: PAL.shadow, opacity: 0.16 }, swG);
  S('path', { d: rrD(WIN.sw.w, WIN.sw.h, 7), fill: PAL.slip, stroke: PAL.line, style: olw(2) }, swG);
  const keyUp = S('g', {}, swG), keyDn = S('g', {}, swG);
  const key = (g, up) => {
    S('path', { d: rrD(24, 40, 4), fill: '#D9D4CA', stroke: PAL.line, style: olw(1.8) }, g);
    S('path', { d: rrAt(24, 20, 4, 0, up ? -10 : 10), fill: '#F3F0E9' }, g);          // нажатая половина в тени, поднятая — к свету
    S('path', { d: rrAt(24, 20, 4, 0, up ? 10 : -10), fill: '#B7B1A6' }, g);
    S('path', { d: 'M-12 0H12', stroke: PAL.line, style: olw(1.4) }, g);
    S('path', { d: rrD(24, 40, 4), fill: 'none', stroke: PAL.line, style: olw(1.8) }, g);
  };
  key(keyUp, true); key(keyDn, false);
  // страница
  const pg = makeTile(L.win, L.winSh, { w: PW, h: PH, tone: 'slip', r: 4, depth: 2, line: 1.6 });
  const tpl = {};
  PAGE[kind](pg.front, tpl);
  // изнанка: переплётный картон с волокном
  S('path', { d: rrD(PW - 8, PH - 8, 3), fill: 'none', stroke: '#6A7080', 'stroke-opacity': 0.5, style: olw(1.4) }, pg.back);
  const W_ = { kind, cx, cy, fr, pg, keyUp, keyDn, hint: tpl.hint,
    sw: { x: cx + WIN.sw.x, y: cy + WIN.sw.y }, pageC: { x: cx + WIN.page.x, y: cy + WIN.page.y },
    x0: cx - WIN.w / 2, x1: cx + WIN.w / 2, y0: cy - WIN.h / 2, y1: cy + WIN.h / 2 };
  // st: { flip 0..1 (1 — погас), key 0..1 (1 — нажата вниз), lift, s, rot, press }
  W_.set = (st = {}) => {
    const lift = st.lift ?? 4, s = st.s ?? 1, rot = st.rot ?? 0;
    fr.set({ x: cx, y: cy, lift, s, rot });
    const k = st.key ?? 0;
    show(keyUp, k < 0.5 ? 1 : 0); show(keyDn, k >= 0.5 ? 1 : 0);
    A(swG, 'transform', `translate(${WIN.sw.x} ${WIN.sw.y}) scale(${f2(1 - 0.06 * (st.press ?? 0))})`);
    const fl = clamp(st.flip ?? 0);
    pg.setTone(fl >= 0.5 ? 'board' : 'slip');
    // страница лежит в раме: её высота над листом = рама + 2; на перевороте приподнимается
    const pl = lift + 2 + 10 * Math.sin(Math.PI * fl);
    const px = cx + WIN.page.x * s, py = cy + WIN.page.y * s;
    pg.set({ x: px, y: py, s, rot, lift: pl - lift + 2, flip: fl, shO: 0.8 });
  };
  W_.set({});
  return W_;
}

// ------------------------------------------------------------------ табличка «ВРЕМЕННО / НЕДОСТУПЕН» на двух полосках скотча
function tapeStrip(parent, w, h, rot, x, y, seed = 1) {
  // полупрозрачный крафт-скотч с зубчатыми торцами
  const n = 6, zz = (side) => { let d = ''; for (let i = 0; i <= n; i++) d += `L${f2(side * w / 2 + side * 2.2 * (i % 2))} ${f2(-h / 2 + h * i / n)}`; return d; };
  const d = `M${-w / 2} ${-h / 2}H${w / 2}${zz(1).slice(0)}L${w / 2} ${h / 2}H${-w / 2}` + (() => { let q = ''; for (let i = n; i >= 0; i--) q += `L${f2(-w / 2 - 2.2 * (i % 2))} ${f2(-h / 2 + h * i / n)}`; return q; })() + 'Z';
  const g = S('g', { transform: `translate(${x} ${y}) rotate(${rot})` }, parent);
  S('path', { d, fill: PAL.tape, opacity: 0.78 }, g);
  S('path', { d: `M${-w / 2 + 3} ${-h / 2 + 3}H${w / 2 - 3}`, stroke: '#FFFFFF', 'stroke-opacity': 0.35, style: olw(2) }, g);
  S('path', { d, fill: 'none', stroke: PAL.tapeEdge, 'stroke-opacity': 0.5, style: olw(1) }, g);
  return g;
}
function makePlate(L, { w = 300, h = 104, size = 34 } = {}) {
  const t = makeTile(L.over, L.overSh, { w, h, tone: 'slip', r: 3, depth: 2, line: 0 });
  const a = tText(t.front, 'ВРЕМЕННО', { y: -h * 0.2, size, weight: 800 });
  const b = tText(t.front, 'НЕДОСТУПЕН', { y: h * 0.22, size, weight: 800 });
  tapeStrip(t.over, 64, 22, -24, -w / 2 + 14, -h / 2 + 6);
  tapeStrip(t.over, 64, 22, 22, w / 2 - 14, -h / 2 + 6);
  t.texts = [a, b];
  return t;
}

// ------------------------------------------------------------------ карандаш: дерево, графит, металлический обжим и ластик
// Рисуется вдоль +x от «рабочего конца» (0, 0): по умолчанию это грифель; eraser: true — ластик (карандаш «ластиком вперёд»).
// flag: бумажный флажок у переднего конца корпуса, всегда стоит прямо (не крутится с карандашом).
function makePencil2(L, { len = 430, w = 28, eraser = false, flag = null, flagW = 96, flagH = 54, flagSize = 30, flagAt = 150, flagSide = -1 } = {}) {
  const sh = S('path', { fill: PAL.shadow, opacity: 0.075 }, L.actSh);
  const g = S('g', {}, L.act);
  const inner = S('g', { transform: eraser ? `scale(-1 1) translate(${-len} 0)` : '' }, g);
  const cone = 58, lead = 17, erL = 34, feL = 30, bodyEnd = len - erL - feL;
  const ow = olw(2.4);
  S('path', { d: `M${cone} ${-w / 2}H${bodyEnd}V${w / 2}H${cone}Z`, fill: '#4E545E', stroke: PAL.line, style: ow, 'stroke-linejoin': 'round' }, inner);
  S('path', { d: `M${cone + 3} ${-w / 6}H${bodyEnd}`, stroke: '#6E7580', style: olw(2.4) }, inner);
  S('path', { d: `M${cone + 3} ${w / 6}H${bodyEnd}`, stroke: '#3E434B', style: olw(2.4) }, inner);
  S('path', { d: `M${cone + 3} ${-w / 2 + 3}H${bodyEnd}`, stroke: '#FFFFFF', 'stroke-opacity': 0.25, style: olw(1.6) }, inner);
  S('path', { d: `M${lead} ${-w * 0.14}L${cone} ${-w / 2}L${cone} ${w / 2}L${lead} ${w * 0.14}Z`, fill: '#E3C69C', stroke: PAL.line, style: ow, 'stroke-linejoin': 'round' }, inner);
  S('path', { d: `M${cone} ${-w / 2}Q${cone - 7} ${-w / 4} ${cone} 0Q${cone - 7} ${w / 4} ${cone} ${w / 2}`, fill: 'none', stroke: '#B8955F', style: olw(1.6) }, inner);
  S('path', { d: `M0 0L${lead} ${-w * 0.14}L${lead} ${w * 0.14}Z`, fill: '#3A3D44', stroke: PAL.line, style: olw(1.6), 'stroke-linejoin': 'round' }, inner);
  // обжим: металл с рёбрами
  S('path', { d: `M${bodyEnd} ${-w / 2 - 1}H${bodyEnd + feL}V${w / 2 + 1}H${bodyEnd}Z`, fill: '#B4B8BF', stroke: PAL.line, style: ow }, inner);
  [6, 12, 18, 24].forEach(dx => S('path', { d: `M${bodyEnd + dx} ${-w / 2}V${w / 2}`, stroke: '#7D838C', style: olw(1.4) }, inner));
  S('path', { d: `M${bodyEnd + 2} ${-w / 2 + 3}H${bodyEnd + feL - 2}`, stroke: '#FFFFFF', 'stroke-opacity': 0.6, style: olw(1.6) }, inner);
  // ластик: тёплый светло-серый, скруглённый торец, след графита
  const e0 = bodyEnd + feL;
  S('path', { d: `M${e0} ${-w / 2 + 1}H${len - 9}Q${len} ${-w / 2 + 1} ${len} ${-w / 2 + 10}V${w / 2 - 10}Q${len} ${w / 2 - 1} ${len - 9} ${w / 2 - 1}H${e0}Z`, fill: '#D6CDC2', stroke: PAL.line, style: ow, 'stroke-linejoin': 'round' }, inner);
  S('path', { d: `M${len - 7} ${-w / 2 + 8}V${w / 2 - 8}`, stroke: '#9E968C', 'stroke-opacity': 0.7, style: olw(2.6), 'stroke-linecap': 'round' }, inner);
  S('path', { d: `M${e0 + 3} ${-w / 2 + 4}H${len - 12}`, stroke: '#FFFFFF', 'stroke-opacity': 0.45, style: olw(1.6) }, inner);
  const shD = `M0 0L${lead} ${-w * 0.14}L${cone} ${-w / 2}H${len - 9}Q${len} ${-w / 2} ${len} ${-w / 2 + 9}V${w / 2 - 9}Q${len} ${w / 2} ${len - 9} ${w / 2}H${cone}L${lead} ${w * 0.14}Z`;
  A(sh, 'd', shD);
  const shInner = eraser ? `scale(-1 1) translate(${-len} 0)` : '';
  // флажок
  let fl = null, flTxt = null;
  if (flag !== null) {
    fl = S('g', {}, g);
    const fsh = S('path', { d: rrAt(flagW, flagH, 3, 3, 5), fill: PAL.shadow, opacity: 0.12 }, fl);
    S('path', { d: rrD(flagW, flagH, 3), fill: PAL.slip, stroke: '#CFC7B8', style: olw(1.2) }, fl);
    S('path', { d: `M${-flagW / 2} ${-flagH / 2 + 3}H${flagW / 2}`, stroke: '#FFFFFF', 'stroke-opacity': 0.6, style: olw(1.4) }, fl);
    flTxt = tText(fl, flag, { size: flagSize, weight: 800 });
    fl.txt = flTxt; fl.sh = fsh;
  }
  const P = { g, sh, fl, flTxt, len, w, side: flagSide };
  // (x, y) — рабочий конец; ang — направление корпуса от него (градусы); lift — высота: тень уходит вниз-вправо
  P.set = (x, y, ang = 35, lift = 0, o = 1, flagO = 1) => {
    if (o <= 0.002) { show(g, 0); show(sh, 0); return; }
    const s = 1 + 0.05 * lift;
    A(g, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(ang)}) scale(${f2(s)})`);
    A(sh, 'transform', `translate(${f2(x + 4 + 16 * lift)} ${f2(y + 7 + 24 * lift)}) rotate(${f2(ang)}) scale(${f2(s)}) ${shInner}`);
    show(g, o); show(sh, o * (1 - 0.55 * clamp(lift / 1.4)));
    if (fl) {
      // флажок обёрнут вокруг корпуса на расстоянии flagAt от рабочего конца и стоит прямо
      const ux = flagAt, side = P.side * (w / 2 + flagH / 2 - 2);
      A(fl, 'transform', `translate(${f2(ux)} ${f2(side)}) rotate(${f2(-ang)})`);
      show(fl, flagO);
    }
  };
  P.set(0, 0, 0, 0, 0);
  return P;
}

// ------------------------------------------------------------------ картонный курсор-стрелка с бумажной биркой на нитке
const CUR_D = 'M0 0L0 104L25 82L42 121L61 113L44 75L76 75Z';
function makeCursor(L, { tag = true, tagScale = 1, tagSize = 34, scale = 1 } = {}) {
  const sh = S('g', {}, L.actSh);
  const s1 = S('path', { d: CUR_D, fill: PAL.shadow, opacity: 0.05, stroke: PAL.shadow, 'stroke-opacity': 0.05, 'stroke-width': 10, 'stroke-linejoin': 'round' }, sh);
  const s2 = S('path', { d: CUR_D, fill: PAL.shadow, opacity: 0.07 }, sh);
  const thr0 = tag ? S('path', { fill: 'none', stroke: PAL.graphite, style: olw(1.6), 'stroke-linecap': 'round' }, L.act) : null;   // нитка — под курсором
  const g = S('g', {}, L.act);
  const body = S('g', {}, g);
  // торец 6 px вниз-вправо, лицо серого картона, зерно, свет, обводка
  for (let k = 1; k <= 3; k++) S('path', { d: CUR_D, fill: PAL.grayEdge, transform: `translate(${f2(1.25 * k)} ${f2(2 * k)})`, 'stroke-linejoin': 'round' }, body);
  S('path', { d: CUR_D, fill: PAL.grayEdge, transform: 'translate(3.75 6)', stroke: PAL.line, 'stroke-opacity': 0.7, style: olw(1.6), 'stroke-linejoin': 'round' }, body);
  S('path', { d: CUR_D, fill: PAL.gray }, body);
  S('path', { d: CUR_D, fill: 'url(#pGrain)', opacity: 0.9 }, body);
  S('path', { d: CUR_D, fill: 'url(#gLit)' }, body);
  S('path', { d: 'M3 8L3 92', stroke: '#FFFFFF', 'stroke-opacity': 0.45, style: olw(2) }, body);
  S('path', { d: CUR_D, fill: 'none', stroke: PAL.line, style: olw(2.6), 'stroke-linejoin': 'round' }, body);
  // бирка: нитка от «хвоста» курсора к бумажной бирке; бирка лежит прямо (не крутится с курсором)
  let tg = null, thread = null, tagTxt = null, tsh = null;
  const tw = 74 * tagScale, th = 48 * tagScale;
  if (tag) {
    tsh = S('path', { d: rrD(tw, th, 4), fill: PAL.shadow, opacity: 0.12 }, L.actSh);
    thread = thr0;
    tg = S('g', {}, L.act);
    S('path', { d: `M${-tw / 2} ${-th / 2 + 8}L${-tw / 2 + 8} ${-th / 2}H${tw / 2}V${th / 2}H${-tw / 2}Z`, fill: PAL.slip, stroke: '#CFC7B8', style: olw(1.2) }, tg);
    S('circle', { cx: -tw / 2 + 9, cy: -th / 2 + 9, r: 3.2 * tagScale, fill: '#CFC7B8' }, tg);
    tagTxt = tText(tg, 'ИИ', { size: tagSize * tagScale, weight: 800, x: 4 * tagScale });
  }
  const C = { g, sh, tg, tagTxt };
  // (x, y) — кончик стрелки; rot — поворот (0 — смотрит вверх-влево); lift — высота над листом; tagO — проявление «ИИ»;
  // off — где лежит бирка относительно хвоста (мир, по умолчанию справа-снизу)
  C.set = (x, y, rot = 0, lift = 4, o = 1, tagO = 0, off = null) => {
    if (o <= 0.002) { show(g, 0); show(sh, 0); if (tg) { show(tg, 0); show(thread, 0); show(tsh, 0); } return; }
    const s = scale * (1 + 0.012 * lift);
    A(g, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(rot)}) scale(${f2(s)})`);
    const Ls = 3 + lift * 1.5;
    A(sh, 'transform', `translate(${f2(x + Ls * LIGHT.x)} ${f2(y + Ls * LIGHT.y)}) rotate(${f2(rot)}) scale(${f2(s)})`);
    A(s1, 'stroke-width', f2(6 + lift * 1.4));
    show(g, o); show(sh, o);
    if (tg) {
      const a = rot * Math.PI / 180, ax = x + scale * (52 * Math.cos(a) - 117 * Math.sin(a)), ay = y + scale * (52 * Math.sin(a) + 117 * Math.cos(a));
      const [ox, oy] = off || [-46 * tagScale - 22, 34 * tagScale + 22];     // снизу-слева от хвоста: карандаш идёт вниз-вправо
      const cx = ax + ox, cy = ay + oy, hx = cx - tw / 2 + 9, hy = cy - th / 2 + 9;
      A(tg, 'transform', `translate(${f2(cx)} ${f2(cy)})`);
      A(tsh, 'transform', `translate(${f2(cx + 3)} ${f2(cy + 5)})`);
      A(thread, 'd', `M${f2(ax)} ${f2(ay)}Q${f2((ax + hx) / 2 + 6)} ${f2((ay + hy) / 2 + 10)} ${f2(hx)} ${f2(hy)}`);
      show(tg, o); show(thread, o); show(tsh, o);
      show(tagTxt, tagO);
    }
  };
  C.set(0, 0, 0, 4, 0);
  return C;
}

// ------------------------------------------------------------------ заплатка из крафт-скотча (полупрозрачный край, чернильная надпись)
function makePatch(L, { w = 180, h = 54, text = '21.10', size = 20, floating = false, light = false } = {}) {
  const sg = S('g', {}, floating ? L.actSh : L.overSh), g = S('g', {}, floating ? L.act : L.over);
  const zz = (x, sgn) => { let d = ''; const n = 7; for (let i = 0; i <= n; i++) d += `L${f2(x + sgn * 2.6 * (i % 2))} ${f2(-h / 2 + h * i / n)}`; return d; };
  const d = `M${-w / 2} ${-h / 2}H${w / 2}` + zz(w / 2, 1) + `H${-w / 2}` + (() => { let q = ''; const n = 7; for (let i = n; i >= 0; i--) q += `L${f2(-w / 2 - 2.6 * (i % 2))} ${f2(-h / 2 + h * i / n)}`; return q; })() + 'Z';
  if (floating) S('path', { d, fill: 'none', stroke: PAL.shadow, 'stroke-opacity': 0.05, 'stroke-width': 12, 'stroke-linejoin': 'round' }, sg);   // мягкий край тени
  const shp = S('path', { d, fill: PAL.shadow, opacity: 0.1 }, sg);
  S('path', { d, fill: light ? '#EAD6AC' : '#C9A672', opacity: light ? 0.97 : 0.9 }, g);              // в воздухе — светлее платы на 15–20 %
  S('path', { d: rrD(w - 10, h - 14, 2), fill: light ? '#DFC696' : '#B9935C', opacity: 0.55 }, g);   // плотная середина, прозрачные края
  S('path', { d: `M${-w / 2 + 4} ${-h / 2 + 4}H${w / 2 - 4}`, stroke: '#FFF6E0', 'stroke-opacity': 0.5, style: olw(2) }, g);
  S('path', { d, fill: 'url(#pGrain)', opacity: 0.6 }, g);
  S('path', { d, fill: 'none', stroke: light ? '#7A5C36' : '#8E7046', 'stroke-opacity': light ? 0.85 : 0.55, style: olw(light ? 1.8 : 1.2) }, g);
  const tx = text ? tText(g, text, { size, weight: 700, fill: PAL.ink }) : null;
  const P = { g, sg, tx, w, h };
  P.set = (x, y, rot = 0, lift = 1, o = 1) => {
    if (o <= 0.002) { show(g, 0); show(sg, 0); return; }
    const s = 1 + 0.012 * lift, Ls = 1 + lift;
    A(g, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f2(rot)}) scale(${f2(s)})`);
    A(sg, 'transform', `translate(${f2(x + Ls * LIGHT.x)} ${f2(y + Ls * LIGHT.y)}) rotate(${f2(rot)}) scale(${f2(s * (1 + 0.004 * lift))})`);
    A(shp, 'opacity', f2(0.12 - 0.04 * clamp(lift / 20)));
    show(g, o); show(sg, o);
  };
  P.set(0, 0, 0, 0, 0);
  return P;
}

// ------------------------------------------------------------------ рваная трещина: тёмный разрыв + чернильные края + светлые волокна
// pts — ломаная справа налево; раскрытие — клип по x (фронт бежит справа налево) и по y (корни вниз)
let _crN = 0;
function crackGeom(pts, seed, wmin = 2.5, wmax = 6) {
  // ширина разрыва меняется вдоль трещины; края — со «щепой»
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    const end = Math.min(i, pts.length - 1 - i);
    const tip = pts.length - 1 - i;                                   // левый кончик сужается на ~100 px (трещина ещё идёт)
    const hw = (wmin + (wmax - wmin) * hash01(i, seed)) * clamp(Math.min(i / 2, tip / 4), 0.25, 1);
    const j1 = (hash01(i, seed + 1) - 0.5) * 1.6, j2 = (hash01(i, seed + 2) - 0.5) * 1.6;
    L.push([pts[i][0] + nx * (hw + j1), pts[i][1] + ny * (hw + j1)]);
    R.push([pts[i][0] - nx * (hw + j2), pts[i][1] - ny * (hw + j2)]);
  }
  const line = P => P.map((p, i) => (i ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1])).join('');
  return { gap: line(L) + line([...R].reverse()).replace('M', 'L') + 'Z', L: line(L), R: line(R), lip: line(L.map(p => [p[0] - 1.6, p[1] - 2.2])) };
}
function makeCrack(parent, defs, segs, { seed = 1 } = {}) {
  // segs: [{ pts, clip: 'x' | 'y' }] — горизонтальная часть по шву и корни вниз
  const out = segs.map((sg, k) => {
    const id = 'ck' + (++_crN), cp = S('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, defs);
    const r = S('rect', { x: 0, y: 0, width: 0, height: 0 }, cp);
    const g = S('g', { 'clip-path': `url(#${id})` }, parent);
    const G = crackGeom(sg.pts, seed + 31 * k, sg.wmin, sg.wmax);
    S('path', { d: G.lip, fill: 'none', stroke: '#F1DFBF', 'stroke-opacity': 0.85, style: olw(2.4), 'stroke-linejoin': 'round' }, g);   // светлые волокна верхнего края
    S('path', { d: G.gap, fill: '#2B2017' }, g);
    S('path', { d: G.gap, fill: 'none', stroke: PAL.ink, style: olw(2.6), 'stroke-linejoin': 'round' }, g);
    const xs = sg.pts.map(p => p[0]), ys = sg.pts.map(p => p[1]);
    return { r, g, clip: sg.clip, x0: Math.min(...xs) - 20, x1: Math.max(...xs) + 20, y0: Math.min(...ys) - 20, y1: Math.max(...ys) + 20, pts: sg.pts };
  });
  // v[k] 0..1 — доля раскрытия сегмента k
  return { segs: out, set: (v) => out.forEach((s, k) => {
    const u = clamp(v[k] ?? 0);
    if (s.clip === 'x') { const xf = lerp(s.x1, s.x0, u); A(s.r, 'x', f2(xf)); A(s.r, 'y', f2(s.y0)); A(s.r, 'width', f2(Math.max(0, s.x1 - xf))); A(s.r, 'height', f2(s.y1 - s.y0)); }
    else { const yf = lerp(s.y0, s.y1, u); A(s.r, 'x', f2(s.x0)); A(s.r, 'y', f2(s.y0)); A(s.r, 'width', f2(s.x1 - s.x0)); A(s.r, 'height', f2(Math.max(0, yf - s.y0))); }
    A(s.g, 'visibility', u <= 0.001 ? 'hidden' : 'visible');
  }) };
}
// точка на ломаной по x (для фронта и для посадки предметов)
function yAtX(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    if ((x <= ax && x >= bx) || (x >= ax && x <= bx)) return lerp(ay, by, (x - ax) / ((bx - ax) || 1));
  }
  return pts[pts.length - 1][1];
}
