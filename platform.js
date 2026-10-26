// platform.js — площадка: Яндекс Игры (sdk.js), Poki (poki-sdk.js, developers.poki.com/guide/sdk-html5, 24.10.2026) или локальный запуск (без SDK: сохранения в localStorage, реклама «не показана»).
// Сверено с yandex.ru/dev/games/doc/ru/sdk (sdk-about, sdk-game-events, sdk-events, sdk-adv, sdk-player, sdk-server-time, sdk-config, sdk-review, sdk-shortcut) 23.10.2026; заметки — PUBLISH.md §1.2.
// В сборке для Яндекса в index.html ДО модулей: <script src="/sdk.js"></script> (путь относительный, файл не скачивать). Проверка с настоящим SDK — PUBLISH.md §1.6 (sdk-dev-proxy).
// Игра зовёт: await P.init() один раз; P.ready() — когда можно играть (LoadingAPI, 1.19.2); P.start() / P.stop() — геймплей идёт / стоит (меню, распаковка, пауза);
// P.onPause(f) / P.onResume(f) — платформа просит паузу: стоп физики и звука (1.3, 4.7); await P.load() / P.save(obj) — прогресс; P.now() — время сервера (жетоны, сутки);
// P.flag(имя, по умолчанию) — удалённая настройка из Консоли (без новой модерации); await P.fullscreen() → показана ли; await P.rewarded() → дать ли награду;
// P.review() — попросить оценку (раз за сессию, в логической паузе); P.shortcut() — ярлык на рабочий стол; P.lang — язык; P.track(имя, параметры) — цель Метрики (LEVELS.md §6).
export const METRIKA = 113755475;                                      // счётчик «Прутики» (пользователь 23.10; «принимать только с указанных адресов» снято, вебвизор выключен)

const POKI = !!window.PokiSDK;                                                   // Poki: реклама commercialBreak / rewardedBreak, gameplayStart/Stop, сохранения — localStorage (облако Poki синхронизирует его само), без Метрики (внешние запросы запрещены)
let touched = !POKI;                                                            // Poki: gameplayStart — только после первого ввода игрока, не на загрузке (requirements-quality)
let ysdk = null, player = null, store = null, flags = {}, playing = false, isReady = false, sdkP = false, adP = false, sent = false, bShown = null, rvAt = -1e9;
const PHONE = !!globalThis.matchMedia?.('(pointer: coarse)').matches;               // телефон: стики-баннер прячем на время хода — внизу пульт, случайные клики РСЯ считает фродом (RESEARCH_ADS.md)
const pause = [], resume = [], fire = L => L.forEach(f => { try { f(); } catch (e) { console.warn('пауза', e); } });
const sync = () => { const on = playing && isReady && !sdkP && !adP && touched;   // GameplayAPI идёт, только когда игрок у автомата и площадка не держит паузу (реклама, другая вкладка, 1.19.3)
  if (on !== sent) { sent = on; try { ysdk?.features?.GameplayAPI?.[on ? 'start' : 'stop'](); if (POKI) PokiSDK[on ? 'gameplayStart' : 'gameplayStop'](); } catch (e) { console.warn('GameplayAPI', e); } }
  const b = isReady && !(PHONE && on); if (b !== bShown && ysdk) { bShown = b; try { ysdk.adv?.[b ? 'showBannerAdv' : 'hideBannerAdv']?.(); } catch (e) { console.warn('баннер', e); } } };   // стики-баннер (Консоль → Реклама: «Использовать API для показа sticky-баннера»): на ПК всегда, на телефоне — вне хода
const FLAGS = { tokens_max: '15', tokens_every_min: '12', tokens_first: '30', tokens_rv: '3', ad_gap_s: '30', secret_cd_h: '4', gacha_every: '10', gacha_ad_day: '1' };   // ponytail: числа экономики — стартовые (ECONOMY.md); в Консоли «Удалённая конфигурация» их можно менять без новой модерации

