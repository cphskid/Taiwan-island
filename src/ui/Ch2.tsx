import { useEffect, useState } from 'react';
import { addCard2, goTo2, LAST2, load2, save2, type Progress2, type Step2 } from '../core/save2';
import { CARD_ORDER2, CARDS2, STEPS2 } from '../data/ch2';
import { Album, BOOK2 } from './Album';
import { pushCloud } from '../net/cloud';
import { chapterDone, Egg } from './Medal';
import { ambience, music, sfx } from '../audio';
import { SoundToggle } from './Sound';
import { CardPop } from './Talk';
import { Opening2 } from './ch2/Opening2';
import { Explore2 } from './ch2/Explore2';
import { Rotate } from './ch2/Rotate';
import { Hunt } from './ch2/Hunt';
import { Calendar } from './ch2/Calendar';
import { Rules } from './ch2/Rules';
import { Finale2 } from './ch2/Finale2';

// 環境音：山上的風、森林、田野、森林、田野、部落、田野
const AMB = ['SE-61', 'SE-62', 'SE-62', 'SE-62', 'SE-62', 'SE-62', null] as const;

export interface Step2Props {
  p: Progress2;
  set: (fn: (p: Progress2) => Progress2) => void;
  next: () => void;
  exit: () => void;
  oops: () => void; // 失誤一次（小米不夠吃、鹿變少、生活曆放錯、規矩選錯）
}

// 拿到圖鑑卡：收進存檔，新的卡一張一張跳出來，看完再做下一件事（已經有的卡不再跳）
export function NewCards({ ids, p, set, onDone }: { ids: readonly string[]; p: Progress2; set: Step2Props['set']; onDone: () => void }) {
  const [left, setLeft] = useState(() => ids.filter((c) => !p.cards.includes(c)));
  useEffect(() => { set((o) => addCard2(o, ...ids)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!left.length) onDone(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = CARDS2[left[0]];
  if (!c) return null;
  return <CardPop title={c.title} text={c.text} onClose={() => setLeft(left.slice(1))} />;
}

// 第二章「山林與部落」：步驟 0～6，進度存在這台平板。網址加 ?ch2=3 直接跳到某一步（測試用）。
export function Ch2({ onExit, album }: { onExit: () => void; album: readonly string[] }) {
  const [book, setBook] = useState(false);
  const [p, setP] = useState<Progress2>(() => {
    const saved = load2();
    const q = new URLSearchParams(location.search).get('ch2');
    const jump = Number(q);
    return q !== null && q !== '' && jump >= 0 && jump <= LAST2 ? goTo2(saved, jump as Step2) : saved;
  });
  useEffect(() => { save2(p); pushCloud('ch2', p); }, [p]);
  useEffect(() => { if (p.done) chapterDone('ch2', p.picks); }, [p.done]);
  useEffect(() => { music(null); return () => ambience(null); }, []);
  useEffect(() => { ambience(AMB[p.step]); }, [p.step]);

  const set = (fn: (p: Progress2) => Progress2) => setP((old) => fn(old));
  const next = () => setP((old) => goTo2(old, Math.min(LAST2, old.step + 1) as Step2));
  const oops = () => setP((old) => ({ ...old, mistakes: old.mistakes + 1 }));
  const have = new Set([...album, ...p.cards]);
  const props: Step2Props = { p, set, next, exit: onExit, oops };

  return (
    <div className="chapter ch2">
      <nav className="steps">
        <button className="back-map" onClick={() => { sfx('SE-02'); onExit(); }}><img src={`${import.meta.env.BASE_URL}img/island/h-map.webp`} alt="" />大地圖</button>
        {STEPS2.map((name, i) => (
          <button
            key={name}
            className={`step ${i === p.step ? 'on' : ''} ${i <= p.reached ? 'open' : ''}`}
            disabled={i > p.reached}
            onClick={() => { sfx('SE-01'); setP((old) => goTo2(old, i as Step2)); }}
          >
            <i>{i}</i>{name}
          </button>
        ))}
        <SoundToggle className="back-map" />
        <button className="back-map album-btn" onClick={() => { sfx('SE-03'); setBook(true); }}>📖 圖鑑 {CARD_ORDER2.filter((id) => have.has(id)).length}/{CARD_ORDER2.length}</button>
      </nav>
      <div className="stage" key={p.step}>
        {p.step === 0 && <Opening2 {...props} />}
        {p.step === 1 && <Explore2 {...props} />}
        {p.step === 2 && <Rotate {...props} />}
        {p.step === 3 && <Hunt {...props} />}
        {p.step === 4 && <Calendar {...props} />}
        {p.step === 5 && <Rules {...props} />}
        {p.step === 6 && <Finale2 {...props} />}
        {p.step === 1 && <Egg ch="ch2" x="30%" y="30%" />}
      </div>
      {book && <Album have={[...have]} books={[BOOK2]} onClose={() => setBook(false)} />}
    </div>
  );
}
