// Стиль B — ночная диорама на three.js (WebGL2 на GPU) + механики и подписи SVG поверх.
// window.seek(t) синхронно ставит камеру, uniform-ы, машины, людей и рендерит кадр. Никаких rAF и Math.random.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { U, COMMON } from './glsl.js';
import { buildBuildings, buildGround, buildWater, buildSky } from './world.js';
import { buildPalms, buildLamps, buildCars, buildSigns, buildRingWall, buildTrafficLights, buildWedgeVolume, buildUmbrellas } from './props.js';
import { loadHero } from '../hero.js';   // герой: Rocketbox Male_Adult_18 (MIT), assets/3d/hero/
import { buildPeople } from './people.js';
import { buildPlane } from './plane.js';
import { makeOverlay } from './overlay.js';

const { W, H, FPS } = window.FRAME;
const C = window.CITY;
const PR = +(new URLSearchParams(location.search).get('pr') || 2);   // 2× рендер → уменьшение = сглаживание
const lin = h => new THREE.Color(h);

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(PR);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // плёночный тонмаппинг сцены; цвета бренда живут в SVG поверх
renderer.toneMappingExposure = .78;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, W / H, .2, 9000);

U.uFogCol.value = lin(C.palette.fog); U.uSkyCol.value = lin('#26304A'); U.uLampCol.value = lin(C.palette.lamp);
// свет: «золотой час» (низкое тёплое солнце, длинные тени, холодные тени от неба) или «яркий день»
const LIGHT = {
  sunset: { sun: [-.3, .1, .95], sunCol: [1, .5, .34], sunK: 2.8, amb: [.42, .32, .52], ambK: .85, gnd: [.42, .26, .22], gndK: .45, hor: '#FF9E78', top: '#7C78B8', fog: '#F2A88A' },
  golden: { sun: [-.45, .34, .83], sunCol: [1, .6, .34], sunK: 3.6, amb: [.3, .37, .56], ambK: .95, gnd: [.42, .3, .2], gndK: .45, hor: '#F6C29A', top: '#8DB0D8', fog: '#E8C6A8' },
  ps2: { sun: [-.5, .7, .5], sunCol: [1, .9, .8], sunK: 2.1, amb: [.6, .6, .78], ambK: .62, gnd: [.45, .4, .34], gndK: .5, hor: '#F6C9B8', top: '#9FD3E0', fog: '#F2D2C4' },
  day: { sun: [-.5, .7, .5], sunCol: [1, .9, .78], sunK: 2.1, amb: [.55, .58, .8], ambK: .62, gnd: [.45, .4, .34], gndK: .5, hor: '#EEDCC6', top: '#8FB2D6', fog: '#D6DCE2' },
};
function setLight(name) {
  const L = LIGHT[name];
  U.uSunDir.value = new THREE.Vector3(...L.sun).normalize();
  U.uSunCol.value = new THREE.Vector3(...L.sunCol).multiplyScalar(L.sunK);
  U.uAmbSky.value = new THREE.Vector3(...L.amb).multiplyScalar(L.ambK);
  U.uAmbGround.value = new THREE.Vector3(...L.gnd).multiplyScalar(L.gndK);
  U.uSkyHor.value = lin(L.hor); U.uSkyTop.value = lin(L.top); U.uFogCol.value = lin(L.fog); U.uSkyCol.value = lin(L.top);
}
// тень солнца: свой shadow map (глубина из ортокамеры солнца); шейдеры сравнивают глубину сами
const SHADOW = 4096;
const shadowRT = new THREE.WebGLRenderTarget(SHADOW, SHADOW, { depthTexture: new THREE.DepthTexture(SHADOW, SHADOW) });
shadowRT.depthTexture.minFilter = shadowRT.depthTexture.magFilter = THREE.NearestFilter;
const sunCam = new THREE.OrthographicCamera(-200, 200, 200, -200, 10, 5000);
const dummyTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); dummyTex.needsUpdate = true;
U.tShadow.value = shadowRT.depthTexture; U.uSunMat.value = new THREE.Matrix4(); U.uShadowTexel.value = 1 / SHADOW;
U.uHero.value = new THREE.Vector2(C.hero.x, C.hero.z); U.uDir.value = new THREE.Vector2(0, -1);
U.uGrid.value = new THREE.Vector4(C.grid.av.x0, C.grid.av.step, C.grid.st.z0, C.grid.st.step);
U.uBay.value = new THREE.Vector4(C.water.bay.cx, C.water.bay.cz, C.water.bay.rx, C.water.bay.rz);
U.uSeaZ.value = C.water.seaZ; U.uLampSp.value = C.lamps.spacing; U.uLampOff.value = C.lamps.offset;

