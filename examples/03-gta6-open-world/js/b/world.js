// Стиль B, день: солнечный Майами в духе GTA 6. Дома — пастельный ар-деко (скруглённые углы, белые козырьки над окнами,
// вертикальные плавники, иллюминаторы) у воды и стеклянные башни дальше; свет — солнце с тенью (свой shadow map) + небо;
// тонмаппинг ACES в выходном проходе. Механики: вне взгляда и «не нарисовано» — серая глина с тонкими рёбрами, в клине —
// полный цвет. Окна-сетка через fract + fwidth — по мотивам lemo tilt-shift city.js (MIT), код написан заново.
import * as THREE from 'three';
import { COMMON, U } from './glsl.js';

const C = window.CITY;
const lin = h => new THREE.Color(h);

// ——— дома ———
export function buildBuildings() {
  const P = [], N = [], F = [], B = [], Wd = [], Col = [], K = [], G = [], E = [], O = [];
  let piece = 0; const np = () => ++piece;   // номер детали: «рассыпание» города двигает каждую деталь отдельно
  // перекрытие: дома в клине взгляда героя (на юг, ±0,62 рад, 210 м), закрытые от него более высоким домом
  const occ = {}; {
    const hx = C.hero.x, hz = C.hero.z, Bs = C.buildings, topOf = b => b.tier ? b.tier.h : b.h;
    for (const b of Bs) {
      const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, vx = cx - hx, vz = cz - hz, d = Math.hypot(vx, vz);
      if (d < 30 || d > 210 || Math.acos(Math.max(-1, Math.min(1, vz / d))) > .62) continue;   // клин героя в плане 1 — на юг (он обернулся)
      for (const o of Bs) { if (o === b || topOf(o) < topOf(b) * .8) continue;
        const ox = (o.x0 + o.x1) / 2, oz = (o.z0 + o.z1) / 2, od = Math.hypot(ox - hx, oz - hz); if (od >= d - 5) continue;
        // луч герой → центр дома пересекает прямоугольник o?
        let hit = false; for (let k = 1; k < 40 && !hit; k++) { const f = k / 40 * (d - 4) / d, x = hx + vx * f, z = hz + vz * f; if (x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1) hit = true; }
        if (hit) { occ[b.id] = 1; if (!occ[o.id]) occ[o.id] = 2; break; } }
    }
    window.__occCount = Object.keys(occ).length;
    const oc = Bs.filter(b => occ[b.id] === 1); window.__occCenter = oc.length ? [oc.reduce((a, b) => a + (b.x0 + b.x1) / 2, 0) / oc.length, oc.reduce((a, b) => a + (b.z0 + b.z1) / 2, 0) / oc.length] : null;
    const ob = Bs.filter(b => occ[b.id] === 2).sort((a, b) => topOf(b) - topOf(a))[0]; window.__occluder = ob ? [(ob.x0 + ob.x1) / 2, topOf(ob), (ob.z0 + ob.z1) / 2, ob.x0, ob.x1, ob.z0, ob.z1] : null;
  }
  const cellC = id => { const ncx = C.cell.ncx; const ci = id % ncx, cj = Math.floor(id / ncx);
    return [C.grid.av.x0 + (ci + .5) * 2 * C.grid.av.step, C.grid.st.z0 + (cj + .5) * 2 * C.grid.st.step]; };
  // kind: 0 фасад с окнами, 1 уступ/корона, 2 предмет на крыше, 3 белый парапет/гребень, 6 мачта, 7 огонь мачты, 9 глухая стена (скругление)
  function push(v, n, uv, wh, bld, kind, col) {
    const cx = (bld.x0 + bld.x1) / 2, cz = (bld.z0 + bld.z1) / 2, [ccx, ccz] = cellC(bld.cell);
    const rad = Math.hypot(bld.x1 - bld.x0, bld.z1 - bld.z0) / 2, top = bld.topAll || (bld.tier ? bld.tier.h : bld.h);
    P.push(...v); N.push(...n); F.push(uv[0], uv[1], wh[0], wh[1]);
    B.push(cx, cz, ccx, ccz); Wd.push(bld.bay, bld.fh, bld.ty, bld.seed);
    Col.push(col.r, col.g, col.b); K.push(kind, bld.lit, rad, top);
    G.push(bld.x0, bld.z0, bld.x1, bld.z1); O.push(piece, occ[bld.id] || 0); E.push(bld.h, bld.deco || 0, bld.balc || 0, bld.roof === 'green' ? 1 : bld.roof === 'pool' ? 2 : 0);
  }
  const quadTo = (bld, kind, col) => (a, b, c, d, n, w, h) => { const uv = [[0, 0], [w, 0], [w, h], [0, h]]; for (const k of [0, 1, 2, 0, 2, 3]) push([a, b, c, d][k], n, uv[k], [w, h], bld, kind, col); };
  function box(x0, x1, y0, y1, z0, z1, bld, kind, col, noTop) {
    np();
    const quad = quadTo(bld, kind, col), w = x1 - x0, d = z1 - z0, h = y1 - y0;
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], w, h);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], w, h);
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], d, h);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], d, h);
    if (!noTop) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], w, d);
  }
  // ар-деко: коробка со скруглёнными углами (радиус r); прямые грани — с окнами, дуги — глухие
  function rbox(x0, x1, y0, y1, z0, z1, r, bld, col, seg = 7, kS = 0, kC = 9, skipStraight = false) {
    np();
    const out = [];
    const corners = [[x1 - r, z1 - r, 0], [x0 + r, z1 - r, Math.PI / 2], [x0 + r, z0 + r, Math.PI], [x1 - r, z0 + r, Math.PI * 1.5]];
    for (const [cx, cz, a0] of corners) for (let i = 0; i <= seg; i++) { const a = a0 + i / seg * Math.PI / 2; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
    for (let i = 0; i < out.length; i++) {
      const A = out[i], Bp = out[(i + 1) % out.length], straight = i % (seg + 1) === seg;
      const L = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]); if (L < 1e-3 || (straight && skipStraight)) continue;
      const nx = (Bp[1] - A[1]) / L, nz = -(Bp[0] - A[0]) / L;
      // контур против часовой в (x, z): внешняя нормаль (dz, −dx); вершины грани — от B к A, чтобы лицевая сторона смотрела наружу
      quadTo(bld, straight ? kS : kC, col)([Bp[0], y0, Bp[1]], [A[0], y0, A[1]], [A[0], y1, A[1]], [Bp[0], y1, Bp[1]], [nx, 0, nz], L, y1 - y0);
    }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (let i = 0; i < out.length; i++) { const A = out[i], Bp = out[(i + 1) % out.length];
      for (const v of [[cx, y1, cz], [Bp[0], y1, Bp[1]], [A[0], y1, A[1]]]) push(v, [0, 1, 0], [v[0] - x0, v[2] - z0], [x1 - x0, z1 - z0], bld, kS, col); }
  }
  function cyl(cx, cz, r, y0, y1, bld, kind, col) {
    np();
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, am = (a0 + a1) / 2;
      const p = a => [cx + Math.cos(a) * r, cz + Math.sin(a) * r], [x0, z0] = p(a0), [x1, z1] = p(a1), nn = [Math.cos(am), 0, Math.sin(am)];
      const L = 2 * Math.PI * r / n, uv = [[i * L, 0], [(i + 1) * L, 0], [(i + 1) * L, y1 - y0], [i * L, y1 - y0]];
      const v = [[x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0]];
      for (const k of [0, 2, 1, 0, 3, 2]) push(v[k], nn, uv[k], [2 * Math.PI * r, y1 - y0], bld, kind, col);
      for (const v2 of [[cx, y1, cz], [x1, y1, z1], [x0, y1, z0]]) push(v2, [0, 1, 0], [0, 0], [1, 1], bld, kind, col);
    }
  }
  const byId = C.buildings, FAC = C.palette.facade.map(lin), WHITE = lin('#EDE8DE');
  const hb = (id, k) => { const x = Math.sin(id * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  // объём башни в нужной форме: прямоугольник, скос углов (seg 1) или скругление
  const mass = (b, x0, x1, y0, y1, z0, z1, kind, col) => {
    const w = Math.min(x1 - x0, z1 - z0);
    if (b.shape === 'round') rbox(x0, x1, y0, y1, z0, z1, Math.min(7, w * .22), b, col, 7, kind, kind);
    else if (b.shape === 'chamfer') rbox(x0, x1, y0, y1, z0, z1, Math.min(5, w * .18), b, col, 1, kind, kind);
    else box(x0, x1, y0, y1, z0, z1, b, kind, col);
  };
  const LOUVER = lin('#5E6066');
  // фасад ближнего плана настоящей геометрией: стекло утоплено на 0,25 м, простенки и межоконные пояса выступают,
  // подоконники, цоколь, балконы с плитой и ограждением; углы — скругление (ар-деко) или фаска 0,35 м
  function nearFacade(b, r, col) {
    const D = .25, fh = b.fh, bay = b.bay, top = b.h, deco = b.deco;
    const rr = r > .8 ? r : .35, seg = r > .8 ? 7 : 1;
    rbox(b.x0, b.x1, 0, top, b.z0, b.z1, rr, b, col, seg, 0, r > .8 ? 9 : 11, true);
    const R = b.ty === 3 ? [.08, .92, .34, .76] : b.ty === 1 ? [.18, .82, .18, .88] : [.2, .8, .3, .78];
    const nFl = Math.floor((top - .6) / fh);
    const PL = col.clone().multiplyScalar(.78), SILL = lin('#E6E1D6'), RAIL = lin('#EDE8DE');
    const faces = [
      { n: [0, 1], ax: 'x', a0: b.x0 + rr, a1: b.x1 - rr, c: b.z1 }, { n: [0, -1], ax: 'x', a0: b.x0 + rr, a1: b.x1 - rr, c: b.z0 },
      { n: [1, 0], ax: 'z', a0: b.z0 + rr, a1: b.z1 - rr, c: b.x1 }, { n: [-1, 0], ax: 'z', a0: b.z0 + rr, a1: b.z1 - rr, c: b.x0 }];
    for (const F of faces) {
      const L = F.a1 - F.a0; if (L < 1) continue;
      const sgn = F.ax === 'x' ? F.n[1] : F.n[0];
      // точка: u — вдоль фасада от «левого» края (если смотреть снаружи), d — вынос наружу от плоскости
      const leftA = (F.ax === 'x' ? (sgn > 0 ? F.a0 : F.a1) : (sgn > 0 ? F.a1 : F.a0)), dir = (F.ax === 'x' ? (sgn > 0 ? 1 : -1) : (sgn > 0 ? -1 : 1));
      const pt = (u, y, d) => F.ax === 'x' ? [leftA + dir * u, y, F.c + sgn * d] : [F.c + sgn * d, y, leftA + dir * u];
      const bx = (u0, u1, y0, y1, d0, d1, kind, cc) => { const p = pt(u0, y0, d0), q = pt(u1, y1, d1); box(Math.min(p[0], q[0]), Math.max(p[0], q[0]), y0, y1, Math.min(p[2], q[2]), Math.max(p[2], q[2]), b, kind, cc); };
      const nrm = F.ax === 'x' ? [0, 0, sgn] : [sgn, 0, 0];
      // первый этаж: плоскость с витринами (шейдер) и цоколь
      quadTo(b, 0, col)(pt(0, 0, 0), pt(L, 0, 0), pt(L, fh, 0), pt(0, fh, 0), nrm, L, fh);
      bx(0, L, 0, .55, 0, .07, 3, PL);
      // стекло этажей — утоплено на D
      if (nFl > 1) quadTo(b, 12, col)(pt(0, fh, -D), pt(L, fh, -D), pt(L, top, -D), pt(0, top, -D), nrm, L, top - fh);
      const nb = Math.max(1, Math.floor(L / bay)), u0 = (L - nb * bay) / 2;
      const wx = i => [u0 + bay * (i + R[0]), u0 + bay * (i + R[1])];
      // простенки (во всю высоту над первым этажом)
      const gaps = [[0, wx(0)[0]]]; for (let i = 0; i < nb - 1; i++) gaps.push([wx(i)[1], wx(i + 1)[0]]); gaps.push([wx(nb - 1)[1], L]);
      for (const [g0, g1] of gaps) if (g1 - g0 > .02) bx(g0, g1, fh, top, -D, 0, 13, col);
      // межоконные пояса и подоконники
      for (let i = 0; i < nb; i++) {
        const [w0, w1] = wx(i);
        let yPrev = fh;
        for (let k = 1; k < nFl; k++) {
          const ya = k * fh + R[2] * fh, yb = k * fh + R[3] * fh;
          bx(w0, w1, yPrev, ya, -D, 0, 13, col);
          bx(w0 - .08, w1 + .08, ya - .07, ya, 0, .14, 3, SILL);                    // подоконник
          if (b.balc && k >= 1) {                                                   // балкон: плита и ограждение
            bx(w0 - .25, w1 + .25, ya - .22, ya - .08, 0, 1.0, 3, RAIL);
            bx(w0 - .25, w1 + .25, ya + .78, ya + .84, .93, 1.0, 3, RAIL);
            const nP = Math.max(2, Math.round((w1 - w0) / 1.1)); for (let p = 0; p <= nP; p++) { const u = w0 - .22 + (w1 - w0 + .44) * p / nP; bx(u - .03, u + .03, ya - .08, ya + .78, .95, 1.0, 3, RAIL); }
            bx(w0 - .25, w1 + .25, ya + .3, ya + .34, .95, 1.0, 3, RAIL);   // средняя перекладина
          }
          yPrev = yb;
        }
        bx(w0, w1, yPrev, top, -D, 0, 13, col);
      }
      // кондиционеры на части окон боковых фасадов
      if (!b.street || !b.street.includes(F.ax === 'x' ? (sgn > 0 ? 's' : 'n') : (sgn > 0 ? 'e' : 'w')))
        for (let i = 0; i < nb; i++) for (let k = 1; k < nFl; k++) if (hb(b.id * 7 + i * 13 + k, 21) < .18) { const [w0, w1] = wx(i), ya = k * fh + R[2] * fh; bx((w0 + w1) / 2 - .4, (w0 + w1) / 2 + .4, ya - .62, ya - .1, 0, .5, 2, lin('#CFCBC4')); }
    }
  }
  for (const b of byId) {
    const col = FAC[b.col];
    const tower = !!b.extra;
    const r = b.deco ? Math.min(3.2, (b.x1 - b.x0) * .16, (b.z1 - b.z0) * .16) : 0;
    if (tower) {
      mass(b, b.x0, b.x1, 0, b.h, b.z0, b.z1, 0, col);
      // технический этаж на каждом переходе: утопленная полоса с жалюзи
      let ins = 0;
      const steps = (b.tier ? [{ ins: b.tier.ins, h0: b.h, h1: b.tier.h }] : []).concat(b.extra);
      for (const st of steps) {
        mass(b, b.x0 + st.ins + .6, b.x1 - st.ins - .6, st.h0, st.h0 + b.fh * 1.1, b.z0 + st.ins + .6, b.z1 - st.ins - .6, 5, LOUVER);
        mass(b, b.x0 + st.ins, b.x1 - st.ins, st.h0 + b.fh * 1.1, st.h1, b.z0 + st.ins, b.z1 - st.ins, 1, col);
        ins = st.ins;
      }
      const T = b.topAll, X0 = b.x0 + ins, X1 = b.x1 - ins, Z0 = b.z0 + ins, Z1 = b.z1 - ins, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
      // венец: светлый пояс по краю крыши
      if (b.shape === 'box') { box(X0 - .3, X1 + .3, T - .9, T, Z0 - .3, Z1 + .3, b, 3, WHITE, true); }
      if (b.cap === 'spire') { box(cx - 1.2, cx + 1.2, T, T + 6, cz - 1.2, cz + 1.2, b, 1, col); box(cx - .35, cx + .35, T + 6, T + 26 + hb(b.id, 13) * 14, cz - .35, cz + .35, b, 6, lin('#C9CCD2')); }
      else if (b.cap === 'tech') { const w = (X1 - X0) * .3, d = (Z1 - Z0) * .3; box(cx - w, cx + w, T, T + 4.5, cz - d, cz + d, b, 5, LOUVER); box(cx - .2, cx + .2, T + 4.5, T + 14, cz - .2, cz + .2, b, 6, lin('#9A9EA6')); box(cx - .4, cx + .4, T + 14, T + 14.8, cz - .4, cz + .4, b, 7, lin('#D9473B')); }
      if (b.crown) {
        let x0 = X0, x1 = X1, z0 = Z0, z1 = Z1, y = T;
        for (let k = 0; k < 3; k++) { const s = (x1 - x0) * .14; x0 += s; x1 -= s; z0 += s; z1 -= s; box(x0, x1, y, y + 7, z0, z1, b, 1, col); box(x0 - .2, x1 + .2, y + 5.6, y + 6.6, z0 - .2, z1 + .2, b, 3, WHITE, true); y += 7; }
        const ccx = (x0 + x1) / 2, ccz = (z0 + z1) / 2; box(ccx - .5, ccx + .5, y, y + (b.crown === 1 ? 32 : 18), ccz - .5, ccz + .5, b, 6, lin('#C9CCD2'));
      }
      if (b.mast) { box(cx - .45, cx + .45, T, T + b.mast, cz - .45, cz + .45, b, 6, lin('#D9D3CC')); for (const f of [.5, .78, 1]) box(cx - .75, cx + .75, T + b.mast * f - .7, T + b.mast * f + .7, cz - .75, cz + .75, b, 7, lin('#D9473B')); }
      continue;
    }
    const nearH = Math.hypot((b.x0 + b.x1) / 2 - C.hero.x, (b.z0 + b.z1) / 2 - C.hero.z) < 175;
    if (nearH) nearFacade(b, r, col);
    else if (r > .8) rbox(b.x0, b.x1, 0, b.h, b.z0, b.z1, r, b, col); else rbox(b.x0, b.x1, 0, b.h, b.z0, b.z1, .3, b, col, 1, 0, 11);   // фаска 0,3 м на вертикальных рёбрах
    if (b.tier) box(b.x0 + b.tier.ins, b.x1 - b.tier.ins, b.h, b.tier.h, b.z0 + b.tier.ins, b.z1 - b.tier.ins, b, 1, col);
    // ар-деко геометрией: «брови» над окнами каждого этажа, карниз, пилон с рельефной надписью, маркизы над витринами
    if (b.deco) {
      const rr0 = r > .8 ? r : 0, ex = .55, th = .18;
      const ring = (y, h, e) => {
        box(b.x0 + rr0, b.x1 - rr0, y, y + h, b.z1, b.z1 + e, b, 3, WHITE); box(b.x0 + rr0, b.x1 - rr0, y, y + h, b.z0 - e, b.z0, b, 3, WHITE);
        box(b.x1, b.x1 + e, y, y + h, b.z0 + rr0, b.z1 - rr0, b, 3, WHITE); box(b.x0 - e, b.x0, y, y + h, b.z0 + rr0, b.z1 - rr0, b, 3, WHITE);
      };
      for (let f = 1; f < b.floors; f++) ring(f * b.fh + b.fh * .8, th, ex);
      ring(b.h - .55, .55, .45);                                                  // карниз
      if (r > .8) for (let f = 1; f < b.floors; f++) rbox(b.x0 - .35, b.x1 + .35, f * b.fh + b.fh * .8, f * b.fh + b.fh * .8 + th, b.z0 - .35, b.z1 + .35, r + .35, b, WHITE, 7, 3, 3);   // бровь огибает скругление
      const ped = b.pylon;
      if (ped) {
        const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, top = b.h + 5, PW = 1.4, PD = 1.0;
        if (ped === 's') box(cx - PW, cx + PW, b.fh * .9, top, b.z1, b.z1 + PD, b, 3, WHITE);
        if (ped === 'n') box(cx - PW, cx + PW, b.fh * .9, top, b.z0 - PD, b.z0, b, 3, WHITE);
        if (ped === 'e') box(b.x1, b.x1 + PD, b.fh * .9, top, cz - PW, cz + PW, b, 3, WHITE);
        if (ped === 'w') box(b.x0 - PD, b.x0, b.fh * .9, top, cz - PW, cz + PW, b, 3, WHITE);
      }
      // маркизы над витринами на уличных фасадах (полосатые, kind 10)
      const AWN = [lin('#D99A8A'), lin('#8DB8AE'), lin('#E3C79A'), lin('#B7A9CC')][Math.floor(hb(b.id, 14) * 4)];
      const y0 = b.fh * .78, y1 = y0 + .16, D = 1.5;
      for (const f of (b.street || [])) {
        if (f === 's' && b.x1 - b.x0 > 6) box(b.x0 + rr0 + .4, b.x1 - rr0 - .4, y0, y1, b.z1, b.z1 + D, b, 10, AWN);
        if (f === 'n' && b.x1 - b.x0 > 6) box(b.x0 + rr0 + .4, b.x1 - rr0 - .4, y0, y1, b.z0 - D, b.z0, b, 10, AWN);
        if (f === 'e' && b.z1 - b.z0 > 6) box(b.x1, b.x1 + D, y0, y1, b.z0 + rr0 + .4, b.z1 - rr0 - .4, b, 10, AWN);
        if (f === 'w' && b.z1 - b.z0 > 6) box(b.x0 - D, b.x0, y0, y1, b.z0 + rr0 + .4, b.z1 - rr0 - .4, b, 10, AWN);
      }
    }
    const top = b.tier ? b.tier.h : b.h, ins = b.tier ? b.tier.ins : 0, rr = r > .8 ? r * .3 : 0;
    const pw = .35, ph = b.deco ? 1.1 : .9, X0 = b.x0 + ins + rr, X1 = b.x1 - ins - rr, Z0 = b.z0 + ins + rr, Z1 = b.z1 - ins - rr;
    if (X1 - X0 > 5) {
      box(X0, X1, top, top + ph, Z0, Z0 + pw, b, 3, WHITE); box(X0, X1, top, top + ph, Z1 - pw, Z1, b, 3, WHITE);
      box(X0, X0 + pw, top, top + ph, Z0, Z1, b, 3, WHITE); box(X1 - pw, X1, top, top + ph, Z0, Z1, b, 3, WHITE);
    }
    if (b.mast) { const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2; box(cx - .45, cx + .45, top, top + b.mast, cz - .45, cz + .45, b, 6, lin('#D9D3CC')); for (const f of [.5, .78, 1]) box(cx - .75, cx + .75, top + b.mast * f - .7, top + b.mast * f + .7, cz - .75, cz + .75, b, 7, lin('#D9473B')); }
  }
  for (const r of C.clutter.rows) {
    const [id, x0, x1, z0, z1, y0, y1, t] = r, b = byId[id];
    if (t === 2) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rr = (x1 - x0) / 2; box(cx - rr * .7, cx + rr * .7, y0, y0 + 1.2, cz - rr * .7, cz + rr * .7, b, 2, lin('#8A8580')); cyl(cx, cz, rr, y0 + 1.2, y1, b, 2, lin('#B8A48C')); }
    else if (t === 3) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; box(cx - .15, cx + .15, y0, y1, cz - .15, cz + .15, b, 6, lin('#9A9EA6')); box(cx - .35, cx + .35, y1 - .2, y1 + .5, cz - .35, cz + .35, b, 7, lin('#D9473B')); }
    else box(x0, x1, y0, y1, z0, z1, b, 2, t === 1 ? FAC[b.col].clone().multiplyScalar(.95) : lin(['#C9C6C0', '#B4B1AB', '#D6D2CA'][id % 3]));
  }
  const g = new THREE.BufferGeometry();
  const at = (n, a, k) => g.setAttribute(n, new THREE.Float32BufferAttribute(a, k));
  at('position', P, 3); at('normal', N, 3); at('aFace', F, 4); at('aB', B, 4); at('aW', Wd, 4); at('aCol', Col, 3); at('aK', K, 4); at('aG', G, 4); at('aE', E, 4); at('aO', O, 2);
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: COMMON + /* glsl */`
      attribute vec4 aFace; attribute vec4 aB; attribute vec4 aW; attribute vec3 aCol; attribute vec4 aK; attribute vec4 aG; attribute vec4 aE; attribute vec2 aO;
      varying vec4 vFace; varying vec3 vWp; varying vec3 vN; varying vec3 vCol; varying vec4 vW; varying vec4 vK; varying vec3 vSt; varying vec4 vE; varying float vOcc;
      void main(){
        vec3 p = position; vOcc = aO.y;
        float load = mix(1., loadOf(aB.zw), uMech * uRing);
        float inF = wedgeOf(aB.xy, aK.z);
        float lod = 0.; float dc = length(aB.xy - cameraPosition.xz);
        if (uLod > .5 && uShadowPass < .5) lod = dc < uLod1 ? 0. : dc < uLod2 ? 1. : 2.;
        if (uRetro > .5) lod = dc < uLod1 ? 0. : 2.;   // PS2: вне пузыря подгрузки — коробки
        if ((aK.x > 1.5 && aK.x < 8.5 && lod > .5) || (aK.x > .5 && aK.x < 1.5 && lod > 1.5)) p = vec3(aB.x, -20., aB.y);
        if (uExplode > .05 && aK.x > 1.5 && aK.x < 11.5 && abs(aK.x - 9.) > .5) p = vec3(aB.x, -20., aB.y);
        if (load < .5 && aK.x > .5 && aK.x < 8.5) p = vec3(aB.x, -20., aB.y);
        float keep = mix(.4 / max(aK.w, .4), 1., load);
        p.y *= keep;
        // слияние дальних кварталов: дома кластера уходят вниз, вместо них поднимается одна простая модель
        if (uMerge > .001 && aB.x > uMergeRect.x && aB.x < uMergeRect.z && aB.y > uMergeRect.y && aB.y < uMergeRect.w) {
          float km = smoothstep(0., .85, uMerge); vec2 mc = (uMergeRect.xy + uMergeRect.zw) * .5;
          p.xz = aB.xy + (p.xz - aB.xy) * (1. + .9 * km) + (mc - aB.xy) * .35 * km;   // дома расползаются и сходятся в один массив
          p.y *= 1. - .25 * km;
          p.y *= 1. - step(.92, uMerge);                                                    // в конце — одна простая модель
        }
        vSt = vec3(load, inF, lod);
        vFace = aFace; if (normal.y < .5) { vFace.y *= keep; vFace.w *= keep; }
        vN = normal; vCol = aCol; vW = aW; vK = aK; vE = aE;
        // «рассыпание»: каждая деталь взлетает и расходится по своему хешу (вид сверху, бит «Ведьмака»)
        if (uExplode > .001) { float hp = h21(vec2(aO.x, 3.1)), hq = h21(vec2(aO.x, 7.7)), hr = h21(vec2(aO.x, 1.3));
          p += uExplode * vec3((hq - .5) * 14., 6. + 70. * hp, (hr - .5) * 14.); }
        vec4 wp = modelMatrix * vec4(p, 1.); vWp = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: COMMON + /* glsl */`
      varying vec4 vFace; varying vec3 vWp; varying vec3 vN; varying vec3 vCol; varying vec4 vW; varying vec4 vK; varying vec3 vSt; varying vec4 vE; varying float vOcc;
      void main(){
        if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        vec3 n = normalize(vN);
        float kind = vK.x, top = step(.5, n.y), y = vWp.y, lod = vSt.z;
        float d = distance(cameraPosition, vWp);
        vec3 V = normalize(cameraPosition - vWp);
        vec2 ef = vec2(min(vFace.x, vFace.z - vFace.x), min(vFace.y, vFace.w - vFace.y));
        float e = min(ef.x, ef.y), ew = length(fwidth(vFace.xy));
        float edge = (1. - smoothstep(ew * .6, ew * 1.6, e)) * step(kind, 8.5);
        float load = vSt.x, inF = vSt.y * load;
        // глина: хук (за спиной) и клетки «в памяти» вне клина — модель без отрисовки
        float occA = clamp(uOccl * 1.8 - h21(vK.zz + vW.ww) * .8, 0., 1.);   // неровный стаггер гашения закрытых домов
        float clay = max(voidAt(vWp), step(.5, vOcc) * step(vOcc, 1.5) * step(.5, occA));
        float memS = uMech * step(.5, load) * (1. - inF);                  // «в памяти»: тот же город, приглушённый
        float disk = uMech * (1. - step(.5, load));
        vec3 alb = vCol; float glassM = 0.; float spec = 0.;
        float fh = vW.y, ty = vW.z, seed = vW.w, deco = vE.y;
        float curtain = 0., aoF = 1.;
        if (clay < .5 && disk < .5) {
          alb *= .94 + .08 * vnoise(vWp.xz * .3 + vWp.y * .2);
          alb *= mix(.86, 1., smoothstep(0., 7., y));
          if (top > .5 && kind < 1.5) {
            float rt = h21(vec2(vW.w, 3.)); alb = (rt < .55 ? vec3(.44, .43, .41) : rt < .8 ? vec3(.52, .38, .32) : vec3(.42, .46, .45)) * (.85 + .3 * vnoise(vWp.xz * .4));
            vec2 rq = vec2(vFace.x / vFace.z, vFace.y / vFace.w);
            float inner = step(.18, rq.x) * step(rq.x, .82) * step(.2, rq.y) * step(rq.y, .8);
            if (vE.w > .5 && vE.w < 1.5) alb = mix(alb, mix(vec3(.22, .25, .17), vec3(.3, .33, .22), step(.55, vnoise(vWp.xz * .9))), inner);
            if (vE.w > 1.5) { alb = mix(alb, vec3(.24, .5, .52), inner); spec += inner * .6; }
          }
          // жалюзи технического этажа
          if (kind > 4.5 && kind < 5.5 && top < .5) { float lv = fract(y / .45); alb = vCol * mix(.55, 1.1, smoothstep(.1, .5, lv)); }
          // маркиза: полосы
          if (kind > 9.5 && kind < 10.5) { float st = step(.5, fract((vWp.x + vWp.z) / 1.1)); alb = mix(vCol, vec3(.93, .91, .87), st * .85); }
          vec2 fw0 = fwidth(vec2(vFace.x, y));
          // стеклянная башня: навесная стена — стекло, импосты, межэтажные полосы
          if (ty > 1.5 && ty < 2.5 && kind < 1.5 && top < .5) {
            float bay = vW.x;
            vec2 q = vec2(vFace.x / bay, y / fh); vec2 id = floor(q), f = fract(q); vec2 fw = fwidth(q);
            float spand = 1. - smoothstep(.2 - fw.y, .2 + fw.y, f.y);                    // перекрытие: непрозрачная полоса
            float mull = 1. - smoothstep(.04 - fw.x, .04 + fw.x, min(f.x, 1. - f.x));     // вертикальные импосты
            float sub = (1. - smoothstep(.02 - fw.x, .02 + fw.x, abs(f.x - .5))) * .6;    // промежуточный импост
            float far = clamp(max(fw.x, fw.y) * 1.8 - .5, 0., 1.);                        // дальний LOD: полосы этажей держатся дольше окон
            float g = (1. - spand) * (1. - max(mull, sub) * (1. - far) * step(lod, 1.5)) * (1. - step(1.5, lod) * uLod * .85);   // LOD 2: стекло гаснет — простая коробка
            curtain = 1.;
            glassM = g;
            alb = mix(vCol * .42, vec3(.5, .5, .49), .3);                              // перекрытия и импосты — металл в тон стекла, темнее стекла
            alb *= .92 + .16 * h31(vec3(id, seed));
          }
          // ар-деко и обычные дома: окна в нишах, рамы, балконы с ограждением, витрины
          else if ((kind < 1.5 || kind > 8.5 && kind < 9.5) && top < .5 && lod < 1.5) {
            float bay = vW.x;
            float nb = max(1., floor(vFace.z / bay)), u0 = (vFace.z - nb * bay) * .5;
            vec2 q = vec2((vFace.x - u0) / bay, y / fh);
            vec2 id = floor(q), f = fract(q);
            float inCols = kind > 8.5 ? 1. : step(0., q.x) * step(q.x, nb);
            float nFl = floor((vK.w - .6) / fh);
            vec4 R = ty < .5 ? vec4(.2, .8, .3, .78) : ty < 1.5 ? vec4(.16, .84, .16, .9) : vec4(.04, .96, .34, .76);
            if (kind > 8.5) R = vec4(-1., 2., .34, .76);                                   // скругление: ленточное окно
            vec2 fw = fwidth(q);
            float win = smoothstep(R.x - fw.x, R.x + fw.x, f.x) * (1. - smoothstep(R.y - fw.x, R.y + fw.x, f.x))
                      * smoothstep(R.z - fw.y, R.z + fw.y, f.y) * (1. - smoothstep(R.w - fw.y, R.w + fw.y, f.y));
            if (deco > .5 && ty > 2.5 && id.y > nFl - 1.5 && kind < .5) { float rr = length((f - vec2(.5, .55)) * vec2(1., fh / bay)); win = 1. - smoothstep(.24 - fw.x, .24 + fw.x, rr); }
            float far = clamp(max(fw.x, fw.y) * 2.4 - .35, 0., 1.);
            float rows = step(1., id.y) * step(id.y, nFl - 1.);
            if (lod > .5) { win = (1. - smoothstep(.75 - fw.y, .75 + fw.y, f.y)) * smoothstep(.3 - fw.y, .3 + fw.y, f.y); far = 0.; }
            float winA = mix(win, max(R.y - R.x, 0.) * (R.w - R.z), far) * inCols * rows;
            float inX = (f.x - R.x) / (R.y - R.x), inY = (f.y - R.z) / (R.w - R.z);
            // ниша окна 0,25 м: верхний откос в тени, боковой — по солнцу (вычислено от нормали грани)
            float dep = .25 / fh, depX = .25 / bay;
            float revT = step(inY, 1.) * smoothstep(1. - dep * 2.2 / (R.w - R.z), 1., inY);
            vec3 tg = normalize(cross(vec3(0., 1., 0.), n));
            float sunSide = sign(dot(tg, uSunDir));
            float revS = smoothstep(1. - depX * 1.6 / max(R.y - R.x, .1), 1., sunSide > 0. ? 1. - inX : inX) * step(kind, .5);
            float frame = win * (1. - smoothstep(.0, .06, min(min(inX, 1. - inX), min(inY, 1. - inY)))) * (1. - far) * step(ty, 1.5);
            glassM = winA * (1. - frame) * (1. - revT * (1. - far)) * (1. - revS * (1. - far));
            alb = mix(alb, vec3(.86, .84, .8), frame * inCols * rows);
            aoF *= 1. - win * revT * .45 * (1. - far) * inCols * rows;                      // откосы темнее
            if (deco > .5 && kind < .5) { float fin = 1. - smoothstep(.12, .12 + fw.x * 3., abs(fract((q.x - 1.5) / 3.) - .5) * 3.); alb = mix(alb, vec3(.9, .88, .84), fin * (1. - far) * step(1., id.y)); glassM *= 1. - fin; }
            // балконы: плита и ограждение (стойки + поручень)
            if (vE.z > .5 && kind < .5) {
              float slab = smoothstep(.0, .02 + fw.y, f.y) * (1. - smoothstep(.07, .07 + fw.y, f.y)) * rows;
              float rail = (1. - smoothstep(.015, .015 + fw.y, abs(f.y - .36))) + step(.07, f.y) * step(f.y, .36) * (1. - smoothstep(.12, .12 + fw.x * 6., fract(q.x * 8.)));
              alb = mix(alb, vec3(.88, .86, .82), clamp(slab + rail * .9, 0., 1.) * (1. - far) * rows);
              glassM *= 1. - clamp(rail, 0., 1.) * (1. - far);
            }
            if (kind < .5 && id.y < .5 && lod < .5) {
              float sx = smoothstep(.06 - fw.x, .06 + fw.x, f.x) * (1. - smoothstep(.94 - fw.x, .94 + fw.x, f.x));
              float sy = smoothstep(.1, .1 + fw.y, f.y) * (1. - smoothstep(.74 - fw.y, .74 + fw.y, f.y));
              glassM = max(glassM, sx * sy * inCols * step(.25, h21(vec2(floor(q.x * .5), seed))));
            }
            // мягкий AO под «бровями»: полоса тени над окнами
            if (deco > .5) aoF *= 1. - (smoothstep(.62, .79, f.y) * (1. - step(.8, f.y))) * .22 * rows * (1. - far);
          }
          // утопленное стекло ближнего фасада: импост по центру окна и фрамуга
          if (kind > 11.5 && kind < 12.5 && top < .5) {
            float bay = vW.x, nb = max(1., floor(vFace.z / bay)), u0 = (vFace.z - nb * bay) * .5;
            vec2 q = vec2((vFace.x - u0) / bay, y / fh), f = fract(q), fw = fwidth(q);
            float mul = 1. - smoothstep(.012, .012 + fw.x * 1.5, abs(f.x - .5));
            float tr = (1. - smoothstep(.01, .01 + fw.y * 1.5, abs(f.y - .64))) * step(.3, f.y);
            glassM = 1. - max(mul, tr); alb = vec3(.86, .84, .8);
          }
          // штукатурка: мелкая фактура, разброс тона между домами 3–5 %, грязь у основания
          if (top < .5 && (kind < 1.5 || kind > 10.5 && kind < 11.5 || kind > 12.5 && kind < 13.5)) {
            alb *= .955 + .09 * vnoise(vec2(vWp.x + vWp.z, vWp.y) * 3.1) * vnoise(vec2(vWp.x - vWp.z, vWp.y) * .7 + 3.);
            alb *= .97 + .06 * h21(vec2(seed, 7.));
            alb *= mix(.8, 1., smoothstep(.0, 1.3, y)) * mix(.93, 1., smoothstep(0., 9., y));
          }
          if (kind > 5.5 && kind < 6.5) alb = vCol;
          if (uRetro > .5 && lod > 1.5) {   // PS2: простая версия дома — плоский фасад с нарисованными окнами, простая крыша
            alb = vCol * (.92 + .08 * top); curtain = 0.; glassM = 0.;
            if (top < .5 && kind < 1.5) {
              vec2 q = vec2(vFace.x / max(vW.x * 1.4, 2.4), y / vW.y), f = fract(q);
              float row = step(1., floor(q.y)) * step(floor(q.y), floor((vK.w - .6) / vW.y) - 1.);
              float wnd = step(.22, f.x) * step(f.x, .78) * step(.3, f.y) * step(f.y, .78) * row;   // окна без рам, «текстурой» — ступенькой, без сглаживания
              float lit = step(.82, h21(floor(q) + vW.w));
              alb = mix(alb, mix(vec3(.16, .24, .34), vec3(.72, .6, .38), lit), wnd);
              float base0 = 1. - step(vW.y * .9, y);                                            // первый этаж — тёмная полоса витрин
              alb = mix(alb, vec3(.2, .22, .26), base0 * step(.15, f.x) * step(f.x, .85) * .8);
            }
          }
          else if (lod > 1.5 && curtain < .5) { alb = mix(vCol, vec3(.72, .74, .78), .7); if (top < .5 && kind < 1.5) { float fb = fract(y / fh); alb *= mix(.72, 1., smoothstep(.0, .25, fb) * (1. - smoothstep(.75, .95, fb))); } }   // LOD 2: полосы этажей вместо окон
          // мягкий AO у вертикальных рёбер грани и у земли
          if (top < .5 && kind < 1.5) aoF *= mix(.82, 1., smoothstep(0., 1.4, ef.x));
        }
        if (clay > .5) alb = CLAY * (1.12 + .1 * top);   // глина средне-серая: и в тени не проваливается в тёмный
        if (disk > .5) alb = CLAY * 1.05;   // на диске — светлая глина, не тёмный сланец
        float ao = mix(.7, 1., smoothstep(0., 5., y)) * aoF;
        vec3 c = alb * lightAt(vWp, n, ao);
        if (glassM > .001 && clay < .5 && disk < .5) {
          vec3 rdir = reflect(-V, n);
          float fres = .06 + .94 * pow(1. - max(dot(n, V), 0.), 5.);
          vec3 refl = skyRefl(rdir);
          // в стекле отражаются соседние дома: зубчатый «силуэт» по азимуту отражённого луча
          float az = atan(rdir.x, rdir.z);
          float sky = .06 + .2 * floor(vnoise(vec2(az * 9. + seed, 1.)) * 4.) / 4.;
          refl = mix(refl, mix(vec3(.45, .43, .42), uSkyHor, .35) * .7, (1. - smoothstep(sky - .01, sky + .01, rdir.y)) * curtain);
          vec3 inside = vec3(.05, .055, .065) * (.6 + .8 * h31(vec3(floor(vFace.xy / vec2(vW.x, fh)), seed)));
          float sun = pow(max(dot(rdir, uSunDir), 0.), 180.) * shadowAt(vWp, n);
          vec3 tint = curtain > .5 ? mix(vec3(1.), vCol / max(max(vCol.r, vCol.g), vCol.b), .7) : vec3(1.);
          float tv = .9 + .2 * h31(vec3(floor(vFace.x / vW.x), floor(y / fh), seed + 4.));   // разный тон стекла по окнам
          vec3 gc = mix(inside, refl * tint * tv * (curtain > .5 ? .8 : 1.), curtain > .5 ? mix(.55, .92, fres + .25) : mix(.35, .75, fres)) + uSunCol * sun * 1.2;
          c = mix(c, gc, glassM);
        }
        if (vE.w > 1.5 && top > .5) c += uSunCol * pow(max(dot(reflect(-V, n), uSunDir), 0.), 60.) * spec;
        if (kind > 6.5 && kind < 7.5) c = vCol * (.6 + 1.6 * step(.45, fract(uTime * .55 + vW.w * .013)));
        // глина читается как модель без отрисовки: рёбра и сетка этажей/пролётов тёмными линиями
        if (clay > .5 && top < .5 && kind < 1.5) {
          vec2 gq = vec2(vFace.x / max(vW.x * 2., 2.), y / fh); vec2 gw = fwidth(gq) * 3.;
          vec2 gl = 1. - smoothstep(vec2(0.), gw, min(fract(gq), 1. - fract(gq)));
          c = mix(c, c * 1.35 + .04, max(gl.x, gl.y) * .6 * (1. - clamp(max(gw.x, gw.y) * 1.5, 0., 1.)));
          // проёмы окон — тёмные ниши без стекла: модель без материалов
          vec2 q2 = vec2(vFace.x / vW.x, y / fh), f2 = fract(q2), w2 = fwidth(q2);
          float hole = smoothstep(.22 - w2.x, .22 + w2.x, f2.x) * (1. - smoothstep(.78 - w2.x, .78 + w2.x, f2.x)) * smoothstep(.3 - w2.y, .3 + w2.y, f2.y) * (1. - smoothstep(.78 - w2.y, .78 + w2.y, f2.y)) * step(1., floor(q2.y)) * step(floor(q2.y), floor((vK.w - .6) / fh) - 1.);
          c *= 1. - hole * .38 * (1. - clamp(max(w2.x, w2.y) * 2., 0., 1.));
        }
        float edgeT = 1. - smoothstep(ew * 2., ew * 3.5, e);
        if (clay > .5) { float lc = dot(c, vec3(.3, .55, .15)); c = mix(vec3(lc), c, .15); }       // глина — без цвета даже в тёплом свете
        if (lod > 1.5 && clay < .5 && uRetro < .5) c = mix(c, c * .25, edgeT * step(kind, 8.5));
        if (uRetro > .5 && lod > 1.5 && uHl.z > .5) { float band = 1. - smoothstep(25., 60., abs(distance(vWp.xz, uHl.xy) - uHl.z)); float eY = 1. - smoothstep(ew * 9., ew * 12., e); c = mix(c, vec3(1., .78, .24) * 1.3, eY * band * step(kind, 1.5)); }   // жёлтая волна по рёбрам простых домов
        if (clay > .5) c = mix(c, vec3(.97, .95, .9) * (.75 + .25 * dot(lightAt(vWp, n, 1.), vec3(.33))), edgeT * .9 * (1. - uExplode));   // глина: светлые рёбра-каркас (у кусков «рассыпания» — нет)
        if (clay > .5 && uWedgeClay > .5) c *= .85;                                       // вне клина темнее на 15 %
        if (uOccl > .001 && vOcc > 1.5) c = mix(c, vec3(.97, .95, .9), edgeT * uOccl);   // закрывающий дом обведён
        if (uExplode > .05 && clay > .5) c = mix(c, vec3(.62, .57, .5) * dot(lightAt(vWp, n, 1.), vec3(.4)), .7);   // куски — глина #CFC7BA
        if (uDim > .001 && clay > .5) c = mix(c, uSkyHor * .9, uDim * .7);             // «гаснет»
        c = mix(c, vec3(1., .78, .24) * 1.3, seamAt(vWp, length(fwidth(vWp))));   // шов видимости — фирменный жёлтый
        if (disk > .5) { c = vec3(dot(c, vec3(.3, .55, .15))); c = mix(c, c * .7, edge); }   // на диске — светлая глина, тонкие рёбра
        if (memS > .5) { float lm = dot(c, vec3(.3, .55, .15)); c = mix(vec3(lm), c, .4) * .82; }
        if (uMech > .001 && inF > .5) c = mix(c, c * vec3(1.12, 1.04, .86), uWedge * .6);   // в клине — тёплый «свет взгляда»
        if (uMech > .001 && inF > .5) { float rising = load * (1. - load) * 4.; c = mix(c, vec3(1., .78, .24) * 1.6, edge * rising * uFront); }
        if (uLod > .5) { float dB = distance(cameraPosition.xz, vWp.xz); float flash = exp(-abs(dB - uLod1) / 12.) + exp(-abs(dB - uLod2) / 12.); c = mix(c, vec3(1.), edge * clamp(flash, 0., 1.) * .8); }
        gl_FragColor = vec4(applyFog(c, d, y), depthA(d));
      }`,
  });
  m.extensions = { derivatives: true };
  return new THREE.Mesh(g, m);
}

// ——— земля: сухой асфальт, светлые тротуары, разметка, набережная и пляж, газоны; тени от солнца ———
export function buildGround(refl) {
  const types = { city: 0, park: 1, plaza: 2, shore: 3, water: 4 };
  const nI = C.grid.avX.length - 1, nJ = C.grid.stZ.length - 1;
  const data = new Uint8Array(nI * nJ * 4);
  for (const b of C.blocks) { const o = (b.j * nI + b.i) * 4; data[o] = types[b.type] * 40; data[o + 3] = 255; }
  const tex = new THREE.DataTexture(data, nI, nJ, THREE.RGBAFormat); tex.needsUpdate = true;
  const g = new THREE.PlaneGeometry(6000, 6000, 1, 1); g.rotateX(-Math.PI / 2);
  U.tRefl = { value: refl.getRenderTarget().texture }; U.uReflMat = { value: refl.material.uniforms.textureMatrix.value };
  U.tBlocks = { value: tex }; U.uNB = { value: new THREE.Vector2(nI, nJ) };
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: COMMON + /* glsl */`varying vec3 vWp; void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vWp = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + /* glsl */`
      uniform sampler2D tBlocks; uniform vec2 uNB; varying vec3 vWp;
      float blockType(vec2 p){
        vec2 ij = floor(vec2((p.x - uGrid.x) / uGrid.y, (p.y - uGrid.z) / uGrid.w));
        if (ij.x < 0. || ij.y < 0. || ij.x >= uNB.x || ij.y >= uNB.y) return 5.;
        return floor(texture2D(tBlocks, (ij + .5) / uNB).r * 255. / 40. + .5);
      }
      void main(){
        if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        vec2 p = vWp.xz;
        if (inWater(p) > .5) discard;
        float d = distance(cameraPosition, vWp);
        vec2 bd = (p - uBay.xy) / uBay.zw; float shoreE = (length(bd) - 1.) * min(uBay.z, uBay.w);
        float bt = blockType(p);
        float ax = uGrid.x + floor((p.x - uGrid.x) / uGrid.y + .5) * uGrid.y, hwA = abs(ax) < 1. ? 15. : 8.;
        float sz = uGrid.z + floor((p.y - uGrid.z) / uGrid.w + .5) * uGrid.w, hwS = 7.;
        float dA = abs(p.x - ax) - hwA, dS = abs(p.y - sz) - hwS;
        bool inMap = bt < 4.5;
        float road = inMap ? max(step(dA, 0.), step(dS, 0.)) : 0.;
        float side = inMap ? (1. - road) * max(step(dA, 4.), step(dS, 4.)) : 0.;
        float fw = length(fwidth(p));
        float curbD = min(abs(dA), abs(dS));
        float gn = fbm(p * .35) * .6 + fbm(p * 2.1) * .4;
        vec3 c = vec3(.38, .35, .31) * (.88 + .24 * gn);
        if (road > .5) c = vec3(.085, .088, .095) * (.8 + .4 * gn);
        if (bt > .5 && bt < 1.5 && road < .5 && side < .5) c = vec3(.2, .23, .15) * (.7 + .6 * gn);   // газон — оливково-шалфейный
        if (bt > 2.5 && road < .5) {
          vec2 tg = abs(fract(p / 3.) - .5); float tile = 1. - smoothstep(.47, .5, max(tg.x, tg.y)) * .12;
          c = vec3(.62, .55, .45) * tile * (.9 + .2 * gn);
          c = mix(c, vec3(.72, .6, .42) * (.9 + .2 * gn), smoothstep(26., 14., shoreE));
          c = mix(c, vec3(.5, .42, .3) * (.9 + .2 * gn), smoothstep(4., 0., shoreE));
        }
        if (!inMap) c = vec3(.45, .4, .33) * (.8 + .4 * gn);
        float curb = side * (1. - smoothstep(0., fw * 2. + .14, curbD));
        c = mix(c, vec3(.7, .68, .64), curb);
        if (abs(p.x) < 3. && road > .5 && dS > 0.) c = vec3(.21, .24, .16) * (.8 + .4 * gn);
        float mark = 0.;
        if (road > .5) {
          float onAv = step(dA, 0.) * step(0., dS), onSt = step(dS, 0.) * step(0., dA);
          float cx = abs(abs(p.x - ax) - (abs(ax) < 1. ? 7.5 : 0.)), cz = abs(p.y - sz);
          mark += onAv * (1. - smoothstep(.1, .1 + fw, cx)) * step(.5, fract(p.y / 9.)) * step(abs(ax), 1.);
          mark += onAv * (1. - smoothstep(.08, .08 + fw, abs(p.x - ax))) * step(.45, fract(p.y / 7.)) * step(1., abs(ax));
          mark += onSt * (1. - smoothstep(.08, .08 + fw, cz)) * step(.45, fract(p.x / 7.));
        }
        float zz = 0.;
        if (dA < -.4 && dS > .6 && dS < 4.2) zz = step(.5, fract(p.x / 1.25));
        if (dS < -.4 && dA > .6 && dA < 4.2) zz = max(zz, step(.5, fract(p.y / 1.25)));
        mark = clamp(max(mark, zz * (inMap ? 1. : 0.)), 0., 1.) * (.8 + .2 * gn);
        c = mix(c, vec3(.75, .74, .7), mark * .85);
        float clay = voidAt(vWp);
        if (uMech > .001) {
          float load = loadOf(cellCenter(p)), inW = wedgeOf(p, 0.);
          vec2 cc = cellCenter(p), cd = abs(p - cc), half_ = vec2(uGrid.y, uGrid.w);
          float cellLine = 1. - smoothstep(fw * 1.2, fw * 2.6, min(half_.x - cd.x, half_.y - cd.y));
          if (load < .5) { c = CLAY * 1.15; }
        }
        if (clay > .5) { float l = dot(c, vec3(.3, .55, .15)); c = mix(CLAY * .72, CLAY * .4, smoothstep(.1, .02, l)); c = mix(c, c * .6, mark * .5); }
        vec3 col = c * lightAt(vWp, vec3(0., 1., 0.), 1.);
        if (clay > .5) { float ln = 1. - smoothstep(fw * .8, fw * 2., curbD); col = mix(col, vec3(.9, .88, .84), ln * .55 * (inMap ? 1. : 0.)); }
        col = mix(col, vec3(1., .78, .24) * 1.3, seamAt(vWp, fw));
        if (clay > .5) { float lc = dot(col, vec3(.3, .55, .15)); col = mix(vec3(lc), col, .15); }
        if (uClay > 1.5) { vec4 sc = uSunMat * vec4(vWp, 1.); vec3 pp = sc.xyz / sc.w * .5 + .5; gl_FragColor = vec4(shadowAt(vWp, vec3(0., 1., 0.)), texture2D(tShadow, pp.xy).r, pp.z, 1.); return; }
        if (uMech > .001) {
          float load = loadOf(cellCenter(p)), inW0 = wedgeOf(p, 0.);
          float lg = dot(col, vec3(.3, .55, .15));
          if (load < .5) col = vec3(lg) * .92;                                          // на диске — светлая глина
          else if (inW0 < .5) col = mix(vec3(lg), col, .4) * .82;
        }
        if (uMech > .001) {
          vec2 v = p - uHero; float dh = length(v);
          float inW = wedgeOf(p, 0.);
          float a = acos(clamp(dot(v / max(dh, .001), uDir), -1., 1.));
          float wEdge = (1. - smoothstep(fw * 3., fw * 5.5, abs(a - uHalf) * dh)) * step(dh, uRange);
          vec3 acc = vec3(1., .58, .045);
          col = mix(col, acc * 1.4, uWedge * wEdge);
          col = mix(col, mix(col * vec3(1.08, 1.03, .9), acc * 1.3, .12), uWedge * inW);   // заливка клина ~12 %
          float ring = 1. - smoothstep(fw * 3., fw * 5.5, abs(dh - uRingR));
          col = mix(col, mix(vec3(.93, .91, .87), acc * 1.4, uRingY), uRing * ring);   // кольцо серое, жёлтое — только по слову
          // скан режет город на клетки: швы 4 px светлые, появляются за фронтом
          vec2 cc2 = cellCenter(p), cd2 = abs(p - cc2);
          float cl2 = 1. - smoothstep(fw * 1.6, fw * 3.2, min(uGrid.y - cd2.x, uGrid.w - cd2.y));
          col = mix(col, vec3(.96, .94, .9), cl2 * step(p.y, uScanZ) * step(uScanZ, 9e4) * .85);
          col = mix(col, acc * 1.4, cl2 * step(p.y, uScanZ) * step(uScanZ, 9e4) * uWedge * inW * step(.5, loadOf(cc2)));
          float sf = exp(-abs(p.y - uScanZ) / 6.) * step(uScanZ, 9e4); col += vec3(.5, .48, .42) * sf;   // фронт скана
        }
        if (uDim > .001 && uMech > .001) col = mix(col, uSkyHor * .9, uDim * .85 * (1. - wedgeOf(p, 0.)));
        gl_FragColor = vec4(applyFog(col, d, 0.), depthA(d));
      }`,
  });
  m.extensions = { derivatives: true };
  return new THREE.Mesh(g, m);
}

