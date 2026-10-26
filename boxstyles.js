// boxstyles.js — стили печати коробки по game_2hsq/RESEARCH_BOX_UI.md §2.2 (С1–С6) и «Ночной лес» (С2б). Грань — f(g, W, H, S[, dir]) на canvas.
// S — серия и фигурка: { fig — имя, num — номер, rank (0/1/2 — секретная), img — картинка фигурки на прозрачном, all — [{ img, sil, name, no, rank }] }.
// Шрифты — Google Fonts с кириллицей, OFL; loadFonts() сам подключает их стили и ждёт загрузки — вызвать перед печатью. Общий для игры (hall_style.js) и стенда (style_lab/lab.js).
const CSS = new URL('fonts/13f8e782.css', import.meta.url).href;
export const FONTS = ['400 20px "Dela Gothic One"', '600 20px "Sofia Sans Extra Condensed"', '800 20px "Sofia Sans Extra Condensed"', '500 20px "Unbounded"', '400 20px "Onest"', '600 20px "Onest"',
  '700 20px "Onest"', '800 20px "Onest"', '400 20px "Seymour One"', '500 20px "Rubik"', '800 20px "Rubik"', '400 20px "IBM Plex Mono"', '600 20px "IBM Plex Mono"', '600 20px "Tektur"', '400 20px "Golos Text"', '500 20px "Golos Text"', '600 20px "Golos Text"', '400 20px "Ruslan Display"', '400 20px "Kurale"'];
export const loadFonts = async () => {
  if (!document.querySelector(`link[href="${CSS}"]`)) await new Promise(ok => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CSS; l.onload = l.onerror = ok; document.head.appendChild(l); });
  await Promise.all(FONTS.map(f => document.fonts.load(f, 'AaЯя№0')));
};

import { SERIES } from './series.js';
import { P } from './platform.js';
// язык печати — как у ядра: ?lang (в квартире — и адрес игры), иначе P.lang площадки (во фрейме квартиры — игры); печать коробок на языке игрока (пользователь 23.10)
const QL = () => { const q = new URLSearchParams(location.search).get('lang') ?? (parent !== window ? new URLSearchParams(parent.location.search).get('lang') : null); return q === 'ru' || q === 'en' ? q : null; };
export const isEN = () => (QL() ?? ((parent !== window && parent.P) || P).lang) === 'en';
const tr = (ru, en) => isEN() ? en : ru, NO = () => tr('№', '#'), serEN = h => SERIES.find(x => x.hall === h)?.en.toUpperCase();
let seed = 1; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const F = (w, px, fam) => `${w} ${px}px "${fam}"`;
const txt = (g, t, x, y, font, col, align = 'left', maxW = 1e9, base = 'alphabetic') => { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = base;
  const w = g.measureText(t).width; if (w <= maxW) return g.fillText(t, x, y); g.save(); g.translate(x, y); g.scale(maxW / w, 1); g.fillText(t, 0, 0); g.restore(); };
const fit = (g, img, cx, by, w, h) => { if (!img) return; const k = Math.min(w / img.width, h / img.height); g.drawImage(img, cx - img.width * k / 2, by - img.height * k, img.width * k, img.height * k); };   // по центру x, низ — by
const rot = (g, x, y, a, f) => { g.save(); g.translate(x, y); g.rotate(a); f(); g.restore(); };
const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const two = n => String(n).padStart(2, '0');
const slots = S => { const a = S.all.filter(t => t.rank !== 2).slice(0, 6), used = new Set(a.map(t => t.no)); for (let n = 1; a.length < 6; n++) if (!used.has(n)) a.push({ name: tr('скоро', 'soon'), no: n, soon: true }); a.sort((p, q) => p.no - q.no); return [...a, { name: tr('секретная', 'secret'), no: '★', secret: true, sil: S.all.find(t => t.rank === 2)?.sil }]; };
const tint = (img, col) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c; };
const barcode = (g, x, y, w, h, col) => { seed = 9; let p = x; while (p < x + w) { const b = (1 + Math.floor(rnd() * 3)) * w / 95; if (rnd() > 0.45) rect(g, p, y, b, h, col); p += b + w / 95; } };
const age = (g, x, y, s, ink, font) => { g.strokeStyle = ink; g.lineWidth = s * 0.08; g.beginPath(); g.roundRect(x, y, s, s, s * 0.14); g.stroke(); txt(g, '6+', x + s / 2, y + s * 0.53, font(s * 0.5), ink, 'center', s, 'middle'); };

// ---------- С1 «Призовая» (японская призовая коробка): белый, чернила, сигнальный красный, жёлтые диагональные полосы
const C1 = { paper: '#FFFFFF', ink: '#1B1B1F', ser: '#E63B2E', str: '#FFD23F', bg: '#F4F1EA', get series() { return tr('ПЕРЕКУР', serEN(3)); } };
const dg = px => F(400, px, 'Dela Gothic One'), sx = (px, w = 800) => F(w, px, 'Sofia Sans Extra Condensed');
const stripes = (g, x0, y0, x1, y1, step, cols) => { g.save(); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1, y1); g.closePath(); g.clip();
  for (let i = -20; i < 40; i++) { g.fillStyle = cols[i & 1]; g.beginPath(); const a = x0 + i * step; g.moveTo(a, y0); g.lineTo(a + step, y0); g.lineTo(a + step + (y1 - y0), y1); g.lineTo(a + (y1 - y0), y1); g.fill(); } g.restore(); };
