// Драйвер лапы 2hsq — перенос drive_ref из yt/gpuphys/game_export.py (= k_drive gpu_run без PEND_LAT / LIFT_ACTION / ARM_K).
// Обычный скрипт (globalThis.Drive), чтобы страница открывалась с file://; Node грузит его через vm (replay_js.mjs). Массивы MuJoCo WASM плоские: поле (n, k) → [i * k + j].
// cmd шага: x[3] цель каретки до провиса (м), q[4] поворот головы, rz[3] ось головы, c[4] команды рук, ph[2] фаза эталон 1/2/3, pre[2] до смыкания, rel — до раскрытия, mh масса головы.
globalThis.Drive = (() => {
function setup(mj, m, d, J) {
  for (const [n, v] of Object.entries(J.model)) m[n].set(v.flat(2));
  const I = J.init;
  for (const n of ['qpos', 'qvel', 'mocap_pos', 'mocap_quat', 'ctrl']) d[n].set(I[n].flat());
  d.qfrc_applied.set(I.qfrc);
  mj.mj_forward(m, d);
  const c = J.c, gcat = new Int8Array(m.ngeom);
  const cj = mj.mj_name2id(m, mj.mjtObj.mjOBJ_JOINT.value, 'cable'), cb = [];   // трос: ползун головы с нижним упором; тела лапы — голова и всё под ней
  for (let b = 1; b < m.nbody; b++) for (let p = b; p > 0; p = m.body_parentid[p]) if (p === c.hb) { cb.push(b); break; }
  ['-1', '1'].forEach((sd, ci) => c.AG[sd].forEach(g => { gcat[g] = ci + 1; }));
  gcat[c.GB] = 3; c.BARS.forEach(g => { gcat[g] = 4; }); gcat[c.HG] = 5;
  return { gcat, press: [-1, -1], ph: [1, 1], k: 0, cj, cb, LIM: mj.mjtConstraint.mjCNSTR_LIMIT_JOINT.value, fsup: 0, td: 0 };
}
function step(mj, m, d, J, st, cmd) {
  const c = J.c, cat = [0, 0, 0, 0, 0], cv = d.contact, P = c.PADG;
  let padbox = false;
  for (let i = 0; i < d.ncon; i++) {
    const con = cv.get(i), g1 = con.geom1, g2 = con.geom2, a = st.gcat[g1], b = st.gcat[g2]; con.delete();
    for (const [a_, b_] of [[a, b], [b, a]]) {
      if ((a_ === 1 || a_ === 2) && b_ === 3) cat[a_ - 1] = 1;
      if ((a_ === 1 || a_ === 2) && b_ === 4) cat[a_ + 1] = 1;
    }
    if ((a === 3 && b === 5) || (a === 5 && b === 3)) cat[4] = 1;
    if ((b === 3 && (g1 === P['-1'] || g1 === P['1'])) || (a === 3 && (g2 === P['-1'] || g2 === P['1']))) padbox = true;
  }
  cv.delete();
  const xp = d.xpos, hb = c.hb, x = cmd.x.slice(), rz = cmd.rz;
  const lo = c.dslack - ((x[0] - xp[hb * 3]) * rz[0] + (x[1] - xp[hb * 3 + 1]) * rz[1] + (x[2] - xp[hb * 3 + 2]) * rz[2]);
  st.slack = lo > 0; st.cat = cat;                                                 // для игры: голова легла (провис), касания L/R коробки и прутков, головы
  if (lo > 0) for (let j = 0; j < 3; j++) x[j] += lo * rz[j];                       // провис троса: голова легла — каретка не тянет её дальше
  d.mocap_pos.set(x); d.mocap_quat.set(cmd.q); d.ctrl.set(cmd.c);
  const gf = m.geom_friction, pf = m.pair_friction, fr = m.actuator_forcerange;
  ['-1', '1'].forEach((sd, ci) => {
    const touch = cat[ci] || cat[2 + ci], pre = cmd.pre[ci];
    let F = touch ? c.FMAX : c.FFREE;
    if (!pre && st.press[ci] < 0 && cat[ci]) st.press[ci] = st.k;
    if (cmd.rel) {
      const ph = cmd.ph[ci]; F = c.FMAX * { 1: 0.05, 2: 0.4, 3: 1.0 }[ph];
      if (c.MECHF && st.press[ci] < 0 && !touch) F = c.FFREE;
      if (ph !== st.ph[ci]) {                                                        // смена фазы: лопатка цепляет (μ + кручение) только с фазы 3
        const pg = c.PADG[sd];
        for (const g of c.AG[sd]) {
          const mu = ph === 3 && g === pg ? c.mu_pad : 0.0;
          gf[g * 3 + 1] = g === pg ? (mu > 0 ? c.tors : 0.0) : gf[g * 3 + 1]; gf[g * 3] = mu;
        }
        for (const [i, g] of c.PRS[sd]) { const mu = ph === 3 && g === c.PADG[sd] ? c.mu_pad : 0.0; pf[i * 5] = mu; pf[i * 5 + 1] = mu; }
        for (const b of c.ABOD[sd]) m.body_gravcomp[b] = ph === 3 ? 0.0 : 1.0;
        st.ph[ci] = ph;
      }
    }
    if (c.armt[ci] > 0 && !pre && cmd.rel) F = c.armt[ci];                          // после смыкания — постоянный момент ARM_T
    fr[4 * ci] = -F; fr[4 * ci + 1] = F;
  });
  if (cmd.cg) mechStep(mj, m, d, J, st, cmd, padbox);
  m.body_mass[hb] = cmd.mh;
  const v = d.qvel, B = c.BV, dt = m.opt.timestep, n = c.sub ? Math.min(8, Math.ceil((Math.hypot(v[B], v[B + 1], v[B + 2]) + Math.hypot(v[B + 3], v[B + 4], v[B + 5]) * m.geom_rbound[c.GB]) * dt / c.sub)) : 1;
  if (n > 1) { m.opt.timestep = dt / n; for (let i = 0; i < n; i++) mj.mj_step(m, d); m.opt.timestep = dt; } else mj.mj_step(m, d);   // зал: быстрая коробка — точка коробки за подшаг ≤ A.SUB
  if (MECH.PRESS > 0) { let T = 0, W = 0; for (let i = 0; i < d.nefc; i++) if (d.efc_type[i] === st.LIM && d.efc_id[i] === st.cj) T += d.efc_force[i];
    for (const b of st.cb) W += m.body_mass[b]; const dt = m.opt.timestep;   // датчик: сглаживание 0.05 с; упор — только через 0.2 с после натяжения троса на спуске (старт рывком: трос на 2–3 шага провисает, голову подбрасывает)
    st.td = st.dropping && (st.td > 0 || T > 7.85 * W) ? st.td + dt : 0; st.fsup = st.dropping ? st.fsup + (W * 9.81 - T - st.fsup) * Math.min(1, dt / 0.05) : 0; st.taut = st.td >= 0.2; }                                     // сколько веса лапы держат снизу, Н (датчик провиса троса)
  st.k++;
}

// --- Режим «как эталон» (S.mech; замеры; числа — замеры, замеры, замеры; поведение, не сырые единицы UE).
const MECH = {                 // числа эталон, сдвинутые на 0.2–0.5 % (пользователь 22.10: «везде на доли процентов»; в комментариях — исходные эталон)
  PIV: 0.172,                 // шарнир маятника над началом каретки, м: 10 см над центром масс головы (Phys_UNIT висит в 10 см под узлом каретки)
  LIM: [1.004, 0.997, 1.003],             // пределы качания у старта, °: вокруг x (голова уходит поперёк прутков), y (вдоль), z (кручение) — Default_AngLimit_XY / _Z
  TOL: [0.996, 30.1, 4.985],            // + доля глубины × ArmTolerance Y / X / Z (ступень 0). ponytail: «X» = вдоль прутков — по названию, ось констрейнта не проверена
  HEAD_MAX: 90,                 // предел качания головы, °, на всей глубине. 90 — без предела (залы как раньше: до 31° внизу хода, дом 1 CGQ); 2 — строгий, как дома 2 и 6 CGQ (ArmToleranceX 1). Пользователь 23.10: «голова так не крутится — 1–2°»; в залы — после сверки сложности. ?dev — ползунок
  TOL0: 0.2006,                 // допуск растёт после 20 см спуска (Arm Tolerance Start UNITDOWN) до нижнего предела
  K: 1000, D: 5, D0: 0.05,    // стенка предела, Н·м/рад и Н·м·с/рад (эталон: мягкий предел 200000); D0 — слабое затухание качания внутри предела
  PRESS: 0, HARD_KP: 300, HARD_F: 20,   // упор по усилию (кейс 20 ход 3: рука давит край): PRESS > 0 — рука на 2–3 см пружины (STOP), дальше упор (серво HARD_KP Н·м/рад, до HARD_F Н·м); спуск стоп, когда снизу держат ≥ PRESS Н веса лапы (трос — натяжение по упору ползуна cable). 0 — как раньше. ponytail: порог не мерен — ползунок ?dev, подбор пользователем
  STOP: 7.0,                      // спуск стоп, когда рука отклонилась от команды больше чем на 7° — 3.4 см на конце руки M (27.9 см): пружина даёт руке разойтись и соскользнуть с края (пользователь 22.10: 5.1°; 23.10: «меньше агриться на сопротивление, дальше опускаться» → 7°; эталон — 2°)
  VCL: 119.6, VOP: 120.4,         // смыкание (предел угла −2°/кадр) и раскрытие (2°/кадр), °/с
  TH_REF: 20,                 // пружина рук: k = armt / 20° — на 20° раскрытия момент как прежний постоянный ARM_T. ponytail: калибровка, не мерено
  CLOSE_K: 0.4012,               // жёсткость при смыкании / ArmPower (0.008 / 0.02)
  FLIM: 5,                    // предел момента пружины рук, Н·м (пружину не срезать)
  LIFT_T: 0.6647, LIFT_Z: 0.0501, LIFT_P: 0.997, LIFT_0: 0.00502,   // LIFT ACTION: от 0.0001/ArmPower за 40 кадров до (1 + LiftActionPower/ArmPower)·k; после 5 см подъёма — k
  MU_RUB: 2.991, MU_TOME: 0.997, ARM_FRIC: 0.4985,                    // коробка/резина (Multiply 1.0 × 3.0); 留め掛け; трение когтей ступени 0
  WAIT: 1.003,                // пауза WAIT между действиями хода, с (WAITSEC_MAX 1.0)
};
// Лапа эталон (зал 1): XML сцены с руками size ('M' | 'S') и корпусом из claw_geo.js (make_claw_geo.mjs) — та же раскладка кусков (индексы J.c верны).
// Шарниры (±5, 0, 2.3) см над низом корпуса, ось раскрытия ∓y, упор смыкания θ = 0 (тангаж 45° эталон). Прототип, не для выпуска.
function clawXml(xml, C, size) {
  const A = C[size], h = C.hinge, f = v => v.toFixed(5), mir = a => a.map((v, i) => i % 3 === 0 ? -v : v);
  const set = (name, v) => { xml = xml.replace(new RegExp(`(<mesh name="${name}" vertex=")[^"]+(")`), `$1${v.map(f).join(' ')}$2`); };
  A.R.forEach((v, j) => { set(`m1_${j}`, v); set(`m-1_${j}`, mir(v)); });
  set('m_head', C.head);
  for (const [s, sd] of [['1', 1], ['-1', -1]]) {
    const pos = `${f(sd * h[0])} ${f(h[1])} ${f(h[2])}`;
    xml = xml.replace(new RegExp(`(<joint name="ph${s}" type="hinge" pos=")[^"]+(" axis=")[^"]+(")`), `$1${pos}$21 0 0$3`)
             .replace(new RegExp(`(<joint name="th${s}" type="hinge" pos=")[^"]+(" axis=")[^"]+("[^>]*range=")[^"]+(")`), `$1${pos}$20 ${-sd} 0$30 70$4 solreflimit="0.004 1"`)   // упор смыкания жёсткий (эталон: замеры — тангаж 45° насильно)
             .replace(new RegExp(`(<body name="arm${s}"[^>]*>\\s*<inertial pos=")[^"]+(")`), `$1${f(sd * A.com[0])} ${f(A.com[1])} ${f(A.com[2])}$2`);
  }
  // корпус зала (стёкла и полка витрины; встаёт по M.cab в machine) — отдельное тело в конце, чтобы номера прежних тел и геомов не съехали
  const cab = ['f', 'b', 'l', 'r', 's', 'g', 'dl', 'dr'].map(n => `<geom name="cab_${n}" type="box" pos="0 5 0" size="0.1 0.1 0.1" contype="0" conaffinity="1" condim="3" friction="0.3 0.005 0.0001" solref="0.0100 1"/>`).join('');
  return xml.replace('</worldbody>', `<body name="cab">${cab}</body></worldbody>`);
}
const rotv = (q, v) => qmul(qmul(q, [0, ...v]), [q[0], -q[1], -q[2], -q[3]]).slice(1);
function mechStep(mj, m, d, J, st, cmd, padbox) {                                     // после основного шага: маятник, пружина рук, трение рук
  const c = J.c, g = cmd.cg, I = st.cgi ??= (() => {
    const jid = n => mj.mj_name2id(m, mj.mjtObj.mjOBJ_JOINT.value, n), th = ['th-1', 'th1'].map(jid);
    return { cb: m.body_parentid[c.hb], cv: m.jnt_dofadr[jid('carriage')], th: th.map(j => m.jnt_qposadr[j]), th0: m.jnt_range[2 * th[0]], mu: [null, null],
             kp0: [0, 2].map(a => m.actuator_gainprm[10 * a]) };                  // серво рук мира (setup) — до смыкания и на раскрытии
  })();
  // маятник: поворот каретки относительно цели (мокап с ねじれ) — вектор поворота в осях цели; внутри предела свободно, за ним — стенка
  const t = cmd.q, r = qmul([t[0], -t[1], -t[2], -t[3]], d.xquat.subarray(4 * I.cb, 4 * I.cb + 4)), s = r[0] < 0 ? -2 : 2, w = d.qvel, tau = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const a = s * r[i + 1], ex = Math.abs(a) - g.lim[i] * Math.PI / 180, om = w[I.cv + 3 + i];   // ω свободного сустава — в осях тела ≈ осях цели
    tau[i] = -MECH.D0 * om + (ex > 0 ? -Math.sign(a) * MECH.K * ex - MECH.D * om : 0);
  }
  d.xfrc_applied.set([0, 0, 0, ...rotv(t, tau)], 6 * I.cb);
  st.dev = Math.max(...I.th.map((q, ci) => Math.abs(d.qpos[q] - cmd.c[2 * ci]))) * 180 / Math.PI;   // отклонение рук от команды — стоп спуска
  // руки: с смыкания — пружина (мягкий предел эталон): на смыкании к пределу, что сходится 120°/с, потом к упору; с подъёма — + (угол − 30°)·k за 30° раскрытия.
  // До смыкания и на раскрытии — серво, как было (усилие по касанию)
  const gp = m.actuator_gainprm, bp = m.actuator_biasprm, fr = m.actuator_forcerange;
  for (let ci = 0; ci < 2; ci++) {
    const k = g.ak?.[ci], a = 2 * ci;
    if (k == null) { gp[10 * a] = I.kp0[ci]; bp[10 * a + 1] = -I.kp0[ci]; if (!cmd.rel) { fr[2 * a] = -MECH.FLIM; fr[2 * a + 1] = MECH.FLIM; }
      const dq = d.qpos[I.th[ci]] - cmd.c[a], lim = MECH.STOP * Math.PI / 180;
      if (MECH.PRESS > 0 && st.dropping && (st.cat[ci] || st.cat[2 + ci]) && Math.abs(dq) > lim) { d.ctrl[a] = cmd.c[a] + Math.sign(dq) * lim; gp[10 * a] = MECH.HARD_KP; bp[10 * a + 1] = -MECH.HARD_KP; fr[2 * a] = -MECH.HARD_F; fr[2 * a + 1] = MECH.HARD_F; }   // пружина кончилась — упор (только на спуске и в касании: на раскрытии рука отстаёт от команды сама)
      continue; }   // серво мира (иначе жёсткость пружины прошлого хода оставалась); раскрытие на старте — принудительное (эталон: 2°/кадр кинематикой)
    const th = d.qpos[I.th[ci]] * 180 / Math.PI, kp = k * (1 + (g.b30 ? Math.max(0, th - 30) : 0));
    d.ctrl[a] = cmd.ph[ci] === 2 ? cmd.c[a] : I.th0; gp[10 * a] = kp; bp[10 * a + 1] = -kp; fr[2 * a] = -MECH.FLIM; fr[2 * a + 1] = MECH.FLIM;
  }
  // трение рук: коготь (лопатка) после смыкания — ARM_FRIC; 留め掛け — коготь коснулся коробки на спуске → обе руки целиком 1.0 (Max) до раскрытия
  if (g.pre && padbox) st.tome = true;
  if (!cmd.rel) st.tome = false;
  const gf = m.geom_friction, pf = m.pair_friction, tm = !!st.tome && !g.pre;                       // 留め掛け держит только с хвата: на спуске ложка соскальзывает с края коробки (пользователь 22.10)
  ['-1', '1'].forEach((sd, ci) => {
    const ph = st.ph[ci], key = `${ph}|${tm}|${g.fric}`;
    if (I.mu[ci] === key) return; I.mu[ci] = key;
    const pg = c.PADG[sd], mu = gg => Math.max(tm ? MECH.MU_TOME : 0, ph === 3 && gg === pg ? g.fric : 0);
    for (const gg of c.AG[sd]) { gf[gg * 3] = mu(gg); if (gg === pg) gf[gg * 3 + 1] = mu(gg) > 0 ? c.tors : 0; }
    for (const [i, gg] of c.PRS[sd]) { pf[i * 5] = mu(gg); pf[i * 5 + 1] = mu(gg); }
  });
}
// Команда шага k из таблиц трека видео (повтор хода).
function cmdOf(R, k) {
  return { x: R.tab_x[k], q: R.tab_q[k], rz: R.tab_rz[k], c: R.tab_c[k], ph: R.ph[k], pre: R.pre_tg[k], rel: R.lt_rel[k], mh: R.mh[k] };
}
function holdBox(J, d, box0 = J.c.BOX0) {                                                       // BOX_HOLD_UP (как k_post): коробка в равновесии старта
  const c = J.c; d.qpos.set(box0, c.qa); d.qvel.fill(0, c.BV, c.BV + 6);
}
const qmul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
                        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
const qz = deg => [Math.cos(deg * Math.PI / 360), 0, 0, Math.sin(deg * Math.PI / 360)];           // поворот вокруг вертикали мира

// --- Настройки автомата (игра): M — пресет machines.js (прутки [y, z, r, μ, скос°] по bar0…bar4, null — пруток убран; bars/armt null — как в мире; box_pos — спавн коробки эталон), B — коробка {size м, mass кг}.
// Вызывать после setup(): setup() возвращает трение и массы мира. Коробку не из мира кладёт плашмя по центру опорных — до игры дать ей лечь (settle).
function machine(mj, m, d, J, M, B) {
  const c = J.c, O = J.orig ??= { pos: Array.from(m.geom_pos), quat: Array.from(m.geom_quat), size: Array.from(m.geom_size), rb: Array.from(m.geom_rbound),
    aabb: Array.from(m.geom_aabb), inertia: Array.from(m.body_inertia), solref: Array.from(m.geom_solref), solmix: Array.from(m.geom_solmix), shield: mj.mj_name2id(m, mj.mjtObj.mjOBJ_GEOM.value, 'shield') };
  const GP = m.geom_pos, GQ = m.geom_quat, GS = m.geom_size, GF = m.geom_friction, cp = (A, src, i, n) => A.set(src.slice(i, i + n), i);
  let moved = false;                                                                               // прутки не как в мире — коробку мира (лежит на трёх прутках по видео) не оставлять
  c.BARS.forEach((g, i) => {
    for (const [A, s, n] of [[GP, O.pos, 3], [GQ, O.quat, 4], [GS, O.size, 3], [m.geom_aabb, O.aabb, 6]]) cp(A, s, n * g, n);
    m.geom_rbound[g] = O.rb[g]; cp(m.geom_solref, O.solref, 2 * g, 2); m.geom_solmix[g] = O.solmix[g];
    if (!M.bars) return;
    const b = M.bars[i];
    if (!b) { GP[3 * g + 1] = 5; moved = true; return; }                                         // убран — за пределы корпуса
    const [y, z, r, mu, sk] = b, h = M.cab?.bar_half ?? O.size[3 * g + 1];                        // зал эталон: прутки ±38 см
    GS[3 * g + 1] = h;
    moved ||= Math.abs(y - O.pos[3 * g + 1]) + Math.abs(z - O.pos[3 * g + 2]) + Math.abs(r - O.size[3 * g]) > 1e-6 || sk !== 0;
    GP.set([O.pos[3 * g], y, z], 3 * g); GQ.set(qmul(qz(sk), O.quat.slice(4 * g, 4 * g + 4)), 4 * g);
    GS[3 * g] = r; m.geom_rbound[g] = h + r; m.geom_aabb.set([0, 0, 0, r, r, h + r], 6 * g); GF[3 * g] = M.mech && mu >= 0.3 ? MECH.MU_RUB : mu;   // эталон: резина 3.0 (μ ≥ 0.3 — рукав)
    if (M.hall) { m.geom_solref[2 * g] = A.BAR_TC; m.geom_solmix[g] = 1e4; }                     // зал: контакт с прутком жёстче (solmix — τ прутка, не среднее с коробкой), см. A.BAR_TC
  });
  // эталон: сварка каретки с целью → шарнир в PIV (torquescale 0: поворот держит только mechStep), иначе — как в мире. eq_data сварки: якорь тела 2, тела 1, relpose quat, torquescale
  O.eq ??= Array.from(m.eq_data.slice(0, 11));
  if (M.mech) { m.eq_data.set([0, 0, MECH.PIV, 0, 0, MECH.PIV], 0); m.eq_data[10] = 0; } else m.eq_data.set(O.eq, 0);
  d.xfrc_applied.fill(0);
  const cb = O.cab ??= ['f', 'b', 'l', 'r', 's', 'g', 'dl', 'dr'].map(n => mj.mj_name2id(m, mj.mjtObj.mjOBJ_GEOM.value, `cab_${n}`)), C = M.cab;   // корпус зала: стёкла (до пола) и полка
  if (cb[0] >= 0) {
    const t = 0.003, H = 0.9, Z = 0.3, w = C ? C.glass : 0.1, dy = C ? (C.back - C.front) / 2 : 0.1, sh = C ? (C.back - C.shelf) / 2 : 0.1;   // стёкла — у столбиков (C.glass), шахта — ±C.side
    const box = (g, p, s) => { GP.set(C ? p : [0, 5, 0], 3 * g); GS.set(s, 3 * g); m.geom_rbound[g] = Math.hypot(...s); m.geom_aabb.set([0, 0, 0, ...s], 6 * g); };
    box(cb[0], [0, C?.front - t, Z], [w, t, H]); box(cb[1], [0, C?.back + t, Z], [w, t, H]);
    box(cb[2], [-w - t, C?.front + dy, Z], [t, dy, H]); box(cb[3], [w + t, C?.front + dy, Z], [t, dy, H]);
    box(cb[4], [0, C?.shelf + sh, C?.shelf_z - 0.0195], [w, sh, 0.0195]);                          // лоток витрины 3.9 см, верх — shelf_z (+9.5 см над осью опорных)
    const gz = C ? [-0.05, C.shelf_z] : [0, 0.2];                                                  // стенка под лотком: от верха шахты (эталон Z 68) до лотка — как у реальных (у эталон полка ниже прутков)
    box(cb[5], [0, C?.shelf - t, (gz[0] + gz[1]) / 2], [w, t, (gz[1] - gz[0]) / 2]);
    const dw = C ? (C.glass - C.side) / 2 : 0.1;                                                    // дека по бокам шахты (до стекла), верх −0.048 — как дека корпуса
    for (const [g, s] of [[cb[6], -1], [cb[7], 1]]) box(g, [s * (C?.side + dw), C?.front + dy, -0.058], [dw, dy, 0.01]);
  }
  const sh = O.shield, b4 = M.bars?.[4];                                                          // щиток за дальним прутком — за ним
  if (sh >= 0) { cp(GP, O.pos, 3 * sh, 3); if (M.bars) GP[3 * sh + 1] = b4 ? b4[0] + O.pos[3 * sh + 1] - O.pos[3 * c.BARS[4] + 1] : 5; }
  const g = c.GB, bb = m.geom_bodyid[g], hs = B.size ? B.size.map(v => v / 2) : O.size.slice(3 * g, 3 * g + 3), mass = B.mass ?? m.body_mass[bb];
  GS.set(hs, 3 * g); m.geom_rbound[g] = Math.hypot(...hs); m.geom_aabb.set([0, 0, 0, ...hs], 6 * g); m.body_mass[bb] = mass;
  m.body_inertia.set(B.size ? [mass / 3 * (hs[1] ** 2 + hs[2] ** 2), mass / 3 * (hs[0] ** 2 + hs[2] ** 2), mass / 3 * (hs[0] ** 2 + hs[1] ** 2)] : O.inertia.slice(3 * bb, 3 * bb + 3), 3 * bb);
  const at = M.armt ?? (c.armt0 ??= c.armt.slice())[0]; c.armt = [at, at]; c.sub = M.hall ? A.SUB : 0;                     // руки одинаковые — усилие одно
  if (B.size) { const q = Array.from(d.qpos), v = Array.from(d.qvel); mj.mj_setConst(m, d); d.qpos.set(q); d.qvel.set(v); }   // новая масса — константы решателя (mj_setConst ставит qpos0)
  const place = moved || !!B.size || !!M.box_pos || !!M.box_rot;
  if (place) {                                                                                      // коробка не из мира: x от центра поля (зал; иначе от коробки мира) + box_pos, y по центру опорных; высота — на 5 мм над самым высоким прутком под ней
    const bx = (M.hall ? 0 : c.BOX0[0]) + (M.box_pos?.[0] || 0), rot = M.box_rot || 0, at = g => {              // пруток в точке x коробки (скос: ось капсулы — z геома): [y, верх]
      const [w, x, y, z] = GQ.slice(4 * g, 4 * g + 4), ax = [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)], k = (bx - GP[3 * g]) / ax[0];
      return [GP[3 * g + 1] + k * ax[1], GP[3 * g + 2] + k * ax[2] + GS[3 * g]]; };
    const s1 = at(c.BARS[1]), s2 = at(c.BARS[2]), by = M.box_pos?.[1] ?? (s1[0] + s2[0]) / 2;
    const ey = Math.abs(Math.cos(rot * Math.PI / 180)) * hs[1] + Math.abs(Math.sin(rot * Math.PI / 180)) * hs[0];   // полуразмах коробки поперёк прутков
    let zt = Math.max(s1[1], s2[1]);
    for (const g of c.BARS) { const [y, z] = at(g); if (Math.abs(y - by) < ey + GS[3 * g]) zt = Math.max(zt, z); }   // в доме 4 эталон — высокий передний наружный под краем
    d.qpos.set([bx, by, zt + hs[2] + 0.005, ...qz(rot)], c.qa); d.qvel.fill(0, c.BV, c.BV + 6);
  }
  mj.mj_forward(m, d);
  return place;                                                                                     // true — коробке надо дать лечь (settle) до игры
}

