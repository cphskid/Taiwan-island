// 第一章《島嶼的第一道火光》的進度，存在這台平板（一人一格）；有登入就同步到雲端的 ch1 那格。
// 讀不到或格式不對就從頭開始，不會讓遊戲壞掉。

import { keyFor } from './owner';

export type Step1 = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const LAST1: Step1 = 6;

export interface Progress1 {
  v: 1;
  step: Step1;
  reached: Step1;
  cards: string[];
  mistakes: number; // 敲壞、燒裂、磨過頭、土石流加起來
  answers: number[];
  stars: number;
  done: boolean;
  note: boolean; // 考古坑裡撿到神秘旅人的紙條
  friends: string[];
  keepsakes: string[];
}

export const fresh1 = (): Progress1 => ({
  v: 1, step: 0, reached: 0, cards: [], mistakes: 0, answers: [], stars: 0, done: false, note: false, friends: [], keepsakes: [],
});

const KEY = 'island.ch1.v1';

export function load1(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Progress1 {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return fresh1();
    const p = JSON.parse(raw) as Partial<Progress1>;
    return p.v === 1 ? { ...fresh1(), ...p } : fresh1();
  } catch {
    return fresh1();
  }
}

export function save1(p: Progress1, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(keyFor(KEY), JSON.stringify(p));
  } catch {
    /* 存不了就算了，遊戲照玩 */
  }
}

export const goTo1 = (p: Progress1, step: Step1): Progress1 => ({ ...p, step, reached: Math.max(p.reached, step) as Step1 });

export const addCard1 = (p: Progress1, ...ids: string[]): Progress1 => {
  const more = ids.filter((id) => !p.cards.includes(id));
  return more.length ? { ...p, cards: [...p.cards, ...more] } : p;
};

// 三顆星：過關、失誤 3 次以內、反思題全對
export function stars1(p: Progress1, correct: readonly number[]): number {
  const allRight = correct.length > 0 && correct.every((a, i) => p.answers[i] === a);
  return 1 + (p.mistakes <= 3 ? 1 : 0) + (allRight ? 1 : 0);
}

// 本機和雲端用哪一份：比誰玩得遠，拿過的卡、信物、最好的星星合在一起
const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((x) => !a.includes(x))];
export function pickProgress1(local: Progress1, cloud: Partial<Progress1> | null | undefined): Progress1 {
  if (!cloud || cloud.v !== 1) return local;
  const c: Progress1 = { ...fresh1(), ...cloud };
  const score = (p: Progress1) => (p.done ? 100 : 0) + p.reached;
  const best = score(c) > score(local) ? c : local;
  const other = best === c ? local : c;
  return { ...best, cards: union(best.cards, other.cards), friends: union(best.friends, other.friends), keepsakes: union(best.keepsakes, other.keepsakes), stars: Math.max(local.stars, c.stars) };
}
