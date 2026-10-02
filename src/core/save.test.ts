import { describe, expect, it } from 'vitest';
import { craft, fresh, goTo, load, save, starsOf } from './save';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('本機存檔', () => {
  it('存了讀得回來', () => {
    const s = memory();
    save({ ...fresh(), step: 3, cages: 4 }, s);
    expect(load(s).step).toBe(3);
    expect(load(s).cages).toBe(4);
  });

  it('沒存過、格式壞掉都從頭開始', () => {
    expect(load(memory()).step).toBe(0);
    const s = memory();
    s.setItem('island.ch5.v1', '{壞掉');
    expect(load(s)).toEqual(fresh());
  });

  it('reached 記玩到最遠的那一步', () => {
    expect(goTo(goTo(fresh(), 3), 1).reached).toBe(3);
  });

  it('做竹蛇籠要 1 根竹子、2 顆石頭', () => {
    const p = craft({ ...fresh(), bamboo: 1, stone: 3 });
    expect(p).toMatchObject({ bamboo: 0, stone: 1, cages: 1 });
    expect(craft(p)).toBe(p);
  });

  it('三顆星：過關、沒沖壞、全對', () => {
    expect(starsOf({ ...fresh(), answers: [0, 1] }, [0, 1])).toBe(3);
    expect(starsOf({ ...fresh(), broken: 1, answers: [0, 2] }, [0, 1])).toBe(1);
  });

  it('舊存檔（六步）：豐收搬到第 6 步，玩完的算到最後', () => {
    const s = memory();
    s.setItem('island.ch5.v1', JSON.stringify({ v: 1, step: 5, reached: 5, done: false }));
    expect(load(s)).toMatchObject({ ver: 2, step: 6, reached: 6 });
    s.setItem('island.ch5.v1', JSON.stringify({ v: 1, step: 3, reached: 4 }));
    expect(load(s)).toMatchObject({ step: 3, reached: 4, friends: [] });
    s.setItem('island.ch5.v1', JSON.stringify({ v: 1, step: 2, reached: 5, done: true }));
    expect(load(s)).toMatchObject({ step: 6, reached: 6, flood: true });
  });

  it('新存檔不會再搬一次', () => {
    const s = memory();
    save({ ...fresh(), step: 5, reached: 5 }, s);
    expect(load(s).step).toBe(5);
  });
});
