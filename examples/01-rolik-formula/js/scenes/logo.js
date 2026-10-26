// Сцена 9: знак канала «Код и кадр» — фраза 9 «Это „Код и кадр“: объясняю технологии такими роликами и показываю,
// как они сделаны.»
//   рамка кадра рисуется половинами от центра верха → на «Код» из кончиков вырастают { } и встаёт каретка →
//   знак чуть сжимается, уголки видоискателя летят к рамке → на «кадр» (−80 мс) щелчок: заливка раскрывается
//   диафрагмой из центра, скобки и каретка темнеют на ней, две волны-рамки, лёгкая тряска, ding →
//   «КОД И КАДР» растёт по буквам от базовой линии, печатается @kod_i_kadr → удержание: каретка мигает, наезд 2,5 % →
//   на «такими роликами» в рамке играет хук ролика (hero() из film.js) → на «показываю» каретка вытягивается
//   в «play», скобки чуть раздвигаются → уход к T.s10.
// Контракт (film.js, kit.js): SCENES.logo = (g, ctx) => t => {...}; окно T.s9 … T.s10 + 0.35, к T.s10 + 0.3 всё ушло.
window.SCENES = window.SCENES || {};
SCENES.logo = (g, ctx) => {
  const { P, T, defs } = ctx;

  // ---- cues: от слов фразы 9 (секунды — только длительности и малые сдвиги)
  const C = {};
  C.draw = T.s9 + 0.2;                                           // акт 2 уходит T.s9 − 0.05 … + 0.23: линия стартует в почти пустом кадре
  C.snap = Math.max(pw(9, 'кадр').start - 0.08, C.draw + 0.5);   // щелчок за 80 мс до «кадр»
  C.brace = clamp(pw(9, 'код').start - 0.08, C.draw + 0.06, C.snap - 0.38);
  C.dFrame = clamp(C.snap - 0.2 - C.draw, 0.3, 0.6);            // рамка дорисована до предвкушения
  C.dBrace = clamp(C.snap - 0.14 - C.brace, 0.2, 0.32);
  C.caret = C.brace + 0.7 * C.dBrace;
  C.word = C.snap + 0.06;                                        // буквы — сразу за щелчком, готовы к «объясняю»
  C.handle = C.snap + 0.26;
  C.blink = C.snap + 0.6;
  C.out = T.s10 - 0.22;                                          // после «сделаны»; к T.s10 + 0.12 кадр пуст
  C.play = Math.min(pw(9, 'показываю').start - 0.08, C.out - 0.5);

  // ---- раскладка (кадр 1080×1920): знак y 277–675, надпись — низ строки выше y 840, ник ниже — уже 480 px
  const CX = 540, CY = 476, FW = 464, FH = 332, R = 64;          // рамка кадра: центр, размер, скругление
  const BASE = 812;                                              // базовая линия «КОД И КАДР»
  const BR = { a: 29, c: 33, h: 92, w: 26, d0: 134, d1: 146 };   // скобка: вынос, изгиб, полувысота, толщина; кончик от центра
  const CAR = { w: 14, h: 100 }, TRI = { w: 94, h: 108 };        // каретка и «play»
  const VF = { o: 28, len: 58, rc: 22, w: 10 };                  // уголки видоискателя: отступ, длина, скругление, толщина
  const IRIS = Math.hypot(FW / 2, FH / 2) + 12;

  // ---- помощники (внутри билдера: глобальная область общая)
  const ringWave = (t, t0, r0, r1, dur = 1.0) => {               // кольцо-волна из 07-logo-sting
    if (t < t0) return null;
    const p = clamp((t - t0) / dur);
    if (p >= 1) return null;
    return { r: lerp(r0, r1, ease.outExpo(p)), o: Math.pow(1 - p, 1.6), w: lerp(2.6, 0.8, p) };
  };
  // каретка (p = 0) → треугольник «play» (p = 1): левый край остаётся вертикалью, вершина уезжает вправо
  const triD = p => {
    const w = TRI.w * p, hh = lerp(CAR.h, TRI.h, p) / 2, xl = -0.36 * w;
    return `M${f2(xl)} ${f2(-hh)}L${f2(xl + w)} 0L${f2(xl)} ${f2(hh)}Z`;
  };
  // { } из двух половин от кончика; набор светлый (рисуется) или тёмный (на заливке, целиком)
  const { a, c, h } = BR;
  const BRACE = [`M0 0Q${a} 0 ${a} ${-c}V${-h + a}Q${a} ${-h} ${2 * a} ${-h}`, `M0 0Q${a} 0 ${a} ${c}V${h - a}Q${a} ${h} ${2 * a} ${h}`];
  const braceSet = (parent, color, drawOn) => {
    const set = { sides: [], halves: [] };
    [-1, 1].forEach(s => {
      const outer = S('g', {}, parent), inner = s > 0 ? S('g', { transform: 'scale(-1 1)' }, outer) : outer;
      BRACE.forEach(d => {
        const at = { stroke: color, 'stroke-width': BR.w };
        set.halves.push(drawOn ? drawStroke(inner, d, at) : S('path', { d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...at }, inner));
      });
      set.sides.push({ g: outer, s });
    });
    set.cg = S('g', { visibility: 'hidden' }, parent);
    set.caret = S('path', { d: triD(0), fill: color, stroke: color, 'stroke-width': CAR.w, 'stroke-linejoin': 'round' }, set.cg);
    return set;
  };
  const blinkOn = t => (t < C.blink || t >= C.play - 0.2 ? 1 : Math.floor((t - C.blink) / 0.53) % 2 === 0 ? 1 : 0);
  const Dt = track(BR.d0, [[C.play - 0.04, BR.d1, SP.tuck]]);

  // ---- построение: корень (тряска, наезд) → волны → знак → надпись → ник
  const root = S('g', {}, g);
  const wavesG = S('g', { transform: `translate(${CX} ${CY})` }, root);
  const waves = [0, 1].map(() => S('rect', { fill: 'none', stroke: P.hot, visibility: 'hidden' }, wavesG));
  const WAVES = [[C.snap + 0.06, 230, 0.7, 0.85], [C.snap + 0.18, 150, 0.6, 0.5]];   // старт, вырост, длительность, сила
  const markG = S('g', {}, root);                                // начало — в центре рамки (масштаб вокруг него)
  const vx = -FW / 2 - VF.o, vy = -FH / 2 - VF.o;
  const vfD = `M${vx} ${vy + VF.len}V${vy + VF.rc}Q${vx} ${vy} ${vx + VF.rc} ${vy}H${vx + VF.len}`;
  const vf = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => {
    const vg = S('g', { visibility: 'hidden' }, markG);
    S('path', { d: vfD, transform: `scale(${sx} ${sy})`, fill: 'none', stroke: P.ink, 'stroke-width': VF.w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, vg);
    return { g: vg, dx: -sx * 0.7071, dy: -sy * 0.7071 };      // прилёт по диагонали снаружи
  });
  const outlineG = S('g', {}, markG);
  const halves = rrHalves(-FW / 2, -FH / 2, FW, FH, R).map(d => drawStroke(outlineG, d, { stroke: P.hot, 'stroke-width': 12 }));
  const inkG = S('g', {}, markG), ink = braceSet(inkG, P.ink, true);
  const fillG = S('g', {}, markG), iris = clipCircle(defs, fillG);
  S('path', { d: rr(-FW / 2 - 6, -FH / 2 - 6, FW + 12, FH + 12, R + 6), fill: P.hot }, fillG);   // по внешнему краю обводки: после щелчка обводка не нужна (нет шва на стыке половин)
  const dark = braceSet(fillG, P.bg, false);
  // «такими роликами»: в рамке знака играет хук этого ролика (тот же hero() из film.js), на «показываю» — снова скобки
  C.reel = pw(9, 'такими').start - 0.12;
  C.reelOut = Math.max(C.reel + 0.6, C.play - 0.22);
  const scrClip = S('clipPath', { id: 'logoScr', clipPathUnits: 'userSpaceOnUse' }, defs);
  S('path', { d: rr(-FW / 2 + 14, -FH / 2 + 14, FW - 28, FH - 28, R - 12) }, scrClip);
  const scr = S('g', { 'clip-path': 'url(#logoScr)', visibility: 'hidden' }, fillG);
  const scrIn = S('g', {}, scr), scrIris = clipCircle(defs, scrIn);
  S('rect', { x: -FW / 2, y: -FH / 2, width: FW, height: FH, fill: P.bg }, scrIn);
  const reel = hero(S('g', { transform: `scale(${f2(Math.min((FW - 28) / 820, (FH - 28) / 760))}) translate(${-HC[0]} ${-HC[1]})` }, scrIn), ctx.LOOK);
  const WM = 'КОД И КАДР', ws = fitSize(WM, 672, 110);          // 672: с наездом 2,5 % строка ≤ 690 px
  const word = splitText(S('g', {}, root), WM, { x: CX, y: BASE, size: ws, font: FONT.head, weight: 900, fill: P.ink, anchor: 'middle' });
  word.chars.forEach(ch => pose(ch.g, ch.x, ch.y, 1, 1, 0, 0));
  const HN = '@kod_i_kadr', HS = 42, hw = 0.6 * HS, hx = CX - HN.length * hw / 2, HY = BASE + 70;   // моноширинный: колонка = 0,6 em
  const handleG = S('g', {}, root);
  const hAt = S('text', { x: f2(hx), y: HY, 'font-family': FONT.mono, 'font-weight': 700, 'font-size': HS, fill: P.hot }, handleG);
  const hName = S('text', { x: f2(hx + hw), y: HY, 'font-family': FONT.mono, 'font-weight': 700, 'font-size': HS, fill: P.mute, style: 'white-space:pre' }, handleG);

  // ---- звук: щелчок знака и «play»
  sfx(C.snap, 'ding', -4);
  // «play» — без звука: в ролике 12 звуковых моментов, этот лишний

  return t => {
    // корень: тряска на щелчке и медленный наезд на удержании (вокруг базовой линии надписи — текст не съезжает вниз)
    const sh = shake(t, C.snap, 7, 0.36, 4, 20);
    const push = 1 + 0.025 * prog(t, C.snap + 0.3, Math.max(0.5, C.out - C.snap - 0.3), ease.sine);
    A(root, 'transform', `translate(${f2(sh.x)} ${f2(sh.y)}) rotate(${f2(sh.rot * 0.5)} ${CX} ${CY}) translate(${CX} ${BASE}) scale(${f2(push)}) translate(${-CX} ${-BASE})`);

    // знак: предвкушение (сжатие) → щелчок с отскоком → уход (вверх, ×0.6, power4.in)
    const qM = ease.in4((t - C.out - 0.06) / 0.26);
    const sA = t < C.snap ? 1 - 0.045 * prog(t, C.snap - 0.15, 0.15, ease.inOut) : lerp(0.955, 1, step(t - C.snap, SP.hop));
    place(markG, CX, CY - 30 * qM, sA * lerp(1, 0.6, qM), 1 - qM);

    // рамка кадра: две половины от центра верха
    const fv = prog(t, C.draw, C.dFrame, ease.inOut);
    halves.forEach(hp => hp.draw(fv));

    // скобки растут из кончиков; на «показываю» раздвигаются без перелёта
    const D = Dt(t);
    ink.halves.forEach(hp => hp.draw(prog(t, C.brace, C.dBrace, ease.out)));
    [ink, dark].forEach(set => set.sides.forEach(sd => A(sd.g, 'transform', `translate(${f2(sd.s * D)} 0)`)));

    // каретка: встаёт после скобок, мигает на удержании; на «показываю» вытягивается в «play»
    const pc = t < C.caret ? 0 : step(t - C.caret, SP.popS), pm = t < C.play ? 0 : step(t - C.play, SP.pop);
    const cd = triD(pm), on = pc > 0.001 ? blinkOn(t) : 0;
    [ink, dark].forEach(set => { A(set.caret, 'd', cd); A(set.cg, 'transform', `scale(1 ${f2(Math.max(1e-3, pc))})`); show(set.cg, on); });

    // щелчок: заливка раскрывается диафрагмой из центра и накрывает светлые скобки — на ней тёмные
    const ir = prog(t, C.snap - 0.02, 0.16, ease.out);
    iris.set(0, 0, IRIS * ir);
    show(fillG, ir > 0 ? 1 : 0); show(inkG, ir < 1 ? 1 : 0); show(outlineG, ir < 1 ? 1 : 0);
    // ролик в рамке: открывается кругом из центра, фигуры влетают заново; закрывается перед «play»
    const ro = prog(t, C.reel, 0.24, ease.out) * (1 - prog(t, C.reelOut, 0.2, ease.in4));
    if (ro > 0) { scrIris.set(0, 0, IRIS * ro); reel.frame(t - C.reel + 0.15); show(scr, 1); } else show(scr, 0);

    // уголки видоискателя: прилетают по диагонали с разгоном и защёлкиваются на щелчке
    const cu = clamp((t - C.snap + 0.16) / 0.16), dv = 64 * (1 - cu * cu);
    vf.forEach(v => { A(v.g, 'transform', `translate(${f2(v.dx * dv)} ${f2(v.dy * dv)})`); show(v.g, clamp((t - C.snap + 0.16) / 0.06)); });

    // две волны в форме рамки расходятся от знака
    WAVES.forEach(([t0, r1, dur, k], i) => {
      const w = ringWave(t, t0, 6, r1, dur), el = waves[i];
      if (!w) { A(el, 'visibility', 'hidden'); return; }
      A(el, 'x', f2(-FW / 2 - w.r)); A(el, 'y', f2(-FH / 2 - w.r));
      A(el, 'width', f2(FW + 2 * w.r)); A(el, 'height', f2(FH + 2 * w.r)); A(el, 'rx', f2(R + w.r));
      A(el, 'stroke-width', f2(w.w * 3 * k)); A(el, 'opacity', f2(w.o * 0.85 * k)); A(el, 'visibility', 'visible');
    });

    // «КОД И КАДР»: буквы растут от базовой линии со сквошем (ниже строки не опускаются); уходят вверх справа налево
    const n = word.chars.length;
    word.chars.forEach((ch, i) => {
      const t0 = C.word + i * 0.032;
      if (t < t0) { pose(ch.g, ch.x, ch.y, 1, 1, 0, 0); return; }
      const e = step(t - t0, SP.pop), q = ease.in4((t - C.out - 0.02 - (n - 1 - i) * 0.012) / 0.22);
      const sx = e < 1 ? lerp(1.2, 1, e) : 1 - 0.6 * (e - 1);
      pose(ch.g, ch.x, ch.y - q * ws * 0.6, sx, Math.max(1e-3, e), 0, step(t - t0, SP.out) * (1 - q));
    });

    // ник печатается по символам
    const k = Math.round(clamp((t - C.handle) / 0.38) * HN.length);
    setText(hAt, k >= 1 ? '@' : ''); setText(hName, HN.slice(1, Math.max(1, k)));
    const qH = ease.in4((t - C.out) / 0.2);
    place(handleG, 0, -20 * qH, 1, 1 - qH);
  };
};
