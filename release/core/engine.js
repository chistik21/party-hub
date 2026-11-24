// Shared by Node and Rhino. The transport binds sockets to secret installation keys.
var Hub = function () {
  var names = ['Шпион', 'Мафия', 'Реакция', 'Мем-батл', 'Викторина', 'Правда или ложь', 'Угадай число', 'Ассоциации', 'Кто из нас?', 'Словесная битва', 'Память', 'Найди отличие', 'Цветовой хаос', 'Змейка Online', 'Марафон'];
  var hints = ['Найди шпиона по его ответам', 'Ночные роли, обсуждение и суд', 'Дождись сигнала', 'Придумай подпись к открытке', 'Выбери правильный ответ', 'Отдели факт от вымысла', 'Попади ближе всех к числу', 'Найди общий ход мысли', 'Выбери героя ситуации', 'Собери слова на букву', 'Повтори узор по памяти', 'Заметь лишнюю фигуру', 'Раздели слово и цвет', 'Собирай звёзды на общей карте', 'Сыграй несколько разных игр'];
  var tones = ['#d8364d', '#4949ae', '#087969', '#b95221'],
    colors = ['Красный', 'Синий', 'Зелёный', 'Оранжевый'],
    symbols = ['◆', '●', '▲', '★'];
  function rand(n) {
    return Math.floor(Math.random() * n);
  }
  function mix(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1),
        x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
    return a;
  }
  function keys(o) {
    return Object.keys(o);
  }
  function check(x, msg) {
    if (!x) throw Error(msg || 'Действие сейчас недоступно');
  }
  function text(x, n) {
    check(typeof x === 'string' && x.trim().length && x.length <= n, 'Проверь длину текста');
    return x.trim();
  }
  function norm(x) {
    return x.trim().toLowerCase().replace(/ё/g, 'е');
  }
  function integer(n) {
    return typeof n === 'number' && isFinite(n) && Math.floor(n) === n;
  }
  function newServer(save, read) {
    var rooms = {},
      byKey = {},
      serial = 0;
    function phase(r, p, t) {
      r.phase = p;
      r.until = t ? Date.now() + t : 0;
      r.epoch++;
      r.answers = {};
    }
    function live(r) {
      return r.people.filter(function (p) {
        return !p.watch;
      });
    }
    function member(r, id) {
      return r.people.filter(function (p) {
        return p.id === id;
      })[0];
    }
    function contenders(r) {
      return live(r).filter(function (p) {
        return r.dead.indexOf(p.id) < 0;
      });
    }
    function start(r) {
      var team = live(r);
      check(team.length >= 2 && team.every(function (p) {
        return p.online && (p.ready || p.id === r.host);
      }), 'Нужны два участника и готовность каждого');
      if (r.mode === 1) check(team.length >= 5, 'Для мафии нужны пятеро');
      if (r.mode === 0) check(team.length >= 3, 'Для шпиона нужны трое');
      r.game = r.mode;
      r.image = '';
      r.prompt = 'Подготовьтесь к началу';
      r.secret = {};
      r.memo = {};
      r.tint = '';
      r.dead = [];
      r.match = Date.now() + '-' + ++serial;
      r.round = 0;
      r.played = [];
      r.results = [];
      team.forEach(function (p) {
        p.score = 0;
        p.by = {};
      });
      phase(r, 'Отсчёт', 3000);
    }
    function gain(r, id, n) {
      var p = member(r, id);
      if (p) {
        p.score += n;
        p.by[r.game] = (p.by[r.game] || 0) + n;
      }
    }
    function result(r, msg) {
      r.explain = msg;
      r.results.push(msg);
      phase(r, 'Итоги раунда', 5500);
    }
    function finish(r) {
      phase(r, 'Финал', 0);
      var team = live(r),
        top = Math.max.apply(null, team.map(function (p) {
          return p.score;
        }));
      team.forEach(function (p) {
        if (!p.key) return;
        var f = read(p.key);
        if (f.history.some(function (e) {
          return e.match === r.match;
        })) return;
        f.matches++;
        f.points += p.score;
        var won = p.score === top && top > 0;
        if (won) f.wins++;
        (r.mode === 14 ? r.played.concat([14]) : r.played).filter(function (g, i, a) {
          return a.indexOf(g) === i;
        }).forEach(function (g) {
          var rec = f.games[g] || (f.games[g] = {
            plays: 0,
            best: 0
          });
          rec.plays++;
          rec.best = Math.max(rec.best, p.by[g] || 0);
        });
        f.history.unshift({
          match: r.match,
          date: Date.now(),
          mode: r.mode,
          points: p.score,
          won: won
        });
        save(p.key, f);
      });
    }
    function next(r) {
      if (r.round >= r.rounds) {
        finish(r);
        return;
      }
      r.round++;
      var team = live(r);
      r.dead = [];
      r.game = r.mode === 14 ? mix(names.slice(0, 14).map(function (_, i) {
        return i;
      }).filter(function (i) {
        return (i !== 1 || team.length >= 5) && (i !== 0 || team.length >= 3) && r.played.indexOf(i) < 0;
      }))[0] : r.mode;
      r.played.push(r.game);
      var g = r.game;
      r.options = [];
      r.secret = {};
      r.image = '';
      r.tint = '';
      r.seq = [];
      r.snakes = {};
      r.target = '';
      r.memo = {};
      r.entries = [];
      r.day = 0;
      r.prompt = names[g];
      var ids = mix(team.map(function (p) {
        return p.id;
      }));
      phase(r, 'Ход', r.seconds * 1000);
      if (g === 0) {
        r.places = mix(['Маяк', 'Цирк', 'Аэропорт', 'Киностудия', 'Ледокол', 'Пекарня', 'Обсерватория', 'Аквариум']).slice(0, 5);
        r.target = r.places[0];
        r.spy = ids[0];
        team.forEach(function (p) {
          r.secret[p.id] = p.id === r.spy ? 'Ты шпион' : r.target;
        });
        r.prompt = 'Задавайте вопросы о месте в чате или вслух';
        r.options = mix(r.places);
      }
      if (g === 1) {
        ids.forEach(function (id, i) {
          r.secret[id] = i === 0 ? 'Мафия' : i === 1 ? 'Доктор' : i === 2 ? 'Комиссар' : i > 3 && i % 5 === 0 ? 'Мафия' : 'Мирный житель';
        });
        night(r);
      }
      if (g === 2) {
        r.prompt = 'Жди сигнала…';
        phase(r, 'Ожидание', 1600 + rand(3600));
        r.early = {};
      }
      if (g === 3) {
        r.image = r.custom || '/memes/' + rand(8) + '.svg';
        r.prompt = 'Что здесь происходит? Напиши подпись';
      }
      if (g === 4 || g === 5) {
        var q = BANK[g === 4 ? 'quiz' : 'facts'];
        if (g === 4 && r.category) q = q.filter(function (_, i) {
          return BANK.categories[i] === r.category;
        });
        var z = q[rand(q.length)];
        r.prompt = z[0];
        r.target = z[1];
        r.options = g === 4 ? mix(z.slice(1)) : ['Правда', 'Ложь'];
        r.note = g === 5 ? z[2] : r.target;
      }
      if (g === 6) {
        r.target = 1 + rand(100);
        r.prompt = 'Какое число от 1 до 100 загадал сервер?';
      }
      if (g === 7) r.prompt = 'Первая ассоциация со словом «' + mix(['океан', 'поезд', 'рассвет', 'музыка', 'костёр', 'облако', 'парк', 'зима'])[0] + '»';
      if (g === 8) r.prompt = mix(['Кто придумает название вашей группы?', 'Кто построит самый большой замок из песка?', 'Кто подружится с роботом первым?', 'Кто устроит пикник даже зимой?'])[0];
      if (g === 9) {
        r.target = mix(['к', 'м', 'п', 'с', 'т', 'б', 'л'])[0];
        r.prompt = 'Слова на букву «' + r.target + '» по одному';
        r.words = {};
      }
      if (g === 10) {
        for (var i = 0; i < 3 + r.round; i++) r.seq.push(symbols[rand(4)]);
        r.prompt = 'Запомни последовательность';
        phase(r, 'Запоминание', 4500);
      }
      if (g === 11) {
        r.target = rand(25);
        var pair = mix([['◉', '◎'], ['◆', '◇'], ['▣', '▤']])[0];
        r.options = Array(26).join('x').split('').map(function (_, i) {
          return i === r.target ? pair[1] : pair[0];
        });
        r.prompt = 'Найди отличающийся символ';
      }
      if (g === 12) {
        var ink = rand(4),
          word = (ink + 1 + rand(3)) % 4,
          ask = rand(2);
        r.prompt = (ask ? 'Выбери цвет чернил' : 'Выбери значение слова') + ' · ' + colors[word];
        r.tint = tones[ink];
        r.target = colors[ask ? ink : word];
        r.options = mix(colors);
      }
      if (g === 13) {
        team.forEach(function (p, i) {
          var head = 2 + i % 5 * 6 + 32 * (2 + Math.floor(i / 5) * 4);
          r.snakes[p.id] = {
            body: [head, head - 1],
            dir: 1,
            next: 1,
            alive: true
          };
        });
        r.food = [];
        for (var j = 0; j < team.length + 2; j++) food(r);
        r.tick = Date.now();
        r.prompt = 'Собирайте звёзды. Берегитесь стен и хвостов';
      }
      r.began = Date.now();
    }
    function food(r) {
      var used = r.food.slice();
      keys(r.snakes).forEach(function (k) {
        used = used.concat(r.snakes[k].body);
      });
      var free = [];
      for (var i = 0; i < 768; i++) if (used.indexOf(i) < 0) free.push(i);
      if (free.length) r.food.push(free[rand(free.length)]);
    }
    function move(r) {
      var heads = {},
        used = [];
      keys(r.snakes).forEach(function (k) {
        var s = r.snakes[k];
        if (s.alive) {
          used = used.concat(s.body);
          s.dir = s.next;
          var h = s.body[0];
          var n = h + s.dir;
          if (n < 0 || n >= 768 || Math.abs(n % 32 - h % 32) > 1) n = -1;
          heads[k] = n;
        }
      });
      keys(heads).forEach(function (k) {
        var s = r.snakes[k],
          n = heads[k];
        if (n < 0 || used.indexOf(n) >= 0 || keys(heads).some(function (j) {
          return j !== k && heads[j] === n;
        })) {
          s.alive = false;
          return;
        }
        s.body.unshift(n);
        var idx = r.food.indexOf(n);
        if (idx < 0) s.body.pop();else {
          r.food.splice(idx, 1);
          gain(r, k, 100);
          food(r);
        }
      });
      var left = keys(heads).filter(function (k) {
        return r.snakes[k].alive;
      });
      if (left.length <= 1) {
        if (left.length) gain(r, left[0], 200);
        result(r, 'За каждую звезду — 100 очков');
      }
    }
    function night(r) {
      r.day++;
      phase(r, 'Ночь', r.seconds * 1000);
      r.prompt = 'Ночные роли выбирают участника';
    }
    function mafiaEnd(r) {
      var a = contenders(r),
        bad = a.filter(function (p) {
          return r.secret[p.id] === 'Мафия';
        }).length;
      if (bad && bad < a.length - bad) return false;
      live(r).forEach(function (p) {
        if (r.secret[p.id] === 'Мафия' === !!bad) gain(r, p.id, 300);
      });
      result(r, bad ? 'Победила мафия' : 'Город победил');
      return true;
    }
    function most(values) {
      var c = {};
      values.forEach(function (v) {
        c[v] = (c[v] || 0) + 1;
      });
      var order = keys(c).sort(function (a, b) {
        return c[b] - c[a];
      });
      return order.length && c[order[0]] !== c[order[1]] ? order[0] : '';
    }
    function advance(r) {
      var a = r.answers,
        ids = keys(a),
        g = r.game,
        vals = ids.map(function (k) {
          return a[k];
        });
      if (r.phase === 'Отсчёт' || r.phase === 'Итоги раунда') {
        next(r);
        return;
      }
      if (r.phase === 'Колесо') {
        phase(r, 'Лобби', 0);
        return;
      }
      if (r.phase === 'Ожидание') {
        r.prompt = 'Жми сейчас!';
        r.began = Date.now();
        phase(r, 'Сигнал', 5000);
        return;
      }
      if (r.phase === 'Запоминание') {
        r.prompt = 'Повтори последовательность';
        phase(r, 'Ответ', r.seconds * 1000);
        return;
      }
      if (g === 0 && r.phase === 'Ход') {
        r.prompt = 'Кто шпион?';
        phase(r, 'Голосование', 20000);
        return;
      }
      if (g === 1) {
        if (r.phase === 'Ночь') {
          var victims = [],
            safe = '';
          ids.forEach(function (id) {
            var role = r.secret[id];
            if (role === 'Мафия') victims.push(a[id]);
            if (role === 'Доктор') safe = a[id];
            if (role === 'Комиссар') r.memo[id] = member(r, a[id]).name + ' · ' + (r.secret[a[id]] === 'Мафия' ? 'мафия' : 'горожанин');
          });
          var v = most(victims);
          if (v && v !== safe) r.dead.push(v);
          r.prompt = v && v !== safe ? 'Ночью выбыл ' + member(r, v).name : 'Ночью все выжили';
          if (!mafiaEnd(r)) phase(r, 'Обсуждение', r.seconds * 1000);
          return;
        }
        if (r.phase === 'Обсуждение') {
          r.prompt = 'Кого исключить?';
          phase(r, 'Голосование', 20000);
          return;
        }
        var out = most(vals);
        if (out) r.dead.push(out);
        if (!mafiaEnd(r)) {
          if (r.day >= 10) result(r, 'После десяти дней объявлена ничья');else night(r);
        }
        return;
      }
      if (g === 3 && r.phase === 'Ход') {
        r.entries = mix(ids.map(function (id) {
          return {
            id: id,
            text: a[id]
          };
        }));
        if (r.entries.length > 1) {
          r.prompt = 'Выбери самую смешную подпись';
          phase(r, 'Голосование', 20000);
          return;
        }
      }
      var msg = '';
      if (g === 0) {
        var found = most(vals) === r.spy;
        live(r).forEach(function (p) {
          if (p.id !== r.spy === found) gain(r, p.id, 200);
        });
        msg = 'Шпион — ' + member(r, r.spy).name + '. Место — ' + r.target;
      }
      if (g === 2) {
        ids.sort(function (i, j) {
          return a[i] - a[j];
        });
        ids.forEach(function (k, i) {
          gain(r, k, Math.max(20, 200 - 20 * i));
        });
        msg = ids.length ? 'Быстрее всех ' + member(r, ids[0]).name + ' · ' + a[ids[0]] + ' мс' : 'Никто не успел';
      }
      if (g === 3 && r.phase === 'Голосование') {
        vals.forEach(function (k) {
          gain(r, k, 100);
        });
        var winner = most(vals);
        msg = winner ? 'Подпись раунда · ' + r.entries.filter(function (e) {
          return e.id === winner;
        })[0].text : 'Голоса разделились';
      }
      if (g === 4 || g === 5 || g === 12) {
        ids.forEach(function (k) {
          if (a[k] === r.target) gain(r, k, 100);
        });
        msg = g === 5 ? r.target + '. ' + r.note : 'Ответ · ' + r.target;
      }
      if (g === 6) {
        var dist = Math.min.apply(null, vals.map(function (n) {
          return Math.abs(r.target - n);
        }));
        ids.forEach(function (k) {
          if (Math.abs(a[k] - r.target) === dist) gain(r, k, 200);
        });
        msg = 'Загаданное число · ' + r.target;
      }
      if (g === 7) {
        ids.forEach(function (k) {
          var count = vals.filter(function (x) {
            return x === a[k];
          }).length;
          gain(r, k, 50 * (count - 1));
        });
        msg = vals.join(' · ');
      }
      if (g === 8) {
        vals.forEach(function (k) {
          gain(r, k, 50);
        });
        var chosen = most(vals);
        msg = chosen ? 'Компания выбрала ' + member(r, chosen).name : 'Голоса разделились';
      }
      if (g === 9) msg = 'По 20 очков за каждое принятое слово';
      if (g === 10) {
        ids.forEach(function (k) {
          if (a[k] === r.seq.join('')) gain(r, k, 150);
        });
        msg = r.seq.join(' ');
      }
      if (g === 11) {
        ids.filter(function (k) {
          return a[k].right;
        }).sort(function (i, j) {
          return a[i].ms - a[j].ms;
        }).forEach(function (k, i) {
          gain(r, k, Math.max(20, 200 - i * 15));
        });
        msg = 'Отличие в ячейке ' + (r.target + 1);
      }
      result(r, msg || 'Раунд завершён');
    }
    function options(r, p) {
      var g = r.game;
      if (r.phase === 'Ночь' || r.phase === 'Голосование' && g !== 3 || g === 8) return contenders(r).filter(function (q) {
        return q.id !== p.id || r.phase === 'Ночь' && r.secret[p.id] === 'Доктор';
      }).map(function (q) {
        return [q.id, q.name];
      });
      if (g === 3 && r.phase === 'Голосование') return r.entries.filter(function (e) {
        return e.id !== p.id;
      }).map(function (e) {
        return [e.id, e.text];
      });
      if (g === 2) return [['tap', r.phase === 'Сигнал' ? 'Жми!' : 'Ждать сигнала']];
      if (g === 13) return [['-32', '↑'], ['-1', '←'], ['1', '→'], ['32', '↓']];
      if (g === 10) return symbols.map(function (x) {
        return [x, x];
      });
      return r.options.map(function (x, i) {
        return [g === 11 ? String(i) : x, x];
      });
    }
    function allowed(r, p) {
      if (p.watch || r.dead.indexOf(p.id) >= 0 || r.answers[p.id] !== undefined) return false;
      if (['Лобби', 'Колесо', 'Отсчёт', 'Запоминание', 'Обсуждение', 'Итоги раунда', 'Финал'].indexOf(r.phase) >= 0) return false;
      if (r.game === 1 && r.phase === 'Ночь' && r.secret[p.id] === 'Мирный житель') return false;
      if (r.game === 0 && r.phase === 'Ход' && p.id !== r.spy) return false;
      if (r.game === 2 && r.early[p.id]) return false;
      return r.game !== 13 || r.snakes[p.id].alive;
    }
    function answer(r, p, x) {
      check(allowed(r, p));
      var g = r.game,
        id = p.id;
      check(typeof x === 'string' && x.length <= 160);
      if (g === 10) {
        check(x.length > 0 && x.length <= 20 && x.split('').every(function (c) {
          return symbols.indexOf(c) >= 0;
        }));
      } else if (options(r, p).length) check(options(r, p).some(function (o) {
        return o[0] === x;
      }));else x = text(x, 140);
      if (g === 0 && r.phase === 'Ход') {
        if (x === r.target) {
          gain(r, id, 300);
          result(r, 'Шпион угадал место · ' + x);
        } else {
          r.answers[id] = x;
          advance(r);
        }
        return;
      }
      if (g === 2) {
        if (r.phase === 'Ожидание') {
          r.early[id] = true;
          gain(r, id, -50);
          return;
        }
        x = Math.max(0, Date.now() - r.began - Math.min(120, p.rtt / 2)) | 0;
      }
      if (g === 6) {
        check(/^\d{1,3}$/.test(x) && +x >= 1 && +x <= 100, 'Введи число от 1 до 100');
        x = +x;
      }
      if (g === 7) x = norm(x);
      if (g === 9) {
        x = norm(x);
        check(/^[а-я]{2,35}$/.test(x) && x[0] === r.target && !r.words[x], 'Нужно новое слово на заданную букву');
        r.words[x] = id;
        gain(r, id, 20);
        return;
      }
      if (g === 11) x = {
        right: +x === r.target,
        ms: Date.now() - r.began
      };
      if (g === 13) {
        var s = r.snakes[id];
        if (+x !== -s.dir) s.next = +x;
        return;
      }
      r.answers[id] = x;
      if (!live(r).some(function (q) {
        return allowed(r, q);
      })) advance(r);
    }
    function release(r, p) {
      p.online = false;
      if (r.host === p.id) {
        var other = r.people.filter(function (q) {
          return q.online && !q.watch;
        })[0];
        if (other) r.host = other.id;
      }
    }
    function view(r, p) {
      var active = r.phase !== 'Лобби' && r.phase !== 'Колесо',
        g = r.game;
      return {
        v: 1,
        code: r.code,
        id: p.id,
        host: r.host,
        mode: r.mode,
        category: r.category || '',
        game: g,
        phase: r.phase,
        epoch: r.epoch,
        until: r.until,
        now: Date.now(),
        round: r.round,
        rounds: r.rounds,
        seconds: r.seconds,
        excluded: r.excluded,
        theme: r.theme,
        chat: r.chat,
        wheel: r.wheel,
        sectors: r.sectors || [],
        people: r.people.map(function (q) {
          return {
            id: q.id,
            name: q.name,
            avatar: q.avatar,
            score: q.score,
            ready: q.ready,
            online: q.online,
            watch: q.watch,
            vote: q.vote,
            rtt: q.rtt
          };
        }),
        prompt: r.phase === 'Итоги раунда' ? r.explain : r.prompt,
        can: active && allowed(r, p),
        options: active && allowed(r, p) ? options(r, p) : [],
        role: r.secret[p.id] || '',
        info: r.memo[p.id] || '',
        out: r.dead.indexOf(p.id) >= 0,
        image: r.image,
        tint: r.tint,
        seq: r.phase === 'Запоминание' ? r.seq : [],
        snakes: r.snakes,
        food: r.food || [],
        match: r.match || '',
        input: g === 10 ? 'sequence' : g === 6 ? 'number' : 'text',
        moments: r.phase === 'Финал' ? r.results : []
      };
    }
    function handle(key, d) {
      check(/^[0-9a-f]{48}$/.test(key) && d.v === 1, 'Нужен протокол версии 1');
      var r = rooms[byKey[key]],
        p = r && r.people.filter(function (q) {
          return q.key === key;
        })[0],
        op = d.op;
      if (op === 'profile') {
        var f = read(key),
          badges = [];
        names.forEach(function (n, i) {
          var stat = f.games[i] || {
            plays: 0,
            best: 0
          };
          [1, 5, 15].forEach(function (t) {
            badges.push({
              title: n + ' · ' + t + ' игр',
              ok: stat.plays >= t
            });
          });
        });
        [1, 3, 5, 10, 25].forEach(function (t) {
          badges.push({
            title: 'Побед · ' + t,
            ok: f.wins >= t
          });
        });
        f.badges = badges;
        f.level = 1 + Math.floor(Math.sqrt(Math.max(0, f.points) / 100));
        f.title = f.wins >= 10 ? 'Легенда гостиной' : f.wins >= 3 ? 'Знаток вечеринки' : f.matches >= 1 ? 'Участник клуба' : 'Новичок';
        f.frame = f.wins >= 10 ? 'Золотая рамка' : f.wins >= 3 ? 'Серебряная рамка' : f.wins >= 1 ? 'Бронзовая рамка' : 'Базовая рамка';
        return {
          career: f
        };
      }
      if (op === 'enter') {
        if (p) {
          p.online = true;
          if (!member(r, r.host).online && !p.watch) r.host = p.id;
          return {};
        }
        var name = text(d.name, 20),
          code = d.code;
        if (code === null) {
          var pool = [];
          for (var i = 0; i < 100; i++) {
            var c = ('0' + i).slice(-2);
            if (!rooms[c]) pool.push(c);
          }
          check(pool.length, 'Все комнаты заняты');
          code = mix(pool)[0];
          rooms[code] = {
            code: code,
            people: [],
            host: '',
            phase: 'Лобби',
            mode: integer(d.mode) && names[d.mode] ? d.mode : 4,
            game: 4,
            rounds: 3,
            seconds: 30,
            round: 0,
            epoch: 0,
            until: 0,
            chat: [],
            secret: {},
            memo: {},
            dead: [],
            answers: {},
            options: [],
            excluded: [],
            theme: 'expressive',
            snakes: {},
            wheel: 0,
            prompt: '',
            results: []
          };
        }
        r = rooms[code];
        check(r && /^\d\d$/.test(code), 'Комната не найдена');
        check(r.people.length < 30, 'Все места заняты');
        check(r.phase === 'Лобби' || d.watch, 'Матч уже идёт. Доступен просмотр');
        p = {
          key: key,
          id: String(++serial),
          name: name,
          avatar: integer(d.avatar) && d.avatar >= 0 && d.avatar < 12 ? d.avatar : 0,
          score: 0,
          watch: !!d.watch && r.people.length > 0,
          ready: false,
          online: true,
          vote: -1,
          rtt: 0
        };
        r.people.push(p);
        byKey[key] = code;
        if (!r.host) r.host = p.id;
        var profile = read(key);
        profile.name = name;
        profile.avatar = p.avatar;
        save(key, profile);
        return {};
      }
      check(r && p, 'Комната закрыта');
      if (op === 'resume') {
        p.online = true;
        if (!member(r, r.host).online && !p.watch) r.host = p.id;
        return {};
      }
      if (op === 'leave' || op === 'kick') {
        var q = op === 'leave' ? p : member(r, d.id);
        check(q && (op === 'leave' || p.id === r.host && q !== p && r.phase === 'Лобби'));
        release(r, q);
        delete byKey[q.key];
        if (r.phase === 'Лобби' || r.phase === 'Финал' || q.watch) {
          r.people.splice(r.people.indexOf(q), 1);
          if (r.host === q.id && r.people.length) {
            r.host = r.people[0].id;
            r.people[0].watch = false;
          }
        } else {
          q.departed = true;
          q.key = null;
        }
        if (!r.people.length) delete rooms[r.code];
        return {};
      }
      if (op === 'chat' || op === 'react') {
        check(!p.lastChat || Date.now() - p.lastChat >= 600, 'Небольшая пауза между сообщениями');
        p.lastChat = Date.now();
        r.chat.push(p.name + ' · ' + text(d.value, 160));
        r.chat = r.chat.slice(-40);
        return {};
      }
      if (op === 'voteMode') {
        check(r.phase === 'Лобби' && !p.watch && integer(d.value) && names[d.value]);
        p.vote = d.value;
        return {};
      }
      if (op === 'ready') {
        check(r.phase === 'Лобби' && !p.watch);
        p.ready = !p.ready;
        return {};
      }
      if (op === 'answer') {
        check(d.epoch === r.epoch && (!r.until || Date.now() < r.until), 'Этап завершён');
        answer(r, p, d.value);
        return {};
      }
      check(r.host === p.id, 'Доступно ведущему');
      if (op === 'again') {
        check(r.phase === 'Финал');
        r.people = r.people.filter(function (q) {
          return !q.departed;
        });
        phase(r, 'Лобби', 0);
        r.people.forEach(function (q) {
          q.ready = false;
        });
        return {};
      }
      check(r.phase === 'Лобби');
      if (op === 'options') {
        check(integer(d.mode) && names[d.mode] && [1, 3, 5].indexOf(d.rounds) >= 0 && [15, 30, 60].indexOf(d.seconds) >= 0);
        r.mode = d.mode;
        r.rounds = d.mode === 14 ? Math.max(3, d.rounds) : d.rounds;
        r.seconds = d.seconds;
        if (typeof d.category === 'string' && (d.category === '' || BANK.categories.indexOf(d.category) >= 0)) r.category = d.category;
        if (typeof d.theme === 'string') r.theme = d.theme.slice(0, 15);
      } else if (op === 'exclude') {
        check(integer(d.value) && names[d.value]);
        var j = r.excluded.indexOf(d.value);
        if (j < 0) r.excluded.push(d.value);else r.excluded.splice(j, 1);
      } else if (op === 'votes') {
        var picks = live(r).filter(function(q){return q.online && q.vote>=0}).map(function(q){return String(q.vote)});
        check(picks.length,'Пока нет голосов');
        var chosen=most(picks);check(chosen!=='','Ничья. Измените голос или используйте колесо');
        r.mode=Number(chosen);if(r.mode===14)r.rounds=Math.max(3,r.rounds);
      } else if (op === 'wheel') {
        var eligible = names.map(function (_, i) {
          return i;
        }).filter(function (i) {
          return r.excluded.indexOf(i) < 0 && (i !== 1 || live(r).length >= 5) && (i !== 0 || live(r).length >= 3);
        });
        check(eligible.length, 'Добавь хотя бы один доступный режим');
        r.sectors = eligible;
        r.mode = mix(eligible)[0];if(r.mode===14)r.rounds=Math.max(3,r.rounds);
        r.wheel++;
        phase(r, 'Колесо', 3400);
      } else if (op === 'image') {
        check(d.value === null || typeof d.value === 'string' && d.value.length < 175000 && /^data:image\/(jpeg|png);base64,[a-zA-Z0-9+/]+=*$/.test(d.value));
        r.custom = d.value;
      } else if (op === 'start') start(r);else check(false);
      return {};
    }
    return {
      rooms: rooms,
      handle: handle,
      state: function (k) {
        var r = rooms[byKey[k]];
        return r ? view(r, r.people.filter(function (p) {
          return p.key === k;
        })[0]) : null;
      },
      offline: function (k) {
        var r = rooms[byKey[k]];
        if (r) release(r, r.people.filter(function (p) {
          return p.key === k;
        })[0]);
      },
      ping: function (k, ms) {
        var r = rooms[byKey[k]];
        if (r) r.people.forEach(function (p) {
          if (p.key === k) p.rtt = ms;
        });
      },
      tick: function () {
        var changed = false;
        keys(rooms).forEach(function (c) {
          var r = rooms[c];
          if (!r.people.some(function (p) {
            return p.online;
          })) {
            if (!r.empty) r.empty = Date.now();
            if (Date.now() - r.empty > 120000) {
              r.people.forEach(function (p) {
                if (byKey[p.key] === r.code) delete byKey[p.key];
              });
              delete rooms[c];
            }
            return;
          }
          r.empty = 0;
          if (r.until && Date.now() >= r.until) {
            advance(r);
            changed = true;
          } else if (r.game === 13 && r.phase === 'Ход' && Date.now() - r.tick >= 230) {
            move(r);
            r.tick = Date.now();
            changed = true;
          }
        });
        return changed;
      }
    };
  }
  return {
    names: names,
    hints: hints,
    create: newServer,
    blank: function () {
      return {
        matches: 0,
        points: 0,
        wins: 0,
        games: {},
        history: []
      };
    }
  };
}();
