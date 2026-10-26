// hall_style.js — облик игры в стиле A «Тёплый зал» (стенд style_lab/lab.js, вариант A; выбран пользователем 22.10):
// материалы, свой корпус автомата по размерам зала M.cab, комната зала, свет, отделка головы (голова 2hsq и «фонарь» зала), печать коробки серии с фигуркой.
// Физику не трогает: геомы корпуса cab_* ставит Drive.machine, здесь — только облик вокруг них. Мир MuJoCo: z вверх, метры, ось опорных прутков — z 0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { STYLES, loadFonts, blind, isEN } from './boxstyles.js';
import { P } from './platform.js';
import { NAMES, NAMES_EN, FIG, SERIES, figOf as seriesFig, seriesOf } from './series.js';   // серии фигурок по залам и автоматам

export const LOW = matchMedia('(pointer: coarse)').matches;                   // телефон: без transmission и bloom (решение 21.10)
export const STYLE = new URLSearchParams(location.search).get('style') === 'a' ? 'a' : 'k';   // k — «Киоск», советский синий с тёплым (по умолчанию с 22.10, GAME_BUILD.md §2): зал холодный, тёплые только автоматы; a — «Тёплый зал»
const K = STYLE === 'k';
if (K) document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;inset:0;pointer-events:none;z-index:1;background:radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(4,6,10,.55) 100%)"></div><svg style="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:.07;mix-blend-mode:overlay"><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#grain)"/></svg>`);   // «Киоск»: виньетка и зерно — CSS/SVG поверх холста, видеокарте почти бесплатно
export const BLOOM = null;                                                     // bloom снят и на ПК (22.10: подлагивает, упор в пиксели); «неон» — яркий цвет × 3
const RIG_Z = 0.96;                                                            // рейка каретки — как в index.html

// --- Помощники (как в lab.js)
const MISS = { n: 0 }, REDRAW = [];                                    // картинки фигурок догружаются после старта (IMG_ALL): печать, нарисованная без своей картинки, перерисуется, когда все придут
const tex = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'), m0 = MISS.n; draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (MISS.n > m0) REDRAW.push(() => { if (g.reset) g.reset(); else { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); } draw(g, w, h); t.needsUpdate = true; });
  return t; };
const mesh = (geo, mat, x = 0, y = 0, z = 0, cast = true) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; return o; };
const rbox = (w, d, h, r = 0.02, seg = 3) => new RoundedBoxGeometry(w, d, h, seg, r);
const rr = (w, h, r, cx = 0, cy = 0) => { const p = new THREE.Shape(), X = v => cx + v, Y = v => cy + v;
  p.moveTo(X(-w + r), Y(-h)); p.lineTo(X(w - r), Y(-h)); p.quadraticCurveTo(X(w), Y(-h), X(w), Y(-h + r)); p.lineTo(X(w), Y(h - r)); p.quadraticCurveTo(X(w), Y(h), X(w - r), Y(h));
  p.lineTo(X(-w + r), Y(h)); p.quadraticCurveTo(X(-w), Y(h), X(-w), Y(h - r)); p.lineTo(X(-w), Y(-h + r)); p.quadraticCurveTo(X(-w), Y(-h), X(-w + r), Y(-h)); return p; };
const oct = (hx, hy, c) => new THREE.Shape([[hx, hy - c], [hx - c, hy], [-hx + c, hy], [-hx, hy - c], [-hx, -hy + c], [-hx + c, -hy], [hx - c, -hy], [hx, -hy + c]].map(([x, y]) => new THREE.Vector2(x, y)));   // восьмиугольник «фонаря» (make_claw_geo.mjs)
const radial = (inner, outer) => tex(128, 128, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const blob = (w, h, a = 0.55) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: radial(`rgba(0,0,0,${a})`, 'rgba(0,0,0,0)'), transparent: true, depthWrite: false })); o.renderOrder = -1; return o; };   // мягкая контактная тень
const Sm = (c, r = 0.55, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const glow = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

// --- Материалы геомов физики (имена — как ждёт index.html; их не освобождает пересборка buildGeoms)
export const MAT = {
  chrome: Sm(0xd9d0ca, 0.3, { metalness: 1 }),                                 // прутки, боковые трубы
  acrylic: new THREE.MeshStandardMaterial({ color: 0xff9fc0, roughness: 0.15, transparent: true, opacity: 0.72 }),   // без transmission и на ПК: он рисует сцену второй раз за кадр (пользователь 22.10: подлагивает)
  rubber: Sm(0xf6d9e1, 0.7),
  head: Sm(0xfff1e6, 0.28),
  glass: new THREE.MeshStandardMaterial({ color: 0xffe9f0, roughness: 0.2, transparent: true, opacity: 0.35 }),   // щиток за прутком 4 (мир 2hsq)
  pane: Sm(0xfff0f4, 0.04, { transparent: true, opacity: 0.1, depthWrite: false }),   // стёкла зала: без transmission — сквозь него не пропадают акриловые руки
  clamp: Sm(0xff8fa8, 0.45), rail: Sm(0xfbf3ee, 0.4),                     // хомуты; боковые рейки прутков — белые, как у реальных
  shelf: Sm(0xfbf5f2, 0.5), wall: Sm(0xfbf3ee, 0.6),   // лоток витрины (cab_s: матовый акрил на белой раме), стенка под ним до шахты (cab_g)
  metal: Sm(0xcfc6c0, 0.35, { metalness: 0.8 }), trolley: Sm(0xff8fa8, 0.4),
  accent: Sm(0xff8fa8, 0.35), screen: Sm(0x2b1a2a, 0.15), glowA: glow(0xff6f9e, 3.2), glowB: glow(0xffd28a, 3.5),
};

// --- Печать коробки серии «Mixy Pals» (как E на стенде): 6 граней canvas, на лицевой — фигурка приза. Бренд — только наш «boxiki».
const FJ = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", sans-serif', FL = 'Fredoka, ' + FJ;
const PT = { rose: '#e2577f', deep: '#8e2f63', ink: '#5a2148', gold: '#d9a748', cream: '#fff6ef' };
export const TOYS = NAMES;
try { await document.fonts.ready; await Promise.all(['700 40px Fredoka', '800 40px "M PLUS Rounded 1c"', '500 40px "M PLUS Rounded 1c"'].map(f => document.fonts.load(f, 'Mixy Pals ミクシーパルズ プルチキ 小枝 PRUTIKI ТЮЛЕНЬ призовая'))); } catch (e) { console.warn('шрифты', e); }
const IMG0 = {}; export const IMG = new Proxy(IMG0, { get: (o, k) => { const v = o[k]; if (v === undefined && typeof k === 'string' && k in TOYS) MISS.n++; return v; } });   // картинки фигурок с вырезанным фоном (toys_concepts/cut), обрезка по альфе; нет ещё — счёт для перерисовки
const imgOne = k => new Promise((ok, no) => { const i = new Image();
  i.onload = () => { const c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true }); c.width = i.width; c.height = i.height; g.drawImage(i, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const t = document.createElement('canvas'); t.width = x1 - x0 + 2; t.height = y1 - y0 + 2; t.getContext('2d').drawImage(c, -x0, -y0); IMG0[k] = t; ok(t); };
  i.onerror = () => no(`нет toys_concepts/cut/${k}_768.webp`); i.src = new URL(`toys_concepts/cut/${k}_768.webp`, import.meta.url).href; });
await Promise.all([...new Set(['koschei', 'tyulen_chainik', ...SERIES.filter(s => s.hall === 1).flatMap(s => [...s.figs, s.secret])])].filter(k => k in TOYS).map(imgOne));   // до старта — только зал 1 (с него начинает каждый новый игрок) и фигурки заставки; 36 картинок были 2,5 МБ на пути к первому экрану
export const IMG_ALL = new Promise(r => { addEventListener('p-ready', r, { once: true }); setTimeout(r, parent === window ? 120e3 : 0); })   // остальные — после готовности игры (P.ready), чтобы не делить полосу со стартом; во фрейме квартиры — сразу; запас 120 с (на Slow 4G старт дольше 15 с — короткий запас снова пускал их до старта)
  .then(() => Promise.all(Object.keys(TOYS).filter(k => !IMG0[k]).map(k => imgOne(k).catch(e => console.warn('картинка', e))))).then(() => REDRAW.splice(0).forEach(f => f()));   // квартира ждёт их (apt.js)
const mOf = id => String(id ?? '').split('~')[0];                    // приз секретного автомата — 'H1-8~<фигурка>~<k>' (ui.js): автомат до «~»
export const figOf = id => String(id ?? '').split('~')[1] ?? seriesFig(id);   // фигурка автомата — по таблице series.js; у приза секретного — своя
const SER = { name: 'Mixy Pals', jp: 'ミ ク シ ー パ ル ズ', size: 'фигурка ~13 см', total: 6 };
const drawFit = (g, img, cx, cy, w, h) => { if (!img) return; const k = Math.min(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k; g.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih); };
const fitText = (g, t, x, y, maxW) => { const w = g.measureText(t).width; if (w > maxW) { g.save(); g.translate(x, y); g.scale(maxW / w, 1); g.fillText(t, 0, 0); g.restore(); } else g.fillText(t, x, y); };
let seed = 1; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
function flower(g, x, y, r, rot, fill) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = fill;
  for (let i = 0; i < 5; i++) { g.rotate(Math.PI * 2 / 5); g.beginPath(); g.ellipse(0, -r * 0.52, r * 0.36, r * 0.52, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(0, 0, r * 0.14, 0, Math.PI * 2); g.fill(); g.restore(); }
function petals(g, W, H, n, cols, a, s = 7) { seed = s; g.globalAlpha = a; for (let i = 0; i < n; i++) flower(g, rnd() * W, rnd() * H, (0.025 + 0.035 * rnd()) * Math.min(W, H) * 1.4, rnd() * 6, cols[i % cols.length]); g.globalAlpha = 1; }
function logo(g, x, y, s, fill = '#fff', stroke = PT.deep, jp = PT.deep) {
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.font = `700 ${s}px ${FL}`; g.lineWidth = s * 0.2; g.strokeStyle = stroke; g.strokeText(SER.name, x, y); g.fillStyle = fill; g.fillText(SER.name, x, y);
  flower(g, x + g.measureText(SER.name).width / 2 + s * 0.12, y - s * 0.42, s * 0.3, 0.3, PT.gold);
  if (jp) { g.font = `800 ${s * 0.3}px ${FJ}`; g.fillStyle = jp; g.fillText(SER.jp, x, y + s * 0.7); }
}
function face(g, W, H, f) {                                           // лицевая: фигурка, логотип, имя
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#ffd0df'); bg.addColorStop(0.5, '#fde6ef'); bg.addColorStop(1, '#e3d2ff'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const gl = g.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.7); gl.addColorStop(0, 'rgba(255,255,255,.95)'); gl.addColorStop(0.55, 'rgba(255,255,255,.4)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.fillRect(0, 0, W, H);
  petals(g, W, H, 30, ['#ffffff', '#ffb0c8', '#f28db0', '#d7c2ff'], 0.6);
  drawFit(g, IMG[f], W / 2, H * 0.5, W * 0.86, H * 0.6);
  g.fillStyle = PT.rose; g.fillRect(0, 0, W, H * 0.125);                                         // верхняя лента с фестоном
  for (let x = W * 0.04; x < W; x += W * 0.08) { g.beginPath(); g.arc(x, H * 0.125, W * 0.04, 0, Math.PI); g.fill(); }
  logo(g, W / 2, H * 0.055, W * 0.15, '#fff', PT.deep, '#ffe3ec');
  g.fillStyle = PT.deep; g.beginPath(); g.roundRect(W * 0.08, H * 0.835, W * 0.84, H * 0.07, H * 0.035); g.fill();
  g.fillStyle = '#fff'; g.font = `700 ${H * 0.042}px ${FL}`; fitText(g, TOYS[f], W / 2, H * 0.872, W * 0.78);
  g.fillStyle = PT.deep; g.font = `500 ${H * 0.016}px ${FJ}`; g.fillText(isEN() ? 'prize figure · not for sale' : 'призовая фигурка · не для продажи', W / 2, H * 0.94);
  g.fillStyle = 'rgba(142,47,99,.75)'; g.font = `700 ${H * 0.018}px ${FL}`; g.textAlign = 'left'; g.fillText('boxiki', W * 0.06, H * 0.965); g.textAlign = 'center';
  g.strokeStyle = 'rgba(217,167,72,.9)'; g.lineWidth = W * 0.008; g.beginPath(); g.roundRect(W * 0.025, H * 0.015, W * 0.95, H * 0.97, W * 0.03); g.stroke();
}
function side(g, W, H, f, dir) {                                     // боковая: логотип и имя вдоль длины
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#e86791'); bg.addColorStop(1, '#a93d78'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  petals(g, W, H, 16, ['#ffffff', '#ffc4d6'], 0.22, 3);
  g.fillStyle = PT.cream; g.fillRect(0, 0, W, H * 0.06); g.fillRect(0, H * 0.94, W, H * 0.06);
  g.save(); g.translate(W / 2, H / 2); g.rotate(-dir * Math.PI / 2);
  logo(g, 0, -W * 0.13, W * 0.2, '#fff', PT.deep, '#ffe3ec');
  g.fillStyle = '#fff'; g.font = `700 ${W * 0.1}px ${FL}`; fitText(g, TOYS[f], 0, W * 0.2, H * 0.85); g.restore();
}
function end(g, W, H) {                                               // торцы: полоски и эмблема
  g.fillStyle = PT.cream; g.fillRect(0, 0, W, H); g.fillStyle = '#ffd6e3';
  for (let x = -H; x < W; x += W * 0.14) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + W * 0.07, H); g.lineTo(x + W * 0.07 + H, 0); g.lineTo(x + H, 0); g.fill(); }
  g.fillStyle = PT.rose; g.beginPath(); g.arc(W / 2, H * 0.44, H * 0.26, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = H * 0.025; g.beginPath(); g.arc(W / 2, H * 0.44, H * 0.21, 0, Math.PI * 2); g.stroke();
  flower(g, W / 2, H * 0.44, H * 0.2, 0.2, '#fff');
  g.fillStyle = PT.deep; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${H * 0.1}px ${FL}`; g.fillText(SER.name, W / 2, H * 0.83);
}
function back(g, W, H, f) {
  g.fillStyle = PT.cream; g.fillRect(0, 0, W, H); petals(g, W, H, 20, ['#ffc4d6', '#e4d3ff'], 0.5, 11);
  logo(g, W / 2, H * 0.1, W * 0.13, PT.rose, '#fff');
  drawFit(g, IMG[f], W * 0.3, H * 0.45, W * 0.5, H * 0.46);
  g.fillStyle = PT.ink; g.textAlign = 'left'; g.font = `800 ${W * 0.05}px ${FJ}`; fitText(g, TOYS[f], W * 0.6, H * 0.3, W * 0.36);
  g.font = `500 ${W * 0.035}px ${FJ}`; [SER.size, `серия из ${SER.total}`, 'только для', 'призовых автоматов'].forEach((t, i) => g.fillText(t, W * 0.6, H * (0.35 + i * 0.03)));
  g.fillStyle = '#222'; for (let i = 0; i < 34; i++) g.fillRect(W * 0.62 + i * W * 0.008, H * 0.86, W * (i % 3 ? 0.003 : 0.005), H * 0.06);
}
// печать коробки — стиль серии зала из boxstyles.js (RESEARCH_BOX_UI.md §2.2); &box=prize|minimal|retro|kraft|kiosk|pharma — один стиль на всё, &box=pink — старая розовая «Mixy Pals»
const QB = new URLSearchParams(location.search).get('box');
const HALL_BOX = { 1: 'kraft', 2: 'fairy', 3: 'prize', 4: 'retro', 5: 'kiosk' };   // серия зала (GAME_BUILD.md §2); H5 «Дежурные» пользователь не отмечал
export const isBlind = id => /^H\d+-8$/.test(mOf(id));                // секретный автомат зала (самый трудный, Hn-8): приз — блайндбокс серии, фигурку не показывать нигде до вскрытия
export const bsOf = id => QB === 'pink' ? null : STYLES[QB] ?? (isBlind(id) ? blind(HALL_BOX[seriesOf(mOf(id)).hall], 'c') : STYLES[HALL_BOX[/^H\d/.test(id ?? '') ? seriesOf(id).hall : 0]]) ?? STYLES.kraft;   // блайндбокс — вариант «Тень героя» (выбор пользователя 23.10)   // печать — по серии фигурки (на Hn-1/7 — «Кухонные звери», series.js ZOO — и коробка их)
let bsNow = bsOf(''); await Promise.all([loadFonts(), parent === window && Promise.race([P.init(), new Promise(r => setTimeout(r, 3000))])]);   // печать — на языке площадки: ждём SDK (не дольше 3 с); во фрейме квартиры язык уже есть у игры                              // серия текущего автомата — ставит fit()
const SHORT = new Proxy({}, { get: (_, k) => (isEN() && NAMES_EN[k]) || NAMES[k] }), NUM = Object.fromEntries(Object.entries(FIG).map(([k, v]) => [k, [v.no, v.rank]]));   // номер в серии, редкость (2 — секретная), как на стенде E
const SIL = {}; const silOf = k => SIL[k] ?? (IMG[k] ? SIL[k] = (() => { const I = IMG[k], c = document.createElement('canvas'); c.width = I.width; c.height = I.height; const g = c.getContext('2d'); g.drawImage(I, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#3a1830'; g.fillRect(0, 0, c.width, c.height); return c; })() : null);   // картинки ещё нет — null (перерисуется)
const serOf = f => ({ fig: SHORT[f], short: SHORT[f], num: NUM[f][0], rank: NUM[f][1], get img() { return IMG[f]; }, get sil() { return silOf(f); }, all: [...FIG[f].s.figs, FIG[f].s.secret].filter(Boolean).map(k => ({ get img() { return IMG[k]; }, get sil() { return silOf(k); }, name: SHORT[k], no: NUM[k][0], rank: NUM[k][1] })) });
const K_PX = LOW ? 28 : 40;                                           // пикселей на см печати
const boxMat = (w, h, f) => new THREE.MeshStandardMaterial({ map: tex(Math.round(w * K_PX), Math.round(h * K_PX), f), roughness: 0.42 });
const CACHE = new Map();                                              // печать по серии, фигурке и размеру: подмена автомата при перелёте её не перерисовывает (рисование canvas — 100+ мс); keep — не освобождать (drop, buildGeoms)
const cached = (k, make) => { let v = CACHE.get(k); if (!v) { v = make(); [v].flat().forEach(m => { m.userData.keep = true; }); CACHE.set(k, v); } return v; };
const dropCache = () => { CACHE.forEach(v => [v].flat().forEach(m => { m.map?.dispose(); m.dispose(); })); CACHE.clear(); };   // смена серии (другой зал): ponytail: внутри зала кэш не чистится, ≤ 9 коробок + 4 витрины + 4 постера
export const boxMats = (s, f, BS = bsNow) => cached(`b|${BS?.series}|${f}|${s.map(v => v.toFixed(4))}`, () => boxMats0(s, f, BS));
export const standMats = (f, x, y, z, BS = bsNow) => cached(`s|${BS?.series}|${f}|${x}|${y}|${z}`, () => standMats0(f, x, y, z, BS));
function boxMats0(s, f, BS) {                                         // коробка плашмя (полуразмеры геома, м); грани BoxGeometry: +x −x +y −y +z −z; +z — лицевая, +y — к голове фигурки
  const [x, y, z] = s.map(v => 200 * v);
  if (BS) { const S = serOf(f); return [boxMat(z, y, (g, W, H) => BS.side(g, W, H, 1, S)), boxMat(z, y, (g, W, H) => BS.side(g, W, H, -1, S)), boxMat(x, z,   // грани как у настоящей коробки, стоящей головой (+y) вверх; заголовок бока — корешком (boxstyles), читается и лёжа
    (g, W, H) => BS.end(g, W, H, S)), boxMat(x, z, (g, W, H) => BS.end(g, W, H, S)), boxMat(x, y, (g, W, H) => BS.face(g, W, H, S)), boxMat(x, y, (g, W, H) => BS.back(g, W, H, S))]; }
  return [boxMat(z, y, (g, W, H) => side(g, W, H, f, 1)), boxMat(z, y, (g, W, H) => side(g, W, H, f, -1)), boxMat(x, z, end), boxMat(x, z, end), boxMat(x, y, (g, W, H) => face(g, W, H, f)), boxMat(x, y, (g, W, H) => back(g, W, H, f))];
}
export const standPaint = (BS, S, x, y, z) => [                     // стоячая коробка BoxGeometry(x, y, z), z — вверх, лицо −y: [w, h, рисование] граней +x −x +y −y +z −z (см печати).
  [z, y, (g, W, H) => { g.translate(0, H); g.rotate(-Math.PI / 2); BS.side(g, H, W, 1, S); }], [z, y, (g, W, H) => { g.translate(W, 0); g.rotate(Math.PI / 2); BS.side(g, H, W, -1, S); }],   // у ±x три.js кладёт u вдоль z — бок повернуть, иначе лёжа и растянут
  [x, z, (g, W, H) => { g.translate(W, H); g.rotate(Math.PI); BS.back(g, W, H, S); }], [x, z, (g, W, H) => BS.face(g, W, H, S)], [x, y, (g, W, H) => BS.end(g, W, H, S)], [x, y, (g, W, H) => { g.translate(W, H); g.rotate(Math.PI); BS.end(g, W, H, S); }]];   // +y: у три.js верх картинки — вниз; −z (дно, видно у лежащей коробки квартиры) у три.js повёрнуто на 180°
function standMats0(f, x, y, z, BS) {                                // стоячая коробка витрины: лицом к игроку (−y)
  if (BS) return standPaint(BS, serOf(f), x, y, z).map(([w, h, fn]) => boxMat(w, h, fn));
  return [boxMat(y, z, (g, W, H) => side(g, W, H, f, 1)), boxMat(y, z, (g, W, H) => side(g, W, H, f, -1)), boxMat(x, z, (g, W, H) => back(g, W, H, f)), boxMat(x, z, (g, W, H) => face(g, W, H, f)), boxMat(x, y, end), boxMat(x, y, end)];
}

// --- Корпус: тумба с вырезом под шахту, пульт с двумя кнопками, стойки, задник, шапка с вывеской, световые полосы. D — размеры по стёклам и шахте
const FD = '"Dela Gothic One", sans-serif', FO = '"Onest", sans-serif';   // вывески по-русски: гротеск с кириллицей (шрифты грузит boxstyles.loadFonts)
function signTex(bg, fg, sub, bs = bsNow, hall = '') {                // вывеска японского автомата
  return tex(1024, 220, (g, W, H) => {
    g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, W, H, 60); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg; g.font = `800 ${H * 0.5}px ${FJ}`; g.fillText('プルチキ', W / 2, H * 0.43);   // японская вывеска — название игры катаканой (пользователь 26.10 через boxiki-23: «ハシワタシ» → «プルチキ», Poki — без чужих названий)
    g.fillStyle = sub; g.font = `700 ${H * 0.16}px ${FL}`; g.fillText('P R U T I K I   ·   小 枝', W / 2, H * 0.83);
  });
}
function posterTex(c0, c1, logoFill, logoStroke, figs, bs = bsNow, f = 'tyulen_chainik') {
  return tex(1024, 970, (g, W, H) => {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, c0); bg.addColorStop(1, c1); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (bs) {                                                          // постер серии: коробка лицом в центре, по бокам фигурки серии в тёплом свете
      const S = serOf(f), o = S.all.filter(t => t.img !== S.img).slice(0, 2);
      o.forEach((t, i) => { const x = W * (i ? 0.84 : 0.16), r = g.createRadialGradient(x, H * 0.6, 0, x, H * 0.6, W * 0.22); r.addColorStop(0, 'rgba(255,190,120,.35)'); r.addColorStop(1, 'rgba(255,190,120,0)');
        g.fillStyle = r; g.fillRect(0, 0, W, H); drawFit(g, t.img, x, H * 0.6, W * 0.26, H * 0.5); });
      const fh = H * 0.86, fw = fh * 0.6; g.save(); g.translate((W - fw) / 2, (H - fh) / 2); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 30; g.fillStyle = '#000'; g.fillRect(0, 0, fw, fh); g.shadowColor = 'transparent';
      bs.face(g, fw, fh, S); g.restore(); return;
    }
    petals(g, W, H, 22, ['#ffffff', '#ffc4d6', '#f7a6c2'], 0.18, 5);
    logo(g, W / 2, H * 0.2, W * 0.13, logoFill, logoStroke, logoStroke);
    if (figs) { g.globalAlpha = 0.9; drawFit(g, IMG.koschei, W * 0.3, H * 0.62, W * 0.5, H * 0.52); drawFit(g, IMG.tyulen_chainik, W * 0.7, H * 0.64, W * 0.5, H * 0.46); g.globalAlpha = 1; }
  });
}
const glassTex = () => tex(512, 512, (g, W, H) => {                    // блики на стекле — косые мягкие полосы
  g.clearRect(0, 0, W, H); g.save(); g.translate(W / 2, H / 2); g.rotate(-0.6);
  for (const [x, w, a] of [[-150, 70, 0.22], [-60, 18, 0.18], [120, 46, 0.12]]) { const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - w, -H, 2 * w, 2 * H); }
  g.restore();
});
const P0 = {                                                           // корпус главного автомата (гамма A)
  flap: Sm(0x6a2f55, 0.12, { transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),   // дымчатая шторка короба выдачи (стенд E)
  body: Sm(0xf8e4d6, 0.4), body2: Sm(0xff9cb2, 0.45), pillar: Sm(0xffb3c4, 0.36),   // корпус японский в любом зале: автоматы «привезли в глубинку» (пользователь 22.10)
  deck: Sm(0x7a4466, 0.7), chute: Sm(0x4a2440, 0.85, { side: THREE.BackSide }), chuteGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.2, 1.2), map: tex(512, 384, (g, W, H) => {   // дно шахты: подсветка и наклейка «景品GET!» (как у реальных)
    const r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6); r.addColorStop(0, '#ff7aa8'); r.addColorStop(1, '#3a1430'); g.fillStyle = r; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.font = `800 ${H * 0.2}px ${FJ}`; g.lineWidth = H * 0.035; g.strokeStyle = '#8e2f63'; g.strokeText('景品 GET!', W / 2, H * 0.42); g.fillStyle = '#ffe9a8'; g.fillText('景品 GET!', W / 2, H * 0.42);
    g.font = `800 ${H * 0.09}px ${FJ}`; g.fillStyle = '#fff'; g.fillText('▼ 落とし口 ▼', W / 2, H * 0.66); }) }), dark: Sm(0x2b1a2a, 0.5),
  btn1: Sm(0xff5d8f, 0.3, { emissive: 0xff2d6f, emissiveIntensity: 0.6 }), btn2: Sm(0x64d8e8, 0.3, { emissive: 0x1fb0c8, emissiveIntensity: 0.6 }), glowA: MAT.glowA, glowB: MAT.glowB,
  sign: new THREE.MeshBasicMaterial({ map: signTex('#3a1f33', '#ffd7e4', '#ffb070'), color: new THREE.Color(1.6, 1.6, 1.6) }),
  prizeSign: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.4), map: tex(400, 100, (g, W, H) => { g.fillStyle = '#3a1f33'; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, H * 0.22); g.fill(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd7e4'; g.font = `700 ${H * 0.62}px ${FL}`; g.fillText(isEN() ? 'PRIZE ▼' : 'ПРИЗ ▼', W / 2, H * 0.55); }) }),   // табличка над коробом выдачи (как в E)
  ceil: glow(0xfff0dc, 1.2),
  glass: new THREE.MeshBasicMaterial({ map: glassTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.25, side: THREE.DoubleSide }),
};
const posterMat = (bs, f) => cached(`p|${bs?.series}|${f}`, () => Sm(0xffffff, 0.8, { map: posterTex('#7a3f68', '#4e2645', '', '', false, bs, f) }));   // постер серии на задней стенке
function cabinet(D, poster) {                                         // корпус — один и тот же у активного и у соседей (иначе при подмене видно «перестроение»)
  const P = P0, { front: f, back: b, side: w, sf, sb } = D, G = new THREE.Group(), add = o => { G.add(o); return o; };
  const y0 = f - 0.03, y1 = b + 0.042, cy = (y0 + y1) / 2, hd = (y1 - y0) / 2, hw = w + 0.21;             // тумба: 3 см перед передним стеклом, 4 см за задним
  const outer = rr(hw, hd, 0.07); outer.holes.push(rr(w, (sb - sf) / 2, 0.004, 0, (sf + sb) / 2 - cy));
  add(mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.88, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 12 }), [P.deck, P.body], 0, cy, -0.94));   // верх деки ≈ −0.048 (прутки на 0); дыра — шахта
  add(mesh(new THREE.BoxGeometry(2 * w - 0.04, sb - sf - 0.035, 0.36), P.chute, 0, (sf + sb) / 2, -0.23, false));   // шахта изнутри (BackSide: сверху видны стенки и дно)
  add(mesh(new THREE.PlaneGeometry(2 * w - 0.06, sb - sf - 0.055), P.chuteGlow, 0, (sf + sb) / 2, -0.405, false));
  const con = add(mesh(rbox(2 * hw - 0.26, 0.17, 0.08, 0.03), P.body2, 0, y0 - 0.07, -0.075)); con.rotation.x = -0.22;   // пульт
  for (const [x, c] of [[-0.17, P.btn1], [0.17, P.btn2]]) {
    add(mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.03, 32).rotateX(Math.PI / 2), c, x, y0 - 0.08, -0.02)).rotation.x = -0.22;
    add(mesh(new THREE.TorusGeometry(0.058, 0.006, 8, 40), P.glowA, x, y0 - 0.084, -0.033, false)).rotation.x = -0.22;
  }
  { const x = -(hw - 0.3), y = y0 - 0.01, z = -0.6, HD = 0.17, HW = 0.3, HH = 0.22, t = 0.012, hood = add(new THREE.Group());   // короб выдачи приза (стенд E, lab.js buildE): стенки, дымчатая шторка на шарнире у верхнего края, «ПРИЗ ▼»; ui.js кладёт туда выигранную коробку и достаёт её
    const frame = (W, H, w, h, d) => { const S = new THREE.Shape([[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]].map(([a, b]) => new THREE.Vector2(a, b))); S.holes.push(new THREE.Path([[-w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2]].map(([a, b]) => new THREE.Vector2(a, b)))); return new THREE.ExtrudeGeometry(S, { depth: d, bevelEnabled: false }).rotateX(Math.PI / 2); };   // рамка из плоскости xz, вытянута к игроку (−y)
    hood.add(mesh(frame(HW + 2 * t, HH + 2 * t, HW, HH, HD), P.body2, x, y, z), mesh(frame(HW + 2 * t + 0.006, HH + 2 * t + 0.006, HW + 2 * t - 0.006, HH + 2 * t - 0.006, 0.006), P.glowA, x, y - HD + 0.002, z, false));   // стенки и неоновый кант по краю
    const back = mesh(new THREE.PlaneGeometry(HW, HH), P.dark, x, y - 0.006, z, false); back.rotation.x = Math.PI / 2; hood.add(back, mesh(new THREE.PlaneGeometry(HW, HD), P.dark, x, y - HD / 2, z - HH / 2 + 0.001, false));   // задник и дно; задник — на 4 мм перед корпусом (фаска корпуса на y − 0.002: в одной плоскости мерцал)
    const sign = mesh(new THREE.PlaneGeometry(0.2, 0.05), P.prizeSign, x, y - 0.004, z + HH / 2 + t + 0.04, false); sign.rotation.x = Math.PI / 2; hood.add(sign);
    const flap = new THREE.Group(); flap.position.set(x, y - HD - 0.003, z + HH / 2); hood.add(flap);   // шарнир — верхний передний край; закрыта — висит вниз
    const fl = mesh(new THREE.PlaneGeometry(HW - 0.004, HH - 0.004), P.flap, 0, 0, -HH / 2, false); fl.rotation.x = Math.PI / 2; flap.add(fl, mesh(new THREE.BoxGeometry(0.12, 0.01, 0.012), P.glowA, 0, -0.006, -HH + 0.025, false));   // и ручка
    G.userData.hood = { flap, g: hood, x, y, z, HD, HH }; }
  add(mesh(rbox(0.16, 0.025, 0.2, 0.02), P.body2, hw - 0.28, y0 - 0.01, -0.56)); add(mesh(new THREE.BoxGeometry(0.06, 0.01, 0.012), P.glowB, hw - 0.28, y0 - 0.026, -0.52, false));   // монетник
  { const cs = new THREE.Group(), W = 0.09, D = 0.06, H = 0.085, fy = -D / 2 - 0.002; add(cs); cs.position.set(-0.4, y0 - 0.075, -0.035 + H / 2);   // монетоприёмник на пульте слева от кнопок (выбор пользователя 23.10, стенд coin.html А; ход в 3 шага — сначала жетон): хромированный блок, щель в оранжевой подсветке, кнопка возврата
    cs.add(mesh(rbox(W, D, H, 0.012), MAT.metal, 0, 0, 0), mesh(new THREE.BoxGeometry(0.026, 0.003, 0.064), P.glowB, 0, fy, 0.012, false), mesh(new THREE.BoxGeometry(0.008, 0.004, 0.048), P.dark, 0, fy - 0.001, 0.012, false), mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 20), P.btn2, 0, fy, -0.018, false)); }
  for (const s of [-1, 1]) add(mesh(new THREE.BoxGeometry(0.012, 2 * hd - 0.04, 0.014), P.glowA, s * (hw + 0.012), cy, -0.9, false));   // полосы у пола
  add(mesh(new THREE.BoxGeometry(2 * hw - 0.04, 0.012, 0.014), P.glowA, 0, y0 - 0.018, -0.9, false));
  for (const [x, y] of [[-1, f + 0.005], [1, f + 0.005], [-1, b + 0.007], [1, b + 0.007]]) add(mesh(rbox(0.075, 0.075, 1.1, 0.03), P.pillar, x * (hw - 0.035), y, 0.49));
  for (const s of [-1, 1]) add(mesh(new THREE.BoxGeometry(0.014, 0.008, 0.98), P.glowA, s * (hw - 0.035), f - 0.036, 0.49, false));   // полосы на передних стойках
  add(mesh(rbox(2 * hw + 0.04, 2 * hd + 0.04, 0.32, 0.1, 4), P.body, 0, cy, 1.19, false));                 // шапка
  add(mesh(new THREE.PlaneGeometry(2 * hw - 0.26, 0.22), P.sign, 0, y0 - 0.022, 1.19, false)).rotation.x = Math.PI / 2;
  add(mesh(new THREE.BoxGeometry(2 * hw - 0.08, 0.012, 0.014), P.glowA, 0, y0 - 0.022, 1.055, false));
  add(mesh(new THREE.PlaneGeometry(2 * hw - 0.14, 2 * hd - 0.1), P.ceil, 0, cy, 1.028, false)).rotation.x = Math.PI;
  G.userData.poster = add(mesh(new THREE.PlaneGeometry(2 * hw - 0.14, 1.08), poster, 0, b + 0.002, 0.49, false)); G.userData.poster.rotation.x = Math.PI / 2;
  const o = mesh(new THREE.PlaneGeometry(2 * hw - 0.14, 0.98), P.glass, 0, f - 0.006, 0.53, false); o.rotation.x = Math.PI / 2; o.renderOrder = 2; o.receiveShadow = false; add(o);   // блики — только на переднем стекле
  for (const s of [-1, 1]) add(mesh(new THREE.BoxGeometry(0.025, b - f - 0.05, 0.02), MAT.metal, s * (w + 0.12), (f + b) / 2, RIG_Z + 0.025));   // рельсы каретки
  return G;
}
// Сосед — то, что у активного рисует физика (index.html buildGeoms): стёкла и лоток корпуса (Drive.machine, cab_*), хомуты и боковые трубы прутков
function statics(G, C, bars) {
  if (C) { const t = 0.003, H = 0.9, Z = 0.3, w = C.glass, dy = (C.back - C.front) / 2, sh = (C.back - C.shelf) / 2, gz = [-0.05, C.shelf_z];
    const box = (mat, [x, y, z], [a, b, c]) => G.add(mesh(new THREE.BoxGeometry(2 * a, 2 * b, 2 * c), mat, x, y, z, mat !== MAT.pane));
    box(MAT.pane, [0, C.front - t, Z], [w, t, H]); box(MAT.pane, [0, C.back + t, Z], [w, t, H]); box(MAT.pane, [-w - t, C.front + dy, Z], [t, dy, H]); box(MAT.pane, [w + t, C.front + dy, Z], [t, dy, H]);
    box(MAT.shelf, [0, C.shelf + sh, C.shelf_z - 0.0195], [w, sh, 0.0195]); box(MAT.wall, [0, C.shelf - t, (gz[0] + gz[1]) / 2], [w, t, (gz[1] - gz[0]) / 2]); }
  const TX = C ? C.bar_half + 0.012 : 0.42, TZ = -0.02, ys = [];
  for (const [y, z, , , sk = 0] of bars) for (const s of [-1, 1]) { const a = sk * Math.PI / 180, yy = y + s * TX * Math.tan(a), h = z - TZ + 0.013;   // ось прутка со скосом — в точке трубы
    G.add(mesh(new THREE.BoxGeometry(0.03, 0.026, h), MAT.clamp, s * TX, yy, TZ + h / 2 - 0.006)); ys.push(yy); }
  const y0 = Math.min(...ys) - 0.05, y1 = Math.max(...ys) + 0.05;
  for (const s of [-1, 1]) G.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, y1 - y0, 24), MAT.rail, s * TX, (y0 + y1) / 2, TZ));
}

