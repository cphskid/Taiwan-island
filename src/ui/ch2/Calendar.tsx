import { useState } from 'react';
import { calendarCheck, SEASONS } from '../../core/mountain';
import { CAL_INTRO, CAL_WRONG, CHORE_IMG, CHORES, CLUES, art2 } from '../../data/ch2';
import { PEOPLE, type Line } from '../../data/babao-chapter';
import { Face, Say, Talk } from '../Talk';
import { NewCards, type Step2Props } from '../Ch2';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'sort' | 'cards';
const SEASON_ICON = ['🌱', '☀️', '🍂', '❄️'];

// 步驟 4 一年的生活：聽大家說的線索，把八件事放進對的季節
export function Calendar({ p, set, next, oops }: Step2Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [placed, setPlaced] = useState<Record<string, number>>({});
  const [pick, setPick] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const left = CHORES.filter((c) => placed[c.id] === undefined);

  const put = (s: number) => {
    if (!pick) return;
    sfx('SE-36');
    setPlaced({ ...placed, [pick]: s });
    setWrong(wrong.filter((w) => w !== pick));
    setPick(null);
  };
  const back = (id: string) => {
    sfx('SE-02');
    const { [id]: _, ...rest } = placed;
    setPlaced(rest);
    setWrong(wrong.filter((w) => w !== id));
  };
  const check = () => {
    const r = calendarCheck(CHORES, placed);
    if (r.done) { jingle('MU-13'); setSay({ who: 'ani', mood: 'thumbs', text: '全部放對了！這就是我們的一年。' }); setTimeout(() => setPhase('cards'), 1600); return; }
    sfx('SE-04'); oops();
    setWrong(r.wrong);
    setFails(fails + 1);
    setSay(CAL_WRONG);
  };
  const demo = () => { setPlaced(Object.fromEntries(CHORES.map((c) => [c.id, c.season]))); setWrong([]); };
  return (
    <div className="scene ch2-cal">
      <img className="scene-bg" src={art2('s-10')} alt="" />
      {phase === 'intro' && <Talk lines={CAL_INTRO} onDone={() => setPhase('sort')} />}
      {phase !== 'intro' && (
        <div className="cal-wrap">
          <div className="clues panel">
            <h3>大家說</h3>
            {CLUES.map((c, i) => (
              <div className="clue" key={i}><Face who={c.who} small /><span><b style={{ color: PEOPLE[c.who].color }}>{PEOPLE[c.who].name}：</b>{c.text}</span></div>
            ))}
          </div>
          <div className="cal panel">
            <div className="ruler-tray">
              {left.map((c) => (
                <button key={c.id} className={`ruler-item ${pick === c.id ? 'on' : ''}`} onClick={() => { sfx('SE-01'); setPick(c.id); }}>
                  <img src={CHORE_IMG[c.id]} alt="" /><small>{c.name}</small>
                </button>
              ))}
              {!left.length && <button className="btn green" onClick={check}>這樣對嗎？</button>}
            </div>
            <div className="ruler-line">
              {SEASONS.map((name, s) => (
                <div key={name} role="button" className={`ruler-slot cal-slot ${pick ? 'ready' : ''}`} onClick={() => put(s)}>
                  <b>{SEASON_ICON[s]} {name}</b>
                  <span className="cal-got">
                    {CHORES.filter((c) => placed[c.id] === s).map((c) => (
                      <button key={c.id} className={`cal-chip ${wrong.includes(c.id) ? 'wrong' : ''} ${fails >= 3 && c.season !== s ? 'wrong' : ''}`} onClick={(e) => { e.stopPropagation(); if (pick) put(s); else back(c.id); }}>
                        <img src={CHORE_IMG[c.id]} alt="" />{c.name}
                      </button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <small className="cal-tip">點一件事，再點它的季節；放錯了點一下可以拿回來</small>
          </div>
        </div>
      )}
      {fails >= 5 && phase === 'sort' && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      {phase === 'cards' && <NewCards ids={['season']} p={p} set={set} onDone={next} />}
      <Say line={phase === 'sort' ? say : null} />
    </div>
  );
}
