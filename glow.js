// glow.js — свечение фигурок по щелчку (23.10, HANDOFF_CHARACTERS п. 2): Жар-птица («перегорела» — перо-лампочка) и Лось-холодильник (лампочка внутри).
// Координаты — в нормированной фигурке квартиры (apt.js figLoad: рост 1, ступни в 0, лицом в −y). Стенд выбора — style_lab/glow.html.
import * as THREE from 'three';

// центры сняты кликом по модели на стенде (?pick=1); c — центр свечения, r — радиус спада, col — цвет, inside — светится полость (стенки, обращённые к центру), а не выпуклая колба; mode — как загорается (addGlow)
export const GLOW = {
  zhar_ptitsa: { c: [0.208, -0.21, 0.44], r: 0.065, col: 0xffa845, inside: false, mode: 'b' },   // «перегорела»: мигнёт и загорится
  los_holodilnik: { c: [0.06, -0.08, 0.33], r: 0.16, col: 0xfff1d6, inside: true, mode: 'a' },   // свет в холодильнике: плавно (выбор пользователя 23.10)
};

const haloTex = (() => { let t = null; return () => t ??= (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(); })();

// Материал фигурки со свечением в точке: свой клон (общий FIG[k].mat не трогаем), uniform uG — яркость 0…1
export function glowMat(mat, k) { const S = GLOW[k], m = mat.clone(), U = { uG: { value: 0 }, uC: { value: new THREE.Vector3(...S.c) }, uR: { value: S.r }, uCol: { value: new THREE.Color(S.col) }, uIn: { value: S.inside ? 1 : 0 } };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vLoc; varying vec3 vLocN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position; vLocN = normal;');
    sh.fragmentShader = 'uniform float uG, uR, uIn; uniform vec3 uC, uCol; varying vec3 vLoc; varying vec3 vLocN;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec3 dv = uC - vLoc; float w = 1.0 - smoothstep(uR * 0.35, uR, length(dv)); if (uIn > 0.5) w *= smoothstep(-0.1, 0.4, dot(normalize(vLocN), normalize(dv)));   // полость: светятся стенки, обращённые к лампе
        totalEmissiveRadiance += uCol * uG * w * (uIn > 0.5 ? 0.25 + 0.6 * dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)) : 2.6); }   // колба светится сама, полость — по светлоте стенок`); };
  m.customProgramCacheKey = () => 'glow'; m.userData.glow = U; return m; }

// Свечение на меше фигурки: материал, точечный свет и ореол внутри меша (едут вместе с ним). mode: a — плавно вкл/выкл, b — мигает и загорается, c — вспышка и гаснет
// горит ли свет фигурки: по умолчанию да (и на полке), погасил в руке — запомнилось; tried — касался хоть раз (подсказка в руке больше не нужна).
// В игре — сохранение игры (glowStore(Save): поле glow уходит в облако Яндекса), на стенде — localStorage; без хранилища — всё по умолчанию
const ST = (() => { try { return JSON.parse(localStorage.getItem('glow') ?? '{}'); } catch { return {}; } })();
let save = () => { try { localStorage.setItem('glow', JSON.stringify(ST)); } catch {} };
export const glowStore = S => { if (!S?.set) return; const g = S.get?.()?.glow; if (g) { ST.off = g.off ?? []; ST.tried = g.tried ?? []; }   // сохранение игры главнее браузерного
  save = () => S.set({ glow: { off: ST.off ?? [], tried: ST.tried ?? [] } }); };
export const glowOn = k => !ST.off?.includes(k), glowTried = k => !!ST.tried?.includes(k);
export const setGlowOn = (k, v) => { ST.off = (ST.off ?? []).filter(x => x !== k).concat(v ? [] : [k]); ST.tried = [...new Set([...(ST.tried ?? []), k])]; save(); };
export let POW = 0.03;                                                 // сила точечного света, кд (фигурка ~20 см); стенд подбирает ?pow=
export const setPow = v => { POW = v; };
export function addGlow(mesh, k, mode, { light: withLight = true } = {}) { const S = GLOW[k]; if (!S) return null; mode ??= S.mode ?? 'a';   // light: false — без точечного света (полки: живой свет в сцене пересобрал бы все шейдеры)
  mesh.material = glowMat(mesh.material, k); const U = mesh.material.userData.glow, c = new THREE.Vector3(...S.c);
  const light = withLight ? new THREE.PointLight(S.col, 0, 0, 2) : null; if (light) { light.position.copy(c); mesh.add(light); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: S.col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.copy(c).add(new THREE.Vector3(0, S.inside ? -0.1 : 0, 0)); halo.scale.setScalar(S.r * (S.inside ? 3 : 3.4)); mesh.add(halo);
  let on = false, t = 9, g = 0;
  const level = () => { if (mode === 'c') return t < 0.08 ? 1.3 : Math.max(0, 1 - (t - 0.08) / 2.4) * (t > 1.8 ? 0.75 + 0.25 * Math.sin(t * 40) : 1);   // вспышка, к концу — дрожит
    if (!on) return 0; if (mode === 'b' && t < 0.9) return [1, 0, 0.8, 0, 0, 1, 0.3, 1][Math.floor(t / 0.11)] ?? 1;   // старая лампочка: мигнула и загорелась
    return 1; };
  return { mesh, toggle() { if (mode === 'c') { t = 0; return; } on = !on; t = 0; },
    get on() { return on; }, set(v) { on = v; t = 9; g = v ? 1 : 0; U.uG.value = g; halo.material.opacity = Math.min(1, g); if (light) light.intensity = g * POW; },   // сразу, без мигания и затухания
    screen(cam) { const v = mesh.localToWorld(c.clone()).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },   // где колба на экране — для подсказки
    update(dt) { t += dt; const L = level(); g += (L - g) * (mode === 'a' ? Math.min(1, dt * 6) : 1); U.uG.value = g; if (light) light.intensity = g * POW; halo.material.opacity = Math.min(1, g); } };
}