const prize = {
  name: 'призовая', get series() { return C1.series; },
  face(g, W, H, S) { const c = C1;
    rect(g, 0, 0, W, H, c.paper); rect(g, 0, 0.11 * H, W, 0.67 * H, c.bg);
    stripes(g, W * 0.65, 0.11 * H, W, 0.31 * H, W * 0.025, [c.str, c.paper]);
    fit(g, S.img, W * 0.57, 0.76 * H, W * 0.8, 0.6 * H);
    rect(g, 0, 0, W, 0.11 * H, c.ser); txt(g, c.series, 0.06 * W, 0.055 * H, dg(0.06 * H), '#fff', 'left', W * 0.7, 'middle');
    rect(g, W - 0.06 * W - 0.075 * H, 0.0175 * H, 0.075 * H, 0.075 * H, '#fff'); rect(g, W - 0.06 * W - 0.055 * H, 0.0375 * H, 0.035 * H, 0.035 * H, c.ser);   // знак бренда
    rect(g, 0, 0.11 * H, 0.13 * W, 0.67 * H, c.ink); rot(g, 0.065 * W, 0.445 * H, -Math.PI / 2, () => txt(g, S.fig, 0, 0, sx(0.09 * W), '#fff', 'center', 0.6 * H, 'middle'));
    rect(g, 0.79 * W, 0.13 * H, 0.17 * W, 0.17 * W, c.ink); txt(g, ['B', 'A', '★'][S.rank], 0.875 * W, 0.13 * H + 0.075 * W, dg(0.11 * W), '#fff', 'center', 1e9, 'middle'); txt(g, tr('ПРИЗ', 'PRIZE'), 0.875 * W, 0.13 * H + 0.15 * W, sx(0.03 * W, 600), '#fff', 'center', 1e9, 'middle');
    rect(g, 0, 0.78 * H, W, 0.12 * H, c.ink); txt(g, S.fig, 0.06 * W, 0.84 * H, dg(0.05 * H), '#fff', 'left', 0.66 * W, 'middle'); txt(g, `${NO()}${two(S.num)} / 06`, 0.94 * W, 0.84 * H, sx(0.035 * H, 600), '#fff', 'right', 1e9, 'middle');
    txt(g, tr('ПРИЗОВАЯ ФИГУРКА · НЕ ДЛЯ ПРОДАЖИ · 13 СМ', 'PRIZE FIGURE · NOT FOR SALE · 13 CM'), 0.06 * W, 0.95 * H, sx(0.024 * H, 600), c.ink, 'left', 0.72 * W, 'middle'); age(g, 0.87 * W, 0.915 * H, 0.07 * W, c.ink, px => sx(px));
  },
  side(g, W, H, dir, S) { const c = C1;
    if (dir > 0) { rect(g, 0, 0, W, H, c.bg); g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip(); fit(g, S.img, W * 0.42, H * 1.15, W * 2.1, H * 1.1); g.restore();   // голова крупно
      rect(g, 0.8 * W, 0, 0.2 * W, H, c.ink); rot(g, 0.9 * W, H / 2, -Math.PI / 2, () => txt(g, S.fig, 0, 0, sx(0.13 * W), '#fff', 'center', 0.9 * H, 'middle')); return; }
    rect(g, 0, 0, W, H, c.ser); rot(g, W * 0.5, H * 0.42, Math.PI / 2, () => txt(g, c.series, 0, 0, dg(0.3 * W), '#fff', 'center', 0.7 * H, 'middle'));
    txt(g, tr('В СЕРИИ 6 + СЕКРЕТНАЯ', '6 IN THE SERIES + SECRET'), W / 2, 0.84 * H, sx(0.06 * W, 600), '#fff', 'center', 0.9 * W, 'middle');
    slots(S).forEach((t, i) => { const x = W * (0.08 + i * 0.12) + W * 0.06; if (t.sil) fit(g, tint(t.sil, '#fff'), x, 0.95 * H, W * 0.11, 0.06 * H); else txt(g, t.secret ? '?' : '·', x, 0.93 * H, dg(0.06 * W), '#fff', 'center', 1e9, 'middle'); });
  },
  end(g, W, H, S) { const c = C1; rect(g, 0, 0, W, H, c.paper); rect(g, 0, 0.3 * H, 0.55 * W, 0.4 * H, c.ink); txt(g, S.fig, 0.05 * W, 0.5 * H, sx(0.16 * H), '#fff', 'left', 0.46 * W, 'middle');
    txt(g, two(S.num), 0.78 * W, 0.52 * H, dg(0.5 * H), c.ser, 'center', 1e9, 'middle'); },
  back(g, W, H, S) { const c = C1; rect(g, 0, 0, W, H, c.paper); txt(g, tr('СОБЕРИ СЕРИЮ', 'COLLECT THE SERIES'), 0.06 * W, 0.08 * H, dg(0.045 * H), c.ink, 'left', 0.88 * W, 'middle');
    slots(S).forEach((t, i) => { const x = 0.06 * W + (i % 2) * 0.46 * W, y = 0.13 * H + Math.floor(i / 2) * 0.185 * H, w = 0.42 * W, h = 0.17 * H;
      rect(g, x, y, w, h, t.secret ? c.ink : c.bg); if (t.img) fit(g, t.img, x + w * 0.32, y + h * 0.95, w * 0.5, h * 0.88); if (t.secret) { if (t.sil) fit(g, tint(t.sil, '#fff'), x + w * 0.32, y + h * 0.95, w * 0.5, h * 0.88); txt(g, '?', x + w * 0.32, y + h * 0.5, dg(h * 0.6), t.sil ? c.ser : '#fff', 'center', 1e9, 'middle'); }
      txt(g, `${NO()}${t.secret ? '★' : two(t.no)}`, x + w * 0.62, y + h * 0.35, sx(h * 0.18), t.secret ? '#fff' : c.ser, 'left', w * 0.36, 'middle'); txt(g, t.name, x + w * 0.62, y + h * 0.62, sx(h * 0.14, 600), t.secret ? '#fff' : c.ink, 'left', w * 0.36, 'middle');
      if (t.name === S.short) { g.strokeStyle = c.ink; g.lineWidth = 0.008 * W; g.strokeRect(x, y, w, h); } });
    rect(g, 0, 0.88 * H, W, 0.12 * H, c.bg); txt(g, tr('Внимание: мелкие детали. Не для детей до 3 лет. Призовая фигурка, не для продажи.', 'Warning: small parts. Not for children under 3. Prize figure, not for sale.'), 0.06 * W, 0.92 * H, sx(0.02 * H, 600), c.ink, 'left', 0.88 * W, 'middle'); txt(g, '© 2026', 0.06 * W, 0.96 * H, sx(0.02 * H, 600), c.ink, 'left', 1e9, 'middle'); },
};

// ---------- С2 «Минималистичный блайндбокс»: бумага, чернила, один дождливо-голубой; ключевой арт — сценка, не фигурка
const C2 = { paper: '#F6F3EE', ink: '#222222', ser: '#8DB6C9', series: ['МЕЛКИЕ', 'НЕПРИЯТНОСТИ'] };
const un = px => F(500, px, 'Unbounded'), on = (px, w = 400) => F(w, px, 'Onest');
const cloud = (g, x, y, s, col) => { g.fillStyle = col; for (const [dx, dy, r] of [[0, 0, 0.5], [0.45, 0.1, 0.38], [-0.45, 0.12, 0.36], [0.2, -0.25, 0.4], [-0.2, -0.2, 0.33]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.fill(); } rect(g, x - 0.8 * s, y + 0.1 * s, 1.6 * s, 0.38 * s, col); };
const minimal = {
  name: 'минимализм', series: C2.series.join(' '),
  face(g, W, H, S) { const c = C2, m = 0.07 * W; rect(g, 0, 0, W, H, c.paper);
    txt(g, 'Прутики', m, 0.06 * H, on(0.028 * H, 600), c.ink, 'left', 1e9, 'middle'); txt(g, 'серия 01', W - m, 0.06 * H, on(0.028 * H, 600), c.ink, 'right', 1e9, 'middle');
    cloud(g, 0.36 * W, 0.33 * H, 0.2 * W, c.ser); g.strokeStyle = c.ink; g.lineWidth = 0.008 * W; seed = 4;   // сценка: тучка над маленьким силуэтом
    for (let i = 0; i < 14; i++) { const x = 0.16 * W + rnd() * 0.42 * W, y = 0.42 * H + rnd() * 0.1 * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 0.012 * W, y + 0.035 * H); g.stroke(); }
    if (S.sil) fit(g, tint(S.sil, c.ink), 0.36 * W, 0.68 * H, 0.22 * W, 0.14 * H);
    txt(g, c.series[0], m, 0.775 * H, un(0.06 * H), c.ink, 'left', W - 2 * m); txt(g, c.series[1], m, 0.84 * H, un(0.06 * H), c.ink, 'left', W * 0.62);
    txt(g, '6 фигурок + 1 секретная', m, 0.9 * H, on(0.024 * H), c.ink, 'left', 1e9, 'middle');
    rect(g, W - m - 0.2 * W, H - m - 0.2 * W, 0.2 * W, 0.2 * W, c.ser); txt(g, '?', W - m - 0.1 * W, H - m - 0.1 * W, un(0.13 * W), c.ink, 'center', 1e9, 'middle');
  },
  side(g, W, H, dir, S) { const c = C2, m = 0.08 * W; rect(g, 0, 0, W, H, c.paper);
    if (dir > 0) { slots(S).concat([{ name: 'как открыть', open: true }]).forEach((t, i) => { const w = (W - 3 * m) / 2, h = 0.2 * H, x = m + (i % 2) * (w + m), y = 0.06 * H + Math.floor(i / 2) * 0.23 * H;
        if (t.open) { g.strokeStyle = c.ink; g.lineWidth = 0.008 * W; g.setLineDash([0.02 * W, 0.012 * W]); g.beginPath(); g.roundRect(x + w * 0.2, y + h * 0.15, w * 0.6, h * 0.4, w * 0.08); g.stroke(); g.setLineDash([]); }
        else if (t.img) fit(g, t.img, x + w / 2, y + h * 0.72, w * 0.9, h * 0.7); else fit(g, tint(t.sil || S.sil, c.ser), x + w / 2, y + h * 0.72, w * 0.8, h * 0.66);
        if (t.secret) txt(g, '?', x + w / 2, y + h * 0.42, un(h * 0.3), c.ink, 'center', 1e9, 'middle');
        txt(g, t.open ? 'Как открыть' : t.secret ? 'Секретная · 1:72' : `№${two(t.no)} ${t.name}`, x + w / 2, y + h * 0.88, on(0.02 * H), c.ink, 'center', w, 'middle'); }); return; }
    rot(g, W / 2, H * 0.4, Math.PI / 2, () => txt(g, C2.series.join(' '), 0, 0, un(0.1 * W), c.ink, 'center', 0.72 * H, 'middle')); txt(g, 'Фигурка ~13 см.', m, 0.9 * H, on(0.045 * W), c.ink); txt(g, 'Внутри: пакетик, карточка.', m, 0.94 * H, on(0.045 * W), c.ink);
  },
  end(g, W, H) { const c = C2; rect(g, 0, 0, W, H, c.paper); g.strokeStyle = c.ink; g.lineWidth = 0.006 * W; g.setLineDash([0.015 * W, 0.01 * W]); g.beginPath(); g.roundRect(0.35 * W, 0.2 * H, 0.3 * W, 0.45 * H, 0.05 * W); g.stroke(); g.setLineDash([]);
    txt(g, 'ОТКРЫТЬ', W / 2, 0.82 * H, on(0.09 * H, 600), c.ink, 'center', 1e9, 'middle'); },
  back(g, W, H, S) { const c = C2, m = 0.07 * W; rect(g, 0, 0, W, H, c.paper); txt(g, C2.series.join(' '), m, 0.1 * H, un(0.035 * H), c.ink, 'left', W - 2 * m);
    ['Коллекционная фигурка в закрытой коробке.', 'Какая внутри — не видно до вскрытия.', 'Шанс секретной — 1:72.'].forEach((t, i) => txt(g, t, m, 0.18 * H + i * 0.035 * H, on(0.024 * H), c.ink, 'left', W - 2 * m));
    rect(g, m, 0.72 * H, 0.35 * W, 0.12 * H, '#fff'); barcode(g, m + 0.03 * W, 0.735 * H, 0.29 * W, 0.08 * H, c.ink); age(g, W - m - 0.12 * W, 0.72 * H, 0.12 * W, c.ink, px => on(px, 600));
    txt(g, 'Внимание: мелкие детали. Не для детей до 3 лет.', m, 0.92 * H, on(0.02 * H), c.ink, 'left', W - 2 * m); },
};

