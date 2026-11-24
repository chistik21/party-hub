const fs = require('node:fs'),
  path = require('node:path'),
  http = require('node:http'),
  os = require('node:os'),
  vm = require('node:vm');
const {
  WebSocketServer
} = require('ws');
const base = process.env.HUB_ROOT || __dirname,
  root = path.join(base, 'site'),
  data = path.resolve(process.env.HUB_DATA || 'hub-profiles'),
  port = Number(process.env.PORT || (process.argv.includes('--port') && process.argv[process.argv.indexOf('--port')+1]) || 3000);
fs.mkdirSync(data, {
  recursive: true
});
const clients = new Map();
const context = vm.createContext({
  restore(k) {
    try {
      return fs.readFileSync(path.join(data, k + '.json'), 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') return '';
      throw e;
    }
  },
  persist(k, v) {
    const dest = path.join(data, k + '.json');
    fs.writeFileSync(dest + '.tmp', v, {
      flush: true,
      mode: 0o600
    });
    fs.renameSync(dest + '.tmp', dest);
  },
  sendTo(id, v) {
    const s = clients.get(id);
    if (s?.readyState === 1) s.send(v);
  }
});
for (const file of ['bank', 'engine', 'wire']) vm.runInContext(fs.readFileSync(path.join(base, 'core', file + '.js'), 'utf8'), context);
function urls() {
  try {
    return Object.values(os.networkInterfaces()).flat().filter(a => a.family === 'IPv4' && !a.internal).map(a => 'http://' + a.address + ':' + port);
  } catch {
    return [];
  }
}
const server = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    if (u.pathname === '/info') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        ...context.Wire.info(),
        urls: urls(),
        v: 1
      }));
    }
    const f = path.resolve(root, '.' + decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
    if (!f.startsWith(root + path.sep) || !fs.statSync(f).isFile()) throw Error();
    res.setHeader('Content-Type', {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.wav': 'audio/wav',
      '.svg': 'image/svg+xml',
      '.html': 'text/html;charset=utf-8',
      '.webmanifest': 'application/manifest+json'
    }[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
let n = 0;
new WebSocketServer({
  server,
  path: '/hub',
  maxPayload: 180000
}).on('connection', s => {
  const id = String(++n);
  clients.set(id, s);
  s.on('error', () => s.terminate());
  s.on('message', v => context.Wire.message(id, v.toString()));
  s.on('close', () => {
    clients.delete(id);
    context.Wire.close(id);
  });
});
const timer = setInterval(() => context.Wire.tick(), 100);
server.listen(port, '0.0.0.0', () => console.log('PARTY HUB · http://localhost:' + port + '\nПо Wi-Fi: ' + (urls().join(' ') || 'укажи IPv4 телефона вручную')));
function stop() {
  clearInterval(timer);
  for (const s of clients.values()) s.terminate();
  server.close();
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
