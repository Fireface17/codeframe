// Поиск по всей базе референсов разом: что уже есть по теме ролика или приёму.
//   node tools/find-refs.mjs "график рост"            — топ-6 в каждом источнике
//   node tools/find-refs.mjs "терминал код" --n 10     — больше результатов
//   node tools/find-refs.mjs "карта" --only hf,opus    — только выбранные источники
// Источники: lab (наши идеи-образцы), coll (коллекция чужих работ, K), hf (блоки HyperFrames),
// opus (1127 роликов, сделанных с Opus 5.5), ideas (40 приёмов), repos (своды правил и инструменты),
// sites (внешние сайты), assets (library: 3D, звуки, текстуры, шрифты), research (наши исследования).
// Русские и английские слова понимаются одинаково для частых тем (словарь SYN ниже).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ws = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const has = f => existsSync(path.join(ws, f));
const read = f => readFileSync(path.join(ws, f), 'utf8');
const J = f => JSON.parse(read(f));

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const N = +opt('--n', 6), ONLY = opt('--only', '');
const query = args.join(' ').trim();
if (!query) {
  console.log('Использование: node tools/find-refs.mjs "<тема или приём>" [--n 6] [--only lab,coll,hf,opus,ideas,repos,sites,assets,research]');
  process.exit(1);
}

// --- словарь: группа слов, которые считаем одним понятием
const SYN = [
  ['график', 'диаграмм', 'chart', 'graph', 'plot', 'данные', 'data', 'инфограф', 'infograph', 'bar', 'столбц'],
  ['счётчик', 'счетчик', 'число', 'цифр', 'counter', 'number', 'stat', 'статист'],
  ['субтитр', 'подпис', 'caption', 'subtitle', 'караоке', 'karaoke'],
  ['переход', 'склейк', 'transition', 'wipe', 'шторк', 'cut'],
  ['текст', 'типограф', 'шрифт', 'букв', 'слов', 'type', 'typo', 'text', 'font', 'kinetic', 'letter', 'word', 'headline', 'заголов'],
  ['логотип', 'лого', 'logo', 'brand', 'бренд', 'sting', 'заставк', 'intro', 'outro'],
  ['частиц', 'particle', 'пыль', 'искр', 'spark'],
  ['код', 'code', 'программ', 'syntax', 'ide', 'редактор'],
  ['терминал', 'консол', 'terminal', 'console', 'cli', 'shell', 'командн'],
  ['интерфейс', 'ui', 'экран', 'приложени', 'app', 'mock', 'макет', 'курсор', 'cursor', 'кнопк', 'button', 'dashboard', 'дашборд'],
  ['чат', 'chat', 'ии', 'нейросет', 'ai', 'llm', 'gpt', 'claude', 'модел', 'бот', 'bot', 'агент', 'agent'],
  ['телефон', 'смартфон', 'phone', 'iphone', 'mobile', 'мобил'],
  ['машин', 'авто', 'car', 'vehicle', 'tesla', 'тесла', 'дорог', 'road'],
  ['город', 'city', 'здани', 'building', 'улиц', 'street', 'gta'],
  ['карт', 'map', 'глобус', 'globe', 'земл', 'earth', 'geo', 'стран', 'country'],
  ['3d', '3д', 'трёхмер', 'трехмер', 'three', 'webgl', 'glb', 'модел', 'mesh', 'объём'],
  ['звук', 'sfx', 'sound', 'audio', 'аудио', 'шум', 'вжух', 'whoosh', 'клик', 'click'],
  ['музык', 'music', 'бит', 'beat', 'ритм', 'rhythm'],
  ['иконк', 'icon', 'пиктограм', 'значок'],
  ['фон', 'background', 'градиент', 'gradient', 'текстур', 'texture', 'зерн', 'grain', 'noise', 'шум'],
  ['свет', 'light', 'свечен', 'glow', 'неон', 'neon', 'hdri', 'тень', 'shadow'],
  ['камер', 'camera', 'зум', 'zoom', 'панорам', 'pan', 'наезд', 'dolly', 'параллакс', 'parallax'],
  ['схем', 'diagram', 'поток', 'flow', 'стрелк', 'arrow', 'объясн', 'explainer', 'процесс', 'process', 'узел', 'node'],
  ['список', 'list', 'рейтинг', 'rank', 'топ', 'top', 'сравнен', 'compar', 'versus', 'vs', 'против'],
  ['деньг', 'денег', 'money', 'цен', 'price', 'доллар', 'dollar', 'финанс', 'financ', 'акци', 'stock', 'ipo', 'бирж'],
  ['игр', 'game', 'gaming', 'пиксел', 'pixel', 'ретро', 'retro', '8bit'],
  ['рук', 'hand', 'рисова', 'draw', 'набросок', 'sketch', 'линия', 'line', 'stroke', 'штрих', 'бумаг', 'paper'],
  ['глитч', 'glitch', 'помех', 'scramble', 'decode', 'шифр', 'матриц', 'matrix'],
  ['хук', 'hook', 'начал', 'opening', 'удар', 'slam'],
  ['время', 'таймлайн', 'timeline', 'истори', 'history', 'год', 'year', 'дата', 'date', 'хронолог'],
  ['слоп', 'slop', 'шаблон', 'клише', 'cliche', 'вкус', 'taste', 'критик', 'critic', 'качеств', 'quality', 'правил', 'rule', 'lint'],
  ['шейдер', 'shader', 'glsl', 'генератив', 'generative', 'процедур', 'procedural', 'фрактал', 'noise'],
  ['вода', 'water', 'жидк', 'fluid', 'волн', 'wave', 'дым', 'smoke', 'огонь', 'fire'],
  ['персонаж', 'character', 'человек', 'people', 'person', 'аватар', 'avatar', 'маскот', 'mascot', 'лицо', 'face'],
];
const low = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
// грубый стеммер: срезаем только окончание («машина» → «машин»), чтобы «график» не находил «графику»
const stem = w => /[а-я]/.test(w) && w.length > 4 ? w.replace(/(ами|ями|ого|его|ому|ему|ов|ев|ей|ой|ий|ый|ая|яя|ое|ее|ые|ие|ам|ям|ах|ях|ом|ем|а|я|ы|и|у|ю|о|е|ь|й)$/, '') : w;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const terms = low(query).split(/[\s,;]+/).filter(w => w.length > 1).map(w => {
  const s = stem(w), alts = new Set([s]);
  for (const g of SYN) if (g.some(x => { const y = low(x); return y.startsWith(s) || s.startsWith(y); })) g.forEach(x => alts.add(low(x)));
  // совпадение только с начала слова: «график» не должен находить «типографику»
  return { w, re: [...alts].map(a => ({ a, exact: a === s ? 1.5 : 1, r: new RegExp(`(^|[^a-zа-я0-9])${esc(a)}`) })) };
});

