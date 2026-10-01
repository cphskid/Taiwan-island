import { useEffect, useRef, useState } from 'react';
import { createWorldMap, type Hit, type RiftState, type WorldMap as Map } from '../render/worldmap';
import { celebrate, opened, toCelebrate, type WorldSave } from '../core/world';
import { ACTOR_ART, CHAPTERS, GEAR_SLOTS, HOOKS, LEGEND, TICK_LINES, chapterOf, isl, type ActorDef, type ChapterId } from '../data/world';
import { Say, Talk } from './Talk';

const BASE = import.meta.env.BASE_URL;

interface Props {
  world: WorldSave;
  setWorld: (fn: (w: WorldSave) => WorldSave) => void;
  onEnter: (id: ChapterId) => void;
  back: boolean; // 剛從關卡回來：鏡頭先停在彰化，再拉遠
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
export function WorldMap({ world, setWorld, onEnter, back }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);
  const [fps, setFps] = useState(0);
  const [glasses, setGlasses] = useState(false);
  const [picked, setPicked] = useState<ChapterId | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [actor, setActor] = useState<ActorDef | null>(null);
  const [intro, setIntro] = useState(!world.greeted);
  const [busy, setBusy] = useState(false); // 撥雲或穿越動畫中，不能點
  const [flash, setFlash] = useState(false);
  const [flyGear, setFlyGear] = useState<number | null>(null); // 正在飛向時鐘的齒輪孔
  const live = useRef({ world, busy });
  live.current = { world, busy };

  const onTap = (hit: Hit | null) => {
    if (live.current.busy) return;
    setActor(null);
    if (!hit) { setPicked(null); return; }
    if (hit.kind === 'actor') { setActor(hit.actor); setPicked(null); return; }
    if (hit.kind === 'rift') { setPicked(hit.id); setSay(null); return; }
    if (hit.fogged) { setSay(hit.id ? `${TICK_LINES.fogged}這一區是${chapterOf(hit.id).no}「${chapterOf(hit.id).title}」。` : TICK_LINES.fogged); setPicked(null); return; }
    setPicked(hit.id);
  };

