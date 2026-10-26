// code-motion core: every frame is a pure function of time.
// Nothing is carried between frames; seek(t) recomputes every attribute from t
// alone, so the preview, a still, a scrub backwards and the offline render (in
// parallel chunks) all produce the same pixels for the same t.
//
// The page sets its frame before this script: window.FRAME = { W, H, FPS }.
// Needs js/vendor/rough.js (rough.js IIFE build) for hand-drawn strokes.

const { W = 1920, H = 1080, FPS = 60 } = window.FRAME || {};
window.FRAME = { W, H, FPS };

// ------------------------------------------------------------------ math
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const lerp = (a, b, t) => a + (b - a) * t;
const lerpV = (A, B, t) => A.map((v, i) => lerp(v, B[i], t));
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb = c => `rgb(${c.map(v => Math.round(clamp(v, 0, 255))).join(',')})`;
const mix = (a, b, t) => rgb(lerpV(hex(a), hex(b), clamp(t)));
const ease = {
  inOut: t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  out: t => { t = clamp(t); return 1 - Math.pow(1 - t, 3); },
  sine: t => { t = clamp(t); return 0.5 - 0.5 * Math.cos(Math.PI * t); },
  in4: t => { t = clamp(t); return t * t * t * t; },                        // power4.in: exits
  out4: t => { t = clamp(t); return 1 - Math.pow(1 - t, 4); },              // power4.out: entries
  outExpo: t => { t = clamp(t); return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
};
// progress of t through [t0, t0 + d] with an easing (exactly 0 before, exactly 1 after)
const prog = (t, t0, d, e = ease.inOut) => e((t - t0) / d);

// integer hash -> [0, 1): deterministic "randomness" (never Math.random in a frame)
function hash01(i, seed = 0) {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ springs
// Closed-form step response of a damped spring from 0 to 1, at rest at both ends:
// zero velocity at the start, so nothing ever jumps into motion, and no state
// is integrated frame to frame. r = response (undamped period, s), z = damping
// ratio: z < 1 overshoots (z 0.62 ~ 8 %, 0.72 ~ 4 %, 0.45 ~ 20 %), z = 1 lands softly.
const SP = {
  pop:   { r: 0.46, z: 0.62 },   // ~8 % overshoot, settles ~0.5 s: things appearing
  popS:  { r: 0.40, z: 0.72 },   // ~4 %: small things (badges, labels)
  hl:    { r: 0.42, z: 0.75 },   // highlight / emphasis scale
  hop:   { r: 0.34, z: 0.55 },   // landing bounce
  snap:  { r: 0.30, z: 0.85 },   // UI-like snap, almost no overshoot
  fade:  { r: 0.40, z: 1 },      // opacity in
  out:   { r: 0.26, z: 1 },      // opacity out (quick)
  dim:   { r: 0.55, z: 1 },
  move:  { r: 1.05, z: 1 },      // layout moves: soft start, soft landing (~0.9 s)
  tuck:  { r: 0.80, z: 1 },      // quicker move
  cam:   { r: 4.5, z: 1 },       // very slow camera drift
};
function step(t, sp) {
  if (t <= 0) return 0;
  const w0 = 2 * Math.PI / sp.r, z = sp.z;
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z), e = Math.exp(-z * w0 * t);
    return 1 - e * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}
const after = (t, t0, sp = SP.fade) => step(t - t0, sp);
// enter at tin, leave at tout
function vis(t, tin, tout = Infinity, si = SP.fade, so = SP.out) {
  if (t < tin) return 0;
  const a = step(t - tin, si);
  if (t < tout) return a;
  return step(tout - tin, si) * (1 - step(t - tout, so));
}
// A value whose target changes many times = start + one spring per change.
// events: [[t, value, spring?], ...] (sorted by time internally)
function track(v0, events, def = SP.move) {
  const E = events.map(e => ({ t: e[0], v: e[1], sp: e[2] || def })).sort((a, b) => a.t - b.t);
  let prev = v0;
  const D = E.map(e => { const d = e.v - prev; prev = e.v; return d; });
  return t => {
    let x = v0;
    for (let i = 0; i < E.length; i++) { if (t <= E[i].t) break; x += D[i] * step(t - E[i].t, E[i].sp); }
    return x;
  };
}
// pop-in pair: scale from 0.35 with the spring's overshoot, opacity a little faster
const popS = (t, t0, sp = SP.pop) => (t < t0 ? 0 : lerp(0.35, 1, step(t - t0, sp)));
const popO = (t, t0) => (t < t0 ? 0 : step(t - t0, SP.out));
// volume-preserving squash (k > 0) / stretch (k < 0)
const squash = (s, k) => ({ sx: s * (1 + k), sy: s * (1 - k) });

// ------------------------------------------------------------------ cues from the voice-over
// window.WORDS = { duration, phrases: [{ i, start, end, text }], words: [{ w, start, end }] }
// (written by tools/timing.mjs). Anchor every cue to a word, never to a bare second:
// a new voice-over then retimes the whole film by itself.
const _norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
function word(text, n = 1) {
  const WD = window.WORDS, key = _norm(text);
  let k = 0;
  for (let i = 0; i < WD.words.length; i++) if (_norm(WD.words[i].w) === key && ++k === n) return { ...WD.words[i], i };
  console.error('cue word not found:', text, n, '(count repeats: word("и", 2) is the second «и»)');
  return { start: 0, end: 0, i: 0 };
}
const phrase = i => window.WORDS.phrases[i - 1];
// the n-th word of phrase i that starts with `text`: pw(3, 'кадр').start. Searches only inside phrase i, so a word
// that already appeared earlier in the film cannot steal the cue (safer than word() for short, repeated words)
function pw(i, text, n = 1) {
  const WD = window.WORDS, ph = phrase(i), key = _norm(text);
  let k = 0;
  if (ph) for (let j = 0; j < WD.words.length; j++) {
    const w = WD.words[j];
    if (w.start < ph.start - 0.01 || w.start > ph.end + 0.01) continue;
    if (_norm(w.w).startsWith(key) && ++k === n) return { ...w, i: j };
  }
  console.error('cue word not found in phrase:', text, n, 'phrase', i);
  return { start: ph ? ph.start : 0, end: ph ? ph.start : 0, i: 0 };
}

// ------------------------------------------------------------------ svg
const NS = 'http://www.w3.org/2000/svg';
function S(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
// cached attribute writes: only touch the DOM when a value changes
function A(e, k, v) { if (e['_' + k] !== v) { e.setAttribute(k, v); e['_' + k] = v; } }
function setText(e, s) { if (e._tx !== s) { e.textContent = s; e._tx = s; } }
const f2 = n => (Math.abs(n) < 1e-4 ? 0 : n).toFixed(3);
// opacity + visibility together (hidden elements cost nothing to paint)
function show(e, o) { A(e, 'opacity', o >= 0.999 ? '1' : f2(clamp(o))); A(e, 'visibility', o <= 0.002 ? 'hidden' : 'visible'); }
// place a group: (x, y) = where its local origin goes, uniform scale s about it
function place(g, x, y, s = 1, o = 1) {
  A(g, 'transform', `translate(${f2(x)} ${f2(y)}) scale(${f2(Math.max(s, 1e-4))})`);
  A(g, 'opacity', o >= 0.999 ? '1' : f2(clamp(o)));
  A(g, 'visibility', o <= 0.002 || s <= 0.002 ? 'hidden' : 'visible');
}
// translate + anisotropic scale + rotation (deg) about the local origin
function pose(g, x, y, sx, sy = sx, rot = 0, o = 1) {
  A(g, 'transform', `translate(${f2(x)} ${f2(y)})${rot ? ` rotate(${f2(rot)})` : ''} scale(${f2(Math.max(sx, 1e-4))} ${f2(Math.max(sy, 1e-4))})`);
  A(g, 'opacity', o >= 0.999 ? '1' : f2(clamp(o)));
  A(g, 'visibility', o <= 0.002 || sx <= 0.002 ? 'hidden' : 'visible');
}
// scale a group about a point (cx, cy) in its parent's units, with an optional rise dy
function popAt(g, cx, cy, s, o, dy = 0) {
  A(g, 'transform', `translate(${f2(cx)} ${f2(cy + dy)}) scale(${f2(Math.max(s, 1e-4))}) translate(${f2(-cx)} ${f2(-cy)})`);
  A(g, 'opacity', o >= 0.999 ? '1' : f2(clamp(o)));
  A(g, 'visibility', o <= 0.002 || s <= 0.002 ? 'hidden' : 'visible');
}
// fade + small rise (text entering)
function rise(e, a, dy = 10) { A(e, 'opacity', f2(a)); A(e, 'transform', `translate(0 ${f2((1 - a) * dy)})`); A(e, 'visibility', a <= 0.002 ? 'hidden' : 'visible'); }
// blend two poses {x, y, sx, sy, rot}; chain shots with mixPose(prev, next, after(t, T.shotN, SP.move))
const mixPose = (a, b, m) => ({ x: lerp(a.x, b.x, m), y: lerp(a.y, b.y, m), sx: lerp(a.sx, b.sx, m), sy: lerp(a.sy, b.sy, m), rot: lerp(a.rot || 0, b.rot || 0, m) });

// rounded rectangle path
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}` +
    `H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}
