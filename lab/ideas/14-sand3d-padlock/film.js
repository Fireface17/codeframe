// Идея 14: 3D-предмет из кода (sand3d) в нашем 3D-слое. Модель — model/padlock.py, собрана
// tools/sand3d/run → model/padlock.glb.js (window.GLB_DATA.padlock). Петли ставим из t: ключ 0→90°
// (дужка поднимается за ним сама — ведомая петля), дужка отворачивается 0→150°, потом всё обратно: петля.
// Камера медленно облетает. Светлый фон, студийное окружение для металла (GLB.studio), один ключевой свет.
// Надпись — в SVG поверх, значения петель берутся из тех же чисел, что крутят модель.
{
  const V = H > W;
  const P = { paper: '#ece8e1', ink: '#23211d', muted: '#8d877d', accent: '#b0802a' };
  window.SAFE = V ? { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 } : { x0: 96, x1: W - 96, y0: 54, y1: H - 54 };

  // ------------------------------------------------------------------ cues
  const T = {};
  T.in = 0.2;        // появление
  T.key = 0.9;       // ключ 0 → 90°
  T.swing = 1.9;     // дужка 0 → 150°
  T.back = 3.6;      // дужка обратно
  T.unkey = 4.6;     // ключ обратно
  T.end = 5.6;

  // ------------------------------------------------------------------ 3D-сцена
  GL.scene('padlock', ({ THREE, R, W, H }) => {
    R.toneMapping = THREE.ACESFilmicToneMapping;
    R.toneMappingExposure = 1.0;
    const scene = new THREE.Scene();
    scene.environment = GLB.studio(THREE, R);
    const key = new THREE.DirectionalLight(0xfff4e6, 1.6); key.position.set(-1, 2, 1.5); scene.add(key);

    const M = GLB.load(THREE, 'padlock');
    // кадрируем по всему движению, а не по покою: открытая поза + покой
    M.set('key_turn', GLB.deg(90)); M.set('swing', GLB.deg(150)); M.root.updateMatrixWorld(true);
    const box = M.box.clone().union(new THREE.Box3().setFromObject(M.root));
    M.pose();
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    M.root.position.sub(c);                                   // центр движения — в начало координат
    const turn = new THREE.Group(); turn.add(M.root); scene.add(turn);

    const cam = new THREE.PerspectiveCamera(28, W / H, 0.001, 10);
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(28) / 2) * W / H);
    const r = size.length() / 2, dist = r / Math.sin(hfov / 2) * 0.8;    // сфера движения — по ширине кадра
    return (lt, p) => {
      M.set('key_turn', p.key);
      M.set('swing', p.swing);
      const az = p.az, el = 0.32;
      cam.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist + size.y * 0.08, Math.cos(az) * Math.cos(el) * dist);
      cam.lookAt(0, size.y * 0.08, 0);
      turn.scale.setScalar(Math.max(0.001, p.s));
      return { scene, camera: cam, clear: P.paper };
    };
  });

  // ------------------------------------------------------------------ SVG поверх
  const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  document.getElementById('root').appendChild(svg);
  const label = S('text', { x: W / 2, y: H * 0.80, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-size': 34, fill: P.muted }, svg);
  const title = S('text', { x: W / 2, y: H * 0.20, 'text-anchor': 'middle', 'font-family': 'Onest', 'font-weight': 700, 'font-size': 64, fill: P.ink }, svg);
  setText(title, 'padlock.py · 51 строка');

  // ------------------------------------------------------------------ frame(t)
  function frame(t) {
    const kDeg = 90 * (prog(t, T.key, 0.8, ease.inOut) - prog(t, T.unkey, 0.8, ease.inOut));
    const sDeg = 150 * (prog(t, T.swing, 1.1, ease.inOut) - prog(t, T.back, 0.9, ease.inOut));
    const s = clamp(popS(t, T.in)) * (1 - prog(t, T.end - 0.35, 0.35, ease.in4));
    GL.draw('padlock', t, { key: GLB.deg(kDeg), swing: GLB.deg(sDeg), az: GLB.deg(-28 + 36 * (t / T.end)), s });
    const lift = (kDeg / 90 * 10).toFixed(1);
    setText(label, `key_turn ${kDeg.toFixed(0).padStart(2)}° · lift ${lift} мм · swing ${sDeg.toFixed(0).padStart(3)}°`);
    const o = popO(t, T.in + 0.2) * (1 - prog(t, T.end - 0.35, 0.3));
    show(label, o); show(title, o);
  }

  // ------------------------------------------------------------------ boot
  window.DURATION = Math.round(T.end * FPS) / FPS;
  window.T = T;
  window.SFX_EVENTS = SFX;
  window.seek = t => frame(clamp(t, 0, window.DURATION));
  window.READY = (async () => { await loadFonts(); await preloadImages(svg); frame(0); return true; })();
}
