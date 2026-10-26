// apt.js — стенд «квартира-коллекция» (вариант 6 квартиры; GAME_BUILD.md §2a, RESEARCH_ROOM.md, HANDOFF_STYLE_TOYS.md §00).
// Планировка настоящая: сталинка, Столярный пер., 14 (1959, 79 м², потолок 3,2 м) — style_research/apartment/SOURCES.md, plans_grid.jpg.
// Локации ‹ › / свайп / стрелки: камера перелетает через двери и коридор. «Демо: распаковка»: коробка на столе в кабинете → фигурка в руке → полка серии → призрак, тап — встала.
// Любую фигурку можно перетащить на свободное место в кадре. z вверх, метры; x — вправо по плану (восток), y — вверх по плану (север).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as HS from '../hall_style.js';
await HS.IMG_ALL;   // квартира берёт картинки фигурок синхронно (HS.IMG) — ждём, пока догрузятся все (после старта игры их уже нет в пути)
import { packetLook } from '../boxstyles.js';
import { makePacket } from './packet.js';   // пакетик из фольги блайндбокса (стенд E)
import { addGlow, glowOn, glowTried, setGlowOn, glowStore } from '../glow.js';   // свечение фигурок по касанию в руке (Жар-птица, Лось-холодильник; сессия персонажей)
import * as SJ from '../series.js';   // серии фигурок по залам (сессия персонажей); NAMES_EN и SERIES[].en — английские имена, когда появятся
const { SERIES, FIG: SF } = SJ;

const $ = id => document.getElementById(id);
// язык — площадки (parent.P.lang, platform.js); ?lang=en|ru — проверить. Подписи квартиры — здесь, имена фигурок и серий — series.js (NAMES_EN, SERIES[].en; нет — русские)
const QL = new URLSearchParams(location.search).get('lang') ?? (parent !== window ? new URLSearchParams(parent.location.search).get('lang') : null), EN = QL ? QL === 'en' : (parent !== window && parent.P?.lang ? parent.P.lang !== 'ru' : false);
const T = EN ? { hall: 'To hall', back: '‹ back', put: 'Put back', carry: 'Move', carryTip: 'Browse to any spot and tap a blue ring', carryNo: 'No free spots here — browse on', shelf: 'To the shelf', load: 'Loading…', fail: 'Something went wrong.<br>Please reload the page.', reload: 'Reload', rare: 'rare and secret', of: 'of', boxes: 'boxes', box: 'box',
    ser: n => `“${n}” series`, placed: (n, m) => `In place — <em>${n} of ${m}</em>. Any figure can be dragged to a free spot`, ring: 'Release over a blue ring — the figure goes there', full: 'No free spots here — fly to another shelf',
    turn: 'drag to turn', lightOn: 'Tap to switch on', lightOff: 'Tap to switch off', tear: 'Swipe down to tear it open', unopened: n => `Unopened boxes: <em>${n}</em> — tap any`, open: 'Tap the box to open', openCap: 'Tap the capsule to open', fresh: 'New figure!', noSpot: 'No free spots', ghost: 'Tap the ghost — the figure goes on the shelf',
    loc: { entry: 'Hallway', frames: 'Corridor · frames', shelves: 'Study · shelves', desk: 'Study · desk', balc: 'Balcony', kit: 'Kitchen', stenka: 'Living room · wall unit', gorka: 'Living room · cabinet' }, free: 'free spots', deskSub: 'new arrivals — unboxing is here' }
  : { hall: 'В зал', back: '‹ назад', put: 'на место', carry: 'переставить', carryTip: 'Листай к любому месту и нажми голубое кольцо', carryNo: 'Здесь свободных мест нет — листай дальше', shelf: 'на полку', load: 'Квартира загружается…', fail: 'Что-то пошло не так.<br>Обновите страницу.', reload: 'Обновить', rare: 'редкие и секретные', of: 'из', boxes: 'коробки', box: 'коробка',
    ser: n => `серия «${n}»`, placed: (n, m) => `Встала на место — <em>${n} из ${m}</em>. Любую фигурку можно перетащить на свободное место`, ring: 'Отпусти над голубым кружком — фигурка встанет туда', full: 'Здесь нет свободных мест — перелети к другой полке',
    turn: 'тяни — покрутить', lightOn: 'Нажми — зажечь', lightOff: 'Нажми — погасить', tear: 'Проведи сверху вниз — разорвать', unopened: n => `Неоткрытых коробок: <em>${n}</em> — нажми на любую`, open: 'Нажми на коробку — открыть', openCap: 'Нажми на капсулу — открыть', fresh: 'Новая фигурка!', noSpot: 'Свободных мест нет', ghost: 'Тапни по призраку — фигурка встанет на полку',
    loc: { entry: 'Прихожая', frames: 'Коридор · рамки', shelves: 'Кабинет · полки', desk: 'Кабинет · стол', balc: 'Балкон', kit: 'Кухня', stenka: 'Зал · стенка', gorka: 'Зал · горка' }, free: 'свободные места', deskSub: 'место новенькой — здесь распаковка' };
const figName = k => (EN && SJ.NAMES_EN?.[k]) || SJ.NAMES[k] || k, serName = s => (EN && s?.en) || s?.name || '';
// ошибка: игроку — понятный текст и «‹ В зал» / «Обновить» (Яндекс 1.14, 1.15), стек — в консоль, на экран — только с ?dev; сбой одной картинки или фигурки — без окна (warn)
const DEVQ = new URLSearchParams(location.search).has('dev');
const fail = e => { console.error(e); const el = $('err'); if (el.style.display === 'flex') return; el.style.display = 'flex';
  el.innerHTML = DEVQ ? '' : `<div>${T.fail}</div>`; if (DEVQ) el.textContent = 'Ошибка: ' + (e?.stack || e);
  const b = document.createElement('button'); b.className = 'ab'; b.textContent = parent !== window && parent.Home ? '‹ ' + T.hall : T.reload; b.onclick = () => parent !== window && parent.Home ? (el.style.display = 'none', parent.Home.hide()) : location.reload(); el.append(b); };
const soft = e => console.warn('квартира: не загрузилось', e);
addEventListener('error', e => fail(e.error || e.message)); addEventListener('unhandledrejection', e => fail(e.reason));
$('back').textContent = T.back; $('put').textContent = T.put; if ($('load')) $('load').textContent = T.load; document.documentElement.lang = EN ? 'en' : 'ru';

// --- Сеть: локальный http.server рвёт соединения при всплеске запросов (очередь 5) — не больше 4 загрузок сразу, с повтором
const F0 = window.fetch.bind(window), FQ = []; let FN = 0;
window.fetch = (...a) => new Promise((ok, no) => { const run = async () => { FN++; try { for (let i = 0; ; i++) { try { ok(await F0(a[0], { ...a[1], cache: 'no-cache' })); break; } catch (e) { if (i >= 3) { no(e); break; } await new Promise(r => setTimeout(r, 300 * (i + 1))); } } } finally { FN--; FQ.shift()?.(); } }; FN < 4 ? run() : FQ.push(run); });

// --- Рендер
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
const LOW = HS.LOW, Q = new URLSearchParams(location.search), EMBED = Q.has('embed');   // embed — во фрейме игры (home.js): «‹ В зал» вместо демо, цикл на паузе, пока не показан
const renderer = new THREE.WebGLRenderer({ antialias: !LOW, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const cv = renderer.domElement;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x06080d);
scene.fog = new THREE.Fog(0x1a2335, 16, 75);                          // туман виден только снаружи: внутри квартиры до стены < 12 м
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.05;
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.03, 500);

// --- Помощники
const tex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };
const Sm = (c, r = 0.6, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
let seed = 7; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647, rr = (a, b) => a + (b - a) * rnd();
const img = (url, rep, srgb = true) => { const t = new THREE.Texture(); t.flipY = false; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }   // картинка через fetch (очередь), без <img>
  fetch(url).then(r => r.blob()).then(b => createImageBitmap(b, { imageOrientation: 'flipY' })).then(bm => { t.image = bm; t.needsUpdate = true; }).catch(soft); return t; };
const loadImg = async url => { const b = await (await fetch(url)).blob(), i = await createImageBitmap(b), k = LOW ? 1024 / Math.max(i.width, i.height) : 1;   // телефон: не больше 1024 px — карты света 2048 (5 × 21 МБ видеопамяти + копии) вешали вкладку при входе в квартиру (пользователь 24.10: «вылетело после гачи»)
  if (k >= 1) return i; const r = await createImageBitmap(i, { resizeWidth: Math.round(i.width * k), resizeHeight: Math.round(i.height * k), resizeQuality: 'high' }); i.close(); return r; };
const SN = (n, o) => (parent !== window ? parent : window).SND?.play(n, o);   // звук игры (snd.js, ui.js); стенд без игры — молча
document.addEventListener('click', e => { if (e.target.closest('button')) SN('click', { vol: 0.6 }); }, true);   // кнопки квартиры (И-20)
const idle = () => new Promise(r => { const P = parent !== window ? parent : window, go = () => P.UI?.busy?.() ? P.requestAnimationFrame(go) : setTimeout(r, 0); P.requestAnimationFrame(go); });   // идёт ход (UI.busy сборки) — не грузить, ждать   // уступить кадр: квартира грузится фреймом в игре, один длинный кусок — рывок (до 271 мс, замер boxiki-a3 23.10); ждать кадра игры — setTimeout(0) браузер склеивал в один долгий кадр
const R = {}; const grp = n => R[n] ??= (() => { const g = new THREE.Group(); g.name = n; scene.add(g); return g; })();   // группы комнат: видимость по локации
function put(g, geo, mat, x = 0, y = 0, z = 0, cast = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; g.add(m); if (BXS && /Box/.test(geo.type) && !mat?.transparent) BXS.push(m); return m; }
const BXS = new URLSearchParams(location.search).has('ov') ? [] : null;   // ?ov — коробки для devtools/overlap.js (нахлёсты); matrixWorld — с запекания/слияния
let ZJ = 0; const zj = (...D) => Math.min(0.0002 * (1 + ZJ++ % 5), ...D.map(v => v / 2));   // каждая коробка меньше на 0,2…1 мм, соседние — на разное: совпавшие грани перекрытых деталей (углы створок, полки, рамки) расходятся и не мерцают (z-fighting, пользователь 23.10); низ — на месте
const box = (g, w, d, h, mat, x, y, z0, cast = true) => { const e = zj(w, d, h); return put(g, new THREE.BoxGeometry(w - e, d - e, h - e), mat, x, y, z0 + (h - e) / 2, cast); };   // z0 — низ
const rbox = (g, w, d, h, r, mat, x, y, z0) => { const e = zj(w, d, h); return put(g, new RoundedBoxGeometry(w - e, d - e, h - e, 2, r), mat, x, y, z0 + (h - e) / 2); };
const cyl = (g, r0, r1, h, mat, x, y, z0, seg = 16, open = false) => put(g, new THREE.CylinderGeometry(r1, r0, h, seg, 1, open).rotateX(Math.PI / 2), mat, x, y, z0 + h / 2);   // r0 — низ, r1 — верх
const plane = (g, w, h, mat, x, y, z, rz = 0) => { const m = put(g, new THREE.PlaneGeometry(w, h).rotateX(Math.PI / 2), mat, x, y, z, false); m.rotation.z = rz; return m; };   // вертикальная, лицом в −y
const flat = (g, w, d, mat, x, y, z, rz = 0) => { const m = put(g, new THREE.PlaneGeometry(w, d), mat, x, y, z, false); m.rotation.z = rz; return m; };   // горизонтальная, лицом вверх
const node = (p, x, y, z = 0, rz = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = rz; p.add(g); return g; };   // мебель: начало — низ середины задней стенки, лицо в −y
const roomOf = o => { while (o.parent && o.parent !== scene) o = o.parent; return o.name; };
const N_ = 0, S_ = Math.PI, W_ = Math.PI / 2, E_ = -Math.PI / 2;   // поворот мебели к стене: у северной, южной, западной, восточной

// --- Текстуры: шпон, обои, ткани
function grain(base, dark, light, k = 1, W0 = 256, H0 = 1024) { return tex(W0, H0, (g, W, H) => { g.fillStyle = base; g.fillRect(0, 0, W, H); seed = 11 * k;
  for (let i = 0; i < 150; i++) { const x0 = rnd() * W, a = rr(3, 16), f = rr(0.004, 0.02), ph = rnd() * 6; g.strokeStyle = rnd() < 0.6 ? dark : light; g.globalAlpha = rr(0.06, 0.28); g.lineWidth = rr(0.6, 3);
    g.beginPath(); for (let y = 0; y <= H; y += 8) g.lineTo(x0 + a * Math.sin(y * f + ph) + 5 * Math.sin(y * 0.05 + i), y); g.stroke(); }
  g.globalAlpha = 1; }); }
function noise(g, W, H, a = 18) { const d = g.getImageData(0, 0, W, H), p = d.data; for (let i = 0; i < p.length; i += 4) { const n = (rnd() - 0.5) * a; p[i] += n; p[i + 1] += n; p[i + 2] += n; } g.putImageData(d, 0, 0); }
const ROLL = 0.53;                                                     // ширина рулона советских обоев, м: одна картинка — 0,53 × 0,53 м
function paper(kind) { seed = kind.length * 31; return tex(512, 512, (g, W, H) => {
  const P = { zal: ['#a8946c', '#97825b', '#c0aa7c', '#7e6a48'], hall: ['#80654b', '#73593f', '#937658', '#5e4834'], cab: ['#8a8668', '#76735a', '#a39f7e', '#5f5c45'], bed: ['#bfa596', '#ad9283', '#d3bcae', '#8f6f66'] }[kind];
  g.fillStyle = P[0]; g.fillRect(0, 0, W, H);
  if (kind === 'zal') { g.fillStyle = P[1]; g.fillRect(W * 0.25, 0, W * 0.5, H);   // полосы с медальонами (дамаск)
    for (const [cx, cy] of [[W / 2, H * 0.25], [W / 2, H * 0.75], [0, 0], [W, 0], [0, H], [W, H], [0, H / 2], [W, H / 2]]) { g.save(); g.translate(cx, cy); g.fillStyle = cx === W / 2 ? P[2] : P[3]; g.globalAlpha = 0.55;
      for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.ellipse(0, -26, 12, 26, 0, 0, 7); g.fill(); } g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); g.restore(); }
    g.globalAlpha = 0.5; g.strokeStyle = P[3]; g.lineWidth = 2; for (const x of [W * 0.25, W * 0.75]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } }
  if (kind === 'hall') { g.globalAlpha = 0.35; g.strokeStyle = P[3]; g.lineWidth = 1.5; for (let i = -8; i < 16; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + H, H); g.stroke(); g.beginPath(); g.moveTo(i * 64 + H, 0); g.lineTo(i * 64, H); g.stroke(); } }
  if (kind === 'cab') { g.globalAlpha = 0.6; for (let y = 0; y < H; y += 64) for (const x of [64, 192, 320, 448]) { g.fillStyle = (y / 64 + x / 128) % 2 ? P[1] : P[3]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 28, y + 32); g.lineTo(x, y + 64); g.lineTo(x - 28, y + 32); g.fill(); }
    g.fillStyle = P[2]; for (let y = 32; y < H; y += 64) for (let x = 0; x < W; x += 128) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }
  if (kind === 'bed') { g.globalAlpha = 0.7; for (const [cx, cy] of [[128, 128], [384, 384], [384, 128], [128, 384]]) { const s = (cx + cy) % 512 ? 0.7 : 1; g.save(); g.translate(cx, cy); g.scale(s, s);
    g.fillStyle = P[3]; for (let i = 0; i < 5; i++) { g.rotate(Math.PI * 2 / 5); g.beginPath(); g.ellipse(0, -14, 8, 14, 0, 0, 7); g.fill(); } g.fillStyle = '#7b8466'; g.beginPath(); g.ellipse(22, 20, 6, 16, 0.8, 0, 7); g.fill(); g.beginPath(); g.ellipse(-20, 22, 6, 15, -0.8, 0, 7); g.fill(); g.restore(); } }
  g.globalAlpha = 0.25; g.fillStyle = '#000'; g.fillRect(0, 0, 2, H); g.globalAlpha = 1; noise(g, W, H, 22); }, [1 / ROLL, 1 / ROLL]); }
function lace(w, h, round, k = 9) { return tex(w, h, (g, W, H) => { g.fillStyle = '#f4efe2';   // кружево: сетка мелких дырочек, вышитые розетки, фестоны по краю
  const hem = round ? 0 : H - Math.min(W, H) * 0.07;
  if (round) { g.beginPath(); for (let a = 0; a < 6.29; a += 0.02) { const r = W / 2 * (0.9 + 0.08 * Math.cos(a * 24)); g.lineTo(W / 2 + r * Math.cos(a), H / 2 + r * Math.sin(a)); } g.fill(); }
  else { g.fillRect(0, 0, W, hem); const sc = Math.min(W, H) * 0.035; for (let x = 0; x < W; x += 2 * sc) { g.beginPath(); g.arc(x + sc, hem, sc, 0, Math.PI); g.fill(); } }
  g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.85; for (let y = 3, j = 0; y < H; y += 5, j++) for (let x = (j % 2) * 2.5 + 1; x < W; x += 5) { g.beginPath(); g.arc(x, y, 1.3, 0, 7); g.fill(); }   // сетка тюля
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#f7f3ea'; seed = k; const S = Math.min(W, 128);   // вышивка: розетки по шахматке, гуще у края
  for (let y = S / 2, j = 0; y < H; y += S * 0.9, j++) for (let x = (j % 2) * S / 2; x < W + S; x += S) { const near = round || y > hem - H * 0.22; if (!near && rnd() < 0.55) continue; const r = S * (near ? 0.16 : 0.1);
    for (let q = 0; q < 6; q++) { const a = q * Math.PI / 3; g.beginPath(); g.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.45, r * 0.22, a, 0, 7); g.fill(); } g.beginPath(); g.arc(x, y, r * 0.3, 0, 7); g.fill(); }
  if (round) { g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.arc(W / 2, H / 2, W / 2 * 0.98, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over'; } }); }
const fabric = (c0, c1, kind) => tex(256, 256, (g, W, H) => { g.fillStyle = c0; g.fillRect(0, 0, W, H); g.fillStyle = c1; seed = 5;
  if (kind === 'check') for (let i = 0; i < 8; i++) { g.globalAlpha = 0.5; g.fillRect(i * 32, 0, 14, H); g.fillRect(0, i * 32, W, 14); }
  if (kind === 'stripe') for (let i = 0; i < 16; i++) { g.globalAlpha = 0.6; g.fillRect(i * 16, 0, 6, H); }
  if (kind === 'jacq') for (let y = 0; y < H; y += 64) for (let x = 0; x < W; x += 64) { g.globalAlpha = 0.28; g.beginPath(); g.ellipse(x + 32, y + 32, 18, 26, (x + y) % 128 ? 0.6 : -0.6, 0, 7); g.fill(); }
  g.globalAlpha = 1; noise(g, W, H, 14); }, [1, 1]);

// --- Материалы
const GR = []; for (const a of [['#5a2c18', '#2a1009', '#8c4c2a', 1], ['#3e1c0f', '#1c0905', '#6a351d', 2], ['#8a6643', '#5a3e27', '#ab8660', 3]]) { await idle(); GR.push(grain(...a)); }   // шпон 256×1024 — по одной на кадр
const M = {
  ceil: Sm(0xe6e1d6, 0.95, { side: THREE.BackSide }), plaster: Sm(0xd6d0c4, 0.92), cornice: Sm(0xe0dbcf, 0.8),
  plinth: Sm(0x3a2416, 0.5), casing: Sm(0xd9d1bf, 0.5), jamb: Sm(0xd0c8b5, 0.5), doorPaint: Sm(0xd6cebb, 0.42),
  frame: Sm(0xe2ddd1, 0.5), sill: Sm(0xe4dfd3, 0.45), rad: Sm(0xd3cbb6, 0.5),
  jar: Sm(0xe4efe8, 0.05, { transparent: true, opacity: 0.38, depthWrite: false, envMapIntensity: 2.5 }), glass: new THREE.MeshStandardMaterial({ color: 0xb9ccd6, roughness: 0.04, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 3 }),
  winGlass: new THREE.MeshStandardMaterial({ color: 0x8aa0b8, roughness: 0.05, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 2 }),
  frosted: new THREE.MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.35, transparent: true, opacity: 0.55, depthWrite: false, envMapIntensity: 1.5 }),
  crystal: new THREE.MeshStandardMaterial({ color: 0xeaf2f6, roughness: 0.03, transparent: true, opacity: 0.38, depthWrite: false, flatShading: true, envMapIntensity: 4 }),
  mirror: Sm(0x3b4045, 0.55, { metalness: 0.25 }),   // задняя стенка витрины — тёмная полуматовая: зеркало отражало подсветку прямо в камеру (пользователь 22.10: «пересвет на стекле»)
  brass: Sm(0xc29a4e, 0.32, { metalness: 0.6 }), chrome: Sm(0xd4d6d8, 0.25, { metalness: 0.5 }),   // не чистый металл: в тёмном свете (окружение 0,01) чистый — чёрный steel: Sm(0x9aa0a4, 0.35, { metalness: 0.9 }),
  veneer: Sm(0xffffff, 0.3, { map: GR[0], envMapIntensity: 1.6 }),
  veneerD: Sm(0xffffff, 0.34, { map: GR[1], envMapIntensity: 1.4 }),
  oak: Sm(0xffffff, 0.55, { map: GR[2] }),
  black: Sm(0x141414, 0.5), enamel: Sm(0xefede6, 0.22, { envMapIntensity: 1.5 }), cream: Sm(0xe7dfcb, 0.45),
  snow: Sm(0xd9e2ee, 0.85), metalDark: Sm(0x2c3236, 0.55, { metalness: 0.5 }), green: Sm(0x2f4a36, 0.55), concrete: Sm(0x7d7a74, 0.95),
};
await idle();
const BOOK = ['#5b1f1a', '#1f3a2c', '#2a2f4a', '#6b4a22', '#3d1f2e', '#76664e', '#1d1d22', '#842e22', '#4b5a3a'].map((c, i) => Sm(0xffffff, 0.75, { map: tex(64, 256, (g, W, H) => { g.fillStyle = c; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(214,180,96,.75)'; for (const y of [0.08, 0.13, 0.86, 0.9]) g.fillRect(0, y * H, W, 3); if (i % 3 === 0) { g.fillRect(W * 0.2, H * 0.3, W * 0.6, 4); g.fillRect(W * 0.3, H * 0.36, W * 0.4, 3); } seed = i + 3; noise(g, W, H, 16); }) }));
const PARQ = { map: img('../assets_room/tex/herringbone_parquet_diffuse_1k.jpg', [1, 1]), normalMap: img('../assets_room/tex/herringbone_parquet_nor_gl_1k.jpg', [1, 1], false), roughnessMap: img('../assets_room/tex/herringbone_parquet_rough_1k.jpg', [1, 1], false) };
M.parquet = new THREE.MeshStandardMaterial({ ...PARQ, color: 0xa88664, roughness: 0.9, envMapIntensity: 0.6 });
await idle();
M.lino = Sm(0xffffff, 0.55, { map: tex(256, 256, (g, W, H) => { seed = 4; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { g.fillStyle = (i + j) % 2 ? '#6e4f37' : '#b59c78'; g.fillRect(i * 128, j * 128, 128, 128); }   // кухня: ПВХ-плитка 30 × 30 см, «шахматка»
  g.strokeStyle = 'rgba(30,20,10,.5)'; g.lineWidth = 2; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, H); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(W, i * 128); g.stroke(); } noise(g, W, H, 26); }, [1 / 0.6, 1 / 0.6]),
  normalMap: img('../assets_room/tex/linoleum_brown_nor_gl_1k.jpg', [2, 2], false) });
M.kitWall = Sm(0xffffff, 0.75, { map: tex(128, 1024, (g, W, H) => { const k = H / 3.2;   // кухня: масляная панель 1,5 м, тёмный бордюр, выше побелка
  g.fillStyle = '#d8d3c6'; g.fillRect(0, 0, W, H); g.fillStyle = '#6f978f'; g.fillRect(0, H - 1.5 * k, W, 1.5 * k); g.fillStyle = '#3b5550'; g.fillRect(0, H - 1.5 * k - 6, W, 6); seed = 8; noise(g, W, H, 14); }, [1, 1 / 3.2]) });
await idle();
M.tile = Sm(0xffffff, 0.25, { map: tex(256, 256, (g, W, H) => { seed = 3; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const v = 228 + rnd() * 16; g.fillStyle = `rgb(${v},${v - 3},${v - 10})`; g.fillRect(i * 64, j * 64, 64, 64); }   // кафель 15 × 15 см
  g.strokeStyle = '#9d978b'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, H); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(W, i * 64); g.stroke(); } }, [1 / 0.6, 1 / 0.6]), envMapIntensity: 1.5 });
M.padded = Sm(0xffffff, 0.55, { map: tex(256, 512, (g, W, H) => { g.fillStyle = '#4a1f1c'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 3;   // дерматин входной двери: стёжка ромбом и гвоздики
  for (let i = -8; i < 12; i++) { g.beginPath(); g.moveTo(i * 48, 0); g.lineTo(i * 48 + H, H); g.stroke(); g.beginPath(); g.moveTo(i * 48 + H, 0); g.lineTo(i * 48, H); g.stroke(); }
  g.fillStyle = '#c9a45a'; for (let i = -8; i < 12; i++) for (let j = 0; j < 22; j++) { const x = i * 48 + j * 24, y = j * 24; if (x > 4 && x < W - 4) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } } seed = 2; noise(g, W, H, 18); }) });
const P_ = {}; for (const k of ['zal', 'hall', 'cab']) { await idle(); P_[k] = Sm(0xffffff, 0.88, { map: paper(k) }); }   // обои с шумом — по одной на кадр

await idle();
// --- Стены по полигону комнаты, проёмы, плинтус, карниз
const H = 3.2, OPEN = [];
const opening = (ax, c0, c1, u0, u1, z0, z1, kind, o = {}) => { const p = { ax, c0, c1, u0, u1, z0, z1, kind, ...o }; OPEN.push(p); return p; };   // ax — вдоль какой оси идёт стена; c0, c1 — две её грани
function holesFor(A, B) { const ax = Math.abs(B[0] - A[0]) > Math.abs(B[1] - A[1]) ? 'x' : 'y', c = ax === 'x' ? A[1] : A[0], a = ax === 'x' ? A[0] : A[1], s = Math.sign((ax === 'x' ? B[0] : B[1]) - a);
  return OPEN.filter(o => o.ax === ax && (Math.abs(o.c0 - c) < 0.02 || Math.abs(o.c1 - c) < 0.02)).map(o => { const p = (o.u0 - a) * s, q = (o.u1 - a) * s; return [Math.min(p, q), Math.max(p, q), o.z0, o.z1, o]; }); }
function wallGeo(A, B, z0, z1, holes, s0 = 0) {                      // грань стены лицом внутрь (слева от A→B), UV в метрах
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]), dx = (B[0] - A[0]) / L, dy = (B[1] - A[1]) / L, P = [], N = [], U = [];
  const quad = (u0, u1, q0, q1) => { const p = (u, q) => [A[0] + dx * u, A[1] + dy * u, q], a = p(u0, q0), b = p(u1, q0), c = p(u1, q1), d = p(u0, q1);
    for (const v of [a, c, b, a, d, c]) P.push(...v); for (let k = 0; k < 6; k++) N.push(-dy, dx, 0);
    U.push(s0 + u0, q0, s0 + u1, q1, s0 + u1, q0, s0 + u0, q0, s0 + u0, q1, s0 + u1, q1); };
  const cuts = [...new Set([0, L, ...holes.flatMap(h => [h[0], h[1]]).filter(u => u > 0 && u < L)])].sort((p, q) => p - q);
  for (let i = 0; i < cuts.length - 1; i++) { const u0 = cuts[i], u1 = cuts[i + 1], m = (u0 + u1) / 2; let z = z0;
    for (const [h0, h1] of holes.filter(h => h[0] <= m && h[1] >= m).map(h => [h[2], h[3]]).sort((p, q) => p[0] - q[0])) { if (h0 > z) quad(u0, u1, z, Math.min(h0, z1)); z = Math.max(z, h1); }
    if (z < z1) quad(u0, u1, z, z1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); return g; }
