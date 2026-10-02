import { describe, expect, it } from 'vitest';
import { calendarCheck, deerRun, farmYear, rotSolve, simulate, type RuleId } from './mountain';
import { CHORES, DEER, ROT, RULES } from '../data/ch2';
import { fresh2, pickProgress2, stars2 } from './save2';

describe('輪耕', () => {
  it('關卡解得開，示範的種法每年都夠', () => {
    const plan = rotSolve(ROT)!;
    expect(plan).toHaveLength(ROT.years);
    let f = ROT.start;
    for (const c of plan) { const r = farmYear(ROT, f, c); expect(r.harvest).toBeGreaterThanOrEqual(ROT.need); f = r.next; }
  });
  it('一直種同樣三塊，第二年就不夠', () => {
    const y1 = farmYear(ROT, ROT.start, [0, 1, 2]);
    expect(y1.harvest).toBeGreaterThanOrEqual(ROT.need);
    expect(farmYear(ROT, y1.next, [0, 1, 2]).harvest).toBeLessThan(ROT.need);
  });
  it('陡坡一次少 2，休息最多回到 max', () => {
    const r = farmYear(ROT, [3, 3, 3, 2, 2, 3], [5]);
    expect(r.next[5]).toBe(1);
    expect(r.next[0]).toBe(3);
    expect(r.next[3]).toBe(3);
  });
});

describe('狩獵', () => {
  it('春天不打、秋冬打 5 隻，兩年都過關', () => {
    expect(deerRun(DEER, [[0, 0, 3, 2], [0, 0, 3, 2]]).ok).toBe(true);
  });
  it('春天打獵，鹿群會變少', () => {
    const r = deerRun(DEER, [[1, 0, 2, 2], [1, 0, 2, 2]]);
    expect(r.fewer).toBe(true);
    expect(r.ok).toBe(false);
  });
  it('打太少就餓肚子', () => {
    expect(deerRun(DEER, [[0, 0, 2, 2], [0, 0, 2, 2]]).hungry).toBe(true);
  });
});

describe('生活曆', () => {
  it('全部放對才算完成，放錯的會被指出來', () => {
    const right = Object.fromEntries(CHORES.map((c) => [c.id, c.season]));
    expect(calendarCheck(CHORES, right).done).toBe(true);
    const r = calendarCheck(CHORES, { ...right, hunt: 0 });
    expect(r.done).toBe(false);
    expect(r.wrong).toEqual(['hunt']);
  });
});

describe('部落規範', () => {
  const combos: RuleId[][] = [];
  const ids = RULES.map((r) => r.id);
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) for (let c = b + 1; c < 6; c++) combos.push([ids[a], ids[b], ids[c]]);
  it('只有「輪流休耕＋春天不打獵＋分享」過得了五年', () => {
    const ok = combos.filter((c) => simulate(c, ROT, DEER).ok);
    expect(ok).toHaveLength(1);
    expect([...ok[0]].sort()).toEqual(RULES.filter((r) => r.good).map((r) => r.id).sort());
  });
});

describe('第二章存檔', () => {
  it('星星與雲端合併', () => {
    const p = { ...fresh2(), mistakes: 2, answers: [1, 2, 0] };
    expect(stars2(p, [1, 2, 0])).toBe(3);
    const cloud = { ...fresh2(), reached: 4 as const, cards: ['deer'] };
    const m = pickProgress2({ ...fresh2(), cards: ['elder'] }, cloud);
    expect(m.reached).toBe(4);
    expect(m.cards.sort()).toEqual(['deer', 'elder']);
  });
});
