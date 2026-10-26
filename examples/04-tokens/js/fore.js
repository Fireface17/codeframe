// fore.js — третий план: размытые плитки у самого объектива (запечённый PNG, параллакс ×1,12 от камеры).
// Позиции заданы «как в кадре своей сцены»; между сценами они проезжают быстрее листа — глубина.
window.SC = window.SC || {};

SC.fore = async (ctx) => {
  const { fg } = ctx;
  const mk = async (tone, ch, seed) => {
    const w = 300, h = 220, pad = 60, c = cnv(w + 2 * pad, h + 2 * pad), g = c.getContext('2d');
    const face = tone === 'kraft' ? PAL.kraft : PAL.gray, edge = tone === 'kraft' ? PAL.kraftEdge : PAL.grayEdge;
    g.translate(pad, pad);
    g.fillStyle = 'rgba(59,45,29,0.12)'; g.beginPath(); g.roundRect(12, 18, w, h, 12); g.fill();
    g.fillStyle = edge; g.beginPath(); g.roundRect(6, 8, w, h, 12); g.fill();
    g.fillStyle = face; g.beginPath(); g.roundRect(0, 0, w, h, 12); g.fill();
    g.strokeStyle = PAL.line; g.lineWidth = 4; g.stroke();
    if (ch) { g.fillStyle = PAL.ink; g.font = '700 150px Onest'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, w / 2, h / 2 + 8); }
    const b = cnv(c.width, c.height), bg = b.getContext('2d');
    bg.filter = 'blur(11px)'; bg.drawImage(c, 0, 0);
    return { url: await toURL(b), w: c.width, h: c.height };
  };
  const SPR = [await mk('kraft', '', 1), await mk('gray', '', 2), await mk('gray', '', 3), await mk('kraft', '', 4)];   // без букв: лишняя «о» в хуке спорила бы со счётом
  const CAMZ = {
    hook: { x: LY.hook.x, y: LY.hook.y, z: 1 }, s2: { x: LY.s2.x, y: LY.s2.y, z: LY.s2.z }, s3: { x: LY.s3.x, y: LY.s3.y, z: 1 },
    s5: { x: LY.s5.x, y: LY.s5.y, z: 1 }, s6: { x: LY.s6.x, y: LY.s6.y + 60, z: 1 }, s7: { x: LY.s7.x, y: LY.s7.y, z: 1 }, s8: { x: LY.s8.x, y: LY.s8.y, z: LY.s8.z },
  };
  // [кадр, x, y на экране, спрайт, поворот, масштаб]
  const ITEMS = [
    ['hook', 40, 130, 0, -14, 1.0], ['hook', 1030, 1840, 2, 11, 1.1],
    ['s2', 1080, 120, 1, 16, 0.95],
    ['s3', -10, 1540, 3, -9, 1.05], ['s3', 1070, 140, 2, 8, 0.9],
    ['s5', 1060, 360, 0, 12, 1.0],
    ['s6', 30, 250, 1, -10, 0.95],
    ['s7', 40, 1580, 2, -12, 1.05], ['s7', 1060, 210, 3, 9, 0.9],
    ['s8', 40, 1760, 0, 14, 0.8],
  ];
  ITEMS.forEach(([k, sx, sy, si, rot, sc]) => {
    const c = CAMZ[k], K = 1.12, sp = SPR[si];
    const x = c.x + (sx - W / 2) / (c.z * K), y = c.y + (sy - H / 2) / (c.z * K);
    const s = sc / (c.z * K) * 1.25;                          // в своём кадре — ~1,25 натуральной величины (ближе к объективу)
    const g = S('g', { transform: `translate(${f2(x)} ${f2(y)}) rotate(${rot}) scale(${f2(s)})`, opacity: 0.92 }, fg);
    S('image', { href: sp.url, x: -sp.w / 2, y: -sp.h / 2, width: sp.w, height: sp.h }, g);
  });
  return { frame() {}, mapT: 0 };
};