// ---------- С2б «Ночной лес» — сказка для «Мелких неприятностей» (H2; выбор пользователя 23.10, стенд style_lab/fairy_box.html, вариант Б): ночное небо, луна, ели в тумане, светлячки, золотой заголовок
const C7 = { bg: '#18204A', ink: '#F4E7C3', gold: '#F2C35B', deep: '#0D1424', get series() { return tr(['МЕЛКИЕ', 'НЕПРИЯТНОСТИ'], serEN(2).split(' ')); } };
const ru = px => F(400, px, 'Ruslan Display'), ku = px => F(400, px, 'Kurale');
const fir = (g, x, by, h, col) => { g.fillStyle = col; for (let k = 0; k < 3; k++) { const w = h * (0.5 - k * 0.1), y = by - k * h * 0.28; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x, y - h * 0.5); g.fill(); } g.fillRect(x - h * 0.03, by, h * 0.06, h * 0.08); };
const glow = (g, x, y, r, c0) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
const night = (g, W, H, n = 90) => { const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#10163A'); sk.addColorStop(0.55, '#2C3C72'); sk.addColorStop(0.8, '#4A6A98'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++) { const x = rnd() * W, y = rnd() * 0.6 * H, r = (0.6 + rnd() * 1.6) * 0.0025 * Math.min(W, H * 0.6); g.fillStyle = `rgba(255,245,215,${0.4 + rnd() * 0.6})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } };
const goldText = (g, t, x, y, px, maxW, align = 'center') => { g.save(); g.shadowColor = 'rgba(255,210,120,.8)'; g.shadowBlur = px * 0.35; txt(g, t, x, y, ru(px), C7.gold, align, maxW, 'middle'); g.restore(); };
const fairy = {
  name: 'ночной лес', get series() { return C7.series.join(' '); },
  face(g, W, H, S) { const c = C7; seed = 7; night(g, W, H);
    for (const [x, y, r] of [[0.18, 0.3, 0.03], [0.85, 0.48, 0.022], [0.3, 0.52, 0.018]]) { g.fillStyle = '#FFF4D6'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i & 1 ? r * 0.25 : r; g.lineTo((x + Math.cos(a) * rr) * W, y * H + Math.sin(a) * rr * W); } g.fill(); }
    glow(g, 0.72 * W, 0.33 * H, 0.32 * W, 'rgba(255,236,190,.45)'); g.fillStyle = '#FFF0C8'; g.beginPath(); g.arc(0.72 * W, 0.33 * H, 0.11 * W, 0, 7); g.fill();   // луна с пятнами
    g.fillStyle = 'rgba(220,200,150,.35)'; for (const [dx, dy, r] of [[-0.03, -0.02, 0.022], [0.035, 0.03, 0.016], [0, 0.05, 0.012]]) { g.beginPath(); g.arc((0.72 + dx) * W, (0.33 + dy) * H, r * W, 0, 7); g.fill(); }
    [['#2B3D63', 0.73, 0.16], ['#1D2B4B', 0.8, 0.2], ['#121B30', 0.9, 0.24]].forEach(([col, by, h], k) => { for (let x = -0.05; x < 1.1; x += 0.09 + rnd() * 0.05) fir(g, x * W, (by + rnd() * 0.03) * H, (h + rnd() * 0.08) * H, col);   // три ряда елей, туман за вторым
      if (k === 1) { const f = g.createLinearGradient(0, 0.7 * H, 0, 0.82 * H); f.addColorStop(0, 'rgba(160,185,220,0)'); f.addColorStop(1, 'rgba(160,185,220,.35)'); g.fillStyle = f; g.fillRect(0, 0.7 * H, W, 0.12 * H); } });
    glow(g, W / 2, 0.68 * H, 0.36 * W, 'rgba(255,200,120,.38)'); g.fillStyle = c.deep; g.beginPath(); g.ellipse(W / 2, 0.93 * H, 0.6 * W, 0.1 * H, 0, 0, 7); g.fill();
    fit(g, S.img, W / 2, 0.88 * H, 0.56 * W, 0.44 * H);
    g.save(); g.shadowColor = '#FFD27A'; g.shadowBlur = 0.03 * W; g.fillStyle = '#FFE08A'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc((0.08 + rnd() * 0.84) * W, (0.55 + rnd() * 0.33) * H, (0.004 + rnd() * 0.004) * W, 0, 7); g.fill(); } g.restore();   // светлячки
    goldText(g, c.series[0], W / 2, 0.09 * H, 0.085 * H, 0.86 * W); goldText(g, c.series[1], W / 2, 0.165 * H, 0.058 * H, 0.86 * W);
    txt(g, tr('6 фигурок + 1 секретная', '6 figures + 1 secret'), W / 2, 0.965 * H, ku(0.028 * H), c.ink, 'center', 0.8 * W, 'middle');
    g.fillStyle = c.gold; g.beginPath(); g.arc(0.86 * W, 0.9 * H, 0.055 * W, 0, 7); g.fill(); txt(g, '?', 0.86 * W, 0.903 * H, ru(0.066 * W), c.bg, 'center', 1e9, 'middle');
  },
  side(g, W, H, dir, S) { const c = C7; seed = 5; night(g, W, H, 40);
    if (dir > 0) { const L = S.all.filter(t => t.rank !== 2).sort((p, q) => p.no - q.no).slice(0, 6), sec = S.all.find(t => t.rank === 2);   // вся серия: 6 фигурок и силуэт секретки
      txt(g, tr('В СЕРИИ', 'IN THE SERIES'), W / 2, 0.05 * H, ru(0.1 * W), c.gold, 'center', 0.9 * W, 'middle');
      [...L, { secret: true }].forEach((t, i) => { const w = 0.42 * W, h = 0.2 * H, x = 0.06 * W + (i % 2) * 0.46 * W, y = 0.08 * H + Math.floor(i / 2) * 0.22 * H;
        glow(g, x + w / 2, y + h * 0.6, w * 0.55, 'rgba(255,200,120,.25)');
        if (!t.secret) return fit(g, t.img, x + w / 2, y + h * 0.95, w * 0.9, h * 0.9);
        if (sec?.sil) fit(g, tint(sec.sil, '#0B1020'), x + w / 2, y + h * 0.95, w * 0.9, h * 0.9); txt(g, '?', x + w / 2, y + h * 0.5, ru(h * 0.42), c.gold, 'center', 1e9, 'middle'); }); return; }
    for (const [x, h] of [[0.15, 0.22], [0.5, 0.3], [0.85, 0.2]]) fir(g, x * W, 0.97 * H, h * H, '#121B30');
    rot(g, W / 2, 0.42 * H, Math.PI / 2, () => goldText(g, c.series.join(' '), 0, 0, 0.2 * W, 0.74 * H)); },   // корешком: читается стоя и лёжа
  end(g, W, H) { const c = C7; seed = 3; night(g, W, H, 30); goldText(g, c.series.join(' '), W / 2, 0.5 * H, 0.32 * H, 0.9 * W); },
  back(g, W, H, S) { const c = C7, m = 0.07 * W; seed = 9; night(g, W, H, 60); goldText(g, c.series.join(' '), W / 2, 0.08 * H, 0.05 * H, W - 2 * m);
    tr(['Жили-были сказочные герои, и у каждого —', 'своя маленькая неприятность.', 'Какая фигурка внутри — не видно до вскрытия.', 'В серии 6 фигурок и 1 секретная.'], ['Once upon a time there were fairy-tale heroes,', 'each with a little trouble of their own.', 'Which figure is inside, you only see once it is open.', 'The series has 6 figures and 1 secret.']).forEach((t, i) => txt(g, t, W / 2, 0.15 * H + i * 0.038 * H, ku(0.026 * H), c.ink, 'center', W - 2 * m, 'middle'));
    const L = S.all.filter(t => t.rank !== 2).sort((p, q) => p.no - q.no).slice(0, 6), sec = S.all.find(t => t.rank === 2), cw = (W - 2 * m) / 7;
    L.forEach((t, i) => fit(g, t.img, m + cw * (i + 0.5), 0.5 * H, cw * 0.95, 0.16 * H)); if (sec?.sil) fit(g, tint(sec.sil, '#0B1020'), m + cw * 6.5, 0.5 * H, cw * 0.95, 0.16 * H); txt(g, '?', m + cw * 6.5, 0.43 * H, ru(0.06 * H), c.gold, 'center', 1e9, 'middle');
    for (let x = -0.05; x < 1.1; x += 0.12) fir(g, x * W, 0.7 * H, 0.1 * H, '#121B30');
    rect(g, m, 0.74 * H, 0.35 * W, 0.12 * H, '#fff'); barcode(g, m + 0.03 * W, 0.755 * H, 0.29 * W, 0.08 * H, '#1B1B1F'); age(g, W - m - 0.12 * W, 0.74 * H, 0.12 * W, c.ink, ku);
    txt(g, tr('Внимание: мелкие детали. Не для детей до 3 лет.', 'Warning: small parts. Not for children under 3.'), W / 2, 0.93 * H, ku(0.02 * H), c.ink, 'center', W - 2 * m, 'middle'); },
};

