// packet.js — объёмный пакетик из фольги (подушка, зубчатая запайка, печать Mixy Pals), рвётся вертикально по центру, как обёртка на oryzo.ai.
// Лицо и оборот делятся рваной линией xt(y) на левую и правую половины (4 сетки); кончик разрыва идёт сверху вниз (p 0 → 1),
// выше кончика лицо расходится буквой V, губы заворачиваются наружу (изнанка — серебро), оборот цел и только отходит назад;
// o 0 → 1 — половинки разлетаются (оборот рвётся тут же).
// Фольга облегает фигурку внутри (карта глубины по её вершинам). Рамка: x — ширина, y — вверх, z — к зрителю (лицо), начало — центр. Используют lab.js (путь приза E, pack=blind) и wrap.js (стенд).
import * as THREE from 'three';

const FJ = '"M PLUS Rounded 1c", sans-serif', FL = 'Fredoka, ' + FJ;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const drawFit = (g, img, cx, cy, w, h) => { const k = Math.min(w / img.width, h / img.height); g.drawImage(img, cx - img.width * k / 2, cy - img.height * k / 2, img.width * k, img.height * k); };

// W × H — плоский пакетик, B — толщина пустой подушки на сторону, SIDE — запайка; sils — силуэты серии (canvas);
// inside — { geo, matrix }: фигурка внутри (matrix — из её координат в рамку пакетика), фольга облегает её с зазором 5 мм
export function makePacket({ W = 0.165, H = 0.2, B = 0.022, SIDE = 0.009, sils = [], inside = null, look = null } = {}) {   // look — печать серии (boxstyles.packetLook), без него — старая Mixy Pals
  const xt = y => 0.0016 * Math.sin(y * 700) + 0.001 * Math.sin(y * 1900 + 1.3);   // рваная линия
  const edge = (x, y) => Math.min(W / 2 - Math.abs(x), y + H / 2, H / 2 - y);   // до края, м
  const GX = 42, GY = 52, lump = [new Float32Array(GX * GY), new Float32Array(GX * GY)];   // карта глубины фигурки: [лицо +z, оборот −z], м
  if (inside) {
    const raw = lump.map(() => new Float32Array(GX * GY).fill(-1)), p = new THREE.Vector3(), A = inside.geo.attributes.position;
    for (let i = 0; i < A.count; i++) { p.fromBufferAttribute(A, i).applyMatrix4(inside.matrix); const gx = Math.round((p.x / W + 0.5) * (GX - 1)), gy = Math.round((p.y / H + 0.5) * (GY - 1));
      if (gx < 0 || gy < 0 || gx >= GX || gy >= GY) continue; const k = gy * GX + gx; raw[0][k] = Math.max(raw[0][k], p.z); raw[1][k] = Math.max(raw[1][k], -p.z); }
    const pass = (a, op) => { const o = new Float32Array(GX * GY); for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) { let m = op ? -1 : 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= GX || Y >= GY) continue; const v = a[Y * GX + X]; if (op) m = Math.max(m, v); else { m += Math.max(0, v); n++; } }
      o[y * GX + x] = op ? m : m / n; } return o; };   // op: расширение (max 3×3), иначе сглаживание
    raw.forEach((r, f) => { const d1 = pass(r, 1), sm = pass(pass(pass(d1, 1), 0), 0); for (let k = 0; k < sm.length; k++) lump[f][k] = Math.max(sm[k], d1[k]) + 0.005; });   // не ниже поверхности фигурки
  }
  const lumpAt = (f, x, y) => { const u = Math.min(GX - 1.001, Math.max(0, (x / W + 0.5) * (GX - 1))), v = Math.min(GY - 1.001, Math.max(0, (y / H + 0.5) * (GY - 1))), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, L = lump[f > 0 ? 0 : 1];
    return (L[j * GX + i] * (1 - a) + L[j * GX + i + 1] * a) * (1 - b) + (L[(j + 1) * GX + i] * (1 - a) + L[(j + 1) * GX + i + 1] * a) * b; };
  const bulge = (x, y, f) => Math.max(B * Math.sqrt(ss(SIDE, SIDE + 0.04, W / 2 - Math.abs(x)) * ss(SIDE, SIDE + 0.04, y + H / 2) * ss(SIDE, SIDE + 0.04, H / 2 - y)),   // подушка: 0 на запайке
    lumpAt(f, x, y) * ss(SIDE * 0.6, SIDE + 0.014, edge(x, y)));      // фигурка под фольгой

  const CW = 600, CH = Math.round(CW * H / W), seal = SIDE / W * CW;
  const tex = (draw, srgb = true) => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; draw(c.getContext('2d'), CW, CH); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const zig = (g, w, h, t) => {                                       // зубчатый край запайки — альфа
    g.globalCompositeOperation = 'destination-out'; g.beginPath();
    for (let x = 0; x <= w; x += t) { g.moveTo(x, 0); g.lineTo(x + t / 2, t * 0.55); g.lineTo(x + t, 0); g.moveTo(x, h); g.lineTo(x + t / 2, h - t * 0.55); g.lineTo(x + t, h); }
    for (let y = 0; y <= h; y += t) { g.moveTo(0, y); g.lineTo(t * 0.55, y + t / 2); g.lineTo(0, y + t); g.moveTo(w, y); g.lineTo(w - t * 0.55, y + t / 2); g.lineTo(w, y + t); }
    g.fill(); g.globalCompositeOperation = 'source-over';
  };
  const shade = (c, k) => { const n = parseInt(c.slice(1), 16), f = v => Math.round(Math.min(255, Math.max(0, v * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
  const printLook = (g, w, h, front, L) => {                          // печать серии: фольга цвета серии, название узором, «?», силуэты
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, shade(L.base, 1.25)); bg.addColorStop(0.5, L.base); bg.addColorStop(1, shade(L.base, 0.62)); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.5); g.globalAlpha = 0.14; g.fillStyle = L.ink; g.font = L.head(w * 0.06);
    for (let y = -h; y < h; y += w * 0.11) for (let x = -w; x < w; x += w * 0.6) g.fillText(L.name, x + (y / (w * 0.11) % 2) * w * 0.3, y); g.restore(); g.globalAlpha = 1;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fitT = (t, y, font, max) => { g.font = font; const k = Math.min(1, max / g.measureText(t).width); g.save(); g.translate(w / 2, y); g.scale(k, 1); g.fillText(t, 0, 0); g.restore(); };
    if (front) { g.fillStyle = L.ink; fitT(L.name, h * 0.2, L.head(w * 0.1), w * 0.8);
      g.fillStyle = L.light; g.beginPath(); g.arc(w / 2, h * 0.47, w * 0.19, 0, 7); g.fill(); g.fillStyle = shade(L.base, 0.5); g.font = L.head(w * 0.24); g.fillText('?', w / 2, h * 0.48);
      const cw = w * 0.84 / Math.max(1, sils.length); sils.forEach((s, i) => drawFit(g, s, w * 0.08 + cw * (i + 0.5), h * 0.74, cw * 0.85, h * 0.12));
      g.fillStyle = L.ink; fitT('6 ФИГУРОК + СЕКРЕТНАЯ', h * 0.86, L.body(w * 0.042), w * 0.8); }
    else { g.fillStyle = L.ink; ['Призовая фигурка ~13 см', 'Одна из 6 или секретная', 'Не для детей до 3 лет'].forEach((t, i) => fitT(t, h * (0.4 + i * 0.07), L.body(w * 0.045), w * 0.76)); }
  };
  const print = front => tex((g, w, h) => {
    if (look) { printLook(g, w, h, front, look); g.strokeStyle = 'rgba(255,255,255,.8)'; g.setLineDash([w * 0.02, w * 0.015]); g.lineWidth = w * 0.006; g.beginPath(); g.moveTo(w / 2, seal * 1.5); g.lineTo(w / 2, h * 0.3); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#fff'; g.font = `800 ${w * 0.05}px ${FJ}`; g.fillText('✂', w / 2 + w * 0.05, seal * 2.6); zig(g, w, h, w * 0.035); return; }   // пунктир не через «?»
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#f27aa0'); bg.addColorStop(0.5, '#d94b80'); bg.addColorStop(1, '#a8336a'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.5); g.fillStyle = 'rgba(255,220,235,.16)'; g.font = `700 ${w * 0.07}px ${FL}`;
    for (let y = -h; y < h; y += w * 0.11) for (let x = -w; x < w; x += w * 0.36) g.fillText('Mixy Pals', x + (y / (w * 0.11) % 2) * w * 0.18, y); g.restore();   // узор по диагонали, как «ORYZO» у oryzo
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (front) {
      g.fillStyle = '#fff'; g.font = `700 ${w * 0.13}px ${FL}`; g.lineWidth = w * 0.025; g.strokeStyle = '#8e2f63'; g.strokeText('Mixy Pals', w / 2, h * 0.2); g.fillText('Mixy Pals', w / 2, h * 0.2);
      g.fillStyle = 'rgba(255,240,246,.92)'; g.beginPath(); g.arc(w / 2, h * 0.47, w * 0.2, 0, 7); g.fill();
      g.fillStyle = '#8e2f63'; g.font = `700 ${w * 0.25}px ${FL}`; g.fillText('?', w / 2, h * 0.48);
      const cw = w * 0.84 / Math.max(1, sils.length); sils.forEach((s, i) => drawFit(g, s, w * 0.08 + cw * (i + 0.5), h * 0.74, cw * 0.85, h * 0.12));
      g.fillStyle = '#fff'; g.font = `800 ${w * 0.04}px ${FJ}`; g.fillText('СЕРИЯ 1 · 6 ФИГУРОК + СЕКРЕТ', w / 2, h * 0.86);
    } else {
      g.fillStyle = 'rgba(255,240,246,.9)'; g.fillRect(w * 0.12, h * 0.3, w * 0.76, h * 0.42); g.fillStyle = '#5a2148'; g.font = `800 ${w * 0.045}px ${FJ}`;
      ['Призовая фигурка ~13 см', 'Внутри — одна из 6 + секретная', 'Не для детей до 3 лет', 'boxiki'].forEach((t, i) => g.fillText(t, w / 2, h * (0.36 + i * 0.07)));
      g.fillStyle = '#222'; for (let i = 0; i < 40; i++) g.fillRect(w * 0.3 + i * w * 0.01, h * 0.62, w * (i % 3 ? 0.004 : 0.007), h * 0.06);
    }
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.setLineDash([w * 0.02, w * 0.015]); g.lineWidth = w * 0.006; g.beginPath(); g.moveTo(w / 2, seal * 1.5); g.lineTo(w / 2, h * 0.36); g.stroke(); g.setLineDash([]);   // пунктир по центру сверху
    g.fillStyle = '#fff'; g.font = `800 ${w * 0.05}px ${FJ}`; g.fillText('✂', w / 2 + w * 0.05, seal * 2.6);
    zig(g, w, h, w * 0.035);
  });
  const alpha = tex((g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); zig(g, w, h, w * 0.035); }, false);
  const normal = tex((g, w, h) => {                                   // нормали: рубчик на запайке + мятые складки фольги
    const id = g.createImageData(w, h), hgt = new Float32Array(w * h), rnd = (s => () => (s = s * 16807 % 2147483647) / 2147483647)(7);
    const folds = Array.from({ length: 14 }, () => [rnd() * 6.28, rnd() * w, rnd() * h, 0.4 + rnd()]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const de = Math.min(x, w - x, y, h - y) / w * W;                // до края, м
      let v = de < SIDE ? 0.5 + 0.5 * Math.sin(de * 2600) : 0;
      if (de >= SIDE) for (const [a, fx, fy, k] of folds) { const d = Math.abs((x - fx) * Math.cos(a) + (y - fy) * Math.sin(a)); v += k * 0.35 * Math.exp(-d * d / 30); }
      hgt[y * w + x] = v;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = hgt[y * w + Math.min(w - 1, x + 1)] - hgt[y * w + Math.max(0, x - 1)], dy = hgt[Math.min(h - 1, y + 1) * w + x] - hgt[Math.max(0, y - 1) * w + x];
      const n = new THREE.Vector3(-dx * 1.6, dy * 1.6, 1).normalize(); id.data.set([(n.x * 0.5 + 0.5) * 255, (n.y * 0.5 + 0.5) * 255, (n.z * 0.5 + 0.5) * 255, 255], 4 * (y * w + x));
    }
    g.putImageData(id, 0, 0);
  }, false);
  const outer = front => new THREE.MeshStandardMaterial({ map: print(front), normalMap: normal, normalScale: new THREE.Vector2(0.6, 0.6), metalness: 0.7, roughness: 0.3, alphaTest: 0.5, transparent: true });
  const inner = new THREE.MeshStandardMaterial({ color: 0xf2eef5, alphaMap: alpha, normalMap: normal, normalScale: new THREE.Vector2(0.4, 0.4), metalness: 0.55, roughness: 0.3, alphaTest: 0.5, transparent: true, side: THREE.BackSide });
  const mats = [outer(true), outer(false), inner];

  // сетка половины листа: s — сторона (−1 левая, +1 правая), f — лицо (+1) или оборот (−1)
  const half = (s, f) => {
    const nx = 36, ny = 64, n = (nx + 1) * (ny + 1), R = new Float32Array(3 * n), UV = new Float32Array(2 * n), idx = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const k = j * (nx + 1) + i, y = (j / ny - 0.5) * H, a = s * W / 2, x = a + (xt(y) - a) * i / nx;   // i = 0 — боковой край, i = nx — линия разрыва
      R.set([x, y, f * (bulge(x, y, f) + 0.0003)], 3 * k); UV.set([f > 0 ? x / W + 0.5 : 0.5 - x / W, y / H + 0.5], 2 * k);   // оборот читается сзади не зеркально
      if (i < nx && j < ny) { const a0 = k, b = k + 1, c = k + nx + 1, d = c + 1; s * f > 0 ? idx.push(a0, c, d, a0, d, b) : idx.push(a0, d, c, a0, b, d); }   // наружу — к +z у лица, к −z у оборота
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(R.slice(), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const o = new THREE.Mesh(geo, mats[f > 0 ? 0 : 1]), b = new THREE.Mesh(geo, inner); o.castShadow = true; o.userData = { R, s, f }; return [o, b];
  };
  const group = new THREE.Group(), sides = [-1, 1].map(s => { const G = new THREE.Group(), m = [...half(s, 1), ...half(s, -1)]; G.add(...m); G.userData.m = m.filter((_, i) => i % 2 === 0); group.add(G); return G; });
  const K = 70, L = 0.035;                                            // кривизна завитка губы (рад/м) и ширина полосы, что заворачивается
  let P = -1;
  const set = (p, o = 0) => {
    if (p !== P) { P = p; const yf = H / 2 + 0.01 - p * (H - 0.03);   // кончик разрыва: сверху вниз, низ запайки остаётся целым
      for (const G of sides) for (const m of G.userData.m) {
        const { R, s, f } = m.userData, A = m.geometry.attributes.position.array;
        for (let k = 0; k < R.length; k += 3) {
          let x = R[k], y = R[k + 1], z = R[k + 2]; const u = y - yf, q = ss(0, 0.06, u);
          if (q > 0 && f < 0) z -= 0.06 * Math.max(0, u) * q * ss(SIDE, 0.05, W / 2 - Math.abs(x));   // оборот цел — только отходит назад, горло раскрывается
          else if (q > 0) {
            const d = s * (x - xt(y)) + 0.0001, r = Math.max(0, L - d), c = q * K;   // r — от шарнира к губе
            if (r > 0) { const xh = xt(y) + s * L; x = xh - s * Math.sin(c * r) / c; z += (1 - Math.cos(c * r)) / c; }   // губа заворачивается наружу
            x += s * 0.28 * Math.max(0, u) * q; z += 0.12 * Math.max(0, u) * q;   // лицо расходится буквой V
          }
          A[k] = x; A[k + 1] = y; A[k + 2] = z;
        }
        m.geometry.attributes.position.needsUpdate = true; m.geometry.computeVertexNormals();
      } }
    sides.forEach((G, i) => { const s = i ? 1 : -1, e = o * o; G.position.set(s * 0.3 * o, -0.6 * e, 0.08 * o); G.rotation.set(0.8 * o, s * 1.4 * o, s * 0.5 * o); });   // разлёт половинок
    for (const m of mats) m.opacity = 1 - ss(0.4, 1, o);
    group.userData.p = p;
  };
  set(0);
  group.userData = { set, p: 0, w: W, h: H, B, mats, tipY: p => H / 2 + 0.01 - p * (H - 0.03) };
  return group;
}
