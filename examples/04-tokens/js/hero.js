// hero.js — плитка 46825: один предмет через весь ролик.
// Маршрут: хук (схлопывание, штамп №1) → гнездо полоски → прыжок на основу пирамиды (рассыпается) → вершина пирамиды →
// диагональ к сцене 5 → ящик-таблица → (вне кадра) → въезжает в сцену 7 → за пером в гнездо → на «Проверь:» — слово.
window.SC = window.SC || {};

SC.hero = async (ctx) => {
  const { L, API } = ctx;
  const hero = makeTile(L.tiles2, L.sh, { w: 720, h: 250, tone: 'kraft', r: 8, depth: 6, yellow: true });
  // лицо: отпечаток номера (штамп), над ним — «·хорошо» только на вершине пирамиды
  const numG = S('g', {}, hero.front);
  const print = stampPrint(numG, [{ t: '46825', size: 160 }], { rot: -1.5, seed: 17 });
  const vtx = S('g', {}, hero.front);
  const vtxTxt = textWidth('хорошо', 40, 'Onest', 600) + 22;
  S('circle', { cx: -vtxTxt / 2 + 7, cy: -50, r: 6, fill: PAL.graphite }, vtx);
  tText(vtx, 'хорошо', { x: 11, y: -52, size: 40, weight: 600 });
  // обратная сторона: слово, как напечатано в полоске (финал)
  const backTxt = S('text', { x: 0, y: 78 * 0.35, 'font-family': 'Onest', 'font-size': 78, 'font-weight': 600, fill: PAL.ink }, hero.back);
  backTxt.textContent = 'хорошо';
  const blk1 = makeStampBlock(L.props, 600, 236, { tilt: 12, side: 36 });

  const C5 = LY.s5, C7 = LY.s7;
  const P5 = { x: C5.x, y: C5.y - 530 };                     // сцена 5: кадр (540, 430)
  const P7 = { x: C7.x - 337, y: C7.y - 270 };                // сцена 7: кадр (203, 690); до скобки сетки ~30 px
  const OFF = { x: 860, y: C7.y - 270 };                      // вне кадра слева от сцены 7
  const HOOK = { x: 450, y: LY.row.y };
  const T0 = T.st1 - 0.1;                                    // плита появляется, когда 7 плиток уже наползли (пустая ≤ 3 к)
  const T_FLY = T.s2m + 0.02, T_SOCK = T_FLY + 0.6;
  const T_LAND = API.pyrLand, V = API.vertex;
  const T_V0 = V.t0 + 0.25 * V.D;
  const T_GO = T.pullIn, T_ARR5 = T.pullEnd;                 // на полке 46825 стоит на вершине; к сцене 5 — вместе с камерой
  const T_BOX = T.box, T_BOXIN = T.box + 0.75;
  const T_OFF0 = T.s6 + 1.2, T_OFF1 = T_OFF0 + 2.2;
  const T_IN = T.heroIn, T_IN1 = T.heroIn + 0.5;
  const T_FOL = T.pen + 0.12, T_SIT = T.sock;
  const BACK7 = 5 / 30;
  API.heroRoute = [HOOK, API.sock(9), API.base, { x: V.x, y: V.y }, P5, API.boxSlot || P5, OFF, P7, API.sockPrinted];

  // общая форма состояния: { x, y, w, h, s, rot, lift, o, num: { s, y }, vtx, flip, sy }
  function st(t) {
    if (t < T0) return null;
    if (t < T_FLY) {                                          // хук: плитка из 7 → крупная, штамп
      const g = step(t - T0, { r: 0.4, z: 0.78 });
      const sq = t > T.st1 ? 1 - 0.035 * Math.exp(-(t - T.st1) / 0.06) : 1;
      return { x: HOOK.x, y: HOOK.y, w: 720, h: 250 * sq, lift: 4, num: { s: 1, y: 0 }, vtx: 0 };
    }
    if (t < T.jump) {                                         // в гнездо и в гнезде
      // в гнездо: сначала плита сжимается под полоской до размера гнезда (ниже строки с «?»),
      // потом входит в гнездо строго снизу — мягкая посадка popS, без бокового скольжения под «?»
      const S_ = API.sock(t), A1 = T_FLY + 0.3, B1 = { x: S_.x, y: 890 };
      const a = ease.inOut(prog(t, T_FLY, A1 - T_FLY)), b = t < A1 ? 0 : step(t - A1, SP.popS);
      const fb = Math.sin(Math.PI * prog(t, T.flip + 11 / 30, 0.24));
      const x = lerp(lerp(HOOK.x, B1.x, a), S_.x, clamp(b)), y = lerp(lerp(HOOK.y, B1.y, a), S_.y, b);
      return { x, y, w: lerp(720, S_.w, a), h: lerp(250, S_.h, a),
        lift: 3 + 14 * Math.sin(Math.PI * a) + 8 * Math.sin(Math.PI * clamp(b)) * (t < A1 + 0.3 ? 1 : 0) + 6 * fb, rot: 3 * Math.sin(Math.PI * a),
        num: { s: lerp(1, 0.41, a), y: 0 }, vtx: 0, depth: lerp(6, 4, a) };
    }
    if (t < T_LAND + 0.02) {                                  // прыжок на основу пирамиды
      const S_ = API.sock(T.jump), a = prog(t, T.jump + 0.02, T_LAND - T.jump - 0.02);
      const B = API.base, ea = ease.inOut(a);
      // летит вместе с камерой (та же кривая): на экране идёт выше субтитров, без «гребёнки» через весь кадр
      return { x: lerp(S_.x, B.x, ea * ea), y: lerp(S_.y, B.y, ea), w: lerp(S_.w, B.w, ea), h: lerp(S_.h, B.h, ea),
        lift: 4 + 30 * Math.sin(Math.PI * a), rot: 5 * Math.sin(Math.PI * a), num: { s: lerp(0.41, 0.5, ea), y: 0 }, vtx: 0 };
    }
    if (t < T_V0) return null;                                 // рассыпалась на байты
    if (t < T_GO) {                                           // вершина пирамиды
      const a = prog(t, T_V0, 0.57 * V.D, ease.out4), land = t >= V.tLand ? step(t - V.tLand, { r: 0.26, z: 0.7 }) : 0;
      const kidY = LY.pyr0 - 3 * 160;
      // вершина = число из хука: номер шрифтом штампа 110 px, жёлтая заливка 0,4 с
      const yel = t < V.tLand ? 0 : t < V.tLand + 0.42 ? prog(t, V.tLand, 0.12, ease.out) : 1 - prog(t, V.tLand + 0.42, 0.16, ease.inOut);
      return { x: V.x, y: lerp(kidY - 18, V.y, a) + (t >= V.tLand ? 3 * (1 - land) : 0), w: V.w, h: V.h, s: lerp(0.9, 1, a), lift: lerp(16, 4, a),
        num: { s: 110 / 160, y: 22 }, vtx: 1, numO: prog(t, V.tLand - 0.02, 0.06), yel };
    }
    if (t < T_BOX) {                                          // диагональ к сцене 5 вместе с камерой
      const a = ease.inOut(prog(t, T_GO, T_ARR5 - T_GO));
      return { x: lerp(V.x, P5.x, a) + 140 * Math.sin(Math.PI * a), y: lerp(V.y, P5.y, a), w: lerp(V.w, 620, a), h: lerp(V.h, 190, a), lift: 4 + 14 * Math.sin(Math.PI * a),
        num: { s: lerp(110 / 160, 0.84, a), y: lerp(22, 0, a) }, vtx: 1 - clamp(a * 2.5), rot: -2 * Math.sin(Math.PI * a) };
    }
    const BS = API.boxSlot || P5;
    if (t < T_OFF0) {                                         // в ящик-таблицу
      const a = ease.inOut(prog(t, T_BOX, T_BOXIN - T_BOX));
      return { x: lerp(P5.x, BS.x, a), y: lerp(P5.y, BS.y, a) - 60 * Math.sin(Math.PI * a), w: lerp(620, BS.w, a), h: lerp(190, BS.h, a), lift: 4 + 18 * Math.sin(Math.PI * a),
        num: { s: lerp(0.84, BS.h / 250 * 0.95, a), y: 0 }, vtx: 0, rot: -3 * Math.sin(Math.PI * a) };
    }
    if (t < T_IN) {                                           // вне кадра: из ящика к сцене 7
      const a = ease.inOut(prog(t, T_OFF0, T_OFF1 - T_OFF0));
      return { x: lerp(BS.x, OFF.x, a), y: lerp(BS.y, OFF.y, a), w: lerp(BS.w, 260, a), h: lerp(BS.h, 110, a), lift: 4, num: { s: lerp(BS.h / 250 * 0.95, 0.34, a), y: 0 }, vtx: 0 };
    }
    if (t < T_FOL) {                                          // въезжает из-за края и лежит рядом с сеткой
      const a = ease.out4(prog(t, T_IN, T_IN1 - T_IN));
      // на крэш-зуме уходит за левый край вместе с камерой (в кадре удара — только сетка)
      const cz = ease.in4(prog(t, T.crash, 0.2));
      return { x: lerp(OFF.x, P7.x, a) - 160 * cz, y: P7.y, w: 260, h: 110, lift: 4 + 6 * (1 - a), rot: 3 * (1 - a), num: { s: 0.34, y: 0 }, vtx: 0 };
    }
    // за пером — в гнездо; на «Проверь:» — переворот в слово и смыкание швов
    const S_ = API.sock(t), TB = T_FOL + 0.72 * (T_SIT - T_FOL), B1 = { x: S_.x, y: 880 };
    const a = ease.inOut(prog(t, T_FOL, TB - T_FOL)), b = t < TB ? 0 : step(t - TB, SP.popS);
    const fl = ease.inOut(prog(t, T.chk + BACK7, 0.16));
    const x = lerp(lerp(P7.x - 160, B1.x, a), S_.x, clamp(b)), y = lerp(lerp(P7.y, B1.y, a) - 60 * Math.sin(Math.PI * a), S_.y, b);
    return { x, y, w: lerp(260, S_.w, a), h: lerp(110, S_.h, a), s: S_.s,
      lift: 3 + 22 * Math.sin(Math.PI * a) + 6 * Math.sin(Math.PI * clamp(b)) * (t < TB + 0.3 ? 1 : 0), rot: -4 * Math.sin(Math.PI * a),
      num: { s: lerp(0.34, 0.41, a), y: 0 }, vtx: 0, flip: fl, depth: lerp(6, 4, a) - (fl > 0.5 ? 1 : 0), gray: fl > 0.5 };
  }
  function frame(t) {
    const s = t >= API.tSwap ? null : st(t);
    if (!s) hero.hide();
    else {
      hero.T.depth = s.depth ?? 6;
      hero.setTone(s.gray ? 'gray' : 'kraft');
      hero.T.line = s.gray ? 2.5 : 3;
      hero.set({ x: s.x, y: s.y, w: s.w, h: s.h, s: s.s ?? 1, rot: s.rot ?? 0, lift: s.lift, flip: s.flip ?? 0, yel: s.yel ?? 0 });
      A(numG, 'transform', `translate(0 ${f2(s.num.y)}) scale(${f2(s.num.s)})`);
      print.set(t >= T.st1 ? 1 : 0, 0, 0);
      A(numG, 'opacity', f2(s.numO ?? 1));
      show(vtx, s.vtx ?? 0);
      // слово на обороте: из центра в печатное положение по мере смыкания
      const sp = API.sockPrinted, S_ = API.sock(t);
      const u = (S_.w - sp.w) / Math.max(1, (API.sock(T.chk).w - sp.w));
      A(backTxt, 'x', f2(lerp(sp.txtX, -textWidth('хорошо', 78, 'Onest', 600) / 2, clamp(u))));
      A(backTxt, 'opacity', '0.46');
    }
    // штамп №1: брусок падает на крупную плитку
    const ph = t < T.st1 ? 1 - clamp((T.st1 - t) / 0.28) : 1 + clamp((t - T.st1 - 0.02) / 0.22);
    blk1(t < T.st1 - 0.28 ? 0 : ph, HOOK.x, HOOK.y, 0);
  }
  sfx(T.st1 - 0.05, 'stamp', -5);
  sfx(T_SOCK - 0.02, 'chip_lay', -12);
  sfx(T.jump + 0.05, 'swish', -15);
  sfx(T_GO, 'swish', -16);
  sfx(T_IN, 'card_slide', -14);
  sfx(T_SIT - 0.03, 'chip_lay', -11);
  return { frame, mapT: 6.5 };
};
