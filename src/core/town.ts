// 「規則小鎮」的進度：哪些案子結了、有沒有一次就判對（沒用提示、沒選錯）。
// 純函式，畫面在 ui/Town.tsx；存在這台平板（一人一格），有登入就同步到雲端的 town 那格。

import { keyFor } from './owner';
import { CLEAR_AT, DISTRICTS, type District } from '../data/town';

export interface TownSave {
  v: 1;
  intro: boolean; // 看過開場說明
  solved: Record<string, 1 | 2>; // 1＝結案、2＝一次就判對
}

export const freshTown = (): TownSave => ({ v: 1, intro: false, solved: {} });

export function solve(s: TownSave, id: string, perfect: boolean): TownSave {
  const v: 1 | 2 = perfect ? 2 : 1;
  return (s.solved[id] ?? 0) >= v ? s : { ...s, solved: { ...s.solved, [id]: v } };
}

// 一區的星星：解完 3 案 1 顆、其中 2 案一次判對 2 顆、全部案子都一次判對 3 顆
export function districtStars(s: TownSave, d: District): number {
  const done = d.cases.filter((c) => s.solved[c.id]).length;
  const perfect = d.cases.filter((c) => s.solved[c.id] === 2).length;
  if (done < Math.min(CLEAR_AT, d.cases.length)) return 0;
  return perfect >= d.cases.length ? 3 : perfect >= 2 ? 2 : 1;
}
export const districtCleared = (s: TownSave, d: District) => districtStars(s, d) > 0;
export const townCleared = (s: TownSave) => DISTRICTS.every((d) => districtCleared(s, d));
export const solvedCount = (s: TownSave) => Object.keys(s.solved).length;

const KEY = 'island.town.v1';
export function loadTown(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): TownSave {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return freshTown();
    const p = JSON.parse(raw) as Partial<TownSave>;
    return p.v === 1 ? { ...freshTown(), ...p, solved: { ...(p.solved ?? {}) } } : freshTown();
  } catch {
    return freshTown();
  }
}
// 換平板登入：兩份合在一起，每案留比較好的
export function pickTown(local: TownSave, cloud: Partial<TownSave> | null | undefined): TownSave {
  if (!cloud || cloud.v !== 1) return local;
  const solved = { ...local.solved };
  for (const [k, v] of Object.entries(cloud.solved ?? {})) if (v === 1 || v === 2) solved[k] = Math.max(solved[k] ?? 0, v) as 1 | 2;
  return { ...local, intro: local.intro || !!cloud.intro, solved };
}
export function saveTown(s: TownSave, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try { store?.setItem(keyFor(KEY), JSON.stringify(s)); } catch { /* 存不了就算了 */ }
}
