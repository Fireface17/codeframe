// Word-locked captions: chunks of 1-4 words that appear with the voice-over.
// Needs core.js and window.WORDS (tools/timing.mjs).
//
//   const caps = makeCaptions(layer, spec, opts);   // after loadFonts(): it measures text
//   caps.frame(t);                                   // in frame(t)
//
// spec: [{ lines: [[token, ...], ...], scale?: 1.25 }, ...]
//   token = [text, wordIndex, style]   wordIndex = index in WORDS.words (the word that lights it)
//   style letters: g b y p v  marker behind the word (green blue yellow pink violet)
//                  r  red text        s  strike-through run (drawn on, then the words go grey)
//                  m  inline code pill (monospace)      c  handwritten font
//                  t  tick + the word's start time under it (shows the sync itself)
// autoCaptions() builds a plain spec from the words when nothing is hand-made.
//
// Rules baked in (each one fixed a real defect):
//   * a chunk leaves BEFORE the next one enters: with motion blur, subframes straddling a
//     crossfade average both chunks into an unreadable double exposure;
//   * words not yet spoken stay readable (opacity ~0.46 ~ 3:1 contrast), not ghost-grey;
//   * the last chunk is held until opts.end (keep the punchline up through the outro).

function autoCaptions({ maxWords = 3, maxChars = 18 } = {}) {
  const ws = window.WORDS.words, spec = [];
  let cur = [], chars = 0;
  const flush = () => { if (cur.length) spec.push({ lines: [cur] }); cur = []; chars = 0; };
  ws.forEach((w, i) => {
    if (cur.length && (cur.length >= maxWords || chars + w.w.length + 1 > maxChars)) flush();
    cur.push([w.w, i]); chars += w.w.length + 1;
    if (/[.!?…:]$/.test(w.w)) flush();                 // a sentence ends a chunk
  });
  flush();
  return spec;
}

