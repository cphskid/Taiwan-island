import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPE, type WheelEvent as RWE } from 'react';
import {
  AREAS, BUILDINGS, BUILD_ORDER, COMBOS, GOODS, JOB_ART, MONTH_SEASON, PLAZA, SEASON_NAME, STAR_AT, TAGS, TUTORIAL, TUTORIAL_END,
  VH, VW, VILLAGE_LINES, dist, vimg, type Good, type Kind,
} from '../data/village';
import {
  PREPARE, REPAIR, WEATHER, advance, areaOpen, assign, build, canPlace, canSeine, capacity, checkQuests, combosOf, currentQuest,
  demolish, freshVillage, idle, loadVillage, move, prepare, rating, repair, saveVillage, seine, seineFish, stars, threat, unassign,
  workerOf, type Bld, type MonthReport, type Village as V,
} from '../core/village';
import type { Pt } from '../core/world';
import { pushCloud } from '../net/cloud';
import { sfx } from '../audio';
import { Beacon, Goal } from './Guide';
import { Say } from './Talk';
import { SoundToggle } from './Sound';
import { ReportButton } from './Report';

// 現在篇「風與海的漁村」：開羅式建村經營。
// 地圖可以拖、可以用兩指（或滑鼠滾輪、右下的＋－）縮放；第一次進來有新手教學帶著蓋三棟（時間先停著）。
// 之後一個月約 14 秒自己往前走（可暫停、可快轉）；蓋房子、派人、躲颱風；有網寮就能叫全村牽罟。
// 進度每次變動都存在這台平板，有登入就同步到雲端的 village 那格。
const MONTH_MS = 14000;
const pct = (p: Pt) => ({ left: `${(p.x / VW) * 100}%`, top: `${(p.y / VH) * 100}%` });
const wpct = (w: number) => `${(w / VW) * 100}%`;

type Placing = { kind: Kind; id?: number; at: Pt } | null;
type Alert = { kind: 'typhoon' | 'cold' } | null;
type Cam = { x: number; y: number; z: number }; // 畫面中央是地圖上的哪一點、1 個地圖單位幾 px

