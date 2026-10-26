// scenes.js — хореография ролика №5 (сценарий v5): что где лежит и как движется в момент t (от cues T и раскладки LY в film.js).

// ------------------------------------------------------------------ помощники
const land = (t, t0, sp = SP.popS) => (t < t0 ? 0 : step(t - t0, sp));           // 0 → 1 с мягкой посадкой
const win = (t, a, b) => t >= a && t < b;
// посадка бумажки: из воздуха (lift 16, ×1,07, поворот +3°) на место; уход: подъём и отлёт
function slipPose(t, t0, tOut = Infinity, o = {}) {
  if (t < t0 - 0.12) return null;
  const a = clamp((t - (t0 - 0.12)) / 0.12);                                      // подлёт 4 кадра
  const s = land(t, t0, { r: 0.36, z: 0.8 });
  const g = { x: 0, y: 0, lift: lerp(16, o.lift ?? 2, s), s: lerp(1.07, 1, s), rot: lerp(3, 0, s), o: Math.min(1, a * 1.5) };
  g.x = (o.fx ?? 60) * (1 - a) * (1 - a); g.y = (o.fy ?? -90) * (1 - a) * (1 - a);
  if (t >= tOut) {
    const u = ease.in4(clamp((t - tOut) / (o.dOut ?? 0.28)));
    g.x += (o.ox ?? 140) * u; g.y += (o.oy ?? -220) * u; g.lift += 26 * u; g.rot += (o.or ?? 10) * u; g.o *= 1 - clamp((u - 0.7) / 0.3);
  }
  return g;
}
// точки рукописной петли (та же формула, что inkLoop) — карандаш ведёт её кончиком
function loopPt(cx, cy, rx, ry, u, seed = 6) {
  const ph = hash01(2, seed) * 0.6, a = -2.2 + ph + u * 1.1 * 2 * Math.PI, rr_ = 1 + 0.06 * u + 0.025 * Math.sin(3 * a + ph * 5);
  return [cx + rx * rr_ * Math.cos(a), cy + ry * rr_ * Math.sin(a)];
}
const rotPt = (x, y, deg) => { const a = deg * Math.PI / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };
const tailOf = (x, y, rot, k = 1) => { const [dx, dy] = rotPt(56 * k, 118 * k, rot); return [x + dx, y + dy]; };   // хвост стрелки

// ------------------------------------------------------------------ подъём окон волной на «Под ними» и посадка на «большинство»
const WAVE_D = [0.10, 0.06, 0.03, 0.0, 0.13, 0.08, 0.04, 0.2, 0.17, 0.22];
const WAVE_S = [0.05, 0.0, 0.08, 0.12, 0.03, 0.1, 0.15, 0.06, 0.0, 0.09];
function waveLift(i, t) {
  const up = ease.out(prog(t, T.look + WAVE_D[i], 0.34));
  const dn = t < T.edge + 0.3 + WAVE_S[i] ? 0 : step(t - T.edge - 0.3 - WAVE_S[i], { r: 0.42, z: 0.74 });
  return 11 * up * (1 - dn);
}

// ------------------------------------------------------------------ ластик хозяина: путь как функция τ = времени до щелчка
// кадр 0 и конец ролика — один и тот же путь (τ = T.click2 − t в начале, τ = DUR − t + T.click2 в конце) → шов без скачка
function ownerAt(tau) {
  const ang = -52;
  if (tau > 2.0) { const u = ease.in4(clamp((tau - 2.0) / 0.6)); return { dx: 80 + 640 * u, dy: -96 - 720 * u, lift: 1.2, ang }; }
  if (tau > 0.12) {
    const u = Math.pow(clamp((2.0 - tau) / 1.88), 2.2);                          // ускоряется к клавише: в кадре 0 уже заметно едет
    return { dx: lerp(80, 7, u), dy: lerp(-96, 4, u), lift: lerp(1.2, 0.5, u), ang };
  }
  if (tau > 0) { const u = ease.in4(clamp((0.12 - tau) / 0.12)); return { dx: 7 - 2 * u, dy: 4 + 3 * u, lift: lerp(0.5, 0, u), ang }; }
  const a = -tau;                                                                 // после щелчка: держит 0,08 с, отходит вверх-вправо
  if (a < 0.08) return { dx: 5, dy: 7, lift: 0, ang, press: 1 };
  const u = ease.inOut(clamp((a - 0.08) / 0.55));
  return { dx: 5 + 240 * u, dy: 7 - 300 * u, lift: 1.4 * Math.min(1, u * 3), ang: ang - 6 * u, o: 1 - clamp((u - 0.85) / 0.15) };
}

