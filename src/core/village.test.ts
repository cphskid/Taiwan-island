import sql from '../../supabase/island_pioneer.sql?raw';
import { describe, expect, it } from 'vitest';
import {
  advance, assign, build, demolish, canDive, canFestival, canPlace, canSeine, capacity, combosOf, dive, festival, festivalCoins,
  freshVillage, idle, loadVillage, monthIndex, toSlots, prepare, rating, rollWeather, seine, stars, yearGoal, type Village,
} from './village';
import { SLOTS } from '../data/villageSlots';
import { onRoad } from '../data/villageRoads';
import { BUILDINGS, CATCHES, COVE, REEF, VH, VW, zoneAt, type Kind } from '../data/village';

const have = new Set(Object.keys(import.meta.glob('/public/img/village/*.webp')));
const existsSync = (f: string) => have.has(`/${f}`);
const rich = (s = freshVillage()): Village => ({ ...s, coins: 9999 });
const fixed = (v: number) => () => v;

describe('漁村地形', () => {
  it('海、沙灘、平地、山坡、小溪分得出來', () => {
    expect(zoneAt({ x: 200, y: 1000 })).toBe('sea');
    expect(zoneAt({ x: 500, y: 700 })).toBe('beach');
    expect(zoneAt({ x: 800, y: 470 })).toBe('land');
    expect(zoneAt({ x: 1500, y: 80 })).toBe('hill');
    expect(zoneAt({ x: 1040, y: 380 })).toBe('stream');
    expect(zoneAt(COVE)).toBe('sea');
  });
  it('圖都在', () => {
    for (const k of Object.keys(BUILDINGS) as Kind[]) expect(existsSync(`public/img/village/${BUILDINGS[k].art}.webp`)).toBe(true);
    expect(existsSync('public/img/village/v1-bg.webp')).toBe(true);
    expect(VW / VH).toBeCloseTo(2752 / 1536, 2);
  });
});

describe('擺放', () => {
  it('能蓋的地方綠、不行的說原因', () => {
    const s = rich();
    expect(canPlace(s, 'brick', { x: 835, y: 522 }).ok).toBe(true);
    expect(canPlace(s, 'brick', { x: 800, y: 1000 }).why).toMatch(/格子/);
    expect(canPlace(s, 'brick', { x: 836, y: 530 }).why).toMatch(/格子/); // 沒對準格子
    expect(canPlace(s, 'brick', { x: 792, y: 447 }).why).toMatch(/已經有竹屋/);
    expect(canPlace(s, 'brick', { x: 515, y: 750 }).why).toMatch(/平地或山坡/);
    expect(canPlace(s, 'pier', { x: 690, y: 467 }).why).toMatch(/海灣/);
    expect(canPlace(s, 'pier', { x: 880, y: 705 }).ok).toBe(true);
  });
  it('雲霧沒散的地方不能蓋', () => {
    const s = rich();
    expect(canPlace(s, 'stilt', { x: 255, y: 570 }).why).toMatch(/雲霧/);
    expect(canPlace(s, 'divehut', { x: 1520, y: 690 }).why).toMatch(/雲霧/);
  });
  it('蓋了會扣錢、自動派閒著的人', () => {
    let s = rich();
    s = build(s, 'pier', { x: 880, y: 705 });
    expect(s.b).toHaveLength(2);
    expect(s.b[1].worker).toBe(2);
    expect(idle(s).map((p) => p.name)).toEqual(['春花姨']);
    s = build(s, 'market', { x: 908, y: 587 });
    s = build(s, 'garden', { x: 1280, y: 382 });
    expect(s.b[3].worker).toBeNull(); // 小孫子不用工作
    expect(assign(s, s.b[3].id)).toBe(s);
  });
  it('擺在一起有加成、評價變高', () => {
    let s = rich();
    s = build(s, 'pier', { x: 880, y: 705 });
    const before = rating(s);
    s = build(s, 'market', { x: 908, y: 587 });
    expect(combosOf(s, s.b[1]).map((c) => c.with.kind)).toContain('market');
    expect(rating(s)).toBeGreaterThan(before + BUILDINGS.market.appeal);
  });
});

