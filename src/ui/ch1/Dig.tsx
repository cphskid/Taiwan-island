import { useState } from 'react';
import { BRUSH_TAPS, CARDS1, DIG_INTRO, ERAS, FINDS, LAYER_ERA, MARK_FOUND, NOTE1, SORT_ASK, SORT_WRONG, art, type EraId } from '../../data/ch1';
import type { Line } from '../../data/babao-chapter';
import { addCard1 } from '../../core/save1';
import { CardPop, Say, Talk } from '../Talk';
import type { Step1Props } from '../Ch1';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'dig' | 'mark' | 'note' | 'sortAsk' | 'sort' | 'card';
// S-09 四層土的中線（圖的高度比例，由上到下）
const LAYER_Y = [0.3, 0.48, 0.67, 0.88];
const NOTE_AT = { layer: 2, x: 0.5 };
const STORY = `${import.meta.env.BASE_URL}img/story/`;

// 步驟 5 考古：今天的考古工地，一層一層刷開土，挖到的東西排回時間尺（越下面越老）
export function Dig({ p, set, next }: Step1Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [brush, setBrush] = useState<Record<string, number>>({});
  const [found, setFound] = useState<string[]>([]);
  const [placed, setPlaced] = useState<Record<string, EraId>>({});
  const [pick, setPick] = useState<string | null>(null);
  const [say, setSay] = useState<Line | null>(null);
  const spots = [...FINDS.map((f) => ({ id: f.id, layer: f.layer, x: f.x })), { id: 'note', ...NOTE_AT }];
  const allFound = spots.every((f) => found.includes(f.id)); // 紙條也要找到才開始排

  const tapSpot = (id: string) => {
    if (phase !== 'dig' || found.includes(id)) return;
    const n = (brush[id] ?? 0) + 1;
    sfx('SE-07');
    setBrush({ ...brush, [id]: n });
    if (n < BRUSH_TAPS) return;
    sfx('SE-05');
    const got = [...found, id];
    setFound(got);
    if (id === 'mark') setPhase('mark');
    else if (id === 'note') { set((o) => ({ ...o, note: true })); setPhase('note'); }
    else if (spots.every((f) => got.includes(f.id))) setTimeout(() => setPhase('sortAsk'), 600);
  };
  const back = () => setPhase(allFound ? 'sortAsk' : 'dig');
  const place = (era: EraId) => {
    if (!pick) return;
    const f = FINDS.find((x) => x.id === pick)!;
    if (LAYER_ERA[f.layer] !== era) { sfx('SE-04'); setSay(SORT_WRONG); return; }
    sfx('SE-36');
    const nextPlaced = { ...placed, [pick]: era };
    setPlaced(nextPlaced); setPick(null); setSay(null);
    if (FINDS.every((x) => nextPlaced[x.id])) {
      jingle('MU-13');
      set((o) => addCard1(o, 'dig'));
      setTimeout(() => setPhase(p.cards.includes('dig') ? 'sort' : 'card'), 800);
      if (p.cards.includes('dig')) setTimeout(next, 1600);
    }
  };

  return (
    <div className="scene ch1-dig">
      <div className="art-frame dig-frame">
        <img className="art" src={art('s-09')} alt="" />
        {spots.map((s) => {
          const open = found.includes(s.id);
          const f = FINDS.find((x) => x.id === s.id);
          return (
            <button key={s.id} className={`dig-spot ${open ? 'open' : ''}`} style={{ left: `${s.x * 100}%`, top: `${LAYER_Y[s.layer] * 100}%`, ['--b' as string]: brush[s.id] ?? 0 }}
              onClick={() => tapSpot(s.id)} aria-label="土塊">
              {open ? <img src={f ? f.img : `${STORY}G-02_5.webp`} alt="" /> : <span className="dirt" />}
            </button>
          );
        })}
      </div>
      <div className="task-chip">{phase === 'sort' ? '點一樣東西，再點它屬於的時代' : `用刷子刷開土塊（點 ${BRUSH_TAPS} 下）：找到 ${found.filter((x) => x !== 'note').length} / ${FINDS.length}`}</div>
      {phase === 'intro' && <Talk lines={DIG_INTRO} onDone={() => setPhase('dig')} />}
      {phase === 'mark' && <Talk lines={MARK_FOUND} onDone={back} />}
      {phase === 'note' && (
        <div className="talk-cover" onClick={back}>
          <div className="panel mission note">
            <img className="traveler" src={`${STORY}F-03_5.webp`} alt="" />
            <p className="note-text">「{NOTE1.text}」</p>
            <small>—— {NOTE1.sign}</small>
            <img className="note-map" src={`${STORY}G-02_10.webp`} alt="" />
            <p className="grows">土層裡夾著一張紙條，背面又是一小塊地圖。</p>
            <span className="talk-next">點一下繼續 ▶</span>
          </div>
        </div>
      )}
      {phase === 'sortAsk' && <Talk lines={SORT_ASK} onDone={() => setPhase('sort')} />}
      {(phase === 'sort' || phase === 'card') && (
        <div className="ruler panel">
          <div className="ruler-tray">
            {FINDS.filter((f) => !placed[f.id]).map((f) => (
              <button key={f.id} className={`ruler-item ${pick === f.id ? 'on' : ''}`} onClick={() => { sfx('SE-01'); setPick(f.id); }}>
                <img src={f.img} alt="" /><small>{f.name}</small>
              </button>
            ))}
            {FINDS.every((x) => placed[x.id]) && <b className="yes">全部排好了！</b>}
          </div>
          <div className="ruler-line">
            {[...ERAS].map((e) => (
              <button key={e.id} className={`ruler-slot ${pick ? 'ready' : ''}`} onClick={() => place(e.id)}>
                <b>{e.name}</b><small>{e.age}・{e.when}</small>
                <span className="ruler-got">{FINDS.filter((f) => placed[f.id] === e.id).map((f) => <img key={f.id} src={f.img} alt={f.name} />)}</span>
              </button>
            ))}
          </div>
          <div className="ruler-arrow"><span>比較早</span><i /><span>比較晚</span></div>
        </div>
      )}
      {phase === 'card' && <CardPop title={CARDS1.dig.title} text={CARDS1.dig.text} onClose={next} />}
      <Say line={say} />
    </div>
  );
}