function room(name, poly, wallMat, floorMat) {
  const g = grp(name), shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y))); let s = 0;
  put(g, new THREE.ShapeGeometry(shape), floorMat, 0, 0, 0, false); put(g, new THREE.ShapeGeometry(shape), M.ceil, 0, 0, H, false);
  poly.forEach((A, i) => { const B = poly[(i + 1) % poly.length], hs = holesFor(A, B), L = Math.hypot(B[0] - A[0], B[1] - A[1]), dx = (B[0] - A[0]) / L, dy = (B[1] - A[1]) / L, rz = Math.atan2(dy, dx);
    put(g, wallGeo(A, B, 0, H, hs, s), wallMat, 0, 0, 0, true); s += L;
    let segs = [[0, L]]; for (const h of hs.filter(h => h[2] < 0.05)) segs = segs.flatMap(([a, b]) => h[1] <= a || h[0] >= b ? [[a, b]] : [[a, h[0]], [h[1], b]].filter(([p, q]) => q - p > 0.01));
    for (const [a, b] of segs) box(g, b - a, 0.022, 0.085, M.plinth, A[0] + dx * (a + b) / 2 - dy * 0.011, A[1] + dy * (a + b) / 2 + dx * 0.011, 0).rotation.z = rz;   // плинтус
    box(g, L, 0.075, 0.075, M.cornice, A[0] + dx * L / 2 - dy * 0.037, A[1] + dy * L / 2 + dx * 0.037, H - 0.075, false).rotation.z = rz;   // карниз-галтель
    box(g, L, 0.02, 0.025, M.cornice, A[0] + dx * L / 2 - dy * 0.01, A[1] + dy * L / 2 + dx * 0.01, H - 0.125, false).rotation.z = rz; });
  return g;
}

await idle();
// --- Проёмы: двери и окна (рамка проёма: x — вдоль стены, 0 в середине; y — поперёк стены; z вверх)
function opFrame(o) { const t = o.c1 - o.c0, cu = (o.u0 + o.u1) / 2, cc = (o.c0 + o.c1) / 2, g = o.ax === 'x' ? node(grp(o.room), cu, cc, 0, 0) : node(grp(o.room), cc, cu, 0, Math.PI / 2);
  return { g, t, w: o.u1 - o.u0, sg: o.ax === 'x' ? 1 : -1 }; }       // sg: знак локального y у грани c1
function handle(g, x, y, z) { box(g, 0.022, 0.05, 0.022, M.brass, x, y, z - 0.011); box(g, 0.11, 0.02, 0.018, M.brass, x - 0.045, y + Math.sign(y) * 0.03, z - 0.009); }
function leaf(w, h, style) {                                           // полотно: вдоль +x от петли, толщина по y
  const g = new THREE.Group(), th = 0.04, m = style === 'padded' ? M.padded : M.doorPaint;
  if (style === 'padded') { box(g, w, th + 0.03, h, m, w / 2, 0, 0); box(g, 0.02, 0.06, 0.02, M.brass, w * 0.5, -0.03, 1.55); handle(g, w - 0.08, -0.04, 1.0); box(g, 0.05, 0.02, 0.14, M.brass, w - 0.08, -0.03, 1.12); return g; }
  const st = 0.1, zr = h * 0.42, glass = style === 'glass' || style === 'glass2';
  box(g, st, th, h, m, st / 2, 0, 0); box(g, st, th, h, m, w - st / 2, 0, 0); box(g, w - 2 * st, th, st, m, w / 2, 0, 0); box(g, w - 2 * st, th, st * 1.3, m, w / 2, 0, h - st * 1.3); box(g, w - 2 * st, th, st * 0.8, m, w / 2, 0, zr);
  box(g, w - 2 * st, th * 0.55, zr - st, m, w / 2, 0, st);             // нижняя филёнка
  if (glass) { const gm = style === 'glass2' ? M.frosted : M.frosted; box(g, w - 2 * st, 0.006, h - zr - st * 2.1, gm, w / 2, 0, zr + st * 0.8, false); if (w > 0.5) box(g, 0.025, th * 0.8, h - zr - st * 2.1, m, w / 2, 0, zr + st * 0.8); }
  else box(g, w - 2 * st, th * 0.55, h - zr - st * 2.1, m, w / 2, 0, zr + st * 0.8);
  for (const s of [-1, 1]) { box(g, 0.012, 0.004, h - zr - st * 2.1, M.casing, st + 0.006, s * th * 0.28, zr + st * 0.8, false); }
  handle(g, w - 0.07, -0.03, 1.0); handle(g, w - 0.07, 0.03, 1.0); return g;
}
function door(o) {                                                     // o: open — угол, into — 'c0' | 'c1', hinge — 'a' (−x) | 'b' (+x) | 'ab' (двустворчатая), style
  const { g, t, w, sg } = opFrame(o), h = o.z1, into = (o.into === 'c1' ? 1 : -1) * sg, ly = into * (t / 2 - 0.035);
  box(g, 0.035, t, h - 0.035, M.jamb, -w / 2 + 0.0175, 0, 0); box(g, 0.035, t, h - 0.035, M.jamb, w / 2 - 0.0175, 0, 0); box(g, w, t, 0.035, M.jamb, 0, 0, h - 0.035);   // встык, не внахлёст
  for (const fy of [-t / 2 - 0.009, t / 2 + 0.009]) { if (o.noCasing === fy > 0) continue; box(g, 0.075, 0.018, h, M.casing, -w / 2 - 0.0375, fy, 0); box(g, 0.075, 0.018, h, M.casing, w / 2 + 0.0375, fy, 0); box(g, w + 0.15, 0.018, 0.075, M.casing, 0, fy, h); }
  const lw = o.hinge === 'ab' ? (w - 0.07) / 2 : w - 0.07, hs = o.hinge === 'ab' ? ['a', 'b'] : [o.hinge ?? 'a'];
  for (const hh of hs) { const a = (o.open ?? 0) * (hh === 'a' ? 1 : -1) * into * (o.hinge === 'ab' && hh === 'b' ? (o.open2 ?? 1) : 1);
    const p = node(g, hh === 'a' ? -w / 2 + 0.035 : w / 2 - 0.035, ly, 0.008, a), L = leaf(lw, h - 0.045, o.style); if (hh === 'b') L.scale.x = -1; p.add(L); }
  return g;
}
function sash(g, w, h, y, z0, kind) {                                 // рама окна: обвязка, импост, фрамуга, форточка; kind 'door' — балконная дверь с филёнкой внизу
  const b = 0.055, d = 0.05, m = M.frame;
  box(g, w, d, b, m, 0, y, z0); box(g, w, d, b, m, 0, y, z0 + h - b); box(g, b, d, h - 2 * b, m, -w / 2 + b / 2, y, z0 + b); box(g, b, d, h - 2 * b, m, w / 2 - b / 2, y, z0 + b);   // детали встык, без перекрытий: перекрытое запекалось чёрными уголками и мерцало (пользователь 23.10)
  if (kind === 'door') { box(g, w - 2 * b, d * 0.6, 0.8 - b, m, 0, y, z0 + b); box(g, w - 2 * b, d, b, m, 0, y, z0 + 0.82); }
  else { const zt = z0 + h * 0.7; box(g, b * 0.8, d, zt - z0 - b, m, 0, y, z0 + b); box(g, w - 2 * b, d, b * 0.8, m, 0, y, zt); box(g, b * 0.7, d, z0 + h - b - zt - b * 0.8, m, -w / 4, y, zt + b * 0.8); }
  const gz = kind === 'door' ? z0 + 0.86 : z0 + b, gh = (kind === 'door' ? h - 0.86 : h - 2 * b) - b;
  const gl = put(g, new THREE.PlaneGeometry(w - b, gh).rotateX(Math.PI / 2), M.winGlass, 0, y, gz + gh / 2, false); gl.renderOrder = 3;
}
function radiator(g, n, x, y, z0) { for (let i = 0; i < n; i++) { rbox(g, 0.062, 0.1, 0.52, 0.02, M.rad, x + (i - (n - 1) / 2) * 0.072, y, z0); } cyl(g, 0.012, 0.012, z0 + 0.1, M.rad, x - n * 0.036 - 0.03, y + 0.03, 0); }
function curtains(g, w, y, ins, extra = 0.9) {                                      // карниз, тюль и шторы по краям (складки — синусом)
  const zr = H - 0.16, W = w + extra; cyl(g, 0.012, 0.012, 0.01, M.brass, 0, y, zr);
  box(g, W, 0.02, 0.02, M.brass, 0, y, zr);
  const fold = (pw, ph, amp, mat, x, yy, z0, n) => { const geo = new THREE.PlaneGeometry(pw, ph, n, 1).rotateX(Math.PI / 2), p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Math.sin(p.getX(i) / pw * Math.PI * n * 0.5) * amp); geo.computeVertexNormals();
    const m = put(g, geo, mat, x, yy, z0 + ph / 2, false); m.renderOrder = 4; return m; };
  for (const s of [-1, 1]) { fold(0.42 * w, zr - 0.95, 0.02, M.tulle, s * 0.29 * w, y - ins * 0.03, 0.92, 12); fold(0.42, zr - 0.05, 0.05, M.drape, s * (W / 2 - 0.21), y - ins * 0.07, 0.05, 8); }
}
M.drape = Sm(0xffffff, 0.95, { map: fabric('#5e3f2a', '#7d5a38', 'stripe'), side: THREE.DoubleSide });   // шторы
M.tulle = new THREE.MeshStandardMaterial({ map: lace(256, 1024, false, 4), color: 0xf2efe6, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.05 });
function win(o) {                                                      // окно в наружной стене; o.into — сторона комнаты; o.kind 'bdoor' — балконный блок (дверь)
  const { g, t, w, sg } = opFrame(o), ins = (o.into === 'c1' ? 1 : -1) * sg, z0 = o.z0, z1 = o.z1, hh = z1 - z0, bd = o.kind === 'bdoor';
  box(g, 0.03, t, hh - 0.03, M.plaster, -w / 2 + 0.015, 0, z0); box(g, 0.03, t, hh - 0.03, M.plaster, w / 2 - 0.015, 0, z0); box(g, w, t, 0.03, M.plaster, 0, 0, z1 - 0.03);   // встык
  if (!bd) { box(g, w, t, 0.028, M.plaster, 0, 0, z0 - 0.03);   // откос на 2 мм ниже верха подоконника: в одной плоскости мерцал чёрной полосой при движении камеры (пользователь 23.10)
    box(g, w + 0.16, 0.26, 0.04, M.sill, 0, ins * (t / 2 - 0.05), z0 - 0.04); radiator(g, Math.round(w * 9), 0, ins * (t / 2 + 0.08), 0.13); }
  box(g, w + 0.06, 0.16, 0.02, M.steel, 0, -ins * (t / 2 + 0.03), z0 - 0.06); box(g, w, 0.12, 0.045, M.snow, 0, -ins * (t / 2 + 0.02), z0 - 0.04);   // отлив и снег снаружи
  if (bd) { for (const [dy, a] of [[t / 2 - 0.1, 1.25], [t / 2 - 0.3, 1.05]]) { const p = node(g, -w / 2 + 0.03, ins * dy, 0, ins * a * (o.open ?? 1)); const s = node(p, (w - 0.06) / 2, 0, 0); sash(s, w - 0.06, hh - 0.04, 0, z0 + 0.02, 'door'); } }
  else { sash(g, w - 0.04, hh - 0.04, ins * (t / 2 - 0.1), z0 + 0.02); sash(g, w - 0.04, hh - 0.04, ins * (t / 2 - 0.32), z0 + 0.02); }
  if (o.curtains) curtains(g, w, ins * (t / 2 + 0.14), ins);
  return g;
}

await idle();
// --- Планировка (Столярный, 14): комнаты по обмерному плану, м
const ROOMS = {
  zal: [[0, 0], [6.35, 0], [6.35, 3.43], [0, 3.43]],                                   // зал 21,5 м², два окна в торце
  hall: [[6.93, 2.03], [10.38, 2.03], [10.38, 3.68], [8.66, 3.68], [8.66, 11.86], [6.93, 11.86]],   // прихожая + коридор 6,8 × 1,73 + холл у кухни
  cab: [[8.86, 3.84], [13.2, 3.84], [13.2, 7.36], [8.86, 7.36]],                        // кабинет 15,3 м², балкон
  kit: [[10.5, 0], [13.2, 0], [13.2, 3.17], [10.5, 3.17]],                              // кухня 8,6 м²
};
const DZ = opening('y', 6.35, 6.93, 2.04, 3.24, 0, 2.4, 'door', { room: 'zal', into: 'c0', hinge: 'ab', open: 1.25, open2: 0.55, style: 'glass' });   // двустворчатая в зал
const DK = opening('y', 10.38, 10.5, 2.2, 3.0, 0, 2.1, 'door', { room: 'kit', into: 'c1', hinge: 'b', open: 1.45, style: 'glass' });
const DC = opening('y', 8.66, 8.86, 6.2, 7.05, 0, 2.1, 'door', { room: 'cab', into: 'c1', hinge: 'b', open: 1.3 });
const DB = opening('y', 8.66, 8.86, 7.75, 8.6, 0, 2.1, 'door', { room: 'hall', into: 'c0', hinge: 'a', open: 0 });   // в спальню — закрыта (комнат 4: прихожая с коридором, зал, кабинет с балконом, кухня)
const DBA = opening('x', 1.91, 2.03, 7.45, 8.15, 0, 2.05, 'door', { room: 'hall', into: 'c0', hinge: 'a', open: 0 });   // ванная, закрыта
const DWC = opening('x', 1.91, 2.03, 9.6, 10.2, 0, 2.05, 'door', { room: 'hall', into: 'c0', hinge: 'b', open: 0 });
const DEN = opening('x', 11.86, 12.0, 7.62, 8.5, 0, 2.1, 'door', { room: 'hall', into: 'c1', hinge: 'b', open: 0, style: 'padded', noCasing: true });
const NICHE = opening('y', 6.33, 6.93, 10.05, 11.55, 2.42, 3.02, 'niche', { room: 'hall' });   // антресоль встроенного шкафа прихожей
const WINS = [
  opening('y', -0.5, 0, 0.38, 1.32, 0.85, 2.6, 'win', { room: 'zal', into: 'c1', curtains: true }), opening('y', -0.5, 0, 2.11, 3.05, 0.85, 2.6, 'win', { room: 'zal', into: 'c1', curtains: true }),
  opening('y', 13.2, 13.7, 5.35, 6.75, 0.85, 2.6, 'win', { room: 'cab', into: 'c0', curtains: true }), opening('y', 13.2, 13.7, 4.4, 5.1, 0, 2.5, 'bdoor', { room: 'cab', into: 'c0', open: 1 }),
  opening('y', 13.2, 13.7, 0.85, 2.05, 0.85, 2.6, 'win', { room: 'kit', into: 'c0', curtains: true }),
];
room('zal', ROOMS.zal, P_.zal, M.parquet); room('hall', ROOMS.hall, P_.hall, M.parquet); room('cab', ROOMS.cab, P_.cab, M.parquet); room('kit', ROOMS.kit, M.kitWall, M.lino);
for (const o of OPEN) if (o.kind === 'door') door(o); else if (o.kind !== 'niche') win(o);

await idle();
// --- Фасады снаружи: стены дома с проёмами, окна соседей
const FAC = Sm(0x8f8778, 0.95, { map: tex(256, 256, (g, W, H) => { g.fillStyle = '#8e8676'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(40,36,30,.35)'; g.fillRect(0, H - 6, W, 6); seed = 6; noise(g, W, H, 30); }, [1 / 1.2, 1 / 1.2]) });
put(grp('east'), wallGeo([13.7, 14], [13.7, -2], -7.6, 13, holesFor([13.7, 14], [13.7, -2])), FAC, 0, 0, 0, false);
put(grp('west'), wallGeo([-0.5, -3], [-0.5, 6.5], -7.6, 13, holesFor([-0.5, -3], [-0.5, 6.5])), FAC, 0, 0, 0, false);
const NWIN = [Sm(0x0d1118, 0.2), new THREE.MeshBasicMaterial({ color: 0xffb768 }), new THREE.MeshBasicMaterial({ color: 0x8fa8d8 }), new THREE.MeshBasicMaterial({ color: 0xe69a52 })];   // окна соседей: тёмные и тёплые
seed = 41; for (const o of WINS) for (const dz of [-7.2, -3.6, 3.6, 7.2]) { const x = o.c0 < 0 ? -0.52 : 13.72, m = NWIN[rnd() < 0.62 ? 0 : 1 + Math.floor(rnd() * 3)];
  plane(grp(x < 0 ? 'west' : 'east'), o.u1 - o.u0 - 0.1, o.z1 - o.z0 - 0.1, m, x, (o.u0 + o.u1) / 2, (o.z0 + o.z1) / 2 + dz, x < 0 ? -Math.PI / 2 : Math.PI / 2); }

await idle();
// --- Фигурки, коробки серий, места
const KTX = new KTX2Loader().setTranscoderPath(new URL('../vendor/three@0.170.0/examples/jsm/libs/basis/', import.meta.url).href).detectSupport(renderer);
const GL = new GLTFLoader().setKTX2Loader(KTX).setMeshoptDecoder(MeshoptDecoder);
const FK = Object.keys(HS.TOYS), FIG = {}, FIGP = {};   // фигурки — по требованию (полки, распаковка): все 27 сразу — ~84 МБ
const figLoad = k => FIGP[k] ??= GL.loadAsync(`../toys_concepts/game/${k}.glb`).then(gl => { let m = null; gl.scene.updateMatrixWorld(true); gl.scene.traverse(n => { if (n.isMesh && !m) m = n; });
  const src = m.geometry, geo = new THREE.BufferGeometry();                // сжатая фигурка (meshopt, квантованные атрибуты) → обычные float, рост 1, ступни в 0, лицом в −y
  for (const nm of ['position', 'normal', 'uv']) { const a = src.getAttribute(nm); if (!a) continue; const s = a.itemSize, arr = new Float32Array(a.count * s), get = ['getX', 'getY', 'getZ', 'getW'];
    for (let i = 0; i < a.count; i++) for (let j = 0; j < s; j++) arr[i * s + j] = a[get[j]](i); geo.setAttribute(nm, new THREE.BufferAttribute(arr, s)); }
  if (src.index) geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(src.index.array), 1));
  geo.applyMatrix4(m.matrixWorld); geo.rotateX(Math.PI / 2); geo.computeBoundingBox(); const b = geo.boundingBox, s = 1 / (b.max.z - b.min.z);
  geo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z).scale(s, s, s); geo.computeBoundingSphere();
  return FIG[k] = { geo, mat: m.material }; });
const SERK = ['nich', 'mel', 'per', 'kuh'];   // ключи полок квартиры по залам H1…H4 (в сохранениях: 'nich-1'); 'pot' — гача «Потеряшки» (прихожая)
const SER = { ...Object.fromEntries(SERK.map((k, i) => [k, { name: serName(SERIES[i]), bs: HS.bsOf(`H${i + 1}-0`), figs: SERIES[i].figs, n: 6 }])), pot: { name: serName(SJ.GACHA), bs: true, figs: [...SJ.GACHA.figs, SJ.GACHA.secret], n: 8 }, rare: { name: T.rare, n: 8 } };   // всё из series.js и hall_style.js; у гачи коробок нет (капсула) — bs только чтобы на пустых местах был силуэт «?»
const SHORT = new Proxy({}, { get: (_, k) => figName(k) }), NUM = Object.fromEntries(Object.entries(SF).map(([k, v]) => [k, [v.no, v.rank]]));   // номер в серии, редкость — из series.js, как в hall_style.js
const tint = (I, col) => { const c = document.createElement('canvas'); c.width = I.width; c.height = I.height; const g = c.getContext('2d'); g.drawImage(I, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; };
const SIL = {}, silOf = k => SIL[k] ??= tint(HS.IMG[k], '#3a1830');   // силуэт — по требованию (картинки 768 px)
const serOf = f => ({ fig: SHORT[f], short: SHORT[f], num: NUM[f][0], rank: NUM[f][1], img: HS.IMG[f], sil: silOf(f), all: [...SF[f].s.figs, SF[f].s.secret].filter(Boolean).map(k => ({ img: HS.IMG[k], sil: silOf(k), name: SHORT[k], no: NUM[k][0], rank: NUM[k][1] })) });
const BOXM = {}, BOXG = new THREE.BoxGeometry(0.13, 0.09, 0.19);
const boxMats = (BS, f, k = 16) => BOXM[BS.series + f + k] ??= (() => { const S = serOf(f), m = (w, h, fn) => new THREE.MeshStandardMaterial({ map: tex(Math.round(w * k), Math.round(h * k), fn), roughness: 0.55 });   // печать серии (boxstyles.js), k — пикс. на см
  return HS.standPaint(BS, S, 13, 9, 19).map(([w, h, fn]) => m(w, h, fn)); })();   // грани как у настоящей стоячей коробки (hall_style, boxiki-92)
const FOC = [];                                                       // места крупного плана: фигурки (slot) и коробки (pbox); тап по мебели — камера подлетает (пользователь 22.10: «нельзя приблизиться, где и что стоит»)
const wrz = g => { let rz = 0; for (let n = g; n && n !== scene; n = n.parent) rz += n.rotation.z; return rz; }, nrmOf = rz => new THREE.Vector3(Math.sin(rz), -Math.cos(rz), 0);   // лицо мебели — локальный −y
function pbox(g, ser, i, x, y, z, rz = 0, lie = false, k) { const f = SER[ser].figs[i % SER[ser].figs.length];            // коробка 13 × 9 × 19 см: стоя лицом в −y или плашмя (lie) лицом вверх
  const m = new THREE.Mesh(BOXG, boxMats(SER[ser].bs, f, k)); m.castShadow = m.receiveShadow = true; m.userData.dyn = true; g.add(m);   // dyn — не запекать: печать на языке игрока, живой свет
  if (lie) { m.rotation.set(-Math.PI / 2, 0, 0, 'ZXY'); m.rotation.z = rz; m.position.set(x, y, z + 0.045); } else { m.rotation.z = rz; m.position.set(x, y, z + 0.095); }
  m.updateWorldMatrix(true, false); const p = m.getWorldPosition(new THREE.Vector3()), h = lie ? 0.09 : 0.19; FOC.push({ m, ser, f, p, z: [p.z - h / 2, p.z + h / 2], n: nrmOf(wrz(g)), room: roomOf(g) }); return m; }
const SLOTS = [];
function slot(g, lx, ly, lz, ser, o = {}) { g.updateWorldMatrix(true, true); const p = g.localToWorld(new THREE.Vector3(lx, ly, lz)), rz = wrz(g);
  const s = { id: SLOTS.length, ser, pos: p, rz: rz + (o.rz ?? 0), h: (o.h ?? 0.11) * 1.45, room: roomOf(g), fig: null, mesh: null, q: null, tag: o.tag }; SLOTS.push(s);
  FOC.push({ s, p, z: [p.z, p.z + s.h], n: nrmOf(g.parent === scene ? s.rz : rz), room: s.room }); return s; }

// --- Ассеты Poly Haven (CC0, assets_room/LICENSES.md): glTF y вверх → z вверх, лицом в −y
const GLTF = {};
const HIDDEN = new Set(['ArmChair_01', 'Chandelier_02', 'GreenChair_01', 'Television_01', 'book_encyclopedia_set_01', 'cardboard_box_01', 'carved_wooden_elephant', 'fancy_picture_frame_01', 'horse_statue_01', 'jar_pickles_1l', 'jug_01', 'modern_ceiling_lamp_01', 'ornate_mirror_01', 'painted_wooden_chair_01', 'pot_enamel_01', 'potted_plant_04', 'russian_food_cans_01', 'vintage_day_bed']);   // при запечённом свете спрятаны целиком (слой 31, замер 26.10); у дивана, часов, чайника, рамки, кассетника видны стекло / стрелки — грузятся
const BOXES = Q.get('bake') !== '0' ? fetch('bake/boxes.json').then(r => r.ok ? r.json() : {}).catch(() => ({})) : Promise.resolve({});   // габариты спрятанных (asset → userData.box): раскладка та же, модели не качаем (Poki: −8 МБ, 26.10); нет записи — грузится как раньше
async function asset(g, name, { w, h, x = 0, y = 0, z = 0, rz = 0, back = false, glb = false }) {   // glb — свой ассет (TRELLIS) одним файлом
  const key = `${name}|${w ?? ''}|${h ?? ''}|${back ? 1 : 0}`, B = HIDDEN.has(name) && (await BOXES)[key];
  if (B) { const P = node(g, x, y, z, rz); P.userData.box = new THREE.Box3(new THREE.Vector3(...B[0]), new THREE.Vector3(...B[1])); P.userData.asset = name; P.userData.bkey = key; return P; }
  const src = await (GLTF[name] ??= GL.loadAsync(`../assets_room/${name}/${name}.${glb ? 'glb' : 'gltf'}`)), s = src.scene.clone(true); s.rotation.x = Math.PI / 2;
  const inner = new THREE.Group(); inner.add(s); s.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  let b = new THREE.Box3().setFromObject(inner); const k = w ? w / (b.max.x - b.min.x) : h ? h / (b.max.z - b.min.z) : 1; inner.scale.setScalar(k); b = new THREE.Box3().setFromObject(inner);
  inner.position.set(-(b.min.x + b.max.x) / 2, back ? -b.max.y : -(b.min.y + b.max.y) / 2, -b.min.z); const P = node(g, x, y, z, rz); P.add(inner); P.userData.box = b; P.userData.asset = name; P.userData.bkey = key; return P; }
const carpet = (file, rot = 0) => { const t = img('../assets_room/' + file); if (rot) { t.rotation = rot; t.center.set(0.5, 0.5); } return Sm(0xffffff, 0.95, { map: t }); };
const lampShade = (c, k = 1) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, emissive: c, emissiveIntensity: k, side: THREE.DoubleSide });
const glowM = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
function rosette(g, x, y) { cyl(g, 0.22, 0.2, 0.025, M.cornice, x, y, H - 0.025, 32); cyl(g, 0.12, 0.1, 0.035, M.cornice, x, y, H - 0.06, 24); }   // лепная розетка под люстрой (сталинка)
function books(g, x0, x1, y, z, hmax = 0.25, d = 0.19, gaps = []) {   // ряд корешков от x0 до x1 (лицом в −y), gaps — промежутки под фигурки
  let x = x0; while (x < x1 - 0.015) { const gp = gaps.find(([a, b]) => x >= a && x < b); if (gp) { x = gp[1]; continue; }
    const w = rr(0.018, 0.048), h = rr(0.62, 1) * hmax; if (x + w > x1) break; box(g, w - 0.002, d * rr(0.8, 1), h, BOOK[Math.floor(rnd() * BOOK.length)], x + w / 2, y - d / 2, z); x += w; } }
