// Offline renderer: index.html frame by frame in headless Chromium (Playwright).
// The frame size and fps come from the page (window.FRAME). The page must expose
// window.READY (a promise), window.seek(t), window.DURATION, and for `events`
// window.SFX_EVENTS.
//
//   node render.mjs still <outDir> <t> [t...]          single frames (PNG)
//   node render.mjs sheet <out.png> <t,t,...> [cols]   contact sheet
//   node render.mjs cues                               print the cue times (T)
//   node render.mjs events <file.json>                 sound events + duration for the mix
//   node render.mjs video <out.mp4> [jobs]             silent master at the page's frame size
//   node render.mjs mux <master.mp4> <audio.wav> <out.mp4>
//     env SUB=<n>         subframes per frame for motion blur (default 16; 4 = quick draft)
//     env QUERY=a=b&c=d    query string for the page (variants: QUERY=logo=mockup)
//     env FROM=<s> TO=<s> render only that range (review clips)
//     env SCALE=2          render at 2x pixels (3840x2160 from a 1920x1080 layout)
//
// Motion blur: every frame averages SUB subframes over a 180-degree shutter.
// Chunks are encoded as raw H.264 and joined byte-wise, then wrapped with an
// explicit 60 fps, so no frame is lost at the joins.
import { chromium } from 'playwright';
import { createWriteStream, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, 'index.html')).href + (process.env.QUERY ? '?' + process.env.QUERY : '');   // e.g. QUERY=logo=mockup
const [mode, out, ...rest] = process.argv.slice(2);
let W = 1920, H = 1080, FPS = 60, SHUTTER = 1 / 120;
const SUB = +(process.env.SUB || 16);
// determinism (no partial raster of scaled layers) and no 60 Hz pacing of captures: both checked frame-identical
const ARGS = ['--disable-partial-raster', '--disable-frame-rate-limit', '--disable-gpu-vsync'];
const pad = (n, w = 5) => String(n).padStart(w, '0');

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.SCALE || 1) });   // SCALE=2: true 4K from the same layout
  page.on('pageerror', e => console.error('pageerror:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(url);
  await page.evaluate(() => window.READY);
  ({ W, H, FPS } = await page.evaluate(() => window.FRAME));
  SHUTTER = 1 / (2 * FPS);
  await page.setViewportSize({ width: W, height: H });
  return page;
}
async function grabber(page) {
  const cdp = await page.context().newCDPSession(page);
  return async t => {
    await page.evaluate(tt => window.seek(tt), t);
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    return Buffer.from(r.data, 'base64');
  };
}
const subTimes = (i, n) => Array.from({ length: n }, (_, k) => Math.max(0, i / FPS + ((k + 0.5) / n - 0.5) * SHUTTER));

if (mode === 'mux') {
  const [audio, final] = rest;
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', out, '-i', audio, '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', final]);
  console.log('mux ->', final);
  process.exit(0);
}

const browser = await chromium.launch({ args: ARGS });
if (mode === 'events') {
  const page = await open(browser);
  const ev = await page.evaluate(() => ({ duration: window.DURATION, events: window.SFX_EVENTS }));
  writeFileSync(out, JSON.stringify(ev, null, 1));
  console.log(`${ev.events.length} events, ${ev.duration.toFixed(3)} s -> ${out}`);
} else if (mode === 'cues') {
  const page = await open(browser);
  console.log(JSON.stringify(await page.evaluate(() => ({ duration: window.DURATION, T: window.T })), null, 1));
} else if (mode === 'still') {
  mkdirSync(out, { recursive: true });
  const page = await open(browser);
  for (const s of rest) {
    await page.evaluate(tt => window.seek(tt), parseFloat(s));
    await page.screenshot({ path: path.join(out, `t_${s}.png`), clip: { x: 0, y: 0, width: W, height: H } });
  }
} else if (mode === 'sheet') {
  const times = rest[0].split(',').map(Number), cols = parseInt(rest[1] || '3', 10);
  const tmp = out.replace(/\.png$/, '') + '_parts';
  mkdirSync(tmp, { recursive: true });
  const page = await open(browser);
  const files = [];
  for (const [i, t] of times.entries()) {
    const f = path.join(tmp, `${pad(i, 3)}.png`);
    await page.evaluate(tt => {
      window.seek(tt);
      let l = document.getElementById('sheetT');
      if (!l) { l = document.createElement('div'); l.id = 'sheetT'; l.style.cssText = 'position:fixed;left:14px;top:10px;font:600 44px Menlo,monospace;color:#d00;z-index:99'; document.body.appendChild(l); }
      l.textContent = tt.toFixed(2);
    }, t);
    await page.screenshot({ path: f, clip: { x: 0, y: 0, width: W, height: H } });
    files.push(f);
  }
  const rows = Math.ceil(files.length / cols), tw = Math.round(Math.min(1920, cols * 400) / cols), th = Math.round(tw * H / W);
  const args = ['-loglevel', 'error', '-y'];
  files.forEach(f => args.push('-i', f));
  const lab = times.map((t, i) => `[${i}]scale=${tw}:${th}:flags=lanczos,drawbox=x=0:y=0:w=iw:h=ih:color=0xbbbbbb:t=1[s${i}]`).join(';');
  const pads = files.length < cols * rows ? `,pad=${tw * cols}:${th * rows}:color=white` : '';
  args.push('-filter_complex', `${lab};${files.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * th}`).join('|')}:fill=white${pads}`, '-frames:v', '1', out);
  execFileSync('ffmpeg', args);
  console.log('sheet ->', out);
} else if (mode === 'video') {
  const jobs = parseInt(rest[0] || '6', 10);
  const probe = await open(browser);
  const D = await probe.evaluate(() => window.DURATION);
  await probe.close();
  const NALL = Math.round(D * FPS);
  const clip = process.env.FROM !== undefined;
  const F0 = clip ? Math.round(parseFloat(process.env.FROM) * FPS) : 0;
  const F1 = clip ? Math.min(NALL, Math.round(parseFloat(process.env.TO) * FPS)) : NALL;
  const tmp = out.replace(/\.mp4$/, '') + '_chunks';
  mkdirSync(tmp, { recursive: true });
  const per = Math.max(30, Math.ceil((F1 - F0) / (jobs * 3)));
  const chunks = [];
  for (let s = F0; s < F1; s += per) chunks.push({ i0: s, i1: Math.min(F1, s + per), file: path.join(tmp, `c${pad(chunks.length, 3)}.h264`) });
  const t0 = Date.now();
  let done = 0, next = 0;
  const NF = F1 - F0;
  const wts = Array(SUB).fill(1).join(' ');
  await Promise.all(Array.from({ length: Math.min(jobs, chunks.length) }, async () => {
    const own = await chromium.launch({ args: ARGS });
    const page = await open(own);
    const grab = await grabber(page);
    while (next < chunks.length) {
      const c = chunks[next++];
      const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'png', '-i', '-',
        '-vf', `tmix=frames=${SUB}:weights='${wts}',select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${FPS}*TB),scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p`,
        '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-tune', 'animation', '-bf', '0', '-profile:v', 'high', '-g', '60', '-threads', '2',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-f', 'h264', c.file], { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise(r => ff.on('close', r));
      for (let i = c.i0; i < c.i1; i++) {
        for (const t of subTimes(i, SUB)) {
          const buf = await grab(t);
          if (!ff.stdin.write(buf)) await new Promise(res => ff.stdin.once('drain', res));
        }
        if (++done % 120 === 0) console.log(`${done}/${NF} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end();
      if ((await closed) !== 0) throw new Error(`ffmpeg failed on ${c.file}`);
    }
    await own.close();
  }));
  // join raw streams byte-wise, wrap at an explicit 60 fps
  const all = path.join(tmp, 'all.h264');
  const ws = createWriteStream(all);
  for (const c of chunks) ws.write(readFileSync(c.file));
  await new Promise(r => ws.end(r));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-f', 'h264', '-i', all, '-c', 'copy',
    '-video_track_timescale', '15360', '-movflags', '+faststart', out]);
  const n = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out]).toString().trim();
  console.log(`video: ${n}/${NF} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${out}`);
  if (+n !== NF) { console.error('FRAME COUNT MISMATCH'); process.exitCode = 1; }
  else rmSync(tmp, { recursive: true });
}
await browser.close();
