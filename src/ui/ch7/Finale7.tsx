import { useEffect, useState } from 'react';
import { BACK7, CARD_ORDER7, CHOICES7, homeLines7, KEEPSAKE7, keepsakeText, QUESTIONS7, TRUTH7, art7, type Pick7 } from '../../data/ch7';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import { fresh7, stars7 } from '../../core/save7';
import { PARK_URL } from '../../net/park';
import { NewCards7, type Step7Props } from '../Ch7';
import { ambience, jingle, sfx } from '../../audio';

const BASE = import.meta.env.BASE_URL;
const RECAP: Pick7[] = ['speak', 'rice', 'shao'];
type Phase = 'home' | 'talk' | 'gear' | 'keepsake' | 'truth' | 'card' | 'quiz' | 'stars';

// 步驟 6 結算：從時光鐘看阿雄的田（照選擇不一樣）、齒輪回來、作文簿、「真的是這樣嗎？」、反思題、星星、你的選擇
export function Finale7({ p, set, exit }: Step7Props) {
  const [phase, setPhase] = useState<Phase>(p.done ? 'stars' : 'home');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUESTIONS7[qi];
  const correct = QUESTIONS7.map((x) => x.answer);
  const stars = stars7(p, correct);
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
    if (qi + 1 < QUESTIONS7.length) { setQi(qi + 1); return; }
    set((o) => ({ ...o, done: true, stars: Math.max(o.stars, stars7(o, correct)) }));
    setPhase('stars');
  };

  return (
    <div className="scene finale ch7-home">
      <img className="scene-bg" src={art7('s-22')} alt="" />
      {phase === 'home' && (
        <div className="home-props">
          <img className="ch7-home-kid" src={art7('f-09a-cheer')} alt="阿雄" />
          <img className="ch7-home-rice" src={art7('g-08-rice')} alt="" />
          {/* 選了多種一年稻：阿明家的甘蔗乾了一半 */}
          <img className={`ch7-home-cane ${k.rice === 1 ? 'dry' : ''}`} src={art7('g-08-cane')} alt="" />
          {k.shao === 0 ? <img className="ch7-home-book" src={art7('g-08-notebook')} alt="" /> : <img className="ch7-home-bulb" src={art7('g-08-bulb')} alt="" />}
          <span className="ch7-home-bubble">{k.speak === 1 ? '阿嬤，我轉來囉！' : '日語考試考了 100 分！'}</span>
        </div>
      )}
      {phase === 'home' && <Talk lines={homeLines7(k)} onDone={() => setPhase('talk')} />}
      {phase === 'talk' && <Talk lines={BACK7} onDone={() => setPhase('gear')} />}
      {phase === 'gear' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="gear" src={img('gear')} alt="" />
            <h2>齒輪回來了！</h2>
            <p>嘉南大圳的水流進田裡，乾旱的那一天終於過去。<br />滴答拿回了第七顆時之齒輪！</p>
            <div className="harvest-pals"><img src={`${BASE}img/tick/happy.webp`} alt="" /><img src={art7('f-09a-cheer')} alt="" /></div>
            <button className="btn green" onClick={() => {
              sfx('SE-36');
              set((o) => ({ ...o, keepsakes: o.keepsakes.includes(KEEPSAKE7.id) ? o.keepsakes : [...o.keepsakes, KEEPSAKE7.id], friends: o.friends.includes('hsiung') ? o.friends : [...o.friends, 'hsiung'] }));
              setPhase('keepsake');
            }}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'keepsake' && (
        <div className="talk-cover">
          <div className="panel mission keepsake">
            <small>拿到信物</small>
            <img className="keepsake-img" src={`${BASE}img/${KEEPSAKE7.img}`} alt="" />
            <h2>{KEEPSAKE7.title}</h2>
            <p>{keepsakeText(k)}</p>
            <div className="friend-row"><div className="friend mini"><Face who="hsiung" mood="happy" small /><b style={{ color: PEOPLE.hsiung.color }}>{PEOPLE.hsiung.name}</b></div></div>
            <p className="grows">阿雄成為你的時光朋友了！</p>
            <button className="btn green" onClick={() => setPhase('truth')}>繼續</button>
          </div>
        </div>
      )}
      {phase === 'truth' && (
        <div className="talk-cover">
          <div className="panel truth">
            <h2>{TRUTH7.title}</h2>
            <p><b>遊戲裡：</b>{TRUTH7.game}</p>
            <p><b>真實的歷史：</b>{TRUTH7.real}</p>
            <button className="btn green" onClick={() => setPhase('card')}>我知道了</button>
          </div>
        </div>
      )}
      {phase === 'card' && <NewCards7 ids={['colonial']} p={p} set={set} onDone={() => setPhase('quiz')} />}
      {phase === 'quiz' && (
        <div className="talk-cover">
          <div className="panel quiz">
            <small>想一想（{qi + 1} / {QUESTIONS7.length}）</small>
            <div className="quiz-ask"><Face who={q.who} small /><h3><b style={{ color: PEOPLE[q.who].color }}>{PEOPLE[q.who].name}：</b>{q.q}</h3></div>
            {q.options.map((o, i) => (
              <button key={o} className={`opt ${picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : ''}`} onClick={() => answer(i)}>{o}</button>
            ))}
            {picked !== null && (
              <>
                <p className={picked === q.answer ? 'yes' : 'no'}>{picked === q.answer ? '答對了！' : '再想想：'}{q.why}</p>
                <button className="btn green" onClick={nextQ}>{qi + 1 < QUESTIONS7.length ? '下一題' : '看結果'}</button>
              </>
            )}
          </div>
        </div>
      )}
      {phase === 'stars' && (
        <div className="talk-cover">
          <div className="panel mission">
            <img className="badge" src={art7('g-08-gate')} alt="" />
            <h2>第七章 縱貫與大圳 完成！</h2>
            <div className="stars">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? 'on' : ''}>★</span>)}</div>
            <ul className="star-why">
              <li className="on">讓嘉南大圳的水流進田裡，乾旱的那一天過去了</li>
              <li className={p.mistakes <= 3 ? 'on' : ''}>失誤 3 次以內{p.mistakes ? `（失誤 ${p.mistakes} 次）` : ''}</li>
              <li className={QUESTIONS7.every((x, i) => p.answers[i] === x.answer) ? 'on' : ''}>想一想全部答對</li>
            </ul>
            {RECAP.some((id) => k[id] !== undefined) && (
              <div className="recap">
                <b>你的選擇</b>
                {RECAP.filter((id) => k[id] !== undefined).map((id) => <span key={id}>{CHOICES7[id].recap[k[id]!]}</span>)}
              </div>
            )}
            {p.keepsakes.includes(KEEPSAKE7.id) && <p className="cards-got">信物：{KEEPSAKE7.title}　時光朋友：阿雄</p>}
            <p className="cards-got">圖鑑卡：{CARD_ORDER7.filter((c) => p.cards.includes(c)).length} / {CARD_ORDER7.length} 張（點上面的「📖 圖鑑」看）</p>
            <div className="row">
              <button className="btn green" onClick={exit}>回大地圖看看</button>
              <button className="btn orange" onClick={() => set((o) => ({ ...fresh7(), friends: o.friends, keepsakes: o.keepsakes, cards: o.cards }))}>從頭再玩</button>
              {PARK_URL && <a className="btn orange" href={PARK_URL}>回樂園</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
