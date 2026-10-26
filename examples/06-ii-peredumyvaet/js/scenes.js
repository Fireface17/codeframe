// scenes.js — хореография ролика №6 (v2): что где лежит и как движется в момент t (cues T и раскладка LY — film.js).
// Правило быстрых предметов (претензия к klon_v1, «штрихкод»): путь ≤ 240 px за 0,3 с с замедлением, тело непрозрачное,
// посадка резкая, тень 14 → 6 px; длинные проезды листков — 0,55–0,7 с с разгоном и торможением (+ больше подкадров).

// ------------------------------------------------------------------ помощники
const land = (t, t0, sp = SP.popS) => (t < t0 ? 0 : step(t - t0, sp));
const win = (t, a, b) => t >= a && t < b;
// посадка бумажки/карточки: из воздуха (lift 16, ×1,06, поворот) на место; уход: подъём и отлёт
function slipPose(t, t0, tOut = Infinity, o = {}) {
  if (t < t0 - 0.14) return null;
  const a = clamp((t - (t0 - 0.14)) / 0.14);
  const s = land(t, t0, { r: 0.36, z: 0.8 });
  const g = { x: 0, y: 0, lift: lerp(16, o.lift ?? 3, s), s: lerp(1.06, 1, s), rot: lerp(o.r0 ?? 3, 0, s), o: Math.min(1, a * 1.6) };
  g.x = (o.fx ?? 60) * (1 - a) * (1 - a); g.y = (o.fy ?? -120) * (1 - a) * (1 - a);
  if (t >= tOut) {
    const u = ease.in4(clamp((t - tOut) / (o.dOut ?? 0.3)));
    g.x += (o.ox ?? 160) * u; g.y += (o.oy ?? -260) * u; g.lift += 26 * u; g.rot += (o.or ?? 10) * u;
    if (o.fade !== false) g.o *= 1 - clamp((u - 0.75) / 0.25);
    if (u >= 1) return null;
  }
  return g;
}
// «шлепок»: карточка с руки — появляется над местом (×s0, тень 14+), за d с ложится с замедлением (путь ≤ 240 px), тень → 6 px
function slapPose(t, t0, { d = 0.26, dx = 70, dy = -120, s0 = 1.22, r0 = 5, l0 = 18, l1 = 4 } = {}) {
  if (t < t0 - d) return null;
  const u = clamp((t - (t0 - d)) / d), e = ease.out(u);
  const settle = t > t0 ? 0.012 * Math.exp(-(t - t0) / 0.05) * Math.cos((t - t0) * 60) : 0;
  return { x: dx * (1 - e), y: dy * (1 - e), s: lerp(s0, 1, e) - settle, rot: r0 * (1 - e), lift: lerp(l0, l1, e), o: 1 };
}
// проезд листка из-за края кадра (разгон и торможение): 0 → 1
const glide = (t, t0, d) => ease.inOut(clamp((t - t0) / d));
const rotP = (x, y, deg) => { const a = deg * Math.PI / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };
const toW = (pose, lx, ly) => { const [dx, dy] = rotP(lx * (pose.s ?? 1), ly * (pose.s ?? 1), pose.rot ?? 0); return [pose.x + dx, pose.y + dy]; };
const jig = (t, t0, amp = 1, d = 0.3, f = 32) => (t < t0 || t > t0 + d ? 0 : amp * Math.exp(-(t - t0) / (d * 0.35)) * Math.sin((t - t0) * f));
// штамп-брусок: подлёт в плоскости (0,45 с, разгон-торможение) → опускание (0,15 с) → касание tc → подъём ≤ 240 px (0,3 с) → уход (0,5 с)
function stampMotion(t, tc, { from = [900, -900], away = [1100, -1000], tAway = tc + 0.5, fast = 0 } = {}) {
  // fast: после касания — сразу вверх-вправо за fast с (разгон-торможение), не по оттиску
  if (fast && t >= tc + 0.03) { if (t > tc + 0.03 + fast) return null; const u = glide(t, tc + 0.03, fast); return { dx: away[0] * u, dy: away[1] * u, hgt: ease.out(clamp((t - tc - 0.03) / 0.08)) }; }
  if (t < tc - 0.6 || t > tAway + 0.5) return null;
  if (t < tc - 0.15) { const u = glide(t, tc - 0.6, 0.45); return { dx: from[0] * (1 - u), dy: from[1] * (1 - u), hgt: 1 }; }
  if (t < tc) return { dx: 0, dy: 0, hgt: 1 - ease.in((t - tc + 0.15) / 0.15) };
  if (t < tc + 0.05) return { dx: 0, dy: 0, hgt: 0 };
  // подъём и сразу в сторону (за 0,4 с с замедлением открывает отпечаток), потом — уход за кадр
  const a = ease.out(clamp((t - tc - 0.05) / 0.4)), h = ease.out(clamp((t - tc - 0.05) / 0.15));
  if (t < tAway) return { dx: away[0] * 0.3 * a, dy: away[1] * 0.3 * a, hgt: h };
  const u = glide(t, tAway, 0.5); return { dx: away[0] * (0.3 + 0.7 * u), dy: away[1] * (0.3 + 0.7 * u), hgt: 1 };
}

// ------------------------------------------------------------------ шапка «ChatGPT»: маршрут (сценарий §6)
// шапка столбца → на «уступают?» отрывается и едет к подносу (×1,75, кренится к А на 12°) → под лайки у календаря →
// у подноса выпрямляется → на «Но потом» возвращается шапкой (×1) → под двумя нажимами не кренится → шапка в кадре 0
function headAt(t) {
  // v6.1: шапка столбца → на «Почему?» отрывается и едет к подносу (×1,75) → на «согласию» кренится к А → на «Поэтому»
  // выпрямляется → под нажимом не кренится → на уроке возвращается шапкой (×1)
  const H0 = { x: LY.head.x, y: LY.head.y, rot: LY.head.rot }, H3 = LY.head3, S3 = H3.s;
  const TILT = { dx: -38, dy: 14, rot: -12 };
  const tilt = t < T.tilt ? 0 : step(t - T.tilt, { r: 0.5, z: 0.62 });
  const k = tilt * (1 - ease.inOut(clamp((t - T.straight) / 0.45)));
  const travel = (t0, d, A_, B_) => { const u = ease.inOut(prog(t, t0, d)); return { x: lerp(A_.x, B_.x, u), y: lerp(A_.y, B_.y, u), u }; };
  let p, lift = 4, rot = H0.rot, s = 1;
  if (t < T.lift3) p = H0;
  else if (t < T.toTray) { const u = ease.out(prog(t, T.lift3, 0.12)); p = { x: H0.x + 6 * u, y: H0.y - 10 * u }; lift = 4 + 12 * u; rot = lerp(H0.rot, 2, u); s = 1 + 0.08 * u; }
  else if (t < T.home) {
    const q = travel(T.toTray, 0.46, { x: H3.x - 200, y: H3.y + 80 }, H3); p = q;   // v8: после склейки — короткий подлёт (≤ 240 px)
    const ld = t < T.toTray + 0.46 ? 0 : step(t - T.toTray - 0.46, { r: 0.4, z: 0.8 });
    s = lerp(1.08, S3, q.u); lift = lerp(16, 7, ld); rot = lerp(2, 0, ld);
  } else {
    const q = travel(T.home, 0.62, H3, H0); p = q; s = lerp(S3, 1, q.u);
    lift = lerp(7, 4, q.u) + 14 * Math.sin(Math.PI * q.u); rot = lerp(0, H0.rot, q.u);
  }
  rot += TILT.rot * k;
  let pr = 0;
  T.press.forEach(tp => { if (t >= tp && t < tp + 0.28) pr = Math.max(pr, Math.sin(Math.PI * (t - tp) / 0.28)); });
  return { x: p.x + TILT.dx * k * s, y: p.y + TILT.dy * k * s, rot, lift: lift - 3 * pr, s: s * (1 - 0.018 * pr) };
}

