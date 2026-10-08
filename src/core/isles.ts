// 「離島巡航」的進度：蓋了哪些島的郵戳。純函式，畫面在 ui/Isles.tsx。
import { keyFor } from './owner';
import { ISLES } from '../data/isles';

export interface IslesSave { v: 1; intro: boolean; stamps: string[] }
export const freshIsles = (): IslesSave => ({ v: 1, intro: false, stamps: [] });
export const stampIsle = (s: IslesSave, id: string): IslesSave => (s.stamps.includes(id) ? s : { ...s, stamps: [...s.stamps, id] });
export const islesDone = (s: IslesSave) => ISLES.every((i) => s.stamps.includes(i.id));

// 兩點的距離（公里，經緯度）
export function km(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180, [lo1, la1] = a, [lo2, la2] = b;
  const h = Math.sin(((la2 - la1) * r) / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const KEY = 'island.isles.v1';
export function loadIsles(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): IslesSave {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return freshIsles();
    const p = JSON.parse(raw) as Partial<IslesSave>;
    return p.v === 1 ? { ...freshIsles(), ...p, stamps: [...(p.stamps ?? [])] } : freshIsles();
  } catch {
    return freshIsles();
  }
}
export function pickIsles(local: IslesSave, cloud: Partial<IslesSave> | null | undefined): IslesSave {
  if (!cloud || cloud.v !== 1) return local;
  const ok = new Set(ISLES.map((i) => i.id));
  return { ...local, intro: local.intro || !!cloud.intro, stamps: [...new Set([...local.stamps, ...(cloud.stamps ?? []).filter((x) => ok.has(x))])] };
}
export function saveIsles(s: IslesSave, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try { store?.setItem(keyFor(KEY), JSON.stringify(s)); } catch { /* 存不了就算了 */ }
}
