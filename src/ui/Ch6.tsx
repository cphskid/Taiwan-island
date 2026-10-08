import { useEffect, useState } from 'react';
import { addCard6, goTo6, LAST6, load6, save6, type Progress6, type Step6 } from '../core/save6';
import { CARD_ORDER6, CARDS6, STEPS6 } from '../data/ch6';
import { Album, BOOK6 } from './Album';
import { awardStamp, pushCloud } from '../net/cloud';
import { ambience, music, sfx, type AmbCode } from '../audio';
import { SoundToggle } from './Sound';
import { ReportButton } from './Report';
import { CardPop } from './Talk';
import { Opening6 } from './ch6/Opening6';
import { Port6 } from './ch6/Port6';
import { Tea6 } from './ch6/Tea6';
import { Rail6 } from './ch6/Rail6';
import { Clinic6 } from './ch6/Clinic6';
import { Train6 } from './ch6/Train6';
import { Finale6 } from './ch6/Finale6';

// 環境音：雨天碼頭、河邊、雨天茶行、田野、河邊、田野、（結算自己放）
const AMB: (AmbCode | null)[] = ['SE-112', 'SE-112', 'SE-76', 'SE-75', 'SE-62', 'SE-117', null];

export interface Step6Props {
  p: Progress6;
  set: (fn: (p: Progress6) => Progress6) => void;
  next: () => void;
  exit: () => void;
  oops: () => void; // 失誤一次（擱淺、茶發霉、鐵軌用完、看錯病人、撞車）
}

// 拿到圖鑑卡：收進存檔，新的卡一張一張跳出來，看完再做下一件事（已經有的卡不再跳）
export function NewCards6({ ids, p, set, onDone }: { ids: readonly string[]; p: Progress6; set: Step6Props['set']; onDone: () => void }) {
  const [left, setLeft] = useState(() => ids.filter((c) => !p.cards.includes(c)));
  useEffect(() => { set((o) => addCard6(o, ...ids)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!left.length) onDone(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = CARDS6[left[0]];
  if (!c) return null;
  return <CardPop title={c.title} text={c.text} onClose={() => setLeft(left.slice(1))} />;
}

// 第六章「開港與鐵路」：步驟 0～6，進度存在這台平板。網址加 ?ch6=3 直接跳到某一步（測試用）。
export function Ch6({ onExit, album }: { onExit: () => void; album: readonly string[] }) {
  const [book, setBook] = useState(false);
  const [p, setP] = useState<Progress6>(() => {
    const saved = load6();
    const q = new URLSearchParams(location.search).get('ch6');
    const jump = Number(q);
    return q !== null && q !== '' && jump >= 0 && jump <= LAST6 ? goTo6(saved, jump as Step6) : saved;
  });
  useEffect(() => { save6(p); pushCloud('ch6', p); }, [p]);
  useEffect(() => { if (p.done) void awardStamp('ch6'); }, [p.done]);
  useEffect(() => () => { music(null); ambience(null); }, []);
  // 開場放這一章的主題曲，進關卡就只留環境音
  useEffect(() => { ambience(AMB[p.step]); music(p.step === 0 ? 'MU-36' : null); }, [p.step]);

  const set = (fn: (p: Progress6) => Progress6) => setP((old) => fn(old));
  const next = () => setP((old) => goTo6(old, Math.min(LAST6, old.step + 1) as Step6));
  const oops = () => setP((old) => ({ ...old, mistakes: old.mistakes + 1 }));
  const have = new Set([...album, ...p.cards]);
  const props: Step6Props = { p, set, next, exit: onExit, oops };

  return (
    <div className="chapter ch6">
      <nav className="steps">
        <button className="back-map" onClick={() => { sfx('SE-02'); onExit(); }}><img src={`${import.meta.env.BASE_URL}img/island/h-map.webp`} alt="" />大地圖</button>
        {STEPS6.map((name, i) => (
          <button
            key={name}
            className={`step ${i === p.step ? 'on' : ''} ${i <= p.reached ? 'open' : ''}`}
            disabled={i > p.reached}
            onClick={() => { sfx('SE-01'); setP((old) => goTo6(old, i as Step6)); }}
          >
            <i>{i}</i>{name}
          </button>
        ))}
        <SoundToggle className="back-map" />
        <ReportButton screen={`ch6-${p.step}`} />
        <button className="back-map album-btn" onClick={() => { sfx('SE-03'); setBook(true); }}>📖 圖鑑 {CARD_ORDER6.filter((id) => have.has(id)).length}/{CARD_ORDER6.length}</button>
      </nav>
      <div className="stage" key={p.step}>
        {p.step === 0 && <Opening6 {...props} />}
        {p.step === 1 && <Port6 {...props} />}
        {p.step === 2 && <Tea6 {...props} />}
        {p.step === 3 && <Rail6 {...props} />}
        {p.step === 4 && <Clinic6 {...props} />}
        {p.step === 5 && <Train6 {...props} />}
        {p.step === 6 && <Finale6 {...props} />}
      </div>
      {book && <Album have={[...have]} books={[BOOK6]} onClose={() => setBook(false)} />}
    </div>
  );
}
