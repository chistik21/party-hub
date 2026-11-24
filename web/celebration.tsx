import React, { useEffect, useRef } from 'react';
export function Confetti({
  quality,
  game
}: {
  quality: string;
  game: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (quality === 'eco' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = canvas.current,
      ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const w = c.clientWidth,
      h = c.clientHeight,
      scale = Math.min(devicePixelRatio, 2);
    c.width = w * scale;
    c.height = h * scale;
    ctx.scale(scale, scale);
    const pieces = Array.from({
      length: quality === 'max' ? 75 : 34
    }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h - h,
      v: 60 + Math.random() * 85,
      a: Math.random() * 6,
      color: ['#edb936', '#ac78fa', '#39b38a', '#fb777d'][(i + game) % 4]
    }));
    let raf = 0,
      start = performance.now();
    function draw(now: number) {
      const t = (now - start) / 1000;
      ctx!.clearRect(0, 0, w, h);
      if (document.hidden || t > 4) return;
      for (const p of pieces) {
        ctx!.save();
        ctx!.translate(p.x + 17 * Math.sin(t * 2 + p.a), p.y + t * p.v);
        ctx!.rotate(t * 2 + p.a);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-3, -5, 6, 10);
        ctx!.restore();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [quality, game]);
  return <canvas className="confetti" ref={canvas} aria-hidden />;
}
const labels = ['Шпион', 'Мафия', 'Реакция', 'Мем', 'Квиз', 'Факт', 'Число', 'Связи', 'Кто?', 'Слова', 'Память', 'Поиск', 'Цвет', 'Змейка', 'Марафон'];
export function Wheel({
  s,
  offset
}) {
  const ids: number[] = s.sectors || [s.mode],
    i = ids.indexOf(s.mode),
    deg = 360 / ids.length;
  const elapsed = useRef(Math.max(0, Math.min(3399, 3400 - (s.until - Date.now() - offset)))).current;
  return <div role="img" aria-label={'Колесо, выпал режим ' + labels[s.mode]} className="wheelbox"><div className="needle">▼</div><svg viewBox="0 0 220 220" className="dial" style={{
      '--angle': 1800 - i * deg + 'deg',
      animationDelay: -elapsed + 'ms'
    } as any}>{ids.map((id, j) => {
        const theta = (j * deg - 90) * Math.PI / 180,
          arc = deg / 2 * Math.PI / 180;
        const pt = (a: number) => [110 + 100 * Math.cos(a), 110 + 100 * Math.sin(a)].join(' ');
        return <g key={id}>{ids.length === 1 ? <circle cx="110" cy="110" r="100" fill="#baf091" /> : <path d={'M110 110 L' + pt(theta - arc) + ' A100 100 0 0 1 ' + pt(theta + arc) + 'Z'} fill={['#ccf18e', '#f6c9b5', '#bcb5ea', '#9bdacf'][j % 4]} stroke="#28372d" />}<text transform={'translate(' + [110 + 68 * Math.cos(theta), 110 + 68 * Math.sin(theta)] + ') rotate(' + (j * deg - 90) + ')'} textAnchor="middle" fontSize="9" fill="#203528" fontWeight="700">{labels[id]}</text></g>;
      })}<circle cx="110" cy="110" r="12" fill="#223b2c" /></svg></div>;
}
