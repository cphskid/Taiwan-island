import { useEffect, useMemo, useRef, useState } from 'react';
import { decodeCheck, tracePath, type Dir, type Spot } from '../../core/tayouan';
import {
  CLUE_SENTENCES, DEED, DEED_INTRO, DEED_LEGS, DEED_SAY, DIR_NAME, LAND_DECOR, LAND_SPOTS, LAND_START, SECRET, SPOT_ICON, WORDS, art3,
} from '../../data/ch3';
import { PEOPLE, type Line } from '../../data/babao-chapter';
import { Face, Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards3, type Step3Props } from '../Ch3';
import { Decide3 } from './Story3';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'decode' | 'decoded' | 'trace' | 'traced' | 'choice' | 'cards';

// 步驟 4 新港文書：先從例句推出三個方向字，再照契約在地圖上點出土地的界線
export function Deed({ p, set, next, oops }: Step3Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className="scene ch3-plain">
      <img className="scene-bg" src={art3('s-14')} alt="" />
      {phase === 'intro' && <Talk lines={DEED_INTRO} onDone={() => setPhase('decode')} />}
      {phase === 'decode' && <Decode oops={oops} onDone={() => setPhase('decoded')} />}
      {phase === 'decoded' && <Talk lines={[DEED_SAY.decoded]} onDone={() => setPhase('trace')} />}
      {(phase === 'trace' || phase === 'traced' || phase === 'choice') && <Trace oops={oops} onDone={() => setPhase('traced')} />}
      {phase === 'traced' && <Talk lines={[DEED_SAY.traced]} onDone={() => setPhase('choice')} />}
      {phase === 'choice' && <Decide3 id="deed" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards3 ids={['sinkan']} p={p} set={set} onDone={next} />}
    </div>
  );
}

const UNKNOWN = Object.keys(SECRET);
const DIRS: Dir[] = ['E', 'W', 'S', 'N'];
const gloss = (w: string, guess: Partial<Record<string, Dir>>) => WORDS[w] ?? (guess[w] ? DIR_NAME[guess[w]!] : '？');

