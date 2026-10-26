// Четыре перехода между четырьмя карточками (слово + цветной фон), петля без пустого кадра:
// ИДЕЯ —(а) whip-pan→ ЭСКИЗ —(б) раскрытие кругом из точки→ СВЕТ —(г) match cut→ ЦВЕТ —(в) жалюзи→ ИДЕЯ.
// (а) весь кадр сдвигается на ширину за 0,35 с, ease.inOut — смаз даёт рендер (motion blur);
// (б) точка-«точка в конце слова» — это уже окно в следующую сцену: клип-круг растёт до угла кадра;
// (в) жалюзи: 8 планок растут от своих средних линий каскадом сверху вниз, закрывают кадр и сходятся;
// (г) слово толкается на камеру, на пике скорости подменяется: «ВЕТ» стоит на месте, меняется
//     первая буква и цвет — глаз читает одно движение. Тёмное↔светлое — только через цвет, не через серое.

const P = { dark: '#111113', light: '#f4f1ea', yellow: '#ffd23f', blue: '#2b2fd9', orange: '#ff5b2e', warm: '#6f685d' };
window.SAFE = { x0: 96, x1: W - 96, y0: 54, y1: H - 54 };
const FONT = 'Unbounded', WEIGHT = 900;
const CARDS = [
  { word: 'ИДЕЯ', bg: P.dark, fg: P.light, note: '→ whip-pan', nc: P.orange },
  { word: 'ЭСКИЗ', bg: P.light, fg: P.dark, note: '→ раскрытие кругом', nc: P.warm },
  { word: 'СВЕТ', bg: P.yellow, fg: P.dark, note: '→ match cut', nc: P.dark },
  { word: 'ЦВЕТ', bg: P.blue, fg: P.yellow, note: '→ жалюзи', nc: P.light },
];

// ------------------------------------------------------------------ cues (с)
const T = {};
T.wA = 0.9;  T.wAd = 0.35;           // (а) whip-pan
T.dot = 1.92;                        // (б) точка появляется
T.wB = 2.2;  T.wBd = 0.6;            //     круг раскрывается (внутри пока только фон)
T.s3in = T.wB + T.wBd - 0.16;        //     слово СВЕТ выскакивает, когда круг почти закрыл кадр:
                                     //     граница круга не режет два слова в «ЭСКЕТ»
T.wC = 3.62; T.cut = T.wC + 0.2;     // (г) толчок; склейка на пике скорости
T.wD = 5.1;                          // (в) жалюзи: закрытие
T.open = T.wD + 0.5;                 //     ... и открытие
T.end = 6.7;                         // ИДЕЯ в покое = кадр 0
const SLATS = 8, SL_D = 0.26, SL_ST = 0.03;

// ------------------------------------------------------------------ build
const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
document.getElementById('root').appendChild(svg);
const defs = S('defs', {}, svg);
const stage = S('g', {}, svg);
const cards = CARDS.map(c => { const g = sceneG(stage); S('rect', { width: W, height: H, fill: c.bg }, g); return { ...c, g }; });
const blinds = Array.from({ length: SLATS }, (_, i) => S('rect', { x: 0, width: W, height: 0, fill: P.orange }, svg));
const circ = clipCircle(defs, cards[2].g);
let B = null;

function build() {
  // общий кегль: самое широкое слово занимает ≤ 1240 px
  const unit = Math.max(...CARDS.map(c => textWidth(c.word, 100, FONT, WEIGHT))) / 100;
  const size = Math.min(290, 1240 / unit);
  // вертикальный центр по реальной рамке букв (у Unbounded высокие прописные)
  const probe = S('text', { x: 0, y: 0, 'font-family': FONT, 'font-weight': WEIGHT, 'font-size': size }, svg);
  probe.textContent = 'ИДЕЯ'; const bb = probe.getBBox(); probe.remove();
  const base = H / 2 - (bb.y + bb.height / 2) - 10;
  // СВЕТ и ЦВЕТ: «ВЕТ» в одной и той же точке, первая буква пристыкована слева
  const vetX = W / 2 - textWidth('СВЕТ', size, FONT, WEIGHT) / 2 + textWidth('С', size, FONT, WEIGHT);
  cards.forEach((c, k) => {
    c.wg = S('g', {}, c.g);
    const attrs = { 'font-family': FONT, 'font-weight': WEIGHT, 'font-size': size.toFixed(1), fill: c.fg };
    if (k >= 2) {
      const a = S('text', { ...attrs, x: vetX, y: base, 'text-anchor': 'end' }, c.wg); a.textContent = c.word[0];
      const b = S('text', { ...attrs, x: vetX, y: base }, c.wg); b.textContent = c.word.slice(1);
    } else {
      const e = S('text', { ...attrs, x: W / 2, y: base, 'text-anchor': 'middle' }, c.wg); e.textContent = c.word;
    }
    const n = S('text', { x: 96, y: 992, 'font-family': 'Onest', 'font-weight': 600, 'font-size': 34, fill: c.nc }, c.g);
    n.textContent = c.note;
    c.noteEl = n;
  });
  // точка после ЭСКИЗ: здесь откроется круг
  const ew = textWidth('ЭСКИЗ', size, FONT, WEIGHT);
  B = { size, base, cy: base - bb.height * 0.36, dotX: W / 2 + ew / 2 + 0.34 * size, dotY: base - 0.1 * size };
  B.rMax = Math.hypot(Math.max(B.dotX, W - B.dotX), Math.max(B.dotY, H - B.dotY)) + 8;
}

