import { useState } from 'react';
import { timeline, trainCheck, trainSolve, type Meet, type TrainLevel } from '../../core/railway';
import { TRAIN_DONE, TRAIN_INTRO, TRAIN_NAME, TRAIN_SAY, TRAINS, art6 } from '../../data/ch6';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards6, type Step6Props } from '../Ch6';
import { Decide6, Jump6 } from './Story6';
import { jingle, sfx } from '../../audio';

type Phase = 'jump' | 'intro' | 'cargo' | 'plan' | 'done' | 'cards';

// 步驟 5 基隆到新竹：單線鐵路，兩列車對開。排每列車在中間各站停多久，不能在同一段軌道上碰頭，也不能遲到
export function Train6({ p, set, next, oops }: Step6Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  return (
    <div className="scene ch6-train">
      <img className="scene-bg" src={art6('s-20')} alt="" />
      {phase === 'jump' && <Jump6 from={2} to={3} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={TRAIN_INTRO} onDone={() => setPhase('cargo')} />}
      {phase === 'cargo' && <Decide6 id="cargo" set={set} onDone={() => setPhase('plan')} />}
      {phase === 'plan' && <Timetable way={p.picks.cargo === 1 ? 1 : 0} oops={oops} onDone={() => setPhase('done')} />}
      {phase === 'done' && <Talk lines={TRAIN_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards6 ids={['c6-railway', 'c6-keelung', 'c6-telegraph']} p={p} set={set} onDone={next} />}
    </div>
  );
}

// 火車在時間 t 的位置（從基隆算起的距離）
function where(lv: TrainLevel, waits: readonly number[], down: boolean, t: number): number {
  const tl = timeline(lv, waits, down);
  const dist = (st: number) => lv.legs.slice(0, st).reduce((a, b) => a + b, 0);
  let pos = down ? 0 : dist(lv.legs.length);
  for (const s of tl.segs) {
    const a = down ? dist(s.seg) : dist(s.seg + 1), b = down ? dist(s.seg + 1) : dist(s.seg);
    if (t < s.from) return pos;
    if (t <= s.to) return a + ((b - a) * (t - s.from)) / (s.to - s.from);
    pos = b;
  }
  return pos;
}

const W = 560, HH = 230, PADL = 64, PADT = 14, PADB = 26;

function Timetable({ way, onDone, oops }: { way: 0 | 1; onDone: () => void; oops: () => void }) {
  const lv = TRAINS[way];
  const mid = lv.stations.slice(1, -1);
  const [waits, setWaits] = useState<[number[], number[]]>([mid.map(() => 0), mid.map(() => 0)]);
  const [res, setRes] = useState<Meet | null>(null);
  const [t, setT] = useState<number | null>(null);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const sol = trainSolve(lv)[0];
  const total = lv.legs.reduce((a, b) => a + b, 0);
  const tMax = Math.max(...lv.deadline) + 2;
  const X = (tt: number) => PADL + (tt / tMax) * (W - PADL - 8);
  const Y = (d: number) => PADT + (d / total) * (HH - PADT - PADB);
  const dists = lv.stations.map((_, i) => lv.legs.slice(0, i).reduce((a, b) => a + b, 0));
  const running = t !== null && !res;

  const bump = (k: 0 | 1, i: number, d: number) => {
    if (running || res?.ok) return;
    sfx('SE-01');
    const w = waits.map((r) => [...r]) as [number[], number[]];
    w[k][i] = Math.max(0, Math.min(lv.maxWait, w[k][i] + d));
    setWaits(w); setRes(null); setT(null);
  };
  const go = () => {
    const r = trainCheck(lv, waits[0], waits[1]);
    const end = r.crash ? r.crash.t : Math.max(...r.arrive);
    sfx('SE-09');
    setRes(null);
    const t0 = performance.now();
    setT(0);
    // 一格時間跑 0.18 秒（照真的時間算，分頁卡頓也不會變慢）
    const step = () => {
      const now = Math.min(end, (performance.now() - t0) / 180);
      setT(now);
      if (now < end) { requestAnimationFrame(step); return; }
      setRes(r);
      if (r.ok) { jingle('MU-13'); setSay(TRAIN_SAY.good); setTimeout(onDone, 2200); return; }
      sfx('SE-71'); oops();
      const f = fails + 1;
      setFails(f);
      setSay(f >= 2 ? TRAIN_SAY.hint : r.crash ? TRAIN_SAY.crash : TRAIN_SAY.late);
    };
    requestAnimationFrame(step);
  };

  const lineOf = (k: 0 | 1) => {
    const tl = timeline(lv, waits[k], k === 0);
    const pts: string[] = [`${X(0)},${Y(k === 0 ? 0 : total)}`];
    for (const s of tl.segs) {
      const a = k === 0 ? dists[s.seg] : dists[s.seg + 1], b = k === 0 ? dists[s.seg + 1] : dists[s.seg];
      pts.push(`${X(s.from)},${Y(a)}`, `${X(s.to)},${Y(b)}`);
    }
    return pts.join(' ');
  };
  const COL = ['#2f6fd1', '#c0702a'];
  return (
    <div className="ch6-train-wrap">
      <Goal floating text={`排好兩列車在各站停多久，不撞車、也不遲到。一格是 10 分鐘；客車最晚第 ${lv.deadline[0]} 格、貨車最晚第 ${lv.deadline[1]} 格要到。`} />
      <div className="ch6-train-board panel">
        <div className="ch6-train-plan">
          {([0, 1] as const).map((k) => (
            <div key={k} className="ch6-train-row" style={{ ['--c' as string]: COL[k] }}>
              <b><img src={art6(k === 0 ? 'o-09-car' : 'o-09-loco')} alt="" />{TRAIN_NAME[k]}</b>
              <small className={res?.late[k] ? 'late' : ''}>最晚第 {lv.deadline[k]} 格到{res ? `（第 ${res.arrive[k]} 格到）` : ''}</small>
              <div className="ch6-waits">
                {mid.map((name, i) => (
                  <div key={name} className={`ch6-wait ${fails >= 3 && sol && (k === 0 ? sol.down : sol.up)[i] > 0 ? 'hint' : ''}`}>
                    <span>{name}</span>
                    <div className="stepper">
                      <button disabled={running || waits[k][i] <= 0} onClick={() => bump(k, i, -1)}>−</button>
                      <em>停 {waits[k][i]} 格</em>
                      <button disabled={running || waits[k][i] >= lv.maxWait} onClick={() => bump(k, i, 1)}>＋</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <svg className="ch6-diagram" viewBox={`0 0 ${W} ${HH}`}>
          {lv.stations.map((s, i) => (
            <g key={s}>
              <line x1={PADL} x2={W - 8} y1={Y(dists[i])} y2={Y(dists[i])} className="ch6-d-stn" />
              <text x={PADL - 6} y={Y(dists[i]) + 5} textAnchor="end" className="ch6-d-name">{s}</text>
            </g>
          ))}
          {Array.from({ length: tMax + 1 }, (_, i) => i).filter((i) => i % 2 === 0).map((i) => (
            <text key={i} x={X(i)} y={HH - 6} textAnchor="middle" className="ch6-d-tick">{i}</text>
          ))}
          {([0, 1] as const).map((k) => <line key={k} x1={X(lv.deadline[k])} x2={X(lv.deadline[k])} y1={PADT} y2={HH - PADB} className="ch6-d-dead" stroke={COL[k]} />)}
          <defs><clipPath id="ch6-clip"><rect x="0" y="0" width={t === null ? 0 : X(t)} height={HH} /></clipPath></defs>
          {t !== null && ([0, 1] as const).map((k) => <polyline key={k} points={lineOf(k)} fill="none" stroke={COL[k]} strokeWidth="5" strokeLinejoin="round" clipPath="url(#ch6-clip)" />)}
          {t !== null && ([0, 1] as const).map((k) => <circle key={k} cx={X(t)} cy={Y(where(lv, waits[k], k === 0, t))} r="8" fill={COL[k]} stroke="#fff" strokeWidth="3" />)}
          {res?.crash && <text x={X(res.crash.t)} y={Y((dists[res.crash.seg] + dists[res.crash.seg + 1]) / 2) + 10} textAnchor="middle" className="ch6-d-boom">💥</text>}
        </svg>
        <div className="ch6-train-foot">
          <small>{res ? (res.ok ? '兩列車都平安準時到站！' : res.crash ? `在${lv.stations[res.crash.seg]}和${lv.stations[res.crash.seg + 1]}中間撞車了！` : '有一列車遲到了') : '往右是時間（一格 10 分鐘），往下是從基隆到新竹。平平的線＝停在車站。'}</small>
          <button className="btn orange" disabled={running || !!res?.ok} onClick={() => { sfx('SE-02'); setWaits([mid.map(() => 0), mid.map(() => 0)]); setRes(null); setT(null); }}>重排</button>
          <button className="btn green" disabled={running || !!res?.ok} onClick={go}>發車！</button>
        </div>
      </div>
      {fails >= 5 && !res?.ok && <button className="btn demo corner-btn" onClick={() => { setWaits([[...sol.down], [...sol.up]]); setRes(null); setT(null); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
