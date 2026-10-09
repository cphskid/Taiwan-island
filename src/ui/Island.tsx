import { useEffect, useState } from 'react';
import { addCards, allCleared, freshWorld, loadWorld, markCleared, opened, saveWorld, type WorldSave } from '../core/world';
import { load } from '../core/save';
import { CHAPTERS, type ChapterId } from '../data/world';
import { unlockNow } from '../data/now';
import { Chapter } from './Chapter';
import { Ch1 } from './Ch1';
import { load1 } from '../core/save1';
import { Ch2 } from './Ch2';
import { load2 } from '../core/save2';
import { Ch4 } from './Ch4';
import { load4 } from '../core/save4';
import { Ch6 } from './Ch6';
import { load6 } from '../core/save6';
import { Ch7 } from './Ch7';
import { load7 } from '../core/save7';
import { Ch3 } from './Ch3';
import { load3 } from '../core/save3';
import { ChEnd } from './ChEnd';
import { loadEnd } from '../core/saveEnd';
import { pushCloud } from '../net/cloud';
import { WorldMap } from './WorldMap';
import { Prologue } from './Prologue';
import { Village, villageImages } from './Village';
import { loadVillage } from '../core/village';
import { Town } from './Town';
import { Sky } from './Sky';
import { Isles } from './Isles';
import { Postcard } from './Postcard';
import { warm } from './warm';
import { mapImageUrls } from '../render/worldmap';

// 整個遊戲的兩層：全台大地圖（選章）⇄ 章節關卡；第一次進來先玩序章《認識臺灣》。
// 網址加 ?village 直接進現在篇的漁村；?step=3 直接進第五章的某一步、?ch1=2 直接進第一章的某一步、?ch2=2、?ch3=2…?chEnd=2 直接進那一章的某一步；?prologue 直接玩序章；?world=fresh 大地圖從頭開始、?world=clear5 假裝剛過完第五章、?world=clear1,2,5 假裝過了好幾章、?world=clear1,2,3,4,5,6,7,End 全破（撥雲完接著播整篇通關，撥桿出現）（測試用）。
function initialWorld(): WorldSave {
  const w = readWorld();
  if (allCleared(w, CHAPTERS.map((c) => c.id))) unlockNow(); // 過去篇全破：大地圖要準備好「現在」（撥桿等看完整篇通關才出現）
  return w;
}
function readWorld(): WorldSave {
  const q = new URLSearchParams(location.search).get('world');
  if (q === 'fresh') return freshWorld();
  if (q?.startsWith('clear')) return { ...freshWorld(), greeted: true, cleared: q.slice(5).split(',').map((n) => (n === 'End' ? 'end' : `ch${n}`)) as WorldSave['cleared'] };
  return syncChapters(loadWorld());
}

// 章節過關了就記到大地圖上（章節「從頭再玩」也不會把雲霧蓋回去）
function syncChapters(w: WorldSave): WorldSave {
  const p = load(), p1 = load1(), p2 = load2(), p4 = load4(), p6 = load6(), p7 = load7(), p3 = load3();
  let got = w;
  for (const x of [p, p1, p2, p4, p6, p7, p3]) got = addCards(got, x.cards);
  if (p.done) got = markCleared(got, 'ch5');
  if (p1.done) got = markCleared(got, 'ch1');
  if (p2.done) got = markCleared(got, 'ch2');
  if (p4.done) got = markCleared(got, 'ch4');
  if (p6.done) got = markCleared(got, 'ch6');
  if (p7.done) got = markCleared(got, 'ch7');
  if (p3.done) got = markCleared(got, 'ch3');
  const pe = loadEnd();
  got = addCards(got, pe.cards);
  if (pe.done) got = markCleared(got, 'end');
  return got;
}

type Mode = { at: 'map'; back: ChapterId | null; now?: boolean } | { at: 'chapter'; id: ChapterId } | { at: 'prologue' } | { at: 'village' } | { at: 'town' } | { at: 'sky' } | { at: 'isles' } | { at: 'postcard' };
function initialMode(world: WorldSave): Mode {
  return location.search.includes('village') ? { at: 'village' }
    : /[?&]town\b/.test(location.search) ? { at: 'town' }
    : /[?&]sky\b/.test(location.search) ? { at: 'sky' }
    : /[?&]isles\b/.test(location.search) ? { at: 'isles' }
    : /[?&]postcard\b/.test(location.search) ? { at: 'postcard' }
    : location.search.includes('step=') ? { at: 'chapter', id: 'ch5' }
    : location.search.includes('ch1=') ? { at: 'chapter', id: 'ch1' }
    : location.search.includes('ch2=') ? { at: 'chapter', id: 'ch2' }
    : location.search.includes('ch3=') ? { at: 'chapter', id: 'ch3' }
    : location.search.includes('ch4=') ? { at: 'chapter', id: 'ch4' }
    : location.search.includes('ch6=') ? { at: 'chapter', id: 'ch6' }
    : location.search.includes('ch7=') ? { at: 'chapter', id: 'ch7' }
    : location.search.includes('chEnd=') ? { at: 'chapter', id: 'end' }
    : location.search.includes('prologue') || (!world.prologue && !world.greeted) ? { at: 'prologue' }
    : { at: 'map', back: null };
}

