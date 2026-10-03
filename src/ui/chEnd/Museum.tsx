import { useMemo, useState } from 'react';
import { allPlaced, wrongPlaces } from '../../core/today';
import { glanceChapter } from '../../core/saveEnd';
import { EXHIBIT_SHUFFLE, EXHIBITS, MUSEUM_DONE, MUSEUM_INTRO, MUSEUM_SAY, artE, type Exhibit } from '../../data/chEnd';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCardsEnd, type StepEndProps } from '../ChEnd';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'sort' | 'done' | 'cards';
const ANSWER = Object.fromEntries(EXHIBITS.map((e, i) => [e.id, String(i)]));
const exOf = (id: string) => EXHIBITS.find((e) => e.id === id)!;

// 這一樣展品是不是你真的從那個時代帶回來的信物（讀那一章的存檔；別章還沒做就讀不到）
export function broughtBack(e: Exhibit): boolean {
  const g = glanceChapter(e.ch);
  if (!g) return false;
  return e.keepsake ? g.keepsakes.includes(e.keepsake) : g.keepsakes.length > 0;
}

// 步驟 4 時光博物館：九樣展品，照說明放到對的年代展示台上，排成一條時間軸
export function Museum({ p, set, next, oops }: StepEndProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [passed, setPassed] = useState(false);
  const brought = useMemo(() => new Set(EXHIBITS.filter(broughtBack).map((e) => e.id)), []);
  const left = EXHIBIT_SHUFFLE.filter((id) => placed[id] === undefined);
  const atSlot = (i: number) => Object.keys(placed).find((id) => placed[id] === String(i));

  const put = (slot: number) => {
    if (passed || phase !== 'sort') return;
    const there = atSlot(slot);
    if (!pick) { if (there) back(there); return; }
    sfx('SE-36');
    const nextPlaced = { ...placed };
    if (there) delete nextPlaced[there]; // 台子上已經有東西：換下來放回去
    nextPlaced[pick] = String(slot);
    setPlaced(nextPlaced);
    setWrong(wrong.filter((w) => w !== pick && w !== there));
    setPick(null);
  };
  const back = (id: string) => {
    sfx('SE-02');
    const { [id]: _, ...rest } = placed;
    setPlaced(rest);
    setWrong(wrong.filter((w) => w !== id));
  };
  const check = () => {
    const bad = wrongPlaces(ANSWER, placed);
    if (!bad.length) { jingle('MU-13'); setPassed(true); setSay(MUSEUM_SAY.good); setTimeout(() => setPhase('done'), 2400); return; }
    sfx('SE-04'); oops();
    const f = fails + 1;
    setFails(f);
    setWrong(bad);
    setSay(f >= 2 ? MUSEUM_SAY.hint : MUSEUM_SAY.wrong);
  };
  const demo = () => { setPlaced({ ...ANSWER }); setWrong([]); setPick(null); };
  const done = allPlaced(EXHIBITS.map((e) => e.id), placed);
  return (
    <div className="scene end-museum">
      <img className="scene-bg" src={artE('s-27')} alt="" />
      {phase === 'intro' && <Talk lines={MUSEUM_INTRO} onDone={() => setPhase('sort')} />}
      {phase !== 'intro' && (
        <div className="end-museum-wrap">
          {phase === 'sort' && <Goal floating text={left.length ? `把展品放到對的年代：還有 ${left.length} 樣` : '都放好了，按「這樣對嗎？」'} />}
          {!passed && <div className="end-museum-tray panel">
            {left.map((id) => {
              const e = exOf(id);
              return (
                <button key={id} className={`end-museum-item ${pick === id ? 'on' : ''} ${brought.has(id) ? 'brought' : ''}`} onClick={() => { sfx('SE-01'); setPick(pick === id ? null : id); }}>
                  <img src={e.img} alt="" />
                </button>
              );
            })}
            {pick && <p className="end-museum-text">{exOf(pick).text}</p>}
            {!pick && left.length > 0 && <p className="end-museum-text dim">點一樣展品，讀它的說明</p>}
            {done && <button className="btn green" onClick={check}>這樣對嗎？</button>}
          </div>}
          <div className="end-museum-line">
            {EXHIBITS.map((slotEx, i) => {
              const id = atSlot(i);
              const e = id ? exOf(id) : null;
              return (
                <div key={i} role="button" className={`end-museum-slot ${pick ? 'ready' : ''} ${id && wrong.includes(id) ? 'wrong' : ''} ${fails >= 3 && pick && ANSWER[pick] === String(i) ? 'glow' : ''}`} onClick={() => put(i)}>
                  <div className="end-museum-glass">{e && <img className={brought.has(e.id) ? 'brought' : ''} src={e.img} alt="" />}</div>
                  <b>{slotEx.when}</b>
                  {passed && <small>{slotEx.era}</small>}
                  {e && brought.has(e.id) && <em>✨你帶回來的</em>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {fails >= 5 && !passed && phase === 'sort' && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      {phase === 'done' && <Talk lines={MUSEUM_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCardsEnd ids={['eras', 'today']} p={p} set={set} onDone={next} />}
      <Say line={phase === 'sort' ? say : null} />
    </div>
  );
}