// --- Автомат игры (общий для страницы и scan_js.mjs): кнопки → спуск → пауза → смыкание с постоянным моментом → подъём → возврат → раскрытие только на старте.
const A = { V_XY: 0.12, V_UP: 0.12, HOME: [-0.30, -0.10], XMAX: 0.32, YMAX: 0.34, TH_OPEN: 35, GRIP_DELAY: 0.38, T_REL: 1.2,
  BAR_TC: 0.004, SUB: 0.002 };   // зал, HANDOFF_GAME §D: τ 10 мс + удар 3 м/с — коробка проминает пруток глубже r 7.5 мм, капсула–коробка MuJoCo теряет опору (нормаль вдоль прутка), коробка проходит сквозь пруток. τ 4 мс (= 2 шага) + подшаги: проникание ≤ 5.4 мм (fall_probe.mjs)   // кнопки и подъём 12 см/с (эталон = 2hsq), раскрытие 35° (эталон)
const home = M => M.cab ? [-M.cab.xlim, A.HOME[1]] : A.HOME;                                   // зал: старт у левого стекла, руки раскрываются внутри
function game(M) { return { s: 'idle', t: 0, P: [home(M)[0], home(M)[1], M.top], tg: Infinity, tup: Infinity, rel: false, box0: null, psi: 0, tw: null }; }
function press(G, k) {
  if (k === 1 && (G.s === 'idle' || G.s === 'ready')) Object.assign(G, { s: 'move1', t: 0, tg: Infinity, tup: Infinity, rel: true, box0: null, tw: null });
  if (k === 2 && G.s === 'wait2') G.s = 'move2';
}
const RET = 1.25;   // возврат после хода (shut, return) — в 1,25 раза быстрее (решение пользователя 25.10 через boxiki-93); до отпускания физика прежняя
const moveTo = (P, to, dt, k = 1) => { let done = true; for (let j = 0; j < 2; j++) { const e = to[j] - P[j], s = k * A.V_XY * dt; P[j] += Math.max(-s, Math.min(s, e)); done &&= Math.abs(e) <= s; } return done; };   // каретка к точке (x, y), true — на месте
// btn {1, 2} — кнопки зажаты; q0 — поворот головы мира; rnd — случайные числа ねじれ (scan_js даёт свои, чтобы попытки повторялись)
// M.rel (зал, правила хода эталон — замеры замеры): в покое и в пути руки сомкнуты; на месте пауза, раскрытие 2°/кадр, пауза (4–7); после подъёма пауза и переезд
// к точке отпускания BCRelease над мостом (16–17), раскрытие и пауза (18–20), смыкание и пауза (21–23), домой с сомкнутыми руками (24). Без M.rel — раскрытие на старте, как было
function auto(G, d, st, J, M, btn, dt, q0, rnd = Math.random) {
  const P = G.P, c = J.c, t = (G.t += dt), hz = d.xpos[3 * c.hb + 2], W = MECH.WAIT, TO = A.TH_OPEN / MECH.VOP;
  st.dropping = G.s === 'drop';
  switch (G.s) {
    case 'move1': if (btn[1]) P[0] = Math.min(M.cab?.xlim ?? A.XMAX, P[0] + A.V_XY * dt); else G.s = 'wait2'; break;   // зал: xlim — раскрытые руки не доходят до стекла
    case 'move2': if (btn[2]) P[1] = Math.min(M.cab?.ymax ?? A.YMAX, P[1] + A.V_XY * dt); else { G.s = M.rel ? 'open' : 'drop'; G.to = t; G.box0 = Array.from(d.qpos.slice(c.qa, c.qa + 7)); } break;   // зал: ymax = ArmLimitY эталон — до края полки витрины не доходит
    case 'open': if (t >= G.to + 2 * W + TO) G.s = 'drop'; break;                                                                                 // эталон: пауза, раскрытие, пауза — потом спуск
    case 'drop': P[2] -= M.vdrop * dt; if (st.slack || P[2] <= M.zmin || (M.mech && (MECH.PRESS > 0 ? st.taut && st.fsup >= MECH.PRESS : st.dev > MECH.STOP))) { G.s = 'settle'; G.tl = t; P[2] = Math.max(M.zmin, hz); } break;   // трос провис — голова легла; эталон — рука задела приз
    case 'settle': if (t >= G.tl + A.GRIP_DELAY) { G.s = 'close'; G.tg = t; } break;
    case 'close': if (t >= G.tg + (c.t_up - c.TG['-1'])) { G.s = 'lift'; G.tup = t; G.zup = P[2]; } break;                                         // подъём — как на видео после смыкания
    case 'lift': P[2] = Math.min(M.top, P[2] + A.V_UP * dt); if (P[2] >= M.top) { G.s = M.rel ? 'carry' : 'return'; G.tc = t; } break;
    case 'carry': if (t >= G.tc + W && moveTo(P, M.rel, dt)) { G.s = 'release'; G.rel = false; G.trel = t; } break;                                // эталон: пауза наверху, к точке отпускания над мостом
    case 'return': if (moveTo(P, home(M), dt, M.rel ? RET : 1)) { if (M.rel) G.s = 'idle'; else { G.s = 'release'; G.rel = false; G.trel = t; } } break;          // зал — домой уже с сомкнутыми руками
    case 'release': if (t >= G.trel + (M.rel ? TO + W : A.T_REL)) { G.s = M.rel ? 'shut' : 'idle'; G.tsh = t; } break;
    case 'shut': if (t >= G.tsh + (A.TH_OPEN / MECH.VCL + W) / RET) G.s = 'return'; break;                                                                    // эталон: смыкание после отпускания, пауза
  }
  // ねじれ (эталон): за 20–30 см до нижнего предела голова начинает поворот к случайному углу (1/5 — −10…0°, иначе 0…+10°); держит его на подъёме, на старте — обратно.
  // Скорость: эталон 0.5–1°/кадр 60 Гц (30–60°/с) — резко (пользователь 21.10), у нас twist_v·(0.5…1), по умолчанию 6–12°/с
  if (M.twist && G.s === 'drop' && !G.tw) G.tw = { z: M.zmin + 0.2 + 0.1 * rnd(), a: rnd() < 0.2 ? -10 * rnd() : 10 * rnd(), v: (M.twist_v ?? 12) * (0.5 + 0.5 * rnd()), on: false };
  if (G.tw) { G.tw.on ||= P[2] <= G.tw.z; const to = !G.rel ? 0 : G.tw.on ? G.tw.a : G.psi, s = G.tw.v * dt; G.psi += Math.max(-s, Math.min(s, to - G.psi)); }
  const th = [A.TH_OPEN, A.TH_OPEN], ph = [1, 1], pre = t < G.tg, rad = Math.PI / 180, cg = M.mech, vcl = cg ? MECH.VCL : c.VCL;
  if (G.rel && !pre) for (let i = 0; i < 2; i++) { const a = A.TH_OPEN - vcl * (t - G.tg); th[i] = Math.max(c.th_min, a); ph[i] = a > 0 ? 2 : 3; }
  if (cg && G.s === 'release') th.fill(Math.min(A.TH_OPEN, MECH.VOP * (t - G.trel)));                // эталон: раскрытие 2°/кадр
  const hr = !M.rel ? undefined : { idle: 0, ready: 0, move1: 0, wait2: 0, move2: 0, return: 0, open: Math.min(A.TH_OPEN, Math.max(0, MECH.VOP * (t - G.to - W))), shut: Math.max(0, A.TH_OPEN - MECH.VCL * (t - G.tsh)) }[G.s];
  if (hr !== undefined) th.fill(hr);                                                                 // зал эталон: руки сомкнуты в покое и в пути, раскрытие на месте, смыкание после отпускания
  const cmd = { x: [P[0], P[1], P[2] + c.drop / 100], q: G.psi ? qmul(qz(G.psi), q0) : q0, rz: [0, 0, 1], c: [th[0] * rad, 0, th[1] * rad, 0], ph, pre: [pre, pre], rel: G.rel, mh: t < G.tup ? 5.5 : 1.0 };
  if (cg) {                                                                                           // эталон: пределы маятника по глубине, пружина рук, трение когтей (mechStep)
    const pct = Math.min(1, Math.max(0, (M.top - P[2] - MECH.TOL0) / (M.top - M.zmin - MECH.TOL0))), k = c.armt[0] / (MECH.TH_REF * rad);
    let ak = null;
    if (G.rel && !pre) {
      let f = ph[0] === 2 ? MECH.CLOSE_K : 1;
      if (G.s === 'lift' && M.lift !== false && P[2] - G.zup < (M.lift_z ?? MECH.LIFT_Z)) f = MECH.LIFT_0 + (1 + (M.lift_p ?? MECH.LIFT_P) - MECH.LIFT_0) * Math.min(1, (t - G.tup) / MECH.LIFT_T);   // LIFT ACTION (зал — свои сила и высота)
      ak = [k * f, k * f];
    }
    cmd.cg = { lim: MECH.LIM.map((l, i) => Math.min(MECH.HEAD_MAX, l + pct * (M.tol ?? MECH.TOL)[i])), ak, b30: t >= G.tup, pre, fric: M.arm_fric ?? MECH.ARM_FRIC };
  }
  return cmd;
}
return { setup, step, cmdOf, holdBox, machine, A, game, press, auto, MECH, clawXml };
})();
