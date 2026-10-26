// ui.js — экраны игры поверх холста (сборка, brief/HANDOFF_MENU_BUILD.md): меню = зал, экран автомата, жетоны, приз, пауза, вход в квартиру.
// Вид — выбор пользователя 22–23.10 на стенде style_lab/balls.html: аркадные кнопки (v=2), «Играть» — «Клавиша» (&play=b), «Коллекция» — золотая слева от жетонов (&col=g; телефон — левый угол).
// Ядро (index.html, игровая сессия): камера — #cam, автомат — Hall.go / #mach, пауза — Game.paused, события 'prize' / 'machine', жетон на ход — Tokens.spend() в press. С ?dev и ?replay экранов нет.
// Звук — snd.js (выбор пользователя 23.10). ponytail: кнопки звука нет — громкость и выключение даёт площадка (Яндекс 6.7: без бесполезных кнопок); шестерёнку — когда будет что настраивать.
import * as THREE from 'three';
import * as HS from './hall_style.js';
import * as SJ from './series.js';   // имена серий и фигурок; NAMES_EN / SERIES[].en — английские (сессия персонажей), нет — русские
import { Home } from './home.js';
import { P } from './platform.js';
import { Save } from './save.js';
import { Tokens, MAX, EVERY, RV } from './tokens.js';
import { SND } from './snd.js';

const Q = new URLSearchParams(location.search), $ = id => document.getElementById(id);
const OFF = Q.has('dev') || Q.has('replay');
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${(s / 60) | 0}:${String(s % 60).padStart(2, '0')}`; };
const RU = { name: 'Прутики', view: 'Другой вид', reset: 'Сбросить положение коробки', resetQ: 'Сбросить положение коробки?', resetP: 'Коробка вернётся в начальное положение.', resetGo: 'Сбросить', staff: 'Сотрудник', inN: n => `через ${n}`, hlock: (k, n) => `Зал ${k}: ещё ${n} ${n === 1 ? 'фигурка' : n < 5 ? 'фигурки' : 'фигурок'} из зала ${k - 1}`, hof: n => `${n} из 9`, cancel: 'Отмена', train: 'Тренировочный автомат', tmeta: 'Тренировка · без жетонов', again: 'Ещё коробку', tpick: 'Нажми на коробку на полке — сменить', twin: 'Выбил!', twinp: 'Это тренировка — без приза.<br>Получилось? Пробуй на настоящем.', set: 'Настройки', music: 'Музыка', sfx: 'Звуки', spin: 'Крутка', crank: 'Покрути ручку — проведи по кругу', ctipT: 'Тяни пальцем — повернуть · щипок — ближе', ctipM: 'Тяни мышью — повернуть · колесо — ближе', takeCap: 'Нажми на капсулу — достать', tag: 'призовые автоматы', play: 'Играть', hall: 'Зал', of: 'из', back: 'В зал', pause: 'Пауза', cont: 'Продолжить', coll: 'Коллекция', secret: 'Секретная фигурка', tapbox: 'Нажми — открыть', take: 'Нажми — достать приз', rest: 'Пополняется',
  out: 'Жетоны кончились', in: t => `+1 через ${t}`, outp: t => `Новый жетон через ${t}.<br>Запас — до ${MAX}, жетон восстанавливается каждые ${EVERY / 60e3} минут.`, more: n => `+${n} ${n % 10 === 1 && n % 100 !== 11 ? 'жетон' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'жетона' : 'жетонов'} за рекламу`, wait: 'Подождать', tok: 'Жетоны' };
const EN = { name: 'Prutiki', view: 'Change view', reset: 'Reset box position', resetQ: 'Reset the box position?', resetP: 'The box goes back to where it started.', resetGo: 'Reset', staff: 'Staff', inN: n => `in ${n}`, hlock: (k, n) => `Hall ${k}: ${n} more figure${n === 1 ? '' : 's'} from hall ${k - 1}`, hof: n => `${n} of 9`, cancel: 'Cancel', train: 'Practice machine', tmeta: 'Practice · no tokens', again: 'Another box', tpick: 'Tap a box on the shelf to switch', twin: 'Got it!', twinp: 'This is practice — no prize.<br>Nailed it? Try a real one.', set: 'Settings', music: 'Music', sfx: 'Sounds', spin: 'Spin', crank: 'Turn the handle — draw a circle', ctipT: 'Drag to turn the view · pinch to zoom', ctipM: 'Drag to turn the view · wheel to zoom', takeCap: 'Tap the capsule to take it', tag: 'prize machines', play: 'Play', hall: 'Hall', of: 'of', back: 'To hall', pause: 'Paused', cont: 'Continue', coll: 'Collection', secret: 'Secret figure', tapbox: 'Tap to open', take: 'Tap to take the prize', rest: 'Restocking',
  out: 'Out of tokens', in: t => `+1 in ${t}`, outp: t => `Next token in ${t}.<br>Up to ${MAX} tokens, one comes back every ${EVERY / 60e3} minutes.`, more: n => `+${n} tokens for an ad`, wait: 'Wait', tok: 'Tokens' };
let T = RU;
const ic = (p, f = '') => `<svg class="i ${f}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const I = { lock: ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'), staff: ic('<circle cx="12" cy="7" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/><path d="M9 3.5h6"/>'), aim: ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'), re: ic('<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>'), gear: ic('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'), mus: ic('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'), spk: ic('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>'), cl: ic('<path d="m15 18-6-6 6-6"/>'), cr: ic('<path d="m9 18 6-6-6-6"/>'), pau: ic('<path d="M9 5v14M15 5v14"/>'), home: ic('<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11.5h13V9"/><path d="M10 20.5v-6h4v6"/>'),
  camv: ic('<path d="M3 8h3.5l2-3h7l2 3H21v11H3z"/><circle cx="12" cy="13" r="3.8"/>'), cap: ic('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><circle cx="12" cy="12" r="1.6"/>'), coin: ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>'), ad: ic('<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>'),
  star: f => ic('<path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z"/>', f ? 'f' : 'f e') };
const cap = s => s ? s[0] + s.slice(1).toLowerCase() : '';
const LV = () => MACHINES.filter(x => x.hall);                                    // уровни игры (залы); 2hsq и L* — стенды игровой сессии
const info = id => { const M = MACHINES.find(x => x.id === id), L = LV().filter(x => x.hall === M?.hall);
  return { hall: M?.hall, k: L.findIndex(x => x.id === id) + 1, n: L.length, series: cap((T === EN && SJ.seriesOf(id)?.en) || SJ.seriesOf(id)?.name), fig: HS.isBlind(id) && !secretOpen(id) ? T.secret : cap((T === EN && SJ.NAMES_EN?.[HS.figOf(id)]) || HS.TOYS[HS.figOf(id)]) }; };   // секретный автомат — имя только когда коробку открыли
const OPEN_AFTER = 4, halls = () => [...new Set(LV().map(x => x.hall).filter(Number.isInteger))], hWon = n => LV().filter(x => x.hall === n && Save.get().won?.[x.id]).length, hOpen = n => n <= 1 || hWon(n - 1) >= OPEN_AFTER;   // зал открывается после 4 фигурок из 9 прошлого (LEVELS §5.2; число — ручка)
const items = (id, w = Save.get().won?.[id]) => w?.items ?? (w ? [id] : []);       // призы секретного автомата: 'H1-8~<фигурка>~<k>'; старые сохранения — сам автомат (секретка)
const secretOpen = id => { const b = Save.get().boxes || []; return items(id).some(x => HS.figOf(x) === SJ.seriesOf(id).secret && !b.includes(x)); };
const drop = id => { const S = SJ.seriesOf(id), L = items(id), k = L.length + 1, got = L.some(x => HS.figOf(x) === S.secret);   // секретный автомат (пользователь 23.10): случайная из 6 обычных серии или секретка 1/6, секретка — не позже 5-го выигрыша
  return `${id}~${Math.random() < 1 / 6 || (!got && k >= 5) ? S.secret : S.figs[(Math.random() * 6) | 0]}~${k}`; };