// ------------------------------------------------------------------ v8: четыре карандаша-руки кладут лайки на А (рука 0 — основной карандаш)
let HANDS = null;
function initHands() {
  HANDS = [
    { wait: { x: 1080, y: -640 }, far: { x: 1750, y: -300 }, ang: 28 },
    { wait: { x: 660, y: -1090 }, far: { x: 250, y: -1500 }, ang: -150 },
    { wait: { x: 930, y: -1330 }, far: { x: 1000, y: -1950 }, ang: -82 },
    { wait: { x: 660, y: -680 }, far: { x: 250, y: -250 }, ang: 128 },
  ];
  const n = T.likes.length;
  T.handsIn = cutT(T.toTray); T.handsOut = T.likes[n - 1] + 0.42;
}
// откуда прилетает лайк i: со стороны своей руки (путь ≤ 140 мира)
function pileOff(i) {
  const k = R.pile[i].home, h = HANDS[i % 4].wait, dx = h.x - k.x, dy = h.y - k.y, L_ = Math.hypot(dx, dy) || 1;
  return { x: 130 * dx / L_, y: 130 * dy / L_ };
}
function handAt(k, t) {
  const H = HANDS[k], ev = T.likes.map((tl, i) => i).filter(i => i % 4 === k);
  const D = 0.2, AP = 0.2, HOLD = 0.06, RET = 0.3;
  const mix = (A_, B_, u, la, lb) => ({ x: lerp(A_.x, B_.x, u), y: lerp(A_.y, B_.y, u), ang: H.ang, lift: lerp(la, lb, u) + 0.25 * Math.sin(Math.PI * u) });
  for (let j = 0; j < ev.length; j++) {
    const i = ev[j], ti = T.likes[i], hm = R.pile[i].home, o = pileOff(i);
    const from = j ? H.wait : H.far, to = j < ev.length - 1 ? H.wait : H.far;
    const st = { x: hm.x + o.x, y: hm.y + o.y };
    if (t < ti - D - AP) return j ? { ...H.wait, ang: H.ang, lift: 0.4 } : { ...H.far, ang: H.ang, lift: 0.5 };
    if (t < ti - D) return mix(from, st, ease.inOut((t - (ti - D - AP)) / AP), 0.5, 0.2);
    if (t < ti) { const e = ease.out((t - (ti - D)) / D); return { x: hm.x + o.x * (1 - e), y: hm.y + o.y * (1 - e), ang: H.ang, lift: 0.2 * (1 - e) }; }
    if (t < ti + HOLD) return { x: hm.x, y: hm.y, ang: H.ang, lift: 0 };
    if (t < ti + HOLD + RET) return mix(hm, to, ease.inOut((t - ti - HOLD) / RET), 0, 0.45);
  }
  return { ...H.far, ang: H.ang, lift: 0.5 };
}

