const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
function fixture() {
  let clock = 1000;
  class Clock extends Date {
    static now() {
      return clock;
    }
  }
  const context = vm.createContext({
      Date: Clock
    }),
    files = {};
  for (const n of ['bank', 'engine']) vm.runInContext(fs.readFileSync('core/' + n + '.js', 'utf8'), context);
  const game = context.Hub.create((k, v) => files[k] = JSON.stringify(v), k => files[k] ? JSON.parse(files[k]) : context.Hub.blank());
  const keys = Array.from({
      length: 5
    }, (_, i) => ('' + (i + 1)).padStart(48, '0')),
    call = (i, op, fields = {}) => game.handle(keys[i], {
      v: 1,
      op,
      ...fields
    });
  call(0, 'enter', {
    name: 'А',
    code: null
  });
  const code = game.state(keys[0]).code;
  for (let i = 1; i < keys.length; i++) {
    call(i, 'enter', {
      code,
      name: 'И' + i
    });
    call(i, 'ready');
  }
  return {
    game,
    keys,
    call,
    r: game.rooms[code],
    files,
    time(n) {
      clock += n;
      game.tick();
    },
    state(i) {
      return game.state(keys[i]);
    }
  };
}
for (let mode = 0; mode < 15; mode++) test('Полная партия · режим ' + mode, () => {
  const f = fixture(),
    r = f.r;
  f.call(0, 'options', {
    mode,
    rounds: mode === 14 ? 3 : 1,
    seconds: 15
  });
  f.call(0, 'start');
  f.time(3001);
  const answer = (i, value) => f.call(i, 'answer', {
    value: String(value),
    epoch: r.epoch
  });
  let loops = 0;
  while (r.phase !== 'Финал' && loops++ < 120) {
    const epoch = r.epoch,
      g = r.game;
    if (r.phase === 'Запоминание') {
      assert.ok(f.state(0).seq.length);
      f.time(5001);
      assert.equal(f.state(0).seq.length, 0);
      continue;
    }
    if (r.phase === 'Ожидание') {
      const before = r.people[0].score;
      answer(0, 'tap');
      assert.equal(r.people[0].score, before - 50);
      f.time(6000);
      continue;
    }
    if (g === 13 && r.phase === 'Ход') {
      answer(0, '32');
      const h = r.snakes[r.people[0].id].body[0];
      f.time(240);
      assert.equal(r.snakes[r.people[0].id].body[0], h + 32);
      f.time(16000);
      continue;
    }
    for (let i = 0; i < 5 && r.epoch === epoch; i++) {
      const v = f.state(i);
      if (!v.can) continue;
      let value = v.options[0]?.[0] ?? 'Пингвин';
      if (g === 0 && r.phase === 'Ход') {
        assert.equal(v.role, 'Ты шпион');
        value = r.options.find(x => x !== r.target);
      }
      if (g === 1 && r.phase === 'Голосование') {
        const bad = v.options.find(o => r.secret[o[0]] === 'Мафия');
        value = bad?.[0] ?? value;
      }
      if (g === 3 && r.phase === 'Голосование') assert.ok(!v.options.some(o => o[0] === v.id));
      if ([4, 5, 12].includes(g)) value = r.target;
      if (g === 6) value = 50 + i;
      if (g === 9) value = r.target + 'от';
      if (g === 10) value = r.seq.join('');
      if (g === 11) value = r.target;
      if (g !== 9 || i === 0) answer(i, value);
    }
    if (r.epoch === epoch) f.time(65000);
  }
  assert.equal(r.phase, 'Финал');
  assert.equal(Object.keys(f.files).length, 5);
  assert.equal(JSON.parse(Object.values(f.files)[0]).matches, 1);
});
test('Валидация, возврат идентичности, тайные роли, зрители, колесо', () => {
  const f = fixture(),
    r = f.r;
  assert.match(r.code, /^\d{2}$/);
  assert.throws(() => f.call(1, 'start'));
  f.game.offline(f.keys[0]);
  assert.equal(f.state(1).host, f.state(1).id);
  f.call(0, 'resume');
  assert.equal(r.people.length, 5);
  f.call(0, 'ready');
  f.call(1, 'exclude', {
    value: 5
  });
  f.call(1, 'wheel');
  assert.notEqual(r.mode, 5);
  f.time(4000);
  f.call(1, 'options', {
    mode: 0,
    rounds: 1,
    seconds: 15
  });
  f.call(1, 'start');
  f.time(4000);
  const spy = r.people.findIndex(p => p.id === r.spy);
  assert.ok(!JSON.stringify(f.state(spy)).includes('"target"'));
  const key = 'a'.repeat(48);
  f.game.handle(key, {
    v: 1,
    op: 'enter',
    code: r.code,
    name: 'Зритель',
    watch: true
  });
  assert.equal(f.game.state(key).role, '');
  assert.equal(f.game.state(key).can, false);
  assert.throws(() => f.call(spy, 'answer', {
    epoch: -1,
    value: r.target
  }));
});