// --- Сцена: комната зала, соседние автоматы, свет. Возвращает декор автомата: каретка (её двигает syncGeoms) и fit(cab, id) — корпус под уровень
const GL = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), FIG3D = {}, FIGS = {};                   // FIGS — уже загруженные: витрина ставит фигурку сразу, без мигания на подмене автомата
let figGate = null; export const gateFigs = p => { figGate = p; };   // ui.js: до готовности игры (P.ready) — только первая фигурка (приз активного автомата), витрины соседей и предзагрузка зала — после: не отнимают полосу у старта (Poki: начальная загрузка ≤ 5 МБ)
export const fig3d = f => FIG3D[f] ??= (figGate && Object.keys(FIG3D).length ? figGate : Promise.resolve()).then(() => GL.loadAsync(new URL(`toys_concepts/game/${f}.glb`, import.meta.url).href)).then(g => {   // фигурка для игры (KTX2 + meshopt, ~1 МБ, как в квартире; было _1024.glb по 8–10 МБ — архив Яндекса 85 → ~50 МБ): y вверх → z вверх, рост 16 см, ступни в 0
  let m = null; g.scene.updateMatrixWorld(true); g.scene.traverse(n => { if (n.isMesh && !m) m = n; });
  const src = m.geometry, geo = new THREE.BufferGeometry();                // квантованные атрибуты (Int16) → float: поворот и масштаб иначе портят их
  for (const nm of ['position', 'normal', 'uv']) { const a = src.getAttribute(nm); if (a) geo.setAttribute(nm, new THREE.BufferAttribute(Float32Array.from({ length: a.count * a.itemSize }, (_, i) => a.getComponent(i / a.itemSize | 0, i % a.itemSize)), a.itemSize)); }
  if (src.index) geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(src.index.array), 1));
  geo.applyMatrix4(m.matrixWorld); geo.rotateX(Math.PI / 2); geo.computeBoundingBox(); const b = geo.boundingBox, k = 0.16 / (b.max.z - b.min.z);   // узел несёт масштаб квантования
  geo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z).scale(k, k, k); geo.computeBoundingSphere(); return FIGS[f] = { geo, mat: m.material }; });
