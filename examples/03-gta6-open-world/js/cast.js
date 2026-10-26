// A small starter cast: a jelly blob with a face (a hero that can blink, squash and
// stretch) and playful shapes. Every shape is ~100 units across, centred on the
// origin, drawn with a fixed-seed rough outline. xray: the blueprint twin
// (outline, crosshair, bounding box, a coordinates label) for "how it's made" shots.
// Needs core.js.

const CAST_INK = '#1e1e1e', CAST_BLUE = '#2f6fed', CAST_MONO = '"JetBrains Mono", Menlo, monospace';
const castStar = (() => { let d = ''; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 23 : 53; d += (k ? 'L' : 'M') + (r * Math.cos(a)).toFixed(1) + ' ' + (r * Math.sin(a)).toFixed(1); } return d + 'Z'; })();
const CAST_D = {
  blob: 'M-48 0 A48 48 0 1 0 48 0 A48 48 0 1 0 -48 0 Z',
  circle: 'M-46 0 A46 46 0 1 0 46 0 A46 46 0 1 0 -46 0 Z',
  star: castStar,
  square: rr(-44, -44, 88, 88, 16),
  tri: 'M0 -48 L52 40 L-52 40 Z',
  heart: 'M0 42 C -68 -2, -42 -58, 0 -26 C 42 -58, 68 -2, 0 42 Z',
};

// makeShape(parent, 'blob', { fill: '#fceda3', seed: 3 }) -> { g, eyes? }
// pose it with pose(g, x, y, sx, sy, rot, o); blink with A(eyes, 'transform', blinkT(t, times))
function makeShape(parent, kind, { fill = '#fceda3', seed = 21, xray = false, cheeks = '#f7cbca' } = {}) {
  const d = CAST_D[kind], g = S('g', {}, parent), b = { g, kind };
  const ink = xray ? CAST_BLUE : CAST_INK;
  if (!xray) {
    S('path', { d, fill }, g);
    roughPath(g, d, seed, 1.6, { stroke: CAST_INK });
  } else {
    S('rect', { x: -58, y: -58, width: 116, height: 116, fill: 'none', stroke: CAST_BLUE, 'stroke-width': 0.9, 'stroke-dasharray': '4 3', opacity: 0.8 }, g);
    S('path', { d: 'M-70 0H70M0 -70V70', stroke: CAST_BLUE, 'stroke-width': 0.6, opacity: 0.55 }, g);
    S('path', { d, fill: 'rgba(47,111,237,0.06)', stroke: CAST_BLUE, 'stroke-width': 1.1 }, g);
    b.coord = S('text', { x: -58, y: -64, 'font-family': CAST_MONO, 'font-size': 10.5, fill: CAST_BLUE }, g);
  }
  if (kind === 'blob') {
    if (!xray && cheeks) [-29, 29].forEach(cx => S('ellipse', { cx, cy: 10, rx: 8, ry: 4.5, fill: cheeks, opacity: 0.9 }, g));
    b.eyes = S('g', {}, g);
    [-15, 15].forEach(cx => S('ellipse', { cx, cy: -9, rx: 5.5, ry: 8, fill: xray ? 'none' : ink, stroke: xray ? ink : 'none', 'stroke-width': 1 }, b.eyes));
    b.mouth = S('path', { d: 'M-15 12 Q0 26 15 12', fill: 'none', stroke: ink, 'stroke-width': xray ? 1.2 : 3.4, 'stroke-linecap': 'round' }, g);
  }
  return b;
}
// eye transform for blinks at fixed times (deterministic: no random blinking)
function blinkT(t, times, dur = 0.15) {
  let b = 0;
  for (const tb of times) { const x = (t - tb) / dur; if (x > 0 && x < 1) b = Math.max(b, Math.sin(Math.PI * x)); }
  return `translate(0 -9) scale(1 ${f2(1 - 0.9 * b)}) translate(0 9)`;
}
// a jump as a pure function of its local time tau: crouch -> arc (+ optional flip) -> squashy landing
// returns a pose { x, y, sx, sy, rot }; scrub tau back and forth and it plays backwards exactly
function jumpPose(tau, { x0, x1, y, s = 1, height = 250, air = 0.78, crouch = 0.12, flip = 360 }) {
  const u = clamp((tau - crouch) / air);
  let k = 0;
  if (tau < crouch) k = 0.18 * Math.sin(Math.PI * tau / crouch);                  // anticipation
  else if (u < 1) k = -0.12 * Math.abs(1 - 2 * u);                                 // stretch near take-off / landing
  else { const l = tau - crouch - air; k = 0.24 * (1 - step(l, { r: 0.3, z: 0.42 })) * Math.exp(-l / 0.25); }
  return { x: lerp(x0, x1, ease.inOut(u)), y: y - height * 4 * u * (1 - u) + k * 40 * s / 2, sx: s * (1 + k), sy: s * (1 - k), rot: flip * ease.inOut(u) };
}
