import { describe, expect, it } from 'vitest';
import {
  advance, assign, build, canPlace, canSeine, capacity, combosOf, freshVillage, idle, loadVillage, prepare, rating,
  rollWeather, seine, stars, type Village,
} from './village';
import { BUILDINGS, COVE, REEF, VH, VW, zoneAt, type Kind } from '../data/village';

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
    expect(canPlace(s, 'brick', { x: 800, y: 560 }).ok).toBe(true);
    expect(canPlace(s, 'brick', { x: 800, y: 1000 }).why).toMatch(/海/);
    expect(canPlace(s, 'brick', { x: 760, y: 440 }).why).toMatch(/疊/);
    expect(canPlace(s, 'pier', { x: 700, y: 480 }).why).toMatch(/海灣/);
    expect(canPlace(s, 'pier', { x: 1060, y: 660 }).ok).toBe(true);
  });
  it('雲霧沒散的地方不能蓋', () => {
    const s = rich();
    expect(canPlace(s, 'stilt', { x: 300, y: 420 }).why).toMatch(/雲霧/);
    expect(canPlace(s, 'divehut', { x: REEF.x, y: 640 }).why).toMatch(/雲霧/);
  });
  it('蓋了會扣錢、自動派閒著的人', () => {
    let s = rich();
    s = build(s, 'pier', { x: 1060, y: 660 });
    expect(s.b).toHaveLength(2);
    expect(s.b[1].worker).toBe(2);
    expect(idle(s).map((p) => p.name)).toEqual(['春花姨']);
    s = build(s, 'market', { x: 880, y: 560 });
    s = build(s, 'garden', { x: 1300, y: 330 });
    expect(s.b[3].worker).toBeNull(); // 小孫子不用工作
    expect(assign(s, s.b[3].id)).toBe(s);
  });
  it('擺在一起有加成、評價變高', () => {
    let s = rich();
    s = build(s, 'pier', { x: 1060, y: 660 });
    const before = rating(s);
    s = build(s, 'market', { x: 900, y: 560 });
    expect(combosOf(s, s.b[1]).map((c) => c.with.kind)).toContain('market');
    expect(rating(s)).toBeGreaterThan(before + BUILDINGS.market.appeal);
  });
});

describe('過一個月', () => {
  it('碼頭捕魚、市場賣錢、有空床就有人搬回來', () => {
    let s = rich();
    s = build(s, 'pier', { x: 1060, y: 660 });
    s = build(s, 'market', { x: 900, y: 560 });
    s = build(s, 'brick', { x: 700, y: 560 });
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
    s = build(s, 'pier', { x: 1060, y: 660 });
    const calm = advance({ ...s, weather: 'sun' }, fixed(0.9)).s.goods.fish;
    const windy = advance({ ...s, weather: 'wind' }, fixed(0.9)).s.goods.fish;
    expect(windy).toBeLessThan(calm);
  });
  it('颱風：先做防颱就平安，沒做會壞', () => {
    let s = rich();
    s = build(s, 'pier', { x: 1060, y: 660 });
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
    s = build(s, 'brick', { x: 700, y: 560 });
    s = { ...s, quests: [], b: [...s.b, { id: 99, kind: 'netshed', at: { x: 600, y: 700 }, worker: null }] };
    expect(canSeine(s)).toBe(true);
    s = seine(s, 5);
    expect(s.goods.fish).toBeGreaterThan(0);
    expect(canSeine(s)).toBe(false);
  });
  it('任務做到就領獎', () => {
    let s = rich();
    s = build(s, 'brick', { x: 700, y: 560 });
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
