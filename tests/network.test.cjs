const {
    test
  } = require('node:test'),
  assert = require('node:assert/strict'),
  {
    spawn
  } = require('node:child_process'),
  {
    once
  } = require('node:events'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  {
    WebSocket
  } = require('ws');
test('Автономный HTTP, 30 WebSocket-клиентов, возврат профиля', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'party-hub-'));
  let p;
  const sockets = [];
  try {
    fs.cpSync('release', root, {
      recursive: true
    });
    p = spawn(process.execPath, ['server.cjs'], {
      cwd: root,
      env: {
        ...process.env,
        PORT: 34190
      }
    });
    await once(p.stdout, 'data');
    assert.equal((await fetch('http://127.0.0.1:34190')).status, 200);
    async function peer(i) {
      const s = new WebSocket('ws://127.0.0.1:34190/hub');
      sockets.push(s);
      await once(s, 'open');
      const until = pred => new Promise((resolve, reject) => {
        const to = setTimeout(() => {
          s.off('message', cb);
          reject(Error('Нет ответа'));
        }, 3000);
        function cb(raw) {
          const d = JSON.parse(raw);
          if (pred(d)) {
            clearTimeout(to);
            s.off('message', cb);
            resolve(d);
          }
        }
        s.on('message', cb);
      });
      const send = (op, extra = {}) => s.send(JSON.stringify({
        v: 1,
        op,
        ...extra
      }));
      const hello = until(d => d.career);
      send('hello', {
        key: String(i).padStart(48, '0')
      });
      await hello;
      return {
        s,
        until,
        send
      };
    }
    let code, id;
    for (let i = 1; i <= 30; i++) {
      const h = await peer(i),
        wait = h.until(d => d.state?.people.length === i);
      h.send('enter', {
        code: code ?? null,
        name: 'Игрок ' + i
      });
      const d = await wait;
      code = d.state.code;
      id = d.state.id;
    }
    const h = await peer(30),
      wait = h.until(d => d.state?.id === id);
    h.send('resume');
    assert.equal((await wait).state.people.length, 30);
    const extra = await peer(31),
      err = extra.until(d => d.error);
    extra.send('enter', {
      code,
      name: 'Ещё'
    });
    assert.match((await err).error, /заняты/);
  } finally {
    sockets.forEach(s => s.terminate());
    if (p) {
      const end = once(p, 'exit');
      p.kill();
      await end;
    }
    fs.rmSync(root, {
      recursive: true,
      force: true
    });
  }
});
