// Ролик №3 «GTA 6: что у тебя за спиной» — таймлайн v2. Кадр = функция t: FILM.at(t) отдаёт состояние 3D-сцены
// (камера, механики, свет), FILM.makeUI — SVG поверх (подписи, приборы, субтитры). Cues — от слов озвучки (WORDS).
// Биты: хук (герой оборачивается — шов «цвет / глина») · план 1 (кран → клин на юг → перекрытие → «Ведьмак») ·
// план 2 (лоток PS5 · 16 ГБ → скан клеток → герой бежит → слияние дальних кварталов) · «2002 · PS2» · гонка дисков ·
// кульминация (медленный разворот, волна подгрузки обгоняет взгляд, удар) · финал = кадр 0 (петля).
(function () {
  const C = window.CITY, Hh = C.hero, W = window.WORDS;
  const w = (i) => W.words[i];
  const P = i => W.phrases[i - 1];
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const L = (a, b, k) => a + (b - a) * k, L3 = (a, b, k) => a.map((v, i) => L(v, b[i], k));
  const pr = (t, t0, d, e = ease.inOut) => e((t - t0) / d);
  const rotY = (v, a) => [v[0] * Math.cos(a) - v[2] * Math.sin(a), v[1], v[0] * Math.sin(a) + v[2] * Math.cos(a)];
  const ct = x => (Math.round(x * 30) + .5) / 30;     // склейка ровно между кадрами: смаз не смешивает две сцены
  const D2R = Math.PI / 180;

  const DUR = Math.round((W.duration + .08) * 30) / 30;
  const T = {
    whip0: w(0).start + .12,
    hook1: ct(P(2).start - .1), crane1: P(2).start + 2.6,
    occl: w(20).start - .05,
    witch: P(3).start - .05, expl: w(23).start, sliver: w(27).start - .1,
    plan2: ct(P(4).start - .1), huge: w(34).start - .1, mem16: w(39).start - .08,
    cells: P(5).start - .1, scan: w(43).start - .1, run0: w(43).start + .5, run1: P(6).start - .4,
    tilt: P(6).start - .5, merge: w(54).start - .15,
    ps2: ct(P(7).start - .12), land: w(68).start, wave: w(70).start - .05,
    race: ct(P(8).start - .15), ssd: w(74).start - .08, x100: w(77).start - .08,
    clim: ct(P(9).start - .12),
    fin: ct(P(10).start - .1), end: DUR,
  };
  T.heroStop = T.whip0 + .15;
  // Vice City: замедление ×0,3 над городом, жёлтая волна по простым домам, карточка сравнения
  T.slow = T.ps2 + 1.25; T.hl = T.slow + .05; T.card = T.slow + 1.45;
  const bump = t => { const u = t - T.slow; return u < 0 ? 0 : u < .15 ? u / .15 : u < .6 ? 1 : u < .75 ? 1 - (u - .6) / .15 : 0; };
  const warp = t => { if (t <= T.slow) return t; let s = T.slow; const n = 120, d = (Math.min(t, T.slow + .75) - T.slow) / n;
    for (let i = 0; i < n; i++) s += d * (1 - .7 * bump(T.slow + (i + .5) * d)); return s + Math.max(0, t - T.slow - .75); };
  const SLOWDT = T.slow + .75 - warp(T.slow + .75);     // сколько времени «съело» замедление
  T.turn0 = T.clim + .35; T.turn1 = T.turn0 + 2.0;
  // кульминация: граница «цвета» относительно взгляда, b(t) — градусы вперёд по ходу поворота
  // фронт подгрузки ~25° впереди взгляда (по земле и фасадам — полоса от ног героя), держится 1,2 с; потом рвётся вперёд
  const bAt = t => t < T.turn0 ? 90 : t < T.turn0 + .3 ? L(90, 7, pr(t, T.turn0, .3)) : t < T.turn0 + 1.5 ? 7 + 3 * Math.sin((t - T.turn0) * 5) : L(7, 110, ease.out(clamp((t - T.turn0 - 1.5) / .35)));
  T.hit = T.turn0 + 1.55;                              // волна обогнала взгляд — удар
  T.walk2 = T.hit + .25;
  const SUN_HOOK = [-.5, .57, -.65];
  const V = 1.0;

  // кластер дальних домов для «одной простой модели»: 8–12 домов около 820–1000 м к северу от героя, на оси авеню
  const MR = (() => { for (const half of [170, 210, 250]) { const r = [-half, Hh.z - 1040, half, Hh.z - 820];
      const bs = C.buildings.filter(b => { const x = (b.x0 + b.x1) / 2, z = (b.z0 + b.z1) / 2; return x > r[0] && x < r[2] && z > r[1] && z < r[3]; });
      if (bs.length >= 8) { const hs = bs.map(b => b.tier ? b.tier.h : b.h).sort((a, b) => a - b); return { rect: [Math.min(...bs.map(b => b.x0)) - 1, Math.min(...bs.map(b => b.z0)) - 1, Math.max(...bs.map(b => b.x1)) + 1, Math.max(...bs.map(b => b.z1)) + 1], h: hs[Math.floor(hs.length * .7)], n: bs.length }; } }
    return { rect: [-170, Hh.z - 1040, 170, Hh.z - 820], h: 30, n: 0 }; })();
  window.__merge = MR;

  const base = () => ({ fov: 55, fog: [160, 1500, .4], dof: 0, mech: {}, hero: true, sat: 1, sun: null, ao: 0, people: false });
  T.walkS = T.whip0 + .95;                            // после разворота герой идёт вперёд — в глину (на юг)
  const heroAt = t => { const n = V * (t < T.heroStop - .2 ? t : T.heroStop - .2 + .2 * sm((t - T.heroStop + .2) / .4));
    const tw = Math.min(t, T.hook1) - T.walkS, sth = tw <= 0 ? 0 : V * .8 * tw * sm(tw / .5);
    return [Hh.x, Hh.z - n + sth]; };
  const HS = heroAt(99);
  // поворот хука: быстро до 75°, медленно через бок (шов «цвет / глина» виден 0,45 с), быстро до 180°
  const whipK = t => { const u = t - T.whip0; if (u <= 0) return 0;
    if (u < .17) return .42 * ease.inOut(u / .17); if (u < .62) return .42 + .16 * (u - .17) / .45; return .58 + .42 * ease.out(Math.min(1, (u - .62) / .3)); };
  // камера за плечом, вращается вокруг героя вместе с ним (герой оборачивается — мы смотрим через его плечо)
  // направление взгляда в начале смотрит левее (на авеню), в конце — тоже на авеню: поперечная составляющая меняет знак
  const orbit = (hp, k, off, dir0, push = 0, dEnd = -1) => { const a = -Math.PI * k, o = rotY(off.map((v, i) => i === 1 ? v : v * (1 - push)), a), d = rotY([L(dir0[0], dEnd, sm(k)), dir0[1], dir0[2]], a);
    const pos = [hp[0] + o[0], o[1], hp[1] + o[2]]; return { pos, tgt: [pos[0] + d[0], pos[1] + d[1], pos[2] + d[2]], yaw: Math.PI + Math.PI * k }; };

  function hook(t) {
    const s = base(); s.id = 'hook';
    const hp = heroAt(t); s.heroPos = hp; s.heroT = t; s.mechPos = [hp[0], hp[1] + 1.0];
    const k = whipK(t), push = .03 * pr(t, T.whip0 + .95, T.hook1 - T.whip0 - .95, ease.inOut);
    const bob = .025 * Math.sin(t * Math.PI * 2 * 1.65) * (1 - pr(t, T.whip0, .3));
    const o = orbit(hp, k, [.72, 1.9, 4.2], [-6.5, -.4, -44.2], push);
    o.pos[1] += bob; s.cam = o.pos; s.target = o.tgt; s.heroYaw = o.yaw;
    s.fov = 55 - 2 * push / .03;
    s.split = [0, 1, .3]; s.sun = SUN_HOOK; s.sat = 1.13; s.ao = 1; s.fg = 2.6; s.people = true; s.dof = 3;
    s.shadow = [hp[0] - 4, hp[1] - 40 + 80 * k, 80];
    return s;
  }
  // план 1: кран над авеню в наклон ~50°; клин героя смотрит на юг; перекрытие; «Ведьмак»
  function plan1(t) {
    const s = base(); s.id = 'plan1';
    const hp = HS; s.heroPos = hp; s.heroT = t; s.mechPos = hp; s.people = true; s.heroYaw = 0;
    const st = hook(T.hook1 - 1e-3), k = clamp((t - T.hook1) / (T.crane1 - T.hook1));
    const top = [hp[0] + 6, 260, hp[1] - 215], topT = [hp[0], 0, hp[1] + 95];
    let cam = [L(st.cam[0], top[0], ease.inOut(k)), L(st.cam[1], top[1], ease.out(k)), L(st.cam[2], top[2], ease.inOut(k))];
    let tgt = L3(st.target, topT, ease.inOut(k));
    const e = pr(t, T.witch, T.plan2 - T.witch, ease.sine);
    if (t > T.crane1) { const d = pr(t, T.crane1, T.witch - T.crane1, ease.sine); cam = L3(top, [hp[0] + 6, 280, hp[1] - 235], d); }
    if (t > T.witch) cam = L3([hp[0] + 6, 280, hp[1] - 235], [hp[0] + 6, 420, hp[1] - 330], e);
    if (t > T.sliver) { const z = pr(t, T.sliver, T.plan2 - T.sliver, ease.sine); cam = L3(cam, tgt, .06 * z); cam[0] += 25 * z; }
    s.cam = cam; s.target = tgt; s.fov = 50; s.near = .3 + 6 * k;
    const sweep = .45 * Math.sin((t - (T.crane1 - .6)) * 2.0) * pr(t, T.crane1 - .6, .5) * (1 - pr(t, T.occl - .6, .45));
    const half = L(.55, .045, pr(t, T.sliver, .6, ease.out));
    s.mech = { wedge: 1, ring: 0, wedgeHalf: half, wedgeRange: 175, heading: Math.PI + sweep };
    s.wedgeClay = 1; s.occl = pr(t, T.occl, .4, ease.out) * (1 - pr(t, T.witch, .25));
    s.explode = pr(t, T.expl, 1.0, ease.out); s.dim = pr(t, T.sliver, .3, ease.out);
    s.fog = [350, 1500, .85]; s.sat = 1.08; s.shadow = [hp[0], hp[1] + 60, 260];
    const dist = Math.hypot(cam[0] - hp[0], cam[1] - 1, cam[2] - hp[1]);
    s.heroScale = Math.min(10, Math.max(1, dist * .03 * (1 - s.explode)));   // герой на карте ≥ 110 px, как метка игрока
    return s;
  }
  // план 2: лоток памяти и отъезд ×3 → скан клеток → герой бежит → наклон к горизонту, слияние дальних домов
  function plan2(t) {
    const s = base(); s.id = 'plan2'; s.dof = 0;
    const run = pr(t, T.run0, T.run1 - T.run0, ease.inOut);
    const hp = [HS[0], HS[1] - 260 * run]; s.heroPos = hp; s.mechPos = hp; s.heroT = t; s.heroYaw = Math.PI;
    const near = [[hp[0] + 30, 1120, hp[1] + 400], [hp[0] + 10, 0, hp[1] + 20]];
    const far = [[hp[0] + 90, 3300, hp[1] + 640], [hp[0] + 30, 0, hp[1] - 600]];   // бухта уходит к нижнему краю — как берег
    const out = pr(t, T.huge, .9, ease.outExpo) * (1 - pr(t, T.cells - .2, 1.0, ease.inOut));
    let cam = L3(near[0], far[0], out), tgt = L3(near[1], far[1], out);
    const dr = pr(t, T.huge + .6, T.cells - T.huge, ease.sine); cam = L3(cam, tgt, .05 * dr * out); cam[0] += 60 * dr * out;   // дрейф на дальнем плане
    cam[1] *= 1 - .03 * pr(t, T.plan2, T.huge - T.plan2, ease.sine);       // до отъезда — медленный наезд
    const kT = pr(t, T.tilt, T.ps2 - T.tilt - .3, ease.inOut);
    cam = L3(cam, [HS[0] - 9, 360, HS[1] + 60], kT); tgt = L3(tgt, [HS[0] - 9, -60, HS[1] - 930], kT);   // над башнями: дальний кластер виден целиком
    s.cam = cam; s.target = tgt; s.fov = L(42, 34, kT); s.near = L(40, 2, kT); s.depthScale = 1400;
    s.mech = kT < .5 ? { wedge: t > T.cells ? 1 : 0, ring: 1, ringR: 200, wedgeHalf: .55, wedgeRange: 185, heading: 0, front: 1 } : {};
    s.scanZ = t > T.scan - .05 ? L(hp[1] - 900, hp[1] + 600, clamp((t - T.scan) / .6)) : 1e5;
    s.fog = kT > .5 ? [500, 2600, .4] : [3000, 7000, .25]; s.sat = 1.05;
    s.shadow = kT > .5 ? [HS[0], HS[1] - 500, 700] : [hp[0], hp[1] - 60, 420];
    s.merge = pr(t, T.merge, .75, ease.inOut); s.mergeRect = MR.rect; s.mergeH = MR.h;
    s.hero = kT < .3; s.heroScale = 12;
    return s;
  }
  // «2002 · PS2»: в полёте — коробки без окон; на «грузили» — волна детализации от места посадки
  function ps2(t0) {
    const t = warp(t0) + SLOWDT * clamp((t0 - T.slow - .75) / (T.land - T.slow - .75));   // замедление, к посадке время догоняет
    const s = base(); s.id = 'ps2'; s.hero = false; s.retro = 1; s.pix = 4; s.post = 9; s.wt = t;
    const path = [[340, 70, 150], [220, 62, 152], [90, 46, 158], [-10, 14, 168], [-70, .9, 176]];
    const cr = (p, k) => { const n = p.length - 1, x = clamp(k) * n, i = Math.min(n - 1, Math.floor(x)), u = x - i;
      const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(n, i + 2)];
      return b.map((_, j) => .5 * ((2 * b[j]) + (-a[j] + c[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u * u + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * u * u * u)); };
    const k = clamp((t - T.ps2) / (T.land - T.ps2)), pos = cr(path, k), nx = cr(path, Math.min(1, k + .02)), pv = cr(path, Math.max(0, k - .02));
    const dir = [nx[0] - pv[0], nx[1] - pv[1], nx[2] - pv[2]], len = Math.hypot(...dir) || 1;
    const yaw = Math.atan2(dir[0], dir[2]), pitch = -Math.asin(dir[1] / len) * .6;
    const glide = pr(t, T.land, T.race - T.land, ease.out);
    const pl = [pos[0] + 6 * glide * Math.sin(yaw), Math.max(.9, pos[1]), pos[2] + 6 * glide * Math.cos(yaw)];
    s.plane = { x: pl[0], y: pl[1] + .3 * Math.sin(t * 3) * (1 - k), z: pl[2], yaw, pitch: pitch * (1 - glide), roll: .15 * Math.sin(t * .9) * (1 - k) };
    const back = [Math.sin(yaw), 0, Math.cos(yaw)];
    s.cam = [pl[0] - back[0] * 26, pl[1] + 10 + 6 * (1 - k), pl[2] - back[2] * 26 + 14]; s.target = [pl[0] + back[0] * 50, pl[1] - 4, pl[2] + back[2] * 50 - 34];
    s.fov = 50 - 3 * pr(t0, T.slow - .2, 1.2, ease.inOut); s.near = .5;   // лёгкий наезд через замедление
    s.planeFwd = [pl[0] + back[0] * 60, 10, pl[2] + back[2] * 60 - 120];
    s.hlPos = [s.planeFwd[0], s.planeFwd[2]]; s.hlR = t0 > T.hl ? L(5, 240, ease.out(clamp((t0 - T.hl) / .8))) : 0;
    const bubble = L(0, 420, pr(t, T.wave, .7, ease.inOut));
    s.mech = { lod: 1, lod1: bubble, lod2: bubble };
    s.fog = [400, 1800, .3]; s.light = 'ps2'; s.sat = 1.3; s.shadow = [pl[0], pl[2] - 80, 220];
    return s;
  }
  // гонка дисков: квартал сверху; жёсткий диск грузит клетки медленно, SSD — весь город за 0,25 с
  function race(t) {
    const s = base(); s.id = 'race'; s.hero = false;
    const k = pr(t, T.race, T.clim - T.race, ease.sine);
    s.cam = [HS[0] + 25 - 40 * k, 480 - 30 * k, HS[1] + 180 - 20 * k]; s.target = [HS[0] + 8, 0, HS[1] - 60]; s.fov = 44; s.near = 20;
    s.mechPos = HS; s.heroPos = HS;
    const hdd = L(120, 190, clamp((t - T.race - .2) / (T.ssd - T.race - .2))), ssd = L(190, 3000, ease.out(clamp((t - T.ssd) / .25)));
    s.mech = { ring: 1, ringR: t < T.ssd ? hdd : ssd, front: 1 };
    s.fog = [1600, 4000, .3]; s.shadow = [HS[0], HS[1] - 60, 320];
    return s;
  }
  // кульминация: самый крупный план; герой и камера медленно оборачиваются; волна подгрузки обгоняет взгляд; удар
  function climax(t) {
    const s = base(); s.id = 'climax';
    const kH = pr(t, T.turn0, T.turn1 - T.turn0, ease.inOut);              // герой оборачивается на 180°
    const kC = .9 * kH;                                                      // камера облетает его на 162°
    const yaw = Math.PI + Math.PI * kH, wk = Math.max(0, t - T.walk2);
    const walk = V * .9 * wk * sm(wk / .5);
    const hp = [HS[0] + Math.sin(yaw) * walk, HS[1] + Math.cos(yaw) * walk]; s.heroPos = hp; s.heroT = t; s.heroYaw = yaw;
    const push = .04 * pr(t, T.clim, T.fin - T.clim, ease.sine);
    const hc = [HS[0] + Math.sin(yaw) * walk * .55, HS[1] + Math.cos(yaw) * walk * .55];   // камера отстаёт — герой уходит вперёд по тротуару
    const o = orbit(hc, kC, [.62, 1.78, 2.45], [-5.5, -.3, -44], push, -5.5);   // дуга радиусом ~2,4 м, к концу взгляд вдоль тротуара
    const up = .55 * sm(wk / 2.5); o.pos[1] += up; o.tgt[1] += up * .3;           // и поднимается на ~6 %
    s.cam = o.pos; s.target = o.tgt; s.fov = 50;
    const aB = -Math.PI * kC - bAt(t) * D2R;
    const c = rotY([0, 0, -1], aB + Math.PI / 2);
    s.split = [-c[0], -c[2], .3]; s.mechPos = [HS[0], HS[1]];
    s.sun = SUN_HOOK; s.sat = 1.13; s.ao = 1; s.dof = 3; s.people = true;
    const u = t - T.hit;
    s.punch = u < 0 ? 0 : u < .2 ? .06 * ease.out(u / .2) : .06 * Math.exp(-(u - .2) * 7);
    s.shake = u >= 0 && u < .14 ? 8 * (1 - u / .14) : 0;
    s.flash = 0;
    s.shadow = [hp[0] - 4, hp[1] - 35 + 70 * kH, 80];
    return s;
  }
  function fin(t) { const tt = t - T.end; const s = hook(tt); s.id = 'fin'; s.heroT = tt; s.wt = tt; return s; }
  function at(t) {
    let s;
    if (t < T.hook1) s = hook(t); else if (t < T.plan2) s = plan1(t); else if (t < T.ps2) s = plan2(t);
    else if (t < T.race) s = ps2(t); else if (t < T.clim) s = race(t); else if (t < T.fin) s = climax(t); else s = fin(t);
    s.t = t; if (s.wt == null) s.wt = t;
    return s;
  }

  // ——— звук ———
  const sfx = [];
  const ev = (t, name, gain_db = 0) => sfx.push({ t: +t.toFixed(3), name, gain_db });
  ev(T.whip0 - .06, 'whip', -3); ev(T.whip0 + .65, 'drop', -4);
  ev(T.occl + .02, 'click', -6);
  for (let i = 0; i < 6; i++) ev(T.expl + .2 + i * (.13 + .04 * (i % 2)), 'tick', -6);
  ev(T.sliver + .05, 'scan', -4);
  ev(T.huge, 'whoosh', -8); ev(T.mem16 + .2, 'drop', -4);
  ev(T.scan, 'scan', -6); ev(T.merge, 'drop', -6);
  ev(T.ps2 + .05, 'prop', -9); ev(T.hl, 'tick', -6); ev(T.hl + .35, 'tick', -8); ev(T.wave, 'click', -4);
  ev(T.race + .2, 'hdd', -6); ev(T.ssd + .02, 'ding', -6); ev(T.x100, 'pop', -4);
  ev(T.turn0 - .05, 'whoosh', -10); ev(T.hit - .03, 'hit', 0); ev(T.fin, 'whoosh', -10);

  // ——— интерфейс поверх (SVG) ———
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, at, p) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
  const tx = (p, at, s) => { const e = el('text', at, p); e.textContent = s; return e; };
  const INK = '#F4F0E6', BG = '#0E1016', ACC = '#FFC83D', MUTE = '#6E6A64', CORAL = '#E8806E';
  const CREAM = '#F4F0E6', TXT = '#1E2430', ACC_T = '#C08A00';   // светлые кремовые плашки ~88 %, тёмный текст, акцент — тёмно-жёлтый
  const vis = (g, o, dy = 0, sc = 1, cx = 0, cy = 0) => { g.setAttribute('opacity', Math.max(0, Math.min(1, o)).toFixed(3)); g.setAttribute('display', o > .002 ? 'inline' : 'none');
    g.setAttribute('transform', `translate(${cx} ${cy + dy}) scale(${sc}) translate(${-cx} ${-cy})`); };
  const inout = (t, a, b, din = .3, dout = .18) => Math.min(ease.out4((t - a) / din), 1 - ease.in4((t - b + dout) / dout));
  const plate = (p, x, y, wdt, h, r = 18, op = .8) => el('rect', { x, y, width: wdt, height: h, rx: r, fill: CREAM, 'fill-opacity': .88, stroke: '#1E2430', 'stroke-opacity': .12, 'stroke-width': 2 }, p);
  const shadowTxt = { 'paint-order': 'stroke', stroke: BG, 'stroke-width': 8, 'stroke-linejoin': 'round' };
  function tag(p, label, swatch, size = 46) {
    const g = el('g', {}, p); const wd = Math.round(label.length * size * .72 + (swatch ? 92 : 52));
    const box = el('g', {}, g); plate(box, 0, 0, wd, size + 30, 14, .82);
    if (swatch) el('rect', { x: 22, y: (size + 30) / 2 - 12, width: 24, height: 24, rx: 5, fill: swatch.fill || 'none', stroke: swatch.stroke || 'none', 'stroke-width': 3, 'stroke-dasharray': swatch.dash || '' }, box);
    tx(box, { x: swatch ? 60 : 26, y: (size + 30) / 2 + size * .36, 'font-family': 'Onest', 'font-weight': 800, 'font-size': size, 'letter-spacing': 1, fill: TXT }, label);
    const ln = el('path', { d: '', stroke: INK, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, g);
    const dot = el('circle', { r: 8, fill: INK }, g);
    return { g, box, ln, dot, w: wd, h: size + 30 };
  }
  function place(T_, ax, ay, lx, ly) {
    T_.box.setAttribute('transform', `translate(${lx.toFixed(1)} ${ly.toFixed(1)})`);
    T_.dot.setAttribute('cx', ax.toFixed(1)); T_.dot.setAttribute('cy', ay.toFixed(1));
    const bx = Math.min(Math.max(ax, lx + 20), lx + T_.w - 20), by = ay > ly ? ly + T_.h : ly;
    T_.ln.setAttribute('d', Math.hypot(bx - ax, by - ay) > 14 ? `M${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}` : '');
  }
  const cxl = (x, w, xmax = 888) => Math.min(Math.max(x, 120), xmax - w);

  let HL = null;
  function makeUI(svg, proj) {
    if (!HL) {
      // дома, которые видны в центре кадра всё время акцента (проекция своей камерой по состояниям at(t) — чистая функция)
      const projAt = (st, p) => { const f = st.target.map((v, i) => v - st.cam[i]), fl = Math.hypot(...f); const F = f.map(v => v / fl);
        let R = [F[2] * 1 - 0, 0, -F[0]]; R = [-F[2], 0, F[0]]; const rl = Math.hypot(...R); R = R.map(v => v / rl);
        const Uu = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
        const d = p.map((v, i) => v - st.cam[i]), z = d[0] * F[0] + d[1] * F[1] + d[2] * F[2]; if (z < 1) return null;
        const k = 960 / Math.tan(st.fov * Math.PI / 360); return [540 + (d[0] * R[0] + d[1] * R[1] + d[2] * R[2]) * k / z, 960 - (d[0] * Uu[0] + d[1] * Uu[1] + d[2] * Uu[2]) * k / z]; };
      const sts = [T.hl + .1, T.hl + .7, T.card + .1].map(at), a = at(T.hl + .1).plane;
      HL = C.buildings.filter(b => b.floors >= 3).map(b => { const top = b.tier ? b.tier.h : b.h, c = [(b.x0 + b.x1) / 2, top * .6, (b.z0 + b.z1) / 2];
          const ok = sts.every(st => { const q = projAt(st, c); return q && q[0] > 180 && q[0] < 920 && q[1] > 520 && q[1] < 1250; });
          if (!ok) return null; const st = sts[1], q0 = projAt(st, [c[0], 0, c[2]]), q1 = projAt(st, [c[0], top, c[2]]);
          return q0 && q1 ? [Math.hypot(c[0] - a.x, c[2] - a.z), b, q0[1] - q1[1]] : null; }).filter(Boolean)
        .sort((p, q) => q[2] - p[2]).slice(0, 8).sort((p, q) => p[0] - q[0]);   // самые крупные на экране, волна — от самолёта
      const d0 = HL.length ? HL[0][0] : 0; HL.forEach(c => { c[0] = (c[0] - d0) * 2; });   // волна: ближние к самолёту — первыми
    }
    svg.setAttribute('viewBox', '0 0 1080 1920');
    const root = el('g', {}, svg);
    // хук: чип и вопрос; после разворота — «НЕ В КАДРЕ — НЕ РИСУЕТСЯ»
    const gChip0 = el('g', {}, root), gChip = el('g', { transform: 'translate(120 296)' }, gChip0);   // vis() пишет transform во внешнюю группу
    plate(gChip, 0, 0, 540, 88, 44, .8);
    tx(gChip, { x: 36, y: 66, 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 62, fill: TXT }, 'GTA 6');
    tx(gChip, { x: 268, y: 64, 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 58, fill: MUTE }, '·');
    tx(gChip, { x: 320, y: 64, 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 58, fill: ACC_T }, '19.11');
    const gQ = el('g', {}, root); plate(gQ, 96, 402, 790, 232, 22, .8);
    ['ЧТО У ТЕБЯ', 'ЗА СПИНОЙ?'].forEach((s, i) => tx(gQ, { x: 124, y: 498 + i * 104, 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 96, 'letter-spacing': -3, fill: TXT, textLength: 736, lengthAdjust: 'spacingAndGlyphs' }, s));
    const gNot = el('g', {}, root); plate(gNot, 96, 322, 790, 228, 22, .8);
    ['НЕ В КАДРЕ —', 'НЕ РИСУЕТСЯ'].forEach((s, i) => tx(gNot, { x: 124, y: 414 + i * 104, 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 92, 'letter-spacing': -3, fill: TXT, textLength: 736, lengthAdjust: 'spacingAndGlyphs' }, s));
    // план 1
    const tCull = tag(root, 'ОТСЕЧЕНИЕ ПО ВЗГЛЯДУ', { fill: ACC }, 44), tOcc = tag(root, 'ПЕРЕКРЫТИЕ', { fill: '#6C6A66' }, 44);
    const occBox = el('path', { d: '', fill: 'none', stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }, root);
    const heroDisk = el('circle', { r: 70, fill: ACC, 'fill-opacity': .2, stroke: ACC, 'stroke-width': 3, 'stroke-opacity': .7 }, root);
    // «Ведьмак»: компактный счётчик + сетка 10×10 (каждая клетка — 1 %), закрашено ¾ одной
    const gCnt = el('g', {}, root); plate(gCnt, 96, 300, 488, 236, 22, .84);
    tx(gCnt, { x: 128, y: 366, 'font-family': 'Onest', 'font-weight': 800, 'font-size': 38, fill: MUTE, 'letter-spacing': 1 }, 'В СЦЕНЕ');
    const cntN = tx(gCnt, { x: 126, y: 452, 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 92, fill: TXT }, '62 000');
    const cntB = tx(gCnt, { x: 128, y: 512, 'font-family': 'Onest', 'font-weight': 800, 'font-size': 38, fill: ACC_T, 'letter-spacing': .5 }, 'РИСУЕТСЯ < 500');
    const gGrid = el('g', {}, root); plate(gGrid, 600, 300, 288, 340, 22, .88);
    for (let i = 0; i < 100; i++) { const x = 614 + (i % 10) * 26, y = 314 + Math.floor(i / 10) * 26; el('rect', { x, y, width: 22, height: 22, rx: 3, fill: 'none', stroke: MUTE, 'stroke-width': 2 }, gGrid); }
    el('rect', { x: 614, y: 314 + 9 * 26, width: 16.5, height: 22, rx: 2, fill: ACC_T, stroke: '#1E2430', 'stroke-width': 1.5 }, gGrid);
    tx(gGrid, { x: 744, y: 618, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 36, fill: ACC_T }, '0,76 %');
    const src1 = tx(root, { x: 120, y: 1228, 'font-family': 'Onest', 'font-weight': 600, 'font-size': 30, fill: INK, ...shadowTxt }, 'The Witcher 3 · GDC 2014');
    // план 2: лоток памяти — кварталы слетают в него и не помещаются
    const gTray = el('g', {}, root);
    plate(gTray, 186, 300, 708, 92, 20, .82);
    tx(gTray, { x: 216, y: 366, 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 52, fill: TXT }, 'PS5 · 16 ГБ');
    const trayRim = el('rect', { x: 216, y: 408, width: 648, height: 284, rx: 18, fill: '#F4F0E6', 'fill-opacity': .45, stroke: TXT, 'stroke-width': 5 }, gTray);
    const TILE = ['#E3C6AE', '#AFC7B9', '#D3ADA0', '#C2BACD', '#E8E0CF', '#AFC9C5'];
    const tiles = []; for (let i = 0; i < 24; i++) tiles.push(el('rect', { width: 80, height: 80, rx: 8, fill: TILE[i % 6], stroke: '#5E5A55', 'stroke-width': 2 }, gTray));
    // клетки
    const tFrame = tag(root, 'В КАДРЕ', { fill: ACC }), tMem = tag(root, 'В ПАМЯТИ', { fill: '#9A968E' }), tDisk = tag(root, 'НА ДИСКЕ', { stroke: MUTE, dash: '5 4' });
    const tStream = tx(root, { x: 120, y: 1228, 'font-family': 'Onest', 'font-weight': 700, 'font-size': 34, fill: INK, ...shadowTxt, 'letter-spacing': 1 }, 'стриминг');
    // горизонт: две строки в безопасной зоне
    const gHills = el('g', {}, root); plate(gHills, 104, 300, 784, 132, 18, .82);
    tx(gHills, { x: 132, y: 352, 'font-family': 'Onest', 'font-weight': 800, 'font-size': 38, fill: TXT }, 'GTA V, ПК: холмы вдали —');
    tx(gHills, { x: 132, y: 404, 'font-family': 'Onest', 'font-weight': 800, 'font-size': 38, fill: TXT }, '2 500 треугольников · Куреж, 2015');
    // PS2
    const gPs2 = el('g', {}, root); plate(gPs2, 96, 300, 640, 150, 22, .82);
    tx(gPs2, { x: 128, y: 366, 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 52, fill: TXT }, '2002 · PS2');
    tx(gPs2, { x: 128, y: 420, 'font-family': 'Onest', 'font-weight': 700, 'font-size': 36, fill: MUTE, 'letter-spacing': 1 }, 'ОСНОВНАЯ ПАМЯТЬ 32 МБ');
    const tFly = tag(root, 'ПРОСТЫЕ ВЕРСИИ ДОМОВ', { fill: ACC }, 44); tFly.box.firstChild.setAttribute('fill-opacity', 1); tFly.ln.setAttribute('stroke', '#1E2430'); tFly.ln.setAttribute('stroke-width', 5); tFly.dot.setAttribute('fill', '#1E2430'); tFly.dot.setAttribute('r', 10);
    // жёлтая обводка простых домов волной от точки под самолётом (контур проекции дома, 3 px, без свечения)
    // притемнение кадра на время акцента: маска вырезает обведённые дома
    const defs2 = el('defs', {}, svg), mask = el('mask', { id: 'hlMask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1080, height: 1920 }, defs2);
    el('rect', { x: 0, y: 0, width: 1080, height: 1920, fill: '#fff' }, mask); const holes = []; for (let i = 0; i < 8; i++) holes.push(el('path', { d: '', fill: '#000' }, mask));
    const dimR = el('rect', { x: 0, y: 0, width: 1080, height: 1920, fill: '#0E1016', 'fill-opacity': 0, mask: 'url(#hlMask)' }, root);
    root.insertBefore(dimR, root.firstChild);
    const gHl = el('g', {}, root); const hlPaths = []; for (let i = 0; i < 8; i++) hlPaths.push(el('path', { d: '', fill: 'none', stroke: ACC, 'stroke-width': 8, 'stroke-linejoin': 'round' }, gHl));
    const hull = pts => { const P = pts.map(p => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = [], hi = []; for (const p of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for (const p of P.slice().reverse()) { while (hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
      return lo.slice(0, -1).concat(hi.slice(0, -1)); };
    // карточка сравнения: один дом — «в полёте» (простой) и «на земле» (детальный)
    const gCard = el('g', {}, root); plate(gCard, 120, 560, 768, 300, 22, .9);
    const house = (x, detailed) => { const g = el('g', {}, gCard);
      el('rect', { x, y: 640, width: 170, height: 190, fill: '#E3C6AE', rx: detailed ? 10 : 0 }, g);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const wx = x + 20 + c * 50, wy = 660 + r * 42;
        if (detailed) { el('rect', { x: wx - 4, y: wy - 4, width: 38, height: 32, fill: '#F4F0E6' }, g); el('rect', { x: wx, y: wy, width: 30, height: 24, fill: '#5B7A92' }, g);
          el('rect', { x: wx - 6, y: wy + 26, width: 42, height: 5, fill: '#F4F0E6' }, g); el('line', { x1: wx + 15, y1: wy, x2: wx + 15, y2: wy + 24, stroke: '#F4F0E6', 'stroke-width': 2 }, g); }
        else el('rect', { x: wx, y: wy, width: 26, height: 22, fill: '#33465A' }, g); }
      if (detailed) { el('rect', { x: x - 6, y: 632, width: 182, height: 10, fill: '#F4F0E6', rx: 3 }, g); el('rect', { x: x + 70, y: 600, width: 30, height: 40, fill: '#F4F0E6' }, g); }
      return g; };
    house(170, false); house(530, true);
    tx(gCard, { x: 255, y: 612, 'text-anchor': 'middle', 'font-family': 'Onest', 'font-weight': 800, 'font-size': 32, fill: TXT }, 'В ПОЛЁТЕ');
    tx(gCard, { x: 750, y: 612, 'text-anchor': 'middle', 'font-family': 'Onest', 'font-weight': 800, 'font-size': 32, fill: TXT }, 'НА ЗЕМЛЕ');
    tx(gCard, { x: 445, y: 750, 'text-anchor': 'middle', 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 56, fill: ACC_T }, '→');
    // гонка: линейка в мире, без карточки
    const gRace = el('g', {}, root);
    const RX = 160, RW = 700, Y1 = 590, Y2 = 752;
    const lbl = (y, s, col0) => { const col = col0 === INK ? TXT : col0 === ACC ? ACC_T : col0; return lbl0(y, s, col); };
    const lbl0 = (y, s, col) => { const g = el('g', {}, gRace); const wd = Math.round(s.length * 21 + 40); plate(g, RX - 20, y - 46, wd, 60, 14, .82); tx(g, { x: RX, y: y - 4, 'font-family': 'Onest', 'font-weight': 800, 'font-size': 34, fill: col }, s); return g; };
    lbl(Y1 - 30, 'ЖЁСТКИЙ ДИСК · 1 ГБ ≈ 20 С', INK); lbl(Y2 - 30, 'SSD PS5 · 2 ГБ ≈ 0,25 С', ACC);
    for (const y of [Y1, Y2]) { el('line', { x1: RX, y1: y, x2: RX + RW, y2: y, stroke: BG, 'stroke-width': 18, 'stroke-linecap': 'round', 'stroke-opacity': .55 }, gRace); el('line', { x1: RX, y1: y, x2: RX + RW, y2: y, stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, gRace); }
    for (let s = 0; s <= 20; s += 5) { const x = RX + RW * s / 20; el('line', { x1: x, y1: Y2 - 14, x2: x, y2: Y2 + 14, stroke: INK, 'stroke-width': 4 }, gRace);
      tx(gRace, { x, y: Y2 + 58, 'text-anchor': s === 0 ? 'start' : s === 20 ? 'end' : 'middle', 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 32, fill: INK, ...shadowTxt }, s + ' с'); }
    const hddBar = el('line', { x1: RX, y1: Y1, x2: RX, y2: Y1, stroke: '#B9B0A2', 'stroke-width': 26, 'stroke-linecap': 'round' }, gRace);
    const hddDot = el('circle', { cx: RX, cy: Y1, r: 26, fill: '#B9B0A2', stroke: BG, 'stroke-width': 4 }, gRace);
    const ssdDot = el('circle', { cx: RX + RW * .25 / 20, cy: Y2, r: 26, fill: ACC, stroke: BG, 'stroke-width': 4 }, gRace);
    const ssdRing = el('circle', { cx: RX + RW * .25 / 20, cy: Y2, r: 26, fill: 'none', stroke: ACC, 'stroke-width': 5 }, gRace);
    const x100 = tx(gRace, { x: 140, y: 1000, 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 124, fill: INK, ...shadowTxt, 'stroke-width': 14 }, '≈ ×100');
    const srcR = tx(gRace, { x: 120, y: 340, 'font-family': 'Onest', 'font-weight': 700, 'font-size': 32, fill: INK, ...shadowTxt }, 'оценка Марка Черни, 2020');
    // кульминация: компактный прибор
    const gTurn = el('g', {}, root); plate(gTurn, 96, 300, 600, 168, 22, .82);
    tx(gTurn, { x: 126, y: 362, 'font-family': 'Onest', 'font-weight': 800, 'font-size': 36, fill: MUTE, 'letter-spacing': 1 }, 'ПОВОРОТ');
    const turnT = tx(gTurn, { x: 330, y: 366, 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 60, fill: TXT }, '0,00 С');
    tx(gTurn, { x: 126, y: 442, 'font-family': 'Onest', 'font-weight': 800, 'font-size': 36, fill: MUTE, 'letter-spacing': 1 }, 'ТЕКСТУРЫ');
    const turnG = tx(gTurn, { x: 330, y: 446, 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 60, fill: ACC_T }, '0,0 ГБ');
    const src2 = tx(root, { x: 120, y: 520, 'font-family': 'Onest', 'font-weight': 600, 'font-size': 30, fill: INK, ...shadowTxt }, 'ИДЕЯ МАРКА ЧЕРНИ, 2020');
    // знак канала — входит маской слева направо
    const clip = el('clipPath', { id: 'markClip' }, el('defs', {}, svg)); const clipR = el('rect', { x: 120, y: 394, width: 0, height: 90 }, clip);
    const gMark = el('g', { 'clip-path': 'url(#markClip)' }, root); plate(gMark, 120, 404, 340, 70, 35, .78);
    tx(gMark, { x: 150, y: 451, 'font-family': 'Unbounded', 'font-weight': 900, 'font-size': 34, fill: TXT }, 'КОД И КАДР');
    // субтитры по словам
    const capL = el('g', { style: 'paint-order: stroke; stroke: #0E1016; stroke-width: 11px; stroke-linejoin: round' }, root);
    let caps = null;
    const glue = spec => { for (let i = 0; i + 1 < spec.length; i++) { const ln = spec[i].lines[0], last = ln[ln.length - 1];
        if (ln.length > 1 && /^(не|в|и|а|на|за|из)$/i.test(last[0])) { spec[i + 1].lines[0].unshift(ln.pop()); } } return spec; };
    const ready = () => { caps = makeCaptions(capL, glue(autoCaptions({ maxWords: 3, maxChars: 18 })), { x: 120, y: 1080, size: 66, lh: 78, maxW: 620, end: T.end - .25, ink: INK, dim: .5, font: 'Onest, sans-serif', weight: 800 }); };
    // плитки лотка: стартуют из проекции домов острова, садятся в слоты 7×3; три лишние не помещаются
    const tileSrc = C.buildings.filter(b => Math.hypot((b.x0 + b.x1) / 2 - HS[0], (b.z0 + b.z1) / 2 - HS[1]) < 180).filter((_, i) => i % 3 === 0).slice(0, 24);

    return {
      ready,
      frame(t, s) {
        const H = s.mechPos || s.heroPos || [Hh.x, Hh.z];
        vis(gChip0, Math.max(inout(t, -1, T.whip0 + .2, .01, .14), inout(t, w(94).start - .1, T.end + 1, .25)));
        vis(gQ, Math.max(inout(t, -1, T.whip0 + .2, .01, .14), inout(t, T.end - .35, T.end + 1, .2)));
        vis(gNot, inout(t, T.whip0 + .2, T.hook1 + .05, .25, .16), 22 * (1 - ease.out4((t - T.whip0 - .2) / .3)));
        // план 1
        const cO = inout(t, T.crane1 - .6, T.occl);
        vis(tCull.g, cO);
        if (cO > 0) { const [ax, ay] = proj([H[0] + 30, 0, H[1] + 120]); place(tCull, ax, ay, cxl(ax - tCull.w / 2, tCull.w), Math.max(320, ay - 240)); }
        const ob = window.__occluder, bO = inout(t, T.occl - .1, T.witch, .2);
        vis(occBox, ob ? bO : 0);
        if (ob && bO > 0) { const pts = []; for (const x of [ob[3], ob[4]]) for (const z of [ob[5], ob[6]]) for (const y of [0, ob[1]]) pts.push(proj([x, y, z]));
          // контур проекции — выпуклая оболочка 8 углов
          const P = pts.map(p => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
          const lo = [], hi = []; for (const p of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
          for (const p of P.slice().reverse()) { while (hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
          const hull = lo.slice(0, -1).concat(hi.slice(0, -1)); occBox.setAttribute('d', 'M' + hull.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z'); }
        const oO = inout(t, T.occl + .25, T.witch);
        vis(tOcc.g, oO);
        if (oO > 0 && window.__occCenter) { const oc = window.__occCenter; const [ax, ay] = proj([oc[0], 3, oc[1]]); place(tOcc, ax, ay, cxl(ax - tOcc.w / 2, tOcc.w), Math.max(320, ay - 220)); }
        const showDisk = (s.id === 'plan1' && t > T.crane1 - .8 && t < T.witch) || (s.id === 'plan2' && t < T.tilt);
        vis(heroDisk, showDisk ? 1 : 0); if (showDisk) { const [x, y] = proj([H[0], 0, H[1]]); heroDisk.setAttribute('cx', x.toFixed(1)); heroDisk.setAttribute('cy', y.toFixed(1)); }
        const cn = inout(t, T.expl - .05, T.plan2);
        vis(gCnt, cn, 18 * (1 - ease.out4((t - T.expl + .05) / .3)));
        if (cn > 0) { const v = Math.round(62000 * ease.out(clamp((t - T.expl) / 1.2)) / 10) * 10; cntN.textContent = v.toLocaleString('ru-RU').replace(/ /g, ' '); cntB.setAttribute('opacity', clamp((t - T.sliver - .1) / .25).toFixed(2)); }
        vis(gGrid, inout(t, T.sliver + .05, T.plan2, .3), 0, .9 + .1 * ease.out4((t - T.sliver - .05) / .3), 744, 470);
        vis(src1, inout(t, T.expl + .4, T.plan2) * .95);
        // лоток памяти
        const trO = inout(t, T.plan2 + .3, T.cells + .1);
        vis(gTray, trO, 18 * (1 - ease.out4((t - T.plan2 - .3) / .3)));
        if (trO > 0) {
          const t0 = w(33).start - .1, t1 = T.mem16 + .35;
          tiles.forEach((r, i) => {
            const b = tileSrc[i % tileSrc.length]; const [sx, sy] = b ? proj([(b.x0 + b.x1) / 2, b.h, (b.z0 + b.z1) / 2]) : [540, 1200];
            const ti = t0 + (t1 - t0) * (i / 23) + .04 * ((i * 7) % 3), u = clamp((t - ti) / .35);
            const fit = i < 21, slot = fit ? [228 + (i % 7) * 90, 418 + Math.floor(i / 7) * 90] : [300 + (i - 21) * 150, 330];
            let x = L(sx - 40, slot[0], ease.out(u)), y = L(sy - 40, slot[1], ease.out(u)) - (fit ? 0 : 60 * Math.sin(Math.PI * clamp((t - ti - .35) / .5)));
            if (!fit && t > ti + .35) { const f = clamp((t - ti - .85) / .5); y = L(330, 760, ease.in4(f)); x += 40 * f * (i - 22); }
            r.setAttribute('x', x.toFixed(1)); r.setAttribute('y', y.toFixed(1)); r.setAttribute('opacity', (u > 0 ? 1 : 0) * (fit ? 1 : 1 - clamp((t - ti - 1.1) / .3)));
          });
          const blink = t > T.mem16 + .5 && t < T.mem16 + .75;
          trayRim.setAttribute('stroke', blink ? CORAL : TXT); trayRim.setAttribute('stroke-width', blink ? 9 : 5);
        }
        // клетки
        const kc = s.id === 'plan2' && t < T.tilt ? 1 : 0;
        vis(tFrame.g, kc * inout(t, T.run0, T.tilt)); vis(tMem.g, kc * inout(t, w(47).start - .1, T.tilt)); vis(tDisk.g, kc * inout(t, w(50).start - .1, T.tilt));
        vis(tStream, kc * inout(t, T.run0 + .2, T.tilt) * .95);
        if (kc) {
          const R = 200;
          const [fx, fy] = proj([H[0], 0, H[1] - 120]); place(tFrame, fx, fy, cxl(fx - tFrame.w / 2, tFrame.w), Math.max(320, fy - 170));
          const [mx, my] = proj([H[0] + R * .72, 0, H[1] + R * .2]); place(tMem, mx, my, cxl(mx - tMem.w + 40, tMem.w, 780), Math.min(940 - tMem.h, Math.max(330, my - 190)));
          const [dx, dy] = proj([H[0] - R * 1.3, 0, H[1] - R * .2]); place(tDisk, dx, dy, cxl(dx - 40, tDisk.w), Math.max(330, dy - 170));
        }
        vis(gHills, inout(t, T.merge - .2, T.ps2, .3));
        // PS2
        vis(gPs2, inout(t, T.ps2 + .2, T.race), 18 * (1 - ease.out4((t - T.ps2 - .2) / .3)));

        // волна обводки по простым домам
        const hlOn = s.id === 'ps2' && t > T.hl && t < T.card + .2;
        vis(gHl, hlOn ? 1 : 0);
        const dim = s.id === 'ps2' ? .18 * Math.min(clamp((t - T.hl) / .25), 1 - clamp((t - T.land + .45) / .4)) : 0;
        dimR.setAttribute('fill-opacity', Math.max(0, dim).toFixed(3));
        let lead = null;
        if (hlOn) {
          const r = s.hlR || 240; let sx = 0, sy = 0, n = 0;
          hlPaths.forEach((pth, i) => { const c = HL[i]; holes[i].setAttribute('d', ''); if (!c || c[0] > r) { pth.setAttribute('d', ''); return; } const b = c[1], top = b.tier ? b.tier.h : b.h;
            const pts = []; for (const x of [b.x0, b.x1]) for (const z of [b.z0, b.z1]) for (const y of [0, top]) pts.push(proj([x, y, z]));
            if (pts.some(p => p[2] > 1)) { pth.setAttribute('d', ''); return; }
            const d = 'M' + hull(pts).map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z';
            pth.setAttribute('d', d); holes[i].setAttribute('d', d);
            const tp = proj([(b.x0 + b.x1) / 2, top, (b.z0 + b.z1) / 2]); if (tp[1] > 520 && tp[1] < 1500) { sx += tp[0]; sy += tp[1]; n++; } });
          if (n) lead = [sx / n, sy / n];
        } else holes.forEach(h => h.setAttribute('d', ''));
        const fO = inout(t, T.hl + .05, T.card + .15, .2, .15);
        vis(tFly.g, lead ? fO : 0); if (fO > 0 && lead) place(tFly, lead[0], lead[1], 120, 470);
        vis(gCard, inout(t, T.card, Math.min(T.card + 1.25, T.land + .05), .25, .2), 16 * (1 - ease.out4((t - T.card) / .3)));
        // гонка
        const rO = inout(t, T.race + .1, T.clim);
        vis(gRace, rO, 14 * (1 - ease.out4((t - T.race - .1) / .3)));
        if (rO > 0) {
          const hx = RX + RW * clamp((t - T.race - .2) / (T.clim - T.race - .4)) * .95;   // жёсткий диск ползёт к 20 с (ускорено в показе)
          hddBar.setAttribute('x2', hx.toFixed(1)); hddDot.setAttribute('cx', hx.toFixed(1));
          const ss = clamp((t - T.ssd) / .12);
          ssdDot.setAttribute('opacity', ss.toFixed(2)); ssdDot.setAttribute('r', (26 * (.4 + .6 * ease.out(ss))).toFixed(1));
          const rr = clamp((t - T.ssd) / .6); ssdRing.setAttribute('r', (26 + 70 * ease.out(rr)).toFixed(1)); ssdRing.setAttribute('opacity', (ss * (1 - rr)).toFixed(2));
          vis(x100, inout(t, T.x100, T.clim, .25), 0, .82 + .18 * ease.out4((t - T.x100) / .3), 140, 1000);
          srcR.setAttribute('opacity', clamp((t - T.ssd) / .3).toFixed(2));
        }
        // кульминация
        const tO = inout(t, T.clim + .1, T.hit + 1.2);
        vis(gTurn, tO, 18 * (1 - ease.out4((t - T.clim - .1) / .3)));
        if (tO > 0) { const k = clamp((t - T.turn0) / (T.turn1 - T.turn0)); turnT.textContent = (0.5 * k).toFixed(2).replace('.', ',') + ' С'; turnG.textContent = '≈ ' + (4 * k).toFixed(1).replace('.', ',') + ' ГБ'; }
        vis(src2, inout(t, T.hit + .3, T.fin) * .95);
        // знак канала
        const mk = ease.out4((t - (w(97).start - .1)) / .45) * (1 - ease.in4((t - T.end + .5) / .2));
        clipR.setAttribute('width', (360 * clamp(mk)).toFixed(1)); vis(gMark, mk > 0 ? 1 : 0);
        capL.setAttribute('transform', (s.id === 'hook' || s.id === 'climax' || s.id === 'fin') ? 'translate(0 -250)' : '');
        capL.setAttribute('opacity', (t < T.end - 3 ? clamp((t - T.whip0 - .9) / .15) : 1).toFixed(3));   // на хлёстком развороте субтитров нет — их бы размыло
        if (caps) caps.frame(t);
      },
    };
  }

  window.FILM = { duration: DUR, T, at, sfx, makeUI, ready: null };
})();
