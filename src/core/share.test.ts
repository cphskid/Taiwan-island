import { describe, expect, it } from 'vitest';
import { goodRange, perField, setGate, startShare, stateOf, tick, type Share } from './share';

const run = (s: Share, sec: number) => {
  for (let t = 0; t < sec; t += 0.1) s = tick(s, 0.1);
  return s;
};

describe('分水協商', () => {
  it('旱季照田的多少分（6:4）剛好；兩邊一樣多就一邊乾一邊淹', () => {
    const fair = perField('dry', { zhang: 60, quan: 40 });
    expect(stateOf(fair.zhang)).toBe('ok');
    expect(stateOf(fair.quan)).toBe('ok');
    const even = perField('dry', { zhang: 50, quan: 50 });
    expect(stateOf(even.zhang)).toBe('dry');
    expect(stateOf(even.quan)).toBe('flood');
  });

  it('雨季水變多，旱季的設定會淹，要關小', () => {
    expect(stateOf(perField('rain', { zhang: 60, quan: 40 }).zhang)).toBe('flood');
    const ok = perField('rain', { zhang: 40, quan: 25 });
    expect(stateOf(ok.zhang)).toBe('ok');
    expect(stateOf(ok.quan)).toBe('ok');
  });

  it('兩邊開超過 100% 就照比例分掉全部的水', () => {
    const p = perField('dry', { zhang: 100, quan: 100 });
    expect(p.zhang * 6 + p.quan * 4).toBeCloseTo(10);
  });

  it('示範用的範圍裡每一格都剛好', () => {
    for (const season of ['dry', 'rain'] as const)
      for (const side of ['zhang', 'quan'] as const) {
        const [lo, hi] = goodRange(season, side);
        expect(lo).toBeLessThanOrEqual(hi);
        const g = side === 'zhang' ? { zhang: lo, quan: 0 } : { zhang: 0, quan: hi };
        expect(stateOf(perField(season, g)[side])).toBe('ok');
      }
  });

  it('閘板一次動 5%', () => {
    expect(setGate(startShare(), 'zhang', 62).gates.zhang).toBe(60);
  });

  it('調對旱季→雨季來了→重調撐住才過關；調錯會算失敗', () => {
    let s = setGate(setGate(startShare(), 'zhang', 50), 'quan', 50);
    s = run(s, 5);
    expect(s.fails).toBe(1);
    s = run(s, 3);
    expect(s.fails).toBe(1); // 同一個設定只算一次
    s = setGate(setGate(s, 'zhang', 60), 'quan', 40);
    s = run(s, 12);
    expect(s.season).toBe('rain');
    s = run(s, 5);
    expect(s.done).toBe(false);
    s = setGate(setGate(s, 'zhang', 40), 'quan', 25);
    s = run(s, 25);
    expect(s.done).toBe(true);
  });
});