// зеркало земли/воды: отражения неона на мокром асфальте и световые столбы на воде
const refl = new Reflector(new THREE.PlaneGeometry(10, 10), { textureWidth: W * PR / 2, textureHeight: H * PR / 2, clipBias: .003, multisample: 4 });
refl.rotation.x = -Math.PI / 2; refl.position.y = 0.0; refl.updateMatrixWorld();

const sky = buildSky(); scene.add(sky);
const ground = buildGround(refl); scene.add(ground);
const water = buildWater(refl); scene.add(water);
const blds = buildBuildings(); scene.add(blds);
const lamps = buildLamps(); scene.add(lamps);
const tl = buildTrafficLights(); scene.add(tl.mesh);
const ringWall = buildRingWall(); scene.add(ringWall);
const wedgeVol = buildWedgeVolume(); scene.add(wedgeVol);
U.uMergeRect.value = new THREE.Vector4(0, 0, 0, 0); U.uHl.value = new THREE.Vector3(0, 0, 0);
// одна простая модель на месте кластера дальних домов (HLOD): серо-голубой блок со светлыми рёбрами
const mergeBox = new THREE.Mesh((() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, .5, 0); return g; })(), new THREE.ShaderMaterial({
  uniforms: U,
  vertexShader: `varying vec3 vWp; varying vec3 vN; varying vec3 vL; void main(){ vL = position; vec4 wp = modelMatrix * vec4(position, 1.); vWp = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: COMMON + `varying vec3 vWp; varying vec3 vN; varying vec3 vL;
    void main(){ if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
      vec3 n = normalize(vN); vec3 c = vec3(.62, .58, .53) * lightAt(vWp, n, 1.);
      vec3 q = abs(vL - vec3(0., .5, 0.)) * 2.; vec3 fw = fwidth(vL) * 2.;
      float e = max(max(step(1. - fw.x * 2., q.x) * step(1. - fw.y * 2., q.y), step(1. - fw.y * 2., q.y) * step(1. - fw.z * 2., q.z)), step(1. - fw.x * 2., q.x) * step(1. - fw.z * 2., q.z));
      c = mix(c, vec3(.97, .95, .9), e * .9);
      float d = distance(cameraPosition, vWp); gl_FragColor = vec4(applyFog(c, d, vWp.y), depthA(d)); }` }));
mergeBox.material.extensions = { derivatives: true }; mergeBox.visible = false; mergeBox.frustumCulled = false; scene.add(mergeBox);
const umbrellas = buildUmbrellas(); scene.add(umbrellas);
for (const o of [blds, ground, water, sky]) o.frustumCulled = false;
let palms = null, cars = null, hero = null, heroAnim = null, people = null, signs = null;

// пост: мягкая резкость дали (по глубине в альфе) → чистка NaN → bloom только на излучающем → грейд
const rt = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(PR); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const dof = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uMax: { value: 0 }, uRes: { value: new THREE.Vector2(W * PR, H * PR) }, uNear: { value: .3 }, uFg: { value: 0 }, uFgMax: { value: 0 } },
  vertexShader: VS,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uMax, uNear; uniform vec2 uRes;
    uniform float uFg, uFgMax;
    void main(){ vec4 c0 = texture2D(tDiffuse, vUv); float r0 = uMax * smoothstep(uNear, 1., c0.a) + uFgMax * (1. - smoothstep(uFg * .5, uFg, c0.a));   // передний план — в расфокусе
      if (r0 < .4) { gl_FragColor = vec4(c0.rgb, 1.); return; }
      vec3 acc = c0.rgb; float ws = 1.;
      for (int i = 0; i < 24; i++) { float fi = float(i) + .5; float r = r0 * sqrt(fi / 24.); float a = fi * 2.39996;
        vec4 s = texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r / uRes);
        float w = smoothstep(uNear, 1., s.a) + .05;   // близкое не размывается на дальнее; передний план размывается только сам
        acc += s.rgb * w; ws += w; }
      gl_FragColor = vec4(acc / ws, 1.); }` });