// ------------------------------------------------------------------ карандаш: ключевые позы + активные отрезки (письмо, стук, галочки, стрелки)
const PEN = { keys: [], acts: [] };
function penInit() {
  const K = (t, x, y, ang = 34, lift = 0.15) => PEN.keys.push({ t, x, y, ang, lift });
  const ACT = (t0, t1, fn) => PEN.acts.push({ t0, t1, fn });
  const tt = R.ttl, TW = R.ttlTW;
  // v9: кадр 0 — карандаш у конца «хотя прав был он» (надпись целиком) → стук по скотчу на «фраза» → лежит справа от скотча
  const s0 = tt.tip(0, 0), h0 = R.hint.tip(0, 0), pe = R.hint.tip(0, 1);
  PEN.P0 = { x: pe[0], y: pe[1], ang: 30, lift: 0.1 };
  const tapeR = { x: LY.tape.x + LY.tape.w / 2 - 70, y: LY.tape.y + 8 };
  const rest1 = { x: LY.tape.x + LY.tape.w / 2 + 30, y: LY.tape.y + 40 };
  K(0, PEN.P0.x, PEN.P0.y, PEN.P0.ang, PEN.P0.lift);
  K(0.12, PEN.P0.x + 4, PEN.P0.y + 2, 31, 0.12);
  K(T.tap1 - 0.1, tapeR.x, tapeR.y, 40, 0.4);
  [T.tap1, T.tap2].forEach(tq => ACT(tq - 0.06, tq + 0.1, t => ({ x: tapeR.x + (tq === T.tap2 ? 10 : 0), y: tapeR.y, ang: 40, lift: 0.4 * Math.abs(Math.cos(Math.PI * (t - tq + 0.06) / 0.16)) })));
  K(T.tap2 + 0.1, tapeR.x + 10, tapeR.y, 40, 0.4);
  K(T.tap2 + 0.45, rest1.x, rest1.y, 52, 0.12);
  K(T.s2, rest1.x + 6, rest1.y + 4, 52, 0.12);
  // 2. тест: пишет мою реплику «Ты не прав, там 6 букв» на «нарочно спорил», подчёркивает «6» на «шесть», отходит вправо
  const uw = R.uw, u0 = uw.tip(0, 0);
  K(T.uw - 0.14, u0[0], u0[1], 34, 0.35);
  ACT(T.uw, T.uwEnd, t => { const p = uw.tip(0, (t - T.uw) / (T.uwEnd - T.uw)); return { x: p[0], y: p[1] + 2 * Math.sin(t * 40), ang: 34, lift: 0.05 }; });
  K(T.uwEnd + 0.12, uw.tip(0, 1)[0] + 10, uw.tip(0, 1)[1] + 6, 34, 0.25);
  const sp = R.sixPt;
  K(T.six - 0.1, sp.x - 22, sp.y, 34, 0.25);
  ACT(T.six, T.six + 0.25, t => ({ x: lerp(sp.x - 20, sp.x + 20, ease.inOut((t - T.six) / 0.25)), y: sp.y, ang: 34, lift: 0.03 }));
  // нумерует «о» снизу: 1…7 по 0,15 с, потом выводит крупную «7»
  const NP = R.numPts;
  K(T.num0 - 0.12, NP[0].x - 10, NP[0].y, 34, 0.3);
  ACT(T.num0, T.num0 + 7 * T.oStep, t => { const v = (t - T.num0) / T.oStep, i = Math.min(6, Math.floor(v)), u = v - i, p = NP[i], q = NP[Math.min(6, i + 1)];
    return u < 0.6 ? { x: p.x - 6 + 12 * u / 0.6, y: p.y + 4 * Math.sin(u * 20), ang: 34, lift: 0.03 } : { x: lerp(p.x + 6, q.x - 6, (u - 0.6) / 0.4), y: p.y - 10, ang: 34, lift: 0.25 }; });
  const b7 = R.big7.tip(0, 0);
  K(T.big7 - 0.02, b7[0], b7[1], 34, 0.25);
  ACT(T.big7, T.big7 + 0.25, t => { const p = R.big7.tip(0, (t - T.big7) / 0.25); return { x: p[0], y: p[1] + 20 * Math.sin((t - T.big7) * 25), ang: 34, lift: 0.03 }; });
  K(T.big7 + 0.6, b7[0] + 420, b7[1] + 160, 40, 0.35);
  K(T.s6 - 0.05, b7[0] + 430, b7[1] + 170, 40, 0.35);
  // 3. кульминация: «пишет» реплику по словам голоса; на последнем слове уходит вправо за кадр
  const w0 = R.reply[0], wEnd = WS(39) + 0.14;
  K(T.q0 - 0.1, w0.x - 6, w0.y - 10, -35, 0.25);
  ACT(T.q0, wEnd, t => {
    let k = 0;
    for (let i = 0; i < R.reply.length; i++) if (t >= WS(30 + i) - 0.02) k = i;
    const nx = k + 1 < R.reply.length ? R.reply[k + 1] : null, w = R.reply[k], s = WS(30 + k);
    const e = !nx ? wEnd : nx.y !== w.y ? Math.max(s + 0.1, Math.min(WE(30 + k), WS(31 + k) - 0.16)) : Math.max(s + 0.12, WE(30 + k));
    const u = clamp((t - s) / (e - s));
    let x = w.x + w.w * u, y = w.y - 10;
    if (t > e && nx) { const v = clamp((t - e) / Math.max(0.05, WS(30 + k + 1) - e)); x = lerp(w.x + w.w, nx.x, ease.inOut(v)); y = lerp(w.y - 10, nx.y - 10, ease.inOut(v)); }
    return { x, y: y + 3 * Math.sin(t * 38), ang: -35, lift: t > e ? 0.25 : 0.02 };
  });
  K(wEnd + 0.24, 440, -150, -35, 0.6);
  K(T.hit + 0.3, 760, -1300, -38, 0.9);                                                  // за кадром (в тишине не виден)
  // 4. ядро: на «шесть» зачёркивает мою «6»
  K(T.cross - 0.14, sp.x - 26, sp.y - 2, 34, 0.3);
  ACT(T.cross, T.cross + 0.25, t => { const u = ease.inOut((t - T.cross) / 0.25); return { x: lerp(sp.x - 22, sp.x + 24, u), y: lerp(sp.y - 6, sp.y - 44, u), ang: 34, lift: 0.03 }; });
  K(T.cross + 0.5, sp.x + 330, sp.y + 120, 40, 0.35);
  K(T.lift3, sp.x + 340, sp.y + 126, 40, 0.35);
  // 5. объяснение: у подноса — галочка и плюс на А; на «правило» давит на «ChatGPT» дважды — не кренится
  // v8: лайки наперебой — этот карандаш одна из четырёх рук (handAt 0); потом давит на «ChatGPT» дважды
  const H0w = HANDS[0];
  K(T.toTray + 0.4, H0w.far.x, H0w.far.y, H0w.ang, 0.5);
  K(T.handsOut, H0w.far.x, H0w.far.y, H0w.ang, 0.5);
  const H3 = LY.head3, hp = { x: H3.x + 120, y: H3.y - 12 };
  K(T.press[0] - 0.2, hp.x + 10, hp.y - 12, -38, 0.45);
  T.press.forEach(tp => {
    ACT(tp, tp + 0.28, t => { const u = Math.sin(Math.PI * clamp((t - tp) / 0.28)); return { x: hp.x, y: hp.y + 4 * u, ang: -38, lift: 0.3 * (1 - u) }; });
    K(tp + 0.29, hp.x + 6, hp.y - 10, -38, 0.3);
  });
  K(T.rule + 0.15, hp.x + 380, hp.y - 60, -38, 0.5);                                   // уходит вправо-вверх: плашка открыта
  K(T.s8, 640, -900, -38, 0.6);
  // 7. урок: «?» над «6», пунктир пустой карточки
  const lp = () => ({ x: LY.lesson.x, y: LY.lesson.y, rot: LY.lesson.rot });
  const qL = R.lesQpos, eL = R.lesEpos, ew = R.lesEW / 2, eh = R.lesEH / 2;
  K(T.neq + 0.35, ...toW(lp(), eL[0] + ew + 120, eL[1] - 120), -36, 0.4);
  K(T.empty - 0.1, ...toW(lp(), eL[0], eL[1] - eh), -36, 0.3);
  ACT(T.empty, T.empty + 0.4, t => { const u = ease.inOut((t - T.empty) / 0.4), a = Math.PI * u; const [x, y] = toW(lp(), eL[0] - ew * Math.sin(a), eL[1] - eh * Math.cos(a)); return { x, y, ang: -36, lift: 0.03 }; });
  K(T.empty + 0.6, ...toW(lp(), eL[0] + ew + 90, eL[1] - 40), -38, 0.35);
  K(T.s9 + 0.2, 640, -120, -38, 0.4);
  // 8. петля (v9): после переворота «подтвердил» в скотч карандаш выводит надпись и «хотя прав был он» заново (поза кадра 0)
  K(T.conf - 0.3, 700, -300, -38, 0.5);
  K(T.turn - 0.05, 640, -420, -20, 0.5);
  K(T.rewrite - 0.04, s0[0], s0[1], 15, 0.15);
  ACT(T.rewrite, T.writeEnd, t => {
    const tl = t - T.rewrite;
    for (let i = 0; i < 4; i++) {
      const [a, b] = TW[i];
      if (tl < a) { const pr = TW[i - 1][1], u = ease.inOut((tl - pr) / (a - pr)), A_ = tt.tip(i - 1, 1), B_ = tt.tip(i, 0); return { x: lerp(A_[0], B_[0], u), y: lerp(A_[1], B_[1], u), ang: 15 + 5 * i, lift: 0.45 * Math.sin(Math.PI * u) + 0.1 }; }
      if (tl <= b) { const p = tt.tip(i, (tl - a) / (b - a)); return { x: p[0], y: p[1], ang: 15 + 5 * i, lift: 0.1 }; }
    }
    return { x: h0[0], y: h0[1], ang: 30, lift: 0.1 };
  });
  K(T.hint - 0.01, h0[0], h0[1], 30, 0.2);
  ACT(T.hint, T.hintEnd, t => { const p = R.hint.tip(0, (t - T.hint) / (T.hintEnd - T.hint)); return { x: p[0], y: p[1] + 2 * Math.sin(t * 40), ang: 30, lift: 0.05 }; });
  K(T.hintEnd, PEN.P0.x, PEN.P0.y, PEN.P0.ang, PEN.P0.lift);
  K(DUR, PEN.P0.x, PEN.P0.y, PEN.P0.ang, PEN.P0.lift);
  PEN.keys.sort((a, b) => a.t - b.t);
}
// путь галочки (как в penCheck): от 0 до 1
function checkPt(c, u, size) { const k = size / 60, P = [[-24 * k, -2 * k], [-8 * k, 16 * k], [26 * k, -24 * k]]; const seg = u < 0.32 ? 0 : 1, v = seg === 0 ? u / 0.32 : (u - 0.32) / 0.68; return [c.x + lerp(P[seg][0], P[seg + 1][0], v), c.y + lerp(P[seg][1], P[seg + 1][1], v)]; }
const qPt = (P, u) => { const a = 1 - u; return [a * a * P[0][0] + 2 * a * u * P[1][0] + u * u * P[2][0], a * a * P[0][1] + 2 * a * u * P[1][1] + u * u * P[2][1]]; };
function penAt(t) {
  if (t <= 0) return PEN.keys[0];
  for (const a of PEN.acts) if (t >= a.t0 && t < a.t1) return a.fn(t);
  const K = PEN.keys;
  if (t >= K[K.length - 1].t) return K[K.length - 1];
  let i = 0; while (i < K.length - 1 && K[i + 1].t <= t) i++;
  const a = K[i], b = K[i + 1];
  if (t < a.t) return a;
  // если между ключами был активный отрезок — стартуем от его конца
  let A_ = a;
  for (const ac of PEN.acts) if (ac.t1 > a.t && ac.t1 <= t) A_ = { ...ac.fn(ac.t1 - 1e-4), t: ac.t1 };
  const u = ease.inOut(clamp((t - A_.t) / (b.t - A_.t))), dist = Math.hypot(b.x - A_.x, b.y - A_.y);
  const hop = Math.min(1, dist / 500) * 0.7 * Math.sin(Math.PI * u);
  return { x: lerp(A_.x, b.x, u), y: lerp(A_.y, b.y, u), ang: lerp(A_.ang, b.ang, u), lift: lerp(A_.lift, b.lift, u) + hop };
}

// ------------------------------------------------------------------ лайки: дождь у календаря (бит 4) — «шлепками» с короткого пути
const RAIN = [[-250, -10, -14], [240, -40, 12], [-90, 120, -6], [250, 110, 22], [40, -140, -18], [-260, 140, 9]];
function rainAt(i, t) {
  const t0 = R.rainT[i], [dx, dy, r] = RAIN[i], H4 = LY.head4;
  const g = slapPose(t, t0, { d: 0.24, dx: (i % 2 ? 1 : -1) * 60, dy: -150, s0: 1.3, r0: (i % 2 ? -1 : 1) * 30, l0: 26, l1: 6 });
  if (!g) return null;
  return { x: H4.x + dx + g.x, y: H4.y + dy + g.y, rot: r + g.rot, lift: g.lift, s: g.s };
}

