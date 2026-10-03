import { describe, expect, it } from 'vitest';
import {
  ALL_RICE, damCheck, damSolve, damStart, flow, gateCheck, pipeSolutions, rotaCheck, rotaSolutions, rotaWater, rotate,
  yardDone, yardMove, yardSolve, yardStart, type Crop, type Dam, type Mat, type PipeLevel, type Rota,
} from './jianan';
import { DAM, HOME_ZONE, PIPE_DEMO, PIPES, ROTA, YARDS } from '../data/ch7';
import { fresh7, pickProgress7, stars7 } from './save7';

describe('調車場', () => {
  it('每一關都排得出來，最少調車次數剛好是上限', () => {
    for (const lv of YARDS) {
      const s = yardSolve(lv)!;
      expect(s).not.toBeNull();
      expect(s.sideMoves).toBe(lv.maxSide);
      let y = yardStart(lv);
      for (const [f, t] of s.moves) { const r = yardMove(lv, y, f, t); expect(r.error).toBeUndefined(); y = r.yard; }
      expect(yardDone(lv, y)).toBe(true);
      expect(y.out.map((c) => lv.order.indexOf(c.to))).toEqual([...y.out.map((c) => lv.order.indexOf(c.to))].sort((a, b) => a - b));
    }
  });
  it('還沒輪到的車廂直接掛上去會被擋下來', () => {
    const lv = YARDS[0];
    expect(yardMove(lv, yardStart(lv), 'in', 'out').error).toBe('wrong');
  });
  it('第二關：每節都推進同一條岔道，排不出來', () => {
    const lv = YARDS[1];
    let y = yardStart(lv);
    y = yardMove(lv, y, 'in', 'out').yard; // 基隆港直接掛
    y = yardMove(lv, y, 'in', 0).yard;
    y = yardMove(lv, y, 'in', 0).yard;
    y = yardMove(lv, y, 'in', 0).yard;
    expect(yardMove(lv, y, 'in', 0).error).toBe('full');
    expect(yardMove(lv, y, 'in', 1).error).toBeUndefined();
    y = yardMove(lv, y, 'in', 1).yard;
    expect(yardMove(lv, y, 'in', 1).error).toBe('tooMany');
  });
  it('少一次調車就排不出來', () => {
    for (const lv of YARDS) expect(yardSolve({ ...lv, maxSide: lv.maxSide - 1 })).toBeNull();
  });
});

describe('烏山頭大壩', () => {
  it('示範的填法過關', () => {
    expect(damCheck(DAM, damSolve(DAM)).ok).toBe(true);
  });
  it('一開始外面已經鋪石頭，裡面是空的', () => {
    const d = damStart(DAM);
    expect(damCheck(DAM, d).problem).toBe('empty');
  });
  it('黏土碰到石頭會被沖走、沒有黏土會漏水、黏土沒連起來也會漏', () => {
    const ok = damSolve(DAM);
    const wash = ok.map((r) => [...r]) as Dam; wash[0][3] = 'rock'; wash[0][2] = 'sand';
    expect(damCheck(DAM, wash).problem).toBe('wash');
    const leak = ok.map((r) => [...r]) as Dam;
    leak[0] = ['rock', 'rock', 'sand', 'clay', 'clay', 'sand', 'rock', 'rock', 'rock'];
    leak[1] = ['rock', 'rock', 'sand', 'rock', 'sand', 'rock', 'rock'];
    expect(damCheck(DAM, leak)).toEqual({ ok: false, problem: 'leak', row: 1 });
    const gap = ok.map((r) => [...r]) as Dam;
    gap[0] = ['rock', 'rock', 'rock', 'rock', 'rock', 'sand', 'clay', 'sand', 'rock'];
    expect(damCheck(DAM, gap)).toEqual({ ok: false, problem: 'gap', row: 1 });
    const allSand = ok.map((r) => r.map((m, i) => (i === 0 || i === r.length - 1 ? 'rock' : 'sand'))) as Dam;
    expect(damCheck(DAM, allSand).ok).toBe(false);
  });
  it('照庫存，只有心牆在正中間或斜一格的少數幾種填法', () => {
    const cells = DAM.widths.flatMap((w, row) => Array.from({ length: w - 2 }, (_, i) => [row, i + 1] as const));
    let n = 0;
    const mats: Mat[] = ['rock', 'sand', 'clay'];
    const d = damStart(DAM);
    const left = { ...DAM.stock };
    const go = (k: number) => {
      if (k === cells.length) { if (damCheck(DAM, d).ok) n += 1; return; }
      const [r, i] = cells[k];
      for (const m of mats) { if (!left[m]) continue; left[m] -= 1; d[r][i] = m; go(k + 1); left[m] += 1; d[r][i] = null; }
    };
    go(0);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(30);
  });
});

