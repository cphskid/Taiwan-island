// 第七章《縱貫與大圳》的進度，存在這台平板（一人一格）；有登入就同步到雲端的 ch7 那格。
// 讀不到或格式不對就從頭開始，不會讓遊戲壞掉。

import { keyFor } from './owner';

export type Step7 = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const LAST7: Step7 = 6;

export interface Progress7 {
  v: 1;
  step: Step7;
  reached: Step7;
  cards: string[];
  mistakes: number; // 車廂掛錯、大壩漏水、水不夠、水管漏水、水門開錯加起來
  answers: number[];
  stars: number;
  done: boolean;
  note: boolean; // 神秘旅人的紙條（第七章沒有，留著讓格式一樣）
  friends: string[];
  keepsakes: string[];
  picks: Partial<Record<'speak' | 'rice' | 'shao', number>>; // 三個選擇（data/ch7.ts CHOICES7）
}

export const fresh7 = (): Progress7 => ({
  v: 1, step: 0, reached: 0, cards: [], mistakes: 0, answers: [], stars: 0, done: false, note: false, friends: [], keepsakes: [], picks: {},
});

const KEY = 'island.ch7.v1';

export function load7(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Progress7 {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return fresh7();
    const p = JSON.parse(raw) as Partial<Progress7>;
    return p.v === 1 ? { ...fresh7(), ...p } : fresh7();
  } catch {
    return fresh7();
  }
}

export function save7(p: Progress7, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(keyFor(KEY), JSON.stringify(p));
  } catch {
    /* 存不了就算了，遊戲照玩 */
  }
}

export const goTo7 = (p: Progress7, step: Step7): Progress7 => ({ ...p, step, reached: Math.max(p.reached, step) as Step7 });

export const addCard7 = (p: Progress7, ...ids: string[]): Progress7 => {
  const more = ids.filter((id) => !p.cards.includes(id));
  return more.length ? { ...p, cards: [...p.cards, ...more] } : p;
};

// 三顆星：過關、失誤 3 次以內、反思題全對
export function stars7(p: Progress7, correct: readonly number[]): number {
  const allRight = correct.length > 0 && correct.every((a, i) => p.answers[i] === a);
  return 1 + (p.mistakes <= 3 ? 1 : 0) + (allRight ? 1 : 0);
}

// 本機和雲端用哪一份：比誰玩得遠，拿過的卡、信物、最好的星星合在一起
const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((x) => !a.includes(x))];
export function pickProgress7(local: Progress7, cloud: Partial<Progress7> | null | undefined): Progress7 {
  if (!cloud || cloud.v !== 1) return local;
  const c: Progress7 = { ...fresh7(), ...cloud };
  const score = (p: Progress7) => (p.done ? 100 : 0) + p.reached;
  const best = score(c) > score(local) ? c : local;
  const other = best === c ? local : c;
  return { ...best, cards: union(best.cards, other.cards), friends: union(best.friends, other.friends), keepsakes: union(best.keepsakes, other.keepsakes), stars: Math.max(local.stars, c.stars), picks: { ...other.picks, ...best.picks } };
}
