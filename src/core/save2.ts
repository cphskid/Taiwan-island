// 第二章《山林與部落》的進度，存在這台平板（一人一格）；有登入就同步到雲端的 ch2 那格。
// 讀不到或格式不對就從頭開始，不會讓遊戲壞掉。

import { keyFor } from './owner';

export type Step2 = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const LAST2: Step2 = 6;

export interface Progress2 {
  v: 1;
  step: Step2;
  reached: Step2;
  cards: string[];
  mistakes: number; // 田不夠吃、鹿變少、生活曆放錯加起來
  answers: number[];
  stars: number;
  done: boolean;
  note: boolean; // 找到神秘旅人的紙條（第二章沒有，留著讓格式一樣）
  friends: string[];
  keepsakes: string[];
  picks: Partial<Record<'seed' | 'fawn' | 'trader', number>>; // 三個選擇（data/ch2.ts CHOICES2）
}

export const fresh2 = (): Progress2 => ({
  v: 1, step: 0, reached: 0, cards: [], mistakes: 0, answers: [], stars: 0, done: false, note: false, friends: [], keepsakes: [], picks: {},
});

const KEY = 'island.ch2.v1';

export function load2(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Progress2 {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return fresh2();
    const p = JSON.parse(raw) as Partial<Progress2>;
    return p.v === 1 ? { ...fresh2(), ...p } : fresh2();
  } catch {
    return fresh2();
  }
}

export function save2(p: Progress2, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(keyFor(KEY), JSON.stringify(p));
  } catch {
    /* 存不了就算了，遊戲照玩 */
  }
}

export const goTo2 = (p: Progress2, step: Step2): Progress2 => ({ ...p, step, reached: Math.max(p.reached, step) as Step2 });

export const addCard2 = (p: Progress2, ...ids: string[]): Progress2 => {
  const more = ids.filter((id) => !p.cards.includes(id));
  return more.length ? { ...p, cards: [...p.cards, ...more] } : p;
};

// 三顆星：過關、失誤 3 次以內、反思題全對
export function stars2(p: Progress2, correct: readonly number[]): number {
  const allRight = correct.length > 0 && correct.every((a, i) => p.answers[i] === a);
  return 1 + (p.mistakes <= 3 ? 1 : 0) + (allRight ? 1 : 0);
}

// 本機和雲端用哪一份：比誰玩得遠，拿過的卡、信物、最好的星星合在一起
const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((x) => !a.includes(x))];
export function pickProgress2(local: Progress2, cloud: Partial<Progress2> | null | undefined): Progress2 {
  if (!cloud || cloud.v !== 1) return local;
  const c: Progress2 = { ...fresh2(), ...cloud };
  const score = (p: Progress2) => (p.done ? 100 : 0) + p.reached;
  const best = score(c) > score(local) ? c : local;
  const other = best === c ? local : c;
  return { ...best, cards: union(best.cards, other.cards), friends: union(best.friends, other.friends), keepsakes: union(best.keepsakes, other.keepsakes), stars: Math.max(local.stars, c.stars) };
}
