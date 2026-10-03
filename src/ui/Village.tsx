import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react';
import {
  AREAS, BUILDINGS, BUILD_ORDER, COMBOS, GOODS, JOB_ART, MONTH_SEASON, PLAZA, SEASON_NAME, STAR_AT, VH, VW, VILLAGE_LINES, vimg,
  type Good, type Kind,
} from '../data/village';
import {
  PREPARE, REPAIR, WEATHER, advance, areaOpen, assign, build, canPlace, canSeine, capacity, checkQuests, combosOf, currentQuest,
  demolish, idle, loadVillage, move, prepare, rating, repair, saveVillage, seine, seineFish, stars, threat, unassign, workerOf,
  type Bld, type MonthReport, type Village as V,
} from '../core/village';
import type { Pt } from '../core/world';
import { sfx } from '../audio';
import { Goal } from './Guide';
import { Say } from './Talk';
import { SoundToggle } from './Sound';

// 現在篇「風與海的漁村」：開羅式建村經營。
// 一個月約 14 秒自己往前走（可暫停、可快轉）；蓋房子、派人、躲颱風；有網寮就能叫全村牽罟。
const MONTH_MS = 14000;
const pct = (p: Pt) => ({ left: `${(p.x / VW) * 100}%`, top: `${(p.y / VH) * 100}%` });
const wpct = (w: number) => `${(w / VW) * 100}%`;

type Placing = { kind: Kind; id?: number; at: Pt } | null;
type Alert = { kind: 'typhoon' | 'cold' } | null;

