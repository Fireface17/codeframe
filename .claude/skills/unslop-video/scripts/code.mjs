// Приметы шаблона в исходниках ролика (HTML/CSS/JS/SVG): шрифты, цвета, свечения, кривые, служебный текст.
//   node code.mjs <папка проекта> [--json]
// Ищет в index.html, css/, js/ (без vendor, node_modules, сгенерированных *-data.js, timing.js, движка core.js).
// Это зацепки, а не вердикт: каждая находка — повод спросить «выбрано под этот ролик или по умолчанию?».
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || '.');
const asJson = process.argv.includes('--json');
const SKIP_DIR = /^(node_modules|vendor|out|audio|assets|reviews|versions|art|snippets|tools|\..*)$/;
const SKIP_FILE = /(-data\.js|timing\.js|^core\.js|^preview\.js|^captions\.js|^code\.js|^cast\.js|^gl\.js|^lab\.js|\.min\.js|_v\d+\.js|^hdri.*\.js|^photos\.js|^directions\.js|^dir-.*\.js|^lookdev.*\.js|^probe.*\.js)$/;
// lab.js, core.js, captions.js — общие библиотеки: их определения не считаем, а вызовы в сценах считаем ниже
const files = [];
const walk = d => { for (const n of readdirSync(d)) { const p = path.join(d, n), s = statSync(p);
  if (s.isDirectory()) { if (!SKIP_DIR.test(n)) walk(p); } else if (/\.(js|css|html|svg)$/.test(n) && !SKIP_FILE.test(n)) files.push(p); } };
if (existsSync(path.join(dir, 'index.html'))) files.push(path.join(dir, 'index.html'));
for (const d of ['css', 'js']) if (existsSync(path.join(dir, d))) walk(path.join(dir, d));
if (!files.length) { console.error(`Нет исходников в ${dir} (ожидались index.html, css/, js/)`); process.exit(2); }

