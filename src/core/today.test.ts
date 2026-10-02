import { describe, expect, it } from 'vitest';
import { allPlaced, bestStops, cellKey, everyonePlans, findCell, plurality, railRun, railSolve, vote, wrongPlaces, type Cell } from './today';
import { EXHIBITS, EXHIBIT_SHUFFLE, FIRST_VOTE, PINS, RAIL, RAIL_NAMES, TENS } from '../data/chEnd';
import { freshEnd, glanceChapter, loadEnd, pickProgressEnd, saveEnd, starsEnd } from './saveEnd';

const kindAnswer = Object.fromEntries(TENS.map((t) => [t.id, t.kind]));
const pinAnswer = Object.fromEntries(TENS.map((t) => [t.id, t.pin]));

describe('十大建設', () => {
  it('六項交通、三項重工業、一項能源', () => {
    const n = (k: string) => TENS.filter((t) => t.kind === k).length;
    expect([n('traffic'), n('industry'), n('energy')]).toEqual([6, 3, 1]);
  });
  it('示範解法全對；全部丟進交通會錯四項', () => {
    expect(wrongPlaces(kindAnswer, kindAnswer)).toEqual([]);
    const lazy = Object.fromEntries(TENS.map((t) => [t.id, 'traffic']));
    expect(wrongPlaces(kindAnswer, lazy)).toHaveLength(4);
  });
  it('每一項都有地圖上的釘子；全部放高雄會錯七項', () => {
    for (const t of TENS) expect(PINS.some((p) => p.id === t.pin)).toBe(true);
    expect(wrongPlaces(pinAnswer, pinAnswer)).toEqual([]);
    const lazy = Object.fromEntries(TENS.map((t) => [t.id, 'kaohsiung']));
    expect(wrongPlaces(pinAnswer, lazy)).toHaveLength(7);
  });
  it('還沒放完不算放好', () => {
    expect(allPlaced(['a', 'b'], { a: 'x' })).toBe(false);
    expect(wrongPlaces({ a: 'x' }, {})).toEqual(['a']);
  });
});

describe('高鐵路線', () => {
  const T = findCell(RAIL, 'T'), K = findCell(RAIL, 'K');
  it('有解：最快的路線在 90 分鐘內，而且守全部的規則', () => {
    const s = railSolve(RAIL)!;
    expect(s).not.toBeNull();
    expect(s.minutes).toBeLessThanOrEqual(RAIL.limit);
    const r = railRun(RAIL, s.path, s.stops);
    expect(r.ok).toBe(true);
    expect(s.stops).toContain(cellKey(findCell(RAIL, 'C')));
    // 每一站都在有名字的城市
    for (const k of s.stops) expect(RAIL_NAMES[k]).toBeTruthy();
  });
  it('規則太鬆（不限時間）時最快也要 80 分鐘以上，90 分鐘不是隨便就達成', () => {
    expect(railSolve(RAIL)!.minutes).toBeGreaterThanOrEqual(80);
  });
  it('每個城市都停會太近或太慢', () => {
    const s = railSolve(RAIL)!;
    const all = s.path.filter((c, i) => i > 0 && i < s.path.length - 1 && 'cC'.includes(RAIL.rows[c.row][c.col])).map(cellKey);
    const r = railRun(RAIL, s.path, all);
    expect(r.ok).toBe(false);
  });
  it('不停台中不行', () => {
    const s = railSolve(RAIL)!;
    const r = railRun(RAIL, s.path, s.stops.filter((k) => k !== cellKey(findCell(RAIL, 'C'))));
    expect(r.problems).toContain('mustStop');
  });
  it('穿過山或濕地、斷掉、沒到高雄都會被抓到', () => {
    const straight: Cell[] = Array.from({ length: K.row + 1 }, (_, row) => ({ col: 2, row }));
    expect(railRun(RAIL, straight, []).problems).toContain('blocked');
    expect(railRun(RAIL, [T, { col: 2, row: 3 }], []).problems).toEqual(expect.arrayContaining(['broken', 'end']));
  });
  it('繞遠路會超過 90 分鐘', () => {
    // 沿著最左邊能走的地方繞來繞去
    const s = railSolve(RAIL)!;
    const detour = [...s.path];
    const r = railRun(RAIL, detour, s.stops);
    expect(r.ok).toBe(true);
    const slowLv = { ...RAIL, limit: s.minutes - 1 };
    expect(railRun(slowLv, s.path, s.stops).problems).toContain('slow');
  });
  it('bestStops 在不可能的路線上回傳 null', () => {
    expect(bestStops(RAIL, [T])).toBeNull();
  });
});

