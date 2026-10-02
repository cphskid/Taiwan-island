// 第五章的進度，存在這台平板（localStorage，一人一格）；有登入就同步到雲端（net/cloud.ts）。
//
// 讀不到或格式不對就從頭開始，不會讓遊戲壞掉。

import { keyFor } from './owner';

export const STEPS = ['開場', '認識地形', '做竹蛇籠', '導水', '分水', '洪水', '豐收'] as const;
export type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const LAST: Step = 6;

export interface Progress {
  v: 1;
  ver: 2; // 2026-10-02 加了「洪水」一步（舊存檔 ver 沒有＝豐收在第 5 步）
  step: Step; // 目前在第幾步
  reached: Step; // 玩到過最遠的一步
  revealed: string[]; // 撥開雲霧的格子 "col,row"
  found: string[]; // 找到的地點
  cards: string[]; // 拿到的圖鑑卡
  taken: string[]; // 砍過的竹林、撿過的石堆 "col,row"
  bamboo: number;
  stone: number;
  cages: number; // 做好、還沒用掉的竹蛇籠
  level: number; // 導水做到第幾小關（0～3）
  broken: number; // 被沖壞的竹蛇籠
  answers: number[]; // 反思題選了哪一個（-1 還沒答）
  stars: number;
  done: boolean;
  note: boolean; // 撿到神秘旅人的紙條了
  flood: boolean; // 洪水大謎題過了
  friends: string[]; // 這章交到的時光朋友（給樂園護照用）
  keepsakes: string[]; // 拿到的信物
}

export const CAGES_NEEDED = 6; // 三小關 1＋2＋3
export const CAGE_COST = { bamboo: 1, stone: 2 };

export function fresh(): Progress {
  return {
    v: 1, ver: 2, step: 0, reached: 0, revealed: [], found: [], cards: [], taken: [],
    bamboo: 0, stone: 0, cages: 0, level: 0, broken: 0, answers: [], stars: 0, done: false,
    note: false, flood: false, friends: [], keepsakes: [],
  };
}

const KEY = 'island.ch5.v1';

export function load(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Progress {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Progress>;
    if (p.v !== 1) return fresh();
    return migrate(p);
  } catch {
    return fresh();
  }
}

// 舊存檔（只有六步）：豐收從第 5 步搬到第 6 步；已經玩完的直接算到最後
export function migrate(p: Partial<Progress>): Progress {
  const out = { ...fresh(), ...p, ver: 2 as const };
  if (p.ver !== 2) {
    const up = (s: number | undefined) => ((s ?? 0) >= 5 ? 6 : s ?? 0) as Step;
    out.step = up(p.step);
    out.reached = up(p.reached);
    if (p.done) { out.step = LAST; out.reached = LAST; out.flood = true; }
  }
  return out;
}

export function save(p: Progress, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(keyFor(KEY), JSON.stringify(p));
  } catch {
    /* 私密瀏覽或空間滿了：這次不存，遊戲照玩 */
  }
}

// 往下一步走；reached 記最遠到哪
export function goTo(p: Progress, step: Step): Progress {
  return { ...p, step, reached: Math.max(p.reached, step) as Step };
}

export const canCraft = (p: Progress) => p.bamboo >= CAGE_COST.bamboo && p.stone >= CAGE_COST.stone;

export function craft(p: Progress): Progress {
  if (!canCraft(p)) return p;
  return { ...p, bamboo: p.bamboo - CAGE_COST.bamboo, stone: p.stone - CAGE_COST.stone, cages: p.cages + 1 };
}

// 三顆星：過關、竹蛇籠沒被沖壞、反思題全對
export function starsOf(p: Progress, correct: readonly number[]): number {
  const allRight = correct.length > 0 && correct.every((a, i) => p.answers[i] === a);
  return 1 + (p.broken === 0 ? 1 : 0) + (allRight ? 1 : 0);
}
