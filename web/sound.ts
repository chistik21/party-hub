const pool = new Map<string, HTMLAudioElement>();
const music = new Audio('/sound/music.wav');
music.loop = true;
let unlocked = false,
  volume = .25,
  ambient = false;
function sync() {
  music.volume = volume * .32;
  if (unlocked && ambient && volume && !document.hidden) {
    music.play().catch(() => {});
  } else music.pause();
}
export function unlock() {
  if (!unlocked) {
    unlocked = true;
    sync();
  }
}
export function configure(v: number, m: boolean) {
  volume = v;
  ambient = m;
  sync();
}
export function cue(name: string) {
  if (!unlocked || !volume || document.hidden) return;
  let a = pool.get(name);
  if (!a) {
    a = new Audio('/sound/' + name + '.wav');
    pool.set(name, a);
  }
  a.volume = volume;
  a.currentTime = 0;
  a.play().catch(() => {});
}
document.addEventListener('visibilitychange', sync);
