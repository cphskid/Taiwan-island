import { describe, expect, test } from 'vitest';
import {
  canStrike, cut, endSeason, fire, fireSolve, flake, forestOf, forestOver, grind, grindDone, grindSolve, knapDone, knapSolve,
  plant, slideCols, smelt, stoneOf, strike, tooThin, type Forest,
} from './stone-age';
import { FIRES, FOREST, GRINDS, KNAPS } from '../data/ch1';

describe('打製石器', () => {
  test('外側要空的才能敲；石片連後面一格一起掉', () => {
    const s = stoneOf({ rows: ['oo#'] });
    expect(canStrike(s, { col: 0, row: 0 }, 'right')).toBe(true);
    expect(canStrike(s, { col: 1, row: 0 }, 'right')).toBe(false); // 左邊還有石頭
    expect(flake(s, { col: 0, row: 0 }, 'right')).toHaveLength(2);
  });
  test('敲到要留的地方就壞了', () => {
    const s = stoneOf({ rows: ['o#'] });
    expect(strike(s, { col: 0, row: 0 }, 'right').broke).toBe(true);
    expect(strike(s, { col: 0, row: 0 }, 'down').broke).toBe(false);
  });
  test.each(KNAPS.map((k) => [k.name, k.level] as const))('%s 敲得完', (_, lv) => {
    let s = stoneOf(lv);
    const plan = knapSolve(s)!;
    expect(plan).not.toBeNull();
    for (const m of plan) { const r = strike(s, m.cell, m.dir); expect(r.broke).toBe(false); s = r.stone; }
    expect(knapDone(s)).toBe(true);
  });
});

describe('野燒', () => {
  test('正面 2 分、角落兩面各 1 分，風那面少 1 分', () => {
    expect(fire({ wood: 2, wind: null, wet: [] }, { N: 1, NE: 1 }).heat).toEqual({ N: 3, E: 1, S: 0, W: 0 });
    expect(fire({ wood: 1, wind: 'NE', wet: [] }, { S: 1 }).heat).toEqual({ N: -1, E: -1, S: 2, W: 0 });
  });
  test('柴沒放完不能點火；太燙會裂', () => {
    expect(fire({ wood: 6, wind: null, wet: [] }, { N: 1 }).result).toBe('more');
    expect(fire({ wood: 6, wind: null, wet: [] }, { N: 2, NE: 2, NW: 2 }).result).toBe('crack');
  });
  test.each(FIRES.map((f, i) => [i + 1, f.level] as const))('第 %i 關有解，而且不放濕地', (_, lv) => {
    const p = fireSolve(lv)!;
    expect(p).not.toBeNull();
    expect(fire(lv, p).result).toBe('ok');
    lv.wet.forEach((w) => expect(p[w] ?? 0).toBe(0));
  });
});

describe('磨製', () => {
  test('磨一下：那格少 2、旁邊各少 1', () => {
    expect(grind([5, 5, 5], 1)).toEqual([4, 3, 4]);
    expect(grind([5, 5, 5], 0)).toEqual([3, 4, 5]);
  });
  test.each(GRINDS.map((g) => [g.name, g.level] as const))('%s 磨得剛好', (_, lv) => {
    const x = grindSolve(lv)!;
    expect(x).not.toBeNull();
    let h = [...lv.from];
    x.forEach((n, i) => { for (let k = 0; k < n; k++) h = grind(h, i); });
    expect(tooThin(h, lv)).toBe(false);
    expect(grindDone(h, lv)).toBe(true);
  });
});

describe('煉鐵砍樹', () => {
  const steep = (r: number, c: number) => (FOREST.farRows + r) * FOREST.cols + c;
  const run = (plan: ((f: Forest) => Forest | null)[][]) => {
    let f = forestOf(FOREST);
    for (const season of plan) {
      for (const act of season) { const g = act(f); expect(g).not.toBeNull(); f = g!; }
      while (smelt(FOREST, f)) f = smelt(FOREST, f)!;
      f = endSeason(FOREST, f);
    }
    return f;
  };
  test('陡坡全部砍光會土石流', () => {
    const c = (i: number) => (f: Forest) => cut(FOREST, f, i);
    const f = run([[c(steep(0, 0)), c(steep(1, 0)), c(steep(0, 1)), c(steep(1, 1))], [c(steep(0, 2)), c(steep(1, 2)), c(steep(0, 3)), c(steep(1, 3))], [c(steep(0, 4)), c(steep(1, 4))], []]);
    expect(f.slides.length).toBeGreaterThan(0);
  });
  test('每排留一棵、再砍遠的，可以煉滿 3 爐又不土石流', () => {
    const c = (i: number) => (f: Forest) => cut(FOREST, f, i);
    const f = run([
      [c(steep(0, 0)), c(steep(0, 1)), c(steep(0, 2)), c(steep(0, 3))],
      [c(steep(0, 4)), c(steep(0, 5)), c(0)],
      [c(1), c(2)],
      [c(3), c(4)],
    ]);
    expect(f.iron).toBe(FOREST.iron);
    expect(f.slides).toEqual([]);
    expect(forestOver(FOREST, f)).toBe(true);
  });
  test('砍完馬上種樹苗也抓得住土；樹苗兩季後長回大樹', () => {
    let f = forestOf(FOREST);
    f = cut(FOREST, f, steep(0, 0))!; f = cut(FOREST, f, steep(1, 0))!; f = plant(f, steep(1, 0))!;
    expect(slideCols(FOREST, f)).toEqual([]);
    f = endSeason(FOREST, endSeason(FOREST, f));
    expect(f.trees[steep(1, 0)]).toBe('tree');
  });
});

import { fresh1, load1, pickProgress1, save1, stars1 } from './save1';
describe('第一章存檔', () => {
  test('存了讀得回來；壞掉的從頭開始', () => {
    const m = new Map<string, string>();
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    save1({ ...fresh1(), step: 3, reached: 3, cards: ['pot'] }, store);
    expect(load1(store).step).toBe(3);
    m.set([...m.keys()][0], '{壞掉');
    expect(load1(store)).toEqual(fresh1());
  });
  test('星星：失誤 3 次以內、全對', () => {
    expect(stars1({ ...fresh1(), mistakes: 2, answers: [0, 1, 2] }, [0, 1, 2])).toBe(3);
    expect(stars1({ ...fresh1(), mistakes: 4, answers: [0, 0, 2] }, [0, 1, 2])).toBe(1);
  });
  test('雲端玩得比較遠就用雲端的，卡片合起來', () => {
    const got = pickProgress1({ ...fresh1(), reached: 1, cards: ['a'] }, { ...fresh1(), reached: 4, cards: ['b'] });
    expect(got.reached).toBe(4);
    expect(got.cards.sort()).toEqual(['a', 'b']);
  });
});