// 進場進度條要先讀好的圖：一進來第一個畫面會用到的（序章開場、或大地圖的底圖和已撥開那幾章），讀完才登島
const IMG = `${import.meta.env.BASE_URL}img/`;
export function firstScreenImages(): { urls: string[]; map: boolean } {
  const w = initialWorld();
  const m = initialMode(w);
  if (m.at === 'prologue') return { urls: ['story/K-01', 'story/K-02', 'story/K-03', 'tick/happy'].map((n) => `${IMG}${n}.webp`), map: false };
  if (m.at === 'map') return { urls: mapImageUrls(), map: true };
  if (m.at === 'village') return { urls: villageImages(loadVillage()), map: false };
  return { urls: [], map: false };
}

export function Island() {
  const [world, setWorld] = useState<WorldSave>(initialWorld);
  const [mode, setMode] = useState<Mode>(() => initialMode(world));
  useEffect(() => { saveWorld(world); pushCloud('world', world); }, [world]);
  // 換畫面時，在背景先抓這一幕（和接下來）會用到的圖：序章、大地圖用 island/，各章用自己的資料夾（ch1/、ch2/…），劇情人物在 story/
  const at = mode.at === 'chapter' ? mode.id : mode.at;
  // 大地圖等地圖畫出來才開始抓，不跟地圖本身搶（最多等 10 秒）
  useEffect(() => {
    const go = () => warm(...(at === 'prologue' ? ['story/', 'island/'] : at === 'village' ? ['village/', 'island/'] : at === 'town' ? ['town/', 'island/'] : at === 'sky' ? ['sky/', 'island/'] : at === 'isles' ? ['isles/', 'island/'] : at === 'postcard' ? ['postcard/s/', 'tick/', 'postcard/'] : at === 'map' ? ['island/', 'story/'] : at === 'ch5' ? ['island/', 'people/'] : [`${at}/`, 'story/']));
    if (at !== 'map') return go();
    const t = setTimeout(go, 10000);
    const ready = () => { clearTimeout(t); go(); };
    window.addEventListener('island:map-ready', ready, { once: true });
    return () => { clearTimeout(t); window.removeEventListener('island:map-ready', ready); };
  }, [at]);

  if (mode.at === 'prologue')
    return <Prologue onDone={() => {
      setWorld((w) => ({ ...w, prologue: true, tools: [...w.tools, ...['glasses', 'compass'].filter((t) => !w.tools.includes(t))] }));
      setMode({ at: 'map', back: null });
    }} />;
  if (mode.at === 'isles') return <Isles onExit={() => setMode({ at: 'map', back: null, now: true })} />;
  if (mode.at === 'postcard') return <Postcard onExit={() => setMode({ at: 'map', back: null, now: true })} />;
  if (mode.at === 'sky') return <Sky onExit={() => setMode({ at: 'map', back: null, now: true })} />;
  if (mode.at === 'town') return <Town onExit={() => setMode({ at: 'map', back: null, now: true })} />;
  if (mode.at === 'village') return <Village onExit={() => setMode({ at: 'map', back: null, now: true })} />;
  if (mode.at === 'chapter') {
    const exit = () => { setWorld((w) => syncChapters(w)); setMode({ at: 'map', back: mode.id }); };
    return mode.id === 'ch1' ? <Ch1 album={world.cards} onExit={exit} />
      : mode.id === 'ch2' ? <Ch2 album={world.cards} onExit={exit} />
      : mode.id === 'ch4' ? <Ch4 album={world.cards} onExit={exit} />
      : mode.id === 'ch6' ? <Ch6 album={world.cards} onExit={exit} />
      : mode.id === 'ch7' ? <Ch7 album={world.cards} onExit={exit} />
      : mode.id === 'ch3' ? <Ch3 album={world.cards} onExit={exit} />
      : mode.id === 'end' ? <ChEnd album={world.cards} onExit={exit} />
      : <Chapter album={world.cards} onExit={exit} />;
  }
  return <WorldMap world={world} setWorld={(fn) => setWorld((w) => fn(w))} back={mode.back} startNow={mode.now} onEnter={(id) => setMode({ at: 'chapter', id })} onPrologue={() => setMode({ at: 'prologue' })} onPlace={(id) => { if (id === 'village') setMode({ at: 'village' }); else if (id === 'town') setMode({ at: 'town' }); else if (id === 'sky') setMode({ at: 'sky' }); else if (id === 'isles') setMode({ at: 'isles' }); else if (id === 'postcard') setMode({ at: 'postcard' }); }} />;
}
