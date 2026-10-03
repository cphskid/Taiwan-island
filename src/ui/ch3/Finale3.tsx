import { useEffect, useState } from 'react';
import { BACK_NOW3, CARDS3, CHOICES3, FAREWELL3, KEEPSAKE3, QUESTIONS3, TRUTH3, art3, backHome, type Pick3 } from '../../data/ch3';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import { fresh3, stars3 } from '../../core/save3';
import { PARK_URL } from '../../net/park';
import type { Step3Props } from '../Ch3';
import { Decide3 } from './Story3';
import { ambience, jingle, sfx } from '../../audio';

const BASE = import.meta.env.BASE_URL;
const RECAP: Pick3[] = ['honest', 'deer', 'deed', 'mom'];
type Phase = 'mom' | 'home' | 'talk' | 'gear' | 'keepsake' | 'truth' | 'quiz' | 'stars';

// 步驟 6 霧散了：阿福決定怎麼接阿娘 → 依你的選擇變化的大員港 → 齒輪、信物、「真的是這樣嗎？」、反思題、星星
export function Finale3({ p, set, exit }: Step3Props) {
  const [phase, setPhase] = useState<Phase>(p.done ? 'stars' : 'mom');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUESTIONS3[qi];
  const correct = QUESTIONS3.map((x) => x.answer);
  const stars = stars3(p, correct);
  useEffect(() => { ambience(phase === 'quiz' || phase === 'truth' ? 'SE-47' : null); if (phase === 'home') jingle('MU-17'); }, [phase]);
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
    if (qi + 1 < QUESTIONS3.length) { setQi(qi + 1); return; }
    set((o) => ({ ...o, done: true, stars: Math.max(o.stars, stars3(o, correct)) }));
    setPhase('stars');
  };
  const k = p.picks;

  return (
    <div className="scene finale ch3-clear">
      <img className="scene-bg" src={art3('s-13')} alt="" />
      {(phase === 'home' || phase === 'talk') && (
        <div className="ch3-home" aria-hidden>
          <img className="afu" src={art3('f-06a-cheer')} alt="" />
          <img className="coin" src={art3('g-05-coin')} alt="" />
          {k.deer === 1 ? <img className="deer" src={`${BASE}img/ch2/deer.webp`} alt="" /> : <img className="hides" src={art3('g-05-hides')} alt="" />}
          {k.deed === 1 ? <img className="bstone" src={art3('g-05-stone')} alt="" /> : <img className="quill" src={art3('g-05-quill')} alt="" />}
          <img className={`mom-ship ${k.mom === 1 ? 'with-afu' : ''}`} src={art3('g-05-junk')} alt="" />
          <img className="uma" src={art3('p-17-uma')} alt="" />
        </div>
      )}
      {phase === 'mom' && <Decide3 id="mom" set={set} onDone={() => setPhase('home')} />}
      {phase === 'home' && <Talk lines={backHome(k)} onDone={() => setPhase('talk')} />}
      {phase === 'talk' && <Talk lines={[...BACK_NOW3, ...FAREWELL3]} onDone={() => setPhase('gear')} />}
      {phase === 'gear' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="gear" src={img('gear')} alt="" />
            <h2>齒輪回來了！</h2>
            <p>大員港的霧散了，潮水退了又漲，新的一天來了。<br />滴答拿回了第三顆時之齒輪！</p>
            <div className="harvest-pals"><img src={`${BASE}img/tick/happy.webp`} alt="" /><img src={art3('f-06a-cheer')} alt="" /></div>
            <button className="btn green" onClick={() => {
              sfx('SE-36');
              set((o) => ({ ...o, keepsakes: o.keepsakes.includes(KEEPSAKE3.id) ? o.keepsakes : [...o.keepsakes, KEEPSAKE3.id], friends: o.friends.includes('afu') ? o.friends : [...o.friends, 'afu'] }));
              setPhase('keepsake');
            }}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'keepsake' && (
        <div className="talk-cover">
          <div className="panel mission keepsake">
            <small>拿到信物</small>
            <img className="keepsake-img" src={`${BASE}img/${KEEPSAKE3.img}`} alt="" />
            <h2>{KEEPSAKE3.title}</h2>
            <p>{KEEPSAKE3.text}</p>
            <div className="friend-row"><div className="friend mini"><Face who="afu" small /><b style={{ color: PEOPLE.afu.color }}>{PEOPLE.afu.name}</b></div></div>
            <p className="grows">阿福成為你的時光朋友了！</p>
            <button className="btn green" onClick={() => setPhase('truth')}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'truth' && (
        <div className="talk-cover">
          <div className="panel truth">
            <h2>{TRUTH3.title}</h2>
            <p><b>遊戲裡：</b>{TRUTH3.game}</p>
            <p><b>真實的歷史：</b>{TRUTH3.real}</p>
            <p className="source">資料來源：{TRUTH3.source}</p>
            <button className="btn green" onClick={() => setPhase('quiz')}>我知道了</button>
          </div>
        </div>
      )}
      {phase === 'quiz' && (
        <div className="talk-cover">
          <div className="panel quiz">
            <small>想一想（{qi + 1} / {QUESTIONS3.length}）</small>
            <div className="quiz-ask"><Face who={q.who} small /><h3><b style={{ color: PEOPLE[q.who].color }}>{PEOPLE[q.who].name}：</b>{q.q}</h3></div>
            {q.options.map((o, i) => (
              <button key={o} className={`opt ${picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : ''}`} onClick={() => answer(i)}>{o}</button>
            ))}
            {picked !== null && (
              <>
                <p className={picked === q.answer ? 'yes' : 'no'}>{picked === q.answer ? '答對了！' : '再想想：'}{q.why}</p>
                <button className="btn green" onClick={nextQ}>{qi + 1 < QUESTIONS3.length ? '下一題' : '看結果'}</button>
              </>
            )}
          </div>
        </div>
      )}
      {phase === 'stars' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="badge" src={img('badge-ship')} alt="" />
            <h2>第三章 大航海時代 完成！</h2>
            <div className="stars">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? 'on' : ''}>★</span>)}</div>
            <ul className="star-why">
              <li className="on">讓大員港的霧散開，時間往前走</li>
              <li className={p.mistakes <= 3 ? 'on' : ''}>失誤 3 次以內{p.mistakes ? `（失誤 ${p.mistakes} 次）` : ''}</li>
              <li className={QUESTIONS3.every((x, i) => p.answers[i] === x.answer) ? 'on' : ''}>想一想全部答對</li>
            </ul>
            {RECAP.some((r) => k[r] !== undefined) && (
              <div className="recap">
                <b>你的選擇</b>
                {RECAP.filter((r) => k[r] !== undefined).map((r) => <span key={r}>{CHOICES3[r].recap[k[r]!]}</span>)}
              </div>
            )}
            {p.keepsakes.includes(KEEPSAKE3.id) && <p className="cards-got">信物：{KEEPSAKE3.title}　時光朋友：阿福</p>}
            <p className="cards-got">圖鑑卡：{p.cards.map((c) => CARDS3[c]?.title).filter(Boolean).join('、')}</p>
            <div className="row">
              <button className="btn green" onClick={exit}>回大地圖看看</button>
              <button className="btn orange" onClick={() => set((o) => ({ ...fresh3(), friends: o.friends, keepsakes: o.keepsakes, note: o.note, cards: o.cards }))}>從頭再玩</button>
              {PARK_URL && <a className="btn orange" href={PARK_URL}>回樂園</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
