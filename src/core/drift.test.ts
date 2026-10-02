import { describe, expect, it } from 'vitest';
import { sail, shortest, voyage } from './drift';
import { DRIFTS } from '../data/prologue';

describe('海上漂流', () => {
  for (const lv of DRIFTS) {
    it(`第 ${lv.id} 關「${lv.title}」有解`, () => {
      const plan = shortest(lv);
      expect(plan).not.toBeNull();
      expect(voyage(lv, plan!).outcome).toBe('arrived');
    });
  }

  it('第一關：夏天往東北漂到港口；冬天漂出海圖', () => {
    expect(voyage(DRIFTS[0], ['summer', 'summer']).outcome).toBe('arrived');
    expect(voyage(DRIFTS[0], ['winter', 'winter']).outcome).toBe('lost');
  });

  it('第二關：冬天往西南漂到港口', () => {
    expect(voyage(DRIFTS[1], ['winter', 'winter']).outcome).toBe('arrived');
    expect(voyage(DRIFTS[1], ['summer']).outcome).toBe('lost');
  });

  it('第三關：要用到黑潮和換季；一直同一個季節到不了', () => {
    const lv = DRIFTS[2];
    const plan = shortest(lv)!;
    expect(plan).toContain('calm');
    for (const s of ['winter', 'summer', 'calm'] as const) expect(voyage(lv, Array(lv.legs).fill(s)).outcome).not.toBe('arrived');
  });

  it('換季沒風：不在黑潮裡船不動，在黑潮裡往北', () => {
    const lv = DRIFTS[2];
    expect(sail(lv, lv.start, 'calm').end).toEqual(lv.start);
    expect(sail(lv, { col: 9, row: 9 }, 'calm').end).toEqual({ col: 9, row: 7 });
  });
});
