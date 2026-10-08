import { useEffect, useState } from 'react';
import { addCard7, goTo7, LAST7, load7, save7, type Progress7, type Step7 } from '../core/save7';
import { CARD_ORDER7, CARDS7, STEPS7 } from '../data/ch7';
import { Album, BOOK7 } from './Album';
import { awardStamp, pushCloud } from '../net/cloud';
import { ambience, music, sfx } from '../audio';
import { SoundToggle } from './Sound';
import { ReportButton } from './Report';
import { CardPop } from './Talk';
import { Opening7 } from './ch7/Opening7';
import { Rail } from './ch7/Rail';
import { Dam } from './ch7/Dam';
import { Rota } from './ch7/Rota';
import { SunMoon } from './ch7/SunMoon';
import { OpenDay } from './ch7/OpenDay';
import { Finale7 } from './ch7/Finale7';

// 環境音：乾旱的平原、車站與工地（田野）、乾旱、山上的湖、圳水流進田裡、結算
const AMB = ['SE-75', 'SE-117', 'SE-62', 'SE-75', 'SE-61', 'SE-76', null] as const;

export interface Step7Props {
  p: Progress7;
  set: (fn: (p: Progress7) => Progress7) => void;
  next: () => void;
  exit: () => void;
  oops: () => void; // 失誤一次（車廂掛錯、大壩漏水、用水超過、水管漏水、水門開錯）
}

// 拿到圖鑑卡：收進存檔，新的卡一張一張跳出來，看完再做下一件事（已經有的卡不再跳）
export function NewCards7({ ids, p, set, onDone }: { ids: readonly string[]; p: Progress7; set: Step7Props['set']; onDone: () => void }) {
  const [left, setLeft] = useState(() => ids.filter((c) => !p.cards.includes(c)));
  useEffect(() => { set((o) => addCard7(o, ...ids)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!left.length) onDone(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = CARDS7[left[0]];
  if (!c) return null;
  return <CardPop title={c.title} text={c.text} onClose={() => setLeft(left.slice(1))} />;
}

// 第七章「縱貫與大圳」：步驟 0～6，進度存在這台平板。網址加 ?ch7=3 直接跳到某一步（測試用）。
export function Ch7({ onExit, album }: { onExit: () => void; album: readonly string[] }) {
  const [book, setBook] = useState(false);
  const [p, setP] = useState<Progress7>(() => {
    const saved = load7();
    const q = new URLSearchParams(location.search).get('ch7');
    const jump = Number(q);
    return q !== null && q !== '' && jump >= 0 && jump <= LAST7 ? goTo7(saved, jump as Step7) : saved;
  });
  useEffect(() => { save7(p); pushCloud('ch7', p); }, [p]);
  useEffect(() => { if (p.done) void awardStamp('ch7'); }, [p.done]);
  useEffect(() => () => { music(null); ambience(null); }, []);
  // 開場放這一章的主題曲，進關卡就只留環境音
  useEffect(() => { ambience(AMB[p.step]); music(p.step === 0 ? 'MU-37' : null); }, [p.step]);

  const set = (fn: (p: Progress7) => Progress7) => setP((old) => fn(old));
  const next = () => setP((old) => goTo7(old, Math.min(LAST7, old.step + 1) as Step7));
  const oops = () => setP((old) => ({ ...old, mistakes: old.mistakes + 1 }));
  const have = new Set([...album, ...p.cards]);
  const props: Step7Props = { p, set, next, exit: onExit, oops };

  return (
    <div className="chapter ch7">
      <nav className="steps">
        <button className="back-map" onClick={() => { sfx('SE-02'); onExit(); }}><img src={`${import.meta.env.BASE_URL}img/island/h-map.webp`} alt="" />大地圖</button>
        {STEPS7.map((name, i) => (
          <button
            key={name}
            className={`step ${i === p.step ? 'on' : ''} ${i <= p.reached ? 'open' : ''}`}
            disabled={i > p.reached}
            onClick={() => { sfx('SE-01'); setP((old) => goTo7(old, i as Step7)); }}
          >
            <i>{i}</i>{name}
          </button>
        ))}
        <SoundToggle className="back-map" />
        <ReportButton screen={`ch7-${p.step}`} />
        <button className="back-map album-btn" onClick={() => { sfx('SE-03'); setBook(true); }}>📖 圖鑑 {CARD_ORDER7.filter((id) => have.has(id)).length}/{CARD_ORDER7.length}</button>
      </nav>
      <div className="stage" key={p.step}>
        {p.step === 0 && <Opening7 {...props} />}
        {p.step === 1 && <Rail {...props} />}
        {p.step === 2 && <Dam {...props} />}
        {p.step === 3 && <Rota {...props} />}
        {p.step === 4 && <SunMoon {...props} />}
        {p.step === 5 && <OpenDay {...props} />}
        {p.step === 6 && <Finale7 {...props} />}
      </div>
      {book && <Album have={[...have]} books={[BOOK7]} onClose={() => setBook(false)} />}
    </div>
  );
}