// ---------- С3 «Ретро-игрушка 80-х»: состаренный картон, лента из трёх полос, растр, логотип с экструзией, звезда-«взрыв»
const C3 = { card: '#F2E6CC', r: '#D7322B', o: '#F28C28', y: '#F6C531', ink: '#1E2A4A', get series() { return tr(['КУХОННЫЕ', 'ЗВЕРИ'], serEN(4).split(' ')); } };
const sy = px => F(400, px, 'Seymour One'), rb = (px, w = 800) => F(w, px, 'Rubik');
const band = (g, W, H, off = 0) => { [C3.r, C3.o, C3.y].forEach((col, k) => { g.fillStyle = col; g.beginPath(); const a = 0.62 * H + k * 0.03 * H, b = 0.30 * H + k * 0.03 * H; g.moveTo(off, a); g.lineTo(W + off, b); g.lineTo(W + off, b + 0.03 * H); g.lineTo(off, a + 0.03 * H); g.fill(); }); };
const burst = (g, x, y, r0, r1, n, fill, ink) => { g.beginPath(); for (let i = 0; i < 2 * n; i++) { const a = i * Math.PI / n, r = i & 1 ? r1 : r0; g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = ink; g.lineWidth = r0 * 0.04; g.stroke(); };
const extrude = (g, t, x, y, px, maxW) => { g.font = sy(px); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; const k = Math.min(1, maxW / (g.measureText(t).width + 0.032 * px)); g.save(); g.translate(x, y); g.scale(k, 1);   // объём — 6 сдвинутых копий, сжатие одно на всё
  g.fillStyle = C3.ink; for (let i = 6; i > 0; i--) g.fillText(t, 0.032 * px * i / 6, 0.032 * px * i / 6); g.fillStyle = C3.y; g.fillText(t, 0, 0); g.strokeStyle = C3.ink; g.lineWidth = px * 0.05; g.strokeText(t, 0, 0); g.restore(); };
const retro = {
  name: 'ретро 80-х', get series() { return C3.series.join(' '); },
  face(g, W, H, S) { const c = C3; rect(g, 0, 0, W, H, c.card);
    band(g, W, H); g.globalAlpha = 0.35; g.fillStyle = c.r; g.beginPath(); g.moveTo(1.5, 0.62 * H); g.lineTo(W + 1.5, 0.30 * H); g.lineTo(W + 1.5, 0.33 * H); g.lineTo(1.5, 0.65 * H); g.fill(); g.globalAlpha = 1;   // сдвиг печати
    g.save(); g.beginPath(); g.moveTo(0, 0.62 * H); g.lineTo(W, 0.30 * H); g.lineTo(W, 0.39 * H); g.lineTo(0, 0.71 * H); g.clip(); g.globalAlpha = 0.12; g.fillStyle = c.ink;
    for (let y = 0.28 * H; y < 0.72 * H; y += 0.008 * W) for (let x = 0; x < W; x += 0.008 * W) { g.beginPath(); g.arc(x, y, 0.0025 * W, 0, 7); g.fill(); } g.restore();   // растр — только на ленте
    g.save(); g.filter = 'contrast(1.15) saturate(0.9)'; fit(g, S.img, 0.58 * W, 0.82 * H, 0.8 * W, 0.55 * H); g.restore();
    rot(g, 0.07 * W, 0.12 * H, -0.07, () => { extrude(g, c.series[0], 0, 0, 0.075 * H, 0.86 * W); extrude(g, c.series[1], 0.06 * W, 0.085 * H, 0.075 * H, 0.6 * W); });
    burst(g, 0.8 * W, 0.3 * H, 0.11 * W, 0.085 * W, 16, c.y, c.ink); rot(g, 0.8 * W, 0.3 * H, -0.21, () => { txt(g, tr('НОВАЯ', 'NEW'), 0, -0.022 * W, rb(0.035 * W), c.r, 'center', 1e9, 'middle'); txt(g, tr('СЕРИЯ', 'SERIES'), 0, 0.022 * W, rb(0.035 * W), c.r, 'center', 1e9, 'middle'); });
    rect(g, 0, 0.83 * H, W, 0.17 * H, c.ink); txt(g, S.fig, 0.06 * W, 0.89 * H, rb(0.05 * H), c.card, 'left', 0.88 * W, 'middle'); txt(g, `${NO()}${two(S.num)} · ${tr('13 см', '13 cm')}`, 0.06 * W, 0.95 * H, rb(0.026 * H, 500), c.y, 'left', 1e9, 'middle');
  },
  side(g, W, H, dir, S) { const c = C3; rect(g, 0, 0, W, H, c.card);
    if (dir > 0) { fit(g, S.img, W / 2, 0.95 * H, 0.9 * W, 0.85 * H); return; }   // фигурка стоя, как на настоящей коробке (стоит головой вверх)
    rot(g, W * 0.55, H / 2, Math.PI / 2, () => { extrude(g, c.series.join(' '), -0.42 * H, 0, 0.16 * W, 0.84 * H); txt(g, tr('Фигурка из серии «Кухонные звери»', `A figure from the ${SERIES.find(x => x.hall === 4)?.en} series`), -0.42 * H, 0.2 * W, rb(0.06 * W, 500), c.ink, 'left', 0.84 * H, 'middle'); }); },
  end(g, W, H, S) { const c = C3; rect(g, 0, 0, W, H, c.card); band(g, W, H * 1.6, -0.2 * H); extrude(g, c.series.join(' '), 0.06 * W, 0.2 * H, 0.1 * H, 0.88 * W);
    txt(g, two(S.num), 0.94 * W, 0.86 * H, rb(0.42 * H), c.ink, 'right'); },
  back(g, W, H, S) { const c = C3; rect(g, 0, 0, W, H, c.card); extrude(g, tr('СОБЕРИ ВСЕХ!', 'COLLECT THEM ALL!'), 0.06 * W, 0.08 * H, 0.05 * H, 0.88 * W);
    slots(S).slice(0, 6).forEach((t, i) => { const x = 0.06 * W + (i % 2) * 0.46 * W, y = 0.14 * H + Math.floor(i / 2) * 0.22 * H, w = 0.42 * W, h = 0.2 * H;
      g.fillStyle = '#fff8e8'; g.beginPath(); g.roundRect(x, y, w, h, 0.02 * W); g.fill(); g.strokeStyle = c.ink; g.lineWidth = 0.005 * W; g.stroke();
      if (t.img) fit(g, t.img, x + w / 2, y + h * 0.95, w * 0.85, h * 0.85); else txt(g, '?', x + w / 2, y + h / 2, sy(h * 0.5), c.ink, 'center', 1e9, 'middle');
      g.fillStyle = c.r; g.beginPath(); g.arc(x + 0.06 * W, y + 0.06 * W, 0.05 * W, 0, 7); g.fill(); txt(g, two(t.no), x + 0.06 * W, y + 0.062 * W, rb(0.05 * W), '#fff', 'center', 1e9, 'middle'); });
    rect(g, 0.06 * W, 0.82 * H, 0.88 * W, 0.12 * H, '#fff8e8'); txt(g, tr('ВНИМАНИЕ! Мелкие детали. Не для детей до 3 лет.', 'WARNING! Small parts. Not for children under 3.'), 0.09 * W, 0.88 * H, rb(0.022 * H, 500), c.ink, 'left', 0.82 * W, 'middle'); },
};

// ---------- С4 «Крафт, одна краска»: волокна крафта, рамка, фигурка растром одной краской, этикетка бюро находок, штамп
const C4 = { kraft: '#C49A6C', ink: '#2B2A33', label: '#F4EFE6', tape: 'rgba(227,211,176,.85)', get series() { return tr('НИЧЕЙНЫЕ', serEN(1)); } };
const sxc = px => F(800, px, 'Sofia Sans Extra Condensed'), pm = (px, w = 400) => F(w, px, 'IBM Plex Mono');
const kraftBg = (g, W, H) => { rect(g, 0, 0, W, H, C4.kraft); seed = 21; g.globalAlpha = 0.15; g.lineWidth = Math.max(1, W * 0.002);
  for (let i = 0; i < 2500; i++) { const x = rnd() * W, y = rnd() * H, l = (0.01 + rnd() * 0.02) * W, a = rnd() * 6.28, v = Math.round(196 * (0.92 + rnd() * 0.16)); g.strokeStyle = `rgb(${v},${Math.round(v * 0.79)},${Math.round(v * 0.55)})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * Math.cos(a), y + l * Math.sin(a)); g.stroke(); }
  g.globalAlpha = 0.05; g.fillStyle = '#5a3a1a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(rnd() * W, rnd() * H, 0.05 * W, 0, 7); g.fill(); } g.globalAlpha = 1; };
const halftone = (g, img, x0, y0, w, h, step, col) => { if (!img) return; const k = Math.min(w / img.width, h / img.height), iw = Math.round(img.width * k), ih = Math.round(img.height * k), c = document.createElement('canvas'); c.width = iw; c.height = ih;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, iw, ih); const d = x.getImageData(0, 0, iw, ih).data, ox = x0 + (w - iw) / 2, oy = y0 + h - ih; g.fillStyle = col;
  for (let y = 0; y < ih; y += step) for (let xx = 0; xx < iw; xx += step) { const i = (Math.floor(y) * iw + Math.floor(xx)) * 4; if (d[i + 3] < 40) continue; const v = 1 - (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    g.beginPath(); g.arc(ox + xx, oy + y, step * 0.5 * Math.min(1, 0.25 + v * 1.1), 0, 7); g.fill(); } };
const kraft = {
  name: 'крафт', get series() { return C4.series; },
  face(g, W, H, S) { const c = C4; kraftBg(g, W, H); g.strokeStyle = c.ink; g.lineWidth = 2; g.strokeRect(0.04 * W, 0.04 * W, W - 0.08 * W, H - 0.08 * W);
    for (const [x, y] of [[0.04, 0.04], [0.96, 0.04], [0.04, 1], [0.96, 1]]) { const px = x * W, py = y === 1 ? H - 0.04 * W : 0.04 * W; rect(g, px - 0.015 * W, py - 1, 0.03 * W, 2, c.ink); rect(g, px - 1, py - 0.015 * W, 2, 0.03 * W, c.ink); }
    txt(g, c.series, 0.07 * W, 0.17 * H, sxc(0.12 * H), c.ink, 'left', 0.6 * W);
    halftone(g, S.img, 0.1 * W, 0.22 * H, 0.8 * W, 0.42 * H, Math.max(3, 0.01 * W), c.ink);
    rot(g, 0.19 * W + 0.31 * W, 0.67 * H + 0.09 * H, -0.052, () => { g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 2; g.shadowOffsetY = 2; rect(g, -0.31 * W, -0.09 * H, 0.62 * W, 0.18 * H, c.label); g.shadowColor = 'transparent';
      [tr(`ПРЕДМЕТ № ${two(S.num)}`, `ITEM # ${two(S.num)}`), S.fig, tr('НАЙДЕН: в автомате', 'FOUND: in a machine'), tr('ВЛАДЕЛЕЦ: не установлен', 'OWNER: unknown')].forEach((t, i) => txt(g, t, -0.28 * W, -0.05 * H + i * 0.032 * H, pm(0.022 * H, i < 2 ? 600 : 400), c.ink, 'left', 0.56 * W, 'middle')); });
    rot(g, 0.78 * W, 0.2 * H, 0.21, () => { g.globalAlpha = 0.8; g.strokeStyle = c.ink; g.lineWidth = 0.008 * W; seed = 5; const R = 0.1 * W; g.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * 6.283, r = R * (0.98 + rnd() * 0.04); g.lineTo(r * Math.cos(a), r * Math.sin(a)); } g.stroke();
      g.beginPath(); g.arc(0, 0, R * 0.62, 0, 7); g.stroke(); [...tr('НЕ ВОСТРЕБОВАН · ', 'UNCLAIMED · ')].forEach((ch, i, a) => rot(g, 0, 0, i / a.length * 6.283, () => txt(g, ch, 0, -R * 0.8, pm(R * 0.2, 600), c.ink, 'center', 1e9, 'middle'))); g.globalAlpha = 1; });
  },
  side(g, W, H, dir, S) { const c = C4; kraftBg(g, W, H);
    if (dir > 0) { txt(g, tr('ОПИСЬ', 'INVENTORY'), 0.1 * W, 0.1 * H, sxc(0.07 * H), c.ink); slots(S).forEach((t, i) => txt(g, `${i + 1}. ${t.secret ? '???' : t.soon ? '..........' : t.name}`, 0.1 * W, 0.17 * H + i * 0.05 * H, pm(0.06 * W), c.ink, 'left', 0.8 * W)); return; }
    txt(g, two(S.num), W / 2, 0.6 * H, sxc(0.5 * W * 2), c.ink, 'center', 0.9 * W); },
  end(g, W, H) { kraftBg(g, W, H); g.fillStyle = C4.tape; g.fillRect(0.41 * W, 0, 0.18 * W, H); g.fillStyle = '#6b4a2a'; g.beginPath(); g.arc(0.2 * W, 0.5 * H, 0.04 * H, 0, 7); g.fill(); },
  back(g, W, H) { const c = C4; kraftBg(g, W, H); tr(['Прутики', 'Призовая фигурка, не для продажи.', 'Фигурка ~13 см.', 'Внимание: мелкие детали.', 'Не для детей до 3 лет.'], ['Prutiki', 'Prize figure, not for sale.', 'Figure ~13 cm.', 'Warning: small parts.', 'Not for children under 3.']).forEach((t, i) => txt(g, t, 0.08 * W, 0.8 * H + i * 0.03 * H, pm(0.022 * H, i ? 400 : 600), c.ink, 'left', 0.84 * W)); },
};

