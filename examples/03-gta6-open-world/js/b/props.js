// Стиль B: пальмы (свой генератор: изогнутый ствол с кольцами, 9 провисающих листьев с пёрышками), фонари,
// машины с фарами и стоп-сигналами, неоновые вывески без брендов. Всё по данным window.CITY и времени t.
import * as THREE from 'three';
import { COMMON, U } from './glsl.js';

const C = window.CITY;
const lin = h => new THREE.Color(h);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// общий «силуэтный» материал: тёмная заливка, контровой свет города и луны по краю, туман, механики
function silhouetteMat(extraVS = '', extraFS = '', base = '#0D1116') {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(U, { uBase: { value: lin(base) } }),
    vertexShader: COMMON + /* glsl */`
      attribute float aPart; attribute vec3 aCol; varying vec3 vWp; varying vec3 vN; varying float vPart; varying vec3 vC; varying float vLoad; varying vec2 vUv2;
      ${extraVS}
      void main(){
        vec3 p = position; vPart = aPart; vC = aCol; vUv2 = uv;
        mat4 im = mat4(1.);
        #ifdef USE_INSTANCING
          im = instanceMatrix;
        #endif
        vec4 wp = modelMatrix * im * vec4(p, 1.);
        vec3 org = (modelMatrix * im * vec4(0., 0., 0., 1.)).xyz;
        vLoad = mix(1., loadOf(cellCenter(org.xz)), uMech);
        if (vLoad < .05) wp.y = -50.;
        vWp = wp.xyz; vN = normalize(mat3(modelMatrix * im) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: COMMON + /* glsl */`
      uniform vec3 uBase; varying vec3 vWp; varying vec3 vN; varying float vPart; varying vec3 vC; varying float vLoad; varying vec2 vUv2;
      void main(){
        if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        ${extraFS}
        vec3 n = normalize(vN);
        vec3 alb = vPart > 1.5 ? vC : vPart > .5 ? vec3(.8, .78, .72) : uBase;
        if (voidAt(vWp) > .5) alb = CLAY; else if (uMech > .5 && wedgeOf(vWp.xz, 0.) < .5) alb = mix(vec3(dot(alb, vec3(.3, .55, .15))), alb, .4) * .82;
        vec3 c = alb * lightAt(vWp, n, 1.);
        float d = distance(cameraPosition, vWp);
        gl_FragColor = vec4(applyFog(c, d, vWp.y), depthA(d));
      }`,
  });
}

// ——— пальмы ———
function palmGeometry(seed) {
  const R = mulberry(seed);
  const P = [], N = [], UV = [], PART = [], COL = [], idx = [];
  const H = 10, lean = .9 + R() * .8;
  const trunk = s => new THREE.Vector3(lean * s * s * 1.4, H * s, 0);
  // ствол: сужающаяся трубка с кольцами
  const seg = 18, rs = 8;
  for (let i = 0; i <= seg; i++) {
    const s = i / seg, c = trunk(s), r = (.26 - .1 * s) * (1 + .12 * (Math.sin(s * 60) > .6 ? 1 : 0));
    for (let k = 0; k <= rs; k++) {
      const a = k / rs * Math.PI * 2, nx = Math.cos(a), nz = Math.sin(a);
      P.push(c.x + nx * r, c.y, c.z + nz * r); N.push(nx, 0, nz); UV.push(k / rs, s); PART.push(0); COL.push(0, 0, 0);
    }
  }
  for (let i = 0; i < seg; i++) for (let k = 0; k < rs; k++) { const a = i * (rs + 1) + k, b = a + rs + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  // крона: 9 листьев-лент, провис и пёрышки (вырез в шейдере по uv)
  const top = trunk(1), nf = 9;
  for (let f = 0; f < nf; f++) {
    const base = P.length / 3;
    const az = f / nf * Math.PI * 2 + (R() - .5) * .5, up = .55 + R() * .5, len = 4.2 + R() * 1.6, droop = 1.4 + R() * 1.2;
    const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const ns = 14;
    for (let i = 0; i <= ns; i++) {
      const s = i / ns;
      const pos = top.clone().addScaledVector(dir, len * s).add(new THREE.Vector3(0, up * len * s * (1 - s) * 1.6 - droop * s * s, 0));
      const w = 1.25 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08 + .04)), .7) * (1 - .3 * s);
      const bend = .35 * w;                                              // лист сложен «домиком» вдоль жилки
      for (const sd of [-1, 0, 1]) {
        const v = pos.clone().addScaledVector(side, sd * w).add(new THREE.Vector3(0, -Math.abs(sd) * bend, 0));
        P.push(v.x, v.y, v.z); N.push(0, 1, 0); UV.push(sd * .5 + .5, s); PART.push(3); COL.push(.012, .02, .018);
      }
    }
    for (let i = 0; i < ns; i++) for (let k = 0; k < 2; k++) { const a = base + i * 3 + k, b = a + 3; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(PART, 1));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(COL, 3));
  g.setIndex(idx);
  return g;
}
// Пальмы: FabinhoSC «Exotic Palms Lowpoly style» (CC0, assets/3d/palms/LICENSE-CC0.txt) — 5 пальм, каждое перо отдельно,
// изогнутые стволы; атлас LowPolyTextureMap.png. Ночью/днём — один материал: солнце с тенью, листва приглушена к шалфею,
// просвет пера на солнце, качание кроны sin(t + фаза) (кадр — функция t).
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
export async function buildPalms() {
  const files = ['ExoticPalmDefalt', 'ExoticPalmCurve', 'ExoticPalmOld', 'ExoticPalmYoung', 'ExoticPalmDefalt'];
  const tex = await new THREE.TextureLoader().loadAsync('assets/3d/palms/LowPolyTextureMap.png');
  tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = true;
  const loader = new FBXLoader();
  const variants = [];
  for (const f of files) {
    const obj = await loader.loadAsync(`assets/3d/palms/${f}.fbx`);
    obj.updateMatrixWorld(true);
    const parts = [];
    obj.traverse(o => { if (o.isMesh) { const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()); g.applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); g.clearGroups(); parts.push(g); } });
    const g = mergeGeometries(parts);
    g.computeBoundingBox(); const bb = g.boundingBox, h = bb.max.y - bb.min.y;
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y - h * .05, -(bb.min.z + bb.max.z) / 2); g.scale(10 / h, 10 / h, 10 / h);   // утолщение-корень уходит под землю
    variants.push(g);
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { tMap: { value: tex } }), side: THREE.DoubleSide,
    vertexShader: COMMON + `varying vec2 vUv; varying vec3 vWp; varying vec3 vN;
      void main(){ vUv = uv; vec3 p = position;
        vec3 o0 = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
        float ph = h21(o0.xz) * 6.28, k = clamp(p.y / 10., 0., 1.);
        float sway = k * k * k * (sin(uTime * 1.3 + ph) * .3 + sin(uTime * 2.9 + ph * 2.) * .08);
        p.x += sway; p.z += sway * .4;
        vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.);
        if (mix(1., loadOf(cellCenter(o0.xz)), uMech) < .05) wp.y = -50.;
        vWp = wp.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + `uniform sampler2D tMap; varying vec2 vUv; varying vec3 vWp; varying vec3 vN;
      void main(){ if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        if (voidAt(vWp) > .5) discard;   // пальма в зоне «не рисуется» не рисуется вовсе — без рваной глины
        vec3 tx = texture2D(tMap, vUv).rgb; vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        float lt = dot(tx, vec3(.3, .55, .15)); vec3 alb = mix(vec3(lt), tx, tx.r > tx.g ? .28 : .5) * (tx.r > tx.g ? vec3(1., .92, .86) : vec3(1., .97, .86));   // листва — шалфей, ствол — серо-коричневый
        if (voidAt(vWp) > .5) alb = CLAY; else if (uMech > .5 && wedgeOf(vWp.xz, 0.) < .5) alb = mix(vec3(dot(alb, vec3(.3, .55, .15))), alb, .4) * .82;
        vec3 Ls = lightAt(vWp, n, 1.) + uSunCol * .22 * max(dot(-n, uSunDir), 0.) * vec3(.7, .85, .5);
        vec3 c = alb * Ls;
        float d = distance(cameraPosition, vWp); gl_FragColor = vec4(applyFog(c, d, vWp.y), depthA(d)); }`,
  });
  const grp = new THREE.Group();
  const rows = C.palms.rows;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), T = new THREE.Vector3();
  variants.forEach((g, v) => {
    const list = rows.filter((r, i) => i % variants.length === v);
    const im = new THREE.InstancedMesh(g, mat, list.length);
    list.forEach((r, i) => { const [x, z, h, lean, rot] = r; Q.setFromEuler(new THREE.Euler(0, rot, lean * .2)); S.setScalar(h / 10 * 1.1); T.set(x, 0, z); M.compose(T, Q, S); im.setMatrixAt(i, M); });
    im.frustumCulled = false; grp.add(im);
  });
  return grp;
}

