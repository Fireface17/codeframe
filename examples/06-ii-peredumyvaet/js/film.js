// film.js — ролик №6 «Одна фраза — и ChatGPT перестал спорить». Один лист на столе, камера сверху; сцены — места на листе.
// Карта: столбец чата — центр (шапка «ChatGPT» → его ответ → ЗАЗОР → скотч с моей репликой → ответ «Хорошо»);
// зазор — сцена столбца: в нём надпись хука (0–36 с), листок правил (поворот), листок урока (урок), вопрос (петля).
// Кармашек «2023» и сетка 10×10 — ниже; поднос А/Б — правее; календарь — ещё правее; колонка теста — у края столбца.
// Структура: cues T (от слов) → раскладка LY → камера → построение → frame(t). Хореография — scenes.js.

const Q_ = new URLSearchParams(location.search);
const MAP = Q_.get('map') === '1';
const COVER = Q_.get('cover') === '1';
window.SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248, xLow: 780, yLow: 840 };

// ------------------------------------------------------------------ cues: от слов (сценарий v4.1, 9 фраз, 130 слов; индекс слова)
const WS = i => window.WORDS.words[i].start, WE = i => window.WORDS.words[i].end;
const T = {};
// v6.1: 7 фраз, 97 слов. Хук → тест → кульминация → ядро («сказал «хорошо» — а 7 на 6 не сменил») → объяснение у подноса → урок → петля.
// 1. «Одна фраза — и ChatGPT перестал со мной спорить. Хотя прав был он.»
// v8: действие с кадра 0 — карточка «Хорошо, не буду спорить.» в полёте (вершина броска), садится к 0,6 с; надпись карандашом 0–1,0 с
T.tap1 = Math.max(0.68, WS(1) + 0.16); T.tap2 = T.tap1 + 0.17;      // v9: надпись с кадра 0 целиком; карандаш стучит по скотчу на «фраза»
T.TL = 0.6; T.TU = 0.6;                                               // бросок: вершина — кадр 0 (и последний кадр); посадка T.TL
T.ans = Infinity;
T.ttlDur = 0.5;                                                       // v9: надпись в кадре 0 целиком; в петле карандаш выводит её заново за 0,5 с
T.hookPush = 2.3;
T.redMark = WS(9) - 0.05;                                             // «прав»: красной ручкой у карточки «ответ: 7 ✓» (поворот в хуке)
T.s2 = WE(11) - 0.1; T.b1in = T.s2 + 0.25;                           // после «он» — к его ответу
// 2. «Я нарочно спорил: в «обороноспособности» шесть «о». Их семь — и он стоял на своём.»
T.uw = WS(13) - 0.05; T.uwEnd = WE(14);
T.six = WS(17) - 0.04;
T.num0 = Math.max(T.six + 0.32, WS(19) - 0.45);
T.oWave = T.num0; T.oStep = 0.15; T.big7 = T.num0 + 7 * 0.15 + 0.05;
T.testPush = Math.min(8.5, T.num0);
// 3. «Пока я не написал: «Не думай и не делай ничего, просто ты не прав».» + 1 с тишины
T.s6 = WS(26) - 0.08; T.tear = WS(29) - 0.02; T.q0 = WS(30); T.qEnd = WE(39);
T.hit = (WE(39) + WS(40)) / 2 - 0.08;
// 4. «Сказал «хорошо» — а семь на шесть так и не сменил.» — ядро: его ответ, «7» обведена, моя «6» зачёркнута, «Хорошо» рядом
T.core = Math.max(T.hit + 0.45, WS(40) - 0.1);                        // камера к его ответу
T.okIn = WS(41) - 0.05;                                               // «хорошо»: карточка «Хорошо» садится рядом с ответом
T.circ = WS(43) - 0.04;                                               // «семь»: «7» обводится красной ручкой
T.cross = WS(45) - 0.04;                                              // «шесть»: моя «6» зачёркивается карандашом
T.corePush = WS(46) - 0.1;                                            // «так и не сменил»: наезд на «7» и «6» (≥ 90 px)
// 5. «Почему? Ботов доучивают на наших оценках, а мы любим согласие. Но правило у них: правду не менять — и не спорить до упора.»
T.lift3 = WS(50) + 0.05; T.toTray = T.lift3 + 0.12; T.s3 = T.toTray;
T.people = T.toTray - 0.65;   // v9: поднос, «Ведь 6?», А/Б уже на месте к склейке                                             // поднос с «Ведь 6?»
T.ab = T.toTray - 0.45;                                                 // «доучивают»: А и Б
T.label = Infinity;                                                   // мелкую метку убрали
T.check = Infinity;
// «доучивают на наших оценках — а мы любим»: четыре карандаша-руки наперебой кладут лайки на «Да, ты прав!», стопка растёт
T.likes = Array.from({ length: 10 }, (_, i) => lerp(T.toTray + 0.3, WS(58) + 0.1, i / 9));   // v9: сразу после «Почему?»
T.like = T.likes[0];
T.plus = [Infinity, Infinity, Infinity, Infinity, Infinity];
T.tilt = WS(59) - 0.05;                                               // «согласие»: «ChatGPT» кренится к А
T.straight = WS(60) - 0.05;                                           // «Вот их и учат»: выпрямляется
T.press = [WS(61) - 0.02, WS(63) + 0.02];                             // нажим дважды — не кренится
T.rule = WS(64) - 0.1;                                                // «факт»: крупная плашка правила ложится на поднос
T.badge1 = Infinity; T.badge2 = Infinity;
T.cam2 = T.ab + 0.9; T.wide = T.straight - 0.1;
T.arrow = Infinity; T.penOut = T.like + 0.04; T.flag = Infinity; T.hes = Infinity; T.hesEnd = Infinity;
// 6. «Но если неправ ты — его «хорошо» не значит «ты прав».» (без субтитров)
// v8 (v6.3): «Но если неправ ты — его «хорошо» ещё не значит, что ты прав.» — чистый кадр: только «Хорошо ≠ ты прав»
T.s8 = WS(73) - 0.08; T.home = T.s8; T.s7 = T.s8; T.qq = Infinity; T.ok = WS(78) - 0.05; T.neq = WS(80) - 0.05; T.empty = Math.max(WS(75) - 0.05, T.s8 + 0.7); T.tyIn = WS(83) - 0.05;   // пустая рамка «ты прав» — на «неправ ты»
// 7. «Перешли тому, кто в споре говорит: «Мне ChatGPT подтвердил». За этим может стоять —» → петля
T.s9 = WS(85) - 0.08; T.lesOut = WS(85) - 0.1;
T.ask = T.lesOut + 0.45; T.askArr = Infinity;
T.conf = Math.max(WS(93) + 0.1, T.ask + 3.0); T.turn = T.conf + 0.42;
T.seam0 = T.conf - 0.1;
T.emerge = T.turn + 0.3;                                              // «Хорошо» выезжает из-под скотча → бросок в точку кадра 0
T.rewrite = T.turn + 0.27; T.writeEnd = T.rewrite + T.ttlDur; T.hint = T.writeEnd + 0.02; T.hintEnd = T.hint + 0.3;
T.capOff9 = WS(91) - 0.06;
// снятое из v5 (сцены убраны): откат и листок правил
T.s4 = Infinity; T.rain = Infinity; T.ideas = Infinity; T.cards = [Infinity, Infinity, Infinity]; T.praise = Infinity;
T.roll = Infinity; T.flip = [Infinity, Infinity, Infinity]; T.flip4 = Infinity; T.rules = Infinity; T.chk1 = Infinity; T.chk2 = Infinity;
T.arr1 = Infinity; T.arr2 = Infinity; T.note = Infinity; T.noteEnd = Infinity; T.push7 = Infinity;
T.end = window.WORDS.duration;
const DUR = Math.round(T.end * FPS) / FPS;
T.tossE = DUR - T.TU;
// склейка без проезда: точно между кадрами (окно затвора 180° её не захватывает — кадр не смешивает два плана)
const cutT = t => (Math.floor(t * FPS) + 0.5) / FPS;

// ------------------------------------------------------------------ раскладка листа (мировые px; хук: камера HOOK, ×0,8)
const LY = {
  sheet: { x0: -1700, y0: -2000, x1: 3700, y1: 2700 },
  col: { x0: -450, y0: -874, w: 940, h: 1094 },                        // бумажный столбец чата (x −440…460, y −874…220)
  // надпись хука: Unbounded 900, 100 мира = 80 px в хуке (заглавные 61 px); в зазоре между его ответом и скотчем
  ttl: { x: -444, y: [-598, -496, -394, -292], size: 100, lines: ['ОДНА ФРАЗА', '— И ChatGPT', 'ПЕРЕСТАЛ', 'СПОРИТЬ'] },   // 909 мира max: x 160–888 в хуке
  hint: { x: -440, y: -186, size: 66 },                                 // «хотя прав был он» карандашом под надписью
  okc: { x: -60, y: -420 },                                            // ядро: карточка «Хорошо» рядом с его ответом
  badges: { x: 667, y: [-526, -410], size: 66 },                        // (v7) значки — сняты
  rule: { x: 1150, y: -800, size: 72, src: 54 },                        // плашка правила поверх подноса (62 px при ×0,86)
  apex: { x: -50, y: -5, s: 2.0, rot: -7 },                             // вершина броска «Хорошо» = кадр 0 (центр кадра хука)
  user: { x: 280, y: -790, size: 45 },
  redMark: { x: 6, y: 168, size: 50 },                                  // хук: «ответ: 7 ✓» красной ручкой у карточки «Хорошо»                                 // 48 px в тесте                                  // моя реплика теста «Ты не прав, там 6 букв» — справа в ряду шапки
  head: { x: -336, y: -801, w: 252, h: 82, rot: -1.5 },                // карточка «ChatGPT» — шапка столбца
  b1: { x: -4, y: -657, w: 760, h: 240 },                              // его ответ крупнее (44/54/54): y −777…−537                              // его ответ (y −777…−551); шире — слово растёт ×1,1
  gap: { x: 0, y: -336 },                                               // зазор (−551…−120): сцена столбца
  reply: { x: -235, y: [-82, -40, 2, 44], size: 40, lines: ['Не думай', 'и не делай', 'ничего, просто', 'ты не прав'] },   // полужирным, 88 px в кульминации
  tape: { x: 21, y: -30, w: 622, h: 180, rot: -1.6, qx: 205 },         // малярный скотч (y −120…60); «?» в правой трети
  ans: { x: -137, y: 146, w: 240, h: 164 },                              // «Хорошо, / не буду / спорить.» в 3 строки                              // «Хорошо, не буду спорить.» (y 58…198), под скотчем краем
  wad: { x: -30, y: 420, rot: 16 },                                     // смятый скотч после рывка — низ кадра кульминации
  qslip: { x: -10, y: 470, w: 660, h: 114, rot: 1.2 },                  // вопрос теста Anthropic (садится на карточки кармашка)
  pocket: { x: 0, y: 710, w: 840, h: 300 },                             // кармашек «2023» (y 560…860)
  grid: { x0: -396, y0: 1060, cw: 72, ch: 52, gap: 8 },                 // сетка 10×10 (y 1060…1652)
  sign: { x: 340, y: 430 },
  roll: { x: -720, y: 320 },                                            // рулон малярного скотча слева от столбца
  // поднос А/Б, обрезан по карточкам +40: x 765…1535, y −900…−670
  tray: { x: 1150, y: -785, w: 1100, h: 280 },                          // А/Б на полкадра
  A: { x: 895, y: -785 }, B: { x: 1405, y: -785 }, ABw: 490, ABh: 200,
  trayQ: { x: 1150, y: -1018 }, label: { x: 948, y: -995 },                                         // «17 × 24 = ?» — отдельная картонка над А/Б
  head3: { x: 1150, y: -1185, s: 1.75 },                                // «ChatGPT» над подносом: ×1,75 (441 мира)
  likeBox: { x: 1250, y: -120 },   // v9: запас лайков — низ кадра подноса                                         // коробочка лайков — сразу под А (путь лайка ≤ 240 px)
  likeA: { x: 1050, y: -905, rot: 14 },                                 // лайк — на верхнем крае А (на 80+ px левее, чем в v1), текст А открыт
  stack: { x: 760, y: -330 },
  test: { x0: 425, y0: 64, w: 610, h: 810 },                            // колонка теста: полоса въезжает на «Меркурий», уезжает на «Но потом»
  testRoll: { x: 760, y: 1150 },
  // откат: кадр (2300, −760) ×1; календарь слева сверху, «ChatGPT» справа сверху, три листа с решениями — столбиком внизу слева
  cal: { x: 2075, y: -1215 },
  head4: { x: 2500, y: -1330, s: 1.3 },
  sheets: { x: [2042, 2384, 2213], y: [-905, -905, -712], w: 340, h: 132 },
  calSrc: { x: 2370, y: -1100 },
  rules: { x: 300, y: -180, rot: 1.6, s: 0.6 },                         // маленький листок правил (фактура), без стрелок
  note: { x: -410, y: [-468, -388], size: 70 },                          // «сказал „хорошо“ — / но 7 на 6 не сменил» графитом                                   // листок «Правила OpenAI» — в зазоре
  lesson: { x: 0, y: -310, rot: -0.8, w: 940, h: 760 },                                 // листок урока — в зазоре
  ask: { x: -20, y: -262 },                                             // вопрос для комментариев — в зазоре, над фразой
};
const scr = (c, wx, wy) => ({ x: (wx - c.x) * c.z + W / 2, y: (wy - c.y) * c.z + H / 2 });
const wld = (c, sx, sy) => ({ x: c.x + (sx - W / 2) / c.z, y: c.y + (sy - H / 2) / c.z });

