// Browser preview (skipped under the offline renderer). The frame is scaled to fit the window.
//   space play/pause · ←/→ ±1 s (shift ±0.1 s) · ,/. one frame · 0 restart · l loop
//   g safe zone overlay (if window.SAFE) · m mute · ?t=12.3 &audio=audio/mix_vo.wav|none
(function () {
  if (navigator.webdriver) return;
  const q = new URLSearchParams(location.search);
  const src = q.get('audio') || 'audio/mix_vo.wav';
  const audio = new Audio(src === 'none' ? '' : src);
  let t = parseFloat(q.get('t') || '0'), playing = false, loop = true, t0 = 0, w0 = 0;
  const root = document.getElementById('root');
  const fit = () => { const s = Math.min(innerWidth / W, innerHeight / H); root.style.transform = `translate(${(innerWidth - W * s) / 2}px, 0) scale(${s})`; };
  addEventListener('resize', fit); fit();
  const ui = document.createElement('div'); ui.id = 'ui'; document.body.appendChild(ui);
  // safe-zone overlay: window.SAFE = { x0, x1, y0, y1, xLow?, yLow? } (xLow/yLow: right edge below yLow)
  let zone = null;
  window.READY.then(() => {
    const Z = window.SAFE, svg = document.querySelector('#root svg');
    if (Z && svg) {
      zone = S('g', { 'pointer-events': 'none', visibility: 'hidden' }, svg);
      const xl = Z.xLow ?? Z.x1, yl = Z.yLow ?? Z.y1;
      const p = `M${Z.x0} ${Z.y0}H${Z.x1}V${yl}H${xl}V${Z.y1}H${Z.x0}Z`;
      S('path', { d: `M0 0H${W}V${H}H0Z ${p}`, fill: 'rgba(255,40,40,.18)', 'fill-rule': 'evenodd' }, zone);
      S('path', { d: p, fill: 'none', stroke: '#f33', 'stroke-width': 3, 'stroke-dasharray': '12 8' }, zone);
    }
    requestAnimationFrame(tick); draw();
  });
  function draw() {
    window.seek(t);
    ui.textContent = `${t.toFixed(2)} / ${DURATION.toFixed(2)} s  f${Math.round(t * FPS)}  ${playing ? '▶' : '❚❚'}${loop ? '  loop' : ''}`;
  }
  function tick(now) {
    if (playing) {
      t = audio.src && !audio.paused && !audio.error ? audio.currentTime : w0 + (now - t0) / 1000;
      if (t >= DURATION) { if (loop) { t = 0; play(true); } else { t = DURATION; playing = false; audio.pause(); } }
      draw();
    }
    requestAnimationFrame(tick);
  }
  function play(on) {
    playing = on;
    if (on) { t0 = performance.now(); w0 = t >= DURATION ? (t = 0) : t; if (audio.src) { audio.currentTime = t; audio.play().catch(() => {}); } }
    else audio.pause();
    draw();
  }
  const seekTo = v => { t = clamp(v, 0, DURATION); if (playing) play(true); draw(); };
  addEventListener('keydown', e => {
    if (e.key === ' ') { e.preventDefault(); play(!playing); }
    else if (e.key === 'ArrowRight') seekTo(t + (e.shiftKey ? 0.1 : 1));
    else if (e.key === 'ArrowLeft') seekTo(t - (e.shiftKey ? 0.1 : 1));
    else if (e.key === '.') seekTo(t + 1 / FPS);
    else if (e.key === ',') seekTo(t - 1 / FPS);
    else if (e.key === '0') seekTo(0);
    else if (e.key === 'l') { loop = !loop; draw(); }
    else if (e.key === 'm') audio.muted = !audio.muted;
    else if (e.key === 'g' && zone) A(zone, 'visibility', zone._visibility === 'visible' ? 'hidden' : 'visible');
  });
})();
