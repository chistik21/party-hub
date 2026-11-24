const {
  test
} = require('node:test');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const {
    spawn
  } = require('node:child_process'),
  {
    once
  } = require('node:events'),
  {
    WebSocket
  } = require('ws');
test('Две сессии проходят матч, статистика переживает перезапуск процесса', {
  timeout: 22000
}, async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-store-'));
  const keys = ['a'.repeat(48), 'b'.repeat(48)],
    sockets = [];
  let p;
  async function start() {
    p = spawn(process.execPath, [path.resolve('release/server.cjs')], {
      cwd: work,
      env: {
        ...process.env,
        PORT: '34191'
      }
    });
    await once(p.stdout, 'data');
  }
  async function stop() {
    if (!p) return;
    const end = once(p, 'exit');
    p.kill();
    await end;
    p = null;
  }
  async function peer(key) {
    const s = new WebSocket('ws://127.0.0.1:34191/hub');
    sockets.push(s);
    let career, state;
    s.on('message', raw => {
      const m = JSON.parse(raw);
      if (m.career) career = m.career;
      if (m.state) state = m.state;
    });
    await once(s, 'open');
    const send = (op, data = {}) => s.send(JSON.stringify({
      v: 1,
      op,
      ...data
    }));
    send('hello', {
      key
    });
    async function wait(fn) {
      const max = Date.now() + 7500;
      while (!fn()) {
        if (Date.now() > max) throw Error('Нет ожидаемого этапа');
        await new Promise(r => setTimeout(r, 15));
      }
      return fn();
    }
    await wait(() => career);
    return {
      send,
      wait,
      get state() {
        return state;
      },
      get career() {
        return career;
      }
    };
  }
  try {
    await start();
    const a = await peer(keys[0]),
      b = await peer(keys[1]);
    a.send('enter', {
      code: null,
      name: 'Первая'
    });
    await a.wait(() => a.state);
    b.send('enter', {
      code: a.state.code,
      name: 'Второй'
    });
    await b.wait(() => b.state);
    b.send('ready');
    await a.wait(() => a.state.people[1]?.ready);
    a.send('options', {
      mode: 6,
      rounds: 1,
      seconds: 15
    });
    a.send('start');
    await a.wait(() => a.state.phase === 'Ход');
    await b.wait(() => b.state.phase === 'Ход');
    assert.equal(a.state.until, b.state.until);
    a.send('answer', {
      epoch: a.state.epoch,
      value: '50'
    });
    b.send('answer', {
      epoch: b.state.epoch,
      value: '50'
    });
    await a.wait(() => a.state.phase === 'Итоги раунда');
    await a.wait(() => a.state.phase === 'Финал');
    await stop();
    await start();
    for (const k of keys) {
      const h = await peer(k);
      assert.equal(h.career.matches, 1);
      assert.equal(h.career.wins, 1);
      assert.equal(h.career.history[0].points, 200);
      assert.equal(h.career.badges.length, 50);
    }
  } finally {
    sockets.forEach(s => s.terminate());
    await stop();
    fs.rmSync(work, {
      recursive: true,
      force: true
    });
  }
});