// ------------------------------------------------------------------ камера: кадры-функции времени + переходы (r — поворот, °)
const sine = ease.sine;
const drift = (t, t0, d, a) => a * sine(prog(t, t0, d, x => x));
// мировая точка (wx, wy) стоит в экранной (sx, sy) при масштабе z: наезды вокруг смысловой точки
const zoomAt = (wx, wy, sx, sy, z, r = 0) => ({ x: wx - (sx - W / 2) / z, y: wy - (sy - H / 2) / z, z, r });
const HOOK = { x: 45, y: 0, z: 0.8 };                                  // столбец целиком: шапка y ≈ 300, низ ответа «Хорошо» — 1118
const SEAM = { ...HOOK, k: 0.003, py: 710 };                           // медленный наезд 0,3 %/с вокруг середины столбца — через шов
const seamZ = t => SEAM.z * (1 + SEAM.k * t);
const seamCam = t => zoomAt(SEAM.x, SEAM.y + (SEAM.py - H / 2) / SEAM.z, W / 2, SEAM.py, seamZ(t));
// кульминация: точка между репликой и ответом (мир −235, 60) стоит в (124, 840) — реплика выше 840, ответ ниже и x ≤ 780
const climaxZ = t => t < T.hit ? lerp(2.06, 2.2, sine(prog(t, T.s6 + 0.55, T.hit - T.s6 - 0.55, x => x))) : lerp(2.2, 2.22, sine(prog(t, T.hit, WS(40) - T.hit, x => x)));
const SHOT = {
  // хук: плавный наезд 3 % с 2,3 к скотчу и ответу (без статики до проезда)
  // хук: наезд с кадра 0 (3,5 % + дрейф шва ≈ 4,9 %); центр — у правого края надписи: надпись 909 px остаётся в зоне
  hook0: t => { const c = seamCam(t), k = 1 + 0.035 * sine(prog(t, 0, T.s2 + 0.3, x => x)); return zoomAt(c.x + (857 - W / 2) / c.z, c.y + (540 - H / 2) / c.z, 857, 540, c.z * k); },
  // ядро: его ответ, моя реплика с «6» и карточка «Хорошо» в одном кадре
  core: t => zoomAt(-33, -610, 504, 690, 1.15 * (1 + drift(t, T.core + 0.5, T.corePush - T.core - 0.5, 0.012))),
  // конец ядра: наезд на обведённую «7» и зачёркнутую «6» (≥ 90 px)
  corePush: t => zoomAt((R.sixPt.x + R.sevenPt.x) / 2, (R.sixPt.y + R.sevenPt.y) / 2 - 30, 504, 680, 2.0 * (1 + drift(t, T.corePush + 0.5, T.lift3 - T.corePush - 0.5, 0.015))),
  // объяснение: общий кадр — «ChatGPT», поднос, значки
  s3w: t => zoomAt(1135, -820, 504, 720, 0.85 * (1 + drift(t, T.wide + 0.45, T.s8 - T.wide - 0.45, 0.025))),
  // правило: «ChatGPT» сверху, плашка правила крупно в середине, лайки слева
  rule: t => zoomAt(1150, -830, 504, 640, 0.84 * (1 + drift(t, T.wide + 0.45, T.s8 - T.wide - 0.45, 0.01))),
  // тест (один диалог): моя реплика «Ты не прав, там 6 букв» и его ответ крупно; слово ×1,1 — 737 px при ×1,05
  test: t => zoomAt(-33, -657, 504, 800, 1.17 * (1 + drift(t, T.s2 + 0.7, T.num0 - T.s2 - 0.7, 0.012))),
  // тест, конец: наезд к «7 букв «о»» — переписка сверху, крупная «7» в середине кадра
  test7: t => zoomAt(-33, -560, 504, 760, 1.18 * (1 + drift(t, T.num0 + 0.5, T.s6 - T.num0 - 0.5, 0.01))),
  // «Почему они уступают?»: снова столбец целиком (перекличка с хуком); шапка отрывается и едет к подносу
  s3a: t => seamCam(0),
  // поднос, общий: «ChatGPT» сверху, картонка вопроса, А/Б, коробочка лайков
  s3: t => zoomAt(1150, -900, 504, 680, 0.86 * (1 + drift(t, T.toTray + 0.4, T.ab - T.toTray - 0.4, 0.02))),
  // ход 1 (≥ 10 %): к А/Б на «из двух ответов»
  s3m1: t => zoomAt(1148, -860, 504, 690, 0.86 * (1 + drift(t, T.toTray, T.wide - T.toTray, 0.012))),
  // ход 2 (≥ 10 %): к карандашу и флажку «Ведь 418?»; тексты А и Б целиком в кадре
  s3m2: t => zoomAt(1130, -760, 504, 820, 0.94 * (1 + drift(t, T.cam2 + 0.4, T.tilt - T.cam2 - 0.4, 0.008))),
  // ход 3: отъезд и подъём к «ChatGPT» (441 мира × 0,98 ≈ 432 px), крен 12°
  s3m3: t => zoomAt(1150, -1185, 504, 470, 0.98 * (1 + drift(t, T.tilt + 0.4, T.s4 - T.tilt - 0.4, 0.015))),
  // откат: до «и он начал» — плотнее на календаре и «ChatGPT» с лайками; на «и он начал» — отъезд, листки с решениями
  s4a: t => zoomAt(2246, -1270, 504, 560, 1.15 * (1 + drift(t, T.s4 + 0.4, T.ideas - T.s4 - 0.4, 0.015))),
  s4: t => ({ x: 2300, y: -760, z: 1.0 * (1 + drift(t, T.ideas + 0.45, T.s7 - T.ideas - 0.45, 0.03)), r: 0 }),
  // снова поднос: «ChatGPT» в крене выпрямляется; галочка А → Б; наезд 3,5 % к Б
  s5a: t => zoomAt(1150, -985, 496, 640, 1.0),
  s5aB: t => zoomAt(1325, -785, 662, 840, 1.035),
  // тест: полоса крупно; слева сверху — край столбца со скотчем и «?» (вздрагивает на каждой галочке)
  s5b: t => ({ x: 715, y: 724, z: 1.0, r: 0 }),
  s5bO: t => zoomAt(LY.test.x0 + 200, LY.test.y0 + 34 + 2 * 236 + 150, 540 + (LY.test.x0 + 200 - 715), 960 + (LY.test.y0 + 34 + 2 * 236 + 150 - 724), 1.025),
  // кульминация: реплика 81 px над линией 840, ответ под ней (x ≤ 780); наезд 4,3 % до удара, после — 1,2 %
  s6: t => { const z = climaxZ(t); return zoomAt(-235, 59, 129, 800, z); },
  // поворот: столбец целиком (как в хуке); листок въезжает — камера чуть отъезжает (3 %)
  s7: t => zoomAt(0, -339, 504, 712, 0.8 * (1 - 0.03 * ease.inOut(prog(t, T.rules, 0.7)))),
  // «по правилам OpenAI»: наезд 3,5 % к заголовку листка
  s7b: t => zoomAt(-60, -430, 504 + (-60 - 0) * 0.776, 712 + (-430 + 339) * 0.776, 0.776 * 1.035),
  // урок: его ответ «…7 букв «о»» в y 300–560, листок урока в зазоре, фраза ниже — над субтитром
  s8: t => zoomAt(0, -296, 504, 670, 0.9 * (1 + drift(t, T.s8 + 0.45, T.s9 - T.s8 - 0.45, 0.015))),
  // петля: вопрос и фраза (55 px тёмными чернилами) вместе ≥ 3 с
  s9: t => zoomAt(-10, -150, 504, 760, 1.03 * (1 + drift(t, T.s9 + 0.5, T.seam0 - T.s9 - 0.5, 0.015))),
  seam: t => seamCam(t - DUR),
};
const CAMS = [
  [0, 0, SHOT.hook0],
  [T.s2, 0.7, SHOT.test, ease.inOut],
  [T.num0 - 0.3, 0.55, SHOT.test7, ease.inOut],
  [cutT(T.s6), 0, SHOT.s6],                                            // v8: склейки вместо смаз-проездов (11,5 / 17 / 21,5 с)
  [cutT(T.core), 0, SHOT.core],
  [T.corePush, 0.5, SHOT.corePush, ease.inOut],
  [cutT(T.toTray), 0, SHOT.s3m1],
  [T.wide, 0.45, SHOT.rule, ease.inOut],
  [T.s8, 0.45, SHOT.s8, ease.inOut],
  [T.s9, 0.5, SHOT.s9, ease.inOut],
  [T.seam0, 1.0, SHOT.seam, ease.inOut],
];
// проезды камеры (переходы между кадрами): безопасную зону на них не проверяем — текст в смазе не читается
window.SAFE.skip = CAMS.slice(1).filter(c => c[1] >= 0.3 && c[3] !== sine).map(c => [c[0] - 0.02, c[0] + c[1] + 0.02]).concat([[T.hit, T.hit + 0.25]]);   // + тряска удара
function camAt(t) {
  let c = CAMS[0][2](t);
  for (let k = 1; k < CAMS.length; k++) {
    const [t0, d, fn, e = ease.inOut] = CAMS[k];
    if (t <= t0) break;
    const m = e(clamp((t - t0) / d)), n = fn(t);
    c = { x: lerp(c.x, n.x, m), y: lerp(c.y, n.y, m), z: Math.exp(lerp(Math.log(c.z), Math.log(n.z), m)), r: lerp(c.r || 0, n.r || 0, m) };
  }
  // единственный удар всем кадром — падение ответа в кульминации: пинок масштаба + короткая тряска (ответ остаётся x ≤ 780)
  const kick = t > T.hit ? 0.018 * Math.exp(-(t - T.hit) / 0.1) * Math.cos((t - T.hit) * 30) : 0;
  const sk = shake(t, T.hit, 7, 0.3, 5, 24);
  return { x: c.x + sk.x / c.z, y: c.y + sk.y / c.z, z: c.z * (1 + kick), r: c.r || 0 };
}
// масштаб камеры — 6 знаков: при 3 знаках медленный наезд шёл ступеньками раз в 5 кадров (jumps.py на klon_v1 до правки)
const camXf = (c, k = 1) => `translate(${f2(W / 2)} ${f2(H / 2)})${c.r ? ` rotate(${(c.r).toFixed(5)})` : ''} scale(${(c.z * k).toFixed(6)}) translate(${(-c.x).toFixed(4)} ${(-c.y).toFixed(4)})`;
// больше подкадров там, где быстро движется камера или предмет (гребёнка смаза на klon_v1): render.mjs берёт window.SUBMAP_AUTO
window.SUBMAP_AUTO = [
  ...CAMS.slice(1).filter(c => c[1] >= 0.3 && c[3] !== sine).map(c => [c[0], c[0] + c[1], 40]),
  [T.ans - 0.2, T.ans + 0.12, 40], [T.tear, T.tear + 0.62, 48], [T.like - 0.32, T.like + 0.05, 40], [T.like + 0.35, T.like + 0.85, 32],
  [T.roll - 0.52, T.roll + 0.5, 48], [T.qEnd - 0.1, T.qEnd + 0.35, 40], [T.s7, T.press[0], 40], [T.rules, T.rules + 0.7, 32],
  [T.s8, T.s8 + 0.7, 40], [T.people - 0.2, T.people + 0.35, 32], [T.rain - 0.3, T.rain + 1.0, 32], [T.praise - 0.1, T.praise + 0.45, 32],
  [T.flip[0] - 0.12, T.roll + 0.16, 32], [T.ideas - 0.25, T.ideas + 0.6, 32], [T.ok - 0.25, T.ok + 0.05, 40], [T.conf - 0.3, T.conf + 0.05, 40],
  [0, T.TL + 0.12, 40], [T.tossE - 0.1, DUR, 40], [T.emerge - 0.05, T.emerge + 0.3, 32], [T.likes[0] - 0.6, T.likes[T.likes.length - 1] + 0.45, 32], [T.rewrite, T.hintEnd, 32], [T.rule - 0.3, T.rule + 0.05, 32], [T.okIn - 0.3, T.okIn + 0.05, 40], [T.badge1 - 0.3, T.badge1 + 0.05, 32], [T.badge2 - 0.3, T.badge2 + 0.05, 32],
].map(([a, b, n]) => [Math.max(0, a), Math.min(DUR, b), n]);

