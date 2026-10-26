// Сцены 5 (таймлайн: «Поэтому я ничего не двигаю мышкой.») и 10 (финал: «Перешли тому, кто…»).
// Контракт — в начале js/film.js и kit.js:
//   SCENES.timeline = (g, ctx) => t => {...}   окно: T.s5 … T.s6 + 0.35 (к T.s6 + 0.3 всё ушло)
//   SCENES.outro    = (g, ctx) => t => {...}   окно: T.s10 … T.end (к T.end − 0.15 пустой фон = кадр 0)
// Всё внутри IIFE: скрипты страницы делят одну глобальную область. Кадр — чистая функция t.
window.SCENES = window.SCENES || {};
(() => {
  // ------------------------------------------------------------------ общее для сцен 5 и 10
  // курсор: классическая стрелка; остриё — в начале координат (поза = точка, куда он указывает)
  const ARROW = 'M0 0L0 36L9.5 27.5L16 42L22.5 39L16 25L28 25Z';
  function cursor(parent, P, k) {
    const g = S('g', { visibility: 'hidden' }, parent), inner = S('g', { transform: `scale(${k})` }, g);
    S('path', { d: ARROW, fill: P.band, opacity: 0.7, transform: 'translate(2.5 4)' }, inner);   // тень — смещённая подложка
    S('path', { d: ARROW, fill: P.ink, stroke: P.bg, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, inner);
    return g;
  }
  // ключ-ромбик с центром в начале координат; paint(c) меняет заливку
  function key(parent, R, fill) {
    const g = S('g', { visibility: 'hidden' }, parent);
    const p = S('path', { d: `M0 ${-R}L${R} 0L0 ${R}L${-R} 0Z`, fill, stroke: fill, 'stroke-width': R * 0.28, 'stroke-linejoin': 'round' }, g);
    g.paint = c => { A(p, 'fill', c); A(p, 'stroke', c); };
    return g;
  }
  // появление ключа: поп 0.35 -> 1 с перелётом и поворот −25° -> 0
  function keyPop(kg, x, y, t, t0) {
    if (t < t0) { show(kg, 0); return; }
    const e = step(t - t0, SP.pop), s = lerp(0.35, 1, e);
    pose(kg, x, y, s, s, -25 * (1 - e), popO(t, t0));
  }
  // кольцо от нажатия вокруг острия
  const ring = (parent, color) => S('circle', { r: 0, fill: 'none', stroke: color, visibility: 'hidden' }, parent);
  function ringAt(c, x, y, t, t0) {
    const u = clamp((t - t0) / 0.42);
    A(c, 'cx', f2(x)); A(c, 'cy', f2(y)); A(c, 'r', f2(14 + 46 * ease.out(u))); A(c, 'stroke-width', f2(6 * (1 - u)));
    show(c, u > 0 && u < 1 ? 0.85 * (1 - u) : 0);
  }
  const bez = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * c + u * u * b;      // дуга въезда курсора
  const bump = (t, t0, d) => { const u = (t - t0) / d; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };   // нажатие 0 -> 1 -> 0
  const gone = (t, t0, d = 0.18) => ease.in4((t - t0) / d);                                  // уход, power4.in
  const DRAG = { r: 0.5, z: 1 };       // перетаскивание: быстрее SP.tuck, без перелёта (успокоение ~0,46 с)

  // ------------------------------------------------------------------ сцена 5: таймлайн перечёркнут
  SCENES.timeline = (g, ctx) => {
    const { P, T } = ctx;
    // cues — от слов фразы 5; секундами только длительности и малые сдвиги
    const C = {};
    C.in = T.s5 + 0.19;                                    // панель: сцена 4 к этому моменту почти ушла
    C.grab = pw(5, 'двигаю').start - 0.08;                 // курсор хватает ключ: click
    C.drag = C.grab + 0.1;                                 // и тащит его по дорожке
    C.cur = Math.max(C.in + 0.3, Math.min(pw(5, 'я').start - 0.05, C.grab - 0.95));   // въезд курсора
    C.strike = pw(5, 'мышкой').start - 0.12;               // жирное рукописное перечёркивание
    C.deny = C.strike + 0.07;                              // «отказ»: звук + встряска панели
    C.head = C.strike + 0.1;                               // «БЕЗ ТАЙМЛАЙНА» штампом поверх панели (до T.s6 мало времени)
    C.hout = T.s6 - 0.12;                                  // заголовок уходит: к T.s6 + 0.04 пусто, дальше — сцена 6
    C.pout = Math.min(C.deny + 0.26, C.hout - 0.1);        // панель уезжает из-под заголовка
    const SPC = { r: clamp((C.grab - 0.12 - C.cur) / 0.93, 0.5, 1.2), z: 1 };   // курсор встаёт на ключ до нажатия
    sfx(C.grab, 'click', -6);
    sfx(C.deny, 'deny', -3);

    // панель таймлайна (по ширине — как плашка кода в сцене 6: x 157–923)
    const PX = { x: 157, y: 440, w: 766, h: 400 }, PCX = PX.x + PX.w / 2, PCY = PX.y + PX.h / 2;
    const HDR = PX.y + 60, RUL = HDR + 50, ROW = 92, LAB = 348;
    const X = s => 366 + 124 * s;                          // секунды на дорожке -> x
    const wrap = S('g', {}, g), pan = S('g', {}, wrap);     // wrap: встряска и уход; pan: появление
    S('rect', { x: PX.x, y: PX.y, width: PX.w, height: PX.h, rx: 28, fill: P.panel, stroke: P.line, 'stroke-width': 2.5 }, pan);
    [0, 1, 2].forEach(i => S('circle', { cx: PX.x + 34 + i * 26, cy: PX.y + 30, r: 8, fill: P.line }, pan));
    S('text', { x: PX.x + 130, y: PX.y + 40, 'font-family': FONT.text, 'font-weight': 700, 'font-size': 28, fill: P.mute }, pan).textContent = 'Таймлайн';
    // таймкод с отступом: при встряске (±20 px) правый край текста остаётся ≤ 888
    const tc = S('text', { x: PX.x + PX.w - 64, y: PX.y + 40, 'text-anchor': 'end', 'font-family': FONT.mono, 'font-weight': 700, 'font-size': 28, fill: P.ink }, pan);
    S('rect', { x: PX.x, y: HDR - 1, width: PX.w, height: 2, fill: P.line }, pan);
    S('rect', { x: LAB - 1, y: HDR, width: 2, height: PX.y + PX.h - HDR - 16, fill: P.line }, pan);
    // линейка: деления по 0,2 с, подписи секунд
    const rul = S('g', {}, pan);
    let td = '';
    for (let k = 0; k <= 21; k++) td += `M${X(k * 0.2)} ${RUL}V${RUL - (k % 5 ? 9 : 20)}`;
    S('path', { d: td, stroke: P.mute, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.75 }, rul);
    S('rect', { x: LAB, y: RUL - 1, width: PX.x + PX.w - LAB, height: 2, fill: P.line }, rul);
    [0, 1, 2, 3].forEach(s => { S('text', { x: X(s) + 8, y: RUL - 24, 'font-family': FONT.mono, 'font-size': 22, fill: P.mute }, rul).textContent = s + 'с'; });
    // дорожки: цвет-метка, имя свойства, отрезки между ключами, ключи
    const ROWS = [
      { name: 'Позиция', c: P.c[3], k: [0.25, 1.2, 2.3, 3.6] },
      { name: 'Масштаб', c: P.c[2], k: [0.5, 1.5, 3.3] },
      { name: 'Поворот', c: P.c[4], k: [0.8, 1.9, 2.9, 4.0] },
    ];
    const AR = 1, AK = 1, K1 = 2.5;                        // тащим ключ «Масштаб»: 1,5 с -> 2,5 с
    const rows = ROWS.map((r, i) => {
      const rg = S('g', {}, pan), y = RUL + ROW * i + ROW / 2;
      if (i) S('rect', { x: PX.x + 16, y: RUL + ROW * i - 0.75, width: PX.w - 32, height: 1.5, fill: P.line }, rg);
      S('rect', { x: PX.x + 34, y: y - 8, width: 16, height: 16, rx: 4, fill: r.c }, rg);
      S('text', { x: PX.x + 62, y: y + 9, 'font-family': FONT.text, 'font-weight': 600, 'font-size': 25, fill: P.mute }, rg).textContent = r.name;
      const seg = S('path', { d: '', fill: 'none', stroke: r.c, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0 }, rg);
      return { ...r, rg, y, seg };
    });
    const x0 = X(ROWS[AR].k[AK]), x1 = X(K1), ya = rows[AR].y;
    // след: пунктирный контур там, где ключ стоял
    const ghost = S('path', { d: `M${x0} ${ya - 19}L${x0 + 19} ${ya}L${x0} ${ya + 19}L${x0 - 19} ${ya}Z`, fill: 'none', stroke: ROWS[AR].c, 'stroke-width': 3, 'stroke-dasharray': '6 6', 'stroke-linejoin': 'round', visibility: 'hidden' }, pan);
    const keysG = S('g', {}, pan);
    rows.forEach(r => { r.keys = r.k.map(() => key(keysG, 19, r.c)); });
    rows.flatMap((r, i) => r.k.map((s, j) => ({ kg: r.keys[j], s }))).sort((a, b) => a.s - b.s)
      .forEach((o, n) => { o.kg.t0 = C.in + 0.24 + n * 0.035; });              // ключи выскакивают слева направо
    // плейхед: играет до нажатия, потом стоит
    const ph = S('g', { visibility: 'hidden' }, pan);
    S('path', { d: `M0 ${RUL}V${RUL + 3 * ROW}`, stroke: P.ink, 'stroke-width': 3 }, ph);
    S('path', { d: `M-12 ${RUL - 40}H12V${RUL - 16}L0 ${RUL - 3}L-12 ${RUL - 16}Z`, fill: P.ink }, ph);
    const act = rows[AR].keys[AK];
    pan.appendChild(act);                                   // активный ключ — над плейхедом
    const rg = ring(pan, P.ink);
    const cur = cursor(pan, P, 2);
    // перечёркивание — поверх всего, и курсора тоже («не двигаю мышкой»)
    const strike = drawStroke(pan, roughD('M184 530 Q560 604 900 806', { seed: 23, roughness: 1.1, bowing: 0.8, disableMultiStroke: true }), { stroke: P.c[0], 'stroke-width': 22 });
    // «БЕЗ ТАЙМЛАЙНА»: две строки штампом по центру панели, тёмная обводка под буквами
    const sH = fitSize('ТАЙМЛАЙНА', 680, 124);
    const yA = PCY - 0.24 * sH, yB = yA + 1.14 * sH;
    const hwA = S('g', {}, g), hwB = S('g', {}, g);
    const hA = headline(hwA, 'БЕЗ', { x: 540, y: yA, size: sH, fill: P.c[0], outline: P.bg, stagger: 0.02, rise: 0.3 });
    const hB = headline(hwB, 'ТАЙМЛАЙНА', { x: 540, y: yB, size: sH, fill: P.ink, outline: P.bg, stagger: 0.014, rise: 0.3 });

    return t => {
      // панель: появление; встряска «отказа» по горизонтали; уход вниз с уменьшением
      const a = step(t - C.in, SP.pop);
      popAt(pan, PCX, PCY, t < C.in ? 0 : lerp(0.92, 1, a), popO(t, C.in), (1 - a) * 30);
      const sv = t - C.deny, dx = sv > 0 && sv < 0.3 ? 20 * Math.sin(2 * Math.PI * sv / 0.11) * (1 - sv / 0.3) ** 2 : 0;
      const q = gone(t, C.pout, 0.26);
      A(wrap, 'transform', `translate(${f2(PCX + dx)} ${f2(PCY + 70 * q)}) scale(${f2(1 - 0.12 * q)}) translate(${-PCX} ${-PCY})`);
      show(wrap, (1 - q) * (1 - 0.75 * prog(t, C.head, 0.18, ease.out)));   // под штампом заголовка панель отступает в тень
      if (q < 1) {
        // содержимое каскадом
        rise(rul, after(t, C.in + 0.08, SP.fade), 12);
        rows.forEach((r, i) => rise(r.rg, after(t, C.in + 0.12 + i * 0.06, SP.fade), 12));
        // ключ, который тащим: наведение -> нажатие (сжатие) -> выбран (жёлтый) -> едет за курсором
        const kx = lerp(x0, x1, step(t - C.drag, DRAG));
        rows.forEach(r => r.keys.forEach((kg, j) => { if (kg !== act) keyPop(kg, X(r.k[j]), r.y, t, kg.t0); }));
        const hv = after(t, C.grab - 0.16, SP.hl), pr = bump(t, C.grab, 0.2), kq = 0.22 * pr;
        if (t < act.t0) show(act, 0);
        else {
          const e = step(t - act.t0, SP.pop), s = lerp(0.35, 1, e) * (1 + 0.14 * hv);
          pose(act, kx, ya, s * (1 + kq), s * (1 - kq), -25 * (1 - e), popO(t, act.t0));
          act.paint(mix(ROWS[AR].c, P.hot, clamp((t - C.grab) / 0.08)));
        }
        show(ghost, 0.7 * clamp((t - C.drag) / 0.12));
        rows.forEach((r, i) => {
          const xs = r.k.map((s, j) => (i === AR && j === AK ? kx : X(s)));
          A(r.seg, 'd', xs.slice(1).map((x, j) => `M${f2(xs[j])} ${r.y}H${f2(x)}`).join(''));
          A(r.seg, 'opacity', f2(0.42 * after(t, C.in + 0.55, SP.fade)));
        });
        // плейхед и таймкод
        const pp = clamp((t - C.in - 0.3) / Math.max(0.3, C.grab - C.in - 0.3)), phs = lerp(2.65, 3.45, pp);
        const pa = after(t, C.in + 0.3, SP.fade);
        A(ph, 'transform', `translate(${f2(X(phs))} ${f2(-16 * (1 - pa))})`); show(ph, pa);
        const fr = Math.round(phs * 30);
        setText(tc, `00:00:${String(Math.floor(fr / 30)).padStart(2, '0')}:${String(fr % 30).padStart(2, '0')}`);
        // курсор: дуга на пружине без перелёта -> стоит на ключе -> нажатие -> тащит
        if (t < C.cur) show(cur, 0);
        else {
          const u = step(t - C.cur, SPC);
          place(cur, bez(1150, 900, x0 + 4, u) + (kx - x0), bez(930, 1000, ya + 6, u), 1 - 0.14 * pr, 1);
        }
        ringAt(rg, x0 + 4, ya + 6, t, C.grab);
        strike.draw(prog(t, C.strike, 0.22, ease.out));
      }
      // заголовок: выскакивает по буквам, уходит вверх (строки со сдвигом)
      hA.set(t, C.head); hB.set(t, C.head + 0.05);
      const qa = gone(t, C.hout - 0.03, 0.16), qb = gone(t, C.hout, 0.16);
      popAt(hwA, 540, yA - 0.36 * sH, 1 - 0.08 * qa, 1 - qa, -40 * qa);
      popAt(hwB, 540, yB - 0.36 * sH, 1 - 0.08 * qb, 1 - qb, -40 * qb);
    };
  };

  // ------------------------------------------------------------------ сцена 10: финал и петля
  SCENES.outro = (g, ctx) => {
    const { P, T } = ctx;
    const C = {};
    C.h1 = Math.max(T.s10 + 0.14, pw(10, 'перешли').start - 0.08);   // сцена 9 к этому моменту почти ушла
    C.h2 = pw(10, 'кто').start - 0.08;
    C.mini = pw(10, 'до').start - 0.1;                     // сценка «вручную»: тот же ключ и курсор, что в сцене 5
    C.cur = C.mini + 0.15;
    C.grab = Math.max(C.cur + 0.45, pw(10, 'делает').start - 0.08);
    // курсор упрямо таскает ключ туда-сюда: на «делает», «анимацию», «вручную» и дальше, пока всё не уйдёт
    const MV = [C.grab + 0.12, pw(10, 'анимацию').start - 0.08, pw(10, 'вручную').start - 0.08];
    for (let tm = MV[2] + 0.5; tm < T.clear - 0.1; tm += 0.5) MV.push(tm);
    const SPC = { r: clamp((C.grab - 0.1 - C.cur) / 0.93, 0.4, 0.9), z: 1 };
    // звуков в финале нет: в ролике 12 звуковых моментов, финал держится на голосе

    // заголовок: «ПЕРЕШЛИ ТОМУ,» / крупное жёлтое «КТО…»
    const s1 = fitSize('ПЕРЕШЛИ ТОМУ,', 680, 84), s2 = Math.min(1.7 * s1, fitSize('КТО…', 680, 150));
    const y1 = 520, y2 = y1 + 0.42 * s1 + 0.74 * s2;
    const w1 = S('g', {}, g), w2 = S('g', {}, g);
    const h1 = headline(w1, 'ПЕРЕШЛИ ТОМУ,', { x: 540, y: y1, size: s1, fill: P.ink, stagger: 0.022 });
    const h2 = headline(w2, 'КТО…', { x: 540, y: y2, size: s2, fill: P.hot, stagger: 0.04 });
    // мини-дорожка: линейка, три ключа «Масштаба», средний тащат
    const MP = { x: 240, y: Math.round(y2 + 140), w: 600, h: 160 }, mcx = MP.x + MP.w / 2, mcy = MP.y + MP.h / 2;
    const mini = S('g', {}, g);
    S('rect', { x: MP.x, y: MP.y, width: MP.w, height: MP.h, rx: 26, fill: P.panel, stroke: P.line, 'stroke-width': 2.5 }, mini);
    let td = '';
    for (let k = 0; k <= 18; k++) td += `M${MP.x + 30 + k * 30} ${MP.y + 50}V${MP.y + 50 - (k % 5 ? 9 : 18)}`;
    S('path', { d: td, stroke: P.mute, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.75 }, mini);
    S('rect', { x: MP.x + 14, y: MP.y + 49, width: MP.w - 28, height: 2, fill: P.line }, mini);
    const ky = MP.y + 104, KX = [mcx - 180, mcx, mcx + 180], kc = P.c[2];
    const seg = S('path', { d: '', fill: 'none', stroke: kc, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.42 }, mini);
    const ks = KX.map(() => key(mini, 20, kc)), kA = ks[1];
    mini.appendChild(kA);
    const rg = ring(mini, P.ink);
    const cur = cursor(mini, P, 2);
    const kxT = track(KX[1], MV.map((tm, i) => [tm, KX[1] + (i % 2 ? -90 : 96), DRAG]), DRAG);

    return t => {
      h1.set(t, C.h1); h2.set(t, C.h2);
      // уход каскадом с T.clear: строка 1, строка 2, сценка; к T.clear + 0.28 (= T.end − 0.17) пусто
      const q0 = gone(t, T.clear), q1 = gone(t, T.clear + 0.05), q2 = gone(t, T.clear + 0.1);
      popAt(w1, 540, y1 - 0.36 * s1, 1 - 0.1 * q0, 1 - q0, -40 * q0);
      popAt(w2, 540, y2 - 0.36 * s2, 1 - 0.1 * q1, 1 - q1, -40 * q1);
      const a = step(t - C.mini, SP.pop);
      popAt(mini, mcx, mcy, t < C.mini ? 0 : lerp(0.85, 1, a) * (1 - 0.1 * q2), popO(t, C.mini) * (1 - q2), (1 - a) * 30 - 40 * q2);
      if (t < C.mini || q2 >= 1) return;
      // ключи; активный: нажатие -> жёлтый -> тянется по ходу движения (скорость -> вытяжение)
      const kx = kxT(t), v = (kx - kxT(t - 1 / 60)) * 60, kv = clamp(Math.abs(v) / 5000, 0, 0.16);
      ks.forEach((kg, i) => { if (kg !== kA) keyPop(kg, KX[i], ky, t, C.mini + 0.12 + i * 0.06); });
      const pr = bump(t, C.grab, 0.2), kq = 0.22 * pr, t0 = C.mini + 0.18;
      if (t < t0) show(kA, 0);
      else {
        const e = step(t - t0, SP.pop), s = lerp(0.35, 1, e) * (1 + 0.14 * after(t, C.grab - 0.16, SP.hl));
        pose(kA, kx, ky, s * (1 + kq + kv), s * (1 - kq - kv), -25 * (1 - e), popO(t, t0));
        kA.paint(mix(kc, P.hot, clamp((t - C.grab) / 0.08)));
      }
      A(seg, 'd', `M${KX[0]} ${ky}H${f2(kx)}M${f2(kx)} ${ky}H${KX[2]}`);
      show(seg, 0.42 * after(t, C.mini + 0.3, SP.fade));
      if (t < C.cur) show(cur, 0);
      else {
        const u = step(t - C.cur, SPC);
        place(cur, bez(1150, 930, KX[1] + 4, u) + (kx - KX[1]), bez(1000, 1030, ky + 6, u), 1 - 0.14 * pr, 1);
      }
      ringAt(rg, KX[1] + 4, ky + 6, t, C.grab);
    };
  };
})();