let initP;
export const P = {
  lang: 'ru', site: POKI || window.SITE === 'poki' ? 'poki' : window.YaGames ? 'yandex' : '',   // сборка Poki без SDK — тоже Poki (правила игры), вызовы SDK — только при POKI
  init() { return initP ??= P.init0(); },                             // один промис на всех: ui.js и hall_style.js (печать коробок по языку) ждут один и тот же YaGames.init
  async init0() {
    if (METRIKA && window.YaGames) {                                    // счётчик Метрики (yandex.ru/dev/games/doc/ru/concepts/yandex-metrica), вебвизор выключен
      window.ym ??= function () { (window.ym.a ??= []).push(arguments); }; window.ym.l = Date.now();
      const s = document.createElement('script'); s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + METRIKA; document.head.appendChild(s);
      window.ym(METRIKA, 'init', { clickmap: false, trackLinks: false, accurateTrackBounce: true, webvisor: false });
      const lv = id => ({ lvl: id, hall: /^H(\d+)/.exec(id)?.[1] ?? '' }), n = {}, once = k => { try { if (localStorage.getItem('ym_' + k)) return false; localStorage.setItem('ym_' + k, '1'); } catch {} return true; };   // цели LEVELS.md §6; обучение — первый ход и первый приз в жизни игрока
      let at = '';
      addEventListener('machine', e => { at = e.detail; n[at] = 0; P.track('machine_open', lv(at)); });
      addEventListener('move', e => { const id = e.detail ?? at; n[id] = (n[id] || 0) + 1; P.track('move', { ...lv(id), n: n[id] }); if (once('tut0')) P.track('gameTutorialStart'); });
      addEventListener('prize', e => { const id = e.detail; P.track('prize', { ...lv(id), moves: n[id] || 0 }); P.param({ levelComplete: String(id) }); if (once('tut1')) P.track('gameTutorialComplete'); });
      addEventListener('tokens-out', () => P.track('tokens_out', lv(at)));
      addEventListener('prize-train', e => P.track('train_prize', { lvl: e.detail }));   // приз на тренировочном T-* (ядро, без фигурки)   // ponytail: machine_leave (ушёл без приза) не шлём — видно в воронке machine_open → prize
    }
    addEventListener('prize', () => P.stop());                          // приз — уровень окончен: GameplayAPI стоит сразу, а не когда ui.js уведёт в меню («индикатор зелёный после конца уровня» — нарушение 1.19.3)
    if (POKI) { await PokiSDK.init().catch(e => console.warn('Poki', e)); let l = ''; try { l = PokiSDK.getLanguage?.() || ''; } catch {} P.lang = /^(ru|be|kk|uk|uz)/.test(l || navigator.language || '') ? 'ru' : 'en';   // Poki: init падает при блокировщике рекламы — играем всё равно (их пример); язык — их getLanguage, запасной en
      for (const e of ['pointerdown', 'keydown', 'touchstart']) addEventListener(e, () => { if (!touched) { touched = true; sync(); } }, { capture: true, passive: true });
      addEventListener('wheel', e => e.preventDefault(), { passive: false }); addEventListener('keydown', e => { if (/^(Space|Arrow|Page)/.test(e.code)) e.preventDefault(); });   // страница Poki длинная — колесо, пробел и стрелки не должны её листать
      return P; }
    if (!window.YaGames) return P;                                      // локально: без SDK
    try { ysdk = await window.YaGames.init(); } catch (e) { console.warn('SDK', e); return P; }
    const l = ysdk.environment?.i18n?.lang || 'ru'; P.lang = /^(ru|be|kk|uk|uz)$/.test(l) ? 'ru' : 'en';   // у нас ru и en; запасной ru для be/kk/uk/uz, en для остальных (Яндекс «Языки и домены»); P.lang берут ui.js, квартира и ядро
    ysdk.on('game_api_pause', () => { sdkP = true; sync(); fire(pause); }); ysdk.on('game_api_resume', () => { sdkP = false; fire(resume); sync(); });   // реклама, покупки, другая вкладка, свёрнутое окно
    await Promise.all([
      ysdk.getPlayer().then(p => { player = p; }, e => console.warn('игрок', e)),
      ysdk.getStorage?.().then(s => { store = s; }, e => console.warn('хранилище', e)),   // localStorage на iOS часто сбрасывается — у SDK своё (sdk-player, «Хранилище для iOS»)
      ysdk.getFlags?.({ defaultFlags: FLAGS }).then(f => { flags = f; }, e => console.warn('флаги', e)),
    ]);
    return P;
  },
  ready() { if (isReady) return; isReady = true; dispatchEvent(new Event('p-ready')); try { ysdk?.features?.LoadingAPI?.ready(); if (POKI) PokiSDK.gameLoadingFinished(); } catch (e) { console.warn('LoadingAPI', e); } sync(); },   // start до ready (первый запуск — сразу у автомата) уходит после ready
  start() { playing = true; sync(); }, stop() { playing = false; sync(); },
  onPause(f) { pause.push(f); }, onResume(f) { resume.push(f); },
  now: () => ysdk?.serverTime?.() ?? Date.now(),                        // время сервера: не обмануть переводом часов на устройстве
  flag: (k, d) => flags[k] ?? FLAGS[k] ?? d,
  async load() {                                                        // из облака (player) и из хранилища SDK — новее по t; локально — localStorage
    const of = s => { try { return JSON.parse(s || '{}'); } catch { return {}; } };
    try { const a = player ? await player.getData() : {}, b = of(store ? store.getItem('save') : localStorage.getItem('save')); return (a?.t || 0) >= (b.t || 0) ? a : b; }
    catch (e) { console.warn('загрузка', e); return {}; }
  },
  async save(d) {                                                       // player.setData: до 200 КБ, не чаще 100 раз за 5 мин — save.js пишет не чаще раза в 5 с и при уходе со страницы
    try { store?.setItem('save', JSON.stringify(d)); if (player) await player.setData(d); else if (!store) localStorage.setItem('save', JSON.stringify(d)); } catch (e) { console.warn('сохранение', e); }
  },
  fullscreen() {                                                        // только в логической паузе, не позже 2 с после действия игрока (4.4); частоту режет платформа — звать на каждой паузе
    if (!Object.keys(window.Save?.get?.().won ?? {}).length) return Promise.resolve(false);   // до первого приза в жизни — без полноэкранной: первая сессия решает удержание (RESEARCH_ADS.md, вывод 7)
    if (!POKI && performance.now() - rvAt < 1000 * +P.flag('ad_gap_s')) return Promise.resolve(false);   // на Poki своих таймеров рекламы нет — частоту и паузу после rewarded держит Poki   // сразу после rewarded — нет (поддержка Яндекса: не ближе 30 с; CrazyLabs 20 → 30 с: +12,5 % дохода)
    return P.ad('showFullscreenAdv').then(v => { if (v) P.track('ad_full'); return v; }); },   // ad_full — реально показана (частоту режет площадка)
  rewarded(what = 'tokens') { P.track('rewarded', { what }); return P.ad('showRewardedVideo').then(v => { rvAt = performance.now(); if (v) P.track('rv_' + what); return v; }); },   // rewarded — нажал, rv_<что> — досмотрел, награда выдана   // what — за что (tokens, hint, assist): цель Метрики                     // только по кнопке, где написано, что будет реклама и что дадут (4.5.1)
  ad(kind) {
    if (POKI) return new Promise(ok => {                               // Poki сам решает, показывать ли; gameplayStop — до рекламы, gameplayStart — после, во время ролика событий SDK нет; колбэк — реклама началась (тишина)
      adP = true; sync(); let opened = false; const start = () => { opened = true; fire(pause); }, end = v => { if (opened) fire(resume); adP = false; sync(); ok(v); };
      (kind === 'showFullscreenAdv' ? PokiSDK.commercialBreak(start).then(() => end(opened)) : PokiSDK.rewardedBreak(start).then(s => end(!!s))).catch(e => { console.warn('реклама', e); end(false); });
    });
    return new Promise(ok => {
      if (!ysdk) return ok(false);
      let opened = false, got = false, done = false;
      const end = v => { if (done) return; done = true; if (opened) { adP = false; fire(resume); sync(); } ok(v); };
      try {
        ysdk.adv[kind]({ callbacks: {
          onOpen: () => { opened = true; adP = true; sync(); fire(pause); },
          onRewarded: () => { got = true; },
          onClose: shown => end(kind === 'showFullscreenAdv' ? !!shown : got),
          onError: e => { console.warn('реклама', e); end(kind === 'showFullscreenAdv' ? false : got); },   // после ошибки onClose приходит не всегда — без этого «Коллекция» ждала бы вечно
        } });
      } catch (e) { console.warn('реклама', e); end(false); }
    });
  },
  async review() {                                                      // оценка игры (рейтинг > 30 — условие 2.13): раз за сессию, canReview обязателен перед requestReview
    try { if (!ysdk?.feedback || !(await ysdk.feedback.canReview()).value) return false; adP = true; sync(); return (await ysdk.feedback.requestReview()).feedbackSent; }
    catch (e) { console.warn('оценка', e); return false; } finally { if (adP) { adP = false; sync(); } }
  },
  async shortcut() {                                                    // ярлык на рабочий стол (возврат игроков; пушей у Яндекса нет)
    try { if (!ysdk?.shortcut || !(await ysdk.shortcut.canShowPrompt()).canShow) return false; return (await ysdk.shortcut.showPrompt()).outcome === 'accepted'; }
    catch (e) { console.warn('ярлык', e); return false; }
  },
  track(name, params) { if (METRIKA && window.ym) try { window.ym(METRIKA, 'reachGoal', name, params); } catch (e) { console.warn('цель', e); } },   // ошибка аналитики не должна прерывать игру (как sendMetrica в доке Яндекса); в Метрике — своя цель «JS-событие» на каждое имя, иначе параметров в отчёте нет
  param(obj) { if (METRIKA) try { window.ym(METRIKA, 'params', obj); } catch (e) { console.warn('параметр', e); } },   // отчёт «Параметры событий»: levelComplete — сколько игроков прошли автомат
};