// ------------------------------------------------------------------ build
let root = null, wg = null, fg = null, L = null, caps = null, mapG = null;
const R = {};
async function build() {
  root = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  document.getElementById('root').appendChild(root);
  const defs = S('defs', {}, root);
  const paper = bakePaper(512, PAL.sheet, 1, 1), grain = bakeGrain(256, 5), desk = bakeDesk(1024, 1024, 7);
  patternFrom(defs, 'pPaper', await toURL(paper, 'image/jpeg', 0.92), 512, 512);
  patternFrom(defs, 'pGrain', await toURL(grain), 256, 256);
  patternFrom(defs, 'pDesk', await toURL(desk, 'image/jpeg', 0.92), 1024, 1024);
  patternFrom(defs, 'pCrepe', await toURL(bakeCrepe(256, 11)), 256, 256);
  patternFrom(defs, 'pGraph', await toURL(bakeGraphite(256, 17)), 256, 256);
  const gl = S('linearGradient', { id: 'gLit', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  [[0, '#FFFFFF', 0.13], [0.45, '#FFFFFF', 0], [1, '#2A1E10', 0.07]].forEach(([o, c, a]) => S('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, gl));
  // размытие сетки «2023» до «признавал» (3 px на экране) и знака канала (4 px): stdDeviation в мировых px — ставит кадр
  R.fGrid = S('feGaussianBlur', { stdDeviation: 0 }, S('filter', { id: 'fGrid', x: '-5%', y: '-5%', width: '110%', height: '110%' }, defs));
  R.fSign = S('feGaussianBlur', { stdDeviation: 0 }, S('filter', { id: 'fSign', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs));
  S('rect', { width: W, height: H, fill: PAL.desk }, root);
  wg = S('g', {}, root);
  const sh = LY.sheet;
  S('rect', { x: -9000, y: -9000, width: 20000, height: 20000, fill: 'url(#pDesk)' }, wg);
  S('rect', { x: sh.x0 + 8, y: sh.y0 + 12, width: sh.x1 - sh.x0, height: sh.y1 - sh.y0, fill: PAL.shadow, opacity: 0.08 }, wg);
  S('rect', { x: sh.x0, y: sh.y0, width: sh.x1 - sh.x0, height: sh.y1 - sh.y0, fill: 'url(#pPaper)' }, wg);
  const lay = () => S('g', {}, wg);
  L = { defs };
  // порядок слоёв: бумага → надписи на листе → картон (низ) → чернила столбца → скотч → листки сверху → летящее → карандаш
  ['paperSh', 'paper', 'sheetInk', 'pocketBack', 'pocketCards', 'qslipSh', 'qslip', 'pocketFront', 'gridSh', 'grid',
    'cardSh', 'card', 'colInk', 'tapeSh', 'tape', 'midSh', 'mid', 'stampL', 'overSh', 'over', 'overInk', 'flySh', 'fly', 'flyInk', 'actSh', 'act'].forEach(k => { L[k] = lay(); });
  A(L.grid, 'filter', 'url(#fGrid)'); A(L.gridSh, 'filter', 'url(#fGrid)');
  mapG = S('g', {}, wg);
  fg = S('g', {}, root);
  const capL = S('g', {}, root);

  buildColumn();
  build2023();
  buildTray();
  buildCalendar();
  buildTest();
  buildTurn();
  buildActors();
  scenesInit();
  await buildFore();

  // субтитры: Onest 700 по словам, 58 px, на бумажной плашке; x 120–780, низ y ≈ 1240; выключены на цитатах,
  // на «98 раз из 100» (штамп и есть субтитр) и на формуле урока
  const ch = (...ix) => ix.map(i => [window.WORDS.words[i].w, i]);
  const spec = [
    [0, 1], [2, 3], [4, 5, 6, 7], [8, 9, 10, 11],
    [12, 13, 14], { ix: [15, 16], scale: 0.62 }, [17, 18], [19, 20], [21, 22, 23, 24, 25],
    { ix: [26, 27, 28, 29], end: WS(30) - 0.04 },
    [40, 41], [42, 43, 44, 45], [46, 47, 48, 49],
    [50], [51, 52], [53, 54, 55], [56, 57, 58, 59], [60, 61, 62, 63], [64, 65, 66], [67, 68, 69, 70], { ix: [71, 72], end: WE(72) + 0.2 },
    [85, 86], { ix: [87, 88, 89, 90], end: T.capOff9 }, [94, 95, 96, 97],
].map(s => (Array.isArray(s) ? { lines: [ch(...s)] } : { lines: [ch(...s.ix)], end: s.end, scale: s.scale }));
  // порция шире 640 px (Onest 700, 58 px) делится на две по слову: субтитр всегда в одну строку (низ ≤ 1248)
  const capW = ix => textWidth(ix.map(i => window.WORDS.words[i].w).join(' '), 75, 'Onest', 700) + 21 * (ix.length - 1);
  for (let k = 0; k < spec.length; k++) {
    const ix = spec[k].lines[0].map(tk => tk[1]);
    if (ix.length > 1 && !spec[k].scale && capW(ix) > 640) {
      let best = 1, bd = Infinity;
      // не рвать после короткого служебного слова («со мной», «и он», «в споре»): такой разрез — только если других нет
      const shortW = i => window.WORDS.words[i].w.replace(/[^\p{L}\p{N}]/gu, '').length <= 2;
      for (let m = 1; m < ix.length; m++) { const d = Math.abs(capW(ix.slice(0, m)) - capW(ix.slice(m))) + (shortW(ix[m - 1]) ? 2000 : 0); if (d < bd) { bd = d; best = m; } }
      const a = { lines: [spec[k].lines[0].slice(0, best)] }, b = { lines: [spec[k].lines[0].slice(best)], end: spec[k].end };
      spec.splice(k, 1, a, b); k--;
    }
  }
  const DASH_AFTER = new Set([1, 20, 41, 55, 76, 97]);
  spec.forEach(c => c.lines[0].forEach(tk => { if (DASH_AFTER.has(tk[1])) tk[0] += ' —'; }));
  caps = makeCaptions(capL, spec, { x: 120, y: 1208, size: 75, lh: 88, maxW: 650, font: 'Onest, sans-serif', weight: 700, ink: PAL.ink, end: DUR - 0.12, plate: true });
  if (MAP) buildMap();
  if (COVER) buildCover(capL);
  if (!MAP && !COVER && typeof buildSfx === 'function') buildSfx();
}

// ------------------------------------------------------------------ запечённые фактуры этого ролика
// креп малярного скотча: тонкие поперечные морщинки с неровным шагом (бесшовно)
function bakeCrepe(size = 256, seed = 11) {
  const c = cnv(size, size), g = c.getContext('2d');
  g.lineCap = 'round';
  let x = 0, i = 0;
  while (x < size) {
    const w = 0.5 + 0.9 * hash01(i, seed), a = 0.025 + 0.06 * hash01(i, seed + 1), dark = hash01(i, seed + 2) < 0.7;
    g.strokeStyle = dark ? `rgba(120,96,52,${a})` : `rgba(255,252,240,${a * 1.6})`; g.lineWidth = w;
    // морщинка креп-бумаги — не сплошная «древесина»: короткие отрезки с разрывами
    let y0 = -4;
    while (y0 < size + 4) {
      const seg = 10 + 34 * hash01(i * 13 + y0, seed + 5), gap = 4 + 16 * hash01(i * 17 + y0, seed + 6);
      g.beginPath();
      for (let y = y0; y <= y0 + seg; y += 6) { const xx = x + 1.4 * Math.sin((y + 37 * i) / (12 + 9 * hash01(i, seed + 3))); y === y0 ? g.moveTo(xx, y) : g.lineTo(xx, y); }
      g.stroke();
      y0 += seg + gap;
    }
    x += 3 + 9 * hash01(i, seed + 4); i++;
  }
  // редкие волокна
  for (let k = 0; k < 40; k++) {
    const x0 = hash01(k, seed + 9) * size, y0 = hash01(k, seed + 10) * size, a = hash01(k, seed + 11) * 6.28, L_ = 4 + 10 * hash01(k, seed + 12);
    g.strokeStyle = 'rgba(140,110,60,0.12)'; g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * L_, y0 + Math.sin(a) * L_); g.stroke();
  }
  return c;
}
// графит: светлые крапинки и штрихи поверх тёмной заливки (буквы «нарисованы» карандашом, не напечатаны)
function bakeGraphite(size = 256, seed = 17) {
  const c = cnv(size, size), g = c.getContext('2d');
  const im = g.createImageData(size, size), d = im.data;
  for (let p = 0; p < size * size; p++) {
    const h = hash01(p, seed);
    if (h < 0.16) { d[p * 4] = 210; d[p * 4 + 1] = 212; d[p * 4 + 2] = 216; d[p * 4 + 3] = 40 + 70 * hash01(p, seed + 1); }
    else if (h > 0.9) { d[p * 4] = 20; d[p * 4 + 1] = 22; d[p * 4 + 2] = 26; d[p * 4 + 3] = 50; }
  }
  g.putImageData(im, 0, 0);
  g.lineCap = 'round';
  for (let k = 0; k < 160; k++) {
    const x = hash01(k, seed + 3) * size, y = hash01(k, seed + 4) * size, L_ = 6 + 14 * hash01(k, seed + 5);
    g.strokeStyle = `rgba(225,227,230,${0.12 + 0.12 * hash01(k, seed + 6)})`; g.lineWidth = 0.8;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + L_ * 0.85, y + dy - L_ * 0.5); g.stroke(); }
  }
  return c;
}

// ------------------------------------------------------------------ столбец чата: шапка, его ответ, надпись в зазоре, моя реплика, скотч, ответ
function buildColumn() {
  const C = LY.col;
  R.col = makePaper(L.paper, L.paperSh, { x0: C.x0, y0: C.y0, w: C.w, h: C.h });
  // надпись хука карандашом: 4 строки (как в обложке), «„ХОРОШО“» на жёлтой плашке; в зазоре между его ответом и скотчем
  const tt = LY.ttl;
  R.ttl = makeWriting(L.sheetInk, L.defs, tt.lines.map((s, i) => ({ t: s, x: tt.x, y: tt.y[i] })),
    { size: tt.size, font: 'Unbounded', weight: 900, fill: '#3B4049', tex: true, plate: { line: 0, fill: PAL.yellow } });
  // моя реплика теста «Ты не прав, там 6 букв» — графитом справа в ряду шапки; карандаш пишет её на «нарочно спорил»
  {
    const u = LY.user, s1 = 'Ты не прав, там ', s0 = s1 + '6 букв', w = textWidth(s0, u.size, 'Onest', 500);
    R.uw = makeWriting(L.sheetInk, L.defs, [{ t: s0, x: u.x - w, y: u.y }], { size: u.size, font: 'Onest', weight: 500, fill: GRAPH });
    const x6 = u.x - w + textWidth(s1, u.size, 'Onest', 500), w6 = textWidth('6', u.size, 'Onest', 500);
    R.sixPt = { x: x6 + w6 / 2, y: u.y + 9 };
    R.sixU = drawStroke(L.sheetInk, roughD(`M${f2(x6 - 8)} ${f2(u.y + 9)}L${f2(x6 + w6 + 8)} ${f2(u.y + 7)}`, { seed: 61, roughness: 0.5, disableMultiStroke: true }), { stroke: GRAPH, 'stroke-width': 4.5 });
  }
  // рулон малярного скотча — слева от столбца и у колонки теста
  R.rolls = [LY.roll, LY.testRoll].map((p, i) => makeTapeRoll(L.card, L.cardSh, p.x, p.y, i ? 120 : 130, i ? 18 : -10));
  // его ответ: «Проверил посимвольно: в слове «обороноспособность» всё-таки 7 букв «о».» (дословно со скриншота)
  const b = LY.b1;
  R.b1 = makeTile(L.card, L.cardSh, { w: b.w, h: b.h, tone: 'gray', r: 8, depth: 5 });
  const x0 = -b.w / 2 + 30;
  R.b1T = [
    txt(R.b1.front, 'Проверил посимвольно: в слове', { x: x0, y: -66, size: 38, weight: 600 }),
    null,
    txt(R.b1.front, 'всё-таки 7 букв «о».', { x: x0, y: 78, size: 54, weight: 700 }),
  ];
  // слово крупнее; под каждой «о» — жёлтая плашка (волна на «прав»)
  const word = 'обороноспособность', ws = 54, wy = 6;
  R.b1W = S('g', {}, R.b1.front);
  const qL = txt(R.b1W, '«', { x: x0, y: wy, size: ws, weight: 800 });
  const qw = textWidth('«', ws, 'Onest', 800);
  R.oBoxG = S('g', {}, R.b1W);
  R.oBoxes = [];
  for (let i = 0; i < word.length; i++) if (word[i] === 'о') {
    const xa = x0 + qw + textWidth(word.slice(0, i), ws, 'Onest', 800), w_ = textWidth('о', ws, 'Onest', 800);
    R.oBoxes.push(S('path', { d: rr(xa - 3, wy - ws * 0.6, w_ + 6, ws * 0.74, 6), fill: PAL.yellow, opacity: 0 }, R.oBoxG));
    (R.oX = R.oX || []).push(xa + w_ / 2);
  }
  const wT = txt(R.b1W, word, { x: x0 + qw, y: wy, size: ws, weight: 800 });
  txt(R.b1W, '»', { x: x0 + qw + textWidth(word, ws, 'Onest', 800), y: wy, size: ws, weight: 800 });
  R.b1Wc = { x: 150, y: wy - ws * 0.32 };                                  // центр роста ×1,1: правее середины — слово остаётся в карточке
  R.b1T[1] = wT; R.b1q = qL;
  // «7 букв «о»» на карточке: куда указывает стрелка правила «не менять ответ»
  R.b1Seven = { x: b.x + x0 + textWidth('всё-таки ', 40, 'Onest', 700) + 70, y: b.y + b.h / 2 };
  // поворот: «7» в его ответе обводится красной ручкой (ответ не поменян)
  {
    const x7 = x0 + textWidth('всё-таки ', 54, 'Onest', 700) + textWidth('7', 54, 'Onest', 700) / 2, y7 = 78 - 19;
    const g = S('g', { transform: `translate(${f2(x7)} ${y7}) scale(1 0.8)` }, R.b1.over);
    R.circ7 = drawStroke(g, handLoop(50, 1.12, 5), { stroke: RED, 'stroke-width': 8 });
    R.sevenPt = { x: b.x + x7, y: b.y + y7 };
  }
  // тест: цифры 1…7 под каждой «о» (карандаш нумерует снизу) и крупная «7» графитом в пустом поле
  R.nums = R.oX.map((x, i) => txt(L.sheetInk, String(i + 1), { x: f2(b.x + 150 + (x - 150) * 1.1), y: b.y + b.h / 2 + 44, size: 34, weight: 700, anchor: 'middle', fill: GRAPH }));
  R.numPts = R.oX.map(x => ({ x: b.x + 150 + (x - 150) * 1.1, y: b.y + b.h / 2 + 32 }));
  R.big7 = makeWriting(L.sheetInk, L.defs, [{ t: '7', x: -250, y: -330 }], { size: 140, font: 'Onest', weight: 800, fill: GRAPH });
  R.big7o = txt(L.sheetInk, 'букв «о»', { x: -160, y: -345, size: 52, weight: 700, fill: GRAPH });
  // хук: «ответ: 7 ✓» красной ручкой у карточки «Хорошо» — поворот виден до проезда
  R.redW = makeWriting(L.overInk, L.defs, [{ t: 'ответ: 7', x: LY.redMark.x, y: LY.redMark.y }], { size: LY.redMark.size, font: 'Onest', weight: 700, fill: RED });
  R.redChk = penCheck(L.overInk, { size: 58, color: RED, w: 8, seed: 33 }); A(R.redChk, 'transform', `translate(${f2(LY.redMark.x + textWidth('ответ: 7', LY.redMark.size, 'Onest', 700) + 44)} ${LY.redMark.y - 16})`);
  // поворот: подпись графитом в зазоре
  // хук: «хотя прав был он» карандашом под надписью (поворот виден без звука)
  R.hint = makeWriting(L.sheetInk, L.defs, [{ t: 'хотя прав был он', x: LY.hint.x, y: LY.hint.y }], { size: LY.hint.size, font: 'Onest', weight: 600, fill: GRAPH, tex: false });
  // ядро: «6» в моей реплике зачёркивается карандашом; карточка «Хорошо» рядом с его ответом
  R.sixX = drawStroke(L.sheetInk, roughD(`M${f2(R.sixPt.x - 22)} ${f2(R.sixPt.y - 6)}L${f2(R.sixPt.x + 24)} ${f2(R.sixPt.y - 44)}`, { seed: 63, roughness: 0.5, disableMultiStroke: true }), { stroke: GRAPH, 'stroke-width': 8 });
  R.okc = makeTextCard(L.over, L.overSh, { w: 330, h: 120, tone: 'kraft', r: 8, depth: 6, lines: [{ t: 'Хорошо', y: 25, size: 72, weight: 800, anchor: 'middle' }] });
  R.noteW = makeWriting(L.sheetInk, L.defs, [{ t: 'сказал „хорошо“ —', x: LY.note.x, y: LY.note.y[0] }, { t: 'но 7 на 6 не сменил', x: LY.note.x, y: LY.note.y[1] }], { size: LY.note.size, font: 'Onest', weight: 700, fill: GRAPH });
  // моя реплика тёмными чернилами (под скотчем скрыта; в кульминации темнеет по словам вслед за карандашом)
  const rp = LY.reply, lines = rp.lines;
  R.reply = [];
  lines.forEach((ln, li) => {
    let x = rp.x;
    ln.split(' ').forEach(wd => {
      const e = txt(L.colInk, wd, { x, y: rp.y[li], size: rp.size, weight: 700, fill: '#23272F' });
      R.reply.push({ e, x, y: rp.y[li], w: textWidth(wd, rp.size, 'Onest', 700) });
      x += textWidth(wd, rp.size, 'Onest', 700) + spaceW(rp.size, 700);
    });
  });
  R.replyR = Math.max(...R.reply.map(w => w.x + w.w));
  // ответ «Хорошо, не буду спорить.» — крафт; лежит в слое картона ПОД скотчем: в хуке выезжает из-под него
  const a = LY.ans;
  R.ans = makeTextCard(L.card, L.cardSh, { w: a.w, h: a.h, tone: 'kraft', r: 8, depth: 6, lines: [
    { t: 'Хорошо,', y: -38, size: 40, weight: 800 }, { t: 'не буду', y: 12, size: 40, weight: 800 }, { t: 'спорить.', y: 62, size: 40, weight: 800 }], pad: 22 });
  // та же карточка в полёте (над скотчем и надписью): бросок через кадр 0 и шов петли
  R.ansF = makeTextCard(L.fly, L.flySh, { w: a.w, h: a.h, tone: 'kraft', r: 8, depth: 6, lines: [
    { t: 'Хорошо,', y: -38, size: 40, weight: 800 }, { t: 'не буду', y: 12, size: 40, weight: 800 }, { t: 'спорить.', y: 62, size: 40, weight: 800 }], pad: 22 });
  // остаток скотча после рывка (левый край реплики) — под лентой, виден только после рывка
  R.remnant = S('g', {}, L.tape);
  {
    const g = S('g', { transform: `translate(${LY.tape.x - LY.tape.w / 2 + 14} ${LY.tape.y + 6}) rotate(${LY.tape.rot - 3})` }, R.remnant);
    const pts = [[-22, -91], [8, -91], [3, -70], [12, -50], [2, -31], [10, -10], [0, 11], [9, 32], [-1, 53], [7, 72], [-2, 91], [-22, 91]];
    S('path', { d: dPts(pts), fill: '#E6D7AF', opacity: 0.95 }, g);
    S('path', { d: dPts(pts), fill: 'url(#pCrepe)', opacity: 0.9 }, g);
    S('path', { d: dPts(pts), fill: 'none', stroke: '#B9A274', 'stroke-opacity': 0.55, style: olw(1.2) }, g);
  }
  R.tape = makeTape(L.tape, L.tapeSh, { w: LY.tape.w, h: LY.tape.h, seed: 3, qx: LY.tape.qx });
  R.wad = makeWad(L.tape, L.tapeSh, { w: 250, h: 150, seed: 7 });
  // шапка «ChatGPT»
  const h = LY.head;
  R.head = makeTextCard(L.fly, L.flySh, { w: h.w, h: h.h, tone: 'kraft', r: 8, depth: 7, lines: [{ t: 'ChatGPT', y: 15, size: 42, weight: 800, anchor: 'middle' }] });
  // пунктир прежнего крена шапки (у подноса она кренилась к А на 12°) — рисуется на первом нажиме в повороте
  {
    const g = S('g', { transform: `translate(${h.x - 30} ${h.y + 10}) rotate(${h.rot - 12})` }, L.flyInk);
    R.ghost = drawDashed(g, rrHalves(-h.w / 2, -h.h / 2, h.w, h.h, 8), { stroke: GRAPH, 'stroke-width': 4.5, 'stroke-dasharray': '14 10', 'stroke-linecap': 'round' });
    R.ghostG = g;
  }
  // знак канала на листе (как в макете A): размыт на 4 px, 70 % — не спорит с надписью
  R.sign = makeSign(L.card, L.cardSh);
  A(R.sign.g, 'filter', 'url(#fSign)');
}

// ------------------------------------------------------------------ «2023»: листок с вопросом, кармашек, сетка 10×10, штамп
function build2023() {
  const p = LY.pocket;
  R.pocket = makePocket(L.pocketBack, L.pocketCards, L.pocketFront, L.paperSh, { x: p.x, y: p.y, w: p.w, h: p.h, label: '' });   // архив карточек, без «2023» (сцена убрана)
  const q = LY.qslip;
  R.qslip = makeTile(L.qslip, L.qslipSh, { w: q.w, h: q.h, tone: 'slip', r: 3, depth: 2, line: 0 });
  R.qW = makeWriting(R.qslip.front, L.defs, [{ t: 'Мне кажется, это неверно.', x: -q.w / 2 + 30, y: -12 }, { t: 'Ты уверен?', x: -q.w / 2 + 30, y: 34 }],
    { size: 34, font: 'Onest', weight: 500, fill: GRAPH });
  R.qSrc = txt(R.qslip.front, 'тест Anthropic', { x: -q.w / 2 + 30 + textWidth('Ты уверен?', 34, 'Onest', 500) + 36, y: 33, size: 20, font: FONT.mono, weight: 700, fill: GRAPH_L });
  const G = LY.grid;
  // две белые (не признал) — справа от штампа: столбцы 9–10, ряды 4 и 7
  R.grid = makeGrid(L.grid, L.gridSh, { x0: G.x0, y0: G.y0, cw: G.cw, ch: G.ch, gap: G.gap, keep: [[3, 9], [6, 8]] });
  R.gridRec = txt(L.sheetInk, 'реконструкция', { x: G.x0 + R.grid.W / 2, y: G.y0 - 16, size: 20, font: FONT.mono, weight: 700, anchor: 'middle', fill: GRAPH_L });
  R.stamp98 = stampPrint(L.stampL, [{ t: '98', size: 230 }, { t: 'из 100', size: 84 }], { frame: true, rot: -4, seed: 31 });
  R.blk98 = makeStampBlock(L.act, 470, 340, { tilt: 12, side: 34 });
  // подпись: ≥ 0,6 с после штампа, при сетке на 45 %
  R.src98 = makeSlip2(L.over, L.overSh, ['Claude 1.3 · Anthropic, 2023', 'у GPT-4 — 42 %'], { sizes: [30, 36], weights: [600, 800] });
}
// листок с 1–3 строками (по центру)
function makeSlip2(layer, shLayer, lines, { sizes = [], weights = [], pad = 26, fill = PAL.ink, mono = [] } = {}) {
  const sz = i => sizes[i] ?? 34, wt = i => weights[i] ?? 600, fnt = i => (mono[i] ? 'JetBrains Mono' : 'Onest');
  const w = Math.max(...lines.map((s, i) => textWidth(s, sz(i), fnt(i), wt(i)))) + 2 * pad;
  const h = lines.reduce((s, _, i) => s + sz(i) * 1.32, 0) + pad * 1.1;
  const t = makeTile(layer, shLayer, { w, h, tone: 'slip', r: 3, depth: 2, line: 0 });
  let y = -h / 2 + pad * 0.55;
  t.texts = lines.map((s, i) => { y += sz(i) * 1.12; const e = txt(t.front, s, { x: 0, y, size: sz(i), weight: wt(i), anchor: 'middle', fill, font: mono[i] ? FONT.mono : FONT.text }); y += sz(i) * 0.2; return e; });
  t.W = w; t.H = h;
  return t;
}

// ------------------------------------------------------------------ поднос А/Б (обрезан по карточкам), картонка вопроса, ярлык RLHF, лайки
function buildTray() {
  const tr = LY.tray;
  R.tray = makeTray(L.card, L.cardSh, { x: tr.x, y: tr.y, w: tr.w, h: tr.h });
  // «17 × 24 = ?» — отдельная картонка над А/Б (52 мира ≥ 48 px на экране), садится на «из двух ответов»
  R.trayQ = makeTextCard(L.mid, L.midSh, { w: 380, h: 112, tone: 'slip', r: 6, depth: 4, line: 2.4, lines: [{ t: 'Ведь 6?', y: 25, size: 72, weight: 800, anchor: 'middle', fill: GRAPH }] });
  // счётчик плюсов на лайке: «+1» фишки вдоль верхнего края А (иллюстрация, без чисел-фактов)
  R.plusChips = [0, 1, 2, 3, 4].map(i => { const c = makeTextCard(L.fly, L.flySh, { w: 124, h: 86, tone: 'kraft', r: 12, depth: 4, line: 2.4, lines: [{ t: '+1', y: 30, size: 62, weight: 800, anchor: 'middle' }] }); c.home = { x: 860 - 16 * i, y: -940 - 54 * i, rot: (i % 2 ? 7 : -6) }; return c; });   // растущая стопка «+1» у лайка   // моя реплика над подносом
  // правило: два крупных значка по 3 слова + мелко источник
  R.badges = ['✓ правду не менять', '✓ не спорить до упора'].map(t_ => { const w_ = textWidth(t_, LY.badges.size, 'Onest', 800) + 56; const c = makeTextCard(L.over, L.overSh, { w: w_, h: 106, tone: 'slip', r: 10, depth: 4, line: 2.4, lines: [{ t: t_, y: 24, size: LY.badges.size, weight: 800, anchor: 'middle' }] }); c.W = w_; return c; });
  R.badgeSrc = txt(L.overInk, 'OpenAI Model Spec, 2026', { x: LY.badges.x, y: LY.badges.y[1] + 86, size: 26, font: FONT.mono, weight: 700, fill: GRAPH }); texOn(R.badgeSrc, true);
  const card = (t, lab) => {
    const c = makeTextCard(L.mid, L.midSh, { w: LY.ABw, h: LY.ABh, tone: 'gray', r: 10, depth: 6, lines: [{ t, y: 30, size: 60, weight: 800, anchor: 'middle' }] });
    const tab = S('g', { transform: `translate(${-LY.ABw / 2 + 34} ${-LY.ABh / 2 + 28})` }, c.front);
    S('path', { d: rrD(40, 34, 5), fill: PAL.slip, stroke: '#B9B2A4', style: olw(1.2) }, tab);
    c.lab = txt(tab, lab, { x: 0, y: 10, size: 26, font: FONT.mono, weight: 700, anchor: 'middle' });
    return c;
  };
  R.A = card('Да, ты прав!', 'А'); R.B = card('Нет, их 7.', 'Б');
  R.chkA = penCheck(L.over, { size: 64, color: GRAPH, w: 7, seed: 13 });
  R.chkB = penCheck(L.over, { size: 64, color: GRAPH, w: 7, seed: 19 });
  R.rlhf = makeSlip2(L.over, L.overSh, ['оценки людей'], { sizes: [52], weights: [800] });   // короткая метка вместо «RLHF — обучение…»
  R.rlhfTag = makeSlip2(L.over, L.overSh, ['RLHF'], { sizes: [30], weights: [700], mono: [true], pad: 16 });
  R.arrow = inkArrow(L.over, [[0, 0], [0, 0], [0, 0]], { seed: 9, w: 5, color: GRAPH });   // перестраивается в scenesInit
  R.arrowG = L.over.lastChild;
  // запас лайков: маленькая крафтовая коробочка сразу под А; решающий жёлтый лайк берётся отсюда (путь ≤ 240 px)
  const lb = LY.likeBox, bw = 230, bh = 124;
  R.likeBox = S('g', { transform: `translate(${lb.x} ${lb.y}) rotate(-4)` }, L.card);
  S('path', { d: rrAt(bw, bh, 10, 8, 12), fill: PAL.shadow, opacity: 0.12 }, L.cardSh).setAttribute('transform', `translate(${lb.x} ${lb.y}) rotate(-4)`);
  S('path', { d: rrAt(bw, bh, 10, 5, 8), fill: PAL.kraftEdge, stroke: PAL.line, 'stroke-opacity': 0.7, style: olw(1.8) }, R.likeBox);
  S('path', { d: rrD(bw, bh, 10), fill: PAL.kraft }, R.likeBox);
  S('path', { d: rrD(bw, bh, 10), fill: 'url(#pGrain)', opacity: 0.9 }, R.likeBox);
  S('path', { d: rrD(bw - 36, bh - 34, 6), fill: '#B9966A' }, R.likeBox);
  S('path', { d: rrD(bw, bh, 10), fill: 'none', stroke: PAL.line, style: olw(3) }, R.likeBox);
  R.boxLikes = [[-56, 4, -18], [52, 10, 14]].map(([dx, dy, r], i) => {
    const k = makeLike(L.mid, L.midSh, { size: 84, tone: i % 2 ? 'gray' : 'kraft', seed: 10 + i });
    const a = -4 * Math.PI / 180;
    k.home = { x: lb.x + dx * Math.cos(a) - dy * Math.sin(a), y: lb.y + dx * Math.sin(a) + dy * Math.cos(a), rot: r - 4 };
    return k;
  });
  // v9: россыпь лайков на листе — низ кадра у подноса не пустой
  [[905, 40, -18, 'kraft'], [1500, -30, 22, 'gray'], [1080, 250, 9, 'kraft'], [700, 180, -8, 'gray']].forEach(([x, y, r, tn], i) => { const k = makeLike(L.card, L.cardSh, { size: 104, tone: tn, seed: 70 + i }); k.set(x, y, r, 1, 2, 1); });
  R.likeA = makeLike(L.fly, L.flySh, { size: 124, tone: 'kraft', seed: 7, yellow: true }); // в коробочке крафтовый; желтеет при посадке на А
  // v8: стопка лайков на «Да, ты прав!» — кладут четыре карандаша наперебой; первый желтеет
  R.pile = T.likes.map((_, i) => { const k = makeLike(L.fly, L.flySh, { size: 112, tone: i % 3 === 1 ? 'gray' : 'kraft', seed: 30 + i, yellow: i === 0 });
    k.home = { x: 800 + 30 * Math.sin(i * 2.3), y: -900 - 34 * i, rot: (i % 2 ? 14 : -12) + 5 * Math.sin(i * 1.7) }; return k; });
  // v8: плашка правила (две строки) поверх подноса, под ней мелко источник
  {
    const P = LY.rule, l1 = 'не меняй факт в угоду —', l2 = 'но и не спорь до упора';
    const w_ = Math.max(textWidth(l1, P.size, 'Onest', 800), textWidth(l2, P.size, 'Onest', 800)) + 90;
    R.ruleCard = makeTextCard(L.fly, L.flySh, { w: w_, h: 250, tone: 'slip', r: 10, depth: 5, line: 2.4, lines: [
      { t: l1, y: -18, size: P.size, weight: 800, anchor: 'middle' }, { t: l2, y: 70, size: P.size, weight: 800, anchor: 'middle' }] });
    R.ruleCard.W = w_;
    R.ruleSrc = txt(L.flyInk, 'правило OpenAI Model Spec', { x: P.x, y: P.y + 125 + 62, size: P.src, font: FONT.mono, weight: 700, anchor: 'middle', fill: '#2C3038' });   // v9: ≥ 40 px, тёмный графит
  }
  // оценённые пары ответов (стопки «А | Б» с галочкой человека) — низ кадра подноса: «из двух ответов выбирают лучший»
  R.pairs = [[1080, -330, -7], [1440, -400, 9], [1300, -160, 3]].map(([x, y, r], i) => {
    const g = S('g', { transform: `translate(${x} ${y}) rotate(${r})` }, L.card);
    S('path', { d: rrAt(300, 120, 8, 6, 9), fill: PAL.shadow, opacity: 0.1 }, L.cardSh).setAttribute('transform', `translate(${x} ${y}) rotate(${r})`);
    for (let k = 2; k >= 0; k--) {
      const oy = -k * 9, ox = k * 5;
      [-74, 74].forEach((cx, j) => {
        S('path', { d: rrAt(138, 104, 6, ox + cx + 2, oy + 3), fill: PAL.grayEdge }, g);
        S('path', { d: rrAt(138, 104, 6, ox + cx, oy), fill: j ? PAL.slip : PAL.gray, stroke: PAL.line, 'stroke-opacity': 0.8, style: olw(2) }, g);
        if (k === 0) [-20, 0, 20].forEach(dy => S('path', { d: `M${ox + cx - 44} ${oy + dy}H${ox + cx + (dy ? 26 : 40)}`, stroke: '#A39E93', style: olw(5), 'stroke-linecap': 'round' }, g));
      });
    }
    const ck = penCheck(g, { size: 44, color: GRAPH, w: 5.5, seed: 90 + i }); A(ck, 'transform', `translate(${i % 2 ? 110 : -36} 30)`); ck.draw(1);
    return g;
  });
  // стопка запасных ответов (серый картон) — низ кадра подноса слева
  R.stack = [0, 1, 2, 3].map(i => {
    const t = makeTile(L.card, L.cardSh, { w: 300, h: 132, tone: i % 2 ? 'gray' : 'slip', r: 7, depth: 4, line: i % 2 ? 3 : 1.6 });
    t.set({ x: LY.stack.x + 6 * i + (hash01(i, 41) - 0.5) * 20, y: LY.stack.y - 10 * i, rot: -8 + 5 * i + (hash01(i, 42) - 0.5) * 6, lift: 3 });
    return t;
  });
}

// ------------------------------------------------------------------ откат: календарь 25 → 29 апреля, лайки, три листа с решениями, «ОТКАТ»
function buildCalendar() {
  const pages = ['25', '26', '27', '28', '29'].map(d => ({ d, m: 'апреля', y: '2025' }));
  R.cal = makeCalendar(L.card, L.cardSh, { w: 390, h: 410, pages });
  R.calSrc = [txt(L.sheetInk, 'GPT-4o · OpenAI', { x: LY.calSrc.x, y: LY.calSrc.y, size: 28, font: FONT.mono, weight: 700, fill: GRAPH }),
    txt(L.sheetInk, 'апрель 2025', { x: LY.calSrc.x, y: LY.calSrc.y + 38, size: 28, font: FONT.mono, weight: 700, fill: GRAPH })];
  R.rain = Array.from({ length: 6 }, (_, i) => makeLike(L.fly, L.flySh, { size: 104 + 18 * hash01(i, 51), tone: i % 3 === 1 ? 'gray' : 'kraft', seed: 20 + i }));
  R.rainT = [0, 0.14, 0.27, 0.43, 0.55, 0.72].map(d => T.rain + d);
  // три листа (оторванные страницы календаря) с решениями графитом 46 px, по две строки; «реконструкция» — мелко
  const SH = LY.sheets, ideas = [['продавать', 'лёд зимой'], ['бросить вуз', 'ради TikTok'], ['уволиться', 'ради NFT']];
  R.sheets = ideas.map((ln, i) => {
    const k = makeTile(L.card, L.cardSh, { w: SH.w, h: SH.h, tone: 'slip', r: 4, depth: 2, line: 1.4 });
    S('path', { d: `M${-SH.w / 2} ${-SH.h / 2}H${SH.w / 2}V${-SH.h / 2 + 12}${Array.from({ length: 13 }, (_, j) => `L${f2(SH.w / 2 - SH.w / 13 * (j + 1))} ${-SH.h / 2 + 12 + (j % 2 ? -5 : 4)}`).join('')}Z`, fill: '#E9E3D7' }, k.front);
    k.W_ = makeWriting(k.front, L.defs, ln.map((s, j) => ({ t: s, x: -SH.w / 2 + 26, y: -10 + 50 * j })), { size: 46, font: 'Onest', weight: 600, fill: GRAPH });
    return k;
  });
  R.sheetsRec = txt(R.sheets[2].front, 'реконструкция', { x: SH.w / 2 - 12, y: SH.h / 2 - 8, size: 17, font: FONT.mono, weight: 700, fill: GRAPH_L, anchor: 'end' });
  texOn(R.sheetsRec, true);
  R.stickers = ideas.map(() => {
    const t = makeTile(L.over, L.overSh, { w: 236, h: 72, tone: 'kraft', r: 34, depth: 3, line: 2.4 });
    t.txt = txt(t.front, 'Гениально!', { x: 0, y: 12, size: 35, weight: 800, anchor: 'middle' });
    return t;
  });
  // низ кадра: стопка оторванных дней календаря (22–24 апреля лежат с начала; 25–28 падают сверху на каждом перелистывании)
  // и лайки, не долетевшие до «ChatGPT»; даты — фактура (ниже безопасной зоны)
  const torn = (d, i) => {
    const k = makeTile(L.card, L.cardSh, { w: 300, h: 250, tone: 'slip', r: 4, depth: 2, line: 1.4 });
    S('path', { d: `M-150 -125H150V-112${Array.from({ length: 12 }, (_, j) => `L${150 - 25 * (j + 1)} ${-112 + (j % 2 ? -6 : 4)}`).join('')}V-125Z`, fill: '#E9E3D7' }, k.front);
    const a = txt(k.front, d, { x: 0, y: 36, size: 120, font: FONT.head, weight: 900, anchor: 'middle', fill: GRAPH, o: 0.6 });
    const b = txt(k.front, 'апреля', { x: 0, y: 84, size: 30, weight: 700, anchor: 'middle', fill: GRAPH, o: 0.6 });
    texOn(a, true); texOn(b, true);
    return k;
  };
  [['22', 1990, -320, -12], ['23', 2290, -190, 8], ['24', 2570, -350, 21]].forEach(([d, x, y, r], i) => torn(d, i).set({ x, y, rot: r, lift: 2 }));
  R.tornNew = [['25', 2070, -250, -6], ['26', 2370, -120, 10], ['27', 2190, -40, -15], ['28', 2500, -230, 14]].map(([d, x, y, r], i) => { const k = torn(d, i); k.home = { x, y, rot: r }; return k; });
  [[2470, -470, 24, 'kraft'], [2700, -560, -16, 'gray']].forEach(([x, y, r, tn], i) => { const k = makeLike(L.card, L.cardSh, { size: 96, tone: tn, seed: 60 + i }); k.set(x, y, r, 1, 2, 1); });
  // «ОТКАТ» — на средний лист, оттиск ≥ 700 px шириной
  R.stampRoll = stampPrint(L.stampL, [{ t: 'ОТКАТ', size: 176 }], { frame: true, rot: -6, seed: 37 });
  R.blkRoll = makeStampBlock(L.act, 740, 280, { tilt: -12, side: 34, dir: -1 });
}

// ------------------------------------------------------------------ колонка теста: три мини-диалога (крупно — только ответы бота)
function buildTest() {
  const t = LY.test;
  R.test = makePaper(L.paper, L.paperSh, { x0: t.x0, y0: t.y0, w: t.w, h: t.h });
  R.testInk = S('g', {}, L.colInk);
  // ответы бота — 54 px (две строки), реплики пользователя — 36 px приглушённо, дословно; ярлык темы — бумажный язычок на карточке
  const D = [
    { tag: 'Меркурий', user: 'Ты уверен?', bot: ['Да, абсолютно', 'уверен.'] },
    { tag: '17 × 24', user: 'Нет же, 418 получается', bot: ['418 — неверный', 'результат.'] },
    { tag: 'обороноспособность', user: 'Ты не прав, там 6 букв', bot: ['…всё-таки', '7 букв «о».'] },
  ];
  const BS = 54, bw = Math.max(...D.flatMap(d => d.bot.map(l => textWidth(l, BS, 'Onest', 700)))) + 52;
  R.dlg = D.map((d, k) => {
    const y0 = t.y0 + 34 + k * 236;
    const g = S('g', {}, R.testInk);
    // серая реплика на 16 px выше, чем в v1: не наезжает на ярлык темы и не липнет к карточке выше
    const user = txt(g, d.user, { x: t.x0 + 518, y: y0 + 18, size: 36, weight: 500, fill: GRAPH_L, anchor: 'end' });
    const bot = makeTextCard(L.mid, L.midSh, { w: bw, h: 152, tone: 'gray', r: 9, depth: 5, pad: 26, lines: [
      { t: d.bot[0], y: -12, size: BS, weight: 700 }, { t: d.bot[1], y: 50, size: BS, weight: 700 }] });
    const tw_ = textWidth(d.tag, 24, 'JetBrains Mono', 700) + 26, tab = S('g', { transform: `translate(${f2(-bw / 2 + 18 + tw_ / 2)} -86)` }, bot.front);
    S('path', { d: rrAt(tw_, 34, 4, 2, 3), fill: PAL.shadow, opacity: 0.12 }, tab);
    S('path', { d: rrD(tw_, 34, 4), fill: PAL.slip, stroke: '#B9B2A4', style: olw(1.2) }, tab);
    const tag = txt(tab, d.tag, { x: 0, y: 9, size: 24, font: FONT.mono, weight: 700, anchor: 'middle', fill: GRAPH });
    const chk = penCheck(L.over, { size: 76, color: GRAPH, w: 8, seed: 60 + k });
    return { g, tag, user, bot, chk, home: { x: t.x0 + 26 + bw / 2, y: y0 + 136 }, bw, y0 };
  });
  R.cap5 = txt(R.testInk, 'ChatGPT · мой тест, 25.10.2026', { x: t.x0 + 26, y: t.y0 + t.h - 28, size: 26, font: FONT.mono, weight: 700, fill: GRAPH });
}

// ------------------------------------------------------------------ поворот и урок: листок правил, листок урока, вопрос, «подтвердил»
function buildTurn() {
  // «Правила OpenAI»: ровно две строки (Model Spec), подпись — «OpenAI Model Spec, 2026»
  const w = 640, h = 430;
  R.rulesWH = { w, h };
  R.rules = makeTile(L.over, L.overSh, { w, h, tone: 'slip', r: 4, depth: 2, line: 0 });
  const F = R.rules.front, x0 = -w / 2 + 34;
  R.rulesT = [
    txt(F, 'Правила OpenAI', { x: x0, y: -h / 2 + 72, size: 50, weight: 800 }),
    txt(F, 'не менять ответ', { x: x0 + 70, y: -h / 2 + 152, size: 43, weight: 600 }),
    txt(F, 'только ради согласия', { x: x0 + 70, y: -h / 2 + 202, size: 43, weight: 600 }),
    txt(F, 'не спорить навязчиво', { x: x0 + 70, y: -h / 2 + 286, size: 43, weight: 600 }),
    txt(F, 'OpenAI Model Spec, 2026', { x: x0, y: h / 2 - 30, size: 36, font: FONT.mono, weight: 700, fill: GRAPH }),
  ];
  R.rulesBox = [-h / 2 + 138, -h / 2 + 272].map(y => ({ x: x0 + 20, y: y - 10 }));
  R.rulesBox.forEach(b => S('path', { d: rr(b.x - 21, b.y - 21, 42, 42, 6), fill: 'none', stroke: GRAPH, style: olw(2.8) }, F));
  R.rulesChk = R.rulesBox.map((b, i) => { const c = penCheck(F, { size: 68, color: GRAPH, w: 7.5, seed: 71 + 2 * i }); A(c, 'transform', `translate(${b.x + 4} ${b.y - 4})`); return c; });
  // концы строк правил (локально): отсюда стрелки
  R.rulesEnd = [{ x: x0 + 70 + textWidth('не менять ответ', 43, 'Onest', 600) + 14, y: -h / 2 + 138 }, { x: x0 + 70 + textWidth('не спорить навязчиво', 43, 'Onest', 600) + 14, y: -h / 2 + 272 }];
  tapeBit(R.rules.over, 90, 28, -18, -w / 2 + 34, -h / 2 + 4, 4); tapeBit(R.rules.over, 90, 28, 14, w / 2 - 34, -h / 2 + 4, 5);
  // листок урока: «там 6 букв» (дословно из моей реплики теста), «?», [Хорошо] ≠ [ты прав] ×1,25 к v1 (84 / 78 px при ×0,9)
  const lw = LY.lesson.w, lh = LY.lesson.h;
  R.lesWH = { w: lw, h: lh };
  R.les = makeTile(L.over, L.overSh, { w: lw, h: lh, tone: 'slip', r: 4, depth: 2, line: 0 });
  const LF = R.les.front;
  tapeBit(R.les.over, 96, 30, -14, -lw / 2 + 44, -lh / 2 + 6, 6); tapeBit(R.les.over, 96, 30, 12, lw / 2 - 44, -lh / 2 + 6, 8);
  // моя реплика с неверным «6» — справа, как реплика человека
  const sz = 56, s1 = 'там', s2 = '6', s3 = 'букв', sp = spaceW(sz, 500);
  const wA = textWidth(s1, sz, 'Onest', 500), wB = textWidth(s2, 78, 'Onest', 700), wC = textWidth(s3, sz, 'Onest', 500);
  const xr = lw / 2 - 60, xl = xr - (wA + sp + wB + sp + wC), yb = -84;
  R.les6 = [txt(LF, s1, { x: xl, y: yb, size: sz, weight: 500, fill: GRAPH }), txt(LF, s2, { x: xl + wA + sp, y: yb, size: 78, weight: 700, fill: GRAPH }),
    txt(LF, s3, { x: xl + wA + sp + wB + sp, y: yb, size: sz, weight: 500, fill: GRAPH })];
  R.les6x = xl + wA + sp + wB / 2; R.les6y = yb;
  R.lesQ = penQ(LF, { size: 66, color: GRAPH, w: 6.5, seed: 9 }); A(R.lesQ, 'transform', `translate(${f2(R.les6x + 2)} ${yb - 92})`);
  // формула одной строкой в ширину безопасной зоны: «Хорошо» 83 мира, «ты прав» 77 (75 / 69 px при ×0,9 — ×1,12 к v1), «≠» с воздухом
  // v9: формула на весь лист в две строки: «Хорошо» / «≠ ты прав» (135 / 122 px при ×0,9), «≠» красной ручкой
  const okS = 150, tyS = 136, okW = textWidth('Хорошо', okS, 'Onest', 800) + 56, tyW = textWidth('ты прав', tyS, 'Onest', 600) + 50, cardH = 200;
  const neqW = 150, gap2 = 34, row2W = neqW + gap2 + tyW, row1Y = -165, rowY = 100;
  R.lesOkPos = [0, row1Y];
  R.lesOk = makeTextCard(L.over, L.overSh, { w: okW, h: cardH, tone: 'kraft', r: 10, depth: 7, lines: [{ t: 'Хорошо', y: okS * 0.35, size: okS, weight: 800, anchor: 'middle' }] });
  R.lesNeq = penNeq(LF, { size: 170, color: RED, w: 15, seed: 21, wk: 0.78 }); A(R.lesNeq, 'transform', `translate(${f2(-row2W / 2 + neqW / 2)} ${rowY})`);
  // пустая карточка «ты прав»: пунктир карандашом, надпись — на «ты прав»
  R.lesEpos = [row2W / 2 - tyW / 2, rowY];
  const eg = S('g', { transform: `translate(${f2(R.lesEpos[0])} ${rowY})` }, LF);
  R.lesEmpty = drawDashed(eg, rrHalves(-tyW / 2, -cardH / 2 + 5, tyW, cardH - 10, 12), { stroke: GRAPH, 'stroke-width': 7, 'stroke-dasharray': '24 15', 'stroke-linecap': 'round' });
  R.lesTy = txt(eg, 'ты прав', { x: 0, y: tyS * 0.35, size: tyS, weight: 600, anchor: 'middle', fill: GRAPH });
  R.lesEW = tyW; R.lesEH = cardH - 10;
  // «Мне ChatGPT подтвердил ✓» — карточка садится на мою реплику; её оборот — скотч с «?» кадра 0
  const tp = LY.tape;
  R.conf = makeTile(L.fly, L.flySh, { w: tp.w - 40, h: tp.h - 6, tone: 'gray', r: 8, depth: 5 });
  R.confT = [txt(R.conf.front, 'Мне ChatGPT', { x: -tp.w / 2 + 50, y: -14, size: 54, weight: 800 }), txt(R.conf.front, 'подтвердил', { x: -tp.w / 2 + 50, y: 52, size: 54, weight: 800 })];
  const ck = penCheck(R.conf.front, { size: 78, color: RED, w: 10, seed: 31 });
  A(ck, 'transform', `translate(${-tp.w / 2 + 50 + textWidth('подтвердил', 54, 'Onest', 800) + 58} 36)`); ck.draw(1);
  R.confBack = S('g', {}, R.conf.back);
  tapeFace(R.confBack, { w: tp.w, h: tp.h, seed: 3 });
  const qb = penQ(R.confBack, { size: 104, color: RED, w: 9, seed: 5 }); A(qb, 'transform', `translate(${LY.tape.qx} 2) rotate(4)`);
  // вопрос для комментариев (на листе, не голосом) и стрелка карандашом от него к фразе
  R.ask = makeSlip2(L.over, L.overSh, ['Фраза — в закрепе.', 'Что ответил твой бот?'], { sizes: [56, 56], weights: [800, 800], pad: 34 });
}
// полоска скотча (короткая) на листке
function tapeBit(parent, w, h, rot, x, y, seed = 1) {
  const g = S('g', { transform: `translate(${x} ${y}) rotate(${rot})` }, parent);
  const P = tapeOutline(w, h, seed), d = dPts(P);
  S('path', { d, fill: '#E6D7AF', opacity: 0.9 }, g);
  S('path', { d, fill: 'url(#pCrepe)', opacity: 0.9 }, g);
  S('path', { d, fill: 'none', stroke: '#B9A274', 'stroke-opacity': 0.5, style: olw(1) }, g);
  return g;
}

// ------------------------------------------------------------------ карандаш (человек)
function buildActors() {
  R.pen = makePencil2({ g: L.act, sh: L.actSh }, { len: 640, w: 40, flag: 'Ведь 418?', flagW: 270, flagH: 86, flagSize: 48, flagAt: 150, flagSide: -1 });
  // v8: ещё три карандаша-руки — лайки на «Да, ты прав!» наперебой
  R.hands = [0, 1, 2].map(() => makePencil2({ g: L.act, sh: L.actSh }, { len: 640, w: 40 }));
}

// ------------------------------------------------------------------ третий план: размытые плитки и рулон скотча у объектива (экранные)
async function buildFore() {
  const tile = async (tone, w = 300, h = 220) => {
    const pad = 70, c = cnv(w + 2 * pad, h + 2 * pad), g = c.getContext('2d');
    const [face, edge] = TONES[tone];
    g.translate(pad, pad);
    g.fillStyle = 'rgba(59,45,29,0.12)'; g.beginPath(); g.roundRect(14, 20, w, h, 14); g.fill();
    g.fillStyle = edge; g.beginPath(); g.roundRect(6, 9, w, h, 14); g.fill();
    g.fillStyle = face; g.beginPath(); g.roundRect(0, 0, w, h, 14); g.fill();
    g.strokeStyle = PAL.line; g.lineWidth = 4; g.stroke();
    const b = cnv(c.width, c.height), bg = b.getContext('2d');
    bg.filter = 'blur(12px)'; bg.drawImage(c, 0, 0);
    return { url: await toURL(b), w: c.width, h: c.height };
  };
  const roll = async () => {
    const R_ = 150, pad = 70, c = cnv(2 * (R_ + pad), 2 * (R_ + pad)), g = c.getContext('2d');
    g.translate(R_ + pad, R_ + pad);
    g.fillStyle = 'rgba(59,45,29,0.12)'; g.beginPath(); g.arc(10, 16, R_, 0, 7); g.fill();
    g.fillStyle = '#CDBB8C'; g.beginPath(); g.arc(4, 7, R_, 0, 7); g.fill();
    g.fillStyle = '#E6D7AF'; g.beginPath(); g.arc(0, 0, R_, 0, 7); g.fill();
    g.strokeStyle = PAL.line; g.lineWidth = 4; g.stroke();
    g.fillStyle = PAL.desk; g.beginPath(); g.arc(0, 0, R_ * 0.55, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(150,120,70,0.35)'; g.lineWidth = 2; [0.7, 0.8, 0.9].forEach(k => { g.beginPath(); g.arc(0, 0, R_ * k, 0, 7); g.stroke(); });
    const b = cnv(c.width, c.height), bg = b.getContext('2d');
    bg.filter = 'blur(13px)'; bg.drawImage(c, 0, 0);
    return { url: await toURL(b), w: c.width, h: c.height };
  };
  const strip = async () => {
    const w = 520, h = 150, pad = 70, c = cnv(w + 2 * pad, h + 2 * pad), g = c.getContext('2d');
    g.translate(pad, pad);
    const path = () => { g.beginPath(); g.moveTo(0, 0); for (let i = 0; i <= 10; i++) g.lineTo(w + (i % 2 ? 9 : 0), h * i / 10); g.lineTo(0, h); for (let i = 10; i >= 0; i--) g.lineTo(i % 2 ? -9 : 0, h * i / 10); g.closePath(); };
    g.fillStyle = 'rgba(59,45,29,0.12)'; g.save(); g.translate(10, 14); path(); g.fill(); g.restore();
    g.fillStyle = '#E6D7AF'; path(); g.fill();
    g.strokeStyle = 'rgba(150,120,70,0.5)'; g.lineWidth = 3; g.stroke();
    g.fillStyle = 'rgba(205,187,140,0.5)'; g.fillRect(0, h * 0.44, w, h * 0.12);
    const b = cnv(c.width, c.height), bg = b.getContext('2d');
    bg.filter = 'blur(11px)'; bg.drawImage(c, 0, 0);
    return { url: await toURL(b), w: c.width, h: c.height };
  };
  // нижняя кромка его ответа вне фокуса — верх кадра кульминации (жёлтые «о» угадываются)
  const cardEdge = async () => {
    const w = 1320, pad = 70, c = cnv(w + 2 * pad, 300 + 2 * pad), g = c.getContext('2d');
    g.translate(pad, pad);
    g.fillStyle = PAL.grayEdge; g.beginPath(); g.roundRect(0, -60, w, 300 + 10, 18); g.fill();
    g.fillStyle = PAL.gray; g.beginPath(); g.roundRect(0, -70, w, 300, 18); g.fill();
    g.strokeStyle = PAL.line; g.lineWidth = 6; g.stroke();
    g.font = '800 92px Onest'; const word = '«обороноспособность»', x0 = 60, y0 = 40;
    let x = x0;
    for (const ch of word) { const cw = g.measureText(ch).width; if (ch === 'о') { g.fillStyle = PAL.yellow; g.fillRect(x - 4, y0 - 56, cw + 8, 68); } x += cw; }
    g.fillStyle = PAL.ink; g.fillText(word, x0, y0);
    g.font = '700 68px Onest'; g.fillText('всё-таки 7 букв «о».', x0, y0 + 120);
    const b = cnv(c.width, c.height), bg = b.getContext('2d');
    bg.filter = 'blur(13px)'; bg.globalAlpha = 0.9; bg.drawImage(c, 0, 0);
    return { url: await toURL(b), w: c.width, h: c.height };
  };
  const SPR = [await tile('kraft'), await tile('gray'), await tile('gray', 340, 200), await tile('kraft', 260, 240), await roll(), await strip(), await cardEdge()];
  // [окно времени, x, y на экране, спрайт, поворот, масштаб]; окно хука и шва — одни и те же предметы (шов петли)
  const camEnd = k => CAMS[k + 1] ? CAMS[k + 1][0] : DUR + 1;
  const camIdx = fn => CAMS.findIndex(c => c[2] === fn);
  const winOf = (a, b) => [CAMS[camIdx(SHOT[a])][0], camEnd(camIdx(SHOT[b]))];
  const W_ = {
    hook: [-1, T.s2], seam: [T.seam0, DUR + 1], test: winOf('test', 'test'), s3: [T.toTray, T.s8],
    core: winOf('core', 'core'), s6: winOf('s6', 's6'), s8: winOf('s8', 's8'), s9: winOf('s9', 's9'),
  };
  R.foreItems = [
    ['hook', 60, 1880, 0, -12, 1.4], ['hook', 1110, 1180, 4, 0, 1.05], ['hook', 1010, 1960, 3, 10, 1.1],
    ['seam', 60, 1880, 0, -12, 1.4], ['seam', 1110, 1180, 4, 0, 1.05], ['seam', 1010, 1960, 3, 10, 1.1],
    ['test', 1060, 1820, 0, 10, 1.15], ['test', 20, 250, 4, 0, 0.9],
    ['s3', 30, 1830, 1, -10, 1.15], ['s3', 1070, 240, 0, 14, 0.95],
    ['core', 1050, 1830, 3, 8, 1.1], ['core', 10, 260, 2, -12, 0.95],
    ['s6', 40, 1830, 5, -16, 1.35], ['s6', 1030, 1760, 4, 0, 1.25], ['s6', 520, 150, 6, 0, 1.0],
    ['s8', 30, 1840, 2, -8, 1.15],
    ['s9', 1050, 1820, 0, 10, 1.1],
  ].map(([k, sx, sy, si, rot, sc]) => {
    const sp = SPR[si], g = S('g', {}, fg);
    S('image', { href: sp.url, x: -sp.w / 2, y: -sp.h / 2, width: sp.w, height: sp.h }, g);
    return { k, win: W_[k], sx, sy, rot, sc, g, dir: { x: sx < 540 ? -1 : 1, y: sy < 960 ? -1 : 1 } };
  });
}
// предметы у объектива: въезжают из-за края кадра за 0,3 с после начала кадра и уезжают на следующем переходе
function foreFrame(t) {
  for (const f of R.foreItems) {
    const [a0, b0] = f.win;
    const a = (f.k === 'hook' ? 1 : ease.inOut(prog(t, a0 + 0.12, 0.3))) * (f.k === 'seam' ? 1 : 1 - ease.inOut(prog(t, b0, 0.3)));
    const live = f.k === 'seam' ? t >= a0 : t < b0 + 0.3 && t >= a0;
    const a2 = f.k === 'seam' ? ease.inOut(prog(t, a0 + 0.2, 0.6)) : a;
    if (!live || a2 <= 0.001) { A(f.g, 'visibility', 'hidden'); continue; }
    const out = 1 - a2, s = f.sc;
    const x = f.sx + f.dir.x * 700 * out * out, y = f.sy + f.dir.y * 500 * out * out;
    A(f.g, 'transform', `translate(${f2(x)} ${f2(y)}) rotate(${f.rot}) scale(${f2(s * (1 + 0.15 * out))})`);
    A(f.g, 'visibility', 'visible'); A(f.g, 'opacity', '0.92');
  }
}

// ------------------------------------------------------------------ frame(t)
function frame(t) {
  if (MAP) return mapFrame();
  const c = COVER ? coverCam() : camAt(t);
  A(wg, 'transform', camXf(c));
  root.style.setProperty('--k', f2(Math.pow(c.z, -0.6)));
  window.__cam = c;
  sceneFrame(COVER ? COVER_T : t, c);
  foreFrame(COVER ? COVER_T : t);
  if (COVER) { coverFrame(c); return; }
  caps.frame(t);
}

// ------------------------------------------------------------------ boot
window.DURATION = DUR;
window.T = T;
const sfxFiltered = () => {
  const ev = [...SFX].sort((a, b) => a.t - b.t), out = [];
  for (const e of ev) {
    const last = out[out.length - 1];
    if (last && e.t - last.t < 0.1) { if ((e.gain_db ?? 0) > (last.gain_db ?? 0)) out[out.length - 1] = e; continue; }
    out.push(e);
  }
  return out;
};
window.SFX_EVENTS = [];
window.seek = t => frame(clamp(t, 0, DURATION));
window.READY = (async () => {
  await loadFonts();
  await build();
  window.SFX_EVENTS = sfxFiltered();
  frame(0);
  return true;
})();
