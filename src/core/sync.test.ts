import { describe, expect, it } from 'vitest';
import { fresh } from './save';
import { freshWorld } from './world';
import { mergeWorld, pickProgress } from './sync';
import { keyFor, setSaveOwner } from './owner';

describe('本機與雲端存檔', () => {
  it('雲端玩得比較遠（換平板）就用雲端的', () => {
    const local = { ...fresh(), reached: 1 as const, cards: ['river'] };
    const cloud = { ...fresh(), reached: 4 as const, step: 4 as const, cards: ['shi'] };
    const p = pickProgress(local, cloud);
    expect(p.reached).toBe(4);
    expect(p.cards).toEqual(['shi', 'river']);
  });
  it('一樣遠用本機的；雲端沒有或格式不對也用本機的', () => {
    const local = { ...fresh(), reached: 2 as const, bamboo: 3 };
    expect(pickProgress(local, { ...fresh(), reached: 2 }).bamboo).toBe(3);
    expect(pickProgress(local, null)).toBe(local);
    expect(pickProgress(local, { v: 9 } as never)).toBe(local);
  });
  it('過關的那份優先，星星取最好的', () => {
    const local = { ...fresh(), reached: 5 as const, stars: 3, done: false };
    const cloud = { ...fresh(), reached: 5 as const, stars: 2, done: true };
    const p = pickProgress(local, cloud);
    expect(p.done).toBe(true);
    expect(p.stars).toBe(3);
  });
  it('大地圖兩邊合起來', () => {
    const w = mergeWorld({ ...freshWorld(), cleared: ['ch5'], cards: ['a'], tools: ['glasses'] }, { ...freshWorld(), celebrated: ['ch5'], greeted: true, cards: ['b'], prologue: true, tools: ['compass'] });
    expect(w).toEqual({ v: 1, cleared: ['ch5'], celebrated: ['ch5'], greeted: true, cards: ['a', 'b'], prologue: true, tools: ['glasses', 'compass'], finale: false });
    expect(mergeWorld(freshWorld(), { ...freshWorld(), finale: true }).finale).toBe(true);
  });
  it('本機存檔一人一格', () => {
    expect(keyFor('island.ch5.v1')).toBe('island.ch5.v1');
    setSaveOwner('abc');
    expect(keyFor('island.ch5.v1')).toBe('island.ch5.v1:abc');
    setSaveOwner(null);
  });
});