// ——— фонари: по правилу из city.json ———
export function lampPositions() {
  const out = [], g = C.grid, inW = (x, z) => z > C.water.seaZ || ((x - C.water.bay.cx) / C.water.bay.rx) ** 2 + ((z - C.water.bay.cz) / C.water.bay.rz) ** 2 < 1;
  const avW = x => x === 0 ? 30 : 16;
  const nearAv = x => g.avX.reduce((m, a) => Math.abs(x - a) < Math.abs(x - m) ? a : m, 1e9);
  const nearSt = z => g.stZ.reduce((m, a) => Math.abs(z - a) < Math.abs(z - m) ? a : m, 1e9);
  for (const z of g.stZ) for (const s of [-1, 1]) for (let x = g.av.x0 + C.lamps.offset; x < g.av.x1; x += C.lamps.spacing) {
    const lz = z + s * (7 + 1.2), a = nearAv(x);
    if (Math.abs(x - a) < avW(a) / 2 + 2 || inW(x, lz)) continue;
    out.push([x, lz, s > 0 ? Math.PI : 0]);
  }
  for (const x of g.avX) for (const s of [-1, 1]) for (let z = g.st.z0 + C.lamps.offset; z < g.st.z1; z += C.lamps.spacing) {
    const lx = x + s * (avW(x) / 2 + 1.2), b = nearSt(z);
    if (Math.abs(z - b) < 9 || inW(lx, z) || (Math.abs(lx - C.hero.x) < 4 && Math.abs(z - C.hero.z) < 30)) continue;   // не за спиной героя в хуке
    out.push([lx, z, s > 0 ? -Math.PI / 2 : Math.PI / 2]);
  }
  return out;
}
export function buildLamps() {
  const P = [], N = [], PART = [], COL = [];
  const lamp = lin('#FFB070').multiplyScalar(4);
  const addBox = (x0, x1, y0, y1, z0, z1, part, col) => {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const nv = g.getAttribute('position').count, ni = g.index.array;
    const pa = g.getAttribute('position').array, na = g.getAttribute('normal').array;
    for (const i of ni) { P.push(pa[i * 3], pa[i * 3 + 1], pa[i * 3 + 2]); N.push(na[i * 3], na[i * 3 + 1], na[i * 3 + 2]); PART.push(part); COL.push(col.r, col.g, col.b); }
  };
  const k = new THREE.Color(0, 0, 0);
  addBox(-.09, .09, 0, 8, -.09, .09, 0, k);              // столб
  addBox(-.06, .06, 7.85, 8, 0, 1.6, 0, k);              // кронштейн к дороге (+z)
  addBox(-.22, .22, 7.72, 7.9, 1.2, 1.9, 0, k);          // плафон
  addBox(-.18, .18, 7.66, 7.73, 1.25, 1.85, 1, lamp);    // светящаяся линза
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(PART, 1));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(COL, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(P.length / 3 * 2), 2));
  const pos = lampPositions();
  const im = new THREE.InstancedMesh(g, silhouetteMat('', '', '#5E636B'), pos.length);
  const M = new THREE.Matrix4();
  pos.forEach(([x, z, r], i) => { M.makeRotationY(r); M.setPosition(x, 0, z); im.setMatrixAt(i, M); });
  im.frustumCulled = false;
  return im;
}

