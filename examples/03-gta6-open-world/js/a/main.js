// Стиль A — неоновая иллюстрация на Canvas 2D по рецепту Kurzgesagt: без обводок, глубина тремя слоями светлоты,
// полоса блика на рёбрах, окна — полосы, кадр до краёв. Тот же city.json и те же камеры, что у B; вид сверху —
// честная изометрия (орто). Свой painter: проекция камерой, отсечение по ближней плоскости, сортировка по глубине.
// Свечение — отдельный слой (blur + lighter, пик ≤ 0,45), мокрый асфальт — зеркальный проход того же рисования.
(function () {
  const { W, H, FPS } = window.FRAME;
  const C = window.CITY;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const glowC = mk(W / 2, H / 2), gctx = glowC.getContext('2d');
  const reflC = mk(W / 2, H / 2), rctx = reflC.getContext('2d');
  const maskC = mk(W / 2, H / 2), mctx = maskC.getContext('2d');

  // ——— цвет ———
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mixc = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const css = (c, a = 1) => a >= 1 ? `rgb(${c.map(v => Math.round(Math.max(0, Math.min(255, v)))).join(',')})` : `rgba(${c.map(v => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${a.toFixed(3)})`;
  const scl = (c, k) => c.map(v => v * k);
  const BG = hex('#0E1016'), HAZE = hex('#34405E'), NEAR_HAZE = hex('#1A2134');
  // фасады A: те же индексы палитры, но иллюстративные — сине-серые слои с одной тёплой и одной бирюзовой нотой
  const FAC = ['#2A3248', '#313A54', '#3A3632', '#28394A', '#363E56', '#2E3044'].map(hex);
  const WARM = ['#F6A649', '#FFB860', '#E8913A', '#FFCB7A'].map(hex), COLD = hex('#A9C6EE');
  const NEON = C.palette.neon.map(hex);
  const ACC = hex('#FFC83D'), LIGHT = hex('#F4F0E6');
  const h01 = (i, s = 0) => { let x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ——— камера ———
  let cam = null;
  function makeCam(pos, target, fov, ortho) {
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const nrm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
    const f = nrm(sub(target, pos)), r = nrm(cross(f, [0, 1, 0])), u = cross(r, f);
    const k = (H / 2) / Math.tan(fov * Math.PI / 360);
    return {
      pos, target, f, r, u, ortho, k, near: 0.4, off: [0, 0],
      toCam(p) { const d = sub(p, pos); return [dot(d, r), dot(d, u), dot(d, f)]; },
      scr(c) { if (ortho) return [W / 2 + c[0] * ortho + this.off[0], H / 2 - c[1] * ortho + this.off[1], c[2]]; return [W / 2 + c[0] * k / c[2], H / 2 - c[1] * k / c[2], c[2]]; },
    };
  }
  // многоугольник в мире → экран, с отсечением по ближней плоскости
  function proj(pts, mirror) {
    let cs = pts.map(p => cam.toCam(mirror ? [p[0], -p[1], p[2]] : p));
    if (!cam.ortho) {
      const n = cam.near, out = [];
      for (let i = 0; i < cs.length; i++) {
        const a = cs[i], b = cs[(i + 1) % cs.length], ia = a[2] >= n, ib = b[2] >= n;
        if (ia) out.push(a);
        if (ia !== ib) { const t = (n - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, n]); }
      }
      cs = out;
    }
    return cs.map(c => cam.scr(c));
  }
  function poly(g, P, fill, alpha = 1) {
    if (P.length < 3) return;
    g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath();
    g.fillStyle = Array.isArray(fill) ? css(fill, alpha) : fill; g.fill();
  }
  const onScreen = P => P.length >= 3 && P.some(p => p[0] > -200 && p[0] < W + 200 && p[1] > -200 && p[1] < H + 200);

  // ——— состояние кадра ———
  let S = null;            // текущий кадр: shot, mech
  const dist = (x, z) => cam.ortho ? Math.hypot(x - cam.target[0], z - cam.target[2]) : Math.hypot(x - cam.pos[0], z - cam.pos[2]);
  const zkey = (x, z) => cam.toCam([x, 0, z])[2];
  const cellCenter = (x, z) => { const g = C.grid; const ci = Math.floor((x - g.av.x0) / (2 * g.av.step)), cj = Math.floor((z - g.st.z0) / (2 * g.st.step)); return [g.av.x0 + (ci + .5) * 2 * g.av.step, g.st.z0 + (cj + .5) * 2 * g.st.step]; };
  function loadOf(x, z) { const m = S.mech; if (!m.ring) return 1; const [cx, cz] = cellCenter(x, z); const d = Math.hypot(cx - C.hero.x, cz - C.hero.z); return sstep(m.ringR + 25, m.ringR - 25, d); }
  function wedgeOf(x, z, r = 0) { const m = S.mech; if (!m.wedge) return 1; const vx = x - C.hero.x, vz = z - C.hero.z, d = Math.hypot(vx, vz); if (d < r + 2) return 1;
    const hd = m.heading || 0, dx = Math.sin(hd), dz = -Math.cos(hd); const a = Math.acos(Math.max(-1, Math.min(1, (vx * dx + vz * dz) / d))) - Math.atan(r / d);
    return (a < m.wedgeHalf ? 1 : 0) * (d - r < m.wedgeRange ? 1 : 0); }
  // глубина светлотой: ближний — насыщенный тёмный, средний — приглушённый, дальний — светлее и в тон неба
  function depthTone(c, d, emis = false) {
    const far = S.i === 1 ? 0 : sstep(120, 1100, d);
    if (emis) return mixc(c, scl(HAZE, 1.6), far * .55);
    return mixc(c, HAZE, far * .8);
  }

  // ——— небо ———
  function sky(g) {
    const hz = cam.ortho ? 0 : cam.scr([0, 0, 1e5])[1] - (cam.f[1] * cam.k);       // горизонт
    const yH = cam.ortho ? -1 : H / 2 + cam.f[1] / Math.sqrt(1 - cam.f[1] ** 2) * cam.k;
    // полосы неба (Kurzgesagt: плоские слои, не градиентная каша)
    const bands = [['#0B0D13', 0], ['#0E1119', .35], ['#121725', .62], ['#182035', .82], ['#22293D', .95]];
    g.fillStyle = '#0B0D13'; g.fillRect(0, 0, W, H);
    if (cam.ortho) return yH;
    for (const [col, k] of bands) { const y = yH * k + 0; g.fillStyle = col; g.fillRect(0, y, W, yH - y + 2); }
    // засветка города у горизонта — источник: сам город
    g.fillStyle = 'rgba(70,52,46,.35)'; g.fillRect(0, yH - 40, W, 42);
    // облака: плоские вытянутые формы, снизу подсвечены городом
    for (let i = 0; i < 0; i++) {                       // облака отключены: полосы читались как «бары», снизу подсвечены городом
      const cy = yH * (.5 + .1 * i), x0 = (h01(i, 3) - .5) * W * .8 + S.t * 4, w = W * (.6 + .5 * h01(i, 5)), hh = 10 + 8 * h01(i, 6);
      g.fillStyle = 'rgba(30,36,54,.85)'; g.beginPath(); g.roundRect(x0, cy, w, hh, hh / 2); g.fill();
      g.fillStyle = 'rgba(78,62,60,.35)'; g.beginPath(); g.roundRect(x0 + 20, cy + hh * .6, w - 40, hh * .4, hh * .2); g.fill();
    }
    // луна — источник холодного контрового света
    const md = [-.22, .3, -.93], mc = cam.toCam([cam.pos[0] + md[0] * 4000, cam.pos[1] + md[1] * 4000, cam.pos[2] + md[2] * 4000]);
    if (mc[2] > 0) { const [mx, my] = cam.scr(mc); if (my < yH) {
      for (const [r, a] of [[48, .05]]) { g.fillStyle = `rgba(190,200,225,${a})`; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill(); }
      g.fillStyle = '#E9E6DA'; g.beginPath(); g.arc(mx, my, 30, 0, 7); g.fill();
      g.fillStyle = '#D6D2C4'; g.beginPath(); g.arc(mx + 8, my - 4, 26, 0, 7); g.fill(); } }
    return yH;
  }

  // ——— земля ———
  const inWater = (x, z) => z > C.water.seaZ || ((x - C.water.bay.cx) / C.water.bay.rx) ** 2 + ((z - C.water.bay.cz) / C.water.bay.rz) ** 2 < 1;
  function bayPoly(y) { const b = C.water.bay, P = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; P.push([b.cx + Math.cos(a) * b.rx, y, b.cz + Math.sin(a) * b.rz]); } return P; }
  function ground(g, mirror) {
    const gx0 = -1100, gx1 = 1100, gz0 = -1300, gz1 = 2200;
    const nearR = cam.ortho ? 1e9 : 1600;
    // земля кварталов (тротуары и дворы)
    poly(g, proj([[gx0, 0, gz0], [gx1, 0, gz0], [gx1, 0, gz1], [gx0, 0, gz1]]), depthTone(hex('#1B1F29'), 300));
    // дороги: асфальт темнее тротуаров
    const road = d => depthTone(hex('#111319'), d);
    for (const x of C.grid.avX) { const w = x === 0 ? 15 : 8; const d = Math.abs(x - cam.pos[0]); if (d > nearR) continue;
      poly(g, proj([[x - w, .01, C.grid.st.z0 - 7], [x + w, .01, C.grid.st.z0 - 7], [x + w, .01, C.grid.st.z1 + 7], [x - w, .01, C.grid.st.z1 + 7]]), road(d));
      if (x === 0) poly(g, proj([[-3, .02, C.grid.st.z0], [3, .02, C.grid.st.z0], [3, .02, 100], [-3, .02, 100]]), depthTone(hex('#16211D'), d)); }
    for (const z of C.grid.stZ) { const d = Math.abs(z - cam.pos[2]);
      poly(g, proj([[C.grid.av.x0 - 8, .011, z - 7], [C.grid.av.x1 + 8, .011, z - 7], [C.grid.av.x1 + 8, .011, z + 7], [C.grid.av.x0 - 8, .011, z + 7]]), road(d)); }
    // разметка: только рядом (пунктир по оси, зебры)
    if (!cam.ortho || S.i === 1) {
      const R = cam.ortho ? 260 : 260, mk = hex('#5B5C5E');
      for (const x of C.grid.avX) { if (Math.abs(x - cam.pos[0]) > R) continue; const lanes = x === 0 ? [-7.5, 7.5] : [0];
        for (const lx of lanes) for (let z = Math.floor((cam.pos[2] - R) / 9) * 9; z < cam.pos[2] + 60; z += 9) { if (inWater(x, z)) continue;
          const d = Math.hypot(x - cam.pos[0], z - cam.pos[2]); poly(g, proj([[x + lx - .12, .02, z], [x + lx + .12, .02, z], [x + lx + .12, .02, z + 4], [x + lx - .12, .02, z + 4]]), depthTone(mk, d), .8); } }
      for (const z of C.grid.stZ) { if (Math.abs(z - cam.pos[2]) > R) continue;
        for (const x of C.grid.avX) { if (Math.abs(x - cam.pos[0]) > R) continue; const w = x === 0 ? 15 : 8;
          for (let k = -w + .6; k < w - .4; k += 1.3) { const d = Math.hypot(x - cam.pos[0], z - cam.pos[2]);
            for (const sd of [-1, 1]) poly(g, proj([[x + k, .02, z + sd * 8], [x + k + .65, .02, z + sd * 8], [x + k + .65, .02, z + sd * 11.5], [x + k, .02, z + sd * 11.5]]), depthTone(mk, d), .7); } } }
    }
    // вода: бухта и море
    const wc = hex('#0B1322');
    poly(g, proj([[gx0 - 2000, -.3, C.water.seaZ], [gx1 + 2000, -.3, C.water.seaZ], [gx1 + 2000, -.3, 6000], [gx0 - 2000, -.3, 6000]]), wc);
    poly(g, proj(bayPoly(-.3)), wc);
    // набережная: светлая кромка берега
    const shore = bayPoly(.05); for (let i = 0; i < shore.length - 1; i++) { const a = shore[i], b = shore[i + 1]; if (a[2] > C.water.seaZ - 10) continue;
      const d = dist(a[0], a[2]); const o = (p, k) => [C.water.bay.cx + (p[0] - C.water.bay.cx) * k, .05, C.water.bay.cz + (p[2] - C.water.bay.cz) * k];
      poly(g, proj([o(a, 1), o(b, 1), o(b, 1.03), o(a, 1.03)]), depthTone(hex('#3A3A3E'), d)); }
  }

  // ——— фонари: пятна на земле (рисуются до домов) ———
  let LAMPS = null;
  function lampList() {
    const out = [], g = C.grid, avW = x => x === 0 ? 30 : 16;
    const nearAv = x => g.avX.reduce((m, a) => Math.abs(x - a) < Math.abs(x - m) ? a : m, 1e9);
    const nearSt = z => g.stZ.reduce((m, a) => Math.abs(z - a) < Math.abs(z - m) ? a : m, 1e9);
    for (const z of g.stZ) for (const s of [-1, 1]) for (let x = g.av.x0 + 16; x < g.av.x1; x += 32) { const lz = z + s * 8.2, a = nearAv(x); if (Math.abs(x - a) < avW(a) / 2 + 2 || inWater(x, lz)) continue; out.push([x, lz, 0, s]); }
    for (const x of g.avX) for (const s of [-1, 1]) for (let z = g.st.z0 + 16; z < g.st.z1; z += 32) { const lx = x + s * (avW(x) / 2 + 1.2), b = nearSt(z); if (Math.abs(z - b) < 9 || inWater(lx, z)) continue; out.push([lx, z, 1, s]); }
    return out;
  }
  function lampPools(g) {
    const R = cam.ortho ? 1e9 : 700;
    for (const [x, z] of LAMPS) { const d = dist(x, z); if (d > R) continue; const ld = loadOf(x, z); if (ld < .05) continue;
      const c = cam.toCam([x, 0, z]); if (!cam.ortho && c[2] < 1) continue;
      const [sx, sy] = cam.scr(c), [ex] = cam.scr(cam.toCam([x + 9, 0, z])), [, ey] = cam.scr(cam.toCam([x, 0, z + 9]));
      const rx = Math.abs(ex - sx) || 1, ry = Math.max(2, Math.abs(ey - sy) || rx * .3);
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, rx); const k = .32 * ld * (1 - sstep(200, 700, d) * .7);
      gr.addColorStop(0, `rgba(242,221,184,${k})`); gr.addColorStop(.45, `rgba(242,221,184,${k * .35})`); gr.addColorStop(1, 'rgba(242,221,184,0)');
      g.save(); g.translate(sx, sy); g.scale(1, ry / rx); g.translate(-sx, -sy); g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, rx, 0, 7); g.fill(); g.restore(); }
  }

  // ——— дома ———
  function boxFaces(x0, x1, y0, y1, z0, z1) {
    return [
      { n: [0, 0, 1], P: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], w: x1 - x0, ax: 'x', c: z1 },
      { n: [0, 0, -1], P: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], w: x1 - x0, ax: 'x', c: z0 },
      { n: [1, 0, 0], P: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], w: z1 - z0, ax: 'z', c: x1 },
      { n: [-1, 0, 0], P: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], w: z1 - z0, ax: 'z', c: x0 },
      { n: [0, 1, 0], P: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], top: true },
    ];
  }
  const LDIR = [-.62, -.78];          // со стороны луны грань светлее
  function faceVisible(F) {
    if (F.top) return cam.ortho ? cam.f[1] < 0 : cam.pos[1] > F.P[0][1];
    if (cam.ortho) return F.n[0] * -cam.f[0] + F.n[2] * -cam.f[2] > 0;
    const p = F.P[0]; return F.n[0] * (cam.pos[0] - p[0]) + F.n[2] * (cam.pos[2] - p[2]) > 0;
  }
  function drawBuilding(g, b, mirror, emisList) {
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, d = dist(cx, cz);
    const m = S.mech, mech = !!(m.ring || m.wedge);
    const load = mech ? loadOf(cx, cz) : 1, inF = mech ? wedgeOf(cx, cz, Math.hypot(b.x1 - b.x0, b.z1 - b.z0) / 2) * (load > .5 ? 1 : 0) : 1;
    const lod = m.lod ? (d < m.lod1 ? 0 : d < m.lod2 ? 1 : 2) : 0;
    const top = b.tier && lod < 2 ? b.tier.h : b.h;
    const hh = load < .05 ? .4 : b.h * (mech ? Math.max(.03, load) : 1);
    const base = FAC[b.col];
    const parts = [[b.x0, b.x1, 0, hh, b.z0, b.z1, b.h]];
    if (b.tier && lod < 2 && load > .95) parts.push([b.x0 + b.tier.ins, b.x1 - b.tier.ins, b.h, b.tier.h, b.z0 + b.tier.ins, b.z1 - b.tier.ins, b.tier.h]);
    const state = !mech ? 'full' : load < .5 ? 'disk' : inF ? 'full' : 'mem';
    for (const [x0, x1, y0, y1, z0, z1] of parts) {
      for (const F of boxFaces(x0, x1, y0, y1, z0, z1)) {
        if (!faceVisible(F)) continue;
        const P = proj(F.P, mirror); if (!onScreen(P)) continue;
        // три тона: крыша светлая, грань к луне средняя, теневая тёмная
        const lit = F.top ? 1.5 : .66 + .5 * Math.max(0, F.n[0] * LDIR[0] + F.n[2] * LDIR[1]);
        let col = depthTone(scl(base, lit * (mirror ? .45 : 1)), d);
        if (state === 'disk') { poly(g, P, F.top ? hex('#161A24') : hex('#11141C')); continue; }
        if (state === 'mem') { poly(g, P, F.top ? hex('#1A1F2B') : hex('#141822'));
          if (!mirror) { g.strokeStyle = css(LIGHT, .38); g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); }
          continue; }
        if (mech && m.wedge) col = mixc(scl(col, 1.25), scl(ACC, .55), F.top ? .16 : .08);   // в клине — тёплый свет взгляда
        poly(g, P, col);
        if (mirror) { windows(g, b, F, y0, y1, d, lod, true, emisList); continue; }
        // полоса блика на ребре со стороны луны и по верхней кромке (без обводок)
        if (!F.top && P.length === 4 && d < 900) {
          const lightSide = F.n[0] * LDIR[0] + F.n[2] * LDIR[1] > 0;
          const e = F.ax === 'x' ? [[x0, x1 - .5], [x0 + .5, x1]][lightSide ? 0 : 1] : null;
          const k = .55 * (1 - sstep(300, 900, d));
          // верхняя кромка
          const T = F.P, t0 = T[3], t1 = T[2];
          poly(g, proj([[t0[0], t0[1] - .45, t0[2]], [t1[0], t1[1] - .45, t1[2]], t1, t0]), mixc(col, LIGHT, .28), k + .3);
          // вертикальное ребро
          const a = T[1], bb = T[2], dv = F.ax === 'x' ? [Math.sign(T[0][0] - a[0]) * .55, 0, 0] : [0, 0, Math.sign(T[0][2] - a[2]) * .55];
          poly(g, proj([a, bb, [bb[0] + dv[0], bb[1], bb[2] + dv[2]], [a[0] + dv[0], a[1], a[2] + dv[2]]]), mixc(col, LIGHT, .22), k);
        }
        if (F.top) {
          // мусор на крыше — короба (плоские, светлее)
          continue;
        }
        windows(g, b, F, y0, y1, d, lod, false, emisList);
        if (m.lod && d > m.lod1 - 18 && d < m.lod1 + 18 || m.lod && d > m.lod2 - 18 && d < m.lod2 + 18) {
          g.strokeStyle = css(LIGHT, .7); g.lineWidth = 2; g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke();
        }
      }
    }
    if (state === 'disk' && !mirror) { const P = proj([[b.x0, .45, b.z0], [b.x1, .45, b.z0], [b.x1, .45, b.z1], [b.x0, .45, b.z1]]);
      g.setLineDash([7, 6]); g.strokeStyle = css(hex('#8C93A3'), .32); g.lineWidth = 1.6; g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); g.setLineDash([]); }
    // мусор на крыше
    if (state === 'full' && lod === 0 && d < 700 && !mirror) for (const r of (CL[b.id] || [])) {
      const [, x0, x1, z0, z1, y0, y1] = r; if (Math.abs(y0 - top) > .1) continue;
      for (const F of boxFaces(x0, x1, y0, y1, z0, z1)) { if (!faceVisible(F)) continue; const P = proj(F.P);
        poly(g, P, depthTone(scl(hex('#3D434F'), F.top ? 1.4 : .8 + .3 * Math.max(0, F.n[0] * LDIR[0] + F.n[2] * LDIR[1])), d)); }
    }
  }
  // окна — полосы: этажная лента тёмного стекла, на ней тёплые горящие отрезки
  function windows(g, b, F, y0, y1, d, lod, mirror, emisList) {
    if (lod === 2) return;
    const fh = b.fh, nb = Math.max(1, Math.floor(F.w / b.bay)), u0 = (F.w - nb * b.bay) / 2;
    const P0 = F.P[0], P1 = F.P[1];
    const at = (u, y) => { const k = u / F.w; return [P0[0] + (P1[0] - P0[0]) * k, y, P0[2] + (P1[2] - P0[2]) * k]; };
    const off = [F.n[0] * .06, 0, F.n[2] * .06];
    const quad = (ua, ub, ya, yb) => proj([at(ua, ya), at(ub, ya), at(ub, yb), at(ua, yb)].map(p => [p[0] + off[0], p[1], p[2] + off[2]]), mirror);
    const nF = Math.floor((y1 - .6) / fh), f0 = Math.max(1, Math.floor(y0 / fh) + (y0 > 0 ? 0 : 1));
    const far = sstep(250, 900, d);
    const glass = depthTone(hex('#0D1322'), d);
    const ty = b.ty, wy0 = ty === 3 ? .38 : ty === 2 ? .12 : .3, wy1 = ty === 3 ? .74 : ty === 2 ? .92 : .78;
    const faceId = Math.round(F.c * 7 + (F.ax === 'x' ? 1 : 2));
    for (let i = f0; i < nF; i++) {
      const ya = i * fh + fh * wy0, yb = i * fh + fh * wy1;
      if (yb > y1 - .3 || ya < y0) continue;
      if (lod === 0 && far < .9 && !mirror) poly(g, quad(u0 + .4, F.w - u0 - .4, ya, yb), glass);
      // горящие отрезки: подряд идущие окна по хешу (15–35 %), этаж иногда горит целиком
      const floorLit = h01(b.seed + i * 13, faceId) > .93;
      let run = -1;
      for (let k = 0; k <= nb; k++) {
        const on = k < nb && (floorLit || h01(b.seed * 3 + i * 31 + k * 7, faceId) < b.lit * (lod === 1 ? .7 : 1));
        if (on && run < 0) run = k;
        if (!on && run >= 0) {
          const ua = u0 + run * b.bay + .35, ub = u0 + k * b.bay - .35;
          const hc = h01(b.seed + i * 5 + run, 9);
          const col = depthTone(hc < .12 ? COLD : WARM[Math.floor(hc * 4) % 4], d, true);
          const Q = lod === 1 ? quad(ua, ub, ya + fh * .15, yb - fh * .15) : quad(ua, ub, ya, yb);
          if (onScreen(Q)) { poly(g, Q, col, mirror ? .9 : 1); if (!mirror && h01(b.seed + i + k, 4) < .22) emisList.push([Q, col]); }
          run = -1;
        }
      }
    }
    // витрины первого этажа
    if (lod === 0 && y0 === 0 && d < 500) for (let k = 0; k < nb; k += 2) { if (h01(b.seed + k, 21) < .45) continue;
      const Q = quad(u0 + k * b.bay + .3, u0 + Math.min(nb, k + 2) * b.bay - .3, .4, fh * .82);
      const col = h01(b.seed + k, 22) < .7 ? hex('#F2C894') : hex('#7FD3CB');
      poly(g, Q, depthTone(col, d, true), mirror ? .8 : .85); if (!mirror) emisList.push([Q, col]); }
  }
  const CL = {}; for (const r of C.clutter.rows) (CL[r[0]] = CL[r[0]] || []).push(r);

  // ——— пальма: силуэт с провисающими листьями, асимметрия по хешу ———
  function palm(g, x, z, h, lean, rot, v, d) {
    const base = cam.toCam([x, 0, z]); if (!cam.ortho && base[2] < 1) return;
    const [bx, by] = cam.scr(base), [tx, ty] = cam.scr(cam.toCam([x + lean * 4, h, z]));
    const s = Math.hypot(tx - bx, ty - by) / h;      // пикселей на метр у пальмы
    if (s < .25) return;
    const col = depthTone(hex('#0A0E12'), d), lc = depthTone(hex('#0E1814'), d);
    // ствол
    const w0 = .32 * s, w1 = .18 * s, mx = (bx + tx) / 2 + lean * s * 1.2, my = (by + ty) / 2;
    g.fillStyle = css(col); g.beginPath(); g.moveTo(bx - w0, by); g.quadraticCurveTo(mx - w0, my, tx - w1, ty); g.lineTo(tx + w1, ty); g.quadraticCurveTo(mx + w0, my, bx + w0, by); g.closePath(); g.fill();
    // листья
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rot + (h01(i, v) - .5) * .5, len = (4.2 + 1.6 * h01(i, v + 1)) * s;
      const dx = Math.cos(a), dy = Math.sin(a) * .35;                  // крона в лёгком ракурсе
      const droop = (1.4 + h01(i, v + 2)) * s, wd = .55 * s;
      const ex = tx + dx * len, ey = ty + dy * len + droop * 1.4;
      const cx1 = tx + dx * len * .5, cy1 = ty + dy * len * .5 - len * .25;
      g.fillStyle = css(i % 2 ? lc : col);
      g.beginPath(); g.moveTo(tx, ty);
      g.quadraticCurveTo(cx1 - dy * wd * 2, cy1 - wd, ex, ey);
      g.quadraticCurveTo(cx1 + dy * wd, cy1 + wd * 1.2, tx, ty + wd * .6);
      g.fill();
      // пёрышки: зубчатый край снизу
      if (s > 2) { g.strokeStyle = css(lc); g.lineWidth = Math.max(1, s * .08);
        for (let k = 2; k < 9; k++) { const q = k / 9, px = tx + (ex - tx) * q, py = ty + (ey - ty) * q + Math.sin(q * Math.PI) * -len * .12;
          g.beginPath(); g.moveTo(px, py); g.lineTo(px + dx * s * .5, py + s * (.9 + .4 * q)); g.stroke(); } }
    }
  }

  // ——— машины: те же данные и правило полос, что в B ———
  function carAt(r, t) {
    const [alongZ, line, dir, s0, v, kind] = r, g0 = C.grid;
    const L = alongZ ? g0.st.z1 - g0.st.z0 : g0.av.x1 - g0.av.x0;
    let s = ((s0 + v * t) % L + L) % L; if (dir < 0) s = L - s;
    if (alongZ) return { x: line - dir * (line === 0 ? 9 : 3.6), z: g0.st.z0 + s, ax: 'z', dir, kind };
    return { x: g0.av.x0 + s, z: line + dir * 3.6, ax: 'x', dir, kind };
  }
  const CARC = ['#3A4352', '#56595F', '#2B3038', '#5E5046', '#7A818C'].map(hex);
  function drawCar(g, c, d, emisList, mirror) {
    const L = 2.25, Wd = .95; const [hx, hz] = c.ax === 'z' ? [Wd, L] : [L, Wd];
    const body = boxFaces(c.x - hx, c.x + hx, .3, 1.0, c.z - hz, c.z + hz);
    const [cx_, cz_] = c.ax === 'z' ? [.85, 1.05] : [1.05, .85];
    const off = c.ax === 'z' ? [0, -c.dir * .15] : [-c.dir * .15, 0];
    const cab = boxFaces(c.x - cx_ + off[0], c.x + cx_ + off[0], 1.0, 1.5, c.z - cz_ + off[1], c.z + cz_ + off[1]);
    const col = CARC[c.kind];
    for (const F of [...body, ...cab]) { if (!faceVisible(F)) continue; const P = proj(F.P, mirror); if (!onScreen(P)) continue;
      const lit = F.top ? 1.5 : .65 + .45 * Math.max(0, F.n[0] * LDIR[0] + F.n[2] * LDIR[1]);
      poly(g, P, depthTone(scl(F.P[0][1] >= 1 && cab.includes(F) && !F.top ? hex('#1A1F28') : col, lit), d)); }
    // огни: зад красный, перёд тёплый белый
    const fwd = c.ax === 'z' ? [0, c.dir] : [c.dir, 0];
    for (const [sgn, colr] of [[1, hex('#FFE7C4')], [-1, hex('#F04848')]]) {
      for (const side of [-.6, .6]) {
        const px = c.x + fwd[0] * (L + .02) * sgn * (c.ax === 'x' ? 1 : 0) + (c.ax === 'z' ? side : 0);
        const pz = c.z + fwd[1] * (L + .02) * sgn * (c.ax === 'z' ? 1 : 0) + (c.ax === 'x' ? side : 0);
        const a = cam.toCam(mirror ? [px, -.72, pz] : [px, .72, pz]); if (!cam.ortho && a[2] < 1) continue;
        const [sx, sy] = cam.scr(a), r = Math.max(1.2, (cam.ortho ? cam.ortho : cam.k / a[2]) * .18);
        g.fillStyle = css(depthTone(colr, d, true)); g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill();
        if (!mirror) emisList.push([[[sx, sy, r * 3]], colr, 'dot']);
      }
    }
  }

  // ——— вывески: текст в проекции фасада (аффинно по трём углам) ———
  function drawSign(g, s, d, emisList) {
    const b = C.buildings[s.bld]; const fx = { n: [0, 0, -1], s: [0, 0, 1], e: [1, 0, 0], w: [-1, 0, 0] }[s.face];
    const cx = s.face === 'e' ? b.x1 : s.face === 'w' ? b.x0 : b.x0 + (b.x1 - b.x0) * s.u;
    const cz = s.face === 's' ? b.z1 : s.face === 'n' ? b.z0 : b.z0 + (b.z1 - b.z0) * s.u;
    const col = NEON[s.col];
    g.font = '700 100px Unbounded'; const tw = g.measureText(s.txt).width + 40;
    const Hm = s.vertical ? 2.2 : 2.4, Wm = Hm * tw / 140;
    let o, ax, ay, n;
    if (!s.vertical) { o = [cx + fx[0] * .3, s.y, cz + fx[2] * .3]; ax = [fx[2], 0, -fx[0]]; ay = [0, 1, 0]; n = fx; }
    else { o = [cx + fx[0] * (Hm / 2 + .3), s.y + Wm / 2, cz + fx[2] * (Hm / 2 + .3)]; ax = [0, -1, 0]; ay = [fx[0], 0, fx[2]]; n = [-fx[2], 0, fx[0]]; }
    // сторона к камере
    const toC = [cam.pos[0] - o[0], 0, cam.pos[2] - o[2]], facing = n[0] * toC[0] + n[2] * toC[2];
    if (cam.ortho ? (n[0] * -cam.f[0] + n[2] * -cam.f[2]) <= 0 : Math.abs(facing) < 1e-3) return;
    if (s.vertical && facing < 0) { ax = ax.map(v => v); ay = ay.map(v => -v); }
    else if (!s.vertical && facing < 0) return;
    const P = (a, c) => [o[0] + ax[0] * a * Wm / 2 + ay[0] * c * Hm / 2, o[1] + ax[1] * a * Wm / 2 + ay[1] * c * Hm / 2, o[2] + ax[2] * a * Wm / 2 + ay[2] * c * Hm / 2];
    const c0 = cam.toCam(P(-1, 1)), c1 = cam.toCam(P(1, 1)), c3 = cam.toCam(P(-1, -1));
    if (!cam.ortho && (c0[2] < 1 || c1[2] < 1 || c3[2] < 1)) return;
    const p0 = cam.scr(c0), p1 = cam.scr(c1), p3 = cam.scr(c3);
    if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 14) return;
    const draw = (gg, sc, alpha) => {
      gg.save(); gg.setTransform((p1[0] - p0[0]) / tw * sc, (p1[1] - p0[1]) / tw * sc, (p3[0] - p0[0]) / 140 * sc, (p3[1] - p0[1]) / 140 * sc, p0[0] * sc, p0[1] * sc);
      gg.font = '700 100px Unbounded'; gg.textBaseline = 'middle'; gg.lineJoin = 'round';
      gg.globalAlpha = alpha; gg.strokeStyle = css(col); gg.lineWidth = 12; gg.strokeText(s.txt, 20, 72);
      gg.strokeStyle = css(mixc(col, [255, 255, 255], .6)); gg.lineWidth = 4; gg.strokeText(s.txt, 20, 72);
      gg.restore();
    };
    draw(g, 1, depthTone([1, 1, 1], d)[0] > 0 ? 1 - sstep(300, 1200, d) * .6 : 1);
    emisList.push([null, col, 'fn', draw]);
  }

  // ——— герой со спины (свой рисунок, Kurzgesagt: плоские формы без обводок, блик-полосы по краям) ———
  function hero(g, x, z, stamp) {
    const f = cam.toCam([x, 0, z]), hd = cam.toCam([x, 1.8, z]); if (!cam.ortho && f[2] < .5) return;
    const [fx, fy] = cam.scr(f), [, hy] = cam.scr(hd); const U = fy - hy;     // рост в пикселях
    if (U < 30) return;
    const X = v => fx + v * U, Y = v => fy - v * U;
    // путь из команд: [x,y] — линия, [cx,cy,x,y] — кривая, [c1x,c1y,c2x,c2y,x,y] — кубическая
    const path = (pts) => { g.beginPath(); pts.forEach((p, i) => { if (i === 0) g.moveTo(X(p[0]), Y(p[1])); else if (p.length === 2) g.lineTo(X(p[0]), Y(p[1])); else if (p.length === 4) g.quadraticCurveTo(X(p[0]), Y(p[1]), X(p[2]), Y(p[3])); else g.bezierCurveTo(X(p[0]), Y(p[1]), X(p[2]), Y(p[3]), X(p[4]), Y(p[5])); }); g.closePath(); };
    const fill = (pts, col) => { path(pts); g.fillStyle = stamp ? '#000' : col; g.fill(); };
    const clipTo = (pts, fn) => { g.save(); path(pts); g.clip(); fn(); g.restore(); };
    const JEAN = '#1D2537', JEAN_L = '#2C3854', HOOD = '#2B3446', HOOD_L = '#3C4862', HOOD_D = '#212837', SKIN = '#A07760', SKIN_D = '#7E5A47', HAIR = '#16110F', SHOE = '#3A3F4A', SOLE = '#8E8A82';
    const TEAL = '#4FA7A4', WARM = '#E2A066';
    // тень и отражение ног в мокром асфальте
    if (!stamp) { g.fillStyle = 'rgba(4,5,8,.6)'; g.beginPath(); g.ellipse(fx, fy + U * .005, U * .17, U * .028, 0, 0, 7); g.fill(); }
    // ноги: лёгкая стойка, левая чуть вперёд (ниже по экрану)
    const legL = [[-.118, .5], [-.01, .5], [-.022, .38, -.03, .27], [-.036, .16, -.04, .07], [-.104, .07], [-.11, .17, -.106, .28], [-.122, .38, -.118, .5]];
    const legR = [[.01, .5], [.118, .5], [.122, .38, .108, .28], [.104, .17, .1, .075], [.032, .075], [.028, .16, .026, .27], [.02, .38, .01, .5]];
    fill(legL, JEAN); fill(legR, JEAN);
    clipTo(legR, () => fill([[.075, .5], [.12, .5], [.12, .07], [.085, .07]], JEAN_L));
    clipTo(legL, () => fill([[-.12, .5], [-.095, .5], [-.1, .07], [-.12, .07]], '#25445A'));
    // кроссовки
    fill([[-.118, .085], [-.028, .085], [-.02, .03, -.03, .0], [-.12, .0], [-.135, .03, -.118, .085]], SHOE);
    fill([[-.122, .018], [-.026, .018], [-.028, .0], [-.12, .0]], SOLE);
    fill([[.03, .09], [.118, .09], [.132, .035, .12, .004], [.024, .004], [.018, .04, .03, .09]], SHOE);
    fill([[.026, .022], [.124, .022], [.12, .004], [.024, .004]], SOLE);
    // руки: рукава худи, кисти в передних карманах (из-за спины видны только локти)
    const armL = [[-.15, .8], [-.105, .79], [-.098, .62, -.112, .53], [-.148, .5], [-.17, .62, -.15, .8]];
    const armR = [[.15, .8], [.105, .79], [.098, .62, .112, .53], [.148, .5], [.17, .62, .15, .8]];
    fill(armL, HOOD_D); fill(armR, HOOD);
    clipTo(armR, () => fill([[.13, .8], [.18, .8], [.18, .5], [.14, .5]], HOOD_L));
    clipTo(armL, () => fill([[-.18, .8], [-.152, .8], [-.158, .5], [-.18, .5]], TEAL));
    // корпус худи: покатые плечи, мягкий низ
    const body = [[-.13, .82], [-.07, .855, .07, .855, .13, .82], [.135, .74, .125, .6], [.13, .49], [-.13, .49], [-.125, .6, -.135, .74, -.13, .82]];
    fill(body, HOOD);
    clipTo(body, () => {
      fill([[.06, .86], [.16, .86], [.16, .48], [.085, .48], [.1, .66, .06, .86]], HOOD_L);          // тёплый свет витрин справа
      fill([[-.16, .86], [-.115, .86], [-.11, .48], [-.16, .48]], '#2F5B66');                       // бирюза вывески слева
      fill([[-.135, .53], [.135, .53], [.135, .485], [-.135, .485]], HOOD_D);                     // резинка
      fill([[-.004, .82], [.004, .82], [.004, .53], [-.004, .53]], 'rgba(20,24,34,.55)');         // шов по спине
    });
    // капюшон, лежащий на спине
    const hood = [[-.085, .875], [-.11, .8, -.055, .735], [.055, .735], [.11, .8, .085, .875], [0, .895]];
    fill(hood, HOOD_D);
    clipTo(hood, () => fill([[.03, .9], [.12, .9], [.12, .72], [.05, .72]], HOOD));
    fill([[-.05, .865], [0, .84], [.05, .865], [0, .875]], '#161B26');                           // глубина капюшона
    // шея, затылок, стрижка с переходом
    fill([[-.03, .9], [.03, .9], [.032, .865], [-.032, .865]], SKIN_D);
    const ell = (x_, y_, rx, ry, col) => { g.fillStyle = stamp ? '#000' : col; g.beginPath(); g.ellipse(X(x_), Y(y_), U * rx, U * ry, 0, 0, 7); g.fill(); };
    ell(-.05, .935, .011, .02, SKIN_D); ell(.05, .935, .011, .02, SKIN);                               // уши
    ell(0, .935, .049, .058, SKIN);                                                                   // затылок
    ell(0, .953, .052, .05, HAIR);                                                                     // стрижка
    fill([[-.045, .93], [.045, .93], [.035, .905, 0, .9], [-.035, .905, -.045, .93]], '#3A2C25');     // переход к шее
    if (!stamp) { ell(-.046, .958, .007, .026, TEAL); g.globalAlpha = .55; ell(.047, .952, .007, .024, WARM); g.globalAlpha = 1; }
  }

  // ——— сборка кадра ———
  function frame(t) {
    const s = window.shotAt(t);
    S = { ...s, t, mech: s.mech };
    const iso = s.i === 1;
    if (iso) {
      // изометрия: азимут 45°, возвышение 35,26°; клин и кольцо в центре кадра
      const hx = C.hero.x, hz = C.hero.z, k = 1 + .02 * s.k;
      const dir = [-Math.SQRT1_2 * .816, -.577, -Math.SQRT1_2 * .816];
      cam = makeCam([hx - dir[0] * 2000, -dir[1] * 2000, hz - dir[2] * 2000], [hx, 0, hz], 40, 2.45 * k);
      cam.off = [0, 260];
    } else cam = makeCam(s.cam, s.target, s.fov, 0);
    const m = s.mech, emis = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const yH = sky(ctx);
    // земля
    ground(ctx, false);
    // мокрый асфальт и вода: зеркальный проход (дома, окна, огни) в половинном буфере, размытый, по маске «мокрого»
    if (!iso) {
      rctx.setTransform(.5, 0, 0, .5, 0, 0); rctx.clearRect(0, 0, W, H);
      const listR = [];
      const order = C.buildings.map(b => [b, zkey((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2)]).filter(([, d]) => d > -20 && d < 2400).sort((a, b) => b[1] - a[1]);
      for (const [b] of order) drawBuilding(rctx, b, true, listR);
      mctx.setTransform(.5, 0, 0, .5, 0, 0); mctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = .5; ctx.filter = 'blur(1.2px)';
      ctx.drawImage(reflC, 0, 0, W / 2, H / 2, 0, 0, W, H);
      // вытянутые вниз столбы света — только от светлого (lighter), шаг 9 px
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .1; ctx.filter = 'blur(2px)';
      for (let k = 1; k < 6; k++) ctx.drawImage(reflC, 0, 0, W / 2, H / 2, 0, k * 9, W, H);
      ctx.restore();
      // всё выше горизонта зеркало не трогает: небо закрываем заново поверх
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, Math.max(0, yH)); ctx.clip(); sky(ctx); ctx.restore();
    }
    lampPools(ctx);
    // механики на земле: клетки, клин, кольцо (под домами)
    if (m.ring || m.wedge) mechGround(ctx);
    // объекты по глубине: дома, пальмы, фонари, машины, герой
    const items = [];
    for (const b of C.buildings) { const d = dist((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2); if (d < 2600) items.push([zkey((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2), 'b', b]); }
    for (const r of C.palms.rows) { const d = dist(r[0], r[1]); if (d < 900) items.push([zkey(r[0], r[1]) - 4, 'p', r]); }
    for (const L of LAMPS) { const d = dist(L[0], L[1]); if (d < 500) items.push([zkey(L[0], L[1]) - 2, 'l', L]); }
    for (const r of C.cars.rows) { const c = carAt(r, t + 40); if (inWater(c.x, c.z)) continue; if (Math.abs(c.x - C.hero.x) < 14 && c.z > C.hero.z - 45 && c.z < C.hero.z + 60) continue;
      const d = dist(c.x, c.z); if (d < 700) items.push([zkey(c.x, c.z) - 3, 'c', c]); }
    const signsBy = {}; for (const sg of C.signs) (signsBy[sg.bld] = signsBy[sg.bld] || []).push(sg);
    if (s.hero) items.push([zkey(C.hero.x, C.hero.z) - .5, 'h']);
    items.sort((a, b) => b[0] - a[0]);
    for (const [, k, o] of items) {
      const d = k === 'b' ? dist((o.x0 + o.x1) / 2, (o.z0 + o.z1) / 2) : k === 'c' ? dist(o.x, o.z) : k === 'h' ? 0 : dist(o[0], o[1]);
      if (k === 'b') { drawBuilding(ctx, o, false, emis); const load = (m.ring ? loadOf((o.x0 + o.x1) / 2, (o.z0 + o.z1) / 2) : 1);
        const inF = m.wedge ? wedgeOf((o.x0 + o.x1) / 2, (o.z0 + o.z1) / 2, 20) : 1;
        if (load > .5 && inF && !(m.lod && d > m.lod1)) for (const sg of (signsBy[o.id] || [])) drawSign(ctx, sg, d, emis); }
      else if (k === 'p') { if (loadOf(o[0], o[1]) > .5) palm(ctx, o[0], o[1], o[2], o[3], o[4], o[5], d); }
      else if (k === 'l') { if (loadOf(o[0], o[1]) > .5) lamp(ctx, o, d, emis); }
      else if (k === 'c') { if (loadOf(o.x, o.z) > .5) drawCar(ctx, o, d, emis, false); }
      else if (k === 'h') hero(ctx, C.hero.x, C.hero.z);
    }
    if (m.ring || m.wedge) mechTop(ctx);
    // свечение: только излучающее, размытый слой, пик ≤ 0,45
    gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.clearRect(0, 0, W / 2, H / 2);
    for (const e of emis) {
      if (e[2] === 'dot') { const [[x, y, r]] = e[0]; gctx.fillStyle = css(e[1]); gctx.beginPath(); gctx.arc(x / 2, y / 2, r / 2, 0, 7); gctx.fill(); }
      else if (e[2] === 'fn') e[3](gctx, .5, 1);
      else { gctx.save(); gctx.scale(.5, .5); poly(gctx, e[0], e[1]); gctx.restore(); }
    }
    // силуэты перед светом штампуются чёрным, чтобы свечение не просвечивало сквозь героя
    if (s.hero) { gctx.save(); gctx.scale(.5, .5); hero(gctx, C.hero.x, C.hero.z, true); gctx.restore(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(8px)'; ctx.globalAlpha = .4; ctx.drawImage(glowC, 0, 0, W, H);
    ctx.filter = 'blur(22px)'; ctx.globalAlpha = .22; ctx.drawImage(glowC, 0, 0, W, H);
    ctx.restore();
    // виньетка и зерно
    const vg = ctx.createRadialGradient(W / 2, H * .45, H * .25, W / 2, H * .5, H * .78);
    vg.addColorStop(0, 'rgba(5,6,10,0)'); vg.addColorStop(1, 'rgba(5,6,10,.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    overlay(ctx, s);
  }
  function lamp(g, L, d, emis) {
    const [x, z, ax, sgn] = L; const dirx = ax ? -sgn : 0, dirz = ax ? 0 : -sgn;
    const pole = proj([[x - .1, 0, z], [x + .1, 0, z], [x + .1, 8, z], [x - .1, 8, z]]); if (!onScreen(pole)) return;
    poly(g, pole, depthTone(hex('#0C0F14'), d));
    const hx = x + dirx * 1.5, hz = z + dirz * 1.5;
    poly(g, proj([[x, 7.85, z], [hx, 7.85, hz], [hx, 8, hz], [x, 8, z]]), depthTone(hex('#0C0F14'), d));
    const c = cam.toCam([hx, 7.75, hz]); if (!cam.ortho && c[2] < 1) return;
    const [sx, sy] = cam.scr(c), r = Math.max(1.5, (cam.ortho || cam.k / c[2]) * .3);
    g.fillStyle = '#FFF1D8'; g.beginPath(); g.ellipse(sx, sy, r * 1.4, r * .6, 0, 0, 7); g.fill();
    emis.push([[[sx, sy, r * 3]], hex('#F2DDB8'), 'dot']);
  }
  // ——— механики: клетки на диске, клин #FFC83D, кольцо подгрузки ———
  function mechGround(g) {
    const m = S.mech, hx = C.hero.x, hz = C.hero.z, gr = C.grid;
    // клетки «на диске»: пунктирная сетка за кольцом
    g.save(); g.setLineDash([8, 7]); g.strokeStyle = css(hex('#8C93A3'), .28); g.lineWidth = 1.6;
    for (let ci = 0; ci <= 20; ci += 2) { const x = gr.av.x0 + ci * gr.av.step; const P = proj([[x, .05, gr.st.z0], [x, .05, gr.st.z1]]); g.beginPath(); g.moveTo(P[0][0], P[0][1]); g.lineTo(P[1][0], P[1][1]); g.stroke(); }
    for (let cj = 0; cj <= 22; cj += 2) { const z = gr.st.z0 + cj * gr.st.step; const P = proj([[gr.av.x0, .05, z], [gr.av.x1, .05, z]]); g.beginPath(); g.moveTo(P[0][0], P[0][1]); g.lineTo(P[1][0], P[1][1]); g.stroke(); }
    g.restore();
    // клин: заливка
    const hd = m.heading || 0, a0 = hd - m.wedgeHalf, a1 = hd + m.wedgeHalf, P = [[hx, .06, hz]];
    for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; P.push([hx + Math.sin(a) * m.wedgeRange, .06, hz - Math.cos(a) * m.wedgeRange]); }
    poly(g, proj(P), ACC, .16);
  }
  function mechTop(g) {
    const m = S.mech, hx = C.hero.x, hz = C.hero.z;
    const hd = m.heading || 0;
    g.save(); g.lineCap = 'round';
    for (const a of [hd - m.wedgeHalf, hd + m.wedgeHalf]) { const P = proj([[hx, .1, hz], [hx + Math.sin(a) * m.wedgeRange, .1, hz - Math.cos(a) * m.wedgeRange]]);
      g.strokeStyle = css(ACC); g.lineWidth = 4; g.beginPath(); g.moveTo(P[0][0], P[0][1]); g.lineTo(P[1][0], P[1][1]); g.stroke(); }
    // кольцо: светлая линия + мягкий ореол (событие фронта)
    const R = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; R.push([hx + Math.cos(a) * m.ringR, .1, hz + Math.sin(a) * m.ringR]); }
    const RP = proj(R);
    for (const [lw, al] of [[18, .07], [9, .12], [3.5, .9]]) { g.strokeStyle = css(LIGHT, al); g.lineWidth = lw; g.beginPath(); RP.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
    const [px, py] = proj([[hx, 0, hz]])[0]; g.fillStyle = '#0E1016'; g.beginPath(); g.arc(px, py, 15, 0, 7); g.fill(); g.fillStyle = css(ACC); g.beginPath(); g.arc(px, py, 9, 0, 7); g.fill();
    g.restore();
  }
  // ——— подписи (тот же язык, что у B) ———
  function chip(g, x, y, label, kind) {
    g.font = '600 36px Onest'; const w = 52 + g.measureText(label).width + 26;
    g.fillStyle = 'rgba(14,16,22,.78)'; g.beginPath(); g.roundRect(x - 14, y - 32, w, 64, 32); g.fill();
    g.fillStyle = '#F4F0E6'; g.textBaseline = 'middle'; g.fillText(label, x + 52, y + 1);
    if (kind === 'disk') { g.setLineDash([5, 4]); g.strokeStyle = '#8C93A3'; g.lineWidth = 3; g.strokeRect(x + 6, y - 13, 26, 26); g.setLineDash([]); }
    if (kind === 'mem') { g.strokeStyle = '#F4F0E6'; g.lineWidth = 3; g.strokeRect(x + 6, y - 13, 26, 26); }
    if (kind === 'frame') { g.fillStyle = '#FFC83D'; g.fillRect(x + 6, y - 13, 26, 26); }
    if (kind === 'dot') { g.fillStyle = '#F4F0E6'; g.beginPath(); g.arc(x + 19, y, 9, 0, 7); g.fill(); }
    return w;
  }
// подписи в один ряд над крышами: по порядку x, раздвинуты без наложений, короткие наклонные выноски
  function layoutLabels(pts, widths) {
    const items = pts.map((p, i) => p && { i, x: p[0], y: p[1], w: widths[i] }).filter(Boolean).sort((a, b) => a.x - b.x);
    if (!items.length) return [];
    const row = Math.max(330, Math.min(...items.map(o => o.y)) - 150);
    items.forEach(o => { o.cx = o.x - o.w / 2 + 20; });
    for (let k = 1; k < items.length; k++) { const a = items[k - 1], b = items[k]; if (b.cx < a.cx + a.w + 16) b.cx = a.cx + a.w + 16; }
    const over = items[items.length - 1].cx + items[items.length - 1].w - 888; if (over > 0) items.forEach(o => { o.cx -= over; });
    const under = 134 - items[0].cx; if (under > 0) items.forEach(o => { o.cx += under; });
    return items.map(o => ({ i: o.i, x: o.x, y: o.y, lx: o.cx, ly: row }));
  }
  
  let lodPick = null;
  function overlay(g, s) {
    g.save();
    if (s.i === 0) {
      g.fillStyle = 'rgba(14,16,22,.72)'; g.beginPath(); g.roundRect(120, 292, 330, 76, 38); g.fill();
      g.font = '900 40px Unbounded'; g.fillStyle = '#F4F0E6'; g.textBaseline = 'middle'; g.fillText('GTA 6', 154, 332);
      g.font = '700 36px "JetBrains Mono"'; g.fillStyle = '#FFC83D'; g.fillText('19.11', 332, 332);
    }
    if (s.i === 1) { chip(g, 134, 330, 'на диске', 'disk'); chip(g, 134, 410, 'в памяти', 'mem'); chip(g, 134, 490, 'в кадре', 'frame'); }
    if (s.i === 2) {
      const m = s.mech;
      if (!lodPick) {
        const bands = [[0, m.lod1 - 6], [m.lod1 + 6, m.lod2 - 6], [m.lod2 + 6, 4000]], lanes = [[170, 900], [170, 900], [170, 900]];
        const P2 = p => { const c = cam.toCam(p); return cam.scr(c); };
        const occluded = (sx, sy, bl, d) => C.buildings.some(o => { if (o === bl || dist((o.x0 + o.x1) / 2, (o.z0 + o.z1) / 2) >= d - 5 || cam.toCam([(o.x0 + o.x1) / 2, 0, (o.z0 + o.z1) / 2])[2] < 20) return false; const top = o.tier ? o.tier.h : o.h;
          const pts = [[o.x0, 0, o.z0], [o.x1, 0, o.z0], [o.x0, 0, o.z1], [o.x1, 0, o.z1], [o.x0, top, o.z0], [o.x1, top, o.z0], [o.x0, top, o.z1], [o.x1, top, o.z1]].map(P2);
          const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]); return sx > Math.min(...xs) && sx < Math.max(...xs) && sy + 8 > Math.min(...ys) && sy < Math.max(...ys); });
        lodPick = [0, 1, 2].map(wi => { const cand = [];
          for (const b of C.buildings) { const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, d = dist(cx, cz); if (d < bands[wi][0] || d > bands[wi][1]) continue;
            const top = b.tier && wi < 2 ? b.tier.h : b.h; const c = cam.toCam([cx, top, cz]); if (c[2] < 1) continue; const [sx, sy] = cam.scr(c);
            if (sx < lanes[wi][0] || sx > lanes[wi][1] || sy < 400 || sy > 1300) continue; cand.push([sy, sx, b, d]); }
          cand.sort((p, q) => p[0] - q[0]);
          for (const [sy, sx, b, d] of cand.slice(0, 40)) if (!occluded(sx, sy, b, d)) return [sx, sy];
          return null; });
      }
      for (const o of layoutLabels(lodPick, [230, 190, 220])) {
        g.strokeStyle = '#F4F0E6'; g.lineWidth = 3; g.beginPath(); g.moveTo(o.x, o.y - 6); g.lineTo(o.lx + 19, o.ly + 32); g.stroke();
        g.fillStyle = '#F4F0E6'; g.beginPath(); g.arc(o.x, o.y - 6, 7, 0, 7); g.fill();
        chip(g, o.lx, o.ly, ['детально', 'проще', 'коробка'][o.i], 'dot'); }
    }
    g.restore();
  }

  window.DURATION = 3; window.T = { a: 0, b: 1, c: 2 }; window.SFX_EVENTS = [];
  window.SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 };
  window.seek = t => frame(Math.min(Math.max(t, 0), window.DURATION - 1e-4));
  (async () => {
    await Promise.all([...document.fonts].map(f => f.load().catch(() => {})));
    LAMPS = lampList();
    frame(.5); window.__ready(true);
  })();
})();
