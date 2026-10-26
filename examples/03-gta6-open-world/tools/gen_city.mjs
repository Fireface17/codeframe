// Генератор города — единственный источник данных для всех видов (стиль A и B, все механики).
//   node tools/gen_city.mjs            → city.json + js/city-data.js (оба генерируемые, руками не править)
// Координаты в метрах: x — восток, z — юг (как в three.js), y — вверх. Сид фиксирован → город всегда одинаковый.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 20261119;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = mulberry(SEED);
const pick = a => a[Math.floor(R() * a.length)];
const r1 = v => Math.round(v * 10) / 10;

// —— сетка улиц ——
const AV = { x0: -960, x1: 960, step: 96 };          // авеню (север–юг), x
const ST = { z0: -1120, z1: 640, step: 80 };          // улицы (запад–восток), z
const avX = []; for (let x = AV.x0; x <= AV.x1; x += AV.step) avX.push(x);
const stZ = []; for (let z = ST.z0; z <= ST.z1; z += ST.step) stZ.push(z);
const avW = x => x === 0 ? 30 : 16;                   // главная авеню с бульваром пальм
const stW = z => 14;
const SIDEWALK = 4;

// —— вода: бухта-эллипс, открытое море на юге ——
const WATER = { bay: { cx: 0, cz: 430, rx: 540, rz: 310 }, seaZ: 700, level: -1.2 };
const inWater = (x, z) => z > WATER.seaZ || ((x - WATER.bay.cx) / WATER.bay.rx) ** 2 + ((z - WATER.bay.cz) / WATER.bay.rz) ** 2 < 1;
// берег: расстояние до воды (грубо, для прибрежных кварталов)
const nearWater = (x, z, d) => [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, d], [d, -d], [-d, -d]].some(([a, b]) => inWater(x + a, z + b));

const DOWNTOWN = { x: 30, z: -420 };
const HERO = { x: 17.2, z: -118, heading: Math.PI };   // идёт по правому тротуару авеню вдоль витрин (фасады с x = 19)       // главная авеню в квартале ар-деко у набережной, смотрит на север (−z), к башням

// —— кварталы ——
const CELL = { sx: 2, sz: 2 };                          // клетка подгрузки = 2×2 квартала
const HLOD = { sx: 4, sz: 4 };                          // группа слияния дальних кварталов = 4×4
const blocks = [], buildings = [], clutter = [], signs = [];
const ncx = Math.ceil((avX.length - 1) / CELL.sx);
const SIGN_WORDS = ['HOTEL', 'BAR', 'OPEN', 'DINER', 'MOTEL', '24/7', 'CLUB', 'TACOS', 'SURF', 'NOODLES', 'PARKING', 'LIVE'];
const SIGN_COL = [0, 0, 1, 2, 2];                       // индексы в палитре неона: 0 бирюза, 1 коралл, 2 тёплый белый