export let HOOD = null;                                                // короб выдачи активного автомата (ui.js: забрать приз)
export const REST = {}, CLAWS = {};                                    // покой автомата по id: коробка (матрица геома) и голова после settle, тип рук; лапа на старте по типу рук (группа «от головы») — считает index.html (предрасчёт зала)
export const SP = 1.45;                                                 // шаг ряда автоматов в зале, м (корпус ≈ 1.25 м + проход)
export let prep = () => {};                                           // HS.prep(id) — до перелёта к id через несколько автоматов (ставит hall())
export const slot = d => ({ x: SP * d, y: 0, rz: 0 });                    // место соседа в ряду (d = ±1…); по нему летит камера Hall.go (index.html); зал сдвигается под активный автомат — fit()
const X0 = -10, X1 = 22, LEN = X1 - X0, CX = (X0 + X1) / 2;              // зал в своих координатах: автомат №n стоит в x = n·SP, концы уходят в туман
// пол зала — выбор в настройках (HUD «настройки автомата»): terrazzo — мраморная крошка с латунными швами (одобрено 22.10), lino — линолеум, parquet — ёлочка (вышел слабо)
export const FLOORS = { terrazzo: 'мраморная крошка', lino: 'линолеум', parquet: 'паркет ёлочкой' };
let floorKind = (() => { const q = new URLSearchParams(location.search).get('floor'); try { return FLOORS[q] ? q : FLOORS[localStorage.getItem('floor')] ? localStorage.getItem('floor') : 'terrazzo'; } catch { return FLOORS[q] ? q : 'terrazzo'; } })();
let floorMat = null;
function floorTex(kind) {
  let seedF = 3; const rf = () => (seedF = seedF * 16807 % 2147483647) / 2147483647;
  const t = !K ? tex(256, 256, (g, W) => { g.fillStyle = '#e7cdbd'; g.fillRect(0, 0, W, W); g.fillStyle = '#9b6378'; g.fillRect(0, 0, W / 2, W / 2); g.fillRect(W / 2, W / 2, W / 2, W / 2); })
    : kind === 'lino' ? tex(512, 512, (g, W) => { g.fillStyle = '#7b4c34'; g.fillRect(0, 0, W, W);   // 1 текстура = 1 м: «плитка» 25 см, выцветший узор, потёртости
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const x = i * W / 4, y = j * W / 4, c = W / 8; g.fillStyle = (i + j) % 2 ? 'rgba(220,170,120,.16)' : 'rgba(40,20,10,.12)'; g.fillRect(x + 3, y + 3, W / 4 - 6, W / 4 - 6);
          g.strokeStyle = 'rgba(230,190,140,.18)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + c, y + 10); g.lineTo(x + 2 * c - 10, y + c); g.lineTo(x + c, y + 2 * c - 10); g.lineTo(x + 10, y + c); g.closePath(); g.stroke(); }
        for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(30,15,8,${0.04 + 0.06 * rf()})`; g.beginPath(); g.ellipse(rf() * W, rf() * W, 20 + 60 * rf(), 8 + 20 * rf(), rf() * 3, 0, 7); g.fill(); } })
    : kind === 'parquet' ? tex(512, 512, (g, W) => { g.fillStyle = '#4a2e1c'; g.fillRect(0, 0, W, W);   // ёлочка: дощечки 7×35 см под 45°
        g.save(); g.translate(W / 2, W / 2); g.rotate(Math.PI / 4); const L = W * 0.35, T = W * 0.07;
        for (let r = -12; r <= 12; r++) for (let c = -12; c <= 12; c++) { const x = c * L / 2 + (r % 2 ? L / 4 : 0), y = r * T * 2; const hue = 24 + 6 * rf(), l = 30 + 10 * rf();
          g.fillStyle = `hsl(${hue},45%,${l}%)`; g.save(); g.translate(x, y); g.rotate(((r + c) & 1) ? Math.PI / 2 : 0); g.fillRect(-L / 2 + 1, -T / 2 + 1, L - 2, T - 2); g.restore(); }
        g.restore(); })
    : tex(1024, 1024, (g, W) => { g.fillStyle = '#8f8b84'; g.fillRect(0, 0, W, W);   // терраццо: цементная основа + крошка белого, чёрного, рыжего и серого мрамора; 1 текстура = 1 м, по краю латунный шов
        const C = ['#e9e5dc', '#d8d3c8', '#2b2b2c', '#4a4744', '#9c5c3e', '#b7b2a8', '#c9a882'];
        for (let k = 0; k < 26000; k++) { g.fillStyle = C[(rf() * C.length) | 0]; const x = rf() * W, y = rf() * W, r = 1 + rf() * rf() * 7; g.beginPath(); g.moveTo(x + r, y); for (let a = 1; a < 6; a++) g.lineTo(x + Math.cos(a * 1.25 + rf()) * r, y + Math.sin(a * 1.25 + rf()) * r); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, W, W); g.fillStyle = '#a8864a'; g.fillRect(0, 0, W, 4); g.fillRect(0, 0, 4, W); });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(K ? LEN : LEN / 0.6, K ? 7.6 : 7.6 / 0.6); return t;
}
export const floorNow = () => floorKind;
export function setFloor(kind) {                                      // смена пола из настроек; выбор помнится в localStorage
  if (!FLOORS[kind] || !floorMat) return; floorKind = kind; try { localStorage.setItem('floor', kind); } catch {}
  floorMat.map.dispose(); floorMat.map = floorTex(kind); floorMat.roughness = K && kind === 'terrazzo' ? 0.3 : 0.45; floorMat.needsUpdate = true;
}
const SHARED = new Set([...Object.values(P0), ...Object.values(MAT)]);   // общие материалы корпуса — не освобождать
const drop = g => g.traverse(o => { if (o.isMesh && !o.userData.keep) { o.geometry.dispose(); [o.material].flat().forEach(m => { if (!SHARED.has(m) && !m.userData.keep) { m.map?.dispose(); m.dispose(); } }); } });
const STAND = Sm(0xffffff, 0.2, { transparent: true, opacity: 0.45 }); SHARED.add(STAND);
function showcase(C, f, g, alive, bs = bsNow, bl = false) {          // bl — секретный автомат: только блайндбоксы, без фигурки на подставке                                   // витрина на лотке cab_s: фигурка приза на подставке и две коробки с ней (как у призовых автоматов)
  const z0 = C.shelf_z, [x, y, z] = [0.15, 0.1, 0.22], M = standMats(f, 100 * x, 100 * y, 100 * z, bs);
  for (const px of [-0.25, 0.25]) g.add(mesh(new THREE.BoxGeometry(x, y, z), M, px, C.back - 0.075, z0 + z / 2));
  if (bl) return;
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.008, 32).rotateX(Math.PI / 2), STAND, 0, C.shelf + 0.12, z0 + 0.004));   // прозрачная подставка
  const put = F => { const o = mesh(F.geo, F.mat, 0, C.shelf + 0.12, z0 + 0.008); o.rotation.z = 0.35; o.userData.keep = true; g.add(o); };
  if (FIGS[f]) put(FIGS[f]); else fig3d(f).then(F => { if (alive()) put(F); }).catch(e => console.warn('фигурка', f, e));   // загруженная — сразу, в том же кадре
}
const DEF = { front: -0.33, back: 0.738, side: 0.43, sf: -0.1, sb: 0.345 };   // без зала (мир 2hsq, категории 1–6): как на стенде
export function hall(scene, renderer) {
  GL.setKTX2Loader(new KTX2Loader().setTranscoderPath(new URL('vendor/three@0.170.0/examples/jsm/libs/basis/', import.meta.url).href).detectSupport(renderer));   // текстуры фигурок — KTX2 (путь как в apt.js: сборка Яндекса кладёт jsdelivr в vendor/)
  const room = new THREE.Group(); scene.add(room);                      // длинный зал: пол, стена, пилястры, лампы; fit() сдвигает его под активный автомат (перелёт Hall.go виден по залу)
  floorMat = Sm(0xffffff, K && floorKind === 'terrazzo' ? 0.3 : 0.45, { map: floorTex(floorKind) });
  room.add(mesh(new THREE.PlaneGeometry(LEN, 7.6), floorMat, CX, -1.4, -0.95, false));          // пол зала
  const panel = tex(8, 512, (g, W, H) => { const p = H * (1 - 1.5 / 4.2); g.fillStyle = '#c3c7c8'; g.fillRect(0, 0, W, p); g.fillStyle = '#35587a'; g.fillRect(0, p, W, H - p); g.fillStyle = '#1f3448'; g.fillRect(0, p - 4, W, 6); });   // масляная панель 1.5 м от пола + побелка
  const wall = mesh(new THREE.PlaneGeometry(LEN, 4.2), K ? Sm(0xffffff, 0.75, { map: panel }) : Sm(0x4a2a3f, 0.9), CX, 2.4, 1.15, false); wall.rotation.x = Math.PI / 2; room.add(wall);
  room.add(mesh(new THREE.BoxGeometry(LEN, 0.05, 0.95), Sm(K ? 0x262b33 : 0x34192b, 0.8), CX, 2.37, -0.48, false), mesh(new THREE.BoxGeometry(LEN, 0.08, 0.05), Sm(K ? 0x4a5058 : 0x8b5a3c, 0.5), CX, 2.34, 0.0, false));
  for (let x = X0; x <= X1; x += 0.62) room.add(mesh(new THREE.BoxGeometry(0.5, 0.02, 0.6), Sm(K ? 0x2c323a : 0x3d2032, 0.8), x, 2.34, -0.5, false));
  const pool = new THREE.MeshBasicMaterial({ map: radial(K ? 'rgba(170,200,255,.16)' : 'rgba(255,170,120,.16)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let x = X0 + 0.7; x <= X1; x += 3 * SP) {                        // через 3 автомата: пилястра, лампа дневного света и пятно света от неё на стене (без настоящих источников — дёшево)
    room.add(mesh(new THREE.BoxGeometry(0.34, 0.14, 4.2), K ? Sm(0xffffff, 0.75, { map: panel }) : Sm(0x3d2032, 0.8), x, 2.33, 1.15, false));
    if (K) { room.add(mesh(new THREE.BoxGeometry(1.2, 0.04, 0.035), glow(0xd6e6ff, 1.0), x + 1.5 * SP, 2.33, 1.75, false));
      const p = mesh(new THREE.PlaneGeometry(2.6, 1.8), pool, x + 1.5 * SP, 2.38, 1.45, false); p.rotation.x = Math.PI / 2; room.add(p); }
  }
  const hp = new THREE.CatmullRomCurve3(Array.from({ length: 64 }, (_, i) => { const t = i / 64 * Math.PI * 2; return new THREE.Vector3(16 * Math.sin(t) ** 3 * 0.012, 0, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.012); }), true);
  const heart = mesh(new THREE.TubeGeometry(hp, 200, 0.009, 8, true), glow(0xff5c9a, 4), 1.17, 2.32, 0.42, false); heart.scale.setScalar(0.75); if (!K) room.add(heart);   // неоновое сердце
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: radial('rgba(255,90,150,.55)', 'rgba(255,90,150,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(1.17, 2.33, 0.4); halo.rotation.x = Math.PI / 2; if (!K) room.add(halo);
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 2.6), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,   // дымка у пола перед стеной
    map: tex(4, 256, (g, W, H) => { const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, K ? 'rgba(140,170,220,.12)' : 'rgba(255,150,110,.16)'); gr.addColorStop(0.45, K ? 'rgba(130,160,210,.05)' : 'rgba(255,130,120,.06)'); gr.addColorStop(1, 'rgba(255,120,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }) }));
  haze.position.set(CX, 2.1, 0.35); haze.rotation.x = Math.PI / 2; haze.renderOrder = 1; room.add(haze);
  const sh = blob(1.9, 1.8, 0.65); sh.position.set(0, 0.2, -0.935); scene.add(sh);
  // свет: тёплая лампа в шапке (тени), потолочный свет зала, полусфера, пятна на стене, розовый у пола. Всё, что светит на активный автомат и ближних соседей, — в rig:
  // при перелёте rig едет с камерой (fly), на подмене встаёт обратно — свет относительно автоматов тот же, скачка нет. Число ламп постоянно (нет соседа — яркость 0), иначе шейдеры пересобираются
  const rig = new THREE.Group(); scene.add(rig);
  const TI = K ? 3.0 : 1.7, PI = K ? 1.6 : 1.4, topL = (x, sh) => { const t = new THREE.SpotLight(K ? 0xffcf95 : 0xffe9d2, TI, 0, 0.95, 0.6, 0); t.position.set(x + 0.05, -0.2, 1.0); t.target.position.set(x - 0.03, 0.15, 0); t.castShadow = sh; rig.add(t, t.target); return t; };
  const pinkL = x => { const p = new THREE.PointLight(0xff6f9e, PI, 2.2, 2); p.position.set(x, -0.7, -0.75); rig.add(p); return p; };   // свой розовый свет автомата у пола
  const decal = (m, w, h, x, y, z, wall) => { const p = mesh(new THREE.PlaneGeometry(w, h), m, x, y, z, false); if (wall) p.rotation.x = Math.PI / 2; rig.add(p); };   // пятно вместо лампы: свет считается на каждом пикселе, пятно — нет
  const top = topL(0, true); pinkL(0);   // розовый не заменить пятном: он красит низ корпуса (проверено снимком 22.10)
  top.shadow.camera.near = 0.3; top.shadow.camera.far = 2.5; top.shadow.mapSize.setScalar(1024); top.shadow.bias = -0.0004; top.shadow.normalBias = 0.003; top.shadow.radius = 3;
  const hl = new THREE.SpotLight(K ? 0x9fb4e0 : 0xffcfa0, K ? 1.2 : 9, 0, 0.45, 1, 2); hl.position.set(0.4, -1.7, 2.4); hl.target.position.set(0, 0.1, -0.1);
  rig.add(hl, hl.target); scene.add(K ? new THREE.HemisphereLight(0x6a7aa0, 0x0a0c10, 0.18) : new THREE.HemisphereLight(0xffe0cc, 0x4a2838, 0.45));
  // телефон: 2 пятна света на стене — нарисованные, не лампы (каждая лампа считается на каждом пикселе; бюджет дешёвого Android 2–4, остаются верхняя, розовая, зал, перед + полусфера)
  for (const x of [-1.05, 1.05]) { if (LOW) { decal(pool, 2.0, 2.4, x, 2.37, 0.95, true); continue; } const s = new THREE.SpotLight(K ? 0xb8ccff : 0xffb070, K ? 1.5 : 18, 0, 0.55, 0.9, 2); s.position.set(x, 1.5, 2.9); s.target.position.set(x, 2.4, 0.9); rig.add(s, s.target); }
  if (K) { const fr = new THREE.PointLight(0xffb070, 1.1, 1.8, 2); fr.position.set(0, -0.75, 0.45); rig.add(fr); }   // автомат сам светит на свой перед (тёплый островок в холодном зале)
  const nl = LOW ? [] : [-1, 1].map(d => [d, topL(slot(d).x, false), pinkL(slot(d).x)]);   // соседи ±1: лампа в шапке без теней и розовый (дальние — в тумане)
  let cur = '';
  const has = d => { const m = /^H(\d+)-(\d+)$/.exec(cur); return m ? +!!window.MACHINES?.some(x => x.id === `H${m[1]}-${+m[2] + d}`) : +(Math.abs(d) <= 1); };
  function fly(dx) {                                                  // dx — сдвиг камеры к соседу (index.html flyStep); на краю зала свет соседа плавно гаснет / загорается
    rig.position.x = dx; const k = Math.abs(dx) / SP, s = Math.sign(dx);
    for (const [d, t, p] of nl) { const on = (1 - k) * has(d) + k * has(d + s); t.intensity = TI * on; p.intensity = PI * on; }
  }
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = K ? 0.08 : 0.22;
  const bg = K ? 0x0b0e14 : 0x2a1824; scene.background = new THREE.Color(bg); scene.fog = K ? new THREE.Fog(bg, 3.5, 9) : new THREE.Fog(bg, 3.0, 6.0);   // «Киоск»: туман только для дальнего зала — при отъезде камеры автомат не гаснет (пользователь 22.10)
  if (K) for (const m of [MAT.glowA, MAT.glowB, P0.sign, P0.ceil, P0.chuteGlow]) m.fog = false;   // свет пробивает дымку
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  // каретка: балка, тележка, трос — двигает syncGeoms (index.html); рельсы — в корпусе
  const beam = mesh(new THREE.BoxGeometry(1, 0.03, 0.022), MAT.metal, 0, 0, RIG_Z + 0.005), trolley = mesh(rbox(0.09, 0.08, 0.045, 0.012), MAT.trolley, 0, 0, RIG_Z - 0.02);
  const cable = mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 1, 8).rotateX(Math.PI / 2), MAT.metal, 0, 0, 0.5, false); scene.add(beam, trolley, cable);
  const carriage = (G, h, top, side) => {                             // каретка соседа — как у активного на старте (h — голова, top — верх корпуса головы); геометрия общая
    const rz = RIG_Z - 0.02, [b, t, c] = [beam, trolley, cable].map(o => { const k = o.clone(); k.userData.keep = true; G.add(k); return k; });
    b.position.y = h[1]; b.scale.x = 2 * (side + 0.12); t.position.set(h[0], h[1], RIG_Z); c.position.set(h[0], h[1], (top + rz) / 2); c.scale.z = Math.max(0.01, rz - top);
  };
  let cab = null, key = '', disp = null, dkey = '', cser;
  function fit(C, id) {                                               // корпус под уровень (M.cab: стёкла, полка витрины); возвращает x боковых труб
    const bs = bsOf(id), f0 = figOf(id ?? '');
    const hk = /^H\d+/.exec(id ?? '')?.[0] ?? (id ?? ''); if (hk !== cser) { dropCache(); cser = hk; }   // другой зал — другая печать; внутри зала (Hn-6/7 — следующая серия, Hn-8 — блайндбокс) кэш общий, соседи не перестраиваются
    cur = id ?? ''; room.position.x = -SP * (+(/^H\d+-(\d+)$/.exec(cur)?.[1] ?? 0));   // зал едет под активный автомат: №n стоит в x = n·SP
    bsNow = bs;
    const D = C ? { front: C.front, back: C.back, side: C.side, sf: C.front, sb: C.shelf } : DEF, k = JSON.stringify(D);   // зал: шахта от переднего стекла до края полки
    if (k !== key) { if (cab) { scene.remove(cab); drop(cab); }
      cab = cabinet(D, posterMat(bs, f0)); scene.add(cab); key = k; beam.scale.x = 2 * (D.side + 0.12); HOOD = cab.userData.hood; }
    const T = /^T-/.test(id ?? ''); cab.userData.poster.material = posterMat(bs, f0); cab.userData.poster.visible = !T;   // постер серии с фигуркой автомата; тренировка T-* — без постера, фигурки и коробок серии (boxiki-82 4161d76: на полке — свои пустые коробки)
    const f = C ? figOf(id) : '', dk = C ? `${f}|${bs?.series}|${C.shelf}|${C.back}|${C.shelf_z}` : '';   // витрина на лотке cab_s: фигурка приза на подставке и коробки с ней (как у призовых автоматов)
    if (dk !== dkey) { if (disp) { scene.remove(disp); drop(disp); disp = null; }
      dkey = dk;
      if (C && !T) { disp = new THREE.Group(); scene.add(disp); showcase(C, f, disp, () => dkey === dk, bs, isBlind(id)); }
    }
    neighbors(id); fly(0); gacha.visible = cser === 'H1';
    return C ? C.bar_half + 0.012 : 0.42;
  }
  const nbs = new Map(); let nser = null;                              // id соседа → группа; ряд ±3 (±1 видны в кадре, дальние — чтобы при перелёте никто не выскакивал)
  function neighbors(id) {                                             // соседи по залу — такие же автоматы: корпус, прутки, коробка и лапа в покое (REST, CLAWS), витрина; на краю зала соседа нет
    if (LOW) return;
    const m = /^H(\d+)-(\d+)$/.exec(id ?? ''), want = new Map();
    if (nser !== cser) { nbs.forEach(n => { scene.remove(n); drop(n); }); nbs.clear(); nser = cser; }   // другой зал — постеры и коробки другие
    if (/^T-/.test(id ?? '')) { nbs.forEach(n => { scene.remove(n); drop(n); }); nbs.clear(); return; }   // тренировка — отдельный автомат, без соседей зала 1
    for (const d of [-3, -2, -1, 1, 2, 3]) { const nid = m ? `H${m[1]}-${+m[2] + d}` : `def${d}`; if (m ? window.MACHINES?.some(x => x.id === nid) : Math.abs(d) === 1) want.set(nid, d); }
    for (const [nid, n] of nbs) if (!want.has(nid) || n.userData.bare && REST[nid]) { scene.remove(n); drop(n); nbs.delete(nid); }   // без покоя построенный — перестроить, когда покой посчитан
    const first = !nbs.size; wantNow = want;
    if (first && m) (window.MACHINES ?? []).filter(x => x.hall === +m[1] && !isBlind(x.id)).forEach((x, i) => setTimeout(() => fig3d(figOf(x.id)).catch(() => {}), 600 + 250 * i));   // фигурки витрин зала — заранее, по одной (разбор модели — ~60 мс; было — на подлёте к соседу, посреди перелёта)
    for (const [nid, d] of want) {
      const n = nbs.get(nid);
      if (n) { const p = slot(d); n.position.set(p.x, p.y, 0); n.rotation.z = p.rz; }
      else if (first || Math.abs(d) <= 1) addNb(nid, d); else if (!nq.includes(nid)) nq.push(nid);   // дальний (±2, ±3) — не в кадре подмены: по одному чуть позже (кадр подмены был 67 мс — постер, печать, загрузка текстур)
    }
    if (nq.length && !nqT) nqT = setTimeout(drain, 40);
  }
  let wantNow = new Map(), nq = [], nqT = 0;
  prep = id => { const m = /^H(\d+)-(\d+)$/.exec(id ?? ''), c = /^H(\d+)-(\d+)$/.exec(cur); if (LOW || !m || !c || m[1] !== c[1]) return;   // перелёт через 2–3 автомата (‹ › копятся): ближние соседи цели — сразу, до полёта (иначе сосед справа появлялся на глазах и строился в кадре подмены, 80–90 мс)
    for (const k of [-1, 1]) { const nid = `H${m[1]}-${+m[2] + k}`; if (nid !== cur && !nbs.has(nid) && window.MACHINES?.some(x => x.id === nid)) addNb(nid, +m[2] + k - +c[2]); } };
  function drain() { nqT = 0; const nid = nq.shift(); if (nid && wantNow.has(nid) && !nbs.has(nid)) addNb(nid, wantNow.get(nid)); if (nq.length) nqT = setTimeout(drain, 40); }
  function addNb(nid, d) { const n = build(nid, d); nbs.set(nid, n); scene.add(n); const p = slot(d); n.position.set(p.x, p.y, 0); n.rotation.z = p.rz; warm(n); }
  function warm(n) { const up = () => n.traverse(o => { for (const m of [o.material].flat()) if (m) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) { const t = m[k]; if (t?.image && !t.userData.warm) { renderer.initTexture(t); t.userData.warm = 1; } } }); up(); setTimeout(up, 1500); }   // текстуры — в видеокарту сразу, вне перелёта (иначе — на первом показе, посреди полёта); фигурка витрины грузится позже — второй проход
  function build(nid, d) {
    const M = window.MACHINES?.find(x => x.id === nid), C = M?.cab, f = figOf(M?.id ?? cur), half = C?.bar_half ?? 0.45, R = REST[nid];
    const nbs_ = bsOf(M?.id ?? cur), n = cabinet(C ? { front: C.front, back: C.back, side: C.side, sf: C.front, sb: C.shelf } : DEF, posterMat(nbs_, f));   // печать соседа — его серии (на Hn-6/7 — следующей, Hn-8 — блайндбокс), не активного
    const bars = (M?.bars ?? [[-0.047, 0, 0.0063], [0, 0, 0.0084], [0.1685, 0, 0.0084], [0.2317, 0, 0.0063]]).filter(Boolean);   // [y, z, r, μ, скос°]
    for (const b of bars) n.add(mesh(new THREE.CapsuleGeometry(b[2], 2 * half, 8, 24).rotateZ(Math.PI / 2).rotateZ((b[4] || 0) * Math.PI / 180), MAT.chrome, 0, b[0], b[1]));
    statics(n, C, bars);
    const B = window.BOXES?.find(x => x.id === M?.box)?.size ?? [0.15, 0.25, 0.138], rot = M?.box_rot || 0;   // коробка: покой после settle (REST), иначе — лежит на опорных, как ставит drive.js
    const bx = mesh(new THREE.BoxGeometry(...B), boxMats(B.map(v => v / 2), f, nbs_)); n.add(bx);
    const bp = window.Save?.get().bpose?.[nid]?.q;                        // коробка, оставленная на соседе, — прямо из сохранения (qpos: x y z, w x y z), без пересчёта физики (пользователь 23.10)
    if (bp) { bx.position.set(bp[0], bp[1], bp[2]); bx.quaternion.set(bp[4], bp[5], bp[6], bp[3]); }
    else if (R) { bx.matrixAutoUpdate = false; bx.matrix.set(...R.box); }
    else { const by = M?.box_pos?.[1] ?? (bars[1][0] + bars[2][0]) / 2, zt = Math.max(bars[1][1] + bars[1][2], bars[2][1] + bars[2][2]); bx.position.set(M?.box_pos?.[0] || 0, by, zt + B[2] / 2 + 0.002); bx.rotation.z = rot * Math.PI / 180; n.userData.bare = !!M; }
    const cl = R && CLAWS[R.arm];                                        // лапа на старте: куски «от головы» из index.html, ставим к голове соседа
    if (cl) { const c = cl.clone(); c.position.set(...R.head); n.add(c); carriage(n, R.head, R.head[2] + (R.arm === '2hsq' ? 0.106 : 0.183), C?.side ?? DEF.side); }
    if (C) showcase(C, f, n, () => [...nbs.values()].includes(n), nbs_, isBlind(M?.id));
    const sh = blob(1.9, 1.8, 0.65); sh.position.set(0, 0.2, -0.935); n.add(sh);
    return n;
  }
  const gacha = GACHA = gachaMachine(); gacha.position.set(GACHA_AT.x, GACHA_AT.y, 0); room.add(gacha);   // гача — только в зале 1
  return { beam, trolley, cable, fit, fly, gacha };
}

// --- Гача-автомат «Потеряшки» (стенд E, lab.js pack=gacha — 1:1): база 46 × 40 × 80 см с ручкой и лотком, прозрачный купол Ø54 см с капсулами Ø8.5 см; в зале 1, в начале ряда (пользователь 23.10)
export function gachaMachine() {
  const G = new THREE.Group(), add = (geo, m, x, y, z, cast = true) => { const o = mesh(geo, m, x, y, z, cast); G.add(o); return o; }, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const GW = 0.46, GD = 0.4, GH = 0.8, DR = 0.27, CR = 0.0425, FZ = -0.95, gf = -GD / 2, GT = FZ + 0.2, zc = FZ + GH + DR * 0.72;
  const pink = Sm(0xff8fb0, 0.4, { emissive: 0x7a2442 }), cream = new THREE.MeshPhysicalMaterial({ color: 0xf8e4d6, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3, emissive: 0x3a2a22 }),   // чуть светится: своего прожектора, как на стенде E, в зале нет (лишний свет — дороже кадр)
    dark = Sm(0x2b1a2a, 0.8);
  add(rbox(GW, GD, GH, 0.03), pink, 0, 0, FZ + GH / 2);
  add(new THREE.CylinderGeometry(DR * 0.74, DR * 0.78, 0.03, 48), cream, 0, 0, FZ + GH + 0.015).rotation.x = Math.PI / 2;   // воротник купола
  add(new THREE.SphereGeometry(DR, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.16, depthWrite: false }), 0, 0, zc, false).renderOrder = 2;
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.035, 40), cream, 0, 0, zc + DR + 0.012).rotation.x = Math.PI / 2;            // крышка купола
  const caps = new THREE.Group(); caps.position.set(0, 0, zc); G.add(caps); let sd = 41; const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647, ps = [];   // капсулы в куполе: два InstancedMesh (белые верхи, цветные низы)
  for (let k = 0, z = FZ + GH + CR; z < zc + DR * 0.3; z += 1.85 * CR, k++) for (let x = -DR; x <= DR; x += 2.05 * CR) for (let y = -DR; y <= DR; y += 2.05 * CR) {
    const q = V3(x + (k % 2) * CR + (rnd() - 0.5) * 0.012, y + (k % 2) * CR + (rnd() - 0.5) * 0.012, z - zc); if (q.length() < DR - CR - 0.006) ps.push(q); }
  const hg = up => new THREE.SphereGeometry(CR, 20, 10, 0, Math.PI * 2, up ? 0 : Math.PI / 2, Math.PI / 2);
  const iTop = new THREE.InstancedMesh(hg(true), new THREE.MeshPhysicalMaterial({ color: 0xf6f1f8, roughness: 0.12, clearcoat: 1 }), ps.length), iBot = new THREE.InstancedMesh(hg(false), new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 0.8 }), ps.length);
  const CC = CAPC.map(c => new THREE.Color(c)), m4 = new THREE.Matrix4(), qq = new THREE.Quaternion();
  ps.forEach((q, i) => { m4.compose(q, qq.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6)), V3(1, 1, 1)); iTop.setMatrixAt(i, m4); iBot.setMatrixAt(i, m4); iBot.setColorAt(i, CC[i % CC.length]); });
  iTop.castShadow = iBot.castShadow = true; caps.add(iTop, iBot);
  const crank = new THREE.Group(); crank.position.set(0, gf - 0.012, FZ + GH * 0.6); G.add(crank);                     // ручка: диск + перекладина, ось y — наружу из передней стенки
  crank.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.018, 40), cream), mesh(new THREE.BoxGeometry(0.17, 0.035, 0.04), Sm(0xd9a748, 0.3, { metalness: 1 }), 0, -0.022, 0));
  add(new THREE.PlaneGeometry(0.15, 0.11), dark, 0, gf - 0.001, GT + 0.065).rotation.x = Math.PI / 2;                 // выход капсулы над лотком
  add(new THREE.BoxGeometry(0.17, 0.1, 0.012), pink, 0, gf - 0.05, GT); for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.012, 0.1, 0.06), pink, s * 0.085, gf - 0.05, GT + 0.03);
  add(new THREE.BoxGeometry(0.17, 0.012, 0.035), pink, 0, gf - 0.1, GT + 0.0175); add(new THREE.BoxGeometry(0.17, 0.006, 0.006), MAT.glowA, 0, gf - 0.107, GT + 0.036, false);   // лоток со светящимся краем
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.012, 0.012, GH - 0.06), MAT.glowA, s * (GW / 2 - 0.012), -GD / 2 - 0.004, FZ + GH / 2, false);   // подсветка, как у автоматов: неон по передним рёбрам базы и кольцо у купола (пользователь: «не подсвечен никак»)
  add(new THREE.TorusGeometry(DR * 0.77, 0.006, 8, 64), MAT.glowB, 0, 0, FZ + GH + 0.032, false);
  const sh = blob(0.8, 0.7, 0.6); sh.position.set(0, 0, FZ + 0.002); G.add(sh);
  const gs = new THREE.SpotLight(0xffd6b8, 5, 0, 0.5, 0.8, 2); gs.position.set(-0.3, -1.2, FZ + 2.0); gs.target.position.set(0, 0, FZ + 0.7); G.add(gs, gs.target);   // свой прожектор, как на стенде E (lab.js gs) — без него в зале темно (пользователь 23.10); без тени; виден только в зале 1 вместе с автоматом
  G.userData = { crank, caps, tray: V3(0, gf - 0.05, GT + 0.06), out: [V3(0, gf + 0.06, GT + 0.075), V3(0, gf - 0.05, GT + 0.006 + CR)], CR, gf };   // для кручения и выкатывания капсулы (ui.js)
  return G;
}
export const GACHA_AT = { x: -0.9, y: -0.2 };   // вплотную слева к первому автомату зала 1 (пользователь 23.10: «далеко — поставь рядом»; корпус ≈ 1.25 м); в координатах зала (автомат №n — x = n·SP)
export let GACHA = null;   // автомат в сцене — ui.js крутит ручку и выкатывает капсулу
export function capsule(bot, r = 0.0425) {                          // капсула Ø8.5 см (стенд E): две непрозрачные половинки на общей оси y (верх — белый матовый, низ — цвет)
  const G = new THREE.Group(), top = new THREE.MeshPhysicalMaterial({ color: 0xf6f1f8, roughness: 0.55, clearcoat: 0.3, transparent: true, side: THREE.DoubleSide }),
    low = new THREE.MeshPhysicalMaterial({ color: bot, roughness: 0.25, clearcoat: 0.8, transparent: true, side: THREE.DoubleSide });
  const half = (m, up) => { const P = new THREE.Group(), o = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, up ? 0 : Math.PI / 2, Math.PI / 2), m); o.castShadow = true; P.add(o); G.add(P); return P; };
  G.userData = { top: half(top, true), bot: half(low, false), mats: [top, low], r }; return G;
}
export const CAPC = [0xff7aa8, 0xc8a8ff, 0x8fe3d0, 0xffd28a, 0x8cc8ff, 0xffb3c7];   // цвета низа капсул

// --- Отделка головы (система тела head, см). 2hsq — гладкая голова сцены (как на стенде A); зал — гранёный «фонарь»: восьмиугольники z 0 / 5 / 18.2, фронт −y
export function headDeco(claw) {
  const H = new THREE.Group(), cm = 0.01, part = (geo, mat, x, y, z, rx = 0) => { const o = mesh(geo, mat, x * cm, y * cm, z * cm); o.rotation.x = rx; H.add(o); return o; };
  const ext = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth: depth * cm, bevelEnabled: false, curveSegments: 20 }).scale(cm, cm, 1);
  const heart = new THREE.Shape(); heart.moveTo(0, -0.9); heart.bezierCurveTo(-1.6, 0.2, -0.9, 1.3, 0, 0.55); heart.bezierCurveTo(0.9, 1.3, 1.6, 0.2, 0, -0.9);
  if (claw === '2hsq') {
    const ring = rr(9.45, 6.95, 4.3); ring.holes.push(rr(9.0, 6.5, 3.9)); part(ext(ring, 0.8), MAT.glowA, 0, 0.15, 4.6).castShadow = false;   // светящийся пояс
    const band = rr(8.95, 6.8, 4); band.holes.push(rr(8.4, 6.25, 3.6)); part(ext(band, 1.1), MAT.accent, 0, 0, 8.3);
    part(new THREE.BoxGeometry(9.5 * cm, 0.4 * cm, 3.0 * cm), MAT.screen, 0, -6.05, 2.3, 0.183);                                   // тёмный визор на наклонной передней стенке
    part(new THREE.ShapeGeometry(heart, 12).scale(cm, cm, cm), MAT.glowB, 0, -6.32, 2.3, Math.PI / 2 + 0.183).castShadow = false;
    part(new THREE.CylinderGeometry(1.3 * cm, 1.7 * cm, 1.4 * cm, 24).rotateX(Math.PI / 2), MAT.accent, 0, 0.1, 11.2);           // втулка троса
  } else {                                                             // «фонарь» зала: эмалевая табличка с красным сердцем на заклёпках, резиновый отбойник, тёмная крышка (выбор пользователя 23.10; своя, без тёмного окна и светящегося пояса — PUBLISH §права)
    const a = Math.atan((6.22 - 4.8) / 13.2), n = [-Math.cos(a), Math.sin(a)], on = (x, zz, d, geo, mat, rx = Math.PI / 2 - a) => part(geo, mat, x, -6.22 + (zz - 5) * Math.tan(a) + d * n[0], zz + d * n[1], rx);   // на передней грани: высота zz, отступ d
    const brass = Sm(0xc9a24a, 0.35, { metalness: 0.6 }), dark = Sm(0x2a2626, 0.7);
    const belt = oct(10.21, 6.47, 3.1); belt.holes.push(oct(9.66, 5.92, 2.88)); part(ext(belt, 1.4), dark, 0, 0, 4.3);                                  // отбойник на самом широком восьмиугольнике (z 5)
    part(ext(oct(8.16, 5.09, 2.52), 1.45), dark, 0, 0, 16.9); part(new THREE.CylinderGeometry(1.3 * cm, 1.7 * cm, 1.4 * cm, 24).rotateX(Math.PI / 2), dark, 0, 0, 19.0);   // крышка z 16.9…18.35 и втулка троса
    on(0, 10.5, 0.2, ext(rr(3.8, 2.6, 0.8), 0.3), Sm(0xfffdf8, 0.25)); on(0, 10.5, 0.55, new THREE.ShapeGeometry(heart, 12).scale(1.3 * cm, 1.3 * cm, cm), Sm(0xc8333a, 0.4));
    for (const [x, z] of [[-3.2, 8.4], [3.2, 8.4], [-3.2, 12.6], [3.2, 12.6]]) on(x, z, 0.55, new THREE.SphereGeometry(0.3 * cm, 10, 8), brass);
  }
  H.matrixAutoUpdate = false; return H;
}