function crystal(g, x, y, z, kind) {                                  // хрусталь: рюмка, ваза, салатница — грани (flatShading)
  if (kind === 'glass') { cyl(g, 0.012, 0.022, 0.055, M.crystal, x, y, z + 0.05, 8, false); cyl(g, 0.003, 0.003, 0.05, M.crystal, x, y, z, 6); cyl(g, 0.018, 0.018, 0.004, M.crystal, x, y, z, 8); }
  if (kind === 'vase') cyl(g, 0.04, 0.065, 0.24, M.crystal, x, y, z, 10);
  if (kind === 'bowl') cyl(g, 0.05, 0.1, 0.075, M.crystal, x, y, z, 12); }
function front(g, w, h, x, y, z0, m = M.veneer) { box(g, w - 0.006, 0.018, h - 0.006, m, x, y - 0.009, z0 + 0.003); box(g, w - 0.07, 0.004, h - 0.07, M.veneerD, x, y - 0.02, z0 + 0.035, false); }   // фасад дверцы с рамкой
const knob = (g, x, y, z) => box(g, 0.014, 0.03, 0.08, M.brass, x, y - 0.015, z - 0.04);
await idle();
// ============ ЗАЛ: стенка («Ничейные»), горка (редкие), сервант с хрусталём, телевизор на салфетке, диван и ковёр
const LAMPS = {}, Z = {};                                                      // лампы-светильники для света по комнатам
{
  const g = grp('zal'); seed = 101;
  flat(g, 3.0, 2.0, carpet('carpet_cma.jpg', Math.PI / 2), 3.05, 1.72, 0.004);                   // ковёр на полу (Кливленд, CC0)
  await idle();
  // стенка 4,2 м у южной стены: шкаф | книги | застеклённая секция с зеркалом и лампой | бар и полка; сверху антресоли
  const s = node(g, 2.55, 0, 0, S_), D = 0.45, X = [-2.1, -1.2, -0.3, 0.9, 2.1];
  box(s, 4.18, D - 0.04, 0.08, M.veneerD, 0, -D / 2 + 0.01, 0);
  for (const x of X) box(s, 0.022, D, 2.72, M.veneer, x, -D / 2, 0.08);
  for (const z of [0.08, 2.28, 2.72]) box(s, 4.22, D, 0.022, M.veneer, 0, -D / 2, z);
  box(s, 4.2, 0.012, 2.64, M.veneerD, 0, -0.006, 0.08, false);                                  // задняя стенка
  front(s, 0.45, 2.17, -1.875, -D, 0.1); front(s, 0.45, 2.17, -1.425, -D, 0.1); knob(s, -1.68, -D - 0.02, 1.25); knob(s, -1.62, -D - 0.02, 1.25);   // шкаф
  front(s, 0.9, 0.66, -0.75, -D, 0.1); knob(s, -0.75, -D - 0.02, 0.6);                           // книжная секция
  for (const z of [0.78, 1.17, 1.56, 1.95]) box(s, 0.88, D - 0.03, 0.02, M.veneer, -0.75, -D / 2 - 0.01, z);
  books(s, -1.18, -0.32, -0.02, 0.8, 0.3, 0.22); books(s, -1.18, -0.32, -0.02, 1.19, 0.3, 0.22, [[-0.98, -0.82]]); books(s, -1.18, -0.32, -0.02, 1.58, 0.28, 0.22, [[-0.6, -0.42]]); books(s, -1.18, -0.6, -0.02, 1.97, 0.24, 0.2);
  slot(s, -0.9, -0.24, 1.19, 'free'); slot(s, -0.51, -0.24, 1.58, 'free');
  front(s, 0.6, 0.7, -0.0, -D, 0.1); front(s, 0.6, 0.7, 0.6, -D, 0.1); knob(s, 0.26, -D - 0.02, 0.6); knob(s, 0.34, -D - 0.02, 0.6);   // под стеклом — дверцы
  box(s, 1.18, D - 0.02, 0.02, M.veneer, 0.3, -D / 2, 0.8); box(s, 1.17, 0.006, 1.12, M.mirror, 0.3, -0.016, 0.82, false);   // дно витрины, зеркало
  box(s, 1.17, 0.3, 0.012, M.glass, 0.3, -0.18, 1.38, false); box(s, 1.18, D, 0.33, M.veneer, 0.3, -D / 2, 1.95); front(s, 0.6, 0.31, 0.0, -D, 1.96); front(s, 0.6, 0.31, 0.6, -D, 1.96);
  for (const [x, y] of [[0.0, -D + 0.012], [0.58, -D + 0.026]]) { const p = box(s, 0.62, 0.006, 1.12, M.glass, x, y, 0.82, false); p.renderOrder = 5; box(s, 0.62, 0.012, 0.02, M.brass, x, y, 0.82, false); }   // раздвижные стёкла
  box(s, 1.1, 0.03, 0.012, glowM(0xffe2b0, 1.4), 0.3, -0.12, 1.93, false);                    // лампочка витрины
  LAMPS.stenka = s.localToWorld(new THREE.Vector3(0.3, -0.2, 1.85));
  for (const [x, z] of [[-0.05, 0.82], [0.3, 0.82], [0.65, 0.82], [-0.05, 1.392], [0.3, 1.392], [0.65, 1.392]]) slot(s, x, -0.2, z, 'nich');
  crystal(s, 0.85, -0.12, 1.392, 'glass'); crystal(s, 0.8, -0.3, 0.82, 'bowl');
  front(s, 1.2, 0.7, 1.5, -D, 0.1); knob(s, 1.5, -D - 0.02, 0.6); front(s, 1.2, 0.58, 1.5, -D, 0.81); box(s, 0.06, 0.02, 0.03, M.brass, 1.5, -D - 0.02, 1.25);   // бар с откидной дверцей
  box(s, 1.18, D - 0.03, 0.02, M.veneer, 1.5, -D / 2 - 0.01, 1.4); books(s, 0.95, 1.6, -0.02, 1.42, 0.27, 0.21); crystal(s, 1.85, -0.22, 1.42, 'vase'); slot(s, 1.72, -0.24, 1.42, 'free');
  front(s, 1.2, 0.31, 1.5, -D, 1.96);
  for (let i = 0; i < 8; i++) { const x = -2.1 + 0.2625 + i * 0.525; if (i === 5 || i === 6) continue; front(s, 0.525, 0.42, x, -D, 2.295); }   // антресоли, две дверцы открыты
  for (const [hx, a, cx] of [[0.525, -1.7, 0.2625], [1.575, 1.6, -0.2625]]) { const p = node(s, hx, -D, 2.295, a); front(p, 0.525, 0.42, cx, 0, 0); }
  pbox(s, 'nich', 0, 0.9, -0.17, 2.302, 0.05, true); pbox(s, 'nich', 1, 1.08, -0.2, 2.302, -0.08, true); pbox(s, 'nich', 2, 0.95, -0.2, 2.392, 0.2, true);   // коробки в антресоли
  pbox(s, 'nich', 0, -1.6, -0.2, 2.742, 0.06); pbox(s, 'nich', 1, -1.42, -0.2, 2.742, -0.1); pbox(s, 'nich', 2, 1.9, -0.22, 2.742, 0.3, true);   // и на стенке
  await idle();
  // горка у южной стены: стекло с трёх сторон, стеклянные полки, зеркало, подсветка — для редких и секретных
  const k = node(g, 5.18, 0, 0, S_), KW = 0.62, KD = 0.4;
  box(k, KW, KD, 0.32, M.veneer, 0, -KD / 2, 0); front(k, KW, 0.3, 0, -KD, 0.01); box(k, KW + 0.04, KD + 0.03, 0.06, M.veneer, 0, -KD / 2, 1.87); box(k, KW - 0.02, KD - 0.02, 0.012, glowM(0xffe8c0, 1.2), 0, -KD / 2, 1.858, false);
  for (const [x, y] of [[-KW / 2 + 0.015, -0.015], [KW / 2 - 0.015, -0.015], [-KW / 2 + 0.015, -KD + 0.015], [KW / 2 - 0.015, -KD + 0.015]]) box(k, 0.03, 0.03, 1.55, M.veneer, x, y, 0.32);
  box(k, KW - 0.03, 0.006, 1.55, M.mirror, 0, -0.008, 0.32, false);
  for (const [w, d, x, y] of [[KW - 0.03, 0.006, 0, -KD + 0.004], [0.006, KD - 0.03, -KW / 2 + 0.004, -KD / 2], [0.006, KD - 0.03, KW / 2 - 0.004, -KD / 2]]) box(k, w, d, 1.55, M.glass, x, y, 0.32, false).renderOrder = 5;
  for (const [i, z] of [0.33, 0.7, 1.07, 1.44].entries()) { if (i) box(k, KW - 0.05, KD - 0.05, 0.01, M.glass, 0, -KD / 2, z - 0.01, false); for (const x of [-0.14, 0.14]) slot(k, x, -0.19, z, 'rare'); }
  LAMPS.gorka = k.localToWorld(new THREE.Vector3(0, -0.2, 1.7));
  await idle();
  // сервант у северной стены: низ — дверцы, верх — стекло с зеркалом, хрусталь; сверху слоники
  const v = node(g, 4.55, 3.43, 0, N_), VW = 1.3;
  box(v, VW, 0.45, 0.06, M.veneerD, 0, -0.22, 0); box(v, VW, 0.45, 0.76, M.veneer, 0, -0.225, 0.06); front(v, VW / 2, 0.7, -VW / 4, -0.45, 0.08); front(v, VW / 2, 0.7, VW / 4, -0.45, 0.08); knob(v, -0.04, -0.47, 0.6); knob(v, 0.04, -0.47, 0.6);
  box(v, VW + 0.03, 0.47, 0.025, M.veneer, 0, -0.235, 0.82); flat(v, 1.0, 0.3, Sm(0xffffff, 0.9, { map: lace(256, 64, false, 12), transparent: true, alphaTest: 0.3 }), 0, -0.3, 0.847);
  for (const x of [-VW / 2 + 0.015, VW / 2 - 0.015]) box(v, 0.03, 0.3, 0.74, M.veneer, x, -0.15, 0.845);
  box(v, VW, 0.31, 0.03, M.veneer, 0, -0.155, 1.585); box(v, VW - 0.03, 0.006, 0.74, M.mirror, 0, -0.006, 0.845, false); box(v, VW - 0.04, 0.27, 0.01, M.glass, 0, -0.15, 1.2, false);
  for (const [x, y] of [[-0.31, -0.295], [0.31, -0.28]]) box(v, 0.66, 0.006, 0.72, M.glass, x, y, 0.85, false).renderOrder = 5;
  for (let i = 0; i < 7; i++) crystal(v, -0.5 + i * 0.165, -0.15, 1.21, 'glass');
  crystal(v, -0.42, -0.14, 0.847, 'vase'); crystal(v, 0.42, -0.14, 0.847, 'bowl'); slot(v, -0.15, -0.16, 0.847, 'free'); slot(v, 0.13, -0.16, 0.847, 'free'); slot(v, 0.38, -0.2, 1.615, 'free');
  Z.v = v;
  await idle();
  // диван с ковром над ним, торшер, кресло
  const crt = carpet('carpet_turkmen_saryk.jpg'); plane(g, 2.0, 1.55, crt, 2.25, 3.425, 1.78);          // туркменский ковёр на стене (Кливленд, CC0)
  box(g, 0.02, 0.012, 1.55, M.brass, 1.25, 3.42, 1.0, false); box(g, 0.02, 0.012, 1.55, M.brass, 3.25, 3.42, 1.0, false);
  const tx = 0.95, ty = 3.05; cyl(g, 0.15, 0.15, 0.02, M.metalDark, tx, ty, 0); cyl(g, 0.012, 0.012, 1.42, M.brass, tx, ty, 0.02);   // торшер с бахромой
  cyl(g, 0.24, 0.15, 0.3, lampShade(0xe8a35c, 0.55), tx, ty, 1.36, 24, true); cyl(g, 0.245, 0.245, 0.05, lampShade(0xc98a45, 0.25), tx, ty, 1.31, 24, true); LAMPS.torsher = new THREE.Vector3(tx, ty, 1.48);
  await idle();
  // телевизор в углу на тумбе с салфеткой; фигурка на телевизоре
  const t = node(g, 0.62, 2.82, 0, 3 * Math.PI / 4); box(t, 0.62, 0.46, 0.56, M.veneer, 0, 0, 0); front(t, 0.3, 0.4, -0.15, -0.23, 0.08); front(t, 0.3, 0.4, 0.15, -0.23, 0.08); box(t, 0.66, 0.5, 0.02, M.veneerD, 0, 0, 0.56);
  Z.t = t;
  await idle();
  // окна: цветы и места на подоконниках
  for (const y of [0.85, 2.58]) slot(g, 0.0, y + 0.18, 0.85, 'free', { rz: W_ - 0.3 });
  LAMPS.chand = new THREE.Vector3(3.17, 1.72, 2.55); rosette(g, 3.17, 1.72);
}
await idle();
// ============ КОРИДОР И ПРИХОЖАЯ: дорожка, стена рамок, часы, антресоль над коридором, встроенный шкаф, «Дежурные» над тумбой, вешалка
{
  const g = grp('hall'); seed = 202;
  const runner = await loadImg('../assets_room/runner_field.jpg');
  const rt = tex(256, 2048, (c, W, Hh) => { c.fillStyle = '#5a1e1a'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#d8c7a4'; c.fillRect(10, 10, W - 20, Hh - 20); c.fillStyle = '#6b2620'; c.fillRect(22, 22, W - 44, Hh - 44);   // дорожка: кайма + поле молитвенного коврика (Кливленд, CC0)
    const tw = W - 56, th = tw * runner.height / runner.width; for (let y = 28; y < Hh - 28; y += th) c.drawImage(runner, 28, y, tw, Math.min(th, Hh - 28 - y)); noise(c, W, Hh, 20); });
  flat(g, 0.78, 8.7, Sm(0xffffff, 0.95, { map: rt }), 7.8, 6.95, 0.005);
  flat(g, 0.75, 0.5, Sm(0xffffff, 0.95, { map: fabric('#5b4a3a', '#8a6a4a', 'stripe') }), 8.05, 11.5, 0.006);   // половик у входа
  await idle();
  // полоска света из-под двери ванной
  flat(g, 0.66, 0.22, new THREE.MeshBasicMaterial({ map: tex(64, 32, (c, W, Hh) => { const r = c.createLinearGradient(0, 0, 0, Hh); r.addColorStop(0, 'rgba(255,200,130,.75)'); r.addColorStop(1, 'rgba(255,200,130,0)'); c.fillStyle = r; c.fillRect(0, 0, W, Hh); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 7.8, 2.14, 0.007);
  await idle();
  // стена рамок-витрин (запад, лицом на восток): 3 × 2, внутри фигурки
  const fr = node(g, 6.93, 6.9, 0, W_), paperBg = Sm(0xffffff, 0.9, { map: tex(128, 128, (c, W, Hh) => { c.fillStyle = '#c9b996'; c.fillRect(0, 0, W, Hh); seed = 9; noise(c, W, Hh, 26); }) });
  for (const zr of [1.18, 1.6]) for (const x of [-0.82, -0.41, 0, 0.41, 0.82].slice(1, 4)) { const S = 0.34;
    for (const [w, h, dx, dz] of [[S, 0.025, 0, 0], [S, 0.025, 0, S - 0.025], [0.025, S - 0.05, -S / 2 + 0.0125, 0.025], [0.025, S - 0.05, S / 2 - 0.0125, 0.025]]) box(fr, w, 0.1, h, M.veneerD, x + dx, -0.05, zr + dz);   // стойки между брусьями: перекрытый угол запекался чёрным (пользователь 23.10)
    plane(fr, S - 0.05, S - 0.05, paperBg, x, -0.004, zr + S / 2); slot(fr, x, -0.055, zr + 0.025, 'free', { h: 0.1 }); }
  await idle();
  // антресоль над коридором: короб на всю ширину, дверцы смотрят на юг, одна открыта — коробки
  const a = node(g, 7.795, 9.75, 2.42, 0), AW = 1.73, AD = 0.75;
  box(a, AW, AD, 0.025, M.doorPaint, 0, -AD / 2, 0); box(a, AW, 0.02, 0.76, M.doorPaint, 0, -0.01, 0.0);
  box(a, AW / 2, 0.025, 0.74, M.doorPaint, -AW / 4, -AD, 0.02); const ad = node(a, AW / 2 - 0.01, -AD, 0.02, 1.5); box(ad, AW / 2 - 0.02, 0.025, 0.74, M.doorPaint, -AW / 4 + 0.005, -0.0125, 0); knob(ad, -AW / 2 + 0.12, -0.025, 0.37);
  box(a, AW + 0.02, 0.05, 0.05, M.casing, 0, -AD - 0.01, -0.03);
  pbox(a, 'mel', 0, 0.25, -0.35, 0.025, 0.1, true); pbox(a, 'per', 0, 0.45, -0.32, 0.025, -0.2, true); pbox(a, 'mel', 1, 0.3, -0.36, 0.115, 0.3, true); pbox(a, 'per', 1, 0.65, -0.3, 0.025, 0.05);
  await idle();
  // встроенный шкаф прихожей: дверцы заподлицо со стеной, сверху антресоль-ниша с коробками «Дежурных»
  const w = node(g, 6.93, 10.8, 0, W_);
  for (const x of [-0.37, 0.37]) { box(w, 0.72, 0.03, 2.36, M.doorPaint, x, -0.015, 0.02); box(w, 0.6, 0.008, 2.0, M.casing, x, -0.032, 0.2, false); knob(w, x + (x < 0 ? 0.3 : -0.3), -0.03, 1.05); }
  box(w, 1.5, 0.03, 0.05, M.casing, 0, -0.02, 2.37);
  const nb = node(g, 6.63, 10.8, 2.42, W_); box(nb, 1.5, 0.6, 0.02, M.doorPaint, 0, 0, 0); box(nb, 1.5, 0.02, 0.6, M.doorPaint, 0, 0.29, 0); box(nb, 1.5, 0.6, 0.02, M.doorPaint, 0, 0, 0.58); for (const x of [-0.75, 0.75]) box(nb, 0.02, 0.6, 0.6, M.doorPaint, x, 0, 0);
  const nd = node(g, 6.93, 10.05, 2.42, W_ - 1.35); box(nd, 0.74, 0.025, 0.58, M.doorPaint, 0.37, -0.0125, 0.01);
  pbox(nb, 'nich', 4, -0.3, 0.05, 0.02, 0.06, true); pbox(nb, 'per', 5, -0.12, 0.08, 0.02, -0.1); pbox(nb, 'kuh', 1, -0.45, 0.06, 0.11, 0.2, true);
  await idle();
  // тумба-обувница с телефоном и полочка гачи «Потеряшки» (восточная стена прихожей, лицом на запад): 7 + секретка
  const tb = node(g, 8.66, 10.35, 0, E_); box(tb, 0.8, 0.34, 0.62, M.veneer, 0, -0.17, 0); front(tb, 0.39, 0.5, -0.2, -0.34, 0.06); front(tb, 0.39, 0.5, 0.2, -0.34, 0.06); box(tb, 0.82, 0.36, 0.02, M.veneerD, 0, -0.18, 0.62);
  const ph = node(tb, -0.2, -0.17, 0.64, 0.3); rbox(ph, 0.2, 0.22, 0.08, 0.02, Sm(0x7a1f1c, 0.35), 0, 0, 0); cyl(ph, 0.06, 0.06, 0.012, Sm(0xe9e2d0, 0.4), 0, -0.02, 0.08, 20); rbox(ph, 0.22, 0.05, 0.05, 0.02, Sm(0x7a1f1c, 0.35), 0, 0.07, 0.085);   // дисковый телефон
  for (const z of [1.22, 1.58]) { box(tb, 0.8, 0.17, 0.022, M.veneer, 0, -0.085, z); for (const x of [-0.38, 0.38]) box(tb, 0.02, 0.17, 0.12, M.veneer, x, -0.085, z - 0.12); for (const x of [-0.3, -0.1, 0.1, 0.3]) slot(tb, x, -0.09, z + 0.022, 'pot', { h: 0.1 }); }
  await idle();
  // вешалка у двери: планка с крючками, полка, пальто
  const hk = node(g, 8.66, 11.38, 0, E_); box(hk, 0.8, 0.03, 0.1, M.veneer, 0, -0.015, 1.7); box(hk, 0.8, 0.26, 0.02, M.veneer, 0, -0.13, 1.92);
  for (const x of [-0.3, -0.1, 0.1, 0.3]) { box(hk, 0.012, 0.05, 0.012, M.brass, x, -0.04, 1.73); box(hk, 0.012, 0.012, 0.035, M.brass, x, -0.065, 1.735); }   // крючки (пальто-цилиндры убраны: «убого»)
  LAMPS.corr = new THREE.Vector3(7.8, 6.3, 2.75); LAMPS.entry = new THREE.Vector3(7.8, 10.7, 2.75);
}
await idle();
// ============ КАБИНЕТ: книжные полки со стеклом («Мелкие неприятности»), стол «новенькой» у окна с зелёной лампой, тахта, кресло
{
  const g = grp('cab'); seed = 303;
  const b = node(g, 10.3, 3.84, 0, S_), BW = 1.18, BD = 0.36;                                 // две секции по 1,18 м
  for (const cx of [-0.6, 0.6]) {
    box(b, BW, BD, 0.06, M.veneerD, cx, -BD / 2, 0); for (const x of [cx - BW / 2 + 0.011, cx + BW / 2 - 0.011]) box(b, 0.022, BD, 2.1, M.oak, x, -BD / 2, 0.06);
    box(b, BW, 0.01, 2.1, M.oak, cx, -0.005, 0.06, false); box(b, BW + 0.02, BD + 0.02, 0.04, M.oak, cx, -BD / 2, 2.16);
    front(b, BW / 2, 0.66, cx - BW / 4, -BD, 0.07, M.oak); front(b, BW / 2, 0.66, cx + BW / 4, -BD, 0.07, M.oak); knob(b, cx - 0.04, -BD - 0.02, 0.6); knob(b, cx + 0.04, -BD - 0.02, 0.6);
    for (const z of [0.74, 1.1, 1.46, 1.82]) box(b, BW - 0.04, BD - 0.02, 0.022, M.oak, cx, -BD / 2, z);
    books(b, cx - 0.56, cx + 0.56, -0.02, 0.762, 0.3, 0.24); books(b, cx - 0.56, cx + 0.56, -0.02, 1.482, 0.3, 0.24, [[cx - 0.1, cx + 0.08]]); books(b, cx - 0.56, cx + 0.3, -0.02, 1.842, 0.28, 0.24);
    for (const x of [-0.36, 0, 0.36]) slot(b, cx + x, -0.17, 1.122, 'mel'); slot(b, cx - 0.01, -0.19, 1.482, 'free');
    for (const [x, y] of [[cx - 0.29, -BD + 0.01], [cx + 0.29, -BD + 0.024]]) { box(b, BW / 2 + 0.02, 0.005, 1.4, M.glass, x, y, 0.74, false).renderOrder = 5; box(b, BW / 2 + 0.02, 0.012, 0.012, M.brass, x, y, 0.74, false); }
  }
  await idle();
  // письменный стол у окна (стол — у восточной стены под подоконником, лицом на запад)
  const d = node(g, 13.06, 6.05, 0, E_), DW = 1.25, DD = 0.66;
  box(d, DW, DD, 0.035, M.veneer, 0, -DD / 2 - 0.02, 0.72); box(d, 0.42, DD - 0.04, 0.7, M.veneer, -DW / 2 + 0.22, -DD / 2 - 0.02, 0.02); for (const z of [0.05, 0.27, 0.49]) { front(d, 0.4, 0.2, -DW / 2 + 0.22, -DD - 0.02, z); knob(d, -DW / 2 + 0.22, -DD - 0.04, z + 0.14); }
  box(d, 0.03, DD - 0.06, 0.7, M.veneer, DW / 2 - 0.03, -DD / 2 - 0.02, 0.02); box(d, DW - 0.5, 0.02, 0.4, M.veneer, 0.18, -0.05, 0.32);
  flat(d, 0.6, 0.4, Sm(0x2f4a3a, 0.9), 0.1, -0.36, 0.7562);                                  // зелёное сукно-вкладка
  const L = node(d, -0.42, -0.2, 0.755); cyl(L, 0.08, 0.08, 0.02, M.brass, 0, 0, 0, 24); cyl(L, 0.012, 0.012, 0.3, M.brass, 0, 0, 0.02);   // лампа с зелёным абажуром
  const shade = put(L, new THREE.CylinderGeometry(0.11, 0.11, 0.26, 24, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), Sm(0x1f5a36, 0.25, { side: THREE.DoubleSide, emissive: 0x0e3a1e, emissiveIntensity: 0.6, envMapIntensity: 2 }), 0, -0.04, 0.33);
  box(L, 0.2, 0.03, 0.01, glowM(0xfff0c8, 2), 0, -0.04, 0.325, false);
  LAMPS.desk = L.localToWorld(new THREE.Vector3(0, -0.06, 0.26)); LAMPS.deskT = d.localToWorld(new THREE.Vector3(0.05, -0.32, 0.75));
  for (let i = 0; i < 3; i++) { const p = flat(d, 0.21, 0.297, Sm(0xe9e3d3, 0.9), 0.45 + i * 0.01, -0.3 + i * 0.012, 0.757 + i * 0.001); p.rotation.z = 0.2 - i * 0.15; }
  Z.desk = d; Z.deskSlot = slot(d, 0.02, -0.3, 0.757, 'desk', { h: 0.13 });
  rosette(g, 11.0, 5.6); LAMPS.cabCeil = new THREE.Vector3(11.0, 5.6, 2.75);
}
await idle();
// ============ БАЛКОН: плита, решётка, снег, стеллаж «Перекура», ящики с коробками (пепельницы нет: «никто не курит»; табурет со снегом стоял перед камерой остановки светлой доской — убран 23.10)
{
  const g = grp('balc'); seed = 404;
  box(g, 1.1, 2.9, 0.15, M.concrete, 14.25, 5.7, -0.17); box(g, 1.1, 2.9, 0.15, M.concrete, 14.25, 5.7, 3.38);
  put(g, new THREE.BoxGeometry(1.04, 2.84, 0.05), M.snow, 14.25, 5.7, -0.005, false);
  for (let i = 0; i < 9; i++) rbox(g, rr(0.15, 0.4), rr(0.2, 0.5), rr(0.02, 0.05), 0.01, M.snow, rr(14.35, 14.7), rr(4.4, 7.0), 0.01);   // сугробики у решётки
  const rail = (ax, a0, a1, c) => { const L = a1 - a0, m = (a0 + a1) / 2; if (ax === 'y') { box(g, 0.045, L, 0.045, M.metalDark, c, m, 1.0); box(g, 0.06, L, 0.035, M.snow, c, m, 1.045); box(g, 0.03, L, 0.03, M.metalDark, c, m, 0.06); for (let y = a0; y <= a1; y += 0.12) box(g, 0.014, 0.014, 0.95, M.metalDark, c, y, 0.06); }
    else { box(g, L, 0.045, 0.045, M.metalDark, m, c, 1.0); box(g, L, 0.06, 0.035, M.snow, m, c, 1.045); box(g, L, 0.03, 0.03, M.metalDark, m, c, 0.06); for (let x = a0; x <= a1; x += 0.12) box(g, 0.014, 0.014, 0.95, M.metalDark, x, c, 0.06); } };
  rail('y', 4.28, 7.12, 14.77); rail('x', 13.72, 14.77, 4.28); rail('x', 13.72, 14.77, 7.12);
  const s = node(g, 14.27, 7.08, 0, N_), SW = 0.9, SD = 0.34;                               // стеллаж из уголка, крашеный
  for (const x of [-SW / 2, SW / 2]) for (const y of [-0.02, -SD + 0.02]) box(s, 0.03, 0.03, 1.55, M.green, x, y, 0);
  for (const [i, z] of [0.05, 0.45, 0.85, 1.25].entries()) { box(s, SW, SD, 0.02, M.green, 0, -SD / 2, z); box(s, SW - 0.04, SD - 0.06, 0.012, M.snow, 0, -SD / 2 + 0.02, z + 0.02, false);
    if (i === 1 || i === 2) for (const x of [-0.28, 0, 0.28]) slot(s, x, -0.17, z + 0.02, 'per'); }
  { const v = Q.get('balc') ?? 'c', T0 = 1.27, Y = -0.17, ball = (x, y, z, r, c) => put(s, new THREE.SphereGeometry(r, 16, 12), Sm(c, 0.25), x, y, z);   // верх стеллажа (пользователь 23.10: «непонятно, что за банки — что-то интересное»): варианты стенда ?balc=a|b|c до выбора
    const label = (w, h, fn) => Sm(0xffffff, 0.7, { map: tex(w, h, fn) });
    if (v === 'a') {                                                                       // А «Перекур»: приёмник «Волна», банка-пепельница, термос
      box(s, 0.3, 0.1, 0.19, Sm(0x7a2a24, 0.5), -0.18, Y, T0); plane(s, 0.22, 0.1, label(256, 120, (c, W, H) => { c.fillStyle = '#d9cfb8'; c.fillRect(0, 0, W, H); c.fillStyle = '#2b2b2b'; for (let i = 0; i < W; i += 10) c.fillRect(i, 0, 4, H * 0.62); c.fillStyle = '#e9e0c8'; c.fillRect(0, H * 0.66, W, H * 0.34); c.fillStyle = '#b8473a'; c.font = '700 26px "Golos Text"'; c.textAlign = 'center'; c.fillText('ВОЛНА', W / 2, H * 0.92); }), -0.18, Y - 0.051, T0 + 0.07);
      box(s, 0.012, 0.012, 0.28, M.steel, -0.06, Y + 0.02, T0 + 0.19); cyl(s, 0.042, 0.042, 0.075, Sm(0x8a6d3b, 0.4), 0.08, Y, T0, 14); for (const [dx, a] of [[-0.012, 0.6], [0.014, -0.4]]) { const b2 = cyl(s, 0.005, 0.005, 0.03, Sm(0xe8e0cc, 0.8), 0.08 + dx, Y, T0 + 0.07, 8); b2.rotation.y = a; }
      cyl(s, 0.045, 0.045, 0.3, Sm(0x2f6b4f, 0.45), 0.29, Y, T0, 16); cyl(s, 0.036, 0.036, 0.06, Sm(0xc9c2b0, 0.4), 0.29, Y, T0 + 0.3, 16);
    } else if (v === 'b') {                                                                // Б «Рассада»: ящик с землёй, ростки помидоров, лейка
      box(s, 0.5, 0.2, 0.09, M.oak, -0.12, Y, T0); box(s, 0.47, 0.17, 0.02, Sm(0x3a2a1e, 0.95), -0.12, Y, T0 + 0.07);
      for (let i = 0; i < 10; i++) { const x = -0.33 + (i % 5) * 0.105, y = Y + (i < 5 ? -0.045 : 0.045); cyl(s, 0.003, 0.003, 0.08, Sm(0x5f8a3a, 0.7), x, y, T0 + 0.09, 6); ball(x + 0.012, y, T0 + 0.17, 0.022, 0x6f9e44); ball(x - 0.012, y, T0 + 0.155, 0.018, 0x5f8a3a); }
      cyl(s, 0.06, 0.055, 0.14, Sm(0x4f86b8, 0.4), 0.3, Y, T0, 16); const sp = box(s, 0.018, 0.13, 0.018, Sm(0x4f86b8, 0.4), 0.3, Y - 0.1, T0 + 0.09); sp.rotation.x = 0.7;
    } else Z.balcXmas = s; }                                                                // В «Новый год» (выбор пользователя 23.10, на календаре 19 декабря): коробка и книги — Poly Haven (ниже, со всеми ассетами), шары — стекло
  const crate = (x, y, z, rz) => { const c = node(g, x, y, z, rz); for (let i = 0; i < 4; i++) { box(c, 0.56, 0.015, 0.07, M.oak, 0, -0.19, i * 0.08); box(c, 0.56, 0.015, 0.07, M.oak, 0, 0.19, i * 0.08); box(c, 0.015, 0.38, 0.07, M.oak, -0.28, 0, i * 0.08); box(c, 0.015, 0.38, 0.07, M.oak, 0.28, 0, i * 0.08); } box(c, 0.56, 0.38, 0.015, M.oak, 0, 0, 0); return c; };
  const c1 = crate(14.35, 4.62, 0, 0.05), c2 = crate(14.33, 4.6, 0.33, -0.08);
  pbox(c2, 'per', 2, -0.12, 0, 0.015, 0.1, true); pbox(c2, 'per', 0, 0.12, 0.02, 0.015, -0.15, true);
  cyl(g, 0.04, 0.04, 0.09, M.steel, 14.6, 5.35, 1.04, 12);                                    // банка на перилах
}
await idle();
// ============ КУХНЯ: холодильник «ЗИЛ» (коробки сверху), газовая плита, мойка, шкафчик со стеклом («Кухонные звери»), полка с банками, стол с клеёнкой, абажур
{
  const g = grp('kit'); seed = 505;
  const f = node(g, 10.86, 0.02, 0, S_); rbox(f, 0.6, 0.6, 1.42, 0.06, M.enamel, 0, -0.3, 0.04); box(f, 0.56, 0.03, 0.04, M.black, 0, -0.3, 0); box(f, 0.58, 0.005, 0.004, Sm(0xb9b5ab, 0.5), 0, -0.603, 1.0, false);   // ЗИЛ
  box(f, 0.05, 0.05, 0.16, M.chrome, 0.2, -0.62, 0.9); box(f, 0.2, 0.01, 0.045, M.chrome, 0, -0.603, 1.28, false);
  box(f, 0.58, 0.22, 0.1, M.oak, 0, -0.2, 1.46);   // «Кухонные звери» — на холодильнике (пользователь 23.10: в шкафчике их закрывали дверцы, коробки сверху убрать): ряд спереди и ряд на ступеньке
  for (const [y, z] of [[-0.46, 1.46], [-0.2, 1.56]]) for (const x of [-0.19, 0, 0.19]) slot(f, x, y, z, 'kuh', { h: 0.1 });
  const u = node(g, 11.85, 0, 0, S_);                                                           // тумба, плита, мойка (локальный x зеркален: −x — к окну)
  const cab = (x, w) => { box(u, w, 0.58, 0.82, M.cream, x, -0.29, 0.04); box(u, w - 0.02, 0.56, 0.04, M.black, x, -0.27, 0); front(u, w - 0.01, 0.62, x, -0.58, 0.1, M.cream); knob(u, x + w / 2 - 0.08, -0.6, 0.62); box(u, w + 0.01, 0.62, 0.035, Sm(0x8f8a80, 0.45), x, -0.31, 0.86); };
  cab(0.33, 0.6);
  const st = node(u, -0.21, 0, 0); box(st, 0.5, 0.56, 0.82, M.enamel, 0, -0.28, 0.04); box(st, 0.5, 0.56, 0.02, M.enamel, 0, -0.28, 0.86);   // плита
  for (const [x, y] of [[-0.12, -0.15], [0.12, -0.15], [-0.12, -0.4], [0.12, -0.4]]) { cyl(st, 0.045, 0.04, 0.018, M.black, x, y, 0.88, 14); box(st, 0.2, 0.012, 0.012, M.black, x, y, 0.9); box(st, 0.012, 0.2, 0.012, M.black, x, y, 0.9); }
  box(st, 0.44, 0.02, 0.36, Sm(0x23262a, 0.15, { envMapIntensity: 2 }), 0, -0.565, 0.24); box(st, 0.3, 0.03, 0.02, M.chrome, 0, -0.59, 0.64); for (let i = 0; i < 5; i++) cyl(st, 0.017, 0.017, 0.02, M.black, -0.18 + i * 0.09, -0.57, 0.72, 12).rotation.x = Math.PI / 2;
  box(st, 0.5, 0.05, 0.06, M.enamel, 0, -0.025, 0.88);
  cab(-0.78, 0.62); const sk = Sm(0xb4b9bd, 0.28);   // мойка — накладная чаша: борта 5 см, дно, слив; матовая (сталь запекалась белой рамкой с чёрной плашкой — «белый квадрат», пользователь 23.10)
  for (const y of [-0.12, -0.48]) box(u, 0.46, 0.04, 0.05, sk, -0.78, y, 0.895); for (const x of [-0.57, -0.99]) box(u, 0.04, 0.32, 0.05, sk, x, -0.3, 0.895);
  box(u, 0.38, 0.32, 0.006, Sm(0x8e9499, 0.4), -0.78, -0.3, 0.895); cyl(u, 0.025, 0.025, 0.004, M.black, -0.78, -0.3, 0.901, 16);   // мойка: стальной борт вровень со столешницей и тёмная чаша (был брусок над столешницей — «плита», 23.10); видно после перезапекания
  cyl(u, 0.012, 0.012, 0.25, sk, -0.78, -0.06, 0.9); box(u, 0.025, 0.16, 0.02, sk, -0.78, -0.14, 1.13);
  M.tile.map.repeat.set(2.05 / 0.6, 0.66 / 0.6); plane(g, 2.05, 0.66, M.tile, 12.17, 0.004, 0.86 + 0.33, Math.PI);   // кафельный фартук (лицом на север)
  const wc = node(g, 11.55, 0, 1.5, S_), WW = 0.8;                                              // шкафчик со стеклянными дверцами — «Кухонные звери»
  box(wc, WW, 0.32, 0.02, M.cream, 0, -0.16, 0); box(wc, WW, 0.32, 0.02, M.cream, 0, -0.16, 0.66); for (const x of [-WW / 2 + 0.01, WW / 2 - 0.01]) box(wc, 0.02, 0.32, 0.68, M.cream, x, -0.16, 0);
  box(wc, WW, 0.01, 0.68, Sm(0xcfc6b0, 0.6), 0, -0.005, 0); box(wc, WW - 0.04, 0.29, 0.015, M.cream, 0, -0.15, 0.33);
  for (const x of [-0.2, 0.2]) { for (const [w, h, dx, dz] of [[0.38, 0.05, 0, 0.01], [0.38, 0.05, 0, 0.62], [0.05, 0.66, -0.165, 0.01], [0.05, 0.66, 0.165, 0.01]]) box(wc, w, 0.02, h, M.cream, x + dx, -0.33, dz); box(wc, 0.29, 0.006, 0.57, M.glass, x, -0.332, 0.055, false).renderOrder = 5; knob(wc, x + (x < 0 ? 0.15 : -0.15), -0.34, 0.12); }   // дверцы перед каркасом вплотную (было на 1 см внутри — чёрный угол, пользователь 23.10)
  const jar = (x, z, r, h, c) => { cyl(wc, r * 0.92, r * 0.92, h * 0.74, Sm(c, 0.45), x, -0.16, z + 0.004, 16); cyl(wc, r, r, h - 0.055, M.jar, x, -0.16, z, 20); cyl(wc, r, r * 0.74, 0.033, M.jar, x, -0.16, z + h - 0.055, 20); cyl(wc, r * 0.78, r * 0.78, 0.022, Sm(0xc9a24a, 0.35), x, -0.16, z + h - 0.022, 16); };   // закрутки: содержимое и крышка запекаются, стекло — живое
  for (const [x, c] of [[-0.09, 0xa8283c], [0.27, 0xe0b040]]) jar(x, 0.345, 0.045, 0.14, c);   // варенье: малина, мёд; огурцы — модели (Z.kitCab, ассеты ниже; пользователь 24.10: «нормальные банки-закрутки с огурцами»)
  Z.kitCab = wc;
  const gl = Sm(0xbfdadd, 0.03, { transparent: true, opacity: 0.13, depthWrite: false, envMapIntensity: 4, side: THREE.DoubleSide }), glR = Sm(0xe6f4f4, 0.03, { transparent: true, opacity: 0.55, depthWrite: false, envMapIntensity: 4 });   // посуда: прозрачное стекло, ободки плотнее — форма читается за дверцей
  const glass = (x, y, z) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.032, 0.105, 16, 1, true), gl); c.material.flatShading = true; c.rotation.x = Math.PI / 2; c.position.set(x, y, z + 0.0525); wc.add(c);   // гранёный стакан: 16 граней, ободок
    cyl(wc, 0.0375, 0.0375, 0.016, gl, x, y, z + 0.089, 16); cyl(wc, 0.038, 0.038, 0.003, glR, x, y, z + 0.102, 16); cyl(wc, 0.032, 0.032, 0.008, glR, x, y, z, 16); };
  const goblet = (x, y, z) => { const P = [[0.001, 0], [0.034, 0], [0.034, 0.004], [0.005, 0.008], [0.004, 0.085], [0.012, 0.095], [0.036, 0.12], [0.041, 0.15], [0.039, 0.18]].map(([r, h]) => new THREE.Vector2(r, h));   // бокал на ножке
    const m = new THREE.Mesh(new THREE.LatheGeometry(P, 24), gl); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); wc.add(m);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.0015, 6, 32), glR); rim.position.set(x, y, z + 0.18); wc.add(rim); cyl(wc, 0.004, 0.004, 0.077, glR, x, y, z + 0.008, 8); cyl(wc, 0.034, 0.034, 0.004, glR, x, y, z, 24); };   // ножка, донце и край — плотнее
  for (const x of [-0.3, -0.19, -0.08]) goblet(x, -0.17, 0.02); for (const [x, y] of [[0.06, -0.12], [0.15, -0.2], [0.24, -0.12], [0.31, -0.2]]) glass(x, y, 0.02);   // низ: бокалы и стаканы (пользователь 24.10: «оставь одну зелёную, розовую и белую, остальные — бокалы и стаканы»)
  for (const [x, y] of [[0.06, -0.14], [0.14, -0.2]]) glass(x, y, 0.345);
  const sh = node(g, 12.62, 0, 1.62, S_); for (const z of [0, 0.36]) { box(sh, 1.05, 0.22, 0.022, M.cream, 0, -0.11, z); for (const x of [-0.5, 0.5]) box(sh, 0.02, 0.05, 0.15, M.cream, x, -0.025, z - 0.15); }   // открытая полка: банки, кувшин
  for (let i = 0; i < 4; i++) { cyl(sh, 0.045, 0.045, 0.13, Sm([0xd8c27a, 0xc84a2c, 0xe9e2d0, 0x6d8a4a][i], 0.5), -0.4 + i * 0.13, -0.11, 0.382, 16); cyl(sh, 0.046, 0.046, 0.03, Sm(0xe9e2d0, 0.4), -0.4 + i * 0.13, -0.11, 0.5, 16); }
  Z.kitShelf = sh;
  const tb = node(g, 12.15, 3.17, 0, N_); box(tb, 1.15, 0.66, 0.035, Sm(0xffffff, 0.35, { map: fabric('#e9e2d0', '#b8473a', 'check') }), 0, -0.33, 0.72); for (const x of [-0.53, 0.53]) for (const y of [-0.04, -0.62]) box(tb, 0.04, 0.04, 0.72, M.oak, x, y, 0);   // стол с клеёнкой
  box(tb, 1.15, 0.006, 0.12, Sm(0xffffff, 0.35, { map: fabric('#e9e2d0', '#b8473a', 'check') }), 0, -0.663, 0.62);
  for (const [x, y] of [[-0.3, -0.85], [0.35, -0.9]]) { const s2 = node(g, 12.15 + x, 3.17 + y, 0, rr(-0.3, 0.3)); box(s2, 0.34, 0.34, 0.03, M.cream, 0, 0, 0.45); for (const [a, b] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) box(s2, 0.035, 0.035, 0.45, M.cream, a, b, 0); }   // табуретки
  const ab = node(g, 12.15, 2.82, 0); cyl(ab, 0.004, 0.004, 0.75, M.black, 0, 0, H - 0.75); cyl(ab, 0.3, 0.08, 0.2, lampShade(0xe0782e, 0.45), 0, 0, H - 0.97, 24, true); cyl(ab, 0.305, 0.305, 0.06, lampShade(0xc8682a, 0.25), 0, 0, H - 1.02, 24, true);   // абажур
  LAMPS.kit = new THREE.Vector3(12.15, 2.82, H - 0.9);
  const cal = node(g, 10.5, 1.0, 1.55, W_); plane(cal, 0.16, 0.24, Sm(0xffffff, 0.8, { map: tex(128, 192, (c, W, Hh) => { c.fillStyle = '#f2ece0'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#b8473a'; c.fillRect(0, 0, W, 40);   // отрывной календарь
    c.fillStyle = '#fff'; c.font = '600 22px "Golos Text"'; c.textAlign = 'center'; c.fillText('ДЕКАБРЬ', W / 2, 28); c.fillStyle = '#2b2b2b'; c.font = '800 92px "Golos Text"'; c.fillText('19', W / 2, 130); c.font = '500 18px "Golos Text"'; c.fillText('ЧЕТВЕРГ', W / 2, 168); }) }), 0, -0.01, 0);
  slot(g, 13.25, 1.15, 0.85, 'free', { rz: E_ + 0.4 });
}
await idle();
// ============ СНАРУЖИ: зимние сумерки — небо, снег во дворе, дома напротив с окнами, голые деревья, фонари, падающий снег
const ZG = -7.6;                                                       // земля: квартира на 3-м этаже
{
  const sky = tex(1024, 512, (c, W, Hh) => { const r = c.createLinearGradient(0, 0, 0, Hh); r.addColorStop(0, '#05080f'); r.addColorStop(0.42, '#16213a'); r.addColorStop(0.5, '#35415a'); r.addColorStop(0.53, '#4a4f5c'); r.addColorStop(1, '#0b0e14');
    c.fillStyle = r; c.fillRect(0, 0, W, Hh); seed = 77; for (let x = 0; x < W;) { const w = rr(12, 40), h = rr(6, 34); c.fillStyle = '#121826'; c.fillRect(x, Hh * 0.5 - h, w, h + 2);   // далёкие дома по горизонту
      for (let i = x + 2; i < x + w - 2; i += 3) for (let j = Hh * 0.5 - h + 2; j < Hh * 0.5 - 1; j += 3) if (rnd() < 0.08) { c.fillStyle = rnd() < 0.8 ? '#e7a85c' : '#9fb4e0'; c.fillRect(i, j, 1.4, 1.4); } x += w + rr(0, 10); } });
  const sk = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false })); sk.renderOrder = -10; scene.add(sk);
  const LAMPP = { east: [[24, -6], [24, 10], [24, 26], [36, 2]], west: [[-16, -2], [-16, 12], [-26, 5]] };
  for (const side of ['east', 'west']) { const g = grp(side), sx = side === 'east' ? 1 : -1, x0 = side === 'east' ? 13.7 : -0.5, X = x => x0 + sx * x;
    const gw = 80, gd = 140, gx = X(gw / 2);
    const ground = tex(1024, 1024, (c, W, Hh) => { c.fillStyle = '#5c6a80'; c.fillRect(0, 0, W, Hh); seed = side.length * 9;   // снег: голубой, протоптанные дорожки, тёплые пятна под фонарями
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${200 + rnd() * 40},${210 + rnd() * 30},255,${rr(0.03, 0.1)})`; c.beginPath(); c.arc(rnd() * W, rnd() * Hh, rr(4, 30), 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(60,66,80,.55)'; c.lineWidth = 14; c.beginPath(); c.moveTo(W * 0.15, 0); c.bezierCurveTo(W * 0.2, Hh * 0.4, W * 0.4, Hh * 0.6, W * 0.35, Hh); c.stroke();
      const px = (wx, wy) => [(sx * (wx - x0)) / gw * W, (sx > 0 ? wy + gd / 2 - 5 : gd / 2 + 5 - wy) / gd * Hh];
      for (const [lx, ly] of LAMPP[side]) { const [u, v] = px(x0 + sx * Math.abs(lx), ly); const r = c.createRadialGradient(u, Hh - v, 0, u, Hh - v, 90); r.addColorStop(0, 'rgba(255,180,100,.85)'); r.addColorStop(0.4, 'rgba(255,170,90,.35)'); r.addColorStop(1, 'rgba(255,170,90,0)'); c.fillStyle = r; c.fillRect(0, 0, W, Hh); } });
    const gm = put(g, new THREE.PlaneGeometry(gw, gd), new THREE.MeshBasicMaterial({ map: ground }), gx, 5, ZG, false); if (sx < 0) gm.rotation.z = Math.PI;
    seed = sx > 0 ? 13 : 17;
    for (const [dist, len, floors, y0] of sx > 0 ? [[30, 70, 5, -25], [62, 90, 9, -40]] : [[22, 60, 5, -20], [55, 80, 9, -30]]) {   // дома напротив: стены и окна
      const hh = floors * 3.2 + 1.5, fw = tex(1024, Math.round(1024 * hh / len * 2), (c, W, Hh) => { c.fillStyle = '#1a2130'; c.fillRect(0, 0, W, Hh); const cols = Math.floor(len / 3.4), fl = floors;
        for (let i = 0; i < cols; i++) for (let j = 0; j < fl; j++) { const x = (i + 0.3) / cols * W, y = Hh - (j * 3.2 + 1.4) / hh * Hh, w = 0.45 / cols * W, h = 1.5 / hh * Hh; const on = rnd() < 0.3;
          c.fillStyle = on ? (rnd() < 0.75 ? `hsl(${30 + rnd() * 12},${70 + rnd() * 20}%,${48 + rnd() * 18}%)` : '#8ea4cf') : '#0c1018'; c.fillRect(x, y - h, w, h);
          if (on) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + w * 0.47, y - h, w * 0.06, h); if (rnd() < 0.5) { c.fillStyle = 'rgba(255,240,220,.25)'; c.fillRect(x, y - h, w * 0.3, h); } } } });
      const bm = new THREE.MeshBasicMaterial({ map: fw }), dark = new THREE.MeshBasicMaterial({ color: 0x141a26 });
      put(g, new THREE.BoxGeometry(12, len, hh), dark, X(dist + 6), y0 + len / 2, ZG + hh / 2, false); plane(g, len, hh, bm, X(dist - 0.02), y0 + len / 2, ZG + hh / 2, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
      box(g, 12.4, len + 0.4, 0.35, M.snow, X(dist + 6), y0 + len / 2, ZG + hh, false); }
    const tree = tex(512, 512, (c, W, Hh) => { c.strokeStyle = '#0b0e14'; c.lineCap = 'round'; seed = rnd() * 1e6;   // голое дерево: ветки рекурсией
      const br = (x, y, a, l, w, d) => { if (d > 7 || l < 4) return; const x1 = x + Math.cos(a) * l, y1 = y - Math.sin(a) * l; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.stroke();
        const n = d < 2 ? 2 : 2 + (rnd() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) br(x1, y1, a + rr(-0.75, 0.75), l * rr(0.62, 0.8), w * 0.68, d + 1); };
      br(W / 2, Hh, Math.PI / 2 + rr(-0.06, 0.06), Hh * 0.24, 12, 0); });
    const tm = new THREE.MeshBasicMaterial({ map: tree, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, color: 0x9aa4b8 });
    for (let i = 0; i < 9; i++) { const t = plane(g, 9, 9, tm, X(rr(6, sx > 0 ? 26 : 18)), rr(-12, 22), ZG + 4.5, sx * Math.PI / 2 + rr(-0.4, 0.4)); t.scale.setScalar(rr(0.8, 1.25)); t.position.z = ZG + 4.5 * t.scale.x; }
    const halo = new THREE.SpriteMaterial({ map: tex(128, 128, (c, W) => { const r = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, 'rgba(255,214,150,1)'); r.addColorStop(0.2, 'rgba(255,170,90,.55)'); r.addColorStop(1, 'rgba(255,150,80,0)'); c.fillStyle = r; c.fillRect(0, 0, W, W); }), blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (const [lx, ly] of LAMPP[side]) { const x = x0 + sx * Math.abs(lx); cyl(g, 0.09, 0.07, 7.2, M.metalDark, x, ly, ZG, 8); box(g, 0.7, 0.2, 0.12, M.metalDark, x - sx * 0.3, ly, ZG + 7.15); const s = new THREE.Sprite(halo); s.position.set(x - sx * 0.55, ly, ZG + 7.0); s.scale.setScalar(3.2); g.add(s); }
  }
}
await idle();
function snowfall(x0, x1, y0, y1, z0, z1, n, col = 0xe6eeff, size = 34) {   // падающий снег: точки, движение — в шейдере
  const P = new Float32Array(n * 3), S = new Float32Array(n); seed = n; for (let i = 0; i < n; i++) { P.set([rr(x0, x1), rr(y0, y1), rr(z0, z1)], i * 3); S[i] = rr(0.5, 1.4); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('s', new THREE.BufferAttribute(S, 1));
  const mat = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, z0: { value: z0 }, hz: { value: z1 - z0 }, size: { value: size * renderer.getPixelRatio() }, col: { value: new THREE.Color(col) } }, transparent: true, depthWrite: false,
    vertexShader: 'attribute float s; uniform float t, z0, hz, size; varying float a; void main() { vec3 p = position; p.z = z0 + mod(p.z - z0 - t * (0.45 + 0.35 * s), hz); p.x += sin(t * 0.6 + position.y * 1.7) * 0.3; p.y += cos(t * 0.45 + position.x * 1.3) * 0.25; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = size * s / -mv.z; a = clamp(1.4 - (-mv.z) / 28.0, 0.2, 1.0); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 col; varying float a; void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(col, (1.0 - d * 2.0) * a * 0.9); }' });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; return pts;
}
const SNOW = [snowfall(13.75, 34, -10, 22, ZG, 8, LOW ? 700 : 1600), snowfall(-22, -0.55, -10, 14, ZG, 8, LOW ? 500 : 1100)];
grp('east').add(SNOW[0]); grp('west').add(SNOW[1]);
// --- Сборка статики: по комнате всё с одним материалом — в один меш (вызовов отрисовки в разы меньше)
function bake(g) {
  g.updateMatrixWorld(true); const by = new Map(), kill = [];
  g.traverse(o => { if (!o.isMesh || !o.visible || o.userData.dyn || Array.isArray(o.material)) return; const k = o.material.uuid + o.castShadow; if (!by.has(k)) by.set(k, []); by.get(k).push(o); });
  for (const list of by.values()) { if (list.length < 2) continue;
    const geos = list.map(o => { const ge = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const k of Object.keys(ge.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ge.deleteAttribute(k);
      if (!ge.attributes.uv) ge.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(ge.attributes.position.count * 2), 2)); ge.applyMatrix4(o.matrixWorld); ge.clearGroups(); return ge; });
    const m = new THREE.Mesh(mergeGeometries(geos, false), list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = true; m.renderOrder = Math.max(...list.map(o => o.renderOrder)); g.add(m); kill.push(...list); }
  for (const o of kill) o.removeFromParent();
}
function trim(g) {                                                    // нахлёсты → встык: коробка, вошедшая концом в соседнюю (стойка в перекладину, плинтус в плинтус в углу), обрезается по её грани; перекрытое запекалось чёрными уголками (пользователь 23.10: «нахлёсты везде»). Проверка — devtools/overlap.js
  g.updateMatrixWorld(true); const X = ['x', 'y', 'z'], E = 0.0015, L = [];
  g.traverse(o => { if (!o.isMesh || o.geometry.type !== 'BoxGeometry' || o.userData.dyn || o.material?.transparent) return; const e = o.matrixWorld.elements; if ([e[0], e[1], e[4], e[5]].some(v => Math.abs(v) > 1e-4 && Math.abs(Math.abs(v) - 1) > 1e-3)) return;
    o.geometry.computeBoundingBox(); L.push({ o, b: o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld) }); });
  const cut = (P, Q) => { let best = null; for (const k of X) { if (X.some(j => j !== k && (P.b.min[j] < Q.b.min[j] - E || P.b.max[j] > Q.b.max[j] + E))) continue;   // сечение P поперёк k — внутри Q
      const lo = Q.b.min[k] <= P.b.min[k] + E && Q.b.max[k] < P.b.max[k] - 0.001, hi = Q.b.max[k] >= P.b.max[k] - E && Q.b.min[k] > P.b.min[k] + 0.001, v = lo ? Q.b.max[k] - P.b.min[k] : hi ? P.b.max[k] - Q.b.min[k] : 0;   // Q закрывает один конец P
      if (v > E && (!best || v < best.v)) best = { P, k, lo, at: lo ? Q.b.max[k] : Q.b.min[k], v }; } return best; };
  for (let i = 0; i < L.length; i++) for (let j = 0; j < L.length; j++) { if (i === j) continue; const p = L[i], q = L[j];
    if (X.some(k => Math.min(p.b.max[k], q.b.max[k]) - Math.max(p.b.min[k], q.b.min[k]) < E)) continue;
    const c = [cut(p, q), cut(q, p)].filter(Boolean).sort((a, b) => a.v - b.v)[0]; if (!c) continue;
    const { o, b } = c.P, ge = o.geometry.clone(), pos = ge.attributes.position, M_ = o.matrixWorld, Mi = M_.clone().invert(), v = new THREE.Vector3();
    for (let n = 0; n < pos.count; n++) { v.fromBufferAttribute(pos, n).applyMatrix4(M_); v[c.k] = c.lo ? Math.max(v[c.k], c.at) : Math.min(v[c.k], c.at); v.applyMatrix4(Mi); pos.setXYZ(n, v.x, v.y, v.z); }
    o.geometry.dispose(); o.geometry = ge; b[c.lo ? 'min' : 'max'][c.k] = c.at; }
}
for (const g of Object.values(R)) { trim(g); bake(g); }

// --- Ассеты по местам (параллельно)
const ON = (P, nm) => P.getObjectByName(nm);
const hang = async (g, name, o) => { const P = await asset(g, name, o); const b = P.userData.box; P.position.z = H - (b.max.z - b.min.z) - (o.drop ?? 0); return P; };   // люстра: верх — к потолку
const [, , tvP, , , , , , clockP] = await Promise.all([
  asset(grp('zal'), 'sofa_03', { w: 2.0, x: 2.25, y: 3.41, back: true }),
  hang(grp('zal'), 'Chandelier_02', { w: 0.78, x: 3.17, y: 1.72, drop: 0.05 }),
  asset(Z.t, 'Television_01', { w: 0.52, y: 0.02, z: 0.58 }),
  asset(grp('zal'), 'GreenChair_01', { w: 0.64, x: 1.6, y: 1.5, rz: -2.5 }),
  asset(Z.v, 'carved_wooden_elephant', { w: 0.15, x: -0.4, y: -0.16, z: 1.615, rz: 0.2 }), asset(Z.v, 'carved_wooden_elephant', { w: 0.1, x: -0.22, y: -0.16, z: 1.615, rz: 0.2 }),
  asset(Z.v, 'horse_statue_01', { h: 0.22, x: 0.05, y: -0.15, z: 1.615, rz: -0.3 }),
  asset(grp('zal'), 'fancy_picture_frame_01', { w: 0.82, x: 4.55, y: 3.42, z: 1.82, back: true }),
  asset(grp('hall'), 'vintage_grandfather_clock_01', { h: 2.05, x: 6.93, y: 4.15, rz: W_, back: true }),
  hang(grp('hall'), 'modern_ceiling_lamp_01', { h: 0.62, x: LAMPS.corr.x, y: LAMPS.corr.y }), hang(grp('hall'), 'modern_ceiling_lamp_01', { h: 0.5, x: LAMPS.entry.x, y: LAMPS.entry.y }),
  asset(grp('hall'), 'ornate_mirror_01', { h: 0.78, x: 6.97, y: 11.17, z: 1.05, rz: W_, back: true }),
  asset(grp('cab'), 'vintage_day_bed', { w: 1.85, x: 10.85, y: 7.34, back: true }),
  asset(grp('cab'), 'painted_wooden_chair_01', { h: 0.92, x: 12.12, y: 5.95, rz: W_ }),
  asset(grp('cab'), 'ArmChair_01', { w: 0.72, x: 12.55, y: 6.92, rz: -Math.PI / 4 - 0.2 }),
  hang(grp('cab'), 'modern_ceiling_lamp_01', { h: 0.62, x: LAMPS.cabCeil.x, y: LAMPS.cabCeil.y }),
  ...(Z.balcXmas ? [asset(Z.balcXmas, 'cardboard_box_01', { w: 0.3, x: -0.17, y: -0.17, z: 1.27, rz: 0.06 }).then(P => { const B = P.userData.box, d = B.max.y - B.min.y, h = B.max.z - B.min.z;   // «Ёлочные игрушки»: настоящая коробка, бумажная наклейка, шары у коробки и на крышке
      plane(P, 0.2, 0.07, Sm(0xffffff, 0.8, { map: tex(320, 112, (c, W, Hh) => { c.fillStyle = '#efe6cf'; c.fillRect(0, 0, W, Hh); c.strokeStyle = '#b8473a'; c.lineWidth = 6; c.strokeRect(8, 8, W - 16, Hh - 16); c.fillStyle = '#b8473a'; c.font = '700 34px "Golos Text"'; c.textAlign = 'center'; c.fillText('ЁЛОЧНЫЕ', W / 2, 50); c.fillText('ИГРУШКИ', W / 2, 90); }) }), 0, -d / 2 - 0.003, h * 0.55);
      const ball = (x, y, z, r, c) => { const m = new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.85, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }), gold = new THREE.MeshStandardMaterial({ color: 0xd9b44a, metalness: 1, roughness: 0.3 });
        for (const o of [put(P, new THREE.SphereGeometry(r, 32, 20), m, x, y, z + r), put(P, new THREE.CylinderGeometry(r * 0.26, r * 0.26, r * 0.32, 16).rotateX(Math.PI / 2), gold, x, y, z + 2 * r + r * 0.08), put(P, new THREE.TorusGeometry(r * 0.17, r * 0.04, 8, 16), gold, x, y, z + 2 * r + r * 0.32)]) o.userData.dyn = true; };   // стекло с отражениями — живой свет, не запекается
      ball(0.02, -0.02, h, 0.034, 0xb82a35); ball(0.19, -0.1, 0, 0.032, 0x2f5fb0); ball(0.24, 0.02, 0, 0.028, 0xd9a52a); ball(-0.2, -0.09, 0, 0.03, 0x2f8a55); }),
    asset(Z.balcXmas, 'book_encyclopedia_set_01', { w: 0.3, x: 0.27, y: -0.17, z: 1.27, rz: -0.05 })] : []),
  asset(Z.desk, 'standing_picture_frame_01', { h: 0.17, x: -0.2, y: -0.1, z: 0.757, rz: 0.25 }),
  asset(Z.kitShelf, 'cassette_player', { w: 0.32, x: 0.25, y: -0.12, z: 0.382, rz: 0.1 }),
  asset(Z.kitCab, 'jar_pickles_1l', { h: 0.17, x: -0.27, y: -0.16, z: 0.345, rz: 0.8, glb: true }),   // закрутка с огурцами — TRELLIS по картинке KIE (toys_concepts/jar_pickles_1l_v1.png); трёхлитровые сняты (пользователь 24.10: «стрёмные»)
  asset(Z.kitShelf, 'russian_food_cans_01', { w: 0.34, x: 0.15, y: -0.11, z: 0.022 }), asset(Z.kitShelf, 'jug_01', { h: 0.2, x: -0.3, y: -0.11, z: 0.022, rz: 0.4 }),
  asset(grp('kit'), 'vintage_electric_kettle', { h: 0.24, x: 11.94, y: 0.38, z: 0.9, rz: 2.6 }), asset(grp('kit'), 'pot_enamel_01', { w: 0.27, x: 12.18, y: 0.15, z: 0.9 }),
  asset(grp('kit'), 'potted_plant_04', { h: 0.3, x: 13.27, y: 1.7, z: 0.85 }),
  asset(grp('zal'), 'potted_plant_04', { h: 0.3, x: 0.0, y: 0.6, z: 0.85 }), asset(grp('zal'), 'potted_plant_04', { h: 0.26, x: 0.0, y: 2.35, z: 0.85 }),

]);
const tvTop = tvP.userData.box.max.z - tvP.userData.box.min.z + 0.58;
flat(Z.t, 0.34, 0.34, Sm(0xffffff, 0.9, { map: lace(256, 256, true, 31), transparent: true, alphaTest: 0.3 }), 0, -0.01, tvTop + 0.002); const tvSlot = slot(Z.t, 0, -0.02, tvTop + 0.004, 'free');
const tvScr = tex(96, 72, () => {}), tvCtx = tvScr.image.getContext('2d');                        // мерцание кинескопа: свой холст поверх экрана
const tvb = tvP.userData.box, tw = tvb.max.x - tvb.min.x, td = tvb.max.y - tvb.min.y, th = tvb.max.z - tvb.min.z;
const scr = plane(Z.t, tw * 0.58, th * 0.62, new THREE.MeshBasicMaterial({ map: tvScr, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), -tw * 0.12, 0.02 - td / 2 - 0.004, 0.58 + th * 0.52);
scr.userData.dyn = true;
const HANDS = clockP && [ON(clockP, 'vintage_grandfather_clock_01_HourHand'), ON(clockP, 'vintage_grandfather_clock_01_MinuteHand')];

// --- Запекание света (Blender Cycles на ПК, devtools/bake_apt.py): что запекается — неподвижное и непрозрачное в комнатах; имена материалов — устойчивые (по ним запечённая геометрия находит свой материал)
const ROOMS_B = ['zal', 'hall', 'cab', 'kit', 'balc'];
const vis = o => { for (let n = o; n && n.parent && n.parent !== scene; n = n.parent) if (!n.visible) return false; return true; };   // скрытие самой комнаты (show) не в счёт
const badIdx = g => { const ix = g.index, n = g.attributes.position.count; if (!ix) return false; for (let k = 0; k < ix.count; k++) if (ix.getX(k) >= n) return true; return false; };   // стрелки часов Poly Haven: индексы за вершинами — Blender не импортирует комнату
const isStatic = o => o.isMesh && vis(o) && !o.userData.dyn && !o.userData.slot && [o.material].flat().every(m => m.isMeshStandardMaterial && !m.transparent) && !badIdx(o.geometry);
const bakeSet = room => { const L = []; R[room].traverse(o => { if (isStatic(o)) L.push(o); }); return L; };
const MATS = new Map();
function nameMats() { let n = 0; MATS.clear();   // процедурные — по порядку сборки (он не зависит от сети), ассеты — по имени ассета и материала
  for (const r of ROOMS_B) for (const o of bakeSet(r)) { let a = o; while (a && a !== scene && !a.userData.asset) a = a.parent;
    for (const m of [o.material].flat()) { if (!m.userData.bk) m.userData.bk = a?.userData?.asset ? `a:${a.userData.asset}:${m.name || 'm'}` : 'p' + n++; m.name = m.userData.bk; MATS.set(m.name, m); } } }

// --- Фигурки по местам; пустые места серии — силуэт «?»
const FIGS = [];
const cardMat = {}; const qMat = k => cardMat[k] ??= new THREE.MeshBasicMaterial({ map: tex(160, 200, (c, W, Hh) => { const I = silOf(k), s = Math.min(W * 0.8 / I.width, Hh * 0.78 / I.height);
  c.globalAlpha = 0.5; c.drawImage(tint(I, '#7f93b8'), W / 2 - I.width * s / 2, Hh * 0.96 - I.height * s, I.width * s, I.height * s); c.globalAlpha = 0.85; c.fillStyle = '#e8eefc'; c.font = `600 ${Hh * 0.3}px "Golos Text"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', W / 2, Hh * 0.55); }),
  transparent: true, depthWrite: false, opacity: 0.55 });
