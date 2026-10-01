// 第五章的進度，先存在這台平板（localStorage）；P6-6 再接雲端。
//
// 讀不到或格式不對就從頭開始，不會讓遊戲壞掉。

export const STEPS = ['開場', '認識地形', '做竹蛇籠', '導水', '分水', '豐收'] as const;
export type Step = 0 | 1 | 2 | 3 | 4 | 5;

export interface Progress {
  v: 1;
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
}

export const CAGES_NEEDED = 6; // 三小關 1＋2＋3
export const CAGE_COST = { bamboo: 1, stone: 2 };

export function fresh(): Progress {
  return {
    v: 1, step: 0, reached: 0, revealed: [], found: [], cards: [], taken: [],
    bamboo: 0, stone: 0, cages: 0, level: 0, broken: 0, answers: [], stars: 0, done: false,
  };
}

const KEY = 'island.ch5.v1';

export function load(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Progress {
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Progress>;
    if (p.v !== 1) return fresh();
    return { ...fresh(), ...p };
  } catch {
    return fresh();
  }
}

export function save(p: Progress, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(KEY, JSON.stringify(p));
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
