// Идея лаборатории. Структура как у film.js проекта: палитра и раскладка -> cues (T) ->
// построение один раз -> frame(t). Без озвучки cues в секундах; с озвучкой положи рядом
// script.json и бери word()/phrase(). API: js/core.js, js/lab.js, engine.md навыка.
// Все скрипты страницы делят одну глобальную область: не объявляй const/let с именами из
// core.js, code.js (MONO, typeSchedule…), captions.js, cast.js, lab.js — страница упадёт с
// «already declared». Свои хелперы называй уникально или заверни идею в блок { … }.

const V = H > W;
const P = { paper: '#f6f4ef', ink: '#1e1e1e', muted: '#a3a9b2', accent: '#7c5cf0' };
window.SAFE = V ? { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 } : { x0: 96, x1: W - 96, y0: 54, y1: H - 54 };

// ------------------------------------------------------------------ cues
const T = {};
T.in = 0.3;
T.end = 4;
T.clear = T.end - 0.45;      // пустой кадр в конце = петля в t = 0

// ------------------------------------------------------------------ build (once)
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
S('rect', { width: W, height: H, fill: P.paper }, svg);
const stage = S('g', {}, svg);
const dot = S('circle', { r: 60, fill: P.accent }, stage);

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const out = prog(t, T.clear, 0.3, ease.in4);
  place(dot, W / 2, H / 2, popS(t, T.in) * (1 - out), popO(t, T.in) * (1 - out));
}

// ------------------------------------------------------------------ boot
window.DURATION = Math.round(T.end * FPS) / FPS;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, window.DURATION));
window.READY = (async () => { await loadFonts(); await preloadImages(svg); frame(0); return true; })();