// счёт: по каждому слову запроса — лучшее совпадение среди его синонимов; заголовок весит больше текста
const score = (title, tags, text) => {
  const T = low(title), G = low((tags || []).join(' ')), X = low(text);
  let sum = 0, hit = 0;
  for (const t of terms) {
    let best = 0;
    for (const { r, exact } of t.re) {   // само слово запроса весит больше синонима
      const s = (r.test(T) ? 3 : 0) + (r.test(G) ? 2 : 0) + (r.test(X) ? 1 : 0);
      best = Math.max(best, s * exact);
    }
    if (best) hit++;
    sum += best;
  }
  return hit ? sum * hit / terms.length : 0;   // запросы из нескольких слов: выше то, что покрывает все
};

const src = {};
const add = (k, item) => (src[k] ||= []).push(item);
const clip = (s, n = 140) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

// --- лаборатория
if (has('lab/ideas')) for (const d of readdirSync(path.join(ws, 'lab/ideas')).sort()) {
  const f = `lab/ideas/${d}/meta.json`; if (!has(f)) continue;
  const m = J(f);
  add('lab', { title: `${d} — ${m.title}`, tags: m.tags, text: `${m.kind || ''} ${m.about || ''}`,
    open: `lab/index.html?idea=${d}  (код: lab/ideas/${d}/film.js)` });
}
// --- каталог репозиториев: коллекция (K) и остальное
const repos = has('refs/repos.json') ? J('refs/repos.json') : [];
for (const r of repos) {
  const local = has(`refs/repos/${r.id}`) ? `refs/repos/${r.id}/` : r.url;
  const lic = r.license ? ` [${r.license}${r.ok === false ? ', код не брать' : ''}]` : '';
  add(r.priority === 'K' ? 'coll' : 'repos', { title: r.id, tags: [r.kind, r.group, r.priority].filter(Boolean),
    text: `${r.take || ''} ${r.what || ''} ${r.note || ''}`, open: local + lic });
}
// --- HyperFrames
const HFR = 'refs/repos/heygen-com__hyperframes/registry';
if (has(HFR)) for (const d of ['examples', 'blocks', 'components']) {
  if (!has(`${HFR}/${d}`)) continue;
  for (const x of readdirSync(path.join(ws, HFR, d))) {
    const f = `${HFR}/${d}/${x}/registry-item.json`; if (!has(f)) continue;
    const j = J(f);
    add('hf', { title: `${j.title || j.name} (${d.slice(0, -1)})`, tags: j.tags, text: j.description,
      open: `${HFR}/${d}/${x}/` + (j.dimensions ? `  ${j.dimensions.width}×${j.dimensions.height}` : '') });
  }
}
// --- ролики Opus 5.5
const YH = 'refs/repos/yihui-dev__awesome-opus5-5-videos';
if (has(`${YH}/data/videos.json`)) for (const x of J(`${YH}/data/videos.json`))
  add('opus', { title: x.title || x.slug, tags: [x.category, ...(x.tech_tags || [])], text: x.prompt,
    open: `${YH}/prompts/${x.slug}.md  ${x.post_url || ''}` });