describe('過一個月', () => {
  it('碼頭捕魚、市場賣錢、有空床就有人搬回來', () => {
    let s = rich();
    s = build(s, 'pier', { x: 880, y: 705 });
    s = build(s, 'market', { x: 908, y: 587 });
    s = build(s, 'brick', { x: 735, y: 568 });
    const coins = s.coins;
    const { s: n, r } = advance(s, fixed(0.9));
    expect(n.month).toBe(5);
    expect(n.coins).toBeGreaterThan(coins);
    expect(r.arrived).toHaveLength(1);
    expect(n.people).toHaveLength(4);
    expect(capacity(n)).toBe(5);
  });
  it('東北季風讓漁船出不了海', () => {
    let s = rich();
    s = build(s, 'pier', { x: 880, y: 705 });
    const calm = advance({ ...s, weather: 'sun' }, fixed(0.9)).s.goods.fish;
    const windy = advance({ ...s, weather: 'wind' }, fixed(0.9)).s.goods.fish;
    expect(windy).toBeLessThan(calm);
  });
  it('颱風：先做防颱就平安，沒做會壞', () => {
    let s = rich();
    s = build(s, 'pier', { x: 880, y: 705 });
    s = { ...s, weather: 'typhoon' };
    const bad = advance(s, fixed(0)).s;
    expect(bad.b.some((b) => b.broken)).toBe(true);
    expect(bad.typhoons).toBe(0);
    const good = advance(prepare(s), fixed(0)).s;
    expect(good.b.some((b) => b.broken)).toBe(false);
    expect(good.typhoons).toBe(1);
  });
  it('夏天才有颱風、冬天是東北季風', () => {
    expect(rollWeather(8, 1, false, fixed(0.1))).toBe('typhoon');
    expect(rollWeather(1, 1, false, fixed(0.5))).toBe('wind');
    expect(rollWeather(4, 1, false, fixed(0.5))).toBe('sun');
  });
  it('一個月只能牽罟一次', () => {
    let s = rich();
    s = build(s, 'brick', { x: 735, y: 568 });
    s = { ...s, quests: [], b: [...s.b, { id: 99, kind: 'netshed', at: { x: 645, y: 750 }, worker: null }] };
    expect(canSeine(s)).toBe(true);
    s = seine(s, 5);
    expect(s.goods.fish).toBeGreaterThan(0);
    expect(canSeine(s)).toBe(false);
  });
  it('任務做到就領獎', () => {
    let s = rich();
    s = build(s, 'brick', { x: 735, y: 568 });
    const { s: n, r } = advance(s, fixed(0.9));
    expect(n.quests).toContain('house');
    expect(r.quest).toBeTruthy();
  });
  it('一開始是一顆星', () => {
    expect(stars(freshVillage())).toBe(1);
  });
  it('存檔壞掉從頭來', () => {
    expect(loadVillage({ getItem: () => '{bad' }).month).toBe(4);
  });
});

