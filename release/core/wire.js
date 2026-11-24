// Host supplies persist(key,json), restore(key), sendTo(connection,json).
var Wire = function () {
  var game = Hub.create(function (k, f) {
    persist(k, JSON.stringify(f));
  }, function (k) {
    var x = restore(k);
    return x ? JSON.parse(x) : Hub.blank();
  });
  var peers = {},
    owner = {},
    lastPing = 0,
    cache = {},
    budget = {};
  function emit(id, obj) {
    sendTo(id, JSON.stringify(obj));
  }
  function broadcast() {
    Object.keys(peers).forEach(function (id) {
      var k = peers[id],
        s = game.state(k);
      if (s) s.now = 0;
      var cmp = JSON.stringify(s);
      if (cache[id] !== cmp) {
        cache[id] = cmp;
        if (s) s.now = Date.now();
        emit(id, {
          v: 1,
          state: s
        });
      }
    });
  }
  function close(id) {
    var k = peers[id];
    delete peers[id];
    delete cache[id];
    delete budget[id];
    if (k && owner[k] === id) {
      delete owner[k];
      game.offline(k);
      broadcast();
    }
  }
  function message(id, raw) {
    try {
      var b = budget[id] || (budget[id] = {
        t: 0,
        n: 0
      });
      if (Date.now() - b.t > 1000) {
        b.t = Date.now();
        b.n = 0;
      }
      if (++b.n > 24) return;
      if (raw.length > 180000) throw Error('Слишком большое сообщение');
      var d = JSON.parse(raw);
      if (d.v !== 1) throw Error('Обнови приложение');
      if (d.op === 'hello') {
        if (peers[id] || typeof d.key !== 'string' || !/^[0-9a-f]{48}$/.test(d.key)) throw Error('Некорректный ключ');
        var old = owner[d.key];
        if (old) {
          delete peers[old];
          delete cache[old];
          emit(old, {
            v: 1,
            error: 'Профиль открыт на другом экране',
            state: null
          });
        }
        peers[id] = d.key;
        owner[d.key] = id;
        var s = game.state(d.key);
        if (s) game.handle(d.key, {
          v: 1,
          op: 'resume'
        });
        emit(id, {
          v: 1,
          career: game.handle(d.key, {
            v: 1,
            op: 'profile'
          }).career
        });
        broadcast();
        return;
      }
      var key = peers[id];
      if (!key) throw Error('Сначала подключись');
      if (d.op === 'pong') {
        if (b.ping === d.value) {
          game.ping(key, Date.now() - b.ping);
          b.ping = 0;
        }
        return;
      }
      if (d.op === 'resume') delete cache[id];
      var res = game.handle(key, d);
      if (res.career) emit(id, {
        v: 1,
        career: res.career
      });
      broadcast();
    } catch (e) {
      emit(id, {
        v: 1,
        error: String(e.message || e)
      });
    }
  }
  function tick() {
    if (game.tick()) broadcast();
    if (Date.now() - lastPing > 5000) {
      lastPing = Date.now();
      Object.keys(peers).forEach(function (id) {
        budget[id].ping = lastPing;
        emit(id, {
          v: 1,
          ping: lastPing
        });
      });
    }
  }
  return {
    message: message,
    close: close,
    tick: tick,
    info: function () {
      return {
        rooms: Object.keys(game.rooms).length,
        connections: Object.keys(peers).length
      };
    }
  };
}();
