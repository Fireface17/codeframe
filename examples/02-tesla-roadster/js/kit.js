// kit.js — общие приёмы ролика: слово внутри фразы, заголовок по буквам, стрелка-путь, поворот
// оттенка, подбор кегля. Нужны core.js и lab.js. Сцены-модули (js/scenes/*.js) и film.js зовут их
// только при построении (после loadFonts), поэтому порядок подключения файлов не важен.
window.SCENES = window.SCENES || {};
const FONT = { head: 'Unbounded', text: 'Onest', mono: '"JetBrains Mono", Menlo, monospace' };

// n-е вхождение слова внутри фразы k (с 1): короткие слова («и», «не», «в») повторяются по ролику
function pw(k, w, n = 1) {
  const ph = phrase(k), key = _norm(w), WD = window.WORDS;
  let c = 0;
  for (let i = 0; i < WD.words.length; i++) {
    const x = WD.words[i];
    if (x.start < ph.start - 0.02 || x.start > ph.end + 0.02) continue;
    if (_norm(x.w) === key && ++c === n) return { ...x, i };
  }
  console.error('cue word not found:', k, w, n);
  return { start: ph.start, end: ph.end, i: 0 };
}

// кегль, при котором строка влезает в maxW (после loadFonts)
const fitSize = (str, maxW, size, font = FONT.head, weight = 900) => Math.min(size, size * maxW / textWidth(str, size, font, weight));

// заголовок по буквам: буквы выскакивают пружиной каскадом, уходят вверх (ease.in4)
//   const h = headline(g, 'НЕ СНЯТО.', { x: 540, y: 700, size: 80, fill: P.ink });   h.set(t, tin, tout, shake?)
// outline: цвет обводки под буквами (читаемость поверх фигур)
function headline(parent, str, o = {}) {
  const { x = 540, y = 960, size = 72, font = FONT.head, weight = 900, fill = '#fff', anchor = 'middle', ls = 0,
    stagger = 0.028, rise = 0.45, outline = null } = o;
  const attrs = outline ? { stroke: outline, 'stroke-width': size * 0.16, 'stroke-linejoin': 'round', 'paint-order': 'stroke' } : {};
  const st = splitText(parent, str, { x, y, size, font, weight, fill, anchor, ls, attrs });
  st.set = (t, tin, tout = Infinity, sh = null) => {
    const n = st.chars.length;
    st.chars.forEach((ch, i) => {
      const t0 = tin + i * stagger;
      if (t < t0) { place(ch.g, ch.x, ch.y, 1, 0); return; }
      const a = step(t - t0, SP.pop), o1 = step(t - t0, SP.out);
      const q = t < tout ? 0 : ease.in4((t - tout - (n - 1 - i) * 0.008) / 0.24);
      const dx = sh ? sh.x : 0, dy = sh ? sh.y : 0;
      place(ch.g, ch.x + dx, ch.y + dy + rise * size * (1 - a) - q * size * 0.8, lerp(0.4, 1, a), o1 * (1 - q));
    });
  };
  return st;
}

// стрелка: квадратичная дуга (bend > 0 — выгиб влево по ходу) + наконечник из двух усов
function arrowD(x0, y0, x1, y1, { bend = 0, head = 18 } = {}) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const cx = (x0 + x1) / 2 - dy / L * bend, cy = (y0 + y1) / 2 + dx / L * bend;
  const a = Math.atan2(y1 - cy, x1 - cx);
  const p = d => `${(x1 - head * Math.cos(a + d)).toFixed(1)} ${(y1 - head * Math.sin(a + d)).toFixed(1)}`;
  return { line: `M${x0} ${y0}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1} ${y1}`, head: `M${p(0.55)}L${x1} ${y1}L${p(-0.55)}` };
}
// нарисовать стрелку: { draw(v) } — линия, потом наконечник
function arrow(parent, x0, y0, x1, y1, attrs = {}, o = {}) {
  const d = arrowD(x0, y0, x1, y1, o), g = S('g', {}, parent);
  const ln = drawStroke(g, d.line, attrs), hd = drawStroke(g, d.head, attrs);
  g.draw = v => { ln.draw(clamp(v / 0.75)); hd.draw(clamp((v - 0.7) / 0.3)); };
  g.draw(0);
  return g;
}

// поворот оттенка цвета (HSL), градусы
function hueRot(c, deg) {
  if (!deg) return c;
  const [r, g, b] = hex(c).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = 60 * (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
  }
  h = ((h + deg) % 360 + 360) % 360;
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m = l - C / 2;
  const q = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return '#' + q.map(v => Math.round(clamp(v + m) * 255).toString(16).padStart(2, '0')).join('');
}

// время, когда ease(u) проходит долю p (обратная функция бисекцией): моменты «кадр проскочил»
function easeAt(p, e = ease.inOut) { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (e(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }

// иконки Tabler (MIT, library/node_modules/@tabler/icons), outline 24×24, штрих 2
const ICON = {
  pencil: ['M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4', 'M13.5 6.5l4 4'],
  keyframe: ['M13.225 18.412a1.595 1.595 0 0 1 -1.225 .588c-.468 0 -.914 -.214 -1.225 -.588l-4.361 -5.248a1.844 1.844 0 0 1 0 -2.328l4.361 -5.248a1.595 1.595 0 0 1 1.225 -.588c.468 0 .914 .214 1.225 .588l4.361 5.248a1.844 1.844 0 0 1 0 2.328l-4.361 5.248'],
};
// иконка в группе с началом в центре; size — сторона в px
function icon(parent, name, size, color, sw = 2) {
  const g = S('g', {}, parent), k = size / 24;
  const inner = S('g', { transform: `scale(${k}) translate(-12 -12)`, fill: 'none', stroke: color, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  ICON[name].forEach(d => S('path', { d }, inner));
  return g;
}
