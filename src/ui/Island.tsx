import { useEffect, useState } from 'react';
import { addCards, freshWorld, loadWorld, markCleared, saveWorld, type WorldSave } from '../core/world';
import { load } from '../core/save';
import type { ChapterId } from '../data/world';
import { Chapter } from './Chapter';
import { WorldMap } from './WorldMap';

// 整個遊戲的兩層：全台大地圖（選章）⇄ 章節關卡。
// 網址加 ?step=3 直接進第五章的某一步；?world=fresh 大地圖從頭開始、?world=clear5 假裝剛過完第五章（測試用）。
function initialWorld(): WorldSave {
  const q = new URLSearchParams(location.search).get('world');
  if (q === 'fresh') return freshWorld();
  if (q === 'clear5') return { ...freshWorld(), greeted: true, cleared: ['ch5'] };
  return syncChapters(loadWorld());
}

// 章節過關了就記到大地圖上（章節「從頭再玩」也不會把雲霧蓋回去）
function syncChapters(w: WorldSave): WorldSave {
  const p = load();
  const got = addCards(w, p.cards);
  return p.done ? markCleared(got, 'ch5') : got;
}

export function Island() {
  const [world, setWorld] = useState<WorldSave>(initialWorld);
  const [mode, setMode] = useState<{ at: 'map'; back: boolean } | { at: 'chapter'; id: ChapterId }>(() =>
    location.search.includes('step=') ? { at: 'chapter', id: 'ch5' } : { at: 'map', back: false });
  useEffect(() => saveWorld(world), [world]);

  if (mode.at === 'chapter')
    return <Chapter album={world.cards} onExit={() => { setWorld((w) => syncChapters(w)); setMode({ at: 'map', back: true }); }} />;
  return <WorldMap world={world} setWorld={(fn) => setWorld((w) => fn(w))} back={mode.back} onEnter={(id) => setMode({ at: 'chapter', id })} />;
}
