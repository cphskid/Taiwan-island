// 第三章《大航海時代》的進度，存在這台平板（一人一格）；有登入就同步到雲端的 ch3 那格。
// 讀不到或格式不對就從頭開始，不會讓遊戲壞掉。

import { keyFor } from './owner';

export type Step3 = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const LAST3: Step3 = 6;

export interface Progress3 {
  v: 1;
  step: Step3;
  reached: Step3;
  cards: string[];
  mistakes: number; // 船擱淺、錢不夠、鹿變少、字讀錯、界線點錯、船排不出去加起來
  answers: number[];
  stars: number;
  done: boolean;
  note: boolean; // 找到神秘旅人的紙條（第三章沒有，留著讓格式一樣）
  friends: string[];
  keepsakes: string[];
  picks: Partial<Record<'honest' | 'deer' | 'deed' | 'mom', number>>; // 四個選擇（data/ch3.ts CHOICES3）
}

export const fresh3 = (): Progress3 => ({
  v: 1, step: 0, reached: 0, cards: [], mistakes: 0, answers: [], stars: 0, done: false, note: false, friends: [], keepsakes: [], picks: {},
});

const KEY = 'island.ch3.v1';

export function load3(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Progress3 {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return fresh3();
    const p = JSON.parse(raw) as Partial<Progress3>;
    return p.v === 1 ? { ...fresh3(), ...p } : fresh3();
  } catch {
    return fresh3();
  }
}

export function save3(p: Progress3, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(keyFor(KEY), JSON.stringify(p));
  } catch {
    /* 存不了就算了，遊戲照玩 */
  }
}

export const goTo3 = (p: Progress3, step: Step3): Progress3 => ({ ...p, step, reached: Math.max(p.reached, step) as Step3 });

export const addCard3 = (p: Progress3, ...ids: string[]): Progress3 => {
  const more = ids.filter((id) => !p.cards.includes(id));
  return more.length ? { ...p, cards: [...p.cards, ...more] } : p;
};

// 三顆星：過關、失誤 3 次以內、反思題全對
export function stars3(p: Progress3, correct: readonly number[]): number {
  const allRight = correct.length > 0 && correct.every((a, i) => p.answers[i] === a);
  return 1 + (p.mistakes <= 3 ? 1 : 0) + (allRight ? 1 : 0);
}

// 本機和雲端用哪一份：比誰玩得遠，拿過的卡、信物、最好的星星合在一起
const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((x) => !a.includes(x))];
export function pickProgress3(local: Progress3, cloud: Partial<Progress3> | null | undefined): Progress3 {
  if (!cloud || cloud.v !== 1) return local;
  const c: Progress3 = { ...fresh3(), ...cloud };
  const score = (p: Progress3) => (p.done ? 100 : 0) + p.reached;
  const best = score(c) > score(local) ? c : local;
  const other = best === c ? local : c;
  return { ...best, picks: { ...other.picks, ...best.picks }, cards: union(best.cards, other.cards), friends: union(best.friends, other.friends), keepsakes: union(best.keepsakes, other.keepsakes), stars: Math.max(local.stars, c.stars) };
}
