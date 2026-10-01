import { useState } from 'react';
import { CARDS, QUESTIONS, TRUTH, img } from '../../data/babao-chapter';
import { fresh, starsOf } from '../../core/save';
import { PARK_URL } from '../../net/park';
import type { StepProps } from '../Chapter';

const BASE = import.meta.env.BASE_URL;
type Phase = 'harvest' | 'truth' | 'quiz' | 'stars';

// 步驟 5 結算：豐收、拿到時之齒輪、「真的是這樣嗎？」卡、反思題、星星
export function Finale({ p, set, exit }: StepProps) {
  const [phase, setPhase] = useState<Phase>(p.done ? 'stars' : 'harvest');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUESTIONS[qi];

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    set((o) => { const a = [...o.answers]; a[qi] = i; return { ...o, answers: a }; });
  };
  const nextQ = () => {
    setPicked(null);
    if (qi + 1 < QUESTIONS.length) { setQi(qi + 1); return; }
    set((o) => ({ ...o, done: true, stars: Math.max(o.stars, starsOf(o, QUESTIONS.map((x) => x.answer))) }));
    setPhase('stars');
  };

  const stars = starsOf(p, QUESTIONS.map((x) => x.answer));
  return (
    <div className="scene finale">
      <img className="scene-bg" src={img('S-03')} alt="" />

      {phase === 'harvest' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="gear" src={img('gear')} alt="" />
            <h2>大豐收！</h2>
            <p>漳州莊和泉州莊的稻子都變成金黃色了。<br />滴答拿回了第五顆時之齒輪！</p>
            <img src={`${BASE}img/tick/happy.webp`} alt="" />
            <button className="btn green" onClick={() => setPhase('truth')}>繼續</button>
          </div>
        </div>
      )}

      {phase === 'truth' && (
        <div className="talk-cover">
          <div className="panel truth">
            <h2>{TRUTH.title}</h2>
            <p><b>遊戲裡：</b>{TRUTH.game}</p>
            <p><b>真實的歷史：</b>{TRUTH.real}</p>
            <button className="btn green" onClick={() => setPhase('quiz')}>我知道了</button>
          </div>
        </div>
      )}

      {phase === 'quiz' && (
        <div className="talk-cover">
          <div className="panel quiz">
            <small>想一想（{qi + 1} / {QUESTIONS.length}）</small>
            <h3>{q.q}</h3>
            {q.options.map((o, i) => (
              <button
                key={o}
                className={`opt ${picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : ''}`}
                onClick={() => answer(i)}
              >{o}</button>
            ))}
            {picked !== null && (
              <>
                <p className={picked === q.answer ? 'yes' : 'no'}>{picked === q.answer ? '答對了！' : '再想想：'}{q.why}</p>
                <button className="btn green" onClick={nextQ}>{qi + 1 < QUESTIONS.length ? '下一題' : '看結果'}</button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'stars' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="badge" src={img('badge-canal')} alt="" />
            <h2>第五章 八堡圳 完成！</h2>
            <div className="stars">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? 'on' : ''}>★</span>)}</div>
            <ul className="star-why">
              <li className="on">把水引進來，兩莊都豐收</li>
              <li className={p.broken === 0 ? 'on' : ''}>竹蛇籠一個都沒被沖壞{p.broken ? `（壞了 ${p.broken} 個）` : ''}</li>
              <li className={QUESTIONS.every((x, i) => p.answers[i] === x.answer) ? 'on' : ''}>想一想全部答對</li>
            </ul>
            <p className="cards-got">圖鑑卡：{p.cards.map((c) => CARDS[c]?.title).filter(Boolean).join('、')}</p>
            <div className="row">
              <button className="btn green" onClick={exit}>回大地圖看看</button>
              <button className="btn orange" onClick={() => set(() => ({ ...fresh() }))}>從頭再玩</button>
              {PARK_URL && <a className="btn orange" href={PARK_URL}>回樂園</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
