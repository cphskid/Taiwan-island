import { useEffect, useState } from 'react';
import { fire, fireSolve, heat, SIDES, SLOT_CAP, SLOTS, used, HEAT_MAX, HEAT_MIN, type Pile, type Slot } from '../../core/stone-age';
import { CARDS1, CLAY_ASK, CORD_ASK, FIRE_FAIL, FIRE_HINT, FIRE_INTRO, FIRES, POT_DONE, POT_INTRO, POT_LEAVE, SAND_RESULT, art } from '../../data/ch1';
import type { Line } from '../../data/babao-chapter';
import { addCard1 } from '../../core/save1';
import { CardPop, Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import type { Step1Props } from '../Ch1';
import { jingle, sfx } from '../../audio';
import { Decide, EraJump } from './Story';

type Phase = 'jump' | 'intro' | 'clayAsk' | 'clay' | 'fireIntro' | 'fire' | 'cordAsk' | 'cord' | 'done' | 'pick' | 'cards' | 'leave' | 'warp';

// 步驟 2 陶器（大坌坑文化）：黏土拌砂試燒 → 野燒三關（柴放在罐子四周，四面都要剛剛好）→ 拍繩紋
export function Pottery({ p, set, next, oops }: Step1Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  const [lv, setLv] = useState(0);
  const [card, setCard] = useState<string[]>([]);
  useEffect(() => {
    if (phase !== 'warp') return;
    sfx('SE-31');
    const t = setTimeout(next, 1300);
    return () => clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="scene ch1-pot">
      <img className="scene-bg" src={art('s-06')} alt="" />
      {phase === 'jump' && <EraJump to={1} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={POT_INTRO} onDone={() => setPhase('clayAsk')} />}
      {phase === 'clayAsk' && <Talk lines={CLAY_ASK} onDone={() => setPhase('clay')} />}
      {phase === 'clay' && <Clay oops={oops} onDone={() => setPhase('fireIntro')} />}
      {phase === 'fireIntro' && <Talk lines={FIRE_INTRO} onDone={() => setPhase('fire')} />}
      {phase === 'fire' && <FireBoard key={lv} n={lv} oops={oops} onDone={() => {
        jingle('MU-13');
        if (lv + 1 < FIRES.length) setLv(lv + 1); else setPhase('cordAsk');
      }} />}
      {phase === 'cordAsk' && <Talk lines={CORD_ASK} onDone={() => setPhase('cord')} />}
      {phase === 'cord' && <Cord onDone={() => setPhase('done')} />}
      {phase === 'done' && <Talk lines={POT_DONE} onDone={() => setPhase('pick')} />}
      {phase === 'pick' && <Decide id="pot" set={set} onDone={() => {
        const more = ['dabenkeng', 'pot'].filter((c) => !p.cards.includes(c));
        set((o) => addCard1(o, 'dabenkeng', 'pot'));
        if (more.length) { setCard(more); setPhase('cards'); } else setPhase('leave');
      }} />}
      {phase === 'leave' && <Talk lines={POT_LEAVE} onDone={() => setPhase('warp')} />}
      {phase === 'cards' && card[0] && (
        <CardPop title={CARDS1[card[0]].title} text={CARDS1[card[0]].text} onClose={() => { const rest = card.slice(1); setCard(rest); if (!rest.length) setPhase('leave'); }} />
      )}
      {phase === 'warp' && <div className="warp" />}
    </div>
  );
}

// 黏土拌幾匙砂：做一個小罐子試燒，看會不會裂、會不會散
function Clay({ onDone, oops }: { onDone: () => void; oops: () => void }) {
  const [sand, setSand] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const test = () => {
    const r = SAND_RESULT[sand];
    setResult(r);
    sfx(r.ok ? 'SE-05' : 'SE-71');
    if (r.ok) setTimeout(onDone, 1500); else oops();
  };
  return (
    <div className="clay panel">
      <h3>黏土裡拌幾匙砂？</h3>
      <div className="clay-mix">
        <img src={art('g-03-clay')} alt="黏土" />
        <span>＋</span>
        <div className="sand-spoons">{Array.from({ length: sand }, (_, i) => <img key={i} src={art('g-03-sand')} alt="" />)}{sand === 0 && <em>不加砂</em>}</div>
      </div>
      <div className="row">
        <button className="btn orange" disabled={sand === 0} onClick={() => { sfx('SE-01'); setSand(sand - 1); setResult(null); }}>少一匙</button>
        <b className="sand-n">{sand} 匙</b>
        <button className="btn orange" disabled={sand === 4} onClick={() => { sfx('SE-01'); setSand(sand + 1); setResult(null); }}>多一匙</button>
      </div>
      <button className="btn green" onClick={test}>做小罐子試燒</button>
      {result && <p className={result.ok ? 'yes' : 'no'}>{result.text}</p>}
    </div>
  );
}

// 野燒：罐子在中間，周圍 8 個位置放柴；點一下加一捆（最多 2 捆），再點會拿掉
const GRID: (Slot | 'pot')[] = ['NW', 'N', 'NE', 'W', 'pot', 'E', 'SW', 'S', 'SE'];
const SIDE_NAME = { N: '北', E: '東', S: '南', W: '西' } as const;
const WIND_NAME: Record<Slot, string> = { N: '北風', NE: '東北季風', E: '東風', SE: '東南風', S: '南風', SW: '西南風', W: '西風', NW: '西北風' };

function FireBoard({ n, onDone, oops }: { n: number; onDone: () => void; oops: () => void }) {
  const { level, tip } = FIRES[n];
  const [pile, setPile] = useState<Pile>({});
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [burn, setBurn] = useState<'ok' | 'cold' | 'crack' | null>(null);
  const h = heat(level, pile);
  const left = level.wood - used(pile);
  const sol = fails >= 3 ? fireSolve(level) : null;

  const tap = (s: Slot) => {
    if (burn === 'ok' || level.wet.includes(s)) return;
    setBurn(null);
    const cur = pile[s] ?? 0;
    const nextN = cur < SLOT_CAP && left > 0 ? cur + 1 : 0;
    sfx(nextN > cur ? 'SE-07' : 'SE-02');
    setPile({ ...pile, [s]: nextN });
  };
  const light = () => {
    const r = fire(level, pile);
    if (r.result === 'more') return;
    setBurn(r.result);
    if (r.result === 'ok') { sfx('SE-60'); setSay(null); setTimeout(onDone, 1600); return; }
    sfx('SE-71'); oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 2 && f % 2 === 0 ? FIRE_HINT : FIRE_FAIL[r.result]);
  };
  return (
    <div className="fire-wrap">
      <Goal floating text={`野燒第 ${n + 1} / ${FIRES.length} 窯：${tip}`} />
      <div className={`fire-board panel ${burn ? `burn-${burn}` : ''}`}>
        {level.wind && <div className={`wind wind-${level.wind}`}>💨 {WIND_NAME[level.wind]}</div>}
        <div className="fire-grid">
          {GRID.map((g) => g === 'pot' ? (
            <div key="pot" className="fire-pot">
              <img src={art('g-03-pot')} alt="陶罐" />
              {SIDES.map((s) => (
                <span key={s} className={`side-heat side-${s} ${h[s] < HEAT_MIN ? 'cold' : h[s] > HEAT_MAX ? 'hot' : 'ok'}`}>{SIDE_NAME[s]} {h[s]}</span>
              ))}
            </div>
          ) : (
            <button key={g} className={`fire-slot ${level.wet.includes(g) ? 'wet' : ''} ${sol && (sol[g] ?? 0) > 0 ? 'hint' : ''}`} onClick={() => tap(g)}>
              {level.wet.includes(g) ? <span className="puddle">💧</span>
                : Array.from({ length: pile[g] ?? 0 }, (_, i) => <img key={i} src={art('o-05-woodpile')} alt="柴" style={{ translate: `${i * 10}px ${-i * 14}px` }} />)}
              {burn && (pile[g] ?? 0) > 0 && <img className="flame" src={art('o-05-fire')} alt="" />}
            </button>
          ))}
        </div>
        <div className="fire-foot">
          <span>還有 <b>{left}</b> 捆柴</span>
          <span className="fire-legend">每一面要 {HEAT_MIN}～{HEAT_MAX} 分</span>
          <button className="btn green" disabled={left > 0 || burn === 'ok'} onClick={light}>點火！</button>
        </div>
        {burn === 'ok' && <p className="yes big">燒好了！四面都是漂亮的紅褐色。</p>}
      </div>
      {fails >= 5 && burn !== 'ok' && <button className="btn demo corner-btn" onClick={() => setPile(fireSolve(level) ?? {})}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

// 拍繩紋：在罐子上點三下
function Cord({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0);
  const tap = () => {
    if (n >= 3) return;
    sfx('SE-09');
    const m = n + 1;
    setN(m);
    if (m === 3) { jingle('MU-13'); setTimeout(onDone, 1000); }
  };
  return (
    <div className="cord panel">
      <h3>用繩子在罐子上拍一拍（{n} / 3）</h3>
      <button className={`cord-pot cord-${n}`} onClick={tap}><img src={art('g-03-pot')} alt="陶罐" /></button>
    </div>
  );
}
