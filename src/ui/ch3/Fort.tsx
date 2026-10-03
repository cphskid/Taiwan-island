import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { harborFree, harborSolve, parseHarbor, slide, slideRange, type Boat } from '../../core/tayouan';
import { FLEET, FORT_DONE, FORT_SAY, HARBORS, art3 } from '../../data/ch3';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards3, type Step3Props } from '../Ch3';
import { EraJump3 } from './Story3';
import { jingle, sfx } from '../../audio';

type Phase = 'jump' | 'intro' | 'play' | 'good' | 'done' | 'cards' | 'jump2' | 'fleet' | 'card2';

// 步驟 5 北邊的城堡：基隆和平島的港灣擠滿了船，把紅帆船排出去（送補給、讓傳教士平安離開）；
// 最後跳到 1661 年，看到鄭成功的船隊開進鹿耳門（接第四章）
export function Fort({ p, set, next, oops }: Step3Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  const [li, setLi] = useState(0);
  const lv = HARBORS[li];
  useEffect(() => { if (phase === 'fleet') sfx('SE-105'); }, [phase]); // 鄭成功的船隊開進來
  const fleet = phase === 'jump2' || phase === 'fleet' || phase === 'card2';
  return (
    <div className={`scene ${fleet ? 'ch3-fleet' : 'ch3-north'}`}>
      <img className="scene-bg" src={art3(fleet ? 's-13' : 's-15')} alt="" />
      {!fleet && <div className="ch3-rain" />}
      {phase === 'jump' && <EraJump3 to={2} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={lv.intro} onDone={() => setPhase('play')} />}
      {(phase === 'play' || phase === 'good') && <HarborBoard key={li} li={li} oops={oops} onDone={() => setPhase('good')} />}
      {phase === 'good' && <Talk lines={[FORT_SAY.good]} onDone={() => { if (li + 1 < HARBORS.length) { setLi(li + 1); setPhase('intro'); } else setPhase('done'); }} />}
      {phase === 'done' && <Talk lines={FORT_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards3 ids={['salvador', 'spain']} p={p} set={set} onDone={() => setPhase('jump2')} />}
      {fleet && (
        <div className="ch3-junks" aria-hidden>
          {[0, 1, 2, 3, 4, 5, 6].map((k) => <img key={k} src={art3('g-05-junk')} alt="" style={{ ['--k' as string]: k }} />)}
        </div>
      )}
      {phase === 'jump2' && <EraJump3 to={3} onDone={() => setPhase('fleet')} />}
      {phase === 'fleet' && <Talk lines={FLEET} onDone={() => setPhase('card2')} />}
      {phase === 'card2' && <NewCards3 ids={['koxinga']} p={p} set={set} onDone={next} />}
    </div>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function HarborBoard({ li, oops, onDone }: { li: number; oops: () => void; onDone: () => void }) {
  const info = HARBORS[li];
  const h = useMemo(() => parseHarbor(info.rows), [info]);
  const [boats, setBoats] = useState<Boat[]>(h.boats);
  const [moves, setMoves] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; by: number } | null>(null);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [won, setWon] = useState(false);
  const [busy, setBusy] = useState(false);
  const grab = useRef<{ id: string; x: number; y: number; cell: number; back: number; fwd: number; across: boolean } | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const n = h.size;
  // 失敗 3 次以後，標出下一步該動哪一艘船
  const nextMove = useMemo(() => (fails >= 3 && !won ? harborSolve({ ...h, boats })?.[0] ?? null : null), [fails, won, h, boats]);

  const commit = async (id: string, by: number, bs = boats, mv = moves, lastId = last) => {
    const nb = slide(h, bs, id, by);
    if (!nb) return { bs, mv, lastId };
    sfx('SE-09');
    const m = id === lastId ? mv : mv + 1; // 同一艘船連續滑，算同一步
    setBoats(nb); setMoves(m); setLast(id);
    if (harborFree(h, nb)) {
      setWon(true); sfx('SE-101'); jingle('MU-13');
      setBoats(nb.map((b) => (b.id === 'A' ? { ...b, col: n + 1 } : b)));
      await sleep(1400);
      if (alive.current) onDone();
    } else if (m >= info.moves) {
      setBusy(true);
      await sleep(700);
      if (!alive.current) return { bs: nb, mv: m, lastId: id };
      sfx('SE-71'); oops();
      const f = fails + 1;
      setFails(f);
      setSay(f >= 2 ? FORT_SAY.hint : FORT_SAY.over);
      setBoats(h.boats); setMoves(0); setLast(null); setBusy(false);
    }
    return { bs: nb, mv: m, lastId: id };
  };

  const down = (e: PointerEvent, b: Boat) => {
    if (won || busy) return;
    const box = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const r = slideRange(h, boats, b.id);
    grab.current = { id: b.id, x: e.clientX, y: e.clientY, cell: box.width / n, back: r.back, fwd: r.fwd, across: b.across };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: b.id, by: 0 });
  };
  const move = (e: PointerEvent) => {
    const g = grab.current;
    if (!g) return;
    const d = (g.across ? e.clientX - g.x : e.clientY - g.y) / g.cell;
    setDrag({ id: g.id, by: Math.max(-g.back, Math.min(g.fwd, d)) });
  };
  const up = () => {
    const g = grab.current;
    grab.current = null;
    if (!g || !drag) { setDrag(null); return; }
    const by = Math.round(drag.by);
    setDrag(null);
    if (by) void commit(g.id, by);
  };
  const demo = async () => {
    setBusy(true);
    const plan = harborSolve({ ...h, boats: h.boats }) ?? [];
    setBoats(h.boats); setMoves(0); setLast(null);
    let st = { bs: h.boats, mv: 0, lastId: null as string | null };
    for (const m of plan) {
      await sleep(650);
      if (!alive.current) return;
      st = await commit(m.id, m.by, st.bs, st.mv, st.lastId);
    }
    if (alive.current) setBusy(false);
  };

  return (
    <div className="ch3-harbor-wrap">
      <Goal floating text={`把紅帆船滑出右邊的出口。船只能前後滑，${info.moves} 步以內要排好。`} />
      <div className="ch3-harbor-side panel">
        <h3>{info.title}</h3>
        <p className={`ch3-moves ${moves >= info.moves - 2 ? 'warn' : ''}`}>已經 {moves} 步<small>／最多 {info.moves} 步</small></p>
        <p className="ch3-tip">按住船，往前或往後拖。同一艘船連續拖，只算一步。</p>
        <button className="ch3-reset" disabled={won || busy} onClick={() => { sfx('SE-02'); setBoats(h.boats); setMoves(0); setLast(null); }}>↺ 從頭排</button>
      </div>
      <div className="ch3-harbor">
        <div className="ch3-grid" style={{ ['--n' as string]: n }}>
          <img className="ch3-sea-bg" src={art3('t-sea')} alt="" />
          {h.rocks.map((r) => <img key={`${r.col},${r.row}`} className="ch3-rock" src={art3('o-12-reef')} alt="" style={{ left: `${(r.col / n) * 100}%`, top: `${(r.row / n) * 100}%` }} />)}
          {boats.map((b) => {
            const off = drag?.id === b.id ? drag.by : 0;
            const col = b.col + (b.across ? off : 0), row = b.row + (b.across ? 0 : off);
            return (
              <div key={b.id} className={`ch3-boat ${b.id === 'A' ? 'red' : ''} ${b.across ? 'across' : 'down'} ${drag?.id === b.id ? 'drag' : ''} ${nextMove?.id === b.id ? 'ch3-hint' : ''}`}
                style={{ left: `${(col / n) * 100}%`, top: `${(row / n) * 100}%`, width: `${((b.across ? b.len : 1) / n) * 100}%`, height: `${((b.across ? 1 : b.len) / n) * 100}%` }}
                onPointerDown={(e) => down(e, b)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                <img className="ch3-boat-img" src={art3(b.id === 'A' ? 'o-12-redship' : b.len === 3 ? 'o-12-junk' : 'o-12-sampan')} alt="" draggable={false}
                  style={b.across ? undefined : { width: `${b.len * 100}%`, height: `${100 / b.len}%` }} />
                {nextMove?.id === b.id && <i className="ch3-nudge">{b.across ? (nextMove.by > 0 ? '→' : '←') : nextMove.by > 0 ? '↓' : '↑'}</i>}
              </div>
            );
          })}
        </div>
        <div className="ch3-exit" style={{ top: `${(h.exitRow / n) * 100}%`, height: `${100 / n}%` }}>
          <img src={art3(li === 0 ? 'o-07-salvador' : 'g-05-ship')} alt="" />
          <small>{li === 0 ? '城堡' : '外海'}</small>
        </div>
      </div>
      {fails >= 5 && !won && <button className="btn demo corner-btn" disabled={busy} onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