// ------------------------------------------------------------------ кадр сцены
function sceneFrame(t, c) {
  const z = c.z;
  // ---- надпись хука «ОДНА ФРАЗА — И ChatGPT ПЕРЕСТАЛ СПОРИТЬ»: в кадре 0 уже есть; гаснет на проезде к его ответу (тест);
  //      в петле карандаш выводит её заново (кадр 0)
  {
    // v8: в кадре 0 надписи нет — карандаш выводит её за 0–1,0 с (поверх броска «Хорошо»); гаснет на проезде к тесту
    // v9: в кадре 0 надпись и «хотя прав был он» целиком; гаснут на проезде к тесту; в петле карандаш выводит их заново (к последнему кадру — целиком)
    let v = 4, o = 1;
    if (t < T.rewrite) o = 1 - ease.inOut(prog(t, T.s2 + 0.05, 0.35));
    else if (t < T.writeEnd) { const tl = t - T.rewrite; v = 0; R.ttlTW.forEach(([a, b], i) => { if (tl >= b) v = i + 1; else if (tl > a) v = i + (tl - a) / (b - a); }); }
    R.ttl.set(o > 0.002 ? v : 0, o);
    const rd = win(t, 0, T.s2 - 0.35) || t >= T.writeEnd;
    R.ttl.lines.forEach(l => { texOn(l.t, !rd); texOn(l.t2, true); });
    const hv = t < T.rewrite ? 1 : clamp((t - T.hint) / (T.hintEnd - T.hint));
    R.hint.set(o > 0.002 ? hv : 0, o); texOn(R.hint.lines[0].t, !(win(t, 0, T.s2) || t >= T.hintEnd));
  }
  // ---- моя реплика теста «Ты не прав, там 6 букв»: карандаш пишет на «нарочно спорил», «6» подчёркнута; в петле гаснет
  {
    const v = t < T.uw ? 0 : clamp((t - T.uw) / (T.uwEnd - T.uw)), o = 1 - ease.inOut(prog(t, T.s8, 0.4));
    R.uw.set(o > 0.002 ? v : 0, o);
    R.sixU.draw(prog(t, T.six, 0.25, ease.inOut)); A(R.sixU, 'opacity', f2(o));
    R.sixX.draw(prog(t, T.cross, 0.25, ease.inOut)); A(R.sixX, 'opacity', f2(o));
    R.uw.lines.forEach(l => texOn(l.t, !(win(t, T.uwEnd, T.s6 - 0.05) || win(t, T.core + 0.5, T.corePush))));
    // ядро: карточка «Хорошо» садится рядом с его ответом; уходит под листок урока
    { const g = slapPose(t, T.okIn, { d: 0.26, dx: 70, dy: -120, s0: 1.22, r0: 6 });
      if (!g || t > T.s8 + 0.6) R.okc.hide(); else R.okc.set({ x: LY.okc.x + g.x, y: LY.okc.y + g.y, rot: -3 + g.rot, s: g.s, lift: g.lift });
      R.okc.texts.forEach(e => texOn(e, !win(t, T.okIn + 0.2, T.corePush))); }
  }
  // ---- его ответ: 7 «о» жёлтым волной на «прав»; в петле — обратно в чернила (как в кадре 0)
  {
    const g = slapPose(t, T.b1in, { d: 0.26, dx: 60, dy: -110, s0: 1.12, r0: 3, l0: 16, l1: 4 }), out = glide(t, T.s8, 0.55);   // v8: уезжает на урок (чистый кадр)
    if (!g || out >= 1) R.b1.hide(); else R.b1.set({ x: LY.b1.x + g.x - 1500 * out, y: LY.b1.y + g.y, rot: g.rot - 6 * out, s: g.s, lift: g.lift + 10 * Math.sin(Math.PI * out) });
    R.circ7.draw(prog(t, T.circ, 0.4, ease.inOut));
    { const fo_ = 1 - ease.inOut(prog(t, T.s2, 0.3)); R.redW.set(clamp((t - T.redMark) / 0.4), fo_); R.redChk.draw(prog(t, T.redMark + 0.4, 0.2, ease.inOut)); A(R.redChk, 'opacity', f2(fo_)); texOn(R.redW.lines[0].t, !win(t, T.redMark + 0.4, T.s2)); }
    // нумерация «о» снизу и крупная «7» — гаснут на проезде к кульминации
    const fo = 1 - ease.inOut(prog(t, T.s6 + 0.05, 0.3));
    R.nums.forEach((e, i) => { const a = ease.out(prog(t, T.num0 + T.oStep * i, 0.1)) * fo; A(e, 'opacity', f2(a)); A(e, 'visibility', a > 0.002 ? 'visible' : 'hidden'); texOn(e, true); });
    R.big7.set(t < T.big7 ? 0 : clamp((t - T.big7) / 0.25), fo); texOn(R.big7.lines[0].t, !win(t, T.big7 + 0.25, T.s6 - 0.05));
    { const a = ease.out(prog(t, T.big7 + 0.2, 0.2)) * fo; A(R.big7o, 'opacity', f2(a)); A(R.big7o, 'visibility', a > 0.002 ? 'visible' : 'hidden'); texOn(R.big7o, !win(t, T.big7 + 0.4, T.s6 - 0.05)); }
    // поворот: «сказал „хорошо“ — но 7 на 6 не сменил» графитом; под листком урока гаснет
    const nv = t < T.note ? 0 : 2 * clamp((t - T.note) / (T.noteEnd - T.note)), no = 1 - ease.inOut(prog(t, T.s8 + 0.4, 0.3));
    R.noteW.set(no > 0.002 ? nv : 0, no); R.noteW.lines.forEach(l => texOn(l.t, !win(t, T.noteEnd, T.s8)));
  }
  R.oBoxes.forEach((b, i) => {
    const on = ease.out(prog(t, T.oWave + T.oStep * i, 0.12)), off = ease.inOut(prog(t, T.s9 + 0.25 + 0.06 * (6 - i), 0.2));
    A(b, 'opacity', f2(on * (1 - off)));
  });
  {
    const k = 1;   // слово не растёт: камера теста ближе (×1,17)
    const c_ = R.b1Wc;
    A(R.b1W, 'transform', k > 1.0005 ? `translate(${f2(c_.x)} ${f2(c_.y)}) scale(${f2(k)}) translate(${f2(-c_.x)} ${f2(-c_.y)})` : '');
  }
  {
    const rd = win(t, T.b1in + 0.15, T.s6 - 0.05) || win(t, T.core + 0.5, T.corePush);
    R.b1.front.querySelectorAll('text').forEach(e => texOn(e, !rd));
  }
  // ---- шапка «ChatGPT» и пунктир её прежнего крена (рисуется на первом нажиме, гаснет на уроке)
  {
    const h = headAt(t);
    R.head.set({ x: h.x, y: h.y, rot: h.rot, lift: h.lift, s: h.s });
    const rd = win(t, 0, 2.8) || win(t, T.toTray + 0.5, T.s8) || t > DUR - 0.3;   // к концу наезда хука шапка у верхней кромки — фон
    texOn(R.head.texts[0], !rd);
    R.ghost.draw(0);
    A(R.ghostG, 'opacity', f2(1 - ease.inOut(prog(t, T.press[1] + 0.4, 0.3))));
  }
  // ---- моя реплика: под скотчем скрыта; в кульминации темнеет по словам; остаётся до карточки «подтвердил»
  {
    const covered = t < T.tear + 0.06 || t >= T.s8 + 0.6;   // v8: под листком урока исчезает (чистый кадр урока и вопроса)
    R.reply.forEach((w, i) => {
      if (covered) { A(w.e, 'visibility', 'hidden'); return; }
      const s = WS(30 + i), on = t >= s - 0.03 ? ease.out(prog(t, s - 0.03, 0.18)) : 0;
      A(w.e, 'visibility', 'visible'); A(w.e, 'opacity', f2(lerp(0.22, 1, on)));
      texOn(w.e, !(win(t, s + 0.1, T.core) || win(t, T.s8 + 0.45, T.conf)));
    });
    show(R.remnant, !covered && t >= T.tear + 0.06 ? 1 : 0);
  }
  // ---- скотч: заклеено → стучит → рывок: срывается, падает вниз смятым (красный «?» наружу) → в петле снова заклеено
  {
    const tp = LY.tape, wd = LY.wad;
    let tw = 0;
    [T.tap1, T.tap2].forEach(tq => { tw += jig(t, tq, 1, 0.32, 40); });
    // полёт: 0,1 с отходит правый конец; 0,45 с — подлёт вверх и падение (сминается), касание, отскок
    const tf = T.tear + 0.1, tl = tf + 0.45;
    const fly = u => ({ x: lerp(tp.x - 30, wd.x, u), y: lerp(tp.y - 14, wd.y, u * u) - 160 * u * (1 - u), rot: lerp(tp.rot + 5, wd.rot, u) + 40 * Math.sin(Math.PI * u) });
    let wadP = null;
    if (t < T.tear) R.tape.set(tp.x, tp.y + 1.5 * Math.abs(tw), tp.rot + 1.3 * tw, 0.3 * Math.abs(tw), 1);
    else if (t < tf) {
      const pe = ease.out((t - T.tear) / 0.1);
      R.tape.set(tp.x - 30 * pe, tp.y - 14 * pe, tp.rot + 5 * pe, 8 * pe, 1, 1 + 0.04 * pe, 1 - 0.06 * pe);
    } else if (t < tf + 0.2) {
      const u = (t - tf) / 0.45, p = fly(u), sq = ease.inOut((t - tf) / 0.2);
      R.tape.set(p.x, p.y, p.rot, 8 + 22 * Math.sin(Math.PI * u), 1, lerp(1.04, 0.42, sq), lerp(0.94, 0.66, sq));
    } else if (t < T.turn + 0.13) {
      R.tape.set(0, 0, 0, 0, 0);
      const u = clamp((t - tf) / 0.45), p = fly(u);
      if (t < tl) wadP = { x: p.x, y: p.y, rot: p.rot, s: lerp(0.96, 1, u), lift: 8 + 22 * Math.sin(Math.PI * u) };
      else {
        const b = 0.06 * Math.exp(-(t - tl) / 0.06) * Math.cos((t - tl) * 55);
        wadP = { x: wd.x, y: wd.y, rot: wd.rot, s: 1 + b, lift: 2 };
      }
      // на уроке ответ уезжает вниз и сметает ком
      const ay = ansExitY(t);
      if (ay !== null) wadP.y = Math.max(wadP.y, ay + 150);
    } else {
      // оборот карточки «подтвердил» = этот скотч: раскрывается из ребра на месте (вторая половина переворота)
      const u = clamp((t - T.turn - 0.13) / 0.13), cx = Math.max(0.001, Math.sin(Math.PI / 2 * u));
      R.tape.set(tp.x, tp.y, tp.rot, 6 * (1 - u), 1, cx, 1);
    }
    if (wadP && t < T.s8 + 0.9) R.wad.set(wadP.x, wadP.y, wadP.rot, wadP.s, wadP.lift, 1); else R.wad.set(0, 0, 0, 1, 0, 0);
  }
  // ---- ответ «Хорошо, не буду спорить.» (v8): кадр 0 — вершина броска (крупно, над скотчем) → садится к 0,6 с → на проезде к тесту
  //      уходит под скотч (≤ 3 плашек в 5–8 с) → в кульминации падает на место на удар → на уроке уезжает вниз →
  //      в петле выезжает из-под скотча и взлетает в точку кадра 0
  {
    const a = LY.ans, ay = ansExitY(t);
    const fp = tossPose(t);
    if (fp) R.ansF.set(fp); else R.ansF.hide();
    R.ansF.texts.forEach(e => texOn(e, true));   // в полёте — фактура
    if (t < T.TL || fp) R.ans.hide();
    else if (t < T.s2) {
      const sq = 0.014 * Math.exp(-(t - T.TL) / 0.06) * Math.cos((t - T.TL) * 55);
      R.ans.set({ x: a.x, y: a.y, rot: 0, lift: 5, s: 1 - sq });
    } else if (t < T.hit - 0.4) {
      const e = ease.inOut(prog(t, T.s2, 0.35));
      if (e >= 1) R.ans.hide(); else R.ans.set({ x: a.x, y: a.y - 170 * e, rot: 0, lift: 5 - 2 * e, s: 1 });
    } else if (ay === null) {
      const g = slapPose(t, T.hit, { d: 0.26, dx: 50, dy: -170, s0: 1.35, r0: -7, l0: 24, l1: 5 });
      if (!g) R.ans.hide(); else R.ans.set({ x: a.x + g.x, y: a.y + g.y, rot: g.rot, lift: g.lift, s: g.s });
    } else if (ay < a.y + 1100) R.ans.set({ x: a.x, y: ay, rot: 2 * (ay - a.y) / 1000, lift: 5 + 6 * clamp((ay - a.y) / 300) });
    else if (t >= T.emerge) {
      const e = ease.out(prog(t, T.emerge, 0.3));
      R.ans.set({ x: a.x, y: a.y - 170 * (1 - e), rot: 0, lift: 4 + 6 * Math.sin(Math.PI * e), s: 1 });
    } else R.ans.hide();
    const rd = win(t, T.TL + 0.1, T.s2) || win(t, T.hit + 0.1, T.core);
    R.ans.texts.forEach(e => texOn(e, !rd));
  }
  // ---- сцена «2023» убрана (v5.1): листок, сетка, штамп «98» скрыты; кармашек — архив карточек без бирки
  if (!R._no2023) {
    R._no2023 = true;
    R.qslip.hide(); R.qW.set(0); R.grid.set(() => Infinity, 0.2, 1, true); show(R.gridRec, 0); R.blk98(null, 0, 0, 0); R.stamp98.set(0, 0, 0, 1); R.src98.hide();
    R.pocket.setTag(0); A(R.pocket.label, 'display', 'none');
    [R.test.g, R.test.sg, R.testInk].forEach(e => A(e, 'display', 'none'));
    R.dlg.forEach(d => { d.bot.hide(); d.chk.draw(0); }); A(R.cap5, 'display', 'none');
  }
  // ---- поднос: въезжает вместе с ярлыком RLHF на «доучивают»; ярлык → метка; «17 × 24 = ?» и А/Б садятся; галочка и лайк на А;
  //      стрелка; потом галочка на Б
  {
    const tr = LY.tray, tdx_ = 1300 * (1 - glide(t, T.people - 0.15, 0.45)) + 1300 * glide(t, T.s8, 0.45);   // на проезде к уроку уезжает (шов)   // за кадром у календаря — убирается (шов: в кадре 0 подноса нет)
    A(R.tray.g, 'transform', `translate(${f2(tr.x + tdx_)} ${tr.y})`); A(R.tray.sg, 'transform', `translate(${f2(tdx_)} 0)`);
    {
      const g = slapPose(t, T.label, { d: 0.24, dx: -50, dy: -100, s0: 1.2, r0: -6 });
      if (!g) R.rlhf.hide(); else R.rlhf.set({ x: LY.label.x + g.x, y: LY.label.y + g.y, rot: -2 + g.rot, s: g.s, lift: g.lift });
      R.rlhf.texts.forEach(e => texOn(e, !win(t, T.label + 0.2, T.s8)));
      R.rlhfTag.hide();
    }
    const trayRd = win(t, T.ab + 0.3, T.rule);
    {
      const g = slapPose(t, T.people + 0.3, { dx: -40, dy: -110, s0: 1.18, r0: -4 });
      const qo = ease.in4(clamp((t - T.rule + 0.12) / 0.3));   // v8: на плашку правила «Ведь 6?» улетает вверх-вправо
      if (!g || qo >= 1 || t > T.s8 + 0.5) R.trayQ.hide(); else R.trayQ.set({ x: LY.trayQ.x + g.x + 900 * qo, y: LY.trayQ.y + g.y - 420 * qo, rot: -1 + g.rot + 14 * qo, s: g.s, lift: g.lift + 20 * qo });
      R.trayQ.texts.forEach(e => texOn(e, !win(t, T.ab + 0.3, T.rule - 0.12)));
    }
    [R.A, R.B].forEach((cd, i) => {
      const P = i ? LY.B : LY.A, g = slapPose(t, T.ab + 0.14 + 0.14 * i, { dx: i ? 60 : -60, dy: -130, s0: 1.2, r0: i ? -5 : 5 });
      if (!g || t > T.s8 + 0.5) { cd.hide(); return; }
      const sel = i === 0 ? ease.out(prog(t, T.like, 0.2)) : 0;
      cd.set({ x: P.x + g.x, y: P.y + g.y, rot: (i ? 1.2 : -1) + g.rot, s: g.s * (1 + 0.025 * sel), lift: g.lift + 4 * sel });
      cd.texts.forEach(e => texOn(e, !trayRd)); texOn(cd.lab, true);   // буква на язычке у края при ×1,25 — фактура
    });
    R.chkA.draw(0);
    R.chkB.draw(0);
    // v8: одиночный жёлтый лайк и «+1» сняты; стопка лайков на А — их кладут четыре карандаша наперебой (первый желтеет)
    {
      R.likeA.set(0, 0, 0, 0, 0, 0); R.boxLikes.forEach(k => k.set(k.home.x, k.home.y, k.home.rot, 1, 2, 1)); R.pairs.forEach(g_ => A(g_, 'display', 'none'));
      R.plusChips.forEach(c => c.hide());
      R.pile.forEach((k, i) => {
        const o = pileOff(i), g = slapPose(t, T.likes[i], { d: 0.2, dx: o.x, dy: o.y, s0: 1.3, r0: 18, l0: 20, l1: 4 });
        const out = glide(t, T.s8, 0.45);
        if (!g || out >= 1) { k.set(0, 0, 0, 0, 0, 0); return; }
        const yel = i === 0 ? ease.out(prog(t, T.likes[0] - 0.02, 0.16)) : 0;
        k.set(k.home.x + g.x + 1400 * out, k.home.y + g.y, k.home.rot + g.rot, g.s, g.lift, 1, yel);
      });
    }
    R.arrow.draw(prog(t, T.arrow, 0.5, ease.inOut));
  }
  // ---- откат: календарь 25 → 29 апреля; лайки на «ChatGPT»; три листа с решениями; «Гениально!»; «ОТКАТ»; наклейки срываются
  {
    const cp = LY.cal;
    let idx = 0, f = 0;
    T.flip.concat([T.flip4]).forEach((tf, i) => { if (t >= tf + 0.16) idx = i + 1; else if (t >= tf) { idx = i; f = (t - tf) / 0.16; } });
    R.cal.set(cp.x, cp.y, -2, idx, f);
    const calRead = win(t, T.s4 + 0.42, T.s7);
    R.cal.P.forEach(p => { texOn(p.dd, !calRead); texOn(p.mm, !calRead); texOn(p.yy, !calRead); });
    R.cal.g.querySelectorAll('text').forEach(e => texOn(e, !calRead));
    // подпись источника — с отъездом на «и он начал» (в плотном кадре не помещается в безопасную зону)
    { const a = ease.inOut(prog(t, T.ideas + 0.2, 0.3)); R.calSrc.forEach(e => { A(e, 'opacity', f2(a)); A(e, 'visibility', a > 0.002 ? 'visible' : 'hidden'); texOn(e, !win(t, T.ideas + 0.5, T.s7)); }); }
    R.rain.forEach((k, i) => { const p = rainAt(i, t); if (!p) k.set(0, 0, 0, 0, 0, 0); else k.set(p.x, p.y, p.rot, p.s, p.lift, 1); });
    T.flip.concat([T.flip4]).forEach((tf, i) => {
      const k = R.tornNew[i], g = slapPose(t, tf + 0.14, { d: 0.24, dx: -40, dy: -170, s0: 1.2, r0: 12, l0: 20, l1: 2 });
      if (!g) k.hide(); else k.set({ x: k.home.x + g.x, y: k.home.y + g.y, rot: k.home.rot + g.rot, s: g.s, lift: g.lift });
    });
    const SH = LY.sheets, tc = T.roll + 0.1;
    SH.y.forEach((y, i) => {
      const sl = R.sheets[i];
      // листки шлёпаются каскадом на «и он начал» (вместе с отъездом камеры), сразу с первой строкой графитом; вторая — за 0,25 с
      const t0 = T.cards[i], gs = slapPose(t, t0, { d: 0.22, dx: -60, dy: -110, s0: 1.2, r0: -6, l0: 16, l1: 2 });
      if (!gs) sl.hide(); else sl.set({ x: SH.x[i] + gs.x, y: y + gs.y, rot: (i - 1) * 1.6 + gs.rot, s: gs.s, lift: gs.lift });
      sl.W_.set(t < t0 - 0.22 ? 0 : 1 + clamp((t - t0 - 0.05) / 0.25));
      sl.W_.lines.forEach(l => texOn(l.t, !win(t, t0 + 0.35, T.s7)));
      // «Гениально!» шлёпают на правый край листа каскадом по 0,15 с; в кадр удара «ОТКАТ» срываются вверх-вправо
      const st = R.stickers[i], g = slapPose(t, T.cards[i] + 0.15, { d: 0.2, dx: 90, dy: -110, s0: 1.3, r0: -20 });
      const off = t > tc ? ease.in(clamp((t - tc - 0.02 * i) / 0.32)) : 0;
      if (!g || off >= 1) { st.hide(); return; }
      const sx = SH.x[i] + 70, sy = y - 104;
      st.set({ x: sx + g.x + 520 * off, y: sy + g.y - 640 * off, rot: -9 + 6 * i + g.rot + 50 * off, s: g.s, lift: g.lift + 30 * off });
      texOn(st.txt, !win(t, T.cards[i] + 0.25, tc));
    });
    const sc = { x: 2200, y: -830 };
    const sm = stampMotion(t, tc, { from: [-1000, -900], away: [1300, -1300], fast: 0.26 });   // сразу вверх-вправо, не по оттиску
    R.blkRoll(sm, sc.x, sc.y, 0);
    R.stampRoll.set(t >= tc ? 1 : 0, sc.x, sc.y, t >= tc ? 1 + 0.12 * Math.exp(-(t - tc) / 0.05) : 1);
    R.stampRoll.querySelectorAll('text').forEach(e => texOn(e, !win(t, tc, T.s7)));
  }
  // ---- правило: два крупных значка «✓ правду не менять» · «✓ не спорить до упора» под подносом; на проезде к уроку уходят
  // ---- v8: значки сняты; одна плашка правила на «факт» ложится поверх подноса, под ней мелко источник; на проезде к уроку уходит
  R.badges.forEach(bd => bd.hide()); A(R.badgeSrc, 'visibility', 'hidden');
  {
    const P = LY.rule, g = slapPose(t, T.rule, { d: 0.26, dx: 90, dy: -140, s0: 1.18, r0: 4, l0: 20, l1: 5 }), out = glide(t, T.s8, 0.45);
    if (!g || out >= 1) R.ruleCard.hide();
    else R.ruleCard.set({ x: P.x + g.x + 1400 * out, y: P.y + g.y, rot: -0.8 + g.rot, s: g.s, lift: g.lift });
    R.ruleCard.texts.forEach(e => texOn(e, !win(t, T.rule + 0.2, T.s8)));
    const a = ease.inOut(prog(t, T.rule + 0.3, 0.3)) * (1 - out);
    A(R.ruleSrc, 'opacity', f2(a)); A(R.ruleSrc, 'visibility', a > 0.002 ? 'visible' : 'hidden'); texOn(R.ruleSrc, !win(t, T.rule + 0.6, T.s8));
    A(R.ruleSrc, 'transform', `translate(${f2(1400 * out)} 0)`);
  }
  // ---- поворот: листок «Правила OpenAI» въезжает справа-снизу в кадр столбца и ложится в зазор; галочки и стрелки:
  //      «не менять ответ» → «7 букв «о»», «не спорить навязчиво» → «Хорошо, не буду спорить.»; на уроке уезжает влево
  {
    const P = LY.rules, u = glide(t, T.rules, 0.7), o = ease.in(clamp((t - T.s8) / 0.5));
    if (t < T.rules || o >= 1) R.rules.hide();
    else R.rules.set({ x: lerp(980, P.x, u) - 1500 * o, y: lerp(760, P.y, u) + 40 * o, rot: lerp(-16, P.rot, u) - 8 * o, s: P.s, lift: 3 + 18 * Math.sin(Math.PI * u) + 16 * o });
    R.rulesChk[0].draw(prog(t, T.chk1, 0.3, ease.inOut)); R.rulesChk[1].draw(prog(t, T.chk2, 0.3, ease.inOut));
    R.rulesT.forEach(e => texOn(e, true));   // маленький листок — фактура: в кадре две цели чтения («7» и подпись)
    R.rArr1.draw(prog(t, T.arr1, 0.3, ease.inOut)); R.rArr2.draw(prog(t, T.arr2, 0.32, ease.inOut));
    A(R.rArrG, 'opacity', f2(1 - ease.inOut(prog(t, T.s8, 0.25))));
  }
  // ---- урок: листок въезжает справа в зазор (правила уезжают влево); «там 6 букв» → «?» → «Хорошо» → пустая «ты прав» → «≠»;
  //      на «Перешли» вопрос ложится поверх, листок урока уезжает из-под него с 0,5 с
  {
    const P = LY.lesson, u = glide(t, T.s8 + 0.05, 0.6), o = ease.in(clamp((t - T.lesOut) / 0.4));
    if (t < T.s8 + 0.05 || o >= 1) { R.les.hide(); R.lesOk.hide(); }
    else {
      const pose = { x: lerp(1500, P.x, u) - 1600 * o, y: lerp(-300, P.y, u) + 60 * o, rot: lerp(8, P.rot, u) - 6 * o, s: 1 };
      R.les.set({ ...pose, lift: 3 + 16 * Math.sin(Math.PI * u) + 12 * o });
      const okG = slapPose(t, T.ok, { dx: 60, dy: -60, s0: 1.15, r0: -6 });
      if (!okG) R.lesOk.hide();
      else { const [x, y] = toW(pose, R.lesOkPos[0], R.lesOkPos[1]); R.lesOk.set({ x: x + okG.x, y: y + okG.y, rot: pose.rot - 2 + okG.rot, s: okG.s, lift: okG.lift + 12 * o }); }
    }
    R.lesQ.draw(prog(t, T.qq, 0.35, ease.inOut));
    R.lesEmpty.draw(prog(t, T.empty, 0.4, ease.inOut));
    R.lesNeq.draw(prog(t, T.neq, 0.3, ease.inOut));
    { const a = ease.out(prog(t, T.tyIn, 0.25)); A(R.lesTy, 'opacity', f2(0.85 * a)); A(R.lesTy, 'visibility', a > 0.002 ? 'visible' : 'hidden'); }
    const rd = win(t, T.s8 + 0.7, T.s9);
    R.les6.forEach(e => A(e, 'display', 'none')); A(R.lesQ, 'display', 'none');   // v8: в кадре урока только «Хорошо ≠ ты прав» texOn(R.lesTy, !win(t, T.tyIn + 0.2, T.s9)); R.lesOk.texts.forEach(e => texOn(e, !win(t, T.ok + 0.1, T.s9)));
  }
  // ---- петля: вопрос для комментариев — на «Перешли», над фразой; стрелка карандашом к фразе; вместе ≥ 3 с;
  //      «Мне ChatGPT подтвердил ✓» ложится на фразу и переворачивается в скотч кадра 0
  {
    const P = LY.ask, u = glide(t, T.ask - 0.1, 0.45), o = ease.in(clamp((t - T.conf) / 0.4));
    if (t < T.ask - 0.1 || o >= 1) R.ask.hide();
    else R.ask.set({ x: lerp(1300, P.x, u) + 900 * o, y: lerp(-420, P.y, u) - 700 * o, rot: lerp(10, 1.2, u) + 10 * o, lift: 3 + 16 * Math.sin(Math.PI * u) + 20 * o });
    R.ask.texts.forEach(e => texOn(e, !win(t, T.ask + 0.3, T.conf)));
    R.askArrow.draw(prog(t, T.askArr, 0.4, ease.inOut));
    A(R.askArrG, 'opacity', f2(1 - ease.inOut(prog(t, T.conf, 0.3))));
    const tp = LY.tape;
    if (t < T.conf - 0.26 || t >= T.turn + 0.13) R.conf.hide();
    else {
      const gg = slapPose(t, T.conf, { dx: 90, dy: 150, s0: 1.2, r0: 6 });
      const fl = clamp((t - T.turn) / 0.26);
      R.conf.set({ x: tp.x + gg.x, y: tp.y + gg.y, rot: tp.rot + gg.rot, s: gg.s, lift: gg.lift + 6 * Math.sin(Math.PI * fl), flip: Math.min(0.499, fl) });
    }
    R.confT.forEach(e => texOn(e, !win(t, T.conf + 0.1, T.turn)));
  }
  // ---- знак канала (размыт 4 px, 70 %)
  R.sign.set({ x: LY.sign.x, y: LY.sign.y, rot: 7, lift: 4, o: 0.7 });
  A(R.fSign, 'stdDeviation', f2(4 / z));
  // ---- карандаш
  {
    const p = win(t, T.handsIn, T.handsOut) ? handAt(0, t) : penAt(t);
    const fo = 0;
    R.hands.forEach((hd, k) => { const q = win(t, T.handsIn, T.handsOut) ? handAt(k + 1, t) : null; if (!q) hd.set(0, 0, 0, 0, 0); else hd.set(q.x, q.y, q.ang, q.lift, 1, 0); });
    R.pen.set(p.x, p.y, p.ang, p.lift, 1, fo, t < T.flag ? 0.4 : lerp(0.4, 1, step(t - T.flag, { r: 0.36, z: 0.7 })));
    if (R.pen.flTxt) texOn(R.pen.flTxt, !win(t, T.flag + 0.2, T.check - 0.25));   // гаснет — фактура
  }
}
// ответ уезжает вниз на уроке (сметая смятый скотч): y или null
function ansExitY(t) { if (t < T.s8) return null; return LY.ans.y + 1100 * ease.in(clamp((t - T.s8) / 0.6)); }
// бросок «Хорошо»: τ 0 → 1 (место → вершина → место); вершина (τ = 0,5) — кадр 0 и последний кадр: шов петли без остановки
function tossPose(t) {
  let tau;
  if (t <= T.TL) tau = 0.5 + 0.5 * t / T.TL;
  else if (t >= T.tossE) tau = 0.5 * (t - T.tossE) / T.TU;
  else return null;
  const a = LY.ans, P = LY.apex, h = Math.sin(Math.PI * tau), w2 = Math.sin(2 * Math.PI * tau);
  return { x: a.x + (P.x - a.x) * h + 40 * w2, y: a.y + (P.y - a.y) * h, rot: P.rot * h + 9 * w2, s: 1 + (P.s - 1) * Math.pow(h, 1.4), lift: 5 + 34 * h };
}

