import { useEffect, useState } from 'react';
import { BACK_NOW4, CARD_ORDER4, CARDS4, CHOICES4, FAREWELL4, KEEPSAKE4, QUESTIONS4, TRUTH4, art4, homeLines4, type Pick4 } from '../../data/ch4';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import { fresh4, stars4 } from '../../core/save4';
import { PARK_URL } from '../../net/park';
import type { Step4Props } from '../Ch4';
import { ambience, jingle, sfx } from '../../audio';

const BASE = import.meta.env.BASE_URL;
const RECAP: Pick4[] = ['land', 'water', 'school', 'grain'];
type Phase = 'home' | 'bye' | 'talk' | 'gear' | 'keepsake' | 'truth' | 'quiz' | 'stars';

// 步驟 6 結算：齒輪回到時光鐘、看一眼小蓮家的田（畫面和台詞照你的選擇）、信物、「真的是這樣嗎？」、反思題、星星
export function Finale4({ p, set, exit }: Step4Props) {
  const [phase, setPhase] = useState<Phase>(p.done ? 'stars' : 'home');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUESTIONS4[qi];
  const correct = QUESTIONS4.map((x) => x.answer);
  const stars = stars4(p, correct);
  const k = p.picks;
  useEffect(() => { ambience(phase === 'quiz' || phase === 'truth' ? 'SE-61' : null); if (phase === 'home') jingle('MU-17'); }, [phase]);
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
    if (qi + 1 < QUESTIONS4.length) { setQi(qi + 1); return; }
    set((o) => ({ ...o, done: true, stars: Math.max(o.stars, stars4(o, correct)) }));
    setPhase('stars');
  };

  return (
    <div className="scene finale ch4-harvest">
      <img className="scene-bg" src={art4('s-16')} alt="" />
      {(phase === 'home' || phase === 'bye') && (
        <div className="ch4-home">
          <div className="ch4-paddies">{Array.from({ length: 6 }, (_, i) => <img key={i} src={art4('o-08-paddy')} alt="" />)}</div>
          {k.water === 1 && <img className="ch4-home-pond" src={art4('o-08-pond')} alt="多挖的水埤" />}
          {k.water !== 1 && <img className="ch4-home-bucket" src={art4('g-06-bucket')} alt="挑水的水桶" />}
          {k.land === 1 ? <img className="ch4-home-villager" src={art4('p-18-villager')} alt="村社的阿姨" /> : <img className="ch4-home-deer" src={`${BASE}img/ch2/deer.webp`} alt="鹿" />}
          <img className="ch4-home-xlian" src={art4('f-07a-cheer')} alt="小蓮" />
          <img className="ch4-home-veteran" src={art4('p-18-veteran')} alt="老兵" />
          {k.school === 1 ? <img className="ch4-home-brush" src={art4('g-06-brush')} alt="筆和硯台" /> : <img className="ch4-home-chen" src={art4('p-18-chen')} alt="陳永華" />}
          {k.grain === 1 ? <img className="ch4-home-flag" src={art4('g-06-flag')} alt="營旗" /> : <img className="ch4-home-sack" src={art4('g-06-sack')} alt="米袋" />}
        </div>
      )}
      {phase === 'home' && <Talk lines={homeLines4(k)} onDone={() => setPhase('bye')} />}
      {phase === 'bye' && <Talk lines={FAREWELL4} onDone={() => setPhase('talk')} />}
      {phase === 'talk' && <Talk lines={BACK_NOW4} onDone={() => setPhase('gear')} />}
      {phase === 'gear' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="gear" src={img('gear')} alt="" />
            <h2>齒輪回來了！</h2>
            <p>東寧的官田長出了稻子，乾裂的同一天終於過去。<br />滴答拿回了第四顆時之齒輪！</p>
            <div className="harvest-pals"><img src={`${BASE}img/tick/happy.webp`} alt="" /><img src={art4('f-07a-cheer')} alt="" /></div>
            <button className="btn green" onClick={() => {
              sfx('SE-36');
              set((o) => ({ ...o, keepsakes: o.keepsakes.includes(KEEPSAKE4.id) ? o.keepsakes : [...o.keepsakes, KEEPSAKE4.id], friends: o.friends.includes('xlian') ? o.friends : [...o.friends, 'xlian'] }));
              setPhase('keepsake');
            }}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'keepsake' && (
        <div className="talk-cover">
          <div className="panel mission keepsake">
            <small>拿到信物</small>
            <img className="keepsake-img" src={`${BASE}img/${KEEPSAKE4.img}`} alt="" />
            <h2>{KEEPSAKE4.title}</h2>
            <p>{KEEPSAKE4.text}</p>
            <div className="friend-row"><div className="friend mini"><Face who="xlian" small /><b style={{ color: PEOPLE.xlian.color }}>{PEOPLE.xlian.name}</b></div></div>
            <p className="grows">小蓮成為你的時光朋友了！</p>
            <button className="btn green" onClick={() => setPhase('truth')}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'truth' && (
        <div className="talk-cover">
          <div className="panel truth">
            <h2>{TRUTH4.title}</h2>
            <p><b>遊戲裡：</b>{TRUTH4.game}</p>
            <p><b>真實的歷史：</b>{TRUTH4.real}</p>
            <button className="btn green" onClick={() => setPhase('quiz')}>我知道了</button>
          </div>
        </div>
      )}
      {phase === 'quiz' && (
        <div className="talk-cover">
          <div className="panel quiz">
            <small>想一想（{qi + 1} / {QUESTIONS4.length}）</small>
            <div className="quiz-ask"><Face who={q.who} small /><h3><b style={{ color: PEOPLE[q.who].color }}>{PEOPLE[q.who].name}：</b>{q.q}</h3></div>
            {q.options.map((o, i) => (
              <button key={o} className={`opt ${picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : ''}`} onClick={() => answer(i)}>{o}</button>
            ))}
            {picked !== null && (
              <>
                <p className={picked === q.answer ? 'yes' : 'no'}>{picked === q.answer ? '答對了！' : '再想想：'}{q.why}</p>
                <button className="btn green" onClick={nextQ}>{qi + 1 < QUESTIONS4.length ? '下一題' : '看結果'}</button>
              </>
            )}
          </div>
        </div>
      )}
      {phase === 'stars' && (
        <div className="talk-cover">
          <div className="panel mission ch4-end">
            <img className="badge" src={img('badge-rice')} alt="" />
            <h2>第四章 東寧屯田 完成！</h2>
            <div className="stars">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? 'on' : ''}>★</span>)}</div>
            <ul className="star-why">
              <li className="on">分營、開埤、曬鹽、蓋學堂，讓東寧的田長出稻子</li>
              <li className={p.mistakes <= 3 ? 'on' : ''}>失誤 3 次以內{p.mistakes ? `（失誤 ${p.mistakes} 次）` : ''}</li>
              <li className={QUESTIONS4.every((x, i) => p.answers[i] === x.answer) ? 'on' : ''}>想一想全部答對</li>
            </ul>
            {RECAP.some((r) => k[r] !== undefined) && (
              <div className="recap">
                <b>你的選擇</b>
                {RECAP.filter((r) => k[r] !== undefined).map((r) => <span key={r}>{CHOICES4[r].recap[k[r]!]}</span>)}
              </div>
            )}
            {p.keepsakes.includes(KEEPSAKE4.id) && <p className="cards-got">信物：{KEEPSAKE4.title}　時光朋友：小蓮</p>}
            <p className="cards-got">圖鑑卡：{CARD_ORDER4.filter((c) => p.cards.includes(c)).length} / {CARD_ORDER4.length} 張（{p.cards.slice(-3).map((c) => CARDS4[c]?.title).filter(Boolean).join('、')}……）</p>
            <div className="row">
              <button className="btn green" onClick={exit}>回大地圖看看</button>
              <button className="btn orange" onClick={() => set((o) => ({ ...fresh4(), friends: o.friends, keepsakes: o.keepsakes, cards: o.cards }))}>從頭再玩</button>
              {PARK_URL && <a className="btn orange" href={PARK_URL}>回樂園</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