// ---------- С5 «Неон ночного киоска»: рольставня, ОДНА неоновая вывеска контуром, табличка «КРУГЛОСУТОЧНО», голо-полоса по краю
const C5 = { base: '#121417', rib: '#1E2127', neon: '#FFA62B', plate: '#F2F2F2', frame: '#2A2E35', get series() { return tr('ДЕЖУРНЫЕ', 'ON DUTY'); } };
const tk = px => F(600, px, 'Tektur'), gl = (px, w = 500) => F(w, px, 'Golos Text');
const shutter = (g, W, H) => { rect(g, 0, 0, W, H, C5.base); for (let y = 0; y < H; y += 0.02 * H) rect(g, 0, y, W, 0.006 * H, C5.rib); };
const holo = (g, x, w, H) => { const gr = g.createLinearGradient(0, 0, 0, H); ['#d9b8c4', '#c9c4e0', '#b8d4dc', '#c8dcc0', '#e0d6b8', '#d9b8c4'].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c)); g.fillStyle = gr; g.fillRect(x, 0, w, H); };
const neonText = (g, t, x, y, px, maxW) => { g.font = tk(px); g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = C5.neon; g.lineWidth = px * 0.12; g.shadowColor = C5.neon; g.shadowBlur = px * 0.2;
  const w = g.measureText(t).width, k = Math.min(1, maxW / w); g.save(); g.translate(x, y); g.scale(k, 1); g.strokeText(t, 0, 0); g.restore(); g.shadowColor = 'transparent'; g.shadowBlur = 0; };
