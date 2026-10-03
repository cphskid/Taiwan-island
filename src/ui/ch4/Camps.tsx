import { useState } from 'react';
import { campSolutions, checkCamps, ck, type Cell, type CampCheck } from '../../core/tuntian';
import { CAMPS, CAMP_DONE, CAMP_INTRO, CAMP_NAMES, CAMP_RULES, CAMP_SAY, art4 } from '../../data/ch4';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards, type Step4Props } from '../Ch4';
import { Decide4 } from './Story4';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'place' | 'names' | 'done' | 'choice' | 'cards';
const TILE: Record<string, string> = { '.': 'o-08-dry', '~': 'o-08-pond', s: 'o-08-village', h: 'o-08-potato' };
const TAG: Record<string, string> = { s: '社', h: '社的田', b: '竹林' };
const RULE_NO: Record<string, number> = Object.fromEntries(CAMP_RULES.map((r, i) => [r.id, i + 1]));

// 步驟 1 分營屯田：在平原上紮 4 個營盤，要靠水、不佔社的地、不擠在一起、又能互相支援；過關看今天的地名
export function Camps({ p, set, next, oops }: Step4Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [camps, setCamps] = useState<Cell[]>([]);
  const [res, setRes] = useState<CampCheck | null>(null);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const sol = fails >= 3 ? campSolutions(CAMPS, 1)[0] : null;
  const has = (c: Cell) => camps.findIndex((x) => ck(x) === ck(c));

  const tap = (c: Cell) => {
    if (phase !== 'place') return;
    const i = has(c);
    setRes(null);
    if (i >= 0) { sfx('SE-02'); setCamps(camps.filter((_, k) => k !== i)); return; }
    if (camps.length >= CAMPS.camps) { sfx('SE-04'); setSay({ who: 'xlian', mood: 'thinking', text: `只有 ${CAMPS.camps} 個營盤喔。點一下已經紮好的營盤，可以拿起來。` }); return; }
    sfx('SE-107');
    setCamps([...camps, c]);
  };
  const check = () => {
    const r = checkCamps(CAMPS, camps);
    setRes(r);
    if (r.ok) { jingle('MU-13'); setSay(CAMP_SAY.good); setTimeout(() => { setSay(null); setPhase('done'); }, 1800); return; }
    sfx('SE-71'); oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 3 ? CAMP_SAY.spot : f >= 2 ? CAMP_SAY.hint : Object.keys(r.bad).length ? CAMP_SAY.first : CAMP_SAY.lonely);
  };
  const demo = () => { const s = campSolutions(CAMPS, 1)[0]; setCamps(s); setRes(null); };

  return (
    <div className="scene ch4-camps">
      <img className="scene-bg" src={art4('s-16')} alt="" />
      {phase === 'intro' && <Talk lines={CAMP_INTRO} onDone={() => setPhase('place')} />}
      {phase === 'place' && <Goal floating text={camps.length < CAMPS.camps ? `紮 ${CAMPS.camps} 個營盤：還有 ${CAMPS.camps - camps.length} 個` : '紮好了，按「檢查」'} />}
      {phase !== 'intro' && (
        <div className="ch4-camp-wrap">
          <div className="ch4-map panel" style={{ ['--cols' as string]: CAMPS.rows[0].length }}>
            <span className="ch4-north">北 ▲</span>
            {CAMPS.rows.flatMap((line, row) => [...line].map((ch, col) => {
              const c = { col, row };
              const i = has(c);
              const bad = res?.bad[ck(c)];
              const hint = sol?.some((x) => ck(x) === ck(c));
              return (
                <button key={ck(c)} className={`ch4-tile t-${ch === '~' ? 'w' : ch === '.' ? 'p' : ch} ${hint ? 'hint' : ''} ${bad ? 'bad' : ''}`} onClick={() => tap(c)} aria-label={`${col},${row}`}>
                  {TILE[ch] && <img className="ch4-ground" src={art4(TILE[ch])} alt="" />}
                  {ch === 'b' && <span className="ch4-bamboo">🎋</span>}
                  {TAG[ch] && <small className="ch4-tag">{TAG[ch]}</small>}
                  {i >= 0 && <img className="ch4-campimg" src={art4('o-08-camp')} alt="營盤" />}
                  {i >= 0 && phase !== 'place' && <b className="ch4-campname">{CAMP_NAMES[i].name}</b>}
                  {bad && <em className="ch4-bad">{bad.map((r) => RULE_NO[r]).join('、')}</em>}
                </button>
              );
            }))}
          </div>
          <div className="ch4-rules panel">
            <h3>紮營的規矩</h3>
            <ol>
              {CAMP_RULES.map((r) => <li key={r.id} className={res && Object.values(res.bad).some((b) => b.includes(r.id as never)) || (r.id === 'help' && res?.lonely) ? 'broke' : ''}>{r.text}</li>)}
            </ol>
            {phase === 'place' && (
              <div className="row">
                <button className="btn orange" disabled={!camps.length} onClick={() => { sfx('SE-02'); setCamps([]); setRes(null); }}>全部拿起來</button>
                <button className="btn green" disabled={camps.length !== CAMPS.camps} onClick={check}>檢查</button>
              </div>
            )}
          </div>
        </div>
      )}
      {fails >= 5 && phase === 'place' && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      {phase === 'names' && (
        <div className="talk-cover">
          <div className="panel mission ch4-names">
            <h2>營盤的名字，留到了今天</h2>
            <table>
              <tbody>
                {CAMP_NAMES.map((n) => <tr key={n.name}><td><img src={art4('o-08-camp')} alt="" /><b>{n.name}</b></td><td>→</td><td>{n.now}</td></tr>)}
              </tbody>
            </table>
            <p>還有前鎮、後勁……很多地名都是當年軍隊紮營的地方。</p>
            <button className="btn green" onClick={() => setPhase('choice')}>好神奇！</button>
          </div>
        </div>
      )}
      {phase === 'done' && <Talk lines={CAMP_DONE} onDone={() => setPhase('names')} />}
      {phase === 'choice' && <Decide4 id="land" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards ids={['c4-tuntian', 'c4-campnames', 'c4-plains']} p={p} set={set} onDone={next} />}
      <Say line={phase === 'place' ? say : null} />
    </div>
  );
}