describe('三年輪作', () => {
  it('全部種稻的水比哪一年都多', () => {
    expect(ALL_RICE(ROTA)).toBeGreaterThan(Math.max(...ROTA.supply));
  });
  it('只有兩種排法，第一年都是甲雜作、乙甘蔗、丙水稻', () => {
    const s = rotaSolutions(ROTA);
    expect(s).toHaveLength(2);
    for (const r of s) expect(r[0]).toEqual(['misc', 'cane', 'rice']);
  });
  it('大塊的甲區第一年種稻，水不夠', () => {
    const r: Rota = [['rice', 'cane', 'misc'], ['cane', 'misc', 'rice'], ['misc', 'rice', 'cane']];
    const c = rotaCheck(ROTA, r);
    expect(c.ok).toBe(false);
    expect(c.over).toContain(0);
  });
  it('同一區連種兩次稻、同一年兩區種一樣的，都會被抓出來', () => {
    const r: Rota = [['misc', 'cane', 'rice'], ['cane', 'misc', 'rice'], ['rice', 'rice', 'cane']];
    const c = rotaCheck(ROTA, r);
    expect(c.repeat).toContain(2);
    expect(c.mix).toContain(2);
  });
  it('讓阿雄家多種一年稻，第二年水就不夠', () => {
    for (const s of rotaSolutions(ROTA)) {
      const row = [...s[1]] as Crop[];
      row[HOME_ZONE] = 'rice';
      expect(rotaWater(ROTA, row)).toBeGreaterThan(ROTA.supply[1]);
    }
  });
});

describe('日月潭水管', () => {
  it('一開始沒有接好', () => {
    expect(flow(PIPES).ok).toBe(false);
  });
  it('示範接法：接到最低的發電所，不漏水，電夠', () => {
    let lv: PipeLevel = PIPES;
    for (const [i, rot] of Object.entries(PIPE_DEMO)) { while ((lv.tiles[+i] as { rot: number }).rot !== rot) lv = rotate(lv, +i); }
    const f = flow(lv);
    expect(f.ok).toBe(true);
    expect(f.leaks).toHaveLength(0);
    expect(f.drop).toEqual([3]);
  });
  it('接到比較高的小電廠，電不夠', () => {
    const sols = pipeSolutions(PIPES);
    expect(sols.length).toBeGreaterThan(0);
    // 所有過關的接法都只接到門牌潭
    const free = PIPES.tiles.flatMap((t, i) => (t.k === 'pipe' ? [i] : []));
    for (const s of sols) {
      const tiles = PIPES.tiles.map((t, i) => (t.k === 'pipe' ? { ...t, rot: s[free.indexOf(i)] } : t));
      expect(flow({ ...PIPES, tiles }).plants).toEqual([19]);
    }
  });
  it('水不會往上爬', () => {
    // 2×2：湖在左下、發電所在右上，只能往上走
    const lv: PipeLevel = { cols: 2, rows: 2, need: 1, tiles: [{ k: 'rock' }, { k: 'plant', open: 2, name: 'x' }, { k: 'lake', open: 1 }, { k: 'pipe', shape: 'L', rot: 3 }] };
    const f = flow(lv);
    expect(f.uphill).toBe(true);
    expect(f.plants).toHaveLength(0);
  });
});

describe('分水門', () => {
  it('照第一年的種法剛好放 16 份水', () => {
    const year = rotaSolutions(ROTA)[0][0] as Crop[];
    expect(gateCheck(ROTA, year, [4, 6, 6]).ok).toBe(true);
    expect(gateCheck(ROTA, year, [4, 6, 5]).dry).toEqual([2]);
    expect(gateCheck(ROTA, year, [5, 6, 6]).flood).toEqual([0]);
  });
});

describe('第七章存檔', () => {
  it('星星與雲端合併', () => {
    const p = { ...fresh7(), mistakes: 1, answers: [1, 0, 2] };
    expect(stars7(p, [1, 0, 2])).toBe(3);
    const cloud = { ...fresh7(), reached: 5 as const, cards: ['dam'], picks: { rice: 0 } };
    const m = pickProgress7({ ...fresh7(), cards: ['hatta'] }, cloud);
    expect(m.reached).toBe(5);
    expect(m.cards.sort()).toEqual(['dam', 'hatta']);
    expect(m.picks.rice).toBe(0);
  });
});
