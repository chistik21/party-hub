import {rmSync} from 'node:fs';
import { build } from 'esbuild';
import { cpSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
await build({
  entryPoints: ['server/main.cjs'],
  outfile: 'release/server.cjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  external: ['bufferutil', 'utf-8-validate']
});
cpSync('core', 'release/core', {
  recursive: true
});
const assets = readdirSync('release/site/assets').map(f => '/assets/' + f);
const files = ['/', '/icon.svg', '/app.webmanifest', ...assets, ...['cards', 'memes', 'sound'].flatMap(dir => readdirSync('release/site/' + dir).map(f => '/' + dir + '/' + f))];
const hash = createHash('sha256');
for (const file of files) hash.update(readFileSync('release/site' + (file === '/' ? '/index.html' : file)));
const cache = 'party-hub-' + hash.digest('hex').slice(0, 12);
writeFileSync('release/site/sw.js', `const key=${JSON.stringify(cache)},files=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(key).then(c=>c.addAll(files))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('party-hub-')&&k!==key).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method==='GET'&&u.origin===self.location.origin&&(e.request.mode==='navigate'||files.includes(u.pathname)))e.respondWith(caches.open(key).then(async c=>(await c.match(e.request.mode==='navigate'?'/':u.pathname))||fetch(e.request)))});
`);
rmSync('android/app/src/main/assets/site/assets',{force:true,recursive:true});
for (const dir of ['core', 'site']) cpSync('release/' + dir, 'android/app/src/main/assets/' + dir, {
  recursive: true
});
