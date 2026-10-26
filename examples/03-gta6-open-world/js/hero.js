// Герой ролика №3: Microsoft Rocketbox Male_Adult_18 (MIT, assets/3d/hero/SOURCE.md), запечён в assets/3d/hero/hero.glb
// стенд hero_lab/bake.html: худи пыльно-бордовая с надетым капюшоном, джинсы, светлые кеды; 4 клипа, ходьба на месте.
//
//   import { loadHero } from './hero.js';
//   const hero = await loadHero(THREE, scene, { glsl: { COMMON, U } });   // glsl — свет стиля B (солнце с тенью, небо, туман)
//   hero.object.position.set(x, 0, z); hero.object.rotation.y = Math.PI;
//   hero.play('idle', 0); hero.play('walk', 1.0, .4);   // расписание: клип с момента t, перетекание .4 с
//   // каждый кадр: hero.lookBack(a); hero.setTime(t); hero.object.position.z = z0 - hero.travel(t);
//
// Кадр — функция t: mixer не копит время, позы клипов ставятся явно (action.time) и смешиваются весами.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const HERO_GLSL = /* glsl */`
  uniform sampler2D tMap, tNrm; uniform float uNrmK, uRimK, uWrap, uSkyK;
  varying vec3 vN; varying vec3 vWp; varying vec2 vUv;
  mat3 cotFrame(vec3 N, vec3 p, vec2 uv){
    vec3 dp1 = dFdx(p), dp2 = dFdy(p); vec2 du1 = dFdx(uv), du2 = dFdy(uv);
    vec3 a = cross(dp2, N), b = cross(N, dp1); vec3 T = a * du1.x + b * du2.x, B = a * du1.y + b * du2.y;
    float im = inversesqrt(max(max(dot(T, T), dot(B, B)), 1e-12)); return mat3(T * im, B * im, N);
  }
  void main(){
    if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
    vec3 base = texture2D(tMap, vUv).rgb;
    // джинсы — к пастели: синие пиксели ниже пояса приглушаются и светлеют
    float dn = step(base.r * 1.12, base.b) * (1. - smoothstep(.95, 1.05, vWp.y));
    base = mix(base, mix(vec3(dot(base, vec3(.3, .55, .15))), base, .55) * 1.2 + .02, dn);
    if (uVoid > .5) base = CLAY;   // герой всегда «в кадре»: шов видимости его не режет
    vec3 n = normalize(vN + vec3(0., 1e-5, 0.));
    vec3 tn = texture2D(tNrm, vUv).xyz * 2. - 1.; tn.xy *= uNrmK;
    n = normalize(cotFrame(n, vWp, vUv) * tn);
    if (!gl_FrontFacing) n = -n;
    vec3 V = normalize(cameraPosition - vWp);
    float sh = shadowAt(vWp, n);
    float ndl = clamp((dot(n, uSunDir) + uWrap) / (1. + uWrap), 0., 1.);                 // мягкая ткань: свет заходит за терминатор
    vec3 sky = mix(uAmbGround, uAmbSky, n.y * .5 + .5) * uSkyK;
    vec3 c = base * (sky + uSunCol * ndl * sh);
    // контровой: край, развёрнутый к солнцу, светится по силуэту (в хуке солнце спереди-слева — свет на плечах и капюшоне)
    float rim = pow(1. - max(dot(n, V), 0.), 3.) * smoothstep(-.2, .6, dot(n, uSunDir));
    c += mix(base, vec3(1.), .35) * uSunCol * rim * .45 * uRimK * (.35 + .65 * sh);
    float d = distance(cameraPosition, vWp);
    gl_FragColor = vec4(applyFog(c, d, vWp.y), depthA(d));
  }`;
const HERO_VS = /* glsl */`
  #include <common>
  #include <skinning_pars_vertex>
  varying vec3 vN; varying vec3 vWp; varying vec2 vUv;
  void main(){
    vUv = uv;
    #include <skinbase_vertex>
    #include <beginnormal_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    vec4 wp = modelMatrix * vec4(transformed, 1.);
    vWp = wp.xyz; vN = normalize(mat3(modelMatrix) * objectNormal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

/**
 * @param THREE  модуль three
 * @param scene  куда добавить (null — не добавлять)
 * @param opts   url, glsl:{COMMON,U} (иначе MeshStandardMaterial), height (м, 1.8), (цвет худи — при запекании: bake.html?hoodie=rrggbb),
 *               rim (1), wrap (.3), sky (1.6), nrm (.7), lookSide (+1 — через правое плечо), phase (с, сдвиг фазы шага)
 */
export async function loadHero(THREE, scene, opts = {}) {
  const gltf = await new GLTFLoader().loadAsync(opts.url || 'assets/3d/hero/hero.glb');
  const root = gltf.scene;
  const meshes = []; root.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });   // тело и голова — два примитива glTF
  const mesh = meshes[0];
  for (const mesh of meshes) {
  if (opts.glsl) {
    const { COMMON, U } = opts.glsl;
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => new THREE.ShaderMaterial({
      name: m.name,
      uniforms: Object.assign({}, U, {
        tMap: { value: m.map }, tNrm: { value: m.normalMap || flatNormal(THREE) }, uNrmK: { value: m.normalMap ? (opts.nrm ?? .7) : 0 },
        uRimK: { value: opts.rim ?? 1 }, uWrap: { value: opts.wrap ?? .3 }, uSkyK: { value: opts.sky ?? 1.6 },
      }),
      vertexShader: HERO_VS, fragmentShader: COMMON + HERO_GLSL,
    }));
    mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
  } else {
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => { m.roughness = .95; m.metalness = 0; });
  }
  mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  }
  // рост
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const object = new THREE.Group(); object.name = 'hero';
  const k = (opts.height || 1.8) / (box.max.y - box.min.y);
  root.scale.multiplyScalar(k); root.position.y = -box.min.y * k;
  object.add(root);
  if (scene) scene.add(object);

  const bones = {}; root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  const B = n => bones[n] || bones[n.replace(/_/g, '')] || null;
  const mixer = new THREE.AnimationMixer(root);
  const clips = {}, actions = {};
  for (const c of gltf.animations) { clips[c.name] = c; const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); actions[c.name] = a; }
  const SPEED = { idle: 0, look: 0, walk: 1.0117, walk_cool: 1.048 };   // м/с исходных клипов (assets/3d/hero/clips.json) при росте 1.81 м
  const speedOf = name => (SPEED[name] || 0) * (opts.height || 1.8) / 1.81;

  // расписание клипов: [{t, name, fade}] по возрастанию t
  const plan = [];
  let look = 0;
  const neck = ['Bip01_Spine2', 'Bip01_Neck', 'Bip01_Head'].map(B), share = [.25, .3, .45];
  const up = new THREE.Vector3(0, 1, 0), qw = new THREE.Quaternion(), qp = new THREE.Quaternion(), qa = new THREE.Quaternion();

  function setTime(t) {
    const segs = plan.length ? plan : [{ t: -1e9, name: 'idle', fade: 0 }];
    let i = 0; while (i + 1 < segs.length && segs[i + 1].t <= t) i++;
    const cur = segs[i], prev = i > 0 ? segs[i - 1] : null;
    const w = prev && cur.fade > 0 ? Math.min(1, Math.max(0, (t - cur.t) / cur.fade)) : 1;
    const ws = w * w * (3 - 2 * w);
    for (const n in actions) actions[n].setEffectiveWeight(0);
    const pose = (seg, weight) => {
      const a = actions[seg.name]; if (!a) return;
      const d = clips[seg.name].duration;
      // фаза: ходьба продолжается с того места, где её «застали»; idle — от начала сегмента
      const local = Math.max(0, t - seg.t) + (opts.phase || 0);
      a.time = ((local % d) + d) % d;
      a.setEffectiveWeight(a.getEffectiveWeight() + weight);
    };
    pose(cur, ws); if (prev && ws < 1) pose(prev, 1 - ws);
    mixer.update(0);
    // поворот головы «оглянуться»: доли угла на грудь, шею и голову вокруг вертикали героя
    if (look) {
      object.updateMatrixWorld(true);
      object.getWorldQuaternion(qw); const axis = up.clone().applyQuaternion(qw);
      const ang = -look * (opts.lookAngle ?? 1.25) * (opts.lookSide ?? 1);   // +1 — через правое плечо (к камере хука)
      neck.forEach((b, j) => {
        if (!b) return;
        b.parent.getWorldQuaternion(qp);
        const la = axis.clone().applyQuaternion(qp.clone().invert());
        qa.setFromAxisAngle(la, ang * share[j]); b.quaternion.premultiply(qa);
        b.updateMatrixWorld(true);
      });
    }
    root.updateMatrixWorld(true);
  }
  // пройденный путь к моменту t (м) — для перемещения object вдоль направления взгляда
  function travel(t) {
    let s = 0;
    for (let i = 0; i < plan.length; i++) {
      const a = plan[i], b = plan[i + 1];
      const t0 = a.t, t1 = b ? Math.min(b.t, t) : t; if (t1 <= t0) break;
      // перетекание: скорость плавно меняется от прежнего клипа к новому
      const v0 = i > 0 ? speedOf(plan[i - 1].name) : speedOf(a.name), v1 = speedOf(a.name), f = a.fade || 0;
      const tf = Math.min(t1, t0 + f);
      if (f > 0 && tf > t0) { const u = (tf - t0) / f; s += (tf - t0) * (v0 + (v1 - v0) * (u * u * (1 - u / 2))); }
      s += Math.max(0, t1 - Math.max(tf, t0)) * v1;
    }
    return s;
  }
  return {
    object, mesh, meshes, bones, clips: Object.keys(clips), mixer,
    play(name, at = 0, fade = .35) { plan.push({ t: at, name, fade }); plan.sort((a, b) => a.t - b.t); return this; },
    clearPlan() { plan.length = 0; return this; },
    lookBack(a) { look = a; return this; },
    setTime, travel, speedOf, dur: n => clips[n] ? clips[n].duration : 1,
  };
}

let FLAT = null;
function flatNormal(THREE) {
  if (!FLAT) { FLAT = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); FLAT.needsUpdate = true; }
  return FLAT;
}
