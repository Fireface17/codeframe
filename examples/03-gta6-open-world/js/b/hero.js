// Герой: Quaternius «Ultimate Modular Characters» → Casual_Hoodie (CC0, assets/3d/LICENSE-quaternius.txt).
// Доработки: капюшон надет (своя геометрия на кости головы), голова меньше на 13 %, плечи шире на 9 %, матовая оливковая
// куртка, длинные прямые штаны (голени — та же ткань), поза «руки в карманах, вес на одной ноге» поверх клипа Idle.
// Свет: заполнение от мокрого асфальта, контур только с одной стороны (от вывески), вдвое слабее прежнего.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COMMON, U } from './glsl.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
const CACHE = {};

export const HERO_COL = { Purple: '#5C2A31', LightBlue: '#26324A', White: '#26324A', Hair: '#16110E', Skin: '#8E6A56', Eyebrows: '#16110E', Eye: '#101010' };

export function heroMat(col, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uC: { value: new THREE.Color(col) }, uSkinMat: { value: opts.skinLegs ? 1 : 0 }, uBaseY: { value: 0 },
      uRimK: { value: opts.rim ?? 1 }, uLegCol: { value: new THREE.Color(opts.legCol || '#26324A') }, uShoe: { value: opts.shoe ? 1 : 0 } }),
    vertexShader: /* glsl */`
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 vN; varying vec3 vWp;
      void main(){
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 wp = modelMatrix * vec4(transformed, 1.);
        vWp = wp.xyz; vN = normalize(mat3(modelMatrix) * objectNormal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: COMMON + /* glsl */`
      uniform vec3 uC, uLegCol; uniform float uSkinMat, uBaseY, uRimK, uShoe; varying vec3 vN; varying vec3 vWp;
      void main(){
        if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        vec3 base = uC; if (uSkinMat > .5 && vWp.y - uBaseY < .78) base = uLegCol;          // длинные штаны
        if (uShoe > .5 && vWp.y - uBaseY < .6) base = vec3(.86, .84, .8);                  // кроссовки
        if (voidAt(vWp) > .5) base = CLAY;
        vec3 n = normalize(vN + vec3(0., 1e-5, 0.)), V = normalize(cameraPosition - vWp);
        // матовая ткань под солнцем: ключ — солнце с тенью, заполнение — небо; контур — только со стороны солнца
        vec3 c = base * (lightAt(vWp, n, 1.) + mix(uAmbGround, uAmbSky, n.y * .5 + .5) * .7);   // ткань: мягкое заполнение, тени не проваливаются в чёрное
        float rim = pow(1. - max(dot(n, V), 0.), 4.) * max(dot(n, uSunDir), 0.);
        c += base * uSunCol * rim * .6 * uRimK;
        c *= .94 + .12 * vnoise(vWp.xy * 70.);
        float d = distance(cameraPosition, vWp);
        gl_FragColor = vec4(applyFog(c, d, vWp.y), depthA(d));
      }`,
  });
}

// загрузчик убирает точки из имён костей: «UpperArm.L» → «UpperArmL»
// своя доработка позы поверх клипа: голова, плечи, руки в карманах (углы подобраны по пробным кадрам)
const POSE = { head: .87, shoulder: 1.09, armL: [0, 0, 0], armR: [0, 0, 0], foreL: [0, 0, 0], foreR: [0, 0, 0] };
window.__pose = POSE;   // подбор позы в отладке (кадр по-прежнему функция t)
export function poseFromQuery() {
  const q = new URLSearchParams(location.search).get('arm');
  if (q) { const v = q.split(',').map(Number); POSE.armL = v.slice(0, 3); POSE.foreL = v.slice(3, 6); POSE.armR = [v[0], -v[1], -v[2]]; POSE.foreR = [v[3], -v[4], -v[5]]; }
  return POSE;
}

// «шорты поверх штанов»: широкие шорты модели стягиваются к оси ноги и сужаются к колену — получаются прямые джинсы.
// Работает на позе привязки (до скиннинга): по срезам высоты для каждой ноги — центр и средний радиус.
function slimShorts(root) {
  let shorts = null, skinLegs = null;
  root.traverse(o => { if (o.isMesh && o.material && o.material.name === 'LightBlue') shorts = o; });
  if (!shorts) return;
  shorts.parent.children.forEach(o => { if (o.isMesh && o.material && o.material.name === 'Skin') skinLegs = o; });
  shorts.geometry = shorts.geometry.clone();
  const P = shorts.geometry.getAttribute('position'), n = P.count;
  // оси: вертикаль — y; поперёк ног — та из x/z, по которой разброс больше
  let y0 = 1e9, y1 = -1e9, mx = 0, mz = 0; for (let i = 0; i < n; i++) { y0 = Math.min(y0, P.getY(i)); y1 = Math.max(y1, P.getY(i)); mx += P.getX(i); mz += P.getZ(i); } mx /= n; mz /= n;
  let vx = 0, vz = 0; for (let i = 0; i < n; i++) { vx += (P.getX(i) - mx) ** 2; vz += (P.getZ(i) - mz) ** 2; }
  const ax = vx >= vz ? 'X' : 'Z', side = i => (ax === 'X' ? P.getX(i) - mx : P.getZ(i) - mz) > 0 ? 1 : -1;
  const H = y1 - y0, NS = 24, bin = i => Math.min(NS - 1, Math.floor((P.getY(i) - y0) / H * NS));
  let crotch = NS; for (let k = 0; k < NS; k++) { let near = false; for (let i = 0; i < n; i++) if (bin(i) === k && Math.abs(ax === 'X' ? P.getX(i) - mx : P.getZ(i) - mz) < H * .04) { near = true; break; } if (near) { crotch = k; break; } }
  const st = {}; for (let i = 0; i < n; i++) { const key = bin(i) + '_' + side(i); const o = st[key] = st[key] || { x: 0, z: 0, c: 0, r: 0 }; o.x += P.getX(i); o.z += P.getZ(i); o.c++; }
  for (const k in st) { st[k].x /= st[k].c; st[k].z /= st[k].c; }
  for (let i = 0; i < n; i++) { const o = st[bin(i) + '_' + side(i)]; o.r += Math.hypot(P.getX(i) - o.x, P.getZ(i) - o.z) / o.c; }
  let rk = 0, ck = 0;
  if (skinLegs) { const S = skinLegs.geometry.getAttribute('position'); for (let i = 0; i < S.count; i++) if (S.getY(i) < y0 - H * .3 && S.getY(i) > y0 - H * .8) {
    const sd = (ax === 'X' ? S.getX(i) - mx : S.getZ(i) - mz) > 0 ? 1 : -1, o = st['0_' + sd]; if (o) { rk += Math.hypot(S.getX(i) - o.x, S.getZ(i) - o.z); ck++; } } }
  rk = ck ? rk / ck : null;
  window.__shorts = { n, ax, crotch, rk, r0: st['0_1'] && st['0_1'].r };
  const lim = Math.max(crotch, 4);
  for (let i = 0; i < n; i++) {
    const k = bin(i); if (k >= lim) continue;
    const o = st[k + '_' + side(i)], tt = k / lim;
    const target = (rk ? rk * 1.04 : o.r * .7) * (1 - tt * tt) + o.r * .86 * tt * tt;
    const s = Math.min(1, target / Math.max(o.r, 1e-6));
    P.setX(i, o.x + (P.getX(i) - o.x) * s); P.setZ(i, o.z + (P.getZ(i) - o.z) * s);
  }
  P.needsUpdate = true;
}

export async function loadHero(url, opts = {}) {
  if (!CACHE[url]) CACHE[url] = new GLTFLoader().loadAsync(url);   // один разбор файла на все клоны
  const gltf = await CACHE[url];
  const root = skClone(gltf.scene);
  const rc0 = opts.recolor || HERO_COL;
  const recolor = rc0;
  if (opts.slimShorts) slimShorts(root);
  root.traverse(o => {
    if (o.isMesh) {
      let g = o.geometry; g.deleteAttribute('normal'); g = mergeVertices(g, 1e-4); g.computeVertexNormals(); o.geometry = g;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const nm = mats.map(m => (opts.hood && m.name === 'Hair') ? new THREE.MeshBasicMaterial({ visible: false }) : heroMat(recolor[m.name] || '#' + m.color.getHexString(), { skinLegs: m.name === 'Skin' && !opts.keepLegs, rim: opts.rim, legCol: recolor.White, shoe: m.name === 'Purple' && !opts.keepLegs }));
      o.material = Array.isArray(o.material) ? nm : nm[0];
      o.frustumCulled = false;
    }
  });
  const bones = {}; root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  const mixer = new THREE.AnimationMixer(root);
  const clip = gltf.animations.find(a => a.name === (opts.clip || 'Idle_Neutral')) || gltf.animations.find(a => a.name === 'Idle');
  mixer.clipAction(clip).play();
  const pose = poseFromQuery();
  // доработка позы задаётся от исходных значений костей (не накапливается между кадрами — кадр остаётся функцией t)
  const rest = {}; for (const k of ['Head', 'ShoulderL', 'ShoulderR']) if (bones[k]) rest[k] = { s: bones[k].scale.clone(), p: bones[k].position.clone() };
  const applyPose = () => {
    if (opts.noPose) return;
    if (bones.Head) bones.Head.scale.copy(rest.Head.s).multiplyScalar(pose.head);
    for (const s of ['ShoulderL', 'ShoulderR']) if (bones[s]) bones[s].position.copy(rest[s].p).multiplyScalar(pose.shoulder);
    const rot = (b, v) => { if (!bones[b]) return; bones[b].rotation.x += v[0]; bones[b].rotation.y += v[1]; bones[b].rotation.z += v[2]; };
    rot('UpperArmL', pose.armL); rot('UpperArmR', pose.armR); rot('LowerArmL', pose.foreL); rot('LowerArmR', pose.foreR); rot('WristL', pose.handL || [0, 0, 0]); rot('WristR', pose.handR || [0, 0, 0]);
    rot('UpperLegL', pose.legL || [0, 0, 0]); rot('UpperLegR', pose.legR || [0, 0, 0]); rot('LowerLegL', pose.shinL || [0, 0, 0]); rot('Hips', pose.hips || [0, 0, 0]); rot('Torso', pose.torso || [0, 0, 0]);
  };
  mixer.setTime(0); applyPose();
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const h = box.max.y - box.min.y;
  const g = new THREE.Group();
  root.scale.setScalar((opts.height || 1.8) / h); root.position.y = -box.min.y * (opts.height || 1.8) / h;
  g.add(root);
  g.updateMatrixWorld(true);
  // капюшон: оболочка вокруг головы с вырезом спереди (+z модели) и складка к плечам — дочерние объекты кости головы
  if (opts.hood && bones.Head) {
    const hb = bones.Head, hp = new THREE.Vector3(); hb.getWorldPosition(hp);
    const mat = heroMat(recolor.Purple, { rim: opts.rim });
    const shell = new THREE.SphereGeometry(.128, 36, 24, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * .78);
    shell.scale(1.0, 1.2, 1.16); shell.translate(0, .1, -.02);
    const drape = new THREE.SphereGeometry(1, 28, 16); drape.scale(.12, .06, .085); drape.translate(0, -.03, -.075);
    const inv = new THREE.Matrix4().copy(hb.matrixWorld).invert();
    for (const geo of [shell, drape]) {
      geo.translate(hp.x, hp.y, hp.z);
      geo.applyMatrix4(inv);
      const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; hb.add(m);
    }
  }
  // «руки в карманах»: простая IK по двум костям — плечо смотрит на цель локтя, предплечье на карман (цели в осях героя)
  const V3 = THREE.Vector3, QQ = THREE.Quaternion;
  function aim(bone, child, target) {
    const pB = bone.getWorldPosition(new V3()), pC = child.getWorldPosition(new V3());
    const dq = new QQ().setFromUnitVectors(pC.sub(pB).normalize(), target.clone().sub(pB).normalize());
    const wq = bone.getWorldQuaternion(new QQ()), pq = bone.parent.getWorldQuaternion(new QQ()).invert();
    bone.quaternion.copy(pq.multiply(dq).multiply(wq)); bone.updateMatrixWorld(true);
  }
  function pockets() {
    if (!opts.pockets || !bones.Hips) return;
    g.updateMatrixWorld(true);
    const gq = g.getWorldQuaternion(new QQ()), fwd = new V3(0, 0, 1).applyQuaternion(gq), left = new V3(1, 0, 0).applyQuaternion(gq), up = new V3(0, 1, 0);
    const hips = bones.Hips.getWorldPosition(new V3());
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const ua = bones['UpperArm' + side], la = bones['LowerArm' + side], wr = bones['Wrist' + side]; if (!ua || !la || !wr) continue;
      const sh = ua.getWorldPosition(new V3());
      const elbow = sh.clone().addScaledVector(left, s * .075).addScaledVector(up, -.26).addScaledVector(fwd, -.085);
      const hand = hips.clone().addScaledVector(left, s * .16).addScaledVector(fwd, .1).addScaledVector(up, -.04);
      aim(ua, la, elbow); aim(la, wr, hand);
    }
  }
  // IK пишет в кости рук; если у клипа нет дорожки для кости, поворот копился бы между кадрами — восстанавливаем исходный
  const ikBones = ['UpperArmL', 'LowerArmL', 'UpperArmR', 'LowerArmR'].map(k => bones[k]).filter(Boolean), q0 = ikBones.map(b => b.quaternion.clone());
  return { group: g, update: t => { ikBones.forEach((b, i) => b.quaternion.copy(q0[i])); mixer.setTime((t + (opts.phase || 0)) % clip.duration); applyPose(); pockets(); }, height: h, clips: gltf.animations.map(a => a.name), bones };
}
