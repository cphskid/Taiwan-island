import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import { FIR, LEVELS, SKY_H, SKY_W, geo, portById, simg, type Level } from '../data/sky';
import {
  ARRIVE, GRAB, TYPHOON_R, bumps, checkPath, feeOf, finish, inTyphoon, loadSky, portsUsed, saveSky, spawn, starsOf, step,
  typhoonAt, unlocked, type Pt, type SkySave, type Veh,
} from '../core/sky';
import { pushCloud } from '../net/cloud';
import { sfx } from '../audio';
import { SoundToggle } from './Sound';
import { ReportButton } from './Report';
import { PlaceLoading, useImagesReady } from './Ready';

// 現在篇「天空港」：塔台小調度員。按住飛機或貨櫃輪，畫一條線拉到目的地；飛機能飛過陸地，船只能走海上。
// 經過哪片海會念出名字；別國飛機飛過臺北飛航情報區要付過境費；同種交通工具靠太近算擦撞、颱風圈也危險。
// 三關：鄰居（方位）、中點站（過境費、颱風）、五洲三洋（往各洲的出口）。
const TICK = `${import.meta.env.BASE_URL}img/tick/`;
const pct = (p: Pt) => ({ left: `${(p.x / SKY_W) * 100}%`, top: `${(p.y / SKY_H) * 100}%` });

interface Game { lv: Level; t: number; next: number; queue: number; vs: Veh[]; hits: number; fee: number; seas: string[]; delivered: number; over: boolean }
const newGame = (lv: Level): Game => ({ lv, t: 0, next: 0.6, queue: 0, vs: [], hits: 0, fee: 0, seas: [], delivered: 0, over: false });