// контактные тени: GTAO умеренной силы (ниши, углы, стык стены и тротуара); шум в копии прохода — сидированный
const gtao = new GTAOPass(scene, camera, W * PR, H * PR);
gtao.updateGtaoMaterial({ radius: 1.6, distanceExponent: 1.4, thickness: 1.5, scale: 1.2, samples: 16, distanceFallOff: .8 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
gtao.blendIntensity = .6;
composer.addPass(gtao);
composer.addPass(dof);
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: VS,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
    if (any(isnan(c)) || any(isinf(c))) c = vec3(0.); gl_FragColor = vec4(clamp(c, 0., 24.), 1.); }` }));
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uFrame: { value: 0 }, uVig: { value: .18 }, uGrain: { value: .03 }, uExpo: { value: 1 }, uSatK: { value: 1 }, uPix: { value: 0 }, uPost: { value: 0 }, uPunch: { value: 0 }, uFlash: { value: 0 }, uShake: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) } },
  vertexShader: VS,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uFrame, uVig, uGrain, uExpo, uSatK, uPix, uPost, uPunch, uFlash, uShake; uniform vec2 uRes;
    float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec2 uv = (vUv - .5) / (1. + uPunch) + .5;                                  // удар всем кадром: короткий наезд
      uv += uShake * vec2(sin(uFrame * 12.9898), cos(uFrame * 78.233)) / uRes;     // тряска ≤ 8 px
      if (uPix > .5) uv = (floor(uv * uRes / uPix) + .5) * uPix / uRes;            // PS2: крупные пиксели
      vec3 c = max(texture2D(tDiffuse, uv).rgb, 0.) * uExpo;
      if (uPost > .5) c = floor(c * uPost + .5) / uPost;                           // PS2: мало оттенков
      float l = dot(c, vec3(.2126, .7152, .0722));
      float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
      c = mix(vec3(l), c, mix(2.4, 1.0, smoothstep(.04, .3, sat)) * uSatK);            // «вибрация»: пыльное оживает, уже яркое не становится леденцом
      c = clamp((c - .5) * .93 + .5, 0., 1.);                                     // мягкий контраст
      c = c * .94 + vec3(.034, .032, .046);                                       // чёрные приподняты, тени лавандово-голубые
      c += vec3(.02, .01, -.012) * smoothstep(.55, .95, l);                       // света кремовые, не белые
      vec2 d = vUv - .5; d.y *= 1.25; c *= 1. - uVig * smoothstep(.3, .9, length(d));
      c += (h(gl_FragCoord.xy + uFrame * 17.31) - .5) * uGrain * (.3 + c * .5);
      c = mix(c, vec3(1., .97, .9), uFlash);
      gl_FragColor = vec4(c, 1.); }`,
});
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W * PR / 2, H * PR / 2), .14, .5, 2.3));   // мягкий ореол только у бликов солнца (высокий порог)
composer.addPass(new OutputPass());
composer.addPass(grade);   // грейд — после тонмаппинга, в дисплейном пространстве

const _pv = new THREE.Vector3();
const projectW = p => { _pv.set(p[0], p[1], p[2]).project(camera); return [(_pv.x * .5 + .5) * W, (-_pv.y * .5 + .5) * H, _pv.z]; };
const overlay = window.FILM ? window.FILM.makeUI(document.getElementById('ov'), projectW) : makeOverlay(document.getElementById('ov'), camera);
let plane = null, planeProp = null;
const Q = new URLSearchParams(location.search);

