import { useEffect, useState } from 'react';
import { CARDS, FAREWELL, HARVEST, KEEPSAKE, PEOPLE, QUESTIONS, TRUTH, img } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import { fresh, starsOf } from '../../core/save';
import { PARK_URL } from '../../net/park';
import type { StepProps } from '../Chapter';
import { ambience, jingle, sfx } from '../../audio';

const BASE = import.meta.env.BASE_URL;
type Phase = 'talk' | 'harvest' | 'farewell' | 'keepsake' | 'truth' | 'quiz' | 'stars';
const FRIENDS = ['lian', 'mu'];

// 步驟 6 結算：時間往前走、豐收拿回齒輪、夥伴道別送信物、「真的是這樣嗎？」卡、夥伴問反思題、星星
export function Finale({ p, set, exit }: StepProps) {
  const [phase, setPhase] = useState<Phase>(p.done ? 'stars' : 'talk');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUESTIONS[qi];
  useEffect(() => { ambience(phase === 'quiz' || phase === 'truth' ? 'SE-61' : null); if (phase === 'talk') jingle('MU-17'); }, [phase]);

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    sfx(i === q.answer ? 'SE-05' : 'SE-04');
    set((o) => { const a = [...o.answers]; a[qi] = i; return { ...o, answers: a }; });
  };
  const nextQ = () => {
    setPicked(null);
    if (qi + 1 < QUESTIONS.length) { setQi(qi + 1); return; }
    set((o) => ({ ...o, done: true, stars: Math.max(o.stars, starsOf(o, QUESTIONS.map((x) => x.answer))) }));
    setPhase('stars');
  };

  const stars = starsOf(p, QUESTIONS.map((x) => x.answer));
  // 星星一顆一顆跳出來，一顆比一顆高
  useEffect(() => {
    if (phase !== 'stars') return;
    const ids = Array.from({ length: stars }, (_, i) => window.setTimeout(() => sfx('SE-35', 1 + 0.12 * i), 300 + 350 * i));
    return () => ids.forEach(clearTimeout);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="scene finale">
      <img className="scene-bg" src={img('S-03')} alt="" />

      {phase === 'talk' && <Talk lines={HARVEST} onDone={() => setPhase('harvest')} />}
      {phase === 'harvest' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="gear" src={img('gear')} alt="" />
            <h2>大豐收！</h2>
            <p>漳州莊和泉州莊的稻子都變成金黃色了。<br />卡住的時間往前走，滴答拿回了第五顆時之齒輪！</p>
            <p className="grows">拿到圖鑑卡「八堡圳」：{CARDS.babao.text}</p>
            <div className="harvest-pals"><img src={`${BASE}img/tick/happy.webp`} alt="" /><img src={`${BASE}img/story/F-01A_7.webp`} alt="" /><img src={`${BASE}img/story/F-02A_1.webp`} alt="" /></div>
            <button className="btn green" onClick={() => { set((o) => (o.cards.includes('babao') ? o : { ...o, cards: [...o.cards, 'babao'] })); setPhase('farewell'); }}>繼續</button>
          </div>
        </div>
      )}

      {phase === 'farewell' && (
        <Talk lines={[p.broken === 0 ? FAREWELL.careful : FAREWELL.bumpy, FAREWELL.keep]} onDone={() => {
          sfx('SE-36');
          set((o) => ({ ...o, keepsakes: o.keepsakes.includes(KEEPSAKE.id) ? o.keepsakes : [...o.keepsakes, KEEPSAKE.id], friends: [...o.friends, ...FRIENDS.filter((f) => !o.friends.includes(f))] }));
          setPhase('keepsake');
        }} />
      )}

      {phase === 'keepsake' && (
        <div className="talk-cover">
          <div className="panel mission keepsake">
            <small>拿到信物</small>
            <img className="keepsake-img" src={`${BASE}img/${KEEPSAKE.img}`} alt="" />
            <h2>{KEEPSAKE.title}</h2>
            <p>{KEEPSAKE.text}</p>
            <div className="friend-row">
              {FRIENDS.map((f) => <div key={f} className="friend mini"><Face who={f as 'lian'} small /><b style={{ color: PEOPLE[f as 'lian'].color }}>{PEOPLE[f as 'lian'].name}</b></div>)}
            </div>
            <p className="grows">阿蓮和阿穆成為你的時光朋友了！</p>
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
            <p className="source">資料來源：{TRUTH.source}</p>
            <button className="btn green" onClick={() => setPhase('quiz')}>我知道了</button>
          </div>
        </div>
      )}

      {phase === 'quiz' && (
        <div className="talk-cover">
          <div className="panel quiz">
            <small>想一想（{qi + 1} / {QUESTIONS.length}）</small>
            <div className="quiz-ask"><Face who={q.who} small /><h3><b style={{ color: PEOPLE[q.who].color }}>{PEOPLE[q.who].name}：</b>{q.q}</h3></div>
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
            {p.keepsakes.includes(KEEPSAKE.id) && <p className="cards-got">信物：{KEEPSAKE.title}　時光朋友：阿蓮、阿穆</p>}
            <p className="cards-got">圖鑑卡：{p.cards.map((c) => CARDS[c]?.title).filter(Boolean).join('、')}</p>
            <div className="row">
              <button className="btn green" onClick={exit}>回大地圖看看</button>
              <button className="btn orange" onClick={() => set((o) => ({ ...fresh(), friends: o.friends, keepsakes: o.keepsakes, note: o.note }))}>從頭再玩</button>
              {PARK_URL && <a className="btn orange" href={PARK_URL}>回樂園</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
