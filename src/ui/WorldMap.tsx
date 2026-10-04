import { useEffect, useRef, useState } from 'react';
import { createWorldMap, mapStatus, type Hit, type RiftState, type WorldMap as Map } from '../render/worldmap';
import { celebrate, opened, toCelebrate, type WorldSave } from '../core/world';
import { ACTOR_ART, CHAPTERS, GEAR_SLOTS, HOOKS, LEGEND, TICK_LINES, chapterOf, isl, type ActorDef, type ChapterId } from '../data/world';
import { Say, Talk } from './Talk';
import { Album, BOOK1, BOOK2, BOOK3, BOOK4, BOOK5, BOOK6, BOOK7, BOOK_END } from './Album';
import { CARD_ORDER } from '../data/babao-chapter';
import { ambience, music, preload, sfx, type SeCode } from '../audio';
import { SoundToggle } from './Sound';
import { NOW_LINES, NOW_ON, NOW_PLACES, type Era, type NowPlace } from '../data/now';
import { PARK_MAP } from '../net/park';

// 點到小人或動物的聲音
const ACTOR_SE: Partial<Record<ActorDef['kind'], SeCode>> = { buffalo: 'SE-63', dog: 'SE-65', hen: 'SE-66' };

const BASE = import.meta.env.BASE_URL;

interface Props {
  world: WorldSave;
  setWorld: (fn: (w: WorldSave) => WorldSave) => void;
  onEnter: (id: ChapterId) => void;
  back: ChapterId | null; // 剛從哪一章回來：鏡頭先停在那一章，再拉遠
  onPrologue: () => void; // 再玩一次序章
  onPlace?: (id: string) => void; // 進現在篇的地點
  startNow?: boolean; // 從現在篇的地點回來：一進來就是「現在」
}

function riftStates(w: WorldSave): Partial<Record<ChapterId, RiftState>> {
  const s: Partial<Record<ChapterId, RiftState>> = {};
  for (const ch of CHAPTERS) s[ch.id] = w.cleared.includes(ch.id) ? 'done' : ch.playable ? 'open' : 'locked';
  for (const id of w.cleared) {
    const next = HOOKS[id as ChapterId];
    if (next && s[next] === 'locked') s[next] = 'hook';
  }
  return s;
}

