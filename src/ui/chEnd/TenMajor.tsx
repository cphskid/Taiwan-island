import { useState } from 'react';
import { allPlaced, wrongPlaces } from '../../core/today';
import { KINDS, PINS, TEN_DONE, TEN_INTRO, TEN_SAY, TENS, artE, islE, type Kind, type Pin, type TenId } from '../../data/chEnd';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCardsEnd, type StepEndProps } from '../ChEnd';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'kind' | 'map' | 'done' | 'cards';
const IDS = TENS.map((t) => t.id);
const KIND_ANSWER = Object.fromEntries(TENS.map((t) => [t.id, t.kind])) as Record<TenId, Kind>;
const PIN_ANSWER = Object.fromEntries(TENS.map((t) => [t.id, t.pin])) as Record<TenId, Pin>;
const ten = (id: TenId) => TENS.find((t) => t.id === id)!;

// 步驟 1 十大建設：先把十項分成交通、重工業、能源，再放到地圖上對的地方
export function TenMajor({ p, set, next, oops }: StepEndProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className="scene end-ten">
      <img className="scene-bg" src={artE('s-25')} alt="" />
      {phase === 'intro' && <Talk lines={TEN_INTRO} onDone={() => setPhase('kind')} />}
      {phase === 'kind' && <Sort key="kind" mode="kind" oops={oops} onDone={() => setPhase('map')} />}
      {phase === 'map' && <Sort key="map" mode="map" oops={oops} onDone={() => setPhase('done')} />}
      {phase === 'done' && <Talk lines={TEN_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCardsEnd ids={['postwar', 'tenmajor', 'highway', 'airport']} p={p} set={set} onDone={next} />}
    </div>
  );
}

// 分類和放地圖是同一套操作：點一張卡，再點它要去的地方；放錯了點一下可以拿回來
function Sort({ mode, oops, onDone }: { mode: 'kind' | 'map'; oops: () => void; onDone: () => void }) {
  const answer: Record<string, string> = mode === 'kind' ? KIND_ANSWER : PIN_ANSWER;
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<TenId | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [passed, setPassed] = useState(false);
  const left = IDS.filter((id) => placed[id] === undefined);

  const put = (to: string) => {
    if (!pick || passed) return;
    sfx('SE-36');
    setPlaced({ ...placed, [pick]: to });
    setWrong(wrong.filter((w) => w !== pick));
    setPick(null);
  };
  const back = (id: TenId) => {
    if (passed) return;
    sfx('SE-02');
    const { [id]: _, ...rest } = placed;
    setPlaced(rest);
    setWrong(wrong.filter((w) => w !== id));
    setPick(id);
  };
  const check = () => {
    const bad = wrongPlaces(answer, placed);
    if (!bad.length) {
      jingle('MU-13'); setPassed(true);
      setSay(mode === 'kind' ? { who: 'agong', text: '分得好！交通讓人和貨跑得動，重工業做出鋼鐵和船，能源讓工廠有電。' } : TEN_SAY.good);
      setTimeout(onDone, 2200);
      return;
    }
    sfx('SE-04'); oops();
    const f = fails + 1;
    setFails(f);
    setWrong(bad);
    setSay(f >= 2 ? (mode === 'kind' ? TEN_SAY.kindHint : TEN_SAY.pinHint) : mode === 'kind' ? TEN_SAY.kindWrong : TEN_SAY.pinWrong);
  };
  const demo = () => { setPlaced({ ...answer }); setWrong([]); setPick(null); };
  // 失敗 3 次以上：拿著的卡會在正確的地方發光
  const glow = fails >= 3 && pick ? answer[pick] : null;
  const chip = (id: TenId) => (
    <button key={id} className={`end-chip ${wrong.includes(id) ? 'wrong' : ''}`} onClick={(e) => { e.stopPropagation(); if (pick) put(placed[id]); else back(id); }}>
      <img src={ten(id).img} alt="" /><small>{ten(id).name}</small>
    </button>
  );
  const goal = left.length
    ? mode === 'kind' ? `把十大建設分成三類：還有 ${left.length} 項` : `把十大建設放到地圖上：還有 ${left.length} 項。點一張卡，讀線索，再點地圖上的地方。`
    : '都放好了，按「這樣對嗎？」';
  return (
    <div className={`end-sort ${mode}`}>
      <Goal floating text={goal} />
      <div className="end-tray panel">
        {left.map((id) => (
          <button key={id} className={`ruler-item ${pick === id ? 'on' : ''}`} onClick={() => { sfx('SE-01'); setPick(pick === id ? null : id); }}>
            <img src={ten(id).img} alt="" /><small>{ten(id).name}</small>
          </button>
        ))}
        {!left.length && !passed && <button className="btn green" onClick={check}>這樣對嗎？</button>}
        {mode === 'map' && pick && <p className="end-clue"><b>{ten(pick).name}：</b>{ten(pick).clue}</p>}
      </div>
      {mode === 'kind' ? (
        <div className="end-bins">
          {KINDS.map((k) => (
            <div key={k.id} role="button" className={`end-bin panel ${pick ? 'ready' : ''} ${glow === k.id ? 'glow' : ''}`} onClick={() => put(k.id)}>
              <b>{k.icon} {k.name}</b>
              <span>{IDS.filter((id) => placed[id] === k.id).map(chip)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="end-map">
          <img src={islE('m01')} alt="臺灣地圖" />
          {PINS.map((pin) => (
            <div key={pin.id} role="button" className={`end-pin ${pick ? 'ready' : ''} ${glow === pin.id ? 'glow' : ''} ${pin.id === 'west' ? 'line' : ''}`}
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }} onClick={() => put(pin.id)}>
              <i>📍</i><em>{pin.name}</em>
              <span>{IDS.filter((id) => placed[id] === pin.id).map((id) => (
                <button key={id} className={`end-dot ${wrong.includes(id) ? 'wrong' : ''}`} onClick={(e) => { e.stopPropagation(); if (pick) put(pin.id); else back(id); }} aria-label={ten(id).name}>
                  <img src={ten(id).img} alt="" />
                </button>
              ))}</span>
            </div>
          ))}
          <svg className="end-westline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><polyline points="84,7 68,12 53,24 42,35 40,52 39,66 40,78" /></svg>
        </div>
      )}
      {fails >= 5 && !passed && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
