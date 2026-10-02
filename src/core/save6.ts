// 第六章《開港與鐵路》的進度，存在這台平板（一人一格）；有登入就同步到雲端的 ch6 那格。
// 讀不到或格式不對就從頭開始，不會讓遊戲壞掉。

import { keyFor } from './owner';
import type { Picks6 } from '../data/ch6';

export type Step6 = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const LAST6: Step6 = 6;

export interface Progress6 {
  v: 1;
  step: Step6;
  reached: Step6;
  cards: string[];
  mistakes: number; // 擱淺、茶發霉、鐵軌用完、看錯病人、撞車加起來
  answers: number[];
  stars: number;
  done: boolean;
  note: boolean; // 找到神秘旅人的紙條（第六章沒有，留著讓格式一樣）
  friends: string[];
  keepsakes: string[];
  picks: Picks6; // 四個選擇（data/ch6.ts CHOICES6）
}

export const fresh6 = (): Progress6 => ({
  v: 1, step: 0, reached: 0, cards: [], mistakes: 0, answers: [], stars: 0, done: false, note: false, friends: [], keepsakes: [], picks: {},
});

const KEY = 'island.ch6.v1';

export function load6(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Progress6 {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return fresh6();
    const p = JSON.parse(raw) as Partial<Progress6>;
    return p.v === 1 ? { ...fresh6(), ...p } : fresh6();
  } catch {
    return fresh6();
  }
}

export function save6(p: Progress6, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(keyFor(KEY), JSON.stringify(p));
  } catch {
    /* 存不了就算了，遊戲照玩 */
  }
}

export const goTo6 = (p: Progress6, step: Step6): Progress6 => ({ ...p, step, reached: Math.max(p.reached, step) as Step6 });

export const addCard6 = (p: Progress6, ...ids: string[]): Progress6 => {
  const more = ids.filter((id) => !p.cards.includes(id));
  return more.length ? { ...p, cards: [...p.cards, ...more] } : p;
};

// 三顆星：過關、失誤 3 次以內、反思題全對
export function stars6(p: Progress6, correct: readonly number[]): number {
  const allRight = correct.length > 0 && correct.every((a, i) => p.answers[i] === a);
  return 1 + (p.mistakes <= 3 ? 1 : 0) + (allRight ? 1 : 0);
}

// 本機和雲端用哪一份：比誰玩得遠，拿過的卡、信物、最好的星星合在一起
const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((x) => !a.includes(x))];
export function pickProgress6(local: Progress6, cloud: Partial<Progress6> | null | undefined): Progress6 {
  if (!cloud || cloud.v !== 1) return local;
  const c: Progress6 = { ...fresh6(), ...cloud };
  const score = (p: Progress6) => (p.done ? 100 : 0) + p.reached;
  const best = score(c) > score(local) ? c : local;
  const other = best === c ? local : c;
  return { ...best, picks: { ...other.picks, ...best.picks }, cards: union(best.cards, other.cards), friends: union(best.friends, other.friends), keepsakes: union(best.keepsakes, other.keepsakes), stars: Math.max(local.stars, c.stars) };
}
