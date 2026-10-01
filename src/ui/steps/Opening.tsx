import { useState } from 'react';
import { CARDS, MISSIONS, OPENING, img } from '../../data/babao-chapter';
import { CardPop, Talk } from '../Talk';
import type { StepProps } from '../Chapter';

const BASE = import.meta.env.BASE_URL;

// 步驟 0 開場：滴答帶你穿越到溪邊，大家輪流說難處，最後彈出任務板
export function Opening({ p, set, next }: StepProps) {
  const [board, setBoard] = useState(false);
  const [card, setCard] = useState(false);
  const talked = () => {
    setBoard(true);
    if (!p.cards.includes('shi')) { set((o) => ({ ...o, cards: [...o.cards, 'shi'] })); setCard(true); }
  };
  return (
    <div className="scene opening">
      <img className="scene-bg" src={img('S-01')} alt="" />
      {!board && <Talk lines={OPENING} onDone={talked} />}
      {card && <CardPop title={CARDS.shi.title} text={CARDS.shi.text} onClose={() => setCard(false)} />}
      {board && (
        <div className="talk-cover">
          <div className="mission panel">
            <img src={`${BASE}img/tick/happy.webp`} alt="" />
            <h2>任務板</h2>
            <ol>{MISSIONS.map((m) => <li key={m}>{m}</li>)}</ol>
            <button className="btn green" onClick={next}>出發！</button>
          </div>
        </div>
      )}
    </div>
  );
}
