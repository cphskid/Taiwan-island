import { useEffect, useRef, useState } from 'react';
import { GOODS, buy, canSail, freshTrade, loaded, portOf, sail, sell, tradeWon, type Good, type PortId, type TradeState } from '../../core/tayouan';
import { GOOD_INFO, PORT_INFO, TRADE, TRADE_DEMO, TRADE_INTRO, TRADE_SAY, art3 } from '../../data/ch3';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards3, type Step3Props } from '../Ch3';
import { Decide3 } from './Story3';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'trade' | 'good' | 'choice' | 'cards';

// 步驟 2 轉口貿易：大員是轉運站，在便宜的港口買、運到貴的港口賣，三趟船賺到目標
export function Trade({ p, set, next, oops }: Step3Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className="scene ch3-dock">
      <img className="scene-bg" src={art3('s-13')} alt="" />
      {phase === 'intro' && <Talk lines={TRADE_INTRO} onDone={() => setPhase('trade')} />}
      {(phase === 'trade' || phase === 'good') && <TradeBoard oops={oops} onDone={() => setPhase('good')} />}
      {phase === 'good' && <Talk lines={[TRADE_SAY.good]} onDone={() => setPhase('choice')} />}
      {phase === 'choice' && <Decide3 id="honest" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards3 ids={['voc', 'entrepot', 'sugar']} p={p} set={set} onDone={next} />}
    </div>
  );
}

const PORTS: PortId[] = ['tayouan', 'japan', 'batavia'];

function TradeBoard({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const lv = TRADE;
  const [s, setS] = useState<TradeState>(() => freshTrade(lv));
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [won, setWon] = useState(false);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const port = portOf(lv, s.at);
  const legsLeft = lv.legs - s.legs;

  // 每做一件事之後看看：賺夠了嗎？船開完了、這裡也沒得賣了嗎？
  const after = (n: TradeState, demo = false) => {
    setS(n);
    if (tradeWon(lv, n)) { setWon(true); jingle('MU-13'); setTimeout(() => alive.current && onDone(), 1400); return; }
    if (demo) return;
    const here = portOf(lv, n.at);
    const could = n.money + GOODS.reduce((a, g) => a + (n.cargo[g] ?? 0) * (here.sell[g] ?? 0), 0);
    if (n.legs >= lv.legs && could < lv.goal) {
      setBusy(true);
      setTimeout(() => {
        if (!alive.current) return;
        sfx('SE-71'); oops();
        const f = fails + 1;
        setFails(f);
        setSay(f >= 3 ? TRADE_SAY.hint2 : f >= 2 ? TRADE_SAY.hint : TRADE_SAY.poor);
        setS(freshTrade(lv));
        setBusy(false);
      }, 1500);
    }
  };
  const doBuy = (g: Good) => { const n = buy(lv, s, g); if (!n) { sfx('SE-04'); return; } sfx('SE-07'); after(n); };
  const doSell = (g: Good) => { const n = sell(lv, s, g); if (!n) { sfx('SE-04'); return; } sfx('SE-05'); after(n); };
  const doSail = (to: PortId) => { const n = sail(lv, s, to); if (!n) { sfx('SE-04'); return; } sfx('SE-09'); after(n); };
  const restart = () => { sfx('SE-02'); setS(freshTrade(lv)); };
  const demo = async () => {
    setBusy(true);
    let n = freshTrade(lv);
    setS(n);
    for (const a of TRADE_DEMO) {
      await new Promise((r) => setTimeout(r, 380));
      if (!alive.current) return;
      n = (a.buy ? buy(lv, n, a.buy) : a.sell ? sell(lv, n, a.sell) : sail(lv, n, a.sail!)) ?? n;
      sfx(a.sail ? 'SE-09' : 'SE-07');
      after(n, true);
    }
  };

  const cargo = GOODS.flatMap((g) => Array.from({ length: s.cargo[g] ?? 0 }, () => g));
  const lock = busy || won;
  return (
    <div className="ch3-trade">
      <Goal floating text={`用 ${lv.legs} 趟船賺到 ${lv.goal} 兩銀。每一趟都要從大員出發，或回到大員。`} />
      <div className="ch3-seamap panel">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ch3-lanes">
          {PORTS.filter((id) => id !== 'tayouan').map((id) => (
            <line key={id} x1={PORT_INFO.tayouan.x * 100} y1={PORT_INFO.tayouan.y * 100} x2={PORT_INFO[id].x * 100} y2={PORT_INFO[id].y * 100} />
          ))}
        </svg>
        {PORTS.map((id) => {
          const go = canSail(s.at, id) && legsLeft > 0;
          return (
            <button key={id} className={`ch3-portnode ${id} ${s.at === id ? 'here' : ''} ${go ? 'go' : ''}`} disabled={lock || !go}
              style={{ left: `${PORT_INFO[id].x * 100}%`, top: `${PORT_INFO[id].y * 100}%` }} onClick={() => doSail(id)}>
              <b>{PORT_INFO[id].name}</b>
              {go && <small>開船去 ▶</small>}
            </button>
          );
        })}
        <img className="ch3-tradeship" src={art3('g-05-ship')} alt="" style={{ left: `${PORT_INFO[s.at].x * 100}%`, top: `${PORT_INFO[s.at].y * 100}%` }} />
        <p className="ch3-note">{PORT_INFO[s.at].note}</p>
      </div>
      <div className="ch3-market panel">
        <div className="ch3-purse">
          <span className={`silver ${s.money >= lv.goal ? 'ok' : ''}`}><img src={art3('g-05-silver')} alt="" />{s.money}<small> / {lv.goal} 兩</small></span>
          <span className="legs">⛵ 還可以開 {legsLeft} 趟</span>
        </div>
        <div className="ch3-hold">
          {Array.from({ length: lv.hold }, (_, k) => (
            <span key={k} className="slot">{cargo[k] && <img src={GOOD_INFO[cargo[k]].img} alt={GOOD_INFO[cargo[k]].name} />}</span>
          ))}
          <small>船艙 {loaded(s)} / {lv.hold}</small>
        </div>
        <h3>{PORT_INFO[s.at].name}的市場</h3>
        <div className="ch3-goods">
          {GOODS.filter((g) => port.buy[g] !== undefined || port.sell[g] !== undefined).map((g) => (
            <div key={g} className={`ch3-good ${fails >= 3 && hot(s.at, g) ? 'ch3-hint' : ''}`}>
              <img src={GOOD_INFO[g].img} alt="" />
              <b>{GOOD_INFO[g].name}<small>{GOOD_INFO[g].from}</small></b>
              {port.buy[g] !== undefined && <button className="buy" disabled={lock || buy(lv, s, g) === null} onClick={() => doBuy(g)}>買 {port.buy[g]} 兩</button>}
              {port.sell[g] !== undefined && <button className="sell" disabled={lock || !s.cargo[g]} onClick={() => doSell(g)}>賣 {port.sell[g]} 兩</button>}
            </div>
          ))}
        </div>
        <button className="ch3-reset" disabled={lock} onClick={restart}>↺ 從頭再來</button>
      </div>
      {fails >= 5 && !won && <button className="btn demo corner-btn" disabled={busy} onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

// 第 3 次失敗後，標出示範路線會在這個港口買的貨
const hot = (at: PortId, g: Good) => (at === 'tayouan' && (g === 'porcelain' || g === 'sugar' || g === 'silk')) || (at === 'batavia' && g === 'spice');