function Decode({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const [guess, setGuess] = useState<Partial<Record<string, Dir>>>({});
  const [wrong, setWrong] = useState<string[]>([]);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [won, setWon] = useState(false);
  const pick = (w: string, d: Dir) => { if (won) return; sfx('SE-03'); setGuess({ ...guess, [w]: d }); setWrong(wrong.filter((x) => x !== w)); };
  const check = (g = guess) => {
    const r = decodeCheck(SECRET, g as Record<string, string>);
    if (r.done) { sfx('SE-104'); jingle('MU-13'); setWon(true); setWrong([]); setTimeout(onDone, 1300); return; }
    sfx('SE-71'); oops();
    const f = fails + 1;
    setFails(f);
    setWrong(r.wrong);
    setSay(f >= 2 ? DEED_SAY.wordHint : DEED_SAY.wrongWord);
  };
  const all = UNKNOWN.every((w) => guess[w]);
  return (
    <div className="ch3-deed-wrap">
      <Goal floating text="猜出三個不認得的方向字。查單字表，再讀讀下面的句子。" />
      <div className="ch3-deed panel">
        <div className="ch3-deed-head"><h3>📜 社裡的契約</h3><button className="btn green" disabled={!all || won} onClick={() => check()}>讀讀看</button></div>
        <ol className="ch3-contract">
          {DEED.map((l, i) => (
            <li key={i}>{l.words.map((w, k) => (
              <span key={k} className={`ch3-word ${UNKNOWN.includes(w) ? 'unknown' : ''} ${wrong.includes(w) ? 'wrong' : ''} ${won ? 'ok' : ''}`}>
                <b>{w}</b><small>{gloss(w, guess)}</small>
              </span>
            ))}</li>
          ))}
        </ol>
        <div className="ch3-guess">
          {UNKNOWN.map((w) => (
            <div key={w} className={`ch3-guess-row ${wrong.includes(w) ? 'wrong' : ''}`}>
              <b>{w}</b><span>是</span>
              {DIRS.map((d) => (
                <button key={d} className={`${guess[w] === d ? 'on' : ''} ${fails >= 3 && SECRET[w] === d ? 'ch3-hint' : ''}`} onClick={() => pick(w, d)} disabled={won}>{DIR_NAME[d]}</button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="ch3-clues panel">
        <h3>單字表</h3>
        <div className="ch3-dict">{Object.entries(WORDS).map(([w, m]) => <span key={w}><b>{w}</b>{m}</span>)}</div>
        <h3>大家說的話</h3>
        {CLUE_SENTENCES.map((c) => (
          <div key={c.text} className="ch3-clue"><Face who={c.who} small /><span><b style={{ color: PEOPLE[c.who].color }}>{PEOPLE[c.who].name}</b>{c.text}</span></div>
        ))}
      </div>
      {fails >= 5 && !won && <button className="btn demo corner-btn" onClick={() => { const g = { ...SECRET }; setGuess(g); setTimeout(() => check(g), 600); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

const COLS = 7, ROWS = 5;
const RIVER_X = 4.85; // 溪在第 4 格右邊往下流：西岸是社地，東岸是新開的甘蔗田
function Trace({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const path = useMemo(() => tracePath(LAND_SPOTS, LAND_START, DEED_LEGS)!, []);
  const [k, setK] = useState(0); // 已經點到第幾個地標（path[0] 是起點）
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [bad, setBad] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const done = k >= DEED.length;
  const line = DEED[Math.min(k, DEED.length - 1)];
  const want = path[k + 1];
  const tap = (s: Spot) => {
    if (done) return;
    if (s.id === want.id) {
      sfx('SE-104');
      const n = k + 1;
      setK(n);
      setSay(null);
      if (n >= DEED.length) { jingle('MU-13'); setTimeout(() => alive.current && onDone(), 1400); }
      return;
    }
    sfx('SE-71'); oops();
    const f = fails + 1;
    setFails(f);
    setBad(s.id);
    setTimeout(() => alive.current && setBad(null), 600);
    setSay(DEED_SAY.wrongSpot(DIR_NAME[DEED_LEGS[k].dir], WORDS[line.to]));
  };
  const demo = () => {
    let n = k;
    const step = () => { if (!alive.current || n >= DEED.length) return; n += 1; setK(n); sfx('SE-05'); if (n >= DEED.length) { jingle('MU-13'); setTimeout(() => alive.current && onDone(), 1400); } else setTimeout(step, 700); };
    step();
  };
  const xy = (s: { col: number; row: number }) => [((s.col + 0.5) / COLS) * 100, ((s.row + 0.5) / ROWS) * 100];
  const pts = path.slice(0, k + 1).map((s) => xy(s).join(',')).join(' ');
  return (
    <div className="ch3-deed-wrap trace">
      <Goal floating text={done ? '界線找到了！' : `第 ${k + 1} 句：${line.words.join(' ')}（${line.words.map((w) => gloss(w, SECRET)).join('')}）`} />
      <div className="ch3-land">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ch3-land-svg">
          <path className="river" d={`M ${(RIVER_X / COLS) * 100} 0 C ${(RIVER_X / COLS) * 100 + 4} 30, ${(RIVER_X / COLS) * 100 - 4} 60, ${(RIVER_X / COLS) * 100 + 2} 100`} />
          {done ? <polygon className="bound done" points={pts} /> : <polyline className="bound" points={pts} />}
        </svg>
        {LAND_DECOR.map((d) => (
          <span key={d.text} className="ch3-decor" style={{ left: `${((d.col + 0.5) / COLS) * 100}%`, top: `${((d.row + 0.5) / ROWS) * 100}%` }}>{d.icon}<small>{d.text}</small></span>
        ))}
        {LAND_SPOTS.map((s) => {
          const [x, y] = xy(s);
          const icon = SPOT_ICON[s.kind];
          const at = path[k].id === s.id;
          const passed = path.slice(0, k + 1).some((q) => q.id === s.id);
          return (
            <button key={s.id} className={`ch3-spot ${s.kind} ${at ? 'at' : ''} ${passed ? 'passed' : ''} ${bad === s.id ? 'bad' : ''} ${fails >= 3 && !done && want.id === s.id ? 'ch3-hint' : ''}`}
              style={{ left: `${x}%`, top: `${y}%` }} onClick={() => tap(s)} aria-label={WORDS[s.kind]}>
              {icon.startsWith('/') || icon.includes('.webp') ? <img src={icon} alt="" /> : <i>{icon || '💧'}</i>}
              <small>{s.kind}</small>
            </button>
          );
        })}
        <div className="ch3-rose"><b>北</b><span>西 ✛ 東</span><b>南</b></div>
      </div>
      {fails >= 5 && !done && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