// ------------------------------------------------------------------ после построения: позиции, зависящие от замеров
function scenesInit() {
  // надпись хука: время строк ∝ их ширине (0–0,5 с, переходы между строками 0,025 с)
  {
    const ws = R.ttl.lines.map(l => l.w), sum = ws.reduce((a, b) => a + b, 0), gap = 0.025, dur = T.ttlDur - 3 * gap;   // от начала вывода (петля)
    let t0 = 0;
    R.ttlTW = ws.map(w => { const a = t0, b = t0 + dur * w / sum; t0 = b + gap; return [a, b]; });
  }
  // стрелка «лайк → ChatGPT» (бит 3): от лайка на А, в обход картонки вопроса слева, к нижнему краю «ChatGPT»
  const LA = LY.likeA, H3 = LY.head3;
  const a0 = [LA.x - 70, LA.y - 30], a2 = [H3.x - 170, H3.y + 84], a1 = [LA.x - 330, (LA.y + H3.y) / 2 + 40];
  R.arrowPts = [a0, a1, a2];
  R.arrowG.remove();
  R.arrow = inkArrow(L.over, R.arrowPts, { seed: 9, w: 5.5, color: GRAPH, head: 30 });
  // колонка теста: где ставить галочки
  R.dlg.forEach(d => { d.chk0 = { x: d.home.x + d.bw / 2 + 56, y: d.home.y + 6 }; });
  // поворот: стрелки от концов строк правил — к «7 букв «о»» (вверх) и к ответу «Хорошо» (вправо-вниз, в обход фразы)
  {
    const rp = { x: LY.rules.x, y: LY.rules.y, rot: LY.rules.rot };
    const e1 = toW(rp, R.rulesEnd[0].x, R.rulesEnd[0].y), e2 = toW(rp, R.rulesEnd[1].x, R.rulesEnd[1].y);
    const s7 = R.b1Seven;
    R.rArr1Pts = [[e1[0] + 6, e1[1] - 8], [e1[0] + 60, s7.y + 20], [s7.x + 40, s7.y + 6]];
    const aR = LY.ans.x + LY.ans.w / 2;
    R.rArr2Pts = [[e2[0] + 8, e2[1] + 6], [Math.max(e2[0] + 90, R.replyR + 120), LY.tape.y + 10], [aR + 14, LY.ans.y - 18]];
    R.rArrG = S('g', {}, L.overInk);
    R.rArr1 = inkArrow(R.rArrG, R.rArr1Pts, { seed: 41, w: 6, color: GRAPH, head: 30 });
    R.rArr2 = inkArrow(R.rArrG, R.rArr2Pts, { seed: 43, w: 6, color: GRAPH, head: 30 });
  }
  // урок: где «?», пустая карточка (локально в листке урока)
  R.lesQpos = [R.les6x + 2, R.les6y - 92];
  // петля: стрелка от вопроса к фразе (к концу «ничего,»)
  {
    const ax = LY.ask.x + R.ask.W / 2, ay = LY.ask.y;
    R.askArrPts = [[ax + 6, ay + 10], [ax + 110, ay + 120], [R.replyR + 26, LY.reply.y[1] - 18]];
    R.askArrG = S('g', {}, L.overInk);
    R.askArrow = inkArrow(R.askArrG, R.askArrPts, { seed: 47, w: 6, color: GRAPH, head: 30 });
  }
  initHands();
  penInit();
}

