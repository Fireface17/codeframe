// Референсы с GitHub: неглубокие клоны (--depth 1, без лишних блобов), при необходимости
// только нужные папки (sparse-checkout). Каталог — refs/repos.json, состояние — refs/lock.json.
//   node tools/refs.mjs list              каталог и что уже склонировано
//   node tools/refs.mjs sync [id|A|B]     склонировать недостающие / обновить (A, B — по приоритету)
//   node tools/refs.mjs status            размер на диске, коммит, дата
// Клоны только для чтения: свои правки в refs/repos/* не делай — sync их не трогает, но и не обновит.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ws = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cat = JSON.parse(readFileSync(path.join(ws, 'refs/repos.json'), 'utf8'));
const lockF = path.join(ws, 'refs/lock.json');
const lock = existsSync(lockF) ? JSON.parse(readFileSync(lockF, 'utf8')) : {};
const git = (args, cwd = ws) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const dirOf = r => path.join(ws, 'refs/repos', r.id);
const du = d => execFileSync('du', ['-sh', d]).toString().split('\t')[0];

function sync(r) {
  const d = dirOf(r);
  if (!existsSync(d)) {
    const args = ['clone', '--depth', '1', '--filter=blob:none', '--no-tags'];
    if (r.sparse) args.push('--sparse');
    if (r.branch) args.push('--branch', r.branch);
    git([...args, r.url, d]);
    if (r.sparse) git(['sparse-checkout', 'set', '--no-cone', ...r.sparse], d);
  } else {
    if (git(['status', '--porcelain'], d)) { console.log(`  ${r.id}: есть локальные правки, пропускаю`); return; }
    git(['fetch', '--depth', '1', 'origin', r.branch || 'HEAD'], d);
    git(['reset', '--hard', 'FETCH_HEAD'], d);
  }
  const [commit, date] = git(['log', '-1', '--format=%h %cs'], d).split(' ');
  lock[r.id] = { url: r.url, commit, date, synced: new Date().toISOString().slice(0, 10), size: du(d) };
  console.log(`  ✓ ${r.id.padEnd(40)} ${commit} ${date} ${lock[r.id].size}`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'sync') {
  const sel = cat.filter(r => !arg || r.id === arg || r.priority === arg);
  if (!sel.length) throw new Error('ничего не выбрано: ' + arg);
  mkdirSync(path.join(ws, 'refs/repos'), { recursive: true });
  for (const r of sel) {
    try { sync(r); } catch (e) { console.log(`  ✗ ${r.id}: ${(e.stderr || e.message).toString().split('\n')[0]}`); }
    writeFileSync(lockF, JSON.stringify(lock, null, 1));
  }
} else if (cmd === 'status') {
  for (const r of cat) { const l = lock[r.id]; console.log(`${r.priority} ${r.id.padEnd(40)} ${l ? `${l.commit} ${l.date} ${l.size}` : '— не склонирован'}`); }
} else {
  for (const r of cat) console.log(`${r.priority} ${r.id.padEnd(40)} ${(r.license || '').padEnd(14)} ${existsSync(dirOf(r)) ? '✓' : ' '} ${r.take || ''}`);
}
