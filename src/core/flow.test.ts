import { describe, expect, it } from 'vitest';
import { simulate, solved, canDig, canPlace, type Ground } from './flow';
import { parseHeights } from './terrain';
import { place, type Dir, type Piece } from './pieces';
import { FLOOD, LEVELS } from '../data/babao-levels';
import type { Cell } from './iso';

// 小地圖：右邊一條河（col 3），圳頭在 (2,0)
function ground(map: string[], heights: string[], volume = 1): Ground {
  const K: Record<string, ReturnType<Ground['kind']>> = { r: 'river', g: 'grass', c: 'canal', t: 'gate', x: 'rock' };
  return {
    cols: map[0].length, rows: map.length,
    kind: ({ col, row }) => K[map[row][col]],
    heights: parseHeights(heights), flow: 1,
    lanes: [...map[0]].flatMap((ch, col) => (ch === 'r' ? [{ cell: { col, row: 0 }, volume }] : [])),
  };
}
const cages = (list: { cell: Cell; dir: Dir }[]): Piece[] => list.reduce<Piece[]>((l, p) => place(l, 'cage', p.cell, p.dir), []);

// 河 (3,0) 高度 1，圳頭 (1,0)…(2,0) 高 2：岸比河高，水推不上去
const G = ground(['gctr', 'gggr', 'gggr'], ['2221', '2221', '2220']);

describe('水流引擎', () => {
  const flat = ground(['ggctr', 'ggggr', 'ggggr'], ['33222', '33332', '33331']);

  it('沒有竹蛇籠，河水直直流出地圖', () => {
    const r = simulate(flat, [], []);
    expect(r.river.map((w) => w.cell.row).sort()).toEqual([0, 1, 2]);
    expect(r.canal).toEqual([]);
    expect(solved(r)).toBe(false);
  });

  it('竹蛇籠轉向圳頭，水進圳道流到分水閘', () => {
    const r = simulate(flat, cages([{ cell: { col: 4, row: 0 }, dir: 2 }]), []);
    expect(r.canal.map((w) => w.cell)).toContainEqual({ col: 2, row: 0 });
    expect(solved(r)).toBe(true);
  });

  it('岸比河高，竹蛇籠推不過去，水照河的方向流', () => {
    const r = simulate(G, cages([{ cell: { col: 3, row: 0 }, dir: 2 }]), []);
    expect(r.canal).toEqual([]);
    expect(r.river.some((w) => w.cell.row === 2)).toBe(true);
  });

  it('正面擋水：水小停住，水大沖壞籠子', () => {
    const head = cages([{ cell: { col: 4, row: 1 }, dir: 3 }]);
    const small = simulate(flat, head, []);
    expect(small.blocked.map((w) => w.cell)).toContainEqual({ col: 4, row: 1 });
    expect(small.broken).toEqual([]);
    const big = simulate(ground(['ggctr', 'ggggr', 'ggggr'], ['33222', '33332', '33331'], 2), head, []);
    expect(big.broken.map((w) => w.cell)).toContainEqual({ col: 4, row: 1 });
    expect(big.river.some((w) => w.cell.row === 2)).toBe(true);
  });

  it('轉到一般的地上就是淹水，不算過關', () => {
    const g = ground(['ggctr', 'ggggr', 'ggggr'], ['33222', '33322', '33331']);
    const r = simulate(g, cages([{ cell: { col: 4, row: 1 }, dir: 2 }]), []);
    expect(r.flooded.map((w) => w.cell)).toContainEqual({ col: 3, row: 1 });
    expect(solved(r)).toBe(false);
  });

  it('圳道遇到比較高的格子，水就停住', () => {
    // 圳頭 (3,0) 高 2，往左挖 (2,0) 高 3 → 上坡，水過不去
    const g = ground(['tggcr', 'ggggr'], ['13322', '33332']);
    const turn = cages([{ cell: { col: 4, row: 0 }, dir: 2 }]);
    expect(simulate(g, turn, [{ col: 2, row: 0 }, { col: 1, row: 0 }]).gates).toEqual([]);
    // 同一條圳道，高度一路往下就通
    const g2 = ground(['tggcr', 'ggggr'], ['01222', '33332']);
    expect(solved(simulate(g2, turn, [{ col: 2, row: 0 }, { col: 1, row: 0 }]))).toBe(true);
  });

  it('只有草地能挖、只有河裡能放竹蛇籠', () => {
    expect(canDig(flat, { col: 0, row: 0 })).toBe(true);
    expect(canDig(flat, { col: 4, row: 0 })).toBe(false);
    expect(canPlace(flat, { col: 4, row: 0 })).toBe(true);
    expect(canPlace(flat, { col: 0, row: 0 })).toBe(false);
  });
});

