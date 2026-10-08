// 「風與海的漁村」的規則：一個月一個月過，看天氣、季節、建築擺的位置算產出、賣錢、村民搬回來。
// 全部是純函式（亂數從外面傳進來），方便測試；畫面在 ui/Village.tsx。
// 進度存在這台平板（一人一格），讀不到就從頭開始。

import type { Pt } from './world';
import { keyFor } from './owner';
import { onRoad } from '../data/villageRoads';
import {
  AREAS, BUILDINGS, COMBOS, COMBO_R, GOODS, NAMES, QUESTS, STAR_AT, areaAt, dist, isHouse, zoneAt,
  type Area, type Good, type Kind,
} from '../data/village';

export type Weather = 'sun' | 'rain' | 'wind' | 'typhoon' | 'cold';
export const WEATHER: Record<Weather, { icon: string; name: string }> = {
  sun: { icon: '☀️', name: '晴天' },
  rain: { icon: '🌧️', name: '下雨' },
  wind: { icon: '🌬️', name: '東北季風' },
  typhoon: { icon: '🌀', name: '颱風' },
  cold: { icon: '🥶', name: '寒流' },
};

export interface Bld { id: number; kind: Kind; at: Pt; worker: number | null; broken?: boolean }
export interface Villager { id: number; name: string; kid?: boolean }

export interface Village {
  v: 1;
  year: number;
  month: number; // 1～12
  weather: Weather;
  prepared: boolean; // 這個月的颱風／寒流有沒有先做準備
  coins: number;
  goods: Record<Good, number>;
  b: Bld[];
  people: Villager[];
  next: number; // 下一個編號
  quests: string[]; // 完成的任務
  seineAt: number; // 上次牽罟是第幾個月（year*12+month）
  seines: number;
  diveAt: number; // 上次跟海女去趕海是第幾個月
  dives: number;
  festAt: number; // 上次自己打鼓辦廟會是第幾個月
  typhoons: number; // 平安撐過幾次颱風
  festivals: number;
  tyYear: number; // 今年有沒有來過颱風（最後一次颱風的年）
  scared: number; // 沒避難所，颱風後大家很怕（扣評價的月數）
  intro: boolean; // 看過開場說明
  tut: number; // 新手教學做到第幾棟（TUTORIAL.length 以上＝教完）
  done: boolean; // 五顆星
}

export const freshVillage = (): Village => ({
  v: 1, year: 1, month: 4, weather: 'sun', prepared: false, coins: 160,
  goods: { fish: 0, veg: 0, salt: 0, weed: 0 },
  b: [{ id: 1, kind: 'stilt', at: { x: 760, y: 440 }, worker: null }],
  people: [{ id: 2, name: '阿海伯' }, { id: 3, name: '春花姨' }, { id: 4, name: '小孫子', kid: true }],
  next: 5, quests: [], seineAt: -1, seines: 0, diveAt: -1, dives: 0, festAt: -1, typhoons: 0, festivals: 0, tyYear: 0, scared: 0, intro: false, tut: 0, done: false,
});

export const monthIndex = (s: Village) => s.year * 12 + s.month;

// ── 查詢 ──
export const capacity = (s: Village) => s.b.reduce((n, b) => n + (BUILDINGS[b.kind].home ?? 0), 0);
export const idle = (s: Village) => s.people.filter((p) => !p.kid && !s.b.some((b) => b.worker === p.id));
export const workerOf = (s: Village, b: Bld) => s.people.find((p) => p.id === b.worker) ?? null;

// 這棟旁邊有哪些搭配（每個搭配算一次，最多 3 個）
export function combosOf(s: Village, b: Bld): { with: Bld; why: string }[] {
  const out: { with: Bld; why: string }[] = [];
  for (const o of s.b) {
    if (o.id === b.id || dist(o.at, b.at) > COMBO_R) continue;
    const c = COMBOS.find(([x, y]) => (x === b.kind && y === o.kind) || (y === b.kind && x === o.kind));
    if (c && !out.some((e) => e.with.kind === o.kind)) out.push({ with: o, why: c[2] });
  }
  return out.slice(0, 3);
}
const mult = (s: Village, b: Bld) => 1 + 0.25 * combosOf(s, b).length;

