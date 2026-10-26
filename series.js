// series.js — серии фигурок по залам и какая фигурка в каком автомате (HANDOFF_CHARACTERS.md, решение пользователя 23.10).
// В зале 9 автоматов Hn-0…Hn-8: шесть обычных серии зала, два «Кухонных зверя» — на Hn-1 (лёгкий, второй в зале) и Hn-7, 8 — секретка
// серии (самый трудный автомат зала). Пользователь 23.10: «чтобы звери попадались раньше, мб даже на первых автоматах» — 6 зверей по 2 на залы 1–3.
// Картинки — toys_concepts/cut/<имя>_768.webp (печать коробки), 3D — toys_concepts/game/<имя>.glb.
export const SERIES = [
  { hall: 1, name: 'Ничейные', en: "Nobody's", figs: ['podezdny_kot', 'chemodan', 'nevalyashka', 'pugalo', 'televizor', 'dvornyaga'], secret: 'snegovik' },
  { hall: 2, name: 'Мелкие неприятности', en: 'Minor Troubles', figs: ['koschei', 'baba_yaga', 'gorynych', 'vodyanoy', 'domovoy', 'izbushka'], secret: 'zhar_ptitsa' },
  { hall: 3, name: 'Перекур', en: 'Tea Break', figs: ['golub', 'medved_storozh', 'kot_gruzchik', 'vorona_prodavshitsa', 'bobr_slesar', 'los_shofer'], secret: 'sova_storozh' },
  { hall: 4, name: 'Кухонные звери', en: 'Kitchen Critters', figs: ['tyulen_chainik', 'ezh_terka', 'kot_toster', 'som_polovnik', 'zhaba_gubka', 'barsuk_durshlag'], secret: 'los_holodilnik' },
];
export const GACHA = { name: 'Потеряшки', en: 'Lost & Found', figs: ['nosok_taksa', 'kolpachok_pingvin', 'pugovitsa_sova', 'naperstok_ezh', 'varezhka', 'batareyka', 'lastik_slon'], secret: 'bilet' };   // капсульный автомат, не в залах

export const NAMES = {
  podezdny_kot: 'ПОДЪЕЗДНЫЙ КОТ', chemodan: 'ЧЕМОДАН', nevalyashka: 'НЕВАЛЯШКА', pugalo: 'ПУГАЛО', televizor: 'ТЕЛЕВИЗОР', dvornyaga: 'ДВОРНЯГА', snegovik: 'СНЕГОВИК',
  koschei: 'КОЩЕЙ', baba_yaga: 'БАБА-ЯГА', gorynych: 'ГОРЫНЫЧ', vodyanoy: 'ВОДЯНОЙ', domovoy: 'ДОМОВОЙ', izbushka: 'ИЗБУШКА', zhar_ptitsa: 'ЖАР-ПТИЦА',
  golub: 'ГОЛУБЬ', medved_storozh: 'МЕДВЕДЬ-СТОРОЖ', kot_gruzchik: 'КОТ-ГРУЗЧИК', vorona_prodavshitsa: 'ВОРОНА-ПРОДАВЩИЦА', bobr_slesar: 'БОБР-СЛЕСАРЬ', los_shofer: 'ЛОСЬ-ШОФЁР', sova_storozh: 'СОВА-СТОРОЖ',
  tyulen_chainik: 'ТЮЛЕНЬ-ЧАЙНИК', ezh_terka: 'ЁЖ-ТЁРКА', kot_toster: 'КОТ-ТОСТЕР', som_polovnik: 'СОМ-ПОЛОВНИК', zhaba_gubka: 'ЖАБА-ГУБКА', barsuk_durshlag: 'БАРСУК-ДУРШЛАГ', los_holodilnik: 'ЛОСЬ-ХОЛОДИЛЬНИК',
  nosok_taksa: 'НОСОК-ТАКСА', kolpachok_pingvin: 'КОЛПАЧОК-ПИНГВИН', pugovitsa_sova: 'ПУГОВИЦА-СОВА', naperstok_ezh: 'НАПЁРСТОК-ЁЖИК', varezhka: 'ВАРЕЖКА', batareyka: 'БАТАРЕЙКА', lastik_slon: 'ЛАСТИК-СЛОН', bilet: 'СЧАСТЛИВЫЙ БИЛЕТИК',
};

