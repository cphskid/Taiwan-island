import { describe, expect, it } from 'vitest';
import { CASES, DISTRICTS, PLACES } from '../data/town';
import { cluesOf } from '../ui/Town';
import { districtStars, freshTown, loadTown, pickTown, solve, townCleared } from './town';
import sql from '../../supabase/island_pioneer.sql?raw';

const have = new Set(Object.keys(import.meta.glob('/public/img/town/*.webp')));

describe('規則小鎮的案子', () => {
  it('每一案都有線索、恰好一個對的處理方法、圖都在', () => {
    for (const c of CASES) {
      const clues = cluesOf(c);
      expect(clues.length, c.id).toBeGreaterThanOrEqual(3);
      expect(new Set(clues.map((k) => k.id)).size, c.id).toBe(clues.length);
      expect(c.handle.filter((h) => h.ok).length, c.id).toBe(1);
      expect(have.has(`/public/img/town/${c.client.art}.webp`), c.client.art).toBe(true);
      for (const sp of c.spots ?? []) {
        expect(have.has(`/public/img/town/${sp.art}.webp`), sp.art).toBe(true);
        expect(PLACES[sp.at]).toBeTruthy();
      }
      if (c.law) expect(c.law.pick).toContain(c.law.answer);
      if (c.norm === 'law') expect(c.law, c.id).toBeTruthy();
    }
  });
  it('案子代號不重複，而且跟資料庫算時光幣的清單一樣', () => {
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
    for (const d of DISTRICTS) expect(sql).toContain(`('${d.id}', array[${d.cases.map((c) => `'${c.id}'`).join(', ')}])`);
  });
  it('大街四種規範都有', () => {
    expect(new Set(DISTRICTS[0].cases.map((c) => c.norm)).size).toBe(4);
  });
});

describe('規則小鎮的進度', () => {
  const street = DISTRICTS[0];
  it('解完 3 案一顆星、一次判對越多星越多', () => {
    let s = freshTown();
    s = solve(s, 'karaoke', false); s = solve(s, 'seat', false);
    expect(districtStars(s, street)).toBe(0);
    s = solve(s, 'moon', true);
    expect(districtStars(s, street)).toBe(1);
    s = solve(s, 'karaoke', true);
    expect(districtStars(s, street)).toBe(2);
    s = solve(solve(solve(s, 'seat', true), 'temple', true), 'moon', false);
    expect(districtStars(s, street)).toBe(3);
  });
  it('再挑戰沒判對，不會把一次判對蓋掉', () => {
    const s = solve(solve(freshTown(), 'seat', true), 'seat', false);
    expect(s.solved.seat).toBe(2);
  });
  it('三區都過關才算小鎮過關', () => {
    let s = freshTown();
    for (const d of DISTRICTS) for (const c of d.cases.slice(0, 3)) s = solve(s, c.id, false);
    expect(townCleared(s)).toBe(true);
  });
  it('換平板：每案留比較好的', () => {
    const local = solve(solve(freshTown(), 'seat', true), 'moon', false);
    const got = pickTown(local, { v: 1, solved: { moon: 2, seat: 1, beer: 1 } });
    expect(got.solved).toEqual({ seat: 2, moon: 2, beer: 1 });
  });
  it('存檔壞掉從頭來', () => {
    expect(loadTown({ getItem: () => '{bad' }).solved).toEqual({});
  });
});
