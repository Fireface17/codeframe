// The film. Every frame is a pure function of t; every cue is anchored to a word of the
// voice-over (window.WORDS, from script.json via tools/timing.mjs). Replace the demo shots
// with yours, keep the structure: palette & layout -> cues (T) -> build once -> frame(t).
// Engine API: core.js (springs, svg, draw-ons), captions.js, cast.js, code.js.

const V = H > W;   // vertical (Reels / Shorts / TikTok) or horizontal
const P = {
  paper: '#ffffff', ink: '#1e1e1e', muted: '#a3a9b2', grid: '#dfe3ea',
  fills: ['#bff0c0', '#afd7fb', '#fceda3', '#f7cbca', '#cdc0fa'],      // green blue yellow pink violet
  red: '#ce423a', violet: '#7c5cf0', code: '#0a0c10',
};
// text-safe zone: one rectangle valid for Reels + Shorts + TikTok (vertical; below y 840 the
// TikTok buttons start at x 780) / 5 % title-safe (horizontal). tools/safecheck.mjs checks it.
window.SAFE = V ? { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 } : { x0: 96, x1: W - 96, y0: 54, y1: H - 54 };
const L = V
  ? { cx: 504, cy: 560, s: 1, cap: { x: 120, y: 1128, size: 64, lh: 74, maxW: 660 }, chip: { x: 120, y: 842, size: 36 } }
  : { cx: 760, cy: 440, s: 1, cap: { x: 960, y: 975, size: 56, lh: 66, maxW: 1500, anchor: 'middle', valign: 'bottom' }, chip: { x: 1130, y: 330, size: 40 } };

// ------------------------------------------------------------------ cues (seconds, from words)
const T = {};
T.cast = 0; T.castStep = 0.06; T.hero = T.cast + 4 * T.castStep + 0.04;  // shapes first, the hero lands last
T.s2 = phrase(2).start - 0.1;                                            // shot 2: the jump + the code
T.jump = word('кадр').start - 0.15;
T.chip = T.s2 + 0.1; T.type = T.chip + 0.15;
T.s3 = phrase(3).start - 0.1;                                            // shot 3: the line draws itself
T.loop = word('рисуется').start - 0.1; T.loopDur = 0.8;
T.end = window.WORDS.duration + 0.35;
T.clear = T.end - 0.45;                                                  // empty frame at the end = loops into t = 0
const DURATION = Math.round(T.end * FPS) / FPS;

// ------------------------------------------------------------------ build (once)
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
{ // paper with a faint dot grid (camera moves read as moves)
  const pat = S('pattern', { id: 'dots', width: 36, height: 36, patternUnits: 'userSpaceOnUse' }, defs);
  S('circle', { cx: 18, cy: 18, r: 1.7, fill: P.grid }, pat);
  S('rect', { width: W, height: H, fill: P.paper }, svg);
  S('rect', { width: W, height: H, fill: 'url(#dots)' }, svg);
}
const stage = S('g', {}, svg);
const capsLayer = S('g', {}, svg);
// the cast: four shapes around the hero
const AROUND = [['star', -240, -155, 1.15, 4], ['square', 245, -150, 1.0, 1], ['tri', -240, 185, 1.05, 0], ['heart', 245, 185, 1.1, 3]];
const shapes = AROUND.map(([kind, dx, dy, s, c], k) => ({ ...makeShape(stage, kind, { fill: P.fills[c], seed: 30 + k }), dx, dy, s }));
const hero = makeShape(stage, 'blob', { fill: P.fills[2], seed: 21 });
const loop = drawStroke(hero.g, handLoop(70, 1.08, 3), { stroke: P.red, 'stroke-width': 2.6 });
// the code chip: a dark card, the snippet types itself
const CD = window.CODE_DATA, C = L.chip, chipG = S('g', {}, svg);
const snippet = CD.step;
const cardW = Math.max(...snippet.lines.map(l => l.length)) * 0.6 * C.size + 60, cardH = snippet.lines.length * 1.5 * C.size + 44;
S('rect', { x: C.x + 10, y: C.y + 10, width: cardW, height: cardH, rx: 20, fill: P.fills[4] }, chipG);
S('rect', { x: C.x, y: C.y, width: cardW, height: cardH, rx: 20, fill: snippet.bg }, chipG);
const chip = codeScene(chipG, { from: snippet, x0: C.x + 30, y0: C.y + 22 + 0.8 * C.size, size: C.size, type: { t0: T.type, t1: T.type + 0.55, seed: 3 }, dim: 1 });
let caps = null;

