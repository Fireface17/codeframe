// Код на экране — настоящий: каждый сниппет из snippets/ (и подряд идущие a-seed + b-ball, как в плашке)
// дословно есть в js/film.js. Иначе выход с ошибкой.   node tools/codecheck.mjs
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const film = readFileSync(path.join(root, 'js/film.js'), 'utf8');
const snip = f => readFileSync(path.join(root, 'snippets', f), 'utf8').replace(/\n$/, '');
const checks = readdirSync(path.join(root, 'snippets')).filter(f => !f.startsWith('.')).map(f => [f, snip(f)]);
checks.push(['a-seed + b-ball', snip('a-seed.js') + '\n' + snip('b-ball.js')]);
let bad = 0;
for (const [name, code] of checks) {
  const ok = film.includes(code);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'НЕТ '} ${name}`);
}
if (bad) { console.error(`codecheck: ${bad} сниппет(ов) нет в js/film.js — код на экране не из ролика`); process.exit(1); }