// ------------------------------------------------------------------ кадр сцены
function sceneFrame(t, c) {
  const z = c.z;
  const px = size => clamp((size * z - 25) / 5);                                  // мелкий текст в мире: только ≥ 28 px на экране
  // ---- окна
  const lifts = R.win.map((w, i) => waveLift(i, t));
  R.win.forEach((w, i) => {
    const lw = lifts[i];
    let press = 0;
    if (i === 1) { const o = ownerAt(T.click2 - t); press = o.press ?? (o.lift < 0.05 ? 1 : 0); }
    w.set({ flip: winFlip(i, t), key: winKey(i, t), lift: 4 + lw, s: 1 + 0.03 * lw / 11, press });
  });
  if (R.win[6].hint) { texOn(R.win[6].hint, true); A(R.win[6].hint, 'opacity', f2(t < T.y2004 ? px(21) : 0)); }   // «пароль» форума — фон, не цель чтения
  // ---- таблички: текст только на окне 2 в хуке; дальше — белые листки
  const PL = { 1: [T.plate2, T.pat[2] + 0.06, -2.5], 2: [T.plate3, T.pat[0] + 0.06, 1.8], 5: [T.plate6, T.pat[1] + 0.06, -1.5], 4: [T.off5 + 0.2, Infinity, 2], 6: [T.off7 + 0.2, Infinity, -2] };
  for (const k in PL) {
    const i = +k, [t0, t1, r0] = PL[k], w = R.win[i], p = R.plates[i];
    const g = slipPose(t, t0, t1);
    if (!g) { p.hide(); continue; }
    const yOff = w.cy < 500 ? -44 : 54, xOff = w.cy < 500 ? -10 : 0;
    p.set({ x: w.pageC.x + xOff + g.x, y: w.pageC.y + yOff + g.y, rot: r0 + g.rot, s: g.s * (1 + 0.03 * lifts[i] / 11), lift: g.lift + lifts[i], o: g.o });
    const on = i === 1 && t < T.toGov + 0.2;
    p.texts.forEach(e => { texOn(e, !(i === 1 && win(t, T.plate2, T.pull + 0.5))); A(e, 'opacity', f2(on ? px(34) : 0)); });
  }
  // ---- записка на госпортале (текст — пока он в кадре)
  {
    const w = R.win[3], g = slipPose(t, T.note4, Infinity, { fx: -40, fy: -70 });
    if (!g) R.note.hide();
    else R.note.set({ x: w.pageC.x + g.x - 4, y: w.pageC.y - 6 + g.y, rot: -3 + g.rot, s: g.s, lift: g.lift + lifts[3], o: g.o });
    const f = win(t, T.note4, T.look + 0.3), on = t < T.edge + 0.2 ? 1 : 0; texOn(R.noteA, !f); texOn(R.noteB, !f);
    A(R.noteA, 'opacity', f2(on * px(22))); A(R.noteB, 'opacity', f2(on * px(22)));
  }
  // ---- полоска «ВЫКЛЮЧИЛИ / САМИ»: садится к ~1,45 с, уходит на проезде к госпорталу
  {
    const g = slipPose(t, T.strip, T.toGov - 0.05, { fx: 40, fy: -160, lift: 3, ox: -260, oy: -640, or: -8, dOut: 0.4 }), st = LY.strip;
    if (!g) R.strip.hide(); else R.strip.set({ x: st.x + g.x, y: st.y + g.y, rot: -1.5 + g.rot, s: g.s, lift: g.lift, o: g.o });
    const f = win(t, T.strip + 0.15, T.toGov - 0.05); R.stripT.forEach(e => texOn(e, !f));
  }
  // ---- поле кода: тихое → проявляется на «Под ними» → снова тихое при наезде к выключателю (как в кадре 0)
  {
    const up = ease.inOut(prog(t, T.look + 0.05, 0.5)), dn = ease.inOut(prog(t, T.push + 0.25, 0.9));
    A(R.field, 'opacity', f2(lerp(0.36, 1, up * (1 - dn))));
  }
  // ---- трещины: на «дыру» бегут справа налево по шву (из-под листа памяти), плитки по линии раздвигаются
  const f1 = ease.out(prog(t, T.cr, 0.55)), f2_ = ease.out(prog(t, T.cr + 0.15, 0.45));
  const xf1 = lerp(CR1J[0][0] + 20, CR1J[CR1J.length - 1][0] - 20, f1), xf2 = lerp(CR2J[0][0] + 20, CR2J[CR2J.length - 1][0] - 20, f2_);
  R.cr1.set([f1]); R.cr2.set([f2_]);
  { const h = clamp((620 - xf1) / 80); A(R.hole, 'opacity', f2(h)); A(R.hole, 'visibility', h > 0.001 ? 'visible' : 'hidden'); }
  for (const tl of R.crackTiles) {
    if (tl.mem) continue;
    const y1 = yAtX(CR1J, tl.x + tl.w / 2), y2 = yAtX(CR2J, tl.x + tl.w / 2), cy = tl.y + ROWH / 2;
    const near1 = Math.abs(y1 - cy) < Math.abs(y2 - cy), xf = near1 ? xf1 : xf2, yy = near1 ? y1 : y2;
    const k = tl.x + tl.w / 2 > xf ? ease.out(clamp((tl.x + tl.w / 2 - xf) / 60)) : 0;
    const d = (4 + 4 * hash01(tl.k * 17 + tl.n, 3)) * Math.sign(cy - yy || 1) * k;
    A(tl.g, 'transform', k ? `translate(${f2(1.5 * (hash01(tl.n, 4) - 0.5) * k)} ${f2(d)}) rotate(${f2(2.2 * (hash01(tl.n, 5) - 0.5) * k)} ${f2(tl.x + tl.w / 2)} ${f2(cy)})` : '');
  }
  // ---- трафарет «PHP» и чип «≈ 70 %» на нитке
  A(R.stMask, 'width', f2(800 * ease.inOut(prog(t, T.php - 0.05, 0.32))));
  texOn(R.stencil, !win(t, T.php, T.most + 0.3));
  {
    const g = slipPose(t, T.chip70, T.chipOut, { fx: 0, fy: -160, ox: 700, oy: -200, or: 6, dOut: 0.35 });
    const cx = 958, cy = 922;
    if (!g) { R.chip1.hide(); show(R.thread, 0); }
    else {
      R.chip1.set({ x: cx + g.x, y: cy + g.y, rot: -1.5 + g.rot * 0.5, s: g.s, lift: g.lift + 2, o: g.o });
      A(R.thread, 'd', `M${f2(cx + g.x)} ${f2(cy + g.y + 66)}Q${f2(cx + 10 + g.x * 0.3)} ${f2(1020 + g.y * 0.3)} 958 1112`); show(R.thread, g.o);
    }
    const f = win(t, T.chip70 + 0.2, T.chipOut); R.chip1T.forEach(e => texOn(e, !f));
  }
  // ---- лист памяти
  memFrame(t);
  // ---- «2004»: ярлык садится, карандаш пишет год (человек вспомнил старую находку — та же метка у флажка Calif)
  {
    const L4 = { x: 792, y: 476 }, g = slipPose(t, T.y2004, T.aug + 0.5, { fx: -120, fy: -140, ox: -300, oy: -420, or: -10, dOut: 0.35 });
    if (!g) R.y2004.hide(); else R.y2004.set({ x: L4.x + g.x, y: L4.y + g.y, rot: -4 + g.rot, s: g.s, lift: g.lift, o: g.o });
    const w = prog(t, T.write2004, 0.55, ease.inOut);
    R.y2004T.draw(w);
    texOn(R.y2004T.el, !win(t, T.write2004 + 0.3, T.aug + 0.4));
    if (t < T.y2004 - 0.2 || t > T.aug + 0.9) R.pen2004.set(0, 0, 0, 0, 0);
    else {
      const a = ease.out4(prog(t, T.y2004 - 0.2, 0.5)), out = ease.in4(prog(t, T.aug + 0.1, 0.7));
      const fx = L4.x - 50 + 104 * w, fy = L4.y + 8 + 6 * Math.sin(w * 14);
      const x = lerp(L4.x - 420, fx, a) - 520 * out, y = lerp(L4.y - 420, fy, a) - 380 * out;
      R.pen2004.set(x, y, 128, w > 0 && w < 1 ? 0.05 : 0.5 + out, 1);
    }
  }
  // ---- полоска «АВГУСТ / Calif · OpenAI · Wiz»: растёт с каждой остановкой, уезжает до «ИИ»
  {
    const g = slipPose(t, T.augT - 0.08, T.namesOut, { fx: 0, fy: -200, ox: 0, oy: -520, or: 0, dOut: 0.3 });
    const shown = R.namesEl.map((e, i) => prog(t, T.st[Math.min(2, Math.floor((i + 1) / 2))] - 0.03, 0.12));
    const wNames = Math.max(...R.namesEl.map((e, i) => shown[i] > 0.01 ? e.x1 : 0));
    const wS = Math.max(380, wNames + 70);
    if (!g) R.names.hide(); else R.names.set({ x: 1500 - (R.namesW + 70 - wS) / 2 + g.x, y: -20 + g.y, w: wS, rot: -1 + g.rot * 0.3, s: g.s, lift: g.lift, o: g.o });
    A(R.namesEl[0].parentNode, 'transform', `translate(${f2((R.namesW + 70 - wS) / 2)} 0)`);
    R.namesEl.forEach((e, i) => { A(e, 'opacity', f2(shown[i])); texOn(e, !win(t, T.st[0] + 0.1, T.namesOut)); });
    A(R.augT, 'transform', `translate(${f2(-(R.namesW + 70 - wS) / 2)} 0)`); texOn(R.augT, !win(t, T.augT, T.namesOut));
  }
  // ---- пары «карандаш + курсор» команд; на «Патч» уходят вправо за кадр
  R.teams.forEach((tm, i) => {
    const t0 = T.st[i] - 1.0;
    if (t < t0 || t > (i === 0 ? T.upd : T.calif - 0.2) + 0.8) { tm.cur.set(0, 0, 0, 0, 0); tm.pen.set(0, 0, 0, 0, 0); return; }
    if (i === 0 && t < T.jump + 0.25) tm.pen.side = -1;
    const a = ease.out4(prog(t, t0, 1.0));
    let x = lerp(2750 + 120 * i, tm.x, a), y = lerp(tm.y - 30, tm.y, a);
    let rot = lerp(-18, tm.rot, a) + (t >= T.ai1 ? (-20 - tm.rot) * ease.inOut(prog(t, T.ai1, 0.22)) : 0);
    let lift = 4 + 6 * (1 - a), penLift = 0.35 * (1 - a) + 0.06, penTip = null, penAng = 32;
    const tagO = prog(t, T.ai1, 0.14);
    let off = i === 2 ? [-150, 6] : null;
    if (i === 0 && t >= T.calif) {
      // «как нашли»: курсор скользит → прыжок в круг → чтение рядами → встаёт под «7 · 6»; карандаш обводит и остаётся у круга
      const gl = ease.inOut(prog(t, T.calif, T.jump - T.calif));
      const wx = tm.x + 60 * Math.sin(gl * 3.1) - 40 * gl, wy = tm.y + 40 * Math.sin(gl * 2.2 + 0.4);
      x = wx; y = wy; lift = 10; rot = -20;
      const RD = readPath();
      if (t >= T.jump) { const j = ease.out4(prog(t, T.jump, 0.2)); x = lerp(wx, RD[0][0], j); y = lerp(wy, RD[0][1], j); lift = lerp(10, 6, j); }
      if (t >= T.read) {
        const u = clamp((t - T.read) / (T.found - T.read)), N = RD.length - 1;
        const q = Math.pow(u, 0.72) * N, k = Math.min(N - 1, Math.floor(q)), f = q - k, m = ease.out4(clamp(f / 0.45));
        x = lerp(RD[k][0], RD[k + 1][0], m); y = lerp(RD[k][1], RD[k + 1][1], m); lift = 6;
        if (t >= T.found) { x = RD[N][0]; y = RD[N][1]; }
      }
      if (t >= T.found) lift = 5 - 1.2 * Math.exp(-(t - T.found) / 0.05);
      off = t >= T.jump ? [lerp(-46, -132, ease.inOut(prog(t, T.jump, 0.5))), lerp(56, -78, ease.inOut(prog(t, T.jump, 0.5)))] : null;
      const tail = tailOf(x, y, rot);
      penTip = [tail[0] + 6, tail[1] + 4]; penAng = 34;
      const REST = [FIND.cx - 14, FIND.cy - 82];                                     // верхняя кромка круга: карандаш ждёт там, корпус вверх-вправо
      if (t >= T.circle - 0.45) {
        const c0 = loopPt(FIND.cx, FIND.cy, FIND.rx, FIND.ry, 0);
        if (t < T.circle) { const u = ease.inOut(prog(t, T.circle - 0.45, 0.45)); penTip = [lerp(penTip[0], c0[0], u), lerp(penTip[1], c0[1], u)]; penLift = 0.9 * Math.sin(Math.PI * u) + 0.05; }
        else if (t < T.circle + 0.62) { penTip = loopPt(FIND.cx, FIND.cy, FIND.rx, FIND.ry, ease.inOut(prog(t, T.circle, 0.6))); penLift = 0; }
        else if (t < T.jump) {
          const e = loopPt(FIND.cx, FIND.cy, FIND.rx, FIND.ry, 1), P0 = [FIND.cx - 30, FIND.cy + 8];
          const u = ease.inOut(prog(t, T.circle + 0.62, 0.14));
          const tap = Math.max(0, Math.sin(Math.PI * clamp((t - T.tap) / 0.11))) + Math.max(0, Math.sin(Math.PI * clamp((t - T.tap - 0.17) / 0.11)));
          penTip = [lerp(e[0], P0[0], u), lerp(e[1], P0[1], u)]; penLift = 0.35 * (1 - Math.min(1, tap)) + 0.02;
        } else {
          const P0 = [FIND.cx - 30, FIND.cy + 8], u = ease.inOut(prog(t, T.jump, 0.5));
          penTip = [lerp(P0[0], REST[0], u), lerp(P0[1], REST[1], u)]; penLift = 0.15 + 0.5 * Math.sin(Math.PI * u); penAng = lerp(34, -50, u); tm.pen.side = u > 0.5 ? 1 : -1;
        }
      }
      A(R.califFlag, 'opacity', f2(prog(t, T.calif + 0.25, 0.15)));
      texOn(R.califFlag, !win(t, T.calif + 0.6, T.upd));
    } else if (i === 0) A(R.califFlag, 'opacity', '0');
    const out = ease.in4(prog(t, i === 0 ? T.upd : T.calif - 0.2, 0.7));                // уходят вправо: OpenAI и Wiz — на наезде к Calif, Calif — на «Патч»
    x += 1300 * out; if (penTip) penTip = [penTip[0] + 1300 * out, penTip[1]];
    tm.cur.set(x, y, rot, lift, 1, tagO * px(34), off);
    texOn(tm.cur.tagTxt, !(win(t, T.ai1, T.calif - 0.1) || (i === 0 && win(t, T.read, T.upd - 0.2))));
    const tl = penTip || (() => { const q = tailOf(x, y, rot); return [q[0] + 6, q[1] + 4]; })();
    tm.pen.set(tl[0], tl[1], penAng, penLift, 1, 1);
  });
  // ---- номера «4 · 5 · 7 · 6 · 8»: «7 · 6» жёлтая ≥ 1 с
  const digitO = ease.inOut(prog(t, T.calif - 0.6, 0.5)) * (1 - ease.inOut(prog(t, T.push, 0.6)));
  R.numTiles.forEach(nt => {
    const j = nt.num.j, yel = j === 2 || j === 3 ? ease.out(prog(t, T.bug - 0.04 + (j - 2) * 0.05, 0.16)) * (1 - ease.inOut(prog(t, T.upd + 0.4, 0.3))) : 0;
    A(nt.num.ny, 'opacity', f2(yel)); texOn(nt.num.nt, !win(t, T.read, T.upd)); A(nt.num.nt, 'opacity', f2(digitO));
  });
  R.hair.draw(prog(t, T.bug + 0.06, 0.3, ease.inOut) * (1 - prog(t, T.upd + 0.4, 0.25)));
  R.circle.draw(t < T.circle ? 0 : prog(t, T.circle, 0.6, ease.inOut));
  // ---- заплатки: садятся, когда камера пришла; на первой — крупно «21.10»
  PATCH.forEach((p, k) => {
    const t0 = p.t(), P = R.patches[k];
    if (t < t0 - 0.2) { P.set(0, 0, 0, 0, 0); return; }
    const a = ease.out4(clamp((t - t0 + 0.2) / 0.2)), s = land(t, t0, { r: 0.34, z: 0.82 });
    P.set(p.x + 520 * (1 - a) * (1 - a), p.y - 640 * (1 - a) * (1 - a), p.rot + 6 * (1 - s), lerp(26, 1, s), clamp(a * 2));
    if (P.tx) { texOn(P.tx, true); A(P.tx, 'opacity', f2(px(p.size))); }
  });
  R.stamp21.set(t >= T.stamp21 ? 1 : 0, 0, 0, t >= T.stamp21 ? 1 + 0.18 * Math.exp(-(t - T.stamp21) / 0.05) : 1);
  R.stamp21.querySelectorAll('text').forEach(e => texOn(e, !win(t, T.stamp21, T.race - 0.1)));
  // ---- плывущая четвёртая: светлый скотч, мягкая тень; к удару едет по диагонали вверх-влево к разрыву и не доходит (~150 px)
  {
    const t0 = T.pat[2] + 0.2;
    if (t < t0) R.patchD.set(0, 0, 0, 0, 0);
    else {
      const A0 = [1300, -140], B0 = [706, 534], C0 = [611, 433], D0 = [600, 422];
      let p;
      if (t < T.crash + 0.2) { const u = ease.out4(prog(t, t0, T.crash + 0.2 - t0)); p = [lerp(A0[0], B0[0], u), lerp(A0[1], B0[1], u)]; }
      else if (t < T.hit) { const u = prog(t, T.crash + 0.2, T.hit - T.crash - 0.2, x => x); p = [lerp(B0[0], C0[0], u), lerp(B0[1], C0[1], u)]; }
      else { const u = ease.out(prog(t, T.hit, T.loop - T.hit)); p = [lerp(C0[0], D0[0], u), lerp(C0[1], D0[1], u)]; }
      const ex = ease.in4(prog(t, T.loop + 0.1, 0.8));
      const x = p[0] + 1100 * ex, y = p[1] + 3 * Math.sin((t - t0) * 2.3) - 300 * ex;
      const lift = clamp(9 / Math.max(0.5, z) - 1, 1, 10);                           // смещение тени на экране ≈ 8–10 px
      R.patchD.set(x, y, -3.5 + 1.2 * Math.sin((t - t0) * 1.6), lift + 8 * ex, 1);
    }
    texOn(R.patchD.tx, true); A(R.patchD.tx, 'opacity', '0');
  }
  // ---- пара «?»: такой же карандаш, курсор крупнее; въезд при стоящей камере, 3 рывка по ~35 px, последний шаг на «атаку»;
  //      остриё замирает в 30–40 px от края разрыва, не касается
  {
    const Q = R.q, O = { x: 497, y: 418 }, D = [0.73, -0.68], STEP = 12;
    const P = k => ({ x: O.x - D[0] * STEP * (4 - k), y: O.y - D[1] * STEP * (4 - k) });
    const J = [T.hit - 1.55, T.hit - 1.0, T.hit - 0.5, T.hit - 0.08];
    if (t < T.race - 0.02 || t > T.loop + 0.9) { Q.cur.set(0, 0, 0, 0, 0); Q.pen.set(0, 0, 0, 0, 0); }
    else {
      const a = ease.out4(prog(t, T.race, 0.4));
      const P0 = P(0);
      let x = lerp(-820, P0.x, a), y = lerp(560, P0.y, a);
      for (let k = 0; k < 4; k++) if (t >= J[k]) { const u = ease.out4(prog(t, J[k], 0.12)), A_ = P(k), B_ = P(k + 1); x = lerp(A_.x, B_.x, u); y = lerp(A_.y, B_.y, u); }
      if (t >= T.loop) { const u = ease.in4(prog(t, T.loop + 0.1, 0.75)); x -= 1500 * u; y += 60 * u; }
      const rot = 70, K = 1.5;
      Q.cur.set(x, y, rot, 6, 1, px(34 * 0.36), [210, -70]);
      const [gx, gy] = rotPt(-3 * K, 70 * K, rot);                                   // карандаш упирается в левую кромку курсора
      Q.pen.side = 1;
      Q.pen.set(x + gx - 2, y + gy, 165, 0.1, 1, 1);
      texOn(Q.pen.flTxt, !win(t, T.race + 0.3, T.loop)); texOn(Q.cur.tagTxt, true);
    }
  }
  // ---- хозяин: ластик карандаша у клавиши (кадр 0: окно 2; конец: герой)
  {
    let o = null, w = null;
    if (t < 1.8) { o = ownerAt(T.click2 - t); w = R.win[1]; }
    else if (t > T.owner - 0.05) { o = ownerAt(DUR - t + T.click2); w = R.win[0]; }
    if (!o) R.owner.set(0, 0, 0, 0, 0);
    else { const kx = w.sw.x, ky = w.sw.y + 9; R.owner.set(kx + o.dx, ky + o.dy, o.ang, o.lift, o.o ?? 1); }
  }
  // ---- знак канала: жёлтый и ник — только в отъезде петли, целиком в кадре
  {
    const s = LY.sign, y = ease.inOut(prog(t, T.loop + 0.12, 0.4));
    R.sign.set({ x: s.x, y: s.y, rot: -4, lift: 4, yel: y });
    R.nick.draw(prog(t, T.loop + 0.35, 0.5, ease.out));
    texOn(R.nick.el, !win(t, T.loop + 0.45, T.push));
  }
}