// the two halves of a rounded rectangle, from top centre down both sides to bottom centre
// (a symmetric draw-on for frames and boxes)
function rrHalves(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const cx = x + w / 2;
  return [
    `M${cx} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${cx}`,
    `M${cx} ${y}H${x + r}Q${x} ${y} ${x} ${y + r}V${y + h - r}Q${x} ${y + h} ${x + r} ${y + h}H${cx}`,
  ];
}
// a hand-drawn loop around the origin that overshoots its start, like a marker circling something
function handLoop(r = 70, turns = 1.08, seed = 1) {
  let d = '';
  const n = 160, ph = hash01(1, seed) * 6.28;
  for (let k = 0; k <= n; k++) {
    const u = k / n, a = -1.9 + u * turns * 2 * Math.PI, rr_ = r * (0.92 + 0.13 * u) + r * 0.04 * Math.sin(3 * a + ph);
    d += (k ? 'L' : 'M') + (rr_ * Math.cos(a)).toFixed(1) + ' ' + (rr_ * 0.94 * Math.sin(a)).toFixed(1);
  }
  return d;
}

// hand-drawn strokes (rough.js with FIXED seeds: the lines never "boil" between frames)
const RG = rough.generator();
function roughD(d, o = {}) {
  const dr = RG.path(d, { roughness: 0.55, bowing: 0.6, strokeWidth: 2, seed: o.seed || 7, preserveVertices: true, ...o, fill: undefined });
  return RG.toPaths(dr).map(p => p.d).join(' ');
}
function roughPath(parent, d, seed, width, attrs = {}) {
  const { rough: ro = {}, ...rest } = attrs;
  return S('path', { d: roughD(d, { seed, roughness: 0.5, ...ro }), fill: 'none', stroke: '#1e1e1e', 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...rest }, parent);
}