function frame(t) {
  const s = window.FILM ? window.FILM.at(t) : window.shotAt(t);
  const m = s.mech;
  const wt = s.wt ?? t;   // время мира (машины, люди, вода): в финале совпадает с кадром 0 — петля
  U.uTime.value = wt + 12.0;
  const dbg = Q.get('cam'), cv = window.__cam || (dbg ? dbg.split(',').map(Number) : null);   // отладка: ?cam=x,y,z,tx,ty,tz
  camera.fov = s.fov; camera.position.set(...(cv ? cv.slice(0, 3) : s.cam)); camera.lookAt(new THREE.Vector3(...(cv ? cv.slice(3) : s.target)));
  camera.near = s.near ?? (s.id === 'b_island' ? 40 : s.id === 'c_horizon' ? 4 : .2);   // точность глубины: на виде сверху вода и земля не спорят
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  U.uMech.value = (m.wedge || m.ring) ? 1 : 0; U.uWedge.value = m.wedge || 0; U.uRing.value = m.ring || 0;
  U.uRingR.value = m.ringR || 300; U.uHalf.value = m.wedgeHalf || .6; U.uRange.value = m.wedgeRange || 300; U.uFront.value = m.front || 0;
  const hd = m.heading || 0; U.uDir.value.set(Math.sin(hd), -Math.cos(hd));
  U.uLod.value = m.lod || 0; U.uLod1.value = m.lod1 ?? 600; U.uLod2.value = m.lod2 ?? 900;
  [U.uFogNear.value, U.uFogFar.value, U.uFogMax.value] = s.fog; U.uVoid.value = s.void ? 1 : 0;
  U.uDepthScale.value = s.depthScale ?? (s.id === 'c_horizon' ? 1400 : 700);
  dof.uniforms.uMax.value = s.dof * PR; dof.uniforms.uNear.value = s.dofNear ?? (s.id === 'c_horizon' ? .45 : .2);
  const HP = s.heroPos || [C.hero.x, C.hero.z], MP = s.mechPos || HP; U.uHero.value.set(MP[0], MP[1]);
  U.uWedgeClay.value = s.wedgeClay || 0; U.uDim.value = s.dim || 0; U.uScanZ.value = s.scanZ ?? 1e5; U.uRingY.value = s.ringY || 0;
  U.uMerge.value = s.merge || 0; if (s.mergeRect) U.uMergeRect.value.set(...s.mergeRect); mergeBox.visible = (s.merge || 0) > .85;
  if (mergeBox.visible) { const r = s.mergeRect; mergeBox.position.set((r[0] + r[2]) / 2, 0, (r[1] + r[3]) / 2); mergeBox.scale.set(r[2] - r[0], s.mergeH * Math.max(.001, ease.out((s.merge - .85) / .15)), r[3] - r[1]); }
  grade.uniforms.uShake.value = s.shake || 0;
  U.uHl.value.set(s.hlPos ? s.hlPos[0] : 0, s.hlPos ? s.hlPos[1] : 0, s.hlR || 0); U.uOccl.value = s.occl || 0; U.uExplode.value = s.explode || 0; U.uRetro.value = s.retro ? 1 : 0;
  grade.uniforms.uPix.value = s.pix || 0; grade.uniforms.uPost.value = s.post || 0; grade.uniforms.uPunch.value = s.punch || 0; grade.uniforms.uFlash.value = s.flash || 0;
  grade.uniforms.uExpo.value = 1;
  setLight(Q.get('light') || s.light || 'day');
  if (s.sun) U.uSunDir.value.set(...s.sun).normalize();
  U.uSplit.value = s.split ? new THREE.Vector4(s.split[0], s.split[1], 1, s.split[2] ?? .35) : new THREE.Vector4(0, 0, 0, 0);
  gtao.enabled = !!s.ao; dof.uniforms.uFg.value = s.fg ? s.fg / U.uDepthScale.value : 0; dof.uniforms.uFgMax.value = s.fg ? 9 * PR : 0;
  grade.uniforms.uSatK.value = s.sat || 1;
  U.uClay.value = Q.get('dbgsh') ? 2 : 0;
  wedgeVol.visible = !!m.wedge;
  ringWall.visible = !!m.ring; ringWall.position.set(MP[0], 0, MP[1]); ringWall.scale.set(U.uRingR.value, 1, U.uRingR.value);
  if (cars) cars.update(wt + 40);
  if (people) people.update(wt + 3);
  tl.update(wt + 5);
  if (hero) {
    hero.visible = !!s.hero;
    let ht = s.heroT ?? t; const cd = heroAnim.dur('walk'); if (ht < 0) ht += Math.ceil(-ht / cd + 1) * cd;   // фаза шага: в финале совпадает с кадром 0
    heroAnim.lookBack(s.look || 0); heroAnim.setTime(ht);
    hero.position.set(HP[0], 0, HP[1]); hero.rotation.y = s.heroYaw ?? Math.PI; hero.scale.setScalar(s.heroScale || 1);
  }
  if (plane) { plane.visible = !!s.plane; if (s.plane) { const P = s.plane; plane.position.set(P.x, P.y, P.z); plane.rotation.set(P.pitch || 0, P.yaw, P.roll || 0, 'YXZ'); if (planeProp) planeProp.rotation.z = wt * 60; } }
  const live = !s.void;
  for (const o of [lamps, tl.mesh, palms, cars && cars.cars, cars && cars.pools, people && people.group, signs]) if (o) o.visible = live;
  if (people) people.group.visible = live && (s.people ?? (s.id === 'a_behind' || s.id === 'a2_mid'));
  if (signs) signs.visible = live && !s.retro;
  if (cars) cars.pools.visible = false;                      // днём фары асфальт не освещают
  const hid = (Q.get('hide') || '').split(',');
  const objs = { cars: cars && cars.cars, pools: cars && cars.pools, lamps, palms, signs, blds, ground, water, sky, people: people && people.group };
  for (const k in objs) if (objs[k] && hid.includes(k)) objs[k].visible = false;
  grade.uniforms.uFrame.value = Math.floor(t * FPS);
  if (s.vig != null) grade.uniforms.uVig.value = s.vig;
  // тень солнца: ортокамера над участком кадра, тяжёлые шейдеры в этом проходе пишут только глубину
  const sc = s.shadow || [C.hero.x, C.hero.z, 200];
  sunCam.left = -sc[2]; sunCam.right = sc[2]; sunCam.top = sc[2]; sunCam.bottom = -sc[2]; sunCam.updateProjectionMatrix();
  const sd = U.uSunDir.value; sunCam.position.set(sc[0] + sd.x * 2000, sd.y * 2000, sc[1] + sd.z * 2000); sunCam.lookAt(sc[0], 0, sc[1]); sunCam.updateMatrixWorld();
  U.uSunMat.value.multiplyMatrices(sunCam.projectionMatrix, sunCam.matrixWorldInverse);
  const hideS = [sky, ground, water, ringWall, wedgeVol, cars && cars.pools, people && people.group].filter(Boolean), visS = hideS.map(o => o.visible);   // герой не прячется: тень на тротуар
  hideS.forEach(o => { o.visible = false; });
  U.uShadowPass.value = 1; const lod0 = U.uLod.value; U.uLod.value = 0; U.tShadow.value = dummyTex;   // не читать карту, в которую пишем
  renderer.setRenderTarget(shadowRT); renderer.clear(); renderer.render(scene, sunCam); renderer.setRenderTarget(null);
  U.uShadowPass.value = 0; U.uLod.value = lod0; U.tShadow.value = shadowRT.depthTexture;
  hideS.forEach((o, i) => { o.visible = visS[i]; });
  // отражение для воды: сама земля, вода и декали в зеркало не попадают
  const hideR = [ground, water, ringWall, wedgeVol, cars && cars.pools].filter(Boolean); const vis0 = hideR.map(o => o.visible);
  hideR.forEach(o => { o.visible = false; });
  refl.onBeforeRender(renderer, scene, camera);
  hideR.forEach((o, i) => { o.visible = vis0[i]; });
  composer.render();
  overlay.frame(t, s);
  if (Q.get('noui')) document.getElementById('ov').style.display = 'none';   // чистый кадр для обложки
}