function makeCaptions(layer, spec, o = {}) {
  const WD = window.WORDS, Wi = i => WD.words[i];
  // смена порций — ровно между кадрами (полукадр): затвор 180° не захватывает обе порции, двойной экспозиции нет
  const qT = t => (Math.floor(t * FPS) + 0.5) / FPS;
  const opt = {
    x: 120, y: 1128, size: 64, lh: 74, maxW: 660, end: WD.duration,
    font: 'Rubik, sans-serif', weight: 800, mono: '"JetBrains Mono", monospace', hand: "Excali, 'Comic Sans MS', cursive",
    ink: '#1e1e1e', grey: '#9aa0a8', red: '#ce423a', code: '#0a0c10', codeFg: '#f0f3f6', tick: '#7c5cf0', dim: 0.46,
    marks: { g: '#bff0c0', b: '#afd7fb', y: '#fceda3', p: '#f7cbca', v: '#cdc0fa' },
    anchor: 'start',                                  // 'middle': centre every line on opt.x
    valign: 'top',                                    // 'top': opt.y = first baseline, extra lines go down;
                                                      // 'bottom': opt.y = last baseline, extra lines go up
    ...o,
  };
  const meas = S('text', { visibility: 'hidden' }, layer);
  const width = (s, font, size, weight) => { A(meas, 'font-family', font); A(meas, 'font-size', size); A(meas, 'font-weight', weight); meas.textContent = s; return meas.getComputedTextLength(); };
  // пробел — фиксированный отступ ≥ 0,28 em: при проявлении слова его ширина не меняется (претензия к №6 v1: «хваталоодного»)
  const space = Math.max(width('a a', opt.font, opt.size, opt.weight) - 2 * width('a', opt.font, opt.size, opt.weight), 0.28 * opt.size);
  const chunks = spec.map(ch => {
    const g = S('g', {}, layer), k = ch.scale || 1;
    const flat = [];
    ch.lines.forEach((ln, li) => ln.forEach((tk, j) => flat.push({ tk, br: li > 0 && j === 0 })));
    let x = 0, row = 0;
    const toks = [];
    flat.forEach(({ tk: [str, wi, st = ''], br }) => {
      const mono = st.includes('m'), hand = st.includes('c');
      const font = mono ? opt.mono : hand ? opt.hand : opt.font;
      const size = k * (mono ? opt.size * 0.86 : hand ? opt.size * 1.12 : opt.size), weight = mono ? 700 : hand ? 400 : opt.weight;
      const w = width(str, font, size, weight) + (mono ? 0.44 * opt.size : 0);
      if ((br || x + w > opt.maxW) && x > 0) { x = 0; row++; }
      toks.push({ str, wi, st, font, size, weight, w, x, row, mono, hand });
      x += w + space * k;
    });
    // centring: shift each row by half its width
    if (opt.anchor === 'middle') {
      const rows = {};
      toks.forEach(t => { rows[t.row] = Math.max(rows[t.row] || 0, t.x + t.w); });
      toks.forEach(t => { t.x -= rows[t.row] / 2; });
    }
    const rows = Math.max(...toks.map(t => t.row)) + 1;
    const top = opt.valign === 'bottom' ? opt.y - (rows - 1) * opt.lh * k : opt.y - (k > 1 ? (k - 1) * opt.lh * 0.6 : 0);
    let plateDim = null;
    if (opt.plate) {
      // размер бумажной плашки под фразой (сама плашка — одна на все порции, см. ниже)
      const wmax = Math.max(...toks.map(t => t.x + t.w)), px = 22;
      plateDim = { x0: opt.x - px, y0: top - 0.86 * opt.size, w: wmax + 2 * px, h: (rows - 1) * opt.lh * k + 1.24 * opt.size };
    }
    const words = toks.map(t => {
      const y = top + t.row * opt.lh * k, gx0 = opt.x + t.x, tg = S('g', {}, g);
      let mark = null, tick = null;
      const mk = t.st.match(/[gbypv]/);
      if (mk) mark = S('rect', { x: gx0 - 7, y: y - 0.5 * t.size, width: 0, height: 0.62 * t.size, rx: 8, fill: opt.marks[mk[0]] }, tg);
      if (t.mono) S('rect', { x: gx0, y: y - 0.74 * t.size, width: t.w, height: 0.98 * t.size, rx: 12, fill: opt.code }, tg);
      const el = S('text', { x: gx0 + (t.mono ? 0.22 * opt.size : 0), y, 'font-family': t.font, 'font-weight': t.weight, 'font-size': t.size, fill: t.mono ? opt.codeFg : t.st.includes('r') ? opt.red : opt.ink }, tg);
      el.textContent = t.str;
      if (t.st.includes('t')) {
        tick = S('g', {}, tg);
        S('path', { d: `M${gx0} ${y + 14} H${gx0 + t.w}`, stroke: opt.tick, 'stroke-width': 3, 'stroke-linecap': 'round' }, tick);
        S('text', { x: gx0, y: y + 36, 'font-family': opt.mono, 'font-size': 20, fill: opt.tick }, tick).textContent = Wi(t.wi).start.toFixed(2) + 's';
      }
      return { ...t, g: tg, el, mark, tick, gx0, y };
    });
    const struck = words.filter(w => w.st.includes('s'));
    let strike = null;
    if (struck.length) {
      const a = struck[0], b = struck[struck.length - 1], y = a.y - 0.3 * a.size;
      strike = drawStroke(g, roughD(`M${a.gx0 - 10} ${y + 4} L${b.gx0 + b.w + 8} ${y - 6}`, { seed: 71, roughness: 0.7, disableMultiStroke: true }), { stroke: opt.red, 'stroke-width': 7 });
      strike.t0 = Wi(b.wi).start + 0.1;
    }
    return { g, words, strike, plate: plateDim, t0: qT(Wi(ch.lines[0][0][1]).start - 0.06), endAt: ch.end === undefined ? undefined : qT(ch.end) };
  });
  // ch.end: порция уходит раньше следующей (перед цитатой, где субтитры выключены — карточка сама и есть субтитр)
  chunks.forEach((c, k) => { c.t1 = c.endAt ?? (k + 1 < chunks.length ? chunks[k + 1].t0 : opt.end - 0.03); c.last = k === chunks.length - 1 || c.endAt !== undefined; });
  // порция сразу за предыдущей (зазор < 0,5 с) меняет её мгновенно: без пустой плашки между ними
  chunks.forEach((c, k) => { const pv = k > 0 ? chunks[k - 1] : null; c.cont = !!(pv && !pv.last && c.t0 - pv.t1 < 0.5); });
  chunks.forEach((c, k) => { const nx = chunks[k + 1]; c.handoff = !!(nx && nx.cont); });
  meas.remove();
  // одна плашка на весь ролик: держится между порциями (не мигает), меняет ширину за 0,12 с
  let plateG = null, plateR = null, plateS = null;
  if (opt.plate) {
    plateG = S('g', {}, layer); layer.insertBefore(plateG, layer.firstChild);
    plateS = S('path', { fill: '#3B2D1D', opacity: 0.1 }, plateG);
    plateR = S('path', { fill: '#FBFAF6', stroke: '#D9D2C4', 'stroke-width': 1.5 }, plateG);
  }
  function plateFrame(t) {
    if (!plateG) return;
    let ci = chunks.findIndex(c => t >= c.t0 - 0.001 && t < c.t1);
    let dim = null, o = 0;
    if (ci >= 0) {
      const c = chunks[ci];
      dim = c.plate;                                              // плашка меняется вместе с текстом, мгновенно
      o = c.cont ? 1 : step(t - c.t0, SP.out);                    // после паузы — проявляется вместе с текстом
      if (!c.handoff) o *= 1 - ease.out((t - (c.t1 - 0.2)) / 0.17); // перед паузой — гаснет вместе с текстом
    }
    if (!dim) { A(plateG, 'visibility', 'hidden'); return; }
    A(plateG, 'visibility', o > 0.002 ? 'visible' : 'hidden'); A(plateG, 'opacity', f2(o));
    A(plateR, 'd', rr(dim.x0, dim.y0, dim.w, dim.h, 6)); A(plateS, 'd', rr(dim.x0 + 4, dim.y0 + 7, dim.w, dim.h, 6));
  }

  function frame(t) {
    plateFrame(t);
    for (const c of chunks) {
      if (t < c.t0 - 0.001 || t >= c.t1) { A(c.g, 'display', 'none'); continue; }
      A(c.g, 'display', 'inline');
      // после паузы: подъём + проявление вместе с плашкой; перед паузой: гаснет вместе с плашкой; между порциями — мгновенная смена
      const a = c.cont ? 1 : step(t - c.t0, SP.out);
      const out = c.handoff ? 0 : ease.out((t - (c.t1 - 0.2)) / 0.17);
      A(c.g, 'transform', a < 0.999 || out > 0 ? `translate(0 ${f2((1 - a) * 16)})` : '');
      A(c.g, 'opacity', f2(a * (1 - out)));
      const st = c.strike ? prog(t, c.strike.t0, 0.3) : 0;
      for (const w of c.words) {
        const ws = Wi(w.wi).start - 0.03, on = t >= ws ? step(t - ws, SP.out) : 0;
        A(w.el, 'opacity', f2(lerp(opt.dim, 1, on)));
        if (!w.mono && !w.st.includes('r')) A(w.el, 'fill', w.st.includes('s') ? mix(opt.ink, opt.grey, st) : opt.ink);
        // без «подскока» масштабом: увеличенное слово съедало пробел — меняется только яркость
        if (w.mark) A(w.mark, 'width', f2((w.w + 14) * prog(t, ws, 0.24, ease.out)));
        if (w.tick) show(w.tick, t >= ws ? step(t - ws, SP.fade) : 0);
      }
      if (c.strike) c.strike.draw(st);
    }
  }
  return { chunks, frame };
}