// a stroke that draws itself: pathLength = 1, the dash offset reveals it from 0 to v
// (a multi-stroke rough path would be drawn twice in a row: use disableMultiStroke for draw-ons)
function drawStroke(parent, d, attrs = {}) {
  const p = S('path', { d, fill: 'none', pathLength: 1, 'stroke-dasharray': '1 1.001', 'stroke-dashoffset': 1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attrs }, parent);
  p.draw = v => { v = clamp(v); A(p, 'stroke-dashoffset', f2(1 - v)); A(p, 'visibility', v <= 0.0005 ? 'hidden' : 'visible'); };
  p.draw(0);
  return p;
}
// a dashed outline that draws itself: the dashes stay put, a mask reveals them
// (animating dashoffset on a dashed path would make the dashes crawl)
let maskN = 0;
function drawDashed(parent, halves, attrs) {
  const id = 'm' + (++maskN);
  const defs = S('defs', {}, parent);
  const mask = S('mask', { id, maskUnits: 'userSpaceOnUse', x: -4000, y: -4000, width: 8000, height: 8000 }, defs);
  const revs = halves.map(d => drawStroke(mask, d, { stroke: '#fff', 'stroke-width': 24, 'stroke-linecap': 'butt' }));
  const g = S('g', { mask: `url(#${id})` }, parent);
  halves.forEach(d => S('path', { d, fill: 'none', ...attrs }, g));
  g.draw = v => { revs.forEach(r => r.draw(v)); A(g, 'visibility', v <= 0.0005 ? 'hidden' : 'visible'); };
  g.draw(0);
  return g;
}

// ------------------------------------------------------------------ boot helpers
// Load EVERY declared FontFace: document.fonts.load('40px X') alone skips faces whose
// unicode-range does not include a space (e.g. a Cyrillic subset) -> first frames wrong.
async function loadFonts() {
  await Promise.all([...document.fonts].map(f => f.load().catch(e => console.error('font failed:', f.family, e.message))));
  await document.fonts.ready;
}
// preload every <image> so the first captured frame already has it
function preloadImages(root) {
  return Promise.all([...root.querySelectorAll('image')].map(im => new Promise(res => {
    const i = new Image(); i.onload = i.onerror = res; i.src = im.getAttribute('href');
  })));
}
// sound events for the mix (scripts/audio/mix.py): sfx(t, 'hit', -8)
const SFX = [];
const sfx = (t, name, gain_db = 0) => SFX.push({ t: +t.toFixed(3), name, gain_db });