export function Sky({ onExit }: { onExit: () => void }) {
  const [s, setS] = useState<SkySave>(loadSky);
  const ready = useImagesReady(() => [simg('map')]); // 東亞地圖先讀好才掀開
  useEffect(() => { saveSky(s); pushCloud('sky', s); }, [s]);
  const [intro, setIntro] = useState<{ lv: Level; i: number } | null>(null);
  const [g, setG] = useState<Game | null>(null);
  const live = useRef<Game | null>(null);
  live.current = g;
  const [toasts, setToasts] = useState<{ k: number; text: string }[]>([]);
  const [draw, setDraw] = useState<{ id: number; pts: Pt[] } | null>(null);
  const [bad, setBad] = useState<Pt[] | null>(null);
  const [flash, setFlash] = useState<{ k: number; at: Pt; text: string }[]>([]);
  const map = useRef<HTMLDivElement>(null);

  const toast = (text: string) => {
    const k = Math.random();
    setToasts((xs) => [...xs.slice(-2), { k, text }]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.k !== k)), 3200);
  };
  const pop = (at: Pt, text: string) => {
    const k = Math.random();
    setFlash((xs) => [...xs, { k, at, text }]);
    setTimeout(() => setFlash((xs) => xs.filter((x) => x.k !== k)), 1200);
  };

  // ── 時間 ──
  const playing = !!g && !g.over;
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const cur = live.current;
      if (cur && !cur.over) setG(tick(cur, dt));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const tick = (g0: Game, dt: number): Game => {
    const g1: Game = { ...g0, t: g0.t + dt };
    const lv = g1.lv;
    // 來新的：在港口等的最多 3 個
    if (g1.queue < lv.trips.length && g1.t >= g1.next && g1.vs.filter((v) => !v.path).length < 3) {
      const tr = lv.trips[g1.queue];
      g1.vs = [...g1.vs, spawn(g1.queue + 1, tr.kind, tr.from, tr.to, g1.queue)];
      g1.queue += 1; g1.next = g1.t + lv.every;
      sfx('SE-03');
    }
    let vs = g1.vs.map((v) => {
      const n = step(v, dt * (lv.typhoon && v.path && !v.done && inTyphoon(v.at, g1.t) ? 0.5 : 1));
      for (const sea of n.seas) if (!g1.seas.includes(sea)) { g1.seas = [...g1.seas, sea]; toast(`🌊 經過「${sea}」`); }
      if (n.done && !v.done) {
        const fee = feeOf(n), to = portById(n.to);
        g1.delivered += 1; g1.fee += fee;
        sfx('SE-05');
        pop(n.at, fee ? `+${fee} 過境費` : '✓ 到了');
        if (to.dir && lv.id === 1) toast(`📍 ${to.name}（${to.country}）在臺灣的${to.dir}`);
        if (to.gate) toast(`🌏 ${to.gate}`);
      }
      return n;
    });
    // 擦撞
    for (const [a, b] of bumps(vs)) {
      g1.hits += 1; sfx('SE-04');
      vs = vs.map((v) => (v.id === a || v.id === b ? { ...v, bump: 3 } : v));
      const va = vs.find((v) => v.id === a)!;
      pop(va.at, '⚠️ 太近了！');
    }
    // 颱風圈
    if (lv.typhoon) vs = vs.map((v) => {
      if (!v.path || v.done || v.bump > 0 || !inTyphoon(v.at, g1.t)) return v;
      g1.hits += 1; sfx('SE-04'); pop(v.at, '🌀 好危險！'); toast('颱風圈裡風浪很大，航線要繞開颱風！');
      return { ...v, bump: 3 };
    });
    g1.vs = vs;
    if (g1.delivered >= lv.trips.length) { g1.over = true; sfx('SE-36'); }
    return g1;
  };

  // ── 畫線 ──
  const toMap = (e: RPE): Pt => {
    const r = map.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SKY_W, y: ((e.clientY - r.top) / r.height) * SKY_H };
  };
  const onDown = (e: RPE) => {
    if (!g || g.over) return;
    const p = toMap(e);
    const cand = g.vs.filter((v) => !v.done).map((v) => ({ v, d: Math.hypot(v.at.x - p.x, v.at.y - p.y) - (v.path ? 0 : 15) }))
      .filter((x) => x.d < GRAB).sort((a, b) => a.d - b.d)[0];
    if (!cand) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    sfx('SE-09');
    setDraw({ id: cand.v.id, pts: [cand.v.at] });
  };
  const onMove = (e: RPE) => {
    if (!draw) return;
    const p = toMap(e), last = draw.pts[draw.pts.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) >= 10) setDraw({ ...draw, pts: [...draw.pts, p] });
  };
  const onUp = () => {
    if (!draw || !g) return;
    const v = g.vs.find((x) => x.id === draw.id);
    setDraw(null);
    if (!v) return;
    const to = portById(v.to).at;
    let pts = draw.pts;
    const end = pts[pts.length - 1];
    if (Math.hypot(end.x - to.x, end.y - to.y) <= ARRIVE) pts = [...pts.slice(0, -1), to];
    const c = checkPath(v, pts);
    if (!c.ok) { sfx('SE-04'); toast(c.why!); setBad(pts); setTimeout(() => setBad(null), 700); return; }
    sfx('SE-05');
    setG((cur) => cur && { ...cur, vs: cur.vs.map((x) => (x.id === v.id ? { ...x, path: pts.slice(1) } : x)) });
  };

  const startLevel = (lv: Level) => { sfx('SE-03'); setIntro({ lv, i: 0 }); };
  const result = g?.over ? starsOf(g.lv, g.hits, g.fee) : 0;
  const drawing = draw && g?.vs.find((v) => v.id === draw.id);
  const shownPorts = g ? portsUsed(g.lv) : [];
  // 這關只看地圖的一塊（第一關放大在臺灣附近，手機上才點得到）
  const lvView = (g ?? (intro ? { lv: intro.lv } : null))?.lv.view ?? LEVELS[LEVELS.length - 1].view;
  const a = geo(lvView[0], lvView[1]), b = geo(lvView[2], lvView[3]);
  const vw = b.x - a.x, vh = b.y - a.y;

  return (
    <div className="town sky">
      <PlaceLoading pct={ready} label="天空港準備中" />
      <div className="t-stage">
        <div className="t-map sky-view" style={{ aspectRatio: `${vw} / ${vh}`, width: `min(100cqw, calc(100cqh * ${vw / vh}))` }}>
        <div className="sky-map" ref={map} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDraw(null)}
          style={{ width: `${(SKY_W / vw) * 100}%`, height: `${(SKY_H / vh) * 100}%`, left: `${(-a.x / vw) * 100}%`, top: `${(-a.y / vh) * 100}%` }}>
          <img className="t-bg" src={simg('map')} alt="東亞地圖" draggable={false} />
          <svg className="sky-svg" viewBox={`0 0 ${SKY_W} ${SKY_H}`} preserveAspectRatio="none">
            {g && g.lv.id >= 2 && (
              <g className="fir">
                <rect x={FIR.x0} y={FIR.y0} width={FIR.x1 - FIR.x0} height={FIR.y1 - FIR.y0} />
                <text x={FIR.x0 + 8} y={FIR.y0 + 26}>臺北飛航情報區</text>
              </g>
            )}
            {g?.vs.filter((v) => v.path && !v.done).map((v) => (
              <polyline key={v.id} className={`route ${v.kind}`} points={[v.at, ...v.path!].map((p) => `${p.x},${p.y}`).join(' ')} />
            ))}
            {draw && <polyline className={`route drawing ${drawing?.kind ?? ''}`} points={draw.pts.map((p) => `${p.x},${p.y}`).join(' ')} />}
            {bad && <polyline className="route bad" points={bad.map((p) => `${p.x},${p.y}`).join(' ')} />}
            {g?.lv.typhoon && !g.over && (() => { const c = typhoonAt(g.t); return <circle className="ty-ring" cx={c.x} cy={c.y} r={TYPHOON_R} />; })()}
          </svg>
          {g?.lv.typhoon && !g.over && <span className="ty" style={pct(typhoonAt(g.t))}>🌀</span>}
          {shownPorts.map((p) => (
            <span key={p.id} className={`port ${p.side ?? ''} ${p.home ? 'home' : ''} ${p.gate ? 'gate' : ''} ${drawing && drawing.to === p.id ? 'aim' : ''}`} style={pct(p.at)}>
              <i>{p.gate ? '➜' : p.kind === 'sea' ? '⚓' : p.kind === 'air' ? '✈' : '⚓✈'}</i><b>{p.name}</b>{!p.gate && <small>{p.country}</small>}
            </span>
          ))}
          {g?.vs.filter((v) => !v.done).map((v) => (
            <span key={v.id} className={`veh ${v.kind} ${v.path ? '' : 'wait'} ${v.bump > 0 ? 'hit' : ''}`} style={pct(v.at)}>
              <Craft kind={v.kind} deg={(v.heading * 180) / Math.PI} />
              <em>往{portById(v.to).name}</em>
            </span>
          ))}
          {flash.map((f) => <b key={f.k} className="sky-pop" style={pct(f.at)}>{f.text}</b>)}
        </div>
        </div>
      </div>

      <header className="v-hud">
        <button className="v-chip v-back" onClick={() => { sfx('SE-02'); if (g) setG(null); else onExit(); }}>{g ? '← 換一關' : '← 大地圖'}</button>
        <span className="v-chip">✈️ 天空港</span>
        {g && <span className="v-chip">第 {g.lv.id} 關・{g.lv.name}</span>}
        {g && <span className="v-chip">送達 {g.delivered}/{g.lv.trips.length}</span>}
        {g && g.lv.fee > 0 && <span className="v-chip">💰 過境費 {g.fee}/{g.lv.fee}</span>}
        {g && <span className={`v-chip ${g.hits ? 'bad' : ''}`}>⚠️ 擦撞 {g.hits}</span>}
        <SoundToggle className="v-chip v-sound" />
        <ReportButton className="v-chip v-sound" screen="sky" />
      </header>

      <div className="sky-toasts">{toasts.map((x) => <p key={x.k}>{x.text}</p>)}</div>

      {!g && !intro && (
        <div className="talk-cover t-cover">
          <div className="t-dist panel">
            <h2>✈️ 天空港</h2>
            <p>當塔台和港口的小調度員：按住飛機或貨櫃輪，畫線拉到目的地。</p>
            <div className="t-cases">
              {LEVELS.map((lv) => {
                const open = unlocked(s, lv.id), st = s.best[lv.id] ?? 0;
                return (
                  <button key={lv.id} className={`t-case ${st ? 'done' : ''}`} disabled={!open} onClick={() => startLevel(lv)}>
                    <i className="sky-lv">{open ? lv.id : '🔒'}</i>
                    <b>{lv.name}</b>
                    <small>{st ? '⭐'.repeat(st) + '☆'.repeat(3 - st) : open ? lv.blurb : '過了上一關才開'}</small>
                  </button>
                );
              })}
            </div>
            {s.seas.length > 0 && <p className="v-hint">🌊 去過的海：{s.seas.join('、')}</p>}
          </div>
        </div>
      )}

      {intro && (
        <div className="talk-cover" onClick={() => {
          sfx('SE-09');
          if (intro.i + 1 < intro.lv.lines.length) setIntro({ ...intro, i: intro.i + 1 });
          else { setG(newGame(intro.lv)); setIntro(null); setS({ ...s, intro: true }); }
        }}>
          <div className="talk">
            <div className="face small tick"><img src={`${TICK}happy.webp`} alt="" /></div>
            <div className="talk-body">
              <b style={{ color: '#ffc23d' }}>滴答</b>
              <p>{intro.lv.lines[intro.i]}</p>
              <span className="talk-next">{intro.i + 1 < intro.lv.lines.length ? '點一下繼續 ▶' : '點一下開始 ▶'}</span>
            </div>
          </div>
        </div>
      )}

      {g?.over && (
        <div className="talk-cover t-cover">
          <div className="t-news panel sky-end">
            <small>天空港・今日報告</small>
            <h2>第 {g.lv.id} 關「{g.lv.name}」完成！</h2>
            <p className="stars">{'⭐'.repeat(result)}{'☆'.repeat(3 - result)}</p>
            <p>送達 {g.delivered} 班・擦撞 {g.hits} 次{g.lv.fee > 0 ? `・過境費 ${g.fee}（目標 ${g.lv.fee}）` : ''}</p>
            <div className="t-tick"><div className="face small tick"><img src={`${TICK}happy.webp`} alt="" /></div><p>{g.lv.learn}</p></div>
            {g.seas.length > 0 && <p className="v-hint">這一關經過的海：{g.seas.join('、')}</p>}
            {result < 3 && <p className="v-hint">三顆星：不擦撞{g.lv.fee > 0 ? `，而且收到 ${g.lv.fee} 過境費` : ''}。</p>}
            <button className="btn green" onClick={() => { setS(finish(s, g.lv.id, result, g.seas)); setG(null); }}>好</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 飛機、貨櫃輪（從正上方看，機頭／船頭朝右，跟著航向轉）
function Craft({ kind, deg }: { kind: 'plane' | 'ship'; deg: number }) {
  return (
    <svg viewBox="-24 -24 48 48" style={{ rotate: `${deg}deg` }} aria-hidden>
      {kind === 'plane' ? (
        <g>
          <path d="M20 0 L14 -3 L-12 -3 L-18 -2 L-18 2 L-12 3 L14 3 Z" fill="#fff" stroke="#2b5d7a" strokeWidth="1.6" />
          <path d="M4 -3 L-6 -20 L-10 -20 L-4 -3 Z M4 3 L-6 20 L-10 20 L-4 3 Z" fill="#e9f3fb" stroke="#2b5d7a" strokeWidth="1.6" />
          <path d="M-12 -3 L-18 -10 L-21 -10 L-17 -2 Z M-12 3 L-18 10 L-21 10 L-17 2 Z" fill="#3b8bb0" stroke="#2b5d7a" strokeWidth="1.4" />
        </g>
      ) : (
        <g>
          <path d="M22 0 L14 -8 L-18 -8 L-20 0 L-18 8 L14 8 Z" fill="#c9442b" stroke="#5a1e12" strokeWidth="1.6" />
          <rect x="-13" y="-6" width="7" height="12" fill="#f2b33d" /><rect x="-5" y="-6" width="7" height="12" fill="#3b8bb0" />
          <rect x="3" y="-6" width="7" height="12" fill="#5fb85a" /><rect x="-19" y="-5" width="5" height="10" fill="#fff" />
        </g>
      )}
    </svg>
  );
}