function card(s, on) { if (s.q) { s.q.visible = on; return; } if (!on || !SER[s.ser]?.bs && s.ser !== 'rare') return; const L = SER[s.ser]?.figs ?? FK, k = L[s.id % L.length], m = put(R[s.room], new THREE.PlaneGeometry(s.h * 0.75, s.h).rotateX(Math.PI / 2), qMat(k), s.pos.x, s.pos.y, s.pos.z + s.h / 2, false); m.rotation.z = s.rz; m.userData.dyn = true; s.q = m; }
function setFig(s, k, src = null) { if (s.mesh) { if (s.mesh.userData.glow) s.mesh.material.dispose(); s.mesh.removeFromParent(); FIGS.splice(FIGS.indexOf(s.mesh), 1); s.mesh = null; } s.fig = k; s.src = k ? src : null; card(s, !k);   // src — id автомата, где выбита (для сохранения)
  if (!k) return null; const m = new THREE.Mesh(FIG[k].geo, FIG[k].mat); m.scale.setScalar(s.h); m.position.copy(s.pos); m.rotation.z = s.rz + ((s.id * 0.37) % 0.5 - 0.25); m.castShadow = true; m.receiveShadow = true; m.userData.slot = s; R[s.room].add(m); s.mesh = m; FIGS.push(m); const G = m.userData.glow = addGlow(m, k, undefined, { light: false }); G?.set(glowOn(k)); return m; }   // лампочка горит и на полке, пока не погасили в руке