export function rating(s: Village): number {
  let r = 0, pairs = 0;
  for (const b of s.b) {
    if (!b.broken) r += BUILDINGS[b.kind].appeal;
    pairs += combosOf(s, b).length;
  }
  r += Math.round(pairs / 2) * 3; // 一對算一次
  r += s.people.length * 3 + s.festivals * 5;
  if (s.scared > 0) r -= 10;
  return Math.max(0, r);
}
export const starsOf = (r: number) => STAR_AT.filter((t) => r >= t).length;
export const stars = (s: Village) => starsOf(rating(s));
export const areaOpen = (s: Village, a: Area) => a === 'core' || stars(s) >= AREAS[a].stars;

// ── 擺放 ──
const footR = (k: Kind) => BUILDINGS[k].width * 0.34;
const ZONE_WORD = { sea: '海', stream: '小溪', beach: '沙灘', land: '平地', hill: '山坡' } as const;

export function canPlace(s: Village, kind: Kind, at: Pt, ignore?: number): { ok: boolean; why?: string } {
  const def = BUILDINGS[kind];
  const area = areaAt(at);
  if (area !== 'core' && !areaOpen(s, area)) return { ok: false, why: `雲霧還沒散開（村子要 ${'⭐'.repeat(AREAS[area].stars)}）` };
  const z = zoneAt(at);
  if (!def.zones.includes(z)) return { ok: false, why: z === 'sea' || z === 'stream' ? `這裡是${ZONE_WORD[z]}，不能蓋` : `${def.name}要蓋在${def.zones.map((x) => ZONE_WORD[x]).join('或')}上` };
  if (kind !== 'pier') {
    const w = def.width * 0.3;
    for (const dx of [-w, w]) { const zz = zoneAt({ x: at.x + dx, y: at.y }); if (zz === 'sea' || zz === 'stream') return { ok: false, why: '太靠近水了，往裡面一點' }; }
  }
  if (def.near && dist(at, def.near.at) > def.near.r) return { ok: false, why: def.near.text };
  if (onRoad(at)) return { ok: false, why: '這是村子的大馬路，蓋了大家就走不過去' };
  for (const o of s.b) if (o.id !== ignore && dist(o.at, at) < footR(o.kind) + footR(kind)) return { ok: false, why: `跟${BUILDINGS[o.kind].name}疊在一起了` };
  return { ok: true };
}

export function build(s: Village, kind: Kind, at: Pt): Village {
  const def = BUILDINGS[kind];
  if (s.coins < def.cost || stars(s) < def.stars || !canPlace(s, kind, at).ok) return s;
  const b: Bld = { id: s.next, kind, at, worker: null };
  const free = def.job ? idle(s)[0] : undefined;
  if (free) b.worker = free.id;
  return { ...s, coins: s.coins - def.cost, b: [...s.b, b], next: s.next + 1 };
}
export const move = (s: Village, id: number, at: Pt): Village => {
  const b = s.b.find((x) => x.id === id);
  if (!b || !canPlace(s, b.kind, at, id).ok) return s;
  return { ...s, b: s.b.map((x) => (x.id === id ? { ...x, at } : x)) };
};
export const demolish = (s: Village, id: number): Village => {
  const b = s.b.find((x) => x.id === id);
  if (!b) return s;
  return { ...s, coins: s.coins + Math.floor(BUILDINGS[b.kind].cost / 2), b: s.b.filter((x) => x.id !== id) };
};
export const REPAIR = 15;
export const repair = (s: Village, id: number): Village =>
  s.coins < REPAIR ? s : { ...s, coins: s.coins - REPAIR, b: s.b.map((x) => (x.id === id ? { ...x, broken: false } : x)) };
export function assign(s: Village, id: number): Village {
  const free = idle(s)[0];
  if (!free) return s;
  return { ...s, b: s.b.map((x) => (x.id === id && BUILDINGS[x.kind].job ? { ...x, worker: free.id } : x)) };
}
export const unassign = (s: Village, id: number): Village => ({ ...s, b: s.b.map((x) => (x.id === id ? { ...x, worker: null } : x)) });