// путь чтения курсора: по рядам 7 и 8 внутри круга, затем ряд 9 до «7»
function readPath() {
  if (readPath.c) return readPath.c;
  const pts = [];
  [7, 8].forEach(k => {
    const row = R.fieldTiles.filter(t => t.k === k && t.x > FIND.cx - FIND.rx + 20 && t.x + t.w < FIND.cx + FIND.rx - 10).sort((a, b) => a.x - b.x);
    row.slice(0, 4).forEach(tl => pts.push([tl.x + 10, tl.y + 10]));
  });
  R.numTiles.slice(0, 2).forEach(tl => pts.push([tl.x + 12, tl.y + 12]));
  const n7 = R.numTiles[2];
  pts.push([n7.x + FIND.tw + FIND.gap / 2, n7.y + ROWH + 2]);        // встаёт под парой «7 · 6», не закрывая её
  return (readPath.c = pts);
}

// ------------------------------------------------------------------ карта (QUERY=map=1): лист сверху, маршруты, состояния окон
function buildMap() {
  const M = mapG;
  const stops = [
    [1, SHOT.hook0(0), [0, -70]], [2, SHOT.hook1(2), [-40, 60]], [3, SHOT.gov(4), [0, -70]], [4, SHOT.edge(6), [0, 0]], [5, SHOT.reveal(9), [0, 0]],
    [6, SHOT.mem(14), [0, 60]], [7, SHOT.y2004(26), [-70, -40]], [8, SHOT.teams(29), [150, 90]], [9, SHOT.calif(36), [-20, 10]],
    [10, SHOT.patch(40.5), [140, -40]], [11, SHOT.strike(44), [-60, 70]], [12, SHOT.seam(DUR), [-30, -60]],
  ];
  [[SHOT.hook0(0), PAL.graphite], [SHOT.mem(14), PAL.graphite], [SHOT.calif(36), PAL.graphite], [SHOT.strike(44), '#B07A12']].forEach(([p, col]) => {
    const w = W / p.z, h = H / p.z;
    S('rect', { x: p.x - w / 2, y: p.y - h / 2, width: w, height: h, fill: 'none', stroke: col, 'stroke-width': 8, 'stroke-dasharray': '26 16', opacity: 0.7 }, M);
  });
  let d = `M${stops[0][1].x} ${stops[0][1].y}`;
  stops.slice(1).forEach(([, p]) => { d += `L${p.x} ${p.y}`; });
  S('path', { d: roughD(d, { seed: 3, roughness: 0.8, disableMultiStroke: true }), fill: 'none', stroke: PAL.ink, 'stroke-width': 12, opacity: 0.75 }, M);
  TEAMS.forEach(tm => S('path', { d: `M2700 ${tm.y - 30}L${tm.x} ${tm.y}`, fill: 'none', stroke: '#5F6675', 'stroke-width': 10, 'stroke-dasharray': '24 14' }, M));
  S('path', { d: 'M-1100 500L494 421', fill: 'none', stroke: '#B07A12', 'stroke-width': 14, 'stroke-dasharray': '30 16' }, M);
  S('path', { d: 'M1340 -140Q1000 300 790 560L650 560', fill: 'none', stroke: '#8E7046', 'stroke-width': 12, 'stroke-dasharray': '4 18', 'stroke-linecap': 'round' }, M);
  stops.forEach(([n, p, [ox, oy]]) => {
    const x = p.x + ox, y = p.y + oy;
    S('circle', { cx: x, cy: y, r: 50, fill: n === 11 ? PAL.yellow : PAL.slip, stroke: PAL.ink, 'stroke-width': 8 }, M);
    tText(M, String(n), { x, y, size: 50, font: FONT.mono, weight: 700 });
  });
  R.win.forEach((w, i) => { const e = tText(M, String(i + 1), { x: w.x0 + 34, y: w.y0 + 40, size: 70, weight: 800, fill: PAL.ink }); A(e, 'stroke', PAL.slip); A(e, 'stroke-width', 14); A(e, 'paint-order', 'stroke'); });
  const lg = S('g', { transform: 'translate(-300 -1560)' }, M);
  S('path', { d: rr(-40, -110, 2680, 1100, 10), fill: PAL.slip, stroke: '#D9D2C4', 'stroke-width': 3 }, lg);
  tText(lg, 'Карта листа №5 (v5) — камера сверху', { x: 0, y: -30, size: 92, weight: 800, anchor: 'start' });
  const CAMN = ['1 кадр 0: окно 2 ×2,1', '2 отъезд: герой, 2, 3, 6', '3 госпортал ×2,0', '4 торец «PHP» ×1,25', '5 раскрытие ×0,5 + серая плита',
    '6 лист памяти ×4,0', '7 «2004» ×2,6', '8 три пары ×0,62 → ×0,95', '9 как нашли ×3,0', '10 заплатки ×1,15', '11 удар ×3,1 (крэш-зум)', '12 шов: герой ×2,1 = кадр 0'];
  CAMN.forEach((s, i) => tText(lg, s, { x: (i % 2) * 1300, y: 80 + Math.floor(i / 2) * 64, size: 50, weight: 600, anchor: 'start' }));
  const key = [[PAL.ink, '', 'камера'], ['#5F6675', '24 14', 'пары команд — справа'], ['#B07A12', '30 16', 'пара «?» — слева'], ['#8E7046', '4 18', 'заплатка 4 в пути']];
  key.forEach(([c, da, s], i) => { const x = (i % 2) * 1300, y = 520 + Math.floor(i / 2) * 64; S('path', { d: `M${x} ${y - 14}H${x + 120}`, stroke: c, 'stroke-width': 12, 'stroke-dasharray': da, 'stroke-linecap': 'round' }, lg); tText(lg, s, { x: x + 150, y: y - 14, size: 48, weight: 600, anchor: 'start' }); });
  tText(lg, 'окна: 1 герой (горит) · 2/3/6 гаснут в хуке, заплатки на «21» · 4 госпортал без заплатки · 5/7 гаснут в петле', { x: 0, y: 680, size: 46, weight: 500, anchor: 'start', fill: PAL.graphite });
  tText(lg, 'лист памяти — шов между окнами 2/3 и 5/6: бланк → обрыв → клочки → новый бланк + пунктирная записка', { x: 0, y: 760, size: 46, weight: 500, anchor: 'start', fill: PAL.graphite });
}
function mapFrame() {
  const c = { x: 1000, y: 760, z: 0.37, r: 0 };
  A(wg, 'transform', camXf(c));
  root.style.setProperty('--k', f2(Math.pow(c.z, -0.6)));
  A(fg, 'display', 'none');
  sceneFrame(T.pass + 0.4, c);
  caps.frame(-1);
}