const START = { ...Object.fromEntries(SERK.slice(0, 4).map(k => [k, SER[k].figs.slice(0, 2)])), rare: SERIES.map(x => x.secret).filter(Boolean).slice(0, 1) }, FREE = SERIES.map(x => x.figs[2]);   // стенд без сохранений: по две первых каждой серии
// --- Сохранения (window.Save сборки, boxiki-a3: { won: { 'H1-0': {…} }, shelf: { <место>: 'H1-0' } }): место — «серия-номер в серии» (новая полка другой серии их не сдвигает); без Save (стенд) — демо
{ const n = {}; for (const s of SLOTS) s.key = `${s.ser}-${n[s.ser] = (n[s.ser] ?? -1) + 1}`; }
const SAVE = parent !== window ? parent.Save : null, shelfOf = mid => { const s = SF[HS.figOf(mid)]?.s; return s === SJ.GACHA ? 'pot' : SERK[(s?.hall ?? 1) - 1] ?? 'free'; };   // полка — серии фигурки (звери с Hn-1/7 — на кухонную)   // зал → серия полки (GAME_BUILD §2)
glowStore(SAVE);   // свет фигурок (горит/погашен) — в сохранении игры, оно уходит в облако
const got = (won = {}) => [...Object.entries(won).flatMap(([mid, w]) => w.items ?? [mid]), ...SAVE?.get?.().gacha ?? []];   // + гача «Потеряшки» ('G~<фигурка>~<k>', ui.js spin)   // выбитые фигурки: у секретного автомата — каждая своя ('H1-8~<фигурка>~<k>', ui.js), у остальных — сам автомат
const freeOf = ser => SLOTS.find(s => s.ser === ser && !s.fig) ?? SLOTS.find(s => s.ser === 'free' && !s.fig);
const persist = () => SAVE?.set?.({ shelf: Object.fromEntries(SLOTS.filter(s => s.src).map(s => [s.key, s.src])) });
await Promise.all([...new Set(SAVE ? [...got(SAVE.get?.().won), ...Object.values(SAVE.get?.().shelf ?? {})].map(HS.figOf) : [...Object.values(START).flat(), ...FREE])].map(figLoad));   // только те, что встанут на полки
if (SAVE) { const { won = {}, shelf = {} } = SAVE.get?.() ?? {}, put = (s, mid) => s && setFig(s, HS.figOf(mid), mid);
  for (const [key, mid] of Object.entries(shelf)) put(SLOTS.find(s => s.key === key && !s.fig) ?? freeOf(shelfOf(mid)), mid);   // места нет (квартиру перестроили) — первое свободное своей серии
  const placed = new Set(Object.values(shelf)), box = new Set(SAVE.get?.().boxes ?? []); for (const mid of got(won)) if (!placed.has(mid) && !box.has(mid)) put(freeOf(shelfOf(mid)), mid);   // неоткрытые — на столе, не на полке   // выбита, но не поставлена — на полку своей серии
  if (got(won).some(mid => !placed.has(mid) && !box.has(mid))) persist(); }
