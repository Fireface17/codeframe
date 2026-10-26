// three.js for file:// pages: wrap the CommonJS build into a classic script that sets window.THREE.
//   node tools/three_vendor.mjs            node_modules/three/build/three.cjs -> js/vendor/three.js
// ES modules do not load from file:// (CORS), and the renderer opens the page exactly like that.
// three@0.170.0 is the last release with a full CJS build: from r171 on build/three.cjs is a ~600-byte stub that
// re-exports the ES module, and the wrapper silently yields an empty THREE. Pin it: npm i -D -E three@0.170.0.
// A newer three or addons (GLTFLoader, ...): bundle an IIFE with esbuild instead (references/3d.md).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const src = 'node_modules/three/build/three.cjs';
if (!existsSync(src)) { console.error(`${src} not found: npm i -D -E three@0.170.0`); process.exit(1); }
const code = readFileSync(src, 'utf8');
const ver = JSON.parse(readFileSync('node_modules/three/package.json', 'utf8')).version;
if (code.length < 100000 || !/exports\.WebGLRenderer\s*=/.test(code)) {
  console.error(`three ${ver}: build/three.cjs is a stub (${code.length} bytes), not the full build.\n` +
    `Pin the last full CJS build: npm i -D -E three@0.170.0, or bundle with esbuild (references/3d.md).`);
  process.exit(1);
}
mkdirSync('js/vendor', { recursive: true });
writeFileSync('js/vendor/three.js', '(function(){var exports={};var module={exports:exports};\n' + code + '\n;window.THREE=module.exports;})();\n');
console.log(`three ${ver} -> js/vendor/three.js (${(code.length / 1e6).toFixed(2)} MB)`);