export function Village({ onExit }: { onExit: () => void }) {
  const [s, setS] = useState<V>(loadVillage);
  useEffect(() => { saveVillage(s); pushCloud('village', s); }, [s]);
  const [intro, setIntro] = useState(!s.intro ? 0 : -1);
  const [speed, setSpeed] = useState<0 | 1 | 2>(1);
  const [prog, setProg] = useState(0); // 這個月走了多少（0～1）
  const [placing, setPlacing] = useState<Placing>(null);
  const [menu, setMenu] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [alert, setAlert] = useState<Alert>(null);
  const [seining, setSeining] = useState(false);
  const [say, setSay] = useState<string | null>(null);
  const [toast, setToast] = useState<string[]>([]);
  const [pops, setPops] = useState<{ key: number; id: number; text: string }[]>([]);
  const [restart, setRestart] = useState(false);
  const [t, setT] = useState(0); // 動畫時間（村民走路）
  const live = useRef(s);
  live.current = s;

  const tut = s.tut < TUTORIAL.length ? TUTORIAL[s.tut] : null; // 教學中：這一步要蓋哪一棟
  const tutEnd = s.tut === TUTORIAL.length; // 三棟蓋完，最後一段說明
  const paused = speed === 0 || intro >= 0 || !!alert || seining || !!tut || tutEnd || restart;

  // ── 鏡頭 ──
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 600 });
  const [cam, setCam] = useState<Cam>({ x: 1000, y: 560, z: 0 });
  const [fly, setFly] = useState(false);
  useLayoutEffect(() => {
    const el = stage.current!;
    const fit = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const zMin = Math.min(size.w / VW, size.h / VH);
  const zMax = Math.max(size.w / VW, size.h / VH) * 2.6;
  const clamp = (c: Cam): Cam => {
    const z = Math.max(zMin, Math.min(zMax, c.z || Math.max(size.w / VW, size.h / VH) * 1.35));
    const hw = size.w / (2 * z), hh = size.h / (2 * z);
    return { z, x: VW * z > size.w ? Math.max(hw, Math.min(VW - hw, c.x)) : VW / 2, y: VH * z > size.h ? Math.max(hh, Math.min(VH - hh, c.y)) : VH / 2 };
  };
  const view = clamp(cam);
  const flyTo = (p: Pt, z?: number) => { setFly(true); setCam({ x: p.x, y: p.y, z: z ?? view.z }); setTimeout(() => setFly(false), 650); };
  const zoomAt = (k: number, sx = size.w / 2, sy = size.h / 2) => setCam((c0) => {
    const c = clamp(c0);
    const mx = c.x + (sx - size.w / 2) / c.z, my = c.y + (sy - size.h / 2) / c.z;
    const z = Math.max(zMin, Math.min(zMax, c.z * k));
    return { z, x: mx - (sx - size.w / 2) / z, y: my - (sy - size.h / 2) / z };
  });
  const toMap = (cx: number, cy: number): Pt => {
    const r = stage.current!.getBoundingClientRect();
    return { x: view.x + (cx - r.left - size.w / 2) / view.z, y: view.y + (cy - r.top - size.h / 2) / view.z };
  };

  // 手勢：一指拖地圖（按在要蓋的建築上就是拖建築）、兩指縮放、點一下把要蓋的建築移過去
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef({ moved: false, ghost: false, x: 0, y: 0, pinch: 0 });
  const onDown = (e: RPE) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = toMap(e.clientX, e.clientY);
    g.current = { moved: false, ghost: ptrs.current.size === 1 && !!placing && dist(p, placing.at) < BUILDINGS[placing.kind].width * 0.6, x: e.clientX, y: e.clientY, pinch: 0 };
  };
  const onMove = (e: RPE) => {
    const old = ptrs.current.get(e.pointerId);
    if (!old) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.current.pinch) {
        const r = stage.current!.getBoundingClientRect();
        zoomAt(d / g.current.pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      }
      g.current.pinch = d; g.current.moved = true;
      return;
    }
    if (!g.current.moved && Math.hypot(e.clientX - g.current.x, e.clientY - g.current.y) < 8) return;
    g.current.moved = true;
    if (g.current.ghost && placing) { setPlacing({ ...placing, at: toMap(e.clientX, e.clientY) }); return; }
    setCam((c0) => { const c = clamp(c0); return { ...c, x: c.x - (e.clientX - old.x) / c.z, y: c.y - (e.clientY - old.y) / c.z }; });
  };
  const onUp = (e: RPE) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size) return;
    if (!g.current.moved && placing) setPlacing({ ...placing, at: toMap(e.clientX, e.clientY) });
  };
  const onWheel = (e: RWE) => {
    const r = stage.current!.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
  };

  // ── 時間 ──
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(100, now - last); last = now;
      acc += dt;
      if (acc > 60) { setT(now / 1000); acc = 0; }
      if (!paused) setProg((p) => p + (dt * speed) / MONTH_MS);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused, speed]);

  useEffect(() => {
    if (prog < 1) return;
    setProg(0);
    const { s: n, r } = advance(live.current);
    setS(n);
    report(r);
    const th = threat(n);
    if (th) { setAlert({ kind: th }); sfx('SE-04'); }
  }, [prog]); // eslint-disable-line react-hooks/exhaustive-deps

  // 一進來剛好碰上颱風／寒流月，也要先跳警報
  useEffect(() => { const th = threat(s); if (th && !s.prepared && s.tut > TUTORIAL.length) setAlert({ kind: th }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (msgs: string[]) => { setToast(msgs); setTimeout(() => setToast([]), 4000); };
  const report = (r: MonthReport) => {
    if (r.pops.length) {
      sfx('SE-35');
      const base = Date.now();
      setPops(r.pops.map((p, i) => ({ key: base + i, ...p })));
      setTimeout(() => setPops((q) => q.filter((x) => x.key < base)), 2400);
    }
    const msgs = [...r.arrived.map((n) => `🏠 ${n}搬回村子了！`), ...(r.quest ? [`🎯 任務完成！${r.quest.split('。')[0]}`] : [])];
    if (msgs.length) flash(msgs);
    if (r.quest) sfx('SE-36');
    if (r.news.length) setSay(r.news.join(''));
  };

  // 蓋、搬完馬上檢查任務（不用等月底）
  const commit = (n: V) => {
    const q = currentQuest(n);
    const c = checkQuests(n);
    if (c !== n && q) { sfx('SE-36'); flash([`🎯 任務完成！${q.text.split('。')[0]}　+${q.reward}💰`]); }
    setS(c);
  };

  const check = placing ? canPlace(s, placing.kind, placing.at, placing.id) : null;
  const confirm = () => {
    if (!placing || !check?.ok) { sfx('SE-04'); return; }
    sfx('SE-05');
    let n = placing.id ? move(s, placing.id, placing.at) : build(s, placing.kind, placing.at);
    if (tut && !placing.id && placing.kind === tut.kind) {
      n = { ...n, tut: n.tut + 1 };
      const next = TUTORIAL[n.tut];
      if (next) setTimeout(() => flyTo(next.at), 300);
    }
    commit(n);
    setPlacing(null);
  };
  const startBuild = (k: Kind) => {
    const d = BUILDINGS[k];
    if (tut && k !== tut.kind) { sfx('SE-04'); setSay(`先蓋${BUILDINGS[tut.kind].name}，教完就能蓋別的了。`); return; }
    if (stars(s) < d.stars || s.coins < d.cost) { sfx('SE-04'); return; }
    sfx('SE-03'); setMenu(false); setPick(null);
    // 要蓋的建築先出現在畫面中間（教學時放在目標旁邊一點，讓小朋友學會點、拖）
    const start = tut ? { x: tut.at.x + 170, y: tut.at.y - 110 } : { x: view.x, y: view.y };
    setPlacing({ kind: k, at: start });
    if (tut) flyTo({ x: tut.at.x + 80, y: tut.at.y - 40 });
  };

  // 村民住哪一間、在哪裡工作
  const homes = useMemo(() => {
    const out = new Map<number, Bld>();
    const houses = s.b.filter((b) => BUILDINGS[b.kind].home);
    let i = 0;
    for (const h of houses) for (let k = 0; k < (BUILDINGS[h.kind].home ?? 0) && i < s.people.length; k++) out.set(s.people[i++].id, h);
    return out;
  }, [s.b, s.people]);

  const people = s.people.map((p, i) => {
    const home = homes.get(p.id)?.at ?? PLAZA;
    const job = s.b.find((b) => b.worker === p.id);
    const ph = (t / 18 + i * 0.37) % 1;
    let at: Pt, art: string, walking = false;
    if (job) {
      art = JOB_ART[BUILDINGS[job.kind].job!];
      const w = { x: job.at.x + ((i % 3) - 1) * 30, y: job.at.y + 26 };
      const h = { x: home.x + 20, y: home.y + 30 };
      if (ph < 0.12) { at = lerp(h, w, ph / 0.12); walking = true; }
      else if (ph < 0.82) at = { x: w.x + Math.sin(t * 0.8 + i) * 10, y: w.y };
      else { at = lerp(w, h, (ph - 0.82) / 0.18); walking = true; }
    } else {
      art = p.kid ? 'v4-8' : i % 2 ? 'v4-4' : 'v4-1';
      const a = t * (p.kid ? 0.5 : 0.18) + i * 1.7;
      at = { x: PLAZA.x + Math.cos(a) * (p.kid ? 130 : 90 + i * 8), y: PLAZA.y + 40 + Math.sin(a) * 50 };
      walking = true;
    }
    return { p, at, art, flip: walking && Math.cos(t * 0.18 + i) < 0 };
  });
  const tourists = s.b.filter((b) => b.kind === 'guesthouse' && b.worker !== null && !b.broken).flatMap((gh, j) => [0, 1].map((k) => {
    const a = t * 0.12 + j + k * 3;
    return { key: `${gh.id}-${k}`, at: { x: gh.at.x + Math.cos(a) * 160, y: gh.at.y + 60 + Math.sin(a) * 60 } };
  }));

  const st = stars(s), rt = rating(s);
  const nextAt = STAR_AT[st] ?? null;
  const quest = currentQuest(s);
  const picked = s.b.find((b) => b.id === pick) ?? null;
  const season = MONTH_SEASON(s.month);
  const zoomedIn = view.z > zMin * 1.6; // 放大了才在建築底下寫名字
  const crowded = s.people.length > capacity(s);
  const free = idle(s);

  // 教學這一小步要指哪裡
  const tStep = !tut || intro >= 0 ? null
    : placing?.kind === tut.kind && !placing.id ? (check?.ok && dist(placing.at, tut.at) < 140 ? 'confirm' : 'place')
    : menu ? 'pick' : 'open';
  const coach = !tut ? null
    : tStep === 'open' ? `${tut.say}點右下角的「🔨 蓋」。`
    : tStep === 'pick' ? `選「${BUILDINGS[tut.kind].name}」。`
    : tStep === 'place' ? `點地圖上發亮的地方，${BUILDINGS[tut.kind].name}就會移過去（也可以按住它拖）。`
    : '綠色代表這裡可以蓋，按「蓋在這裡」！';

  const sprites = [
    ...s.b.filter((b) => b.id !== placing?.id).map((b) => {
      const d = BUILDINGS[b.kind], lack = d.job && b.worker === null && !b.broken;
      return { y: b.at.y, el: (
        <button key={`b${b.id}`} className={`v-bld ${b.broken ? 'broken' : ''} ${pick === b.id ? 'on' : ''}`}
          style={{ ...pct(b.at), width: wpct(d.width), zIndex: Math.round(b.at.y) }}
          onClick={(e) => { e.stopPropagation(); if (placing || g.current.moved) return; sfx('SE-01'); setMenu(false); setPick(pick === b.id ? null : b.id); }}>
          <img src={vimg(d.art)} alt={d.name} draggable={false} />
          {b.broken && <i className="v-flag">💥 壞了</i>}
          {lack && <i className="v-flag lack">缺人</i>}
          {zoomedIn && <i className="v-name">{d.name}</i>}
        </button>
      ) };
    }),
    ...people.map(({ p, at, art, flip }) => ({ y: at.y, el: (
      <img key={`p${p.id}`} className={`v-person ${flip ? 'flip' : ''}`} src={vimg(art)} alt="" draggable={false}
        style={{ ...pct(at), zIndex: Math.round(at.y) }} />
    ) })),
    ...tourists.map((x) => ({ y: x.at.y, el: <img key={x.key} className="v-person" src={vimg('v4-7')} alt="" style={{ ...pct(x.at), zIndex: Math.round(x.at.y) }} /> })),
  ];

  return (
    <div className={`village season-${season} w-${s.weather}`}>
      <div className="v-stage" ref={stage} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
        onClick={() => { if (!placing && !g.current.moved) { setPick(null); setMenu(false); } }}>
        <div className={`v-map ${fly ? 'fly' : ''}`} style={{
          width: VW * view.z, height: VH * view.z, left: size.w / 2 - view.x * view.z, top: size.h / 2 - view.y * view.z,
          fontSize: Math.max(10, Math.min(18, view.z * 22)),
        }}>
          <img className="v-bg" src={vimg('v1-bg')} alt="" draggable={false} />
          {sprites.map((x) => x.el)}
          {(Object.entries(AREAS) as [keyof typeof AREAS, (typeof AREAS)[keyof typeof AREAS]][]).filter(([k]) => !areaOpen(s, k)).map(([k, a]) => (
            <div key={k} className="v-fog" style={{ left: wpct(a.box[0]), top: `${(a.box[1] / VH) * 100}%`, width: wpct(a.box[2] - a.box[0]), height: `${((a.box[3] - a.box[1]) / VH) * 100}%`, zIndex: 3000 }}>
              <span>{a.name}<br />村子 {'⭐'.repeat(a.stars)} 就散開</span>
            </div>
          ))}
          {placing && (
            <div className={`v-ghost ${check?.ok ? 'ok' : 'bad'}`} style={{ ...pct(placing.at), width: wpct(BUILDINGS[placing.kind].width), zIndex: 4000 }}>
              <img src={vimg(BUILDINGS[placing.kind].art)} alt="" draggable={false} />
              <span className="v-ring" />
            </div>
          )}
          {tut && tStep === 'place' && <div className="v-beacon"><Beacon style={pct(tut.at)} label="蓋在這裡" /></div>}
          {pops.map((p) => { const b = s.b.find((x) => x.id === p.id); return b && <b key={p.key} className="v-pop" style={{ ...pct(b.at), zIndex: 5000 }}>{p.text}</b>; })}
        </div>
        <div className="v-weather" />
      </div>

      <header className="v-hud">
        <button className="v-chip v-back" onClick={() => { sfx('SE-02'); onExit(); }}>← 大地圖</button>
        <div className="v-chip v-date" title="時間">
          <span>{s.year > 1 ? `第${s.year}年 ` : ''}{s.month}月 {SEASON_NAME[season]} {WEATHER[s.weather].icon}</span>
          <i className="v-month"><i style={{ width: `${Math.min(1, prog) * 100}%` }} /></i>
        </div>
        <div className="v-chip v-res">
          <span title="錢">💰{s.coins}</span>
          {(Object.keys(GOODS) as Good[]).filter((gd) => s.goods[gd] > 0).map((gd) => <span key={gd} title={GOODS[gd].name}>{GOODS[gd].icon}{s.goods[gd]}</span>)}
          <span className={crowded ? 'warn' : ''} title="村民／床位">👥{s.people.length}/{capacity(s)}</span>
          {free.length > 0 && <span className="idle" title={`閒著：${free.map((p) => p.name).join('、')}`}>閒著{free.length}人</span>}
        </div>
        <div className="v-chip v-stars" title={`村子評價 ${rt}`}>
          <span>{'⭐'.repeat(st)}<em>{'☆'.repeat(5 - st)}</em></span>
          {nextAt !== null && <i className="v-month"><i style={{ width: `${Math.min(1, (rt - STAR_AT[st - 1]) / (nextAt - STAR_AT[st - 1])) * 100}%` }} /></i>}
        </div>
        <div className="v-chip v-speed">
          {([0, 1, 2] as const).map((v) => <button key={v} className={speed === v ? 'on' : ''} aria-label={['暫停', '播放', '快轉'][v]} onClick={() => { sfx('SE-01'); setSpeed(v); }}>{['⏸', '▶', '⏩'][v]}</button>)}
        </div>
        <SoundToggle className="v-chip v-sound" />
        <ReportButton className="v-chip v-sound" screen="village" />
      </header>

      {coach && (
        <div className="v-coach">
          <img src={`${import.meta.env.BASE_URL}img/tick/happy.webp`} alt="" />
          <p><b>教學 {s.tut + 1}/{TUTORIAL.length}</b>{coach}</p>
        </div>
      )}
      {!tut && !tutEnd && quest && intro < 0 && !placing && <Goal text={quest.text} floating />}
      {s.done && !quest && <div className="quest floating"><i>🎉</i><span>五顆星！漁村又熱鬧起來了</span></div>}

      <div className="v-zoom">
        <button onClick={() => zoomAt(1.3)} aria-label="放大">＋</button>
        <button onClick={() => zoomAt(1 / 1.3)} aria-label="縮小">－</button>
        <button onClick={() => flyTo({ x: VW / 2, y: VH / 2 }, zMin)} aria-label="看全部">⤢</button>
      </div>

      {!placing && (
        <footer className="v-bar">
          {s.b.some((b) => b.kind === 'netshed') && (
            <button className="btn" disabled={!canSeine(s)} onClick={(e) => { e.stopPropagation(); sfx('SE-03'); setSeining(true); }}>
              🎣 牽罟{canSeine(s) ? '' : s.weather === 'typhoon' ? '（颱風）' : '（下個月）'}
            </button>
          )}
          <span className="v-point-wrap">
            <button className="btn green v-build" onClick={(e) => { e.stopPropagation(); sfx('SE-03'); setPick(null); setMenu(!menu); }}>🔨 蓋</button>
            {tStep === 'open' && <Point />}
          </span>
        </footer>
      )}

      {menu && (
        <div className="v-menu panel" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {BUILD_ORDER.map((k) => {
            const d = BUILDINGS[k], lock = st < d.stars, poor = s.coins < d.cost, other = !!tut && k !== tut.kind;
            return (
              <span key={k} className="v-point-wrap">
                <button className={`v-item ${lock ? 'lock' : poor ? 'poor' : ''} ${other ? 'dim' : ''}`} onClick={() => startBuild(k)}>
                  <img src={vimg(d.art)} alt="" />
                  <b>{d.name}</b>
                  <em>{TAGS[k]}</em>
                  <small>{lock ? `🔒 要 ${'⭐'.repeat(d.stars)}` : `💰 ${d.cost}`}</small>
                </button>
                {tStep === 'pick' && k === tut?.kind && <Point />}
              </span>
            );
          })}
        </div>
      )}

      {placing && (
        <div className="v-place panel" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <p className={check?.ok ? 'ok' : 'bad'}>{check?.ok ? `✓ ${BUILDINGS[placing.kind].name}可以蓋在這裡` : `✕ ${check?.why}`}</p>
          <PlaceHint s={s} kind={placing.kind} at={placing.at} id={placing.id} />
          <div>
            {!tut && <button className="btn" onClick={() => { sfx('SE-02'); setPlacing(null); }}>取消</button>}
            <span className="v-point-wrap">
              <button className="btn green" disabled={!check?.ok} onClick={confirm}>{placing.id ? '搬到這裡' : '蓋在這裡'}</button>
              {tStep === 'confirm' && <Point />}
            </span>
          </div>
        </div>
      )}

      {picked && !placing && (
        <BuildingCard s={s} b={picked}
          onAssign={() => { sfx('SE-05'); commit(assign(s, picked.id)); }}
          onUnassign={() => { sfx('SE-02'); setS(unassign(s, picked.id)); }}
          onRepair={() => { sfx('SE-05'); setS(repair(s, picked.id)); }}
          onMove={() => { sfx('SE-03'); setPlacing({ kind: picked.kind, id: picked.id, at: picked.at }); setPick(null); }}
          onDemolish={() => { sfx('SE-02'); setS(demolish(s, picked.id)); setPick(null); }}
          onClose={() => setPick(null)} />
      )}

      {toast.length > 0 && <div className="v-toast">{toast.map((x) => <p key={x}>{x}</p>)}</div>}
      <Say line={say ? { who: 'tick', mood: 'thinking', text: say } : null} />

      {speed === 0 && !restart && !tut && intro < 0 && (
        <div className="v-paused panel">
          <b>⏸ 暫停中</b>
          <button className="btn green" onClick={() => { sfx('SE-01'); setSpeed(1); }}>繼續</button>
          <button className="btn" onClick={() => setRestart(true)}>從頭開始</button>
        </div>
      )}
      {restart && (
        <div className="talk-cover">
          <div className="v-alert panel">
            <h2>真的要從頭開始嗎？</h2>
            <p>村子會回到一開始的樣子，建築和錢都會不見。</p>
            <div>
              <button className="btn" onClick={() => setRestart(false)}>不要</button>
              <button className="btn red" onClick={() => { sfx('SE-02'); setS(freshVillage()); setIntro(0); setRestart(false); setSpeed(1); setPlacing(null); setPick(null); setCam({ x: 1000, y: 560, z: 0 }); }}>從頭開始</button>
            </div>
          </div>
        </div>
      )}

      {alert && (
        <div className="talk-cover">
          <div className="v-alert panel">
            {alert.kind === 'typhoon' ? (
              <>
                <h2>🌀 颱風警報！</h2>
                <p>氣象局說這個月有颱風要來。要先做防颱準備嗎？把漁船拉上岸、綁好屋頂、堆沙包。</p>
                {!s.b.some((b) => b.kind === 'shelter') && <p className="v-hint">村子還沒有避難所。之後蓋一間，颱風夜大家就不怕了。</p>}
              </>
            ) : (
              <>
                <h2>🥶 寒流要來了！</h2>
                <p>虱目魚很怕冷，水溫太低會凍死。要先幫魚塭加深水、搭防風棚嗎？</p>
              </>
            )}
            <div>
              <button className="btn" onClick={() => { sfx('SE-02'); setAlert(null); }}>先不要</button>
              <button className="btn green" disabled={s.coins < PREPARE} onClick={() => { sfx('SE-05'); setS(prepare(s)); setAlert(null); }}>做好準備（💰{PREPARE}）</button>
            </div>
          </div>
        </div>
      )}

      {seining && <Seine people={s.people.length} fish={(gd) => seineFish(s, gd)}
        onDone={(good) => { setSeining(false); if (good >= 0) commit(seine(s, good)); }} />}

      {tutEnd && intro < 0 && (
        <div className="talk-cover" onClick={() => { sfx('SE-36'); setS({ ...s, tut: TUTORIAL.length + 1 }); }}>
          <div className="talk">
            <div className="face small tick"><img src={`${import.meta.env.BASE_URL}img/tick/happy.webp`} alt="" /></div>
            <div className="talk-body">
              <b style={{ color: '#ffc23d' }}>滴答</b>
              <p>{TUTORIAL_END}</p>
              <span className="talk-next">點一下開始經營 ▶</span>
            </div>
          </div>
        </div>
      )}

      {intro >= 0 && (
        <div className="talk-cover" onClick={() => {
          sfx('SE-09');
          if (intro + 1 < VILLAGE_LINES.intro.length) setIntro(intro + 1);
          else { setIntro(-1); setS({ ...s, intro: true }); if (TUTORIAL[s.tut]) flyTo(TUTORIAL[s.tut].at); }
        }}>
          <div className="talk">
            <div className="face small tick"><img src={`${import.meta.env.BASE_URL}img/tick/happy.webp`} alt="" /></div>
            <div className="talk-body">
              <b style={{ color: '#ffc23d' }}>滴答</b>
              <p>{VILLAGE_LINES.intro[intro]}</p>
              <span className="talk-next">{intro + 1 < VILLAGE_LINES.intro.length ? '點一下繼續 ▶' : '點一下開始 ▶'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lerp = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

// 教學時指著按鈕的小箭頭
function Point() {
  return <i className="v-point" aria-hidden>👇</i>;
}

// 拖的時候：附近有哪些可以搭配
function PlaceHint({ s, kind, at, id }: { s: V; kind: Kind; at: Pt; id?: number }) {
  const fake: Bld = { id: id ?? -1, kind, at, worker: null };
  const got = combosOf({ ...s, b: [...s.b.filter((b) => b.id !== id), fake] }, fake);
  const can = COMBOS.filter(([a, b]) => a === kind || b === kind).map(([a, b]) => BUILDINGS[a === kind ? b : a].name);
  if (got.length) return <p className="combo">✨ 旁邊有 {got.map((x) => BUILDINGS[x.with.kind].name).join('、')}，產量 +{got.length * 25}%</p>;
  if (can.length) return <p className="v-hint">靠近 {[...new Set(can)].slice(0, 4).join('、')} 有加成</p>;
  return null;
}

function BuildingCard({ s, b, onAssign, onUnassign, onRepair, onMove, onDemolish, onClose }: {
  s: V; b: Bld; onAssign: () => void; onUnassign: () => void; onRepair: () => void; onMove: () => void; onDemolish: () => void; onClose: () => void;
}) {
  const d = BUILDINGS[b.kind];
  const w = workerOf(s, b);
  const combos = combosOf(s, b);
  const can = COMBOS.filter(([x, y]) => x === b.kind || y === b.kind).map(([x, y]) => BUILDINGS[x === b.kind ? y : x].name);
  const [sure, setSure] = useState(false);
  const free = idle(s);
  return (
    <div className="v-card panel" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <button className="x" onClick={() => { sfx('SE-02'); onClose(); }} aria-label="關掉">✕</button>
      <div className="v-card-head">
        <img src={vimg(d.art)} alt="" />
        <div><h2>{d.name}</h2><em>{TAGS[b.kind]}</em></div>
      </div>
      <p>{d.does}</p>
      {b.broken && <p className="bad">💥 被颱風吹壞了，修好才能用。<button className="btn green" disabled={s.coins < REPAIR} onClick={onRepair}>修理（💰{REPAIR}）</button></p>}
      {d.job && (
        <p className="v-worker">
          {w ? <><img src={vimg(JOB_ART[d.job])} alt="" /> {w.name}在這裡工作 <button className="btn" onClick={onUnassign}>叫回來</button></>
            : free.length ? <><b className="bad">缺人！</b>沒人工作就不會生產。<button className="btn green" onClick={onAssign}>派 {free[0].name}</button></>
              : <><b className="bad">缺人！</b>沒有閒著的人了。多蓋房子，就會有人搬回來。</>}
        </p>
      )}
      {combos.length > 0 && <p className="combo">✨ {combos.map((c) => `${BUILDINGS[c.with.kind].name}：${c.why}`).join('；')}（產量 +{combos.length * 25}%）</p>}
      {!combos.length && can.length > 0 && <p className="v-hint">搬到 {[...new Set(can)].join('、')} 旁邊會有加成</p>}
      <div className="v-card-btns">
        <button className="btn" onClick={onMove}>搬家</button>
        {sure ? <button className="btn red" onClick={onDemolish}>真的拆（退 💰{Math.floor(d.cost / 2)}）</button>
          : <button className="btn" onClick={() => setSure(true)}>拆掉</button>}
      </div>
    </div>
  );
}

// 牽罟：網子用小船放進海裡圍一圈，岸上的人分兩邊一起拉。游標進綠色區按「拉！」，人越多綠色越寬。
const PULLS = 6;
function Seine({ people, fish, onDone }: { people: number; fish: (good: number) => number; onDone: (good: number) => void }) {
  const [step, setStep] = useState(-1); // -1 說明、0..PULLS-1 拉、PULLS 結果
  const [good, setGood] = useState(0);
  const [x, setX] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'miss' | null>(null);
  const zone = Math.min(0.42, 0.12 + people * 0.03);
  const z0 = 0.5 - zone / 2;
  useEffect(() => {
    if (step < 0 || step >= PULLS) return;
    let raf = 0; const t0 = performance.now(); const sp = 0.9 + step * 0.12;
    const loop = (now: number) => { const k = ((now - t0) / 1000) * sp; setX(Math.abs(((k % 2) + 2) % 2 - 1)); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step]);
  const pull = () => {
    const ok = x >= z0 && x <= z0 + zone;
    sfx(ok ? 'SE-05' : 'SE-04');
    if (ok) setGood((n) => n + 1);
    setFlash(ok ? 'ok' : 'miss'); setTimeout(() => setFlash(null), 350);
    setStep(step + 1);
  };
  const crew = Math.min(people, 10);
  return (
    <div className="talk-cover">
      <div className="v-seine panel">
        <h2>🎣 牽罟</h2>
        {step < 0 && (
          <>
            <p>牽罟是臺灣海邊的傳統捕魚法：小船把大網放進海裡圍一大圈，岸上的人分成兩邊，一起把網拉回沙灘。</p>
            <p>一個人拉不動，要全村一起！村子現在有 {people} 個人，人越多越好拉。</p>
            <p className="v-hint">游標走到綠色的地方，按「拉！」。一共拉 {PULLS} 下。</p>
            <div><button className="btn" onClick={() => onDone(-1)}>下次再說</button><button className="btn green" onClick={() => { sfx('SE-03'); setStep(0); }}>開始牽罟</button></div>
          </>
        )}
        {step >= 0 && step < PULLS && (
          <>
            <div className={`v-crew ${flash ?? ''}`}>
              {Array.from({ length: crew }, (_, i) => <img key={i} src={vimg('v4-1')} alt="" style={{ animationDelay: `${i * 0.05}s` }} />)}
            </div>
            <div className="v-net"><i style={{ width: `${(step / PULLS) * 100}%` }} /><span>🐟 網子拉回來 {step}/{PULLS}</span></div>
            <div className="v-gauge">
              <i className="zone" style={{ left: `${z0 * 100}%`, width: `${zone * 100}%` }} />
              <i className="cursor" style={{ left: `${x * 100}%` }} />
            </div>
            <button className="btn green big" onPointerDown={pull}>拉！</button>
          </>
        )}
        {step >= PULLS && (
          <>
            <p>網子拉上岸了！拉得整齊 {good} 次，網裡有 <b>{fish(good)} 條魚</b>。</p>
            <p className="v-hint">牽罟的魚大家一起分，這就是漁村「大家一起來」的精神。</p>
            <div><button className="btn green" onClick={() => { sfx('SE-36'); onDone(good); }}>收網 +{fish(good)}🐟</button></div>
          </>
        )}
      </div>
    </div>
  );
}