else { for (const [ser, ks] of Object.entries(START)) SLOTS.filter(s => s.ser === ser).forEach((s, i) => setFig(s, ks[i] ?? null));
[[tvSlot, FREE[0]], ...SLOTS.filter(s => s.ser === 'free').map((s, i) => [s, [null, FREE[1], null, FREE[2], null, FREE[3], null, FREE[0], FREE[1], null, FREE[2]][i % 11]])].forEach(([s, k]) => k && !s.fig && setFig(s, k)); }
for (const s of SLOTS) if (!s.fig) card(s, true);   // пустые места серий — силуэт «?» (и в игре: раньше ставились только на стенде)
// --- Пылинки в тёплом свете люстры и настольной лампы
function dust(cx, cy, r, z0, z1, n) { const P = new Float32Array(n * 3), S = new Float32Array(n); seed = n + 3;
  for (let i = 0; i < n; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r; P.set([cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr(z0, z1)], i * 3); S[i] = rr(0.4, 1.2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('s', new THREE.BufferAttribute(S, 1));
  const mat = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, c: { value: new THREE.Vector3(cx, cy, r) }, size: { value: 9 * renderer.getPixelRatio() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float s; uniform float t, size; uniform vec3 c; varying float a; void main() { vec3 p = position; p.x += sin(t * 0.13 * s + position.z * 3.0) * 0.12; p.y += cos(t * 0.11 + position.x * 2.0) * 0.12; p.z += sin(t * 0.07 * s + position.y) * 0.15; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = size * s / -mv.z; a = (1.0 - clamp(length(p.xy - c.xy) / c.z, 0.0, 1.0)) * (0.55 + 0.45 * sin(t * 1.3 * s + position.x * 9.0)); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying float a; void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(1.0, 0.86, 0.62, (1.0 - d * 2.0) * a * 0.55); }' });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; return p; }
const DUST = [dust(3.17, 1.72, 1.1, 0.4, 2.5, LOW ? 160 : 320), dust(12.55, 5.9, 0.45, 0.78, 1.4, LOW ? 50 : 90)]; grp('zal').add(DUST[0]); grp('cab').add(DUST[1]);

// --- Свет: пул (4 точечных + прожектор с тенью + холодный «из окна» + небо), настраивается по комнате и плавно меняется в перелёте
const hemi = new THREE.HemisphereLight(0x5d7096, 0x140f0b, 0.28); scene.add(hemi);
const PL = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffb36b, 0, 6, 2); scene.add(l); return l; });
const key = new THREE.SpotLight(0xffbd80, 0, 12, 1.1, 0.8, 2); key.castShadow = true; key.shadow.mapSize.setScalar(LOW ? 512 : 1024); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; key.shadow.camera.near = 0.08; scene.add(key, key.target);
const cold = new THREE.SpotLight(0x7f9ad0, 0, 14, 0.85, 1, 1.2); scene.add(cold, cold.target);
const V3 = v => v.isVector3 ? v.clone() : new THREE.Vector3(...v), lt = (p, c, i, d, f) => ({ p: V3(p), c: new THREE.Color(c), i, d, f }), OFF = lt([0, 0, 0], 0, 0, 1);
const lc = (k, pts, cl) => ({ key: { p: V3(k[0]), t: V3(k[1]), c: new THREE.Color(k[2]), i: k[3], a: k[4] }, pts: [...pts, OFF, OFF, OFF, OFF].slice(0, 4), cold: { p: V3(cl[0]), t: V3(cl[1]), i: cl[2] } });
const LC = {
  zal: lc([[3.17, 1.72, 2.45], [3.0, 1.4, 0], 0xffb468, 30, 1.25], [lt([3.17, 1.72, 2.3], 0xffad62, 5, 7), lt(LAMPS.torsher, 0xff9a48, 3.5, 4.5), lt([0.95, 2.5, 0.9], 0x7f9fff, 0.8, 3.2, 'tv'), lt(LAMPS.stenka, 0xffc67e, 0.6, 1.4)], [[-2.6, 1.7, 3.0], [2.5, 1.7, 0.3], 8]),
  hall: lc([[7.8, 6.3, 2.55], [7.8, 6.2, 0], 0xffb26a, 22, 1.3], [lt([7.8, 10.7, 2.5], 0xffb06a, 4, 5), lt([7.8, 2.25, 0.3], 0xffc080, 0.8, 2), lt([6.6, 2.65, 1.6], 0xffb060, 1.2, 3), lt([7.8, 6.3, 2.45], 0xffb06a, 3, 6, 'lamp')], [[7.8, 3, 3], [7.8, 3, 0], 0]),
  cab: lc([LAMPS.desk, LAMPS.deskT, 0xffd59a, 7, 0.95], [lt([11.0, 5.6, 2.5], 0xffb36b, 2.5, 6), lt(LAMPS.desk, 0xffcf90, 0.8, 2.5), lt([10.3, 4.5, 1.9], 0xffc07a, 0.6, 2)], [[15.5, 6.0, 3.0], [11.0, 5.8, 0.4], 9]),
  balc: lc([[12.5, 6.05, 2.1], [14.3, 6.6, 0.4], 0xffc080, 10, 0.75], [lt([13.95, 4.75, 1.8], 0xffb070, 0.6, 2.5), lt([14.5, 6.0, 2.8], 0x8098d0, 0.8, 4)], [[20, 2, 6], [14.3, 6, 0], 6]),
  kit: lc([[12.15, 2.82, 2.2], [12.15, 2.7, 0], 0xffa95c, 18, 1.15], [lt([12.15, 2.82, 2.3], 0xffa060, 3, 5), lt([11.8, 0.6, 2.0], 0xffc08a, 0.6, 2.5)], [[15.5, 1.45, 3.0], [11.5, 1.5, 0.4], 8]),
};
let TVF = 1; const flick = (f, T) => f === 'tv' ? TVF : f === 'lamp' ? 1 - 0.04 * Math.max(0, Math.sin(T * 17) * Math.sin(T * 5.3)) : 1;
// Варианты света на выбор (?light=a|b|c; пользователь 22.10: «много света»): a — как в «Размена не будет»: темно, пятна от ламп, b — вечер, c — как было
const LV3 = { a: { exp: 0.85, hemi: 0.06, env: 0.012, key: 0.5, ang: 0.62, pts: 0.55, dist: 0.7, cold: 0.3 }, b: { exp: 0.9, hemi: 0.11, env: 0.025, key: 0.7, ang: 0.8, pts: 0.75, dist: 0.85, cold: 0.6 },
  c: { exp: 1, hemi: 0.28, env: 0.05, key: 1, ang: 1, pts: 1, dist: 1, cold: 1 } }, LVx = LV3[Q.get('light')] ?? LV3.a;
renderer.toneMappingExposure = LVx.exp; hemi.intensity = LVx.hemi; scene.environmentIntensity = LVx.env;
const LS = { A: LC.hall, B: LC.hall, t: 0 };
function lights(T) { const { A, B, t } = LS, L = (a, b) => a + (b - a) * t, V = LVx;
  for (let i = 0; i < 4; i++) { const a = A.pts[i], b = B.pts[i], l = PL[i]; l.position.lerpVectors(a.p, b.p, t); l.color.copy(a.c).lerp(b.c, t); l.intensity = V.pts * L(a.i * flick(a.f, T), b.i * flick(b.f, T)); l.distance = V.dist * L(a.d, b.d); }
  key.position.lerpVectors(A.key.p, B.key.p, t); key.target.position.lerpVectors(A.key.t, B.key.t, t); key.color.copy(A.key.c).lerp(B.key.c, t); key.intensity = V.key * L(A.key.i, B.key.i); key.angle = V.ang * L(A.key.a, B.key.a);
  cold.position.lerpVectors(A.cold.p, B.cold.p, t); cold.target.position.lerpVectors(A.cold.t, B.cold.t, t); cold.intensity = V.cold * L(A.cold.i, B.cold.i); }

// --- Запечённый свет (по умолчанию, выбор пользователя 22.10 — вариант 2; ?bake=0 — живой свет «a», для выгрузки devtools/export_apt.mjs; devtools/bake_apt.py, HANDOFF_STYLE_TOYS §0000000 §3 D): неподвижное — MeshBasic «своя текстура × свет» (lightMap на UV1); живые лампы светят фигуркам, «в руке» и прозрачному
const BAKED = Q.get('bake') !== '0';
const BKG = { zal: 0.9, hall: 0.55, cab: 0.75, kit: 0.45, balc: 0.25 };   // яркость по комнатам под свет «a» (средняя по остановкам, снимки 22.10): в запечённом горят все лампы комнаты и обеих остановок сразу
if (BAKED) { const dir = 'bake/', man = await (await fetch(dir + 'bake.json')).json(), bk = +(Q.get('bk') ?? 1);   // bk — общий множитель для сверки
  await Promise.all(Object.entries(man.rooms).map(async ([r, { img, S }]) => { const [gl, bm] = await Promise.all([GL.loadAsync(dir + r + '.glb'), loadImg(dir + img)]);   // через очередь fetch: <img> мимо неё рвёт локальный сервер
    const lm = new THREE.Texture(bm); lm.flipY = false; lm.colorSpace = THREE.SRGBColorSpace; lm.channel = 1; lm.needsUpdate = true;
    for (const o of bakeSet(r)) o.layers.set(31);   // ponytail: процедурное и ассеты строятся и прячутся (слой, не visible — вложенное прозрачное остаётся); грузить без них — когда запечённое станет по умолчанию
    gl.scene.traverse(o => { if (!o.isMesh) return; const m = o.material; if (m.emissive?.getHex()) return;   // абажуры светятся сами — остаются Standard
      o.material = new THREE.MeshBasicMaterial({ map: m.map, color: m.color, side: m.side, lightMap: lm, lightMapIntensity: Math.PI * S * BKG[r] * bk }); });   // в карте E/π / S, lightMap three ещё делит на π
    R[r].add(gl.scene); }));
  key.castShadow = false; }   // тени уже в карте, MeshBasic их не принимает

// --- Остановки — стеллажи с коллекцией по ходу квартиры: прихожая → коридор → кабинет → стол → балкон → кухня → зал (пользователь 22.10: «между стеллажами просто и ходили», «сразу видно, куда перейти»)
const LOCS = [
  { id: 'entry', name: T.loc.entry, room: 'hall', ser: 'pot', find: o => o.s?.ser === 'pot' },
  { id: 'frames', name: T.loc.frames, room: 'hall', find: o => o.s?.ser === 'free' && o.n.x > 0.9, sub: T.free },
  { id: 'shelves', name: T.loc.shelves, room: 'cab', ser: 'mel', find: o => o.s?.ser === 'mel' },
  { id: 'desk', name: T.loc.desk, room: 'cab', find: o => o.s?.ser === 'desk', sub: T.deskSub },
  { id: 'balc', name: T.loc.balc, room: 'balc', ser: 'per', find: o => o.s?.ser === 'per' },
  { id: 'kit', name: T.loc.kit, room: 'kit', ser: 'kuh', k: 2.4, dx: -0.45, find: o => o.s?.ser === 'kuh' },   // k — шире: звери на холодильнике, а в кадре и шкафчик, и полка со сгущёнкой (пользователь 24.10: «раньше было видно»)
  { id: 'stenka', name: T.loc.stenka, room: 'zal', ser: 'nich', find: o => o.s?.ser === 'nich' },
  { id: 'gorka', name: T.loc.gorka, room: 'zal', ser: 'rare', find: o => o.s?.ser === 'rare' },
];
const DOOR = { zal: [[5.75, 2.64], [7.45, 2.64]], kit: [[10.95, 2.6], [9.95, 2.7], [7.9, 2.85]], cab: [[9.4, 6.62], [7.8, 6.62]], balc: [[14.0, 4.75], [12.55, 4.75]] };
const PARENT = { zal: 'hall', kit: 'hall', cab: 'hall', balc: 'cab' };
const SHOW = { hall: ['hall', 'zal', 'kit', 'cab'], zal: ['zal', 'hall'], kit: ['kit', 'hall'], cab: ['cab', 'hall', 'balc'], balc: ['balc', 'cab'] };
const up = r => { const l = [r]; while (PARENT[l.at(-1)]) l.push(PARENT[l.at(-1)]); return l; };
function route(a, b) { const A = up(a), B = up(b), lca = A.find(r => B.includes(r)), pts = [], rooms = new Set([...A.slice(0, A.indexOf(lca) + 1), ...B.slice(0, B.indexOf(lca) + 1)]);
  for (const r of A.slice(0, A.indexOf(lca))) pts.push(...DOOR[r]); for (const r of B.slice(0, B.indexOf(lca)).reverse()) pts.push(...[...DOOR[r]].reverse()); return { pts, rooms }; }
function show(names) { const s = new Set(names); for (const [n, g] of Object.entries(R)) g.visible = n === 'east' ? ['cab', 'kit', 'balc'].some(r => s.has(r)) : n === 'west' ? s.has('zal') : s.has(n); }
const portrait = () => innerWidth / innerHeight < 0.8;
const view = L => { const w = camera.aspect > 1, F = frameOf(L.st, w ? L.k ?? 1.6 : 1.6); if (w && L.dx) { const t = new THREE.Vector3(-F.n.y, F.n.x, 0).multiplyScalar(L.dx); F.p.add(t); F.t.add(t); } return [F.p, F.t]; };   // остановка: стеллаж целиком и немного комнаты вокруг; L.k — шире, L.dx — сдвиг вбок, м (только ПК: в портрете и так узко)
function fov() { camera.fov = portrait() ? 70 : 52; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
let cur = Math.max(0, LOCS.findIndex(l => l.id === Q.get('loc'))), fl = null, busy = false, focus = null; const curT = new THREE.Vector3();   // focus — крупный план мебели (кадр из frameOf)
// --- Крупный план: места → группы по мебели (одна комната, одна сторона, ближе 0,65 м), кадр — вся группа в экран, камера не дальше стены за спиной
const POLY = { ...ROOMS, balc: [[13.7, 4.28], [14.77, 4.28], [14.77, 7.12], [13.7, 7.12]] };
function clusters(all) { const G = [];
  for (const o of FOC.filter(o => (all || R[o.room]?.visible) && (!o.m || o.m.visible))) { const near = G.filter(g => g.room === o.room && g.n.dot(o.n) > 0.7 && g.it.some(q => q.p.distanceTo(o.p) < 0.65));
    const g = near[0] ?? G[G.push({ room: o.room, n: o.n, it: [] }) - 1]; g.it.push(o); for (const q of near.slice(1)) { g.it.push(...q.it); G.splice(G.indexOf(q), 1); } }
  return G; }
function depth(room, c, n) { const P = POLY[room]; let best = 6; if (!P) return best;   // от центра мебели по нормали до стены комнаты
  P.forEach((A, i) => { const B = P[(i + 1) % P.length], ex = B[0] - A[0], ey = B[1] - A[1], den = n.x * ey - n.y * ex; if (Math.abs(den) < 1e-9) return;
    const s = ((A[0] - c.x) * ey - (A[1] - c.y) * ex) / den, u = ((A[0] - c.x) * n.y - (A[1] - c.y) * n.x) / den; if (s > 0.08 && u >= 0 && u <= 1) best = Math.min(best, s); }); return best; }
function frameOf(g, k = 1) { const n = g.it.reduce((a, o) => a.add(o.n), new THREE.Vector3()).normalize(), t = new THREE.Vector3(-n.y, n.x, 0), c = new THREE.Vector3();   // k > 1 — шире: остановка, не крупный план
  let u0 = 1e9, u1 = -1e9, z0 = 1e9, z1 = -1e9; for (const o of g.it) { const u = o.p.dot(t); u0 = Math.min(u0, u - 0.07); u1 = Math.max(u1, u + 0.07); z0 = Math.min(z0, o.z[0]); z1 = Math.max(z1, o.z[1]); c.add(o.p); }
  c.divideScalar(g.it.length); c.addScaledVector(t, (u0 + u1) / 2 - c.dot(t)); c.z = (z0 + z1) / 2;
  const vf = camera.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * camera.aspect), need = Math.max(((u1 - u0) / 2 + 0.15) / Math.tan(hf), ((z1 - z0) / 2 + 0.14) / Math.tan(vf), 0.55), dmax = depth(g.room, c, n) - 0.2, d = Math.min(need * k + (k > 1 ? 0.3 : 0), dmax);
  const p = c.clone().addScaledVector(n, Math.max(d, 0.3)); p.z = Math.min(c.z + 0.08 + 0.1 * d, H - 0.2); return { p, t: c, n, room: g.room, g, over: need / Math.max(dmax, 0.3) }; }
function partOf(g, sx, sy) { const F = frameOf(g); if (F.over < 1.05 || g.it.length < 2) return F;   // не влезает (телефон, стена за спиной) — часть мебели по горизонтали, ближняя к тапу
  const t = new THREE.Vector3(-F.n.y, F.n.x, 0), it = [...g.it].sort((a, b) => a.p.dot(t) - b.p.dot(t)), k = Math.min(it.length, Math.ceil(F.over)), u0 = it[0].p.dot(t), du = (it.at(-1).p.dot(t) - u0) / k + 1e-6;
  const parts = Array.from({ length: k }, (_, i) => ({ ...g, it: it.filter(o => Math.min(k - 1, Math.floor((o.p.dot(t) - u0) / du)) === i) })).filter(q => q.it.length);
  const dist = q => { const c = q.it.reduce((a, o) => a.add(o.p), new THREE.Vector3()).divideScalar(q.it.length), [x, y] = scr2(c); return Math.hypot(x - sx, y - sy); };
  return frameOf(parts.sort((a, b) => dist(a) - dist(b))[0]); }
function lit(F) { const k = F.t.clone().addScaledVector(F.n, 0.55); k.z = H - 0.2;   // сверху, круто: блик в зеркале витрины уходит вниз, не в камеру
  return { p: k, t: F.t.clone(), c: new THREE.Color(0xffc68a), i: 32, a: 0.5 }; }   // прожектор на коллекцию: сверху-спереди, пятно по мебели
const lightFor = L => { const b = LC[L.room], F = L.g ? L : L.st && frameOf(L.st); if (!F) return b; const f = F.t.clone().addScaledVector(F.n, 0.5); f.z += 0.55;
  return { ...b, key: lit(F), pts: [...b.pts.slice(0, 3), lt(f, 0xffd6a8, 3.2, 2.6)] }; };   // + подсветка спереди без теней: под верхними полками не темно   // свет кадра: комната + прожектор на полку серии (или на крупный план)
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function place(i) { cur = i; focus = null; const [p, t] = view(LOCS[i]); camera.position.copy(p); camera.lookAt(t); curT.copy(t); show(SHOW[LOCS[i].room]); LS.A = LS.B = lightFor(LOCS[i]); LS.t = 0; caption(); }
function flyTo(i, F = null) { $('toast').classList.remove('on'); return new Promise(ok => {   // подсказка прошлой остановки («Неоткрытых коробок…» без таймера) не летит с камерой
   const a = focus ?? LOCS[cur], b = F ?? LOCS[i], [p1, t1] = F ? [F.p, F.t] : view(b), P0 = camera.position.clone();   // F — крупный план (локация cur та же)
  const { pts, rooms } = a.room === b.room ? { pts: [], rooms: new Set([a.room]) } : route(a.room, b.room), mids = pts.map(([x, y]) => new THREE.Vector3(x, y, 1.6));
  const all = [P0, ...mids, p1]; if (all.length === 2) all.splice(1, 0, P0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, 0, 0.04)));
  const curve = new THREE.CatmullRomCurve3(all, false, 'centripetal'), len = curve.getLength();
  fl = { curve, T0: curT.clone(), t1, t: 0, dur: mids.length ? Math.min(1.8, 0.6 + len * 0.07) : 0.6, multi: mids.length > 0, ok };
  show([...rooms, ...SHOW[a.room], ...SHOW[b.room]]); LS.A = LS.B; LS.B = lightFor(b); LS.t = 0; cur = i; focus = F; caption(); }); }
function stepFlight(dt) { const f = fl; f.t = Math.min(1, f.t + dt / f.dur); const e = ease(f.t), p = f.curve.getPointAt(e); camera.position.copy(p);
  const sp = f.t < 0.5 ? 4 * f.t * f.t : 4 * (1 - f.t) ** 2; cv.style.filter = sp > 0.05 ? `blur(${(3 * sp).toFixed(2)}px)` : '';   // размытие по скорости перелёта (пользователь 22.10: «чуть блюрить в момент рывка»), пик ~3 px в середине
  const d0 = f.T0.clone().sub(p).normalize(), d1 = f.t1.clone().sub(p).normalize(); let d;
  if (f.multi) { const tg = f.curve.getTangentAt(Math.min(0.999, e)).setZ(0).normalize().setZ(-0.08), w0 = 1 - smooth(0, 0.3, e), w1 = smooth(0.62, 1, e); d = d0.multiplyScalar(w0).add(d1.multiplyScalar(w1)).add(tg.multiplyScalar(Math.max(0, 1 - w0 - w1))); }
  else d = d0.lerp(d1, e);
  camera.lookAt(p.add(d.normalize())); LS.t = smooth(0, 1, e);
  if (f.t >= 1) { fl = null; cv.style.filter = ''; camera.position.copy(f.curve.getPointAt(1)); camera.lookAt(f.t1); curT.copy(f.t1); show(SHOW[(focus ?? LOCS[cur]).room]); LS.A = LS.B; LS.t = 0; f.ok();
    if (gq % LOCS.length) { const k = gq; gq = 0; go(k); } else gq = 0; } }   // накопленное — без паузы

// --- Подписи, кнопки
const count = ser => SER[ser]?.figs ? new Set(SLOTS.map(s => s.fig).filter(k => SER[ser].figs.includes(k))).size : SLOTS.filter(s => s.ser === ser && s.fig).length;   // фигурки серии где угодно в квартире (переставить можно на любое место — «взять с собой»); редкие — по своим местам
const dots = $('dots'); LOCS.forEach(() => dots.appendChild(document.createElement('i')));
function caption() { const L = LOCS[cur], fs = focus ? focus.g.it.map(o => o.s?.ser).find(x => SER[x]) : L.ser, fb = focus && focus.g.it.some(o => o.m);
  $('title').textContent = L.name; $('back').style.display = focus ? '' : 'none'; document.body.classList.toggle('focus', !!focus); tagsFor(focus?.g);
  $('sub').textContent = fs === 'rare' ? `${T.rare} · ${count('rare')} ${T.of} ${SER.rare.n}` : fs ? `${T.ser(SER[fs].name)} · ${count(fs)} ${T.of} ${SER[fs].n}` : fb ? T.boxes : focus ? '' : (L.sub ?? '');
  [...dots.children].forEach((d, i) => d.classList.toggle('on', i === cur)); $('pn').textContent = LOCS[(cur + LOCS.length - 1) % LOCS.length].name; $('nn').textContent = LOCS[(cur + 1) % LOCS.length].name; }
let toastT = 0; function toast(html, ms = 2600) { const t = $('toast'); t.innerHTML = html; t.classList.add('on'); clearTimeout(toastT); if (ms) toastT = setTimeout(() => t.classList.remove('on'), ms); }
const wait = ms => new Promise(ok => setTimeout(ok, ms));
let gq = 0;   // ‹ › и свайпы во время перелёта копятся — по прилёту сразу один перелёт на N-ю остановку (пользователь 24.10: «как между автоматами»; зал — ui.js hq)
const go = d => { unhold(); if (busy || drag) return; if (fl) { gq += d; return; } const n = LOCS.length; flyTo(((cur + d) % n + n) % n); };
const back = () => { if (fl || busy || drag || !focus) return; flyTo(cur); };
$('back').onclick = back; addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Backspace') CARRY ? endCarry(null) : HOLD.m ? unhold() : back(); });
function focusAt(e) { let best = null, ba = 1e12; const dir = camera.getWorldDirection(new THREE.Vector3());   // тап по мебели с местами: самая маленькая группа, в рамку которой попал палец
  for (const g of clusters()) { if (g.n.dot(dir) > 0.2 || (focus && g.it[0] === focus.g.it[0])) continue; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ok = true;
    for (const o of g.it) for (const z of o.z) { const [x, y, q] = scr2(o.p.clone().setZ(z)); if (q > 1) ok = false; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const pad = LOW ? 44 : 30, a = (x1 - x0 + 2 * pad) * (y1 - y0 + 2 * pad);
    if (ok && a < ba && e.clientX > x0 - pad && e.clientX < x1 + pad && e.clientY > y0 - pad && e.clientY < y1 + pad && g.it[0].p.distanceTo(camera.position) < 7) { ba = a; best = g; } }
  return best; }
// подписи в крупном плане: кто стоит, пустое место серии — «?», коробки — серия
const TAGS = $('tags'), txtOf = o => o.s ? (o.s.fig ? SHORT[o.s.fig] : SER[o.s.ser] ? '?' : '') : `${T.box} · ${SER[o.ser].name}`;
function tagsFor(g) { TAGS.replaceChildren(); if (g) for (const o of g.it) { const el = document.createElement('i'); el.o = o; TAGS.append(el); } }
function tagsFrame() { const put = [];   // подписи: под местом; налезает на уже поставленную — ниже
  for (const el of TAGS.children) { const o = el.o, t = txtOf(o); if (el.textContent !== t) el.textContent = t; let [x, y0, q] = scr2(o.p.clone().setZ(o.s ? o.p.z - 0.012 : o.z[0]));
    el.style.display = t && q <= 1 ? '' : 'none'; if (!t || q > 1) continue; const w = el.offsetWidth, h = el.offsetHeight; let y = y0; x = Math.max(w / 2 + 4, Math.min(innerWidth - w / 2 - 4, x));   // у края экрана — не обрезать
    while (put.some(r => Math.abs(r.x - x) < (r.w + w) / 2 + 2 && Math.abs(r.y - y) < h + 2)) y += h + 2;
    put.push({ x, y, w }); el.style.transform = `translate(${x - w / 2}px, ${y}px)`; } }
$('prev').onclick = () => go(-1); $('next').onclick = () => go(1);
addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });

// --- Призрак места (как в «Размена не будет»), появление фигурки, перетаскивание
const ghostMat = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, c: { value: new THREE.Color(0x8fc4ff) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec3 n, v; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); n = normalize(normalMatrix * normal); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float t; uniform vec3 c; varying vec3 n, v; void main() { float f = pow(1.0 - abs(dot(n, v)), 2.0); float p = 0.7 + 0.3 * sin(t * 4.0); gl_FragColor = vec4(c, (0.14 + 0.8 * f) * p); }' });
let ghost = null; const ANIM = [];
const pop = m => { if (m) { ANIM.push({ m, t: 0, s: m.scale.x }); SN(['drop1', 'drop2'], { vol: 0.8 }); } return m; };   // фигурка встала на место (И-28/30)
function showGhost(s, k, src = null) { ghost = new THREE.Mesh(FIG[k].geo, ghostMat); ghost.scale.setScalar(s.h); ghost.position.copy(s.pos); ghost.rotation.z = s.rz; ghost.userData = { s, k, src }; ghost.renderOrder = 6; R[s.room].add(ghost); card(s, false); }
const scr2 = v => { const q = v.clone().project(camera); return [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight, q.z]; };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const aim = e => { ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, camera); };
const pickFig = e => { aim(e); return ray.intersectObjects(FIGS.filter(m => m.parent.visible), false)[0]?.object; };
function tap(e) { if (PZ.stage) { if (PZ.stage === 'wait') PZ.tap(e); return; } if (!busy && !ghost && PZ.tapStack(e)) return; const g = ghost, [x, y] = g ? scr2(g.position.clone().setZ(g.position.z + g.scale.x / 2)) : [1e9, 1e9];
  if (Math.hypot(x - e.clientX, y - e.clientY) > (LOW ? 90 : 70)) { const f = !busy && pickFig(e); if (f) return hold(f); const G = !busy && focusAt(e); if (G) flyTo(cur, partOf(G, e.clientX, e.clientY)); return; }
  const { s, k, src } = g.userData; g.removeFromParent(); ghost = null; pop(setFig(s, k, src)); persist(); caption(); PZ.home = !unopened().length && collected().n <= 3;   // первые 3 фигурки — рука на выход (пользователь 25.10)
  toast(T.placed(count(s.ser), SER[s.ser].n), 4500);
  if (unopened().length) setTimeout(() => { if (!fl && !busy && !PZ.stage && !HOLD.m) toDesk(); }, 1600); }   // остались коробки — обратно к столу
const RINGS = [], ringMat = new THREE.MeshBasicMaterial({ color: 0x8fc4ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
let down = null, drag = null;
function rings() { for (const r of RINGS) r.removeFromParent(); RINGS.length = 0;   // кольца у свободных мест в кадре: перетаскивание и «с собой»
  for (const f of SLOTS) { if (f.fig || !R[f.room].visible || f === ghost?.userData.s) continue; const [, , z] = scr2(f.pos), [x, y] = scr2(f.pos); if (z > 1 || x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
    const r = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.045, 32), ringMat); r.position.copy(f.pos).setZ(f.pos.z + 0.004); r.userData.s = f; r.renderOrder = 7; R[f.room].add(r); RINGS.push(r); } return RINGS.length; }
function startDrag(m) { drag = { m, from: m.userData.slot, to: null }; cv.style.cursor = 'grabbing'; toast(rings() ? T.ring : T.full, 2400); }
// «Взять с собой» (выбор пользователя 23.10): в руке — «переставить» → фигурка в уголок, листаешь к любой остановке, кольца у свободных мест, тап по кольцу — встаёт; тап по уголку / Esc — обратно
let CARRY = null;
function carry() { const s = HOLD.s; if (!s?.mesh || HOLD.lock) return; unhold(); s.mesh.visible = false; CARRY = { s, dirty: true }; const c = document.createElement('canvas'), I = HS.IMG[s.fig]; c.width = c.height = 76; if (I) { const k = Math.min(76 / I.width, 76 / I.height); c.getContext('2d').drawImage(I, (76 - I.width * k) / 2, (76 - I.height * k) / 2, I.width * k, I.height * k); }
  $('carried').innerHTML = `<img src="${c.toDataURL()}" alt="">${figName(s.fig)}<b>✕</b>`; $('carried').style.display = ''; document.body.classList.add('carrying'); SN('pick', { vol: 0.8 }); }
function endCarry(to) { const { s } = CARRY; CARRY = null; for (const r of RINGS) r.removeFromParent(); RINGS.length = 0; $('carried').style.display = 'none'; document.body.classList.remove('carrying'); $('toast').classList.remove('on');
  if (to) { const k = s.fig, src = s.src; setFig(s, null); pop(setFig(to, k, src)); persist(); caption(); } else s.mesh.visible = true; }
function carryFrame() { if (!CARRY) return; if (fl) { if (RINGS.length) { for (const r of RINGS) r.removeFromParent(); RINGS.length = 0; } CARRY.dirty = true; } else if (CARRY.dirty) { CARRY.dirty = false; toast(rings() ? T.carryTip : T.carryNo, 0); } }   // кольца — когда камера встала
const carryTap = e => { let best = null, bd = LOW ? 90 : 70; for (const r of RINGS) { const [x, y] = scr2(r.position), d = Math.hypot(x - e.clientX, y - e.clientY); if (d < bd) { bd = d; best = r; } } if (best) endCarry(best.userData.s); return !!best; };
function moveDrag(e) { const m = drag.m; let best = null, bd = LOW ? 90 : 70;
  for (const r of RINGS) { const [x, y] = scr2(r.position), d = Math.hypot(x - e.clientX, y - e.clientY); if (d < bd) { bd = d; best = r; } }
  for (const r of RINGS) r.scale.setScalar(r === best ? 1.7 : 1);
  if (best) { drag.to = best.userData.s; m.position.copy(drag.to.pos); m.rotation.z = drag.to.rz; m.scale.setScalar(drag.to.h); return; }
  drag.to = null; aim(e); const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), drag.from.pos), hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(pl, hit)) m.position.copy(hit).add(new THREE.Vector3(0, 0, -drag.from.h * 0.5)); }
