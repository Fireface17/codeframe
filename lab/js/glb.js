// GLB → three.js синхронно, для 3D-слоя (gl.js). Под модели sand3d (tools/sand3d/build.py), но читает любой
// простой GLB: сетки, материалы-цвета (PBR-множители), узлы с TRS/matrix, extras. Текстуры, скиннинг и
// анимации glTF не читает — для них GLTFLoader (references/3d.md), но он асинхронный и с file:// не грузит.
//
//   const M = GLB.load(THREE, 'washer')   имя из window.GLB_DATA (файл <имя>.glb.js от build.py) или ArrayBuffer
//   M.root                                THREE.Group, метры, Y вверх — добавить в сцену
//   M.nodes['door']                       любой узел по имени (детали sand3d носят свои имена)
//   M.parts                               узлы с сетками: [{ name, node }] — для разборки по деталям
//   M.joints['door_hinge']                { type, axis, lower, upper, mimic, node } — из extras.s3d_joint
//   M.set('door_hinge', 1.2)              поставить петлю: радианы (revolute/continuous) или метры (prismatic);
//                                         ведомые петли (mimic) идут следом
//   M.pose({ door_hinge: 1.2, ... })      несколько сразу; остальные — в покое (как в файле)
//   M.box                                 THREE.Box3 модели в покое (для кадрирования камеры)
//   GLB.deg(90)                           градусы → радианы
//
// Чистая функция: M.set не копит состояние — каждый вызов ставит узел из покоя + значение.
(function () {
  const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

  function b64(s) {
    const bin = atob(s), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }

  function parse(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('GLB: не GLB (нет подписи glTF)');
    let off = 12, json = null, bin = null;
    while (off < dv.byteLength) {
      const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
      const body = buf.slice(off + 8, off + 8 + len);
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(body));
      else if (type === 0x004E4942) bin = body;
      off += 8 + len;
    }
    return { json, bin };
  }

  function accessor(g, bin, i) {
    const a = g.accessors[i], bv = g.bufferViews[a.bufferView], T = COMP[a.componentType], n = SIZE[a.type];
    const start = (bv.byteOffset || 0) + (a.byteOffset || 0), el = T.BYTES_PER_ELEMENT;
    if (!bv.byteStride || bv.byteStride === n * el) return { arr: new T(bin.slice(start, start + a.count * n * el)), n };
    const out = new T(a.count * n), src = new DataView(bin);              // чередующиеся данные: копируем по шагу
    const get = { 1: 'getInt8', 2: T === Uint16Array ? 'getUint16' : 'getInt16', 4: T === Float32Array ? 'getFloat32' : 'getUint32' }[el];
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = src[get](start + k * bv.byteStride + c * el, true);
    return { arr: out, n };
  }

  function material(THREE, m) {
    const p = (m && m.pbrMetallicRoughness) || {}, f = p.baseColorFactor || [1, 1, 1, 1];
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(f[0], f[1], f[2]),                  // glTF хранит линейный цвет
      metalness: p.metallicFactor ?? 1, roughness: p.roughnessFactor ?? 1,
      side: m && m.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    });
    if (m && m.alphaMode === 'BLEND') { mat.transparent = true; mat.opacity = f[3]; mat.depthWrite = false; }
    const e = m && m.emissiveFactor;
    if (e && (e[0] || e[1] || e[2])) mat.emissive = new THREE.Color().setRGB(e[0], e[1], e[2]);
    if (m && m.name) mat.name = m.name;
    return mat;
  }

  function load(THREE, src) {
    const buf = typeof src === 'string' ? b64((window.GLB_DATA || {})[src] ?? (() => { throw new Error('GLB: нет window.GLB_DATA["' + src + '"] — подключи <имя>.glb.js'); })()) : src;
    const { json: g, bin } = parse(buf);
    const mats = (g.materials || []).map(m => material(THREE, m));
    const fallback = material(THREE, null);
    const nodes = {}, parts = [], joints = {};

    const meshOf = (mi) => {
      const grp = [];
      for (const pr of g.meshes[mi].primitives) {
        if ((pr.mode ?? 4) !== 4) continue;                                 // только треугольники
        const geo = new THREE.BufferGeometry(), at = pr.attributes;
        const pos = accessor(g, bin, at.POSITION); geo.setAttribute('position', new THREE.BufferAttribute(pos.arr, 3));
        if (at.NORMAL != null) geo.setAttribute('normal', new THREE.BufferAttribute(accessor(g, bin, at.NORMAL).arr, 3));
        if (pr.indices != null) geo.setIndex(new THREE.BufferAttribute(accessor(g, bin, pr.indices).arr, 1));
        if (at.NORMAL == null) geo.computeVertexNormals();
        grp.push(new THREE.Mesh(geo, pr.material != null ? mats[pr.material] : fallback));
      }
      return grp;
    };

    const build = (ni) => {
      const n = g.nodes[ni], o = new THREE.Group();
      o.name = n.name || 'node' + ni;
      if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale);
      if (n.translation) o.position.fromArray(n.translation);
      if (n.rotation) o.quaternion.fromArray(n.rotation);
      if (n.scale) o.scale.fromArray(n.scale);
      if (n.mesh != null) { for (const m of meshOf(n.mesh)) o.add(m); parts.push({ name: o.name, node: o }); }
      nodes[o.name] = o;
      const j = n.extras && n.extras.s3d_joint;
      if (j) joints[j.name] = { ...j, node: o, rest: { p: o.position.clone(), q: o.quaternion.clone() } };
      for (const c of n.children || []) o.add(build(c));
      return o;
    };

    const root = new THREE.Group(); root.name = 'glb';
    for (const ni of g.scenes[g.scene || 0].nodes) root.add(build(ni));

    const q = new THREE.Quaternion(), ax = new THREE.Vector3();
    const put = (j, v) => {
      j.node.position.copy(j.rest.p); j.node.quaternion.copy(j.rest.q);
      if (!j.axis) return;
      ax.fromArray(j.axis).normalize();
      const d = v - (j.value || 0);                                        // файл записан в позе value: отсчёт от неё
      if (j.type === 'prismatic') j.node.position.add(ax.applyQuaternion(j.rest.q).multiplyScalar(d));
      else j.node.quaternion.multiply(q.setFromAxisAngle(ax, d));          // поворот в собственной системе узла
    };
    const set = (name, v) => {
      const j = joints[name]; if (!j) throw new Error('GLB: нет петли ' + name + ' (есть: ' + Object.keys(joints).join(', ') + ')');
      put(j, v);
      for (const f of Object.values(joints)) if (f.mimic && f.mimic.joint === name) set(f.name, v * f.mimic.multiplier);
    };
    const pose = (vals = {}) => {
      for (const j of Object.values(joints)) if (!j.mimic) set(j.name, vals[j.name] ?? (j.value || 0));
    };
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    return { root, nodes, parts, joints, set, pose, box };
  }

  // Студийное окружение для металла (без него metalness 1 — почти чёрный): светлый купол с градиентом и
  // две мягкие «софтбокс»-панели, через PMREM. Синхронно и детерминированно. scene.environment = GLB.studio(THREE, R)
  function studio(THREE, R, { top = '#ffffff', bottom = '#b9b4ab', panels = 2.4 } = {}) {
    const env = new THREE.Scene();
    const geo = new THREE.SphereGeometry(10, 48, 24), col = [], c0 = new THREE.Color(top), c1 = new THREE.Color(bottom), c = new THREE.Color();
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { c.copy(c1).lerp(c0, THREE.MathUtils.smoothstep(p.getY(i) / 10, -0.4, 0.6)); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const panel = (x, y, z, w, h, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(-6, 5, 5, 5, 3, panels); panel(7, 2, -3, 3, 6, panels * 0.6);
    const pm = new THREE.PMREMGenerator(R), tex = pm.fromScene(env, 0.02).texture;
    pm.dispose();
    return tex;
  }

  window.GLB = { load, studio, deg: d => d * Math.PI / 180 };
})();
