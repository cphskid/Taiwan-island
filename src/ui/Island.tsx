import { useEffect, useState } from 'react';
import { addCards, freshWorld, loadWorld, markCleared, saveWorld, type WorldSave } from '../core/world';
import { load } from '../core/save';
import type { ChapterId } from '../data/world';
import { Chapter } from './Chapter';
import { Ch1 } from './Ch1';
import { load1 } from '../core/save1';
import { Ch2 } from './Ch2';
import { load2 } from '../core/save2';
import { Ch3 } from './Ch3';
import { load3 } from '../core/save3';
import { pushCloud } from '../net/cloud';
import { WorldMap } from './WorldMap';
import { Prologue } from './Prologue';
import { warm } from './warm';

// 整個遊戲的兩層：全台大地圖（選章）⇄ 章節關卡；第一次進來先玩序章《認識臺灣》。
// 網址加 ?step=3 直接進第五章的某一步、?ch1=2 直接進第一章的某一步、?ch2=2 直接進第二章的某一步；?prologue 直接玩序章；?world=fresh 大地圖從頭開始、?world=clear5 假裝剛過完第五章（測試用）。
function initialWorld(): WorldSave {
  const q = new URLSearchParams(location.search).get('world');
  if (q === 'fresh') return freshWorld();
  if (q === 'clear5') return { ...freshWorld(), greeted: true, cleared: ['ch5'] };
  return syncChapters(loadWorld());
}

// 章節過關了就記到大地圖上（章節「從頭再玩」也不會把雲霧蓋回去）
function syncChapters(w: WorldSave): WorldSave {
  const p = load(), p1 = load1(), p2 = load2(), p3 = load3();
  let got = addCards(addCards(addCards(w, p.cards), p1.cards), p2.cards);
  got = addCards(got, p3.cards);
  if (p.done) got = markCleared(got, 'ch5');
  if (p1.done) got = markCleared(got, 'ch1');
  if (p2.done) got = markCleared(got, 'ch2');
  if (p3.done) got = markCleared(got, 'ch3');
  return got;
}

export function Island() {
  const [world, setWorld] = useState<WorldSave>(initialWorld);
  const [mode, setMode] = useState<{ at: 'map'; back: ChapterId | null } | { at: 'chapter'; id: ChapterId } | { at: 'prologue' }>(() =>
    location.search.includes('step=') ? { at: 'chapter', id: 'ch5' }
    : location.search.includes('ch1=') ? { at: 'chapter', id: 'ch1' }
    : location.search.includes('ch2=') ? { at: 'chapter', id: 'ch2' }
    : location.search.includes('ch3=') ? { at: 'chapter', id: 'ch3' }
    : location.search.includes('prologue') || (!world.prologue && !world.greeted) ? { at: 'prologue' }
    : { at: 'map', back: null });
  useEffect(() => { saveWorld(world); pushCloud('world', world); }, [world]);
  // 換畫面時，在背景先抓這一幕（和接下來）會用到的圖：序章、大地圖用 island/，各章用自己的資料夾（ch1/、ch2/…），劇情人物在 story/
  const at = mode.at === 'chapter' ? mode.id : mode.at;
  useEffect(() => {
    warm(...(at === 'prologue' ? ['story/', 'island/'] : at === 'map' ? ['island/', 'story/'] : at === 'ch5' ? ['island/', 'people/'] : [`${at}/`, 'story/']));
  }, [at]);

  if (mode.at === 'prologue')
    return <Prologue onDone={() => {
      setWorld((w) => ({ ...w, prologue: true, tools: [...w.tools, ...['glasses', 'compass'].filter((t) => !w.tools.includes(t))] }));
      setMode({ at: 'map', back: null });
    }} />;
  if (mode.at === 'chapter') {
    const exit = () => { setWorld((w) => syncChapters(w)); setMode({ at: 'map', back: mode.id }); };
    return mode.id === 'ch1' ? <Ch1 album={world.cards} onExit={exit} />
      : mode.id === 'ch2' ? <Ch2 album={world.cards} onExit={exit} />
      : mode.id === 'ch3' ? <Ch3 album={world.cards} onExit={exit} />
      : <Chapter album={world.cards} onExit={exit} />;
  }
  return <WorldMap world={world} setWorld={(fn) => setWorld((w) => fn(w))} back={mode.back} onEnter={(id) => setMode({ at: 'chapter', id })} onPrologue={() => setMode({ at: 'prologue' })} />;
}