// ------------------------------------------------------------------ the hero through the shots
function heroPose(t) {
  const s = 2.0 * L.s * popS(t, T.hero);
  let p = { x: L.cx, y: L.cy, sx: s, sy: s, rot: 0 };
  // each shot blends in from the previous pose with a move spring: no pose ever jumps
  if (t > T.s2) p = mixPose(p, jumpPose(t - T.jump, { x0: L.cx - 200, x1: L.cx + 200, y: L.cy + 20, s: 1.8 * L.s, height: 220 }), after(t, T.s2, SP.move));
  if (t > T.s3) p = mixPose(p, { x: L.cx, y: L.cy, sx: 2.1 * L.s, sy: 2.1 * L.s, rot: 0 }, after(t, T.s3, SP.move));
  return p;
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const clear = prog(t, T.clear, 0.3, ease.inOut);
  // shapes: cascade in with a little spin, leave fast at shot 2 (power4.in, staggered)
  shapes.forEach((sh, k) => {
    const t0 = T.cast + k * T.castStep, s = sh.s * L.s * popS(t, t0);
    const g = t < T.s2 ? 0 : ease.in4((t - T.s2 - k * 0.035) / 0.3);
    pose(sh.g, L.cx + sh.dx, L.cy + sh.dy + g * 40, s * (1 - 0.4 * g), s * (1 - 0.4 * g), lerp(-25, 0, step(t - t0, SP.pop)), popO(t, t0) * (1 - g));
  });
  const hp = heroPose(t);
  pose(hero.g, hp.x, hp.y, hp.sx, hp.sy, hp.rot, popO(t, T.hero) * (1 - clear));
  A(hero.eyes, 'transform', blinkT(t, [1.1, 3.0, 5.2]));
  loop.draw(prog(t, T.loop, T.loopDur, ease.inOut));
  // the chip pops up from below, leaves with the clear
  const ci = t < T.chip ? 0 : step(t - T.chip, SP.pop);
  popAt(chipG, C.x, C.y, lerp(0.88, 1, ci), (t < T.chip ? 0 : step(t - T.chip, SP.out)) * (1 - clear), (1 - ci) * 50);
  chip.seek(t);
  caps.frame(t);
}

// ------------------------------------------------------------------ sound design: few, soft, recorded
sfx(T.cast, 'pop', -9); sfx(T.cast + 3 * T.castStep, 'pop', -10); sfx(T.hero, 'pop', -5);
sfx(T.jump + 0.1, 'whoosh', -10); sfx(T.loop, 'scribble', -6);

// ------------------------------------------------------------------ boot
window.DURATION = DURATION;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, DURATION));
window.READY = (async () => {
  await loadFonts();
  await preloadImages(svg);
  // captions: hand-made chunks for the demo script ([text, wordIndex, style], see captions.js);
  // once script.json changes, the indices no longer fit and auto chunks take over
  const HAND = [
    { lines: [[['Это', 0], ['не', 1]], [['After', 2, 's'], ['Effects.', 3, 's']]], scale: 1.25 },   // the hook is set larger
    { lines: [[['Это', 4], ['код.', 5, 'g']]] },
    { lines: [[['Каждый', 6], ['кадр', 7], ['—', 7]]] },
    { lines: [[['функция', 8, 'b'], ['времени.', 9, 'b']]] },
    { lines: [[['Линия', 10], ['рисуется', 11]]] },
    { lines: [[['сама.', 12, 'p']]] },
  ];
  const fits = window.WORDS.words.length === 13 && window.WORDS.words[5].w === 'код.';
  const spec = fits ? HAND : autoCaptions({ maxWords: 3, maxChars: V ? 16 : 26 });
  caps = makeCaptions(capsLayer, spec, { ...L.cap, end: DURATION });
  frame(0);
  return true;
})();