const AT = 'refs/repos/athemeroy__awesome-opus-5-5-videos';
const csv = f => {
  const t = read(f), rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [h, ...r] = rows; return r.filter(x => x.length > 1).map(x => Object.fromEntries(h.map((k, i) => [k, x[i] || ''])));
};
if (has(`${AT}/data/collection-index.csv`)) {
  const notes = {};
  if (has(`${AT}/data/cases.csv`)) for (const c of csv(`${AT}/data/cases.csv`)) notes[c.source_url] = c;
  for (const x of csv(`${AT}/data/collection-index.csv`)) {
    const n = notes[x.source_url];
    add('opus', { title: x.title_en, tags: [x.category, x.model_tags, n?.primary_path].filter(Boolean),
      text: n ? `${n.creator_disclosure} ${n.hypit_observation}` : '', open: (x.detail_page ? `${AT}/${x.detail_page}  ` : '') + x.source_url });
  }
}
// --- 40 приёмов
if (has('refs/ideas.json')) {
  const e = J('refs/ideas.json'), list = Array.isArray(e) ? e : e.ideas || [];
  for (const i of list) add('ideas', { title: `№${i.n} ${i.title}`, tags: [i.cat, ...(i.src || [])], text: i.what,
    open: `refs/ideas.json №${i.n}` + (i.lab ? `  · образец: lab/index.html?idea=${i.lab}` : '') });
}
// --- строки таблиц из md: сайты и ассеты
const tableRows = (f, k) => {
  if (!has(f)) return;
  let sec = '';
  for (const line of read(f).split('\n')) {
    if (/^#{1,4} /.test(line)) sec = line.replace(/^#+ /, '');
    if (!line.startsWith('|') || /^\|[\s|:-]+\|?$/.test(line) || /^\|\s*(Сайт|Путь|Папка|Файл)\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(s => s.trim());
    add(k, { title: cells[0].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'), tags: [sec], text: cells.slice(1).join(' '), open: `${f} → ${sec || 'таблица'}` });
  }
};
tableRows('refs/sites.md', 'sites');
tableRows('library/CLAUDE.md', 'assets');
tableRows('library/3d/README.md', 'assets');
// --- наши исследования: по заголовкам разделов
if (has('refs/research')) {
  const walk = d => readdirSync(path.join(ws, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.md') ? [`${d}/${e.name}`] : []);
  for (const f of walk('refs/research')) {
    const parts = read(f).split(/\n(?=#{1,3} )/);
    const title = (parts[0].match(/^# (.+)/m) || [, path.basename(f)])[1];
    for (const p of parts) {
      const h = (p.match(/^#{1,3} (.+)/) || [, title])[1];
      add('research', { title: `${path.basename(f)} → ${h}`, tags: [title], text: p.slice(0, 3000), open: f });
    }
  }
}

const NAMES = { lab: 'Наша лаборатория', coll: 'Коллекция чужих работ (K)', hf: 'Блоки HyperFrames', opus: 'Ролики Opus 5.5 (промпты и разборы)',
  ideas: 'Каталог приёмов', repos: 'Своды правил, скиллы, инструменты', sites: 'Внешние сайты', assets: 'Ассеты library/', research: 'Наши исследования' };
const only = ONLY ? new Set(ONLY.split(',')) : null;
let total = 0;
console.log(`Запрос: «${query}»  (слова: ${terms.map(t => t.w).join(', ')})\n`);
for (const k of Object.keys(NAMES)) {
  if (only && !only.has(k) || !src[k]) continue;
  const res = src[k].map(i => ({ ...i, s: score(i.title, i.tags, i.text) })).filter(i => i.s > 0).sort((a, b) => b.s - a.s);
  if (!res.length) continue;
  total += res.length;
  console.log(`## ${NAMES[k]} — найдено ${res.length}`);
  for (const i of res.slice(0, N)) console.log(`- ${clip(i.title, 90)}\n    ${clip(i.text)}\n    → ${i.open}`);
  console.log('');
}
if (!total) console.log('Ничего не найдено. Попробуй слово попроще или по-английски.');
else console.log(`Открыть глазами: gallery.html (вкладки «Коллекция», «Opus 5.5», «HyperFrames»).`);