// ——— машины: Kenney Car Kit (CC0, assets/3d/LICENSE-kenney-car-kit.txt), ночная перекраска, фары и стоп-сигналы
// излучают (по цвету палитры колормапа и стороне кузова). Позиция — функция t; фары освещают асфальт перед собой.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const CAR_TINT = ['#D9D4CA', '#8FA8B8', '#C98F82', '#A9B7A0', '#5A6270', '#E2D2B0'].map(lin);   // пыльные кузова: белый, голубой, коралл, шалфей, графит, песок
export async function buildCars() {
  // Quaternius cars v2 (CC0, assets/3d/cars/LICENSE-CC0.txt): скруглённые кузова, арки, диски; материалы → атрибуты
  // aMat: 0 кузов (цвет инстанса), 1 стекло, 2 тёмные детали, 3 фары, 4 стоп-сигналы, 5 прочее (свой цвет)
  const files = ['car-quaternius-cz6y', 'car-quaternius-unqq', 'sports-car-quaternius-1mkm', 'sports-car-quaternius-oyqk', 'suv-quaternius-xsmt', 'taxi-quaternius-x43l'];
  const loader = new GLTFLoader();
  const protos = [];
  const map = null;
  for (const f of files) {
    const g = await loader.loadAsync(`assets/3d/cars/${f}.glb`);
    g.scene.updateMatrixWorld(true);
    const parts = []; let bodyName = null;
    g.scene.traverse(o => { if (o.isMesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; if (!bodyName) bodyName = mats[0].name;
      const base = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      const groups = base.groups.length ? base.groups : [{ start: 0, count: base.getAttribute('position').count, materialIndex: 0 }];
      for (const gr of groups) { const m = mats[gr.materialIndex || 0];
        const sub = new THREE.BufferGeometry(); for (const k of ['position', 'normal']) { const at = base.getAttribute(k); sub.setAttribute(k, new THREE.Float32BufferAttribute(at.array.slice(gr.start * 3, (gr.start + gr.count) * 3), 3)); }
        sub.applyMatrix4(o.matrixWorld);
        const nm = m.name, kind = nm === bodyName && !f.startsWith('taxi') ? 0 : /Window/.test(nm) ? 1 : /Black|Grey/.test(nm) ? 2 : /Headlight/.test(nm) ? 3 : /Tail|Brake/.test(nm) ? 4 : 5;
        const cnt = gr.count, A = new Float32Array(cnt * 4); for (let i = 0; i < cnt; i++) { A[i * 4] = kind; A[i * 4 + 1] = m.color.r; A[i * 4 + 2] = m.color.g; A[i * 4 + 3] = m.color.b; }
        sub.setAttribute('aMat', new THREE.Float32BufferAttribute(A, 4)); sub.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(cnt * 2), 2));
        parts.push(sub); } } });
    protos.push(mergeGeometries(parts));
  }
  const rows = C.cars.rows;
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: COMMON + /* glsl */`
      attribute vec4 aMat; varying vec4 vMat; varying vec3 vWp; varying vec3 vN; varying vec3 vTint;
      void main(){ vMat = aMat; vTint = vec3(1.);
        #ifdef USE_INSTANCING_COLOR
          vTint = instanceColor;
        #endif
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.); vWp = wp.xyz;
        vec3 org = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
        if (mix(1., loadOf(cellCenter(org.xz)), uMech) < .05) wp.y = -60.;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + /* glsl */`
      varying vec4 vMat; varying vec3 vWp; varying vec3 vN; varying vec3 vTint;
      void main(){
        if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        vec3 n = normalize(vN), V = normalize(cameraPosition - vWp);
        float k = vMat.x; vec3 mc = vMat.yzw;
        vec3 alb = k < .5 ? vTint : k < 1.5 ? vec3(.03, .035, .04) : k < 2.5 ? mc * 1.4 + .02 : k < 3.5 ? vec3(.85, .82, .72) : k < 4.5 ? vec3(.55, .08, .07) : mix(vec3(dot(mc, vec3(.3, .55, .15))), mc, .7);
        if (voidAt(vWp) > .5) alb = CLAY; else if (uMech > .5 && wedgeOf(vWp.xz, 0.) < .5) alb = mix(vec3(dot(alb, vec3(.3, .55, .15))), alb, .4) * .82;
        vec3 c = alb * lightAt(vWp, n, 1.);
        float fres = .04 + .96 * pow(1. - max(dot(n, V), 0.), 5.);
        float gloss = k < .5 ? .5 : k < 1.5 ? .9 : .15;
        c += skyRefl(reflect(-V, n)) * fres * gloss + uSunCol * pow(max(dot(reflect(-V, n), uSunDir), 0.), 120.) * shadowAt(vWp, n) * 1.4 * gloss;   // лак и стекло
        float d = distance(cameraPosition, vWp);
        gl_FragColor = vec4(applyFog(c, d, vWp.y), depthA(d));
      }`,
  });
  const meshes = protos.map((g, k) => {
    const list = rows.map((r, i) => i).filter(i => i % protos.length === k);
    const im = new THREE.InstancedMesh(g, mat, list.length);
    list.forEach((i, j) => im.setColorAt(j, CAR_TINT[rows[i][5]]));
    im.frustumCulled = false; im.userData.list = list;
    return im;
  });
  const grp = new THREE.Group(); meshes.forEach(m => grp.add(m));
  const pm0 = mat;
  
  const prow = C.parked.rows, Mp = new THREE.Matrix4();
  protos.forEach((g, k) => { const lst = prow.filter((r, i) => r[3] % protos.length === k); const im = new THREE.InstancedMesh(g, pm0, lst.length);
    lst.forEach((r, j) => { Mp.makeRotationY(r[2]); Mp.setPosition(r[0], 0, r[1]); im.setMatrixAt(j, Mp); im.setColorAt(j, CAR_TINT[(j * 3 + k) % CAR_TINT.length]); }); im.frustumCulled = false; grp.add(im); });
  // пятна фар на асфальте
  const pg = new THREE.PlaneGeometry(5, 16); pg.rotateX(-Math.PI / 2); pg.translate(0, .05, 10.5);
  const pm = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: COMMON + `varying vec2 vUv; varying vec3 vWp; void main(){ vUv = uv; vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.); vWp = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + `varying vec2 vUv; varying vec3 vWp; void main(){ float x = (vUv.x - .5) * 2.; float y = 1. - vUv.y;
      float a = exp(-x * x / (.12 + .5 * y)) * smoothstep(0., .15, y) * (1. - smoothstep(.4, 1., y));
      float d = distance(cameraPosition, vWp); a *= 1. - fogF(d, 0.);
      if (uMech > .001) a *= mix(1., loadOf(cellCenter(vWp.xz)), uMech);
      gl_FragColor = vec4(vec3(1., .88, .7) * clamp(a, 0., 1.) * .09, 1.); }`,
  });
  const pools = new THREE.InstancedMesh(pg, pm, rows.length); pools.frustumCulled = false; pools.renderOrder = 2;
  const inW = (x, z) => z > C.water.seaZ - 4 || ((x - C.water.bay.cx) / (C.water.bay.rx + 6)) ** 2 + ((z - C.water.bay.cz) / (C.water.bay.rz + 6)) ** 2 < 1;
  const M = new THREE.Matrix4();
  const g0 = C.grid, hx = C.hero.x, hz = C.hero.z;
  const place = (i, t) => {
    const [alongZ, line, dir, s0, v] = rows[i];
    const L = alongZ ? g0.st.z1 - g0.st.z0 : g0.av.x1 - g0.av.x0;
    let s = ((s0 + v * t) % L + L) % L; if (dir < 0) s = L - s;
    let x, z, rot;
    if (alongZ) { z = g0.st.z0 + s; x = line - dir * (line === 0 ? 9 : 3.6); rot = dir > 0 ? 0 : Math.PI; }
    else { x = g0.av.x0 + s; z = line + dir * 3.6; rot = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    // не наезжать на героя и не стоять вплотную перед камерой кадра (а)
    const hide = inW(x, z) || (Math.abs(x - hx) < 14 && z > hz - 45 && z < hz + 60);
    M.makeRotationY(rot); M.setPosition(x, 0, z);
    if (hide) M.makeScale(0, 0, 0);          // спрятанная машина и её пятно фар не дают ни одного фрагмента
  };
  function update(t) {
    meshes.forEach(im => { im.userData.list.forEach((i, j) => { place(i, t); im.setMatrixAt(j, M); }); im.instanceMatrix.needsUpdate = true; });
    rows.forEach((r, i) => { place(i, t); pools.setMatrixAt(i, M); }); pools.instanceMatrix.needsUpdate = true;
  }
  return { cars: grp, pools, update };
}

