// 終章《今天的島嶼》的進度，存在這台平板（一人一格）；有登入就同步到雲端的 end 那格。
// 讀不到或格式不對就從頭開始，不會讓遊戲壞掉。

import { keyFor } from './owner';

export type StepEnd = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const LAST_END: StepEnd = 6;

export interface ProgressEnd {
  v: 1;
  step: StepEnd;
  reached: StepEnd;
  cards: string[];
  mistakes: number; // 十大建設放錯、高鐵路線不行、方案沒讓大家接受、時間軸排錯加起來
  answers: number[];
  stars: number;
  done: boolean;
  note: boolean; // 在鐘塔門上撿到神秘旅人的最後一張紙條
  friends: string[];
  keepsakes: string[];
  picks: Partial<Record<'ride' | 'speak' | 'park' | 'word', number>>; // 四個選擇（data/chEnd.ts CHOICES_END）
  revealed: boolean; // 看過旅人摘下斗笠
}

export const freshEnd = (): ProgressEnd => ({
  v: 1, step: 0, reached: 0, cards: [], mistakes: 0, answers: [], stars: 0, done: false, note: false, friends: [], keepsakes: [], picks: {}, revealed: false,
});

const KEY = 'island.end.v1';

export function loadEnd(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): ProgressEnd {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return freshEnd();
    const p = JSON.parse(raw) as Partial<ProgressEnd>;
    return p.v === 1 ? { ...freshEnd(), ...p } : freshEnd();
  } catch {
    return freshEnd();
  }
}

export function saveEnd(p: ProgressEnd, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(keyFor(KEY), JSON.stringify(p));
  } catch {
    /* 存不了就算了，遊戲照玩 */
  }
}

export const goToEnd = (p: ProgressEnd, step: StepEnd): ProgressEnd => ({ ...p, step, reached: Math.max(p.reached, step) as StepEnd });

export const addCardEnd = (p: ProgressEnd, ...ids: string[]): ProgressEnd => {
  const more = ids.filter((id) => !p.cards.includes(id));
  return more.length ? { ...p, cards: [...p.cards, ...more] } : p;
};

// 三顆星：過關、失誤 3 次以內、反思題全對
export function starsEnd(p: ProgressEnd, correct: readonly number[]): number {
  const allRight = correct.length > 0 && correct.every((a, i) => p.answers[i] === a);
  return 1 + (p.mistakes <= 3 ? 1 : 0) + (allRight ? 1 : 0);
}

// 本機和雲端用哪一份：比誰玩得遠，拿過的卡、信物、最好的星星合在一起
const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((x) => !a.includes(x))];
export function pickProgressEnd(local: ProgressEnd, cloud: Partial<ProgressEnd> | null | undefined): ProgressEnd {
  if (!cloud || cloud.v !== 1) return local;
  const c: ProgressEnd = { ...freshEnd(), ...cloud };
  const score = (p: ProgressEnd) => (p.done ? 100 : 0) + p.reached;
  const best = score(c) > score(local) ? c : local;
  const other = best === c ? local : c;
  return { ...best, picks: { ...other.picks, ...best.picks }, revealed: best.revealed || other.revealed, cards: union(best.cards, other.cards), friends: union(best.friends, other.friends), keepsakes: union(best.keepsakes, other.keepsakes), stars: Math.max(local.stars, c.stars) };
}

// 讀別章的存檔（只看過關、信物、時光朋友）。第三、四、六、七章還在做，讀不到就當沒玩過。
export interface ChapterGlance { done: boolean; keepsakes: string[]; friends: string[] }
export function glanceChapter(id: string, store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): ChapterGlance | null {
  try {
    const raw = store?.getItem(keyFor(`island.${id}.v1`));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ChapterGlance>;
    const list = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);
    return { done: !!p.done, keepsakes: list(p.keepsakes), friends: list(p.friends) };
  } catch {
    return null;
  }
}