export const NAMES_EN = {   // английские подписи (язык площадки); фольклорные имена, неизвестные за пределами России, — описанием
  podezdny_kot: 'STAIRWELL CAT', chemodan: 'SUITCASE', nevalyashka: 'ROLY-POLY DOLL', pugalo: 'SCARECROW', televizor: 'OLD TV', dvornyaga: 'MUTT', snegovik: 'SNOWMAN',
  koschei: 'KOSCHEI', baba_yaga: 'BABA YAGA', gorynych: 'THREE-HEADED DRAGON', vodyanoy: 'WATER GOBLIN', domovoy: 'HOUSE SPIRIT', izbushka: 'HUT ON CHICKEN LEGS', zhar_ptitsa: 'FIREBIRD',
  golub: 'PIGEON', medved_storozh: 'WATCHMAN BEAR', kot_gruzchik: 'MOVER CAT', vorona_prodavshitsa: 'SHOPKEEPER CROW', bobr_slesar: 'PLUMBER BEAVER', los_shofer: 'DRIVER MOOSE', sova_storozh: 'NIGHT WATCH OWL',
  tyulen_chainik: 'TEAPOT SEAL', ezh_terka: 'GRATER HEDGEHOG', kot_toster: 'TOASTER CAT', som_polovnik: 'LADLE CATFISH', zhaba_gubka: 'SPONGE TOAD', barsuk_durshlag: 'COLANDER BADGER', los_holodilnik: 'FRIDGE MOOSE',
  nosok_taksa: 'SOCK DACHSHUND', kolpachok_pingvin: 'PEN-CAP PENGUIN', pugovitsa_sova: 'BUTTON OWL', naperstok_ezh: 'THIMBLE HEDGEHOG', varezhka: 'LOST MITTEN', batareyka: 'DEAD BATTERY', lastik_slon: 'ERASER ELEPHANT', bilet: 'LUCKY TICKET',
};

// фигурка -> { s: серия, no: номер в серии 1…6 (секретка 7), rank: 0 обычная, 2 секретная }
export const FIG = Object.fromEntries([...SERIES, GACHA].flatMap(s => [...s.figs.map((f, i) => [f, { s, no: i + 1, rank: 0 }]), ...(s.secret ? [[s.secret, { s, no: 7, rank: 2 }]] : [])]));

const ZOO = { 1: ['kot_toster', 'tyulen_chainik'], 2: ['ezh_terka', 'som_polovnik'], 3: ['zhaba_gubka', 'barsuk_durshlag'] };   // звери зала: [на Hn-1, на Hn-7]; секретка зверей (лось-холодильник) — до своего зала 4
const slots = s => { const z = ZOO[s.hall] ?? s.figs.slice(0, 2); return [s.figs[0], z[0], ...s.figs.slice(1), z[1], s.secret ?? s.figs[5]]; };   // ponytail: без зверей (зал 4) — повтор своих
export const MACHINE_FIG = Object.fromEntries(SERIES.flatMap(s => slots(s).map((f, i) => [`H${s.hall}-${i}`, f])));

// автомат -> фигурка; не залы (L*, 2hsq) — по хешу id из первой серии
export const figOf = id => MACHINE_FIG[id] ?? SERIES[0].figs[[...String(id)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 6];
export const seriesOf = id => FIG[figOf(id)].s;

if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('series.js')) {   // node series.js — самопроверка
  const ok = (c, m) => { if (!c) throw new Error(m); };
  ok(Object.keys(FIG).length === 36 && Object.keys(FIG).every(f => NAMES[f] && NAMES_EN[f]) && [...SERIES, GACHA].every(s => s.en), 'имя или фигурка потеряны');
  ok(figOf('H1-0') === 'podezdny_kot' && figOf('H1-1') === 'kot_toster' && figOf('H1-6') === 'dvornyaga' && figOf('H1-7') === 'tyulen_chainik' && figOf('H1-8') === 'snegovik' && figOf('H2-8') === 'zhar_ptitsa', 'раскладка H1/H2');
  ok(figOf('H3-1') === 'zhaba_gubka' && figOf('H3-8') === 'sova_storozh' && new Set(['H1', 'H2', 'H3'].flatMap(h => [1, 7].map(k => figOf(`${h}-${k}`)))).size === 6 && figOf('L1-1') in FIG, 'раскладка H3/H4/L');
  console.log(Object.entries(MACHINE_FIG).map(([m, f]) => `${m} ${f}`).join('\n'));
}
