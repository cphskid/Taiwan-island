import { describe, expect, it } from 'vitest';
import {
  routeSolve, routeRun, routeStep, startShip, tradeBest, freshTrade, buy, sell, sail, tradeWon, herdRun, herdBest, herdSolutions,
  tracePath, decodeCheck, inside, parseHarbor, harborSolve, slide, harborFree, type RouteAction, type TradeState, type Good,
} from './tayouan';
import { DEED_LEGS, HARBORS, HERD, HERD_DEMAND, LAND_SPOTS, LAND_START, ROUTES, SECRET, TRADE, TRADE_DEMO, HERD_DEMO } from '../data/ch3';
import { fresh3, pickProgress3, stars3 } from './save3';

describe('季風與航線', () => {
  ROUTES.forEach((r, i) => {
    it(`第 ${i + 1} 關解得開，示範走法會到港`, () => {
      const plan = routeSolve(r.level)!;
      expect(plan).not.toBeNull();
      expect(routeRun(r.level, plan).outcome).toBe('arrived');
    });
    it(`第 ${i + 1} 關不換季風、一直順風走，到不了`, () => {
      const lv = r.level;
      for (const go of ['W', 'SW', 'S'] as const) {
        const acts: RouteAction[] = Array.from({ length: 12 }, () => ({ go }));
        expect(routeRun(lv, acts).outcome).not.toBe('arrived');
      }
    });
  });
  it('逆風不能走', () => {
    const lv = ROUTES[0].level;
    expect(() => routeStep(lv, startShip(lv), { go: 'E' })).toThrow();
  });
  it('第 1 關：退潮進水道會擱淺', () => {
    const plan = routeSolve(ROUTES[0].level)!;
    // 示範走法前面多等一天潮水，最後進水道那天就變成退潮
    const r = routeRun(ROUTES[0].level, ['tide', ...plan]);
    expect(r.outcome).toBe('lowtide');
  });
});

describe('轉口貿易', () => {
  it('最多賺得到目標以上，而且只差一點（要想）', () => {
    const b = tradeBest(TRADE);
    expect(b.money).toBeGreaterThanOrEqual(TRADE.goal);
    expect(b.money).toBeLessThan(TRADE.goal + 8);
  });
  it('示範的買賣做得到目標', () => {
    let s: TradeState = freshTrade(TRADE);
    for (const a of TRADE_DEMO) {
      const n = a.buy ? buy(TRADE, s, a.buy) : a.sell ? sell(TRADE, s, a.sell) : sail(TRADE, s, a.sail!);
      expect(n).not.toBeNull();
      s = n!;
    }
    expect(tradeWon(TRADE, s)).toBe(true);
  });
  it('一開始就去日本賣鹿皮，錢不夠', () => {
    let s: TradeState = freshTrade(TRADE);
    const g: Good = 'deerskin';
    for (let k = 0; k < 4; k++) s = buy(TRADE, s, g)!;
    s = sail(TRADE, s, 'japan')!;
    while (s.cargo.deerskin) s = sell(TRADE, s, g)!;
    s = sail(TRADE, s, 'tayouan')!;
    for (let k = 0; k < 4; k++) s = buy(TRADE, s, g) ?? s;
    s = sail(TRADE, s, 'japan')!;
    while (s.cargo.deerskin) s = sell(TRADE, s, g)!;
    expect(sail(TRADE, s, 'tayouan')).toBeNull(); // 船開完了
    expect(tradeWon(TRADE, s)).toBe(false);
  });
  it('不能在日本和巴達維亞之間直接開', () => {
    expect(sail(TRADE, { ...freshTrade(TRADE), at: 'japan' }, 'batavia')).toBeNull();
  });
});

describe('鹿皮的代價', () => {
  it('示範收法過關', () => { expect(herdRun(HERD, HERD_DEMO).ok).toBe(true); });
  it('照商館要的一年 10 群收，鹿群會變少', () => {
    const r = herdRun(HERD, HERD_DEMAND);
    expect(r.fewer).toBe(true);
    expect(r.ok).toBe(false);
  });
  it('一開始就收很多也不行；最多只比目標多一點', () => {
    expect(herdRun(HERD, [5, 5, 5, 5]).ok).toBe(false);
    expect(herdBest(HERD).total).toBeGreaterThanOrEqual(HERD.need);
    expect(herdSolutions(HERD).length).toBeLessThan(30); // 一萬多種收法裡只有十幾種過得了
  });
});

describe('新港文書', () => {
  it('解碼：全對才算，錯的會被指出來', () => {
    expect(decodeCheck(SECRET, SECRET).done).toBe(true);
    const r = decodeCheck(SECRET, { ...SECRET, tirak: 'S' });
    expect(r.done).toBe(false);
    expect(r.wrong).toEqual(['tirak']);
    expect(decodeCheck(SECRET, { tirak: 'N' }).done).toBe(false);
  });
  it('照契約走一圈回到起點，溪邊的社地圍在裡面', () => {
    const path = tracePath(LAND_SPOTS, LAND_START, DEED_LEGS)!;
    expect(path.map((s) => s.id)).toEqual(['stone', 'river-a', 'bamboo-n', 'tree-w', 'stone']);
    expect(inside(path, 2, 1.6)).toBe(true); // 新港社
    expect(inside(path, 5.6, 2.4)).toBe(false); // 甘蔗田在溪的另一邊
  });
  it('方向讀錯就走不通或走錯', () => {
    const wrong = DEED_LEGS.map((l, i) => (i === 1 ? { ...l, dir: 'S' as const } : l));
    const p = tracePath(LAND_SPOTS, LAND_START, wrong);
    expect(p === null || p[2].id !== 'bamboo-n').toBe(true);
  });
});

describe('港灣排船', () => {
  HARBORS.forEach((h, i) => {
    it(`第 ${i + 1} 關解得開，而且步數限制夠用`, () => {
      const hb = parseHarbor(h.rows);
      const sol = harborSolve(hb)!;
      expect(sol).not.toBeNull();
      expect(sol.length).toBeGreaterThanOrEqual(5);
      expect(sol.length).toBeLessThanOrEqual(h.moves);
      let bs = hb.boats;
      for (const m of sol) bs = slide(hb, bs, m.id, m.by)!;
      expect(harborFree(hb, bs)).toBe(true);
      expect(harborFree(hb, hb.boats)).toBe(false);
    });
  });
  it('撞到別的船就滑不過去', () => {
    const hb = parseHarbor(HARBORS[0].rows);
    expect(slide(hb, hb.boats, 'A', 1)).toBeNull();
  });
});

describe('第三章存檔', () => {
  it('星星與雲端合併，選擇也合在一起', () => {
    expect(stars3({ ...fresh3(), mistakes: 1, answers: [1, 0, 2] }, [1, 0, 2])).toBe(3);
    const m = pickProgress3({ ...fresh3(), picks: { honest: 0 } }, { ...fresh3(), reached: 3, picks: { deer: 1 }, cards: ['voc'] });
    expect(m.reached).toBe(3);
    expect(m.picks).toEqual({ honest: 0, deer: 1 });
    expect(m.cards).toEqual(['voc']);
  });
});
