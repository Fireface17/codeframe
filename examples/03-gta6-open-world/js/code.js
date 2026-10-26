// Code in the frame, as pure functions of time. Same rules as core.js:
// nothing is carried between frames, seek(t) recomputes every attribute from t alone.
// Needs core.js (S, A, f2, place, step, SP, track, clamp, lerp, mix).
// Tokens come from tools/tokens.mjs (Shiki runs offline in Node, never in the browser):
//   window.CODE_DATA[snippet] = { code, lines, atoms: [[{t, c, f, col, k?}]], bg, fg }

const MONO = '"JetBrains Mono", Menlo, monospace';
const CW = 0.6;                    // advance of JetBrains Mono, em (fontTools: every glyph is 600 of 1000 units)
const LH = 1.5;                    // line height, em
Object.assign(SP, {
  code: { r: 0.62, z: 1 },         // matched tokens travel to their new place (no overshoot: no collisions)
  zin: { r: 0.7, z: 1 },           // camera pushes in on a line
  zout: { r: 0.42, z: 1 },         // ... and comes back
});

// ------------------------------------------------------------------ deterministic helpers
// integer hash -> [0, 1). The "randomness" of the typing rhythm: same on every run, for any call order.
function hash01(i, seed = 0) {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ layout
// Shiki atoms -> pixel grid. x = x0 + col * 0.6em, baseline y = y0 + line * 1.5em; off = char offset in the source.
function layoutAtoms(data, { x0, y0, size }) {
  const cw = CW * size, L = LH * size, starts = [];
  let o = 0;
  for (const l of data.lines) { starts.push(o); o += l.length + 1; }
  const out = [];
  data.atoms.forEach((line, li) => line.forEach(a => out.push({
    t: a.t, c: a.c, f: a.f || 0, k: a.k, line: li, col: a.col, off: starts[li] + a.col, x: x0 + a.col * cw, y: y0 + li * L,
  })));
  return out;
}

// ------------------------------------------------------------------ diff (token morph plan)
const akey = a => a.t + '\u0001' + a.c + '\u0001' + a.f;
// Longest common subsequence of tokens. Ties go to the pair that moves least, so duplicates (t, (, ,) keep their neighbours.
// ok(a, b) can veto a pair (used to keep punctuation from flying across lines).
function lcsPairs(A, B, ok = () => true) {
  const n = A.length, m = B.length;
  const eps = 1 / (4 * (n + 1) * (m + 1) * 1000);   // total distance penalty stays < 1: the count of matches always wins
  const d = (a, b) => (Math.abs(a.line - b.line) * 40 + Math.abs(a.col - b.col));
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const ch = Array.from({ length: n }, () => new Int8Array(m));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    let best = dp[i + 1][j], c = 0;
    if (dp[i][j + 1] > best) { best = dp[i][j + 1]; c = 1; }
    if (akey(A[i]) === akey(B[j]) && ok(A[i], B[j])) { const v = dp[i + 1][j + 1] + 1 - eps * d(A[i], B[j]); if (v > best) { best = v; c = 2; } }
    dp[i][j] = best; ch[i][j] = c;
  }
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    const c = ch[i][j];
    if (c === 2) { pairs.push([i, j]); i++; j++; } else if (c === 0) i++; else j++;
  }
  return pairs;
}
// words (identifiers, numbers, strings) may travel anywhere; punctuation only between lines that words already link
const isWord = a => /[\p{L}\p{N}_$]/u.test(a.t);
function matchTokens(LA, LB, lineGate = true) {
  const supported = new Set();
  const wa = LA.map((a, i) => i).filter(i => isWord(LA[i])), wb = LB.map((b, j) => j).filter(j => isWord(LB[j]));
  for (const [i, j] of lcsPairs(wa.map(i => LA[i]), wb.map(j => LB[j]))) supported.add(LA[wa[i]].line + ':' + LB[wb[j]].line);
  const pairs = lineGate ? lcsPairs(LA, LB, (a, b) => isWord(a) || supported.has(a.line + ':' + b.line)) : lcsPairs(LA, LB);
  return { pairs, supported };
}
// identifier rename inside a replaced pair: pop -> popS keeps "pop" and only adds "S"
const IDENT = /^[\p{L}_$][\p{L}\p{N}_$]*$/u;
function renameSplit(a, b) {
  if (a.c !== b.c || a.f !== b.f || !IDENT.test(a.t) || !IDENT.test(b.t)) return null;
  const la = a.t.length, lb = b.t.length, mn = Math.min(la, lb);
  let p = 0; while (p < mn && a.t[p] === b.t[p]) p++;
  let s = 0; while (s < mn - p && a.t[la - 1 - s] === b.t[lb - 1 - s]) s++;
  return p + s >= Math.max(2, Math.ceil(mn / 2)) ? { p, s } : null;
}
// Elements of the morph: one per <text>. kind 'move' lives in both versions (A -> B), 'out' only in A, 'in' only in B,
// 'swap' = a token replaced by another one in the same place: both texts travel together and cross-fade.
const near = (a, b) => Math.abs(a.line - b.line) <= 1 && Math.abs(a.col - b.col) <= 16;
function morphPlan(LA, LB, size, lineGate = true) {
  const cw = CW * size, { pairs, supported } = matchTokens(LA, LB, lineGate), els = [];
  // oa / ob = char offset of the piece inside the A / B atom
  const mv = (a, b, t, oa, ob) => els.push({ t, c: a.c, f: a.f, kind: 'move', ax: a.x + oa * cw, ay: a.y, bx: b.x + ob * cw, by: b.y, la: a.line, lb: b.line, cb: b.col + ob, aoff: a.off + oa });
  const out = (a, t, oa) => els.push({ t, c: a.c, f: a.f, kind: 'out', ax: a.x + oa * cw, ay: a.y, bx: a.x + oa * cw, by: a.y, la: a.line, lb: a.line, cb: a.col + oa, aoff: a.off + oa });
  const inn = (b, t, ob) => els.push({ t, c: b.c, f: b.f, kind: 'in', ax: b.x + ob * cw, ay: b.y, bx: b.x + ob * cw, by: b.y, la: b.line, lb: b.line, cb: b.col + ob, aoff: -1 });
  const swp = (a, b, t0, t, oa, ob) => els.push({ t, t0, c: b.c, c0: a.c, f: b.f, f0: a.f, kind: 'swap', ax: a.x + oa * cw, ay: a.y, bx: b.x + ob * cw, by: b.y, la: a.line, lb: b.line, cb: b.col + ob, aoff: a.off + oa });
  // a replaced token and its replacement: same kind, close, and (punctuation) on lines that words already link
  const swappable = (a, b) => isWord(a) === isWord(b) && near(a, b) && (isWord(a) || supported.has(a.line + ':' + b.line));
  let ia = 0, ib = 0;
  const gap = (ea, eb) => {                                   // unmatched A[ia..ea) and B[ib..eb) sit between two anchors
    let jb = ib;
    const restA = [], restB = [];
    for (let i = ia; i < ea; i++) {
      let hit = null;
      for (let j = jb; j < eb && !hit; j++) { const r = renameSplit(LA[i], LB[j]); if (r) hit = { j, r }; }
      if (!hit) { restA.push(i); continue; }
      for (let j = jb; j < hit.j; j++) restB.push(j);          // B atoms skipped before the rename pair are new
      const a = LA[i], b = LB[hit.j], { p, s } = hit.r, la = a.t.length, lb = b.t.length;
      if (p) mv(a, b, a.t.slice(0, p), 0, 0);
      if (s) mv(a, b, a.t.slice(la - s), la - s, lb - s);
      if (la - s > p && lb - s > p) swp(a, b, a.t.slice(p, la - s), b.t.slice(p, lb - s), p, p);
      else if (la - s > p) out(a, a.t.slice(p, la - s), p);
      else if (lb - s > p) inn(b, b.t.slice(p, lb - s), p);
      jb = hit.j + 1;
    }
    for (let j = jb; j < eb; j++) restB.push(j);
    let pj = 0;                                                // what is left: replaced in the same place (same kind, close) -> swap
    for (const i of restA) {
      let hit = -1;
      for (let q = pj; q < restB.length && hit < 0; q++) if (swappable(LA[i], LB[restB[q]])) hit = q;
      if (hit < 0) { out(LA[i], LA[i].t, 0); continue; }
      for (let q = pj; q < hit; q++) inn(LB[restB[q]], LB[restB[q]].t, 0);
      swp(LA[i], LB[restB[hit]], LA[i].t, LB[restB[hit]].t, 0, 0);
      pj = hit + 1;
    }
    for (let q = pj; q < restB.length; q++) inn(LB[restB[q]], LB[restB[q]].t, 0);
  };
  for (const [pa, pb] of pairs) { gap(pa, pb); mv(LA[pa], LB[pb], LA[pa].t, 0, 0); ia = pa + 1; ib = pb + 1; }
  gap(LA.length, LB.length);
  return els;
}
// the morph in numbers: out fades first, matched tokens travel, new tokens come in last; the delay steps by row.
// (a per-column delay was measured: it makes tokens of one row run into each other, so col stays 0)
const MORPH = { move: 0.10, out: 0, in: 0.62, row: 0.045, col: 0, lift: 0.14, xf: 0.05 };
SP.xf = { r: 0.34, z: 1 };        // cross-fade of a replaced token
// at u >= dur the exact end state (a spring never quite arrives: 0.5 % of opacity would stay behind on the last rows)
function morphEl(e, u, size, M, fin) {
  const st = (x, sp) => (fin ? 1 : step(x, sp)), row = l => M.row * Math.min(l, 5);     // row delay saturates: 8 lines still fit
  if (e.kind === 'move' || e.kind === 'swap') {
    const d = M.move + row(e.lb) + M.col * e.cb, p = st(u - d, SP.code);
    e.sx = lerp(e.ax, e.bx, p); e.sy = lerp(e.ay, e.by, p); e.so = 1;
    if (e.kind === 'swap') { const q = st(u - d - M.xf, SP.xf); e.qo = 1 - q; e.qn = q; }
  } else if (e.kind === 'out') {
    const q = st(u - M.out - row(e.la) * 0.5, SP.out);
    e.sx = e.ax; e.sy = e.ay - q * M.lift * size; e.so = 1 - q;
  } else {
    const q = st(u - M.in - row(e.lb) - M.col * e.cb, SP.fade);
    e.sx = e.bx; e.sy = e.by + (1 - q) * M.lift * size; e.so = q;
  }
}

