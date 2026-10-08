import { describe, expect, it } from 'vitest';
import {
  clinicCheck, clinicSolve, perms, railBegin, railDone, railSolve, railStep, railUsed, riverSolve, sail, teaGood, teaRun, trainCheck, trainSolve,
  type Pt, type RailStep,
} from './railway';
import { CLINIC, RAILS, RIVERS, TEA, TEA_STEPS, TRAINS } from '../data/ch6';
import { fresh6, pickProgress6, stars6 } from './save6';

const P = (x: number, y: number): Pt => ({ x, y });

describe('河運', () => {
  it('每一關都開得到，示範路線真的開得過去', () => {
    for (const r of RIVERS) {
      const s = riverSolve(r.level)!;
      expect(s).not.toBeNull();
      expect(sail(r.level, s.path, s.tide, s.boat).ok).toBe(true);
    }
  });
  it('第一關：沿著最上面直直開，會撞上石頭灘', () => {
    const lv = RIVERS[0].level;
    const v = sail(lv, [P(0, 0), P(1, 0), P(2, 0), P(3, 0)], 'low');
    expect(v.ok).toBe(false);
    expect(v.why).toBe('shallow');
  });
  it('第二關：退潮時大帆船到不了淡水，一定要等漲潮；窄河道的近路走不得', () => {
    const lv = RIVERS[1].level;
    expect(riverSolve(lv, ['low'])).toBeNull();
    expect(riverSolve(lv, ['high'])).not.toBeNull();
    const main = [P(8, 2), P(7, 2), P(6, 2), P(5, 2), P(4, 2), P(3, 2), P(2, 2), P(2, 1), P(2, 0)];
    expect(sail(lv, main, 'low').why).toBe('shallow');
    expect(sail(lv, main, 'high').ok).toBe(true);
    const side = [P(8, 2), P(7, 2), P(6, 2), P(6, 3), P(6, 4), P(5, 4)];
    expect(sail(lv, side, 'high').why).toBe('narrow');
  });
  it('第三關：從艋舺選大帆船一開始就擱淺，要選小舢舨、等漲潮', () => {
    const lv = RIVERS[2].level;
    const s = riverSolve(lv)!;
    expect(s.boat).toBe('sampan');
    expect(s.tide).toBe('high');
    expect(sail(lv, s.path, 'high', 'junk').ok).toBe(false);
    expect(sail(lv, s.path, 'low', 'sampan').ok).toBe(false);
  });
});

describe('茶葉的旅程（故事版）', () => {
  it('七站不重複，每張卡都有「為什麼」', () => {
    expect(new Set(TEA_STEPS.map((t) => t.id)).size).toBe(TEA_STEPS.length);
    for (const t of TEA_STEPS) {
      expect(t.why.length).toBeGreaterThan(0);
    }
  });
});

describe('烘茶排程', () => {
  it('有解，而且 24 種排法只有少數幾種過得了', () => {
    const good = teaGood(TEA);
    expect(good.length).toBeGreaterThan(0);
    expect(good.length).toBeLessThanOrEqual(3);
  });
  it('照清單順序排會失敗', () => {
    expect(teaRun(TEA, TEA.batches.map((b) => b.id)).ok).toBe(false);
  });
  it('發霉與太晚都會被抓到', () => {
    const all = perms(TEA.batches.map((b) => b.id)).map((o) => teaRun(TEA, o));
    expect(all.some((r) => r.moldy.length && !r.late)).toBe(true);
    expect(all.some((r) => r.late && !r.moldy.length)).toBe(true);
  });
});

describe('鋪鐵路', () => {
  const walk = (lv: typeof RAILS[0], cells: Pt[]) => {
    const path: RailStep[] = railBegin(lv);
    for (const c of cells) { const s = railStep(lv, path, c); if (typeof s === 'string') return s; path.push(s); }
    return path;
  };
  it('挖隧道、繞路兩種選擇都鋪得通，而且材料剛好', () => {
    for (const lv of RAILS) {
      const s = railSolve(lv)!;
      expect(s).not.toBeNull();
      expect(railDone(lv, s)).toBe(true);
      expect(railUsed(s).rails).toBeGreaterThanOrEqual(lv.rails - 1);
    }
  });
  it('繞路不能挖隧道：從基隆直直往下會被山擋住', () => {
    expect(walk(RAILS[1], [P(6, 1)])).toBe('tunnels');
  });
  it('挖隧道的鐵軌不夠繞路', () => {
    expect(railSolve({ ...RAILS[0], tunnels: 0 })).toBeNull();
  });
  it('沿著最下面那排直走，會碰到太陡的小山', () => {
    const r = walk(RAILS[0], [P(6, 1), P(6, 2), P(6, 3), P(6, 4), P(6, 5), P(5, 5), P(4, 5), P(3, 5), P(2, 5)]);
    expect(r).toBe('steep');
  });
});

describe('馬偕的醫館', () => {
  it('只有一種分法', () => {
    const s = clinicSolve(CLINIC);
    expect(s).toHaveLength(1);
    expect(clinicCheck(CLINIC, s[0]).done).toBe(true);
  });
  it('茶行阿姨給馬偕看，馬偕就看太多人了', () => {
    const r = clinicCheck(CLINIC, { uncle: 'mackay', sailor: 'mackay', aunt: 'mackay', hakka: 'han', kid: 'kav', porter: 'han' });
    expect(r.full).toEqual(['mackay']);
    expect(r.done).toBe(false);
  });
  it('聽不懂話、不會治的都會被指出來', () => {
    const r = clinicCheck(CLINIC, { hakka: 'mackay', uncle: 'kav' });
    expect(r.wrong.sort()).toEqual(['hakka', 'uncle']);
  });
});

describe('會車時刻表', () => {
  it('兩種選擇都有解，而且排法很少（只差在停哪一站的分法）', () => {
    for (const lv of TRAINS) { const s = trainSolve(lv); expect(s.length).toBeGreaterThan(0); expect(s.length).toBeLessThanOrEqual(6); }
  });
  it('都不停會撞車', () => {
    for (const lv of TRAINS) expect(trainCheck(lv, [0, 0, 0], [0, 0, 0]).crash).not.toBeNull();
  });
  it('先讓貨車：客車在臺北等 4 格；先讓客車：貨車在桃仔園等 6 格', () => {
    expect(trainCheck(TRAINS[0], [0, 4, 0], [0, 0, 0]).ok).toBe(true);
    expect(trainCheck(TRAINS[1], [0, 0, 0], [0, 0, 6]).ok).toBe(true);
    // 等太久會遲到、等不夠會撞車
    expect(trainCheck(TRAINS[0], [0, 5, 0], [0, 0, 0]).late[0]).toBe(true);
    expect(trainCheck(TRAINS[1], [0, 0, 0], [0, 0, 5]).crash).not.toBeNull();
    // 先讓客車的時候，客車不能停
    for (const s of trainSolve(TRAINS[1])) expect(s.down).toEqual([0, 0, 0]);
  });
});

describe('第六章存檔', () => {
  it('星星與雲端合併，選擇也留著', () => {
    const p = { ...fresh6(), mistakes: 2, answers: [1, 0, 2] };
    expect(stars6(p, [1, 0, 2])).toBe(3);
    const cloud = { ...fresh6(), reached: 4 as const, cards: ['c6-tea'], picks: { boss: 1 } };
    const m = pickProgress6({ ...fresh6(), cards: ['c6-liu'] }, cloud);
    expect(m.reached).toBe(4);
    expect(m.picks.boss).toBe(1);
    expect(m.cards.sort()).toEqual(['c6-liu', 'c6-tea']);
  });
});
