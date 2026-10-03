import { useEffect, useMemo, useRef, useState } from 'react';
import { HEADINGS, SEASON_WAIT, cellAt, harborOf, highTide, routeSolve, routeStep, startShip, type Heading, type Pos, type RouteAction, type Ship } from '../../core/tayouan';
import { ROUTES, ROUTE_OUTCOME, art3, type RouteInfo } from '../../data/ch3';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards3, type Step3Props } from '../Ch3';
import { EraJump3 } from './Story3';
import { jingle, sfx } from '../../audio';

type Phase = 'jump' | 'intro' | 'sail' | 'good' | 'cards';

// 步驟 1 季風與航線：兩張海圖，看季風、黑水溝的海流和潮水，把船帶進港
export function Route({ p, set, next, oops }: Step3Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  const [li, setLi] = useState(0);
  const info = ROUTES[li];
  return (
    <div className="scene ch3-sea">
      {phase === 'jump' && <EraJump3 to={1} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={info.intro} onDone={() => setPhase('sail')} />}
      {(phase === 'sail' || phase === 'good') && <RouteSail key={li} info={info} oops={oops} onDone={() => setPhase('good')} />}
      {phase === 'good' && <Talk lines={info.good} onDone={() => { if (li + 1 < ROUTES.length) { setLi(li + 1); setPhase('intro'); } else setPhase('cards'); }} />}
      {phase === 'cards' && <NewCards3 ids={['monsoon']} p={p} set={set} onDone={next} />}
    </div>
  );
}