describe('一起做決定', () => {
  it('舉手表決：公園最多票，可是超過一半的人沒選它', () => {
    const r = plurality(FIRST_VOTE);
    expect(r.win).toBe('park');
    expect(r.share).toBeLessThan(0.5);
    expect(r.against).toBe(15);
  });
  it('只有一個方案讓五組都接受', () => {
    expect(everyonePlans()).toEqual([['park', 'parking', 'market', 'park']]);
    expect(vote(['park', 'parking', 'market', 'park']).everyone).toBe(true);
  });
  it('全部蓋公園：沒過半數', () => {
    const r = vote(['park', 'park', 'park', 'park']);
    expect(r.passed).toBe(false);
    expect(r.everyone).toBe(false);
  });
  it('過半數但不是大家都接受的方案存在（要再協商）', () => {
    const r = vote(['park', 'parking', 'park', 'park']);
    expect(r.passed).toBe(true);
    expect(r.everyone).toBe(false);
    expect(r.no).toEqual(expect.arrayContaining(['vendors']));
  });
  it('還沒排滿不能投票', () => {
    expect(vote(['park', null, 'market', 'park']).yes).toEqual([]);
  });
});

describe('時光博物館', () => {
  const answer = Object.fromEntries(EXHIBITS.map((e, i) => [e.id, String(i)]));
  it('九個時代各一樣，打亂的順序不是答案', () => {
    expect(EXHIBITS).toHaveLength(9);
    expect([...EXHIBIT_SHUFFLE].sort()).toEqual(EXHIBITS.map((e) => e.id).sort());
    const shuffled = Object.fromEntries(EXHIBIT_SHUFFLE.map((id, i) => [id, String(i)]));
    expect(wrongPlaces(answer, shuffled).length).toBeGreaterThan(5);
  });
  it('照時代排就全對', () => {
    expect(wrongPlaces(answer, answer)).toEqual([]);
  });
});

describe('終章存檔', () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
  it('存了讀得回來，壞掉的從頭開始', () => {
    const s = mem();
    saveEnd({ ...freshEnd(), step: 3, picks: { speak: 1 } }, s);
    expect(loadEnd(s).picks.speak).toBe(1);
    s.setItem('island.end.v1', '{壞掉');
    expect(loadEnd(s).step).toBe(0);
  });
  it('雲端合併保留選擇和揭曉', () => {
    const a = { ...freshEnd(), reached: 5 as const, picks: { ride: 0 } };
    const c = { ...freshEnd(), reached: 2 as const, picks: { word: 1 }, revealed: true };
    const m = pickProgressEnd(a, c);
    expect(m.picks).toEqual({ ride: 0, word: 1 });
    expect(m.revealed).toBe(true);
  });
  it('星星：過關、失誤少、全答對', () => {
    expect(starsEnd({ ...freshEnd(), answers: [0, 1, 2] }, [0, 1, 2])).toBe(3);
    expect(starsEnd({ ...freshEnd(), mistakes: 9 }, [0, 1, 2])).toBe(1);
  });
  it('讀別章存檔：沒有就是 null，有就拿信物', () => {
    const s = mem();
    expect(glanceChapter('ch3', s)).toBeNull();
    s.setItem('island.ch3.v1', JSON.stringify({ v: 1, done: true, keepsakes: ['x', 3], friends: ['fu'] }));
    expect(glanceChapter('ch3', s)).toEqual({ done: true, keepsakes: ['x'], friends: ['fu'] });
  });
});
