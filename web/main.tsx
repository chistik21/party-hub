import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import QR from 'qrcode';
import themes from '../core/design.json';
import './style.css';
import { cue, configure, unlock } from './sound';
import { Confetti, Wheel } from './celebration';
const names = 'Шпион|Мафия|Реакция|Мем-батл|Викторина|Правда или ложь|Угадай число|Ассоциации|Кто из нас?|Словесная битва|Память|Найди отличие|Цветовой хаос|Змейка Online|Марафон'.split('|');
const hints = ['Обсудите тайное место и найдите шпиона.', 'Расследуйте по ночам, голосуйте днём.', 'Жмите сразу после сигнала.', 'Придумайте подпись к картинке.', 'Выберите один из четырёх ответов.', 'Проверьте утверждение.', 'Назовите число от 1 до 100.', 'Найдите совпадающие ассоциации.', 'Выберите героя ситуации.', 'Соберите слова на одну букву.', 'Запомните порядок фигур.', 'Найдите особую ячейку.', 'Различите цвет слова и его смысл.', 'Собирайте звёзды и избегайте столкновений.', 'Сыграйте серию разных мини-игр.'];
const avatars = Array.from('🦊🐼🐸🐯🐰🐙🦁🐨🐧🐻🐱🦄'),
  keys = Object.keys(themes);