export const PREPARE = 10;
export const threat = (s: Village) => (s.weather === 'typhoon' || (s.weather === 'cold' && s.b.some((b) => b.kind === 'pond')) ? s.weather : null);
export const prepare = (s: Village): Village => (s.coins < PREPARE || s.prepared || !threat(s) ? s : { ...s, coins: s.coins - PREPARE, prepared: true });

// ── 牽罟 ──
export const canSeine = (s: Village) => s.b.some((b) => b.kind === 'netshed') && s.seineAt !== monthIndex(s) && s.weather !== 'typhoon';
export const seineFish = (s: Village, good: number) => good * 3 + s.people.length;
export const seine = (s: Village, good: number): Village => !canSeine(s) ? s
  : { ...s, seineAt: monthIndex(s), seines: s.seines + 1, goods: { ...s.goods, fish: s.goods.fish + seineFish(s, good) } };

// ── 趕海（海女）：三到九月退潮時，跟海女下礁岩採石花菜；漲潮前要上岸 ──
export const DIVE_MONTHS = [3, 4, 5, 6, 7, 8, 9];
export const hasDiver = (s: Village) => s.b.some((b) => b.kind === 'divehut' && !b.broken && b.worker !== null);
export const canDive = (s: Village) => hasDiver(s) && DIVE_MONTHS.includes(s.month) && s.weather !== 'typhoon' && s.diveAt !== monthIndex(s);
export interface Haul { weed: number; fish: number; coins: number }
// 沒在漲潮前上岸：東西掉一半（還好海女把你拉上來）
export const diveHaul = (h: Haul, safe: boolean): Haul =>
  safe ? h : { weed: Math.floor(h.weed / 2), fish: Math.floor(h.fish / 2), coins: Math.floor(h.coins / 2) };
export function dive(s: Village, h: Haul, safe: boolean): Village {
  if (!canDive(s)) return s;
  const g = diveHaul(h, safe);
  return { ...s, diveAt: monthIndex(s), dives: s.dives + 1, coins: s.coins + g.coins,
    goods: { ...s.goods, weed: s.goods.weed + g.weed, fish: s.goods.fish + g.fish } };
}

// ── 廟會：三月媽祖生日，有廟、有人打鼓，就能自己來打鼓（打得好賺得多）；沒打就照舊自動辦一場小的 ──
export const FEST_BASE = 20, FEST_HIT = 5, FEST_AUTO = 20;
export const canFestival = (s: Village) => s.month === 3 && s.b.some((b) => b.kind === 'temple' && !b.broken && b.worker !== null) && s.festAt !== monthIndex(s);
export const festivalCoins = (hits: number) => FEST_BASE + FEST_HIT * hits;
export const festival = (s: Village, hits: number): Village => !canFestival(s) ? s
  : { ...s, festAt: monthIndex(s), festivals: s.festivals + 1, coins: s.coins + festivalCoins(hits) };

// ── 天氣 ──
export function rollWeather(month: number, year: number, typhoonsThisYear: boolean, rnd: () => number): Weather {
  const r = rnd();
  if (month >= 7 && month <= 9) return r < (month === 9 && !typhoonsThisYear ? 0.6 : 0.3) ? 'typhoon' : r < 0.85 ? 'sun' : 'rain';
  if (month === 5 || month === 6) return r < 0.55 ? 'rain' : 'sun'; // 梅雨
  if (month === 12 || month <= 2) return r < 0.25 && year > 0 ? 'cold' : r < 0.75 ? 'wind' : 'rain'; // 東北季風，東北角冬天又濕又冷
  if (month === 11 || month === 3) return r < 0.5 ? 'wind' : r < 0.75 ? 'rain' : 'sun';
  return r < 0.2 ? 'rain' : 'sun';
}

// ── 過一個月 ──
export interface Pop { id: number; text: string } // 建築頭上冒出來的數字
export interface MonthReport { pops: Pop[]; news: string[]; arrived: string[]; quest?: string }