  useEffect(() => {
    let alive = true;
    let timer = 0;
    const ch5 = chapterOf('ch5');
    createWorldMap(host.current!, {
      opened: opened(world),
      onTap: (h) => onTapRef.current(h),
      start: back ? { at: ch5.rift, zoom: 4 } : undefined,
    }).then(async (m) => {
      if (!alive) { m.destroy(); return; }
      map.current = m;
      if (import.meta.env.DEV) (window as unknown as { __map: Map }).__map = m; // 瀏覽器測試用
      m.setRifts(riftStates({ ...world, cleared: opened(world) }));
      setReady(true);
      timer = window.setInterval(() => setFps(Math.round(m.fps())), 500);
      const todo = toCelebrate(live.current.world);
      if (back || todo.length) {
        setBusy(true);
        if (todo.length) await m.flyTo(chapterOf(todo[0] as ChapterId).rift, 2.6, 900);
        else await m.flyTo(ch5.rift, 1, 1100);
        for (const id of todo) await celebrateOne(m, id as ChapterId);
        setBusy(false);
      }
    });
    return () => { alive = false; clearInterval(timer); map.current?.destroy(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  // 撥雲：雲散開、建設長出來、齒輪飛回時鐘，最後滴答說下一章的鉤子
  const celebrateOne = async (m: Map, id: ChapterId) => {
    setSay(null);
    await m.dispel(id);
    const ch = chapterOf(id);
    if (ch.gear !== null) {
      setFlyGear(ch.gear);
      await new Promise((r) => setTimeout(r, 1300));
      setFlyGear(null);
    }
    setWorld((w) => celebrate(w, id));
    m.setRifts(riftStates({ ...live.current.world, cleared: [...opened(live.current.world), id] }));
    setSay(TICK_LINES.cleared);
    if (HOOKS[id]) {
      await new Promise((r) => setTimeout(r, 6000));
      setSay(TICK_LINES.hook);
      await m.flyTo(chapterOf(HOOKS[id]!).rift, 1.6, 1400);
    }
  };

  useEffect(() => { map.current?.setGlasses(glasses); if (glasses) setSay(TICK_LINES.glasses); }, [glasses, ready]);

  const enter = async (id: ChapterId) => {
    const m = map.current;
    if (!m) return;
    setPicked(null);
    setBusy(true);
    setFlash(true);
    await m.flyTo(chapterOf(id).rift, 6, 900);
    onEnter(id);
  };

  const focus = async (id: ChapterId) => {
    if (busy) return;
    setPicked(id);
    setActor(null);
    await map.current?.flyTo(chapterOf(id).rift, 1.8, 700);
  };

  const gears = CHAPTERS.filter((c) => c.gear !== null && opened(world).includes(c.id));
  const ch = picked ? chapterOf(picked) : null;
  const done = ch ? world.cleared.includes(ch.id) : false;
  return (
    <div className="world">
      <div className="board full" ref={host} />

      <div className="clock" title="時光鐘">
        <img src={isl('clock-empty')} alt="" />
        {gears.map((c) => <img key={c.id} className="slot-gear" src={isl('gear')} alt="" style={slotStyle(c.gear!)} />)}
        <b>時之齒輪 {gears.length} / 7</b>
      </div>
      {flyGear !== null && <img className="gear-fly" src={isl('gear')} alt="" style={{ '--tx': `${GEAR_SLOTS[flyGear].x * 140 + 12}px`, '--ty': `${GEAR_SLOTS[flyGear].y * 140 + 12}px` } as React.CSSProperties} />}

      <div className="tools">
        <button className={`tool ${glasses ? 'on' : ''}`} onClick={() => setGlasses(!glasses)}>
          <img className="tool-img" src={isl('h-eye')} alt="" />地形眼鏡
        </button>
      </div>
      {glasses && (
        <div className="legend world-legend">
          <span>公尺</span>
          {LEGEND.map((l, i) => <span key={l} className="lg"><i className={`band b${i}`} />{l}</span>)}
          <em>線越密，坡越陡</em>
        </div>
      )}

      <div className="timeline">
        {CHAPTERS.map((c) => {
          const state = world.cleared.includes(c.id) ? 'done' : c.playable ? 'open' : 'locked';
          return (
            <button key={c.id} className={`era ${state} ${picked === c.id ? 'on' : ''}`} onClick={() => focus(c.id)}>
              <small>{c.era}</small>
              <span>{c.no}</span>
            </button>
          );
        })}
      </div>

      {ch && !busy && (
        <div className="chapter-card panel" onClick={(e) => e.stopPropagation()}>
          <button className="x" onClick={() => setPicked(null)} aria-label="關掉">✕</button>
          <small>{ch.no}・{ch.era}</small>
          <h2>{ch.title}</h2>
          <p>{ch.place}</p>
          <p className="grows">{done ? '已經長出來：' : '過關後會長出：'}{ch.grows}</p>
          {ch.playable
            ? <button className="btn green" onClick={() => enter(ch.id)}>{done ? '再穿越一次' : '穿越！'}</button>
            : <p className="building">施工中，下次再來！</p>}
        </div>
      )}

      {actor && <ActorSay actor={actor} onClose={() => setActor(null)} />}
      {!actor && <Say line={say ? { who: 'tick', mood: 'happy', text: say } : null} />}
      {flash && <div className="warp" />}
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
      <div className="face small" style={{ borderColor: '#4aa834' }}><img src={`${BASE}img/island/${art.idle}.webp`} alt="" style={{ objectFit: 'contain' }} /></div>
      <p><b style={{ color: '#2e7d22' }}>{actor.who}</b>{actor.says}</p>
      <i className="say-x">✕</i>
    </button>
  );
}
