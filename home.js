// home.js — квартира-коллекция в той же вкладке, что и зал (пользователь 22.10: «легко между автоматами и домом переключаться»).
// style_lab/apt.html?embed=1 во фрейме поверх игры: грузится в фоне после старта зала; переключение — затемнение 0,25 с; невидимая сторона не рисуется
// (квартира — renderer.setAnimationLoop(null), зал — frame() в index.html выходит при Home.on). ponytail: два WebGL-контекста; общий рендерер — если на телефонах не хватит памяти
export const Home = { on: false, preload, show: () => swap(true), hide: () => swap(false) };
window.Home = Home;                                                   // фрейм зовёт parent.Home.hide()
const fr = Object.assign(document.createElement('iframe'), { title: 'Квартира' });
fr.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:20;visibility:hidden;background:#05070b';
const veil = document.createElement('div');                           // затемнение на время подмены
veil.style.cssText = 'position:fixed;inset:0;background:#05070b;opacity:0;pointer-events:none;z-index:30;transition:opacity .25s';
const btn = Object.assign(document.createElement('button'), { textContent: 'Квартира ›', title: 'Коллекция дома' });   // ponytail: заглушка, вид кнопки — по вариантам (design-agree-first)
btn.style.cssText = 'position:fixed;top:12px;right:12px;z-index:10;border:1px solid rgba(255,240,220,.16);background:rgba(14,16,22,.55);color:#f3ece2;border-radius:22px;padding:9px 16px;font:500 14px/1 "Golos Text",-apple-system,sans-serif;cursor:pointer;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)';
btn.onclick = () => Home.show();
document.body.append(veil, btn);
function preload() { if (!fr.src) { fr.src = new URL('style_lab/apt.html?embed=1', import.meta.url).href; document.body.append(fr); } }
const apt = () => fr.contentWindow?.__apt;                             // есть, когда квартира догрузилась
let busy = false;
async function swap(toHome) {
  if (busy || Home.on === toHome) return; busy = true; preload();
  veil.style.opacity = 1; await new Promise(r => setTimeout(r, 260));
  Home.on = toHome; fr.style.visibility = toHome ? 'visible' : 'hidden'; btn.style.display = toHome ? 'none' : '';
  if (toHome) { apt()?.resume(); fr.contentWindow.focus(); } else { apt()?.pause(); window.focus(); }   // не догрузилась — у неё своя заставка, resume сама по Home.on
  veil.style.opacity = 0; busy = false;
}
if (new URLSearchParams(location.search).has('dev')) addEventListener('keydown', e => { if (e.code === 'KeyH' && !e.repeat) Home.show(); });   // H — домой, только с ?dev: в обход экранов ui.js (Яндекс 1.15, 1.19.3)
