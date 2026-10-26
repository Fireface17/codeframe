// SVG поверх WebGL: хук, чип темы, подписи механик в мире. Позиции подписей берутся из 3D (vector.project).
// Текст только в безопасной зоне x 120–888, y 288–1248 (ниже 840 — x ≤ 780). Не больше двух целей чтения одновременно.
import * as THREE from 'three';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, at, p) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
const txt = (p, at, s) => { const e = el('text', at, p); e.textContent = s; return e; };

// подпись-плашка в мире: капс 46 px, тёмная подложка; точка-якорь и короткая выноска
function tag(parent, label, opts = {}) {
  const g = el('g', {}, parent);
  const ln = el('path', { d: '', stroke: '#F4F0E6', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, g);
  const dot = el('circle', { r: 8, fill: opts.dot || '#F4F0E6' }, g);
  const box = el('g', {}, g);
  const w = Math.round(label.length * 33 + 56);
  el('rect', { x: 0, y: 0, width: w, height: 76, rx: 14, fill: '#0E1016', 'fill-opacity': .82 }, box);
  if (opts.swatch) el('rect', { x: 22, y: 26, width: 24, height: 24, rx: 5, fill: opts.swatch, stroke: opts.swatchStroke || 'none', 'stroke-width': 3 }, box);
  txt(box, { x: opts.swatch ? 60 : 26, y: 52, 'font-family': 'Onest', 'font-weight': 800, 'font-size': 46, 'letter-spacing': 1.5, fill: '#F4F0E6' }, label);
  return { g, ln, dot, box, w: opts.swatch ? w + 34 : w };
}

export function makeOverlay(svg, camera) {
  svg.setAttribute('viewBox', '0 0 1080 1920');
  const layers = [0, 1, 2, 3].map(() => el('g', {}, svg));
  // (а) хук на кадре 0: две строки 100 px (y 300–560), над ними чип темы 62 px
  const a = layers[0];
  const chip = el('g', { transform: 'translate(120 296)' }, a);
  el('rect', { x: 0, y: 0, width: 540, height: 88, rx: 44, fill: '#0E1016', 'fill-opacity': .78 }, chip);
  txt(chip, { x: 36, y: 66, 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 62, fill: '#F4F0E6' }, 'GTA 6');
  txt(chip, { x: 268, y: 64, 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 58, fill: '#8C93A3' }, '·');
  txt(chip, { x: 320, y: 64, 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 58, fill: '#FFC83D' }, '19.11');
  el('rect', { x: 96, y: 402, width: 790, height: 232, rx: 22, fill: '#0E1016', 'fill-opacity': .8 }, a);   // плашка: текст читается на светлом небе
  for (const [i, s] of ['ЧТО У ТЕБЯ', 'ЗА СПИНОЙ?'].entries())
    txt(a, { x: 124, y: 498 + i * 104, 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 96, 'letter-spacing': -3, fill: '#F4F0E6', textLength: 736, lengthAdjust: 'spacingAndGlyphs' }, s);
  // (а2) после разворота: каркас, крупно
  const a2 = layers[1];
  el('rect', { x: 96, y: 322, width: 790, height: 228, rx: 22, fill: '#0E1016', 'fill-opacity': .8 }, a2);
  for (const [i, s] of ['НЕ В КАДРЕ —', 'НЕ РИСУЕТСЯ'].entries())
    txt(a2, { x: 124, y: 414 + i * 104, 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 92, 'letter-spacing': -3, fill: '#F4F0E6', textLength: 736, lengthAdjust: 'spacingAndGlyphs' }, s);
  // (б) подписи на самих клетках (две сразу) и маркер героя с пульсом
  const b = layers[2];
  const tFrame = tag(b, 'В КАДРЕ', { swatch: '#FFC83D' });
  const tMem = tag(b, 'В ПАМЯТИ', { swatch: '#5C6270' });
  const hm = el('g', {}, b);
  const pulse = el('circle', { cx: 0, cy: 0, r: 30, fill: 'none', stroke: '#F4F0E6', 'stroke-width': 4 }, hm);
  el('circle', { cx: 0, cy: 0, r: 31, fill: '#0E1016', 'fill-opacity': .75 }, hm);
  el('circle', { cx: 0, cy: 0, r: 22, fill: '#F4F0E6' }, hm);
  el('path', { d: 'M0 -15 L11 9 L0 3 L-11 9 Z', fill: '#0E1016' }, hm);         // стрелка взгляда
  // (в) одна подпись: дальние кварталы — одна модель
  const c = layers[3];
  const tH = tag(c, 'ВДАЛИ — ОДНА МОДЕЛЬ');
  const v = new THREE.Vector3();
  const proj = p => { v.set(...p).project(camera); return [(v.x * .5 + .5) * 1080, (-v.y * .5 + .5) * 1920]; };
  const C = window.CITY;
  const place = (T, ax, ay, lx, ly) => {
    T.dot.setAttribute('cx', ax.toFixed(1)); T.dot.setAttribute('cy', ay.toFixed(1));
    T.box.setAttribute('transform', `translate(${lx.toFixed(1)} ${ly.toFixed(1)})`);
    const bx = Math.min(Math.max(ax, lx + 20), lx + T.w - 20), by = ay > ly ? ly + 76 : ly;
    T.ln.setAttribute('d', Math.hypot(bx - ax, by - ay) > 14 ? `M${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}` : '');
  };
  return {
    frame(t, s) {
      const L = { a_behind: 0, a2_mid: -1, a2_turned: 1, b_island: 2, c_horizon: 3 }[s.id];
      layers.forEach((g, i) => g.setAttribute('display', i === L ? 'inline' : 'none'));
      if (L === 2) {
        const m = s.mech, H = C.hero;
        const [hx, hy] = proj([H.x, 1, H.z]);
        const k = (t * 1.2) % 1;
        pulse.setAttribute('r', (30 + 34 * k).toFixed(1)); pulse.setAttribute('stroke-opacity', (1 - k).toFixed(3));
        hm.setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`);
        // «В КАДРЕ» — в глубине клина; «В ПАМЯТИ» — внутри кольца, вне клина, справа
        const [wx, wy] = proj([H.x, 0, H.z - m.wedgeRange * .62]);
        place(tFrame, wx, wy, Math.min(Math.max(wx - tFrame.w / 2, 120), 888 - tFrame.w), wy - 150);
        const [mx, my] = proj([H.x + m.ringR * .68, 0, H.z + m.ringR * .25]);
        place(tMem, mx, my, Math.min(Math.max(mx - tMem.w + 40, 120), 780 - tMem.w), my + 120);
      }
      if (L === 3) {
        // якорь — ближайшая к центру кадра группа слияния за порогом LOD 2
        let best = null, bs = 1e9;
        for (const b of C.buildings) { const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
          if (Math.hypot(cx - s.cam[0], cz - s.cam[2]) < s.mech.lod2 + 15) continue;
          const [sx, sy] = proj([cx, b.h, cz]); if (sx < 280 || sx > 860 || sy < 420 || sy > 1300) continue;
          if (sy < bs) { bs = sy; best = [sx, sy]; } }
        if (best) place(tH, best[0], best[1] - 4, Math.min(Math.max(best[0] - tH.w * .6, 120), 888 - tH.w), Math.max(330, best[1] - 230));
      }
    },
  };
}