const ORDER: (Heading | null)[] = ['NW', 'N', 'NE', 'W', null, 'E', 'SW', 'S', 'SE'];
const ARROW: Record<Heading, string> = { N: '↑', NE: '↗', E: '→', SE: '↘', S: '↓', SW: '↙', W: '←', NW: '↖' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function RouteSail({ info, oops, onDone }: { info: RouteInfo; oops: () => void; onDone: () => void }) {
  const lv = info.level;
  const cols = lv.rows[0].length, rows = lv.rows.length;
  const [ship, setShip] = useState<Ship>(() => startShip(lv));
  const [at, setAt] = useState<Pos>(ship.pos); // 畫面上的船（動畫中會比 ship 先走）
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [bang, setBang] = useState<string | null>(null);
  const [say, setSay] = useState<Line | null>(null);
  const [won, setWon] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const plan = useMemo(() => routeSolve(lv) ?? [], [lv]);
  // 失敗 3 次以後，海圖上畫出示範路線的小點
  const trail = useMemo(() => {
    const out: Pos[] = [];
    let s = startShip(lv);
    for (const a of plan) { const r = routeStep(lv, s, a); out.push(...r.path); s = r.ship; }
    return out;
  }, [lv, plan]);

  // 做一個動作，動畫走完回傳結果
  const play = async (s: Ship, a: RouteAction) => {
    const r = routeStep(lv, s, a);
    if (a === 'tide' || a === 'season') sfx(a === 'season' ? 'SE-38' : 'SE-07');
    else sfx('SE-09');
    for (const pos of r.path) { setAt(pos); await sleep(420); if (!alive.current) return null; }
    setShip(r.ship);
    return r;
  };
  const finish = async (o: string) => {
    if (o === 'arrived') { jingle('MU-13'); setWon(true); setSay(info.good[0]); await sleep(1500); if (alive.current) onDone(); return; }
    if (o === 'sailing') return;
    sfx('SE-71'); oops();
    const f = fails + 1;
    setFails(f);
    setBang(ROUTE_OUTCOME[o]);
    setSay(f >= 2 ? info.hint : { who: 'afu', mood: 'worried', text: '再試一次！先想好：什麼時候要換季風？什麼時候水道會漲潮？' });
    await sleep(1600);
    if (!alive.current) return;
    setBang(null);
    const s0 = startShip(lv);
    setShip(s0); setAt(s0.pos);
  };
  const act = async (a: RouteAction) => {
    if (busy || won) return;
    setBusy(true);
    const r = await play(ship, a);
    if (r) await finish(r.outcome);
    if (alive.current) setBusy(false);
  };
  const demo = async () => {
    if (busy) return;
    setBusy(true);
    let s = startShip(lv);
    setShip(s); setAt(s.pos);
    await sleep(500);
    for (const a of plan) {
      const r = await play(s, a);
      if (!r) return;
      s = r.ship;
      await sleep(350);
      if (r.outcome !== 'sailing') { await finish(r.outcome); break; }
    }
    if (alive.current) setBusy(false);
  };
  const reset = () => { if (busy) return; sfx('SE-02'); const s0 = startShip(lv); setShip(s0); setAt(s0.pos); };

  const pct = (p: { col: number; row: number }) => ({ left: `${((p.col + 0.5) / cols) * 100}%`, top: `${((p.row + 0.5) / rows) * 100}%` });
  const high = highTide(ship.day);
  const allowed = HEADINGS[ship.monsoon];
  const startPos = startShip(lv).pos;
  return (
    <div className="ch3-route">
      <Goal floating text={`把船從${info.from}帶進${info.to}的港口，${lv.days} 天內要到。帆船只能順著季風走，黑水溝會把船往北推。`} />
      <div className="ch3-chart" style={{ aspectRatio: `${cols} / ${rows}` }}>
        <div className="ch3-cells" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {lv.rows.flatMap((line, row) => [...line].map((_, col) => {
            const c = cellAt(lv, { col, row })!;
            return (
              <div key={`${col},${row}`} className={`ch3-cell ${c} ${c === 'channel' ? (high ? 'high' : 'low') : ''}`}>
                {c === 'current' && <i>↑</i>}
                {c === 'shoal' && <img src={art3('o-07-reef')} alt="淺灘" />}
                {c === 'channel' && !high && <img src={art3('o-07-sandbar')} alt="退潮的沙洲" />}
                {c === 'harbor' && <img src={art3(li0(info) ? 'o-07-zeelandia' : 'g-05-silver')} alt="港口" />}
              </div>
            );
          }))}
        </div>
        {fails >= 3 && !won && trail.map((p, k) => <i key={k} className="ch3-trail" style={pct(p)} />)}
        {info.labels.map((l) => <span key={l.text} className="ch3-label" style={pct(l)}>{l.text}</span>)}
        <span className="ch3-port from" style={pct(startPos)}>{info.from}</span>
        <span className="ch3-port to" style={pct(harborOf(lv))}>{info.to}</span>
        <img className={`ch3-ship ${won ? 'won' : ''} ${bang ? 'hit' : ''}`} src={info.ship} alt="船" style={pct(at)} />
        <div className="ch3-chart-fog" />
        {bang && <div className="ch3-bang">{bang}</div>}
      </div>
      <div className="ch3-helm panel">
        <div className="ch3-hud">
          <span className={ship.day > lv.days - 3 ? 'warn' : ''}>📅 第 {ship.day} 天<small>／最多 {lv.days} 天</small></span>
          <span className={`wind ${ship.monsoon}`}>🌬️ {ship.monsoon === 'winter' ? '東北季風' : '西南季風'}<small>{ship.monsoon === 'winter' ? '風往西南吹 ↙' : '風往東北吹 ↗'}</small></span>
          <span className={high ? 'tide-hi' : 'tide-lo'}>{high ? '🌊 今天漲潮' : '🏖️ 今天退潮'}<small>水道{high ? '進得去' : '進不去'}</small></span>
        </div>
        <div className="ch3-compass">
          {ORDER.map((h, k) => h ? (
            <button key={h} className={allowed.includes(h) ? 'ok' : ''} disabled={busy || won || !allowed.includes(h)} onClick={() => act({ go: h })} aria-label={`往${h}`}>{ARROW[h]}</button>
          ) : <b key={k}>⛵</b>)}
        </div>
        <div className="ch3-waits">
          <button className="btn orange" disabled={busy || won} onClick={() => act('tide')}>等潮水<small>1 天</small></button>
          <button className="btn orange" disabled={busy || won} onClick={() => act('season')}>等季風換邊<small>{SEASON_WAIT} 天</small></button>
        </div>
        <button className="ch3-reset" disabled={busy || won} onClick={reset}>↺ 回到起點</button>
      </div>
      {fails >= 5 && !won && <button className="btn demo corner-btn" disabled={busy} onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

const li0 = (info: RouteInfo) => info === ROUTES[0];