window.DURATION = window.FILM ? window.FILM.duration : window.SHOTS.length;
window.T = window.FILM ? window.FILM.T : { a: 0, a2: 1, b: 2, c: 3 };
window.SFX_EVENTS = window.FILM ? window.FILM.sfx : [];
window.SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 };
window.seek = t => frame(Math.min(Math.max(t, 0), window.DURATION - 1e-4));
window.__flush = () => renderer.getContext().finish();
window.__dbg = { renderer, shadowRT, sunCam, U, scene };
(async () => {
  await Promise.all([...document.fonts].map(f => f.load().catch(() => {})));
  signs = await buildSigns(); scene.add(signs);
  palms = await buildPalms(); scene.add(palms);
  cars = await buildCars(); scene.add(cars.cars); scene.add(cars.pools);
  people = await buildPeople(); scene.add(people.group);
  heroAnim = await loadHero(THREE, scene, { glsl: { COMMON, U }, rim: 1.9, sky: 1.9, phase: .3 });
  heroAnim.play('walk', -1e3);
  if (window.FILM) { heroAnim.play('idle', window.FILM.T.heroStop, .35).play('walk', window.FILM.T.walkS, .4).play('idle', window.FILM.T.hook1, .2).play('walk', window.FILM.T.walk2, .4); plane = await buildPlane(); scene.add(plane); planeProp = plane.getObjectByName('Propeller_Cone') || null; if (overlay.ready) overlay.ready(); }
  hero = heroAnim.object; hero.position.set(C.hero.x, 0, C.hero.z); hero.rotation.y = Math.PI;
  frame(0.5);
  window.__ready(true);
})();
