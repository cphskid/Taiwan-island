import { useEffect, useState } from 'react';
import { BACK_TODAY, CARDS_END, CHOICES_END, KEEPSAKE_END, QUESTIONS_END, TRUTH_END, artE, type PickE } from '../../data/chEnd';
import { PEOPLE } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import { freshEnd, starsEnd } from '../../core/saveEnd';
import { PARK_URL } from '../../net/park';
import { NewCardsEnd, type StepEndProps } from '../ChEnd';
import { ambience, jingle, sfx } from '../../audio';

const BASE = import.meta.env.BASE_URL;
const RECAP: PickE[] = ['ride', 'speak', 'park', 'word'];
type Phase = 'talk' | 'tower' | 'keepsake' | 'truth' | 'card' | 'quiz' | 'stars';

// 步驟 6 結算：鐘塔轉起來、鑰匙信物、「真的是這樣嗎？」、反思題、星星、你的選擇
export function FinaleEnd({ p, set, exit }: StepEndProps) {
  const [phase, setPhase] = useState<Phase>(p.done ? 'stars' : 'talk');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUESTIONS_END[qi];
  const correct = QUESTIONS_END.map((x) => x.answer);
  const stars = starsEnd(p, correct);
  useEffect(() => { ambience(phase === 'quiz' || phase === 'truth' ? 'SE-61' : null); if (phase === 'talk') jingle('MU-17'); }, [phase]);
  useEffect(() => {
    if (phase !== 'stars') return;
    const ids = Array.from({ length: stars }, (_, i) => window.setTimeout(() => sfx('SE-35', 1 + 0.12 * i), 300 + 350 * i));
    return () => ids.forEach(clearTimeout);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    sfx(i === q.answer ? 'SE-05' : 'SE-04');
    set((o) => { const a = [...o.answers]; a[qi] = i; return { ...o, answers: a }; });
  };
  const nextQ = () => {
    setPicked(null);
    if (qi + 1 < QUESTIONS_END.length) { setQi(qi + 1); return; }
    set((o) => ({ ...o, done: true, stars: Math.max(o.stars, starsEnd(o, correct)) }));
    setPhase('stars');
  };

  return (
    <div className="scene finale end-final">
      <img className="scene-bg" src={artE('s-25')} alt="" />
      {phase === 'talk' && <Talk lines={BACK_TODAY} onDone={() => setPhase('tower')} />}
      {phase === 'tower' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="gear end-spin" src={artE('o-11-tower')} alt="" />
            <h2>時光鐘塔轉起來了！</h2>
            <p>七顆齒輪回來了，今天的難題也一起解決了。<br />時間，終於往明天走。</p>
            <div className="harvest-pals"><img src={`${BASE}img/tick/happy.webp`} alt="" /><img src={artE('f-10a-cheer')} alt="" /></div>
            <button className="btn green" onClick={() => {
              sfx('SE-36');
              set((o) => ({ ...o, keepsakes: o.keepsakes.includes(KEEPSAKE_END.id) ? o.keepsakes : [...o.keepsakes, KEEPSAKE_END.id], friends: o.friends.includes('an') ? o.friends : [...o.friends, 'an'] }));
              setPhase('keepsake');
            }}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'keepsake' && (
        <div className="talk-cover">
          <div className="panel mission keepsake">
            <small>拿到信物</small>
            <img className="keepsake-img" src={`${BASE}img/${KEEPSAKE_END.img}`} alt="" />
            <h2>{KEEPSAKE_END.title}</h2>
            <p>{KEEPSAKE_END.text}</p>
            <div className="friend-row"><div className="friend mini"><Face who="an" small /><b style={{ color: PEOPLE.an.color }}>{PEOPLE.an.name}</b></div></div>
            <p className="grows">小安成為你的時光朋友了！</p>
            <button className="btn green" onClick={() => setPhase('truth')}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'truth' && (
        <div className="talk-cover">
          <div className="panel truth">
            <h2>{TRUTH_END.title}</h2>
            <p><b>遊戲裡：</b>{TRUTH_END.game}</p>
            <p><b>真實的歷史：</b>{TRUTH_END.real}</p>
            <p className="source">資料來源：{TRUTH_END.source}</p>
            <button className="btn green" onClick={() => setPhase('card')}>我知道了</button>
          </div>
        </div>
      )}
      {phase === 'card' && <NewCardsEnd ids={['future']} p={p} set={set} onDone={() => setPhase('quiz')} />}
      {phase === 'quiz' && (
        <div className="talk-cover">
          <div className="panel quiz">
            <small>想一想（{qi + 1} / {QUESTIONS_END.length}）</small>
            <div className="quiz-ask"><Face who={q.who} small /><h3><b style={{ color: PEOPLE[q.who].color }}>{PEOPLE[q.who].name}：</b>{q.q}</h3></div>
            {q.options.map((o, i) => (
              <button key={o} className={`opt ${picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : ''}`} onClick={() => answer(i)}>{o}</button>
            ))}
            {picked !== null && (
              <>
                <p className={picked === q.answer ? 'yes' : 'no'}>{picked === q.answer ? '答對了！' : '再想想：'}{q.why}</p>
                <button className="btn green" onClick={nextQ}>{qi + 1 < QUESTIONS_END.length ? '下一題' : '看結果'}</button>
              </>
            )}
          </div>
        </div>
      )}
      {phase === 'stars' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="badge" src={`${BASE}img/island/badge-hsr.webp`} alt="" />
            <h2>終章 今天的島嶼 完成！</h2>
            <div className="stars">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? 'on' : ''}>★</span>)}</div>
            <ul className="star-why">
              <li className="on">大家一起做出決定，讓時光鐘塔轉起來</li>
              <li className={p.mistakes <= 3 ? 'on' : ''}>失誤 3 次以內{p.mistakes ? `（失誤 ${p.mistakes} 次）` : ''}</li>
              <li className={QUESTIONS_END.every((x, i) => p.answers[i] === x.answer) ? 'on' : ''}>想一想全部答對</li>
            </ul>
            {RECAP.some((k) => p.picks[k] !== undefined) && (
              <div className="recap">
                <b>你的選擇</b>
                {RECAP.filter((k) => p.picks[k] !== undefined).map((k) => <span key={k}>{CHOICES_END[k].recap[p.picks[k]!]}</span>)}
              </div>
            )}
            {p.keepsakes.includes(KEEPSAKE_END.id) && <p className="cards-got">信物：{KEEPSAKE_END.title}　時光朋友：小安</p>}
            <p className="cards-got">圖鑑卡：{p.cards.map((c) => CARDS_END[c]?.title).filter(Boolean).join('、')}</p>
            <p className="end-last">故事還沒結束——今天的你，正在寫明天的歷史。</p>
            <div className="row">
              <button className="btn green" onClick={exit}>回大地圖看看</button>
              <button className="btn orange" onClick={() => set((o) => ({ ...freshEnd(), friends: o.friends, keepsakes: o.keepsakes, note: o.note, cards: o.cards, revealed: o.revealed }))}>從頭再玩</button>
              {PARK_URL && <a className="btn orange" href={PARK_URL}>回樂園</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