// ——— неоновые вывески: атлас слов, «трубка» = обводка + ядро; у части — вертикальные лопасти поперёк фасада ———
export async function buildSigns() {
  await document.fonts.load('700 100px Unbounded', 'HOTEL');
  const words = [...new Set(C.signs.map(s => s.txt))];
  const cellW = 1024, cellH = 160, cv = document.createElement('canvas');
  cv.width = cellW * 2; cv.height = cellH * Math.ceil(words.length / 2) * 2;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  const cellOf = {};
  words.forEach((w, i) => {
    const cx = (i % 2) * cellW, cy = Math.floor(i / 2) * cellH;
    ctx.font = '700 112px Unbounded'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const tw = Math.min(cellW - 60, ctx.measureText(w).width);
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgb(255,255,255)'; ctx.fillText(w, cx + cellW / 2, cy + cellH / 2, cellW - 60);
    cellOf[w] = { u0: cx / cv.width, v0: 1 - (cy + cellH) / cv.height, du: cellW / cv.width, dv: cellH / cv.height, aspect: (tw + 60) / cellH };
  });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const P = [], UV = [], COL = [], N = [], CEN = [];
  const neon = C.palette.neon.map(lin);
  const PYL = ['#3F7F86', '#C8705F', '#4A5878'].map(lin);   // рельеф пилонов: приглушённые бирюза, коралл, синий
  const B = C.buildings;
  for (const s of C.signs) {
    const b = B[s.bld], cw = cellOf[s.txt];
    const col = s.pylon ? PYL[s.col % PYL.length] : neon[s.col];
    let H = (s.vertical ? 3.2 : 3.0) * (s.size || 1), Wd = H * cw.aspect;
    let o, ax, ay, n;
    const fx = { n: [0, 0, -1], s: [0, 0, 1], e: [1, 0, 0], w: [-1, 0, 0] }[s.face];
    if (s.pylon) {
      // рельефная надпись на пилоне ар-деко: буквы сверху вниз, плоско на лицевой грани пилона
      const y0 = b.fh * .9 + 1, y1 = b.h + 4; H = 1.9; Wd = H * cw.aspect; if (Wd > y1 - y0) { Wd = y1 - y0; H = Wd / cw.aspect; }
      const cx = s.face === 'e' ? b.x1 + 1.03 : s.face === 'w' ? b.x0 - 1.03 : (b.x0 + b.x1) / 2;
      const cz = s.face === 's' ? b.z1 + 1.03 : s.face === 'n' ? b.z0 - 1.03 : (b.z0 + b.z1) / 2;
      o = new THREE.Vector3(cx, y1 - Wd / 2, cz); n = new THREE.Vector3(...fx);
      ax = new THREE.Vector3(0, -1, 0); ay = new THREE.Vector3().crossVectors(n.clone().negate(), new THREE.Vector3(0, 1, 0));
      const hw = Wd / 2, hh = H / 2, corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const uvs = [[cw.u0, cw.v0], [cw.u0 + cw.du, cw.v0], [cw.u0 + cw.du, cw.v0 + cw.dv], [cw.u0, cw.v0 + cw.dv]];
      for (const k of [0, 1, 2, 0, 2, 3]) { const [a2, c2] = corners[k]; const v = o.clone().addScaledVector(ax, a2 * hw).addScaledVector(ay, c2 * hh);
        P.push(v.x, v.y, v.z); UV.push(...uvs[k]); COL.push(col.r, col.g, col.b); N.push(n.x, n.y, n.z); CEN.push((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, b.cell); }
      continue;
    }
    const cx = s.face === 'e' ? b.x1 : s.face === 'w' ? b.x0 : b.x0 + (b.x1 - b.x0) * s.u;
    const cz = s.face === 's' ? b.z1 : s.face === 'n' ? b.z0 : b.z0 + (b.z1 - b.z0) * s.u;
    if (!s.vertical) {
      o = new THREE.Vector3(cx + fx[0] * .25, s.y, cz + fx[2] * .25);
      ax = new THREE.Vector3(-fx[2], 0, fx[0]).multiplyScalar(-1);            // вдоль фасада, читается снаружи
      ay = new THREE.Vector3(0, 1, 0); n = new THREE.Vector3(...fx);
    } else {
      // лопасть: перпендикулярно фасаду, буквы идут сверху вниз (текст повёрнут на 90°)
      o = new THREE.Vector3(cx + fx[0] * (H / 2 + .3), s.y + Wd / 2, cz + fx[2] * (H / 2 + .3));
      ax = new THREE.Vector3(0, -1, 0); ay = new THREE.Vector3(fx[0], 0, fx[2]); n = new THREE.Vector3(-fx[2], 0, fx[0]);
    }
    const hw = Wd / 2, hh = H / 2;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const uvs = [[cw.u0, cw.v0], [cw.u0 + cw.du, cw.v0], [cw.u0 + cw.du, cw.v0 + cw.dv], [cw.u0, cw.v0 + cw.dv]];
    for (const twoSided of (s.vertical ? [1, -1] : [1])) for (const k of [0, 1, 2, 0, 2, 3]) {
      const [a, c] = corners[k];
      const sx = twoSided;
      const v = o.clone().addScaledVector(ax, a * hw * sx).addScaledVector(ay, c * hh);
      P.push(v.x, v.y, v.z); UV.push(...uvs[k]); COL.push(col.r, col.g, col.b); N.push(n.x * sx, n.y, n.z * sx);
      CEN.push((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, b.cell);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(COL, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('aCen', new THREE.Float32BufferAttribute(CEN, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign(U, { tSign: { value: tex } }), side: THREE.DoubleSide,
    vertexShader: COMMON + `attribute vec3 aCol; attribute vec3 aCen; varying vec2 vUv; varying vec3 vC; varying vec3 vWp; varying float vL; varying vec3 vNn;
      void main(){ vUv = uv; vC = aCol; vL = mix(1., loadOf(cellCenter(aCen.xy)) * wedgeOf(aCen.xy, 20.), uMech) * (1. - uVoid); vNn = normal; vec4 wp = modelMatrix * vec4(position, 1.); vWp = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + `uniform sampler2D tSign; varying vec2 vUv; varying vec3 vC; varying vec3 vWp; varying float vL; varying vec3 vNn;
      void main(){ if (uShadowPass > .5) discard; float a = texture2D(tSign, vUv).r; if (a < .5 || vL < .5 || voidAt(vWp) > .5) discard;
        if (dot(vNn, cameraPosition - vWp) < 0.) discard;
        vec3 c = vC * lightAt(vWp, normalize(vNn), 1.);
        float d = distance(cameraPosition, vWp);
        gl_FragColor = vec4(applyFog(c, d, vWp.y), depthA(d)); }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 3; mesh.frustumCulled = false;
  return mesh;
}

// ——— кольцо подгрузки: светлая стена-фронт по радиусу (видна поверх кварталов, гаснет кверху) ———
export function buildRingWall() {
  const g = new THREE.CylinderGeometry(1, 1, 16, 256, 1, true); g.translate(0, 8, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vWp; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vWp = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vWp, 1.); }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vWp; void main(){ float y = vUv.y; float a = pow(1. - y, 2.) * .32 + exp(-y * 40.) * .4;
      float face = pow(abs(dot(normalize(vN), normalize(cameraPosition - vWp))), .6);
      gl_FragColor = vec4(vec3(1., .78, .24), a * face); }`,
  });
  Object.assign(m, { blending: THREE.NormalBlending, transparent: true });
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 4; mesh.frustumCulled = false;
  return mesh;
}

// ——— светофоры на углах перекрёстков главной авеню: столб, консоль над дорогой, три линзы; фаза — функция t ———
export function buildTrafficLights() {
  const P = [], N = [], PART = [];
  const addBox = (x0, x1, y0, y1, z0, z1, part) => {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const pa = g.getAttribute('position').array, na = g.getAttribute('normal').array;
    for (const i of g.index.array) { P.push(pa[i * 3], pa[i * 3 + 1], pa[i * 3 + 2]); N.push(na[i * 3], na[i * 3 + 1], na[i * 3 + 2]); PART.push(part); }
  };
  addBox(-.12, .12, 0, 6.2, -.12, .12, 0);                 // столб
  addBox(-.08, .08, 5.9, 6.05, 0, 6.5, 0);                // консоль над дорогой (+z локально)
  addBox(-.28, .28, 4.7, 6.0, 5.9, 6.4, 0);               // корпус
  for (const [k, y] of [[1, 5.72], [2, 5.35], [3, 4.98]]) addBox(-.17, .17, y - .15, y + .15, 5.86, 5.9, k);   // линзы: красный, жёлтый, зелёный
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(PART, 1));
  const rows = C.trafficLights.rows;
  const state = new THREE.InstancedBufferAttribute(new Float32Array(rows.length), 1); g.setAttribute('aState', state);
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: COMMON + `attribute float aPart; attribute float aState; varying float vPart; varying float vSt; varying vec3 vWp; varying vec3 vN;
      void main(){ vPart = aPart; vSt = aState; vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.); vWp = wp.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + `varying float vPart; varying float vSt; varying vec3 vWp; varying vec3 vN;
      void main(){ float d = distance(cameraPosition, vWp);
        if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        vec3 c = vec3(.08, .085, .09) * lightAt(vWp, normalize(vN), 1.);
        if (vPart > .5) { vec3 lc = vPart < 1.5 ? vec3(1., .12, .08) : vPart < 2.5 ? vec3(1., .62, .1) : vec3(.15, 1., .55);
          float on = abs(vPart - vSt) < .5 ? 1. : 0.; c = mix(lc * .05, lc * 1.6, on); }
        gl_FragColor = vec4(mix(c, uFogCol, fogF(d, vWp.y) * (vPart > .5 ? .5 : 1.)), depthA(d)); }`,
  });
  const im = new THREE.InstancedMesh(g, m, rows.length);
  const M = new THREE.Matrix4();
  rows.forEach(([x, z, rot], i) => { M.makeRotationY(rot + (x < 0 ? Math.PI / 2 : -Math.PI / 2)); M.setPosition(x, 0, z); im.setMatrixAt(i, M); });
  im.frustumCulled = false;
  return { mesh: im, update(t) { rows.forEach(([, , , ph], i) => { const c = ((t + ph) % 30 + 30) % 30; state.array[i] = c < 14 ? 3 : c < 17 ? 2 : 1; }); state.needsUpdate = true; } };
}

// ——— клин взгляда объёмом: полупрозрачная призма #FFC83D от земли до 60 м (на виде сверху читается поверх крыш) ———
export function buildWedgeVolume() {
  const n = 32, P = [], A = [];
  const addTri = (a, b, c, ka, kb, kc) => { P.push(...a, ...b, ...c); A.push(ka, kb, kc); };
  const pt = (k, y) => { const a = -1 + 2 * k / n; return [Math.sin(a), y, -Math.cos(a)]; };   // единичный клин, масштаб — в шейдере
  for (let i = 0; i < n; i++) {
    addTri([0, 1, 0], pt(i, 1), pt(i + 1, 1), 1, 1, 1);                         // верх
  }
  for (const k of [0, n]) { const e = pt(k, 0), f = pt(k, 1); addTri([0, 0, 0], e, f, 0, 0, 1); addTri([0, 0, 0], f, [0, 1, 0], 0, 1, 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aY', new THREE.Float32BufferAttribute(A, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: COMMON + `attribute float aY; varying float vY; varying vec2 vXZ;
      void main(){ vec3 p = position; float a = atan(p.x, -p.z) * (uHalf / 1.); float r = length(p.xz) * uRange;
        float h = atan(uDir.x, -uDir.y);
        vec3 w = vec3(uHero.x + sin(h + a) * r, p.y * 60., uHero.y - cos(h + a) * r); vY = aY; vXZ = vec2(length(p.xz), 0.);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `varying float vY; varying vec2 vXZ; void main(){ float a = .06 * (1. - vXZ.x * .4) * (.6 + .4 * vY); gl_FragColor = vec4(vec3(1., .78, .24), a); }`,
  });
  Object.assign(m, { blending: THREE.NormalBlending });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 5; return mesh;
}

// ——— зонтики: кафе на тротуаре авеню и пляж; купол-конус пастельных цветов на стойке ———
export function buildUmbrellas() {
  const rows = C.umbrellas.rows;
  const cone = new THREE.ConeGeometry(1, .55, 12, 1, true); cone.translate(0, 2.35, 0);
  const pole = new THREE.CylinderGeometry(.04, .04, 2.4, 6); pole.translate(0, 1.2, 0);
  const COLS = ['#E8806E', '#F3EAD4', '#6FC2B8', '#F2B65A', '#E9A2B8'].map(lin);
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.DoubleSide,
    vertexShader: COMMON + `varying vec3 vWp; varying vec3 vN; varying vec3 vC; varying vec3 vL;
      void main(){ vC = vec3(1.);
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #endif
        vL = position; vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.); vWp = wp.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + `varying vec3 vWp; varying vec3 vN; varying vec3 vC; varying vec3 vL;
      void main(){ if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        float stripe = step(.5, fract(atan(vL.x, vL.z) / 6.2832 * 8.));
        vec3 alb = vL.y < 2. ? vec3(.8) : mix(vC, vec3(.95, .93, .9), stripe * .85);
        if (voidAt(vWp) > .5) alb = CLAY; else if (uMech > .5 && wedgeOf(vWp.xz, 0.) < .5) alb = mix(vec3(dot(alb, vec3(.3, .55, .15))), alb, .4) * .82;
        if (uMech > .5 && loadOf(cellCenter(vWp.xz)) < .5) discard;
        vec3 c = alb * lightAt(vWp, n, 1.); float d = distance(cameraPosition, vWp);
        gl_FragColor = vec4(applyFog(c, d, vWp.y), depthA(d)); }`,
  });
  const grp = new THREE.Group(), M = new THREE.Matrix4(), S = new THREE.Vector3(), Qn = new THREE.Quaternion(), T = new THREE.Vector3();
  for (const g of [cone, pole]) {
    const im = new THREE.InstancedMesh(g, mat, rows.length);
    rows.forEach(([x, z, c, r], i) => { S.set(r, 1, r); T.set(x, 0, z); M.compose(T, Qn, S); im.setMatrixAt(i, M); im.setColorAt(i, COLS[c % COLS.length]); });
    im.frustumCulled = false; grp.add(im);
  }
  return grp;
}
