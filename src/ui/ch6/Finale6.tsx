import { useEffect, useState } from 'react';
import { CARDS6, CHOICES6, FAREWELL6, KEEPSAKE6, QUESTIONS6, RAIN_STOP, TRUTH6, art6, endLines, type Pick6 } from '../../data/ch6';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import { fresh6, stars6 } from '../../core/save6';
import { PARK_URL } from '../../net/park';
import type { Step6Props } from '../Ch6';
import { ambience, jingle, sfx } from '../../audio';

const BASE = import.meta.env.BASE_URL;
const RECAP: Pick6[] = ['boss', 'tunnel', 'learn', 'cargo'];
type Phase = 'talk' | 'gear' | 'keepsake' | 'truth' | 'quiz' | 'stars';

// 步驟 6 雨停了：照選擇變化的結局畫面與台詞、齒輪回來、阿春的信物、「真的是這樣嗎？」、反思題、星星、你的選擇
export function Finale6({ p, set, exit }: Step6Props) {
  const [phase, setPhase] = useState<Phase>(p.done ? 'stars' : 'talk');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUESTIONS6[qi];
  const correct = QUESTIONS6.map((x) => x.answer);
  const stars = stars6(p, correct);
  const k = p.picks;
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
    if (qi + 1 < QUESTIONS6.length) { setQi(qi + 1); return; }
    set((o) => ({ ...o, done: true, stars: Math.max(o.stars, stars6(o, correct)) }));
    setPhase('stars');
  };

  return (
    <div className="scene finale ch6-sunny">
      <img className="scene-bg" src={art6('s-21')} alt="" />
      {/* 結局畫面跟著選擇變：運茶的大輪船或載人的客車、隧道或彎彎的鐵軌、學堂的藥瓶或焙籠 */}
      {phase === 'talk' && (
        <div className="ch6-end-props">
          <img className="ch6-end-chun" src={art6(k.learn === 0 ? 'f-08a-point' : 'f-08a-cheer')} alt="阿春" />
          <img className="ch6-end-train" src={art6(k.cargo === 1 ? 'o-09-car' : 'o-09-loco')} alt="" />
          <img className="ch6-end-way" src={art6(k.tunnel === 1 ? 'g-07-track' : 'g-07-tunnel')} alt="" />
          {k.cargo !== 1 && <img className="ch6-end-ship" src={art6('o-09-steamer')} alt="" />}
          {k.cargo !== 1 && <img className="ch6-end-chest" src={art6('g-07-chest')} alt="" />}
          <img className="ch6-end-thing" src={art6(k.learn === 0 ? 'g-07-bottle' : 'g-07-roast')} alt="" />
          {k.boss === 0 && <img className="ch6-end-boss" src={`${BASE}img/${PEOPLE.teaboss.img}`} alt="茶行老闆" />}
        </div>
      )}
      {phase === 'talk' && <Talk lines={[...RAIN_STOP, ...endLines(k), ...FAREWELL6]} onDone={() => setPhase('gear')} />}
      {phase === 'gear' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="gear" src={img('gear')} alt="" />
            <h2>齒輪回來了！</h2>
            <p>大稻埕的雨停了，茶箱一箱箱運出去。<br />滴答拿回了第六顆時之齒輪！</p>
            <div className="harvest-pals"><img src={`${BASE}img/tick/happy.webp`} alt="" /><img src={art6('f-08a-cheer')} alt="" /></div>
            <button className="btn green" onClick={() => {
              sfx('SE-36');
              set((o) => ({ ...o, keepsakes: o.keepsakes.includes(KEEPSAKE6.id) ? o.keepsakes : [...o.keepsakes, KEEPSAKE6.id], friends: o.friends.includes('chun') ? o.friends : [...o.friends, 'chun'] }));
              setPhase('keepsake');
            }}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'keepsake' && (
        <div className="talk-cover">
          <div className="panel mission keepsake">
            <small>拿到信物</small>
            <img className="keepsake-img" src={`${BASE}img/${KEEPSAKE6.img}`} alt="" />
            <h2>{KEEPSAKE6.title}</h2>
            <p>{KEEPSAKE6.text}</p>
            <div className="friend-row"><div className="friend mini"><Face who="chun" small /><b style={{ color: PEOPLE.chun.color }}>{PEOPLE.chun.name}</b></div></div>
            <p className="grows">阿春成為你的時光朋友了！</p>
            <button className="btn green" onClick={() => setPhase('truth')}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'truth' && (
        <div className="talk-cover">
          <div className="panel truth">
            <h2>{TRUTH6.title}</h2>
            <p><b>遊戲裡：</b>{TRUTH6.game}</p>
            <p><b>真實的歷史：</b>{TRUTH6.real}</p>
            <button className="btn green" onClick={() => setPhase('quiz')}>我知道了</button>
          </div>
        </div>
      )}
      {phase === 'quiz' && (
        <div className="talk-cover">
          <div className="panel quiz">
            <small>想一想（{qi + 1} / {QUESTIONS6.length}）</small>
            <div className="quiz-ask"><Face who={q.who} small /><h3><b style={{ color: PEOPLE[q.who].color }}>{PEOPLE[q.who].name}：</b>{q.q}</h3></div>
            {q.options.map((o, i) => (
              <button key={o} className={`opt ${picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : ''}`} onClick={() => answer(i)}>{o}</button>
            ))}
            {picked !== null && (
              <>
                <p className={picked === q.answer ? 'yes' : 'no'}>{picked === q.answer ? '答對了！' : '再想想：'}{q.why}</p>
                <button className="btn green" onClick={nextQ}>{qi + 1 < QUESTIONS6.length ? '下一題' : '看結果'}</button>
              </>
            )}
          </div>
        </div>
      )}
      {phase === 'stars' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="badge" src={art6('o-09-loco')} alt="" />
            <h2>第六章 開港與鐵路 完成！</h2>
            <div className="stars">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? 'on' : ''}>★</span>)}</div>
            <ul className="star-why">
              <li className="on">讓大稻埕的茶運出去，雨停了</li>
              <li className={p.mistakes <= 3 ? 'on' : ''}>失誤 3 次以內{p.mistakes ? `（失誤 ${p.mistakes} 次）` : ''}</li>
              <li className={QUESTIONS6.every((x, i) => p.answers[i] === x.answer) ? 'on' : ''}>想一想全部答對</li>
            </ul>
            {RECAP.some((r) => k[r] !== undefined) && (
              <div className="recap">
                <b>你的選擇</b>
                {RECAP.filter((r) => k[r] !== undefined).map((r) => <span key={r}>{CHOICES6[r].recap[k[r]!]}</span>)}
              </div>
            )}
            {p.keepsakes.includes(KEEPSAKE6.id) && <p className="cards-got">信物：{KEEPSAKE6.title}　時光朋友：阿春</p>}
            <p className="cards-got">圖鑑卡：{p.cards.map((c) => CARDS6[c]?.title).filter(Boolean).join('、')}</p>
            <div className="row">
              <button className="btn green" onClick={exit}>回大地圖看看</button>
              <button className="btn orange" onClick={() => set((o) => ({ ...fresh6(), friends: o.friends, keepsakes: o.keepsakes, note: o.note, cards: o.cards }))}>從頭再玩</button>
              {PARK_URL && <a className="btn orange" href={PARK_URL}>回樂園</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
