import { describe, expect, it } from 'vitest';
import { ACTOR_ART, CHAPTERS, LIFE, MAP } from '../data/world';

// 每章過關後大地圖上長出來的東西（data/world.ts 的 LIFE）：之後補章節資料時，這裡會擋下打錯的圖名、跑出地圖的座標
const have = new Set(Object.keys(import.meta.glob('/public/img/**/*.webp')));
const file = (name: string) => `/public/img/${name.includes('/') ? name : `island/${name}`}.webp`;

describe('過關後的大地圖', () => {
  for (const [id, L] of Object.entries(LIFE)) {
    it(`${id} 用到的圖都在、座標都在地圖上`, () => {
      expect(CHAPTERS.some((c) => c.id === id)).toBe(true);
      const names = [
        ...L!.buildings.map((b) => b.name), ...(L!.scenery ?? []).map((d) => d.name),
        ...(L!.cycles ?? []).flatMap((c) => c.frames),
        ...L!.actors.flatMap((a) => { const art = ACTOR_ART[a.kind]; return [...art.walk, art.idle, ...(art.loop ?? []), ...Object.values(art.work ?? {})]; }),
      ];
      for (const n of names) expect(have.has(file(n)), n).toBe(true);
      const pts = [
        ...L!.buildings.map((b) => b.at), ...(L!.scenery ?? []).map((d) => d.at), ...(L!.cycles ?? []).map((c) => c.at),
        ...L!.actors.flatMap((a) => a.path ?? (a.at ? [a.at] : [])),
      ];
      for (const p of pts) expect(p.x >= 0 && p.y >= 0 && p.x <= MAP.width && p.y <= MAP.height, JSON.stringify(p)).toBe(true);
      for (const a of L!.actors) expect(!!a.at !== !!a.path, `${a.who} 要嘛站著（at）、要嘛走路（path）`).toBe(true);
    });
  }
});
