// Подсказка удара — фоновый поток страницы (index.html, HINT): заход лапы в точку из снимка игры (dbg.snap), та же физика, что на странице и в scan_js.mjs
// (MuJoCo WASM 3.16 + drive.js); лапа едет кнопками от старта, как у игрока. {init: {xml, J, q0}} → {ready}; {job: {id, S, x, y, seed, every}} → исход + кадры qpos.
importScripts('drive.js');
let mj, m, J, q0;
const WIN_Z = -0.10, rng = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
onmessage = async ({ data: { init, job } }) => {
  if (init) { mj ??= await (await import('./vendor/@mujoco/mujoco@3.16.0/mujoco.js')).default(); m?.delete(); m = mj.MjModel.from_xml_string(init.xml); ({ J, q0 } = init); postMessage({ ready: true }); return; }
  const r = attempt(job); postMessage(r, r.frames.map(f => f.buffer));
};
function attempt({ id, S, x, y, seed, every }) {
  const c = J.c, d = new mj.MjData(m), st = Drive.setup(mj, m, d, J), dt = m.opt.timestep, M = S.M, rnd = rng(seed), b = 3 * mj.mj_name2id(m, mj.mjtObj.mjOBJ_BODY.value, 'box');
  Drive.machine(mj, m, d, J, M, S.B);
  d.qpos.set(S.qpos); d.qvel.set(S.qvel); d.mocap_pos.set(S.mocap_pos); d.mocap_quat.set(S.mocap_quat); mj.mj_forward(m, d); st.ph = [3, 3]; const sc0 = near(d);   // посреди игры — трение лопаток заново (как scan_js)
  const G = Drive.game(M), frames = []; let tw = -1, zmin = d.xpos[b + 2], kr = -1;
  G.t = 0; Drive.press(G, 1);
  for (let k = 0; k < 25000; k++) {
    if (G.s === 'wait2') { if (tw < 0) tw = G.t; if (G.t >= tw + 0.15) Drive.press(G, 2); }
    Drive.step(mj, m, d, J, st, Drive.auto(G, d, st, J, M, { 1: G.P[0] < x, 2: G.P[1] < y }, dt, q0, rnd));
    if (k % every === 0) frames.push(Float64Array.from(d.qpos));
    zmin = Math.min(zmin, d.xpos[b + 2]);
    if (G.s === 'return' && kr < 0) kr = k;
    if ((kr >= 0 && k > kr + 300) || (G.s === 'idle' && k > 10)) break;                 // исход ясен: коробка отпущена и легла — возврат домой не считаем
  }
  const r = { id, x, y, seed, won: zmin < WIN_Z, z: d.xpos[b + 2], sc: near(d), sc0, frames };
  d.delete(); return r;
}
function near(d) {   // близость к провалу, см (меньше — лучше) — как L.score в game_solve.py: размах коробки поперёк прутков минус щель в свету в её x, плюс 0.5 × уход центра от середины щели
  const c = J.c, g = c.GB, R = d.geom_xmat, P = d.geom_xpos, hs = m.geom_size, x = P[3 * g];
  const wy = 2 * [0, 1, 2].reduce((s, j) => s + Math.abs(R[9 * g + 3 + j]) * hs[3 * g + j], 0);
  const [y1, y2] = [c.BARS[1], c.BARS[2]].map((k, i) => { const [w, qx, qy, qz] = m.geom_quat.slice(4 * k, 4 * k + 4), ax = 2 * (qx * qz + w * qy), ay = 2 * (qy * qz - w * qx);
    return m.geom_pos[3 * k + 1] + (x - m.geom_pos[3 * k]) / ax * ay + (i ? -1 : 1) * m.geom_size[3 * k]; });
  return (wy - (y2 - y1)) * 100 + 0.5 * Math.abs(P[3 * g + 1] - (y1 + y2) / 2) * 100;
}