describe('大馬路、趕海、廟會', () => {
  it('格子都不在大馬路和水上、魚塭池只能蓋魚塭', () => {
    for (const g of SLOTS.filter((x) => !x.lot)) expect(onRoad(g), `${g.x},${g.y}`).toBe(false); // 畫好的地基不管（描路的時候有些框框被當成路）
    const s = { ...rich(), b: [], quests: ['star2'] } as Village;
    const pond = SLOTS.find((g) => g.pond)!;
    expect(canPlace({ ...s, b: [{ id: 1, kind: 'brick', at: { x: 735, y: 568 }, worker: null }, { id: 2, kind: 'brick', at: { x: 605, y: 367 }, worker: null }, { id: 3, kind: 'market', at: { x: 908, y: 587 }, worker: null }] }, 'stilt', pond).why).toMatch(/雲霧|魚塭/);
  });
  it('舊存檔的建築搬到最近的空格子', () => {
    const old = { ...freshVillage(), b: [{ id: 1, kind: 'stilt' as Kind, at: { x: 760, y: 440 }, worker: null }, { id: 2, kind: 'brick' as Kind, at: { x: 700, y: 560 }, worker: null }, { id: 3, kind: 'pier' as Kind, at: { x: 1060, y: 660 }, worker: null }] };
    const n = toSlots(old);
    expect(n.b.map((b) => `${b.at.x},${b.at.y}`)).toEqual(['792,447', '735,568', '1210,730']);
    expect(toSlots(n)).toBe(n);
  });
  const withHut = (month: number): Village => ({ ...rich(), month, b: [...freshVillage().b, { id: 9, kind: 'divehut', at: REEF, worker: 2 }] });
  it('三到九月、有海女才能趕海，一個月一次', () => {
    expect(canDive({ ...withHut(5), b: [{ id: 9, kind: 'divehut', at: REEF, worker: null }] })).toBe(false);
    expect(canDive(withHut(12))).toBe(false);
    expect(canDive({ ...withHut(8), weather: 'typhoon' })).toBe(false);
    const s = dive(withHut(5), { weed: 8, fish: 4, coins: 12 }, true);
    expect(s.goods.weed).toBe(8);
    expect(s.coins).toBe(9999 + 12);
    expect(canDive(s)).toBe(false);
  });
  it('沒在漲潮前上岸，收穫少一半', () => {
    const s = dive(withHut(5), { weed: 9, fish: 4, coins: 12 }, false);
    expect(s.goods.weed).toBe(4);
    expect(s.goods.fish).toBe(2);
    expect(s.dives).toBe(1);
  });
  const withTemple = (month: number, worker: number | null = 3): Village => ({ ...rich(), month, b: [...freshVillage().b, { id: 9, kind: 'temple', at: { x: 1300, y: 330 }, worker }] });
  it('三月有廟、有鼓手才能辦廟會，打得越準賺越多', () => {
    expect(canFestival(withTemple(4))).toBe(false);
    expect(canFestival(withTemple(3, null))).toBe(false);
    const s = festival(withTemple(3), 10);
    expect(s.coins).toBe(9999 + festivalCoins(10));
    expect(festivalCoins(10)).toBeGreaterThan(festivalCoins(0));
    expect(s.festivals).toBe(1);
    expect(s.festAt).toBe(monthIndex(s));
    expect(canFestival(s)).toBe(false);
  });
  it('自己打過鼓，月底就不再自動辦一次；沒打就辦小的', () => {
    const played = advance(festival(withTemple(3), 6), fixed(0.9)).s;
    expect(played.festivals).toBe(1);
    const auto = advance(withTemple(3), fixed(0.9)).s;
    expect(auto.festivals).toBe(1);
  });
  it('舊存檔沒有趕海、廟會欄位也讀得到', () => {
    const s = loadVillage({ getItem: () => JSON.stringify({ v: 1, intro: true, month: 3 }) });
    expect(s.diveAt).toBe(-1);
    expect(s.festAt).toBe(-1);
  });
});

describe('新手教學', () => {
  it('教學的三個位置照順序都蓋得下去，錢也夠', async () => {
    const { TUTORIAL } = await import('../data/village');
    let s = freshVillage();
    for (const t of TUTORIAL) {
      expect(canPlace(s, t.kind, t.at).ok).toBe(true);
      const n = build(s, t.kind, t.at);
      expect(n.b.length).toBe(s.b.length + 1);
      s = n;
    }
  });
  it('之前玩過的存檔不用再教一次', () => {
    expect(loadVillage({ getItem: () => JSON.stringify({ v: 1, intro: true }) }).tut).toBeGreaterThan(3);
    expect(loadVillage({ getItem: () => JSON.stringify({ v: 1, intro: false }) }).tut).toBe(0);
  });
  it('換平板：留玩得比較久的那份', async () => {
    const { pickVillage } = await import('./village');
    const a = freshVillage(), b = { ...freshVillage(), month: 9 };
    expect(pickVillage(a, b).month).toBe(9);
    expect(pickVillage(b, a).month).toBe(9);
    expect(pickVillage(a, null)).toBe(a);
  });
});

