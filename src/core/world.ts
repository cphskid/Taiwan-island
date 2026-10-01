// 全台大地圖的規則：哪些章過關了、哪些還沒播過撥雲動畫、季節、小人沿路走到哪。
// 純函式，不碰畫面；畫面只照結果擺。
//
// 大地圖的進度跟章節分開存：章節「從頭再玩」不會讓撥開的雲霧又蓋回去。

import { keyFor } from './owner';

export interface Pt { x: number; y: number }

export interface WorldSave {
  v: 1;
  cleared: string[]; // 過關的章（撥開雲霧、長出建設、拿到齒輪）
  celebrated: string[]; // 已經在大地圖上看過撥雲動畫的章
  greeted: boolean; // 看過滴答第一次介紹大地圖
  cards: string[]; // 圖鑑：跨章累積拿過的卡（章節重玩也不會不見）
}

export const freshWorld = (): WorldSave => ({ v: 1, cleared: [], celebrated: [], greeted: false, cards: [] });

const KEY = 'island.world.v1';

export function loadWorld(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): WorldSave {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return freshWorld();
    const w = JSON.parse(raw) as Partial<WorldSave>;
    if (w.v !== 1) return freshWorld();
    return { ...freshWorld(), ...w, cleared: [...(w.cleared ?? [])], celebrated: [...(w.celebrated ?? [])], cards: [...(w.cards ?? [])] };
  } catch {
    return freshWorld();
  }
}

export function saveWorld(w: WorldSave, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(keyFor(KEY), JSON.stringify(w));
  } catch {
    /* 存不了就算了，遊戲照玩 */
  }
}

// 章節過關了就記進大地圖（只會加，不會拿掉）
export function markCleared(w: WorldSave, id: string): WorldSave {
  return w.cleared.includes(id) ? w : { ...w, cleared: [...w.cleared, id] };
}

// 把章節裡拿到的卡收進圖鑑（只會加）
export function addCards(w: WorldSave, ids: readonly string[]): WorldSave {
  const more = ids.filter((id) => !w.cards.includes(id));
  return more.length ? { ...w, cards: [...w.cards, ...more] } : w;
}

// 過關了、但還沒在大地圖上看過撥雲動畫的章
export const toCelebrate = (w: WorldSave) => w.cleared.filter((id) => !w.celebrated.includes(id));

export function celebrate(w: WorldSave, id: string): WorldSave {
  return w.celebrated.includes(id) ? w : { ...w, celebrated: [...w.celebrated, id] };
}

// 雲霧已經撥開（動畫播過）的章；正在播動畫的那一章還算蓋著，動畫才看得到雲散開
export const opened = (w: WorldSave) => w.cleared.filter((id) => w.celebrated.includes(id));

// 季節：phase 0～1 一輪。秧苗 → 綠稻 → 金黃 → 收割
export type Season = 'seedling' | 'growing' | 'golden' | 'harvest';
export function seasonAt(phase: number): Season {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.22) return 'seedling';
  if (p < 0.55) return 'growing';
  if (p < 0.85) return 'golden';
  return 'harvest';
}

// 稻田的樣子：綠稻與金黃兩張圖各多不透明（交叉淡入淡出），秧苗時綠的比較淡
export function paddyLook(phase: number): { green: number; gold: number } {
  const p = ((phase % 1) + 1) % 1;
  const ramp = (a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));
  if (p < 0.22) return { green: 0.35 + 0.65 * ramp(0, 0.22), gold: 0 };
  if (p < 0.5) return { green: 1, gold: 0 };
  if (p < 0.6) return { green: 1 - ramp(0.5, 0.6), gold: ramp(0.5, 0.6) };
  if (p < 0.85) return { green: 0, gold: 1 };
  return { green: 0.35 * ramp(0.85, 1), gold: 1 - ramp(0.85, 1) }; // 收割：金黃慢慢收掉、又插下秧苗
}

// 折線的總長
export function pathLength(path: readonly Pt[]): number {
  let L = 0;
  for (let i = 1; i < path.length; i++) L += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return L;
}

// 沿著折線走 d 這麼遠的位置
export function pointAlong(path: readonly Pt[], d: number): Pt {
  if (path.length === 1 || d <= 0) return { ...path[0] };
  let left = d;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= seg) {
      const k = seg ? left / seg : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    left -= seg;
  }
  return { ...path[path.length - 1] };
}

// 小人來回走：走到底停一下（rest 秒）再回頭。回傳位置、往左還是往右、是不是正在停
export function walker(path: readonly Pt[], speed: number, t: number, rest = 2): { at: Pt; left: boolean; resting: boolean } {
  const L = pathLength(path);
  if (L === 0 || speed <= 0) return { at: { ...path[0] }, left: false, resting: true };
  const leg = L / speed;
  const cycle = 2 * (leg + rest);
  const u = ((t % cycle) + cycle) % cycle;
  if (u < leg) {
    const at = pointAlong(path, u * speed);
    const ahead = pointAlong(path, Math.min(L, u * speed + 1));
    return { at, left: ahead.x < at.x, resting: false };
  }
  if (u < leg + rest) return { at: pointAlong(path, L), left: false, resting: true };
  if (u < 2 * leg + rest) {
    const d = L - (u - leg - rest) * speed;
    const at = pointAlong(path, d);
    const ahead = pointAlong(path, Math.max(0, d - 1));
    return { at, left: ahead.x < at.x, resting: false };
  }
  return { at: pointAlong(path, 0), left: false, resting: true };
}

// 拉遠只留幾個，拉近才全部出來：zoom 是目前放大倍數÷「放得下整張」的倍數
export function lodLevel(zoom: number): number {
  if (zoom < 1.6) return -1; // 太遠了，小人小到看不見，全部藏起來
  if (zoom < 2.4) return 0;
  if (zoom < 3.2) return 1;
  if (zoom < 4) return 2;
  return 3;
}

// 大地圖上離某一點最近、而且在 r 以內的東西
export function nearest<T extends { at: Pt }>(list: readonly T[], p: Pt, r: number): T | null {
  let best: T | null = null, bd = r;
  for (const it of list) {
    const d = Math.hypot(it.at.x - p.x, it.at.y - p.y);
    if (d <= bd) { bd = d; best = it; }
  }
  return best;
}
