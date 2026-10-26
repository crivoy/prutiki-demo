// snd.js — звук игры (выбор пользователя 23.10 со стенда style_lab/sound.html; файлы snd/*.mp3, источники — snd/SOURCES.md)
// SND.play(имя | [имена], { vol, rate }) — короткий звук (из нескольких — случайный); SND.loop(ключ, имя | null, { vol, rate }) — повтор, пока не снят;
// SND.music(имя | [имена] | null, громкость) — фон по кругу с перекрёстным затуханием (музыка и фон комнаты — потоком <audio>, не в память); SND.amb(имя | null) — второй слой фона;
// SND.hold(причина, да/нет) — пауза: платформа (реклама, чужая вкладка — Яндекс 1.3, 4.7), скрытая вкладка, выключенный звук площадки. До первого касания молчит (правило браузеров).
const AC = window.AudioContext || window.webkitAudioContext, ctx = AC ? new AC() : null, BUF = {}, LOOPS = {}, HOLD = new Set(), base = new URL('snd/', import.meta.url).href;
const out = ctx?.createGain(), musG = ctx?.createGain(), sfxG = ctx?.createGain(); out?.connect(ctx.destination); musG?.connect(out); sfxG?.connect(out);   // громкость музыки и звуков — отдельно (настройки в паузе)
const VOL = { music: 0.32, amb: 0.22 };
const buf = n => BUF[n] ??= fetch(base + n + '.mp3').then(r => r.arrayBuffer()).then(a => new Promise((ok, no) => ctx.decodeAudioData(a, ok, no))).catch(() => null);
const live = () => ctx && ctx.state === 'running' && !HOLD.size;
function stream(slot) {                                                              // слой фона: <audio> → gain (громкость через gain: на iOS у <audio> volume не меняется)
  const S = { el: null, g: null, key: null, L: [], i: 0, slot };   // L — список треков по кругу (пользователь 23.10: зал М-3 → М-5 → М-7, квартира К-1 → К-3)
  S.set = (n, vol) => { const L = [].concat(n || []), key = L.join('|'); if (S.key === key) return; S.key = key; S.L = L; S.vol = vol; S.i = Math.floor(Math.random() * L.length); S.go(); };
  S.go = () => { const old = S.el, og = S.g, name = S.L[S.i];
    if (old) { og.gain.setTargetAtTime(0, ctx.currentTime, 0.4); setTimeout(() => { old.pause(); old.src = ''; }, 1600); }
    S.el = S.g = null; if (!name || !ctx) return;
    const el = new Audio(base + name + '.m4a');   // фон — AAC 64 кбит/с (моно 48 — room), эффекты — mp3 (Poki: вес 10,3 → 5,3 МБ, 26.10)
    el.loop = true; el.crossOrigin = 'anonymous'; el.preload = unlocked ? 'auto' : 'none'; const g = ctx.createGain(); g.gain.value = 0;
    ctx.createMediaElementSource(el).connect(g).connect(musG); el.ontimeupdate = () => { if (S.el === el && el.duration - el.currentTime < 3) { S.i = (S.i + 1) % S.L.length; S.go(); } }; S.el = el; S.g = g; if (unlocked && !HOLD.size) { el.play().catch(() => {}); g.gain.setTargetAtTime(S.vol, ctx.currentTime, 0.5); } };   // за 3 с до конца — следующий по кругу, перекрёстное затухание (пользователь 23.10: «музычка заканчивается и раздражает»)
  S.sync = () => { if (!S.el) return; if (unlocked && !HOLD.size) { S.el.play().catch(() => {}); S.g.gain.setTargetAtTime(S.vol, ctx.currentTime, 0.3); } else S.el.pause(); };
  return S; }
const MUS = stream('music'), AMB = stream('amb');
const sync = () => { if (!ctx) return; if (HOLD.size) ctx.suspend().catch(() => {}); else if (unlocked) ctx.resume().catch(() => {}); MUS.sync(); AMB.sync(); };   // <audio> — по причинам паузы, не по ctx.state: resume() асинхронный (макет SDK 23.10: после rewarded музыка зала не вернулась)
let unlocked = false; const unlock = () => { if (unlocked || !ctx) return; unlocked = true; ctx.resume().then(sync).catch(() => {}); };
for (const e of ['pointerdown', 'keydown', 'touchend']) addEventListener(e, unlock, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => SND.hold('tab', document.hidden));
export const SND = {
  play(n, o = {}) { if (!live()) return; const name = Array.isArray(n) ? n[Math.floor(Math.random() * n.length)] : n;
    buf(name).then(b => { if (!b || !live()) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.playbackRate.value = o.rate ?? 1; g.gain.value = o.vol ?? 1; s.connect(g).connect(sfxG); s.start(0, o.at ?? 0, o.dur); }); },   // at/dur — кусок файла (хвост остановки мотора)
  loop(key, n, o = {}) { const L = LOOPS[key];
    if (L && L.name === n) { if (!L.s) return; if (o.rate) L.s.playbackRate.setTargetAtTime(o.rate, ctx.currentTime, 0.08); if (o.vol != null) L.g.gain.setTargetAtTime(o.vol, ctx.currentTime, 0.08); return; }
    if (L) { L.g?.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => L.s?.stop(), 300); delete LOOPS[key]; }
    if (!n || !ctx) return; const me = LOOPS[key] = { name: n };
    buf(n).then(b => { if (!b || LOOPS[key] !== me) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.loop = true; const a = o.from ?? 0, z = o.to ?? b.duration; s.loopStart = a; s.loopEnd = z; s.playbackRate.value = o.rate ?? 1; g.gain.value = 0; g.gain.setTargetAtTime(o.vol ?? 1, ctx.currentTime, 0.05); s.connect(g).connect(sfxG); s.start(0, a + Math.random() * (z - a) * 0.5); me.s = s; me.g = g; }); },   // from/to — ровный кусок без пуска и остановки (мотор Л-21: 0,4–6,0 с; иначе провал и щелчок на стыке)
  music(n, vol = VOL.music) { MUS.set(n, vol); }, amb(n) { AMB.set(n, VOL.amb); },
  hold(why, on) { const was = HOLD.size; on ? HOLD.add(why) : HOLD.delete(why); if (!!was !== !!HOLD.size) sync(); },
  vol(m, f) { if (!ctx) return; musG.gain.setTargetAtTime(m, ctx.currentTime, 0.05); sfxG.gain.setTargetAtTime(f, ctx.currentTime, 0.05); },   // 0…1 (ui.js — квадрат ползунка: слух логарифмический)
  preload(L) { if (ctx) for (const n of L) buf(n); },
};
window.SND = SND;   // квартира во фрейме (apt.js) зовёт parent.SND
