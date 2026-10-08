import { describe, expect, it } from 'vitest';
import {
  campSolutions, canDo, checkCamps, checkTemple, doAct, freshPans, grainSolutions, pondSolutions, runGrain, runPond, saltBest, saltRun, weather, saltEasyBest, saltEasyRun, easyDay, freshEasy,
  type Crop, type SaltAct, type EasyAct,
} from './tuntian';
import { CAMPS, CAMP_NAMES, GRAIN, POND, SALT, SALT_EASY, TEMPLE } from '../data/ch4';
import { fresh4, pickProgress4, stars4 } from './save4';

const crops = (rice: number, potato: number): Crop[] => {
  const c: Crop[] = [...Array(rice).fill('rice'), ...Array(potato).fill('potato')];
  while (c.length < POND.plots) c.push('none');
  return c;
};

describe('分營屯田', () => {
  it('有解，而且解法不多（要想）', () => {
    const s = campSolutions(CAMPS, 100);
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(4);
    for (const x of s) expect(checkCamps(CAMPS, x).ok).toBe(true);
    expect(CAMP_NAMES).toHaveLength(CAMPS.camps);
  });
  it('放在水裡、貼著社、挨在一起、分太散都不行', () => {
    expect(checkCamps(CAMPS, [{ col: 6, row: 0 }]).bad['6,0']).toContain('land');
    expect(checkCamps(CAMPS, [{ col: 2, row: 1 }]).bad['2,1']).toContain('village');
    const crowd = checkCamps(CAMPS, [{ col: 5, row: 0 }, { col: 5, row: 1 }]);
    expect(crowd.bad['5,0']).toContain('crowd');
    const far = checkCamps(CAMPS, [{ col: 5, row: 0 }, { col: 7, row: 0 }, { col: 2, row: 2 }, { col: 6, row: 4 }]);
    expect(far.ok).toBe(false);
  });
  it('左邊有水的空地是陷阱：沒辦法跟其他營盤連成一群', () => {
    const s = campSolutions(CAMPS, 100);
    expect(s.every((x) => x.every((c) => c.col >= 4))).toBe(true);
  });
});

describe('開水埤', () => {
  it('有解，而且只有一種做法', () => {
    const s = pondSolutions(POND);
    expect(s).toEqual([{ cells: 4, rice: 1, potato: 3 }]);
    expect(runPond(POND, 4, crops(1, 3)).ok).toBe(true);
  });
  it('全部種稻、埤挖最大、埤挖太小都不行', () => {
    expect(runPond(POND, 2, crops(6, 0)).ok).toBe(false);
    expect(runPond(POND, 5, crops(1, 2)).ok).toBe(false);
    const small = runPond(POND, 2, crops(2, 0));
    expect(small.ok).toBe(false);
    expect(small.steps[1].spill).toBeGreaterThan(0); // 梅雨的水滿出來流掉
  });
  it('人手不夠就不能做', () => {
    expect(runPond(POND, 5, crops(2, 2)).tooMany).toBe(true);
  });
});

describe('曬鹽', () => {
  it('12 天最多收得到目標以上，示範的做法照跑也收得到', () => {
    const best = saltBest(SALT);
    expect(best.salt).toBeGreaterThanOrEqual(SALT.need);
    expect(saltRun(SALT, best.plan)!.salt).toBe(best.salt);
  });
  it('雨天沒蓋：蒸發池重曬、結晶池的鹽被沖掉；蓋了就沒事', () => {
    const p = { e: [2, -1], c: 0, salt: 0 };
    const r = weather('rain', p, -1);
    expect(r.pans.e[0]).toBe(0);
    expect(r.pans.c).toBe(-1);
    expect(weather('rain', p, 2).pans.c).toBe(0);
  });
  it('只會「能收就收、能裝就裝」不蓋草蓆，收不到 4 籃', () => {
    let p = freshPans();
    for (const sky of SALT.days) {
      const acts: SaltAct[] = [{ kind: 'harvest' }, { kind: 'move', pan: 0 }, { kind: 'move', pan: 1 }, { kind: 'fill', pan: 0 }, { kind: 'fill', pan: 1 }];
      let n = 0;
      for (const a of acts) if (n < SALT.hands && canDo(SALT, p, a)) { p = doAct(p, a); n++; }
      p = weather(sky, p, -1).pans;
    }
    expect(p.salt).toBeLessThan(SALT.need);
  });
  it('從半路開始也算得出建議', () => {
    const mid = saltBest(SALT, 4, { e: [0, 0], c: -1, salt: 1 });
    expect(mid.plan.length).toBe(SALT.days.length - 4);
  });
});