export function Village({ onExit }: { onExit: () => void }) {
  const [s, setS] = useState<V>(loadVillage);
  useEffect(() => { saveVillage(s); }, [s]);
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
  const [t, setT] = useState(0); // 動畫時間（村民走路）
  const map = useRef<HTMLDivElement>(null);
  const live = useRef(s);
  live.current = s;

  const paused = speed === 0 || intro >= 0 || !!alert || seining;

  // 動畫＋月份計時
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

  // 一個月走完
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
  useEffect(() => { const th = threat(s); if (th && !s.prepared) setAlert({ kind: th }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const report = (r: MonthReport) => {
    if (r.pops.length) {
      sfx('SE-35');
      const base = Date.now();
      setPops(r.pops.map((p, i) => ({ key: base + i, ...p })));
      setTimeout(() => setPops((q) => q.filter((x) => x.key < base)), 2400);
    }
    const msgs = [...r.arrived.map((n) => `🏠 ${n}搬回村子了！`), ...(r.quest ? [`🎯 任務完成！${r.quest.split('。')[0]}`] : [])];
    if (msgs.length) { setToast(msgs); setTimeout(() => setToast([]), 4000); }
    if (r.quest) sfx('SE-36');
    if (r.news.length) setSay(r.news.join(''));
  };

  // 蓋、搬完馬上檢查任務（不用等月底）
  const commit = (n: V) => {
    const q = currentQuest(n);
    const c = checkQuests(n);
    if (c !== n && q) { sfx('SE-36'); setToast([`🎯 任務完成！${q.text.split('。')[0]}　+${q.reward}💰`]); setTimeout(() => setToast([]), 4000); }
    setS(c);
  };

  const toMap = (e: { clientX: number; clientY: number }): Pt | null => {
    const r = map.current?.getBoundingClientRect();
    if (!r) return null;
    return { x: ((e.clientX - r.left) / r.width) * VW, y: ((e.clientY - r.top) / r.height) * VH };
  };
  const drag = useRef(false);
  const onDown = (e: RPE) => {
    if (!placing) return;
    drag.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toMap(e); if (p) setPlacing({ ...placing, at: p });
  };
  const onMove = (e: RPE) => {
    if (!placing || !drag.current) return;
    const p = toMap(e); if (p) setPlacing({ ...placing, at: p });
  };
  const onUp = () => { drag.current = false; };

  const check = placing ? canPlace(s, placing.kind, placing.at, placing.id) : null;
  const confirm = () => {
    if (!placing || !check?.ok) { sfx('SE-04'); return; }
    sfx('SE-05');
    commit(placing.id ? move(s, placing.id, placing.at) : build(s, placing.kind, placing.at));
    setPlacing(null);
  };
  const startBuild = (k: Kind) => {
    const d = BUILDINGS[k];
    if (stars(s) < d.stars || s.coins < d.cost) { sfx('SE-04'); return; }
    sfx('SE-03'); setMenu(false); setPick(null);
    setPlacing({ kind: k, at: d.near ? { x: d.near.at.x, y: d.near.at.y - 150 } : { ...PLAZA, y: PLAZA.y + 60 } });
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
    return { p, at, art, walking, flip: walking && Math.cos(t * 0.18 + i) < 0 };
  });
  const tourists = s.b.filter((b) => b.kind === 'guesthouse' && b.worker !== null && !b.broken).flatMap((g, j) => [0, 1].map((k) => {
    const a = t * 0.12 + j + k * 3;
    return { key: `${g.id}-${k}`, at: { x: g.at.x + Math.cos(a) * 160, y: g.at.y + 60 + Math.sin(a) * 60 } };
  }));

  const st = stars(s), rt = rating(s);
  const nextAt = STAR_AT[st] ?? null;
  const quest = currentQuest(s);
  const picked = s.b.find((b) => b.id === pick) ?? null;
  const season = MONTH_SEASON(s.month);

  const sprites = [
    ...s.b.filter((b) => b.id !== placing?.id).map((b) => ({ y: b.at.y, el: (
      <button key={`b${b.id}`} className={`v-bld ${b.broken ? 'broken' : ''} ${pick === b.id ? 'on' : ''} ${BUILDINGS[b.kind].job && b.worker === null ? 'empty' : ''}`}
        style={{ ...pct(b.at), width: wpct(BUILDINGS[b.kind].width), zIndex: Math.round(b.at.y) }}
        onClick={(e) => { e.stopPropagation(); if (placing) return; sfx('SE-01'); setMenu(false); setPick(pick === b.id ? null : b.id); }}>
        <img src={vimg(BUILDINGS[b.kind].art)} alt={BUILDINGS[b.kind].name} draggable={false} />
        {b.broken && <i className="v-flag">💥</i>}
        {!b.broken && BUILDINGS[b.kind].job && b.worker === null && <i className="v-flag">💤</i>}
      </button>
    ) })),
    ...people.map(({ p, at, art, flip }) => ({ y: at.y, el: (
      <img key={`p${p.id}`} className={`v-person ${flip ? 'flip' : ''}`} src={vimg(art)} alt="" draggable={false}
        style={{ ...pct(at), zIndex: Math.round(at.y) }} />
    ) })),
    ...tourists.map((x) => ({ y: x.at.y, el: <img key={x.key} className="v-person" src={vimg('v4-7')} alt="" style={{ ...pct(x.at), zIndex: Math.round(x.at.y) }} /> })),
  ];

  return (
    <div className={`village season-${season} w-${s.weather}`}>
      <div className="v-stage" onClick={() => { if (!placing) { setPick(null); setMenu(false); } }}>
        <div className="v-map" ref={map} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
          <img className="v-bg" src={vimg('v1-bg')} alt="" draggable={false} />
          {sprites.map((x) => x.el)}
          {(Object.entries(AREAS) as [keyof typeof AREAS, (typeof AREAS)[keyof typeof AREAS]][]).filter(([k]) => !areaOpen(s, k)).map(([k, a]) => (
            <div key={k} className="v-fog" style={{ left: wpct(a.box[0]), top: `${(a.box[1] / VH) * 100}%`, width: wpct(a.box[2] - a.box[0]), height: `${((a.box[3] - a.box[1]) / VH) * 100}%`, zIndex: 3000 }}>
              <span>{a.name}<br />{'⭐'.repeat(a.stars)} 散開</span>
            </div>
          ))}
          {placing && (
            <div className={`v-ghost ${check?.ok ? 'ok' : 'bad'}`} style={{ ...pct(placing.at), width: wpct(BUILDINGS[placing.kind].width), zIndex: 4000 }}>
              <img src={vimg(BUILDINGS[placing.kind].art)} alt="" draggable={false} />
              <span className="v-ring" />
            </div>
          )}
          {pops.map((p) => { const b = s.b.find((x) => x.id === p.id); return b && <b key={p.key} className="v-pop" style={{ ...pct(b.at), zIndex: 5000 }}>{p.text}</b>; })}
          <div className="v-weather" />
        </div>
      </div>

      <header className="v-hud">
        <button className="tool" onClick={() => { sfx('SE-02'); onExit(); }}>← 大地圖</button>
        <div className="v-date panel">
          <b>第 {s.year} 年 {s.month} 月</b>
          <span>{SEASON_NAME[season]}　{WEATHER[s.weather].icon} {WEATHER[s.weather].name}</span>
          <i className="v-month"><i style={{ width: `${Math.min(1, prog) * 100}%` }} /></i>
        </div>
        <div className="v-res panel">
          <span>💰 {s.coins}</span>
          {(Object.keys(GOODS) as Good[]).map((g) => <span key={g} title={GOODS[g].name}>{GOODS[g].icon} {s.goods[g]}</span>)}
          <span className={s.people.length > capacity(s) ? 'warn' : ''} title="村民／床位">👥 {s.people.length}/{capacity(s)}</span>
        </div>
        <div className="v-stars panel" title={`評價 ${rt}`}>
          <b>{'⭐'.repeat(st)}<em>{'☆'.repeat(5 - st)}</em></b>
          {nextAt !== null && <i className="v-month"><i style={{ width: `${Math.min(1, (rt - STAR_AT[st - 1]) / (nextAt - STAR_AT[st - 1])) * 100}%` }} /></i>}
        </div>
        <div className="v-speed panel">
          {([0, 1, 2] as const).map((v) => <button key={v} className={speed === v ? 'on' : ''} onClick={() => { sfx('SE-01'); setSpeed(v); }}>{['⏸', '▶', '⏩'][v]}</button>)}
        </div>
        <SoundToggle />
      </header>

      {quest && intro < 0 && !placing && <Goal text={quest.text} floating />}
      {s.done && !quest && <div className="quest floating"><i>🎉</i><span>五顆星！漁村又熱鬧起來了</span></div>}

      {!placing && (
        <footer className="v-bar">
          <button className="btn green" onClick={(e) => { e.stopPropagation(); sfx('SE-03'); setPick(null); setMenu(!menu); }}>🔨 蓋</button>
          {s.b.some((b) => b.kind === 'netshed') && (
            <button className="btn" disabled={!canSeine(s)} onClick={(e) => { e.stopPropagation(); sfx('SE-03'); setSeining(true); }}>
              🎣 牽罟{canSeine(s) ? '' : s.weather === 'typhoon' ? '（颱風）' : '（下個月）'}
            </button>
          )}
          {idle(s).length > 0 && <span className="v-idle panel">閒著的人：{idle(s).map((p) => p.name).join('、')}</span>}
        </footer>
      )}

      {menu && (
        <div className="v-menu panel" onClick={(e) => e.stopPropagation()}>
          {BUILD_ORDER.map((k) => {
            const d = BUILDINGS[k], lock = st < d.stars, poor = s.coins < d.cost;
            return (
              <button key={k} className={`v-item ${lock ? 'lock' : poor ? 'poor' : ''}`} onClick={() => startBuild(k)}>
                <img src={vimg(d.art)} alt="" />
                <b>{d.name}</b>
                <small>{lock ? `🔒 ${'⭐'.repeat(d.stars)}` : `💰 ${d.cost}`}</small>
              </button>
            );
          })}
        </div>
      )}

      {placing && (
        <div className="v-place panel" onClick={(e) => e.stopPropagation()}>
          <b>{placing.id ? '搬到哪裡？' : `把${BUILDINGS[placing.kind].name}拖到想蓋的地方`}</b>
          <p className={check?.ok ? 'ok' : 'bad'}>{check?.ok ? '✓ 這裡可以蓋' : `✕ ${check?.why}`}</p>
          <PlaceHint s={s} kind={placing.kind} at={placing.at} id={placing.id} />
          <div>
            <button className="btn" onClick={() => { sfx('SE-02'); setPlacing(null); }}>取消</button>
            <button className="btn green" disabled={!check?.ok} onClick={confirm}>{placing.id ? '搬到這裡' : '蓋在這裡'}</button>
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

      {seining && <Seine people={s.people.length} fish={(g) => seineFish(s, g)}
        onDone={(good) => { setSeining(false); if (good >= 0) commit(seine(s, good)); }} />}

      {intro >= 0 && (
        <div className="talk-cover" onClick={() => {
          sfx('SE-09');
          if (intro + 1 < VILLAGE_LINES.intro.length) setIntro(intro + 1);
          else { setIntro(-1); setS({ ...s, intro: true }); }
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

// 拖的時候：附近有哪些可以搭配
function PlaceHint({ s, kind, at, id }: { s: V; kind: Kind; at: Pt; id?: number }) {
  const fake: Bld = { id: id ?? -1, kind, at, worker: null };
  const got = combosOf({ ...s, b: [...s.b.filter((b) => b.id !== id), fake] }, fake);
  const can = COMBOS.filter(([a, b]) => a === kind || b === kind).map(([a, b]) => BUILDINGS[a === kind ? b : a].name);
  if (got.length) return <p className="combo">✨ 搭配加成：{got.map((g) => `${BUILDINGS[g.with.kind].name}（${g.why}）`).join('、')}</p>;
  if (can.length) return <p className="v-hint">靠近 {[...new Set(can)].join('、')} 有加成</p>;
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
  return (
    <div className="v-card panel" onClick={(e) => e.stopPropagation()}>
      <button className="x" onClick={() => { sfx('SE-02'); onClose(); }} aria-label="關掉">✕</button>
      <img src={vimg(d.art)} alt="" />
      <h2>{d.name}</h2>
      <p>{d.does}</p>
      {d.home && <p>🏠 住 {d.home} 個人</p>}
      {b.broken && <p className="bad">💥 被颱風吹壞了，修好才能用。<button className="btn green" disabled={s.coins < REPAIR} onClick={onRepair}>修理（💰{REPAIR}）</button></p>}
      {d.job && (
        <p className="v-worker">
          {w ? <><img src={vimg(JOB_ART[d.job])} alt="" /> {w.name}在這裡工作 <button className="btn" onClick={onUnassign}>叫回來</button></>
            : idle(s).length ? <>💤 沒有人在這裡工作 <button className="btn green" onClick={onAssign}>派 {idle(s)[0].name}</button></>
              : <>💤 沒有人在這裡工作。沒有閒著的人了，多蓋房子讓人搬回來。</>}
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
    if (ok) setGood((g) => g + 1);
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
