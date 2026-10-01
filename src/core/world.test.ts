import { describe, expect, it } from 'vitest';
import {
  addCards, celebrate, freshWorld, loadWorld, lodLevel, markCleared, nearest, opened, paddyLook, pathLength, pointAlong,
  saveWorld, seasonAt, toCelebrate, walker,
} from './world';

describe('大地圖進度', () => {
  it('過關記一次，撥雲動畫播過才算撥開', () => {
    let w = markCleared(freshWorld(), 'ch5');
    expect(markCleared(w, 'ch5').cleared).toEqual(['ch5']);
    expect(toCelebrate(w)).toEqual(['ch5']);
    expect(opened(w)).toEqual([]);
    w = celebrate(w, 'ch5');
    expect(toCelebrate(w)).toEqual([]);
    expect(opened(w)).toEqual(['ch5']);
  });
  it('存了讀得回來，壞掉的資料從頭開始', () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    saveWorld(celebrate(markCleared(freshWorld(), 'ch5'), 'ch5'), store);
    expect(loadWorld(store).celebrated).toEqual(['ch5']);
    mem.set('island.world.v1', '{壞掉');
    expect(loadWorld(store)).toEqual(freshWorld());
    mem.set('island.world.v1', JSON.stringify({ v: 9 }));
    expect(loadWorld(store)).toEqual(freshWorld());
  });
});

describe('圖鑑', () => {
  it('跨章累積，不會重複', () => {
    const w = addCards(addCards(freshWorld(), ['river', 'plain']), ['plain', 'shi']);
    expect(w.cards).toEqual(['river', 'plain', 'shi']);
  });
});

describe('季節', () => {
  it('一輪四季，繞一圈回來', () => {
    expect([0.1, 0.4, 0.7, 0.9].map(seasonAt)).toEqual(['seedling', 'growing', 'golden', 'harvest']);
    expect(seasonAt(1.1)).toBe('seedling');
    expect(seasonAt(-0.1)).toBe('harvest');
  });
  it('綠稻和金黃交叉淡入淡出，不會兩張都滿', () => {
    for (let p = 0; p < 1; p += 0.01) {
      const { green, gold } = paddyLook(p);
      expect(green).toBeGreaterThanOrEqual(0);
      expect(gold).toBeLessThanOrEqual(1);
      expect(green + gold).toBeLessThanOrEqual(1.0001);
    }
    expect(paddyLook(0.4)).toEqual({ green: 1, gold: 0 });
    expect(paddyLook(0.7)).toEqual({ green: 0, gold: 1 });
  });
});

describe('小人沿路走', () => {
  const path = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
  it('折線長度與沿線位置', () => {
    expect(pathLength(path)).toBe(20);
    expect(pointAlong(path, 15)).toEqual({ x: 10, y: 5 });
    expect(pointAlong(path, 99)).toEqual({ x: 10, y: 10 });
  });
  it('走到底停一下再走回來', () => {
    expect(walker(path, 10, 0.5).at).toEqual({ x: 5, y: 0 });
    expect(walker(path, 10, 0.5).left).toBe(false);
    expect(walker(path, 10, 3).resting).toBe(true);
    const back = walker(path, 10, 2 + 2 + 1.5);
    expect(back.at).toEqual({ x: 5, y: 0 });
    expect(back.left).toBe(true);
  });
});

describe('拉遠只留幾個', () => {
  it('越放大出來越多', () => {
    expect(lodLevel(1)).toBe(-1);
    expect(lodLevel(2)).toBe(0);
    expect(lodLevel(5)).toBe(3);
  });
  it('點選最近的東西', () => {
    const list = [{ at: { x: 0, y: 0 }, n: 'a' }, { at: { x: 10, y: 0 }, n: 'b' }];
    expect(nearest(list, { x: 8, y: 1 }, 5)?.n).toBe('b');
    expect(nearest(list, { x: 50, y: 0 }, 5)).toBeNull();
  });
});
