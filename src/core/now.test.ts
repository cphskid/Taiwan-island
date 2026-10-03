import { describe, expect, it } from 'vitest';
import { ACTOR_ART, CHAPTERS, MAP } from '../data/world';
import { NOW_LIFE, NOW_PLACES } from '../data/now';

// 大地圖「現在」（data/now.ts）：圖名打錯、座標跑出地圖，這裡會擋下來
const have = new Set(Object.keys(import.meta.glob('/public/img/**/*.webp')));
const file = (name: string) => `/public/img/${name.includes('/') ? name : `island/${name}`}.webp`;
const inMap = (p: { x: number; y: number }) => p.x >= 0 && p.y >= 0 && p.x <= MAP.width && p.y <= MAP.height;

describe('大地圖的現在', () => {
  for (const [id, L] of Object.entries(NOW_LIFE)) {
    it(`${id} 用到的圖都在、座標都在地圖上`, () => {
      expect(id === 'base' || CHAPTERS.some((c) => c.id === id)).toBe(true);
      const names = [
        ...L!.buildings.map((b) => b.name), ...(L!.scenery ?? []).map((d) => d.name),
        ...L!.actors.flatMap((a) => { const art = ACTOR_ART[a.kind]; return [...art.walk, art.idle, ...(art.loop ?? [])]; }),
      ];
      for (const n of names) expect(have.has(file(n)), n).toBe(true);
      const pts = [...L!.buildings.map((b) => b.at), ...(L!.scenery ?? []).map((d) => d.at), ...L!.actors.flatMap((a) => a.path ?? (a.at ? [a.at] : []))];
      for (const p of pts) expect(inMap(p), JSON.stringify(p)).toBe(true);
      for (const a of L!.actors) expect(!!a.at !== !!a.path, a.who).toBe(true);
    });
  }
  it('現在篇的地點都有圖、在地圖上、名字不重複', () => {
    expect(new Set(NOW_PLACES.map((p) => p.id)).size).toBe(NOW_PLACES.length);
    for (const p of NOW_PLACES) {
      expect(have.has(file(p.art)), p.art).toBe(true);
      expect(inMap(p.at)).toBe(true);
    }
    expect(have.has(file('y3-6'))).toBe(true);
  });
});