// ------------------------------------------------------------------ обложка (QUERY=cover=1): окна погасли сами, «САЙТЫ ВЫКЛЮЧИЛИ САМИ. ЗАЧЕМ?»
const COVER_T = 3.0;
function coverCam() { return { x: 905, y: 470, z: 1.16, r: 0 }; }
function buildCover(capL) {
  A(capL, 'display', 'none');
  const t = makeTile(L.slip, L.slipSh, { w: 820, h: 346, tone: 'slip', r: 5, depth: 3, line: 0 });
  ['САЙТЫ', 'ВЫКЛЮЧИЛИ', 'САМИ.'].forEach((s, i) => tText(t.front, s, { y: -108 + i * 108, size: 84, font: FONT.head, weight: 900 }));
  tapeStrip(t.over, 120, 34, -16, -360, -168); tapeStrip(t.over, 120, 34, 14, 360, -168);
  R.coverSlip = t;
  const q = makeTile(L.slip, L.slipSh, { w: 540, h: 150, tone: 'yellow', r: 5, depth: 4, line: 3 });
  tText(q.front, 'ЗАЧЕМ?', { y: 2, size: 72, font: FONT.head, weight: 900 });
  R.coverQ = q;
}
function coverFrame(c) {
  R.strip.hide();
  const p = wld(c, 540, 930), q = wld(c, 640, 1240);
  R.coverSlip.set({ x: p.x, y: p.y, rot: -2, lift: 6 });
  R.coverQ.set({ x: q.x, y: q.y, rot: 3, lift: 10, yel: 0 });
  A(R.coverQ.g, 'transform', R.coverQ.g.getAttribute('transform'));
  R.foreItems.forEach(f => A(f.g, 'visibility', 'hidden'));
}