for (let i = 0; i < avX.length - 1; i++) for (let j = 0; j < stZ.length - 1; j++) {
  const xa = avX[i], xb = avX[i + 1], za = stZ[j], zb = stZ[j + 1];
  const b = { id: blocks.length, i, j, x0: xa + avW(xa) / 2, x1: xb - avW(xb) / 2, z0: za + stW(za) / 2, z1: zb - stW(zb) / 2 };
  b.cx = (b.x0 + b.x1) / 2; b.cz = (b.z0 + b.z1) / 2;
  b.cell = Math.floor(i / CELL.sx) + Math.floor(j / CELL.sz) * ncx;
  b.hlod = Math.floor(i / HLOD.sx) + Math.floor(j / HLOD.sz) * 100;
  const corners = [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]];
  const wet = corners.filter(([x, z]) => inWater(x, z)).length;
  if (inWater(b.cx, b.cz) && wet >= 3) { b.type = 'water'; blocks.push(b); continue; }
  if (wet > 0 || nearWater(b.cx, b.cz, 30)) { b.type = 'shore'; blocks.push(b); continue; }
  const dd = Math.hypot(b.cx - DOWNTOWN.x, (b.cz - DOWNTOWN.z) * 1.2);
  const seaFront = nearWater(b.cx, b.cz, 110);
  const dHero = Math.hypot(b.cx - HERO.x, b.cz - HERO.z);
  b.type = R() < 0.05 && dd > 300 && dHero > 160 ? 'park' : R() < 0.03 && dHero > 160 ? 'plaza' : 'city';
  b.dist = Math.round(dd);
  blocks.push(b);
  if (b.type !== 'city') continue;

  // —— дома в квартале ——
  const ix0 = b.x0 + SIDEWALK, ix1 = b.x1 - SIDEWALK, iz0 = b.z0 + SIDEWALK, iz1 = b.z1 - SIDEWALK;
  const towerP = Math.exp(-((dd / 330) ** 2));
  const tower = R() < towerP * 0.9 && dHero > 240;          // у героя — низкий Ocean Drive, башни впереди
  const nx = tower ? (R() < 0.5 ? 1 : 2) : pick([2, 2, 3, 3, 4]);
  const nz = tower ? 1 : pick([1, 2, 2]);
  const cutsX = [ix0]; for (let k = 1; k < nx; k++) cutsX.push(ix0 + (ix1 - ix0) * (k + (R() - 0.5) * 0.35) / nx); cutsX.push(ix1);
  const cutsZ = [iz0]; for (let k = 1; k < nz; k++) cutsZ.push(iz0 + (iz1 - iz0) * (k + (R() - 0.5) * 0.3) / nz); cutsZ.push(iz1);
  for (let a = 0; a < nx; a++) for (let c = 0; c < nz; c++) {
    if (!tower && R() < 0.06) continue;                // пустырь / двор
    const gap = R() < 0.4 ? 0 : 1.5;                   // переулок
    let x0 = cutsX[a] + (a ? gap / 2 : 0), x1 = cutsX[a + 1] - (a < nx - 1 ? gap / 2 : 0);
    let z0 = cutsZ[c] + (c ? gap / 2 : 0), z1 = cutsZ[c + 1] - (c < nz - 1 ? gap / 2 : 0);
    let floors;
    if (tower) floors = 18 + Math.floor(R() * 30 * (0.5 + towerP * 0.5));
    else if (seaFront) floors = 6 + Math.floor(R() * 10);               // отели набережной
    else floors = Math.max(2, Math.round((2 + R() * 5) + towerP * (4 + R() * 10)));
    const nearHero = dHero < 270 && !tower;                                   // квартал героя: Ocean Drive — 3–7 этажей, ар-деко
    if (nearHero) floors = 3 + (floors % 5);
    const fh = r1(3.1 + R() * 0.5);
    const rc = R();
    // материал (пастельный Майами): 0 мятный, 1 персиковый, 2 коралловый, 3 лавандовый, 4 кремовый, 5 светло-бирюзовый,
    // 6 стекло башни, 7 белый бетон башни
    const col = tower ? (rc < 0.3 ? 6 : rc < 0.55 ? 8 : rc < 0.75 ? 9 : 7) : [0, 1, 2, 3, 4, 5, 4, 1][Math.floor(rc * 8)];
    const ty = col === 6 || col === 8 || col === 9 ? 2 : tower ? 1 : seaFront ? (R() < 0.5 ? 3 : 0) : pick([0, 0, 1, 3]);
    const bay = r1(ty === 2 ? 1.7 + R() * 0.5 : ty === 3 ? 2.8 + R() * 0.8 : 2.0 + R() * 0.9);
    const h = r1(floors * fh);
    const bld = {
      id: buildings.length, b: b.id, cell: b.cell, hlod: b.hlod,
      x0: r1(x0), x1: r1(x1), z0: r1(z0), z1: r1(z1), h, fh, floors, ty, bay,
      col, lit: r1(0.12 + R() * 0.22), seed: Math.floor(R() * 9973),
    };
    if (!tower && ty !== 2 && R() < 0.3) bld.balc = 1;                       // балконы у 30 % жилых
    if (!tower && floors <= 8 && R() < (seaFront || nearHero ? 0.88 : 0.45)) bld.deco = 1; // ар-деко: скруглённые углы, козырьки, плавники, иллюминаторы
    if (R() < 0.15) bld.roof = R() < 0.55 ? 'green' : 'pool';               // терраса с зеленью или бассейн
    // уступ у верха башни
    if (tower && R() < 0.65 && (x1 - x0) > 20) {
      const ins = r1(3 + R() * 5), h2 = r1(h + fh * (3 + Math.floor(R() * 8)));
      bld.tier = { ins, h: h2 };
    }
    buildings.push(bld);
    // мусор на крыше: короба, будки, баки
    const top = bld.tier ? bld.tier.h : h, ins = bld.tier ? bld.tier.ins : 0;
    const w = x1 - x0 - 2 * ins, d = z1 - z0 - 2 * ins;
    // крыша: 2–4 предмета [тип 0 короб вентиляции, 1 будка лестницы, 2 бак-цилиндр, 3 мачта с красным огнём]
    if (w > 7 && d > 7) {
      const n = 2 + Math.floor(R() * 3), used = [];
      for (let k = 0; k < n; k++) {
        const t = k === 0 ? 1 : R() < 0.4 ? 0 : R() < 0.7 ? 2 : 3;
        const s0 = t === 1 ? 3.6 + R() * 1.8 : t === 2 ? 3.2 + R() * 1.4 : t === 3 ? 0.35 : 2.2 + R() * 2;
        const px = x0 + ins + 1.4 + R() * Math.max(0.1, w - 2.8 - s0), pz = z0 + ins + 1.4 + R() * Math.max(0.1, d - 2.8 - s0);
        const hgt = t === 1 ? 3.0 : t === 2 ? 4.2 + R() * 1.5 : t === 3 ? 8 + R() * 10 : 1.4 + R() * 1.2;
        clutter.push([bld.id, r1(px), r1(px + s0), r1(pz), r1(pz + s0 * (t === 0 ? 0.7 + R() * 0.6 : 1)), r1(top), r1(top + hgt), t]);
      }
    }
    // неоновая вывеска на фасаде, выходящем на улицу (низкие и средние дома, отели)
    const onMain = Math.abs(x0 - 15 - SIDEWALK) < 1 || Math.abs(x1 + 15 + SIDEWALK) < 1;   // фасад на главную авеню
    if ((!tower || onMain) && floors >= 3 && R() < (onMain ? 0.85 : seaFront ? 0.7 : 0.35)) {
      const faces = [];
      if (Math.abs(x0 - ix0) < 0.5) faces.push('w'); if (Math.abs(x1 - ix1) < 0.5) faces.push('e');
      if (Math.abs(z0 - iz0) < 0.5) faces.push('n'); if (Math.abs(z1 - iz1) < 0.5) faces.push('s');
      if (faces.length) {
        const face = onMain ? (Math.abs(x0 - 15 - SIDEWALK) < 1 && faces.includes('w') ? 'w' : faces.includes('e') ? 'e' : pick(faces)) : seaFront && faces.includes('s') ? 's' : pick(faces);
        const txt = seaFront && R() < 0.6 ? pick(['HOTEL', 'MOTEL', 'SURF', 'BAR']) : pick(SIGN_WORDS);
        const vr = R();                                    // число вызовов R() не меняем — город остаётся тем же
        const vertical = onMain ? floors >= 4 : vr < 0.45 && floors >= 5;   // на главной авеню — лопасти поперёк фасада, читаются вдоль улицы
        signs.push({ bld: bld.id, face, txt, col: pick(SIGN_COL), vertical, size: 0.8, y: r1(vertical ? fh * 1.4 : Math.min(h - 3, fh * (1.6 + R() * 2))), u: r1(0.25 + R() * 0.5) });
      }
    }
  }
}