// ------------------------------------------------------------------ карта листа (QUERY=map=1): места, кадры камеры, маршрут «ChatGPT»
const MAP_T = 36.2;
function buildMap() {
  const M = mapG;
  [[LY.rules, R.rulesWH, '«Правила OpenAI» (43–47 с)'], [LY.lesson, R.lesWH, 'урок (47–52 с)']].forEach(([p, wh, s_], i) => {
    S('path', { d: rr(p.x - wh.w / 2, p.y - wh.h / 2, wh.w, wh.h, 6), fill: 'none', stroke: PAL.graphite, 'stroke-width': 10, 'stroke-dasharray': '26 16' }, M);
    tText(M, s_, { x: p.x + (i ? 900 : -900), y: p.y + (i ? 120 : -120), size: 78, weight: 700, fill: PAL.graphite });
  });
  const stops = [
    ['1 хук', SHOT.hook0(0)], ['2 тест', SHOT.test(T.oWave)], ['3 удар', SHOT.s6(T.hit)], ['4 поднос', SHOT.s3m2(T.like)],
    ['5 «ChatGPT»', SHOT.s3m3(T.tilt + 0.5)], ['6 откат', SHOT.s4(T.roll)], ['7 правила', SHOT.s7(T.chk2)], ['8 урок', SHOT.s8(T.neq)], ['9 петля', SHOT.s9(T.askArr)],
  ];

  stops.forEach(([n, p]) => {
    const w = W / p.z, h = H / p.z, hot = n.startsWith('9');
    S('rect', { x: p.x - w / 2, y: p.y - h / 2, width: w, height: h, fill: 'none', stroke: hot ? '#B07A12' : PAL.ink, 'stroke-width': hot ? 14 : 7, 'stroke-dasharray': hot ? '' : '30 18', opacity: hot ? 0.9 : 0.45 }, M);
  });
  let d = `M${stops[0][1].x} ${stops[0][1].y}`;
  stops.slice(1).forEach(([, p]) => { d += `L${p.x} ${p.y}`; });
  S('path', { d: roughD(d, { seed: 3, roughness: 0.8, disableMultiStroke: true }), fill: 'none', stroke: PAL.ink, 'stroke-width': 14, opacity: 0.75 }, M);
}
function mapFrame() {
  const c = { x: 900, y: 0, z: 0.22, r: 0 };
  A(wg, 'transform', camXf(c));
  root.style.setProperty('--k', f2(Math.pow(c.z, -0.6)));
  A(fg, 'display', 'none');
  sceneFrame(MAP_T, c);
  caps.frame(-1);
}

