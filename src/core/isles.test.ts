import { describe, expect, it } from 'vitest';
import { ISLES } from '../data/isles';
import { freshIsles, islesDone, km, pickIsles, stampIsle } from './isles';
import sql from '../../supabase/island_pioneer.sql?raw';

describe('離島巡航', () => {
  it('每座島的題目答案在選項裡、代號跟資料庫一樣', () => {
    for (const i of ISLES) expect(i.ask.options[i.ask.answer], i.id).toBeTruthy();
    expect(sql).toContain(`array[${ISLES.map((i) => `'${i.id}'`).join(', ')}]`);
  });
  it('郵戳蓋滿七座才算完成', () => {
    let s = freshIsles();
    for (const i of ISLES.slice(0, 6)) s = stampIsle(s, i.id);
    expect(islesDone(s)).toBe(false);
    s = stampIsle(stampIsle(s, ISLES[6].id), ISLES[6].id);
    expect(islesDone(s)).toBe(true);
    expect(s.stamps.length).toBe(7);
  });
  it('換平板：郵戳合在一起，亂寫的不算', () => {
    expect(pickIsles(stampIsle(freshIsles(), 'penghu'), { v: 1, stamps: ['lanyu', 'mars'] }).stamps).toEqual(['penghu', 'lanyu']);
  });
  it('金門離廈門近、離臺灣本島遠', () => {
    expect(km([118.35, 24.44], [118.13, 24.48])).toBeLessThan(30);
    expect(km([118.35, 24.44], [120.43, 24.2])).toBeGreaterThan(180);
  });
});