// ------------------------------------------------------------------ typewriter
// Time (s) at which each character of src appears. Human rhythm without Math.random: jitter from the hash of the index,
// longer pauses after , ; ( { and spaces and at line breaks, auto-indent is almost free. Scaled to fill [t0, t1] exactly.
function typeSchedule(src, t0, t1, seed = 1) {
  const n = src.length, cum = new Float64Array(n);
  let acc = 0, lead = true;
  for (let i = 0; i < n; i++) {
    const c = src[i], p = i ? src[i - 1] : '\n';
    let w = 0.55 + 0.9 * hash01(i, seed);
    if (c === '\n') { w += 0.8; lead = true; }
    else if (lead && c === ' ') w = 0.05;
    else {
      if (lead) { w += 2.4; lead = false; }
      if (p === ',') w += 1.5; else if (p === ';') w += 1.1; else if (p === '(' || p === '{' || p === '[') w += 0.9; else if (p === ' ') w += 0.5;
    }
    acc += w; cum[i] = acc;
  }
  const T = new Float64Array(n);
  for (let i = 0; i < n; i++) T[i] = t0 + (t1 - t0) * cum[i] / acc;
  return T;
}
// how many characters are on screen at t (binary search over the schedule)
function typeCount(T, t) {
  let lo = 0, hi = T.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (T[mid] <= t) lo = mid + 1; else hi = mid; }
  return lo;
}
// caret cell after n typed characters
function caretCells(src) {
  const line = new Int32Array(src.length + 1), col = new Int32Array(src.length + 1);
  for (let i = 0, l = 0, c = 0; i <= src.length; i++) { line[i] = l; col[i] = c; if (src[i] === '\n') { l++; c = 0; } else c++; }
  return { line, col };
}
// blink: solid while typing (and 0.35 s after the last key), then 530 ms on / 530 ms off with soft edges
function caretBlink(t, tLast) {
  const x = (t - tLast - 0.35) / 1.06;
  if (x < 0) return 1;
  const ph = x - Math.floor(x);
  return clamp(0.5 + (0.25 - Math.abs(ph - 0.25)) / 0.07);
}

