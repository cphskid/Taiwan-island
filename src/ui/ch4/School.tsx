import { useState } from 'react';
import { checkTemple, ck, type Bld, type Cell } from '../../core/tuntian';
import { BLDS, TEMPLE, TEMPLE_CLUES, TEMPLE_DONE, TEMPLE_INTRO, TEMPLE_SAY, art4 } from '../../data/ch4';
import { PEOPLE, type Line } from '../../data/babao-chapter';
import { Face, Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards, type Step4Props } from '../Ch4';
import { Decide4, Jump4 } from './Story4';
import { jingle, sfx } from '../../audio';

type Phase = 'jump' | 'intro' | 'build' | 'done' | 'choice' | 'cards';

// 步驟 4 蓋學堂：1666 年的孔廟。聽大家說的線索，把六個建築放到中軸線兩邊對的位置
export function School({ p, set, next, oops }: Step4Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  const [placed, setPlaced] = useState<Partial<Record<Bld, Cell>>>({});
  const [pick, setPick] = useState<Bld | null>(null);
  const [wrong, setWrong] = useState<Bld[]>([]);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const left = BLDS.filter((b) => !placed[b.id]);
  const whoAt = (c: Cell) => (Object.keys(placed) as Bld[]).find((b) => ck(placed[b]!) === ck(c));

  const tapCell = (c: Cell) => {
    if (phase !== 'build') return;
    const there = whoAt(c);
    if (pick) {
      sfx('SE-36');
      const nextPlaced = { ...placed, [pick]: c };
      if (there && there !== pick) delete nextPlaced[there];
      setPlaced(nextPlaced);
      setWrong(wrong.filter((w) => w !== pick && w !== there));
      setPick(null);
      return;
    }
    if (there) {
      // 拿起來重放
      sfx('SE-02');
      const { [there]: _, ...rest } = placed;
      setPlaced(rest);
      setWrong(wrong.filter((w) => w !== there));
      setPick(there);
    }
  };
  const check = () => {
    const r = checkTemple(TEMPLE, placed);
    if (r.done) { jingle('MU-13'); setSay({ who: 'chen', text: '每一座都放對了！' }); setTimeout(() => { setSay(null); setPhase('done'); }, 1600); return; }
    sfx('SE-04'); oops();
    setWrong(r.wrong);
    const f = fails + 1;
    setFails(f);
    setSay(f >= 3 ? TEMPLE_SAY.spot : f >= 2 ? TEMPLE_SAY.hint : TEMPLE_SAY.wrong);
  };
  const demo = () => { setPlaced({ ...TEMPLE.answer }); setWrong([]); setPick(null); };
  const target = pick && fails >= 3 ? ck(TEMPLE.answer[pick]) : null;

  return (
    <div className="scene ch4-school">
      <img className="scene-bg" src={art4('s-18')} alt="" />
      {phase === 'jump' && <Jump4 to={2} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={TEMPLE_INTRO} onDone={() => setPhase('build')} />}
      {phase === 'build' && <Goal floating text={left.length ? `照大家說的，把孔廟的建築放好：還有 ${left.length} 座` : '都放好了，按「蓋好了！」'} />}
      {phase !== 'jump' && phase !== 'intro' && (
        <div className="ch4-temple-wrap">
          <div className="clues panel">
            <h3>大家說</h3>
            {TEMPLE_CLUES.map((c, i) => (
              <div className="clue" key={i}><Face who={c.who} small /><span><b style={{ color: PEOPLE[c.who].color }}>{PEOPLE[c.who].name}：</b>{c.text}</span></div>
            ))}
          </div>
          <div className="ch4-temple panel">
            <div className="ch4-tray">
              {left.map((b) => (
                <button key={b.id} className={`ch4-bld ${pick === b.id ? 'on' : ''}`} disabled={phase !== 'build'} onClick={() => { sfx('SE-01'); setPick(pick === b.id ? null : b.id); }}>
                  <img src={b.img} alt="" className={b.id === 'westWing' ? 'flip' : ''} /><small>{b.name}</small>
                </button>
              ))}
              {!left.length && phase === 'build' && <button className="btn green" onClick={check}>蓋好了！</button>}
              {pick && <small className="ch4-tray-tip">點格子放下去</small>}
            </div>
            <div className="ch4-site-box">
              <span className="ch4-compass n">北（後面）</span>
              <div className="ch4-site" style={{ ['--cols' as string]: TEMPLE.cols }}>
                {Array.from({ length: TEMPLE.rows }, (_, row) => Array.from({ length: TEMPLE.cols }, (_, col) => {
                  const c = { col, row };
                  const b = whoAt(c);
                  const info = b && BLDS.find((x) => x.id === b)!;
                  return (
                    <button key={ck(c)} className={`ch4-lot ${col === Math.floor(TEMPLE.cols / 2) ? 'axis' : ''} ${pick ? 'ready' : ''} ${b && wrong.includes(b) ? 'wrong' : ''} ${target === ck(c) ? 'hint' : ''}`} onClick={() => tapCell(c)}>
                      {info && <img src={info.img} alt="" className={info.id === 'westWing' ? 'flip' : ''} />}
                      {info && <small>{info.name}</small>}
                    </button>
                  );
                }))}
              </div>
              <span className="ch4-compass s">南（前面）</span>
              <span className="ch4-compass w">西</span>
              <span className="ch4-compass e">東</span>
            </div>
            <small className="cal-tip">中間發黃的那一直排是中軸線。點建築再點格子；放好的點一下可以拿起來</small>
          </div>
        </div>
      )}
      {fails >= 5 && phase === 'build' && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      {phase === 'done' && <Talk lines={TEMPLE_DONE} onDone={() => setPhase('choice')} />}
      {phase === 'choice' && <Decide4 id="school" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards ids={['c4-temple', 'c4-chengtian']} p={p} set={set} onDone={next} />}
      <Say line={phase === 'build' ? say : null} />
    </div>
  );
}