function stored(k, init) {
  try {
    return JSON.parse(localStorage.getItem('ph.' + k)) ?? init;
  } catch {
    return init;
  }
}
function put(k, v) {
  localStorage.setItem('ph.' + k, JSON.stringify(v));
}
let key = stored('key', '');
if (!key) {
  key = Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
  put('key', key);
}
function App() {
  const [s, S] = useState<any>(null),
    [career, C] = useState<any>({
      history: [],
      games: {},
      badges: []
    }),
    [online, O] = useState(false),
    [err, E] = useState(''),
    [page, P] = useState('Играть'),
    [modal, M] = useState(new URLSearchParams(location.search).has('room') ? 'join' : ''),
    [name, N] = useState(stored('name', '')),
    [av, A] = useState(stored('avatar', 0)),
    [code, K] = useState(new URLSearchParams(location.search).get('room') || ''),
    [watch, W] = useState(false),
    [preview, V] = useState(4),
    [ip, I] = useState(stored('server', location.origin)),
    [endpoint, Connect] = useState(stored('server', location.origin)),
    [lan, L] = useState(''),
    [qr, Q] = useState(''),
    [input, T] = useState(''),
    [chat, H] = useState(''),
    [time, Time] = useState(Date.now()),
    [theme, Theme] = useState(stored('theme', 'expressive')),
    [policy, Policy] = useState(stored('policy', 'fixed')),
    [quality, Quality] = useState(stored('quality', 'auto')),
    [grade, Grade] = useState('balanced'),
    [vol, Vol] = useState(stored('vol', .25)),
    [vib, Vib] = useState(stored('vib', true));
  const [music, Music] = useState(stored('music', false));
  useEffect(() => configure(vol, music), [vol, music]);
  const previous = useRef({
    players: 0,
    score: 0,
    badges: -1,
    chat: 0
  });
  useEffect(() => {
    const p = previous.current;
    let score = s?.people.find(q => q.id === s.id)?.score || 0,
      players = s?.people.length || 0,
      b = career.badges.filter(q => q.ok).length,
      chat = s?.chat.length || 0;
    if (p.badges >= 0 && b > p.badges) cue('unlock');else if (score > p.score) cue('right');else if (p.players > 0 && players > p.players) cue('join');else if (chat > p.chat) cue('notice');
    previous.current = {
      players,
      score,
      badges: b,
      chat
    };
  }, [s, career]);
  const sock = useRef<WebSocket | null>(null),
    offset = useRef(0),
    expected = useRef(false),
    boot = useRef(Math.floor(Math.random() * keys.length));
  function send(op: string, data: any = {}) {
    if (sock.current?.readyState !== 1) {
      E('Нет связи с сервером');
      return;
    }
    sock.current.send(JSON.stringify({
      v: 1,
      op,
      ...data
    }));
  }
  useEffect(() => {
    let active = true,
      timer: any,
      ws: WebSocket,
      tries = 0;
    function open() {
      if (!active) return;
      try {
        ws = new WebSocket(endpoint.replace(/^http/, 'ws') + '/hub');
      } catch {
        E('Проверь адрес сервера');
        return;
      }
      sock.current = ws;
      ws.onopen = () => {
        O(true);
        tries = 0;
        E('');
        ws.send(JSON.stringify({
          v: 1,
          op: 'hello',
          key
        }));
        fetch(endpoint + '/info').then(r => r.json()).then(d => {
          if (active) L(['localhost', '127.0.0.1'].includes(new URL(endpoint).hostname) ? d.urls?.[0] || endpoint : endpoint);
        }).catch(() => L(endpoint));
      };
      ws.onmessage = e => {
        if (!active) return;
        let d = JSON.parse(e.data);
        if ('state' in d) {
          S(d.state);
          if (d.state) {
            M(m => ['join', 'create'].includes(m) ? '' : m);
            offset.current = d.state.now - Date.now();
          } else if (expected.current) {
            P('Играть');
            M('');
          }
        }
        if (d.error) E(d.error);
        if (d.career) C(d.career);
        if (d.ping) send('pong', {
          value: d.ping
        });
      };
      ws.onerror = () => E('Сервер недоступен. Проверь адрес, Wi-Fi и доступ между устройствами.');
      ws.onclose = () => {
        if (active) {
          O(false);
          timer = setTimeout(open, Math.min(4000, 400 * ++tries));
        }
      };
    }
    open();
    const wake = () => {
      if (document.visibilityState === 'visible' && ws?.readyState === 3) {
        clearTimeout(timer);
        open();
      }
    };
    document.addEventListener('visibilitychange', wake);
    return () => {
      active = false;
      clearTimeout(timer);
      ws?.close();
      document.removeEventListener('visibilitychange', wake);
    };
  }, [endpoint]);
  useEffect(() => {
    if (!s?.until) return;
    const id = setInterval(() => Time(Date.now()), 200);
    return () => clearInterval(id);
  }, [s?.until]);
  useEffect(() => {
    T('');
    if (!s) return;
    cue(({
      Финал: 'win',
      Колесо: 'wheel',
      Отсчёт: 'count',
      'Итоги раунда': 'timeout'
    } as any)[s.phase] || 'start');
    if (s.phase === 'Финал') {
      send('profile');
      if (stored('vib', true)) navigator.vibrate?.([40, 65, 100]);
    }
  }, [s?.epoch, s?.code]);
  useEffect(() => {
    if (s?.code && lan) QR.toDataURL(lan + '/?room=' + s.code).then(Q);
  }, [s?.code, lan]);
  useEffect(() => {
    if (!err) return;
    let id = setTimeout(() => E(''), 5000);
    return () => clearTimeout(id);
  }, [err]);
  useEffect(() => {
    let last = 0,
      n = 0,
      low = 0,
      raf = 0;
    let level = navigator.hardwareConcurrency <= 4 ? 'eco' : 'max';
    Grade(quality === 'auto' ? level : quality);
    function tick(t) {
      if (document.hidden) {
        last = 0;
        n = 0;
      } else {
        if (!last) last = t;
        n++;
        if (t - last >= 2200) {
          low = n * 1000 / (t - last) < 40 ? low + 1 : 0;
          last = t;
          n = 0;
          if (low >= 2) {
            level = level === 'max' ? 'balanced' : 'eco';
            Grade(level);
            low = 0;
          }
        }
      }
      if (level !== 'eco') raf = requestAnimationFrame(tick);
    }
    if (quality === 'auto') raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [quality]);
  const [dark, Dark] = useState(matchMedia('(prefers-color-scheme:dark)').matches),
    [hour, Hour] = useState(new Date().getHours());
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme:dark)'),
      change = () => Dark(media.matches);
    media.addEventListener('change', change);
    const timer = setInterval(() => Hour(new Date().getHours()), 60000);
    return () => {
      media.removeEventListener('change', change);
      clearInterval(timer);
    };
  }, []);
  let tk = theme;
  if (policy === 'host' && s) tk = s.theme;
  if (policy === 'system') tk = dark ? 'midnight' : 'arctic';
  if (policy === 'clock') tk = hour < 7 || hour > 18 ? 'midnight' : 'arctic';
  if (['random', 'match', 'round'].includes(policy)) tk = keys[(boot.current + (policy === 'random' ? 0 : career.matches || 0) + (policy === 'round' ? s?.round || 0 : 0)) % keys.length];
  const pal = themes[tk] || themes.expressive,
    me = s?.people.find(p => p.id === s.id),
    host = s?.host === s?.id,
    lobby = s && ['Лобби', 'Колесо'].includes(s.phase),
    secs = Math.max(0, Math.ceil(((s?.until || 0) - time - offset.current) / 1000));
  function enter(create) {
    if (!name.trim()) {
      E('Введи имя');
      return;
    }
    put('name', name);
    put('avatar', av);
    send('enter', {
      mode:preview,
      name,
      avatar: av,
      watch: !create && watch,
      code: create ? null : code
    });
  }
  function options(data) {
    send('options', {
      mode: s.mode,
      rounds: s.rounds,
      seconds: s.seconds,
      ...data
    });
  }
  function answer(x) {
    send('answer', {
      epoch: s.epoch,
      value: String(x)
    });
    T('');
  }
  function select(label, value, values, cb) {
    return <label>{label}<select value={value} onChange={e => cb(e.target.value)}>{values.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>;
  }
  function gameCard(i) {
    return <button className="card" key={i} onClick={() => {
      V(i);
      M('preview');
    }}><img src={'/cards/' + i + '.svg'} alt="" /><b>{names[i]}</b></button>;
  }
  const podium = s && [...s.people].filter(p => !p.watch).sort((a, b) => b.score - a.score);
  return <main data-quality={grade} style={{
    '--bg': pal.bg,
    '--ink': pal.ink,
    '--accent': pal.accent,
    '--radius': pal.radius + 'px'
  } as any} onPointerDown={() => {
    unlock();
  }} onClick={e => {
    if ((e.target as HTMLElement).closest('button')) {
      cue('tap');
      if (vib) navigator.vibrate?.(10);
    }
  }}>
<header><b className="brand">PARTY<span>HUB</span></b><button onClick={() => M('network')}><i className={online ? 'on' : ''} />{online ? 'В сети' : 'Подключение'}</button></header>
<div className="content">
{!s && page === 'Играть' && <><section className="hero"><div><small>ИГРОВАЯ ГОСТИНАЯ</small><h1>Вечеринка<br />у тебя дома.</h1><button className="primary" onClick={() => M('create')}>＋ Создать вечеринку</button> <button onClick={() => M('join')}>Присоединиться</button></div><div className="hero-art" aria-hidden><img src="/cards/0.svg" /><img src="/cards/13.svg" /></div></section>{career.history[0] && <p className="recent">Последняя партия · {names[career.history[0].mode]} · {career.history[0].points} очк.</p>}<h2>Во что играем?</h2><div className="catalog">{names.map((_, i) => gameCard(i))}</div></>}
{!s && page === 'Профиль' && <section><h1>{avatars[av]} {name || 'Твой профиль'}</h1><p>Уровень {career.level || 1} · {career.points || 0} опыта · Побед {career.wins || 0}</p><p>{career.title || 'Новичок'} · {career.frame || 'Базовая рамка'}</p><h2>Твои режимы</h2>{Object.entries(career.games).sort(([, a]: any, [, b]: any) => b.plays - a.plays).map(([i, g]: any) => <p key={i}>{names[i]} · матчей {g.plays} · рекорд {g.best}</p>)}<h2>Достижения</h2><div className="badges">{career.badges.map(b => <span key={b.title} className={b.ok ? 'earned' : ''}>{b.ok ? '★' : '◇'} {b.title}</span>)}</div><h2>Последние матчи</h2>{career.history.length ? career.history.slice(0, 20).map(h => <p key={h.match}>{new Date(h.date).toLocaleDateString('ru')} · {names[h.mode]} · {h.points} очк.</p>) : <p>Здесь появится результат твоей первой партии.</p>}</section>}
{!s && page === 'Настройки' && <section><h1>Настройки</h1>{select('Оформление', theme, keys.map(k => [k, themes[k].name]), k => {
          Theme(k);
          put('theme', k);
          Policy('fixed');
          put('policy', 'fixed');
        })}{select('Смена темы', policy, Object.entries({
          fixed: 'Вручную',
          system: 'Системная',
          clock: 'По часам',
          random: 'При запуске',
          match: 'После матча',
          round: 'По раундам',
          host: 'Как у ведущего'
        }), k => {
          Policy(k);
          put('policy', k);
        })}{select('Графика', quality, Object.entries({
          auto: 'Автоматическая',
          eco: 'Экономичная',
          balanced: 'Сбалансированная',
          max: 'Максимальная'
        }), k => {
          Quality(k);
          put('quality', k);
        })}<button onClick={() => {
          Music(!music);
          put('music', !music);
        }}>Музыка · {music ? 'вкл' : 'выкл'}</button><label>Громкость<input type="range" min="0" max="1" step=".05" value={vol} onChange={e => {
            Vol(+e.target.value);
            put('vol', +e.target.value);
          }} /></label><button onClick={() => {
          Vib(!vib);
          put('vib', !vib);
        }}>Вибрация · {vib ? 'вкл' : 'выкл'}</button></section>}
{s && <><div className="bar"><h2>Комната {s.code}</h2><button onClick={() => M('invite')}>QR-код</button><button onClick={() => {
            expected.current = true;
            send('leave');
          }}>Выйти</button></div>
{lobby ? <><section className="panel"><small>СЛЕДУЮЩАЯ ИГРА</small><h1>{names[s.mode]}</h1><p>{hints[s.mode]}</p>{host && <>{select('Режим', s.mode, names.map((v, i) => [i, v]), x => options({
                mode: +x
              }))}{s.mode === 4 && select('Категория', s.category, ['', 'Арифметика', 'Геометрия', 'Время', 'Счёт', 'География', 'Природа', 'Космос', 'Культура'].map(x => [x, x || 'Все категории']), x => options({
                category: x
              }))}{select('Раундов', s.rounds, [1, 3, 5].map(n => [n, n]), x => options({
                rounds: +x
              }))}{select('Секунд на ход', s.seconds, [15, 30, 60].map(n => [n, n]), x => options({
                seconds: +x
              }))}<button onClick={() => options({
                theme: tk
              })}>Передать мою тему</button> <button onClick={() => M('wheel')}>Колесо игр</button> <button onClick={()=>send('votes')} disabled={!s.people.some(p=>p.vote>=0)}>Принять голосование</button>{s.mode === 3 && <label>Своя картинка<input type="file" accept="image/*" onChange={async e => {
                  try {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const im = await createImageBitmap(file),
                      c = document.createElement('canvas');
                    c.width = 480;
                    c.height = Math.max(1, Math.min(480, 480 * im.height / im.width));
                    c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
                    im.close();
                    send('image', {
                      value: c.toDataURL('image/jpeg', .6)
                    });
                  } catch {
                    E('Не удалось открыть картинку');
                  }
                }} /></label>}</>}
{!me.watch && <button className="primary" onClick={() => host ? send('start') : send('ready')}>{host ? 'Начать игру' : me.ready ? 'Отменить готовность' : 'Я готов'}</button>}
{!me.watch && select('Мой голос за игру', me.vote, [[-1, 'Выбери режим'], ...names.map((v, i) => [i, v])], x => send('voteMode', {
              value: +x
            }))}</section>
{s.phase === 'Колесо' && <Wheel s={s} offset={offset.current} />}</> : <section className="panel stage" key={s.epoch}><small>{names[s.game]} · Раунд {s.round} / {s.rounds}</small><div className="bar"><h1>{s.phase}</h1>{s.until > 0 && <strong>{secs} с</strong>}</div>{s.phase === 'Финал' ? <><Confetti quality={grade} game={s.game} /><h2>🏆 {podium.filter(p => p.score === podium[0].score).map(p => p.name).join(', ')}</h2>{podium.map((p, i) => <p key={p.id}>{['🥇', '🥈', '🥉'][i] || i + 1 + '.'} {p.name} · {p.score} очк.</p>)}<p>{s.moments.join(' / ')}</p>{host && <button onClick={() => send('again')}>В лобби и реванш</button>}</> : <><h2 style={{
              color: s.tint || undefined
            }}>{s.prompt}</h2>{s.role && <p className="role">Твоя роль или место · {s.role} {s.info}</p>}{s.image && <img className="sample" src={s.image} />}<p className="seq">{s.seq.join(' ')}</p>{s.game === 13 && <Snake s={s} />}
{s.can ? <div className={s.game === 11 ? 'grid25' : 'choices'}>{s.options.map(([x, t], i) => <button key={i} onClick={() => s.input === 'sequence' ? T(input + x) : answer(x)}>{t}</button>)}{(!s.options.length || s.input === 'sequence') && <form onSubmit={e => {
                e.preventDefault();
                if (input.trim()) answer(input);
              }}><input placeholder="Твой ответ" value={input} maxLength={140} readOnly={s.input === 'sequence'} inputMode={s.input === 'number' ? 'numeric' : 'text'} onChange={e => T(e.target.value)} />{s.input === 'sequence' && <button type="button" onClick={() => T('')}>Сброс</button>}<button>Сдать</button></form>}</div> : <p>{s.out ? 'Ты наблюдаешь за игрой' : me.watch ? 'Режим зрителя' : ''}</p>}</>}</section>}
<details open={lobby || undefined}><summary>Участники · {s.people.length}</summary>{s.people.map(p => <div className="person" key={p.id}>{avatars[p.avatar]} <b>{p.name}</b> {p.id === s.host ? '♛' : ''} <small>{!p.online ? 'Нет связи' : p.watch ? 'Зритель' : p.ready ? 'Готов' : p.rtt + ' мс'} {p.vote >= 0 ? ' · ' + names[p.vote] : ''}</small>{host && p.id !== s.id && lobby && <button onClick={() => send('kick', {
              id: p.id
            })}>Исключить</button>}</div>)}</details>
<details><summary>Чат вечеринки</summary>{s.chat.map((x, i) => <p key={i}>{x}</p>)}<form onSubmit={e => {
            e.preventDefault();
            if (chat.trim()) {
              send('chat', {
                value: chat
              });
              H('');
            }
          }}><input value={chat} onChange={e => H(e.target.value)} placeholder="Сообщение" maxLength={160} /><button>Отправить</button></form>{['👏', '❤️', '😂'].map(x => <button key={x} onClick={() => send('react', {
            value: x
          })}>{x}</button>)}</details></>}
</div>{!s && <nav>{['Играть', 'Профиль', 'Настройки'].map(n => <button key={n} aria-pressed={page === n} onClick={() => P(n)}>{n}</button>)}</nav>}
{modal && <div className="shade"><section className="sheet"><button className="close" onClick={() => M('')}>Закрыть</button>
{['join', 'create'].includes(modal) && <><h2>{modal === 'join' ? 'Войти в комнату' : 'Создать вечеринку'}</h2><label>Имя<input maxLength={20} value={name} onChange={e => N(e.target.value)} /></label><div className="badges">{avatars.map((x, i) => <button key={x} aria-pressed={av === i} onClick={() => A(i)}>{x}</button>)}</div>{modal === 'join' && <><label>Код комнаты<input inputMode="numeric" value={code} maxLength={2} onChange={e => K(e.target.value.replace(/\D/g, ''))} /></label><label><input type="checkbox" checked={watch} onChange={e => W(e.target.checked)} /> Смотреть игру</label></>}<button className="primary" disabled={!online} onClick={() => enter(modal === 'create')}>Продолжить</button></>}
{modal === 'preview' && <><img className="sample" src={'/cards/' + preview + '.svg'} /><h2>{names[preview]}</h2><p>{hints[preview]}</p><button onClick={() => {
            M('create');
          }}>Создать вечеринку</button></>}
{modal === 'invite' && s && <><h2>Позови друзей · {s.code}</h2><img className="qr" src={qr} /><p>{lan}/?room={s.code}</p>{['localhost', '127.0.0.1'].includes(new URL(lan || endpoint).hostname) && <label>IP телефона в Wi-Fi<input placeholder="Например, 192.168.1.25" onBlur={e => {
              const v = e.target.value.trim();
              if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v) && v.split('.').every(n => Number(n) <= 255)) L('http://' + v + ':' + (new URL(endpoint).port || 3000));
            }} /></label>}<small>Подключитесь к одной сети Wi-Fi или точке доступа.</small></>}
{modal === 'wheel' && s && <><h2>Секторы колеса</h2>{names.map((n, i) => <button key={n} aria-pressed={!s.excluded.includes(i)} onClick={() => send('exclude', {
            value: i
          })}>{n}</button>)}<button className="primary" onClick={() => {
            M('');
            send('wheel');
          }}>Крутить</button></>}
{modal === 'network' && <><h2>Локальный сервер</h2><label>Адрес<input value={ip} onChange={e => I(e.target.value)} /></label><button onClick={() => {
            try {
              let u = new URL(ip.includes('://') ? ip : 'http://' + ip);
              if (!['http:', 'https:'].includes(u.protocol)) throw Error();
              if (s) {
                E('Сначала выйди из комнаты');
                return;
              }
              put('server', u.origin);
              Connect(u.origin);
              M('');
            } catch {
              E('Проверь адрес');
            }
          }}>Подключиться</button></>}</section></div>}{err && <aside role="alert">{err}</aside>}</main>;
}
function Snake({
  s
}) {
  return <svg className="map" viewBox="0 0 32 24">{s.food.map(n => <circle key={n} cx={n % 32 + .5} cy={Math.floor(n / 32) + .5} r=".38" fill="#ffcc68" />)}{Object.entries(s.snakes).map(([k, b]: any) => b.alive && b.body.map((n, i) => <rect key={k + '-' + i} x={n % 32} y={Math.floor(n / 32)} width=".98" height=".98" fill={k === s.id ? '#deff8d' : 'hsl(' + Number(k) * 72 + ' 75% 65%)'} />))}</svg>;
}
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/sw.js').catch(() => {});
createRoot(document.getElementById('root')!).render(<App />);