describe('八堡圳三個小關', () => {
  for (const lv of [...LEVELS, FLOOD]) {
    it(`${lv.title}：照解法會過，什麼都不做不會過`, () => {
      expect(solved(simulate(lv, [], []), lv.need)).toBe(false);
      const sol = cages(lv.solution.cages);
      expect(sol.length).toBeLessThanOrEqual(lv.cages);
      expect(lv.solution.canals.length).toBeLessThanOrEqual(lv.digs);
      for (const p of sol) expect(canPlace(lv, p.cell)).toBe(true);
      for (const cell of lv.solution.canals) expect(canDig(lv, cell)).toBe(true);
      const r = simulate(lv, sol, lv.solution.canals);
      expect(r.delivered).toBe(lv.need);
      expect(solved(r, lv.need)).toBe(true);
    });
  }

  it('第一關：籠子放錯格子，水淹到草地', () => {
    const r = simulate(LEVELS[0], cages([{ cell: { col: 13, row: 2 }, dir: 2 }]), []);
    expect(r.flooded).toHaveLength(1);
  });

  it('第二關：只引一道水不夠；直直往左挖會掉進低窪地', () => {
    const lv = LEVELS[1];
    const one = simulate(lv, cages([lv.solution.cages[1]]), lv.solution.canals);
    expect(one.delivered).toBe(1);
    expect(solved(one, lv.need)).toBe(false);
    const straight = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((col) => ({ col, row: 6 }));
    expect(solved(simulate(lv, cages([{ cell: { col: 13, row: 5 }, dir: 2 }, { cell: { col: 12, row: 6 }, dir: 2 }]), straight), lv.need)).toBe(false);
  });

  it('第三關：大石頭擋住水；正面硬擋會被沖壞', () => {
    const lv = LEVELS[2];
    const late = simulate(lv, cages([{ cell: { col: 11, row: 3 }, dir: 2 }]), lv.solution.canals);
    expect(late.delivered).toBe(2); // 只有最左邊那道進來
    expect(late.blocked.length).toBeGreaterThan(0);
    const r = simulate(lv, cages([{ cell: { col: 12, row: 1 }, dir: 3 }]), []);
    expect(r.broken).toHaveLength(1);
  });
});

describe('洪水大謎題', () => {
  it('三道水全部搶進來，圳道滿出來淹田；留一道給溪才過', () => {
    const all = simulate(FLOOD, cages(LEVELS[2].solution.cages), FLOOD.solution.canals);
    expect(all.delivered).toBe(6);
    expect(all.overflow).toBe(true);
    expect(solved(all, FLOOD.need)).toBe(false);
    const ok = simulate(FLOOD, cages(FLOOD.solution.cages), FLOOD.solution.canals);
    expect(ok.overflow).toBe(false);
    expect(ok.delivered).toBe(4);
  });

  it('只引一道水不夠', () => {
    const one = simulate(FLOOD, cages([{ cell: { col: 11, row: 3 }, dir: 2 }]), FLOOD.solution.canals);
    expect(one.delivered).toBe(2);
    expect(solved(one, FLOOD.need)).toBe(false);
  });

  it('沒有容量的關卡不會滿出來', () => {
    const r = simulate(LEVELS[2], cages(LEVELS[2].solution.cages), LEVELS[2].solution.canals);
    expect(r.overflow).toBe(false);
  });
});