// 選章畫面：被時光雲霧蓋住的台灣。點裂縫穿越進那一章，過關回來那一區的雲霧散開、活起來
export function WorldMap({ world, setWorld, onEnter, back, onPrologue, onPlace, startNow }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);
  const [stuck, setStuck] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [glasses, setGlasses] = useState(false);
  // 右邊的工具（地形眼鏡、圖鑑、聲音）不常用：平常收成一顆「工具」鈕，點開才展開
  const [toolsOpen, setToolsOpen] = useState(false);
  const [picked, setPicked] = useState<ChapterId | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [actor, setActor] = useState<ActorDef | null>(null);
  const [intro, setIntro] = useState(!world.greeted);
  const [busy, setBusy] = useState(false); // 撥雲或穿越動畫中，不能點
  const [flash, setFlash] = useState(false);
  const [book, setBook] = useState(false);
  const [flyGear, setFlyGear] = useState<number | null>(null); // 正在飛向時鐘的齒輪孔
  // 過去／現在（現在先藏在 ?now=1 後面）
  const [era, setEra] = useState<Era>(startNow && NOW_ON ? 'now' : 'past');
  const [eraWarp, setEraWarp] = useState(0); // 切換時的穿梭光，數字變了就重播
  const [place, setPlace] = useState<NowPlace | null>(null);
  const [bag, setBag] = useState(false);
  const live = useRef({ world, busy });
  live.current = { world, busy };

  const onTap = (hit: Hit | null) => {
    if (live.current.busy) return;
    setActor(null);
    if (!hit) { setPicked(null); return; }
    setPlace(null);
    if (hit.kind === 'actor') { sfx(ACTOR_SE[hit.actor.kind] ?? 'SE-39'); setActor(hit.actor); setPicked(null); return; }
    if (hit.kind === 'place') { sfx('SE-03'); setPlace(NOW_PLACES.find((p) => p.id === hit.id) ?? null); setPicked(null); setSay(null); return; }
    if (hit.kind === 'rift') { sfx(chapterOf(hit.id).playable ? 'SE-03' : 'SE-13'); setPicked(hit.id); setSay(null); return; }
    if (hit.fogged) { sfx('SE-02'); setSay(hit.id ? `${TICK_LINES.fogged}這一區是${chapterOf(hit.id).no}「${chapterOf(hit.id).title}」。` : TICK_LINES.fogged); setPicked(null); return; }
    sfx('SE-03');
    setPicked(hit.id);
  };

  useEffect(() => {
    let alive = true;
    let timer = 0;
    music('MU-10');
    ambience('SE-30');
    preload(['SE-03', 'SE-31', 'SE-32', 'SE-33', 'SE-34', 'SE-38', 'SE-39']);
    const from = chapterOf(back ?? 'ch5');
    createWorldMap(host.current!, {
      opened: opened(world),
      onTap: (h) => onTapRef.current(h),
      start: back ? { at: from.rift, zoom: 4 } : undefined,
      era,
    }).then(async (m) => {
      if (!alive) { m.destroy(); return; }
      map.current = m;
      if (import.meta.env.DEV) (window as unknown as { __map: Map }).__map = m; // 瀏覽器測試用
      m.setRifts(riftStates({ ...world, cleared: opened(world) }));
      setReady(true);
      setStuck(null);
      dispatchEvent(new Event('island:map-ready'));
      if (mapStatus.failed.length) setStuck(`有 ${mapStatus.failed.length} 張圖沒讀到，地圖上少了一點東西，照樣可以玩。想補回來，按「重新載入」再讀一次。`);   // 進場的穿越畫面等這個才收起來（ui/App.tsx）
      timer = window.setInterval(() => setFps(Math.round(m.fps())), 500);
      const todo = toCelebrate(live.current.world);
      if (back || todo.length) {
        setBusy(true);
        if (todo.length) await m.flyTo(chapterOf(todo[0] as ChapterId).rift, 2.6, 900);
        else await m.flyTo(from.rift, 0, 1100);
        for (const id of todo) await celebrateOne(m, id as ChapterId);
        setBusy(false);
      }
    }).catch((e: unknown) => {
      if (alive) setStuck(`地圖打不開：${e instanceof Error ? e.message : String(e)}`);
    });
    // 15 秒還沒好：畫面上說卡在哪一步、還在等哪些圖，給一個重新整理的按鈕
    const watch = window.setTimeout(() => {
      if (!alive || map.current) return;
      const p = [...mapStatus.pending];
      setStuck(`地圖還在準備（${mapStatus.stage || '準備中'}${p.length ? `，還差 ${p.length} 張圖` : ''}）。網路慢的時候會久一點，請再等一下；等了一分鐘都沒動，再按「重新載入」。`);
    }, 15000);
    return () => {
      clearTimeout(watch); music(null); ambience(null); alive = false; clearInterval(timer); map.current?.destroy(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  // 撥雲：雲散開、建設長出來、齒輪飛回時鐘，最後滴答說下一章的鉤子
  const celebrateOne = async (m: Map, id: ChapterId) => {
    setSay(null);
    sfx('SE-32');
    await m.dispel(id);
    sfx('SE-33');
    const ch = chapterOf(id);
    if (ch.gear !== null) {
      sfx('SE-34');
      setFlyGear(ch.gear);
      await new Promise((r) => setTimeout(r, 1300));
      setFlyGear(null);
    }
    setWorld((w) => celebrate(w, id));
    m.setRifts(riftStates({ ...live.current.world, cleared: [...opened(live.current.world), id] }));
    setSay((TICK_LINES as Record<string, unknown>)[id === 'end' ? 'clearedEnd' : `clearedCh${id.slice(2)}`] as string | undefined ?? TICK_LINES.cleared);
    if (HOOKS[id]) {
      await new Promise((r) => setTimeout(r, 6000));
      setSay(TICK_LINES.hook);
      await m.flyTo(chapterOf(HOOKS[id]!).rift, 1.6, 1400);
    }
  };

  useEffect(() => { map.current?.setGlasses(glasses); if (glasses) setSay(TICK_LINES.glasses); }, [glasses, ready]);
  useEffect(() => { map.current?.setNowOpened(opened(world)); }, [world, ready]);

  // 撥桿：過去 ⇄ 現在。穿梭光一閃，雲霧和各時代的東西淡出，今天的臺灣淡入
  const flip = () => {
    if (busy) return;
    const next: Era = era === 'past' ? 'now' : 'past';
    sfx('SE-31');
    setEraWarp((n) => n + 1);
    setEra(next);
    setPicked(null);
    setPlace(null);
    setActor(null);
    setGlasses(false);
    map.current?.setEra(next);
    setSay(next === 'now' ? NOW_LINES.toNow : NOW_LINES.toPast);
  };
  const goPlace = async (p: NowPlace) => {
    if (busy) return;
    sfx('SE-01');
    setPlace(p);
    setActor(null);
    await map.current?.flyTo(p.at, 1.8, 700);
  };

  const enter = async (id: ChapterId) => {
    const m = map.current;
    if (!m) return;
    setPicked(null);
    setBusy(true);
    setFlash(true);
    sfx('SE-31');
    await m.flyTo(chapterOf(id).rift, 6, 900);
    onEnter(id);
  };

  const focus = async (id: ChapterId) => {
    if (busy) return;
    sfx('SE-01');
    setPicked(id);
    setActor(null);
    await map.current?.flyTo(chapterOf(id).rift, 1.8, 700);
  };

  const gears = CHAPTERS.filter((c) => c.gear !== null && opened(world).includes(c.id));
  const ch = picked ? chapterOf(picked) : null;
  const done = ch ? world.cleared.includes(ch.id) : false;
  return (
    <div className={`world ${NOW_ON ? 'has-nav' : ''} era-${era}`}>
      <div className="board full" ref={host} data-ready={ready ? 1 : undefined} />
      {stuck && (
        <div className="map-stuck">
          <p>{stuck}</p>
          <div className="row">
            <button className="btn" onClick={() => location.reload()}>重新載入</button>
            {ready && <button className="btn ghost" onClick={() => setStuck(null)}>知道了</button>}
          </div>
        </div>
      )}

      <div className="clock" title="時光鐘">
        <img src={isl('clock-empty')} alt="" />
        {gears.map((c) => <img key={c.id} className="slot-gear" src={isl('gear')} alt="" style={slotStyle(c.gear!)} />)}
        <b>時之齒輪 {gears.length} / 7</b>
      </div>
      {flyGear !== null && <img className="gear-fly" src={isl('gear')} alt="" style={{ '--tx': `${GEAR_SLOTS[flyGear].x * 140 + 12}px`, '--ty': `${GEAR_SLOTS[flyGear].y * 140 + 12}px` } as React.CSSProperties} />}

      <div className={`tools world-tools ${toolsOpen ? 'open' : 'folded'}`}>
        <button className={`tool fold ${glasses ? 'busy' : ''}`} aria-expanded={toolsOpen} onClick={() => { sfx('SE-03'); setToolsOpen(!toolsOpen); }}>
          <span className="tool-icon">{toolsOpen ? '✕' : '🧰'}</span>{toolsOpen ? '收起' : '工具'}
        </button>
        {toolsOpen && <>
          <button className={`tool ${glasses ? 'on' : ''}`} onClick={() => { sfx('SE-38'); setGlasses(!glasses); }}>
            <img className="tool-img" src={isl('h-eye')} alt="" />地形眼鏡
          </button>
          {!NOW_ON && (
            <button className="tool" onClick={() => { sfx('SE-03'); setBook(true); }}>
              <span className="tool-icon">📖</span>圖鑑 {CARD_ORDER.filter((id) => world.cards.includes(id)).length}/{CARD_ORDER.length}
            </button>
          )}
          <SoundToggle />
        </>}
      </div>
      {glasses && (
        <div className="legend world-legend">
          <span>公尺</span>
          {LEGEND.map((l, i) => <span key={l} className="lg"><i className={`band b${i}`} />{l}</span>)}
          <em>線越密，坡越陡</em>
        </div>
      )}

      {era === 'now' ? (
        <div className="timeline now-places">
          {NOW_PLACES.map((p) => (
            <button key={p.id} className={`era ${p.ready ? 'open' : 'locked'} ${place?.id === p.id ? 'on' : ''}`} onClick={() => goPlace(p)}>
              <img className="era-badge" src={isl(p.art)} alt="" />
              <small>{p.genre}</small>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      ) : (
      <div className="timeline">
        <button className={`era ${world.prologue ? 'done' : 'open'}`} onClick={() => { sfx('SE-01'); onPrologue(); }}>
          <img className="era-badge" src={isl('badge-blank')} alt="" />
          <small>認識臺灣</small>
          <span>序章</span>
        </button>
        {CHAPTERS.map((c) => {
          const state = world.cleared.includes(c.id) ? 'done' : c.playable ? 'open' : 'locked';
          return (
            <button key={c.id} className={`era ${state} ${picked === c.id ? 'on' : ''}`} onClick={() => focus(c.id)}>
              <img className="era-badge" src={isl(`badge-${c.badge}`)} alt="" />
              <small>{c.era}</small>
              <span>{c.no}</span>
            </button>
          );
        })}
      </div>
      )}

      {ch && !busy && (
        <div className="chapter-card panel" onClick={(e) => e.stopPropagation()}>
          <button className="x" onClick={() => { sfx('SE-02'); setPicked(null); }} aria-label="關掉">✕</button>
          <img className="card-badge" src={isl(`badge-${ch.badge}`)} alt="" />
          <small>{ch.no}・{ch.era}</small>
          <h2>{ch.title}</h2>
          <p>{ch.place}</p>
          <p className="grows">{done ? '已經長出來：' : '過關後會長出：'}{ch.grows}</p>
          {ch.playable
            ? <button className="btn green" onClick={() => enter(ch.id)}>{done ? '再穿越一次' : '穿越！'}</button>
            : <p className="building">施工中，下次再來！</p>}
        </div>
      )}

      {place && !busy && (
        <div className="chapter-card place-card panel" onClick={(e) => e.stopPropagation()}>
          <button className="x" onClick={() => { sfx('SE-02'); setPlace(null); }} aria-label="關掉">✕</button>
          <img className="card-badge" src={isl(place.art)} alt="" />
          <small>{place.genre}　{'★'.repeat(place.stars)}{'☆'.repeat(3 - place.stars)}</small>
          <h2>{place.name}</h2>
          <p>{place.blurb}</p>
          {place.ready
            ? <button className="btn green" onClick={() => { sfx('SE-31'); onPlace?.(place.id); }}>出發！</button>
            : <p className="building">{NOW_LINES.building}</p>}
        </div>
      )}
      {bag && <Bag world={world} onClose={() => setBag(false)} />}
      {NOW_ON && (
        <nav className="navbar">
          <button className="nav-btn" onClick={() => { if (busy) return; sfx('SE-01'); setPicked(null); setPlace(null); void map.current?.flyTo({ x: 1340, y: 1852 }, 0, 800); }}>
            <img src={isl('h-map')} alt="" /><span>地圖</span>
          </button>
          <button className="nav-btn" onClick={() => { sfx('SE-03'); setPlace(null); setPicked(null); setBag(true); }}>
            <span className="nav-icon">🎒</span><span>背包</span>
          </button>
          <button className={`era-lever ${era}`} onClick={flip} aria-label={era === 'past' ? '撥到現在' : '撥回過去'}>
            <span className="lever-past">過去</span>
            <i className="lever-knob" />
            <span className="lever-now">現在</span>
          </button>
          <button className="nav-btn" onClick={() => { sfx('SE-03'); setBook(true); }}>
            <span className="nav-icon">📖</span><span>圖鑑 {CARD_ORDER.filter((id) => world.cards.includes(id)).length}</span>
          </button>
          <a className="nav-btn" href={PARK_MAP ?? undefined}>
            <img src={`${BASE}img/park.webp`} alt="" /><span>回樂園</span>
          </a>
        </nav>
      )}
      {eraWarp > 0 && <div key={eraWarp} className={`era-warp to-${era}`} />}
      {actor && <ActorSay actor={actor} onClose={() => setActor(null)} />}
      {!actor && <Say line={say ? { who: 'tick', mood: 'happy', text: say } : null} />}
      {flash && <div className="warp" />}
      {book && <Album have={world.cards} books={[BOOK1, BOOK2, BOOK3, BOOK4, BOOK5, BOOK6, BOOK7, BOOK_END]} onClose={() => setBook(false)} />}
      {intro && ready && (
        <Talk
          lines={[{ who: 'tick', mood: 'wave', text: TICK_LINES.welcome }]}
          onDone={() => { setIntro(false); setWorld((w) => ({ ...w, greeted: true })); setPicked('ch5'); void map.current?.flyTo(chapterOf('ch5').rift, 1.8, 900); }}
        />
      )}
      <div className="fps">每秒 {fps} 格</div>
    </div>
  );
}

// 時光鐘上第 i 個齒輪孔的位置（時鐘 140px）
function slotStyle(i: number): React.CSSProperties {
  const s = GEAR_SLOTS[i];
  return { left: `${s.x * 100}%`, top: `${s.y * 100}%` };
}

// 點小人：他說一句話，順便複習這章學到的事
function ActorSay({ actor, onClose }: { actor: ActorDef; onClose: () => void }) {
  const art = ACTOR_ART[actor.kind];
  return (
    <button className="say actor-say" onClick={onClose} aria-label="收起">
      <div className="face small" style={{ borderColor: '#4aa834' }}><img src={isl(art.idle)} alt="" style={{ objectFit: 'contain' }} /></div>
      <p><b style={{ color: '#2e7d22' }}>{actor.who}</b>{actor.says}</p>
      <i className="say-x">✕</i>
    </button>
  );
}

// 背包：跨章累積的道具和信物（過關的章留下的徽章）
const TOOL_INFO: Record<string, { name: string; img: string; text: string }> = {
  glasses: { name: '地形眼鏡', img: 'h-eye', text: '戴上就看得出哪裡高、哪裡低。' },
  compass: { name: '天氣羅盤', img: 'h-rotate', text: '看得出季風從哪裡吹來。' },
};
function Bag({ world, onClose }: { world: WorldSave; onClose: () => void }) {
  const keeps = CHAPTERS.filter((c) => world.cleared.includes(c.id));
  return (
    <div className="bag panel" onClick={(e) => e.stopPropagation()}>
      <button className="x" onClick={() => { sfx('SE-02'); onClose(); }} aria-label="關掉">✕</button>
      <h2>背包</h2>
      <h3>道具</h3>
      <div className="bag-row">
        {world.tools.length === 0 && <p className="bag-empty">還沒有道具，先去玩序章吧！</p>}
        {world.tools.map((t) => TOOL_INFO[t] && (
          <div key={t} className="bag-item"><img src={isl(TOOL_INFO[t].img)} alt="" /><b>{TOOL_INFO[t].name}</b><small>{TOOL_INFO[t].text}</small></div>
        ))}
      </div>
      <h3>時光信物</h3>
      <div className="bag-row">
        {keeps.length === 0 && <p className="bag-empty">穿越到過去、幫上忙，就會拿到那個時代的信物。</p>}
        {keeps.map((c) => (
          <div key={c.id} className="bag-item"><img src={isl(`badge-${c.badge}`)} alt="" /><b>{c.no}</b><small>{c.title}</small></div>
        ))}
      </div>
    </div>
  );
}