export function advance(s0: Village, rnd: () => number = Math.random): { s: Village; r: MonthReport } {
  const s: Village = { ...s0, goods: { ...s0.goods }, b: s0.b.map((b) => ({ ...b })), people: [...s0.people] };
  const r: MonthReport = { pops: [], news: [], arrived: [] };
  const w = s.weather, st = stars(s0);
  const add = (b: Bld, g: Good, n: number) => { n = Math.round(n); if (n > 0) { s.goods[g] += n; r.pops.push({ id: b.id, text: `+${n}${GOODS[g].icon}` }); } };
  const earn = (b: Bld, n: number) => { n = Math.round(n); if (n > 0) { s.coins += n; r.pops.push({ id: b.id, text: `+${n}💰` }); } };
  const working = (k: Kind) => s.b.filter((b) => b.kind === k && !b.broken && (!BUILDINGS[k].job || b.worker !== null));
  const hasTrees = (b: Bld) => s.b.some((o) => o.kind === 'trees' && dist(o.at, b.at) <= COMBO_R);

  // 生產
  for (const b of working('pier')) add(b, 'fish', 8 * mult(s0, b) * (w === 'typhoon' ? 0 : w === 'wind' ? 0.4 : w === 'rain' ? 0.8 : 1));
  if (w === 'wind' && working('pier').length) r.news.push('東北季風浪好大，漁船只敢在近海捕一點點魚。');
  for (const b of working('pond')) {
    if (w === 'cold' && !s.prepared) { const lost = Math.min(s.goods.fish, 6); s.goods.fish -= lost; r.pops.push({ id: b.id, text: '🥶' }); r.news.push('寒流來了，魚塭的虱目魚凍死了好多……下次寒流前先做防寒！'); }
    else add(b, 'fish', 5 * mult(s0, b));
  }
  for (const b of working('garden')) add(b, 'veg', 5 * mult(s0, b) * ((w === 'wind' || w === 'cold') ? (hasTrees(b) ? 0.9 : 0.5) : w === 'typhoon' ? 0.3 : 1));
  for (const b of working('salt')) add(b, 'salt', 6 * mult(s0, b) * (w === 'sun' ? 1 : w === 'wind' ? 0.5 : 0.15));
  if ((w === 'rain' || w === 'cold') && working('salt').length) r.news.push('下雨天曬不出鹽，鹽田只好休息。');
  for (const b of working('divehut')) add(b, 'weed', (s.month >= 3 && s.month <= 9 ? 6 : 1) * mult(s0, b) * (w === 'typhoon' ? 0 : 1));
  for (const b of working('rack')) {
    if (w === 'rain' || w === 'typhoon') continue;
    const n = Math.min(4, s.goods.fish); s.goods.fish -= n; earn(b, n * 4 * mult(s0, b));
  }
  for (const b of working('stall')) {
    const f = Math.min(2, s.goods.fish), v = Math.min(2, s.goods.veg);
    s.goods.fish -= f; s.goods.veg -= v; earn(b, (4 + 3 * (f + v)) * mult(s0, b) * (w === 'typhoon' ? 0 : 1));
  }
  for (const b of working('store')) earn(b, (4 + s.people.length * 1.5) * mult(s0, b));
  for (const b of working('guesthouse')) earn(b, (8 + st * 4) * mult(s0, b) * (w === 'typhoon' ? 0 : w === 'rain' ? 0.7 : 1) * (s.month >= 6 && s.month <= 8 ? 1.5 : 1));
  for (const b of working('market')) {
    let cap = Math.round(12 * mult(s0, b)), got = 0;
    for (const g of ['weed', 'salt', 'fish', 'veg'] as Good[]) { const n = Math.min(cap, s.goods[g]); s.goods[g] -= n; cap -= n; got += n * GOODS[g].price; }
    earn(b, got);
  }
  // 三月媽祖生日：廟會
  if (s.month === 3 && working('temple').length && s.festAt !== monthIndex(s0)) {
    s.festivals += 1; s.coins += FEST_AUTO;
    r.pops.push({ id: working('temple')[0].id, text: `+${FEST_AUTO}💰` });
    r.news.push('三月媽祖生日，村裡辦了小小的廟會。明年自己來打鼓，會更熱鬧、賺更多！');
  }

  // 颱風
  if (s.scared > 0) s.scared -= 1;
  if (w === 'typhoon') {
    s.tyYear = s.year;
    if (s.prepared) {
      s.typhoons += 1;
      r.news.push('颱風走了！因為先把船拉上岸、綁好屋頂，村子平安無事。');
    } else {
      const hit = s.b.filter((b) => !['trees', 'shelter', 'temple'].includes(b.kind) && !b.broken && !hasTrees(b) && rnd() < 0.35);
      for (const b of hit) { b.broken = true; r.pops.push({ id: b.id, text: '💥' }); }
      r.news.push(hit.length ? `颱風吹壞了 ${hit.length} 棟建築（點它修理）。下次颱風警報一出來就先做防颱！旁邊種防風林也比較不會壞。` : '颱風走了，還好沒有東西壞掉。下次記得先做防颱準備。');
    }
    if (!s.b.some((b) => b.kind === 'shelter')) { s.scared = 1; r.news.push('村子沒有避難所，颱風夜大家都好害怕。'); }
  }

  // 村民搬回來（有空床就來，三顆星以上一次來兩個）
  let beds = capacity(s) - s.people.length;
  for (let i = 0; i < (st >= 3 ? 2 : 1) && beds > 0; i++, beds--) {
    const name = NAMES[(s.next + s.people.length) % NAMES.length];
    s.people.push({ id: s.next, name }); s.next += 1; r.arrived.push(name);
  }

  // 下一個月
  s.month += 1;
  if (s.month > 12) { s.month = 1; s.year += 1; }
  s.weather = rollWeather(s.month, s.year, s.tyYear === s.year, rnd);
  s.prepared = false;

  return { s: checkQuests(s, r), r };
}