const kiosk = {
  name: 'неон киоска', get series() { return C5.series; },
  face(g, W, H, S) { const c = C5; shutter(g, W, H);
    const lt = g.createRadialGradient(W * 0.45, 0.28 * H, 0, W * 0.45, 0.28 * H, 0.55 * H); lt.addColorStop(0, 'rgba(255,190,110,.22)'); lt.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = lt; g.fillRect(0, 0.25 * H, W, 0.6 * H);   // тёплый свет сверху на фигурку
    fit(g, S.img, 0.46 * W, 0.8 * H, 0.78 * W, 0.5 * H);
    rect(g, 0.07 * W, 0.06 * H, 0.8 * W, 0.18 * H, c.base); g.strokeStyle = c.frame; g.lineWidth = 2; g.strokeRect(0.07 * W, 0.06 * H, 0.8 * W, 0.18 * H); neonText(g, c.series, 0.47 * W, 0.15 * H, 0.1 * H, 0.72 * W);
    rect(g, 0.08 * W, 0.84 * H, 0.36 * W, 0.07 * H, c.plate); txt(g, tr('КРУГЛОСУТОЧНО', 'OPEN 24 HOURS'), 0.26 * W, 0.875 * H, gl(0.024 * H, 600), c.base, 'center', 0.33 * W, 'middle');
    txt(g, `${NO()}${two(S.num)} ${S.fig}`, 0.88 * W, 0.875 * H, gl(0.026 * H), c.plate, 'right', 0.4 * W, 'middle'); holo(g, 0.94 * W, 0.06 * W, H);
  },
  side(g, W, H, dir, S) { const c = C5; shutter(g, W, H); rect(g, 0.3 * W, 0.08 * H, 0.4 * W, 0.6 * H, c.base); g.strokeStyle = c.frame; g.lineWidth = 2; g.strokeRect(0.3 * W, 0.08 * H, 0.4 * W, 0.6 * H);
    rot(g, W / 2, 0.38 * H, -dir * Math.PI / 2, () => neonText(g, dir > 0 ? c.series : S.fig, 0, 0, 0.2 * W, 0.55 * H)); txt(g, `${tr('смена', 'shift')} 01 · ${NO()}${two(S.num)}`, W / 2, 0.8 * H, gl(0.07 * W), c.plate, 'center', 0.9 * W, 'middle'); },
  end(g, W, H, S) { const c = C5; shutter(g, W, H); txt(g, two(S.num), 0.08 * W, 0.6 * H, tk(0.5 * H), c.plate, 'left', 1e9, 'middle'); txt(g, tr('смена 01', 'shift 01'), 0.92 * W, 0.6 * H, gl(0.12 * H), c.neon, 'right', 1e9, 'middle'); },
  back(g, W, H, S) { const c = C5; shutter(g, W, H); neonText(g, tr('ГРАФИК ДЕЖУРСТВ', 'DUTY ROSTER'), W / 2, 0.08 * H, 0.045 * H, 0.86 * W); rect(g, 0.06 * W, 0.13 * H, 0.88 * W, 0.62 * H, c.plate);
    const fixes = tr(['кофемашина', 'дверь', 'принтер', 'лифт', 'вывеска', 'терминал', '???'], ['coffee machine', 'door', 'printer', 'lift', 'sign', 'terminal', '???']);
    slots(S).forEach((t, i) => { const y = 0.17 * H + i * 0.083 * H; txt(g, t.secret ? '???' : t.name, 0.09 * W, y, gl(0.024 * H, 600), c.base, 'left', 0.34 * W, 'middle'); txt(g, `${tr('ночь', 'night')} ${i + 1}`, 0.5 * W, y, gl(0.022 * H), c.base, 'left', 1e9, 'middle'); txt(g, fixes[i], 0.91 * W, y, gl(0.022 * H), c.base, 'right', 0.3 * W, 'middle'); rect(g, 0.09 * W, y + 0.035 * H, 0.82 * W, 1, '#c8c8c8'); });
    txt(g, tr('Призовая фигурка, не для продажи. Мелкие детали.', 'Prize figure, not for sale. Small parts.'), 0.06 * W, 0.84 * H, gl(0.02 * H), c.plate, 'left', 0.88 * W, 'middle'); holo(g, 0, 0.06 * W, H); },
};