// ------------------------------------------------------------------ scene
// One scene = one <g> (the camera) with a <text> per token, a highlight band, a caret. All of it is evaluated from t.
//   cfg: { from, to, x0, y0, size,            (from/to = CODE_DATA entries; no `to` = a static or typed block)
//          type: {t0, t1, seed}, hl: [{line, t0, t1}], dim, zoom: {t0, t1, s, line}, morph: {t0, dur, M} }
//   scene.eval(t) = all the maths (no DOM), scene.apply() = cached DOM writes, scene.seek(t) = both.
function codeScene(parent, cfg) {
  const { from: DA, to: DB = null, x0, y0, size } = cfg, cw = CW * size, L = LH * size;
  const LA = layoutAtoms(DA, { x0, y0, size });
  const els = DB
    ? morphPlan(LA, layoutAtoms(DB, { x0, y0, size }), size, cfg.lineGate !== false)
    : LA.map(a => ({ t: a.t, c: a.c, f: a.f, kind: 'still', ax: a.x, ay: a.y, bx: a.x, by: a.y, la: a.line, lb: a.line, cb: a.col, aoff: a.off }));
  const cam = S('g', {}, parent);
  const maxLen = Math.max(...DA.lines.map(l => l.length), ...(DB ? DB.lines.map(l => l.length) : [0]));
  const bandX = x0 - 0.7 * cw, bandW = (maxLen + 1.4) * cw;
  // highlight bands sit under the code
  const hl = (cfg.hl || []).map(h => {
    const g = S('g', {}, cam);
    const band = S('rect', { x: bandX, y: y0 + h.line * L - 1.11 * size, width: 0, height: L, rx: 0.12 * size, fill: mix(DA.bg, '#ffffff', 0.11) }, g);
    const bar = S('rect', { x: bandX, y: y0 + h.line * L - 1.11 * size + 0.12 * L, width: 0.12 * cw * 2, height: 0.76 * L, rx: 2, fill: DA.atoms[0][0].c }, g);
    return { ...h, band, bar };
  });
  const code = S('g', { style: 'white-space:pre;font-variant-ligatures:none;font-kerning:none', 'font-family': MONO, 'font-size': size }, cam);
  const mkText = (parent, str, fill, f) => {
    const el = S('text', { fill }, parent);
    if (f & 1) el.setAttribute('font-style', 'italic');
    if (f & 2) el.setAttribute('font-weight', '700');
    el.textContent = str; el._tx = str;
    return el;
  };
  els.forEach(e => {
    if (e.kind === 'swap') { e.el = S('g', {}, code); e.eo = mkText(e.el, e.t0, e.c0, e.f0); e.en = mkText(e.el, e.t, e.c, e.f); e.qo = 1; e.qn = 0; }
    else e.el = mkText(code, e.t, e.c, e.f);
  });
  // typewriter + caret
  const ty = cfg.type, srcA = DA.code;
  const T = ty ? typeSchedule(srcA, ty.t0, ty.t1, ty.seed || 1) : null;
  const cells = caretCells(srcA);
  const caret = S('rect', { width: Math.max(3, 0.11 * size), height: 1.05 * size, rx: 1, fill: DA.fg }, cam);
  const M = { ...MORPH, ...((cfg.morph && cfg.morph.M) || {}) };
  const dimTo = cfg.dim === undefined ? 0.35 : cfg.dim;
  const zoom = cfg.zoom;
  const zline = zoom ? zoom.line : 0;
  const lineAtoms = DA.atoms[zline] || [];
  const zc0 = lineAtoms.length ? lineAtoms[0].col : 0, zc1 = lineAtoms.length ? lineAtoms[lineAtoms.length - 1].col + lineAtoms[lineAtoms.length - 1].t.length : 0;
  const zx = x0 + (zc0 + zc1) / 2 * cw, zy = y0 + zline * L - 0.36 * size;
  const camTrack = zoom ? track(1, [[zoom.t0, zoom.s, SP.zin], [zoom.t1, 1, SP.zout]]) : null;
  const tCaretOff = Math.min(hl.length ? hl[0].t0 : Infinity, cfg.morph ? cfg.morph.t0 : Infinity);   // the caret leaves once and stays away
  const sc = { g: cam, els, hl, caretEl: caret, T, M, size, cw, L, x0, y0, bandW };

  // ---- the pure part: every number of the frame from t
  sc.eval = t => {
    const n = T ? typeCount(T, t) : 1e9;
    const u = cfg.morph ? t - cfg.morph.t0 : -1;
    // highlight activation 0..1 per segment (grows with SP.hl, leaves with SP.out), dim of every other line
    const on = hl.map(h => clamp(step(t - h.t0, SP.hl)) * (1 - step(t - h.t1, SP.out)));
    sc.on = on;
    const lineDim = li => { let d = 0; hl.forEach((h, k) => { if (h.line !== li) d = Math.max(d, on[k]); }); return 1 - (1 - dimTo) * d; };
    for (const e of els) {
      if (cfg.morph) morphEl(e, u, size, M, u >= cfg.morph.dur); else { e.sx = e.ax; e.sy = e.ay; e.so = 1; }
      const full = e.kind === 'swap' ? e.t0 : e.t, k = e.aoff < 0 ? full.length : clamp(n - e.aoff, 0, full.length);
      e.stx = k >= full.length ? full : full.slice(0, k);
      if (e.kind === 'swap') { if (!e.stx) e.qo = 0; if (e.qo < 0.002 && e.qn < 0.002) e.so = 0; }
      else if (!e.stx) e.so = 0;
      e.so *= lineDim(e.kind === 'in' ? e.lb : e.la);
      e.eff = e.kind === 'swap' ? e.so * Math.max(e.qo, e.qn) : e.so;               // for analysis: how visible is this element
      e.wch = e.kind === 'swap' ? Math.max(e.qo >= 0.15 ? e.stx.length : 0, e.qn >= 0.15 ? e.t.length : 0) : e.stx.length;   // ... and how wide, in cells
    }
    // caret: blinks from t = 0, solid while typing, leaves with the highlight and with the morph
    const cl = Math.min(n, srcA.length);
    const tLast = T && n > 0 ? T[Math.min(n, T.length) - 1] : -0.35;
    const gone = step(t - tCaretOff, SP.out);
    sc.cs = {
      x: x0 + cells.col[cl] * cw - 0.055 * size, y: y0 + cells.line[cl] * L - 0.86 * size,
      o: T ? caretBlink(t, tLast) * (1 - gone) : 0,
    };
    // camera: scale s about the centre of the zoomed line (a spring track, see core.js track())
    const s = camTrack ? camTrack(t) : 1;
    sc.cam = { s, x: zx, y: zy };
    return sc;
  };
  // ---- the DOM part: cached writes only
  sc.apply = () => {
    for (const e of els) {
      place(e.el, e.sx, e.sy, 1, e.so);
      if (e.kind === 'swap') {
        A(e.eo, 'opacity', f2(e.qo)); A(e.eo, 'visibility', e.qo > 0.002 ? 'visible' : 'hidden'); setText(e.eo, e.stx);
        A(e.en, 'opacity', f2(e.qn)); A(e.en, 'visibility', e.qn > 0.002 ? 'visible' : 'hidden');
      } else setText(e.el, e.stx);
    }
    hl.forEach((h, k) => {
      const o = sc.on[k];
      A(h.band, 'width', f2(bandW * o)); A(h.bar, 'visibility', o > 0.01 ? 'visible' : 'hidden');
      A(h.band, 'visibility', o > 0.01 ? 'visible' : 'hidden');
      A(h.bar, 'opacity', f2(clamp(o)));
    });
    const c = sc.cs;
    A(caret, 'x', f2(c.x)); A(caret, 'y', f2(c.y)); A(caret, 'opacity', f2(c.o)); A(caret, 'visibility', c.o > 0.002 ? 'visible' : 'hidden');
    const cm = sc.cam;
    A(cam, 'transform', `translate(${f2(cm.x)} ${f2(cm.y)}) scale(${f2(cm.s)}) translate(${f2(-cm.x)} ${f2(-cm.y)})`);
  };
  sc.seek = t => { sc.eval(t); sc.apply(); };
  return sc;
}
