// tokens.js — жетоны (ECONOMY.md): запас до 15, +1 каждые 12 мин до потолка, ход = 1 жетон (ядро зовёт Tokens.spend() в press), реклама — +3 сверх потолка; первый запуск — 30 (новичок и модератор не упираются в стену за 10 минут, Яндекс 2.9 / 4.5.2).
// Хранение — Save.tok = { n, t } (n жетонов на момент t); восстановленные считаются при чтении. Нет жетона — событие 'tokens-out' (ui.js показывает «Жетоны кончились»).
import { Save } from './save.js';
import { P } from './platform.js';

export let MAX = 15, EVERY = 12 * 60e3;                                            // ponytail: числа ECONOMY «стартовые» — в Консоли Яндекса «Удалённая конфигурация» (tokens_max, tokens_every_min), без новой модерации
const now = () => { MAX = +P.flag('tokens_max') || 15; EVERY = (+P.flag('tokens_every_min') || 12) * 60e3; const T = P.now();   // время сервера SDK: перевод часов на устройстве жетонов не даёт
  const s = Save.get().tok ?? { n: Math.max(MAX, +P.flag('tokens_first') || 30), t: T }, k = s.n >= MAX ? 0 : Math.floor((T - s.t) / EVERY);
  return s.n >= MAX ? { n: s.n, t: T } : { n: Math.min(MAX, s.n + k), t: s.n + k >= MAX ? T : s.t + k * EVERY }; };
export const RV = () => +P.flag('tokens_rv') || 3;
const DAY = () => Math.floor((P.now() + 3 * 3600e3) / 86400e3);                 // сутки по Москве (UTC+3), время сервера SDK
export const GE = () => +P.flag('gacha_every') || 10;                             // бесплатная крутка «Потеряшек» за каждые GE потраченных жетонов (любых, и за рекламу; пользователь 23.10)                                 // жетонов за rewarded — тоже из Консоли
export const Tokens = {                                                             // window.Tokens ставит ui.js только в режиме игрока (в ?dev ходы без жетонов)
  get() { const s = now(); return { n: s.n, max: MAX, next: s.n >= MAX ? 0 : s.t + EVERY - P.now() }; },
  spend() { if (P.site === 'poki') { Save.set({ spent: (Save.get().spent || 0) + 1 }); return true; }   // Poki: играть без ограничений (внутренние таймеры под рекламу запрещены); ходы считаем — гача за каждые 10
    const s = now(); if (s.n < 1) { dispatchEvent(new CustomEvent('tokens-out')); return false; }
    Save.set({ tok: { n: s.n - 1, t: s.n >= MAX ? P.now() : s.t }, spent: (Save.get().spent || 0) + 1 }); return true; },   // с потолка — отсчёт восстановления с этого хода
  free() { const g = Save.get(), gift = P.site === 'poki' && Object.keys(g.won ?? {}).length ? 1 : 0; return Math.max(0, Math.floor((g.spent || 0) / GE()) + gift - (g.spun || 0)); },   // Poki: первая крутка — подарок после первой фигурки (пользователь 25.10)   // доступно круток гачи (флаг уменьшили — не в минус)
  spin() { if (Tokens.free() < 1) return false; Save.set({ spun: (Save.get().spun || 0) + 1 }); P.track('gacha_spin'); return true; },   // крутка за жетоны; за ролик — цель rv_gacha
  adLeft() { const a = Save.get().spinAd; return Math.max(0, (+P.flag('gacha_ad_day') || 0) - (a?.d === DAY() ? a.k : 0)); },   // круток гачи за rewarded на сегодня (флаг gacha_ad_day, 0 — выключено)
  async adSpin() { if (Tokens.adLeft() < 1 || !(await P.rewarded('gacha'))) return false;   // true — ролик досмотрен, крутка засчитана (ui.js крутит сразу)
    const g = Save.get(), a = g.spinAd, d = DAY(); Save.set({ spinAd: { d, k: (a?.d === d ? a.k : 0) + 1 }, spun: (g.spun || 0) - 1 }); return true; },   // крутка за ролик — сразу в сохранение как бесплатная (free +1): перезагрузка или «назад» до ручки её не съедают (пользователь 24.10: посмотрел ролик, перезагрузил — кнопка гачи пропала)
  add(k) { const s = now(); Save.set({ tok: { n: s.n + k, t: s.t } }); },
};
