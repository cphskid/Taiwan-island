import { describe, expect, it } from 'vitest';
import { CARD_ORDER, SPOTS } from '../data/postcard';
import { freshPost, MSG_MAX, pickPost, postDone, send } from './postcard';
import sql from '../../supabase/island_pioneer.sql?raw';

describe('景點明信片', () => {
  it('每個景點四張卡都有字、對策剛好一個對，代號跟資料庫一樣', () => {
    for (const s of SPOTS) {
      for (const k of CARD_ORDER) expect(s.cards[k].length, `${s.id} ${k}`).toBeGreaterThan(8);
      expect(s.plans.filter((p) => p.ok).length, s.id).toBe(1);
      expect(s.msgs.length).toBeGreaterThan(0);
    }
    expect(sql).toContain(`array[${SPOTS.map((s) => `'${s.id}'`).join(', ')}]`);
  });
  it('同一個景點再寄，留最新的一張；話太長會截掉', () => {
    let s = send(freshPost(), { spot: 'taroko', plan: 'a', msg: '  第一張 ', at: '2026-10-01' });
    expect(postDone(s)).toBe(true);
    expect(s.sent[0].msg).toBe('第一張');
    s = send(s, { spot: 'taroko', plan: 'a', msg: 'x'.repeat(200), at: '2026-10-02' });
    expect(s.sent.length).toBe(1);
    expect(s.sent[0].msg.length).toBe(MSG_MAX);
  });
  it('換平板：合在一起，比較新的贏，亂寫的景點不算', () => {
    const local = send(freshPost(), { spot: 'market', plan: 'a', msg: '舊的', at: '2026-10-01' });
    const got = pickPost(local, { v: 1, sent: [{ spot: 'market', plan: 'b', msg: '新的', at: '2026-10-03' }, { spot: 'mars', plan: 'b', msg: '?', at: '2026-10-03' }, { spot: 'tower', plan: 'c', msg: '101', at: '2026-10-02' }] });
    expect(got.sent.map((x) => [x.spot, x.msg])).toEqual([['market', '新的'], ['tower', '101']]);
  });
});