// ---------- С6 «Аптечная»: белая типографская коробка, полоса-код цвета фигурки, юмор — в тексте (без красного креста)
const C6 = { base: '#FAFAF7', ink: '#1F2A44', grey: '#6B6B6B', codes: ['#2F9E6E', '#E4572E', '#3D7DD8', '#C9A227', '#8E5BB5', '#3BA7A0'], series: 'ЛЁГКИЕ СИМПТОМЫ' };
const code = S => S.rank === 2 ? C6.ink : C6.codes[(S.num - 1) % 6];
const pharma = {
  name: 'аптечная', series: C6.series,
  face(g, W, H, S) { const c = C6, m = 0.07 * W, col = code(S); rect(g, 0, 0, W, H, c.base);
    txt(g, 'Прутики', m, 0.07 * H, on(0.03 * H, 700), c.ink, 'left', 1e9, 'middle'); txt(g, c.series, W - m, 0.07 * H, gl(0.022 * H, 600), c.grey, 'right', 0.5 * W, 'middle');
    rect(g, 0, 0.3 * H, W, 0.1 * H, col); txt(g, '13 см · 1 фигурка', m, 0.35 * H, gl(0.03 * H, 600), '#fff', 'left', 1e9, 'middle');
    txt(g, S.fig, m, 0.49 * H, on(0.07 * H, 800), c.ink, 'left', W - 2 * m); txt(g, 'Figura tristis', m, 0.535 * H, gl(0.028 * H, 400), c.grey);
    txt(g, 'Принимать по одной.', m, 0.585 * H, gl(0.022 * H, 400), c.ink); txt(g, 'Не более 7 в серии.', m, 0.615 * H, gl(0.022 * H, 400), c.ink);
    g.save(); g.beginPath(); g.arc(0.7 * W, 0.74 * H, 0.17 * W, 0, 7); g.fillStyle = '#eef0ee'; g.fill(); g.clip(); fit(g, S.img, 0.7 * W, 0.74 * H + 0.17 * W, 0.32 * W, 0.32 * W); g.restore();
    g.strokeStyle = col; g.lineWidth = 0.006 * W; g.beginPath(); g.arc(0.7 * W, 0.74 * H, 0.17 * W, 0, 7); g.stroke();
    txt(g, 'Серия 01 · Годен до: всегда', m, 0.9 * H, pm(0.018 * H), c.grey); rect(g, m, 0.92 * H, 0.3 * W, 0.055 * H, '#fff'); barcode(g, m + 0.02 * W, 0.928 * H, 0.26 * W, 0.04 * H, c.ink); age(g, W - m - 0.08 * W, 0.9 * H, 0.08 * W, c.ink, px => on(px, 700));
  },
  side(g, W, H, dir, S) { const c = C6, m = 0.08 * W; rect(g, 0, 0, W, H, c.base);
    if (dir > 0) { [['Показания:', 'грусть без причины, понедельник.'], ['Побочные эффекты:', 'зевота, желание прилечь.'], ['Хранить', 'в недоступном для грусти месте.']].forEach(([a, b], i) => {
      txt(g, a, m, 0.12 * H + i * 0.12 * H, gl(0.07 * W, 600), c.ink, 'left', W - 2 * m); txt(g, b, m, 0.16 * H + i * 0.12 * H, gl(0.06 * W), c.grey, 'left', W - 2 * m); }); return; }
    txt(g, 'В СЕРИИ', m, 0.1 * H, on(0.08 * W, 800), c.ink);
    slots(S).forEach((t, i) => { const y = 0.16 * H + i * 0.1 * H; rect(g, m, y, 0.12 * W, 0.06 * H, t.secret ? c.ink : c.codes[i % 6]); txt(g, t.secret ? 'секретная' : t.name, m + 0.17 * W, y + 0.03 * H, gl(0.06 * W, 600), c.ink, 'left', 0.66 * W, 'middle'); }); },
  end(g, W, H, S) { const c = C6; rect(g, 0, 0, W, H, c.base); rect(g, 0, 0.62 * H, W, 0.2 * H, code(S)); txt(g, S.fig, 0.06 * W, 0.36 * H, on(0.16 * H, 800), c.ink, 'left', 0.66 * W, 'middle'); txt(g, `№${two(S.num)}`, 0.94 * W, 0.36 * H, pm(0.14 * H, 600), c.grey, 'right', 1e9, 'middle'); },
  back(g, W, H, S) { const c = C6, m = 0.07 * W; rect(g, 0, 0, W, H, c.base); txt(g, 'Инструкция по применению', m, 0.1 * H, on(0.04 * H, 800), c.ink, 'left', W - 2 * m);
    ['Состав: одна фигурка ~13 см, картон.', 'Способ применения: поставить на полку, смотреть.', 'Передозировка: невозможна.', 'Условия хранения: в коллекции.', 'Призовая фигурка, не для продажи.'].forEach((t, i) => txt(g, t, m, 0.17 * H + i * 0.04 * H, gl(0.024 * H), c.ink, 'left', W - 2 * m));
    rect(g, 0, 0.5 * H, W, 0.04 * H, code(S)); txt(g, 'Мелкие детали. Не для детей до 3 лет.', m, 0.92 * H, gl(0.02 * H), c.grey, 'left', W - 2 * m); },
};

export const STYLES = { prize, minimal, fairy, retro, kraft, kiosk, pharma };

// ---------- Блайндбокс серии — секретка зала (Hn-8) приходит в нём (23.10, совет boxiki-ca): одна раскладка на все серии, палитра и шрифты — коробки зала.
// На лице — герой серии (№1) или знак вопроса, сбоку — 6 силуэтов и «?» секретки; саму секретку нигде не показывать. blind(st, v) — стиль печати, как STYLES[st]; v — вариант лица:
// a — «Герой» (как Pop Mart), b — «Знак вопроса» (силуэты и «?»), c — «Тень героя» (герой тёмным силуэтом под «?»)
const PAL = {
  kraft: { bg: kraftBg, foil: '#A8743A', ink: C4.ink, acc: '#8E3B2E', acc2: '#E9C46A', panel: C4.label, head: sxc, body: px => pm(px, 600), get name() { return [C4.series]; } },
  fairy: { bg: (g, W, H) => { seed = 5; night(g, W, H, 50); }, foil: '#2C3C72', ink: C7.ink, acc: C7.gold, acc2: '#C27A22', panel: '#18204A', head: ru, body: ku, get name() { return C7.series; } },
  minimal: { bg: (g, W, H) => rect(g, 0, 0, W, H, C2.paper), foil: '#5E8FA6', ink: C2.ink, acc: '#5E8FA6', acc2: C2.ser, panel: '#FFFFFF', head: un, body: px => on(px, 600), get name() { return C2.series; } },
  prize: { bg: (g, W, H) => rect(g, 0, 0, W, H, C1.bg), foil: C1.ser, ink: C1.ink, acc: C1.ser, acc2: C1.str, panel: C1.paper, head: dg, body: px => sx(px, 600), get name() { return [C1.series]; } },
  retro: { bg: (g, W, H) => rect(g, 0, 0, W, H, C3.card), foil: C3.o, ink: C3.ink, acc: C3.r, acc2: C3.y, panel: '#FFF8E8', head: sy, body: px => rb(px, 500), get name() { return C3.series; } },
  kiosk: { bg: shutter, foil: '#3A3F48', ink: C5.plate, acc: C5.neon, acc2: C5.neon, panel: C5.base, head: tk, body: gl, get name() { return [C5.series]; } },
};
const six = S => S.all.filter(t => t.rank !== 2).sort((p, q) => p.no - q.no).slice(0, 6), hero = S => six(S)[0] ?? S, secretOf = S => S.all.find(t => t.rank === 2);
const noBase = img => { const c = document.createElement('canvas'); if (!img) { c.width = c.height = 1; return c; }   // картинка ещё не пришла (до P.ready грузится только зал 1) — пусто, печать перерисуется (hall_style REDRAW); старт в зале 3 висел на 94 %
  c.width = img.width; c.height = Math.round(img.height * 0.92); c.getContext('2d').drawImage(img, 0, 0); return c; };   // без круглой подставки (нижние 8 %): в силуэте она — диск
const qBadge = (g, x, y, r, P, fill = P.acc2, ink = P.ink) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = ink; g.lineWidth = r * 0.08; g.stroke(); txt(g, '?', x, y + r * 0.06, P.head(r * 1.2), ink, 'center', 1e9, 'middle'); };
const nameLines = (g, P, x, y, px, col, maxW, align = 'left') => P.name.forEach((t, i) => txt(g, t, x, y + i * px * 1.05, P.head(px), col, align, maxW, 'middle'));
const secretSil = (g, P, S, cx, by, w, h, col, q = P.acc2) => { const t = secretOf(S); if (!t?.sil) return qBadge(g, cx, by - h / 2, Math.min(w, h) * 0.42, P, col, P.panel);   // секретка — её силуэт и «?» поверх (пользователь 23.10: не круг)
  fit(g, tint(noBase(t.sil), col), cx, by, w, h); txt(g, '?', cx, by - h * 0.45, P.head(h * 0.5), q, 'center', 1e9, 'middle'); };