const restLeft = id => HS.isBlind(id) ? Math.max(0, (Save.get().won?.[id]?.cd ?? -Infinity) + (+P.flag('secret_cd_h', 4)) * 3600e3 - P.now()) : 0;   // после выигрыша секретный автомат пополняется (пользователь 23.10); часы — удалённая настройка secret_cd_h
const hms = ms => { const s = Math.ceil(ms / 1000); return `${(s / 3600) | 0}:${String(((s / 60) | 0) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
let playTxt = '';
function play() { const l = restLeft(Hall.at()), h = l > 0 ? `${T.rest}<small>${hms(l)}</small>` : T.play; if (h !== playTxt) { playTxt = h; $('u-play').innerHTML = h; $('u-play').disabled = l > 0; } }
const starsOf = n => n <= 2 ? 3 : n <= 5 ? 2 : 1;                                 // ponytail: звёзды по жетонам на приз — пороги 2 / 5 не утверждены (LEVELS §5.1, ручка)

if (!OFF) {
document.head.insertAdjacentHTML('beforeend', `<style>
  body:not(.dev) #hud, body:not(.dev) #win, body > button[title="Коллекция дома"] { display: none !important; }   /* старая отладка и заглушка «Квартира ›» (home.js) */
  body:not([data-scr="game"]) #pads { display: none; }
  #pads { z-index: 7; }
  #pads #b0 { --rim: #8a5a00; --glow: rgba(255, 205, 70, .6); border: 0; overflow: hidden; background: url(coin_token.webp) center / 100% no-repeat; box-shadow: 0 0 22px var(--glow); }   /* жетон — пухлая монета со звездой (выбор пользователя 24.10, стенд style_lab/coins_kie № 3, KIE); прежняя «Монета» с рифлёным краем — token_btn.html А */
  #pads #b0 svg { width: 46%; height: 46%; } #pads #b0::after { content: ""; position: absolute; inset: -20%; background: linear-gradient(115deg, #fff0 40%, #fffc 50%, #fff0 60%); transform: translateX(-120%); pointer-events: none; }
  #pads .tip { animation: u-gch 1.1s ease-in-out infinite; }
  #pads #b0.wait::after { animation: u-shine 1.8s ease-in-out infinite; } @keyframes u-shine { 60%, 100% { transform: translateX(120%); } }   /* блик бегает, пока жетон не брошен */                                                             /* пульт — над затемнением краёв (#u::before), иначе кнопки тёмные (пользователь 23.10) */
  html, body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; overscroll-behavior: none; }
  #u { position: fixed; inset: 0; z-index: 6; pointer-events: none; font: 800 16px/1.2 "M PLUS Rounded 1c", sans-serif; color: #fff; }
  #u::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(#05070b00 62%, #05070bc0); }   /* сверху не темнить — лишнее (пользователь 23.10) */
  body[data-scr="menu"] #u::before { background: linear-gradient(90deg, #05070b00 50%, #05070bc4 72%), linear-gradient(#05070b00 58%, #05070bd0); }
  #u .scr { display: none; }
  body[data-scr="menu"] #u-menu, body:is([data-scr="game"], [data-scr="pause"], [data-scr="out"]) #u-game, body[data-scr="prize"] #u-prize, body[data-scr="pause"] #u-pause, body[data-scr="out"] #u-out { display: block; }
  #u button { pointer-events: auto; font: inherit; color: inherit; border: 0; padding: 0; background: none; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
              display: inline-flex; align-items: center; justify-content: center; gap: 8px; text-shadow: 0 1px 2px #0009; }
  #u svg.i { width: 22px; height: 22px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  #u svg.i.f { fill: currentColor; }
  /* аркадная кнопка — купол в металлическом ободе (balls.html v=2); нажатие — купол уходит вниз */
  #u .ab { --c: #ff3f8e; --l: #ffa3c9; --d: #a3104b; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 3px solid #22232b; text-shadow: 0 1px 2px #0009;
           background: radial-gradient(120% 90% at 50% 18%, var(--l) 0, var(--c) 45%, var(--d) 100%);
           box-shadow: 0 0 0 3px #c9cdd6, 0 0 0 4px #5d616c, 0 6px 0 4px #34363e, 0 12px 18px 4px #000a, inset 0 3px 4px #fff9, inset 0 -5px 8px #0005; transition: transform .08s, box-shadow .08s; }
  #u button.ab:active:not(:disabled) { transform: translateY(5px); box-shadow: 0 0 0 3px #c9cdd6, 0 0 0 4px #5d616c, 0 1px 0 4px #34363e, 0 4px 8px 4px #000a, inset 0 3px 4px #fff9, inset 0 -3px 6px #0005; }
  #u .ab:disabled { filter: grayscale(1) brightness(.75); opacity: .55; cursor: default; }
  #u .ab.blue { --c: #2fb6ee; --l: #a6e6ff; --d: #0e5f8a; }
  #u .ab.gch { --c: #ff5d8f; --l: #ffc2d6; --d: #a0164a; animation: u-gch 1.6s ease-in-out infinite; } @keyframes u-gch { 50% { filter: brightness(1.2) drop-shadow(0 0 10px #ff8fb8); } }   /* крутка гачи доступна — мерцает */
  #u .badge.ad { padding: 0 3px; background: #2fb6ee; } #u .badge.ad svg { width: 18px; height: 18px; margin-top: 3px; }   /* крутка за рекламу: значок ролика вместо числа */
  #u .ab.yel { --c: #ffc21a; --l: #ffe9a0; --d: #a86a00; }
  #u .ab.gold { --c: #d99a1e; --l: #fff1b8; --d: #6e4300; color: #fffaf0; background: linear-gradient(115deg, #fff0 30%, #ffffff55 42%, #fff0 54%), radial-gradient(120% 90% at 50% 18%, var(--l) 0, var(--c) 45%, var(--d) 100%); }
  #u .ico { width: 46px; height: 46px; flex: none; }
  #u .chip { height: 46px; padding: 0 14px 0 10px; white-space: nowrap; gap: 7px; }
  #u .chip small, #u .meta, #u .tm { font-weight: 500; color: #ffe3f0; }
  #u .chip small { opacity: .85; }
  #u .tm { font-size: 12px; margin-left: 4px; }
  #u .wide { min-height: 54px; padding: 0 28px; font-size: 19px; white-space: nowrap; }
  #u .top { position: absolute; left: max(16px, env(safe-area-inset-left)); right: max(16px, env(safe-area-inset-right)); top: max(14px, env(safe-area-inset-top)); display: flex; align-items: center; gap: 10px; }
  #u .sp { flex: 1; }
  #u .where { display: flex; flex-direction: column; gap: 3px; min-width: 0; text-shadow: 0 2px 6px #000; }
  #u .where b { font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #u .meta { font-size: 13px; text-shadow: 0 1px 3px #000; }
  #u .col { position: absolute; right: 7%; top: 50%; transform: translateY(-50%); width: 380px; display: flex; flex-direction: column; align-items: center; gap: 26px; }
  #u .logo { margin: 0; font-size: 64px; line-height: 1; letter-spacing: .01em; text-align: center; text-shadow: 0 3px 0 #a3104b, 0 6px 0 #5a0828, 0 12px 18px #000b; }
  #u .logo small { display: block; margin-top: 14px; font-size: 15px; font-weight: 500; letter-spacing: .3em; text-transform: uppercase; color: #ffe3f0; text-shadow: 0 1px 3px #000; }
  #u .stack { display: flex; flex-direction: column; align-items: center; gap: 18px; width: 100%; }
  #u .pick { display: flex; align-items: center; gap: 8px; width: 100%; }
  #u .info { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; min-width: 0; }
  #u .info b { font-size: 24px; text-shadow: 0 2px 6px #000; }
  #u .stars { display: flex; gap: 3px; color: #ffd34a; filter: drop-shadow(0 1px 2px #0008); }
  #u .stars svg { width: 18px; height: 18px; } #u .stars .e { color: #ffffff40; }
  /* «Играть» — «Клавиша» (balls.html &play=b): объёмная, проваливается */
  #u .key { width: 260px; height: 92px; border-radius: 18px; font-size: 30px; margin-bottom: 12px; transform: perspective(420px) rotateX(10deg); background: linear-gradient(#ff97c2, #ff3f8e 58%, #e42a79);
            box-shadow: inset 0 3px 0 #ffffffa8, inset 0 -5px 0 #0003, 0 10px 0 #9c0d47, 0 10px 0 3px #22232b, 0 20px 24px #000b; transition: transform .08s, box-shadow .08s; }
  #u .key small { display: block; font-size: 0.62em; opacity: 0.85; line-height: 1.1; } #u .key:disabled { flex-direction: column; line-height: 1.1; filter: grayscale(0.7) brightness(0.8); cursor: default; }
  #u .key:active { transform: perspective(420px) rotateX(10deg) translateY(8px); box-shadow: inset 0 3px 0 #ffffffa8, 0 2px 0 #9c0d47, 0 2px 0 3px #22232b, 0 6px 10px #000b; }
  #u .prompt { position: absolute; left: 50%; transform: translateX(-50%); bottom: 148px; font-size: 20px; white-space: nowrap; text-shadow: 0 2px 4px #000, 0 0 14px #000a; }
  #u #hint { position: absolute; right: max(24px, env(safe-area-inset-right)); bottom: 44px; height: 52px; padding: 0 20px; font-size: 17px; }
  #u #hint[hidden] { display: none; }
  #u #u-view { position: absolute; right: max(24px, env(safe-area-inset-right)); bottom: 110px; }   /* виды по кругу (пользователь 23.10) — над «Подсказкой» */
  #u .sheet { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(420px, calc(100% - 32px)); display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; }
  #u .vol { width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border-radius: 20px; background: #0008; pointer-events: auto; }   /* громкость (пользователь 23.10: «крутилки громкости звуков и музыки, в ноль либо выключить») */
  #u .vr { display: grid; grid-template-columns: auto 82px 1fr; align-items: center; gap: 12px; text-align: left; font-size: 17px; }
  #u .vr .ab.ico.off { filter: grayscale(1) brightness(.7); opacity: .6; }
  #u .vr input { width: 100%; height: 32px; accent-color: #ff3f8e; cursor: pointer; }
  body[data-scr="pause"][data-from="menu"] #u-game { display: none; }
  body[data-scr="tprize"] #u-tprize, body[data-scr="tprize"] #u-game, body[data-scr="conf"] #u-conf, body[data-scr="conf"] #u-game { display: block; }
  #u .prow { display: flex; gap: 10px; width: 100%; } #u .prow .ab { flex: 1; padding: 6px 10px; font-size: 15px; white-space: normal; line-height: 1.15; } #u .prow small { display: block; font-size: 12px; opacity: .85; }   /* пауза: «Сброс» и «Сотрудник» рядом (выбор пользователя 23.10, стенд coin.html Б) */
  body[data-from="menu"] #u .prow, body[data-train] #u .prow, body[data-train] #u #u-staff2 { display: none !important; }
  #u #u-staff2 { position: absolute; right: calc(max(24px, env(safe-area-inset-right)) + 58px); bottom: 110px; } #u #u-reset2 { position: absolute; right: calc(max(24px, env(safe-area-inset-right)) + 116px); bottom: 110px; }   /* Poki: сброс коробки за ролик — левее сотрудника (вариант Б, пользователь 25.10) */   /* сотрудник доступен — рядом с камерой, мерцает */   /* тренировка (вариант А стенда train_ui.html, выбор пользователя 23.10): приз без фигурки — свой экран */
  body[data-site=poki] #u .tok, body[data-site=poki] #u-rv, body[data-train] #u .tok, body[data-train] #u-rv, body[data-train] #u #hint, body:not([data-train]) #u-again { display: none; }   /* на T-* — без жетонов и подсказки; «Ещё коробку» — на месте «Подсказки» */
  #u #u-again { position: absolute; right: max(24px, env(safe-area-inset-right)); bottom: 44px; height: 52px; padding: 0 20px; font-size: 17px; }   /* настройки из меню — без экрана автомата под затемнением */
  #u .sheet h2 { margin: 0; font-size: 36px; text-shadow: 0 3px 0 #a3104b, 0 8px 16px #000a; }
  #u .sheet p { margin: 0 0 8px; font-weight: 500; font-size: 17px; line-height: 1.45; color: #ffe3f0; text-shadow: 0 1px 3px #000; }
  #u .sheet .wide { width: 100%; }
  #u .dim { position: absolute; inset: 0; background: #05070bb3; pointer-events: auto; }
  #u-prize .dim { background: radial-gradient(ellipse at 50% 50%, #05070b99, #05070bdd); }
  /* выигранная коробка: вылетает из автомата и летит в «Коллекцию» (плоская картинка, без 3D — пользователь 23.10); на кнопке — число неоткрытых */
  #u-coll { position: relative; }
  #u .badge { position: absolute; top: -10px; right: -10px; min-width: 24px; height: 24px; padding: 0 6px; box-sizing: border-box; border-radius: 12px; background: #ff3b30; color: #fff; font: 800 14px/24px "M PLUS Rounded 1c", sans-serif; font-style: normal; text-align: center; box-shadow: 0 0 0 2px #22232b, 0 3px 6px #0008; }
  #u .nums { display: flex; gap: 18px; align-items: flex-start; } #u .num { display: flex; flex-direction: column; align-items: center; gap: 7px; } #u .nums .ab { width: 50px; height: 50px; font-size: 22px; position: relative; }   /* залы в меню — «Номера» (выбор пользователя 23.10, стенд halls.html Б): закрытый — замок и полоска до открытия */
  #u .nums .lk { position: absolute; right: -6px; bottom: -6px; width: 22px; height: 22px; border-radius: 50%; background: #22232b; display: flex; align-items: center; justify-content: center; } #u .nums .lk svg { width: 13px; height: 13px; }
  #u .nums .ab.grey { --c: #6b6470; --l: #a59cab; --d: #3a343f; color: #e9e2ec; } #u .nums .ab.on { box-shadow: 0 0 0 3px #fff, 0 0 0 4px #5d616c, 0 6px 0 4px #34363e, 0 0 18px 6px #ff3f8e88, inset 0 3px 4px #fff9, inset 0 -5px 8px #0005; }
  #u .hbar { width: 52px; height: 6px; border-radius: 3px; background: #ffffff30; overflow: hidden; } #u .hbar i { display: block; height: 100%; background: #ffd34a; } #u .num small { font-size: 12px; font-weight: 500; color: #ffe3f0; text-shadow: 0 1px 3px #000; }
  #u .hmsg { min-height: 1.2em; margin-top: -8px; font-size: 14px; font-weight: 500; color: #ffe3f0; text-align: center; text-shadow: 0 1px 3px #000; } #u .shake { animation: u-shake .35s; } @keyframes u-shake { 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
  #u .bump { animation: u-bump .45s ease-out; } @keyframes u-bump { 40% { transform: scale(1.22); } }
  .u-box { position: fixed; left: 0; top: 0; z-index: 7; pointer-events: none; filter: drop-shadow(0 14px 18px #000b); }
  .u-box canvas { display: block; height: min(34vh, 260px); width: auto; }
  .u-box.tap { pointer-events: auto; cursor: pointer; }
  .u-ctip { position: fixed; left: 50%; top: 42%; z-index: 7; pointer-events: none; }   /* подсказка вида: кольцо качается вправо-влево по автомату */
  .u-ctip .u-ring { left: 0; top: 0; animation: u-ring 1.1s ease-out infinite, u-swing 2.2s ease-in-out infinite alternate; } @keyframes u-swing { from { translate: -110px 0; } to { translate: 110px 0; } }
  .u-ctip .say { position: absolute; left: 0; top: 84px; transform: translateX(-50%); white-space: nowrap; font: 800 20px/1.2 "M PLUS Rounded 1c", sans-serif; color: #fff; text-shadow: 0 2px 4px #000, 0 0 14px #000a; }
  @media (max-width: 600px) { .u-ctip .say { white-space: normal; width: 300px; text-align: center; font-size: 18px; } }
  @media (max-width: 600px) { .u-ctip.u-gtip .say { top: -22px; left: auto; right: 52px; transform: none; width: 130px; text-align: right; font-size: 16px; } .u-ctip.u-gtip.u-gcoll .say { right: auto; left: 52px; text-align: left; } }   /* телефон: подпись в ряд с кнопкой, не на логотипе (boxiki-93 25.10) */   /* телефон 390: в две строки */
  .u-gtip svg { position: absolute; left: -16px; top: -4px; width: 48px; height: 48px; overflow: visible; filter: drop-shadow(0 3px 4px #14060e73); animation: u-tap 1s ease-in-out infinite; } @keyframes u-tap { 50% { translate: 0 9px; } }   /* рука жмёт на кнопку гачи (пользователь 25.10) */
  .u-gtip .u-ring { animation: u-ring 1.1s ease-out infinite; } .u-gtip .say { top: 70px; transform: translateX(-85%); }   /* подарочная крутка: кольцо стоит на кнопке гачи, подпись — под ней, влево от края */
  .u-catch { position: fixed; inset: 0; z-index: 7; cursor: pointer; pointer-events: auto; }
  #u .u-gback { position: fixed; z-index: 8; left: 16px; top: max(14px, env(safe-area-inset-top)); }   /* «назад» у гачи — как «‹» у автомата */
  .u-flash { position: fixed; inset: 0; z-index: 25; background: #fff1e6; pointer-events: none; }   /* засвет перехода (как в E) — поверх квартиры */
  .u-ring { position: absolute; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; border: 4px solid #fff; box-shadow: 0 0 18px #ff3f8e, inset 0 0 12px #ff3f8e; animation: u-ring 1.1s ease-out infinite; }
  @keyframes u-ring { 0% { transform: scale(.55); opacity: 1; } 100% { transform: scale(1.25); opacity: 0; } }
  .u-catch .say { position: absolute; transform: translateX(-50%); width: max-content; max-width: calc(100vw - 32px); text-align: center; font: 800 22px/1.2 "M PLUS Rounded 1c", sans-serif; color: #fff; text-shadow: 0 2px 4px #000, 0 0 14px #000a; }
  .u-box .say { position: absolute; left: 50%; top: 100%; transform: translate(-50%, 18px); white-space: nowrap; font: 800 22px/1.2 "M PLUS Rounded 1c", sans-serif; color: #fff; text-shadow: 0 2px 4px #000, 0 0 14px #000a; }
  @media (max-width: 600px) {
    body[data-scr="menu"] #u::before { background: linear-gradient(#05070b00 55%, #05070be0); }
    #u .col { left: 16px; right: 16px; top: 74px; bottom: 20px; width: auto; transform: none; justify-content: space-between; }
    #u .logo { font-size: 52px; } #u .logo small { font-size: 13px; }
    #u .key { width: 230px; height: 84px; font-size: 27px; }
    #u .top .gold { order: -1; }                                                    /* «Коллекция» — в левом углу (пользователь 22.10) */
    #u #u-game .where, #u .tm { display: none; }
    #u .prompt { bottom: 300px; font-size: 18px; }   /* над столбцом справа (камера, подсказка): на 250 наезжала на камеру (телефон 23.10) */
    #u #hint { right: 16px; bottom: 186px; height: 46px; font-size: 15px; } #u #u-view { right: 16px; bottom: 244px; } #u #u-staff2 { right: 70px; bottom: 244px; } #u #u-reset2 { right: 124px; bottom: 244px; } #u #u-again { right: 16px; bottom: 186px; height: 46px; font-size: 15px; }   /* сотрудник — в ряд с камерой (был на пульте), «Ещё коробку» — на месте «Подсказки» (была за пультом) */
    #u .sheet h2 { font-size: 30px; } #u .wide { font-size: 17px; padding: 0 18px; }
  }
  @media (orientation: landscape) and (max-height: 500px) {   /* телефон лёжа — вариант А стенда land_pads.html (пользователь 24.10): пульт на месте, кнопки мельче — ядро вписывает автомат над #pads */
    #pads { padding: 6px 12px 8px; gap: 10px; bottom: 8px; border-radius: 22px; } #pads .pad { width: 56px; height: 56px; border-width: 4px; }
    #u .prompt { bottom: 84px; font-size: 16px; } #u #hint, #u #u-again { bottom: 14px; height: 40px; font-size: 14px; } #u #u-view, #u #u-staff2, #u #u-reset2 { bottom: 62px; }
    #u .col { top: 70px; bottom: 10px; transform: none; gap: 8px; justify-content: center; } #u .logo { font-size: 36px; } #u .logo small { display: none; } #u .key { height: 62px; font-size: 24px; margin-bottom: 4px; }   /* меню: логотип срезался верхним краем и лежал на верхней строке (выпуск 24.10, Яндекс 1.10) */
  }
  @media (max-width: 380px) {   /* узкий телефон 360 (бюджетный Android, выпуск 24.10: шестерёнка уходила за правый край — проверка Яндекса 1.10): строка у автомата плотнее */
    #u-game .top { left: max(10px, env(safe-area-inset-left)); right: max(10px, env(safe-area-inset-right)); gap: 7px; } #u-game .top .ico { width: 42px; height: 42px; }
    #u-game .top .chip { height: 42px; padding: 0 10px 0 7px; gap: 5px; font-size: 15px; }
    .u-ctip .say { width: 230px; font-size: 16px; }   /* подсказка камеры — не под кнопкой камеры справа */
  }
  @media (prefers-reduced-motion: reduce) { #u .ab, #u .key { transition: none; } }
</style>`);
document.body.insertAdjacentHTML('beforeend', `<div id="u">
  <div class="scr" id="u-menu"><div class="top"><span class="sp"></span><button class="ab chip gold" id="u-coll"></button><button class="ab ico gch" id="u-gacha" style="display:none;position:relative"></button><div class="ab chip blue tok"></div><button class="ab ico" id="u-set2">${I.gear}</button></div>
    <div class="col"><h1 class="logo">Прутики<small id="u-tag"></small></h1>
      <div class="stack"><div class="pick"><button class="ab ico" id="u-prev">${I.cl}</button><div class="info"><span class="meta" id="u-meta"></span><b id="u-fig"></b><span class="stars" id="u-stars"></span></div>
        <button class="ab ico" id="u-next">${I.cr}</button></div>
        <button class="key" id="u-play"></button><div class="nums" id="u-halls"></div><div class="hmsg" id="u-hmsg"></div></div></div></div>
  <div class="scr" id="u-game"><button class="ab ico" id="u-view"></button><div class="top"><button class="ab ico" id="u-back">${I.cl}</button><div class="where"><span class="meta" id="u-gmeta"></span><b id="u-gfig"></b></div><span class="sp"></span>
      <div class="ab chip blue tok"></div><button class="ab chip yel" id="u-rv"></button><button class="ab ico" id="u-set">${I.gear}</button></div>
    <div class="prompt" id="u-say"></div><button class="ab yel" id="u-again"></button><button class="ab ico blue gch" id="u-staff2" style="display:none">${I.staff}</button><button class="ab ico" id="u-reset2" style="display:none">${I.re}<i class="badge ad">${I.ad}</i></button></div>
  <div class="scr" id="u-conf"><div class="dim"></div><div class="sheet"><h2 id="u-ctitle"></h2><p id="u-ctxt"></p><button class="ab wide yel" id="u-cyes"></button><button class="ab wide" id="u-cno"></button></div></div>
  <div class="scr" id="u-tprize"><div class="dim"></div><div class="sheet"><h2 id="u-twin"></h2><p id="u-twinp"></p><button class="ab wide yel" id="u-tagain"></button><button class="ab wide gold" id="u-thall"></button></div></div>
  <div class="scr" id="u-pause"><div class="dim"></div><div class="sheet"><h2 id="u-ptitle"></h2>
    <div class="vol"><div class="vr"><button class="ab ico" id="u-mus">${I.mus}</button><span id="u-musl"></span><input type="range" id="u-musv" min="0" max="100"></div>
      <div class="vr"><button class="ab ico" id="u-sfx">${I.spk}</button><span id="u-sfxl"></span><input type="range" id="u-sfxv" min="0" max="100"></div></div>
    <div class="prow"><button class="ab wide" id="u-reset"></button><button class="ab wide blue" id="u-staff"></button></div><button class="ab wide" id="u-cont"></button><button class="ab wide gold" id="u-tohall"></button></div></div>
  <div class="scr" id="u-out"><div class="dim"></div><div class="sheet"><h2 id="u-otitle"></h2><p id="u-otxt"></p><button class="ab wide yel" id="u-more"></button><button class="ab wide blue" id="u-train"></button><button class="ab wide" id="u-wait"></button></div></div>
  <div class="scr" id="u-prize"><div class="dim"></div></div>
</div>`);
}

const cam = k => { const c = $('cam'); if (![...c.options].some(o => o.value === k)) c.add(new Option(k, k)); if (c.value !== k) { c.value = k; c.dispatchEvent(new Event('change')); } };
let lastIn = 0, nMove = 0, gFrom = '', wonStars = 0, adNext = false, moved = false, scr = '', sysPause = false, menuAt = 0, justWon = '', flying = 0, homeSeen = false;
const hold = () => { Game.paused = sysPause || scr === 'pause' || scr === 'out'; };   // физика и отрисовка зала стоят: пауза, нет жетонов, платформа (реклама, свернули)
const VIEWS = ['A', 'C', 'D', 'E']; let vi = 0;   // виды у автомата по кругу (ядро setCam/fitCam, выбор пользователя 24.10 «а с д», стенд style_lab/cams.html): A — спереди 40°, C — спереди-сбоку, D — сверху 60°, E — сбоку от левого стекла сверху 55° (снимок пользователя); вписаны в экран
async function nextView() { const c = dbg.camera, C = dbg.controls, p0 = c.position.clone(), q0 = c.quaternion.clone(), t0 = C.target.clone(), f0 = c.fov;
  vi = (vi + 1) % VIEWS.length; cam(VIEWS[vi]); const p1 = c.position.clone(), q1 = c.quaternion.clone(), t1 = C.target.clone(), f1 = c.fov;   // ядро ставит вид сразу — едем к нему плавно
  await tick(600, e => { const k = sm(e); c.position.lerpVectors(p0, p1, k); c.quaternion.slerpQuaternions(q0, q1, k); C.target.lerpVectors(t0, t1, k); c.fov = f0 + (f1 - f0) * k; c.updateProjectionMatrix(); }); }
function trainTip() {                                                              // вход в тренировку: коробки на полке — тапом (ядро Hall.trainPick); гаснет от хода или через 8 с
  const el = Object.assign(document.createElement('div'), { className: 'u-ctip', innerHTML: `<i class="u-ring"></i><span class="say">${T.tpick}</span>` }); el.style.top = '24%'; $('u').append(el);
  const t0 = performance.now(), iv = setInterval(() => { if (scr !== 'game' || !Hall.training?.() || dbg.game?.s !== 'idle' || performance.now() - t0 > 8000) { el.remove(); clearInterval(iv); } }, 200); }
function camTip() {                                                                 // первый заход к автомату: вид можно крутить и отдалять самому (пользователь 23.10) — кольцо ходит по автомату, как «Покрути ручку» у гачи; гаснет от касания вида, хода или через 10 с, один раз
  Save.set({ camTip: 1 }); const el = Object.assign(document.createElement('div'), { className: 'u-ctip', innerHTML: `<i class="u-ring"></i><span class="say">${matchMedia('(pointer: coarse)').matches ? T.ctipT : T.ctipM}</span>` }); $('u').append(el);
  const C = dbg.controls, t0 = performance.now(), off = () => { el.remove(); C.removeEventListener('start', off); clearInterval(iv); }, iv = setInterval(() => { if (scr !== 'game' || !['idle', 'ready'].includes(dbg.game?.s) || performance.now() - t0 > 10000) off(); }, 200); C.addEventListener('start', off); }
function show(s) {
  if (scr === s) return; const scr0 = scr; scr = s; document.body.dataset.scr = s; document.querySelector('.u-gtip')?.remove();
  SND.music(s === 'home' ? ['home1', 'home2'] : ['hall', 'hall2', 'hall3'], s === 'home' ? undefined : 0.16); SND.amb(s === 'home' ? 'room' : null); if (s === 'out') SND.play('nope', { vol: 0.8 });   // зал — М-3/М-5/М-7 по кругу, тише (пользователь 23.10: «музычка может раздражать»), квартира — К-1/К-3 + фон комнаты Д-11; жетоны кончились — Н-12
  if (s === 'menu') { cam('hall'); $('cam').dispatchEvent(new Event('change')); menuAt = performance.now(); draw(); }
  if (s === 'game') { if (scr0 !== 'pause' && scr0 !== 'out') { vi = 0; cam(VIEWS[0]); } if (scr0 === 'menu') { moved = false; nMove = 0; } }
  const C = dbg.controls, G = s === 'game', M = s === 'menu'; C.minDistance = G ? 0.25 : M ? 1.2 : 0; C.maxDistance = G ? 3.0 : M ? 3.3 : Infinity; C.maxPolarAngle = G || M ? 1.3 : Math.PI; C.enablePan = !M;   // меню: вид зала 3,15 м — дальше не отъехать, без сдвига (пользователь 23.10: «в меню улетаю — всё чернеет»)   // у автомата: не дальше ~3 автоматов в кадре и не ниже прутков (пользователь 23.10: «улетаешь — всё чернеет»)
  hold();
  if (s === 'game') P.start(); else P.stop();                                       // GameplayAPI: идёт только у автомата (меню, пауза, приз, квартира — стоп)
}
const HAND = `<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#3a1f33" stroke-width="4.2"><path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></g><g stroke="#fff" stroke-width="2"><path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></g></svg>`;   // рука-указатель — та же, что у подсказок квартиры (apt.html #cue)
function giftTip() { if (document.querySelector('.u-gtip[data-hb]')) return;   // рука на «Подсказке» — свои 6 с                                                             // Poki: подарочная крутка — кольцо на кнопке гачи, пока игрок впервые не покрутил (пользователь 25.10; подсказка жестом на объекте, как стенд E)
  const S = Save.get(), nw = Object.keys(S.won || {}).length, coin = scr === 'game' && idle() && nw === 0 && !Hall.training?.(), hb = scr === 'game' && idle() && nw >= 3 && nMove >= 2 && !S.hintTip && !S.won?.[Hall.at()] && $('hint').getBoundingClientRect().width > 0, box = scr === 'menu' && (S.boxes || []).length > 0 && Object.keys(S.won || {}).length <= 3, b = $(coin ? 'b0' : hb ? 'hint' : box ? 'u-coll' : 'u-gacha'), r = b.getBoundingClientRect(), say = coin || hb ? '' : box ? (T === RU ? 'Распакуй подарок!' : 'Unbox your prize!') : T === RU ? 'Бесплатная крутка!' : 'Free spin!';   // самый первый ход — рука на монете, подпись — строка над пультом (boxiki-93 25.10: две подсказки текстом посреди поля)   // первые 3 фигурки: неоткрытые коробки — рука на «Коллекции» (пользователь 25.10), иначе — подарочная крутка
  let old = document.querySelector('.u-gtip'); if (hb) { Save.set({ hintTip: 1 }); setTimeout(() => document.querySelector('.u-gtip')?.remove(), 6000); }   // 3+ приза: два промаха подряд — рука на «Подсказку» один раз
  const on = r.width > 0 && (coin || hb || box || (P.site === 'poki' && scr === 'menu' && !S.gTip && Tokens.free?.() > 0));
  if (!on) return old?.remove(); if (old && old.querySelector('.say').textContent !== say) { old.remove(); old = null; }
  const el = old ?? document.body.appendChild(Object.assign(document.createElement('div'), { className: 'u-ctip u-gtip', innerHTML: `<i class="u-ring"></i>${HAND}<span class="say">${say}</span>` }));
  el.classList.toggle('u-gcoll', box); if (hb) el.dataset.hb = 1; el.style.left = r.x + r.width / 2 + 'px'; el.style.top = r.y + r.height / 2 + 'px'; }
function draw() {
  const id = Hall.at(), f = info(id), w = Save.get().won, L = Hall.ids(), i = L.indexOf(id);
  $('u-meta').textContent = `${T.hall} ${f.hall} · ${f.series} · ${f.k} ${T.of} ${f.n}`; $('u-fig').textContent = f.fig;
  $('u-stars').innerHTML = [1, 2, 3].map(k => I.star(k <= (w[id]?.stars || 0))).join('');
  $('u-prev').disabled = i <= 0; $('u-next').disabled = i < 0 || i >= L.length - 1;
  { const h = halls().map(n => hOpen(n) ? `<div class="num"><button class="ab ${n === f.hall ? 'on' : 'blue'}" data-h="${n}">${n}</button><small>${T.hof(hWon(n))}</small></div>` : `<div class="num"><button class="ab grey" data-h="${n}">${n}<span class="lk">${I.lock}</span></button><span class="hbar"><i style="width:${100 * Math.min(1, hWon(n - 1) / OPEN_AFTER)}%"></i></span></div>`).join('');
    if ($('u-halls').innerHTML !== h) $('u-halls').innerHTML = h; }
  const nb = (Save.get().boxes || []).length - flying;   // неоткрытые; летящая ещё не долетела
  $('u-coll').innerHTML = `${I.home}<b>${new Set([...Object.entries(w).flatMap(([mid, x]) => x.items ?? [mid]), ...Save.get().gacha ?? []].map(HS.figOf)).size}</b><small>/${Object.keys(SJ.FIG).length}</small>${nb > 0 ? `<i class="badge">${nb}</i>` : ''}`;
  { const el = $('u-gacha'), n = Q.has('spin') ? 1 : Tokens.free?.() ?? 0, ad = !n && Tokens.adLeft?.() > 0; el.style.display = n || ad ? '' : 'none';   // крутка гачи (выбор пользователя 23.10: круглая, шарик, без надписи): число — за жетоны, значок рекламы — крутка за ролик (4.5.1: видно, что дают)
    el.innerHTML = `${I.cap}${n ? `<i class="badge">${n}</i>` : ad ? `<i class="badge ad">${I.ad}</i>` : ''}`; }
  giftTip(); play();
  const tr = Hall.training?.(), to = tr && Hall.trainOpts?.(); if (tr) document.body.dataset.train = '1'; else delete document.body.dataset.train;
  $('u-gmeta').textContent = tr ? T.tmeta : `${T.hall} ${f.hall} · ${f.k} ${T.of} ${f.n}`; $('u-gfig').textContent = tr ? to?.list.find(x => x.id === to.now)?.name ?? '' : f.fig;
  tok();
}
let tokTxt = '';
const staffFree = () => Q.has('staff') || !Save.get().assistUsed;   // ECONOMY: первый вызов в жизни — бесплатно, дальше за ролик
function staffUi() {                                                                // порог сотрудника (ядро Hall.assistInfo: ходов на этой коробке и порог 3…12): у камеры — кнопка, в паузе — со счётчиком
  const a = Hall.assistInfo?.(), ok = a && a.ok && a.n >= a.need && !Hall.training?.(), b = $('u-staff'), h = ok ? `${I.staff}<span>${T.staff}</span>${staffFree() ? '' : I.ad}` : `${I.staff}<span>${T.staff}<small>${T.inN(Math.max(1, (a?.need ?? 3) - (a?.n ?? 0)))}</small></span>`;
  if (b.innerHTML !== h) b.innerHTML = h; b.disabled = !ok; b.style.display = a?.ok ? '' : 'none'; $('u-staff2').style.display = ok && scr === 'game' ? '' : 'none'; { const h2 = I.staff + (staffFree() ? '' : `<i class="badge ad">${I.ad}</i>`); if ($('u-staff2').innerHTML !== h2) $('u-staff2').innerHTML = h2; }   // круглые кнопки за ролик — значок в углу, как у гачи (пользователь 26.10, вариант 1: «так везде»); первый вызов сотрудника бесплатный — без значка
  $('u-reset2').style.display = P.site === 'poki' && scr === 'game' && a && a.n >= a.need && !Hall.training?.() && idle() ? '' : 'none'; }   // Poki: сброс за ролик у автомата — с того же порога, что сотрудник (4 / 6 ходов)   // поз сотрудника на автомате нет (assist_table) — кнопки нет
function tok() {                                                                    // жетоны: «12/15 · +1 через 8:12»; раз в 250 мс, DOM — только при смене текста
  const t = Tokens.get(), h = `${I.coin}<b>${t.n}</b><small>/${MAX}</small>${t.next ? `<span class="tm">${T.in(mmss(t.next))}</span>` : ''}`;
  $('u-rv').style.display = t.n < MAX ? '' : 'none';   // «+3» за ролик — только ниже потолка, копить рекламой сверх него нельзя (пользователь 24.10: «рекламу можно сколько угодно смотреть?»)
  if (h !== tokTxt) { tokTxt = h; document.querySelectorAll('#u .tok').forEach(e => { e.innerHTML = h; e.title = e.ariaLabel = T.tok; }); }
  if (scr === 'out') { if (t.n > 0) show('game'); else $('u-otxt').innerHTML = T.outp(mmss(t.next)); }
  staffUi();
}
function boxPic(id) {                                                              // коробка автомата картинкой 3/4: лицо, бок и верх — те же печати, что в автомате (HS.boxMats), стоит головой вверх
  const S = BOXES.find(b => b.id === MACHINES.find(m => m.id === id)?.box)?.size ?? [0.15, 0.25, 0.14], F = HS.boxMats(S.map(v => v / 2), HS.figOf(id), HS.bsOf(id)).map(m => m.map.image);
  const k = 900, W = S[0] * k, H = S[1] * k, D = S[2] * k * 0.55, dx = D * 0.87, dy = D * 0.5, c = document.createElement('canvas'); c.width = Math.ceil(W + dx + 4); c.height = Math.ceil(H + dy + 4);
  const g = c.getContext('2d'), x0 = 2, y0 = dy + 2;
  g.setTransform(1, 0, 0, 1, x0, y0); g.drawImage(F[4], 0, 0, W, H);                                         // лицо
  g.setTransform(dx / D, -dy / D, 0, 1, x0 + W, y0); g.drawImage(F[0], 0, 0, D, H); g.fillStyle = '#0005'; g.fillRect(0, 0, D, H);   // бок — в тени
  g.setTransform(1, 0, -dx / D, dy / D, x0 + dx, y0 - dy); g.drawImage(F[2], 0, 0, W, D); g.fillStyle = '#fff2'; g.fillRect(0, 0, W, D);   // верх — светлее
  return c; }
const tick = (ms, f) => new Promise(ok => { const t0 = performance.now(), go = () => { const e = Math.min(1, (performance.now() - t0) / ms); f(e); e < 1 ? requestAnimationFrame(go) : ok(); }; go(); });
const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const keep = o => o.querySelectorAll('.say').forEach(e => { const r = e.getBoundingClientRect(), d = Math.max(0, 16 - r.left) - Math.max(0, r.right - innerWidth + 16); if (d) e.style.left = parseFloat(e.style.left) + d + 'px'; });   // подпись у кольца — в экран (телефон 360: «Покрути ручку…» обрезалась справа, boxiki-af 23.10)
let hq = 0, hfly = false; const hstep = () => { if (!hq || hfly) return; const L = Hall.ids(), i = L.indexOf(Hall.at()), d = Math.max(0, Math.min(L.length - 1, i + Math.max(-3, Math.min(3, hq)))) - i; if (Math.abs(d) > 1) HS.prep?.(L[i + d]); if (d && Hall.go(d)) { hfly = UI.fly = true; hq -= d; } else hq = 0; };   // накопленное — одним перелётом до 3 автоматов (пользователь 23.10: «не останавливаться на каждом»); дальше 3 соседи не построены   // ‹ › копятся (пользователь 23.10: «нажать раз 7 — пусть промотает к 7-му»): следующий перелёт — по приезде
const toOpen = (from, k = 0) => {                                                         // в меню из квартиры / гачи — к первому непройденному автомату зала, начиная с того, где был (пользователь 25.10: после гачи меню стояло на 1-0)
  const w = Save.get().won, L = LV().filter(x => x.hall === info(from).hall).map(x => x.id), i = Math.max(0, L.indexOf(from)), id = [...L.slice(i), ...L.slice(0, i)].find(x => !w[x]) ?? from;
  if (info(id).hall !== info(Hall.at()).hall) return Hall.to?.(id); const d = hq = Hall.ids().indexOf(id) - Hall.ids().indexOf(Hall.at()); hstep();
  if (d && !hfly && k < 40) setTimeout(() => scr === 'menu' && toOpen(from, k + 1), 250); };   // Hall.go отказал (лапа меню начала ход — как в spin()) — повторять до 10 с (пользователь 26.10: после распаковки 2-й не перекинуло на 3-й, пройденный автомат стоял пустой)
async function spin() {                                                            // гача «Потеряшки» (стенд E, pack=gacha 1:1): камера к автомату → ручку по кругу (тап — сама) → капсулы вздрагивают, капсула выкатывается в лоток → тап → засвет → квартира, капсула на подоконнике
  if (scr === 'menu' && !idle()) Hall.to?.(Hall.at());   // лапа меню сама пробует коробку — остановить (пользователь 23.10: «гача иногда не нажимается» — ждали её покоя молча)
  if (scr !== 'menu' || flying || !idle()) return; if (P.site === 'poki') { Save.set({ gTip: 1 }); document.querySelector('.u-gtip')?.remove(); }
  if (!(Tokens.free?.() > 0) && !Q.has('spin')) { if (!(Tokens.adLeft?.() > 0) || !(await Tokens.adSpin())) return draw(); }   // за ролик — засчитано, только если досмотрен
  gFrom = Hall.at(); for (let i = 0; i < 100 && (Hall.at() !== 'H1-0' || !idle()); i++) { Hall.to?.('H1-0'); await new Promise(r => setTimeout(r, 100)); }   // гача — вплотную к 1-0: всегда к нему (соседи строятся ±3 — от 1-4 и дальше 1-0 нет, гача стояла одна; пользователь 24.10), Hall.to — повторять, пока лапа меню занята (и на самом H1-0: лапа меню начала ход, пока шёл ролик, — останавливает её только Hall.to, иначе ждали её 10 с и бросали; пользователь 24.10 на черновике)
  if (Hall.at() !== 'H1-0') return draw();   // не дошли — к гаче не летим (иначе — пустой зал: в другом зале гача скрыта)
  show('door'); const G = HS.GACHA, U = G.userData, c = dbg.camera, V = (x, y, z) => new THREE.Vector3(x, y, z), FZ = -0.95;
  const go = async (tg, d, hh, hw, ms) => { const tn = Math.tan(36 * Math.PI / 360), p1 = tg.clone().addScaledVector(d.normalize(), Math.max(hh / tn, hw / (tn * c.aspect))), aim = c.clone(); aim.position.copy(p1); aim.lookAt(tg);   // кадр как camGo стенда E
    const p0 = c.position.clone(), q0 = c.quaternion.clone(), f0 = c.fov, t0 = dbg.controls.target.clone();
    await tick(ms, e => { const k = sm(e); c.position.lerpVectors(p0, p1, k); c.quaternion.slerpQuaternions(q0, aim.quaternion, k); dbg.controls.target.lerpVectors(t0, tg, k); c.fov = f0 + (36 - f0) * k; c.updateProjectionMatrix(); }); };
  await go(G.localToWorld(V(-0.06, 0, FZ + (innerWidth > innerHeight ? 0.74 : 0.86))), V(-0.25, -1, 0.3), 0.84, 0.44, 1600);
  const at = o => { const v = o.getWorldPosition(V()).project(c); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [cx, cy] = at(U.crank);
  const ov = Object.assign(document.createElement('div'), { className: 'u-catch', innerHTML: `<i class="u-ring" style="left:${cx}px;top:${cy}px"></i><span class="say" style="left:${cx}px;top:${cy + 76}px">${T.crank}</span>` }), gb = Object.assign(document.createElement('button'), { className: 'ab ico u-gback', innerHTML: I.cl, ariaLabel: T.back }); $('u').append(ov, gb); keep(ov);   // оба в #u: «назад» (z 8) над слоем ручки (z 7) — в body слой (z 7) перекрывал весь #u (z 6), «‹» не нажималась и тап по ней крутил ручку (пользователь 23.10)
  const turned = await new Promise(ok => { gb.onclick = () => ok(false); let a0 = null, acc = 0, x0 = 0, y0 = 0, t0 = 0; const ang = e => Math.atan2(e.clientY - cy, e.clientX - cx), near = e => Math.hypot(e.clientX - cx, e.clientY - cy) < 130;   // угол пальца вокруг ручки на экране; полтора оборота — готово; «назад» до поворота (пользователь 23.10) — крутка не тратится
    ov.onpointerdown = e => { if (!near(e)) return; a0 = ang(e); x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); try { ov.setPointerCapture(e.pointerId); } catch (_) {} };
    ov.onpointermove = e => { if (a0 === null) return; const a = ang(e); let d = a - a0; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI; a0 = a; if (acc < 0.3 && acc + Math.abs(d) >= 0.3) SND.play('crank', { vol: 0.8 }); acc += Math.abs(d); U.crank.rotation.y += d; if (acc >= 1.5 * Math.PI) { a0 = null; ok(true); } };
    ov.onpointerup = e => { const tap = a0 !== null && Math.hypot(e.clientX - x0, e.clientY - y0) < 10 && performance.now() - t0 < 600; a0 = null; if (tap) { SND.play('crank', { vol: 0.8 }); const r0 = U.crank.rotation.y; tick(900, k => { U.crank.rotation.y = r0 + 2 * Math.PI * sm(k); }).then(() => ok(true)); ov.onpointerdown = null; } }; });   // тап — ручка поворачивается сама
  ov.remove(); gb.remove(); if (!turned) { U.crank.rotation.y = 0; show('menu'); toOpen(gFrom); gFrom = ''; return; }
  if (!Q.has('spin')) Tokens.spin?.();   // ?spin — посмотреть гачу без 10 потраченных жетонов (проверка), крутка не тратится
  const L = [...SJ.GACHA.figs, SJ.GACHA.secret], f = L[Math.floor(Math.random() * L.length)], gs = Save.get().gacha ?? [], id = `G~${f}~${gs.length}`;   // 1 из 8, секретка — как обычная (пользователь 23.10)
  Save.set({ gacha: [...gs, id], boxes: [...Save.get().boxes ?? [], id] });
  SND.play(['roll1', 'roll2'], { vol: 0.6 }); await tick(500, e => { U.caps.rotation.z = 0.06 * Math.sin(e * Math.PI * 3) * (1 - e); });   // капсулы в куполе вздрагивают
  const cap = HS.capsule(HS.CAPC[L.indexOf(f) % HS.CAPC.length], U.CR); cap.rotation.x = Math.PI / 2; G.add(cap);   // до выхода — за непрозрачной передней стенкой
  const [r0, r1] = U.out; SND.play('roll3', { vol: 0.8 }); await tick(800, e => { const k = Math.min(1, e / 0.8); cap.position.lerpVectors(r0, r1, sm(k)); cap.position.z = r0.z + (r1.z - r0.z) * Math.min(1, k * 1.4); cap.rotation.x = Math.PI / 2 - r0.distanceTo(cap.position) / U.CR; });   // выкатывается в лоток
  await go(G.localToWorld(U.tray.clone()), V(-0.2, -1, 0.55), 0.15, 0.17, 1400);
  const [px, py] = at(cap), tp = Object.assign(document.createElement('div'), { className: 'u-catch', innerHTML: `<i class="u-ring" style="left:${px}px;top:${py}px"></i><span class="say" style="left:${px}px;top:${py + 110}px">${T.takeCap}</span>` });
  document.body.append(tp); keep(tp); await new Promise(ok => { tp.onclick = e => Math.hypot(e.clientX - px, e.clientY - py) < 150 && ok(); }); tp.remove(); SND.play('pop', { vol: 0.8 });   // только по капсуле, не в любом месте экрана
  const fl = Object.assign(document.createElement('div'), { className: 'u-flash' }); document.body.append(fl); await fl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, fill: 'forwards' }).finished;
  cap.removeFromParent(); for (const m of cap.userData.mats) m.dispose(); U.caps.rotation.z = 0; U.crank.rotation.y = 0;
  show('home'); await Home.show(); fl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished.then(() => fl.remove()); }   // в квартиру: капсула на подоконнике, распаковка за столом
const MOT = { move1: 1, move2: 1, carry: 1, return: 1, drop: 0.85, lift: 1.08 }, HELD = new Set(['close', 'lift', 'carry', 'shut', 'return']);   // мотор (Л-21): едет — 1, спуск ниже, подъём выше; в лапе коробка не «скользит»
function sndWatch() { SND.preload(['motor', 'hit1', 'hit2', 'hit3', 'scrape', 'coin', 'chute', 'click']); let mo = 0, bv = null, lt = 0, bt = 0, st = 0, n = 0, gs = '', tk = Tokens.get?.().n ?? 0, tt = 0;   // по кадру: мотор лапы по её состоянию, удары коробки — по скачку скорости (без тяжести), скольжение по пруткам
  const f = t => { requestAnimationFrame(f); const dt = Math.min(0.05, (t - lt) / 1000) || 0.016; lt = t; const G = dbg.game, on = !Game.paused && (scr === 'game' || scr === 'menu'), r = on && MOT[G?.s], k = scr === 'menu' ? 0.45 : 1;   // меню: лапа пробует сама — тише
    if (!r && mo) SND.play('motor', { at: 6.1, dur: 1.1, vol: 0.08 * k, rate: mo }); mo = r || 0;   // лапа встала — хвост остановки из той же записи
    $('b0')?.classList.toggle('wait', G?.s === 'idle' && scr === 'game');
    const w = Save.get().won || {}, tu = scr === 'game' && !w[Hall.at()] && !Hall.training?.() && Object.keys(w).length <= 1; for (const [b, s] of [['b0', 'idle'], ['b1', 'ready'], ['b2', 'wait2']]) $(b)?.classList.toggle('tip', tu && G?.s === s);   // до приза на этом автомате, пока призов 0–1: нужная кнопка пульта мерцает (пользователь 25.10)
    SND.loop('motor', r ? 'motor' : null, { rate: r || 1, vol: 0.08 * k, from: 0.4, to: 6.0 });
    if (G?.s !== gs) { if (G?.s === 'hint' && scr === 'game') SND.play('hint', { vol: 0.7 }); gs = G?.s; }   // подсказка удара появилась (Н-8)
    if (t - tt > 500) { tt = t; const v = Tokens.get?.().n ?? 0; if (v > tk && scr !== 'home') SND.play('tokens', { vol: 0.7 }); tk = v; }   // жетоны прибавились: ролик, таймер (Н-18)
    const d = dbg.d, i = dbg.J?.c?.BV; if (!on || !d || i == null) { bv = null; return; } const v = [d.qvel[i], d.qvel[i + 1], d.qvel[i + 2]];
    if (bv) { const imp = Math.hypot(v[0] - bv[0], v[1] - bv[1], v[2] - bv[2] + 9.81 * dt);
      if (imp > 0.35 && t - bt > 90) { bt = t; SND.play(imp > 0.8 ? ['hit2', 'hit3'] : 'hit1', { vol: Math.min(1, 0.25 + imp * 0.5) * k, rate: 0.9 + Math.random() * 0.2 }); }   // Б-32 мягко, Б-39/40 сильнее
      n = Math.hypot(v[0], v[1]) > 0.08 && Math.abs(v[2]) < 0.05 && !HELD.has(G?.s) ? n + 1 : 0; if (n === 8 && t - st > 1200) { st = t; SND.play('scrape', { vol: 0.5 * k }); } }   // едет по пруткам (Б-2)
    bv = v; }; requestAnimationFrame(f); }
async function takeBox(id, first) {                                                // приз, как на стенде E (lab.js buildE): коробка в коробе выдачи → камера к нему → тап: шторка вверх, коробка выезжает и встаёт к камере → засвет → первый раз за стол распаковки, дальше — в меню, картинка коробки влетает в «Коллекцию»
  if (scr !== 'game') { flying--; draw(); return; }
  show('door'); const H = HS.HOOD, c = dbg.camera, V = (x, y, z) => new THREE.Vector3(x, y, z), S = BOXES.find(b => b.id === MACHINES.find(m => m.id === id)?.box)?.size ?? [0.15, 0.25, 0.14];
  const basis = (a, b, d) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, b, d)), qLie = basis(V(0, 0, -1), V(1, 0, 0), V(0, -1, 0)), qUp = basis(V(1, 0, 0), V(0, 0, 1), V(0, -1, 0));   // лежит длиной вдоль короба лицом к игроку → стоит лицом к камере
  const box = new THREE.Mesh(new THREE.BoxGeometry(...S), HS.boxMats(S.map(v => v / 2), HS.figOf(id), HS.bsOf(id)).map(m => Object.assign(m.clone(), { emissiveMap: m.map, emissive: new THREE.Color(0.3, 0.3, 0.3) }))); box.quaternion.copy(qLie); box.position.set(H.x, H.y - H.HD / 2 - 0.012, H.z - H.HH / 2 + S[0] / 2 + 0.002); H.g.add(box);   // печать чуть светится: за дымчатой шторкой и лицом к камере не в тени
  const tg = V(H.x + 0.06, H.y - 0.12, H.z + 0.08), tn = Math.tan(36 * Math.PI / 360), p1 = tg.clone().addScaledVector(V(0.35, -1, 0.55).normalize(), Math.max(0.3 / tn, 0.3 / (tn * c.aspect)));   // кадр winShot из E
  const p0 = c.position.clone(), q0 = c.quaternion.clone(), f0 = c.fov, t0 = dbg.controls.target.clone(), aim = c.clone(); aim.position.copy(p1); aim.lookAt(tg);   // t0: игрок крутил вид — ядро каждый кадр смотрит в controls.target (OrbitControls), его тоже ведём к коробу
  await tick(1800, e => { const k = sm(e); c.position.lerpVectors(p0, p1, k); c.quaternion.slerpQuaternions(q0, aim.quaternion, k); dbg.controls.target.lerpVectors(t0, tg, k); c.fov = f0 + (36 - f0) * k; c.updateProjectionMatrix(); });
  const v = box.getWorldPosition(V()).project(c), x0 = (v.x + 1) / 2 * innerWidth, y0 = (1 - v.y) / 2 * innerHeight;
  const tap = Object.assign(document.createElement('div'), { className: 'u-catch', innerHTML: `<i class="u-ring" style="left:${x0}px;top:${y0}px"></i><span class="say" style="left:${x0}px;top:${y0 + 76}px">${T.take}</span>` });
  document.body.append(tap); keep(tap); await new Promise(ok => { tap.onclick = ok; }); tap.remove();
  await tick(500, e => { H.flap.rotation.x = -2.9 * sm(e); });                    // шторка откидывается вверх до упора
  const b0 = box.position.clone(), b1 = V(H.x + 0.05, H.y - H.HD - 0.22, H.z + 0.16);
  await tick(1200, e => { const a = sm(e / 0.55), u = sm((e - 0.45) / 0.55); box.position.set(b0.x + (b1.x - b0.x) * a, b0.y + (b1.y - b0.y) * a, b0.z + (b1.z - b0.z) * u); box.quaternion.slerpQuaternions(qLie, qUp, u); });   // сначала выезжает из окна, потом поднимается и встаёт
  const fl = Object.assign(document.createElement('div'), { className: 'u-flash' }); document.body.append(fl);   // засвет — и переход
  await fl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, fill: 'forwards' }).finished;
  box.removeFromParent(); box.material.forEach(m => m.dispose()); H.flap.rotation.x = 0;
  if (first) { flying--; show('home'); await Home.show(); fl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished.then(() => fl.remove()); return; }   // первый раз — сразу за стол распаковки, без полноэкранной
  show('menu'); const el = Object.assign(document.createElement('div'), { className: 'u-box' }); el.append(boxPic(id)); document.body.append(el);
  const { width: bw, height: bh } = el.getBoundingClientRect(), at = (x, y, s = 1, r = 0) => `translate(${x - bw / 2}px, ${y - bh / 2}px) scale(${s}) rotate(${r}deg)`, cx = innerWidth / 2, cy = innerHeight * 0.44;
  el.style.transform = at(cx, cy); fl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished.then(() => fl.remove()); await new Promise(r => setTimeout(r, 450));
  const r = $('u-coll').getBoundingClientRect(), x1 = r.left + r.width / 2, y1 = r.top + r.height / 2;
  await el.animate([{ transform: at(cx, cy, 1) }, { transform: at((cx + x1) / 2, Math.min(cy, y1) - 60, 0.6, -10), offset: 0.45 }, { transform: at(x1, y1, 0.1, -24), opacity: 0.7 }], { duration: 700, easing: 'ease-in', fill: 'forwards' }).finished;
  el.remove(); flying--; draw(); SND.play('drop1', { vol: 0.8 }); for (let k = 0; k < wonStars; k++) setTimeout(() => SND.play('star', { vol: 0.7, rate: 1 + 0.12 * k }), 250 + 220 * k); const cb = $('u-coll'); cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump');   // звёзды за приз (Н-14), каждая выше
  if (scr === 'menu' && justWon === id) { justWon = ''; if (!afterPrize()) adNext = true; setTimeout(() => toOpen(id), 400); } }   // как раньше: после приза — к следующему автомату; полноэкранная — на «Играть» у него (Яндекс 4.4: после действия игрока; boxiki-54), не вместе с ярлыком / оценкой
const afterPrize = () => { const n = Object.keys(Save.get().won || {}).length; if (n === 1) P.shortcut(); else if (n === 3) P.review(); return n === 1 || n === 3; };   // в меню после приза (логическая пауза): 1-й — ярлык на рабочий стол, 3-й — просьба оценить (ECONOMY; P сам проверяет canShow)
function texts() {
  const s = (id, v) => { $(id).textContent = v; };
  s('u-tag', T.tag); document.querySelector('.logo').firstChild.textContent = T.name; playTxt = ''; play(); s('u-ptitle', T.pause); s('u-cont', T.cont); s('u-tohall', T.back); 
  s('u-reset', ''); $('u-reset').innerHTML = `${I.re}${T.reset}${P.site === 'poki' ? I.ad : ''}`; $('u-reset2').ariaLabel = $('u-reset2').title = T.reset; s('u-cno', T.cancel); $('u-staff2').ariaLabel = $('u-staff2').title = T.staff;
  s('u-otitle', T.out); s('u-wait', T.wait); $('u-train').innerHTML = `${I.aim}${T.train}`; $('u-again').innerHTML = $('u-tagain').innerHTML = `${I.re}${T.again}`; $('u-thall').innerHTML = `${I.home}${T.back}`; s('u-twin', T.twin); $('u-twinp').innerHTML = T.twinp; $('u-more').innerHTML = `${I.ad}${T.more(RV())}`; $('u-rv').innerHTML = `${I.ad}+${RV()}${I.coin}`;   // число — из флага tokens_rv (после P.init), не вшитое: кнопка обещает ровно награду (Яндекс 4.5.1)
  $('u-back').ariaLabel = T.back; $('u-view').ariaLabel = $('u-view').title = T.view; $('u-set').ariaLabel = $('u-set2').ariaLabel = T.set; s('u-musl', T.music); s('u-sfxl', T.sfx); $('u-coll').title = $('u-coll').ariaLabel = T.coll; $('u-rv').ariaLabel = T.more(RV()); $('u-prev').ariaLabel = '‹'; $('u-next').ariaLabel = '›';
}
const idle = () => window.dbg?.game?.s === 'idle', homing = () => idle() || ['shut', 'return'].includes(window.dbg?.game?.s);   // homing — лапа уже разжалась и едет на старт: уйти можно, доедет сама (пользователь 23.10: «не ждать, пока голова доедет»)
HS.gateFigs(new Promise(r => { addEventListener('p-ready', r, { once: true }); setTimeout(r, 120e3); }));   // 3D-фигурки соседей — после готовности (запас 120 с, если ready не пришёл; 15 с на медленной сети срабатывали раньше старта)
window.P = P;   // квартира во фрейме и её печать коробок берут язык игры из parent.P (apt.js, boxstyles.isEN)
window.UI = { fly: false, busy: () => UI.fly || (scr === 'game' || scr === 'pause' || scr === 'out') && !idle() };   // и перелёт ‹ › (замер 23.10: заливка текстуры квартиры 57 мс посреди перелёта)   // идёт ход — квартира не догружается (apt.js ждёт между кусками; замер 23.10: кусок 53 мс посреди хода)
async function reward() { if (await P.rewarded('tokens')) Tokens.add(RV()); }                  // rewarded — только по кнопке с подписью, что дадут (Яндекс 4.5.1); без рекламы игра идёт (таймер, 4.5.2)

function mount() {
  window.Tokens = Tokens;                                                           // ядро: ход = Tokens.spend() (press в index.html)
  texts(); draw();
  $('u-game').append($('hint'));                                                    // подсказка игровой сессии (обучение 1-0/1-1) — капсулой справа внизу
  $('hint').className = 'ab'; $('hint').style.alignSelf = '';
  $('u-prev').onclick = () => { hq--; hstep(); }; $('u-next').onclick = () => { hq++; hstep(); }; addEventListener('machine', () => { hfly = UI.fly = false; hstep(); });
  $('u-halls').onclick = e => { const b = e.target.closest('[data-h]'), n = +b?.dataset.h; if (!b || n === info(Hall.at()).hall) return; let t = $('u-hmsg');
    if (hOpen(n)) { const w = Save.get().won, L = LV().filter(x => x.hall === n); t.textContent = ''; Hall.to?.((L.find(x => !w[x.id]) ?? L[0]).id); return; }   // открытый зал — на первый автомат без приза (все выбиты — на первый)
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); t.textContent = T.hlock(n, OPEN_AFTER - hWon(n - 1)); clearTimeout(t.tm); t.tm = setTimeout(() => t.textContent = '', 3500); };
  $('u-play').onclick = async () => { if (adNext || (P.site === 'poki' && Object.keys(Save.get().won || {}).length >= 2)) { adNext = false; await P.fullscreen(); } show('game'); };   // Poki: до второго приза без рекламы на «Играть» (пользователь 25.10: не на старте второго автомата)   // Poki: commercialBreak — на каждом возврате в игру, частоту режет Poki   // после приза — полноэкранная по нажатию «Играть» (пример Яндекса «Следующая»)
  $('u-gacha').onclick = spin; $('u-view').onclick = nextView; $('u-view').innerHTML = I.camv;
  dbg.controls.addEventListener('change', () => { if (scr !== 'game') return; const t = dbg.controls.target; t.set(Math.max(-0.5, Math.min(0.5, t.x)), Math.max(-0.4, Math.min(0.6, t.y)), Math.max(-0.3, Math.min(0.6, t.z))); });   // сдвиг вида — в пределах автомата
  $('u-coll').onclick = async () => { show('home'); if (P.site !== 'poki') await P.fullscreen(); Home.show(); };   // Poki: реклама только по пути назад в игру («leaving gameplay … = Wrong»)   // вход в коллекцию — логическая пауза для полноэкранной (ECONOMY; частоту режет площадка)
  const leave = () => { show('menu'); if (moved) { moved = false; if (P.site !== 'poki') P.fullscreen(); } };   // «‹ В зал» после хода на автомате — полноэкранная (boxiki-54, согласовано 23.10; лимиты — в P.fullscreen)
  $('u-back').onclick = () => { if (Hall.training?.()) exitTrain(); else if (homing()) leave(); };                       // уйти — между ходами или когда лапа уже едет на старт; посреди хода нельзя (приз выпал бы в меню)
  let from = 'game'; const openSet = f => { from = f; document.body.dataset.from = f; $('u-tohall').style.display = f === 'game' ? '' : 'none'; $('u-ptitle').textContent = f === 'game' ? T.pause : T.set; show('pause'); };   // шестерёнка = пауза (у автомата) и настройки (в меню)
  let cyes = null; const ask = (t, p, go, fn) => { s2('u-ctitle', t); s2('u-ctxt', p); s2('u-cyes', go); cyes = fn; show('conf'); };   // игровое окно «уверены?» (пользователь 23.10), не confirm() браузера
  const s2 = (id, v) => { $(id).textContent = v; };
  $('u-cno').onclick = () => show('game'); $('u-cyes').onclick = async () => { const f = cyes; cyes = null; show('game'); await whenIdle(); await f?.(); draw(); };
  $('u-reset').onclick = $('u-reset2').onclick = () => P.site === 'poki' ? resetAd() : ask(T.resetQ, T.resetP, T.resetGo, () => Hall.resetBox?.());   // Яндекс: сброс бесплатно, всегда (пользователь 23.10); Poki — за ролик, в паузе и у автомата (пользователь 25.10: варианты А и Б)
  const resetAd = async () => { show('game'); await whenIdle(); if (!(await P.rewarded('reset'))) return; if (Hall.resetBox?.()) SND.play('pick', { vol: 0.8 }); draw(); };   // 🎬 на кнопке, награда только при досмотре, сразу (RESEARCH_POKI §0.4)
  $('u-staff').onclick = $('u-staff2').onclick = async () => { show('game'); await whenIdle(); const free = staffFree(); if (!free && !(await P.rewarded('assist'))) return; if (Hall.assist?.()) { if (free) Save.set({ assistUsed: 1 }); SND.play('pick', { vol: 0.8 }); } draw(); };   // без окна (пользователь 23.10): первый раз — просто ставит, дальше — сразу ролик
  $('u-set').onclick = () => openSet('game'); $('u-set2').onclick = () => openSet('menu'); $('u-cont').onclick = () => show(from);
  addEventListener('keydown', e => { if (e.code !== 'Escape' || e.repeat) return; if (scr === 'pause') show(from); else if (scr === 'game' || scr === 'menu') openSet(scr); });   // Esc — пауза/настройки и обратно (пользователь 23.10)
  const V = () => ({ m: 50, f: 50, mo: false, fo: false, ...Save.get().vol }), vol = (o = V()) => { SND.vol(o.mo ? 0 : (o.m / 100) ** 2, o.fo ? 0 : (o.f / 100) ** 2); $('u-musv').value = o.m; $('u-sfxv').value = o.f; $('u-mus').classList.toggle('off', o.mo || !o.m); $('u-sfx').classList.toggle('off', o.fo || !o.f); };   // квадрат: слух логарифмический   // по умолчанию 50 % (пользователь 25.10: «как во всех играх»; громкий звук на старте — главный подозреваемый провала 3-минутного теста у Draw2Roll, RESEARCH_POKI §6); сохранённые настройки игрока не трогаем
  const setV = p => { const o = { ...V(), ...p }; Save.set({ vol: o }); vol(o); }; vol();
  $('u-musv').oninput = e => setV({ m: +e.target.value, mo: false }); $('u-sfxv').oninput = e => setV({ f: +e.target.value, fo: false });
  $('u-mus').onclick = () => { const o = V(); setV({ mo: !(o.mo || !o.m), m: o.m || 60 }); }; $('u-sfx').onclick = () => { const o = V(); setV({ fo: !(o.fo || !o.f), f: o.f || 60 }); };   // выключатель: громкость помнит, ноль — включает на 60
  $('u-tohall').onclick = () => { show('game'); if (Hall.training?.()) exitTrain(); else if (homing()) leave(); };         // ход идёт — вернуться к автомату, «‹» — после хода
  $('u-rv').onclick = reward; $('u-more').onclick = async () => { await reward(); tok(); };
  $('u-wait').onclick = () => show('game');
  const whenIdle = async () => { for (let i = 0; i < 80 && !idle(); i++) await new Promise(r => setTimeout(r, 100)); };   // ядро пускает в/из тренировки и «Ещё коробку» только с лапой на старте
  const exitTrain = async () => { if (!Hall.train(false)) { await whenIdle(); if (!Hall.train(false)) return; } leave(); draw(); };   // в любой момент, и посреди хода (пользователь 23.10): приза и сохранения в тренировке нет — ядро сбрасывает лапу и коробку
  $('u-train').onclick = () => { if (!Hall.train(true)) return; show('game'); draw(); trainTip(); };
  $('u-again').onclick = $('u-tagain').onclick = async () => { show('game'); if (!Hall.training?.()) await whenIdle(); if (await Hall.trainBox()) draw(); };   // тренировка — сразу, не ждать конца хода
  $('u-thall').onclick = () => { show('game'); exitTrain(); };
  addEventListener('prize-train', () => setTimeout(() => { if (scr === 'game') show('tprize'); }, 900));
  addEventListener('machine', e => { Save.set({ last: e.detail }); nMove = 0; draw(); });
  addEventListener('save', draw);
  addEventListener('tokens-out', () => { if (scr === 'game') { show('out'); tok(); } });
  new MutationObserver(() => { $('u-say').textContent = $('state').textContent; }).observe($('state'), { childList: true, characterData: true, subtree: true });
  $('u-say').textContent = $('state').textContent;
  addEventListener('prize', e => {                                                  // приз (ядро): звёзды по жетонам на этом автомате, фигурка — в коллекцию
    const id = e.detail, n = dbg.game.tries, w = Save.get().won, s = Math.max(starsOf(n), w[id]?.stars || 0); wonStars = starsOf(n);
    const first = !Object.keys(w).length && !(Save.get().boxes || []).length; flying++;   // самая первая фигурка — коробка по центру и «нажми» (пользователь 23.10)
    const it = HS.isBlind(id) ? drop(id) : id, rec = HS.isBlind(id) ? { items: [...items(id), it], cd: P.now() } : {};   // секретный: фигурка выпадает сейчас, автомат пополняется
    Save.set({ won: { ...w, [id]: { stars: s, n, t: Date.now(), ...rec } }, boxes: [...(Save.get().boxes || []), it] }); justWon = id;   // неоткрытая — на стол распаковки в квартире (apt.js)
    setTimeout(() => takeBox(id, first), 600);   // сразу к коробу, лапа едет на старт параллельно (пользователь 23.10)
  });
  let firstMove = !Save.get().played;
  for (const e of ['pointerdown', 'keydown']) addEventListener(e, () => { lastIn = performance.now(); }, true);
  addEventListener('move', () => { moved = true; nMove++; if (firstMove) { firstMove = false; Save.set({ played: true }); } });
  addEventListener('move', () => SND.play('coin', { vol: 0.7 }));   // жетон в щель (Ж-1) — и на тренировке: жетон там бесплатный, но бросается так же (ход в 3 шага)
  for (const ev of ['prize', 'prize-train']) addEventListener(ev, () => { SND.play('chute'); setTimeout(() => SND.play('win', { vol: 0.8 }), 600); });   // коробка падает в лоток (Б-3), джингл (П-5)
  document.addEventListener('click', e => { if (e.target.closest('#u button')) SND.play('click', { vol: 0.6 }); }, true);   // кнопки (И-20)
  sndWatch(); if ($('b0')) $('b0').innerHTML = '';   // рисунок — на самой монете (coin_token.webp)
  setInterval(() => {                                                               // редкий опрос: жетоны, возврат из квартиры, фоновая загрузка квартиры
    tok(); if (scr === 'menu') play(); if (scr === 'menu' || scr === 'game') giftTip();
    $('u-say').style.visibility = Object.keys(Save.get().won || {}).length >= 5 && performance.now() - lastIn < 7000 ? 'hidden' : '';   // после 5 призов строка над пультом — только если игрок ~7 с ничего не делает
    if (scr === 'game' && !Save.get().camTip && nMove >= 2 && window.dbg?.game?.s === 'ready') camTip();   // вид крутить — со второго хода на этом автомате, когда монета брошена (не вместе со строкой про монету; boxiki-93 25.10: на 1-0 первый ход — приз, подсказка всплывала на 1-1 рядом с «Брось жетон»)
    if (scr === 'home' && Home.on) homeSeen = true;   // квартира показана; до этого — реклама и затемнение (иначе опрос тут же вернул бы в меню)
    if (scr === 'home' && homeSeen && !Home.on) { homeSeen = false; show('menu'); const from = justWon || gFrom; if (justWon) { justWon = ''; if (!afterPrize()) adNext = true; } gFrom = ''; if (from) setTimeout(() => toOpen(from), 350); }   // вышли из квартиры; после приза — к следующему автомату, полноэкранная — на «Играть» (как ветка без квартиры выше; выпуск 24.10: путь игрока идёт через квартиру — реклама не показывалась)
    if ((scr === 'menu' && performance.now() - menuAt > 1500 && idle()) || scr === 'prize' || scr === 'door') Home.preload();   // квартиру грузим, только когда ход не идёт (замер 23.10: загрузка во время хода — рывки 67–250 мс)
  }, 250);
  P.onPause(() => { sysPause = true; hold(); SND.hold('sdk', true); }); P.onResume(() => { sysPause = false; hold(); SND.hold('sdk', false); });   // реклама, чужая вкладка — тишина (Яндекс 1.3, 4.7)
  document.addEventListener('visibilitychange', () => { if (document.hidden && scr === 'game') show('pause'); });   // свернули посреди хода — пауза, вернулись — «Продолжить»
  addEventListener('contextmenu', e => e.preventDefault());                          // Яндекс 1.6.2.7: без контекстного меню
}

if (!OFF) {
  P.init().then(() => { document.body.dataset.site = P.site; if (P.lang !== 'ru' || Q.get('lang') === 'en') T = Q.get('lang') === 'ru' ? RU : EN; return Save.sync(); }).catch(e => console.warn('площадка', e))
    .then(async () => {
      while (!(window.dbg?.game && window.Hall && window.Game && (Game.warm || Q.has('nowarm')))) await new Promise(r => setTimeout(r, 50));   // ядро загрузило мир и автомат, прогрев отрисовки прошёл (Game.warm)
      mount();
      const s = Save.get(), go = Q.get('lvl') || (s.played ? s.last : 'H1-0');      // первый запуск — сразу автомат 1-0 с обучением, дальше — меню у последнего автомата
      if (go && go !== Hall.at() && MACHINES.some(x => x.id === go)) { $('mach').value = go; $('mach').dispatchEvent(new Event('change')); draw(); }
      show(Q.has('lvl') || !s.played ? 'game' : 'menu');
      requestAnimationFrame(() => requestAnimationFrame(() => { P.ready(); window.bootDone?.(); }));   // заставка «Табло» (index.html) — гаснет вместе с ready          // LoadingAPI.ready — экран нарисован, можно играть (Яндекс 1.19.2)
    });
}