// —— пальмы: бульвар главной авеню + набережная по линии берега ——
const palms = [];
for (let z = -1100; z < 110; z += 17) if (!inWater(0, z) && !(z > HERO.z - 70 && z < HERO.z + 12)) palms.push([0, z, r1(9 + R() * 4), r1((R() - 0.5) * 0.25), r1(R() * 6.28), Math.floor(R() * 3)]);
for (let a = 0; a < Math.PI * 2; a += 0.02) {
  const x = WATER.bay.cx + Math.cos(a) * (WATER.bay.rx + 14), z = WATER.bay.cz + Math.sin(a) * (WATER.bay.rz + 14);
  if (z > WATER.seaZ - 20 || inWater(x, z)) continue;
  if (Math.abs(x % AV.step) < 12) continue;            // не на перекрёстке
  palms.push([r1(x), r1(z), r1(8 + R() * 6), r1((R() - 0.5) * 0.5), r1(R() * 6.28), Math.floor(R() * 3)]);
}

// —— машины: полосы по правилу (у каждой авеню и улицы две полосы, по направлению) ——
// пальмы вдоль тротуаров главной авеню у героя и зонтики: кафе у ар-деко на авеню, пляж у бухты
for (const sx of [-1, 1]) for (let z = HERO.z - 330; z < HERO.z + 70; z += 22) {
  const st = stZ.reduce((m, a) => Math.abs(z - a) < Math.abs(z - m) ? a : m, 1e9);
  if (z > HERO.z - 120 && z < HERO.z + 20) continue;                 // у героя пальмы не закрывают фасады ар-деко
  if (sx > 0 && z >= HERO.z + 20 && z < HERO.z + 160) continue;      // кульминация: пальма не растёт из головы героя
  if (Math.abs(z - st) < 10 || inWater(sx * 16.2, z) || (Math.abs(sx * 16.2 - HERO.x) < 3 && Math.abs(z - HERO.z) < 9)) continue;
  palms.push([r1(sx * 16.2), r1(z), r1(10 + R() * 4), r1((R() - 0.5) * 0.3), r1(R() * 6.28), Math.floor(R() * 3)]);
}
// пальмы у бордюра впереди героя: их длинные тени ложатся поперёк тротуара в хуке
for (const dz of [-30, -52]) palms.push([14.8, r1(HERO.z + dz), r1(11 + R() * 2), r1((R() - .5) * .3), r1(R() * 6.28), Math.floor(R() * 3)]);
const umbrellas = [];
for (const b of buildings) {
  if (!b.deco) continue;
  const onW = Math.abs(b.x0 - 19) < 1, onE = Math.abs(b.x1 + 19) < 1;
  if (!(onW || onE) || b.z1 < HERO.z - 300 || b.z0 > HERO.z + 60 || R() < 0.35) continue;
  const x = onW ? 18.3 : -18.3, n = 2 + Math.floor(R() * 2), c = Math.floor(R() * 4);
  for (let k = 0; k < n; k++) { const z = b.z0 + 3 + (b.z1 - b.z0 - 6) * (k + 0.5) / n; if (Math.abs(z - HERO.z) < 8 && Math.abs(x - HERO.x) < 3) continue; umbrellas.push([x, r1(z), c, 1.25, 0]); }
}
for (let a = 0; a < Math.PI * 2; a += 0.012) {
  for (const k of [20, 28, 36]) {
    const x = WATER.bay.cx + Math.cos(a) * (WATER.bay.rx + k), z = WATER.bay.cz + Math.sin(a) * (WATER.bay.rz + k);
    if (z > WATER.seaZ - 30 || inWater(x, z) || R() < 0.45) continue;
    umbrellas.push([r1(x + (R() - .5) * 3), r1(z + (R() - .5) * 3), Math.floor(R() * 5), 1.1, 1]);
  }
}
const cars = [];
for (let k = 0; k < 900; k++) {
  const along = R() < 0.55;                             // по авеню (вдоль z) или по улице (вдоль x)
  const line = along ? (R() < 0.22 ? 0 : pick(avX)) : pick(stZ);   // главная авеню гуще
  const dir = R() < 0.5 ? 1 : -1;
  const s0 = r1(R() * 2000), v = r1(9 + R() * 8);
  cars.push([along ? 1 : 0, line, dir, s0, v, Math.floor(R() * 5)]);
}