// ------------------------------------------------------------------ звук: бумага, картон, карандаш, скотч, штамп; не чаще одного на 0,1 с, тише голоса
function buildSfx() {
  const e = (t, n, g) => { if (Number.isFinite(t) && t < DUR - 0.25) sfx(Math.max(0.03, t), n, g); };   // снятые сцены (∞) — без звука
  // v8: бросок «Хорошо» (посадка), надпись карандашом, лайки наперебой, плашка правила, «Ведь 6?» улетает, выезд из-под скотча, взлёт
  e(T.TL - 0.02, 'book', -7);
  T.likes.forEach((tl, i) => e(tl - 0.02, i % 2 ? 'chip_lay' : 'place', -9 - (i % 3)));
  e(T.rule - 0.03, 'book', -6); e(T.rule - 0.1, 'slide', -15); e(T.emerge, 'slidelow', -11); e(T.tossE + 0.05, 'slide', -15);
  e(T.hit - 0.2, 'slidelow', -12);
  e(T.okIn - 0.03, 'book', -7); e(T.redMark, 'pencil', -10); T.plus.forEach(tp => e(tp - 0.02, 'tick', -14)); e(T.cross, 'pencil', -9); e(T.badge1 - 0.03, 'book', -8); e(T.badge2 - 0.03, 'book', -8); e(T.hint, 'pencil', -12);
  // хук: стук по скотчу, ответ выезжает из-под скотча
  e(T.tap1 - 0.01, 'tick', -12); e(T.tap2 - 0.01, 'tick', -13); e(T.ans - 0.16, 'slidelow', -9); e(T.ans + 0.1, 'book', -9);
  // тест: камера к его ответу, карандаш пишет мою реплику, подчёркивает «6», волна «о»
  e(T.s2 + 0.05, 'slide', -14); e(T.uw, 'pencil', -9); e(T.six, 'pencil', -10);
  for (let k = 0; k < 4; k++) e(T.oWave + 0.12 * k, 'tick', -16 - k);
  // кульминация: рывок скотча, ком падает, реплика карандашом, удар
  e(T.s6, 'slide', -12); e(T.tear - 0.02, 'rip', -1); e(T.tear + 0.55, 'paper', -11);
  e(T.q0, 'pencil', -12); e(T.q0 + 1.3, 'pencil', -13); e(T.q0 + 2.4, 'pencil', -13);
  e(T.hit - 0.02, 'hit', 1);
  // механизм: шапка отрывается и садится, поднос с ярлыком, картонка вопроса, А и Б, флажок, галочка, лайк, крен
  e(T.lift3, 'slide', -15); e(T.toTray + 0.45, 'book', -10);
  e(T.label - 0.02, 'paper', -9); e(T.flag, 'paper', -12);   // v9: поднос и А/Б на месте к склейке — без звука
  e(T.check, 'pencil', -8); e(T.arrow, 'pencil', -13); e(T.tilt, 'slidelow', -14);
  // откат: карточка у календаря, дождь лайков, листок, «Гениально!», листки дней, штамп
  e(T.s4 + 0.45, 'book', -10);
  R.rainT.forEach((tl, i) => e(tl - 0.02, i % 2 ? 'chip_lay' : 'place', -10 - (i % 3)));
  T.cards.forEach(tc => { e(tc - 0.03, 'paper', -9); e(tc + 0.13, 'paper', -11); });
  T.flip.forEach((tf, i) => e(tf, 'flip', -8 - i)); e(T.flip4, 'flip', -8); e(T.roll + 0.1, 'stamp', -3); e(T.roll + 0.2, 'rip', -9);
  // поворот: шапка возвращается, два нажима, листок правил, галочки и стрелки
  e(T.home + 0.6, 'book', -11); e(T.press[0], 'tick', -12); e(T.press[1], 'tick', -12); e(T.rules + 0.05, 'slide', -9); e(T.rules + 0.66, 'paper', -10);
  e(T.chk1, 'pencil', -9); e(T.chk2, 'pencil', -9); e(T.circ, 'pencil', -10); e(T.note, 'pencil', -9); e(T.num0, 'pencil', -11); e(T.big7, 'pencil', -9); e(T.b1in - 0.03, 'book', -8);
  // урок
  e(T.s8, 'shove', -10); e(T.s8 + 0.3, 'slidelow', -12); e(T.s8 + 0.6, 'paper', -8); e(T.qq, 'pencil', -12); e(T.ok - 0.02, 'book', -7); e(T.empty, 'pencil', -11); e(T.neq, 'pencil', -8); e(T.tyIn, 'pencil', -12);
  // петля: вопрос, урок уезжает, стрелка, «подтвердил», переворот в скотч, надпись заново
  e(T.ask - 0.05, 'paper', -8); e(T.lesOut + 0.1, 'shove', -12); e(T.askArr, 'pencil', -10);
  e(T.conf - 0.02, 'book', -7); e(T.conf + 0.12, 'slide', -14); e(T.turn, 'flip', -8); e(T.rewrite, 'pencil', -10);
}

// ------------------------------------------------------------------ обложка (QUERY=cover=1): отдельный кадр под сетку профиля
// столбец целиком при ×1: надпись хука 100 px (4 строки, «„ХОРОШО“» на жёлтой плашке) в зазоре, его «…7 букв «о»», скотч с «?»,
// «Хорошо, не буду спорить.»; без субтитров, без знака канала и карандаша — низ спокойный (зона 3:4 — y 240–1680)
let COVER_T = 0;
function buildCover(capL) {
  A(capL, 'display', 'none');
  COVER_T = 1.8;
}
function coverCam() { return { x: 0, y: -322, z: 1.0, r: 0 }; }
function coverFrame() {
  R.sign.hide();
  R.pen.set(0, 0, 0, 0, 0, 0, 0);
  R.foreItems.forEach(f => { if (f.k === 'hook' && f.sy < 1500) A(f.g, 'visibility', 'hidden'); });
}