const silRow = (g, P, S, x, y, w, h, col) => { const L = six(S), n = L.length + 1, cw = w / n;   // 6 силуэтов и силуэт секретки
  L.forEach((t, i) => t.sil && fit(g, tint(noBase(t.sil), col), x + cw * (i + 0.5), y + h, cw * 0.9, h)); secretSil(g, P, S, x + cw * (n - 0.5), y + h, cw * 0.9, h, col, col === P.panel ? P.acc : P.panel); };
export const blind = (st, v = 'a') => { const P = PAL[st] ?? PAL.kraft, nm = () => P.name.join(' ');
  const FACE = {
    a(g, W, H, S) { P.bg(g, W, H); const n = P.name.length, px = 0.17 * H * 0.8 / (n + 0.3); rect(g, 0, 0, W, 0.17 * H, P.acc); nameLines(g, P, 0.06 * W, (0.17 * H - (n - 1) * px * 1.05) / 2, px, P.panel, 0.88 * W);   // название — во всю полосу
      fit(g, noBase(hero(S).img), 0.5 * W, 0.8 * H, 0.84 * W, 0.58 * H); qBadge(g, 0.82 * W, 0.28 * H, 0.1 * W, P);
      rect(g, 0, 0.83 * H, W, 0.17 * H, P.ink); txt(g, tr('КОРОБКА-СЮРПРИЗ', 'MYSTERY BOX'), 0.06 * W, 0.885 * H, P.head(0.045 * H), P.panel, 'left', 0.88 * W, 'middle'); txt(g, tr('6 фигурок + 1 секретная', '6 figures + 1 secret'), 0.06 * W, 0.945 * H, P.body(0.026 * H), P.acc2, 'left', 0.88 * W, 'middle'); },
    b(g, W, H, S) { P.bg(g, W, H); nameLines(g, P, 0.5 * W, 0.1 * H, 0.07 * H, P.ink, 0.88 * W, 'center');
      g.fillStyle = P.panel; g.beginPath(); g.arc(0.5 * W, 0.46 * H, 0.27 * W, 0, 7); g.fill(); g.strokeStyle = P.acc; g.lineWidth = 0.025 * W; g.stroke(); txt(g, '?', 0.5 * W, 0.475 * H, P.head(0.4 * W), P.acc, 'center', 1e9, 'middle');
      rect(g, 0, 0.7 * H, W, 0.3 * H, P.acc); silRow(g, P, S, 0.06 * W, 0.73 * H, 0.88 * W, 0.13 * H, P.panel); txt(g, tr('КОРОБКА-СЮРПРИЗ · 6 + ?', 'MYSTERY BOX · 6 + ?'), 0.5 * W, 0.93 * H, P.head(0.035 * H), P.panel, 'center', 0.88 * W, 'middle'); },
    c(g, W, H, S) { P.bg(g, W, H); fit(g, tint(noBase(hero(S).img), P.ink), 0.5 * W, 0.78 * H, 0.8 * W, 0.62 * H); g.globalAlpha = 0.18; rect(g, 0, 0, W, H, P.acc); g.globalAlpha = 1;
      txt(g, '?', 0.5 * W, 0.47 * H, P.head(0.42 * W), P.acc2, 'center', 1e9, 'middle'); g.strokeStyle = P.ink; g.lineWidth = 0.008 * W; g.font = P.head(0.42 * W); g.strokeText('?', 0.5 * W, 0.47 * H);
      rect(g, 0, 0.8 * H, W, 0.2 * H, P.ink); nameLines(g, P, 0.06 * W, 0.85 * H, Math.min(0.055 * H, 0.12 * H / P.name.length), P.panel, 0.88 * W); txt(g, tr('кто внутри — узнаешь, когда откроешь', 'who is inside, you see once you open it'), 0.06 * W, 0.965 * H, P.body(0.022 * H), P.acc2, 'left', 0.88 * W, 'middle'); },
  };
  return { name: `блайндбокс ${v}`, get series() { return `${nm()} · blind-${v}`; }, st, face: FACE[v] ?? FACE.a,   // st — стиль серии: packetLook(st) для пакетика
    side(g, W, H, dir, S) { P.bg(g, W, H);
      if (dir > 0) { txt(g, tr('В СЕРИИ', 'IN THE SERIES'), W / 2, 0.07 * H, P.head(0.12 * W), P.ink, 'center', 0.9 * W, 'middle');
        [...six(S), { secret: true }].forEach((t, i) => { const w = 0.4 * W, h = 0.2 * H, x = 0.07 * W + (i % 2) * 0.46 * W, y = 0.12 * H + Math.floor(i / 2) * 0.215 * H;
          if (t.secret) { secretSil(g, P, S, x + w / 2, y + h * 0.88, w * 0.9, h * 0.86, P.acc, P.panel); txt(g, tr('секретная', 'secret'), x + w / 2, y + h * 1.0, P.body(0.06 * W), P.ink, 'center', w, 'middle'); return; }
          if (t.sil) fit(g, tint(noBase(t.sil), P.acc), x + w / 2, y + h * 0.88, w * 0.9, h * 0.86); txt(g, String(t.no).padStart(2, '0'), x + 0.02 * W, y + 0.05 * H, P.head(0.08 * W), P.ink, 'left', 1e9, 'middle'); }); return; }
      rect(g, 0, 0, W, H, P.acc); rot(g, W / 2, 0.42 * H, Math.PI / 2, () => txt(g, nm(), 0, 0, P.head(0.3 * W), P.panel, 'center', 0.72 * H, 'middle')); qBadge(g, W / 2, 0.88 * H, 0.22 * W, P); },
    end(g, W, H) { P.bg(g, W, H); const px = Math.min(0.14 * H, 0.3 * H / P.name.length); nameLines(g, P, W / 2, 0.2 * H, px, P.ink, 0.88 * W, 'center'); qBadge(g, W / 2, 0.66 * H, 0.22 * H, P); },   // торец почти квадратный: название сверху, «?» под ним (в строку сжималось в штрихкод)
    back(g, W, H, S) { P.bg(g, W, H); txt(g, tr('КОРОБКА-СЮРПРИЗ', 'MYSTERY BOX'), 0.07 * W, 0.08 * H, P.head(0.05 * H), P.ink, 'left', 0.86 * W, 'middle');
      tr(['Какая фигурка внутри — не видно, пока не откроешь.', 'В серии 6 фигурок и 1 секретная.', 'Внутри: фигурка ~13 см в пакетике.'], ['Which figure is inside, you only see once it is open.', 'The series has 6 figures and 1 secret.', 'Inside: a ~13 cm figure in a foil bag.']).forEach((t, i) => txt(g, t, 0.07 * W, 0.15 * H + i * 0.04 * H, P.body(0.026 * H), P.ink, 'left', 0.86 * W, 'middle'));
      silRow(g, P, S, 0.07 * W, 0.32 * H, 0.86 * W, 0.16 * H, P.acc);
      rect(g, 0.07 * W, 0.74 * H, 0.36 * W, 0.11 * H, '#fff'); barcode(g, 0.09 * W, 0.755 * H, 0.32 * W, 0.08 * H, '#1B1B1F'); age(g, 0.8 * W, 0.74 * H, 0.12 * W, P.ink, P.body);
      txt(g, tr('Внимание: мелкие детали. Не для детей до 3 лет.', 'Warning: small parts. Not for children under 3.'), 0.07 * W, 0.93 * H, P.body(0.02 * H), P.ink, 'left', 0.86 * W, 'middle'); } };
};
export const packetLook = st => { const P = PAL[st] ?? PAL.kraft; return { get name() { return P.name.join(' '); }, base: P.foil, light: P.acc2, ink: P.panel, head: P.head, body: P.body }; };   // печать фольгированного пакетика той же серии (packet.js)