// детализация (отдельный хеш от id — основной ГПСЧ не трогаем, город остаётся тем же)
const hb = (id, k) => { const x = Math.sin(id * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const RELIEF = ['HOTEL', 'OCEAN', 'PALMS', 'CORAL', 'BREEZE', 'SUNSET', 'LIDO', 'AVALON'];
for (const b of buildings) {
  const top = b.tier ? b.tier.h : b.h;
  if (b.floors >= 18) {
    const s = hb(b.id, 1);
    b.shape = s < .3 ? 'round' : s < .58 ? 'chamfer' : 'box';
    // уступы: ещё 1–2 яруса сверху и технический этаж на каждом переходе
    b.extra = []; let ins = b.tier ? b.tier.ins : 0, y = top;
    const n = 1 + Math.floor(hb(b.id, 2) * 1.99);
    for (let k = 0; k < n; k++) { ins += 2.5 + hb(b.id, 3 + k) * 3; const w = Math.min(b.x1 - b.x0, b.z1 - b.z0) - 2 * ins; if (w < 10) break;
      const h = y + b.fh * (3 + Math.floor(hb(b.id, 6 + k) * 6)); b.extra.push({ ins: r1(ins), h0: r1(y), h1: r1(h) }); y = h; }
    b.cap = b.crown || b.mast ? 'land' : ['spire', 'tech', 'flat'][Math.floor(hb(b.id, 9) * 3)];
    b.topAll = r1(y);
  } else b.topAll = top;
  if (b.deco) {
    // пилон с рельефной надписью — на самом длинном фасаде, выходящем на улицу
    const bl = blocks[b.b], ix0 = bl.x0 + SIDEWALK, ix1 = bl.x1 - SIDEWALK, iz0 = bl.z0 + SIDEWALK, iz1 = bl.z1 - SIDEWALK;
    const faces = [];
    if (Math.abs(b.x0 - ix0) < .5) faces.push(['w', b.z1 - b.z0]); if (Math.abs(b.x1 - ix1) < .5) faces.push(['e', b.z1 - b.z0]);
    if (Math.abs(b.z0 - iz0) < .5) faces.push(['n', b.x1 - b.x0]); if (Math.abs(b.z1 - iz1) < .5) faces.push(['s', b.x1 - b.x0]);
    faces.sort((a, c) => c[1] - a[1]);
    if (faces[0] && faces[0][1] > 11 && b.floors >= 3) { b.pylon = faces[0][0]; signs.push({ bld: b.id, face: faces[0][0], txt: RELIEF[Math.floor(hb(b.id, 11) * RELIEF.length)], col: Math.floor(hb(b.id, 12) * 3), pylon: true, u: .5, y: 0 }); }
    b.street = faces.map(f => f[0]);
  }
}
// ориентиры: самая высокая башня даунтауна — «корона», вторая (в другом квартале) — мачта с огнями
const towers = buildings.filter(b => b.floors >= 18).sort((a, b) => (b.tier ? b.tier.h : b.h) - (a.tier ? a.tier.h : a.h));
if (towers[0]) towers[0].crown = 1;
const second = towers.find(b => b.b !== towers[0].b); if (second) second.mast = 34;
const third = towers.find(b => b.b !== towers[0].b && b !== second && Math.abs(b.x0 - towers[0].x0) > 150); if (third) third.crown = 2;
// одна крупная читаемая вывеска на план героя: ближайшая впереди справа на главной авеню
const ahead = signs.filter(sg => { const b = buildings[sg.bld]; const cz = (b.z0 + b.z1) / 2; return b.x0 > 15 && b.x0 < 25 && cz < HERO.z - 25 && cz > HERO.z - 110; })
  .sort((a, b) => buildings[b.bld].z0 - buildings[a.bld].z0);
if (ahead[0]) { ahead[0].size = 1.6; ahead[0].col = 1; ahead[0].vertical = true; ahead[0].txt = 'HOTEL'; }
// группы слияния дальних кварталов (HLOD): габарит и высота по 70-му перцентилю
const hl = {};
for (const b of buildings) (hl[b.hlod] = hl[b.hlod] || []).push(b);
const hlod = Object.entries(hl).map(([id, list]) => { const hs = list.map(b => b.tier ? b.tier.h : b.h).sort((a, b) => a - b);
  return { id: +id, x0: Math.min(...list.map(b => b.x0)), x1: Math.max(...list.map(b => b.x1)), z0: Math.min(...list.map(b => b.z0)), z1: Math.max(...list.map(b => b.z1)), h: hs[Math.floor(hs.length * 0.7)], rep: list[0].id, n: list.length }; });
// припаркованные машины у бордюров главной авеню
const parked = [];
for (const sx of [-1, 1]) for (let z = -760; z < 110; z += 6.4) {
  const st = stZ.reduce((m, a) => Math.abs(z - a) < Math.abs(z - m) ? a : m, 1e9);
  if (Math.abs(z - st) < 12 || R() < 0.3 || inWater(sx * 12.8, z) || (z > HERO.z - 30 && z < HERO.z + 12)) continue;
  parked.push([r1(sx * 12.8), r1(z), sx > 0 ? 0 : Math.PI, Math.floor(R() * 4), R() < 0.15 ? 1 : 0]);
}
// пешеходы на тротуарах главной авеню рядом с героем
const people = [];
for (let k = 0; k < 14; k++) {
  const sx = R() < 0.5 ? -1 : 1;
  people.push([r1(sx * (15 + 1.4 + R() * 2.2)), r1(HERO.z - 18 - R() * 170), R() < 0.5 ? 1 : -1, r1(R() < 0.25 ? 0 : 1.1 + R() * 0.5), Math.floor(R() * 4), r1(R() * 3)]);
}
// светофоры: углы перекрёстков главной авеню
const lights = [];
for (const z of stZ) { if (z < -900 || z > 120 || inWater(0, z)) continue;
  for (const [sx, sz] of [[-1, -1], [1, 1]]) lights.push([sx * 16.2, r1(z + sz * 8.6), sz > 0 ? 0 : Math.PI, r1(R() * 30)]); }

const city = {
  about: 'Город ролика №3: безымянный ночной приморский. Сгенерирован tools/gen_city.mjs, сид ' + SEED + '. Руками не править.',
  units: 'метры; x — восток, z — юг, y — вверх',
  grid: { av: AV, st: ST, avX, stZ, avWidth: { main: 30, other: 16 }, stWidth: 14, sidewalk: SIDEWALK },
  water: WATER, downtown: DOWNTOWN, hero: HERO,
  cell: { blocksX: CELL.sx, blocksZ: CELL.sz, ncx }, hlodGroup: HLOD,
  lamps: { rule: 'вдоль каждой улицы и авеню с обеих сторон, шаг 28 м, сдвиг 14 м, 1,2 м от края тротуара; не в воде и не на перекрёстке', spacing: 28, offset: 14, inset: 1.2, h: 8 },
  palette: {
    bg: '#0E1016', accent: '#FFC83D', light: '#F4F0E6', neutral: '#8C93A3',
    facade: ['#AFC7B9', '#E3C6AE', '#D3ADA0', '#C2BACD', '#E8E0CF', '#AFC9C5', '#8EA2B4', '#DCD8D0', '#94A69C', '#A38E78'],   // пыльная пастель, приглушённое стекло
    facadeNames: ['мятный', 'персиковый', 'коралловый', 'лавандовый', 'кремовый', 'светло-бирюзовый', 'голубое стекло', 'белый бетон', 'зелёное стекло', 'бронзовое стекло'],
    window: ['#F2B872', '#E8C79A', '#F5D7A8', '#9FB8D0'],
    neon: ['#2F7F86', '#D9614F', '#F7F2E6'], lamp: '#FF9E4A', tail: '#E04848', fog: '#2A3346', skyGlow: '#3A3038',
    signs: 'днём вывески крашеные, не светятся: бирюза, коралл, белый',
  },
  blocks: blocks.map(b => ({ id: b.id, i: b.i, j: b.j, x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, type: b.type, cell: b.cell, hlod: b.hlod })),
  buildings,
  clutter: { fields: ['bld', 'x0', 'x1', 'z0', 'z1', 'y0', 'y1', 'type: 0 короб, 1 будка, 2 бак, 3 мачта'], rows: clutter },
  signs,
  hlodGroups: hlod,
  umbrellas: { fields: ['x', 'z', 'color', 'radius', 'beach'], rows: umbrellas },
  parked: { fields: ['x', 'z', 'rot', 'kind', 'lightsOn'], rows: parked },
  people: { fields: ['x', 'z0', 'dir', 'speed (0 — стоит)', 'model', 'phase'], rows: people },
  trafficLights: { fields: ['x', 'z', 'rot', 'phase'], rows: lights, cycle: 'зелёный 0–14 с, жёлтый 14–17, красный 17–30' },
  palms: { fields: ['x', 'z', 'h', 'lean', 'rot', 'variant'], rows: palms },
  cars: { fields: ['alongZ', 'line', 'dir', 's0', 'speed', 'kind'], rows: cars, rule: 'полоса: смещение 3,5 м вправо от оси по ходу; позиция s = s0 + speed·t по модулю длины линии' },
};
const json = JSON.stringify(city);
writeFileSync(path.join(ROOT, 'city.json'), json);
writeFileSync(path.join(ROOT, 'js/city-data.js'), '// генерируется tools/gen_city.mjs — не править\nwindow.CITY = ' + json + ';\n');
const cnt = t => blocks.filter(b => b.type === t).length;
console.log(`landmarks: crown ${towers[0] && towers[0].id}, mast ${second && second.id}; big sign ${ahead[0] && ahead[0].bld}; hlod ${hlod.length}, parked ${parked.length}, people ${people.length}, lights ${lights.length}`);
console.log(`blocks ${blocks.length} (city ${cnt('city')}, shore ${cnt('shore')}, water ${cnt('water')}, park ${cnt('park')}), buildings ${buildings.length}, clutter ${clutter.length}, signs ${signs.length}, palms ${palms.length}, cars ${cars.length}, ${(json.length / 1024).toFixed(0)} KB`);