export function questDone(s: Village, id: string): boolean {
  const st = stars(s), has = (k: Kind, staffed = false) => s.b.some((b) => b.kind === k && (!staffed || b.worker !== null));
  switch (id) {
    case 'house': return s.b.filter((b) => isHouse(b.kind)).length >= 2;
    case 'pier': return has('pier', true);
    case 'market': return has('market', true);
    case 'star2': return st >= 2;
    case 'seine': return s.seines > 0;
    case 'typhoon': return s.typhoons > 0;
    case 'star3': return st >= 3;
    case 'festival': return s.festivals > 0;
    case 'star4': return st >= 4;
    case 'star5': return st >= 5;
  }
  return false;
}
export const currentQuest = (s: Village) => QUESTS.find((q) => !s.quests.includes(q.id)) ?? null;

// 目前的任務做到了就領獎（一次只領一個，畫面上才看得到）
export function checkQuests(s: Village, r?: MonthReport): Village {
  const q = currentQuest(s);
  if (!q || !questDone(s, q.id)) return s;
  if (r) r.quest = q.text;
  const done = q.id === 'star5' || s.done;
  return { ...s, quests: [...s.quests, q.id], coins: s.coins + q.reward, done };
}

// ── 存檔 ──
const KEY = 'island.village.v1';
export function loadVillage(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Village {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return freshVillage();
    const p = JSON.parse(raw) as Partial<Village>;
    // 教學是後來加的：之前玩過的人不用再教一次
    return p.v === 1 ? { ...freshVillage(), ...(p.intro && p.tut === undefined ? { tut: 99 } : {}), ...p } : freshVillage();
  } catch {
    return freshVillage();
  }
}
// 換平板登入：本機和雲端兩份，留玩得比較久的那份
export function pickVillage(local: Village, cloud: Partial<Village> | null | undefined): Village {
  if (!cloud || cloud.v !== 1) return local;
  const c = { ...freshVillage(), ...cloud } as Village;
  const score = (x: Village) => monthIndex(x) * 100 + x.b.length;
  return score(c) > score(local) ? c : local;
}
export function saveVillage(s: Village, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try { store?.setItem(keyFor(KEY), JSON.stringify(s)); } catch { /* 存不了就算了 */ }
}