// ------------------------------------------------------------------ звук: 5 физических семейств, не чаще одного на 0,1 с
function buildSfx() {
  const e = (t, n, g) => sfx(Math.max(0, t), n, g);
  // хук: щелчок клавиши, переворот, табличка; дальше гаснут сами; полоска
  e(T.click2 - 0.02, 'switch_1', -1); e(T.off2 + 0.04, 'flip', -6); e(T.plate2 - 0.04, 'paper', -7);
  e(T.off3 - 0.08, 'switch_2', -9); e(T.strip - 0.04, 'paper', -5); e(T.off6 - 0.08, 'switch_1', -9); e(T.off6 + 0.04, 'flip', -11);
  e(T.toGov, 'slide', -14);                                                            // проезд к госпорталу
  e(T.off4 - 0.1, 'switch_2', -4); e(T.off4 + 0.04, 'flip', -7); e(T.note4 - 0.04, 'paper', -6);
  // «Под ними»: окна волной; торец «PHP»; раскрытие
  e(T.look + 0.02, 'place', -10); e(T.look + 0.16, 'place', -12); e(T.look + 0.3, 'place', -13);
  e(T.edge, 'slide', -15); e(T.php - 0.06, 'stamp', -8); e(T.chip70 - 0.04, 'paper', -9);
  e(T.edge + 0.32, 'place', -12); e(T.most + 0.1, 'slide', -16);
  // лист памяти: лист раскрывается, бланк влетает, строчки пером, стоп, разрыв, клочки оседают
  e(T.part, 'shove', -13); e(T.formA - 0.04, 'paper', -6);
  { const stepL = Math.max(0.8, T.halt - 0.22 - T.lines) / HALT_LINE; for (let k = 0; k <= HALT_LINE; k++) e(T.lines + k * stepL, 'pencil', -12 - (k % 2)); }
  e(T.tear - 0.03, 'slice', -2); e(T.tear + 0.18, 'dust', -9); e(T.tear + 0.32, 'paper', -12); e(T.scraps, 'paper', -11);
  e(T.formB - 0.04, 'paper', -6); e(T.catch, 'place', -13); e(T.note, 'shove', -9); e(T.slide, 'shove', -11);
  e(T.chip92 - 0.04, 'paper', -9);                                                     // «без пароля» — тишина
  // «2004», трещины, «август», три пары
  e(T.y2004 - 0.04, 'paper', -9); e(T.cr - 0.03, 'slice', -4); e(T.cr + 0.15, 'slice', -8); e(T.write2004, 'pencil', -5);
  e(T.aug, 'slide', -15); e(T.augT - 0.06, 'paper', -10);
  T.st.forEach((ts, k) => { e(ts - 1.0 + 0.07 * k, 'slide', -13 - k); e(ts - 0.03, 'chip_lay', -8); });
  e(T.namesOut, 'paper', -15); e(T.ai1 - 0.03, 'tick', -10);
  // как нашли
  e(T.calif + 0.05, 'slide', -15); e(T.circle - 0.02, 'pencil', -6); e(T.tap, 'tick', -9); e(T.tap + 0.17, 'tick', -9); e(T.jump - 0.02, 'chip_lay', -12);
  { const N = readPath().length - 1; let last = -1;
    for (let k = 1; k <= N; k++) { const tk = T.read + Math.pow(k / N, 1 / 0.72) * (T.found - T.read) - 0.03; if (tk - last >= 0.1 && tk < T.found - 0.12) { e(tk, 'tick', -13); last = tk; } } }
  e(T.found - 0.03, 'chip_lay', -4); e(T.bug, 'slice', -16);
  // патч: пары уходят, заплатки (скотч), штамп «21.10», окна загораются; плывущая — долгое тихое скольжение
  e(T.upd + 0.05, 'slide', -14);
  T.pat.forEach((tp, k) => e(tp - 0.03, 'paper', -6 - 2 * k)); e(T.stamp21 - 0.02, 'stamp', -5); e(T.pat[2] + 0.22, 'flip', -11);
  for (let tg = T.pat[2] + 0.3; tg < T.loop; tg += 1.5) e(tg, 'glide', -15);
  // гонка: скольжение ниже и суше → примерка → толчок → тяжёлый щелчок (единственный удар)
  e(T.race - 0.05, 'slidelow', -5);
  for (let tj = T.race + 0.6; tj < T.any - 0.1; tj += 0.27) e(tj, 'tick', -15);
  e(T.any - 0.03, 'slidelow', -10); e(T.hit - 0.04, 'hit', 1);
  // петля
  e(T.off5 - 0.08, 'switch_2', -12); e(T.off5 + 0.14, 'flip', -15);
  e(T.off7 - 0.08, 'switch_1', -12); e(T.off7 + 0.14, 'flip', -15);
  e(T.owner + 0.35, 'pencil', -15);
}