// --- правила: id, направление, вес (1 — слабая зацепка, 3 — почти наверняка шаблон), регулярка, совет
const BANNED_FONTS = 'Inter|Roboto|Arial|Helvetica(?: Neue)?|Open Sans|Lato|Poppins|Nunito|Outfit|Sora|Geist|Space Grotesk|Montserrat|Syne|Playfair Display|Cormorant|Cinzel|DM Sans|Plus Jakarta Sans|Manrope|system-ui|-apple-system|SF Pro';
const RULES = [
  ['font-default', 'шрифт', 2, new RegExp(`(font-family|font)\\s*[:=]\\s*['"\`]?[^;\\n]*?(?<![\\w-])(${BANNED_FONTS})(?![\\w-])`, 'gi'), 'шрифт «по умолчанию у ИИ»: взять шрифт под тему или из языка канала'],
  ['purple-neon', 'цвет', 2, /#(6366f1|8b5cf6|a855f7|7c3aed|6d28d9|9333ea|c084fc|a78bfa|818cf8|4f46e5|06b6d4|22d3ee|00ffff|ff00ff|0ff|f0f|39ff14|00ff9[0-9a-f])(?![0-9a-f])/gi, 'фиолетовый/индиго/неон: один акцент со смыслом из палитры темы'],
  ['purple-hsl', 'цвет', 1, /hsla?\(\s*(2[5-8]\d)\s*[, ]\s*([6-9]\d|100)%/gi, 'насыщенный фиолетовый в hsl'],
  ['tailwind-zinc', 'цвет', 1, /#(d4d4d8|a1a1aa|71717a|52525b|3f3f46|27272a|18181b)(?![0-9a-f])/gi, 'серые Tailwind zinc: нейтральный с оттенком своей палитры'],
  ['chart-default', 'данные', 2, /#(1f77b4|ff7f0e|2ca02c|d62728|9467bd)(?![0-9a-f])/gi, 'палитра matplotlib по умолчанию: серый + 1–2 выделенных'],
  ['gradient-text', 'шрифт', 3, /background-clip\s*:\s*text|-webkit-text-fill-color\s*:\s*transparent/gi, 'градиентный текст: сплошной цвет, акцент — размером'],
  ['glow-blur', 'свет', 2, /stdDeviation\s*[:=,]?\s*['"]?\s*(\d{2,}|[89](\.\d+)?)|drop-shadow\([^)]*?\b([2-9]\d|\d{3})px|text-shadow\s*:[^;]*?\b([1-9]\d)px[^;]*?(rgba?|#)/gi, 'свечение/мягкая тень с большим размытием: тень-сдвиг без размытия или свет с источником'],
  ['glow-name', 'свет', 1, /\b(glow|neon|halo|bloom|aurora|nebula|bokeh|sparkle|свечени\p{L}*|неон\p{L}*|ореол\p{L}*)\b/giu, 'имя «свечения» в коде: проверить, не декор ли по умолчанию'],
  ['radial-bg', 'свет', 1, /radial-gradient|radGrad\(|createRadialGradient|<radialGradient/gi, 'радиальное пятно: ореол «для дорогого вида»? Свет с источником или плоско'],
  ['glass', 'композиция', 2, /backdrop-filter\s*:\s*blur/gi, 'стекло (glassmorphism): плоская карточка'],
  ['bounce', 'движение', 2, /\b(back\.out|elastic\.out|bounce\.out|easeOutBack|easeOutElastic|easeOutBounce|easeInOutBack)\b|ease\.(elastic|bounce|back)/g, 'отскок/резинка по умолчанию: без перелёта, одна пружина-развязка на ролик'],
  ['css-anim', 'движение', 1, /@keyframes|animation\s*:|transition\s*:/gi, 'CSS-анимация: в движке кадр — функция t; заодно проверить, не дефолтная ли кривая'],
  ['emoji', 'иконки', 2, /\p{Extended_Pictographic}/gu, 'эмодзи в кадре: один набор иконок или настоящая иконка продукта'],
  ['counter-label', 'композиция', 2, /['"`]\s*0\d\s*[\/—–·.]\s*\p{L}*|['"`](шаг|глава|сцена|часть|эпизод|step|chapter|scene|part)\s*0?\d/giu, 'счётчик главы «01 / …»: смену главы показывают объектом и фоном'],
  ['meta-text', 'композиция', 2, /['"`][^'"`\n]*(\b\d+\s?BPM\b|\b\d{2,3}\s?FPS\b|1920\s?[×x]\s?1080|1080\s?[×x]\s?1920|\bREC\b|\bT\+\d)/g, 'служебные данные в кадре (BPM, FPS, разрешение, REC): убрать'],
  ['ai-ui-text', 'иконки', 2, /['"`](Доброе утро|С возвращением|Good morning|Welcome back|AI-powered|Powered by AI|Новое|NEW)['"`!,]/g, 'типовая «вайб-кодная» карточка: увеличенный фрагмент настоящего интерфейса'],
  ['chart-lib', 'данные', 2, /chart\.js|recharts|echarts|<legend|class=["'][^"']*legend/gi, 'веб-график в видео: рисованный SVG, подписи у данных'],
  ['audio-viz', 'звук', 2, /getByteFrequencyData|AnalyserNode|createAnalyser|equalizer|spectrum/gi, 'аудиовизуализация как декор'],
  ['tilt-3d', 'камера', 1, /rotate[XY]\(\s*-?(1[0-9]|2\d)deg|perspective\(/gi, 'наклон карточки/телефона в 3D: обрезанное устройство или 2D-камера'],
];

// --- привычки нашего движка: сами по себе нормальны, шаблон — когда стоят в каждом ролике и на каждом ударе
const HABITS = [
  ['shake', /\bshake\w*\b/g], ['cam', /\bSP\.cam\b|\bcamDrift\(|\bdrift\(/g], ['squash', /\bsquash\w*\(/g],
  ['count', /\bcountTo\(|\bodometer\w*\(|\bcountUp\(/g], ['stamp', /\bstamp\w*\(/g], ['tape', /\btape\w*\(/g],
  ['strike', /\bstrike\w*\(|\bcrossOut\(/g], ['marker', /\bmarker\w*\(|\bhighlighter\(/g], ['circleMark', /\b(ring|circleMark|lasso|reticle)\w*\(/g],
  ['captions', /\bmakeCaptions\(/g], ['crash', /\b(crash|whip)\w*\(/g], ['confetti', /\b(confetti|particles?|sparkles?|burst)\w*\(/gi],
];
const HABIT_TIP = {
  shake: [6, 'тряска на ударах: после третьего раза её не видят. 1–2 раза за ролик, разная по оси и силе, или реакция предмета (прогиб, трещина)'],
  cam: [25, 'камера всё время плывёт: чередовать статику «на штативе» и резкие переносы; дрейф — только где он что-то значит'],
  squash: [6, 'сквош у всего подряд: только у мягкого и живого; металл, стекло, бумага — без перелёта'],
  count: [2, 'счётчик-докрутка числа: число показать предметом (стопка, шкала, ценник); счётчик — максимум один на ролик'],
  stamp: [1, 'штамп-вердикт с поворотом: показать последствие (дверь не открылась, загрузка встала), а не надпись'],
  tape: [1, 'скотч/лента как декор: только если объясняет'],
  strike: [2, 'зачёркивание «не X»: показать два варианта рядом, пусть зритель увидит разницу'],
  marker: [3, 'маркер под словом: одно выделение на ролик, размером или положением'],
  circleMark: [2, 'обвести красным/прицел: указать действием (курсор, крупный план детали, остальное в серый)'],
  captions: [1, 'стандартный модуль субтитров (караоке слева, серый хвост, прыжок слова) — главный отпечаток серии: проверь, что вид субтитров выбран под ролик'],
  crash: [4, 'крэш-зум/вип на переходах: склейка по действию или по форме'],
  confetti: [1, 'частицы/конфетти/«взрыв»: каждый объект кадра — из темы'],
};
const habits = {}, habitAt = {};
const hits = {}, add = (id, f, line, s) => ((hits[id] ||= []).push({ f: path.relative(dir, f), line, s: s.trim().slice(0, 90) }));
const springs = {}, easings = {};
let totalLines = 0;
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  totalLines += lines.length;
  lines.forEach((L, i) => {
    if (L.length > 1500) return;                                    // base64 и минифицированное
    if (/^\s*(\/\/|\*|#)/.test(L) && !/['"`]/.test(L)) return;   // строки-комментарии не считаем
    for (const [id, re] of HABITS) { re.lastIndex = 0; const n = (L.match(re) || []).length; if (n) { habits[id] = (habits[id] || 0) + n; ((habitAt[id] ||= []).length < 3) && habitAt[id].push(`${path.relative(dir, f)}:${i + 1}`); } }
    for (const [id, , , re] of RULES) { re.lastIndex = 0; if (re.test(L)) add(id, f, i + 1, L); }
    for (const m of L.matchAll(/\bSP\.(\w+)/g)) springs[m[1]] = (springs[m[1]] || 0) + 1;
    for (const m of L.matchAll(/\bease\.(\w+)|cubic-bezier\(([^)]*)\)|\b(power\d\.\w+|expo\.\w+|sine\.\w+|circ\.\w+)/g)) { const k = m[1] || m[2] || m[3]; easings[k] = (easings[k] || 0) + 1; }
  });
}

// --- однообразие движения: одна пружина/кривая на большинство входов
const motion = [];
const pops = ['pop', 'popS', 'hop'].reduce((s, k) => s + (springs[k] || 0), 0);
const sTotal = Object.values(springs).reduce((a, b) => a + b, 0);
if (sTotal >= 20 && pops / sTotal > 0.35) motion.push(`пружины с перелётом (pop/popS/hop) — ${Math.round(100 * pops / sTotal)}% всех вызовов (${pops} из ${sTotal}): «громкое» движение стало фоном. Цель: 1–3 громких момента на ролик, остальное тихо (move/fade/snap)`);
const eTop = Object.entries(easings).sort((a, b) => b[1] - a[1]);
const eTotal = eTop.reduce((s, [, n]) => s + n, 0);
if (eTotal >= 15 && eTop[0][1] / eTotal > 0.6) motion.push(`одна кривая «${eTop[0][0]}» — ${Math.round(100 * eTop[0][1] / eTotal)}% вызовов easing: своя кривая на роль (вход, выход, перенос, счётчик)`);
for (const [id, n] of Object.entries(habits)) if (n >= HABIT_TIP[id][0]) motion.push(`${id} ×${n} — ${HABIT_TIP[id][1]}  (${habitAt[id].join(', ')})`);
const NAMES = Object.fromEntries(RULES.map(r => [r[0], r]));
let score = 0;
for (const [id, list] of Object.entries(hits)) score += NAMES[id][2] * Math.min(3, list.length);
score += motion.length * 2;   // каждая привычка сверх порога — 2 балла

if (asJson) { console.log(JSON.stringify({ dir, files: files.length, lines: totalLines, score, hits, habits, springs, easings, motion }, null, 1)); process.exit(0); }
console.log(`# Код: ${path.basename(dir)} — ${files.length} файлов, ${totalLines} строк\n`);
const order = Object.keys(hits).sort((a, b) => NAMES[b][2] * Math.min(3, hits[b].length) - NAMES[a][2] * Math.min(3, hits[a].length));
if (!order.length && !motion.length) console.log('Явных примет в коде не найдено (это не значит, что ролик не шаблонный: смотри кадры).');
for (const id of order) {
  const [, cat, w, , tip] = NAMES[id], L = hits[id];
  console.log(`- [${cat}] ${id} ×${L.length} (вес ${w}) — ${tip}`);
  for (const h of L.slice(0, 3)) console.log(`    ${h.f}:${h.line}  ${h.s}`);
  if (L.length > 3) console.log(`    … ещё ${L.length - 3}`);
}
if (motion.length) console.log('\nПривычки движка и декора (сверх порога):');
for (const m of motion) console.log(`- ${m}`);
if (sTotal) console.log(`\nПружины: ${Object.entries(springs).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
if (eTotal) console.log(`Кривые: ${eTop.slice(0, 8).map(([k, n]) => `${k} ${n}`).join(', ')}`);
console.log(`\nБалл шаблонности кода: ${score} (0–5 чисто · 6–14 есть что объяснить · 15+ много выборов по умолчанию)`);