// медленный наезд на удержании: локальное время карточки, у ИДЕИ оно переходит через шов петли
const pushS = tau => 1 + 0.035 * ease.sine(clamp(tau / 2.4));
const tau = (k, t) => {
  if (k === 0) return t < T.open ? t + (T.end - T.open) : t - T.open;
  return t - [0, T.wA, T.wB - 0.3, T.cut][k];
};

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  const { cy } = B;
  // какая карточка видна (display, не visibility)
  const on = [t < T.wA + T.wAd || t >= T.open - 0.01, t >= T.wA && t < T.wB + T.wBd, t >= T.dot && t < T.cut, t >= T.cut && t < T.open - 0.01];
  cards.forEach((c, k) => c.g.on(on[k]));

  // (а) whip-pan: кадр уезжает влево на ширину, новая карточка приходит справа
  const wx = -W * prog(t, T.wA, T.wAd, ease.inOut);
  A(cards[0].g, 'transform', `translate(${f2(t < T.open - 0.01 ? wx : 0)} 0)`);
  A(cards[1].g, 'transform', `translate(${f2(wx + W)} 0)`);

  // (б) круг: точка выскакивает пружиной (r 0 -> 22), потом раскрывается до дальнего угла
  const r0 = 22 * step(t - T.dot, SP.pop), u = prog(t, T.wB, T.wBd, ease.inOut);
  circ.set(B.dotX, B.dotY, t < T.dot ? 0 : (t >= T.wB + T.wBd ? 4000 : lerp(r0, B.rMax, u)));

  // (г) match cut: толчок на камеру (ease.in, скорость растёт), склейка, новое слово гасит толчок (ease.out)
  const A_ = 0.24;
  const pin = 1 + A_ * Math.pow(clamp((t - T.wC) / (T.cut - T.wC)), 3);
  const pout = 1 + A_ * (1 - ease.out4((t - T.cut) / 0.34));
  const sh = shake(t, T.cut, 10, 0.3, 7);
  // слова: наезд на удержании × толчок; центр масштаба — центр строки
  cards.forEach((c, k) => {
    let s = pushS(tau(k, t)), dx = 0, dy = 0;
    if (k === 2) {
      const e = after(t, T.s3in, SP.pop);
      s *= pin * (t < T.s3in ? 0.001 : lerp(0.55, 1, e));
      A(c.wg, 'opacity', f2(popO(t, T.s3in)));
      rise(c.noteEl, prog(t, T.s3in + 0.1, 0.2, ease.out), 10);
    }
    if (k === 3) { s *= t < T.cut ? 1 : pout; dx = sh.x; dy = sh.y; }
    A(c.wg, 'transform', `translate(${f2(W / 2 + dx)} ${f2(cy + dy)}) scale(${f2(s)}) translate(${f2(-W / 2)} ${f2(-cy)})`);
  });

  // (в) жалюзи: каждая планка «поворачивается» — растёт от своей средней линии, каскадом сверху вниз;
  // кадр закрыт целиком на 1–2 кадра (там и меняется карточка), потом планки сходятся обратно
  const hS = H / SLATS;
  blinds.forEach((b, i) => {
    const c = prog(t, T.wD + i * SL_ST, SL_D, ease.inOut), o = prog(t, T.open + i * SL_ST, SL_D, ease.inOut);
    const h = (hS + 1) * c * (1 - o), yc = (i + 0.5) * hS;
    A(b, 'y', f2(yc - h / 2)); A(b, 'height', f2(h));
    A(b, 'visibility', h > 0.01 ? 'visible' : 'hidden');
  });
}

// ------------------------------------------------------------------ звук
sfx(T.wA, 'whoosh', -8);
sfx(T.dot, 'pop', -11);
sfx(T.wB + 0.05, 'whoosh', -13);
sfx(T.cut - 0.02, 'pop', -6);
sfx(T.wD, 'whoosh', -11);
sfx(T.open, 'click', -12);

// ------------------------------------------------------------------ boot
window.DURATION = Math.round(T.end * FPS) / FPS;
window.T = T;
window.SFX_EVENTS = SFX;
window.seek = t => frame(clamp(t, 0, window.DURATION));
window.READY = (async () => { await loadFonts(); build(); frame(0); return true; })();
