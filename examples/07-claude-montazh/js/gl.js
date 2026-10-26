// 3D-слой (three.js, WebGL) под SVG-сценами. Всё — функция t: никакого состояния между кадрами,
// «случайность» — hash01. Холст лежит под SVG; в 3D-сценах у SVG прозрачный фон.
//   GL.draw('vortex' | 'morph' | 'city', t, params)   ·   GL.clear(color)
(function () {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px', zIndex: 0 });
  document.getElementById('root').prepend(canvas);
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  R.setPixelRatio(1); R.setSize(W, H, false);
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  R.outputColorSpace = THREE.SRGBColorSpace;

  // ---------------- окружение для хрома: комната с цветными светящимися панелями
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x3a4258, side: THREE.BackSide })));
  const panel = (w, h, col, k, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.rotation.set(...rot); envScene.add(m); };
  panel(20, 5, '#ffffff', 7, [0, 9, -2], [Math.PI / 2, 0, 0]);
  panel(8, 8, '#ffffff', 3, [0, 0, -13], [0, 0, 0]);
  panel(4, 14, '#E4261C', 5, [-12, 0, 2], [0, Math.PI / 2, 0]);
  panel(4, 14, '#2B3CFF', 5, [12, 0, -2], [0, -Math.PI / 2, 0]);
  panel(10, 2, '#FFB36B', 4, [0, -6, 10], [0, Math.PI, 0]);
  panel(3, 3, '#ffffff', 8, [6, 4, 12], [0, Math.PI, 0]);
  const pmrem = new THREE.PMREMGenerator(R);
  const ENV = pmrem.fromScene(envScene, 0.02).texture;

  // мягкое пятно света для частиц
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.65)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

  // ================================================================== 1. ВИХРЬ: 40 000 штрихов, сжимаются в кольцо
  const V = {};
  {
    V.scene = new THREE.Scene();
    V.cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    const N = 40000;
    const seed = new Float32Array(N * 2 * 4), lag = new Float32Array(N * 2), col = new Float32Array(N * 2 * 3);
    const hseed = new Float32Array(N * 4), hcol = new Float32Array(N * 3);
    const C = [[1.0, 1.0, 1.0], [0.45, 0.62, 1.0], [0.3, 0.38, 1.0], [1.0, 0.18, 0.12]];
    for (let i = 0; i < N; i++) {
      const s = [hash01(i, 1), hash01(i, 2), hash01(i, 3), hash01(i, 4)];
      const ci = s[3] < 0.13 ? 3 : s[3] < 0.5 ? 1 : s[3] < 0.68 ? 2 : 0;
      for (let k = 0; k < 2; k++) { seed.set(s, (i * 2 + k) * 4); lag[i * 2 + k] = k; col.set(C[ci], (i * 2 + k) * 3); }
      hseed.set(s, i * 4); hcol.set(C[ci], i * 3);
    }
    const vert = `
      attribute vec4 aSeed; attribute float aLag; attribute vec3 aCol;
      uniform float uTime, uRing, uSize; varying vec3 vCol; varying float vA;
      vec3 P(float tt){
        float r = pow(aSeed.y, 0.55) * 9.0 + 0.35;
        float arm = floor(fract(aSeed.w * 7.13) * 3.0) * 2.0944;
        float spread = aSeed.x < 0.3 ? aSeed.x * 20.94 : (aSeed.x - 0.65) * 0.9 * (1.15 - aSeed.y * 0.6);
        float ang = arm + spread + log(r) * 2.4 + tt * (1.9 / (0.45 + r * 0.32));
        float h = (aSeed.z - 0.5) * 1.6 * exp(-r * 0.18) + sin(ang * 3.0 + tt * 1.3) * 0.12;
        vec3 g = vec3(cos(ang) * r, h, sin(ang) * r);
        float rr = 5.2 + (aSeed.y - 0.5) * 1.1 + sin(aSeed.x * 40.0 + tt * 2.0) * 0.08;
        float a2 = aSeed.x * 6.2831 + tt * 0.8;
        vec3 ring = vec3(cos(a2) * rr, (aSeed.z - 0.5) * 0.45, sin(a2) * rr);
        float k = clamp(uRing * 1.6 - aSeed.w * 0.6, 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);
        return mix(g, ring, k);
      }
      void main(){
        vec3 p = P(uTime - aLag * 0.085);
        vCol = aCol; vA = 1.0 - aLag;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.6 + aSeed.w) * (14.0 / -mv.z);
      }`;
    const lineMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uRing: { value: 0 }, uSize: { value: 0 } }, vertexShader: vert,
      fragmentShader: `varying vec3 vCol; varying float vA; uniform float uOp; void main(){ gl_FragColor = vec4(vCol * (0.3 + 0.7 * vA), 0.62); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    lineMat.uniforms.uOp = { value: 1 };
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    lg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4)); lg.setAttribute('aLag', new THREE.BufferAttribute(lag, 1)); lg.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
    lg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    V.lines = new THREE.LineSegments(lg, lineMat); V.scene.add(V.lines);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    pg.setAttribute('aSeed', new THREE.BufferAttribute(hseed, 4)); pg.setAttribute('aLag', new THREE.BufferAttribute(new Float32Array(N), 1)); pg.setAttribute('aCol', new THREE.BufferAttribute(hcol, 3));
    pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    const ptMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uRing: { value: 0 }, uSize: { value: 3.2 }, uTex: { value: dotTex } }, vertexShader: vert,
      fragmentShader: `uniform sampler2D uTex; varying vec3 vCol; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vCol * t.a * 0.9, t.a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    V.pts = new THREE.Points(pg, ptMat); V.scene.add(V.pts);
    // ядро: яркое свечение в центре
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0x8fb0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    core.scale.set(7, 7, 1); V.scene.add(core); V.core = core;
    V.draw = (t, p) => {
      [lineMat, ptMat].forEach(m => { m.uniforms.uTime.value = p.lt * 0.8; m.uniforms.uRing.value = p.ring; });
      const k = p.k;                               // 0..1 прогресс сцены: камера облетает и наезжает
      const a = 0.4 + t * 0.25, dist = lerp(15, 9.5, k), el = lerp(12, 4.2, k);
      V.cam.position.set(Math.cos(a) * dist, el, Math.sin(a) * dist); V.cam.lookAt(0, 0, 0);
      V.core.material.opacity = 0.9 * (1 - p.ring * 0.7);
      R.setClearColor('#04060B'); R.render(V.scene, V.cam);
    };
  }

  // ================================================================== 2. МОРФ: хромированный объект — шар -> пирамида -> звезда
  const M = {};
  {
    M.scene = new THREE.Scene(); M.scene.environment = ENV;
    M.cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 100); M.cam.position.set(0, 0, 8); M.cam.lookAt(0, 0, 0);
    const geo = new THREE.IcosahedronGeometry(1, 72);
    const pos = geo.attributes.position, n = pos.count, dirs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize(); dirs.set([v.x, v.y, v.z], i * 3); }
    const tetra = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => new THREE.Vector3(...v).normalize().negate());
    const ico = new THREE.IcosahedronGeometry(1, 0), spikes = [];
    for (let i = 0; i < ico.attributes.position.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(ico.attributes.position, i).normalize(); if (!spikes.some(s => s.distanceTo(v) < 1e-3)) spikes.push(v); }
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1, envMapIntensity: 1.6 });
    M.mesh = new THREE.Mesh(geo, mat); M.scene.add(M.mesh);
    M.scene.add(new THREE.PointLight(0xffffff, 40, 30).translateX(3).translateY(4).translateZ(5));
    const tmp = new THREE.Vector3();
    let last = null;
    M.draw = (t, p) => {
      const key = `${p.m1.toFixed(4)}|${p.m2.toFixed(4)}`;
      if (key !== last) {
        for (let i = 0; i < n; i++) {
          tmp.set(dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]);
          // мягкий максимум (log-sum-exp): грани пирамиды скруглены, без острых рёбер, которые режут глаз
          let se = 0; tetra.forEach(f => { se += Math.exp(9 * tmp.dot(f)); });
          const mt = Math.log(se) / 9;
          const rT = 0.42 / Math.max(mt, 0.25);
          let ss = 0; spikes.forEach(s => { ss += Math.pow(Math.max(tmp.dot(s), 0), 9); });
          const rS = 0.8 + 0.62 * Math.min(1.2, ss);
          const r = lerp(lerp(1, Math.min(rT, 1.25) * 1.1, p.m1), rS, p.m2);
          pos.setXYZ(i, tmp.x * r, tmp.y * r, tmp.z * r);
        }
        pos.needsUpdate = true; geo.computeVertexNormals(); last = key;
      }
      M.mesh.position.set(1.18, -0.15, 0);
      M.mesh.rotation.set(0.35 + t * 0.4, t * 0.75, 0.1);
      M.mesh.scale.setScalar(0.95 * Math.max(0.001, p.s));
      R.setClearColor('#E4261C'); R.render(M.scene, M.cam);
    };
  }

  // ================================================================== 3. ГОРОД: 1600 кубиков волнами + хромированная планета с кольцом
  const Cc = {};
  {
    const S3 = new THREE.Scene(); S3.environment = ENV; Cc.scene = S3;
    S3.fog = new THREE.Fog('#2A1E5A', 26, 72);
    Cc.cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 300);
    // небо-градиент
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0); vec3 a = vec3(0.98,0.45,0.42); vec3 b = vec3(0.17,0.12,0.36); vec3 c = vec3(0.05,0.04,0.14); vec3 col = h < 0.52 ? mix(a, b, smoothstep(0.38,0.52,h)) : mix(b, c, smoothstep(0.52,0.9,h)); gl_FragColor = vec4(col,1.0); }' }));
    S3.add(sky);
    const G = 40, Nn = G * G;
    const box = new THREE.BoxGeometry(0.94, 1, 0.94); box.translate(0, 0.5, 0);
    const bm = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.15, envMapIntensity: 0.6 });
    const inst = new THREE.InstancedMesh(box, bm, Nn); S3.add(inst); Cc.inst = inst;
    inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Nn * 3), 3);
    S3.add(new THREE.HemisphereLight(0xffd2c2, 0x2a1e5a, 1.2));
    const sun = new THREE.DirectionalLight(0xffb48a, 2.6); sun.position.set(-20, 18, -30); S3.add(sun);
    const rim = new THREE.DirectionalLight(0x6f8bff, 1.4); rim.position.set(25, 10, 20); S3.add(rim);
    // планета
    const planet = new THREE.Group(); S3.add(planet); Cc.planet = planet;
    planet.add(new THREE.Mesh(new THREE.SphereGeometry(2.6, 96, 64), new THREE.MeshStandardMaterial({ color: 0x4aa8ff, metalness: 0.85, roughness: 0.16, envMapIntensity: 1.4 })));
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 5.6, 160, 1), new THREE.MeshStandardMaterial({ color: 0xF4A340, metalness: 1, roughness: 0.25, side: THREE.DoubleSide, envMapIntensity: 1.3 }));
    ring.rotation.x = -Math.PI / 2 + 0.38; ring.rotation.y = 0.2; planet.add(ring);
    const moons = [0, 1, 2].map(k => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.42 - k * 0.1, 32, 16), new THREE.MeshStandardMaterial({ color: [0xffffff, 0xff5fa2, 0xffd34d][k], metalness: 0.9, roughness: 0.2 })); S3.add(m); return m; });
    Cc.moons = moons;
    // пыль в воздухе
    const D = 900, dp = new Float32Array(D * 3);
    for (let i = 0; i < D; i++) dp.set([(hash01(i, 31) - 0.5) * 60, hash01(i, 32) * 18 + 1, (hash01(i, 33) - 0.5) * 60], i * 3);
    const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dp, 3)), new THREE.PointsMaterial({ size: 0.22, map: dotTex, color: 0xffd9c8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    S3.add(dust); Cc.dust = dust;
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), cA = new THREE.Color('#5634A8'), cB = new THREE.Color('#FF5FA2'), cC = new THREE.Color('#FFC49A'), cTmp = new THREE.Color();
    Cc.draw = (t, p) => {
      const rise = p.rise;
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
        const x = (i - G / 2 + 0.5) * 1.02, z = (j - G / 2 + 0.5) * 1.02, d = Math.hypot(x, z);
        const wave = 0.9 + 0.8 * Math.sin(i * 0.33 + t * 1.5) * Math.cos(j * 0.29 - t * 1.1) + 2.6 * Math.exp(-d * 0.16) * (0.55 + 0.45 * Math.sin(d * 0.8 - t * 3.2));
        const delay = clamp(rise * 1.6 - d / 40);
        const h = Math.max(0.05, wave * (delay * delay * (3 - 2 * delay)));
        ps.set(x, 0, z); sc.set(1, h, 1); mtx.compose(ps, q, sc); inst.setMatrixAt(i * G + j, mtx);
        const k = clamp(h / 4.2);
        cTmp.copy(cA).lerp(cB, Math.min(1, k * 1.6)); if (k > 0.6) cTmp.lerp(cC, (k - 0.6) / 0.4);
        inst.setColorAt(i * G + j, cTmp);
      }
      inst.instanceMatrix.needsUpdate = true; inst.instanceColor.needsUpdate = true;
      planet.position.set(0, 9.2 + 0.4 * Math.sin(t * 2.0), 0); planet.rotation.y = t * 0.5;
      planet.scale.setScalar(Math.max(0.001, p.planet));
      moons.forEach((m, k) => { const a = t * (0.9 + k * 0.35) + k * 2.1, r = 6.8 + k * 1.3; m.position.set(Math.cos(a) * r, 9.2 + Math.sin(a * 1.3) * 1.2, Math.sin(a) * r); m.scale.setScalar(Math.max(0.001, p.planet)); });
      dust.rotation.y = t * 0.05;
      const a = 0.75 + t * 0.16, dist = lerp(40, 27, p.k), el = lerp(22, 13, p.k);
      Cc.cam.position.set(Math.cos(a) * dist, el, Math.sin(a) * dist); Cc.cam.lookAt(0, 4.5, 0);
      R.setClearColor('#2A1E5A'); R.render(S3, Cc.cam);
    };
  }

  let lastClear = null;
  window.GL = {
    draw(name, t, p) { lastClear = null; ({ vortex: V, morph: M, city: Cc })[name].draw(t, p); },
    clear(c = '#000000') { if (lastClear === c) return; R.setClearColor(c); R.clear(); lastClear = c; },
  };
})();