describe('月底結算、漁獲圖鑑、年度小挑戰', () => {
  it('結算卡記下這個月收成和賺的錢，夏天碼頭抓到小卷進圖鑑', () => {
    let s = rich();
    s = build(s, 'pier', { x: 880, y: 705 });
    s = { ...s, month: 7, weather: 'sun' };
    const { s: n, r } = advance(s, fixed(0.9));
    expect(r.month).toBe(7);
    expect(r.made.fish).toBeGreaterThan(0);
    expect(r.dex).toContain('squid');
    expect(n.dex).toContain('squid');
    expect(n.ys.fish).toBe(r.made.fish);
    // 同一種第二次不算新的
    expect(advance({ ...n, month: 7, weather: 'sun' }, fixed(0.9)).r.dex).not.toContain('squid');
  });
  it('牽罟抓到丁香魚', () => {
    const s: Village = { ...rich(), b: [...rich().b, { id: 99, kind: 'netshed', at: { x: 420, y: 760 }, worker: null }] };
    expect(seine(s, 3).dex).toEqual(['anchovy']);
  });
  it('五顆星之後每年一個挑戰：牽罟三次就完成、只領一次', () => {
    let s: Village = { ...rich(), done: true, year: 3, seineAt: -1 };
    expect(yearGoal(s)?.id).toBe('seine');
    s = { ...s, b: [...s.b, { id: 99, kind: 'netshed', at: { x: 420, y: 760 }, worker: null }] };
    const c0 = s.coins;
    for (let i = 0; i < 3; i++) s = seine({ ...s, seineAt: -1 }, 0);
    expect(s.yrs).toEqual([3]);
    expect(s.coins).toBeGreaterThan(c0 + 50);
    s = seine({ ...s, seineAt: -1 }, 0);
    expect(s.yrs).toEqual([3]);
  });
  it('平安的一年：12 月底沒有建築被吹壞才算，過年紀錄歸零', () => {
    const s: Village = { ...rich(), done: true, year: 4, month: 12, weather: 'wind' };
    expect(yearGoal(s)?.id).toBe('safe');
    const { s: n, r } = advance(s, fixed(0.9));
    expect(n.yrs).toContain(4);
    expect(r.year).toBeTruthy();
    expect(n.year).toBe(5);
    expect(n.ys).toEqual({ fish: 0, broken: 0, drum: 0, seines: 0 });
    const bad = advance({ ...s, ys: { fish: 0, broken: 1, drum: 0, seines: 0 } }, fixed(0.9)).s;
    expect(bad.yrs).not.toContain(4);
  });
  it('漁獲代號跟資料庫一樣（勳章、時光幣兩處）', () => {
    const list = `(${CATCHES.map((c) => `'${c.id}'`).join(', ')})`;
    expect(sql.split(list).length - 1).toBe(2);
  });
  it('還沒五顆星沒有年度挑戰；舊存檔讀得到新欄位', () => {
    expect(yearGoal(freshVillage())).toBeNull();
    const old = loadVillage({ getItem: () => JSON.stringify({ v: 1, intro: true, tut: 9 }) });
    expect(old.dex).toEqual([]);
    expect(old.ys.fish).toBe(0);
  });
});

describe('蓋錯了', () => {
  it('這個月剛蓋的拆掉全額退，過了月底只退一半', () => {
    let s = rich();
    const c0 = s.coins;
    s = build(s, 'brick', { x: 735, y: 568 });
    const id = s.b[1].id;
    expect(demolish(s, id).coins).toBe(c0);
    const later = advance(s, () => 0.9).s;
    expect(demolish(later, id).coins - later.coins).toBe(Math.floor(BUILDINGS.brick.cost / 2));
  });
});
