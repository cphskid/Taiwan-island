// 一章「活起來」要用到的所有圖（房子、場景、會動的、小人的每個動作）。
// 大地圖照這份清單讀圖；tools/atlas.mjs 也照這份清單把每章的小圖打包成一張圖集。
import { ACTOR_ART, type ChapterLife } from './world';

export function lifeNames(L: ChapterLife): string[] {
  const names = [...L.buildings, ...(L.scenery ?? [])].map((d) => d.name);
  for (const c of L.cycles ?? []) names.push(...c.frames);
  for (const def of L.actors) {
    const a = ACTOR_ART[def.kind];
    names.push(...a.walk, a.idle, ...Object.values(a.work ?? {}), ...(a.loop ?? []));
  }
  return [...new Set(names)];
}