describe('曬鹽（故事版）', () => {
  it('看天氣做得到目標以上，而且還有餘裕', () => {
    const best = saltEasyBest(SALT_EASY);
    expect(best.salt).toBeGreaterThanOrEqual(SALT_EASY.need + 1);
    expect(saltEasyRun(SALT_EASY, best.plan)).toBe(best.salt);
  });
  it('小蓮示範第一天（引海水進第一格）以後，還是收得到目標', () => {
    const d0 = easyDay(SALT_EASY, freshEasy(SALT_EASY), { kind: 'fill', pan: 0 }, false, 0);
    expect(saltEasyBest(SALT_EASY, 1, d0.pans).salt).toBeGreaterThanOrEqual(SALT_EASY.need);
  });
  it('不看天氣、從來不蓋草蓆，收不到目標', () => {
    expect(saltEasyBest(SALT_EASY, 0, undefined, true).salt).toBeLessThan(SALT_EASY.need);
    let p = freshEasy(SALT_EASY);
    for (let d = 0; d < SALT_EASY.days.length; d++) {
      const i = p.v.findIndex((x) => x >= SALT_EASY.ready), j = p.v.findIndex((x) => x < 0);
      const a: EasyAct = i >= 0 ? { kind: 'harvest', pan: i } : j >= 0 ? { kind: 'fill', pan: j } : { kind: 'wait' };
      p = easyDay(SALT_EASY, p, a, false, d).pans;
    }
    expect(p.salt).toBeLessThan(SALT_EASY.need);
  });
  it('雨天蓋草蓆就沒事；晴天蓋著曬不到', () => {
    const p = { v: [2, -1, -1], salt: 0 };
    const rain = SALT_EASY.days.indexOf('rain'), sun = SALT_EASY.days.indexOf('sun');
    expect(easyDay(SALT_EASY, p, { kind: 'wait' }, false, rain).pans.v[0]).toBe(-1);
    expect(easyDay(SALT_EASY, p, { kind: 'wait' }, true, rain).pans.v[0]).toBe(2);
    expect(easyDay(SALT_EASY, p, { kind: 'wait' }, true, sun).pans.v[0]).toBe(2);
    expect(easyDay(SALT_EASY, p, { kind: 'wait' }, false, sun).pans.v[0]).toBe(3);
  });
});

describe('孔廟配置', () => {
  it('全部放對才算完成，放錯會被指出來', () => {
    expect(checkTemple(TEMPLE, TEMPLE.answer).done).toBe(true);
    const r = checkTemple(TEMPLE, { ...TEMPLE.answer, school: { col: 0, row: 0 } });
    expect(r.done).toBe(false);
    expect(r.wrong).toEqual(['school']);
  });
});

describe('存糧規劃', () => {
  it('有解，解法不多', () => {
    const s = grainSolutions(GRAIN);
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(6);
    expect(runGrain(GRAIN, s[0]).ok).toBe(true);
  });
  it('什麼都不開、每年都開最多，都不行', () => {
    expect(runGrain(GRAIN, [0, 0, 0, 0, 0]).ok).toBe(false);
    const all = runGrain(GRAIN, [3, 3, 3, 3, 3]);
    expect(all.ok).toBe(false);
    expect(all.brokeAt).toBe(1);
  });
  it('颱風那年收成剩一半', () => {
    expect(runGrain(GRAIN, [0, 0, 0, 0, 0]).years[2].harvest).toBe(3);
  });
});

describe('第四章存檔', () => {
  it('星星與雲端合併（選擇跟著比較完整的那份）', () => {
    expect(stars4({ ...fresh4(), mistakes: 1, answers: [1, 0, 2] }, [1, 0, 2])).toBe(3);
    const m = pickProgress4({ ...fresh4(), cards: ['koxinga'] }, { ...fresh4(), reached: 3, cards: ['chen'], picks: { land: 1 } });
    expect(m.reached).toBe(3);
    expect(m.picks.land).toBe(1);
    expect(m.cards.sort()).toEqual(['chen', 'koxinga']);
  });
});
