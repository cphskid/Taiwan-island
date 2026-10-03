// 第四章《東寧屯田》的進度，存在這台平板（一人一格）；有登入就同步到雲端的 ch4 那格。
// 讀不到或格式不對就從頭開始，不會讓遊戲壞掉。

import { keyFor } from './owner';

export type Step4 = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const LAST4: Step4 = 6;

export interface Progress4 {
  v: 1;
  step: Step4;
  reached: Step4;
  cards: string[];
  mistakes: number; // 營盤放錯、埤乾掉、鹽不夠、建築放錯、糧倉空掉加起來
  answers: number[];
  stars: number;
  done: boolean;
  note: boolean; // 神秘旅人的紙條（第四章沒有，留著讓格式一樣）
  friends: string[];
  keepsakes: string[];
  picks: Partial<Record<'land' | 'water' | 'school' | 'grain', number>>; // 四個選擇（data/ch4.ts CHOICES4）
}

export const fresh4 = (): Progress4 => ({
  v: 1, step: 0, reached: 0, cards: [], mistakes: 0, answers: [], stars: 0, done: false, note: false, friends: [], keepsakes: [], picks: {},
});

const KEY = 'island.ch4.v1';

export function load4(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Progress4 {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return fresh4();
    const p = JSON.parse(raw) as Partial<Progress4>;
    return p.v === 1 ? { ...fresh4(), ...p } : fresh4();
  } catch {
    return fresh4();
  }
}

export function save4(p: Progress4, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(keyFor(KEY), JSON.stringify(p));
  } catch {
    /* 存不了就算了，遊戲照玩 */
  }
}

export const goTo4 = (p: Progress4, step: Step4): Progress4 => ({ ...p, step, reached: Math.max(p.reached, step) as Step4 });

export const addCard4 = (p: Progress4, ...ids: string[]): Progress4 => {
  const more = ids.filter((id) => !p.cards.includes(id));
  return more.length ? { ...p, cards: [...p.cards, ...more] } : p;
};

// 三顆星：過關、失誤 3 次以內、反思題全對
export function stars4(p: Progress4, correct: readonly number[]): number {
  const allRight = correct.length > 0 && correct.every((a, i) => p.answers[i] === a);
  return 1 + (p.mistakes <= 3 ? 1 : 0) + (allRight ? 1 : 0);
}

// 本機和雲端用哪一份：比誰玩得遠，拿過的卡、信物、最好的星星合在一起
const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((x) => !a.includes(x))];
export function pickProgress4(local: Progress4, cloud: Partial<Progress4> | null | undefined): Progress4 {
  if (!cloud || cloud.v !== 1) return local;
  const c: Progress4 = { ...fresh4(), ...cloud };
  const score = (p: Progress4) => (p.done ? 100 : 0) + p.reached;
  const best = score(c) > score(local) ? c : local;
  const other = best === c ? local : c;
  return { ...best, cards: union(best.cards, other.cards), friends: union(best.friends, other.friends), keepsakes: union(best.keepsakes, other.keepsakes), stars: Math.max(local.stars, c.stars) };
}
