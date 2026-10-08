import { useEffect, useState } from 'react';
import { addCard3, goTo3, LAST3, load3, save3, type Progress3, type Step3 } from '../core/save3';
import { CARD_ORDER3, CARDS3, STEPS3 } from '../data/ch3';
import { Album, BOOK3 } from './Album';
import { awardStamp, pushCloud } from '../net/cloud';
import { ambience, music, sfx } from '../audio';
import { SoundToggle } from './Sound';
import { ReportButton } from './Report';
import { CardPop } from './Talk';
import { Opening3 } from './ch3/Opening3';
import { Route } from './ch3/Route';
import { Trade } from './ch3/Trade';
import { Deer } from './ch3/Deer';
import { Deed } from './ch3/Deed';
import { Fort } from './ch3/Fort';
import { Finale3 } from './ch3/Finale3';

// 環境音：海浪（大員港、航線、碼頭）、田野（新港社）、雨（基隆）、結算
const AMB = ['SE-100', 'SE-100', 'SE-100', 'SE-61', 'SE-62', 'SE-100', null] as const;

export interface Step3Props {
  p: Progress3;
  set: (fn: (p: Progress3) => Progress3) => void;
  next: () => void;
  exit: () => void;
  oops: () => void; // 失誤一次（船擱淺、錢不夠、鹿變少、字讀錯、界線點錯、船排不出去）
}

// 拿到圖鑑卡：收進存檔，新的卡一張一張跳出來，看完再做下一件事（已經有的卡不再跳）
export function NewCards3({ ids, p, set, onDone }: { ids: readonly string[]; p: Progress3; set: Step3Props['set']; onDone: () => void }) {
  const [left, setLeft] = useState(() => ids.filter((c) => !p.cards.includes(c)));
  useEffect(() => { set((o) => addCard3(o, ...ids)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!left.length) onDone(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = CARDS3[left[0]];
  if (!c) return null;
  return <CardPop title={c.title} text={c.text} onClose={() => setLeft(left.slice(1))} />;
}

// 第三章「大航海時代」：步驟 0～6，進度存在這台平板。網址加 ?ch3=3 直接跳到某一步（測試用）。
export function Ch3({ onExit, album }: { onExit: () => void; album: readonly string[] }) {
  const [book, setBook] = useState(false);
  const [p, setP] = useState<Progress3>(() => {
    const saved = load3();
    const q = new URLSearchParams(location.search).get('ch3');
    const jump = Number(q);
    return q !== null && q !== '' && jump >= 0 && jump <= LAST3 ? goTo3(saved, jump as Step3) : saved;
  });
  useEffect(() => { save3(p); pushCloud('ch3', p); }, [p]);
  useEffect(() => { if (p.done) void awardStamp('ch3'); }, [p.done]);
  useEffect(() => () => { music(null); ambience(null); }, []);
  // 開場放這一章的主題曲，進關卡就只留環境音
  useEffect(() => { ambience(AMB[p.step]); music(p.step === 0 ? 'MU-33' : null); }, [p.step]);

  const set = (fn: (p: Progress3) => Progress3) => setP((old) => fn(old));
  const next = () => setP((old) => goTo3(old, Math.min(LAST3, old.step + 1) as Step3));
  const oops = () => setP((old) => ({ ...old, mistakes: old.mistakes + 1 }));
  const have = new Set([...album, ...p.cards]);
  const props: Step3Props = { p, set, next, exit: onExit, oops };

  return (
    <div className="chapter ch3">
      <nav className="steps">
        <button className="back-map" onClick={() => { sfx('SE-02'); onExit(); }}><img src={`${import.meta.env.BASE_URL}img/island/h-map.webp`} alt="" />大地圖</button>
        {STEPS3.map((name, i) => (
          <button
            key={name}
            className={`step ${i === p.step ? 'on' : ''} ${i <= p.reached ? 'open' : ''}`}
            disabled={i > p.reached}
            onClick={() => { sfx('SE-01'); setP((old) => goTo3(old, i as Step3)); }}
          >
            <i>{i}</i>{name}
          </button>
        ))}
        <SoundToggle className="back-map" />
        <ReportButton screen={`ch3-${p.step}`} />
        <button className="back-map album-btn" onClick={() => { sfx('SE-03'); setBook(true); }}>📖 圖鑑 {CARD_ORDER3.filter((id) => have.has(id)).length}/{CARD_ORDER3.length}</button>
      </nav>
      <div className="stage" key={p.step}>
        {p.step === 0 && <Opening3 {...props} />}
        {p.step === 1 && <Route {...props} />}
        {p.step === 2 && <Trade {...props} />}
        {p.step === 3 && <Deer {...props} />}
        {p.step === 4 && <Deed {...props} />}
        {p.step === 5 && <Fort {...props} />}
        {p.step === 6 && <Finale3 {...props} />}
      </div>
      {book && <Album have={[...have]} books={[BOOK3]} onClose={() => setBook(false)} />}
    </div>
  );
}
