// save.js — сохранения игры (сборка, brief/HANDOFF_MENU_BUILD.md): window.Save = { get(), set(patch), sync() }. Есть до загрузки квартиры — apt.js читает parent.Save (shelf, won).
// Формат: { v: 1, t, won: { 'H1-0': { stars, n, t } }, shelf: { 'nich-1': 'H1-0' }, last: 'H1-2', played: true }. Сразу — localStorage (синхронно), после P.init — облако Яндекса (P.load), берётся более новое по t.
// Запись в облако — не чаще раза в 5 с (Яндекс: player.setData ≤ 100 за 5 мин, с запасом на уход со страницы) и при уходе со страницы. t — время сервера SDK (P.now): сравнение устройств не зависит от их часов.
import { P } from './platform.js';

const KEY = 'save', local = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch {} };
let D = { v: 1, t: 0, won: {}, shelf: {}, ...(() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })() }, timer = 0;
const flush = () => { clearTimeout(timer); timer = 0; P.save(D); };

export const Save = window.Save = {
  get: () => D,
  set(patch) { D = { ...D, ...patch, t: P.now() }; local(); timer ||= setTimeout(flush, 5000); dispatchEvent(new CustomEvent('save')); },
  async sync() { const c = await P.load(); if (c && (c.t || 0) > D.t) { D = { ...D, ...c }; local(); dispatchEvent(new CustomEvent('save')); } },   // облако новее — берём его (другое устройство)
};
addEventListener('pagehide', () => { if (timer) flush(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && timer) flush(); });   // телефон: pagehide приходит не всегда
