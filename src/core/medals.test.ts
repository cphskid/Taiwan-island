import sql from '../../supabase/island_pioneer.sql?raw';
import { describe, expect, it } from 'vitest';
import { addMedal, CHALLENGES, endingKey, endingsSeen, freshMedals, loadMedals, mergeMedals, saveMedals } from './medals';
import { CARD_ORDER } from '../data/babao-chapter';
import { CARD_ORDER1 } from '../data/ch1';
import { CARD_ORDER2 } from '../data/ch2';
import { CARD_ORDER3 } from '../data/ch3';
import { CARD_ORDER4 } from '../data/ch4';
import { CARD_ORDER6 } from '../data/ch6';
import { CARD_ORDER7 } from '../data/ch7';
import { CARD_ORDER_END } from '../data/chEnd';


describe('成就勳章的紀錄', () => {
  it('一種選擇組合是一種結局，順序不影響', () => {
    expect(endingKey('ch2', { trader: 0, seed: 1, fawn: 0 })).toBe('ch2:fawn0-seed1-trader0');
    expect(endingKey('ch5', {})).toBeNull();
    expect(endingKey('pro', { done: 1 })).toBe('pro:done1');
  });

  it('只會加、本機和雲端合在一起', () => {
    let m = addMedal(freshMedals(), 'endings', 'ch2:a0');
    m = addMedal(m, 'endings', 'ch2:a0');
    m = addMedal(m, 'endings', 'ch3:a1');
    expect(m.endings).toEqual(['ch2:a0', 'ch3:a1']);
    expect(endingsSeen(m, 'ch2')).toBe(1);
    const both = mergeMedals(m, { v: 1, endings: ['ch2:a1'], chal: ['ch2:hunt'], eggs: ['ch5'] });
    expect(endingsSeen(both, 'ch2')).toBe(2);
    expect(both.chal).toEqual(['ch2:hunt']);
    expect(mergeMedals(m, null)).toBe(m);
  });

  it('壞掉的存檔從頭開始', () => {
    const store = new Map<string, string>();
    const s = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    store.set('island.medals.v1', '{oops');
    expect(loadMedals(s)).toEqual(freshMedals());
    saveMedals(addMedal(freshMedals(), 'eggs', 'ch1'), s);
    expect(loadMedals(s).eggs).toEqual(['ch1']);
  });

  it('樂園那邊的條件和遊戲對得上（圖鑑張數、⭐⭐⭐再挑戰）', () => {
    const cards: Record<string, number> = {
      ch1: CARD_ORDER1.length, ch2: CARD_ORDER2.length, ch3: CARD_ORDER3.length, ch4: CARD_ORDER4.length,
      ch5: CARD_ORDER.length, ch6: CARD_ORDER6.length, ch7: CARD_ORDER7.length, end: CARD_ORDER_END.length,
    };
    for (const [ch, n] of Object.entries(cards)) {
      const row = sql.match(new RegExp(`\\('${ch}', (\\d+), '\\{([^}]*)\\}'`));
      expect(row, ch).not.toBeNull();
      expect(Number(row![1]), `${ch} 圖鑑張數`).toBe(n);
      const need = row![2] ? row![2].split(',') : [];
      expect(need, `${ch} 再挑戰`).toEqual([...(CHALLENGES[ch as keyof typeof CHALLENGES] ?? [])]);
    }
  });
});
