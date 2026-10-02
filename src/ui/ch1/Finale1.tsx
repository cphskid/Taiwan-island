import { useEffect, useState } from 'react';
import { BACK_NOW, CARDS1, KEEPSAKE1, QUESTIONS1, TRUTH1, art } from '../../data/ch1';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import { fresh1, stars1 } from '../../core/save1';
import { PARK_URL } from '../../net/park';
import type { Step1Props } from '../Ch1';
import { ambience, jingle, sfx } from '../../audio';

const BASE = import.meta.env.BASE_URL;
type Phase = 'talk' | 'gear' | 'keepsake' | 'truth' | 'quiz' | 'stars';

// 步驟 6 回到現在：齒輪回到時光鐘、阿岩的信物、「真的是這樣嗎？」、反思題、星星
export function Finale1({ p, set, exit }: Step1Props) {
  const [phase, setPhase] = useState<Phase>(p.done ? 'stars' : 'talk');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUESTIONS1[qi];
  const correct = QUESTIONS1.map((x) => x.answer);
  const stars = stars1(p, correct);
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
    if (qi + 1 < QUESTIONS1.length) { setQi(qi + 1); return; }
    set((o) => ({ ...o, done: true, stars: Math.max(o.stars, stars1(o, correct)) }));
    setPhase('stars');
  };

  return (
    <div className="scene finale ch1-cave lit dawn">
      <img className="scene-bg" src={art('s-05')} alt="" />
      {phase === 'talk' && <Talk lines={BACK_NOW} onDone={() => setPhase('gear')} />}
      {phase === 'gear' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="gear" src={img('gear')} alt="" />
            <h2>齒輪回來了！</h2>
            <p>八仙洞的火重新亮起來，夜晚終於結束。<br />滴答拿回了第一顆時之齒輪！</p>
            <div className="harvest-pals"><img src={`${BASE}img/tick/happy.webp`} alt="" /><img src={art('f-04a-cheer')} alt="" /></div>
            <button className="btn green" onClick={() => {
              sfx('SE-36');
              set((o) => ({ ...o, keepsakes: o.keepsakes.includes(KEEPSAKE1.id) ? o.keepsakes : [...o.keepsakes, KEEPSAKE1.id], friends: o.friends.includes('yan') ? o.friends : [...o.friends, 'yan'] }));
              setPhase('keepsake');
            }}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'keepsake' && (
        <div className="talk-cover">
          <div className="panel mission keepsake">
            <small>拿到信物</small>
            <img className="keepsake-img" src={`${BASE}img/${KEEPSAKE1.img}`} alt="" />
            <h2>{KEEPSAKE1.title}</h2>
            <p>{KEEPSAKE1.text}</p>
            <div className="friend-row"><div className="friend mini"><Face who="yan" small /><b style={{ color: PEOPLE.yan.color }}>{PEOPLE.yan.name}</b></div></div>
            <p className="grows">阿岩成為你的時光朋友了！</p>
            <button className="btn green" onClick={() => setPhase('truth')}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'truth' && (
        <div className="talk-cover">
          <div className="panel truth">
            <h2>{TRUTH1.title}</h2>
            <p><b>遊戲裡：</b>{TRUTH1.game}</p>
            <p><b>真實的歷史：</b>{TRUTH1.real}</p>
            <p className="source">資料來源：{TRUTH1.source}</p>
            <button className="btn green" onClick={() => setPhase('quiz')}>我知道了</button>
          </div>
        </div>
      )}
      {phase === 'quiz' && (
        <div className="talk-cover">
          <div className="panel quiz">
            <small>想一想（{qi + 1} / {QUESTIONS1.length}）</small>
            <div className="quiz-ask"><Face who={q.who} small /><h3><b style={{ color: PEOPLE[q.who].color }}>{PEOPLE[q.who].name}：</b>{q.q}</h3></div>
            {q.options.map((o, i) => (
              <button key={o} className={`opt ${picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : ''}`} onClick={() => answer(i)}>{o}</button>
            ))}
            {picked !== null && (
              <>
                <p className={picked === q.answer ? 'yes' : 'no'}>{picked === q.answer ? '答對了！' : '再想想：'}{q.why}</p>
                <button className="btn green" onClick={nextQ}>{qi + 1 < QUESTIONS1.length ? '下一題' : '看結果'}</button>
              </>
            )}
          </div>
        </div>
      )}
      {phase === 'stars' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="badge" src={img('badge-fire')} alt="" />
            <h2>第一章 島嶼的第一道火光 完成！</h2>
            <div className="stars">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? 'on' : ''}>★</span>)}</div>
            <ul className="star-why">
              <li className="on">跟著齒輪走過四個時代，把火點回來</li>
              <li className={p.mistakes <= 3 ? 'on' : ''}>失誤 3 次以內{p.mistakes ? `（失誤 ${p.mistakes} 次）` : ''}</li>
              <li className={QUESTIONS1.every((x, i) => p.answers[i] === x.answer) ? 'on' : ''}>想一想全部答對</li>
            </ul>
            {p.keepsakes.includes(KEEPSAKE1.id) && <p className="cards-got">信物：{KEEPSAKE1.title}　時光朋友：阿岩</p>}
            <p className="cards-got">圖鑑卡：{p.cards.map((c) => CARDS1[c]?.title).filter(Boolean).join('、')}</p>
            <div className="row">
              <button className="btn green" onClick={exit}>回大地圖看看</button>
              <button className="btn orange" onClick={() => set((o) => ({ ...fresh1(), friends: o.friends, keepsakes: o.keepsakes, note: o.note, cards: o.cards }))}>從頭再玩</button>
              {PARK_URL && <a className="btn orange" href={PARK_URL}>回樂園</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