function endDrag(cancel) { const { m, from, to } = drag; for (const r of RINGS) r.removeFromParent(); RINGS.length = 0; cv.style.cursor = ''; drag = null;
  if (to && !cancel) { const k = from.fig, src = from.src; setFig(from, null); pop(setFig(to, k, src)); persist(); caption(); } else { m.position.copy(from.pos); m.rotation.z = from.rz; m.scale.setScalar(from.h); } }
cv.addEventListener('pointerdown', e => { if (PZ.stage === 'packet') { PZ.tear = { x0: e.clientX, y0: e.clientY, p0: PZ.pk.userData.p }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} return; } if (HOLD.m) { HOLD.drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} return; } if (fl) return; down = { x: e.clientX, y: e.clientY, fig: busy || CARRY ? null : pickFig(e) }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
cv.addEventListener('pointermove', e => { if (PZ.tear) return PZ.tearMove(e); const D = HOLD.drag; if (D) { const dx = e.clientX - D.x, now = performance.now(); HOLD.rz += dx * 0.012; HOLD.rx = Math.max(-0.7, Math.min(0.7, HOLD.rx + (e.clientY - D.y) * 0.008)); HOLD.v = dx * 0.012 / Math.max(8, now - D.t) * 1000; Object.assign(D, { x: e.clientX, y: e.clientY, t: now }); return; }
  if (!down) { if (!fl && e.pointerType === 'mouse') cv.style.cursor = pickFig(e) ? 'grab' : ''; return; }
  const dx = e.clientX - down.x, dy = e.clientY - down.y; if (down.fig && !drag && Math.hypot(dx, dy) > 8) startDrag(down.fig); if (drag) moveDrag(e); });
cv.addEventListener('pointerup', e => { if (PZ.tear) return PZ.tearUp(e); const D = HOLD.drag; if (D) { HOLD.drag = null; if (Math.hypot(e.clientX - D.x0, e.clientY - D.y0) < 10) { if (HOLD.glow && holdHit(e)) glowTap(); else if (Math.hypot(e.clientX - innerWidth / 2, e.clientY - innerHeight / 2) > 0.3 * Math.min(innerWidth, innerHeight)) unhold(); } return; }   // касание фигурки со светом — вкл/выкл
  if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
  if (drag) endDrag(); else if (Math.hypot(dx, dy) < 10) { if (!(CARRY && carryTap(e))) tap(e); } else if (Math.abs(dx) > 50 && Math.abs(dx) > 1.3 * Math.abs(dy)) go(dx < 0 ? 1 : -1); down = null; });
cv.addEventListener('pointercancel', () => { PZ.tear = null; if (drag) endDrag(true); down = null; });
addEventListener('contextmenu', e => e.preventDefault());   // на весь фрейм: кнопки и подписи тоже (Яндекс 1.6.1.8 / 1.6.2.7)

// --- Взять фигурку (пользователь 22.10: «покрутить бы, взять»): тап — она крупно перед тобой, тянуть — крутить, тап мимо / «на место» / Esc — обратно на полку.
// Своя сцена со своим светом рисуется поверх кадра: фигурку видно одинаково в любой комнате; фон затемнён плоскостью за ней
const HOLD = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(28, 1, 0.05, 20), m: null, s: null, rz: 0, rx: 0, v: 0, t: 0, drag: null };
{ const k = new THREE.DirectionalLight(0xffd6a6, 2.6), r = new THREE.DirectionalLight(0x9fb8ff, 1.3); k.position.set(-0.7, -1, 1.3); r.position.set(0.9, 0.8, 0.5);
  HOLD.dim = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x05070b, transparent: true, opacity: 0, depthWrite: false })); HOLD.dim.position.y = 3; HOLD.dim.renderOrder = -1;
  HOLD.scene.add(new THREE.HemisphereLight(0xfff0dc, 0x1a1d24, 0.8), k, r, HOLD.dim); HOLD.scene.environment = scene.environment; HOLD.scene.environmentIntensity = 0.8; }   // окружение: у фигурок TRELLIS металличность 1 × карта — без него в руке почти чёрные (лось-шофёр, 23.10)
function hold(m) { unhold(); SN('pick', { vol: 0.8 }); const s = m.userData.slot, k = s.fig; HOLD.m = new THREE.Mesh(FIG[k].geo, FIG[k].mat); HOLD.scene.add(HOLD.m); HOLD.glow = addGlow(HOLD.m, k); HOLD.glow?.set(glowOn(k)); Object.assign(HOLD, { s, rz: m.rotation.z, rx: 0, v: 0.5, t: 0 }); m.visible = false;
  const a = innerWidth / innerHeight, b = (FIG[k].geo.boundingBox ?? (FIG[k].geo.computeBoundingBox(), FIG[k].geo.boundingBox)), rh = 0.2 * Math.hypot(Math.max(-b.min.x, b.max.x), Math.max(-b.min.y, b.max.y)), tf = Math.tan(14 * Math.PI / 180);
  HOLD.cam.aspect = a; HOLD.cam.position.set(0, -Math.max(0.13 / tf, 1.12 * rh / (tf * a)) - rh, 0.1); HOLD.cam.lookAt(0, 0, 0.1); HOLD.cam.updateProjectionMatrix();   // в кадр по высоте (20 см) и по ширине при любом повороте (самолёт шире, чем выше)
  $('put').style.display = $('carry').style.display = ''; document.body.classList.add('holding'); toast(`<em>${figName(k)}</em>${SER[s.ser]?.bs ? ` · ${T.ser(SER[s.ser].name)}` : ''}<br>${T.turn}`, 0); }
function unhold() { if (!HOLD.m || HOLD.lock) return; HOLD.scene.remove(HOLD.m); if (HOLD.glow) { HOLD.m.material.dispose(); HOLD.glow = null; } HOLD.m = null; HOLD.drag = null; if (HOLD.s.mesh) HOLD.s.mesh.visible = true; $('put').style.display = $('carry').style.display = 'none'; document.body.classList.remove('holding'); $('toast').classList.remove('on'); }   // lock — фигурка из распаковки: убрать можно только «На полку»
$('put').onclick = () => PZ.stage === 'hand' ? PZ.toShelf() : unhold(); $('carry').onclick = carry; $('carried').onclick = () => CARRY && endCarry(null); $('carry').textContent = T.carry;
function glowTap() { const G = HOLD.glow, k = HOLD.s.fig; G.toggle(); setGlowOn(k, G.on); HOLD.s.mesh?.userData.glow?.set(G.on); }   // в руке вкл/выкл — и на полке так же
const holdRay = new THREE.Raycaster(), holdHit = e => { holdRay.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), HOLD.cam); return holdRay.intersectObject(HOLD.m, false).length > 0; };   // касание по фигурке в руке
function holdFrame(dt) { const H_ = HOLD; H_.t = Math.min(1, H_.t + dt / 0.3); const e = 1 - (1 - H_.t) ** 3; H_.glow?.update(dt);
  if (!H_.drag) { H_.rz += H_.v * dt; H_.v += (0.45 - H_.v) * Math.min(1, dt * 1.5); H_.rx *= 1 - Math.min(1, dt * 2); }   // отпустил — докручивается и медленно вертится сама
  H_.m.scale.setScalar(0.2 * (0.6 + 0.4 * e)); H_.m.rotation.set(H_.rx, 0, H_.rz); H_.dim.material.opacity = 0.72 * e;
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(H_.scene, H_.cam); renderer.autoClear = true; }

// --- Распаковка на столе кабинета (GAME_BUILD §2a, §4; путь E из lab.js buildE): коробка из автомата → тап: пломба, крышка, створки → фигурка выходит → в руке (HOLD) →
// «На полку»: перелёт к стеллажу серии, призрак, ставит игрок сам. __apt.prize: open(fig, mid) → Promise (фигурка в руке), toShelf() → Promise (призрак на экране), close().
// ?rv=a|b|c — появление на выбор: a — как в E (лучи ранга, конфетти), b — тихо (тёплый ореол и подсветка), c — тёплый луч сверху с пылинками
const RANKC = [0xffd2e2, 0xa58cff, 0xffb92e];   // лучи ранга — как в E: обычная, редкая, секретная (пользователь 23.10: «лучи — ок»)
const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const PZ = { stage: null, TW: [] }, ptw = (dur, f) => new Promise(ok => PZ.TW.push({ t: 0, dur, f, ok })), after = s => ptw(s, () => {});   // твины по кадрам квартиры: на паузе стоят
const sizeOf = mid => { if (isCap(mid)) return [0.085, 0.085, 0.085]; const M = parent.MACHINES?.find(m => m.id === String(mid).split('~')[0]); return parent.BOXES?.find(b => b.id === M?.box)?.size ?? [0.15, 0.25, 0.14]; };   // коробка автомата (machines.js), в стенде — большая 15×25×14
function openBox(mats, [w, h, d]) {                                   // из lab.js: коробка без верха, крышка на шарнире у заднего края, язычок за переднюю стенку, две боковые створки; y вверх, лицо +z, начало — центр дна
  const e = 0.002, G = new THREE.Group(), cd = Sm(0xd9c3a5, 0.85), inn = Sm(0x9c8a74, 0.95);   // изнанка — серый картон: светлая (как в E) под верхним светом горела панелью за фигуркой
  const part = (geo, m, x, y, z, par = G) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  part(new THREE.BoxGeometry(w, h, e), [cd, cd, cd, cd, mats[4], inn], 0, h / 2, d / 2 - e / 2); part(new THREE.BoxGeometry(w, h, e), [cd, cd, cd, cd, inn, mats[5]], 0, h / 2, -d / 2 + e / 2);
  part(new THREE.BoxGeometry(e, h, d - 2 * e), [mats[0], inn, cd, cd, cd, cd], w / 2 - e / 2, h / 2, 0); part(new THREE.BoxGeometry(e, h, d - 2 * e), [inn, mats[1], cd, cd, cd, cd], -w / 2 + e / 2, h / 2, 0);
  part(new THREE.BoxGeometry(w, e, d), [cd, cd, inn, mats[3], cd, cd], 0, e / 2, 0);
  const lid = new THREE.Group(); lid.position.set(0, h, -d / 2); G.add(lid); part(new THREE.BoxGeometry(w, e, d), [cd, cd, mats[2], inn, cd, cd], 0, e / 2, d / 2, lid);
  const tk = Math.min(0.03, d * 0.22), tuck = new THREE.Group(); tuck.position.set(0, 0, d); lid.add(tuck); part(new THREE.BoxGeometry(w - 4 * e, tk, e), [cd, cd, cd, cd, cd, inn], 0, -tk / 2, -1.5 * e, tuck);
  const fw = Math.min(0.045, w * 0.28), flaps = [-1, 1].map(s => { const P = new THREE.Group(); P.position.set(s * (w / 2 - e), h - e, 0); G.add(P);
    part(new THREE.BoxGeometry(fw, e, d - 6 * e), [cd, cd, inn, cd, cd, cd], -s * fw / 2, -e / 2, 0, P); return P; });
  const tapeM = new THREE.MeshStandardMaterial({ color: 0xffe6c8, roughness: 0.12, transparent: true, opacity: 0.55, side: THREE.DoubleSide }); seed = 3;   // пломба-наклейка: низ на передней стенке, верх на крышке, рваный край по шву
  const jag = Array.from({ length: 9 }, (_, i) => [-0.02 + i * 0.005, (rnd() - 0.5) * 0.006]), tg = up => { const s = new THREE.Shape(); s.moveTo(-0.02, up ? 0.03 : -0.014); for (const [x, y] of jag) s.lineTo(x, y); s.lineTo(0.02, up ? 0.03 : -0.014); s.closePath(); return new THREE.ShapeGeometry(s); };
  const tape = new THREE.Mesh(tg(false), tapeM.clone()); tape.position.set(0, h - 0.004, d / 2 + 0.0015); G.add(tape);
  const tu = new THREE.Mesh(tg(true), tapeM); tu.rotation.x = -Math.PI / 2; tu.position.set(0, 0.0035, d - 0.004); lid.add(tu);
  Object.assign(G.userData, { lid, tuck, flaps, tape }); return G; }
function foam(par, [w, h, d]) {                                       // из lab.js: пенопластовые шарики слоем сверху в коробке (её координаты, y вверх); kick — фигурка выходит, шарики разлетаются; step — падение, отскок от стола и стенок, оседание
  const N = LOW ? 220 : 420, e = 0.002, im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), Sm(0xfdfbf6, 0.8), N), B = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const X = w / 2 - e, Z = d / 2 - e, fill = h - 0.075; seed = 17;
  for (let i = 0; i < N; i++) { const r = 0.0055 + rnd() * 0.003; B.push({ r, p: V((rnd() - 0.5) * 2 * (X - r), h - 0.006 - r - rnd() * 0.045, (rnd() - 0.5) * 2 * (Z - r)), v: V(), on: false, out: false }); }
  const upd = () => { B.forEach((b, i) => { m4.compose(b.p, q, V(b.r, b.r, b.r)); im.setMatrixAt(i, m4); }); im.instanceMatrix.needsUpdate = true; };
  upd(); im.castShadow = false; im.receiveShadow = true; par.add(im);
  return { kick: () => B.forEach(b => { const a = Math.atan2(b.p.z + (rnd() - 0.5) * 0.05, b.p.x + (rnd() - 0.5) * 0.05), k = 0.1 + rnd() * 0.35; b.v.set(Math.cos(a) * k, 0.6 + rnd() * 0.8, Math.sin(a) * k); b.on = true; }),   // вверх и от центра — часть перелетает через борт
    step: dt => { let any = false;
      for (const b of B) { if (!b.on) continue; any = true; const { p, v, r } = b; v.y -= 9.8 * dt; p.addScaledVector(v, dt);
        const inF = Math.abs(p.x) < X + r && Math.abs(p.z) < Z + r; let floor = -Infinity;
        if (!b.out) { if (p.y < h) { if (Math.abs(p.x) > X - r) { p.x = Math.sign(p.x) * (X - r); v.x *= -0.4; } if (Math.abs(p.z) > Z - r) { p.z = Math.sign(p.z) * (Z - r); v.z *= -0.4; } } else if (!inF) b.out = true; floor = fill; }   // в коробке: стенки ниже борта; выше борта и за ним — вылетел
        if (b.out) { if (inF && p.y < h) { if (Math.abs(p.x) / X > Math.abs(p.z) / Z) { p.x = Math.sign(p.x) * (X + r); v.x *= -0.4; } else { p.z = Math.sign(p.z) * (Z + r); v.z *= -0.4; } } floor = 0; }   // снаружи: о стенку — назад, ниже — стол
        if (p.y < floor + r) { p.y = floor + r; v.y = -v.y * 0.3; v.x *= 0.75; v.z *= 0.75; v.multiplyScalar(Math.exp(-5 * dt)); if (v.x * v.x + v.z * v.z < 0.0004 && Math.abs(v.y) < 0.4) { v.set(0, 0, 0); b.on = false; } } }   // улёгся
      if (any) upd(); } };   // ponytail: шарики друг с другом не сталкиваются и со стола не скатываются — для горсти на столе хватает
}
// эффекты появления: лучи и ореол — щиты к камере за фигуркой (в руке — в сцене HOLD), конфетти, луч сверху с пылинками, подсветка
const glowT = tex(128, 128, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const rayT = tex(512, 512, (g, W) => { g.translate(W / 2, W / 2); for (let i = 0; i < 20; i++) { g.rotate(Math.PI / 10); const gr = g.createLinearGradient(0, 0, 0, -W / 2); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(-W * (i % 2 ? 0.035 : 0.06), -W / 2); g.lineTo(W * (i % 2 ? 0.035 : 0.06), -W / 2); g.fill(); } });
const addM = map => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
const FX = new THREE.Group(), rayM = addM(rayT), ray1 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rayM), ray2 = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), rayM), halo = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), addM(glowT));
FX.add(ray1, ray2, halo); FX.visible = false; scene.add(FX); const fxL = new THREE.PointLight(RANKC[0], 0, 0.9, 2); scene.add(fxL);
const CN = 160, cf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.011, 0.007), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), CN), CP = [], dum = new THREE.Object3D(); let cfi = 0;   // конфетти: частицы с тяжестью (z вверх)
cf.frustumCulled = false; for (let i = 0; i < CN; i++) { CP.push({ life: 0, p: V(), v: V(), r: V(), w: V() }); cf.setColorAt(i, new THREE.Color(1, 1, 1)); dum.scale.setScalar(0); dum.updateMatrix(); cf.setMatrixAt(i, dum.matrix); } scene.add(cf);
const CC = ['#ffb36b', '#ffd28a', '#fff6ef', '#ff8a7a', '#8fc4ff', '#ffe3a0'].map(c => new THREE.Color(c));
const burst = (o, n, sp, gold) => { for (let i = 0; i < n; i++) { const q = CP[cfi = (cfi + 1) % CN]; q.life = 1.4 + Math.random() * 0.8; q.p.copy(o); q.v.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, Math.random() * 1.2 + 0.4).multiplyScalar(sp);
  q.r.set(Math.random() * 6, Math.random() * 6, 0); q.w.set(Math.random() * 14 - 7, Math.random() * 14 - 7, 0); cf.setColorAt(cfi, gold && Math.random() < 0.6 ? new THREE.Color('#ffc93a') : CC[i % CC.length]); } cf.instanceColor.needsUpdate = true; };
// подсказка на месте, как на стенде E: кольцо и рука — тап по коробке / свайп по пакетику сверху вниз; подпись — у конца жеста
const cueNow = () => { const st = PZ.stage, P = PZ.pk;
  if (st === 'packet' && P && !PZ.tear) { const H = P.userData.h, B = P.userData.B; return { swipe: true, a: scr2(P.localToWorld(V(0, H * 0.42, B))), b: scr2(P.localToWorld(V(0, -H * 0.2, B))), t: T.tear }; }
  if (st === 'wait' && PZ.hb) { const p = scr2(PZ.hb.localToWorld(V(0, 0, PZ.H * 0.55))); return { a: p, b: p, t: isCap(PZ.mid) ? T.openCap : T.open }; }
  if (HOLD.m && HOLD.glow && !glowTried(HOLD.s.fig)) { const p = HOLD.glow.screen(HOLD.cam); return { a: p, b: p, t: HOLD.glow.on ? T.lightOff : T.lightOn }; }   // в руке: кольцо и рука на лампочке, пока ни разу не нажимал
  if (st === 'hand') { const r = $('put').getBoundingClientRect(), p = [r.x + r.width / 2, r.y + r.height / 2]; return { a: p, b: p, t: '' }; }   // фигурка в руке — кольцо на «На полку» (пользователь 25.10: в первый раз непонятно, куда жать)
  if (!st && ghost && !fl) { const p = scr2(ghost.position.clone().setZ(ghost.position.z + ghost.scale.x / 2)); return { a: p, b: p, t: '' }; }   // призрак на полке — нажать на него
  if (PZ.home && !st && !busy && !fl && !HOLD.m && !ghost) { const r = [$('back'), $('demo')].map(e => e.getBoundingClientRect()).find(r => r.width > 0); if (r) { const p = [r.x + r.width / 2, r.y + r.height / 2]; return { a: p, b: p, t: '' }; } }   // первая фигурка на полке — к выходу в зал
  if (!st && !busy && !fl && !HOLD.m && !ghost && $('boxes').style.display !== 'none' && collected().n <= 3) { const r = $('boxes').getBoundingClientRect(), p = [r.x + r.width / 2, r.y + r.height / 2]; return { a: p, b: p, t: '' }; }   // первые 3 фигурки: есть неоткрытые — рука на кнопке коробок (пользователь 25.10)
  if (!st && !busy && !fl && !HOLD.m && !ghost && focus?.desk && PZ.stack.length) { const n = PZ.stack[0].n, p = scr2(n.localToWorld(V(0, 0, PZ.stack[0].h * 0.5))); return { a: p, b: p, t: '', stack: true }; }   // подоконник: рука на первой коробке, число — в подписи снизу
  return null; };
const CUE = $('cue'), CUE_I = [...CUE.querySelectorAll('i')], CUE_H = CUE.querySelector('svg'), CUE_T = CUE.querySelector('b');
function cueFrame(T_) { document.body.classList.toggle('pz', !!(PZ.stage || ghost)); const c = cueNow();   // распаковка и призрак — видна только нужная кнопка (пользователь 25.10: и на капсуле гачи)
  CUE.style.visibility = c ? 'visible' : 'hidden'; if (!c) return;
  const [x, y] = c.a, [bx, by] = c.b, u = (T_ % 1.6) / 1.6; let hx = x, hy = y, op = 1;
  if (c.swipe) { const k = sm(Math.min(1, u / 0.7)); hx = x + (bx - x) * k; hy = y + (by - y) * k; op = u > 0.85 ? (1 - u) / 0.15 : 1; } else hy += 9 * Math.abs(Math.sin(T_ * 3.2));
  for (const r of CUE_I) r.style.translate = `${x}px ${y}px`; CUE_H.style.translate = `${hx - 16}px ${hy - 4}px`; CUE_H.style.opacity = op;   // кончик пальца иконки — (8, 2) из 24
  if (CUE_T.textContent !== c.t) CUE_T.textContent = c.t; CUE_T.style.translate = `${Math.min(innerWidth - 120, Math.max(120, bx))}px ${Math.min(innerHeight - 130, by + 46)}px`; }
PZ.step = (dt, T) => {
  cueFrame(T);
  for (const w of [...PZ.TW]) { w.t += dt; const e = Math.min(1, w.t / w.dur); w.f(e); if (e >= 1) { PZ.TW.splice(PZ.TW.indexOf(w), 1); w.ok(); } }
  if (PZ.stage === 'wait') for (const m of PZ.mats) m.emissive.setScalar(GLOW + 0.08 + 0.07 * Math.sin(T * 5));   // коробку можно открыть — лёгкое мерцание печати
  const sg = cueNow()?.stack ? GLOW + 0.16 + 0.15 * Math.sin(T * 4) : GLOW; if (sg !== PZ.sg) { PZ.sg = sg; for (const b of PZ.stack) for (const m of b.mats) m.emissive.setScalar(sg); }   // подоконник у стола: неоткрытые мерцают, как приз на стенде E
  if (FX.visible) { const k = PZ.fxK ?? 0, inH = FX.parent === HOLD.scene; ray1.rotation.z += dt * 0.35; ray2.rotation.z -= dt * 0.5;
    rayM.opacity = 0.38 * k; halo.material.opacity = 0.12 * k * (0.92 + 0.08 * Math.sin(T * 3));
    if (inH) { FX.position.set(0, 0.12, 0.1); FX.quaternion.copy(HOLD.cam.quaternion); FX.scale.setScalar(0.62); }
    else if (PZ.fig) { const c = PZ.fig.localToWorld(V(0, 0, 0.55)), f = camera.getWorldDirection(V()); FX.position.copy(c).addScaledVector(f, 0.1); FX.quaternion.copy(camera.quaternion); FX.scale.setScalar(0.48 * (0.95 + 0.05 * Math.sin(T * 3)));
      fxL.position.copy(c).addScaledVector(f, -0.12); fxL.intensity = 0.1 * k; } }

  let any = false; for (let i = 0; i < CN; i++) { const q = CP[i]; if (q.life <= 0) continue; any = true; q.life -= dt; q.v.z -= 2.4 * dt; q.v.multiplyScalar(Math.exp(-1.6 * dt)); q.p.addScaledVector(q.v, dt); q.r.addScaledVector(q.w, dt);
    dum.position.copy(q.p); dum.rotation.set(q.r.x, q.r.y, 0); dum.scale.setScalar(q.life > 0 ? Math.min(1, q.life * 2) : 0); dum.updateMatrix(); cf.setMatrixAt(i, dum.matrix); }
  if (any) cf.instanceMatrix.needsUpdate = true; PZ.balls?.step(dt); };
function pzClean() { PZ.TW.length = 0; PZ.tear = null; PZ.pk = null; PZ.hb?.removeFromParent(); PZ.fig?.removeFromParent(); for (const m of PZ.mats ?? []) m.emissive.setScalar(GLOW);
  scene.add(FX); FX.visible = false; fxL.intensity = 0; Object.assign(PZ, { stage: null, hb: null, fig: null, balls: null, fxK: 0 }); }
// неоткрытые коробки (Save.boxes — id автоматов, кладёт ui.js при выигрыше) — столбиками на подоконнике кабинета (пользователь 23.10): до 20, 5 столбиков по 4, нижний ряд первым;
// тап — коробка спрыгивает на стол под лампу и открывается, верхние в её столбике опускаются. ponytail: горшок у левого края подоконника запечён — убрать при перезапекании
const SILL = { x: 13.27, y: [5.82, 5.61, 6.03, 5.4, 6.24], z: 0.85 }, UNP = [-0.42, -0.52], GLOW = 0.22;   // столбики — с середины подоконника (у шторы коробку не видно, пользователь 23.10); GLOW — самосвечение печати   // шаг 21 см: самая широкая коробка залов — 20 см; место распаковки — левый передний угол стола
let DEMO = []; const unopened = () => SAVE ? (SAVE.get?.().boxes ?? []) : DEMO;
PZ.stack = [];
function stackBuild() { for (const b of PZ.stack) b.n.removeFromParent(); const L = unopened().filter((x, i, a) => !(PZ.stage && x === PZ.mid && a.indexOf(x) === i)).slice(0, 20), zc = SILL.y.map(() => 0);   // открываемую — не дублировать
  PZ.stack = L.map((mid, i) => { const S = sizeOf(mid), c = i % SILL.y.length, n = node(grp('cab'), SILL.x, SILL.y[c], SILL.z + zc[c], E_ + ((i * 0.37) % 0.16) - 0.08);
    if (isCap(mid)) { const k = capOf(mid); k.position.z = k.userData.r; k.traverse(o => { o.userData.pzBox = mid; }); n.add(k); zc[c] += S[1]; return { mid, n, c, h: S[1], mats: k.userData.mats }; }   // капсула гачи стоит верхом вверх
    const m = put(n, new THREE.BoxGeometry(...S), litM(HS.boxMats(S.map(v => v / 2), HS.figOf(mid), HS.bsOf(mid))), 0, 0, S[1] / 2);
    m.rotation.x = Math.PI / 2; m.userData.pzBox = mid; if (!zc[c]) put(n, new THREE.PlaneGeometry(S[0] * 2, S[2] * 2.4), blobM, 0, 0, 0.001, false).receiveShadow = false; zc[c] += S[1]; return { mid, n, c, h: S[1], mats: m.material }; }); }   // стоит головой вверх, лицом в комнату
