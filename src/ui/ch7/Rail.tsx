import { useEffect, useRef, useState } from 'react';
import { nextNeeded, peek, yardDone, yardMove, yardSolve, yardStart, type Car, type From, type To, type Yard } from '../../core/jianan';
import { NORTH, RAIL_DONE, RAIL_INTRO, YARD_INTRO, YARD_SAY, YARDS, art7 } from '../../data/ch7';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards7, type Step7Props } from '../Ch7';
import { Decide7, EraJump7 } from './Story7';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'speak' | 'yardIntro' | 'yard' | 'done' | 'cards' | 'jump';

// 步驟 1 縱貫鐵路（1908）：車站裡聽不懂日語（選擇）→ 嘉義調車場排貨車廂（兩關）→ 火車開走
export function Rail({ p, set, next, oops }: Step7Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [lv, setLv] = useState(0);
  return (
    <div className="scene ch7-rail">
      <img className="scene-bg" src={art7('s-22')} alt="" />
      {phase === 'intro' && <Talk lines={RAIL_INTRO} onDone={() => setPhase('speak')} />}
      {phase === 'speak' && <Decide7 id="speak" set={set} onDone={() => setPhase('yardIntro')} />}
      {phase === 'yardIntro' && <Talk lines={YARD_INTRO} onDone={() => setPhase('yard')} />}
      {phase === 'yard' && <YardBoard key={lv} level={lv} oops={oops} onDone={() => {
        if (lv + 1 < YARDS.length) setLv(lv + 1); else setPhase('done');
      }} />}
      {phase === 'done' && <Talk lines={RAIL_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards7 ids={['railway', 'sugar']} p={p} set={set} onDone={() => setPhase('jump')} />}
      {phase === 'jump' && <EraJump7 from={0} to={1} onDone={next} />}
    </div>
  );
}

const CARGO_IMG = { rice: art7('g-08-rice-car'), sugar: art7('g-08-sugar-car') };

function CarBox({ car, on, hint, ghost }: { car: Car; on?: boolean; hint?: boolean; ghost?: boolean }) {
  return (
    <span className={`ch7-car ${on ? 'on' : ''} ${hint ? 'ch7-hint' : ''} ${ghost ? 'ch7-far' : ''}`}>
      <img src={CARGO_IMG[car.cargo]} alt="" />
      <b>{car.to}</b>
    </span>
  );
}

function YardBoard({ level, oops, onDone }: { level: number; oops: () => void; onDone: () => void }) {
  const lv = YARDS[level];
  const [y, setY] = useState<Yard>(() => yardStart(lv));
  const [sel, setSel] = useState<From | null>(null);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [demo, setDemo] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const live = useRef(y);
  live.current = y;

  const plan = (fails >= 2 || demo) && !leaving ? yardSolve(lv, y) : null;
  const tip = plan?.moves[0];
  const need = nextNeeded(lv, y);
  const reset = () => { setY(yardStart(lv)); setSel(null); };

  const finish = (ny: Yard) => {
    if (!yardDone(lv, ny)) return;
    setLeaving(true);
    jingle('MU-13');
    setSay(YARD_SAY.good);
    setTimeout(onDone, 2200);
  };
  const move = (from: From, to: To) => {
    const r = yardMove(lv, live.current, from, to);
    setSel(null);
    if (r.error === 'empty') return;
    if (r.error === 'full') { sfx('SE-04'); setSay(YARD_SAY.full); return; }
    if (r.error === 'wrong' || r.error === 'tooMany') {
      sfx('SE-71'); oops();
      const f = fails + 1;
      setFails(f);
      setSay(f >= 2 ? YARD_SAY.hint : YARD_SAY[r.error]);
      if (r.error === 'tooMany') reset();
      return;
    }
    sfx(to === 'out' ? 'SE-36' : 'SE-07');
    setY(r.yard);
    if (yardDone(lv, r.yard)) { finish(r.yard); return; }
    // 這樣推下去已經排不出來了：先說，再從頭來
    if (!yardSolve(lv, r.yard)) {
      oops();
      const f = fails + 1;
      setFails(f);
      setSay(f >= 2 ? YARD_SAY.hint : YARD_SAY.stuck);
      setTimeout(() => { setY(yardStart(lv)); setSel(null); }, 1400);
    } else setSay(null);
  };

  // 看示範：照最少調車次數的排法，一步一步自己動
  useEffect(() => {
    if (!demo || leaving) return;
    const s = yardSolve(lv, y);
    if (!s || !s.moves.length) return;
    const t = setTimeout(() => move(...s.moves[0]), 800);
    return () => clearTimeout(t);
  }, [demo, y, leaving]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickFrom = (from: From) => {
    if (leaving || demo) return;
    if (!peek(y, from)) return;
    sfx('SE-01');
    setSel(sel === from ? null : from);
  };
  const dropTo = (to: To) => {
    if (sel === null || leaving || demo) return;
    if (to === sel) { setSel(null); return; }
    move(sel, to);
  };

  return (
    <div className="ch7-yard-wrap">
      <Goal floating text={`第 ${level + 1} / ${YARDS.length} 列火車：最遠的站掛在火車頭後面。點一節車廂，再點「火車」或「岔道」`} />
      <div className="ch7-yard panel">
        <div className="ch7-order">
          <small>火車往北開，掛的順序：</small>
          <span className="ch7-loco-mini">🚂</span>
          {NORTH.filter((s) => lv.cars.some((c) => c.to === s)).map((s, i) => <em key={s} className={s === need ? 'on' : ''}>{i + 1}. {s}</em>)}
          <span className={`ch7-moves ${y.sideMoves >= lv.maxSide ? 'max' : ''}`}>岔道 {y.sideMoves} / {lv.maxSide} 次</span>
        </div>
        {/* 火車（往北，左邊）＋進站線（右邊進來） */}
        <div className="ch7-main">
          <button className={`ch7-train ${sel !== null ? 'ready' : ''} ${tip?.[1] === 'out' ? 'ch7-hint' : ''} ${leaving ? 'leave' : ''}`} onClick={() => dropTo('out')}>
            <img className="ch7-loco" src={art7('g-08-loco')} alt="火車頭" />
            {y.out.map((c) => <CarBox key={c.id} car={c} />)}
            {!y.out.length && <small className="ch7-slot-tip">掛到這裡</small>}
          </button>
          <div className="ch7-track-in">
            <small>進站線 ⬅</small>
            {y.input.map((c, i) => (
              <button key={c.id} className="ch7-car-btn" disabled={i > 0} onClick={() => pickFrom('in')}>
                <CarBox car={c} on={i === 0 && sel === 'in'} hint={i === 0 && tip?.[0] === 'in'} ghost={i > 0} />
              </button>
            ))}
          </div>
        </div>
        <div className="ch7-sides">
          {y.sides.map((s, k) => (
            <div key={k} role="button" className={`ch7-side ${sel !== null && sel !== k ? 'ready' : ''} ${tip?.[1] === k ? 'ch7-hint' : ''}`} onClick={() => dropTo(k)}>
              <small>岔道 {k + 1}<br />（死巷）</small>
              <span className="ch7-side-end">▮</span>
              {s.map((c, i) => (
                <button key={c.id} className="ch7-car-btn" disabled={i !== s.length - 1}
                  onClick={(e) => { e.stopPropagation(); if (sel !== null && sel !== k) dropTo(k); else pickFrom(k); }}>
                  <CarBox car={c} on={i === s.length - 1 && sel === k} hint={i === s.length - 1 && tip?.[0] === k} />
                </button>
              ))}
              {Array.from({ length: lv.cap - s.length }, (_, i) => <i key={i} className="ch7-side-gap" />)}
            </div>
          ))}
        </div>
        <div className="ch7-yard-foot">
          <small>只能拉進站線最前面那節、岔道最外面那節</small>
          <button className="btn orange" disabled={leaving || demo || (!y.out.length && y.sideMoves === 0)} onClick={() => { sfx('SE-02'); reset(); setSay(null); }}>重排</button>
        </div>
      </div>
      {fails >= 5 && !demo && !leaving && <button className="btn demo corner-btn" onClick={() => { reset(); setDemo(true); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
