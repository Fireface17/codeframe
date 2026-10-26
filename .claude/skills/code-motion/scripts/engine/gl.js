// 3D layer (three.js, WebGL) under the SVG. Optional: a page uses it only when index.html includes
// js/vendor/three.js and js/gl.js before film.js (new_project.sh --3d does it; references/3d.md explains why).
// Same rules as the SVG: every frame is a pure function of t, no clock, no requestAnimationFrame, no Math.random.
//
//   GL.scene('orb', build)    register a 3D scene; build({ THREE, R, W, H, hash01 }) runs once, on the first draw,
//                             and returns draw(lt, p) -> { scene, camera, clear }   (clear: background colour or null)
//   GL.draw('orb', lt, p)     render it now, synchronously, inside frame(t). lt = time since THIS scene started
//                             (t - scene.t0), never film time: a new voice-over then does not change the picture
//   GL.clear('#ffffff')       no 3D in this frame: one clear, cached by colour (cheap on static stretches)
//   GL.softMax(vals, k)       log(sum(exp(k*v)))/k: a smooth max for shape morphs (a hard max gives sharp edges
//                             and flickering normals); k ~ 9
//   GL.renderer               the THREE.WebGLRenderer (tone mapping, colour space, ...)
//
// The canvas is the first child of #root (absolute, z-index 0), the SVG sits above it (style.css). In 3D shots the
// SVG background must be transparent: hide or skip the paper rect there. Text, captions and HUD stay in the SVG:
// sharp, and checked by tools/safecheck.mjs.
(function () {
  const THREE = window.THREE;
  if (!THREE) { console.error('gl.js: window.THREE is missing: include js/vendor/three.js before gl.js (node tools/three_vendor.mjs builds it)'); return; }
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px', zIndex: 0 });
  document.getElementById('root').prepend(canvas);
  // preserveDrawingBuffer: without it a CDP screenshot may grab an already cleared buffer (empty frames)
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  R.setPixelRatio(window.devicePixelRatio || 1);   // 1 normally; 2 under SCALE=2 in render.mjs (true 4K)
  R.setSize(W, H, false);
  R.outputColorSpace = THREE.SRGBColorSpace;

  const builders = {}, scenes = {};
  let lastClear = null;
  const softMax = (vals, k = 9) => { let s = 0; for (const v of vals) s += Math.exp(k * v); return Math.log(s) / k; };

  window.GL = {
    renderer: R,
    softMax,
    scene(name, build) { builders[name] = build; },
    draw(name, lt, p = {}) {
      if (!scenes[name]) {
        if (!builders[name]) { console.error('GL.draw: no scene', name); return; }
        scenes[name] = builders[name]({ THREE, R, W, H, hash01 });
      }
      const r = scenes[name](lt, p);
      if (r.clear != null) R.setClearColor(r.clear);
      R.render(r.scene, r.camera);
      lastClear = null;
    },
    clear(c = '#ffffff') { if (lastClear === c) return; R.setClearColor(c); R.clear(); lastClear = c; },
  };

  // ---------------------------------------------------------------- example scene: a morph sphere -> soft tetrahedron
  // Light background, one matte object, a key light: not the "dark background with glowing particles" look.
  // Use: GL.draw('orb', t - T.s3, { m: prog(t, T.morph, 0.8, ease.inOut), s: popS(t, T.s3) })
  GL.scene('orb', ({ THREE, W, H }) => {
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
    cam.position.set(0, 0, 8); cam.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dde6, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 5); scene.add(key);
    const geo = new THREE.IcosahedronGeometry(1, 72);              // dense mesh: the morph stays smooth
    const pos = geo.attributes.position, n = pos.count, dirs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize(); dirs.set([v.x, v.y, v.z], i * 3); }
    const faces = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => new THREE.Vector3(...v).normalize().negate());
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xfceda3, roughness: 0.55, metalness: 0 }));
    scene.add(mesh);
    const tmp = new THREE.Vector3();
    let last = null;                                               // cache by input, never accumulate state
    return (lt, p) => {
      const m = p.m || 0, key = m.toFixed(4);
      if (key !== last) {
        for (let i = 0; i < n; i++) {
          tmp.set(dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]);
          const mt = softMax(faces.map(f => tmp.dot(f)), 9);       // soft max of the face planes: rounded edges
          const r = 1 + m * (Math.min(0.42 / Math.max(mt, 0.25), 1.25) * 1.1 - 1);
          pos.setXYZ(i, tmp.x * r, tmp.y * r, tmp.z * r);
        }
        pos.needsUpdate = true; geo.computeVertexNormals(); last = key;
      }
      mesh.rotation.set(0.35 + lt * 0.4, lt * 0.75, 0.1);
      mesh.scale.setScalar(1.6 * Math.max(0.001, p.s == null ? 1 : p.s));  // hide by scale 0.001, not by removing
      return { scene, camera: cam, clear: p.bg || '#ffffff' };
    };
  });
})();