const isCap = mid => /^G~/.test(mid), capOf = mid => { const L = [...SJ.GACHA.figs, SJ.GACHA.secret], k = HS.capsule(HS.CAPC[Math.max(0, L.indexOf(HS.figOf(mid))) % HS.CAPC.length]); k.rotation.x = Math.PI / 2; return k; };   // капсула гачи: ось половинок y → вверх; цвет — как выкатилась в зале
const litM = ms => { for (const m of ms) if (m.map && m.emissiveMap !== m.map) { m.emissiveMap = m.map; m.emissive.setScalar(GLOW); m.needsUpdate = true; } return ms; };   // печать чуть светится: коробки видны и в тени подоконника
const blobM = new THREE.MeshBasicMaterial({ map: glowT, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false });   // пятно тени: подоконник и стол запечены, живые тени на них не падают
function deskF() { const top = Math.max(1.1, ...PZ.stack.map(b => b.n.position.z + b.h)) + 0.12, used = PZ.stack.map(b => b.n.position.y), y0 = Math.min(5.65, ...used.map(y => y - 0.14)), y1 = 6.62;   // кадр «подоконник и стол» по высоте столбиков: мало коробок — ближе
  const c = V(12.95, (y0 + y1) / 2, (0.76 + top) / 2), n = V(-1, 0, 0), vf = camera.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * camera.aspect), dist = Math.max((y1 - y0) / 2 / Math.tan(hf), (top - 0.76) / 2 / Math.tan(vf)) + 0.45, dir = V(-1, 0, 0.22).normalize();
  const it = [[12.45, y1, 0.76], [12.45, y0, 0.76], [13.27, y0, top], [13.27, y1, top]].map(([x, y, z]) => ({ p: V(x, y, z), z: [z, z], n, s: { ser: 'desk' } }));
  return { p: c.clone().addScaledVector(dir, dist), t: c, n, room: 'cab', g: { room: 'cab', n, it }, desk: true }; }   // место распаковки под лампой (y 6.47) — всегда в кадре, на телефоне — тоже
function toDesk(instant) { stackBuild(); const F = deskF(), i = LOCS.findIndex(l => l.id === 'desk'), n = PZ.stack.length;
  const tip = () => n && toast(T.unopened(unopened().length), 0);   // ponytail: больше 20 — ждут, на подоконнике 20
  if (!instant) { const p = flyTo(i, F); tip(); return p; } tip(); cur = i; focus = F; camera.position.copy(F.p); camera.lookAt(F.t); curT.copy(F.t); show(SHOW.cab); LS.A = LS.B = lightFor(F); LS.t = 0; caption(); }
PZ.tapStack = e => { aim(e); const mid = ray.intersectObjects(PZ.stack.map(b => b.n), true)[0]?.object.userData.pzBox; if (mid) PZ.open(mid); return !!mid; };
PZ.open = async mid => {
  pzClean(); HOLD.lock = false; unhold(); busy = true; if (ghost) { card(ghost.userData.s, true); ghost.removeFromParent(); ghost = null; }
  const CAP = isCap(mid), k = SF[Q.get('fig')] ? Q.get('fig') : HS.figOf(mid), S = sizeOf(mid), [w, h, d] = [S[0], S[1], S[2]], mats = PZ.mats = CAP ? [] : litM(HS.boxMats(S.map(v => v / 2), k, HS.bsOf(mid)));   // CAP — капсула гачи (стенд E, pack=gacha)   // стоит головой вверх: длина коробки автомата — высота, толщина — глубина
  const from = PZ.stack.find(b => b.mid === mid), hb = PZ.hb = node(Z.desk, UNP[0], UNP[1], 0.757, 0.2), P = CAP ? capOf(mid) : openBox(mats, [w, h, d]); if (CAP) P.position.z = P.userData.r; else P.rotation.x = Math.PI / 2; hb.add(P); PZ.balls = CAP ? null : foam(P, [w, h, d]);   // у капсулы пенопласта нет   // y коробки → z, лицо → −y стола (к игроку)
  put(hb, new THREE.PlaneGeometry(w * 2.2, d * 2.6), blobM, 0, 0, 0.001, false).receiveShadow = false;
  Object.assign(PZ, { k, mid, H: h, ser: shelfOf(mid), stage: 'fly', home: 0 }); $('toast').classList.remove('on'); const figP = figLoad(k);   // фигурка грузится, пока коробку открывают
  const desk = LOCS.findIndex(l => l.id === 'desk'), c = hb.localToWorld(V()), n = nrmOf(wrz(Z.desk)), F = frameOf({ room: 'cab', n, it: [{ p: c, z: [c.z, c.z + h + 0.22], n, s: { ser: 'desk' } }] });   // s — место стола: подписи и серия крупного плана пустые
  if (from) { const p0 = Z.desk.worldToLocal(from.n.getWorldPosition(V())), up = PZ.stack.filter(b => b.c === from.c && b.n.position.z > from.n.position.z);   // с подоконника: спрыгивает под лампу, камера следом
    from.n.removeFromParent(); PZ.stack.splice(PZ.stack.indexOf(from), 1); hb.position.copy(p0); hb.rotation.z = 0;
    for (const b of up) { const z0 = b.n.position.z; ptw(0.3, e => { b.n.position.z = z0 - from.h * e * e; }); }   // верхние в столбике — вниз
    flyTo(desk, F); await ptw(0.7, e => { const q = sm(e); hb.position.set(p0.x + (UNP[0] - p0.x) * q, p0.y + (UNP[1] - p0.y) * q, p0.z + (0.757 - p0.z) * q + Math.sin(Math.PI * e) * 0.1); hb.rotation.z = 0.2 * q; }); await after(0.15); }
  else { hb.visible = false; await flyTo(desk, F); hb.visible = true;
    await ptw(0.5, e => { const q = e < 0.75 ? (e / 0.75) ** 2 : 1 - Math.sin((e - 0.75) / 0.25 * Math.PI) * 0.12; hb.position.z = 0.757 + 0.25 * (1 - q); }); SN('hit2', { vol: 0.5 });   // коробку ставят на стол: падает и чуть подпрыгивает
    PZ.stage = 'wait'; await new Promise(ok => { PZ.tap = e => { aim(e); if (ray.intersectObject(hb, true)[0]) ok(); }; }); }
  PZ.stage = 'open'; $('toast').classList.remove('on'); for (const m of mats) m.emissive.setScalar(GLOW);
  if (!CAP) { const { lid, tuck, flaps, tape } = P.userData, back = x => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2, tuckAt = f => f < 0.32 ? 0 : f < 1.2 ? -1.3 * sm((f - 0.32) / 0.88) : -1.3 + 0.3 * sm((f - 1.2) / 0.9);   // язычок загнут внутрь, пока не выйдет над бортиком, потом разгибается
  const lidTo = (f0, f1, dur) => ptw(dur, e => { const f = f0 + (f1 - f0) * sm(e); lid.rotation.x = -f; tuck.rotation.x = tuckAt(f); });
  SN(['tear1', 'tear3'], { vol: 0.8 }); lidTo(0, 0.36, 0.3); after(0.12).then(() => { burst(hb.localToWorld(V(0, -d / 2, h + 0.01)), 40, 0.9); const y0 = tape.position.y, z0 = tape.position.z;   // наклейка отклеивается и падает
    ptw(0.7, e => { tape.position.set(0.03 * e, y0 - 0.2 * e * e, z0 + 0.05 * e); tape.rotation.set(1.6 * e, 0, 0.8 * e); tape.material.opacity = 0.55 * (1 - e); }).then(() => { tape.visible = false; }); });
  await after(0.3); SN('tear2', { vol: 0.6 }); lidTo(0.36, 2.45, 0.65); await after(0.48); ptw(0.45, e => { const q = back(e); flaps[0].rotation.z = 2.6 * q; flaps[1].rotation.z = -2.6 * q; }); await after(0.17); }   // крышка за вертикаль: изнанкой к лампе она светилась панелью за фигуркой
  await figP; const fh = CAP ? 0.13 : Math.min(0.16, h * 0.7), m = PZ.fig = new THREE.Mesh(FIG[k].geo, FIG[k].mat), rank = NUM[k]?.[1] ?? 0; m.castShadow = true; hb.add(m);
  const col = new THREE.Color(RANKC[rank]); rayM.color.copy(col).multiplyScalar(0.75); halo.material.color.copy(col); fxL.color.copy(col); PZ.fxK = 0;
  if (CAP) { const { top, bot, mats: cm, r } = P.userData;   // капсула (стенд E openCap): верх раскручивается, половинки расходятся и тают, фигурка ×0.35 выходит из центра и растёт
    m.scale.setScalar(fh * 0.35); m.position.set(0, 0, r * 0.6); m.visible = false;   // модель — рост 1 м: сразу уменьшить и спрятать в капсуле, иначе полсекунды во весь экран
    SN('twist', { vol: 0.8 }); await ptw(0.6, e => { top.rotation.y = 2.6 * sm(e); top.position.y = 0.004 * sm(e); }); SN(['pop1', 'pop2', 'pop3']); SN('sparkle', { vol: 0.6 }); burst(hb.localToWorld(V(0, 0, r + 0.02)), 45, 0.9, rank === 2); FX.visible = true; m.visible = true;
    ptw(0.6, e => { const q = sm(e); top.position.set(-0.06 * q, 0.004 + 0.05 * q, -0.04 * q); top.rotation.z = 1.1 * q; bot.position.set(0.05 * q, -0.01 * q, 0.03 * q); bot.rotation.z = -0.7 * q; for (const c of cm) c.opacity = 1 - sm((e - 0.35) / 0.65); }).then(() => { P.visible = false; });
    await ptw(0.9, e => { const q = sm(e); m.scale.setScalar(fh * (0.35 + 0.65 * q)); m.position.z = r * 0.6 * (1 - q); PZ.fxK = e; }); }
  else if (HS.isBlind(mid)) await packetOut(m, k, fh, rank, [w, h, d], hb);   // блайндбокс: пакетик, рвётся свайпом
  else { m.scale.setScalar(fh * 0.45); m.position.set(0, 0, 0.004); m.rotation.z = 0.5; PZ.balls.kick(); FX.visible = true; SN('foam', { vol: 0.8 }); SN('sparkle', { vol: 0.6 });   // фигурка выходит из коробки сквозь шарики
    if (rank === 2) burst(hb.localToWorld(V(0, 0, h + 0.15)), 60, 1.1, true);
    await ptw(1.0, e => { const q = sm(e); m.position.z = 0.004 + (h + 0.06) * q; m.scale.setScalar(fh * (0.45 + 0.55 * sm((q - 0.7) / 0.3))); m.rotation.z = 0.5 * (1 - q); PZ.fxK = e; }); }   // в коробке — уменьшенная (подставка не проходит сквозь стенки), растёт, когда выходит над бортом
  await after(0.6); scene.attach(m); const p0 = m.position.clone(), up = V(0, 1, 0).applyQuaternion(camera.quaternion), p1 = camera.position.clone().addScaledVector(camera.getWorldDirection(V()), 0.42).addScaledVector(up, -fh * 0.55);
  await ptw(0.5, e => m.position.lerpVectors(p0, p1, sm(e)));   // «в руку»: к камере, дальше — HOLD квартиры (тот же жест, что взять фигурку с полки)
  const L = [...unopened()], bi = L.indexOf(mid); if (bi >= 0) { L.splice(bi, 1); if (SAVE) SAVE.set?.({ boxes: L }); else DEMO = L; }   // в руке — коробка открыта: из неоткрытых
  m.userData.slot = { fig: k, ser: PZ.ser, mesh: null }; hold(m); HOLD.rz = 0; HOLD.lock = true; HOLD.scene.add(FX); m.removeFromParent(); PZ.fig = null; fxL.intensity = 0;
  PZ.stage = 'hand'; $('carry').style.display = 'none'; $('put').textContent = T.shelf; toast(`<em>${T.fresh}</em> ${figName(k)}${SER[PZ.ser]?.bs ? ` · ${T.ser(SER[PZ.ser].name)}` : ''}<br>${T.turn}`, 0); };
async function packetOut(m, k, fh, rank, [w, h, d], hb) {   // блайндбокс (стенд E, pack=blind): пакетик выходит сквозь пенопласт и встаёт перед коробкой, свайп сверху вниз — рвётся, фигурка 1:1 видна в щели и поднимается с лучами
  const PH = 0.2, PF = -PH / 2 + 0.017, white = f => { const I = HS.IMG[f], c = document.createElement('canvas'); c.width = I.width; c.height = Math.round(I.height * 0.92); const g = c.getContext('2d'); g.drawImage(I, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, c.width, c.height); return c; };   // тёмный силуэт без подставки (белые на фольге читались пятнами)
  const M4 = THREE.Matrix4, pk = PZ.pk = makePacket({ W: 0.165, H: PH, sils: SF[k].s.figs.map(white), look: packetLook(HS.bsOf(PZ.mid)?.st),
    inside: { geo: FIG[k].geo, matrix: new M4().makeTranslation(0, PF, 0).multiply(new M4().makeRotationX(-Math.PI / 2)).multiply(new M4().makeScale(fh, fh, fh)) } });   // фольга облегает фигурку: её z вверх → y пакетика, лицо −y → +z
  pk.rotation.x = Math.PI / 2; pk.traverse(o => { if (o.isMesh) o.castShadow = true; }); hb.add(pk); m.visible = false;   // y пакетика → вверх, лицо → к игроку
  const a = V(0, 0, PH / 2 + 0.005), b = V(0, 0, h + PH / 2 + 0.03), c = V(w / 2 + 0.125, -0.02, PH / 2 + 0.002), b2 = V(c.x, c.y, b.z); pk.position.copy(a); PZ.balls.kick();   // встаёт справа от коробки: под лампой коробка у переднего края стола, впереди места нет
  const cw = hb.localToWorld(c.clone()), n = nrmOf(wrz(Z.desk)); flyTo(LOCS.findIndex(l => l.id === 'desk'), frameOf({ room: 'cab', n, it: [{ p: cw, z: [cw.z - PH / 2, cw.z + PH / 2], n, s: { ser: 'desk' } }] }));   // камера — к пакетику крупно
  await ptw(1.6, e => { const u = sm(e / 0.42), v = sm((e - 0.42) / 0.3), q = sm((e - 0.72) / 0.28); pk.position.lerpVectors(a, b, u); if (v > 0) pk.position.lerpVectors(b, b2, v); if (q > 0) pk.position.lerpVectors(b2, c, q); });   // вверх над бортом и створками, вбок, вниз — не сквозь стенку
  m.scale.setScalar(fh); m.position.set(c.x, c.y, c.z + PF); m.rotation.z = 0; m.visible = true;   // фигурка внутри 1:1 — видна в щели разрыва
  PZ.stage = 'packet'; $('toast').classList.remove('on'); await new Promise(ok => { PZ.torn = ok; }); PZ.stage = 'open'; SN('tear2'); SN('sparkle', { vol: 0.6 });   // подсказка — рукой на пакетике (cueNow)
  const o = pk.getWorldPosition(V()); burst(o.clone().add(V(0, 0, 0.04)), 70, 1.0, rank === 2); FX.visible = true;
  ptw(0.9, e => pk.userData.set(1, e)).then(() => { pk.visible = false; });   // половинки разлетаются
  const z0 = m.position.z; await ptw(0.8, e => { m.position.z = z0 + 0.1 * sm(e); PZ.fxK = e; }); }   // фигурка выходит из щели с лучами
const tearH = () => { const P = PZ.pk, H = P.userData.h; return Math.abs(scr2(P.localToWorld(V(0, H / 2, 0)))[1] - scr2(P.localToWorld(V(0, -H / 2, 0)))[1]) || 200; };   // высота пакетика на экране, px
PZ.tearMove = e => { const T_ = PZ.tear, P = PZ.pk, p = Math.min(1, T_.p0 + Math.max(0, e.clientY - T_.y0) / tearH() * 1.3);   // рвётся за ~3/4 высоты
  if (p > P.userData.p + 0.04) burst(P.localToWorld(V(0, P.userData.tipY(p), P.userData.B)), 3, 0.35); P.userData.set(p); if (p >= 1) { PZ.tear = null; PZ.torn(); } };
PZ.tearUp = e => { const T_ = PZ.tear; PZ.tear = null; if (Math.hypot(e.clientX - T_.x0, e.clientY - T_.y0) < 10 && PZ.stage === 'packet') { const p0 = PZ.pk.userData.p; ptw(0.45, q => PZ.pk.userData.set(p0 + (1 - p0) * sm(q))).then(() => PZ.torn()); PZ.stage = 'tearing'; } };   // тап вместо свайпа — рвётся сам (одной рукой)
PZ.toShelf = async () => {
  if (PZ.stage !== 'hand') return; PZ.stage = 'shelf'; HOLD.lock = false; unhold(); $('put').textContent = T.put; scene.add(FX); FX.visible = false;
  const { k, mid } = PZ, s = freeOf(PZ.ser); if (!s) { pzClean(); busy = false; toast(T.noSpot); return; }
  let li = LOCS.findIndex(l => l.ser === s.ser); if (li < 0) li = LOCS.findIndex(l => l.room === s.room);
  await flyTo(li); pzClean(); const tg = clusters(true).find(g => g.it.some(o => o.s === s)), [tx, ty] = scr2(s.pos); if (tg) await flyTo(li, partOf(tg, tx, ty));   // к стеллажу серии, потом крупно к месту
  showGhost(s, k, mid); busy = false; toast(T.ghost, 0); };
PZ.close = () => { HOLD.lock = false; unhold(); pzClean(); busy = false; $('put').textContent = T.put; };
{ const B = $('boxes'); B.ariaLabel = B.title = EN ? 'Unopened boxes' : 'Неоткрытые коробки'; B.onclick = () => { if (fl || busy || drag || PZ.stage || HOLD.m) return; toDesk(); };   // к неоткрытым коробкам: число — как у «Коллекции» в зале
  setInterval(() => { const n = unopened().length, on = n > 0 && !PZ.stage && !(LOCS[cur].id === 'desk' && !focus) && !focus?.desk; B.style.display = on ? '' : 'none'; if (on) B.lastChild.textContent = n; }, 400); }   // ponytail: опрос 0,4 с — коробки меняют сборка, распаковка и стенд
$('demo').onclick = () => { if (fl || drag || PZ.stage) return; if (!SAVE && !DEMO.length) DEMO = Q.get('demo')?.split(',') ?? Array.from({ length: +(Q.get('boxes') ?? 6) }, (_, i) => `H${i % 3 + 1}-${i}`); toDesk(); };   // стенд: выигранные коробки (?boxes=N, до 20) на стол
if (EMBED) { const d = $('demo'); d.textContent = '‹'; d.setAttribute('aria-label', T.hall); d.title = T.hall; document.body.classList.add('embed'); d.onclick = () => { PZ.home = 0; parent.Home?.hide(); }; $('stat').style.display = 'none'; }   // в игре: назад в зал; демо распаковки придёт из игры; клавиши H нет — только кнопкой (Яндекс 1.15)

// --- Цикл: перелёт, снег, пылинки, кинескоп, часы, мерцание, замер
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fov(); if (fl) return; if (!focus) return place(cur); focus = focus.desk ? deskF() : frameOf(focus.g); camera.position.copy(focus.p); camera.lookAt(focus.t); curT.copy(focus.t); });   // крупный план при повороте экрана — пересчитать, не выкидывать
for (const L of LOCS) L.st = clusters(true).filter(g => g.room === L.room).sort((p, q) => q.it.filter(L.find).length - p.it.filter(L.find).length)[0];   // мебель остановки
fov(); place(cur);
// прогрев шейдеров и текстур всех комнат (иначе первый заход в комнату рвёт перелёт, кадр до 229 мс, 22.10) — кусками в фоне: по 1 материалу (копия меша в малой сцене, свет и туман квартиры), текстуры — до 8 мс подряд; __apt.ready() — готово
const READY = (async () => { const seen = new Set(), todo = [], texs = new Set();
  scene.traverse(o => { if (!o.isMesh || !vis(o) || !o.layers.test(camera.layers)) return; for (const mt of [o.material].flat()) { if (seen.has(mt)) continue; seen.add(mt); todo.push([o, mt]); for (const v of Object.values(mt)) if (v?.isTexture) texs.add(v); } });
  for (let i = 0; i < todo.length; i++) { const sc = new THREE.Scene(); for (const [o, mt] of todo.slice(i, i + 1)) { const c = new THREE.Mesh(o.geometry, mt); c.receiveShadow = o.receiveShadow; sc.add(c); } await renderer.compileAsync(sc, camera, scene); await idle(); }
  let t = performance.now(); for (const v of texs) { renderer.initTexture(v); if (performance.now() - t > 8) { await idle(); t = performance.now(); } } })();
const collected = () => ({ n: new Set(SLOTS.map(s => s.fig).filter(Boolean)).size, m: (parent !== window && new Set(parent.MACHINES?.filter(x => /^H[1-3]-/.test(x.id)).map(x => HS.figOf(x.id))).size) || 27 });   // разных фигурок, не автоматов (H1-S, 24.10: 28 автоматов — 27 фигурок)   // «Коллекция · открыто n из m» (меню зала, boxiki-a3): n — разных фигурок в квартире, m — автоматов залов 1–3. ponytail: n — из сохранений, когда они будут
const clock = new THREE.Clock(); let fN = 0, fT = 0, cpuT = 0, tvK = 0; const ST = window.__apt = { ms: 0, cpu: 0, calls: 0, tris: 0, place, count: collected, ready: () => READY, flyTo, prize: PZ, LOCS, SLOTS, camera, scene, R, clusters, frameOf, partOf, hold, FIGS, LC, LVx, lightFor, bakeSet, nameMats, MATS, ROOMS_B, BXS, figLoad, setFig, unhold, get focus() { return focus; } };   // для проверки со стенда
let lastL = 0;
const loop = now => {
  if (now - lastL < 12) return; lastL = now;                                     // не больше 60 кадров/с (экран 120 Гц — каждый второй), пользователь 24.10
  const dt =Math.min(clock.getDelta(), 0.05), T = clock.elapsedTime, t0 = performance.now();
  if (fl) stepFlight(dt); PZ.step(dt, T); carryFrame();
  for (const s of SNOW) s.material.uniforms.t.value = T; for (const d of DUST) d.material.uniforms.t.value = T; ghostMat.uniforms.t.value = T;
  for (let i = ANIM.length - 1; i >= 0; i--) { const a = ANIM[i]; a.t += dt / 0.4; const k = a.t >= 1 ? 1 : 1 + Math.sin(a.t * Math.PI) * 0.25 * (1 - a.t) - (1 - a.t) * (1 - a.t) * 0.5; a.m.scale.setScalar(a.s * k); if (a.t >= 1) ANIM.splice(i, 1); }
  if (R.zal.visible && ++tvK % 3 === 0) { const c = tvCtx, W = 96, Hh = 72; TVF = 0.55 + 0.45 * Math.random(); c.fillStyle = `rgb(${30 + TVF * 40},${45 + TVF * 50},${80 + TVF * 70})`; c.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(${150 + Math.random() * 100},${170 + Math.random() * 80},255,${Math.random() * 0.35})`; c.fillRect(Math.random() * W, Math.random() * Hh, Math.random() * 40, Math.random() * 30); }
    c.fillStyle = 'rgba(0,0,0,.25)'; for (let y = (T * 40) % 4; y < Hh; y += 4) c.fillRect(0, y, W, 1.5); tvScr.needsUpdate = true; }
  if (HANDS?.[0]) { const d = new Date(), m = d.getMinutes() + d.getSeconds() / 60; HANDS[0].rotation.z = -((d.getHours() % 12) + m / 60) / 12 * Math.PI * 2; HANDS[1].rotation.z = -m / 60 * Math.PI * 2; }
  TAGS.style.visibility = fl || HOLD.m ? 'hidden' : ''; if (focus && !fl) tagsFrame(); lights(T); renderer.render(scene, camera); if (HOLD.m) holdFrame(dt);   // подписи — только когда камера встала   // в руке подписи полок не видны
  cpuT += performance.now() - t0; fT += dt; fN++;
  if (fT > 1) { ST.ms = fT / fN * 1000; ST.cpu = cpuT / fN; ST.calls = renderer.info.render.calls; ST.tris = renderer.info.render.triangles;
    $('stat').textContent = `${ST.ms.toFixed(1)} мс/кадр · ЦП ${ST.cpu.toFixed(1)} мс\n${ST.calls} вызовов · ${(ST.tris / 1000).toFixed(0)} тыс. треуг.`; fT = cpuT = 0; fN = 0; }
};
renderer.setAnimationLoop(loop);
ST.pause = () => renderer.setAnimationLoop(null); ST.resume = () => { clock.getDelta(); renderer.setAnimationLoop(loop); if (unopened().length && !PZ.stage && !ghost) toDesk(true); };   // home.js: невидимая сторона не рисуется
$('load').style.opacity = 0; setTimeout(() => $('load').remove(), 700); ST.tLoad = performance.now();   // замер открытия
if (EMBED && !parent.Home?.on) ST.pause(); else if (EMBED && unopened().length) toDesk(true);   // догрузилась, когда уже показана (первая коробка): сразу к окну с коробками   // фоном не рисовать: первый кадр — загрузка текстур и сборка шейдеров одним куском (158 мс); прогрев — кусками, READY
if (!EMBED && Q.get('demo')) READY.then(() => $('demo').click());   // стенд: ?demo=H2-8~zhar_ptitsa~1,… — эти коробки сразу на стол (призы секретных автоматов — блайндбоксы)