// ——— море и бухта: бирюза у берега → синева, отражение неба и города, солнечные блики ———
export function buildWater(refl) {
  const g = new THREE.PlaneGeometry(8000, 8000, 1, 1); g.rotateX(-Math.PI / 2); g.translate(0, C.water.level, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: COMMON + /* glsl */`
      uniform mat4 uReflMat; varying vec3 vWp; varying vec4 vR;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vWp = wp.xyz; vR = uReflMat * vec4(wp.x, -wp.z, 0., 1.); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + /* glsl */`
      uniform sampler2D tRefl; varying vec3 vWp; varying vec4 vR;
      void main(){
        if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        vec2 p = vWp.xz; float t = uTime;
        vec3 V = normalize(cameraPosition - vWp);
        float d = distance(cameraPosition, vWp);
        float e = .35, s = .55; vec2 o = vec2(t * .2, t * .05);
        float h0 = fbm(p * s + o), hx = fbm((p + vec2(e, 0.)) * s + o), hz = fbm((p + vec2(0., e)) * s + o);
        vec3 n = normalize(vec3((h0 - hx) * 1.2, 1., (h0 - hz) * 1.2));
        float fres = .02 + .98 * pow(1. - max(dot(n, V), 0.), 5.);
        vec2 ruv = vR.xy / vR.w + n.xz * .03 / (1. + d / 400.);
        vec3 rc = texture2D(tRefl, ruv).rgb;
        vec2 bd = (p - uBay.xy) / uBay.zw; float shoreE = (1. - length(bd)) * min(uBay.z, uBay.w);
        float shallow = smoothstep(60., 0., p.y < uSeaZ ? shoreE : 999.);
        vec3 body = mix(vec3(.22, .5, .5), vec3(.34, .65, .6), shallow);   // пастельное море #9FD3CB
        vec3 c = body * lightAt(vWp, vec3(0., 1., 0.), 1.) * .55 + rc * fres * .9;
        float sun = pow(max(dot(reflect(-V, n), uSunDir), 0.), 400.);
        c += uSunCol * sun * 2.5;
        c = mix(c, vec3(.6, .65, .6) * lightAt(vWp, vec3(0., 1., 0.), 1.), smoothstep(.6, .95, fbm(p * vec2(.4, 1.5) + t * .3)) * shallow * .25);
        if (voidAt(vWp) > .5) c = vec3(dot(c, vec3(.3, .55, .15)));
        gl_FragColor = vec4(applyFog(c, d, 0.), depthA(d));
      }`,
  });
  m.extensions = { derivatives: true };
  return new THREE.Mesh(g, m);
}

// ——— небо: у горизонта тёплый персик, вверху мягкий голубой; рассеяние у солнца; редкие облака, подсвеченные солнцем ———
export function buildSky() {
  const g = new THREE.SphereGeometry(5200, 48, 24);
  const m = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD; void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vD = wp.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * wp; gl_Position.z = gl_Position.w * .99999; }`,
    fragmentShader: COMMON + /* glsl */`
      varying vec3 vD;
      void main(){
        if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        vec3 d = normalize(vD); float h = d.y;
        vec3 c = mix(uSkyHor, uSkyTop, smoothstep(-.02, .5, h));
        float sd = max(dot(d, uSunDir), 0.);
        c += uSunCol * .05 * pow(sd, 8.) + uSunCol * .02 * pow(sd, 2.);
        c += uSunCol * 2. * smoothstep(.9994, .9996, sd);
        vec2 cp = d.xz / max(h + .08, .05) * 1.2;
        float cl = smoothstep(.5, .8, fbm(cp * .8 + vec2(uTime * .006, 0.))) * smoothstep(.0, .1, h) * (1. - smoothstep(.3, .6, h));
        vec3 cloud = mix(uSkyHor * 1.15, vec3(1.), .25) + uSunCol * .08 * pow(sd, 3.);
        c = mix(c, cloud, cl * .55);
        c = mix(uFogCol, c, smoothstep(-.03, .04, h));
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  return new THREE.Mesh(g, m);
}
